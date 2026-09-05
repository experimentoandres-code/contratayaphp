/* ============================================================
   CONTRATÁ YA — Panel · Revendedores
   ------------------------------------------------------------
   Quién abrió cada zona, qué trajo, cuánto se le debe y quién
   está esperando que le contesten la postulación.

   Sigue el contrato de panel/nucleo.js: se registra al cargarse
   y no toca nada de otra sección. Todo lo que consulta pasa por
   las funciones de lib/rpc_revendedores.php, que validan que
   quien pregunta sea administrador.

   Para engancharla en el panel hacen falta dos renglones en
   site/admin.html (ver planificacion/marketing/11-revendedores.md):
   el botón del menú y el <script> de este archivo.
   ============================================================ */

/* Estilos propios de la sección. Van acá y no en css/panel/ porque
   admin.html no los carga todavía; el día que se enganche se pueden
   mudar a css/panel/revendedores.css sin cambiar una clase. */
(function estilosRevendedores() {
  if (document.getElementById('rev-estilos')) return;
  const e = document.createElement('style');
  e.id = 'rev-estilos';
  e.textContent = `
    .rev-barra { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 16px; }
    .rev-barra input[type=month] { background:var(--tinta); border:1px solid var(--linea);
      border-radius:var(--r-sm); color:var(--cal); padding:8px 11px; font-family:var(--dato); font-size:13px; }
    .rev-zona-chip { display:inline-block; margin:2px 4px 2px 0; padding:2px 9px; border-radius:999px;
      font-family:var(--dato); font-size:10.5px; letter-spacing:.04em; background:rgba(47,178,166,.14); color:var(--marea); }
    .rev-zona-chip.ojo { background:rgba(240,166,58,.16); color:var(--plomo); }
    .rev-zona-chip.mal { background:rgba(228,87,76,.16); color:var(--coral); }
    .rev-mapa { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:8px; }
    .rev-mapa-celda { border:1px solid var(--linea); border-radius:var(--r-sm); padding:10px 12px;
      background:var(--tinta-2); font-size:13px; }
    .rev-mapa-celda b { display:block; color:var(--cal); font-size:14px; margin-bottom:3px; }
    .rev-mapa-celda span { color:var(--cal-3); font-family:var(--dato); font-size:11px; }
    .rev-mapa-libre { border-color:rgba(47,178,166,.4); }
    .rev-ficha-tabla { width:100%; border-collapse:collapse; margin-top:10px; }
    .rev-ficha-tabla td { padding:7px 0; border-bottom:1px solid var(--linea-soft); font-size:13.5px; color:var(--cal-2); }
    .rev-ficha-tabla td:last-child { text-align:right; font-family:var(--dato); color:var(--cal); }
    .rev-form-mini { display:flex; flex-direction:column; gap:8px; margin-top:14px;
      border-top:1px solid var(--linea); padding-top:14px; }
    .rev-form-mini select, .rev-form-mini input { background:var(--tinta); border:1px solid var(--linea);
      border-radius:var(--r-sm); color:var(--cal); padding:9px 11px; font-size:14px; font-family:inherit; width:100%; }
    .rev-form-mini h4 { font-size:12px; font-family:var(--dato); letter-spacing:.12em;
      text-transform:uppercase; color:var(--cal-3); }`;
  document.head.appendChild(e);
})();

const REV_ESTADO = { activo: 'p-verde', pausado: 'p-ambar', baja: 'p-gris' };
const REV_ALERTA = { bien: '', en_riesgo: 'ojo', vencida: 'mal' };

let revPeriodo = null;   // 'AAAA-MM'; null = el mes en curso

/* ── La pantalla ──────────────────────────────────────────── */

async function verRevendedores() {
  const { data, error } = await sb.rpc('revendedores_admin_resumen',
    revPeriodo ? { p_periodo: revPeriodo } : {});
  if (error) throw error;
  revPeriodo = data.periodo;

  const { data: postulaciones } = await sb.rpc('revendedores_admin_postulaciones', { p_estado: 'nueva' });
  const cols = '1.6fr 1.4fr .7fr .9fr 1fr 1fr 150px';

  $a('#cuerpo').innerHTML = `
    <div class="rev-barra">
      <label class="metrica-rotulo" for="revMes">Mes</label>
      <input type="month" id="revMes" value="${esc(data.periodo)}">
      <button class="btn-mini" id="revCerrar">Recalcular el mes</button>
      <span class="metrica-nota" style="margin-left:auto">
        ${Math.round(data.reglas.tasa_alta * 100)}% el primer año ·
        ${Math.round(data.reglas.tasa_recurrente * 100)}% después ·
        ${Math.round(data.reglas.tasa_pro * 100)}% sobre el plan Pro ·
        tope de ${data.reglas.max_zonas} zonas
      </span>
    </div>

    <div class="metricas-admin" style="margin-bottom:20px">
      ${metricaRev('Revendedores activos', num(data.totales.activos),
                   `${data.mapa.filter(m => m.estado === 'tomada').length} de ${data.mapa.length} zonas abiertas`)}
      ${metricaRev('Comisión del mes', pesos(data.totales.comision_mes), 'devengado en ' + esc(data.periodo))}
      ${metricaRev('Por pagarles', pesos(data.totales.por_pagar), 'previsto y confirmado, sin liquidar')}
      ${metricaRev('Cartera atribuida', pesos(data.totales.cartera), 'lo que facturan por mes sus ventas')}
    </div>

    ${(postulaciones && postulaciones.length) ? `
      <h3 class="panel-titulo">Postulaciones sin contestar (${postulaciones.length})</h3>
      <div class="tabla" style="margin-bottom:24px">
        ${postulaciones.map(p => `
          <div class="tabla-fila" style="grid-template-columns:1.4fr 1.2fr 1fr 1.6fr 210px">
            <div class="persona">
              <span class="persona-avatar">${esc(iniciales(p.nombre))}</span>
              <span class="celda-corta">
                <div class="persona-nombre">${esc(p.nombre)}</div>
                <div class="persona-fecha">Se postuló ${fechaCorta(p.creado_en)}</div>
              </span>
            </div>
            <div class="celda-corta" data-rotulo="Contacto">${esc(p.telefono || '—')}<br>
              <span class="persona-fecha">${esc(p.email || '')}</span></div>
            <div data-rotulo="Quiere">${p.localidades.map(l => `<span class="rev-zona-chip ${
              p.zonas_tomadas.includes(l) ? 'mal' : ''}">${esc(l)}</span>`).join('')}</div>
            <div class="celda-corta" data-rotulo="Cuenta">
              ${p.vive_ahi ? '<span class="pildora p-verde">Vive ahí</span> ' : ''}
              ${esc(p.experiencia || '—')}</div>
            <div class="acciones-celda" data-rotulo="Acciones">
              <button class="btn-mini" data-pos-ver="${esc(p.id)}">Ver</button>
              <button class="btn-mini btn-mini-si" data-pos-aprobar="${esc(p.id)}">Aprobar</button>
              <button class="btn-mini btn-mini-mal" data-pos-rechazar="${esc(p.id)}">Rechazar</button>
            </div>
          </div>`).join('')}
      </div>` : ''}

    <h3 class="panel-titulo">Revendedores</h3>
    ${data.revendedores.length ? `
      <div class="tabla" style="margin-bottom:24px">
        <div class="tabla-encabezado" style="grid-template-columns:${cols}">
          <div>Quién</div><div>Zonas</div><div>Trajo</div><div>Cartera</div>
          <div>Comisión del mes</div><div>Por pagarle</div><div>Acciones</div>
        </div>
        ${data.revendedores.map(r => `
          <div class="tabla-fila" style="grid-template-columns:${cols}">
            <div class="persona">
              <span class="persona-avatar">${esc(iniciales(r.nombre))}</span>
              <span class="celda-corta">
                <div class="persona-nombre">${esc(r.nombre)}</div>
                <div class="persona-fecha">${esc(r.localidad_base || 'sin base')} ·
                  desde ${fechaCorta(r.creado_en)}</div>
              </span>
            </div>
            <div data-rotulo="Zonas">
              ${r.zonas.length ? r.zonas.map(z => `<span class="rev-zona-chip ${
                REV_ALERTA[z.alerta]}" title="${z.dias_sin_vender} días sin vender">${esc(z.localidad)}</span>`).join('')
                : '<span class="persona-fecha">sin zona</span>'}
            </div>
            <div class="celda-corta" data-rotulo="Trajo">${r.casilleros} cas. · ${r.pros} Pro</div>
            <div class="dato-mono" data-rotulo="Cartera">${pesos(r.cartera)}</div>
            <div class="dato-mono" data-rotulo="Comisión">${pesos(r.comision_mes)}</div>
            <div class="dato-mono" data-rotulo="Por pagarle">${pesos(r.por_pagar)}</div>
            <div class="acciones-celda" data-rotulo="Acciones">
              <button class="btn-mini" data-rev="${esc(r.id)}">Abrir ficha</button>
              ${r.por_pagar >= data.reglas.minimo_pago
                ? `<button class="btn-mini btn-mini-si" data-rev-pagar="${esc(r.id)}"
                     data-nombre="${esc(r.nombre)}" data-monto="${r.por_pagar}">Pagar</button>` : ''}
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="vacio-admin">
        <h3>Todavía no hay revendedores</h3>
        <p>Cuando alguien se postule desde /revendedores va a aparecer arriba, en la cola de
          postulaciones. Aprobarla crea la ficha, le asigna la zona y le arma el acceso al panel.</p>
      </div>`}

    <h3 class="panel-titulo">El mapa del partido</h3>
    <div class="rev-mapa">
      ${data.mapa.map(m => `
        <div class="rev-mapa-celda ${m.estado === 'libre' ? 'rev-mapa-libre' : ''}">
          <b>${esc(m.localidad)}</b>
          <span>Escalón ${esc(m.escalon)} · ${pesos(m.precio)}</span><br>
          <span>${m.casilleros_libres} de ${m.casilleros_totales} casilleros libres</span><br>
          <span style="color:${m.estado === 'libre' ? 'var(--marea)' : 'var(--cal-2)'}">
            ${m.estado === 'libre' ? 'ZONA LIBRE' : esc(m.revendedor)}</span>
        </div>`).join('')}
    </div>`;

  engancharRevendedores(data);
}

function metricaRev(rotulo, valor, pie) {
  return `<div class="metrica-admin">
    <div class="metrica-rotulo">${esc(rotulo)}</div>
    <div class="metrica-valor">${esc(valor)}</div>
    <div class="metrica-pie">${esc(pie)}</div>
  </div>`;
}

/* ── Los botones ──────────────────────────────────────────── */

function engancharRevendedores(data) {
  $a('#revMes').addEventListener('change', (e) => {
    revPeriodo = e.target.value || null;
    verRevendedores();
  });

  $a('#revCerrar').addEventListener('click', async (e) => {
    e.target.disabled = true;
    const { data: r, error } = await sb.rpc('revendedores_admin_cerrar_mes', { p_periodo: revPeriodo });
    if (error) { e.target.disabled = false; return brindis(error.message || 'No se pudo'); }
    brindis(`Mes ${r.periodo}: ${r.nuevas} comisiones nuevas, ${pesos(r.total)} en total`);
    verRevendedores();
  });

  document.querySelectorAll('[data-rev]').forEach(b =>
    b.addEventListener('click', () => fichaRevendedor(b.dataset.rev, data)));

  document.querySelectorAll('[data-rev-pagar]').forEach(b =>
    b.addEventListener('click', () => pagarleA(b.dataset.revPagar, b.dataset.nombre, Number(b.dataset.monto))));

  document.querySelectorAll('[data-pos-ver]').forEach(b =>
    b.addEventListener('click', () => fichaPostulacion(b.dataset.posVer)));

  document.querySelectorAll('[data-pos-aprobar]').forEach(b =>
    b.addEventListener('click', () => resolverPostulacion(b.dataset.posAprobar, 'aprobar')));

  document.querySelectorAll('[data-pos-rechazar]').forEach(b =>
    b.addEventListener('click', () => resolverPostulacion(b.dataset.posRechazar, 'rechazar')));
}

async function pagarleA(id, nombre, monto) {
  if (!confirm(`¿Marcar como pagadas todas las comisiones pendientes de ${nombre}?\n\n` +
               `Son ${pesos(monto)}. Esto no transfiere plata: deja registrado que ya se le pagó.`)) return;
  const { data, error } = await sb.rpc('revendedores_admin_pagar',
    { p_revendedor: id, p_accion: 'pagar' });
  if (error) return brindis(error.message || 'No se pudo');
  brindis(`${data.cuantas} comisiones marcadas como pagadas (${pesos(data.total)})`);
  verRevendedores();
}

/* ── Ficha del revendedor ─────────────────────────────────── */

async function fichaRevendedor(id, resumen) {
  const rev = resumen.revendedores.find(r => r.id === id);
  if (!rev) return;
  const { data: comisiones } = await sb.rpc('revendedores_admin_comisiones',
    { p_revendedor: id, p_estado: 'todas' });

  // Los casilleros activos que todavía no están atribuidos a nadie: es lo que
  // se le puede anotar. Se leen de la tabla, que es de lectura pública.
  const { data: contratos } = await sb.from('contratos_publicidad')
    .select('id,localidad,rubro,abono,anunciante:anunciantes!anunciante_id(nombre)')
    .eq('estado', 'activo');
  const zonas = rev.zonas.map(z => z.localidad);
  const candidatos = (contratos || []).filter(c => zonas.includes(c.localidad));

  const porMes = {};
  (comisiones || []).forEach(c => {
    porMes[c.periodo] = porMes[c.periodo] || { total: 0, pagado: 0 };
    porMes[c.periodo].total += c.monto;
    if (c.estado === 'pagada') porMes[c.periodo].pagado += c.monto;
  });

  abrirFicha({
    rotulo: 'Revendedor',
    titulo: rev.nombre,
    sub: `${rev.email || 'sin correo'} · ${rev.telefono || 'sin teléfono'}`,
    ancha: true,
    datos: [
      ['Estado', rev.estado],
      ['Zonas', rev.zonas.map(z => `${z.localidad} (${z.dias_sin_vender} d sin vender)`).join(' · ') || '—'],
      ['Trajo', `${rev.casilleros} casilleros y ${rev.pros} planes Pro`],
      ['Cartera', pesos(rev.cartera)],
      ['Comisión del mes', pesos(rev.comision_mes)],
      ['Por pagarle', pesos(rev.por_pagar)],
      ['Comisiones', `${Math.round(rev.tasa_alta * 100)}% / ${Math.round(rev.tasa_recurrente * 100)}% / ` +
                     `${Math.round(rev.tasa_pro * 100)}% Pro`],
      ['Desde', fechaLarga(rev.creado_en)],
    ],
    html: `
      <h4 class="metrica-rotulo" style="margin-top:14px">Mes a mes</h4>
      <table class="rev-ficha-tabla">
        ${Object.keys(porMes).sort().reverse().slice(0, 8).map(p => `
          <tr><td>${esc(p)}</td>
              <td>${pesos(porMes[p].total)} · pagado ${pesos(porMes[p].pagado)}</td></tr>`).join('')
          || '<tr><td>Todavía no devengó nada</td><td></td></tr>'}
      </table>

      <div class="rev-form-mini">
        <h4>Anotarle una venta</h4>
        <select id="revVenta">
          <option value="">Elegí un casillero de sus zonas…</option>
          ${candidatos.map(c => `<option value="${esc(c.id)}">
            ${esc(c.anunciante?.nombre || 'Comercio')} · ${esc(c.localidad)} · ${esc(c.rubro)}
          </option>`).join('')}
        </select>
        <button class="btn-mini btn-mini-si" id="revAnotar">Anotar la venta</button>
        <p class="metrica-nota">Desde ese momento le corre la comisión sobre el abono del casillero.</p>
      </div>

      <div class="rev-form-mini">
        <h4>Darle otra zona</h4>
        <select id="revZonaNueva">
          <option value="">Elegí una localidad libre…</option>
          ${resumen.mapa.filter(m => m.estado === 'libre').map(m =>
            `<option value="${esc(m.localidad)}">${esc(m.localidad)} · escalón ${esc(m.escalon)} ·
              ${m.casilleros_libres} casilleros libres</option>`).join('')}
        </select>
        <button class="btn-mini" id="revDarZona">Asignar la zona</button>
        ${rev.zonas.length ? `<p class="metrica-nota">Tiene ${rev.zonas.length} de ${rev.max_zonas}.
          Para sacarle una: ${rev.zonas.map(z =>
            `<button class="btn-mini btn-mini-mal" data-rev-liberar="${esc(z.id)}"
              data-loc="${esc(z.localidad)}">Liberar ${esc(z.localidad)}</button>`).join(' ')}</p>` : ''}
      </div>`,
    acciones: [
      { texto: 'Marcar todo como pagado', clase: 'btn-admin',
        accion: () => pagarleA(rev.id, rev.nombre, rev.por_pagar) },
      { texto: rev.estado === 'pausado' ? 'Reactivar' : 'Pausar', clase: 'btn-admin-sec',
        accion: () => cambiarEstadoRev(rev, rev.estado === 'pausado' ? 'activo' : 'pausado') },
      { texto: 'Dar de baja', clase: 'btn-admin-mal',
        accion: () => cambiarEstadoRev(rev, 'baja') },
    ]
  });

  $a('#revAnotar').addEventListener('click', async () => {
    const contrato = $a('#revVenta').value;
    if (!contrato) return brindis('Elegí un casillero primero');
    const { data, error } = await sb.rpc('revendedores_admin_atribuir',
      { p_revendedor: rev.id, p_tipo: 'casillero', p_contrato: contrato });
    if (error) return brindis(error.message || 'No se pudo');
    brindis(`Venta anotada en ${data.localidad}: ${pesos(data.monto_mensual)} por mes`);
    cerrarFicha();
    verRevendedores();
  });

  $a('#revDarZona').addEventListener('click', async () => {
    const loc = $a('#revZonaNueva').value;
    if (!loc) return brindis('Elegí una localidad');
    const { error } = await sb.rpc('revendedores_admin_zona',
      { p_accion: 'asignar', p_revendedor: rev.id, p_localidad: loc });
    if (error) return brindis(error.message || 'No se pudo');
    brindis(`${loc} es ahora zona de ${rev.nombre}`);
    cerrarFicha();
    verRevendedores();
  });

  document.querySelectorAll('[data-rev-liberar]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm(`¿Liberar ${b.dataset.loc}?\n\nVuelve al pool y se la puede dar a otro. ` +
                 `Las comisiones de lo que ya trajo ahí siguen corriendo.`)) return;
    const { error } = await sb.rpc('revendedores_admin_zona',
      { p_accion: 'liberar', p_id: b.dataset.revLiberar, p_motivo: 'liberada desde el panel' });
    if (error) return brindis(error.message || 'No se pudo');
    brindis(`${b.dataset.loc} volvió al pool`);
    cerrarFicha();
    verRevendedores();
  }));
}

async function cambiarEstadoRev(rev, estado) {
  const textos = {
    baja: `¿Dar de baja a ${rev.nombre}?\n\nSe le liberan las zonas en el acto y cobra la cola de ` +
          `salida: 3 meses más sobre lo que ya había traído.`,
    pausado: `¿Pausar a ${rev.nombre}?\n\nConserva las zonas y las comisiones, pero queda marcado ` +
             `como pausado en los listados.`,
    activo: `¿Reactivar a ${rev.nombre}?`
  };
  if (!confirm(textos[estado])) return;
  const { error } = await sb.rpc('revendedores_admin_estado', { p_id: rev.id, p_estado: estado });
  if (error) return brindis(error.message || 'No se pudo');
  brindis(`${rev.nombre} quedó en estado ${estado}`);
  cerrarFicha();
  verRevendedores();
}

/* ── Postulaciones ────────────────────────────────────────── */

async function fichaPostulacion(id) {
  const { data: filas } = await sb.rpc('revendedores_admin_postulaciones', { p_estado: 'todas' });
  const p = (filas || []).find(f => f.id === id);
  if (!p) return brindis('Esa postulación ya no está');

  abrirFicha({
    rotulo: 'Postulación',
    titulo: p.nombre,
    sub: `${p.email} · ${p.telefono}`,
    datos: [
      ['Quiere', p.localidades.join(' y ')],
      ['Ocupadas', p.zonas_tomadas.length ? p.zonas_tomadas.join(', ') : 'ninguna'],
      ['Vive en la zona', p.vive_ahi ? 'Sí' : 'No'],
      ['Se dedica a', p.experiencia || '—'],
      ['Cuándo', fechaLarga(p.creado_en)],
      ['Estado', p.estado],
    ],
    html: p.mensaje ? `<p class="metrica-nota" style="margin-top:12px">${esc(p.mensaje)}</p>` : '',
    acciones: [
      { texto: 'Aprobar y darle la zona', clase: 'btn-admin',
        accion: () => resolverPostulacion(p.id, 'aprobar') },
      { texto: 'Marcar como contactada', clase: 'btn-admin-sec',
        accion: () => resolverPostulacion(p.id, 'contactada') },
      { texto: 'Rechazar', clase: 'btn-admin-mal',
        accion: () => resolverPostulacion(p.id, 'rechazar') },
    ]
  });
}

async function resolverPostulacion(id, accion) {
  const preguntas = {
    aprobar: '¿Aprobar la postulación?\n\nSe crea la ficha del revendedor, se le asignan las zonas ' +
             'que estén libres y, si no tenía cuenta, se le arma una con una contraseña provisoria.',
    rechazar: '¿Rechazar la postulación?\n\nSale de la cola. Podés dejar una nota de por qué.',
    contactada: '¿Marcarla como contactada?\n\nSale de la cola de pendientes pero no se aprueba nada.'
  };
  if (!confirm(preguntas[accion])) return;
  const nota = accion === 'rechazar' ? (prompt('¿Por qué? (queda anotado, no se le manda)') || '') : '';

  const { data, error } = await sb.rpc('revendedores_admin_resolver_postulacion',
    { p_id: id, p_accion: accion, p_nota: nota });
  if (error) return brindis(error.message || 'No se pudo');

  if (accion === 'aprobar') {
    const partes = [];
    if (data.asignadas.length) partes.push('Zonas asignadas: ' + data.asignadas.join(', ') + '.');
    if (data.no_asignadas.length) {
      partes.push('No se pudieron dar: ' +
        data.no_asignadas.map(z => `${z.localidad} (${z.motivo})`).join(', ') + '.');
    }
    if (data.clave_provisoria) {
      partes.push(`\nContraseña provisoria para entrar a /panel-revendedor:\n\n` +
                  `    ${data.clave_provisoria}\n\nPasásela por WhatsApp: se muestra una sola vez.`);
    }
    alert('Revendedor dado de alta.\n\n' + partes.join('\n'));
  }
  brindis('Postulación ' + (accion === 'aprobar' ? 'aprobada' : accion === 'rechazar' ? 'rechazada' : 'marcada'));
  cerrarFicha();
  verRevendedores();
}

/* ── Registro ─────────────────────────────────────────────── */

if (typeof Panel !== 'undefined' && typeof Panel.registrar === 'function') {
  Panel.registrar('revendedores', {
    titulo: 'Revendedores',
    bajada: 'Quién abrió cada zona, qué trajo y cuánto se le debe',
    pintar: () => verRevendedores(),
    insignia: async () => {
      const { data } = await sb.rpc('revendedores_admin_resumen');
      return data ? data.postulaciones_nuevas : 0;
    }
  });
}
