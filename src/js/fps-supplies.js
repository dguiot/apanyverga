'use strict';
// Shared by local simulation and the authoritative online host. World loot
// uses terrain/solid heights and an unobstructed reach, including upstairs.
const FPSSupplies={
 maxGrenades:2,fuse:2.6,blastRadius:8,blastDamage:105,
 populate(world){
  world.pickups=[];
  const add=(x,z,type,gun=-1)=>{
   // Find a nearby walkable spot rather than hiding supplies inside scenery.
   for(let n=0;n<40;n++){const a=n*2.4,r=n?1.2+Math.sqrt(n)*.7:0,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,y=world.height(px,pz);
    if(world.solids.some(b=>world.inside(px,y,pz,b,.7,2)))continue;world.pickups.push({x:px,y,z:pz,type,gun,ready:0});return;
   }
  };
  for(const [x,z]of [[-9,18],[29,-21],[-34,-26],[12,54],[-18,-46],[47,45],[-74,22],[91,-33]])add(x,z,'ammo');
  for(const [x,z]of [[-23,29],[24,-37],[-67,-52],[68,52]])add(x,z,'shield');
  for(const [gun,x,z]of [[0,-12,29],[1,17,11],[2,-32,-7],[3,45,39],[4,0,-65],[2,-70,49],[1,89,-58]])add(x,z,'weapon',gun);
  for(const [x,z]of [[-19,1],[19,-12],[-35,44],[66,-28],[-67,-18],[30,78]])add(x,z,'grenade');
 },
 reachable(p,q){
  const y=q.y??FPSWorld.height(q.x,q.z);if(Math.abs(p.y-y)>1.15||Math.hypot(p.x-q.x,p.z-q.z)>1.9)return false;
  const eye={x:p.x,y:p.y+Math.min(FPSBody.eyeHeight(p),1),z:p.z},dx=q.x-eye.x,dy=y+.35-eye.y,dz=q.z-eye.z,len=Math.hypot(dx,dy,dz);return len<.01||FPSWorld.wallDistance(eye,{x:dx/len,y:dy/len,z:dz/len},len)>=len-.08;
 },
 near(m,p,type='weapon'){return m.pickups.filter(q=>q.type===type&&q.ready<=m.time&&this.reachable(p,q)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||null;},
 collect(m,p,I){
  for(const q of m.pickups){if(q.ready>m.time||!this.reachable(p,q))continue;let changed=false;
   if(q.type==='ammo')for(let i=0;i<FPS_GUNS.length;i++){const g=FPS_GUNS[i],next=Math.min(g.reserve,p.reserve[i]+g.mag*2);if(next>p.reserve[i]){p.reserve[i]=next;changed=true;}}
   if(q.type==='shield'&&p.shield<50){p.shield=50;changed=true;}
   if(q.type==='grenade'&&p.grenades<this.maxGrenades){p.grenades++;changed=true;}
   if(q.type==='weapon'&&I.interact){const g=FPS_GUNS[q.gun];p.gun=q.gun;p.reloading=0;p.cool=Math.max(.3,p.cool);p.ammo[p.gun]=g.mag;p.reserve[p.gun]=Math.min(g.reserve,p.reserve[p.gun]+g.mag*2);changed=true;I={...I,interact:false};}
   if(changed){q.ready=m.time+(q.type==='weapon'?20:q.type==='grenade'?18:15);p.pickupText=q.type==='ammo'?'MUNICIÓN +':q.type==='shield'?'ESCUDO +50':q.type==='grenade'?'GRANADA +1':FPS_GUNS[q.gun].name.toUpperCase();p.pickupUntil=m.time+1.5;m.sound('ready',p);}
  }
 },
 throw(m,p){
  if(p.dead||p.grenades<=0||p.throwTimer>0||m.grenades.length>=8)return false;
  p.grenades--;p.throws++;p.throwTimer=.5;p.sprint=false;p.reloading=0;p.cool=Math.max(p.cool,.45);
  const pitch=clamp(p.pitch,-1.2,.9),c=Math.cos(pitch),s=Math.sin(pitch);
  m.grenades.push({seq:++m.grenadeSeq,owner:p.index,pos:{x:p.x,y:p.y+FPSBody.eyeHeight(p)-.12,z:p.z},velocity:{x:Math.sin(p.yaw)*c*17+p.vx*.3,y:4.5-s*17,z:-Math.cos(p.yaw)*c*17+p.vz*.3},fuse:this.fuse});m.sound('throw',p);return true;
 },
 step(m,dt){
  const steps=Math.max(1,Math.ceil(dt/(1/120))),step=dt/steps;
  for(let i=0;i<steps;i++){
   const live=[];for(const g of m.grenades){g.prev={...g.pos};const p=g.pos,v=g.velocity,dx=v.x*step,dy=v.y*step-4.905*step*step,dz=v.z*step,len=Math.hypot(dx,dy,dz);v.y-=9.81*step;
    if(len>1e-6){const dir={x:dx/len,y:dy/len,z:dz/len},hit=FPSWorld.wallHit(p,dir,len+.12);
     if(hit){const n=hit.normal,t=Math.max(0,Math.min(len,hit.distance-.12));p.x+=dir.x*t+n.x*.008;p.y+=dir.y*t+n.y*.008;p.z+=dir.z*t+n.z*.008;const dot=v.x*n.x+v.y*n.y+v.z*n.z;if(dot<0){v.x=(v.x-1.42*dot*n.x)*.74;v.y=(v.y-1.42*dot*n.y)*.74;v.z=(v.z-1.42*dot*n.z)*.74;}}
     else{p.x+=dx;p.y+=dy;p.z+=dz;}
    }
    const floor=FPSWorld.height(p.x,p.z)+.12;if(p.y<floor){p.y=floor;v.y=Math.abs(v.y)*.25;v.x*=.8;v.z*=.8;}
    g.fuse-=step;if(g.fuse<=0)this.explode(m,g);else live.push(g);
   }m.grenades=live;
  }
 },
 explode(m,g){
  const point={...g.pos},owner=m.players[g.owner];m.effects.push({type:'blast',a:point,owner:g.owner,life:1.2,maxLife:1.2,seq:++m.effectSeq});m.sound('blast',owner);
  for(const q of m.players){if(q.dead||q.invuln)continue;const target={x:q.x,y:q.y+FPSBody.eyeHeight(q)*.65,z:q.z},dx=target.x-point.x,dy=target.y-point.y,dz=target.z-point.z,d=Math.hypot(dx,dy,dz);if(d>this.blastRadius)continue;
   // Solid cover protects against the explosion; foliage does not. Sample
   // torso and head so a low parapet affords partial rather than total cover.
   let visible=0;for(const height of [.45,FPSBody.eyeHeight(q)]){const ty=q.y+height,dist=Math.hypot(dx,ty-point.y,dz),dir={x:dx/dist,y:(ty-point.y)/dist,z:dz/dist};if(dist<.05||FPSWorld.wallDistance(point,dir,dist)>=dist-.06)visible++;}
   if(!visible)continue;const damage=Math.round(lerp(this.blastDamage,12,clamp((d-1.4)/(this.blastRadius-1.4),0,1))*visible/2);m.damage(owner,q,damage,{kind:'grenade'});
  }
 },
};
