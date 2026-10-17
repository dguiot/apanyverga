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
 hand(id,left=false){return FPSHandArt.hand(id,left);},
 weapon(id,character,thirdPerson=false){return FPSWeaponArt.build(id,character,thirdPerson);},
 animate(gun,p){return FPSWeaponArt.animate(gun,p);},
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
