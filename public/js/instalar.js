/* ============================================================
   CONTRATÁ YA — Instalación
   Detecta plataforma y muestra el camino correcto para cada una.
   ============================================================ */

const Instalar = (() => {
  const ua = navigator.userAgent || '';

  const esIOS = /iPad|iPhone|iPod/.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Navegadores dentro de otra app: ahí "Agregar a inicio" no existe.
  const esNavegadorEmbebido =
    /FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|LinkedInApp/i.test(ua) ||
    (esIOS && /\bGSA\b/.test(ua));

  const esSafari = esIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

  function yaInstalada() {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
      if (window.navigator.standalone === true) return true;
      if (document.referrer && document.referrer.indexOf('android-app://') === 0) return true;
    } catch {}
    return false;
  }

  let eventoInstalacion = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacion = e;
    document.dispatchEvent(new CustomEvent('instalacion:disponible'));
  });

  async function lanzarInstalacion() {
    if (!eventoInstalacion) return false;
    eventoInstalacion.prompt();
    const { outcome } = await eventoInstalacion.userChoice;
    eventoInstalacion = null;
    return outcome === 'accepted';
  }

  async function copiarDireccion() {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      const campo = document.createElement('textarea');
      campo.value = url;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      document.body.removeChild(campo);
      return ok;
    }
  }

  window.addEventListener('appinstalled', () => {
    document.dispatchEvent(new CustomEvent('instalacion:hecha'));
  });

  return {
    esIOS, esSafari, esNavegadorEmbebido,
    get yaInstalada() { return yaInstalada(); },
    get disponible() { return eventoInstalacion !== null; },
    lanzarInstalacion, copiarDireccion
  };
})();

// Registro del service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
