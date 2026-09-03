/* ============================================================
   CONTRATÁ YA — Despachador de avisos por correo
   ------------------------------------------------------------
   Levanta las filas pendientes de la tabla 'avisos' y las manda.
   No usa librerías nuevas: Node 18 ya trae fetch, y tanto
   Supabase como Resend se manejan por HTTP.

   IMPORTANTE — La clave de servicio (SUPABASE_SERVICE_ROLE)
   saltea TODAS las políticas de RLS. Va solamente en las
   variables de entorno de Render. Nunca en public/, nunca en
   el navegador, nunca en el repositorio.
   ============================================================ */

const webpush = require('web-push');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE;
const RESEND_KEY    = process.env.RESEND_API_KEY;
const MAIL_FROM     = process.env.MAIL_FROM || 'Contratá Ya <onboarding@resend.dev>';
const APP_URL       = process.env.APP_URL || 'https://contrataya1.onrender.com';

const VAPID_PUBLICA = process.env.VAPID_PUBLICA;
const VAPID_PRIVADA = process.env.VAPID_PRIVADA;

const pushConfigurado = Boolean(VAPID_PUBLICA && VAPID_PRIVADA);
if (pushConfigurado) {
  webpush.setVapidDetails(`mailto:${process.env.MAIL_CONTACTO || 'hola@contrataya.com.ar'}`,
                          VAPID_PUBLICA, VAPID_PRIVADA);
}

// Cuánto esperamos antes de mandar el correo. Si la persona está
// usando la app y ya vio el aviso adentro, no le mandamos nada.
const ESPERA_MINUTOS = 2;

const configurado = () => Boolean(SUPABASE_URL && SERVICE_ROLE && RESEND_KEY);

const cabeceras = {
  'apikey': SERVICE_ROLE,
  'Authorization': `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json'
};


/* ── Traer los avisos que todavía no salieron ─────────────── */

async function pendientes(limite = 20, campo = 'correo_en') {
  const corte = new Date(Date.now() - ESPERA_MINUTOS * 60000).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/avisos`
    + `?${campo}=is.null`
    + `&leido_en=is.null`          // si ya lo vio en la app, no molestamos
    + `&intentos=lt.5`
    + `&creado_en=lt.${corte}`
    + `&order=creado_en.asc`
    + `&limit=${limite}`;

  const r = await fetch(url, { headers: cabeceras });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}


/* ── El correo de cada usuario vive en auth.users ──────────── */

const cacheCorreos = new Map();

async function correoDe(usuarioId) {
  if (cacheCorreos.has(usuarioId)) return cacheCorreos.get(usuarioId);

  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${usuarioId}`, { headers: cabeceras });
  if (!r.ok) return null;

  const u = await r.json();
  const correo = u?.email || null;
  cacheCorreos.set(usuarioId, correo);
  return correo;
}


/* ── La plantilla ─────────────────────────────────────────── */

function plantilla(aviso) {
  const destino = `${APP_URL}/app.html`;
  const seguro = (t) => String(t || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#0B1620;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B1620;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#12222E;border-radius:16px;overflow:hidden">
        <tr><td style="padding:24px 28px 8px">
          <p style="margin:0;color:#F0A63A;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Contratá Ya</p>
        </td></tr>
        <tr><td style="padding:0 28px">
          <h1 style="margin:8px 0 12px;color:#EDE7DA;font-size:21px;line-height:1.3">${seguro(aviso.titulo)}</h1>
          <p style="margin:0 0 24px;color:#A9B7C1;font-size:15px;line-height:1.5">${seguro(aviso.cuerpo)}</p>
          <a href="${destino}" style="display:inline-block;background:#F0A63A;color:#0B1620;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px">Abrir la app</a>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0;color:#6F818D;font-size:12px;line-height:1.5">
            Recibís este correo porque tenés una cuenta en Contratá Ya, la plataforma de oficios del Partido de la Costa.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}


/* ── Enviar por Resend ────────────────────────────────────── */

async function enviarCorreo(para, aviso) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [para],
      subject: aviso.titulo,
      html: plantilla(aviso)
    })
  });

  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}


/* ── Marcar el resultado ──────────────────────────────────── */

async function marcar(id, campos) {
  await fetch(`${SUPABASE_URL}/rest/v1/avisos?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...cabeceras, 'Prefer': 'return=minimal' },
    body: JSON.stringify(campos)
  });
}


/* ── Push del navegador ───────────────────────────────────────
   El push va más rápido que el correo a propósito: no espera los
   dos minutos. Si la persona está mirando el teléfono, que le
   llegue en el momento; el correo es el respaldo lento.
   ─────────────────────────────────────────────────────────── */

async function suscripcionesDe(usuarioId) {
  const url = `${SUPABASE_URL}/rest/v1/suscripciones_push`
    + `?usuario_id=eq.${usuarioId}&fallos=lt.3&select=*`;
  const r = await fetch(url, { headers: cabeceras });
  if (!r.ok) return [];
  return r.json();
}

async function borrarSuscripcion(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/suscripciones_push?id=eq.${id}`, {
    method: 'DELETE',
    headers: { ...cabeceras, 'Prefer': 'return=minimal' }
  });
}

async function marcarSuscripcion(id, campos) {
  await fetch(`${SUPABASE_URL}/rest/v1/suscripciones_push?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...cabeceras, 'Prefer': 'return=minimal' },
    body: JSON.stringify(campos)
  });
}

async function enviarPush(aviso) {
  const subs = await suscripcionesDe(aviso.destino_id);
  if (!subs.length) return 0;

  const carga = JSON.stringify({
    titulo: aviso.titulo,
    cuerpo: aviso.cuerpo || '',
    tipo: aviso.tipo,
    tag: aviso.match_id || aviso.tipo,
    url: `${APP_URL}/app.html`
  });

  let llegaron = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        carga
      );
      await marcarSuscripcion(s.id, { usada_en: new Date().toISOString(), fallos: 0 });
      llegaron++;

    } catch (e) {
      // 404 y 410 significan que ese dispositivo ya no existe: se desinstaló
      // la app o el usuario revocó el permiso. No tiene sentido reintentar.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await borrarSuscripcion(s.id);
        console.log('[push] suscripción vencida, borrada');
      } else {
        await marcarSuscripcion(s.id, { fallos: (s.fallos || 0) + 1 });
        console.warn('[push] falló un envío:', e.statusCode || '', e.message);
      }
    }
  }

  return llegaron;
}

async function despacharPush() {
  if (!pushConfigurado || !SUPABASE_URL || !SERVICE_ROLE) return { salteado: 'push sin configurar' };

  let enviados = 0;
  try {
    // Sin espera: el push es el canal inmediato.
    const corte = new Date().toISOString();
    const url = `${SUPABASE_URL}/rest/v1/avisos`
      + `?push_en=is.null&leido_en=is.null&intentos=lt.5`
      + `&creado_en=lt.${corte}&order=creado_en.asc&limit=30`;

    const r = await fetch(url, { headers: cabeceras });
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    const lista = await r.json();

    for (const aviso of lista) {
      const llegaron = await enviarPush(aviso);
      await marcar(aviso.id, { push_en: new Date().toISOString() });
      enviados += llegaron;
    }
  } catch (e) {
    console.error('[push] no se pudo procesar la cola:', e.message);
    return { error: e.message };
  }

  if (enviados) console.log(`[push] enviados ${enviados}`);
  return { enviados };
}


/* ── Una vuelta completa ──────────────────────────────────── */

let corriendo = false;

async function despachar() {
  if (!configurado()) return { salteado: 'faltan variables de entorno' };
  if (corriendo) return { salteado: 'ya hay una vuelta en curso' };

  corriendo = true;
  let enviados = 0, fallados = 0;

  // Primero el push, que no espera. El correo es el respaldo lento.
  await despacharPush().catch(() => {});

  try {
    const lista = await pendientes();

    for (const aviso of lista) {
      try {
        const para = await correoDe(aviso.destino_id);

        if (!para) {
          // Sin correo no hay nada que hacer: lo damos por cerrado
          // para que no quede girando en la cola para siempre.
          await marcar(aviso.id, { correo_en: new Date().toISOString(), error: 'sin correo' });
          continue;
        }

        await enviarCorreo(para, aviso);
        await marcar(aviso.id, { correo_en: new Date().toISOString(), error: null });
        enviados++;

      } catch (e) {
        fallados++;
        await marcar(aviso.id, {
          intentos: (aviso.intentos || 0) + 1,
          error: String(e.message || e).slice(0, 400)
        });
        console.error('[avisos] falló', aviso.id, e.message);
      }
    }
  } catch (e) {
    console.error('[avisos] no se pudo leer la cola:', e.message);
    return { error: e.message };
  } finally {
    corriendo = false;
  }

  if (enviados || fallados) console.log(`[avisos] enviados ${enviados}, fallados ${fallados}`);
  return { enviados, fallados };
}


/* ── Latido: una vuelta por minuto ────────────────────────── */

function arrancarDespachador() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.warn('[avisos] apagado: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE');
    return;
  }
  if (!RESEND_KEY)       console.warn('[avisos] correo apagado: falta RESEND_API_KEY');
  if (!pushConfigurado)  console.warn('[avisos] push apagado: faltan VAPID_PUBLICA o VAPID_PRIVADA');

  console.log(`[avisos] despachador encendido, una vuelta por minuto (correo: ${RESEND_KEY ? 'sí' : 'no'}, push: ${pushConfigurado ? 'sí' : 'no'})`);
  setInterval(() => { despachar().catch(() => {}); }, 60000);
}

module.exports = { despachar, despacharPush, arrancarDespachador, configurado };
