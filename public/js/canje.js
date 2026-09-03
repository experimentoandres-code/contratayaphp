/* ============================================================
   CONTRATÁ YA — Canje del comerciante
   ------------------------------------------------------------
   Sin usuario ni contraseña: la llave viene en la dirección.
   El que atiende el mostrador no instala ni configura nada.
   ============================================================ */

const $c = (s) => document.querySelector(s);

const LLAVE = new URLSearchParams(location.search).get('c') || '';
let ultimoCodigo = '';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const iniciales = (n) => String(n || '?').split(' ').filter(Boolean)
  .slice(0, 2).map(p => p[0]).join('').toUpperCase();

const NOMBRE_RUBRO = {
  albanileria: 'Albañilería', electricidad: 'Electricidad', plomeria: 'Plomería',
  gas: 'Gas matriculado', pintura: 'Pintura', techos: 'Techos',
  carpinteria: 'Carpintería', herreria: 'Herrería', climatizacion: 'Aire y calefacción',
  piletas: 'Piletas', durlock: 'Durlock', pisos: 'Pisos y revestimientos',
  destapaciones: 'Destapaciones', fumigacion: 'Fumigación', jardineria: 'Parquización',
  mantenimiento: 'Mantenimiento', casero: 'Casero (cuidado de propiedades)',
  limpieza: 'Limpieza de casas / Hoteles',
  fletes: 'Fletes y mudanzas', electronica: 'Técnico electrónico', cerrajero: 'Cerrajero',
  contratista: 'Obra completa'
};

function brindis(txt) {
  const b = $c('#brindis');
  b.textContent = txt;
  b.hidden = false;
  clearTimeout(brindis._t);
  brindis._t = setTimeout(() => { b.hidden = true; }, 3000);
}

function cuando(f) {
  if (!f) return '';
  const d = new Date(f);
  const dias = Math.floor((Date.now() - d) / 86400000);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}


/* ── Arranque ─────────────────────────────────────────────── */

async function abrir() {
  if (!LLAVE) {
    $c('#portonTexto').textContent = 'Esta dirección está incompleta. Pedile el enlace a Contratá Ya.';
    return;
  }

  try {
    await cargarPanel();
    $c('#porton').hidden = true;
    $c('#canje').hidden = false;
    conectar();
  } catch (e) {
    console.warn('[canje]', e);
    $c('#portonTexto').textContent = 'Este acceso no es válido o fue dado de baja.';
  }
}

function conectar() {
  const campo = $c('#campoCodigo');
  $c('#btnBuscar').addEventListener('click', buscar);
  campo.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
  campo.focus();
}


/* ── Buscar el código ─────────────────────────────────────── */

async function buscar() {
  const codigo = $c('#campoCodigo').value.trim();
  if (!codigo) return;

  $c('#resultado').innerHTML = '<p class="cargando">Buscando…</p>';

  const { data, error } = await sb.rpc('buscar_codigo', { p_llave: LLAVE, p_codigo: codigo });

  if (error) {
    $c('#resultado').innerHTML = `<div class="ficha-mal"><p>${esc(error.message)}</p></div>`;
    return;
  }

  const p = data && data[0];

  if (!p) {
    $c('#resultado').innerHTML = `
      <div class="ficha-mal">
        <b>No encontramos ese código</b>
        <p>Fijate que esté completo. Son dos letras, un guion y seis números. Pedile que te muestre la pantalla.</p>
      </div>`;
    return;
  }

  ultimoCodigo = codigo;

  $c('#resultado').innerHTML = `
    <div class="ficha-pro">
      <div class="ficha-foto">
        ${p.foto_url ? `<img src="${esc(p.foto_url)}" alt="">` : esc(iniciales(p.nombre))}
      </div>

      <h2>${esc(p.nombre)}</h2>
      <p class="ficha-oficio">${esc(NOMBRE_RUBRO[p.rubro] || p.rubro || '')} · ${esc(p.localidad || '')}</p>

      <div class="ficha-datos">
        ${p.puntaje != null ? `<span>${Number(p.puntaje).toFixed(1).replace('.', ',')} ★</span>` : ''}
        <span>${p.visitas > 0 ? `${p.visitas} ${p.visitas === 1 ? 'visita' : 'visitas'}` : 'Primera visita'}</span>
      </div>

      ${p.ya_vino_hoy
        ? `<div class="ya-vino">Ya registraste una visita suya hoy. Hacele el descuento igual: sólo no se cuenta dos veces.</div>`
        : `<button class="btn-canje btn-canje-grande" id="btnConfirmar">Confirmar visita</button>`}

      <p class="ficha-mira">Mirá que la cara coincida con la persona que tenés enfrente.</p>
    </div>`;

  const b = $c('#btnConfirmar');
  if (b) b.addEventListener('click', () => confirmar(b));
}


/* ── Registrar ────────────────────────────────────────────── */

async function confirmar(boton) {
  boton.disabled = true;
  boton.textContent = 'Registrando…';

  const { data, error } = await sb.rpc('registrar_canje', {
    p_llave: LLAVE, p_codigo: ultimoCodigo
  });

  if (error) {
    boton.disabled = false;
    boton.textContent = 'Confirmar visita';
    brindis(error.message || 'No se pudo registrar');
    return;
  }

  brindis(data === 'ya_estaba' ? 'Ya estaba registrada hoy' : 'Visita registrada');

  $c('#resultado').innerHTML = `
    <div class="listo">
      <b>Listo</b>
      <p>Hacele el descuento. La visita quedó registrada.</p>
      <button class="btn-canje-sec" id="otro">Cargar otro código</button>
    </div>`;

  $c('#otro').addEventListener('click', () => {
    $c('#resultado').innerHTML = '';
    $c('#campoCodigo').value = '';
    $c('#campoCodigo').focus();
  });

  await cargarPanel();
}


/* ── Los números ──────────────────────────────────────────── */

async function cargarPanel() {
  const { data, error } = await sb.rpc('panel_anunciante', { p_llave: LLAVE });
  if (error) throw error;

  const d = typeof data === 'string' ? JSON.parse(data) : data;

  $c('#comercioNombre').textContent = d.comercio || '';
  $c('#comercioBeneficio').textContent = d.beneficio || '';
  $c('#comercioZonas').innerHTML = (d.zonas || [])
    .map(z => `<span>${esc(z)}</span>`).join('');

  const delta = d.mes_pasado
    ? Math.round(((d.mes - d.mes_pasado) / d.mes_pasado) * 100) : null;

  $c('#numeros').innerHTML = `
    <div class="numero">
      <span class="numero-rotulo">Este mes</span>
      <b>${d.mes}</b>
      <span class="numero-nota">${delta === null ? 'visitas' :
        `<i class="${delta >= 0 ? 'sube' : 'baja'}">${delta >= 0 ? '+' : '−'}${Math.abs(delta)}%</i> vs. mes pasado`}</span>
    </div>
    <div class="numero">
      <span class="numero-rotulo">Nuevos este mes</span>
      <b>${d.nuevos}</b>
      <span class="numero-nota">primera vez en tu local</span>
    </div>
    <div class="numero">
      <span class="numero-rotulo">Profesionales distintos</span>
      <b>${d.personas}</b>
      <span class="numero-nota">desde que empezaste</span>
    </div>
    <div class="numero">
      <span class="numero-rotulo">Visitas totales</span>
      <b>${d.total}</b>
      <span class="numero-nota">acumuladas</span>
    </div>`;

  const visitas = d.visitas || [];

  $c('#listaVisitas').innerHTML = visitas.length
    ? visitas.map(v => `
        <div class="visita">
          <span class="visita-foto">${v.foto ? `<img src="${esc(v.foto)}" alt="">` : esc(iniciales(v.nombre))}</span>
          <span class="visita-quien">
            <b>${esc(v.nombre)}${v.nuevo ? ' <i class="nuevo">nuevo</i>' : ''}</b>
            <span>${esc(NOMBRE_RUBRO[v.rubro] || v.rubro || '')}</span>
          </span>
          <span class="visita-veces">${v.veces} ${v.veces === 1 ? 'vez' : 'veces'}<em>${cuando(v.ultima)}</em></span>
        </div>`).join('')
    : `<div class="vacio-canje">
         <b>Todavía no vino nadie</b>
         <p>Cuando un profesional te muestre su código y lo cargues acá, va a aparecer en esta lista.</p>
       </div>`;
}

abrir();
