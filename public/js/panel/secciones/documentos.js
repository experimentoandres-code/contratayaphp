/* ============================================================
   CONTRATÁ YA — Panel · Documentos
   El vault de markdown y HTML: carpetas, lectura y edición en
   vivo. Antes vivía en js/admin-docs.js; se movió tal cual.
   ============================================================ */

/* ============================================================
   CONTRATÁ YA — Documentos del panel (vault markdown)
   Navegación tipo Obsidian, edición en vivo, sólo admin.
   ============================================================ */

const DocsAdmin = {
  max: 5,
  modo: 'read',        // se abre siempre para leer; editar es un paso aparte
  actual: null,
  bruto: '',
  sucio: false,
  tree: [],
  files: [],
  carpeta: '',
  cache: new Map(),
  el: null,
  keys: false,
  autoT: null,
  abiertas: new Set()
};

DocsAdmin.hayCambios = () => !!DocsAdmin.sucio;
DocsAdmin.montado = () => !!(DocsAdmin.el && DocsAdmin.el.isConnected);

function docsEsc(t) {
  return String(t ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function docsProf(rel, folder) {
  const partes = String(rel || '').split('/').filter(Boolean);
  return folder ? partes.length : Math.max(0, partes.length - 1);
}

function docsSlug(s) {
  return String(s || '').trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').slice(0, 80);
}

function docsAplanar(nodos, acc) {
  acc = acc || [];
  for (const n of nodos || []) {
    if (n.type === 'file') acc.push(n);
    if (n.children) docsAplanar(n.children, acc);
  }
  return acc;
}

async function docsToken() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || !session.access_token) throw new Error('sin sesión');
  return session.access_token;
}

function docsEsLocal() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

async function docsReq(recurso, opts) {
  opts = opts || {};
  const token = await docsToken();
  const headers = { Authorization: 'Bearer ' + token };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const qs = new URLSearchParams();
  if (opts.path) qs.set('path', opts.path);
  const q = qs.toString();
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.stringify(opts.body) : undefined;

  const restUrl = '/api/admin/docs/' + recurso + (q ? '?' + q : '');
  const r = await fetch(restUrl, { method, headers, body });
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'error');
    return j;
  }

  if (docsEsLocal()) {
    throw new Error('La API de Documentos no respondió. Arrancá el servidor con npm.cmd start');
  }

  const phpQs = new URLSearchParams({ recurso });
  if (opts.path) phpQs.set('path', opts.path);
  if (opts.op) phpQs.set('op', opts.op);
  const phpMethod = method === 'GET' ? 'GET' : 'POST';
  const r2 = await fetch('/docs-api.php?' + phpQs.toString(), {
    method: phpMethod,
    headers,
    body: phpMethod === 'POST' ? (body || JSON.stringify(opts.body || { path: opts.path })) : undefined
  });
  const j2 = await r2.json().catch(() => ({}));
  if (!r2.ok) throw new Error(j2.error || 'No se pudo hablar con Documentos');
  return j2;
}

function docsBuscarNota(q) {
  const s = String(q || '').replace(/\\/g, '/').replace(/\.md$/i, '').trim().toLowerCase();
  if (!s) return null;
  return DocsAdmin.files.find(f => f.path.toLowerCase() === s + '.md')
    || DocsAdmin.files.find(f => f.path.toLowerCase().endsWith('/' + s + '.md'))
    || DocsAdmin.files.find(f => f.name.toLowerCase() === s)
    || DocsAdmin.files.find(f => f.name.toLowerCase().includes(s));
}

function docsWiki(src) {
  return src.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const nota = docsBuscarNota(target.trim());
    const texto = alias || target.trim();
    if (!nota) return `<span class="docs-wiki-roto" title="No existe">${docsEsc(texto)}</span>`;
    return `<a class="docs-wiki" href="#" data-path="${docsEsc(nota.path)}">${docsEsc(texto)}</a>`;
  });
}

function docsEsHtml(path) {
  return /\.html?$/i.test(String(path || ''));
}

function docsRender(src) {
  const md = DocsAdmin.el && DocsAdmin.el.querySelector('#docsMd');
  if (!md) return;
  let html;

  if (docsEsHtml(DocsAdmin.actual)) {
    // Documento HTML: se muestra como está. Igual pasa por el saneador:
    // lo escribe una persona, pero un <script> pegado sin querer no corre.
    html = String(src || '');
  } else if (window.marked) {
    // Markdown completo: tablas, tachado, listas de tareas, citas, código.
    marked.setOptions({ gfm: true, breaks: false, pedantic: false });
    html = marked.parse(docsWiki(src || ''));
  } else {
    html = '<pre>' + docsEsc(src) + '</pre>';
  }

  if (window.DOMPurify) {
    html = DOMPurify.sanitize(html, {
      ADD_TAGS: ['details', 'summary', 'kbd', 'mark', 'figure', 'figcaption', 'abbr', 'sup', 'sub'],
      ADD_ATTR: ['target', 'colspan', 'rowspan', 'align', 'checked', 'disabled', 'type', 'start', 'open']
    });
  }
  md.innerHTML = html;
  md.classList.toggle('docs-md-html', docsEsHtml(DocsAdmin.actual));
}

function docsSetSucio(v) {
  DocsAdmin.sucio = v;
  const el = DocsAdmin.el && DocsAdmin.el.querySelector('#docsEstado');
  if (!el) return;
  if (v) { el.textContent = 'sin guardar'; el.className = 'docs-estado sucio'; }
  else { el.textContent = 'guardado'; el.className = 'docs-estado ok'; }
}

function docsSetModo(m) {
  if (m !== 'read' && m !== 'edit') m = 'read';
  DocsAdmin.modo = m;
  try { sessionStorage.setItem('docsModo', m); } catch (_) {}
  if (DocsAdmin.el) DocsAdmin.el.setAttribute('data-modo', m);
  if (!DocsAdmin.el) return;
  DocsAdmin.el.querySelectorAll('.docs-modos button').forEach(b => {
    b.classList.toggle('ok', b.dataset.modo === m);
  });
  const ed = DocsAdmin.el.querySelector('#docsEditor');
  if (m !== 'read' && ed) ed.focus();
}

function docsHtmlArbol(nodos, q) {
  const filtro = (q || '').trim().toLowerCase();
  function ok(n) {
    if (!filtro) return true;
    if (n.type === 'file') return (n.name + n.path).toLowerCase().includes(filtro);
    return (n.children || []).some(ok);
  }
  function html(lista) {
    return (lista || []).filter(ok).map(n => {
      if (n.type === 'dir') {
        const cerrada = DocsAdmin.abiertas.has(n.path) ? '' : ' cerrada';
        const act = DocsAdmin.carpeta === n.path ? ' en-carpeta' : '';
        return `<div class="docs-carpeta${cerrada}${act}" data-dir="${docsEsc(n.path)}">
          <div class="docs-fila">
            <span class="docs-chev">▾</span>
            <span class="docs-etiq">${docsEsc(n.name)}</span>
          </div>
          <div class="docs-kids">${html(n.children || [])}</div>
        </div>`;
      }
      const act = DocsAdmin.actual === n.path ? ' activa' : '';
      return `<div class="docs-nota${act}" data-path="${docsEsc(n.path)}">${docsEsc(n.name)}</div>`;
    }).join('');
  }
  const marcado = html(nodos);
  return marcado || '<p class="docs-vacio">Sin coincidencias</p>';
}

function docsPintarArbol() {
  const nav = DocsAdmin.el && DocsAdmin.el.querySelector('#docsArbol');
  const q = DocsAdmin.el && DocsAdmin.el.querySelector('#docsBuscar');
  if (!nav) return;
  nav.innerHTML = docsHtmlArbol(DocsAdmin.tree, q ? q.value : '');
}

function docsMigas(path) {
  const el = DocsAdmin.el && DocsAdmin.el.querySelector('#docsMigas');
  if (!el) return;
  if (!path) { el.textContent = 'Documentos'; return; }
  const partes = path.split('/');
  el.innerHTML = partes.map((p, i, a) =>
    i === a.length - 1
      ? `<b>${docsEsc(p.replace(/\.md$/i, ''))}</b>`
      : docsEsc(p)
  ).join(' <span>/</span> ');
}

/* Todas las carpetas abiertas la primera vez. Un árbol cerrado esconde
   justo lo que uno viene a buscar. */
function docsAbrirTodo(nodos) {
  for (const n of nodos || []) {
    if (n.type === 'dir') { DocsAdmin.abiertas.add(n.path); docsAbrirTodo(n.children); }
  }
}

async function docsCargarArbol() {
  const j = await docsReq('tree');
  DocsAdmin.tree = j.tree || [];
  if (j.max) DocsAdmin.max = j.max;
  DocsAdmin.files = docsAplanar(DocsAdmin.tree);
  if (!DocsAdmin.abiertas.size) docsAbrirTodo(DocsAdmin.tree);
  docsPintarArbol();
}

async function docsLeer(path) {
  if (DocsAdmin.cache.has(path) && DocsAdmin.sucio && DocsAdmin.actual === path) {
    return DocsAdmin.cache.get(path);
  }
  const j = await docsReq('file', { path });
  return j.contenido;
}

async function docsAbrir(path) {
  if (DocsAdmin.sucio && DocsAdmin.actual && DocsAdmin.actual !== path) {
    if (!confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
  }
  const nota = DocsAdmin.files.find(f => f.path === path);
  if (!nota) return;
  try {
    const contenido = await docsLeer(path);
    DocsAdmin.actual = path;
    DocsAdmin.carpeta = path.split('/').slice(0, -1).join('/');
    DocsAdmin.bruto = contenido;
    DocsAdmin.cache.set(path, contenido);
    const ed = DocsAdmin.el.querySelector('#docsEditor');
    const vacio = DocsAdmin.el.querySelector('#docsVacio');
    const md = DocsAdmin.el.querySelector('#docsMd');
    ed.value = contenido;
    ed.placeholder = docsEsHtml(path) ? 'Escribí HTML…' : 'Escribí markdown…';
    if (vacio) vacio.hidden = true;
    if (md) md.hidden = false;
    docsRender(contenido);
    docsMigas(path);
    docsSetSucio(false);
    docsPintarArbol();
    // Cada nota se abre para leer. Editar es una decisión, no el estado inicial.
    if (DocsAdmin.modo !== 'read') docsSetModo('read');
  } catch (e) {
    docsSetSucio(true);
    const el = DocsAdmin.el.querySelector('#docsEstado');
    if (el) el.textContent = e.message || 'error';
  }
}

async function docsGuardar() {
  if (!DocsAdmin.actual) return;
  const ed = DocsAdmin.el.querySelector('#docsEditor');
  const contenido = ed ? ed.value : '';
  const j = await docsReq('file', {
    method: 'PUT',
    path: DocsAdmin.actual,
    op: 'guardar',
    body: { path: DocsAdmin.actual, contenido }
  });
  DocsAdmin.bruto = contenido;
  DocsAdmin.cache.set(DocsAdmin.actual, contenido);
  docsSetSucio(false);
  if (DocsAdmin.modo !== 'edit') docsRender(contenido);
  return j;
}

function docsOnEdit() {
  const ed = DocsAdmin.el.querySelector('#docsEditor');
  if (!ed || !DocsAdmin.actual) return;
  const v = ed.value;
  if (v === DocsAdmin.bruto) docsSetSucio(false);
  else docsSetSucio(true);
  DocsAdmin.cache.set(DocsAdmin.actual, v);
  if (DocsAdmin.modo !== 'edit') docsRender(v);
  clearTimeout(DocsAdmin.autoT);
  DocsAdmin.autoT = setTimeout(() => {
    if (DocsAdmin.sucio) docsGuardar().catch(e => brindis(e.message || 'No se pudo guardar'));
  }, 1200);
}

function docsPaleta(q) {
  const lista = DocsAdmin.el.querySelector('#docsListaCmd');
  const s = (q || '').trim().toLowerCase();
  const filas = DocsAdmin.files.filter(f => !s || (f.name + f.path).toLowerCase().includes(s)).slice(0, 30);
  lista.innerHTML = filas.map((f, i) =>
    `<div class="docs-item-cmd${i === 0 ? ' sel' : ''}" data-path="${docsEsc(f.path)}">
      <span>${docsEsc(f.name)}</span><small>${docsEsc(f.path)}</small>
    </div>`
  ).join('') || '<div class="docs-item-cmd">Sin resultados</div>';
}

function docsAbrirPaleta() {
  const velo = DocsAdmin.el.querySelector('#docsPaleta');
  const inp = DocsAdmin.el.querySelector('#docsCmdQ');
  velo.classList.add('abierto');
  inp.value = '';
  docsPaleta('');
  inp.focus();
}

function docsModal(tipo) {
  DocsAdmin.creando = tipo;
  const velo = DocsAdmin.el.querySelector('#docsModal');
  DocsAdmin.el.querySelector('#docsModalTitulo').textContent =
    tipo === 'nota' ? 'Nueva nota' : 'Nueva carpeta';
  DocsAdmin.el.querySelector('#docsNuevaNombre').placeholder =
    tipo === 'nota' ? 'Nombre de la nota' : 'Nombre de la carpeta';
  const padre = DocsAdmin.carpeta || (DocsAdmin.actual
    ? DocsAdmin.actual.split('/').slice(0, -1).join('/')
    : '');
  DocsAdmin.el.querySelector('#docsNuevaCarpeta').value = padre;
  DocsAdmin.el.querySelector('#docsNuevaNombre').value = '';
  const formato = DocsAdmin.el.querySelector('#docsNuevoFormato');
  if (formato) formato.parentElement.hidden = (tipo !== 'nota');
  velo.classList.add('abierto');
  DocsAdmin.el.querySelector('#docsNuevaNombre').focus();
}

async function docsCrear() {
  const carpeta = docsSlug(DocsAdmin.el.querySelector('#docsNuevaCarpeta').value).replace(/\\/g, '/');
  const nombre = docsSlug(DocsAdmin.el.querySelector('#docsNuevaNombre').value);
  if (!nombre) return;
  if (DocsAdmin.creando === 'carpeta') {
    const path = [carpeta, nombre].filter(Boolean).join('/');
    if (docsProf(path, true) > DocsAdmin.max) {
      brindis('Máximo ' + DocsAdmin.max + ' subcarpetas');
      return;
    }
    await docsReq('folder', { method: 'POST', op: 'crear', body: { path } });
    DocsAdmin.el.querySelector('#docsModal').classList.remove('abierto');
    DocsAdmin.abiertas.add(path);
    DocsAdmin.carpeta = path;
    await docsCargarArbol();
    brindis('Carpeta creada');
    return;
  }
  // Markdown u HTML: los dos se leen y se guardan igual.
  const sel = DocsAdmin.el.querySelector('#docsNuevoFormato');
  const ext = (sel && sel.value === 'html') ? '.html' : '.md';
  const path = [carpeta, nombre + ext].filter(Boolean).join('/');
  if (docsProf(path, false) > DocsAdmin.max) {
    brindis('Máximo ' + DocsAdmin.max + ' subcarpetas');
    return;
  }
  await docsReq('file', {
    method: 'POST',
    op: 'crear',
    body: { path, contenido: '# ' + nombre + '\n\n' }
  });
  DocsAdmin.el.querySelector('#docsModal').classList.remove('abierto');
  if (carpeta) DocsAdmin.abiertas.add(carpeta);
  await docsCargarArbol();
  await docsAbrir(path);
  docsSetModo('edit');   // una nota nueva se abre para escribirla
}

async function docsBorrar() {
  if (!DocsAdmin.actual) return;
  if (!confirm('¿Borrar «' + DocsAdmin.actual + '»? No se puede deshacer.')) return;
  await docsReq('file', { method: 'DELETE', path: DocsAdmin.actual, op: 'borrar' });
  DocsAdmin.cache.delete(DocsAdmin.actual);
  DocsAdmin.actual = null;
  DocsAdmin.sucio = false;
  DocsAdmin.el.querySelector('#docsEditor').value = '';
  DocsAdmin.el.querySelector('#docsMd').hidden = true;
  DocsAdmin.el.querySelector('#docsVacio').hidden = false;
  docsMigas('');
  docsSetSucio(false);
  await docsCargarArbol();
  brindis('Nota borrada');
}

function docsPlantilla() {
  return `<div class="docs-admin" data-modo="${docsEsc(DocsAdmin.modo)}">
    <aside class="docs-lado">
      <button type="button" id="docsPlegar" class="docs-plegar" title="Ocultar las carpetas">‹</button>
      <input id="docsBuscar" type="search" placeholder="Buscar  ·  Ctrl+K" autocomplete="off">
      <div class="docs-acciones">
        <button type="button" id="docsBtnNota">+ Nota</button>
        <button type="button" id="docsBtnCarpeta">+ Carpeta</button>
        <button type="button" id="docsBtnBajar" title="Bajar los documentos en un archivo">⤓ Bajar</button>
      </div>
      <nav id="docsArbol"><p class="docs-vacio">Cargando…</p></nav>
    </aside>
    <section class="docs-main">
      <header class="docs-barra">
        <button type="button" id="docsMenu" aria-label="Ver las carpetas">Carpetas</button>
        <div id="docsMigas">Documentos</div>
        <div class="docs-modos">
          <button type="button" data-modo="read">Leer</button>
          <button type="button" data-modo="edit">Editar</button>
        </div>
        <button type="button" class="docs-ico" id="docsBtnGuardar">Guardar</button>
        <button type="button" class="docs-ico docs-ico-mal" id="docsBtnBorrar">Borrar</button>
        <div id="docsEstado" class="docs-estado">listo</div>
      </header>
      <div class="docs-lienzo">
        <textarea id="docsEditor" spellcheck="false" placeholder="Escribí markdown…"></textarea>
        <article class="docs-vista">
          <div id="docsVacio" class="docs-vacio-main">
            <p>Elegí una nota del árbol o creá una nueva.</p>
            <p><kbd>Ctrl</kbd>+<kbd>K</kbd> buscar · <kbd>Ctrl</kbd>+<kbd>S</kbd> guardar · <kbd>Ctrl</kbd>+<kbd>E</kbd> editar</p>
            <p>Hasta ${DocsAdmin.max} subcarpetas. Enlaces internos: <code>[[Bienvenida]]</code></p>
          </div>
          <div class="docs-md" id="docsMd" hidden></div>
        </article>
      </div>
    </section>
    <div class="docs-velo" id="docsPaleta">
      <div class="docs-caja">
        <h2>Abrir nota</h2>
        <input class="docs-campo" id="docsCmdQ" placeholder="Nombre o carpeta…">
        <div id="docsListaCmd"></div>
      </div>
    </div>
    <div class="docs-velo" id="docsModal">
      <div class="docs-caja">
        <h2 id="docsModalTitulo">Nueva nota</h2>
        <input class="docs-campo" id="docsNuevaCarpeta" placeholder="Carpeta (vacío = raíz)">
        <input class="docs-campo" id="docsNuevaNombre" placeholder="Nombre">
        <label class="docs-formato">Formato
          <select class="docs-campo" id="docsNuevoFormato">
            <option value="md">Markdown (.md)</option>
            <option value="html">HTML (.html)</option>
          </select>
        </label>
        <div class="docs-pies">
          <button type="button" data-docs-cerrar>Cancelar</button>
          <button type="button" class="pri" id="docsCrearOk">Crear</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* Bajar los documentos en un solo archivo. La API pide la sesión en una
   cabecera, así que no alcanza con un enlace: se trae el archivo y recién
   ahí se le pasa al navegador. */
async function docsBajar(carpeta) {
  const boton = DocsAdmin.el.querySelector('#docsBtnBajar');
  const textoOriginal = boton ? boton.textContent : '';
  if (boton) { boton.disabled = true; boton.textContent = 'Armando…'; }
  try {
    const token = await docsToken();
    const qs = carpeta ? '?path=' + encodeURIComponent(carpeta) : '';
    const r = await fetch('/api/admin/docs/zip' + qs, { headers: { Authorization: 'Bearer ' + token } });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || 'no se pudo armar el archivo');
    }
    const cuantos = r.headers.get('X-Documentos') || '';
    const nombre = (r.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre ? nombre[1] : 'documentos.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    brindis(cuantos ? `${cuantos} documentos bajados` : 'Documentos bajados');
  } catch (e) {
    brindis(e.message || 'No se pudo bajar');
  } finally {
    if (boton) { boton.disabled = false; boton.textContent = textoOriginal; }
  }
}

/* El árbol se puede plegar para leer a pantalla completa, y se acuerda. */
function docsPlegarLado(plegado) {
  DocsAdmin.el.classList.toggle('lado-plegado', plegado);
  const b = DocsAdmin.el.querySelector('#docsPlegar');
  if (b) {
    b.textContent = plegado ? '›' : '‹';
    b.title = plegado ? 'Mostrar las carpetas' : 'Ocultar las carpetas';
  }
  try { localStorage.setItem('docsLado', plegado ? 'plegado' : 'abierto'); } catch (_) {}
}

function docsConectar() {
  const botonBajar = DocsAdmin.el.querySelector('#docsBtnBajar');
  if (botonBajar) {
    botonBajar.addEventListener('click', () => {
      // Con una carpeta abierta baja esa; si no, baja todo.
      const carpeta = DocsAdmin.carpeta || '';
      docsBajar(carpeta);
    });
  }

  const botonPlegar = DocsAdmin.el.querySelector('#docsPlegar');
  if (botonPlegar) {
    botonPlegar.addEventListener('click', () =>
      docsPlegarLado(!DocsAdmin.el.classList.contains('lado-plegado')));
    let guardado = null;
    try { guardado = localStorage.getItem('docsLado'); } catch (_) {}
    if (guardado === 'plegado') docsPlegarLado(true);
  }

  const root = DocsAdmin.el;
  root.querySelector('#docsArbol').addEventListener('click', (e) => {
    const nota = e.target.closest('.docs-nota');
    if (nota) {
      docsAbrir(nota.dataset.path).catch(err => brindis(err.message || 'No se pudo abrir'));
      root.classList.remove('lado');
      return;
    }
    const fila = e.target.closest('.docs-carpeta > .docs-fila');
    if (fila) {
      const carp = fila.parentElement;
      const path = carp.dataset.dir;
      const cerrar = !carp.classList.contains('cerrada');
      carp.classList.toggle('cerrada', cerrar);
      if (cerrar) DocsAdmin.abiertas.delete(path);
      else DocsAdmin.abiertas.add(path);
      DocsAdmin.carpeta = path;
      root.querySelectorAll('.docs-carpeta').forEach(c => {
        c.classList.toggle('en-carpeta', c.dataset.dir === path);
      });
    }
  });

  root.querySelector('#docsBuscar').addEventListener('input', () => docsPintarArbol());
  const ed = root.querySelector('#docsEditor');
  ed.addEventListener('input', docsOnEdit);
  ed.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const a = e.target.selectionStart, b = e.target.selectionEnd;
      e.target.setRangeText('  ', a, b, 'end');
      docsOnEdit();
    }
  });

  root.querySelectorAll('.docs-modos button').forEach(b => {
    b.addEventListener('click', () => {
      docsSetModo(b.dataset.modo);
      if (b.dataset.modo !== 'edit') docsRender(ed.value || DocsAdmin.bruto);
    });
  });

  root.querySelector('#docsBtnGuardar').addEventListener('click', () => {
    docsGuardar().then(() => brindis('Guardado')).catch(e => brindis(e.message || 'No se pudo guardar'));
  });
  root.querySelector('#docsBtnBorrar').addEventListener('click', () => {
    docsBorrar().catch(e => brindis(e.message || 'No se pudo borrar'));
  });
  root.querySelector('#docsBtnNota').addEventListener('click', () => docsModal('nota'));
  root.querySelector('#docsBtnCarpeta').addEventListener('click', () => docsModal('carpeta'));
  root.querySelector('#docsCrearOk').addEventListener('click', () => {
    docsCrear().catch(e => brindis(e.message || 'No se pudo crear'));
  });
  root.querySelector('#docsMenu').addEventListener('click', () => root.classList.toggle('lado'));

  root.querySelectorAll('[data-docs-cerrar]').forEach(b => {
    b.addEventListener('click', () => b.closest('.docs-velo').classList.remove('abierto'));
  });
  root.querySelectorAll('.docs-velo').forEach(v => {
    v.addEventListener('click', (e) => { if (e.target === v) v.classList.remove('abierto'); });
  });

  root.querySelector('#docsCmdQ').addEventListener('input', () => docsPaleta(root.querySelector('#docsCmdQ').value));
  root.querySelector('#docsListaCmd').addEventListener('click', (e) => {
    const it = e.target.closest('.docs-item-cmd');
    if (!it || !it.dataset.path) return;
    root.querySelector('#docsPaleta').classList.remove('abierto');
    docsAbrir(it.dataset.path).catch(err => brindis(err.message || 'No se pudo abrir'));
  });
  root.querySelector('#docsCmdQ').addEventListener('keydown', (e) => {
    const items = [...root.querySelectorAll('.docs-item-cmd')];
    const i = items.findIndex(x => x.classList.contains('sel'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items.forEach(x => x.classList.remove('sel'));
      items[Math.min(items.length - 1, i + 1)]?.classList.add('sel');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items.forEach(x => x.classList.remove('sel'));
      items[Math.max(0, i - 1)]?.classList.add('sel');
    } else if (e.key === 'Enter') {
      const sel = root.querySelector('.docs-item-cmd.sel');
      if (sel && sel.dataset.path) {
        root.querySelector('#docsPaleta').classList.remove('abierto');
        docsAbrir(sel.dataset.path).catch(err => brindis(err.message || 'No se pudo abrir'));
      }
    }
  });

  root.querySelector('.docs-vista').addEventListener('click', (e) => {
    const a = e.target.closest('.docs-wiki');
    if (!a) return;
    e.preventDefault();
    docsAbrir(a.dataset.path).catch(err => brindis(err.message || 'No se pudo abrir'));
  });

  if (!DocsAdmin.keys) {
    DocsAdmin.keys = true;
    document.addEventListener('keydown', (e) => {
      if (Panel.sec !== 'documentos') return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        docsGuardar().then(() => brindis('Guardado')).catch(err => brindis(err.message || 'No se pudo guardar'));
      }
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); docsAbrirPaleta(); }
      if (meta && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        docsSetModo(DocsAdmin.modo === 'read' ? 'edit' : 'read');
        if (DocsAdmin.modo === 'read') docsRender((DocsAdmin.el.querySelector('#docsEditor') || {}).value || DocsAdmin.bruto);
      }
      if (meta && e.key.toLowerCase() === 'n') { e.preventDefault(); docsModal('nota'); }
      if (e.key === 'Escape') {
        DocsAdmin.el && DocsAdmin.el.querySelectorAll('.docs-velo.abierto').forEach(v => v.classList.remove('abierto'));
      }
    });
    window.addEventListener('beforeunload', (e) => {
      if (Panel.sec === 'documentos' && DocsAdmin.sucio) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
}

DocsAdmin.montar = async function (el) {
  try {
    const guardado = sessionStorage.getItem('docsModo');
    // 'split' era el modo dividido, que ya no existe.
    DocsAdmin.modo = (guardado === 'edit') ? 'edit' : 'read';
  } catch (_) { DocsAdmin.modo = 'read'; }
  const ya = el.querySelector('.docs-admin');
  if (ya && DocsAdmin.el === ya && ya.isConnected) {
    await docsCargarArbol();
    return;
  }
  el.innerHTML = docsPlantilla();
  DocsAdmin.el = el.querySelector('.docs-admin');
  docsSetModo(DocsAdmin.modo);
  docsConectar();
  try {
    await docsCargarArbol();
  } catch (e) {
    const nav = DocsAdmin.el.querySelector('#docsArbol');
    if (nav) nav.innerHTML = '<p class="docs-vacio">' + docsEsc(e.message || 'No se pudo leer el vault') + '</p>';
    const est = DocsAdmin.el.querySelector('#docsEstado');
    if (est) { est.textContent = e.message || 'error'; est.className = 'docs-estado sucio'; }
    return;
  }
  if (DocsAdmin.actual && DocsAdmin.files.some(f => f.path === DocsAdmin.actual)) {
    await docsAbrir(DocsAdmin.actual);
  } else {
    const home = DocsAdmin.files.find(f => f.path === 'Planificacion/00-INDICE.md')
              || DocsAdmin.files.find(f => f.path === 'Bienvenida.md')
              || DocsAdmin.files[0];
    if (home) await docsAbrir(home.path);
  }
};


Panel.registrar('documentos', {
  titulo:      'Documentos',
  bajada:      'Vault markdown · carpetas, lectura y edición en vivo',
  claseCuerpo: 'sec-docs',
  // Queda fuera del refresco de cada 12 segundos: acá se escribe, y
  // repintar debajo de la mano te comería lo tipeado.
  refrescar:   false,
  // Si ya está montado no se borra el cuerpo al recargar.
  conservar:   () => typeof DocsAdmin !== 'undefined' && DocsAdmin.montado(),
  alSalir() {
    if (typeof DocsAdmin !== 'undefined' && DocsAdmin.hayCambios()) {
      if (!confirm('Hay cambios sin guardar en Documentos. ¿Descartarlos?')) return false;
      DocsAdmin.sucio = false;
    }
    return true;
  },
  pintar: async (cuerpo) => {
    if (typeof DocsAdmin === 'undefined' || !DocsAdmin.montar) {
      throw new Error('No se cargó el módulo de Documentos');
    }
    await DocsAdmin.montar(cuerpo);
  }
});
