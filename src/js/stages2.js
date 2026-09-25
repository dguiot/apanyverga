'use strict';
// ============================================================
//  MUNDOS GRANDES: Azoteas de Neón y Estadio Golpazo
// ============================================================
STAGE_INFO.push(
  { id: 'city', name: 'Azoteas de Neón', desc: 'Mundo gigante: tres edificios, elevadores, un helicóptero y el metro por la calle.', song: 'volcano', big: true },
  { id: 'stadium', name: 'Estadio Golpazo', desc: 'Cancha enorme con público que avienta balones. En Fútbol tiene porterías.', song: 'temple', big: true },
);

// números pseudoaleatorios fijos para dibujar ventanas y público
function hash01(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

STAGE_DEFS.city = () => {
  const lift = off => (t, s) => [s.bx, 300 + Math.cos(t * 0.011 + off) * 305];
  return {
    name: 'Azoteas de Neón', song: 'volcano', big: true, zoomMin: 0.3,
    blast: { l: -2050, r: 2050, t: -1550, b: 1200 }, cam: { l: -1650, r: 1650, t: -1250, b: 900 },
    solids: [
      surf(-440, -60, 880, 780, { ledge: 1, tint: '#1d2a44' }),
      surf(-1150, 20, 550, 700, { ledge: 1, tint: '#241f3d' }),
      surf(600, 20, 550, 700, { ledge: 1, tint: '#1b3040' }),
      surf(-1550, 640, 3100, 140, { street: 1 }),
    ],
    plats: [
      surf(-585, 300, 130, 14, { plat: 1, lift: 1, move: lift(0) }),
      surf(455, 300, 130, 14, { plat: 1, lift: 1, move: lift(Math.PI) }),
      surf(-100, -380, 200, 14, { plat: 1, heli: 1, move: (t, s) => [Math.sin(t * 0.006) * 620 - 100, -390 + Math.sin(t * 0.05) * 8] }),
      surf(-320, -250, 180, 14, { plat: 1, sign: 'TACOS 24H' }),
      surf(140, -250, 180, 14, { plat: 1, sign: 'GOLPAZO' }),
    ],
    train: 0, trainX: 0, trainDir: 1, nextTrain: 700, trainWarn: 0,
    update() {
      if (this.train <= 0) {
        if (--this.nextTrain === 120) { this.trainDir = pick([-1, 1]); warnBanner(this.trainDir > 0 ? '¡Viene el metro! →' : '← ¡Viene el metro!', '#48cae4'); this.trainWarn = 120; }
        if (this.trainWarn > 0) this.trainWarn--;
        if (this.nextTrain <= 0) { this.train = 1; this.trainX = this.trainDir > 0 ? -2600 : 2600; Audio8.sfx('rumble'); }
        return;
      }
      this.trainX += this.trainDir * 46;
      const r = { x: this.trainDir > 0 ? this.trainX - 1100 : this.trainX, y: 470, w: 1100, h: 170 };
      for (const f of BATTLE.fighters) {
        if (f.dead || f.intangibleToStage() || f.trainCd > 0) { if (f.trainCd > 0) f.trainCd--; continue; }
        if (rectRect(r, f.hurtbox())) { f.trainCd = 40; applyHit(null, f, { dmg: 20, ang: 28, bkb: 16, kbg: 6, sfx: 'bighit' }, this.trainDir, { unblockable: true }); }
      }
      if (Math.abs(this.trainX) > 3800) { this.train = 0; this.nextTrain = randi(800, 1100); }
      if (this.t % 6 === 0) shake(1.5);
    },
    drawBG(c, cam) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#060818'); g.addColorStop(0.6, '#1a1238'); g.addColorStop(1, '#3a1a3a');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,240,210,.9)'; c.beginPath(); c.arc(W * 0.82, 110, 46, 0, TAU); c.fill();
      c.fillStyle = '#060818'; c.beginPath(); c.arc(W * 0.82 + 16, 100, 42, 0, TAU); c.fill();
      // tres capas de edificios con ventanas
      [[0.03, 0.35, '#120f2a', 60], [0.07, 0.5, '#171636', 44], [0.12, 0.62, '#1f1b44', 30]].forEach(([par, base, col, bw], L) => {
        const off = -cam.x * par, oy = -cam.y * par * 0.6;
        for (let i = -2; i < 26; i++) {
          const x = ((i * (bw + 26) + off) % (W + 400) + W + 400) % (W + 400) - 200;
          const h = 120 + hash01(i * 7 + L * 50) * 260;
          const y = H * base - h * 0.4 + oy + L * 40;
          c.fillStyle = col; c.fillRect(x, y, bw + 12, H - y + 50);
          for (let wy = y + 12; wy < H; wy += 18) for (let wx = x + 6; wx < x + bw + 4; wx += 12) {
            if (hash01(wx * 3.1 + wy * 1.7 + L) > 0.62) { c.fillStyle = hash01(wx + wy) > 0.8 ? 'rgba(72,202,228,.55)' : 'rgba(255,209,102,.5)'; c.fillRect(wx, wy, 5, 7); }
          }
        }
      });
    },
    drawStage(c) {
      const t = this.t;
      // calle y vías
      const st = this.solids[3];
      c.fillStyle = '#1b1d24'; c.fillRect(st.x, st.y, st.w, st.h);
      c.fillStyle = '#2b2e38'; c.fillRect(st.x, st.y, st.w, 10);
      c.fillStyle = 'rgba(255,209,102,.6)'; for (let x = st.x; x < st.x + st.w; x += 120) c.fillRect(x, st.y + 40, 60, 6);
      // edificios
      for (const s of this.solids.slice(0, 3)) {
        c.fillStyle = s.tint; c.fillRect(s.x, s.y, s.w, s.h);
        for (let wy = s.y + 40; wy < s.y + s.h - 20; wy += 46) for (let wx = s.x + 24; wx < s.x + s.w - 30; wx += 52) {
          const on = hash01(wx * 0.37 + wy * 0.11) > 0.45;
          c.fillStyle = on ? 'rgba(255,214,120,.55)' : 'rgba(10,12,24,.8)'; c.fillRect(wx, wy, 30, 26);
        }
        c.fillStyle = '#39445e'; c.fillRect(s.x - 6, s.y, s.w + 12, 14);
        c.fillStyle = `rgba(230,57,70,${0.6 + Math.sin(t * 0.08 + s.x) * 0.3})`; c.fillRect(s.x, s.y + 14, s.w, 3);
        // aire acondicionado y antena
        c.fillStyle = '#4a556d'; c.fillRect(s.x + 40, s.y - 26, 60, 26); c.fillRect(s.x + s.w - 90, s.y - 60, 6, 60);
        c.fillStyle = Math.floor(t / 30) % 2 ? '#e63946' : '#5a1a22'; c.beginPath(); c.arc(s.x + s.w - 87, s.y - 62, 5, 0, TAU); c.fill();
      }
      // plataformas
      for (const p of this.plats) {
        if (p.lift) {
          c.strokeStyle = 'rgba(160,170,190,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x + 10, -120); c.lineTo(p.x + 10, p.y); c.moveTo(p.x + p.w - 10, -120); c.lineTo(p.x + p.w - 10, p.y); c.stroke();
          c.fillStyle = '#5f6b85'; c.fillRect(p.x, p.y, p.w, 14); c.fillStyle = '#ffbe0b'; c.fillRect(p.x, p.y + 10, p.w, 4);
        } else if (p.heli) {
          const cx = p.x + p.w / 2, cy = p.y - 70;
          c.fillStyle = '#2a3348'; c.beginPath(); c.ellipse(cx, cy, 90, 44, 0, 0, TAU); c.fill();
          c.fillStyle = 'rgba(72,202,228,.6)'; c.beginPath(); c.ellipse(cx + 40, cy - 6, 34, 24, 0, 0, TAU); c.fill();
          c.fillStyle = '#2a3348'; c.fillRect(cx - 190, cy - 10, 110, 14);
          c.strokeStyle = 'rgba(220,230,245,.7)'; c.lineWidth = 5; const ra = t * 0.9; c.beginPath(); c.moveTo(cx + Math.cos(ra) * 150, cy - 50); c.lineTo(cx - Math.cos(ra) * 150, cy - 50); c.stroke();
          c.strokeStyle = '#9aa7b8'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx - 60, cy + 40); c.lineTo(cx - 60, p.y); c.moveTo(cx + 60, cy + 40); c.lineTo(cx + 60, p.y); c.stroke();
          c.fillStyle = '#9aa7b8'; c.fillRect(p.x, p.y, p.w, 10);
          // reflector
          c.fillStyle = 'rgba(255,245,200,.07)'; c.beginPath(); c.moveTo(cx, cy + 30); c.lineTo(cx - 140, 700); c.lineTo(cx + 140, 700); c.closePath(); c.fill();
        } else {
          c.fillStyle = '#10131a'; c.fillRect(p.x + 20, p.y + 14, 8, 100); c.fillRect(p.x + p.w - 28, p.y + 14, 8, 100);
          roundRect(c, p.x - 6, p.y - 70, p.w + 12, 70, 8); c.fillStyle = '#12091e'; c.fill();
          c.strokeStyle = p.sign === 'GOLPAZO' ? '#ff5d8f' : '#48cae4'; c.lineWidth = 3; c.stroke();
          const on = Math.floor(t / 20 + p.x) % 7 !== 0;
          text(p.sign, p.x + p.w / 2, p.y - 34, 30, on ? (p.sign === 'GOLPAZO' ? '#ff5d8f' : '#48cae4') : '#333', { weight: 700 });
          c.fillStyle = '#5f6b85'; c.fillRect(p.x, p.y, p.w, 12);
        }
      }
      // metro
      if (this.train) {
        const x0 = this.trainDir > 0 ? this.trainX - 1100 : this.trainX;
        for (let k = 0; k < 3; k++) {
          const x = x0 + k * 370;
          roundRect(c, x, 480, 350, 150, 18); c.fillStyle = '#c9d6e8'; c.fill();
          c.fillStyle = '#e63946'; c.fillRect(x, 560, 350, 16);
          c.fillStyle = 'rgba(40,60,90,.9)'; for (let w = x + 20; w < x + 330; w += 64) c.fillRect(w, 500, 46, 40);
        }
        c.fillStyle = 'rgba(255,245,200,.8)'; c.beginPath(); c.arc(this.trainDir > 0 ? this.trainX : x0, 600, 14, 0, TAU); c.fill();
      } else if (this.trainWarn > 0 && Math.floor(this.t / 8) % 2) {
        c.fillStyle = 'rgba(72,202,228,.25)'; c.fillRect(-1550, 480, 3100, 160);
      }
    },
    drawFG() {},
  };
};

STAGE_DEFS.stadium = (opts = {}) => {
  const soccer = !!opts.soccer;
  const solids = [surf(-1050, 0, 2100, 90, { ledge: soccer ? 0 : 1 })];
  if (soccer) solids.push(
    surf(-1140, -760, 90, 850, { wall: 1 }), surf(1050, -760, 90, 850, { wall: 1 }),
    surf(-1050, -250, 120, 14, { bar: 1 }), surf(930, -250, 120, 14, { bar: 1 }),
  );
  return {
    name: 'Estadio Golpazo', song: 'temple', big: true, zoomMin: 0.33, soccer,
    blast: { l: -1950, r: 1950, t: -1450, b: 950 }, cam: { l: -1500, r: 1500, t: -1100, b: 700 },
    solids,
    plats: [
      surf(-640, -210, 210, 14, { plat: 1 }),
      surf(430, -210, 210, 14, { plat: 1 }),
      surf(-105, -390, 210, 14, { plat: 1, move: (t, s) => [s.bx + Math.sin(t * 0.008) * 260, s.by] }),
    ],
    goals: soccer ? { l: -930, r: 930, top: -236 } : null,
    nextBall: 900, wave: 0,
    update() {
      this.wave = (this.wave + 1) % 600;
      if (this.soccer) return;
      if (--this.nextBall === 90) warnBanner('¡Balonazo desde la tribuna!', '#f4f6fa');
      if (this.nextBall <= 0) {
        this.nextBall = randi(900, 1300);
        const d = pick([-1, 1]);
        spawnProjectile(null, { type: 'ball', x: -d * 1500, y: -700, vx: d * rand(9, 13), vy: -2, grav: 0.35, bounce: -11, r: 24, life: 360, dmg: 8, ang: 50, bkb: 7, kbg: 7, pierce: 1 });
      }
    },
    drawBG(c, cam) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b1a36'); g.addColorStop(1, '#2d3f6b');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const px = -cam.x * 0.05, py = -cam.y * 0.04;
      // torres de luz
      for (const lx of [120, W - 120]) {
        c.fillStyle = '#1a2440'; c.fillRect(lx + px - 6, 60 + py, 12, 300);
        c.fillStyle = '#fff7d6'; roundRect(c, lx + px - 50, 40 + py, 100, 34, 6); c.fill();
        c.fillStyle = 'rgba(255,247,214,.08)'; c.beginPath(); c.moveTo(lx + px, 60 + py); c.lineTo(W / 2 - 200, H); c.lineTo(W / 2 + 200, H); c.closePath(); c.fill();
      }
      // tribunas con público y "ola"
      for (let row = 0; row < 9; row++) {
        const y = 250 + row * 34 + py;
        c.fillStyle = row % 2 ? '#1b2748' : '#22305a'; c.fillRect(0, y, W, 34);
        for (let i = 0; i < 64; i++) {
          const x = ((i * 21 + row * 9 + px * 1.3) % (W + 40) + W + 40) % (W + 40) - 20;
          const waveUp = Math.abs(((this.wave * 4) % (W + 400)) - 200 - x) < 70 ? -10 : 0;
          c.fillStyle = ['#e63946', '#3a86ff', '#ffbe0b', '#f4f6fa', '#2dc653'][Math.floor(hash01(i + row * 70) * 5)];
          c.beginPath(); c.arc(x, y + 14 + waveUp + Math.sin(this.t * 0.2 + i) * 1.2, 6, 0, TAU); c.fill();
        }
      }
      // pantalla gigante
      roundRect(c, W / 2 - 150 + px, 70 + py, 300, 120, 10); c.fillStyle = '#05070d'; c.fill(); c.strokeStyle = '#48cae4'; c.lineWidth = 3; c.stroke();
      const B = BATTLE;
      if (B && B.ms && B.ms.goals) { text(`${B.ms.goals[0]}  -  ${B.ms.goals[1]}`, W / 2 + px, 130 + py, 64, '#ffc53d', { weight: 700 }); }
      else text('A PAN Y VERGA', W / 2 + px, 130 + py, 44, '#ffc53d', { weight: 700 });
    },
    drawStage(c) {
      const s = this.solids[0];
      c.fillStyle = '#1f6f3b'; c.fillRect(s.x, s.y, s.w, s.h);
      for (let x = s.x; x < s.x + s.w; x += 140) { c.fillStyle = (Math.floor((x - s.x) / 140) % 2) ? '#2a8a4a' : '#248043'; c.fillRect(x, s.y, 140, 16); }
      c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(-3, s.y, 6, 16); c.fillRect(s.x, s.y, s.w, 3);
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; c.beginPath(); c.ellipse(0, s.y + 8, 170, 8, 0, 0, TAU); c.stroke();
      // tablero de anuncios al frente
      c.fillStyle = '#10131a'; c.fillRect(s.x, s.y + 16, s.w, s.h - 16);
      ['GOLPAZO', 'TACOS', 'CHISPA ROBOTICS', 'TORITO GYM', 'MICHI NINJA', 'SALSA CHILAZO'].forEach((ad, i) => text(ad, s.x + 170 + i * 350, s.y + 52, 24, ['#ffc53d', '#e63946', '#48cae4', '#ff9f1c', '#f4f6fa', '#2dc653'][i], { weight: 700 }));
      for (const p of this.plats) { roundRect(c, p.x, p.y, p.w, 14, 6); c.fillStyle = '#cfd8e6'; c.fill(); c.fillStyle = '#3a86ff'; c.fillRect(p.x + 10, p.y + 10, p.w - 20, 4); }
      if (this.soccer) {
        for (const side of [-1, 1]) {
          const gx = side < 0 ? -1050 : 930;
          c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
          for (let yy = -236; yy < 0; yy += 20) { c.beginPath(); c.moveTo(gx, yy); c.lineTo(gx + 120, yy); c.stroke(); }
          for (let xx = gx; xx <= gx + 120; xx += 20) { c.beginPath(); c.moveTo(xx, -236); c.lineTo(xx, 0); c.stroke(); }
          c.fillStyle = '#f4f6fa'; c.fillRect(side < 0 ? -936 : 930, -250, 8, 250);
          c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(gx, -250, 120, 14);
        }
        for (const w of this.solids.filter(q => q.wall)) { c.fillStyle = '#1a2440'; c.fillRect(w.x, w.y, w.w, w.h); c.fillStyle = '#48cae4'; c.fillRect(w.x, w.y, w.w, 6); }
      }
    },
    drawFG() {},
  };
};
