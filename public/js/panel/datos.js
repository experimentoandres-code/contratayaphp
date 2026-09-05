/* ============================================================
   CONTRATÁ YA — Panel · Datos
   Las consultas que usa más de una sección, juntas en un solo
   lugar: contadores del período, presencia, instalaciones y los
   numeritos rojos del menú.

   Las consultas propias de una sola pantalla viven con su sección;
   traerlas acá sólo agregaría un salto para leer el mismo código.
   Depende de nucleo.js (Panel) y de ui.js (desde).
   ============================================================ */


/* ── Contadores del período ────────────────────────────────── */

async function contar(tabla, campoFecha, dias, extra) {
  let q = sb.from(tabla).select('*', { count: 'exact', head: true });
  if (dias) q = q.gte(campoFecha, desde(dias));
  if (extra) q = extra(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

// Compara el período actual contra el anterior de la misma extensión.
async function conVariacion(tabla, campoFecha, extra) {
  const d = Panel.dias;
  const ahora = await contar(tabla, campoFecha, d, extra);

  let q = sb.from(tabla).select('*', { count: 'exact', head: true })
    .gte(campoFecha, desde(d * 2)).lt(campoFecha, desde(d));
  if (extra) q = extra(q);
  const { count: antes } = await q;

  const delta = antes ? Math.round(((ahora - (antes || 0)) / antes) * 100) : null;
  return { ahora, delta };
}


/* ── Quién está y quién instaló la app ─────────────────────── */

async function traerPresenciaAdmin() {
  const m = new Map();
  const { data, error } = await sb.rpc('admin_presencia');
  if (error || !data) return m;
  (data || []).forEach(x => {
    if (x && x.usuario_id && x.visto_en) m.set(x.usuario_id, x.visto_en);
  });
  return m;
}

async function traerInstalacionesAdmin() {
  const { data, error } = await sb.rpc('admin_instalaciones');
  if (error || !data) return new Map();
  const m = new Map();
  (data || []).forEach(x => {
    if (x && x.usuario_id && x.instalada_en) m.set(x.usuario_id, x.instalada_en);
  });
  return m;
}


/* ── Los numeritos rojos del menú ──────────────────────────────
   Van contando y no trayendo las filas: esto corre cada 12
   segundos y traer las denuncias enteras era un derroche.
   Cada sección los declara como su `insignia`.
   ───────────────────────────────────────────────────────────── */

async function contarPlanesPendientes() {
  const { count } = await sb.from('interes_plan')
    .select('*', { count: 'exact', head: true }).eq('estado', 'pendiente');
  return count || 0;
}

async function contarDenunciasAbiertas() {
  const { count } = await sb.from('denuncias')
    .select('*', { count: 'exact', head: true }).eq('estado', 'abierta');
  return count || 0;
}

async function contarBannersSinImagen() {
  const { data } = await sb.from('contratos_publicidad')
    .select('anunciante:anunciantes!anunciante_id(logo_url)').eq('estado', 'activo');
  return (data || []).filter(c => !c.anunciante?.logo_url).length;
}
