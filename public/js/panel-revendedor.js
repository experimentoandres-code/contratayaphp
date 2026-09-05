/* ============================================================
   CONTRATÁ YA — Panel del revendedor
   ------------------------------------------------------------
   Entra con correo y contraseña (la misma sesión que el resto
   del sitio: /sb/auth/v1/token?grant_type=password) y pide todo
   de una sola vez a la función revendedor_panel.
   La API cruda no expone ni una tabla de revendedores: todo pasa
   por las funciones, que validan quién es cada uno.
   ============================================================ */

const $p = (s) => document.querySelector(s);
const LLAVE_SESION = 'cy-revendedor-sesion';

const escP = (t) => String(t ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const pesosP = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function nombreMes(periodo) {
  const [a, m] = String(periodo || '').split('-');
  const nombre = MESES[Number(m) - 1] || periodo;
  return nombre.charAt(0).toUpperCase() + nombre.slice(1) + ' ' + a;
}

function fecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function guardarSesion(t) { try { localStorage.setItem(LLAVE_SESION, t); } catch (e) { /* sin storage */ } }
function leerSesion() { try { return localStorage.getItem(LLAVE_SESION) || ''; } catch (e) { return ''; } }
function borrarSesion() { try { localStorage.removeItem(LLAVE_SESION); } catch (e) { /* nada */ } }

function brindis(txt) {
  const b = $p('#brindis');
  b.textContent = txt;
  b.hidden = false;
  clearTimeout(brindis._t);
  brindis._t = setTimeout(() => { b.hidden = true; }, 3500);
}

async function rpc(nombre, args) {
  const cabeceras = { 'Content-Type': 'application/json' };
  const t = leerSesion();
  if (t) cabeceras.Authorization = 'Bearer ' + t;
  const r = await fetch('/sb/rest/v1/rpc/' + nombre, {
    method: 'POST', headers: cabeceras, body: JSON.stringify(args || {})
  });
  const cuerpo = await r.json().catch(() => null);
  if (!r.ok) {
    const e = new Error((cuerpo && (cuerpo.message || cuerpo.hint)) || 'No se pudo conectar');
    e.estado = r.status;
    throw e;
  }
  return cuerpo;
}

/* ── Arranque ─────────────────────────────────────────────── */

async function abrir() {
  $p('#formEntrar').addEventListener('submit', entrar);
  $p('#btnSalir').addEventListener('click', salir);

  if (!leerSesion()) return mostrarPorton();
  try {
    await pintar();
  } catch (e) {
    borrarSesion();
    mostrarPorton(e.estado === 401 || e.estado === 403 ? e.message : null);
  }
}

function mostrarPorton(texto) {
  $p('#panel').hidden = true;
  $p('#porton').hidden = false;
  if (texto) {
    $p('#portonTexto').textContent = texto;
    $p('#portonTexto').classList.add('pr-mal');
  }
}

async function entrar(ev) {
  ev.preventDefault();
  const f = ev.target;
  const btn = $p('#btnEntrar');
  const texto = $p('#portonTexto');
  btn.disabled = true;
  texto.textContent = 'Entrando…';
  texto.classList.remove('pr-mal');

  try {
    const r = await fetch('/sb/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: f.email.value.trim(), password: f.clave.value })
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || !d.access_token) throw new Error('El correo o la contraseña no son los correctos.');
    guardarSesion(d.access_token);
    await pintar();
  } catch (e) {
    borrarSesion();
    btn.disabled = false;
    texto.textContent = e.message || 'No pudimos entrar. Probá de nuevo.';
    texto.classList.add('pr-mal');
  }
}

function salir() {
  borrarSesion();
  location.reload();
}

/* ── El panel ─────────────────────────────────────────────── */

async function pintar() {
  const d = await rpc('revendedor_panel');
  $p('#porton').hidden = true;
  $p('#panel').hidden = false;

  const r = d.revendedor;
  $p('#revNombre').textContent = r.nombre || 'Tu zona';
  $p('#revZonas').textContent = d.zonas.length
    ? 'Tu zona: ' + d.zonas.map(z => z.localidad).join(' y ')
    : 'Todavía no tenés una zona asignada.';

  $p('#rotuloMes').textContent = nombreMes(d.periodo);
  $p('#montoMes').textContent = pesosP(d.totales.mes);
  $p('#montoPorCobrar').textContent = pesosP(d.totales.por_cobrar);
  $p('#montoCobrado').textContent = pesosP(d.totales.cobrado);
  $p('#montoCartera').textContent = pesosP(d.totales.cartera);
  $p('#pieCartera').textContent =
    `${d.totales.casilleros} ${d.totales.casilleros === 1 ? 'casillero' : 'casilleros'} y ` +
    `${d.totales.pros} ${d.totales.pros === 1 ? 'plan Pro' : 'planes Pro'} facturan esto por mes`;

  pintarAvisos(d.avisos);
  pintarZonas(d.zonas);
  pintarVentas(d.ventas);
  pintarMeses(d.meses);
  pintarDetalle(d.detalle, d.periodo);
}

function pintarAvisos(avisos) {
  $p('#avisos').innerHTML = (avisos || []).map(a =>
    `<div class="pr-aviso pr-aviso-${escP(a.tono)}">${escP(a.texto)}</div>`).join('');
}

function pintarZonas(zonas) {
  if (!zonas.length) {
    $p('#zonas').innerHTML = `<div class="pr-vacio">
      Todavía no tenés zona. Escribinos y te la asignamos.</div>`;
    return;
  }
  $p('#zonas').innerHTML = zonas.map(z => {
    const semaforo = z.alerta === 'vencida' ? 'pr-pill-gris'
      : z.alerta === 'en_riesgo' ? 'pr-pill-ambar' : 'pr-pill-verde';
    const textoAlerta = z.alerta === 'vencida' ? 'Sin ventas hace ' + z.dias_sin_vender + ' días'
      : z.alerta === 'en_riesgo' ? 'Quedan ' + z.dias_restantes + ' días' : 'Al día';
    return `
    <article class="pr-zona">
      <div class="pr-zona-cabeza">
        <h3>${escP(z.localidad)}</h3>
        <span class="pr-pill ${semaforo}">${escP(textoAlerta)}</span>
      </div>
      <div class="pr-zona-datos">
        <span>Escalón <b>${escP(z.escalon)}</b> · <b>${pesosP(z.precio)}</b> el casillero</span>
        <span><b>${z.profesionales}</b> profesionales</span>
        <span><b>${z.pedidos_abiertos}</b> pedidos abiertos</span>
        <span>Desde <b>${fecha(z.asignada_en)}</b></span>
      </div>
      <div class="pr-casilleros">
        ${z.casilleros.map(c => `
          <div class="pr-casillero ${c.libre ? 'pr-casillero-libre' : 'pr-casillero-tomado'}">
            <span>${escP(c.nombre)}</span>
            <span class="pr-estado">${c.libre ? 'LIBRE · ' + pesosP(z.precio) : escP(c.comercio || 'tomado')}</span>
          </div>`).join('')}
      </div>
      ${z.casilleros_libres ? `<p class="pr-zona-pie">
        Si vendés los ${z.casilleros_libres} que quedan libres, son <b>${pesosP(z.comision_mes)}</b>
        por mes para vos.</p>` : `<p class="pr-zona-pie">Vendiste todos los casilleros de la zona.
        Ahora la plata está en los planes Pro y en las renovaciones.</p>`}
    </article>`;
  }).join('');
}

function pintarVentas(ventas) {
  if (!ventas.length) {
    $p('#ventas').innerHTML = `<div class="pr-vacio">
      Todavía no hay ninguna venta anotada a tu nombre. En cuanto entre la primera, aparece acá.</div>`;
    return;
  }
  $p('#ventas').innerHTML = ventas.map(v => `
    <div class="pr-venta ${v.estado === 'activa' ? '' : 'pr-venta-baja'}">
      <div>
        <div class="pr-venta-nombre">${escP(v.titulo)}</div>
        <div class="pr-venta-sub">
          ${v.tipo === 'casillero' ? 'Casillero de publicidad' : 'Plan Pro'} ·
          ${escP(v.localidad)} · desde ${fecha(v.desde)} ·
          ${v.estado === 'activa'
            ? 'mes ' + v.mes_numero + (v.tasa ? ' · ' + Math.round(v.tasa * 100) + '% para vos' : ' · sin comisión')
            : 'dado de baja'}
        </div>
      </div>
      <div class="pr-venta-plata">
        <span class="dato">${pesosP(v.comision_mes)}</span>
        <span>por mes · factura ${pesosP(v.monto_mensual)}</span>
      </div>
    </div>`).join('');
}

function pintarMeses(meses) {
  if (!meses.length) {
    $p('#cuerpoMeses').innerHTML =
      `<tr><td colspan="5" style="color:var(--cal-3)">Todavía no hay meses cerrados.</td></tr>`;
    return;
  }
  $p('#cuerpoMeses').innerHTML = meses.map(m => {
    const estado = m.por_cobrar === 0
      ? '<span class="pr-pill pr-pill-verde">Cobrado</span>'
      : m.cobrado > 0
        ? '<span class="pr-pill pr-pill-ambar">A medias</span>'
        : '<span class="pr-pill pr-pill-ambar">A cobrar</span>';
    return `<tr>
      <td>${escP(nombreMes(m.periodo))}</td>
      <td class="pr-der dato">${pesosP(m.facturado)}</td>
      <td class="pr-der dato">${pesosP(m.comision)}</td>
      <td class="pr-der dato">${pesosP(m.cobrado)}</td>
      <td>${estado}</td>
    </tr>`;
  }).join('');
}

function pintarDetalle(detalle, periodo) {
  $p('#detalleTitulo').textContent = 'El detalle de ' + nombreMes(periodo).toLowerCase();
  if (!detalle.length) {
    $p('#detalle').innerHTML = `<div class="pr-vacio">Este mes todavía no devengó nada.</div>`;
    return;
  }
  const NOMBRE = { prevista: 'Previsto', confirmada: 'Confirmado', pagada: 'Pagado', anulada: 'Anulado' };
  $p('#detalle').innerHTML = `
    <div class="pr-tabla-envase">
      <table class="pr-tabla">
        <thead><tr>
          <th>De dónde</th><th class="pr-der">Facturó</th><th class="pr-der">Tu %</th>
          <th class="pr-der">Te toca</th><th>Estado</th>
        </tr></thead>
        <tbody>
          ${detalle.map(d => `<tr>
            <td><b style="color:var(--cal)">${escP(d.titulo)}</b><br>
              <span style="font-size:12.5px;color:var(--cal-3)">
                ${d.tipo === 'casillero' ? 'Casillero' : 'Plan Pro'} · ${escP(d.localidad)} ·
                mes ${d.mes_numero}</span></td>
            <td class="pr-der dato">${pesosP(d.base)}</td>
            <td class="pr-der dato">${Math.round(d.tasa * 100)}%</td>
            <td class="pr-der dato">${pesosP(d.monto)}</td>
            <td><span class="pr-pill ${d.estado === 'pagada' ? 'pr-pill-verde'
              : d.estado === 'anulada' ? 'pr-pill-gris' : 'pr-pill-ambar'}">
              ${escP(NOMBRE[d.estado] || d.estado)}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

abrir();
