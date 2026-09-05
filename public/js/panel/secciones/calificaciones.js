/* ============================================================
   CONTRATÁ YA — Panel · Calificaciones
   Las últimas reseñas recibidas, con filtro por tipo y por lado.
   ============================================================ */

const FILTROS_C = { tipo: 'con_texto', hacia: '', q: '' };
let busquedaCTimer = 0, focoBuscarC = false;

async function verCalificaciones() {
  const { data, error } = await sb.from('calificaciones')
    .select('*, destino:perfiles!destino_id(nombre,localidad,rol), autor:perfiles!autor_id(nombre)')
    .order('creado_en', { ascending: false })
    .limit(300);
  if (error) throw error;

  const texto = normBuscar(FILTROS_C.q).trim();
  const filas = (data || []).filter(c => {
    if (FILTROS_C.tipo === 'con_texto' && !c.texto) return false;
    if (FILTROS_C.tipo === 'bajas' && !(Number(c.puntaje) < 3)) return false;
    if (FILTROS_C.tipo === 'sin_responder' && (c.respuesta || !c.texto)) return false;
    if (FILTROS_C.hacia && c.hacia !== FILTROS_C.hacia) return false;
    if (texto && !normBuscar(c.texto).includes(texto)
      && !normBuscar(c.destino?.nombre).includes(texto)
      && !normBuscar(c.autor?.nombre).includes(texto)) return false;
    return true;
  });

  const bajas = (data || []).filter(c => Number(c.puntaje) < 3).length;

  $a('#cuerpo').innerHTML = `
    <div class="filtros">
      <input id="cBuscar" type="search" placeholder="Buscar en el texto o por persona" value="${esc(FILTROS_C.q)}" autocomplete="off">
      <select id="cTipo">
        <option value="con_texto" ${FILTROS_C.tipo === 'con_texto' ? 'selected' : ''}>Sólo las que tienen comentario</option>
        <option value="bajas" ${FILTROS_C.tipo === 'bajas' ? 'selected' : ''}>Sólo las malas (menos de 3)</option>
        <option value="sin_responder" ${FILTROS_C.tipo === 'sin_responder' ? 'selected' : ''}>Sin respuesta del calificado</option>
        <option value="todas" ${FILTROS_C.tipo === 'todas' ? 'selected' : ''}>Todas, con o sin comentario</option>
      </select>
      <select id="cHacia">
        <option value="" ${!FILTROS_C.hacia ? 'selected' : ''}>A cualquiera</option>
        <option value="pro" ${FILTROS_C.hacia === 'pro' ? 'selected' : ''}>Sólo a profesionales</option>
        <option value="cliente" ${FILTROS_C.hacia === 'cliente' ? 'selected' : ''}>Sólo a clientes</option>
      </select>
      <span class="filtros-conteo">${num(filas.length)} de ${num((data || []).length)} · ${num(bajas)} mala${bajas === 1 ? '' : 's'}</span>
    </div>

    ${filas.length ? `
    <div class="resenas-lista">
      ${filas.map(c => {
        const bajo = Number(c.puntaje) < 3;
        return `
        <div class="resena-admin ${bajo ? 'resena-baja' : ''}">
          <div class="resena-cabeza-admin">
            <span class="puntaje-bloque ${bajo ? 'puntaje-bajo' : ''}">${Number(c.puntaje).toFixed(1).replace('.', ',')}</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600">${esc(c.destino?.nombre || 'Sin nombre')}</div>
              <div class="persona-fecha">${c.hacia === 'cliente' ? 'Como cliente' : 'Como profesional'} · ${esc(c.destino?.localidad || 'sin zona')} · la escribió ${esc(c.autor?.nombre || 'alguien')} · ${fechaCorta(c.creado_en)}</div>
            </div>
          </div>
          <p>${esc(c.texto || 'Sin comentario escrito.')}</p>
          ${c.respuesta ? `<p class="resena-respuesta"><b>Respondió:</b> ${esc(c.respuesta)}</p>` : ''}
          <div class="acciones-celda" style="margin-top:12px">
            ${c.destino_id ? `<button class="btn-mini" data-ficha="${esc(c.destino_id)}">Ver a quien la recibió</button>` : ''}
            ${c.autor_id ? `<button class="btn-mini" data-ficha="${esc(c.autor_id)}">Ver a quien la escribió</button>` : ''}
            <button class="btn-mini btn-mini-mal" data-borrar-cal="${esc(c.id)}" data-quien="${esc(c.destino?.nombre || '')}">Borrar la reseña</button>
          </div>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="vacio-admin">
      <h3>No hay reseñas que coincidan</h3>
      <p>Probá con «Todas, con o sin comentario». Si tampoco aparece nada, es que todavía nadie calificó a nadie: las calificaciones se piden cuando los dos dan el trabajo por terminado.</p>
    </div>`}`;

  const enlazar = (id, campo) => {
    const el = $a(id);
    if (el) el.addEventListener('change', () => { FILTROS_C[campo] = el.value; verCalificaciones(); });
  };
  enlazar('#cTipo', 'tipo'); enlazar('#cHacia', 'hacia');

  const buscar = $a('#cBuscar');
  if (buscar) {
    buscar.addEventListener('input', () => {
      clearTimeout(busquedaCTimer);
      focoBuscarC = true;
      busquedaCTimer = setTimeout(() => { FILTROS_C.q = ($a('#cBuscar')?.value || '').trim(); verCalificaciones(); }, 300);
    });
    if (focoBuscarC) {
      buscar.focus();
      const n = buscar.value.length;
      try { buscar.setSelectionRange(n, n); } catch {}
      focoBuscarC = false;
    }
  }

  document.querySelectorAll('[data-ficha]').forEach(b =>
    b.addEventListener('click', () => abrirFichaUsuario(b.dataset.ficha)));

  document.querySelectorAll('[data-borrar-cal]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm(
        `¿Borrar esta reseña?\n\nSe va de la app y el promedio de ${b.dataset.quien || 'esa persona'} se vuelve a calcular sin ella.\nBorrala sólo si es un insulto, una represalia o algo falso: no para tapar una crítica.\n\nEsto no se puede deshacer.`
      )) return;
      const { error } = await sb.rpc('admin_borrar_calificacion', { p_id: b.dataset.borrarCal });
      if (error) { brindis(error.message || 'No se pudo borrar'); return; }
      brindis('Reseña borrada y promedio recalculado');
      verCalificaciones();
    });
  });
}




Panel.registrar('calificaciones', {
  titulo: 'Calificaciones',
  bajada: 'Últimas reseñas recibidas',
  pintar: () => verCalificaciones()
});
