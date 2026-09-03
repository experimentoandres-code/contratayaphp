/* ============================================================
   CONTRATÁ YA — MCP para Grok web
   Edita la web (archivos + FTP a contrataya.pro) y la base.
   Arranque:  node mcp/server.js
   ============================================================ */
const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { spawnSync } = require('child_process');

const catalogo = require(path.join(__dirname, '..', 'public', 'js', 'data.js'));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cehyemmwhcthijzuatmz.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MCP_TOKEN    = process.env.MCP_TOKEN || '';
const PUERTO       = Number(process.env.MCP_PORT || 3847);

const PROTOCOLO = '2025-03-26';

function cabeceras() {
  if (!SERVICE_KEY) throw new Error('Falta SUPABASE_SERVICE_ROLE en las variables de entorno.');
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
}

async function rest(ruta, { method = 'GET', qs = '', body } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${ruta}${qs ? '?' + qs : ''}`;
  const r = await fetch(url, {
    method,
    headers: cabeceras(),
    body: body != null ? JSON.stringify(body) : undefined
  });
  const txt = await r.text();
  let data;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!r.ok) {
    const msg = data && data.message ? data.message : (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error(msg || `Supabase ${r.status}`);
  }
  return data;
}

async function rpc(nombre, args = {}) {
  return rest(`rpc/${nombre}`, { method: 'POST', body: args });
}

function qs(filtros) {
  const p = [];
  for (const [k, v] of Object.entries(filtros)) {
    if (v === undefined || v === null || v === '') continue;
    p.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return p.join('&');
}

function texto(obj) {
  return { content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] };
}
function errorTool(e) {
  return { content: [{ type: 'text', text: 'Error: ' + (e.message || String(e)) }], isError: true };
}

const LIMITE = (n) => Math.min(Math.max(Number(n) || 40, 1), 200);

const COL_PERFIL = 'id,nombre,rol,localidad,rubro,plan,verificacion,puntaje_pro,puntaje_cliente,trabajos,contrataciones,foto_url,bio,anios,precio_desde,suspendido,creado_en,zonas';

const PUBLIC_ROOT = path.resolve(__dirname, '..', 'public');
const FTP_HOST = process.env.FTP_HOST || '82.25.83.165';
const FTP_USER = process.env.FTP_USER || 'u606293067.contrataya.pro';
const FTP_PASS = process.env.FTP_PASS || 'Calle212267+';

function rutaPublic(rel) {
  const clean = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean || clean.includes('..') || path.isAbsolute(rel)) throw new Error('ruta inválida');
  const abs = path.resolve(PUBLIC_ROOT, ...clean.split('/'));
  const root = path.resolve(PUBLIC_ROOT);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error('fuera de public/');
  return { rel: clean, abs };
}

function listarDir(dir, prefijo = '') {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const rel = prefijo ? `${prefijo}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...listarDir(path.join(dir, ent.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

function ftpSubir(rel) {
  const { abs, rel: r } = rutaPublic(rel);
  if (!fs.existsSync(abs)) throw new Error('no existe: ' + r);
  const remote = `ftp://${FTP_HOST}/${r}`;
  const res = spawnSync('curl.exe', ['-sS', '-m', '90', '--ftp-pasv', '--user', `${FTP_USER}:${FTP_PASS}`, '-T', abs, remote], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error((res.stderr || res.stdout || 'falló FTP').slice(0, 400));
  return r;
}

function bumpCache() {
  const sw = path.join(PUBLIC_ROOT, 'sw.js');
  let txt = fs.readFileSync(sw, 'utf8');
  const m = txt.match(/contrataya-v(\d+)/);
  const n = m ? Number(m[1]) + 1 : 1;
  txt = txt.replace(/contrataya-v\d+/g, `contrataya-v${n}`);
  fs.writeFileSync(sw, txt);
  const appHtml = path.join(PUBLIC_ROOT, 'app.html');
  if (fs.existsSync(appHtml)) {
    let h = fs.readFileSync(appHtml, 'utf8');
    h = h.replace(/(\/js\/(?:app|data)\.js)\?v=\d+/g, `$1?v=${n}`);
    fs.writeFileSync(appHtml, h);
  }
  const idx = path.join(PUBLIC_ROOT, 'index.html');
  if (fs.existsSync(idx)) {
    let h = fs.readFileSync(idx, 'utf8');
    h = h.replace(/(\/css\/landing\.css)\?v=\d+/g, `$1?v=${n}`);
    fs.writeFileSync(idx, h);
  }
  return n;
}

const TOOLS_WEB = [
  { name: 'listar_web', description: 'Lista los archivos de la web (public/): landing, app, css, js.', inputSchema: { type: 'object', properties: { carpeta: { type: 'string', description: 'Subcarpeta opcional, ej. css o js' } } } },
  { name: 'leer_web', description: 'Lee un archivo de la web. Ruta relativa a public/, ej. index.html, css/landing.css, js/app.js.', inputSchema: { type: 'object', properties: { ruta: { type: 'string' }, desde_linea: { type: 'number' }, lineas: { type: 'number' } }, required: ['ruta'] } },
  { name: 'escribir_web', description: 'Sobrescribe un archivo de la web. No publica solo: después usá publicar_web.', inputSchema: { type: 'object', properties: { ruta: { type: 'string' }, contenido: { type: 'string' } }, required: ['ruta', 'contenido'] } },
  { name: 'reemplazar_web', description: 'Reemplaza un texto exacto dentro de un archivo de public/. Si hay más de un match, falla.', inputSchema: { type: 'object', properties: { ruta: { type: 'string' }, buscar: { type: 'string' }, poner: { type: 'string' } }, required: ['ruta', 'buscar', 'poner'] } },
  { name: 'publicar_web', description: 'Sube archivos a www.contrataya.pro por FTP. Si no pasás rutas, sube index.html, sw.js, css/landing.css, js/landing.js, js/app.js, js/data.js, app.html.', inputSchema: { type: 'object', properties: { rutas: { type: 'array', items: { type: 'string' } } } } },
  { name: 'bump_cache', description: 'Sube el número de versión del service worker y los ?v= de scripts para que el cambio se vea. Después hay que publicar_web.', inputSchema: { type: 'object', properties: {} } },
  { name: 'set_whatsapp', description: 'Guarda el número de WhatsApp de Contratá Ya (formato 549XXXXXXXXXX) en data.js y opcionalmente publica.', inputSchema: { type: 'object', properties: { numero: { type: 'string' }, publicar: { type: 'boolean' } }, required: ['numero'] } }
];

const TOOLS = [
  ...TOOLS_WEB,
  { name: 'resumen_plataforma', description: 'Totales de la plataforma: usuarios, pedidos, matches, trabajos, calificaciones.', inputSchema: { type: 'object', properties: {} } },
  { name: 'catalogo', description: 'Localidades del Partido de la Costa y rubros de oficio.', inputSchema: { type: 'object', properties: {} } },
  { name: 'listar_usuarios', description: 'Lista perfiles. Filtros opcionales: rol (pro|cliente), localidad, rubro, plan, busqueda (nombre), con_foto (bool).', inputSchema: { type: 'object', properties: { rol: { type: 'string' }, localidad: { type: 'string' }, rubro: { type: 'string' }, plan: { type: 'string' }, busqueda: { type: 'string' }, con_foto: { type: 'boolean' }, limite: { type: 'number' } } } },
  { name: 'ver_usuario', description: 'Ficha completa de un usuario por id o por nombre.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' } } } },
  { name: 'actualizar_usuario', description: 'Edita campos de un perfil: nombre, bio, localidad, rubro, plan no (usar activar_plan).', inputSchema: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, bio: { type: 'string' }, localidad: { type: 'string' }, rubro: { type: 'string' }, precio_desde: { type: 'number' }, anios: { type: 'number' } }, required: ['id'] } },
  { name: 'marcar_verificacion', description: 'Pone o saca una capa de verificación (identidad, telefono, email, cuit, zona).', inputSchema: { type: 'object', properties: { usuario_id: { type: 'string' }, capa: { type: 'string' }, poner: { type: 'boolean' } }, required: ['usuario_id'] } },
  { name: 'activar_plan', description: 'Cambia el plan de un profesional: gratis, verificado o pro.', inputSchema: { type: 'object', properties: { usuario_id: { type: 'string' }, plan: { type: 'string' } }, required: ['usuario_id', 'plan'] } },
  { name: 'intereses_plan', description: 'Cola de profesionales que pidieron pasar de plan.', inputSchema: { type: 'object', properties: {} } },
  { name: 'descartar_interes_plan', description: 'Descarta un pedido de plan por id de la fila de interes_plan.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'listar_pedidos', description: 'Pedidos de clientes. Filtros: localidad, rubro, estado si existe.', inputSchema: { type: 'object', properties: { localidad: { type: 'string' }, rubro: { type: 'string' }, limite: { type: 'number' } } } },
  { name: 'ver_pedido', description: 'Un pedido por id.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'listar_matches', description: 'Matches cliente-profesional. Filtro opcional usuario_id.', inputSchema: { type: 'object', properties: { usuario_id: { type: 'string' }, limite: { type: 'number' } } } },
  { name: 'listar_trabajos', description: 'Trabajos / ciclo de obra. Filtro opcional estado o match_id.', inputSchema: { type: 'object', properties: { estado: { type: 'string' }, match_id: { type: 'string' }, limite: { type: 'number' } } } },
  { name: 'cancelar_trabajo', description: 'Cancela un trabajo por id (RPC cancelar_trabajo).', inputSchema: { type: 'object', properties: { trabajo_id: { type: 'string' } }, required: ['trabajo_id'] } },
  { name: 'listar_mensajes', description: 'Mensajes de un match o trabajo.', inputSchema: { type: 'object', properties: { match_id: { type: 'string' }, trabajo_id: { type: 'string' }, limite: { type: 'number' } } } },
  { name: 'listar_calificaciones', description: 'Últimas calificaciones.', inputSchema: { type: 'object', properties: { usuario_id: { type: 'string' }, limite: { type: 'number' } } } },
  { name: 'listar_avisos', description: 'Cola de avisos push/mail. Filtro pendiente=true para no enviados.', inputSchema: { type: 'object', properties: { destino_id: { type: 'string' }, pendiente: { type: 'boolean' }, limite: { type: 'number' } } } },
  { name: 'crear_aviso', description: 'Inserta un aviso en la cola (título, cuerpo, destino_id, tipo).', inputSchema: { type: 'object', properties: { destino_id: { type: 'string' }, titulo: { type: 'string' }, cuerpo: { type: 'string' }, tipo: { type: 'string' } }, required: ['destino_id', 'titulo', 'cuerpo'] } },
  { name: 'denuncias_abiertas', description: 'Denuncias pendientes de moderación.', inputSchema: { type: 'object', properties: {} } },
  { name: 'resolver_denuncia', description: 'Cierra una denuncia. estado: revisada | desestimada | accion_tomada. suspender: true suspende al denunciado.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, estado: { type: 'string' }, suspender: { type: 'boolean' }, nota: { type: 'string' } }, required: ['id', 'estado'] } },
  { name: 'usuarios_suspendidos', description: 'Cuentas suspendidas.', inputSchema: { type: 'object', properties: {} } },
  { name: 'levantar_suspension', description: 'Rehabilita un usuario suspendido.', inputSchema: { type: 'object', properties: { usuario_id: { type: 'string' } }, required: ['usuario_id'] } },
  { name: 'listar_contratos_publicidad', description: 'Casilleros de comercios (localidad × rubro).', inputSchema: { type: 'object', properties: { localidad: { type: 'string' }, rubro: { type: 'string' } } } },
  { name: 'anunciantes_sueltos', description: 'Anunciantes sin casillero asignado.', inputSchema: { type: 'object', properties: {} } },
  { name: 'crear_anunciante', description: 'Alta de comercio + contrato. Rubro de comercio: ferreteria, corralon, pintureria, aberturas.', inputSchema: { type: 'object', properties: { nombre: { type: 'string' }, rubro: { type: 'string' }, localidad: { type: 'string' }, hasta: { type: 'string' }, abono: { type: 'number' }, beneficio: { type: 'string' }, letra_chica: { type: 'string' }, contacto: { type: 'string' }, telefono: { type: 'string' }, direccion: { type: 'string' } }, required: ['nombre', 'rubro', 'localidad', 'hasta'] } },
  { name: 'asignar_casillero', description: 'Asigna un anunciante suelto a una localidad.', inputSchema: { type: 'object', properties: { anunciante_id: { type: 'string' }, localidad: { type: 'string' }, hasta: { type: 'string' }, abono: { type: 'number' } }, required: ['anunciante_id', 'localidad', 'hasta'] } },
  { name: 'editar_anunciante', description: 'Edita datos de un anunciante.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, direccion: { type: 'string' }, beneficio: { type: 'string' }, letra_chica: { type: 'string' }, contacto: { type: 'string' }, telefono: { type: 'string' } }, required: ['id'] } },
  { name: 'borrar_anunciante', description: 'Baja un anunciante.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } }
];

async function ejecutar(nombre, args = {}) {
  switch (nombre) {
    case 'listar_web': {
      const base = args.carpeta ? rutaPublic(args.carpeta).abs : PUBLIC_ROOT;
      if (!fs.existsSync(base)) throw new Error('no existe esa carpeta');
      const pref = args.carpeta ? String(args.carpeta).replace(/\\/g, '/') : '';
      return listarDir(base, pref);
    }
    case 'leer_web': {
      const { abs, rel } = rutaPublic(args.ruta);
      const raw = await fsp.readFile(abs, 'utf8');
      const lineas = raw.split(/\n/);
      const desde = Math.max(1, Number(args.desde_linea) || 1);
      const cant = Math.min(Number(args.lineas) || 400, 800);
      const slice = lineas.slice(desde - 1, desde - 1 + cant);
      return { ruta: rel, total_lineas: lineas.length, desde, contenido: slice.map((l, i) => `${desde + i}|${l}`).join('\n') };
    }
    case 'escribir_web': {
      const { abs, rel } = rutaPublic(args.ruta);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, String(args.contenido), 'utf8');
      return { ok: true, ruta: rel, bytes: Buffer.byteLength(String(args.contenido), 'utf8') };
    }
    case 'reemplazar_web': {
      const { abs, rel } = rutaPublic(args.ruta);
      const raw = await fsp.readFile(abs, 'utf8');
      const buscar = String(args.buscar);
      const n = raw.split(buscar).length - 1;
      if (n === 0) throw new Error('no se encontró ese texto en ' + rel);
      if (n > 1) throw new Error(`hay ${n} coincidencias; hacé el buscar más específico`);
      await fsp.writeFile(abs, raw.replace(buscar, String(args.poner)), 'utf8');
      return { ok: true, ruta: rel };
    }
    case 'publicar_web': {
      const def = ['index.html', 'sw.js', 'app.html', 'css/landing.css', 'css/app.css', 'js/landing.js', 'js/app.js', 'js/data.js'];
      const lista = (args.rutas && args.rutas.length) ? args.rutas : def;
      const ok = [];
      for (const r of lista) {
        try { ok.push(ftpSubir(r)); } catch (e) { ok.push(r + ' ERROR: ' + e.message); }
      }
      return { publicado: ok, vivo: 'https://www.contrataya.pro/' };
    }
    case 'bump_cache': {
      const n = bumpCache();
      return { version: 'contrataya-v' + n, hint: 'ahora publicá sw.js, app.html e index.html' };
    }
    case 'set_whatsapp': {
      const num = String(args.numero).replace(/\D/g, '');
      if (num.length < 10) throw new Error('número corto: usá 549XXXXXXXXXX');
      const { abs } = rutaPublic('js/data.js');
      let raw = await fsp.readFile(abs, 'utf8');
      if (!/const WHATSAPP_CONTRATA = /.test(raw)) throw new Error('no está WHATSAPP_CONTRATA en data.js');
      raw = raw.replace(/const WHATSAPP_CONTRATA = '[^']*'/, `const WHATSAPP_CONTRATA = '${num}'`);
      await fsp.writeFile(abs, raw, 'utf8');
      const n = bumpCache();
      const pub = args.publicar !== false;
      if (pub) {
        ftpSubir('js/data.js');
        ftpSubir('js/app.js');
        ftpSubir('sw.js');
        ftpSubir('app.html');
      }
      return { ok: true, numero: num, version: 'contrataya-v' + n, publicado: pub };
    }
    case 'resumen_plataforma': {
      const count = async (tabla, extra = '') => {
        const url = `${SUPABASE_URL}/rest/v1/${tabla}?select=id${extra ? '&' + extra : ''}`;
        const r = await fetch(url, { headers: { ...cabeceras(), Prefer: 'count=exact', Range: '0-0' } });
        const cr = r.headers.get('content-range') || '';
        const m = cr.match(/\/(\d+|\*)/);
        return m && m[1] !== '*' ? Number(m[1]) : 0;
      };
      return {
        clientes: await count('perfiles', 'rol=eq.cliente'),
        profesionales: await count('perfiles', 'rol=eq.pro'),
        con_foto: await count('perfiles', 'foto_url=not.is.null'),
        pedidos: await count('pedidos'),
        matches: await count('matches'),
        trabajos: await count('trabajos'),
        calificaciones: await count('calificaciones'),
        avisos: await count('avisos')
      };
    }
    case 'catalogo':
      return {
        localidades: catalogo.LOCALIDADES,
        rubros: catalogo.RUBROS,
        rubros_comercio: ['ferreteria', 'corralon', 'pintureria', 'aberturas']
      };
    case 'listar_usuarios': {
      const partes = [`select=${COL_PERFIL}`, 'order=creado_en.desc', `limit=${LIMITE(args.limite)}`];
      if (args.rol) partes.push(`rol=eq.${args.rol}`);
      if (args.localidad) partes.push(`localidad=eq.${args.localidad}`);
      if (args.rubro) partes.push(`rubro=eq.${args.rubro}`);
      if (args.plan) partes.push(`plan=eq.${args.plan}`);
      if (args.busqueda) partes.push(`nombre=ilike.*${args.busqueda}*`);
      if (args.con_foto === true) partes.push('foto_url=not.is.null');
      if (args.con_foto === false) partes.push('foto_url=is.null');
      return rest('perfiles', { qs: partes.join('&') });
    }
    case 'ver_usuario': {
      if (args.id) {
        const filas = await rest('perfiles', { qs: qs({ select: '*', id: `eq.${args.id}` }) });
        return filas[0] || { error: 'No encontrado' };
      }
      if (args.nombre) {
        return rest('perfiles', { qs: `select=${COL_PERFIL}&nombre=ilike.*${args.nombre}*&limit=10` });
      }
      throw new Error('Pasá id o nombre');
    }
    case 'actualizar_usuario': {
      const { id, ...resto } = args;
      const body = {};
      for (const k of ['nombre', 'bio', 'localidad', 'rubro', 'precio_desde', 'anios']) {
        if (resto[k] !== undefined) body[k] = resto[k];
      }
      if (!Object.keys(body).length) throw new Error('Nada para actualizar');
      return rest('perfiles', { method: 'PATCH', qs: `id=eq.${id}`, body });
    }
    case 'marcar_verificacion':
      return rpc('marcar_verificacion', {
        p_usuario: args.usuario_id,
        p_capa: args.capa || 'identidad',
        p_poner: args.poner !== false
      });
    case 'activar_plan':
      return rpc('activar_plan', { p_usuario: args.usuario_id, p_plan: args.plan });
    case 'intereses_plan':
      return rpc('intereses_pendientes');
    case 'descartar_interes_plan':
      return rest('interes_plan', {
        method: 'PATCH',
        qs: `id=eq.${args.id}`,
        body: { estado: 'descartado', cerrado_en: new Date().toISOString() }
      });
    case 'listar_pedidos': {
      const partes = ['select=*', 'order=creado_en.desc', `limit=${LIMITE(args.limite)}`];
      if (args.localidad) partes.push(`localidad=eq.${args.localidad}`);
      if (args.rubro) partes.push(`rubro=eq.${args.rubro}`);
      return rest('pedidos', { qs: partes.join('&') });
    }
    case 'ver_pedido': {
      const filas = await rest('pedidos', { qs: `id=eq.${args.id}&select=*` });
      return filas[0] || { error: 'No encontrado' };
    }
    case 'listar_matches': {
      const partes = ['select=*', 'order=creado_en.desc', `limit=${LIMITE(args.limite)}`];
      if (args.usuario_id) partes.push(`or=(cliente_id.eq.${args.usuario_id},profesional_id.eq.${args.usuario_id})`);
      return rest('matches', { qs: partes.join('&') });
    }
    case 'listar_trabajos': {
      const partes = ['select=*', 'order=creado_en.desc', `limit=${LIMITE(args.limite)}`];
      if (args.estado) partes.push(`estado=eq.${args.estado}`);
      if (args.match_id) partes.push(`match_id=eq.${args.match_id}`);
      return rest('trabajos', { qs: partes.join('&') });
    }
    case 'cancelar_trabajo':
      return rpc('cancelar_trabajo', { p_trabajo: args.trabajo_id });
    case 'listar_mensajes': {
      const partes = ['select=id,autor_id,texto,leido,creado_en', 'order=creado_en.asc', `limit=${LIMITE(args.limite || 80)}`];
      if (args.match_id) partes.push(`match_id=eq.${args.match_id}`);
      if (args.trabajo_id) partes.push(`trabajo_id=eq.${args.trabajo_id}`);
      if (!args.match_id && !args.trabajo_id) throw new Error('Pasá match_id o trabajo_id');
      return rest('mensajes', { qs: partes.join('&') });
    }
    case 'listar_calificaciones': {
      const partes = ['select=*', 'order=creado_en.desc', `limit=${LIMITE(args.limite)}`];
      if (args.usuario_id) partes.push(`or=(de_id.eq.${args.usuario_id},para_id.eq.${args.usuario_id})`);
      return rest('calificaciones', { qs: partes.join('&') });
    }
    case 'listar_avisos': {
      const partes = ['select=*', 'order=creado_en.desc', `limit=${LIMITE(args.limite)}`];
      if (args.destino_id) partes.push(`destino_id=eq.${args.destino_id}`);
      if (args.pendiente === true) partes.push('correo_en=is.null');
      return rest('avisos', { qs: partes.join('&') });
    }
    case 'crear_aviso':
      return rest('avisos', {
        method: 'POST',
        body: {
          destino_id: args.destino_id,
          titulo: args.titulo,
          cuerpo: args.cuerpo,
          tipo: args.tipo || 'manual'
        }
      });
    case 'denuncias_abiertas':
      return rpc('denuncias_abiertas');
    case 'resolver_denuncia':
      return rpc('resolver_denuncia', {
        p_id: args.id,
        p_estado: args.estado,
        p_suspender: !!args.suspender,
        p_nota: args.nota || null
      });
    case 'usuarios_suspendidos':
      return rpc('usuarios_suspendidos');
    case 'levantar_suspension':
      return rpc('levantar_suspension', { p_usuario: args.usuario_id });
    case 'listar_contratos_publicidad': {
      const partes = ['select=*', 'order=localidad.asc'];
      if (args.localidad) partes.push(`localidad=eq.${args.localidad}`);
      if (args.rubro) partes.push(`rubro=eq.${args.rubro}`);
      return rest('contratos_publicidad', { qs: partes.join('&') });
    }
    case 'anunciantes_sueltos':
      return rpc('anunciantes_sueltos');
    case 'crear_anunciante':
      return rpc('crear_anunciante', {
        p_nombre: args.nombre,
        p_rubro: args.rubro,
        p_localidad: args.localidad,
        p_hasta: args.hasta,
        p_abono: args.abono || 80000,
        p_beneficio: args.beneficio || '',
        p_letra_chica: args.letra_chica || '',
        p_contacto: args.contacto || '',
        p_telefono: args.telefono || '',
        p_direccion: args.direccion || ''
      });
    case 'asignar_casillero':
      return rpc('asignar_casillero', {
        p_anunciante: args.anunciante_id,
        p_localidad: args.localidad,
        p_hasta: args.hasta,
        p_abono: args.abono || 80000
      });
    case 'editar_anunciante':
      return rpc('editar_anunciante', {
        p_id: args.id,
        p_nombre: args.nombre || '',
        p_direccion: args.direccion || '',
        p_beneficio: args.beneficio || '',
        p_letra_chica: args.letra_chica || '',
        p_contacto: args.contacto || '',
        p_telefono: args.telefono || ''
      });
    case 'borrar_anunciante':
      return rpc('borrar_anunciante', { p_id: args.id });
    default:
      throw new Error('Tool desconocida: ' + nombre);
  }
}

async function manejarRpc(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (msg.jsonrpc !== '2.0') return { jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32600, message: 'JSON-RPC 2.0' } };

  if (typeof msg.method === 'string' && msg.method.startsWith('notifications/')) return null;

  const id = msg.id ?? null;
  try {
    if (msg.method === 'initialize') {
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: (msg.params && msg.params.protocolVersion) || PROTOCOLO,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'contrataya', version: '1.0.0' },
          instructions: 'Conector de Contratá Ya. Primero la WEB: listar_web, leer_web, reemplazar_web o escribir_web, bump_cache y publicar_web (FTP a contrataya.pro). También la BASE: usuarios, pedidos, matches, trabajos, avisos, planes, denuncias y anunciantes. set_whatsapp guarda el número 549... y publica.'
        }
      };
    }
    if (msg.method === 'ping') return { jsonrpc: '2.0', id, result: {} };
    if (msg.method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    }
    if (msg.method === 'tools/call') {
      const name = msg.params && msg.params.name;
      const args = (msg.params && msg.params.arguments) || {};
      try {
        const out = await ejecutar(name, args);
        return { jsonrpc: '2.0', id, result: texto(out) };
      } catch (e) {
        return { jsonrpc: '2.0', id, result: errorTool(e) };
      }
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Método no encontrado: ' + msg.method } };
  } catch (e) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: e.message } };
  }
}

function autorizado(req) {
  if (!MCP_TOKEN) return true;
  const h = req.get('authorization') || '';
  const q = req.query.token;
  if (q && q === MCP_TOKEN) return true;
  if (h.toLowerCase().startsWith('bearer ') && h.slice(7).trim() === MCP_TOKEN) return true;
  return false;
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/salud', (_req, res) => {
  res.json({ ok: true, tools: TOOLS.length, supabase: Boolean(SERVICE_KEY), token: Boolean(MCP_TOKEN) });
});

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>MCP Contratá Ya</title>
  <body style="font-family:sans-serif;background:#0B1620;color:#EDE7DA;padding:40px">
  <h1>Contratá Ya · MCP</h1>
  <p>Endpoint para Grok web: <code>POST /mcp</code></p>
  <p>${TOOLS.length} tools · Supabase ${SERVICE_KEY ? 'ok' : 'FALTA SERVICE_ROLE'}</p>
  </body>`);
});

async function mcp(req, res) {
  if (!autorizado(req)) return res.status(401).json({ error: 'no autorizado' });
  if (req.method === 'GET' || req.method === 'DELETE') return res.status(405).end();

  const body = req.body;
  const lote = Array.isArray(body);
  const msgs = lote ? body : [body];
  const out = [];
  for (const m of msgs) {
    const r = await manejarRpc(m);
    if (r) out.push(r);
  }
  if (!lote) return res.json(out[0] != null ? out[0] : {});
  res.json(out);
}

app.post('/mcp', mcp);
app.post('/', mcp);

app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`MCP Contratá Ya en http://localhost:${PUERTO}/mcp  (${TOOLS.length} tools)`);
  if (!SERVICE_KEY) {
    console.warn('Sin SUPABASE_SERVICE_ROLE: las tools de la WEB (archivos + FTP) andan.');
    console.warn('Las de la BASE (usuarios, pedidos, etc.) van a fallar hasta que la cargues.');
  }
  if (!MCP_TOKEN) console.warn('Sin MCP_TOKEN: cualquiera que tenga la URL puede consultar la base.');
});
