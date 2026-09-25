'use strict';
// ============================================================
//  ESCENARIOS PINTADOS: capas de fondo con paralaje y neblina,
//  materiales con textura y luz propia de cada mundo.
//  Solo cambia cómo se ven; la geometría y los eventos no se tocan.
// ============================================================
const SC = {
  // ---- texturas ----
  rockTex(key, base, dark, light, strata = 0.06) {
    const B = parseColor(base), D = parseColor(dark), L = parseColor(light);
    return (x, y) => {
      // texturas de 256 px: todas las escalas dividen 256 para que el patrón no tenga costuras
      const n = fbm2(x / 32, y / 32, 11, 5, 8);
      const band = Math.round(256 * strata / TAU) || 1;
      const s = Math.sin(y * TAU * band / 256 + fbm2(x / 64, y / 64, 5, 3, 4) * 6) * 0.5 + 0.5;
      const cr = vnoise2(x / 8, y / 8, 3, 32) > 0.9 ? 0.35 : 0;
      let col = mixRGB(D, B, clamp(n * 1.3 - 0.1, 0, 1));
      col = mixRGB(col, L, clamp((s - 0.7) * 1.4, 0, 0.28));
      return mixRGB(col, D, cr);
    };
  },
  // bloques de piedra tallada con biselado
  stoneBlocks(c, x, y, w, h, bw, bh, seed, base) {
    const r = srand(seed), B = parseColor(base);
    for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
      const off = row % 2 ? bw / 2 : 0;
      for (let xx = x - off; xx < x + w; xx += bw) {
        const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw), y1 = Math.min(y + h, yy + bh);
        if (x1 - x0 < 2) continue;
        const v = (r() - 0.5) * 0.16;
        c.fillStyle = rgbStr(mixRGB(B, v > 0 ? [255, 240, 220] : [40, 30, 30], Math.abs(v)));
        c.fillRect(x0 + 1, yy + 1, x1 - x0 - 2, y1 - yy - 2);
        c.fillStyle = 'rgba(255,245,225,.28)'; c.fillRect(x0 + 1, yy + 1, x1 - x0 - 2, 2); c.fillRect(x0 + 1, yy + 1, 2, y1 - yy - 2);
        c.fillStyle = 'rgba(30,20,20,.3)'; c.fillRect(x0 + 1, y1 - 3, x1 - x0 - 2, 2); c.fillRect(x1 - 3, yy + 1, 2, y1 - yy - 2);
        // grietas y desgaste
        if (r() > 0.6) { c.strokeStyle = 'rgba(40,28,24,.35)'; c.lineWidth = 1; c.beginPath(); let px = x0 + r() * (x1 - x0), py = yy + 2; c.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 12; py += r() * (bh / 4); c.lineTo(px, py); } c.stroke(); }
      }
    }
  },
  // pasto: muchas hojas finas con dos tonos
  grass(c, x0, x1, y, seed, cols, hMax = 10, dens = 1.4) {
    const r = srand(seed);
    c.lineCap = 'round';
    for (let x = x0; x < x1; x += 1 / dens) {
      const hgt = 3 + r() * hMax * (0.4 + 0.6 * vnoise1(x / 30, seed)), lean = (r() - 0.4) * 4;
      c.strokeStyle = cols[Math.floor(r() * cols.length)]; c.lineWidth = 0.9 + r() * 0.9;
      c.beginPath(); c.moveTo(x, y + 2); c.quadraticCurveTo(x + lean * 0.3, y - hgt * 0.6, x + lean, y - hgt); c.stroke();
    }
  },
  // masa de roca invertida (isla flotante), con estratos y luz del lado del sol
  islandPath(c, x0, x1, top, depth, seed, tipX) {
    const r = srand(seed), pts = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(x0, x1, t);
      const prof = Math.pow(Math.sin(Math.PI * clamp((x - x0) / (tipX - x0) * 0.5, 0, 0.5) + (x > tipX ? Math.PI * 0.5 * (x - tipX) / (x1 - tipX) : 0)), 1);
      const d = x <= tipX ? Math.sin((x - x0) / (tipX - x0) * Math.PI / 2) : Math.cos((x - tipX) / (x1 - tipX) * Math.PI / 2);
      void prof;
      pts.push([x + (r() - 0.5) * 16, top + 10 + depth * Math.pow(d, 1.6) * (0.75 + r() * 0.35)]);
    }
    c.beginPath(); c.moveTo(x0, top);
    for (const [px, py] of pts) c.lineTo(px, py);
    c.lineTo(x1, top); c.closePath();
    return pts;
  },
  // columna de mármol con estrías
  column(c, x, yTop, yBot, w, broken, seed) {
    const r = srand(seed);
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#8f8577'); g.addColorStop(0.35, '#e9dfcf'); g.addColorStop(0.7, '#fff6e6'); g.addColorStop(1, '#b3a58f');
    const top = broken ? yTop + 16 : yTop + 12;
    c.fillStyle = g;
    if (broken) {
      c.beginPath(); c.moveTo(x - w / 2, yBot - 10); c.lineTo(x - w / 2, top + 10);
      for (let k = 0; k <= 5; k++) c.lineTo(x - w / 2 + w * k / 5, top + (r() - 0.3) * 18);
      c.lineTo(x + w / 2, yBot - 10); c.closePath(); c.fill();
    } else c.fillRect(x - w / 2, top, w, yBot - top - 10);
    c.strokeStyle = 'rgba(90,78,64,.35)'; c.lineWidth = 1.2;
    for (let k = 1; k < 5; k++) { const xx = x - w / 2 + w * k / 5; c.beginPath(); c.moveTo(xx, top + 12); c.lineTo(xx, yBot - 12); c.stroke(); }
    // base y capitel
    const cap = (yy, hh, ww) => { const gg = c.createLinearGradient(0, yy, 0, yy + hh); gg.addColorStop(0, '#fff4e2'); gg.addColorStop(1, '#a89880'); c.fillStyle = gg; roundRect(c, x - ww / 2, yy, ww, hh, 3); c.fill(); };
    cap(yBot - 12, 12, w + 14);
    if (!broken) { cap(yTop, 14, w + 16); c.fillStyle = 'rgba(80,68,54,.4)'; c.fillRect(x - w / 2 - 4, yTop + 14, w + 8, 3); }
  },
  // sombra de contacto que da peso: bajo cualquier cosa apoyada
  aoLine(c, x, y, w, h = 10, a = 0.35) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
  },
  rays(c, x, y, n, len, col, t, a = 0.08, spread = 0.18) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const an = Math.PI * 0.62 + i * (Math.PI * 0.9 / n) + Math.sin(t * 0.004 + i * 1.7) * 0.05;
      const g = c.createLinearGradient(x, y, x + Math.cos(an) * len, y + Math.sin(an) * len);
      g.addColorStop(0, withAlpha(col, a * (0.6 + 0.4 * Math.sin(t * 0.01 + i)))); g.addColorStop(1, withAlpha(col, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(x, y);
      c.lineTo(x + Math.cos(an - spread * 0.5) * len, y + Math.sin(an - spread * 0.5) * len);
      c.lineTo(x + Math.cos(an + spread * 0.5) * len, y + Math.sin(an + spread * 0.5) * len); c.closePath(); c.fill();
    }
    c.restore();
  },
  // partículas ambientales en pantalla (polvo de luz, ceniza, lluvia...)
  motes(st, n, make) { if (!st._motes) st._motes = Array.from({ length: n }, (_, i) => make(i, true)); return st._motes; },
};

// ================================================================
//  TEMPLO DEL CIELO — hora dorada sobre un mar de nubes
// ================================================================
const SCENERY = {};
SCENERY.temple = {
  light: { dir: [0.82, -0.57], rim: '#ffd9a0', rimA: 0.7, shade: 'rgba(40,30,80,.38)', amb: 'rgba(255,190,130,.05)' },
  grade: { bloom: 0.2, bloomPow: 3, top: 'rgba(30,60,140,.4)', bottom: 'rgba(120,60,90,.3)', vig: 0.6 },
  sun: [W * 0.76, H * 0.47],
  drawBG(c, cam) {
    const t = this.t, [sx, sy] = SCENERY.temple.sun;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1c3264'); g.addColorStop(0.32, '#4a6aa5'); g.addColorStop(0.58, '#d99a86'); g.addColorStop(0.74, '#f7c38c'); g.addColorStop(0.9, '#ffe3b3'); g.addColorStop(1, '#ffd49a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // sol bajo y rayos
    ART.drawGlow(c, sx, sy, 520, '#ffb070', 0.55);
    ART.drawGlow(c, sx, sy, 190, '#fff1c8', 0.9);
    c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(sx, sy, 34, 0, TAU); c.fill();
    SC.rays(c, sx, sy, 9, 900, '#ffe2a8', t, 0.07, 0.12);
    // cordillera lejana
    const far = ART.layer('temple-far', 2200, 720, (x, w, h) => {
      x.fillStyle = '#9c9ac0'; ART.ridge(x, w, 470, 190, 3, 420, 6, true); x.fill();
      const hz = x.createLinearGradient(0, 280, 0, 520); hz.addColorStop(0, 'rgba(250,210,180,0)'); hz.addColorStop(1, 'rgba(250,205,170,.85)');
      x.fillStyle = hz; x.fillRect(0, 280, w, 440);
      x.fillStyle = '#b8a8bf'; ART.ridge(x, w, 520, 120, 9, 260, 6, true); x.fill();
      // nieve en las crestas lejanas
      x.globalCompositeOperation = 'source-atop'; const sn = x.createLinearGradient(0, 290, 0, 400); sn.addColorStop(0, 'rgba(255,245,235,.7)'); sn.addColorStop(1, 'rgba(255,245,235,0)'); x.fillStyle = sn; x.fillRect(0, 280, w, 130);
      x.globalCompositeOperation = 'source-over';
      const hz2 = x.createLinearGradient(0, 420, 0, 560); hz2.addColorStop(0, 'rgba(255,214,170,0)'); hz2.addColorStop(1, 'rgba(255,214,170,.9)');
      x.fillStyle = hz2; x.fillRect(0, 420, w, 300);
    });
    ART.drawLayer(c, far, cam, 0.03, 0);
    // mar de nubes iluminado por el sol
    const sea = ART.layer('temple-sea', 2400, 720, (x, w) => {
      const r = srand(4);
      for (let row = 0; row < 4; row++) for (let i = 0; i < 16; i++) {
        const cw = 260 + r() * 260, ch = 90 + r() * 60, cx = (i / 16) * w + r() * 120 - 60, cy = 470 + row * 55 + r() * 30;
        const lit = row < 2 ? '#fbe2c8' : '#f1cdb4', dark = row < 2 ? '#a9809a' : '#96718c';
        x.drawImage(ART.cloud(100 + row * 20 + i, Math.round(cw), Math.round(ch), lit, dark), cx - cw / 2, cy - ch / 2, cw, ch);
        if (cx + cw / 2 > w) x.drawImage(ART.cloud(100 + row * 20 + i, Math.round(cw), Math.round(ch), lit, dark), cx - cw / 2 - w, cy - ch / 2, cw, ch);
      }
      const lo = x.createLinearGradient(0, 560, 0, 720); lo.addColorStop(0, 'rgba(236,196,180,0)'); lo.addColorStop(1, 'rgba(214,170,170,.9)');
      x.fillStyle = lo; x.fillRect(0, 560, w, 160);
    });
    ART.drawLayer(c, sea, cam, 0.06, 20);
    // islas lejanas con templos y cascadas
    const isl = ART.layer('temple-isles', 2400, 720, (x, w) => {
      const r = srand(21);
      for (let i = 0; i < 4; i++) {
        const ix = 200 + i * 600 + r() * 120, iy = 360 + (i % 2) * 70, iw = 220 + r() * 120;
        x.save(); x.translate(ix, iy);
        // roca: en contraluz, con borde cálido del lado del sol
        const rg = x.createLinearGradient(0, 0, 0, 200); rg.addColorStop(0, '#8d7690'); rg.addColorStop(1, 'rgba(160,130,160,0)');
        x.fillStyle = rg; SC.islandPath(x, -iw / 2, iw / 2, 0, 170, 40 + i, iw * 0.08); x.fill();
        x.fillStyle = '#9fb58a'; x.fillRect(-iw / 2, -4, iw, 7);
        // templo
        x.fillStyle = '#a58fa0';
        x.fillRect(-40, -52, 80, 48); x.beginPath(); x.moveTo(-58, -52); x.lineTo(0, -84); x.lineTo(58, -52); x.closePath(); x.fill();
        for (let k = -30; k <= 30; k += 15) { x.fillStyle = '#b7a2b1'; x.fillRect(k - 3, -50, 6, 46); }
        x.fillStyle = 'rgba(255,220,170,.55)'; x.fillRect(38, -52, 3, 48); x.fillRect(-iw / 2, -4, iw, 2);
        // cascada que se pierde en las nubes
        const wf = x.createLinearGradient(0, 0, 0, 220); wf.addColorStop(0, 'rgba(235,245,255,.75)'); wf.addColorStop(1, 'rgba(235,245,255,0)');
        x.fillStyle = wf; x.fillRect(iw * 0.25, 2, 9, 220); x.fillRect(iw * 0.25 + 12, 2, 4, 180);
        x.restore();
      }
      const hz = x.createLinearGradient(0, 300, 0, 620); hz.addColorStop(0, 'rgba(255,210,170,0)'); hz.addColorStop(1, 'rgba(255,215,180,.55)');
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = hz; x.fillRect(0, 0, w, 720);
    });
    ART.drawLayer(c, isl, cam, 0.1, -10);
    // nubes que pasan (vivas, con paralaje)
    for (const cl of this.clouds) {
      cl.x += 0.22 * cl.z; if (cl.x > 1800) cl.x = -1800;
      const x = W / 2 + (cl.x - cam.x * cl.z) * 0.5, y = H / 2 + (cl.y - cam.y * cl.z) * 0.5;
      const cw = 240 * cl.s, ch = 90 * cl.s;
      if (x + cw < 0 || x - cw > W) continue;
      c.globalAlpha = 0.55 + cl.z * 0.45;
      c.drawImage(ART.cloud(Math.round(cl.s * 97), 240, 90, '#fff6e8', '#c9a3b4'), x - cw / 2, y - ch / 2, cw, ch);
    }
    c.globalAlpha = 1;
    // grandes ruinas a media distancia
    const ruins = ART.layer('temple-ruins2', 2600, 720, (x, w) => {
      // columnatas en ruinas: fuste con estrías, capitel y arquitrabe; borde cálido del lado del sol
      const r = srand(8);
      const col = (cx, top, cw, broken) => {
        const g = x.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
        g.addColorStop(0, '#6e6582'); g.addColorStop(0.55, '#8a7f9c'); g.addColorStop(0.9, '#a795ab'); g.addColorStop(1, '#e8bf9c');
        x.fillStyle = g;
        if (broken) { x.beginPath(); x.moveTo(cx - cw / 2, 720); x.lineTo(cx - cw / 2, top + 14); x.lineTo(cx - cw * 0.1, top); x.lineTo(cx + cw * 0.2, top + 18); x.lineTo(cx + cw / 2, top + 8); x.lineTo(cx + cw / 2, 720); x.closePath(); x.fill(); }
        else { x.fillRect(cx - cw / 2, top, cw, 720 - top); x.fillStyle = '#9a8ea6'; x.fillRect(cx - cw / 2 - 8, top - 14, cw + 16, 14); x.fillStyle = 'rgba(232,191,156,.7)'; x.fillRect(cx + cw / 2 + 4, top - 14, 4, 14); }
        x.fillStyle = 'rgba(50,40,70,.25)'; for (let k = 1; k < 4; k++) x.fillRect(cx - cw / 2 + cw * k / 4 - 1, top + 16, 2, 720 - top);
      };
      for (let i = 0; i < 6; i++) {
        const bx = 120 + i * 440 + r() * 60, top = 200 + r() * 120, cw = 44 + r() * 14;
        col(bx, top, cw, r() > 0.6);
        if (i % 2 === 0) {
          const bx2 = bx + 150; col(bx2, top, cw, false);
          x.fillStyle = '#8f839f'; x.fillRect(bx - cw / 2 - 10, top - 40, bx2 - bx + cw + 20, 26);
          x.fillStyle = 'rgba(232,191,156,.55)'; x.fillRect(bx - cw / 2 - 10, top - 40, bx2 - bx + cw + 20, 3);
          x.fillStyle = 'rgba(50,40,70,.3)'; x.fillRect(bx - cw / 2 - 10, top - 18, bx2 - bx + cw + 20, 4);
        }
      }
      const hz = x.createLinearGradient(0, 160, 0, 720); hz.addColorStop(0, 'rgba(250,200,170,.15)'); hz.addColorStop(0.65, 'rgba(236,190,176,.5)'); hz.addColorStop(1, 'rgba(220,178,176,.85)');
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = hz; x.fillRect(0, 0, w, 720);
    });
    ART.drawLayer(c, ruins, cam, 0.2, 90, { yk: 1.6 });
  },
  drawStage(c) {
    const s = this.solids[0];
    const island = ART.bake('temple-island', s.x - 40, s.y - 150, s.w + 80, 520, x => {
      // roca inferior
      const pts = SC.islandPath(x, s.x - 6, s.x + s.w + 6, s.y + 40, 280, 7, s.x + s.w * 0.52);
      x.save(); x.clip();
      x.fillStyle = ART.pattern(x, 'temple-rock', 256, SC.rockTex('tr', '#8a6f5c', '#3b2c2c', '#c9a27f', 0.09)); x.fillRect(s.x - 40, s.y, s.w + 80, 400);
      const sh = x.createLinearGradient(0, s.y + 40, 0, s.y + 330); sh.addColorStop(0, 'rgba(255,200,150,.12)'); sh.addColorStop(0.4, 'rgba(40,30,70,.25)'); sh.addColorStop(1, 'rgba(30,20,60,.75)');
      x.fillStyle = sh; x.fillRect(s.x - 40, s.y, s.w + 80, 400);
      const rim = x.createLinearGradient(s.x + s.w * 0.55, 0, s.x + s.w + 10, 0); rim.addColorStop(0, 'rgba(255,190,120,0)'); rim.addColorStop(1, 'rgba(255,190,120,.45)');
      x.fillStyle = rim; x.fillRect(s.x, s.y, s.w + 40, 400);
      // cristales incrustados
      const r = srand(12);
      for (let i = 0; i < 9; i++) {
        const cx = s.x + s.w * (0.18 + r() * 0.64), cy = s.y + 90 + r() * 170, ch = 14 + r() * 22;
        x.save(); x.translate(cx, cy); x.rotate((r() - 0.5) * 0.8);
        const cg = x.createLinearGradient(-6, 0, 6, 0); cg.addColorStop(0, '#0e6d6a'); cg.addColorStop(0.5, '#7ff5e8'); cg.addColorStop(1, '#1aa39a');
        x.fillStyle = cg; x.beginPath(); x.moveTo(0, -ch); x.lineTo(7, -ch * 0.3); x.lineTo(5, ch * 0.4); x.lineTo(-5, ch * 0.4); x.lineTo(-7, -ch * 0.3); x.closePath(); x.fill();
        x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(-1, -ch * 0.8, 2, ch * 0.8);
        x.restore();
      }
      x.restore();
      // raíces colgando
      x.strokeStyle = 'rgba(60,45,35,.85)'; x.lineCap = 'round';
      const r2 = srand(5);
      for (let i = 0; i < 14; i++) { const px = s.x + 20 + r2() * (s.w - 40), py = s.y + 50; x.lineWidth = 1 + r2() * 2.2; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + 8, py + 30, px - 10, py + 60, px + (r2() - 0.5) * 20, py + 40 + r2() * 90); x.stroke(); }
      void pts;
      // cara del suelo: bloques tallados + friso con incrustaciones turquesa
      SC.stoneBlocks(x, s.x, s.y + 14, s.w, 50, 86, 25, 3, '#cdb89b');
      const fz = x.createLinearGradient(0, s.y + 14, 0, s.y + 64); fz.addColorStop(0, 'rgba(0,0,0,0)'); fz.addColorStop(1, 'rgba(40,20,30,.35)');
      x.fillStyle = fz; x.fillRect(s.x, s.y + 14, s.w, 50);
      x.fillStyle = '#6e5a49'; x.fillRect(s.x, s.y + 62, s.w, 4);
      // friso con greca (meandro) tallada y filo dorado
      const fy = s.y + 33;
      x.fillStyle = 'rgba(70,52,40,.25)'; x.fillRect(s.x, fy - 3, s.w, 16);
      x.strokeStyle = 'rgba(214,176,98,.8)'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(s.x, fy - 3); x.lineTo(s.x + s.w, fy - 3); x.moveTo(s.x, fy + 13); x.lineTo(s.x + s.w, fy + 13); x.stroke();
      x.strokeStyle = 'rgba(120,92,60,.75)'; x.lineWidth = 1.6; x.beginPath();
      for (let xx = s.x + 6; xx < s.x + s.w - 20; xx += 20) { x.moveTo(xx, fy + 10); x.lineTo(xx, fy); x.lineTo(xx + 14, fy); x.lineTo(xx + 14, fy + 7); x.lineTo(xx + 5, fy + 7); x.lineTo(xx + 5, fy + 3); x.lineTo(xx + 10, fy + 3); x.moveTo(xx, fy + 10); x.lineTo(xx + 20, fy + 10); }
      x.stroke();
      x.strokeStyle = 'rgba(255,240,210,.35)'; x.lineWidth = 0.8; x.beginPath();
      for (let xx = s.x + 7; xx < s.x + s.w - 20; xx += 20) { x.moveTo(xx + 1, fy + 1); x.lineTo(xx + 13, fy + 1); }
      x.stroke();
      // piso: losas de mármol cálido con borde biselado
      const top = x.createLinearGradient(0, s.y, 0, s.y + 16); top.addColorStop(0, '#fff0d6'); top.addColorStop(0.5, '#e6cfae'); top.addColorStop(1, '#a88e73');
      x.fillStyle = top; x.fillRect(s.x, s.y, s.w, 16);
      x.strokeStyle = 'rgba(110,86,64,.45)'; x.lineWidth = 1;
      for (let xx = s.x + 54; xx < s.x + s.w; xx += 54) { x.beginPath(); x.moveTo(xx, s.y + 2); x.lineTo(xx, s.y + 15); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(s.x, s.y, s.w, 1.5);
      SC.aoLine(x, s.x, s.y + 16, s.w, 12, 0.4);
      // musgo y pasto en las orillas
      SC.grass(x, s.x - 4, s.x + 90, s.y + 1, 31, ['#6e9f45', '#8fbf57', '#4f7d35'], 9);
      SC.grass(x, s.x + s.w - 110, s.x + s.w + 4, s.y + 1, 32, ['#6e9f45', '#a9cf6a', '#4f7d35'], 9);
      x.fillStyle = '#5f8f3c'; for (const [a, b] of [[s.x - 4, 70], [s.x + s.w - 90, 94]]) { x.beginPath(); x.ellipse(a + b / 2, s.y + 15, b / 2, 5, 0, 0, TAU); x.fill(); }
      // columnas al fondo del piso
      SC.column(x, -345, -130, s.y + 2, 30, false, 1);
      SC.column(x, 345, -110, s.y + 2, 30, true, 2);
    });
    ART.blit(c, island);
    // plataformas flotantes: losas talladas con runa brillante
    const slab = ART.bake('temple-slab', -95, -30, 190, 80, x => {
      const w = 170;
      const g = x.createLinearGradient(0, 0, 0, 22); g.addColorStop(0, '#fff2d9'); g.addColorStop(0.4, '#e3c9a4'); g.addColorStop(1, '#8e7359');
      x.fillStyle = g; roundRect(x, -w / 2, 0, w, 16, 4); x.fill();
      x.fillStyle = '#7a634e'; x.beginPath(); x.moveTo(-w / 2 + 8, 16); x.lineTo(w / 2 - 8, 16); x.lineTo(w / 2 - 34, 34); x.lineTo(-w / 2 + 34, 34); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(-w / 2 + 3, 0.5, w - 6, 1.5);
      x.strokeStyle = 'rgba(255,214,140,.9)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-w / 2 + 6, 9); x.lineTo(w / 2 - 6, 9); x.stroke();
      SC.grass(x, -w / 2, -w / 2 + 40, 1, 77, ['#79a84c', '#9cc65f'], 6);
    });
    for (const p of this.plats) {
      const cx = p.x + p.w / 2;
      c.save(); c.translate(cx, p.y); ART.blit(c, slab); c.restore();
      const pulse = 0.55 + Math.sin(this.t * 0.08 + p.bx) * 0.25;
      ART.drawGlow(c, cx, p.y + 30, 34, '#2ec4b6', pulse);
      c.fillStyle = '#bafff5'; c.beginPath(); c.arc(cx, p.y + 26, 3.5, 0, TAU); c.fill();
    }
  },
  drawFG(c) {
    // pétalos que el viento arrastra
    const ps = SC.motes(this, 26, (i) => ({ x: rand(-900, 900), y: rand(-700, 200), vx: rand(0.3, 1.2), vy: rand(0.4, 1), r: rand(2.5, 4.5), a: rand(0, TAU), sp: rand(0.02, 0.06) }));
    const wind = this.wind > 0 ? this.windDir * 6 : 0;
    for (const p of ps) {
      p.x += p.vx + wind; p.y += p.vy; p.a += p.sp;
      if (p.y > 300 || p.x > 1100 || p.x < -1100) { p.y = rand(-800, -500); p.x = rand(-1000, 900); }
      c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.scale(1, 0.55 + Math.sin(p.a * 2) * 0.35);
      c.fillStyle = 'rgba(255,214,222,.9)'; c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, TAU); c.fill();
      c.restore();
    }
  },
};

// ================================================================
//  VOLCÁN FURIOSO — noche de ceniza iluminada desde abajo por la lava
// ================================================================
SCENERY.volcano = {
  light: { dir: [0.25, 0.97], rim: '#ff8a3d', rimA: 0.85, shade: 'rgba(25,5,20,.5)', amb: 'rgba(255,90,30,.07)' },
  grade: { bloom: 0.26, bloomPow: 3, top: 'rgba(20,10,50,.45)', bottom: 'rgba(255,90,20,.25)', vig: 0.72 },
  drawBG(c, cam) {
    const t = this.t, erupt = this.lavaPhase !== 'idle';
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#040306'); g.addColorStop(0.45, '#140709'); g.addColorStop(0.78, '#43110b'); g.addColorStop(1, '#8e3110');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // humo alto, iluminado por debajo
    const smoke = ART.layer('volc-smoke', 2400, 720, (x, w) => {
      const r = srand(51);
      for (let i = 0; i < 22; i++) { const cw = 380 + r() * 380, ch = 140 + r() * 90, cx = r() * w, cy = 60 + r() * 260; x.globalAlpha = 0.55 + r() * 0.35; x.drawImage(ART.cloud(300 + i, Math.round(cw), Math.round(ch), '#120a0d', '#5a2216'), cx - cw / 2, cy - ch / 2, cw, ch); }
      x.globalAlpha = 1;
    });
    ART.drawLayer(c, smoke, cam, 0.03, 0);
    // volcán lejano con ríos de lava
    const volc = ART.layer('volc-cone', 2000, 720, (x, w) => {
      const cx = w * 0.5;
      const vg = x.createLinearGradient(0, 230, 0, 720); vg.addColorStop(0, '#2a1216'); vg.addColorStop(1, '#140709');
      x.fillStyle = vg; x.beginPath(); x.moveTo(cx - 760, 720);
      for (let k = 0; k <= 40; k++) { const tt = k / 40, xx = lerp(cx - 760, cx - 90, tt); x.lineTo(xx, lerp(720, 250, Math.pow(tt, 1.6)) + (fbm1(tt * 8, 3) - 0.5) * 30); }
      x.lineTo(cx - 70, 244); x.quadraticCurveTo(cx, 262, cx + 70, 244);
      for (let k = 0; k <= 40; k++) { const tt = k / 40, xx = lerp(cx + 90, cx + 760, tt); x.lineTo(xx, lerp(250, 720, Math.pow(tt, 0.62)) + (fbm1(tt * 8, 9) - 0.5) * 30); }
      x.closePath(); x.fill();
      // ríos de lava (se dibujan con halo)
      const r = srand(9);
      x.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const side = i % 2 ? 1 : -1;
        let px = cx + side * (20 + r() * 50), py = 262; const pts = [[px, py]];
        for (let k = 0; k < 14; k++) { px += side * (8 + k * 2.2) + (r() - 0.5) * 12; py += 24 + r() * 8; pts.push([px, py]); }
        for (const [lw, col] of [[10, 'rgba(255,90,20,.12)'], [4, 'rgba(255,110,30,.42)'], [1.6, 'rgba(255,210,120,.8)']]) {
          x.strokeStyle = col; x.lineWidth = lw * (1 - i * 0.08); x.beginPath(); pts.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke();
        }
      }
      const hz = x.createLinearGradient(0, 420, 0, 720); hz.addColorStop(0, 'rgba(120,30,15,0)'); hz.addColorStop(1, 'rgba(150,45,15,.75)');
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = hz; x.fillRect(0, 0, w, 720);
    });
    const px = -cam.x * 0.03, py = -cam.y * 0.02;
    ART.drawLayer(c, volc, cam, 0.06, 10, { repeat: false });
    // cráter: resplandor y fumarola
    const crX = W / 2 - cam.x * 0.03 * (1 + (cam.z - 0.8) * 0.036) + px * 0, crY = 262 + 10 - cam.y * 0.06 * 0.35;
    const pulse = 0.4 + Math.sin(t * 0.05) * 0.12 + (erupt ? 0.4 : 0);
    ART.drawGlow(c, crX, crY, 220, '#ff5a1a', pulse);
    ART.drawGlow(c, crX, crY + 6, 70, '#ffd27a', pulse);
    for (let i = 0; i < 8; i++) {
      const k = ((t * (erupt ? 0.9 : 0.45) + i * 45) % 360) / 360, r = 40 + k * 190;
      c.globalAlpha = (1 - k) * 0.65;
      c.drawImage(ART.cloud(700 + i, 200, 140, '#2a1414', '#8a3a1c'), crX - r + Math.sin(i * 2 + t * 0.01) * 40 * k, crY - 40 - k * 330 - r * 0.5, r * 2, r * 1.3);
    }
    c.globalAlpha = 1;
    void py;
    // agujas de basalto a media distancia, con borde naranja abajo
    const spires = ART.layer('volc-spires', 2600, 720, (x, w) => {
      const r = srand(77);
      for (let i = 0; i < 14; i++) {
        const bx = r() * w, bw = 60 + r() * 90, top = 280 + r() * 200;
        const sg = x.createLinearGradient(0, top, 0, 720); sg.addColorStop(0, '#1d0e10'); sg.addColorStop(0.75, '#2c1210'); sg.addColorStop(1, '#8a2c10');
        x.fillStyle = sg; x.beginPath(); x.moveTo(bx - bw, 720); x.lineTo(bx - bw * 0.35, top + 40); x.lineTo(bx - bw * 0.1, top); x.lineTo(bx + bw * 0.2, top + 30); x.lineTo(bx + bw, 720); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(255,110,40,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx + bw * 0.2, top + 30); x.lineTo(bx + bw, 720); x.stroke();
      }
    });
    ART.drawLayer(c, spires, cam, 0.16, 80, { yk: 1.4 });
    // brasas que suben y ceniza que cae
    const em = SC.motes(this, 60, i => ({ x: rand(0, W), y: rand(0, H), v: rand(0.4, 1.6), s: rand(1, 2.6), ash: i % 3 === 0 }));
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const e of em) {
      if (e.ash) continue;
      e.y -= e.v * (erupt ? 2.2 : 1); e.x += Math.sin((t + e.y) * 0.02) * 0.4;
      if (e.y < -10) { e.y = H + 10; e.x = rand(0, W); }
      c.fillStyle = `rgba(255,${150 + (e.s * 30 | 0)},60,${0.5 + Math.sin(t * 0.2 + e.x) * 0.3})`;
      c.fillRect(e.x, e.y, e.s, e.s);
    }
    c.restore();
    c.fillStyle = 'rgba(160,140,140,.35)';
    for (const e of em) { if (!e.ash) continue; e.y += e.v * 0.5; e.x -= 0.3; if (e.y > H) { e.y = -5; e.x = rand(0, W + 200); } c.fillRect(e.x, e.y, 1.6, 1.6); }
  },
  drawStage(c) {
    const s = this.solids[0], t = this.t;
    const hexTex = (x, y) => {
      // columnas de basalto vistas desde arriba: celdas hexagonales
      const q = 26, row = Math.floor(y / (q * 0.866)), off = row % 2 ? q / 2 : 0, cx = Math.floor((x + off) / q), cy = row;
      const lx = (x + off) - cx * q - q / 2, ly = y - (cy + 0.5) * q * 0.866;
      const edge = Math.max(Math.abs(lx) / (q / 2), Math.abs(ly) / (q * 0.433));
      const n = fbm2(x / 26, y / 26, 4, 3, 10);
      const b = 38 + n * 30 + hash2(((cx % 10) + 10) % 10, cy, 7) * 16;
      return edge > 0.86 ? [18, 10, 10] : [b + 8, b * 0.78, b * 0.72];
    };
    const body = ART.bake('volc-body', s.x - 30, s.y - 10, s.w + 60, 300, x => {
      // masa rocosa inferior con estalactitas
      const r = srand(4);
      x.beginPath(); x.moveTo(s.x, s.y + 50);
      for (let k = 0; k <= 30; k++) { const tt = k / 30, xx = lerp(s.x, s.x + s.w, tt), dd = Math.sin(tt * Math.PI); x.lineTo(xx + (r() - 0.5) * 10, s.y + 60 + dd * 170 * (0.6 + r() * 0.5) + (k % 3 === 0 ? 30 * dd : 0)); }
      x.lineTo(s.x + s.w, s.y + 50); x.closePath();
      x.save(); x.clip();
      x.fillStyle = ART.pattern(x, 'volc-rock2', 256, SC.rockTex('vr', '#3d2a26', '#140b0b', '#6b3a2a', 0.08)); x.fillRect(s.x - 30, s.y, s.w + 60, 300);
      const lg = x.createLinearGradient(0, s.y + 50, 0, s.y + 290); lg.addColorStop(0, 'rgba(0,0,0,.35)'); lg.addColorStop(0.7, 'rgba(90,20,5,.2)'); lg.addColorStop(1, 'rgba(255,90,20,.55)');
      x.fillStyle = lg; x.fillRect(s.x - 30, s.y, s.w + 60, 300);
      x.restore();
      // cara: prismas de basalto verticales
      const r2 = srand(9);
      for (let xx = s.x; xx < s.x + s.w; ) {
        const cw = 22 + r2() * 20, h = 58 + r2() * 10, v = r2();
        const g = x.createLinearGradient(xx, 0, xx + cw, 0);
        g.addColorStop(0, `rgb(${58 + v * 20},${36 + v * 12},${32 + v * 10})`); g.addColorStop(0.5, `rgb(${40 + v * 14},${25 + v * 8},${22 + v * 6})`); g.addColorStop(1, '#170d0c');
        x.fillStyle = g; x.fillRect(xx, s.y + 8, Math.min(cw, s.x + s.w - xx), h);
        xx += cw;
      }
      SC.aoLine(x, s.x, s.y + 12, s.w, 18, 0.5);
      // superficie: tapas hexagonales
      x.fillStyle = ART.pattern(x, 'volc-hex2', 260, hexTex); x.fillRect(s.x, s.y, s.w, 12);
      const tg = x.createLinearGradient(0, s.y, 0, s.y + 12); tg.addColorStop(0, 'rgba(255,170,120,.18)'); tg.addColorStop(1, 'rgba(0,0,0,.3)');
      x.fillStyle = tg; x.fillRect(s.x, s.y, s.w, 12);
    });
    ART.blit(c, body);
    // grietas de magma: capa emisiva que late
    const cracks = ART.bake('volc-cracks', s.x - 30, s.y - 10, s.w + 60, 300, x => {
      const r = srand(15);
      x.lineCap = 'round'; x.lineJoin = 'round';
      for (let i = 0; i < 7; i++) {
        let px = s.x + 30 + r() * (s.w - 60), py = s.y + 10 + r() * 14; const pts = [[px, py]];
        for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 26; py += 6 + r() * 16; pts.push([px, py]); }
        for (const [lw, col] of [[5, 'rgba(255,80,10,.18)'], [1.8, 'rgba(255,120,30,.8)'], [0.7, '#ffd98a']]) { x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); pts.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); }
      }
      // gotas de lava en las estalactitas
      for (let i = 0; i < 7; i++) { const dx = s.x + s.w * (0.2 + 0.6 * r()), dy = s.y + 150 + r() * 90; x.fillStyle = 'rgba(255,120,30,.9)'; x.beginPath(); x.ellipse(dx, dy, 3, 5, 0, 0, TAU); x.fill(); }
    });
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.4 + Math.sin(t * 0.06) * 0.18 + (this.lavaPhase !== 'idle' ? 0.25 : 0);
    ART.blit(c, cracks); c.restore();
    // plataformas: trozos de basalto flotando con vetas
    const chunk = ART.bake('volc-chunk', -90, -10, 180, 90, x => {
      const w = 160;
      const r = srand(3);
      x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.lineTo(w / 2 - 10, 14);
      for (let k = 0; k <= 8; k++) x.lineTo(lerp(w / 2 - 14, -w / 2 + 14, k / 8), 20 + Math.sin(k / 8 * Math.PI) * (30 + r() * 20));
      x.lineTo(-w / 2 + 10, 14); x.closePath();
      x.fillStyle = ART.pattern(x, 'volc-rock2', 256, SC.rockTex('vr', '#3d2a26', '#140b0b', '#6b3a2a', 0.08)); x.fill();
      const g = x.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, 'rgba(0,0,0,.1)'); g.addColorStop(1, 'rgba(255,90,20,.5)'); x.fillStyle = g; x.fill();
      x.fillStyle = ART.pattern(x, 'volc-hex2', 260, hexTex); x.fillRect(-w / 2, 0, w, 6);
      x.strokeStyle = 'rgba(255,140,40,.9)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-40, 16); x.lineTo(-20, 30); x.lineTo(-26, 46); x.moveTo(30, 14); x.lineTo(40, 34); x.stroke();
    });
    for (const p of this.plats) { c.save(); c.translate(p.x + p.w / 2, p.y); ART.blit(c, chunk); c.restore(); ART.drawGlow(c, p.x + p.w / 2, p.y + 50, 60, '#ff5a1a', 0.35); }
  },
  drawFG(c) {
    const y = this.lavaY, t = this.t;
    // resplandor sobre la superficie
    ART.drawGlow(c, 0, y, 1300, '#ff5a1a', 0.35 + (this.lavaPhase !== 'idle' ? 0.25 : 0));
    const g = c.createLinearGradient(0, y - 6, 0, y + 420);
    g.addColorStop(0, '#fff0b0'); g.addColorStop(0.03, '#ffb238'); g.addColorStop(0.12, '#ff6a00'); g.addColorStop(0.45, '#b52a00'); g.addColorStop(1, '#4a0c00');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-2200, y + 1400);
    for (let x = -2200; x <= 2200; x += 30) c.lineTo(x, y + Math.sin(x * 0.018 + t * 0.07) * 6 + Math.sin(x * 0.047 - t * 0.05) * 3);
    c.lineTo(2200, y + 1400); c.closePath(); c.fill();
    // costra que flota
    c.save(); c.clip();
    c.fillStyle = ART.pattern(c, 'lava-crust', 256, (x, yy) => { const n = fbm2(x / 32, yy / 32, 21, 4, 8); return n > 0.56 ? [40, 12, 6, Math.min(255, (n - 0.56) * 1400)] : [0, 0, 0, 0]; });
    c.translate((t * 0.6) % 256, 0);
    c.globalAlpha = 0.75; c.fillRect(-2456, y + 8, 4912, 1400);
    c.restore();
    // burbujas
    const bs = SC.motes(this, 1, () => ({})); void bs;
    for (let i = 0; i < 6; i++) {
      const k = ((t * 0.7 + i * 53) % 120) / 120, bx = ((i * 431) % 1800) - 900;
      if (k < 0.8) continue;
      c.strokeStyle = `rgba(255,220,140,${(1 - k) * 4})`; c.lineWidth = 2; c.beginPath(); c.arc(bx, y + 2, 4 + (k - 0.8) * 60, Math.PI, 0); c.stroke();
    }
    if (this.lavaPhase === 'warn') { c.fillStyle = `rgba(255,80,0,${0.15 + Math.sin(t * 0.4) * 0.1})`; c.fillRect(-2000, -40, 4000, 40); }
  },
};

// ================================================================
//  BARCO PIRATA — atardecer en altamar
// ================================================================
SCENERY.ship = {
  light: { dir: [-0.86, -0.5], rim: '#ffc27a', rimA: 0.75, shade: 'rgba(30,20,60,.4)', amb: 'rgba(255,150,90,.05)' },
  grade: { bloom: 0.3, bloomPow: 2, top: 'rgba(30,40,110,.35)', bottom: 'rgba(40,110,130,.3)', vig: 0.6 },
  drawBG(c, cam) {
    const t = this.t, hy = H * 0.64 - cam.y * 0.02;
    const g = c.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, '#141d3c'); g.addColorStop(0.35, '#3d3565'); g.addColorStop(0.62, '#b8546a'); g.addColorStop(0.84, '#f08a5d'); g.addColorStop(1, '#ffc27a');
    c.fillStyle = g; c.fillRect(0, 0, W, hy + 2);
    const sx = W * 0.27 - cam.x * 0.01;
    ART.drawGlow(c, sx, hy, 520, '#ff9a5a', 0.6);
    ART.drawGlow(c, sx, hy, 150, '#fff0c8', 0.9);
    c.fillStyle = '#fff4d8'; c.beginPath(); c.arc(sx, hy + 4, 46, Math.PI, 0); c.fill();
    // nubes rasgadas iluminadas por debajo
    const streaks = ART.layer('ship-streaks', 2400, 720, (x, w) => {
      const r = srand(61);
      for (let i = 0; i < 18; i++) {
        const cw = 420 + r() * 520, ch = 34 + r() * 30, cx = r() * w, cy = 80 + r() * 300;
        x.globalAlpha = 0.5 + r() * 0.4;
        x.drawImage(ART.cloud(400 + i, Math.round(cw), Math.round(ch), cy < 220 ? '#4c3f6c' : '#8a4f6c', cy < 220 ? '#d0707a' : '#ffb27a'), cx - cw / 2, cy - ch / 2, cw, ch);
      }
      x.globalAlpha = 1;
    });
    ART.drawLayer(c, streaks, cam, 0.03, 0);
    // islas en el horizonte
    const isl = ART.layer('ship-isles', 2400, 720, (x, w) => {
      x.fillStyle = '#51405e'; ART.ridge(x, w, 462, 60, 13, 300, 4); x.fill();
      x.fillStyle = 'rgba(255,170,120,.35)'; x.fillRect(0, 455, w, 8);
    });
    ART.drawLayer(c, isl, cam, 0.04, hy - 462, { yk: 0.4 });
    // barco enemigo que dispara
    const ex = W * 0.8 - cam.x * 0.05 + Math.sin(t * 0.01) * 20, ey = hy - 4 + Math.sin(t * 0.03) * 3;
    c.save(); c.translate(ex, ey); c.scale(0.8, 0.8);
    c.fillStyle = '#2a1c24'; c.beginPath(); c.moveTo(-110, -18); c.lineTo(110, -24); c.lineTo(84, 10); c.lineTo(-90, 10); c.closePath(); c.fill();
    c.fillStyle = '#1b1218'; for (let i = -70; i <= 60; i += 26) c.fillRect(i, -12, 8, 5);
    for (const [mx, mh] of [[-50, 120], [10, 150], [66, 100]]) {
      c.fillStyle = '#231820'; c.fillRect(mx - 2, -18 - mh, 4, mh);
      c.fillStyle = 'rgba(214,180,170,.8)'; c.beginPath(); c.moveTo(mx - 30, -18 - mh * 0.9); c.quadraticCurveTo(mx + 4, -18 - mh * 0.55, mx - 30, -30); c.lineTo(mx + 30, -30); c.quadraticCurveTo(mx + 40, -18 - mh * 0.55, mx + 30, -18 - mh * 0.9); c.closePath(); c.fill();
    }
    c.fillStyle = '#e63946'; c.beginPath(); c.moveTo(10, -170); c.lineTo(40 + Math.sin(t * 0.1) * 5, -162); c.lineTo(10, -154); c.fill();
    if (this.nextCannon > 480 && this.nextCannon < 560) { ART.drawGlow(c, -110, -6, 70, '#ffd27a', 1); c.fillStyle = 'rgba(200,190,200,.5)'; c.beginPath(); c.arc(-130, -12, 18 + (560 - this.nextCannon) * 0.3, 0, TAU); c.fill(); }
    c.restore();
    // mar: franja base + reflejo del sol + oleaje
    const sg = c.createLinearGradient(0, hy, 0, H);
    sg.addColorStop(0, '#d98a6a'); sg.addColorStop(0.06, '#5b5a7a'); sg.addColorStop(0.4, '#1f4a5e'); sg.addColorStop(1, '#0c2a38');
    c.fillStyle = sg; c.fillRect(0, hy, W, H - hy);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const k = i / 70, yy = hy + 4 + Math.pow(k, 1.6) * (H - hy), spread = 20 + k * 160;
      const xx = sx + Math.sin(i * 12.9898 + t * 0.03) * spread, wl = 10 + k * 40;
      c.fillStyle = `rgba(255,210,150,${(1 - k) * 0.55 * (0.5 + 0.5 * Math.sin(t * 0.1 + i * 3))})`;
      c.fillRect(xx - wl / 2, yy, wl, 1.5 + k * 2);
    }
    c.restore();
    for (let L = 0; L < 3; L++) {
      const yy = hy + 24 + L * 34, amp = 3 + L * 2, sp = 0.02 + L * 0.01;
      c.fillStyle = ['rgba(40,80,100,.5)', 'rgba(30,70,90,.6)', 'rgba(22,58,78,.7)'][L];
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) c.lineTo(x, yy + Math.sin(x * (0.012 + L * 0.004) + t * sp + L) * amp);
      c.lineTo(W, H); c.closePath(); c.fill();
      c.strokeStyle = `rgba(255,200,150,${0.18 - L * 0.04})`; c.lineWidth = 1.2; c.beginPath();
      for (let x = 0; x <= W; x += 16) { const y2 = yy + Math.sin(x * (0.012 + L * 0.004) + t * sp + L) * amp; x ? c.lineTo(x, y2) : c.moveTo(x, y2); }
      c.stroke();
    }
  },
  drawStage(c) {
    const s = this.solids[0], t = this.t, dy = s.y - s.by;
    const wood = (key, base, dark) => (x, y) => {
      const B = parseColor(base), D = parseColor(dark);
      const g = Math.sin(y * TAU / 8 + fbm2(x / 64, y / 8, 3, 3, [4, 32]) * 9) * 0.5 + 0.5;
      const n = fbm2(x / 16, y / 16, 5, 3, 16);
      const seam = (y % 16 < 1.2) ? 0.7 : 0;
      return mixRGB(mixRGB(B, D, g * 0.45 + n * 0.25), [20, 10, 6], seam);
    };
    const hull = ART.bake('ship-hull', s.bx - 90, s.by - 20, s.w + 200, 240, x => {
      // casco curvo con tablones y franja dorada
      x.beginPath(); x.moveTo(s.bx - 60, s.by + 4); x.lineTo(s.bx + s.w + 80, s.by + 4);
      x.quadraticCurveTo(s.bx + s.w + 40, s.by + 120, s.bx + s.w - 50, s.by + 200); x.lineTo(s.bx + 70, s.by + 200);
      x.quadraticCurveTo(s.bx - 20, s.by + 120, s.bx - 60, s.by + 4); x.closePath();
      x.save(); x.clip();
      x.fillStyle = ART.pattern(x, 'ship-hullwood', 256, wood('h', '#6b3b22', '#2a140a')); x.fillRect(s.bx - 90, s.by, s.w + 200, 220);
      const sh = x.createLinearGradient(0, s.by, 0, s.by + 200); sh.addColorStop(0, 'rgba(255,170,110,.15)'); sh.addColorStop(0.5, 'rgba(0,0,0,.1)'); sh.addColorStop(1, 'rgba(10,10,30,.6)');
      x.fillStyle = sh; x.fillRect(s.bx - 90, s.by, s.w + 200, 220);
      const rim = x.createLinearGradient(s.bx - 60, 0, s.bx + 140, 0); rim.addColorStop(0, 'rgba(255,190,120,.5)'); rim.addColorStop(1, 'rgba(255,190,120,0)');
      x.fillStyle = rim; x.fillRect(s.bx - 90, s.by, 240, 220);
      for (const yy of [52, 58]) { x.fillStyle = yy === 52 ? '#c9953d' : '#6e4d1c'; x.fillRect(s.bx - 90, s.by + yy, s.w + 200, 5); }
      // troneras con cañones
      for (let px = s.bx + 70; px < s.bx + s.w - 30; px += 130) {
        x.fillStyle = '#1a0e08'; roundRect(x, px - 18, s.by + 80, 36, 28, 4); x.fill();
        x.fillStyle = '#3a2416'; x.fillRect(px - 20, s.by + 78, 40, 4);
        const cg = x.createLinearGradient(0, s.by + 88, 0, s.by + 100); cg.addColorStop(0, '#6d6f78'); cg.addColorStop(1, '#1d1e24');
        x.fillStyle = cg; roundRect(x, px - 8, s.by + 88, 16, 14, 5); x.fill();
      }
      // ojos de buey encendidos
      for (let px = s.bx + 135; px < s.bx + s.w - 60; px += 130) { x.fillStyle = '#c9953d'; x.beginPath(); x.arc(px, s.by + 150, 9, 0, TAU); x.fill(); x.fillStyle = '#ffd98a'; x.beginPath(); x.arc(px, s.by + 150, 6, 0, TAU); x.fill(); }
      x.restore();
      x.fillStyle = '#e8c27a'; x.font = `700 22px ${FONT_DISPLAY}`; x.textAlign = 'center'; x.fillText('LA GOLPAZA', s.bx + s.w * 0.5, s.by + 185);
      // cubierta
      x.fillStyle = ART.pattern(x, 'ship-deck', 256, (xx, yy) => { const col = wood('d', '#b07a4a', '#5e3a22')(yy * 3, xx / 3); const seam = xx % 64 < 1.3 ? 0.6 : 0; return mixRGB(col, [30, 16, 8], seam); });
      x.fillRect(s.bx, s.by, s.w, 12);
      const dg = x.createLinearGradient(0, s.by, 0, s.by + 12); dg.addColorStop(0, 'rgba(255,220,170,.35)'); dg.addColorStop(1, 'rgba(0,0,0,.25)');
      x.fillStyle = dg; x.fillRect(s.bx, s.by, s.w, 12);
      x.fillStyle = '#4a2a16'; x.fillRect(s.bx - 60, s.by + 12, s.w + 140, 6);
      SC.aoLine(x, s.bx - 60, s.by + 18, s.w + 140, 14, 0.5);
      // barandal del fondo
      x.fillStyle = '#5a3520'; x.fillRect(s.bx + 20, s.by - 34, s.w - 40, 5);
      for (let px = s.bx + 24; px < s.bx + s.w - 20; px += 22) { const bg = x.createLinearGradient(px, 0, px + 7, 0); bg.addColorStop(0, '#8a5a36'); bg.addColorStop(1, '#3d2414'); x.fillStyle = bg; roundRect(x, px, s.by - 30, 7, 30, 3); x.fill(); }
      // barriles y cuerdas
      for (const bx of [s.bx + 40, s.bx + s.w - 90]) {
        const bg = x.createLinearGradient(bx, 0, bx + 34, 0); bg.addColorStop(0, '#5a3520'); bg.addColorStop(0.45, '#a8733f'); bg.addColorStop(1, '#3d2414');
        x.fillStyle = bg; roundRect(x, bx, s.by - 44, 34, 44, 8); x.fill();
        x.fillStyle = '#2b2b30'; x.fillRect(bx, s.by - 36, 34, 3); x.fillRect(bx, s.by - 12, 34, 3);
      }
    });
    c.save(); c.translate(0, dy); ART.blit(c, hull); c.restore();
    // mástil, cofa y vela (la vela se infla con el viento)
    const m = this.plats[0], mx = m.x + m.w / 2;
    const mg = c.createLinearGradient(mx - 9, 0, mx + 9, 0); mg.addColorStop(0, '#3d2414'); mg.addColorStop(0.4, '#8a5a36'); mg.addColorStop(1, '#2a180c');
    c.fillStyle = mg; c.fillRect(mx - 9, m.y - 70, 18, s.y - m.y + 70);
    c.fillStyle = '#2b2b30'; for (let yy = m.y + 40; yy < s.y; yy += 70) c.fillRect(mx - 10, yy, 20, 4);
    c.strokeStyle = 'rgba(40,24,14,.75)'; c.lineWidth = 1.5;
    for (const [ax, ay] of [[s.x - 30, s.y - 2], [s.x + s.w + 40, s.y - 2], [s.x + 60, s.y - 2], [s.x + s.w - 40, s.y - 2]]) { c.beginPath(); c.moveTo(mx, m.y - 60); c.lineTo(ax, ay); c.stroke(); }
    const bil = Math.sin(t * 0.03) * 14;
    const vg = c.createLinearGradient(mx, 0, mx + 180, 0); vg.addColorStop(0, '#cdbca0'); vg.addColorStop(0.5, '#f7ecd6'); vg.addColorStop(1, '#d7c4a4');
    c.fillStyle = vg; c.beginPath(); c.moveTo(mx + 10, m.y + 36); c.quadraticCurveTo(mx + 190 + bil, m.y + 130, mx + 10, m.y + 236); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,96,70,.35)'; c.lineWidth = 1; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(mx + 10, m.y + 36 + k * 40); c.quadraticCurveTo(mx + 100 + bil * 0.6, m.y + 36 + k * 40 + (k - 2.5) * 6, mx + 10 + (150 + bil) * Math.sin(k / 5 * Math.PI) * 0.9, m.y + 36 + k * 40); c.stroke(); }
    c.fillStyle = 'rgba(180,40,50,.85)'; c.beginPath(); c.arc(mx + 70 + bil * 0.4, m.y + 136, 24, 0, TAU); c.fill();
    c.fillStyle = '#f7ecd6'; c.font = `700 30px ${FONT_DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('G', mx + 70 + bil * 0.4, m.y + 138);
    c.fillStyle = '#e63946'; c.beginPath(); c.moveTo(mx, m.y - 96); c.quadraticCurveTo(mx + 30, m.y - 90 + Math.sin(t * 0.12) * 6, mx + 58 + Math.sin(t * 0.1) * 6, m.y - 84); c.lineTo(mx, m.y - 70); c.fill();
    c.fillStyle = '#3d2414'; c.fillRect(mx - 3, m.y - 100, 6, 32);
    // plataformas de madera
    const plank = (w) => ART.bake('ship-plank' + w, -w / 2 - 4, -4, w + 8, 30, x => {
      const pg = x.createLinearGradient(0, 0, 0, 14); pg.addColorStop(0, '#c68a52'); pg.addColorStop(1, '#6b3e22');
      x.fillStyle = pg; roundRect(x, -w / 2, 0, w, 14, 3); x.fill();
      x.strokeStyle = 'rgba(40,20,10,.5)'; x.lineWidth = 1; for (let k = -w / 2 + 30; k < w / 2; k += 30) { x.beginPath(); x.moveTo(k, 1); x.lineTo(k, 13); x.stroke(); }
      x.fillStyle = 'rgba(255,220,170,.4)'; x.fillRect(-w / 2 + 2, 0.5, w - 4, 1.5);
      x.fillStyle = '#2b2b30'; for (const k of [-w / 2 + 8, w / 2 - 12]) x.fillRect(k, 4, 4, 4);
    });
    for (const p of this.plats) {
      if (p === m) {
        // cofa redonda
        const cg = c.createLinearGradient(p.x, 0, p.x + p.w, 0); cg.addColorStop(0, '#3d2414'); cg.addColorStop(0.5, '#9a6a40'); cg.addColorStop(1, '#3d2414');
        c.fillStyle = cg; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.w, p.y); c.lineTo(p.x + p.w - 16, p.y + 34); c.lineTo(p.x + 16, p.y + 34); c.closePath(); c.fill();
        c.fillStyle = '#2b2b30'; c.fillRect(p.x + 4, p.y + 10, p.w - 8, 3);
      }
      c.save(); c.translate(p.x + p.w / 2, p.y); ART.blit(c, plank(p.w)); c.restore();
    }
    const p1 = this.plats[1], p2 = this.plats[2];
    const post = (x, y0, y1) => { const pg = c.createLinearGradient(x, 0, x + 14, 0); pg.addColorStop(0, '#3d2414'); pg.addColorStop(0.5, '#8a5a36'); pg.addColorStop(1, '#2a180c'); c.fillStyle = pg; c.fillRect(x, y0, 14, y1 - y0); };
    post(p1.x + 10, p1.y + 14, s.y); post(p1.x + p1.w - 24, p1.y + 14, s.y); post(p2.x + 20, p2.y + 14, s.y);
    // ola gigante
    if (this.wave > 0) {
      const wx = this.waveX, d = this.waveDir;
      const wg = c.createLinearGradient(0, -340, 0, 60); wg.addColorStop(0, '#bff3ff'); wg.addColorStop(0.3, '#48cae4'); wg.addColorStop(1, '#0f5e7a');
      c.fillStyle = wg; c.beginPath(); c.moveTo(wx - 180 * d, 70); c.quadraticCurveTo(wx - 40 * d, -330, wx + 110 * d, -150); c.quadraticCurveTo(wx + 50 * d, 0, wx + 180 * d, 70); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)';
      for (let k = 0; k < 9; k++) { c.beginPath(); c.arc(wx + (60 + k * 8) * d, -200 + Math.sin(t * 0.3 + k) * 12 + k * 6, 10 + (k % 3) * 5, 0, TAU); c.fill(); }
    }
  },
  drawFG(c) {
    const t = this.t;
    const g = c.createLinearGradient(0, 150, 0, 520); g.addColorStop(0, 'rgba(34,90,112,.9)'); g.addColorStop(1, 'rgba(8,30,44,.98)');
    c.fillStyle = g; c.beginPath(); c.moveTo(-2200, 1100);
    for (let x = -2200; x <= 2200; x += 30) c.lineTo(x, 172 + Math.sin(x * 0.012 + t * 0.05) * 12 + Math.sin(x * 0.031 - t * 0.04) * 4);
    c.lineTo(2200, 1100); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(230,250,255,.75)'; c.lineWidth = 3; c.beginPath();
    for (let x = -2200; x <= 2200; x += 30) { const y = 172 + Math.sin(x * 0.012 + t * 0.05) * 12 + Math.sin(x * 0.031 - t * 0.04) * 4; x > -2200 ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    c.fillStyle = 'rgba(230,250,255,.5)';
    for (let i = 0; i < 40; i++) { const x = ((i * 157 + t * 1.3) % 4000) - 2000, y = 176 + Math.sin(x * 0.012 + t * 0.05) * 12; c.fillRect(x, y + 6 + (i % 4) * 9, 18 + (i % 3) * 10, 2); }
  },
};

// Instala el arte nuevo en cada escenario sin tocar su lógica
function installScenery() {
  for (const id of Object.keys(SCENERY)) {
    const base = STAGE_DEFS[id];
    if (!base || base._art) continue;
    const wrapped = opts => {
      const st = base(opts), S = SCENERY[id];
      for (const k of ['drawBG', 'drawStage', 'drawFG']) if (S[k]) st[k] = S[k];
      st.light = S.light; st.grade = S.grade;
      return st;
    };
    wrapped._art = true;
    STAGE_DEFS[id] = wrapped;
  }
}
installScenery();
