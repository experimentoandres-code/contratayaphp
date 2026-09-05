/* ============================================================
   CONTRATÁ YA — Panel · Pedidos
   Publicaciones abiertas y cerradas, con sus matches.
   ============================================================ */

const FILTROS_P = { estado: 'abierto', rubro: '', localidad: '', urgencia: '', q: '' };
let busquedaPTimer = 0, focoBuscarP = false;

const ESTADO_PEDIDO = {
  abierto: ['p-ambar', 'Abierto'],
  cerrado: ['p-gris', 'Cerrado'],
  frenado: ['p-coral', 'Frenado']
};

function hayFiltrosP() {
  return FILTROS_P.estado !== 'abierto' || FILTROS_P.rubro || FILTROS_P.localidad
      || FILTROS_P.urgencia || FILTROS_P.q;
}

async function verPedidos() {
  let q = sb.from('pedidos')
    .select('*, cliente:perfiles!cliente_id(nombre,foto_url)')
    .order('creado_en', { ascending: false })
    .limit(300);
  if (FILTROS_P.estado) q = q.eq('estado', FILTROS_P.estado);
  if (FILTROS_P.rubro) q = q.eq('rubro', FILTROS_P.rubro);
  if (FILTROS_P.localidad) q = q.eq('localidad', FILTROS_P.localidad);
  if (FILTROS_P.urgencia) q = q.eq('urgencia', FILTROS_P.urgencia);

  const [{ data: todos, error }, { data: mats }] = await Promise.all([
    q,
    sb.from('matches').select('pedido_id')
  ]);
  if (error) throw error;

  // Cuántos profesionales tomó cada pedido: es el dato que dice si funcionó.
  const porPedido = {};
  (mats || []).forEach(m => { porPedido[m.pedido_id] = (porPedido[m.pedido_id] || 0) + 1; });

  const texto = normBuscar(FILTROS_P.q).trim();
  const filas = (todos || []).filter(p => !texto
    || normBuscar(p.detalle).includes(texto)
    || normBuscar(p.cliente?.nombre).includes(texto)
    || normBuscar(nombreRubro(p.rubro)).includes(texto)
    || normBuscar(p.localidad).includes(texto));

  const opciones = (lista, valor, todosTxt) =>
    `<option value="">${todosTxt}</option>` +
    lista.map(x => `<option value="${esc(x.id ?? x)}" ${valor === (x.id ?? x) ? 'selected' : ''}>${esc(x.nombre ?? x)}</option>`).join('');

  const cols = 'minmax(0,1.6fr) minmax(0,1.1fr) 110px minmax(0,1.2fr) 100px 110px 120px';
  const sinTomar = filas.filter(p => p.estado === 'abierto' && !porPedido[p.id]).length;

  $a('#cuerpo').innerHTML = `
    <div class="filtros">
      <input id="pBuscar" type="search" placeholder="Buscar por texto, persona, oficio o zona" value="${esc(FILTROS_P.q)}" autocomplete="off">
      <select id="pEstado">
        <option value="abierto" ${FILTROS_P.estado === 'abierto' ? 'selected' : ''}>Abiertos</option>
        <option value="cerrado" ${FILTROS_P.estado === 'cerrado' ? 'selected' : ''}>Cerrados</option>
        <option value="" ${FILTROS_P.estado === '' ? 'selected' : ''}>Todos los estados</option>
      </select>
      <select id="pRub">${opciones(RUBROS, FILTROS_P.rubro, 'Todos los oficios')}</select>
      <select id="pLoc">${opciones(LOCALIDADES, FILTROS_P.localidad, 'Todas las localidades')}</select>
      <select id="pUrg">${opciones([
        { id: 'urgente', nombre: 'Urgente' }, { id: 'semana', nombre: 'Esta semana' },
        { id: 'mes', nombre: 'Este mes' }, { id: 'sin_apuro', nombre: 'Sin apuro' }
      ], FILTROS_P.urgencia, 'Cualquier urgencia')}</select>
      ${hayFiltrosP() ? '<button class="btn-mini" id="pLimpiar">Limpiar filtros</button>' : ''}
      <span class="filtros-conteo">${num(filas.length)} pedido${filas.length === 1 ? '' : 's'}${sinTomar ? ' · ' + num(sinTomar) + ' sin tomar' : ''}</span>
    </div>

    ${filas.length ? `
    <div class="tabla">
      <div class="tabla-encabezado" style="grid-template-columns:${cols}">
        <div>Qué necesita</div><div>Localidad</div><div>Urgencia</div>
        <div>Quién lo pidió</div><div>Lo tomaron</div><div>Publicado</div><div>Acciones</div>
      </div>
      ${filas.map(p => {
        const [clase, texto] = ESTADO_PEDIDO[p.estado] || ['p-gris', p.estado];
        const n = porPedido[p.id] || 0;
        return `
        <div class="tabla-fila" style="grid-template-columns:${cols}" data-pedido="${esc(p.id)}">
          <div class="celda-corta">
            <div class="persona-nombre celda-corta">${esc(nombreRubro(p.rubro))} <span class="pildora ${clase}">${esc(texto)}</span></div>
            <div class="persona-fecha celda-corta">${esc(p.detalle || 'Sin detalle')}</div>
          </div>
          <div class="celda-corta" data-rotulo="Localidad">${esc(p.localidad || '—')}</div>
          <div data-rotulo="Urgencia"><span class="pildora ${p.urgencia === 'urgente' ? 'p-coral' : 'p-gris'}">${esc(p.urgencia || 'normal')}</span></div>
          <div class="celda-corta" data-rotulo="Quién lo pidió">${esc(p.cliente?.nombre || '—')}</div>
          <div class="dato-mono" data-rotulo="Lo tomaron">${n ? num(n) + (n === 1 ? ' pro' : ' pros') : '—'}</div>
          <div class="dato-mono" data-rotulo="Publicado">${fechaCorta(p.creado_en)}</div>
          <div class="acciones-celda" data-rotulo="Acciones">
            ${p.estado === 'abierto'
              ? `<button class="btn-mini btn-mini-mal" data-cerrar-pedido="${esc(p.id)}">Bajar</button>`
              : '<span class="dato-mono">—</span>'}
          </div>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="vacio-admin">
      <h3>${hayFiltrosP() ? 'Ningún pedido coincide con estos filtros' : 'Todavía no hay pedidos'}</h3>
      <p>${hayFiltrosP()
        ? 'Probá poner «Todos los estados» o sacar la localidad.'
        : 'Cuando un cliente publique lo que necesita, va a aparecer acá con su oficio, su zona y su urgencia.'}</p>
      ${hayFiltrosP() ? '<button class="btn-admin" id="pLimpiarVacio">Limpiar filtros</button>' : ''}
    </div>`}`;

  const enlazar = (id, campo) => {
    const el = $a(id);
    if (el) el.addEventListener('change', () => { FILTROS_P[campo] = el.value; verPedidos(); });
  };
  enlazar('#pEstado', 'estado'); enlazar('#pRub', 'rubro');
  enlazar('#pLoc', 'localidad'); enlazar('#pUrg', 'urgencia');

  const buscar = $a('#pBuscar');
  if (buscar) {
    buscar.addEventListener('input', () => {
      clearTimeout(busquedaPTimer);
      focoBuscarP = true;
      busquedaPTimer = setTimeout(() => { FILTROS_P.q = ($a('#pBuscar')?.value || '').trim(); verPedidos(); }, 300);
    });
    if (focoBuscarP) {
      buscar.focus();
      const n = buscar.value.length;
      try { buscar.setSelectionRange(n, n); } catch {}
      focoBuscarP = false;
    }
  }
  const limpiarP = () => {
    FILTROS_P.estado = 'abierto'; FILTROS_P.rubro = ''; FILTROS_P.localidad = '';
    FILTROS_P.urgencia = ''; FILTROS_P.q = '';
    verPedidos();
  };
  $a('#pLimpiar')?.addEventListener('click', limpiarP);
  $a('#pLimpiarVacio')?.addEventListener('click', limpiarP);

  document.querySelectorAll('[data-cerrar-pedido]').forEach(b => {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const p = filas.find(x => x.id === b.dataset.cerrarPedido);
      if (p) await cerrarPedido(p, porPedido[p.id] || 0);
    });
  });

  document.querySelectorAll('[data-pedido]').forEach(f => {
    f.addEventListener('click', () => {
      const p = filas.find(x => x.id === f.dataset.pedido);
      if (p) fichaPedido(p, porPedido[p.id] || 0);
    });
  });
}

function fichaPedido(p, matches) {
  const abierto = p.estado === 'abierto';
  const [, estadoTxt] = ESTADO_PEDIDO[p.estado] || ['', p.estado];
  abrirFicha({
    rotulo: 'Pedido',
    titulo: nombreRubro(p.rubro),
    sub: (p.localidad || 'Sin localidad') + ' · lo pidió ' + (p.cliente?.nombre || 'alguien'),
    datos: [
      ['Estado', estadoTxt],
      ['Urgencia', p.urgencia || 'normal'],
      ['Lo tomaron', matches ? matches + (matches === 1 ? ' profesional' : ' profesionales') : 'Nadie todavía'],
      ['Quién lo pidió', p.cliente?.nombre || '—'],
      ['Publicado', fechaHora(p.creado_en)],
      ...(p.cerrado_en ? [['Cerrado', fechaHora(p.cerrado_en)]] : []),
      ['Qué necesita', p.detalle || 'No escribió detalle'],
      ['Presupuesto que puso', p.presupuesto || 'No puso']
    ],
    acciones: abierto
      ? [{ texto: 'Bajar este pedido', clase: 'btn-admin-mal', accion: () => cerrarPedido(p, matches) }]
      : []
  });
}

async function cerrarPedido(p, matches) {
  if (p.estado !== 'abierto') { brindis('Este pedido ya no está abierto'); return; }
  const tiene = matches > 0;
  if (!confirm(
    (tiene
      ? `¿Bajar este pedido?\n\nYa lo tomaron ${matches} ${matches === 1 ? 'profesional' : 'profesionales'}: el pedido se cierra pero los chats que ya se abrieron siguen andando.`
      : '¿Bajar este pedido?\n\nNadie lo tomó todavía, así que se borra del todo. Esto no se puede deshacer.')
    + `\n\n${nombreRubro(p.rubro)} · ${p.localidad || 'sin zona'}\n${p.cliente?.nombre || 'Sin autor'}`
  )) return;

  const { data, error } = await sb.rpc('admin_cerrar_pedido', { p_pedido: p.id });
  if (error) { brindis(error.message || 'No se pudo bajar el pedido'); return; }
  cerrarFicha();
  brindis(data && data.modo === 'cerrado'
    ? 'Pedido cerrado. Los chats que ya existían siguen andando.'
    : 'Pedido eliminado.');
  verPedidos();
}




Panel.registrar('pedidos', {
  titulo: 'Pedidos',
  bajada: 'Publicaciones abiertas y cerradas',
  pintar: () => verPedidos()
});
