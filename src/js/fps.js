'use strict';
// Metres, seconds, a fixed 60 Hz simulation and host-authoritative combat.
const FPS_GUNS=[
 {name:'Cobalto 9',kind:'pistol',damage:25,rate:.24,mag:15,reserve:90,reload:1.25,spread:.012,ads:.002,kick:.024,range:110,pellets:1,color:'#88d8df'},
 {name:'Avispa',kind:'smg',damage:13,rate:.085,mag:32,reserve:192,reload:1.65,spread:.034,ads:.009,kick:.018,range:95,pellets:1,color:'#ebbb68'},
 {name:'Sierra M4',kind:'rifle',damage:20,rate:.12,mag:30,reserve:150,reload:1.95,spread:.025,ads:.003,kick:.026,range:220,pellets:1,color:'#98bda7'},
 {name:'Trueno 12',kind:'shotgun',damage:11,rate:.9,mag:8,reserve:48,reload:2.15,spread:.075,ads:.041,kick:.085,range:55,pellets:8,color:'#d88a6a'},
 {name:'Horizonte',kind:'sniper',damage:92,rate:1.2,mag:5,reserve:35,reload:2.5,spread:.07,ads:.0008,kick:.09,range:380,pellets:1,color:'#a5b3df'},
];
// Muzzle velocity in m/s; optics affect the actual world camera and look speed.
FPS_GUNS.forEach((g,i)=>Object.assign(g,{velocity:[350,430,860,365,1050][i],gravity:9.81,zoom:[57,56,47,60,20][i],zero:[20,30,60,15,100][i],headMultiplier:i===4?2.2:1.65}));
// All posture consumers (camera, collision, bullets, AI and animation) use metres.
const FPSBody={
 height:1.9,drop:.68,head:1.67,eye:1.62,headMultiplier:1.65,regenDelay:5,regenRate:15,
 stance(p){return clamp(p.stance||0,0,1);},
 bodyHeight(p){return this.height-this.drop*this.stance(p);},
 eyeHeight(p){return this.eye-this.drop*this.stance(p);},
 hitboxes(p){const drop=this.drop*this.stance(p);return [{y:p.y+.08,h:1.35-drop,w:.65,head:false},{y:p.y+1.43-drop,h:.48,w:.48,head:true}];},
};
// Dificultad de la CPU: reacción, error inicial de puntería, cuánto tarda en corregirlo, giro máximo por
// cuadro, cuánto se le atrasa la mira a un blanco que se mueve (lag) y cuánto compensa el retroceso (comp),
// qué tanto apunta a la cabeza, cuánto se cubre y usa granadas, y cuánto recuerda dónde te vio.
// Normal ya pelea en serio; Experto castiga cualquier error.
const FPS_LEVELS=[
 {name:'Normal',react:.45,spread:.12,settle:.8,turn:.045,lag:.07,comp:0,head:0,cover:.4,nade:.4,memory:4},
 {name:'Difícil',react:.3,spread:.08,settle:.5,turn:.062,lag:.04,comp:.5,head:.25,cover:.85,nade:.8,memory:8},
 {name:'Experto',react:.2,spread:.05,settle:.32,turn:.085,lag:.015,comp:.9,head:.6,cover:1,nade:1,memory:12},
];
const FPSWorld={
 limit:246,bodyHeight:1.9,solids:[],decor:[],pickups:[],spawns:[[-10,12],[36,-28],[-42,-35],[14,63]],
 rawHeight(x,z){const edge=Math.max(0,(Math.max(Math.abs(x),Math.abs(z))-95)/130);return Math.sin(x*.017)*1.6+Math.cos(z*.019)*1.5+Math.sin((x+z)*.027)*.6+edge*edge*(18+Math.sin(x*.03+z*.02)*6);},
 waterLevel(z){return .5+z*.002;},
 height(x,z){let h=this.rawHeight(x,z);const bank=clamp((Math.abs(x+115)-8)/9,0,1);h=lerp(this.waterLevel(z)-1.4,h,bank*bank*(3-2*bank));
  for(const [cx,cz,w,d]of [[38,22,26,22],[-44,-34,25,30],[86,-48,24,25],[-53,65,28,19]]){const distance=Math.max(Math.abs(x-cx)-w/2,Math.abs(z-cz)-d/2),t=clamp(distance/3,0,1);if(t<1)h=lerp(this.rawHeight(cx,cz),h,t*t*(3-2*t));}return h;},
 init(){
  if(this.solids.length)return;
  const block=(x,z,w,d,h,type='wall',base=this.height(x,z))=>{const q={x,z,w,d,h,y:base,type};this.solids.push(q);return q;};
  for(const args of [[38,22,26,22,7,'#d3c1a1'],[-44,-34,25,30,9,'#92a4a1']])FPSArchitecture.add(this,block,...args);
  const rng=srand(7441);
  for(let i=0;i<34;i++){
   const x=(rng()-.5)*180,z=(rng()-.5)*180;
   if(this.spawns.some(p=>Math.hypot(x-p[0],z-p[1])<10)||this.solids.some(b=>Math.abs(x-b.x)<b.w/2+4&&Math.abs(z-b.z)<b.d/2+4))continue;
   const type=i%3?'crate':'barrier';block(x,z,type==='crate'?3:7,type==='crate'?3:1.3,type==='crate'?2.4:1.3,type);
  }
  // Raised bridge to the western riverbank, with collidable low parapets.
  for(const z of [-66,64]){block(-112,z,40,8,.7,'bridge',this.height(-112,z)+.8);for(const s of [-1,1])block(-112,z+s*4,40,.4,.8,'barrier',this.height(-112,z)+1.5);}
  for(let i=0;i<12;i++){const a=i*TAU/12;this.pickups.push({x:Math.cos(a)*(30+i%3*23),z:Math.sin(a)*(30+i%3*23),type:i%2?'ammo':'shield',ready:0});}
  this.dress(block);this.cover(block);FPSSupplies.populate(this);
 },
 dress(block){
  for(const args of [[86,-48,24,25,6.5,'#d89973'],[-53,65,28,19,5.7,'#dfd5ba']])FPSArchitecture.add(this,block,...args);
  for(const [x,z,w,d,h,type]of [[-22,-17,8,1.1,1.1,'stone'],[22,16,8,1.1,1.1,'stone'],[-26,25,1.2,9,1.2,'stone'],[24,-29,1.2,8,1.2,'stone'],[56,62,12,4.8,3,'container'],[72,61,12,4.8,3,'container'],[61,74,4.8,12,3,'container'],[-73,-2,9,1,1.3,'stone'],[46,-62,5,2,1.2,'barrier']])block(x,z,w,d,h,type);
  for(const x of [-7,7])block(x,-76,1.5,1.8,7.4,'stone');block(0,-76,15.5,1.8,1.2,'stone',this.height(0,-76)+6.2);
  const tx=91,tz=87,base=this.height(tx,tz);for(const x of [-3,3])for(const z of [-3,3])block(tx+x,tz+z,.42,.42,10.7,'steel',base);
  block(tx,tz,7.1,7.1,.35,'roof',base+8.4);for(const z of [-3.4,3.4])block(tx,tz+z,7,.16,1.3,'steel',base+8.75);
  for(let j=0;j<29;j++)block(tx-5,tz-12+j*.6,2.6,.68,(j+1)*8.75/29,'stair',base);block(tx-3.5,tz+3.9,5,2,.35,'roof',base+8.4);
  this.decor.push({type:'tower',x:tx,z:tz,y:base});
  // Autos estacionados y tambos a la orilla de los caminos: cobertura real (frenan balas), lejos de los puntos de aparición
  const free=(x,z,w,d)=>!this.spawns.some(p=>Math.hypot(x-p[0],z-p[1])<10)&&!this.solids.some(b=>Math.abs(x-b.x)<b.w/2+w/2+1.2&&Math.abs(z-b.z)<b.d/2+d/2+1.2);
  for(const [x,z,rot,color]of [[5.6,-31,0,'#d9d6cf'],[-5.6,40,0,'#34465f'],[5.8,72,0,'#7a2b2b'],[-31,29.7,1,'#b8b2a3'],[-72,20.6,1,'#55636a'],[48,-8,1,'#c9c2b4']]){const w=rot?4.4:1.85,d=rot?1.85:4.4;if(!free(x,z,w,d))continue;const q=block(x,z,w,d,1.45,'car');q.color=color;q.rot=rot;}
  for(const [cx,cz]of [[29,33],[-27,-49],[61,57]])for(const [ox,oz]of [[0,0],[.7,.15],[.25,.68]]){const x=cx+ox,z=cz+oz;if(free(x,z,.6,.6)){const q=block(x,z,.62,.62,.9,'barrel');q.color=['#2f4f7a','#7a3f22','#4f5a3a'][Math.abs(Math.round(cx))%3];}}
  // Tree trunks are cover too. Foliage remains soft, translucent dressing.
  const rng=srand(6192);for(let i=0;i<340;i++){
   const x=(rng()-.5)*530,z=(rng()-.5)*530,near=Math.abs(x)<100&&Math.abs(z)<108;
   if(near&&i%3||Math.abs(x)<21||Math.abs(x+115)<19||this.spawns.some(p=>Math.hypot(x-p[0],z-p[1])<8)||this.solids.some(b=>Math.abs(x-b.x)<b.w/2+5&&Math.abs(z-b.z)<b.d/2+5))continue;
   const h=8+rng()*8;block(x,z,.65,.65,h*.58,'trunk');this.decor.push({type:'tree',x,z,h,y:this.height(x,z),seed:i});
  }
 },
 cover(block){
  // Staggered, flankable islands. Keep spawn exits, stairs, doors and the river free.
  const sites=[[-17,5,0],[17,-5,1],[-35,-5,2],[39,-14,0],[-17,-48,1],[19,-57,2],[-35,47,0],[41,47,1],[-76,-49,2],[-78,32,0],[-27,83,1],[26,97,2],[68,-88,0],[117,-20,1],[116,41,2],[-65,-94,0],[55,105,1],[-7,125,2],[145,84,0],[-157,24,1],[-163,-75,2],[163,-70,0]];
  for(const [x,z,kind]of sites){
   const w=kind===2?3.4:6,d=kind===2?2.3:1.05,h=kind===2?2.3:1.24,type=kind===0?'sandbag':kind===1?'gabion':'supply';
   if(this.spawns.some(p=>Math.hypot(x-p[0],z-p[1])<8)||this.solids.some(b=>Math.abs(x-b.x)<b.w/2+w/2+1&&Math.abs(z-b.z)<b.d/2+d/2+1))continue;
   block(x,z,w,d,h,type);if(kind!==2)block(x-w/2+.5,z+1.9,1,2.8,h,type);
  }
 },
 fits(p,height){return !this.solids.some(b=>this.inside(p.x,p.y,p.z,b,.34,height));},
 inside(x,y,z,b,r=.34,height=this.bodyHeight){const dx=Math.max(0,Math.abs(x-b.x)-b.w/2),dz=Math.max(0,Math.abs(z-b.z)-b.d/2);return dx*dx+dz*dz<r*r&&y<b.y+b.h-.02&&y+height>b.y+.02;},
 rayBox(o,d,b,max=999){
  let lo=0,hi=max;
  for(const [k,mid,size] of [['x',b.x,b.w],['y',b.y+b.h/2,b.h],['z',b.z,b.d]]){
   if(Math.abs(d[k])<1e-8){if(o[k]<mid-size/2||o[k]>mid+size/2)return null;continue;}
   let a=(mid-size/2-o[k])/d[k],c=(mid+size/2-o[k])/d[k];if(a>c)[a,c]=[c,a];lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi)return null;
  }return lo;
 },
 wallHit(o,d,max){
  let near=max,solid=null,normal=null;
  const end={x:o.x+d.x*max,y:o.y+d.y*max,z:o.z+d.z*max};
  for(const b of this.solids){if(Math.max(o.x,end.x)<b.x-b.w/2||Math.min(o.x,end.x)>b.x+b.w/2||Math.max(o.z,end.z)<b.z-b.d/2||Math.min(o.z,end.z)>b.z+b.d/2||Math.max(o.y,end.y)<b.y||Math.min(o.y,end.y)>b.y+b.h)continue;
   const n=this.rayBox(o,d,b,near);if(n!==null&&n<near){near=n;solid=b;}
  }
  for(let t=0;t<=Math.ceil(near);t++){const q=Math.min(t,near),x=o.x+d.x*q,z=o.z+d.z*q;if(o.y+d.y*q>this.height(x,z))continue;
   let lo=Math.max(0,q-1),hi=q;for(let i=0;i<9;i++){const m=(lo+hi)/2;if(o.y+d.y*m<=this.height(o.x+d.x*m,o.z+d.z*m))hi=m;else lo=m;}near=hi;solid={type:'earth'};break;
  }
  if(!solid)return null;const point={x:o.x+d.x*near,y:o.y+d.y*near,z:o.z+d.z*near};
  if(solid.type==='earth'){const eps=.08,nx=(this.height(point.x-eps,point.z)-this.height(point.x+eps,point.z))/(2*eps),nz=(this.height(point.x,point.z-eps)-this.height(point.x,point.z+eps))/(2*eps),len=Math.hypot(nx,1,nz);normal={x:nx/len,y:1/len,z:nz/len};}
  else{let distance=Infinity;for(const [axis,mid,size]of [['x',solid.x,solid.w],['y',solid.y+solid.h/2,solid.h],['z',solid.z,solid.d]])for(const sign of [-1,1]){const delta=Math.abs(point[axis]-mid-sign*size/2);if(delta<distance){distance=delta;normal={x:0,y:0,z:0};normal[axis]=sign;}}}
  return {distance:near,point,normal,surface:solid.type};
 },
 wallDistance(o,d,max){return this.wallHit(o,d,max)?.distance??max;},
 // Ruta de la CPU: para salir de un edificio (o entrar) se pasa por la puerta del lado del destino,
 // primero al punto de adentro y luego al de afuera; sin esto buscaba la pared más cercana y se quedaba ahí.
 route(p,goal){
  const inside=(q,b)=>Math.abs(q.x-b.x)<b.w/2&&Math.abs(q.z-b.z)<b.d/2&&q.y<b.y+2.5,houses=this.decor.filter(b=>b.type==='building');
  const from=houses.find(b=>inside(p,b)),to=houses.find(b=>inside(goal,b));if(from===to)return goal;
  const door=(b,q)=>{const side=q.z>b.z?1:-1;return {inner:{x:b.x,z:b.z+side*(b.d/2-1.3)},outer:{x:b.x,z:b.z+side*(b.d/2+2.5)}};};
  if(from){const d=door(from,goal);return Math.abs(p.x-from.x)<1.1&&Math.abs(p.z-d.inner.z)<1.5?d.outer:d.inner;}
  const d=door(to,p);return Math.hypot(p.x-d.outer.x,p.z-d.outer.z)<2?d.inner:d.outer;
 },
 move(p,dx,dz,dt){
  const oldY=p.y,height=FPSBody.bodyHeight(p);
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.2));for(let j=0;j<steps;j++)for(const [axis,delta] of [['x',dx/steps],['z',dz/steps]]){
   const target=clamp(p[axis]+delta,-this.limit,this.limit);let allowed=true,step=p.y;
   const terrain=this.height(axis==='x'?target:p.x,axis==='z'?target:p.z);if(p.grounded&&terrain-p.y>.43)allowed=false;
   for(const b of this.solids){const x=axis==='x'?target:p.x,z=axis==='z'?target:p.z;if(!this.inside(x,p.y,z,b,.34,height))continue;
    if(p.grounded&&b.y+b.h-p.y<=.42)step=Math.max(step,b.y+b.h);else{allowed=false;break;}}
   if(allowed&&step>p.y&&this.solids.some(b=>this.inside(axis==='x'?target:p.x,step,axis==='z'?target:p.z,b,.34,height)))allowed=false;
   if(allowed){p[axis]=target;p.y=step;}else p[axis==='x'?'vx':'vz']=0;
  }
  const oldFoot=p.y;p.vy-=23*dt;p.y+=p.vy*dt;let floor=this.height(p.x,p.z);
  for(const b of this.solids){if(Math.abs(p.x-b.x)>=b.w/2+.29||Math.abs(p.z-b.z)>=b.d/2+.29)continue;
   if(oldFoot>=b.y+b.h-.08&&p.y<=b.y+b.h)floor=Math.max(floor,b.y+b.h);
   if(p.vy>0&&oldFoot+height<=b.y+.1&&p.y+height>b.y){p.y=b.y-height;p.vy=0;}}
  p.grounded=p.y<=floor+.025;if(p.grounded){p.y=floor;p.vy=0;}p.landing=Math.max(0,oldY-p.y);
 },
};FPSWorld.init();

const FPSControls={
 prev:new Map(),mouse:{x:0,y:0,fire:false,aim:false,wheel:0},look:new Map(),
 reset(){this.prev.clear();this.mouse.x=this.mouse.y=this.mouse.wheel=0;this.mouse.fire=this.mouse.aim=false;},
 read(slot=0){
  const online=APP.fps?.online,pads=padInfo,keyboard=slot===0,pm=online||APP.fps?.localCount===1?ModeControls.pad('fps'):slot>0?pads.find(p=>p.index===APP.fps.devices[slot]):null;
  const b=pm?.buttons||[],a=pm?.axes||[],has=k=>keyboard&&keysDown.has(k),edge=k=>keyboard&&keyEdge('kb1',k);
  const dz=v=>Math.abs(v||0)<.16?0:(v-sign(v)*.16)/.84;
  let x=(has('KeyD')?1:0)-(has('KeyA')?1:0),z=(has('KeyW')?1:0)-(has('KeyS')?1:0);
  if(pm){const px=dz(a[0]),pz=-dz(a[1]);if(Math.abs(px)>Math.abs(x))x=px;if(Math.abs(pz)>Math.abs(z))z=pz;}
  const prev=this.prev.get(slot)||{},sprint=ModeControls.down('fps','sprint',pm,false),jump=ModeControls.down('fps','jump',pm,false),reload=ModeControls.down('fps','reload',pm,false),swap=ModeControls.down('fps','swap',pm,false),pause=ModeControls.down('fps','pause',pm,false),grenade=ModeControls.down('fps','grenade',pm,false),interact=ModeControls.down('fps','interact',pm,false);
  const out={x,z,lx:dz(a[2])*2.7/60+(keyboard?this.mouse.x*.0022:0),ly:dz(a[3])*2.05/60+(keyboard?this.mouse.y*.0022:0),fire:!!b[7]||keyboard&&this.mouse.fire,aim:!!b[6]||keyboard&&this.mouse.aim,
   grenade:grenade&&!prev.grenade||edge('KeyG'),interact:interact&&!prev.interact||edge('KeyF'),crouch:ModeControls.down('fps','crouch',pm,keyboard),sprint:has('ShiftLeft')||has('ShiftRight'),sprintTap:sprint&&!prev.sprint,jump:jump&&!prev.jump||edge('Space'),reload:reload&&!prev.reload||edge('KeyR'),swap:swap&&!prev.swap||edge('KeyQ')||keyboard&&this.mouse.wheel!==0,pause:pause&&!prev.pause||edge('Escape'),gun:-1};
  for(let i=1;i<=5;i++)if(edge('Digit'+i))out.gun=i-1;
  this.prev.set(slot,{sprint,jump,reload,swap,pause,grenade,interact});if(keyboard)this.mouse.x=this.mouse.y=this.mouse.wheel=0;
  const n=Math.hypot(out.x,out.z);if(n>1){out.x/=n;out.z/=n;}return out;
 },
 lock(){if(APP.screen==='fpsGame'&&!APP.fps.paused){try{const q=canvas.requestPointerLock();if(q?.catch)q.catch(()=>{});}catch(e){}}},
};
window.addEventListener('mousemove',e=>{if(APP.screen==='fpsGame'&&document.pointerLockElement===canvas){FPSControls.mouse.x+=e.movementX;FPSControls.mouse.y+=e.movementY;}});
canvas.addEventListener('mousedown',e=>{if(APP.screen!=='fpsGame'||APP.fps.paused)return;if(document.pointerLockElement!==canvas){const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*W/b.width,y=(e.clientY-b.top)*H/b.height;if(x>W-290&&y<80)return;}Audio8.unlock();if(e.button===0)FPSControls.mouse.fire=true;if(e.button===2)FPSControls.mouse.aim=true;FPSControls.lock();});
window.addEventListener('mouseup',e=>{if(e.button===0)FPSControls.mouse.fire=false;if(e.button===2)FPSControls.mouse.aim=false;});
canvas.addEventListener('contextmenu',e=>{if(APP.screen==='fpsGame')e.preventDefault();});
canvas.addEventListener('wheel',e=>{if(APP.screen==='fpsGame'){FPSControls.mouse.wheel=sign(e.deltaY);e.preventDefault();}},{passive:false});
window.addEventListener('keydown',e=>{if(APP.screen==='fpsGame'&&['Space','Tab','ShiftLeft','ShiftRight','KeyQ','KeyR','KeyG','KeyF','KeyC','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();});
document.addEventListener('pointerlockchange',()=>{if(APP.screen==='fpsGame'&&APP.fps?.captured&&document.pointerLockElement!==canvas){APP.fps.paused=true;FPSControls.reset();}if(document.pointerLockElement===canvas)APP.fps.captured=true;});
window.addEventListener('blur',()=>{if(APP.screen==='fpsGame'){APP.fps.paused=true;FPSControls.reset();}});

class FPSMatch{
 constructor(roster,online=false,seed=7331){
  this.online=online;this.level=1;this.rng=new SimRNG(seed);this.time=0;this.tick=0;this.paused=false;this.phase='play';this.target=12;this.duration=420;this.effects=[];this.projectiles=[];this.grenades=[];this.grenadeSeq=0;this.effectSeq=0;this.feed=[];this.pickups=FPSWorld.pickups.map(p=>({...p}));
  this.players=roster.map((q,i)=>{const [x,z]=FPSWorld.spawns[i%4];return {...q,index:i,x,y:FPSWorld.height(x,z),z,vx:0,vz:0,vy:0,yaw:Math.atan2(-x,-z),pitch:0,grounded:true,gun:q.gun||0,ammo:FPS_GUNS.map(g=>g.mag),reserve:FPS_GUNS.map(g=>g.reserve),health:100,shield:50,kills:0,deaths:0,dead:0,invuln:2,cool:0,reloading:0,sprint:false,ads:0,recoil:0,shot:0,hit:0,hurt:0,bob:0,stance:0,grenades:1,throws:0,throwTimer:0,lastDamage:-999,regenerating:false,coyote:.1,jumpBuffer:0,stepAt:0};});
  this.player=this.players[0];this.localCount=online?1:Math.max(1,this.players.filter(p=>!p.bot).length);this.devices=[null,...padInfo.slice(0,3).map(p=>p.index)];this.cameraAlpha=0;
 }
 sound(type,p,origin=p){if(type==='blast'){const listeners=this.online?[this.player]:this.players.filter(q=>!q.bot),distance=Math.min(...listeners.map(q=>Math.hypot(q.x-origin.x,q.y-origin.y,q.z-origin.z)));if(distance<85){FPSAudio.play(type,p,.8*clamp(1-distance/95,.08,1));if(distance<9)Rumble.play('local',.25,.3,120);}return;}if(p===this.player||!this.online&&!p.bot){FPSAudio.play(type,p);Rumble.play('local',type==='shot'?.1:.22,.3,type==='shot'?55:100);}else if(type==='shot'){const distance=Math.hypot(p.x-this.player.x,p.z-this.player.z);if(distance<95)FPSAudio.play(type,p,.55*clamp(1-distance/110,.08,1));}}
 // CPU con criterio: apunta a quien VE (no al más cercano a través de una pared) y recuerda dónde lo vio,
 // tarda en reaccionar, su puntería empieza con error y se corrige mientras te sigue, dispara en ráfagas,
 // pelea moviéndose de lado, rodea obstáculos, se cubre detrás de algo que le tape tu línea de tiro para
 // recargar o curarse, y lanza granadas con el arco calculado a donde te escondiste. La dificultad
 // (FPS_LEVELS) cambia reacción, error, giro, a qué apunta y cuánto usa cobertura y granadas. Sin
 // Math.random: hash1 por bot y por tiempo, así la simulación del anfitrión sigue siendo determinista.
 inputAI(p){
  const t=this.time,L=FPS_LEVELS[this.level??1]||FPS_LEVELS[1],ai=p.ai||(p.ai={target:-1,seen:-1,check:0,los:false,err:0,errP:0,head:false,side:p.index%2?1:-1,sideUntil:0,burst:0,rest:0,nav:p.yaw,navAt:0,stuckAt:0,sx:p.x,sz:p.z,unstick:0,life:-1,lx:p.x,lz:p.z,lastAt:-99,cover:null,coverAt:0,nadeAt:0});
  const r=k=>hash1(p.index*97+k,Math.floor(t*3)+k*13),g=FPS_GUNS[p.gun],eye={x:p.x,y:p.y+FPSBody.eyeHeight(p),z:p.z};
  if(ai.life!==p.deaths){ai.life=p.deaths;ai.target=-1;ai.seen=-1;ai.los=false;ai.cover=null;ai.lastAt=-99;}
  const sees=q=>{const dx=q.x-p.x,dz=q.z-p.z,dy=q.y+FPSBody.eyeHeight(q)-.25-eye.y,d=Math.hypot(dx,dy,dz);return d<1||FPSWorld.wallDistance(eye,{x:dx/d,y:dy/d,z:dz/d},d)>=d-.5;};
  if(t>=ai.check){ai.check=t+.3;let best=null,score=Infinity,vis=false;
   for(const q of this.players){if(q===p||q.dead)continue;const d=Math.hypot(q.x-p.x,q.z-p.z),v=d<FPS_GUNS[4].range&&sees(q),s=d*(v?1:2.4)*(q.index===ai.target?.8:1);if(s<score){score=s;best=q;vis=v;}}
   const id=best?best.index:-1;
   if(id!==ai.target||vis&&!ai.los){ai.target=id;ai.seen=vis?t:-1;ai.err=(r(1)-.5)*2*L.spread*(.6+.4*r(2));ai.errP=(r(3)-.5)*L.spread*.6;ai.head=r(12)<L.head;}
   if(!vis)ai.seen=-1;ai.los=vis;
  }
  const target=this.players[ai.target];if(!target||target.dead)return {};
  if(ai.los){ai.lx=target.x;ai.lz=target.z;ai.lastAt=t;}
  // sin verlo va a donde lo vio por última vez; si pasa mucho, lo busca (sabe más o menos dónde anda)
  const remember=t-ai.lastAt<L.memory,goal=ai.los||!remember?target:{x:ai.lx,z:ai.lz,y:target.y};
  const dx=target.x-p.x,dz=target.z-p.z,distance=Math.max(.01,Math.hypot(dx,dz)),flight=distance/g.velocity,bearing=Math.atan2(dx,-dz);
  const react=L.react*(.8+.4*hash1(p.index,7)),onTarget=ai.los&&ai.seen>=0?t-ai.seen:0,settle=Math.exp(-onTarget/L.settle);
  const clear=(a,len)=>FPSWorld.wallDistance({x:p.x,y:p.y+.7,z:p.z},{x:Math.sin(a),y:0,z:-Math.cos(a)},len);
  // cobertura: herido, recargando o sin balas, busca algo que le tape la línea de tiro y se agacha ahí
  const hurt=p.health<45||p.reloading>0||p.ammo[p.gun]===0;
  if(ai.cover&&(p.health>=80&&!p.reloading&&p.ammo[p.gun]>g.mag*.5||t-ai.coverAt>9))ai.cover=null;
  if(!ai.cover&&hurt&&ai.los&&t>=ai.coverAt&&r(13)<L.cover){ai.coverAt=t+1.5;ai.cover=this.findCover(p,target);if(ai.cover)ai.coverAt=t;}
  let look=bearing,x=0,z=0,sprint=false,crouch=false,jump=false,moveTo=null;
  if(ai.cover){const cd=Math.hypot(ai.cover.x-p.x,ai.cover.z-p.z);if(cd>.9)moveTo=ai.cover;else crouch=true;}
  if(ai.los&&!moveTo){
   // pelea: mantiene la distancia de su arma y se mueve de lado; cambia de lado o si choca
   const preferred=[22,24,38,11,70][p.gun],low=p.health<35;
   if(t>=ai.sideUntil||clear(p.yaw+ai.side*Math.PI/2,1.6)<1.4){ai.side*=-1;ai.sideUntil=t+.6+r(5)*1.1;}
   if(!crouch){x=ai.side*(.55+.4*r(6));z=low?-.75:distance>preferred*1.25?.8:distance<preferred*.6?-.6:0;}
   if(p.gun===4&&!low&&p.cool<=0&&!p.reloading){x=0;z=0;}
   if(p.gun===4&&distance>40&&!low&&r(8)>.35){crouch=true;x=0;}
   if(L.head>.5&&p.grounded&&r(14)>.985)jump=true;
   look=Math.atan2(dx+target.vx*(flight-L.lag),-dz-target.vz*(flight-L.lag))+ai.err*settle;
  }else{
   // sin línea de vista (o yendo a cubrirse): rodea lo que estorba; cada .35 s elige rumbo
   const dest=moveTo||goal,way=FPSWorld.route(p,dest),toward=Math.atan2(way.x-p.x,-(way.z-p.z));
   if(t>=ai.navAt){ai.navAt=t+.35;let best=toward,top=-Infinity;
    for(const o of [0,.45,-.45,.9,-.9,1.35,-1.35,1.8,-1.8]){const a=toward+o,s=Math.min(clear(a,7),7)/7+.55*Math.cos(o)+(Math.abs(Math.atan2(Math.sin(a-ai.nav),Math.cos(a-ai.nav)))<.5?.15:0);if(s>top){top=s;best=a;}}
    ai.nav=best;}
   // atorado: si en 1 s no avanzó medio metro, prueba otro rumbo un momento
   if(t>=ai.stuckAt){if(Math.hypot(p.x-ai.sx,p.z-ai.sz)<.5&&!crouch)ai.unstick=t+.8;ai.stuckAt=t+1;ai.sx=p.x;ai.sz=p.z;}
   const heading=ai.nav+(t<ai.unstick?(p.index%2?1.6:-1.6):0),rel=heading-p.yaw;look=moveTo&&ai.los?bearing:heading;
   const far=Math.hypot(dest.x-p.x,dest.z-p.z);if(far>.6&&!crouch){x=Math.sin(heading-p.yaw);z=Math.cos(heading-p.yaw);}sprint=!moveTo&&far>22&&Math.cos(rel)>.7;jump=p.grounded&&clear(heading,1.2)<1&&t<ai.unstick;
   if(!ai.los&&!moveTo&&remember&&far<3)look=bearing;
  }
  const delta=Math.atan2(Math.sin(look-p.yaw),Math.cos(look-p.yaw)),aimY=target.y+FPSBody.eyeHeight(target)-(ai.head?-.02:.35),aimPitch=Math.atan2(eye.y-aimY,distance)+ai.errP*settle+p.recoil*.35*L.comp;
  // granada con arco calculado hacia donde lo vio esconderse (no a ciegas a través del mapa)
  let grenade=false,ly=clamp(aimPitch-p.pitch,-.025,.025);
  const nd=Math.hypot(ai.lx-p.x,ai.lz-p.z);
  if(p.grenades>0&&!ai.los&&t-ai.lastAt<4&&nd>8&&nd<28&&t>=ai.nadeAt&&!p.throwTimer){
   if(!ai.nade){ai.nadeAt=t+5;if(r(15)<L.nade*.55)ai.nade={pitch:this.lobPitch(nd,FPSWorld.height(ai.lx,ai.lz)-(p.y+FPSBody.eyeHeight(p)-.12)),until:t+1.2};}
  }
  if(ai.nade){if(t>ai.nade.until)ai.nade=null;else{look=Math.atan2(ai.lx-p.x,-(ai.lz-p.z));const nd2=Math.atan2(Math.sin(look-p.yaw),Math.cos(look-p.yaw));ly=clamp(ai.nade.pitch-p.pitch,-.04,.04);if(Math.abs(nd2)<.06&&Math.abs(ai.nade.pitch-p.pitch)<.05){grenade=true;ai.nade=null;}return {x:0,z:0,lx:clamp(nd2*.4,-L.turn,L.turn),ly,grenade,crouch:false};}}
  // ráfagas: automáticas disparan .35-.8 s y descansan .2-.45 s; el francotirador espera a asentar la mira
  if(t>=ai.rest&&t>=ai.burst){ai.burst=t+.35+.45*r(9);ai.rest=ai.burst+.2+.25*r(10);}
  const auto=p.gun===1||p.gun===2,ready=onTarget>react+(p.gun===4?.45*L.settle/.45:0),aligned=Math.abs(delta)<Math.max(.025,.7/distance);
  const fire=ai.los&&ready&&aligned&&distance<g.range*.85&&(!auto||t<ai.burst)&&(p.gun!==4||Math.hypot(p.vx,p.vz)<2);
  return {x,z,lx:clamp(delta*.35,-L.turn,L.turn),ly,aim:ai.los&&distance>12&&p.gun!==3,fire,crouch,sprint,jump,
   grenade:grenade||p.grenades>0&&ai.los&&L.nade>.5&&distance>17&&distance<30&&Math.abs(delta)<.15&&r(11)>.985,reload:p.ammo[p.gun]===0||(!ai.los||!!ai.cover)&&p.ammo[p.gun]<g.mag*.4&&p.reserve[p.gun]>0};
 }
 // punto detrás de una cobertura (lado contrario al rival) que de verdad le tape la línea de tiro
 findCover(p,target){
  const te={x:target.x,y:target.y+FPSBody.eyeHeight(target),z:target.z};let best=null,score=Infinity;
  for(const b of FPSWorld.solids){if(b.h<1||b.building||['roof','bridge','stair','trunk'].includes(b.type))continue;const d=Math.hypot(b.x-p.x,b.z-p.z);if(d>18)continue;
   const ax=b.x-target.x,az=b.z-target.z,al=Math.hypot(ax,az)||1,reach=Math.max(b.w,b.d)/2+.8,c={x:b.x+ax/al*reach,z:b.z+az/al*reach};c.y=FPSWorld.height(c.x,c.z);
   if(Math.abs(c.y-p.y)>1.2||!FPSWorld.fits({x:c.x,y:c.y,z:c.z},FPSBody.height))continue;
   const dx=c.x-te.x,dy=c.y+.9-te.y,dz=c.z-te.z,dl=Math.hypot(dx,dy,dz);if(FPSWorld.wallDistance(te,{x:dx/dl,y:dy/dl,z:dz/dl},dl)>=dl-.4)continue;
   const s=Math.hypot(c.x-p.x,c.z-p.z);if(s<score){score=s;best=c;}}
  return best;
 }
 // inclinación para que la granada (17 m/s, +4.5 m/s hacia arriba) caiga a cierta distancia y altura
 lobPitch(d,dy){let best=0,err=Infinity;for(let pitch=-.9;pitch<=.5;pitch+=.02){const h=Math.cos(pitch)*17,vy=4.5-Math.sin(pitch)*17,time=d/h,y=vy*time-4.905*time*time,e=Math.abs(y-dy);if(e<err){err=e;best=pitch;}}return best;}
 move(p,I,dt){
  if(p.dead)return;
  const look=I.absoluteLook?1:this.lookScale(p);p.yaw+=clamp(I.lx||0,-.3,.3)*look;p.yaw=Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw));p.pitch=clamp(p.pitch+clamp(I.ly||0,-.3,.3)*look,-1.4,1.4);
  const desired=I.crouch&&p.grounded?1:0,next=approach(FPSBody.stance(p),desired,dt*7);
  if(next>=FPSBody.stance(p)||FPSWorld.fits(p,FPSBody.height-FPSBody.drop*next))p.stance=next;
  // barrida: agacharse mientras corres te lanza ~0.7 s a ras de suelo (rápido al inicio, frena al final)
  const pace=Math.hypot(p.vx,p.vz);if(I.crouch&&p.sprint&&p.grounded&&!(p.slide>0)&&pace>7){p.slide=.7;p.slideX=p.vx/pace;p.slideZ=p.vz/pace;this.sound('step',p);}
  if(I.sprintTap)p.sprint=!p.sprint;if(I.sprint)p.sprint=true;if(I.z<.15||I.aim||I.fire||p.stance>.05||I.crouch)p.sprint=false;
  p.ads=approach(p.ads,I.aim&&!p.sprint&&!p.reloading?1:0,dt*8);p.recoil=approach(p.recoil,0,dt*.22);
  const wading=Math.abs(p.x+115)<11&&p.y<FPSWorld.waterLevel(p.z)-.25,speed=(p.stance>.1?2.8:p.sprint?10.2:p.ads>.5?3.1:6.1)*(wading?.63:1),x=I.x||0,z=I.z||0,dx=(Math.cos(p.yaw)*x+Math.sin(p.yaw)*z)*speed,dz=(Math.sin(p.yaw)*x-Math.cos(p.yaw)*z)*speed;
  if(p.slide>0){p.slide=!I.crouch||!p.grounded?0:Math.max(0,p.slide-dt);const v=lerp(5.5,12.5,p.slide/.7);p.vx=p.slideX*v;p.vz=p.slideZ*v;}
  else{p.vx=approach(p.vx,dx,dt*(p.grounded?48:13));p.vz=approach(p.vz,dz,dt*(p.grounded?48:13));}
  p.coyote=p.grounded?.09:Math.max(0,p.coyote-dt);p.jumpBuffer=I.jump?.12:Math.max(0,p.jumpBuffer-dt);
  if(p.jumpBuffer&&p.coyote&&p.stance<.15){p.vy=8.1;p.grounded=false;p.coyote=p.jumpBuffer=0;this.sound('jump',p);}
  FPSWorld.move(p,p.vx*dt,p.vz*dt,dt);p.bob+=Math.hypot(p.vx,p.vz)*dt;p.hurt=Math.max(0,p.hurt-dt);p.hit=Math.max(0,p.hit-dt);p.invuln=Math.max(0,p.invuln-dt);p.throwTimer=Math.max(0,(p.throwTimer||0)-dt);
  if(p.grounded&&Math.hypot(p.vx,p.vz)>1&&p.bob-p.stepAt>2.3){p.stepAt=p.bob;this.sound('step',p);}
 }
 update(inputs,dt=1/60){
  if(this.paused&&!this.online)return;
  this.time+=dt;this.tick++;for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);this.feed=this.feed.filter(f=>this.time-f.time<5);
  for(const p of this.players){
   p.prev={x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,stance:p.stance};if(p.dead){p.dead-=dt;if(p.dead<=0)this.respawn(p);continue;}
   const I=p.bot||p.disconnected?this.inputAI(p):inputs[p.index]||{};this.move(p,I,dt);p.cool=Math.max(0,p.cool-dt);if(I.grenade)FPSSupplies.throw(this,p);
   if(p.reloading){p.reloading-=dt;if(p.reloading<=0){const n=Math.min(FPS_GUNS[p.gun].mag-p.ammo[p.gun],p.reserve[p.gun]);p.ammo[p.gun]+=n;p.reserve[p.gun]-=n;p.reloading=0;this.sound('ready',p);}}
   const gun=I.gun>=0?I.gun:I.swap?(p.gun+1)%5:p.gun;
   if(Number.isInteger(gun)&&gun>=0&&gun<5&&gun!==p.gun){p.gun=gun;p.reloading=0;p.cool=Math.max(.22,p.cool);}
   const g=FPS_GUNS[p.gun];if(I.reload&&!p.reloading&&p.ammo[p.gun]<g.mag&&p.reserve[p.gun]>0){p.reloading=g.reload;p.sprint=false;this.sound('reload',p);}
   if(I.fire&&!p.cool&&!p.reloading&&!p.sprint&&!p.throwTimer){if(p.ammo[p.gun])this.fire(p);else {p.cool=.2;this.sound('empty',p);}}
   FPSSupplies.collect(this,p,I);
  }
  this.stepProjectiles(dt);FPSSupplies.step(this,dt);
  for(const p of this.players){const eligible=Math.max(0,Math.min(dt,this.time-p.lastDamage-FPSBody.regenDelay));p.regenerating=!p.dead&&p.health>0&&p.health<100&&eligible>0;if(p.regenerating)p.health=Math.min(100,p.health+FPSBody.regenRate*eligible);}
  if(this.phase==='play'&&(this.time>=this.duration||this.players.some(p=>p.kills>=this.target)))this.phase='done';
 }
 lookScale(p){return lerp(1,p.gun===4?.28:.62,p.ads);}
 fire(p){
  const g=FPS_GUNS[p.gun],recoil=p.recoil;p.ammo[p.gun]--;p.cool=g.rate;p.shot++;this.sound('shot',p);
  const o={x:p.x,y:p.y+FPSBody.eyeHeight(p),z:p.z};
  for(let j=0;j<g.pellets;j++){
   const motion=1+(!p.grounded?1.5:Math.hypot(p.vx,p.vz)>4?.35:0),spread=lerp(g.spread,g.ads,p.ads)*motion,yaw=p.yaw+(this.rng.next()-.5)*spread*2,zero=p.ads*g.gravity*g.zero/(2*g.velocity*g.velocity),pitch=p.pitch-recoil*.35-zero+(this.rng.next()-.5)*spread*2,d={x:Math.sin(yaw)*Math.cos(pitch),y:-Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};
   this.projectiles.push({pos:{...o},velocity:{x:d.x*g.velocity,y:d.y*g.velocity,z:d.z*g.velocity},owner:p.index,gun:p.gun,distance:0});
  }p.recoil=Math.min(.16,recoil+g.kick);if(this.projectiles.length>160)this.projectiles.splice(0,this.projectiles.length-160);
 }
 impact(point,normal,surface,owner,gun){this.effects.push({type:'impact',a:point,b:normal,surface,owner,gun,life:.55,maxLife:.55,seq:++this.effectSeq});if(this.effects.length>180)this.effects.splice(0,this.effects.length-180);}
 stepProjectiles(dt){
  const steps=Math.max(1,Math.ceil(dt/(1/120))),step=dt/steps;
  for(let j=0;j<steps;j++){
   const live=[];for(const bullet of this.projectiles){const g=FPS_GUNS[bullet.gun],o=bullet.pos,v=bullet.velocity;const end={x:o.x+v.x*step,y:o.y+v.y*step-g.gravity*step*step*.5,z:o.z+v.z*step},length=Math.hypot(end.x-o.x,end.y-o.y,end.z-o.z),d={x:(end.x-o.x)/length,y:(end.y-o.y)/length,z:(end.z-o.z)/length},wall=FPSWorld.wallHit(o,d,Math.min(length,g.range-bullet.distance));let near=wall?.distance??Math.min(length,g.range-bullet.distance),victim=null,head=false;
    for(const q of this.players){if(q.index===bullet.owner||q.dead||q.invuln)continue;for(const part of FPSBody.hitboxes(q)){const t=FPSWorld.rayBox(o,d,{x:q.x,y:part.y,z:q.z,w:part.w,d:part.w,h:part.h},near);if(t!==null&&t<near){near=t;victim=q;head=part.head;}}}
    const point={x:o.x+d.x*near,y:o.y+d.y*near,z:o.z+d.z*near};this.effects.push({type:'trace',a:{...o},b:point,life:.045,maxLife:.045,owner:bullet.owner,gun:bullet.gun});bullet.distance+=near;
    if(victim){const p=this.players[bullet.owner],damage=Math.round(g.damage*(head?g.headMultiplier:1)*clamp(1-bullet.distance/g.range*.45,.55,1));this.damage(p,victim,damage,{head,point,normal:{x:-d.x,y:-d.y,z:-d.z},gun:bullet.gun});
    }else if(wall)this.impact(point,wall.normal,wall.surface,bullet.owner,bullet.gun);
    else if(bullet.distance<g.range-.001){bullet.pos=end;v.y-=g.gravity*step;live.push(bullet);}
   }this.projectiles=live;
  }
  if(this.effects.length>180)this.effects.splice(0,this.effects.length-180);
 }
 damage(p,victim,amount,{head=false,point=null,normal=null,gun=p.gun,kind='bullet'}={}){
  if(!victim||victim.dead||victim.invuln||amount<=0)return false;const shield=Math.min(victim.shield,amount);victim.shield-=shield;victim.health=Math.max(0,victim.health-amount+shield);victim.lastDamage=this.time;victim.regenerating=false;victim.hurt=.35;
  if(p!==victim){p.hit=.24;p.hitKind=head?'head':shield?'shield':'body';this.sound('hit',p);}if(point)this.impact(point,normal,shield?'shield':'body',p.index,gun);
  if(!victim.health){victim.dead=3;victim.deaths++;if(p!==victim)p.kills++;this.feed.push({time:this.time,from:p.index,to:victim.index,head,kind});if(this.feed.length>4)this.feed.shift();}return true;
 }
 respawn(p){const spots=FPSWorld.spawns.map(([x,z])=>({x,z,safety:Math.min(...this.players.filter(q=>q!==p&&!q.dead).map(q=>Math.hypot(q.x-x,q.z-z)),999)})).sort((a,b)=>b.safety-a.safety),q=spots[0];Object.assign(p,{x:q.x,z:q.z,y:FPSWorld.height(q.x,q.z),vx:0,vz:0,vy:0,health:100,shield:50,dead:0,invuln:2,reloading:0,recoil:0,cool:.4,grounded:true,stance:0,grenades:1,throwTimer:0,lastDamage:this.time,regenerating:false,sprint:false,ads:0,hit:0,hurt:0,jumpBuffer:0,coyote:.1,slide:0});p.ammo=FPS_GUNS.map(g=>g.mag);p.reserve=FPS_GUNS.map(g=>g.reserve);}
}
const FPSAudio={play(type,p,gain=1){const source=Audio8;if(!source.ready)return;const a={noise:(d,v,...rest)=>source.noise(d,v*gain,...rest),tone:(w,f0,f1,d,v,...rest)=>source.tone(w,f0,f1,d,v*gain,...rest)},g=FPS_GUNS[p.gun];if(type==='shot'){const heavy=g.kind==='sniper'||g.kind==='shotgun';a.noise(heavy?.18:.065,heavy?.13:.085,heavy?950:g.kind==='smg'?2400:1750,.7,0,'bandpass');a.noise(.014,.085,4200,.7,0,'highpass');a.tone('sine',heavy?78:150,35,heavy?.19:.08,heavy?.1:.05);a.noise(heavy?.22:.13,.025,750,.5,.02,'lowpass');}else if(type==='throw'){a.noise(.09,.025,1400,.7);}else if(type==='blast'){a.noise(.52,.12,650,.6,0,'lowpass');a.tone('sine',64,25,.45,.1);}else if(type==='hit'){a.tone('sine',920,1250,.045,.035);}else if(type==='step')a.noise(.045,.012,280,.6);else if(type==='reload'){a.noise(.045,.035,2300,.8);a.noise(.08,.023,1000,.7,.12);}else if(type==='empty')a.tone('triangle',600,300,.025,.025);else if(type==='ready')a.tone('sine',790,990,.06,.025);}};
