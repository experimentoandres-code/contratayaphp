/* ============================================================
   CONTRATÁ YA — Servidor
   Sirve la PWA y expone la API de demostración.
   ============================================================ */
const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { despachar, arrancarDespachador } = require('./enviar-avisos');
const app = express();
const PUERTO = process.env.PORT || 3000;
app.use(express.json({ limit: '1mb' }));
app.disable('x-powered-by');
// Cabeceras de seguridad básicas
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
// El vault de Documentos no se sirve como estático: sólo la API admin.
app.use((req, res, next) => {
  const p = (req.path || '').toLowerCase();
  if (p === '/vault' || p.startsWith('/vault/')) return res.status(404).end();
  next();
});
// El service worker nunca se cachea: si no, los despliegues no llegan.
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});
app.get('/manifest.webmanifest', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.webmanifest'));
});
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    // El código (.js/.css) nunca se cachea: así cada despliegue se ve al instante.
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      // Imágenes, íconos y demás: se cachean un rato (casi nunca cambian).
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));
/* ── API de demostración ───────────────────────────────────
   Hoy lee del archivo de datos. Cuando entre la base real,
   solo cambia lo que hay adentro de estos manejadores.
   ────────────────────────────────────────────────────────── */
const datos = require('./public/js/data.js');
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok', version: '1.0.0', hora: new Date().toISOString() });
});
app.get('/api/localidades', (req, res) => res.json(datos.LOCALIDADES));
app.get('/api/rubros', (req, res) => res.json(datos.RUBROS));
app.get('/api/planes', (req, res) => res.json(datos.PLANES));
app.get('/api/profesionales', (req, res) => {
  const { rubro, localidad } = req.query;
  let lista = datos.PROFESIONALES;
  if (rubro) lista = lista.filter(p => p.rubro === rubro);
  if (localidad) {
    const peso = { pro: 0, verificado: 1, gratis: 2 };
    lista = [...lista].sort((a, b) => {
      const za = a.localidad === localidad ? 0 : 1;
      const zb = b.localidad === localidad ? 0 : 1;
      if (za !== zb) return za - zb;
      if (peso[a.plan] !== peso[b.plan]) return peso[a.plan] - peso[b.plan];
      return b.puntaje - a.puntaje;
    });
  }
  res.json(lista);
});
app.get('/api/sponsors', (req, res) => {
  const { localidad } = req.query;
  const lista = localidad
    ? datos.SPONSORS.filter(s => s.localidades.includes(localidad))
    : datos.SPONSORS;
  res.json(lista);
});
// Verificación simulada. En producción cada capa llama a su proveedor.
app.post('/api/verificar', (req, res) => {
  const { capa } = req.body || {};
  const existe = datos.CAPAS_VERIFICACION.some(c => c.id === capa);
  if (!existe) return res.status(400).json({ error: 'Capa de verificación desconocida' });
  setTimeout(() => res.json({ capa, verificado: true, cuando: new Date().toISOString() }), 800);
});

/* ── Avisos ────────────────────────────────────────────────
   Dispara una vuelta del despachador: levanta los avisos
   pendientes de la base y los manda por correo. La llama el
   webhook de Supabase, y también sirve para probar a mano.
   Va ANTES del app.use de abajo: ese se queda con todo lo que
   le llega, así que cualquier ruta puesta después nunca corre.
   ────────────────────────────────────────────────────────── */
app.post('/api/avisos/despachar', async (req, res) => {
  if (req.get('x-aviso-clave') !== process.env.AVISO_CLAVE) {
    return res.status(401).json({ error: 'no autorizado' });
  }
  res.json(await despachar());
});

/* ── Vault de documentación (docs/) ────────────────────────
   Visor tipo Obsidian en /docs. Las notas son .md reales.
   Las rutas van ANTES del catch-all de la landing.
   ────────────────────────────────────────────────────────── */
const DOCS_ROOT = path.join(__dirname, 'docs');

function docsAbs(rel, { folder = false } = {}) {
  if (typeof rel !== 'string' || !rel.trim()) return null;
  const limpio = rel.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!limpio) return null;
  const partes = limpio.split('/');
  if (partes.some(p => !p || p === '.' || p === '..')) return null;
  if (/^[a-zA-Z]:/.test(limpio) || limpio.startsWith('/')) return null;
  if (!folder && !limpio.toLowerCase().endsWith('.md')) return null;
  const abs = path.resolve(DOCS_ROOT, ...partes);
  const root = path.resolve(DOCS_ROOT);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

function arbolDocs(dir, rel = '') {
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }
  const items = [];
  for (const ent of entradas) {
    if (ent.name.startsWith('.') || ent.name === 'index.html') continue;
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      items.push({ type: 'dir', name: ent.name, path: r, children: arbolDocs(path.join(dir, ent.name), r) });
    } else if (ent.name.toLowerCase().endsWith('.md')) {
      items.push({
        type: 'file',
        name: ent.name.replace(/\.md$/i, ''),
        file: ent.name,
        path: r
      });
    }
  }
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, 'es');
  });
  return items;
}

app.get('/api/docs/tree', (req, res) => {
  try { res.json({ root: 'docs', tree: arbolDocs(DOCS_ROOT) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/docs/file', async (req, res) => {
  const abs = docsAbs(req.query.path);
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  try {
    const contenido = await fsp.readFile(abs, 'utf8');
    res.json({ path: String(req.query.path).replace(/\\/g, '/'), contenido });
  } catch {
    res.status(404).json({ error: 'no encontrado' });
  }
});

app.put('/api/docs/file', async (req, res) => {
  const abs = docsAbs(req.body && req.body.path);
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  try {
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, String((req.body && req.body.contenido) ?? ''), 'utf8');
    res.json({ ok: true, path: req.body.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/docs/file', async (req, res) => {
  const abs = docsAbs(req.body && req.body.path);
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  try {
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    const existe = fs.existsSync(abs);
    if (existe) return res.status(409).json({ error: 'ya existe' });
    const titulo = path.basename(abs, '.md');
    const semilla = (req.body && req.body.contenido) != null
      ? String(req.body.contenido)
      : `# ${titulo}\n\n`;
    await fsp.writeFile(abs, semilla, 'utf8');
    res.json({ ok: true, path: req.body.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/docs/folder', async (req, res) => {
  const abs = docsAbs(req.body && req.body.path, { folder: true });
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  try {
    await fsp.mkdir(abs, { recursive: true });
    res.json({ ok: true, path: req.body.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/docs/file', async (req, res) => {
  const abs = docsAbs(req.query.path);
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  try {
    await fsp.unlink(abs);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'no encontrado' });
  }
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(DOCS_ROOT, 'index.html'));
});
app.use('/docs', express.static(DOCS_ROOT, { index: 'index.html' }));

/* ── Vault admin (public/vault) ────────────────────────────
   Sólo el administrador. JWT de Supabase + RPC soy_admin.
   Máximo 5 carpetas de profundidad. Sólo .md.
   ────────────────────────────────────────────────────────── */
const VAULT_ROOT = path.join(__dirname, 'public', 'vault');
const VAULT_MAX_PROF = 5;
const VAULT_MAX_BYTES = 1000000;
const VAULT_NOMBRE = /^[A-Za-z0-9À-ÿ _.-]{1,80}$/;
const SB_URL = process.env.SUPABASE_URL || 'https://cehyemmwhcthijzuatmz.supabase.co';
const SB_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_Qn57IXRAcSGkzMQvGDyIbw_IvsDm5Ac';

try { fs.mkdirSync(VAULT_ROOT, { recursive: true }); } catch { /* ok */ }

function esAdminValor(es) {
  if (es === true || es === 'true' || es === 't' || es === 1) return true;
  if (Array.isArray(es)) return esAdminValor(es[0]);
  if (es && typeof es === 'object') return esAdminValor(es.soy_admin ?? es.es_admin);
  return false;
}

function exigirAdmin(req, res, next) {
  const h = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  const token = m && m[1];
  if (!token) return res.status(401).json({ error: 'no autorizado' });

  const headers = {
    apikey: SB_ANON,
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  Promise.resolve()
    .then(() => fetch(SB_URL + '/rest/v1/rpc/soy_admin', {
      method: 'POST',
      headers,
      body: '{}'
    }))
    .then(async (r) => {
      const raw = await r.text();
      let es;
      try { es = raw ? JSON.parse(raw) : null; } catch { es = null; }
      if (!r.ok) {
        console.warn('[docs] soy_admin', r.status, raw.slice(0, 180));
        return res.status(401).json({ error: 'no autorizado' });
      }
      if (!esAdminValor(es)) return res.status(403).json({ error: 'solo admin' });
      next();
    })
    .catch((e) => {
      console.warn('[docs] no se pudo verificar admin', e.message);
      if (!res.headersSent) res.status(503).json({ error: 'no se pudo verificar el permiso' });
    });
}

function vaultAbs(rel, { folder = false } = {}) {
  if (typeof rel !== 'string') return null;
  const limpio = rel.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  const root = path.resolve(VAULT_ROOT);
  if (!limpio) return folder ? root : null;
  if (/^[a-zA-Z]:/.test(limpio) || limpio.startsWith('/')) return null;
  const partes = limpio.split('/');
  if (partes.some(p => !p || !p.trim() || p === '.' || p === '..' || p.startsWith('.'))) return null;
  const prof = folder ? partes.length : partes.length - 1;
  if (prof > VAULT_MAX_PROF) return null;
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    const ultimo = i === partes.length - 1;
    if (folder || !ultimo) {
      if (!VAULT_NOMBRE.test(p)) return null;
    } else {
      if (!p.toLowerCase().endsWith('.md')) return null;
      const base = p.slice(0, -3);
      if (!VAULT_NOMBRE.test(base)) return null;
    }
  }
  const abs = path.resolve(root, ...partes);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

function arbolVault(dir, rel = '') {
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }
  const items = [];
  for (const ent of entradas) {
    if (ent.name.startsWith('.') || ent.name.toLowerCase() === '.htaccess') continue;
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      items.push({ type: 'dir', name: ent.name, path: r, children: arbolVault(path.join(dir, ent.name), r) });
    } else if (ent.name.toLowerCase().endsWith('.md')) {
      items.push({
        type: 'file',
        name: ent.name.replace(/\.md$/i, ''),
        file: ent.name,
        path: r
      });
    }
  }
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, 'es');
  });
  return items;
}

app.get('/api/admin/docs/tree', exigirAdmin, (req, res) => {
  try { res.json({ root: 'vault', max: VAULT_MAX_PROF, tree: arbolVault(VAULT_ROOT) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/docs/file', exigirAdmin, async (req, res) => {
  const abs = vaultAbs(req.query.path);
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  try {
    const contenido = await fsp.readFile(abs, 'utf8');
    res.json({ path: String(req.query.path).replace(/\\/g, '/'), contenido });
  } catch {
    res.status(404).json({ error: 'no encontrado' });
  }
});

app.put('/api/admin/docs/file', exigirAdmin, async (req, res) => {
  const abs = vaultAbs(req.body && req.body.path);
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  const contenido = String((req.body && req.body.contenido) ?? '');
  if (Buffer.byteLength(contenido, 'utf8') > VAULT_MAX_BYTES) {
    return res.status(413).json({ error: 'el archivo supera 1 MB' });
  }
  try {
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, contenido, 'utf8');
    res.json({ ok: true, path: req.body.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/docs/file', exigirAdmin, async (req, res) => {
  const abs = vaultAbs(req.body && req.body.path);
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  try {
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    if (fs.existsSync(abs)) return res.status(409).json({ error: 'ya existe' });
    const titulo = path.basename(abs, '.md');
    const semilla = (req.body && req.body.contenido) != null
      ? String(req.body.contenido)
      : `# ${titulo}\n\n`;
    if (Buffer.byteLength(semilla, 'utf8') > VAULT_MAX_BYTES) {
      return res.status(413).json({ error: 'el archivo supera 1 MB' });
    }
    await fsp.writeFile(abs, semilla, 'utf8');
    res.json({ ok: true, path: req.body.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/docs/folder', exigirAdmin, async (req, res) => {
  const abs = vaultAbs(req.body && req.body.path, { folder: true });
  if (!abs) return res.status(400).json({ error: 'ruta inválida o más de 5 carpetas' });
  try {
    await fsp.mkdir(abs, { recursive: true });
    res.json({ ok: true, path: req.body.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/docs/file', exigirAdmin, async (req, res) => {
  const abs = vaultAbs(req.query.path);
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  try {
    await fsp.unlink(abs);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'no encontrado' });
  }
});

app.delete('/api/admin/docs/folder', exigirAdmin, async (req, res) => {
  const abs = vaultAbs(req.query.path, { folder: true });
  if (!abs) return res.status(400).json({ error: 'ruta inválida' });
  const root = path.resolve(VAULT_ROOT);
  if (abs === root) return res.status(400).json({ error: 'no se puede borrar la raíz' });
  try {
    const resto = await fsp.readdir(abs);
    const utiles = resto.filter(n => n !== '.' && n !== '..' && n.toLowerCase() !== '.htaccess');
    if (utiles.length) return res.status(409).json({ error: 'la carpeta no está vacía' });
    await fsp.rmdir(abs);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'no encontrado' });
  }
});

// Cualquier otra ruta cae en la landing (navegación de una sola página).
app.use((req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.listen(PUERTO, () => {
  console.log(`Contratá Ya escuchando en el puerto ${PUERTO}`);
  arrancarDespachador();
});
