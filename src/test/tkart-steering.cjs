// Screen-space acceptance: stick right must move, point and steer wheels right.
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.stack));
  await p.addInitScript(()=>{
   requestAnimationFrame=()=>0;
   window.__pad={id:'Xbox Wireless Controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
   navigator.getGamepads=()=>[__pad];
  });
  await p.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.APYV_CONFIG={};'}));
  await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
  const checks=await p.evaluate(()=>{
   const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details}),T=KartGL;
   const input=(device,direction)=>{
    keysDown.clear();__pad.axes[0]=0;__pad.buttons.forEach(b=>{b.pressed=false;b.value=0;});TouchPad.active=false;
    if(device==='stick')__pad.axes[0]=direction*.8;
    if(device==='dpad')__pad.buttons[direction>0?15:14].pressed=true;
    if(device==='keyboard')keysDown.add(direction>0?'KeyD':'KeyA');
    if(device==='arrows')keysDown.add(direction>0?'ArrowRight':'ArrowLeft');
    if(device==='touch')TouchPad.active=true;
    Devices.poll();
    if(device==='touch')Devices.ctrls.touch.cur.x=direction*.8;
    KartControls.prev={};KartControls.tapped.clear();return KartControls.read();
   };
   for(const device of ['stick','dpad','keyboard','arrows','touch'])for(const direction of [-1,1]){
    const I=input(device,direction),C=new KartRace(KART_TRACKS[0],'daniel',1,false,99,['daniel']);C.predicting=true;
    const r=C.player;Object.assign(r,{s:200,x:0,v:60});for(let j=0;j<20;j++)C.drive(r,{...I,gas:true},1/60);
    const center=C.course.world(r.s),q=C.course.sample(r.s),w=C.course.world(r.s,r.x);
    const cam=new T.PerspectiveCamera(60,16/9,.1,5000),back=C.course.world(r.s-15,0,5);cam.position.set(back.x,back.y,back.z);cam.lookAt(center.x,center.y+1,center.z);cam.updateMatrixWorld();
    const a=new T.Vector3(w.x,w.y+1,w.z).project(cam),b=new T.Vector3(center.x,center.y+1,center.z).project(cam);
    ok(device+' '+(direction>0?'right':'left')+' moves to the corresponding screen side',(a.x-b.x)*direction>.005,{screenDelta:a.x-b.x});
   }
   TouchPad.active=false;keysDown.clear();__pad.axes[0]=0;Devices.poll();
   for(const track of KART_TRACKS){
    const ids=Array(6).fill('daniel'),race=new KartRace(track,'daniel',1,false,99,ids,[0,1,2,3,4,5]);race.predicting=true;APP.kartRace=race;Kart3D.init();Kart3D.build(race);
    for(const direction of [-1,1]){
     const I=input('stick',direction);
     for(const r of race.racers){Object.assign(r,{s:200,ps:200,x:0,px:0,v:60,yaw:0,velocityYaw:0,turnRate:0,steer:0,lat:0});for(let j=0;j<20;j++)race.drive(r,{...I,gas:true},1/60);}
     Kart3D.animate(race,1);Kart3D.scene.updateMatrixWorld(true);
     race.racers.forEach((r,i)=>{
      const m=Kart3D.drivers[i],q=race.course.sample(r.s),right=new T.Vector3(-q.tz,0,q.tx).normalize(),center=race.course.world(r.s),pos=new T.Vector3(m.position.x-center.x,0,m.position.z-center.z);
      const heading=new T.Vector3(0,0,1).transformDirection(m.matrixWorld),wheel=m.userData.wheels.find(w=>w.front),wheelHeading=new T.Vector3(0,0,1).transformDirection(wheel.pivot.matrixWorld);
      const displacement=pos.dot(right),body=heading.dot(right),front=wheelHeading.dot(right);
      ok(track.id+' vehicle '+i+' '+(direction>0?'right':'left')+' agrees in movement, heading and front wheels',displacement*direction>.1&&body*direction>.05&&front*direction>.1,{displacement,body,front});
     });
    }
   }
   return out;
  });
  checks.push({name:'no browser errors',pass:errors.length===0,details:errors});
  for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+' '+JSON.stringify(c.details));
  console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
