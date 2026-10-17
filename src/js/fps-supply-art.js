'use strict';
const FPSSupplyArt={
 looseWeapon(id){
  const T=KartGL,model=FPSGear.weapon(id,'daniel',true),parts=[];model.updateMatrixWorld(true);model.traverse(o=>{if(!o.isMesh||!o.visible||o.material.transparent)return;const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld),color=o.material.color,c=[];for(let i=0;i<geo.attributes.position.count;i++)c.push(color.r,color.g,color.b);geo.setAttribute('color',new T.Float32BufferAttribute(c,3));parts.push(geo);});const geometry=T.mergeGeometries(parts,false);parts.forEach(g=>g.dispose());FPSView.release(model);const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:.42}));mesh.castShadow=mesh.receiveShadow=true;return mesh;
 },
 grenade(){
  const T=KartGL,g=new T.Group(),b=FPSScenery.batch(),metal=KartModels.mat('#67745a',.5,.62),dark=KartModels.mat('#233029',.3,.58),pin=KartModels.mat('#aeb3a1',.75,.3);
  b.add('sphere',metal,[0,0,0],[.085,.115,.085]);for(let i=0;i<4;i++)b.add('torus',dark,[0,-.06+i*.04,0],[.078,.078,.078],[Math.PI/2,0,0]);
  for(let i=0;i<8;i++){const a=i*TAU/8;b.add('box',dark,[Math.cos(a)*.081,0,Math.sin(a)*.081],[.006,.15,.006],[0,-a,0]);}
  b.add('cylinder',dark,[0,.12,0],[.034,.055,.034]);b.add('box',pin,[.015,.14,.005],[.028,.018,.108],[.12,0,0]);b.add('box',pin,[.015,.062,.056],[.027,.16,.012],[.16,0,0]);b.add('torus',pin,[-.05,.14,0],[.037,.037,.037],[0,Math.PI/2,0]);b.finish(g);return g;
 },
 pickup(q){
  const T=KartGL,root=new T.Group(),b=KartModels.batch(),color=q.type==='ammo'?'#d6b06a':q.type==='weapon'?'#b9dbe1':q.type==='grenade'?'#e4b968':'#83c9e1';root.userData.type=q.type;
  if(!KartModels.geometry.has('fps-loot-ring'))KartModels.geometry.set('fps-loot-ring',new T.TorusGeometry(.57,.014,6,48));b.add('fps-loot-ring',color,[0,.035,0],[1,1,1],[Math.PI/2,0,0],.2,.52,'#302c1b');
  if(q.type==='weapon'){const weapon=this.looseWeapon(q.gun);weapon.rotation.set(0,.55,Math.PI/2);weapon.position.set(0,.36,0);root.add(weapon);b.add('box','#2b373a',[0,.12,0],[1,.24,.48],null,.35,.75);}
  else if(q.type==='ammo'){
   b.add('box','#405447',[0,.17,0],[.62,.34,.38],null,.4,.65);b.add('box','#68725c',[0,.35,0],[.66,.035,.4],null,.4,.6);b.add('torus','#24352c',[0,.4,0],[.14,.07,.07]);
   for(const x of [-.22,.22])b.add('box','#b0aa8c',[x,.18,.2],[.065,.16,.016],null,.6,.45);
   for(let i=0;i<6;i++){b.add('cylinder','#b79a56',[(i-2.5)*.073,.075,.31],[.017,.145,.017],[Math.PI/2,0,0],.72,.36);b.add('cone','#bfc4b6',[(i-2.5)*.073,.075,.405],[.016,.045,.016],[Math.PI/2,0,0],.7,.34);}
  }else if(q.type==='grenade'){for(const x of [-.16,.16]){const grenade=this.grenade();grenade.position.set(x,.2,0);root.add(grenade);}}
  else{b.add('box','#e3e8dc',[0,.23,0],[.44,.46,.3],null,.2,.6);b.add('box','#438897',[0,.24,.157],[.27,.075,.012]);b.add('box','#438897',[0,.24,.16],[.075,.27,.012]);b.add('box','#a8c6c5',[0,.48,0],[.22,.04,.18]);}
  b.finish(root,false);root.position.set(q.x,q.y??FPSWorld.height(q.x,q.z),q.z);return root;
 },
 build(view){view.grenadeModels=Array.from({length:8},()=>{const g=this.grenade();g.visible=false;view.scene.add(g);return g;});},
 update(view,m){
  const viewers=m.online?[m.player]:m.players.filter(p=>!p.bot);m.pickups.forEach((q,i)=>{const mesh=view.pickupModels[i];mesh.visible=q.ready<=m.time&&viewers.some(p=>Math.hypot(p.x-q.x,p.z-q.z)<65);});
  view.grenadeModels.forEach((mesh,i)=>{const g=m.grenades[i];mesh.visible=!!g;if(!g)return;const a=m.online&&Net.role==='guest'?clamp((performance.now()-FPSOnline.lastAt)/50,0,1):GameFeel.alpha,prev=g.prev||g.pos;mesh.position.set(lerp(prev.x,g.pos.x,a),lerp(prev.y,g.pos.y,a),lerp(prev.z,g.pos.z,a));mesh.rotation.set(m.time*4,g.seq+m.time*2,m.time*3);});
 },
 hud(m,p){
  if(p.dead)return;const q=FPSSupplies.near(m,p),grenade=m.grenades.find(g=>g.owner!==p.index&&Math.hypot(g.pos.x-p.x,g.pos.z-p.z)<9&&Math.abs(g.pos.y-p.y)<4);
  text('G / LB: GRANADA  '+p.grenades+' / 2',1230,580,13,'#dfc58f',{align:'right',body:true,stroke:'#172b33',strokeW:3});
  if(q){KartRender.panel(397,524,486,44);text('F / R3  ·  RECOGER '+FPS_GUNS[q.gun].name.toUpperCase(),640,548,17,'#ebd3a1',{body:true,weight:700});}
  else if(p.pickupUntil>m.time)text(p.pickupText,640,546,15,'#c5e4cc',{body:true,stroke:'#172b33',strokeW:3});
  if(grenade)text('⚠ GRANADA CERCA',640,475,16,'#f0ba72',{body:true,stroke:'#172b33',strokeW:3});
 },
};
