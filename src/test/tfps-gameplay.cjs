// Ritmo y movimiento del FPS: escalar obstáculos, apariciones seguras, protección justa y fuego repartido.
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.addInitScript(()=>{requestAnimationFrame=()=>0;navigator.getGamepads=()=>[];});await p.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 const checks=await p.evaluate(()=>{
  const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details});FPSAudio.play=()=>{};
  const solo=()=>{const m=new FPSMatch([{id:'daniel',gun:2,bot:false},{id:'torito',gun:2,bot:false}]);const q=m.players[1];q.x=q.z=200;q.y=FPSWorld.height(200,200);return m;};
  // escalar: correr hacia el obstáculo y saltar
  // un obstáculo al aire libre (no dentro de un edificio) con espacio para tomar vuelo enfrente
  const outdoor=type=>FPSWorld.solids.find(s=>s.type===type&&Math.min(s.w,s.d)>.9&&!FPSWorld.decor.some(b=>b.type==='building'&&Math.abs(s.x-b.x)<b.w/2+2&&Math.abs(s.z-b.z)<b.d/2+2)&&FPSWorld.fits({x:s.x,y:FPSWorld.height(s.x,s.z+s.d/2+2.2)+.05,z:s.z+s.d/2+2.2},FPSBody.height)&&FPSWorld.fits({x:s.x,y:FPSWorld.height(s.x,s.z+s.d/2+1.2)+.05,z:s.z+s.d/2+1.2},FPSBody.height));
  const climb=(type,turn=0)=>{const m=solo(),a=m.player,box=outdoor(type);
   if(!box)return {missing:type};a.x=box.x;a.z=box.z+box.d/2+2.2;a.y=FPSWorld.height(a.x,a.z)+.02;a.yaw=0;a.pitch=0;a.vx=a.vz=a.vy=0;a.grounded=true;a.invuln=9;
   let mantled=false,done=false;for(let i=0;i<150;i++){m.move(a,{z:done?0:1,jump:i===14,lx:a.mantle?turn:0},1/60);if(a.mantle)mantled=true;else if(mantled)done=true;}
   return {mantled,onTop:Math.abs(a.y-(box.y+box.h))<.1&&a.grounded,top:box.y+box.h,y:a.y,yaw:a.yaw};};
  for(const type of ['crate','car','sandbag','container']){const r=climb(type);ok('jumping into a '+type+' climbs on top of it',r.mantled&&r.onTop,r);}
  {const m=solo(),a=m.player,above=q=>FPSWorld.solids.find(o=>o!==q&&o.type==='plaster'&&Math.abs(o.x-q.x)<.01&&Math.abs(o.z-q.z)<.01&&Math.abs(o.y-(q.y+q.h))<.05),
    wall=FPSWorld.solids.find(q=>q.type==='plaster'&&q.d<1&&q.w>3&&above(q)&&FPSWorld.fits({x:q.x,y:FPSWorld.height(q.x,q.z+1.6),z:q.z+1.6},FPSBody.height));
   a.x=wall.x;a.z=wall.z+wall.d/2+1.4;a.y=FPSWorld.height(a.x,a.z);a.yaw=0;a.grounded=true;a.invuln=9;let y=a.y,climbed=false;
   for(let i=0;i<120;i++){m.move(a,{z:1,jump:i===10},1/60);y=Math.max(y,a.y);if(a.mantle)climbed=true;}ok('a building wall (wall pieces stacked to the roof) cannot be climbed',!climbed&&y<wall.y+wall.h+.6,{peak:y-wall.y});}
  {const m=solo(),a=m.player;a.x=0;a.z=0;a.y=FPSWorld.height(0,0);let mantled=false;for(let i=0;i<90;i++){m.move(a,{z:1,jump:i===2},1/60);if(a.mantle)mantled=true;}ok('an ordinary jump in the open does not climb anything',!mantled&&a.grounded);}
  {const r=climb('car',.01);ok('the view can still turn while climbing',r.mantled&&Math.abs(r.yaw)>.05,r);}
  // apariciones: 16 puntos válidos, lejos y fuera de la vista
  const pts=FPSPacing.points();const free=s=>{const y=Math.max(FPSWorld.height(s.x,s.z),...FPSWorld.solids.filter(b=>b.type==='floor'&&Math.abs(s.x-b.x)<b.w/2&&Math.abs(s.z-b.z)<b.d/2).map(b=>b.y+b.h));return FPSWorld.fits({x:s.x,y:y+.02,z:s.z},FPSBody.height);};
  let gap=Infinity;for(const a of pts)for(const q of pts)if(a!==q)gap=Math.min(gap,Math.hypot(a.x-q.x,a.z-q.z));
  ok('sixteen spawn points spread over the map',pts.length===16&&pts.every(free)&&pts.every(s=>Math.abs(s.x+115)>=17)&&gap>=20,{n:pts.length,gap,bad:pts.filter(s=>!free(s))});
  {const m=new FPSMatch(['daniel','torito','chispa','michi'].map((id,i)=>({id,gun:2,bot:i>0})));const P=m.players;let min=Infinity,seen=0;
   for(const a of P)for(const q of P)if(a!==q){min=Math.min(min,Math.hypot(a.x-q.x,a.z-q.z));if(FPSPacing.sees(a,q.x,q.z))seen++;}
   ok('the match starts with everyone far apart and out of sight',min>40&&seen===0,{min,seen});ok('everyone starts with three seconds of protection',P.every(q=>q.invuln===3));}
  {const m=new FPSMatch(['daniel','torito','chispa','michi'].map((id,i)=>({id,gun:2,bot:i>0}))),me=m.player;for(let i=0;i<600;i++)m.update(m.players.map(()=>({})));
   me.health=0;me.dead=.01;m.update(m.players.map(()=>({})));const foes=m.players.filter(q=>q!==me&&!q.dead);
   ok('respawning picks a spot no rival can see',foes.every(q=>!FPSPacing.sees(q,me.x,me.z))&&Math.min(...foes.map(q=>Math.hypot(q.x-me.x,q.z-me.z)))>25,{d:Math.min(...foes.map(q=>Math.hypot(q.x-me.x,q.z-me.z)))});}
  // nadie muere apenas aparece (jugador quieto, tres CPU, las tres dificultades)
  {let early=0,deaths=0;for(const level of [0,1,2])for(const seed of [1,2]){const m=new FPSMatch(['daniel','torito','chispa','michi'].map((id,i)=>({id,gun:i?i%5:2,bot:i>0})),false,seed*97);m.level=level;const me=m.player;let alive=0;
    for(let i=0;i<60*60;i++){const was=me.dead;m.update(m.players.map(()=>({})));if(!was&&me.dead){deaths++;if(m.time-alive<6)early++;}if(was&&!me.dead)alive=m.time;}}
   ok('nobody is killed within six seconds of appearing',early===0,{early,deaths});}
  // protección justa
  {const m=solo(),a=m.player;a.invuln=3;a.cool=0;m.fire(a);ok('shooting ends your own spawn protection',a.invuln===0);}
  {const m=new FPSMatch(['daniel','torito'].map((id,i)=>({id,gun:2,bot:i>0}))),me=m.player,bot=m.players[1];me.x=0;me.z=0;me.y=FPSWorld.height(0,0);bot.x=0;bot.z=-14;bot.y=FPSWorld.height(0,-14);me.invuln=3;bot.invuln=0;
   let shots=0;for(let i=0;i<100;i++){const s=bot.shot;m.update([{},{}]);if(bot.shot>s)shots++;}ok('bots do not waste bullets on a protected player',shots===0,{shots});
   me.invuln=0;for(let i=0;i<120;i++){const s=bot.shot;m.update([{},{}]);if(bot.shot>s)shots++;}ok('bots engage once the protection is gone',shots>0,{shots});}
  // fuego repartido
  {const m=new FPSMatch(['daniel','torito','chispa','michi'].map((id,i)=>({id,gun:2,bot:i>0})));const [me,a,b2,c]=m.players;
   me.x=0;me.z=0;a.x=-12;a.z=-20;b2.x=12;b2.z=-20;c.x=0;c.z=-24;const r=m.players.map(q=>{q.y=FPSWorld.height(q.x,q.z);q.invuln=0;return q;});for(let i=0;i<40;i++)m.update(m.players.map(()=>({})));
   const on=m.players.slice(1).filter(q=>q.ai?.target===0).length;ok('three bots do not all gang up on the same player',on<=2,{on,targets:m.players.slice(1).map(q=>q.ai?.target)});}
  return out;
 });
 for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.details?' '+JSON.stringify(c.details):''));console.log((errors.length?'FAIL ':'PASS ')+'no browser errors '+JSON.stringify(errors.slice(0,3)));
 console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length+!errors.length,total:checks.length+1}));if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
