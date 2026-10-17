// Actual browser Gamepad API polling, complete action paths and rendering regressions.
const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const page=await b.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{requestAnimationFrame=()=>0;window.__pads=[0,1,2].map(index=>({id:index===1?'Xbox Wireless Controller':'Xbox Controller',index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));navigator.getGamepads=()=>__pads;});
 await page.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 const checks=await page.evaluate(()=>{
  const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details});
  const clear=()=>{keysDown.clear();keyPulses.clear();keysTapped.clear();TouchPad.active=false;__pads.forEach(p=>{p.axes.fill(0);p.buttons.forEach(b=>b.pressed=false);});Devices.poll();};
  const btn=(i,on=true,pad=1)=>{__pads[pad].buttons[i].pressed=on;Devices.poll();};
  const fresh=()=>{const r=APP.kartRace=new KartRace(KART_TRACKS[0],'daniel',1,false,442);r.phase='race';r.racers.forEach(p=>{p.s=p.ps=200;p.x=p.px=0;});r.racers=r.racers.slice(0,1);r.order=r.racers;KartControls.prev={};KartControls.devices?.clear();return r;};
  clear();let r=fresh(),p=r.player;btn(7);let I=KartControls.read();r.update(I);ok('idle first pad does not block the active wireless kart accelerator',p.v>0&&ModeControls.primary.get('kart')===1);
  clear();btn(3);p.s=220;p.x=.45;p.v=30;I=KartControls.read();r.update(I);ok('Y does not rescue, stop or teleport the racer',!p.rescue&&p.s>220&&p.v>20&&p.x>.3);
  clear();keysDown.add('KeyR');r.update(KartControls.read());r.drive(p,{rescuePressed:true},1/60);ok('R and old network rescue inputs cannot reset the racer',p.rescue===0);
  for(const [device,key,button,rear]of [['keyboard','KeyE',null,false],['keyboard','KeyJ',null,false],['keyboard','KeyQ',null,true],['wireless',null,4,false],['wireless',null,1,true]]){
   clear();r=fresh();p=r.player;p.item='tortilla';if(key)keysDown.add(key);else btn(button);
   I=KartControls.read();r.update(I);const q=r.projectiles[0];ok(device+' '+(key||PAD_BTN[button])+' throws a real projectile '+(rear?'backwards':'forwards'),q&&q.dir===(rear?-1:1)&&p.item===null);
   p.item='shield';r.update(KartControls.read());ok('holding '+(key||PAD_BTN[button])+' does not consume another item',p.item==='shield');
  }
  clear();r=fresh();p=r.player;p.item='chile';btn(1,true,0);I=ShellKartInput.read('pad0');r.update({players:{0:I}});ok('split-screen B throws backwards too',r.projectiles[0]?.dir===-1);
  clear();r=fresh();p=r.player;p.item='tortilla';btn(6);btn(4);r.update(KartControls.read());ok('braking does not silently reverse a forward item launch',r.projectiles[0]?.dir===1);
  clear();keysDown.add('ArrowRight');__pads[1].axes[0]=-.25;Devices.poll();ok('minor controller drift cannot override a keyboard steering command',KartControls.read().steer===-1);
  clear();TouchPad.active=true;const oldTouch=Devices.ctrls.touch;Devices.ctrls.touch={cur:{...blankState(),attack:true,shield:true,x:.7}};I=KartControls.read('pad1');ok('touch controls cannot leak into a second local player controller',!I.gas&&!I.itemPressed&&I.steer===0);if(oldTouch)Devices.ctrls.touch=oldTouch;else delete Devices.ctrls.touch;TouchPad.active=false;
  clear();keysDown.add('KeyW');btn(7,true,0);ok('split-screen keyboard and controller remain separate',KartControls.read('kb1').gas&&KartControls.read('pad0').gas&&!KartControls.read('pad1').gas);
  clear();r=fresh();const bridge=r.course.samples.find(p=>p.zone==='bridge');p=r.player;p.s=bridge.s;p.x=1.6;p.v=70;r.drive(p,{gas:true},1/60);ok('falling off a bridge still triggers automatic recovery',p.rescue>0);
  for(let i=0;i<85;i++)r.update({});ok('automatic recovery returns control in the centre',p.rescue<=0&&Math.abs(p.x)<.05);
  r.say('¡IMPACTO!');r.say('¡MINI TURBO!');r.say('¡EN EL AIRE!');r.say('De vuelta a la pista');ok('routine actions do not announce text across the race',r.messages.length===0);r.say('¡ÚLTIMA VUELTA!');ok('race milestones remain visible',r.messages.length===1);
  APP.go('kartRace');GameFeel.dt=1/60;Kart3D.draw(r,1);p.invuln=2;let stable=true;for(let i=0;i<120;i++){r.time+=1/60;p.invuln=Math.max(0,p.invuln-1/60);Kart3D.animate(r,1);stable&&=Kart3D.drivers[0].visible;}ok('invulnerability never blinks the driver across 120 frames',stable);
  const m=APP.fps=new FPSMatch([{id:'daniel',gun:0,bot:false}]);APP.go('fpsGame');
  for(let gun=0;gun<5;gun++)for(const button of [2,5]){clear();FPSControls.reset();m.player.gun=gun;m.player.ammo[gun]=1;m.player.reserve[gun]=50;m.player.reloading=0;btn(button);I=FPSControls.read();m.update([I]);const started=m.player.reloading;const held=FPSControls.read();for(let i=0;i<170;i++)m.update([{}]);ok('wireless '+PAD_BTN[button]+' reloads gun '+gun+' and remains an edge',started>0&&!held.reload&&m.player.ammo[gun]===FPS_GUNS[gun].mag&&m.player.reloading===0);}
  clear();FPSControls.reset();m.player.gun=0;m.player.ammo[0]=2;m.player.reserve[0]=50;keyPulses.add('KeyR');I=FPSControls.read();m.update([I]);ok('keyboard R starts a real reload',m.player.reloading>1);
  clear();FPSControls.reset();keysDown.add('KeyW');I=FPSControls.read();ok('a connected neutral controller does not cancel WASD movement',I.z===1);
  clear();FPSControls.reset();__pads[1].axes=[.8,-.7,.6,.5];btn(7);btn(6);btn(10);btn(0);I=FPSControls.read();ok('wireless FPS sticks, triggers, L3 and jump have independent actions',I.x>0&&I.z>0&&I.lx>0&&I.ly>0&&I.fire&&I.aim&&I.sprintTap&&I.jump);
  btn(3);ok('Y changes weapon in FPS',FPSControls.read().swap);
  clear();m.localCount=3;m.devices=[null,0,1];FPSControls.reset();btn(2,true,1);ok('split-screen reload belongs to the assigned player only',!FPSControls.read(0).reload&&!FPSControls.read(1).reload&&FPSControls.read(2).reload);
  clear();for(const [action,button]of [['attack',0],['special',1],['jump',2],['shield',6],['grab',4],['start',9]]){clear();btn(button,true,1);ok('Esmash physical '+PAD_BTN[button]+' activates '+action,Devices.ctrls.pad1.cur[action]);}
  clear();__pads[1].axes=[0,0,.9,-.8];Devices.poll();ok('Esmash right stick still supplies directional Smash',Devices.ctrls.pad1.cur.cx>.5&&Devices.ctrls.pad1.cur.cy<-.5);
  for(const mode of ['kart','fps']){const rows=ModeControls.help(mode);ok(mode+' settings document actions from the gameplay bindings',rows.length===6&&rows.every(r=>r.every(Boolean)));}
  clear();btn(2);ok('settings diagnostics expose detected wireless reload button',ModeControls.diagnostic().includes('Xbox')&&ModeControls.diagnostic().includes('X · □'));
  clear();ShellUI.active=true;ShellUI.online=false;ShellUI.game='fps';ShellUI.paused=false;ShellUI.returnScreen=null;ShellUI.menuHeld=new Set();m.localCount=1;m.paused=false;APP.fps=m;APP.go('fpsGame');
  const oldBinds=clone(Binds.pads);Binds.editable('pad1').start=[{b:8}];btn(9);APP.update();ok('physical Menu pauses FPS even with different Esmash remapping',ShellUI.paused&&m.paused);btn(9,false);APP.update();btn(9);APP.update();APP.update();ok('holding Menu after resuming FPS does not immediately pause again',!ShellUI.paused&&!m.paused);Binds.pads=oldBinds;clear();ShellUI.active=false;
  return out;
 });
 checks.push({name:'no browser errors',pass:errors.length===0,details:errors});for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.details?' '+JSON.stringify(c.details):''));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
