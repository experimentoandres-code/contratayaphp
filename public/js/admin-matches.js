const COLGO_MS = 2 * 3600000;

function pildoraMatch(m) {
  const t = m.trabajo;
  const notas = m.notas || [];
  if (t) {
    if (t.estado === 'propuesto') {
      if (t.inicio_cliente && !t.inicio_pro) return ['p-ambar', 'Falta inicio del pro'];
      if (!t.inicio_cliente && t.inicio_pro) return ['p-ambar', 'Falta inicio del cliente'];
      return ['p-ambar', 'Esperando inicio'];
    }
    if (t.estado === 'en_curso') {
      if (t.fin_cliente && !t.fin_pro) return ['p-verde', 'Falta fin del pro'];
      if (!t.fin_cliente && t.fin_pro) return ['p-verde', 'Falta fin del cliente'];
      return ['p-verde', 'En curso'];
    }
    if (t.estado === 'terminado') {
      const nCli = notas.some(c => c.autor_id === m.cliente_id);
      const nPro = notas.some(c => c.autor_id === m.profesional_id);
      if (nCli && nPro) return ['p-gris', 'Terminado y calificado'];
      if (nCli && !nPro) return ['p-gris', 'Falta calif. del pro'];
      if (!nCli && nPro) return ['p-gris', 'Falta calif. del cliente'];
      return ['p-gris', 'Terminado · sin calificar'];
    }
    if (t.estado === 'cancelado') return ['p-coral', 'Cancelado'];
    const par = ESTADO_TRABAJO[t.estado];
    if (par) return par;
  }
  if (m.silenciado) return ['p-coral', 'Sin respuesta'];
  return ['p-gris', 'Sin trabajo'];
}

function resumenProceso(m) {
  const t = m.trabajo;
  const nMsg = (m.msgs || []).length;
  const matchTxt = m.inicio === 'pro' ? 'Match: lo cerró el profesional' : 'Match: lo cerró el cliente';
  const chatTxt = !nMsg
    ? 'Nadie escribió todavía'
    : (nMsg + (nMsg === 1 ? ' mensaje' : ' mensajes')
      + (m.silenciado && m.esperaNombre ? ' · espera a ' + m.esperaNombre.split(' ')[0] : ''));
  let trabTxt = 'Sin trabajo abierto';
  if (t) {
    const n = 'Trabajo Nº ' + t.numero;
    if (t.estado === 'propuesto') {
      if (t.inicio_cliente && !t.inicio_pro) trabTxt = n + ' · inicio: falta el profesional';
      else if (!t.inicio_cliente && t.inicio_pro) trabTxt = n + ' · inicio: falta el cliente';
      else trabTxt = n + ' abierto · falta confirmar el inicio';
    } else if (t.estado === 'en_curso') {
      if (t.fin_cliente && !t.fin_pro) trabTxt = n + ' en curso · fin: falta el profesional';
      else if (!t.fin_cliente && t.fin_pro) trabTxt = n + ' en curso · fin: falta el cliente';
      else trabTxt = n + ' en curso';
    } else if (t.estado === 'terminado') {
      const notas = m.notas || [];
      const nCli = notas.some(c => c.autor_id === m.cliente_id);
      const nPro = notas.some(c => c.autor_id === m.profesional_id);
      if (nCli && nPro) trabTxt = n + ' terminado y calificado por los dos';
      else if (nCli) trabTxt = n + ' terminado · falta calificación del profesional';
      else if (nPro) trabTxt = n + ' terminado · falta calificación del cliente';
      else trabTxt = n + ' terminado · sin calificar';
    } else if (t.estado === 'cancelado') trabTxt = n + ' cancelado';
  }
  const pres = (m.presupuestos || []).filter(p => p.estado !== 'reemplazado');
  const pAct = pres.length ? pres[pres.length - 1] : null;
  const preTxt = pAct
    ? ('Presupuesto ' + pesos(pAct.precio) + ' · ' + (pAct.estado === 'aceptado' ? 'aceptado' : 'enviado'))
    : '';
  return { matchTxt, chatTxt, trabTxt, preTxt };
}

function faltaAhora(m) {
  const t = m.trabajo;
  if (!t) {
    if (!(m.msgs || []).length) return m.esperaNombre ? ('Esperando el primer mensaje de ' + m.esperaNombre) : 'Sin trabajo y sin mensajes';
    if (m.silenciado) return 'El chat se enfrió. Esperaba a ' + (m.esperaNombre || 'la otra parte');
    return 'Pueden abrir un trabajo cuando se pongan de acuerdo';
  }
  if (t.estado === 'propuesto') {
    if (t.inicio_cliente && !t.inicio_pro) return 'Falta que el profesional confirme el inicio';
    if (!t.inicio_cliente && t.inicio_pro) return 'Falta que el cliente confirme el inicio';
    return 'Falta que los dos confirmen el inicio';
  }
  if (t.estado === 'en_curso') {
    if (t.fin_cliente && !t.fin_pro) return 'Falta que el profesional marque el fin';
    if (!t.fin_cliente && t.fin_pro) return 'Falta que el cliente marque el fin';
    return 'Trabajo en curso. Cuando terminen, marcan el fin los dos';
  }
  if (t.estado === 'terminado') {
    const notas = m.notas || [];
    const nCli = notas.some(c => c.autor_id === m.cliente_id);
    const nPro = notas.some(c => c.autor_id === m.profesional_id);
    if (nCli && nPro) return 'Cerrado: los dos calificaron';
    if (nCli && !nPro) return 'Falta la calificación del profesional';
    if (!nCli && nPro) return 'Falta la calificación del cliente';
    return 'Terminado. Faltan las calificaciones';
  }
  if (t.estado === 'cancelado') return 'Este trabajo quedó cancelado';
  return '';
}

function pasosProceso(m) {
  const pasos = [];
  const ped = m.pedido || {};
  const rubro = typeof nombreRubro === 'function' ? nombreRubro(ped.rubro) : (ped.rubro || '');
  const zona = ped.localidad || '';
  pasos.push({
    t: m.creado_en,
    titulo: m.inicio === 'pro' ? 'Match: lo cerró el profesional' : 'Match: lo cerró el cliente',
    det: [rubro, zona, ped.urgencia].filter(Boolean).join(' · ')
  });
  if (ped.detalle) pasos.push({ t: m.creado_en, titulo: 'Pedido del cliente', det: ped.detalle });
  if (ped.presupuesto) pasos.push({ t: m.creado_en, titulo: 'Presupuesto orientativo del pedido', det: ped.presupuesto });
  if (m.primero) {
    const nom = m.primero.autor_id === m.cliente_id ? m.nomCli : m.nomPro;
    pasos.push({ t: m.primero.creado_en, titulo: 'Primer mensaje: ' + nom });
  }
  (m.presupuestos || []).forEach(p => {
    const sello = p.estado === 'aceptado' ? 'aceptado' : (p.estado === 'reemplazado' ? 'reemplazado' : 'enviado');
    pasos.push({
      t: p.creado_en,
      titulo: 'Presupuesto de mano de obra ' + pesos(p.precio) + ' · ' + sello,
      det: p.descripcion
    });
    if (p.aceptado_en) {
      pasos.push({
        t: p.aceptado_en,
        titulo: 'El cliente aceptó el precio (no inicia el trabajo)',
        det: p.incluye || ''
      });
    }
  });
  (m.trabajos && m.trabajos.length ? m.trabajos : (m.trabajo ? [m.trabajo] : [])).forEach(t => {
    pasos.push({ t: t.creado_en, titulo: 'Trabajo Nº ' + t.numero + ' abierto', det: t.detalle || '' });
    if (t.inicio_cliente) pasos.push({ t: t.inicio_cliente, titulo: 'Inicio: lo confirmó ' + m.nomCli });
    if (t.inicio_pro) pasos.push({ t: t.inicio_pro, titulo: 'Inicio: lo confirmó ' + m.nomPro });
    if (t.inicio_cliente && t.inicio_pro) {
      const cuando = new Date(t.inicio_cliente) > new Date(t.inicio_pro) ? t.inicio_cliente : t.inicio_pro;
      pasos.push({ t: cuando, titulo: 'Trabajo Nº ' + t.numero + ' en curso' });
    }
    if (t.fin_cliente) pasos.push({ t: t.fin_cliente, titulo: 'Fin: lo marcó ' + m.nomCli });
    if (t.fin_pro) pasos.push({ t: t.fin_pro, titulo: 'Fin: lo marcó ' + m.nomPro });
    if (t.estado === 'terminado') {
      pasos.push({ t: t.terminado_en || t.fin_cliente || t.fin_pro, titulo: 'Trabajo Nº ' + t.numero + ' terminado' });
    }
    if (t.estado === 'cancelado') {
      const quien = t.cancelado_por === m.cliente_id ? m.nomCli : (t.cancelado_por === m.profesional_id ? m.nomPro : '');
      pasos.push({ t: t.terminado_en || t.creado_en, titulo: 'Trabajo Nº ' + t.numero + ' cancelado' + (quien ? ' por ' + quien : '') });
    }
  });
  (m.notas || []).forEach(c => {
    const autor = c.autor_id === m.cliente_id ? m.nomCli : m.nomPro;
    const dest = c.hacia === 'pro' ? m.nomPro : m.nomCli;
    const pts = c.puntaje != null ? Number(c.puntaje).toFixed(1).replace('.', ',') + ' ★' : '';
    pasos.push({
      t: c.creado_en,
      titulo: 'Calificación de ' + autor + ' a ' + dest + (pts ? ': ' + pts : ''),
      det: c.texto || ''
    });
  });
  pasos.sort((a, b) => new Date(a.t || 0) - new Date(b.t || 0));
  return pasos;
}

function htmlProcesoMatch(m) {
  const pasos = pasosProceso(m);
  const falta = faltaAhora(m);
  const hora = (f) => (typeof fechaHora === 'function' ? fechaHora(f) : (f ? hace(f) : '—'));
  return '<div class="proceso-admin">'
    + '<p class="proceso-ahora">' + esc(falta) + '</p>'
    + '<ol>' + pasos.map(p =>
      '<li><span>' + esc(hora(p.t)) + '</span><b>' + esc(p.titulo) + '</b>'
      + (p.det ? '<em>' + esc(p.det) + '</em>' : '') + '</li>'
    ).join('') + '</ol></div>';
}

async function verTrabajos() {
  const { data: matches, error } = await sb.from('matches')
    .select('id,creado_en,cliente_id,profesional_id,pedido_id,cli:perfiles!cliente_id(id,nombre),pro:perfiles!profesional_id(id,nombre),pedido:pedidos!pedido_id(rubro,localidad,urgencia,detalle,presupuesto)')
    .order('creado_en', { ascending: false }).limit(80);
  if (error) throw error;
  const filas = matches || [];
  const ids = filas.map(m => m.id);
  const pedidosIds = filas.map(m => m.pedido_id).filter(Boolean);
  let trabajos = [], msgs = [], desl = [], notas = [], presupuestos = [];
  if (ids.length) {
    const [tRes, mRes, dRes] = await Promise.all([
      sb.from('trabajos').select('id,match_id,estado,numero,detalle,creado_en,inicio_cliente,inicio_pro,fin_cliente,fin_pro,terminado_en,cancelado_por').in('match_id', ids).order('creado_en', { ascending: true }),
      sb.from('mensajes').select('id,match_id,trabajo_id,autor_id,texto,creado_en').in('match_id', ids).order('creado_en', { ascending: true }),
      pedidosIds.length ? sb.from('deslizamientos').select('pedido_id,usuario_id,direccion').in('pedido_id', pedidosIds) : Promise.resolve({ data: [] })
    ]);
    trabajos = tRes.data || []; msgs = mRes.data || []; desl = dRes.data || [];
    const trabIds = trabajos.map(t => t.id);
    const [c1, c2, pRes] = await Promise.all([
      sb.from('calificaciones').select('id,match_id,trabajo_id,autor_id,destino_id,hacia,puntaje,texto,respuesta,creado_en').in('match_id', ids),
      trabIds.length
        ? sb.from('calificaciones').select('id,match_id,trabajo_id,autor_id,destino_id,hacia,puntaje,texto,respuesta,creado_en').in('trabajo_id', trabIds)
        : Promise.resolve({ data: [] }),
      sb.from('presupuestos').select('id,match_id,trabajo_id,precio,estado,descripcion,incluye,no_incluye,demora,nota,validez_dias,creado_en,aceptado_en').in('match_id', ids)
    ]);
    const seenN = new Set();
    [].concat(c1.data || [], c2.data || []).forEach(c => {
      if (!c || !c.id || seenN.has(c.id)) return;
      seenN.add(c.id);
      notas.push(c);
    });
    presupuestos = pRes.error ? [] : (pRes.data || []);
  }
  const listaT = {};
  trabajos.forEach(t => { (listaT[t.match_id] || (listaT[t.match_id] = [])).push(t); });
  const msgsPorMatch = {};
  msgs.forEach(x => { (msgsPorMatch[x.match_id] || (msgsPorMatch[x.match_id] = [])).push(x); });
  const notasPorMatch = {};
  notas.forEach(c => {
    const mid = c.match_id || (trabajos.find(t => t.id === c.trabajo_id) || {}).match_id;
    if (!mid) return;
    (notasPorMatch[mid] || (notasPorMatch[mid] = [])).push(c);
  });
  const prePorMatch = {};
  presupuestos.forEach(p => { (prePorMatch[p.match_id] || (prePorMatch[p.match_id] = [])).push(p); });
  const enriquecidas = filas.map(m => {
    const lista = msgsPorMatch[m.id] || [];
    const primero = lista[0] || null;
    const ultimo = lista.length ? lista[lista.length - 1] : null;
    const proSwipe = desl.some(d => d.pedido_id === m.pedido_id && d.usuario_id === m.profesional_id && d.direccion === 'si');
    const inicio = proSwipe ? 'pro' : 'cliente';
    const nomCli = m.cli && m.cli.nombre || 'Cliente';
    const nomPro = m.pro && m.pro.nombre || 'Profesional';
    const esperaId = ultimo ? (ultimo.autor_id === m.cliente_id ? m.profesional_id : m.cliente_id) : (inicio === 'cliente' ? m.profesional_id : m.cliente_id);
    const esperaNombre = ultimo ? (ultimo.autor_id === m.cliente_id ? nomPro : nomCli) : (inicio === 'cliente' ? nomPro : nomCli);
    const silenciado = (!ultimo && Date.now() - new Date(m.creado_en).getTime() > COLGO_MS) || (ultimo && Date.now() - new Date(ultimo.creado_en).getTime() > COLGO_MS);
    const trabajosM = listaT[m.id] || [];
    const trabajo = trabajosM.length ? trabajosM[trabajosM.length - 1] : null;
    return Object.assign({}, m, {
      trabajo, trabajos: trabajosM, msgs: lista, primero, ultimo, inicio,
      esperaId, esperaNombre, silenciado, nomCli, nomPro,
      notas: notasPorMatch[m.id] || [],
      presupuestos: prePorMatch[m.id] || []
    });
  });
  Panel._matches = enriquecidas;
  const selId = Panel.matchSel && Panel.matchSel.id;
  const cols = 'minmax(0,1fr) minmax(0,1fr) minmax(0,1.9fr) 150px';
  $a('#cuerpo').innerHTML = enriquecidas.length ? ('<p class="metrica-nota" style="margin:0 0 12px">Un match es el contacto. Después puede haber chat, presupuesto, trabajo (inicio de los dos → en curso → fin de los dos) y calificaciones. Tocá una fila para ver el proceso completo.</p><div class="trabajos-2"><div class="tabla"><div class="tabla-encabezado" style="grid-template-columns:' + cols + '"><div>Cliente</div><div>Profesional</div><div>Qué pasó</div><div>Estado</div></div>' + enriquecidas.map(m => {
    const par = pildoraMatch(m);
    const r = resumenProceso(m);
    return '<div class="tabla-fila ' + (selId === m.id ? 'fila-elegida ' : '') + (m.silenciado ? 'fila-colgada' : '') + '" style="grid-template-columns:' + cols + '" data-match="' + esc(m.id) + '"><div class="celda-corta">' + esc(m.nomCli) + '</div><div class="celda-corta">' + esc(m.nomPro) + '</div><div class="celda-proceso"><div class="celda-corta">' + esc(r.matchTxt) + '</div><div class="persona-fecha">' + esc(r.chatTxt) + ' · ' + esc(hace(m.ultimo && m.ultimo.creado_en || m.creado_en)) + '</div><div class="persona-fecha">' + esc(r.trabTxt) + (r.preTxt ? ' · ' + esc(r.preTxt) : '') + '</div></div><div><span class="pildora ' + par[0] + '">' + esc(par[1]) + '</span></div></div>';
  }).join('') + '</div><div class="charla" id="charla"><div class="charla-cabeza" id="charlaCabeza"><span>Conversación</span><b>Elegí un match</b></div><div class="charla-cuerpo" id="charlaCuerpo"><p class="metrica-nota">Tocá una fila para leer el proceso, el chat y avisar a quien no responde.</p></div><div class="charla-pie" id="charlaPie"></div></div></div>') : '<div class="vacio-admin"><h3>Todavía no hay matches</h3><p>Cuando un cliente o un profesional se elijan, el contacto aparece acá.</p></div>';
  document.querySelectorAll('[data-match]').forEach(f => {
    f.addEventListener('click', () => {
      const m = enriquecidas.find(x => x.id === f.dataset.match);
      if (!m) return;
      Panel.matchSel = m;
      document.querySelectorAll('[data-match]').forEach(x => x.classList.toggle('fila-elegida', x === f));
      verCharla(m);
    });
  });
  if (selId) { const m = enriquecidas.find(x => x.id === selId); if (m) { Panel.matchSel = m; verCharla(m); } }
}
