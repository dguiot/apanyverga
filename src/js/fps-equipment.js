'use strict';
// FPS details are built from the canonical Esmash design. They do not replace
// its portrait, costume or skeleton, or change the art used by the other modes.
const FPSGear={
 texture(kind){
  const T=KartGL,cv=mkCanvas(256,256),c=cv.getContext('2d'),rng=srand(191+kind.length*37),im=c.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,n=145+(rng()-.5)*(kind==='skin'?8:kind==='fabric'?28:16)+(kind==='fabric'?(x%4===0||y%4===0?-12:4):0);im.data[i]=im.data[i+1]=im.data[i+2]=n;im.data[i+3]=255;}c.putImageData(im,0,0);
  if(kind==='metal')for(let i=0;i<70;i++){c.fillStyle='rgba(240,245,248,.09)';c.fillRect(rng()*256,rng()*256,8+rng()*45,.5);}
  const tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;return tex;
 },
 material(color,kind='polymer'){
  const map=this.texture(kind);return new KartGL.MeshStandardMaterial({color,roughness:kind==='metal'?.34:kind==='skin'?.72:.87,metalness:kind==='metal'?.78:0,bumpMap:map,bumpScale:kind==='fabric'?.0014:kind==='skin'?.00016:.0006});
 },
 rounded(){
  if(KartModels.geometry.has('fps-rounded'))return;const T=KartGL,g=new T.BoxGeometry(1,1,1,3,3,3),p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){const v=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)),inner=v.clone().clampScalar(-.43,.43),normal=v.clone().sub(inner).normalize();v.copy(inner).addScaledVector(normal,.07);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);}KartModels.geometry.set('fps-rounded',g);
 },
 link(batch,mat,a,b,r1,r2=r1){
  const T=KartGL,from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from),geo=new T.CylinderGeometry(r2,r1,delta.length(),12,1),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());geo.applyQuaternion(q);batch.geometry(geo,mat,from.add(to).multiplyScalar(.5).toArray());
 },
 hand(id,left=false){
  const T=KartGL,L=CharacterDesign.get(id),root=new T.Group(),b=FPSScenery.batch(),skin=this.material(L.glove||L.skin,L.glove?'fabric':'skin'),crease=this.material(shade(L.glove||L.skin,-.15),L.glove?'fabric':'skin');root.userData.design=L;root.userData.fingers=[];
  b.add('sphere',skin,[0,0,0],[.035,.07,.033]);b.add('sphere',skin,[.005,.032,.005],[.029,.028,.027]);
  // Four separate fingers: proximal bone, knuckle, middle bone and curled tip.
  for(let i=0;i<4;i++){
   const y=.044-i*.029,length=[.062,.073,.069,.053][i],a=[-.004,y,-.022],knuckle=[-.027,y,-.048],joint=[-.052,y,-.034],tip=[-.047,y,-.007];
   this.link(b,skin,a,knuckle,.0125,.0115);b.add('sphere',skin,knuckle,[.013,.012,.013]);this.link(b,skin,knuckle,joint,.0115,.0095);b.add('sphere',skin,joint,[.01,.01,.01]);this.link(b,skin,joint,tip,.009,.0075);
   b.add('sphere',crease,[-.027,y,-.058],[.007,.0012,.002]);root.userData.fingers.push({length,tip});
   if(!L.glove&&(!L.species||L.species==='mariachi'))b.add('sphere',this.material(shade(L.skin,.12),'skin'),[-.054,y,-.015],[.0018,.006,.009]);
   if(L.hand==='claw')b.add('cone',this.material(L.claw||'#d3c3a2'),[-.048,y,.008],[.008,.025,.008],[Math.PI/2,0,0]);
  }
  const thumb=[[.011,.032,.018],[-.019,.01,.038],[-.046,-.01,.021]];this.link(b,skin,thumb[0],thumb[1],.016,.013);b.add('sphere',skin,thumb[1],[.014,.014,.014]);this.link(b,skin,thumb[1],thumb[2],.012,.01);
  if(L.glove){const pad=this.material(shade(L.glove,-.25),'polymer');for(let i=0;i<4;i++)b.add('sphere',pad,[.027,.04-i*.028,-.008],[.011,.012,.017]);}
  b.finish(root,false);if(left)root.scale.x=-1;return root;
 },
 weapon(id,character,thirdPerson=false){
  this.rounded();const T=KartGL,root=new T.Group(),body=new T.Group(),magazine=new T.Group(),b=FPSScenery.batch(),mb=FPSScenery.batch(),g=FPS_GUNS[id],L=CharacterDesign.get(character),long=[.34,.54,.8,.88,1.07][id];
  const steel=this.material('#26323c','metal'),edge=this.material('#71818b','metal'),poly=this.material('#263037'),accent=this.material(g.color,'metal'),rubber=this.material('#182129'),wood=this.material('#815a3d','fabric');root.add(body,magazine);root.userData.design=L;root.userData.magazine=magazine;root.userData.body=body;
  const box=(mat,p,s,r)=>b.add('fps-rounded',mat,p,s,r),tube=(mat,p,r,len)=>b.add('cylinder',mat,p,[r,len,r],[Math.PI/2,0,0]);
  // Receiver, separate lower frame, grip and visible ejection port.
  box(steel,[0,.019,0],[.093,id===0?.074:.095,long*.54]);box(poly,[0,-.045,.02],[.088,.049,long*.43]);box(poly,[0,-.136,long*.16],[.066,.153,.087],[.22,0,0]);
  box(accent,[0,.065,-.02],[.096,.014,long*.43]);box(rubber,[0,-.214,long*.175],[.067,.015,.078],[.22,0,0]);
  for(let i=0;i<8;i++)box(rubber,[.035,-.087-i*.014,long*.155],[.003,.003,.064],[.22,0,0]);
  const ejectionZ=id===0?-.035:.03;box(rubber,[.048,.03,ejectionZ],[.004,.034,.089]);box(edge,[.051,.014,ejectionZ],[.006,.009,.088]);box(edge,[.065,.025,long*.14],[.043,.012,.023]);
  // Trigger guard is an open loop, with an actual curved trigger inside.
  b.add('torus',steel,[0,-.086,long*.03],[.035,.048,.025],[0,Math.PI/2,0]);box(edge,[0,-.082,long*.045],[.01,.042,.013],[.3,0,0]);
  tube(steel,[0,.012,-long*.5],.019,long*.51);tube(edge,[0,.012,-long*.73],.023,.09);tube(rubber,[0,.012,-long*.794],.018,.008);b.add('torus',edge,[0,.012,-long*.801],[.02,.02,.02]);
  for(const side of [-1,1]){
   for(const z of [-long*.18,long*.2]){b.add('cylinder',edge,[side*.049,-.01,z],[.006,.004,.006],[0,0,Math.PI/2]);box(rubber,[side*.052,-.01,z],[.002,.001,.007]);}
   box(edge,[side*.05,-.025,long*.21],[.006,.007,.026],[0,0,side*.3]);
  }
  // Each weapon keeps a distinct silhouette and operating mechanism.
  if(id===0){
   for(const side of [-1,1])for(let i=0;i<7;i++)box(edge,[side*.048,.026,.062+i*.009],[.002,.044,.003]);
   box(steel,[0,.058,.13],[.056,.029,.018]);box(steel,[0,.058,-.22],[.018,.027,.02]);
  }else{
   const handguard=id===4?wood:poly;box(handguard,[0,-.012,-long*.32],[.092,.089,long*.34]);
   box(poly,[0,-.011,long*.43],[.068,.07,.21]);box(rubber,[0,-.033,long*.56],[.118,.165,.028],[.06,0,0]);
   for(const side of [-1,1])for(let i=0;i<7;i++){box(rubber,[side*.048,.007,-long*.41+i*.022],[.002,.022,.012]);box(edge,[side*.049,-.025,-long*.4+i*.026],[.002,.002,.016]);}
   for(let i=0;i<14;i++)box(edge,[0,.078,-long*.3+i*.023],[.074,.013,.011]);
   if(id===3){tube(steel,[0,-.043,-long*.49],.024,long*.48);for(let i=0;i<10;i++)b.add('torus',rubber,[0,-.02,-long*.33+i*.012],[.055,.055,.055]);}
   if(id===4){tube(steel,[0,.012,-long*.57],.026,long*.38);box(steel,[.077,.014,.105],[.025,.021,.13]);b.add('sphere',rubber,[.093,-.025,.155],[.018,.022,.02]);}
  }
  const magZ=id===0?long*.17:-.045,magH=id===0?.1:id===1?.22:.18;mb.add('fps-rounded',id===4?steel:poly,[0,-.11-magH*.22,magZ],[.061,magH,.099],[-.13,0,0]);mb.add('fps-rounded',rubber,[0,-.11-magH*.72,magZ+.012],[.068,.018,.107],[-.13,0,0]);
  for(const side of [-1,1])for(let i=0;i<4;i++)mb.add('box',edge,[side*.031,-.1-i*.025,magZ+.004],[.002,.002,.072]);mb.finish(magazine,false);
  if(id===4){
   for(const z of [-.17,.12])b.add('torus',steel,[0,.16,z],[.06,.06,.06]);box(steel,[0,.095,-.02],[.045,.06,.25]);tube(steel,[.002,.223,-.017],.023,.04);b.add('cylinder',steel,[.072,.16,-.02],[.025,.07,.025],[0,0,Math.PI/2]);
  }else{
   for(const side of [-1,1])box(steel,[side*.027,.112,long*.15],[.012,.058,.026]);box(steel,[0,.093,-long*.55],[.024,.075,.03]);b.add('sphere',accent,[0,.138,-long*.55],[.0045,.0045,.0045]);
  }
  b.finish(body,false);
  if(id===4){const tube=new T.Mesh(new T.CylinderGeometry(.055,.055,.29,32,1,true),steel);tube.rotation.x=Math.PI/2;tube.position.set(0,.16,-.025);tube.name='open-scope-tube';body.add(tube);}
  if(!thirdPerson){
   const sleeve=this.material(L.sleeve==='long'?L.top:L.skin,L.sleeve==='long'?'fabric':'skin'),cuff=this.material(L.wrap||shade(L.top,-.18),'fabric');root.userData.arms=[];
   for(const [left,wrist,elbow]of [[false,[.048,-.15,.13],[.17,-.3,.44]],[true,[-.067,-.105,-long*.23],[-.27,-.31,.27]]]){
    const arm=new T.Mesh(new T.CylinderGeometry(.036,.061,1,16),sleeve);root.add(arm);const band=L.sleeve==='long'||L.wrap?new T.Mesh(new T.CylinderGeometry(.038,.043,1,16),cuff):null;if(band)root.add(band);
    const h=this.hand(character,left);h.name=character+':fps-'+(left?'left':'right')+'-hand';h.position.set(left?-.045:.05,left?-.055:-.125,left?-long*.27:long*.17);if(left)h.rotation.set(0,0,-1.2);root.add(h);root.userData[left?'leftHand':'rightHand']=h;
    root.userData.arms.push({mesh:arm,band,elbow:new T.Vector3(...elbow),left});
   }
  }
  const flash=FPSFX.sprite({map:FPSFX.texture(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:'#fff0c2'});flash.scale.set(.22,.22,1);flash.position.set(0,.012,-long*.86);flash.visible=false;body.add(flash);root.userData.flash=flash;root.userData.long=long;this.animate(root,{gun:id,reloading:0,recoil:0});return root;
 },
 animate(gun,p){
  const u=gun.userData,t=p.reloading?clamp(1-p.reloading/FPS_GUNS[p.gun].reload,0,1):0,reach=Math.sin(t*Math.PI),pull=Math.sin(clamp((t-.18)/.6,0,1)*Math.PI);u.magazine.position.set(.025*pull,-.23*pull,.06*pull);u.magazine.rotation.x=pull*.2;u.body.position.z=p.recoil*.2;
  if(u.leftHand){u.leftHand.position.set(lerp(-.045,-.035,reach),lerp(-.055,-.23,reach),lerp(-u.long*.27,-.035,reach));u.leftHand.rotation.z=lerp(-1.2,-.4,reach);}
  for(const arm of u.arms||[]){const hand=arm.left?u.leftHand:u.rightHand,wrist=new KartGL.Vector3(0,.055,.01).applyEuler(hand.rotation).add(hand.position),delta=wrist.clone().sub(arm.elbow);arm.mesh.position.copy(arm.elbow).add(wrist).multiplyScalar(.5);arm.mesh.quaternion.setFromUnitVectors(new KartGL.Vector3(0,1,0),delta.clone().normalize());arm.mesh.scale.y=delta.length();if(arm.band){arm.band.position.copy(wrist).lerp(arm.elbow,.07);arm.band.quaternion.copy(arm.mesh.quaternion);arm.band.scale.y=delta.length()*.14;}}
 },
 character(id){
  const m=CharacterModels.standing(id),u=m.userData,L=u.design;u.detail=new KartGL.Group();u.detail.name=id+':fps-costume-details';u.torso.add(u.detail);const b=FPSScenery.batch(),cloth=this.material(L.top,'fabric'),seam=this.material(shade(L.top,-.15),'fabric'),leather=this.material(L.shoe||'#493e35'),metal=this.material('#7b8b8d','metal'),K=skOf(id),w=L.build.chest/60,h=K.torso/60;
  // Stitching and equipment follow the existing costume, with its face/art intact.
  for(const side of [-1,1]){this.link(b,seam,[side*w*.76,-h*.15,0],[side*w*.65,-h*.92,0],.005);for(let j=0;j<7;j++)b.add('sphere',cloth,[side*w*.72,-h*(.2+j*.09),.04],[.006,.002,.004]);}
  b.add('box',leather,[0,-h*.92,0],[w*1.45,.04,w*1.12]);b.add('box',metal,[.02,-h*.92,w*.58],[.042,.036,.01]);b.finish(u.detail);
  // Boots retain the canonical shoe palette; add a separate toe cap and laces.
  if(L.shoe&&L.feet!=='claw')for(const leg of [u.legL,u.legR]){const foot=leg.userData.end,fb=FPSScenery.batch();for(let i=0;i<3;i++)fb.add('box',seam,[0,.033,.08+i*.04],[.085,.005,.007]);fb.add('box',leather,[0,-.055,.19],[.145,.02,.1]);fb.finish(foot);}
  const old=m.children.find(c=>c.name===id+':equipped-gun');if(old){m.remove(old);old.traverse(c=>c.geometry?.dispose());}const eye=u.head.position.y*m.scale.y;m.scale.multiplyScalar(FPSBody.head/eye);u.baseHead=u.head.position.y;u.baseShoulder=u.torso.position.y;u.baseNeck=u.neck.position.y;u.weapon=null;u.weaponId=-1;return m;
 },
};
