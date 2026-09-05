/* ============================================================
   CONTRATÁ YA — Formatos de publicidad
   ------------------------------------------------------------
   Los avisos que NO son el interstitial, la franja ni el proveedor
   sugerido. Esas tres siguen igual y no se tocan desde acá: lo único
   que este archivo les agrega es la medición.

   Formatos:
     mazo    · tarjeta patrocinada sobre el mazo, cada tantos deslizamientos
     cierre  · aviso justo después de cerrar un trabajo (máxima intención)
     rubro   · una marca nacional auspicia un oficio en todo el partido
     cupon   · cupón de marca, único por persona y con vencimiento
     vacio   · el mazo sin resultados, que hoy es pantalla desperdiciada

   No toca app.js ni app-mazo.js. Expone window.Avisos y devuelve nodos
   del DOM listos para insertar; las llamadas se enganchan desde app.js
   con las líneas que están escritas en
   planificacion/marketing/13-formatos-publicidad.md

   Reglas que cumple TODO aviso de acá:
     · dice que es publicidad, siempre y a la vista;
     · se apunta por rol, por localidad y por oficio;
     · tiene tope por día y por persona (lo hace cumplir el servidor);
     · se mide: impresión cuando se ve de verdad, toque cuando se toca.
   ============================================================ */

(function () {
  'use strict';

  /* ── Ajustes ───────────────────────────────────────────── */

  const CADA_DESLIZAMIENTOS = 4;    // cada cuántos deslizamientos sale la tarjeta del mazo
  const CACHE_MS            = 60000;// cuánto vale lo que ya trajimos
  const CLAVE_DESLIZ        = 'cy-avisos-desliz';
  const CLAVE_TURNO         = 'cy-avisos-turno-';   // + superficie

  /* El interstitial vive en 90 y la hoja en 60. Estos avisos van en el
     medio: tapan la pantalla de abajo pero nunca al interstitial, así el
     invariante de los 2 segundos sigue mandando. */
  const CAPA = 70;

  const esc = (t) => String(t == null ? '' : t)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;',
                                 '"': '&quot;', "'": '&#39;' }[c]));

  const leer = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };

  const hayCliente = () => typeof sb !== 'undefined' && sb && typeof sb.rpc === 'function';


  /* ── Qué sabe la app en este momento ──────────────────────
     Se lee de Estado, que es de app.js. Si algo no está, se sigue
     igual: un aviso sin localidad simplemente no matchea los que
     pidieron localidad. */
  function contexto(extra) {
    const E = (typeof Estado !== 'undefined' && Estado) ? Estado : {};
    const yo = E.yo || {};
    const rol = E.rol === 'pro' ? 'pro' : 'cliente';
    const base = {
      rol,
      localidad: E.zona || yo.localidad || '',
      // Para el profesional el oficio es el suyo; para el vecino, el que está buscando.
      oficio: rol === 'pro' ? (yo.rubro || '') : ((E.pedido && E.pedido.rubro) || '')
    };
    return Object.assign(base, extra || {});
  }


  /* ── Traer ────────────────────────────────────────────────
     Le pide al servidor los creativos elegibles de una superficie.
     El servidor ya filtró por rol, localidad, oficio, vigencia y topes:
     acá no se decide nada de eso, para que no haya dos verdades. */

  const cache = new Map();

  async function traer(ctx) {
    ctx = contexto(ctx);
    const superficie = ctx.superficie || ctx.formato;
    if (!superficie || !hayCliente()) return [];

    const llave = [superficie, ctx.rol, ctx.localidad, ctx.oficio].join('|');
    const guardado = cache.get(llave);
    if (guardado && Date.now() - guardado.cuando < CACHE_MS) return guardado.lista;

    try {
      const { data, error } = await sb.rpc('avisos_para', {
        p_superficie: superficie,
        p_localidad:  ctx.localidad || '',
        p_oficio:     ctx.oficio || '',
        p_rol:        ctx.rol
      });
      if (error) { console.warn('[avisos]', error.message); return []; }
      const lista = data || [];
      cache.set(llave, { cuando: Date.now(), lista });
      return lista;
    } catch (e) {
      console.warn('[avisos]', e);
      return [];
    }
  }

  /* La rueda, igual que la del interstitial: cada vez sale el siguiente,
     así no se gastan todas las impresiones en el mismo afiche. */
  function siguiente(lista, superficie) {
    if (!lista || !lista.length) return null;
    const k = CLAVE_TURNO + superficie;
    const n = Number(leer(k, 0)) || 0;
    escribir(k, n + 1);
    return lista[n % lista.length];
  }

  /* Traer + elegir uno, que es lo que quieren todos los atajos. */
  async function uno(superficie, extra) {
    const lista = await traer(Object.assign({ superficie }, extra || {}));
    return siguiente(lista, superficie);
  }


  /* ── Medición ─────────────────────────────────────────────
     Impresiones y toques. Falla en silencio a propósito: que no se
     pueda anotar una impresión nunca puede romper la pantalla. */

  const vistasAnotadas = new Set();   // una impresión por aviso y por pantalla

  function registrarVista(id, superficie) {
    if (!id || !hayCliente()) return;
    const llave = id + '|' + (superficie || '');
    if (vistasAnotadas.has(llave)) return;
    vistasAnotadas.add(llave);
    anotar('registrar_vista', id, superficie);
  }

  function registrarToque(id, superficie) {
    anotar('registrar_toque', id, superficie);
  }

  function anotar(fn, id, superficie) {
    if (!id || !hayCliente()) return;
    const ctx = contexto();
    try {
      sb.rpc(fn, {
        p_aviso: id,
        p_superficie: superficie || 'mazo',
        p_localidad: ctx.localidad || '',
        p_rol: ctx.rol
      }).then(({ error }) => { if (error) console.warn('[avisos]', error.message); })
        .catch(() => {});
    } catch (e) {}
  }

  /* Se cuenta la impresión cuando el aviso se vio de verdad, no cuando se
     insertó: un aviso abajo de todo, en una pantalla que nadie bajó, no es
     una impresión y cobrarla sería mentirle al anunciante. */
  function medirCuandoSeVea(el, aviso) {
    if (!el || !aviso) return;
    const marcar = () => registrarVista(aviso.id, aviso.superficie || aviso.formato);
    if (typeof IntersectionObserver !== 'function') { marcar(); return; }
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > 0.5) { marcar(); obs.disconnect(); }
      });
    }, { threshold: [0.5] });
    obs.observe(el);
  }

  /* Medición de las tres superficies viejas. La franja y el proveedor
     sugerido se miden con el id del comercio, que es lo único que app.js
     tiene a mano en ese punto. */
  function medirFranja(comercio, rotulo) {
    if (!comercio) return;
    const sup = rotulo === 'Materiales' ? 'sugerido' : 'franja';
    registrarVista(comercio.anunciante_id, sup);
  }


  /* ── Adónde lleva el botón ───────────────────────────────
     Los mismos destinos que ya entiende el interstitial. Todo con
     guardas: si mañana una función cambia de nombre, el aviso se
     cierra y no rompe nada. */
  function accion(enlace) {
    const ir = (v) => { if (typeof irA === 'function') irA(v); };
    if (!enlace) return () => {};
    if (enlace === 'avisos')  return () => { if (typeof activarAvisos === 'function') activarAvisos(); };
    if (enlace === 'planes')  return () => { ir('perfil'); if (typeof verPlanes === 'function') verPlanes(); };
    if (['buscar', 'beneficios', 'matches', 'perfil', 'jugar'].includes(enlace)) return () => ir(enlace);
    return () => { location.href = enlace; };
  }


  /* ── El nodo ──────────────────────────────────────────────
     Devuelve un elemento listo para insertar. El sello de publicidad
     no es opcional ni configurable: va siempre, arriba y legible. */

  function sello(a) {
    return a.es_pago
      ? 'Publicidad · ' + (a.patrocinador || '')
      : 'De Contratá Ya';
  }

  function nodo(a, opciones) {
    if (!a) return null;
    const o = opciones || {};
    const formato = a.formato || a.superficie || 'mazo';
    const el = document.createElement('article');
    el.className = 'av av-' + formato + (o.clase ? ' ' + o.clase : '');
    el.dataset.aviso = a.id || '';
    el.setAttribute('role', 'complementary');
    el.setAttribute('aria-label', 'Publicidad');
    if (a.fondo)       el.style.setProperty('--av-fondo', a.fondo);
    if (a.tinta)       el.style.setProperty('--av-tinta', a.tinta);
    if (a.boton_fondo) el.style.setProperty('--av-boton', a.boton_fondo);
    if (a.boton_tinta) el.style.setProperty('--av-boton-tinta', a.boton_tinta);
    if (a.imagen_url)  el.classList.add('av-con-foto');

    const marca = a.patrocinador_logo
      ? `<img class="av-logo" src="${esc(a.patrocinador_logo)}" alt="">`
      : (a.es_pago
          ? `<span class="av-logo av-logo-letra" style="background:${esc(a.patrocinador_color || '#F0A63A')}">${esc((a.patrocinador || '?').charAt(0))}</span>`
          : '');

    el.innerHTML = `
      ${a.imagen_url ? `<img class="av-foto" src="${esc(a.imagen_url)}" alt="">` : ''}
      ${o.cerrable === false ? '' : '<button class="av-cerrar" type="button" aria-label="Cerrar el aviso">✕</button>'}
      <div class="av-cuerpo">
        <div class="av-firma">
          ${marca}
          <span class="av-sello">${esc(sello(a))}</span>
        </div>
        ${a.rotulo ? `<span class="av-rotulo">${esc(a.rotulo)}</span>` : ''}
        <h3 class="av-titulo">${esc(a.titulo || '')}</h3>
        ${a.cuerpo ? `<p class="av-texto">${esc(a.cuerpo)}</p>` : ''}
        ${a.boton ? `<button class="av-boton" type="button">${esc(a.boton)}</button>` : ''}
        ${a.letra_chica ? `<p class="av-chica">${esc(a.letra_chica)}</p>` : ''}
      </div>`;

    const cerrar = () => { el.remove(); if (typeof o.alCerrar === 'function') o.alCerrar(); };
    const btnCerrar = el.querySelector('.av-cerrar');
    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);

    const btn = el.querySelector('.av-boton');
    if (btn) {
      btn.addEventListener('click', () => {
        registrarToque(a.id, formato);
        if (typeof o.alTocar === 'function') { o.alTocar(a, cerrar); return; }
        cerrar();
        accion(a.enlace)();
      });
    }

    medirCuandoSeVea(el, a);
    return el;
  }


  /* ══════════════════════════════════════════════════════════
     LOS FORMATOS — un atajo por cada uno, para que engancharlos
     desde app.js sea una línea y nada más.
     ══════════════════════════════════════════════════════════ */

  /* ── 1. Tarjeta patrocinada en el mazo ───────────────────
     Sale cada CADA_DESLIZAMIENTOS tarjetas, con la geometría de una
     carta del mazo y el sello de publicidad arriba. No entra en la
     pila de deslizamiento: no se arrastra, se lee y se cierra. Así no
     hay forma de "deslizar sin querer" un aviso, que sería cobrarle al
     anunciante un toque que nadie quiso dar. */
  async function mazo(forzar) {
    const cont = document.getElementById('mazo');
    if (!cont) return false;
    if (document.querySelector('.av-mazo')) return false;
    if (document.getElementById('interCerrar')) return false;   // el interstitial manda

    if (!forzar) {
      const n = (Number(leer(CLAVE_DESLIZ, 0)) || 0) + 1;
      escribir(CLAVE_DESLIZ, n);
      if (n % CADA_DESLIZAMIENTOS !== 0) return false;
    }

    const a = await uno('mazo');
    if (!a) return false;
    if (!document.getElementById('mazo')) return false;          // se fue a otra pantalla

    const el = nodo(a, { clase: 'av-flotante' });
    el.style.zIndex = String(CAPA);
    document.body.appendChild(el);
    calzar(el, cont);
    return true;
  }

  /* La tarjeta se apoya exactamente sobre el hueco del mazo: así se lee
     como una carta más y no como un cartel pegado encima.
     Si el hueco todavía no tiene medidas —la pantalla se está armando—
     se la deja centrada y listo: un aviso corrido de lugar es feo, uno
     que desaparece es una impresión que el anunciante pagó y no salió. */
  function calzar(el, referencia) {
    el.style.position = 'fixed';
    const poner = () => {
      if (!el.isConnected) {
        window.removeEventListener('resize', poner);
        window.removeEventListener('scroll', poner);
        return;
      }
      const r = referencia.getBoundingClientRect();
      if (!r.width || !r.height) {
        el.style.left = '50%';
        el.style.top = '50%';
        el.style.width = 'min(420px, calc(100vw - 32px))';
        el.style.height = 'auto';
        el.style.transform = 'translate(-50%, -50%)';
        return;
      }
      el.style.transform = '';
      el.style.left = r.left + 'px';
      el.style.top = r.top + 'px';
      el.style.width = r.width + 'px';
      el.style.height = r.height + 'px';
    };
    poner();
    window.addEventListener('resize', poner);
    window.addEventListener('scroll', poner, { passive: true });
  }

  /* ── 2. Aviso al cerrar un trabajo ───────────────────────
     El momento de mayor intención que tiene la app: el trabajo terminó,
     el profesional ya sabe qué le falta para el próximo y el vecino
     acaba de comprobar que esto funciona. */
  async function cierre() {
    if (document.querySelector('.av-cierre')) return false;
    const a = await uno('cierre');
    if (!a) return false;
    const el = nodo(a, { clase: 'av-abajo' });
    el.style.zIndex = String(CAPA);
    document.body.appendChild(el);
    // Si nadie lo toca, se va solo: no es un cartel para quedarse.
    setTimeout(() => { if (el.isConnected) el.classList.add('av-yendose'); }, 11000);
    setTimeout(() => { if (el.isConnected) el.remove(); }, 12000);
    return true;
  }

  /* ── 3. Marca de rubro ───────────────────────────────────
     Una marca nacional auspicia un oficio en todo el partido. Va como
     franja, arriba del mazo, DEBAJO de la franja del comercio: la marca
     no pisa el casillero local, lo acompaña. */
  async function marcaDeRubro(destino) {
    const vista = typeof destino === 'string'
      ? document.querySelector(destino)
      : (destino || document.querySelector('.vista-mazo'));
    if (!vista) return false;
    if (vista.querySelector('.av-rubro')) return false;

    const a = await uno('rubro');
    if (!a) return false;
    if (!vista.isConnected) return false;

    const el = nodo(a, { clase: 'av-franja', cerrable: false });
    const franja = vista.querySelector('.sponsor-franja');
    if (franja && franja.parentNode === vista) franja.after(el);
    else vista.prepend(el);
    return true;
  }

  /* ── 4. Mazo vacío ───────────────────────────────────────
     Catorce pueblos chicos: el mazo vacío no es la excepción, es lo más
     común. Era la pantalla más vista y la única sin nada que vender. */
  async function vacio(cont) {
    const caja = cont || document.getElementById('mazo');
    if (!caja) return false;
    if (caja.querySelector('.av-vacio')) return false;

    const a = await uno('vacio');
    if (!a) return false;
    if (!caja.isConnected) return false;

    const el = nodo(a, { clase: 'av-tarjeta', cerrable: false });
    const dentro = caja.querySelector('.vacio-mazo') || caja.querySelector('.vacio') || caja;
    dentro.appendChild(el);
    return true;
  }

  /* ── 5. Cupón de marca ───────────────────────────────────
     El mismo mostrador que ya existe —la llave en la dirección— pero el
     código es de la marca, es único por persona y vence. Eso es lo que
     lo hace medible: no es "cuánta gente lo vio", es "cuánta gente fue". */
  async function cupones(destino) {
    const caja = typeof destino === 'string' ? document.querySelector(destino) : destino;
    if (!caja || caja.querySelector('.av-cupones')) return false;
    if (!hayCliente()) return false;

    const [disponibles, mios] = await Promise.all([
      traer({ superficie: 'cupon' }),
      sb.rpc('mis_cupones').then(r => r.data || []).catch(() => [])
    ]);
    if (!caja.isConnected) return false;

    const tomados = new Set(mios.map(c => c.aviso_id));
    const nuevos = disponibles.filter(a => !tomados.has(a.id));
    if (!nuevos.length && !mios.length) return false;

    const marco = document.createElement('div');
    marco.className = 'av-cupones';
    marco.innerHTML = '<p class="bloque-titulo">Cupones de marca</p>';

    nuevos.forEach(a => {
      const el = nodo(a, {
        clase: 'av-tarjeta',
        cerrable: false,
        alTocar: async (aviso, cerrar) => {
          const btn = el.querySelector('.av-boton');
          if (btn) { btn.disabled = true; btn.textContent = 'Pidiendo…'; }
          try {
            const { data, error } = await sb.rpc('tomar_cupon', { p_aviso: aviso.id });
            if (error) throw error;
            el.replaceWith(fichaCupon(Object.assign({ aviso_id: aviso.id, titulo: aviso.titulo,
              letra_chica: aviso.letra_chica, marca: data.marca }, data)));
          } catch (e) {
            if (btn) { btn.disabled = false; btn.textContent = aviso.boton || 'Tomar mi cupón'; }
            if (typeof brindis === 'function') brindis(e.message || 'No se pudo tomar el cupón');
          }
        }
      });
      marco.appendChild(el);
    });

    mios.forEach(c => marco.appendChild(fichaCupon(c)));
    caja.appendChild(marco);
    return true;
  }

  /* El cupón ya tomado: el código bien grande y espaciado, porque se
     dicta en voz alta arriba del ruido del mostrador. Igual que la
     credencial, que para eso está diseñada así. */
  function fichaCupon(c) {
    const el = document.createElement('article');
    const usado = !!c.usado_en;
    const vencido = !usado && c.vence && new Date(c.vence) < new Date();
    el.className = 'av av-tarjeta av-cupon-mio' + (usado || vencido ? ' av-gastado' : '');
    const codigo = String(c.codigo || '').replace(/(\d{2})(?=\d)/g, '$1 ');
    el.innerHTML = `
      <div class="av-cuerpo">
        <div class="av-firma"><span class="av-sello">Publicidad · ${esc(c.marca || '')}</span></div>
        <h3 class="av-titulo">${esc(c.titulo || 'Tu cupón')}</h3>
        <div class="av-codigo"><span>Mostralo en el mostrador</span><b>${esc(codigo)}</b></div>
        <p class="av-estado">${usado
          ? 'Ya lo usaste' + (c.monto ? ' · compra de $' + Number(c.monto).toLocaleString('es-AR') : '')
          : (vencido ? 'Venció' : 'Vence el ' + fecha(c.vence))}</p>
        ${c.letra_chica ? `<p class="av-chica">${esc(c.letra_chica)}</p>` : ''}
      </div>`;
    return el;
  }

  function fecha(f) {
    if (!f) return '—';
    try {
      return new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    } catch (e) { return '—'; }
  }


  /* ── Genérico, por si mañana hay una superficie más ─────── */
  async function pegar(superficie, destino, opciones) {
    const caja = typeof destino === 'string' ? document.querySelector(destino) : destino;
    if (!caja) return false;
    const a = await uno(superficie);
    if (!a || !caja.isConnected) return false;
    const el = nodo(a, opciones);
    if (!el) return false;
    caja.appendChild(el);
    return true;
  }

  /* Cuando se cambia de pantalla, los avisos flotantes se van con ella. */
  function limpiar() {
    document.querySelectorAll('.av-flotante, .av-abajo').forEach(e => e.remove());
  }


  window.Avisos = {
    traer, nodo, registrarVista, registrarToque,
    mazo, cierre, marcaDeRubro, vacio, cupones,
    medirFranja, pegar, limpiar, contexto,
    CADA_DESLIZAMIENTOS
  };
})();
