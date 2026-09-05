/* ============================================================
   CONTRATÁ YA — Panel · Resumen
   La portada: altas, matches y trabajos del período, más la lista
   de «para hacer» que lleva a las otras pantallas.
   ============================================================ */

function tarjetaMetrica(rotulo, valor, delta, nota) {
  const signo = delta === null ? ''
    : `<span class="metrica-delta ${delta >= 0 ? 'sube' : 'baja'}">${delta >= 0 ? '+' : '−'}${Math.abs(delta)}%</span>`;
  return `<div class="metrica-admin">
    <div class="metrica-rotulo">${esc(rotulo)}</div>
    <div class="metrica-valor">${valor}</div>
    <div class="metrica-pie">${signo}<span class="metrica-nota">${esc(nota)}</span></div>
  </div>`;
}

async function verResumen() {
  // Una sola llamada: antes eran una docena de consultas sueltas y en el
  // celular la pantalla tardaba en armarse.
  const { data: r, error } = await sb.rpc('admin_resumen', { p_dias: Panel.dias });
  if (error) throw error;

  const total = (r.clientes || 0) + (r.pros || 0);
  const porcPro = total ? Math.round((r.pros / total) * 100) : 0;
  const porPedido = r.pedidos.ahora ? (r.matches.ahora / r.pedidos.ahora).toFixed(1).replace('.', ',') : '0';
  const promedio = r.promedio != null ? String(r.promedio).replace('.', ',') : '—';

  const maxLoc = r.por_localidad.length ? r.por_localidad[0].n : 1;
  const p = r.pendientes || {};

  // Lo que hay que resolver hoy. Cada línea lleva a la pantalla donde se hace.
  const tareas = [
    [p.denuncias, 'denuncia sin resolver', 'denuncias sin resolver', 'moderacion', 'Ver moderación', true],
    [p.planes, 'persona esperando el plan Pro', 'personas esperando el plan Pro', 'planes', 'Ver planes', false],
    [p.sin_activar, 'cuenta sin activar', 'cuentas sin activar', 'usuarios', 'Ver usuarios', false],
    [p.casilleros_vencidos, 'casillero con el contrato vencido', 'casilleros con el contrato vencido', 'anunciantes', 'Ver casilleros', true],
    [p.casilleros_por_vencer, 'casillero que vence en menos de 60 días', 'casilleros que vencen en menos de 60 días', 'anunciantes', 'Ver casilleros', false],
    [p.comercios_sueltos, 'comercio cargado sin casillero', 'comercios cargados sin casillero', 'anunciantes', 'Ver comercios', false],
    [p.banners_sin_imagen, 'banner sin imagen cargada', 'banners sin imagen cargada', 'creativos', 'Ver creativos', false],
    [p.matches_colgados, 'match sin un solo mensaje hace más de dos días', 'matches sin un solo mensaje hace más de dos días', 'trabajos', 'Ver matches', false],
    [p.pedidos_sin_match, 'pedido abierto sin que nadie lo tome', 'pedidos abiertos sin que nadie los tome', 'pedidos', 'Ver pedidos', false],
    [p.suspendidos, 'cuenta suspendida', 'cuentas suspendidas', 'moderacion', 'Ver moderación', false]
  ].filter(t => Number(t[0]) > 0);

  const bloqueTareas = `
    <div class="metrica-admin panel-hacer">
      <div class="panel-titulo">Para hacer</div>
      ${tareas.length ? `<div class="hacer-lista">
        ${tareas.map(([n, uno, varios, sec, boton, urgente]) => `
          <div class="hacer-fila ${urgente ? 'hacer-urgente' : ''}">
            <span class="hacer-num">${num(n)}</span>
            <span class="hacer-txt">${esc(n === 1 ? uno : varios)}</span>
            <button class="btn-mini" data-ir="${esc(sec)}">${esc(boton)}</button>
          </div>`).join('')}
      </div>` : `<p class="metrica-nota">No quedó nada pendiente: ninguna denuncia abierta, ningún plan por activar y ningún casillero por vencer.</p>`}
    </div>`;

  $a('#cuerpo').innerHTML = `
    ${bloqueTareas}

    <div class="metricas-admin" style="margin-top:16px">
      ${tarjetaMetrica('Altas de usuarios', num(r.altas.ahora), r.altas.delta, 'vs. período anterior')}
      ${tarjetaMetrica('Clientes / profesionales', `${num(r.clientes)} / ${num(r.pros)}`, null, `${porcPro}% son profesionales`)}
      ${tarjetaMetrica('Pedidos publicados', num(r.pedidos.ahora), r.pedidos.delta, 'en el período')}
      ${tarjetaMetrica('Matches generados', num(r.matches.ahora), r.matches.delta, `${porPedido} por pedido`)}
      ${tarjetaMetrica('Trabajos terminados', num(r.trabajos.ahora), r.trabajos.delta, 'cerrados por las dos partes')}
      ${tarjetaMetrica('Calificaciones', num(r.calificaciones.ahora), r.calificaciones.delta, `promedio ${promedio}`)}
    </div>

    <div class="paneles-2">
      <div class="metrica-admin">
        <div class="panel-titulo">Pedidos por localidad</div>
        ${r.por_localidad.length ? r.por_localidad.map(x => `
          <div class="barra-fila">
            <div class="barra-nombre">${esc(x.localidad || 'Sin zona')}</div>
            <div class="barra-riel"><div class="barra-relleno" style="width:${(x.n / maxLoc) * 100}%"></div></div>
            <div class="barra-valor">${x.n}</div>
          </div>`).join('')
        : '<p class="metrica-nota">Todavía no hay pedidos en este período.</p>'}
      </div>

      <div class="metrica-admin">
        <div class="panel-titulo">Pedidos por rubro</div>
        ${r.por_rubro.length ? r.por_rubro.map(x => `
          <div class="rubro-fila"><span>${esc(nombreRubro(x.rubro))}</span><span>${x.n}</span></div>`).join('')
        : '<p class="metrica-nota">Sin datos en este período.</p>'}
      </div>
    </div>`;

  document.querySelectorAll('[data-ir]').forEach(b => {
    b.addEventListener('click', () => irASeccion(b.dataset.ir));
  });
}




Panel.registrar('resumen', {
  titulo:  'Resumen',
  bajada:  'Altas, matches y trabajos del período',
  periodo: true,
  pintar:  () => verResumen()
});
