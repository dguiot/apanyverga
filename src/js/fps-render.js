'use strict';
const FPSView={
 match:null,views:new Map(),models:[],guns:new Map(),owned:[],
 mesh(geo,mat,pos,scene=this.scene){const m=new KartGL.Mesh(geo,mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;scene.add(m);this.owned.push(geo);return m;},
 release(root,done=new Set()){const shared=new Set([...KartModels.materials.values(),...KartWorld.materials.values()]),textures=new Set(KartWorld.textures.values());root?.traverse(o=>{if(o.geometry&&!done.has(o.geometry)){done.add(o.geometry);o.geometry.dispose();}for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])if(!shared.has(m)&&!done.has(m)){for(const key of ['map','bumpMap','alphaMap','normalMap']){const t=m[key];if(t&&!textures.has(t)&&!done.has(t)){done.add(t);t.dispose();}}done.add(m);m.dispose();}});},
 dispose(){const done=new Set();this.sun?.shadow?.map?.dispose();this.sun?.shadow?.mapPass?.dispose();for(const scene of [this.scene,this.weaponScene])this.release(scene,done);this.fx?.glow.dispose();this.fx?.dust.dispose();this.guns.clear();this.views.clear();this.owned=[];this.models=[];this.pickupModels=[];this.scene=this.weaponScene=this.sky=this.sun=this.water=this.grass=null;this.fx=null;this.match=null;FPSScenery.textures.clear();FPSScenery.materials.clear();},
 build(match){
  this.dispose();Kart3D.init();const T=KartGL;this.match=match;this.scene=new T.Scene();this.scene.environment=Kart3D.environment;this.scene.environmentIntensity=.4;this.scene.fog=new T.FogExp2('#bdc9c2',.0025);
  FPSScenery.build(this);
  this.models=match.players.map(p=>this.character(p.id));this.models.forEach(m=>this.scene.add(m));
  this.pickupModels=match.pickups.map(p=>{const root=new T.Group(),b=KartModels.batch(),col=p.type==='ammo'?'#e5be75':'#77dce6';b.add('box',col,[0,.3,0],[.65,.6,.65],null,.45,.3,col);b.add('torus',col,[0,0,0],[.8,.8,.8],[Math.PI/2,0,0]);b.finish(root,false);root.position.set(p.x,FPSWorld.height(p.x,p.z)+.7,p.z);this.scene.add(root);return root;});
  this.fx=new FPSFX(this.scene);
  this.weaponScene=new T.Scene();this.weaponScene.environment=Kart3D.environment;this.weaponScene.environmentIntensity=.65;this.weaponScene.add(new T.HemisphereLight('#eff7ff','#4c555a',1.8));const light=new T.DirectionalLight('#ffe4bb',2.5);light.position.set(-1,2,1);this.weaponScene.add(light);const rim=new T.DirectionalLight('#96d6f5',1.1);rim.position.set(1,.6,-1);this.weaponScene.add(rim);
 },
 sign(label){const T=KartGL,cv=mkCanvas(1024,128),c=cv.getContext('2d');c.fillStyle='#183b46';c.fillRect(0,0,1024,128);c.fillStyle='#f4e6be';c.font='bold 54px sans-serif';c.textAlign='center';c.fillText(label,512,83);const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(12,1.5),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));},
 character(id){return FPSGear.character(id);},
 animate(p,m,v){
  const u=m.userData,K=skOf(p.id),hip=(K.thigh+K.shin)/60,shoulder=u.baseShoulder,speed=Math.hypot(p.vx,p.vz),c=FPSBody.stance(v),drop=FPSBody.drop*c/m.scale.y,stride=Math.min(.48,speed*.055)*(1-c*.45),phase=p.bob*2.25;
  m.position.set(v.x,v.y,v.z);m.rotation.y=Math.PI-v.yaw;m.visible=!p.dead;
  u.head.position.y=u.baseHead-drop;u.neck.position.y=u.baseNeck-drop;u.torso.position.y=shoulder-drop;u.back.position.y=shoulder-drop;u.head.rotation.x=clamp(v.pitch,-.6,.6);u.torso.rotation.x=(p.sprint?.1:p.ads>.5?.025:0)+c*.08;
  for(const side of [-1,1]){const leg=side<0?u.legL:u.legR,swing=Math.sin(phase+(side>0?Math.PI:0))*stride,lift=Math.max(0,Math.cos(phase+(side>0?Math.PI:0)))*stride*.38;leg.position.y=hip-drop;CharacterModels.segment(leg,[0,0,0],[[0,-K.thigh/60+c*drop*.45+lift*.3,c*.28+swing*.48],[0,-hip+drop+lift,swing],-swing*.18]);leg.rotation.x=0;}
  if(u.weaponId!==p.gun){if(u.weapon){m.remove(u.weapon);this.release(u.weapon);}u.weapon=this.weapon(p.gun,p.id,true);u.weapon.rotation.y=Math.PI;u.weapon.scale.setScalar(.9);m.add(u.weapon);u.weaponId=p.gun;}
  u.weapon.position.set(.1,shoulder-drop-.22+Math.sin(phase)*stride*.018,.5);u.weapon.rotation.x=clamp(v.pitch,-.7,.7);FPSGear.animate(u.weapon,p);
  const transform=pos=>new KartGL.Vector3(...pos).applyEuler(u.weapon.rotation).multiplyScalar(.9).add(u.weapon.position).toArray(),right=transform([.04,-.12,u.weapon.userData.long*.16]),reach=p.reloading?Math.sin(clamp(1-p.reloading/FPS_GUNS[p.gun].reload,0,1)*Math.PI):0,left=transform([-.04,lerp(-.05,-.23,reach),lerp(-u.weapon.userData.long*.28,-.035,reach)]),chest=u.design.build.chest/60*.82;
  CharacterModels.segment(u.limbs.armF,[chest,shoulder-drop-.04,0],[[.33,shoulder-drop-.4,.24],right,0]);CharacterModels.segment(u.limbs.armB,[-chest,shoulder-drop-.04,0],[[-.31,shoulder-drop-.35,.23],left,0]);
  const newShot=p.shot>(u.lastShot??p.shot);if(newShot)u.flashTime=.045;u.lastShot=p.shot;u.flashTime=Math.max(0,(u.flashTime||0)-Math.min(GameFeel.dt||1/60,.04));u.weapon.userData.flash.visible=u.flashTime>0;CharacterModels.expression(u.head,p.hurt?'hurt':'normal');
 },
 weapon(id,character,thirdPerson=false){return FPSGear.weapon(id,character,thirdPerson);},
 pose(p,alpha){const prev=p.prev||p,ang=(a,b)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*alpha;return {x:lerp(prev.x,p.x,alpha),y:lerp(prev.y,p.y,alpha),z:lerp(prev.z,p.z,alpha),yaw:ang(prev.yaw,p.yaw),pitch:lerp(prev.pitch,p.pitch,alpha),stance:lerp(FPSBody.stance(prev),FPSBody.stance(p),alpha)};},
 draw(match){
  if(!Kart3D.init()){ctx.fillStyle='#122333';ctx.fillRect(0,0,W,H);sfText('SE NECESITA WEBGL PARA ESTE MODO',640,300,45,GOLD);return;}
  if(Kart3D.contextLost){sfText('RECUPERANDO GRÁFICOS',640,320,48,GOLD);this.match=null;return;}
  if(this.match!==match)this.build(match);Kart3D.syncSize();const T=KartGL,r=Kart3D.renderer,alpha=match.paused&&!match.online?1:GameFeel.alpha;
  match.players.forEach((p,i)=>this.animate(p,this.models[i],this.pose(p,alpha)));
  match.pickups.forEach((p,i)=>{const m=this.pickupModels[i];m.visible=p.ready<=match.time;m.rotation.y=match.time;m.position.y=FPSWorld.height(p.x,p.z)+.7+Math.sin(match.time*2+i)*.13;});
  this.fx.update(match,GameFeel.dt);
  const locals=match.online?[match.player]:match.players.filter(p=>!p.bot),rects=KartRender.viewports(locals.length);this.lastViewports=rects;r.autoClear=true;r.setScissorTest(true);
  locals.forEach((p,i)=>{
   const box=rects[i];let view=this.views.get(p.index);if(!view){view={camera:new T.PerspectiveCamera(75,box.w/box.h,.06,10000),weaponCamera:new T.PerspectiveCamera(65,box.w/box.h,.02,5)};this.views.set(p.index,view);}
   const camera=view.camera,v=this.pose(p,alpha),bob=p.grounded&&!reducedMotion?Math.sin(p.bob*2)*Math.min(.024,Math.hypot(p.vx,p.vz)*.003)*(1-p.ads*.8):0,targetY=v.y+FPSBody.eyeHeight(v);if(view.eyeY===undefined||Math.abs(view.eyeY-targetY)>1.3||!p.grounded)view.eyeY=targetY;else view.eyeY=lerp(view.eyeY,targetY,1-Math.exp(-Math.min(GameFeel.dt||1/60,.05)*18));camera.position.set(v.x,view.eyeY+bob,v.z);camera.rotation.set(-v.pitch+p.recoil*.35,-v.yaw,0,'YXZ');
   // yaw is measured clockwise from north (-Z), matching right stick and mouse.
   camera.rotation.y=-v.yaw;camera.fov=lerp(p.sprint?82:75,FPS_GUNS[p.gun].zoom,p.ads);camera.aspect=box.w/box.h;camera.updateProjectionMatrix();this.fx.face(camera);
   const k=r.domElement.width/W,left=Math.round(box.x*k),bottom=Math.round((H-box.y-box.h)*k),right=Math.round((box.x+box.w)*k),top=Math.round((H-box.y)*k);r.setViewport(left,bottom,right-left,top-bottom);r.setScissor(left,bottom,right-left,top-bottom);
   this.models[p.index].visible=false;this.sky.position.copy(camera.position);this.sun.position.set(v.x-48,v.y+64,v.z-36);this.sun.target.position.set(v.x,v.y,v.z);this.sun.target.updateMatrixWorld();this.grass.visible=Prefs.fx==='full'&&!ART.lite;r.shadowMap.enabled=!IS_XBOX&&!ART.lite&&Prefs.fx==='full'&&locals.length===1;r.toneMappingExposure=1.02;if(this.water?.material.bumpMap)this.water.material.bumpMap.offset.y=match.time*.006;r.render(this.scene,camera);this.lastStats={calls:r.info.render.calls,triangles:r.info.render.triangles};
   const key=p.index+':'+p.gun;let gun=this.guns.get(key);if(!gun){gun=this.weapon(p.gun,p.id);this.guns.set(key,gun);this.weaponScene.add(gun);}this.guns.forEach(m=>m.visible=m===gun);gun.visible=!p.dead;
   if(view.gun!==p.gun){view.gun=p.gun;view.equip=1;}view.equip=Math.max(0,(view.equip||0)-(match.paused&&!match.online?0:GameFeel.dt)*5);
   const reload=p.reloading?Math.sin((1-p.reloading/FPS_GUNS[p.gun].reload)*Math.PI):0,equip=view.equip*view.equip,sway=reducedMotion?0:(1-p.ads*.9)*Math.min(1,Math.hypot(p.vx,p.vz)/6);gun.position.set(lerp(.25,0,p.ads)+Math.cos(p.bob)*.007*sway,lerp(-.21,p.gun===4?-.16:-.138,p.ads)+reload*.1-equip*.3+Math.sin(p.bob*2)*.006*sway,-.42+p.recoil*.48+equip*.12+reload*.035);gun.rotation.set(-p.recoil*1.5-reload*.16-equip*.5,reload*.4,Math.sin(p.bob)*.012*sway+reload*.4);if(p.shot>(view.lastShot??p.shot))view.flash=.045;view.lastShot=p.shot;view.flash=Math.max(0,(view.flash||0)-(match.paused&&!match.online?0:Math.min(GameFeel.dt||1/60,.04)));gun.userData.flash.visible=view.flash>0;FPSGear.animate(gun,p);gun.visible=!p.dead&&!(p.gun===4&&p.ads>.82);
   view.weaponCamera.aspect=box.w/box.h;view.weaponCamera.updateProjectionMatrix();r.clearDepth();r.autoClear=false;r.render(this.weaponScene,view.weaponCamera);r.autoClear=true;this.models[p.index].visible=!p.dead;
  });
  r.setScissorTest(false);r.autoClear=true;Kart3D.present();locals.forEach((p,i)=>this.hud(match,p,rects[i]));
  if(match.paused){ctx.fillStyle='rgba(6,17,27,.75)';ctx.fillRect(0,0,W,H);sfText('PAUSA',640,253,62,GOLD);KartMenu.button('CONTINUAR',{x:430,y:310,w:420,h:60},!match.pauseSel);KartMenu.button('SALIR AL MENÚ',{x:430,y:390,w:420,h:60},!!match.pauseSel);text(match.online?'La sala sigue jugando mientras estás en el menú.':'Esc / Menu: continuar',640,490,18,PAPER,{body:true});text('L3 / Shift: correr · LT: mira · RT: disparar · X / RB: recargar · A: saltar · B (mantener): agacharse · Y: arma',640,535,16,'#bdd2cf',{body:true});}
 },
 hud(match,p,box){
  ctx.save();ctx.translate(box.x,box.y);const small=box.w<800,scale=box.w/W;ctx.scale(scale,box.h/H);const g=FPS_GUNS[p.gun];
  text('FPS',28,34,16,'#e3eee4',{align:'left',body:true,weight:700,stroke:'#172b33',strokeW:3});text(Math.max(0,Math.ceil(match.duration-match.time))+' s  ·  '+p.kills+' / '+match.target,28,60,15,GOLD,{align:'left',body:true,stroke:'#172b33',strokeW:3});
  if(p.gun===4&&p.ads>.75)this.scope(p.ads);
  const bearing=((Math.round(p.yaw*180/Math.PI)%360)+360)%360;text(['N','NE','E','SE','S','SO','O','NO'][Math.round(bearing/45)%8]+'  '+bearing+'°',640,35,16,'#eef4e9',{body:true,weight:700,stroke:'#172b33',strokeW:3});
  const radius=4+(1-p.ads)*Math.hypot(p.vx,p.vz)*1.2+p.recoil*90;ctx.strokeStyle=p.hit?(p.hitKind==='shield'?'#83dcff':p.hitKind==='head'?'#ff9a72':'#ffdd87'):'#eaf5ef';ctx.lineWidth=2;if(p.ads<.8){ctx.beginPath();for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){ctx.moveTo(640+x*radius,360+y*radius);ctx.lineTo(640+x*(radius+7),360+y*(radius+7));}ctx.stroke();}else if(p.gun!==4){ctx.fillStyle='#ffbd65';ctx.beginPath();ctx.arc(640,360,1.7,0,TAU);ctx.fill();}
  if(p.hit){ctx.beginPath();for(const [x,y] of [[1,1],[-1,1],[1,-1],[-1,-1]]){ctx.moveTo(640+x*12,360+y*12);ctx.lineTo(640+x*20,360+y*20);}ctx.stroke();}
  KartRender.panel(28,614,276,76);text(CHARS[p.id].name,45,634,16,PAPER,{align:'left',body:true,weight:700});for(const [i,value,col] of [[0,p.health,'#b9e9b0'],[1,p.shield*2,'#7ecfef']]){ctx.fillStyle='#283d45';ctx.fillRect(45,651+i*15,180,8);ctx.fillStyle=col;ctx.fillRect(45,651+i*15,180*value/100,8);}text(Math.ceil(p.health)+' + '+Math.ceil(p.shield),240,662,14,PAPER,{body:true});
  KartRender.panel(990,604,262,86);text(g.name,1232,624,17,g.color,{align:'right',body:true,weight:700});text(p.reloading?'RECARGANDO':p.ammo[p.gun]+' / '+p.reserve[p.gun],1230,662,p.reloading?21:35,PAPER,{align:'right',weight:700});
  if(!small)text('WASD · Shift: correr · Espacio: salto · C / Ctrl / B: agacharse (mantener) · R / X / RB: recargar · Q / Y: arma',640,706,12,'#d9e4e3',{body:true,stroke:'#132a35',strokeW:3});
  let y=105;for(const f of match.feed){text(CHARS[match.players[f.from].id].name+(f.head?'  ⊕  ':'  ›  ')+CHARS[match.players[f.to].id].name,1235,y,14,'#fae6b3',{align:'right',body:true,stroke:'#132a35',strokeW:3});y+=25;}
  if(p.hurt){const vignette=ctx.createRadialGradient(640,360,140,640,360,710);vignette.addColorStop(0,'rgba(150,28,26,0)');vignette.addColorStop(1,'rgba(167,36,30,'+p.hurt*1.6+')');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);}
  if(!p.dead&&p.stance>.5)text('AGACHADO',45,594,12,'#b9d4dc',{align:'left',body:true,stroke:'#172b33',strokeW:3});
  if(!p.dead&&p.regenerating)text('+ RECUPERANDO VIDA',45,577,12,'#b9e9b0',{align:'left',body:true,stroke:'#172b33',strokeW:3});
  if(p.hit&&p.hitKind==='head')text('CABEZA ×1.65',640,403,12,'#ffba90',{body:true,stroke:'#172b33',strokeW:3});
  if(p.dead){ctx.fillStyle='rgba(12,25,33,.55)';ctx.fillRect(0,0,W,H);sfText('REAPARECES EN '+Math.ceil(p.dead),640,300,52,GOLD);}
  if(match.online){let y=120;for(const q of match.players.filter(q=>q.peer&&q!==p)){const cam=AV.videoFor(q.peer);if(cam){drawVideoCover(ctx,cam.v,24,y,112,70,cam.mirror);text(Net.nameOf(q.peer),80,y+82,12,PAPER,{body:true});y+=97;}}}
  ctx.restore();
 },
 scope(ads){
  ctx.save();ctx.globalAlpha=clamp((ads-.75)/.2,0,1);const radius=281;ctx.fillStyle='rgba(3,10,15,.97)';ctx.beginPath();ctx.rect(0,0,W,H);ctx.moveTo(640+radius,360);ctx.arc(640,360,radius,0,TAU,true);ctx.closePath();ctx.fill('evenodd');
  ctx.strokeStyle='#243b44';ctx.lineWidth=10;ctx.beginPath();ctx.arc(640,360,radius+4,0,TAU);ctx.stroke();ctx.strokeStyle='#88aab0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(640,360,radius-1,0,TAU);ctx.stroke();
  ctx.strokeStyle='rgba(10,27,31,.9)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(640-radius+5,360);ctx.lineTo(640-7,360);ctx.moveTo(640+7,360);ctx.lineTo(640+radius-5,360);ctx.moveTo(640,360-radius+5);ctx.lineTo(640,353);ctx.moveTo(640,367);ctx.lineTo(640,360+radius-5);
  for(let i=1;i<=5;i++){const y=360+i*36;ctx.moveTo(640-5-i,y);ctx.lineTo(640+5+i,y);}for(let i=-5;i<=5;i++)if(i){ctx.moveTo(640+i*36,355);ctx.lineTo(640+i*36,365);}ctx.stroke();ctx.fillStyle='#e9b96b';ctx.beginPath();ctx.arc(640,360,1.25,0,TAU);ctx.fill();
  text('4.4×   /   HORIZONTE',640,600,11,'#aac7cc',{body:true,weight:650});ctx.restore();
 },
};
