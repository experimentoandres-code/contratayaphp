/* ============================================================
   CONTRATÁ YA — Jugá mientras esperás un laburo
   Runner infinito, estilo dinosaurio de Chrome.
   Score sin tope. La dificultad sube de a poco: más velocidad,
   menos hueco entre obstáculos y paquetes de 2–3.
   ============================================================ */
window.JuegoCorrer = (() => {
  const HI_KEY = 'contrataya-jugar-hi';
  const PLOMO = '#F0A63A';
  const CAL = '#EDE7DA';
  const CAL2 = '#A6BAB4';
  const SUELO = '#1B303E';
  const OBST = '#7E8D98';
  const TECHO = '#C45C48';

  let canvas, ctx, raf, w, h, dpr;
  let corriendo = false;
  let muerto = false;
  let listo = false;
  let t0 = 0;
  let sueloY = 0;
  let vel = 0;
  let score = 0;
  let hi = 0;
  let vy = 0;
  let obreroY = 0;
  let enAire = false;
  let hold = false;
  let paso = 0;
  let distSuelo = 0;
  let proximo = 0;
  let obstaculos = [];
  let nubes = [];
  let noche = false;
  let avisoPendiente = false;
  let premioPedido = false;
  let premioGanado = false;

  const SCORE_PRO = 10000;

  const OBRERO_W = 34;
  const OBRERO_H = 52;
  const OBRERO_X = 56;
  const GRAV = 2200;
  const SALTO = -780;
  const VEL0 = 270;

  function hiLeer() {
    try { return Number(localStorage.getItem(HI_KEY) || 0) || 0; } catch { return 0; }
  }
  function hiGuardar(n) {
    try { localStorage.setItem(HI_KEY, String(n)); } catch {}
  }

  function resize() {
    if (!canvas) return;
    const caja = canvas.parentElement;
    const cw = Math.max(280, caja.clientWidth);
    const ch = Math.max(220, caja.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = cw;
    h = ch;
    sueloY = Math.round(h * 0.78);
    if (!enAire) obreroY = sueloY;
  }

  function reset() {
    muerto = false;
    listo = true;
    vel = VEL0;
    score = 0;
    vy = 0;
    enAire = false;
    hold = false;
    paso = 0;
    distSuelo = 0;
    proximo = 420;
    obstaculos = [];
    nubes = [];
    noche = false;
    premioPedido = false;
    obreroY = sueloY;
    for (let i = 0; i < 4; i++) {
      nubes.push({ x: 80 + i * 160, y: 28 + (i % 3) * 18, s: 0.25 + (i % 3) * 0.08 });
    }
  }

  /* Velocidad, huecos y combos crecen con el score, sin techo duro.
     La curva es rápida al principio y después se pone más densa. */
  function curva() {
    const t = score;
    const velAhora = VEL0 + 390 * (1 - Math.exp(-t / 2200)) + t * 0.022;
    const gapMin = Math.max(148, 236 - t * 0.014);
    const gapBase = Math.max(gapMin + 36, 470 - velAhora * 0.26);
    const gapJitter = Math.max(28, 150 - t * 0.018);
    const combo = t < 280 ? 0 : Math.min(0.48, (t - 280) / 3800);
    const triple = t < 1100 ? 0 : Math.min(0.28, (t - 1100) / 5200);
    return { vel: velAhora, gapBase, gapJitter, combo, triple };
  }

  function tipoObst() {
    const r = Math.random();
    const t = score;
    if (t > 900 && r < 0.18) return 'pared';
    if (r < 0.34) return 'casa';
    if (r < 0.67) return 'pared';
    return 'tierra';
  }

  function medidas(tipo) {
    if (tipo === 'casa') return { w: 48, h: 46 };
    if (tipo === 'pared') return { w: 20, h: 58 };
    return { w: 58, h: 26 };
  }

  function spawnUno(x) {
    const tipo = tipoObst();
    const m = medidas(tipo);
    obstaculos.push({ tipo, x, w: m.w, h: m.h });
    return m.w;
  }

  function spawn() {
    const d = curva();
    let x = w + 24;
    let extra = 0;
    extra += spawnUno(x);
    if (Math.random() < d.combo) {
      x += extra + 16 + Math.random() * 22;
      extra = 0;
      extra += spawnUno(x);
      if (Math.random() < d.triple) {
        x += extra + 14 + Math.random() * 16;
        extra = 0;
        extra += spawnUno(x);
      }
    }
    proximo = d.gapBase + Math.random() * d.gapJitter + extra;
  }

  function hayInterstitial() {
    return avisoPendiente || !!document.getElementById('interCerrar');
  }

  function puedePremio() {
    try {
      const yo = (typeof Estado !== 'undefined' && Estado.yo) ? Estado.yo : null;
      if (!yo) return true;
      if (yo.pro_juego_en) return false;
      if (String(yo.plan) === 'pro' && !yo.plan_hasta) return false;
      return true;
    } catch { return true; }
  }

  function cruzarPremio() {
    if (premioPedido || score < SCORE_PRO) return;
    premioPedido = true;
    if (typeof window.proPorJugar !== 'function') return;
    Promise.resolve(window.proPorJugar(Math.floor(score)))
      .then((r) => { if (r && r.ok) premioGanado = true; })
      .catch(() => {});
  }

  function avisarPerdida() {
    if (typeof window.interstitialPorPerdidaJugar !== 'function') return;
    avisoPendiente = true;
    Promise.resolve(window.interstitialPorPerdidaJugar())
      .catch(() => {})
      .finally(() => { avisoPendiente = false; });
  }

  function saltar() {
    if (hayInterstitial()) return;
    if (muerto) { reset(); t0 = performance.now(); return; }
    if (!listo) { reset(); t0 = performance.now(); return; }
    if (!enAire) {
      vy = SALTO;
      enAire = true;
      hold = true;
    }
  }

  function soltar() {
    hold = false;
    if (enAire && vy < -180) vy = -180;
  }

  function hitboxObrero() {
    return { x: OBRERO_X + 6, y: obreroY - OBRERO_H + 6, w: OBRERO_W - 12, h: OBRERO_H - 10 };
  }
  function hitboxObs(o) {
    return { x: o.x + 4, y: sueloY - o.h + 2, w: o.w - 8, h: o.h - 4 };
  }
  function choca(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function dibujarObrero(x, y, t) {
    const pata = enAire ? 6 : Math.sin(t * 12) * 7;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = PLOMO;
    ctx.fillStyle = PLOMO;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.ellipse(17, -44, 11, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(6, -44, 22, 4);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(17, -34, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(17, -27);
    ctx.lineTo(17, -12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(17, -24);
    ctx.lineTo(6, -14);
    ctx.moveTo(17, -24);
    ctx.lineTo(28, -16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(17, -12);
    ctx.lineTo(10, pata);
    ctx.moveTo(17, -12);
    ctx.lineTo(24, -pata);
    ctx.stroke();
    ctx.restore();
  }

  function dibujarCasa(x, y, bw, bh) {
    const techo = 16;
    ctx.fillStyle = OBST;
    ctx.fillRect(x, y - bh + techo, bw, bh - techo);
    ctx.fillStyle = TECHO;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - bh + techo);
    ctx.lineTo(x + bw / 2, y - bh);
    ctx.lineTo(x + bw + 4, y - bh + techo);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0B1620';
    ctx.fillRect(x + bw * 0.38, y - 16, 10, 16);
  }

  function dibujarPared(x, y, bw, bh) {
    ctx.fillStyle = OBST;
    ctx.fillRect(x, y - bh, bw, bh);
    ctx.strokeStyle = '#0B1620';
    ctx.lineWidth = 1;
    for (let i = 8; i < bh; i += 10) {
      ctx.beginPath();
      ctx.moveTo(x, y - i);
      ctx.lineTo(x + bw, y - i);
      ctx.stroke();
    }
  }

  function dibujarTierra(x, y, bw, bh) {
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + bw * 0.25, y - bh * 1.15, x + bw * 0.5, y - bh);
    ctx.quadraticCurveTo(x + bw * 0.78, y - bh * 0.7, x + bw, y);
    ctx.closePath();
    ctx.fill();
  }

  function dibujarNube(n) {
    ctx.fillStyle = noche ? 'rgba(237,231,218,0.06)' : 'rgba(237,231,218,0.12)';
    ctx.beginPath();
    ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
    ctx.arc(n.x + 16, n.y + 2, 16, 0, Math.PI * 2);
    ctx.arc(n.x + 32, n.y, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  function textoScore(n) {
    const s = String(Math.floor(n));
    return s.length < 5 ? s.padStart(5, '0') : s;
  }

  function pintar() {
    ctx.fillStyle = noche ? '#071018' : 'transparent';
    if (noche) ctx.fillRect(0, 0, w, h);
    else ctx.clearRect(0, 0, w, h);

    nubes.forEach(dibujarNube);

    ctx.strokeStyle = SUELO;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, sueloY);
    ctx.lineTo(w, sueloY);
    ctx.stroke();

    ctx.strokeStyle = noche ? 'rgba(237,231,218,0.1)' : 'rgba(237,231,218,0.18)';
    ctx.lineWidth = 2;
    const g = ((-distSuelo) % 28);
    for (let x = g; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, sueloY + 7);
      ctx.lineTo(x + 12, sueloY + 7);
      ctx.stroke();
    }

    obstaculos.forEach(o => {
      const y = sueloY;
      if (o.tipo === 'casa') dibujarCasa(o.x, y, o.w, o.h);
      else if (o.tipo === 'pared') dibujarPared(o.x, y, o.w, o.h);
      else dibujarTierra(o.x, y, o.w, o.h);
    });

    dibujarObrero(OBRERO_X, obreroY, paso);

    ctx.fillStyle = CAL;
    ctx.font = '600 16px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(textoScore(score), w - 16, 28);
    if (hi > 0) {
      ctx.fillStyle = CAL2;
      ctx.fillText('HI ' + textoScore(hi), w - 16, 48);
    }
    if (!premioGanado) {
      ctx.fillStyle = PLOMO;
      ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
      ctx.fillText('META ' + textoScore(SCORE_PRO), w - 16, hi > 0 ? 66 : 48);
    }

    if (premioGanado) {
      ctx.fillStyle = PLOMO;
      ctx.font = '800 14px Archivo, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PRO · 1 MES', 16, 28);
    }

    if (!listo && !muerto) {
      ctx.fillStyle = PLOMO;
      ctx.font = '700 18px Inter Tight, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tocá para correr', w / 2, h * 0.42);
      ctx.fillStyle = CAL2;
      ctx.font = '400 13px Inter Tight, sans-serif';
      ctx.fillText('Saltá casas, paredes y montañas de tierra', w / 2, h * 0.42 + 24);
      ctx.fillText('Llegá a 10.000 en esta partida y el plan Pro es tuyo un mes', w / 2, h * 0.42 + 44);
    }

    if (muerto) {
      ctx.fillStyle = PLOMO;
      ctx.font = '800 22px Archivo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CHOCASTE', w / 2, h * 0.38);
      ctx.fillStyle = CAL;
      ctx.font = '500 14px Inter Tight, sans-serif';
      ctx.fillText(textoScore(score) + '  ·  Tocá para volver a intentar', w / 2, h * 0.38 + 28);
    }
  }

  function tick(now) {
    if (!corriendo) return;
    const dt = Math.min(0.032, (now - t0) / 1000) || 0.016;
    t0 = now;

    if (listo && !muerto) {
      const d = curva();
      vel = d.vel;
      score += vel * dt * 0.12;
      if (score >= SCORE_PRO) cruzarPremio();
      noche = Math.floor(score / 800) % 2 === 1;
      paso += dt;
      distSuelo += vel * dt;
      proximo -= vel * dt;
      if (proximo <= 0) spawn();

      obstaculos.forEach(o => { o.x -= vel * dt; });
      obstaculos = obstaculos.filter(o => o.x + o.w > -20);

      nubes.forEach(n => {
        n.x -= vel * dt * n.s;
        if (n.x < -50) n.x = w + 40 + Math.random() * 80;
      });

      vy += GRAV * dt * (hold && vy < 0 ? 0.72 : 1);
      obreroY += vy * dt;
      if (obreroY >= sueloY) {
        obreroY = sueloY;
        vy = 0;
        enAire = false;
      }

      const yo = hitboxObrero();
      for (const o of obstaculos) {
        if (choca(yo, hitboxObs(o))) {
          muerto = true;
          if (score > hi) {
            hi = Math.floor(score);
            hiGuardar(hi);
          }
          avisarPerdida();
          break;
        }
      }
    }

    pintar();
    raf = requestAnimationFrame(tick);
  }

  function onDown(e) {
    if (e && e.cancelable) e.preventDefault();
    saltar();
  }
  function onUp(e) {
    if (e && e.cancelable) e.preventDefault();
    soltar();
  }
  function onKey(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (e.type === 'keydown' && !e.repeat) saltar();
      if (e.type === 'keyup') soltar();
    }
  }
  function onVis() {
    if (document.hidden) t0 = performance.now();
  }

  function montar(el) {
    parar();
    canvas = el;
    ctx = canvas.getContext('2d');
    hi = hiLeer();
    listo = false;
    muerto = false;
    avisoPendiente = false;
    premioPedido = false;
    premioGanado = false;
    resize();
    pintar();
    corriendo = true;
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
    canvas.addEventListener('pointerdown', onDown, { passive: false });
    canvas.addEventListener('pointerup', onUp, { passive: false });
    canvas.addEventListener('pointercancel', onUp, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
  }

  function parar() {
    corriendo = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (canvas) {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    }
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
    canvas = null;
    ctx = null;
  }

  return { montar, parar };
})();
