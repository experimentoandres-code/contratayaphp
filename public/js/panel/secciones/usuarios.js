/* ============================================================
   CONTRATÁ YA — Panel · Usuarios
   Todas las cuentas: filtros, búsqueda en el servidor, acciones en
   lote y la ficha de cada persona.
   ============================================================ */

const FILTROS_U = { rol: '', localidad: '', rubro: '', plan: '', puntaje: '', q: '', conexion: '' };
const NOMBRE_PLAN = { gratis: 'Gratis Verificado', verificado: 'Gratis Verificado', pro: 'Pro' };
const EN_APP_MS = 90000;

function nombreAdmin(u) {
  const n = String(u?.nombre || '').trim();
  if (!n || /^usuario eliminado$/i.test(n)) {
    return u.correo || u.whatsapp || 'Sin nombre';
  }
  return n;
}

function hayFiltrosU() {
  return Object.values(FILTROS_U).some(v => v);
}

function normBuscar(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

let busquedaUTimer = 0;
let focoBuscarU = false;

function pasaFiltrosU(u) {
  const texto = normBuscar(FILTROS_U.q).trim();
  if (texto) {
    const nombre = normBuscar(u.nombre);
    const visible = normBuscar(nombreAdmin(u));
    const correo = normBuscar(u.correo);
    const tel = String(u.whatsapp || '').replace(/\D/g, '');
    const digits = String(FILTROS_U.q || '').replace(/\D/g, '');
    const porTel = digits.length >= 4 && tel.includes(digits);
    const porTexto = nombre.includes(texto) || visible.includes(texto) || correo.includes(texto);
    if (!porTexto && !porTel) return false;
  }
  if (FILTROS_U.rol && u.rol !== FILTROS_U.rol) return false;
  if (FILTROS_U.localidad && u.localidad !== FILTROS_U.localidad) return false;
  if (FILTROS_U.rubro && u.rubro !== FILTROS_U.rubro) return false;
  // 'gratis' y 'verificado' son el mismo plan sin pagar, con dos nombres viejos.
  if (FILTROS_U.plan === 'pro' && u.plan !== 'pro') return false;
  if (FILTROS_U.plan === 'gratis' && u.plan === 'pro') return false;
  if (FILTROS_U.puntaje === 'alto' && !(Number(u.puntaje_pro) >= 4.5)) return false;
  if (FILTROS_U.puntaje === 'bajo' && !(Number(u.puntaje_pro) < 3)) return false;
  if (FILTROS_U.conexion === 'en_app' && !u._enApp) return false;
  if (FILTROS_U.conexion === 'instalada' && !u._instalada) return false;
  if (FILTROS_U.conexion === 'sin_instalar' && u._instalada) return false;
  if (FILTROS_U.conexion === 'sin_activar' && u.uso_activado !== false) return false;
  if (FILTROS_U.conexion === 'suspendidos' && !u.suspendido) return false;
  return true;
}

const SELECCION_U = new Set();

async function traerPerfilesAdmin() {
  // La búsqueda va al servidor: con muchas cuentas, filtrar sólo lo que entró
  // en el tope dejaba gente afuera sin decirlo.
  const { data, error } = await sb.rpc('admin_listar_usuarios', {
    p_q: FILTROS_U.q || null,
    p_limite: 500
  });
  if (error) throw error;
  return { todas: Array.isArray(data) ? data : [] };
}
async function verUsuarios() {
  const [traido, presencia, instaladas] = await Promise.all([
    traerPerfilesAdmin(), traerPresenciaAdmin(), traerInstalacionesAdmin()
  ]);
  const ahora = Date.now();
  const todas = (traido.todas || []).map(u => {
    const visto = presencia.get(u.id) || u.visto_en || null;
    return Object.assign({}, u, {
      _vistoEn: visto,
      _enApp: !!(visto && (ahora - new Date(visto).getTime()) < EN_APP_MS),
      _instalada: instaladas.has(u.id) || !!u.app_instalada_en,
      _instaladaEn: instaladas.get(u.id) || u.app_instalada_en || null
    });
  });
  todas.sort((a, b) => {
    if (!!a._enApp !== !!b._enApp) return b._enApp ? 1 : -1;
    const va = a._vistoEn ? new Date(a._vistoEn).getTime() : 0;
    const vb = b._vistoEn ? new Date(b._vistoEn).getTime() : 0;
    if (va !== vb) return vb - va;
    return new Date(b.creado_en || 0) - new Date(a.creado_en || 0);
  });
  const filas = todas.filter(pasaFiltrosU);
  Panel._usuarios = filas;
  // La selección no sobrevive a un filtro que saca a esa persona de la lista.
  const visibles = new Set(filas.map(u => u.id));
  [...SELECCION_U].forEach(id => { if (!visibles.has(id)) SELECCION_U.delete(id); });

  const count = todas.length;
  const nEnApp = todas.filter(u => u._enApp).length;
  const nInstalada = todas.filter(u => u._instalada).length;

  const opciones = (lista, valor, todos) =>
    `<option value="">${todos}</option>` +
    lista.map(x => `<option value="${esc(x.id ?? x)}" ${valor === (x.id ?? x) ? 'selected' : ''}>${esc(x.nombre ?? x)}</option>`).join('');

  const cols = '2fr minmax(0,1fr) 1.2fr minmax(0,1fr) 80px 90px 190px';

  $a('#cuerpo').innerHTML = `
    <div class="filtros">
      <input id="fBuscar" type="search" placeholder="Buscar por nombre, correo o WhatsApp" value="${esc(FILTROS_U.q)}" autocomplete="off">
      <select id="fRol">${opciones([{ id: 'cliente', nombre: 'Cliente' }, { id: 'pro', nombre: 'Profesional' }], FILTROS_U.rol, 'Todos los roles')}</select>
      <select id="fLoc">${opciones(LOCALIDADES, FILTROS_U.localidad, 'Todas las localidades')}</select>
      <select id="fRub">${opciones(RUBROS, FILTROS_U.rubro, 'Todos los rubros')}</select>
      <select id="fPlan">${opciones([{ id: 'gratis', nombre: 'Gratis Verificado' }, { id: 'pro', nombre: 'Pro' }], FILTROS_U.plan, 'Todos los planes')}</select>
      <select id="fPun">${opciones([{ id: 'alto', nombre: '4,5 o más' }, { id: 'bajo', nombre: 'Menos de 3' }], FILTROS_U.puntaje, 'Cualquier puntaje')}</select>
      <select id="fApp">${opciones([
        { id: 'en_app', nombre: 'En la app ahora' },
        { id: 'instalada', nombre: 'La descargó' },
        { id: 'sin_instalar', nombre: 'No la descargó' },
        { id: 'sin_activar', nombre: 'Sin activar' },
        { id: 'suspendidos', nombre: 'Suspendidos' }
      ], FILTROS_U.conexion, 'Todos (conexión)')}</select>
      ${hayFiltrosU() ? '<button class="btn-mini" id="limpiarFiltros">Limpiar filtros</button>' : ''}
      <span class="filtros-conteo">${num(filas.length)} de ${num(count)} · ${num(nEnApp)} en la app · ${num(nInstalada)} la descargaron</span>
    </div>

    ${filas.length ? `
    <div class="tabla">
      <div class="tabla-encabezado" style="grid-template-columns:${cols}">
        <div><label class="marca-todo"><input type="checkbox" id="uTodos"> Persona</label></div>
        <div>Rol</div><div>Localidad</div><div>Rubro</div>
        <div>Plan</div><div>Puntaje</div><div>Acciones</div>
      </div>
      ${filas.map(u => {
        const activa = u.uso_activado !== false;
        const p = u.rol === 'cliente' ? u.puntaje_cliente : u.puntaje_pro;
        return `
        <div class="tabla-fila" style="grid-template-columns:${cols}" data-usuario="${esc(u.id)}">
          <div class="persona">
            <input type="checkbox" class="marca-fila" data-marcar="${esc(u.id)}" ${SELECCION_U.has(u.id) ? 'checked' : ''} aria-label="Elegir a ${esc(nombreAdmin(u))}">
            <span class="persona-avatar">${u.foto_url ? `<img src="${esc(u.foto_url)}" alt="">` : esc(iniciales(u.nombre))}</span>
            <span class="celda-corta">
              <div class="persona-nombre celda-corta">${esc(nombreAdmin(u))}${u._enApp ? '<span class="punto-en-app" title="Tiene la app abierta"></span>' : ''}${u.suspendido ? ' <span class="pildora p-coral">Suspendido</span>' : ''}${activa ? '' : ' <span class="pildora p-gris">Sin activar</span>'}${Number(u.denuncias) > 0 ? ` <span class="pildora p-coral">${num(u.denuncias)} denuncia${Number(u.denuncias) === 1 ? '' : 's'}</span>` : ''}</div>
              <div class="persona-fecha">${esc(textoConexion(u))}${u.correo ? ' · ' + esc(u.correo) : ''}${u.whatsapp ? ' · ' + esc(u.whatsapp) : ''}</div>
            </span>
          </div>
          <div class="celda-corta" data-rotulo="Rol">${u.rol === 'cliente' ? 'Cliente' : 'Profesional'}</div>
          <div class="celda-corta" data-rotulo="Localidad">${esc(u.localidad || '—')}</div>
          <div class="celda-corta" data-rotulo="Rubro">${esc(nombreRubro(u.rubro))}</div>
          <div data-rotulo="Plan"><span class="pildora ${u.plan === 'pro' ? 'p-ambar' : 'p-gris'}">${esc(NOMBRE_PLAN[u.plan] || u.plan || 'Gratis Verificado')}</span></div>
          <div class="dato-mono" data-rotulo="Puntaje">${p != null ? Number(p).toFixed(1).replace('.', ',') : '—'}</div>
          <div class="acciones-celda" data-rotulo="Acciones">
            <button class="btn-mini" data-ficha="${esc(u.id)}">Ver ficha</button>
            ${u.suspendido
              ? `<button class="btn-mini btn-mini-ok" data-levantar-lista="${esc(u.id)}">Levantar suspensión</button>`
              : `<button class="btn-mini ${activa ? 'btn-mini-ok' : 'btn-mini-si'}" data-activar-uso="${esc(u.id)}" data-estado="${activa ? 1 : 0}">
              ${activa ? 'Activo' : 'Activar y verificar'}
            </button>
            ${u.id === Panel.admin?.id ? '' : `<button class="btn-mini btn-mini-mal" data-suspender-lista="${esc(u.id)}">Suspender</button>`}`}
          </div>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="vacio-admin">
      <h3>${hayFiltrosU() ? 'Nadie coincide con lo que buscaste' : 'Todavía no hay nadie registrado'}</h3>
      <p>${hayFiltrosU()
        ? 'Probá con menos filtros: sacá la localidad o el plan, o buscá sólo por el nombre.'
        : 'Cuando alguien cree su cuenta en la app va a aparecer acá, con su rol, su zona y su oficio.'}</p>
      ${hayFiltrosU() ? '<button class="btn-admin" id="limpiarFiltrosVacio">Limpiar filtros</button>' : ''}
    </div>`}

    <div class="barra-lote" id="barraLote" ${SELECCION_U.size ? '' : 'hidden'}>
      <span class="barra-lote-txt"><b id="loteN">${SELECCION_U.size}</b> elegidas</span>
      <div class="acciones-celda">
        <button class="btn-mini btn-mini-si" data-lote="activar">Activar y verificar</button>
        <button class="btn-mini" data-lote="avisar">Mandar un aviso</button>
        <button class="btn-mini" data-lote="quitar">Quitar el acceso</button>
        <button class="btn-mini btn-mini-mal" data-lote="suspender">Suspender</button>
        <button class="btn-mini" data-lote="nada">Cancelar</button>
      </div>
    </div>`;

  const enlazar = (id, campo) => {
    const el = $a(id);
    if (el) el.addEventListener('change', () => { FILTROS_U[campo] = el.value; verUsuarios(); });
  };
  enlazar('#fRol', 'rol'); enlazar('#fLoc', 'localidad'); enlazar('#fRub', 'rubro');
  enlazar('#fPlan', 'plan'); enlazar('#fPun', 'puntaje'); enlazar('#fApp', 'conexion');

  const buscar = $a('#fBuscar');
  if (buscar) {
    const lanzar = () => {
      FILTROS_U.q = ($a('#fBuscar')?.value || '').trim();
      verUsuarios();
    };
    buscar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(busquedaUTimer); focoBuscarU = true; lanzar(); }
    });
    buscar.addEventListener('input', () => {
      clearTimeout(busquedaUTimer);
      focoBuscarU = true;
      busquedaUTimer = setTimeout(lanzar, 320);
    });
    if (focoBuscarU) {
      buscar.focus();
      const n = buscar.value.length;
      try { buscar.setSelectionRange(n, n); } catch {}
      focoBuscarU = false;
    }
  }

  const limpiar = () => {
    Object.keys(FILTROS_U).forEach(k => FILTROS_U[k] = '');
    SELECCION_U.clear();
    verUsuarios();
  };
  $a('#limpiarFiltros')?.addEventListener('click', limpiar);
  $a('#limpiarFiltrosVacio')?.addEventListener('click', limpiar);

  // ── selección para acciones en lote
  const refrescarLote = () => {
    const barra = $a('#barraLote');
    if (!barra) return;
    barra.hidden = SELECCION_U.size === 0;
    const n = $a('#loteN');
    if (n) n.textContent = String(SELECCION_U.size);
    const todos = $a('#uTodos');
    if (todos) todos.checked = filas.length > 0 && SELECCION_U.size === filas.length;
  };
  document.querySelectorAll('[data-marcar]').forEach(c => {
    c.addEventListener('click', (e) => e.stopPropagation());
    c.addEventListener('change', () => {
      if (c.checked) SELECCION_U.add(c.dataset.marcar); else SELECCION_U.delete(c.dataset.marcar);
      refrescarLote();
    });
  });
  $a('#uTodos')?.addEventListener('change', (e) => {
    e.stopPropagation();
    SELECCION_U.clear();
    if (e.target.checked) filas.forEach(u => SELECCION_U.add(u.id));
    document.querySelectorAll('[data-marcar]').forEach(c => { c.checked = SELECCION_U.has(c.dataset.marcar); });
    refrescarLote();
  });
  document.querySelectorAll('[data-lote]').forEach(b => {
    b.addEventListener('click', () => accionEnLote(b.dataset.lote, filas));
  });
  refrescarLote();

  // ── acciones de cada fila
  document.querySelectorAll('[data-activar-uso]').forEach(b => {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      await activarUso(b.dataset.activarUso, b.dataset.estado === '1');
    });
  });
  document.querySelectorAll('[data-levantar-lista]').forEach(b => {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      b.disabled = true;
      const { error } = await sb.rpc('levantar_suspension', { p_usuario: b.dataset.levantarLista });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      brindis('Suspensión levantada');
      verUsuarios();
    });
  });
  document.querySelectorAll('[data-suspender-lista]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const u = filas.find(x => x.id === b.dataset.suspenderLista);
      suspenderUsuario(b.dataset.suspenderLista, u ? nombreAdmin(u) : '');
    });
  });
  document.querySelectorAll('[data-ficha]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirFichaUsuario(b.dataset.ficha);
    });
  });
  document.querySelectorAll('[data-usuario]').forEach(f => {
    f.addEventListener('click', () => abrirFichaUsuario(f.dataset.usuario));
  });
}

/* Acciones sobre varias personas de una. Siempre dice cuántas son y qué va a
   pasar antes de tocar nada. */
async function accionEnLote(que, filas) {
  if (que === 'nada') { SELECCION_U.clear(); verUsuarios(); return; }
  const ids = [...SELECCION_U].filter(id => id !== Panel.admin?.id);
  if (!ids.length) { brindis('No hay nadie elegido'); return; }
  const cuantas = ids.length + (ids.length === 1 ? ' cuenta' : ' cuentas');

  if (que === 'activar' || que === 'quitar') {
    const poner = que === 'activar';
    const texto = poner
      ? `¿Activar y verificar ${cuantas}?\n\nVan a poder usar la app y les queda el sello de verificadas.`
      : `¿Quitarle el acceso a ${cuantas}?\n\nNo van a poder usar la app hasta que las vuelvas a activar. Se puede deshacer.`;
    if (!confirm(texto)) return;
    for (const id of ids) await sb.rpc('admin_activar_uso', { p_usuario: id, p_poner: poner });
    brindis(poner ? `${cuantas} activadas` : `Se le quitó el acceso a ${cuantas}`);
  }

  if (que === 'suspender') {
    const motivo = prompt(
      `¿Suspender ${cuantas}?\n\nEscribí el motivo: lo van a leer en la app, en el cartel de cuenta suspendida.`);
    if (motivo === null) return;
    for (const id of ids) {
      await sb.rpc('admin_suspender_usuario', { p_usuario: id, p_motivo: String(motivo || '').trim() });
    }
    brindis(`${cuantas} suspendidas`);
  }

  if (que === 'avisar') {
    const cuerpo = prompt(`Mensaje para ${cuantas}:\n\nLe llega como aviso adentro de la app.`);
    if (cuerpo === null || !cuerpo.trim()) return;
    for (const id of ids) {
      await sb.rpc('admin_avisar_usuario', {
        p_usuario: id, p_titulo: 'Contratá Ya', p_cuerpo: cuerpo.trim()
      });
    }
    brindis(`Aviso mandado a ${cuantas}`);
  }

  SELECCION_U.clear();
  verUsuarios();
}

// Va por función y no escribiendo la tabla directo: 'verificacion' y
// 'suspendido' son campos que sólo puede tocar el panel.
async function suspenderUsuario(id, nombre, cerrar) {
  const motivo = prompt(
    `¿Suspender a ${nombre || 'esta persona'}?\n\nEscribí el motivo. Lo va a ver en la app, en el cartel de cuenta suspendida.`
  );
  if (motivo === null) return false;
  const { error } = await sb.rpc('admin_suspender_usuario', {
    p_usuario: id,
    p_motivo: String(motivo || '').trim()
  });
  if (error) { brindis(error.message || 'No se pudo suspender'); return false; }
  if (cerrar) cerrarFicha();
  brindis('Cuenta suspendida');
  if (Panel.sec === 'usuarios') verUsuarios();
  else if (Panel.sec === 'moderacion') verModeracion();
  return true;
}

async function activarUso(id, yaEsta, nombre) {
  if (yaEsta && !confirm(
    `¿Quitarle el acceso a ${nombre || 'esta persona'}?\n\nNo va a poder usar la app hasta que la vuelvas a activar. Se puede deshacer cuando quieras.`
  )) return;
  const { error } = await sb.rpc('admin_activar_uso', { p_usuario: id, p_poner: !yaEsta });
  if (error) { brindis('No se pudo: ' + error.message); return; }
  brindis(yaEsta ? 'Se le quitó el acceso' : 'Cuenta activada y verificada');
  if (Panel.sec === 'usuarios') verUsuarios();
}


/* ── Ficha de una persona ─────────────────────────────────────
   Todo lo que hace falta para decidir: el perfil, cómo contactarla, qué hizo
   en la app y sus antecedentes. Sale de una sola llamada al servidor.
   ─────────────────────────────────────────────────────────── */

const CAPAS_PANEL = [
  { id: 'telefono',  nombre: 'Teléfono' },
  { id: 'email',     nombre: 'Correo' },
  { id: 'cuit',      nombre: 'CUIT activo' },
  { id: 'identidad', nombre: 'Identidad' },
  { id: 'zona',      nombre: 'Zona de trabajo' }
];

const MOTIVO_CORTO = {
  no_es_quien_dice: 'No es quien dice ser', foto: 'Foto falsa o inapropiada',
  no_se_presento: 'No se presentó', trato: 'Malos tratos',
  estafa: 'Intento de estafa', otro: 'Otro motivo'
};

async function abrirFichaUsuario(id) {
  abrirFicha({ rotulo: 'Ficha de usuario', titulo: 'Buscando…', sub: '', datos: [], acciones: [] });
  const { data, error } = await sb.rpc('admin_ficha_usuario', { p_usuario: id });
  if (error || !data) {
    abrirFicha({
      rotulo: 'Ficha de usuario', titulo: 'No se pudo abrir',
      sub: error?.message || 'No encontramos a esa persona.',
      acciones: [{ texto: 'Cerrar', clase: 'btn-admin-sec', accion: cerrarFicha }]
    });
    return;
  }
  fichaUsuario(data);
}

function fichaUsuario(f) {
  const u = f.perfil || {};
  const c = f.conteos || {};
  const activa = u.uso_activado !== false;
  const wa = String(u.whatsapp || '').replace(/\D/g, '');
  const capas = Array.isArray(u.verificacion) ? u.verificacion : [];
  const esYo = u.id === Panel.admin?.id;

  const lista = (titulo, items, vacio) => `
    <div class="ficha-bloque">
      <div class="panel-titulo">${esc(titulo)}</div>
      ${items.length ? items.join('') : `<p class="metrica-nota">${esc(vacio)}</p>`}
    </div>`;

  const html = `
    <div class="ficha-cabecera-persona">
      <span class="persona-avatar ficha-foto">${u.foto_url ? `<img src="${esc(u.foto_url)}" alt="">` : esc(iniciales(u.nombre))}</span>
      <div>
        <div class="ficha-chips">
          <span class="pildora ${u.plan === 'pro' ? 'p-ambar' : 'p-gris'}">${esc(NOMBRE_PLAN[u.plan] || u.plan || 'Gratis Verificado')}</span>
          <span class="pildora ${activa ? 'p-verde' : 'p-coral'}">${activa ? 'Puede usar la app' : 'Sin activar'}</span>
          ${u.suspendido ? '<span class="pildora p-coral">Suspendida</span>' : ''}
          ${u.eliminado_en ? '<span class="pildora p-gris">Eliminada</span>' : ''}
        </div>
        <p class="metrica-nota" style="margin-top:8px">${esc(textoConexion({ _vistoEn: u.visto_en, _enApp: false }))}</p>
      </div>
    </div>

    ${u.suspendido ? `<div class="ficha-alerta">Cuenta suspendida${u.suspendido_en ? ' el ' + esc(fechaLarga(u.suspendido_en)) : ''}.${u.suspendido_motivo ? ' Motivo: ' + esc(u.suspendido_motivo) : ' Sin motivo anotado.'}</div>` : ''}

    <div class="campo-admin" style="margin:0">
      <span>WhatsApp</span>
      <input id="fWa" value="${esc(u.whatsapp || '')}" placeholder="549…" inputmode="tel">
      <div class="ficha-botonera">
        <button class="btn-admin-sec" id="fWaGuardar" type="button">Guardar número</button>
        ${wa ? `<a class="btn-admin-sec" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener noreferrer">Escribirle por WhatsApp</a>` : ''}
      </div>
    </div>

    <div class="ficha-bloque">
      <div class="panel-titulo">Verificación</div>
      <p class="metrica-nota" style="margin-bottom:10px">Tocá una capa para darla por cumplida o sacarla. Es lo que ve la gente en su perfil.</p>
      <div class="capas-admin">
        ${CAPAS_PANEL.map(k => `
          <button type="button" class="capa-chip ${capas.includes(k.id) ? 'capa-si' : ''}"
                  data-capa="${esc(k.id)}" data-puesta="${capas.includes(k.id) ? '1' : '0'}">
            ${capas.includes(k.id) ? '✓ ' : '+ '}${esc(k.nombre)}
          </button>`).join('')}
      </div>
    </div>

    <div class="ficha-numeros">
      ${[['Pedidos', c.pedidos], ['Matches', c.matches], ['Trabajos terminados', c.trabajos_fin],
         ['Mensajes escritos', c.mensajes], ['Reseñas recibidas', c.recibidas], ['Reseñas que dejó', c.hechas],
         ['Denuncias recibidas', c.denuncias], ['Denuncias que hizo', c.denuncias_hechas],
         ['Beneficios usados', c.canjes]].map(([k, v]) => `
        <div class="ficha-numero"><b>${num(v)}</b><span>${esc(k)}</span></div>`).join('')}
    </div>

    ${u.bio ? `<div class="ficha-bloque"><div class="panel-titulo">Cómo se presenta</div><p class="metrica-nota">${esc(u.bio)}</p></div>` : ''}

    ${lista('Últimos pedidos', (f.pedidos || []).map(x => `
      <div class="rubro-fila"><span>${esc(nombreRubro(x.rubro))} · ${esc(x.localidad || 'sin zona')}<br>
        <span class="persona-fecha">${esc(x.estado)} · ${esc(fechaCorta(x.creado_en))}</span></span></div>`),
      'Nunca publicó un pedido.')}

    ${lista('Últimos matches', (f.matches || []).map(x => `
      <div class="rubro-fila"><span>${esc(x.cliente || '—')} · ${esc(x.profesional || '—')}<br>
        <span class="persona-fecha">${num(x.mensajes)} mensaje${Number(x.mensajes) === 1 ? '' : 's'}${x.trabajo_estado ? ' · trabajo ' + esc(x.trabajo_estado) : ' · sin trabajo'} · ${esc(fechaCorta(x.creado_en))}</span></span></div>`),
      'Todavía no hizo ningún match.')}

    ${lista('Reseñas que recibió', (f.calificaciones || []).map(x => `
      <div class="rubro-fila"><span><b>${Number(x.puntaje).toFixed(1).replace('.', ',')}</b> · ${esc(x.autor || 'alguien')}<br>
        <span class="persona-fecha">${esc(x.texto || 'sin comentario')}</span></span></div>`),
      'Todavía nadie la calificó.')}

    ${lista('Denuncias en su contra', (f.denuncias || []).map(x => `
      <div class="rubro-fila"><span>${esc(MOTIVO_CORTO[x.motivo] || x.motivo)} · ${esc(x.estado)}<br>
        <span class="persona-fecha">La hizo ${esc(x.denunciante || 'alguien')} · ${esc(fechaCorta(x.creado_en))}${x.detalle ? ' · ' + esc(x.detalle) : ''}</span></span></div>`),
      'Nunca la reportó nadie.')}

    ${(f.suspensiones || []).length ? lista('Suspensiones anteriores', f.suspensiones.map(x => `
      <div class="rubro-fila"><span>${esc(x.motivo || 'Sin motivo anotado')}<br>
        <span class="persona-fecha">${esc(fechaLarga(x.creado_en))}${x.levantada_en ? ' · levantada el ' + esc(fechaLarga(x.levantada_en)) : ' · sigue vigente'}</span></span></div>`), '') : ''}

    ${lista('Últimos avisos que le mandamos', (f.avisos || []).map(x => `
      <div class="rubro-fila"><span>${esc(x.titulo || 'Aviso')}<br>
        <span class="persona-fecha">${esc(x.cuerpo || '')} · ${esc(fechaCorta(x.creado_en))}${x.leido_en ? ' · lo leyó' : ' · sin leer'}</span></span></div>`),
      'Nunca le mandamos un aviso desde el panel.')}`;

  abrirFicha({
    rotulo: 'Ficha de usuario',
    titulo: nombreAdmin(u),
    sub: `${u.rol === 'cliente' ? 'Cliente' : 'Profesional'}${u.rubro ? ' de ' + nombreRubro(u.rubro) : ''} · ${u.localidad || 'sin zona'}`,
    ancha: true,
    html,
    datos: [
      ['Correo', u.correo || 'Sin correo'],
      ['WhatsApp', u.whatsapp || 'Sin número'],
      ['Puntaje profesional', u.puntaje_pro != null ? Number(u.puntaje_pro).toFixed(1).replace('.', ',') : '—'],
      ['Puntaje cliente', u.puntaje_cliente != null ? Number(u.puntaje_cliente).toFixed(1).replace('.', ',') : '—'],
      ['Plan', (NOMBRE_PLAN[u.plan] || u.plan || 'Gratis Verificado') + (u.plan_hasta ? ' hasta ' + fechaLarga(u.plan_hasta) : '')],
      ['Código de beneficios', u.codigo_beneficio || 'No tiene'],
      ['Última conexión', u.visto_en ? (fechaHora(u.visto_en) + ' · ' + hace(u.visto_en)) : 'Nunca abrió la app'],
      ['App descargada', u.instalada_en || u.app_instalada_en
        ? 'Sí, la abre desde el ícono del teléfono · ' + fechaLarga(u.instalada_en || u.app_instalada_en)
        : 'No. Sólo entra por el navegador'],
      ['Se registró', fechaLarga(u.creado_en)]
    ],
    acciones: [
      { texto: activa ? 'Quitarle el acceso' : 'Activar y verificar', clase: activa ? 'btn-admin-sec' : 'btn-admin',
        accion: async () => { await activarUso(u.id, activa, nombreAdmin(u)); cerrarFicha(); if (Panel.sec === 'usuarios') verUsuarios(); } },
      { texto: 'Mandarle un aviso a la app', clase: 'btn-admin-sec', accion: () => avisarAUsuario(u.id, nombreAdmin(u)) },
      { texto: u.plan === 'pro' ? 'Volverlo al plan gratis' : 'Activarle el plan Pro', clase: 'btn-admin-sec',
        accion: () => cambiarPlan(u) },
      ...(u.suspendido ? [{ texto: 'Levantar la suspensión', clase: 'btn-admin',
        accion: async () => {
          const { error } = await sb.rpc('levantar_suspension', { p_usuario: u.id });
          if (error) { brindis(error.message || 'No se pudo'); return; }
          cerrarFicha(); brindis('Suspensión levantada');
          if (Panel.sec === 'usuarios') verUsuarios(); else if (Panel.sec === 'moderacion') verModeracion();
        } }]
        : (esYo ? [] : [{ texto: 'Suspender esta cuenta', clase: 'btn-admin-mal',
            accion: () => suspenderUsuario(u.id, nombreAdmin(u), true) }])),
      ...(esYo ? [] : [{ texto: 'Borrar esta cuenta', clase: 'btn-admin-mal', accion: () => borrarUsuario(u) }])
    ]
  });

  const btnWa = $a('#fWaGuardar');
  if (btnWa) {
    btnWa.addEventListener('click', async () => {
      const tel = ($a('#fWa') && $a('#fWa').value) || '';
      btnWa.disabled = true;
      const { data, error } = await sb.rpc('admin_guardar_whatsapp', { p_usuario: u.id, p_telefono: tel });
      btnWa.disabled = false;
      if (error) { brindis(error.message || 'No se pudo guardar'); return; }
      brindis(data && data.whatsapp ? 'WhatsApp guardado' : 'Número borrado');
      abrirFichaUsuario(u.id);
    });
  }

  document.querySelectorAll('#fichaPanel [data-capa]').forEach(b => {
    b.addEventListener('click', async () => {
      const puesta = b.dataset.puesta === '1';
      b.disabled = true;
      const { error } = await sb.rpc('marcar_verificacion', {
        p_usuario: u.id, p_capa: b.dataset.capa, p_poner: !puesta
      });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      brindis(puesta ? 'Capa sacada' : 'Capa dada por cumplida');
      abrirFichaUsuario(u.id);
    });
  });
}

async function cambiarPlan(u) {
  const aPro = u.plan !== 'pro';
  if (!confirm(aPro
    ? `¿Activarle el plan Pro a ${nombreAdmin(u)}?\n\nLe queda activo 30 días desde hoy.`
    : `¿Bajar a ${nombreAdmin(u)} al plan gratis?\n\nPierde los beneficios del Pro enseguida.`)) return;
  const { error } = await sb.rpc('activar_plan', { p_usuario: u.id, p_plan: aPro ? 'pro' : 'gratis' });
  if (error) { brindis(error.message || 'No se pudo'); return; }
  cerrarFicha();
  brindis(aPro ? 'Plan Pro activado por 30 días' : 'Volvió al plan gratis');
  if (Panel.sec === 'usuarios') verUsuarios();
  else if (Panel.sec === 'planes') verPlanesPendientes();
}

async function avisarAUsuario(id, nombre) {
  const cuerpo = prompt(`Mensaje para ${nombre}:\n\nLe llega como aviso adentro de la app.`);
  if (cuerpo === null || !cuerpo.trim()) return;
  const { error } = await sb.rpc('admin_avisar_usuario', {
    p_usuario: id, p_titulo: 'Contratá Ya', p_cuerpo: cuerpo.trim()
  });
  if (error) { brindis(error.message || 'No se pudo mandar'); return; }
  brindis('Aviso mandado');
}

async function borrarUsuario(u) {
  const nombre = nombreAdmin(u);
  if (!confirm(
    `¿Borrar la cuenta de ${nombre}?\n\nSe le borra el nombre, la foto, la descripción y el teléfono, y pierde el acceso.\nLos pedidos, chats y calificaciones quedan, para no romper el historial de la otra parte.\n\nEsto NO se puede deshacer.`
  )) return;
  if (prompt(`Para confirmar, escribí BORRAR:`) !== 'BORRAR') { brindis('No se borró nada'); return; }
  const { error } = await sb.rpc('admin_borrar_usuario', { p_usuario: u.id });
  if (error) { brindis(error.message || 'No se pudo borrar'); return; }
  cerrarFicha();
  brindis('Cuenta borrada');
  if (Panel.sec === 'usuarios') verUsuarios();
}




Panel.registrar('usuarios', {
  titulo: 'Usuarios',
  bajada: 'Clientes y profesionales de las 14 localidades',
  pintar: () => verUsuarios()
});
