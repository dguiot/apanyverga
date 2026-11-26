// El objeto que llevas te cubre la espalda; con pantalla táctil el kart acelera solo.
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.addInitScript(()=>{requestAnimationFrame=()=>0;navigator.getGamepads=()=>[];});await p.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 const checks=await p.evaluate(()=>{
  const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details});KartSound.effect=()=>{};Audio8.sfx=()=>{};
  const race=()=>{const R=new KartRace(KART_TRACKS[0],'daniel',1,false,7);R.phase='race';R.racers.forEach((q,i)=>{q.s=900+i*60;q.x=.9;q.v=0;});return R;};
  // un chile lanzado desde atrás
  const shot=(item,from='rear')=>{const R=race(),me=R.player,foe=R.racers[1];me.s=300;me.x=0;me.v=60;me.item=item;foe.s=from==='rear'?260:340;foe.x=0;foe.v=60;foe.item='chile';
   if(from==='rear')R.useItem(foe,false);else{R.useItem(foe,true);}let stunned=false;for(let i=0;i<90;i++){R.updateProjectiles(1/60);if(me.stun>0)stunned=true;R.racers.forEach(q=>{q.ps=q.s;q.s+=q.v/60;});}
   return {stunned,item:me.item,left:R.projectiles.filter(q=>q.owner===1).length};};
  let r=shot('tortilla');ok('a tortilla carried behind blocks a rocket from behind (and is lost)',!r.stunned&&r.item===null&&r.left===0,r);
  r=shot('salsa');ok('salsa carried behind also blocks',!r.stunned&&r.item===null,r);
  r=shot(null);ok('without a carried item the rocket hits',r.stunned,r);
  r=shot('turbo');ok('a turbo does not block anything',r.stunned&&r.item==='turbo',r);
  {const R=race(),me=R.player;me.item='tortilla';me.s=300;me.x=0;me.v=60;R.projectiles.push({type:'salsa',owner:2,s:305,ps:305,x:0,life:14,v:0,vx:0,age:2,dir:-1});let stunned=false;
   for(let i=0;i<40;i++){me.ps=me.s;me.s+=me.v/60;R.updateProjectiles(1/60);if(me.stun>0)stunned=true;}ok('driving into salsa ahead still spins you out',stunned);}
  {const R=race(),me=R.player;me.item=null;me.shield=7;me.s=300;R.racers[1].s=260;R.racers[1].item='chile';R.useItem(R.racers[1]);let stunned=false;for(let i=0;i<90;i++){R.updateProjectiles(1/60);R.racers.forEach(q=>{q.ps=q.s;q.s+=q.v/60;});if(me.stun)stunned=true;}ok('the bubble shield still works as before',!stunned&&me.shield===0);}
  // táctil: acelera solo, FRENO frena, botón grande derrapa; en la cuenta regresiva el botón grande es GAS
  TouchPad.active=true;APP.screen='kartRace';APP.kartRace=race();Devices.poll();
  const read=state=>{Object.assign(Devices.ctrls.touch.cur,{attack:false,special:false,jump:false,shield:false,grab:false,x:0},state);KartControls.prev={};KartControls.tapped.clear();return KartControls.read();};
  let I=read({});ok('touch: the kart accelerates on its own',I.gas&&!I.brake&&!I.drift);
  I=read({special:true});ok('touch: FRENO brakes and stops accelerating',I.brake&&!I.gas);
  I=read({attack:true,x:.8});ok('touch: the big button drifts',I.drift&&I.gas);
  I=read({jump:true});ok('touch: ÍTEM uses the item forwards',I.itemPressed&&!I.rear);
  I=read({shield:true});ok('touch: ATRÁS throws it backwards',I.itemPressed&&I.rear);
  APP.kartRace.phase='grid';I=read({});ok('touch: no automatic gas during the countdown (no overheating)',!I.gas);I=read({attack:true});ok('touch: the big button is the gas for the turbo start',I.gas&&!I.drift);
  KartTouch.set(false);APP.kartRace.phase='race';I=read({attack:true});ok('touch: auto-accelerate can be turned off (GAS button again)',I.gas&&!I.drift);I=read({});ok('touch: without auto-accelerate nothing pushes the kart',!I.gas);KartTouch.set(true);
  TouchPad.active=false;APP.kartRace=null;APP.screen='title';
  return out;
 });
 for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.details?' '+JSON.stringify(c.details):''));console.log((errors.length?'FAIL ':'PASS ')+'no browser errors '+JSON.stringify(errors.slice(0,3)));
 console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length+!errors.length,total:checks.length+1}));if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
