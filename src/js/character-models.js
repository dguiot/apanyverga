'use strict';
// Kart and FPS models use Esmash's actual face/costume drawing and proportions.
// +Z is the front; the chase camera sees geometry, hair and hats from the back.
const CharacterModels = {
  bodyGeometry(){
    if(KartModels.geometry.has('character-body'))return;
    const T=KartGL,positions=[],indices=[],rings=[[0,.48],[-.055,.88],[-.16,1],[-.37,.96],[-.67,.78],[-.94,.7],[-1,.56]],n=28;
    for(const [y,r] of rings)for(let i=0;i<=n;i++){const a=i*TAU/n;positions.push(Math.sin(a)*r,y,Math.cos(a)*r*.67);}
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,b,b+1,a+1);}
    for(const row of [0,rings.length-1]){const center=positions.length/3;positions.push(0,rings[row][0],0);for(let i=0;i<n;i++){const a=row*(n+1)+i;indices.push(...(row?[center,a+1,a]:[center,a,a+1]));}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    KartModels.geometry.set('character-body',g);
  },
  group(id,part) { const g=new KartGL.Group();g.name=id+':'+part;g.userData.design=CharacterDesign.get(id);return g; },
  part(id,name,draw) {const g=this.group(id,name),b=KartModels.batch();draw(b);b.finish(g);return g;},
  head(id) {
    const L=CharacterDesign.get(id),K=skOf(id),g=this.group(id,'head'),b=KartModels.batch(),rx=K.headRX/60,ry=K.headRY/60,hair=L.hair||L.skin,sp=L.species;
    // Proportions come from Esmash's own skeleton.
    const art=!sp&&typeof FACE_TOON!=='undefined'&&FACE_TOON[id];
    if(!art)b.add(sp==='robot'?'box':'sphere',L.skin,[0,0,-.025],sp==='robot'?[rx*2,ry*1.8,rx*1.55]:[rx,ry,rx*.78],null,L.art.metalness,L.art.roughness);
    if(!sp||sp==='mariachi'){
      b.add('sphere',hair,[0,ry*.36,-rx*.3],[rx*1.04,ry*.72,rx*.72]);
      if(L.hairBack==='long'||L.hairBack==='mullet')b.add('sphere',hair,[0,-ry*.65,-rx*.7],[rx*1.07,ry*(L.hairBack==='long'?1.5:1),rx*.38]);
      if(L.hairBack==='bun')b.add('sphere',hair,[-rx*.6,ry*.4,-rx],[rx*.5,rx*.5,rx*.5]);
    }
    if(sp==='bull')for(const side of [-1,1]){
      KartModels.link(b,[side*rx*.65,ry*.5,-.025],[side*rx*1.25,ry*1.1,-.02],rx*.22,L.horn);
      b.add('cone',L.horn,[side*rx*1.33,ry*1.45,-.02],[rx*.22,ry*.8,rx*.2],[0,0,-side*.22]);
    }
    if(L.hat){const j=!!L.jarocho;b.add('cylinder',L.hat,[0,ry*.75,0],[rx*(j?2.4:2.75),.035,rx*2.1]);b.add('sphere',L.hat,[0,ry*(j?1.05:1.2),-.02],[rx,ry*(j?.5:.75),rx*.9]);b.add('cylinder',L.hatBand,[0,ry*.86,0],[rx*1.04,.034,rx*.94]);}
    if(L.headwear==='montera'){b.add('sphere',L.montera,[0,ry*.7,-.015],[rx*1.2,ry*.4,rx*.85]);for(const side of [-1,1])b.add('sphere',L.montera,[side*rx*1.17,ry*.65,0],[rx*.37,ry*.3,rx*.4]);}
    if(sp==='axo')for(const side of [-1,1])for(let i=0;i<3;i++){const x=side*rx*(1.6+Math.sin(i)*.1),y=(i-1)*ry*.9;KartModels.link(b,[side*rx*.8,(i-1)*ry*.2,0],[x,y,-.02],.018,L.gill);b.add('sphere',L.gill2,[x,y,-.02],[.068,.027,.03]);}
    if(sp==='robot'){KartModels.link(b,[0,ry*.8,0],[-rx*.25,ry*1.4,0],.012,L.top2,.6);b.add('sphere',L.eye,[-rx*.25,ry*1.5,0],[.035,.035,.035],null,0,.3,L.eye);}
    if(sp==='cat'||sp==='chupa')for(const side of [-1,1])b.add('cone',L.skin,[side*rx*.7,ry*.9,-.015],[rx*.42,ry*.7,rx*.35],[0,0,-side*.2]);
    if(sp==='dino'){b.add('sphere',L.skin,[rx*.25,-ry*.12,-rx*.1],[rx*1.1,ry*.53,rx*.65]);for(let i=0;i<4;i++)b.add('cone',L.stripe,[0,ry*.75-i*.035,-rx*.6-i*.055],[.045,.12,.04],[-.6,0,0]);}
    if(sp==='chupa')for(let i=0;i<4;i++)b.add('cone',L.spine,[0,ry*.7-i*.05,-rx*.7],[.045,.16,.04],[-1.1,0,0]);
    b.finish(g);
    // personas reales: la cara ilustrada va pintada SOBRE la cabeza (antes era una placa delante: parecía máscara)
    if(art){const face=this.faceHead(id,rx,ry);g.add(face);g.userData={design:L,front:null,faceMesh:face,face:'normal'};return g;}
    const front=CharacterArt.patch(id);g.add(front);g.userData={design:L,front,face:'normal'};return g;
  },
  // Cabeza de una persona real: mitad de enfrente con su cara (proyección frontal), mitad de atrás color piel.
  // Las orillas de la ilustración se difuminan hacia la piel, así que no hay borde de máscara.
  faceTexture(id,rx,ry){
    const key='face-head:'+id;if(KartWorld.textures.has(key))return KartWorld.textures.get(key);
    const T=KartGL,d=FACE_TOON[id],n=512,cv=mkCanvas(n,n),c=cv.getContext('2d');c.fillStyle=d.skin;c.fillRect(0,0,n,n);
    const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;KartWorld.textures.set(key,tex);
    FaceArt.whenTex(id,a=>{
      // la cara ocupa casi todo el alto de la cabeza; si queda muy ancha, se limita al 92 % del ancho
      let hu=2.1,wu=hu*ry/rx*a.tex.width/a.tex.height*1.06;if(wu>1.98){hu*=1.98/wu;wu=1.98;}
      const px=v=>(v+1)/2*n,py=v=>(1-(v+1)/2)*n,yc=-.02,L=CharacterDesign.get(id);
      // arriba de la frente y a los lados de arriba: pelo (si no, la cabeza se veía calva sobre la cara)
      const top=py(yc+hu/2-hu*.12),gr=c.createLinearGradient(0,top-n*.05,0,top+n*.12);gr.addColorStop(0,L.hair||d.skin);gr.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=L.hair||d.skin;c.fillRect(0,0,n,Math.max(0,top-n*.05));c.fillStyle=gr;c.fillRect(0,top-n*.05,n,n*.17);
      if(L.hairBack==='long'){const side=c.createLinearGradient(px(-1),0,px(-wu/2+.08),0);side.addColorStop(0,L.hair);side.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=side;c.fillRect(0,0,px(-wu/2+.08),n);const s2=c.createLinearGradient(px(1),0,px(wu/2-.08),0);s2.addColorStop(0,L.hair);s2.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=s2;c.fillRect(px(wu/2-.08),0,n,n);}
      c.drawImage(a.tex,px(-wu/2),py(yc+hu/2),wu/2*n,hu/2*n);tex.needsUpdate=true;
    });
    return tex;
  },
  faceHead(id,rx,ry){
    const T=KartGL,g=new T.Group(),L=CharacterDesign.get(id);g.name=id+':face-head';
    let front=KartModels.geometry.get('face-front');
    if(!front){front=new T.SphereGeometry(1,40,32,0,Math.PI);const p=front.attributes.position,uv=front.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+1)/2,(p.getY(i)+1)/2);KartModels.geometry.set('face-front',front);KartModels.geometry.set('face-back',new T.SphereGeometry(1,40,32,Math.PI,Math.PI));}
    const mats=this.faceMaterials(id,rx,ry);
    const f=new T.Mesh(front,mats.normal),back=new T.Mesh(KartModels.geometry.get('face-back'),Style3D.toon(L.hair||FACE_TOON[id].skin,0,.8));
    for(const m of [f,back]){m.scale.set(rx,ry,rx*.82);m.position.set(0,0,-.025);m.castShadow=m.receiveShadow=true;g.add(m);}
    g.userData={design:L,front:f,mats};return g;
  },
  faceMaterials(id,rx,ry){
    const key='face-mat:'+id;if(KartModels.materials.has(key+':normal'))return {normal:KartModels.materials.get(key+':normal'),hurt:KartModels.materials.get(key+':hurt')};
    const map=this.faceTexture(id,rx,ry),T=KartGL,make=hurt=>{const m=new T.MeshStandardMaterial({map,roughness:.72,metalness:0,emissive:hurt?'#7a0d0d':'#000000',emissiveIntensity:hurt?.55:0});m.userData.esToon=true;m.userData.esPlain=true;return m;};
    const out={normal:make(false),hurt:make(true)};KartModels.materials.set(key+':normal',out.normal);KartModels.materials.set(key+':hurt',out.hurt);return out;
  },
  expression(head,face='normal') {const u=head.userData;if(u.faceMesh){if(u.face!==face){u.face=face;const fu=u.faceMesh.userData;fu.front.material=face==='hurt'||face==='ko'?fu.mats.hurt:fu.mats.normal;}return;}if(u.face!==face){u.front.material=CharacterArt.drawing(u.design.id,'head',face).material;u.front.userData.face=u.face=face;}},
  torso(id) {
    this.bodyGeometry();const L=CharacterDesign.get(id),K=skOf(id),B=L.build;
    const g=this.part(id,'torso',b=>{
      b.add('character-body',L.top,[0,0,-.012],[B.chest/60,K.torso/60,B.chest/60],null,L.art.metalness,.88);
      // The back keeps the same costume palette and signature knitted pattern.
      if(L.pattern)for(let row=0;row<3;row++)for(let i=-4;i<4;i++)KartModels.link(b,[i*B.chest/240,-K.torso/60*(.22+row*.27)+(i%2)*.025,-B.chest/60*.67],[(i+1)*B.chest/240,-K.torso/60*(.22+row*.27)+((i+1)%2)*.025,-B.chest/60*.67],.008,L.pattern);
      if(L.sash||L.bandana){b.add('sphere',L.sash||L.bandana,[0,-K.torso/60*.96,0],[B.waist/60*1.1,.035,B.chest/60*.65]);}
    });g.add(CharacterArt.patch(id,'torso'));return g;
  },
  extremity(id,leg=false) {
    const L=CharacterDesign.get(id),k=leg?L.build.leg:L.build.arm,r=(leg?.12:.09)*k;
    return this.part(id,leg?'foot':'hand',b=>{
      if(leg) {
        b.add('sphere',L.shoe||L.skin,[0,-.02,.09],[r*.98,.085,.195],null,.1,.56);
        b.add('sphere',L.sole||L.claw||L.skin,[0,-.075,.09],[r,.024,.19]);
        if(L.feet==='claw')for(let i=-1;i<=1;i++)b.add('cone',L.claw,[i*.07,-.035,.24],[.024,.12,.024],[Math.PI/2,0,0]);
        else b.add('sphere',L.accent,[0,-.02,.265],[.05,.018,.012]);
      } else {
        b.add('sphere',L.glove||L.skin,[0,-.035,.02],[L.glove?.115:.083,L.glove?.13:.1,.085],null,L.art.metalness,L.art.roughness);
        b.add('sphere',L.glove||L.skin,[.065,-.02,.055],[.035,.057,.04]);
        if(L.wrap||L.glove)b.add('cylinder',L.wrap||shade(L.glove,-.2),[0,.025,0],[r*.92,.055,r*.92]);
        if(L.hand==='claw')for(let i=-1;i<=1;i++)b.add('cone',L.claw,[i*.046,-.13,.048],[.018,.1,.018],[Math.PI,0,0]);
      }
    });
  },
  limb(id,name,leg=false) {
    const L=CharacterDesign.get(id),B=L.build,g=this.group(id,name),k=leg?B.leg:B.arm,r=(leg?.12:.09)*k;
    const upper=this.part(id,name+'-upper',b=>b.add('sphere',leg?L.legCol||L.pants:L.sleeve==='none'?L.skin:L.top,[0,-.5,0],[r,.56,r*.96],null,L.art.metalness,L.art.roughness));
    const fore=this.part(id,name+'-lower',b=>b.add('sphere',leg?L.bootH?L.boot||L.shoe:L.legCol||L.pants:L.sleeve==='long'?L.top:L.skin,[0,-.5,0],[r*.86,.55,r*.86],null,L.art.metalness,L.art.roughness));
    const end=this.extremity(id,leg);
    g.add(upper,fore,end);g.userData={design:L,upper,fore,end};return g;
  },
  create(id) {
    const g=this.group(id,'character'),L=CharacterDesign.get(id),head=this.head(id),torso=this.torso(id),neck=this.part(id,'neck',b=>{const art=typeof FACE_TOON!=='undefined'&&FACE_TOON[id]&&!L.species;b.add('sphere',art?shade(L.skin,-.14):L.skin,[0,0,0],art?[.07,.12,.07]:[.09,.14,.09]);});
    const limbs={armF:this.limb(id,'arm-front'),armB:this.limb(id,'arm-back'),legF:this.limb(id,'leg-front',true),legB:this.limb(id,'leg-back',true)};
    g.add(torso,neck,head,...Object.values(limbs));
    const back=this.part(id,'back',b=>{
      if(L.tail) {
        const col=L.tail.col;KartModels.link(b,[0,-.4,-.12],[0,-.52,-.62],L.tail.kind==='dino'?.14:.055,col);KartModels.link(b,[0,-.52,-.62],[.12,-.2,-.94],L.tail.kind==='dino'?.09:.045,col);
        b.add('sphere',L.tail.tip||col,[.12,-.18,-.94],[.06,.085,.08]);
      }
      if(L.back==='spines')for(let i=0;i<5;i++)b.add('cone',L.spine,[0,-i*.13,-.23],[.075,.25,.075],[-1.35,0,0]);
      if(L.back==='cape')b.add('sphere',L.cape,[0,-.44,-.19],[.31,.57,.035],[-.15,0,0]);
      if(L.back==='guitar') {
        b.add('sphere','#bd7c38',[-.1,-.4,-.22],[.18,.23,.055],[0,0,-.25]);b.add('sphere','#e3af5e',[-.1,-.4,-.27],[.145,.2,.022],[0,0,-.25]);
        b.add('box','#5d3d2a',[-.19,-.07,-.24],[.054,.43,.045],[0,0,-.25]);b.add('sphere','#392c22',[-.1,-.4,-.3],[.055,.055,.012]);
      }
    });g.add(back);g.userData={design:L,head,torso,neck,back,limbs};return g;
  },
  segment(part,a,b) {
    const u=part.userData,T=KartGL,set=(o,p,q)=>{const d=new T.Vector3(q[0]-p[0],q[1]-p[1],q[2]-p[2]);o.position.set(...p);o.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),d.clone().normalize());o.scale.y=d.length();};
    set(u.upper,a,b[0]);set(u.fore,b[0],b[1]);u.end.position.set(...b[1]);u.end.rotation.z=b[2];
  },
  seated(id) {
    const model=this.create(id),u=model.userData;
    u.torso.position.set(0,1.58,-.055);u.torso.rotation.set(0,0,0);u.neck.position.set(0,1.62,-.055);u.head.position.set(0,1.96,-.055);u.head.rotation.set(0,0,0);u.back.position.copy(u.torso.position);u.back.rotation.set(0,0,0);
    for(const s of [-1,1]) {
      this.segment(u.limbs[s>0?'armF':'armB'],[s*.29,1.54,0],[[s*.46,1.27,.4],[s*.33,1.25,.71],0]);
      this.segment(u.limbs[s>0?'legF':'legB'],[s*.17,1.05,0],[[s*.32,.91,.58],[s*.35,.62,.83],0]);
    }return model;
  },
  standing(id) {
    const model=this.create(id),u=model.userData,K=skOf(id),hip=(K.thigh+K.shin)/60,shoulder=hip+K.torso/60;
    u.torso.position.set(0,shoulder,0);u.torso.rotation.set(0,0,0);u.head.position.set(0,shoulder+(K.neck+K.headRY*.8)/60,0);u.head.rotation.set(0,0,0);u.head.scale.setScalar(1);u.neck.position.set(0,shoulder+.05,0);u.back.position.copy(u.torso.position);u.back.rotation.set(0,0,0);
    for(const s of [-1,1]) {
      const leg=u.limbs[s>0?'legF':'legB'];this.segment(leg,[0,0,0],[[0,-K.thigh/60,0],[0,-hip,0],0]);leg.position.set(s*.13,hip,0);
      model.userData[s<0?'legL':'legR']=leg;
      this.segment(u.limbs[s>0?'armF':'armB'],[s*u.design.build.chest/60*.82,shoulder-.04,0],[[s*.29,shoulder-.31,.26],[s*.16,shoulder-.25,.53],0]);
    }
    const gun=this.part(id,'equipped-gun',b=>{b.add('box','#29363e',[.13,shoulder-.2,.6],[.11,.14,.52],null,.6,.4);b.add('cylinder','#536873',[.13,shoulder-.19,.93],[.025,.25,.025],[Math.PI/2,0,0],.7,.3);});model.add(gun);model.scale.setScalar(.92);return model;
  },
};
