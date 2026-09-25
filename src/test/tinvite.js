// Invitar: en celular abre la hoja nativa para elegir la app; en PC/Mac copia el link y muestra la ventanita
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8773'], { cwd: process.cwd() + '/web', stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch();
  let pass = 0, fail = 0; const errs = [];
  const ok = (n, c, info) => { if (c) pass++; else fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${info !== undefined ? '  → ' + info : ''}`); };
  const setup = async (ctx, init) => {
    await ctx.addInitScript({ path: 'mocksupa.js' }); if (init) await ctx.addInitScript(init);
    await ctx.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.APYV_CONFIG = { client: window.__mockClient, ice: [] };' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept('Ana'));
    await p.goto('http://localhost:8773/index.html'); await p.waitForTimeout(500);
    // anfitrión con su sala abierta en la selección de personajes
    await p.evaluate(() => { for (let i = 0; i < 3; i++) step(); Net.ok = true; Net.role = 'host'; Net.code = 'K7QX'; APP.slots = [{ type: 'human', dev: 'kb1', cur: 0, ready: false, edit: 0 }, { type: 'none' }, { type: 'none' }, { type: 'none' }]; APP.go('charsel'); step(); render(); });
    return p;
  };
  const btn = p => p.evaluate(() => { const b = APP.inviteRect(), r = canvas.getBoundingClientRect(); return [r.left + (b.x + b.w / 2) / 1280 * r.width, r.top + (b.y + b.h / 2) / 720 * r.height]; });
  // ---- celular: hoja nativa de compartir
  const mctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const M = await setup(mctx, () => { navigator.share = d => { window.__shared = d; window.__sharedAct = navigator.userActivation ? navigator.userActivation.isActive : null; return Promise.resolve(); }; });
  const [mx, my] = await btn(M); await M.tap('canvas', { position: { x: mx - (await M.evaluate(() => canvas.getBoundingClientRect().left)), y: my } }); await M.waitForTimeout(300);
  const sh = await M.evaluate(() => ({ d: window.__shared || null, act: window.__sharedAct, box: !!document.getElementById('invite') }));
  ok('celular: tocar Invitar abre la hoja nativa para elegir la app', !!sh.d && /\?sala=K7QX$/.test(sh.d.url || '') && !sh.box, JSON.stringify(sh.d));
  ok('celular: se abre dentro del toque (el navegador lo permite)', sh.act !== false, String(sh.act));
  ok('celular: el texto no repite el link (va aparte)', sh.d && !String(sh.d.text).includes('http'), sh.d && sh.d.text);
  // si la persona cancela, no pasa nada; si falla, sale la ventanita
  await M.evaluate(() => { navigator.share = () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })); });
  await M.tap('canvas', { position: { x: mx - (await M.evaluate(() => canvas.getBoundingClientRect().left)), y: my } }); await M.waitForTimeout(300);
  ok('celular: si no se puede compartir, sale la ventanita con el link', await M.evaluate(() => !!document.getElementById('invite')));
  await M.screenshot({ path: 'shots/look/invite-mobile-fallback.png' });
  // ---- PC/Mac: copia y ventanita
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await dctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8773' });
  const D = await setup(dctx);
  const [dx, dy] = await btn(D); await D.mouse.click(dx, dy); await D.waitForTimeout(400);
  const clip = await D.evaluate(() => navigator.clipboard.readText().catch(e => 'ERR ' + e.message));
  ok('PC: el clic copia la invitación con el link', /\?sala=K7QX$/.test(clip), clip);
  const box = await D.evaluate(() => { const e = document.getElementById('invite'); return e && { url: e.querySelector('.inv-url').value, ok: e.querySelector('.inv-ok').textContent, wa: e.querySelector('[data-a=wa]').href }; });
  ok('PC: la ventanita muestra código, link y "Copiado"', !!box && /\?sala=K7QX$/.test(box.url) && /Copiado/.test(box.ok), JSON.stringify(box));
  ok('PC: botón de WhatsApp con el mensaje', !!box && box.wa.startsWith('https://wa.me/?text=') && decodeURIComponent(box.wa).includes('?sala=K7QX'));
  await D.screenshot({ path: 'shots/look/invite-desktop.png' });
  // detrás, el juego no reacciona a las teclas; Esc la cierra
  const scr0 = await D.evaluate(() => APP.screen);
  await D.keyboard.press('Enter'); await D.evaluate(() => { for (let i = 0; i < 3; i++) step(); });
  ok('con la ventanita abierta el juego no avanza', await D.evaluate(() => APP.screen) === scr0);
  await D.keyboard.press('Escape'); await D.waitForTimeout(100);
  ok('Esc la cierra', await D.evaluate(() => !document.getElementById('invite')));
  // la tecla I también invita
  await D.keyboard.press('KeyI'); await D.waitForTimeout(300);
  ok('la tecla I abre la invitación', await D.evaluate(() => !!document.getElementById('invite')));
  await D.click('#invite [data-a=close]');
  ok('Listo la cierra', await D.evaluate(() => !document.getElementById('invite')));
  ok('sin errores', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} OK, ${fail} FAIL`);
  await browser.close(); srv.kill(); process.exit(fail ? 1 : 0);
})();
