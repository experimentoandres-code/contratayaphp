/* ============================================================
   CONTRATÁ YA — Panel · Moderación
   Denuncias y fotos reportadas, abiertas y ya resueltas.
   ============================================================ */

const MOTIVO_TEXTO = {
  no_es_quien_dice: 'No es la persona de la foto',
  foto: 'Foto falsa o inapropiada',
  no_se_presento: 'Acordó y no se presentó',
  trato: 'Malos tratos',
  estafa: 'Intento de estafa',
  otro: 'Otro motivo'
};

let MOD_CERRADAS = false;

async function verModeracion() {
  const [{ data: filas, error }, { data: susp }] = await Promise.all([
    sb.rpc('denuncias_abiertas', { p_cerradas: MOD_CERRADAS }),
    sb.rpc('usuarios_suspendidos')
  ]);
  if (error) throw error;

  // Las cuentas suspendidas van arriba y siempre. Antes el botón para
  // levantarlas vivía dentro de la denuncia, y al cerrarse la denuncia la
  // cuenta quedaba bloqueada sin ninguna puerta para desbloquearla.
  const bloqueSuspendidos = (susp && susp.length) ? `
    <div class="metrica-admin" style="margin-bottom:16px;border-color:var(--coral)">
      <div class="panel-titulo">Cuentas suspendidas (${susp.length})</div>
      <p class="metrica-nota" style="margin-bottom:12px">No pueden entrar a la app. Van a leer el motivo que escribiste al suspenderlas.</p>
      ${susp.map(u => `
        <div class="rubro-fila">
          <span>
            <b style="color:var(--cal)">${esc(nombreAdmin(u))}</b>
            <span class="pildora p-coral" style="margin-left:8px">Suspendida</span>
            <br>
            <span class="persona-fecha">
              ${u.rol === 'cliente' ? 'Cliente' : 'Profesional'}${u.rubro ? ' · ' + esc(nombreRubro(u.rubro)) : ''}${u.localidad ? ' · ' + esc(u.localidad) : ''}
              ${u.correo ? '<br>' + esc(u.correo) : ''}${u.whatsapp ? ' · ' + esc(u.whatsapp) : ''}
            </span>
            ${u.motivo ? `<br><span class="persona-fecha">Motivo: ${esc(u.motivo)}</span>` : '<br><span class="persona-fecha">Sin motivo anotado</span>'}
          </span>
          <span class="acciones-celda">
            <span class="dato-mono">${num(u.denuncias || 0)} denuncia${Number(u.denuncias) === 1 ? '' : 's'}</span>
            <button class="btn-mini" data-ficha="${esc(u.id)}">Ver ficha</button>
            <button class="btn-mini btn-mini-ok" data-levantar="${esc(u.id)}">Levantar suspensión</button>
          </span>
        </div>`).join('')}
    </div>` : '';

  const barra = `
    <div class="filtros">
      <select id="modQue">
        <option value="abiertas" ${MOD_CERRADAS ? '' : 'selected'}>Denuncias sin resolver</option>
        <option value="cerradas" ${MOD_CERRADAS ? 'selected' : ''}>Denuncias ya resueltas</option>
      </select>
      <span class="filtros-conteo">${num((filas || []).length)} denuncia${(filas || []).length === 1 ? '' : 's'}</span>
    </div>`;

  const cuerpo = (filas && filas.length) ? `
    <div class="resenas-lista">
      ${filas.map(d => `
        <div class="resena-admin ${d.antecedentes > 0 ? 'resena-baja' : ''}">
          <div class="resena-cabeza-admin">
            <span class="persona-avatar" style="width:44px;height:44px">
              ${d.denunciado_foto ? `<img src="${esc(d.denunciado_foto)}" alt="">` : esc(iniciales(d.denunciado))}
            </span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:16px">${esc(d.denunciado || 'Sin nombre')}</div>
              <div class="persona-fecha">${esc(nombreRubro(d.denunciado_rubro))}${d.denunciado_localidad ? ' · ' + esc(d.denunciado_localidad) : ''} · lo reportó ${esc(d.autor_nombre || 'alguien')} · ${fechaCorta(d.creado_en)}</div>
            </div>
            ${d.suspendido ? '<span class="pildora p-coral">Suspendida</span>' : ''}
            ${d.antecedentes > 0 ? `<span class="pildora p-coral">${d.antecedentes} denuncia${d.antecedentes === 1 ? '' : 's'} más</span>` : ''}
          </div>

          <p style="color:var(--cal);font-weight:500">${esc(MOTIVO_TEXTO[d.motivo] || d.motivo)}</p>
          ${d.detalle ? `<p style="margin-top:6px">${esc(d.detalle)}</p>` : ''}
          ${d.estado !== 'abierta' ? `<p class="persona-fecha" style="margin-top:8px">Se cerró como «${esc(d.estado)}»${d.resuelto_en ? ' el ' + esc(fechaLarga(d.resuelto_en)) : ''}${d.nota ? ' · nota: ' + esc(d.nota) : ''}</p>` : ''}

          ${(d.conversacion && d.conversacion.length) ? `
            <button class="btn-mini" data-chat="${esc(d.id)}" style="margin-top:12px">Ver la conversación (${d.conversacion.length})</button>
            <div class="charla-cuerpo" id="chat-${esc(d.id)}" hidden style="margin-top:12px;padding:0">
              ${d.conversacion.map(m => `
                <div class="burbuja ${m.autor === d.denunciado_id ? 'b-pro' : 'b-cliente'}">
                  <div class="burbuja-autor">${m.autor === d.denunciado_id ? esc(d.denunciado) : esc(d.autor_nombre || 'Quien denuncia')}</div>
                  <p>${esc(m.texto)}</p>
                </div>`).join('')}
            </div>` : '<p class="metrica-nota" style="margin-top:10px">No hay chat entre estas dos personas para mirar.</p>'}

          <div class="acciones-celda" style="margin-top:14px">
            <button class="btn-mini" data-ficha="${esc(d.denunciado_id)}">Ver ficha del denunciado</button>
            ${d.suspendido
              ? `<button class="btn-mini btn-mini-ok" data-levantar="${esc(d.denunciado_id)}">Levantar suspensión</button>`
              : `<button class="btn-mini btn-mini-mal" data-suspender="${esc(d.id)}" data-quien="${esc(d.denunciado || '')}">Suspender la cuenta</button>`}
            ${d.estado === 'abierta' ? `
              <button class="btn-mini" data-revisada="${esc(d.id)}">La miré, no hace falta hacer nada</button>
              <button class="btn-mini" data-desestimar="${esc(d.id)}">No corresponde</button>` : ''}
          </div>
        </div>`).join('')}
    </div>` : `
    <div class="vacio-admin">
      <h3>${MOD_CERRADAS ? 'Todavía no cerraste ninguna denuncia' : 'No hay denuncias sin resolver'}</h3>
      <p>${MOD_CERRADAS
        ? 'Acá van a quedar las denuncias que ya resolviste, con lo que decidiste y la nota que dejaste.'
        : 'Cuando alguien reporte a otra persona desde el chat o desde su perfil, va a aparecer acá con el motivo, la conversación y sus antecedentes.'}</p>
    </div>`;

  $a('#cuerpo').innerHTML = bloqueSuspendidos + barra + cuerpo;

  $a('#modQue')?.addEventListener('change', (e) => {
    MOD_CERRADAS = e.target.value === 'cerradas';
    verModeracion();
  });

  document.querySelectorAll('[data-ficha]').forEach(b =>
    b.addEventListener('click', () => abrirFichaUsuario(b.dataset.ficha)));

  document.querySelectorAll('[data-chat]').forEach(b => {
    b.addEventListener('click', () => {
      const c = document.getElementById('chat-' + b.dataset.chat);
      c.hidden = !c.hidden;
      b.textContent = c.hidden ? 'Ver la conversación' : 'Ocultar la conversación';
    });
  });

  const resolver = async (id, estado, suspender, quien) => {
    let nota = null;
    if (suspender) {
      nota = prompt(
        `¿Suspender la cuenta de ${quien || 'esta persona'}?\n\nEscribí el motivo: lo va a leer en la app, en el cartel de cuenta suspendida.\nLa denuncia queda cerrada como «se tomó acción».`);
      if (nota === null) return;
    } else if (!confirm(estado === 'desestimada'
      ? '¿Marcar esta denuncia como que no corresponde?\n\nSe cierra sin tocar la cuenta denunciada.'
      : '¿Cerrar esta denuncia sin hacer nada?\n\nQueda anotado que la miraste. La cuenta denunciada no cambia.')) return;

    const { error } = await sb.rpc('resolver_denuncia', {
      p_id: id, p_estado: estado, p_suspender: !!suspender, p_nota: nota
    });
    if (error) { brindis(error.message || 'No se pudo'); return; }
    brindis(suspender ? 'Cuenta suspendida y denuncia cerrada' : 'Denuncia cerrada');
    verModeracion();
  };

  document.querySelectorAll('[data-suspender]').forEach(b =>
    b.addEventListener('click', () => resolver(b.dataset.suspender, 'accion_tomada', true, b.dataset.quien)));
  document.querySelectorAll('[data-revisada]').forEach(b =>
    b.addEventListener('click', () => resolver(b.dataset.revisada, 'revisada', false)));
  document.querySelectorAll('[data-desestimar]').forEach(b =>
    b.addEventListener('click', () => resolver(b.dataset.desestimar, 'desestimada', false)));

  conectarLevantar();
}

function conectarLevantar() {
  document.querySelectorAll('[data-levantar]').forEach(b => {
    b.addEventListener('click', async () => {
      b.disabled = true;
      const { error } = await sb.rpc('levantar_suspension', { p_usuario: b.dataset.levantar });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      brindis('Suspensión levantada');
      verModeracion();
    });
  });
}



Panel.registrar('moderacion', {
  titulo:   'Moderación',
  bajada:   'Denuncias y fotos reportadas',
  pintar:   () => verModeracion(),
  insignia: () => contarDenunciasAbiertas()
});
