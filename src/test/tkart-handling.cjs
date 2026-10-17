const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));await page.addInitScript(()=>{requestAnimationFrame=()=>0;window.__haptic=[];window.__pad={id:'Xbox Wireless Controller',index:1,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0})),vibrationActuator:{playEffect:(type,fx)=>{__haptic.push({type,...fx});return Promise.resolve('complete');},reset:()=>Promise.resolve()}};navigator.getGamepads=()=>[null,__pad];});await page.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 const checks=await page.evaluate(()=>{
  const checks=[],ok=(name,pass,data)=>checks.push({name,pass:!!pass,data});Devices.poll();ModeControls.primary.set('kart',1);
  const fresh=(vehicle=0)=>{const r=new KartRace(KART_TRACKS[0],'daniel',1,false,14,['daniel'],[vehicle]);r.phase='race';r.player.s=r.player.ps=200;r.player.v=95;r.course.sample=()=>({curve:0,width:1000,zone:'road',x:0,y:0,z:0,tx:0,tz:1});for(const key of ['boxes','coins','boosts','ramps','hazards'])r.course[key]=[];return r;};
  ok('small stick movements have a broad controllable centre',KartHandling.axis(.3)>.02&&KartHandling.axis(.3)<.10&&KartHandling.axis(.6)<.4,{small:KartHandling.axis(.3),medium:KartHandling.axis(.6)});
  ok('stick response is symmetric and preserves full steering lock',KartHandling.axis(-.7)===-KartHandling.axis(.7)&&KartHandling.axis(1)===1&&KartHandling.axis(-1)===-1);
  const r=fresh(),p=r.player;const rates=[];for(let i=0;i<12;i++){r.drive(p,{gas:true,steer:1},1/60);rates.push(p.turnRate);}ok('full lock builds progressively without a first-frame steering kick',rates[0]<.03&&rates[6]>rates[0]*8&&rates[11]<1,{rates});
  for(let vehicle=0;vehicle<6;vehicle++){
   const a=fresh(vehicle),b=fresh(vehicle);a.player.yaw=b.player.yaw=.25;
   for(let j=0;j<48;j++){a.drive(a.player,{steer:.55},1/60);b.drive(b.player,{steer:.55,drift:true},1/60);}
   ok('vehicle '+vehicle+' scrubs speed through tyre friction while drifting',b.player.v<a.player.v-2,{rolling:a.player.v,drifting:b.player.v});
   const before=Math.abs(b.player.yaw-b.player.velocityYaw);for(let j=0;j<25;j++)b.drive(b.player,{steer:0,gas:true},1/60);ok('vehicle '+vehicle+' regains grip after release without continued sideways sliding',Math.abs(b.player.yaw-b.player.velocityYaw)<.05&&Math.abs(b.player.yaw-b.player.velocityYaw)<before);
  }
  const run=drift=>{const r=fresh();r.course.sample=()=>({curve:.006,width:1000,zone:'road'});for(let j=0;j<240;j++){const p=r.player,turn=(1.62-.42*p.v/(p.stats.speed*r.cc.speed))*p.stats.grip*(p.drift?KartHandling.driftTurn:1);r.drive(p,{gas:true,drift,steer:.006*p.v/turn},1/60);}return r.player.v;};const normal=run(false),drift=run(true);ok('full throttle does not cancel cornering and drift friction',drift<normal*.94&&drift>normal*.7,{normal,drift});
  const h=fresh(),q=h.player;const feel=(speed,curve,slide=0)=>{q.v=speed;q.yaw=slide;q.velocityYaw=0;q.turnRate=curve*speed;h.course.sample=()=>({zone:'road',curve});return KartHaptics.feel(h,q);};
  const low=feel(25,0),fast=feel(100,0),gentle=feel(100,.002),sharp=feel(100,.009),slide=feel(100,.009,.25);
  ok('haptic engine texture grows with speed',fast.weak>low.weak*3,{low,fast});ok('corner load grows with curvature at the same speed',sharp.strong>gentle.strong&&gentle.strong>fast.strong,{fast,gentle,sharp});ok('sliding tyres add feedback without saturating both motors',slide.strong>sharp.strong&&slide.weak>sharp.weak&&slide.strong<=.38&&slide.weak<=.36,slide);
  q.v=100;q.yaw=.2;Rumble.cur={};Rumble.on=true;KartHaptics.last.clear();KartHaptics.tick(h);ok('road feedback reaches the correct wireless actuator',__haptic.length===1&&__haptic[0].type==='dual-rumble'&&__haptic[0].strongMagnitude>0&&__haptic[0].duration===100,__haptic.slice());
  for(let j=0;j<30;j++)KartHaptics.tick(h);ok('rendering many frames cannot flood the actuator',__haptic.length===1);
  KartHaptics.last.clear();Rumble.cur={};Rumble.play('pad1',.8,.7,300);const count=__haptic.length;KartHaptics.tick(h);ok('continuous road feel cannot overwrite a collision pulse',__haptic.length===count);
  h.online=true;h.racers.push({...q,index:1,human:true});ok('a remote racer cannot vibrate the local controller',KartHaptics.device(h,h.racers[1])===null);
  h.paused=true;ok('paused racing has no road rumble',KartHaptics.feel(h,q).strong===0&&KartHaptics.feel(h,q).weak===0);h.paused=false;q.height=1;ok('airborne tyres do not create corner rumble',KartHaptics.feel(h,q).strong===0);
  return checks;
 });
 checks.push({name:'no browser errors',pass:errors.length===0,data:errors});for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+' '+JSON.stringify(c.data));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
