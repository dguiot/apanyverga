'use strict';
// Track dressing uses instanced geometry and shared, bundled painted signs.
// All placement is deterministic; the drivable course and online state stay small.
const KartScenery={
 foliage(){
  const key='painted-foliage';if(KartWorld.materials.has(key))return KartWorld.materials.get(key);
  const cv=mkCanvas(256,256),c=cv.getContext('2d'),rng=srand(622);
  for(let i=0;i<260;i++){const a=rng()*TAU,r=Math.sqrt(rng()),x=128+Math.cos(a)*r*111,y=128+Math.sin(a)*r*101;
   c.fillStyle=['#466d46','#587f49','#739451','#92aa61','#b6bf77'][Math.floor(rng()*4.99)];c.beginPath();c.ellipse(x,y,7+rng()*13,4+rng()*8,a,0,TAU);c.fill();}
  const map=new KartGL.CanvasTexture(cv);map.colorSpace=KartGL.SRGBColorSpace;map.anisotropy=8;KartWorld.textures.set(key,map);
  const mat=new KartGL.MeshStandardMaterial({map,alphaTest:.48,alphaToCoverage:true,side:KartGL.DoubleSide,roughness:1});KartWorld.materials.set(key,mat);return mat;
 },
 tree(w,rng){
  const R=Kart3D,h=6.6+rng()*3.5;R.instance('branch','#70583f',[w.x,w.y+h*.37,w.z],[.3,h*.74,.3],[.02,0,.04]);
  const mat=this.foliage(),geo=KartModels.geo('plane'),key=geo.uuid+mat.uuid;
  if(!R.batches.has(key))R.batches.set(key,{geo,mat,matrices:[]});const matrices=R.batches.get(key).matrices;
  for(let i=0;i<6;i++){const a=i*2.399,rad=i<4?1.8:1.1,x=w.x+Math.cos(a)*rad,z=w.z+Math.sin(a)*rad,y=w.y+h*(.65+i%3*.1);
   const start=new KartGL.Vector3(w.x,w.y+h*.45,w.z),end=new KartGL.Vector3(x,y,z),dir=end.clone().sub(start),rot=new KartGL.Euler().setFromQuaternion(new KartGL.Quaternion().setFromUnitVectors(new KartGL.Vector3(0,1,0),dir.clone().normalize()));
   R.instance('branch','#70583f',start.add(end).multiplyScalar(.5).toArray(),[.075,dir.length(),.075],[rot.x,rot.y,rot.z]);
   for(let j=0;j<3;j++)matrices.push(KartModels.matrix([x,y,z],[4.5,3.6,1],[j===2?Math.PI/2:.12,j*Math.PI/3+a,.1]));
  }
 },
 sign(label,bg,fg='#ffeac2'){
  const key='sign:'+label;let mat=KartWorld.materials.get(key);if(mat)return mat;
  const cv=mkCanvas(512,256),c=cv.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,512,256);
  c.strokeStyle=fg;c.lineWidth=5;c.strokeRect(12,12,488,232);c.textAlign='center';c.fillStyle=fg;
  c.font='bold 49px sans-serif';c.fillText(label,256,132,460);c.font='16px sans-serif';c.fillText('MERCADO DEL SOL  ·  DESDE 1986',256,196);
  const tex=new KartGL.CanvasTexture(cv);tex.colorSpace=KartGL.SRGBColorSpace;tex.anisotropy=4;KartWorld.textures.set(key,tex);
  mat=new KartGL.MeshStandardMaterial({map:tex,roughness:.8,metalness:.05,side:KartGL.DoubleSide});KartWorld.materials.set(key,mat);return mat;
 },
 panel(C,s,x,h,w,depth,mat){
  const R=Kart3D,p=C.world(s,x,h),q=C.sample(s),yaw=Math.atan2(q.tx,q.tz)+(x<0?Math.PI/2:-Math.PI/2),g=KartModels.geo('plane'),key=g.uuid+mat.uuid;
  if(!R.batches.has(key))R.batches.set(key,{geo:g,mat,matrices:[]});R.batches.get(key).matrices.push(KartModels.matrix([p.x,p.y,p.z],[w,depth,1],[0,yaw,0]));
 },
 place(C,s,x,h=0){const p=C.world(s,x,h),q=C.sample(s);return {p,q,a:Math.atan2(q.tx,q.tz)};},
 town(C){
  const R=Kart3D,rng=srand(821),cream='#f7dfac',teal='#287d79',terracotta='#c86447',wood='#70513e';
  const shops=[['EL MAMBO',teal],['LA ESQUINA','#b65448'],['FRUTAS DEL SOL','#457f4b'],['CAFÉ LUNA','#384e72']];
  for(let s=48;s<C.length;s+=56){if(C.sample(s).zone==='bridge')continue;
   for(const side of [-1,1]){
    const {p,q,a}=this.place(C,s,side*1.43),y=p.y;
    // Closer street trees, low garden walls and flowering planters frame the road.
    R.instance('box',cream,[p.x,y+.3,p.z],[2.8,.6,2.4],[0,a,0]);
    R.instance('box','#5d5945',[p.x,y+.62,p.z],[2.6,.08,2.2],[0,a,0]);
    const stem={x:p.x,y:y+.65,z:p.z};KartWorld.tree(stem,rng);
    for(let j=0;j<8;j++){const u=C.world(s-2.4+j*.65,side*1.2,.38);R.instance('sphere',['#e97f92','#f4c05f'][j%2],[u.x,u.y,u.z],[.18,.24,.18]);}
    if(Math.floor(s/56)%2){const b=C.world(s+17,side*1.42,.6);R.instance('box',wood,[b.x,b.y,b.z],[3.1,.22,.8],[0,a,0]);
     const back=C.world(s+17,side*1.46,1.1);R.instance('box',wood,[back.x,back.y,back.z],[3.1,.9,.16],[0,a,0]);
     for(const off of [-1,1]){const v=C.world(s+17+off,side*1.42,.28);R.instance('box','#3a5358',[v.x,v.y,v.z],[.12,.55,.8],[0,a,0],.4);}}
   }
  }
  // Shop windows, striped cloth awnings and tiled roof silhouettes replace blank boxes.
  for(let s=30;s<C.length;s+=28){if(C.sample(s).zone==='bridge')continue;
   for(const side of [-1,1]){const {p,q,a}=this.place(C,s,side*1.8),shop=shops[Math.floor(s/28)%shops.length];
    const front=C.world(s,side*1.53,2.5);R.instance('box',cream,[front.x,front.y,front.z],[.22,3.1,6.3],[0,a,0]);
    for(const j of [-1,1]){const w=C.world(s+j*1.65,side*1.515,2.5);R.instance('box','#345b65',[w.x,w.y,w.z],[.12,2.7,2.55],[0,a,0],.3,.25);}
    const door=C.world(s,side*1.51,1.4);R.instance('box',wood,[door.x,door.y,door.z],[.14,2.8,1.2],[0,a,0]);
    this.panel(C,s,side*1.5,4.5,6.2,1.6,this.sign(...shop));
    for(let j=0;j<6;j++){const aw=C.world(s-3+j*1.2,side*1.43,3.6);R.instance('box',j%2?cream:shop[1],[aw.x,aw.y,aw.z],[2.2,.15,1.2],[0,a,side*.16]);
     const hem=C.world(s-3+j*1.2,side*1.35,3.3);R.instance('box',j%2?cream:shop[1],[hem.x,hem.y,hem.z],[.12,.55,1.2],[0,a,0]);}
   }
  }
  // A clock tower and an arcade are readable landmarks at the first long bend.
  const {p,q,a}=this.place(C,320,-3.6),h=28;
  R.instance('box','#edc697',[p.x,p.y+h/2,p.z],[10,h,10],[0,a,0]);
  for(const y of [1,15,23,28])R.instance('box',cream,[p.x,p.y+y,p.z],[11,.65,11],[0,a,0]);
  R.instance('cone',terracotta,[p.x,p.y+32,p.z],[8,8,8],[0,a+Math.PI/4,0]);
  R.instance('sphere','#ddb85c',[p.x,p.y+36.5,p.z],[.6,.8,.6],null,.65,.25);
  const clock=Kart3D.canvasTexture((c,n)=>{c.fillStyle='#f6e7ba';c.fillRect(0,0,n,n);c.strokeStyle='#32484c';c.lineWidth=8;for(let i=0;i<12;i++){const a=i*TAU/12;c.beginPath();c.moveTo(128+Math.sin(a)*94,128-Math.cos(a)*94);c.lineTo(128+Math.sin(a)*107,128-Math.cos(a)*107);c.stroke();}c.lineWidth=9;c.beginPath();c.moveTo(128,61);c.lineTo(128,128);c.lineTo(178,148);c.stroke();});
  const clockGeo=new KartGL.PlaneGeometry(4.2,4.2),clockMat=new KartGL.MeshBasicMaterial({map:clock});
  for(let j=0;j<4;j++){const angle=a+j*Math.PI/2,face=new KartGL.Mesh(clockGeo,clockMat);face.position.set(p.x+Math.sin(angle)*5.12,p.y+23,p.z+Math.cos(angle)*5.12);face.rotation.y=angle;R.scene.add(face);face.name='market-clock';}
  // Gardens behind the neighbourhood keep the middle distance layered.
  for(let s=0;s<C.length;s+=115)for(const side of [-1,1]){if(C.sample(s).zone==='bridge')continue;const w=C.world(s,side*(4.2+rng()*2),-2);for(let j=0;j<3;j++)KartWorld.tree({x:w.x+(rng()-.5)*16,y:w.y,z:w.z+(rng()-.5)*16},rng);}
  const water=new KartGL.MeshStandardMaterial({color:'#308f9b',metalness:.3,roughness:.3,emissive:'#0d3542',emissiveIntensity:.22});
  const canal=R.ribbon(C,-3.8,3.8,-18,water,p=>p.zone!=='bridge');canal.name='market-canal';
  for(let s=0;s<C.length;s+=76)if(C.sample(s).zone==='bridge')for(const side of [-1,1]){const {p,a}=this.place(C,s,side*1.1,-10);R.instance('box','#a49b84',[p.x,p.y,p.z],[1.2,20,1.6],[0,a,0]);}
 },
 canyon(C){
  const R=Kart3D,rng=srand(238);
  for(let s=55;s<C.length;s+=78)for(const side of [-1,1]){
   const {p,a}=this.place(C,s,side*(2.5+rng()*1.5),-4),h=18+rng()*27;
   const variant=Math.floor(s/78)%4,key='sandstone-mesa:'+variant;
   if(!KartModels.geometry.has(key)){
    const T=KartGL,pos=[],uv=[],colors=[],ix=[],n=18,rows=8;
    for(let row=0;row<=rows;row++)for(let j=0;j<=n;j++){
     const angle=j*TAU/n,t=row/rows,rad=(1-t*.52)*(1+Math.sin(angle*3+variant)*.12+Math.sin(angle*7+t*7)*.055),height=t+(row===rows?Math.sin(angle*3+variant)*.025:0);
     pos.push(Math.sin(angle)*rad,height,Math.cos(angle)*rad);uv.push(j/n*3,t*4);
     const col=new T.Color(['#d8ac83','#c59a76','#c28b68','#d0a080'][(40+Math.floor(t*12+Math.sin(angle*3)*.3))%4]);colors.push(col.r,col.g,col.b);
     if(row<rows&&j<n){const k=row*(n+1)+j;ix.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
    }
    const center=pos.length/3;pos.push(0,1,0);uv.push(.5,.5);colors.push(.72,.5,.32);for(let j=0;j<n;j++)ix.push(center,rows*(n+1)+j,rows*(n+1)+j+1);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ix);g.computeVertexNormals();KartModels.geometry.set(key,g);
   }
   const geo=KartModels.geo(key),mat=KartWorld.material('rock','#f2d6ba',true),bin=geo.uuid+mat.uuid;
   if(!R.batches.has(bin))R.batches.set(bin,{geo,mat,matrices:[]});R.batches.get(bin).matrices.push(KartModels.matrix([p.x,p.y,p.z],[8,h,7],[0,a,0]));
   for(let j=0;j<5;j++){const w=C.world(s+j*4,side*(1.28+rng()*.2),.12);R.instance('leaf','#b29355',[w.x,w.y,w.z],[.2,.45,.2],[0,rng()*6,.4]);}
  }
  const lava=new KartGL.MeshStandardMaterial({color:'#d65028',emissive:'#f45113',emissiveIntensity:1.5,roughness:.38,metalness:.12});
  const river=R.ribbon(C,-4.4,-3.6,-26,lava);river.name='lava-river';
  for(const zone of C.info.zones.filter(z=>z.type==='bridge')){const s=C.length*(zone.from+zone.to)/2,{p,a}=this.place(C,s,0,-16);
   for(const side of [-1,1]){const w=C.world(s,side*1.14,-14);R.instance('box','#b18c6b',[w.x,w.y,w.z],[1.8,28,2.5],[0,a,0]);}
   // Curved masonry under the deck, with daylight visible beneath each arch.
   const arch=new KartGL.Mesh(new KartGL.TorusGeometry(12,1.2,6,24,Math.PI),KartWorld.material('rock','#cc9e76'));arch.position.set(p.x,p.y,p.z);arch.rotation.y=a;R.scene.add(arch);
  }
 },
 neon(C){
  const R=Kart3D,cyan='#65dbe6',purple='#c18df3',night='#223e5c';
  for(let s=44;s<C.length;s+=65)for(const side of [-1,1]){
   const {p,a}=this.place(C,s,side*2.15),h=20+(Math.floor(s/65)%5)*9;
   for(let k=0;k<3;k++){const width=12-k*2;R.instance('box',night,[p.x,p.y+k*h/3+h/6,p.z],[width,h/3,width],[0,a,0],.4,.4);
    R.instance('box','#416684',[p.x,p.y+(k+1)*h/3,p.z],[width+.2,.45,width+.2],[0,a,0],.5,.3);}
   for(let j=1;j<6;j++){const w=C.world(s,side*1.68,j*3);R.instance('box',j%2?cyan:purple,[w.x,w.y,w.z],[.14,.11,9],[0,a,0],.25,.4,j%2?'#257f9c':'#603b98');}
   const b=C.world(s+17,side*1.28,1.2);R.instance('box','#213c58',[b.x,b.y,b.z],[1.7,2.4,1.3],[0,a,0],.5,.35);
   R.instance('box',cyan,[b.x,b.y+.45,b.z],[1.75,.08,1.35],[0,a,0],0,.4,'#2c8fba');
  }
  for(let s=150;s<C.length;s+=440){const {p,a}=this.place(C,s,0,12),w=C.sample(s).width;
   for(const side of [-1,1]){const q=C.world(s,side*1.18,5.7);R.instance('box',night,[q.x,q.y,q.z],[.5,11.4,.5],[0,a,0],.5);}
   R.instance('box',night,[p.x,p.y,p.z],[w*2.4,1.1,.55],[0,a,0],.45);
   R.instance('box',cyan,[p.x,p.y-.6,p.z],[w*2.4,.1,.58],[0,a,0],.15,.4,'#318ca0');
  }
 },
 build(C){const method=C.info.theme==='town'?'town':C.info.theme==='canyon'?'canyon':'neon';this[method](C);},
};
KartWorld.tree=(w,rng)=>KartScenery.tree(w,rng);
const kartSceneryInstance=Kart3D.instance;
Kart3D.instance=function(type,color,pos,scale,rot,metal=0,rough=.8,emit=null){
 // Small fruit and flowers do not need the character's high-resolution spheres.
 if(type==='sphere'&&Math.max(...scale)<.7)type='bud';
 return kartSceneryInstance.call(this,type,color,pos,scale,rot,metal,rough,emit);
};
const kartSceneryBase=Kart3D.scenery;
Kart3D.scenery=function(C){kartSceneryBase.call(this,C);KartScenery.build(C);};
