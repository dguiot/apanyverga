// Renderiza canciones sin tiempo real (OfflineAudioContext) y mide nivel, picos y cuadros por sección
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('file://' + process.cwd() + '/super-golpazo.html'); await page.waitForTimeout(500);
  const names = (process.env.SONGS || 'menu,son,huapango,ranchera').split(',');
  const out = await page.evaluate(async ({ names, wav, only }) => {
    const res = {};
    for (const name of names) {
      const comp = Audio8.compile(name);
      const secs = Math.min(40, comp.len * comp.sp + 1), sr = 22050;
      const off = new OfflineAudioContext(2, Math.ceil(secs * sr), sr);
      const A = Audio8; A.ctx = off; Object.defineProperty(A, 'ready', { get: () => true, configurable: true }); A._bus = null; A._ir = null; A._pw = null;
      A.master = off.createGain(); A.master.gain.value = 0.7; A.buildOut();
      A.sfxGain = off.createGain(); A.sfxGain.connect(A.master);
      A.musGain = off.createGain(); A.musGain.gain.value = A.MUS_GAIN; A.musGain.connect(A.master);
      const len = off.sampleRate; A.noiseBuf = off.createBuffer(1, len, off.sampleRate); const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.song = null; A.playSong(name, { force: true });
      const S = A.song;
      if (only) { const keep = only.split('+'); S.ev = S.ev.map(l => l.filter(e => keep.includes(e.v === 'drum' ? 'drum:' + e.k : e.v) || keep.includes(e.v))); } let when = 0.05;
      for (let i = 0; when < secs - 0.3; i = (i + 1) % S.len) { A.step = i; A.playStep(i, when, S.sp); when += S.sp; }
      const buf = await off.startRendering(), ch = buf.getChannelData(0);
      let peak = 0, sum = 0; for (let i = 0; i < ch.length; i++) { const v = Math.abs(ch[i]); if (v > peak) peak = v; sum += v * v; }
      const per = []; const bs = S.def.bar * S.sp;
      for (let b = 0; b * bs < secs - 0.5 && b < 16; b++) { let s2 = 0, n = 0; for (let i = Math.floor(b * bs * sr); i < Math.min(ch.length, (b + 1) * bs * sr); i++) { s2 += ch[i] * ch[i]; n++; } per.push(+(20 * Math.log10(Math.sqrt(s2 / n) + 1e-9)).toFixed(1)); }
      res[name] = { bad: comp.bad, bpm: Math.round(60 / (S.sp * 4)), dur: +secs.toFixed(1), rmsDb: +(20 * Math.log10(Math.sqrt(sum / ch.length))).toFixed(1), peak: +peak.toFixed(3), perBarDb: per.join(' ') };
      if (wav === name) {
        // WAV de 16 bits estéreo para escuchar
        const L0 = buf.getChannelData(0), R0 = buf.getChannelData(1), n = L0.length, bytes = new DataView(new ArrayBuffer(44 + n * 4));
        const w = (o, s) => { for (let i = 0; i < s.length; i++) bytes.setUint8(o + i, s.charCodeAt(i)); };
        w(0, 'RIFF'); bytes.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 2, true); bytes.setUint32(24, sr, true); bytes.setUint32(28, sr * 4, true); bytes.setUint16(32, 4, true); bytes.setUint16(34, 16, true); w(36, 'data'); bytes.setUint32(40, n * 4, true);
        const norm = 0.89 / Math.max(peak, 1e-3);
        for (let i = 0; i < n; i++) { bytes.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L0[i] * norm)) * 32767, true); bytes.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R0[i] * norm)) * 32767, true); }
        let bin = ''; const u8 = new Uint8Array(bytes.buffer); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        res[name].wav = btoa(bin);
      }
    }
    return res;
  }, { names, wav: process.env.WAV || '', only: process.env.ONLY || '' });
  for (const n in out) { if (out[n].wav) { fs.writeFileSync(`shots/${n}.wav`, Buffer.from(out[n].wav, 'base64')); delete out[n].wav; } console.log(n.padEnd(9), JSON.stringify(out[n])); }
  console.log('errors', errs.slice(0, 3));
  await browser.close();
})();
