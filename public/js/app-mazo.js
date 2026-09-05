/* ============================================================
   CONTRATÁ YA — El mazo (deslizar tarjetas de trabajo)
   ------------------------------------------------------------
   Reemplaza el motor viejo que vivía en app.js. Se carga DESPUÉS
   de app.js y pisa tres funciones globales: pintarMazo, arrastrable
   y seguirResolviendo. El resto de la app no se entera.

   Qué cambia respecto del anterior:
   · Las tarjetas no se vuelven a dibujar en cada desliz. Se saca la
     de arriba y las de atrás suben con una transición. Sin parpadeo
     de fotos ni salto de la pila.
   · El arrastre sigue al dedo, la tarjeta rota según dónde la
     agarraste (arriba o abajo, como una carta de verdad) y se tiñe
     de verde o de rojo a medida que te acercás al límite.
   · Suelta en el medio y vuelve sola, con un rebotecito.
   · Un envión corto y rápido también cuenta: no hace falta llevarla
     hasta la otra punta de la pantalla.
   · Se puede deshacer el último "paso" durante unos segundos.
   · Anda con el dedo, con el mouse y con el teclado.
   · La primera vez aparece una guía arriba de la tarjeta.
   ============================================================ */
(function () {
  'use strict';

  const GUIA_CLAVE   = 'cy-mazo-guia-v1';
  const VISIBLES     = 3;     // cuántas tarjetas se montan en el DOM
  const PRECARGA     = 3;     // cuántas fotos más se piden por adelantado
  const DESHACER_MS  = 7000;  // cuánto queda a la vista el botón de deshacer

  const M = {
    cont: null,
    nodos: [],          // [{ id, el, perfil }] — nodos[0] es la de arriba
    volando: 0,
    ultimo: null,       // { perfil, direccion } del último descarte
    botonDeshacer: null,// el <button> concreto: si cambia, la vista se rehízo
    relojDeshacer: null,
    tecladoPuesto: false
  };

  const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // El límite para que cuente como desliz: ni tan corto que se dispare solo,
  // ni tan largo que en un teléfono chico haya que sacar la carta de la pantalla.
  const limite = () => Math.max(62, Math.min(118, window.innerWidth * 0.26));

  const vibrar = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

  const hojaAbierta = () => { const h = document.getElementById('hoja'); return !!h && !h.hidden; };

  /* ── Colocar una tarjeta según su lugar en la pila ─────────
     prof 0 es la de arriba (la que se arrastra). El "avance" es
     cuánto se movió la de arriba, de 0 a 1: las de atrás se van
     adelantando mientras arrastrás, así se ve que hay más abajo. */
  function colocar(el, prof, avance) {
    if (prof === 0) return;                      // esa la maneja el gesto
    const p = Math.max(0, prof - (avance || 0));
    const s = 1 - p * 0.05;
    // Todas las tarjetas ocupan el mismo hueco, así que achicarlas sin más
    // las deja escondidas atrás. Se las baja lo justo para que asomen por
    // abajo: ese borde asomando es lo que dice "hay más".
    const alto = (M.cont && M.cont.clientHeight) || el.offsetHeight || 400;
    const dy = alto * (1 - s) + p * 9;
    el.style.transformOrigin = 'center top';
    el.style.transform = `translateY(${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
    el.style.opacity = p > 2.4 ? '0' : '1';
    el.style.filter = `brightness(${(1 - Math.min(p, 2) * 0.09).toFixed(3)})`;
    el.style.zIndex = String(10 - prof);
  }

  // Sin tarjetas los botones no hacen nada: que se note, para que nadie
  // se quede tocando una cruz que no responde.
  function habilitarBotones(hay) {
    ['btnNo', 'btnSi', 'btnInfo'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.disabled = !hay;
    });
    // Ojo: el botón de deshacer NO se apaga acá. Quedarse sin tarjetas es
    // justo cuando más se quiere volver atrás: "la última la pasé sin querer".
  }

  function reacomodar(avance) {
    M.nodos.forEach((n, i) => {
      n.el.dataset.prof = String(i);
      n.el.style.zIndex = String(10 - i);
      if (i === 0) {
        n.el.classList.add('carta-arriba');
        n.el.style.filter = '';
        n.el.style.opacity = '1';
        n.el.style.transformOrigin = '';
      } else {
        n.el.classList.remove('carta-arriba');
        colocar(n.el, i, avance);
      }
    });
  }

  /* ── Armar una tarjeta ─────────────────────────────────── */
  function fabricar(perfil) {
    const esPro = Estado.rol === 'pro';
    const el = esPro ? cartaCliente(perfil, 0) : cartaProfesional(perfil, 0);
    el.dataset.id = String(perfil.id);
    el.style.transform = '';
    el.style.opacity = '';
    el.setAttribute('aria-label', perfil.nombre || 'Tarjeta');
    // El tinte verde/rojo que se enciende mientras arrastrás.
    const tinte = document.createElement('span');
    tinte.className = 'carta-tinte';
    el.appendChild(tinte);
    const foto = el.querySelector('.carta-foto img');
    if (foto) {
      foto.decoding = 'async';
      if (foto.complete) el.classList.add('foto-lista');
      else foto.addEventListener('load', () => el.classList.add('foto-lista'), { once: true });
      foto.addEventListener('error', () => el.classList.add('foto-lista'), { once: true });
    }
    return el;
  }

  // Le pide al navegador las fotos de las que todavía no están montadas.
  // En una conexión mala esto es la diferencia entre ver la cara o ver un hueco.
  function precargar(lista) {
    lista.slice(VISIBLES, VISIBLES + PRECARGA).forEach(p => {
      if (!p || !p.foto) return;
      const i = new Image();
      i.decoding = 'async';
      i.src = p.foto;
    });
  }

  /* ── Sincronizar el DOM con la lista de candidatos ──────── */
  function sincronizar(avance) {
    if (!M.cont) return;
    const lista = candidatos();
    const quieren = lista.slice(0, VISIBLES);
    const ids = quieren.map(p => String(p.id));

    // Sacar los nodos que ya no corresponden (menos los que están volando).
    M.nodos = M.nodos.filter(n => {
      if (ids.includes(String(n.id))) return true;
      if (n.el.classList.contains('volando')) return true;
      n.el.remove();
      return false;
    });
    M.nodos = M.nodos.filter(n => !n.el.classList.contains('volando'));

    // Agregar los que faltan, siempre por debajo.
    quieren.forEach(p => {
      if (M.nodos.some(n => String(n.id) === String(p.id))) return;
      const el = fabricar(p);
      M.cont.insertBefore(el, M.cont.firstChild);   // el primero del DOM queda al fondo
      M.nodos.push({ id: String(p.id), el, perfil: p });
    });

    // Ordenarlos igual que la lista.
    M.nodos.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    reacomodar(avance);

    // El DOM tiene que quedar en el orden inverso, para que el z-index no dependa
    // sólo del stacking context (Safari viejo se hace el vivo con las transformadas).
    for (let i = M.nodos.length - 1; i >= 0; i--) M.cont.appendChild(M.nodos[i].el);

    const arriba = M.nodos[0];
    if (arriba && !arriba.el.dataset.enganchada) {
      arriba.el.dataset.enganchada = '1';
      engancharGesto(arriba.el, arriba.perfil);
    }
    // Las de atrás también se enganchan: cuando suban ya están listas.
    M.nodos.forEach(n => {
      if (n.el.dataset.enganchada) return;
      n.el.dataset.enganchada = '1';
      engancharGesto(n.el, n.perfil);
    });

    precargar(lista);
    return lista;
  }

  /* ── El gesto ───────────────────────────────────────────── */
  function engancharGesto(carta, perfil) {
    const si = carta.querySelector('.marca-si');
    const no = carta.querySelector('.marca-no');
    const tinte = carta.querySelector('.carta-tinte');

    let activo = false, puntero = null;
    let x0 = 0, y0 = 0, dx = 0, dy = 0, arriba = 1;
    let t0 = 0, muestras = [], cruzo = 0, movio = false;

    /* Deslizar para arriba abre la ficha. Es el gesto que la gente ya conoce
       de otras apps de tarjetas, y resuelve algo concreto: en la tarjeta
       entran la foto y cuatro datos; todo lo demás —la bio, las
       especialidades, las reseñas— está en la ficha, y antes había que saber
       que se abría tocando. */
    const marcaFicha = carta.querySelector('.marca-ficha');
    const limiteArriba = () => Math.min(120, carta.offsetHeight * 0.17);
    const esParaArriba = () => dy < 0 && Math.abs(dy) > Math.abs(dx) * 1.15;

    const esLaDeArriba = () => M.nodos[0] && M.nodos[0].el === carta;

    function pintar() {
      const lim = limite();

      // Gesto hacia arriba: la tarjeta sube entera y aparece "ver ficha".
      if (esParaArriba()) {
        const fy = Math.min(1, Math.abs(dy) / limiteArriba());
        carta.style.transform = `translate3d(${(dx * 0.25).toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        if (si) si.style.opacity = 0;
        if (no) no.style.opacity = 0;
        if (marcaFicha) {
          marcaFicha.style.opacity = fy;
          marcaFicha.style.transform = `translateX(-50%) scale(${0.85 + fy * 0.25})`;
        }
        if (tinte) { tinte.style.opacity = String(fy * 0.8); tinte.dataset.lado = 'ficha'; }
        carta.classList.remove('cerca-si', 'cerca-no');
        carta.classList.toggle('cerca-ficha', fy >= 1);
        const cruceY = fy >= 1 ? 2 : 0;
        if (cruceY !== cruzo) { if (cruceY) vibrar(9); cruzo = cruceY; }
        return;
      }
      if (marcaFicha) marcaFicha.style.opacity = 0;
      carta.classList.remove('cerca-ficha');

      const f = Math.min(1, Math.abs(dx) / lim);
      const giro = Math.max(-20, Math.min(20, dx * 0.075 * arriba));
      carta.style.transform = `translate3d(${dx}px, ${dy * 0.55}px, 0) rotate(${giro}deg)`;

      if (si) { si.style.opacity = dx > 0 ? f : 0; si.style.transform = `rotate(-13deg) scale(${0.82 + f * 0.3})`; }
      if (no) { no.style.opacity = dx < 0 ? f : 0; no.style.transform = `rotate(13deg) scale(${0.82 + f * 0.3})`; }
      if (tinte) {
        tinte.style.opacity = String(f * 0.85);
        tinte.dataset.lado = dx > 0 ? 'si' : 'no';
      }
      carta.classList.toggle('cerca-si', dx > 0 && f >= 1);
      carta.classList.toggle('cerca-no', dx < 0 && f >= 1);

      // Un golpecito cuando cruzás el límite: te avisa sin mirar.
      const lado = f >= 1 ? (dx > 0 ? 1 : -1) : 0;
      if (lado !== cruzo) { if (lado !== 0) vibrar(9); cruzo = lado; }

      // Las de atrás se adelantan a medida que la de arriba se va.
      reacomodar(Math.min(1, f));
    }

    function limpiar() {
      if (si) { si.style.opacity = 0; si.style.transform = ''; }
      if (no) { no.style.opacity = 0; no.style.transform = ''; }
      if (marcaFicha) { marcaFicha.style.opacity = 0; marcaFicha.style.transform = ''; }
      if (tinte) tinte.style.opacity = '0';
      carta.classList.remove('cerca-si', 'cerca-no', 'cerca-ficha');
      cruzo = 0;
    }

    carta.addEventListener('pointerdown', (e) => {
      if (!esLaDeArriba() || M.volando > 0 || hojaAbierta()) return;
      if (e.button !== undefined && e.button !== 0) return;
      activo = true; puntero = e.pointerId; movio = false;
      x0 = e.clientX; y0 = e.clientY; dx = 0; dy = 0;
      t0 = performance.now(); muestras = [{ x: 0, t: t0 }];
      const caja = carta.getBoundingClientRect();
      arriba = (e.clientY - caja.top) < caja.height / 2 ? 1 : -1;
      carta.style.transition = 'none';
      carta.classList.add('agarrada');
      if (M.cont) M.cont.classList.add('arrastrando');
      try { carta.setPointerCapture(e.pointerId); } catch (err) {}
      esconderGuia();
    });

    carta.addEventListener('pointermove', (e) => {
      if (!activo || e.pointerId !== puntero) return;
      dx = e.clientX - x0; dy = e.clientY - y0;
      if (!movio && Math.hypot(dx, dy) > 6) movio = true;
      const ahora = performance.now();
      muestras.push({ x: dx, t: ahora });
      if (muestras.length > 6) muestras.shift();
      pintar();
    });

    function soltar(e) {
      if (!activo || (e && e.pointerId !== undefined && e.pointerId !== puntero)) return;
      activo = false;
      carta.classList.remove('agarrada');
      try { carta.releasePointerCapture(puntero); } catch (err) {}

      // Un toque, no un arrastre: abre la ficha.
      if (!movio && (performance.now() - t0) < 400) {
        volverASuLugar();
        verFicha(perfil);
        return;
      }

      // Subió lo suficiente: se abre la ficha y la tarjeta se queda donde estaba.
      if (esParaArriba() && Math.abs(dy) > limiteArriba()) {
        volverASuLugar();
        verFicha(perfil);
        return;
      }

      // Velocidad de los últimos milisegundos: un envión corto también vale.
      const a = muestras[0], b = muestras[muestras.length - 1];
      const ms = Math.max(1, b.t - a.t);
      const vel = (b.x - a.x) / ms;                       // píxeles por milisegundo
      const pasa = Math.abs(dx) > limite() || (Math.abs(vel) > 0.55 && Math.abs(dx) > 26);

      if (pasa) despachar(carta, perfil, dx > 0 ? 1 : -1, dy, vel);
      else volverASuLugar();
    }

    function volverASuLugar() {
      if (M.cont) M.cont.classList.remove('arrastrando');
      carta.style.transition = reducido()
        ? 'transform .01s'
        : 'transform .42s cubic-bezier(0.18, 0.89, 0.32, 1.22)';
      carta.style.transform = '';
      limpiar();
      reacomodar(0);
      dx = 0; dy = 0;
    }

    carta.addEventListener('pointerup', soltar);
    carta.addEventListener('pointercancel', () => { if (activo) { activo = false; carta.classList.remove('agarrada'); volverASuLugar(); } });
    carta.addEventListener('lostpointercapture', () => { if (activo) { activo = false; carta.classList.remove('agarrada'); volverASuLugar(); } });
    carta.addEventListener('dragstart', e => e.preventDefault());
  }

  window.MazoVerFicha = (perfil) => verFicha(perfil);

  function verFicha(perfil) {
    if (Estado.rol === 'pro') verFichaCliente(perfil);
    else verFichaProfesional(perfil);
  }

  /* ── Resolver: la tarjeta se va y la pila sube ───────────── */
  // Se llama tanto desde el gesto como desde los botones y el teclado.
  function despachar(carta, perfil, direccion, dyFinal, vel) {
    if (carta.classList.contains('volando')) return;
    if (M.cont) M.cont.classList.remove('arrastrando');
    M.volando++;
    esconderGuia();
    vibrar(direccion === 1 ? [10, 30, 14] : 12);

    const ancho = window.innerWidth + carta.offsetWidth;
    const giro = direccion * 28;
    const caida = Math.max(-90, Math.min(140, (dyFinal || 0) * 0.6 + 40));

    carta.classList.add('volando');
    carta.classList.remove('carta-arriba');
    carta.style.transition = reducido()
      ? 'opacity .12s linear'
      : 'transform .38s cubic-bezier(0.32, 0, 0.67, 0), opacity .34s ease-in';
    // Forzamos un reflow para que la transición arranque desde donde está el dedo.
    void carta.offsetWidth;
    carta.style.transform = `translate3d(${direccion * ancho}px, ${caida}px, 0) rotate(${giro}deg)`;
    carta.style.opacity = '0';

    // Sacamos el nodo de la pila YA: las de atrás suben en el mismo cuadro
    // y el botón siguiente ya opera sobre la tarjeta nueva.
    M.nodos = M.nodos.filter(n => n.el !== carta);
    const irse = () => { carta.remove(); M.volando = Math.max(0, M.volando - 1); };
    carta.addEventListener('transitionend', irse, { once: true });
    setTimeout(() => { if (carta.isConnected) irse(); }, 600);

    // Efecto en los datos (lo mismo que hacía seguirResolviendo en app.js).
    Estado.vistos.push(perfil.id);
    const esReal = perfil && perfil._real;
    if (esReal) {
      if (Estado.rol === 'pro') persistirDeslizPro(perfil, direccion);
      else persistirMatchCli(perfil, direccion);
    }

    if (direccion === 1) {
      const tipo = Estado.rol === 'pro' ? 'cliente' : 'profesional';
      if (!esReal) {
        Estado.matches.unshift({ id: perfil.id, tipo, cuando: Date.now(), leido: false, calificado: false });
      }
      olvidarDeshacer();
      setTimeout(() => festejarMatch(perfil, tipo, esReal), 300);
    } else {
      ofrecerDeshacer(perfil);
    }

    guardar();
    actualizarGlobo();

    // Montamos la que entra por abajo y actualizamos el contador de arriba.
    const lista = sincronizar(0) || [];
    if (!lista.length) { habilitarBotones(false); setTimeout(() => pintarMazo(), 260); }
    else avisarLector(lista);
    refrescarResumen(lista.length);
  }

  // Dispara el desliz sobre la tarjeta que esté arriba en este momento.
  function accionar(direccion) {
    if (hojaAbierta()) return;
    const n = M.nodos[0];
    if (!n) return;
    resolver(n.el, n.perfil, direccion);     // resolver() vive en app.js: chequea foto y calificación pendiente
  }

  /* ── Deshacer el último "paso" ──────────────────────────── */
  // Sólo el descarte. El "sí" abre un match y avisa a la otra persona:
  // deshacerlo sería mentirle a alguien que ya vio la notificación.
  function ofrecerDeshacer(perfil) {
    M.ultimo = { perfil, cuando: Date.now() };
    const b = document.getElementById('btnDeshacer');
    if (!b) return;
    M.botonDeshacer = b;
    b.hidden = false;
    b.classList.add('a-la-vista');
    clearTimeout(M.relojDeshacer);
    M.relojDeshacer = setTimeout(olvidarDeshacer, DESHACER_MS);
  }

  function olvidarDeshacer() {
    clearTimeout(M.relojDeshacer);
    M.ultimo = null;
    const b = document.getElementById('btnDeshacer');
    if (b) { b.classList.remove('a-la-vista'); setTimeout(() => { if (b && !b.classList.contains('a-la-vista')) b.hidden = true; }, 220); }
  }

  async function deshacer() {
    if (!M.ultimo || M.volando > 0) return;
    const perfil = M.ultimo.perfil;
    olvidarDeshacer();

    const i = Estado.vistos.lastIndexOf(perfil.id);
    if (i >= 0) Estado.vistos.splice(i, 1);
    guardar();

    if (perfil._real && Estado.rol === 'pro') olvidarDesliz(perfil);

    vibrar(8);
    const lista = sincronizar(0) || [];
    refrescarResumen(lista.length);

    // La que vuelve entra desde el costado por el que se fue.
    const n = M.nodos[0];
    if (n && !reducido()) {
      n.el.style.transition = 'none';
      n.el.style.transform = 'translate3d(-118%, 30px, 0) rotate(-24deg)';
      n.el.style.opacity = '0';
      void n.el.offsetWidth;
      n.el.style.transition = 'transform .44s cubic-bezier(0.18,0.89,0.32,1.16), opacity .22s ease-out';
      n.el.style.transform = '';
      n.el.style.opacity = '1';
    }
    brindis('Volvió el último que pasaste');
    avisarLector(lista);
  }

  // Borra el "no" que quedó guardado, si no el pedido no vuelve a aparecer nunca.
  async function olvidarDesliz(perfil) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      await sb.from('deslizamientos').delete().eq('pedido_id', perfil.id).eq('usuario_id', uid);
    } catch (e) { /* si falla, el pedido reaparece igual la próxima recarga */ }
  }

  /* ── La guía de la primera vez ──────────────────────────── */
  function guiaVista() {
    try { return localStorage.getItem(GUIA_CLAVE) === '1'; } catch (e) { return false; }
  }
  function esconderGuia() {
    const g = document.getElementById('mazoGuia');
    if (!g || g.hidden) return;
    g.classList.add('se-va');
    setTimeout(() => { g.hidden = true; }, 260);
    try { localStorage.setItem(GUIA_CLAVE, '1'); } catch (e) {}
  }
  function htmlGuia(esPro) {
    return `
      <div class="mazo-guia" id="mazoGuia">
        <div class="mazo-guia-caja">
          <p class="eyebrow">Así se usa</p>
          <div class="mazo-guia-mano" aria-hidden="true">
            <span class="mazo-guia-flecha no">←</span>
            <span class="mazo-guia-pieza">
              <span class="mazo-guia-carta"></span>
              <span class="mazo-guia-toque"></span>
            </span>
            <span class="mazo-guia-flecha si">→</span>
          </div>
          <p class="mazo-guia-texto">
            <b>Deslizá la tarjeta con el dedo.</b><br>
            <span class="guia-no">← A la izquierda: paso</span><br>
            <span class="guia-si">A la derecha: ${esPro ? 'me interesa' : 'me sirve'} →</span>
          </p>
          <p class="mazo-guia-nota">También podés usar los botones de abajo. Tocá la tarjeta para leer la ficha entera.</p>
          <button class="btn btn-plomo btn-sm" id="guiaListo" type="button">Dale, entendí</button>
        </div>
      </div>`;
  }

  /* ── Accesibilidad y el rótulo de arriba ────────────────── */
  function avisarLector(lista) {
    const v = document.getElementById('mazoVoz');
    if (!v) return;
    const p = lista && lista[0];
    if (!p) { v.textContent = 'No quedan más tarjetas.'; return; }
    v.textContent = `${p.nombre}. Quedan ${lista.length}.`;
  }

  function refrescarResumen(cuantos) {
    const c = document.getElementById('mazoCuenta');
    if (!c) return;
    const esPro = Estado.rol === 'pro';
    c.textContent = `${cuantos} ${esPro ? (cuantos === 1 ? 'pedido' : 'pedidos') : (cuantos === 1 ? 'disponible' : 'disponibles')}`;
  }

  /* ── Teclado ────────────────────────────────────────────── */
  function ponerTeclado() {
    if (M.tecladoPuesto) return;
    M.tecladoPuesto = true;
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('mazo')) return;
      if (hojaAbierta()) return;
      const foco = document.activeElement;
      if (foco && /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowLeft')       { e.preventDefault(); accionar(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); accionar(1); }
      else if (e.key === 'ArrowUp' || e.key === 'Enter') {
        if (foco && foco.tagName === 'BUTTON' && e.key === 'Enter') return;   // dejá que el botón haga lo suyo
        e.preventDefault();
        const n = M.nodos[0]; if (n) verFicha(n.perfil);
      }
      else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') { e.preventDefault(); deshacer(); }
    });
  }

  /* ── Pintar el mazo (pisa la de app.js) ─────────────────── */
  function pintarMazoNuevo() {
    const cont = document.getElementById('mazo');
    if (!cont) return;
    M.cont = cont;
    M.nodos = [];
    M.volando = 0;
    ponerTeclado();

    // ¿Se rehizo la pantalla entera (otra búsqueda, otra localidad)? Entonces
    // lo que había para deshacer ya no viene al caso.
    const botonAhora = document.getElementById('btnDeshacer');
    if (M.botonDeshacer && botonAhora !== M.botonDeshacer) { M.ultimo = null; M.botonDeshacer = null; }

    const esPro = Estado.rol === 'pro';
    let lista = candidatos();

    if (!lista.length) {
      // Se vació: recargamos para que vuelvan los que dijiste "no".
      if (!Estado._recargandoMazo) {
        Estado._recargandoMazo = true;
        cont.innerHTML = esqueletoMazo();
        habilitarBotones(false);
        (async () => {
          Estado.vistos = [];
          if (esPro) await cargarPedidosPro(); else await cargarProfesionalesCli();
          Estado._recargandoMazo = false;
          if (!document.getElementById('mazo')) return;
          if (candidatos().length) pintarMazoNuevo();
          else mazoVacio(document.getElementById('mazo'), esPro);
        })();
        return;
      }
      Estado._recargandoMazo = false;
      mazoVacio(cont, esPro);
      refrescarResumen(0);
      habilitarBotones(false);
      return;
    }

    Estado._recargandoMazo = false;
    cont.innerHTML = '';
    lista = sincronizar(0) || lista;
    refrescarResumen(lista.length);
    habilitarBotones(true);
    avisarLector(lista);

    // Los botones leen siempre la tarjeta que está arriba en este instante.
    const bNo = document.getElementById('btnNo');
    const bSi = document.getElementById('btnSi');
    const bInfo = document.getElementById('btnInfo');
    const bDes = document.getElementById('btnDeshacer');
    if (bNo) bNo.onclick = () => accionar(-1);
    if (bSi) bSi.onclick = () => accionar(1);
    if (bInfo) bInfo.onclick = () => { const n = M.nodos[0]; if (n) verFicha(n.perfil); };
    if (bDes) bDes.onclick = () => deshacer();

    // La guía de la primera vez.
    if (!guiaVista()) {
      const g = document.createElement('div');
      g.innerHTML = htmlGuia(esPro);
      cont.appendChild(g.firstElementChild);
      const ok = document.getElementById('guiaListo');
      if (ok) ok.addEventListener('click', esconderGuia);
    }
  }

  /* ── Esqueleto de carga ─────────────────────────────────── */
  function esqueletoMazo() {
    return `
      <article class="carta carta-esqueleto" aria-hidden="true">
        <div class="carta-foto esq-bloque"></div>
        <div class="carta-cuerpo">
          <span class="esq-linea" style="width:62%;height:22px"></span>
          <span class="esq-linea" style="width:44%;height:11px"></span>
          <span class="esq-linea" style="width:96%"></span>
          <span class="esq-linea" style="width:78%"></span>
          <div class="carta-pie" style="border-top-color:transparent">
            <span class="esq-linea" style="width:38%;height:20px"></span>
            <span class="esq-linea" style="width:26%;height:16px"></span>
          </div>
        </div>
      </article>`;
  }

  /* ── Enganches con app.js ───────────────────────────────── */
  window.pintarMazo = pintarMazoNuevo;
  window.arrastrable = function (carta, perfil) { /* ya lo hace sincronizar() */ };
  window.seguirResolviendo = function (carta, perfil, direccion) {
    despachar(carta, perfil, direccion, 0, 0);
  };
  window.esqueletoMazo = esqueletoMazo;
  window.MazoDeshacer = deshacer;
  window.MazoOlvidarDeshacer = olvidarDeshacer;
})();
