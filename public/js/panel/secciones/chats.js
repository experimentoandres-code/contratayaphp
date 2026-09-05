/* ============================================================
   CONTRATÁ YA — Panel · Chats
   La conversación de un match, de sólo lectura, y el aviso al
   celular cuando alguno de los dos se durmió.
   No se registra como sección: es la mitad derecha de «trabajos».
   ============================================================ */

async function traerMensajesMatch(m) {
  const { data: porMatch, error: e1 } = await sb.from('mensajes').select('id,autor_id,texto,creado_en,match_id,trabajo_id').eq('match_id', m.id).order('creado_en', { ascending: true });
  let extra = [];
  if (m.trabajo && m.trabajo.id) {
    const { data } = await sb.from('mensajes').select('id,autor_id,texto,creado_en,match_id,trabajo_id').eq('trabajo_id', m.trabajo.id).order('creado_en', { ascending: true });
    extra = data || [];
  }
  const seen = new Set(); const out = [];
  for (const x of [].concat(porMatch || [], extra)) {
    const k = x.id || (String(x.autor_id) + x.creado_en + x.texto);
    if (seen.has(k)) continue; seen.add(k); out.push(x);
  }
  out.sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en));
  return { msgs: out, error: e1 };
}

async function verCharla(m, opts) {
  const cabeza = $a('#charlaCabeza'); const cont = $a('#charlaCuerpo'); const pie = $a('#charlaPie');
  if (!cont) return;
  const rubro = nombreRubro(m.pedido && m.pedido.rubro);
  const zona = (m.pedido && m.pedido.localidad) || '';
  const inicioTxt = m.inicio === 'pro' ? 'El profesional aceptó el pedido' : 'El cliente eligió al profesional';
  if (cabeza) cabeza.innerHTML = '<span>' + esc(m.nomCli) + ' · ' + esc(m.nomPro) + '</span><b>' + esc(rubro) + (zona ? ' · ' + esc(zona) : '') + '</b>';
  if (!opts || !opts.soloChat) cont.innerHTML = '<p class="metrica-nota">Cargando mensajes…</p>';
  const leido = await traerMensajesMatch(m);
  const msgs = leido.msgs; const error = leido.error;
  if (Panel.matchSel && Panel.matchSel.id !== m.id) return;
  const proceso = typeof htmlProcesoMatch === 'function' ? htmlProcesoMatch(m) : '';
  if (error && !msgs.length) { cont.innerHTML = proceso + '<p class="metrica-nota">No se pudo leer el chat: ' + esc(error.message) + '</p>'; if (pie) pie.innerHTML = ''; return; }
  if (!msgs.length) {
    cont.innerHTML = proceso + '<p class="metrica-nota">' + esc(inicioTxt) + '. Todavía no hay mensajes.</p>';
  } else {
    const primero = msgs[0];
    const nomPrimero = primero.autor_id === m.cliente_id ? m.nomCli : m.nomPro;
    cont.innerHTML = proceso + '<p class="metrica-nota" style="margin-bottom:8px">' + esc(inicioTxt) + '. El primer mensaje lo mandó ' + esc(nomPrimero) + ' · ' + esc(hace(primero.creado_en)) + '.</p>'
      + msgs.map(x => {
        const esCliente = x.autor_id === m.cliente_id;
        const quien = esCliente ? m.nomCli : m.nomPro;
        const hora = new Date(x.creado_en).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return '<div class="burbuja ' + (esCliente ? 'b-cliente' : 'b-pro') + '"><div class="burbuja-autor">' + esc(quien) + ' · ' + esc(hora) + '</div><p>' + esc(x.texto) + '</p></div>';
      }).join('');
    cont.scrollTop = cont.scrollHeight;
  }
  if (!pie) return;
  const ultimo = msgs[msgs.length - 1];
  const colgo = (!ultimo && Date.now() - new Date(m.creado_en).getTime() > COLGO_MS) || (ultimo && Date.now() - new Date(ultimo.creado_en).getTime() > COLGO_MS);
  pie.innerHTML = '<p class="metrica-nota" style="margin:0 0 8px">' + (colgo && m.esperaNombre ? 'Parece que colgó ' + esc(m.esperaNombre) + '. Podés avisarle al celu.' : 'Si se duerme el contacto, avisale a uno de los dos.') + '</p><div class="charla-acciones"><button class="btn-mini ' + (m.esperaId === m.cliente_id && colgo ? 'btn-mini-si' : '') + '" data-avisar="cli">Avisar al cliente</button><button class="btn-mini ' + (m.esperaId === m.profesional_id && colgo ? 'btn-mini-si' : '') + '" data-avisar="pro">Avisar al profesional</button></div>';
  pie.querySelectorAll('[data-avisar]').forEach(b => {
    b.addEventListener('click', () => {
      const lado = b.dataset.avisar;
      avisarDesdePanel(lado === 'cli' ? m.cliente_id : m.profesional_id, lado === 'cli' ? m.nomCli : m.nomPro, lado === 'cli' ? m.nomPro : m.nomCli, !ultimo);
    });
  });
}

async function avisarDesdePanel(usuarioId, quien, otro, sinMensajes) {
  const titulo = 'Te están esperando en Contratá Ya';
  const cuerpo = sinMensajes ? ('Tenés un match con ' + otro + ' y todavía no hubo mensajes. Entrá a la app.') : (otro + ' te escribió y estás sin responder. Entrá al chat.');
  if (!confirm('¿Mandarle un aviso a ' + quien + '?\n\n“' + cuerpo + '”')) return;
  const { error: eRpc } = await sb.rpc('admin_avisar_usuario', { p_usuario: usuarioId, p_titulo: titulo, p_cuerpo: cuerpo });
  if (!eRpc) { brindis('Aviso encolado. En un minuto le llega al celu.'); return; }
  const { error } = await sb.from('avisos').insert({ destino_id: usuarioId, titulo: titulo, cuerpo: cuerpo, tipo: 'pedido', correo_en: new Date().toISOString() });
  if (error) brindis('No se pudo avisar. Hay que correr el SQL de avisos en Supabase.');
  else brindis('Aviso encolado. En un minuto le llega al celu.');
}
