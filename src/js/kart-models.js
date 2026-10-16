'use strict';
// All racing art is geometry. Faces belong to the front of the head; the chase
// camera sees hair, helmets, horns and hats from behind, never a photo billboard.
const KartModels = {
  geometry:new Map(), materials:new Map(),
  geo(type) {
    if(!this.geometry.has(type)) {
      const T=KartGL;
      const g=type==='box'?new T.BoxGeometry(1,1,1):type==='sphere'?new T.SphereGeometry(1,18,12):
        type==='cylinder'?new T.CylinderGeometry(1,1,1,18):type==='cone'?new T.ConeGeometry(1,1,14):
        type==='torus'?new T.TorusGeometry(1,.12,8,28):type==='hill'?new T.DodecahedronGeometry(1,1):type==='rock'?new T.DodecahedronGeometry(1,0):new T.OctahedronGeometry(1,0);
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
        const mat=M.mat(col,metal,rough,emit),g=M.geo(type).clone().applyMatrix4(M.matrix(pos,scale,rot));
        if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(g);
      },
      finish(parent,cast=true) {
        for(const [mat,gs] of bins){const g=KartGL.mergeGeometries(gs,false),mesh=new KartGL.Mesh(g,mat);gs.forEach(g=>g.dispose());mesh.castShadow=cast;mesh.receiveShadow=true;parent.add(mesh);}
        bins.clear();
      },
    };
  },
  link(batch,a,b,radius,color,metal=0) {
    const T=KartGL,va=new T.Vector3(...a),vb=new T.Vector3(...b),dir=vb.clone().sub(va),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize());
    const rot=new T.Euler().setFromQuaternion(q);
    batch.add('cylinder',color,va.add(vb).multiplyScalar(.5).toArray(),[radius,dir.length(),radius],[rot.x,rot.y,rot.z],metal);
  },
  kart(id) {
    const T=KartGL,L=LOOKS[id]||{},root=new T.Group(),body=new T.Group(),b=this.batch();root.add(body);
    const accent=L.accent||'#eb4f61',top=L.top||L.body||L.skin||'#bd6950',skin=L.skin||'#d49c7a',hair=L.hair||'#352b31';
    const metal='#9dabb9',dark='#17212d',carbon='#263243';
    b.add('box',dark,[0,.43,0],[1.9,.25,2.75],null,.35);
    b.add('sphere',accent,[0,.65,.18],[.97,.38,1.62],null,.25,.32);
    b.add('box',accent,[0,.79,1.03],[1.65,.32,.85],[.12,0,0],.25,.3);
    b.add('box','#f3ede4',[0,.975,.98],[.2,.022,.94],[.12,0,0],.1,.35);
    b.add('box',carbon,[0,.72,-1.15],[1.55,.55,.58],null,.5);
    for(let i=0;i<5;i++)b.add('box',metal,[0,.72+i*.065,-1.46],[1.0,.025,.025],null,.8);
    b.add('box',dark,[0,1.04,-.38],[.92,.8,.24],[-.2,0,0]);
    b.add('box',carbon,[0,.75,.02],[.91,.22,1.1]);
    for(const x of [-1,1]){
      b.add('cylinder',metal,[x*.91,.46,0],[.09,2.5,.09],[Math.PI/2,0,0],.8);
      b.add('box',accent,[x*.98,.75,-.8],[.34,.23,1.05],null,.3,.32);
      this.link(b,[x*.64,.7,-.66],[x*.67,1.29,-1.12],.055,metal,.8);
      b.add('cylinder',carbon,[x*.48,.57,-1.56],[.105,.44,.105],[Math.PI/2,0,0],.5);
      b.add('cylinder',metal,[x*.48,.57,-1.77],[.115,.055,.115],[Math.PI/2,0,0],.85);
      b.add('box','#ff474d',[x*.63,.9,-1.47],[.25,.11,.035],null,0,.2,'#9e171c');
    }
    b.add('box',accent,[0,1.32,-1.2],[2.14,.12,.42],[-.07,0,0],.4,.3);
    b.add('box','#faf0d2',[0,1.39,-1.2],[.24,.02,.42],[-.07,0,0],.3);
    b.add('box',metal,[0,.42,1.63],[2,.14,.12],null,.8,.3);
    b.add('box',metal,[0,.4,-1.6],[1.85,.12,.12],null,.8,.3);
    // Driver sits facing +Z. The back of the head is a real curved surface.
    b.add('sphere',top,[0,1.29,-.05],[.45,.58,.31]);
    for(const side of [-1,1]) {
      this.link(b,[side*.32,1.59,.01],[side*.51,1.33,.52],.105,top);
      this.link(b,[side*.51,1.33,.52],[side*.34,1.28,.74],.085,skin);
      b.add('sphere','#f4ecdf',[side*.34,1.28,.73],[.12,.11,.13]);
      this.link(b,[side*.24,1.05,.15],[side*.37,.7,.72],.15,L.pants||dark);
      b.add('sphere',L.shoe||dark,[side*.37,.65,.99],[.18,.15,.32]);
    }
    b.add('torus',dark,[0,1.27,.76],[.41,.31,.41],[Math.PI/3,0,0],.25);
    const head=new T.Group();head.position.set(0,1.98,-.07);body.add(head);
    const h=this.batch(),human=!L.species;
    if(human){
      h.add('sphere',skin,[0,0,0],[.31,.37,.3]);
      h.add('sphere',hair,[0,.12,-.07],[.33,.32,.29]);
      h.add('box',hair,[0,-.03,-.22],[.48,.35,.16]);
      if(['long','mullet'].includes(L.hairBack))h.add('sphere',hair,[0,-.25,-.22],[.36,.43,.18]);
      if(L.hairBack==='bun')h.add('sphere',hair,[0,.12,-.36],[.17,.17,.16]);
      for(const side of [-1,1]){h.add('sphere',skin,[side*.31,-.02,.01],[.07,.12,.08]);h.add('sphere','#fff5e9',[side*.11,.015,.273],[.072,.055,.035]);h.add('sphere','#302827',[side*.11,.015,.302],[.027,.035,.016]);}
      h.add('sphere',skin,[0,-.07,.307],[.07,.09,.09]);
      if(L.toonBeard||L.beard)h.add('sphere',hair,[0,-.2,.2],[.25,.16,.18]);
      if(L.shades)h.add('box','#111e2b',[0,.03,.291],[.54,.11,.08],null,.5,.2);
    }else{
      const colors={torito:'#865738',chilazo:'#d3394c',dino:'#4caa76',mariachi:'#b77b58',axo:'#f3a5c2',chispa:'#a8c2d4',michi:'#ddb96f',luchador:'#f5d67d',chupa:'#61766f'};
      const col=colors[id]||skin;
      h.add('sphere',col,[0,0,0],id==='dino'?[.55,.37,.44]:[.38,.38,.34]);
      // Small facial details are placed strictly on the front hemisphere.
      for(const side of [-1,1]){h.add('sphere','#fff5df',[side*.15,.06,.294],[.09,.08,.05]);h.add('sphere','#15242b',[side*.15,.06,.338],[.035,.05,.018]);}
      if(id==='torito')for(const side of [-1,1]){this.link(h,[side*.27,.18,0],[side*.5,.38,.01],.085,'#ead6af');h.add('cone','#fff0cd',[side*.5,.48,.01],[.085,.25,.085],[0,0,side*-.3]);}
      if(id==='dino'){
        h.add('sphere','#63b88b',[0,-.05,.34],[.43,.22,.35]);
        for(let i=0;i<4;i++)h.add('cone','#f3dcad',[(i-1.5)*.17,-.2,.53],[.055,.13,.055],[Math.PI,0,0]);
        for(let i=0;i<4;i++)h.add('cone','#2a775b',[0,.28-i*.08,-.13-i*.12],[.1,.22,.1]);
        this.link(b,[0,1.05,-.3],[0,1.08,-1.85],.18,'#4caa76');b.add('cone','#4caa76',[0,1.08,-2.08],[.17,.6,.17],[-Math.PI/2,0,0]);
      }
      if(id==='mariachi'){
        h.add('cylinder',L.hat||'#17171c',[0,.3,0],[.78,.07,.68]);h.add('cone',L.hat||'#17171c',[0,.5,0],[.33,.5,.31]);
        h.add('torus',L.hatTrim||'#dbc895',[0,.3,0],[.75,.75,.64],[Math.PI/2,0,0],.4);
        h.add('cylinder',L.hatBand||'#e6c373',[0,.33,0],[.35,.09,.33]);h.add('box','#2c2829',[0,-.11,.33],[.37,.055,.07]);
      }
      if(id==='chilazo'){h.add('cone','#63965b',[0,.39,0],[.16,.3,.16],[0,0,-.35]);}
      if(id==='axo')for(const side of [-1,1])for(let i=0;i<3;i++){
        this.link(h,[side*.28,(i-1)*.1,0],[side*(.57+Math.sin(i)*.06),(i-1)*.26,-.04],.045,'#cd577f');
        h.add('sphere','#fa769d',[side*(.57+Math.sin(i)*.06),(i-1)*.26,-.04],[.13,.07,.09]);
      }
      if(id==='chispa'){
        h.add('box','#9cb9ca',[0,0,0],[.62,.56,.6],null,.7,.25);h.add('box','#17394c',[0,0,.31],[.43,.2,.04],null,.4);
        for(const side of [-1,1])h.add('sphere','#75f2f0',[side*.11,0,.35],[.075,.075,.035],null,0,.2,'#349ca9');
        this.link(h,[0,.29,0],[0,.55,0],.035,metal,.6);h.add('sphere','#75efff',[0,.58,0],[.07,.07,.07],null,0,.4,'#59c5ef');
      }
      if(id==='michi'||id==='chupa')for(const side of [-1,1]){h.add('cone',col,[side*.27,.37,-.02],[.15,.35,.13],[0,0,side*-.2]);h.add('cone','#d59296',[side*.27,.37,.07],[.08,.21,.025],[0,0,side*-.2]);}
      if(id==='michi'){this.link(b,[.25,1.1,-.3],[.8,1.3,-1.5],.1,L.skin);this.link(b,[.8,1.3,-1.5],[.7,1.9,-1.6],.095,L.skin);}
      if(id==='chupa')for(let i=0;i<4;i++)h.add('cone',L.spine||'#2f3a2c',[0,.22-i*.14,-.3],[.12,.32,.12],[-Math.PI/3,0,0]);
      if(id==='luchador'){
        h.add('sphere','#f4eddb',[0,-.02,.22],[.27,.32,.15]);h.add('box','#de644d',[0,.05,.35],[.49,.1,.02]);
        h.add('cone','#f5c547',[0,.3,.11],[.14,.3,.07],[.3,0,0]);
      }
    }
    h.finish(head);b.finish(body);
    const wheels=[];
    for(const side of [-1,1])for(const front of [-1,1]){
      const pivot=new T.Group();pivot.position.set(side*1.03,.48,front*.99);body.add(pivot);
      const spin=new T.Group();pivot.add(spin);const w=this.batch();
      w.add('cylinder','#111922',[0,0,0],[.44,.33,.44],[0,0,Math.PI/2],.05,.85);
      w.add('cylinder',metal,[side*.18,0,0],[.25,.025,.25],[0,0,Math.PI/2],.85,.24);
      w.add('cylinder',accent,[side*.2,0,0],[.13,.025,.13],[0,0,Math.PI/2],.45,.26);
      for(let i=0;i<6;i++)w.add('box','#75899b',[side*.2,Math.cos(i*TAU/6)*.18,Math.sin(i*TAU/6)*.18],[.025,.055,.15],[i*TAU/6,0,0],.7);
      w.finish(spin);wheels.push({pivot,spin,front:front>0});
    }
    const shield=new T.Mesh(new T.SphereGeometry(1,20,14),new T.MeshBasicMaterial({color:'#82f6ff',transparent:true,opacity:.16,depthWrite:false,wireframe:true}));shield.scale.set(1.6,1.9,2.1);shield.position.y=1.35;shield.visible=false;root.add(shield);
    root.userData={body,head,wheels,shield,id};return root;
  },
};
