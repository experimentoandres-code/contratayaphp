function _guiaCerrar() {
  if (typeof cerrarHoja === 'function') { cerrarHoja(); return; }
  const hoja = document.getElementById('hoja');
  const panel = document.getElementById('hojaPanel');
  if (hoja) hoja.hidden = true;
  if (panel) panel.style.transform = '';
  document.body.style.overflow = '';
}

function _guiaAbrir(html) {
  if (typeof abrirHoja === 'function') return abrirHoja(html);
  const hoja = document.getElementById('hoja');
  const panel = document.getElementById('hojaPanel');
  if (!hoja || !panel) return;
  panel.scrollTop = 0;
  panel.style.transform = '';
  panel.innerHTML =
    '<div class="hoja-tirador"></div>' +
    '<button class="hoja-cerrar" data-cerrar aria-label="Cerrar">✕</button>' +
    html;
  hoja.hidden = false;
  document.body.style.overflow = 'hidden';
}

(function engancharHojaLanding() {
  const hoja = document.getElementById('hoja');
  if (!hoja || typeof abrirHoja === 'function') return;
  hoja.addEventListener('click', e => {
    if (e.target.dataset.cerrar !== undefined) _guiaCerrar();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !hoja.hidden) _guiaCerrar();
  });
})();

function verTutorial() {
  const ladoIni = (typeof Estado !== 'undefined' && Estado.rol === 'pro') ? 'pro' : 'cli';
  _guiaAbrir(
    '<h2>C\u00f3mo se usa Contrat\u00e1 Ya</h2>' +
    '<p>Es como Tinder, pero para oficios. Abajo ten\u00e9s Buscar, Matches, Jug\u00e1, Beneficios y Perfil. Te explico los dos lados, en criollo.</p>' +
    '<div class="guia-tabs">' +
    '<button class="guia-tab ' + (ladoIni === 'cli' ? 'activa' : '') + '" data-guia="cli">Si contrat\u00e1s</button>' +
    '<button class="guia-tab ' + (ladoIni === 'pro' ? 'activa' : '') + '" data-guia="pro">Si trabaj\u00e1s</button>' +
    '</div>' +
    '<div class="guia-lado" id="guiaCli" ' + (ladoIni === 'cli' ? '' : 'hidden') + '>' +
    paso('1','Buscar','Eleg\u00ed qu\u00e9 oficio necesit\u00e1s (plomero, electricista, mantenimiento\u2026), en qu\u00e9 pueblo est\u00e1s y si es urgente. Toc\u00e1 el bot\u00f3n y aparecen tarjetas de gente real de tu zona.') +
    paso('2','Las tarjetas','Arrastr\u00e1 a la derecha o toc\u00e1 el tilde si te sirve. A la izquierda o la cruz si no. Toc\u00e1 \u201cVer ficha\u201d para leer m\u00e1s. Si no hay foto de verdad, esa persona no aparece.') +
    paso('3','Matches','Cuando los dos se eligen, hay match. Ah\u00ed se abre el chat. El precio lo arreglan ustedes. Cuando est\u00e9n de acuerdo, abr\u00ed un trabajo desde esa pantalla para despu\u00e9s poder calificar.') +
    paso('4','El trabajo','Marc\u00e1 cuando empieza y cuando termina. Al terminar, calificalo con estrellas. Hasta que califiques no pod\u00e9s pedir otro: es para que las estrellas valgan.') +
    paso('5','Beneficios','Son descuentos de comercios para los profesionales, no para vos. Si tu oficio compra materiales, puede usarlos. A vos te sirven para saber que hay gente seria en la zona.') +
    paso('6','Jug\u00e1','Mientras esper\u00e1s un laburo, hay un jueguito de correr. Toc\u00e1 para saltar. Si sos profesional y llegás a 10.000 en una partida, te activamos el plan Pro un mes.') +
    paso('7','Perfil','Ac\u00e1 cambi\u00e1s tu nombre, tu foto y tu pueblo. Si tambi\u00e9n ten\u00e9s un oficio, toc\u00e1 \u201cCambiar a modo profesional\u201d. Es la misma cuenta.') +
    '</div>' +
    '<div class="guia-lado" id="guiaPro" ' + (ladoIni === 'pro' ? '' : 'hidden') + '>' +
    paso('1','Tu perfil, primero','Sub\u00ed una foto tuya de la cara. Sin eso no aparec\u00e9s y no te pueden contactar. Complet\u00e1 oficio, pueblos donde trabaj\u00e1s y una descripci\u00f3n corta. El nombre se puede editar si qued\u00f3 raro con el mail.') +
    paso('2','Buscar','Eleg\u00ed tu oficio y tu zona. Ves pedidos de vecinos: qu\u00e9 necesitan y su apuro. Derecha o tilde = me interesa. Izquierda o cruz = no.') +
    paso('3','Matches','Si hay match, charl\u00e1 por el chat. Con el plan Pro armás un presupuesto de mano de obra y se lo mandás por escrito. El cliente puede aceptar el precio; el trabajo igual se inicia cuando los dos lo confirmen.') +
    paso('4','Beneficios','Los comercios de la costa te hacen descuento. Entr\u00e1 a Beneficios, eleg\u00ed el local y mostr\u00e1 tu credencial y el c\u00f3digo en el mostrador. Solo vale desde la app.') +
    paso('5','Avisos al tel\u00e9fono','Instal\u00e1 Contrat\u00e1 Ya en la pantalla de inicio (en iPhone: Compartir \u2192 Agregar a inicio). As\u00ed te llega cuando alguien te pide un trabajo.') +
    paso('6','Jug\u00e1','Si no hay pedidos, entretenete un rato: toc\u00e1 para saltar. Si llegás a 10.000 en una sola partida, te activamos el plan Pro un mes, sin cargo.') +
    paso('7','Perfil','De ac\u00e1 edit\u00e1s datos y, si tambi\u00e9n contrat\u00e1s, pas\u00e1s a modo cliente. El puntaje y las rese\u00f1as se ven en tu tarjeta.') +
    '</div>' +
    '<button class="btn btn-plomo btn-bloque" id="cerrarGuia" style="margin-top:8px">Listo, ya entend\u00ed</button>'
  );

  document.querySelectorAll('.guia-tab').forEach(t => {
    t.addEventListener('click', () => {
      const lado = t.dataset.guia;
      const cli = document.getElementById('guiaCli');
      const pro = document.getElementById('guiaPro');
      if (cli) cli.hidden = lado !== 'cli';
      if (pro) pro.hidden = lado !== 'pro';
      document.querySelectorAll('.guia-tab').forEach(x => x.classList.toggle('activa', x.dataset.guia === lado));
    });
  });
  const c = document.getElementById('cerrarGuia');
  if (c) c.addEventListener('click', _guiaCerrar);
}

function paso(n, tit, txt) {
  return '<div class="guia-paso"><span class="guia-n">' + n + '</span><div><h3>' + tit + '</h3><p>' + txt + '</p></div></div>';
}
