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
  panel.innerHTML = '<div class="hoja-tirador"></div>' + html;
  hoja.hidden = false;
  document.body.style.overflow = 'hidden';
  return panel;
}
function cerrarHoja() {
  $('#hoja').hidden = true;
  document.body.style.overflow = '';
}
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
    <p>Te mandamos un código de seis dígitos para confirmar que el correo es tuyo.</p>
    <div style="margin-top:20px">
      <span class="campo-rotulo">Nombre y apellido</span>
      <input class="chat-campo" id="regNombre" style="width:100%;border-radius:12px;margin-bottom:16px" placeholder="Como querés que te vean" autocomplete="name">
      <span class="campo-rotulo">Correo</span>
      <input class="chat-campo" id="regCorreo" style="width:100%;border-radius:12px" placeholder="tunombre@correo.com" type="email" autocomplete="email">
    </div>
    <button class="btn btn-plomo btn-bloque" id="regEnviar" style="margin-top:20px" disabled>Enviarme el código</button>`);

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
      options: { data: { nombre } }
    });
    if (error) {
      boton.disabled = false;
      boton.textContent = 'Enviarme el código';
      brindis('No se pudo enviar el código: ' + error.message);
      return;
    }
    pedirCodigo(nombre, correo);
  });
}

function pedirCodigo(nombre, correo) {
  abrirHoja(`
    <h2>Revisá tu correo</h2>
    <p>Mandamos un código de seis dígitos a <b style="color:var(--cal)">${correo}</b>. Revisá también la carpeta de correo no deseado.</p>
    <input class="chat-campo codigo-campo" id="regCodigo" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code">
    <button class="btn btn-plomo btn-bloque" id="regConfirmar" style="margin-top:18px" disabled>Confirmar</button>
    <button class="btn btn-fantasma btn-bloque btn-sm" id="regVolver" style="margin-top:8px">Cambiar el correo</button>`);

  $('#regCodigo').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '');
    $('#regConfirmar').disabled = e.target.value.length !== 6;
  });
  $('#regVolver').addEventListener('click', registroCorreo);
  $('#regConfirmar').addEventListener('click', async () => {
    const codigo = $('#regCodigo').value.trim();
    const boton = $('#regConfirmar');
    boton.disabled = true;
    boton.textContent = 'Confirmando…';
    const { error } = await sb.auth.verifyOtp({
      email: correo,
      token: codigo,
      type: 'email'
    });
    if (error) {
      boton.disabled = false;
      boton.textContent = 'Confirmar';
      brindis('Código incorrecto o vencido');
      return;
    }
    crearCuenta({ nombre, correo, metodo: 'Correo' });
  });
}

function crearCuenta({ nombre, correo, metodo }) {
  Estado.usuario = {
    nombre, correo, metodo,
    foto: FOTOS_PERFIL[0],
    puntaje: null,          // sin calificaciones todavía
    trabajos: 0,
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
      barra.hidden = false;
      tabs.hidden = false;
      irA('buscar');
    });
  });
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

  $('#empezar').addEventListener('click', () => {
    Estado.vistos = [];
    if (esPro) Estado.yo.localidad = Estado.zona;
    guardar();
    verMazo();
  });
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

/* ── Candidatos según el rol ────────────────────────────── */
function candidatos() {
  if (Estado.rol === 'pro') {
    // El profesional ve pedidos de clientes de su rubro
    return CLIENTES
      .filter(c => c.pedido.rubro === Estado.pedido.rubro)
      .filter(c => !Estado.vistos.includes(c.id))
      .sort((a, b) => {
        const za = a.localidad === Estado.zona ? 0 : 1;
        const zb = b.localidad === Estado.zona ? 0 : 1;
        if (za !== zb) return za - zb;
        return b.puntaje - a.puntaje;
      });
  }
  return PROFESIONALES
    .filter(p => p.rubro === Estado.pedido.rubro)
    .filter(p => !Estado.vistos.includes(p.id))
    .sort((a, b) => {
      const za = a.localidad === Estado.zona ? 0 : 1;
      const zb = b.localidad === Estado.zona ? 0 : 1;
      if (za !== zb) return za - zb;
      const peso = { pro: 0, verificado: 1, gratis: 2 };
      if (peso[a.plan] !== peso[b.plan]) return peso[a.plan] - peso[b.plan];
      return b.puntaje - a.puntaje;
    });
}

function verMazo() {
  const lista = candidatos();
  const sp = sponsorDe(Estado.zona);
  const rubro = rubroDe(Estado.pedido.rubro);
  const esPro = Estado.rol === 'pro';

  escena.innerHTML = `
    <div class="vista">
      <div class="sponsor-franja">
        <span class="sponsor-cuadro" style="background:${sp.color}">${sp.nombre.charAt(0)}</span>
        <span class="sponsor-texto"><b>${sp.nombre}</b><span>${sp.beneficio} · ${Estado.zona}</span></span>
        <span class="sponsor-rotulo">Auspicia</span>
      </div>
      <div class="mazo-app" id="mazo"></div>
      <div class="controles">
        <button class="disco disco-no" id="btnNo" aria-label="Descartar">✕</button>
        <button class="disco disco-info" id="btnInfo" aria-label="Ver ficha completa">i</button>
        <button class="disco disco-si" id="btnSi" aria-label="${esPro ? 'Me interesa' : 'Me sirve'}">✓</button>
      </div>
      <p class="mazo-pie dato">
        ${rubro.nombre.toUpperCase()} · ${Estado.zona.toUpperCase()} · ${lista.length} ${esPro ? (lista.length === 1 ? 'PEDIDO' : 'PEDIDOS') : (lista.length === 1 ? 'DISPONIBLE' : 'DISPONIBLES')}
      </p>
      <div style="text-align:center;margin-top:10px">
        <button class="btn btn-fantasma btn-sm" id="cambiarBusqueda">Cambiar la búsqueda</button>
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
    cont.innerHTML = `
      <div class="vacio" style="height:100%">
        <span class="vacio-glifo">◷</span>
        <h3>Por ahora no hay más</h3>
        <p>Te avisamos apenas aparezca ${esPro ? 'un pedido nuevo' : 'alguien de este rubro'} en ${Estado.zona}. Mientras tanto podés probar otra localidad.</p>
        <button class="btn btn-fantasma btn-sm" id="otraZona">Probar otra localidad</button>
      </div>`;
    const b = $('#otraZona');
    if (b) b.addEventListener('click', () => elegirZona(verMazo));
    return;
  }

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

function resolver(carta, perfil, direccion) {
  carta.style.transition = 'transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s';
  carta.style.transform = `translate(${direccion * 620}px, 50px) rotate(${direccion * 26}deg)`;
  carta.style.opacity = '0';

  Estado.vistos.push(perfil.id);

  if (direccion === 1) {
    const tipo = Estado.rol === 'pro' ? 'cliente' : 'profesional';
    Estado.matches.unshift({ id: perfil.id, tipo, cuando: Date.now(), leido: false, calificado: false });
    setTimeout(() => festejarMatch(perfil, tipo), 320);
  }

  guardar();
  actualizarGlobo();
  setTimeout(pintarMazo, 300);
}

function festejarMatch(perfil, tipo) {
  const sp = sponsorDe(Estado.zona);
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
      <p style="margin-bottom:20px">Ya tenés el chat abierto. El precio y la fecha los arreglan ustedes dos, sin intermediarios.</p>

      <div class="sponsor-franja" style="text-align:left">
        <span class="sponsor-cuadro" style="background:${sp.color}">${sp.nombre.charAt(0)}</span>
        <span class="sponsor-texto"><b>${sp.nombre}</b><span>${sp.beneficio} presentando el match</span></span>
        <span class="sponsor-rotulo">Materiales</span>
      </div>

      <button class="btn btn-plomo btn-bloque" id="irAlChat" style="margin-top:16px">Abrir el chat</button>
      <button class="btn btn-fantasma btn-bloque" id="seguirViendo" style="margin-top:8px">Seguir mirando</button>
    </div>`);

  $('#irAlChat').addEventListener('click', () => { cerrarHoja(); verChat(perfil.id, tipo); });
  $('#seguirViendo').addEventListener('click', cerrarHoja);
}

/* ── Fichas completas ───────────────────────────────────── */
function verFichaProfesional(p) {
  const rubro = rubroDe(p.rubro);
  const capas = CAPAS_VERIFICACION.map(c => `
    <div class="capa-fila ${p.verificacion.includes(c.id) ? 'ok' : ''}">
      <span class="capa-tilde">${p.verificacion.includes(c.id) ? '✓' : '—'}</span>
      <span><b>${c.nombre}</b><span>${c.metodo}</span></span>
    </div>`).join('');
  const resenas = p.resenas.map(r => `
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
    <p class="bloque-titulo">Lo que dicen los clientes</p>${resenas}`);
}

function verFichaCliente(c) {
  const rubro = rubroDe(c.pedido.rubro);
  const urg = urgenciaDe(c.pedido.urgencia);
  const resenas = c.resenas.map(r => `
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
      <div class="metrica"><b>${c.resenas.length}</b><span>Reseñas</span></div>
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
    <p class="bloque-titulo">Lo que dicen los profesionales</p>${resenas}`);
}

/* ══════════════════════════════════════════════════════════
   MATCHES
   ══════════════════════════════════════════════════════════ */
function verMatches() {
  if (!Estado.matches.length) {
    escena.innerHTML = `
      <div class="vista">
        <h1 class="titulo-vista">Matches</h1>
        <div class="vacio" style="margin-top:24px">
          <span class="vacio-glifo">◇</span>
          <h3>Todavía no hay ninguno</h3>
          <p>Cuando aceptes un perfil y esa persona te acepte, el chat aparece acá.</p>
          <button class="btn btn-plomo btn-sm" id="aBuscar">${Estado.rol === 'pro' ? 'Ver pedidos' : 'Buscar oficios'}</button>
        </div>
      </div>`;
    $('#aBuscar').addEventListener('click', () => irA('buscar'));
    return;
  }

  const filas = Estado.matches.map(m => {
    const p = buscarPersona(m.id, m.tipo);
    if (!p) return '';
    const sub = m.tipo === 'cliente'
      ? `${p.localidad} · ${p.puntaje.toFixed(1)} ★ · ${p.contrataciones} contrataciones`
      : `${rubroDe(p.rubro).nombre} · ${p.localidad} · ${p.puntaje.toFixed(1)} ★`;
    return `
      <button class="match-fila" data-match="${m.id}" data-tipo="${m.tipo}">
        <img class="match-avatar" src="${p.foto}" alt="">
        <span class="match-cuerpo">
          <b>${p.nombre}${m.tipo === 'profesional' && p.verificacion.includes('identidad') ? ' <span class="sello">✓</span>' : ''}</b>
          <p>${sub}</p>
        </span>
        <span class="match-estado ${m.calificado ? 'estado-hecho' : 'estado-nuevo'}">${m.calificado ? 'Calificado' : 'Nuevo'}</span>
      </button>`;
  }).join('');

  escena.innerHTML = `
    <div class="vista">
      <h1 class="titulo-vista">Matches</h1>
      <p class="sub-vista">${Estado.matches.length} ${Estado.matches.length === 1 ? 'conversación abierta' : 'conversaciones abiertas'}.</p>
      ${filas}
    </div>`;

  escena.querySelectorAll('[data-match]').forEach(b => {
    b.addEventListener('click', () => verChat(parseInt(b.dataset.match, 10), b.dataset.tipo));
  });
}

function verChat(id, tipo) {
  const p = buscarPersona(id, tipo);
  const m = Estado.matches.find(x => x.id === id && x.tipo === tipo);
  const sp = sponsorDe(Estado.zona || p.localidad);
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

      <div class="sponsor-franja">
        <span class="sponsor-cuadro" style="background:${sp.color}">${sp.nombre.charAt(0)}</span>
        <span class="sponsor-texto"><b>${sp.nombre}</b><span>${sp.beneficio}</span></span>
        <span class="sponsor-rotulo">Materiales</span>
      </div>

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
    u.trabajos += 1;
    const recibido = 4.5 + Math.random() * 0.5;
    u.puntaje = u.puntaje === null ? recibido : (u.puntaje * (u.trabajos - 1) + recibido) / u.trabajos;
    guardar();
    cerrarHoja();
    brindis('Calificación enviada. Te calificaron con ' + recibido.toFixed(1));
    verChat(p.id, tipo);
  });
}

/* ══════════════════════════════════════════════════════════
   BENEFICIOS
   ══════════════════════════════════════════════════════════ */
function verBeneficios() {
  const habilitado = Estado.yo.plan !== 'gratis';
  const zona = Estado.zona || Estado.yo.localidad;
  const propios = SPONSORS.filter(s => s.localidades.includes(zona));
  const otros = SPONSORS.filter(s => !s.localidades.includes(zona));

  const tarjeta = (s, cerca) => `
    <article class="beneficio ${habilitado && cerca ? '' : 'bloqueado'}" style="--tono:${s.color}">
      <div class="beneficio-cabeza">
        <span class="sponsor-cuadro" style="background:${s.color}">${s.nombre.charAt(0)}</span>
        <div><h3>${s.nombre}</h3><p class="beneficio-zonas">${s.rubroComercio}</p></div>
      </div>
      <p class="beneficio-detalle">${s.beneficio}</p>
      ${habilitado && cerca
        ? `<div class="codigo">CY-${s.id.toUpperCase().slice(0, 4)}-${(Estado.usuario.puntaje || 5).toFixed(1).replace('.', '')}</div>
           <p class="beneficio-zonas">Mostrá este código en el mostrador. Vence el último día del mes.</p>`
        : `<p class="beneficio-zonas">${cerca ? 'Disponible con el plan Verificado' : 'Fuera de tu zona · ' + s.localidades.join(', ')}</p>`}
    </article>`;

  escena.innerHTML = `
    <div class="vista">
      <h1 class="titulo-vista">Beneficios</h1>
      <p class="sub-vista">Descuentos en comercios de la costa para profesionales con buena calificación. Se canjean solo desde acá.</p>

      ${!habilitado ? `
        <div class="tarjeta" style="margin-bottom:16px;border-color:var(--plomo)">
          <p class="eyebrow" style="color:var(--plomo);margin-bottom:8px">Con el plan gratis</p>
          <p style="font-size:14.5px;color:var(--cal-2);margin-bottom:14px">Los beneficios se activan con el plan Verificado. Durante el lanzamiento no tiene costo.</p>
          <button class="btn btn-plomo btn-bloque btn-sm" id="verPlanes">Ver los planes</button>
        </div>` : ''}

      <p class="bloque-titulo">En ${zona}</p>
      ${propios.length ? propios.map(s => tarjeta(s, true)).join('') : '<div class="vacio"><p>Todavía no hay comercios adheridos en esta localidad.</p></div>'}

      <p class="bloque-titulo">En otras localidades</p>
      ${otros.map(s => tarjeta(s, false)).join('')}

      <div class="tarjeta" style="margin-top:24px">
        <p class="eyebrow" style="margin-bottom:8px">¿Tenés un comercio?</p>
        <p style="font-size:14.5px;color:var(--cal-2);margin-bottom:14px">Un solo comercio por rubro y por localidad. Si la tuya está libre, es tuya mientras dure el acuerdo.</p>
        <a class="btn btn-fantasma btn-bloque btn-sm" href="/#comercios">Cómo funciona para comercios</a>
      </div>
    </div>`;

  const b = $('#verPlanes');
  if (b) b.addEventListener('click', verPlanes);
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

function conectarCambioFoto(volver) {
  const b = $('#cambiarFoto');
  if (!b) return;
  b.addEventListener('click', () => {
    const opciones = FOTOS_PERFIL.map(f => `
      <button class="foto-opcion ${f === Estado.usuario.foto ? 'elegida' : ''}" data-foto="${f}">
        <img src="${f}" alt="">
      </button>`).join('');
    const panel = abrirHoja(`
      <h2>Tu foto</h2>
      <p>Los perfiles con foto reciben más del doble de contactos. En la versión final se sube desde la cámara o la galería.</p>
      <div class="fotos-grilla">${opciones}</div>`);
    panel.querySelectorAll('[data-foto]').forEach(o => {
      o.addEventListener('click', () => {
        Estado.usuario.foto = o.dataset.foto;
        guardar();
        cerrarHoja();
        brindis('Foto actualizada');
        volver();
      });
    });
  });
}

function bloquePuntaje() {
  const u = Estado.usuario;
  if (u.puntaje === null) {
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

      <div class="metricas">
        <div class="metrica"><b>${u.puntaje === null ? '—' : u.puntaje.toFixed(1)}</b><span>Puntaje</span></div>
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

      <button class="btn btn-fantasma btn-bloque" id="cambiarZonaPro" style="margin-top:16px">Cambiar localidad</button>
      <button class="btn btn-fantasma btn-bloque" id="cambiarRol" style="margin-top:8px">Cambiar a modo cliente</button>
      <button class="btn btn-salir btn-bloque" id="salir" style="margin-top:8px">Cerrar sesión</button>
    </div>`;

  cintaInstalacionIOS();
  conectarCambioFoto(verPerfilPro);
  escena.querySelectorAll('[data-verificar]').forEach(b => b.addEventListener('click', () => simularVerificacion(b.dataset.verificar)));
  $('#abrirPlanes').addEventListener('click', verPlanes);
  $('#cambiarZonaPro').addEventListener('click', () => elegirZona(() => { Estado.yo.localidad = Estado.zona; guardar(); verPerfilPro(); }));
  $('#cambiarRol').addEventListener('click', () => { Estado.rol = 'cliente'; Estado.vistos = []; guardar(); irA('buscar'); brindis('Estás en modo cliente'); });
  $('#salir').addEventListener('click', cerrarSesion);
}

function verPerfilCliente() {
  const u = Estado.usuario;
  escena.innerHTML = `
    <div class="vista">
      <div id="cintaIOS"></div>
      ${cabezaPerfil(`Cliente · ${Estado.zona || 'Sin localidad'}`)}

      <div class="metricas">
        <div class="metrica"><b>${u.puntaje === null ? '—' : u.puntaje.toFixed(1)}</b><span>Tu puntaje</span></div>
        <div class="metrica"><b>${Estado.matches.length}</b><span>Matches</span></div>
        <div class="metrica"><b>${u.trabajos}</b><span>Contrataciones</span></div>
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

      <button class="btn btn-fantasma btn-bloque" id="cambiarZonaCli" style="margin-top:16px">Cambiar localidad</button>
      <button class="btn btn-fantasma btn-bloque" id="cambiarRol" style="margin-top:8px">Cambiar a modo profesional</button>
      <button class="btn btn-salir btn-bloque" id="salir" style="margin-top:8px">Cerrar sesión</button>
    </div>`;

  cintaInstalacionIOS();
  conectarCambioFoto(verPerfilCliente);
  $('#cambiarZonaCli').addEventListener('click', () => elegirZona(verPerfilCliente));
  $('#cambiarRol').addEventListener('click', () => { Estado.rol = 'pro'; Estado.vistos = []; guardar(); irA('buscar'); brindis('Estás en modo profesional'); });
  $('#salir').addEventListener('click', cerrarSesion);
}

function cerrarSesion() {
  abrirHoja(`
    <h2>¿Cerrar sesión?</h2>
    <p>Vas a volver a la pantalla de registro. En la demostración se borran los matches y las calificaciones de esta sesión.</p>
    <button class="btn btn-salir btn-bloque" id="confirmarSalir" style="margin-top:20px">Sí, cerrar sesión</button>
    <button class="btn btn-fantasma btn-bloque" id="cancelarSalir" style="margin-top:8px">Cancelar</button>`);
  $('#cancelarSalir').addEventListener('click', cerrarHoja);
  $('#confirmarSalir').addEventListener('click', () => {
    try { sessionStorage.removeItem('contrataya'); } catch {}
    Object.assign(Estado, {
      usuario: null, rol: null, zona: null,
      pedido: { rubro: null, urgencia: null, detalle: '' },
      vistos: [], matches: [], vista: 'buscar',
      yo: { rubro: 'albanileria', localidad: 'San Bernardo', plan: 'gratis', verificacion: ['telefono', 'email'] }
    });
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
      ${p.id === actual ? '' : `<button class="btn btn-plomo btn-bloque btn-sm" data-plan="${p.id}">Activar sin cargo</button>`}
    </article>`).join('');

  const panel = abrirHoja(`
    <h2>Planes</h2>
    <p>Durante el lanzamiento en la costa todos los planes están sin cargo. Cuando haya volumen real de trabajos, avisamos con un mes de anticipación.</p>
    <div style="margin-top:18px">${tarjetas}</div>`);

  panel.querySelectorAll('[data-plan]').forEach(b => {
    b.addEventListener('click', () => {
      Estado.yo.plan = b.dataset.plan;
      guardar();
      cerrarHoja();
      brindis('Plan ' + PLANES.find(p => p.id === b.dataset.plan).nombre + ' activado');
      Estado.rol === 'pro' ? verPerfilPro() : irA(Estado.vista);
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

function actualizarGlobo() {
  const g = $('#globoMatches');
  const n = Estado.matches.filter(m => !m.leido).length;
  g.textContent = String(n);
  g.hidden = n === 0;
}

/* ── Arranque ───────────────────────────────────────────── */
async function arrancar() {
  recuperar();

  // ¿Volvemos de Google? Supabase deja la sesión lista tras el redirect.
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user && !Estado.usuario) {
    const u = session.user;
    const nombre = u.user_metadata?.full_name || u.user_metadata?.name ||
                   (u.email ? u.email.split('@')[0] : 'Usuario');
    Estado.usuario = {
      nombre,
      correo: u.email,
      metodo: 'Google',
      foto: FOTOS_PERFIL[0],
      puntaje: null,
      trabajos: 0,
      desde: new Date().getFullYear()
    };
    guardar();
    history.replaceState(null, '', location.pathname + location.search);
  }

  const params = new URLSearchParams(location.search);
  if (params.get('rol') === 'pro' && Estado.usuario) Estado.rol = 'pro';

  if (Estado.zona) $('#zonaActual').textContent = Estado.zona;
  actualizarGlobo();

  if (!Estado.usuario) return verRegistro();
  if (!Estado.rol) return verBienvenida();

  barra.hidden = false;
  tabs.hidden = false;
  irA(Estado.vista || 'buscar');
}
arrancar();
