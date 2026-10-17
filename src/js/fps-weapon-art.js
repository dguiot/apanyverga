'use strict';
// Authored hard-surface profiles in metres, not a scaled cube per weapon.
// Hands remain tied to the canonical character palette and species.
const FPSHandArt={
 loft(rings,segments=16,colors=null){
  const T=KartGL,pos=[],uv=[],ix=[],cols=[];for(let j=0;j<rings.length;j++){const [y,rx,rz,cx=0,cz=0]=rings[j];for(let i=0;i<=segments;i++){const a=i*TAU/segments;pos.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);uv.push(i/segments,j/(rings.length-1));if(colors){const c=new T.Color(colors[j%colors.length]);c.multiplyScalar(.96+Math.cos(a)*.04);cols.push(c.r,c.g,c.b);}if(j<rings.length-1&&i<segments){const k=j*(segments+1)+i;ix.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}}}
  for(const j of [0,rings.length-1]){const center=pos.length/3;pos.push(rings[j][3]||0,rings[j][0],rings[j][4]||0);uv.push(.5,j?1:0);if(colors){const c=new T.Color(colors[j%colors.length]);cols.push(c.r,c.g,c.b);}for(let i=0;i<segments;i++){const a=j*(segments+1)+i;ix.push(...(j?[center,a+1,a]:[center,a,a+1]));}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colors)g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(ix);g.computeVertexNormals();return g;
 },
 hand(id,left=false){
  const T=KartGL,L=CharacterDesign.get(id),g=new T.Group(),b=FPSScenery.batch(),glove=!!L.glove,col=L.glove||L.skin,skin=FPSGear.material(col,glove?'fabric':'skin'),crease=FPSGear.material(shade(col,-.12),glove?'fabric':'skin'),nail=FPSGear.material(shade(col,.1),'skin');g.userData={design:L,fingers:[]};
  // A tapered carpal base, asymmetrical palm and thenar pad, with a real wrist.
  const palm=this.loft([[-.091,.019,.023,.004,.01],[-.07,.023,.026,.006,.012],[-.045,.025,.033,.008,.014],[-.012,.023,.04,.007,.012],[.027,.022,.038,.004,.005],[.052,.017,.029,-.001,-.004],[.061,.008,.019,-.005,-.007]],20);b.geometry(palm,skin,[0,0,0]);b.add('sphere',skin,[.005,.004,.031],[.023,.043,.027]);
  const arc=(points,r,material=skin)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));b.geometry(new T.TubeGeometry(curve,12,r,7,false),material,[0,0,0]);};
  for(let i=0;i<4;i++){
   const y=.043-i*.027,shorten=[0,0,.004,.01][i],a=[-.002,y,-.02],knuckle=[-.028,y+.002,-.046+shorten],joint=[-.047,y-.001,-.033+shorten],tip=[-.041,y-.003,-.007+shorten],r=[.0105,.011,.0103,.0088][i];
   arc([a,knuckle,joint,tip],r);b.add('sphere',skin,knuckle,[r*1.17,r*.91,r*1.05]);b.add('sphere',skin,joint,[r*.93,r*.83,r*.9]);
   // Fine creases follow the bent joints instead of a black ring around a tube.
   arc([[-.027,y-r*.6,-.054+shorten],[-.03,y,-.056+shorten],[-.03,y+r*.6,-.053+shorten]],.00065,crease);
   if(!glove&&(!L.species||L.species==='mariachi'))b.add('sphere',nail,[-.046,y-.003,.0005+shorten],[.0018,.006,.0065]);
   if(L.hand==='claw')b.add('cone',nail,[-.044,y,.01+shorten],[.006,.023,.006],[Math.PI/2,0,.1]);g.userData.fingers.push({tip,length:[.075,.083,.078,.063][i]});
  }
  arc([[.013,.028,.025],[-.008,.023,.049],[-.032,.008,.048],[-.04,-.007,.026]],.013);b.add('sphere',skin,[-.02,.015,.048],[.015,.016,.013]);
  if(!glove){for(let i=0;i<3;i++)arc([[.028,-.055,.011+i*.007],[.031,-.03,.002+i*.009],[.029,-.006,-.007+i*.01]],.00055,crease);for(let i=0;i<2;i++)arc([[.019,-.077+i*.004,-.004],[.026,-.076+i*.004,.012],[.019,-.076+i*.004,.028]],.0006,crease);}
  else{const pad=FPSGear.material(shade(col,-.27));for(let i=0;i<4;i++)b.add('sphere',pad,[.024,.04-i*.027,-.012],[.004,.011,.012]);for(const z of [-.022,.033])arc([[.021,-.067,z],[.026,-.015,z],[.021,.034,z]],.0008,nail);}
  b.finish(g,false);if(left)g.scale.x=-1;return g;
 },
 arm(id){const L=CharacterDesign.get(id),sleeved=L.sleeve==='long';return this.loft([[-.5,.052,.046],[-.36,.055,.048],[-.1,.049,.041],[.18,.039,.034],[.34,.032,.029],[.44,.027,.024],[.5,.024,.024]],20);},
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
 label(text,color='#b7bdb7'){
  const T=KartGL,cv=mkCanvas(512,128),c=cv.getContext('2d');c.fillStyle=color;c.font='600 42px monospace';c.textAlign='center';c.fillText(text,256,62);c.font='19px monospace';c.fillText('ESMASH   •   SIERRA WORKS',256,102);const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.74});
 },
 build(id,character,thirdPerson=false){
  FPSGear.rounded();const T=KartGL,L=CharacterDesign.get(character),root=new T.Group(),body=new T.Group(),magazine=new T.Group(),moving=new T.Group(),b=FPSScenery.batch(),mb=FPSScenery.batch(),long=[.34,.54,.8,.88,1.07][id],g=FPS_GUNS[id];root.add(body,magazine,moving);root.userData={design:L,body,magazine,moving,long,arms:[],weaponId:id};
  const metal=FPSGear.material('#343c43','metal'),edge=FPSGear.material('#77828a','metal'),dark=FPSGear.material('#172025'),poly=FPSGear.material(id===1?'#38403d':'#293139'),accent=FPSGear.material(id===4?'#675044':id===3?'#6c4d34':id===0?'#344952':'#53605d'),rubber=FPSGear.material('#11191d');
  const shape=(points,w,mat=metal,bb=b)=>bb.geometry(this.profile(points,w),mat,[0,0,0]),box=(mat,p,s,r)=>b.add('fps-rounded',mat,p,s,r),tube=(mat,p,r,len)=>b.add('cylinder',mat,p,[r,len,r],[Math.PI/2,0,0]),link=(a,z,r,mat=metal)=>FPSGear.link(b,mat,a,z,r);
  // Grip and trigger guard are independent of the upper receiver.
  shape([[.015,-.032],[.079,-.047],[.125,-.211],[.105,-.227],[.05,-.223],[.017,-.092]],.046,poly);
  for(let i=0;i<9;i++)box(rubber,[.024,-.088-i*.014,.054+i*.003],[.0015,.002,.049]);
  const guard=new T.CatmullRomCurve3([[0,-.05,.015],[0,-.085,-.015],[0,-.12,.011],[0,-.108,.063],[0,-.06,.072]].map(p=>new T.Vector3(...p)));b.geometry(new T.TubeGeometry(guard,20,.0045,8,false),metal,[0,0,0]);link([0,-.052,.03],[0,-.09,.018],.004,edge);
  if(id===0){
   shape([[-.235,.022],[-.224,.057],[-.202,.066],[.121,.066],[.148,.049],[.15,.005],[-.226,.005]],.061,metal);
   shape([[-.22,.003],[.13,.003],[.14,-.04],[.065,-.059],[.004,-.044],[-.207,-.034]],.053,poly);
   tube(edge,[0,.024,-.232],.013,.036);tube(dark,[0,.024,-.253],.009,.005);b.add('torus',edge,[0,.024,-.256],[.012,.012,.012]);
   for(const s of [-1,1]){for(let i=0;i<10;i++)box(edge,[s*.031,.026,.058+i*.006],[.001,.028,.0015]);box(dark,[s*.031,.035,-.061],[.001,.025,.053]);box(edge,[s*.032,.02,-.061],[.001,.002,.055]);}
  }else{
   const end=id===1?-.13:id===3?-.18:-.16;
   shape([[end,.018],[end+.02,.052],[.09,.052],[.15,.03],[.15,-.035],[.074,-.045],[.042,-.073],[-.066,-.067],[-.085,-.036],[end,-.028]],id===3?.058:.063,metal);
   shape([[-.085,-.028],[.059,-.028],[.084,-.065],[.014,-.083],[-.081,-.081]],.057,poly);
   // Barrel and muzzle brake have a recessed bore and machined rings.
   const front=-long*.79;tube(metal,[0,.018,(front+end)*.5],id===4?.016:.012,Math.abs(front-end));tube(edge,[0,.018,front+.014],.017,.034);tube(dark,[0,.018,front-.007],.011,.006);b.add('torus',metal,[0,.018,front-.011],[.016,.016,.016]);
   for(let i=0;i<3;i++)for(const s of [-1,1])box(dark,[s*.016,.018,front+i*.01],[.002,.01,.004]);
   if(id===3||id===4){
    shape([[.09,.01],[.17,.0],[.27,.035],[.49,.055],[.51,.032],[.51,-.127],[.45,-.13],[.29,-.085],[.15,-.075]],.065,accent);
    box(rubber,[0,-.037,.51],[.075,.17,.022],[.04,0,0]);
    if(id===3){tube(metal,[0,-.031,-.4],.017,.43);tube(accent,[0,-.008,-.31],.033,.2);for(let i=0;i<10;i++)b.add('torus',dark,[0,-.008,-.4+i*.02],[.0335,.0335,.0335]);}
    else{shape([[-.46,-.029],[-.44,-.057],[-.15,-.077],[-.1,-.047],[-.12,-.014]],.07,accent);link([.031,.009,.065],[.082,-.015,.099],.007,edge);b.add('sphere',dark,[.085,-.019,.104],[.016,.016,.016]);for(const side of [-1,1])link([side*.027,-.065,-.31],[side*.034,-.063,-.47],.005,metal);}
   }else{
    // A slim octagonal ventilated handguard, buffer tube and open stock.
    const z=-long*.35,len=long*.35;b.add('cylinder',poly,[0,.004,z],[.034,len,.034],[Math.PI/2,0,0]);
    for(const side of [-1,1])for(let i=0;i<7;i++){box(dark,[side*.031,.006,z-len*.4+i*len*.12],[.0015,.014,.013]);box(edge,[side*.033,-.015,z-len*.4+i*len*.12],[.001,.0015,.015]);}
    tube(metal,[0,.002,.22],.019,.17);shape([[.21,.033],[.36,.033],[.39,.012],[.39,-.126],[.36,-.139],[.31,-.111],[.24,-.067]],.058,poly);box(rubber,[0,-.05,.39],[.063,.166,.018]);
   }
   // Small Picatinny teeth, with relieved slots rather than giant bright blocks.
   if(id!==3)for(let i=0;i<(id===1?13:19);i++)box(metal,[0,.059,-long*.31+i*.019],[.044,.006,.009]);
  }
  // Open ejection port, retained bolt, selector, release and hex fasteners.
  box(dark,[.032,.017,.025],[.0015,.025,.068]);box(edge,[.033,.006,.025],[.0015,.002,.069]);box(edge,[.038,-.035,.052],[.012,.01,.014]);
  for(const side of [-1,1]){for(const z of [-.075,.084]){b.add('cylinder',edge,[side*.033,-.018,z],[.004,.002,.004],[0,0,Math.PI/2]);box(dark,[side*.0345,-.018,z],[.001,.001,.004]);}box(edge,[side*.035,-.047,.072],[.002,.005,.017],[0,0,side*.2]);}
  if(id===4){
   for(const z of [-.17,.12]){b.add('torus',metal,[0,.16,z],[.06,.06,.06]);box(metal,[0,.096,z],[.025,.06,.033]);}tube(metal,[0,.225,-.02],.022,.036);b.add('cylinder',metal,[.07,.16,-.02],[.023,.06,.023],[0,0,Math.PI/2]);
  }else if(id===0){
   for(const side of [-1,1])box(metal,[side*.027,.076,.105],[.006,.02,.018]);
   box(metal,[0,.071,-.194],[.009,.011,.02]);box(metal,[0,.082,-.194],[.006,.013,.014]);
  }else if(id===3){
   box(metal,[0,.051,-.33],[.018,.008,.52]);for(const z of [-.21,-.35,-.5])box(metal,[0,.033,z],[.01,.03,.01]);b.add('sphere',FPSGear.material('#dfb66d'),[0,.071,-.57],[.003,.003,.003]);
  }else{
   // Preserve the optical centre while giving the sights a thinner silhouette.
   box(metal,[0,.064,long*.15],[.051,.024,.037]);box(metal,[0,.079,long*.15],[.062,.012,.027]);
   box(metal,[0,.043,-long*.55],[.018,.04,.027]);
   for(const side of [-1,1])box(metal,[side*.027,.112,long*.15],[.008,.058,.022]);box(metal,[0,.093,-long*.55],[.015,.075,.02]);b.add('sphere',FPSGear.material('#dbab66'),[0,.138,-long*.55],[.0025,.0025,.0025]);
  }
  if(id!==3){
   const magZ=id===0?.075:-.043,magH=id===0?.1:id===1?.19:id===4?.09:.17;
   shape([[magZ-.039,-.059],[magZ+.037,-.059],[magZ+.052,-.08-magH],[magZ+.022,-.099-magH],[magZ-.039,-.092-magH]],.041,poly,mb);
   for(const side of [-1,1])for(let i=0;i<3;i++)mb.add('box',dark,[side*.022,-.104-i*.037,magZ+.01],[.0015,.003,.059]);
  }else{mb.add('cylinder',FPSGear.material('#b69a56','metal'),[0,-.07,.02],[.011,.056,.011],[Math.PI/2,0,0]);}
  b.finish(body,false);mb.finish(magazine,false);
  if(id===4){const mesh=new T.Mesh(new T.CylinderGeometry(.055,.055,.29,32,1,true),metal);mesh.rotation.x=Math.PI/2;mesh.position.set(0,.16,-.025);mesh.name='open-scope-tube';body.add(mesh);}
  for(const side of [-1,1]){const logo=new T.Mesh(new T.PlaneGeometry(id===0?.085:.125,.028),this.label(['C9 / 9×19','VSP / 9 mm','SIERRA / 5.56','T12 / 12 GA','HZ / .308'][id]));logo.rotation.y=side*Math.PI/2;logo.position.set(side*.034,-.016,id===0?.04:.053);body.add(logo);}
  if(!thirdPerson){
   const sleeve=FPSGear.material(L.sleeve==='long'?L.top:L.skin,L.sleeve==='long'?'fabric':'skin'),cuff=FPSGear.material(L.wrap||shade(L.top,-.2),'fabric');
   for(const left of [false,true]){const arm=new T.Mesh(FPSHandArt.arm(character),sleeve),band=new T.Mesh(new T.CylinderGeometry(.025,.027,1,18),cuff);root.add(arm,band);const hand=FPSHandArt.hand(character,left);hand.name=character+':fps-'+(left?'left':'right')+'-hand';root.add(hand);root.userData[left?'leftHand':'rightHand']=hand;root.userData.arms.push({mesh:arm,band,elbow:new T.Vector3(left?-.23:.15,-.3,left?.25:.42),left});}
  }
  const flash=FPSFX.sprite({map:FPSFX.texture(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:'#fff0c2'});flash.scale.set(.19,.19,1);flash.position.set(0,.018,-long*.86);flash.visible=false;body.add(flash);root.userData.flash=flash;this.animate(root,{gun:id,reloading:0,recoil:0,throwTimer:0});return root;
 },
 grip(id,left,reach=0){const long=[.34,.54,.8,.88,1.07][id];return left?[lerp(id===0?-.026:-.033,-.025,reach),lerp(id===0?-.118:-.053,-.19,reach),lerp(id===0?.073:-long*.3,-.025,reach)]:[.029,-.12,.076];},
 animate(gun,p){
  const u=gun.userData,id=p.gun,t=p.reloading?clamp(1-p.reloading/FPS_GUNS[id].reload,0,1):0,reach=Math.sin(t*Math.PI),pull=id===3?Math.sin(t*Math.PI*3):Math.sin(clamp((t-.15)/.65,0,1)*Math.PI),throwing=clamp((p.throwTimer||0)/.5,0,1);u.body.position.z=p.recoil*.2;
  u.magazine.visible=id!==3||!!p.reloading;u.magazine.position.set(.018*pull,-.14*Math.max(0,pull),.04*pull);u.magazine.rotation.x=.15*pull;
  if(u.leftHand){u.rightHand.position.set(...this.grip(id,false));u.rightHand.rotation.set(0,0,-.13);u.leftHand.position.set(...this.grip(id,true,reach));u.leftHand.rotation.set(0,0,lerp(id===0?-.12:-.96,-.32,reach));u.leftHand.position.y+=throwing*.08;u.leftHand.position.z-=Math.sin(throwing*Math.PI)*.14;}
  for(const arm of u.arms){const hand=arm.left?u.leftHand:u.rightHand,wrist=new KartGL.Vector3(.003,-.082,.012).applyEuler(hand.rotation).add(hand.position),d=wrist.clone().sub(arm.elbow);arm.mesh.position.copy(wrist).add(arm.elbow).multiplyScalar(.5);arm.mesh.quaternion.setFromUnitVectors(new KartGL.Vector3(0,1,0),d.clone().normalize());arm.mesh.scale.y=d.length();arm.band.position.copy(wrist).lerp(arm.elbow,.045);arm.band.quaternion.copy(arm.mesh.quaternion);arm.band.scale.y=d.length()*.06;}
 },
};
