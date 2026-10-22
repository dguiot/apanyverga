// CPU with perception, the slide, post-processing gates and combat feedback.
// Each check runs against the real simulation or the real draw path.
const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const p=await b.newPage({viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.addInitScript(()=>{requestAnimationFrame=()=>0;navigator.getGamepads=()=>[];});await p.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 const checks=await p.evaluate(()=>{
  const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details});FPSAudio.play=()=>{};
  // A bot that spawns inside a building leaves through a door instead of pressing into the wall nearest its target.
  const house=FPSWorld.decor.find(b=>b.type==='building'),inside=q=>Math.abs(q.x-house.x)<house.w/2&&Math.abs(q.z-house.z)<house.d/2;
  let m=new FPSMatch([{id:'daniel',gun:2,bot:true},{id:'torito',gun:2,bot:true}]),[a,q]=m.players;
  Object.assign(a,{x:house.x-house.w/4,z:house.z,y:house.y,invuln:0});Object.assign(q,{x:house.x+house.w/2+30,z:house.z+house.d/2+25,invuln:999,ammo:[0,0,0,0,0],reserve:[0,0,0,0,0],grenades:0});q.y=FPSWorld.height(q.x,q.z);
  for(let i=0;i<60*12&&inside(a);i++){m.update([]);q.x=house.x+house.w/2+30;q.z=house.z+house.d/2+25;q.vx=q.vz=0;}
  ok('a bot inside a building finds the door within twelve seconds',!inside(a)&&a.deaths===0,{x:a.x,z:a.z,time:m.time});
  // Seeing a target is not firing at it: reaction time first, then an aim error that settles.
  m=new FPSMatch([{id:'daniel',gun:2,bot:true},{id:'torito',gun:2,bot:true}]);[a,q]=m.players;
  Object.assign(a,{x:0,z:0,y:50,yaw:0,pitch:0});Object.assign(q,{x:0,z:-20,y:50,vx:0,vz:0});let first=-1;
  for(let i=0;i<120;i++){const I=m.inputAI(a);if(I.fire&&first<0)first=m.time;a.yaw+=(I.lx||0)*m.lookScale(a);m.time+=1/60;}
  ok('bots react before their first shot instead of firing on the first frame',first>=.3&&first<1.2,{first});
  const aimErrors=[0,1,2,3].map(i=>{const mm=new FPSMatch([{id:'daniel',gun:2,bot:true},{id:'torito',gun:2,bot:true}].map((r,k)=>({...r,id:CHAR_ORDER[(i+k)%15]})));mm.time=i*.7;const [x]=mm.players;Object.assign(x,{x:0,z:0,y:50,yaw:0});Object.assign(mm.players[1],{x:0,z:-20,y:50});mm.inputAI(x);return Math.abs(x.ai.err);});
  ok('initial bot aim carries a bounded error that differs between bots',aimErrors.every(e=>e<.12)&&new Set(aimErrors.map(e=>e.toFixed(4))).size>1,{aimErrors});
  // Every bot in a free-for-all gets into the fight (the old AI left one walled in for the whole match).
  m=new FPSMatch(CHAR_ORDER.slice(0,4).map((id,i)=>({id,gun:i,bot:true})),false,1077);for(let i=0;i<60*30;i++)m.update([]);
  ok('all four bots fire within thirty seconds',m.players.every(q=>q.shot>0),{shots:m.players.map(q=>q.shot)});
  // Slide: crouching out of a sprint launches the player low and fast, then hands back to crouch speed.
  m=new FPSMatch([{id:'daniel',gun:0,bot:false},{id:'torito',gun:2,bot:true}]);a=m.player;m.players[1].dead=999;Object.assign(a,{x:0,z:0,yaw:0,y:FPSWorld.height(0,0),grounded:true});
  for(let i=0;i<40;i++)m.move(a,{z:1,sprint:true},1/60);const run=Math.hypot(a.vx,a.vz);m.move(a,{z:1,crouch:true},1/60);const burst=Math.hypot(a.vx,a.vz);
  for(let i=0;i<60;i++)m.move(a,{z:1,crouch:true},1/60);const after=Math.hypot(a.vx,a.vz);
  ok('crouching out of a sprint slides faster than running, then settles at crouch speed',run>9&&burst>run&&after<=2.81&&a.stance===1&&!a.slide,{run,burst,after});
  m=new FPSMatch([{id:'daniel',gun:0,bot:false}]);a=m.player;Object.assign(a,{x:0,z:0,yaw:0,y:FPSWorld.height(0,0),grounded:true});for(let i=0;i<12;i++)m.move(a,{z:1,crouch:true},1/60);
  ok('crouch-walking never starts a slide',!(a.slide>0)&&Math.hypot(a.vx,a.vz)<=2.81);
  // Post-processing only for one local view, and only with the full-quality budget.
  const hi=ART.hi;ART.hi=true;ART.lite=false;ok('post-processing is offered to a single full-quality view',FPSPost.enabled(1)===!!KartGL.EffectComposer&&!FPSPost.enabled(2));ART.hi=false;ok('the frame governor turns FPS post-processing off',!FPSPost.enabled(1));ART.hi=hi;
  m=new FPSMatch([{id:'daniel',gun:2,bot:false},{id:'torito',gun:2,bot:false}]);APP.fps=m;APP.go('fpsGame');GameFeel.alpha=1;GameFeel.dt=1/60;FPSView.draw(m);
  ok('split screen draws without a post-processing chain',FPSPost.composer===null&&FPSView.lastViewports.length===2);
  // Feedback: the damage arc points at the shooter; eliminations get a banner.
  m=new FPSMatch([{id:'daniel',gun:2,bot:false},{id:'torito',gun:1,bot:true},{id:'axo',gun:0,bot:true}]);APP.fps=m;[a,q]=m.players;const r=m.players[2];
  Object.assign(a,{x:0,z:0,y:50,yaw:0,invuln:0});Object.assign(q,{x:12,z:0,y:50});q.yaw=Math.atan2(a.x-q.x,-(a.z-q.z));Object.assign(r,{x:-12,z:0,y:50,yaw:0});FPSView.draw(m);
  q.shot++;m.damage(q,a,10,{});FPSView.draw(m);const arc=FPSView.hurtState.get(0).arcs[0];
  ok('a damage arc points at the bot that shot and aimed at the player',arc&&arc.src===q,{src:arc&&arc.src.index});
  m.feed.push({time:m.time,from:0,to:2,head:true,kind:'bullet'});FPSView.draw(m);ok('an elimination raises a banner once per kill',FPSView.lastBanner===['0',m.time.toFixed(2),'2'].join(':'));
  return out;
 });for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+' '+JSON.stringify(c.details));console.log((errors.length?'FAIL ':'PASS ')+'no browser errors '+JSON.stringify(errors));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length+!errors.length,total:checks.length+1}));if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
