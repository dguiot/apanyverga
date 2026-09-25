'use strict';
// ============================================================
//  ESCENARIOS PINTADOS (2): Estación Orbital, Azoteas de Neón y Estadio
// ============================================================
SC.metalTex = (base, streak = 0.18) => {
  const B = parseColor(base);
  return (x, y) => {
    const n = vnoise2(x / 128, y / 1.6, 41, [2, 160]) * 0.6 + vnoise2(x / 16, y / 0.8, 43, [16, 320]) * 0.4;
    const sp = fbm2(x / 64, y / 64, 44, 3, 4);
    const k = (n - 0.5) * streak + (sp - 0.5) * 0.12;
    return k > 0 ? mixRGB(B, [255, 255, 255], k) : mixRGB(B, [0, 0, 0], -k);
  };
};
SC.hazard = (c, x, y, w, h, t = 0) => {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = '#f2b705'; c.fillRect(x, y, w, h);
  c.fillStyle = '#16181d';
  for (let k = -h + (t % 24); k < w + h; k += 24) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); c.lineTo(x + k + h + 12, y); c.lineTo(x + k + 12, y + h); c.closePath(); c.fill(); }
  c.restore();
};
SC.bolts = (c, x0, x1, y, step, r = 2) => {
  for (let x = x0; x <= x1; x += step) {
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, '#f1f5f9'); g.addColorStop(1, '#4b5563');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
};
// texto de neón horneado con resplandor (shadowBlur solo se paga una vez)
SC.neonText = (key, txt, size, col, font) => ART.memo('neon:' + key, () => {
  const R = ART.pxRes() * 0.8, pad = size * 0.8;
  const cx = mkCanvas(10, 10).getContext('2d'); cx.font = `700 ${size}px ${font || FONT_DISPLAY}`;
  const tw = cx.measureText(txt).width;
  const cv = mkCanvas((tw + pad * 2) * R, (size + pad * 2) * R), c = cv.getContext('2d');
  c.scale(R, R); c.font = `700 ${size}px ${font || FONT_DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const cxm = tw / 2 + pad, cym = size / 2 + pad;
  c.shadowColor = col; c.shadowBlur = size * 0.6; c.fillStyle = col; c.fillText(txt, cxm, cym); c.fillText(txt, cxm, cym);
  c.shadowBlur = size * 0.15; c.fillStyle = mixStr(col, '#ffffff', 0.7); c.fillText(txt, cxm, cym);
  return { img: cv, w: tw + pad * 2, h: size + pad * 2 };
});
SC.drawNeon = (c, n, x, y, a = 1) => { const pa = c.globalAlpha; c.globalAlpha = pa * a; c.drawImage(n.img, x - n.w / 2, y - n.h / 2, n.w, n.h); c.globalAlpha = pa; };

// ================================================================
//  ESTACIÓN ORBITAL — espacio profundo, un planeta y una estrella cercana
// ================================================================
SCENERY.space = {
  light: { dir: [-0.7, -0.71], rim: '#cdeeff', rimA: 0.75, shade: 'rgba(8,10,40,.5)', amb: 'rgba(70,140,220,.05)' },
  grade: { bloom: 0.36, bloomPow: 2, top: 'rgba(40,20,90,.35)', bottom: 'rgba(20,120,160,.25)', vig: 0.7 },
  drawBG(c, cam) {
    const t = this.t;
    c.fillStyle = '#02040b'; c.fillRect(0, 0, W, H);
    // nebulosa: ruido fractal teñido, a baja resolución para que salga suave
    const neb = ART.layer('space-neb', 1600, 900, (x, w, h) => {
      const cw = 320, ch = 180, cv = mkCanvas(cw, ch), cx = cv.getContext('2d'), im = cx.createImageData(cw, ch), d = im.data;
      for (let y = 0; y < ch; y++) for (let xx = 0; xx < cw; xx++) {
        const n1 = fbm2(xx / 60, y / 60, 71, 5), n2 = fbm2(xx / 34 + 9, y / 34, 72, 4), band = Math.exp(-Math.pow((y / ch - 0.35 - (xx / cw) * 0.25) * 3.2, 2));
        const a = clamp((n1 - 0.38) * 2.2, 0, 1) * band;
        const col = mixRGB([30, 150, 170], [150, 50, 130], clamp((n2 - 0.35) * 2, 0, 1));
        const o = (y * cw + xx) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = a * 170;
      }
      cx.putImageData(im, 0, 0);
      x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, w, h);
    }, 0.6);
    ART.drawLayer(c, neb, cam, 0.015, -90);
    for (const [k, n, par] of [[0, 380, 0.01], [1, 160, 0.03]]) {
      const L = ART.layer('space-stars' + k, 1800, 900, (x, w, h) => {
        const r = srand(90 + k);
        for (let i = 0; i < n; i++) {
          const sx = r() * w, sy = r() * h, m = r(), sz = k ? 1 + m * 1.6 : 0.6 + m;
          x.fillStyle = `rgba(${220 + m * 35},${225 + m * 30},255,${0.35 + m * 0.65})`; x.fillRect(sx, sy, sz, sz);
          if (k && m > 0.9) { x.fillStyle = 'rgba(200,230,255,.5)'; x.fillRect(sx - 5, sy + sz / 2 - 0.4, 10 + sz, 0.8); x.fillRect(sx + sz / 2 - 0.4, sy - 5, 0.8, 10 + sz); }
        }
      }, 1);
      ART.drawLayer(c, L, cam, par, -90);
    }
    // estrella cercana con destello anamórfico
    const sx = W * 0.14 - cam.x * 0.01, sy = H * 0.14 - cam.y * 0.01;
    ART.drawGlow(c, sx, sy, 420, '#7fc8ff', 0.35);
    ART.drawGlow(c, sx, sy, 110, '#ffffff', 1);
    c.save(); c.globalCompositeOperation = 'lighter';
    const fl = c.createLinearGradient(sx - 520, 0, sx + 520, 0); fl.addColorStop(0, 'rgba(120,200,255,0)'); fl.addColorStop(0.5, 'rgba(190,230,255,.55)'); fl.addColorStop(1, 'rgba(120,200,255,0)');
    c.fillStyle = fl; c.fillRect(sx - 520, sy - 1.5, 1040, 3);
    c.restore();
    // planeta con atmósfera, nubes y luces de ciudades en el lado nocturno
    const planet = ART.memo('space-planet', () => {
      const S = 600, cv = mkCanvas(S, S), x = cv.getContext('2d'), im = x.createImageData(S, S), d = im.data;
      const L = [-0.62, -0.55, 0.56], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const nx = (px + 0.5) / S * 2 - 1, ny = (py + 0.5) / S * 2 - 1, r2 = nx * nx + ny * ny, o = (py * S + px) * 4;
        if (r2 > 1) { const ex = Math.sqrt(r2); if (ex < 1.06) { const a = Math.pow(1 - (ex - 1) / 0.06, 2); const lit = clamp(-(nx * L[0] + ny * L[1]) / ex + 0.3, 0, 1); d[o] = 110; d[o + 1] = 190; d[o + 2] = 255; d[o + 3] = a * 200 * lit; } continue; }
        const nz = Math.sqrt(1 - r2), edgeA = clamp((1 - Math.sqrt(r2)) * S * 0.5, 0, 1);
        const u = Math.atan2(nx, nz) * 1.7 + 3, v = Math.asin(ny) * 1.7 + 3;
        const land = fbm2(u * 1.6, v * 1.6, 81, 5), cl = fbm2(u * 2.4 + 5, v * 3.2, 82, 5);
        const dif = clamp(nx * L[0] + ny * L[1] + nz * L[2], 0, 1), lit = smooth01(clamp(dif * 1.6, 0, 1));
        let col = land > 0.53 ? mixRGB([60, 120, 60], [170, 150, 100], clamp((land - 0.53) * 5, 0, 1)) : mixRGB([10, 40, 90], [30, 100, 160], clamp(land * 1.6, 0, 1));
        if (Math.abs(ny) > 0.86) col = mixRGB(col, [235, 245, 255], clamp((Math.abs(ny) - 0.86) * 9, 0, 1));
        col = mixRGB(col, [245, 248, 255], clamp((cl - 0.55) * 3.2, 0, 0.9));
        let out = mixRGB([4, 8, 20], col, lit);
        if (land > 0.55 && cl < 0.55 && lit < 0.15 && hash2(px, py, 5) > 0.93) out = mixRGB(out, [255, 200, 110], 0.8 * (1 - lit / 0.15));
        const rim = Math.pow(1 - nz, 3) * clamp(dif + 0.25, 0, 1);
        out = mixRGB(out, [120, 200, 255], clamp(rim * 1.3, 0, 0.9));
        d[o] = out[0]; d[o + 1] = out[1]; d[o + 2] = out[2]; d[o + 3] = 255 * edgeA;
      }
      x.putImageData(im, 0, 0);
      return cv;
    });
    const pz = 1 + (cam.z - 0.8) * 0.04, pr = 470 * pz;
    const ppx = W * 0.2 - cam.x * 0.04, ppy = H * 1.02 - cam.y * 0.03;
    c.drawImage(planet, ppx - pr, ppy - pr, pr * 2, pr * 2);
    // anillo de una estación lejana, girando
    const rx = W * 0.78 - cam.x * 0.08, ry = 150 - cam.y * 0.06;
    c.save(); c.translate(rx, ry); c.scale(1, 0.34); c.rotate(t * 0.003);
    c.strokeStyle = 'rgba(160,180,210,.55)'; c.lineWidth = 12; c.beginPath(); c.arc(0, 0, 130, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(80,100,130,.6)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 128, Math.sin(a) * 128); c.stroke(); }
    c.restore();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 0.003; ART.drawGlow(c, rx + Math.cos(a) * 130, ry + Math.sin(a) * 130 * 0.34, 10, i % 2 ? '#ff5d5d' : '#9fe7ff', 0.5 + Math.sin(t * 0.1 + i) * 0.3); }
    c.fillStyle = '#9aa7b8'; c.beginPath(); c.arc(rx, ry, 12, 0, TAU); c.fill();
  },
  drawStage(c) {
    const s = this.solids[0], t = this.t;
    const hull = ART.bake('space-hull', s.x - 20, s.y - 12, s.w + 40, 240, x => {
      // cuerpo inferior: casco con paneles, tuberías y ventanas
      x.beginPath(); x.moveTo(s.x + 24, s.y + 46); x.lineTo(s.x + s.w - 24, s.y + 46); x.lineTo(s.x + s.w - 150, s.y + 156); x.lineTo(s.x + 150, s.y + 156); x.closePath();
      x.save(); x.clip();
      x.fillStyle = ART.pattern(x, 'space-metal-dark', 256, SC.metalTex('#3a4458', 0.14)); x.fillRect(s.x, s.y + 40, s.w, 130);
      const hg = x.createLinearGradient(0, s.y + 46, 0, s.y + 156); hg.addColorStop(0, 'rgba(255,255,255,.08)'); hg.addColorStop(1, 'rgba(0,0,20,.55)'); x.fillStyle = hg; x.fillRect(s.x, s.y + 40, s.w, 130);
      x.strokeStyle = 'rgba(10,14,24,.7)'; x.lineWidth = 1.5;
      for (let xx = s.x + 60; xx < s.x + s.w - 40; xx += 70) { x.beginPath(); x.moveTo(xx, s.y + 46); x.lineTo(xx + (xx < 0 ? 30 : -30), s.y + 156); x.stroke(); }
      x.beginPath(); x.moveTo(s.x, s.y + 100); x.lineTo(s.x + s.w, s.y + 100); x.stroke();
      for (let xx = -200; xx <= 200; xx += 50) { x.fillStyle = '#0c1422'; roundRect(x, xx - 12, s.y + 64, 24, 14, 5); x.fill(); x.fillStyle = hash1(xx, 3) > 0.35 ? 'rgba(160,230,255,.85)' : 'rgba(40,70,100,.8)'; roundRect(x, xx - 10, s.y + 66, 20, 10, 4); x.fill(); }
      x.restore();
      // tubería lateral
      x.strokeStyle = '#6b7a91'; x.lineWidth = 6; x.beginPath(); x.moveTo(s.x + 60, s.y + 70); x.lineTo(s.x + 150, s.y + 140); x.moveTo(s.x + s.w - 60, s.y + 70); x.lineTo(s.x + s.w - 150, s.y + 140); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1.5; x.stroke();
      // tobera principal
      const ng = x.createLinearGradient(-40, 0, 40, 0); ng.addColorStop(0, '#1c2433'); ng.addColorStop(0.45, '#8a97ab'); ng.addColorStop(1, '#1c2433');
      x.fillStyle = ng; x.beginPath(); x.moveTo(-32, s.y + 156); x.lineTo(32, s.y + 156); x.lineTo(46, s.y + 200); x.lineTo(-46, s.y + 200); x.closePath(); x.fill();
      x.fillStyle = '#0a0f18'; x.beginPath(); x.ellipse(0, s.y + 200, 46, 8, 0, 0, TAU); x.fill();
      // antena
      x.strokeStyle = '#8a97ab'; x.lineWidth = 3; x.beginPath(); x.moveTo(s.x + s.w - 190, s.y + 150); x.lineTo(s.x + s.w - 176, s.y + 196); x.stroke();
      x.fillStyle = '#c9d6e8'; x.beginPath(); x.ellipse(s.x + s.w - 172, s.y + 200, 20, 7, -0.4, 0, TAU); x.fill();
      // cara de la cubierta: paneles con remaches y ventilas
      x.fillStyle = ART.pattern(x, 'space-metal', 256, SC.metalTex('#8d9bb2', 0.2)); x.fillRect(s.x, s.y + 10, s.w, 38);
      const fg = x.createLinearGradient(0, s.y + 10, 0, s.y + 48); fg.addColorStop(0, 'rgba(255,255,255,.15)'); fg.addColorStop(1, 'rgba(0,0,20,.45)'); x.fillStyle = fg; x.fillRect(s.x, s.y + 10, s.w, 38);
      x.strokeStyle = 'rgba(15,20,32,.65)'; x.lineWidth = 1.4;
      for (let xx = s.x + 95; xx < s.x + s.w; xx += 95) { x.beginPath(); x.moveTo(xx, s.y + 12); x.lineTo(xx, s.y + 48); x.stroke(); }
      SC.bolts(x, s.x + 10, s.x + s.w - 10, s.y + 16, 23, 1.8); SC.bolts(x, s.x + 10, s.x + s.w - 10, s.y + 42, 23, 1.8);
      for (let xx = s.x + 40; xx < s.x + s.w - 40; xx += 190) { x.fillStyle = '#141a26'; roundRect(x, xx, s.y + 22, 50, 14, 3); x.fill(); x.strokeStyle = 'rgba(160,175,200,.5)'; x.lineWidth = 1; for (let k = 4; k < 50; k += 6) { x.beginPath(); x.moveTo(xx + k, s.y + 24); x.lineTo(xx + k, s.y + 34); x.stroke(); } }
      x.fillStyle = '#1a2130'; x.fillRect(s.x, s.y + 46, s.w, 4);
      // cubierta superior con franjas de peligro en las orillas
      x.fillStyle = ART.pattern(x, 'space-deck', 256, SC.metalTex('#b9c6d9', 0.22)); x.fillRect(s.x, s.y, s.w, 11);
      const tg = x.createLinearGradient(0, s.y, 0, s.y + 11); tg.addColorStop(0, 'rgba(255,255,255,.45)'); tg.addColorStop(1, 'rgba(0,0,0,.2)'); x.fillStyle = tg; x.fillRect(s.x, s.y, s.w, 11);
      SC.hazard(x, s.x, s.y + 1, 46, 8); SC.hazard(x, s.x + s.w - 46, s.y + 1, 46, 8);
      SC.aoLine(x, s.x, s.y + 11, s.w, 8, 0.45);
    });
    ART.blit(c, hull);
    // luces que corren por la cara de la cubierta
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const xx = s.x + 30 + i * ((s.w - 60) / 17), on = (Math.floor(t / 4) - i) % 18;
      const a = on >= 0 && on < 5 ? 1 - on / 5 : 0.18;
      c.fillStyle = `rgba(90,220,255,${a})`; c.fillRect(xx - 6, s.y + 6, 12, 2);
    }
    c.restore();
    // fuego azul de la tobera
    const fl = 0.8 + Math.sin(t * 0.7) * 0.1 + Math.random() * 0.1;
    c.save(); c.globalCompositeOperation = 'lighter';
    const fg = c.createLinearGradient(0, s.y + 200, 0, s.y + 200 + 120 * fl); fg.addColorStop(0, 'rgba(210,245,255,.95)'); fg.addColorStop(0.3, 'rgba(90,200,255,.6)'); fg.addColorStop(1, 'rgba(40,90,255,0)');
    c.fillStyle = fg; c.beginPath(); c.moveTo(-40, s.y + 200); c.quadraticCurveTo(0, s.y + 200 + 170 * fl, 40, s.y + 200); c.closePath(); c.fill();
    c.restore();
    ART.drawGlow(c, 0, s.y + 214, 110, '#48cae4', 0.6);
    // plataformas en órbita: placas con emisor antigravedad
    const pad = ART.bake('space-pad', -80, -6, 160, 40, x => {
      const w = 150;
      x.fillStyle = ART.pattern(x, 'space-deck', 256, SC.metalTex('#b9c6d9', 0.22)); roundRect(x, -w / 2, 0, w, 14, 5); x.fill();
      const g = x.createLinearGradient(0, 0, 0, 14); g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(0,0,20,.4)'); x.fillStyle = g; roundRect(x, -w / 2, 0, w, 14, 5); x.fill();
      x.fillStyle = '#2a3446'; x.beginPath(); x.moveTo(-40, 14); x.lineTo(40, 14); x.lineTo(24, 24); x.lineTo(-24, 24); x.closePath(); x.fill();
      SC.hazard(x, -w / 2 + 6, 2, 18, 5); SC.hazard(x, w / 2 - 24, 2, 18, 5);
    });
    for (const p of this.plats) {
      const cx = p.x + p.w / 2;
      c.save(); c.globalCompositeOperation = 'lighter';
      const cg = c.createLinearGradient(0, p.y + 22, 0, p.y + 80); cg.addColorStop(0, `rgba(90,220,255,${0.35 + Math.sin(t * 0.2 + cx) * 0.1})`); cg.addColorStop(1, 'rgba(90,220,255,0)');
      c.fillStyle = cg; c.beginPath(); c.moveTo(cx - 22, p.y + 22); c.lineTo(cx + 22, p.y + 22); c.lineTo(cx + 44, p.y + 80); c.lineTo(cx - 44, p.y + 80); c.closePath(); c.fill();
      c.restore();
      c.save(); c.translate(cx, p.y); ART.blit(c, pad); c.restore();
      ART.drawGlow(c, cx, p.y + 24, 26, '#48cae4', 0.8);
    }
    if (this.zeroG > 0) { c.fillStyle = `rgba(72,202,228,${0.06 + Math.sin(t * 0.1) * 0.04})`; c.fillRect(-1400, -1100, 2800, 1800); }
  },
  drawFG() {},
};

// ================================================================
//  AZOTEAS DE NEÓN — noche lluviosa en la ciudad
// ================================================================
SCENERY.city = {
  light: { dir: [0.45, -0.89], rim: '#9fdcff', rimA: 0.7, shade: 'rgba(20,0,40,.5)', amb: 'rgba(120,60,200,.06)' },
  grade: { bloom: 0.34, bloomPow: 2, top: 'rgba(40,20,120,.4)', bottom: 'rgba(200,40,120,.22)', vig: 0.7 },
  drawBG(c, cam) {
    const t = this.t;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#04050f'); g.addColorStop(0.45, '#12102e'); g.addColorStop(0.8, '#3a1a45'); g.addColorStop(1, '#6a2a4f');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const mx = W * 0.83 - cam.x * 0.01, my = 110 - cam.y * 0.01;
    ART.drawGlow(c, mx, my, 220, '#b9c8ff', 0.4);
    c.fillStyle = '#eef2ff'; c.beginPath(); c.arc(mx, my, 34, 0, TAU); c.fill();
    c.fillStyle = 'rgba(160,170,210,.35)'; for (const [a, b, r] of [[-8, -6, 7], [10, 8, 5], [4, -14, 4]]) { c.beginPath(); c.arc(mx + a, my + b, r, 0, TAU); c.fill(); }
    // tres capas de rascacielos con neblina entre ellas
    const layers = [['far', 0.03, 380, '#14123a', 0.18, 90], ['mid', 0.07, 430, '#1b1840', 0.3, 60], ['near', 0.12, 490, '#221c46', 0.42, 46]];
    layers.forEach(([nm, par, base, col, lit, bw], L) => {
      const lay = ART.layer('city-' + nm, 2600, 900, (x, w, h) => {
        const r = srand(200 + L);
        for (let xx = 0; xx < w;) {
          const ww = bw * (0.6 + r() * 1.2), hh = 120 + r() * (260 + L * 40) + (r() > 0.93 ? 220 : 0), y = base - hh * 0.4;
          const bg = x.createLinearGradient(xx, 0, xx + ww, 0); bg.addColorStop(0, shade(col, 0.08)); bg.addColorStop(1, shade(col, -0.25));
          x.fillStyle = bg; x.fillRect(xx, y, ww, h - y);
          if (r() > 0.6) { x.fillRect(xx + ww * 0.45, y - 40 - r() * 60, 3, 60 + r() * 50); }
          if (r() > 0.75) { x.fillStyle = shade(col, -0.1); x.fillRect(xx + ww * 0.2, y - 26, ww * 0.35, 26); }
          const wy0 = y + 10, sx = L ? 9 : 7, sy = L ? 13 : 10;
          for (let wy = wy0; wy < h; wy += sy) for (let wx = xx + 4; wx < xx + ww - 5; wx += sx) {
            const hv = hash2(wx | 0, wy | 0, L + 3);
            if (hv < lit) { x.fillStyle = hv < lit * 0.2 ? 'rgba(130,220,255,.7)' : hv < lit * 0.35 ? 'rgba(255,140,200,.6)' : `rgba(255,${200 + hv * 40 | 0},130,${0.45 + hv})`; x.fillRect(wx, wy, sx * 0.5, sy * 0.55); }
          }
          xx += ww + 4 + r() * 18;
        }
        // letreros de neón lejanos
        if (L === 2) for (let i = 0; i < 6; i++) { const nx = 200 + i * 420 + (i * 97 % 120), ny = 240 + (i % 3) * 60; x.fillStyle = ['#ff4fa3', '#39e0ff', '#ffd23f'][i % 3]; x.shadowColor = x.fillStyle; x.shadowBlur = 14; x.fillRect(nx, ny, 60 + (i % 2) * 40, 12); x.shadowBlur = 0; }
        const hz = x.createLinearGradient(0, base - 60, 0, h); hz.addColorStop(0, 'rgba(90,40,110,0)'); hz.addColorStop(1, `rgba(110,45,110,${0.6 - L * 0.15})`);
        x.globalCompositeOperation = 'source-atop'; x.fillStyle = hz; x.fillRect(0, 0, w, h);
      });
      ART.drawLayer(c, lay, cam, par, -40 + L * 20, { yk: 1.2 });
    });
    // reflectores que barren el cielo
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const bx = W * (0.3 + i * 0.4) - cam.x * 0.08, a = -Math.PI / 2 + Math.sin(t * 0.008 + i * 2) * 0.5;
      const bg = c.createLinearGradient(bx, H, bx + Math.cos(a) * 900, H + Math.sin(a) * 900); bg.addColorStop(0, 'rgba(180,200,255,.16)'); bg.addColorStop(1, 'rgba(180,200,255,0)');
      c.fillStyle = bg; c.beginPath(); c.moveTo(bx, H); c.lineTo(bx + Math.cos(a - 0.06) * 900, H + Math.sin(a - 0.06) * 900); c.lineTo(bx + Math.cos(a + 0.06) * 900, H + Math.sin(a + 0.06) * 900); c.closePath(); c.fill();
    }
    c.restore();
    // lluvia fina
    c.strokeStyle = 'rgba(170,190,230,.22)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 90; i++) { const x = (hash1(i, 1) * W + t * 3 + i * 7) % (W + 40) - 20, y = (hash1(i, 2) * H + t * 14) % H; c.moveTo(x, y); c.lineTo(x - 3, y + 14); }
    c.stroke();
  },
  drawStage(c) {
    const t = this.t, res = ART.pxRes() * 0.62;
    const facade = (s, idx) => ART.bake('city-bld' + idx, s.x - 10, s.y - 80, s.w + 20, s.h + 80, x => {
      const r = srand(300 + idx), tint = parseColor(s.tint);
      x.fillStyle = ART.pattern(x, 'city-concrete', 256, (xx, yy) => { const n = fbm2(xx / 32, yy / 32, 31, 4, 8), sp = hash2(xx, yy, 3) > 0.97 ? 0.1 : 0; const v = 0.75 + n * 0.5 - sp; return [80 * v, 84 * v, 104 * v]; });
      x.fillRect(s.x, s.y, s.w, s.h);
      x.fillStyle = withAlpha(s.tint, 0.7); x.fillRect(s.x, s.y, s.w, s.h);
      const sg = x.createLinearGradient(s.x, 0, s.x + s.w, 0); sg.addColorStop(0, 'rgba(255,255,255,.06)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.35)');
      x.fillStyle = sg; x.fillRect(s.x, s.y, s.w, s.h);
      // pisos y ventanas con interiores
      for (let wy = s.y + 40; wy < s.y + s.h - 20; wy += 46) {
        x.fillStyle = 'rgba(10,10,20,.45)'; x.fillRect(s.x, wy + 32, s.w, 3);
        x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(s.x, wy + 35, s.w, 1.5);
        for (let wx = s.x + 24; wx < s.x + s.w - 30; wx += 52) {
          const floorLit = hash1(Math.round(wy), idx + 7), on = hash01(wx * 0.37 + wy * 0.11) > (floorLit > 0.7 ? 0.25 : floorLit < 0.25 ? 0.8 : 0.55), hv = r();
          x.fillStyle = '#0a0b14'; x.fillRect(wx - 2, wy - 2, 34, 30);
          if (on) {
            const ig = x.createLinearGradient(0, wy, 0, wy + 26);
            const warm = hv > 0.25; ig.addColorStop(0, warm ? '#ffcf7a' : '#8fe3ff'); ig.addColorStop(1, warm ? '#b86a2c' : '#2b6f9a');
            x.fillStyle = ig; x.fillRect(wx, wy, 30, 26);
            if (hv > 0.6) { x.fillStyle = 'rgba(40,20,20,.55)'; for (let k = 0; k < 26; k += 4) x.fillRect(wx, wy + k, 30, 1.6); }
            else if (hv > 0.4) { x.fillStyle = 'rgba(30,15,20,.7)'; x.beginPath(); x.arc(wx + 10 + hv * 10, wy + 14, 4, 0, TAU); x.fill(); x.fillRect(wx + 5 + hv * 10, wy + 18, 10, 8); }
          } else {
            const rg = x.createLinearGradient(wx, wy, wx + 30, wy + 26); rg.addColorStop(0, '#2a3358'); rg.addColorStop(0.5, '#141a33'); rg.addColorStop(1, '#0d1024');
            x.fillStyle = rg; x.fillRect(wx, wy, 30, 26);
            x.fillStyle = 'rgba(180,120,220,.12)'; x.beginPath(); x.moveTo(wx, wy + 26); x.lineTo(wx + 12, wy); x.lineTo(wx + 18, wy); x.lineTo(wx + 6, wy + 26); x.fill();
          }
          x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(wx + 14, wy, 2, 26);
        }
      }
      // pretil con remate, equipo en la azotea
      const pg = x.createLinearGradient(0, s.y, 0, s.y + 14); pg.addColorStop(0, '#6b7690'); pg.addColorStop(1, '#2c3346');
      x.fillStyle = pg; x.fillRect(s.x - 6, s.y, s.w + 12, 14);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(s.x - 6, s.y, s.w + 12, 1.5);
      SC.aoLine(x, s.x, s.y + 14, s.w, 16, 0.5);
      const ac = (ax, aw, ah) => { const ag = x.createLinearGradient(ax, 0, ax + aw, 0); ag.addColorStop(0, '#5d6882'); ag.addColorStop(1, '#2d3448'); x.fillStyle = ag; x.fillRect(ax, s.y - ah, aw, ah); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; for (let k = 4; k < aw; k += 5) { x.beginPath(); x.moveTo(ax + k, s.y - ah + 4); x.lineTo(ax + k, s.y - 4); x.stroke(); } x.fillStyle = '#1f2433'; x.beginPath(); x.arc(ax + aw * 0.7, s.y - ah * 0.5, ah * 0.32, 0, TAU); x.fill(); };
      ac(s.x + 40, 60, 26);
      if (idx !== 0) {
        // tinaco sobre patas
        const tx = s.x + s.w * (idx === 1 ? 0.62 : 0.3);
        x.strokeStyle = '#2a2f3d'; x.lineWidth = 4; x.beginPath(); x.moveTo(tx - 22, s.y); x.lineTo(tx - 18, s.y - 36); x.moveTo(tx + 22, s.y); x.lineTo(tx + 18, s.y - 36); x.stroke();
        const tg = x.createLinearGradient(tx - 26, 0, tx + 26, 0); tg.addColorStop(0, '#3b3f4e'); tg.addColorStop(0.4, '#7c8196'); tg.addColorStop(1, '#2a2d38');
        x.fillStyle = tg; roundRect(x, tx - 26, s.y - 84, 52, 50, 6); x.fill();
        x.fillStyle = '#2a2d38'; x.beginPath(); x.moveTo(tx - 28, s.y - 84); x.lineTo(tx, s.y - 100); x.lineTo(tx + 28, s.y - 84); x.closePath(); x.fill();
      }
      x.fillStyle = '#4a556d'; x.fillRect(s.x + s.w - 90, s.y - 60, 5, 60);
      // letrero vertical de neón en el costado
      if (idx) {
        const word = idx === 1 ? 'HOTEL' : 'RAMEN', col = idx === 1 ? '#ff4fa3' : '#39e0ff', nx = idx === 1 ? s.x + s.w - 36 : s.x + 36;
        x.fillStyle = '#0c0a18'; roundRect(x, nx - 22, s.y + 40, 44, word.length * 44 + 20, 8); x.fill();
        x.font = `700 38px ${FONT_DISPLAY}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.shadowColor = col; x.shadowBlur = 16; x.fillStyle = col;
        [...word].forEach((ch, i) => { x.fillText(ch, nx, s.y + 70 + i * 44); x.fillText(ch, nx, s.y + 70 + i * 44); });
        x.shadowBlur = 0;
      }
    }, res);
    const bl = this.solids.slice(0, 3);
    bl.forEach((s, i) => { ART.blit(c, facade(s, i)); });
    // neón en la orilla de cada azotea (parpadea a veces)
    c.save(); c.globalCompositeOperation = 'lighter';
    bl.forEach((s, i) => {
      const fl = Math.floor(t / 7 + i * 13) % 37 === 0 ? 0.2 : 0.85 + Math.sin(t * 0.08 + s.x) * 0.15;
      const col = ['#ff4f6d', '#39e0ff', '#ffd23f'][i];
      c.fillStyle = withAlpha(col, fl); c.fillRect(s.x, s.y + 14, s.w, 3);
      c.fillStyle = withAlpha(col, 0.18 * fl); c.fillRect(s.x, s.y + 6, s.w, 18);
    });
    c.restore();
    for (const s of bl) { const on = Math.floor(t / 30) % 2; ART.drawGlow(c, s.x + s.w - 87, s.y - 62, 16, '#ff3344', on ? 0.9 : 0.15); }
    // calle: asfalto mojado, banqueta y postes de luz
    const st = this.solids[3];
    const street = ART.bake('city-street', st.x, st.y - 10, st.w, st.h + 10, x => {
      x.fillStyle = ART.pattern(x, 'city-asphalt', 128, (xx, yy) => { const v = 0.8 + hash2(xx, yy, 9) * 0.3 + fbm2(xx / 16, yy / 16, 8, 3, 8) * 0.25; return [26 * v, 28 * v, 36 * v]; });
      x.fillRect(st.x, st.y, st.w, st.h);
      const bg = x.createLinearGradient(0, st.y, 0, st.y + 12); bg.addColorStop(0, '#8a8fa3'); bg.addColorStop(1, '#3a3e4c');
      x.fillStyle = bg; x.fillRect(st.x, st.y, st.w, 12);
      x.fillStyle = 'rgba(255,209,102,.7)'; for (let xx = st.x; xx < st.x + st.w; xx += 120) x.fillRect(xx, st.y + 48, 60, 5);
      x.fillStyle = 'rgba(220,220,230,.4)'; x.fillRect(st.x, st.y + 90, st.w, 3);
    }, res);
    ART.blit(c, street);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let xx = st.x + 200; xx < st.x + st.w; xx += 400) {
      // reflejos de neón en el piso mojado
      const col = ['#ff4fa3', '#39e0ff', '#ffd23f'][Math.abs(xx / 400 | 0) % 3];
      const rg = c.createLinearGradient(0, st.y + 12, 0, st.y + 120); rg.addColorStop(0, withAlpha(col, 0.28)); rg.addColorStop(1, withAlpha(col, 0));
      c.fillStyle = rg; c.fillRect(xx - 30, st.y + 12, 60 + Math.sin(t * 0.05 + xx) * 6, 110);
    }
    c.restore();
    for (let xx = st.x + 100; xx < st.x + st.w; xx += 400) {
      c.fillStyle = '#2a2f3d'; c.fillRect(xx - 3, st.y - 150, 6, 150); c.fillRect(xx - 3, st.y - 150, 34, 5);
      ART.drawGlow(c, xx + 28, st.y - 144, 70, '#ffd99a', 0.55);
      c.save(); c.globalCompositeOperation = 'lighter';
      const lg = c.createLinearGradient(0, st.y - 140, 0, st.y); lg.addColorStop(0, 'rgba(255,220,160,.22)'); lg.addColorStop(1, 'rgba(255,220,160,0)');
      c.fillStyle = lg; c.beginPath(); c.moveTo(xx + 24, st.y - 140); c.lineTo(xx + 32, st.y - 140); c.lineTo(xx + 80, st.y); c.lineTo(xx - 24, st.y); c.closePath(); c.fill();
      c.restore();
    }
    // plataformas
    for (const p of this.plats) {
      if (p.lift) {
        c.strokeStyle = 'rgba(160,170,190,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x + 10, -140); c.lineTo(p.x + 10, p.y); c.moveTo(p.x + p.w - 10, -140); c.lineTo(p.x + p.w - 10, p.y); c.stroke();
        c.fillStyle = '#39445e'; c.fillRect(p.x - 4, -150, p.w + 8, 10);
        const lg = c.createLinearGradient(0, p.y, 0, p.y + 16); lg.addColorStop(0, '#9aa5bd'); lg.addColorStop(1, '#3a4358');
        c.fillStyle = lg; c.fillRect(p.x, p.y, p.w, 14);
        SC.hazard(c, p.x, p.y + 10, p.w, 5, t * 0.5);
        c.strokeStyle = 'rgba(60,70,90,.8)'; c.lineWidth = 2; c.strokeRect(p.x + 2, p.y - 46, p.w - 4, 46);
        c.beginPath(); for (let k = p.x + 14; k < p.x + p.w; k += 16) { c.moveTo(k, p.y - 46); c.lineTo(k, p.y); } c.stroke();
      } else if (p.heli) {
        const cx = p.x + p.w / 2, cy = p.y - 70;
        // haz del reflector
        c.save(); c.globalCompositeOperation = 'lighter';
        const hg = c.createLinearGradient(0, cy + 30, 0, 700); hg.addColorStop(0, 'rgba(255,245,210,.22)'); hg.addColorStop(1, 'rgba(255,245,210,0)');
        c.fillStyle = hg; c.beginPath(); c.moveTo(cx + 30, cy + 30); c.lineTo(cx - 120, 700); c.lineTo(cx + 180, 700); c.closePath(); c.fill();
        c.restore();
        const bg = c.createLinearGradient(0, cy - 44, 0, cy + 44); bg.addColorStop(0, '#5c6886'); bg.addColorStop(0.5, '#2c3550'); bg.addColorStop(1, '#161b2b');
        c.fillStyle = bg; c.beginPath(); c.ellipse(cx, cy, 92, 42, 0, 0, TAU); c.fill();
        c.fillStyle = '#1b2236'; c.beginPath(); c.moveTo(cx - 70, cy - 12); c.lineTo(cx - 200, cy - 16); c.lineTo(cx - 200, cy - 2); c.lineTo(cx - 70, cy + 14); c.closePath(); c.fill();
        c.fillStyle = '#e63946'; c.fillRect(cx - 60, cy + 4, 130, 6);
        const gl = c.createLinearGradient(cx + 20, cy - 30, cx + 80, cy + 10); gl.addColorStop(0, 'rgba(150,230,255,.9)'); gl.addColorStop(1, 'rgba(40,90,140,.9)');
        c.fillStyle = gl; c.beginPath(); c.ellipse(cx + 44, cy - 6, 36, 26, 0.1, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(cx + 36, cy - 16, 14, 5, -0.4, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(220,230,245,.55)'; c.lineWidth = 5; const ra = t * 0.9; c.beginPath(); c.moveTo(cx + Math.cos(ra) * 160, cy - 50); c.lineTo(cx - Math.cos(ra) * 160, cy - 50); c.stroke();
        c.fillStyle = 'rgba(220,230,245,.12)'; c.beginPath(); c.ellipse(cx, cy - 50, 160, 8, 0, 0, TAU); c.fill();
        c.fillStyle = '#2a3348'; c.fillRect(cx - 4, cy - 54, 8, 14);
        c.save(); c.translate(cx - 196, cy - 10); c.rotate(t * 1.3); c.fillStyle = 'rgba(220,230,245,.6)'; c.fillRect(-22, -2, 44, 4); c.restore();
        c.strokeStyle = '#9aa7b8'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx - 60, cy + 38); c.lineTo(cx - 60, p.y); c.moveTo(cx + 60, cy + 38); c.lineTo(cx + 60, p.y); c.stroke();
        const sk = c.createLinearGradient(0, p.y, 0, p.y + 10); sk.addColorStop(0, '#d7dfeb'); sk.addColorStop(1, '#6b7690');
        c.fillStyle = sk; roundRect(c, p.x, p.y, p.w, 10, 5); c.fill();
        ART.drawGlow(c, cx - 196, cy - 10, 14, Math.floor(t / 20) % 2 ? '#ff3344' : '#44ff88', 0.9);
      } else {
        const col = p.sign === 'GOLPAZO' ? '#ff4fa3' : '#39e0ff';
        c.fillStyle = '#10131a'; c.fillRect(p.x + 20, p.y + 14, 8, 100); c.fillRect(p.x + p.w - 28, p.y + 14, 8, 100);
        roundRect(c, p.x - 6, p.y - 70, p.w + 12, 70, 10); c.fillStyle = '#0d0a1a'; c.fill();
        c.strokeStyle = withAlpha(col, 0.9); c.lineWidth = 2.5; c.stroke();
        const on = Math.floor(t / 20 + p.x) % 11 !== 0;
        SC.drawNeon(c, SC.neonText(p.sign, p.sign, 30, col), p.x + p.w / 2, p.y - 34, on ? 1 : 0.15);
        const mg = c.createLinearGradient(0, p.y, 0, p.y + 12); mg.addColorStop(0, '#9aa5bd'); mg.addColorStop(1, '#3a4358');
        c.fillStyle = mg; c.fillRect(p.x, p.y, p.w, 12);
        ART.drawGlow(c, p.x + p.w / 2, p.y - 34, 110, col, on ? 0.35 : 0.05);
      }
    }
    // metro
    if (this.train) {
      const x0 = this.trainDir > 0 ? this.trainX - 1100 : this.trainX;
      for (let k = 0; k < 3; k++) {
        const x = x0 + k * 370;
        const tg = c.createLinearGradient(0, 480, 0, 630); tg.addColorStop(0, '#eef3fa'); tg.addColorStop(0.5, '#a9b6c9'); tg.addColorStop(1, '#5a6478');
        roundRect(c, x, 480, 350, 150, 22); c.fillStyle = tg; c.fill();
        c.fillStyle = '#e63946'; c.fillRect(x, 566, 350, 14); c.fillStyle = '#ff9aa4'; c.fillRect(x, 566, 350, 2);
        for (let w = x + 22; w < x + 330; w += 64) {
          const wg = c.createLinearGradient(0, 498, 0, 540); wg.addColorStop(0, '#fff2c8'); wg.addColorStop(1, '#c9a060');
          c.fillStyle = wg; roundRect(c, w, 498, 46, 42, 6); c.fill();
          c.fillStyle = 'rgba(40,30,40,.6)'; c.beginPath(); c.arc(w + 16 + (k * 7 + w) % 14, 522, 6, 0, TAU); c.fill(); c.fillRect(w + 10 + (k * 7 + w) % 14, 528, 13, 12);
        }
        c.fillStyle = '#1a1d26'; for (const wx of [x + 50, x + 300]) { c.beginPath(); c.arc(wx, 630, 16, 0, TAU); c.fill(); }
      }
      const hx = this.trainDir > 0 ? this.trainX : x0;
      ART.drawGlow(c, hx, 600, 90, '#fff2c8', 0.9);
      c.save(); c.globalCompositeOperation = 'lighter';
      const bg = c.createLinearGradient(hx, 0, hx + this.trainDir * 700, 0); bg.addColorStop(0, 'rgba(255,245,210,.35)'); bg.addColorStop(1, 'rgba(255,245,210,0)');
      c.fillStyle = bg; c.beginPath(); c.moveTo(hx, 590); c.lineTo(hx + this.trainDir * 700, 520); c.lineTo(hx + this.trainDir * 700, 660); c.closePath(); c.fill();
      c.restore();
      for (let i = 0; i < 3; i++) ART.drawGlow(c, x0 + rand(0, 1100), 640, 10, '#ffd27a', Math.random());
    } else if (this.trainWarn > 0 && Math.floor(this.t / 8) % 2) {
      c.fillStyle = 'rgba(72,202,228,.2)'; c.fillRect(-1550, 480, 3100, 160);
    }
  },
  drawFG() {},
};

// ================================================================
//  ESTADIO GOLPAZO — noche de final, estadio lleno
// ================================================================
SCENERY.stadium = {
  light: { dir: [0.1, -0.99], rim: '#fffbe6', rimA: 0.7, shade: 'rgba(10,20,50,.42)', amb: 'rgba(120,170,255,.04)' },
  grade: { bloom: 0.3, bloomPow: 2, top: 'rgba(30,50,120,.35)', bottom: 'rgba(20,120,60,.18)', vig: 0.62 },
  drawBG(c, cam) {
    const t = this.t;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#040a1a'); g.addColorStop(0.5, '#0e1d3d'); g.addColorStop(1, '#1d3160');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // tribuna alta: arco del estadio con público (miles de cabezas horneadas)
    const crowd = (key, w, h, rows, rh, hr, seed, top) => ART.layer(key, w, h, (x) => {
      const r = srand(seed);
      const shirt = ['#e63946', '#3a86ff', '#ffbe0b', '#f4f6fa', '#2dc653', '#ff7a3d', '#1d2a4a'];
      for (let row = 0; row < rows; row++) {
        const y = top + row * rh;
        x.fillStyle = row % 2 ? '#141d38' : '#18234a'; x.fillRect(0, y, w, rh);
        x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(0, y, w, 1);
        for (let px = r() * hr; px < w; px += hr * (1.5 + r() * 0.6)) {
          const col = shirt[Math.floor(r() * shirt.length)], jy = y + rh * 0.55 + (r() - 0.5) * 2;
          x.fillStyle = mixStr(shade(col, -0.3 - row * 0.02), '#18234a', 0.45); x.fillRect(px - hr * 0.6, jy, hr * 1.2, rh * 0.5);
          x.fillStyle = mixStr(['#8a5a44', '#c68e6e', '#e0b394', '#5a3a2a'][Math.floor(r() * 4)], '#18234a', 0.35); x.beginPath(); x.arc(px, jy - hr * 0.3, hr * 0.42, 0, TAU); x.fill();
        }
      }
      const sh = x.createLinearGradient(0, top, 0, top + rows * rh); sh.addColorStop(0, 'rgba(4,8,20,.55)'); sh.addColorStop(1, 'rgba(4,8,20,0)');
      x.fillStyle = sh; x.fillRect(0, top, w, rows * rh);
    });
    // techo y anillo de luces
    const roof = ART.layer('stad-roof', 2400, 720, (x, w) => {
      x.fillStyle = '#0a1122'; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, 150); x.quadraticCurveTo(w / 2, 190, 0, 150); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(120,140,180,.25)'; x.lineWidth = 2;
      for (let k = 0; k < w; k += 60) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 30, 150 + Math.sin(k / w * Math.PI) * 38); x.stroke(); }
      x.fillStyle = 'rgba(200,220,255,.8)'; for (let k = 20; k < w; k += 40) { x.fillRect(k, 150 + Math.sin(k / w * Math.PI) * 36, 12, 3); }
    });
    ART.drawLayer(c, crowd('stad-crowd-hi', 2400, 720, 9, 22, 5, 11, 180), cam, 0.03, -10);
    ART.drawLayer(c, roof, cam, 0.03, -40);
    // "la ola" y flashes de cámaras sobre la tribuna alta
    c.save(); c.globalCompositeOperation = 'lighter';
    const wx = ((this.wave * 4) % (W + 600)) - 300;
    const wg = c.createLinearGradient(wx - 120, 0, wx + 120, 0); wg.addColorStop(0, 'rgba(255,255,255,0)'); wg.addColorStop(0.5, 'rgba(255,240,200,.16)'); wg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = wg; c.fillRect(wx - 120, 160 - cam.y * 0.01, 240, 220);
    for (let i = 0; i < 5; i++) { const k = (t * 7 + i * 131) % 97; if (k < 3) ART.drawGlow(c, hash1(t + i, 4) * W, 190 + hash1(t + i, 5) * 180, 14, '#ffffff', 1); }
    c.restore();
    // torres de luz con destello
    const px = -cam.x * 0.05, py = -cam.y * 0.04;
    for (const lx of [110, W - 110]) {
      c.fillStyle = '#0c1428'; c.fillRect(lx + px - 5, 70 + py, 10, 330);
      c.fillStyle = '#1c2640'; roundRect(c, lx + px - 60, 34 + py, 120, 46, 6); c.fill();
      for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) { c.fillStyle = '#fffbe6'; c.beginPath(); c.arc(lx + px - 44 + k * 22, 48 + py + r * 18, 7, 0, TAU); c.fill(); }
      ART.drawGlow(c, lx + px, 58 + py, 260, '#fff6d8', 0.55);
      c.save(); c.globalCompositeOperation = 'lighter';
      const cg = c.createLinearGradient(lx + px, 60, W / 2, H); cg.addColorStop(0, 'rgba(255,250,225,.16)'); cg.addColorStop(1, 'rgba(255,250,225,0)');
      c.fillStyle = cg; c.beginPath(); c.moveTo(lx + px, 60 + py); c.lineTo(W / 2 - 260, H); c.lineTo(W / 2 + 260, H); c.closePath(); c.fill();
      c.restore();
    }
    // pantalla gigante
    const sx = W / 2 + px, sy = 60 + py;
    c.fillStyle = '#05070d'; roundRect(c, sx - 160, sy, 320, 128, 10); c.fill();
    c.strokeStyle = '#2b3b5c'; c.lineWidth = 4; c.stroke();
    const sg = c.createLinearGradient(0, sy + 8, 0, sy + 120); sg.addColorStop(0, '#0b2a4a'); sg.addColorStop(1, '#061426');
    c.fillStyle = sg; c.fillRect(sx - 150, sy + 8, 300, 112);
    const B = BATTLE;
    if (B && B.ms && B.ms.goals) text(`${B.ms.goals[0]}  -  ${B.ms.goals[1]}`, sx, sy + 66, 64, '#ffc53d', { weight: 700 });
    else text('A PAN Y VERGA', sx, sy + 66, 44, '#ffc53d', { weight: 700 });
    ART.drawGlow(c, sx, sy + 64, 200, '#3a86ff', 0.25);
  },
  drawStage(c) {
    const s = this.solids[0], t = this.t, res = ART.pxRes() * 0.7;
    const field = ART.bake('stad-field' + (this.soccer ? 's' : ''), s.x - 10, s.y - 10, s.w + 20, s.h + 20, x => {
      x.fillStyle = ART.pattern(x, 'stad-grass', 256, (xx, yy) => { const n = hash2(xx, yy, 2) * 0.3 + fbm2(xx / 16, yy / 16, 6, 3, 16) * 0.3; const stripe = Math.floor(xx / 128) % 2 ? 0.1 : 0; return mixRGB([30, 110, 52], [70, 160, 80], n + stripe); });
      x.fillRect(s.x, s.y, s.w, 18);
      const tg = x.createLinearGradient(0, s.y, 0, s.y + 18); tg.addColorStop(0, 'rgba(255,255,230,.25)'); tg.addColorStop(1, 'rgba(0,0,0,.3)');
      x.fillStyle = tg; x.fillRect(s.x, s.y, s.w, 18);
      x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(s.x, s.y, s.w, 2.5); x.fillRect(-3, s.y, 6, 18);
      x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 3; x.beginPath(); x.ellipse(0, s.y + 9, 170, 7, 0, 0, TAU); x.stroke();
      SC.grass(x, s.x, s.x + s.w, s.y + 1, 88, ['#3a9a55', '#57b86a', '#2a7c42'], 4, 0.8);
      // tableros LED al frente
      x.fillStyle = '#070a12'; x.fillRect(s.x, s.y + 18, s.w, s.h - 18);
      x.fillStyle = '#1a2233'; x.fillRect(s.x, s.y + 18, s.w, 3);
      for (let k = s.x; k < s.x + s.w; k += 350) { x.fillStyle = '#10151f'; x.fillRect(k, s.y + 18, 2, s.h - 18); }
    }, res);
    // tribuna cercana bajo la cancha: siluetas de espaldas, con borde de luz de los reflectores
    const near = ART.bake('stad-near', s.x - 700, s.y + s.h, s.w + 1400, 640, x => {
      const r = srand(19), y0 = s.y + s.h;
      const bg = x.createLinearGradient(0, y0, 0, y0 + 640); bg.addColorStop(0, '#0b1224'); bg.addColorStop(1, '#03060d');
      x.fillStyle = bg; x.fillRect(s.x - 700, y0, s.w + 1400, 640);
      for (let row = 0; row < 7; row++) {
        const yy = y0 + 40 + row * 70, hr = 15 + row * 1.5;
        for (let px = s.x - 700 + r() * 30; px < s.x + s.w + 700; px += hr * (1.9 + r() * 0.8)) {
          const hy = yy + (r() - 0.5) * 8;
          x.fillStyle = '#060a16'; x.beginPath(); x.ellipse(px, hy + hr * 1.9, hr * 1.25, hr * 1.3, 0, 0, TAU); x.fill();
          x.beginPath(); x.arc(px, hy, hr * 0.8, 0, TAU); x.fill();
          x.strokeStyle = `rgba(170,200,255,${0.35 - row * 0.04})`; x.lineWidth = 2; x.beginPath(); x.arc(px, hy, hr * 0.8, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
          if (r() > 0.9) { x.fillStyle = ['#e63946', '#ffbe0b', '#3a86ff', '#f4f6fa'][Math.floor(r() * 4)]; x.fillRect(px - 2, hy - hr * 2.6, 3, hr * 2); x.fillRect(px, hy - hr * 2.6, hr * 1.6, hr); }
        }
      }
      const fg = x.createLinearGradient(0, y0, 0, y0 + 60); fg.addColorStop(0, 'rgba(0,0,0,.7)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = fg; x.fillRect(s.x - 700, y0, s.w + 1400, 60);
    }, ART.pxRes() * 0.45);
    ART.blit(c, near);
    ART.blit(c, field);
    // anuncios LED encendidos (con barrido de brillo)
    const ads = ['GOLPAZO', 'TACOS', 'CHISPA ROBOTICS', 'TORITO GYM', 'MICHI NINJA', 'SALSA CHILAZO'];
    const cols = ['#ffc53d', '#e63946', '#48cae4', '#ff9f1c', '#f4f6fa', '#2dc653'];
    ads.forEach((ad, i) => { const n = SC.neonText('ad' + i, ad, 26, cols[i]); SC.drawNeon(c, n, s.x + 175 + i * 350, s.y + 52, 0.85 + Math.sin(t * 0.05 + i) * 0.15); });
    c.save(); c.globalCompositeOperation = 'lighter';
    const sw = ((t * 12) % (s.w + 600)) + s.x - 300;
    const lg = c.createLinearGradient(sw - 100, 0, sw + 100, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.14)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = lg; c.fillRect(sw - 100, s.y + 22, 200, s.h - 24);
    c.restore();
    // pasarelas de armadura de acero
    const truss = w => ART.bake('stad-truss' + w, -w / 2 - 4, -4, w + 8, 40, x => {
      const mg = x.createLinearGradient(0, 0, 0, 14); mg.addColorStop(0, '#e2e8f2'); mg.addColorStop(1, '#6b7690');
      x.fillStyle = mg; roundRect(x, -w / 2, 0, w, 12, 4); x.fill();
      x.strokeStyle = '#8994aa'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-w / 2 + 6, 26); x.lineTo(w / 2 - 6, 26);
      for (let k = -w / 2 + 6; k < w / 2 - 20; k += 22) { x.moveTo(k, 12); x.lineTo(k + 11, 26); x.lineTo(k + 22, 12); }
      x.stroke();
      x.fillStyle = '#3a86ff'; x.fillRect(-w / 2 + 6, 9, w - 12, 3);
    });
    for (const p of this.plats) { c.save(); c.translate(p.x + p.w / 2, p.y); ART.blit(c, truss(p.w)); c.restore(); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(80,150,255,.35)'; c.fillRect(p.x + 6, p.y + 9, p.w - 12, 3); c.restore(); }
    if (this.soccer) {
      for (const side of [-1, 1]) {
        const gx = side < 0 ? -1050 : 930;
        c.fillStyle = 'rgba(10,16,30,.35)'; c.fillRect(gx, -236, 120, 236);
        c.strokeStyle = 'rgba(240,245,255,.45)'; c.lineWidth = 1.5;
        for (let yy = -236; yy < 0; yy += 14) { c.beginPath(); c.moveTo(gx, yy); c.lineTo(gx + 120, yy + 6); c.stroke(); }
        for (let xx = gx; xx <= gx + 120; xx += 14) { c.beginPath(); c.moveTo(xx, -236); c.lineTo(xx + 4, 0); c.stroke(); }
        const pg = c.createLinearGradient(0, 0, 8, 0);
        c.save(); c.translate(side < 0 ? -936 : 930, 0); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#9aa7b8'); c.fillStyle = pg; c.fillRect(0, -250, 8, 250); c.restore();
        const bg = c.createLinearGradient(0, -250, 0, -236); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#9aa7b8');
        c.fillStyle = bg; c.fillRect(gx, -250, 120, 14);
      }
      for (const w of this.solids.filter(q => q.wall)) {
        const wg = c.createLinearGradient(w.x, 0, w.x + w.w, 0); wg.addColorStop(0, '#16203a'); wg.addColorStop(1, '#0b1224');
        c.fillStyle = wg; c.fillRect(w.x, w.y, w.w, w.h);
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(72,202,228,.7)'; c.fillRect(w.x, w.y, w.w, 4); c.restore();
      }
    }
  },
  drawFG() {},
};
installScenery();
