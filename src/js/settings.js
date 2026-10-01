'use strict';
// Preferencias de presentación: nunca alteran el estado de la pelea.
const Prefs = {
  quality: IS_XBOX ? 'fast' : 'auto', fx: 'full', motion: 'system', contrast: false, labels: true, saved: null,
  load() {
    try {
      const old = JSON.parse(localStorage.getItem('apyv-display-v1') || 'null');
      if (old) {
        if (['auto', 'fast', 'sharp'].includes(old.quality)) this.quality = old.quality;
        if (['full', 'low'].includes(old.fx)) this.fx = old.fx;
        if (['system', 'reduce'].includes(old.motion)) this.motion = old.motion;
        this.contrast = !!old.contrast;
        this.labels = old.labels !== false;
      }
    } catch (e) { /* el navegador puede bloquear almacenamiento */ }
    this.apply();
  },
  save() {
    try {
      localStorage.setItem('apyv-display-v1', JSON.stringify({
        quality: this.quality, fx: this.fx, motion: this.motion, contrast: this.contrast, labels: this.labels,
      }));
      this.saved = true;
    } catch (e) { this.saved = false; }
    this.apply();
  },
  apply() {
    const redraw = this.appliedQuality !== this.quality || this.appliedFX !== this.fx;
    reducedMotion = this.motion === 'reduce' || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    QUALITY.cap = this.quality === 'fast' ? (IS_XBOX ? 0.8 : 1) : IS_XBOX ? 1 : 2;
    if (redraw) {
      QUALITY.res = 1;
      ART.hi = !IS_XBOX && this.quality !== 'fast' && this.fx === 'full';
      ART.lite = this.quality === 'fast'; // fondo a media resolución y sin "soft-light" (art.js)
      ART.slow = 0; ART.win = []; ART.winMs = 0; ART.slowWins = 0;
      ART.store.clear();
      APP.previews = {};
      resize();
    }
    this.appliedQuality = this.quality;
    this.appliedFX = this.fx;
  },
  rows() {
    return [
      ['Calidad', this.quality === 'fast' ? 'Rápida' : this.quality === 'sharp' ? 'Nítida' : 'Automática'],
      ['Efectos', this.fx === 'low' ? 'Reducidos' : 'Completos'],
      ['Movimiento', this.motion === 'reduce' ? 'Reducido' : 'Del sistema'],
      ['Contraste', this.contrast ? 'Alto' : 'Normal'],
      ['Etiquetas', this.labels ? 'Visibles' : 'Ocultas'],
    ];
  },
  change(i, d) {
    if (i === 0) { const a = ['auto', 'fast', 'sharp']; this.quality = a[(a.indexOf(this.quality) + d + a.length) % a.length]; }
    if (i === 1) this.fx = this.fx === 'low' ? 'full' : 'low';
    if (i === 2) this.motion = this.motion === 'reduce' ? 'system' : 'reduce';
    if (i === 3) this.contrast = !this.contrast;
    if (i === 4) this.labels = !this.labels;
    this.save();
  },
};
Prefs.load();
APP.settingsSel = 0;
APP.settingsUpdate = function () {
  for (const dev of Devices.list) {
    const n = Devices.nav(dev);
    if (n.up) this.settingsSel = (this.settingsSel + 4) % 5;
    if (n.down) this.settingsSel = (this.settingsSel + 1) % 5;
    if (n.left || n.right || n.confirm) { Prefs.change(this.settingsSel, n.left ? -1 : 1); Audio8.sfx('menu'); }
    if (n.back || n.start) { Audio8.sfx('back'); return this.go('main'); }
  }
  for (let i = 0; i < 5; i++) if (clickIn(290, 170 + i * 78, 700, 66)) { this.settingsSel = i; Prefs.change(i, 1); }
  if (clickIn(40, 660, 170, 44)) this.go('main');
};
APP.settingsDraw = function () {
  drawMenuBG(7);
  sfText('Ajustes visuales', W / 2, 64, 48, PAPER);
  text('Puedes cambiarlos cuando quieras. Se guardan en este dispositivo.', W / 2, 114, 18, MUTED, { body: true });
  Prefs.rows().forEach(([label, val], i) => {
    const y = 170 + i * 78, on = this.settingsSel === i || hover(290, y, 700, 66);
    slab(290, y, 700, 66, { edge: on ? GOLD : undefined, lw: on ? 3 : 2 });
    sfText(label, 320, y + 33, 30, on ? GOLD : PAPER, { align: 'left' });
    sfText('‹  ' + val + '  ›', 805, y + 33, 26, TEAL);
  });
  const status = Prefs.saved === false ? 'No se pudo guardar: revisa el almacenamiento de Edge.' : '↑↓ elegir · ←→ cambiar · B volver';
  text(status, W / 2, 622, 16, Prefs.saved === false ? '#ff9f1c' : MUTED, { body: true });
  sfButton('‹ Volver', 40, 660, 170, 44, hover(40, 660, 170, 44));
};
