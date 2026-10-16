'use strict';
const Kart3D={
  renderer:null,scene:null,race:null,error:null,thumbs:new Map(),batches:new Map(),
  init(){
    if(this.renderer)return true;if(this.error)return false;
    try{
      const T=KartGL,r=this.renderer=new T.WebGLRenderer({antialias:!IS_XBOX,alpha:true,powerPreference:'high-performance'});
      r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.22;
      r.shadowMap.enabled=!IS_XBOX;r.shadowMap.type=T.PCFSoftShadowMap;
      const pmrem=new T.PMREMGenerator(r),room=new T.RoomEnvironment();this.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
      r.domElement.id='kart-world';r.domElement.setAttribute('aria-hidden','true');
      r.domElement.style.cssText='position:fixed;pointer-events:none;display:none;z-index:0;background:transparent;max-width:none';
      document.body.insertBefore(r.domElement,canvas);canvas.style.zIndex='1';
      r.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(APP.kartRace)APP.kartRace.paused=true;});
      r.domElement.addEventListener('webglcontextrestored',()=>{this.race=null;});
      return true;
    }catch(e){this.error=e.message;return false;}
  },
  hide(){if(this.renderer)this.renderer.domElement.style.display='none';canvas.style.background='';},
  syncSize(){
    const r=canvas.getBoundingClientRect(),el=this.renderer.domElement,k=Math.min(VIEW.k||1,IS_XBOX?.85:1.5);
    el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=r.width+'px';el.style.height=r.height+'px';el.style.display='block';
    const w=Math.round(W*k),h=Math.round(H*k);if(el.width!==w||el.height!==h)this.renderer.setSize(w,h,false);
    canvas.style.background='transparent';
  },
  disposeScene(){
    if(!this.scene)return;
    const geometries=new Set(),textures=new Set(),materials=new Set();
    this.scene.traverse(o=>{if(o.geometry&&!Array.from(KartModels.geometry.values()).includes(o.geometry))geometries.add(o.geometry);
      if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])if(!Array.from(KartModels.materials.values()).includes(m)&&!Array.from(KartWorld.materials.values()).includes(m)){materials.add(m);for(const v of Object.values(m))if(v&&v.isTexture&&!Array.from(KartWorld.textures.values()).includes(v))textures.add(v);}}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.scene=null;
  },
  instance(type,color,pos,scale,rot,metal=0,rough=.8,emit=null){
    const mat=KartModels.mat(color,metal,rough,emit),geo=KartModels.geo(type),key=geo.uuid+mat.uuid;
    if(!this.batches.has(key))this.batches.set(key,{geo,mat,matrices:[]});this.batches.get(key).matrices.push(KartModels.matrix(pos,scale,rot));
  },
  flush(){
    for(const {geo,mat,matrices} of this.batches.values()){
      const mesh=new KartGL.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;
      mesh.receiveShadow=true;mesh.castShadow=true;mesh.computeBoundingSphere();this.scene.add(mesh);
    }this.batches.clear();
  },
  ribbon(C,left,right,height,material,skip=null,colorFn=null){
    const T=KartGL,ps=[],uv=[],colors=[],idx=[],count=C.samples.length;
    for(let i=0;i<count;i++){
      const s=i*C.step,p=C.sample(s),q=C.sample(s+C.step);if(skip&&skip(p,s))continue;
      const a=typeof left==='function'?left(s,p):left,b=typeof right==='function'?right(s,p):right;
      const a1=typeof left==='function'?left(s+C.step,q):left,b1=typeof right==='function'?right(s+C.step,q):right;
      const verts=[[s,a],[s,b],[s+C.step,a1],[s+C.step,b1]],start=ps.length/3;
      for(let j=0;j<4;j++){
        const [ss,x]=verts[j],P=C.world(ss,x,typeof height==='function'?height(ss,x):height);ps.push(P.x,P.y,P.z);uv.push(j%2,ss/16);
        if(colorFn){const col=new T.Color(colorFn(ss,x));colors.push(col.r,col.g,col.b);}
      }idx.push(start,start+2,start+1,start+2,start+3,start+1);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    if(colorFn)geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,material);mesh.receiveShadow=true;this.scene.add(mesh);return mesh;
  },
  canvasTexture(draw,size=256){const cv=mkCanvas(size,size),c=cv.getContext('2d');draw(c,size);const t=new KartGL.CanvasTexture(cv);t.colorSpace=KartGL.SRGBColorSpace;return t;},
  track(C){
    const T=KartGL,info=C.info,neon=info.theme==='neon';
    const asphalt=KartWorld.texture('asphalt');
    asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
    const road=new T.MeshStandardMaterial({color:neon?'#75818d':'#8b8e8d',map:asphalt,bumpMap:asphalt,bumpScale:.016,roughness:neon?.43:.96,metalness:neon?.22:.03});road.name='race-asphalt';
    const terrain=KartWorld.material(info.theme==='canyon'?'earth':'grass','#a0ac8b',true),curb=new T.MeshStandardMaterial({vertexColors:true,roughness:.86});
    this.ribbon(C,-1,1,.03,road);
    const land=(s,x)=>{const noise=Math.sin(s*.007+x*.42)*Math.sin(s*.017-x*.4);return -Math.max(0,Math.abs(x)-1.6)*2+noise*Math.max(0,Math.abs(x)-1.8)*2.3;};
    for(const side of [-1,1]){
      if(info.theme==='town'){this.ribbon(C,side>0?1.14:-1.55,side>0?1.55:-1.14,.12,KartWorld.material('plaster','#bfbbae'),p=>p.zone==='bridge');}
      const grid=[1.08,1.5,2.4];
      for(let j=0;j<grid.length-1;j++)this.ribbon(C,side>0?grid[j]:-grid[j+1],side>0?grid[j+1]:-grid[j],land,terrain,(p)=>p.zone==='bridge',
        (s,x)=>shade(info.ground,Math.sin(s*.015+x*.8)*.08-(j>2?.06:0)));
      this.ribbon(C,side>0?1: -1.105,side>0?1.105:-1,.055,curb,null,s=>Math.floor(s/5)%2?(neon?'#7bf1e8':'#f1eadb'):info.edge);
      this.ribbon(C,side>0?.965:-.982,side>0?.982:-.965,.07,KartModels.mat('#fbf2d7',0,.85));
      this.ribbon(C,side>0?1.11:-1.135,side>0?1.135:-1.11,1.08,KartModels.mat(neon?'#7af6ec':'#a4b3b6',.4,.45,neon?'#1d7a87':null),p=>info.theme==='town'&&p.zone!=='bridge');
      for(let s=0;s<C.length;s+=24){const p=C.sample(s);if(info.theme==='town'&&p.zone!=='bridge')continue;const w=C.world(s,side*1.12,.52);this.instance('box',neon?'#36556f':'#7b8c97',[w.x,w.y,w.z],[.16,1.1,.16],null,.5);}
    }
    for(const lane of [-.34,.34])this.ribbon(C,lane-.009,lane+.009,.065,KartModels.mat(neon?'#8eb5c2':'#d7cdb2',0,.9),(_,s)=>Math.floor(s/9)%3!==0);
    // Start/finish chequerboard consists of actual road decals.
    for(let row=0;row<3;row++)for(let col=0;col<16;col++){
      const s=row*2.1,p=C.world(s,-1+(col+.5)/8,.085),a=C.sample(s);
      this.instance('box',(row+col)%2?'#17212c':'#f9efda',[p.x,p.y,p.z],[a.width/8,.025,2.05],[0,Math.atan2(a.tx,a.tz),0]);
    }
    const a=C.sample(0),heading=Math.atan2(a.tx,a.tz),left=C.world(0,-1.16,5.5),right=C.world(0,1.16,5.5);
    for(const w of [left,right])this.instance('box','#e6e0cf',[w.x,w.y,w.z],[.65,11,.65],[0,heading,0],.4);
    const center=C.world(0,0,10.5);this.instance('box','#122b41',[center.x,center.y,center.z],[a.width*2.42,2.3,.55],[0,heading,0],.3);
    const banner=this.canvasTexture((c,n)=>{c.fillStyle='#132b40';c.fillRect(0,0,n,n);c.fillStyle='#fff0c0';c.textAlign='center';c.font='bold 25px sans-serif';c.fillText('ESMASH KART',128,117);c.font='bold 15px sans-serif';c.fillText('START / FINISH',128,148);});
    const sign=new T.Mesh(new T.PlaneGeometry(a.width*2.2,2.05),new T.MeshBasicMaterial({map:banner,side:T.DoubleSide}));sign.position.set(center.x,center.y,center.z-.3);sign.rotation.y=heading+Math.PI;this.scene.add(sign);
    for(const b of C.boosts){const w=C.world(b.s,b.x,.1),p=C.sample(b.s);this.instance('box','#35d9cb',[w.x,w.y,w.z],[p.width*.6,.08,14],[0,Math.atan2(p.tx,p.tz),0],.4,.25,'#168e8d');
      for(let i=-1;i<2;i++){const q=C.world(b.s+i*3,b.x,.16);this.instance('box','#f8ffd7',[q.x,q.y,q.z],[p.width*.43,.025,.35],[0,Math.atan2(p.tx,p.tz),0],0,.5,'#9ee1a4');}}
    for(const ramp of C.ramps||[]){const p=C.sample(ramp.s),w=C.world(ramp.s,ramp.x,.6);this.instance('box','#d6b25c',[w.x,w.y,w.z],[p.width*.55,.3,11],[-.13,Math.atan2(p.tx,p.tz),0],.3);
      for(let i=0;i<3;i++){const v=C.world(ramp.s-4+i*2,ramp.x,.3+i*.27);this.instance('box','#ffe8a5',[v.x,v.y,v.z],[p.width*.5,.09,.25],[0,Math.atan2(p.tx,p.tz),0]);}}
    const floor=new T.Mesh(new T.PlaneGeometry(12000,12000),KartModels.mat(info.theme==='canyon'?'#4e342f':info.theme==='neon'?'#142b41':'#82a76a',0,1));floor.rotation.x=-Math.PI/2;floor.position.set(1000,-90,0);floor.receiveShadow=true;this.scene.add(floor);
  },
  scenery(C){
    const rng=srand(984+C.info.id.length),theme=C.info.theme,colors=['#e9c190','#d78467','#91b0a5','#d89f91','#a8bfd0'];
    for(let s=30;s<C.length;s+=theme==='town'?42:76){
      const p=C.sample(s),angle=Math.atan2(p.tx,p.tz);if(p.zone==='bridge')continue;
      for(const side of [-1,1]){
        const w=C.world(s,side*(1.85+rng()*.9),-.15),pos=[w.x,w.y,w.z];
        if(theme==='town'){
          if(rng()>.38){
            const width=8+rng()*7,h=7+rng()*9,col=colors[Math.floor(rng()*colors.length)];
            this.instance('box',col,[w.x,w.y+h/2,w.z],[10,h,width],[0,angle,0]);
            this.instance('box','#e6d0ab',[w.x,w.y+h+.35,w.z],[10.8,.6,width+.8],[0,angle,0]);
            const front=C.world(s,side*1.45),facex=(front.x-w.x),facez=(front.z-w.z),fh=Math.hypot(facex,facez),fx=facex/fh,fz=facez/fh;
            for(let row=0;row<Math.floor(h/4);row++)for(let j=-1;j<2;j++){
              const xx=w.x+fx*5.1+p.tx*j*width*.28,zz=w.z+fz*5.1+p.tz*j*width*.28;
              this.instance('box','#f5dfb3',[xx,w.y+2.5+row*3.7,zz],[1.7,2.5,.22],[0,Math.atan2(fx,fz),0]);
              this.instance('box','#344a5b',[xx+fx*.13,w.y+2.5+row*3.7,zz+fz*.13],[1.25,2.05,.08],[0,Math.atan2(fx,fz),0]);
            }
            this.instance('box','#a75142',[w.x,w.y+h+.8,w.z],[10.6,.65,width+.6],[0,angle,0]);
            for(const side of [-1,1])this.instance('box','#9a7054',[w.x+Math.cos(angle)*side*2.6,w.y+h+1.22,w.z-Math.sin(angle)*side*2.6],[5.65,.16,width+1],[0,angle,-side*.26],0,.94);
            this.instance('box','#e7c396',[w.x+fx*5.2,w.y+1.5,w.z+fz*5.2],[2.6,3,.25],[0,Math.atan2(fx,fz),0]);
            this.instance('box','#57483f',[w.x+fx*5.4,w.y+1.45,w.z+fz*5.4],[2.1,2.8,.12],[0,Math.atan2(fx,fz),0]);
            this.instance('cylinder','#c66e51',[w.x+2,w.y+h+1,w.z],[.65,2,.65],null);
            KartWorld.facade(C,s,side,w,h,width,angle);
          }else{
            // Market awnings, posts and produce, shaded by the same sun as the karts.
            this.instance('box','#b88454',[w.x,w.y+1.05,w.z],[6,2.1,3.5],[0,angle,0]);
            this.instance('box','#f4e0b4',[w.x,w.y+4.1,w.z],[6.8,.23,4.4],[0,angle,.08]);
            for(let j=-2;j<=2;j++){const xx=w.x+p.tx*j*1.18,zz=w.z+p.tz*j*1.18;this.instance('box',j%2?'#df5960':'#fff0d3',[xx,w.y+4.18,zz],[1.18,.16,4.45],[0,angle,.08]);}
            for(const j of [-1,1]){const xx=w.x+p.tx*j*2.75,zz=w.z+p.tz*j*2.75;this.instance('cylinder','#80634f',[xx,w.y+2.2,zz],[.09,4.4,.09]);}
            for(let j=0;j<9;j++)this.instance('sphere',j%3?'#8ba84c':'#e96c42',[w.x+(rng()-.5)*4.5,w.y+2.2,w.z+(rng()-.5)*2],[.3,.32,.3]);
          }
          if(Math.floor(s/70)%2===0)this.tree(C.world(s+24,side*1.6),rng);
        }else if(theme==='canyon'){
          if(rng()<.5){
            const h=6+rng()*15;this.instance('rock','#a36e55',[w.x,w.y+h*.35,w.z],[4+rng()*7,h,5+rng()*7],[rng(),rng()*4,rng()*.3]);
            this.instance('rock','#c08b67',[w.x+2,w.y+h*.65,w.z],[5,h*.5,5],[0,rng()*4,.2]);
          }else{
            const h=3+rng()*4;this.instance('cylinder','#4e8268',[w.x,w.y+h*.5,w.z],[.48,h,.48]);
            for(const j of [-1,1]){this.instance('box','#4e8268',[w.x+j*1.05,w.y+h*.5,w.z],[1.8,.55,.55]);this.instance('cylinder','#5d9975',[w.x+j*1.8,w.y+h*.7,w.z],[.35,h*.4,.35]);}
          }
        }else{
          const h=15+rng()*55,width=7+rng()*12;this.instance('box','#344e72',[w.x,w.y+h/2,w.z],[10,h,width],[0,angle,0],.35,.4);
          this.instance('box',s%140?'#59e2e8':'#da8bff',[w.x,w.y+h,w.z],[10.3,.22,width+.3],[0,angle,0],.3,.2,s%140?'#268fa4':'#913ac2');
          for(let row=3;row<h-1;row+=4)for(let j=-1;j<=1;j++){const x=w.x+p.tx*j*width*.25-p.tz*side*5.1,z=w.z+p.tz*j*width*.25+p.tx*side*5.1;
            this.instance('box',(j+row)%3?'#5c8fae':'#c385dc',[x,w.y+row,z],[1.4,1.6,.1],[0,angle+Math.PI/2,0],.2,.3,(j+row)%3?'#1d4767':'#6c2f86');}
        }
      }
    }
    // Landmark silhouettes are meshes, not a painted backdrop.
    const bounds=C.samples.reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minZ:Math.min(b.minZ,p.z),maxZ:Math.max(b.maxZ,p.z)}),{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
    const cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2;
    KartWorld.ridges(C,this.scene,bounds);
    if(theme==='town')for(let s=250;s<C.length;s+=360){
      const tangent=C.sample(s),ang=Math.atan2(tangent.tx,tangent.tz);
      const center=C.world(s,0,7.3);this.instance('box','#c7baa0',[center.x,center.y,center.z],[C.sample(s).width*2.4,.06,.06],[0,ang,0]);
      for(let j=0;j<13;j++){const w=C.world(s,-1.1+j*.18,6.9-Math.sin(j/12*Math.PI)*.45);this.instance('box',['#e86d78','#f5cb6a','#6ec5ad','#a28ac5'][j%4],[w.x,w.y,w.z],[1.45,1.05,.035],[0,ang,Math.sin(j)*.1]);}
    }
    if(theme==='canyon'){
      const x=bounds.maxX+650,z=cz;this.instance('cone','#82584b',[x,170,z],[360,520,360]);this.instance('torus','#fc9a51',[x,420,z],[57,57,57],[Math.PI/2,0,0],0,.6,'#a3421e');
      for(let i=0;i<5;i++)this.instance('sphere','#997b7b',[x+i*24,480+i*45,z],[45+i*14,31+i*8,40+i*14]);
    }
  },
  terrainSurface(C){
    const T=KartGL,ps=C.samples.filter((_,i)=>i%5===0),xs=ps.map(p=>p.x),zs=ps.map(p=>p.z),margin=650;
    const minX=Math.min(...xs)-margin,maxX=Math.max(...xs)+margin,minZ=Math.min(...zs)-margin,maxZ=Math.max(...zs)+margin,n=105,pos=[],color=[],indices=[];
    for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
      const x=lerp(minX,maxX,i/n),z=lerp(minZ,maxZ,j/n);let nearest=ps[0],best=Infinity;
      for(const p of ps){const d=(p.x-x)*(p.x-x)+(p.z-z)*(p.z-z);if(d<best){best=d;nearest=p;}}
      const d=Math.sqrt(best),noise=Math.sin(x*.005)*Math.cos(z*.006)+Math.sin(x*.013+z*.009)*.3;
      let y=nearest.y-2-Math.min(27,Math.max(0,d-nearest.width)*.11)+noise*Math.min(14,d*.045);
      if(nearest.zone==='bridge'&&d<nearest.width*3)y-=24;
      pos.push(x,y,z);const c=new T.Color(shade(C.info.ground,noise*.09-.04));color.push(c.r,c.g,c.b);
      if(i<n&&j<n){const k=j*(n+1)+i;indices.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
    }
    const uv=[];for(let i=0;i<pos.length;i+=3)uv.push(pos[i]/28,pos[i+2]/28);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(color,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,KartWorld.material(C.info.theme==='canyon'?'earth':'grass','#c8c5b5',true));mesh.receiveShadow=true;this.scene.add(mesh);
  },
  tree(w,rng){
    const h=5+rng()*3;this.instance('cylinder','#8d6c4d',[w.x,w.y+h*.5,w.z],[.36,h,.36]);
    for(let i=0;i<4;i++)this.instance('sphere',i%2?'#5e956c':'#488963',[w.x+Math.sin(i*2)*1.5,w.y+h+(i%2)*1.3,w.z+Math.cos(i*2)*1.5],[2.5,2.4,2.6]);
  },
  lighting(scene,theme){
    const T=KartGL,night=theme==='neon';scene.add(new T.HemisphereLight(night?'#92b7ee':'#dbefff',night?'#142332':'#ac8766',night?1.9:1.65));
    const sun=new T.DirectionalLight(night?'#b7d6ff':theme==='canyon'?'#ffd2a3':'#fff2d0',night?2:2.5);sun.position.set(-60,110,-40);
    sun.castShadow=!IS_XBOX;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:.1,far:300});sun.shadow.bias=-.0007;sun.shadow.normalBias=.15;
    scene.add(sun);scene.add(sun.target);return sun;
  },
  sky(scene,info){
    const T=KartGL,geo=new T.SphereGeometry(6500,24,16),mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
      uniforms:{top:{value:new T.Color(info.theme==='town'?'#4c9bc4':info.theme==='canyon'?'#647c9b':'#080e28')},bottom:{value:new T.Color(info.theme==='town'?'#d9e8e5':info.theme==='canyon'?'#edb99c':'#445078')}},
      vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 direction;void main(){float h=normalize(direction).y;gl_FragColor=vec4(mix(bottom,top,smoothstep(-0.02,0.38,h)),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
    const sky=this.skyMesh=new T.Mesh(geo,mat);sky.frustumCulled=false;scene.add(sky);
  },
  build(race){
    const T=KartGL;this.disposeScene();this.race=race;this.scene=new T.Scene();this.scene.environment=this.environment;this.scene.environmentIntensity=.4;this.batches.clear();
    this.scene.fog=new T.FogExp2(race.course.info.theme==='neon'?'#182841':race.course.info.theme==='canyon'?'#b69680':'#aeb9af',.00038);
    this.sky(this.scene,race.course.info);this.sun=this.lighting(this.scene,race.course.info.theme);this.terrainSurface(race.course);this.track(race.course);this.scenery(race.course);this.flush();
    this.camera=new T.PerspectiveCamera(60,W/H,.15,6500);this.cameraPos=null;this.cameraLook=null;this.views=new Map();
    this.drivers=race.racers.map(r=>{const mesh=KartModels.kart(r.id,r.vehicle);this.scene.add(mesh);return mesh;});
    this.boxes=race.course.boxes.map(b=>{
      const root=new T.Group(),shell=new T.Mesh(new T.BoxGeometry(1.8,1.8,1.8),new T.MeshStandardMaterial({color:'#91ffff',emissive:'#2596a3',emissiveIntensity:.7,metalness:.25,roughness:.18,transparent:true,opacity:.82}));root.add(shell);
      const texture=this.canvasTexture((c,n)=>{c.fillStyle='#ffffff';c.textAlign='center';c.textBaseline='middle';c.font='bold 210px sans-serif';c.fillText('?',128,132);});
      const face=new T.Mesh(new T.PlaneGeometry(1.3,1.3),new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide}));face.position.z=-.92;root.add(face);this.scene.add(root);return root;
    });
    this.hazards=race.course.hazards.map(h=>{const root=new T.Group(),b=KartModels.batch();
      if(h.type==='rock')b.add('rock','#9c806b',[0,1,0],[1.7,1.5,1.5],[.2,.3,.1]);
      else{b.add('box',h.type==='crate'?'#ba8a56':'#d9687b',[0,.95,0],[2.1,1.9,2.1]);for(const j of [-1,1])b.add('box','#efcb8a',[0,.95,0],[2.2,.16,2.15],[0,0,j*.65]);}
      b.finish(root);this.scene.add(root);return root;
    });
    this.coins=(race.course.coins||[]).map(()=>{const m=new T.Mesh(new T.TorusGeometry(.6,.17,8,16),KartModels.mat('#ffd46e',.7,.25,'#6b4110'));this.scene.add(m);return m;});
    this.itemMeshes=new Map();this.effectMeshes=new Map();this.seenEffects=new WeakSet();this.makeParticles();this.makeMarks();this.renderer.compile(this.scene,this.camera);
  },
  makeParticles(){
    const T=KartGL,geo=new T.BufferGeometry(),n=360;this.particleData=Array.from({length:n},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,color:[1,1,1]}));
    geo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(n*3),3));geo.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(n*3),3));
    this.particleTexture=this.canvasTexture((c,n)=>{const g=c.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,n,n);},32);
    this.particles=new T.Points(geo,new T.PointsMaterial({size:.45,map:this.particleTexture,transparent:true,vertexColors:true,depthWrite:false,blending:T.AdditiveBlending}));this.particles.frustumCulled=false;this.scene.add(this.particles);this.particleAt=0;this.particleTick=-1;
  },
  makeMarks(){
    const T=KartGL,geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(720*18),3));geo.setDrawRange(0,0);
    this.marks=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#0e1722',transparent:true,opacity:.4,side:T.DoubleSide,depthWrite:false}));this.marks.frustumCulled=false;this.scene.add(this.marks);this.markAt=0;this.markCount=0;this.lastMarks=new Map();
  },
  particle(p,color,vx,vy,vz){const q=this.particleData[this.particleAt++%this.particleData.length];Object.assign(q,{x:p.x,y:p.y,z:p.z,vx,vy,vz,life:.4,color});},
  marksFor(r,mesh){
    if(!r.drift||r.height>.15){this.lastMarks.delete(r.index);return;}
    const C=this.race.course,points=[C.world(r.s-1.2,r.x-.075,.09),C.world(r.s-1.2,r.x+.075,.09)],prev=this.lastMarks.get(r.index);
    if(prev){const a=this.marks.geometry.attributes.position.array;
      points.forEach((q,i)=>{const p=prev[i],dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);if(len<.05)return;const nx=-dz/len*.1,nz=dx/len*.1,start=(this.markAt++%720)*18;
        a.set([p.x+nx,p.y,p.z+nz,p.x-nx,p.y,p.z-nz,q.x+nx,q.y,q.z+nz,q.x+nx,q.y,q.z+nz,p.x-nx,p.y,p.z-nz,q.x-nx,q.y,q.z-nz],start);this.markCount=Math.min(720,this.markCount+1);});
      this.marks.geometry.attributes.position.needsUpdate=true;this.marks.geometry.setDrawRange(0,this.markCount*6);
    }this.lastMarks.set(r.index,points);
  },
  itemModel(type){
    const T=KartGL,root=new T.Group(),b=KartModels.batch(),col=KART_ITEMS[type]?.color||'#e2bcf0';
    if(type==='chile'||type==='triple'){
      b.add('sphere','#ef5960',[0,0,0],[.38,.37,1.1]);b.add('cone','#ffd488',[0,0,-1.2],[.28,.7,.28],[-Math.PI/2,0,0]);b.add('cone','#66ac6d',[0,.12,.9],[.18,.5,.18],[Math.PI/2,0,.4]);
    }else if(type==='boomerang'){
      b.add('box',col,[-.4,0,0],[.32,.15,1.4],[0,.55,0]);b.add('box',col,[.4,0,0],[.32,.15,1.4],[0,-.55,0]);
    }else if(type==='tortilla'){
      b.add('cylinder',col,[0,0,0],[1.1,.13,.85]);for(let i=0;i<8;i++)b.add('sphere','#c29357',[Math.sin(i*2)*.7,.08,Math.cos(i*2)*.5],[.07,.03,.07]);
    }else if(type==='salsa')b.add('sphere','#de4f3c',[0,0,0],[2.3,.07,1.7]);
    else if(type==='pinata'){b.add('octa',col,[0,.7,0],[1,1.3,1]);for(let i=0;i<5;i++)b.add('cone',i%2?'#83e5da':'#f7cb6e',[Math.cos(i*TAU/5),.7+Math.sin(i*TAU/5),0],[.25,1,.25],[0,0,-i*TAU/5+Math.PI/2]);}
    else b.add('octa',col,[0,.5,0],[.75,1,.75]);
    b.finish(root,false);return root;
  },
  animate(race,alpha){
    const T=KartGL,C=race.course,p=race.player,s=lerp(p.ps,p.s,alpha),x=lerp(p.px,p.x,alpha),tick=race.tick!==this.particleTick;
    for(let i=0;i<race.racers.length;i++){
      const r=race.racers[i],m=this.drivers[i],ss=lerp(r.ps,r.s,alpha),xx=lerp(r.px,r.x,alpha),w=C.world(ss,xx,r.height||0),q=C.sample(ss),angle=Math.atan2(q.tx,q.tz)+(r.yaw||r.steer*.035);
      m.position.set(w.x,w.y+.05+(r.rescue?Math.sin(Math.min(1,r.rescue)*Math.PI)*2:0),w.z);m.rotation.y=angle;
      m.userData.body.rotation.z=m.userData.bike?clamp(-r.steer*r.v/170,-.48,.48):clamp(-r.lat*.045,-.14,.14);m.userData.body.position.y=Math.sin(r.s*.25)*Math.min(.022,r.v*.0003);
      if(r.trick)m.userData.body.rotation.x=-clamp(((r.airTime||0)-(r.trickAt||0))/.6,0,1)*TAU;
      else m.userData.body.rotation.x=0;
      m.userData.head.rotation.z=r.drift?-.08*r.driftDir:0;
      for(const wheel of m.userData.wheels){wheel.spin.rotation.x=r.s/.44;if(wheel.front)wheel.pivot.rotation.y=r.steer*.35;}
      m.userData.shield.visible=r.shield>0||r.star>0;m.userData.shield.material.color.set(r.star>0?'#ffdc82':'#82f6ff');m.userData.shield.rotation.y=race.time*.5;
      m.visible=!(r.invuln&&Math.floor(race.time*15)%2&&!r.star);
      if(tick){this.marksFor(r,m);if(r.drift||r.turbo){const col=r.turbo?[.2,.8,1]:r.charge>2?[.9,.35,1]:r.charge>1.3?[1,.55,.1]:[.2,.7,1];
        for(const side of [-1,1]){const w=C.world(r.s-1.2,r.x+side*.08,.28);this.particle(w,col,(Math.sin(race.tick)*2),1.5,-q.tz*3);}}
      }
    }
    race.course.boxes.forEach((b,i)=>{const m=this.boxes[i],w=C.world(b.s,b.x,1.5+Math.sin(race.time*3+i)*.25);m.position.set(w.x,w.y,w.z);m.rotation.set(.1,race.time*.7+i,.12);m.visible=b.ready<=race.time;});
    race.course.hazards.forEach((h,i)=>{const w=C.world(h.s,C.hazardX(h,race.time));this.hazards[i].position.set(w.x,w.y,w.z);if(h.moving)this.hazards[i].rotation.z=race.time*.9;});
    (C.coins||[]).forEach((c,i)=>{const m=this.coins[i],w=C.world(c.s,c.x,1.1+Math.sin(race.time*3+i)*.12);m.position.set(w.x,w.y,w.z);m.rotation.y=race.time*2;m.visible=(c.ready||0)<=race.time;});
    const live=new Set();for(const projectile of race.projectiles){live.add(projectile);let mesh=this.itemMeshes.get(projectile);if(!mesh){mesh=this.itemModel(projectile.type);this.itemMeshes.set(projectile,mesh);this.scene.add(mesh);}
      const w=C.world(lerp(projectile.ps,projectile.s,alpha),projectile.x,projectile.type==='salsa'?.1:1.1);mesh.position.set(w.x,w.y,w.z);const q=C.sample(projectile.s);mesh.rotation.y=Math.atan2(q.tx,q.tz)+(projectile.dir<0?Math.PI:0);if(projectile.type==='tortilla'||projectile.type==='pinata')mesh.rotation.y+=race.time*6;}
    for(const [q,m] of this.itemMeshes)if(!live.has(q)){this.scene.remove(m);m.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.itemMeshes.delete(q);}
    const activeEffects=new Set();
    for(const e of race.effects){
      if(e.type==='flame')continue;activeEffects.add(e);let fx=this.effectMeshes.get(e);
      if(!fx){fx=new T.Group();
        if(e.type==='lightning'){
          const b=KartModels.batch();for(let i=0;i<6;i++)KartModels.link(b,[(i%2?-.3:.3),i*1.7,0],[(i%2?.3:-.3),(i+1)*1.7,0],.09,'#fff4b0');b.finish(fx,false);
        }else{
          const ball=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({color:e.color||'#ffbd67',transparent:true,opacity:.6,depthWrite:false}));fx.add(ball);
        }this.scene.add(fx);this.effectMeshes.set(e,fx);
      }
      const w=C.world(e.s,e.x,.5);fx.position.set(w.x,w.y,w.z);const progress=1-e.life/e.max;fx.scale.setScalar(e.type==='lightning'?1:1+progress*3.5);
      if(!this.seenEffects.has(e)){this.seenEffects.add(e);for(let i=0;i<18;i++)this.particle(w,[1,.65,.2],Math.sin(i*2.4)*4,2+i%5,Math.cos(i*2.4)*4);}
    }
    for(const [e,m] of this.effectMeshes)if(!activeEffects.has(e)){this.scene.remove(m);m.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Array.from(KartModels.materials.values()).includes(o.material))o.material.dispose();});this.effectMeshes.delete(e);}
    if(tick){const pos=this.particles.geometry.attributes.position,col=this.particles.geometry.attributes.color;
      this.particleData.forEach((q,i)=>{q.life-=1/60;q.x+=q.vx/60;q.y+=q.vy/60;q.z+=q.vz/60;q.vy-=4/60;pos.setXYZ(i,q.life>0?q.x:0,q.life>0?q.y:-200,q.z);col.setXYZ(i,...q.color.map(c=>c*Math.max(0,q.life/.4)));});pos.needsUpdate=col.needsUpdate=true;this.particleTick=race.tick;
    }
    this.followCamera(race,p,alpha,this);
    const w=C.world(s,x);this.sun.position.set(w.x-65,w.y+110,w.z-50);this.sun.target.position.set(w.x,w.y,w.z);this.sun.target.updateMatrixWorld();
    this.renderer.shadowMap.enabled=!IS_XBOX&&!ART.lite&&Prefs.fx==='full';this.renderer.toneMappingExposure=C.info.theme==='neon'?1.18:1.12;
  },
  followCamera(race,p,alpha,view){
    const T=KartGL,C=race.course,s=lerp(p.ps,p.s,alpha),x=lerp(p.px,p.x,alpha);
    const behind=C.world(s-(8.6+p.v*.008),x*.85,4.7+(p.height||0)*.25),look=C.world(s+17+p.v*.04,x*.55,1.7+(p.height||0)*.35);
    const target=new T.Vector3(behind.x,behind.y,behind.z),aim=new T.Vector3(look.x,look.y,look.z);
    if(!view.cameraPos||Math.abs(s-(view.cameraS||0))>100){view.cameraPos=target;view.cameraLook=aim;}else{view.cameraPos.lerp(target,reducedMotion?.8:.36);view.cameraLook.lerp(aim,.4);}
    view.cameraS=s;view.camera.position.copy(view.cameraPos);view.camera.lookAt(view.cameraLook);
    this.skyMesh.position.copy(view.cameraPos);
    const fov=58+Math.min(5,p.v/30)+(p.turbo&&!reducedMotion?4:0);if(Math.abs(view.camera.fov-fov)>.05){view.camera.fov=lerp(view.camera.fov,fov,.15);view.camera.updateProjectionMatrix();}
  },
  draw(race,alpha){
    if(!this.init()){
      ctx.fillStyle='#0c1829';ctx.fillRect(0,0,W,H);sfText('EL MODO 3D NECESITA WEBGL',640,270,52,GOLD);
      wrapText('Abre el juego en Chrome, Edge o Safari con aceleración gráfica. Esc: volver al menú.',640,350,850,21,32,PAPER);if(keyEdge('kb1','Escape'))KartMenu.exit();return;
    }
    if(this.race!==race)this.build(race);this.syncSize();this.animate(race,alpha);
    const players=race.online?race.racers.filter(r=>r.human).sort((a,b)=>(b===race.player?1:0)-(a===race.player?1:0)):[race.player],rects=KartRender.viewports(players.length),renderer=this.renderer;
    this.lastViewports=rects;
    if(players.length===1&&!race.online){renderer.setScissorTest(false);renderer.setViewport(0,0,renderer.domElement.width,renderer.domElement.height);renderer.render(this.scene,this.camera);KartRender.hud(race);return;}
    const k=renderer.domElement.width/W;renderer.setScissorTest(true);
    // One world and one GL context; only cameras and viewports multiply.
    renderer.shadowMap.enabled=false;
    players.forEach((p,i)=>{const b=rects[i];let v=this.views.get(p.index);if(!v){v={camera:this.camera.clone()};this.views.set(p.index,v);}
      this.followCamera(race,p,alpha,v);v.camera.aspect=b.w/b.h;v.camera.updateProjectionMatrix();
      const left=Math.round(b.x*k),bottom=Math.round((H-b.y-b.h)*k),right=Math.round((b.x+b.w)*k),top=Math.round((H-b.y)*k);
      renderer.setViewport(left,bottom,right-left,top-bottom);renderer.setScissor(left,bottom,right-left,top-bottom);renderer.render(this.scene,v.camera);
      KartRender.splitHud(race,p,b);
    });
    renderer.setScissorTest(false);renderer.setViewport(0,0,renderer.domElement.width,renderer.domElement.height);
  },
  thumbnail(id,vehicle=0){
    const key=id+':'+kartVehicleIndex(vehicle);if(this.thumbs.has(key))return this.thumbs.get(key);if(!this.init())return null;
    const T=KartGL,scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,50),kart=KartModels.kart(id,vehicle);scene.environment=this.environment;scene.environmentIntensity=.55;scene.add(kart);this.lighting(scene,'town');
    const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:'#263d52',roughness:.7}));floor.rotation.x=-Math.PI/2;floor.position.y=-.01;floor.visible=false;scene.add(floor);
    camera.position.set(4.7,3.3,-6.7);camera.lookAt(0,1,0);this.renderer.setSize(360,360,false);this.renderer.setClearColor('#000000',0);this.renderer.render(scene,camera);
    const img=mkCanvas(360,360);img.getContext('2d').drawImage(this.renderer.domElement,0,0);const result={img};this.thumbs.set(key,result);if(this.thumbs.size>24)this.thumbs.delete(this.thumbs.keys().next().value);
    const gs=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);});gs.forEach(g=>g.dispose());floor.material.dispose();kart.userData.shield.material.dispose();this.renderer.setClearColor('#000000',0);return result;
  },
};
