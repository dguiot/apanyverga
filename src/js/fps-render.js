'use strict';
const FPSView={
 match:null,views:new Map(),models:[],guns:new Map(),owned:[],
 mesh(geo,mat,pos,scene=this.scene){const m=new KartGL.Mesh(geo,mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;scene.add(m);this.owned.push(geo);return m;},
 dispose(){const shared=new Set([...KartModels.materials.values(),...KartWorld.materials.values()]),textures=new Set(KartWorld.textures.values());for(const scene of [this.scene,this.weaponScene])if(scene)scene.traverse(o=>{if(o.geometry)o.geometry.dispose();for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])if(!shared.has(m)){if(m.map&&!textures.has(m.map))m.map.dispose();m.dispose();}});this.guns.clear();this.views.clear();this.owned=[];this.scene=this.weaponScene=null;this.match=null;},
 build(match){
  this.dispose();Kart3D.init();const T=KartGL;this.match=match;this.scene=new T.Scene();this.scene.environment=Kart3D.environment;this.scene.environmentIntensity=.4;this.scene.fog=new T.FogExp2('#bdc9c2',.0025);
  const kartSky=Kart3D.skyMesh;KartWorld.sky(this.scene,{theme:'town'});this.sky=Kart3D.skyMesh;Kart3D.skyMesh=kartSky;this.sun=Kart3D.lighting(this.scene,'town');this.sun.shadow.camera.left=this.sun.shadow.camera.bottom=-50;this.sun.shadow.camera.right=this.sun.shadow.camera.top=50;
  const terrain=new T.PlaneGeometry(620,620,180,180),a=terrain.attributes.position,colors=[];
  for(let i=0;i<a.count;i++){const x=a.getX(i),z=-a.getY(i),h=FPSWorld.height(x,z);a.setZ(i,h);const c=new T.Color(Math.abs(x+115)<13?'#bdb99a':h>12?'#7c8b6c':'#a4ad87');c.multiplyScalar(.9+.1*Math.sin(x*.07)*Math.cos(z*.05));colors.push(c.r,c.g,c.b);}
  terrain.computeVertexNormals();terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));const mat=KartWorld.material('grass','#c8cbb1',true).clone(),grass=KartWorld.texture('grass').clone();grass.repeat.set(95,95);grass.needsUpdate=true;mat.map=mat.bumpMap=grass;mat.bumpScale=.055;mat.side=T.DoubleSide;const floor=this.mesh(terrain,mat,[0,0,0]);floor.rotation.x=-Math.PI/2;
  const batch=KartModels.batch();
  for(const b of FPSWorld.solids){const col=b.color||({crate:'#917654',barrier:'#9aa29e',roof:'#637c7b',floor:'#b4aa98',stair:'#a6a598',bridge:'#727e7a'}[b.type])||'#9ba59a';
   this.mesh(new T.BoxGeometry(b.w,b.h,b.d),KartWorld.material(b.type==='plaster'?'plaster':b.type==='crate'?'earth':'rock',col),[b.x,b.y+b.h/2,b.z]);
   if(b.type==='crate')for(const side of [-1,1])batch.add('box','#554f44',[b.x,b.y+b.h*.5,b.z+side*(b.d/2+.015)],[b.w*.97,.13,.04],[0,0,.55]);
  }
  for(const b of FPSWorld.decor){
   // Metal window frames, lintels, drainpipes, roof edging and rooftop tanks.
   for(const side of [-1,1]){
    for(let i=-2;i<=2;i++){batch.add('box','#3d606a',[b.x+i*b.w/6,b.y+4,b.z+side*(b.d/2+.56)],[2,1.3,.08],null,.5,.25);for(const j of [-1,1])batch.add('box','#d7c9ad',[b.x+i*b.w/6,b.y+4+j*.7,b.z+side*(b.d/2+.65)],[2.2,.09,.18]);}
    batch.add('branch','#516568',[b.x+side*(b.w/2+.7),b.y+b.h/2,b.z+b.d/2],[.12,b.h,.12],null,.5);
    batch.add('box','#d0c2a2',[b.x,b.y+b.h+.55,b.z+side*b.d/2],[b.w+1,.2,.35]);
    for(let i=-2;i<=2;i++){batch.add('box','#354c50',[b.x+side*(b.w/2+.56),b.y+3.9,b.z+i*b.d/6],[.12,1.5,2.3],null,.55,.25);batch.add('box','#d0c2a2',[b.x+side*(b.w/2+.7),b.y+3.05,b.z+i*b.d/6],[.5,.12,2.5]);}
    for(let i=0;i<5;i++)batch.add('box','#a6a899',[b.x+side*(b.w/2+.56),b.y+.55+i*.12,b.z-b.d*.32],[.13,.04,2.2]);
   }
   batch.add('cylinder','#bbc9c4',[b.x+6,b.y+b.h+1.3,b.z-3],[2,2,2],null,.6,.35);
   batch.add('box','#28383d',[b.x-5,b.y+b.h+.8,b.z],[4,.5,3],[-.24,0,0],.7,.25);
  }
  const rng=srand(9933);
  // Trees use shared geometry merged by material; the road and central combat
  // area remain open. Distant hills provide several layers of depth.
  for(let i=0;i<175;i++){
   const x=(rng()-.5)*570,z=(rng()-.5)*570;if(Math.abs(x)<92&&Math.abs(z)<105||Math.abs(x+115)<20)continue;
   const y=FPSWorld.height(x,z),h=7+rng()*9;batch.add('branch','#594e3c',[x,y+h*.4,z],[.25,h*.8,.25],[.015,0,(rng()-.5)*.1]);
   if(i%3){for(let j=0;j<9;j++){const ang=j*2.4,rad=1+rng()*2;batch.add('leaf',['#304e3c','#42614a','#536e4e'][j%3],[x+Math.cos(ang)*rad,y+h*(.57+(j%3)*.15),z+Math.sin(ang)*rad],[2+rng()*1.2,1.5+rng(),2+rng()],[rng()*.3,ang,rng()*.3]);}}
   else for(let j=0;j<5;j++)batch.add('cone',['#2f4e40','#3e5d48','#4e6a4d'][j%3],[x+(rng()-.5)*.4,y+h*(.4+j*.12),z+(rng()-.5)*.4],[h*(.28-j*.035),h*.35,h*(.28-j*.035)],[0,j*1.7,0]);
  }
  for(let i=0;i<70;i++){const x=(rng()-.5)*530,z=(rng()-.5)*530;if(Math.abs(x)<95&&Math.abs(z)<110)continue;const y=FPSWorld.height(x,z);batch.add('rock','#81887c',[x,y,z],[2+rng()*4,1+rng()*4,2+rng()*4],[rng(),rng()*6,rng()]);}
  for(let i=0;i<26;i++){const ang=i*TAU/26,rad=490+rng()*160;batch.add('hill',i%2?'#7b8e86':'#8d9b91',[Math.sin(ang)*rad,15,Math.cos(ang)*rad],[95+rng()*80,100+rng()*130,95+rng()*80],[0,ang,0]);}
  // Courtyard paving follows the actual rolling ground; repeated stone detail
  // and narrow grout lines keep close-up surfaces crisp rather than stretched.
  const pavingGeo=new T.PlaneGeometry(36,90,36,90),pp=pavingGeo.attributes.position;for(let i=0;i<pp.count;i++)pp.setZ(i,FPSWorld.height(pp.getX(i),-pp.getY(i))+.03);pavingGeo.computeVertexNormals();
  const pavingCanvas=mkCanvas(256,256),pc=pavingCanvas.getContext('2d'),stoneNoise=srand(912);pc.fillStyle='#969b8e';pc.fillRect(0,0,256,256);for(let i=0;i<9000;i++){pc.fillStyle=stoneNoise()>.5?'rgba(230,230,208,.12)':'rgba(52,62,52,.12)';pc.fillRect(stoneNoise()*256,stoneNoise()*256,1+stoneNoise()*3,1+stoneNoise()*3);}pc.strokeStyle='#626d65';pc.lineWidth=2;pc.strokeRect(0,0,256,256);const pavingTex=new T.CanvasTexture(pavingCanvas);pavingTex.colorSpace=T.SRGBColorSpace;pavingTex.wrapS=pavingTex.wrapT=T.RepeatWrapping;pavingTex.repeat.set(18,45);pavingTex.anisotropy=4;
  const paving=this.mesh(pavingGeo,new T.MeshStandardMaterial({map:pavingTex,bumpMap:pavingTex,bumpScale:.025,roughness:.92}),[0,0,0]);paving.rotation.x=-Math.PI/2;
  for(let i=0;i<90;i++){const x=(rng()-.5)*190,z=(rng()-.5)*200;if(Math.abs(x)<20||FPSWorld.solids.some(b=>Math.abs(x-b.x)<b.w/2+2&&Math.abs(z-b.z)<b.d/2+2))continue;const y=FPSWorld.height(x,z);for(let j=0;j<3;j++)batch.add('leaf','#596e43',[x+(rng()-.5)*.6,y+.15,z+(rng()-.5)*.6],[.14,.28,.14],[rng()*.6,rng()*6,rng()*.6]);}
  // River follows the valley's elevation; wet reflections stay within budget.
  const riverGeo=new T.PlaneGeometry(21,570,1,140),rp=riverGeo.attributes.position;
  for(let i=0;i<rp.count;i++){const z=-rp.getY(i);rp.setZ(i,FPSWorld.height(-115,z)+.09);}riverGeo.computeVertexNormals();
  const water=new T.MeshStandardMaterial({color:'#4b9c9d',roughness:.18,metalness:.45,transparent:true,opacity:.83});this.water=this.mesh(riverGeo,water,[-115,0,0]);this.water.rotation.x=-Math.PI/2;
  for(let i=0;i<110;i++){const z=-280+i*5.1,y=FPSWorld.height(-115,z);for(const side of [-1,1])batch.add('rock','#a0aaa0',[-115+side*(11+rng()*3),y+.2,z],[1+rng(),.3+rng()*.5,1+rng()*2],[0,rng()*6,0]);}
  // Arrival plaza and an observation tower give the world readable landmarks.
  for(const x of [-9,9])for(let z=-22;z<26;z+=8)batch.add('box','#bac0b3',[x,FPSWorld.height(x,z)+.025,z],[.22,.04,3]);
  for(const side of [-1,1]){batch.add('branch','#5a6971',[-6+side*5,FPSWorld.height(-6,0)+4,0],[.12,8,.12],null,.7);}
  const sign=this.sign('CUENCA AURORA  //  01');sign.position.set(-6,FPSWorld.height(-6,0)+7.5,0);this.scene.add(sign);
  batch.finish(this.scene);this.models=match.players.map(p=>this.character(p.id));this.models.forEach(m=>this.scene.add(m));
  this.pickupModels=match.pickups.map(p=>{const root=new T.Group(),b=KartModels.batch(),col=p.type==='ammo'?'#e5be75':'#77dce6';b.add('box',col,[0,.3,0],[.65,.6,.65],null,.45,.3,col);b.add('torus',col,[0,0,0],[.8,.8,.8],[Math.PI/2,0,0]);b.finish(root,false);root.position.set(p.x,FPSWorld.height(p.x,p.z)+.7,p.z);this.scene.add(root);return root;});
  this.tracePool=Array.from({length:32},()=>{const line=new T.Mesh(new T.CylinderGeometry(1,1,1,4),new T.MeshBasicMaterial({color:'#ffe5a5',transparent:true,opacity:.65,depthWrite:false}));line.frustumCulled=false;line.visible=false;this.scene.add(line);return line;});
  this.weaponScene=new T.Scene();this.weaponScene.add(new T.HemisphereLight('#eff7ff','#4c555a',2.5));const light=new T.DirectionalLight('#ffe4bb',2.5);light.position.set(-1,2,1);this.weaponScene.add(light);
 },
 sign(label){const T=KartGL,cv=mkCanvas(1024,128),c=cv.getContext('2d');c.fillStyle='#183b46';c.fillRect(0,0,1024,128);c.fillStyle='#f4e6be';c.font='bold 54px sans-serif';c.textAlign='center';c.fillText(label,512,83);const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(12,1.5),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));},
 character(id){
  const T=KartGL,root=new T.Group(),b=KartModels.batch(),L=LOOKS[id]||{},source=KartModels.kart(id),head=source.userData.head;head.removeFromParent();source.traverse(m=>m.geometry?.dispose());head.position.set(0,1.6,0);head.scale.setScalar(.67);root.add(head);
  b.add('box',L.top||'#7a8e91',[0,1.05,0],[.58,.65,.35]);b.add('box','#33444a',[0,1.08,.19],[.48,.42,.12]);for(const side of [-1,1]){
   const leg=new T.Group(),l=KartModels.batch();l.add('box',L.pants||'#34414a',[0,-.31,0],[.22,.62,.24]);l.add('box',L.shoe||'#283238',[0,-.65,.09],[.23,.18,.39]);l.finish(leg);leg.position.set(side*.18,.75,0);root.add(leg);root.userData[side<0?'legL':'legR']=leg;
   KartModels.link(b,[side*.34,1.25,0],[side*.22,1.03,.51],.095,L.top||'#7a8e91');b.add('sphere',L.skin||'#d6b398',[side*.22,1.03,.51],[.1,.09,.13]);}
  b.add('box','#29363e',[.16,1.13,.6],[.12,.18,.65]);b.finish(root);return root;
 },
 weapon(id,character){
  const T=KartGL,root=new T.Group(),b=KartModels.batch(),g=FPS_GUNS[id],dark='#27343d',metal='#798a91',long=id===4?.97:id===3?.78:id===0?.33:.69;
  b.add('box',dark,[0,0,0],[.105,.14,long*.58],null,.7,.31);b.add('box',g.color,[0,.068,-.02],[.11,.03,long*.46],null,.55,.4);
  b.add('cylinder',metal,[0,.01,-long*.51],[.023,long*.48,.023],[Math.PI/2,0,0],.9,.25);b.add('cylinder',dark,[0,.01,-long*.78],[.035,.085,.035],[Math.PI/2,0,0],.6,.4);
  b.add('box',dark,[0,-.135,long*.1],[.075,.18,.09],[.2,0,0]);if(id!==0)b.add('box',dark,[0,-.145,-.055],[.068,.19,.12],[-.14,0,0]);
  if(id!==0){b.add('box','#52616a',[0,-.015,long*.38],[.095,.11,.2]);b.add('box',dark,[0,-.015,long*.53],[.13,.2,.055]);}
  for(let i=0;i<(id===0?3:9);i++)b.add('box',metal,[0,.088,-long*.26+i*.025],[.09,.013,.014],null,.75);
  if(id===4){b.add('cylinder','#253b46',[0,.16,-.02],[.055,.26,.055],[Math.PI/2,0,0],.6,.25);b.add('cylinder','#72b3c2',[0,.16,-.16],[.045,.012,.045],[Math.PI/2,0,0],.6,.15);}
  else {for(const z of [-long*.55,long*.15]){b.add('box','#263842',[0,.045,z],[.04,.09,.035]);b.add('box','#101f28',[0,.11,z],[.018,.06,.02]);}}
  const skin=LOOKS[character]?.skin||'#d8b096';KartModels.link(b,[.11,-.22,.33],[.04,-.13,.12],.062,'#506570');b.add('sphere',skin,[.03,-.12,.075],[.059,.08,.075]);
  KartModels.link(b,[-.2,-.24,.3],[-.055,-.08,-long*.26],.059,'#506570');b.add('sphere',skin,[-.052,-.075,-long*.26],[.06,.05,.09]);b.finish(root,false);
  const flash=new T.Mesh(new T.ConeGeometry(.08,.23,6),new T.MeshBasicMaterial({color:'#ffdb83',transparent:true,opacity:.9,depthWrite:false}));flash.rotation.x=-Math.PI/2;flash.position.set(0,.01,-long*.86);flash.visible=false;root.add(flash);root.userData.flash=flash;return root;
 },
 pose(p,alpha){const prev=p.prev||p,ang=(a,b)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*alpha;return {x:lerp(prev.x,p.x,alpha),y:lerp(prev.y,p.y,alpha),z:lerp(prev.z,p.z,alpha),yaw:ang(prev.yaw,p.yaw),pitch:lerp(prev.pitch,p.pitch,alpha)};},
 draw(match){
  if(!Kart3D.init()){ctx.fillStyle='#122333';ctx.fillRect(0,0,W,H);sfText('SE NECESITA WEBGL PARA ESTE MODO',640,300,45,GOLD);return;}
  if(Kart3D.contextLost){sfText('RECUPERANDO GRÁFICOS',640,320,48,GOLD);this.match=null;return;}
  if(this.match!==match)this.build(match);Kart3D.syncSize();const T=KartGL,r=Kart3D.renderer,alpha=match.paused&&!match.online?1:GameFeel.alpha;
  match.players.forEach((p,i)=>{const m=this.models[i],v=this.pose(p,alpha);m.position.set(v.x,v.y,v.z);m.rotation.y=Math.PI-v.yaw;m.visible=!p.dead;m.userData.legL.rotation.x=Math.sin(p.bob*2)*Math.min(.6,Math.hypot(p.vx,p.vz)*.08);m.userData.legR.rotation.x=-m.userData.legL.rotation.x;});
  match.pickups.forEach((p,i)=>{const m=this.pickupModels[i];m.visible=p.ready<=match.time;m.rotation.y=match.time;m.position.y=FPSWorld.height(p.x,p.z)+.7+Math.sin(match.time*2+i)*.13;});
  this.tracePool.forEach((line,i)=>{const e=match.effects[i];line.visible=!!e;if(e){const start=new T.Vector3(e.a.x,e.a.y,e.a.z),end=new T.Vector3(e.b.x,e.b.y,e.b.z),dir=end.clone().sub(start);line.position.copy(start.add(end).multiplyScalar(.5));line.scale.set(.012,Math.max(.01,dir.length()),.012);line.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());line.material.opacity=e.life*6;}});
  const locals=match.online?[match.player]:match.players.filter(p=>!p.bot),rects=KartRender.viewports(locals.length);this.lastViewports=rects;r.autoClear=true;r.setScissorTest(true);
  locals.forEach((p,i)=>{
   const box=rects[i];let view=this.views.get(p.index);if(!view){view={camera:new T.PerspectiveCamera(75,box.w/box.h,.06,10000),weaponCamera:new T.PerspectiveCamera(65,box.w/box.h,.02,5)};this.views.set(p.index,view);}
   const camera=view.camera,v=this.pose(p,alpha),bob=p.grounded?Math.sin(p.bob*2)*.025:0;camera.position.set(v.x,v.y+1.62+bob,v.z);camera.rotation.set(-v.pitch+p.recoil*.35,-v.yaw,0,'YXZ');
   // yaw is measured clockwise from north (-Z), matching right stick and mouse.
   camera.rotation.y=-v.yaw;camera.fov=lerp(p.sprint?82:75,p.gun===4?28:54,p.ads);camera.aspect=box.w/box.h;camera.updateProjectionMatrix();
   const k=r.domElement.width/W,left=Math.round(box.x*k),bottom=Math.round((H-box.y-box.h)*k),right=Math.round((box.x+box.w)*k),top=Math.round((H-box.y)*k);r.setViewport(left,bottom,right-left,top-bottom);r.setScissor(left,bottom,right-left,top-bottom);
   this.models[p.index].visible=false;this.sky.position.copy(camera.position);this.sun.position.set(v.x-45,v.y+90,v.z-55);this.sun.target.position.set(v.x,v.y,v.z);this.sun.target.updateMatrixWorld();r.shadowMap.enabled=!IS_XBOX&&!ART.lite&&Prefs.fx==='full'&&locals.length===1;r.toneMappingExposure=1.12;r.render(this.scene,camera);
   const key=p.index+':'+p.gun;let gun=this.guns.get(key);if(!gun){gun=this.weapon(p.gun,p.id);this.guns.set(key,gun);this.weaponScene.add(gun);}this.guns.forEach(m=>m.visible=m===gun);gun.visible=!p.dead;
   if(view.gun!==p.gun){view.gun=p.gun;view.equip=1;}view.equip=Math.max(0,(view.equip||0)-(match.paused&&!match.online?0:GameFeel.dt)*5);
   const reload=p.reloading?Math.sin((1-p.reloading/FPS_GUNS[p.gun].reload)*Math.PI):0,equip=view.equip*view.equip;gun.position.set(lerp(.28,0,p.ads),lerp(-.23,p.gun===4?-.16:-.11,p.ads)-reload*.16-equip*.3+Math.sin(p.bob*2)*.008,-.42+p.recoil*.9+equip*.12);gun.rotation.set(-p.recoil*2-reload*.6-equip*.5,reload*.4,Math.sin(p.bob)*.014+reload*.4);gun.userData.flash.visible=p.cool>FPS_GUNS[p.gun].rate-.055;
   view.weaponCamera.aspect=box.w/box.h;view.weaponCamera.updateProjectionMatrix();r.clearDepth();r.autoClear=false;r.render(this.weaponScene,view.weaponCamera);r.autoClear=true;this.models[p.index].visible=!p.dead;
  });
  r.setScissorTest(false);r.autoClear=true;Kart3D.present();locals.forEach((p,i)=>this.hud(match,p,rects[i]));
  if(match.paused){ctx.fillStyle='rgba(6,17,27,.75)';ctx.fillRect(0,0,W,H);sfText('PAUSA',640,253,62,GOLD);KartMenu.button('CONTINUAR',{x:430,y:310,w:420,h:60},!match.pauseSel);KartMenu.button('SALIR AL MENÚ',{x:430,y:390,w:420,h:60},!!match.pauseSel);text(match.online?'La sala sigue jugando mientras estás en el menú.':'Esc / Menu: continuar',640,490,18,PAPER,{body:true});text('L3 / Shift: correr · LT: mira · RT: disparar · X: recargar · A: saltar · Y: cambiar arma',640,535,16,'#bdd2cf',{body:true});}
 },
 hud(match,p,box){
  ctx.save();ctx.translate(box.x,box.y);const small=box.w<800,scale=box.w/W;ctx.scale(scale,box.h/H);const g=FPS_GUNS[p.gun];
  text('CUENCA AURORA',28,34,16,'#e3eee4',{align:'left',body:true,weight:700,stroke:'#172b33',strokeW:3});text(Math.max(0,Math.ceil(match.duration-match.time))+' s  ·  '+p.kills+' / '+match.target,28,60,15,GOLD,{align:'left',body:true,stroke:'#172b33',strokeW:3});
  if(p.gun===4&&p.ads>.85){ctx.fillStyle='rgba(6,14,21,.88)';ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(640,360,280,0,TAU,true);ctx.fill('evenodd');ctx.strokeStyle='rgba(12,24,30,.85)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(360,360);ctx.lineTo(920,360);ctx.moveTo(640,80);ctx.lineTo(640,640);ctx.stroke();}
  const bearing=((Math.round(p.yaw*180/Math.PI)%360)+360)%360;text(['N','NE','E','SE','S','SO','O','NO'][Math.round(bearing/45)%8]+'  '+bearing+'°',640,35,16,'#eef4e9',{body:true,weight:700,stroke:'#172b33',strokeW:3});
  const radius=4+(1-p.ads)*Math.hypot(p.vx,p.vz)*1.2+p.recoil*90;ctx.strokeStyle=p.hit?'#ffdd87':'#eaf5ef';ctx.lineWidth=2;ctx.beginPath();for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){ctx.moveTo(640+x*radius,360+y*radius);ctx.lineTo(640+x*(radius+7),360+y*(radius+7));}ctx.stroke();
  if(p.hit){ctx.beginPath();for(const [x,y] of [[1,1],[-1,1],[1,-1],[-1,-1]]){ctx.moveTo(640+x*12,360+y*12);ctx.lineTo(640+x*20,360+y*20);}ctx.stroke();}
  KartRender.panel(28,614,276,76);text(CHARS[p.id].name,45,634,16,PAPER,{align:'left',body:true,weight:700});for(const [i,value,col] of [[0,p.health,'#b9e9b0'],[1,p.shield*2,'#7ecfef']]){ctx.fillStyle='#283d45';ctx.fillRect(45,651+i*15,180,8);ctx.fillStyle=col;ctx.fillRect(45,651+i*15,180*value/100,8);}text(p.health+' + '+p.shield,240,662,14,PAPER,{body:true});
  KartRender.panel(990,604,262,86);text(g.name,1232,624,17,g.color,{align:'right',body:true,weight:700});text(p.reloading?'RECARGANDO':p.ammo[p.gun]+' / '+p.reserve[p.gun],1230,662,p.reloading?21:35,PAPER,{align:'right',weight:700});
  if(!small)text('WASD · Shift: correr · Espacio: saltar · R: recargar · 1–5 / Q / rueda: arma · clic der.: mira · clic izq.: disparar',640,706,13,'#d9e4e3',{body:true,stroke:'#132a35',strokeW:3});
  let y=105;for(const f of match.feed){text(CHARS[match.players[f.from].id].name+'  ›  '+CHARS[match.players[f.to].id].name,1235,y,14,'#fae6b3',{align:'right',body:true,stroke:'#132a35',strokeW:3});y+=25;}
  if(p.hurt){ctx.fillStyle='rgba(199,51,50,'+p.hurt*.35+')';ctx.fillRect(0,0,W,H);}
  if(p.dead){ctx.fillStyle='rgba(12,25,33,.55)';ctx.fillRect(0,0,W,H);sfText('REAPARECES EN '+Math.ceil(p.dead),640,300,52,GOLD);}
  if(match.online){let y=120;for(const q of match.players.filter(q=>q.peer&&q!==p)){const cam=AV.videoFor(q.peer);if(cam){drawVideoCover(ctx,cam.v,24,y,112,70,cam.mirror);text(Net.nameOf(q.peer),80,y+82,12,PAPER,{body:true});y+=97;}}}
  ctx.restore();
 },
};
