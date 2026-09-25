// La pantalla de escenarios ya no congela el juego al entrar: cada vista previa, la primera vez que se
// dibuja, pinta y guarda sus capas (hasta medio segundo). Antes salían las 8 en el mismo cuadro (~2 s);
// ahora entra una por cuadro y la pantalla aparece de inmediato.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html'));
  await page.waitForTimeout(500);
  let pass = 0, fail = 0;
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const r = await page.evaluate(() => {
    for (let i = 0; i < 3; i++) step();
    APP.slots = [{ type: 'human', dev: 'kb1', cur: 0, ready: true, pick: 'nacho', edit: 0 }, { type: 'cpu', cur: 1, ready: true, pick: 'pablo', level: 5 }, { type: 'none' }, { type: 'none' }];
    APP.rules.mode = 'stock'; APP.go('stagesel');
    const shown = () => Object.values(APP.previews).filter(s => s.shown).length;
    step(); render(); const first = shown();
    for (let i = 0; i < STAGE_INFO.length + 2; i++) { step(); render(); }
    const all = shown();
    // en Fútbol el estadio lleva porterías: es otra vista previa, no la de Vidas
    APP.rules.mode = 'soccer'; for (let i = 0; i < 3; i++) { step(); render(); }
    const soccer = !!APP.previews['stadium:futbol'] && APP.previews['stadium:futbol'].shown;
    return { first, all, n: STAGE_INFO.length, soccer };
  });
  ok('el primer cuadro pinta a lo mucho una vista previa nueva', r.first <= 1, r.first);
  ok('a los pocos cuadros ya están todas', r.all === r.n, `${r.all}/${r.n}`);
  ok('el estadio de Fútbol tiene su propia vista previa (con porterías)', r.soccer);
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
