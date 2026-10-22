'use strict';
// Authored hard-surface profiles in metres, not a scaled cube per weapon.
// Hands remain tied to the canonical character palette and species.
const FPSHandArt={
 // guantes tácticos para todos (con el color propio si el diseño ya trae guante); las garras salen igual
 GLOVE:'#3b3d37',
 loft(rings,segments=16,colors=null){
  const T=KartGL,pos=[],uv=[],ix=[],cols=[];for(let j=0;j<rings.length;j++){const [y,rx,rz,cx=0,cz=0]=rings[j];for(let i=0;i<=segments;i++){const a=i*TAU/segments;pos.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);uv.push(i/segments,j/(rings.length-1));if(colors){const c=new T.Color(colors[j%colors.length]);c.multiplyScalar(.96+Math.cos(a)*.04);cols.push(c.r,c.g,c.b);}if(j<rings.length-1&&i<segments){const k=j*(segments+1)+i;ix.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}}}
  for(const j of [0,rings.length-1]){const center=pos.length/3;pos.push(rings[j][3]||0,rings[j][0],rings[j][4]||0);uv.push(.5,j?1:0);if(colors){const c=new T.Color(colors[j%colors.length]);cols.push(c.r,c.g,c.b);}for(let i=0;i<segments;i++){const a=j*(segments+1)+i;ix.push(...(j?[center,a+1,a]:[center,a,a+1]));}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colors)g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(ix);g.computeVertexNormals();return g;
 },
 hand(id,left=false,support=false){
  const T=KartGL,L=CharacterDesign.get(id),g=new T.Group(),b=FPSScenery.batch(),glove=true,col=L.glove||FPSHandArt.GLOVE,skin=FPSGear.material(col,glove?'fabric':'skin'),crease=FPSGear.material(shade(col,-.12),glove?'fabric':'skin'),nail=FPSGear.material(shade(col,.1),'skin');g.userData={design:L,fingers:[]};
  // Palm: 10 cm long, 6 cm across, 2.5 cm thick. No overlapping thenar sphere.
  const palm=this.loft(support?[[-.09,.016,.021,-.063,.012],[-.068,.021,.029,-.047,.008],[-.046,.029,.042,-.025,.002],[-.031,.032,.044,-.009,-.002],[-.023,.027,.035,0,-.003]]:[[-.065,.016,.019,.006,.009],[-.048,.017,.023,.009,.01],[-.025,.015,.029,.012,.008],[.005,.014,.031,.012,.003],[.031,.012,.027,.01,-.003],[.045,.009,.02,.007,-.007]],20);b.geometry(palm,skin,[0,0,0]);
  const arc=(points,r,material=skin)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));b.geometry(new T.TubeGeometry(curve,18,r,10,false),material,[0,0,0]);};
  // Taper the distal phalanx and close the fingertip; joints share a surface.
  const finger=(points,r)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),geo=new T.TubeGeometry(curve,22,r,12,false),pos=geo.attributes.position;for(let j=0;j<=22;j++){const t=j/22,c=curve.getPointAt(t),scale=lerp(1,.72,t*t);for(let k=0;k<=12;k++){const i=j*13+k;pos.setXYZ(i,c.x+(pos.getX(i)-c.x)*scale,c.y+(pos.getY(i)-c.y)*scale,c.z+(pos.getZ(i)-c.z)*scale);}}geo.computeVertexNormals();b.geometry(geo,skin,[0,0,0]);const end=points.at(-1);b.add('sphere',skin,end,[r*.73,r*.73,r*.73]);};
  if(support){
   // A rifle fore-end is horizontal: the fingers line up along the barrel,
   // curl up its far side and meet the thumb on the near side.
   for(let i=0;i<4;i++){const z=-.035+i*.023,r=i===3?.0078:.009,tip=[.016,.019-i*.001,z];finger([[-.012,-.028,z],[.021,-.037,z],[.041,-.018,z],[.038,.007,z],tip],r);g.userData.fingers.push({tip,length:.077});if(!glove)arc([[.031,-.026,z-r*.5],[.035,-.025,z],[.034,-.023,z+r*.5]],.0004,crease);if(L.hand==='claw')b.add('cone',nail,[.012,.026,z],[.004,.014,.004]);}
   finger([[-.041,-.052,.014],[-.045,-.027,-.008],[-.038,-.005,-.034],[-.026,.007,-.061]],.0105);g.userData.wrist=[-.063,-.088,.012];b.finish(g,false);return g;
  }
  for(let i=0;i<4;i++){
   const y=.035-i*.023,shorten=[0,0,.003,.008][i],a=[.007,y,-.021],knuckle=[-.014,y,-.039+shorten],joint=[-.039,y-.002,-.029+shorten],tip=[-.039,y-.004,.007+shorten],r=[.009,.0095,.009,.0078][i];
   finger([a,knuckle,joint,tip],r);
   // Fine creases follow the bent joints instead of a black ring around a tube.
   arc([[-.011,y-r*.55,-.047+shorten],[-.014,y,-.048+shorten],[-.017,y+r*.55,-.045+shorten]],.00045,crease);
   if(!glove&&(!L.species||L.species==='mariachi'))b.add('sphere',nail,[-.041,y-.004,.011+shorten],[.0035,.0058,.001]);
   if(L.hand==='claw')b.add('cone',nail,[-.039,y,.02+shorten],[.004,.016,.004],[Math.PI/2,0,.1]);g.userData.fingers.push({tip,length:[.075,.083,.078,.063][i]});
  }
  finger([[.018,.008,.015],[.018,.031,.004],[.008,.039,-.023],[-.008,.036,-.052],[-.018,.03,-.066]].map(([x,y,z])=>[x,y,support?-z:z]),.01);
  if(!glove){for(let i=0;i<2;i++)arc([[.023,-.047,.004+i*.01],[.027,-.02,-.003+i*.009],[.023,.013,-.013+i*.009]],.00035,crease);arc([[.015,-.055,-.006],[.022,-.055,.01],[.014,-.055,.026]],.0004,crease);}
  else{const pad=FPSGear.material(shade(col,-.18));for(let i=0;i<4;i++)b.add('sphere',pad,[.022,.031-i*.023,-.009],[.002,.008,.01]);}
  b.finish(g,false);if(left)g.scale.x=-1;g.userData.wrist=[left?-.006:.006,-.063,.009];return g;
 },
 arm(id){const L=CharacterDesign.get(id),sleeved=L.sleeve==='long';return this.loft([[-.5,.052,.046],[-.36,.055,.048],[-.1,.049,.041],[.18,.039,.034],[.34,.032,.029],[.44,.023,.021],[.5,.017,.019]],20);},
};
const FPSWeaponArt={
 profile(points,width,bevel=.0015){
  points=points.slice();if(points.reduce((s,p,i)=>s+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0)>0)points.reverse();
  const T=KartGL,pos=[],uv=[],ix=[],centroid=points.reduce((p,v)=>[p[0]+v[0]/points.length,p[1]+v[1]/points.length],[0,0]),n=points.length;
  // Ring bevels keep the long silhouette and produce a light-catching edge.
  for(const [x,inset]of [[-width/2,true],[-width/2+bevel,false],[width/2-bevel,false],[width/2,true]])for(const [z,y]of points){const dz=z-centroid[0],dy=y-centroid[1],l=Math.hypot(dz,dy),k=inset?Math.max(0,1-bevel/l):1;pos.push(x,centroid[1]+dy*k,centroid[0]+dz*k);uv.push(z*5,y*10);}
  for(let ring=0;ring<3;ring++)for(let i=0;i<n;i++){const j=(i+1)%n,a=ring*n+i,b=ring*n+j;ix.push(a,b,a+n,b,b+n,a+n);}
  // Ear clipping handles the concave stock and magazine-well outlines.
  const area=points.reduce((s,p,i)=>s+p[0]*points[(i+1)%n][1]-points[(i+1)%n][0]*p[1],0),order=Array.from({length:n},(_,i)=>i);if(area<0)order.reverse();const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let guard=n*n;
  while(order.length>2&&guard--){let found=false;for(let i=0;i<order.length;i++){const a=order[(i+order.length-1)%order.length],b=order[i],c=order[(i+1)%order.length];if(cross(points[a],points[b],points[c])<=1e-10)continue;const inside=order.some(j=>j!==a&&j!==b&&j!==c&&cross(points[a],points[b],points[j])>=0&&cross(points[b],points[c],points[j])>=0&&cross(points[c],points[a],points[j])>=0);if(inside)continue;ix.push(a,b,c,a+n*3,c+n*3,b+n*3);order.splice(i,1);found=true;break;}if(!found)break;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
 },
 // Medidas reales en metros, ánima en y=0 y el frente hacia -z. Empuñadura siempre en el mismo lugar
 // (z .01-.09) para que la mano derecha no cambie de sitio entre armas.
 LONG:[.2,.6,.9,.98,1.19],
 MUZZLE:[[0,.02,-.108],[0,0,-.312],[0,0,-.59],[0,.012,-.622],[0,0,-.835]],
 // altura del ojo al apuntar, sobre el ánima: centro del punto rojo, del holográfico y del anteojo; en pistola y
 // escopeta el ojo va unos cm sobre las miras (se ven abajo del centro y no tapan lo que apuntas)
 SIGHT:[.067,.062,.075,.056,.075],
 label(text,color='#9aa19b'){
  const T=KartGL,cv=mkCanvas(512,128),c=cv.getContext('2d');c.fillStyle=color;c.font='600 40px monospace';c.textAlign='center';c.fillText(text,256,62);c.font='18px monospace';c.fillText('ESMASH   •   SIERRA WORKS',256,100);const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.74,polygonOffset:true,polygonOffsetFactor:-2});
 },
 // ---- acabados: aluminio anodizado con desgaste, acero, polímero punteado, Cerakote verde, nogal y hule
 tex(kind){
  const cache=this.texCache||(this.texCache=new Map());if(cache.has(kind))return cache.get(kind);
  const T=KartGL,n=256,cv=mkCanvas(n,n),c=cv.getContext('2d'),rng=srand(7700+kind.length*31),im=c.createImageData(n,n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4;let v;
   if(kind==='wear')v=148+(rng()-.5)*34+Math.sin(y*.9+x*.04)*5;
   else if(kind==='stipple')v=150+(rng()<.4?-46:10)+(rng()-.5)*14;
   else if(kind==='wood'){const ring=Math.sin((y*.05+Math.sin(x*.027)*2.4+Math.sin(x*.13+y*.01)*.5)*5.5); // vetas a lo largo (u = largo de la pieza)
   v=150+ring*42+(rng()-.5)*14;}
   else v=140+(rng()-.5)*22;
   im.data[i]=im.data[i+1]=im.data[i+2]=clamp(v,0,255);im.data[i+3]=255;}
  c.putImageData(im,0,0);
  // rayones claros: donde el arma roza la funda, el cargador y las manos
  if(kind==='wear')for(let i=0;i<150;i++){c.strokeStyle=`rgba(255,255,255,${.05+rng()*.16})`;c.lineWidth=.4+rng()*.9;c.beginPath();const x=rng()*n,y=rng()*n,a=rng()*TAU,l=3+rng()*24;c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke();}
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;cache.set(kind,t);return t;
 },
 reticle(kind){
  const cache=this.texCache||(this.texCache=new Map()),key='reticle-'+kind;if(cache.has(key))return cache.get(key);
  const T=KartGL,cv=mkCanvas(128,128),c=cv.getContext('2d');c.strokeStyle=c.fillStyle='#ff3b2f';c.shadowColor='#ff2a1a';c.shadowBlur=6;
  if(kind==='holo'){c.lineWidth=8;c.beginPath();c.arc(64,64,52,0,TAU);c.stroke();for(const [x,y]of [[64,6],[64,122],[6,64],[122,64]]){c.beginPath();c.arc(x,y,4,0,TAU);c.fill();}}
  c.beginPath();c.arc(64,64,kind==='holo'?6:11,0,TAU);c.fill();
  const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;cache.set(key,t);return t;
 },
 // materiales compartidos (registrados como comunes para que liberar un arma no los destruya)
 mats(){
  if(this.matCache)return this.matCache;const T=KartGL,wear=this.tex('wear'),stip=this.tex('stipple'),wood=this.tex('wood'),std=o=>new T.MeshStandardMaterial(o);
  const M=this.matCache={
   black:std({color:'#2b2e31',metalness:.62,roughness:.48,roughnessMap:wear,bumpMap:wear,bumpScale:.0004}),
   blackIn:std({color:'#1c1e20',metalness:.5,roughness:.55,side:T.DoubleSide}),
   dark:std({color:'#121315',metalness:.35,roughness:.62}),
   steel:std({color:'#45494c',metalness:.9,roughness:.3,roughnessMap:wear}),
   poly:std({color:'#25272a',metalness:.04,roughness:.8,bumpMap:stip,bumpScale:.0006}),
   fde:std({color:'#93825f',metalness:.04,roughness:.76,bumpMap:stip,bumpScale:.0005}),
   od:std({color:'#525a45',metalness:.3,roughness:.56,roughnessMap:wear,bumpMap:wear,bumpScale:.0003}),
   wood:std({color:'#8a5531',map:wood,metalness:0,roughness:.46,bumpMap:wood,bumpScale:.0003}),
   rubber:std({color:'#161718',metalness:0,roughness:.95,bumpMap:stip,bumpScale:.0008}),
   brass:std({color:'#c39a5c',metalness:.92,roughness:.26}),
   hull:std({color:'#9b2a22',metalness:.05,roughness:.5}),
   glass:new T.MeshBasicMaterial({color:'#a9e4ea',transparent:true,opacity:.06,depthWrite:false,side:T.DoubleSide}),
   tritium:new T.MeshBasicMaterial({color:'#86ff74',toneMapped:false}),
   fiber:new T.MeshBasicMaterial({color:'#ff5030',toneMapped:false}),
   holo:new T.MeshBasicMaterial({map:this.reticle('holo'),transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),
   dot:new T.MeshBasicMaterial({map:this.reticle('dot'),transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),
  };
  // la retícula emite más de 1 (lineal): se ve contra cielo claro y el bloom la hace brillar
  M.holo.color.setRGB(3.2,.9,.7);M.dot.color.setRGB(3.6,.9,.7);
  for(const [k,m]of Object.entries(M))KartModels.materials.set('fps-gun:'+k,m);
  return M;
 },
 shapes(){
  if(KartModels.geometry.has('gun-cylz'))return;const T=KartGL,z=new T.CylinderGeometry(1,1,1,22);z.rotateX(Math.PI/2);KartModels.geometry.set('gun-cylz',z);
  const x=new T.CylinderGeometry(1,1,1,18);x.rotateZ(Math.PI/2);KartModels.geometry.set('gun-cylx',x);KartModels.geometry.set('gun-cyly',new T.CylinderGeometry(1,1,1,18));FPSGear.rounded();
 },
 build(id,character,thirdPerson=false){
  this.shapes();const T=KartGL,L=CharacterDesign.get(character),M=this.mats(),root=new T.Group(),body=new T.Group(),magazine=new T.Group(),moving=new T.Group(),long=this.LONG[id];
  root.add(body,magazine,moving);root.userData={design:L,body,magazine,moving,long,arms:[],weaponId:id};
  const B={body:FPSScenery.batch(),mag:FPSScenery.batch(),moving:FPSScenery.batch()};
  const P=(pts,w,m,part='body',bevel=.0012)=>B[part].geometry(this.profile(pts,w,bevel),m,[0,0,0]);
  const box=(m,p,s,r,part='body')=>B[part].add('fps-rounded',m,p,s,r);
  const cz=(m,p,r,len,part='body')=>B[part].add('gun-cylz',m,p,[r,r,len]);
  const cx=(m,p,r,len,part='body')=>B[part].add('gun-cylx',m,p,[len,r,r]);
  const cy=(m,p,r,len,part='body')=>B[part].add('gun-cyly',m,p,[r,len,r]);
  const taper=(m,p,rFront,rRear,len,part='body',open=false)=>{const g=new T.CylinderGeometry(rRear,rFront,len,28,1,open);g.rotateX(Math.PI/2);B[part].geometry(g,m,p);};
  const link=(m,a,b,r,part='body')=>{const A=new T.Vector3(...a),D=new T.Vector3(...b).sub(A),g=new T.CylinderGeometry(r,r,D.length(),10);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),D.clone().normalize()));B[part].geometry(g,m,A.addScaledVector(D,.5).toArray());};
  const curve=(m,pts,r,part='body')=>B[part].geometry(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),18,r,8,false),m,[0,0,0]);
  const rail=(m,y,z0,z1,part='body')=>{box(m,[0,y,(z0+z1)/2],[.021,.007,z1-z0],null,part);for(let z=z0+.006;z<z1-.004;z+=.01)box(m,[0,y+.0055,z],[.021,.004,.0052],null,part);};
  const grip=(m,w=.029)=>{P([[.012,-.02],[.05,-.02],[.088,-.128],[.078,-.138],[.046,-.134],[.03,-.09],[.016,-.045]],w,m);for(let i=0;i<4;i++)box(M.dark,[0,-.06-i*.018,.022+i*.004],[w*1.02,.003,.006],[.3,0,0]);};
  const guard=(m,front=-.035)=>{curve(m,[[0,-.022,front],[0,-.045,front+.003],[0,-.053,front+.022],[0,-.05,.004],[0,-.038,.016]],.0032);box(M.dark,[0,-.034,-.012],[.005,.02,.005],[.25,0,0]);};
  if(id===0){
   // Cobalto 9: pistola de polímero con corredera de acero, miras con tritio y estrías de amartillado
   P([[-.105,.006],[-.105,.031],[-.099,.04],[.082,.04],[.088,.034],[.088,.006]],.026,M.black,'moving');
   for(const s of [-1,1])for(let i=0;i<6;i++)box(M.dark,[s*.0131,.023,.056+i*.0048],[.0008,.026,.0022],null,'moving');
   box(M.dark,[.0128,.031,-.002],[.0015,.011,.03],null,'moving');box(M.steel,[.006,.0345,-.002],[.012,.008,.028],null,'moving');
   box(M.black,[0,.0445,-.094],[.004,.009,.006],null,'moving');B.moving.add('sphere',M.tritium,[0,.0465,-.0905],[.0013,.0013,.0005]);
   for(const s of [-1,1]){box(M.black,[s*.0058,.0445,.08],[.0045,.01,.008],null,'moving');B.moving.add('sphere',M.tritium,[s*.0058,.0465,.0758],[.0012,.0012,.0005]);}
   cz(M.steel,[0,.02,-.1052],.0068,.003,'moving');cz(M.dark,[0,.02,-.1062],.0047,.002,'moving');
   P([[-.1,.007],[-.1,-.004],[-.092,-.013],[-.03,-.013],[-.022,-.006],[.0,-.006],[.0,.007]],.024,M.poly);
   for(let i=0;i<3;i++)box(M.dark,[0,-.0135,-.08+i*.016],[.02,.001,.003]);
   P([[-.002,.007],[.086,.007],[.09,-.004],[.074,-.012],[0,-.012]],.024,M.poly);
   P([[.012,-.01],[.05,-.01],[.086,-.112],[.079,-.121],[.046,-.118],[.03,-.075],[.016,-.035]],.029,M.poly);
   P([[.07,.0],[.094,-.0],[.096,-.01],[.08,-.016]],.022,M.poly);
   curve(M.poly,[[0,-.012,-.028],[0,-.034,-.03],[0,-.043,-.014],[0,-.042,.008],[0,-.028,.016]],.0032);box(M.dark,[0,-.026,-.008],[.005,.018,.005],[.25,0,0]);
   box(M.dark,[.0125,.002,.012],[.002,.004,.022]);box(M.dark,[.0125,-.002,-.022],[.002,.004,.006]);box(M.dark,[.0135,-.016,.012],[.003,.006,.008]);
   P([[.02,-.004],[.046,-.004],[.08,-.112],[.052,-.117]],.021,M.black,'mag');P([[.046,-.114],[.082,-.108],[.089,-.119],[.084,-.127],[.048,-.13]],.031,M.poly,'mag');
  }else if(id===1){
   // Avispa: subfusil de cajón con tubo de amartillar, guardamanos delgado, culata retráctil y punto rojo
   P([[-.2,.022],[-.19,.028],[.11,.028],[.125,.022],[.125,-.022],[-.2,-.022]],.04,M.black);
   for(const s of [-1,1])box(M.dark,[s*.0203,.006,-.04],[.001,.006,.26]);box(M.dark,[.0205,.01,.02],[.0012,.012,.035]);
   rail(M.black,.032,-.13,.11);
   cz(M.black,[0,.018,-.245],.011,.1);cz(M.black,[0,.018,-.296],.0125,.008);box(M.poly,[-.024,.018,-.235],[.016,.007,.009],null,'moving');
   cz(M.steel,[0,0,-.255],.009,.11);cz(M.black,[0,0,-.303],.0115,.016);for(let i=0;i<3;i++){const a=i*TAU/3;box(M.black,[Math.sin(a)*.012,Math.cos(a)*.012,-.298],[.004,.004,.008],[0,0,-a]);}
   P([[-.19,-.004],[-.19,-.033],[-.18,-.046],[-.07,-.046],[-.06,-.034],[-.06,-.004]],.05,M.poly);for(const s of [-1,1])for(let i=0;i<5;i++)box(M.dark,[s*.0252,-.026,-.17+i*.022],[.001,.014,.008]);
   P([[-.06,-.022],[.115,-.022],[.115,-.036],[.08,-.042],[-.06,-.04]],.038,M.poly);P([[-.062,-.022],[-.012,-.022],[-.014,-.05],[-.06,-.05]],.034,M.black);
   grip(M.poly);guard(M.poly);box(M.dark,[.02,-.03,.07],[.002,.006,.016]);
   P([[-.058,-.04],[-.018,-.04],[-.008,-.1],[.004,-.168],[-.03,-.174],[-.046,-.105]],.023,M.black,'mag');P([[.006,-.164],[-.032,-.17],[-.034,-.18],[.008,-.174]],.027,M.poly,'mag');
   for(const s of [-1,1])cz(M.steel,[s*.017,.006,.2],.0042,.16);P([[.27,.032],[.29,.032],[.29,-.075],[.27,-.07]],.052,M.poly);P([[.288,.034],[.298,.034],[.298,-.077],[.288,-.077]],.05,M.rubber);
   // punto rojo tipo micro: tubo abierto (se ve el anillo, no un disco negro), vidrio tratado y retícula
   box(M.black,[0,.043,.05],[.022,.012,.03]);taper(M.blackIn,[0,.062,.05],.0185,.0185,.032,'body',true);for(const z of [.034,.066])B.body.add('torus',M.black,[0,.062,z],[.0186,.0186,.0186]);
   box(M.black,[0,.083,.05],[.012,.006,.012]);box(M.black,[.022,.062,.05],[.006,.012,.012]);
  }else if(id===2){
   // Sierra M4: receptor superior e inferior, guardamanos M-LOK color arena, apagallamas, culata retráctil y holográfico
   P([[-.1,.006],[-.1,.03],[-.094,.034],[.166,.034],[.17,.03],[.17,.006]],.03,M.black);rail(M.black,.038,-.1,.17);
   P([[-.085,.006],[.168,.006],[.168,-.012],[.12,-.02],[.04,-.022],[.026,-.036],[-.034,-.04],[-.074,-.026],[-.085,-.012]],.028,M.black);
   P([[-.074,-.026],[-.024,-.026],[-.022,-.052],[-.072,-.052]],.032,M.black);
   box(M.dark,[.0152,.019,.06],[.0012,.014,.05]);box(M.black,[.0162,.008,.06],[.002,.004,.052]);cz(M.black,[.018,.024,.13],.006,.025);
   box(M.black,[.0145,-.012,-.02],[.002,.008,.008]);box(M.black,[-.0145,-.01,-.035],[.002,.012,.006]);box(M.dark,[.0148,-.006,.04],[.002,.006,.014]);
   box(M.black,[0,.031,.178],[.028,.006,.03],null,'moving');box(M.black,[-.016,.031,.188],[.008,.006,.012],null,'moving');
   {const g=new T.CylinderGeometry(.022,.022,.32,8);g.rotateX(Math.PI/2);g.rotateZ(Math.PI/8);B.body.geometry(g,M.fde,[0,.012,-.26]);}
   for(const s of [-1,1])for(let i=0;i<5;i++)box(M.dark,[s*.0205,.012,-.14-i*.05],[.001,.007,.024]);for(let i=0;i<5;i++)box(M.dark,[0,-.0095,-.14-i*.05],[.007,.001,.024]);
   rail(M.black,.038,-.42,-.1);
   cz(M.steel,[0,0,-.485],.0072,.13);cz(M.black,[0,0,-.567],.0105,.046);for(let i=0;i<4;i++){const a=i*TAU/4+.4;box(M.dark,[Math.sin(a)*.0101,Math.cos(a)*.0101,-.574],[.002,.002,.028],[0,0,-a]);}
   grip(M.fde);guard(M.black);
   P([[-.072,-.045],[-.026,-.045],[-.018,-.1],[-.004,-.2],[-.05,-.206],[-.063,-.108]],.022,M.poly,'mag');for(const s of [-1,1])for(let i=0;i<3;i++)box(M.dark,[s*.0112,-.12-i*.022,-.036+i*.006],[.001,.006,.034],null,'mag');
   P([[-.002,-.198],[-.052,-.204],[-.054,-.214],[0,-.208]],.026,M.poly,'mag');
   cz(M.black,[0,.012,.24],.0142,.15);P([[.18,.034],[.3,.034],[.305,.026],[.305,-.062],[.29,-.072],[.245,-.046],[.205,-.022],[.18,-.008]],.042,M.fde);P([[.302,.036],[.314,.036],[.314,-.074],[.302,-.074]],.044,M.rubber);box(M.black,[0,-.012,.23],[.012,.01,.03]);
   box(M.black,[0,.0465,.15],[.018,.008,.022]);box(M.black,[0,.0465,-.4],[.018,.008,.02]);
   // holográfico: base, paredes, capucha y dos vidrios; la retícula (anillo y punto) flota en el vidrio
   box(M.black,[0,.0485,.05],[.034,.013,.08]);for(const s of [-1,1])box(M.black,[s*.0195,.075,.04],[.005,.042,.052]);box(M.black,[0,.0975,.04],[.044,.006,.052]);
   box(M.black,[.026,.056,.065],[.012,.018,.04]);box(M.dark,[0,.056,.083],[.02,.012,.006]);
  }else if(id===3){
   // Trueno 12: escopeta de bomba con receptor de acero, cañón con banda ventilada, tubo cargador y madera de nogal
   P([[-.08,.03],[-.08,-.03],[.1,-.03],[.118,-.014],[.118,.03],[.108,.034],[-.07,.034]],.036,M.black);
   box(M.dark,[.0182,.012,-.01],[.0012,.022,.06]);box(M.dark,[0,-.0305,0],[.024,.0012,.07]);
   cz(M.steel,[0,.012,-.35],.0105,.54);cz(M.dark,[0,.012,-.6205],.0078,.002);box(M.black,[0,.0255,-.34],[.008,.003,.52]);for(let i=0;i<9;i++)box(M.black,[0,.0225,-.12-i*.055],[.004,.004,.004]);
   B.body.add('sphere',M.fiber,[0,.0295,-.598],[.0028,.0028,.006]);box(M.black,[0,.025,-.598],[.005,.006,.012]);
   cz(M.black,[0,-.016,-.27],.011,.38);cz(M.black,[0,-.016,-.465],.013,.02);box(M.black,[0,-.002,-.44],[.02,.04,.015]);
   P([[-.12,-.002],[-.3,-.002],[-.31,-.012],[-.31,-.04],[-.3,-.046],[-.12,-.046],[-.11,-.04],[-.11,-.012]],.05,M.wood,'moving');
   for(const s of [-1,1])for(let i=0;i<7;i++)box(M.dark,[s*.0252,-.024,-.14-i*.022],[.001,.03,.006],null,'moving');for(const s of [-1,1])box(M.steel,[s*.012,-.006,-.06],[.003,.006,.12],null,'moving');
   P([[-.002,-.03],[.075,-.03],[.075,-.036],[.06,-.054],[0,-.054],[-.002,-.046]],.016,M.black);box(M.dark,[0,-.04,.03],[.005,.018,.005],[.25,0,0]);
   P([[.115,.034],[.16,.024],[.33,.034],[.345,.028],[.345,-.112],[.325,-.118],[.2,-.07],[.15,-.06],[.115,-.04]],.042,M.wood);P([[.343,.03],[.36,.03],[.36,-.116],[.343,-.114]],.044,M.rubber);
   cz(M.hull,[0,0,0],.0105,.05,'mag');cz(M.brass,[0,0,.029],.0109,.012,'mag');
  }else{
   // Horizonte: cerrojo, cañón pesado acanalado, freno de boca, chasis Cerakote verde y anteojo de 30 mm
   cz(M.black,[0,0,.04],.017,.2);cz(M.black,[0,0,.155],.013,.03);box(M.dark,[.0168,.004,.04],[.0012,.012,.06]);
   link(M.steel,[.013,0,.125],[.048,-.022,.131],.0035,'moving');B.moving.add('sphere',M.black,[.053,-.026,.132],[.0105,.0105,.0105]);cz(M.black,[0,0,.18],.0125,.022,'moving');
   P([[-.36,.004],[-.36,-.028],[-.345,-.042],[-.03,-.042],[-.03,.004]],.05,M.od);for(const s of [-1,1])for(let i=0;i<6;i++)box(M.dark,[s*.0252,-.018,-.31+i*.045],[.001,.016,.026]);
   P([[-.03,.002],[.13,.002],[.13,-.03],[-.03,-.03]],.046,M.od);grip(M.od,.03);guard(M.od,-.03);
   P([[.13,.002],[.19,.016],[.34,.026],[.355,.022],[.355,-.122],[.335,-.128],[.28,-.084],[.215,-.062],[.165,-.044],[.13,-.03]],.044,M.od);box(M.od,[0,.036,.27],[.03,.018,.13]);P([[.352,.024],[.366,.024],[.366,-.126],[.352,-.126]],.046,M.rubber);box(M.black,[0,-.1,.31],[.012,.04,.012]);
   cz(M.steel,[0,0,-.47],.0125,.62);for(let i=0;i<6;i++){const a=i*TAU/6;box(M.dark,[Math.sin(a)*.0121,Math.cos(a)*.0121,-.5],[.0024,.0024,.46],[0,0,-a]);}
   box(M.black,[0,0,-.805],[.03,.024,.055]);for(const s of [-1,1])for(let i=0;i<3;i++)box(M.dark,[s*.0152,0,-.79-i*.014],[.001,.016,.008]);
   box(M.black,[0,-.058,-.005],[.03,.064,.074],null,'mag');box(M.dark,[0,-.092,-.005],[.034,.006,.08],null,'mag');
   for(const s of [-1,1])cz(M.black,[s*.018,-.05,-.27],.005,.17);box(M.black,[0,-.046,-.355],[.05,.012,.02]);
   rail(M.black,.022,-.1,.13);for(const z of [-.07,.1]){box(M.black,[0,.04,z],[.022,.03,.02]);cz(M.black,[0,.075,z],.0195,.018);}
   taper(M.black,[0,.075,-.125],.029,.016,.07);cz(M.black,[0,.075,-.17],.029,.02);taper(M.black,[0,.075,.175],.016,.022,.06);cz(M.black,[0,.075,.212],.022,.016);
   cy(M.black,[0,.1,.02],.012,.022);cy(M.dark,[0,.1125,.02],.0125,.004);cx(M.black,[.028,.075,.02],.011,.02);cx(M.black,[-.027,.075,.02],.01,.018);box(M.black,[.02,.075,.2],[.012,.004,.004]);
  }
  B.body.finish(body,false);B.mag.finish(magazine,false);B.moving.finish(moving,false);
  if(id===1){const r=new T.Mesh(new T.PlaneGeometry(.006,.006),M.dot);r.position.set(0,.062,.036);r.name='red-dot-reticle';body.add(r);const glass=new T.Mesh(new T.CircleGeometry(.017,24),M.glass);glass.position.set(0,.062,.035);body.add(glass);}
  if(id===2){const r=new T.Mesh(new T.PlaneGeometry(.011,.011),M.holo);r.position.set(0,.075,.017);r.name='holo-reticle';body.add(r);for(const z of [.016,.064]){const glass=new T.Mesh(new T.PlaneGeometry(.034,.036),M.glass);glass.position.set(0,.075,z);body.add(glass);}}
  if(id===4){
   const mesh=new T.Mesh(new T.CylinderGeometry(.016,.016,.25,32,1,true),M.black);mesh.rotation.x=Math.PI/2;mesh.position.set(0,.075,.02);mesh.name='open-scope-tube';body.add(mesh);
   // Lentes tratados, opacos y con profundidad: a la cadera no se ve el fondo a través del tubo
   const cv=mkCanvas(256,256),c=cv.getContext('2d'),gradient=c.createRadialGradient(90,76,5,128,128,128);gradient.addColorStop(0,'#78b4c0');gradient.addColorStop(.27,'#2a5469');gradient.addColorStop(.7,'#112a3b');gradient.addColorStop(1,'#050e18');c.fillStyle=gradient;c.fillRect(0,0,256,256);c.strokeStyle='rgba(163,222,230,.38)';c.lineWidth=5;c.beginPath();c.arc(128,128,105,3.7,5.3);c.stroke();const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;
   for(const side of [-1,1]){const lens=new T.Mesh(new T.SphereGeometry(1,32,16),new T.MeshStandardMaterial({map,color:'#a8c7db',metalness:.48,roughness:.17}));const r=side<0?.027:.02;lens.scale.set(r,r,.004);lens.position.set(0,.075,side<0?-.181:.221);lens.name='scope-coated-lens-'+side;body.add(lens);}
  }
  const labelAt=[[.0135,-.004,-.06],[.0206,.0,-.06],[.0142,-.004,.11],[.0182,-.006,.06],[.0256,-.016,-.1]][id];
  for(const side of [-1,1]){const logo=new T.Mesh(new T.PlaneGeometry(id===0?.05:.07,.016),this.label(['C9 / 9×19','VSP / 9 mm','SIERRA / 5.56','T12 / 12 GA','HZ / .308'][id]));logo.rotation.y=side*Math.PI/2;logo.position.set(side*labelAt[0]*(side>0?1:1.001),labelAt[1],labelAt[2]);body.add(logo);}
  if(!thirdPerson){
   const sleeve=FPSGear.material(L.sleeve==='long'?L.top:L.skin,L.sleeve==='long'?'fabric':'skin'),cuff=FPSGear.material(L.wrap||shade(L.top,-.2),'fabric');
   for(const left of [false,true]){const arm=new T.Mesh(FPSHandArt.arm(character),sleeve),band=new T.Mesh(new T.CylinderGeometry(.025,.027,1,18),cuff);root.add(arm,band);const hand=FPSHandArt.hand(character,left,left&&id!==0);hand.name=character+':fps-'+(left?'left':'right')+'-hand';root.add(hand);root.userData[left?'leftHand':'rightHand']=hand;root.userData.arms.push({mesh:arm,band,elbow:new T.Vector3(left?-.2:.13,-.26,left?.2:.34),left});}
  }
  const flash=FPSFX.sprite({map:FPSFX.texture(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:'#ffe2a8'});flash.scale.set(.16,.16,1);flash.position.set(...this.MUZZLE[id]);flash.position.z-=.04;flash.visible=false;body.add(flash);root.userData.flash=flash;
  // fogonazo en cruz (visible de lado, no solo de frente): dos planos y un cono aditivos
  const star=new T.Group();for(let i=0;i<2;i++){const m=FPSFX.sprite({map:FPSFX.texture(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:'#ffc77a'});m.userData.billboard=false;m.scale.set(.05,.22,1);m.rotation.set(0,Math.PI/2,i*Math.PI/2);m.position.z=-.09;star.add(m);}
  star.position.set(...this.MUZZLE[id]);star.visible=false;body.add(star);root.userData.flashStar=star;
  this.animate(root,{gun:id,reloading:0,recoil:0,throwTimer:0,shot:0,cool:0});return root;
 },
 RIGHT:[.019,-.068,.058],
 LEFT:[[-.017,-.072,.05],[0,-.024,-.13],[0,.012,-.27],[0,-.024,-.21],[0,-.02,-.24]],
 MAGBASE:[[0,-.13,.068],[0,-.18,-.014],[0,-.21,-.028],[0,-.096,-.005],[0,-.1,-.005]],
 CHARGE:[[0,.05,.07],[-.03,.018,-.235],[0,.04,.185],[0,-.024,-.21],[.053,-.026,.132]],
 foley(kind){
  if(typeof Audio8==='undefined'||!Audio8.ready)return;const A=Audio8;
  if(kind==='out'){A.noise(.03,.05,3200,2);A.noise(.08,.035,900,1.2,.03);}
  else if(kind==='in'){A.noise(.04,.06,1800,2.5);A.tone('square',220,180,.03,.02);}
  else if(kind==='slap'){A.noise(.05,.07,1100,1.5);}
  else if(kind==='charge'){A.noise(.06,.05,2600,3);A.noise(.05,.04,1500,3,.07);}
  else if(kind==='release'){A.noise(.05,.07,2200,2);A.tone('square',300,160,.03,.02);}
  else if(kind==='shell'){A.noise(.035,.05,2400,3);A.noise(.03,.03,1300,2,.03);}
  else if(kind==='pump'){A.noise(.07,.06,1600,2);A.noise(.06,.06,2200,2,.11);}
  else if(kind==='bolt'){A.noise(.04,.05,2800,3);A.noise(.06,.045,1700,2,.09);A.noise(.05,.05,2400,3,.2);}
 },
 grip(id,left,reach=0){return left?this.LEFT[id].slice():this.RIGHT.slice();},
 // Recarga por fases (cargador que cae, mano por uno nuevo, insertar, golpe y amartillar si estaba vacía;
 // escopeta cartucho por cartucho), corredera/bomba/cerrojo después de cada tiro. u.anim lleva la
 // inclinación del arma para FPSHandling. Solo presentación: no toca la simulación.
 animate(gun,p){
  const u=gun.userData,id=u.weaponId,g=FPS_GUNS[id],A=u.anim||(u.anim={}),dt=Math.min(GameFeel.dt||1/60,.05);
  const r=p.reloading?clamp(1-p.reloading/g.reload,0,1):0,ease=x=>x*x*(3-2*x),k=(a,b)=>ease(clamp((r-a)/(b-a),0,1)),mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
  if(p.reloading&&!u.reloadOn){u.reloadOn=true;u.empty=!!p.ammo&&p.ammo[id]===0;}if(!p.reloading)u.reloadOn=false;
  if(u.lastShot===undefined||p.shot<u.lastShot)u.lastShot=p.shot;if(p.shot>u.lastShot){u.lastShot=p.shot;u.since=0;}u.since=(u.since??9)+dt;
  const cycle=clamp(u.since/g.rate,0,1),throwing=clamp((p.throwTimer||0)/.5,0,1);
  let left=this.LEFT[id],right=this.RIGHT,magOff=[0,0,0],magRot=0,magVisible=id!==3,moveZ=0,moveRotZ=0;
  const tilt=p.reloading?k(0,.14)-k(.84,1):0;A.roll=0;A.pitch=0;A.px=0;A.py=0;A.bump=0;
  if(p.reloading&&id!==3){
   // 1) mano al cargador  2) se suelta y cae  3) mano abajo por otro  4) inserta y golpe  5) amartilla si estaba vacía
   const base=this.MAGBASE[id],axis=id===0?[0,-.96,.28]:id===4?[0,-1,0]:[0,-.99,-.12],hold=[base[0],base[1]-.012,base[2]];
   const down=[base[0]-.02,base[1]-.32,base[2]+.04],pre=hold.map((v,i)=>v+axis[i]*.06),along=d=>axis.map(v=>v*d);
   if(r<.12)left=mix(this.LEFT[id],hold,k(0,.12));                                       // mano al cargador
   else if(r<.24){left=hold;magOff=along(.06*k(.14,.24));}                                // botón: el cargador sale
   else if(r<.36){const f=.06+(r-.24)**2*34;magOff=along(f);magRot=(r-.24)*5;left=mix(hold,down,k(.26,.38));} // cae
   else if(r<.4){magVisible=false;left=down;}                                             // la mano va por otro
   else if(r<.66){left=r<.56?mix(down,pre,k(.4,.56)):mix(pre,hold,k(.56,.66));magOff=left.map((v,i)=>v-hold[i]);} // lo trae e inserta
   else{const ch=this.CHARGE[id];
    if(u.empty&&r<.86){const pull=k(.74,.79)-k(.8,.82);left=mix(hold,ch,k(.66,.73));if(id!==4){left[2]+=pull*.04;moveZ=pull*(id===0?.03:.04);}}
    else left=u.empty?mix(ch,this.LEFT[id],k(.86,.98)):mix(hold,this.LEFT[id],k(.7,.86));}
   A.bump=Math.sin(clamp((r-.64)/.06,0,1)*Math.PI);
   if(id===4&&u.empty&&r>.68&&r<.88){const b=clamp((r-.68)/.2,0,1);moveRotZ=-Math.sin(clamp(b/.3,0,1)*Math.PI/2)*(1-clamp((b-.7)/.3,0,1))*1.1;moveZ=Math.sin(clamp((b-.25)/.5,0,1)*Math.PI)*.09;right=mix(this.RIGHT,this.CHARGE[4],Math.sin(b*Math.PI));}
   A.roll=-(id===4?.25:.4)*tilt;A.pitch=.13*tilt;A.px=-.03*tilt;A.py=.025*tilt+.006*A.bump;
  }else if(p.reloading){
   // escopeta: cartucho por cartucho por la ventana de carga, y bomba al final si estaba vacía
   const n=4,c0=.1,len=.18,i=Math.floor((r-c0)/len),c=clamp((r-c0)/len-i,0,1),port=[0,-.05,.03],below=[-.01,-.2,.07],into=[0,-.046,-.02];
   if(r<c0)left=mix(this.LEFT[3],below,ease(r/c0));
   else if(i<n){left=c<.45?mix(below,port,ease(c/.45)):c<.7?mix(port,into,ease((c-.45)/.25)):mix(into,below,ease((c-.7)/.3));magVisible=c<.7;magOff=[left[0],left[1]+.012,left[2]-.012];}
   else{left=mix(below,this.LEFT[3],k(c0+n*len,c0+n*len+.06));if(u.empty){const pump=Math.sin(k(.86,.96)*Math.PI);moveZ=pump*.075;left=[left[0],left[1],left[2]+moveZ];}}
   A.roll=.65*tilt;A.pitch=.08*tilt;A.px=-.02*tilt;A.py=.03*tilt;
  }else if(id===3&&u.since<g.rate){const pump=Math.sin(clamp((cycle-.12)/.36,0,1)*Math.PI);moveZ=pump*.075;left=[left[0],left[1],left[2]+moveZ];A.pitch=pump*.03;}
  else if(id===4&&u.since<g.rate){
   // cerrojo: la mano derecha sube la manija, jala, empuja y la baja
   const b=clamp((cycle-.12)/.62,0,1),up=Math.sin(clamp(b/.25,0,1)*Math.PI/2)*(1-clamp((b-.75)/.25,0,1));moveRotZ=-up*1.1;moveZ=Math.sin(clamp((b-.22)/.5,0,1)*Math.PI)*.09;
   const go=Math.sin(clamp(b*1.15,0,1)*Math.PI);right=mix(this.RIGHT,[this.CHARGE[4][0],this.CHARGE[4][1]+up*.03,this.CHARGE[4][2]+moveZ],go);A.roll=-.08*go;A.pitch=.04*go;
  }else if(id===0)moveZ=u.since<.07?Math.sin(u.since/.07*Math.PI)*.022:0;
  // sonidos de manipulación (solo el arma en primera persona): botón y cargador fuera, cargador dentro y golpe,
  // palanca/corredera, cada cartucho de escopeta, bomba y cerrojo; suenan al cruzar cada fase
  if(u.leftHand){const prev=u.lastR??0,cross=x=>prev<x&&r>=x,cyc=u.lastCycle??1;
   if(p.reloading&&id!==3){if(cross(.15))this.foley('out');if(cross(.62))this.foley('in');if(cross(.66))this.foley('slap');if(u.empty&&cross(.76))this.foley('charge');if(u.empty&&cross(.81))this.foley('release');}
   if(p.reloading&&id===3){for(let i=0;i<4;i++)if(cross(.1+i*.18+.18*.62))this.foley('shell');if(u.empty&&cross(.88))this.foley('pump');}
   if(!p.reloading&&id===3&&cyc<.2&&cycle>=.2)this.foley('pump');if(!p.reloading&&id===4&&cyc<.3&&cycle>=.3)this.foley('bolt');
   u.lastR=r;u.lastCycle=cycle;}
  u.magazine.visible=magVisible;u.magazine.position.set(...magOff);u.magazine.rotation.set(magRot,0,0);
  if(id===3&&!p.reloading)u.magazine.position.set(0,0,0);
  if(id===3){u.moving.position.set(0,0,moveZ);}else if(id===4){u.moving.position.set(0,0,moveZ);u.moving.rotation.set(0,0,moveRotZ);}else u.moving.position.set(0,0,moveZ);
  u.leftAt=left.slice();u.rightAt=right.slice();u.leftAt[1]+=throwing*.08;u.leftAt[2]-=Math.sin(throwing*Math.PI)*.14;
  if(u.leftHand){
   u.rightHand.position.set(...right);u.rightHand.rotation.set(0,0,-.13);u.leftHand.position.set(...left);
   u.leftHand.rotation.set(0,0,p.reloading?lerp(id===0?-.12:0,-.35,Math.min(1,tilt*1.5)):id===0?-.12:0);
   u.leftHand.position.y+=throwing*.08;u.leftHand.position.z-=Math.sin(throwing*Math.PI)*.14;
  }
  for(const arm of u.arms){const hand=arm.left?u.leftHand:u.rightHand,wrist=new KartGL.Vector3(...hand.userData.wrist).applyEuler(hand.rotation).add(hand.position),d=wrist.clone().sub(arm.elbow);arm.mesh.position.copy(wrist).add(arm.elbow).multiplyScalar(.5);arm.mesh.quaternion.setFromUnitVectors(new KartGL.Vector3(0,1,0),d.clone().normalize());arm.mesh.scale.y=d.length();arm.band.position.copy(wrist).lerp(arm.elbow,.05);arm.band.quaternion.copy(arm.mesh.quaternion);arm.band.scale.set(1,d.length()*.06,1);}
 },
};
