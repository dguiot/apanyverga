// Browser integration + deterministic fixed-step racing checks.
// NODE_PATH may point at Playwright. CHROME_PATH optionally selects a local browser.
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
    page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.APYV_CONFIG={};'}));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
    await page.keyboard.press('Enter');await page.waitForTimeout(100);
    const key=async(code)=>{await page.keyboard.down(code);await page.waitForTimeout(65);await page.keyboard.up(code);await page.waitForTimeout(90);}; const checks=[];const ok=(name,pass,details)=>{checks.push({name,pass:!!pass,details});console.log((pass?'PASS ':'FAIL ')+name+(details?' '+JSON.stringify(details):''));};
    ok('entry opens mode hub',await page.evaluate(()=>APP.screen==='main'&&APP.mainOptions().length===10));
    await key('ArrowRight');await page.waitForTimeout(90);await key('Enter');await page.waitForTimeout(80);
    ok('keyboard enters garage',await page.evaluate(()=>APP.screen==='kartGarage'));
    await key('ArrowRight');await page.waitForTimeout(90);await key('Enter');await page.waitForTimeout(80);
    ok('all original characters selectable',await page.evaluate(()=>APP.screen==='kartTracks'&&CHAR_ORDER.length===15&&CHAR_ORDER[KartMenu.char]==='daniel'));
    await key('Enter');await page.waitForTimeout(80);
    ok('race starts with eight drivers',await page.evaluate(()=>APP.screen==='kartRace'&&APP.kartRace.racers.length===8));
    await key('Escape');await page.waitForTimeout(60);
    ok('Escape pauses',await page.evaluate(()=>APP.kartRace.paused));
    const frozen=await page.evaluate(()=>APP.kartRace.time);await page.waitForTimeout(150);ok('pause freezes clock',await page.evaluate(t=>APP.kartRace.time===t,frozen));
    await key('Escape');await page.waitForTimeout(60);ok('Escape resumes',await page.evaluate(()=>!APP.kartRace.paused));
    const unit=await page.evaluate(()=>{
      const out=[];const check=(name,pass,details)=>out.push({name,pass:!!pass,details});
      const fresh=(i=0,cc=1)=>{const r=new KartRace(KART_TRACKS[i],'daniel',cc,false,12345);r.phase='race';return r;};
      for(const info of KART_TRACKS){const C=new KartCourse(info),a=C.sample(0),b=C.sample(C.length);check('closed course '+info.id,Math.hypot(a.x-b.x,a.z-b.z)<.001&&C.length>4000&&C.samples.every(p=>Number.isFinite(p.curve)&&p.width>=9),{km:C.length/1000,maxCurve:Math.max(...C.samples.map(p=>Math.abs(p.curve)))});}
      let R=fresh(),p=R.player;R.racers=[p];p.s=30;p.x=0;
      for(let i=0;i<90;i++)R.update({gas:true,steer:0});check('acceleration responds',p.v>35);
      const v=p.v;for(let i=0;i<40;i++)R.update({brake:true,steer:0});check('brake responds',p.v<v*.25);
      p.v=80;const x=p.x;for(let i=0;i<8;i++)R.update({gas:true,steer:1});check('steering starts within 133 ms',p.x>x+.04);
      R=fresh();p=R.player;R.racers=[p];p.s=30;p.x=0;p.v=80;
      for(let i=0;i<70;i++){p.x=0;R.update({gas:true,steer:.5,drift:true});}R.update({gas:true,steer:.5});check('charged drift gives mini turbo',p.turbo>.5);
      R=fresh();p=R.player;R.racers=[p];const box=R.course.boxes[0];p.s=box.s-3;p.x=box.x;p.v=120;R.update({gas:true});R.update({gas:true});check('swept item pickup',p.roulette>0&&box.ready>R.time);
      for(let i=0;i<50;i++)R.update({});check('roulette awards item',!!KART_ITEMS[p.item]);
      R=fresh();p=R.player;const target=R.racers[1];R.racers=[p,target];p.s=30;p.x=0;target.s=51;target.x=0;target.v=0;target.shield=7;p.item='chile';R.useItem(p);
      for(let i=0;i<10;i++)R.updateProjectiles(1/60);check('homing projectile consumes shield',target.shield===0&&target.stun===0);
      target.invuln=0;p.item='tortilla';R.useItem(p);for(let i=0;i<12;i++)R.updateProjectiles(1/60);check('projectile spins an unshielded rival',target.stun>0);
      p.item='salsa';R.useItem(p);check('salsa drops behind',R.projectiles.some(q=>q.type==='salsa'&&q.s<p.s&&q.v===0));
      p.item='turbo';R.useItem(p);check('turbo consumable',p.turbo>2&&p.item===null);
      p.item='shield';R.useItem(p);check('defensive item',p.shield===7);
      p.item='pinata';R.useItem(p,true);check('backward throw',R.projectiles.some(q=>q.type==='pinata'&&q.v<0));
      const bounce={type:'tortilla',owner:0,s:400,ps:400,x:.93,v:150,vx:1,life:5,age:0};R.projectiles=[bounce];R.updateProjectiles(.1);check('disc bounces off road edge',bounce.vx<0&&bounce.x<=.94);
      R=fresh();p=R.player;R.racers=[p];p.s=R.course.length-1;p.nextCheckpoint=1;p.v=120;R.update({gas:true});check('skipping checkpoints cannot finish',p.completedLaps===0);
      R=fresh();p=R.player;p.x=1.5;R.rescue(p);for(let i=0;i<80;i++)R.update({});check('rescue restores control at center',p.rescue<=0&&Math.abs(p.x)<.03&&p.invuln>0);
      const run=()=>{const r=fresh();for(let i=0;i<1200;i++)r.update({gas:true,steer:Math.sin(i*.02)*.3,itemPressed:i%100===0});return JSON.stringify(r.racers.map(q=>[q.s,q.x,q.v,q.item]));};check('seeded simulation is deterministic',run()===run());
      return out;
    });for(const q of unit)ok(q.name,q.pass,q.details);
    const races=await page.evaluate(()=>{
      Audio8.sfx=()=>{};Audio8.playSong=()=>{};Rumble.play=()=>{};
      const out=[];
      for(let i=0;i<3;i++)for(let cc=0;cc<3;cc++){
        const R=new KartRace(KART_TRACKS[i],'daniel',cc,false,4444);R.phase='race';R.player.human=false;let off=0,rescues=0;
        for(let step=0;step<60*650&&R.racers.some(r=>r.finish===null);step++){
          const was=R.racers.map(r=>r.rescue);R.update(R.ai(R.player));
          R.racers.forEach((r,i)=>{if(r.rescue>was[i])rescues++;if(Math.abs(r.x)>1.1)off++;if(!Number.isFinite(r.s+r.x+r.v))throw Error('nonfinite physics');});
        }
        out.push({track:i,cc,finished:R.racers.filter(r=>r.finish!==null).length,time:R.time,rescues,off,playerLaps:R.player.lapTimes,range:[Math.min(...R.racers.map(r=>r.s)),Math.max(...R.racers.map(r=>r.s))]});
      }return out;
    });
    for(const q of races)ok('all CPU complete track '+q.track+' / '+KART_CLASSES_NAME(q.cc),q.finished===8&&q.playerLaps.length===3,q);
    // Confirm the independent fighting path still starts, updates and draws.
    const battle=await page.evaluate(()=>{APP.kartRace.stop();APP.startBattle({players:[{port:0,char:'daniel',dev:'kb1'},{port:1,char:'torito',cpu:3}],stage:'temple',rules:{mode:'stock',stocks:3,items:0}});for(let i=0;i<120;i++)APP.battle.update();APP.battle.draw();return APP.screen==='battle'&&APP.battle.fighters.length===2;});ok('fighting regression',battle);
    ok('no browser errors',errors.length===0,errors);
    console.log(JSON.stringify({passed:checks.filter(q=>q.pass).length,total:checks.length}));
    if(checks.some(q=>!q.pass))process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
function KART_CLASSES_NAME(i){return ['100 cc','150 cc','200 cc'][i];}



