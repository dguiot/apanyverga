'use strict';
// ============================================================
//  A PAN Y VERGA (antes Súper Golpazo) — núcleo: lienzo, utilidades, entrada
// ============================================================
const W = 1280, H = 720;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let VIEW = { scale: 1, dpr: 1 };

function resize() {
  // con la cámara y voz encendidas, el juego deja espacio abajo para las caras
  const bar = window.AV_BAR || 0; // lo fija la franja de cámara (avchat.js)
  document.body.style.paddingBottom = bar ? bar + 'px' : '';
  const vw = window.innerWidth, vh = Math.max(120, window.innerHeight - bar);
  const s = Math.min(vw / W, vh / H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
  canvas.width = Math.floor(W * s * dpr);
  canvas.height = Math.floor(H * s * dpr);
  VIEW.scale = s; VIEW.dpr = dpr;
}
window.addEventListener('resize', resize);
resize();

// ---------- utilidades ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const approach = (v, t, s) => v < t ? Math.min(v + s, t) : Math.max(v - s, t);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}
function rectRect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function parseColor(col) {
  if (col[0] === '#') {
    let h = col.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = col.match(/[\d.]+/g) || [0, 0, 0];
  return [+m[0], +m[1], +m[2]];
}
function shade(col, amt) {
  // amt -1..1 : oscurece / aclara (acepta #hex o rgb())
  let [r, g, b] = parseColor(col);
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function withAlpha(col, a) {
  const [r, g, b] = parseColor(col);
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

const FONT_DISPLAY = '"Teko", "Impact", "Arial Narrow", sans-serif';
const FONT_BODY = '"Barlow", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

function text(str, x, y, size, color, opts = {}) {
  ctx.font = `${opts.weight || ''} ${size}px ${opts.display === false ? FONT_BODY : (opts.body ? FONT_BODY : FONT_DISPLAY)}`.trim();
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  if (opts.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = opts.strokeW || Math.max(3, size / 7);
    ctx.strokeStyle = opts.stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const PLAYER_COLORS = ['#e63946', '#3a86ff', '#ffbe0b', '#2dc653'];
const PLAYER_TAGS = ['J1', 'J2', 'J3', 'J4'];

// ---------- Mouse / táctil para menús ----------
const Pointer = { x: -1, y: -1, down: false, clicked: false, moved: false };
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
canvas.addEventListener('pointermove', e => { const p = toLogical(e); Pointer.x = p.x; Pointer.y = p.y; Pointer.moved = true; });
canvas.addEventListener('pointerdown', e => { try { canvas.focus({ preventScroll: true }); window.focus(); } catch (er) { /* sin foco */ } const p = toLogical(e); Pointer.x = p.x; Pointer.y = p.y; Pointer.down = true; Pointer.clicked = true; Audio8.unlock(); });
window.addEventListener('pointerup', () => { Pointer.down = false; });
function hover(x, y, w, h) { return Pointer.x >= x && Pointer.x <= x + w && Pointer.y >= y && Pointer.y <= y + h; }
function clickIn(x, y, w, h) { return Pointer.clicked && hover(x, y, w, h); }

// ---------- Avisos flotantes ----------
const Toasts = {
  items: [],
  push(msg) { this.items.push({ msg, t: 0 }); if (this.items.length > 4) this.items.shift(); },
  draw() {
    let y = 78;
    for (const it of this.items) {
      it.t++;
      const a = clamp(Math.min(it.t / 12, (240 - it.t) / 20), 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `500 18px ${FONT_BODY}`;
      const w = ctx.measureText(it.msg).width + 36;
      roundRect(ctx, W / 2 - w / 2, y, w, 36, 18);
      ctx.fillStyle = 'rgba(8,20,34,.88)'; ctx.fill();
      ctx.strokeStyle = 'rgba(46,196,182,.7)'; ctx.lineWidth = 2; ctx.stroke();
      text(it.msg, W / 2, y + 18, 18, '#f1f5f9', { body: true, weight: 500 });
      ctx.globalAlpha = 1;
      y += 44;
    }
    this.items = this.items.filter(i => i.t < 240);
  },
};
