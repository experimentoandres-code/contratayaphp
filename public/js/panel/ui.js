/* ============================================================
   CONTRATÁ YA — Panel · UI compartida
   Lo que dibujan todas las secciones por igual: dar formato a
   fechas y números, escapar texto, el brindis de abajo a la
   derecha y la ficha lateral.
   Depende de nucleo.js (usa $a). No conoce ninguna sección.
   ============================================================ */

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

