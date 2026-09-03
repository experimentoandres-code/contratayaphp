/* ============================================================
   CONTRATÁ YA — Landing
   ============================================================ */


/* ── Cinta de instalación ────────────────────────────────────
   Arriba de todo, apenas entra. La app instalada es la única que
   recibe avisos —en iPhone, directamente la única que los puede
   recibir— así que instalarla no es un adorno: es lo que hace
   que un profesional se entere de que le pidieron un trabajo.

   Se puede cerrar, y una vez cerrada no vuelve en esa visita.
   ─────────────────────────────────────────────────────────── */
(function cintaInstalacion() {
  const cont = document.getElementById('cintaInstalar');
  if (!cont) return;

  if (Instalar.yaInstalada) return;
  try { if (sessionStorage.getItem('cintaCerrada')) return; } catch {}

  const pintar = (texto, boton) => {
    cont.innerHTML = `
      <div class="cinta">
        <span class="cinta-texto">${texto}</span>
        ${boton}
        <button class="cinta-x" id="cintaX" aria-label="Cerrar">✕</button>
      </div>`;
    document.body.classList.add('con-cinta');

    document.getElementById('cintaX').addEventListener('click', () => {
      cont.innerHTML = '';
      document.body.classList.remove('con-cinta');
      try { sessionStorage.setItem('cintaCerrada', '1'); } catch {}
    });
  };

  // Dentro de Instagram o Facebook no se puede instalar nada.
  if (Instalar.esNavegadorEmbebido) {
    pintar(`Abrila en ${Instalar.esIOS ? 'Safari' : 'Chrome'} para instalarla y recibir avisos`,
           '<a class="cinta-btn" href="#instalar">Cómo</a>');
    return;
  }

  if (Instalar.esIOS) {
    pintar('Agregala a tu pantalla de inicio y enterate al toque',
           '<a class="cinta-btn" href="#instalar">Ver cómo</a>');
    return;
  }

  const conBoton = () => {
    pintar('Instalá la app y enterate cuando entra un trabajo cerca',
           '<button class="cinta-btn" id="cintaInstalarBtn">Instalar</button>');
    document.getElementById('cintaInstalarBtn').addEventListener('click', async () => {
      if (await Instalar.lanzarInstalacion()) {
        cont.innerHTML = '';
        document.body.classList.remove('con-cinta');
      }
    });
  };

  if (Instalar.disponible) conBoton();
  document.addEventListener('instalacion:disponible', conBoton);
})();

/* ── Riel de la costa ───────────────────────────────────── */
(function riel() {
  const lista = document.getElementById('rielLista');
  const plomo = document.getElementById('rielPlomo');
  if (!lista) return;

  LOCALIDADES.forEach(nombre => {
    const li = document.createElement('li');
    li.textContent = nombre;
    lista.appendChild(li);
  });

  const items = [...lista.children];

  function actualizar() {
    const alto = document.body.scrollHeight - window.innerHeight;
    const avance = alto > 0 ? Math.min(1, Math.max(0, window.scrollY / alto)) : 0;
    plomo.style.top = (avance * 100) + '%';

    const indice = Math.min(items.length - 1, Math.round(avance * (items.length - 1)));
    items.forEach((li, i) => li.classList.toggle('activa', i === indice));
  }

  actualizar();
  window.addEventListener('scroll', actualizar, { passive: true });
  window.addEventListener('resize', actualizar);
})();

/* ── Estrellas ──────────────────────────────────────────── */
document.querySelectorAll('.estrellas').forEach(el => {
  const n = parseInt(el.dataset.n, 10);
  el.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
});

/* ── Capas de verificación ──────────────────────────────── */
(function capas() {
  const cont = document.getElementById('capasLista');
  if (!cont) return;
  CAPAS_VERIFICACION.forEach((c, i) => {
    const li = document.createElement('li');
    li.className = 'capa revelar';
    li.innerHTML = `
      <span class="capa-n">0${i + 1}</span>
      <h3>${c.nombre}</h3>
      <p>${c.metodo}</p>`;
    cont.appendChild(li);
  });
})();

/* ── Comercios ──────────────────────────────────────────── */
(function comercios() {
  const cont = document.getElementById('comerciosGrilla');
  if (!cont) return;
  SPONSORS.forEach(s => {
    const div = document.createElement('article');
    div.className = 'comercio revelar';
    div.innerHTML = `
      <div class="comercio-marca">
        <span class="comercio-cuadro" style="background:${s.color}">${s.nombre.charAt(0)}</span>
        <div>
          <h3>${s.nombre}</h3>
          <span class="comercio-rubro">${s.rubroComercio}</span>
        </div>
      </div>
      <p class="comercio-benef">${s.beneficio}</p>
      <p class="comercio-zonas">${s.localidades.join(' · ')}</p>`;
    cont.appendChild(div);
  });
})();

/* ── Planes ─────────────────────────────────────────────── */
(function planes() {
  const cont = document.getElementById('planesGrilla');
  if (!cont) return;
  PLANES.forEach(p => {
    const art = document.createElement('article');
    art.className = 'plan revelar' + (p.destacado ? ' plan-destacado' : '');
    const incluye = p.incluye.map(x => `<li>${x}</li>`).join('');
    const excluye = p.excluye.map(x => `<li class="no">${x}</li>`).join('');
    art.innerHTML = `
      ${p.destacado ? '<span class="plan-cinta">El más elegido</span>' : ''}
      <h3>${p.nombre}</h3>
      <p class="plan-precio">${p.precioTexto}</p>
      <p class="plan-resumen">${p.resumen}</p>
      <ul class="plan-incluye">${incluye}${excluye}</ul>
      <p class="plan-nota">${p.id === 'gratis' ? 'Siempre gratis' : 'Sin cargo durante el lanzamiento'}</p>`;
    cont.appendChild(art);
  });
})();

/* ── Mazo de demostración ───────────────────────────────── */
(function mazoDemo() {
  const cont = document.getElementById('mazoDemo');
  if (!cont) return;

  const tonos = ['#F0A63A', '#2FB2A6', '#7E9BD4', '#C39BD3', '#E4574C', '#8FBF6A'];
  const perfiles = PROFESIONALES.slice(0, 6);
  let indice = 0;

  function vaciar() {
    cont.innerHTML = `
      <div class="mazo-vacio">
        <h3 style="font-size:19px">Viste todos por ahora</h3>
        <p>En la app te llegan perfiles nuevos a medida que se suman a tu localidad.</p>
        <a class="btn btn-plomo btn-sm" href="/app.html" style="justify-self:center">Abrir la app</a>
      </div>`;
  }

  function pintar() {
    cont.innerHTML = '';
    const visibles = perfiles.slice(indice, indice + 3).reverse();
    if (!visibles.length) return vaciar();

    visibles.forEach((p, i) => {
      const profundidad = visibles.length - 1 - i;
      const rubro = RUBROS.find(r => r.id === p.rubro);
      const tono = tonos[p.id % tonos.length];
      const verificado = p.verificacion.includes('identidad');

      const carta = document.createElement('article');
      carta.className = 'carta';
      carta.style.transform = `translateY(${profundidad * -8}px) scale(${1 - profundidad * 0.035})`;
      carta.style.zIndex = String(10 - profundidad);
      carta.style.opacity = profundidad > 1 ? '0.55' : '1';
      carta.innerHTML = `
        <span class="carta-marca marca-si">ME SIRVE</span>
        <span class="carta-marca marca-no">PASO</span>
        <span class="carta-demo">Perfil de muestra · persona no real</span>
        <div class="carta-foto">
          <img src="${p.foto}" alt="Foto de ${p.nombre}" loading="lazy">
          <span class="carta-glifo">${rubro.glifo}</span>
        </div>
        <div class="carta-cuerpo">
          <div class="carta-nombre">
            <h3>${p.nombre}</h3>
            ${verificado ? '<span class="sello" title="Verificado">✓</span>' : ''}
          </div>
          <p class="carta-meta">${rubro.nombre} · ${p.localidad}</p>
          <p class="carta-bio">${p.bio}</p>
          <div class="carta-pie">
            <div class="carta-puntaje"><b>${p.puntaje.toFixed(1)}</b><span>${p.trabajos} trabajos</span></div>
            <div class="carta-precio"><b>$${p.desde.toLocaleString('es-AR')}</b><span>desde</span></div>
          </div>
        </div>`;

      if (profundidad === 0) arrastrar(carta);
      cont.appendChild(carta);
    });
  }

  function arrastrar(carta) {
    let x0 = 0, y0 = 0, dx = 0, dy = 0, activo = false;
    const si = carta.querySelector('.marca-si');
    const no = carta.querySelector('.marca-no');

    const inicio = (e) => {
      activo = true;
      x0 = e.clientX; y0 = e.clientY;
      carta.setPointerCapture(e.pointerId);
      carta.style.transition = 'none';
    };

    const mover = (e) => {
      if (!activo) return;
      dx = e.clientX - x0;
      dy = e.clientY - y0;
      carta.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.055}deg)`;
      const fuerza = Math.min(1, Math.abs(dx) / 110);
      si.style.opacity = dx > 0 ? fuerza : 0;
      no.style.opacity = dx < 0 ? fuerza : 0;
    };

    const fin = () => {
      if (!activo) return;
      activo = false;
      carta.style.transition = 'transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.35s';
      if (Math.abs(dx) > 105) {
        volar(carta, dx > 0 ? 1 : -1);
      } else {
        carta.style.transform = '';
        si.style.opacity = 0; no.style.opacity = 0;
      }
      dx = 0; dy = 0;
    };

    carta.addEventListener('pointerdown', inicio);
    carta.addEventListener('pointermove', mover);
    carta.addEventListener('pointerup', fin);
    carta.addEventListener('pointercancel', fin);
  }

  function volar(carta, direccion) {
    carta.style.transition = 'transform 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.42s';
    carta.style.transform = `translate(${direccion * 620}px, 60px) rotate(${direccion * 26}deg)`;
    carta.style.opacity = '0';
    setTimeout(() => { indice++; pintar(); }, 300);
  }

  document.querySelectorAll('[data-demo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const arriba = cont.querySelector('.carta[style*="z-index: 10"]') ||
                     [...cont.querySelectorAll('.carta')].pop();
      if (arriba) volar(arriba, btn.dataset.demo === 'si' ? 1 : -1);
    });
  });

  pintar();
})();

/* ── Bloque de instalación ──────────────────────────────── */
(function bloqueInstalacion() {
  const guia = document.getElementById('guiaIOS');
  const accion = document.getElementById('instalarAccion');
  const titulo = document.getElementById('instalarTitulo');
  const porque = document.getElementById('instalarPorque');
  if (!accion) return;

  // Ya está instalada
  if (Instalar.yaInstalada) {
    titulo.textContent = 'Ya la tenés instalada.';
    porque.textContent = 'Estás usando Contratá Ya como app. Los avisos de match te van a llegar a la pantalla.';
    accion.innerHTML = '<a class="btn btn-plomo" href="/app.html">Abrir la app</a>';
    return;
  }

  // Navegador embebido (Instagram, Facebook, etc.)
  if (Instalar.esNavegadorEmbebido) {
    accion.innerHTML = `
      <div class="aviso-navegador">
        <p>Estás viendo esto dentro de otra app. Para poder instalarla, abrí Contratá Ya en ${Instalar.esIOS ? 'Safari' : 'Chrome'}.</p>
        <button class="btn btn-plomo btn-sm" id="copiarUrl">Copiar la dirección</button>
      </div>`;
    document.getElementById('copiarUrl').addEventListener('click', async (e) => {
      const ok = await Instalar.copiarDireccion();
      e.target.textContent = ok ? 'Copiada ✓' : 'Copiala de la barra de arriba';
    });
    if (Instalar.esIOS) guia.hidden = false;
    return;
  }

  // iPhone / iPad en Safari
  if (Instalar.esIOS) {
    guia.hidden = false;
    accion.innerHTML = '<a class="btn btn-fantasma" href="/app.html">Mientras tanto, abrir en el navegador</a>';
    return;
  }

  // Android / escritorio con soporte de instalación
  const pintarBoton = () => {
    accion.innerHTML = '<button class="btn btn-plomo" id="btnInstalar">Instalar Contratá Ya</button>';
    document.getElementById('btnInstalar').addEventListener('click', async () => {
      const ok = await Instalar.lanzarInstalacion();
      if (ok) {
        titulo.textContent = 'Listo, ya la tenés.';
        accion.innerHTML = '<a class="btn btn-plomo" href="/app.html">Abrir la app</a>';
      }
    });
  };

  if (Instalar.disponible) pintarBoton();
  document.addEventListener('instalacion:disponible', pintarBoton);

  if (!Instalar.disponible) {
    accion.innerHTML = '<a class="btn btn-plomo" href="/app.html">Abrir la app</a>';
  }
})();

/* ── Revelado al hacer scroll ───────────────────────────── */
(function revelar() {
  const objetivos = document.querySelectorAll('.revelar');
  if (!('IntersectionObserver' in window)) {
    objetivos.forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 55);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.14 });
  objetivos.forEach(el => obs.observe(el));
})();
