/* ============================================================
   CONTRATÁ YA — Panel de administración
   Sin framework, sin build, todo en ámbito global, igual que el
   resto del proyecto.
   ============================================================ */

const $a = (s) => document.querySelector(s);

const RUBROS_COMERCIO = [
  { id: 'ferreteria',        nombre: 'Ferretería' },
  { id: 'corralon',          nombre: 'Corralón' },
  { id: 'pintureria',        nombre: 'Pinturería' },
  { id: 'aberturas',         nombre: 'Aberturas' },
  { id: 'quimicas',          nombre: 'Químicas' },
  { id: 'hoteles',           nombre: 'Hoteles' },
  { id: 'casas_electronica', nombre: 'Casas de electrónica' }
];

const ABONO_BASE = 80000;
const DIAS_POR_VENCER = 60;

const Panel = {
  sec: 'resumen',
  dias: 30,
  datos: {},
  admin: null,
  actualizado: null,
  vivo: null,
  matchSel: null
};

const BAJADAS = {
  resumen:        ['Resumen', 'Altas, matches y trabajos del período'],
  actividad:      ['Actividad', 'Quién hizo qué, en la app y en este panel'],
  usuarios:       ['Usuarios', 'Clientes y profesionales de las 14 localidades'],
  planes:         ['Planes', 'Quiénes pidieron pasar de plan'],
  pedidos:        ['Pedidos', 'Publicaciones abiertas y cerradas'],
  trabajos:       ['Matches y chats', 'Match, chat, presupuesto, trabajo, inicio, fin y calificación'],
  calificaciones: ['Calificaciones', 'Últimas reseñas recibidas'],
  anunciantes:    ['Anunciantes', 'Inventario comercial · 14 localidades × 7 rubros'],
  creativos:      ['Creativos', 'Banners de la franja e interstitials de pantalla completa'],
  moderacion:     ['Moderación', 'Denuncias y fotos reportadas'],
  documentos:     ['Documentos', 'Vault markdown · carpetas, lectura y edición en vivo']
};


/* ── Utilidades ───────────────────────────────────────────── */

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const num = (n) => Number(n || 0).toLocaleString('es-AR');
const pesos = (n) => '$ ' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
const nombreRubro = (id) =>
  (typeof RUBROS !== 'undefined' && RUBROS.find(r => r.id === id)?.nombre) || id || '—';

const iniciales = (nombre) => String(nombre || '?')
  .split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

function fechaCorta(f) {
  if (!f) return '—';
  const d = new Date(f);
  const hoy = new Date();
  const mismoDia = (a, b) => a.toDateString() === b.toDateString();
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (mismoDia(d, hoy)) return 'hoy ' + hora;
  if (mismoDia(d, ayer)) return 'ayer ' + hora;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

const fechaLarga = (f) => f
  ? new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

function hace(f) {
  if (!f) return '—';
  const min = Math.max(0, Math.floor((Date.now() - new Date(f)) / 60000));
  if (min < 1) return 'ahora';
  if (min < 60) return 'hace ' + min + ' min';
  const h = Math.floor(min / 60);
  if (h < 24) return 'hace ' + h + ' h';
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : 'hace ' + d + ' días';
}

function fechaHora(f) {
  if (!f) return '—';
  return new Date(f).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function textoConexion(u) {
  if (u._enApp) return 'En la app ahora';
  if (u._vistoEn) return 'Última conexión ' + fechaCorta(u._vistoEn);
  return 'Sin conexión registrada';
}

function diasHasta(f) {
  if (!f) return null;
  return Math.ceil((new Date(f) - new Date()) / 86400000);
}

function brindis(txt) {
  const b = $a('#brindis');
  b.textContent = txt;
  b.hidden = false;
  clearTimeout(brindis._t);
  brindis._t = setTimeout(() => { b.hidden = true; }, 2600);
}

const desde = (dias) => new Date(Date.now() - dias * 86400000).toISOString();


/* ── Portón: sólo entra el administrador ──────────────────── */

async function abrirPanel() {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    // Con un botón que entra acá mismo y vuelve al panel: mandarlo a la app
    // y que se acuerde de volver es hacerle perder el tiempo.
    $a('#portonTexto').textContent = 'Necesitás entrar con tu cuenta para usar el panel.';
    $a('#portonAcciones').innerHTML =
      '<button class="btn-admin" id="entrarPanel" style="margin-top:20px">Entrar con Google</button>';

    $a('#entrarPanel').addEventListener('click', async () => {
      const b = $a('#entrarPanel');
      b.disabled = true;
      b.textContent = 'Abriendo…';
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + '/admin.html' }
      });
      if (error) {
        b.disabled = false;
        b.textContent = 'Entrar con Google';
        $a('#portonTexto').textContent = 'No se pudo abrir el ingreso: ' + error.message;
      }
    });
    return;
  }

  const { data: esAdmin, error } = await sb.rpc('soy_admin');

  if (error) {
    $a('#portonTexto').textContent = 'No se pudo verificar el permiso: ' + error.message;
    return;
  }

  if (!esAdmin) {
    // Decimos CON QUÉ cuenta está: casi siempre el problema es que quedó
    // abierta la sesión de una cuenta de prueba.
    $a('#portonTexto').textContent =
      `Estás entrando como ${session.user.email}, y esa cuenta no tiene permiso para el panel.`;
    $a('#portonAcciones').innerHTML = `
      <button class="btn-admin" id="cambiarCuenta" style="margin-top:20px">Entrar con otra cuenta</button>
      <a class="btn-admin-sec" href="/app.html" style="display:inline-block;margin-top:8px">Volver a la app</a>`;

    $a('#cambiarCuenta').addEventListener('click', async () => {
      await sb.auth.signOut();
      location.reload();
    });
    return;
  }

  // Adentro.
  const { data: perfil } = await sb.from('perfiles')
    .select('nombre').eq('id', session.user.id).maybeSingle();

  Panel.admin = { id: session.user.id, nombre: perfil?.nombre || session.user.email };
  $a('#adminNombre').textContent = Panel.admin.nombre;
  $a('#adminInicial').textContent = iniciales(Panel.admin.nombre);

  $a('#porton').hidden = true;
  $a('#admin').hidden = false;

  conectarNavegacion();
  await pintarSeccion();
  arrancarVivo();
}


/* ── Navegación ───────────────────────────────────────────── */

function conectarNavegacion() {
  document.querySelectorAll('#nav button').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.sec === Panel.sec) return;
      if (Panel.sec === 'documentos' && window.DocsAdmin && DocsAdmin.hayCambios()) {
        if (!confirm('Hay cambios sin guardar en Documentos. ¿Descartarlos?')) return;
        DocsAdmin.sucio = false;
      }
      Panel.sec = b.dataset.sec;
      Panel.matchSel = null;
      document.querySelectorAll('#nav button').forEach(x => x.classList.toggle('activo', x === b));
      cerrarFicha();
      pintarSeccion();
    });
  });

  document.querySelectorAll('#periodo button').forEach(b => {
    b.addEventListener('click', () => {
      Panel.dias = Number(b.dataset.dias);
      document.querySelectorAll('#periodo button').forEach(x => x.classList.toggle('activo', x === b));
      pintarSeccion();
    });
  });

  $a('#recargar').addEventListener('click', () => pintarSeccion({ silencioso: false }));
  $a('#salirPanel').addEventListener('click', () => { location.href = '/app.html'; });
  $a('#ficha').addEventListener('click', (e) => {
    if (e.target.dataset.cerrarFicha !== undefined) cerrarFicha();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarFicha(); });
}

async function pintarSeccion(opts) {
  const silencioso = !!(opts && opts.silencioso);
  const esDocs = Panel.sec === 'documentos';
  const [titulo, bajada] = BAJADAS[Panel.sec];
  $a('#secTitulo').textContent = titulo;
  $a('#secBajada').textContent = bajada;
  $a('#periodo').hidden = Panel.sec !== 'resumen' && Panel.sec !== 'actividad';
  $a('#admin').classList.toggle('sec-docs', esDocs);
  if (esDocs && silencioso) {
    actualizarInsignias().catch(() => {});
    return;
  }
  if (!silencioso && !(esDocs && window.DocsAdmin && DocsAdmin.montado())) {
    $a('#cuerpo').innerHTML = '<p class="cargando">Cargando…</p>';
  }
  const btn = $a('#recargar');
  if (btn) { btn.classList.add('girando'); btn.textContent = 'Actualizando…'; }

  try {
    if (Panel.sec === 'resumen')        await verResumen();
    if (Panel.sec === 'actividad')      await verActividad();
    if (Panel.sec === 'usuarios')       await verUsuarios();
    if (Panel.sec === 'planes')         await verPlanesPendientes();
    if (Panel.sec === 'pedidos')        await verPedidos();
    if (Panel.sec === 'trabajos') {
      if (silencioso && Panel.matchSel) await verCharla(Panel.matchSel, { soloChat: true });
      else await verTrabajos();
    }
    if (Panel.sec === 'calificaciones') await verCalificaciones();
    if (Panel.sec === 'anunciantes')    await verAnunciantes();
    if (Panel.sec === 'creativos')      await verCreativos();
    if (Panel.sec === 'moderacion')     await verModeracion();
    if (Panel.sec === 'documentos')     await verDocumentos();
    marcarActualizado();
    actualizarInsignias().catch(() => {});
  } catch (e) {
    console.error('[panel]', e);
    $a('#cuerpo').innerHTML = `<div class="vacio-admin">
      <h3>No se pudieron traer los datos</h3>
      <p>${esc(e.message || 'Error inesperado')}</p>
      <button class="btn-admin" onclick="pintarSeccion()">Reintentar</button>
    </div>`;
  } finally {
    if (btn) { btn.classList.remove('girando'); btn.textContent = 'Actualizar'; }
  }
}

async function verDocumentos() {
  if (typeof DocsAdmin === 'undefined' || !DocsAdmin.montar) {
    throw new Error('No se cargó el módulo de Documentos');
  }
  await DocsAdmin.montar($a('#cuerpo'));
}

function marcarActualizado() {
  Panel.actualizado = new Date();
  const el = $a('#marcaTiempo');
  if (!el) return;
  const hora = Panel.actualizado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.innerHTML = `<span class="punto-vivo" aria-hidden="true"></span> En vivo · ${hora}`;
}

async function actualizarInsignias() {
  const [{ count: planes }, { data: dens }, { data: banners }] = await Promise.all([
    sb.from('interes_plan').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    sb.rpc('denuncias_abiertas'),
    sb.from('contratos_publicidad').select('anunciante:anunciantes!anunciante_id(logo_url)').eq('estado', 'activo')
  ]);
  const den = (dens && dens.length) || 0;
  const sinImg = (banners || []).filter(c => !c.anunciante?.logo_url).length;
  const set = (sec, n) => {
    const b = document.querySelector(`#nav [data-sec="${sec}"]`);
    if (!b) return;
    let g = b.querySelector('.nav-insignia');
    if (!n) { if (g) g.remove(); return; }
    if (!g) { g = document.createElement('span'); g.className = 'nav-insignia'; b.appendChild(g); }
    g.textContent = n > 99 ? '99+' : String(n);
  };
  set('planes', planes || 0);
  set('moderacion', den);
  set('creativos', sinImg);
}

function arrancarVivo() {
  if (Panel.vivo) return;
  Panel.vivo = setInterval(() => {
    if (document.hidden) return;
    if (Panel.sec === 'documentos') return;
    if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if ($a('#ficha') && !$a('#ficha').hidden) return;
    pintarSeccion({ silencioso: true });
  }, 12000);

  try {
    const canal = sb.channel('panel-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos' }, (p) => programarRefresco(p.new))
      .subscribe();
    Panel.canal = canal;
  } catch (e) { console.warn('[panel] realtime no disponible', e); }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Panel.sec !== 'documentos') pintarSeccion({ silencioso: true });
  });
}

let _refresco;
function programarRefresco(mov) {
  clearTimeout(_refresco);
  _refresco = setTimeout(() => {
    if (Panel.sec === 'documentos') return;
    if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if ($a('#ficha') && !$a('#ficha').hidden) return;
    const propio = mov && Panel.admin && mov.actor_id === Panel.admin.id;
    if (!propio) {
      brindis((mov && mov.resumen) ? mov.resumen : 'Hay movimiento nuevo en la app');
    }
    pintarSeccion({ silencioso: true });
  }, 400);
}


/* ══════════════════════════════════════════════════════════
   1b · ACTIVIDAD — bitácora
   ══════════════════════════════════════════════════════════ */

const FILTROS_M = { origen: '', grupo: '', q: '', fino: false };

const GRUPO_TABLAS = {
  usuarios:    ['perfiles'],
  pedidos:     ['pedidos'],
  matches:     ['matches'],
  chats:       ['mensajes'],
  trabajos:    ['trabajos', 'calificaciones'],
  anuncios:    ['anunciantes', 'contratos_publicidad', 'interstitials', 'canjes'],
  moderacion:  ['denuncias', 'interes_plan']
};

const TIPO_MOV = {
  admin: 'Panel',
  cliente: 'Cliente',
  pro: 'Profesional',
  sistema: 'Sistema'
};

function etiquetaDia(f) {
  const d = new Date(f);
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const mismo = (a, b) => a.toDateString() === b.toDateString();
  if (mismo(d, hoy)) return 'Hoy';
  if (mismo(d, ayer)) return 'Ayer';
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function horaMov(f) {
  return new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

async function verActividad() {
  let q = sb.from('movimientos')
    .select('*')
    .gte('cuando', desde(Panel.dias))
    .order('cuando', { ascending: false })
    .limit(400);

  if (FILTROS_M.origen) q = q.eq('actor_tipo', FILTROS_M.origen);
  if (FILTROS_M.grupo && GRUPO_TABLAS[FILTROS_M.grupo]) {
    q = q.in('tabla', GRUPO_TABLAS[FILTROS_M.grupo]);
  }

  const { data, error } = await q;
  if (error) throw error;

  const texto = (FILTROS_M.q || '').trim().toLowerCase();
  let filas = data || [];
  if (!FILTROS_M.fino) {
    filas = filas.filter(m => m.tabla !== 'mensajes' && m.tabla !== 'deslizamientos');
  }
  if (texto) {
    filas = filas.filter(m =>
      (m.resumen || '').toLowerCase().includes(texto) ||
      (m.actor_nombre || '').toLowerCase().includes(texto));
  }

  const grupos = [];
  filas.forEach(m => {
    const dia = etiquetaDia(m.cuando);
    const ultimo = grupos[grupos.length - 1];
    if (!ultimo || ultimo.dia !== dia) grupos.push({ dia, items: [m] });
    else ultimo.items.push(m);
  });

  const opciones = (lista, valor, todos) =>
    `<option value="">${todos}</option>` +
    lista.map(x => `<option value="${esc(x.id)}" ${valor === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('');

  $a('#cuerpo').innerHTML = `
    <div class="filtros">
      <select id="mOrigen">${opciones([
        { id: 'admin', nombre: 'Del panel' },
        { id: 'cliente', nombre: 'Clientes' },
        { id: 'pro', nombre: 'Profesionales' },
        { id: 'sistema', nombre: 'Sistema' }
      ], FILTROS_M.origen, 'Todos los orígenes')}</select>
      <select id="mGrupo">${opciones([
        { id: 'usuarios', nombre: 'Usuarios' },
        { id: 'pedidos', nombre: 'Pedidos' },
        { id: 'matches', nombre: 'Matches' },
        { id: 'trabajos', nombre: 'Trabajos y reseñas' },
        { id: 'anuncios', nombre: 'Anuncios y creativos' },
        { id: 'moderacion', nombre: 'Moderación y planes' },
        { id: 'chats', nombre: 'Chats' }
      ], FILTROS_M.grupo, 'Todo tipo')}</select>
      <input type="search" id="mQ" placeholder="Buscar persona o acción" value="${esc(FILTROS_M.q)}">
      <label class="filtro-check">
        <input type="checkbox" id="mFino" ${FILTROS_M.fino ? 'checked' : ''}>
        Incluir chats y deslizamientos
      </label>
      <span class="filtros-conteo">${num(filas.length)} movimiento${filas.length === 1 ? '' : 's'}</span>
    </div>

    ${filas.length ? grupos.map(g => `
      <div class="mov-dia">
        <h3>${esc(g.dia)}</h3>
        ${g.items.map(m => `
          <article class="mov-fila ${m.actor_tipo === 'admin' ? 'mov-admin' : ''}">
            <time datetime="${esc(m.cuando)}">${esc(horaMov(m.cuando))}</time>
            <span class="persona-avatar mov-avatar">${esc(iniciales(m.actor_nombre))}</span>
            <div class="mov-cuerpo">
              <div class="mov-quien">
                <b>${esc(m.actor_nombre || 'Sistema')}</b>
                <span class="pildora ${m.actor_tipo === 'admin' ? 'p-ambar' : m.actor_tipo === 'pro' ? 'p-verde' : 'p-gris'}">${esc(TIPO_MOV[m.actor_tipo] || m.actor_tipo)}</span>
              </div>
              <p>${esc(m.resumen)}</p>
            </div>
          </article>`).join('')}
      </div>`).join('') : `
    <div class="vacio-admin">
      <h3>No hay movimientos en este período</h3>
      <p>Cuando alguien se registre, publique un pedido, haga match o vos edites un creativo, va a aparecer acá con el nombre, la acción y la hora.</p>
    </div>`}`;

  const enlazar = (id, campo) => {
    const el = $a(id);
    if (!el) return;
    el.addEventListener('change', () => { FILTROS_M[campo] = el.type === 'checkbox' ? el.checked : el.value; verActividad(); });
  };
  enlazar('#mOrigen', 'origen');
  enlazar('#mGrupo', 'grupo');
  enlazar('#mFino', 'fino');
  const buscador = $a('#mQ');
  if (buscador) {
    buscador.addEventListener('input', () => {
      FILTROS_M.q = buscador.value;
      clearTimeout(verActividad._t);
      verActividad._t = setTimeout(() => verActividad(), 280);
    });
  }
}


/* ══════════════════════════════════════════════════════════
   1 · RESUMEN
   ══════════════════════════════════════════════════════════ */

async function contar(tabla, campoFecha, dias, extra) {
  let q = sb.from(tabla).select('*', { count: 'exact', head: true });
  if (dias) q = q.gte(campoFecha, desde(dias));
  if (extra) q = extra(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

// Compara el período actual contra el anterior de la misma extensión.
async function conVariacion(tabla, campoFecha, extra) {
  const d = Panel.dias;
  const ahora = await contar(tabla, campoFecha, d, extra);

  let q = sb.from(tabla).select('*', { count: 'exact', head: true })
    .gte(campoFecha, desde(d * 2)).lt(campoFecha, desde(d));
  if (extra) q = extra(q);
  const { count: antes } = await q;

  const delta = antes ? Math.round(((ahora - (antes || 0)) / antes) * 100) : null;
  return { ahora, delta };
}

function tarjetaMetrica(rotulo, valor, delta, nota) {
  const signo = delta === null ? ''
    : `<span class="metrica-delta ${delta >= 0 ? 'sube' : 'baja'}">${delta >= 0 ? '+' : '−'}${Math.abs(delta)}%</span>`;
  return `<div class="metrica-admin">
    <div class="metrica-rotulo">${esc(rotulo)}</div>
    <div class="metrica-valor">${valor}</div>
    <div class="metrica-pie">${signo}<span class="metrica-nota">${esc(nota)}</span></div>
  </div>`;
}

async function verResumen() {
  const [altas, pedidos, matches, trabajos, califs] = await Promise.all([
    conVariacion('perfiles', 'creado_en'),
    conVariacion('pedidos', 'creado_en'),
    conVariacion('matches', 'creado_en'),
    conVariacion('trabajos', 'creado_en', q => q.eq('estado', 'terminado')),
    conVariacion('calificaciones', 'creado_en')
  ]);

  const { count: clientes } = await sb.from('perfiles')
    .select('*', { count: 'exact', head: true }).eq('rol', 'cliente');
  const { count: pros } = await sb.from('perfiles')
    .select('*', { count: 'exact', head: true }).eq('rol', 'pro');

  const { data: notas } = await sb.from('calificaciones')
    .select('puntaje').gte('creado_en', desde(Panel.dias));
  const promedio = notas && notas.length
    ? (notas.reduce((a, c) => a + Number(c.puntaje || 0), 0) / notas.length).toFixed(1).replace('.', ',')
    : '—';

  const porPedido = pedidos.ahora ? (matches.ahora / pedidos.ahora).toFixed(1).replace('.', ',') : '0';
  const totalUsuarios = (clientes || 0) + (pros || 0);
  const porcPro = totalUsuarios ? Math.round((pros / totalUsuarios) * 100) : 0;

  // Cortes por localidad y por rubro, sobre los pedidos del período.
  const { data: filasPedidos } = await sb.from('pedidos')
    .select('localidad,rubro').gte('creado_en', desde(Panel.dias));

  const porLoc = {}, porRub = {};
  (filasPedidos || []).forEach(p => {
    porLoc[p.localidad] = (porLoc[p.localidad] || 0) + 1;
    porRub[p.rubro] = (porRub[p.rubro] || 0) + 1;
  });

  const locOrden = Object.entries(porLoc).sort((a, b) => b[1] - a[1]);
  const maxLoc = locOrden.length ? locOrden[0][1] : 1;

  $a('#cuerpo').innerHTML = `
    <div class="metricas-admin">
      ${tarjetaMetrica('Altas de usuarios', num(altas.ahora), altas.delta, 'vs. período anterior')}
      ${tarjetaMetrica('Clientes / profesionales', `${num(clientes)} / ${num(pros)}`, null, `${porcPro}% son profesionales`)}
      ${tarjetaMetrica('Pedidos publicados', num(pedidos.ahora), pedidos.delta, 'en el período')}
      ${tarjetaMetrica('Matches generados', num(matches.ahora), matches.delta, `${porPedido} por pedido`)}
      ${tarjetaMetrica('Trabajos terminados', num(trabajos.ahora), trabajos.delta, 'cerrados por las dos partes')}
      ${tarjetaMetrica('Calificaciones', num(califs.ahora), califs.delta, `promedio ${promedio}`)}
    </div>

    <div class="paneles-2">
      <div class="metrica-admin">
        <div class="panel-titulo">Actividad por localidad</div>
        ${locOrden.length ? locOrden.map(([loc, n]) => `
          <div class="barra-fila">
            <div class="barra-nombre">${esc(loc)}</div>
            <div class="barra-riel"><div class="barra-relleno" style="width:${(n / maxLoc) * 100}%"></div></div>
            <div class="barra-valor">${n}</div>
          </div>`).join('')
        : '<p class="metrica-nota">Todavía no hay pedidos en este período.</p>'}
      </div>

      <div class="metrica-admin">
        <div class="panel-titulo">Por rubro</div>
        ${Object.entries(porRub).sort((a, b) => b[1] - a[1]).map(([r, n]) => `
          <div class="rubro-fila"><span>${esc(nombreRubro(r))}</span><span>${n}</span></div>`).join('')
        || '<p class="metrica-nota">Sin datos en este período.</p>'}
      </div>
    </div>`;
}


/* ══════════════════════════════════════════════════════════
   2 · USUARIOS
   ══════════════════════════════════════════════════════════ */

const FILTROS_U = { rol: '', localidad: '', rubro: '', plan: '', puntaje: '', q: '', conexion: '' };
const NOMBRE_PLAN = { gratis: 'Gratis Verificado', verificado: 'Gratis Verificado', pro: 'Pro' };
const EN_APP_MS = 90000;

const COLS_USUARIO = 'id,nombre,foto_url,rol,localidad,rubro,plan,puntaje_pro,puntaje_cliente,verificacion,creado_en,trabajos,contrataciones,suspendido,eliminado_en,app_instalada_en,uso_activado,uso_activado_en';

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
  if (FILTROS_U.plan && u.plan !== FILTROS_U.plan) return false;
  if (FILTROS_U.puntaje === 'alto' && !(Number(u.puntaje_pro) >= 4.5)) return false;
  if (FILTROS_U.puntaje === 'bajo' && !(Number(u.puntaje_pro) < 3)) return false;
  if (FILTROS_U.conexion === 'en_app' && !u._enApp) return false;
  if (FILTROS_U.conexion === 'instalada' && !u._instalada) return false;
  if (FILTROS_U.conexion === 'sin_instalar' && u._instalada) return false;
  if (FILTROS_U.conexion === 'sin_activar' && u.uso_activado !== false) return false;
  if (FILTROS_U.conexion === 'suspendidos' && !u.suspendido) return false;
  return true;
}

async function traerPerfilesAdmin() {
  const { data: rpc, error: eRpc } = await sb.rpc('admin_listar_usuarios');
  if (!eRpc && rpc != null) {
    const filas = Array.isArray(rpc) ? rpc : [];
    return { todas: filas, via: 'rpc' };
  }

  let q = sb.from('perfiles')
    .select(COLS_USUARIO, { count: 'exact' })
    .order('creado_en', { ascending: false })
    .limit(200);

  if (FILTROS_U.q) q = q.ilike('nombre', '%' + FILTROS_U.q + '%');
  if (FILTROS_U.rol) q = q.eq('rol', FILTROS_U.rol);
  if (FILTROS_U.localidad) q = q.eq('localidad', FILTROS_U.localidad);
  if (FILTROS_U.rubro) q = q.eq('rubro', FILTROS_U.rubro);
  if (FILTROS_U.plan) q = q.eq('plan', FILTROS_U.plan);
  if (FILTROS_U.puntaje === 'alto') q = q.gte('puntaje_pro', 4.5);
  if (FILTROS_U.puntaje === 'bajo') q = q.lt('puntaje_pro', 3);

  const { data: filas, count, error } = await q;
  if (error) throw error;
  return { todas: filas || [], count, via: 'tabla' };
}

async function traerPresenciaAdmin() {
  const m = new Map();
  const { data, error } = await sb.rpc('admin_presencia');
  if (error || !data) return m;
  (data || []).forEach(x => {
    if (x && x.usuario_id && x.visto_en) m.set(x.usuario_id, x.visto_en);
  });
  return m;
}

async function traerInstalacionesAdmin() {
  const { data, error } = await sb.rpc('admin_instalaciones');
  if (error || !data) return new Map();
  const m = new Map();
  (data || []).forEach(x => {
    if (x && x.usuario_id && x.instalada_en) m.set(x.usuario_id, x.instalada_en);
  });
  return m;
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
  const count = traido.via === 'rpc' ? todas.length : (traido.count ?? todas.length);
  const nEnApp = todas.filter(u => u._enApp).length;
  const nInstalada = todas.filter(u => u._instalada).length;

  const opciones = (lista, valor, todos) =>
    `<option value="">${todos}</option>` +
    lista.map(x => `<option value="${esc(x.id ?? x)}" ${valor === (x.id ?? x) ? 'selected' : ''}>${esc(x.nombre ?? x)}</option>`).join('');

  const cols = '2fr minmax(0,1fr) 1.2fr minmax(0,1fr) 80px 90px 150px';

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
      <span class="filtros-conteo">${num(filas.length)} de ${num(count)} · ${num(nEnApp)} en la app · ${num(nInstalada)} la descargaron</span>
    </div>

    ${filas.length ? `
    <div class="tabla">
      <div class="tabla-encabezado" style="grid-template-columns:${cols}">
        <div>Persona</div><div>Rol</div><div>Localidad</div><div>Rubro</div>
        <div>Plan</div><div>Puntaje</div><div>Acciones</div>
      </div>
      ${filas.map(u => {
        const activa = u.uso_activado !== false;
        const p = u.rol === 'pro' ? u.puntaje_pro : u.puntaje_cliente;
        return `
        <div class="tabla-fila" style="grid-template-columns:${cols}" data-usuario="${esc(u.id)}">
          <div class="persona">
            <span class="persona-avatar">${u.foto_url ? `<img src="${esc(u.foto_url)}" alt="">` : esc(iniciales(u.nombre))}</span>
            <span class="celda-corta">
              <div class="persona-nombre celda-corta">${esc(nombreAdmin(u))}${u._enApp ? '<span class="punto-en-app" title="Tiene la app abierta"></span>' : ''}${u.suspendido ? ' <span class="pildora p-coral">Suspendido</span>' : ''}${activa ? '' : ' <span class="pildora p-gris">Sin activar</span>'} <span class="pildora ${u._instalada ? 'p-verde' : 'p-gris'}">${u._instalada ? 'Descargó' : 'Sin descargar'}</span></div>
              <div class="persona-fecha">${esc(textoConexion(u))}${u.correo ? ' · ' + esc(u.correo) : ''}${u.whatsapp ? ' · ' + esc(u.whatsapp) : ''}</div>
            </span>
          </div>
          <div class="celda-corta">${u.rol === 'pro' ? 'Profesional' : 'Cliente'}</div>
          <div class="celda-corta">${esc(u.localidad || '—')}</div>
          <div class="celda-corta">${esc(u.rubro || '—')}</div>
          <div><span class="pildora ${u.plan === 'pro' ? 'p-ambar' : 'p-gris'}">${esc(NOMBRE_PLAN[u.plan] || u.plan || 'Gratis Verificado')}</span></div>
          <div class="dato-mono">${p != null ? Number(p).toFixed(1).replace('.', ',') : '—'}</div>
          <div class="acciones-celda">
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
      <h3>${hayFiltrosU() ? 'Ningún usuario coincide con estos filtros' : 'No hay usuarios para mostrar'}</h3>
      <p>${hayFiltrosU()
        ? 'Probá sacar el filtro de plan o ampliar la localidad.'
        : 'Si hay gente registrada y acá no aparece, hay que correr el SQL de listar usuarios en el editor de Supabase. Eso le da permiso al panel para ver a todos, no solo tu propia cuenta.'}</p>
      ${hayFiltrosU() ? '<button class="btn-admin" id="limpiarFiltros">Limpiar filtros</button>' : ''}
    </div>`}`;

  const enlazar = (id, campo) => {
    const el = $a(id);
    if (el) el.addEventListener('change', () => { FILTROS_U[campo] = el.value; verUsuarios(); });
  };
  enlazar('#fRol', 'rol'); enlazar('#fLoc', 'localidad'); enlazar('#fRub', 'rubro');
  enlazar('#fPlan', 'plan'); enlazar('#fPun', 'puntaje');
  const buscar = $a('#fBuscar');
  if (buscar) {
    buscar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(busquedaUTimer);
        focoBuscarU = true;
        FILTROS_U.q = buscar.value.trim();
        verUsuarios();
      }
    });
    buscar.addEventListener('input', () => {
      clearTimeout(busquedaUTimer);
      focoBuscarU = true;
      busquedaUTimer = setTimeout(() => {
        FILTROS_U.q = ($a('#fBuscar')?.value || '').trim();
        verUsuarios();
      }, 280);
    });
    if (focoBuscarU) {
      buscar.focus();
      const n = buscar.value.length;
      try { buscar.setSelectionRange(n, n); } catch {}
      focoBuscarU = false;
    }
  }

  if ($a('#limpiarFiltros')) $a('#limpiarFiltros').addEventListener('click', () => {
    Object.keys(FILTROS_U).forEach(k => FILTROS_U[k] = '');
    verUsuarios();
  });
  // q ya se limpia con el resto de FILTROS_U

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

  document.querySelectorAll('[data-usuario]').forEach(f => {
    f.addEventListener('click', () => {
      const u = filas.find(x => x.id === f.dataset.usuario);
      if (u) fichaUsuario(u);
    });
  });
}

// Va por función y no escribiendo la tabla directo: 'verificacion' es un
// campo protegido y el trigger revierte cualquier escritura que venga de
// la app. Antes esto parecía funcionar y no cambiaba nada.
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
  verUsuarios();
  return true;
}

async function activarUso(id, yaEsta) {
  const { error } = await sb.rpc('admin_activar_uso', {
    p_usuario: id, p_poner: !yaEsta
  });
  if (error) { brindis('No se pudo: ' + error.message); return; }

  brindis(yaEsta ? 'Se le quitó el acceso' : 'Cuenta activada y verificada');
  verUsuarios();
}

async function alternarVerificacion(id, yaEsta) {
  await activarUso(id, yaEsta);
}

function fichaUsuario(u) {
  const activa = u.uso_activado !== false;
  const wa = (u.whatsapp || '').replace(/\D/g, '');
  abrirFicha({
    rotulo: 'Ficha de usuario',
    titulo: nombreAdmin(u),
    sub: `${u.suspendido ? 'SUSPENDIDO · ' : ''}${u.rol === 'pro' ? 'Profesional' : 'Cliente'} · ${u.localidad || 'Sin zona'}`,
    html: `<div class="campo-admin" style="margin:0">
      <span>WhatsApp</span>
      <input id="fWa" value="${esc(u.whatsapp || '')}" placeholder="549…" inputmode="tel">
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn-admin" id="fWaGuardar" type="button">Guardar número</button>
        ${wa ? `<a class="btn-admin-sec" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener noreferrer">Escribirle</a>` : ''}
      </div>
    </div>`,
    datos: [
      ['Plan', NOMBRE_PLAN[u.plan] || u.plan || 'Gratis Verificado'],
      ['Puntaje profesional', u.puntaje_pro != null ? Number(u.puntaje_pro).toFixed(1).replace('.', ',') : '—'],
      ['Puntaje cliente', u.puntaje_cliente != null ? Number(u.puntaje_cliente).toFixed(1).replace('.', ',') : '—'],
      ['Trabajos', num(u.trabajos)],
      ['Contrataciones', num(u.contrataciones)],
      ['Correo', u.correo || '—'],
      ['WhatsApp', u.whatsapp || 'Sin número'],
      ['Foto real', u.foto_url ? 'Sí' : 'No'],
      ['Uso', activa ? 'Activado y verificado' : 'SIN ACTIVAR'],
      ['Estado', u.suspendido ? 'SUSPENDIDA' : (u.eliminado_en ? 'Eliminada' : 'Activa')],
      ...(u.suspendido && u.suspendido_motivo ? [['Motivo de suspensión', u.suspendido_motivo]] : []),
      ['Última conexión', u._enApp
        ? ('En la app ahora' + (u._vistoEn ? ' · latido ' + fechaHora(u._vistoEn) : ''))
        : (u._vistoEn ? (fechaHora(u._vistoEn) + ' · ' + hace(u._vistoEn)) : 'Nunca se registró. Aparece cuando abre la app.')],
      ['App descargada', u._instalada
        ? ('Sí. Abrió Contratá Ya desde el ícono del teléfono' + (u._instaladaEn ? ' · ' + fechaLarga(u._instaladaEn) : ''))
        : 'No. Nunca la abrió desde el ícono (Safari o Chrome no cuenta)'],
      ['Alta', fechaLarga(u.creado_en)]
    ],
    acciones: [
      { texto: activa ? 'Quitar acceso' : 'Activar y verificar', clase: 'btn-admin',
        accion: () => activarUso(u.id, activa).then(cerrarFicha) },
      ...(u.suspendido ? [{ texto: 'Levantar la suspensión', clase: 'btn-admin',
        accion: async () => {
          const { error } = await sb.rpc('levantar_suspension', { p_usuario: u.id });
          if (error) { brindis(error.message || 'No se pudo'); return; }
          cerrarFicha();
          brindis('Suspensión levantada');
          verUsuarios();
        } }] : (u.id === Panel.admin.id ? [] : [{ texto: 'Suspender esta cuenta', clase: 'btn-admin-mal',
        accion: () => suspenderUsuario(u.id, nombreAdmin(u), true)
      }])),
      { texto: u.plan === 'pro' ? 'Volverlo a Gratis Verificado' : 'Activarle el plan Pro',
        clase: 'btn-admin-sec',
        accion: async () => {
          const { error } = await sb.rpc('activar_plan', {
            p_usuario: u.id, p_plan: u.plan === 'pro' ? 'gratis' : 'pro'
          });
          if (error) { brindis(error.message || 'No se pudo'); return; }
          cerrarFicha();
          brindis('Plan actualizado');
          verUsuarios();
        } },
      ...(u.id === Panel.admin.id ? [] : [{
        texto: 'Borrar esta cuenta', clase: 'btn-admin-mal',
        accion: async () => {
          const quien = u.nombre || 'esta persona';
          if (!confirm(`¿Borrar a ${quien}?\n\nSe va la cuenta, el perfil y el acceso. No se puede deshacer.`)) return;
          const { error } = await sb.rpc('admin_borrar_usuario', { p_usuario: u.id });
          if (error) { brindis(error.message || 'No se pudo borrar'); return; }
          cerrarFicha();
          brindis('Cuenta borrada');
          verUsuarios();
        }
      }])
    ]
  });

  const btnWa = $a('#fWaGuardar');
  if (btnWa) {
    btnWa.addEventListener('click', async () => {
      const tel = ($a('#fWa') && $a('#fWa').value) || '';
      btnWa.disabled = true;
      const { data, error } = await sb.rpc('admin_guardar_whatsapp', {
        p_usuario: u.id, p_telefono: tel
      });
      btnWa.disabled = false;
      if (error) { brindis(error.message || 'No se pudo guardar'); return; }
      u.whatsapp = data && data.whatsapp ? data.whatsapp : '';
      brindis(u.whatsapp ? 'WhatsApp guardado' : 'Número borrado');
      fichaUsuario(u);
    });
  }
}


/* ══════════════════════════════════════════════════════════
   2b · PLANES
   ══════════════════════════════════════════════════════════ */

async function verPlanesPendientes() {
  const { data: filas, error } = await sb.rpc('intereses_pendientes');
  if (error) throw error;

  const cols = '2fr 1.2fr 1.2fr 1fr 1fr 150px';

  $a('#cuerpo').innerHTML = (filas && filas.length) ? `
    <div class="tabla">
      <div class="tabla-encabezado" style="grid-template-columns:${cols}">
        <div>Persona</div><div>Rubro</div><div>Localidad</div>
        <div>Tiene</div><div>Quiere</div><div>Acciones</div>
      </div>
      ${filas.map(f => `
        <div class="tabla-fila" style="grid-template-columns:${cols}">
          <div class="persona">
            <span class="persona-avatar">${esc(iniciales(f.nombre))}</span>
            <span class="celda-corta">
              <div class="persona-nombre celda-corta">${esc(f.nombre || 'Sin nombre')}</div>
              <div class="persona-fecha">${fechaCorta(f.creado_en)} · ${num(f.trabajos)} trabajos</div>
            </span>
          </div>
          <div class="celda-corta">${esc(f.rubro || '—')}</div>
          <div class="celda-corta">${esc(f.localidad || '—')}</div>
          <div><span class="pildora p-gris">${esc(NOMBRE_PLAN[f.plan_actual] || f.plan_actual)}</span></div>
          <div><span class="pildora p-ambar">${esc(NOMBRE_PLAN[f.plan] || f.plan)}</span></div>
          <div class="acciones-celda">
            <button class="btn-mini btn-mini-si" data-activar="${esc(f.usuario_id)}" data-plan="${esc(f.plan)}">Activar</button>
            <button class="btn-mini btn-mini-mal" data-descartar="${esc(f.id)}">Descartar</button>
          </div>
        </div>`).join('')}
    </div>` : `
    <div class="vacio-admin">
      <h3>Nadie pidió cambiar de plan</h3>
      <p>El Pro se pide por WhatsApp. Si anotás uno a mano o llega un interés viejo, aparece acá. El plan lo activás vos desde la ficha del usuario.</p>
    </div>`;

  document.querySelectorAll('[data-activar]').forEach(b => {
    b.addEventListener('click', async () => {
      b.disabled = true;
      const { error } = await sb.rpc('activar_plan', {
        p_usuario: b.dataset.activar, p_plan: b.dataset.plan
      });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      brindis('Plan activado');
      verPlanesPendientes();
    });
  });

  document.querySelectorAll('[data-descartar]').forEach(b => {
    b.addEventListener('click', async () => {
      const { error } = await sb.from('interes_plan')
        .update({ estado: 'descartado', cerrado_en: new Date().toISOString() })
        .eq('id', b.dataset.descartar);
      if (error) { brindis(error.message || 'No se pudo'); return; }
      verPlanesPendientes();
    });
  });
}


/* ══════════════════════════════════════════════════════════
   3 · PEDIDOS
   ══════════════════════════════════════════════════════════ */

async function verPedidos() {
  const { data: filas, error } = await sb.from('pedidos')
    .select('*, cliente:perfiles!cliente_id(nombre)')
    .eq('estado', 'abierto')
    .order('creado_en', { ascending: false })
    .limit(200);
  if (error) throw error;

  const cols = 'minmax(0,1.1fr) minmax(0,1.2fr) 110px minmax(0,1.4fr) 110px 120px 110px';

  $a('#cuerpo').innerHTML = filas.length ? `
    <div class="tabla">
      <div class="tabla-encabezado" style="grid-template-columns:${cols}">
        <div>Rubro</div><div>Localidad</div><div>Urgencia</div>
        <div>Autor</div><div>Estado</div><div>Fecha</div><div>Acciones</div>
      </div>
      ${filas.map(p => `
        <div class="tabla-fila" style="grid-template-columns:${cols}" data-pedido="${esc(p.id)}">
          <div class="celda-corta">${esc(nombreRubro(p.rubro))}</div>
          <div class="celda-corta">${esc(p.localidad)}</div>
          <div><span class="pildora ${p.urgencia === 'urgente' ? 'p-coral' : 'p-gris'}">${esc(p.urgencia || 'normal')}</span></div>
          <div class="celda-corta">${esc(p.cliente?.nombre || '—')}</div>
          <div><span class="pildora ${p.estado === 'abierto' ? 'p-ambar' : 'p-gris'}">${esc(p.estado)}</span></div>
          <div class="dato-mono">${fechaCorta(p.creado_en)}</div>
          <div class="acciones-celda">
            <button class="btn-mini btn-mini-mal" data-cerrar-pedido="${esc(p.id)}">Eliminar</button>
          </div>
        </div>`).join('')}
    </div>` : `
    <div class="vacio-admin">
      <h3>Todavía no hay pedidos</h3>
      <p>Cuando un cliente publique lo que necesita, va a aparecer acá con su rubro, su localidad y su urgencia.</p>
    </div>`;

  document.querySelectorAll('[data-cerrar-pedido]').forEach(b => {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const p = filas.find(x => x.id === b.dataset.cerrarPedido);
      if (p) await cerrarPedido(p);
    });
  });

  document.querySelectorAll('[data-pedido]').forEach(f => {
    f.addEventListener('click', () => {
      const p = filas.find(x => x.id === f.dataset.pedido);
      if (p) fichaPedido(p);
    });
  });
}

function fichaPedido(p) {
  const abierto = p.estado === 'abierto';
  abrirFicha({
    rotulo: 'Pedido',
    titulo: nombreRubro(p.rubro),
    sub: (p.localidad || 'Sin localidad') + ' · ' + (p.cliente?.nombre || 'Sin autor'),
    datos: [
      ['Estado', p.estado || '—'],
      ['Urgencia', p.urgencia || '—'],
      ['Autor', p.cliente?.nombre || '—'],
      ['Publicado', fechaCorta(p.creado_en)],
      ['Detalle', p.detalle || '—'],
      ['Presupuesto', p.presupuesto || '—']
    ],
    acciones: abierto
      ? [{ texto: 'Eliminar este pedido', clase: 'btn-admin-mal', accion: () => cerrarPedido(p) }]
      : []
  });
}

async function cerrarPedido(p) {
  if (p.estado !== 'abierto') { brindis('Este pedido ya no está abierto'); return; }
  if (!confirm(
    '¿Eliminar este pedido?\n\n' + nombreRubro(p.rubro) + ' · ' + (p.localidad || 'sin zona') + '\n' + (p.cliente?.nombre || 'Sin autor') + '\n\nDeja de verse en el mazo y en este listado.'
  )) return;

  const { data, error: eRpc } = await sb.rpc('admin_cerrar_pedido', { p_pedido: p.id });
  if (!eRpc) {
    cerrarFicha();
    brindis(data && data.modo === 'cerrado'
      ? 'Pedido cerrado. Tenía matches: el chat queda, no sale más en el mazo ni acá.'
      : 'Pedido eliminado.');
    verPedidos();
    return;
  }

  const { error: eDel } = await sb.from('pedidos').delete().eq('id', p.id);
  if (!eDel) {
    cerrarFicha();
    brindis('Pedido eliminado.');
    verPedidos();
    return;
  }

  const { error: eUpd } = await sb.from('pedidos')
    .update({ estado: 'cerrado' })
    .eq('id', p.id)
    .eq('estado', 'abierto');
  if (!eUpd) {
    cerrarFicha();
    brindis('Pedido cerrado. Ya no sale en el mazo ni acá.');
    verPedidos();
    return;
  }

  brindis(eRpc.message || eDel.message || eUpd.message || 'No se pudo eliminar');
}


/* ══════════════════════════════════════════════════════════
   4 · TRABAJOS Y CHATS
   ══════════════════════════════════════════════════════════ */

const ESTADO_TRABAJO = {
  propuesto: ['p-ambar', 'Esperando confirmación'],
  en_curso:  ['p-verde', 'En curso'],
  terminado: ['p-gris', 'Terminado'],
  cancelado: ['p-coral', 'Cancelado']
};

async function verTrabajos() {
  const { data: filas, error } = await sb.from('trabajos')
    .select('*, match:matches!match_id(cliente:perfiles!cliente_id(nombre), profesional:perfiles!profesional_id(nombre))')
    .order('creado_en', { ascending: false })
    .limit(120);
  if (error) throw error;

  const cols = 'minmax(0,1fr) minmax(0,1fr) 150px 110px';

  $a('#cuerpo').innerHTML = filas.length ? `
    <div class="trabajos-2">
      <div class="tabla">
        <div class="tabla-encabezado" style="grid-template-columns:${cols}">
          <div>Cliente</div><div>Profesional</div><div>Estado</div><div>Trabajo</div>
        </div>
        ${filas.map(t => {
          const [clase, texto] = ESTADO_TRABAJO[t.estado] || ['p-gris', t.estado];
          return `
          <div class="tabla-fila" style="grid-template-columns:${cols}" data-trabajo="${esc(t.id)}">
            <div class="celda-corta">${esc(t.match?.cliente?.nombre || '—')}</div>
            <div class="celda-corta">${esc(t.match?.profesional?.nombre || '—')}</div>
            <div><span class="pildora ${clase}">${esc(texto)}</span></div>
            <div class="dato-mono">Nº ${t.numero}</div>
          </div>`;
        }).join('')}
      </div>

      <div class="charla" id="charla">
        <div class="charla-cabeza"><span>Conversación</span><b>Sólo lectura</b></div>
        <div class="charla-cuerpo" id="charlaCuerpo">
          <p class="metrica-nota">Elegí un trabajo de la izquierda para leer el chat.</p>
        </div>
      </div>
    </div>` : `
    <div class="vacio-admin">
      <h3>Todavía no hay trabajos</h3>
      <p>Cada match abre un trabajo. Cuando alguien haga el primero, vas a poder seguir la conversación desde acá.</p>
    </div>`;

  document.querySelectorAll('[data-trabajo]').forEach(f => {
    f.addEventListener('click', () => {
      const t = filas.find(x => x.id === f.dataset.trabajo);
      if (t) { verCharla(t); fichaTrabajo(t); }
    });
  });
}

async function verCharla(t) {
  const cont = $a('#charlaCuerpo');
  if (!cont) return;
  cont.innerHTML = '<p class="metrica-nota">Cargando…</p>';

  const { data: msgs } = await sb.from('mensajes')
    .select('autor_id,texto,creado_en')
    .eq('trabajo_id', t.id)
    .order('creado_en', { ascending: true });

  if (!msgs || !msgs.length) {
    cont.innerHTML = '<p class="metrica-nota">No hay mensajes en este trabajo.</p>';
    return;
  }

  const { data: m } = await sb.from('matches')
    .select('cliente_id').eq('id', t.match_id).maybeSingle();

  cont.innerHTML = msgs.map(x => {
    const esCliente = x.autor_id === m?.cliente_id;
    const quien = esCliente ? (t.match?.cliente?.nombre || 'Cliente') : (t.match?.profesional?.nombre || 'Profesional');
    return `<div class="burbuja ${esCliente ? 'b-cliente' : 'b-pro'}">
      <div class="burbuja-autor">${esc(quien)}</div>
      <p>${esc(x.texto)}</p>
    </div>`;
  }).join('');
  cont.scrollTop = cont.scrollHeight;
}

function fichaTrabajo(t) {
  const [, texto] = ESTADO_TRABAJO[t.estado] || ['', t.estado];
  abrirFicha({
    rotulo: 'Trabajo',
    titulo: `${t.match?.cliente?.nombre || '—'} · ${t.match?.profesional?.nombre || '—'}`,
    sub: t.detalle || 'Sin detalle cargado',
    datos: [
      ['Estado', texto],
      ['Número', 'Nº ' + t.numero],
      ['Abierto', fechaLarga(t.creado_en)],
      ['Fin del cliente', t.fin_cliente ? fechaLarga(t.fin_cliente) : 'Sin marcar'],
      ['Fin del profesional', t.fin_pro ? fechaLarga(t.fin_pro) : 'Sin marcar'],
      ['Terminado', t.terminado_en ? fechaLarga(t.terminado_en) : '—']
    ],
    acciones: []
  });
}


/* ══════════════════════════════════════════════════════════
   5 · CALIFICACIONES
   ══════════════════════════════════════════════════════════ */

async function verCalificaciones() {
  const { data: filas, error } = await sb.from('calificaciones')
    .select('*, destino:perfiles!destino_id(nombre,localidad)')
    .order('creado_en', { ascending: false })
    .limit(100);
  if (error) throw error;

  const conTexto = (filas || []).filter(c => c.texto);

  $a('#cuerpo').innerHTML = conTexto.length ? `
    <div class="resenas-lista">
      ${conTexto.map(c => {
        const bajo = Number(c.puntaje) < 3;
        return `
        <div class="resena-admin ${bajo ? 'resena-baja' : ''}">
          <div class="resena-cabeza-admin">
            <span class="puntaje-bloque ${bajo ? 'puntaje-bajo' : ''}">${Number(c.puntaje).toFixed(1).replace('.', ',')}</span>
            <div>
              <div style="font-weight:600">${esc(c.destino?.nombre || 'Sin nombre')}</div>
              <div class="persona-fecha">${esc(c.destino?.localidad || '')} · ${fechaCorta(c.creado_en)}</div>
            </div>
          </div>
          <p>${esc(c.texto)}</p>
          ${c.respuesta ? `<p style="margin-top:10px;padding-left:12px;border-left:2px solid var(--linea)"><b>Respuesta:</b> ${esc(c.respuesta)}</p>` : ''}
        </div>`;
      }).join('')}
    </div>` : `
    <div class="vacio-admin">
      <h3>Todavía no hay reseñas escritas</h3>
      <p>Las calificaciones sin comentario no se listan acá. Cuando alguien escriba algo, vas a poder leerlo y moderarlo.</p>
    </div>`;
}


/* ══════════════════════════════════════════════════════════
   6 · ANUNCIANTES — la vista clave
   ══════════════════════════════════════════════════════════ */

async function verAnunciantes() {
  const { data: contratos, error } = await sb.from('contratos_publicidad')
    .select('*, anunciante:anunciantes!anunciante_id(*)')
    .eq('estado', 'activo');   // trae también la llave, para el enlace de canje
  if (error) throw error;

  // La grilla completa se arma acá: todo lo que no vuelve de la base, está libre.
  const ocupados = {};
  (contratos || []).forEach(c => { ocupados[`${c.localidad}|${c.rubro}`] = c; });

  const totalCasilleros = LOCALIDADES.length * RUBROS_COMERCIO.length;
  const colsGrilla = `168px repeat(${RUBROS_COMERCIO.length}, minmax(108px, 1fr))`;
  let libres = 0, porVencer = 0, facturacion = 0;
  LOCALIDADES.forEach(loc => RUBROS_COMERCIO.forEach(r => {
    const c = ocupados[`${loc}|${r.id}`];
    if (!c) { libres++; return; }
    facturacion += Number(c.abono || 0);
    if (diasHasta(c.hasta) <= DIAS_POR_VENCER) porVencer++;
  }));

  const casillero = (loc, rubro) => {
    const c = ocupados[`${loc}|${rubro.id}`];
    if (!c) {
      return `<button class="casillero c-libre" data-libre="${esc(loc)}|${esc(rubro.id)}">
        <b>Libre</b><span>${pesos(ABONO_BASE)} / mes</span></button>`;
    }
    const dias = diasHasta(c.hasta);
    const vence = dias <= DIAS_POR_VENCER;
    return `<button class="casillero ${vence ? 'c-vence' : 'c-ocupado'}" data-contrato="${esc(c.id)}">
      <b>${esc(c.anunciante?.nombre || 'Sin nombre')}</b>
      <span>${vence ? 'Vence' : 'Hasta'} ${fechaLarga(c.hasta)}</span></button>`;
  };

  $a('#cuerpo').innerHTML = `
    <div class="resumen-anuncios">
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Casilleros libres</div>
        <div class="metrica-valor" style="color:var(--plomo)">${libres}<span class="sufijo"> / ${totalCasilleros}</span></div>
      </div>
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Vencen en ${DIAS_POR_VENCER} días</div>
        <div class="metrica-valor" style="color:var(--coral)">${porVencer}</div>
      </div>
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Facturación mensual</div>
        <div class="metrica-valor">${pesos(facturacion)}</div>
      </div>
      <div class="leyenda">
        <span><i class="l-ocupado"></i>Ocupado</span>
        <span><i class="l-vence"></i>Por vencer</span>
        <span><i class="l-libre"></i>Libre</span>
      </div>
    </div>

    <div class="grilla-anuncios">
      <div class="grilla-fila grilla-encabezado" style="grid-template-columns:${colsGrilla}">
        <div></div>
        ${RUBROS_COMERCIO.map(r => `<div>${esc(r.nombre.toUpperCase())}</div>`).join('')}
      </div>
      ${LOCALIDADES.map(loc => `
        <div class="grilla-fila" style="margin-bottom:8px;grid-template-columns:${colsGrilla}">
          <div class="grilla-localidad">${esc(loc)}</div>
          ${RUBROS_COMERCIO.map(r => casillero(loc, r)).join('')}
        </div>`).join('')}
    </div>

    <div id="sueltos"></div>`;

  await pintarSueltos();

  document.querySelectorAll('[data-libre]').forEach(b => {
    b.addEventListener('click', () => {
      const [loc, rubro] = b.dataset.libre.split('|');
      fichaCasilleroLibre(loc, rubro);
    });
  });

  document.querySelectorAll('[data-contrato]').forEach(b => {
    b.addEventListener('click', () => {
      const c = contratos.find(x => x.id === b.dataset.contrato);
      if (c) fichaContrato(c);
    });
  });
}

// Comercios sin casillero. Antes sólo se veían entrando a la base.
async function pintarSueltos() {
  const cont = document.getElementById('sueltos');
  if (!cont) return;

  const { data, error } = await sb.rpc('anunciantes_sueltos');
  if (error || !data || !data.length) { cont.innerHTML = ''; return; }

  cont.innerHTML = `
    <div class="metrica-admin" style="margin-top:16px;border-color:var(--coral)">
      <div class="panel-titulo">Comercios sin casillero</div>
      <p class="metrica-nota" style="margin-bottom:14px">
        Quedaron cargados pero no ocupan ninguna posición, así que no los ve nadie.
        Asignales un casillero o borralos.
      </p>
      ${data.map(a => `
        <div class="rubro-fila">
          <span>${esc(a.nombre)} · ${esc(RUBROS_COMERCIO.find(r => r.id === a.rubro)?.nombre || a.rubro)}</span>
          <span class="acciones-celda">
            <button class="btn-mini" data-asignar="${esc(a.id)}">Asignar</button>
            <button class="btn-mini btn-mini-mal" data-borrar="${esc(a.id)}" data-nombre="${esc(a.nombre)}">Borrar</button>
          </span>
        </div>`).join('')}
    </div>`;

  cont.querySelectorAll('[data-borrar]').forEach(b => {
    b.addEventListener('click', () => borrarAnunciante(b.dataset.borrar, b.dataset.nombre));
  });

  cont.querySelectorAll('[data-asignar]').forEach(b => {
    b.addEventListener('click', () => {
      const a = data.find(x => x.id === b.dataset.asignar);
      fichaAsignar(a);
    });
  });
}

function fichaAsignar(a) {
  const enUnAnio = new Date();
  enUnAnio.setFullYear(enUnAnio.getFullYear() + 1);

  abrirFicha({
    rotulo: 'Asignar casillero',
    titulo: a.nombre,
    sub: `${RUBROS_COMERCIO.find(r => r.id === a.rubro)?.nombre || a.rubro} · elegí en qué localidad va`,
    html: `
      <label class="campo-admin"><span>Localidad</span>
        <select id="aLoc">${LOCALIDADES.map(l => `<option>${esc(l)}</option>`).join('')}</select></label>
      <label class="campo-admin"><span>Abono mensual</span>
        <input id="aAbono" type="number" value="${ABONO_BASE}"></label>
      <label class="campo-admin"><span>Contrato hasta</span>
        <input id="aHasta" type="date" value="${enUnAnio.toISOString().slice(0, 10)}"></label>`,
    acciones: [
      { texto: 'Asignar', clase: 'btn-admin', accion: async () => {
          const { error } = await sb.rpc('asignar_casillero', {
            p_anunciante: a.id,
            p_localidad: $a('#aLoc').value,
            p_hasta: $a('#aHasta').value,
            p_abono: Number($a('#aAbono').value) || ABONO_BASE
          });
          if (error) { brindis(error.message || 'No se pudo asignar'); return; }
          cerrarFicha();
          brindis('Casillero asignado');
          verAnunciantes();
        } }
    ]
  });
}


/* ── Imagen del cartel ───────────────────────────────────────
   El cartel es una franja apaisada, y las imágenes que manda un
   comercio vienen de cualquier forma: un logo cuadrado, una foto
   del local horizontal, una captura vertical de Instagram.

   Por eso hay dos modos y no uno solo. En un logo, recortar al
   centro suele comerse justo lo que hay que conservar; en una
   foto del local, en cambio, llenar la franja queda mucho mejor
   que dejar dos franjas de fondo a los costados.
   ─────────────────────────────────────────────────────────── */

const CARTEL_ANCHO = 960;
const CARTEL_ALTO  = 240;    // 4:1, la proporción de la franja

async function abrirImagenAnuncio(archivo) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(archivo); } catch (e) { /* seguimos */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir esa imagen')); };
    img.src = url;
  });
}

// modo 'llenar': recorta y ocupa toda la franja. Para fotos.
// modo 'entera': entra completa, con fondo a los costados. Para logos.
async function prepararCartel(archivo, modo, fondo) {
  const img = await abrirImagenAnuncio(archivo);
  if (!img.width || !img.height) throw new Error('La imagen está vacía o dañada');

  const lienzo = document.createElement('canvas');
  lienzo.width = CARTEL_ANCHO;
  lienzo.height = CARTEL_ALTO;
  const ctx = lienzo.getContext('2d');

  ctx.fillStyle = fondo || '#12222E';
  ctx.fillRect(0, 0, CARTEL_ANCHO, CARTEL_ALTO);

  const escalaLlenar = Math.max(CARTEL_ANCHO / img.width, CARTEL_ALTO / img.height);
  const escalaEntera = Math.min(CARTEL_ANCHO / img.width, CARTEL_ALTO / img.height);
  const e = modo === 'entera' ? escalaEntera : escalaLlenar;

  const ancho = img.width * e;
  const alto  = img.height * e;
  ctx.drawImage(img, (CARTEL_ANCHO - ancho) / 2, (CARTEL_ALTO - alto) / 2, ancho, alto);

  if (img.close) img.close();

  return new Promise((res, rej) => {
    lienzo.toBlob(b => b ? res(b) : rej(new Error('No se pudo procesar')), 'image/jpeg', 0.86);
  });
}

function fichaImagen(anuncianteId, nombre, urlActual) {
  abrirFicha({
    rotulo: 'Imagen del cartel',
    titulo: nombre || 'Anunciante',
    sub: 'Se recorta a la proporción de la franja. Elegí cómo entra según qué sea la imagen.',
    html: `
      <div class="vista-cartel" id="vistaCartel">
        ${urlActual ? `<img src="${esc(urlActual)}" alt="">` : '<span>Sin imagen</span>'}
      </div>

      <label class="campo-admin"><span>Cómo entra</span>
        <select id="modoCartel">
          <option value="llenar">Llenar la franja · para fotos del local</option>
          <option value="entera">Entera con fondo · para logos</option>
        </select></label>

      <label class="campo-admin"><span>Color de fondo</span>
        <input id="fondoCartel" type="color" value="#12222E" style="height:44px;padding:4px"></label>

      <input type="file" id="archivoCartel" accept="image/*" hidden>
      <button class="btn-admin-sec" id="elegirCartel" style="width:100%">Elegir imagen</button>
      <p class="metrica-nota" id="notaCartel" style="margin-top:10px">Queda en ${CARTEL_ANCHO}×${CARTEL_ALTO}, unos 60 KB.</p>`,
    acciones: urlActual
      ? [{ texto: 'Quitar la imagen', clase: 'btn-admin-mal',
           accion: () => guardarImagenAnuncio(anuncianteId, null) }]
      : []
  });

  const entrada = $a('#archivoCartel');
  $a('#elegirCartel').addEventListener('click', () => entrada.click());

  entrada.addEventListener('change', async () => {
    const archivo = entrada.files && entrada.files[0];
    if (!archivo) return;

    const nota = $a('#notaCartel');
    const boton = $a('#elegirCartel');
    boton.disabled = true;
    boton.textContent = 'Subiendo…';
    nota.textContent = 'Procesando…';

    try {
      const blob = await prepararCartel(archivo, $a('#modoCartel').value, $a('#fondoCartel').value);

      // Vista previa antes de que termine de subir: se ve enseguida.
      const previa = URL.createObjectURL(blob);
      $a('#vistaCartel').innerHTML = `<img src="${previa}" alt="">`;

      const ruta = `${anuncianteId}/cartel.jpg`;
      const { error } = await sb.storage.from('anuncios')
        .upload(ruta, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (error) throw new Error(error.message);

      const { data } = sb.storage.from('anuncios').getPublicUrl(ruta);
      await guardarImagenAnuncio(anuncianteId, `${data.publicUrl}?v=${Date.now()}`);

    } catch (e) {
      console.warn('[cartel]', e);
      boton.disabled = false;
      boton.textContent = 'Elegir imagen';
      nota.textContent = e.message || 'No se pudo subir';
      entrada.value = '';
    }
  });
}

async function guardarImagenAnuncio(id, url) {
  const { error } = await sb.rpc('guardar_imagen_anunciante', { p_id: id, p_url: url });
  if (error) { brindis(error.message || 'No se pudo guardar'); return; }
  cerrarFicha();
  brindis(url ? 'Imagen actualizada' : 'Imagen quitada');
  if (Panel.sec === 'creativos') verCreativos();
  else verAnunciantes();
}

function fichaCasilleroLibre(localidad, rubroId) {
  const rubro = RUBROS_COMERCIO.find(r => r.id === rubroId);
  const dentroDeUnAnio = new Date();
  dentroDeUnAnio.setFullYear(dentroDeUnAnio.getFullYear() + 1);

  abrirFicha({
    rotulo: `${rubro.nombre} · ${localidad}`,
    titulo: 'Casillero libre',
    sub: 'Un solo anunciante por localidad y rubro. Al cargarlo, este casillero queda tomado.',
    html: `
      <label class="campo-admin"><span>Nombre del comercio</span><input id="cNombre" placeholder="Ferretería El Tornillo"></label>
      <label class="campo-admin"><span>Beneficio para profesionales</span><input id="cBeneficio" placeholder="15% en herramientas"></label>
      <label class="campo-admin"><span>Letra chica del beneficio</span><input id="cLetra" placeholder="Presentando el perfil en el local"></label>
      <label class="campo-admin"><span>Contacto</span><input id="cContacto" placeholder="Nombre y apellido"></label>
      <label class="campo-admin"><span>Teléfono</span><input id="cTel" placeholder="2257 40-0000"></label>
      <label class="campo-admin"><span>Dirección del local</span><input id="cDir" placeholder="Av. Costanera 1240"></label>
      <label class="campo-admin"><span>Abono mensual</span><input id="cAbono" type="number" value="${ABONO_BASE}"></label>
      <label class="campo-admin"><span>Contrato hasta</span><input id="cHasta" type="date" value="${dentroDeUnAnio.toISOString().slice(0, 10)}"></label>`,
    acciones: [
      { texto: 'Cargar anunciante', clase: 'btn-admin', accion: () => guardarAnunciante(localidad, rubroId) }
    ]
  });
}

// Una sola llamada: el comercio y el contrato salen juntos o no sale
// ninguno. Antes eran dos pasos y si el segundo fallaba quedaba el
// comercio dando vueltas sin casillero.
async function guardarAnunciante(localidad, rubroId) {
  const boton = document.querySelector('#fichaAcciones .btn-admin');
  if (boton) { boton.disabled = true; boton.textContent = 'Guardando…'; }

  const { data, error } = await sb.rpc('crear_anunciante', {
    p_nombre:      $a('#cNombre').value.trim(),
    p_rubro:       rubroId,
    p_localidad:   localidad,
    p_hasta:       $a('#cHasta').value,
    p_abono:       Number($a('#cAbono').value) || ABONO_BASE,
    p_beneficio:   $a('#cBeneficio').value.trim(),
    p_letra_chica: $a('#cLetra').value.trim(),
    p_contacto:    $a('#cContacto').value.trim(),
    p_telefono:    $a('#cTel').value.trim(),
    p_direccion:   $a('#cDir').value.trim()
  });

  if (error) {
    if (boton) { boton.disabled = false; boton.textContent = 'Cargar anunciante'; }
    brindis(error.message || 'No se pudo cargar');
    return;
  }

  const llave = (typeof data === 'string' ? JSON.parse(data) : data)?.llave;
  cerrarFicha();
  verAnunciantes();

  // La dirección de acceso es lo primero que necesita el comerciante.
  if (llave) fichaLlave($a('#cNombre') ? localidad : localidad, llave);
  else brindis('Anunciante cargado');
}

// Le muestra la dirección para pasarle por WhatsApp.
function fichaLlave(localidad, llave) {
  const url = `${location.origin}/canje.html?c=${llave}`;
  abrirFicha({
    rotulo: 'Anunciante cargado',
    titulo: 'Pasale este enlace',
    sub: 'Es su acceso al panel de canjes. No tiene usuario ni contraseña: esta dirección lo identifica.',
    html: `<label class="campo-admin">
             <span>Dirección del comercio</span>
             <textarea id="urlCanje" readonly style="min-height:88px">${esc(url)}</textarea>
           </label>`,
    acciones: [
      { texto: 'Copiar el enlace', clase: 'btn-admin', accion: async () => {
          try { await navigator.clipboard.writeText(url); brindis('Enlace copiado'); }
          catch { $a('#urlCanje').select(); brindis('Copialo a mano'); }
        } },
      { texto: 'Listo', clase: 'btn-admin-sec', accion: cerrarFicha }
    ]
  });
}

function fichaContrato(c) {
  const dias = diasHasta(c.hasta);
  abrirFicha({
    rotulo: `${RUBROS_COMERCIO.find(r => r.id === c.rubro)?.nombre} · ${c.localidad}`,
    titulo: c.anunciante?.nombre || 'Sin nombre',
    sub: c.anunciante?.beneficio || 'Sin beneficio cargado',
    datos: [
      ['Vence', fechaLarga(c.hasta)],
      ['Faltan', dias > 0 ? dias + ' días' : 'vencido'],
      ['Abono mensual', pesos(c.abono)],
      ['Contacto', c.anunciante?.contacto || '—'],
      ['Teléfono', c.anunciante?.telefono || '—'],
      ['Dirección', c.anunciante?.direccion || '— falta cargarla'],
      ['Desde', fechaLarga(c.desde)]
    ],
    acciones: [
      { texto: 'Renovar un año', clase: 'btn-admin', accion: () => renovarContrato(c) },
      { texto: 'Editar los datos', clase: 'btn-admin-sec',
        accion: () => fichaEditar(c.anunciante) },
      { texto: 'Imagen del cartel', clase: 'btn-admin-sec',
        accion: () => fichaBanner(c.anunciante_id) },
      { texto: 'Creativo interstitial', clase: 'btn-admin-sec',
        accion: () => fichaInterstitial(null, c.anunciante_id) },
      { texto: 'Ver su enlace de canje', clase: 'btn-admin-sec',
        accion: () => fichaLlave(c.localidad, c.anunciante?.llave) },
      { texto: 'Liberar casillero', clase: 'btn-admin-mal', accion: () => liberarCasillero(c) },
      { texto: 'Borrar el comercio', clase: 'btn-admin-mal',
        accion: () => borrarAnunciante(c.anunciante_id, c.anunciante?.nombre) }
    ]
  });
}

async function borrarAnunciante(id, nombre) {
  if (!confirm(`¿Borrar ${nombre || 'este comercio'}?\n\nSe van con él su casillero y todas las visitas registradas. Esto no se puede deshacer.`)) return;

  const { data, error } = await sb.rpc('borrar_anunciante', { p_id: id });
  if (error) { brindis(error.message || 'No se pudo borrar'); return; }

  const r = typeof data === 'string' ? JSON.parse(data) : data;
  cerrarFicha();
  brindis(r?.canjes_borrados
    ? `Borrado. Se perdieron ${r.canjes_borrados} visitas registradas.`
    : 'Comercio borrado');
  verAnunciantes();
}

function fichaEditar(a) {
  if (!a) return;
  abrirFicha({
    rotulo: 'Editar comercio',
    titulo: a.nombre,
    sub: 'La dirección la ve el profesional en la app, para saber a dónde ir.',
    html: `
      <label class="campo-admin"><span>Nombre</span><input id="eNombre" value="${esc(a.nombre || '')}"></label>
      <label class="campo-admin"><span>Dirección del local</span><input id="eDir" value="${esc(a.direccion || '')}" placeholder="Av. Costanera 1240"></label>
      <label class="campo-admin"><span>Beneficio</span><input id="eBenef" value="${esc(a.beneficio || '')}"></label>
      <label class="campo-admin"><span>Letra chica</span><input id="eLetra" value="${esc(a.beneficio_letra_chica || '')}"></label>
      <label class="campo-admin"><span>Contacto</span><input id="eContacto" value="${esc(a.contacto || '')}"></label>
      <label class="campo-admin"><span>Teléfono</span><input id="eTel" value="${esc(a.telefono || '')}"></label>`,
    acciones: [
      { texto: 'Guardar', clase: 'btn-admin', accion: async () => {
          const { error } = await sb.rpc('editar_anunciante', {
            p_id: a.id,
            p_nombre:      $a('#eNombre').value.trim(),
            p_direccion:   $a('#eDir').value.trim(),
            p_beneficio:   $a('#eBenef').value.trim(),
            p_letra_chica: $a('#eLetra').value.trim(),
            p_contacto:    $a('#eContacto').value.trim(),
            p_telefono:    $a('#eTel').value.trim()
          });
          if (error) { brindis(error.message || 'No se pudo guardar'); return; }
          cerrarFicha();
          brindis('Datos actualizados');
          verAnunciantes();
        } }
    ]
  });
}

async function renovarContrato(c) {
  const nueva = new Date(c.hasta);
  nueva.setFullYear(nueva.getFullYear() + 1);
  const { error } = await sb.from('contratos_publicidad')
    .update({ hasta: nueva.toISOString().slice(0, 10) }).eq('id', c.id);
  if (error) { brindis('No se pudo renovar: ' + error.message); return; }
  cerrarFicha();
  brindis('Renovado hasta ' + fechaLarga(nueva));
  verAnunciantes();
}

async function liberarCasillero(c) {
  if (!confirm(`¿Liberar el casillero de ${c.anunciante?.nombre}? El contrato queda cancelado y la posición pasa a estar disponible.`)) return;
  const { error } = await sb.from('contratos_publicidad')
    .update({ estado: 'cancelado' }).eq('id', c.id);
  if (error) { brindis('No se pudo: ' + error.message); return; }
  cerrarFicha();
  brindis('Casillero liberado');
  verAnunciantes();
}


/* ══════════════════════════════════════════════════════════
   6b · CREATIVOS — banners e interstitials
   ══════════════════════════════════════════════════════════ */

const INTER_FONDOS = [
  { hex: '#F0A63A', tinta: '#1A0F02', boton: '#1A0F02', botonTinta: '#FFFFFF', nombre: 'Ámbar' },
  { hex: '#2FB2A6', tinta: '#02120F', boton: '#02120F', botonTinta: '#FFFFFF', nombre: 'Marea' },
  { hex: '#E4574C', tinta: '#180402', boton: '#180402', botonTinta: '#FFFFFF', nombre: 'Coral' },
  { hex: '#0B1620', tinta: '#F5EFE4', boton: '#F0A63A', botonTinta: '#1A0F02', nombre: 'Asfalto' }
];

const TINTAS_RAPIDAS = [
  { hex: '#1A0F02', nombre: 'Tinta' },
  { hex: '#F5EFE4', nombre: 'Crema' },
  { hex: '#FFFFFF', nombre: 'Blanco' },
  { hex: '#F0A63A', nombre: 'Ámbar' },
  { hex: '#02120F', nombre: 'Petróleo' },
  { hex: '#180402', nombre: 'Vino' }
];

function hexOk(h) {
  const s = String(h || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return '#' + s.slice(1).toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toUpperCase();
  }
  return null;
}

function oscurecerHex(hex, f) {
  const h = hexOk(hex) || '#F0A63A';
  const n = parseInt(h.slice(1), 16);
  const ch = (shift) => Math.max(0, Math.round(((n >> shift) & 255) * (1 - f)));
  return '#' + [ch(16), ch(8), ch(0)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function fondoDesdeHex(hex) {
  const h = hexOk(hex) || '#F0A63A';
  return `linear-gradient(160deg, ${h} 0%, ${oscurecerHex(h, 0.22)} 55%, ${oscurecerHex(h, 0.48)} 100%)`;
}

function hexDesdeFondo(fondo) {
  const m = String(fondo || '').match(/#([0-9a-fA-F]{6})/);
  return m ? '#' + m[1].toUpperCase() : '#F0A63A';
}

function parColor(idColor, idHex, hex) {
  const h = hexOk(hex);
  if (!h) return;
  const a = $a('#' + idColor);
  const b = $a('#' + idHex);
  if (a) a.value = h;
  if (b) b.value = h;
}

const AUDIENCIA_TXT = { pro: 'Profesionales', cliente: 'Clientes', todos: 'Todos' };

const INTER_ANCHO = 1080;
const INTER_ALTO  = 1920;
const INTER_MAX_MB = 8;
const INTER_VIDEO_SEG = 15;
const INTER_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4v'];

let _interPendiente = { blob: null, url: null, quitar: false, tipo: null, mime: 'image/jpeg', ext: 'jpg' };

function extDeUrl(url) {
  const u = String(url || '').split('?')[0];
  const m = u.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : '';
}

function tipoMedia(url, mime, forzado) {
  if (forzado) return forzado;
  const t = String(mime || '').toLowerCase();
  const e = extDeUrl(url);
  if (t.startsWith('video/') || t === 'application/mp4' || ['mp4', 'webm', 'mov', 'm4v'].includes(e)) return 'video';
  if (t === 'image/gif' || e === 'gif') return 'gif';
  if (url || t.startsWith('image/')) return 'imagen';
  return null;
}

function htmlCapaMedia(url, cls, forzado) {
  const t = tipoMedia(url, null, forzado);
  if (!url || !t) return '';
  const c = cls || 'inter-media';
  if (t === 'video') {
    return `<video class="${c}" src="${esc(url)}" autoplay muted loop playsinline webkit-playsinline></video>`;
  }
  return `<img class="${c}" src="${esc(url)}" alt="">`;
}

async function duracionVideo(archivo) {
  return new Promise((res) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    const terminar = (d) => {
      clearTimeout(t);
      try { URL.revokeObjectURL(v.src); } catch {}
      res(Number.isFinite(d) ? d : 0);
    };
    const t = setTimeout(() => terminar(0), 4000);
    v.onloadedmetadata = () => terminar(v.duration);
    v.onerror = () => terminar(0);
    v.src = URL.createObjectURL(archivo);
  });
}

async function prepararMediaInter(archivo) {
  const tipo = tipoMedia(archivo.name, archivo.type);
  if (tipo === 'video' || tipo === 'gif') {
    const mb = archivo.size / (1024 * 1024);
    if (mb > INTER_MAX_MB) {
      throw new Error('Pesa ' + mb.toFixed(1) + ' MB. El tope es ' + INTER_MAX_MB + ' MB.');
    }
    if (tipo === 'video') {
      const d = await duracionVideo(archivo);
      if (d > INTER_VIDEO_SEG) {
        throw new Error('El video dura ' + Math.round(d) + ' s. Tiene que ser de ' + INTER_VIDEO_SEG + ' s o menos.');
      }
    }
    const ext = tipo === 'gif' ? 'gif' : (extDeUrl(archivo.name) === 'webm' ? 'webm' : 'mp4');
    const mime = tipo === 'gif' ? 'image/gif' : (ext === 'webm' ? 'video/webm' : 'video/mp4');
    return { blob: archivo, tipo, mime, ext };
  }
  const blob = await prepararAfiche(archivo);
  return { blob, tipo: 'imagen', mime: 'image/jpeg', ext: 'jpg' };
}

async function limpiarMediaInter(id) {
  try {
    await sb.storage.from('anuncios').remove(INTER_EXTS.map(e => `inter/${id}.${e}`));
  } catch {}
}

async function verCreativos() {
  const [{ data: contratos, error: e1 }, { data: inters, error: e2 }] = await Promise.all([
    sb.from('contratos_publicidad')
      .select('*, anunciante:anunciantes!anunciante_id(*)')
      .eq('estado', 'activo'),
    sb.from('interstitials')
      .select('*, anunciante:anunciantes!anunciante_id(nombre)')
      .order('orden', { ascending: true })
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const listaC = contratos || [];
  const listaI = inters || [];
  const conImg = listaC.filter(c => c.anunciante?.logo_url).length;
  const activosI = listaI.filter(i => i.activo).length;

  $a('#cuerpo').innerHTML = `
    <div class="resumen-anuncios">
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Banners con imagen</div>
        <div class="metrica-valor">${conImg}<span class="sufijo"> / ${listaC.length}</span></div>
      </div>
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Interstitials activos</div>
        <div class="metrica-valor" style="color:var(--plomo)">${activosI}<span class="sufijo"> / ${listaI.length}</span></div>
      </div>
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Sin cartel</div>
        <div class="metrica-valor" style="color:var(--coral)">${listaC.length - conImg}</div>
      </div>
    </div>

    <div class="creativos-bloque">
      <div class="creativos-cabeza">
        <div>
          <div class="panel-titulo">Banners</div>
          <p class="metrica-nota">La franja 4:1 que ve el profesional según oficio y localidad. Se edita igual que un interstitial: textos, color, foto y enlace.</p>
        </div>
      </div>
      <div class="grilla-creativos">
        ${listaC.length ? listaC.map(c => tarjetaBanner(c)).join('') : `
          <p class="metrica-nota">No hay contratos activos. Cargá un anunciante en Anunciantes y después subile el cartel acá.</p>`}
      </div>
    </div>

    <div class="creativos-bloque">
      <div class="creativos-cabeza">
        <div>
          <div class="panel-titulo">Interstitials</div>
          <p class="metrica-nota">Pantalla completa, 2 segundos después de abrir la app. Si hay uno pagado para esa audiencia, pisa a los de casa. Si hay varios, rotan en el orden de esta lista.</p>
        </div>
        <button class="btn-admin" id="nuevoInter">Nuevo interstitial</button>
      </div>
      <div class="grilla-inter">
        ${listaI.length ? listaI.map(i => tarjetaInter(i)).join('') : `
          <p class="metrica-nota">Todavía no hay interstitials. El botón de arriba carga el primero.</p>`}
      </div>
    </div>`;

  document.querySelectorAll('[data-banner]').forEach(b => {
    b.addEventListener('click', () => {
      const c = listaC.find(x => x.id === b.dataset.banner);
      if (c) fichaBanner(c.anunciante_id);
    });
  });

  $a('#nuevoInter')?.addEventListener('click', () => fichaInterstitial(null));

  document.querySelectorAll('[data-inter]').forEach(b => {
    b.addEventListener('click', () => {
      const i = listaI.find(x => x.id === b.dataset.inter);
      if (i) fichaInterstitial(i);
    });
  });

  document.querySelectorAll('[data-toggle-inter]').forEach(b => {
    b.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      b.disabled = true;
      const { error } = await sb.rpc('guardar_interstitial', {
        p_id: b.dataset.toggleInter,
        p_activo: b.dataset.on !== '1'
      });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      verCreativos();
    });
  });
}

function tarjetaBanner(c) {
  const a = c.anunciante || {};
  const rubro = RUBROS_COMERCIO.find(r => r.id === c.rubro)?.nombre || c.rubro;
  const falta = !a.logo_url && !a.banner_titulo && !a.banner_fondo;
  const titulo = a.banner_titulo || a.nombre || 'Sin nombre';
  const tinta = a.banner_tinta || '#F5EFE4';
  const fondo = a.banner_fondo || a.color || '#12222E';
  const estilo = a.logo_url
    ? `background-image:url('${esc(a.logo_url)}');background-size:cover;background-position:center;color:${esc(tinta)}`
    : `background:${esc(fondo)};color:${esc(tinta)}`;
  return `
    <button class="card-creativo ${falta ? 'falta' : ''}" data-banner="${esc(c.id)}" type="button">
      <div class="mini-banner ${a.logo_url ? 'con-foto' : ''}" style="${estilo}">
        ${a.logo_url ? '<span class="mini-banner-velo"></span>' : ''}
        <span class="mini-banner-txt">
          <em>${esc(a.banner_rotulo || 'Auspicia')}</em>
          <b>${esc(titulo)}</b>
        </span>
      </div>
      <div class="card-creativo-cuerpo">
        <b>${esc(a.nombre || 'Sin nombre')}</b>
        <span>${esc(c.localidad)} · ${esc(rubro)}</span>
        <span class="pildora ${falta ? 'p-coral' : 'p-verde'}">${falta ? 'Sin creativo' : 'Listo'}</span>
      </div>
    </button>`;
}

let _bannerPendiente = { blob: null, url: null, quitar: false };

function valoresBannerFicha() {
  const enlaceSel = $a('#bEnlace')?.value;
  const enlace = enlaceSel === 'url' ? ($a('#bUrl')?.value || '').trim() : enlaceSel;
  return {
    rotulo: ($a('#bRotulo')?.value || '').trim(),
    titulo: ($a('#bTitulo')?.value || '').trim(),
    cuerpo: ($a('#bCuerpo')?.value || '').trim(),
    fondo: fondoDesdeHex($a('#bColorFondo')?.value),
    tinta: hexOk($a('#bTinta')?.value) || '#F5EFE4',
    enlace: enlace === '' ? '' : enlace,
    imagen_url: _bannerPendiente.url
  };
}

function htmlPrevBanner(v) {
  const estilo = v.imagen_url
    ? `background-image:url('${esc(v.imagen_url)}');background-size:cover;background-position:center;color:${esc(v.tinta || '#F5EFE4')}`
    : `background:${esc(v.fondo)};color:${esc(v.tinta)}`;
  return `
    <div class="vista-banner-capa ${v.imagen_url ? 'con-foto' : ''}" style="${estilo}">
      <span class="vista-banner-cuerpo">
        <em>${esc(v.rotulo || 'Auspicia')}</em>
        <b>${esc(v.titulo || 'Nombre del comercio')}</b>
        <p>${esc(v.cuerpo || '')}</p>
      </span>
    </div>`;
}

function refrescarPrevBanner() {
  const caja = $a('#vistaBanner');
  if (!caja) return;
  caja.innerHTML = htmlPrevBanner(valoresBannerFicha());
}

async function fichaBanner(anuncianteId) {
  const { data: a, error } = await sb.from('anunciantes').select('*').eq('id', anuncianteId).maybeSingle();
  if (error || !a) { brindis(error?.message || 'No se encontró el anunciante'); return; }

  _bannerPendiente = { blob: null, url: a.logo_url || null, quitar: false };

  const colorFondo = hexDesdeFondo(a.banner_fondo) || hexOk(a.color) || '#F0A63A';
  const colorTinta = hexOk(a.banner_tinta) || '#1A0F02';
  const presetIdx = INTER_FONDOS.findIndex(f => f.hex === colorFondo && f.tinta === colorTinta);
  const enlacesFijos = ['buscar', 'beneficios', 'matches', 'perfil', '/#comercios', ''];
  const enlaceEsUrl = a.banner_enlace && !enlacesFijos.includes(a.banner_enlace);

  abrirFicha({
    rotulo: 'Editar banner',
    titulo: a.nombre || 'Banner',
    sub: 'Franja 4:1. Lo que ves en la vista previa es lo que ve el profesional en la app.',
    ancha: true,
    html: `
      <div class="vista-banner" id="vistaBanner"></div>

      <div class="paleta-creativo">
        <label class="campo-admin"><span>Paleta de partida</span>
          <select id="bPreset">
            <option value="">Personalizado</option>
            ${INTER_FONDOS.map((f, n) => `<option value="${n}" ${n === presetIdx ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('')}
          </select></label>
        <div class="colores-creativo">
          <label class="campo-color"><span>Fondo</span>
            <input type="color" id="bColorFondo" value="${esc(colorFondo)}">
            <input class="hex-corto" id="bColorFondoHex" value="${esc(colorFondo)}" maxlength="7" spellcheck="false"></label>
          <label class="campo-color"><span>Textos</span>
            <input type="color" id="bTinta" value="${esc(colorTinta)}">
            <input class="hex-corto" id="bTintaHex" value="${esc(colorTinta)}" maxlength="7" spellcheck="false"></label>
        </div>
      </div>

      <label class="campo-admin"><span>Rótulo</span>
        <input id="bRotulo" value="${esc(a.banner_rotulo || 'Auspicia')}" maxlength="24"></label>
      <label class="campo-admin"><span>Título</span>
        <input id="bTitulo" value="${esc(a.banner_titulo || a.nombre || '')}" maxlength="60"></label>
      <label class="campo-admin"><span>Cuerpo</span>
        <textarea id="bCuerpo" maxlength="120">${esc(a.banner_cuerpo || a.beneficio || '')}</textarea></label>

      <label class="campo-admin"><span>Adónde lleva el toque</span>
        <select id="bEnlace">
          <option value="" ${!a.banner_enlace ? 'selected' : ''}>Ningún enlace</option>
          <option value="buscar" ${a.banner_enlace === 'buscar' ? 'selected' : ''}>Buscar (app)</option>
          <option value="beneficios" ${a.banner_enlace === 'beneficios' ? 'selected' : ''}>Beneficios</option>
          <option value="matches" ${a.banner_enlace === 'matches' ? 'selected' : ''}>Matches</option>
          <option value="perfil" ${a.banner_enlace === 'perfil' ? 'selected' : ''}>Perfil</option>
          <option value="/#comercios" ${a.banner_enlace === '/#comercios' ? 'selected' : ''}>Landing · comercios</option>
          <option value="url" ${enlaceEsUrl ? 'selected' : ''}>Otra URL…</option>
        </select></label>
      <label class="campo-admin" id="bUrlWrap" ${enlaceEsUrl ? '' : 'hidden'}>
        <span>URL</span>
        <input id="bUrl" value="${esc(enlaceEsUrl ? a.banner_enlace : '')}" placeholder="https://…"></label>

      <label class="campo-admin"><span>Cómo entra la foto</span>
        <select id="bModo">
          <option value="llenar">Llenar la franja · para fotos del local</option>
          <option value="entera">Entera con fondo · para logos</option>
        </select></label>

      <input type="file" id="archivoBanner" accept="image/*" hidden>
      <button class="btn-admin-sec" id="elegirBanner" type="button" style="width:100%">
        ${a.logo_url ? 'Cambiar foto' : 'Subir foto (opcional)'}
      </button>
      <p class="metrica-nota" id="notaBanner" style="margin-top:10px">
        Sin foto se usa el color y el texto. Con foto, queda recortada a 960×240.
      </p>`,
    acciones: [
      { texto: 'Guardar', clase: 'btn-admin', accion: () => guardarFichaBanner(a.id) },
      ...(a.logo_url ? [{ texto: 'Quitar foto', clase: 'btn-admin-sec',
        accion: () => { _bannerPendiente = { blob: null, url: null, quitar: true }; refrescarPrevBanner(); brindis('Foto marcada para quitar. Guardá para confirmar.'); } }] : [])
    ]
  });

  refrescarPrevBanner();

  const syncUrl = () => {
    const wrap = $a('#bUrlWrap');
    if (wrap) wrap.hidden = $a('#bEnlace').value !== 'url';
  };
  [['bColorFondo', 'bColorFondoHex'], ['bTinta', 'bTintaHex']].forEach(([idC, idH]) => {
    $a('#' + idC)?.addEventListener('input', () => {
      parColor(idC, idH, $a('#' + idC).value);
      const preset = $a('#bPreset');
      if (preset) preset.value = '';
      refrescarPrevBanner();
    });
    $a('#' + idH)?.addEventListener('input', () => {
      const h = hexOk($a('#' + idH).value);
      if (!h) return;
      parColor(idC, idH, h);
      const preset = $a('#bPreset');
      if (preset) preset.value = '';
      refrescarPrevBanner();
    });
  });

  $a('#bPreset')?.addEventListener('change', () => {
    const p = INTER_FONDOS[Number($a('#bPreset').value)];
    if (!p) return;
    parColor('bColorFondo', 'bColorFondoHex', p.hex);
    parColor('bTinta', 'bTintaHex', p.tinta);
    refrescarPrevBanner();
  });

  ['bRotulo','bTitulo','bCuerpo','bEnlace','bUrl']
    .forEach(id => $a('#' + id)?.addEventListener('input', refrescarPrevBanner));
  $a('#bEnlace')?.addEventListener('change', () => { syncUrl(); refrescarPrevBanner(); });

  $a('#elegirBanner')?.addEventListener('click', () => $a('#archivoBanner').click());
  $a('#archivoBanner')?.addEventListener('change', async () => {
    const archivo = $a('#archivoBanner').files && $a('#archivoBanner').files[0];
    if (!archivo) return;
    const nota = $a('#notaBanner');
    const boton = $a('#elegirBanner');
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    try {
      const blob = await prepararCartel(archivo, $a('#bModo')?.value || 'llenar', $a('#bColorFondo')?.value || '#12222E');
      if (_bannerPendiente.url && _bannerPendiente.url.startsWith('blob:')) URL.revokeObjectURL(_bannerPendiente.url);
      _bannerPendiente = { blob, url: URL.createObjectURL(blob), quitar: false };
      boton.disabled = false;
      boton.textContent = 'Cambiar foto';
      nota.textContent = 'Foto lista. Guardá para publicarla.';
      refrescarPrevBanner();
    } catch (e) {
      boton.disabled = false;
      boton.textContent = 'Subir foto (opcional)';
      nota.textContent = e.message || 'No se pudo procesar';
    }
  });
}

async function guardarFichaBanner(id) {
  const v = valoresBannerFicha();
  const boton = document.querySelector('#fichaAcciones .btn-admin');
  if (boton) { boton.disabled = true; boton.textContent = 'Guardando…'; }

  const { error } = await sb.rpc('guardar_banner', {
    p_id: id,
    p_rotulo: v.rotulo,
    p_titulo: v.titulo,
    p_cuerpo: v.cuerpo,
    p_fondo: v.fondo,
    p_tinta: v.tinta,
    p_enlace: v.enlace,
    p_quitar_imagen: !!_bannerPendiente.quitar && !_bannerPendiente.blob
  });
  if (error) {
    if (boton) { boton.disabled = false; boton.textContent = 'Guardar'; }
    brindis(error.message || 'No se pudo guardar');
    return;
  }

  if (_bannerPendiente.blob) {
    try {
      const ruta = `${id}/cartel.jpg`;
      const { error: upErr } = await sb.storage.from('anuncios')
        .upload(ruta, _bannerPendiente.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from('anuncios').getPublicUrl(ruta);
      const { error: urlErr } = await sb.rpc('guardar_banner', {
        p_id: id,
        p_imagen_url: `${pub.publicUrl}?v=${Date.now()}`
      });
      if (urlErr) throw urlErr;
    } catch (e) {
      console.warn('[banner]', e);
      brindis('Se guardó el texto, pero la foto no subió: ' + (e.message || e));
      if (Panel.sec === 'creativos') verCreativos();
      else verAnunciantes();
      return;
    }
  }

  cerrarFicha();
  brindis('Banner actualizado');
  if (Panel.sec === 'creativos') verCreativos();
  else verAnunciantes();
}

function tarjetaInter(i) {
  const dueño = i.anunciante?.nombre || 'Contratá Ya · casa';
  const t = tipoMedia(i.imagen_url);
  const estilo = i.imagen_url
    ? `color:${esc(i.tinta || '#F5EFE4')}`
    : `background:${esc(i.fondo || '#12222E')};color:${esc(i.tinta || '#1A0F02')}`;
  return `
    <article class="card-inter ${i.activo ? '' : 'apagado'}">
      <button class="mini-inter" data-inter="${esc(i.id)}" type="button" style="${estilo}">
        ${htmlCapaMedia(i.imagen_url, 'inter-media')}
        ${i.imagen_url ? '<span class="mini-inter-velo"></span>' : ''}
        <span class="mini-inter-rotulo">${esc(i.rotulo || 'Publicidad')}${t === 'video' ? ' · video' : t === 'gif' ? ' · gif' : ''}</span>
        <b>${esc(i.titulo || 'Sin título')}</b>
      </button>
      <div class="card-creativo-cuerpo">
        <b>${esc(dueño)}</b>
        <span>${esc(AUDIENCIA_TXT[i.audiencia] || i.audiencia)}${i.localidad ? ' · ' + esc(i.localidad) : ' · todas las zonas'}</span>
        <span class="acciones-celda" style="margin-top:8px">
          <button class="btn-mini" data-toggle-inter="${esc(i.id)}" data-on="${i.activo ? '1' : '0'}">${i.activo ? 'Pausar' : 'Activar'}</button>
          <button class="btn-mini" data-inter="${esc(i.id)}">Editar</button>
        </span>
      </div>
    </article>`;
}

function valoresInterFicha() {
  const enlaceSel = $a('#iEnlace')?.value;
  const enlace = enlaceSel === 'url' ? ($a('#iUrl')?.value || '').trim() : enlaceSel;
  const casa = $a('#iCasa')?.value === 'casa';
  const tinta = hexOk($a('#iTinta')?.value) || '#1A0F02';
  return {
    anunciante: casa ? null : ($a('#iCasa')?.value || null),
    es_casa: casa,
    activo: $a('#iActivo')?.value === '1',
    audiencia: $a('#iAud')?.value || 'todos',
    fondo: fondoDesdeHex($a('#iColorFondo')?.value),
    tinta,
    boton_fondo: hexOk($a('#iBotonFondo')?.value) || tinta,
    boton_tinta: hexOk($a('#iBotonTinta')?.value) || '#FFFFFF',
    rotulo: ($a('#iRotulo')?.value || '').trim(),
    titulo: ($a('#iTitulo')?.value || '').trim(),
    cuerpo: ($a('#iCuerpo')?.value || '').trim(),
    boton: ($a('#iBoton')?.value || '').trim() || 'Ver más',
    enlace,
    localidad: $a('#iLoc')?.value || '',
    imagen_url: _interPendiente.url,
    media_tipo: _interPendiente.tipo
  };
}

function htmlPrevInter(v) {
  const estilo = v.imagen_url
    ? `color:${esc(v.tinta || '#F5EFE4')}`
    : `background:${esc(v.fondo)};color:${esc(v.tinta)}`;
  const btn = `background:${esc(v.boton_fondo || v.tinta || '#1A0F02')};color:${esc(v.boton_tinta || '#FFFFFF')}`;
  return `
    <div class="vista-inter-capa ${v.imagen_url ? 'con-foto' : ''}" style="${estilo}">
      ${htmlCapaMedia(v.imagen_url, 'inter-media', v.media_tipo)}
      <span class="vista-inter-pie">Publicidad</span>
      <div class="vista-inter-cuerpo">
        <span>${esc(v.rotulo || 'Contratá Ya')}</span>
        <b>${esc(v.titulo || 'Título del aviso')}</b>
        <p>${esc(v.cuerpo || '')}</p>
        <em style="${btn}">${esc(v.boton || 'Ver más')}</em>
      </div>
    </div>`;
}

function refrescarPrevInter() {
  const caja = $a('#vistaInter');
  if (!caja) return;
  caja.innerHTML = htmlPrevInter(valoresInterFicha());
}

async function fichaInterstitial(i, anunciantePrefill) {
  const { data: anunciantes } = await sb.from('anunciantes').select('id,nombre').order('nombre');
  const listaA = anunciantes || [];

  _interPendiente = {
    blob: null,
    url: i?.imagen_url || null,
    quitar: false,
    tipo: tipoMedia(i?.imagen_url),
    mime: null,
    ext: extDeUrl(i?.imagen_url) || 'jpg'
  };

  const colorFondo = hexDesdeFondo(i?.fondo);
  const colorTinta = hexOk(i?.tinta) || '#1A0F02';
  const colorBoton = hexOk(i?.boton_fondo) || colorTinta;
  const colorBotonTxt = hexOk(i?.boton_tinta) || '#FFFFFF';
  const presetIdx = INTER_FONDOS.findIndex(f => f.hex === colorFondo && f.tinta === colorTinta);
  const enlacesFijos = ['buscar', 'beneficios', 'matches', 'perfil', 'planes', 'avisos', '/#comercios'];
  const enlaceEsUrl = i?.enlace && !enlacesFijos.includes(i.enlace);
  const dueño = i
    ? (i.anunciante_id || 'casa')
    : (anunciantePrefill || 'casa');

  abrirFicha({
    rotulo: i ? 'Editar interstitial' : 'Nuevo interstitial',
    titulo: i?.titulo || 'Pantalla completa',
    sub: 'Se muestra a los 2 segundos de abrir la app, en cada sesión. Si hay uno de un comercio activo, pisa a los de casa. Si hay varios, rotan en orden.',
    ancha: true,
    html: `
      <div class="vista-inter" id="vistaInter"></div>

      <label class="campo-admin"><span>Quién lo paga</span>
        <select id="iCasa">
          <option value="casa">Contratá Ya (casa)</option>
          ${listaA.map(a => `<option value="${esc(a.id)}" ${dueño === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}
        </select></label>

      <label class="campo-admin"><span>A quién se le muestra</span>
        <select id="iAud">
          <option value="todos" ${i?.audiencia === 'todos' ? 'selected' : ''}>Todos</option>
          <option value="pro" ${i?.audiencia === 'pro' ? 'selected' : ''}>Sólo profesionales</option>
          <option value="cliente" ${i?.audiencia === 'cliente' ? 'selected' : ''}>Sólo clientes</option>
        </select></label>

      <label class="campo-admin"><span>Localidad</span>
        <select id="iLoc">
          <option value="">Todas las localidades</option>
          ${LOCALIDADES.map(l => `<option ${i?.localidad === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select></label>

      <div class="paleta-creativo">
        <label class="campo-admin"><span>Paleta de partida</span>
          <select id="iPreset">
            <option value="">Personalizado</option>
            ${INTER_FONDOS.map((f, n) => `<option value="${n}" ${n === presetIdx ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('')}
          </select></label>
        <p class="metrica-nota" style="margin-bottom:10px">La paleta carga fondo, textos y botón. Después afiná cada color.</p>
        <div class="colores-creativo">
          <label class="campo-color"><span>Fondo</span>
            <input type="color" id="iColorFondo" value="${esc(colorFondo)}">
            <input class="hex-corto" id="iColorFondoHex" value="${esc(colorFondo)}" maxlength="7" spellcheck="false"></label>
          <label class="campo-color"><span>Textos</span>
            <input type="color" id="iTinta" value="${esc(colorTinta)}">
            <input class="hex-corto" id="iTintaHex" value="${esc(colorTinta)}" maxlength="7" spellcheck="false"></label>
          <label class="campo-color"><span>Botón</span>
            <input type="color" id="iBotonFondo" value="${esc(colorBoton)}">
            <input class="hex-corto" id="iBotonFondoHex" value="${esc(colorBoton)}" maxlength="7" spellcheck="false"></label>
          <label class="campo-color"><span>Texto del botón</span>
            <input type="color" id="iBotonTinta" value="${esc(colorBotonTxt)}">
            <input class="hex-corto" id="iBotonTintaHex" value="${esc(colorBotonTxt)}" maxlength="7" spellcheck="false"></label>
        </div>
        <div class="swatches-texto">
          <span>Textos rápidos</span>
          ${TINTAS_RAPIDAS.map(t => `
            <button type="button" class="swatch" data-tinta="${esc(t.hex)}" title="${esc(t.nombre)}"
              style="background:${esc(t.hex)}"></button>`).join('')}
        </div>
      </div>

      <label class="campo-admin"><span>Rótulo</span>
        <input id="iRotulo" value="${esc(i?.rotulo || 'Contratá Ya')}" maxlength="40"></label>
      <label class="campo-admin"><span>Título</span>
        <input id="iTitulo" value="${esc(i?.titulo || '')}" maxlength="80" placeholder="Tu próximo trabajo está a ocho cuadras"></label>
      <label class="campo-admin"><span>Cuerpo</span>
        <textarea id="iCuerpo" maxlength="280">${esc(i?.cuerpo || '')}</textarea></label>
      <label class="campo-admin"><span>Texto del botón</span>
        <input id="iBoton" value="${esc(i?.boton || 'Ver más')}" maxlength="40"></label>

      <label class="campo-admin"><span>Adónde lleva el botón</span>
        <select id="iEnlace">
          <option value="buscar" ${i?.enlace === 'buscar' ? 'selected' : ''}>Buscar (app)</option>
          <option value="beneficios" ${i?.enlace === 'beneficios' ? 'selected' : ''}>Beneficios</option>
          <option value="matches" ${i?.enlace === 'matches' ? 'selected' : ''}>Matches</option>
          <option value="perfil" ${i?.enlace === 'perfil' ? 'selected' : ''}>Perfil</option>
          <option value="planes" ${i?.enlace === 'planes' ? 'selected' : ''}>Ver el plan Pro</option>
          <option value="avisos" ${i?.enlace === 'avisos' ? 'selected' : ''}>Activar notificaciones</option>
          <option value="/#comercios" ${i?.enlace === '/#comercios' ? 'selected' : ''}>Landing · comercios</option>
          <option value="url" ${enlaceEsUrl ? 'selected' : ''}>Otra URL…</option>
        </select></label>
      <label class="campo-admin" id="iUrlWrap" ${enlaceEsUrl ? '' : 'hidden'}>
        <span>URL</span>
        <input id="iUrl" value="${esc(enlaceEsUrl ? i.enlace : '')}" placeholder="https://…"></label>

      <label class="campo-admin"><span>Estado</span>
        <select id="iActivo">
          <option value="1" ${i?.activo !== false ? 'selected' : ''}>Activo · se muestra</option>
          <option value="0" ${i?.activo === false ? 'selected' : ''}>Pausado</option>
        </select></label>

      <input type="file" id="archivoInter" accept=".mp4,.webm,.mov,.m4v,.gif,.jpg,.jpeg,.png,.webp,video/mp4,video/webm,image/gif,image/jpeg,image/png,image/webp" hidden>
      <button class="btn-admin-sec" id="elegirInter" type="button" style="width:100%">
        ${i?.imagen_url || _interPendiente.url ? 'Cambiar afiche / video' : 'Subir foto, GIF o video (opcional)'}
      </button>
      <p class="metrica-nota" id="notaInter" style="margin-top:10px">
        Foto, GIF o MP4. En el cuadro del archivo elegí «Todos los archivos» si no ves el video. Hasta ${INTER_MAX_MB} MB, video de ${INTER_VIDEO_SEG} s o menos.
      </p>
      <button class="btn-admin-sec" id="verInterPantalla" type="button" style="width:100%;margin-top:8px">Ver cómo queda</button>`,
    acciones: [
      { texto: 'Guardar', clase: 'btn-admin', accion: () => guardarFichaInter(i?.id) },
      ...(i?.imagen_url ? [{ texto: 'Quitar afiche', clase: 'btn-admin-sec',
        accion: () => { _interPendiente = { blob: null, url: null, quitar: true, tipo: null, mime: null, ext: 'jpg' }; refrescarPrevInter(); brindis('Afiche marcado para quitar. Guardá para confirmar.'); } }] : []),
      ...(i ? [{ texto: 'Borrar este interstitial', clase: 'btn-admin-mal',
        accion: () => borrarInterstitial(i.id, i.titulo) }] : [])
    ]
  });

  refrescarPrevInter();

  const syncUrl = () => {
    const wrap = $a('#iUrlWrap');
    if (wrap) wrap.hidden = $a('#iEnlace').value !== 'url';
  };
  const pares = [
    ['iColorFondo', 'iColorFondoHex'],
    ['iTinta', 'iTintaHex'],
    ['iBotonFondo', 'iBotonFondoHex'],
    ['iBotonTinta', 'iBotonTintaHex']
  ];
  pares.forEach(([idC, idH]) => {
    $a('#' + idC)?.addEventListener('input', () => {
      parColor(idC, idH, $a('#' + idC).value);
      const preset = $a('#iPreset');
      if (preset) preset.value = '';
      refrescarPrevInter();
    });
    $a('#' + idH)?.addEventListener('input', () => {
      const h = hexOk($a('#' + idH).value);
      if (!h) return;
      parColor(idC, idH, h);
      const preset = $a('#iPreset');
      if (preset) preset.value = '';
      refrescarPrevInter();
    });
  });

  $a('#iPreset')?.addEventListener('change', () => {
    const p = INTER_FONDOS[Number($a('#iPreset').value)];
    if (!p) return;
    parColor('iColorFondo', 'iColorFondoHex', p.hex);
    parColor('iTinta', 'iTintaHex', p.tinta);
    parColor('iBotonFondo', 'iBotonFondoHex', p.boton);
    parColor('iBotonTinta', 'iBotonTintaHex', p.botonTinta);
    refrescarPrevInter();
  });

  document.querySelectorAll('#fichaPanel [data-tinta]').forEach(b => {
    b.addEventListener('click', () => {
      parColor('iTinta', 'iTintaHex', b.dataset.tinta);
      const preset = $a('#iPreset');
      if (preset) preset.value = '';
      refrescarPrevInter();
    });
  });

  ['iCasa','iAud','iLoc','iRotulo','iTitulo','iCuerpo','iBoton','iEnlace','iUrl','iActivo']
    .forEach(id => $a('#' + id)?.addEventListener('input', refrescarPrevInter));
  $a('#iEnlace')?.addEventListener('change', () => { syncUrl(); refrescarPrevInter(); });
  $a('#iCasa')?.addEventListener('change', () => {
    const sel = $a('#iCasa');
    if (sel.value !== 'casa' && !$a('#iRotulo').value) {
      const a = listaA.find(x => x.id === sel.value);
      if (a) $a('#iRotulo').value = a.nombre;
    }
    refrescarPrevInter();
  });

  $a('#elegirInter')?.addEventListener('click', () => $a('#archivoInter').click());
  $a('#archivoInter')?.addEventListener('change', async () => {
    const archivo = $a('#archivoInter').files && $a('#archivoInter').files[0];
    if (!archivo) return;
    const nota = $a('#notaInter');
    const boton = $a('#elegirInter');
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    try {
      const media = await prepararMediaInter(archivo);
      if (_interPendiente.url && _interPendiente.url.startsWith('blob:')) URL.revokeObjectURL(_interPendiente.url);
      _interPendiente = {
        blob: media.blob,
        url: URL.createObjectURL(media.blob),
        quitar: false,
        tipo: media.tipo,
        mime: media.mime,
        ext: media.ext
      };
      boton.disabled = false;
      boton.textContent = 'Cambiar afiche / video';
      nota.textContent = media.tipo === 'video'
        ? 'Video listo (mudo, en loop). Guardá para publicarlo.'
        : media.tipo === 'gif'
          ? 'GIF listo. Guardá para publicarlo.'
          : 'Afiche listo. Guardá para publicarlo.';
      refrescarPrevInter();
      const vid = $a('#vistaInter video');
      if (vid) { vid.muted = true; vid.play().catch(() => {}); }
    } catch (e) {
      boton.disabled = false;
      boton.textContent = 'Subir foto, GIF o video (opcional)';
      nota.textContent = e.message || 'No se pudo procesar';
      brindis(e.message || 'No se pudo cargar el archivo');
    }
    $a('#archivoInter').value = '';
  });

  $a('#verInterPantalla')?.addEventListener('click', () => verInterPantalla(valoresInterFicha()));
}

async function prepararAfiche(archivo) {
  const img = await abrirImagenAnuncio(archivo);
  if (!img.width || !img.height) throw new Error('La imagen está vacía o dañada');
  const lienzo = document.createElement('canvas');
  lienzo.width = INTER_ANCHO;
  lienzo.height = INTER_ALTO;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#0B1620';
  ctx.fillRect(0, 0, INTER_ANCHO, INTER_ALTO);
  const e = Math.max(INTER_ANCHO / img.width, INTER_ALTO / img.height);
  const ancho = img.width * e;
  const alto  = img.height * e;
  ctx.drawImage(img, (INTER_ANCHO - ancho) / 2, (INTER_ALTO - alto) / 2, ancho, alto);
  if (img.close) img.close();
  return new Promise((res, rej) => {
    lienzo.toBlob(b => b ? res(b) : rej(new Error('No se pudo procesar')), 'image/jpeg', 0.84);
  });
}

async function guardarFichaInter(id) {
  const v = valoresInterFicha();
  if (!v.titulo) { brindis('Falta el título'); return; }

  const boton = document.querySelector('#fichaAcciones .btn-admin');
  if (boton) { boton.disabled = true; boton.textContent = 'Guardando…'; }

  const { data, error } = await sb.rpc('guardar_interstitial', {
    p_id: id || null,
    p_anunciante: v.anunciante,
    p_es_casa: v.es_casa,
    p_activo: v.activo,
    p_audiencia: v.audiencia,
    p_fondo: v.fondo,
    p_tinta: v.tinta,
    p_boton_fondo: v.boton_fondo,
    p_boton_tinta: v.boton_tinta,
    p_rotulo: v.rotulo,
    p_titulo: v.titulo,
    p_cuerpo: v.cuerpo,
    p_boton: v.boton,
    p_enlace: v.enlace,
    p_localidad: v.localidad,
    p_quitar_imagen: !!_interPendiente.quitar && !_interPendiente.blob
  });
  if (error) {
    if (boton) { boton.disabled = false; boton.textContent = 'Guardar'; }
    brindis(error.message || 'No se pudo guardar');
    return;
  }

  const r = typeof data === 'string' ? JSON.parse(data) : data;
  const guardadoId = r?.id || id;

  if (_interPendiente.quitar && !_interPendiente.blob && guardadoId) {
    await limpiarMediaInter(guardadoId);
  }

  if (_interPendiente.blob && guardadoId) {
    try {
      const ext = _interPendiente.ext || 'jpg';
      const mime = _interPendiente.mime || 'image/jpeg';
      await limpiarMediaInter(guardadoId);
      const ruta = `inter/${guardadoId}.${ext}`;
      const cuerpo = _interPendiente.blob instanceof File
        ? new Blob([_interPendiente.blob], { type: mime })
        : _interPendiente.blob;
      const { error: upErr } = await sb.storage.from('anuncios')
        .upload(ruta, cuerpo, { upsert: true, contentType: mime, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from('anuncios').getPublicUrl(ruta);
      const { error: urlErr } = await sb.rpc('guardar_interstitial', {
        p_id: guardadoId,
        p_imagen_url: `${pub.publicUrl}?v=${Date.now()}`
      });
      if (urlErr) throw urlErr;
    } catch (e) {
      console.warn('[inter]', e);
      const crudo = e.message || String(e);
      const tope = /maximum|too large|payload|file size|size limit/i.test(crudo);
      brindis(tope
        ? 'El video supera el tamaño máximo del servidor. Corré el SQL para subir el tope a 15 MB.'
        : 'Se guardó el texto, pero el archivo no subió: ' + crudo);
      if (Panel.sec === 'creativos') verCreativos();
      else verAnunciantes();
      return;
    }
  }

  cerrarFicha();
  brindis(id ? 'Interstitial actualizado' : 'Interstitial creado');
  if (Panel.sec === 'creativos') verCreativos();
  else verAnunciantes();
}

async function borrarInterstitial(id, titulo) {
  if (!confirm(`¿Borrar el interstitial «${titulo || 'sin título'}»?\n\nDeja de mostrarse en la app. No se puede deshacer.`)) return;
  const { error } = await sb.rpc('borrar_interstitial', { p_id: id });
  if (error) { brindis(error.message || 'No se pudo borrar'); return; }
  await limpiarMediaInter(id);
  cerrarFicha();
  brindis('Interstitial borrado');
  verCreativos();
}

function verInterPantalla(v) {
  document.getElementById('interAdminPrev')?.remove();
  const capa = document.createElement('div');
  capa.id = 'interAdminPrev';
  capa.className = 'inter-admin' + (v.imagen_url ? ' inter-admin-foto' : '');
  if (!v.imagen_url) capa.style.background = v.fondo;
  capa.style.setProperty('--tinta-inter', v.tinta || '#1A0F02');
  capa.style.setProperty('--boton-fondo', v.boton_fondo || v.tinta || '#1A0F02');
  capa.style.setProperty('--boton-tinta', v.boton_tinta || '#FFFFFF');
  capa.innerHTML = `
    ${htmlCapaMedia(v.imagen_url, 'inter-media', v.media_tipo)}
    <button class="inter-admin-cerrar" type="button" aria-label="Cerrar">✕</button>
    <div class="inter-admin-cuerpo">
      <span class="inter-admin-rotulo">${esc(v.rotulo || 'Contratá Ya')}</span>
      <h2>${esc(v.titulo || 'Título del aviso')}</h2>
      <p>${esc(v.cuerpo || '')}</p>
      <button class="inter-admin-boton" type="button">${esc(v.boton || 'Ver más')}</button>
    </div>
    <span class="inter-admin-pie">Publicidad · vista previa</span>`;
  document.body.appendChild(capa);
  const cerrar = () => capa.remove();
  capa.querySelector('.inter-admin-cerrar').addEventListener('click', cerrar);
  capa.querySelector('.inter-admin-boton').addEventListener('click', cerrar);
}


/* ══════════════════════════════════════════════════════════
   7 · MODERACIÓN
   ══════════════════════════════════════════════════════════ */

const MOTIVO_TEXTO = {
  no_es_quien_dice: 'No es la persona de la foto',
  foto: 'Foto falsa o inapropiada',
  no_se_presento: 'Acordó y no se presentó',
  trato: 'Malos tratos',
  estafa: 'Intento de estafa',
  otro: 'Otro motivo'
};

async function verModeracion() {
  const [{ data: filas, error }, { data: susp }] = await Promise.all([
    sb.rpc('denuncias_abiertas'),
    sb.rpc('usuarios_suspendidos')
  ]);
  if (error) throw error;

  // Las cuentas suspendidas van arriba y siempre. Antes el botón para
  // levantarlas vivía dentro de la denuncia, y al cerrarse la denuncia la
  // cuenta quedaba bloqueada sin ninguna puerta para desbloquearla.
  const bloqueSuspendidos = (susp && susp.length) ? `
    <div class="metrica-admin" style="margin-bottom:16px;border-color:var(--coral)">
      <div class="panel-titulo">Cuentas suspendidas (${susp.length})</div>
      ${susp.map(u => `
        <div class="rubro-fila">
          <span>
            <b style="color:var(--cal)">${esc(nombreAdmin(u))}</b>
            <span class="pildora p-coral" style="margin-left:8px">Suspendido</span>
            <br>
            <span style="font-size:12px;color:var(--cal-2)">
              ${u.rol === 'pro' ? 'Profesional' : 'Cliente'}${u.rubro ? ' · ' + esc(u.rubro) : ''}${u.localidad ? ' · ' + esc(u.localidad) : ''}
              ${u.correo ? '<br>' + esc(u.correo) : ''}${u.whatsapp ? ' · ' + esc(u.whatsapp) : ''}
            </span>
            ${u.motivo ? `<br><span style="font-size:12px;color:var(--cal-3)">${esc(u.motivo)}</span>` : ''}
          </span>
          <span class="acciones-celda">
            <span class="dato-mono">${num(u.denuncias || 0)} denuncia${Number(u.denuncias) === 1 ? '' : 's'}</span>
            <button class="btn-mini btn-mini-ok" data-levantar="${esc(u.id)}">Levantar suspensión</button>
          </span>
        </div>`).join('')}
    </div>` : '';

  if (!filas || !filas.length) {
    $a('#cuerpo').innerHTML = bloqueSuspendidos + `
      <div class="vacio-admin">
        <h3>No hay denuncias abiertas</h3>
        <p>Cuando alguien reporte a otro usuario desde el chat o desde su perfil, va a aparecer acá con el motivo, la conversación del trabajo y sus antecedentes.</p>
      </div>`;
    conectarLevantar();
    return;
  }

  $a('#cuerpo').innerHTML = bloqueSuspendidos + `
    <div class="resenas-lista">
      ${filas.map(d => `
        <div class="resena-admin ${d.antecedentes > 0 ? 'resena-baja' : ''}">
          <div class="resena-cabeza-admin">
            <span class="persona-avatar" style="width:44px;height:44px">
              ${d.denunciado_foto ? `<img src="${esc(d.denunciado_foto)}" alt="">` : esc(iniciales(d.denunciado))}
            </span>
            <div style="flex:1">
              <div style="font-weight:600;font-size:16px">${esc(d.denunciado || 'Sin nombre')}</div>
              <div class="persona-fecha">${esc(d.denunciado_rubro || '')} · reportado por ${esc(d.autor_nombre || 'alguien')} · ${fechaCorta(d.creado_en)}</div>
            </div>
            ${d.suspendido ? '<span class="pildora p-coral">Suspendido</span>' : ''}
            ${d.antecedentes > 0 ? `<span class="pildora p-coral">${d.antecedentes} denuncia${d.antecedentes === 1 ? '' : 's'} más</span>` : ''}
          </div>

          <p style="color:var(--cal);font-weight:500">${esc(MOTIVO_TEXTO[d.motivo] || d.motivo)}</p>
          ${d.detalle ? `<p style="margin-top:6px">${esc(d.detalle)}</p>` : ''}

          ${(d.conversacion && d.conversacion.length) ? `
            <button class="btn-mini" data-chat="${esc(d.id)}" style="margin-top:12px">Ver la conversación (${d.conversacion.length})</button>
            <div class="charla-cuerpo" id="chat-${esc(d.id)}" hidden style="margin-top:12px;padding:0">
              ${d.conversacion.map(m => `
                <div class="burbuja ${m.autor === d.denunciado_id ? 'b-pro' : 'b-cliente'}">
                  <div class="burbuja-autor">${m.autor === d.denunciado_id ? esc(d.denunciado) : esc(d.autor_nombre || 'Quien denuncia')}</div>
                  <p>${esc(m.texto)}</p>
                </div>`).join('')}
            </div>` : ''}

          <div class="acciones-celda" style="margin-top:14px">
            ${d.suspendido
              ? `<button class="btn-mini btn-mini-ok" data-levantar="${esc(d.denunciado_id)}" data-den="${esc(d.id)}">Levantar suspensión</button>`
              : `<button class="btn-mini btn-mini-mal" data-suspender="${esc(d.id)}">Suspender la cuenta</button>`}
            <button class="btn-mini" data-revisada="${esc(d.id)}">Revisada, sin acción</button>
            <button class="btn-mini" data-desestimar="${esc(d.id)}">Desestimar</button>
          </div>
        </div>`).join('')}
    </div>`;

  document.querySelectorAll('[data-chat]').forEach(b => {
    b.addEventListener('click', () => {
      const c = document.getElementById('chat-' + b.dataset.chat);
      c.hidden = !c.hidden;
      b.textContent = c.hidden ? `Ver la conversación` : 'Ocultar la conversación';
    });
  });

  const resolver = async (id, estado, suspender) => {
    const nota = suspender ? prompt('Motivo de la suspensión (lo ve sólo el equipo):') : null;
    if (suspender && nota === null) return;
    const { error } = await sb.rpc('resolver_denuncia', {
      p_id: id, p_estado: estado, p_suspender: !!suspender, p_nota: nota
    });
    if (error) { brindis(error.message || 'No se pudo'); return; }
    brindis(suspender ? 'Cuenta suspendida' : 'Denuncia cerrada');
    verModeracion();
  };

  document.querySelectorAll('[data-suspender]').forEach(b =>
    b.addEventListener('click', () => resolver(b.dataset.suspender, 'accion_tomada', true)));
  document.querySelectorAll('[data-revisada]').forEach(b =>
    b.addEventListener('click', () => resolver(b.dataset.revisada, 'revisada', false)));
  document.querySelectorAll('[data-desestimar]').forEach(b =>
    b.addEventListener('click', () => resolver(b.dataset.desestimar, 'desestimada', false)));

  conectarLevantar();
}

function conectarLevantar() {
  document.querySelectorAll('[data-levantar]').forEach(b => {
    b.addEventListener('click', async () => {
      b.disabled = true;
      const { error } = await sb.rpc('levantar_suspension', { p_usuario: b.dataset.levantar });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      brindis('Suspensión levantada');
      verModeracion();
    });
  });
}


/* ══════════════════════════════════════════════════════════
   FICHA LATERAL — compartida por usuarios, trabajos y anunciantes
   ══════════════════════════════════════════════════════════ */

function abrirFicha({ rotulo, titulo, sub, datos, html, acciones, ancha }) {
  $a('#fichaPanel').classList.toggle('ficha-ancha', !!ancha);
  $a('#fichaPanel').innerHTML = `
    <div class="ficha-cabeza">
      <span class="ficha-rotulo">${esc(rotulo)}</span>
      <button class="btn-mini btn-mini-mal" data-cerrar-ficha>Cerrar</button>
    </div>
    <div class="ficha-cuerpo">
      <div>
        <h2>${esc(titulo)}</h2>
        ${sub ? `<p class="ficha-sub">${esc(sub)}</p>` : ''}
      </div>
      ${html || ''}
      ${datos && datos.length ? `<div class="datos-lista">
        ${datos.map(([k, v]) => `<div class="datos-fila">
          <span class="datos-clave">${esc(k)}</span>
          <span class="datos-valor">${esc(v)}</span>
        </div>`).join('')}
      </div>` : ''}
      ${acciones && acciones.length ? `<div class="ficha-acciones" id="fichaAcciones">
        ${acciones.map((a, i) => `<button class="${a.clase}" data-accion="${i}">${esc(a.texto)}</button>`).join('')}
      </div>` : ''}
    </div>`;

  $a('#ficha').hidden = false;

  if (acciones) {
    document.querySelectorAll('#fichaAcciones [data-accion]').forEach(b => {
      b.addEventListener('click', () => acciones[Number(b.dataset.accion)].accion());
    });
  }
}

function cerrarFicha() {
  $a('#ficha').hidden = true;
  $a('#fichaPanel')?.classList.remove('ficha-ancha');
}


/* ── Arranque ─────────────────────────────────────────────── */
abrirPanel();
