'use strict';
// All racing art is geometry. Faces belong to the front of the head; the chase
// camera sees hair, helmets, horns and hats from behind, never a photo billboard.
const KartModels = {
  geometry:new Map(), materials:new Map(),
  geo(type) {
    if(!this.geometry.has(type)) {
      const T=KartGL;
      const g=type==='box'?new T.BoxGeometry(1,1,1):type==='plane'?new T.PlaneGeometry(1,1):type==='sphere'?new T.SphereGeometry(1,18,12):
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
  chassis(b,V,col){
    const dark='#151f2b',metal='#9caebd',white='#e9edf0';
    if(V.kind==='sportbike'||V.kind==='trailbike'){
      const trail=V.kind==='trailbike';
      this.link(b,[0,.66,-.8],[0,1.22,.5],.12,dark,.65);this.link(b,[0,.66,.65],[0,1.22,-.3],.12,metal,.7);
      b.add('sphere',col,[0,1.11,.35],[trail?.34:.49,.34,.8],[-.2,0,0],.5,.25);
      b.add('box',dark,[0,1.19,-.48],[.52,.18,1.05],[-.05,0,0],.1,.5);
      b.add('sphere',col,[0,1.12,-.94],[.36,.13,.54],[-.15,0,0],.4,.25);
      b.add('box','#fb5f4c',[0,1.12,-1.31],[.32,.1,.04],null,0,.3,'#b32218');
      b.add('sphere',metal,[0,.73,-.03],[.36,.32,.47],null,.8,.3);
      for(let i=0;i<5;i++)b.add('box',dark,[0,.61+i*.06,.1],[.75,.025,.62],null,.6);
      for(const side of [-1,1]){
        this.link(b,[side*.23,.65,-1.05],[side*.2,.82,.05],.075,metal,.8);
        this.link(b,[side*.23,.6,1.2],[side*.21,1.42,.9],.065,trail?'#edc56f':metal,.8);
        this.link(b,[side*.12,1.4,.9],[side*.59,1.46,.88],.055,metal,.8);
        b.add('cylinder',dark,[side*.63,1.46,.88],[.07,.25,.07],[0,0,Math.PI/2]);
        b.add('box',dark,[side*.39,.65,-.05],[.3,.08,.2],null,.4);
      }
      b.add('cylinder',metal,[.38,.78,-.78],[.13,.72,.13],[Math.PI/2,0,-.2],.8,.2);
      b.add('cylinder',dark,[.45,.85,-1.16],[.095,.12,.095],[Math.PI/2,0,0]);
      if(trail){b.add('box',white,[0,1.5,1.02],[.49,.45,.15],[-.16,0,0]);b.add('box',col,[0,1.13,1.19],[.42,.1,.72],[-.12,0,0]);}
      else {b.add('sphere',col,[0,.85,.75],[.5,.48,.48],[-.2,0,0],.35,.25);b.add('sphere','#283f50',[0,1.47,.88],[.31,.35,.14],[.24,0,0],.65,.16);b.add('box','#dce9ee',[0,1.25,1.05],[.32,.09,.07],null,0,.2,'#a2c1cc');}
      return;
    }
    const rally=V.kind==='buggy',formula=V.kind==='formula',coupe=V.kind==='coupe';
    b.add('box',dark,[0,.47,0],[1.85,.28,2.75],null,.5);
    b.add('sphere',col,[0,.78,.05],[coupe?1.07:.88,rally?.42:.3,formula?1.35:1.57],null,.5,.28);
    if(formula){
      b.add('box',col,[0,1.57,-1.33],[2.65,.13,.47],[-.05,0,0],.5,.25);for(const x of [-1,1])this.link(b,[x*.5,.65,-1.2],[x*.5,1.57,-1.33],.055,metal,.8);
      b.add('cone',col,[0,.72,1.28],[.51,1.45,.4],[-Math.PI/2,0,0],.5,.24);
      b.add('box',col,[0,.48,1.73],[2.3,.1,.34],null,.55,.27);
      for(const x of [-1,1]){this.link(b,[x*.28,.55,.6],[x*1.02,.5,1.02],.055,metal,.8);this.link(b,[x*.28,.55,-.6],[x*1.02,.5,-1.02],.055,metal,.8);b.add('box',col,[x*.74,.72,-.16],[.45,.35,1.17],null,.4,.26);}
    }else if(rally){
      for(const x of [-1,1]){this.link(b,[x*.68,.85,.63],[x*.65,2.2,-.17],.075,dark,.7);this.link(b,[x*.65,2.2,-.17],[x*.75,.88,-1.15],.075,dark,.7);this.link(b,[x*.72,.82,-1.15],[x*.67,1.35,-1.5],.07,metal,.75);}
      this.link(b,[-.65,2.2,-.17],[.65,2.2,-.17],.075,dark,.7);
      b.add('box',dark,[0,2.21,-.12],[1.5,.12,.5]);
      for(const x of [-.5,0,.5])b.add('sphere','#ffe6b0',[x,2.22,.15],[.17,.13,.08],null,.25,.2,'#625634');
      b.add('box',metal,[0,.42,1.6],[1.9,.2,.22],null,.8);
    }else if(coupe){
      b.add('box',col,[0,.86,-1.22],[2.17,.52,.65],null,.5,.25);for(const x of [-.7,-.3,.3,.7])b.add('sphere','#ef554d',[x,.98,-1.57],[.12,.12,.035],null,0,.2,'#9d231d');
      b.add('box',col,[0,1.02,1.0],[1.85,.27,1.07],[.08,0,0],.6,.23);
      for(const x of [-1,1]){b.add('sphere',col,[x*.88,.86,-.7],[.31,.32,.65],null,.5,.25);b.add('box','#edf0de',[x*.7,.99,1.58],[.33,.13,.06],null,.2,.2,'#889a91');}
      b.add('box','#c9a672',[0,.62,-1.61],[1.5,.15,.08],null,.6);
    }
    b.add('box',dark,[0,1.02,-.42],[.9,.72,.22],[-.2,0,0]);
    b.add('box',col,[0,formula?1.35:1.23,-1.3],[formula?2.22:2.04,.13,.43],[-.05,0,0],.5,.25);
    b.add('box',white,[0,formula?.96:1.17,.93],[.16,.025,1.03],[.08,0,0],.2);
    for(const x of [-1,1]){b.add('box','#fe534d',[x*.68,.96,-1.5],[.27,.1,.04],null,0,.2,'#a2221c');b.add('cylinder',metal,[x*.45,.55,-1.55],[.12,.32,.12],[Math.PI/2,0,0],.85,.25);}
  },
  kart(id,vehicle=0) {
    const T=KartGL,L=LOOKS[id]||{},V=kartVehicle(vehicle),bike=V.kind.endsWith('bike'),root=new T.Group(),body=new T.Group();let b=this.batch();root.add(body);
    const accent=L.accent||'#eb4f61',top=L.top||L.body||L.skin||'#bd6950',skin=L.skin||'#d49c7a',hair=L.hair||'#352b31';
    const metal='#9dabb9',dark='#17212d',carbon='#263243';
    if(V.id==='cometa'){
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
    }else this.chassis(b,V,accent);
    b.finish(body);b=this.batch();const rider=new T.Group();body.add(rider);if(bike){rider.position.set(0,V.kind==='trailbike'?.16:.08,.05);rider.rotation.x=V.kind==='trailbike'?.06:.18;}
    // Driver sits facing +Z. The back of the head is a real curved surface.
    b.add('sphere',top,[0,1.29,-.05],[.45,.58,.31]);
    for(const side of [-1,1]) {
      this.link(b,[side*.32,1.59,.01],[side*.51,1.33,.52],.105,top);
      this.link(b,[side*.51,1.33,.52],[side*.34,1.28,.74],.085,skin);
      b.add('sphere','#f4ecdf',[side*.34,1.28,.73],[.12,.11,.13]);
      this.link(b,[side*.24,1.05,.15],[side*.37,.7,.72],.15,L.pants||dark);
      b.add('sphere',L.shoe||dark,[side*.37,.65,.99],[.18,.15,.32]);
    }
    if(!bike)b.add('torus',dark,[0,1.27,.76],[.41,.31,.41],[Math.PI/3,0,0],.25);
    const head=new T.Group();head.position.set(0,1.98,-.07);rider.add(head);
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
    h.finish(head);b.finish(rider);
    const wheels=[];
    for(const side of bike?[0]:[-1,1])for(const front of [-1,1]){
      const pivot=new T.Group(),radius=bike?.56:V.kind==='buggy'?.54:.44; pivot.position.set(side*(V.kind==='formula'?1.12:1.03),radius+.04,front*(bike?1.15:.99));body.add(pivot);
      const spin=new T.Group();pivot.add(spin);const w=this.batch();
      w.add('cylinder','#111922',[0,0,0],[radius,bike?.2:.33,radius],[0,0,Math.PI/2],.05,.9);
      for(const outside of bike?[-1,1]:[side]){const x=outside*(bike?.115:.18);w.add('cylinder',metal,[x,0,0],[radius*.58,.025,radius*.58],[0,0,Math.PI/2],.85,.24);
        w.add('cylinder',accent,[x+outside*.02,0,0],[.13,.025,.13],[0,0,Math.PI/2],.45,.26);
        for(let i=0;i<(bike?10:6);i++){const a=i*TAU/(bike?10:6);w.add('box','#75899b',[x+outside*.018,Math.cos(a)*radius*.37,Math.sin(a)*radius*.37],[.025,.03,radius*.45],[a,0,0],.7);}}
      if(V.kind==='buggy'||V.kind==='trailbike')for(let i=0;i<16;i++){const a=i*TAU/16;w.add('box','#232b31',[0,Math.cos(a)*radius,Math.sin(a)*radius],[bike?.22:.37,.07,.12],[a,0,0],.05,.95);}
      w.finish(spin);wheels.push({pivot,spin,front:front>0});
    }
    const shield=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color:'#82f6ff',transparent:true,opacity:.18,metalness:.45,roughness:.16,emissive:'#123b46',depthWrite:false}));shield.scale.set(1.6,1.9,2.1);shield.position.y=1.35;shield.visible=false;root.add(shield);
    root.userData={body,head,wheels,shield,id,vehicle:kartVehicleIndex(vehicle),bike};return root;
  },
};
