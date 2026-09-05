/* ============================================================
   CONTRATÁ YA — Aplicación
   Demostración funcional. El estado vive en el navegador.
   ============================================================ */

const TONOS = ['#F0A63A', '#2FB2A6', '#7E9BD4', '#C39BD3', '#E4574C', '#8FBF6A', '#E8955F'];
const tonoDe = (n) => TONOS[n % TONOS.length];
const iniciales = (n) => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const rubroDe = (id) => RUBROS.find(r => r.id === id);
const urgenciaDe = (id) => URGENCIAS.find(u => u.id === id) || { id: id || '', nombre: '—', detalle: '' };
const URGENCIA_TODOS = { id: 'todos', nombre: 'Todos', detalle: 'Urgentes, esta semana y sin apuro' };
const plata = (n) => '$' + n.toLocaleString('es-AR');
const estrellas = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const buscarPersona = (id, tipo) =>
  tipo === 'cliente' ? CLIENTES.find(c => c.id === id) : PROFESIONALES.find(p => p.id === id);
const planId = (id) => (!id || id === 'verificado') ? 'gratis' : id;
const planDe = (id) => PLANES.find(p => p.id === planId(id)) || PLANES[0];
const esPlanPro = (id) => planId(id) === 'pro';
const maxZonas = () => esPlanPro(Estado.yo?.plan) ? LOCALIDADES.length : 3;
const cuentaActiva = () => !Estado.usuario || Estado.yo?.uso_activado !== false;

/* Fotos disponibles para el usuario que se registra */
const FOTOS_PERFIL = [
  '/img/gente/c02.svg', '/img/gente/c01.svg', '/img/gente/c05.svg', '/img/gente/c06.svg',
  '/img/gente/p03.svg', '/img/gente/p08.svg', '/img/gente/p10.svg', '/img/gente/p15.svg'
];

/* ── Estado ─────────────────────────────────────────────── */
const Estado = {
  usuario: null,     // { nombre, correo, metodo, foto, puntaje, trabajos, desde }
  rol: null,         // 'cliente' | 'pro'
  zona: null,
  pedido: { rubro: null, urgencia: null, detalle: '' },
  vistos: [],
  matches: [],       // { id, tipo, cuando, leido, calificado }
  vista: 'buscar',
  yo: {              // datos del perfil profesional
    rubro: 'albanileria',
    localidad: 'San Bernardo',
    plan: 'gratis',
    verificacion: ['telefono', 'email']
  }
};

const guardar = () => {
  try { sessionStorage.setItem('contrataya', JSON.stringify(Estado)); } catch {}
};
const recuperar = () => {
  try {
    const c = sessionStorage.getItem('contrataya');
    if (c) Object.assign(Estado, JSON.parse(c));
  } catch {}
};

/* ── Interfaz ───────────────────────────────────────────── */
const $ = (s) => document.querySelector(s);
const escena = $('#escena');
const tabs = $('#tabs');
const barra = $('#barra');

function brindis(texto) {
  const b = $('#brindis');
  b.textContent = texto;
  b.hidden = false;
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.hidden = true; }, 2600);
}

/* Un botón que se apaga y dice "Enviando…" tiene que volver, pase lo que
   pase. Había tres que si la cosa fallaba por un camino inesperado quedaban
   apagados para siempre, con la persona mirando una pantalla que no responde
   y sin manera de salir. */
async function ocupar(boton, textoOcupado, tarea) {
  if (!boton) return tarea();
  const original = boton.textContent;
  boton.disabled = true;
  boton.textContent = textoOcupado;
  try {
    return await tarea();
  } finally {
    if (document.body.contains(boton)) {
      boton.disabled = false;
      boton.textContent = original;
    }
  }
}

function abrirHoja(html) {
  const hoja = $('#hoja');
  const panel = $('#hojaPanel');
  panel.scrollTop = 0;
  panel.style.transform = '';
  panel.innerHTML =
    '<div class="hoja-tirador"></div>' +
    '<button class="hoja-cerrar" data-cerrar aria-label="Cerrar">✕</button>' +
    html;
  hoja.hidden = false;
  document.body.style.overflow = 'hidden';
  return panel;
}
function cerrarHoja() {
  const panel = $('#hojaPanel');
  $('#hoja').hidden = true;
  if (panel) panel.style.transform = '';
  document.body.style.overflow = '';
}

/* La barrita de arriba parecía un tirador pero no hacía nada: se podía
   arrastrar y la hoja no se movía. Ahora sí baja y se cierra.
   Sólo arranca si la hoja está arriba de todo, para no pelearle al scroll. */
(function arrastreDeHoja() {
  const panel = $('#hojaPanel');
  if (!panel) return;
  let inicio = null, corrido = 0;

  panel.addEventListener('touchstart', e => {
    if (panel.scrollTop > 0) { inicio = null; return; }
    inicio = e.touches[0].clientY;
    corrido = 0;
    panel.style.transition = 'none';
  }, { passive: true });

  panel.addEventListener('touchmove', e => {
    if (inicio === null) return;
    corrido = e.touches[0].clientY - inicio;
    if (corrido <= 0) return;                   // para arriba no
    panel.style.transform = `translateY(${corrido}px)`;
  }, { passive: true });

  panel.addEventListener('touchend', () => {
    if (inicio === null) return;
    panel.style.transition = 'transform .26s cubic-bezier(0.22,1,0.36,1)';
    if (corrido > 90) cerrarHoja();             // pasó el umbral: se cierra
    panel.style.transform = '';                 // si no, vuelve a su lugar
    inicio = null;
  });
})();
$('#hoja').addEventListener('click', e => { if (e.target.dataset.cerrar !== undefined) cerrarHoja(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#hoja').hidden) cerrarHoja(); });

const sponsorDe = (loc) => SPONSORS.find(s => s.localidades.includes(loc)) || SPONSORS[0];

/* ══════════════════════════════════════════════════════════
   REGISTRO — obligatorio para usar la plataforma
   ══════════════════════════════════════════════════════════ */
function verRegistro() {
  barra.hidden = true;
  tabs.hidden = true;
  // Direcciones limpias: el .html ya no existe de cara afuera.
  const destino = '/entrar?volver=' + encodeURIComponent('/app');
  escena.innerHTML = `
    <div class="bienvenida">
      <div class="bienvenida-marca">
        <img src="/img/isotipo.svg" alt="" width="30" height="30">
        <span>CONTRATÁ <b>YA</b></span>
      </div>
      <h1>Oficios de la<br>costa, <em>ya.</em></h1>
      <p>Para entrar necesitás una cuenta con tu correo y una contraseña. Es lo que permite que las calificaciones sean de personas reales y no de perfiles inventados.</p>

      <div class="roles" style="margin-top:24px">
        <a class="btn btn-plomo btn-bloque" id="conCorreo" href="${destino}">Entrar con mi correo</a>
        <a class="btn btn-fantasma btn-bloque" id="crearCuentaLink" href="${destino}">Crear una cuenta</a>
      </div>

      <p class="registro-nota">Al continuar aceptás que tu nombre y tu calificación sean visibles para la otra parte. No publicamos tu teléfono ni tu dirección.</p>
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   ELECCIÓN DE ROL
   ══════════════════════════════════════════════════════════ */
function verBienvenida() {
  barra.hidden = true;
  tabs.hidden = true;
  escena.innerHTML = `
    <div class="bienvenida">
      <div class="perfil-cabeza" style="margin-bottom:8px">
        <img class="perfil-avatar" src="${Estado.usuario.foto}" alt="">
        <div>
          <h2 style="font-size:21px">Hola, ${Estado.usuario.nombre.split(' ')[0]}</h2>
          <p>${Estado.usuario.correo}</p>
        </div>
      </div>
      <h1 style="font-size:32px">¿De qué lado del<br>mostrador estás?</h1>
      <p>Podés cambiar cuando quieras desde tu perfil.</p>

      <div class="roles">
        <button class="rol" data-rol="cliente">
          <span class="rol-glifo">⌂</span>
          <div>
            <h3>Necesito contratar</h3>
            <p>Buscar albañil, electricista, plomero, gasista o contratista</p>
          </div>
          <span class="rol-flecha">→</span>
        </button>
        <button class="rol" data-rol="pro">
          <span class="rol-glifo">⚒</span>
          <div>
            <h3>Tengo un oficio</h3>
            <p>Ver los pedidos de mi zona y armar mi calificación</p>
          </div>
          <span class="rol-flecha">→</span>
        </button>
      </div>
    </div>`;

  escena.querySelectorAll('.rol').forEach(b => {
    b.addEventListener('click', () => {
      Estado.rol = b.dataset.rol;
      Estado.vistos = [];
      guardar();
      guardarRol(b.dataset.rol);   // persistir en Supabase el lado elegido
      // Si es profesional y todavía no cargó su perfil, lo mandamos a completarlo.
      if (b.dataset.rol === 'pro' && !perfilProCompleto()) {
        verFormPerfilPro();
        return;
      }
      if (!cuentaActiva()) { verActivacion(); return; }
      barra.hidden = false;
      tabs.hidden = false;
      irA('buscar');
    });
  });
}

// ¿El profesional ya cargó su perfil real? (rubro + al menos una zona)
const perfilProCompleto = () =>
  !Estado.perfilProACompletar &&
  !!(Estado.yo && Estado.yo.rubro && Estado.yo.zonas && Estado.yo.zonas.length);

// Persistir en Supabase de qué lado del mostrador está el usuario.
async function guardarRol(rol) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (uid) await sb.from('perfiles').update({ rol }).eq('id', uid);
  } catch {}
}

/* ══════════════════════════════════════════════════════════
   BUSCAR
   ══════════════════════════════════════════════════════════ */
function verBuscar() {
  // El profesional ya dijo cuál es su oficio y en qué pueblos trabaja cuando
  // armó el perfil. Volver a preguntárselo para ver los pedidos es hacerle
  // llenar un formulario para llegar a lo mismo. Se precarga y, si quiere
  // cambiar algo, tiene el botón "Cambiar" arriba del mazo.
  if (Estado.rol === 'pro') {
    if (!Estado.pedido.rubro && Estado.yo && Estado.yo.rubro) Estado.pedido.rubro = Estado.yo.rubro;
    if (!Estado.pedido.urgencia) Estado.pedido.urgencia = 'todos';
    if (!Estado.zona && Estado.yo) Estado.zona = Estado.yo.localidad || (Estado.yo.zonas || [])[0] || null;
    if (Estado.zona) {
      const z = $('#zonaActual');
      if (z) z.textContent = Estado.zona;
    }
    guardar();
  }
  const listo = Estado.zona && Estado.pedido.rubro && Estado.pedido.urgencia;
  return listo ? verMazo() : verFormulario();
}

function verFormulario() {
  const esPro = Estado.rol === 'pro';
  escena.innerHTML = `
    <div class="vista">
      <h1 class="titulo-vista">${esPro ? 'Buscar trabajos' : '¿Qué necesitás?'}</h1>
      <p class="sub-vista">${esPro
        ? 'Elegí tu rubro y tu zona. Te muestro los pedidos abiertos de gente que está buscando.'
        : 'Tres datos y te muestro quién trabaja cerca tuyo.'}</p>

      <div id="cintaIOS"></div>

      <div class="campo">
        <span class="campo-rotulo">${esPro ? 'Tu rubro' : 'Rubro'}</span>
        <div class="fichas" id="fichasRubro"></div>
      </div>

      <div class="campo">
        <span class="campo-rotulo">Localidad</span>
        <button class="btn btn-fantasma btn-bloque" id="abrirZonas">${Estado.zona || 'Elegir localidad'}</button>
      </div>

      <div class="campo">
        <span class="campo-rotulo">${esPro ? 'Qué trabajos querés ver' : '¿Corre apuro?'}</span>
        <div class="urgencias" id="urgencias"></div>
      </div>

      ${esPro ? '' : `
      <div class="campo">
        <span class="campo-rotulo">Contá un poco más <span style="text-transform:none;letter-spacing:0">(opcional)</span></span>
        <textarea class="area" id="detalle" placeholder="Ej: se filtra agua por el techo del baño desde la última tormenta">${Estado.pedido.detalle}</textarea>
      </div>`}

      <button class="btn btn-plomo btn-bloque" id="empezar" disabled>
        ${esPro ? 'Ver pedidos abiertos' : 'Ver quién hay cerca'}
      </button>
    </div>`;

  cintaInstalacionIOS();

  const cont = $('#fichasRubro');
  RUBROS.forEach(r => {
    const b = document.createElement('button');
    b.className = 'ficha' + (Estado.pedido.rubro === r.id ? ' elegida' : '');
    b.innerHTML = `<span class="ficha-glifo">${r.glifo}</span>${r.nombre}`;
    b.addEventListener('click', () => {
      Estado.pedido.rubro = r.id;
      if (esPro) Estado.yo.rubro = r.id;
      cont.querySelectorAll('.ficha').forEach(f => f.classList.remove('elegida'));
      b.classList.add('elegida');
      revisar();
    });
    cont.appendChild(b);
  });

  const cu = $('#urgencias');
  const listaUrg = esPro ? [URGENCIA_TODOS, ...URGENCIAS] : URGENCIAS;
  listaUrg.forEach(u => {
    const b = document.createElement('button');
    b.className = 'urgencia' + (Estado.pedido.urgencia === u.id ? ' elegida' : '');
    b.innerHTML = `<span class="urgencia-radio"></span><span><b>${u.nombre}</b><span>${u.detalle}</span></span>`;
    b.addEventListener('click', () => {
      Estado.pedido.urgencia = u.id;
      cu.querySelectorAll('.urgencia').forEach(x => x.classList.remove('elegida'));
      b.classList.add('elegida');
      revisar();
    });
    cu.appendChild(b);
  });

  $('#abrirZonas').addEventListener('click', () => elegirZona());
  const det = $('#detalle');
  if (det) det.addEventListener('input', e => { Estado.pedido.detalle = e.target.value; });

  function revisar() {
    const urgOk = esPro
      ? !!Estado.pedido.urgencia
      : !!(Estado.pedido.urgencia && Estado.pedido.urgencia !== 'todos');
    $('#empezar').disabled = !(Estado.zona && Estado.pedido.rubro && urgOk);
  }
  revisar();

  $('#empezar').addEventListener('click', async () => {
    Estado.vistos = [];
    if (esPro) {
      Estado.yo.localidad = Estado.zona;
      guardar();
      verMazo();
      return;
    }
    // Cliente: publicamos (o reutilizamos) su pedido real en Supabase.
    const boton = $('#empezar');
    const txt = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Publicando tu pedido…';
    const ok = await asegurarPedido();
    if (!ok) {
      boton.disabled = false;
      boton.textContent = txt;
      return;
    }
    guardar();
    verMazo();
  });
}

// Crea el pedido del cliente en Supabase, o reutiliza uno abierto igual.
// Deja el id en Estado.pedido.id para las etapas siguientes (matches).
async function asegurarPedido() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) { brindis('Se cerró la sesión. Entrá de nuevo.'); return false; }

    const p = Estado.pedido;
    if (!p.urgencia || p.urgencia === 'todos') {
      brindis('Elegí si corre apuro');
      return false;
    }

    // ¿Ya tengo un pedido abierto para este rubro y localidad? Lo reutilizo.
    const { data: existentes } = await sb.from('pedidos')
      .select('id')
      .eq('cliente_id', uid)
      .eq('rubro', p.rubro)
      .eq('localidad', Estado.zona)
      .eq('estado', 'abierto')
      .limit(1);

    if (existentes && existentes.length) {
      Estado.pedido.id = existentes[0].id;
      await sb.from('pedidos')
        .update({ urgencia: p.urgencia, detalle: p.detalle || null })
        .eq('id', existentes[0].id);
      return true;
    }

    if (await frenadoPorCalificar()) return false;

    const { data: nuevo, error } = await sb.from('pedidos').insert({
      cliente_id: uid,
      rubro: p.rubro,
      localidad: Estado.zona,
      urgencia: p.urgencia,
      detalle: p.detalle || null
    }).select('id').single();

    if (error) {
      // 42501 es el rechazo de RLS: casi seguro, la calificación pendiente.
      if (error.code === '42501') { explicarBloqueo(); return false; }
      brindis('No se pudo publicar el pedido: ' + error.message);
      return false;
    }
    Estado.pedido.id = nuevo.id;
    return true;
  } catch (e) {
    brindis('No se pudo publicar el pedido');
    return false;
  }
}

function elegirZona(alElegir) {
  const items = LOCALIDADES.map((l, i) => `
    <button class="zona-item ${Estado.zona === l ? 'elegida' : ''}" data-zona="${l}">
      <span class="zona-n">${String(i + 1).padStart(2, '0')}</span>
      <span>${l}</span>
      ${Estado.zona === l ? '<span class="zona-tilde">✓</span>' : ''}
    </button>`).join('');

  const panel = abrirHoja(`
    <h2>Elegí tu localidad</h2>
    <p>Las 14 del Partido de la Costa, de norte a sur.</p>
    <div class="zonas-lista">${items}</div>`);

  panel.querySelectorAll('.zona-item').forEach(b => {
    b.addEventListener('click', () => {
      Estado.zona = b.dataset.zona;
      Estado.vistos = [];
      guardar();
      cerrarHoja();
      $('#zonaActual').textContent = Estado.zona;
      if (typeof alElegir === 'function') alElegir(); else irA(Estado.vista);
    });
  });
}

/* ══════════════════════════════════════════════════════════
   PERFIL PROFESIONAL — cargar y editar (se guarda en Supabase)
   ══════════════════════════════════════════════════════════ */
function verFormPerfilPro(volverA) {
  const yo = Estado.yo || {};
  const u = Estado.usuario || {};
  let rubroSel = yo.rubro || null;
  const zonasSel = new Set((yo.zonas && yo.zonas.length) ? yo.zonas : (yo.localidad ? [yo.localidad] : []));

  escena.innerHTML = `
    <div class="vista">
      <h1 class="titulo-vista">Tu perfil profesional</h1>
      <p class="sub-vista">Estos son los datos que ven los clientes cuando aparecés. Podés editarlos cuando quieras.</p>

      <div class="campo">
        <span class="campo-rotulo">Tu nombre</span>
        <input class="chat-campo" id="ppNombre" placeholder="Nombre y apellido" autocomplete="name">
      </div>

      <div class="campo">
        <span class="campo-rotulo">Tu rubro</span>
        <div class="fichas" id="ppRubro"></div>
      </div>

      <div class="campo">
        <span class="campo-rotulo">Dónde trabajás <span style="text-transform:none;letter-spacing:0">(${esPlanPro(yo.plan) ? 'todas las que necesites' : 'hasta 3 localidades'})</span></span>
        <div class="fichas" id="ppZonas"></div>
      </div>

      <div class="campo">
        <span class="campo-rotulo">Años en el oficio</span>
        <input class="chat-campo" id="ppAnios" inputmode="numeric" placeholder="Ej: 12" value="${yo.anios ?? ''}">
      </div>

      <div class="campo">
        <span class="campo-rotulo">Precio desde <span style="text-transform:none;letter-spacing:0">(en pesos, opcional)</span></span>
        <input class="chat-campo" id="ppPrecio" inputmode="numeric" placeholder="Ej: 30000" value="${yo.precio_desde ?? ''}">
      </div>

      <div class="campo">
        <span class="campo-rotulo">Descripción</span>
        <textarea class="area" id="ppBio" placeholder="Contá qué hacés, cómo trabajás, si das presupuesto sin cargo…">${yo.bio || ''}</textarea>
      </div>

      <div class="campo">
        <span class="campo-rotulo">Especialidades <span style="text-transform:none;letter-spacing:0">(separadas por coma)</span></span>
        <input class="chat-campo" id="ppEsp" placeholder="Ej: Revoque fino, Contrapisos, Ampliaciones" value="${(yo.especialidades || []).join(', ')}">
      </div>

      <div class="campo">
        <span class="campo-rotulo">Instagram</span>
        <input class="chat-campo" id="ppIg" placeholder="@tunombre o el enlace" value="${(yo.instagram || '').replace(/"/g, '&quot;')}">
        <p class="sub-vista" style="margin-top:6px">Se ve en la ficha del mazo con el plan Pro.</p>
      </div>

      <div class="campo">
        <span class="campo-rotulo">Facebook</span>
        <input class="chat-campo" id="ppFb" placeholder="Tu perfil o página" value="${(yo.facebook || '').replace(/"/g, '&quot;')}">
      </div>

      <div class="campo">
        <span class="campo-rotulo">Galería de trabajos <span style="text-transform:none;letter-spacing:0">(hasta ${GALERIA_MAX})</span></span>
        ${esPlanPro(yo.plan) ? `<div class="galeria-editar" id="ppGaleria"></div>
        <input type="file" id="ppGaleriaArchivo" accept="image/*" hidden>` : `
        <p class="sub-vista">Con el plan Pro tus fotos aparecen en la ficha del mazo.</p>
        <a class="btn btn-plomo btn-bloque btn-sm" id="ppPedirPro" href="#" target="_blank" rel="noopener noreferrer" style="margin-top:10px">Pedir plan</a>`}
      </div>

      <button class="btn btn-plomo btn-bloque" id="ppGuardar" style="margin-top:20px">Guardar mi perfil</button>
    </div>`;

  $('#ppNombre').value = u.nombre || '';

  // Rubro: se elige uno solo
  const contR = $('#ppRubro');
  RUBROS.forEach(r => {
    const b = document.createElement('button');
    b.className = 'ficha' + (rubroSel === r.id ? ' elegida' : '');
    b.innerHTML = `<span class="ficha-glifo">${r.glifo}</span>${r.nombre}`;
    b.addEventListener('click', () => {
      rubroSel = r.id;
      contR.querySelectorAll('.ficha').forEach(f => f.classList.remove('elegida'));
      b.classList.add('elegida');
    });
    contR.appendChild(b);
  });

  const topeZonas = maxZonas();
  // Zonas: 3 en Gratis, todas en Pro
  const contZ = $('#ppZonas');
  LOCALIDADES.forEach(l => {
    const b = document.createElement('button');
    b.className = 'ficha' + (zonasSel.has(l) ? ' elegida' : '');
    b.textContent = l;
    b.addEventListener('click', () => {
      if (zonasSel.has(l)) {
        zonasSel.delete(l);
        b.classList.remove('elegida');
      } else {
        if (zonasSel.size >= topeZonas) {
          brindis(esPlanPro(yo.plan)
            ? 'Esas son todas las localidades'
            : 'En Gratis Verificado son hasta 3. Con Pro, todas las que necesites.');
          return;
        }
        zonasSel.add(l);
        b.classList.add('elegida');
      }
    });
    contZ.appendChild(b);
  });

  if ($('#ppPedirPro')) $('#ppPedirPro').href = enlacePedirPlanPro();
  if ($('#ppGaleria')) pintarGaleriaEditor();

  $('#ppGuardar').addEventListener('click', async () => {
    const nombre = $('#ppNombre').value.trim();
    if (!nombre) { brindis('Poné tu nombre'); return; }
    if (!rubroSel) { brindis('Elegí tu rubro'); return; }
    const zonas = [...zonasSel];
    if (zonas.length === 0) { brindis('Elegí al menos una localidad'); return; }

    const anios  = parseInt($('#ppAnios').value, 10);
    const precio = parseInt($('#ppPrecio').value, 10);
    const bio    = $('#ppBio').value.trim();
    const esp    = $('#ppEsp').value.split(',').map(s => s.trim()).filter(Boolean);
    const instagram = ($('#ppIg') && $('#ppIg').value.trim()) || '';
    const facebook  = ($('#ppFb') && $('#ppFb').value.trim()) || '';

    const boton = $('#ppGuardar');
    boton.disabled = true;
    boton.textContent = 'Guardando…';

    // ¿Quién soy? (id de la sesión, por si el guardado local viejo no lo tenía)
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      boton.disabled = false;
      boton.textContent = 'Guardar mi perfil';
      brindis('Se cerró la sesión. Entrá de nuevo.');
      return;
    }

    const cambios = {
      rol: 'pro',
      nombre,
      rubro: rubroSel,
      localidad: zonas[0],   // zona principal = la primera elegida
      zonas,
      anios:  Number.isFinite(anios)  ? anios  : null,
      precio_desde: Number.isFinite(precio) ? precio : null,
      bio,
      especialidades: esp,
      instagram: instagram || null,
      facebook: facebook || null
    };

    const { error } = await sb.from('perfiles').update(cambios).eq('id', uid);
    if (error) {
      boton.disabled = false;
      boton.textContent = 'Guardar mi perfil';
      brindis('No se pudo guardar: ' + error.message);
      return;
    }

    // Reflejar en memoria
    if (!Estado.usuario) Estado.usuario = {};
    Estado.usuario.id = uid;
    Estado.usuario.nombre = nombre;
    Estado.rol = 'pro';
    Estado.zona = zonas[0];
    Estado.yo = Object.assign({}, Estado.yo, {
      rubro: rubroSel, localidad: zonas[0], zonas,
      anios: cambios.anios, precio_desde: cambios.precio_desde,
      bio, especialidades: esp, instagram, facebook
    });
    Estado.perfilProACompletar = false;
    // La búsqueda vieja podía haber quedado con el rubro por omisión.
    Estado.pedido.rubro = rubroSel;
    Estado.vistos = [];
    guardar();
    brindis('Perfil guardado');

    if (!cuentaActiva()) { verActivacion(); return; }
    barra.hidden = false;
    tabs.hidden = false;
    if (typeof volverA === 'function') volverA();
    else irA('perfil');
  });
}

/* ══════════════════════════════════════════════════════════
   PERFIL CLIENTE — editar (se guarda en Supabase)
   ══════════════════════════════════════════════════════════ */
function verFormPerfilCliente(volverA) {
  const u = Estado.usuario || {};
  let locSel = Estado.zona || null;
  let ausenteSel = !!(Estado.yo && Estado.yo.ausente);
  const nombreVal = (u.nombre || '').replace(/"/g, '&quot;');

  escena.innerHTML = `
    <div class="vista">
      <h1 class="titulo-vista">Tu perfil</h1>
      <p class="sub-vista">Estos datos ayudan a mostrarte profesionales de tu zona. Podés editarlos cuando quieras.</p>

      <div class="campo">
        <span class="campo-rotulo">Tu nombre</span>
        <input class="chat-campo" id="pcNombre" placeholder="Nombre y apellido" value="${nombreVal}">
      </div>

      <div class="campo">
        <span class="campo-rotulo">Tu localidad</span>
        <div class="fichas" id="pcZona"></div>
      </div>

      <div class="campo">
        <span class="campo-rotulo">¿Sos propietario ausente? <span style="text-transform:none;letter-spacing:0">(no vivís en la costa)</span></span>
        <div class="fichas" id="pcAusente">
          <button class="ficha ${!ausenteSel ? 'elegida' : ''}" data-aus="no">No, vivo acá</button>
          <button class="ficha ${ausenteSel ? 'elegida' : ''}" data-aus="si">Sí, vivo lejos</button>
        </div>
      </div>

      <button class="btn btn-plomo btn-bloque" id="pcGuardar" style="margin-top:20px">Guardar mi perfil</button>
    </div>`;

  const contZ = $('#pcZona');
  LOCALIDADES.forEach(l => {
    const b = document.createElement('button');
    b.className = 'ficha' + (locSel === l ? ' elegida' : '');
    b.textContent = l;
    b.addEventListener('click', () => {
      locSel = l;
      contZ.querySelectorAll('.ficha').forEach(f => f.classList.remove('elegida'));
      b.classList.add('elegida');
    });
    contZ.appendChild(b);
  });

  $('#pcAusente').querySelectorAll('[data-aus]').forEach(b => {
    b.addEventListener('click', () => {
      ausenteSel = b.dataset.aus === 'si';
      $('#pcAusente').querySelectorAll('.ficha').forEach(f => f.classList.remove('elegida'));
      b.classList.add('elegida');
    });
  });

  $('#pcGuardar').addEventListener('click', async () => {
    const nombre = $('#pcNombre').value.trim();
    if (!nombre) { brindis('Poné tu nombre'); return; }
    if (!locSel) { brindis('Elegí tu localidad'); return; }

    const boton = $('#pcGuardar');
    boton.disabled = true;
    boton.textContent = 'Guardando…';

    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      boton.disabled = false;
      boton.textContent = 'Guardar mi perfil';
      brindis('Se cerró la sesión. Entrá de nuevo.');
      return;
    }

    const cambios = { rol: 'cliente', nombre, localidad: locSel, ausente: ausenteSel };
    const { error } = await sb.from('perfiles').update(cambios).eq('id', uid);
    if (error) {
      boton.disabled = false;
      boton.textContent = 'Guardar mi perfil';
      brindis('No se pudo guardar: ' + error.message);
      return;
    }

    if (!Estado.usuario) Estado.usuario = {};
    Estado.usuario.id = uid;
    Estado.usuario.nombre = nombre;
    Estado.rol = 'cliente';
    Estado.zona = locSel;
    if (!Estado.yo) Estado.yo = {};
    Estado.yo.ausente = ausenteSel;
    guardar();
    brindis('Perfil guardado');

    if (!cuentaActiva()) { verActivacion(); return; }
    barra.hidden = false;
    tabs.hidden = false;
    if (typeof volverA === 'function') volverA();
    else irA('perfil');
  });
}

/* ── El radio de búsqueda ────────────────────────────────────
   El Partido de la Costa son catorce pueblos chicos pegados uno
   al lado del otro sobre la misma ruta. Buscar sólo adentro del
   propio deja el mazo vacío casi siempre: medido sobre la base,
   nueve de cada diez combinaciones de oficio y localidad no
   tienen a nadie. Así que el mazo abre el radio solo: primero tu
   localidad, después las de al lado, después todo el partido, y
   lo dice en pantalla para que nadie se sorprenda de ver a
   alguien de otro pueblo.
   ─────────────────────────────────────────────────────────── */
const VECINAS_A_CADA_LADO = 2;

function vecinasDe(zona) {
  const i = LOCALIDADES.indexOf(zona);
  if (i < 0) return [];
  const salida = [];
  for (let d = 1; d <= VECINAS_A_CADA_LADO; d++) {
    if (LOCALIDADES[i - d]) salida.push(LOCALIDADES[i - d]);
    if (LOCALIDADES[i + d]) salida.push(LOCALIDADES[i + d]);
  }
  return salida;
}

// 0 = en tu localidad · 1 = al lado (o donde vos trabajás) · 2 = resto del partido
function anilloDe(donde, zona, propias) {
  const lista = (Array.isArray(donde) ? donde : [donde]).filter(Boolean);
  if (!zona) return 0;
  if (lista.includes(zona)) return 0;
  const cerca = new Set(vecinasDe(zona).concat((propias || []).filter(Boolean)));
  if (lista.some(l => cerca.has(l))) return 1;
  return 2;
}

const NOMBRE_ANILLO = ['acá', 'al lado', 'en el partido'];

// Resumen de dónde salió lo que estás viendo, para contarlo en pantalla.
function resumenRadio(lista, zona) {
  const cerca = lista.filter(x => (x._anillo || 0) === 0).length;
  const lejos = lista.filter(x => (x._anillo || 0) > 0);
  const pueblos = [];
  lejos.forEach(x => { const l = x.localidad; if (l && l !== zona && !pueblos.includes(l)) pueblos.push(l); });
  return { cerca, lejos: lejos.length, pueblos };
}

function htmlRadioMazo(lista, esPro) {
  const zona = Estado.zona;
  const r = resumenRadio(lista, zona);
  if (!r.lejos || !zona) return '';
  const que = esPro ? 'pedidos' : 'profesionales';
  const donde = r.pueblos.slice(0, 3).join(', ') + (r.pueblos.length > 3 ? ' y alrededores' : '');
  if (r.cerca === 0) {
    return `<p class="mazo-radio">No hay ${que} en <b>${escapar(zona)}</b>. Te muestro los de ${escapar(donde)}.</p>`;
  }
  return `<p class="mazo-radio">Después de los de <b>${escapar(zona)}</b> seguís con los de ${escapar(donde)}.</p>`;
}

/* ── Candidatos según el rol ────────────────────────────── */
// Cache de pedidos reales traídos de Supabase (lado profesional).
let pedidosPro = [];

// Trae los pedidos abiertos reales del rubro y la zona del profesional,
// salteando los que ya deslizó, y los deja con el mismo formato que una
// tarjeta de cliente de la demo (así el dibujo de las tarjetas no cambia).
async function cargarPedidosPro() {
  pedidosPro = [];
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;

    // Qué deslicé antes: los "sí" (ya son match) no vuelven; los "no" reaparecen al final.
    const { data: desl } = await sb.from('deslizamientos')
      .select('pedido_id,direccion').eq('usuario_id', uid);
    // En la base conviven dos formas de escribir lo mismo: 'si'/'no' (lo que
    // escribe la app) y 'der'/'izq' (lo que quedó de la carga inicial de datos).
    // Si sólo miráramos 'si', un pedido ya aceptado volvería al mazo.
    const esSi = (d) => d.direccion === 'si' || d.direccion === 'der';
    const dijeSi = new Set((desl || []).filter(esSi).map(d => d.pedido_id));
    const dijeNo = new Set((desl || []).filter(d => !esSi(d)).map(d => d.pedido_id));

    // Se piden los del oficio en TODO el partido y después se ordenan por
    // cercanía. Filtrar por una sola localidad en la consulta era lo que
    // dejaba a doce de dieciséis profesionales sin ver un solo pedido.
    let qPed = sb.from('pedidos')
      .select('id,cliente_id,rubro,localidad,urgencia,detalle,presupuesto,creado_en,cliente:perfiles!cliente_id(nombre,foto_url,localidad,ausente,puntaje_cliente,contrataciones,desde_anio)')
      .eq('estado', 'abierto')
      .eq('rubro', Estado.pedido.rubro)
      .neq('cliente_id', uid)
      .order('creado_en', { ascending: false })
      .limit(120);
    if (Estado.pedido.urgencia && Estado.pedido.urgencia !== 'todos') {
      qPed = qPed.eq('urgencia', Estado.pedido.urgencia);
    }
    const { data: filas } = await qPed;

    const mapear = f => ({
      id: f.id,
      cliente_id: f.cliente_id,
      nombre: f.cliente?.nombre || 'Cliente',
      foto: f.cliente?.foto_url || FOTOS_PERFIL[0],
      localidad: f.localidad,
      ausente: f.cliente?.ausente || false,
      puntaje: (f.cliente?.puntaje_cliente != null) ? Number(f.cliente.puntaje_cliente) : 0,
      contrataciones: f.cliente?.contrataciones || 0,
      desde: f.cliente?.desde_anio || new Date().getFullYear(),
      resenas: [],
      pedido: {
        rubro: f.rubro,
        urgencia: f.urgencia,
        detalle: f.detalle || 'Sin detalle',
        presupuesto: f.presupuesto || '—'
      },
      _anillo: anilloDe(f.localidad, Estado.zona, (Estado.yo && Estado.yo.zonas) || []),
      _real: true
    });

    // Primero lo de tu pueblo, después lo de al lado, después el resto.
    // Dentro de cada anillo se respeta el orden por fecha que trajo la base.
    const porCercania = (a, b) => (a._anillo - b._anillo);

    const disponibles = (filas || []).filter(f => !dijeSi.has(f.id));
    const nuevos     = disponibles.filter(f => !dijeNo.has(f.id)).map(mapear).sort(porCercania);
    const reaparecen = disponibles.filter(f => dijeNo.has(f.id)).map(mapear).sort(porCercania);
    pedidosPro = [...nuevos, ...reaparecen];   // primero lo nuevo; los "no" al final
  } catch (e) {
    pedidosPro = [];
  }
}

// Cache de profesionales reales (lado cliente).
let profesionalesReales = [];

// Trae profesionales reales del rubro y la zona del cliente, salteando los
// que ya matcheó para este pedido, con el mismo formato que una tarjeta pro demo.
async function cargarProfesionalesCli() {
  profesionalesReales = [];
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;

    // Profesionales que ya matcheé para este pedido (para no repetirlos).
    let yaMatch = new Set();
    if (Estado.pedido.id) {
      const { data: ms } = await sb.from('matches')
        .select('profesional_id').eq('pedido_id', Estado.pedido.id);
      yaMatch = new Set((ms || []).map(m => m.profesional_id));
    }

    // Igual que del lado del profesional: se piden todos los del oficio en el
    // partido y la cercanía se resuelve acá, ordenando. Pedir sólo los que
    // declararon TU localidad dejaba el mazo del vecino vacío casi siempre.
    let q = sb.from('perfiles')
      .select('id,nombre,foto_url,rubro,localidad,zonas,plan,verificacion,bio,especialidades,puntaje_pro,trabajos,respuesta_min,anios,precio_desde,uso_activado,galeria,instagram,facebook')
      .eq('rol', 'pro')
      .eq('rubro', Estado.pedido.rubro)
      .neq('id', uid);
    let { data: filas, error: eSel } = await q;
    if (eSel) {
      const r2 = await sb.from('perfiles')
        .select('id,nombre,foto_url,rubro,localidad,zonas,plan,verificacion,bio,especialidades,puntaje_pro,trabajos,respuesta_min,anios,precio_desde')
        .eq('rol', 'pro')
        .eq('rubro', Estado.pedido.rubro)
        .neq('id', uid);
      filas = r2.data;
    }

    profesionalesReales = (filas || [])
      .filter(f => !yaMatch.has(f.id))
      .filter(f => esFotoReal(f.foto_url))   // sin foto no se muestra a nadie
      .filter(f => !f.suspendido)            // suspendido: no aparece en el mazo
      .filter(f => f.uso_activado !== false) // sin activar: no entra al mazo
      .map(f => ({
        id: f.id,
        nombre: f.nombre || 'Profesional',
        foto: f.foto_url || FOTOS_PERFIL[0],
        rubro: f.rubro,
        localidad: f.localidad,
        zonas: f.zonas || [],
        plan: f.plan || 'gratis',
        verificacion: f.verificacion || [],
        bio: f.bio || 'Sin descripción todavía.',
        especialidades: f.especialidades || [],
        galeria: esPlanPro(f.plan) ? (f.galeria || []) : [],
        instagram: esPlanPro(f.plan) ? (f.instagram || '') : '',
        facebook: esPlanPro(f.plan) ? (f.facebook || '') : '',
        puntaje: (f.puntaje_pro != null) ? Number(f.puntaje_pro) : 0,
        trabajos: f.trabajos || 0,
        respuesta: f.respuesta_min || 0,
        anios: f.anios || 0,
        desde: f.precio_desde || 0,
        resenas: [],
        _anillo: anilloDe((f.zonas || []).concat([f.localidad]), Estado.zona, []),
        _real: true
      }));

    // Cercanía primero; adentro de cada anillo, el plan Pro y después el puntaje.
    profesionalesReales.sort((a, b) => {
      if (a._anillo !== b._anillo) return a._anillo - b._anillo;
      const pa = esPlanPro(a.plan) ? 1 : 0;
      const pb = esPlanPro(b.plan) ? 1 : 0;
      if (pb !== pa) return pb - pa;
      return (b.puntaje || 0) - (a.puntaje || 0);
    });
  } catch (e) {
    profesionalesReales = [];
  }
}

function candidatos() {
  if (Estado.rol === 'pro') {
    const urg = Estado.pedido.urgencia;
    return pedidosPro.filter(c => {
      if (Estado.vistos.includes(c.id)) return false;
      if (urg && urg !== 'todos' && c.pedido.urgencia !== urg) return false;
      return true;
    });
  }
  // El cliente ve profesionales reales (traídos de Supabase).
  return profesionalesReales.filter(p => !Estado.vistos.includes(p.id));
}

async function verMazo() {
  const esPro = Estado.rol === 'pro';

  // Mientras busca, se ve la silueta de una tarjeta en su lugar exacto.
  // Una pantalla en blanco con la palabra “cargando” parece que se colgó.
  escena.innerHTML = `
    <div class="vista vista-mazo" data-cargando="mazo">
      <div class="resumen-busqueda" style="pointer-events:none">
        <span class="esq-linea" style="width:64%;height:14px"></span>
      </div>
      <div class="mazo-app">${typeof esqueletoMazo === 'function' ? esqueletoMazo() : ''}</div>
      <div class="controles">
        <span class="disco esq-disco"></span>
        <span class="pastilla-info esq-pastilla"></span>
        <span class="disco disco-si esq-disco"></span>
      </div>
    </div>`;
  if (esPro) await cargarPedidosPro();
  else await cargarProfesionalesCli();
  // Si mientras buscaba la persona se fue a otra pantalla, no le pisamos lo que está mirando.
  if (!escena.querySelector('[data-cargando="mazo"]')) return;

  const lista = candidatos();
  const rubro = rubroDe(Estado.pedido.rubro);
  const urgResumen = esPro
    ? (Estado.pedido.urgencia === 'todos' ? 'Todos' : (urgenciaDe(Estado.pedido.urgencia).nombre || ''))
    : '';

  escena.innerHTML = `
    <div class="vista vista-mazo">
      <div class="filtros-mazo" id="filtrosMazo">
        <button class="filtro-chip" data-filtro="rubro">
          <span class="chip-glifo">${rubro.glifo || ''}</span>
          <span class="chip-texto">${rubro.nombre}</span>
          <span class="chip-flecha">▾</span>
        </button>
        <button class="filtro-chip" data-filtro="zona">
          <span class="chip-texto">${Estado.zona || 'Elegir zona'}</span>
          <span class="chip-flecha">▾</span>
        </button>
        ${esPro ? `<button class="filtro-chip filtro-chip-suave" data-filtro="urgencia">
          <span class="chip-texto">${urgResumen || 'Todos'}</span>
          <span class="chip-flecha">▾</span>
        </button>` : ''}
        <span class="filtro-cuenta" id="mazoCuenta">${lista.length} ${esPro ? (lista.length === 1 ? 'pedido' : 'pedidos') : (lista.length === 1 ? 'disponible' : 'disponibles')}</span>
      </div>
      ${htmlRadioMazo(lista, esPro)}
      <div class="mazo-zona">
        <div class="mazo-app" id="mazo"></div>
        <div class="controles">
        <button class="btn-deshacer" id="btnDeshacer" type="button" hidden aria-label="Deshacer el último que pasaste">Deshacer</button>
        <button class="disco disco-no" id="btnNo" aria-label="Paso, no me sirve">✕</button>
        <button class="pastilla-info" id="btnInfo" aria-label="Ver la ficha completa">Ver ficha</button>
        <button class="disco disco-si" id="btnSi" aria-label="${esPro ? 'Me interesa' : 'Me sirve'}">✓</button>
        </div>
      </div>
      <p class="mazo-voz" id="mazoVoz" role="status" aria-live="polite"></p>
      ${franjaAnunciante(esPro ? Estado.yo.rubro : Estado.pedido.rubro, Estado.zona, 'Auspicia', true)}
    </div>`;

  if (window.Buscar && Buscar.conectarChips) Buscar.conectarChips();
  pintarMazo();
  window.Avisos?.marcaDeRubro();
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
}

function pintarMazo() {
  const cont = $('#mazo');
  if (!cont) return;
  const lista = candidatos();
  const esPro = Estado.rol === 'pro';

  if (!lista.length) {
    // El mazo se vació: recargamos para que reaparezcan las que dijiste "no"
    // (los match nunca vuelven). Así nunca queda vacío si hay algo para ver.
    if (!Estado._recargandoMazo) {
      Estado._recargandoMazo = true;
      cont.innerHTML = `
        <div class="vacio" style="height:100%">
          <span class="vacio-glifo">◷</span>
          <h3>Buscando más…</h3>
        </div>`;
      (async () => {
        Estado.vistos = [];
        if (esPro) await cargarPedidosPro(); else await cargarProfesionalesCli();
        Estado._recargandoMazo = false;
        if (candidatos().length) pintarMazo();
        else mazoVacio(cont, esPro);
      })();
      return;
    }
    Estado._recargandoMazo = false;
    mazoVacio(cont, esPro);
    return;
  }

  Estado._recargandoMazo = false;
  cont.innerHTML = '';
  lista.slice(0, 3).reverse().forEach((p, i, arr) => {
    const prof = arr.length - 1 - i;
    cont.appendChild(esPro ? cartaCliente(p, prof) : cartaProfesional(p, prof));
  });


  const arriba = cont.lastElementChild;
  if (arriba) {
    arrastrable(arriba, lista[0]);
    $('#btnNo').onclick = () => resolver(arriba, lista[0], -1);
    $('#btnSi').onclick = () => resolver(arriba, lista[0], 1);
    $('#btnInfo').onclick = () => esPro ? verFichaCliente(lista[0]) : verFichaProfesional(lista[0]);
  }
}

// Cartel cuando de verdad no hay ningún pedido/profesional en todo el partido.
// Ojo: con catorce pueblos chicos, el mazo vacío no es la excepción, es lo
// más común. Así que no alcanza con un dibujito: tiene que decir qué pasó,
// qué está pasando igual sin que la persona haga nada, y qué puede hacer ahora.
function mazoVacio(cont, esPro) {
  if (!cont) return;
  const rubro = rubroDe(Estado.pedido.rubro);
  const oficio = rubro ? rubro.nombre.toLowerCase() : 'este oficio';
  const avisosListos = (typeof Notification !== 'undefined' && Notification.permission === 'granted');

  cont.innerHTML = esPro ? `
    <div class="vacio vacio-mazo">
      <span class="vacio-glifo">◷</span>
      <h3>No hay pedidos de ${escapar(oficio)}</h3>
      <p>Buscamos en toda la costa, no sólo en ${escapar(Estado.zona || 'tu zona')}. Ahora mismo no hay ninguno abierto.</p>
      <p class="vacio-clave">Cuando un vecino publique uno de tu oficio, te avisamos al toque.</p>
      <div class="vacio-acciones">
        ${avisosListos ? '' : '<button class="btn btn-plomo btn-sm" id="vacioAvisos">Avisarme cuando entre uno</button>'}
        <button class="btn btn-fantasma btn-sm" id="vacioOtroRubro">Ver otro oficio</button>
        <button class="btn btn-fantasma btn-sm" id="vacioJugar">Jugar un rato</button>
      </div>
    </div>` : `
    <div class="vacio vacio-mazo">
      <span class="vacio-glifo">◷</span>
      <h3>Todavía no hay nadie de ${escapar(oficio)}</h3>
      <p class="vacio-clave">Tu pedido ya quedó publicado. Los profesionales de la costa lo ven y, apenas alguien lo tome, te avisamos.</p>
      <p>No hace falta que hagas nada más. Si querés, mientras tanto probá con otro oficio.</p>
      <div class="vacio-acciones">
        ${avisosListos ? '' : '<button class="btn btn-plomo btn-sm" id="vacioAvisos">Avisarme cuando alguien lo tome</button>'}
        <button class="btn btn-fantasma btn-sm" id="vacioOtroRubro">Pedir otro oficio</button>
        <button class="btn btn-fantasma btn-sm" id="vacioZona">Cambiar de localidad</button>
      </div>
    </div>`;

  const b1 = $('#vacioAvisos');
  if (b1) b1.addEventListener('click', () => activarAvisos());
  const b2 = $('#vacioOtroRubro');
  if (b2) b2.addEventListener('click', verFormulario);
  const b3 = $('#vacioZona');
  if (b3) b3.addEventListener('click', () => elegirZona(verMazo));
  const b4 = $('#vacioJugar');
  if (b4) b4.addEventListener('click', () => irA('jugar'));
  window.Avisos?.vacio(cont);
}

function armazon(profundidad) {
  const carta = document.createElement('article');
  carta.className = 'carta';
  carta.style.transform = `translateY(${profundidad * -8}px) scale(${1 - profundidad * 0.035})`;
  carta.style.zIndex = String(10 - profundidad);
  carta.style.opacity = profundidad > 1 ? '0.5' : '1';
  return carta;
}

function cartaProfesional(p, profundidad) {
  const rubro = rubroDe(p.rubro);
  const verificado = p.verificacion.includes('identidad');
  const enZona = p.localidad === Estado.zona;
  const carta = armazon(profundidad);
  carta.innerHTML = `
    <span class="carta-marca marca-si">ME SIRVE</span>
    <span class="carta-marca marca-no">PASO</span>
    <span class="carta-pista"><span class="flecha">↑</span> Deslizá para ver la ficha</span>
    <span class="carta-marca marca-ficha">VER FICHA</span>
    <div class="carta-foto" style="--foto:url('${p.foto}')">
      <img src="${p.foto}" alt="Foto de ${p.nombre}" decoding="async">
      ${esPlanPro(p.plan) ? '<span class="carta-plan">Pro</span>' : ''}
      <span class="carta-glifo">${rubro.glifo}</span>
    </div>
    <div class="carta-cuerpo">
      <div class="carta-nombre">
        <h3>${p.nombre}</h3>
        ${verificado ? '<span class="sello" title="Identidad verificada">✓</span>' : ''}
      </div>
      <p class="carta-meta">${rubro.nombre} · ${p.localidad}${enZona ? '' : ' · viaja a tu zona'}</p>
      <p class="carta-bio">${p.bio}</p>
      <div class="etiquetas">${p.especialidades.slice(0, 4).map(e => `<span class="etiqueta">${e}</span>`).join('')}</div>
      <div class="carta-pie">
        <div class="carta-puntaje"><b>${p.puntaje.toFixed(1)}</b><span>${p.trabajos} trabajos · responde en ${p.respuesta} min</span></div>
        ${p.desde ? `<div class="carta-precio"><b>${plata(p.desde)}</b><span>desde</span></div>` : ''}
      </div>
    </div>`;
  return carta;
}

function cartaCliente(c, profundidad) {
  const rubro = rubroDe(c.pedido.rubro);
  const urg = urgenciaDe(c.pedido.urgencia);
  const enZona = c.localidad === Estado.zona;
  const carta = armazon(profundidad);
  carta.innerHTML = `
    <span class="carta-marca marca-si">ME INTERESA</span>
    <span class="carta-marca marca-no">PASO</span>
    <span class="carta-pista"><span class="flecha">↑</span> Deslizá para ver la ficha</span>
    <span class="carta-marca marca-ficha">VER FICHA</span>
    <div class="carta-foto" style="--foto:url('${c.foto}')">
      <img src="${c.foto}" alt="Foto de ${c.nombre}" decoding="async">
      <span class="carta-plan ${c.pedido.urgencia === 'urgente' ? 'urgente' : ''}">${urg.nombre}</span>
      <span class="carta-glifo">${rubro.glifo}</span>
    </div>
    <div class="carta-cuerpo">
      <div class="carta-nombre">
        <h3>${c.nombre}</h3>
        ${c.ausente ? '<span class="sello sello-ausente" title="Propietario no residente">◷</span>' : ''}
      </div>
      <p class="carta-meta">${c.localidad} · cliente desde ${c.desde}</p>
      <p class="carta-bio">${c.pedido.detalle}</p>
      <div class="etiquetas">
        <span class="etiqueta">${rubro.nombre}</span>
        <span class="etiqueta">${urg.detalle}</span>
        ${enZona ? '' : `<span class="etiqueta etiqueta-lejos">Es en ${c.localidad}</span>`}
        ${c.ausente ? '<span class="etiqueta">No vive en la costa</span>' : ''}
      </div>
      <div class="carta-pie">
        <div class="carta-puntaje"><b>${c.puntaje.toFixed(1)}</b><span>${c.contrataciones} contrataciones</span></div>
        ${/^[—–-]?$/.test(String(c.pedido.presupuesto || '').trim()) ? ''
          : `<div class="carta-precio"><b>${c.pedido.presupuesto}</b><span>presupuesto</span></div>`}
      </div>
    </div>`;
  return carta;
}

function arrastrable(carta, perfil) {
  let x0 = 0, y0 = 0, dx = 0, dy = 0, activo = false;
  const si = carta.querySelector('.marca-si');
  const no = carta.querySelector('.marca-no');

  carta.addEventListener('pointerdown', e => {
    activo = true; x0 = e.clientX; y0 = e.clientY;
    carta.setPointerCapture(e.pointerId);
    carta.style.transition = 'none';
  });
  carta.addEventListener('pointermove', e => {
    if (!activo) return;
    dx = e.clientX - x0; dy = e.clientY - y0;
    carta.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.055}deg)`;
    const f = Math.min(1, Math.abs(dx) / 110);
    si.style.opacity = dx > 0 ? f : 0;
    no.style.opacity = dx < 0 ? f : 0;
  });
  const soltar = () => {
    if (!activo) return;
    activo = false;
    carta.style.transition = 'transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.35s';
    if (Math.abs(dx) > 105) resolver(carta, perfil, dx > 0 ? 1 : -1);
    else { carta.style.transform = ''; si.style.opacity = 0; no.style.opacity = 0; }
    dx = 0; dy = 0;
  };
  carta.addEventListener('pointerup', soltar);
  carta.addEventListener('pointercancel', soltar);
}

// Le explica al profesional por qué no puede seguir y lo lleva a subirla.
// Se frena acá, en la primera acción, y no en el registro: así la foto se
// pide cuando ya entendió para qué sirve la app, no antes de haber visto nada.
function frenarPorFoto() {
  abrirHoja(`
    <h2>Falta tu foto</h2>
    <p>Para contactarte con clientes necesitás una foto tuya. Es lo primero que mira alguien que va a dejar entrar a un desconocido a su casa, y es lo que te diferencia del que puso un dibujito.</p>
    <p style="margin-top:10px">Mientras no la tengas, tampoco aparecés en las búsquedas.</p>
    <button class="btn btn-plomo btn-bloque" id="irAFoto" style="margin-top:20px">Subir mi foto</button>
    <button class="btn btn-fantasma btn-bloque" id="ahoraNo" style="margin-top:8px">Ahora no</button>`);

  $('#ahoraNo').addEventListener('click', cerrarHoja);
  $('#irAFoto').addEventListener('click', () => {
    cerrarHoja();
    irA('perfil');
    setTimeout(() => { const b = $('#cambiarFoto'); if (b) b.click(); }, 260);
  });
}

function resolver(carta, perfil, direccion) {
  // El "sí" del profesional crea el contacto: ahí es donde se exige la foto.
  // El "no" pasa siempre, para que pueda seguir mirando pedidos.
  if (direccion === 1 && necesitoFoto()) {
    frenarPorFoto();
    return;
  }

  if (direccion === 1) {
    frenadoPorCalificar().then(frenado => {
      if (!frenado) seguirResolviendo(carta, perfil, direccion);
    });
    return;
  }

  seguirResolviendo(carta, perfil, direccion);
}

function seguirResolviendo(carta, perfil, direccion) {

  carta.style.transition = 'transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s';
  carta.style.transform = `translate(${direccion * 620}px, 50px) rotate(${direccion * 26}deg)`;
  carta.style.opacity = '0';

  Estado.vistos.push(perfil.id);

  const esReal = perfil && perfil._real;
  if (esReal) {
    if (Estado.rol === 'pro') persistirDeslizPro(perfil, direccion);
    else persistirMatchCli(perfil, direccion);
  }

  if (direccion === 1) {
    const tipo = Estado.rol === 'pro' ? 'cliente' : 'profesional';
    // Los matches de demo se guardan en memoria; los reales viven en Supabase.
    if (!esReal) {
      Estado.matches.unshift({ id: perfil.id, tipo, cuando: Date.now(), leido: false, calificado: false });
    }
    setTimeout(() => festejarMatch(perfil, tipo, esReal), 320);
  }

  guardar();
  actualizarGlobo();
  setTimeout(pintarMazo, 300);
  setTimeout(() => window.Avisos?.mazo(), 900);
}

// Guarda en Supabase el deslizamiento del profesional y, si dijo "sí", el match.
async function persistirDeslizPro(perfil, direccion) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    const dir = direccion === 1 ? 'si' : 'no';

    await sb.from('deslizamientos').upsert(
      { pedido_id: perfil.id, usuario_id: uid, direccion: dir },
      { onConflict: 'pedido_id,usuario_id', ignoreDuplicates: false }
    );

    if (direccion === 1) {
      await sb.from('matches').upsert(
        { pedido_id: perfil.id, cliente_id: perfil.cliente_id, profesional_id: uid },
        { onConflict: 'pedido_id,profesional_id', ignoreDuplicates: true }
      );
    }
  } catch (e) { /* silencioso, no cortamos la animación */ }
}

// Guarda en Supabase el match cuando el CLIENTE elige un profesional real.
// Usa el pedido que el cliente ya publicó (Estado.pedido.id).
async function persistirMatchCli(perfil, direccion) {
  if (direccion !== 1) return;   // el "no" del cliente no se guarda por ahora
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;

    if (!Estado.pedido.id) {
      const ok = await asegurarPedido();
      if (!ok) return;
    }

    await sb.from('matches').upsert(
      { pedido_id: Estado.pedido.id, cliente_id: uid, profesional_id: perfil.id },
      { onConflict: 'pedido_id,profesional_id', ignoreDuplicates: true }
    );
  } catch (e) { /* silencioso */ }
}

function festejarMatch(perfil, tipo, esReal) {
  const esCliente = tipo === 'cliente';
  abrirHoja(`
    <div class="festejo">
      <p class="eyebrow">Hay match</p>
      <div class="festejo-par">
        <img class="festejo-disco" src="${perfil.foto}" alt="">
        <span class="festejo-nexo">◆</span>
        <img class="festejo-disco" src="${Estado.usuario.foto}" alt="">
      </div>
      <h2>${perfil.nombre.split(' ')[0]} ${esCliente ? 'quiere avanzar' : 'te puede atender'}</h2>
      <p style="margin-bottom:20px">El precio y la fecha los arreglan ustedes dos, sin intermediarios.</p>

      ${franjaAnunciante(perfil.rubro || Estado.yo.rubro, Estado.zona || perfil.localidad, 'Materiales')}

      <button class="btn btn-plomo btn-bloque" id="irAlChat" style="margin-top:16px">Abrir el chat</button>
      <button class="btn btn-fantasma btn-bloque" id="seguirViendo" style="margin-top:8px">Seguir mirando</button>
    </div>`);

  $('#irAlChat').addEventListener('click', async () => {
    cerrarHoja();
    if (!esReal) { verChat(perfil.id, tipo); return; }
    // Match real: buscamos el match recién creado y entramos a su chat.
    await cargarMatches();
    const m = matchesReales.find(x => x.otro?.id === perfil.id) || matchesReales[0];
    if (m) verMatchChat(m); else irA('matches');
  });

  $('#seguirViendo').addEventListener('click', () => {
    cerrarHoja();
    // Recién hizo match: acá el aviso al teléfono se entiende solo.
    if (esReal) setTimeout(quizasPedirAvisos, 500);
  });
}

/* ── Fichas completas ───────────────────────────────────── */
function htmlGaleriaFicha(fotos) {
  const lista = (fotos || []).filter(Boolean);
  if (!lista.length) return '';
  return `
    <p class="bloque-titulo">Trabajos</p>
    <div class="galeria-ficha">${lista.map(u => `<img src="${escapar(u)}" alt="">`).join('')}</div>`;
}

function htmlRedesFicha(p) {
  const ig = (p.instagram || '').trim();
  const fb = (p.facebook || '').trim();
  if (!ig && !fb) return '';
  return `
    <p class="bloque-titulo">Redes</p>
    <div class="redes-ficha">
      ${ig ? `<a class="btn btn-fantasma btn-sm" href="${escapar(linkRed('instagram', ig))}" target="_blank" rel="noopener noreferrer">Instagram</a>` : ''}
      ${fb ? `<a class="btn btn-fantasma btn-sm" href="${escapar(linkRed('facebook', fb))}" target="_blank" rel="noopener noreferrer">Facebook</a>` : ''}
    </div>`;
}

function linkRed(tipo, valor) {
  const v = String(valor || '').trim();
  if (!v) return '#';
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/^\/+/, '');
  if (tipo === 'instagram') return 'https://instagram.com/' + handle;
  if (tipo === 'facebook') return 'https://facebook.com/' + handle;
  return v;
}

function verFichaProfesional(p) {
  const rubro = rubroDe(p.rubro) || { nombre: 'Oficio', glifo: '◆' };
  const verificado = (p.verificacion || []).includes('identidad');
  // Perfil demo: reseñas de muestra. Perfil real: se traen de la base más abajo.
  const resenas = p._real
    ? '<p style="font-size:14px;color:var(--cal-3);margin-top:4px">Cargando…</p>'
    : p.resenas.map(r => `
    <div class="resena">
      <div class="resena-cabeza"><b>${r.autor}</b><span>${estrellas(r.puntaje)}</span></div>
      <p>${r.texto}</p>
      <small>${r.local}</small>
    </div>`).join('');

  abrirHoja(`
    <div class="perfil-cabeza">
      <img class="perfil-avatar" src="${p.foto}" alt="">
      <div>
        <h2>${p.nombre} ${verificado ? '<span class="sello">✓</span>' : ''}</h2>
        <p>${rubro.nombre} · ${p.localidad}</p>
      </div>
    </div>
    <div class="metricas">
      <div class="metrica"><b>${Number(p.puntaje || 0).toFixed(1)}</b><span>Puntaje</span></div>
      <div class="metrica"><b>${p.trabajos || 0}</b><span>Trabajos</span></div>
      <div class="metrica"><b>${p.anios || '—'}</b><span>Años</span></div>
    </div>
    <p style="font-size:14.5px;color:var(--cal-2)">${p.bio || ''}</p>
    <p class="bloque-titulo">Hace</p>
    <div class="etiquetas">${(p.especialidades || []).map(e => `<span class="etiqueta">${e}</span>`).join('')}</div>
    ${htmlGaleriaFicha(p.galeria)}
    ${htmlRedesFicha(p)}
    <p class="bloque-titulo">Verificación</p>
    <div class="tarjeta">
      <div class="capa-fila ${verificado ? 'ok' : ''}">
        <span class="capa-tilde">${verificado ? '✓' : '—'}</span>
        <span><b>${verificado ? 'Verificado por Contratá Ya' : 'Sin verificar'}</b><span>${verificado ? 'Activamos la cuenta por WhatsApp.' : 'Todavía no habló con el equipo.'}</span></span>
      </div>
    </div>
    <p class="bloque-titulo">Lo que dicen los clientes</p>
    <div id="resenasFicha">${resenas}</div>
    ${p._real ? `<button class="btn-reportar" id="btnReportarFicha">Reportar este perfil</button>` : ''}`);

  if ($('#btnReportarFicha')) $('#btnReportarFicha').addEventListener('click', () => denunciar(p, null));

  if (p._real) {
    cargarResenasEnFicha(p.id, 'pro', 'Todavía no tiene reseñas. El primero que lo contrate le va a dejar la primera.');
  }
}

function verFichaCliente(c) {
  const ped = c.pedido || {};
  const rubro = rubroDe(ped.rubro) || { nombre: 'Oficio', glifo: '◆' };
  const urg = urgenciaDe(ped.urgencia);
  // Perfil demo: reseñas de muestra. Perfil real: se traen de la base más abajo.
  const resenas = c._real
    ? '<p style="font-size:14px;color:var(--cal-3);margin-top:4px">Cargando…</p>'
    : c.resenas.map(r => `
    <div class="resena">
      <div class="resena-cabeza"><b>${r.autor}</b><span>${estrellas(r.puntaje)}</span></div>
      <p>${r.texto}</p>
      <small>${r.rubro}</small>
    </div>`).join('');

  abrirHoja(`
    <div class="perfil-cabeza">
      <img class="perfil-avatar" src="${c.foto}" alt="">
      <div>
        <h2>${c.nombre}</h2>
        <p>${c.localidad} · cliente desde ${c.desde}</p>
      </div>
    </div>
    <div class="metricas">
      <div class="metrica"><b>${Number(c.puntaje || 0).toFixed(1)}</b><span>Puntaje</span></div>
      <div class="metrica"><b>${c.contrataciones || 0}</b><span>Contrató</span></div>
      <div class="metrica"><b id="contadorResenas">${c._real ? '—' : (c.resenas || []).length}</b><span>Reseñas</span></div>
    </div>
    <p class="bloque-titulo">Qué necesita</p>
    <div class="tarjeta">
      <p style="font-size:14.5px;color:var(--cal-2);margin-bottom:12px">${ped.detalle || 'Sin detalle'}</p>
      <div class="etiquetas">
        <span class="etiqueta">${rubro.nombre}</span>
        <span class="etiqueta">${urg.nombre}</span>
        <span class="etiqueta">${ped.presupuesto || '—'}</span>
      </div>
    </div>
    <p class="bloque-titulo">Lo que dicen los profesionales</p>
    <div id="resenasFicha">${resenas}</div>`);

  // Ojo: en un pedido real, c.id es el id del PEDIDO. La persona es c.cliente_id.
  if (c._real && c.cliente_id) {
    traerResenas(c.cliente_id, 'cliente').then(lista => {
      const cont = document.getElementById('resenasFicha');
      if (cont) cont.innerHTML = htmlResenas(lista, 'Todavía no tiene reseñas. Es de los primeros clientes de la zona.');
      const num = document.getElementById('contadorResenas');
      if (num) num.textContent = lista.length;
    });
  }
}

/* ══════════════════════════════════════════════════════════
   MATCHES
   ══════════════════════════════════════════════════════════ */
// Cache de matches reales del usuario (traídos de Supabase).
let matchesReales = [];

// Trae los matches donde participo (como cliente o como profesional),
// con la otra persona y el pedido embebidos.
/* Un resumen de lo que se está mostrando. Si no cambia, no se repinta. */
function firmaMatches() {
  return (matchesReales || []).map(m =>
    [m.id, m.noLeidos, m.trabajo?.estado, m.trabajo?.inicio_cliente, m.trabajo?.inicio_pro,
     m.trabajo?.fin_cliente, m.trabajo?.fin_pro, m.califique].join('·')).join('|');
}

let errorMatches = null;

async function cargarMatches() {
  const previos = matchesReales;
  matchesReales = [];
  errorMatches = null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return matchesReales;

    const { data: filas, error: eMatches } = await sb.from('matches')
      .select('id,pedido_id,cliente_id,profesional_id,estado,creado_en,cli:perfiles!cliente_id(nombre,foto_url,localidad,puntaje_cliente,contrataciones),pro:perfiles!profesional_id(nombre,foto_url,localidad,rubro,puntaje_pro,verificacion),pedido:pedidos!pedido_id(rubro,urgencia,detalle)')
      .or(`cliente_id.eq.${uid},profesional_id.eq.${uid}`)
      .order('creado_en', { ascending: false });

    // supabase-js no lanza excepción cuando falla la red: devuelve el error
    // acá adentro. Si esto no se mira, un problema de conexión termina
    // dibujando "todavía no hay ninguno" a alguien que tiene cuatro matches.
    if (eMatches) {
      errorMatches = eMatches.message || 'sin conexión';
      matchesReales = previos && previos.length ? previos : [];
      return matchesReales;
    }

    matchesReales = (filas || []).map(f => {
      const soyCliente = f.cliente_id === uid;
      const tipo = soyCliente ? 'profesional' : 'cliente';   // tipo = qué es la OTRA persona
      const otro = soyCliente
        ? {
            // El id va adentro del objeto y no sólo suelto en otroId: cualquier
            // cosa que reciba "la otra persona" necesita poder identificarla.
            id: f.profesional_id,
            nombre: f.pro?.nombre || 'Profesional',
            foto: f.pro?.foto_url || FOTOS_PERFIL[0],
            localidad: f.pro?.localidad || '',
            rubro: f.pro?.rubro || f.pedido?.rubro || null,
            puntaje: (f.pro?.puntaje_pro != null) ? Number(f.pro.puntaje_pro) : 0,
            verificacion: f.pro?.verificacion || []
          }
        : {
            id: f.cliente_id,
            nombre: f.cli?.nombre || 'Cliente',
            foto: f.cli?.foto_url || FOTOS_PERFIL[0],
            localidad: f.cli?.localidad || '',
            rubro: null,
            puntaje: (f.cli?.puntaje_cliente != null) ? Number(f.cli.puntaje_cliente) : 0,
            contrataciones: f.cli?.contrataciones || 0,
            verificacion: []
          };
      return {
        id: f.id,
        tipo,
        cliente_id: f.cliente_id,
        profesional_id: f.profesional_id,
        otro,
        otroId: soyCliente ? f.profesional_id : f.cliente_id,
        pedido: {
          rubro: f.pedido?.rubro || null,
          urgencia: f.pedido?.urgencia || '',
          detalle: f.pedido?.detalle || ''
        },
        estado: f.estado,
        noLeidos: 0
      };
    });

    const ids = matchesReales.map(m => m.id);

    // El trabajo vigente de cada match: el de número más alto.
    // Puede estar propuesto, en curso o ya terminado (ahí el chat se cierra).
    if (ids.length) {
      const { data: trabajos, error: eT } = await sb.from('trabajos')
        .select('*')
        .in('match_id', ids)
        .order('numero', { ascending: false });
      if (eT) console.warn('[trabajos] no se pudieron leer:', eT.message);

      const porMatch = {};
      (trabajos || []).forEach(t => { if (!porMatch[t.match_id]) porMatch[t.match_id] = t; });
      matchesReales.forEach(m => { m.trabajo = porMatch[m.id] || null; });

      // ¿Ya califiqué el trabajo vigente? Define si se muestra el botón.
      const idsTrab = matchesReales.map(m => m.trabajo?.id).filter(Boolean);
      if (idsTrab.length) {
        const { data: mias } = await sb.from('calificaciones')
          .select('trabajo_id')
          .in('trabajo_id', idsTrab)
          .eq('autor_id', uid);
        const hechas = new Set((mias || []).map(x => x.trabajo_id));
        matchesReales.forEach(m => { m.califique = !!(m.trabajo && hechas.has(m.trabajo.id)); });
      }
    }

    // Contamos los mensajes que me mandó la otra persona y todavía no leí.
    if (ids.length) {
      // Contamos sólo los del trabajo vigente: son los únicos que la
      // persona puede llegar a abrir. Los de trabajos viejos quedan
      // archivados y no tienen que seguir marcando el globo.
      const { data: noleidos } = await sb.from('mensajes')
        .select('match_id,trabajo_id')
        .in('match_id', ids)
        .eq('leido', false)
        .neq('autor_id', uid);

      const conteo = {};
      (noleidos || []).forEach(x => { conteo[x.match_id] = (conteo[x.match_id] || 0) + 1; });

      matchesReales.forEach(m => {
        if (!m.trabajo) { m.noLeidos = conteo[m.id] || 0; return; }
        m.noLeidos = (noleidos || []).filter(x => x.trabajo_id === m.trabajo.id).length;
      });
    }
  } catch (e) {
    // Antes esto devolvía una lista vacía y la pantalla decía "todavía no hay
    // ninguno" a alguien que tenía cuatro. Sin señal, la app te decía que no
    // tenías nada. Ahora se recuerda el error y se muestra como lo que es.
    console.warn('[matches] no se pudieron leer:', e && e.message);
    errorMatches = e && e.message ? e.message : 'sin conexión';
    matchesReales = previos && previos.length ? previos : [];
  }
  return matchesReales;
}

// Silueta de una lista mientras llega el dato. Se usa en Matches y en
// Beneficios: la pantalla ya tiene la forma final antes de tener contenido.
function esqueletoFilas(cuantas) {
  let h = '';
  for (let i = 0; i < cuantas; i++) {
    h += `<div class="esq-fila" aria-hidden="true">
            <span class="esq-bloque"></span>
            <span class="esq-cuerpo">
              <span class="esq-linea" style="width:${52 + (i % 3) * 12}%"></span>
              <span class="esq-linea" style="width:${34 + (i % 2) * 14}%;height:10px"></span>
            </span>
          </div>`;
  }
  return h;
}

async function verMatches() {
  escena.innerHTML = `
    <div class="vista" data-cargando="matches">
      <h1 class="titulo-vista">Matches</h1>
      <p class="sub-vista">Buscando tus matches…</p>
      ${esqueletoFilas(4)}
    </div>`;
  await cargarMatches();
  if (!escena.querySelector('[data-cargando="matches"]')) return;   // se fue a otra pantalla
  actualizarGlobo();

  if (!matchesReales.length) {
    const falló = !!errorMatches;
    escena.innerHTML = `
      <div class="vista">
        <h1 class="titulo-vista">Matches</h1>
        <div class="vacio" style="margin-top:24px">
          <span class="vacio-glifo">${falló ? '⚠' : '◇'}</span>
          <h3>${falló ? 'No se pudo traer tu bandeja' : 'Todavía no hay ninguno'}</h3>
          <p>${falló
            ? 'Puede ser la conexión. Tus matches están guardados: no se perdió nada.'
            : 'Cuando aceptes un perfil (o alguien acepte tu pedido), el match aparece acá.'}</p>
          <div class="vacio-acciones">
            ${falló ? '<button class="btn btn-plomo btn-sm" id="reintentarMatches">Reintentar</button>' : ''}
            <button class="btn ${falló ? 'btn-fantasma' : 'btn-plomo'} btn-sm" id="aBuscar">${Estado.rol === 'pro' ? 'Ver pedidos' : 'Buscar oficios'}</button>
          </div>
        </div>
      </div>`;
    $('#aBuscar').addEventListener('click', () => irA('buscar'));
    const rein = $('#reintentarMatches');
    if (rein) rein.addEventListener('click', () => ocupar(rein, 'Probando…', async () => {
      await cargarMatches();
      verMatches();
    }));
    return;
  }

  const filas = matchesReales.map(m => {
    const p = m.otro;
    const sub = m.tipo === 'cliente'
      ? `${p.localidad || 'Sin zona'} · ${p.puntaje.toFixed(1)} ★`
      : `${p.rubro ? rubroDe(p.rubro).nombre + ' · ' : ''}${p.localidad || 'Sin zona'} · ${p.puntaje.toFixed(1)} ★`;
    const t = m.trabajo;
    const pendiente = accionPendiente(m);
    const paso = !t ? ''
      : t.estado === 'propuesto' ? ' · trabajo sin empezar'
      : t.estado === 'en_curso'  ? ' · trabajo en curso'
      : t.estado === 'terminado' ? ' · trabajo terminado'
      : ' · trabajo cancelado';
    return `
      <button class="match-fila" data-match="${m.id}">
        <img class="match-avatar" src="${p.foto}" alt="">
        <span class="match-cuerpo">
          <b>${p.nombre}${m.tipo === 'profesional' && p.verificacion.includes('identidad') ? ' <span class="sello">✓</span>' : ''}</b>
          <p>${sub}${paso}</p>
          ${pendiente ? `<span class="match-accion">${pendiente}</span>` : ''}
        </span>
        <span class="match-estado ${m.noLeidos > 0 ? 'estado-nuevo' : 'estado-hecho'}">${
          m.noLeidos > 0 ? m.noLeidos + (m.noLeidos === 1 ? ' nuevo' : ' nuevos') : 'Ver'}</span>
      </button>`;
  }).join('');

  escena.innerHTML = `
    <div class="vista">
      <h1 class="titulo-vista">Matches</h1>
      <p class="sub-vista">${matchesReales.length} ${matchesReales.length === 1 ? 'match' : 'matches'}.</p>
      ${errorMatches ? `
        <div class="aviso-sin-red" id="avisoSinRed">
          <span>No se pudo actualizar. Esto es lo último que se pudo traer.</span>
          <button class="btn btn-sm btn-fantasma" id="reintentarMatches">Reintentar</button>
        </div>` : ''}
      ${filas}
      <button class="btn btn-fantasma btn-bloque" id="aBuscarMas" style="margin-top:18px">
        ${Estado.rol === 'pro' ? 'Ver más pedidos' : 'Buscar otro profesional'}
      </button>
    </div>`;

  $('#aBuscarMas').addEventListener('click', () => irA('buscar'));
  const reintentar = $('#reintentarMatches');
  if (reintentar) reintentar.addEventListener('click', () => ocupar(reintentar, 'Probando…', async () => {
    await cargarMatches();
    verMatches();
  }));
  escena.querySelectorAll('[data-match]').forEach(b => {
    b.addEventListener('click', () => {
      const m = matchesReales.find(x => x.id === b.dataset.match);
      if (m) verMatchChat(m);
    });
  });
}

function verMatchDetalle(m) {
  const p = m.otro;
  const zona = m.tipo === 'cliente'
    ? (p.localidad || 'Sin zona')
    : `${p.rubro ? rubroDe(p.rubro).nombre + ' · ' : ''}${p.localidad || 'Sin zona'}`;
  abrirHoja(`
    <div style="text-align:center">
      <img class="festejo-disco" src="${p.foto}" alt="" style="margin:0 auto 12px">
      <h2>${p.nombre}</h2>
      <p style="color:var(--cal-2);margin-bottom:16px">${zona}</p>
    </div>
    <div class="tarjeta">
      <div class="cuenta-fila"><span>Rubro del pedido</span><b>${m.pedido.rubro ? rubroDe(m.pedido.rubro).nombre : '—'}</b></div>
      <div class="cuenta-fila"><span>Urgencia</span><b>${m.pedido.urgencia || '—'}</b></div>
      ${m.pedido.detalle ? `<div class="cuenta-fila" style="flex-direction:column;align-items:flex-start;gap:4px"><span>Detalle</span><b style="font-weight:400">${m.pedido.detalle}</b></div>` : ''}
    </div>
    <button class="btn btn-plomo btn-bloque" id="abrirChatDet" style="margin-top:16px">Abrir chat</button>
    <button class="btn btn-fantasma btn-bloque" id="cerrarDet" style="margin-top:8px">Cerrar</button>`);
  $('#abrirChatDet').addEventListener('click', () => { cerrarHoja(); verMatchChat(m); });
  $('#cerrarDet').addEventListener('click', cerrarHoja);
}

/* ── Ciclo del trabajo ───────────────────────────────────────
   Cada trabajo se abre y se cierra entre los dos. Nadie cierra
   solo: hacen falta las dos marcas para que pase a terminado,
   y recién ahí se habilita calificar.
   ─────────────────────────────────────────────────────────── */

// En un match, m.tipo dice qué es LA OTRA persona.
const soyClienteEnMatch = (m) => m.tipo === 'profesional';
const soyProEnMatch = (m) => m.tipo === 'cliente';
const puedePresupuestar = (m) =>
  Estado.rol === 'pro' && esPlanPro(Estado.yo?.plan) && soyProEnMatch(m);
const PRE_MARCA = '[[cy-pre]]';
const idPresupuestoDeMsg = (texto) => {
  const t = String(texto || '');
  const i = t.indexOf(PRE_MARCA);
  if (i < 0) return null;
  const rest = t.slice(i + PRE_MARCA.length).trim();
  const id = (rest.match(/[0-9a-f-]{36}/i) || [])[0];
  return id || null;
};

// Marca mi lado del inicio o del fin. El trigger de la base deriva
// el estado y descarta cualquier intento de escribir el lado ajeno.
async function marcarTrabajo(m, accion) {
  const t = m.trabajo;
  if (!t) return false;
  const columna = accion + '_' + (soyClienteEnMatch(m) ? 'cliente' : 'pro');

  const { error } = await sb.from('trabajos')
    .update({ [columna]: new Date().toISOString() })
    .eq('id', t.id);

  if (error) {
    console.warn('[trabajo] no se pudo marcar:', error.message, error.code || '');
    brindis('No se pudo guardar. Probá de nuevo.');
    return false;
  }

  const { data } = await sb.from('trabajos').select('*').eq('id', t.id).maybeSingle();
  if (data) m.trabajo = data;
  return true;
}

/* El panel del trabajo.
   `chatIniciado` decide si se muestra la invitación a abrir un trabajo. Antes
   aparecía apenas se entraba al chat, arriba de todo y sin que nadie hubiera
   dicho una palabra: de tan presente se volvía parte del decorado y dejaba de
   verse. Ahora aparece cuando la conversación ya empezó de verdad —cuando
   hablaron los dos—, que es el momento en que la pregunta tiene sentido.
   Si el trabajo YA existe se muestra siempre: eso no es una invitación, es el
   estado del trabajo y ahí están los botones para confirmarlo. */
function panelTrabajo(m, chatIniciado) {
  const t = m.trabajo;
  const nombre = m.otro.nombre.split(' ')[0];

  if (!t && !chatIniciado) return '';

  if (!t) {
    return (Estado.rol === 'cliente' || soyClienteEnMatch(m))
      ? `<div class="trabajo-panel">
           <span class="trabajo-rotulo">Sin trabajo abierto</span>
           <p>Pueden hablar por acá. Cuando se pongan de acuerdo, abrí el trabajo para poder calificarlo después.</p>
           <button class="btn btn-plomo btn-bloque btn-sm" id="btnAbrirTrabajo">Abrir un trabajo con ${nombre}</button>
         </div>`
      : `<div class="trabajo-panel">
           <span class="trabajo-rotulo">Sin trabajo abierto</span>
           <p>Pueden hablar por acá. El trabajo lo abre ${nombre} cuando se pongan de acuerdo.</p>
         </div>`;
  }

  const soyCli   = soyClienteEnMatch(m);
  const miInicio = soyCli ? t.inicio_cliente : t.inicio_pro;
  const suInicio = soyCli ? t.inicio_pro     : t.inicio_cliente;
  const miFin    = soyCli ? t.fin_cliente    : t.fin_pro;
  const suFin    = soyCli ? t.fin_pro        : t.fin_cliente;

  let rotulo, cuerpo, boton = '', clase = '';

  if (t.estado === 'propuesto') {
    rotulo = `Trabajo ${t.numero} · sin empezar`;
    if (!miInicio) {
      cuerpo = suInicio
        ? `${nombre} ya confirmó el inicio. Falta el tuyo.`
        : 'Cuando se pongan de acuerdo, confirmen los dos el inicio.';
      boton = `<button class="btn btn-plomo btn-bloque btn-sm" id="btnTrabajo" data-accion="inicio">Confirmar el inicio</button>
        <button class="btn btn-fantasma btn-bloque btn-sm" id="btnCancelarTrabajo" style="margin-top:8px">Cancelar este trabajo</button>`;
    } else {
      cuerpo = `Confirmaste el inicio. Falta que ${nombre} lo confirme.`;
      boton = `<button class="btn btn-fantasma btn-bloque btn-sm" id="btnCancelarTrabajo">Cancelar este trabajo</button>`;
    }

  } else if (t.estado === 'en_curso') {
    rotulo = `Trabajo ${t.numero} · en curso`;
    clase = 'trabajo-activo';
    if (!miFin) {
      cuerpo = suFin
        ? `${nombre} lo dio por terminado. Si estás de acuerdo, marcalo vos también.`
        : 'Cuando esté terminado, márquenlo los dos. Ahí se habilita la calificación.';
      boton = `<button class="btn btn-plomo btn-bloque btn-sm" id="btnTrabajo" data-accion="fin">Marcar como terminado</button>
        <button class="btn btn-fantasma btn-bloque btn-sm" id="btnCancelarTrabajo" style="margin-top:8px">Cancelar este trabajo</button>`;
    } else {
      cuerpo = `Lo diste por terminado. Falta que ${nombre} lo confirme.`;
      boton = `<button class="btn btn-fantasma btn-bloque btn-sm" id="btnCancelarTrabajo">Cancelar este trabajo</button>`;
    }

  } else if (t.estado === 'terminado') {
    rotulo = `Trabajo ${t.numero} · terminado`;
    clase = 'trabajo-cerrado';
    cuerpo = m.califique
      ? 'Cerrado por los dos. Ya dejaste tu calificación.'
      : 'Cerrado por los dos. Falta que lo califiques.';

  } else {
    rotulo = `Trabajo ${t.numero} · cancelado`;
    clase = 'trabajo-cerrado';
    cuerpo = 'Este trabajo quedó cancelado.';
  }

  return `<div class="trabajo-panel ${clase}">
    <span class="trabajo-rotulo">${rotulo}</span>
    <p>${cuerpo}</p>
    ${boton}
  </div>`;
}

function fechaValidezPre(dias, creado) {
  const d = new Date(creado || Date.now());
  d.setDate(d.getDate() + Number(dias || 15));
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function listarPresupuestos(m) {
  try {
    let q = sb.from('presupuestos').select('*').eq('match_id', m.id);
    q = m.trabajo ? q.eq('trabajo_id', m.trabajo.id) : q.is('trabajo_id', null);
    const { data, error } = await q.order('creado_en', { ascending: true });
    if (error) return [];
    return data || [];
  } catch { return []; }
}

function htmlFichaPresupuesto(p, m, cerrado) {
  const estado = p.estado === 'aceptado' ? 'aceptado' : (p.estado === 'reemplazado' ? 'reemplazado' : '');
  const sello = p.estado === 'aceptado' ? 'Precio aceptado' : (p.estado === 'reemplazado' ? 'Reemplazado' : 'Enviado');
  const puedeAceptar = soyClienteEnMatch(m) && p.estado === 'enviado' && !cerrado;
  const fila = (rotulo, valor) => valor
    ? `<div class="pre-fila"><span>${rotulo}</span><p>${escapar(valor)}</p></div>` : '';
  return `<article class="pre-doc ${estado}">
    <header class="pre-doc-cabeza">
      <div class="pre-doc-marca">Contratá Ya · Plan Pro</div>
      <h3 class="pre-doc-titulo">Presupuesto de mano de obra</h3>
      <p class="pre-doc-sub">${escapar((soyProEnMatch(m) ? Estado.usuario?.nombre : m.otro.nombre) || '')} · ${fechaCortaApp ? fechaCortaApp(p.creado_en) : ''}</p>
    </header>
    <div class="pre-doc-cuerpo">
      ${fila('Qué se va a hacer', p.descripcion)}
      ${fila('Incluye', p.incluye)}
      ${fila('No incluye', p.no_incluye || 'Materiales a cargo del cliente, salvo que se aclare otra cosa.')}
      ${fila('Tiempo estimado', p.demora)}
      ${fila('Nota', p.nota)}
    </div>
    <div class="pre-total">
      <em>Mano de obra</em>
      <b>${plata(p.precio)}</b>
    </div>
    <div class="pre-doc-pie">
      <span>Válido hasta el ${fechaValidezPre(p.validez_dias, p.creado_en)}</span>
      <span class="${p.estado === 'aceptado' ? 'ok' : ''}">${sello}</span>
    </div>
    <p class="pre-doc-nota">Para ver este presupuesto siempre, instalá Contratá Ya en el teléfono.</p>
    ${puedeAceptar ? `<button class="btn btn-plomo btn-sm" data-aceptar-pre="${p.id}">Aceptar este precio</button>` : ''}
  </article>`;
}

function abrirFormularioPresupuesto(m, repintar) {
  if (!puedePresupuestar(m)) {
    brindis('El presupuestador es del plan Pro');
    return;
  }
  let validez = 15;
  const nombre = m.otro.nombre.split(' ')[0];
  abrirHoja(`
    <p class="pre-form-marca">Contratá Ya · Plan Pro</p>
    <h2>Presupuesto de mano de obra</h2>
    <p>Lo armás vos, con lo que ${nombre} te contestó en el chat. El precio es solo tu trabajo: los materiales se aclaran en qué incluye y qué no.</p>
    <p class="pre-aviso">El cliente lo recibe en el chat y lo puede aceptar desde ahí.</p>

    <div class="campo" style="margin-top:18px">
      <span class="campo-rotulo">Qué se va a hacer</span>
      <textarea class="area" id="preDesc" placeholder="Ej: cambiar la canilla de la cocina y revisar las dos llaves de paso"></textarea>
    </div>
    <div class="campo">
      <span class="campo-rotulo">Qué incluye</span>
      <textarea class="area" id="preInc" placeholder="Mano de obra, traslados en la zona, limpieza del lugar de trabajo"></textarea>
    </div>
    <div class="campo">
      <span class="campo-rotulo">Qué no incluye</span>
      <textarea class="area" id="preNo" placeholder="Materiales, grifería, permisos municipales"></textarea>
    </div>
    <div class="campo">
      <span class="campo-rotulo">Cuánto tarda</span>
      <input class="chat-campo" id="preDemora" placeholder="Ej: 3 horas / 2 días">
    </div>
    <div class="campo">
      <span class="campo-rotulo">Precio de mano de obra</span>
      <input class="chat-campo" id="prePrecio" inputmode="numeric" placeholder="Ej: 45000">
    </div>
    <div class="campo">
      <span class="campo-rotulo">Validez</span>
      <div class="pre-validez" id="preValidez">
        <button type="button" data-dias="7">7 días</button>
        <button type="button" data-dias="15" class="on">15 días</button>
        <button type="button" data-dias="30">30 días</button>
      </div>
    </div>
    <div class="campo">
      <span class="campo-rotulo">Nota <span style="text-transform:none;letter-spacing:0">(opcional)</span></span>
      <textarea class="area" id="preNota" placeholder="Seña, forma de pago, o si el precio cambia si aparece otra cosa"></textarea>
    </div>

    <button class="btn btn-plomo btn-bloque" id="preEnviar">Enviar presupuesto</button>
    <button class="btn btn-fantasma btn-bloque" id="preCerrar" style="margin-top:8px">Volver</button>`);

  document.querySelectorAll('#preValidez button').forEach(b => {
    b.addEventListener('click', () => {
      validez = Number(b.dataset.dias);
      document.querySelectorAll('#preValidez button').forEach(x => x.classList.toggle('on', x === b));
    });
  });
  $('#preCerrar').addEventListener('click', cerrarHoja);
  $('#preEnviar').addEventListener('click', async () => {
    const btn = $('#preEnviar');
    const descripcion = ($('#preDesc').value || '').trim();
    const precio = Number(String($('#prePrecio').value || '').replace(/\D/g, ''));
    if (!descripcion) { brindis('Contá qué se va a hacer'); return; }
    if (!precio) { brindis('Poné el precio de mano de obra'); return; }
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    const { data, error } = await sb.rpc('enviar_presupuesto', {
      p_match: m.id,
      p_trabajo: m.trabajo ? m.trabajo.id : null,
      p_descripcion: descripcion,
      p_incluye: ($('#preInc').value || '').trim(),
      p_no_incluye: ($('#preNo').value || '').trim(),
      p_demora: ($('#preDemora').value || '').trim(),
      p_precio: precio,
      p_validez: validez,
      p_nota: ($('#preNota').value || '').trim()
    });
    if (error || !data || data.ok === false) {
      btn.disabled = false;
      btn.textContent = 'Enviar presupuesto';
      brindis('No se pudo enviar el presupuesto. Probá de nuevo en un momento.');
      return;
    }
    cerrarHoja();
    brindis('Presupuesto enviado');
    if (typeof repintar === 'function') repintar();
  });
}

async function aceptarPresupuesto(id, m, repintar) {
  const { data, error } = await sb.rpc('aceptar_presupuesto', { p_id: id });
  if (error || !data || data.ok === false) {
    brindis(error?.message || 'No se pudo aceptar');
    return;
  }
  brindis('Precio aceptado. El trabajo se inicia cuando los dos lo confirmen.');
  if (typeof repintar === 'function') repintar();
}

/* Deja el último mensaje a la vista. Se usa al abrir el chat y al enviar. */
function ultimaBurbuja(cont) {
  const ultima = cont.lastElementChild;
  if (ultima && ultima.scrollIntoView) {
    ultima.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
}

function conectarTrabajo(m, repintar) {
  const a = document.getElementById('btnAbrirTrabajo');
  if (a) a.addEventListener('click', () => pedirNuevoTrabajo(m));

  const c = document.getElementById('btnCancelarTrabajo');
  if (c) c.addEventListener('click', () => confirmarCancelar(m, repintar));

  const b = document.getElementById('btnTrabajo');
  if (!b) return;
  b.addEventListener('click', () => confirmarMarcaTrabajo(m, b.dataset.accion, repintar));
}

async function confirmarMarcaTrabajo(m, accion, repintar) {
  const esInicio = accion === 'inicio';
  let faltaPre = false;
  if (esInicio && puedePresupuestar(m)) {
    const lista = await listarPresupuestos(m);
    faltaPre = !lista.some(p => p.estado === 'enviado' || p.estado === 'aceptado');
  }
  abrirHoja(`
    <h2>${esInicio ? '¿Confirmás el inicio?' : '¿Ya terminó el trabajo?'}</h2>
    <p>${esInicio
      ? '¿Estás seguro? ¿Ya arreglaste el inicio en el chat? El inicio del trabajo debe ser real.'
      : '¿Estás seguro? ¿Ya arreglaste el final en el chat? El fin del trabajo debe ser real.'}</p>
    ${faltaPre ? `<p class="pre-aviso">Te sugerimos mandar un presupuesto de mano de obra antes de iniciar. No es obligatorio: el trabajo se inicia igual, cuando los dos lo confirmen.</p>
    <button class="btn btn-fantasma btn-bloque" id="armarPre" style="margin-top:12px">Armar presupuesto</button>` : ''}
    <button class="btn btn-plomo btn-bloque" id="siMarca" style="margin-top:20px">${esInicio ? 'Sí, confirmar el inicio' : 'Sí, marcar como terminado'}</button>
    <button class="btn btn-fantasma btn-bloque" id="noMarca" style="margin-top:8px">Volver</button>`);
  $('#noMarca').addEventListener('click', cerrarHoja);
  if ($('#armarPre')) $('#armarPre').addEventListener('click', () => abrirFormularioPresupuesto(m, repintar));
  $('#siMarca').addEventListener('click', async () => {
    const btn = $('#siMarca');
    const texto = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    const ok = await marcarTrabajo(m, accion);
    if (!ok) { btn.disabled = false; btn.textContent = texto; return; }
    cerrarHoja();
    repintar();
  });
}

// Cancela un trabajo que todavía no arrancó. Es la salida para el
// caso en que el profesional nunca confirma: sin esto, ese match
// queda trabado y no se puede abrir otro trabajo ahí.
function confirmarCancelar(m, repintar) {
  const nombre = m.otro.nombre.split(' ')[0];
  const enCurso = m.trabajo && m.trabajo.estado === 'en_curso';
  abrirHoja(`
    <h2>¿Cancelar el trabajo?</h2>
    <p>${enCurso
      ? 'El trabajo ya había arrancado. Al cancelarlo no queda calificación pendiente y se puede abrir otro.'
      : 'Todavía no empezó, así que no queda ninguna calificación pendiente. Después vas a poder pedirle otro a ' + nombre + ' cuando quieras.'}</p>
    <button class="btn btn-salir btn-bloque" id="siCancelar" style="margin-top:20px">Sí, cancelar</button>
    <button class="btn btn-fantasma btn-bloque" id="noCancelar" style="margin-top:8px">Volver</button>`);

  $('#noCancelar').addEventListener('click', cerrarHoja);
  $('#siCancelar').addEventListener('click', async () => {
    const b = $('#siCancelar');
    b.disabled = true;
    b.textContent = 'Cancelando…';

    const { data, error } = await sb.rpc('cancelar_trabajo', { p_trabajo: m.trabajo.id });
    if (error) {
      console.warn('[trabajo] no se pudo cancelar:', error.message);
      b.disabled = false;
      b.textContent = 'Sí, cancelar';
      brindis(error.message || 'No se pudo cancelar');
      return;
    }

    m.trabajo = Array.isArray(data) ? data[0] : data;
    cerrarHoja();
    brindis('Trabajo cancelado');
    repintar();
  });
}

// El cliente le pide un trabajo nuevo al mismo profesional.
// Abre el trabajo siguiente, con su propio chat en blanco.
function pedirNuevoTrabajo(m) {
  const nombre = m.otro.nombre.split(' ')[0];
  abrirHoja(`
    <h2>Nuevo trabajo con ${nombre}</h2>
    <p>Contale en dos líneas qué necesitás. Se abre un chat nuevo para este trabajo; el anterior queda guardado aparte.</p>
    <textarea class="area" id="detalleNuevo" placeholder="Ej: cambiar la instalación del quincho, 3 bocas nuevas" style="margin-top:14px"></textarea>
    <button class="btn btn-plomo btn-bloque" id="crearTrabajo" style="margin-top:14px">Pedir el trabajo</button>
    <button class="btn btn-fantasma btn-bloque" id="cerrarNuevo" style="margin-top:8px">Volver</button>`);

  $('#cerrarNuevo').addEventListener('click', cerrarHoja);
  $('#crearTrabajo').addEventListener('click', async () => {
    const b = $('#crearTrabajo');
    const detalle = $('#detalleNuevo').value.trim();
    if (!detalle) { brindis('Escribí qué necesitás'); return; }

    b.disabled = true;
    b.textContent = 'Abriendo…';

    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      b.disabled = false;
      b.textContent = 'Pedir el trabajo';
      brindis('Se cerró la sesión. Entrá de nuevo.');
      return;
    }

    let matchId = m.id;
    if (m.cliente_id && m.cliente_id !== uid) {
      if (!Estado.pedido.rubro) Estado.pedido.rubro = m.otro.rubro || m.pedido?.rubro;
      if (!Estado.zona) Estado.zona = m.otro.localidad || m.pedido?.localidad;
      const ok = await asegurarPedido();
      if (!ok) {
        b.disabled = false;
        b.textContent = 'Pedir el trabajo';
        return;
      }
      const { data: nm, error: eM } = await sb.from('matches').upsert(
        { pedido_id: Estado.pedido.id, cliente_id: uid, profesional_id: m.otro.id },
        { onConflict: 'pedido_id,profesional_id' }
      ).select().maybeSingle();
      if (eM || !nm) {
        b.disabled = false;
        b.textContent = 'Pedir el trabajo';
        brindis(eM?.message || 'No se pudo abrir el contacto');
        return;
      }
      matchId = nm.id;
    }

    const { data, error } = await sb.from('trabajos')
      .insert({ match_id: matchId, detalle })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[trabajo] no se pudo abrir:', error.message, error.code || '');
      b.disabled = false;
      b.textContent = 'Pedir el trabajo';
      brindis(error.code === '23505'
        ? 'Ya hay un trabajo abierto con esta persona'
        : 'No se pudo abrir el trabajo');
      return;
    }

    await cargarMatches();
    const fresco = matchesReales.find(x => x.id === matchId);
    if (fresco) {
      fresco.trabajo = data;
      fresco.califique = false;
    }
    cerrarHoja();
    brindis(`Trabajo pedido a ${nombre}`);
    verMatchChat(fresco || Object.assign({}, m, { id: matchId, trabajo: data, califique: false, tipo: 'profesional' }));
  });
}

// Lo que se ofrece cuando el trabajo ya está cerrado.
function bloqueCierre(m) {
  const t = m.trabajo;
  if (!t || t.estado === 'propuesto' || t.estado === 'en_curso') return '';

  const nombre = m.otro.nombre.split(' ')[0];
  // El modo de la app manda: si estás contratando, pedís el trabajo vos.
  // El cliente_id del match viejo no puede invertirlo (cuentas que usan los dos lados).
  const pidoYo = Estado.rol === 'cliente';

  if (!pidoYo) {
    return `<p class="chat-cerrado" style="margin-top:10px">${nombre} puede pedirte otro trabajo cuando lo necesite. El contacto queda guardado.</p>`;
  }

  // Falta calificar: ese botón ya está arriba, no ofrecemos nada más todavía.
  if (t.estado === 'terminado' && !m.califique) return '';

  return `
    <button class="btn btn-plomo btn-bloque" id="btnNuevoTrabajo" style="margin-top:14px">Pedirle otro trabajo a ${nombre}</button>
    <button class="btn btn-fantasma btn-bloque" id="btnOtroProfesional" style="margin-top:8px">Buscar otro profesional</button>`;
}

async function abrirPerfilDelChat(m) {
  const p = m && m.otro;
  if (!p || !p.id) { brindis('No se pudo abrir el perfil'); return; }
  const esProElOtro = m.tipo === 'profesional';
  abrirHoja('<p class="sub-vista">Cargando el perfil…</p>');
  try {
    const { data: f, error } = await sb.from('perfiles')
      .select('id,nombre,foto_url,rubro,localidad,plan,verificacion,bio,especialidades,puntaje_pro,puntaje_cliente,trabajos,contrataciones,anios,galeria,instagram,facebook,creado_en')
      .eq('id', p.id)
      .maybeSingle();
    if (error) console.warn('[perfil-chat]', error.message);
    if (esProElOtro) {
      const plan = (f && f.plan) || 'gratis';
      verFichaProfesional({
        id: p.id,
        nombre: (f && f.nombre) || p.nombre,
        foto: (f && f.foto_url) || p.foto,
        rubro: (f && f.rubro) || p.rubro,
        localidad: (f && f.localidad) || p.localidad || '',
        plan,
        verificacion: (f && f.verificacion) || p.verificacion || [],
        bio: (f && f.bio) || 'Sin descripción todavía.',
        especialidades: (f && f.especialidades) || [],
        galeria: esPlanPro(plan) ? ((f && f.galeria) || []) : [],
        instagram: esPlanPro(plan) ? ((f && f.instagram) || '') : '',
        facebook: esPlanPro(plan) ? ((f && f.facebook) || '') : '',
        puntaje: (f && f.puntaje_pro != null) ? Number(f.puntaje_pro) : Number(p.puntaje || 0),
        trabajos: (f && f.trabajos) || 0,
        anios: (f && f.anios) || 0,
        resenas: [],
        _real: true
      });
      return;
    }
    const anio = f && f.creado_en ? new Date(f.creado_en).getFullYear() : new Date().getFullYear();
    verFichaCliente({
      id: p.id,
      cliente_id: p.id,
      nombre: (f && f.nombre) || p.nombre,
      foto: (f && f.foto_url) || p.foto,
      localidad: (f && f.localidad) || p.localidad || '',
      puntaje: (f && f.puntaje_cliente != null) ? Number(f.puntaje_cliente) : Number(p.puntaje || 0),
      contrataciones: (f && f.contrataciones != null) ? f.contrataciones : (p.contrataciones || 0),
      desde: anio,
      pedido: {
        rubro: m.pedido && m.pedido.rubro,
        urgencia: (m.pedido && m.pedido.urgencia) || 'semana',
        detalle: (m.pedido && m.pedido.detalle) || 'Sin detalle',
        presupuesto: (m.pedido && m.pedido.presupuesto) || '—'
      },
      resenas: [],
      _real: true
    });
  } catch (e) {
    console.warn('[perfil-chat]', e);
    cerrarHoja();
    brindis('No se pudo abrir el perfil');
  }
}

// Chat real entre las dos partes de un match (tabla mensajes en Supabase).
async function verMatchChat(m) {
  const p = m.otro;
  let uid = Estado.usuario?.id;
  if (!uid) {
    const { data: { session } } = await sb.auth.getSession();
    uid = session?.user?.id;
  }

  const sub = m.tipo === 'cliente'
    ? `${p.localidad || 'Sin zona'} · ${p.puntaje.toFixed(1)} ★`
    : `${p.rubro ? rubroDe(p.rubro).nombre + ' · ' : ''}${p.localidad || 'Sin zona'} · ${p.puntaje.toFixed(1)} ★`;

  // Estado del trabajo: define si el chat sigue abierto y si se puede calificar.
  // Ojo: que NO haya trabajo no es lo mismo que un trabajo terminado.
  // Sin trabajo el chat queda abierto, para que puedan hablar y arrancar.
  const t = m.trabajo;
  const cerrado = !!t && (t.estado === 'terminado' || t.estado === 'cancelado');

  escena.innerHTML = `
    <div class="vista">
      <button class="btn btn-fantasma btn-sm" id="volverMatches" style="margin-bottom:18px">← Matches</button>

      <div class="perfil-cabeza" style="margin-bottom:16px">
        <img class="perfil-avatar" src="${p.foto}" alt="">
        <div class="perfil-cabeza-datos">
          <h2 style="font-size:20px">${p.nombre}</h2>
          <p>${sub}</p>
        </div>
        <div class="chat-cabeza-acciones">
          <button class="btn btn-plomo btn-sm" id="verPerfilChat" type="button">Ver perfil</button>
          <button class="btn btn-fantasma btn-sm" id="verPedido" type="button">Pedido</button>
        </div>
      </div>

      <div id="panelTrabajo">${panelTrabajo(m, false)}</div>

      ${!cerrado && puedePresupuestar(m) ? `<button class="btn-pre" id="btnPresupuesto" type="button"><span>Presupuesto de mano de obra</span><em>Plan Pro</em></button>` : ''}

      <div class="chat" id="chatReal"><p class="sub-vista" style="text-align:center">Cargando…</p></div>

      ${cerrado ? `
      <p class="chat-cerrado">Este chat se cerró junto con el trabajo. Queda guardado como constancia de lo que acordaron.</p>` : `
      <div class="chat-barra">
        <input class="chat-campo" id="campoChat" placeholder="Escribí un mensaje" autocomplete="off">
        <button class="disco disco-si" id="enviarChat" style="width:48px;height:48px;font-size:18px" aria-label="Enviar">→</button>
      </div>`}

      ${(t && t.estado === 'terminado' && !m.califique)
        ? `<button class="btn btn-plomo btn-bloque" id="calificarBtn" style="margin-top:14px">Calificar a ${p.nombre.split(' ')[0]}</button>`
        : ''}
      ${bloqueCierre(m)}

      <button class="btn-reportar" id="btnReportar">Reportar a ${p.nombre.split(' ')[0]}</button>
    </div>`;

  $('#volverMatches').addEventListener('click', () => irA('matches'));
  if ($('#verPerfilChat')) $('#verPerfilChat').addEventListener('click', () => abrirPerfilDelChat(m));
  $('#verPedido').addEventListener('click', () => verMatchDetalle(m));
  if ($('#calificarBtn')) $('#calificarBtn').addEventListener('click', () => calificarReal(m));
  if ($('#btnNuevoTrabajo')) $('#btnNuevoTrabajo').addEventListener('click', () => pedirNuevoTrabajo(m));
  if ($('#btnOtroProfesional')) $('#btnOtroProfesional').addEventListener('click', () => irA('buscar'));
  conectarTrabajo(m, () => verMatchChat(m));
  if ($('#btnPresupuesto')) $('#btnPresupuesto').addEventListener('click', () => abrirFormularioPresupuesto(m, () => verMatchChat(m)));
  if ($('#btnReportar')) $('#btnReportar').addEventListener('click', () => denunciar(p, m.trabajo?.id));
  setTimeout(quizasPedirAvisos, 900);   // ya está en un chat: el aviso tiene sentido

  async function pintarMensajes() {
    const cont = document.getElementById('chatReal');
    if (!cont) return;
    // Cada trabajo tiene su propio chat: filtramos por trabajo_id.
    let consulta = sb.from('mensajes').select('id,autor_id,texto,leido,creado_en');
    consulta = t ? consulta.eq('trabajo_id', t.id) : consulta.eq('match_id', m.id);
    const { data: msgs, error: eMsg } = await consulta.order('creado_en', { ascending: true });
    if (eMsg) console.warn('[chat] no se pudieron leer los mensajes:', eMsg.message);
    if (!document.getElementById('chatReal')) return;   // salió del chat mientras cargaba
    if (!msgs || !msgs.length) {
      cont.innerHTML = `<p class="sub-vista" style="text-align:center;color:var(--cal-2)">${cerrado ? 'No quedaron mensajes de este trabajo.' : 'Todavía no hay mensajes. Escribí el primero.'}</p>`;
      return;
    }
    const presupuestos = await listarPresupuestos(m);
    const porPre = {};
    presupuestos.forEach(x => { porPre[x.id] = x; });
    cont.innerHTML = msgs.map(x => {
      const preId = idPresupuestoDeMsg(x.texto);
      if (preId) {
        if (porPre[preId]) return htmlFichaPresupuesto(porPre[preId], m, cerrado);
        return `<article class="pre-doc"><header class="pre-doc-cabeza"><div class="pre-doc-marca">Contratá Ya · Plan Pro</div><h3 class="pre-doc-titulo">Presupuesto de mano de obra</h3><p class="pre-doc-sub">Abrí el presupuesto para verlo completo.</p></header></article>`;
      }
      const mio = x.autor_id === uid;
      const hora = new Date(x.creado_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="burbuja ${mio ? 'burbuja-yo' : 'burbuja-otro'}">${x.texto.replace(/</g, '&lt;')}<span class="chat-hora">${hora}</span></div>`;
    }).join('');
    cont.querySelectorAll('[data-aceptar-pre]').forEach(b => {
      b.addEventListener('click', () => aceptarPresupuesto(b.dataset.aceptarPre, m, () => verMatchChat(m)));
    });

    // La conversación empezó cuando hablaron los dos. Recién ahí aparece la
    // invitación a abrir el trabajo, y entra con una animación corta para que
    // se note que es nueva.
    const panel = document.getElementById('panelTrabajo');
    if (panel && !m.trabajo) {
      const hablaron = new Set(msgs.map(x => x.autor_id)).size >= 2;
      if (hablaron && !panel.innerHTML.trim()) {
        panel.innerHTML = panelTrabajo(m, true);
        panel.firstElementChild?.classList.add('trabajo-panel-entra');
        conectarTrabajo(m, () => verMatchChat(m));
      } else if (!hablaron && panel.innerHTML.trim()) {
        panel.innerHTML = '';
      }
    }

    ultimaBurbuja(cont);

    // Si la otra persona me mandó mensajes sin leer, los marco como leídos.
    // Marcamos leído todo el match, no sólo los mensajes que se ven en
    // pantalla: si quedaron sin leer en un trabajo viejo, la persona no
    // tiene manera de abrirlos y el contador se le clavaría para siempre.
    try {
      await sb.from('mensajes').update({ leido: true })
        .eq('match_id', m.id).neq('autor_id', uid).eq('leido', false);
      if (m.noLeidos) { m.noLeidos = 0; actualizarGlobo(); }
    } catch (e) { /* silencioso */ }
  }

  await pintarMensajes();

  if (!cerrado) {
    const enviar = async () => {
      const campo = $('#campoChat');
      const texto = campo.value.trim();
      if (!texto) return;
      campo.value = '';

      // El mensaje se dibuja al instante, en gris, antes de que el servidor
      // conteste. Con una conexión mala, esperar dos segundos a que aparezca
      // lo que uno acaba de escribir se siente como que no se envió, y la
      // gente lo manda de nuevo.
      const cont = document.getElementById('chatReal');
      let provisoria = null;
      if (cont) {
        if (cont.querySelector('.sub-vista')) cont.innerHTML = '';
        provisoria = document.createElement('div');
        provisoria.className = 'burbuja burbuja-yo burbuja-enviando';
        provisoria.textContent = texto;
        cont.appendChild(provisoria);
        ultimaBurbuja(cont);
      }

      const { error } = await sb.from('mensajes')
        .insert({ match_id: m.id, trabajo_id: t ? t.id : null, autor_id: uid, texto });

      if (error) {
        if (provisoria) provisoria.remove();
        brindis('No se pudo enviar. Fijate la conexión.');
        campo.value = texto;
        return;
      }
      await pintarMensajes();
      campo.focus();
    };
    $('#enviarChat').addEventListener('click', enviar);
    $('#campoChat').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    });
  }

  // Refresco automático: mensajes nuevos cada 4s, y de paso el estado del
  // trabajo, para que si la otra parte marca el fin lo veas sin recargar.
  // En un chat cerrado no hace falta: ya no entra nada nuevo.
  if (!cerrado) {
    const poll = setInterval(async () => {
      if (!document.getElementById('chatReal')) { clearInterval(poll); return; }
      await pintarMensajes();
      if (!t) return;
      const { data } = await sb.from('trabajos').select('*').eq('id', t.id).maybeSingle();
      if (data && document.getElementById('chatReal') &&
          (data.estado !== t.estado || data.fin_cliente !== t.fin_cliente || data.fin_pro !== t.fin_pro ||
           data.inicio_cliente !== t.inicio_cliente || data.inicio_pro !== t.inicio_pro)) {
        clearInterval(poll);
        m.trabajo = data;
        verMatchChat(m);
      }
    }, 4000);
  }
}

function verChat(id, tipo) {
  const p = buscarPersona(id, tipo);
  const m = Estado.matches.find(x => x.id === id && x.tipo === tipo);
  m.leido = true;
  actualizarGlobo();

  const esCliente = tipo === 'cliente';
  const sub = esCliente
    ? `${p.localidad} · ${p.puntaje.toFixed(1)} ★ · ${p.contrataciones} contrataciones`
    : `${rubroDe(p.rubro).nombre} · ${p.localidad} · ${p.puntaje.toFixed(1)} ★`;

  const mio = esCliente
    ? `Hola ${p.nombre.split(' ')[0]}, vi tu pedido. Trabajo en la zona y me puedo dar una vuelta a ver.`
    : (Estado.pedido.detalle
        ? `Hola, te escribo por esto: ${Estado.pedido.detalle}`
        : `Hola, necesito un ${rubroDe(p.rubro).nombre.toLowerCase()} en ${Estado.zona || p.localidad}.`);

  const suyo = esCliente
    ? 'Buenas, dale. ¿Mañana a la mañana te queda bien? Estoy toda la semana en la casa.'
    : 'Buenas. Sí, esta semana tengo lugar. ¿Te queda bien que pase a ver mañana a la mañana y te paso el presupuesto en el momento?';

  escena.innerHTML = `
    <div class="vista">
      <button class="btn btn-fantasma btn-sm" id="volverMatches" style="margin-bottom:18px">← Matches</button>

      <div class="perfil-cabeza" style="margin-bottom:16px">
        <img class="perfil-avatar" src="${p.foto}" alt="">
        <div>
          <h2 style="font-size:20px">${p.nombre}</h2>
          <p>${sub}</p>
        </div>
        <button class="btn btn-plomo btn-sm" id="verFicha" style="margin-left:auto">Ver perfil</button>
      </div>

      ${franjaAnunciante(p.rubro || Estado.yo.rubro, Estado.zona || p.localidad, 'Materiales')}

      <div class="chat" id="chat">
        <div class="burbuja burbuja-yo">${mio}<span class="chat-hora">Recién</span></div>
        <div class="burbuja burbuja-otro">${suyo}<span class="chat-hora">Recién</span></div>
      </div>

      <div class="chat-barra">
        <input class="chat-campo" id="campoChat" placeholder="Escribí un mensaje" autocomplete="off">
        <button class="disco disco-si" id="enviarChat" style="width:48px;height:48px;font-size:18px" aria-label="Enviar">→</button>
      </div>

      <p class="bloque-titulo">Cuando termine el trabajo</p>
      <button class="btn ${m.calificado ? 'btn-fantasma' : 'btn-plomo'} btn-bloque" id="calificar">
        ${m.calificado ? 'Ya calificaste este trabajo' : 'Calificar a ' + p.nombre.split(' ')[0]}
      </button>
    </div>`;

  $('#volverMatches').addEventListener('click', () => irA('matches'));
  $('#verFicha').addEventListener('click', () => esCliente ? verFichaCliente(p) : verFichaProfesional(p));

  const enviar = () => {
    const campo = $('#campoChat');
    const texto = campo.value.trim();
    if (!texto) return;
    const chat = $('#chat');
    chat.insertAdjacentHTML('beforeend', `<div class="burbuja burbuja-yo">${texto.replace(/</g, '&lt;')}<span class="chat-hora">Recién</span></div>`);
    campo.value = '';
    chat.scrollIntoView({ block: 'end', behavior: 'smooth' });
    setTimeout(() => {
      chat.insertAdjacentHTML('beforeend', `<div class="burbuja burbuja-otro">Dale, anotado. Te confirmo por acá.<span class="chat-hora">Recién</span></div>`);
      chat.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }, 1100);
  };
  $('#enviarChat').addEventListener('click', enviar);
  $('#campoChat').addEventListener('keydown', e => { if (e.key === 'Enter') enviar(); });
  $('#calificar').addEventListener('click', () => calificar(p, m, tipo));
}

/* ── Calificación REAL (guarda en Supabase) ─────────────── */
async function calificarReal(m) {
  const p = m.otro;
  const tipo = (Estado.rol === 'cliente' || m.tipo === 'profesional') ? 'profesional' : 'cliente';
  const criterios = tipo === 'cliente' ? CRITERIOS.alCliente : CRITERIOS.alProfesional;

  const filas = criterios.map((c, i) => `
    <div class="calificar-fila">
      <b>${c}</b>
      <div class="estrellas-btn" data-criterio="${i}">
        ${[1, 2, 3, 4, 5].map(n => `<button class="estrella" data-n="${n}">★</button>`).join('')}
      </div>
    </div>`).join('');

  const panel = abrirHoja(`
    <div class="perfil-cabeza" style="margin-bottom:14px">
      <img class="perfil-avatar" src="${p.foto}" alt="" style="width:52px;height:52px;border-radius:14px">
      <div><h2 style="font-size:20px">Calificar a ${p.nombre.split(' ')[0]}</h2>
      <p>${tipo === 'cliente' ? 'Como cliente' : 'Como profesional'}</p></div>
    </div>
    <p>Tu puntaje arma el promedio de estrellas que se ve en el perfil.</p>
    <div style="margin-top:18px">${filas}</div>
    <textarea class="area" id="califTexto" placeholder="Un comentario (opcional)" style="margin-top:14px"></textarea>
    <button class="btn btn-plomo btn-bloque" id="enviarCalif" style="margin-top:14px" disabled>Enviar calificación</button>`);

  const puntajes = {};
  panel.querySelectorAll('.estrellas-btn').forEach(grupo => {
    grupo.querySelectorAll('.estrella').forEach(e => {
      e.addEventListener('click', () => {
        const n = parseInt(e.dataset.n, 10);
        puntajes[grupo.dataset.criterio] = n;
        grupo.querySelectorAll('.estrella').forEach(x => x.classList.toggle('encendida', parseInt(x.dataset.n, 10) <= n));
        $('#enviarCalif').disabled = Object.keys(puntajes).length < criterios.length;
      });
    });
  });

  $('#enviarCalif').addEventListener('click', async () => {
    const boton = $('#enviarCalif');
    boton.disabled = true;
    boton.textContent = 'Enviando…';

    let uid = Estado.usuario?.id;
    if (!uid) { const { data: { session } } = await sb.auth.getSession(); uid = session?.user?.id; }

    const vals = Object.values(puntajes);
    const overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const criteriosObj = {};
    criterios.forEach((c, i) => { criteriosObj[c] = puntajes[i]; });

    if (!m.trabajo?.id) {
      brindis('Primero hay que abrir y terminar un trabajo');
      boton.disabled = false;
      boton.textContent = 'Enviar calificación';
      return;
    }

    const comoCliente = Estado.rol === 'cliente' || tipo === 'profesional';
    const { error } = await sb.from('calificaciones').insert({
      match_id: m.id,
      trabajo_id: m.trabajo.id,
      autor_id: uid,
      destino_id: m.otroId || m.otro?.id,
      hacia: comoCliente ? 'pro' : 'cliente',
      puntaje: overall,
      criterios: criteriosObj,
      texto: $('#califTexto').value.trim() || null
    });

    if (error) {
      if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) {
        cerrarHoja();
        brindis('Ya habías calificado este trabajo');
      } else {
        boton.disabled = false;
        boton.textContent = 'Enviar calificación';
        brindis('No se pudo enviar: ' + (error.message || ''));
      }
      return;
    }

    m.califique = true;
    cerrarHoja();
    brindis('¡Calificación enviada!');
    setTimeout(() => window.Avisos?.cierre(), 700);
    // Si estábamos en el chat, lo repintamos para que desaparezca el botón.
    if (document.getElementById('chatReal')) verMatchChat(m);
  });
}

/* ── Calificación de doble vía ──────────────────────────── */
function calificar(p, m, tipo) {
  const criterios = tipo === 'cliente' ? CRITERIOS.alCliente : CRITERIOS.alProfesional;
  const filas = criterios.map((c, i) => `
    <div class="calificar-fila">
      <b>${c}</b>
      <div class="estrellas-btn" data-criterio="${i}">
        ${[1, 2, 3, 4, 5].map(n => `<button class="estrella" data-n="${n}">★</button>`).join('')}
      </div>
    </div>`).join('');

  const panel = abrirHoja(`
    <div class="perfil-cabeza" style="margin-bottom:14px">
      <img class="perfil-avatar" src="${p.foto}" alt="" style="width:52px;height:52px;border-radius:14px">
      <div><h2 style="font-size:20px">Calificar a ${p.nombre.split(' ')[0]}</h2>
      <p>${tipo === 'cliente' ? 'Como cliente' : 'Como profesional'}</p></div>
    </div>
    <p>Tu puntaje es anónimo para el resto, pero el promedio se ve en el perfil.</p>
    <div style="margin-top:18px">${filas}</div>
    <button class="btn btn-plomo btn-bloque" id="enviarCalif" style="margin-top:18px" disabled>Enviar calificación</button>
    <p class="registro-nota" style="text-align:center">
      ${tipo === 'cliente' ? 'El cliente también te está calificando a vos en este momento.' : 'El profesional también te está calificando a vos en este momento.'}
    </p>`);

  const puntajes = {};
  panel.querySelectorAll('.estrellas-btn').forEach(grupo => {
    grupo.querySelectorAll('.estrella').forEach(e => {
      e.addEventListener('click', () => {
        const n = parseInt(e.dataset.n, 10);
        puntajes[grupo.dataset.criterio] = n;
        grupo.querySelectorAll('.estrella').forEach(x => x.classList.toggle('encendida', parseInt(x.dataset.n, 10) <= n));
        $('#enviarCalif').disabled = Object.keys(puntajes).length < criterios.length;
      });
    });
  });

  $('#enviarCalif').addEventListener('click', () => {
    m.calificado = true;
    // El usuario también recibe su calificación: se le arma el promedio
    const u = Estado.usuario;
    const campo = Estado.rol === 'pro' ? 'puntajePro' : 'puntajeCliente';
    if (Estado.rol === 'pro') u.trabajos += 1; else u.contrataciones += 1;
    const n = Estado.rol === 'pro' ? u.trabajos : u.contrataciones;
    const recibido = 4.5 + Math.random() * 0.5;
    u[campo] = (u[campo] == null) ? recibido : (u[campo] * (n - 1) + recibido) / n;
    guardar();
    cerrarHoja();
    brindis('Calificación enviada. Te calificaron con ' + recibido.toFixed(1));
    verChat(p.id, tipo);
  });
}

/* ══════════════════════════════════════════════════════════
   BENEFICIOS
   ══════════════════════════════════════════════════════════ */


/* ── Denuncias ───────────────────────────────────────────────
   El denunciante nunca queda expuesto ante el denunciado: la
   denuncia la lee sólo el administrador. Y se guarda el chat del
   trabajo en ese momento, así que si después alguien borra
   mensajes, la denuncia conserva de qué se estaba hablando.
   ─────────────────────────────────────────────────────────── */

const MOTIVOS_DENUNCIA = [
  { id: 'no_es_quien_dice', texto: 'No es la persona de la foto' },
  { id: 'foto',             texto: 'La foto es falsa o inapropiada' },
  { id: 'no_se_presento',   texto: 'Acordamos y no se presentó' },
  { id: 'trato',            texto: 'Malos tratos o falta de respeto' },
  { id: 'estafa',           texto: 'Me quiso estafar' },
  { id: 'otro',             texto: 'Otra cosa' }
];

function denunciar(persona, trabajoId) {
  const nombre = (persona.nombre || '').split(' ')[0];

  if (!persona.id) {
    brindis('No se puede reportar este perfil');
    console.warn('[denuncia] falta el id de la persona', persona);
    return;
  }

  abrirHoja(`
    <h2>Reportar a ${escapar(nombre)}</h2>
    <p>Lo mira una persona del equipo. ${escapar(nombre)} no se entera de que fuiste vos.</p>

    <p class="bloque-titulo" style="margin-top:20px">¿Qué pasó?</p>
    <div class="motivos" id="motivos">
      ${MOTIVOS_DENUNCIA.map(m => `
        <button class="motivo" data-motivo="${m.id}">${escapar(m.texto)}</button>`).join('')}
    </div>

    <label class="campo" style="margin-top:16px">
      <span>Contanos un poco más</span>
      <textarea class="area" id="detalleDenuncia" placeholder="Qué pasó, cuándo, dónde"></textarea>
    </label>

    <button class="btn btn-plomo btn-bloque" id="enviarDenuncia" style="margin-top:16px" disabled>Enviar el reporte</button>
    <button class="btn btn-fantasma btn-bloque" id="cancelarDenuncia" style="margin-top:8px">Cancelar</button>`);

  let elegido = null;

  document.querySelectorAll('#motivos .motivo').forEach(b => {
    b.addEventListener('click', () => {
      elegido = b.dataset.motivo;
      document.querySelectorAll('#motivos .motivo').forEach(x => x.classList.toggle('elegido', x === b));
      $('#enviarDenuncia').disabled = false;
    });
  });

  $('#cancelarDenuncia').addEventListener('click', cerrarHoja);

  $('#enviarDenuncia').addEventListener('click', async () => {
    const b = $('#enviarDenuncia');
    b.disabled = true;
    b.textContent = 'Enviando…';

    const { data, error } = await sb.rpc('denunciar', {
      p_denunciado: persona.id,
      p_motivo: elegido,
      p_detalle: $('#detalleDenuncia').value.trim(),
      p_trabajo: trabajoId || null
    });

    if (error) {
      b.disabled = false;
      b.textContent = 'Enviar el reporte';
      brindis(error.message || 'No se pudo enviar');
      return;
    }

    cerrarHoja();
    brindis(data === 'ya_estaba'
      ? 'Ya habías reportado a esta persona'
      : 'Reporte enviado. Gracias por avisar.');
  });
}


/* ── Interstitial ────────────────────────────────────────────
   INVARIANTE — no volver a cambiar:
   1) Se dispara a los 2 segundos de cada sesión abierta
      (entrar a la app o volver de segundo plano).
   2) NO es una vez por día.
   3) Rotación: si hay avisos PAGADOS para esa audiencia y zona,
      sólo esos, en el orden del panel. Si no hay pagados, los
      de casa. Cada apertura muestra el siguiente.
   4) En Jugá, cada 3 partidas perdidas se muestra el siguiente
      de ESA MISMA rotación. No reemplaza el disparo de sesión
      ni usa el aviso de pedidos de la mañana/tarde.
   ─────────────────────────────────────────────────────────── */
const INTER_DELAY_MS = 2000;
const JUGAR_MUERTES_KEY = 'contrataya-jugar-muertes';
const JUGAR_INTER_CADA = 3;

const AUTOPUBLICIDAD = [
  {
    rol: 'pro',
    fondo: 'linear-gradient(160deg, #F0A63A 0%, #D97706 55%, #9A4E10 100%)',
    tinta: '#1A0F02',
    rotulo: 'Contratá Ya',
    titulo: 'Varias mejoras. El Pro ahora rinde más.',
    cuerpo: 'Actualizamos la app para que se labure más fácil. En el Plan Pro ahora tenés galería de fotos de tus trabajos y el link de tus redes en la ficha del mazo, te publicás en todas las localidades al mismo tiempo, salís primero en tu pueblo, te avisamos al toque cuando entra un pedido de tu oficio y armás un presupuesto de mano de obra por escrito en el match. También hay un juego, Jugá, para pasar el rato mientras esperás un laburo. Si no tenés Pro, llegá a 10.000 en una sola partida y te lo activamos un mes, sin cargo.',
    boton: 'Ver el plan Pro',
    accion: () => { irA('perfil'); verPlanes(); }
  },
  {
    rol: 'pro',
    fondo: 'linear-gradient(160deg, #F0A63A 0%, #D97706 55%, #9A4E10 100%)',
    tinta: '#1A0F02',
    rotulo: 'Contratá Ya',
    titulo: 'Tu próximo trabajo está a ocho cuadras',
    cuerpo: 'Los vecinos de tu localidad publican lo que necesitan. Deslizás, hay match, y arreglás directo. Sin comisiones.',
    boton: 'Ver pedidos de mi zona',
    accion: () => irA('buscar')
  },
  {
    rol: 'pro',
    fondo: 'linear-gradient(160deg, #2FB2A6 0%, #128378 55%, #06413C 100%)',
    tinta: '#02120F',
    rotulo: 'Beneficios',
    titulo: 'Descuentos en los comercios de la costa',
    cuerpo: 'Mostrás tu perfil y tu código en el mostrador y te lo hacen. Es tuyo por estar en la plataforma.',
    boton: 'Ver mis beneficios',
    accion: () => irA('beneficios')
  },
  {
    rol: 'cliente',
    fondo: 'linear-gradient(160deg, #F0A63A 0%, #D97706 55%, #9A4E10 100%)',
    tinta: '#1A0F02',
    rotulo: 'Contratá Ya',
    titulo: 'Atrás de cada estrella hay una persona',
    cuerpo: 'Foto real obligatoria, verificaciones y calificaciones que se ganan trabajo por trabajo. Para saber a quién le abrís la puerta.',
    boton: 'Buscar un oficio',
    accion: () => irA('buscar')
  },
  {
    rol: 'todos',
    fondo: 'linear-gradient(160deg, #E4574C 0%, #B32E24 55%, #5E140F 100%)',
    tinta: '#180402',
    rotulo: 'Espacio disponible',
    titulo: '¿Tenés un comercio en la costa?',
    cuerpo: 'Un solo comercio por rubro y por localidad. Le hablás a los profesionales que compran materiales todas las semanas.',
    boton: 'Cómo funciona',
    accion: () => { location.href = '/#comercios'; }
  },
  {
    rol: 'todos',
    esAvisos: true,
    fondo: 'linear-gradient(160deg, #0B1620 0%, #1A2A38 55%, #12222E 100%)',
    tinta: '#F5EFE4',
    boton_fondo: '#F0A63A',
    boton_tinta: '#1A0F02',
    rotulo: 'Avisos',
    titulo: 'Que no se te escape un trabajo',
    cuerpo: 'Te avisamos al teléfono cuando alguien te escriba, te pida un trabajo o te deje una calificación. Sin la app abierta.',
    boton: 'Activar las notificaciones',
    accion: () => { activarAvisos(); }
  }
];

function tipoMediaApp(url) {
  const u = String(url || '').split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov)$/.test(u)) return 'video';
  if (u.endsWith('.gif')) return 'gif';
  if (url) return 'imagen';
  return null;
}

function htmlMediaApp(url) {
  const t = tipoMediaApp(url);
  if (!url || !t) return '';
  if (t === 'video') {
    return `<video class="inter-media" src="${escapar(url)}" autoplay muted loop playsinline></video>`;
  }
  return `<img class="inter-media" src="${escapar(url)}" alt="">`;
}

function accionEnlaceInter(enlace) {
  if (!enlace) return () => {};
  if (enlace === 'avisos') return () => { activarAvisos(); };
  if (enlace === 'planes') return () => { irA('perfil'); verPlanes(); };
  if (['buscar', 'beneficios', 'matches', 'perfil', 'jugar'].includes(enlace)) return () => irA(enlace);
  return () => {
    // Un enlace externo abre aparte: si se va la app, el que estaba
    // deslizando pierde lo que estaba mirando.
    if (/^https?:/i.test(enlace)) window.open(enlace, '_blank', 'noopener');
    else location.href = enlace;
  };
}

let interTimer = null;

let interReintentos = 0;

function programarInterstitial() {
  if (!Estado.usuario) return;
  if (document.getElementById('interCerrar')) return;
  interReintentos = 0;
  clearTimeout(interTimer);
  interTimer = setTimeout(() => quizasInterstitial(), INTER_DELAY_MS);
}

// Estaba ocupada: se vuelve a intentar en unos segundos, unas pocas veces.
function reintentarInterstitial() {
  if (interReintentos >= 6) return;
  interReintentos++;
  clearTimeout(interTimer);
  interTimer = setTimeout(() => quizasInterstitial(), 4000);
}

function siguienteAviso(lista, clave) {
  if (!lista.length) return null;
  let n = 0;
  try { n = Number(localStorage.getItem(clave) || 0) || 0; } catch {}
  const item = lista[n % lista.length];
  try { localStorage.setItem(clave, String(n + 1)); } catch {}
  return item;
}

function avisoDesdeFila(i) {
  return {
    id: i.id,
    fondo: i.fondo,
    tinta: i.tinta,
    boton_fondo: i.boton_fondo,
    boton_tinta: i.boton_tinta,
    rotulo: i.rotulo,
    titulo: i.titulo,
    cuerpo: i.cuerpo,
    boton: i.boton,
    imagen_url: i.imagen_url,
    accion: accionEnlaceInter(i.enlace)
  };
}

async function avisoDeRotacion() {
  let pagos = [];
  try {
    const { data, error } = await sb.rpc('interstitials_activos');
    if (!error && data && data.length) {
      const rol = Estado.rol;
      const zona = Estado.zona || Estado.yo?.localidad;
      const elegibles = data.filter(i => {
        if (i.audiencia && i.audiencia !== 'todos' && i.audiencia !== rol) return false;
        if (i.localidad && zona && i.localidad !== zona) return false;   // el afiche de otro pueblo no va
        return true;
      });
      // El de tu localidad va primero, pero los generales NO se descartan.
      // Antes se los filtraba y, como cada aviso pago cubre una localidad,
      // el pool quedaba en UNO: todo el mundo veía siempre el mismo afiche.
      pagos = elegibles.filter(i => i.anunciante_id)
        .sort((a, b) => (b.localidad ? 1 : 0) - (a.localidad ? 1 : 0));
      if (!pagos.length) pagos = elegibles;
    }
  } catch (e) {
    console.warn('[inter]', e);
  }

  let propios = AUTOPUBLICIDAD.filter(x => x.rol === Estado.rol || x.rol === 'todos');
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    propios = propios.filter(x => !x.esAvisos);
  }

  if (!pagos.length) return siguienteAviso(propios, 'interTurnoCasa');
  if (!propios.length) {
    const uno = siguienteAviso(pagos, 'interTurno');
    return uno ? avisoDesdeFila(uno) : null;
  }

  // La rueda: primero se muestran TODOS los pagados, uno por vez; cuando se
  // dio la vuelta entera, entra uno de casa y vuelve a empezar. Los pagados
  // siguen teniendo prioridad, y los avisos propios —activar notificaciones,
  // contar el plan Pro— dejan de no salir nunca.
  const largo = pagos.length + 1;
  let n = 0;
  try { n = Number(localStorage.getItem('interTurno') || 0) || 0; } catch (e) {}
  try { localStorage.setItem('interTurno', String(n + 1)); } catch (e) {}
  const paso = n % largo;
  if (paso < pagos.length) return avisoDesdeFila(pagos[paso]);
  return siguienteAviso(propios, 'interTurnoCasa');
}

/* ¿Es mal momento para tapar la pantalla con un aviso?
   El interstitial vive en z-index 90 y la hoja en 60: si sale mientras
   alguien está llenando un presupuesto, le tapa el formulario a medio
   escribir. Se posterga, no se pierde: el invariante de los 2 segundos
   sigue valiendo para el caso normal (la app abierta y nada encima). */
function momentoMaloParaAviso() {
  const h = document.getElementById('hoja');
  if (h && !h.hidden) return true;                                  // hay una hoja abierta
  const f = document.activeElement;
  if (f && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)) return true; // está escribiendo
  if (document.querySelector('.carta.agarrada')) return true;        // tiene el dedo en una tarjeta
  return false;
}

async function quizasInterstitial() {
  if (!Estado.usuario || document.hidden) return;
  if (document.getElementById('interCerrar')) return;
  if (momentoMaloParaAviso()) { reintentarInterstitial(); return; }

  const forzado = consumirNovedadPedidos();
  if (await quizasInterPedidos(forzado)) return;

  const a = await avisoDeRotacion();
  if (a) mostrarInterstitial(a);
}

async function interstitialPorPerdidaJugar() {
  let n = 0;
  try { n = Number(localStorage.getItem(JUGAR_MUERTES_KEY) || 0) || 0; } catch {}
  n += 1;
  try { localStorage.setItem(JUGAR_MUERTES_KEY, String(n)); } catch {}
  if (n % JUGAR_INTER_CADA !== 0) return false;
  if (!Estado.usuario) return false;
  if (document.getElementById('interCerrar')) return false;
  if (momentoMaloParaAviso()) return false;
  const a = await avisoDeRotacion();
  if (!a) return false;
  mostrarInterstitial(a);
  return true;
}
window.interstitialPorPerdidaJugar = interstitialPorPerdidaJugar;

function mostrarInterstitial(a) {
  if (document.getElementById('interCerrar')) return;
  const capa = document.createElement('div');
  capa.className = 'inter' + (a.imagen_url ? ' con-media' : '');
  if (!a.imagen_url) capa.style.background = a.fondo;
  capa.style.setProperty('--tinta-inter', a.tinta || '#1A0F02');
  capa.style.setProperty('--boton-fondo', a.boton_fondo || a.tinta || '#1A0F02');
  capa.style.setProperty('--boton-tinta', a.boton_tinta || '#FFFFFF');

  capa.innerHTML = `
    ${htmlMediaApp(a.imagen_url)}
    <button class="inter-cerrar" id="interCerrar" aria-label="Cerrar">✕</button>

    <div class="inter-cuerpo">
      <span class="inter-rotulo">${escapar(a.rotulo || 'Contratá Ya')}</span>
      <h2 class="inter-titulo">${escapar(a.titulo)}</h2>
      <p class="inter-texto">${escapar(a.cuerpo || '')}</p>
      <button class="inter-boton" id="interIr">${escapar(a.boton || 'Ver más')}</button>
    </div>

    <span class="inter-pie">Publicidad</span>`;

  document.body.appendChild(capa);
  document.body.style.overflow = 'hidden';
  window.Avisos?.registrarVista(a.id, 'interstitial');

  const cerrar = () => { capa.remove(); document.body.style.overflow = ''; };
  capa.querySelector('#interCerrar').addEventListener('click', cerrar);
  capa.querySelector('#interIr').addEventListener('click', () => {
    window.Avisos?.registrarToque(a.id, 'interstitial');
    cerrar();
    if (typeof a.accion === 'function') a.accion();
  });
}

/* ── Pedidos sin tomar (aviso puntual a profesionales) ─────
   Una vez a la mañana y otra a la tarde. No pisa la rotación
   de avisos pagados: después vuelve el interstitial de siempre.
   ─────────────────────────────────────────────────────── */
function claveNovedadPedidos() {
  const d = new Date();
  const ymd = d.getFullYear()
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0');
  return 'novedadPedidos' + ymd + (d.getHours() < 14 ? 'm' : 't');
}

function consumirNovedadPedidos() {
  const params = new URLSearchParams(location.search);
  if (params.get('novedad') !== 'pedidos') return false;
  params.delete('novedad');
  const q = params.toString();
  // Ojo: se conserva history.state. Ahí vive la pila de pantallas que
  // hace funcionar el botón "atrás" (app-nav.js). Pisarla con null lo rompe.
  history.replaceState(history.state, '', location.pathname + (q ? '?' + q : ''));
  return true;
}

async function quizasInterPedidos(forzado) {
  if (Estado.rol !== 'pro') return false;
  const clave = claveNovedadPedidos();
  if (!forzado) {
    try { if (localStorage.getItem(clave)) return false; } catch {}
  }

  let filas = [];
  try {
    const { data, error } = await sb.from('pedidos')
      .select('id,rubro,localidad,urgencia')
      .eq('estado', 'abierto')
      .order('creado_en', { ascending: false })
      .limit(8);
    if (error) throw error;
    filas = data || [];
  } catch (e) {
    console.warn('[inter-pedidos]', e);
    return false;
  }
  if (!filas.length) return false;

  try { localStorage.setItem(clave, '1'); } catch {}
  mostrarInterPedidos(filas);
  return true;
}

function mostrarInterPedidos(filas) {
  if (document.getElementById('interCerrar')) return;
  const capa = document.createElement('div');
  capa.className = 'inter';
  capa.style.background = 'linear-gradient(160deg, #F0A63A 0%, #D97706 55%, #9A4E10 100%)';
  capa.style.setProperty('--tinta-inter', '#1A0F02');
  capa.style.setProperty('--boton-fondo', '#1A0F02');
  capa.style.setProperty('--boton-tinta', '#F5EFE4');

  const items = filas.map((p, i) => {
    const rubro = rubroDe(p.rubro);
    const urg = urgenciaDe(p.urgencia);
    const urgTxt = p.urgencia === 'urgente' ? ' · Urgente' : (urg ? ' · ' + urg.nombre : '');
    return `<button class="inter-pedido" data-i="${i}">
      <b>${escapar(rubro ? rubro.nombre : p.rubro)}</b>
      <span>${escapar(p.localidad || '')}${escapar(urgTxt)}</span>
    </button>`;
  }).join('');

  capa.innerHTML = `
    <button class="inter-cerrar" id="interCerrar" aria-label="Cerrar">✕</button>
    <div class="inter-cuerpo">
      <span class="inter-rotulo">Contratá Ya</span>
      <h2 class="inter-titulo">Hay pedidos esperándote</h2>
      <p class="inter-texto">Todavía nadie los tomó. Tocá uno para verlo en tu mazo.</p>
      <div class="inter-pedidos">${items}</div>
      <button class="inter-boton" id="interIr">Ver pedidos</button>
    </div>
    <span class="inter-pie">Avisos de la zona</span>`;

  document.body.appendChild(capa);
  document.body.style.overflow = 'hidden';

  const cerrar = () => { capa.remove(); document.body.style.overflow = ''; };
  const abrirPedido = (p) => {
    cerrar();
    Estado.rol = 'pro';
    Estado.pedido.rubro = p.rubro;
    Estado.pedido.urgencia = p.urgencia || 'semana';
    Estado.zona = p.localidad;
    guardar();
    pintarModo();
    if ($('#zonaActual')) $('#zonaActual').textContent = Estado.zona;
    irA('buscar');
  };

  capa.querySelector('#interCerrar').addEventListener('click', cerrar);
  capa.querySelector('#interIr').addEventListener('click', () => {
    cerrar();
    Estado.rol = 'pro';
    guardar();
    pintarModo();
    irA('buscar');
  });
  capa.querySelectorAll('.inter-pedido').forEach(b => {
    b.addEventListener('click', () => abrirPedido(filas[Number(b.dataset.i)]));
  });
}

/* ── Carteles de auspiciantes ────────────────────────────────
   El cartel sale de lo que la persona está haciendo AHORA: su
   oficio activo y la zona donde está buscando. No hay turnos ni
   rotación programada. Roberto buscando pintura en Las Toninas ve
   la pinturería de Las Toninas; el mismo Roberto buscando
   electricidad en San Bernardo ve la ferretería de San Bernardo.

   Es además el momento en que ese cartel sirve: está por agarrar
   un trabajo de pintura, justo cuando va a comprar pintura.
   ─────────────────────────────────────────────────────────── */

const COMERCIO_DE_OFICIO = {
  pintura:       ['pintureria'],
  electricidad:  ['ferreteria'],
  plomeria:      ['ferreteria'],
  gas:           ['ferreteria'],
  destapaciones: ['ferreteria'],
  fumigacion:    ['quimicas', 'ferreteria'],
  climatizacion: ['ferreteria', 'casas_electronica'],
  piletas:       ['ferreteria', 'quimicas'],
  jardineria:    ['ferreteria'],
  mantenimiento: ['ferreteria'],
  casero:        ['hoteles', 'ferreteria'],
  limpieza:      ['hoteles', 'ferreteria'],
  fletes:        ['ferreteria'],
  electronica:   ['casas_electronica', 'ferreteria'],
  cerrajero:     ['ferreteria'],
  albanileria:   ['corralon'],
  techos:        ['corralon'],
  herreria:      ['corralon'],
  durlock:       ['corralon'],
  pisos:         ['corralon'],
  contratista:   ['corralon'],
  carpinteria:   ['corralon', 'aberturas']
};

let carteles = null;

async function cargarCarteles() {
  const { data, error } = await sb.rpc('beneficios_de', { p_localidades: null });
  if (error) { console.warn('[carteles] no se pudieron leer:', error.message); carteles = {}; return; }
  carteles = {};
  (data || []).forEach(x => { carteles[`${x.localidad}|${x.rubro}`] = x; });
}

function comercioPara(oficio, localidad) {
  if (!carteles || !localidad) return null;
  const posibles = COMERCIO_DE_OFICIO[oficio] || ['ferreteria'];

  // Con dos categorías posibles alternamos por día, para que ninguna quede
  // siempre tapada. Nunca las dos juntas: dos carteles en un celular son
  // ruido, y le bajan valor al que pagó exclusividad.
  const orden = (posibles.length > 1 && (new Date().getDate() % 2))
    ? [...posibles].reverse() : posibles;

  for (const cat of orden) {
    const c = carteles[`${localidad}|${cat}`];
    if (c) return c;
  }
  return null;
}

function destinoFranja(enlace) {
  if (!enlace) return null;
  if (['buscar', 'beneficios', 'matches', 'perfil'].includes(enlace)) {
    return { tipo: 'vista', valor: enlace };
  }
  return { tipo: 'href', valor: enlace };
}

function franjaAnunciante(oficio, localidad, rotulo, simple) {
  const c = comercioPara(oficio, localidad);
  window.Avisos?.medirFranja(c, rotulo);

  if (c) {
    const titulo = c.banner_titulo || c.nombre;
    const cuerpo = c.banner_cuerpo || c.beneficio || '';
    const rot = c.banner_rotulo || rotulo || 'Auspicia';
    const designed = !!(c.logo_url || c.banner_titulo || c.banner_fondo);

    if (designed && !simple) {
      const tinta = c.banner_tinta || (c.logo_url ? '#F5EFE4' : '#1A0F02');
      const fondo = c.banner_fondo || c.color || '#F0A63A';
      const estilo = c.logo_url
        ? `background-image:url('${c.logo_url}');color:${tinta}`
        : `background:${fondo};color:${tinta}`;
      const inner = `<span class="sponsor-creativo-cuerpo">
        <em>${escapar(rot)}</em>
        <b>${escapar(titulo)}</b>
        ${cuerpo ? `<span>${escapar(cuerpo)}</span>` : ''}
      </span>`;
      const dest = destinoFranja(c.banner_enlace);
      const cls = `sponsor-franja sponsor-creativo${c.logo_url ? ' con-foto' : ''}`;
      if (dest?.tipo === 'vista') {
        return `<button type="button" class="${cls}" style="${estilo}" data-ir="${escapar(dest.valor)}">${inner}</button>`;
      }
      if (dest?.tipo === 'href') {
        const ext = dest.valor.startsWith('http');
        return `<a class="${cls}" style="${estilo}" href="${escapar(dest.valor)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>`;
      }
      return `<div class="${cls}" style="${estilo}">${inner}</div>`;
    }

    const cuadro = c.logo_url
      ? `<span class="sponsor-cuadro" style="padding:0;overflow:hidden"><img src="${c.logo_url}" alt="" style="width:100%;height:100%;object-fit:cover"></span>`
      : `<span class="sponsor-cuadro" style="background:${c.color || '#F0A63A'}">${escapar(c.nombre.charAt(0))}</span>`;
    return `<div class="sponsor-franja">
      ${cuadro}
      <span class="sponsor-texto"><b>${escapar(c.nombre)}</b><span>${escapar(c.beneficio || '')} · ${escapar(localidad)}</span></span>
      <span class="sponsor-rotulo">${escapar(rotulo || 'Auspicia')}</span>
    </div>`;
  }

  // El hueco invita: un profesional que compra siempre en el mismo lado
  // es el mejor vendedor que podés tener.
  const cat = (COMERCIO_DE_OFICIO[oficio] || ['ferreteria'])[0];
  const nombreCat = { ferreteria: 'ferretería', corralon: 'corralón',
                      pintureria: 'pinturería', aberturas: 'aberturas',
                      quimicas: 'química', hoteles: 'plaza hotelera',
                      casas_electronica: 'casa de electrónica' }[cat] || 'comercio';

  return `<a class="sponsor-franja sponsor-libre" href="/#comercios">
    <span class="sponsor-cuadro sponsor-cuadro-libre">+</span>
    <span class="sponsor-texto"><b>Espacio disponible</b><span>Una ${escapar(nombreCat)} por localidad · ${escapar(localidad || '')}</span></span>
    <span class="sponsor-rotulo">Exclusivo</span>
  </a>`;
}

/* ── Beneficios ──────────────────────────────────────────────
   El beneficio es del PROFESIONAL, no del cliente. El corralón y
   la ferretería no le venden al vecino que arregla su techo: le
   venden al que compra materiales todas las semanas. Para el
   cliente el comercio es sólo presencia de marca.
   ─────────────────────────────────────────────────────────── */

let miCodigoBeneficio = null;

async function traerCodigoBeneficio() {
  if (miCodigoBeneficio) return miCodigoBeneficio;
  const { data, error } = await sb.rpc('mi_codigo_beneficio');
  if (error) { console.warn('[beneficios] sin código:', error.message); return null; }
  miCodigoBeneficio = data;
  return data;
}


/* ── Credencial ──────────────────────────────────────────────
   La pantalla que el profesional le da vuelta al comerciante.

   Dos lectores distintos y por eso el orden importa: la foto va
   arriba y grande porque el que atiende la mira de lejos y al
   revés, para cotejar la cara con la persona que tiene enfrente.
   El código va abajo, separado y espaciado, porque se dicta en
   voz alta arriba del ruido del local.
   ─────────────────────────────────────────────────────────── */

function verCredencial(comercio) {
  const u = Estado.usuario;
  const rubro = rubroDe(Estado.yo.rubro);
  const codigo = miCodigoBeneficio || '';
  // El código llega como "CY1001" o como "CY-1001": se parte por donde
  // termina la letra, no por un guión que puede no estar. Antes, sin guión,
  // salía "CY1001 ·" con el punto colgando y sin números.
  const limpio = String(codigo).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letras = (limpio.match(/^[A-Z]+/) || [''])[0];
  const numeros = limpio.slice(letras.length).replace(/(\d{2})(?=\d)/g, '$1 ');

  const sellos = (Estado.yo.verificacion || [])
    .filter(v => ['identidad', 'telefono', 'email', 'zona', 'cuit'].includes(v));

  abrirHoja(`
    <div class="credencial">
      <div class="credencial-foto">
        <img src="${u.foto}" alt="">
      </div>

      <h2 class="credencial-nombre">${escapar(u.nombre)}</h2>
      <p class="credencial-oficio">${escapar(rubro.nombre)} · ${escapar(Estado.yo.localidad || '')}</p>

      ${sellos.length ? `<p class="credencial-sellos">✓ ${sellos.length} ${sellos.length === 1 ? 'verificación' : 'verificaciones'} · ${puntajeActual() != null ? puntajeActual().toFixed(1).replace('.', ',') + ' ★' : 'sin calificar'}</p>` : ''}

      <div class="credencial-codigo">
        <span class="credencial-rotulo">Código para el comercio</span>
        <b>${escapar(letras)} · ${escapar(numeros)}</b>
        <button class="btn btn-fantasma btn-sm" id="copiarCodigo">Copiar</button>
      </div>

      ${comercio ? `
        <p class="credencial-donde">${escapar(comercio.nombre)} · ${escapar(comercio.beneficio || '')}</p>
        ${comercio.direccion ? `<a class="beneficio-donde" href="https://www.google.com/maps/search/${encodeURIComponent(comercio.direccion + ', ' + comercio.localidad)}" target="_blank" rel="noopener">${escapar(comercio.direccion)} · Ver en el mapa</a>` : ''}
      ` : ''}

      <p class="credencial-pie">Mostrale esta pantalla y dictale el código. Él lo carga y queda registrada la visita.</p>
    </div>`);

  const b = $('#copiarCodigo');
  if (b) b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      b.textContent = 'Copiado ✓';
    } catch {
      b.textContent = 'Copialo a mano';
    }
  });
}

/* Una sola pantalla de falla para toda la app. Antes, cuando algo no se podía
   traer, cada pantalla dibujaba su estado vacío: la app le decía a la persona
   que no tenía nada cuando en realidad no había podido preguntar. */
function htmlNoSePudo(que, idBoton) {
  return `
    <div class="vacio" style="margin-top:24px">
      <span class="vacio-glifo">⚠</span>
      <h3>No pudimos traer ${que}</h3>
      <p>Puede ser la señal. Nada se perdió: probá de nuevo.</p>
      <div class="vacio-acciones">
        <button class="btn btn-plomo btn-sm" id="${idBoton}">Reintentar</button>
      </div>
    </div>`;
}

async function verBeneficios() {
  const esPro = Estado.rol === 'pro';
  const zona = Estado.zona || Estado.yo.localidad;

  escena.innerHTML = `<div class="vista" data-cargando="beneficios">
    <h1 class="titulo-vista">Beneficios</h1>
    <p class="sub-vista">Buscando comercios adheridos…</p>
    ${esqueletoFilas(3)}</div>`;

  const { data: filas, error } = await sb.rpc('beneficios_de', { p_localidades: null });
  if (error) {
    console.warn('[beneficios] no se pudieron leer:', error.message);
    if (!escena.querySelector('[data-cargando="beneficios"]')) return;
    escena.innerHTML = `<div class="vista">
      <h1 class="titulo-vista">Beneficios</h1>
      ${htmlNoSePudo('los comercios de tu zona', 'reintentarBeneficios')}</div>`;
    const b = $('#reintentarBeneficios');
    if (b) b.addEventListener('click', () => ocupar(b, 'Probando…', () => verBeneficios()));
    return;
  }

  const todos = filas || [];
  const propios = todos.filter(x => x.localidad === zona);
  const otros = todos.filter(x => x.localidad !== zona);

  // El código sólo tiene sentido para el profesional: es él quien lo
  // muestra en el mostrador.
  const codigo = esPro ? await traerCodigoBeneficio() : null;
  if (!escena.querySelector('[data-cargando="beneficios"]')) return;   // se fue a otra pantalla
  // Igual que en la credencial: se parte donde terminan las letras, no por un
  // guión que puede no venir.
  const limpioCod = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letrasCod = (limpioCod.match(/^[A-Z]+/) || [''])[0];
  const numerosCod = limpioCod.slice(letrasCod.length).replace(/(\d{2})(?=\d)/g, '$1 ');

  const cuadro = (x) => x.logo_url
    ? `<span class="sponsor-cuadro" style="padding:0;overflow:hidden"><img src="${x.logo_url}" alt="" style="width:100%;height:100%;object-fit:cover"></span>`
    : `<span class="sponsor-cuadro" style="background:${x.color || 'var(--plomo)'}">${escapar(x.nombre.charAt(0))}</span>`;

  const tarjeta = (x, cerca) => `
    <article class="beneficio ${cerca ? '' : 'bloqueado'}" style="--tono:${x.color || '#F0A63A'}">
      <div class="beneficio-cabeza">
        ${cuadro(x)}
        <div><h3>${escapar(x.nombre)}</h3><p class="beneficio-zonas">${escapar(x.rubro)} · ${escapar(x.localidad)}</p></div>
      </div>
      <p class="beneficio-detalle">${escapar(x.beneficio || 'Beneficio para profesionales')}</p>
      ${x.letra_chica ? `<p class="beneficio-zonas">${escapar(x.letra_chica)}</p>` : ''}
      ${x.direccion ? `<a class="beneficio-donde" href="https://www.google.com/maps/search/${encodeURIComponent(x.direccion + ', ' + x.localidad)}" target="_blank" rel="noopener">${escapar(x.direccion)} · Ver en el mapa</a>` : ''}
      ${cerca && esPro && codigo
        ? `<button class="btn btn-plomo btn-bloque btn-sm" data-credencial="${escapar(x.anunciante_id)}" style="margin-top:12px">Mostrar mi credencial</button>`
        : ''}
      ${cerca && !esPro
        ? `<p class="beneficio-zonas">El descuento es para profesionales. Pasale el dato al tuyo.</p>` : ''}
    </article>`;

  escena.innerHTML = `
    <div class="vista">
      <h1 class="titulo-vista">Beneficios</h1>
      <p class="sub-vista">${esPro
        ? 'Descuentos en comercios de la costa para profesionales de la plataforma. Mostrás tu perfil y el código, y listo.'
        : 'Comercios de la costa adheridos. Los descuentos son para los profesionales que trabajan con vos.'}</p>

      ${esPro && codigo ? `
      <div class="tarjeta" style="margin-bottom:20px">
        <p class="eyebrow" style="margin-bottom:8px">Tu código de descuento</p>
        <p style="font-size:14.5px;color:var(--cal-2);margin-bottom:12px">Mostralo en el comercio. Si todavía no hay uno adherido en tu zona, el código ya es tuyo: cuando entre, lo usás igual.</p>
        <div class="credencial-codigo" style="margin:0 0 12px">
          <span class="credencial-rotulo">Código para el comercio</span>
          <b>${escapar(letrasCod)} · ${escapar(numerosCod)}</b>
        </div>
        <button class="btn btn-plomo btn-bloque btn-sm" id="mostrarCredencial">Mostrar mi credencial</button>
      </div>` : ''}

      <p class="bloque-titulo">En ${escapar(zona)}</p>
      ${propios.length
        ? propios.map(x => tarjeta(x, true)).join('')
        : `<div class="vacio">
             <p>Todavía no hay comercios adheridos en ${escapar(zona)}.</p>
             <p style="margin-top:8px;font-size:13.5px">Si comprás siempre en el mismo lado, contales que existe esto: es un lugar por rubro y por localidad, y el de tu zona está libre.</p>
           </div>`}

      ${otros.length ? `<p class="bloque-titulo">En otras localidades</p>${otros.map(x => tarjeta(x, false)).join('')}` : ''}

      <div class="tarjeta" style="margin-top:24px">
        <p class="eyebrow" style="margin-bottom:8px">¿Tenés un comercio?</p>
        <p style="font-size:14.5px;color:var(--cal-2);margin-bottom:14px">Un solo comercio por rubro y por localidad. Si la tuya está libre, es tuya mientras dure el acuerdo.</p>
        <a class="btn btn-fantasma btn-bloque btn-sm" href="/#comercios">Cómo funciona para comercios</a>
      </div>
    </div>`;

  escena.querySelectorAll('[data-credencial]').forEach(b => {
    b.addEventListener('click', () => {
      const x = todos.find(t => t.anunciante_id === b.dataset.credencial);
      verCredencial(x);
    });
  });
  const btnCred = document.getElementById('mostrarCredencial');
  if (btnCred) btnCred.addEventListener('click', () => verCredencial(propios[0] || null));
  window.Avisos?.cupones(escena.querySelector('.vista'));
}

/* ══════════════════════════════════════════════════════════
   PERFIL
   ══════════════════════════════════════════════════════════ */
function cabezaPerfil(subtitulo) {
  const u = Estado.usuario;
  return `
    <div class="perfil-cabeza">
      <button class="perfil-foto-btn" id="cambiarFoto" aria-label="Cambiar foto">
        <img class="perfil-avatar" src="${u.foto}" alt="Tu foto">
        <span class="perfil-foto-lapiz">✎</span>
      </button>
      <div>
        <h2>${u.nombre}</h2>
        <p>${subtitulo}</p>
      </div>
    </div>`;
}

/* ── Fotos de perfil ─────────────────────────────────────────
   Redimensionar en el navegador antes de subir no es sólo por
   peso: al redibujar la imagen en un canvas se pierden TODOS los
   metadatos del archivo original, incluida la ubicación GPS que
   los celulares guardan en cada foto. Sin esto, un profesional
   estaría publicando las coordenadas de su casa sin saberlo.
   ─────────────────────────────────────────────────────────── */

const FOTO_LADO = 512;   // píxeles del cuadrado final
const GALERIA_MAX = 6;
const FOTO_LADO_GALERIA = 900;

// Una foto es "real" si está subida al depósito. Los dibujos de
// FOTOS_PERFIL y el vacío no cuentan: el argumento del producto es que
// atrás de cada estrella hay una persona, y un dibujito lo desmiente.
// ¿Esta persona tiene una foto que sirva para mostrarla en el mazo?
// Vale la que subió a la plataforma y también las que viven en el propio
// sitio (/img/gente/…): en esta instalación esas SON las fotos de la gente.
// Antes se exigía el bucket de storage y, como ninguna foto lo cumplía, el
// mazo del vecino daba vacío siempre.
function esFotoReal(url) {
  if (!url) return false;
  const limpia = String(url).split('?')[0];
  if (limpia.includes('/storage/v1/object/public/fotos/')) return true;
  return /(^|\/)img\/gente\/[^/]+$/.test(limpia);
}

// ¿YO todavía no subí mi foto? Acá no alcanza con mirar la ruta: si nunca
// subió nada, la app le presta un dibujito para no dejar el hueco, y ese
// préstamo no puede contar como foto propia. La verdad la tiene el perfil.
const tengoFotoPropia = () => !!(Estado.usuario && Estado.usuario.fotoPropia);

// Sólo se le exige al profesional: es su vidriera y le construye
// reputación. Al cliente se le pediría un requisito sin devolverle nada.
const necesitoFoto = () => Estado.rol === 'pro' && !tengoFotoPropia();

// Abre la imagen sin convertirla a texto. FileReader + base64 infla la
// foto un tercio en memoria y se cae con las fotos grandes de celular, o
// cuando el archivo está en la nube y no descargado en el teléfono.
async function abrirImagen(archivo) {
  // Camino directo: decodifica el archivo sin pasar por el DOM.
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(archivo);
    } catch (e) {
      console.warn('[foto] createImageBitmap no pudo, probamos con objectURL:', e.message);
    }
  }

  // Respaldo: una dirección temporal que apunta al archivo, sin copiarlo.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo abrir esa imagen. Si la sacaste con un iPhone puede estar en formato HEIC: probá sacarla con la cámara desde acá.'));
    };
    img.src = url;
  });
}

// Recorta al centro, escala y devuelve un JPEG limpio.
async function prepararFoto(archivo, ladoFinal) {
  const img = await abrirImagen(archivo);

  const ancho = img.width, alto = img.height;
  if (!ancho || !alto) throw new Error('La imagen está vacía o dañada');

  const lado = Math.min(ancho, alto);          // el cuadrado más grande que entre
  const x = (ancho - lado) / 2;
  const y = (alto  - lado) / 2;

  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = ladoFinal || FOTO_LADO;
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(img, x, y, lado, lado, 0, 0, lienzo.width, lienzo.height);

  if (img.close) img.close();   // libera el bitmap enseguida

  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      b => b ? resolve(b) : reject(new Error('No se pudo procesar la imagen')),
      'image/jpeg',
      0.85
    );
  });
}

async function subirFotoPerfil(archivo) {
  // Algunos celulares informan el tipo vacío al elegir de la galería,
  // así que no lo damos por perdido: si no es imagen, va a fallar al abrirla.
  if (archivo.type && !archivo.type.startsWith('image/')) throw new Error('Ese archivo no es una imagen');
  if (archivo.size > 40 * 1024 * 1024) throw new Error('La imagen es demasiado grande');

  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Sesión vencida, volvé a entrar');

  const blob = await prepararFoto(archivo);
  const ruta = `${uid}/perfil.jpg`;

  const { error: eSubida } = await sb.storage.from('fotos')
    .upload(ruta, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (eSubida) {
    console.warn('[foto] no se pudo subir:', eSubida.message);
    throw new Error('No se pudo subir la foto');
  }

  // Siempre la misma ruta, así no se acumulan fotos viejas. Como se pisa,
  // le colgamos la fecha para que el CDN y el navegador no muestren la anterior.
  const { data } = sb.storage.from('fotos').getPublicUrl(ruta);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  await guardarFotoEnPerfil(url);
  return url;
}

// Guarda la foto elegida en la base. Antes esto no existía: el avatar
// se cambiaba sólo en memoria y los demás te seguían viendo con el de fábrica.
async function guardarFotoEnPerfil(url) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;

  const { error } = await sb.from('perfiles').update({ foto_url: url }).eq('id', uid);
  if (error) console.warn('[foto] no se pudo guardar en el perfil:', error.message);

  // Sin foto propia queda el marcador de posición, que no es una opción
  // elegible: sirve para no dejar un hueco mientras no subió la suya.
  Estado.usuario.foto = url || FOTOS_PERFIL[0];
  Estado.usuario.fotoPropia = !!url;
  guardar();
}

function galeriaActual() {
  return Array.isArray(Estado.yo?.galeria) ? Estado.yo.galeria.filter(Boolean) : [];
}

async function guardarGaleria(lista) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Sesión vencida, volvé a entrar');
  const limpia = (lista || []).filter(Boolean).slice(0, GALERIA_MAX);
  const { error } = await sb.from('perfiles').update({ galeria: limpia }).eq('id', uid);
  if (error) throw new Error(error.message || 'No se pudo guardar la galería');
  Estado.yo.galeria = limpia;
  guardar();
}

async function subirFotoGaleria(archivo) {
  if (archivo.type && !archivo.type.startsWith('image/')) throw new Error('Ese archivo no es una imagen');
  if (archivo.size > 40 * 1024 * 1024) throw new Error('La imagen es demasiado grande');
  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Sesión vencida, volvé a entrar');

  const blob = await prepararFoto(archivo, FOTO_LADO_GALERIA);
  const ruta = `${uid}/galeria/${Date.now()}.jpg`;
  const { error: eSubida } = await sb.storage.from('fotos')
    .upload(ruta, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (eSubida) throw new Error('No se pudo subir la foto');
  const { data } = sb.storage.from('fotos').getPublicUrl(ruta);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  await guardarGaleria(galeriaActual().concat(url));
}

function pintarGaleriaEditor() {
  const caja = $('#ppGaleria');
  if (!caja) return;
  const fotos = galeriaActual();
  const puede = fotos.length < GALERIA_MAX;
  caja.innerHTML = fotos.map((u, i) => `
    <div class="g-item">
      <img src="${escapar(u)}" alt="">
      <button type="button" class="g-x" data-g="${i}" aria-label="Sacar foto">✕</button>
    </div>`).join('') + (puede ? `<button type="button" class="g-add" id="ppGaleriaAdd">+</button>` : '');

  caja.querySelectorAll('[data-g]').forEach(b => {
    b.addEventListener('click', async () => {
      const i = Number(b.dataset.g);
      try {
        await guardarGaleria(galeriaActual().filter((_, n) => n !== i));
        pintarGaleriaEditor();
      } catch (e) { brindis(e.message || 'No se pudo sacar'); }
    });
  });
  const add = $('#ppGaleriaAdd');
  const input = $('#ppGaleriaArchivo');
  if (add && input) {
    add.addEventListener('click', () => input.click());
    input.onchange = async () => {
      const archivo = input.files && input.files[0];
      input.value = '';
      if (!archivo) return;
      add.disabled = true;
      add.textContent = '…';
      try {
        await subirFotoGaleria(archivo);
        pintarGaleriaEditor();
        brindis('Foto agregada');
      } catch (e) { brindis(e.message || 'No se pudo subir'); }
      finally { add.disabled = false; add.textContent = '+'; }
    };
  }
}

function conectarCambioFoto(volver) {
  const b = $('#cambiarFoto');
  if (!b) return;
  b.addEventListener('click', () => {
    const tieneFoto = esFotoReal(Estado.usuario?.foto);

    // Dos entradas separadas. La diferencia está en el atributo capture:
    // con él, el celular abre la cámara directo; sin él, el álbum.
    // En la computadora capture se ignora y las dos abren el explorador.
    abrirHoja(`
      <h2>Tu foto</h2>
      <p>Es lo primero que mira alguien antes de dejar entrar a un desconocido a su casa. Que se te vea la cara, de frente y con buena luz.</p>

      <input type="file" id="fotoCamara"  accept="image/*" capture="user" hidden>
      <input type="file" id="fotoGaleria" accept="image/*" hidden>

      <button class="btn btn-plomo btn-bloque" id="usarCamara" style="margin-top:18px">Sacar una foto ahora</button>
      <button class="btn btn-fantasma btn-bloque" id="usarGaleria" style="margin-top:8px">Elegir de la galería</button>

      <p id="estadoFoto" style="font-size:13px;color:var(--cal-3);text-align:center;margin-top:14px">Se recorta cuadrada y se le quitan los datos de ubicación.</p>

      ${tieneFoto ? `<button class="btn btn-fantasma btn-bloque btn-sm" id="quitarFoto" style="margin-top:14px">Quitar la foto actual</button>` : ''}`);

    const aviso = $('#estadoFoto');
    const botones = [$('#usarCamara'), $('#usarGaleria')];

    const procesar = async (entrada) => {
      const archivo = entrada.files && entrada.files[0];
      if (!archivo) return;

      botones.forEach(x => { x.disabled = true; });
      $('#usarCamara').textContent = 'Subiendo…';
      aviso.textContent = 'Procesando la imagen…';

      try {
        await subirFotoPerfil(archivo);
        cerrarHoja();
        brindis('Foto actualizada');
        volver();
      } catch (e) {
        botones.forEach(x => { x.disabled = false; });
        $('#usarCamara').textContent = 'Sacar una foto ahora';
        aviso.textContent = e.message || 'No se pudo subir';
        entrada.value = '';
      }
    };

    $('#usarCamara').addEventListener('click', () => $('#fotoCamara').click());
    $('#usarGaleria').addEventListener('click', () => $('#fotoGaleria').click());
    $('#fotoCamara').addEventListener('change',  () => procesar($('#fotoCamara')));
    $('#fotoGaleria').addEventListener('change', () => procesar($('#fotoGaleria')));

    if ($('#quitarFoto')) {
      $('#quitarFoto').addEventListener('click', async () => {
        await guardarFotoEnPerfil(null);
        cerrarHoja();
        brindis('Foto quitada');
        volver();
      });
    }
  });
}

/* ── Reseñas reales ─────────────────────────────────────────
   Un solo lugar del que salen todas las reseñas: mi perfil y la
   ficha de cualquier otra persona. No usa embed de PostgREST a
   propósito, así no depende de a dónde apunte la clave foránea
   de autor_id (auth.users o perfiles).
   ─────────────────────────────────────────────────────────── */

const escapar = (t) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const fechaDe = (c) => c.creado_en || c.creado || c.created_at || null;

// Devuelve las calificaciones con comentario que recibió una persona.
// destinoId: uuid del usuario · hacia: 'pro' | 'cliente' (en qué papel lo calificaron)
async function traerResenas(destinoId, hacia) {
  if (!destinoId) return [];
  try {
    // select('*') a propósito: no dependemos del nombre exacto de la columna de fecha.
    const { data, error } = await sb.from('calificaciones')
      .select('*')
      .eq('destino_id', destinoId)
      .eq('hacia', hacia);

    if (error) { console.warn('[reseñas] no se pudieron leer:', error.message, error.code || ''); return []; }

    const conTexto = (data || []).filter(c => c.texto && String(c.texto).trim());
    if (!conTexto.length) return [];

    // Nombres de los autores, en una consulta aparte.
    const ids = [...new Set(conTexto.map(c => c.autor_id).filter(Boolean))];
    const nombres = {};
    if (ids.length) {
      const { data: autores, error: e2 } = await sb.from('perfiles').select('id,nombre').in('id', ids);
      if (e2) console.warn('[reseñas] no se pudieron leer los autores:', e2.message);
      (autores || []).forEach(a => { nombres[a.id] = a.nombre; });
    }

    return conTexto
      .map(c => ({
        autor: (nombres[c.autor_id] || 'Alguien').split(' ')[0],
        puntaje: Number(c.puntaje) || 0,
        texto: String(c.texto).trim(),
        fecha: fechaDe(c)
      }))
      .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  } catch (e) {
    console.warn('[reseñas] error inesperado:', e);
    return [];
  }
}

// Dibuja una lista de reseñas. Si está vacía, muestra el texto de relleno.
function htmlResenas(lista, vacio) {
  if (!lista.length) {
    return vacio ? `<p style="font-size:14px;color:var(--cal-3);margin-top:4px">${vacio}</p>` : '';
  }
  return lista.map(r => `
    <div class="resena">
      <div class="resena-cabeza"><b>${escapar(r.autor)}</b><span>${estrellas(r.puntaje)}</span></div>
      <p>${escapar(r.texto)}</p>
    </div>`).join('');
}

// Las reseñas que me dejaron a mí, en mi propio perfil.
async function pintarResenasReales(hacia, contId) {
  if (!document.getElementById(contId)) return;
  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;

  const lista = await traerResenas(uid, hacia);
  const cont = document.getElementById(contId);   // puede haber cambiado de pantalla mientras cargaba
  if (!cont || !lista.length) return;             // sin comentarios, no mostramos la sección

  cont.innerHTML = `<p class="bloque-titulo">Lo que dijeron de vos</p>${htmlResenas(lista, '')}`;
}

// Rellena el contenedor de reseñas dentro de una ficha ya abierta.
function cargarResenasEnFicha(destinoId, hacia, vacio) {
  traerResenas(destinoId, hacia).then(lista => {
    const c = document.getElementById('resenasFicha');
    if (c) c.innerHTML = htmlResenas(lista, vacio);
  });
}



/* ── Calificaciones pendientes ───────────────────────────────
   El freno vive en la base (políticas de RLS). Acá sólo lo
   anticipamos para explicarlo bien: si esperáramos al error de
   Postgres, la persona vería un mensaje técnico y no entendería
   qué tiene que hacer.
   ─────────────────────────────────────────────────────────── */

async function tengoPendienteCalificar() {
  try {
    const { data, error } = await sb.rpc('tengo_pendiente_calificar');
    if (error) { console.warn('[bloqueo] no se pudo consultar:', error.message); return false; }
    return data === true;
  } catch (e) { return false; }
}

// Muestra el porqué y lleva al trabajo que hay que calificar.
function explicarBloqueo() {
  abrirHoja(`
    <h2>Te falta una calificación</h2>
    <p>Terminaste un trabajo y todavía no calificaste a la otra parte. Hasta que lo hagas no podés ${Estado.rol === 'pro' ? 'tomar trabajos nuevos' : 'publicar pedidos nuevos'}.</p>
    <p style="margin-top:10px">No es un capricho: las estrellas de este lugar valen algo justamente porque todos califican. Si la mitad no lo hace, los puntajes no significan nada.</p>
    <button class="btn btn-plomo btn-bloque" id="irACalificar" style="margin-top:20px">Ir a calificar</button>
    <button class="btn btn-fantasma btn-bloque" id="cerrarBloqueo" style="margin-top:8px">Ahora no</button>`);

  $('#cerrarBloqueo').addEventListener('click', cerrarHoja);
  $('#irACalificar').addEventListener('click', async () => {
    cerrarHoja();
    await cargarMatches();
    // Vamos derecho al que lo está trabando.
    const m = matchesReales.find(x => x.trabajo?.estado === 'terminado' && !x.califique);
    if (m) verMatchChat(m); else irA('matches');
  });
}

// Devuelve true si hay que frenar. Úsese antes de publicar o deslizar.
async function frenadoPorCalificar() {
  if (!(await tengoPendienteCalificar())) return false;
  explicarBloqueo();
  return true;
}

/* ── Avisos al teléfono ──────────────────────────────────────
   El permiso del navegador se pide UNA sola vez: si la persona
   dice que no, no hay forma de volver a preguntarle desde acá,
   tiene que ir a la configuración del navegador. Por eso primero
   mostramos una pantalla nuestra explicando para qué sirve, y
   recién si acepta gastamos ese único intento.
   ─────────────────────────────────────────────────────────── */

// Clave pública VAPID. La privada vive en Supabase → Edge Functions → Secrets.
const VAPID_PUBLICA = 'BNDOVca36LsmM44l11yhhYKtCuBsVpGPhSLspgJloKHPqQBmkJg6EFmyoAMIR0Q0o_vTkj_xd3IyFg0XuHF0CP4';

const hayPush = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// El navegador la quiere como bytes, no como texto.
function claveABytes(base64) {
  const relleno = '='.repeat((4 - base64.length % 4) % 4);
  const limpia = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(limpia);
  return Uint8Array.from([...crudo].map(c => c.charCodeAt(0)));
}

async function registrarSuscripcion() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const clave = claveABytes(VAPID_PUBLICA);

    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      const vieja = sub.options && sub.options.applicationServerKey;
      if (vieja) {
        const a = new Uint8Array(vieja);
        let igual = a.length === clave.length;
        if (igual) for (let i = 0; i < a.length; i++) if (a[i] !== clave[i]) { igual = false; break; }
        if (!igual) {
          await sub.unsubscribe().catch(() => {});
          sub = null;
        }
      }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: clave
      });
    }

    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return false;

    const datos = sub.toJSON();
    if (!datos.endpoint || !datos.keys) return false;
    const fila = {
      usuario_id: uid,
      endpoint: datos.endpoint,
      p256dh: datos.keys.p256dh,
      auth: datos.keys.auth,
      navegador: navigator.userAgent.slice(0, 120),
      fallos: 0
    };

    const { error } = await sb.from('suscripciones_push').upsert(fila, { onConflict: 'endpoint' });
    if (!error) return true;

    const { error: e2 } = await sb.rpc('guardar_suscripcion_push', {
      p_endpoint: fila.endpoint,
      p_p256dh: fila.p256dh,
      p_auth: fila.auth,
      p_navegador: fila.navegador
    });
    if (e2) {
      console.warn('[push] no se pudo guardar la suscripción:', error.message, e2.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[push] registrar:', e);
    return false;
  }
}

function brindisAvisos(ok, yaEstaba) {
  if (yaEstaba) brindis('Ya estaban activas en este teléfono');
  else if (ok) brindis('Avisos activados');
  else brindis('No se pudieron activar los avisos. Probá de nuevo.');
}

async function activarAvisos() {
  if (!hayPush()) {
    brindis('Este navegador no admite avisos');
    return;
  }

  try { await navigator.serviceWorker.register('/sw.js'); } catch {}

  const iosSinInstalar = typeof Instalar !== 'undefined' && Instalar.esIOS && !Instalar.yaInstalada;
  if (iosSinInstalar) {
    abrirHoja(`
      <h2>Primero instalala</h2>
      <p>En iPhone los avisos sólo funcionan si Contratá Ya está en la pantalla de inicio: tocá el botón de compartir y después <b>Agregar a inicio</b>.</p>
      <button class="btn btn-fantasma btn-bloque" id="avisosDespues" style="margin-top:18px">Entendido</button>`);
    $('#avisosDespues').addEventListener('click', cerrarHoja);
    return;
  }

  if (Notification.permission === 'denied') {
    abrirHoja(`
      <h2>Los avisos están bloqueados</h2>
      <p>El teléfono no nos deja volver a preguntar. Hay que activarlos a mano.</p>
      <p style="margin-top:12px;color:var(--plomo)">En Android: candado o info de la página → Notificaciones → Permitir.</p>
      <p style="margin-top:8px;color:var(--plomo)">En iPhone: Ajustes → Contratá Ya → Notificaciones.</p>
      <button class="btn btn-fantasma btn-bloque" id="avisosDespues" style="margin-top:18px">Entendido</button>`);
    $('#avisosDespues').addEventListener('click', cerrarHoja);
    return;
  }

  const yaEstaba = Notification.permission === 'granted';
  if (yaEstaba) {
    const ok = await registrarSuscripcion();
    brindisAvisos(ok, true);
    return;
  }

  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      brindis('Quedaron desactivados');
      return;
    }
    const ok = await registrarSuscripcion();
    brindisAvisos(ok, false);
  } catch (e) {
    console.warn('[push] falló la activación:', e);
    brindis('No se pudieron activar los avisos');
  }
}

function estadoAvisos() {
  if (!hayPush()) return 'no';
  if (typeof Instalar !== 'undefined' && Instalar.esIOS && !Instalar.yaInstalada) return 'ios';
  const p = Notification.permission;
  if (p === 'granted') return 'on';
  if (p === 'denied') return 'bloqueado';
  return 'pedir';
}

function htmlCajaAvisos() {
  const e = estadoAvisos();
  let nota = '';
  if (e === 'on') nota = '<p style="font-size:13.5px;color:var(--marea);margin-bottom:12px">Activadas en este teléfono.</p>';
  else if (e === 'bloqueado') nota = '<p style="font-size:13.5px;color:var(--cal-3);margin-bottom:12px">Están bloqueadas. El botón te muestra cómo encenderlas a mano.</p>';
  else if (e === 'ios') nota = '<p style="font-size:13.5px;color:var(--cal-3);margin-bottom:12px">En iPhone, primero agregala a la pantalla de inicio.</p>';
  else if (e === 'no') nota = '<p style="font-size:13.5px;color:var(--cal-3)">Este navegador no admite avisos. Usala desde el celular.</p>';
  const boton = e === 'no' ? '' : '<button class="btn btn-plomo btn-bloque" id="btnAvisos">Activar notificaciones</button>';
  return `${nota}${boton}`;
}

function bloqueAvisos() {
  return `
    <p class="bloque-titulo">Notificaciones</p>
    <div class="tarjeta">
      <p style="font-size:14.5px;color:var(--cal-2);margin-bottom:14px">
        Te avisamos al teléfono cuando hay un match, un mensaje o una calificación. Sin tener la app abierta.
      </p>
      <div id="cajaAvisos">${htmlCajaAvisos()}</div>
    </div>`;
}

function engancharAvisos() {
  const b = $('#btnAvisos');
  if (!b) return;
  b.addEventListener('click', async () => {
    b.disabled = true;
    b.textContent = 'Activando…';
    try { await activarAvisos(); }
    finally { pintarCajaAvisos(); }
  });
}

function pintarCajaAvisos() {
  const caja = document.getElementById('cajaAvisos');
  if (!caja) return;
  caja.innerHTML = htmlCajaAvisos();
  engancharAvisos();
}

// Se llama después de la primera acción que importa, no al entrar.
async function quizasPedirAvisos() {
  if (!hayPush()) return;
  if (Notification.permission !== 'default') {
    // Ya respondió alguna vez. Si dijo que sí, nos aseguramos de estar registrados.
    if (Notification.permission === 'granted') registrarSuscripcion().catch(() => {});
    return;
  }
  try { if (localStorage.getItem('avisosPreguntado')) return; } catch {}

  const iosSinInstalar = typeof Instalar !== 'undefined' && Instalar.esIOS && !Instalar.yaInstalada;

  abrirHoja(`
    <h2>Que no se te escape un trabajo</h2>
    <p>Te avisamos al teléfono cuando alguien te escriba, te pida un trabajo o te deje una calificación. Sin la app abierta.</p>
    ${iosSinInstalar ? `
    <p style="margin-top:12px;color:var(--plomo)">En iPhone los avisos sólo funcionan si primero agregás Contratá Ya a la pantalla de inicio: tocá el botón de compartir y después <b>Agregar a inicio</b>.</p>
    <button class="btn btn-fantasma btn-bloque" id="avisosDespues" style="margin-top:18px">Entendido</button>` : `
    <button class="btn btn-plomo btn-bloque" id="avisosSi" style="margin-top:18px">Activar los avisos</button>
    <button class="btn btn-fantasma btn-bloque" id="avisosDespues" style="margin-top:8px">Ahora no</button>`}`);

  try { localStorage.setItem('avisosPreguntado', '1'); } catch {}

  $('#avisosDespues').addEventListener('click', cerrarHoja);

  if ($('#avisosSi')) {
    $('#avisosSi').addEventListener('click', async () => {
      const b = $('#avisosSi');
      b.disabled = true;
      b.textContent = 'Activando…';
      cerrarHoja();
      await activarAvisos();
    });
  }
}

/* ── Puntaje según el rol activo ─────────────────────────────
   Una persona tiene dos reputaciones separadas: puntaje_pro y
   puntaje_cliente. Cuál se muestra depende del modo en el que
   esté parada en ese momento.
   ─────────────────────────────────────────────────────────── */

function puntajeActual() {
  const u = Estado.usuario;
  if (!u) return null;
  const p = Estado.rol === 'pro' ? u.puntajePro : u.puntajeCliente;
  return (p == null) ? null : Number(p);
}

function textoPuntaje() {
  const p = puntajeActual();
  return (p == null) ? '—' : p.toFixed(1);
}

// Relee los puntajes de la base y actualiza la métrica sin repintar todo.
// Hace falta porque el trigger recalcular_puntaje() corre del lado del
// servidor: si alguien te califica mientras tenés la app abierta, el
// número que quedó en memoria desde el login ya está viejo.
async function refrescarPuntajes() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid || !Estado.usuario) return;

    const { data: fila, error } = await sb.from('perfiles')
      .select('puntaje_pro,puntaje_cliente,trabajos,contrataciones')
      .eq('id', uid)
      .maybeSingle();
    if (error) { console.warn('[puntaje] no se pudo releer:', error.message); return; }
    if (!fila) return;

    Estado.usuario.puntajePro     = (fila.puntaje_pro != null) ? Number(fila.puntaje_pro) : null;
    Estado.usuario.puntajeCliente = (fila.puntaje_cliente != null) ? Number(fila.puntaje_cliente) : null;
    Estado.usuario.trabajos       = fila.trabajos || 0;
    Estado.usuario.contrataciones = fila.contrataciones || 0;
    guardar();

    const caja = document.getElementById('metricaPuntaje');
    if (caja) caja.querySelector('b').textContent = textoPuntaje();
  } catch (e) { console.warn('[puntaje] error inesperado:', e); }
}

function bloquePuntaje() {
  if (puntajeActual() == null) {
    return `
      <div class="tarjeta" style="margin-bottom:16px">
        <p class="eyebrow" style="margin-bottom:8px">Tu calificación</p>
        <p style="font-size:14.5px;color:var(--cal-2)">
          Todavía no tenés. Aparece cuando termines tu primer trabajo y la otra parte te puntúe.
          ${Estado.rol === 'pro' ? 'Los clientes califican calidad, plazo, precio y limpieza.' : 'Los profesionales califican si pagás en fecha, si sos claro con el pedido, si das acceso a la obra y el trato.'}
        </p>
      </div>`;
  }
  return '';
}

function verPerfil() {
  return Estado.rol === 'pro' ? verPerfilPro() : verPerfilCliente();
}

function htmlBtnTutorial() {
  return `<button class="btn btn-tutorial-guia btn-bloque" id="btnTutorial" type="button">Cómo se usa la app</button>`;
}

function bloqueVerificacionCuenta() {
  const activa = cuentaActiva();
  const sello = (Estado.yo?.verificacion || []).includes('identidad');
  return `
    <p class="bloque-titulo">Verificación</p>
    <div class="tarjeta">
      <div class="capa-fila ok">
        <span class="capa-tilde">✓</span>
        <span style="flex:1"><b>Correo y contraseña</b><span>Así entrás a la cuenta.</span></span>
      </div>
      <div class="capa-fila ${sello || activa ? 'ok' : ''}" style="margin-top:8px">
        <span class="capa-tilde">${sello || activa ? '✓' : '—'}</span>
        <span style="flex:1"><b>Activada por WhatsApp</b><span>${sello || activa
          ? 'Hablamos con vos y activamos la cuenta. Ese es el sello de verificado.'
          : 'Mandanos un WhatsApp para activar y verificar la cuenta.'}</span></span>
      </div>
    </div>`;
}

function engancharWhatsappVerificacion() {}

function mensajeActivacionWA() {
  const nombre = Estado.usuario?.nombre || '';
  const rol = Estado.rol === 'pro' ? 'profesional' : (Estado.rol === 'cliente' ? 'cliente' : 'usuario');
  const zona = Estado.zona || Estado.yo?.localidad || '';
  return `Hola, soy ${nombre}. Me registré en Contratá Ya como ${rol}${zona ? ' en ' + zona : ''} y quiero activar y verificar mi cuenta.`;
}

function enlacePedirPlanPro() {
  const nombre = Estado.usuario?.nombre || '';
  const rubro = Estado.yo?.rubro ? (rubroDe(Estado.yo.rubro)?.nombre || '') : '';
  const zona = Estado.yo?.localidad || Estado.zona || '';
  return enlaceWhatsapp(`Hola, soy ${nombre}${rubro ? ', ' + rubro : ''}${zona ? ' en ' + zona : ''}. Quiero el plan Pro de Contratá Ya.`);
}

function normalizarWA(s) {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (!d) return '';
  if (!d.startsWith('54')) d = '54' + d;
  return d;
}

function verActivacion() {
  barra.hidden = true;
  tabs.hidden = true;
  escena.innerHTML = `
    <div class="vista">
      <div class="vacio" style="margin-top:28px">
        <h2 style="font-size:24px;margin-bottom:12px">Activá tu cuenta</h2>
        <p>Dejanos tu WhatsApp y escribinos. Te activamos y verificamos a mano: así sabemos que hay una persona atrás y te podemos contactar si hace falta.</p>
        <div class="campo" style="text-align:left;margin-top:18px">
          <span class="campo-rotulo">Tu WhatsApp</span>
          <input class="chat-campo" id="waNumero" inputmode="tel" autocomplete="tel" placeholder="Ej: 2246 55-2086" value="${escapar(Estado.yo?.whatsapp || '')}">
        </div>
        <button class="btn btn-plomo btn-bloque" id="btnActivarWA" style="margin-top:14px">Mandar WhatsApp para activar</button>
        <p id="waManual" hidden style="margin-top:10px"><a class="btn btn-fantasma btn-bloque" id="waManualLink" target="_blank" rel="noopener noreferrer">Si no se abrió WhatsApp, tocá acá</a></p>
        <div id="cajaAvisos" style="margin-top:8px">${htmlCajaAvisos()}</div>
        <button class="btn btn-fantasma btn-bloque" id="btnYaActivo" style="margin-top:8px">Ya me activaron, entrar</button>
        <p class="sub-vista" style="margin-top:16px">Cuando te activemos, tocá «Ya me activaron» o recargá la app.</p>
        <button class="btn btn-salir btn-bloque" id="salir" style="margin-top:16px">Cerrar sesión</button>
      </div>
    </div>`;
  $('#btnActivarWA').addEventListener('click', enviarActivacionWA);
  engancharAvisos();
  $('#btnYaActivo').addEventListener('click', reintentarActivacion);
  $('#salir').addEventListener('click', cerrarSesion);
}

async function enviarActivacionWA() {
  const raw = ($('#waNumero') && $('#waNumero').value) || '';
  const tel = normalizarWA(raw);
  if (tel.length < 12) { brindis('Poné tu WhatsApp con código de área, ej. 2246 55-2086'); return; }
  const url = enlaceWhatsapp(mensajeActivacionWA());
  let popup = null;
  try { popup = window.open(url, '_blank'); } catch {}
  const b = $('#btnActivarWA');
  b.disabled = true;
  b.textContent = 'Guardando…';
  const { data, error } = await sb.rpc('guardar_mi_whatsapp', { p_telefono: tel });
  if (error) {
    b.disabled = false;
    b.textContent = 'Mandar WhatsApp para activar';
    brindis(error.message || 'No se pudo guardar el número');
    return;
  }
  if (Estado.yo) Estado.yo.whatsapp = data?.whatsapp || tel;
  guardar();
  b.disabled = false;
  b.textContent = 'Mandar WhatsApp para activar';
  const manual = $('#waManual');
  const link = $('#waManualLink');
  if (link) link.href = url;
  if (manual) manual.hidden = false;
  if (!popup || popup.closed) {
    location.href = url;
  }
}

async function reintentarActivacion() {
  const b = $('#btnYaActivo');
  if (b) { b.disabled = true; b.textContent = 'Revisando…'; }
  const devolverBoton = () => {
    if (b && document.body.contains(b)) { b.disabled = false; b.textContent = 'Ya me activaron, entrar'; }
  };
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user?.id) { brindis('Se cerró la sesión'); devolverBoton(); return; }
    const { data: fresco } = await sb.from('perfiles').select('*').eq('id', session.user.id).maybeSingle();
    if (fresco) volcarPerfil(fresco);
    if (!cuentaActiva()) {
      brindis('Todavía no está activada. Escribinos por WhatsApp.');
      if (b) { b.disabled = false; b.textContent = 'Ya me activaron, entrar'; }
      return;
    }
    pintarModo();
    await cargarCarteles();
    barra.hidden = false;
    tabs.hidden = false;
    arrancarLatido();
    arrancarPresencia();
    irA(Estado.vista || 'buscar');
    programarInterstitial();
  } catch (e) {
    brindis('No se pudo comprobar. Probá de nuevo.');
    if (b) { b.disabled = false; b.textContent = 'Ya me activaron, entrar'; }
  }
}

function verPerfilPro() {
  const u = Estado.usuario;
  const yo = Estado.yo;
  const rubro = rubroDe(yo.rubro);

  escena.innerHTML = `
    <div class="vista">
      <div id="cintaIOS"></div>
      ${cabezaPerfil(`${rubro.nombre} · ${yo.localidad}`)}

      ${necesitoFoto() ? `
      <div class="aviso-foto">
        <b>No aparecés en las búsquedas</b>
        <p>Sin una foto tuya, los clientes no te ven en el mazo y no podés contactarte con nadie.</p>
        <button class="btn btn-plomo btn-bloque btn-sm" id="avisoSubirFoto">Subir mi foto ahora</button>
      </div>` : ''}

      <div class="metricas">
        <div class="metrica" id="metricaPuntaje"><b>${textoPuntaje()}</b><span>Puntaje</span></div>
        <div class="metrica"><b>${u.trabajos}</b><span>Trabajos</span></div>
        <div class="metrica"><b>✓</b><span>Cuenta</span></div>
      </div>

      ${bloquePuntaje()}

      ${htmlBtnTutorial()}

      ${bloqueAvisos()}

      ${bloqueVerificacionCuenta()}

      <p class="bloque-titulo">Tu perfil de oficio</p>
      <div class="tarjeta">
        <div class="cuenta-fila"><span>Rubro</span><b>${rubro.nombre}</b></div>
        <div class="cuenta-fila"><span>Zonas</span><b>${(yo.zonas && yo.zonas.length) ? yo.zonas.join(', ') : (yo.localidad || '—')}</b></div>
        ${yo.anios != null ? `<div class="cuenta-fila"><span>Años en el oficio</span><b>${yo.anios}</b></div>` : ''}
        ${yo.precio_desde != null ? `<div class="cuenta-fila"><span>Precio desde</span><b>$${Number(yo.precio_desde).toLocaleString('es-AR')}</b></div>` : ''}
      </div>

      ${esPlanPro(yo.plan) ? `${htmlGaleriaFicha(yo.galeria)}${htmlRedesFicha(yo)}` : ''}

      <p class="bloque-titulo">Tu plan</p>
      <div class="tarjeta">
        <div class="plan-app-cabeza">
          <h3>${planDe(yo.plan).nombre}</h3>
          <span class="marca-actual">Actual</span>
        </div>
        <p class="plan-app-resumen">${planDe(yo.plan).resumen}</p>
        ${esPlanPro(yo.plan) && yo.plan_hasta ? `<p class="plan-app-resumen">Ganado en Jugá. Vence el ${fechaCortaApp(yo.plan_hasta)}.</p>` : ''}
        ${esPlanPro(yo.plan) ? '' : `<a class="btn btn-plomo btn-bloque btn-sm" id="pedirPlanPerfil" href="${enlacePedirPlanPro()}" target="_blank" rel="noopener noreferrer">Pedir plan</a>`}
        <button class="btn btn-fantasma btn-bloque btn-sm" id="abrirPlanes" style="margin-top:8px">Ver planes</button>
      </div>

      <p class="bloque-titulo">Tu cuenta</p>
      <div class="tarjeta">
        <div class="cuenta-fila"><span>Correo</span><b>${u.correo}</b></div>
        <div class="cuenta-fila"><span>Ingresás con</span><b>${u.metodo}</b></div>
        <div class="cuenta-fila"><span>Zona de trabajo</span><b>${yo.localidad}</b></div>
      </div>

      <div id="misResenas"></div>

      <a class="btn btn-fantasma btn-bloque" href="/" style="margin-top:8px">Ver la home</a>
      <button class="btn btn-plomo btn-bloque" id="editarPerfilPro" style="margin-top:8px">${esPlanPro(yo.plan) ? 'Editar mi perfil Plan Pro' : 'Editar mi perfil'}</button>
      <button class="btn btn-fantasma btn-bloque" id="cambiarRol" style="margin-top:8px">Cambiar a modo cliente</button>
      <button class="btn btn-salir btn-bloque" id="salir" style="margin-top:8px">Cerrar sesión</button>

      <div class="pie-legal">
        <a href="${INSTAGRAM_CONTRATA}" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="${FACEBOOK_CONTRATA}" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a href="/terminos">Términos</a>
        <a href="/privacidad">Privacidad</a>
        <button id="borrarCuenta">Borrar mi cuenta</button>
      </div>
    </div>`;

  if ($('#avisoSubirFoto')) {
    $('#avisoSubirFoto').addEventListener('click', () => { const b = $('#cambiarFoto'); if (b) b.click(); });
  }

  cintaInstalacionIOS();
  refrescarPuntajes();
  pintarResenasReales('pro', 'misResenas');
  conectarCambioFoto(verPerfilPro);
  engancharWhatsappVerificacion();
  engancharAvisos();
  $('#abrirPlanes').addEventListener('click', verPlanes);
  $('#editarPerfilPro').addEventListener('click', () => verFormPerfilPro(verPerfilPro));
  $('#cambiarRol').addEventListener('click', () => {
    Estado.rol = 'cliente'; Estado.vistos = []; guardar(); pintarModo();
    irA('buscar'); brindis('Estás en modo cliente');
  });
  $('#salir').addEventListener('click', cerrarSesion);
}

function verPerfilCliente() {
  const u = Estado.usuario;
  escena.innerHTML = `
    <div class="vista">
      <div id="cintaIOS"></div>
      ${cabezaPerfil(`Cliente · ${Estado.zona || 'Sin localidad'}`)}

      <div class="metricas">
        <div class="metrica" id="metricaPuntaje"><b>${textoPuntaje()}</b><span>Tu puntaje</span></div>
        <div class="metrica"><b>${matchesReales.length}</b><span>Matches</span></div>
        <div class="metrica"><b>${u.contrataciones || 0}</b><span>Contrataciones</span></div>
      </div>

      ${bloquePuntaje()}

      ${htmlBtnTutorial()}

      ${bloqueAvisos()}

      ${bloqueVerificacionCuenta()}

      <div class="tarjeta" style="margin-top:16px">
        <p class="eyebrow" style="margin-bottom:8px">Por qué te califican a vos</p>
        <ul class="lista-criterios">
          ${CRITERIOS.alCliente.map(c => `<li>${c}</li>`).join('')}
        </ul>
        <p style="font-size:13.5px;color:var(--cal-3);margin-top:12px">
          Un buen puntaje hace que los profesionales te acepten más rápido, sobre todo en temporada.
        </p>
      </div>

      <p class="bloque-titulo">Tu cuenta</p>
      <div class="tarjeta">
        <div class="cuenta-fila"><span>Correo</span><b>${u.correo}</b></div>
        <div class="cuenta-fila"><span>Ingresás con</span><b>${u.metodo}</b></div>
        <div class="cuenta-fila"><span>Localidad</span><b>${Estado.zona || 'Sin elegir'}</b></div>
      </div>

      <div id="misResenas"></div>

      <a class="btn btn-fantasma btn-bloque" href="/" style="margin-top:8px">Ver la home</a>
      <button class="btn btn-plomo btn-bloque" id="editarPerfilCli" style="margin-top:8px">Editar mi perfil</button>
      <button class="btn btn-fantasma btn-bloque" id="cambiarRol" style="margin-top:8px">Cambiar a modo profesional</button>
      <button class="btn btn-salir btn-bloque" id="salir" style="margin-top:8px">Cerrar sesión</button>

      <div class="pie-legal">
        <a href="${INSTAGRAM_CONTRATA}" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="${FACEBOOK_CONTRATA}" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a href="/terminos">Términos</a>
        <a href="/privacidad">Privacidad</a>
        <button id="borrarCuenta">Borrar mi cuenta</button>
      </div>
    </div>`;

  cintaInstalacionIOS();
  refrescarPuntajes();
  pintarResenasReales('cliente', 'misResenas');
  conectarCambioFoto(verPerfilCliente);
  engancharWhatsappVerificacion();
  engancharAvisos();
  $('#editarPerfilCli').addEventListener('click', () => verFormPerfilCliente(verPerfilCliente));
  $('#cambiarRol').addEventListener('click', () => {
    Estado.rol = 'pro'; Estado.vistos = []; guardar(); pintarModo();
    irA('buscar'); brindis('Estás en modo profesional');
  });
  $('#salir').addEventListener('click', cerrarSesion);
}


/* ── Borrar la cuenta ────────────────────────────────────────
   Se le muestra ANTES de confirmar qué se lleva y qué queda. Las
   calificaciones que dejó son la reputación de otra persona: no
   se borran porque él se vaya, pero pierden su nombre.
   ─────────────────────────────────────────────────────────── */

// Delegado en toda la pantalla y no enganchado en cada vista: el pie legal
// aparece en el perfil del profesional Y en el del cliente, y engancharlo
// vista por vista es justo lo que ya falló una vez.
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('#borrarCuenta');
  if (b) { e.preventDefault(); verBorrarCuenta(); }
  const tut = e.target.closest && e.target.closest('#btnTutorial');
  if (tut) { e.preventDefault(); verTutorial(); }
  const ir = e.target.closest && e.target.closest('[data-ir]');
  if (ir && typeof irA === 'function') {
    e.preventDefault();
    irA(ir.dataset.ir);
  }
});

async function verBorrarCuenta() {
  abrirHoja('<h2>Borrar la cuenta</h2><p class="sub-vista">Cargando…</p>');

  const { data, error } = await sb.rpc('resumen_borrado');
  if (error) { cerrarHoja(); brindis('No se pudo consultar'); return; }

  const d = typeof data === 'string' ? JSON.parse(data) : data;
  const trabado = d.trabajos_abiertos > 0 || d.falta_calificar;

  abrirHoja(`
    <h2>Borrar la cuenta</h2>

    ${trabado ? `
      <p>Antes de borrarla hay algo pendiente:</p>
      <div class="tarjeta" style="margin-top:14px;border-color:var(--coral)">
        ${d.trabajos_abiertos > 0
          ? `<p><b>${d.trabajos_abiertos} trabajo${d.trabajos_abiertos === 1 ? '' : 's'} sin cerrar.</b> No podés desaparecer dejando a alguien esperando.</p>` : ''}
        ${d.falta_calificar
          ? `<p style="margin-top:8px"><b>Te falta calificar un trabajo terminado.</b> La otra persona está esperando esa calificación.</p>` : ''}
      </div>
      <button class="btn btn-plomo btn-bloque" id="irAMatches" style="margin-top:20px">Ir a resolverlo</button>
      <button class="btn btn-fantasma btn-bloque" id="cerrarBorrar" style="margin-top:8px">Volver</button>
    ` : `
      <p>Es definitivo. Antes de seguir, mirá bien qué pasa con cada cosa.</p>

      <p class="bloque-titulo" style="margin-top:20px">Se borra</p>
      <div class="tarjeta">
        <p>Tu nombre, tu foto, tu teléfono, tu descripción y tus zonas.</p>
        <p style="margin-top:8px">Tus avisos, tus búsquedas guardadas y tu código de beneficios.</p>
      </div>

      <p class="bloque-titulo" style="margin-top:16px">Queda, sin tu nombre</p>
      <div class="tarjeta">
        ${d.calificaciones_dejadas > 0
          ? `<p><b>Las ${d.calificaciones_dejadas} calificaciones que dejaste.</b> Son la reputación de esas personas: no se borran porque vos te vayas, pero pasan a figurar como "Usuario eliminado".</p>`
          : '<p>No dejaste calificaciones.</p>'}
        <p style="margin-top:8px">Los chats de trabajos terminados, que quedaron como constancia de lo acordado.</p>
      </div>

      <label class="campo" style="margin-top:20px">
        <span>Escribí BORRAR para confirmar</span>
        <input class="campo-txt" id="confirmarBorrado" placeholder="BORRAR" autocapitalize="characters">
      </label>

      <button class="btn btn-salir btn-bloque" id="siBorrar" style="margin-top:14px">Borrar mi cuenta</button>
      <button class="btn btn-fantasma btn-bloque" id="cerrarBorrar" style="margin-top:8px">Cancelar</button>
    `}`);

  $('#cerrarBorrar').addEventListener('click', cerrarHoja);

  if ($('#irAMatches')) {
    $('#irAMatches').addEventListener('click', () => { cerrarHoja(); irA('matches'); });
  }

  if ($('#siBorrar')) {
    $('#siBorrar').addEventListener('click', async () => {
      const b = $('#siBorrar');
      b.disabled = true;
      b.textContent = 'Borrando…';

      const { error: e } = await sb.rpc('borrar_mi_cuenta', {
        p_confirmacion: $('#confirmarBorrado').value
      });

      if (e) {
        b.disabled = false;
        b.textContent = 'Borrar mi cuenta';
        brindis(e.message || 'No se pudo borrar');
        return;
      }

      await sb.auth.signOut();
      try { sessionStorage.removeItem('contrataya'); } catch {}
      location.href = '/';
    });
  }
}

function cerrarSesion() {
  abrirHoja(`
    <h2>¿Cerrar sesión?</h2>
    <p>Vas a volver a la pantalla de registro. Tus datos, matches y calificaciones quedan guardados: los vas a ver de nuevo cuando entres.</p>
    <button class="btn btn-salir btn-bloque" id="confirmarSalir" style="margin-top:20px">Sí, cerrar sesión</button>
    <button class="btn btn-fantasma btn-bloque" id="cancelarSalir" style="margin-top:8px">Cancelar</button>`);
  $('#cancelarSalir').addEventListener('click', cerrarHoja);
  $('#confirmarSalir').addEventListener('click', async () => {
    const boton = $('#confirmarSalir');
    boton.disabled = true;
    boton.textContent = 'Cerrando…';

    // Lo primero y lo importante: matar la sesión en Supabase.
    // Sin esto el token queda vivo en localStorage y al refrescar
    // arrancar() lo vuelve a levantar con getSession(). En un celular
    // compartido, el siguiente que lo agarra entra a esta cuenta.
    try {
      await sb.auth.signOut();
    } catch (e) {
      console.warn('[salir] signOut falló:', e);
      boton.disabled = false;
      boton.textContent = 'Sí, cerrar sesión';
      brindis('No se pudo cerrar la sesión. Probá de nuevo.');
      return;
    }

    try { sessionStorage.removeItem('contrataya'); } catch {}

    // Caches en memoria: si no se limpian, quedan datos de la cuenta anterior.
    matchesReales = [];
    pedidosPro = [];
    profesionalesReales = [];
    miCodigoBeneficio = null;

    Object.assign(Estado, {
      usuario: null, rol: null, zona: null,
      pedido: { rubro: null, urgencia: null, detalle: '' },
      vistos: [], matches: [], vista: 'buscar',
      yo: { rubro: 'albanileria', localidad: 'San Bernardo', plan: 'gratis', verificacion: ['telefono', 'email'] }
    });

    barra.hidden = true;
    tabs.hidden = true;
    cerrarHoja();
    verRegistro();
  });
}

function simularVerificacion(idCapa) {
  const capa = CAPAS_VERIFICACION.find(c => c.id === idCapa);
  const textos = {
    telefono: 'Enviando el código por SMS…',
    email: 'Enviando el enlace de confirmación…',
    cuit: 'Consultando el padrón de AFIP…',
    identidad: 'Leyendo el DNI y comparando con la selfie…',
    zona: 'Confirmando tu ubicación en la costa…'
  };

  abrirHoja(`
    <div class="verif-paso">
      <div class="verif-anillo" id="anillo"></div>
      <h2 style="font-size:21px">${capa.nombre}</h2>
      <p id="verifTexto" style="color:var(--cal-2)">${textos[idCapa]}</p>
    </div>`);

  setTimeout(() => {
    const anillo = $('#anillo');
    if (!anillo) return;
    anillo.className = 'verif-ok';
    anillo.textContent = '✓';
    $('#verifTexto').textContent = 'Listo. Quedó confirmado en tu perfil.';
    Estado.yo.verificacion.push(idCapa);
    guardar();
    setTimeout(() => { cerrarHoja(); brindis(capa.nombre + ' verificado'); verPerfilPro(); }, 1100);
  }, 1900);
}

function verPlanes() {
  const actual = planId(Estado.yo.plan);
  const tarjetas = PLANES.map(p => `
    <article class="plan-app ${p.id === actual ? 'actual' : ''} ${p.destacado && p.id !== actual ? 'destacado' : ''}">
      <div class="plan-app-cabeza">
        <h3>${p.nombre}</h3>
        ${p.id === actual ? '<span class="marca-actual">Actual</span>' : `<span class="plan-app-precio">${p.precioTexto}</span>`}
      </div>
      <p class="plan-app-resumen">${p.resumen}</p>
      <ul>${p.incluye.map(x => `<li>${x}</li>`).join('')}${p.excluye.map(x => `<li class="no">${x}</li>`).join('')}</ul>
      ${p.id === 'pro' && actual !== 'pro' ? `<a class="btn btn-plomo btn-bloque btn-sm" href="${enlacePedirPlanPro()}" target="_blank" rel="noopener noreferrer">Pedir plan</a>` : ''}
    </article>`).join('');

  abrirHoja(`
    <h2>Planes</h2>
    <p>El Gratis Verificado es el de todos. El Pro te pone primero en el mazo, te deja más localidades y te avisa al toque cuando entra un pedido.</p>
    <div style="margin-top:18px">${tarjetas}</div>`);
}

/* ── Cinta de instalación ───────────────────────────────── */
function cintaInstalacionIOS() {
  const cont = $('#cintaIOS');
  if (!cont || Instalar.yaInstalada || sessionStorage.getItem('cintaIOSCerrada')) return;

  if (Instalar.esNavegadorEmbebido) {
    cont.innerHTML = `<div class="cinta-ios"><p>Estás dentro de otra app. Abrí Contratá Ya en ${Instalar.esIOS ? 'Safari' : 'Chrome'} para instalarla y recibir avisos.</p><button class="cinta-cerrar" aria-label="Cerrar">✕</button></div>`;
  } else if (Instalar.esIOS) {
    cont.innerHTML = `
      <div class="cinta-ios">
        <p>Para recibir avisos: tocá
          <svg class="icono-compartir-mini" viewBox="0 0 24 24" role="img" aria-label="compartir">
            <path d="M12 3v12M12 3l-3.5 3.5M12 3l3.5 3.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 11H4.5v9.5h15V11H18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          y elegí <b>Agregar a inicio</b>.
        </p>
        <button class="cinta-cerrar" aria-label="Cerrar">✕</button>
      </div>`;
  } else if (Instalar.disponible) {
    cont.innerHTML = `<div class="cinta-ios"><p>Instalala para recibir avisos de trabajos cerca tuyo.</p><button class="btn btn-plomo btn-sm" id="instalarApp">Instalar</button><button class="cinta-cerrar" aria-label="Cerrar">✕</button></div>`;
    const bi = $('#instalarApp');
    if (bi) bi.addEventListener('click', async () => {
      if (await Instalar.lanzarInstalacion()) { cont.innerHTML = ''; brindis('Contratá Ya instalada'); }
    });
  }

  const cerrar = cont.querySelector('.cinta-cerrar');
  if (cerrar) cerrar.addEventListener('click', () => {
    sessionStorage.setItem('cintaIOSCerrada', '1');
    cont.innerHTML = '';
  });
}

/* ── Navegación ─────────────────────────────────────────── */
const TITULOS = { buscar: 'Buscar', matches: 'Matches', jugar: 'Jugá', beneficios: 'Beneficios', perfil: 'Perfil' };

async function sincronizarPlanJuego() {
  if (!Estado.usuario) return;
  try {
    const { data, error } = await sb.rpc('vencer_planes_juego');
    if (error || !data) return;
    if (data.plan) Estado.yo.plan = planId(data.plan);
    Estado.yo.plan_hasta = data.plan_hasta || null;
    Estado.yo.pro_juego_en = data.pro_juego_en || null;
    if (!esPlanPro(Estado.yo.plan)) Estado.yo.plan_hasta = null;
    guardar();
  } catch (e) { console.warn('[plan-juego]', e); }
}

async function proPorJugar(score) {
  if (!Estado.usuario) return { ok: false, motivo: 'sin_sesion' };
  if (Estado.yo?.pro_juego_en) return { ok: false, motivo: 'ya_usado' };
  if (esPlanPro(Estado.yo?.plan) && !Estado.yo?.plan_hasta) return { ok: false, motivo: 'ya_pro' };
  try {
    const { data, error } = await sb.rpc('pro_por_jugar', { p_score: Math.floor(Number(score) || 0) });
    if (error) {
      console.warn('[pro-jugar]', error);
      return { ok: false, motivo: 'error' };
    }
    const r = data || {};
    if (r.ok) {
      Estado.yo.plan = 'pro';
      Estado.yo.plan_hasta = r.plan_hasta || null;
      Estado.yo.pro_juego_en = new Date().toISOString();
      guardar();
      brindis('Llegaste a 10.000. Plan Pro activado por un mes.');
      return r;
    }
    if (r.motivo === 'no_pro') {
      brindis('El mes de Pro es para profesionales. Completá tu oficio en Perfil.');
    }
    return r;
  } catch (e) {
    console.warn('[pro-jugar]', e);
    return { ok: false, motivo: 'error' };
  }
}
window.proPorJugar = proPorJugar;

function fechaCortaApp(d) {
  try {
    return new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function htmlPremioJugar() {
  const yo = Estado.yo || {};
  if (esPlanPro(yo.plan) && yo.plan_hasta) {
    return `<div class="jugar-premio">
      <b>Ya ganaste el plan Pro en el juego</b>
      <span>Vence el ${fechaCortaApp(yo.plan_hasta)}. Tocá el recuadro para saltar.</span>
    </div>`;
  }
  if (esPlanPro(yo.plan)) {
    return `<div class="jugar-premio">
      <b>10.000 puntos en una partida = Pro 1 mes</b>
      <span>En tu cuenta el Pro ya está activo. El premio es para quienes están en Gratis Verificado.</span>
    </div>`;
  }
  if (yo.pro_juego_en) {
    return `<div class="jugar-premio">
      <b>Ya usaste el premio del juego</b>
      <span>El mes de Pro se gana una sola vez. Tocá el recuadro para saltar.</span>
    </div>`;
  }
  return `<div class="jugar-premio">
    <b>10.000 puntos en una partida = plan Pro 1 mes</b>
    <span>Sin cargo, una sola vez, si sos profesional. Tiene que ser en esa corrida: no se acumula.</span>
  </div>`;
}

function verJugar() {
  escena.innerHTML = `
    <div class="vista vista-jugar">
      ${htmlPremioJugar()}
      <div class="jugar-caja"><canvas id="jugarCanvas"></canvas></div>
    </div>`;
  requestAnimationFrame(() => {
    const lienzo = document.getElementById('jugarCanvas');
    if (lienzo && window.JuegoCorrer) JuegoCorrer.montar(lienzo);
  });
}

function irA(vista) {
  if (window.JuegoCorrer) JuegoCorrer.parar();
  Estado.vista = vista;
  window.Avisos?.limpiar();
  guardar();
  $('#barraTitulo').textContent = TITULOS[vista] || 'Contratá Ya';
  tabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('activa', t.dataset.vista === vista));
  window.scrollTo({ top: 0 });
  if (vista === 'buscar') verBuscar();
  else if (vista === 'matches') verMatches();
  else if (vista === 'jugar') verJugar();
  else if (vista === 'beneficios') verBeneficios();
  else if (vista === 'perfil') verPerfil();
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
}

tabs.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => irA(t.dataset.vista)));
$('#btnZona').addEventListener('click', () => elegirZona());

// ¿Este match espera algo de MÍ? Devuelve el motivo o null.
// Es lo que convierte a "Matches" en una bandeja de entrada real:
// no alcanza con los mensajes, cada paso del trabajo también avisa.
function accionPendiente(m) {
  const t = m.trabajo;
  if (!t) return null;
  const soyCli = soyClienteEnMatch(m);

  if (t.estado === 'propuesto') {
    const miInicio = soyCli ? t.inicio_cliente : t.inicio_pro;
    if (!miInicio) return soyCli ? 'Confirmá el inicio' : 'Te pidieron un trabajo';
  }

  if (t.estado === 'en_curso') {
    const miFin = soyCli ? t.fin_cliente : t.fin_pro;
    const suFin = soyCli ? t.fin_pro     : t.fin_cliente;
    if (suFin && !miFin) return 'Confirmá el fin';
  }

  if (t.estado === 'terminado' && !m.califique) return 'Falta calificar';

  return null;
}

function actualizarGlobo() {
  const g = $('#globoMatches');
  if (!g) return;

  // Dos cosas distintas, dos indicadores distintos:
  // ámbar con número = mensajes sin leer
  // verde con signo   = algo espera una acción tuya
  const mensajes = matchesReales.reduce((acc, m) => acc + (m.noLeidos || 0), 0);
  const acciones = matchesReales.filter(m => accionPendiente(m)).length;

  g.textContent = String(mensajes);
  g.hidden = mensajes === 0;

  let punto = document.getElementById('puntoAccion');
  if (!punto && g.parentNode) {
    punto = document.createElement('span');
    punto.id = 'puntoAccion';
    punto.className = 'punto-accion';
    punto.setAttribute('aria-label', 'Tenés algo pendiente');
    g.parentNode.appendChild(punto);
  }
  if (punto) {
    punto.textContent = '!';
    punto.hidden = acciones === 0;
  }
}

/* ── Refresco en segundo plano ───────────────────────────────
   Sin esto, el profesional no se entera de que le pidieron un
   trabajo hasta que entra a Matches por su cuenta. Con la app
   abierta el globo aparece solo; con la app cerrada hace falta
   push del navegador, que es otro asunto.
   ─────────────────────────────────────────────────────────── */
let latidoMatches = null;

function arrancarLatido() {
  if (latidoMatches) return;
  latidoMatches = setInterval(async () => {
    if (!Estado.usuario || document.hidden) return;
    if (document.getElementById('chatReal')) return;   // el chat ya tiene su propio refresco
    // Antes esto repintaba la bandeja cada 25 segundos SIEMPRE: la pantalla
    // se ponía en blanco, aparecían las siluetas grises y la lista volvía a
    // entrar deslizándose, aunque no hubiera cambiado nada. Y el guardia que
    // debía evitarlo con una hoja abierta preguntaba por una clase que no
    // existe en el proyecto. Ahora sólo se repinta si de verdad cambió algo.
    const antes = firmaMatches();
    await cargarMatches();
    actualizarGlobo();
    const hoja = document.getElementById('hoja');
    const hojaAbierta = !!hoja && hoja.hidden === false;
    if (Estado.vista === 'matches' && !hojaAbierta && firmaMatches() !== antes) {
      // Un refresco no es una pantalla nueva: no tiene que entrar deslizándose.
      document.documentElement.dataset.nav = 'ninguna';
      verMatches();
    }
  }, 25000);

  // Al volver a la app después de tenerla en segundo plano.
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !Estado.usuario) return;
    latirPresencia();
    await cargarMatches();
    actualizarGlobo();
    programarInterstitial();
  });
}

/* ── Presencia: “tengo la app abierta” ──────────────────────
   Un latido cada 25 s mientras la pantalla está visible.
   El panel lo lee para marcar quién está en la app ahora.
   ─────────────────────────────────────────────────────── */
let latidoPresencia = null;

async function latirPresencia() {
  if (!Estado.usuario) return;
  try { await sb.rpc('latir_presencia'); } catch (e) { console.warn('[presencia]', e); }
}

async function marcarAppInstalada() {
  if (!Estado.usuario) return;
  if (typeof Instalar === 'undefined' || !Instalar.yaInstalada) return;
  try { await sb.rpc('marcar_app_instalada'); } catch (e) { console.warn('[instalada]', e); }
}

function arrancarPresencia() {
  if (latidoPresencia) return;
  latirPresencia();
  marcarAppInstalada();
  latidoPresencia = setInterval(() => {
    if (!Estado.usuario || document.hidden) return;
    latirPresencia();
    marcarAppInstalada();
  }, 25000);
}

document.addEventListener('instalacion:hecha', () => { marcarAppInstalada(); });

/* ── Arranque ───────────────────────────────────────────── */
// Pasa el perfil de la base al estado de la app. Está separado porque se
// usa en dos momentos: al entrar por primera vez y al recargar con sesión.
function volcarPerfil(perfil) {
  // El rol de la base es lo que la persona ES. El modo en el que está
  // parada ahora lo elige ella con el botón de cambiar de modo, y no
  // tiene que pisarse en cada recarga: sólo se usa si todavía no eligió.
  if (perfil.rol && !Estado.rol) Estado.rol = perfil.rol;
  // Ojo con el rubro: más abajo hay un valor por omisión para que la app
  // no se rompa, pero si el perfil vino SIN oficio y SIN zonas es que la
  // persona nunca completó su ficha. Eso hay que saberlo: un profesional
  // así no lo ve ningún cliente, y él no se entera.
  Estado.perfilProACompletar = (perfil.rol === 'pro' || Estado.rol === 'pro')
    && (!perfil.rubro || !(perfil.zonas && perfil.zonas.length));
  Estado.yo = Object.assign({}, Estado.yo, {
    rubro: perfil.rubro || Estado.yo.rubro,
    localidad: perfil.localidad || Estado.yo.localidad,
    zonas: perfil.zonas || [],
    anios: perfil.anios ?? null,
    precio_desde: perfil.precio_desde ?? null,
    bio: perfil.bio || '',
    especialidades: perfil.especialidades || [],
    ausente: perfil.ausente || false,
    plan: (planId(perfil.plan) === 'pro' && perfil.plan_hasta && new Date(perfil.plan_hasta) <= new Date())
      ? 'gratis'
      : planId(perfil.plan),
    plan_hasta: (perfil.plan_hasta && new Date(perfil.plan_hasta) > new Date()) ? perfil.plan_hasta : null,
    pro_juego_en: perfil.pro_juego_en || null,
    verificacion: (perfil.verificacion && perfil.verificacion.length)
      ? perfil.verificacion : ['telefono', 'email'],
    suspendido: perfil.suspendido || false,
    suspendidoMotivo: perfil.suspendido_motivo || '',
    uso_activado: perfil.uso_activado !== false,
    galeria: Array.isArray(perfil.galeria) ? perfil.galeria : [],
    instagram: perfil.instagram || '',
    facebook: perfil.facebook || '',
    whatsapp: Estado.yo.whatsapp || ''
  });
  if (perfil.localidad && !Estado.zona) Estado.zona = perfil.localidad;
}

// Marca el modo en el documento. El CSS invierte la paleta según esto:
// el cliente ve el fondo claro y el profesional el oscuro, así nadie se
// confunde de lado cuando maneja las dos cuentas en un mismo teléfono.
function pintarModo() {
  document.documentElement.dataset.modo = Estado.rol || 'pro';
}

async function arrancar() {
  recuperar();

  // La sesión la deja /entrar (correo y contraseña) en el almacenamiento del navegador.
  const { data: { session } } = await sb.auth.getSession();

  // La verdad la tiene Supabase, no el navegador. Si el estado guardado dice
  // que hay usuario pero la sesión ya no existe —porque venció, porque se
  // rotaron las claves, porque cerró sesión en otro lado— la app mostraría
  // un recuerdo: parece que estás adentro y ninguna consulta funciona.
  if (!session && Estado.usuario) {
    console.warn('[sesión] había estado guardado sin sesión válida: se limpia');
    try { sessionStorage.removeItem('contrataya'); } catch {}
    Object.assign(Estado, {
      usuario: null, rol: null, zona: null,
      pedido: { rubro: null, urgencia: null, detalle: '' },
      vistos: [], matches: [], vista: 'buscar'
    });
    matchesReales = [];
    pedidosPro = [];
    profesionalesReales = [];
    miCodigoBeneficio = null;
  }

  if (session && session.user && !Estado.usuario) {
    const u = session.user;

    // Traemos el perfil ya guardado en Supabase (la fila se crea sola al registrarse).
    let perfil = null;
    const { data: fila } = await sb.from('perfiles').select('*').eq('id', u.id).maybeSingle();
    perfil = fila;

    const nombre = perfil?.nombre || u.user_metadata?.full_name || u.user_metadata?.name ||
                   u.user_metadata?.nombre ||
                   (u.email ? u.email.split('@')[0] : 'Usuario');
    const metodo = 'Correo';
    Estado.usuario = {
      id: u.id,
      nombre,
      correo: u.email,
      metodo,
      foto: perfil?.foto_url || FOTOS_PERFIL[0],
      fotoPropia: !!(perfil && perfil.foto_url),
      // Guardamos los dos puntajes: cuál se muestra lo decide el rol activo.
      puntajePro: (perfil && perfil.puntaje_pro != null) ? Number(perfil.puntaje_pro) : null,
      puntajeCliente: (perfil && perfil.puntaje_cliente != null) ? Number(perfil.puntaje_cliente) : null,
      trabajos: perfil?.trabajos || 0,
      contrataciones: perfil?.contrataciones || 0,
      desde: perfil?.desde_anio || new Date().getFullYear()
    };

    if (perfil) volcarPerfil(perfil);
  }

  // Con el estado ya levantado del navegador, hay que volver a leer el
  // perfil igual: el plan, las verificaciones y las zonas los puede haber
  // cambiado el administrador desde el panel, o uno mismo en otro
  // dispositivo. Si no, la app muestra lo que quedó guardado la última vez.
  if (session && session.user && Estado.usuario) {
    const { data: fresco } = await sb.from('perfiles')
      .select('*').eq('id', session.user.id).maybeSingle();
    if (fresco) {
      volcarPerfil(fresco);
      if (fresco.nombre) Estado.usuario.nombre = fresco.nombre;
      Estado.usuario.foto = fresco.foto_url || Estado.usuario.foto;
      Estado.usuario.fotoPropia = !!fresco.foto_url;
      Estado.usuario.puntajePro = fresco.puntaje_pro != null ? Number(fresco.puntaje_pro) : null;
      Estado.usuario.puntajeCliente = fresco.puntaje_cliente != null ? Number(fresco.puntaje_cliente) : null;
      Estado.usuario.trabajos = fresco.trabajos || 0;
      Estado.usuario.contrataciones = fresco.contrataciones || 0;
      try {
        const { data: c } = await sb.from('contacto').select('telefono').eq('id', session.user.id).maybeSingle();
        if (c && Estado.yo) Estado.yo.whatsapp = c.telefono || '';
      } catch {}
      await sincronizarPlanJuego();
      guardar();
    }
  }

  guardar();
  history.replaceState(null, '', location.pathname + location.search);

  const params = new URLSearchParams(location.search);
  if (params.get('rol') === 'pro' && Estado.usuario) Estado.rol = 'pro';

  if (Estado.zona) $('#zonaActual').textContent = Estado.zona;
  if (Estado.usuario) await cargarMatches();
  actualizarGlobo();

  if (!Estado.usuario) return verRegistro();
  if (!Estado.rol) return verBienvenida();

  latirPresencia();
  marcarAppInstalada();

  if (Estado.yo && Estado.yo.suspendido) {
    barra.hidden = true;
    tabs.hidden = true;
    const nombre = Estado.usuario?.nombre || 'usuario';
    const waSoporte = enlaceWhatsapp(
      `Hola, soy ${nombre}. Mi cuenta está suspendida y quiero hablar con soporte técnico.`
    );
    escena.innerHTML = `
      <div class="vista">
        <div class="vacio" style="margin-top:40px">
          <h2 style="font-size:22px;margin-bottom:12px">Tu cuenta está suspendida</h2>
          <p>Recibimos un reporte sobre tu cuenta y la pusimos en pausa mientras lo revisamos.</p>
          <p style="margin-top:10px">${escapar(Estado.yo.suspendidoMotivo || '')}</p>
          <p style="margin-top:14px;font-size:13.5px;color:var(--cal-3)">Si creés que es un error, escribinos por WhatsApp y lo miramos de nuevo.</p>
          <a class="btn btn-plomo btn-bloque" href="${escapar(waSoporte)}" target="_blank" rel="noopener noreferrer" style="margin-top:20px">Contactar soporte técnico</a>
        </div>
      </div>`;
    return;
  }

  if (!cuentaActiva()) {
    verActivacion();
    return;
  }

  pintarModo();
  await cargarCarteles();

  // El alta por correo ya crea el perfil con el rol, así que este profesional
  // nunca pasa por la pantalla de bienvenida. Si quedó sin oficio ni zonas,
  // no lo ve ningún cliente y él desliza y espera sin saber por qué no pasa
  // nada. Lo primero que ve, entonces, es su propia ficha para completarla.
  if (Estado.rol === 'pro' && !perfilProCompleto()) {
    barra.hidden = false;
    tabs.hidden = true;
    arrancarLatido();
    arrancarPresencia();
    verFormPerfilPro(() => { tabs.hidden = false; irA('buscar'); });
    const sub = escena.querySelector('.sub-vista');
    if (sub) sub.insertAdjacentHTML('afterend',
      '<p class="aviso-completar">Falta lo principal: tu oficio y en qué pueblos trabajás. ' +
      'Sin eso no aparecés en las búsquedas de los vecinos y no te va a llegar ningún pedido.</p>');
    return;
  }

  barra.hidden = false;
  tabs.hidden = false;
  arrancarLatido();
  arrancarPresencia();
  irA(Estado.vista || 'buscar');
  programarInterstitial();
  setTimeout(() => quizasPedirAvisos().catch(() => {}), 2400);
}
arrancar();
