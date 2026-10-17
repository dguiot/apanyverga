'use strict';
// FPS-only art: physical metre UVs, layered landscape, batched foliage and
// architectural details. Collidable cover is always sourced from FPSWorld.
const FPSScenery={
 textures:new Map(),materials:new Map(),
 begin(){this.textures.clear();this.materials.clear();},
 texture(kind){
  if(this.textures.has(kind))return this.textures.get(kind);const T=KartGL,n=512,cv=mkCanvas(n,n),c=cv.getContext('2d'),rng=srand(9713+kind.length*107),im=c.createImageData(n,n);
  const palette={plaster:[222,210,185],stone:[152,151,138],grass:[112,135,87],earth:[174,148,104],steel:[137,153,155],wood:[157,125,84],roof:[114,135,139],sandbag:[184,171,134],gabion:[153,151,132],supply:[142,128,97]},base=palette[kind]||palette.stone;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,noise=(rng()-.5)*(kind==='plaster'?13:35)+Math.sin(x*.037)*Math.cos(y*.051)*(kind==='plaster'?.7:9)+Math.sin(x*.11+y*.023)*(kind==='plaster'?.4:3);for(let k=0;k<3;k++)im.data[i+k]=clamp(base[k]+noise,0,255);im.data[i+3]=255;}c.putImageData(im,0,0);
  if(kind==='plaster'){for(let i=0;i<85;i++){const x=rng()*n,y=rng()*n;c.fillStyle='rgba(91,80,61,.07)';c.fillRect(x,y,2+rng()*27,2+rng()*6);}for(let i=0;i<6;i++){let x=rng()*n,y=rng()*n;c.strokeStyle='rgba(81,76,65,.25)';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);for(let j=0;j<8;j++){x+=(rng()-.5)*14;y+=rng()*9;c.lineTo(x,y);}c.stroke();}}
  if(kind==='stone'){for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*128+(row%2)*64,y=row*64;c.strokeStyle='#656f66';c.lineWidth=2;c.strokeRect(x+1,y+1,126,62);c.strokeStyle='rgba(237,234,212,.35)';c.lineWidth=1;c.strokeRect(x+4,y+4,120,56);}}
  if(kind==='grass')for(let i=0;i<15000;i++){const x=rng()*n,y=rng()*n;c.strokeStyle=i%3?'rgba(49,75,32,.22)':'rgba(222,211,137,.3)';c.lineWidth=.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+(rng()-.5)*4,y-2-rng()*8);c.stroke();}
  if(kind==='steel'||kind==='roof'){for(let i=0;i<32;i++){const x=i*16;c.fillStyle='rgba(13,40,48,.23)';c.fillRect(x,0,3,n);c.fillStyle='rgba(240,248,237,.25)';c.fillRect(x+3,0,2,n);}for(let i=0;i<80;i++){c.fillStyle='rgba(139,79,41,.2)';c.fillRect(rng()*n,rng()*n,1+rng()*3,3+rng()*26);}}
  if(kind==='wood'){for(let i=0;i<65;i++){c.strokeStyle='rgba(61,43,29,.15)';c.beginPath();c.moveTo(i*8,0);c.bezierCurveTo(i*8+9,180,i*8-8,330,i*8+2,n);c.stroke();}for(let i=0;i<5;i++){c.fillStyle='#635b41';c.fillRect(i*104,0,2,n);}}
  if(kind==='sandbag'){for(let i=0;i<n;i+=4){c.fillStyle='rgba(40,43,27,.1)';c.fillRect(i,0,1,n);c.fillRect(0,i,n,1);}c.strokeStyle='rgba(58,52,31,.4)';c.setLineDash([3,3]);c.strokeRect(8,8,n-16,n-16);}
  if(kind==='gabion'){for(let i=0;i<1300;i++){const x=rng()*n,y=rng()*n;c.fillStyle=['#7b8177','#b1b29e','#959a87','#c4c2ac'][i%4];c.beginPath();c.ellipse(x,y,4+rng()*9,3+rng()*6,rng()*3,0,TAU);c.fill();}c.strokeStyle='rgba(37,50,48,.7)';c.lineWidth=1.4;for(let i=0;i<n;i+=24){c.beginPath();c.moveTo(i,0);c.lineTo(i,n);c.moveTo(0,i);c.lineTo(n,i);c.stroke();}}
  if(kind==='cliff')for(let i=0;i<34;i++){const y=i*16+rng()*8;c.strokeStyle=i%3?'rgba(68,66,53,.3)':'rgba(222,211,178,.45)';c.lineWidth=1+rng()*4;c.beginPath();for(let x=0;x<=n;x+=10)c.lineTo(x,y+Math.sin(x*.017+i)*7+Math.sin(x*.053)*3);c.stroke();}
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;this.textures.set(kind,tex);return tex;
 },
 material(kind,color='#ffffff',vertexColors=false){const key=kind+color+vertexColors;if(!this.materials.has(key)){const map=this.texture(kind);this.materials.set(key,new KartGL.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:kind==='stone'?.065:kind==='plaster'?.012:.025,roughness:kind==='steel'?.57:.91,metalness:kind==='steel'?.55:0,vertexColors}));}return this.materials.get(key);},
 box(view,b,batch){
  if(['sandbag','gabion','supply'].includes(b.type)){this.cover(b,batch);return;}
  const T=KartGL,geo=new T.BoxGeometry(b.w,b.h,b.d),p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i):p.getX(i))/3.5,(ny>.5?p.getZ(i):p.getY(i))/3.5);}
  const kind=b.type==='plaster'?'plaster':['steel','container'].includes(b.type)?'steel':b.type==='roof'?'roof':['crate','bridge','trunk'].includes(b.type)?'wood':'stone';
  const color=b.color||({container:b.x>65?'#4a8290':'#bb7650',roof:'#d0ddd7',trunk:'#88775a',crate:'#d1ad7c',barrier:'#d4d9cb',steel:'#65828b',bridge:'#c2a57f',stone:'#d1cdb7'}[b.type])||'#d6d5c7';
  batch.geometry(geo,this.material(kind,color),[b.x,b.y+b.h/2,b.z]);
 },
 cover(q,batch){
  const T=KartGL,bag=q.type==='sandbag',rock=q.type==='gabion',mat=this.material(bag?'sandbag':rock?'gabion':'wood',bag?'#ede1be':rock?'#d3d2b5':'#a5b5a2'),rim=this.material('steel','#697570'),wood=this.material('wood','#cfb48c');
  // The dense core fills its collision envelope. The small bevel is cosmetic.
  const geo=new T.BoxGeometry(q.w-(bag?.05:0),q.h-(bag?.12:0),q.d*(bag?.62:1));batch.geometry(geo,mat,[q.x,q.y+q.h/2,q.z]);
  if(bag){if(!KartModels.geometry.has('fps-sandbag'))KartModels.geometry.set('fps-sandbag',new T.SphereGeometry(1,12,6));for(let row=0;row<4;row++)for(let i=0;i<Math.ceil(q.w/.85);i++){const width=q.w/Math.ceil(q.w/.85);batch.add('fps-sandbag',mat,[q.x-q.w/2+width*(i+.5),q.y+.16+row*.3,q.z],[width*.53,.18,q.d*.53]);}}
  else if(rock){for(const s of [-1,1]){batch.add('box',rim,[q.x+s*q.w/2,q.y+q.h/2,q.z],[.035,q.h,.035]);batch.add('box',rim,[q.x,q.y+q.h,q.z+s*q.d/2],[q.w,.025,.025]);}}
  else{for(const side of [-1,1])for(const k of [-1,1]){batch.add('box',rim,[q.x+k*q.w*.36,q.y+q.h/2,q.z+side*(q.d/2+.025)],[.09,q.h,.05]);batch.add('box',wood,[q.x,q.y+q.h/2+k*(q.h/2-.1),q.z+side*(q.d/2+.04)],[q.w,.13,.08]);}batch.add('box',rim,[q.x,q.y+q.h+.025,q.z],[q.w,.04,q.d]);}
 },
 batch(){const bins=new Map(),T=KartGL;return {geometry(g,mat,pos){g.translate(...pos);if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(g);},add(type,mat,pos,scale,rot){const g=KartModels.geo(type).clone().applyMatrix4(KartModels.matrix(pos,scale,rot));if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(g);},finish(scene,cast=true){for(const [mat,gs]of bins){const merged=T.mergeGeometries(gs,false),mesh=new T.Mesh(merged,mat);gs.forEach(g=>g.dispose());mesh.castShadow=cast;mesh.receiveShadow=true;scene.add(mesh);}bins.clear();}};},
 build(view){
  this.begin();const T=KartGL,scene=view.scene;scene.fog=new T.FogExp2('#b7ccd0',.00165);scene.environmentIntensity=.32;
  const oldSky=Kart3D.skyMesh;KartWorld.sky(scene,{theme:'town'});view.sky=Kart3D.skyMesh;Kart3D.skyMesh=oldSky;
  scene.add(new T.HemisphereLight('#b5d8ec','#766d4e',1.15));const sun=view.sun=new T.DirectionalLight('#ffe0ad',3.25);sun.position.set(-48,64,-36);sun.castShadow=true;sun.shadow.mapSize.set(IS_XBOX?1024:2048,IS_XBOX?1024:2048);Object.assign(sun.shadow.camera,{left:-39,right:39,top:39,bottom:-39,near:.1,far:200});sun.shadow.bias=-.0006;sun.shadow.normalBias=.1;sun.shadow.radius=2;scene.add(sun,sun.target);
  const terrain=new T.PlaneGeometry(630,630,160,160),p=terrain.attributes.position,uv=terrain.attributes.uv,colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i),h=FPSWorld.height(x,z);p.setZ(i,h);uv.setXY(i,x/4,z/4);const river=Math.abs(x+115),path=Math.min(Math.abs(x),Math.abs(z-25)*.8),c=new T.Color(river<16?'#d1c0a0':path<8?'#c4b483':h>14?'#99aa75':'#a7bc73');c.multiplyScalar(.93+.07*Math.sin(x*.18)*Math.cos(z*.13));colors.push(c.r,c.g,c.b);}
  terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();const ground=view.mesh(terrain,this.material('grass','#ffffff',true),[0,0,0]);ground.rotation.x=-Math.PI/2;ground.name='fps-contoured-terrain';
  this.ridges(view);const solids=this.batch();for(const b of FPSWorld.solids)this.box(view,b,solids);solids.finish(scene);
  const batch=this.batch(),stone=this.material('stone','#d5cebb'),cream=KartModels.mat('#d8ceb7'),trim=KartModels.mat('#e6deca'),dark=KartModels.mat('#263f47',.35,.65),metal=KartModels.mat('#637d80',.65,.5),wood=this.material('wood','#bca47d'),blue=KartModels.mat('#386c7c',.3,.35);
  // Details follow the same shell geometry as collision: real doors, roof
  // access and overhangs, with windows treated as opaque ballistic cover.
  for(const b of FPSWorld.decor.filter(b=>b.type==='building')){
   for(const side of [-1,1]){
    batch.add('box',stone,[b.x+side*(b.w/2+.015),b.y+.4,b.z],[.14,.8,b.d]);
    batch.add('box',trim,[b.x,b.y+b.h+.15,b.z+side*(b.d/2+.1)],[b.w+1,.18,.4]);
    for(let j=-2;j<=2;j++){
     const x=b.x+j*b.w/6,z=b.z+side*(b.d/2+.65);batch.add('box',dark,[x,b.y+3.9,z],[2.3,1.7,.13]);batch.add('box',blue,[x,b.y+3.9,z+side*.075],[1.95,1.35,.025]);
     for(const s of [-1,1]){batch.add('box',trim,[x+s*1.2,b.y+3.9,z],[.11,1.95,.22]);batch.add('box',trim,[x,b.y+3.9+s*.92,z],[2.5,.11,.22]);}
     batch.add('box',cream,[x,b.y+2.95,z+side*.15],[2.65,.12,.5]);batch.add('box',dark,[x,b.y+3.9,z+side*.09],[.07,1.5,.04]);for(const s of [-1,1]){batch.add('box',wood,[x+s*1.6,b.y+3.9,z],[.6,1.8,.12]);for(let k=0;k<6;k++)batch.add('box',dark,[x+s*1.6,b.y+3.2+k*.25,z+side*.07],[.5,.035,.03]);}
    }
    for(const j of [-1,1]){const x=b.x+side*(b.w/2+.65),z=b.z+j*b.d*.26;batch.add('box',dark,[x,b.y+3.7,z],[.12,1.65,2.8]);batch.add('box',blue,[x+side*.07,b.y+3.7,z],[.03,1.45,2.6]);batch.add('box',cream,[x+side*.17,b.y+2.8,z],[.45,.13,3.1]);}
    batch.add('branch',metal,[b.x+side*(b.w/2+.6),b.y+b.h*.5,b.z+b.d/2],[.075,b.h,.075]);
   }
   const awning=KartModels.mat(b.x<0?'#c78659':'#708977',0,.95);batch.add('box',awning,[b.x,b.y+3.25,b.z+b.d/2+1.2],[b.w*.4,.12,2.2],[.15,0,0]);
   for(const x of [-1,1])batch.add('branch',metal,[b.x+x*b.w*.19,b.y+1.55,b.z+b.d/2+2.1],[.045,3.1,.045]);
   batch.add('cylinder',KartModels.mat('#9aafad',.55,.52),[b.x-4,b.y+b.h+1.2,b.z-2],[1.25,2,1.25]);
   batch.add('box',dark,[b.x+5,b.y+b.h+.45,b.z-2],[3.6,.6,2.2]);
   for(const side of [-1,1]){batch.add('box',cream,[b.x+side*(b.w/2+.12),b.y+b.h-1,b.z],[.25,.2,b.d]);const start=new T.Vector3(b.x+b.w/2+2.5+side*1.4,b.y+1.1,b.z-b.d/2),end=new T.Vector3(start.x,b.y+b.h+1.2,b.z+b.d/2),delta=end.clone().sub(start),rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()));batch.add('branch',metal,start.add(end).multiplyScalar(.5).toArray(),[.035,delta.length(),.035],[rot.x,rot.y,rot.z]);}
   for(const x of [-1,1])for(let j=0;j<5;j++)batch.add('box',metal,[b.x+5+x*1.83,b.y+b.h+.45,b.z-2+(j-2)*.32],[.04,.4,.13]);
   const label=view.sign(b.x>60?'DEPÓSITO  /  03':b.z>50?'TALLER  /  02':b.x>0?'ESTACIÓN  /  01':'CASA SIERRA');label.scale.set(.4,.55,1);label.position.set(b.x,b.y+5.8,b.z+b.d/2+.5);scene.add(label);
  }
  for(const b of FPSWorld.solids.filter(b=>b.type==='container')){for(const z of [-1,1])for(let i=-2;i<=2;i++)batch.add('box',metal,[b.x+i*b.w/6,b.y+1.5,b.z+z*(b.d/2+.05)],[.04,2.6,.07]);batch.add('box',cream,[b.x-2,b.y+1.4,b.z+b.d/2+.07],[1.8,.6,.03]);}
  for(const b of FPSWorld.solids.filter(b=>b.type==='crate'))for(const side of [-1,1]){for(const x of [-1,1])batch.add('box',metal,[b.x+x*(b.w/2-.12),b.y+b.h/2,b.z+side*(b.d/2+.025)],[.12,b.h,.06]);for(const j of [-1,1])batch.add('box',wood,[b.x,b.y+b.h/2+j*(b.h/2-.12),b.z+side*(b.d/2+.08)],[b.w,.18,.09]);batch.add('box',wood,[b.x,b.y+b.h/2,b.z+side*(b.d/2+.05)],[b.w*1.17,.17,.08],[0,0,side*.58]);}
  // The central square is readable from ground level; paving and dirt trails
  // are draped over the same height function used by the player capsule.
  this.patch(view,0,0,31,35,'stone','#d7cfb5',.024);this.patch(view,0,-49,10,60,'earth','#d8c298',.02);this.patch(view,0,49,10,62,'earth','#d8c298',.02);this.patch(view,-53,25,100,8,'earth','#d8c298',.022);
  for(const [x,z]of [[-20,-19],[20,20],[-28,29],[28,-31]]){const y=FPSWorld.height(x,z);batch.add('box',stone,[x,y+.15,z],[4,.3,3]);for(let j=0;j<6;j++)batch.add('sphere',KartModels.mat(j%2?'#738b48':'#87984f'),[x+(j%3-1)*.8,y+.9,z+(j<3?-.5:.5)],[.7,.7,.6]);}
  for(const x of [-13,13])for(const z of [-32,32]){const y=FPSWorld.height(x,z);batch.add('branch',dark,[x,y+3.4,z],[.065,6.8,.065]);batch.add('box',dark,[x+.6,y+6.8,z],[1.3,.08,.1]);batch.add('box',KartModels.mat('#fff2c8',0,.5,'#6c5a29'),[x+1.15,y+6.7,z],[.45,.06,.4]);}
  const gate=view.sign('SIERRA  //  DISTRITO 01');gate.scale.set(.9,.8,1);gate.position.set(0,FPSWorld.height(0,-76)+6.7,-74.98);scene.add(gate);
  const tower=FPSWorld.decor.find(b=>b.type==='tower');for(const x of [-3,3])for(const z of [-3,3])batch.add('box',blue,[tower.x+x,tower.y+10.5,tower.z+z],[.12,2.4,.12]);batch.add('box',metal,[tower.x,tower.y+11.7,tower.z],[8,.18,8]);
  this.vegetation(view,batch);batch.finish(scene);this.river(view);
 },
 patch(view,x,z,w,d,kind,color,lift){const T=KartGL,geo=new T.PlaneGeometry(w,d,Math.ceil(w/2),Math.ceil(d/2)),p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const px=p.getX(i)+x,pz=-p.getY(i)+z;p.setZ(i,FPSWorld.height(px,pz)+lift);uv.setXY(i,px/3.5,pz/3.5);}geo.computeVertexNormals();const m=view.mesh(geo,this.material(kind,color),[x,0,z]);m.rotation.x=-Math.PI/2;},
 ridges(view){
  const T=KartGL;for(let layer=0;layer<3;layer++){const n=180,rows=16,pos=[],colors=[],ix=[],rng=srand(881+layer),phase=rng()*6;
   const uv=[];for(let row=0;row<=rows;row++)for(let i=0;i<=n;i++){const angle=i*TAU/n,t=row/rows,envelope=Math.sin(t*Math.PI),rad=350+layer*190+t*(160+layer*50)+Math.sin(angle*19+t*12)*8*envelope,peak=80+layer*45+(Math.sin(angle*5+phase)+1)*29+(Math.sin(angle*11)+1)*14,h=-13+envelope*peak+(Math.sin(angle*27+t*11)*17+Math.cos(angle*39-t*7)*9)*envelope;
    pos.push(Math.sin(angle)*rad,h,Math.cos(angle)*rad);uv.push(i/n*50,t*7);const c=new T.Color(layer===0?'#838976':layer===1?'#8ca4a2':'#b3c5c6');c.multiplyScalar(.88+Math.cos(angle-1)*.1+t*.06);colors.push(c.r,c.g,c.b);if(row<rows&&i<n){const k=row*(n+1)+i;ix.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();const mat=this.material('cliff','#eeeee4',true);mat.side=T.DoubleSide;const m=view.mesh(geo,mat,[0,0,0]);m.name='fps-distant-ridge-'+layer;m.castShadow=false;
  }
 },
 leafMaterial(){
  const T=KartGL,cv=mkCanvas(256,256),c=cv.getContext('2d'),rng=srand(913);for(let i=0;i<160;i++){const x=rng()*256,y=rng()*256,a=rng()*TAU;c.save();c.translate(x,y);c.rotate(a);c.fillStyle=['#709345','#557e3f','#8ca34e','#a2b65b'][i%4];c.beginPath();c.ellipse(0,0,4+rng()*4,9+rng()*6,0,0,TAU);c.fill();c.strokeStyle='#b1ba6f';c.lineWidth=.6;c.beginPath();c.moveTo(0,-8);c.lineTo(0,8);c.stroke();c.restore();}
  const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return new T.MeshStandardMaterial({map,alphaTest:.38,side:T.DoubleSide,roughness:.9});
 },
 vegetation(view,batch){
  const T=KartGL,leaf=this.leafMaterial(),wood=this.material('wood','#b2a581'),rng=srand(772);
  for(const tree of FPSWorld.decor.filter(b=>b.type==='tree')){const {x,z,y,h}=tree;for(let j=0;j<5;j++){const a=j*2.4,rad=1.5+rng()*1.7,by=y+h*(.55+j%2*.12),bx=x+Math.cos(a)*rad,bz=z+Math.sin(a)*rad;const start=new T.Vector3(x,y+h*.33,z),end=new T.Vector3(bx,by,bz),delta=end.clone().sub(start),rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()));batch.add('branch',wood,start.add(end).multiplyScalar(.5).toArray(),[.07,delta.length(),.07],[rot.x,rot.y,rot.z]);
    for(let k=0;k<5;k++)batch.add('plane',leaf,[bx+(rng()-.5)*2,by+(rng()-.5)*2,bz+(rng()-.5)*2],[3.4+rng(),3+rng(),1],[rng()*1.8,rng()*TAU,rng()*1.6]);}
  }
  const grassCanvas=mkCanvas(128,128),c=grassCanvas.getContext('2d');for(let i=0;i<28;i++){const x=rng()*128;c.fillStyle=i%3?'#8c9c50':'#bac075';c.beginPath();c.moveTo(x-1.5,128);c.quadraticCurveTo(x+12,60,x+(rng()-.5)*40,4+rng()*64);c.quadraticCurveTo(x+7,92,x+2,128);c.fill();}const map=new T.CanvasTexture(grassCanvas);map.colorSpace=T.SRGBColorSpace;const mat=new T.MeshStandardMaterial({map,alphaTest:.4,side:T.DoubleSide,roughness:1});
  const blades=this.batch();for(let i=0;i<2300;i++){const x=(rng()-.5)*360,z=(rng()-.5)*360;if(Math.abs(x)<19||Math.abs(z-25)<7||Math.abs(x+115)<17||FPSWorld.solids.some(b=>Math.abs(x-b.x)<b.w/2+2&&Math.abs(z-b.z)<b.d/2+2))continue;const y=FPSWorld.height(x,z),h=.35+rng()*.55;for(let j=0;j<2;j++)blades.add('plane',mat,[x,y+h*.4,z],[.8,h,1],[0,rng()*TAU+j*Math.PI/2,0]);}const group=view.grass=new T.Group();blades.finish(group,false);view.scene.add(group);
 },
 river(view){
  const T=KartGL,geo=new T.PlaneGeometry(23,610,4,120),p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,FPSWorld.waterLevel(-p.getY(i))+.04);geo.computeVertexNormals();
  const map=this.texture('roof').clone();map.repeat.set(1.4,38);const water=new T.MeshStandardMaterial({color:'#3c8e97',roughness:.24,metalness:.45,transparent:true,opacity:.9,bumpMap:map,bumpScale:.018});view.water=view.mesh(geo,water,[-115,0,0]);view.water.rotation.x=-Math.PI/2;
  const batch=this.batch(),mat=this.material('stone','#c7c6ad'),rng=srand(731);for(let i=0;i<130;i++){const z=-300+i*4.6;for(const side of [-1,1])batch.add('rock',mat,[-115+side*(12+rng()*3),FPSWorld.height(-115,z),z],[1+rng(),.4+rng()*.8,1+rng()],[rng()*.2,rng()*6,0]);}batch.finish(view.scene);
 },
};
