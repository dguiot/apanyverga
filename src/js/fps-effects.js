'use strict';
// Bounded GPU pools: flight trails, dust/sparks, surface marks and brass.
class FPSFX{
 static sprite(options){const T=KartGL,m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({...options,side:T.DoubleSide}));m.userData.billboard=true;return m;}
 static texture(dust=false){const T=KartGL,cv=mkCanvas(128,128),c=cv.getContext('2d'),g=c.createRadialGradient(64,64,1,64,64,64);g.addColorStop(0,dust?'rgba(255,255,255,.65)':'#fff');g.addColorStop(.16,dust?'rgba(245,243,227,.6)':'rgba(255,238,174,.95)');g.addColorStop(.5,dust?'rgba(199,185,157,.3)':'rgba(255,173,63,.25)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128);return new T.CanvasTexture(cv);}
 static smokeTexture(){const T=KartGL,cv=mkCanvas(128,128),c=cv.getContext('2d'),rng=srand(4411);for(let i=0;i<9;i++){const x=40+rng()*48,y=40+rng()*48,r=22+rng()*26,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128);}const t=new T.CanvasTexture(cv);return t;}
 static scorchTexture(){const T=KartGL,cv=mkCanvas(128,128),c=cv.getContext('2d'),rng=srand(902),g=c.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,'rgba(10,9,8,.95)');g.addColorStop(.45,'rgba(24,20,16,.75)');g.addColorStop(1,'rgba(30,26,20,0)');c.fillStyle=g;c.fillRect(0,0,128,128);for(let i=0;i<26;i++){const a=rng()*TAU,l=26+rng()*34;c.strokeStyle='rgba(15,12,10,.5)';c.lineWidth=1+rng()*2.5;c.beginPath();c.moveTo(64,64);c.lineTo(64+Math.cos(a)*l,64+Math.sin(a)*l);c.stroke();}return new T.CanvasTexture(cv);}
 constructor(scene){
  const T=KartGL;this.scene=scene;this.seen=new Set();this.shots=new Map();this.decalIndex=0;this.particleIndex=0;this.casingIndex=0;this.glow=FPSFX.texture();this.dust=FPSFX.texture(true);
  this.trails=[[.007,'#fff4c7',.95],[.022,'#ffbd61',.16]].map(([radius,color,opacity])=>{const m=new T.InstancedMesh(new T.CylinderGeometry(radius,radius,1,5),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending}),48);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.count=0;m.frustumCulled=false;scene.add(m);return m;});
  this.particles=Array.from({length:120},()=>{const m=FPSFX.sprite({map:this.dust,transparent:true,depthWrite:false,opacity:0});m.visible=false;scene.add(m);return {mesh:m,life:0,normalBlending:m.material.blending};});
  const cv=mkCanvas(64,64),c=cv.getContext('2d'),rng=srand(86);c.fillStyle='#171b19';c.beginPath();for(let i=0;i<16;i++){const a=i*TAU/16,r=7+rng()*7;c.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r);}c.fill();for(let i=0;i<6;i++){c.strokeStyle='rgba(19,25,22,.4)';c.lineWidth=.8;c.beginPath();c.moveTo(32,32);c.lineTo(32+(rng()-.5)*60,32+(rng()-.5)*60);c.stroke();}const scar=new T.CanvasTexture(cv);
  this.decals=Array.from({length:40},()=>{const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:scar,transparent:true,opacity:.72,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.visible=false;scene.add(m);return {mesh:m,life:0};});
  this.blasts=Array.from({length:4},()=>{const mesh=FPSFX.sprite({map:this.glow,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:'#ffcf87'});mesh.visible=false;scene.add(mesh);return {mesh,life:0};});this.blastIndex=0;
  // explosión: bola de fuego, humo que sube, esquirlas, onda en el suelo, marca quemada y luz propia
  this.smokeTex=FPSFX.smokeTexture();this.scorchTex=FPSFX.scorchTexture();this.fireIndex=this.smokeIndex=this.debrisIndex=this.ringIndex=this.scorchIndex=0;this.blastLife=0;this.shakes=[];
  this.fire=Array.from({length:12},()=>{const mesh=FPSFX.sprite({map:this.glow,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:'#ffa040'});mesh.visible=false;scene.add(mesh);return {mesh,life:0};});
  this.smoke=Array.from({length:36},()=>{const mesh=FPSFX.sprite({map:this.smokeTex,transparent:true,depthWrite:false,opacity:0,color:'#57534d'});mesh.visible=false;mesh.renderOrder=2;scene.add(mesh);return {mesh,life:0};});
  {const geo=new T.DodecahedronGeometry(.045,0),mat=new T.MeshStandardMaterial({color:'#3b362e',roughness:.92});this.debris=Array.from({length:24},()=>{const mesh=new T.Mesh(geo,mat);mesh.visible=false;mesh.castShadow=true;scene.add(mesh);return {mesh,life:0};});}
  this.rings=Array.from({length:3},()=>{const mesh=new T.Mesh(new T.RingGeometry(.86,1,48),new T.MeshBasicMaterial({color:'#fff0d0',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return {mesh,life:0};});
  this.scorches=Array.from({length:6},()=>{const mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:this.scorchTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return {mesh,life:0};});
  this.blastLight=ART.hi?new T.PointLight('#ffa040',0,26,2):null;if(this.blastLight)scene.add(this.blastLight);
  this.casings=Array.from({length:36},()=>{const m=new T.Mesh(new T.CylinderGeometry(.009,.009,.042,6),new T.MeshStandardMaterial({color:'#c09b57',metalness:.72,roughness:.35}));m.visible=false;scene.add(m);return {mesh:m,life:0};});
 }
 impact(e){
  const T=KartGL,shield=e.surface==='shield',body=e.surface==='body',metal=['steel','roof','container','car','barrel'].includes(e.surface),rng=srand(e.seq*113+e.owner*239),n=e.b;
  for(let i=0;i<(Prefs.fx==='full'?8:3);i++){const q=this.particles[this.particleIndex++%this.particles.length],spark=shield||metal&&i<5;q.life=q.total=spark?.15+rng()*.17:.32+rng()*.4;q.spark=spark;q.size=spark?.05+rng()*.07:.12+rng()*.2;q.velocity={x:n.x*(spark?3:1.1)+(rng()-.5)*2,y:n.y*1.8+rng()*1.4,z:n.z*(spark?3:1.1)+(rng()-.5)*2};q.mesh.position.set(e.a.x+n.x*.025,e.a.y+n.y*.025,e.a.z+n.z*.025);q.mesh.material.map=spark?this.glow:this.dust;q.mesh.material.blending=spark?T.AdditiveBlending:q.normalBlending;q.mesh.material.color.set(shield?'#78d8ff':body?'#dba274':metal?'#ffd288':'#dfc9a2');q.mesh.visible=true;}
  if(!shield&&!body){const q=this.decals[this.decalIndex++%this.decals.length];q.life=12;q.mesh.position.set(e.a.x+n.x*.016,e.a.y+n.y*.016,e.a.z+n.z*.016);q.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(n.x,n.y,n.z));q.mesh.rotateZ(rng()*TAU);q.mesh.scale.setScalar(e.gun===3?.26:.17);q.mesh.visible=true;}
 }
 blast(e){
  this.detonate(e);const rng=srand(e.seq*371),flash=this.blasts[this.blastIndex++%this.blasts.length];flash.life=.22;flash.mesh.position.set(e.a.x,e.a.y+.45,e.a.z);flash.mesh.visible=true;
  for(let i=0;i<(Prefs.fx==='full'?30:12);i++){const q=this.particles[this.particleIndex++%this.particles.length],a=rng()*TAU,spark=i<8;q.life=q.total=spark?.25+rng()*.22:.7+rng()*.6;q.spark=spark;q.size=spark?.12:.45+rng()*.4;q.velocity={x:Math.cos(a)*(1.3+rng()*5),y:1.5+rng()*3,z:Math.sin(a)*(1.3+rng()*5)};q.mesh.position.set(e.a.x,e.a.y+.16,e.a.z);q.mesh.material.map=spark?this.glow:this.dust;q.mesh.material.blending=spark?KartGL.AdditiveBlending:q.normalBlending;q.mesh.material.color.set(spark?'#ffcf88':'#969181');q.mesh.visible=true;}
 }
 // el resto de la explosión (sale de la misma semilla: igual en todas las pantallas)
 detonate(e){
  const rng=srand(e.seq*733+5),full=Prefs.fx==='full',ground=FPSWorld.height(e.a.x,e.a.z);
  for(let i=0;i<(full?6:3);i++){const q=this.fire[this.fireIndex++%this.fire.length];q.life=q.total=.26+rng()*.2;q.size=1.3+rng()*1.5;q.vy=1.2+rng()*2.2;q.mesh.position.set(e.a.x+(rng()-.5)*.7,e.a.y+.25+rng()*.6,e.a.z+(rng()-.5)*.7);q.mesh.visible=true;}
  for(let i=0;i<(full?12:5);i++){const q=this.smoke[this.smokeIndex++%this.smoke.length];q.life=q.total=1.9+rng()*1.7;q.size=.9+rng()*.9;q.grow=2.6+rng()*2.8;q.velocity={x:(rng()-.5)*1.6,y:.8+rng()*1.7,z:(rng()-.5)*1.6};q.mesh.position.set(e.a.x+(rng()-.5)*.8,e.a.y+.3+rng()*.5,e.a.z+(rng()-.5)*.8);q.mesh.visible=true;}
  for(let i=0;i<(full?10:4);i++){const q=this.debris[this.debrisIndex++%this.debris.length],a=rng()*TAU,up=.35+rng()*.6,v=5+rng()*7;q.life=1.8;q.velocity={x:Math.cos(a)*v*(1-up*.5),y:v*up+2,z:Math.sin(a)*v*(1-up*.5)};q.spin={x:rng()*12,y:rng()*12};q.mesh.position.set(e.a.x,e.a.y+.2,e.a.z);q.mesh.scale.setScalar(.6+rng()*.9);q.mesh.visible=true;}
  if(e.a.y-ground<1.4){const r=this.rings[this.ringIndex++%this.rings.length];r.life=.42;r.mesh.position.set(e.a.x,ground+.06,e.a.z);r.mesh.visible=true;const sc=this.scorches[this.scorchIndex++%this.scorches.length];sc.life=20;sc.mesh.position.set(e.a.x,ground+.025,e.a.z);sc.mesh.rotation.z=rng()*TAU;sc.mesh.scale.setScalar(2.6+rng()*1.2);sc.mesh.visible=true;}
  this.blastLife=.38;this.blastLight?.position.set(e.a.x,e.a.y+1.2,e.a.z);this.shakes.push({x:e.a.x,y:e.a.y,z:e.a.z,t:0,ring:false});if(this.shakes.length>4)this.shakes.shift();
 }
 // sacudida según la distancia (y zumbido de oídos si fue muy cerca); respeta "movimiento reducido"
 shake(camera){
  let ox=0,oy=0,rot=0;for(const s of this.shakes){const d=Math.hypot(camera.position.x-s.x,camera.position.y-s.y,camera.position.z-s.z),near=clamp(1-d/28,0,1)**2,amp=near*Math.exp(-s.t*5)*.32;
   if(!s.ring&&d<7){s.ring=true;if(typeof Audio8!=='undefined'&&Audio8.ready)Audio8.tone('sine',3700,3500,1.6,.02);}
   ox+=Math.sin(s.t*61)*amp;oy+=Math.sin(s.t*47+1)*amp;rot+=Math.sin(s.t*39)*amp*.12;}
  if(reducedMotion)return;camera.position.x+=ox*.6;camera.position.y+=oy*.5;camera.rotation.z+=rot;
 }
 casing(p){const q=this.casings[this.casingIndex++%this.casings.length],r=srand(p.shot*173+p.index*7),x=Math.cos(p.yaw),z=Math.sin(p.yaw);q.life=2.4;q.bounced=false;q.velocity={x:x*(1.6+r()),y:1.6+r(),z:z*(1.6+r())};q.mesh.position.set(p.x+x*.28,p.y+FPSBody.eyeHeight(p)-.22,p.z+z*.28);q.mesh.rotation.set(r()*3,r()*3,1.2);q.mesh.visible=true;}
 face(camera){for(const q of [...this.fire,...this.smoke])if(q.mesh.visible)q.mesh.quaternion.copy(camera.quaternion);for(const q of this.blasts)if(q.mesh.visible)q.mesh.quaternion.copy(camera.quaternion);for(const q of this.particles)if(q.mesh.visible)q.mesh.quaternion.copy(camera.quaternion);}
 update(match,dt){
  const T=KartGL,step=match.paused&&!match.online?0:Math.min(dt||1/60,.05),traces=match.effects.filter(e=>e.type==='trace');
  for(const p of match.players){const before=this.shots.get(p.index)??p.shot;if(p.shot>before)this.casing(p);this.shots.set(p.index,p.shot);}
  const count=Math.min(Prefs.fx==='full'?48:16,traces.length),up=new T.Vector3(0,1,0);for(const m of this.trails)m.count=count;
  for(let i=0;i<count;i++){const e=traces[traces.length-1-i],a=new T.Vector3(e.a.x,e.a.y,e.a.z),b=new T.Vector3(e.b.x,e.b.y,e.b.z),d=b.clone().sub(a),len=d.length(),q=new T.Quaternion().setFromUnitVectors(up,d.normalize()),fade=Math.min(1,e.life/.045),matrix=new T.Matrix4().compose(a.add(b).multiplyScalar(.5),q,new T.Vector3(fade,Math.max(.002,len),fade));for(const m of this.trails)m.setMatrixAt(i,matrix);}for(const m of this.trails)m.instanceMatrix.needsUpdate=true;
  for(const e of match.effects)if(e.type==='blast'&&!this.seen.has('blast:'+e.seq)){this.seen.add('blast:'+e.seq);match.sound('blast',match.players[e.owner],e.a);this.blast(e);}
  for(const q of this.blasts){if(q.life<=0)continue;q.life=Math.max(0,q.life-step);q.mesh.visible=q.life>0;q.mesh.scale.setScalar(2+(1-q.life/.22)*8);q.mesh.material.opacity=q.life/.22*.8;}
  for(const e of match.effects)if(e.type==='impact'&&!this.seen.has(e.seq)){this.seen.add(e.seq);this.impact(e);}if(this.seen.size>512)this.seen=new Set([...this.seen].slice(-128));
  for(const q of this.particles){if(q.life<=0)continue;q.life-=step;const t=Math.max(0,q.life/q.total);q.mesh.visible=q.life>0;q.velocity.y-=step*(q.spark?7:1.4);q.mesh.position.x+=q.velocity.x*step;q.mesh.position.y+=q.velocity.y*step;q.mesh.position.z+=q.velocity.z*step;q.mesh.scale.setScalar(q.size*(q.spark?1:1+(1-t)*4));q.mesh.material.opacity=t*(q.spark?.8:.36);}
  for(const q of this.decals){if(q.life<=0)continue;q.life-=step;q.mesh.visible=q.life>0;q.mesh.material.opacity=Math.min(.72,q.life*.3);}
  for(const q of this.casings){if(q.life<=0)continue;q.life-=step;q.mesh.visible=q.life>0;q.velocity.y-=9.81*step;const p=q.mesh.position;p.x+=q.velocity.x*step;p.y+=q.velocity.y*step;p.z+=q.velocity.z*step;const ground=FPSWorld.height(p.x,p.z)+.015;if(p.y<ground){p.y=ground;q.velocity.y=Math.abs(q.velocity.y)*(q.bounced?.12:.34);q.velocity.x*=.55;q.velocity.z*=.55;q.bounced=true;}q.mesh.rotation.x+=step*7;q.mesh.rotation.z+=step*5;}
  for(const q of this.fire){if(q.life<=0)continue;q.life-=step;const t=Math.max(0,q.life/q.total);q.mesh.visible=q.life>0;q.mesh.position.y+=q.vy*step;q.mesh.scale.setScalar(q.size*(1+(1-t)*1.6));q.mesh.material.opacity=t*.95;q.mesh.material.color.setRGB(1,.42+.4*t,.12+.25*t*t);}
  for(const q of this.smoke){if(q.life<=0)continue;q.life-=step;const t=1-Math.max(0,q.life/q.total);q.mesh.visible=q.life>0;const p=q.mesh.position;p.x+=q.velocity.x*step;p.y+=q.velocity.y*step;p.z+=q.velocity.z*step;q.velocity.x*=.985;q.velocity.z*=.985;q.velocity.y=Math.max(.25,q.velocity.y*.99);q.mesh.scale.setScalar(q.size+q.grow*Math.sqrt(t));q.mesh.material.opacity=Math.min(1,t*7)*Math.min(1,(1-t)*1.7)*.62;}
  for(const q of this.debris){if(q.life<=0)continue;q.life-=step;q.mesh.visible=q.life>0;const p=q.mesh.position;q.velocity.y-=9.81*step;p.x+=q.velocity.x*step;p.y+=q.velocity.y*step;p.z+=q.velocity.z*step;q.mesh.rotation.x+=q.spin.x*step;q.mesh.rotation.y+=q.spin.y*step;const g=FPSWorld.height(p.x,p.z)+.03;if(p.y<g){p.y=g;q.velocity.y=Math.abs(q.velocity.y)*.3;q.velocity.x*=.5;q.velocity.z*=.5;q.spin.x*=.5;q.spin.y*=.5;}}
  for(const q of this.rings){if(q.life<=0)continue;q.life-=step;const t=1-Math.max(0,q.life/.42);q.mesh.visible=q.life>0;q.mesh.scale.setScalar(.6+t*5);q.mesh.material.opacity=(1-t)*(1-t)*.4;}
  for(const q of this.scorches){if(q.life<=0)continue;q.life-=step;q.mesh.visible=q.life>0;q.mesh.material.opacity=Math.min(.88,q.life*.3);}
  this.blastLife=Math.max(0,this.blastLife-step);if(this.blastLight)this.blastLight.intensity=70*(this.blastLife/.38)**2;
  for(const s of this.shakes)s.t+=step;this.shakes=this.shakes.filter(s=>s.t<1.2);
 }
}
