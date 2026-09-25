'use strict';
// ============================================================
//  ARTE: render "pintado". Ruido, capas horneadas una sola vez,
//  materiales con textura, luz de escena sobre los peleadores y
//  post-proceso (bloom, gradación de color, viñeta).
// ============================================================
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function srand(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
function hash1(i, s) { let h = Math.imul(i | 0, 374761393) ^ Math.imul(s | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const smooth01 = t => t * t * (3 - 2 * t);
// ruido de valor 1D; con periodo P (entero) se repite y sirve para capas que se enciman sin costura
function vnoise1(x, s, P) {
  const i = Math.floor(x), f = smooth01(x - i), w = a => P ? ((a % P) + P) % P : a;
  return lerp(hash1(w(i), s), hash1(w(i + 1), s), f);
}
function fbm1(x, s, oct = 5, P = 0) {
  let v = 0, a = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { v += a * vnoise1(x * f, s + i * 31, P ? P * f : 0); tot += a; a *= 0.5; f *= 2; }
  return v / tot;
}
// P = periodo en celdas (número, o [Px, Py] si cada eje se repite distinto); 0 = sin repetir
function vnoise2(x, y, s, P) {
  const Px = Array.isArray(P) ? P[0] : P, Py = Array.isArray(P) ? P[1] : P;
  const xi = Math.floor(x), yi = Math.floor(y), u = smooth01(x - xi), v = smooth01(y - yi);
  const wx = a => Px ? ((a % Px) + Px) % Px : a, wy = a => Py ? ((a % Py) + Py) % Py : a;
  const a = hash2(wx(xi), wy(yi), s), b = hash2(wx(xi + 1), wy(yi), s), c = hash2(wx(xi), wy(yi + 1), s), d = hash2(wx(xi + 1), wy(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm2(x, y, s, oct = 4, P = 0) {
  let v = 0, a = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) {
    const Pf = !P ? 0 : Array.isArray(P) ? [P[0] * f, P[1] * f] : P * f;
    v += a * vnoise2(x * f, y * f, s + i * 17, Pf); tot += a; a *= 0.5; f *= 2;
  }
  return v / tot;
}
function mixRGB(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function rgbStr(c, a = 1) { return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }

const ART = {
  store: new Map(),
  hi: true,                // bloom y luz de borde; baja sola si el equipo no aguanta
  light: null,             // luz del escenario actual
  frameMs: 0, slow: 0,
  pxRes() { return clamp(VIEW.scale * VIEW.dpr, 1, 2); },
  bgRes() { return clamp(VIEW.scale * VIEW.dpr * 0.8, 0.7, 1.4); },
  // guarda lo que cuesta dibujar (se genera una vez por clave)
  memo(key, make) { if (!this.store.has(key)) this.store.set(key, make()); return this.store.get(key); },
  // lienzo horneado en coordenadas del mundo: {img, x, y, w, h}
  bake(key, x, y, w, h, draw, res) {
    const R = res || this.pxRes();
    return this.memo(key + '@' + R.toFixed(2), () => {
      const cv = mkCanvas(w * R, h * R), c = cv.getContext('2d');
      c.scale(R, R); c.translate(-x, -y); draw(c);
      return { img: cv, x, y, w, h };
    });
  },
  blit(c, p, dx = 0, dy = 0) { c.drawImage(p.img, p.x + dx, p.y + dy, p.w, p.h); },
  // textura periódica (patrón) generada por píxel
  texture(key, size, fn) {
    return this.memo('tex:' + key, () => {
      const cv = mkCanvas(size, size), c = cv.getContext('2d'), im = c.createImageData(size, size), d = im.data;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const o = (y * size + x) * 4, col = fn(x, y);
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = col[3] === undefined ? 255 : col[3];
      }
      c.putImageData(im, 0, 0);
      return cv;
    });
  },
  pattern(c, key, size, fn, scale = 1) {
    const p = c.createPattern(this.texture(key, size, fn), 'repeat');
    if (scale !== 1 && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scale(scale));
    return p;
  },
  // halo radial precalculado (luces baratas, se dibuja con 'lighter')
  glow(col) {
    return this.memo('glow:' + col, () => {
      const cv = mkCanvas(128, 128), c = cv.getContext('2d');
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, withAlpha(col, 1)); g.addColorStop(0.25, withAlpha(col, 0.5)); g.addColorStop(0.6, withAlpha(col, 0.12)); g.addColorStop(1, withAlpha(col, 0));
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      return cv;
    });
  },
  drawGlow(c, x, y, r, col, a = 1) {
    const pa = c.globalAlpha, pc = c.globalCompositeOperation;
    c.globalAlpha = pa * a; c.globalCompositeOperation = 'lighter';
    c.drawImage(this.glow(col), x - r, y - r, r * 2, r * 2);
    c.globalAlpha = pa; c.globalCompositeOperation = pc;
  },
  // bocanada de humo suave con borde irregular (polvo, humo, estelas)
  puff(col) {
    return this.memo('puff:' + col, () => {
      const cv = mkCanvas(96, 96), c = cv.getContext('2d'), r = srand(col.length * 7 + 3);
      for (let i = 0; i < 9; i++) {
        const a = r() * TAU, d = r() * 18, x = 48 + Math.cos(a) * d, y = 48 + Math.sin(a) * d, rr = 16 + r() * 14;
        const g = c.createRadialGradient(x, y - rr * 0.3, 0, x, y, rr);
        g.addColorStop(0, withAlpha(col, 0.55)); g.addColorStop(0.6, withAlpha(col, 0.28)); g.addColorStop(1, withAlpha(col, 0));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
      }
      return cv;
    });
  },
  // bola de fuego para explosiones
  fireball() {
    return this.memo('fireball', () => {
      const cv = mkCanvas(128, 128), c = cv.getContext('2d');
      const g = c.createRadialGradient(64, 60, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.2, 'rgba(255,230,140,1)'); g.addColorStop(0.45, 'rgba(255,140,40,.95)'); g.addColorStop(0.75, 'rgba(200,50,20,.55)'); g.addColorStop(1, 'rgba(80,20,10,0)');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      return cv;
    });
  },
  // nube volumétrica: muchas bolitas suaves, arriba iluminada y abajo en sombra
  cloud(seed, w, h, lit, dark, res = 1) {
    return this.memo(`cloud:${seed}:${w}:${h}:${lit}:${dark}:${res}`, () => {
      const cv = mkCanvas(w * res, h * res), c = cv.getContext('2d'), r = srand(seed);
      c.scale(res, res);
      const n = 26 + Math.floor(w / 18);
      for (let i = 0; i < n; i++) {
        const t = r(), px = w * (0.12 + 0.76 * t), bulge = Math.sin(t * Math.PI);
        const py = h * (0.78 - 0.5 * bulge * r() - 0.08), rad = h * (0.16 + 0.26 * bulge * (0.5 + r() * 0.5));
        const g = c.createRadialGradient(px, py - rad * 0.3, rad * 0.1, px, py, rad);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.7, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.beginPath(); c.arc(px, py, rad, 0, TAU); c.fill();
      }
      c.globalCompositeOperation = 'source-atop';
      const g = c.createLinearGradient(0, h * 0.15, 0, h * 0.95);
      g.addColorStop(0, lit); g.addColorStop(0.55, mixStr(lit, dark, 0.45)); g.addColorStop(1, dark);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      return cv;
    });
  },
  // silueta de montaña/ciudad con ruido periódico (se puede repetir de lado a lado)
  ridge(c, w, baseY, amp, seed, period, oct = 5, ridged = false) {
    const P = Math.max(1, Math.round(w / period));
    c.beginPath(); c.moveTo(0, baseY + 4000);
    for (let x = 0; x <= w; x += 3) {
      let n = fbm1(x / w * P, seed, oct, P);
      if (ridged) n = 1 - Math.abs(n * 2 - 1);
      c.lineTo(x, baseY - n * amp);
    }
    c.lineTo(w, baseY + 4000); c.closePath();
  },
  // capa de fondo en pantalla, repetida en horizontal y con paralaje
  layer(key, w, h, draw, res) {
    const R = res || this.bgRes();
    return this.memo('layer:' + key + '@' + R.toFixed(2), () => {
      const cv = mkCanvas(w * R, h * R), c = cv.getContext('2d');
      c.scale(R, R); draw(c, w, h);
      return { img: cv, w, h };
    });
  },
  drawLayer(c, L, cam, par, y0, opt = {}) {
    const zk = 1 + (cam.z - 0.8) * par * (opt.zoomK ?? 0.6);
    const w = L.w * zk, h = L.h * zk;
    let x = -cam.x * par * 0.5 * (opt.xk ?? 1) - (w - W) / 2;
    const y = y0 - cam.y * par * 0.35 * (opt.yk ?? 1) - (h - L.h) * 0.5;
    if (opt.repeat === false) { c.drawImage(L.img, x, y, w, h); return; }
    x = ((x % w) + w) % w - w;
    for (let k = 0; x + k * w < W; k++) c.drawImage(L.img, x + k * w, y, w, h);
  },

  // ---------------- luz sobre los peleadores ----------------
  // El personaje se dibuja en su propio lienzo; ahí se le agrega la luz de borde
  // del lado de la luz, una sombra de forma del otro lado y el tinte del ambiente.
  // Así las caras con foto y los cuerpos quedan iluminados por el mismo sol.
  litCanvases: [],
  drawLit(c, slot, box, draw) {
    const L = this.light;
    if (!L || !this.hi || !c.getTransform) { draw(c); return; }
    const m = c.getTransform();
    const xs = [], ys = [];
    for (const [px, py] of [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]]) { xs.push(m.a * px + m.c * py + m.e); ys.push(m.b * px + m.d * py + m.f); }
    const x0 = Math.floor(Math.min(...xs)) - 2, y0 = Math.floor(Math.min(...ys)) - 2;
    const w = Math.ceil(Math.max(...xs)) + 2 - x0, h = Math.ceil(Math.max(...ys)) + 2 - y0;
    const cw = c.canvas.width, ch = c.canvas.height;
    if (w <= 0 || h <= 0 || w > 2600 || h > 2600 || x0 > cw || y0 > ch || x0 + w < 0 || y0 + h < 0) { draw(c); return; }
    let S = this.litCanvases[slot];
    if (!S) S = this.litCanvases[slot] = { a: mkCanvas(64, 64), b: mkCanvas(64, 64) };
    for (const k of ['a', 'b']) if (S[k].width < w || S[k].height < h) { S[k].width = Math.max(S[k].width, w + 32); S[k].height = Math.max(S[k].height, h + 32); }
    const a = S.a.getContext('2d'), b = S.b.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalAlpha = 1; a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, w + 2, h + 2);
    a.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0);
    draw(a);
    a.setTransform(1, 0, 0, 1, 0, 0);
    const k = Math.hypot(m.a, m.b);                 // píxeles por unidad del mundo
    const off = clamp(2.4 * k, 1.2, 9), lx = L.dir[0], ly = L.dir[1];
    // borde iluminado = silueta menos la silueta corrida hacia la luz
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1;
    b.globalCompositeOperation = 'copy'; b.drawImage(S.a, 0, 0, w, h, 0, 0, w, h);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = L.rim; b.fillRect(0, 0, w, h);
    b.globalCompositeOperation = 'destination-out'; b.drawImage(S.a, 0, 0, w, h, -lx * off, -ly * off, w, h);
    // sombra de forma: degradado a lo largo de la dirección de la luz
    a.globalCompositeOperation = 'source-atop';
    const cx = w / 2, cy = h / 2, R = Math.max(w, h) * 0.5;
    const g = a.createLinearGradient(cx + lx * R * 0.6, cy + ly * R * 0.6, cx - lx * R * 0.6, cy - ly * R * 0.6);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(1, L.shade);
    a.fillStyle = g; a.fillRect(0, 0, w, h);
    if (L.amb) { a.fillStyle = L.amb; a.fillRect(0, 0, w, h); }
    a.globalCompositeOperation = 'lighter'; a.globalAlpha = L.rimA;
    a.drawImage(S.b, 0, 0, w, h, 0, 0, w, h);
    a.globalAlpha = 1; a.globalCompositeOperation = 'source-over';
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(S.a, 0, 0, w, h, x0, y0, w, h);
    c.restore();
  },

  // ---------------- post-proceso ----------------
  bloomCv: null,
  post(c, G) {
    G = G || {};
    const cv = c.canvas;
    if (this.hi && G.bloom) {
      const bw = 160, bh = 90;
      if (!this.bloomCv) { this.bloomCv = mkCanvas(bw, bh); this.bloomTmp = mkCanvas(bw, bh); this.bloomSm = mkCanvas(80, 45); }
      const b = this.bloomCv.getContext('2d'), t = this.bloomTmp.getContext('2d'), sm = this.bloomSm.getContext('2d');
      b.globalCompositeOperation = 'copy'; b.globalAlpha = 1; b.drawImage(cv, 0, 0, bw, bh);
      // umbral suave: multiplicar la imagen por sí misma deja solo lo brillante
      for (let i = 0; i < (G.bloomPow || 2); i++) {
        t.globalCompositeOperation = 'copy'; t.drawImage(this.bloomCv, 0, 0);
        b.globalCompositeOperation = 'multiply'; b.drawImage(this.bloomTmp, 0, 0);
      }
      sm.globalCompositeOperation = 'copy'; sm.drawImage(this.bloomCv, 0, 0, 80, 45);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      c.imageSmoothingEnabled = true; c.globalCompositeOperation = 'lighter';
      c.globalAlpha = G.bloom * 0.6; c.drawImage(this.bloomCv, 0, 0, cv.width, cv.height);
      c.globalAlpha = G.bloom; c.drawImage(this.bloomSm, 0, 0, cv.width, cv.height);
      c.restore();
    }
    // gradación: luz cálida/fría arriba y abajo
    if (G.top || G.bottom) {
      c.save(); c.globalCompositeOperation = 'soft-light';
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, G.top || 'rgba(0,0,0,0)'); g.addColorStop(1, G.bottom || 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.restore();
    }
    const v = this.memo('vignette:' + (G.vig || 0.5), () => {
      const cv2 = mkCanvas(W / 2, H / 2), x = cv2.getContext('2d');
      const g = x.createRadialGradient(W / 4, H / 4, H * 0.14, W / 4, H / 4, H * 0.5);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, `rgba(0,0,0,${(G.vig || 0.5) * 0.25})`); g.addColorStop(1, `rgba(0,0,0,${G.vig || 0.5})`);
      x.fillStyle = g; x.fillRect(0, 0, W / 2, H / 2);
      return cv2;
    });
    c.drawImage(v, 0, 0, W, H);
  },
  // baja la calidad sola si dibujar un cuadro tarda demasiado
  measure(ms) {
    this.frameMs = lerp(this.frameMs, ms, 0.05);
    if (this.hi && this.frameMs > 22) { if (++this.slow > 120) { this.hi = false; this.slow = 0; } }
    else this.slow = Math.max(0, this.slow - 1);
  },
};
function mixStr(a, b, t) { return rgbStr(mixRGB(parseColor(a), parseColor(b), t)); }
