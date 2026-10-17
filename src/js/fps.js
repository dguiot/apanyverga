'use strict';
// Metres, seconds, a fixed 60 Hz simulation and host-authoritative combat.
const FPS_GUNS=[
 {name:'Cobalto 9',kind:'pistol',damage:27,rate:.22,mag:15,reserve:90,reload:1.25,spread:.012,ads:.002,kick:.024,range:110,pellets:1,color:'#88d8df'},
 {name:'Avispa',kind:'smg',damage:15,rate:.075,mag:32,reserve:192,reload:1.65,spread:.034,ads:.009,kick:.018,range:95,pellets:1,color:'#ebbb68'},
 {name:'Sierra M4',kind:'rifle',damage:23,rate:.105,mag:30,reserve:150,reload:1.95,spread:.025,ads:.003,kick:.026,range:220,pellets:1,color:'#98bda7'},
 {name:'Trueno 12',kind:'shotgun',damage:13,rate:.78,mag:8,reserve:48,reload:2.15,spread:.075,ads:.041,kick:.085,range:55,pellets:8,color:'#d88a6a'},
 {name:'Horizonte',kind:'sniper',damage:88,rate:1.15,mag:5,reserve:35,reload:2.5,spread:.07,ads:.0008,kick:.09,range:380,pellets:1,color:'#a5b3df'},
];
const FPSWorld={
 limit:246,solids:[],decor:[],pickups:[],spawns:[[-10,12],[36,-28],[-42,-35],[14,63]],
 height(x,z){const edge=Math.max(0,(Math.max(Math.abs(x),Math.abs(z))-95)/130);return Math.sin(x*.017)*1.6+Math.cos(z*.019)*1.5+Math.sin((x+z)*.027)*.6+edge*edge*(18+Math.sin(x*.03+z*.02)*6);},
 init(){
  if(this.solids.length)return;
  const block=(x,z,w,d,h,type='wall',base=this.height(x,z))=>{const q={x,z,w,d,h,y:base,type};this.solids.push(q);return q;};
  // Two accessible buildings. Doorways, windows and stair flights are geometry
  // and collision together, so visual cover is also ballistic cover.
  for(const [x,z,w,d,h,col] of [[38,22,26,22,7,'#d3c1a1'],[-44,-34,25,30,9,'#92a4a1']]){
   const y=this.height(x,z);block(x-w/2,z,1,d,h,'plaster',y).color=col;block(x+w/2,z,1,d,h,'plaster',y).color=col;
   block(x,z-d/2,w,1,h,'plaster',y).color=col;
   block(x-w*.33,z+d/2,w*.34,1,h,'plaster',y).color=col;block(x+w*.33,z+d/2,w*.34,1,h,'plaster',y).color=col;
   block(x,z+d/2,w*.32,1,h-3.2,'plaster',y+3.2).color=col;
   block(x,z,w+1,d+1,.45,'roof',y+h);
   block(x,z,w-.5,d-.5,.2,'floor',y-.2);
   for(let j=0;j<24;j++)block(x+w/2+3,z-d/2+j*.95,3.6,1.02,(j+1)*(h+.45)/24,'stair',y);
   block(x+w/2+1.5,z+d/2+.9,4.4,3,.4,'roof',y+h+.05);
   this.decor.push({type:'building',x,z,w,d,h,y});
  }
  const rng=srand(7441);
  for(let i=0;i<34;i++){
   const x=(rng()-.5)*180,z=(rng()-.5)*180;
   if(this.spawns.some(p=>Math.hypot(x-p[0],z-p[1])<10)||this.solids.some(b=>Math.abs(x-b.x)<b.w/2+4&&Math.abs(z-b.z)<b.d/2+4))continue;
   const type=i%3?'crate':'barrier';block(x,z,type==='crate'?3:7,type==='crate'?3:1.3,type==='crate'?2.4:1.3,type);
  }
  // Raised bridge to the western riverbank, with collidable low parapets.
  for(const z of [-66,64]){block(-112,z,40,8,.7,'bridge',this.height(-112,z)+.8);for(const s of [-1,1])block(-112,z+s*4,40,.4,.8,'barrier',this.height(-112,z)+1.5);}
  for(let i=0;i<12;i++){const a=i*TAU/12;this.pickups.push({x:Math.cos(a)*(30+i%3*23),z:Math.sin(a)*(30+i%3*23),type:i%2?'ammo':'shield',ready:0});}
 },
 inside(x,y,z,b,r=.34,height=1.78){return Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r&&y<b.y+b.h-.02&&y+height>b.y+.02;},
 rayBox(o,d,b,max=999){
  let lo=0,hi=max;
  for(const [k,mid,size] of [['x',b.x,b.w],['y',b.y+b.h/2,b.h],['z',b.z,b.d]]){
   if(Math.abs(d[k])<1e-8){if(o[k]<mid-size/2||o[k]>mid+size/2)return null;continue;}
   let a=(mid-size/2-o[k])/d[k],c=(mid+size/2-o[k])/d[k];if(a>c)[a,c]=[c,a];lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi)return null;
  }return lo;
 },
 wallDistance(o,d,max){let near=max;for(const b of this.solids){const n=this.rayBox(o,d,b,near);if(n!==null)near=n;}for(let t=1;t<near;t+=1.5)if(o.y+d.y*t<this.height(o.x+d.x*t,o.z+d.z*t)){near=t;break;}return near;},
 move(p,dx,dz,dt){
  const oldY=p.y;
  for(const [axis,delta] of [['x',dx],['z',dz]]){
   const target=clamp(p[axis]+delta,-this.limit,this.limit);let allowed=true,step=p.y;
   for(const b of this.solids){const x=axis==='x'?target:p.x,z=axis==='z'?target:p.z;if(!this.inside(x,p.y,z,b))continue;
    if(p.grounded&&b.y+b.h-p.y<=.42)step=Math.max(step,b.y+b.h);else{allowed=false;break;}}
   if(allowed){p[axis]=target;p.y=step;}
  }
  const oldFoot=p.y;p.vy-=23*dt;p.y+=p.vy*dt;let floor=this.height(p.x,p.z);
  for(const b of this.solids){if(Math.abs(p.x-b.x)>=b.w/2+.29||Math.abs(p.z-b.z)>=b.d/2+.29)continue;
   if(oldFoot>=b.y+b.h-.08&&p.y<=b.y+b.h)floor=Math.max(floor,b.y+b.h);
   if(p.vy>0&&oldFoot+1.78<=b.y+.1&&p.y+1.78>b.y){p.y=b.y-1.78;p.vy=0;}}
  p.grounded=p.y<=floor+.025;if(p.grounded){p.y=floor;p.vy=0;}p.landing=Math.max(0,oldY-p.y);
 },
};FPSWorld.init();

const FPSControls={
 prev:new Map(),mouse:{x:0,y:0,fire:false,aim:false,wheel:0},look:new Map(),
 reset(){this.prev.clear();this.mouse.x=this.mouse.y=this.mouse.wheel=0;this.mouse.fire=this.mouse.aim=false;},
 read(slot=0){
  const online=APP.fps?.online,pads=padInfo,keyboard=slot===0,pm=online||APP.fps?.localCount===1?pads[0]:slot>0?pads.find(p=>p.index===APP.fps.devices[slot]):null;
  const b=pm?.buttons||[],a=pm?.axes||[],has=k=>keyboard&&keysDown.has(k),edge=k=>keyboard&&keyEdge('kb1',k);
  const dz=v=>Math.abs(v||0)<.16?0:(v-sign(v)*.16)/.84;
  let x=(has('KeyD')?1:0)-(has('KeyA')?1:0),z=(has('KeyW')?1:0)-(has('KeyS')?1:0);
  if(pm){x=dz(a[0]);z=-dz(a[1]);}
  const prev=this.prev.get(slot)||{},sprint=!!b[10],jump=!!b[0],reload=!!b[2],swap=!!b[3],pause=!!b[9];
  const out={x,z,lx:dz(a[2])*2.7/60+(keyboard?this.mouse.x*.0022:0),ly:dz(a[3])*2.05/60+(keyboard?this.mouse.y*.0022:0),fire:!!b[7]||keyboard&&this.mouse.fire,aim:!!b[6]||keyboard&&this.mouse.aim,
   sprint:has('ShiftLeft')||has('ShiftRight'),sprintTap:sprint&&!prev.sprint,jump:jump&&!prev.jump||edge('Space'),reload:reload&&!prev.reload||edge('KeyR'),swap:swap&&!prev.swap||edge('KeyQ')||keyboard&&this.mouse.wheel!==0,pause:pause&&!prev.pause||edge('Escape'),gun:-1};
  for(let i=1;i<=5;i++)if(edge('Digit'+i))out.gun=i-1;
  this.prev.set(slot,{sprint,jump,reload,swap,pause});if(keyboard)this.mouse.x=this.mouse.y=this.mouse.wheel=0;
  const n=Math.hypot(out.x,out.z);if(n>1){out.x/=n;out.z/=n;}return out;
 },
 lock(){if(APP.screen==='fpsGame'&&!APP.fps.paused){try{const q=canvas.requestPointerLock();if(q?.catch)q.catch(()=>{});}catch(e){}}},
};
window.addEventListener('mousemove',e=>{if(APP.screen==='fpsGame'&&document.pointerLockElement===canvas){FPSControls.mouse.x+=e.movementX;FPSControls.mouse.y+=e.movementY;}});
canvas.addEventListener('mousedown',e=>{if(APP.screen!=='fpsGame'||APP.fps.paused)return;if(document.pointerLockElement!==canvas){const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*W/b.width,y=(e.clientY-b.top)*H/b.height;if(x>W-290&&y<80)return;}Audio8.unlock();if(e.button===0)FPSControls.mouse.fire=true;if(e.button===2)FPSControls.mouse.aim=true;FPSControls.lock();});
window.addEventListener('mouseup',e=>{if(e.button===0)FPSControls.mouse.fire=false;if(e.button===2)FPSControls.mouse.aim=false;});
canvas.addEventListener('contextmenu',e=>{if(APP.screen==='fpsGame')e.preventDefault();});
canvas.addEventListener('wheel',e=>{if(APP.screen==='fpsGame'){FPSControls.mouse.wheel=sign(e.deltaY);e.preventDefault();}},{passive:false});
window.addEventListener('keydown',e=>{if(APP.screen==='fpsGame'&&['Space','Tab','ShiftLeft','ShiftRight','KeyQ','KeyR'].includes(e.code))e.preventDefault();});
document.addEventListener('pointerlockchange',()=>{if(APP.screen==='fpsGame'&&APP.fps?.captured&&document.pointerLockElement!==canvas){APP.fps.paused=true;FPSControls.reset();}if(document.pointerLockElement===canvas)APP.fps.captured=true;});
window.addEventListener('blur',()=>{if(APP.screen==='fpsGame'){APP.fps.paused=true;FPSControls.reset();}});

class FPSMatch{
 constructor(roster,online=false,seed=7331){
  this.online=online;this.rng=new SimRNG(seed);this.time=0;this.tick=0;this.paused=false;this.phase='play';this.target=12;this.duration=420;this.effects=[];this.feed=[];this.pickups=FPSWorld.pickups.map(p=>({...p}));
  this.players=roster.map((q,i)=>{const [x,z]=FPSWorld.spawns[i%4];return {...q,index:i,x,y:FPSWorld.height(x,z),z,vx:0,vz:0,vy:0,yaw:Math.atan2(-x,-z),pitch:0,grounded:true,gun:q.gun||0,ammo:FPS_GUNS.map(g=>g.mag),reserve:FPS_GUNS.map(g=>g.reserve),health:100,shield:50,kills:0,deaths:0,dead:0,invuln:2,cool:0,reloading:0,sprint:false,ads:0,recoil:0,shot:0,hit:0,hurt:0,bob:0,coyote:.1,jumpBuffer:0,stepAt:0};});
  this.player=this.players[0];this.localCount=online?1:Math.max(1,this.players.filter(p=>!p.bot).length);this.devices=[null,...padInfo.slice(0,3).map(p=>p.index)];this.cameraAlpha=0;
 }
 sound(type,p){if(p===this.player||!this.online&&!p.bot){FPSAudio.play(type,p);Rumble.play('local',type==='shot'?.1:.22,.3,type==='shot'?55:100);}}
 inputAI(p){
  const others=this.players.filter(q=>q!==p&&!q.dead),target=others.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(!target)return {};
  const dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz),yaw=Math.atan2(dx,-dz),delta=Math.atan2(Math.sin(yaw-p.yaw),Math.cos(yaw-p.yaw));
  const eye={x:p.x,y:p.y+1.6,z:p.z},dir={x:dx/distance,y:(target.y+1.3-eye.y)/distance,z:dz/distance},clear=FPSWorld.wallDistance(eye,dir,distance)>=distance-.5;
  const probe=FPSWorld.wallDistance({x:p.x,y:p.y+.7,z:p.z},{x:Math.sin(p.yaw),y:0,z:-Math.cos(p.yaw)},4);
  return {x:clear&&distance<35?Math.sin(this.time*.8+p.index)*.65:probe<3?Math.sin(this.time+p.index)>0?1:-1:0,z:distance>22?.8:0,lx:clamp(delta,-.035,.035),ly:clamp(Math.atan2(eye.y-target.y-1.3,distance)-p.pitch,-.018,.018),aim:clear,fire:clear&&distance<170&&Math.abs(delta)<.09&&Math.sin(this.time*1.8+p.index)>.05,reload:p.ammo[p.gun]===0,jump:probe<3&&p.grounded,sprint:!clear};
 }
 move(p,I,dt){
  if(p.dead)return;
  p.yaw+=clamp(I.lx||0,-.3,.3);p.yaw=Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw));p.pitch=clamp(p.pitch+(I.ly||0),-1.4,1.4);
  if(I.sprintTap)p.sprint=!p.sprint;if(I.sprint)p.sprint=true;if(I.z<.15||I.aim||I.fire)p.sprint=false;
  p.ads=approach(p.ads,I.aim&&!p.sprint?1:0,dt*8);p.recoil=approach(p.recoil,0,dt*.22);
  const speed=p.sprint?10.2:p.ads>.5?3.1:6.1,x=I.x||0,z=I.z||0,dx=(Math.cos(p.yaw)*x+Math.sin(p.yaw)*z)*speed,dz=(Math.sin(p.yaw)*x-Math.cos(p.yaw)*z)*speed;
  p.vx=approach(p.vx,dx,dt*(p.grounded?48:13));p.vz=approach(p.vz,dz,dt*(p.grounded?48:13));
  p.coyote=p.grounded?.09:Math.max(0,p.coyote-dt);p.jumpBuffer=I.jump?.12:Math.max(0,p.jumpBuffer-dt);
  if(p.jumpBuffer&&p.coyote){p.vy=8.1;p.grounded=false;p.coyote=p.jumpBuffer=0;this.sound('jump',p);}
  FPSWorld.move(p,p.vx*dt,p.vz*dt,dt);p.bob+=Math.hypot(p.vx,p.vz)*dt;p.hurt=Math.max(0,p.hurt-dt);p.hit=Math.max(0,p.hit-dt);p.invuln=Math.max(0,p.invuln-dt);
  if(p.grounded&&Math.hypot(p.vx,p.vz)>1&&p.bob-p.stepAt>2.3){p.stepAt=p.bob;this.sound('step',p);}
 }
 update(inputs,dt=1/60){
  this.time+=dt;this.tick++;for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);this.feed=this.feed.filter(f=>this.time-f.time<5);
  for(const p of this.players){
   p.prev={x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch};if(p.dead){p.dead-=dt;if(p.dead<=0)this.respawn(p);continue;}
   const I=p.bot||p.disconnected?this.inputAI(p):inputs[p.index]||{};this.move(p,I,dt);p.cool=Math.max(0,p.cool-dt);
   if(p.reloading){p.reloading-=dt;if(p.reloading<=0){const n=Math.min(FPS_GUNS[p.gun].mag-p.ammo[p.gun],p.reserve[p.gun]);p.ammo[p.gun]+=n;p.reserve[p.gun]-=n;p.reloading=0;this.sound('ready',p);}}
   const gun=I.gun>=0?I.gun:I.swap?(p.gun+1)%5:p.gun;
   if(Number.isInteger(gun)&&gun>=0&&gun<5&&gun!==p.gun){p.gun=gun;p.reloading=0;p.cool=Math.max(.22,p.cool);}
   const g=FPS_GUNS[p.gun];if(I.reload&&!p.reloading&&p.ammo[p.gun]<g.mag&&p.reserve[p.gun]>0){p.reloading=g.reload;p.sprint=false;this.sound('reload',p);}
   if(I.fire&&!p.cool&&!p.reloading&&!p.sprint){if(p.ammo[p.gun])this.fire(p);else {p.cool=.2;this.sound('empty',p);}}
   for(const q of this.pickups)if(q.ready<=this.time&&Math.hypot(p.x-q.x,p.z-q.z)<1.7){if(q.type==='ammo'&&p.reserve[p.gun]<g.reserve){p.reserve[p.gun]=g.reserve;q.ready=this.time+15;this.sound('ready',p);}else if(q.type==='shield'&&p.shield<50){p.shield=50;q.ready=this.time+18;this.sound('ready',p);}}
  }
  if(this.phase==='play'&&(this.time>=this.duration||this.players.some(p=>p.kills>=this.target)))this.phase='done';
 }
 fire(p){
  const g=FPS_GUNS[p.gun];p.ammo[p.gun]--;p.cool=g.rate;p.shot++;p.recoil=Math.min(.16,p.recoil+g.kick);this.sound('shot',p);
  const o={x:p.x,y:p.y+1.62,z:p.z};
  for(let j=0;j<g.pellets;j++){
   const spread=lerp(g.spread,g.ads,p.ads),yaw=p.yaw+(this.rng.next()-.5)*spread*2,pitch=p.pitch-p.recoil*.24+(this.rng.next()-.5)*spread*2,d={x:Math.sin(yaw)*Math.cos(pitch),y:-Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};
   let near=FPSWorld.wallDistance(o,d,g.range),victim=null,head=false;
   for(const q of this.players){if(q===p||q.dead||q.invuln)continue;for(const part of [{y:q.y+.38,h:1.05,w:.65,head:false},{y:q.y+1.43,h:.48,w:.48,head:true}]){
    const t=FPSWorld.rayBox(o,d,{x:q.x,y:part.y,z:q.z,w:part.w,d:part.w,h:part.h},near);if(t!==null&&t<near){near=t;victim=q;head=part.head;}}
   }
   const end={x:o.x+d.x*near,y:o.y+d.y*near,z:o.z+d.z*near};this.effects.push({type:'trace',a:o,b:end,life:.09,owner:p.index});
   if(victim){const damage=Math.round(g.damage*(head?1.65:1)*clamp(1-near/g.range*.45,.55,1)),shield=Math.min(victim.shield,damage);victim.shield-=shield;victim.health=Math.max(0,victim.health-damage+shield);victim.hurt=.35;p.hit=.15;this.sound('hit',p);
    if(!victim.health){victim.dead=3;victim.deaths++;p.kills++;this.feed.push({time:this.time,from:p.index,to:victim.index,head});if(this.feed.length>4)this.feed.shift();}}
  }if(this.effects.length>80)this.effects.splice(0,this.effects.length-80);
 }
 respawn(p){const spots=FPSWorld.spawns.map(([x,z])=>({x,z,safety:Math.min(...this.players.filter(q=>q!==p&&!q.dead).map(q=>Math.hypot(q.x-x,q.z-z)),999)})).sort((a,b)=>b.safety-a.safety),q=spots[0];Object.assign(p,{x:q.x,z:q.z,y:FPSWorld.height(q.x,q.z),vx:0,vz:0,vy:0,health:100,shield:50,dead:0,invuln:2,reloading:0,recoil:0,cool:.4,grounded:true});p.ammo=FPS_GUNS.map(g=>g.mag);p.reserve=FPS_GUNS.map(g=>g.reserve);}
}
const FPSAudio={play(type,p){const a=Audio8;if(!a.ready)return;const g=FPS_GUNS[p.gun];if(type==='shot'){a.noise(g.kind==='shotgun'?.16:.075,.09,g.kind==='sniper'?950:g.kind==='smg'?2300:1500,.7,0,'bandpass');a.tone('triangle',g.kind==='sniper'?72:115,35,.11,.07);}else if(type==='hit'){a.tone('sine',920,1250,.045,.035);}else if(type==='step')a.noise(.045,.012,280,.6);else if(type==='reload'){a.noise(.09,.025,1600,.8);}else if(type==='empty')a.tone('triangle',600,300,.025,.025);else if(type==='ready')a.tone('sine',790,990,.06,.025);}};
