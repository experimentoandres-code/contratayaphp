/* ============================================================
   CONTRATÁ YA — Buscar: filtros y formulario
   ------------------------------------------------------------
   Tres cosas que estaban duras:

   1. Para cambiar sólo la zona había que rehacer toda la
      búsqueda. Ahora hay dos pastillas arriba del mazo —oficio
      y zona— y cada una se cambia sola, en un toque.
   2. Cuando no había nada, la app decía "no hay" y ahí moría.
      Ahora muestra dónde SÍ hay, con el número al lado, y se
      salta con un toque.
   3. El formulario pedía cuatro cosas de una: rubro, localidad,
      urgencia y detalle, todo junto, con el botón apagado hasta
      completar. Ahora es una pregunta por pantalla.
   ============================================================ */
(function () {
  'use strict';

  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const nombreRubro = (id) => (RUBROS.find(r => r.id === id) || {}).nombre || id;
  const glifoRubro  = (id) => (RUBROS.find(r => r.id === id) || {}).glifo || '•';

  /* ── Pastillas de filtro arriba del mazo ─────────────────── */

  function conectarChips() {
    document.querySelectorAll('#filtrosMazo [data-filtro]').forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.filtro === 'rubro') elegirRubro();
        else if (b.dataset.filtro === 'zona') elegirZonaRapido();
        else elegirUrgencia();
      });
    });
  }

  function elegirRubro() {
    const panel = abrirHoja(`
      <h2>¿Qué oficio?</h2>
      <p class="sub-hoja">Tocá uno y se cambia la búsqueda.</p>
      <div class="fichas fichas-hoja">
        ${RUBROS.map(r => `
          <button class="ficha ${Estado.pedido.rubro === r.id ? 'elegida' : ''}" data-r="${esc(r.id)}">
            <span class="ficha-glifo">${r.glifo}</span>${esc(r.nombre)}
          </button>`).join('')}
      </div>`);
    panel.querySelectorAll('[data-r]').forEach(b => {
      b.addEventListener('click', () => {
        Estado.pedido.rubro = b.dataset.r;
        Estado.vistos = [];
        guardar();
        cerrarHoja();
        verMazo();
      });
    });
  }

  async function elegirZonaRapido() {
    const panel = abrirHoja(`<h2>¿En qué localidad?</h2><p class="sub-hoja">Buscando dónde hay gente…</p>`);
    let resumen = [];
    try { resumen = await Zonas.traerResumen(); } catch (e) { /* seguimos igual */ }
    const porNombre = {};
    resumen.forEach(z => { porNombre[z.localidad] = z; });

    panel.innerHTML = `
      <h2>¿En qué localidad?</h2>
      <p class="sub-hoja">El número es cuántos profesionales trabajan ahí.</p>
      <div class="zonas-rapidas">
        ${LOCALIDADES.map(l => {
          const z = porNombre[l] || { profesionales: 0 };
          return `
            <button class="zona-rapida ${Estado.zona === l ? 'elegida' : ''} ${z.profesionales ? '' : 'sin-gente'}" data-z="${esc(l)}">
              <span>${esc(l)}</span>
              <b>${z.profesionales || '—'}</b>
            </button>`;
        }).join('')}
      </div>
      <button class="btn btn-fantasma btn-bloque" id="verElMapa" style="margin-top:16px">Ver el mapa del partido</button>`;

    panel.querySelectorAll('[data-z]').forEach(b => {
      b.addEventListener('click', () => {
        Estado.zona = b.dataset.z;
        Estado.vistos = [];
        guardar();
        const z = document.getElementById('zonaActual');
        if (z) z.textContent = Estado.zona;
        cerrarHoja();
        verMazo();
      });
    });
    const mapa = panel.querySelector('#verElMapa');
    if (mapa) mapa.addEventListener('click', () => { cerrarHoja(); Zonas.vista(); });
  }

  function elegirUrgencia() {
    const opciones = [{ id: 'todos', nombre: 'Todos', detalle: 'Sin filtrar por apuro' }].concat(URGENCIAS);
    const panel = abrirHoja(`
      <h2>¿Qué trabajos querés ver?</h2>
      <div class="urgencias urgencias-hoja">
        ${opciones.map(u => `
          <button class="urgencia ${Estado.pedido.urgencia === u.id ? 'elegida' : ''}" data-u="${esc(u.id)}">
            <b>${esc(u.nombre)}</b><span>${esc(u.detalle || '')}</span>
          </button>`).join('')}
      </div>`);
    panel.querySelectorAll('[data-u]').forEach(b => {
      b.addEventListener('click', () => {
        Estado.pedido.urgencia = b.dataset.u;
        Estado.vistos = [];
        guardar();
        cerrarHoja();
        verMazo();
      });
    });
  }

  /* ── Cuando no hay nada: dónde sí hay ────────────────────── */

  const mazoVacioOriginal = window.mazoVacio;
  window.mazoVacio = function (cont, esPro) {
    mazoVacioOriginal.call(this, cont, esPro);
    if (!cont) return;

    (async () => {
      let resumen = [];
      try { resumen = await Zonas.traerResumen(true); } catch (e) { return; }
      if (!document.body.contains(cont)) return;

      // Dónde hay gente del oficio que se está buscando, sin contar la actual.
      const rubro = Estado.pedido.rubro;
      const conGente = resumen
        .map(z => ({
          loc: z.localidad,
          cuantos: (z.rubros || []).filter(r => !rubro || r.rubro === rubro)
                    .reduce((a, r) => a + r.cuantos, 0),
          pedidos: z.pedidos
        }))
        .filter(z => z.loc !== Estado.zona && (esPro ? z.pedidos > 0 : z.cuantos > 0))
        .sort((a, b) => (esPro ? b.pedidos - a.pedidos : b.cuantos - a.cuantos))
        .slice(0, 6);

      if (!conGente.length) return;

      const caja = document.createElement('div');
      caja.className = 'vacio-zonas';
      caja.innerHTML = `
        <p class="vacio-zonas-titulo">${esPro ? 'Dónde sí hay pedidos' : `Dónde sí hay ${esc(nombreRubro(rubro).toLowerCase())}`}</p>
        <div class="vacio-zonas-lista">
          ${conGente.map(z => `
            <button class="zona-rapida" data-saltar="${esc(z.loc)}">
              <span>${esc(z.loc)}</span>
              <b>${esPro ? z.pedidos : z.cuantos}</b>
            </button>`).join('')}
        </div>`;
      const dentro = cont.querySelector('.vacio-mazo') || cont;
      dentro.appendChild(caja);

      caja.querySelectorAll('[data-saltar]').forEach(b => {
        b.addEventListener('click', () => {
          Estado.zona = b.dataset.saltar;
          Estado.vistos = [];
          guardar();
          const z = document.getElementById('zonaActual');
          if (z) z.textContent = Estado.zona;
          verMazo();
        });
      });
    })();
  };

  /* ── El formulario, de a una pregunta ────────────────────── */

  const PASOS_PRO = ['rubro', 'zona', 'urgencia'];
  const PASOS_CLI = ['rubro', 'zona', 'urgencia', 'detalle'];

  function verFormularioPasos() {
    const esPro = Estado.rol === 'pro';
    const pasos = esPro ? PASOS_PRO : PASOS_CLI;
    let i = 0;

    // Si algo ya está elegido, se arranca en el primero que falte.
    const falta = (paso) => {
      if (paso === 'rubro') return !Estado.pedido.rubro;
      if (paso === 'zona') return !Estado.zona;
      if (paso === 'urgencia') return !Estado.pedido.urgencia;
      return false;
    };
    const primero = pasos.findIndex(falta);
    i = primero === -1 ? 0 : primero;

    pintar();

    function pintar() {
      const paso = pasos[i];
      const puntos = pasos.map((p, k) =>
        `<span class="paso-punto ${k === i ? 'activo' : ''} ${k < i ? 'hecho' : ''}"></span>`).join('');

      escena.innerHTML = `
        <div class="vista vista-pasos">
          <div class="pasos-cabeza">
            ${i > 0 ? '<button class="pasos-atras" id="pasoAtras" aria-label="Volver">←</button>' : '<span></span>'}
            <div class="pasos-puntos">${puntos}</div>
            <span class="pasos-cuenta">${i + 1} de ${pasos.length}</span>
          </div>
          <div id="pasoCuerpo"></div>
        </div>`;

      const cuerpo = document.getElementById('pasoCuerpo');
      if (paso === 'rubro') pasoRubro(cuerpo, esPro);
      else if (paso === 'zona') pasoZona(cuerpo, esPro);
      else if (paso === 'urgencia') pasoUrgencia(cuerpo, esPro);
      else pasoDetalle(cuerpo);

      const atras = document.getElementById('pasoAtras');
      if (atras) atras.addEventListener('click', () => { i--; pintar(); });
      window.scrollTo({ top: 0 });
    }

    function seguir() {
      if (i < pasos.length - 1) { i++; pintar(); }
      else { guardar(); verMazo(); }
    }

    function pasoRubro(cuerpo, esPro) {
      cuerpo.innerHTML = `
        <h1 class="titulo-paso">${esPro ? '¿Cuál es tu oficio?' : '¿Qué necesitás?'}</h1>
        <p class="sub-paso">${esPro
          ? 'Te muestro los pedidos abiertos de ese oficio.'
          : 'Elegí el oficio y te muestro quién trabaja cerca.'}</p>
        <div class="fichas fichas-grandes">
          ${RUBROS.map(r => `
            <button class="ficha ${Estado.pedido.rubro === r.id ? 'elegida' : ''}" data-r="${esc(r.id)}">
              <span class="ficha-glifo">${r.glifo}</span>${esc(r.nombre)}
            </button>`).join('')}
        </div>`;
      cuerpo.querySelectorAll('[data-r]').forEach(b => {
        b.addEventListener('click', () => {
          Estado.pedido.rubro = b.dataset.r;
          guardar();
          seguir();     // elegir ya avanza: un toque menos
        });
      });
    }

    function pasoZona(cuerpo, esPro) {
      cuerpo.innerHTML = `
        <h1 class="titulo-paso">${esPro ? '¿Dónde trabajás?' : '¿Dónde es el trabajo?'}</h1>
        <p class="sub-paso">Las catorce localidades del partido, de norte a sur.
          El número es cuántos ${esPro ? 'pedidos hay' : 'profesionales hay'}.</p>
        <div class="zonas-rapidas" id="zonasPaso">
          ${LOCALIDADES.map(l => `
            <button class="zona-rapida ${Estado.zona === l ? 'elegida' : ''}" data-z="${esc(l)}">
              <span>${esc(l)}</span><b class="zc-num">·</b>
            </button>`).join('')}
        </div>`;
      cuerpo.querySelectorAll('[data-z]').forEach(b => {
        b.addEventListener('click', () => {
          Estado.zona = b.dataset.z;
          const z = document.getElementById('zonaActual');
          if (z) z.textContent = Estado.zona;
          guardar();
          seguir();
        });
      });
      // Los números llegan después: la pantalla no espera por ellos.
      (async () => {
        try {
          const resumen = await Zonas.traerResumen();
          const por = {};
          resumen.forEach(z => { por[z.localidad] = z; });
          cuerpo.querySelectorAll('[data-z]').forEach(b => {
            const z = por[b.dataset.z] || {};
            const n = esPro ? (z.pedidos || 0) : (z.profesionales || 0);
            const b2 = b.querySelector('.zc-num');
            if (b2) b2.textContent = n || '—';
            if (!n) b.classList.add('sin-gente');
          });
        } catch (e) { /* sin números, igual se puede elegir */ }
      })();
    }

    function pasoUrgencia(cuerpo, esPro) {
      const opciones = esPro
        ? [{ id: 'todos', nombre: 'Todos los trabajos', detalle: 'Sin filtrar por apuro' }].concat(URGENCIAS)
        : URGENCIAS;
      cuerpo.innerHTML = `
        <h1 class="titulo-paso">${esPro ? '¿Qué trabajos querés ver?' : '¿Corre apuro?'}</h1>
        <p class="sub-paso">${esPro ? 'Podés cambiarlo cuando quieras.' : 'Sirve para que el profesional sepa con qué tiempo cuenta.'}</p>
        <div class="urgencias urgencias-grandes">
          ${opciones.map(u => `
            <button class="urgencia ${Estado.pedido.urgencia === u.id ? 'elegida' : ''}" data-u="${esc(u.id)}">
              <b>${esc(u.nombre)}</b><span>${esc(u.detalle || '')}</span>
            </button>`).join('')}
        </div>`;
      cuerpo.querySelectorAll('[data-u]').forEach(b => {
        b.addEventListener('click', () => {
          Estado.pedido.urgencia = b.dataset.u;
          guardar();
          seguir();
        });
      });
    }

    function pasoDetalle(cuerpo) {
      cuerpo.innerHTML = `
        <h1 class="titulo-paso">Contá qué pasa</h1>
        <p class="sub-paso">Con dos renglones alcanza. Cuanto más claro, mejor te responden.</p>
        <textarea class="area area-grande" id="detallePaso"
          placeholder="Ej: se filtra agua por el techo del baño desde la última tormenta">${esc(Estado.pedido.detalle || '')}</textarea>
        <button class="btn btn-plomo btn-bloque" id="pasoListo" style="margin-top:18px">Ver quién hay cerca</button>
        <button class="btn btn-fantasma btn-bloque btn-sm" id="pasoSaltear" style="margin-top:8px">Saltear por ahora</button>`;
      const guardarDetalle = () => {
        const t = document.getElementById('detallePaso');
        Estado.pedido.detalle = t ? t.value.trim() : '';
        guardar();
        verMazo();
      };
      cuerpo.querySelector('#pasoListo').addEventListener('click', guardarDetalle);
      cuerpo.querySelector('#pasoSaltear').addEventListener('click', () => { guardar(); verMazo(); });
    }
  }

  /* El fondo de la pantalla toma la foto de la tarjeta de arriba. Se hace con
     un observador y no dentro de pintarMazo porque el motor del mazo
     (app-mazo.js) reemplaza esa función: cualquier cosa que se escriba ahí no
     llega a correr nunca. */
  function fondoDeLaTarjeta() {
    const cont = document.getElementById('mazo');
    const vista = document.querySelector('.vista-mazo');
    if (!cont || !vista) return;
    const pintar = () => {
      const img = cont.querySelector('.carta-arriba .carta-foto img') ||
                  cont.querySelector('.carta .carta-foto img');
      const src = img && img.getAttribute('src');
      if (src) vista.style.setProperty('--foto', `url('${src}')`);
    };
    pintar();
    if (cont._observado) return;
    cont._observado = true;
    new MutationObserver(pintar).observe(cont, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'src'] });
  }

  const verMazoOriginal = window.verMazo;
  if (typeof verMazoOriginal === 'function') {
    window.verMazo = async function () {
      const r = await verMazoOriginal.apply(this, arguments);
      setTimeout(fondoDeLaTarjeta, 60);
      return r;
    };
  }

  window.verFormulario = verFormularioPasos;
  window.Buscar = { conectarChips, elegirRubro, elegirZonaRapido, elegirUrgencia };
})();
