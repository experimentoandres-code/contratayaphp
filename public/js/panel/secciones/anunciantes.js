/* ============================================================
   CONTRATÁ YA — Panel · Anunciantes
   El inventario comercial: 14 localidades × 7 rubros, los
   contratos, los casilleros libres y la imagen de cada cartel.
   ============================================================ */

const ABONO_BASE = 80000;
const DIAS_POR_VENCER = 60;

async function verAnunciantes() {
  const { data: contratos, error } = await sb.from('contratos_publicidad')
    .select('*, anunciante:anunciantes!anunciante_id(*)')
    .eq('estado', 'activo');   // trae también la llave, para el enlace de canje
  if (error) throw error;

  // La grilla completa se arma acá: todo lo que no vuelve de la base, está libre.
  const ocupados = {};
  (contratos || []).forEach(c => { ocupados[`${c.localidad}|${c.rubro}`] = c; });

  const totalCasilleros = LOCALIDADES.length * RUBROS_COMERCIO.length;
  const colsGrilla = `168px repeat(${RUBROS_COMERCIO.length}, minmax(108px, 1fr))`;
  let libres = 0, porVencer = 0, facturacion = 0;
  LOCALIDADES.forEach(loc => RUBROS_COMERCIO.forEach(r => {
    const c = ocupados[`${loc}|${r.id}`];
    if (!c) { libres++; return; }
    facturacion += Number(c.abono || 0);
    if (diasHasta(c.hasta) <= DIAS_POR_VENCER) porVencer++;
  }));

  const casillero = (loc, rubro) => {
    const c = ocupados[`${loc}|${rubro.id}`];
    if (!c) {
      return `<button class="casillero c-libre" data-libre="${esc(loc)}|${esc(rubro.id)}">
        <b>Libre</b><span>${pesos(ABONO_BASE)} / mes</span></button>`;
    }
    const dias = diasHasta(c.hasta);
    const vence = dias <= DIAS_POR_VENCER;
    return `<button class="casillero ${vence ? 'c-vence' : 'c-ocupado'}" data-contrato="${esc(c.id)}">
      <b>${esc(c.anunciante?.nombre || 'Sin nombre')}</b>
      <span>${vence ? 'Vence' : 'Hasta'} ${fechaLarga(c.hasta)}</span></button>`;
  };

  $a('#cuerpo').innerHTML = `
    <div class="resumen-anuncios">
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Casilleros libres</div>
        <div class="metrica-valor" style="color:var(--plomo)">${libres}<span class="sufijo"> / ${totalCasilleros}</span></div>
      </div>
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Vencen en ${DIAS_POR_VENCER} días</div>
        <div class="metrica-valor" style="color:var(--coral)">${porVencer}</div>
      </div>
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Facturación mensual</div>
        <div class="metrica-valor">${pesos(facturacion)}</div>
      </div>
      <div class="leyenda">
        <span><i class="l-ocupado"></i>Ocupado</span>
        <span><i class="l-vence"></i>Por vencer</span>
        <span><i class="l-libre"></i>Libre</span>
      </div>
    </div>

    <div class="grilla-anuncios">
      <div class="grilla-fila grilla-encabezado" style="grid-template-columns:${colsGrilla}">
        <div></div>
        ${RUBROS_COMERCIO.map(r => `<div>${esc(r.nombre.toUpperCase())}</div>`).join('')}
      </div>
      ${LOCALIDADES.map(loc => `
        <div class="grilla-fila" style="margin-bottom:8px;grid-template-columns:${colsGrilla}">
          <div class="grilla-localidad">${esc(loc)}</div>
          ${RUBROS_COMERCIO.map(r => casillero(loc, r)).join('')}
        </div>`).join('')}
    </div>

    <div class="metrica-admin" style="margin-top:16px">
      <div class="panel-titulo">Comercios con casillero (${contratos.length})</div>
      <p class="metrica-nota" style="margin-bottom:12px">La misma información que la grilla, en lista: sirve para buscar un comercio por nombre y para leerla cómodo desde el teléfono.</p>
      <input id="aBuscar" type="search" placeholder="Buscar comercio, zona u oficio" autocomplete="off" style="width:100%;margin-bottom:12px">
      <div id="listaContratos">
        ${contratos.length ? contratos.slice().sort((x, y) =>
            String(x.anunciante?.nombre || '').localeCompare(String(y.anunciante?.nombre || ''))
          ).map(c => filaContrato(c)).join('')
          : '<p class="metrica-nota">Todavía no hay ningún casillero vendido.</p>'}
      </div>
    </div>

    <div id="sueltos"></div>`;

  const conectarLista = () => {
    document.querySelectorAll('[data-contrato-fila]').forEach(b => {
      b.addEventListener('click', () => {
        const c = contratos.find(x => x.id === b.dataset.contratoFila);
        if (c) fichaContrato(c);
      });
    });
  };
  conectarLista();

  $a('#aBuscar')?.addEventListener('input', () => {
    const t = normBuscar($a('#aBuscar').value);
    const vistos = contratos.filter(c => !t
      || normBuscar(c.anunciante?.nombre).includes(t)
      || normBuscar(c.localidad).includes(t)
      || normBuscar(RUBROS_COMERCIO.find(r => r.id === c.rubro)?.nombre).includes(t));
    $a('#listaContratos').innerHTML = vistos.length
      ? vistos.map(c => filaContrato(c)).join('')
      : '<p class="metrica-nota">Ningún comercio con ese nombre, zona u oficio.</p>';
    conectarLista();
  });

  await pintarSueltos();

  document.querySelectorAll('[data-libre]').forEach(b => {
    b.addEventListener('click', () => {
      const [loc, rubro] = b.dataset.libre.split('|');
      fichaCasilleroLibre(loc, rubro);
    });
  });

  document.querySelectorAll('[data-contrato]').forEach(b => {
    b.addEventListener('click', () => {
      const c = contratos.find(x => x.id === b.dataset.contrato);
      if (c) fichaContrato(c);
    });
  });
}

function filaContrato(c) {
  const dias = diasHasta(c.hasta);
  const vence = dias !== null && dias <= DIAS_POR_VENCER;
  const rubro = RUBROS_COMERCIO.find(r => r.id === c.rubro)?.nombre || c.rubro;
  return `
    <div class="rubro-fila fila-comercio" data-contrato-fila="${esc(c.id)}">
      <span>
        <b>${esc(c.anunciante?.nombre || 'Sin nombre')}</b>
        ${c.anunciante?.logo_url ? '' : ' <span class="pildora p-coral">Sin cartel</span>'}
        <br><span class="persona-fecha">${esc(c.localidad)} · ${esc(rubro)} · ${pesos(c.abono)} por mes</span>
      </span>
      <span class="pildora ${vence ? 'p-coral' : 'p-gris'}">${dias === null ? 'sin fecha' : dias > 0 ? 'vence en ' + dias + ' días' : 'vencido'}</span>
    </div>`;
}

// Comercios sin casillero. Antes sólo se veían entrando a la base.
async function pintarSueltos() {
  const cont = document.getElementById('sueltos');
  if (!cont) return;

  const { data, error } = await sb.rpc('anunciantes_sueltos');
  if (error || !data || !data.length) { cont.innerHTML = ''; return; }

  cont.innerHTML = `
    <div class="metrica-admin" style="margin-top:16px;border-color:var(--coral)">
      <div class="panel-titulo">Comercios sin casillero</div>
      <p class="metrica-nota" style="margin-bottom:14px">
        Quedaron cargados pero no ocupan ninguna posición, así que no los ve nadie.
        Asignales un casillero o borralos.
      </p>
      ${data.map(a => `
        <div class="rubro-fila">
          <span>${esc(a.nombre)} · ${esc(RUBROS_COMERCIO.find(r => r.id === a.rubro)?.nombre || a.rubro)}</span>
          <span class="acciones-celda">
            <button class="btn-mini" data-asignar="${esc(a.id)}">Asignar</button>
            <button class="btn-mini btn-mini-mal" data-borrar="${esc(a.id)}" data-nombre="${esc(a.nombre)}">Borrar</button>
          </span>
        </div>`).join('')}
    </div>`;

  cont.querySelectorAll('[data-borrar]').forEach(b => {
    b.addEventListener('click', () => borrarAnunciante(b.dataset.borrar, b.dataset.nombre));
  });

  cont.querySelectorAll('[data-asignar]').forEach(b => {
    b.addEventListener('click', () => {
      const a = data.find(x => x.id === b.dataset.asignar);
      fichaAsignar(a);
    });
  });
}

function fichaAsignar(a) {
  const enUnAnio = new Date();
  enUnAnio.setFullYear(enUnAnio.getFullYear() + 1);

  abrirFicha({
    rotulo: 'Asignar casillero',
    titulo: a.nombre,
    sub: `${RUBROS_COMERCIO.find(r => r.id === a.rubro)?.nombre || a.rubro} · elegí en qué localidad va`,
    html: `
      <label class="campo-admin"><span>Localidad</span>
        <select id="aLoc">${LOCALIDADES.map(l => `<option>${esc(l)}</option>`).join('')}</select></label>
      <label class="campo-admin"><span>Abono mensual</span>
        <input id="aAbono" type="number" value="${ABONO_BASE}"></label>
      <label class="campo-admin"><span>Contrato hasta</span>
        <input id="aHasta" type="date" value="${enUnAnio.toISOString().slice(0, 10)}"></label>`,
    acciones: [
      { texto: 'Asignar', clase: 'btn-admin', accion: async () => {
          const { error } = await sb.rpc('asignar_casillero', {
            p_anunciante: a.id,
            p_localidad: $a('#aLoc').value,
            p_hasta: $a('#aHasta').value,
            p_abono: Number($a('#aAbono').value) || ABONO_BASE
          });
          if (error) { brindis(error.message || 'No se pudo asignar'); return; }
          cerrarFicha();
          brindis('Casillero asignado');
          verAnunciantes();
        } }
    ]
  });
}


/* ── Imagen del cartel ───────────────────────────────────────
   El cartel es una franja apaisada, y las imágenes que manda un
   comercio vienen de cualquier forma: un logo cuadrado, una foto
   del local horizontal, una captura vertical de Instagram.

   Por eso hay dos modos y no uno solo. En un logo, recortar al
   centro suele comerse justo lo que hay que conservar; en una
   foto del local, en cambio, llenar la franja queda mucho mejor
   que dejar dos franjas de fondo a los costados.
   ─────────────────────────────────────────────────────────── */

const CARTEL_ANCHO = 960;
const CARTEL_ALTO  = 240;    // 4:1, la proporción de la franja

async function abrirImagenAnuncio(archivo) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(archivo); } catch (e) { /* seguimos */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir esa imagen')); };
    img.src = url;
  });
}

// modo 'llenar': recorta y ocupa toda la franja. Para fotos.
// modo 'entera': entra completa, con fondo a los costados. Para logos.
async function prepararCartel(archivo, modo, fondo) {
  const img = await abrirImagenAnuncio(archivo);
  if (!img.width || !img.height) throw new Error('La imagen está vacía o dañada');

  const lienzo = document.createElement('canvas');
  lienzo.width = CARTEL_ANCHO;
  lienzo.height = CARTEL_ALTO;
  const ctx = lienzo.getContext('2d');

  ctx.fillStyle = fondo || '#12222E';
  ctx.fillRect(0, 0, CARTEL_ANCHO, CARTEL_ALTO);

  const escalaLlenar = Math.max(CARTEL_ANCHO / img.width, CARTEL_ALTO / img.height);
  const escalaEntera = Math.min(CARTEL_ANCHO / img.width, CARTEL_ALTO / img.height);
  const e = modo === 'entera' ? escalaEntera : escalaLlenar;

  const ancho = img.width * e;
  const alto  = img.height * e;
  ctx.drawImage(img, (CARTEL_ANCHO - ancho) / 2, (CARTEL_ALTO - alto) / 2, ancho, alto);

  if (img.close) img.close();

  return new Promise((res, rej) => {
    lienzo.toBlob(b => b ? res(b) : rej(new Error('No se pudo procesar')), 'image/jpeg', 0.86);
  });
}

function fichaImagen(anuncianteId, nombre, urlActual) {
  abrirFicha({
    rotulo: 'Imagen del cartel',
    titulo: nombre || 'Anunciante',
    sub: 'Se recorta a la proporción de la franja. Elegí cómo entra según qué sea la imagen.',
    html: `
      <div class="vista-cartel" id="vistaCartel">
        ${urlActual ? `<img src="${esc(urlActual)}" alt="">` : '<span>Sin imagen</span>'}
      </div>

      <label class="campo-admin"><span>Cómo entra</span>
        <select id="modoCartel">
          <option value="llenar">Llenar la franja · para fotos del local</option>
          <option value="entera">Entera con fondo · para logos</option>
        </select></label>

      <label class="campo-admin"><span>Color de fondo</span>
        <input id="fondoCartel" type="color" value="#12222E" style="height:44px;padding:4px"></label>

      <input type="file" id="archivoCartel" accept="image/*" hidden>
      <button class="btn-admin-sec" id="elegirCartel" style="width:100%">Elegir imagen</button>
      <p class="metrica-nota" id="notaCartel" style="margin-top:10px">Queda en ${CARTEL_ANCHO}×${CARTEL_ALTO}, unos 60 KB.</p>`,
    acciones: urlActual
      ? [{ texto: 'Quitar la imagen', clase: 'btn-admin-mal',
           accion: () => guardarImagenAnuncio(anuncianteId, null) }]
      : []
  });

  const entrada = $a('#archivoCartel');
  $a('#elegirCartel').addEventListener('click', () => entrada.click());

  entrada.addEventListener('change', async () => {
    const archivo = entrada.files && entrada.files[0];
    if (!archivo) return;

    const nota = $a('#notaCartel');
    const boton = $a('#elegirCartel');
    boton.disabled = true;
    boton.textContent = 'Subiendo…';
    nota.textContent = 'Procesando…';

    try {
      const blob = await prepararCartel(archivo, $a('#modoCartel').value, $a('#fondoCartel').value);

      // Vista previa antes de que termine de subir: se ve enseguida.
      const previa = URL.createObjectURL(blob);
      $a('#vistaCartel').innerHTML = `<img src="${previa}" alt="">`;

      const ruta = `${anuncianteId}/cartel.jpg`;
      const { error } = await sb.storage.from('anuncios')
        .upload(ruta, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (error) throw new Error(error.message);

      const { data } = sb.storage.from('anuncios').getPublicUrl(ruta);
      await guardarImagenAnuncio(anuncianteId, `${data.publicUrl}?v=${Date.now()}`);

    } catch (e) {
      console.warn('[cartel]', e);
      boton.disabled = false;
      boton.textContent = 'Elegir imagen';
      nota.textContent = e.message || 'No se pudo subir';
      entrada.value = '';
    }
  });
}

async function guardarImagenAnuncio(id, url) {
  const { error } = await sb.rpc('guardar_imagen_anunciante', { p_id: id, p_url: url });
  if (error) { brindis(error.message || 'No se pudo guardar'); return; }
  cerrarFicha();
  brindis(url ? 'Imagen actualizada' : 'Imagen quitada');
  if (Panel.sec === 'creativos') verCreativos();
  else verAnunciantes();
}

function fichaCasilleroLibre(localidad, rubroId) {
  const rubro = RUBROS_COMERCIO.find(r => r.id === rubroId);
  const dentroDeUnAnio = new Date();
  dentroDeUnAnio.setFullYear(dentroDeUnAnio.getFullYear() + 1);

  abrirFicha({
    rotulo: `${rubro.nombre} · ${localidad}`,
    titulo: 'Casillero libre',
    sub: 'Un solo anunciante por localidad y rubro. Al cargarlo, este casillero queda tomado.',
    html: `
      <label class="campo-admin"><span>Nombre del comercio</span><input id="cNombre" placeholder="Ferretería El Tornillo"></label>
      <label class="campo-admin"><span>Beneficio para profesionales</span><input id="cBeneficio" placeholder="15% en herramientas"></label>
      <label class="campo-admin"><span>Letra chica del beneficio</span><input id="cLetra" placeholder="Presentando el perfil en el local"></label>
      <label class="campo-admin"><span>Contacto</span><input id="cContacto" placeholder="Nombre y apellido"></label>
      <label class="campo-admin"><span>Teléfono</span><input id="cTel" placeholder="2257 40-0000"></label>
      <label class="campo-admin"><span>Dirección del local</span><input id="cDir" placeholder="Av. Costanera 1240"></label>
      <label class="campo-admin"><span>Abono mensual</span><input id="cAbono" type="number" value="${ABONO_BASE}"></label>
      <label class="campo-admin"><span>Contrato hasta</span><input id="cHasta" type="date" value="${dentroDeUnAnio.toISOString().slice(0, 10)}"></label>`,
    acciones: [
      { texto: 'Cargar anunciante', clase: 'btn-admin', accion: () => guardarAnunciante(localidad, rubroId) }
    ]
  });
}

// Una sola llamada: el comercio y el contrato salen juntos o no sale
// ninguno. Antes eran dos pasos y si el segundo fallaba quedaba el
// comercio dando vueltas sin casillero.
async function guardarAnunciante(localidad, rubroId) {
  if (!$a('#cNombre').value.trim()) { brindis('Poné al menos el nombre del comercio'); return; }
  const boton = document.querySelector('#fichaAcciones .btn-admin');
  if (boton) { boton.disabled = true; boton.textContent = 'Guardando…'; }

  const { data, error } = await sb.rpc('crear_anunciante', {
    p_nombre:      $a('#cNombre').value.trim(),
    p_rubro:       rubroId,
    p_localidad:   localidad,
    p_hasta:       $a('#cHasta').value,
    p_abono:       Number($a('#cAbono').value) || ABONO_BASE,
    p_beneficio:   $a('#cBeneficio').value.trim(),
    p_letra_chica: $a('#cLetra').value.trim(),
    p_contacto:    $a('#cContacto').value.trim(),
    p_telefono:    $a('#cTel').value.trim(),
    p_direccion:   $a('#cDir').value.trim()
  });

  if (error) {
    if (boton) { boton.disabled = false; boton.textContent = 'Cargar anunciante'; }
    brindis(error.message || 'No se pudo cargar');
    return;
  }

  const llave = (typeof data === 'string' ? JSON.parse(data) : data)?.llave;
  cerrarFicha();
  verAnunciantes();

  // La dirección de acceso es lo primero que necesita el comerciante.
  if (llave) fichaLlave(localidad, llave);
  else brindis('Comercio cargado');
}

// Le muestra la dirección para pasarle por WhatsApp.
function fichaLlave(localidad, llave) {
  const url = `${location.origin}/canje.html?c=${llave}`;
  abrirFicha({
    rotulo: 'Anunciante cargado',
    titulo: 'Pasale este enlace',
    sub: 'Es su acceso al panel de canjes. No tiene usuario ni contraseña: esta dirección lo identifica.',
    html: `<label class="campo-admin">
             <span>Dirección del comercio</span>
             <textarea id="urlCanje" readonly style="min-height:88px">${esc(url)}</textarea>
           </label>`,
    acciones: [
      { texto: 'Copiar el enlace', clase: 'btn-admin', accion: async () => {
          try { await navigator.clipboard.writeText(url); brindis('Enlace copiado'); }
          catch { $a('#urlCanje').select(); brindis('Copialo a mano'); }
        } },
      { texto: 'Listo', clase: 'btn-admin-sec', accion: cerrarFicha }
    ]
  });
}

function fichaContrato(c) {
  const dias = diasHasta(c.hasta);
  abrirFicha({
    rotulo: `${RUBROS_COMERCIO.find(r => r.id === c.rubro)?.nombre} · ${c.localidad}`,
    titulo: c.anunciante?.nombre || 'Sin nombre',
    sub: c.anunciante?.beneficio || 'Sin beneficio cargado',
    datos: [
      ['Vence', fechaLarga(c.hasta)],
      ['Faltan', dias > 0 ? dias + ' días' : 'vencido'],
      ['Abono mensual', pesos(c.abono)],
      ['Contacto', c.anunciante?.contacto || 'Falta cargarlo'],
      ['Teléfono', c.anunciante?.telefono || 'Falta cargarlo'],
      ['Dirección', c.anunciante?.direccion || 'Falta cargarla: el profesional la usa para saber a dónde ir'],
      ['Letra chica', c.anunciante?.beneficio_letra_chica || '—'],
      ['Desde', fechaLarga(c.desde)]
    ],
    acciones: [
      { texto: 'Renovar por un año más', clase: 'btn-admin', accion: () => renovarContrato(c) },
      { texto: 'Editar los datos', clase: 'btn-admin-sec',
        accion: () => fichaEditar(c.anunciante) },
      { texto: 'Imagen del cartel', clase: 'btn-admin-sec',
        accion: () => fichaBanner(c.anunciante_id) },
      { texto: 'Creativo interstitial', clase: 'btn-admin-sec',
        accion: () => fichaInterstitial(null, c.anunciante_id) },
      { texto: 'Ver su enlace de canje', clase: 'btn-admin-sec',
        accion: () => fichaLlave(c.localidad, c.anunciante?.llave) },
      { texto: 'Liberar casillero', clase: 'btn-admin-mal', accion: () => liberarCasillero(c) },
      { texto: 'Borrar el comercio', clase: 'btn-admin-mal',
        accion: () => borrarAnunciante(c.anunciante_id, c.anunciante?.nombre) }
    ]
  });
}

async function borrarAnunciante(id, nombre) {
  if (!confirm(`¿Borrar ${nombre || 'este comercio'}?\n\nSe van con él su casillero, sus avisos de pantalla completa y todas las visitas que le registró el mostrador.\nSi sólo querés que deje de verse en la app, mejor liberá el casillero.\n\nEsto no se puede deshacer.`)) return;

  const { data, error } = await sb.rpc('borrar_anunciante', { p_id: id });
  if (error) { brindis(error.message || 'No se pudo borrar'); return; }

  const r = typeof data === 'string' ? JSON.parse(data) : data;
  cerrarFicha();
  brindis(r?.canjes_borrados
    ? `Borrado. Se perdieron ${r.canjes_borrados} visitas registradas.`
    : 'Comercio borrado');
  verAnunciantes();
}

function fichaEditar(a) {
  if (!a) return;
  abrirFicha({
    rotulo: 'Editar comercio',
    titulo: a.nombre,
    sub: 'La dirección la ve el profesional en la app, para saber a dónde ir.',
    html: `
      <label class="campo-admin"><span>Nombre</span><input id="eNombre" value="${esc(a.nombre || '')}"></label>
      <label class="campo-admin"><span>Dirección del local</span><input id="eDir" value="${esc(a.direccion || '')}" placeholder="Av. Costanera 1240"></label>
      <label class="campo-admin"><span>Beneficio</span><input id="eBenef" value="${esc(a.beneficio || '')}"></label>
      <label class="campo-admin"><span>Letra chica</span><input id="eLetra" value="${esc(a.beneficio_letra_chica || '')}"></label>
      <label class="campo-admin"><span>Contacto</span><input id="eContacto" value="${esc(a.contacto || '')}"></label>
      <label class="campo-admin"><span>Teléfono</span><input id="eTel" value="${esc(a.telefono || '')}"></label>`,
    acciones: [
      { texto: 'Guardar', clase: 'btn-admin', accion: async () => {
          const { error } = await sb.rpc('editar_anunciante', {
            p_id: a.id,
            p_nombre:      $a('#eNombre').value.trim(),
            p_direccion:   $a('#eDir').value.trim(),
            p_beneficio:   $a('#eBenef').value.trim(),
            p_letra_chica: $a('#eLetra').value.trim(),
            p_contacto:    $a('#eContacto').value.trim(),
            p_telefono:    $a('#eTel').value.trim()
          });
          if (error) { brindis(error.message || 'No se pudo guardar'); return; }
          cerrarFicha();
          brindis('Datos actualizados');
          verAnunciantes();
        } }
    ]
  });
}

async function renovarContrato(c) {
  const { data, error } = await sb.rpc('admin_contrato', { p_id: c.id, p_accion: 'renovar', p_meses: 12 });
  if (error) { brindis('No se pudo renovar: ' + error.message); return; }
  cerrarFicha();
  brindis('Renovado hasta ' + fechaLarga(data?.hasta));
  verAnunciantes();
}

async function liberarCasillero(c) {
  if (!confirm(
    `¿Liberar el casillero de ${c.anunciante?.nombre || 'este comercio'}?\n\n${c.localidad} · ${RUBROS_COMERCIO.find(r => r.id === c.rubro)?.nombre || c.rubro}\n\nEl comercio deja de verse en la app y la posición queda libre para vender. El comercio no se borra: podés volver a asignárselo.`
  )) return;
  const { error } = await sb.rpc('admin_contrato', { p_id: c.id, p_accion: 'liberar' });
  if (error) { brindis('No se pudo: ' + error.message); return; }
  cerrarFicha();
  brindis('Casillero liberado');
  verAnunciantes();
}




Panel.registrar('anunciantes', {
  titulo: 'Anunciantes',
  bajada: 'Inventario comercial · 14 localidades × 7 rubros',
  pintar: () => verAnunciantes()
});
