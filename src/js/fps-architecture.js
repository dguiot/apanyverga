'use strict';
// One layout supplies masonry, openings, glass, floors and stair geometry to
// both collision and art. Dimensions are metres; details sit on actual faces.
const FPSArchitecture={
 add(world,block,x,z,w,d,h,color){
  const b={type:'building',x,z,w,d,h,color,y:world.height(x,z),walls:[],stair:null},th=.46;
  const solid=(px,pz,sw,sd,sh,y,type='plaster',finish)=>{const q=block(px,pz,sw,sd,sh,type,y);q.color=color;q.building=b;q.finish=finish;return q;};
  for(const [axis,side,length]of [['z',1,w],['z',-1,w],['x',1,d],['x',-1,d]]){
   const openings=[],door=axis==='z';if(door)openings.push({u:0,y:0,w:side>0?3:2.5,h:2.85,type:'door'});
   const count=Math.floor((length-4)/4.8);for(let i=0;i<count;i++){const u=(i-(count-1)/2)*4.8;if(door&&Math.abs(u)<3)continue;openings.push({u,y:1.15,w:2.25,h:2.05,type:'window'});}
   if(h>6.7)for(let i=0;i<3;i++)openings.push({u:(i-1)*length*.27,y:h-2.3,w:2.6,h:1.15,type:'window'});
   // The east service wall carries the external stair; never bury glazing
   // behind the flight or place a window opening against a concrete riser.
   if(axis==='x'&&side===1)openings.length=0;
   const wall={axis,side,length,th,openings},ys=[...new Set([0,h,...openings.flatMap(o=>[o.y,o.y+o.h])])].sort((a,b)=>a-b),pieces=[];
   for(let j=1;j<ys.length;j++){
    const y=(ys[j-1]+ys[j])/2,holes=openings.filter(o=>y>o.y&&y<o.y+o.h).sort((a,b)=>a.u-b.u);let cursor=-length/2;
    for(const o of [...holes,{u:length/2,w:0}]){const end=o.u-o.w/2;if(end>cursor+.001){const previous=pieces.find(p=>p.u===cursor&&Math.abs(p.w-(end-cursor))<1e-6&&p.y+p.h===ys[j-1]);if(previous)previous.h+=ys[j]-ys[j-1];else pieces.push({u:cursor,w:end-cursor,y:ys[j-1],h:ys[j]-ys[j-1]});}cursor=o.u+o.w/2;}
   }
   for(const p of pieces){const u=p.u+p.w/2;solid(x+(axis==='x'?side*w/2:u),z+(axis==='z'?side*d/2:u),axis==='z'?p.w:th,axis==='z'?th:p.w,p.h,b.y+p.y);}
   // Glazing is recessed 17 cm behind the plaster face and stops bullets.
   for(const o of openings.filter(o=>o.type==='window'))solid(x+(axis==='x'?side*(w/2+.06):o.u),z+(axis==='z'?side*(d/2+.06):o.u),axis==='z'?o.w:.055,axis==='z'?.055:o.w,o.h,b.y+o.y,'steel','window');
   b.walls.push(wall);
  }
  solid(x,z,w+.65,d+.65,.35,b.y-.27,'floor','floor');solid(x,z,w+.85,d+.85,.32,b.y+h,'roof','concrete');
  const top=h+.32,n=Math.ceil(top/.22),tread=.39,run=n*tread,end=z+d/2-.7,cx=x+w/2+1.8;
  b.stair={x:cx,start:end-run+tread,end,n,tread,w:2.7,top:b.y+top,rise:top/n};
  for(let i=0;i<n;i++)solid(cx,b.stair.start+i*tread,2.7,tread+.008,(i+1)*top/n,b.y,'stair','concrete');
  solid(x+w/2+.9,end+1.2,4.5,2.5,.32,b.y+h,'roof','concrete');
  // Three parapets and the far half of the fourth leave the landing open.
  for(const side of [-1,1])solid(x,z+side*(d/2+.2),w+.65,.22,.62,b.y+top,'stone','concrete');
  solid(x-w/2-.2,z,.22,d+.4,.62,b.y+top,'stone','concrete');solid(x+w/2+.2,z-d*.16,.22,d*.68,.62,b.y+top,'stone','concrete');
  // Interior storage is genuine cover, with clear entrance and spawn lanes.
  for(const side of [-1,1])solid(x+side*(w/2-2.1),z-d*.22,2.5,2,1.12,b.y,'crate','storage');
  world.decor.push(b);return b;
 },
 build(view,b,batch){
  const T=KartGL,S=FPSScenery,trim=S.material('plaster','#eee7d6'),base=S.material('stone','#aaa997'),metal=S.material('steel','#677572'),dark=KartModels.mat('#273b3b',.3,.65),wood=S.material('wood','#a28b68'),roof=S.material('stone','#c6c5b4');
  const box=(mat,x,y,z,w,h,d,rot)=>batch.add('box',mat,[x,y,z],[w,h,d],rot);
  for(const wall of b.walls){
   const {axis,side}=wall,face=(u,y,out)=>[b.x+(axis==='x'?side*(b.w/2+out):u),b.y+y,b.z+(axis==='z'?side*(b.d/2+out):u)],bar=(mat,u,y,out,w,h,d)=>batch.add('box',mat,face(u,y,out),axis==='z'?[w,h,d]:[d,h,w]);
   // Foundation and cornice stop at the faces; no panels hover off the shell.
   const door=wall.openings.find(o=>o.type==='door');if(door){for(const s of [-1,1])bar(base,s*(wall.length+door.w)*.25,.23,.247,(wall.length-door.w)/2,.46,.08);}else bar(base,0,.23,.247,wall.length,.46,.08);
   bar(trim,0,b.h-.18,.27,wall.length+.55,.18,.2);bar(roof,0,b.h+.94,.22,wall.length+.7,.09,.34);
   for(const o of wall.openings){
    if(o.type==='door'){
     for(const s of [-1,1])bar(trim,o.u+s*(o.w/2+.07),o.h/2,.28,.14,o.h,.16);bar(trim,o.u,o.h+.07,.28,o.w+.28,.14,.16);
    bar(base,o.u,.09,.4,o.w,.035,.64);continue;
    }
    const cy=o.y+o.h/2;
    for(const s of [-1,1]){bar(trim,o.u+s*(o.w/2+.06),cy,.26,.12,o.h+.22,.15);bar(trim,o.u,cy+s*(o.h/2+.06),.26,o.w+.24,.12,.15);}
    bar(metal,o.u,cy,.14,.055,o.h,.05);bar(metal,o.u,cy,.14,o.w,.045,.05);bar(trim,o.u,o.y-.06,.36,o.w+.38,.12,.54);
    // A shallow sun hood and interior reveal give real depth, not flat decals.
    bar(base,o.u,o.y+o.h+.16,.38,o.w+.48,.11,.6);
   }
   // Interior lower wall paint and skirting stay inside the room, with doors free.
   const segments=door?[[-(wall.length+door.w)/4,(wall.length-door.w)/2],[(wall.length+door.w)/4,(wall.length-door.w)/2]]:[[0,wall.length]];
   for(const [u,w]of segments){bar(base,u,.09,-.239,w,.18,.018);bar(S.material('plaster','#b0b9ac'),u,.61,-.238,w,.85,.012);}
  }
  // Four corner quoins, flush with the adjoining masonry.
  for(const sx of [-1,1])for(const sz of [-1,1])for(let j=0;j<Math.floor(b.h/.52);j++)box(trim,b.x+sx*b.w/2,b.y+.26+j*.52,b.z+sz*b.d/2,.58,.48,.58);
  for(const side of [-1,1]){const x=b.x+side*(b.w/2-.5),z=b.z+b.d/2+.33;batch.add('branch',metal,[x,b.y+b.h/2,z],[.055,b.h,.055]);for(let j=1;j<b.h;j+=1.4)box(dark,x,b.y+j,z,.16,.04,.14);}
  const doorZ=b.z+b.d/2,awning=S.material('roof',b.x<0?'#b67f5b':'#68887d');box(awning,b.x,b.y+3.12,doorZ+1.15,4.8,.11,1.9,[.08,0,0]);box(metal,b.x,b.y+3.02,doorZ+2.02,4.85,.12,.08);
  for(const s of [-1,1]){box(metal,b.x+s*2.22,b.y+1.5,doorZ+1.96,.065,3,.065);box(base,b.x+s*2.22,b.y+.1,doorZ+1.96,.3,.2,.3);}
  // Roof machinery has feet and a separate kerb; no floating cylinders.
  box(roof,b.x-4,b.y+b.h+.46,b.z-2,2.4,.28,2.4);batch.add('cylinder',S.material('steel','#a4afaa'),[b.x-4,b.y+b.h+1.32,b.z-2],[.9,1.45,.9]);
  box(metal,b.x+4,b.y+b.h+.72,b.z-2,3.2,.7,1.8);for(let i=0;i<10;i++)box(dark,b.x+4+(i-4.5)*.26,b.y+b.h+.75,b.z-1.08,.08,.45,.025);
  // External flight uses exactly the collision's risers and landing height.
  const st=b.stair,link=(a,c,r=.035)=>FPSGear.link(batch,metal,a,c,r);
  for(const side of [-1,1]){
   const x=st.x+side*(st.w/2-.05),a=[x,b.y+st.rise+1.02,st.start-.18],end=[x,st.top+1.02,st.end+.18];link(a,end);
   for(let i=0;i<st.n;i+=4){const z=st.start+i*st.tread,y=b.y+(i+1)*st.rise;link([x,y,z],[x,y+1.02,z],.025);}
   link([x,st.top,st.end+.18],[x,st.top+1.02,st.end+.18],.025);
  }
  // Ceiling beams and warm overhead lamps read as a usable interior.
  for(let z=-b.d/2+4;z<b.d/2-2;z+=5){box(wood,b.x,b.y+b.h-.2,b.z+z,b.w-.6,.3,.22);box(metal,b.x,b.y+b.h-.48,b.z+z,1.8,.12,.35);box(KartModels.mat('#f9e5b5',0,.65,'#786646'),b.x,b.y+b.h-.55,b.z+z,1.6,.02,.27);}
  for(const side of [-1,1]){const x=b.x+side*(b.w/2-2.1),z=b.z-b.d*.22;box(wood,x,b.y+1.19,z,2.65,.14,2.14);for(const s of [-1,1])box(metal,x+s*1.1,b.y+.57,z,.07,1.14,1.8);}
  const label=view.sign(b.x>60?'DEPÓSITO  /  03':b.z>50?'TALLER  /  02':b.x>0?'ESTACIÓN  /  01':'CASA SIERRA');label.scale.set(.37,.45,1);label.position.set(b.x,b.y+4,doorZ+.265);view.scene.add(label);
 },
};
