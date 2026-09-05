/* ============================================================
   CONTRATÁ YA — Navegación de aplicación
   ------------------------------------------------------------
   Se carga DESPUÉS de app.js y le agrega tres cosas que hacen
   que se sienta una app y no una página:

   1. El botón "atrás" del teléfono hace lo que la gente espera.
      Con una hoja abierta, la cierra (no se sale de la app).
      Dentro de un chat, vuelve a la lista de matches. Entre
      pestañas, vuelve a la anterior. Recién en la primera
      pantalla el "atrás" sale, como en cualquier app.
   2. No se pierde el lugar: al volver a una pantalla, la página
      queda donde la habías dejado.
   3. Las pantallas entran desde la derecha cuando avanzás y
      desde la izquierda cuando volvés. La hoja de abajo ahora
      también se va con animación en vez de desaparecer de golpe.

   Todo se apoya en el historial del navegador (pushState). No hay
   URLs nuevas: la app sigue viviendo en /app.html.
   ============================================================ */
(function () {
  'use strict';

  const irAOriginal        = window.irA;
  const abrirHojaOriginal  = window.abrirHoja;
  const cerrarHojaOriginal = window.cerrarHoja;
  const chatOriginal       = window.verMatchChat;

  let rutas = [];        // [{ tipo:'tab'|'chat', v, id, ref, scroll }]
  let actual = -1;
  let arrancado = false;
  let enPop = false;     // estamos repintando por un "atrás": no empujar historial
  let hojaEnHistorial = false;
  let popsAIgnorar = 0;  // los popstate que provocamos nosotros al cerrar una hoja
  const enCola = [];     // empujes de historial que esperan a que termine un back()

  // El navegador, por su cuenta, devuelve el scroll al lugar donde estaba
  // cuando cambia el historial. En una app de pestañas eso se ve como que
  // entrás a Beneficios y aparecés en el medio: acá el lugar lo manejamos
  // nosotros, que sabemos si vas para adelante (arriba de todo) o volvés
  // (donde lo habías dejado).
  if ('scrollRestoration' in history) {
    try { history.scrollRestoration = 'manual'; } catch (e) {}
  }

  const hoja = () => document.getElementById('hoja');
  const hojaAbierta = () => { const h = hoja(); return !!h && !h.hidden; };
  const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Historial: empujar sin pisarse con un back() en curso ──
     cerrarHoja() dispara un history.back(). Si justo después alguien
     navega (por ejemplo "Abrir el chat" desde el festejo del match),
     un pushState en el medio del viaje deja el historial torcido.
     Por eso el estado lógico se actualiza al toque y el pushState
     espera a que el back() aterrice. */
  function alHistorial(fn) {
    if (popsAIgnorar > 0) enCola.push(fn);
    else fn();
  }
  function vaciarCola() {
    while (enCola.length) enCola.shift()();
  }

  function guardarScroll() {
    if (rutas[actual]) rutas[actual].scroll = window.scrollY || 0;
  }

  function empujarRuta(r) {
    guardarScroll();
    actual++;
    rutas.length = actual;
    rutas[actual] = r;
    const i = actual;
    alHistorial(() => history.pushState({ cy: 'ruta', i }, ''));
  }

  // ¿Esta pantalla ya está más atrás en la pila? Entonces volvemos a ella
  // en vez de apilar otra igual: así el "atrás" no se hace interminable.
  function buscarAtras(tipo, clave) {
    for (let i = actual - 1; i >= 0; i--) {
      const r = rutas[i];
      if (!r || r.tipo !== tipo) continue;
      if (tipo === 'tab' && r.v === clave) return i;
      if (tipo === 'chat' && String(r.id) === String(clave)) return i;
    }
    return -1;
  }

  function arrancarRutas(vista) {
    rutas = [{ tipo: 'tab', v: vista, scroll: 0 }];
    actual = 0;
    history.replaceState({ cy: 'ruta', i: 0 }, '');
    arrancado = true;
  }

  /* ── Pintar una ruta ────────────────────────────────────── */
  function pintar(r, sentido) {
    document.documentElement.dataset.nav = sentido || 'adelante';
    enPop = true;
    try {
      if (r.tipo === 'chat') {
        const lista = (typeof matchesReales !== 'undefined' && matchesReales) || [];
        const m = lista.find(x => String(x.id) === String(r.id)) || r.ref;
        if (m) { chatOriginal(m); }
        else   { irAOriginal('matches'); }
      } else {
        irAOriginal(r.v);
      }
    } finally { enPop = false; }
    devolverScroll(r.scroll || 0);
  }

  // irA() y verMatchChat() mandan la página al principio. Si estamos
  // volviendo, el lugar guardado se restituye en el cuadro siguiente.
  function devolverScroll(y) {
    if (!y) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: 'auto' });
    }));
  }

  // Pantalla nueva: siempre arriba de todo. Se insiste una vez más cuando
  // termina de llegar el contenido, porque hasta entonces la página es corta
  // y el navegador no tiene adónde bajar.
  function alPrincipio() {
    let tocada = false;
    const marcar = () => { tocada = true; };
    window.addEventListener('wheel', marcar, { once: true, passive: true });
    window.addEventListener('touchstart', marcar, { once: true, passive: true });
    const subir = () => { if (!tocada) window.scrollTo({ top: 0, behavior: 'auto' }); };
    requestAnimationFrame(() => requestAnimationFrame(subir));
    setTimeout(() => {
      subir();
      window.removeEventListener('wheel', marcar);
      window.removeEventListener('touchstart', marcar);
    }, 220);
  }

  /* ── irA: cambio de pestaña ─────────────────────────────── */
  window.irA = function (vista) {
    if (!arrancado) { arrancarRutas(vista); document.documentElement.dataset.nav = 'adelante'; return irAOriginal(vista); }
    if (enPop) return irAOriginal(vista);

    if (hojaAbierta()) cerrarHoja();

    const cur = rutas[actual];
    if (cur && cur.tipo === 'tab' && cur.v === vista) {
      // Ya estamos parados acá: se repinta, sin tocar el historial.
      document.documentElement.dataset.nav = 'ninguna';
      cur.scroll = 0;
      const r = irAOriginal(vista);
      alPrincipio();
      return r;
    }

    const previo = buscarAtras('tab', vista);
    if (previo >= 0) { guardarScroll(); history.go(previo - actual); return; }

    empujarRuta({ tipo: 'tab', v: vista, scroll: 0 });
    document.documentElement.dataset.nav = 'adelante';
    const r = irAOriginal(vista);
    alPrincipio();
    return r;
  };

  /* ── El chat es una pantalla más ────────────────────────── */
  if (typeof chatOriginal === 'function') {
    window.verMatchChat = function (m) {
      if (enPop || !arrancado) return chatOriginal(m);
      const cur = rutas[actual];
      const yaEstoy = cur && cur.tipo === 'chat' && String(cur.id) === String(m.id);
      if (!yaEstoy) {
        const previo = buscarAtras('chat', m.id);
        if (previo >= 0) { guardarScroll(); history.go(previo - actual); return; }
        empujarRuta({ tipo: 'chat', id: m.id, ref: m, scroll: 0 });
        document.documentElement.dataset.nav = 'adelante';
      } else {
        document.documentElement.dataset.nav = 'ninguna';
      }
      const r = chatOriginal(m);
      alPrincipio();
      return r;
    };
  }

  /* ── Hojas de abajo ─────────────────────────────────────── */
  let cerrandoHoja = null;

  window.abrirHoja = function (html) {
    const h = hoja();
    const panel = document.getElementById('hojaPanel');
    if (cerrandoHoja) { clearTimeout(cerrandoHoja); cerrandoHoja = null; }
    if (h) h.classList.remove('cerrando');
    if (panel) panel.classList.remove('cerrando');

    const estaba = hojaAbierta();
    const r = abrirHojaOriginal(html);

    // Una sola entrada de historial por hoja, aunque adentro cambie el contenido.
    if (!estaba && arrancado && !hojaEnHistorial) {
      hojaEnHistorial = true;
      alHistorial(() => history.pushState({ cy: 'hoja' }, ''));
    }
    return r;
  };

  // Cierre visual, sin tocar el historial. Lo usa el "atrás" del teléfono.
  function cerrarHojaVisual() {
    const h = hoja();
    const panel = document.getElementById('hojaPanel');
    if (!h || h.hidden) return;
    if (reducido()) { cerrarHojaOriginal(); return; }
    h.classList.add('cerrando');
    document.body.style.overflow = '';
    if (cerrandoHoja) clearTimeout(cerrandoHoja);
    cerrandoHoja = setTimeout(() => {
      cerrandoHoja = null;
      h.classList.remove('cerrando');
      cerrarHojaOriginal();
    }, 230);
  }

  window.cerrarHoja = function () {
    if (!hojaAbierta()) { cerrarHojaOriginal(); return; }
    cerrarHojaVisual();
    if (hojaEnHistorial) {
      hojaEnHistorial = false;
      popsAIgnorar++;
      history.back();
    }
  };

  /* ── El botón "atrás" ───────────────────────────────────── */
  window.addEventListener('popstate', (e) => {
    // Un aviso a pantalla completa se cierra primero, y devolvemos la entrada.
    const inter = document.querySelector('.inter');
    if (inter && popsAIgnorar === 0 && !hojaEnHistorial) {
      const x = inter.querySelector('.inter-cerrar');
      if (x) x.click(); else inter.remove();
      const i = Math.max(0, actual);
      history.pushState({ cy: 'ruta', i }, '');
      return;
    }

    if (popsAIgnorar > 0) {
      popsAIgnorar--;
      if (popsAIgnorar === 0) vaciarCola();
      return;
    }

    if (hojaEnHistorial) {          // apretó atrás con la hoja abierta
      hojaEnHistorial = false;
      cerrarHojaVisual();
      return;
    }

    const st = e.state;
    if (!st || st.cy !== 'ruta') return;
    const i = Math.max(0, Math.min(rutas.length - 1, st.i | 0));
    const sentido = i < actual ? 'atras' : 'adelante';
    guardarScroll();
    actual = i;
    const r = rutas[i];
    if (r) pintar(r, sentido);
  });

  /* ── El tirador de la hoja cierra al tocarlo ────────────── */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('hoja-tirador')) cerrarHoja();
  });

  /* ── Volver a la app desde segundo plano ────────────────── */
  // Si el teléfono la mató mientras estaba atrás, al volver el estado
  // guardado alcanza; lo único que puede quedar viejo es el scroll.
  window.addEventListener('pageshow', (ev) => {
    if (ev.persisted && rutas[actual]) devolverScroll(rutas[actual].scroll || 0);
  });
})();

/* La altura real de la cabecera, para que el mazo pueda arrancar justo debajo
   sin números adivinados: cambia con el notch del teléfono y con el tamaño de
   letra que tenga puesto la persona. */
(function medirBarra() {
  const barra = document.getElementById('barra');
  if (!barra) return;
  const poner = () => {
    const alto = Math.round(barra.getBoundingClientRect().height);
    if (alto > 0) document.documentElement.style.setProperty('--alto-barra', alto + 'px');
  };
  poner();
  addEventListener('resize', poner);
  addEventListener('orientationchange', poner);
  if (window.ResizeObserver) new ResizeObserver(poner).observe(barra);
})();
