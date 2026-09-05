/* ============================================================
   CONTRATÁ YA — Landing nueva (/home2)

   Tres trabajos, y nada más:
   1. Leer de la app cuánta gente hay y en qué localidad, y
      pintarlo. Ningún número de esta página está escrito a mano.
   2. Las dos vistas de "cómo funciona" en el mismo bloque.
   3. La instalación, que es lo que hace que lleguen los avisos.

   Depende de /js/instalar.js (que ya existía) y de nada más.
   Sin librerías: la política de seguridad del sitio no deja
   traer nada de afuera, y tampoco hace falta.
   ============================================================ */

(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

  /* De norte a sur, como está el partido en el mapa. La app usa
     exactamente estos nombres. */
  const COSTA = [
    'San Clemente del Tuyú', 'Las Toninas', 'Costa Chica', 'Santa Teresita',
    'Mar del Tuyú', 'Costa del Este', 'Aguas Verdes', 'La Lucila del Mar',
    'Costa Azul', 'San Bernardo', 'Mar de Ajó', 'Nueva Atlantis',
    'Punta Médanos', 'Costa Esmeralda'
  ];

  /* Cómo se llama en castellano cada oficio que devuelve la app. */
  const OFICIOS = {
    albanileria: 'Albañilería', electricidad: 'Electricidad', plomeria: 'Plomería',
    gas: 'Gas matriculado', pintura: 'Pintura', techos: 'Techos',
    carpinteria: 'Carpintería', herreria: 'Herrería', climatizacion: 'Aire y calefacción',
    piletas: 'Piletas', durlock: 'Durlock', pisos: 'Pisos y revestimientos',
    destapaciones: 'Destapaciones', fumigacion: 'Fumigación', jardineria: 'Parquización',
    mantenimiento: 'Mantenimiento', casero: 'Casero', limpieza: 'Limpieza',
    fletes: 'Fletes y mudanzas', electronica: 'Técnico electrónico',
    cerrajero: 'Cerrajero', contratista: 'Obra completa'
  };

  /* La misma cuenta que hace zona.php para armar /zona/san-bernardo */
  function slug(s) {
    return s.replace(/[áàä]/gi, 'a').replace(/[éèë]/gi, 'e').replace(/[íìï]/gi, 'i')
            .replace(/[óòö]/gi, 'o').replace(/[úùü]/gi, 'u').replace(/ñ/gi, 'n')
            .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  }

  const escapar = (s) => String(s).replace(/[&<>"]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));

  /* Todo lo que sale de la app entra por acá. connect-src es 'self':
     esto no puede llamar a ningún lado más que a este mismo sitio. */
  async function rpc(nombre, args) {
    const r = await fetch('/sb/rest/v1/rpc/' + nombre, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    });
    if (!r.ok) throw new Error(nombre + ' respondió ' + r.status);
    return r.json();
  }


  /* ── 1. Cinta de instalación ──────────────────────────────
     Arriba de todo y una sola vez por visita. La app agregada a
     la pantalla de inicio es la única que avisa cuando pasa algo;
     en iPhone, directamente la única que puede. */
  (function cinta() {
    const caja = $('#cinta');
    if (!caja || typeof Instalar === 'undefined') return;
    if (Instalar.yaInstalada) return;
    try { if (sessionStorage.getItem('home2CintaCerrada')) return; } catch (e) {}

    function pintar(texto, boton) {
      caja.innerHTML =
        '<div class="cinta"><span>' + texto + '</span>' + boton +
        '<button class="x" type="button" aria-label="Cerrar">✕</button></div>';
      $('.x', caja).addEventListener('click', () => {
        caja.innerHTML = '';
        try { sessionStorage.setItem('home2CintaCerrada', '1'); } catch (e) {}
      });
    }

    const verComo = '<a class="btn" href="#instalar">Ver cómo</a>';

    if (Instalar.esNavegadorEmbebido) {
      pintar('Abrila en ' + (Instalar.esIOS ? 'Safari' : 'Chrome') +
             ' para agregarla a tu pantalla y recibir avisos', verComo);
      return;
    }
    if (Instalar.esIOS) {
      pintar('Agregala a tu pantalla de inicio y enterate al toque', verComo);
      return;
    }

    function conBoton() {
      pintar('Agregá la app y enterate cuando te contestan',
             '<button class="btn" type="button" id="cintaInstalar">Agregar</button>');
      $('#cintaInstalar').addEventListener('click', async () => {
        if (await Instalar.lanzarInstalacion()) caja.innerHTML = '';
      });
    }

    if (Instalar.disponible) conBoton();
    else {
      pintar('Tenela en la pantalla de inicio y enterate al toque', verComo);
      document.addEventListener('instalacion:disponible', () => {
        try { if (sessionStorage.getItem('home2CintaCerrada')) return; } catch (e) {}
        conBoton();
      });
    }
  })();


  /* ── 2. La sección de instalación ─────────────────────── */
  (function instalar() {
    const accion = $('#instalarAccion');
    if (!accion || typeof Instalar === 'undefined') return;

    if (Instalar.yaInstalada) {
      $('#instalarTitulo').textContent = 'Ya la tenés agregada.';
      $('#instalarPorque').textContent =
        'Buenísimo. Cuando alguien te conteste o entre un trabajo de tu oficio, te va a llegar el aviso al teléfono.';
      accion.innerHTML = '<a class="btn btn-ambar" href="/app">Abrir la app</a>';
      return;
    }

    if (Instalar.esIOS) {
      $('#guiaIOS').hidden = false;
      accion.innerHTML = '<a class="btn btn-ambar" href="/app">Abrir la app</a>';
      return;
    }

    function botonInstalar() {
      accion.innerHTML =
        '<button class="btn btn-ambar" type="button" id="btnInstalar">Agregar a la pantalla</button>' +
        '<a class="btn btn-linea" href="/app">Abrir la app</a>';
      $('#btnInstalar').addEventListener('click', async () => {
        if (await Instalar.lanzarInstalacion()) {
          $('#instalarTitulo').textContent = 'Listo, ya está.';
          accion.innerHTML = '<a class="btn btn-ambar" href="/app">Abrir la app</a>';
        }
      });
    }

    if (Instalar.disponible) botonInstalar();
    else {
      accion.innerHTML = '<a class="btn btn-ambar" href="/app">Abrir la app</a>';
      document.addEventListener('instalacion:disponible', botonInstalar);
    }
    document.addEventListener('instalacion:hecha', () => {
      $('#instalarTitulo').textContent = 'Listo, ya está.';
      accion.innerHTML = '<a class="btn btn-ambar" href="/app">Abrir la app</a>';
    });
  })();


  /* ── 3. Cómo funciona: las dos vistas ─────────────────── */
  (function pestanias() {
    const botones = $$('.pestanias [role="tab"]');
    if (!botones.length) return;
    botones.forEach(b => b.addEventListener('click', () => {
      botones.forEach(otro => {
        const activo = otro === b;
        otro.setAttribute('aria-selected', activo ? 'true' : 'false');
        const panel = document.getElementById(otro.getAttribute('aria-controls'));
        if (panel) panel.hidden = !activo;
      });
    }));
  })();


  /* ── 4. Los casilleros de comercio ─────────────────────
     14 localidades × 7 rubros de comercio. Es un dibujo de la
     idea, no un estado de ventas: por eso están todos iguales
     salvo el que se marca como ejemplo. */
  (function casilleros() {
    const caja = $('#casilleros');
    if (!caja) return;
    let html = '';
    for (let i = 0; i < 98; i++) html += '<i' + (i === 37 ? ' class="tom"' : '') + '></i>';
    caja.innerHTML = html;
  })();


  /* ── 5. Los datos vivos ────────────────────────────────
     Las dos llamadas a la app. `contar_profesionales` da el total
     real de gente anotada; `zonas_resumen` da la foto localidad
     por localidad. El total no se puede sumar de las localidades:
     el que trabaja en tres pueblos aparece en los tres. */
  const lista  = $('#costa');
  const panel  = $('#zonaPanel');
  const aviso  = $('#avisoDatos');
  let zonas = {};
  let elegida = null;

  function num(n) { return new Intl.NumberFormat('es-AR').format(n); }

  function pintarCifras(total, resumen) {
    const conGente  = resumen.filter(z => z.profesionales > 0).length;
    const oficios   = new Set();
    let pedidos = 0;
    resumen.forEach(z => {
      (z.rubros || []).forEach(r => oficios.add(r.rubro));
      pedidos += (z.pedidos || 0);
    });

    const poner = (clave, valor) => {
      const el = $('[data-cifra="' + clave + '"]');
      if (!el) return;
      el.textContent = num(valor);
      el.closest('.cifra').classList.remove('cargando');
    };
    poner('pros', total);
    poner('locs', conGente);
    poner('oficios', oficios.size);
    poner('pedidos', pedidos);
  }

  function pintarCosta() {
    lista.innerHTML = COSTA.map(nombre => {
      const z = zonas[nombre] || { profesionales: 0 };
      const n = z.profesionales || 0;
      const d = n === 0 ? 7 : Math.min(24, 9 + n * 1.7);
      return '<li>' +
        '<button type="button" data-loc="' + escapar(nombre) + '"' +
        (n === 0 ? ' class="vacia"' : '') + '>' +
          '<span class="bolita"><i style="width:' + d + 'px;height:' + d + 'px"></i></span>' +
          '<span class="nombre">' + escapar(nombre) + '</span>' +
          '<span class="cuenta">' + (n === 0 ? '—' : n) + '</span>' +
        '</button></li>';
    }).join('');

    $$('button', lista).forEach(b =>
      b.addEventListener('click', () => elegir(b.dataset.loc, true)));
  }

  function elegir(nombre, guardar) {
    elegida = nombre;
    $$('button', lista).forEach(b => {
      const es = b.dataset.loc === nombre;
      b.classList.toggle('elegida', es);
      b.setAttribute('aria-current', es ? 'true' : 'false');
    });
    if (guardar) { try { localStorage.setItem('home2Localidad', nombre); } catch (e) {} }
    pintarPanel();
  }

  function pintarPanel() {
    const z = zonas[elegida] || { profesionales: 0, oficios: 0, pedidos: 0, rubros: [] };
    const n = z.profesionales || 0;
    const rubros = z.rubros || [];

    let linea, nota;
    if (n === 0) {
      linea = 'Todavía <b>no hay nadie anotado</b> acá.';
      nota  = 'Publicá igual lo que necesitás: el primer profesional de la zona que entre lo va a ver, ' +
              'y te avisamos. Y si conocés a alguien que hace ese trabajo, pasale la app: es lo que ' +
              'más rápido llena un pueblo.';
    } else if (n <= 2) {
      linea = 'Hay <b>' + n + (n === 1 ? ' profesional' : ' profesionales') + '</b> anotado' +
              (n === 1 ? '' : 's') + ', de <b>' + z.oficios + '</b> oficio' + (z.oficios === 1 ? '' : 's') + '.';
      nota  = 'Somos pocos todavía en esta localidad y preferimos decirlo. Si tu oficio no está en la ' +
              'lista, el pedido queda publicado igual y te avisamos cuando aparezca alguien.';
    } else {
      linea = 'Hay <b>' + n + ' profesionales</b> anotados, de <b>' + z.oficios + '</b> oficios distintos.';
      nota  = 'Los ves de a uno, con su puntaje y sus trabajos hechos. El precio lo arreglan ustedes dos.';
    }
    if (z.pedidos > 0) {
      linea += ' Y hay <b>' + z.pedidos + '</b> pedido' + (z.pedidos === 1 ? '' : 's') +
               ' abierto' + (z.pedidos === 1 ? '' : 's') + ' esperando quién lo agarre.';
    }

    panel.innerHTML =
      '<p class="rotulo gris">Tu localidad</p>' +
      '<h3>' + escapar(elegida) + '</h3>' +
      '<p class="zona-linea">' + linea + '</p>' +
      (rubros.length
        ? '<div class="oficios">' + rubros.map(r =>
            '<span class="oficio">' + escapar(OFICIOS[r.rubro] || r.rubro) +
            (r.cuantos > 1 ? '<b>' + r.cuantos + '</b>' : '') + '</span>').join('') + '</div>'
        : '') +
      '<p class="zona-nota">' + nota + '</p>' +
      '<div class="acciones">' +
        '<a class="btn btn-ambar" href="/app">Contar qué necesito</a>' +
        '<a class="btn btn-linea" href="/zona/' + slug(elegida) + '">Ver los oficios de acá</a>' +
      '</div>';
  }

  async function traerDatos() {
    if (!lista || !panel) return;
    try {
      const [total, resumen] = await Promise.all([
        rpc('contar_profesionales'),
        rpc('zonas_resumen')
      ]);
      const filas = Array.isArray(resumen) ? resumen : [];
      filas.forEach(z => { zonas[z.localidad] = z; });

      pintarCifras(Number(total) || 0, filas);
      pintarCosta();

      /* Primero la que eligió la última vez; si no, la que más gente tiene. */
      let inicial = null;
      try { inicial = localStorage.getItem('home2Localidad'); } catch (e) {}
      if (!inicial || COSTA.indexOf(inicial) === -1) {
        inicial = filas.length
          ? filas.slice().sort((a, b) => b.profesionales - a.profesionales)[0].localidad
          : COSTA[9];
      }
      elegir(inicial, false);
    } catch (e) {
      /* Que falle la lectura no puede dejar la página muda. */
      if (aviso) aviso.hidden = false;
      zonas = {};
      pintarCosta();
      panel.innerHTML =
        '<p class="rotulo gris">Las localidades</p>' +
        '<h3>De San Clemente a Costa Esmeralda</h3>' +
        '<p class="zona-linea">No pudimos leer los números en este momento. Entrá a la app y ' +
        'buscá por tu localidad: la lista de adentro siempre está al día.</p>' +
        '<div class="acciones"><a class="btn btn-ambar" href="/app">Abrir la app</a></div>';
      $$('.cifra', document).forEach(c => {
        const b = $('b', c);
        if (b && b.textContent === '—') b.textContent = '·';
      });
    }
  }
  traerDatos();



})();
