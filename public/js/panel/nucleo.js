/* ============================================================
   CONTRATÁ YA — Panel · Núcleo
   El marco del panel: el portón que sólo deja pasar al
   administrador, el estado compartido, el registro de secciones,
   el router de direcciones y el refresco en vivo.

   Sin framework y sin compilación: son scripts clásicos, todo en
   ámbito global, igual que el resto del proyecto. Este archivo se
   carga primero; después ui.js, datos.js y una sección por archivo.
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

const Panel = {
  sec: 'resumen',
  dias: 30,
  datos: {},
  admin: null,
  actualizado: null,
  vivo: null,
  matchSel: null,

  /* ── El registro de secciones ────────────────────────────────
     Cada archivo de panel/secciones/ se anota acá al cargarse. El
     router de más abajo busca la sección por su slug y le pide que
     pinte. Nadie importa a nadie: si mañana se saca Creativos, se
     borra el archivo y su renglón del HTML, y el resto sigue
     andando igual.

       Panel.registrar('usuarios', {
         titulo: 'Usuarios',
         bajada: 'Todas las cuentas, con filtros y acciones en lote',
         pintar: async (cuerpo) => { ... }
       });
     ─────────────────────────────────────────────────────────── */
  secciones: {},

  registrar(slug, def) {
    Panel.secciones[slug] = Object.assign({
      titulo:      slug,
      bajada:      '',
      periodo:     false,   // ¿muestra el selector de 7 / 30 / 90 días?
      refrescar:   true,    // ¿entra en el refresco automático de cada 12 s?
      pintar:      async () => {},
      pintarVivo:  null,    // opcional: qué hacer en el refresco silencioso
      conservar:   null,    // opcional: () => true para no borrar el cuerpo al recargar
      claseCuerpo: null,    // opcional: clase que se le pone al marco del panel
      alSalir:     null,    // opcional: () => false para frenar el cambio de sección
      insignia:    null     // opcional: async () => número rojo del menú
    }, def);
  },

  /* La sección que se está mirando, ya con los valores por omisión. */
  actual() { return Panel.secciones[Panel.sec] || null; }
};


/* ── Portón: sólo entra el administrador ──────────────────── */

async function abrirPanel() {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    // Se entra con correo y contraseña en /entrar.html, que es la única
    // pantalla de ingreso del proyecto. Después de entrar vuelve acá.
    $a('#portonTexto').textContent = 'Para usar el panel hay que entrar con tu correo y tu contraseña.';
    $a('#portonAcciones').innerHTML =
      '<a class="btn-admin" href="/entrar.html" style="display:inline-block;margin-top:20px">Entrar</a>';
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
      <button class="btn-admin" id="cambiarCuenta" style="margin-top:20px">Salir y entrar con otra cuenta</button>
      <a class="btn-admin-sec" href="/app.html" style="display:inline-block;margin-top:8px">Volver a la app</a>`;

    $a('#cambiarCuenta').addEventListener('click', async () => {
      await sb.auth.signOut();
      location.href = '/entrar.html';
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

  // Se abre en la sección que dice la dirección: /admin/documentos abre
  // Documentos, y recargar no te devuelve al resumen.
  const secInicial = seccionDeLaUrl();
  if (secInicial) {
    Panel.sec = secInicial;
    document.querySelectorAll('#nav button')
      .forEach(x => x.classList.toggle('activo', x.dataset.sec === secInicial));
  }
  escribirUrl(Panel.sec, true);

  await pintarSeccion();
  arrancarVivo();
}


/* ── Navegación ───────────────────────────────────────────── */

/* ── Menú en el teléfono ──────────────────────────────────────
   En una pantalla chica la barra lateral no entra al lado del
   contenido, así que se abre y se cierra como un cajón. */
function abrirMenu(abrir) {
  const admin = $a('#admin');
  const boton = $a('#menuPanel');
  admin.classList.toggle('menu-abierto', abrir);
  if (boton) boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');

  let velo = $a('#veloMenu');
  if (abrir && !velo) {
    velo = document.createElement('div');
    velo.id = 'veloMenu';
    velo.className = 'velo-menu';
    velo.addEventListener('click', () => abrirMenu(false));
    admin.appendChild(velo);
  }
  if (!abrir && velo) velo.remove();
}

function conectarNavegacion() {
  $a('#menuPanel')?.addEventListener('click', () => {
    abrirMenu(!$a('#admin').classList.contains('menu-abierto'));
  });

  /* La barra lateral se pliega para tener más ancho, y se acuerda de cómo la
     dejaste. En el teléfono sigue siendo un cajón: esto es para pantallas
     grandes. */
  const plegarLateral = (plegado) => {
    $a('#admin').classList.toggle('lateral-plegada', plegado);
    const b = $a('#plegarLateral');
    if (b) {
      b.textContent = plegado ? '›' : '‹';
      b.title = plegado ? 'Mostrar el menú' : 'Ocultar el menú';
      b.setAttribute('aria-label', b.title);
    }
    try { localStorage.setItem('panelLateral', plegado ? 'plegada' : 'abierta'); } catch (_) {}
  };
  if ($a('#plegarLateral')) {
    $a('#plegarLateral').addEventListener('click',
      () => plegarLateral(!$a('#admin').classList.contains('lateral-plegada')));
    let guardado = null;
    try { guardado = localStorage.getItem('panelLateral'); } catch (_) {}
    if (guardado === 'plegada') plegarLateral(true);
  }

  document.querySelectorAll('#nav button').forEach(b => {
    b.addEventListener('click', () => {
      abrirMenu(false);
      if (b.dataset.sec === Panel.sec) return;
      // La sección que se deja puede tener algo que decir: Documentos
      // pregunta antes de tirar cambios sin guardar.
      const saliendo = Panel.actual();
      if (saliendo && saliendo.alSalir && saliendo.alSalir() === false) return;
      Panel.sec = b.dataset.sec;
      Panel.matchSel = null;
      document.querySelectorAll('#nav button').forEach(x => x.classList.toggle('activo', x === b));
      cerrarFicha();
      escribirUrl(Panel.sec);
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

  window.addEventListener('popstate', () => {
    const sec = seccionDeLaUrl() || 'resumen';
    if (sec === Panel.sec) return;
    Panel.sec = sec;
    Panel.matchSel = null;
    document.querySelectorAll('#nav button')
      .forEach(x => x.classList.toggle('activo', x.dataset.sec === sec));
    cerrarFicha();
    pintarSeccion();
  });

  $a('#recargar').addEventListener('click', () => pintarSeccion({ silencioso: false }));
  $a('#salirPanel').addEventListener('click', () => { location.href = '/app'; });
  $a('#ficha').addEventListener('click', (e) => {
    if (e.target.dataset.cerrarFicha !== undefined) cerrarFicha();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$a('#ficha').hidden) cerrarFicha();
    else abrirMenu(false);
  });
}

/* ── Direcciones del panel ────────────────────────────────
   Cada sección vive en /admin/<seccion>. Sirve para recargar sin volver al
   resumen, para compartir el enlace de una pantalla y para que el botón de
   atrás del teléfono haga lo que la gente espera.
   ───────────────────────────────────────────────────────── */

function seccionDeLaUrl() {
  const m = location.pathname.match(/^\/admin\/([a-z0-9-]+)\/?$/);
  const sec = m && m[1];
  return (sec && Panel.secciones[sec]) ? sec : null;
}

function escribirUrl(sec, reemplazar) {
  const destino = sec === 'resumen' ? '/admin' : '/admin/' + sec;
  if (location.pathname === destino) return;
  history[reemplazar ? 'replaceState' : 'pushState']({ sec }, '', destino);
}

/* Salta a otra sección como si se hubiera tocado el menú. Lo usan los
   avisos de «para hacer» del Resumen. */
function irASeccion(sec) {
  const b = document.querySelector(`#nav [data-sec="${sec}"]`);
  if (b) b.click();
}

/* ── El router ────────────────────────────────────────────────
   Busca la sección en el registro y le pide que pinte. No sabe qué
   hace ninguna: todo lo particular viaja en el descriptor.
   ───────────────────────────────────────────────────────── */
async function pintarSeccion(opts) {
  const silencioso = !!(opts && opts.silencioso);
  const def = Panel.actual();
  if (!def) {
    console.error('[panel] no hay ninguna sección registrada con el slug', Panel.sec);
    $a('#cuerpo').innerHTML = `<div class="vacio-admin">
      <h3>Esa pantalla no existe</h3>
      <p>No hay ninguna sección que se llame «${esc(Panel.sec)}».</p>
    </div>`;
    return;
  }

  $a('#secTitulo').textContent = def.titulo;
  $a('#secBajada').textContent = def.bajada;
  $a('#periodo').hidden = !def.periodo;

  // Alguna sección pide una clase en el marco (Documentos usa el ancho entero).
  for (const otra of Object.values(Panel.secciones)) {
    if (otra.claseCuerpo) $a('#admin').classList.toggle(otra.claseCuerpo, otra === def);
  }

  // Las que no entran en el refresco automático sólo actualizan los numeritos.
  if (silencioso && def.refrescar === false) {
    actualizarInsignias().catch(() => {});
    return;
  }

  const conserva = !!(def.conservar && def.conservar());
  if (!silencioso && !conserva) {
    $a('#cuerpo').innerHTML = '<p class="cargando">Cargando…</p>';
  }

  const btn = $a('#recargar');
  if (btn) { btn.classList.add('girando'); btn.textContent = 'Actualizando…'; }

  try {
    const cuerpo = $a('#cuerpo');
    if (silencioso && def.pintarVivo) await def.pintarVivo(cuerpo);
    else await def.pintar(cuerpo);
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

function marcarActualizado() {
  Panel.actualizado = new Date();
  const el = $a('#marcaTiempo');
  if (!el) return;
  const hora = Panel.actualizado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.innerHTML = `<span class="punto-vivo" aria-hidden="true"></span> En vivo · ${hora}`;
}

/* Los numeritos rojos del menú. Cada sección dice el suyo con `insignia`, y
   se piden todos juntos: esto corre cada 12 segundos, así que van contando
   (`head: true`) y no trayendo las filas enteras. */
async function actualizarInsignias() {
  const conInsignia = Object.entries(Panel.secciones).filter(([, d]) => typeof d.insignia === 'function');
  if (!conInsignia.length) return;

  const valores = await Promise.all(conInsignia.map(([, d]) => d.insignia()));

  conInsignia.forEach(([slug], i) => {
    const n = Number(valores[i]) || 0;
    const b = document.querySelector(`#nav [data-sec="${slug}"]`);
    if (!b) return;
    let g = b.querySelector('.nav-insignia');
    if (!n) { if (g) g.remove(); return; }
    if (!g) { g = document.createElement('span'); g.className = 'nav-insignia'; b.appendChild(g); }
    g.textContent = n > 99 ? '99+' : String(n);
  });
}

function arrancarVivo() {
  if (Panel.vivo) return;
  Panel.vivo = setInterval(() => {
    if (document.hidden) return;
    if (Panel.actual()?.refrescar === false) return;
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
    if (!document.hidden && Panel.actual()?.refrescar !== false) pintarSeccion({ silencioso: true });
  });
}

let _refresco;
function programarRefresco(mov) {
  clearTimeout(_refresco);
  _refresco = setTimeout(() => {
    if (Panel.actual()?.refrescar === false) return;
    if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if ($a('#ficha') && !$a('#ficha').hidden) return;
    const propio = mov && Panel.admin && mov.actor_id === Panel.admin.id;
    if (!propio) {
      brindis((mov && mov.resumen) ? mov.resumen : 'Hay movimiento nuevo en la app');
    }
    pintarSeccion({ silencioso: true });
  }, 400);
}


/* ── Arranque ─────────────────────────────────────────────────
   Recién cuando terminaron de cargar todos los archivos de sección,
   así el registro está completo antes de que el router lo mire. Los
   scripts van al final del <body>, o sea que este evento llega
   después de todos ellos.
   ───────────────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', abrirPanel, { once: true });
} else {
  abrirPanel();
}
