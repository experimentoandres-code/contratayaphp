/* ============================================================
   CONTRATÁ YA — Panel · Actividad
   La bitácora: quién hizo qué, en la app y en este panel.
   ============================================================ */

const FILTROS_M = { origen: '', grupo: '', q: '', fino: false };

const GRUPO_TABLAS = {
  usuarios:    ['perfiles'],
  pedidos:     ['pedidos'],
  matches:     ['matches'],
  chats:       ['mensajes'],
  trabajos:    ['trabajos', 'calificaciones'],
  anuncios:    ['anunciantes', 'contratos_publicidad', 'interstitials', 'canjes'],
  moderacion:  ['denuncias', 'interes_plan']
};

const TIPO_MOV = {
  admin: 'Panel',
  cliente: 'Cliente',
  pro: 'Profesional',
  sistema: 'Sistema'
};

function etiquetaDia(f) {
  const d = new Date(f);
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const mismo = (a, b) => a.toDateString() === b.toDateString();
  if (mismo(d, hoy)) return 'Hoy';
  if (mismo(d, ayer)) return 'Ayer';
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function horaMov(f) {
  return new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

async function verActividad() {
  // La tabla de movimientos guarda ids, no nombres ni frases. La RPC arma
  // quién fue y qué hizo; antes la lista salía con todos los renglones vacíos.
  const { data, error } = await sb.rpc('admin_actividad', {
    p_dias: Panel.dias,
    p_origen: FILTROS_M.origen || null,
    p_tablas: (FILTROS_M.grupo && GRUPO_TABLAS[FILTROS_M.grupo]) || null,
    p_q: FILTROS_M.q || null,
    p_fino: !!FILTROS_M.fino,
    p_limite: 400
  });
  if (error) throw error;
  const filas = data || [];

  const grupos = [];
  filas.forEach(m => {
    const dia = etiquetaDia(m.cuando);
    const ultimo = grupos[grupos.length - 1];
    if (!ultimo || ultimo.dia !== dia) grupos.push({ dia, items: [m] });
    else ultimo.items.push(m);
  });

  const opciones = (lista, valor, todos) =>
    `<option value="">${todos}</option>` +
    lista.map(x => `<option value="${esc(x.id)}" ${valor === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('');

  $a('#cuerpo').innerHTML = `
    <div class="filtros">
      <select id="mOrigen">${opciones([
        { id: 'admin', nombre: 'Del panel' },
        { id: 'cliente', nombre: 'Clientes' },
        { id: 'pro', nombre: 'Profesionales' },
        { id: 'sistema', nombre: 'Sistema' }
      ], FILTROS_M.origen, 'Todos los orígenes')}</select>
      <select id="mGrupo">${opciones([
        { id: 'usuarios', nombre: 'Usuarios' },
        { id: 'pedidos', nombre: 'Pedidos' },
        { id: 'matches', nombre: 'Matches' },
        { id: 'trabajos', nombre: 'Trabajos y reseñas' },
        { id: 'anuncios', nombre: 'Anuncios y creativos' },
        { id: 'moderacion', nombre: 'Moderación y planes' },
        { id: 'chats', nombre: 'Chats' }
      ], FILTROS_M.grupo, 'Todo tipo')}</select>
      <input type="search" id="mQ" placeholder="Buscar persona o acción" value="${esc(FILTROS_M.q)}">
      <label class="filtro-check">
        <input type="checkbox" id="mFino" ${FILTROS_M.fino ? 'checked' : ''}>
        Incluir chats y deslizamientos
      </label>
      <span class="filtros-conteo">${num(filas.length)} movimiento${filas.length === 1 ? '' : 's'}</span>
    </div>

    ${filas.length ? grupos.map(g => `
      <div class="mov-dia">
        <h3>${esc(g.dia)}</h3>
        ${g.items.map(m => `
          <article class="mov-fila ${m.actor_tipo === 'admin' ? 'mov-admin' : ''}">
            <time datetime="${esc(m.cuando)}">${esc(horaMov(m.cuando))}</time>
            <span class="persona-avatar mov-avatar">${esc(iniciales(m.actor_nombre))}</span>
            <div class="mov-cuerpo">
              <div class="mov-quien">
                <b>${esc(m.actor_nombre || 'Sistema')}</b>
                <span class="pildora ${m.actor_tipo === 'admin' ? 'p-ambar' : m.actor_tipo === 'pro' ? 'p-verde' : 'p-gris'}">${esc(TIPO_MOV[m.actor_tipo] || m.actor_tipo)}</span>
              </div>
              <p>${esc(m.resumen)}</p>
            </div>
          </article>`).join('')}
      </div>`).join('') : `
    <div class="vacio-admin">
      <h3>No hay movimientos en este período</h3>
      <p>Cuando alguien se registre, publique un pedido, haga match o vos edites un creativo, va a aparecer acá con el nombre, la acción y la hora.</p>
    </div>`}`;

  const enlazar = (id, campo) => {
    const el = $a(id);
    if (!el) return;
    el.addEventListener('change', () => { FILTROS_M[campo] = el.type === 'checkbox' ? el.checked : el.value; verActividad(); });
  };
  enlazar('#mOrigen', 'origen');
  enlazar('#mGrupo', 'grupo');
  enlazar('#mFino', 'fino');
  const buscador = $a('#mQ');
  if (buscador) {
    buscador.addEventListener('input', () => {
      FILTROS_M.q = buscador.value;
      clearTimeout(verActividad._t);
      verActividad._t = setTimeout(() => verActividad(), 280);
    });
  }
}




Panel.registrar('actividad', {
  titulo:  'Actividad',
  bajada:  'Quién hizo qué, en la app y en este panel',
  periodo: true,
  pintar:  () => verActividad()
});
