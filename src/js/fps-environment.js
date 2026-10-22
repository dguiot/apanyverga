'use strict';
// FPS-only art: physical metre UVs, layered landscape, batched foliage and
// architectural details. Collidable cover is always sourced from FPSWorld.
const FPSScenery={
 textures:new Map(),materials:new Map(),
 begin(){this.textures.clear();this.materials.clear();},
 texture(kind){
  if(this.textures.has(kind))return this.textures.get(kind);const T=KartGL,n=512,cv=mkCanvas(n,n),c=cv.getContext('2d'),rng=srand(9713+kind.length*107),im=c.createImageData(n,n);
  const palette={plaster:[222,210,185],stone:[152,151,138],grass:[112,135,87],earth:[174,148,104],steel:[137,153,155],wood:[157,125,84],roof:[114,135,139],concrete:[179,182,171],window:[76,111,128],sandbag:[184,171,134],gabion:[153,151,132],supply:[142,128,97]},base=palette[kind]||palette.stone;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,noise=(rng()-.5)*(kind==='plaster'?13:35)+Math.sin(x*.037)*Math.cos(y*.051)*(kind==='plaster'?.7:9)+Math.sin(x*.11+y*.023)*(kind==='plaster'?.4:3);for(let k=0;k<3;k++)im.data[i+k]=clamp(base[k]+noise,0,255);im.data[i+3]=255;}c.putImageData(im,0,0);
  if(kind==='plaster'){for(let i=0;i<85;i++){const x=rng()*n,y=rng()*n;c.fillStyle='rgba(91,80,61,.07)';c.fillRect(x,y,2+rng()*27,2+rng()*6);}for(let i=0;i<6;i++){let x=rng()*n,y=rng()*n;c.strokeStyle='rgba(81,76,65,.25)';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);for(let j=0;j<8;j++){x+=(rng()-.5)*14;y+=rng()*9;c.lineTo(x,y);}c.stroke();}}
  if(kind==='window'){const sky=c.createLinearGradient(0,0,0,n);sky.addColorStop(0,'#9bb7c2');sky.addColorStop(.42,'#426b80');sky.addColorStop(1,'#162e3b');c.fillStyle=sky;c.fillRect(0,0,n,n);c.fillStyle='rgba(222,235,235,.14)';c.beginPath();c.moveTo(40,0);c.lineTo(150,0);c.lineTo(n,390);c.lineTo(n,480);c.closePath();c.fill();c.fillStyle='rgba(12,27,34,.12)';c.fillRect(0,n-22,n,22);}
  if(kind==='stone'){for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*128+(row%2)*64,y=row*64;c.strokeStyle='#656f66';c.lineWidth=2;c.strokeRect(x+1,y+1,126,62);c.strokeStyle='rgba(237,234,212,.35)';c.lineWidth=1;c.strokeRect(x+4,y+4,120,56);}}
  if(kind==='grass')for(let i=0;i<15000;i++){const x=rng()*n,y=rng()*n;c.strokeStyle=i%3?'rgba(49,75,32,.22)':'rgba(222,211,137,.3)';c.lineWidth=.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+(rng()-.5)*4,y-2-rng()*8);c.stroke();}
  if(kind==='steel'||kind==='roof'){for(let i=0;i<32;i++){const x=i*16;c.fillStyle='rgba(13,40,48,.23)';c.fillRect(x,0,3,n);c.fillStyle='rgba(240,248,237,.25)';c.fillRect(x+3,0,2,n);}for(let i=0;i<80;i++){c.fillStyle='rgba(139,79,41,.2)';c.fillRect(rng()*n,rng()*n,1+rng()*3,3+rng()*26);}}
  if(kind==='wood'){for(let i=0;i<65;i++){c.strokeStyle='rgba(61,43,29,.15)';c.beginPath();c.moveTo(i*8,0);c.bezierCurveTo(i*8+9,180,i*8-8,330,i*8+2,n);c.stroke();}for(let i=0;i<5;i++){c.fillStyle='#635b41';c.fillRect(i*104,0,2,n);}}
  if(kind==='sandbag'){for(let i=0;i<n;i+=4){c.fillStyle='rgba(40,43,27,.1)';c.fillRect(i,0,1,n);c.fillRect(0,i,n,1);}c.strokeStyle='rgba(58,52,31,.4)';c.setLineDash([3,3]);c.strokeRect(8,8,n-16,n-16);}
  if(kind==='gabion'){for(let i=0;i<1300;i++){const x=rng()*n,y=rng()*n;c.fillStyle=['#7b8177','#b1b29e','#959a87','#c4c2ac'][i%4];c.beginPath();c.ellipse(x,y,4+rng()*9,3+rng()*6,rng()*3,0,TAU);c.fill();}c.strokeStyle='rgba(37,50,48,.7)';c.lineWidth=1.4;for(let i=0;i<n;i+=24){c.beginPath();c.moveTo(i,0);c.lineTo(i,n);c.moveTo(0,i);c.lineTo(n,i);c.stroke();}}
  if(kind==='cliff')for(let i=0;i<34;i++){const y=i*16+rng()*8;c.strokeStyle=i%3?'rgba(68,66,53,.3)':'rgba(222,211,178,.45)';c.lineWidth=1+rng()*4;c.beginPath();for(let x=0;x<=n;x+=10)c.lineTo(x,y+Math.sin(x*.017+i)*7+Math.sin(x*.053)*3);c.stroke();}
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;this.textures.set(kind,tex);return tex;
 },
 // el pasto y la tierra se leen dos veces (otra escala y otro giro) y se mezclan: así no se ve la cuadrícula del mosaico
 antiTile(m){m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\n vec4 tileA=texture2D(map,vMapUv),tileB=texture2D(map,mat2(.8,-.6,.6,.8)*vMapUv*.43+.37);diffuseColor*=mix(tileA,tileB,.45);\n#endif');};m.customProgramCacheKey=()=>'fps-anti-tile';return m;},
 // manchas grandes de pasto verde, seco y oscuro (ruido suave) con orillas graduales hacia caminos y río
 groundColor(x,z,h,river,path){
  const T=KartGL,P=this.palette||(this.palette={lush:new T.Color('#98b072'),dry:new T.Color('#c2bd8c'),dark:new T.Color('#7a945c'),high:new T.Color('#9ba877'),path:new T.Color('#cdb889'),bank:new T.Color('#d3c3a2')}),c=new T.Color();
  const n1=Math.sin(x*.021+Math.sin(z*.017)*1.6)*Math.cos(z*.019-Math.sin(x*.013)*1.4),n2=Math.sin(x*.067+z*.041)*Math.cos(z*.073-x*.029),s=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  c.copy(P.lush).lerp(P.dry,s(.05,.7,n1)*.9).lerp(P.dark,s(.3,.85,-n1)*.8).lerp(P.high,s(11,17,h));c.multiplyScalar(.93+n2*.07);
  return c.lerp(P.path,1-s(6,9.5,path)).lerp(P.bank,1-s(14,18,river));
 },
 material(kind,color='#ffffff',vertexColors=false){const key=kind+color+vertexColors;if(!this.materials.has(key)){const map=this.texture(kind);this.materials.set(key,(kind==='grass'||kind==='earth'?this.antiTile.bind(this):m=>m)(new KartGL.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:kind==='window'?0:kind==='stone'?.065:kind==='plaster'?.012:.025,roughness:kind==='window'?.19:kind==='steel'?.57:.91,metalness:kind==='window'?.48:kind==='steel'?.55:0,vertexColors})));}return this.materials.get(key);},
 // auto compacto: carrocería con pintura metálica, cabina con vidrios oscuros, llantas, defensas y faros
 car(b,batch){
  const T=KartGL,paint=KartModels.mat(b.color||'#c9c2b4',.55,.32),glass=KartModels.mat('#1b2730',.6,.08),rubber=KartModels.mat('#18191a',0,.9),trim=KartModels.mat('#26292b',.3,.6),chrome=KartModels.mat('#b8bec2',.9,.25),lamp=KartModels.mat('#eef3f2',.2,.2,'#2b2b26'),tail=KartModels.mat('#a3241f',.2,.3,'#3a0806');
  const ry=b.rot?Math.PI/2:0,c=Math.cos(ry),s=Math.sin(ry),at=(x,y,z)=>[b.x+x*c+z*s,b.y+y,b.z-x*s+z*c],add=(type,m,p,sc,r=[0,0,0])=>batch.add(type,m,at(...p),sc,[r[0],r[1]+ry,r[2]]);
  FPSGear.rounded();add('fps-rounded',paint,[0,.52,0],[1.82,.66,4.4]);add('fps-rounded',paint,[0,1.1,-.18],[1.6,.56,2.25]);
  add('box',glass,[0,1.1,.98],[1.46,.48,.05],[-.62,0,0]);add('box',glass,[0,1.1,-1.33],[1.42,.44,.05],[.66,0,0]);for(const x of [-1,1])add('box',glass,[x*.805,1.13,-.18],[.03,.38,1.95]);
  for(const x of [-1,1])for(const z of [-1.36,1.36]){add('cylinder',rubber,[x*.82,.33,z],[.33,.24,.33],[0,0,Math.PI/2]);add('cylinder',chrome,[x*.95,.33,z],[.2,.02,.2],[0,0,Math.PI/2]);}
  for(const z of [-1,1])add('fps-rounded',trim,[0,.42,z*2.22],[1.86,.2,.16]);add('box',trim,[0,.66,2.205],[.8,.16,.02]);
  for(const x of [-1,1]){add('box',lamp,[x*.62,.66,2.2],[.32,.12,.03]);add('box',tail,[x*.66,.7,-2.2],[.3,.13,.03]);add('box',trim,[x*.93,1.02,.55],[.08,.06,.18]);}
 },
 // tambo de 200 litros con aros y tapa
 barrel(b,batch){const paint=KartModels.mat(b.color||'#2f4f7a',.35,.6),rim=KartModels.mat(shade(b.color||'#2f4f7a',-.25),.4,.55);batch.add('cylinder',paint,[b.x,b.y+.44,b.z],[.29,.88,.29]);for(const y of [.29,.59])batch.add('torus',rim,[b.x,b.y+y,b.z],[.295,.295,.295],[Math.PI/2,0,0]);batch.add('cylinder',rim,[b.x,b.y+.885,b.z],[.27,.012,.27]);},
 box(view,b,batch){
  if(b.type==='car'){this.car(b,batch);return;}if(b.type==='barrel'){this.barrel(b,batch);return;}
  if(['sandbag','gabion','supply'].includes(b.type)){this.cover(b,batch);return;}
  if(b.finish==='window'){batch.add('box',this.material('window','#c6d3d5'),[b.x,b.y+b.h/2,b.z],[b.w,b.h,b.d]);return;}
  const T=KartGL,geo=new T.BoxGeometry(b.w,b.h,b.d),p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i):p.getX(i))/3.5,(ny>.5?p.getZ(i):p.getY(i))/3.5);}
  const kind=b.finish==='concrete'?'concrete':b.finish==='floor'?'stone':b.type==='plaster'?'plaster':['steel','container'].includes(b.type)?'steel':b.type==='roof'?'roof':['crate','bridge','trunk'].includes(b.type)?'wood':'stone';
  const color=(b.finish==='concrete'?'#b8beb2':b.finish==='floor'?'#c3c0ad':null)||b.color||({container:b.x>65?'#4a8290':'#bb7650',roof:'#d0ddd7',trunk:'#88775a',crate:'#d1ad7c',barrier:'#d4d9cb',steel:'#65828b',bridge:'#c2a57f',stone:'#d1cdb7'}[b.type])||'#d6d5c7';
  batch.geometry(geo,this.material(kind,color),[b.x,b.y+b.h/2,b.z]);
 },
 cover(q,batch){
  const T=KartGL,bag=q.type==='sandbag',rock=q.type==='gabion',mat=this.material(bag?'sandbag':rock?'gabion':'wood',bag?'#ede1be':rock?'#d3d2b5':'#a5b5a2'),rim=this.material('steel','#697570'),wood=this.material('wood','#cfb48c');
  // The dense core fills its collision envelope. The small bevel is cosmetic.
  const geo=new T.BoxGeometry(q.w-(bag?.05:0),q.h-(bag?.3:0),q.d*(bag?.4:1));batch.geometry(geo,mat,[q.x,q.y+q.h/2,q.z]);
  if(bag){
   if(!KartModels.geometry.has('fps-sandbag')){const g=new T.BoxGeometry(1,1,1,4,3,4),p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){const v=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)),inner=v.clone().clampScalar(-.3,.3),normal=v.clone().sub(inner).normalize();v.copy(inner).addScaledVector(normal,.2);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);}KartModels.geometry.set('fps-sandbag',g);}
   const count=Math.ceil(q.w/.85),width=q.w/count;for(let row=0;row<4;row++)for(let i=0;i<count+(row%2);i++){const start=Math.max(-q.w/2,-q.w/2+(i-(row%2)*.5)*width),end=Math.min(q.w/2,-q.w/2+(i+1-(row%2)*.5)*width);batch.add('fps-sandbag',mat,[q.x+(start+end)/2,q.y+.155+row*.3,q.z],[(end-start)*1.035,.32,q.d*1.035]);}
  }
  else if(rock){for(const s of [-1,1]){batch.add('box',rim,[q.x+s*q.w/2,q.y+q.h/2,q.z],[.035,q.h,.035]);batch.add('box',rim,[q.x,q.y+q.h,q.z+s*q.d/2],[q.w,.025,.025]);}}
  else{for(const side of [-1,1])for(const k of [-1,1]){batch.add('box',rim,[q.x+k*q.w*.36,q.y+q.h/2,q.z+side*(q.d/2+.025)],[.09,q.h,.05]);batch.add('box',wood,[q.x,q.y+q.h/2+k*(q.h/2-.1),q.z+side*(q.d/2+.04)],[q.w,.13,.08]);}batch.add('box',rim,[q.x,q.y+q.h+.025,q.z],[q.w,.04,q.d]);}
 },
 batch(){const bins=new Map(),T=KartGL;return {geometry(g,mat,pos){g.translate(...pos);if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(g);},add(type,mat,pos,scale,rot){const g=KartModels.geo(type).clone().applyMatrix4(KartModels.matrix(pos,scale,rot));if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(g);},finish(scene,cast=true){for(const [mat,gs]of bins){const merged=T.mergeGeometries(gs,false),mesh=new T.Mesh(merged,mat);gs.forEach(g=>g.dispose());mesh.castShadow=cast;mesh.receiveShadow=true;scene.add(mesh);}bins.clear();}};},
 build(view){
  this.begin();const T=KartGL,scene=view.scene;scene.fog=new T.FogExp2('#b7ccd0',.00165);scene.environmentIntensity=.32;
  const oldSky=Kart3D.skyMesh;KartWorld.sky(scene,{theme:'town'});view.sky=Kart3D.skyMesh;Kart3D.skyMesh=oldSky;
  scene.add(new T.HemisphereLight('#b5d8ec','#766d4e',1.15));const sun=view.sun=new T.DirectionalLight('#ffe0ad',3.25);sun.position.set(-48,64,-36);sun.castShadow=true;sun.shadow.mapSize.set(IS_XBOX?1024:2048,IS_XBOX?1024:2048);Object.assign(sun.shadow.camera,{left:-39,right:39,top:39,bottom:-39,near:.1,far:200});sun.shadow.bias=-.0006;sun.shadow.normalBias=.1;sun.shadow.radius=2;scene.add(sun,sun.target);
  const buildings=FPSWorld.decor.filter(b=>b.type==='building'),terrain=new T.PlaneGeometry(630,630,160,160),p=terrain.attributes.position,uv=terrain.attributes.uv,colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i),h=FPSWorld.height(x,z),building=buildings.find(b=>Math.abs(x-b.x)<b.w/2+1.6&&Math.abs(z-b.z)<b.d/2+1.6);p.setZ(i,building?Math.min(h,building.y-.12):h);uv.setXY(i,x/4,z/4);const river=Math.abs(x+115),path=Math.min(Math.abs(x),Math.abs(z-25)*.8),c=this.groundColor(x,z,h,river,path);colors.push(c.r,c.g,c.b);}
  terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();const ground=view.mesh(terrain,this.material('grass','#ffffff',true),[0,0,0]);ground.rotation.x=-Math.PI/2;ground.name='fps-contoured-terrain';
  this.ridges(view);const solids=this.batch();for(const b of FPSWorld.solids)this.box(view,b,solids);solids.finish(scene);
  const batch=this.batch(),stone=this.material('stone','#d5cebb'),cream=KartModels.mat('#d8ceb7'),trim=KartModels.mat('#e6deca'),dark=KartModels.mat('#263f47',.35,.65),metal=KartModels.mat('#637d80',.65,.5),wood=this.material('wood','#bca47d'),blue=KartModels.mat('#386c7c',.3,.35);
  for(const b of FPSWorld.decor.filter(b=>b.type==='building'))FPSArchitecture.build(view,b,batch);
  for(const b of FPSWorld.solids.filter(b=>b.type==='container')){for(const z of [-1,1])for(let i=-2;i<=2;i++)batch.add('box',metal,[b.x+i*b.w/6,b.y+1.5,b.z+z*(b.d/2+.05)],[.04,2.6,.07]);batch.add('box',cream,[b.x-2,b.y+1.4,b.z+b.d/2+.07],[1.8,.6,.03]);}
  for(const b of FPSWorld.solids.filter(b=>b.type==='crate'))for(const side of [-1,1]){for(const x of [-1,1])batch.add('box',metal,[b.x+x*(b.w/2-.12),b.y+b.h/2,b.z+side*(b.d/2+.025)],[.12,b.h,.06]);for(const j of [-1,1])batch.add('box',wood,[b.x,b.y+b.h/2+j*(b.h/2-.12),b.z+side*(b.d/2+.08)],[b.w,.18,.09]);batch.add('box',wood,[b.x,b.y+b.h/2,b.z+side*(b.d/2+.05)],[b.w*1.17,.17,.08],[0,0,side*.58]);}
  // The central square is readable from ground level; paving and dirt trails
  // are draped over the same height function used by the player capsule.
  this.patch(view,0,0,31,35,'stone','#d7cfb5',.024);this.patch(view,0,-49,10,60,'earth','#cbbfa3',.02);this.patch(view,0,49,10,62,'earth','#cbbfa3',.02);this.patch(view,-53,25,100,8,'earth','#cbbfa3',.022);
  for(const [x,z]of [[-20,-19],[20,20],[-28,29],[28,-31]]){const y=FPSWorld.height(x,z);batch.add('box',stone,[x,y+.15,z],[4,.3,3]);for(let j=0;j<6;j++)batch.add('sphere',KartModels.mat(j%2?'#738b48':'#87984f'),[x+(j%3-1)*.8,y+.9,z+(j<3?-.5:.5)],[.7,.7,.6]);}
  for(const x of [-13,13])for(const z of [-32,32]){const y=FPSWorld.height(x,z);batch.add('branch',dark,[x,y+3.4,z],[.065,6.8,.065]);batch.add('box',dark,[x+.6,y+6.8,z],[1.3,.08,.1]);batch.add('box',KartModels.mat('#fff2c8',0,.5,'#6c5a29'),[x+1.15,y+6.7,z],[.45,.06,.4]);}
  const gate=view.sign('SIERRA  //  DISTRITO 01');gate.scale.set(.9,.8,1);gate.position.set(0,FPSWorld.height(0,-76)+6.7,-74.98);scene.add(gate);
  const tower=FPSWorld.decor.find(b=>b.type==='tower');for(const x of [-3,3])for(const z of [-3,3])batch.add('box',blue,[tower.x+x,tower.y+10.5,tower.z+z],[.12,2.4,.12]);batch.add('box',metal,[tower.x,tower.y+11.7,tower.z],[8,.18,8]);
  this.vegetation(view,batch);batch.finish(scene);this.river(view);this.grounding(view);
 },
 // asentar lo que está en el suelo: sombra de contacto suave bajo coberturas, autos y tambos, y una franja de
 // mugre en la base de los edificios (dejando libres las puertas). Dos mallas en total.
 grounding(view){
  const T=KartGL,tex=(draw)=>{const cv=mkCanvas(128,128),c=cv.getContext('2d');draw(c);const t=new T.CanvasTexture(cv);return t;};
  const blob=tex(c=>{const g=c.createRadialGradient(64,64,10,64,64,64);g.addColorStop(0,'rgba(0,0,0,.62)');g.addColorStop(.55,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});
  const grime=tex(c=>{const g=c.createLinearGradient(0,128,0,0);g.addColorStop(0,'rgba(34,29,22,.62)');g.addColorStop(.35,'rgba(40,34,26,.28)');g.addColorStop(1,'rgba(40,34,26,0)');c.fillStyle=g;c.fillRect(0,0,128,128);for(let i=0;i<40;i++){c.fillStyle='rgba(30,25,20,.08)';c.fillRect(Math.random()*128,40+Math.random()*88,1+Math.random()*3,10+Math.random()*40);}});
  const shadows=[],strips=[];
  for(const b of FPSWorld.solids){if(!['car','barrel','crate','sandbag','gabion','supply','container'].includes(b.type))continue;const g=new T.PlaneGeometry(b.w+1.3,b.d+1.3);g.rotateX(-Math.PI/2);g.translate(b.x,FPSWorld.height(b.x,b.z)+.03,b.z);shadows.push(g);}
  for(const b of FPSWorld.decor.filter(b=>b.type==='building'))for(const [axis,side,len]of [['z',1,b.w],['z',-1,b.w],['x',1,b.d],['x',-1,b.d]]){
   const off=(axis==='z'?b.d:b.w)/2+.245,parts=axis==='z'?[[-len/2,-1.65],[1.65,len/2]]:[[-len/2,len/2]];
   for(const [u0,u1]of parts){const g=new T.PlaneGeometry(u1-u0,1.15);if(axis==='x')g.rotateY(side*Math.PI/2);else if(side<0)g.rotateY(Math.PI);const u=(u0+u1)/2;g.translate(axis==='z'?b.x+u:b.x+side*off,b.y+.575,axis==='z'?b.z+side*off:b.z+u);strips.push(g);}}
  for(const [list,map]of [[shadows,blob],[strips,grime]]){if(!list.length)continue;const m=new T.Mesh(T.mergeGeometries(list,false),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));list.forEach(g=>g.dispose());m.renderOrder=1;view.scene.add(m);}
 },
 patch(view,x,z,w,d,kind,color,lift){const T=KartGL,geo=new T.PlaneGeometry(w,d,Math.ceil(w/2),Math.ceil(d/2)),p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const px=p.getX(i)+x,pz=-p.getY(i)+z;p.setZ(i,FPSWorld.height(px,pz)+lift);uv.setXY(i,px/3.5,pz/3.5);}geo.computeVertexNormals();const m=view.mesh(geo,this.material(kind,color),[x,0,z]);m.rotation.x=-Math.PI/2;},
 ridgePalette:[['#5f7a4e','#8d8b78'],['#71887a','#a3a497'],['#93a8b2','#c4d0d4']],
 ridges(view){
  const T=KartGL;for(let layer=0;layer<3;layer++){const n=180,rows=16,pos=[],colors=[],ix=[],rng=srand(881+layer),phase=rng()*6;
   const uv=[];for(let row=0;row<=rows;row++)for(let i=0;i<=n;i++){// crestas (1-|sen|): cumbres afiladas y valles redondos, en vez de dientes de sierra
    const angle=i*TAU/n,t=row/rows,envelope=Math.sin(t*Math.PI),rad=350+layer*190+t*(160+layer*50)+Math.sin(angle*19+t*12)*8*envelope,crest=(f,ph)=>1-Math.abs(Math.sin(angle*f+ph));
    const peak=64+layer*48+(Math.sin(angle*5+phase)+1)*26+crest(3,phase*.7)*40+crest(8,phase)*17,h=-13+Math.pow(envelope,1.2)*peak+(Math.sin(angle*23+t*9)*5+Math.cos(angle*41-t*5)*2.5)*envelope;
    pos.push(Math.sin(angle)*rad,h,Math.cos(angle)*rad);uv.push(i/n*50,t*7);
    // color por altura: bosque abajo, roca arriba y nieve en las cumbres altas de las capas lejanas
    const up=clamp((h+13)/Math.max(1,peak),0,1),R=this.ridgePalette[layer],c=new T.Color(R[0]).lerp(new T.Color(R[1]),clamp((up-.25)/.45,0,1));
    if(layer&&peak>150&&up>.8)c.lerp(new T.Color('#eef3f4'),clamp((up-.8)/.12,0,1));c.multiplyScalar(.9+Math.cos(angle-1)*.08);colors.push(c.r,c.g,c.b);if(row<rows&&i<n){const k=row*(n+1)+i;ix.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}}
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
