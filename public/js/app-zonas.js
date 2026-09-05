/* ============================================================
   CONTRATÁ YA — Zonas
   ------------------------------------------------------------
   Antes, para buscar había que llenar un formulario: elegir
   localidad de una lista de catorce, después oficio, después
   urgencia. Tres pasos antes de ver una sola cara.

   Ahora se entra por el mapa. Se ve el partido, se toca un
   pueblo y adentro están los oficios agrupados con su gente.
   De ahí a los resultados hay un toque más.

   El mapa está dibujado a mano en SVG a propósito: la app no
   puede cargar mosaicos de ningún servicio externo (la política
   de seguridad del sitio lo prohíbe) y, para catorce pueblos en
   una línea de costa, un mapa de verdad no agrega nada.
   ============================================================ */
(function () {
  'use strict';

  /* Las 14 localidades de norte a sur, con su lugar en la costa.
     x/y sobre un lienzo de 300×620. La costa baja hacia el sudeste. */
  const COSTA = [
    ['San Clemente del Tuyú', 104,  34],
    ['Las Toninas',           116,  78],
    ['Costa Chica',           124, 112],
    ['Santa Teresita',        133, 148],
    ['Mar del Tuyú',          142, 184],
    ['Costa del Este',        156, 232],
    ['Aguas Verdes',          166, 268],
    ['La Lucila del Mar',     175, 302],
    ['Costa Azul',            184, 336],
    ['San Bernardo',          195, 376],
    ['Mar de Ajó',            210, 424],
    ['Nueva Atlantis',        221, 462],
    ['Punta Médanos',         233, 506],
    ['Costa Esmeralda',       248, 556]
  ];

  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const nombreRubro = (id) => {
    const r = (typeof RUBROS !== 'undefined' ? RUBROS : []).find(x => x.id === id);
    return r ? r.nombre : id;
  };
  const glifoRubro = (id) => {
    const r = (typeof RUBROS !== 'undefined' ? RUBROS : []).find(x => x.id === id);
    return r && r.glifo ? r.glifo : '•';
  };

  let resumen = null;     // lo que devuelve zonas_resumen, cacheado por sesión

  async function traerResumen(forzar) {
    if (resumen && !forzar) return resumen;
    const { data, error } = await sb.rpc('zonas_resumen');
    if (error) throw new Error(error.message);
    resumen = data || [];
    return resumen;
  }

  const datosDe = (loc) => (resumen || []).find(z => z.localidad === loc) || null;

  /* ── El mapa ──────────────────────────────────────────────
     Cada pueblo es un punto, y el punto crece con la cantidad de
     profesionales que hay adentro. De un vistazo se ve dónde hay
     gente y dónde no. */
  function mapa(elegida) {
    const puntos = COSTA.map(([loc, x, y]) => {
      const d = datosDe(loc);
      const cuantos = d ? d.profesionales : 0;
      const r = 5 + Math.min(9, cuantos * 1.6);
      const activa = loc === elegida;
      return `
        <g class="mapa-punto${activa ? ' activa' : ''}${cuantos ? '' : ' vacia'}"
           data-zona="${esc(loc)}" tabindex="0" role="button"
           aria-label="${esc(loc)}, ${cuantos} profesionales">
          <circle cx="${x}" cy="${y}" r="${r + 9}" class="mapa-halo"/>
          <circle cx="${x}" cy="${y}" r="${r}" class="mapa-bolita"/>
          <text x="${x - r - 10}" y="${y + 4}" text-anchor="end" class="mapa-nombre">${esc(loc)}</text>
          ${cuantos ? `<text x="${x + r + 8}" y="${y + 4}" class="mapa-cuantos">${cuantos}</text>` : ''}
        </g>`;
    }).join('');

    return `
      <svg class="mapa" viewBox="0 0 300 620" role="group" aria-label="Mapa del Partido de la Costa">
        <defs>
          <linearGradient id="mar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#2FB2A6" stop-opacity=".16"/>
            <stop offset="1" stop-color="#2FB2A6" stop-opacity=".03"/>
          </linearGradient>
        </defs>
        <path d="M104,20 C150,120 180,300 262,600 L300,620 L300,0 Z" fill="url(#mar)"/>
        <path d="M104,20 C150,120 180,300 262,600" fill="none" stroke="#2FB2A6"
              stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="3 5"/>
        <text x="286" y="300" class="mapa-mar" transform="rotate(90 286 300)">MAR ARGENTINO</text>
        ${puntos}
      </svg>`;
  }

  function tarjetaZona(z) {
    const chips = (z.rubros || []).slice(0, 3).map(r =>
      `<span class="zc-chip">${glifoRubro(r.rubro)} ${esc(nombreRubro(r.rubro))}</span>`).join('');
    return `
      <button class="zona-carta${z.profesionales ? '' : ' sin-gente'}" data-zona="${esc(z.localidad)}">
        <span class="zc-nombre">${esc(z.localidad)}</span>
        <span class="zc-datos">
          <b>${z.profesionales}</b> ${z.profesionales === 1 ? 'profesional' : 'profesionales'}
          ${z.oficios ? ` · ${z.oficios} ${z.oficios === 1 ? 'oficio' : 'oficios'}` : ''}
          ${z.pedidos ? ` · <i>${z.pedidos} ${z.pedidos === 1 ? 'pedido' : 'pedidos'}</i>` : ''}
        </span>
        <span class="zc-chips">${chips || '<span class="zc-chip vacio">Todavía no hay nadie</span>'}</span>
      </button>`;
  }

  /* ── El mazo de zonas ─────────────────────────────────── */
  async function vista() {
    const escena = document.getElementById('escena');
    if (!escena) return;
    escena.innerHTML = `<div class="zonas-cargando"><div class="esqueleto-mapa"></div></div>`;
    let lista;
    try {
      lista = await traerResumen();
    } catch (e) {
      escena.innerHTML = `<div class="vacio-caja"><h2>No se pudieron traer las zonas</h2>
        <p>${esc(e.message)}</p></div>`;
      return;
    }
    const ordenCosta = COSTA.map(c => c[0]);
    const enOrden = ordenCosta.map(l => datosDe(l) || { localidad: l, profesionales: 0, oficios: 0, pedidos: 0, rubros: [] });
    const conGente = enOrden.filter(z => z.profesionales > 0).length;

    escena.innerHTML = `
      <section class="zonas">
        <header class="zonas-cabeza">
          <h2>El partido, de norte a sur</h2>
          <p>Tocá un pueblo y vas a ver los oficios que hay adentro, con su gente.
             Hoy hay profesionales en <b>${conGente}</b> de las ${enOrden.length} localidades.</p>
        </header>
        <div class="zonas-cuerpo">
          <div class="zonas-mapa">${mapa(Estado.zona)}</div>
          <div class="zonas-mazo">${enOrden.map(tarjetaZona).join('')}</div>
        </div>
      </section>`;

    const abrir = (loc) => ficha(loc);
    escena.querySelectorAll('[data-zona]').forEach(el => {
      el.addEventListener('click', () => abrir(el.dataset.zona));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(el.dataset.zona); }
      });
    });
  }

  /* ── La ficha de una localidad ────────────────────────── */
  async function ficha(loc) {
    const panel = abrirHoja(`<div class="zf-cargando">Buscando lo que hay en ${esc(loc)}…</div>`);
    let d;
    try {
      const { data, error } = await sb.rpc('zona_ficha', { p_localidad: loc });
      if (error) throw new Error(error.message);
      d = data;
    } catch (e) {
      panel.innerHTML = `<h2>${esc(loc)}</h2><p>No se pudo traer la ficha: ${esc(e.message)}</p>`;
      return;
    }

    const oficios = (d.oficios || []).map(o => `
      <details class="zf-oficio">
        <summary>
          <span class="zf-glifo">${glifoRubro(o.rubro)}</span>
          <span class="zf-nombre">${esc(nombreRubro(o.rubro))}</span>
          <span class="zf-cuenta">${o.cuantos}</span>
          ${o.puntaje != null ? `<span class="zf-estrella">${String(o.puntaje).replace('.', ',')} ★</span>` : ''}
        </summary>
        <div class="zf-gente">
          ${o.profesionales.map(p => `
            <div class="zf-persona">
              <span class="zf-foto">${p.foto_url
                ? `<img src="${esc(p.foto_url)}" alt="" loading="lazy">`
                : esc((p.nombre || '?').slice(0, 1))}</span>
              <span class="zf-quien">
                <b>${esc(p.nombre)}</b>
                <small>${p.localidad ? esc(p.localidad) : ''}${p.trabajos ? ` · ${p.trabajos} trabajos` : ''}${
                  p.plan === 'pro' ? ' · <i class="zf-pro">Pro</i>' : ''}</small>
              </span>
              ${p.puntaje_pro != null ? `<span class="zf-punt">${String(p.puntaje_pro).replace('.', ',')} ★</span>` : ''}
            </div>`).join('')}
        </div>
        <button class="zf-buscar" data-rubro="${esc(o.rubro)}">
          Ver ${esc(nombreRubro(o.rubro).toLowerCase())} en ${esc(loc)}
        </button>
      </details>`).join('');

    const comercios = (d.comercios || []).map(c => `
      <div class="zf-comercio">
        <span class="zf-comercio-punto" style="background:${esc(c.color || '#F0A63A')}"></span>
        <span><b>${esc(c.nombre)}</b><small>${esc(c.beneficio || 'Comercio auspiciante')}</small></span>
      </div>`).join('');

    panel.innerHTML = `
      <div class="zf">
        <header class="zf-cabeza">
          <h2>${esc(d.localidad)}</h2>
          <div class="zf-cifras">
            <span><b>${d.profesionales}</b> profesionales</span>
            <span><b>${(d.oficios || []).length}</b> oficios</span>
            ${d.pedidos ? `<span><b>${d.pedidos}</b> pedidos abiertos</span>` : ''}
            ${d.trabajos ? `<span><b>${d.trabajos}</b> trabajos hechos</span>` : ''}
          </div>
        </header>

        ${d.profesionales
          ? `<p class="zf-ayuda">Tocá un oficio para ver quiénes son.</p><div class="zf-oficios">${oficios}</div>`
          : `<div class="zf-vacio">
               <b>Todavía no hay nadie anotado acá</b>
               <p>Si sos de un oficio y trabajás en ${esc(d.localidad)}, sos el primero.</p>
             </div>`}

        ${comercios ? `<h3 class="zf-titulo">Beneficios en ${esc(d.localidad)}</h3>${comercios}` : ''}

        <div class="zf-acciones">
          <button class="btn btn-plomo btn-bloque" id="zfElegir">Buscar en ${esc(d.localidad)}</button>
        </div>
      </div>`;

    // De la ficha a los resultados: un toque.
    panel.querySelectorAll('.zf-buscar').forEach(b => {
      b.addEventListener('click', () => {
        Estado.zona = d.localidad;
        Estado.pedido.rubro = b.dataset.rubro;
        if (!Estado.pedido.urgencia) Estado.pedido.urgencia = 'todos';
        Estado.vistos = [];
        guardar();
        const z = document.getElementById('zonaActual');
        if (z) z.textContent = Estado.zona;
        cerrarHoja();
        irA('buscar');
      });
    });

    const elegir = panel.querySelector('#zfElegir');
    if (elegir) elegir.addEventListener('click', () => {
      Estado.zona = d.localidad;
      Estado.vistos = [];
      guardar();
      const z = document.getElementById('zonaActual');
      if (z) z.textContent = Estado.zona;
      cerrarHoja();
      irA('buscar');
    });
  }

  window.Zonas = { vista, ficha, traerResumen };

  /* El primer paso de la búsqueda deja de ser un formulario: si todavía no
     elegiste zona, entrás por el mapa. El resto de Buscar queda igual. */
  const verBuscarOriginal = window.verBuscar;
  if (typeof verBuscarOriginal === 'function') {
    window.verBuscar = function () {
      const soyPro = Estado.rol === 'pro';
      // Al profesional se le precarga su zona desde el perfil; al cliente,
      // que puede estar buscando en cualquier pueblo, se le muestra el mapa.
      if (!Estado.zona && !(soyPro && Estado.yo && (Estado.yo.localidad || (Estado.yo.zonas || [])[0]))) {
        return vista();
      }
      return verBuscarOriginal.apply(this, arguments);
    };
  }

  /* El botón de la barra ya no abre una lista de catorce nombres:
     abre el mapa. Y la búsqueda sin zona elegida también. */
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnZona');
    if (btn) {
      const nuevo = btn.cloneNode(true);   // se va el manejador viejo
      btn.parentNode.replaceChild(nuevo, btn);
      nuevo.addEventListener('click', () => vista());
    }
  });
})();
