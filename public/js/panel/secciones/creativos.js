/* ============================================================
   CONTRATÁ YA — Panel · Creativos
   Los banners de la franja y los interstitials de pantalla
   completa: alta, recorte de la imagen, vista previa y borrado.
   ============================================================ */

const INTER_FONDOS = [
  { hex: '#F0A63A', tinta: '#1A0F02', boton: '#1A0F02', botonTinta: '#FFFFFF', nombre: 'Ámbar' },
  { hex: '#2FB2A6', tinta: '#02120F', boton: '#02120F', botonTinta: '#FFFFFF', nombre: 'Marea' },
  { hex: '#E4574C', tinta: '#180402', boton: '#180402', botonTinta: '#FFFFFF', nombre: 'Coral' },
  { hex: '#0B1620', tinta: '#F5EFE4', boton: '#F0A63A', botonTinta: '#1A0F02', nombre: 'Asfalto' }
];

const TINTAS_RAPIDAS = [
  { hex: '#1A0F02', nombre: 'Tinta' },
  { hex: '#F5EFE4', nombre: 'Crema' },
  { hex: '#FFFFFF', nombre: 'Blanco' },
  { hex: '#F0A63A', nombre: 'Ámbar' },
  { hex: '#02120F', nombre: 'Petróleo' },
  { hex: '#180402', nombre: 'Vino' }
];

function hexOk(h) {
  const s = String(h || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return '#' + s.slice(1).toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toUpperCase();
  }
  return null;
}

function oscurecerHex(hex, f) {
  const h = hexOk(hex) || '#F0A63A';
  const n = parseInt(h.slice(1), 16);
  const ch = (shift) => Math.max(0, Math.round(((n >> shift) & 255) * (1 - f)));
  return '#' + [ch(16), ch(8), ch(0)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function fondoDesdeHex(hex) {
  const h = hexOk(hex) || '#F0A63A';
  return `linear-gradient(160deg, ${h} 0%, ${oscurecerHex(h, 0.22)} 55%, ${oscurecerHex(h, 0.48)} 100%)`;
}

function hexDesdeFondo(fondo) {
  const m = String(fondo || '').match(/#([0-9a-fA-F]{6})/);
  return m ? '#' + m[1].toUpperCase() : '#F0A63A';
}

function parColor(idColor, idHex, hex) {
  const h = hexOk(hex);
  if (!h) return;
  const a = $a('#' + idColor);
  const b = $a('#' + idHex);
  if (a) a.value = h;
  if (b) b.value = h;
}

const AUDIENCIA_TXT = { pro: 'Profesionales', cliente: 'Clientes', todos: 'Todos' };

const INTER_ANCHO = 1080;
const INTER_ALTO  = 1920;
const INTER_MAX_MB = 8;
const INTER_VIDEO_SEG = 15;
const INTER_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4v'];

let _interPendiente = { blob: null, url: null, quitar: false, tipo: null, mime: 'image/jpeg', ext: 'jpg' };

function extDeUrl(url) {
  const u = String(url || '').split('?')[0];
  const m = u.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : '';
}

function tipoMedia(url, mime, forzado) {
  if (forzado) return forzado;
  const t = String(mime || '').toLowerCase();
  const e = extDeUrl(url);
  if (t.startsWith('video/') || t === 'application/mp4' || ['mp4', 'webm', 'mov', 'm4v'].includes(e)) return 'video';
  if (t === 'image/gif' || e === 'gif') return 'gif';
  if (url || t.startsWith('image/')) return 'imagen';
  return null;
}

function htmlCapaMedia(url, cls, forzado) {
  const t = tipoMedia(url, null, forzado);
  if (!url || !t) return '';
  const c = cls || 'inter-media';
  if (t === 'video') {
    return `<video class="${c}" src="${esc(url)}" autoplay muted loop playsinline webkit-playsinline></video>`;
  }
  return `<img class="${c}" src="${esc(url)}" alt="">`;
}

async function duracionVideo(archivo) {
  return new Promise((res) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    const terminar = (d) => {
      clearTimeout(t);
      try { URL.revokeObjectURL(v.src); } catch {}
      res(Number.isFinite(d) ? d : 0);
    };
    const t = setTimeout(() => terminar(0), 4000);
    v.onloadedmetadata = () => terminar(v.duration);
    v.onerror = () => terminar(0);
    v.src = URL.createObjectURL(archivo);
  });
}

async function prepararMediaInter(archivo) {
  const tipo = tipoMedia(archivo.name, archivo.type);
  if (tipo === 'video' || tipo === 'gif') {
    const mb = archivo.size / (1024 * 1024);
    if (mb > INTER_MAX_MB) {
      throw new Error('Pesa ' + mb.toFixed(1) + ' MB. El tope es ' + INTER_MAX_MB + ' MB.');
    }
    if (tipo === 'video') {
      const d = await duracionVideo(archivo);
      if (d > INTER_VIDEO_SEG) {
        throw new Error('El video dura ' + Math.round(d) + ' s. Tiene que ser de ' + INTER_VIDEO_SEG + ' s o menos.');
      }
    }
    const ext = tipo === 'gif' ? 'gif' : (extDeUrl(archivo.name) === 'webm' ? 'webm' : 'mp4');
    const mime = tipo === 'gif' ? 'image/gif' : (ext === 'webm' ? 'video/webm' : 'video/mp4');
    return { blob: archivo, tipo, mime, ext };
  }
  const blob = await prepararAfiche(archivo);
  return { blob, tipo: 'imagen', mime: 'image/jpeg', ext: 'jpg' };
}

async function limpiarMediaInter(id) {
  try {
    await sb.storage.from('anuncios').remove(INTER_EXTS.map(e => `inter/${id}.${e}`));
  } catch {}
}

async function verCreativos() {
  const [{ data: contratos, error: e1 }, { data: inters, error: e2 }] = await Promise.all([
    sb.from('contratos_publicidad')
      .select('*, anunciante:anunciantes!anunciante_id(*)')
      .eq('estado', 'activo'),
    sb.from('interstitials')
      .select('*, anunciante:anunciantes!anunciante_id(nombre)')
      .order('orden', { ascending: true })
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const listaC = contratos || [];
  const listaI = inters || [];
  const conImg = listaC.filter(c => c.anunciante?.logo_url).length;
  const activosI = listaI.filter(i => i.activo).length;

  $a('#cuerpo').innerHTML = `
    <div class="resumen-anuncios">
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Banners con imagen</div>
        <div class="metrica-valor">${conImg}<span class="sufijo"> / ${listaC.length}</span></div>
      </div>
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Interstitials activos</div>
        <div class="metrica-valor" style="color:var(--plomo)">${activosI}<span class="sufijo"> / ${listaI.length}</span></div>
      </div>
      <div class="tarjeta-anuncio">
        <div class="metrica-rotulo">Sin cartel</div>
        <div class="metrica-valor" style="color:var(--coral)">${listaC.length - conImg}</div>
      </div>
    </div>

    <div class="creativos-bloque">
      <div class="creativos-cabeza">
        <div>
          <div class="panel-titulo">Banners</div>
          <p class="metrica-nota">La franja 4:1 que ve el profesional según oficio y localidad. Se edita igual que un interstitial: textos, color, foto y enlace.</p>
        </div>
      </div>
      <div class="grilla-creativos">
        ${listaC.length ? listaC.map(c => tarjetaBanner(c)).join('') : `
          <p class="metrica-nota">No hay contratos activos. Cargá un anunciante en Anunciantes y después subile el cartel acá.</p>`}
      </div>
    </div>

    <div class="creativos-bloque">
      <div class="creativos-cabeza">
        <div>
          <div class="panel-titulo">Interstitials</div>
          <p class="metrica-nota">Pantalla completa, 2 segundos después de abrir la app. Si hay uno pagado para esa audiencia, pisa a los de casa. Si hay varios, rotan en el orden de esta lista.</p>
        </div>
        <button class="btn-admin" id="nuevoInter">Nuevo interstitial</button>
      </div>
      <div class="grilla-inter">
        ${listaI.length ? listaI.map(i => tarjetaInter(i)).join('') : `
          <p class="metrica-nota">Todavía no hay interstitials. El botón de arriba carga el primero.</p>`}
      </div>
    </div>`;

  document.querySelectorAll('[data-banner]').forEach(b => {
    b.addEventListener('click', () => {
      const c = listaC.find(x => x.id === b.dataset.banner);
      if (c) fichaBanner(c.anunciante_id);
    });
  });

  $a('#nuevoInter')?.addEventListener('click', () => fichaInterstitial(null));

  document.querySelectorAll('[data-inter]').forEach(b => {
    b.addEventListener('click', () => {
      const i = listaI.find(x => x.id === b.dataset.inter);
      if (i) fichaInterstitial(i);
    });
  });

  document.querySelectorAll('[data-toggle-inter]').forEach(b => {
    b.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      b.disabled = true;
      const { error } = await sb.rpc('guardar_interstitial', {
        p_id: b.dataset.toggleInter,
        p_activo: b.dataset.on !== '1'
      });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      verCreativos();
    });
  });

  // Los formatos nuevos, las marcas nacionales, la medición y los cupones
  // se agregan abajo de todo lo anterior. Si algo de eso falla, el banner y
  // el interstitial ya quedaron pintados y usables.
  await verFormatosNuevos();
}

function tarjetaBanner(c) {
  const a = c.anunciante || {};
  const rubro = RUBROS_COMERCIO.find(r => r.id === c.rubro)?.nombre || c.rubro;
  const falta = !a.logo_url && !a.banner_titulo && !a.banner_fondo;
  const titulo = a.banner_titulo || a.nombre || 'Sin nombre';
  const tinta = a.banner_tinta || '#F5EFE4';
  const fondo = a.banner_fondo || a.color || '#12222E';
  const estilo = a.logo_url
    ? `background-image:url('${esc(a.logo_url)}');background-size:cover;background-position:center;color:${esc(tinta)}`
    : `background:${esc(fondo)};color:${esc(tinta)}`;
  return `
    <button class="card-creativo ${falta ? 'falta' : ''}" data-banner="${esc(c.id)}" type="button">
      <div class="mini-banner ${a.logo_url ? 'con-foto' : ''}" style="${estilo}">
        ${a.logo_url ? '<span class="mini-banner-velo"></span>' : ''}
        <span class="mini-banner-txt">
          <em>${esc(a.banner_rotulo || 'Auspicia')}</em>
          <b>${esc(titulo)}</b>
        </span>
      </div>
      <div class="card-creativo-cuerpo">
        <b>${esc(a.nombre || 'Sin nombre')}</b>
        <span>${esc(c.localidad)} · ${esc(rubro)}</span>
        <span class="pildora ${falta ? 'p-coral' : 'p-verde'}">${falta ? 'Sin creativo' : 'Listo'}</span>
      </div>
    </button>`;
}

let _bannerPendiente = { blob: null, url: null, quitar: false };

function valoresBannerFicha() {
  const enlaceSel = $a('#bEnlace')?.value;
  const enlace = enlaceSel === 'url' ? ($a('#bUrl')?.value || '').trim() : enlaceSel;
  return {
    rotulo: ($a('#bRotulo')?.value || '').trim(),
    titulo: ($a('#bTitulo')?.value || '').trim(),
    cuerpo: ($a('#bCuerpo')?.value || '').trim(),
    fondo: fondoDesdeHex($a('#bColorFondo')?.value),
    tinta: hexOk($a('#bTinta')?.value) || '#F5EFE4',
    enlace: enlace === '' ? '' : enlace,
    imagen_url: _bannerPendiente.url
  };
}

function htmlPrevBanner(v) {
  const estilo = v.imagen_url
    ? `background-image:url('${esc(v.imagen_url)}');background-size:cover;background-position:center;color:${esc(v.tinta || '#F5EFE4')}`
    : `background:${esc(v.fondo)};color:${esc(v.tinta)}`;
  return `
    <div class="vista-banner-capa ${v.imagen_url ? 'con-foto' : ''}" style="${estilo}">
      <span class="vista-banner-cuerpo">
        <em>${esc(v.rotulo || 'Auspicia')}</em>
        <b>${esc(v.titulo || 'Nombre del comercio')}</b>
        <p>${esc(v.cuerpo || '')}</p>
      </span>
    </div>`;
}

function refrescarPrevBanner() {
  const caja = $a('#vistaBanner');
  if (!caja) return;
  caja.innerHTML = htmlPrevBanner(valoresBannerFicha());
}

async function fichaBanner(anuncianteId) {
  const { data: a, error } = await sb.from('anunciantes').select('*').eq('id', anuncianteId).maybeSingle();
  if (error || !a) { brindis(error?.message || 'No se encontró el anunciante'); return; }

  _bannerPendiente = { blob: null, url: a.logo_url || null, quitar: false };

  const colorFondo = hexDesdeFondo(a.banner_fondo) || hexOk(a.color) || '#F0A63A';
  const colorTinta = hexOk(a.banner_tinta) || '#1A0F02';
  const presetIdx = INTER_FONDOS.findIndex(f => f.hex === colorFondo && f.tinta === colorTinta);
  const enlacesFijos = ['buscar', 'beneficios', 'matches', 'perfil', '/#comercios', ''];
  const enlaceEsUrl = a.banner_enlace && !enlacesFijos.includes(a.banner_enlace);

  abrirFicha({
    rotulo: 'Editar banner',
    titulo: a.nombre || 'Banner',
    sub: 'Franja 4:1. Lo que ves en la vista previa es lo que ve el profesional en la app.',
    ancha: true,
    html: `
      <div class="vista-banner" id="vistaBanner"></div>

      <div class="paleta-creativo">
        <label class="campo-admin"><span>Paleta de partida</span>
          <select id="bPreset">
            <option value="">Personalizado</option>
            ${INTER_FONDOS.map((f, n) => `<option value="${n}" ${n === presetIdx ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('')}
          </select></label>
        <div class="colores-creativo">
          <label class="campo-color"><span>Fondo</span>
            <input type="color" id="bColorFondo" value="${esc(colorFondo)}">
            <input class="hex-corto" id="bColorFondoHex" value="${esc(colorFondo)}" maxlength="7" spellcheck="false"></label>
          <label class="campo-color"><span>Textos</span>
            <input type="color" id="bTinta" value="${esc(colorTinta)}">
            <input class="hex-corto" id="bTintaHex" value="${esc(colorTinta)}" maxlength="7" spellcheck="false"></label>
        </div>
      </div>

      <label class="campo-admin"><span>Rótulo</span>
        <input id="bRotulo" value="${esc(a.banner_rotulo || 'Auspicia')}" maxlength="24"></label>
      <label class="campo-admin"><span>Título</span>
        <input id="bTitulo" value="${esc(a.banner_titulo || a.nombre || '')}" maxlength="60"></label>
      <label class="campo-admin"><span>Cuerpo</span>
        <textarea id="bCuerpo" maxlength="120">${esc(a.banner_cuerpo || a.beneficio || '')}</textarea></label>

      <label class="campo-admin"><span>Adónde lleva el toque</span>
        <select id="bEnlace">
          <option value="" ${!a.banner_enlace ? 'selected' : ''}>Ningún enlace</option>
          <option value="buscar" ${a.banner_enlace === 'buscar' ? 'selected' : ''}>Buscar (app)</option>
          <option value="beneficios" ${a.banner_enlace === 'beneficios' ? 'selected' : ''}>Beneficios</option>
          <option value="matches" ${a.banner_enlace === 'matches' ? 'selected' : ''}>Matches</option>
          <option value="perfil" ${a.banner_enlace === 'perfil' ? 'selected' : ''}>Perfil</option>
          <option value="/#comercios" ${a.banner_enlace === '/#comercios' ? 'selected' : ''}>Landing · comercios</option>
          <option value="url" ${enlaceEsUrl ? 'selected' : ''}>Otra URL…</option>
        </select></label>
      <label class="campo-admin" id="bUrlWrap" ${enlaceEsUrl ? '' : 'hidden'}>
        <span>URL</span>
        <input id="bUrl" value="${esc(enlaceEsUrl ? a.banner_enlace : '')}" placeholder="https://…"></label>

      <label class="campo-admin"><span>Cómo entra la foto</span>
        <select id="bModo">
          <option value="llenar">Llenar la franja · para fotos del local</option>
          <option value="entera">Entera con fondo · para logos</option>
        </select></label>

      <input type="file" id="archivoBanner" accept="image/*" hidden>
      <button class="btn-admin-sec" id="elegirBanner" type="button" style="width:100%">
        ${a.logo_url ? 'Cambiar foto' : 'Subir foto (opcional)'}
      </button>
      <p class="metrica-nota" id="notaBanner" style="margin-top:10px">
        Sin foto se usa el color y el texto. Con foto, queda recortada a 960×240.
      </p>`,
    acciones: [
      { texto: 'Guardar', clase: 'btn-admin', accion: () => guardarFichaBanner(a.id) },
      ...(a.logo_url ? [{ texto: 'Quitar foto', clase: 'btn-admin-sec',
        accion: () => { _bannerPendiente = { blob: null, url: null, quitar: true }; refrescarPrevBanner(); brindis('Foto marcada para quitar. Guardá para confirmar.'); } }] : [])
    ]
  });

  refrescarPrevBanner();

  const syncUrl = () => {
    const wrap = $a('#bUrlWrap');
    if (wrap) wrap.hidden = $a('#bEnlace').value !== 'url';
  };
  [['bColorFondo', 'bColorFondoHex'], ['bTinta', 'bTintaHex']].forEach(([idC, idH]) => {
    $a('#' + idC)?.addEventListener('input', () => {
      parColor(idC, idH, $a('#' + idC).value);
      const preset = $a('#bPreset');
      if (preset) preset.value = '';
      refrescarPrevBanner();
    });
    $a('#' + idH)?.addEventListener('input', () => {
      const h = hexOk($a('#' + idH).value);
      if (!h) return;
      parColor(idC, idH, h);
      const preset = $a('#bPreset');
      if (preset) preset.value = '';
      refrescarPrevBanner();
    });
  });

  $a('#bPreset')?.addEventListener('change', () => {
    const p = INTER_FONDOS[Number($a('#bPreset').value)];
    if (!p) return;
    parColor('bColorFondo', 'bColorFondoHex', p.hex);
    parColor('bTinta', 'bTintaHex', p.tinta);
    refrescarPrevBanner();
  });

  ['bRotulo','bTitulo','bCuerpo','bEnlace','bUrl']
    .forEach(id => $a('#' + id)?.addEventListener('input', refrescarPrevBanner));
  $a('#bEnlace')?.addEventListener('change', () => { syncUrl(); refrescarPrevBanner(); });

  $a('#elegirBanner')?.addEventListener('click', () => $a('#archivoBanner').click());
  $a('#archivoBanner')?.addEventListener('change', async () => {
    const archivo = $a('#archivoBanner').files && $a('#archivoBanner').files[0];
    if (!archivo) return;
    const nota = $a('#notaBanner');
    const boton = $a('#elegirBanner');
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    try {
      const blob = await prepararCartel(archivo, $a('#bModo')?.value || 'llenar', $a('#bColorFondo')?.value || '#12222E');
      if (_bannerPendiente.url && _bannerPendiente.url.startsWith('blob:')) URL.revokeObjectURL(_bannerPendiente.url);
      _bannerPendiente = { blob, url: URL.createObjectURL(blob), quitar: false };
      boton.disabled = false;
      boton.textContent = 'Cambiar foto';
      nota.textContent = 'Foto lista. Guardá para publicarla.';
      refrescarPrevBanner();
    } catch (e) {
      boton.disabled = false;
      boton.textContent = 'Subir foto (opcional)';
      nota.textContent = e.message || 'No se pudo procesar';
    }
  });
}

async function guardarFichaBanner(id) {
  const v = valoresBannerFicha();
  const boton = document.querySelector('#fichaAcciones .btn-admin');
  if (boton) { boton.disabled = true; boton.textContent = 'Guardando…'; }

  const { error } = await sb.rpc('guardar_banner', {
    p_id: id,
    p_rotulo: v.rotulo,
    p_titulo: v.titulo,
    p_cuerpo: v.cuerpo,
    p_fondo: v.fondo,
    p_tinta: v.tinta,
    p_enlace: v.enlace,
    p_quitar_imagen: !!_bannerPendiente.quitar && !_bannerPendiente.blob
  });
  if (error) {
    if (boton) { boton.disabled = false; boton.textContent = 'Guardar'; }
    brindis(error.message || 'No se pudo guardar');
    return;
  }

  if (_bannerPendiente.blob) {
    try {
      const ruta = `${id}/cartel.jpg`;
      const { error: upErr } = await sb.storage.from('anuncios')
        .upload(ruta, _bannerPendiente.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from('anuncios').getPublicUrl(ruta);
      const { error: urlErr } = await sb.rpc('guardar_banner', {
        p_id: id,
        p_imagen_url: `${pub.publicUrl}?v=${Date.now()}`
      });
      if (urlErr) throw urlErr;
    } catch (e) {
      console.warn('[banner]', e);
      brindis('Se guardó el texto, pero la foto no subió: ' + (e.message || e));
      if (Panel.sec === 'creativos') verCreativos();
      else verAnunciantes();
      return;
    }
  }

  cerrarFicha();
  brindis('Banner actualizado');
  if (Panel.sec === 'creativos') verCreativos();
  else verAnunciantes();
}

function tarjetaInter(i) {
  const dueño = i.anunciante?.nombre || 'Contratá Ya · casa';
  const t = tipoMedia(i.imagen_url);
  const estilo = i.imagen_url
    ? `color:${esc(i.tinta || '#F5EFE4')}`
    : `background:${esc(i.fondo || '#12222E')};color:${esc(i.tinta || '#1A0F02')}`;
  return `
    <article class="card-inter ${i.activo ? '' : 'apagado'}">
      <button class="mini-inter" data-inter="${esc(i.id)}" type="button" style="${estilo}">
        ${htmlCapaMedia(i.imagen_url, 'inter-media')}
        ${i.imagen_url ? '<span class="mini-inter-velo"></span>' : ''}
        <span class="mini-inter-rotulo">${esc(i.rotulo || 'Publicidad')}${t === 'video' ? ' · video' : t === 'gif' ? ' · gif' : ''}</span>
        <b>${esc(i.titulo || 'Sin título')}</b>
      </button>
      <div class="card-creativo-cuerpo">
        <b>${esc(dueño)}</b>
        <span>${esc(AUDIENCIA_TXT[i.audiencia] || i.audiencia)}${i.localidad ? ' · ' + esc(i.localidad) : ' · todas las zonas'}</span>
        <span class="acciones-celda" style="margin-top:8px">
          <button class="btn-mini" data-toggle-inter="${esc(i.id)}" data-on="${i.activo ? '1' : '0'}">${i.activo ? 'Pausar' : 'Activar'}</button>
          <button class="btn-mini" data-inter="${esc(i.id)}">Editar</button>
        </span>
      </div>
    </article>`;
}

function valoresInterFicha() {
  const enlaceSel = $a('#iEnlace')?.value;
  const enlace = enlaceSel === 'url' ? ($a('#iUrl')?.value || '').trim() : enlaceSel;
  const casa = $a('#iCasa')?.value === 'casa';
  const tinta = hexOk($a('#iTinta')?.value) || '#1A0F02';
  return {
    anunciante: casa ? null : ($a('#iCasa')?.value || null),
    es_casa: casa,
    activo: $a('#iActivo')?.value === '1',
    audiencia: $a('#iAud')?.value || 'todos',
    fondo: fondoDesdeHex($a('#iColorFondo')?.value),
    tinta,
    boton_fondo: hexOk($a('#iBotonFondo')?.value) || tinta,
    boton_tinta: hexOk($a('#iBotonTinta')?.value) || '#FFFFFF',
    rotulo: ($a('#iRotulo')?.value || '').trim(),
    titulo: ($a('#iTitulo')?.value || '').trim(),
    cuerpo: ($a('#iCuerpo')?.value || '').trim(),
    boton: ($a('#iBoton')?.value || '').trim() || 'Ver más',
    enlace,
    localidad: $a('#iLoc')?.value || '',
    imagen_url: _interPendiente.url,
    media_tipo: _interPendiente.tipo
  };
}

function htmlPrevInter(v) {
  const estilo = v.imagen_url
    ? `color:${esc(v.tinta || '#F5EFE4')}`
    : `background:${esc(v.fondo)};color:${esc(v.tinta)}`;
  const btn = `background:${esc(v.boton_fondo || v.tinta || '#1A0F02')};color:${esc(v.boton_tinta || '#FFFFFF')}`;
  return `
    <div class="vista-inter-capa ${v.imagen_url ? 'con-foto' : ''}" style="${estilo}">
      ${htmlCapaMedia(v.imagen_url, 'inter-media', v.media_tipo)}
      <span class="vista-inter-pie">Publicidad</span>
      <div class="vista-inter-cuerpo">
        <span>${esc(v.rotulo || 'Contratá Ya')}</span>
        <b>${esc(v.titulo || 'Título del aviso')}</b>
        <p>${esc(v.cuerpo || '')}</p>
        <em style="${btn}">${esc(v.boton || 'Ver más')}</em>
      </div>
    </div>`;
}

function refrescarPrevInter() {
  const caja = $a('#vistaInter');
  if (!caja) return;
  caja.innerHTML = htmlPrevInter(valoresInterFicha());
}

async function fichaInterstitial(i, anunciantePrefill) {
  const { data: anunciantes } = await sb.from('anunciantes').select('id,nombre').order('nombre');
  const listaA = anunciantes || [];

  _interPendiente = {
    blob: null,
    url: i?.imagen_url || null,
    quitar: false,
    tipo: tipoMedia(i?.imagen_url),
    mime: null,
    ext: extDeUrl(i?.imagen_url) || 'jpg'
  };

  const colorFondo = hexDesdeFondo(i?.fondo);
  const colorTinta = hexOk(i?.tinta) || '#1A0F02';
  const colorBoton = hexOk(i?.boton_fondo) || colorTinta;
  const colorBotonTxt = hexOk(i?.boton_tinta) || '#FFFFFF';
  const presetIdx = INTER_FONDOS.findIndex(f => f.hex === colorFondo && f.tinta === colorTinta);
  const enlacesFijos = ['buscar', 'beneficios', 'matches', 'perfil', 'planes', 'avisos', '/#comercios'];
  const enlaceEsUrl = i?.enlace && !enlacesFijos.includes(i.enlace);
  const dueño = i
    ? (i.anunciante_id || 'casa')
    : (anunciantePrefill || 'casa');

  abrirFicha({
    rotulo: i ? 'Editar interstitial' : 'Nuevo interstitial',
    titulo: i?.titulo || 'Pantalla completa',
    sub: 'Se muestra a los 2 segundos de abrir la app, en cada sesión. Si hay uno de un comercio activo, pisa a los de casa. Si hay varios, rotan en orden.',
    ancha: true,
    html: `
      <div class="vista-inter" id="vistaInter"></div>

      <label class="campo-admin"><span>Quién lo paga</span>
        <select id="iCasa">
          <option value="casa">Contratá Ya (casa)</option>
          ${listaA.map(a => `<option value="${esc(a.id)}" ${dueño === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}
        </select></label>

      <label class="campo-admin"><span>A quién se le muestra</span>
        <select id="iAud">
          <option value="todos" ${i?.audiencia === 'todos' ? 'selected' : ''}>Todos</option>
          <option value="pro" ${i?.audiencia === 'pro' ? 'selected' : ''}>Sólo profesionales</option>
          <option value="cliente" ${i?.audiencia === 'cliente' ? 'selected' : ''}>Sólo clientes</option>
        </select></label>

      <label class="campo-admin"><span>Localidad</span>
        <select id="iLoc">
          <option value="">Todas las localidades</option>
          ${LOCALIDADES.map(l => `<option ${i?.localidad === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select></label>

      <div class="paleta-creativo">
        <label class="campo-admin"><span>Paleta de partida</span>
          <select id="iPreset">
            <option value="">Personalizado</option>
            ${INTER_FONDOS.map((f, n) => `<option value="${n}" ${n === presetIdx ? 'selected' : ''}>${esc(f.nombre)}</option>`).join('')}
          </select></label>
        <p class="metrica-nota" style="margin-bottom:10px">La paleta carga fondo, textos y botón. Después afiná cada color.</p>
        <div class="colores-creativo">
          <label class="campo-color"><span>Fondo</span>
            <input type="color" id="iColorFondo" value="${esc(colorFondo)}">
            <input class="hex-corto" id="iColorFondoHex" value="${esc(colorFondo)}" maxlength="7" spellcheck="false"></label>
          <label class="campo-color"><span>Textos</span>
            <input type="color" id="iTinta" value="${esc(colorTinta)}">
            <input class="hex-corto" id="iTintaHex" value="${esc(colorTinta)}" maxlength="7" spellcheck="false"></label>
          <label class="campo-color"><span>Botón</span>
            <input type="color" id="iBotonFondo" value="${esc(colorBoton)}">
            <input class="hex-corto" id="iBotonFondoHex" value="${esc(colorBoton)}" maxlength="7" spellcheck="false"></label>
          <label class="campo-color"><span>Texto del botón</span>
            <input type="color" id="iBotonTinta" value="${esc(colorBotonTxt)}">
            <input class="hex-corto" id="iBotonTintaHex" value="${esc(colorBotonTxt)}" maxlength="7" spellcheck="false"></label>
        </div>
        <div class="swatches-texto">
          <span>Textos rápidos</span>
          ${TINTAS_RAPIDAS.map(t => `
            <button type="button" class="swatch" data-tinta="${esc(t.hex)}" title="${esc(t.nombre)}"
              style="background:${esc(t.hex)}"></button>`).join('')}
        </div>
      </div>

      <label class="campo-admin"><span>Rótulo</span>
        <input id="iRotulo" value="${esc(i?.rotulo || 'Contratá Ya')}" maxlength="40"></label>
      <label class="campo-admin"><span>Título</span>
        <input id="iTitulo" value="${esc(i?.titulo || '')}" maxlength="80" placeholder="Tu próximo trabajo está a ocho cuadras"></label>
      <label class="campo-admin"><span>Cuerpo</span>
        <textarea id="iCuerpo" maxlength="280">${esc(i?.cuerpo || '')}</textarea></label>
      <label class="campo-admin"><span>Texto del botón</span>
        <input id="iBoton" value="${esc(i?.boton || 'Ver más')}" maxlength="40"></label>

      <label class="campo-admin"><span>Adónde lleva el botón</span>
        <select id="iEnlace">
          <option value="buscar" ${i?.enlace === 'buscar' ? 'selected' : ''}>Buscar (app)</option>
          <option value="beneficios" ${i?.enlace === 'beneficios' ? 'selected' : ''}>Beneficios</option>
          <option value="matches" ${i?.enlace === 'matches' ? 'selected' : ''}>Matches</option>
          <option value="perfil" ${i?.enlace === 'perfil' ? 'selected' : ''}>Perfil</option>
          <option value="planes" ${i?.enlace === 'planes' ? 'selected' : ''}>Ver el plan Pro</option>
          <option value="avisos" ${i?.enlace === 'avisos' ? 'selected' : ''}>Activar notificaciones</option>
          <option value="/#comercios" ${i?.enlace === '/#comercios' ? 'selected' : ''}>Landing · comercios</option>
          <option value="url" ${enlaceEsUrl ? 'selected' : ''}>Otra URL…</option>
        </select></label>
      <label class="campo-admin" id="iUrlWrap" ${enlaceEsUrl ? '' : 'hidden'}>
        <span>URL</span>
        <input id="iUrl" value="${esc(enlaceEsUrl ? i.enlace : '')}" placeholder="https://…"></label>

      <label class="campo-admin"><span>Estado</span>
        <select id="iActivo">
          <option value="1" ${i?.activo !== false ? 'selected' : ''}>Activo · se muestra</option>
          <option value="0" ${i?.activo === false ? 'selected' : ''}>Pausado</option>
        </select></label>

      <input type="file" id="archivoInter" accept=".mp4,.webm,.mov,.m4v,.gif,.jpg,.jpeg,.png,.webp,video/mp4,video/webm,image/gif,image/jpeg,image/png,image/webp" hidden>
      <button class="btn-admin-sec" id="elegirInter" type="button" style="width:100%">
        ${i?.imagen_url || _interPendiente.url ? 'Cambiar afiche / video' : 'Subir foto, GIF o video (opcional)'}
      </button>
      <p class="metrica-nota" id="notaInter" style="margin-top:10px">
        Foto, GIF o MP4. En el cuadro del archivo elegí «Todos los archivos» si no ves el video. Hasta ${INTER_MAX_MB} MB, video de ${INTER_VIDEO_SEG} s o menos.
      </p>
      <button class="btn-admin-sec" id="verInterPantalla" type="button" style="width:100%;margin-top:8px">Ver cómo queda</button>`,
    acciones: [
      { texto: 'Guardar', clase: 'btn-admin', accion: () => guardarFichaInter(i?.id) },
      ...(i?.imagen_url ? [{ texto: 'Quitar afiche', clase: 'btn-admin-sec',
        accion: () => { _interPendiente = { blob: null, url: null, quitar: true, tipo: null, mime: null, ext: 'jpg' }; refrescarPrevInter(); brindis('Afiche marcado para quitar. Guardá para confirmar.'); } }] : []),
      ...(i ? [{ texto: 'Borrar este interstitial', clase: 'btn-admin-mal',
        accion: () => borrarInterstitial(i.id, i.titulo) }] : [])
    ]
  });

  refrescarPrevInter();

  const syncUrl = () => {
    const wrap = $a('#iUrlWrap');
    if (wrap) wrap.hidden = $a('#iEnlace').value !== 'url';
  };
  const pares = [
    ['iColorFondo', 'iColorFondoHex'],
    ['iTinta', 'iTintaHex'],
    ['iBotonFondo', 'iBotonFondoHex'],
    ['iBotonTinta', 'iBotonTintaHex']
  ];
  pares.forEach(([idC, idH]) => {
    $a('#' + idC)?.addEventListener('input', () => {
      parColor(idC, idH, $a('#' + idC).value);
      const preset = $a('#iPreset');
      if (preset) preset.value = '';
      refrescarPrevInter();
    });
    $a('#' + idH)?.addEventListener('input', () => {
      const h = hexOk($a('#' + idH).value);
      if (!h) return;
      parColor(idC, idH, h);
      const preset = $a('#iPreset');
      if (preset) preset.value = '';
      refrescarPrevInter();
    });
  });

  $a('#iPreset')?.addEventListener('change', () => {
    const p = INTER_FONDOS[Number($a('#iPreset').value)];
    if (!p) return;
    parColor('iColorFondo', 'iColorFondoHex', p.hex);
    parColor('iTinta', 'iTintaHex', p.tinta);
    parColor('iBotonFondo', 'iBotonFondoHex', p.boton);
    parColor('iBotonTinta', 'iBotonTintaHex', p.botonTinta);
    refrescarPrevInter();
  });

  document.querySelectorAll('#fichaPanel [data-tinta]').forEach(b => {
    b.addEventListener('click', () => {
      parColor('iTinta', 'iTintaHex', b.dataset.tinta);
      const preset = $a('#iPreset');
      if (preset) preset.value = '';
      refrescarPrevInter();
    });
  });

  ['iCasa','iAud','iLoc','iRotulo','iTitulo','iCuerpo','iBoton','iEnlace','iUrl','iActivo']
    .forEach(id => $a('#' + id)?.addEventListener('input', refrescarPrevInter));
  $a('#iEnlace')?.addEventListener('change', () => { syncUrl(); refrescarPrevInter(); });
  $a('#iCasa')?.addEventListener('change', () => {
    const sel = $a('#iCasa');
    if (sel.value !== 'casa' && !$a('#iRotulo').value) {
      const a = listaA.find(x => x.id === sel.value);
      if (a) $a('#iRotulo').value = a.nombre;
    }
    refrescarPrevInter();
  });

  $a('#elegirInter')?.addEventListener('click', () => $a('#archivoInter').click());
  $a('#archivoInter')?.addEventListener('change', async () => {
    const archivo = $a('#archivoInter').files && $a('#archivoInter').files[0];
    if (!archivo) return;
    const nota = $a('#notaInter');
    const boton = $a('#elegirInter');
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    try {
      const media = await prepararMediaInter(archivo);
      if (_interPendiente.url && _interPendiente.url.startsWith('blob:')) URL.revokeObjectURL(_interPendiente.url);
      _interPendiente = {
        blob: media.blob,
        url: URL.createObjectURL(media.blob),
        quitar: false,
        tipo: media.tipo,
        mime: media.mime,
        ext: media.ext
      };
      boton.disabled = false;
      boton.textContent = 'Cambiar afiche / video';
      nota.textContent = media.tipo === 'video'
        ? 'Video listo (mudo, en loop). Guardá para publicarlo.'
        : media.tipo === 'gif'
          ? 'GIF listo. Guardá para publicarlo.'
          : 'Afiche listo. Guardá para publicarlo.';
      refrescarPrevInter();
      const vid = $a('#vistaInter video');
      if (vid) { vid.muted = true; vid.play().catch(() => {}); }
    } catch (e) {
      boton.disabled = false;
      boton.textContent = 'Subir foto, GIF o video (opcional)';
      nota.textContent = e.message || 'No se pudo procesar';
      brindis(e.message || 'No se pudo cargar el archivo');
    }
    $a('#archivoInter').value = '';
  });

  $a('#verInterPantalla')?.addEventListener('click', () => verInterPantalla(valoresInterFicha()));
}

async function prepararAfiche(archivo) {
  const img = await abrirImagenAnuncio(archivo);
  if (!img.width || !img.height) throw new Error('La imagen está vacía o dañada');
  const lienzo = document.createElement('canvas');
  lienzo.width = INTER_ANCHO;
  lienzo.height = INTER_ALTO;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#0B1620';
  ctx.fillRect(0, 0, INTER_ANCHO, INTER_ALTO);
  const e = Math.max(INTER_ANCHO / img.width, INTER_ALTO / img.height);
  const ancho = img.width * e;
  const alto  = img.height * e;
  ctx.drawImage(img, (INTER_ANCHO - ancho) / 2, (INTER_ALTO - alto) / 2, ancho, alto);
  if (img.close) img.close();
  return new Promise((res, rej) => {
    lienzo.toBlob(b => b ? res(b) : rej(new Error('No se pudo procesar')), 'image/jpeg', 0.84);
  });
}

async function guardarFichaInter(id) {
  const v = valoresInterFicha();
  if (!v.titulo) { brindis('Falta el título'); return; }

  const boton = document.querySelector('#fichaAcciones .btn-admin');
  if (boton) { boton.disabled = true; boton.textContent = 'Guardando…'; }

  const { data, error } = await sb.rpc('guardar_interstitial', {
    p_id: id || null,
    p_anunciante: v.anunciante,
    p_es_casa: v.es_casa,
    p_activo: v.activo,
    p_audiencia: v.audiencia,
    p_fondo: v.fondo,
    p_tinta: v.tinta,
    p_boton_fondo: v.boton_fondo,
    p_boton_tinta: v.boton_tinta,
    p_rotulo: v.rotulo,
    p_titulo: v.titulo,
    p_cuerpo: v.cuerpo,
    p_boton: v.boton,
    p_enlace: v.enlace,
    p_localidad: v.localidad,
    p_quitar_imagen: !!_interPendiente.quitar && !_interPendiente.blob
  });
  if (error) {
    if (boton) { boton.disabled = false; boton.textContent = 'Guardar'; }
    brindis(error.message || 'No se pudo guardar');
    return;
  }

  const r = typeof data === 'string' ? JSON.parse(data) : data;
  const guardadoId = r?.id || id;

  if (_interPendiente.quitar && !_interPendiente.blob && guardadoId) {
    await limpiarMediaInter(guardadoId);
  }

  if (_interPendiente.blob && guardadoId) {
    try {
      const ext = _interPendiente.ext || 'jpg';
      const mime = _interPendiente.mime || 'image/jpeg';
      await limpiarMediaInter(guardadoId);
      const ruta = `inter/${guardadoId}.${ext}`;
      const cuerpo = _interPendiente.blob instanceof File
        ? new Blob([_interPendiente.blob], { type: mime })
        : _interPendiente.blob;
      const { error: upErr } = await sb.storage.from('anuncios')
        .upload(ruta, cuerpo, { upsert: true, contentType: mime, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from('anuncios').getPublicUrl(ruta);
      const { error: urlErr } = await sb.rpc('guardar_interstitial', {
        p_id: guardadoId,
        p_imagen_url: `${pub.publicUrl}?v=${Date.now()}`
      });
      if (urlErr) throw urlErr;
    } catch (e) {
      console.warn('[inter]', e);
      const crudo = e.message || String(e);
      const tope = /maximum|too large|payload|file size|size limit/i.test(crudo);
      brindis(tope
        ? 'El video supera el tamaño máximo del servidor. Corré el SQL para subir el tope a 15 MB.'
        : 'Se guardó el texto, pero el archivo no subió: ' + crudo);
      if (Panel.sec === 'creativos') verCreativos();
      else verAnunciantes();
      return;
    }
  }

  cerrarFicha();
  brindis(id ? 'Interstitial actualizado' : 'Interstitial creado');
  if (Panel.sec === 'creativos') verCreativos();
  else verAnunciantes();
}

async function borrarInterstitial(id, titulo) {
  if (!confirm(`¿Borrar el interstitial «${titulo || 'sin título'}»?\n\nDeja de mostrarse en la app. No se puede deshacer.`)) return;
  const { error } = await sb.rpc('borrar_interstitial', { p_id: id });
  if (error) { brindis(error.message || 'No se pudo borrar'); return; }
  await limpiarMediaInter(id);
  cerrarFicha();
  brindis('Interstitial borrado');
  verCreativos();
}

function verInterPantalla(v) {
  document.getElementById('interAdminPrev')?.remove();
  const capa = document.createElement('div');
  capa.id = 'interAdminPrev';
  capa.className = 'inter-admin' + (v.imagen_url ? ' inter-admin-foto' : '');
  if (!v.imagen_url) capa.style.background = v.fondo;
  capa.style.setProperty('--tinta-inter', v.tinta || '#1A0F02');
  capa.style.setProperty('--boton-fondo', v.boton_fondo || v.tinta || '#1A0F02');
  capa.style.setProperty('--boton-tinta', v.boton_tinta || '#FFFFFF');
  capa.innerHTML = `
    ${htmlCapaMedia(v.imagen_url, 'inter-media', v.media_tipo)}
    <button class="inter-admin-cerrar" type="button" aria-label="Cerrar">✕</button>
    <div class="inter-admin-cuerpo">
      <span class="inter-admin-rotulo">${esc(v.rotulo || 'Contratá Ya')}</span>
      <h2>${esc(v.titulo || 'Título del aviso')}</h2>
      <p>${esc(v.cuerpo || '')}</p>
      <button class="inter-admin-boton" type="button">${esc(v.boton || 'Ver más')}</button>
    </div>
    <span class="inter-admin-pie">Publicidad · vista previa</span>`;
  document.body.appendChild(capa);
  const cerrar = () => capa.remove();
  capa.querySelector('.inter-admin-cerrar').addEventListener('click', cerrar);
  capa.querySelector('.inter-admin-boton').addEventListener('click', cerrar);
}




/* ============================================================
   FORMATOS NUEVOS — mazo, cierre, marca de rubro, cupón y vacío
   ------------------------------------------------------------
   Todo lo de abajo cuelga de lib/rpc_avisos.php y de las tablas
   marcas / formatos_avisos / avisos_vistas / cupones_marca.
   El banner y el interstitial de más arriba siguen igual.
   Porqués y precios: planificacion/marketing/13-formatos-publicidad.md
   ============================================================ */

const FORMATOS_AV = [
  { id: 'mazo',   nombre: 'Tarjeta en el mazo',
    ayuda: 'Sale cada 4 deslizamientos, con la forma de una carta. No se desliza: se lee y se cierra.' },
  { id: 'cierre', nombre: 'Al cerrar un trabajo',
    ayuda: 'Justo después de calificar. Es el momento de mayor intención que tiene la app.' },
  { id: 'rubro',  nombre: 'Marca de rubro',
    ayuda: 'Una marca auspicia un oficio en todo el partido. Va debajo de la franja del comercio: no pisa el casillero.' },
  { id: 'cupon',  nombre: 'Cupón de marca',
    ayuda: 'Código único por persona, con vencimiento. Se canjea en el mostrador con la llave que ya existe.' },
  { id: 'vacio',  nombre: 'Mazo vacío',
    ayuda: 'La pantalla de “no hay pedidos”, que hoy no vende nada y es de las más vistas.' }
];

const FORMATO_TXT = Object.fromEntries(FORMATOS_AV.map(f => [f.id, f.nombre]));

const SUPERFICIE_TXT = Object.assign({}, FORMATO_TXT, {
  interstitial: 'Interstitial', franja: 'Franja del comercio', sugerido: 'Proveedor sugerido'
});

/* Lo que se trajo la última vez, para no volver a pedirlo al abrir una ficha. */
let _av = { formatos: [], marcas: [], medicion: null, cupones: [] };

const avPct = (parte, total) => total ? (parte * 100 / total).toFixed(1) + '%' : '—';

function avListaJson(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) { try { return JSON.parse(v) || []; } catch (e) { return []; } }
  return [];
}

function resumenApunte(f) {
  const locs = avListaJson(f.localidades);
  const ofis = avListaJson(f.oficios);
  const partes = [
    AUDIENCIA_TXT[f.audiencia] || 'Todos',
    locs.length ? (locs.length === 1 ? locs[0] : locs.length + ' localidades') : 'Todo el partido',
    ofis.length ? (ofis.length === 1 ? nombreRubro(ofis[0]) : ofis.length + ' oficios') : 'Todos los oficios'
  ];
  return partes.join(' · ');
}


/* ── Pintado ──────────────────────────────────────────────── */

async function verFormatosNuevos() {
  const [fmt, marcas, med, cup] = await Promise.all([
    sb.rpc('admin_formatos', { p_dias: Panel.dias || 30 }),
    sb.rpc('admin_marcas'),
    sb.rpc('admin_medicion', { p_dias: Panel.dias || 30 }),
    sb.rpc('admin_cupones')
  ]);
  for (const r of [fmt, marcas, med, cup]) if (r.error) throw r.error;

  _av = { formatos: fmt.data || [], marcas: marcas.data || [],
          medicion: med.data || null, cupones: cup.data || [] };

  const cuerpo = $a('#cuerpo');
  if (!cuerpo) return;
  cuerpo.insertAdjacentHTML('beforeend',
    bloqueMedicion() + bloqueMarcas() + bloqueFormatos() + bloqueCupones());
  engancharFormatos();
}

function bloqueMedicion() {
  const m = _av.medicion;
  if (!m) return '';
  const total = m.superficies.reduce((a, s) => a + s.vistas, 0);
  const toques = m.superficies.reduce((a, s) => a + s.toques, 0);
  const personas = m.superficies.reduce((a, s) => a + s.personas, 0);

  return `
    <div class="creativos-bloque">
      <div class="creativos-cabeza">
        <div>
          <div class="panel-titulo">Medición</div>
          <p class="metrica-nota">Impresiones y toques de las ocho superficies, últimos ${m.dias} días.
            Una impresión se cuenta cuando el aviso se vio de verdad, no cuando se insertó.
            Esto es lo que se le muestra al comercio cuando pregunta cuánta gente vio su aviso.</p>
        </div>
        <button class="btn-admin" id="avSoloPro">Poner los avisos de comercio en «sólo pro»</button>
      </div>

      <div class="resumen-anuncios">
        <div class="tarjeta-anuncio">
          <div class="metrica-rotulo">Impresiones</div>
          <div class="metrica-valor">${num(total)}</div>
        </div>
        <div class="tarjeta-anuncio">
          <div class="metrica-rotulo">Toques</div>
          <div class="metrica-valor" style="color:var(--plomo)">${num(toques)}<span class="sufijo"> · ${avPct(toques, total)}</span></div>
        </div>
        <div class="tarjeta-anuncio">
          <div class="metrica-rotulo">Personas alcanzadas</div>
          <div class="metrica-valor" style="color:var(--marea)">${num(personas)}</div>
        </div>
      </div>

      <div class="tabla" style="margin-bottom:16px">
        <div class="tabla-encabezado" style="grid-template-columns:1.4fr .8fr .8fr .8fr .8fr">
          <div>Superficie</div><div>Impresiones</div><div>Toques</div><div>Toque cada</div><div>Personas</div>
        </div>
        ${m.superficies.length ? m.superficies.map(s => `
          <div class="tabla-fila" style="grid-template-columns:1.4fr .8fr .8fr .8fr .8fr;cursor:default">
            <div class="celda-corta">${esc(SUPERFICIE_TXT[s.superficie] || s.superficie)}</div>
            <div class="dato">${num(s.vistas)}</div>
            <div class="dato">${num(s.toques)}</div>
            <div class="dato">${avPct(s.toques, s.vistas)}</div>
            <div class="dato">${num(s.personas)}</div>
          </div>`).join('') : `
          <div class="tabla-fila" style="cursor:default"><div class="metrica-nota">
            Todavía no se midió nada. Las llamadas se enganchan desde app.js: las líneas exactas
            están en planificacion/marketing/13-formatos-publicidad.md</div></div>`}
      </div>

      ${m.creativos.length ? `
      <div class="tabla">
        <div class="tabla-encabezado" style="grid-template-columns:1.6fr 1fr .8fr .7fr .7fr">
          <div>Creativo</div><div>Quién paga</div><div>Superficie</div><div>Impresiones</div><div>Toques</div>
        </div>
        ${m.creativos.slice(0, 12).map(c => `
          <div class="tabla-fila" style="grid-template-columns:1.6fr 1fr .8fr .7fr .7fr;cursor:default">
            <div class="celda-corta">${esc(c.titulo)}</div>
            <div class="celda-corta">${esc(c.quien)}</div>
            <div class="celda-corta">${esc(SUPERFICIE_TXT[c.superficie] || c.superficie)}</div>
            <div class="dato">${num(c.vistas)}</div>
            <div class="dato">${num(c.toques)}</div>
          </div>`).join('')}
      </div>` : ''}
    </div>`;
}

function bloqueMarcas() {
  return `
    <div class="creativos-bloque">
      <div class="creativos-cabeza">
        <div>
          <div class="panel-titulo">Marcas nacionales</div>
          <p class="metrica-nota">Un corralón de San Bernardo paga $80.000. Una marca de cemento paga
            diez veces eso por llegarle a los mismos profesionales, y no le compite: le vende a través
            de él. Las marcas no ocupan casillero.</p>
        </div>
        <button class="btn-admin" id="avNuevaMarca">Nueva marca</button>
      </div>
      <div class="grilla-creativos">
        ${_av.marcas.length ? _av.marcas.map(m => `
          <button class="card-creativo" data-av-marca="${esc(m.id)}" type="button">
            <div class="mini-banner" style="background:${esc(m.color || '#12222E')};color:#0B1620">
              <span class="mini-banner-txt"><em>${esc(m.rubro_marca || 'Marca')}</em><b>${esc(m.nombre)}</b></span>
            </div>
            <div class="card-creativo-cuerpo">
              <b>${esc(m.nombre)}</b>
              <span>${m.abono ? pesos(m.abono) + ' por temporada' : 'Sin abono cargado'}</span>
              <span class="pildora ${m.estado === 'activa' ? 'p-verde' : 'p-gris'}">${esc(m.estado || 'activa')} · ${m.creativos} creativo(s)</span>
            </div>
          </button>`).join('') : `
          <p class="metrica-nota">Todavía no hay ninguna marca cargada. El botón de arriba carga la primera.</p>`}
      </div>
    </div>`;
}

function bloqueFormatos() {
  const porFormato = FORMATOS_AV.map(f => ({
    ...f, lista: _av.formatos.filter(x => x.formato === f.id)
  }));

  return `
    <div class="creativos-bloque">
      <div class="creativos-cabeza">
        <div>
          <div class="panel-titulo">Formatos nuevos</div>
          <p class="metrica-nota">Cada uno se apunta por rol, localidad y oficio, y tiene tope por día
            y por persona. Todos salen con el sello «Publicidad» a la vista: es lo que evita que la app
            se vuelva un folleto.</p>
        </div>
        <button class="btn-admin" id="avNuevoFormato">Nuevo aviso</button>
      </div>

      ${porFormato.map(g => `
        <div style="margin-bottom:18px">
          <p class="metrica-nota" style="margin-bottom:8px">
            <b style="color:var(--cal)">${esc(g.nombre)}</b> — ${esc(g.ayuda)}</p>
          <div class="grilla-creativos">
            ${g.lista.length ? g.lista.map(f => tarjetaFormato(f)).join('')
              : `<p class="metrica-nota">Sin avisos de este formato.</p>`}
          </div>
        </div>`).join('')}
    </div>`;
}

function tarjetaFormato(f) {
  const fondo = f.fondo || '#12222E';
  const tinta = f.tinta || '#EDE7DA';
  return `
    <div class="card-creativo ${f.activo ? '' : 'falta'}" style="cursor:default">
      <button class="mini-banner" data-av-formato="${esc(f.id)}" type="button"
              style="background:${esc(fondo)};color:${esc(tinta)};width:100%;text-align:left">
        <span class="mini-banner-txt">
          <em>${esc(f.rotulo || 'Publicidad')}</em>
          <b>${esc(f.titulo || 'Sin título')}</b>
        </span>
      </button>
      <div class="card-creativo-cuerpo">
        <b>${esc(f.patrocinador)}</b>
        <span>${esc(resumenApunte(f))}</span>
        <span>Tope ${f.tope_dia ? f.tope_dia + '/día por persona' : 'sin tope'}${f.tope_total ? ' · ' + f.tope_total + ' en total' : ''}</span>
        <span class="dato" style="font-size:11px;color:var(--cal-3)">
          ${num(f.vistas)} impresiones · ${num(f.toques)} toques · ${avPct(f.toques, f.vistas)}
          ${f.formato === 'cupon' ? ` · ${num(f.cupones)} cupones, ${num(f.cupones_usados)} usados` : ''}
        </span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <span class="pildora ${f.activo ? 'p-verde' : 'p-gris'}">${f.activo ? 'Activo' : 'Apagado'}</span>
          <button class="btn-mini" data-av-toggle="${esc(f.id)}" data-on="${f.activo ? '1' : '0'}">
            ${f.activo ? 'Apagar' : 'Prender'}</button>
          <button class="btn-mini" data-av-formato="${esc(f.id)}">Editar</button>
        </div>
      </div>
    </div>`;
}

function bloqueCupones() {
  const c = _av.cupones;
  const usados = c.filter(x => x.usado_en).length;
  const facturado = c.reduce((a, x) => a + (x.monto || 0), 0);
  if (!c.length) return '';
  return `
    <div class="creativos-bloque">
      <div class="creativos-cabeza">
        <div>
          <div class="panel-titulo">Cupones de marca</div>
          <p class="metrica-nota">${num(c.length)} tomados, ${num(usados)} canjeados en el mostrador
            (${avPct(usados, c.length)})${facturado ? ` · ${pesos(facturado)} en compras cargadas` : ''}.
            Un cupón canjeado no es una impresión: es una persona que fue hasta el local.</p>
        </div>
      </div>
      <div class="tabla">
        <div class="tabla-encabezado" style="grid-template-columns:.9fr 1.2fr 1.1fr 1fr .9fr">
          <div>Código</div><div>Marca y promo</div><div>Quién</div><div>Dónde lo usó</div><div>Estado</div>
        </div>
        ${c.slice(0, 25).map(x => {
          const vencido = !x.usado_en && x.vence && new Date(x.vence) < new Date();
          return `
          <div class="tabla-fila" style="grid-template-columns:.9fr 1.2fr 1.1fr 1fr .9fr;cursor:default">
            <div class="dato celda-corta">${esc(x.codigo)}</div>
            <div class="celda-corta">${esc(x.marca || '—')} · ${esc(x.titulo || '')}</div>
            <div class="celda-corta">${esc(x.persona || '—')}${x.localidad ? ' · ' + esc(x.localidad) : ''}</div>
            <div class="celda-corta">${esc(x.comercio || '—')}${x.monto ? ' · ' + pesos(x.monto) : ''}</div>
            <div><span class="pildora ${x.usado_en ? 'p-verde' : (vencido ? 'p-coral' : 'p-ambar')}">
              ${x.usado_en ? 'Canjeado ' + fechaCorta(x.usado_en) : (vencido ? 'Venció' : 'Vence ' + fechaCorta(x.vence))}
            </span></div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}


/* ── Enganches ────────────────────────────────────────────── */

function engancharFormatos() {
  $a('#avNuevaMarca')?.addEventListener('click', () => fichaMarca(null));
  $a('#avNuevoFormato')?.addEventListener('click', () => fichaFormato(null));

  $a('#avSoloPro')?.addEventListener('click', async (ev) => {
    const b = ev.currentTarget;
    if (!confirm('Mejora 7: todo aviso de un comercio pasa a mostrarse SÓLO a profesionales.\n\n'
      + 'El cliente no compra materiales: mostrarle el corralón es gastar la impresión que pagó otro.\n\n'
      + '¿Lo aplico?')) return;
    b.disabled = true;
    const { data, error } = await sb.rpc('avisos_solo_pro');
    b.disabled = false;
    if (error) { brindis(error.message || 'No se pudo'); return; }
    brindis(`Listo: ${data.interstitials} interstitial(es) y ${data.formatos} aviso(s) en «sólo pro»`);
    verCreativos();
  });

  document.querySelectorAll('[data-av-marca]').forEach(b => {
    b.addEventListener('click', () => {
      const m = _av.marcas.find(x => x.id === b.dataset.avMarca);
      if (m) fichaMarca(m);
    });
  });

  document.querySelectorAll('[data-av-formato]').forEach(b => {
    b.addEventListener('click', () => {
      const f = _av.formatos.find(x => x.id === b.dataset.avFormato);
      if (f) fichaFormato(f);
    });
  });

  document.querySelectorAll('[data-av-toggle]').forEach(b => {
    b.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      b.disabled = true;
      const { error } = await sb.rpc('guardar_formato', {
        p_id: b.dataset.avToggle, p_activo: b.dataset.on !== '1'
      });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      verCreativos();
    });
  });
}


/* ── Ficha de una marca ───────────────────────────────────── */

async function fichaMarca(m) {
  abrirFicha({
    rotulo: m ? 'Editar marca' : 'Nueva marca',
    titulo: m?.nombre || 'Marca nacional',
    sub: 'No ocupa casillero y no compite con el comercio local: le vende a través de él. '
       + 'Lo que compra es acceso a una audiencia que no se consigue de otra forma.',
    html: `
      <label class="campo-admin"><span>Nombre</span>
        <input id="mkNombre" value="${esc(m?.nombre || '')}" maxlength="60" placeholder="Cemento Pampa"></label>
      <label class="campo-admin"><span>Qué vende</span>
        <input id="mkRubro" value="${esc(m?.rubro_marca || '')}" maxlength="40" placeholder="cemento, pinturas, membranas…"></label>
      <label class="campo-admin"><span>Color de la marca</span>
        <input type="color" id="mkColor" value="${esc(hexOk(m?.color) || '#8C8C8C')}"></label>
      <label class="campo-admin"><span>Logo (URL)</span>
        <input id="mkLogo" value="${esc(m?.logo_url || '')}" placeholder="/img/marcas/…"></label>
      <label class="campo-admin"><span>Sitio</span>
        <input id="mkSitio" value="${esc(m?.sitio || '')}" placeholder="https://…"></label>
      <label class="campo-admin"><span>Contacto comercial</span>
        <input id="mkContacto" value="${esc(m?.contacto || '')}"></label>
      <label class="campo-admin"><span>Abono por temporada (pesos)</span>
        <input type="number" id="mkAbono" value="${Number(m?.abono || 0)}" min="0" step="10000"></label>
      <label class="campo-admin"><span>Estado</span>
        <select id="mkEstado">
          ${['activa', 'pausada', 'vencida'].map(e =>
            `<option value="${e}" ${m?.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select></label>
      <label class="campo-admin"><span>Desde</span>
        <input type="date" id="mkDesde" value="${esc((m?.desde || '').slice(0, 10))}"></label>
      <label class="campo-admin"><span>Hasta</span>
        <input type="date" id="mkHasta" value="${esc((m?.hasta || '').slice(0, 10))}"></label>
      <label class="campo-admin"><span>Nota interna</span>
        <textarea id="mkNota" maxlength="400">${esc(m?.nota || '')}</textarea></label>`,
    acciones: [
      { texto: m ? 'Guardar' : 'Crear la marca', clase: 'btn-admin', accion: () => guardarMarca(m?.id) },
      ...(m ? [{ texto: 'Borrar', clase: 'btn-admin-mal', accion: () => borrarMarca(m) }] : [])
    ]
  });
}

async function guardarMarca(id) {
  const fecha = (v) => v ? v + 'T12:00:00.000Z' : '';
  const args = {
    p_id: id || null,
    p_nombre:   $a('#mkNombre').value.trim(),
    p_rubro:    $a('#mkRubro').value.trim(),
    p_color:    $a('#mkColor').value,
    p_logo:     $a('#mkLogo').value.trim() || null,
    p_sitio:    $a('#mkSitio').value.trim(),
    p_contacto: $a('#mkContacto').value.trim(),
    p_abono:    Number($a('#mkAbono').value || 0),
    p_estado:   $a('#mkEstado').value,
    p_desde:    fecha($a('#mkDesde').value),
    p_hasta:    fecha($a('#mkHasta').value),
    p_nota:     $a('#mkNota').value.trim()
  };
  if (!args.p_nombre) { brindis('Falta el nombre de la marca'); return; }
  const { error } = await sb.rpc('guardar_marca', args);
  if (error) { brindis(error.message || 'No se pudo guardar'); return; }
  cerrarFicha();
  brindis(id ? 'Marca actualizada' : 'Marca creada');
  verCreativos();
}

async function borrarMarca(m) {
  if (!confirm(`¿Borrar la marca «${m.nombre}»?\n\nSi tiene creativos cargados hay que borrarlos primero.`)) return;
  const { error } = await sb.rpc('borrar_marca', { p_id: m.id });
  if (error) { brindis(error.message || 'No se pudo borrar'); return; }
  cerrarFicha();
  brindis('Marca borrada');
  verCreativos();
}


/* ── Ficha de un creativo ─────────────────────────────────── */

function avCasillas(id, opciones, elegidas) {
  const sel = new Set(elegidas || []);
  return `<div class="swatches-texto" style="flex-wrap:wrap;gap:6px" id="${id}">
    ${opciones.map(o => `
      <label class="pildora ${sel.has(o.id) ? 'p-verde' : 'p-gris'}"
             style="cursor:pointer;display:inline-flex;gap:5px;align-items:center;padding:5px 9px">
        <input type="checkbox" value="${esc(o.id)}" ${sel.has(o.id) ? 'checked' : ''}
               style="margin:0;width:13px;height:13px">
        ${esc(o.nombre)}
      </label>`).join('')}
  </div>`;
}

const avMarcadas = (id) => Array.from(
  document.querySelectorAll(`#${id} input:checked`)).map(i => i.value);

async function fichaFormato(f) {
  const { data: comercios } = await sb.from('anunciantes').select('id,nombre').order('nombre');
  const listaC = comercios || [];
  const listaM = _av.marcas.length ? _av.marcas : ((await sb.rpc('admin_marcas')).data || []);

  const formato = f?.formato || 'mazo';
  const dueño = f?.marca_id ? 'm:' + f.marca_id : (f?.anunciante_id ? 'c:' + f.anunciante_id : 'casa');
  const colorFondo = hexOk(f?.fondo) || '#12222E';
  const colorTinta = hexOk(f?.tinta) || '#EDE7DA';
  const enlacesFijos = ['buscar', 'beneficios', 'matches', 'perfil', 'jugar', 'planes', 'avisos'];
  const enlaceEsUrl = f?.enlace && !enlacesFijos.includes(f.enlace);

  abrirFicha({
    rotulo: f ? 'Editar aviso' : 'Nuevo aviso',
    titulo: f?.titulo || 'Formato nuevo',
    sub: 'Se apunta por rol, localidad y oficio, y se le pone tope por día y por persona. '
       + 'El sello «Publicidad» lo pone la app sola y no se puede sacar.',
    ancha: true,
    html: `
      <label class="campo-admin"><span>Formato</span>
        <select id="fvFormato">
          ${FORMATOS_AV.map(x => `<option value="${x.id}" ${formato === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}
        </select></label>
      <p class="metrica-nota" id="fvAyuda" style="margin:-6px 0 12px">
        ${esc(FORMATOS_AV.find(x => x.id === formato)?.ayuda || '')}</p>

      <label class="campo-admin"><span>Quién lo paga</span>
        <select id="fvDueno">
          <option value="casa" ${dueño === 'casa' ? 'selected' : ''}>Contratá Ya (casa)</option>
          <optgroup label="Marcas nacionales">
            ${listaM.map(m => `<option value="m:${esc(m.id)}" ${dueño === 'm:' + m.id ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('')}
          </optgroup>
          <optgroup label="Comercios con casillero">
            ${listaC.map(c => `<option value="c:${esc(c.id)}" ${dueño === 'c:' + c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
          </optgroup>
        </select></label>

      <label class="campo-admin"><span>A quién se le muestra</span>
        <select id="fvAud">
          <option value="pro" ${(f?.audiencia || 'pro') === 'pro' ? 'selected' : ''}>Sólo profesionales</option>
          <option value="cliente" ${f?.audiencia === 'cliente' ? 'selected' : ''}>Sólo clientes</option>
          <option value="todos" ${f?.audiencia === 'todos' ? 'selected' : ''}>Todos</option>
        </select></label>
      <p class="metrica-nota" style="margin:-6px 0 12px">Un aviso de comercio se guarda siempre como
        «sólo profesionales»: el cliente no compra materiales.</p>

      <p class="metrica-nota" style="margin-bottom:6px"><b style="color:var(--cal)">Localidades</b>
        — sin marcar ninguna, sale en todo el partido.</p>
      ${avCasillas('fvLocs', LOCALIDADES.map(l => ({ id: l, nombre: l })), avListaJson(f?.localidades))}

      <p class="metrica-nota" style="margin:14px 0 6px"><b style="color:var(--cal)">Oficios</b>
        — sin marcar ninguno, sale para todos.</p>
      ${avCasillas('fvOficios', RUBROS, avListaJson(f?.oficios))}

      <div class="colores-creativo" style="margin-top:16px">
        <label class="campo-admin"><span>Tope por día y por persona</span>
          <input type="number" id="fvTopeDia" value="${Number(f?.tope_dia ?? 1)}" min="0" max="20"></label>
        <label class="campo-admin"><span>Tope total por persona (0 = sin tope)</span>
          <input type="number" id="fvTopeTotal" value="${Number(f?.tope_total ?? 0)}" min="0" max="500"></label>
      </div>

      <div class="colores-creativo">
        <label class="campo-admin"><span>Desde</span>
          <input type="date" id="fvDesde" value="${esc((f?.desde || '').slice(0, 10))}"></label>
        <label class="campo-admin"><span>Hasta</span>
          <input type="date" id="fvHasta" value="${esc((f?.hasta || '').slice(0, 10))}"></label>
      </div>

      <div class="colores-creativo">
        <label class="campo-color"><span>Fondo</span>
          <input type="color" id="fvFondo" value="${esc(colorFondo)}"></label>
        <label class="campo-color"><span>Textos</span>
          <input type="color" id="fvTinta" value="${esc(colorTinta)}"></label>
      </div>

      <label class="campo-admin"><span>Rótulo</span>
        <input id="fvRotulo" value="${esc(f?.rotulo || 'Publicidad')}" maxlength="40"></label>
      <label class="campo-admin"><span>Título</span>
        <input id="fvTitulo" value="${esc(f?.titulo || '')}" maxlength="80"></label>
      <label class="campo-admin"><span>Cuerpo</span>
        <textarea id="fvCuerpo" maxlength="280">${esc(f?.cuerpo || '')}</textarea></label>
      <label class="campo-admin"><span>Texto del botón</span>
        <input id="fvBoton" value="${esc(f?.boton || 'Ver más')}" maxlength="40"></label>

      <label class="campo-admin"><span>Adónde lleva</span>
        <select id="fvEnlace">
          ${enlacesFijos.map(e => `<option value="${e}" ${f?.enlace === e ? 'selected' : ''}>${e}</option>`).join('')}
          <option value="url" ${enlaceEsUrl ? 'selected' : ''}>Una dirección…</option>
        </select></label>
      <label class="campo-admin" id="fvUrlCampo" ${enlaceEsUrl ? '' : 'hidden'}><span>Dirección</span>
        <input id="fvUrl" value="${esc(enlaceEsUrl ? f.enlace : '')}" placeholder="https://…"></label>

      <label class="campo-admin"><span>Imagen (URL, opcional)</span>
        <input id="fvImagen" value="${esc(f?.imagen_url || '')}"></label>
      <label class="campo-admin"><span>Letra chica</span>
        <textarea id="fvChica" maxlength="220">${esc(f?.letra_chica || '')}</textarea></label>

      <div id="fvCupon" ${formato === 'cupon' ? '' : 'hidden'}>
        <p class="metrica-nota" style="margin:10px 0 6px"><b style="color:var(--cal)">Cupón</b>
          — el código sale <em>PREFIJO-1234</em>, único por persona, y se canjea en el mostrador
          con la misma llave que ya usa /canje.</p>
        <div class="colores-creativo">
          <label class="campo-admin"><span>Prefijo del código</span>
            <input id="fvPrefijo" value="${esc(f?.cupon_prefijo || '')}" maxlength="6" placeholder="MEMB"></label>
          <label class="campo-admin"><span>Vence a los … días</span>
            <input type="number" id="fvDias" value="${Number(f?.cupon_dias ?? 30)}" min="1" max="365"></label>
        </div>
        <label class="campo-admin"><span>…o corta esta fecha, lo que pase antes</span>
          <input type="date" id="fvCuponHasta" value="${esc((f?.cupon_hasta || '').slice(0, 10))}"></label>
      </div>

      <label class="campo-admin"><span>Orden en la rotación</span>
        <input type="number" id="fvOrden" value="${Number(f?.orden || 0)}" min="0" max="99"></label>`,
    acciones: [
      { texto: f ? 'Guardar' : 'Crear el aviso', clase: 'btn-admin', accion: () => guardarFormato(f?.id) },
      ...(f ? [{ texto: 'Borrar', clase: 'btn-admin-mal', accion: () => borrarFormato(f) }] : [])
    ]
  });

  $a('#fvFormato')?.addEventListener('change', (e) => {
    const v = e.target.value;
    $a('#fvAyuda').textContent = FORMATOS_AV.find(x => x.id === v)?.ayuda || '';
    $a('#fvCupon').hidden = v !== 'cupon';
  });
  $a('#fvEnlace')?.addEventListener('change', (e) => {
    $a('#fvUrlCampo').hidden = e.target.value !== 'url';
  });
  $a('#fvDueno')?.addEventListener('change', (e) => {
    if (e.target.value.startsWith('c:')) $a('#fvAud').value = 'pro';
  });
}

async function guardarFormato(id) {
  const dueño = $a('#fvDueno').value;
  const enlaceSel = $a('#fvEnlace').value;
  const fecha = (v) => v ? v + 'T12:00:00.000Z' : '';

  const args = {
    p_id: id || null,
    p_formato:     $a('#fvFormato').value,
    p_marca:       dueño.startsWith('m:') ? dueño.slice(2) : null,
    p_anunciante:  dueño.startsWith('c:') ? dueño.slice(2) : null,
    p_audiencia:   $a('#fvAud').value,
    p_localidades: avMarcadas('fvLocs'),
    p_oficios:     avMarcadas('fvOficios'),
    p_tope_dia:    Number($a('#fvTopeDia').value || 0),
    p_tope_total:  Number($a('#fvTopeTotal').value || 0),
    p_desde:       fecha($a('#fvDesde').value),
    p_hasta:       fecha($a('#fvHasta').value),
    p_fondo:       $a('#fvFondo').value,
    p_tinta:       $a('#fvTinta').value,
    p_boton_fondo: $a('#fvTinta').value,
    p_boton_tinta: $a('#fvFondo').value,
    p_rotulo:      $a('#fvRotulo').value.trim(),
    p_titulo:      $a('#fvTitulo').value.trim(),
    p_cuerpo:      $a('#fvCuerpo').value.trim(),
    p_boton:       $a('#fvBoton').value.trim(),
    p_enlace:      enlaceSel === 'url' ? $a('#fvUrl').value.trim() : enlaceSel,
    p_imagen_url:  $a('#fvImagen').value.trim() || null,
    p_letra_chica: $a('#fvChica').value.trim(),
    p_orden:       Number($a('#fvOrden').value || 0)
  };

  if (!args.p_titulo) { brindis('Un aviso sin título no se muestra: poné el título'); return; }

  if (args.p_formato === 'cupon') {
    args.p_cupon_prefijo = ($a('#fvPrefijo').value || '').trim().toUpperCase();
    args.p_cupon_dias    = Number($a('#fvDias').value || 30);
    args.p_cupon_hasta   = fecha($a('#fvCuponHasta').value);
    if (!args.p_cupon_prefijo) { brindis('El cupón necesita un prefijo (ej.: MEMB)'); return; }
  }

  const { error } = await sb.rpc('guardar_formato', args);
  if (error) { brindis(error.message || 'No se pudo guardar'); return; }
  cerrarFicha();
  brindis(id ? 'Aviso actualizado' : 'Aviso creado');
  verCreativos();
}

async function borrarFormato(f) {
  if (!confirm(`¿Borrar el aviso «${f.titulo || 'sin título'}»?\n\n`
    + 'Deja de mostrarse en la app. Los cupones que haya emitido también se borran. No se puede deshacer.')) return;
  const { error } = await sb.rpc('borrar_formato', { p_id: f.id });
  if (error) { brindis(error.message || 'No se pudo borrar'); return; }
  cerrarFicha();
  brindis('Aviso borrado');
  verCreativos();
}


Panel.registrar('creativos', {
  titulo:   'Creativos',
  bajada:   'Banners, interstitials, formatos nuevos, marcas nacionales y medición',
  pintar:   () => verCreativos(),
  insignia: () => contarBannersSinImagen()
});
