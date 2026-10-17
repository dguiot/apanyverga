'use strict';
const KartItemArt={
  create(type){
    const T=KartGL,root=new T.Group(),b=KartModels.batch(),col=KART_ITEMS[type]?.color||'#e2bcf0',metal='#c8d4d8',dark='#253243';root.userData.type=type;
    if(type==='chile'||type==='triple'){
      b.add('sphere','#de3d44',[0,0,0],[.4,.4,1.06],null,.25,.24);b.add('torus',metal,[0,0,-.55],[.4,.4,.4],null,.8,.25);
      b.add('cone','#f7d7ac',[0,0,1.02],[.28,.54,.28],[Math.PI/2,0,0],.4,.25);
      for(let i=0;i<3;i++){const a=i*TAU/3;b.add('box','#76a376',[Math.cos(a)*.4,Math.sin(a)*.4,-.72],[.08,.48,.55],[0,0,a-Math.PI/2],.3);}
      b.add('cylinder',dark,[0,0,-1.03],[.24,.2,.24],[Math.PI/2,0,0],.6);b.add('sphere','#91f0ff',[0,0,-1.2],[.16,.16,.36],null,0,.3,'#3ccfff');
    }else if(type==='tortilla'){
      b.add('cylinder','#ebc47c',[0,0,0],[1.13,.14,1.13],null,.1,.65);b.add('torus','#9c6d35',[0,.06,0],[1.06,1.06,1.06],[Math.PI/2,0,0],.15,.8);
      for(let i=0;i<22;i++){const a=i*2.399,r=.24+((i*17)%13)/16;b.add('sphere','#ba884d',[Math.cos(a)*r,.09,Math.sin(a)*r],[.05,.02,.07]);}
    }else if(type==='salsa'){
      for(let i=0;i<7;i++){const a=i*2.4;b.add('sphere',i%2?'#bb3427':'#e04d31',[Math.sin(a)*.9,.03,Math.cos(a)*.7],[1.3,.065,1]);}
      for(let i=0;i<13;i++)b.add('box',i%3?'#f19b49':'#79a65a',[Math.sin(i*2.4)*1.4,.12,Math.cos(i*1.7)*.9],[.12,.04,.09],[0,i,0]);
    }else if(type==='pinata'){
      b.add('sphere','#bc62c5',[0,.2,0],[.65,.72,.65],null,.05,.9);
      for(let i=0;i<7;i++){const a=i*TAU/7,colors=['#e785c4','#73d6c6','#f2c063','#9d9ee2'];b.add('cone',colors[i%4],[Math.cos(a)*.78,.2+Math.sin(a)*.78,0],[.32,1.12,.32],[0,0,-a+Math.PI/2]);
        for(let j=0;j<3;j++)b.add('box',colors[(i+j)%4],[Math.cos(a)*1.27+(j-1)*.1,Math.sin(a)*1.27-.08*j,.03],[.07,.45,.03],[0,0,Math.sin(i)*.3]);}
    }else if(type==='boomerang'){
      for(const side of [-1,1]){b.add('box','#b68240',[side*.43,0,.05],[.37,.16,1.4],[0,-side*.57,0],.1,.48);for(let j=0;j<3;j++)b.add('box',j%2?'#e8d3a7':'#e77651',[side*(.22+j*.18),.095,.53-j*.24],[.38,.025,.12],[0,-side*.57,0]);}
      b.add('sphere','#d2a663',[0,0,-.55],[.28,.085,.3]);
    }else if(type==='turbo'){
      b.add('sphere','#d69843',[0,0,0],[.82,.42,.48]);for(let i=-1;i<=1;i++)b.add('box','#f8dfab',[i*.35,.37,0],[.06,.035,.6],[0,0,.5]);
      b.add('cone','#72ebed',[0,0,-.67],[.3,.7,.3],[-Math.PI/2,0,0],0,.3,'#3ba5bf');
    }else if(type==='shield'){
      b.add('sphere','#77e4e5',[0,0,0],[.65,.65,.65],null,.55,.15);for(const a of [0,Math.PI/2])b.add('torus','#d0f4ed',[0,0,0],[.83,.83,.83],[a,0,0],.65,.2,'#3a8c9e');
    }else if(type==='magnet'){
      for(const side of [-1,1]){b.add('box','#d35d86',[side*.43,.2,0],[.3,.75,.3],null,.4,.3);b.add('box',metal,[side*.43,.65,0],[.31,.25,.31],null,.85,.22);}
      b.add('torus','#d35d86',[0,-.18,0],[.47,.47,.47],null,.4,.3);b.add('box','#d35d86',[0,-.44,0],[.8,.25,.3],null,.4);
    }else if(type==='spring'){
      const points=[];for(let i=0;i<=100;i++){const a=i/100*TAU*5;points.push(new T.Vector3(Math.cos(a)*.48,-.6+i/100*1.2,Math.sin(a)*.48));}
      const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),100,.06,6,false),KartModels.mat('#b4d8a2',.75,.25));root.add(mesh);for(const y of [-.65,.65])b.add('cylinder',metal,[0,y,0],[.66,.1,.66],null,.8,.2);
    }else if(type==='lightning'){
      const pts=[[-.05,.9,0],[-.45,.1,0],[.15,.15,0],[-.1,-.85,0],[.5,.2,0],[0,.15,0]];for(let i=0;i<pts.length-1;i++)KartModels.link(b,pts[i],pts[i+1],.13,'#ffe7a2');
    }else if(type==='star'){
      b.add('sphere','#ffe299',[0,0,0],[.4,.4,.2],null,.5,.2,'#a37328');for(let i=0;i<5;i++){const a=i*TAU/5;b.add('cone','#ffdc72',[Math.sin(a)*.5,Math.cos(a)*.5,0],[.27,.8,.16],[0,0,-a],.5,.2,'#916923');}
    }
    b.finish(root,false);return root;
  },
};
Kart3D.itemModel=type=>KartItemArt.create(type);
const kartItemBuild=Kart3D.build;Kart3D.build=function(race){
  kartItemBuild.call(this,race);this.heldItems=new Map();this.magnetRings=race.racers.map(()=>{const m=new KartGL.Mesh(new KartGL.TorusGeometry(1.7,.035,6,32),new KartGL.MeshBasicMaterial({color:'#f49fc5',transparent:true,opacity:.65,depthWrite:false}));m.rotation.x=Math.PI/2;this.scene.add(m);return m;});
  // Six illuminated faces keep a pickup readable from either direction.
  for(const root of this.boxes){const old=root.children.find(m=>m.geometry?.type==='PlaneGeometry');if(!old)continue;for(let i=0;i<5;i++){const face=new KartGL.Mesh(old.geometry,old.material);const a=(i+1)*Math.PI/2;if(i<3){face.position.set(Math.sin(a)*.92,0,Math.cos(a)*.92);face.rotation.y=a;}else{face.position.y=i===3?.92:-.92;face.rotation.x=i===3?-Math.PI/2:Math.PI/2;}root.add(face);}}
};
const kartItemAnimate=Kart3D.animate;Kart3D.animate=function(race,alpha){
  kartItemAnimate.call(this,race,alpha);const C=race.course,tick=this.itemFxTick!==race.tick;this.itemFxTick=race.tick;
  for(const r of race.racers){const visual=KartMotion.view(r,alpha),ring=this.magnetRings[r.index],w=C.world(visual.s,visual.x,.2);ring.visible=r.magnet>0;ring.position.set(w.x,w.y,w.z);ring.scale.setScalar(1+Math.sin(race.time*5)*.1);
    const type=r.item;let held=this.heldItems.get(r.index);if(held&&held.type!==type){this.scene.remove(held.mesh);held.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.heldItems.delete(r.index);held=null;}
    if(type&&!held){const mesh=new KartGL.Group(),n=type==='triple'?3:1;for(let i=0;i<n;i++)mesh.add(this.itemModel(type==='triple'?'chile':type));this.scene.add(mesh);held={type,mesh};this.heldItems.set(r.index,held);}
    if(held){held.mesh.children.forEach((m,i)=>{const a=race.time*1.6+i*TAU/held.mesh.children.length,s=visual.s-3+Math.sin(a)*1.3,x=visual.x+Math.cos(a)*.11,w=C.world(s,x,1.25+Math.max(0,visual.height));m.position.set(w.x,w.y,w.z);m.scale.setScalar(.38);m.rotation.y=Math.atan2(C.sample(s).tx,C.sample(s).tz)+a;});}
  }
  for(const q of race.projectiles){const mesh=this.itemMeshes.get(q);if(!mesh)continue;
    if(q.type==='pinata')mesh.position.y+=Math.sin(clamp(q.age/1.45,0,1)*Math.PI)*4.4;
    if(q.type==='boomerang')mesh.rotation.y+=race.time*12;
    if(q.type==='tortilla')mesh.rotation.z=Math.sin(race.time*9)*.15;
    if(q.type==='chile'&&tick){const w=C.world(q.s-q.dir*2,q.x,1.1);this.particle(w,[.23,.75,1],-C.sample(q.s).tx*q.dir*2,1,-C.sample(q.s).tz*q.dir*2);}
  }
};
const kartItemHud=KartRender.hud;KartRender.hud=function(race){kartItemHud.call(this,race);this.itemStatus(race.player,22,270);this.itemWarning(race,race.player,{x:0,y:0,w:W,h:H});};
const kartItemSplitHud=KartRender.splitHud;KartRender.splitHud=function(race,r,b){kartItemSplitHud.call(this,race,r,b);this.itemStatus(r,b.x+12,b.y+144);this.itemWarning(race,r,b);};
KartRender.itemStatus=function(r,x,y){for(const [key,label,col]of [['shield','BURBUJA','#8ce9ec'],['star','ESTRELLA','#ffde86'],['magnet','IMÁN','#f3a5c7'],['slow','RALENTIZADO','#c1b3f3'],...(!r.star&&!r.shield?[['invuln','PROTECCIÓN','#b1d8ec']]:[])])if(r[key]>0){this.panel(x,y,174,23);text(label+'  '+r[key].toFixed(1)+' s',x+87,y+12,12,col,{body:true,weight:700});y+=27;}};
KartRender.itemWarning=function(race,r,b){
  if(r.finish!==null||race.phase!=='race')return;const q=race.projectiles.find(q=>q.type==='chile'&&q.target===r.index&&Math.abs(KartMath.delta(q.s,r.s,race.course.length))<130);
  if(q){ctx.save();const y=b.y+b.h-92;this.panel(b.x+b.w/2-126,y-18,252,34);text('⚠ COHETE EN CAMINO',b.x+b.w/2,y,16,'#ffb69f',{body:true,weight:700});ctx.restore();}
};
