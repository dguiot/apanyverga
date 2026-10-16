'use strict';
// Procedural materials and geometry stay bundled and work without an asset CDN.
const KartWorld={
  textures:new Map(),materials:new Map(),
  texture(kind){
    if(this.textures.has(kind))return this.textures.get(kind);
    const T=KartGL,n=512,cv=mkCanvas(n,n),c=cv.getContext('2d'),rng=srand(731+kind.length*91),im=c.createImageData(n,n);
    const base=kind==='asphalt'?[126,131,133]:kind==='grass'?[140,151,111]:kind==='rock'?[177,145,117]:kind==='mountain'?[213,216,206]:kind==='earth'?[181,151,117]:[202,194,174];
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,grain=(rng()-.5)*(kind==='asphalt'?68:42),wave=Math.sin(x*.031)*Math.cos(y*.041)*10+(kind==='rock'?Math.sin(y*.13+Math.sin(x*.02)*2)*15:0);for(let k=0;k<3;k++)im.data[i+k]=clamp(base[k]+grain+wave,0,255);im.data[i+3]=255;}c.putImageData(im,0,0);
    if(kind==='grass')for(let i=0;i<14000;i++){const x=rng()*n,y=rng()*n;c.strokeStyle=i%3?'rgba(65,86,43,.2)':'rgba(230,222,159,.25)';c.lineWidth=.5+rng();c.beginPath();c.moveTo(x,y);c.lineTo(x+(rng()-.5)*5,y-2-rng()*7);c.stroke();}
    if(kind==='rock'||kind==='earth')for(let i=0;i<42;i++){const y=rng()*n;c.strokeStyle='rgba(57,45,33,'+(.08+rng()*.12)+')';c.lineWidth=.5+rng()*3;c.beginPath();for(let x=-10;x<n+10;x+=13){const yy=y+Math.sin(x*.03+i)*3;i===0?c.moveTo(x,yy):c.lineTo(x,yy);}c.stroke();}
    if(kind==='plaster')for(let i=0;i<1200;i++){c.fillStyle='rgba(83,72,54,.08)';c.fillRect(rng()*n,rng()*n,1+rng()*6,1+rng()*5);}
    const tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;this.textures.set(kind,tex);return tex;
  },
  material(kind,color,vertexColors=false){
    const key=kind+':'+color+':'+vertexColors;if(!this.materials.has(key)){const tex=this.texture(kind),mat=new KartGL.MeshStandardMaterial({color,map:tex,bumpMap:tex,bumpScale:kind==='rock'?.75:kind==='plaster'?.12:.08,roughness:kind==='glass'?.28:.96,metalness:kind==='glass'?.45:0,vertexColors});this.materials.set(key,mat);}return this.materials.get(key);
  },
  sky(scene,info){
    const T=KartGL,night=info.theme==='neon',mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{night:{value:night?1:0},warm:{value:info.theme==='canyon'?1:0}},
      vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`varying vec3 direction;uniform float night;uniform float warm;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(13.2,4.7);a*=.5;}return v;}
void main(){vec3 d=normalize(direction);float h=max(0.,d.y);vec3 horizon=mix(vec3(.72,.81,.83),vec3(.81,.70,.58),warm);vec3 top=mix(vec3(.16,.40,.64),vec3(.25,.39,.55),warm);vec3 sky=mix(horizon,top,pow(h,.45));
vec3 sun=normalize(vec3(-.48,.39,-.64));float sd=max(0.,dot(d,sun));sky+=vec3(1.,.76,.45)*pow(sd,24.)*.3;sky+=vec3(2.4,2.1,1.7)*smoothstep(.99935,.9998,sd);
vec2 uv=d.xz/max(.17,d.y+.18)*2.1;float cloud=fbm(uv*1.5);float cover=smoothstep(.57,.77,cloud)*smoothstep(.02,.18,d.y);vec3 cloudCol=mix(vec3(.61,.68,.73),vec3(1.,.98,.91),smoothstep(.51,.79,cloud));sky=mix(sky,cloudCol,cover*.94);
vec3 nightSky=mix(vec3(.12,.18,.28),vec3(.012,.025,.075),pow(h,.45));float stars=pow(hash(floor(d.xz/max(.2,d.y)*1100.)),120.)*smoothstep(.15,.5,d.y);nightSky+=stars*.48;float moon=dot(d,normalize(vec3(.38,.55,-.52)));nightSky+=vec3(.57,.66,.83)*smoothstep(.9991,.9996,moon);nightSky+=vec3(.12,.16,.25)*pow(max(moon,0.),70.);nightSky=mix(nightSky,vec3(.14,.19,.28),cover*.5);
gl_FragColor=vec4(mix(sky,nightSky,night),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
    const mesh=Kart3D.skyMesh=new T.Mesh(new T.SphereGeometry(6500,32,20),mat);mesh.frustumCulled=false;mesh.name='atmospheric-sky';scene.add(mesh);
  },
  ridges(C,scene,bounds){
    const T=KartGL,cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2,night=C.info.theme==='neon',canyon=C.info.theme==='canyon';
    for(let layer=0;layer<3;layer++){
      const n=200,rows=12,pos=[],uv=[],colors=[],indices=[],radius=2100+layer*740;
      for(let row=0;row<=rows;row++)for(let i=0;i<=n;i++){
        const a=i*TAU/n,t=row/rows,rough=Math.sin(a*7+layer*.7)*.26+Math.sin(a*17+1.3)*.12+Math.cos(a*31)*.05;
        const peak=(canyon?350:440)+layer*110+(Math.sin(a*5)+1)*180+rough*450,rad=radius+t*(680+layer*160),height=-110+Math.sin(t*Math.PI)*peak+Math.sin(a*37+t*6)*Math.sin(t*Math.PI)*38;
        pos.push(cx+Math.sin(a)*rad,height,cz+Math.cos(a)*rad);uv.push(i/n*24,t*3);
        const snow=!canyon&&layer>0&&height>440+Math.sin(a*23)*40,base=snow?'#d3d7d5':night?'#48566a':canyon?'#bd9274':'#627b67',col=new T.Color(shade(base,rough*.23-row*.009));colors.push(col.r,col.g,col.b);
        if(row<rows&&i<n){const k=row*(n+1)+i;indices.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
      const mesh=new T.Mesh(g,this.material(canyon?'rock':'mountain','#e1e0d3',true));mesh.name='layered-mountain-'+layer;mesh.material.side=T.DoubleSide;scene.add(mesh);
    }
  },
  tree(w,rng){
    const R=Kart3D,h=7+rng()*4;R.instance('branch','#665849',[w.x,w.y+h*.35,w.z],[.3,h*.7,.3],[.07,0,.08]);
    for(let i=0;i<7;i++){const a=i*2.4,len=1.7+rng()*1.4,x=w.x+Math.cos(a)*len,z=w.z+Math.sin(a)*len,y=w.y+h*(.58+(i%3)*.11);
      const start=new KartGL.Vector3(w.x,w.y+h*.43,w.z),end=new KartGL.Vector3(x,y-.4,z),dir=end.clone().sub(start),rot=new KartGL.Euler().setFromQuaternion(new KartGL.Quaternion().setFromUnitVectors(new KartGL.Vector3(0,1,0),dir.clone().normalize()));
      R.instance('branch','#766451',start.add(end).multiplyScalar(.5).toArray(),[.08,dir.length(),.08],[rot.x,rot.y,rot.z]);
      for(let j=0;j<7;j++){const angle=j*2.399,rad=.6+rng()*.9;R.instance('leaf',['#68794e','#778958','#526947','#899766'][j%4],[x+Math.cos(angle)*rad,y+Math.sin(j*1.7)*.8,z+Math.sin(angle)*rad],[1.1+rng()*.6,.72+rng()*.7,1+rng()*.6],[rng(),angle,rng()]);}
    }
  },
  facade(C,s,side,b,h,width,a){
    const R=Kart3D,p=C.sample(s),front=C.world(s,side*1.45),dx=front.x-b.x,dz=front.z-b.z,len=Math.hypot(dx,dz),nx=dx/len,nz=dz/len;
    R.instance('box','#8e8b7f',[b.x,b.y-1.5,b.z],[10,3,width],[0,a,0]);
    for(let row=0;row<Math.floor(h/4);row++){
      const y=b.y+2.5+row*3.7,xx=b.x+nx*5.5,zz=b.z+nz*5.5;
      if(row>0){R.instance('box','#b2a18c',[xx,y-1.1,zz],[width*.85,.17,1.2],[0,a+Math.PI/2,0]);
        for(let j=-2;j<=2;j++)R.instance('branch','#555a55',[xx+p.tx*j*width*.17+nx*.6,y-.6,zz+p.tz*j*width*.17+nz*.6],[.035,1,.035]);
        R.instance('box','#5d685c',[xx+nx*.6,y-.1,zz+nz*.6],[width*.8,.055,.055],[0,a+Math.PI/2,0],.5);
      }
      for(const j of [-1,0,1])for(const k of [-1,1]){const x=b.x+nx*5.28+p.tx*(j*width*.28+k*1.1),z=b.z+nz*5.28+p.tz*(j*width*.28+k*1.1);R.instance('box',side>0?'#697969':'#94786a',[x,y,z],[.37,2.15,.12],[0,Math.atan2(nx,nz),0]);}
    }
    const pipe=C.world(s+width*.35,side*1.5);R.instance('branch','#837f72',[pipe.x,b.y+h*.5,pipe.z],[.06,h,.06]);
  },
  details(C){
    const R=Kart3D,rng=srand(521),town=C.info.theme==='town',canyon=C.info.theme==='canyon';
    for(let s=44;s<C.length;s+=92){const p=C.sample(s),a=Math.atan2(p.tx,p.tz);
      for(const side of [-1,1]){
        if(p.zone==='bridge'){
          const w=C.world(s,side*1.04,-7);R.instance('box',canyon?'#b29c87':'#a0a19b',[w.x,w.y,w.z],[.65,14,.65],[0,a,0]);
          const q=C.world(s,0,-1.0);R.instance('box','#8e9290',[q.x,q.y,q.z],[p.width*2.3,.7,1.4],[0,a,0]);continue;
        }
        if(town){
          const w=C.world(s+16,side*1.28),arm=C.world(s+16,side*1.03,6.6);
          R.instance('branch','#535c5b',[w.x,w.y+3.25,w.z],[.085,6.5,.085]);R.instance('box','#535c5b',[(w.x+arm.x)*.5,w.y+6.5,(w.z+arm.z)*.5],[Math.hypot(w.x-arm.x,w.z-arm.z),.08,.08],[0,a,0],.5);R.instance('box','#485557',[arm.x,arm.y,arm.z],[.85,.12,.4],[0,a,0],.6);
          R.instance('box','#fff0cb',[arm.x,arm.y-.075,arm.z],[.68,.025,.28],[0,a,0],0,.4,'#817548');
          for(let j=0;j<3;j++){const q=C.world(s+j*5,side*1.42);R.instance('box','#a9937a',[q.x,q.y+.35,q.z],[1.8,.7,1.4],[0,a,0]);for(let k=0;k<5;k++)R.instance('leaf','#677953',[q.x+(rng()-.5)*1.4,q.y+.85+rng()*.3,q.z+(rng()-.5)],[.4,.5,.4]);}
        }else if(canyon){
          const q=C.world(s,side*(2.5+rng()*1.2),-4),height=14+rng()*32;
          for(let j=0;j<4;j++)R.instance('rock',j%2?'#b48b6d':'#c09a78',[q.x+Math.sin(j*2)*1.5,q.y+height*j*.2,q.z],[8-j*.8,height*.23,6-j*.5],[.02*j,a+j*.12,0]);
          for(let j=0;j<5;j++){const q=C.world(s+j*4,side*(1.3+rng()*.4));R.instance('rock','#a78e70',[q.x,q.y+.12,q.z],[.15+rng()*.3,.15+rng()*.4,.25],[rng(),rng(),rng()]);}
        }else{
          const w=C.world(s,side*1.32,5),pole=C.world(s,side*1.4,2.7);R.instance('branch','#576677',[pole.x,pole.y,pole.z],[.09,5.4,.09]);
          R.instance('box','#d2dce3',[w.x,w.y,w.z],[1.3,.12,.55],[0,a,0],.65,.2,'#879eae');
          const q=C.world(s,side*.7,.075),key='wet-patch:'+side;let mat=this.materials.get(key);if(!mat){mat=new KartGL.MeshBasicMaterial({color:side>0?'#8bbbd4':'#cdacd1',transparent:true,opacity:.055,depthWrite:false});this.materials.set(key,mat);}const geo=KartModels.geo('plane'),bin=geo.uuid+mat.uuid;if(!R.batches.has(bin))R.batches.set(bin,{geo,mat,matrices:[]});R.batches.get(bin).matrices.push(KartModels.matrix([q.x,q.y,q.z],[1.6,17,1],[-Math.PI/2,0,-a]));
        }
      }
    }
  },
};
Kart3D.sky=(scene,info)=>KartWorld.sky(scene,info);
Kart3D.tree=(w,rng)=>KartWorld.tree(w,rng);
const kartWorldInstance=Kart3D.instance;Kart3D.instance=function(type,color,pos,scale,rot,metal=0,rough=.8,emit=null){
  let mat=null;if(this.worldMode&&type==='box'&&scale?.[1]>6)mat=KartWorld.material(this.worldMode==='neon'?'glass':'plaster',color);
  if(this.worldMode&&type==='rock')mat=KartWorld.material('rock',color);
  if(!mat)return kartWorldInstance.call(this,type,color,pos,scale,rot,metal,rough,emit);
  const geo=KartModels.geo(type),key=geo.uuid+mat.uuid;if(!this.batches.has(key))this.batches.set(key,{geo,mat,matrices:[]});this.batches.get(key).matrices.push(KartModels.matrix(pos,scale,rot));
};
const kartWorldScenery=Kart3D.scenery;Kart3D.scenery=function(C){this.worldMode=C.info.theme;kartWorldScenery.call(this,C);KartWorld.details(C);this.worldMode=null;};
