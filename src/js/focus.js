'use strict';
// ============================================================
//  EL CONTROL LLEGA A TODOS LOS BOTONES
//  Cada pantalla se maneja con la cruceta por su cursor propio (la lista del menú, la rejilla de
//  personajes…), pero había botones a los que solo se llegaba con el ratón: el volumen, Volver,
//  Cámara y voz, Invitar, los niveles de la CPU, cambiar tu nombre…
//  · cada botón que una pantalla revisa con clickIn() queda anotado como destino (más el volumen,
//    la cámara y la invitación, que se revisan aparte);
//  · al llegar a la orilla del cursor propio, o en una pantalla sin cursor, la cruceta salta al
//    botón más cercano en esa dirección y se mueve entre botones con un marco dorado;
//  · A lo pica (igual que un clic); B, o volver hacia la zona del cursor propio, regresa a él.
// ============================================================
const UIFocus = {
  cur: null,          // botón con el marco { x, y, w, h, k, act? }
  dev: null,          // quién lo mueve
  list: [], next: [], // destinos del cuadro anterior / los que se anotan en este
  eat: null, eatDev: null,
  screen: null,
  key(x, y, w, h) { return Math.round(x) + ',' + Math.round(y) + ',' + Math.round(w) + ',' + Math.round(h); },
  rec(x, y, w, h, act) {
    const k = this.key(x, y, w, h);
    if (!this.next.some(t => t.k === k)) this.next.push({ x, y, w, h, k, act });
  },
  // lo que la pantalla ya no quiere que se vea (el foco también lo suelta)
  eaten(dev) { return this.eat && (this.eatDev === dev || this.eatDev === 'local' || dev === 'local') ? this.eat : null; },
  off() { if (this.cur) { this.cur = null; Pointer.x = -1; Pointer.y = -1; } },
  // en línea hay un solo jugador por pantalla: todo lo conectado cuenta como el mismo
  devs() { return Net.role === 'host' || Net.role === 'guest' ? ['local'] : Devices.list; },
  // mejor destino en la dirección (dx, dy) desde el rectángulo o: lo que más avanza y menos se desvía,
  // y antes que nada lo que está en la misma fila (←→) o columna (↑↓). ↑↓ acepta desviarse bastante
  // (la barra de arriba está en las esquinas); ←→ poco, para no brincar de fila
  best(o, dx, dy, cands) {
    let best = null, bs = 1e9;
    const cone = dy ? 6 : 1.2, ox = o.x + o.w / 2, oy = o.y + o.h / 2;
    for (const t of cands) {
      const along = (t.x + t.w / 2 - ox) * dx + (t.y + t.h / 2 - oy) * dy;
      const gap = dx ? Math.max(0, t.y - (o.y + o.h), o.y - (t.y + t.h)) : Math.max(0, t.x - (o.x + o.w), o.x - (t.x + t.w));
      if (along < 6 || gap > along * cone) continue;
      const s = along + gap * 2.2 + (gap > 4 ? 1000 : 0);
      if (s < bs) { bs = s; best = t; }
    }
    return best;
  },
  // destinos que dibuja el marco: los anotados menos los del cursor propio y los que la pantalla esconde
  extras(native) {
    const hide = new Set([...(native.items || []), ...(native.hide || [])].map(r => this.key(r.x, r.y, r.w, r.h)));
    return this.list.filter(t => !hide.has(t.k));
  },
  begin() {
    this.eat = null; this.eatDev = null;
    if (this.screen !== APP.screen) { this.screen = APP.screen; this.off(); }
    this.list = this.next; this.next = [];
    // los que no pasan por clickIn(): volumen, cámara y voz, invitar
    if (!['battle', 'demo', 'vs', 'netview'].includes(APP.screen)) this.list.push({ x: W - 58, y: 14, w: 46, h: 40, k: 'mute' });
    if (typeof avButtonShown === 'function' && avButtonShown()) {
      if (AV.on) for (const q of AV.segs(AV_BTN)) this.list.push({ x: q.x, y: q.y, w: q.w, h: q.h, k: 'av-' + q.a });
      else this.list.push({ x: AV_BTN.x, y: AV_BTN.y, w: AV_BTN.w, h: AV_BTN.h, k: 'av' });
    }
    if (APP.inviteShown && APP.inviteShown()) { const b = APP.inviteRect(); this.list.push({ x: b.x, y: b.y, w: b.w, h: b.h, k: 'invite', act: () => Net.invite() }); }
    const native = APP.focusNative ? APP.focusNative : () => false;
    if (Capture.active || (typeof InviteBox !== 'undefined' && InviteBox.isOpen())) return this.off();
    if (this.cur && !this.list.some(t => t.k === this.cur.k)) this.off(); // el botón ya no está
    const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const d of this.devs()) {
      const n = Devices.nav(d);
      const nat = native.call(APP, d);
      if (!nat) continue;
      if (this.cur && this.dev === d) {
        // con el marco puesto, la cruceta es del foco
        for (const k of Object.keys(DIRS)) {
          if (!n[k]) continue;
          const o = this.cur, cands = this.extras(nat).filter(t => t.k !== o.k).concat((nat.items || []).map((r, i) => Object.assign({}, r, { k: 'n' + i, ni: i })));
          const b = this.best(o, DIRS[k][0], DIRS[k][1], cands);
          if (b && b.ni !== undefined) { this.off(); nat.sel(b.ni); Audio8.sfx('menu'); }
          else if (b) { this.cur = b; Audio8.sfx('menu'); }
          this.eatNow(d, [k]);
          break;
        }
        if (!this.cur) continue;
        if (n.confirm) { this.press(this.cur); this.eatNow(d, ['confirm']); }
        else if (n.back) { this.off(); Audio8.sfx('back'); this.eatNow(d, ['back']); }
        continue;
      }
      // sin marco: solo si el cursor propio ya no tiene a dónde ir en esa dirección
      for (const k of Object.keys(DIRS)) {
        if (!n[k] || (nat.own && nat.own(k))) continue;
        const [dx, dy] = DIRS[k], o = nat.cur || { x: W / 2 - 1, y: H / 2 - 1, w: 2, h: 2 };
        const others = (nat.items || []).filter(r => r !== nat.cur && this.key(r.x, r.y, r.w, r.h) !== this.key(o.x, o.y, o.w, o.h));
        if (this.best(o, dx, dy, others)) continue;
        const b = this.best(o, dx, dy, this.extras(nat));
        if (!b) continue;
        this.cur = b; this.dev = d; Audio8.sfx('menu');
        this.eatNow(d, [k]);
        break;
      }
    }
    // el marco manda el "ratón" al botón: así se ilumina igual que con el ratón encima
    if (this.cur) { Pointer.x = this.cur.x + this.cur.w / 2; Pointer.y = this.cur.y + this.cur.h / 2; }
  },
  eatNow(d, keys) { this.eatDev = d; this.eat = (this.eat || []).concat(keys); },
  // A sobre un botón: lo mismo que un clic en su centro
  press(t) {
    Pointer.x = t.x + t.w / 2; Pointer.y = t.y + t.h / 2;
    if (t.act) { t.act(); return; }
    Pointer.clicked = true;
  },
  draw() {
    const t = this.cur; if (!t) return;
    const a = reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(APP.t * 0.18);
    ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 4; ctx.strokeStyle = GOLD;
    ctx.shadowColor = 'rgba(255,197,61,.8)'; ctx.shadowBlur = 12;
    slabPath(t.x - 5, t.y - 5, t.w + 10, t.h + 10, 0.12); ctx.stroke();
    ctx.restore();
  },
};
// el ratón de verdad se mueve: el marco se quita
window.addEventListener('mousemove', () => { if (UIFocus.cur) { UIFocus.cur = null; } }, { passive: true });
