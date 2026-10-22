'use strict';
// All racing art is geometry. Faces belong to the front of the head; the chase
// camera sees hair, helmets, horns and hats from behind, never a photo billboard.
const KartModels = {
  geometry:new Map(), materials:new Map(),
  geo(type) {
    if(!this.geometry.has(type)) {
      const T=KartGL;
      const g=type==='box'?new T.BoxGeometry(1,1,1):type==='plane'?new T.PlaneGeometry(1,1):type==='bud'?new T.SphereGeometry(1,6,4):type==='sphere'?new T.SphereGeometry(1,18,12):
        type==='cylinder'?new T.CylinderGeometry(1,1,1,18):type==='cone'?new T.ConeGeometry(1,1,14):
        type==='torus'?new T.TorusGeometry(1,.12,8,28):type==='leaf'?new T.SphereGeometry(1,8,6):type==='branch'?new T.CylinderGeometry(.75,1,1,7):type==='hill'?new T.DodecahedronGeometry(1,1):type==='rock'?new T.DodecahedronGeometry(1,0):new T.OctahedronGeometry(1,0);
      this.geometry.set(type,g);
    }
    return this.geometry.get(type);
  },
  mat(color,metal=0,rough=.65,emissive=null) {
    const key=[color,metal,rough,emissive].join(':');
    if(!this.materials.has(key))this.materials.set(key,new KartGL.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:emissive||'#000000',emissiveIntensity:emissive?1.1:0}));
    return this.materials.get(key);
  },
  matrix(pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]) {
    const T=KartGL;
    pos=pos||[0,0,0];scale=scale||[1,1,1];rot=rot||[0,0,0];
    return new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(...scale));
  },
  batch() {
    const bins=new Map(),M=this;
    return {
      add(type,col,pos,scale,rot,metal=0,rough=.65,emit=null) {
        const mat=col&&col.isMaterial?col:M.mat(col,metal,rough,emit),g=M.geo(type).clone().applyMatrix4(M.matrix(pos,scale,rot));
        if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(g);
      },
      finish(parent,cast=true) {
        for(const [mat,gs0] of bins){
          // las cajas redondeadas no traen índice: si se mezclan, todo se fusiona sin índice
          const mixed=gs0.some(g=>!g.index)&&gs0.some(g=>g.index),gs=mixed?gs0.map(g=>{if(!g.index)return g;const n=g.toNonIndexed();g.dispose();return n;}):gs0;
          gs.forEach(g=>g.clearGroups());
          const g=KartGL.mergeGeometries(gs,false),mesh=new KartGL.Mesh(g,mat);gs.forEach(g=>g.dispose());mesh.castShadow=cast;mesh.receiveShadow=true;parent.add(mesh);}
        bins.clear();
      },
    };
  },
  link(batch,a,b,radius,color,metal=0) {
    const T=KartGL,va=new T.Vector3(...a),vb=new T.Vector3(...b),dir=vb.clone().sub(va),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize());
    const rot=new T.Euler().setFromQuaternion(q);
    batch.add('cylinder',color,va.add(vb).multiplyScalar(.5).toArray(),[radius,dir.length(),radius],[rot.x,rot.y,rot.z],metal);
  },
  // ---------- piezas redondeadas (antes todo eran cajas) ----------
  // Llanta: perfil torneado con hombros redondos y banda plana; el eje es Y (se gira a X al montarla)
  shapes(){
    const T=KartGL,G=this.geometry;if(G.has('tire'))return;
    const lathe=(pts,n=32)=>new T.LatheGeometry(pts.map(([x,y])=>new T.Vector2(x,y)),n);
    G.set('rbox',new T.RoundedBoxGeometry(1,1,1,3,.22));
    G.set('rbox-s',new T.RoundedBoxGeometry(1,1,1,2,.09));
    G.set('capsule',new T.CapsuleGeometry(.5,1,6,18));
    G.set('tire',lathe([[.6,-.5],[.86,-.5],[.95,-.47],[1,-.38],[1.01,0],[1,.38],[.95,.47],[.86,.5],[.6,.5]],34));
    G.set('rim',new T.CylinderGeometry(1,1,1,24));
    G.set('disc',new T.CylinderGeometry(1,1,1,32));
    // cono de nariz / carenado: bala con punta redonda (eje Y, la punta hacia +Y)
    G.set('nose',lathe([[0,1],[.18,.97],[.36,.88],[.55,.7],[.74,.42],[.88,.1],[.97,-.3],[1,-.7],[1,-1],[0,-1]],28));
    // gota: pontones laterales, tanque de moto
    G.set('drop',lathe([[0,1],[.3,.92],[.62,.68],[.9,.3],[1,-.1],[.92,-.5],[.66,-.84],[.32,-.98],[0,-1]],24));
    G.set('arch',new T.TorusGeometry(1,.16,10,26,Math.PI));
    G.set('ring',new T.TorusGeometry(1,.06,8,32));
  },
  // pintura de auto: capa de barniz que refleja el cielo
  paint(color,metal=.3){
    const key='paint:'+color+':'+metal;
    if(!this.materials.has(key))this.materials.set(key,new KartGL.MeshPhysicalMaterial({color,metalness:metal,roughness:.4,clearcoat:.65,clearcoatRoughness:.22}));
    return this.materials.get(key);
  },
  glass(){
    if(!this.materials.has('glass'))this.materials.set('glass',new KartGL.MeshPhysicalMaterial({color:'#bfe3f3',metalness:.1,roughness:.04,transparent:true,opacity:.38,clearcoat:1,depthWrite:false}));
    return this.materials.get('glass');
  },
  // hule con dibujo: la banda tiene surcos en V; los costados, letras en relieve suaves
  rubber(knobby=false){
    const key='rubber:'+knobby;if(this.materials.has(key))return this.materials.get(key);
    const T=KartGL,cv=mkCanvas(512,64),c=cv.getContext('2d');
    c.fillStyle='#1b1e22';c.fillRect(0,0,512,64);
    c.fillStyle='#2b3036';c.fillRect(0,0,512,10);c.fillRect(0,54,512,10); // hombros
    c.strokeStyle='#0c0e10';c.lineWidth=knobby?7:4;
    for(let x=0;x<512;x+=knobby?24:16){c.beginPath();if(knobby){c.rect(x+3,16,12,14);c.rect(x+11,34,12,14);}else{c.moveTo(x,14);c.lineTo(x+8,32);c.lineTo(x,50);}c.stroke();}
    const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;
    const m=new T.MeshStandardMaterial({color:'#ffffff',map:tex,bumpMap:tex,bumpScale:knobby?.06:.03,roughness:.92,metalness:0});
    this.materials.set(key,m);return m;
  },
  // calcomanía del costado: número y la inicial del piloto en su color
  decal(id,number){
    const key='decal:'+id+':'+number;if(this.materials.has(key))return this.materials.get(key);
    const T=KartGL,L=LOOKS[id]||{},cv=mkCanvas(256,256),c=cv.getContext('2d');
    c.beginPath();c.arc(128,128,118,0,TAU);c.fillStyle='#f8f4ea';c.fill();c.lineWidth=14;c.strokeStyle=L.top2||'#1b2430';c.stroke();
    c.fillStyle=L.top2||'#1b2430';c.textAlign='center';c.textBaseline='middle';c.font=`700 150px ${FONT_DISPLAY}`;c.fillText(String(number),128,138);
    const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
    const m=new T.MeshStandardMaterial({map:tex,transparent:true,roughness:.4,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    this.materials.set(key,m);return m;
  },
  // ---------- carrocerías ----------
  chassis(b,V,col,ctx){
    const {paint,paint2,dark,carbon,chrome,red,glass,bike}=ctx;
    if(bike){
      const trail=V.kind==='trailbike';
      // cuadro y basculante
      this.link(b,[0,.68,-.95],[0,1.05,.25],.09,carbon,.5);this.link(b,[0,.66,.25],[0,1.18,.62],.1,carbon,.5);
      for(const s of [-1,1])this.link(b,[s*.17,.62,-1.18],[s*.14,.78,-.1],.06,chrome,.9);
      // motor con aletas y escape cromado que sale por debajo
      b.add('rbox',chrome,[0,.72,.02],[.42,.38,.56],null,.85,.25);
      for(let i=0;i<4;i++)b.add('rbox-s',carbon,[0,.62+i*.07,.05],[.5,.03,.5]);
      this.link(b,[.16,.6,.2],[.24,.66,-.9],.075,chrome,.9);b.add('capsule',chrome,[.25,.7,-1.05],[.17,.2,.17],[Math.PI/2,0,0],.9,.2);
      if(trail){
        // moto de campo: tanque angosto, asiento largo, salpicaderas altas y placa con número
        b.add('drop',paint,[0,1.14,.32],[.26,.42,.3],[Math.PI/2.3,0,0]);
        b.add('rbox',carbon,[0,1.13,-.45],[.3,.11,1.05],[-.04,0,0]);
        b.add('rbox',paint,[0,1.12,-1.1],[.28,.08,.55],[-.22,0,0]);
        b.add('rbox',paint2,[0,1.18,1.2],[.24,.05,.62],[.32,0,0]);
        b.add('rbox','#f6f2e4',[0,1.42,.98],[.42,.36,.06],[-.22,0,0]);
      }else{
        // deportiva: carenado de bala, burbuja de parabrisas, colín afilado
        b.add('nose',paint,[0,.98,.82],[.36,.62,.34],[Math.PI/2,0,0]);
        b.add('drop',paint,[0,1.14,.2],[.32,.5,.3],[Math.PI/2.2,0,0]);
        b.add('rbox',carbon,[0,1.14,-.48],[.32,.1,.75],[-.06,0,0]);
        b.add('nose',paint,[0,1.12,-1.02],[.2,.45,.14],[-Math.PI/2.4,0,0]);
        b.add('drop',glass,[0,1.44,.86],[.26,.28,.1],[.5,0,0]);
        b.add('rbox-s','#fff5d6',[0,1.06,1.4],[.22,.1,.05],null,0,.2,'#f0e2b0'); // faro
      }
      b.add('rbox-s',red,[0,1.08,-1.36],[.2,.07,.04],null,0,.2,'#ff3b2f'); // calavera
      // horquilla, manubrio y puños
      for(const s of [-1,1]){this.link(b,[s*.12,.62,1.18],[s*.11,1.42,.9],.055,chrome,.9);b.add('capsule',dark,[s*.5,1.47,.88],[.08,.12,.08],[0,0,Math.PI/2]);}
      this.link(b,[-.46,1.47,.88],[.46,1.47,.88],.035,chrome,.9);
      for(const f of [-1,1])b.add('arch',paint2,[0,.6,f*1.18],[.62,.62,.28],[0,Math.PI/2,0]);
      return;
    }
    const kart=V.kind==='kart',formula=V.kind==='formula',rally=V.kind==='buggy',coupe=V.kind==='coupe';
    // piso: placa de carbón con orillas redondas
    b.add('rbox',carbon,[0,.42,0],[1.62,.18,2.9],null,.35,.5);
    if(kart){
      // kart de competencia: nariz ancha, pontones en gota con calcomanía, motor al costado
      b.add('rbox',paint,[0,.66,1.18],[1.34,.36,.98],[.16,0,0]);
      b.add('rbox',paint2,[0,.86,1.12],[.3,.06,.86],[.16,0,0]);
      b.add('capsule',dark,[0,.5,1.68],[.28,.95,.28],[0,0,Math.PI/2]);  // defensa delantera
      for(const s of [-1,1]){
        b.add('drop',paint,[s*.8,.66,-.15],[.27,1.02,.28],[Math.PI/2,0,0]);
        b.add('capsule',dark,[s*.98,.5,0],[.16,.95,.16],[Math.PI/2,0,0]);   // tubo lateral
      }
      b.add('capsule',dark,[0,.5,-1.62],[.24,.9,.24],[0,0,Math.PI/2]);   // defensa trasera
      // motor y escape
      b.add('rbox',dark,[.42,.78,-1.12],[.56,.5,.5],null,.5,.4);
      b.add('rbox-s',chrome,[.42,1.06,-1.12],[.44,.08,.4],null,.9,.2);
      for(let i=0;i<4;i++)b.add('rbox-s',chrome,[.42,.72+i*.08,-1.38],[.42,.03,.06],null,.9,.25);
      this.link(b,[.6,.7,-1.2],[.62,.64,-1.72],.07,chrome,.9);
      // spoiler chiquito: la silueta se reconoce desde la cámara de atrás
      b.add('rbox',paint,[0,1.24,-1.42],[1.75,.08,.38],[-.12,0,0]);
      for(const s of [-1,1])b.add('rbox-s',paint2,[s*.88,1.12,-1.42],[.06,.32,.42]);
      for(const s of [-1,1])this.link(b,[s*.4,.8,-1.3],[s*.4,1.2,-1.42],.035,chrome,.9);
    }else if(formula){
      // fórmula: nariz de bala, alerón delantero ancho, pontones y alerón trasero grande
      b.add('nose',paint,[0,.62,1.3],[.42,.95,.3],[Math.PI/2,0,0]);
      b.add('rbox',paint2,[0,.4,1.88],[2.2,.06,.42],null);
      for(const s of [-1,1])b.add('rbox-s',paint,[s*1.1,.5,1.86],[.06,.24,.5]);
      for(const s of [-1,1])b.add('drop',paint,[s*.62,.66,-.25],[.36,.95,.3],[Math.PI/2,0,0]);
      b.add('rbox',paint,[0,.86,-.95],[.55,.55,1.2],null);                // tapa del motor
      b.add('rbox-s',paint2,[0,1.16,-1.05],[.05,.4,1.1]);                  // aleta
      b.add('rbox',paint,[0,1.58,-1.42],[2.4,.1,.5],[-.08,0,0]);
      b.add('rbox',paint2,[0,1.46,-1.46],[2.36,.06,.32],[-.12,0,0]);
      for(const s of [-1,1]){b.add('rbox-s',dark,[s*1.2,1.4,-1.42],[.06,.52,.6]);this.link(b,[s*.25,.95,-1.2],[s*.32,1.55,-1.4],.04,chrome,.9);}
      for(const s of [-1,1])for(const z of [-.75,.75])this.link(b,[s*.32,.55,z*.85],[s*1.02,.5,z*1.32],.045,chrome,.9); // suspensión
      b.add('capsule',chrome,[0,.62,-1.72],[.16,.3,.16],[Math.PI/2,0,0],.9,.2);
    }else if(rally){
      // 4×4: tina redonda, jaula de tubos, barra de luces, llanta de refacción atrás
      b.add('rbox',paint,[0,.82,.1],[1.7,.62,2.6],null);
      b.add('rbox',paint2,[0,1.06,.95],[1.5,.12,.9],[.08,0,0]);
      b.add('rbox-s',dark,[0,.35,1.52],[1.6,.18,.4],null,.4);           // protector
      for(const s of [-1,1]){
        this.link(b,[s*.72,1.05,.8],[s*.66,2.15,-.1],.07,dark,.6);this.link(b,[s*.66,2.15,-.1],[s*.74,1.05,-1.05],.07,dark,.6);
        b.add('arch',dark,[s*1.02,.62,.98],[.62,.62,.62],[0,Math.PI/2,0]);b.add('arch',dark,[s*1.02,.68,-.98],[.66,.66,.62],[0,Math.PI/2,0]);
      }
      this.link(b,[-.66,2.15,-.1],[.66,2.15,-.1],.07,dark,.6);
      b.add('rbox-s',dark,[0,2.2,-.05],[1.4,.12,.32]);
      for(const x of [-.45,0,.45])b.add('disc','#fff6d8',[x,2.22,.13],[.14,.06,.14],[Math.PI/2,0,0],.2,.2,'#ffe6a0');
      b.add('disc','#1b1e22',[0,1.05,-1.5],[.42,.22,.42],[Math.PI/2,0,0]);b.add('disc',chrome,[0,1.05,-1.62],[.24,.02,.24],[Math.PI/2,0,0],.9,.2);
    }else if(coupe){
      // GT: salpicaderas redondas, cofre largo, parabrisas, faros redondos y aletas
      b.add('rbox',paint,[0,.86,.15],[1.62,.55,2.95],null);
      b.add('rbox',paint,[0,1.06,.95],[1.45,.22,1.2],[.06,0,0]);
      for(const s of [-1,1])for(const z of [-.98,.98])b.add('drop',paint,[s*.86,.82,z],[.42,.62,.5],[Math.PI/2,0,0]);
      b.add('rbox-s',paint2,[0,1.18,.95],[.32,.02,1.18],[.06,0,0]);
      b.add('rbox',glass,[0,1.32,.18],[1.3,.42,.12],[-.6,0,0]);
      for(const s of [-1,1]){b.add('disc','#fff3d0',[s*.6,.92,1.62],[.17,.06,.17],[Math.PI/2,0,0],.2,.2,'#ffe2a0');b.add('rbox-s',red,[s*.58,.98,-1.32],[.34,.1,.05],null,0,.2,'#ff3b2f');}
      b.add('rbox-s',chrome,[0,.56,1.72],[1.5,.12,.12],null,.9,.2);b.add('rbox-s',chrome,[0,.56,-1.38],[1.5,.12,.12],null,.9,.2);
      for(const s of [-1,1])b.add('rbox-s',paint,[s*.68,1.08,-1.18],[.08,.38,.6],[-.2,0,0]);
      for(const s of [-1,1])b.add('capsule',chrome,[s*.42,.5,-1.46],[.14,.24,.14],[Math.PI/2,0,0],.9,.2);
    }
    // asiento envolvente detrás del piloto
    b.add('rbox',carbon,[0,1.0,-.42],[.92,.86,.26],[-.22,0,0],.25,.55);
    b.add('rbox',carbon,[0,.72,-.18],[.86,.16,.6],null,.25,.55);
    for(const s of [-1,1])b.add('rbox-s',red,[s*.66,.9,-1.52],[.24,.1,.04],null,0,.2,'#ff3b2f'); // calaveras
  },
  // número fijo por piloto (su lugar en la lista): las calcomanías se reconocen de lejos
  number(id){const i=CHAR_ORDER.indexOf(id);return i<0?7:i+1;},
  kart(id,vehicle=0) {
    this.shapes();
    const T=KartGL,L=LOOKS[id]||{},V=kartVehicle(vehicle),bike=V.kind.endsWith('bike'),root=new T.Group(),body=new T.Group();let b=this.batch();root.add(body);
    const accent=L.accent||'#e63946',second=L.top2&&L.top2!==accent?L.top2:'#f4efe2';
    const ctx={paint:this.paint(accent),paint2:this.paint(second,.15),dark:'#141b24',carbon:'#232c38',chrome:'#d6dee6',red:'#ff4a44',glass:this.glass(),bike};
    this.chassis(b,V,accent,ctx);
    b.finish(body);
    // calcomanías con número a los lados (no en motos: no hay superficie plana)
    if(!bike){
      const n=this.number(id),dm=this.decal(id,n),plane=this.geo('plane');
      const side=V.kind==='kart'?[.8+.29,.68,-.15]:V.kind==='formula'?[.62+.37,.7,-.25]:V.kind==='buggy'?[.87,.88,.1]:[.83,.88,.15];
      for(const s of [-1,1]){const m=new T.Mesh(plane,dm);m.scale.setScalar(V.kind==='kart'?.42:.5);m.position.set(s*side[0],side[1],side[2]);m.rotation.y=s*Math.PI/2;body.add(m);}
    }
    const rider=CharacterModels.seated(id),head=rider.userData.head;body.add(rider);
    if(bike){rider.position.set(0,V.kind==='trailbike'?.16:.08,.05);rider.rotation.x=V.kind==='trailbike'?.06:.18;}
    if(!bike){const steering=this.batch();steering.add('ring',ctx.dark,[0,1.27,.76],[.34,.34,.34],[Math.PI/3,0,0],.2,.5);steering.add('rbox-s',L.accent||'#e63946',[0,1.27,.76],[.12,.12,.05],[Math.PI/3,0,0]);this.link(steering,[0,1.27,.76],[0,.85,1.15],.035,ctx.chrome,.9);steering.finish(body);}
    // escape con boca incandescente: Kart3D la prende con el turbo
    const flame=new T.MeshStandardMaterial({color:'#2a1a12',emissive:'#ff6a1a',emissiveIntensity:0,roughness:.5});
    const tipPos=V.kind==='kart'?[[.62,.64,-1.74]]:V.kind==='formula'?[[0,.62,-1.9]]:V.kind==='coupe'?[[-.42,.5,-1.6],[.42,.5,-1.6]]:V.kind==='buggy'?[[.6,.55,-1.5]]:[[.25,.7,-1.2]];
    for(const p of tipPos){const m=new T.Mesh(this.geo('disc'),flame);m.scale.set(.1,.04,.1);m.rotation.x=Math.PI/2;m.position.set(...p);body.add(m);}
    const jets=KartFX.makeJets(body,tipPos.map(p=>[p[0],p[1],p[2]-.03]));
    const wheels=[];
    const rubber=this.rubber(V.kind==='buggy'||V.kind==='trailbike');
    for(const side of bike?[0]:[-1,1])for(const front of [-1,1]){
      const big=V.kind==='buggy'?.56:bike?.56:V.kind==='formula'?(front>0?.42:.5):V.kind==='coupe'?.46:(front>0?.4:.47);
      const wide=bike?.2:V.kind==='buggy'?.42:V.kind==='formula'?(front>0?.34:.46):front>0?.32:.4;
      const pivot=new T.Group(); pivot.position.set(side*(V.kind==='formula'?1.12:V.kind==='buggy'?1.08:1.03),big+.04,front*(bike?1.18:V.kind==='formula'?1.32:.99));body.add(pivot);
      const spin=new T.Group();pivot.add(spin);
      const tire=new T.Mesh(this.geo('tire'),rubber);tire.scale.set(big,wide,big);tire.rotation.z=Math.PI/2;tire.castShadow=true;spin.add(tire);
      const w=this.batch();
      for(const outside of bike?[-1,1]:[side]){const x=outside*wide*.42;
        w.add('rim',ctx.chrome,[x,0,0],[big*.6,.04,big*.6],[0,0,Math.PI/2],.95,.2);
        w.add('rim',ctx.dark,[x+outside*.012,0,0],[big*.52,.035,big*.52],[0,0,Math.PI/2],.4,.5);
        w.add('rim',L.accent||'#e63946',[x+outside*.03,0,0],[.11,.04,.11],[0,0,Math.PI/2],.5,.3);
        const spokes=bike?8:5;for(let i=0;i<spokes;i++){const a=i*TAU/spokes;w.add('rbox-s',ctx.chrome,[x+outside*.022,Math.cos(a)*big*.3,Math.sin(a)*big*.3],[.035,big*.5,.07],[a,0,0],.95,.18);}
        if(bike)w.add('disc','#9aa5ae',[x*.4,0,0],[big*.42,.012,big*.42],[0,0,Math.PI/2],.9,.3); // disco de freno
      }
      w.finish(spin);wheels.push({pivot,spin,front:front>0});
    }
    const shield=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color:'#82f6ff',transparent:true,opacity:.18,metalness:.45,roughness:.16,emissive:'#123b46',depthWrite:false}));shield.scale.set(1.6,1.9,2.1);shield.position.y=1.35;shield.visible=false;root.add(shield);
    root.userData={body,head,wheels,shield,id,design:CharacterDesign.get(id),rider,vehicle:kartVehicleIndex(vehicle),bike,flame,jets};return root;
  },
};

