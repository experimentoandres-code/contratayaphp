/* ============================================================
   CONTRATÁ YA — Landing de revendedores
   ------------------------------------------------------------
   Sin framework y sin supabase-js: son dos llamadas a la API
   local (/sb/rest/v1/rpc/...) y ninguna necesita sesión.
   ============================================================ */

const $r = (s) => document.querySelector(s);

const escRv = (t) => String(t ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const pesosRv = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });

let ZONAS = [];
let REGLAS = {};
const elegidas = new Set();

/* Llamada a una función de la API local. Nada sale de este dominio. */
async function rpc(nombre, args) {
  const r = await fetch('/sb/rest/v1/rpc/' + nombre, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {})
  });
  const cuerpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error((cuerpo && (cuerpo.message || cuerpo.hint)) || 'No se pudo conectar');
  return cuerpo;
}

function brindis(txt, mal) {
  const b = $r('#brindis');
  b.textContent = txt;
  b.style.borderColor = mal ? 'var(--coral)' : 'var(--linea)';
  b.hidden = false;
  clearTimeout(brindis._t);
  brindis._t = setTimeout(() => { b.hidden = true; }, 4000);
}

/* ── Arranque ─────────────────────────────────────────────── */

async function abrir() {
  try {
    const d = await rpc('revendedores_zonas');
    ZONAS = d.zonas || [];
    REGLAS = d.reglas || {};
  } catch (e) {
    $r('#cuerpoZonas').innerHTML =
      `<tr><td colspan="7" class="rv-cargando">No pudimos traer el mapa de zonas. Probá recargando.</td></tr>`;
    return;
  }

  pintarCifras();
  pintarTabla();
  armarCalculadora();
  armarChips();
}

function pintarCifras() {
  const libres = ZONAS.filter(z => z.estado === 'libre').length;
  const casilleros = ZONAS.reduce((a, z) => a + z.casilleros_libres, 0);
  $r('#cifraComision').textContent = Math.round((REGLAS.tasa_alta || 0.3) * 100) + '%';
  $r('#cifraZonas').textContent = libres + ' de ' + ZONAS.length;
  $r('#cifraCasilleros').textContent = casilleros;
}

/* ── El mapa del partido ──────────────────────────────────── */

function pintarTabla() {
  $r('#cuerpoZonas').innerHTML = ZONAS.map(z => `
    <tr class="${z.estado === 'tomada' ? 'rv-tomada' : ''}">
      <td class="rv-loc">${escRv(z.localidad)}</td>
      <td><span class="rv-pill rv-pill-esc">${escRv(z.escalon)} · ${pesosRv(z.precio)}</span></td>
      <td class="rv-der dato">${z.casilleros_libres} de ${z.casilleros_totales}</td>
      <td class="rv-der dato">${z.profesionales}</td>
      <td class="rv-der dato">${z.pedidos}</td>
      <td class="rv-der dato">${pesosRv(z.comision_mes)}</td>
      <td>${z.estado === 'libre'
        ? '<span class="rv-pill rv-pill-libre">Libre</span>'
        : `<span class="rv-pill rv-pill-tomada">La abrió ${escRv(z.revendedor || 'alguien')}</span>`}</td>
    </tr>`).join('');
}

/* ── La cuenta con tu pueblo ──────────────────────────────── */

function armarCalculadora() {
  const sel = $r('#calcLocalidad');
  sel.innerHTML = ZONAS.map(z =>
    `<option value="${escRv(z.localidad)}"${z.estado === 'tomada' ? ' disabled' : ''}>${escRv(z.localidad)}${
      z.estado === 'tomada' ? ' — ya tomada' : ''}</option>`).join('');
  const primeraLibre = ZONAS.find(z => z.estado === 'libre');
  if (primeraLibre) sel.value = primeraLibre.localidad;

  const rango = $r('#calcCuantos');
  const ajustar = () => {
    const z = ZONAS.find(x => x.localidad === sel.value) || ZONAS[0];
    rango.max = Math.max(1, z.casilleros_libres);
    if (Number(rango.value) > Number(rango.max)) rango.value = rango.max;
    $r('#calcCuantosVal').textContent = rango.value;
    pintarCuenta(z, Number(rango.value));
  };
  sel.addEventListener('change', ajustar);
  rango.addEventListener('input', ajustar);
  ajustar();
}

function pintarCuenta(z, cuantos) {
  const alta = REGLAS.tasa_alta || 0.3;
  const recurrente = REGLAS.tasa_recurrente || 0.15;
  const facturado = z.precio * cuantos;
  const mes = Math.round(facturado * alta);

  $r('#calcSalida').innerHTML = `
    <div class="rv-calc-linea">
      <span>${cuantos} ${cuantos === 1 ? 'casillero' : 'casilleros'} en ${escRv(z.localidad)}
        (escalón ${escRv(z.escalon)}, ${pesosRv(z.precio)} cada uno)</span>
      <span class="dato">${pesosRv(facturado)} por mes</span>
    </div>
    <div class="rv-calc-linea">
      <span>Tu comisión, los primeros 12 meses de cada contrato (${Math.round(alta * 100)}%)</span>
      <span class="dato">${pesosRv(mes)}</span>
    </div>
    <div class="rv-calc-linea">
      <span>Del mes 13 en adelante, mientras el comercio siga pagando (${Math.round(recurrente * 100)}%)</span>
      <span class="dato">${pesosRv(Math.round(facturado * recurrente))} por mes</span>
    </div>
    <div class="rv-calc-linea rv-total">
      <span>El primer año, en total</span>
      <span class="dato">${pesosRv(mes * 12)}</span>
    </div>
    <p class="rv-calc-pie">
      Hoy en ${escRv(z.localidad)} hay ${z.profesionales} ${z.profesionales === 1 ? 'profesional' : 'profesionales'}
      en la app y ${z.casilleros_libres} ${z.casilleros_libres === 1 ? 'casillero libre' : 'casilleros libres'}.
      No cuenta los planes Pro que consigas: son ${pesosRv(REGLAS.precio_pro || 15000)} por mes cada uno,
      con ${Math.round((REGLAS.tasa_pro || 0.2) * 100)}% para vos durante un año.
    </p>`;
}

/* ── Postulación ──────────────────────────────────────────── */

function armarChips() {
  const tope = REGLAS.max_zonas || 2;
  $r('#chipsLocalidades').innerHTML = ZONAS.map(z => `
    <button type="button" class="rv-chip" data-loc="${escRv(z.localidad)}"
            aria-pressed="false"${z.estado === 'tomada' ? ' disabled title="Ya la tiene otro revendedor"' : ''}>
      ${escRv(z.localidad)}
    </button>`).join('');

  document.querySelectorAll('.rv-chip').forEach(b => {
    b.addEventListener('click', () => {
      const loc = b.dataset.loc;
      if (elegidas.has(loc)) { elegidas.delete(loc); b.setAttribute('aria-pressed', 'false'); return; }
      if (elegidas.size >= tope) {
        brindis(`Se pueden pedir hasta ${tope} localidades: se abren de a una.`, true);
        return;
      }
      elegidas.add(loc);
      b.setAttribute('aria-pressed', 'true');
    });
  });

  $r('#formPostular').addEventListener('submit', enviar);
}

async function enviar(ev) {
  ev.preventDefault();
  const f = ev.target;
  const nota = $r('#formNota');
  const btn = $r('#btnEnviar');
  const decir = (txt, mal) => {
    nota.textContent = txt;
    nota.classList.toggle('rv-mal', !!mal);
  };

  if (!elegidas.size) return decir('Elegí al menos una localidad de la lista de arriba.', true);

  btn.disabled = true;
  decir('Mandando…');
  try {
    const r = await rpc('revendedores_postular', {
      p_nombre: f.nombre.value.trim(),
      p_email: f.email.value.trim(),
      p_telefono: f.telefono.value.trim(),
      p_localidades: [...elegidas],
      p_vive_ahi: f.vive_ahi.checked,
      p_experiencia: f.experiencia.value.trim(),
      p_mensaje: f.mensaje.value.trim(),
      p_origen: 'landing'
    });
    f.outerHTML = `
      <div class="rv-gracias">
        <h3>Listo, ${escRv(f.nombre.value.trim().split(' ')[0])}</h3>
        <p>${escRv(r.mensaje || 'Recibimos tu postulación.')}</p>
        <p class="rv-nota">Anotaste ${escRv([...elegidas].join(' y '))}. Si mientras tanto
          alguien la toma, te lo decimos y vemos otra.</p>
      </div>`;
    brindis('Postulación enviada');
  } catch (e) {
    btn.disabled = false;
    decir(e.message || 'No se pudo enviar. Probá de nuevo en un minuto.', true);
  }
}

abrir();
