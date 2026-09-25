// Sonido: los efectos que faltaban existen y suenan; el audio se activa al soltar el dedo; aviso si no suena
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html')); await page.waitForTimeout(500);
  let pass = 0, fail = 0; const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  // como un navegador que todavía no recibe gesto (Chromium de pruebas deja sonar siempre: lo suspendemos a mano)
  const st0 = await page.evaluate(async () => { for (let i = 0; i < 5; i++) step(); Audio8.unlock(); await Audio8.ctx.suspend(); return Audio8.ctx.state; });
  ok('audio en espera de un gesto', st0 === 'suspended', st0);
  // el aviso sale en el menú mientras no suena
  const hint = await page.evaluate(() => { const orig = window.text, seen = []; window.text = function (s) { seen.push(String(s)); return orig.apply(this, arguments); }; render(); window.text = orig; return seen.some(s => /activar el sonido/.test(s)); });
  ok('el menú avisa cómo activar el sonido', hint);
  // un toque (soltar el dedo) sí lo activa
  await page.touchscreen.tap(640, 400); await page.waitForTimeout(300);
  const st1 = await page.evaluate(() => Audio8.ctx.state);
  ok('tocar la pantalla activa el sonido', st1 === 'running', st1);
  const hint2 = await page.evaluate(() => { const orig = window.text, seen = []; window.text = function (s) { seen.push(String(s)); return orig.apply(this, arguments); }; render(); window.text = orig; return seen.some(s => /activar el sonido/.test(s)); });
  ok('ya sonando, el aviso se va', !hint2);
  // los efectos del mariachi: antes no existían y no sonaban
  const made = await page.evaluate(() => {
    const out = {}, C = AudioContext.prototype, orig = C.createOscillator;
    let n = 0; C.createOscillator = function () { n++; return orig.apply(this, arguments); };
    for (const s of ['trumpet', 'violin', 'strum', 'voice']) { n = 0; Audio8.sfx(s); out[s] = n; }
    C.createOscillator = orig; return out;
  });
  ok('trompeta, violín, guitarra y voz suenan', Object.values(made).every(v => v > 0), JSON.stringify(made));
  // en "solo efectos" (sin música) siguen sonando: van por el canal de efectos
  const fxOnly = await page.evaluate(() => { Audio8.setSound('fx'); const C = AudioContext.prototype, o = C.createOscillator; let n = 0; C.createOscillator = function () { n++; return o.apply(this, arguments); }; Audio8.sfx('trumpet'); C.createOscillator = o; Audio8.setSound('all'); return n; });
  ok('con "solo efectos" también suenan', fxOnly > 0, fxOnly);
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
