/* ============================================================
   CONTRATÁ YA — Panel · Planes
   Quiénes pidieron pasar de plan, y el numerito rojo del menú.
   ============================================================ */

async function verPlanesPendientes() {
  const { data: filas, error } = await sb.rpc('intereses_pendientes');
  if (error) throw error;

  const cols = '2fr 1.2fr 1.2fr 1fr 1fr 190px';

  $a('#cuerpo').innerHTML = (filas && filas.length) ? `
    <p class="metrica-nota" style="margin:0 0 12px">Cada línea es alguien que pidió pasar al plan Pro desde la app. Al activarlo le queda andando 30 días.</p>
    <div class="tabla">
      <div class="tabla-encabezado" style="grid-template-columns:${cols}">
        <div>Persona</div><div>Rubro</div><div>Localidad</div>
        <div>Tiene</div><div>Quiere</div><div>Acciones</div>
      </div>
      ${filas.map(f => `
        <div class="tabla-fila" style="grid-template-columns:${cols}">
          <div class="persona">
            <span class="persona-avatar">${esc(iniciales(f.nombre))}</span>
            <span class="celda-corta">
              <div class="persona-nombre celda-corta">${esc(f.nombre || 'Sin nombre')}</div>
              <div class="persona-fecha">Lo pidió ${fechaCorta(f.creado_en)} · ${num(f.trabajos)} trabajos hechos</div>
            </span>
          </div>
          <div class="celda-corta" data-rotulo="Rubro">${esc(nombreRubro(f.rubro))}</div>
          <div class="celda-corta" data-rotulo="Localidad">${esc(f.localidad || '—')}</div>
          <div data-rotulo="Tiene"><span class="pildora p-gris">${esc(NOMBRE_PLAN[f.plan_actual] || f.plan_actual)}</span></div>
          <div data-rotulo="Quiere"><span class="pildora p-ambar">${esc(NOMBRE_PLAN[f.plan] || f.plan)}</span></div>
          <div class="acciones-celda" data-rotulo="Acciones">
            <button class="btn-mini" data-ficha="${esc(f.usuario_id)}">Ver ficha</button>
            <button class="btn-mini btn-mini-si" data-activar="${esc(f.usuario_id)}" data-plan="${esc(f.plan)}" data-nombre="${esc(f.nombre || '')}">Activar</button>
            <button class="btn-mini btn-mini-mal" data-descartar="${esc(f.id)}" data-nombre="${esc(f.nombre || '')}">Descartar</button>
          </div>
        </div>`).join('')}
    </div>` : `
    <div class="vacio-admin">
      <h3>Nadie está esperando el plan Pro</h3>
      <p>Acá caen los pedidos que llegan desde la app. Si alguien lo arregla por WhatsApp, activale el Pro desde su ficha en Usuarios.</p>
      <button class="btn-admin" data-ir="usuarios">Ir a Usuarios</button>
    </div>`;

  document.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => irASeccion(b.dataset.ir)));
  document.querySelectorAll('[data-ficha]').forEach(b =>
    b.addEventListener('click', () => abrirFichaUsuario(b.dataset.ficha)));

  document.querySelectorAll('[data-activar]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm(`¿Activarle el plan Pro a ${b.dataset.nombre || 'esta persona'}?\n\nQueda andando 30 días desde hoy.`)) return;
      b.disabled = true;
      const { error } = await sb.rpc('activar_plan', { p_usuario: b.dataset.activar, p_plan: b.dataset.plan });
      if (error) { b.disabled = false; brindis(error.message || 'No se pudo'); return; }
      brindis('Plan Pro activado por 30 días');
      verPlanesPendientes();
    });
  });

  document.querySelectorAll('[data-descartar]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm(`¿Descartar el pedido de ${b.dataset.nombre || 'esta persona'}?\n\nSale de esta lista y no se le activa nada. Si lo vuelve a pedir desde la app, aparece de nuevo.`)) return;
      const { error } = await sb.rpc('admin_descartar_interes', { p_id: b.dataset.descartar });
      if (error) { brindis(error.message || 'No se pudo'); return; }
      brindis('Pedido descartado');
      verPlanesPendientes();
    });
  });
}




Panel.registrar('planes', {
  titulo:   'Planes',
  bajada:   'Quiénes pidieron pasar de plan',
  pintar:   () => verPlanesPendientes(),
  insignia: () => contarPlanesPendientes()
});
