/* ============================================================
   CONTRATÁ YA — Aplicación
   Demostración funcional. El estado vive en el navegador.
   ============================================================ */

const TONOS = ['#F0A63A', '#2FB2A6', '#7E9BD4', '#C39BD3', '#E4574C', '#8FBF6A', '#E8955F'];
const tonoDe = (n) => TONOS[n % TONOS.length];
const iniciales = (n) => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const rubroDe = (id) => RUBROS.find(r => r.id === id);
const urgenciaDe = (id) => URGENCIAS.find(u => u.id === id);
const plata = (n) => '$' + n.toLocaleString('es-AR');
const estrellas = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const buscarPersona = (id, tipo) =>
  tipo === 'cliente' ? CLIENTES.find(c => c.id === id) : PROFESIONALES.find(p => p.id === id);

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
  escena.innerHTML = `
    <div class="bienvenida">
      <div class="bienvenida-marca">
        <img src="/img/isotipo.svg" alt="" width="30" height="30">
        <span>CONTRATÁ <b>YA</b></span>
      </div>
      <h1>Oficios de la<br>costa, <em>ya.</em></h1>
      <p>Para entrar necesitás una cuenta. Es lo que permite que las calificaciones sean de personas reales y no de perfiles inventados.</p>

      <div class="roles" style="margin-top:24px">
        <button class="btn btn-google btn-bloque" id="conGoogle">
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
            <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12.1c-.2 1.9-1.6 4.7-4.5 6.6l-.1.3 6.5 5 .5.1c4.1-3.8 6.6-9.4 6.6-15.2z"/>
            <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3.1-6.7 5.2-.1.3C8 41.1 15.4 46 24 46z"/>
            <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-.3l-6.8-5.3-.2.1C2.9 17.2 2 20.5 2 24s.9 6.8 2.5 9.9l7-5.5z"/>
            <path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.3 29.9 2 24 2 15.4 2 8 6.9 4.5 14.1l7 5.5c1.8-5.3 6.7-9.1 12.5-9.1z"/>
          </svg>
          Continuar con Google
        </button>
        <button class="btn btn-fantasma btn-bloque" id="conCorreo">Continuar con correo</button>
      </div>

      <p class="registro-nota">Al continuar aceptás que tu nombre y tu calificación sean visibles para la otra parte. No publicamos tu teléfono ni tu dirección.</p>
    </div>`;

  $('#conGoogle').addEventListener('click', registroGoogle);
  $('#conCorreo').addEventListener('click', registroCorreo);
}

async function registroGoogle() {
  abrirHoja(`
    <div class="verif-paso">
      <div class="verif-anillo"></div>
      <h2 style="font-size:20px">Conectando con Google</h2>
      <p style="color:var(--cal-2)">Te estamos llevando a Google…</p>
    </div>`);
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname }
  });
  if (error) {
    cerrarHoja();
    brindis('No se pudo conectar con Google: ' + error.message);
  }
}

function registroCorreo() {
  abrirHoja(`
    <h2>Crear tu cuenta</h2>
    <p>Te mandamos un mail con un enlace para entrar. Tenés que abrirlo desde este mismo teléfono o computadora.</p>
    <div style="margin-top:20px">
      <span class="campo-rotulo">Nombre y apellido</span>
      <input class="chat-campo" id="regNombre" style="width:100%;border-radius:12px;margin-bottom:16px" placeholder="Como querés que te vean" autocomplete="name">
      <span class="campo-rotulo">Correo</span>
      <input class="chat-campo" id="regCorreo" style="width:100%;border-radius:12px" placeholder="tunombre@correo.com" type="email" autocomplete="email">
    </div>
    <button class="btn btn-plomo btn-bloque" id="regEnviar" style="margin-top:20px" disabled>Enviarme el enlace</button>`);

  const revisar = () => {
    const n = $('#regNombre').value.trim();
    const c = $('#regCorreo').value.trim();
    $('#regEnviar').disabled = !(n.length > 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c));
  };
  $('#regNombre').addEventListener('input', revisar);
  $('#regCorreo').addEventListener('input', revisar);

  $('#regEnviar').addEventListener('click', async () => {
    const nombre = $('#regNombre').value.trim();
    const correo = $('#regCorreo').value.trim();
    const boton = $('#regEnviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    const { error } = await sb.auth.signInWithOtp({
      email: correo,
      options: {
        data: { nombre },
        emailRedirectTo: location.origin + location.pathname
      }
    });
    if (error) {
      boton.disabled = false;
      boton.textContent = 'Enviarme el enlace';
      brindis('No se pudo enviar el mail: ' + error.message);
      return;
    }
    avisarCorreo(correo);
  });
}

function avisarCorreo(correo) {
  abrirHoja(`
    <h2>Revisá tu correo</h2>
    <p>Te mandamos un mail a <b style="color:var(--cal)">${correo}</b> con un enlace para entrar.</p>
    <p>Abrí ese mail <b>desde este mismo dispositivo</b> y tocá el enlace. Te trae de vuelta acá, ya adentro.</p>
    <p style="color:var(--cal-2);font-size:14px">Si no lo ves, mirá en la carpeta de correo no deseado. Puede tardar un minuto en llegar.</p>
    <button class="btn btn-fantasma btn-bloque btn-sm" id="regVolver" style="margin-top:14px">Cambiar el correo</button>`);
  $('#regVolver').addEventListener('click', registroCorreo);
}

function crearCuenta({ nombre, correo, metodo }) {
  Estado.usuario = {
    nombre, correo, metodo,
    foto: FOTOS_PERFIL[0],
    puntajePro: null,       // sin calificaciones todavía
    puntajeCliente: null,
    trabajos: 0,
    contrataciones: 0,
    desde: new Date().getFullYear()
  };
  guardar();
  cerrarHoja();
  brindis('Cuenta creada con ' + metodo);
  verBienvenida();
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
      barra.hidden = false;
      tabs.hidden = false;
      irA('buscar');
    });
  });
}

// ¿El profesional ya cargó su perfil real? (rubro + al menos una zona)
const perfilProCompleto = () =>
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
  URGENCIAS.forEach(u => {
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
    $('#empezar').disabled = !(Estado.zona && Estado.pedido.rubro && Estado.pedido.urgencia);
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
  let rubroSel = yo.rubro || null;
  const zonasSel = new Set((yo.zonas && yo.zonas.length) ? yo.zonas : (yo.localidad ? [yo.localidad] : []));

  escena.innerHTML = `
    <div class="vista">
      <h1 class="titulo-vista">Tu perfil profesional</h1>
      <p class="sub-vista">Estos son los datos que ven los clientes cuando aparecés. Podés editarlos cuando quieras.</p>

      <div class="campo">
        <span class="campo-rotulo">Tu rubro</span>
        <div class="fichas" id="ppRubro"></div>
      </div>

      <div class="campo">
        <span class="campo-rotulo">Dónde trabajás <span style="text-transform:none;letter-spacing:0">(hasta 3 localidades)</span></span>
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

      <button class="btn btn-plomo btn-bloque" id="ppGuardar" style="margin-top:20px">Guardar mi perfil</button>
    </div>`;

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

  // Zonas: hasta 3
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
        if (zonasSel.size >= 3) { brindis('Podés elegir hasta 3 localidades'); return; }
        zonasSel.add(l);
        b.classList.add('elegida');
      }
    });
    contZ.appendChild(b);
  });

  $('#ppGuardar').addEventListener('click', async () => {
    if (!rubroSel) { brindis('Elegí tu rubro'); return; }
    const zonas = [...zonasSel];
    if (zonas.length === 0) { brindis('Elegí al menos una localidad'); return; }

    const anios  = parseInt($('#ppAnios').value, 10);
    const precio = parseInt($('#ppPrecio').value, 10);
    const bio    = $('#ppBio').value.trim();
    const esp    = $('#ppEsp').value.split(',').map(s => s.trim()).filter(Boolean);

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
      rubro: rubroSel,
      localidad: zonas[0],   // zona principal = la primera elegida
      zonas,
      anios:  Number.isFinite(anios)  ? anios  : null,
      precio_desde: Number.isFinite(precio) ? precio : null,
      bio,
      especialidades: esp
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
    Estado.rol = 'pro';
    Estado.zona = zonas[0];
    Estado.yo = Object.assign({}, Estado.yo, {
      rubro: rubroSel, localidad: zonas[0], zonas,
      anios: cambios.anios, precio_desde: cambios.precio_desde,
      bio, especialidades: esp
    });
    guardar();
    brindis('Perfil guardado');

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

    barra.hidden = false;
    tabs.hidden = false;
    if (typeof volverA === 'function') volverA();
    else irA('perfil');
  });
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
    const dijeSi = new Set((desl || []).filter(d => d.direccion === 'si').map(d => d.pedido_id));
    const dijeNo = new Set((desl || []).filter(d => d.direccion === 'no').map(d => d.pedido_id));

    const { data: filas } = await sb.from('pedidos')
      .select('id,cliente_id,rubro,localidad,urgencia,detalle,presupuesto,creado_en,cliente:perfiles!cliente_id(nombre,foto_url,localidad,ausente,puntaje_cliente,contrataciones,desde_anio)')
      .eq('estado', 'abierto')
      .eq('rubro', Estado.pedido.rubro)
      .eq('localidad', Estado.zona)
      .neq('cliente_id', uid)
      .order('creado_en', { ascending: false });

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
      _real: true
    });

    const disponibles = (filas || []).filter(f => !dijeSi.has(f.id));
    const nuevos     = disponibles.filter(f => !dijeNo.has(f.id)).map(mapear);
    const reaparecen = disponibles.filter(f => dijeNo.has(f.id)).map(mapear);
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

    const { data: filas } = await sb.from('perfiles')
      .select('id,nombre,foto_url,rubro,localidad,zonas,plan,verificacion,bio,especialidades,puntaje_pro,trabajos,respuesta_min,anios,precio_desde')
      .eq('rol', 'pro')
      .eq('rubro', Estado.pedido.rubro)
      .contains('zonas', [Estado.zona])
      .neq('id', uid);

    profesionalesReales = (filas || [])
      .filter(f => !yaMatch.has(f.id))
      .filter(f => esFotoReal(f.foto_url))   // sin foto no se muestra a nadie
      .filter(f => !f.suspendido)            // suspendido: no aparece en el mazo
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
        puntaje: (f.puntaje_pro != null) ? Number(f.puntaje_pro) : 0,
        trabajos: f.trabajos || 0,
        respuesta: f.respuesta_min || 0,
        anios: f.anios || 0,
        desde: f.precio_desde || 0,
        resenas: [],
        _real: true
      }));
  } catch (e) {
    profesionalesReales = [];
  }
}

function candidatos() {
  if (Estado.rol === 'pro') {
    // El profesional ve pedidos reales de clientes (traídos de Supabase).
    return pedidosPro.filter(c => !Estado.vistos.includes(c.id));
  }
  // El cliente ve profesionales reales (traídos de Supabase).
  return profesionalesReales.filter(p => !Estado.vistos.includes(p.id));
}

async function verMazo() {
  const esPro = Estado.rol === 'pro';

  escena.innerHTML = `<div class="vista"><p class="sub-vista" style="margin-top:48px;text-align:center">${esPro ? 'Buscando pedidos abiertos…' : 'Buscando profesionales…'}</p></div>`;
  if (esPro) await cargarPedidosPro();
  else await cargarProfesionalesCli();

  const lista = candidatos();
  const rubro = rubroDe(Estado.pedido.rubro);

  escena.innerHTML = `
    <div class="vista">
      ${franjaAnunciante(esPro ? Estado.yo.rubro : Estado.pedido.rubro, Estado.zona, 'Auspicia')}
      <button class="resumen-busqueda" id="cambiarBusqueda">
        <span><b>${rubro.nombre}</b> · ${Estado.zona} · ${lista.length} ${esPro ? (lista.length === 1 ? 'pedido' : 'pedidos') : (lista.length === 1 ? 'disponible' : 'disponibles')}</span>
        <span class="resumen-cambiar">Cambiar</span>
      </button>
      <div class="mazo-app" id="mazo"></div>
      <div class="controles">
        <button class="disco disco-no" id="btnNo" aria-label="Descartar">✕</button>
        <button class="pastilla-info" id="btnInfo" aria-label="Ver la ficha completa">Ver ficha</button>
        <button class="disco disco-si" id="btnSi" aria-label="${esPro ? 'Me interesa' : 'Me sirve'}">✓</button>
      </div>
    </div>`;

  $('#cambiarBusqueda').addEventListener('click', verFormulario);
  pintarMazo();
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

// Cartel cuando de verdad no hay ningún pedido/profesional para este rubro y zona.
function mazoVacio(cont, esPro) {
  if (!cont) return;
  cont.innerHTML = `
    <div class="vacio" style="height:100%">
      <span class="vacio-glifo">◷</span>
      <h3>Por ahora no hay nadie acá</h3>
      <p>Todavía no hay ${esPro ? 'pedidos' : 'profesionales'} de este rubro en ${Estado.zona}. Probá otra localidad o volvé más tarde.</p>
      <button class="btn btn-fantasma btn-sm" id="otraZona">Probar otra localidad</button>
    </div>`;
  const b = $('#otraZona');
  if (b) b.addEventListener('click', () => elegirZona(verMazo));
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
    <div class="carta-foto">
      <img src="${p.foto}" alt="Foto de ${p.nombre}" loading="lazy">
      ${p.plan !== 'gratis' ? `<span class="carta-plan">${p.plan === 'pro' ? 'Pro' : 'Verificado'}</span>` : ''}
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
        <div class="carta-precio"><b>${plata(p.desde)}</b><span>desde</span></div>
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
    <div class="carta-foto">
      <img src="${c.foto}" alt="Foto de ${c.nombre}" loading="lazy">
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
        ${c.ausente ? '<span class="etiqueta">No vive en la costa</span>' : ''}
      </div>
      <div class="carta-pie">
        <div class="carta-puntaje"><b>${c.puntaje.toFixed(1)}</b><span>${c.contrataciones} contrataciones</span></div>
        <div class="carta-precio"><b>${c.pedido.presupuesto}</b><span>presupuesto</span></div>
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
function verFichaProfesional(p) {
  const rubro = rubroDe(p.rubro);
  const capas = CAPAS_VERIFICACION.map(c => `
    <div class="capa-fila ${p.verificacion.includes(c.id) ? 'ok' : ''}">
      <span class="capa-tilde">${p.verificacion.includes(c.id) ? '✓' : '—'}</span>
      <span><b>${c.nombre}</b><span>${c.metodo}</span></span>
    </div>`).join('');
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
        <h2>${p.nombre} ${p.verificacion.includes('identidad') ? '<span class="sello">✓</span>' : ''}</h2>
        <p>${rubro.nombre} · ${p.localidad}</p>
      </div>
    </div>
    <div class="metricas">
      <div class="metrica"><b>${p.puntaje.toFixed(1)}</b><span>Puntaje</span></div>
      <div class="metrica"><b>${p.trabajos}</b><span>Trabajos</span></div>
      <div class="metrica"><b>${p.anios}</b><span>Años</span></div>
    </div>
    <p style="font-size:14.5px;color:var(--cal-2)">${p.bio}</p>
    <p class="bloque-titulo">Hace</p>
    <div class="etiquetas">${p.especialidades.map(e => `<span class="etiqueta">${e}</span>`).join('')}</div>
    <p class="bloque-titulo">Verificación</p>${capas}
    <p class="bloque-titulo">Lo que dicen los clientes</p>
    <div id="resenasFicha">${resenas}</div>
    ${p._real ? `<button class="btn-reportar" id="btnReportarFicha">Reportar este perfil</button>` : ''}`);

  if ($('#btnReportarFicha')) $('#btnReportarFicha').addEventListener('click', () => denunciar(p, null));

  if (p._real) {
    cargarResenasEnFicha(p.id, 'pro', 'Todavía no tiene reseñas. El primero que lo contrate le va a dejar la primera.');
  }
}

function verFichaCliente(c) {
  const rubro = rubroDe(c.pedido.rubro);
  const urg = urgenciaDe(c.pedido.urgencia);
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
      <div class="metrica"><b>${c.puntaje.toFixed(1)}</b><span>Puntaje</span></div>
      <div class="metrica"><b>${c.contrataciones}</b><span>Contrató</span></div>
      <div class="metrica"><b id="contadorResenas">${c._real ? '—' : c.resenas.length}</b><span>Reseñas</span></div>
    </div>
    <p class="bloque-titulo">Qué necesita</p>
    <div class="tarjeta">
      <p style="font-size:14.5px;color:var(--cal-2);margin-bottom:12px">${c.pedido.detalle}</p>
      <div class="etiquetas">
        <span class="etiqueta">${rubro.nombre}</span>
        <span class="etiqueta">${urg.nombre}</span>
        <span class="etiqueta">${c.pedido.presupuesto}</span>
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
async function cargarMatches() {
  matchesReales = [];
  try {
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return matchesReales;

    const { data: filas } = await sb.from('matches')
      .select('id,pedido_id,cliente_id,profesional_id,estado,creado_en,cli:perfiles!cliente_id(nombre,foto_url,localidad,puntaje_cliente,contrataciones),pro:perfiles!profesional_id(nombre,foto_url,localidad,rubro,puntaje_pro,verificacion),pedido:pedidos!pedido_id(rubro,urgencia,detalle)')
      .or(`cliente_id.eq.${uid},profesional_id.eq.${uid}`)
      .order('creado_en', { ascending: false });

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
    matchesReales = [];
  }
  return matchesReales;
}

async function verMatches() {
  escena.innerHTML = `<div class="vista"><h1 class="titulo-vista">Matches</h1><p class="sub-vista" style="margin-top:24px">Cargando tus matches…</p></div>`;
  await cargarMatches();
  actualizarGlobo();

  if (!matchesReales.length) {
    escena.innerHTML = `
      <div class="vista">
        <h1 class="titulo-vista">Matches</h1>
        <div class="vacio" style="margin-top:24px">
          <span class="vacio-glifo">◇</span>
          <h3>Todavía no hay ninguno</h3>
          <p>Cuando aceptes un perfil (o alguien acepte tu pedido), el match aparece acá.</p>
          <button class="btn btn-plomo btn-sm" id="aBuscar">${Estado.rol === 'pro' ? 'Ver pedidos' : 'Buscar oficios'}</button>
        </div>
      </div>`;
    $('#aBuscar').addEventListener('click', () => irA('buscar'));
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
      ${filas}
      <button class="btn btn-fantasma btn-bloque" id="aBuscarMas" style="margin-top:18px">
        ${Estado.rol === 'pro' ? 'Ver más pedidos' : 'Buscar otro profesional'}
      </button>
    </div>`;

  $('#aBuscarMas').addEventListener('click', () => irA('buscar'));
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

function panelTrabajo(m) {
  const t = m.trabajo;
  const nombre = m.otro.nombre.split(' ')[0];

  if (!t) {
    return soyClienteEnMatch(m)
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
      boton = `<button class="btn btn-plomo btn-bloque btn-sm" id="btnTrabajo" data-accion="fin">Marcar como terminado</button>`;
    } else {
      cuerpo = `Lo diste por terminado. Falta que ${nombre} lo confirme.`;
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

function conectarTrabajo(m, repintar) {
  const a = document.getElementById('btnAbrirTrabajo');
  if (a) a.addEventListener('click', () => pedirNuevoTrabajo(m));

  const c = document.getElementById('btnCancelarTrabajo');
  if (c) c.addEventListener('click', () => confirmarCancelar(m, repintar));

  const b = document.getElementById('btnTrabajo');
  if (!b) return;
  b.addEventListener('click', async () => {
    const texto = b.textContent;
    b.disabled = true;
    b.textContent = 'Guardando…';
    const ok = await marcarTrabajo(m, b.dataset.accion);
    if (!ok) { b.disabled = false; b.textContent = texto; return; }
    repintar();
  });
}

// Cancela un trabajo que todavía no arrancó. Es la salida para el
// caso en que el profesional nunca confirma: sin esto, ese match
// queda trabado y no se puede abrir otro trabajo ahí.
function confirmarCancelar(m, repintar) {
  const nombre = m.otro.nombre.split(' ')[0];
  abrirHoja(`
    <h2>¿Cancelar el trabajo?</h2>
    <p>Todavía no empezó, así que no queda ninguna calificación pendiente. Después vas a poder pedirle otro a ${nombre} cuando quieras.</p>
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

    const { data, error } = await sb.from('trabajos')
      .insert({ match_id: m.id, detalle })
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

    m.trabajo = data;
    m.califique = false;
    cerrarHoja();
    brindis(`Trabajo pedido a ${nombre}`);
    verMatchChat(m);
  });
}

// Lo que se ofrece cuando el trabajo ya está cerrado.
function bloqueCierre(m) {
  const t = m.trabajo;
  if (!t || t.estado === 'propuesto' || t.estado === 'en_curso') return '';

  const nombre = m.otro.nombre.split(' ')[0];
  const soyCli = soyClienteEnMatch(m);

  // El profesional no abre trabajos: los pide el cliente.
  if (!soyCli) {
    return `<p class="chat-cerrado" style="margin-top:10px">${nombre} puede pedirte otro trabajo cuando lo necesite. El contacto queda guardado.</p>`;
  }

  // Falta calificar: ese botón ya está arriba, no ofrecemos nada más todavía.
  if (t.estado === 'terminado' && !m.califique) return '';

  return `
    <button class="btn btn-plomo btn-bloque" id="btnNuevoTrabajo" style="margin-top:14px">Pedirle otro trabajo a ${nombre}</button>
    <button class="btn btn-fantasma btn-bloque" id="btnOtroProfesional" style="margin-top:8px">Buscar otro profesional</button>`;
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
        <div>
          <h2 style="font-size:20px">${p.nombre}</h2>
          <p>${sub}</p>
        </div>
        <button class="btn btn-fantasma btn-sm" id="verPedido" style="margin-left:auto">Pedido</button>
      </div>

      <div id="panelTrabajo">${panelTrabajo(m)}</div>

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
  $('#verPedido').addEventListener('click', () => verMatchDetalle(m));
  if ($('#calificarBtn')) $('#calificarBtn').addEventListener('click', () => calificarReal(m));
  if ($('#btnNuevoTrabajo')) $('#btnNuevoTrabajo').addEventListener('click', () => pedirNuevoTrabajo(m));
  if ($('#btnOtroProfesional')) $('#btnOtroProfesional').addEventListener('click', () => irA('buscar'));
  conectarTrabajo(m, () => verMatchChat(m));
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
    cont.innerHTML = msgs.map(x => {
      const mio = x.autor_id === uid;
      const hora = new Date(x.creado_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="burbuja ${mio ? 'burbuja-yo' : 'burbuja-otro'}">${x.texto.replace(/</g, '&lt;')}<span class="chat-hora">${hora}</span></div>`;
    }).join('');
    cont.scrollIntoView({ block: 'end' });

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
      const { error } = await sb.from('mensajes')
        .insert({ match_id: m.id, trabajo_id: t ? t.id : null, autor_id: uid, texto });
      if (error) { brindis('No se pudo enviar el mensaje'); campo.value = texto; return; }
      await pintarMensajes();
    };
    $('#enviarChat').addEventListener('click', enviar);
    $('#campoChat').addEventListener('keydown', e => { if (e.key === 'Enter') enviar(); });
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
        <button class="btn btn-fantasma btn-sm" id="verFicha" style="margin-left:auto">Ficha</button>
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
  const tipo = m.tipo;   // qué es la otra persona: 'cliente' o 'profesional'
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
      return;
    }

    const { error } = await sb.from('calificaciones').insert({
      match_id: m.id,
      trabajo_id: m.trabajo.id,
      autor_id: uid,
      destino_id: m.otroId,
      hacia: tipo === 'profesional' ? 'pro' : 'cliente',
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
   Una sola vez por sesión, al entrar. Es el espacio que después
   se le vende a un comercio; mientras no haya nadie, se usa para
   hablar de la app y para ofrecer el espacio.

   Una sola vez y no cada tanto: si aparece dos veces en la misma
   sesión, deja de ser publicidad y pasa a ser una molestia. El
   valor del espacio depende de que no canse.
   ─────────────────────────────────────────────────────────── */

const AUTOPUBLICIDAD = [
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
  }
];

const hoyClave = () => new Date().toLocaleDateString('sv');   // 2026-08-18

function quizasInterstitial() {
  // Una vez por DÍA y no por sesión: en la app instalada la sesión no
  // termina cuando cerrás la app —queda suspendida— así que con la marca
  // por sesión no volvía a aparecer nunca.
  try { if (localStorage.getItem('interDia') === hoyClave()) return; } catch {}
  if (!Estado.usuario) return;

  const propios = AUTOPUBLICIDAD.filter(a => a.rol === Estado.rol || a.rol === 'todos');
  if (!propios.length) return;

  const a = propios[new Date().getDate() % propios.length];

  const capa = document.createElement('div');
  capa.className = 'inter';
  capa.style.background = a.fondo;
  capa.style.setProperty('--tinta-inter', a.tinta);

  capa.innerHTML = `
    <button class="inter-cerrar" id="interCerrar" aria-label="Cerrar">✕</button>

    <div class="inter-cuerpo">
      <span class="inter-rotulo">${escapar(a.rotulo)}</span>
      <h2 class="inter-titulo">${escapar(a.titulo)}</h2>
      <p class="inter-texto">${escapar(a.cuerpo)}</p>
      <button class="inter-boton" id="interIr">${escapar(a.boton)}</button>
    </div>

    <span class="inter-pie">Publicidad</span>`;

  document.body.appendChild(capa);
  document.body.style.overflow = 'hidden';

  // La marca se guarda DESPUÉS de mostrarlo. Al revés, si algo falla en el
  // medio queda marcado como visto sin haberse visto nunca.
  try { localStorage.setItem('interDia', hoyClave()); } catch {}

  const cerrar = () => { capa.remove(); document.body.style.overflow = ''; };
  capa.querySelector('#interCerrar').addEventListener('click', cerrar);
  capa.querySelector('#interIr').addEventListener('click', () => { cerrar(); a.accion(); });
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
  climatizacion: ['ferreteria'],
  piletas:       ['ferreteria'],
  jardineria:    ['ferreteria'],
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

function franjaAnunciante(oficio, localidad, rotulo) {
  const c = comercioPara(oficio, localidad);

  if (c) {
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
                      pintureria: 'pinturería', aberturas: 'aberturas' }[cat] || 'comercio';

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
  const partes = codigo.split('-');
  const letras = partes[0] || '';
  const numeros = (partes[1] || '').replace(/(\d{2})(?=\d)/g, '$1 ');

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

async function verBeneficios() {
  const esPro = Estado.rol === 'pro';
  const zona = Estado.zona || Estado.yo.localidad;

  escena.innerHTML = `<div class="vista">
    <h1 class="titulo-vista">Beneficios</h1>
    <p class="sub-vista">Cargando…</p></div>`;

  const { data: filas, error } = await sb.rpc('beneficios_de', { p_localidades: null });
  if (error) console.warn('[beneficios] no se pudieron leer:', error.message);

  const todos = filas || [];
  const propios = todos.filter(x => x.localidad === zona);
  const otros = todos.filter(x => x.localidad !== zona);

  // El código sólo tiene sentido para el profesional: es él quien lo
  // muestra en el mostrador.
  const codigo = esPro ? await traerCodigoBeneficio() : null;

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

// Una foto es "real" si está subida al depósito. Los dibujos de
// FOTOS_PERFIL y el vacío no cuentan: el argumento del producto es que
// atrás de cada estrella hay una persona, y un dibujito lo desmiente.
function esFotoReal(url) {
  if (!url) return false;
  const limpia = String(url).split('?')[0];
  if (FOTOS_PERFIL.some(f => limpia.endsWith(f))) return false;
  return limpia.includes('/storage/v1/object/public/fotos/');
}

// Sólo se le exige al profesional: es su vidriera y le construye
// reputación. Al cliente se le pediría un requisito sin devolverle nada.
const necesitoFoto = () => Estado.rol === 'pro' && !esFotoReal(Estado.usuario?.foto);

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
async function prepararFoto(archivo) {
  const img = await abrirImagen(archivo);

  const ancho = img.width, alto = img.height;
  if (!ancho || !alto) throw new Error('La imagen está vacía o dañada');

  const lado = Math.min(ancho, alto);          // el cuadrado más grande que entre
  const x = (ancho - lado) / 2;
  const y = (alto  - lado) / 2;

  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = FOTO_LADO;
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(img, x, y, lado, lado, 0, 0, FOTO_LADO, FOTO_LADO);

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
  guardar();
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

// Pegá acá la clave PÚBLICA que generaste. Esta va a la vista de
// todos, es su función. La privada va sólo en Render.
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
  const reg = await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveABytes(VAPID_PUBLICA)
    });
  }

  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return false;

  const datos = sub.toJSON();
  const { error } = await sb.from('suscripciones_push').upsert({
    usuario_id: uid,
    endpoint: datos.endpoint,
    p256dh: datos.keys.p256dh,
    auth: datos.keys.auth,
    navegador: navigator.userAgent.slice(0, 120),
    fallos: 0
  }, { onConflict: 'endpoint' });

  if (error) { console.warn('[push] no se pudo guardar la suscripción:', error.message); return false; }
  return true;
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

  // En iPhone el push no existe hasta que la app esté instalada en la
  // pantalla de inicio. Pedir el permiso antes es gastarlo al pedo.
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
      try {
        const permiso = await Notification.requestPermission();
        if (permiso !== 'granted') { cerrarHoja(); return; }
        const ok = await registrarSuscripcion();
        cerrarHoja();
        if (ok) brindis('Avisos activados');
      } catch (e) {
        console.warn('[push] falló la activación:', e);
        cerrarHoja();
      }
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

function verPerfilPro() {
  const u = Estado.usuario;
  const yo = Estado.yo;
  const rubro = rubroDe(yo.rubro);
  const total = CAPAS_VERIFICACION.reduce((a, c) => a + c.peso, 0);
  const hecho = CAPAS_VERIFICACION.filter(c => yo.verificacion.includes(c.id)).reduce((a, c) => a + c.peso, 0);
  const avance = Math.round((hecho / total) * 100);

  const capas = CAPAS_VERIFICACION.map(c => {
    const ok = yo.verificacion.includes(c.id);
    return `
      <div class="capa-fila ${ok ? 'ok' : ''}">
        <span class="capa-tilde">${ok ? '✓' : '—'}</span>
        <span style="flex:1"><b>${c.nombre}</b><span>${c.metodo}</span></span>
        ${ok ? '' : `<span class="capa-accion"><button class="btn btn-plomo btn-sm" data-verificar="${c.id}">Verificar</button></span>`}
      </div>`;
  }).join('');

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
        <div class="metrica"><b>${avance}%</b><span>Verificado</span></div>
      </div>

      ${bloquePuntaje()}

      <p class="bloque-titulo">Verificación</p>
      <div class="tarjeta">
        <div class="medidor">
          <div class="medidor-cabeza">
            <b>${avance === 100 ? 'Perfil verificado' : 'Te falta poco'}</b>
            <span>${avance}%</span>
          </div>
          <div class="medidor-riel"><div class="medidor-relleno" style="width:${avance}%"></div></div>
        </div>
        ${capas}
      </div>

      <p class="bloque-titulo">Tu perfil de oficio</p>
      <div class="tarjeta">
        <div class="cuenta-fila"><span>Rubro</span><b>${rubro.nombre}</b></div>
        <div class="cuenta-fila"><span>Zonas</span><b>${(yo.zonas && yo.zonas.length) ? yo.zonas.join(', ') : (yo.localidad || '—')}</b></div>
        ${yo.anios != null ? `<div class="cuenta-fila"><span>Años en el oficio</span><b>${yo.anios}</b></div>` : ''}
        ${yo.precio_desde != null ? `<div class="cuenta-fila"><span>Precio desde</span><b>$${Number(yo.precio_desde).toLocaleString('es-AR')}</b></div>` : ''}
      </div>

      <p class="bloque-titulo">Tu plan</p>
      <div class="tarjeta">
        <div class="plan-app-cabeza">
          <h3>${PLANES.find(p => p.id === yo.plan).nombre}</h3>
          <span class="marca-actual">Actual</span>
        </div>
        <p class="plan-app-resumen">${PLANES.find(p => p.id === yo.plan).resumen}</p>
        <button class="btn btn-plomo btn-bloque btn-sm" id="abrirPlanes">Ver todos los planes</button>
      </div>

      <p class="bloque-titulo">Tu cuenta</p>
      <div class="tarjeta">
        <div class="cuenta-fila"><span>Correo</span><b>${u.correo}</b></div>
        <div class="cuenta-fila"><span>Ingresás con</span><b>${u.metodo}</b></div>
        <div class="cuenta-fila"><span>Zona de trabajo</span><b>${yo.localidad}</b></div>
      </div>

      <div id="misResenas"></div>

      <button class="btn btn-plomo btn-bloque" id="editarPerfilPro" style="margin-top:16px">Editar mi perfil</button>
      <button class="btn btn-fantasma btn-bloque" id="cambiarRol" style="margin-top:8px">Cambiar a modo cliente</button>
      <button class="btn btn-salir btn-bloque" id="salir" style="margin-top:8px">Cerrar sesión</button>

      <div class="pie-legal">
        <a href="/terminos.html">Términos</a>
        <a href="/privacidad.html">Privacidad</a>
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
  escena.querySelectorAll('[data-verificar]').forEach(b => b.addEventListener('click', () => simularVerificacion(b.dataset.verificar)));
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

      <button class="btn btn-plomo btn-bloque" id="editarPerfilCli" style="margin-top:16px">Editar mi perfil</button>
      <button class="btn btn-fantasma btn-bloque" id="cambiarRol" style="margin-top:8px">Cambiar a modo profesional</button>
      <button class="btn btn-salir btn-bloque" id="salir" style="margin-top:8px">Cerrar sesión</button>

      <div class="pie-legal">
        <a href="/terminos.html">Términos</a>
        <a href="/privacidad.html">Privacidad</a>
        <button id="borrarCuenta">Borrar mi cuenta</button>
      </div>
    </div>`;

  cintaInstalacionIOS();
  refrescarPuntajes();
  pintarResenasReales('cliente', 'misResenas');
  conectarCambioFoto(verPerfilCliente);
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
  const actual = Estado.yo.plan;
  const tarjetas = PLANES.map(p => `
    <article class="plan-app ${p.id === actual ? 'actual' : ''} ${p.destacado && p.id !== actual ? 'destacado' : ''}">
      <div class="plan-app-cabeza">
        <h3>${p.nombre}</h3>
        ${p.id === actual ? '<span class="marca-actual">Actual</span>' : `<span class="plan-app-precio">${p.precioTexto}</span>`}
      </div>
      <p class="plan-app-resumen">${p.resumen}</p>
      <ul>${p.incluye.map(x => `<li>${x}</li>`).join('')}${p.excluye.map(x => `<li class="no">${x}</li>`).join('')}</ul>
      ${p.id === actual || p.id === 'gratis' ? '' : `<button class="btn btn-plomo btn-bloque btn-sm" data-plan="${p.id}">Me interesa</button>`}
    </article>`).join('');

  const panel = abrirHoja(`
    <h2>Planes</h2>
    <p>Durante el lanzamiento en la costa todos los planes están sin cargo. Dejá anotado cuál te interesa y te contactamos para activarlo.</p>
    <div style="margin-top:18px">${tarjetas}</div>`);

  // No se activa solo: queda anotado el interés y lo activa una persona.
  // Si el botón cambiara el plan, cualquiera se daría el pago apretándolo.
  panel.querySelectorAll('[data-plan]').forEach(b => {
    b.addEventListener('click', async () => {
      const nombrePlan = PLANES.find(p => p.id === b.dataset.plan)?.nombre || '';
      b.disabled = true;
      b.textContent = 'Anotando…';

      const { data, error } = await sb.rpc('me_interesa_plan', { p_plan: b.dataset.plan });

      if (error) {
        b.disabled = false;
        b.textContent = 'Me interesa';
        brindis('No se pudo anotar. Probá de nuevo.');
        return;
      }

      b.textContent = data === 'ya_estaba' ? 'Ya estabas anotado' : 'Anotado ✓';
      brindis(data === 'ya_estaba'
        ? 'Ya te habías anotado para ' + nombrePlan
        : 'Listo, te contactamos para activarte ' + nombrePlan);
    });
  });
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
const TITULOS = { buscar: 'Buscar', matches: 'Matches', beneficios: 'Beneficios', perfil: 'Perfil' };

function irA(vista) {
  Estado.vista = vista;
  guardar();
  $('#barraTitulo').textContent = TITULOS[vista] || 'Contratá Ya';
  tabs.querySelectorAll('.tab').forEach(t => t.classList.toggle('activa', t.dataset.vista === vista));
  window.scrollTo({ top: 0 });
  if (vista === 'buscar') verBuscar();
  else if (vista === 'matches') verMatches();
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
    await cargarMatches();
    actualizarGlobo();
    if (Estado.vista === 'matches' && !document.querySelector('.hoja-abierta')) verMatches();
  }, 25000);

  // Al volver a la app después de tenerla en segundo plano.
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !Estado.usuario) return;
    await cargarMatches();
    actualizarGlobo();
    quizasInterstitial();   // volvió a la app: puede ser otro día
  });
}

/* ── Arranque ───────────────────────────────────────────── */
// Pasa el perfil de la base al estado de la app. Está separado porque se
// usa en dos momentos: al entrar por primera vez y al recargar con sesión.
function volcarPerfil(perfil) {
  // El rol de la base es lo que la persona ES. El modo en el que está
  // parada ahora lo elige ella con el botón de cambiar de modo, y no
  // tiene que pisarse en cada recarga: sólo se usa si todavía no eligió.
  if (perfil.rol && !Estado.rol) Estado.rol = perfil.rol;
  Estado.yo = Object.assign({}, Estado.yo, {
    rubro: perfil.rubro || Estado.yo.rubro,
    localidad: perfil.localidad || Estado.yo.localidad,
    zonas: perfil.zonas || [],
    anios: perfil.anios ?? null,
    precio_desde: perfil.precio_desde ?? null,
    bio: perfil.bio || '',
    especialidades: perfil.especialidades || [],
    ausente: perfil.ausente || false,
    plan: perfil.plan || 'gratis',
    verificacion: (perfil.verificacion && perfil.verificacion.length)
      ? perfil.verificacion : ['telefono', 'email'],
    suspendido: perfil.suspendido || false,
    suspendidoMotivo: perfil.suspendido_motivo || ''
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

  // ¿Volvemos de Google o del enlace del correo? Supabase deja la sesión lista tras el redirect.
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
    const metodo = u.app_metadata?.provider === 'google' ? 'Google' : 'Correo';
    Estado.usuario = {
      id: u.id,
      nombre,
      correo: u.email,
      metodo,
      foto: perfil?.foto_url || FOTOS_PERFIL[0],
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
      Estado.usuario.foto = fresco.foto_url || Estado.usuario.foto;
      Estado.usuario.puntajePro = fresco.puntaje_pro != null ? Number(fresco.puntaje_pro) : null;
      Estado.usuario.puntajeCliente = fresco.puntaje_cliente != null ? Number(fresco.puntaje_cliente) : null;
      Estado.usuario.trabajos = fresco.trabajos || 0;
      Estado.usuario.contrataciones = fresco.contrataciones || 0;
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

  if (Estado.yo && Estado.yo.suspendido) {
    barra.hidden = true;
    tabs.hidden = true;
    escena.innerHTML = `
      <div class="vista">
        <div class="vacio" style="margin-top:40px">
          <h2 style="font-size:22px;margin-bottom:12px">Tu cuenta está suspendida</h2>
          <p>Recibimos un reporte sobre tu cuenta y la pusimos en pausa mientras lo revisamos.</p>
          <p style="margin-top:10px">${escapar(Estado.yo.suspendidoMotivo || '')}</p>
          <p style="margin-top:14px;font-size:13.5px;color:var(--cal-3)">Si creés que es un error, escribinos y lo miramos de nuevo.</p>
        </div>
      </div>`;
    return;
  }

  pintarModo();
  await cargarCarteles();
  barra.hidden = false;
  tabs.hidden = false;
  arrancarLatido();
  irA(Estado.vista || 'buscar');
  setTimeout(quizasInterstitial, 1400);   // que primero se vea la app
}
arrancar();
