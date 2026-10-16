'use strict';
const KartRender={
  poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();},
  camera(race,s,x){
    const C=race.course,p=C.world(s-18,x*.72,9.2),target=C.world(s+42,x*.35,2);
    const dx=target.x-p.x,dy=target.y-p.y,dz=target.z-p.z,h=Math.hypot(dx,dz),len=Math.hypot(dx,dy,dz);
    return {p,rx:dz/h,rz:-dx/h,fx:dx/len,fy:dy/len,fz:dz/len,ux:-dy/len*dx/h,uy:h/len,uz:-dy/len*dz/h,focal:760};
  },
  view(cam,p){const x=p.x-cam.p.x,y=p.y-cam.p.y,z=p.z-cam.p.z;return {x:x*cam.rx+z*cam.rz,y:x*cam.ux+y*cam.uy+z*cam.uz,z:x*cam.fx+y*cam.fy+z*cam.fz};},
  project(cam,p){const v=this.view(cam,p);return {x:640+v.x*cam.focal/v.z,y:342-v.y*cam.focal/v.z,k:cam.focal/v.z,z:v.z};},
  quad(cam,points,color){
    let ps=points.map(p=>this.view(cam,p)),clipped=[];
    for(let i=0;i<ps.length;i++){
      const a=ps[i],b=ps[(i+1)%ps.length];if(a.z>=1.5)clipped.push(a);
      if((a.z<1.5)!==(b.z<1.5)){const t=(1.5-a.z)/(b.z-a.z);clipped.push({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:1.5});}
    }
    if(clipped.length<3)return;
    const out=clipped.map(v=>({x:640+v.x*cam.focal/v.z,y:342-v.y*cam.focal/v.z}));
    if(out.every(v=>v.y>H+8)||out.every(v=>v.y<0)||out.every(v=>v.x<-8)||out.every(v=>v.x>W+8))return;
    this.poly(out,color);
  },
  strip(C,cam,s0,s1,x0,x1,color,h=0){this.quad(cam,[C.world(s0,x0,h),C.world(s0,x1,h),C.world(s1,x1,h),C.world(s1,x0,h)],color);},
  sky(info,heading,time){
    ctx.drawImage(ART.sprite('kart-sky:'+info.id,W,H,c=>{
      const g=c.createLinearGradient(0,0,0,450);g.addColorStop(0,info.sky[0]);g.addColorStop(1,info.sky[1]);c.fillStyle=g;c.fillRect(0,0,W,H);
      if(info.theme==='neon'){
        c.fillStyle='#cdeeff';for(let i=0;i<75;i++){const x=(i*191.7)%W,y=(i*47.1)%285;c.globalAlpha=.3+(i%4)*.15;c.fillRect(x,y,1.5,1.5);}c.globalAlpha=1;
        c.fillStyle='#f6e4cb';c.beginPath();c.arc(985,100,38,0,TAU);c.fill();c.fillStyle=info.sky[0];c.beginPath();c.arc(1001,88,36,0,TAU);c.fill();
      }else{
        c.fillStyle=info.theme==='canyon'?'#ffcb83':'#fff5c7';c.beginPath();c.arc(1010,120,info.theme==='canyon'?58:42,0,TAU);c.fill();
        c.fillStyle='rgba(255,255,255,.28)';for(let i=0;i<8;i++){c.beginPath();c.ellipse(i*193-60,85+(i%3)*49,84,14,0,0,TAU);c.fill();}
      }
    }).img,0,0,W,H);
    const off=heading*160;
    for(let layer=0;layer<2;layer++){
      ctx.fillStyle=info.theme==='town'?(layer?'#729f8e':'#89b6ad'):info.theme==='canyon'?(layer?'#87595e':'#ae7470'):(layer?'#202846':'#36335a');
      ctx.beginPath();ctx.moveTo(0,440);
      for(let x=-100;x<=W+100;x+=40){const q=(x+off*(layer+1))*.008;ctx.lineTo(x,305+layer*55-Math.abs(Math.sin(q)*Math.cos(q*.57))*90);}
      ctx.lineTo(W,500);ctx.lineTo(0,500);ctx.closePath();ctx.fill();
    }
    if(info.theme==='canyon'){
      const vx=930+Math.sin(heading)*170;
      this.poly([{x:vx-280,y:408},{x:vx-28,y:170},{x:vx+27,y:170},{x:vx+290,y:408}],'#76525c');
      this.poly([{x:vx-27,y:171},{x:vx+28,y:171},{x:vx+43,y:190},{x:vx-43,y:190}],'#ffb76e');
      this.poly([{x:vx+11,y:187},{x:vx+48,y:282},{x:vx+39,y:291},{x:vx+83,y:365},{x:vx+49,y:316},{x:vx+32,y:273}],'#dd7e5a');
      ctx.fillStyle='rgba(127,107,124,.36)';for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(vx+i*15-5,140-i*26,24+i*14,20+i*3,-.3,0,TAU);ctx.fill();}
    }
    const g=ctx.createLinearGradient(0,355,0,H);g.addColorStop(0,info.fog);g.addColorStop(.2,info.ground);g.addColorStop(1,shade(info.ground,-.24));ctx.fillStyle=g;ctx.fillRect(0,408,W,H-408);
  },
  propSprite(theme,variant){
    return ART.sprite('kart-prop:'+theme+':'+variant,160,220,c=>{
      const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
      if(theme==='town'){
        if(variant%4===0){
          rect(24,80,112,140,['#ed9b60','#4aa0a7','#da738d'][variant%3]);rect(17,72,126,14,'#e9bd7e');
          rect(65,150,30,70,'#354456');for(let x=40;x<130;x+=55){rect(x,101,25,31,'#37566c');rect(x+3,105,19,22,'#fbd79d');}
          rect(20,133,120,11,'#c45947');rect(32,53,15,20,'#bc6750');
        }else if(variant%4===1){
          rect(19,125,122,86,'#935b3f');rect(27,160,108,45,'#e8ad61');
          for(let i=0;i<8;i++)rect(8+i*18,111,18,34,i%2?'#fff3d9':'#e65b64');
          c.fillStyle='#64b957';for(let i=0;i<7;i++){c.beginPath();c.arc(35+i*14,166,8,0,TAU);c.fill();}
        }else if(variant%4===2){
          rect(74,72,11,148,'#4e6571');c.fillStyle='#ffc53d';c.beginPath();c.arc(80,66,20,0,TAU);c.fill();
          rect(56,38,48,10,'#465c68');rect(73,16,13,24,'#465c68');
        }else{rect(72,99,16,121,'#775c49');c.fillStyle='#3d8260';for(let i=0;i<3;i++){c.beginPath();c.arc(46+i*30,91-(i===1?28:0),40,0,TAU);c.fill();}}
      }else if(theme==='canyon'){
        if(variant%3===0){c.fillStyle='#b07358';c.beginPath();c.moveTo(5,220);c.lineTo(28,76);c.lineTo(65,40);c.lineTo(115,65);c.lineTo(151,220);c.fill();c.fillStyle='#975843';c.beginPath();c.moveTo(65,40);c.lineTo(82,220);c.lineTo(151,220);c.lineTo(115,65);c.fill();rect(28,105,100,8,'#d19b70');}
        else if(variant%3===1){rect(73,70,19,150,'#537c60');rect(30,115,44,17,'#537c60');rect(28,81,17,48,'#537c60');rect(90,145,40,17,'#537c60');rect(116,104,17,56,'#537c60');rect(78,75,4,140,'#72a079');}
        else{rect(71,101,12,119,'#67545d');c.fillStyle='#ffc373';c.beginPath();c.moveTo(10,130);c.lineTo(79,30);c.lineTo(149,130);c.closePath();c.fill();c.fillStyle='#402f3b';c.font='bold 70px sans-serif';c.textAlign='center';c.fillText('!',80,115);}
      }else{
        if(variant%3===0){rect(16,28,127,192,'#152237');rect(16,28,4,192,'#39d9db');rect(139,28,4,192,'#d989ff');rect(16,25,127,4,'#d989ff');for(let y=44;y<211;y+=23)for(let x=34;x<135;x+=27)rect(x,y,12,9,(x+y)%3?'#3d7b9c':'#d989ff');}
        else if(variant%3===1){rect(74,42,10,178,'#415472');rect(26,51,108,60,'#102337');rect(25,48,110,4,'#34e8da');rect(25,110,110,4,'#d989ff');c.fillStyle='#b0fef5';c.font='bold 29px sans-serif';c.textAlign='center';c.fillText('ESMASH',80,91);}
        else{rect(77,0,6,220,'#299ca7');rect(25,28,110,12,'#50f6ed');rect(34,43,91,4,'#d989ff');rect(26,27,8,35,'#50f6ed');rect(120,27,8,35,'#50f6ed');}
      }
    });
  },
  itemIcon(type){return ART.sprite('kart-item-icon:'+type,80,80,c=>{
    c.translate(40,40);c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#133245';
    if(type==='chile'){
      c.rotate(-.6);c.fillStyle='#ffbc56';c.beginPath();c.moveTo(-7,19);c.lineTo(0,37);c.lineTo(8,19);c.fill();
      c.fillStyle='#ef5365';c.beginPath();c.moveTo(-13,-21);c.bezierCurveTo(16,-33,22,5,2,26);c.bezierCurveTo(7,6,-19,5,-13,-21);c.fill();c.stroke();c.strokeStyle='#8bd387';c.lineWidth=7;c.beginPath();c.moveTo(-2,-22);c.quadraticCurveTo(-1,-34,12,-31);c.stroke();c.strokeStyle='#ffb1a0';c.lineWidth=3;c.beginPath();c.moveTo(0,-15);c.quadraticCurveTo(10,-3,7,5);c.stroke();
    }else if(type==='tortilla'){
      c.fillStyle='#f8d389';c.beginPath();c.ellipse(0,0,31,22,-.3,0,TAU);c.fill();c.stroke();c.fillStyle='#c39857';for(let i=0;i<8;i++){c.beginPath();c.arc(Math.sin(i*2)*22,Math.cos(i*2.6)*13,2+i%2,0,TAU);c.fill();}
    }else if(type==='salsa'){
      c.fillStyle='#f26a5a';c.beginPath();c.ellipse(0,9,32,20,0,0,TAU);c.fill();c.stroke();c.fillStyle='#ffb664';c.beginPath();c.ellipse(-4,4,18,8,-.2,0,TAU);c.fill();c.fillStyle='#78c55e';c.fillRect(7,-3,8,5);c.fillRect(-17,9,5,5);
    }else if(type==='turbo'){
      c.rotate(-.3);c.fillStyle='#ffac49';roundRect(c,-30,-21,60,42,19);c.fill();c.stroke();c.strokeStyle='#fff0c2';c.lineWidth=5;for(let i=-15;i<20;i+=15){c.beginPath();c.moveTo(i-2,-13);c.lineTo(i+4,2);c.stroke();}
    }else if(type==='shield'){
      c.fillStyle='rgba(122,243,245,.4)';c.strokeStyle='#c4ffff';c.lineWidth=4;c.beginPath();c.arc(0,0,29,0,TAU);c.fill();c.stroke();c.strokeStyle='#84eeef';c.lineWidth=3;c.beginPath();c.moveTo(0,-17);c.lineTo(16,-12);c.lineTo(13,7);c.quadraticCurveTo(8,18,0,21);c.quadraticCurveTo(-8,18,-13,7);c.lineTo(-16,-12);c.closePath();c.stroke();c.fillStyle='#f1ffff';c.beginPath();c.arc(-13,-16,5,0,TAU);c.fill();
    }else{
      c.fillStyle='#d88dff';c.beginPath();for(let i=0;i<14;i++){const a=i*TAU/14-Math.PI/2,r=i%2?16:33;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.stroke();c.fillStyle='#72e8dd';c.beginPath();c.arc(0,0,15,0,TAU);c.fill();c.fillStyle='#ffe08d';c.fillRect(-10,-4,20,6);c.strokeStyle='#f69fa2';c.lineWidth=3;c.beginPath();c.moveTo(-4,17);c.lineTo(-9,34);c.moveTo(4,17);c.lineTo(12,32);c.stroke();
    }
  });},
  kartSprite(id){
    return ART.sprite('kart-driver:'+id+':'+(FACE_PORT[id]?'photo':'drawn'),180,176,c=>{
      const L=LOOKS[id]||{},color=L.top||L.body||'#e63946',accent=L.accent||L.top||'#e86d4e';
      c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(90,156,77,13,0,0,TAU);c.fill();
      // Original head art and photos, seated in a kart with a visible roll bar.
      c.fillStyle='#172536';roundRect(c,29,80,122,73,12);c.fill();
      c.strokeStyle='#b6c8d5';c.lineWidth=7;c.beginPath();c.moveTo(47,104);c.lineTo(47,50);c.quadraticCurveTo(89,24,132,50);c.lineTo(132,104);c.stroke();
      c.fillStyle=color;roundRect(c,58,66,64,61,18);c.fill();
      c.save();c.translate(90,48);c.scale(1.17,1.17);drawHead(c,id,'normal');c.restore();
      for(const x of [12,135]){c.fillStyle='#111a25';roundRect(c,x,116,32,43,9);c.fill();c.fillStyle='#445567';c.fillRect(x+5,121,4,31);c.fillRect(x+23,121,4,31);}
      const g=c.createLinearGradient(0,97,0,151);g.addColorStop(0,shade(accent,.38));g.addColorStop(.4,accent);g.addColorStop(1,shade(accent,-.45));c.fillStyle=g;roundRect(c,34,101,112,50,12);c.fill();
      c.strokeStyle=shade(accent,.55);c.lineWidth=2;c.beginPath();c.moveTo(39,106);c.lineTo(141,106);c.stroke();
      c.fillStyle='#163445';c.beginPath();c.moveTo(73,104);c.lineTo(106,104);c.lineTo(117,143);c.lineTo(63,143);c.fill();
      c.fillStyle='#bcd7dd';roundRect(c,49,140,82,12,4);c.fill();c.fillStyle='#f6626e';c.fillRect(41,119,18,9);c.fillRect(122,119,18,9);
      c.fillStyle='#071a25';c.fillRect(77,144,27,19);c.fillStyle='#8aa3b2';c.fillRect(80,147,21,5);
      for(const x of [50,119]){c.fillStyle='#142432';roundRect(c,x,145,13,19,3);c.fill();c.fillStyle='#738a9b';c.fillRect(x+2,145,9,3);}
      c.fillStyle='#f7f2d9';c.font=`700 16px ${FONT_BODY}`;c.textAlign='center';c.fillText(CHARS[id].name.slice(0,9),90,134);
    });
  },
  gantry(C,cam,s,theme,time){
    const c=theme==='neon'?'#5bf6ef':'#d2e3dc';
    for(const side of [-1,1])this.quad(cam,[C.world(s,side*1.1),C.world(s,side*1.18),C.world(s,side*1.18,10),C.world(s,side*1.1,10)],c);
    const corners=[C.world(s,-1.18,8.2),C.world(s,1.18,8.2),C.world(s,1.18,11.8),C.world(s,-1.18,11.8)];
    this.quad(cam,corners,'#142b3d');
    const l=this.project(cam,corners[3]),r=this.project(cam,corners[2]);
    if(l.z>2&&r.z>2&&l.y>-80&&l.y<720){const size=clamp(Math.abs(r.x-l.x)*.07,5,66);text('ESMASH KART  /  META',(l.x+r.x)/2,(l.y+r.y)/2+size*.8,size,'#ffdf89',{weight:700});}
  },
  bunting(C,cam,s,time){
    const a=this.project(cam,C.world(s,-1.4,7.5)),b=this.project(cam,C.world(s,1.4,7.5));if(a.z<3||b.z<3||a.y>H||b.y>H)return;
    ctx.strokeStyle='#cbdccc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    for(let j=0;j<12;j++){const t=j/12,p={x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)},n={x:lerp(a.x,b.x,(j+.65)/12),y:lerp(a.y,b.y,(j+.65)/12)};this.poly([p,n,{x:(p.x+n.x)/2+Math.sin(time*2+j)*2,y:(p.y+n.y)/2+Math.abs(b.x-a.x)*.045}],['#fbc45f','#ec7390','#64e5d0','#9b9def'][j%4]);}
  },
  object(cam,C,s,x,type,opts={}){
    const p=this.project(cam,C.world(s,x,opts.h||0));if(p.z<2||p.x<-300||p.x>W+300||p.y<-300||p.y>H+300)return;
    const k=p.k;
    ctx.save();ctx.translate(p.x,p.y);
    if(type==='kart'){
      const r=opts.r,scale=k*.042;
      if(r.invuln&&Math.floor(opts.time*12)%2)ctx.globalAlpha=.5;
      if(r.rescue)ctx.translate(0,-30*r.rescue*k*.05);
      if(r.air)ctx.translate(0,-Math.sin(r.air/.25*Math.PI)*k*.7);
      if(r.stun)ctx.rotate(Math.sin(opts.time*23)*.2);
      else ctx.rotate((r.drift?r.driftDir*.12:r.steer*.035));
      if(r.shield){ctx.fillStyle='rgba(112,241,245,.18)';ctx.strokeStyle='#9cffff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-75*scale,90*scale,88*scale,0,0,TAU);ctx.fill();ctx.stroke();}
      if(r.turbo){this.poly([{x:-22*scale,y:-5*scale},{x:0,y:(35+Math.sin(opts.time*44)*12)*scale},{x:22*scale,y:-5*scale}],'#53e8f6');}
      const sprite=this.kartSprite(r.id);ctx.drawImage(sprite.img,-90*scale,-160*scale,180*scale,176*scale);
      if(r.drift){ctx.fillStyle=r.charge>2?'#da9fff':r.charge>1.3?'#ffc53d':'#6deaff';for(const side of [-1,1]){ctx.beginPath();ctx.arc(side*68*scale,2*scale,(5+Math.sin(opts.time*60)*2)*scale,0,TAU);ctx.fill();}}
      if(!r.human&&opts.label&&k>2){ctx.fillStyle='rgba(4,15,26,.78)';roundRect(ctx,-48,-191*scale,96,23,7);ctx.fill();text(CHARS[r.id].name,0,-191*scale+12,12,'#fff',{body:true,weight:600});}
    }else if(type==='prop'){
      const sp=this.propSprite(opts.theme,opts.variant),size=k*(opts.theme==='town'? .065:.075);ctx.drawImage(sp.img,-80*size,-220*size,160*size,220*size);
    }else if(type==='box'){
      const size=clamp(k*1.65,2,90),bob=Math.sin(opts.time*3+s)*size*.12;
      ctx.translate(0,-size*.8+bob);ctx.rotate(Math.sin(opts.time+s)*.13);ctx.fillStyle='#6bf3f2';ctx.strokeStyle='#efffff';ctx.lineWidth=Math.max(1,size*.06);
      roundRect(ctx,-size/2,-size/2,size,size,size*.15);ctx.fill();ctx.stroke();
      text('?',0,0,size*.86,'#173f56',{weight:700,stroke:null});
    }else if(['crate','rock','barrier'].includes(type)){
      const size=k*(type==='rock'?2.2:2);ctx.fillStyle=type==='rock'?'#aa8976':type==='crate'?'#ae7446':'#ed6c89';
      if(type==='rock'){ctx.beginPath();ctx.moveTo(-size,0);ctx.lineTo(-size*.75,-size);ctx.lineTo(size*.1,-size*1.3);ctx.lineTo(size,-size*.6);ctx.lineTo(size,0);ctx.closePath();ctx.fill();}
      else{roundRect(ctx,-size,-size*1.5,size*2,size*1.5,size*.1);ctx.fill();ctx.strokeStyle='#ffdda7';ctx.lineWidth=Math.max(1,size*.12);ctx.beginPath();ctx.moveTo(-size*.8,-size*.2);ctx.lineTo(size*.8,-size*1.3);ctx.moveTo(-size*.8,-size*1.3);ctx.lineTo(size*.8,-size*.2);ctx.stroke();}
    }else if(KART_ITEMS[type]&&type!=='salsa'){
      const sp=this.itemIcon(type),size=k*(type==='pinata'?3.6:2.8);ctx.translate(0,-size*.6);if(type!=='chile')ctx.rotate(opts.time*5);ctx.drawImage(sp.img,-size/2,-size/2,size,size);
    }else{
      const size=k*(type==='hit'?3*(1-opts.life/opts.max)+1:type==='salsa'?1.8:1),item=KART_ITEMS[type];
      ctx.fillStyle=item?item.color:opts.color||'#9af7ff';
      if(type==='salsa'){ctx.beginPath();ctx.ellipse(0,-2,size*1.4,size*.35,0,0,TAU);ctx.fill();}
      else{ctx.translate(0,-size);ctx.rotate(opts.time*8);ctx.beginPath();for(let i=0;i<10;i++){const a=i*TAU/10,r=size*(i%2?.55:1);i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}
    }
    ctx.restore();
  },
  draw(race,alpha=1){
    const C=race.course,info=C.info,r=race.player,s=lerp(r.ps,r.s,alpha),x=lerp(r.px,r.x,alpha),cam=this.camera(race,s,x);
    this.sky(info,Math.atan2(cam.fx,cam.fz),race.time);
    // Bucket visible objects once. Far-to-near terrain also occludes sprites over crests.
    const ds=12,far=IS_XBOX||ART.lite?780:1008,objects=new Map(),base=Math.floor((s-12)/ds)*ds;
    const add=(s0,x0,type,opts)=>{const d=KartMath.delta(s0,s,C.length);if(d< -10||d>far)return;const i=Math.floor((s+d-base)/ds);if(!objects.has(i))objects.set(i,[]);objects.get(i).push({s:s0,x:x0,type,opts});};
    for(const b of C.boxes)if(b.ready<=race.time)add(b.s,b.x,'box',{time:race.time});
    for(const h of C.hazards)add(h.s,C.hazardX(h,race.time),h.type,{time:race.time});
    for(const q of race.projectiles)add(lerp(q.ps,q.s,alpha),q.x,q.type,{time:race.time});
    for(const e of race.effects)add(e.s,e.x,e.type,{...e,time:race.time});
    const labeled=new Set(race.racers.filter(q=>q!==r&&KartMath.delta(q.s,s,C.length)>0).sort((a,b)=>KartMath.delta(a.s,s,C.length)-KartMath.delta(b.s,s,C.length)).slice(0,2));
    for(const q of race.racers)if(q!==r)add(lerp(q.ps,q.s,alpha),lerp(q.px,q.x,alpha),'kart',{r:q,time:race.time,label:labeled.has(q)});
    add(s,x,'kart',{r,time:race.time});
    for(let i=Math.floor(far/ds);i>=0;i--){
      const a=base+i*ds,b=a+ds,p=C.sample(a),fog=clamp(i*ds/far,0,1)*.7;
      const mix=(color)=>{const c=parseColor(color),f=parseColor(info.fog);return `rgb(${Math.round(lerp(c[0],f[0],fog))},${Math.round(lerp(c[1],f[1],fog))},${Math.round(lerp(c[2],f[2],fog))})`;};
      const stripe=Math.floor(KartMath.wrap(a,C.length)/24)%2;
      if(p.zone==='bridge'){
        this.strip(C,cam,a,b,-1.06,1.06,mix('#25394a'),-.5);
        for(const side of [-1,1]){this.quad(cam,[C.world(a,side*1.06),C.world(b,side*1.06),C.world(b,side*1.06,1.2),C.world(a,side*1.06,1.2)],mix(info.edge));}
      }else this.strip(C,cam,a,b,-9,9,mix(stripe?info.ground:shade(info.ground,-.025)),-.28);
      this.strip(C,cam,a,b,-1.08,1.08,mix(stripe?info.edge:'#eae1ca'));
      this.strip(C,cam,a,b,-1,1,mix(p.zone==='wet'?'#304f69':p.zone==='gravel'?'#897464':stripe?info.road:shade(info.road,.025)),.018);
      if(p.zone==='wet'&&stripe)this.strip(C,cam,a,b,.1,.65,mix('#56839d'),.025);
      for(const side of [-.95,.95])this.strip(C,cam,a,b,side-.012,side+.012,mix(info.theme==='neon'?'#6cffe9':'#f6e6c6'),.028);
      if(stripe)for(const lane of [-.34,.34])this.strip(C,cam,a,b,lane-.012,lane+.012,mix('#e5e2c7'),.03);
      if(KartMath.wrap(a,C.length)<24){for(let j=0;j<12;j++)this.strip(C,cam,a,b,-1+j/6,-1+(j+1)/6,(j+stripe)%2?'#faf2da':'#1e2c38',.04);}
      for(const bo of C.boosts)if(Math.abs(KartMath.delta(bo.s,a,C.length))<10){
        this.strip(C,cam,a,b,bo.x-.3,bo.x+.3,stripe?'#64fff1':'#27a9c2',.045);
        const q=this.project(cam,C.world(a,bo.x,.06));if(q.z>2&&q.y>0&&q.y<H){text('»',q.x,q.y,clamp(q.k*2,4,48),'#eeffff',{weight:700});}
      }
      const propIndex=Math.floor(KartMath.wrap(a,C.length)/ds);
      if(propIndex%5===0&&p.zone!=='bridge')for(const side of [-1,1])this.object(cam,C,a,side*(1.65+(propIndex%3)*.2),'prop',{theme:info.theme,variant:(propIndex+(side>0?2:0))%7});
      const local=KartMath.wrap(a,C.length);
      if(local<ds)this.gantry(C,cam,a-local,info.theme,race.time);
      if(info.theme==='town'&&Math.floor(local/160)%3===1&&local%160<ds)this.bunting(C,cam,a,race.time);
      const bucket=objects.get(i);if(bucket){bucket.sort((a,b)=>KartMath.delta(b.s,a.s,C.length));for(const q of bucket)this.object(cam,C,q.s,q.x,q.type,q.opts);}
    }
    if(!reducedMotion&&r.turbo){ctx.strokeStyle='rgba(159,244,255,.38)';ctx.lineWidth=2;for(let i=0;i<18;i++){const a=i*TAU/18,t=(race.time*4+i*.618)%1,rad=300+t*400;ctx.beginPath();ctx.moveTo(640+Math.cos(a)*rad,360+Math.sin(a)*rad*.7);ctx.lineTo(640+Math.cos(a)*(rad+60),360+Math.sin(a)*(rad+60)*.7);ctx.stroke();}}
    this.hud(race);
  },
  map(C,x,y,w,h,racers=null,selected=0){
    const ps=C.samples,minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),minZ=Math.min(...ps.map(p=>p.z)),maxZ=Math.max(...ps.map(p=>p.z));
    const scale=Math.min((w-18)/(maxX-minX),(h-18)/(maxZ-minZ)),ox=x+(w-(maxX-minX)*scale)/2,oy=y+(h-(maxZ-minZ)*scale)/2;
    const point=p=>({x:ox+(p.x-minX)*scale,y:oy+(maxZ-p.z)*scale});
    ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();for(let i=0;i<ps.length;i+=4){const p=point(ps[i]);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.closePath();ctx.strokeStyle='#071622';ctx.lineWidth=racers?8:13;ctx.stroke();ctx.strokeStyle=C.info.accent;ctx.lineWidth=racers?3:5;ctx.stroke();
    const start=point(ps[0]);ctx.fillStyle='#f7f7ec';ctx.fillRect(start.x-4,start.y-4,8,8);
    if(racers)for(const r of racers.slice().reverse()){const p=point(C.sample(r.s));ctx.beginPath();ctx.arc(p.x,p.y,r.human?5.5:3.3,0,TAU);ctx.fillStyle=r.human?'#fff7bd':PLAYER_COLORS[r.index%4];ctx.fill();if(r.human){ctx.strokeStyle='#152537';ctx.lineWidth=2;ctx.stroke();}}
    ctx.lineCap='butt';
  },
  time(t){if(t===null||t===undefined)return '—';const m=Math.floor(t/60),s=Math.floor(t%60),ms=Math.floor(t%1*1000);return `${m}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;},
  panel(x,y,w,h){ctx.fillStyle='rgba(6,18,31,.82)';roundRect(ctx,x,y,w,h,15);ctx.fill();ctx.strokeStyle='rgba(179,228,239,.16)';ctx.lineWidth=1;ctx.stroke();},
  hud(race){
    const r=race.player,pos=race.order.indexOf(r)+1,info=race.course.info;
    this.panel(22,20,224,99);text(String(pos),57,69,70,'#ffc53d',{weight:700});text('/ 8',99,83,23,'#a8becd',{body:true,weight:700});
    text('VUELTA',169,43,13,'#a8becd',{body:true,weight:700});text(`${Math.min(3,r.completedLaps+1)} / 3`,169,78,39,'#f5f7ef',{weight:700});
    this.panel(476,20,328,66);text(info.name,640,41,16,'#d0e5e7',{body:true,weight:600});text(this.time(r.finish===null?race.time:r.finish),640,66,28,'#fff6d8',{weight:700});
    this.panel(1050,20,206,187);this.map(race.course,1062,28,182,162,race.racers);
    if(!TouchPad.active){this.panel(1088,588,168,105);text(Math.round(r.v*1.8)+'',1172,627,59,'#fff5d1',{weight:700});text('km/h',1172,671,15,'#b7d0dd',{body:true});}
    this.panel(22,137,222,90);
    const item=r.item?KART_ITEMS[r.item]:null,rolling=r.roulette>0;
    ctx.fillStyle=item?'#15374c':rolling?'#8ee9ee':'#284356';roundRect(ctx,34,149,60,60,12);ctx.fill();if(item){ctx.drawImage(this.itemIcon(r.item).img,34,149,60,60);}else text(rolling?'?':'—',64,180,29,'#092334',{weight:700});
    text(rolling?'SORTEANDO…':item?'ÍTEM LISTO':'BUSCA UNA CAJA',163,163,12,'#b8cbd4',{body:true,weight:700});
    text(item?item.name:'Vacío',163,190,item?15:19,item?item.color:'#f3f5eb',{body:true,weight:700});
    if(item&&!TouchPad.active){text(item.desc,26,242,12,'#f2f5ec',{body:true,align:'left',weight:600,stroke:'#102335',strokeW:3});}
    if(!TouchPad.active){text('W / ↑ acelerar   S / ↓ frenar   A D / ← → girar',26,666,13,'#f5f6ef',{body:true,align:'left',stroke:'#071725',strokeW:3});text('Espacio: derrape   E / J: ítem   Q: atrás   Esc: pausa',26,691,13,'#d4e3e9',{body:true,align:'left',stroke:'#071725',strokeW:3});}
    if(r.drift){this.panel(464,642,352,46);const col=r.charge>2?'#d989ff':r.charge>1.3?'#ffc53d':'#69e9ee';ctx.fillStyle='#294255';roundRect(ctx,480,660,210,10,5);ctx.fill();ctx.fillStyle=col;roundRect(ctx,480,660,Math.max(1,210*r.charge/2.7),10,5);ctx.fill();text('SUELTA → TURBO',750,666,13,col,{body:true,weight:700});}
    const curve=race.course.sample(r.s+r.v*.8+40).curve;
    if(Math.abs(curve)>.0035&&race.phase==='race'){this.panel(554,106,172,47);text(`${curve>0?'↱':'↰'} ${Math.abs(curve)>.007?'HORQUILLA':'CURVA'}`,640,131,23,'#ffdd99',{weight:700});}
    let y=245;for(const m of race.messages){const a=clamp(m.life*2,0,1);ctx.globalAlpha=a;sfText(m.msg,W/2,y,37,m.color);ctx.globalAlpha=1;y+=44;}
    if(race.phase==='grid'){
      const n=Math.ceil(race.countdown);ctx.fillStyle='rgba(6,14,27,.25)';ctx.fillRect(0,0,W,H);
      sfText(n>3?'PREPÁRATE':String(n),640,320,n>3?64:142,n===1?'#6dffe1':'#fff3c6');
      text('Acelera al final del 2 para una salida turbo',640,420,20,'#fff7e6',{body:true,weight:600,stroke:'#112232',strokeW:4});
      text(`${CHARS[r.id].name}  ·  ${race.cc.name}  ·  3 vueltas`,640,462,19,'#d1edec',{body:true,weight:600,stroke:'#112232',strokeW:4});
    }
    if(r.rescue){sfText('RESCATE',640,420,64,'#ffcf9c');text('R / Y también te devuelve al centro',640,475,18,'#fff',{body:true});}
    if(race.phase==='finish'&&race.resultTime<2.5){sfText('¡META!',640,350,132,'#fff0a9');text(`${pos}.º lugar  ·  ${this.time(r.finish)}`,640,435,30,'#fff',{body:true,weight:700});}
  },
};
