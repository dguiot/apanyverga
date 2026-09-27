// Movilidad: gracia al salir del piso, botones en la orilla y tech rodando.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; navigator.getGamepads = () => []; });
  await page.goto('file://' + process.cwd() + '/' + (process.env.PAGE || 'index.html'));
  await page.waitForTimeout(300);
  const cases = await page.evaluate(() => {
    const cases = [], check = (name, pass, value) => cases.push({ name, pass, value });
    const fixture = (id = 'nacho') => {
      APP.startBattle({players: [{port: 0, char: id, dev: 'kb1'}, {port: 1, char: 'pablo', cpu: 1}], stage: 'temple', rules: {mode: 'stock', stocks: 99, items: 0, time: 99}});
      BATTLE.phase = 'fight';
      const [f, o] = BATTLE.fighters;
      f.ctrl = new Controller('q1'); o.brain = null; o.ctrl = new Controller('q2');
      f.invuln = 0; f.ledgeCd = 99; o.x = -300;
      return f;
    };
    const tick = (f, input = {}) => { f.ctrl.update(Object.assign(blankState(), input)); step(); };
    const edge = () => {
      const f = fixture(), s = BATTLE.stage.solids[0];
      f.x = s.x + s.w - 1; f.y = s.y; f.grounded = true; f.surface = s;
      f.setState('run'); f.face = 1; f.vx = f.ch.run;
      tick(f, {x: 1});
      return f;
    };
    const launch = full => {
      const f = fixture(), s = BATTLE.stage.solids[0];
      f.x = 0; f.y = s.y; f.grounded = true; f.surface = s;
      f.setState('jumpsquat'); f.sf = 3; f.jumpFromTap = false;
      tick(f, {jump: full}); return f.vy;
    };
    const fullVy = launch(true), shortVy = launch(false);
    let f = edge(); tick(f, {x: 1}); const jumps = f.jumps;
    tick(f, {x: 1, jump: true});
    check('salto a los 2 cuadros conserva el doble salto y despega como en piso', f.jumps === jumps && Math.abs(f.vy - fullVy) < 1e-8, {jumps: f.jumps, expectedJumps: jumps, vy: f.vy, fullVy});
    f = edge(); for (let i = 0; i < 6; i++) tick(f, {x: 1}); const lateJumps = f.jumps;
    tick(f, {x: 1, jump: true});
    check('a los 7 cuadros vuelve a gastar el doble salto', f.jumps === lateJumps - 1, f.jumps);
    f = edge(); for (let i = 0; i < 4; i++) tick(f, {x: 1}); const lastJumps = f.jumps;
    tick(f, {x: 1, jump: true});
    check('el quinto cuadro todavía permite saltar como en piso', f.jumps === lastJumps && Math.abs(f.vy - fullVy) < 1e-8, f.jumps);
    f = edge(); f.ctrl.buffer.jump = 0; tick(f, {x: 1});
    check('un salto en búfer ya soltado sale corto', Math.abs(f.vy - shortVy) < 1e-8 && f.jumps === f.ch.jumps - 1, {vy: f.vy, shortVy});
    f = fixture(); const plat = BATTLE.stage.plats[0];
    f.x = plat.x + plat.w / 2; f.y = plat.y; f.grounded = true; f.surface = plat; f.setState('idle');
    f.dropThrough(); tick(f); const dropJumps = f.jumps; tick(f, {jump: true});
    check('bajar de una plataforma no concede salto de piso', f.jumps === dropJumps - 1 && !f.coyoteT, f.jumps);
    f = edge(); f.startMove('nair'); f.setState('air'); const attackJumps = f.jumps; tick(f, {jump: true});
    check('un ataque aéreo cancela la gracia', f.jumps === attackJumps - 1 && !f.coyoteT, f.jumps);
    f = edge(); f.setState('airdodge'); f.dodge = {}; f.setState('air'); const dodgeJumps = f.jumps; tick(f, {jump: true});
    check('un esquive cancela la gracia', f.jumps === dodgeJumps - 1 && !f.coyoteT, f.jumps);
    const hang = (button, at) => {
      const f = fixture(); f.ledgeCd = 0; f.grabLedge(BATTLE.stage.ledges()[1]);
      // sf=0 es el cuadro en que se agarra. El controlador cuenta el mismo cuadro.
      for (let i = 0; i <= 8; i++) {
        f.ctrl.update(Object.assign(blankState(), i === at ? {[button]: true} : {}));
        if (i === 0) f.ledgeState(); else step();
      }
      return {state: f.state, sf: f.sf, vy: f.vy, key: f.pendingMove, roll: f.pendingRoll, buffer: f.ctrl.buffer[button]};
    };
    for (const at of [0, 3]) {
      const h = hang('jump', at);
      check('salto apretado en cuadro ' + at + ' sale al acabar la espera', h.state === 'air' && h.vy < 0 && h.buffer === 99, h);
    }
    const atk = hang('attack', 5), special = hang('special', 5), shield = hang('shield', 5), none = hang('jump', -1);
    check('ataque en cuadro 5 sube con ataque de orilla', atk.state === 'climb' && atk.key === 'ledgeAtk' && atk.buffer === 99, atk);
    check('especial en cuadro 5 sube con ataque de orilla', special.state === 'climb' && special.key === 'ledgeAtk' && special.buffer === 99, special);
    check('escudo en cuadro 5 se conserva hasta subir rodando', shield.state === 'climb' && shield.roll && shield.buffer === 99, shield);
    check('sin botones sigue colgado', none.state === 'ledge', none);
    const tech = (x, id = 'nacho') => {
      const f = fixture(id), s = BATTLE.stage.solids[0];
      f.x = 0; f.y = s.y - 1; f.vy = 5; f.lx = 3; f.ly = 0;
      f.setState('hitstun'); f.hitstun = 30; f.tumble = true;
      tick(f, {shield: id !== 'michi', x});
      const landed = {state: f.state, invuln: f.invuln, dir: f.dodge && f.dodge.dir, x: f.x};
      tick(f); landed.moved = f.x - landed.x; return landed;
    };
    for (const x of [-1, 1]) { const t = tech(x); check('tech rodando hacia ' + (x > 0 ? 'derecha' : 'izquierda'), t.state === 'dodge' && t.dir === x && t.moved * x > 0 && t.invuln >= 20, t); }
    const neutral = tech(0), auto = tech(1, 'michi');
    check('tech sin palanca queda de pie', neutral.state === 'idle' && neutral.invuln >= 20, neutral);
    check('autoTech sigue en el lugar', auto.state === 'idle' && auto.invuln >= 20, auto);
    const cpu = fixture(), foe = BATTLE.fighters[1], floor = BATTLE.stage.solids[0];
    cpu.x = 0; cpu.y = floor.y; cpu.grounded = true; cpu.surface = floor; cpu.face = 1; cpu.setState('idle');
    foe.x = 30; foe.y = floor.y; foe.grounded = true; foe.invuln = 20; foe.setState('attack');
    foe.move = {key: 'jab1', def: {hits: []}, f: 0};
    cpu.brain = new AIBrain(9); cpu.brain.f = cpu; cpu.ctrl = cpu.brain.ctrl; cpu.brain.shieldT = 10;
    const oldRandom = Math.random; Math.random = () => 0;
    try { cpu.brain.tick(); } finally { Math.random = oldRandom; }
    check('la CPU no insiste en agarrar un tech invulnerable', !cpu.ctrl.cur.grab, cpu.ctrl.cur);
    return cases;
  });
  for (const c of cases) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.name} → ${JSON.stringify(c.value)}`);
  const fail = cases.filter(c => !c.pass).length + errors.length;
  console.log(`${cases.length - cases.filter(c => !c.pass).length} OK, ${fail} FAIL`, errors);
  await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
