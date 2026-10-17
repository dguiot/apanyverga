'use strict';
// The existing Esmash renderer is the artist. Kart/FPS bake that exact drawing
// into curved, front-facing surfaces; they do not invent a second face or outfit.
const CharacterArt={
 cache:new Map(),
 drawing(id,part='head',face='normal'){
  const key=id+':'+part+':'+face;if(this.cache.has(key))return this.cache.get(key);
  const design=CharacterDesign.get(id),K=skOf(id),B=design.build;
  const box=part==='head'?{x:-K.headRX*3,y:-K.headRY*2.1,w:K.headRX*6,h:K.headRY*4.2}:{x:-B.chest-4,y:-K.torso-5,w:B.chest*2+8,h:K.torso+15};
  const canvas=document.createElement('canvas'),scale=6;canvas.width=Math.ceil(box.w*scale);canvas.height=Math.ceil(box.h*scale);
  const c=canvas.getContext('2d');c.scale(scale,scale);c.translate(-box.x,-box.y);
  const oldSK=SK,oldPose=DRAW_POSE,oldOpt=DRAW_OPT,oldOutline=OUTW;
  try{useSK(id);OUTW=1.05;DRAW_POSE=mkPose({face});DRAW_OPT={};if(part==='head')drawHead(c,id,face);else drawTorso(c,id,design,B,'#10131a');}
  finally{SK=oldSK;DRAW_POSE=oldPose;DRAW_OPT=oldOpt;OUTW=oldOutline;}
  const texture=new KartGL.CanvasTexture(canvas);texture.colorSpace=KartGL.SRGBColorSpace;
  const material=new KartGL.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.03,roughness:.88,metalness:design.art.metalness*.25});
  // Shared materials survive switching worlds; per-character instances own only geometry.
  KartModels.materials.set('esmash-art:'+key,material);
  const value={canvas,texture,material,box,design,source:part==='head'?drawHead:drawTorso};this.cache.set(key,value);return value;
 },
 patch(id,part='head',face='normal'){
  const art=this.drawing(id,part,face),K=skOf(id),B=art.design.build,T=KartGL,positions=[],uv=[],indices=[],n=28;
  for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
   const x=(art.box.x+art.box.w*i/n)/60,y=-(art.box.y+art.box.h*j/n+(part==='torso'?K.torso:0))/60;
   const rx=part==='head'?K.headRX/60:B.chest/60,ry=K.headRY/60;
   // A shallow front surface keeps the authored eyes/mouth legible rather
   // than stretching a 3/4 illustration around a spherical head.
   let z;if(part==='head')z=rx*.86+.018*Math.sqrt(Math.max(0,1-(x/rx)**2-(y/ry)**2));
   else z=rx*.67*Math.sqrt(Math.max(0,1-(x/rx)**2))+.008;
   positions.push(x,y,z);uv.push(i/n,1-j/n);
  }
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,art.material);mesh.name=id+':esmash-'+part;mesh.userData={design:art.design,source:art.source,part,face};mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
 },
};
