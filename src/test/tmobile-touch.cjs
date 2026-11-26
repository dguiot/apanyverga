// Celular de punta a punta, con toques reales (CDP): se entra por la portada tocando la pantalla, como una
// persona, y en cada juego se comprueba que el personaje responde. Antes, en Esmash el jugador quedaba
// asignado al teclado (la palanca se dibujaba pero no movía a nadie) y el FPS no tenía controles táctiles.
const {chromium,devices}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const checks=[],ok=(name,pass,details)=>{checks.push({name,pass:!!pass,details});console.log((pass?'PASS ':'FAIL ')+name+(details!==undefined?' '+JSON.stringify(details):''));};
 const errors=[];
 try{
 const play=async game=>{
  const ctx=await b.newContext({...devices['iPhone 13'],viewport:{width:844,height:390},isMobile:true,hasTouch:true}),p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(game+': '+e.message));p.on('console',m=>{if(m.type()==='error')errors.push(game+': '+m.text());});
  await p.addInitScript(()=>{window.requestAnimationFrame=()=>0;try{localStorage.setItem('esmash-fps-cam','third');}catch(e){}});
  await p.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.APYV_CONFIG={};'}));
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);await p.waitForTimeout(300);
  const cdp=await ctx.newCDPSession(p),steps=n=>p.evaluate(n=>{for(let i=0;i<n;i++)step();render();},n);
  const scr=(x,y)=>p.evaluate(([x,y])=>{const r=canvas.getBoundingClientRect();return [r.left+x/W*r.width,r.top+y/H*r.height];},[x,y]);
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id}))});
  const tap=async(x,y)=>{const [sx,sy]=await scr(x,y);await touch('touchStart',[[sx,sy,1]]);await steps(2);await touch('touchEnd',[]);await steps(4);};
  const button=a=>p.evaluate(a=>{const q=TouchPad.L.btns.find(b=>b.a===a&&!b.left);return q&&[q.x,q.y];},a);
  await steps(3);await tap(475,610); // «Juego local»
  const card=(await p.evaluate(()=>ShellUI.cards()))[{fight:0,kart:1,fps:2}[game]];await tap(card.x+card.w/2,card.y+card.h/2);
  for(let i=0;i<3;i++)await tap(1025,656); // Ajustes → Personajes → Escenario → ¡Jugar!
  await steps(game==='fight'?420:game==='kart'?330:40);
  return {p,ctx,steps,touch,tap,button};
 };
 // ---------- Esmash ----------
 {const {p,ctx,steps,touch}=await play('fight');
  const info=await p.evaluate(()=>({screen:APP.screen,dev:APP.battle?.fighters[0].dev,shown:TouchPad.shown(),phase:APP.battle?.phase}));
  ok('a tapped-through fight starts with the touch controls shown',info.screen==='battle'&&info.shown&&info.phase==='fight',info);
  ok('the touch player is not left on the keyboard',info.dev!=='kb1',info);
  const x0=await p.evaluate(()=>APP.battle.fighters[0].x);
  await touch('touchStart',[[150,280,7]]);await steps(2);for(let i=1;i<=6;i++){await touch('touchMove',[[150+i*12,280,7]]);await steps(1);}
  await steps(50);const x1=await p.evaluate(()=>APP.battle.fighters[0].x);await touch('touchEnd',[]);await steps(4);
  ok('the left thumb stick walks the fighter',x1-x0>60,{x0,x1});
  const A=await p.evaluate(()=>{const q=TouchPad.L.btns.find(b=>b.a==='attack');return [q.x,q.y];});
  await touch('touchStart',[[A[0],A[1],3]]);await steps(3);const atk=await p.evaluate(()=>!!APP.battle.fighters[0].move);await touch('touchEnd',[]);await steps(30);
  ok('the A button attacks',atk);
  ok('the desktop pause button is hidden behind the thumbs',await p.evaluate(()=>{const c=Pointer.clicked;return TouchPad.active;}));
  await ctx.close();}
 // ---------- FPS ----------
 {const {p,ctx,steps,touch,button}=await play('fps');
  const info=await p.evaluate(()=>({screen:APP.screen,shown:TouchPad.shown(),fps:TouchPad.L.fps,btns:TouchPad.L.btns.map(b=>b.a)}));
  ok('the FPS shows its own touch controls',info.screen==='fpsGame'&&info.shown&&info.fps&&['fire','aim','jump','crouch','reload','swap','grenade','interact'].every(a=>info.btns.includes(a)),info);
  await p.evaluate(()=>{const m=APP.fps;m.players.forEach((q,i)=>{if(i){q.x=180;q.z=180+i*4;q.y=FPSWorld.height(q.x,q.z);q.bot=true;q.ai=null;}});const me=m.player;me.x=0;me.z=6;me.y=FPSWorld.height(0,6);me.yaw=0;me.pitch=0;me.invuln=9;});
  const pos=()=>p.evaluate(()=>{const q=APP.fps.player;return {x:q.x,z:q.z,yaw:q.yaw,pitch:q.pitch,shot:q.shot,ads:q.ads,stance:q.stance,vy:q.vy,ammo:q.ammo[q.gun],gun:q.gun,sprint:q.sprint};});
  let a=await pos();await touch('touchStart',[[150,300,7]]);await steps(2);for(let i=1;i<=5;i++){await touch('touchMove',[[150,300-i*14,7]]);await steps(1);}await steps(40);let c=await pos();
  ok('the left stick walks forward',a.z-c.z>2,{from:a.z,to:c.z});
  for(let i=1;i<=4;i++){await touch('touchMove',[[150,300-70-i*10,7]]);await steps(1);}await steps(20);c=await pos();
  ok('pushing the stick to the top sprints on its own',c.sprint,{sprint:c.sprint});
  await touch('touchEnd',[]);await steps(4);
  a=await pos();await touch('touchStart',[[560,190,8]]);await steps(1);for(let i=1;i<=8;i++){await touch('touchMove',[[560+i*15,190+i*3,8]]);await steps(1);}await touch('touchEnd',[]);await steps(2);c=await pos();
  ok('dragging on the right half turns the view',c.yaw-a.yaw>.25&&c.pitch>a.pitch,{yaw:c.yaw-a.yaw,pitch:c.pitch-a.pitch});
  const F=await button('fire');a=await pos();await touch('touchStart',[[F[0],F[1],9]]);await steps(3);for(let i=1;i<=4;i++){await touch('touchMove',[[F[0]-i*10,F[1],9]]);await steps(1);}await steps(10);c=await pos();await touch('touchEnd',[]);await steps(30);
  ok('holding FIRE shoots and dragging it also aims',c.shot>a.shot&&c.ammo<a.ammo&&c.yaw<a.yaw,{shots:c.shot-a.shot,yaw:c.yaw-a.yaw});
  const tapB=async(id,act)=>{const q=await button(act);await touch('touchStart',[[q[0],q[1],id]]);await steps(2);await touch('touchEnd',[]);await steps(2);};
  await tapB(10,'aim');await steps(25);c=await pos();ok('MIRA stays on after a tap',c.ads>.8,{ads:c.ads});await tapB(10,'aim');await steps(25);c=await pos();ok('a second tap on MIRA lowers the sights',c.ads<.2,{ads:c.ads});
  await tapB(11,'jump');c=await pos();ok('SALTAR jumps',c.vy>2,{vy:c.vy});await steps(60);
  await tapB(12,'crouch');await steps(30);c=await pos();ok('AGACHAR toggles crouching',c.stance>.8,{stance:c.stance});await tapB(12,'crouch');await steps(30);
  a=await pos();await tapB(13,'swap');await steps(5);c=await pos();ok('ARMA switches weapon',c.gun!==a.gun,{from:a.gun,to:c.gun});
  await p.evaluate(()=>{const q=APP.fps.player;q.ammo[q.gun]=1;});await tapB(14,'reload');await steps(3);ok('RECARGAR reloads',await p.evaluate(()=>APP.fps.player.reloading>0));
  // asistencia de mira: un rival casi en la mira frena el giro
  const assist=await p.evaluate(()=>{const m=APP.fps,me=m.player,e=m.players[1];me.reloading=0;me.yaw=0;me.pitch=0;e.x=me.x+.5;e.z=me.z-15;e.y=FPSWorld.height(e.x,e.z);e.dead=0;e.invuln=0;
   const with_=FPSAimAssist.apply(me,{x:0,z:0,lx:.02,ly:0,fire:true},1);e.x=me.x+40;const without=FPSAimAssist.apply(me,{x:0,z:0,lx:.02,ly:0,fire:true},1);return {with:with_.lx,without:without.lx};});
  ok('touch aim assist slows and nudges the view onto a visible rival',assist.with<assist.without&&assist.without===.02,assist);
  const pause=await p.evaluate(()=>{const P=TouchPad.L.pause;return [P.x,P.y];});await touch('touchStart',[[pause[0],pause[1],15]]);await steps(2);await touch('touchEnd',[]);await steps(3);
  ok('the ⏸ button pauses the FPS',await p.evaluate(()=>ShellUI.paused||APP.fps.paused));
  await ctx.close();}
 // ---------- Kart ----------
 {const {p,ctx,steps,touch,button}=await play('kart');
  const info=await p.evaluate(()=>({screen:APP.screen,shown:TouchPad.shown(),phase:APP.kartRace?.phase,labels:TouchPad.L.btns.map(b=>b.label)}));
  ok('the race shows thumb-friendly driving buttons (it accelerates on its own)',info.screen==='kartRace'&&info.shown&&['DERRAPE','FRENO','ÍTEM','ATRÁS'].every(l=>info.labels.includes(l))&&!info.labels.includes('GAS'),info);
  const s0=await p.evaluate(()=>APP.kartRace.player.s);await steps(120);let r=await p.evaluate(()=>({s:APP.kartRace.player.s,v:APP.kartRace.player.v}));
  ok('the kart accelerates without holding any button',r.s-s0>15&&r.v>20,{gained:r.s-s0,v:r.v});
  const B=await button('special');await touch('touchStart',[[B[0],B[1],4]]);await steps(60);const braked=await p.evaluate(()=>APP.kartRace.player.v);await touch('touchEnd',[]);await steps(2);
  ok('FRENO slows the kart down',braked<r.v*.7,{before:r.v,after:braked});
  await steps(30);await p.evaluate(()=>{const r=APP.kartRace.player;r.x=0;r.yaw=0;r.v=70;});const D=await button('attack');
  // como en las carreras de karts: se gira y se mantiene el derrape
  await touch('touchStart',[[150,300,5]]);await steps(1);for(let i=1;i<=3;i++){await touch('touchMove',[[150+i*12,300,5]]);await steps(1);}
  await touch('touchStart',[[150+36,300,5],[D[0],D[1],4]]);await steps(30);
  const drift=await p.evaluate(()=>{const r=APP.kartRace.player;return {drift:r.drift,charge:+r.charge.toFixed(2),v:+r.v.toFixed(1),x:+r.x.toFixed(2),steer:+r.steer.toFixed(2)};});await touch('touchEnd',[]);await steps(3);
  ok('the big button drifts while the stick steers',drift.drift&&drift.charge>0,drift);
  // en la cuenta regresiva el botón grande es GAS (salida turbo)
  await p.evaluate(()=>{const R=APP.kartRace;R.phase='grid';R.countdown=3.5;R.player.launch=0;TouchPad.draw();});
  ok('during the countdown the big button is GAS for the turbo start',await p.evaluate(()=>TouchPad.L.btns.find(b=>b.a==='attack').label==='GAS'));
  await ctx.close();}
 }catch(e){errors.push(e.stack);}
 console.log((errors.length?'FAIL ':'PASS ')+'no browser errors '+JSON.stringify(errors.slice(0,4)));
 console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length+!errors.length,total:checks.length+1}));if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
 await b.close();})();
