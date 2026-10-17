'use strict';
const KartRender={
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
    }else if(type==='triple'){
      const sp=this.itemIcon('chile');for(let i=0;i<3;i++)c.drawImage(sp.img,-33+i*20,-35+(i%2)*14,42,50);
    }else if(type==='boomerang'){
      c.strokeStyle='#e8b46b';c.lineWidth=15;c.beginPath();c.moveTo(-26,23);c.lineTo(0,-22);c.lineTo(26,23);c.stroke();c.strokeStyle='#fcdd9f';c.lineWidth=3;c.stroke();
    }else if(type==='lightning'){
      c.fillStyle='#ffe290';c.beginPath();c.moveTo(3,-34);c.lineTo(-25,6);c.lineTo(-2,3);c.lineTo(-8,35);c.lineTo(25,-10);c.lineTo(5,-8);c.closePath();c.fill();c.stroke();
    }else if(type==='magnet'){
      c.strokeStyle='#f595bd';c.lineWidth=16;c.beginPath();c.moveTo(-20,-23);c.lineTo(-20,7);c.arc(0,7,20,Math.PI,0,true);c.lineTo(20,-23);c.stroke();c.fillStyle='#e9f9fb';c.fillRect(-28,-27,16,12);c.fillRect(12,-27,16,12);
    }else if(type==='spring'){
      c.strokeStyle='#a3e59b';c.lineWidth=5;c.beginPath();for(let i=0;i<7;i++)c.ellipse(0,-23+i*7,22,7,0,0,TAU);c.stroke();
    }else if(type==='star'){
      c.fillStyle='#ffdc7c';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*TAU/10,r=i%2?15:34;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.stroke();
    }else{
      c.fillStyle='#d88dff';c.beginPath();for(let i=0;i<14;i++){const a=i*TAU/14-Math.PI/2,r=i%2?16:33;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.stroke();c.fillStyle='#72e8dd';c.beginPath();c.arc(0,0,15,0,TAU);c.fill();c.fillStyle='#ffe08d';c.fillRect(-10,-4,20,6);c.strokeStyle='#f69fa2';c.lineWidth=3;c.beginPath();c.moveTo(-4,17);c.lineTo(-9,34);c.moveTo(4,17);c.lineTo(12,32);c.stroke();
    }
  });},
  kartSprite(id,vehicle=0){
    const rendered=Kart3D.thumbnail(id,vehicle);if(rendered)return rendered;
    return ART.sprite('kart-rear:'+id,180,180,c=>{
      c.fillStyle='#182b3d';c.fillRect(0,0,180,180);c.fillStyle=LOOKS[id]?.top||'#e86961';
      roundRect(c,36,100,108,45,12);c.fill();c.fillStyle='#253044';c.fillRect(16,115,25,39);c.fillRect(139,115,25,39);
      c.fillStyle=LOOKS[id]?.hair||'#34323b';c.beginPath();c.arc(90,69,23,0,TAU);c.fill();
    });
  },
  draw(race,alpha=1){Kart3D.draw(race,alpha);},
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
  panel(x,y,w,h,edge=null){ctx.fillStyle='rgba(6,18,31,.82)';roundRect(ctx,x,y,w,h,15);ctx.fill();ctx.strokeStyle=edge||'rgba(179,228,239,.16)';ctx.lineWidth=edge?2:1;ctx.stroke();},
  viewports(n){
    if(n<=1)return [{x:0,y:0,w:W,h:H}];
    if(n===2)return [{x:0,y:0,w:W/2,h:H},{x:W/2,y:0,w:W/2,h:H}];
    if(n===3)return [{x:0,y:0,w:W/2,h:H},{x:W/2,y:0,w:W/2,h:H/2},{x:W/2,y:H/2,w:W/2,h:H/2}];
    return Array.from({length:4},(_,i)=>({x:i%2*W/2,y:Math.floor(i/2)*H/2,w:W/2,h:H/2}));
  },
  splitHud(race,r,b){
    ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();ctx.translate(b.x,b.y);
    const color=PLAYER_COLORS[r.index%4],mine=r===race.player&&!race.spectator,short=b.h<500;
    ctx.strokeStyle=mine?GOLD:'rgba(196,224,236,.7)';ctx.lineWidth=mine?4:2;ctx.strokeRect(1,1,b.w-2,b.h-2);
    this.panel(12,12,258,56);text(String(race.order.indexOf(r)+1)+'.º',40,39,36,GOLD,{weight:700});
    text('VUELTA '+Math.min(3,r.completedLaps+1)+'/3',91,28,15,PAPER,{align:'left',body:true,weight:700});
    text(this.time(r.finish===null?race.time:r.finish),91,51,17,'#b7dce4',{align:'left',body:true,weight:600});
    this.panel(12,b.h-48,b.w-24,36);ctx.fillStyle=color;ctx.fillRect(21,b.h-38,5,15);
    const label=(mine?CHARS[r.id].name:r.label||CHARS[r.id].name)+(mine?' · TÚ':'')+(r.disconnected?' · CPU temporal':'');
    text(label,34,b.h-29,16,mine?GOLD:PAPER,{body:true,align:'left',weight:700});
    text(Math.round(r.v*1.8)+' km/h  ·  ● '+r.coins,b.w-25,b.h-29,16,'#e8f3ee',{body:true,align:'right',weight:600});
    this.panel(12,80,170,54);if(r.item)ctx.drawImage(this.itemIcon(r.item).img,18,84,46,46);
    else text(r.roulette>0?'?':'—',42,107,30,'#a9d4dc',{weight:700});
    text(r.item?KART_ITEMS[r.item].name:r.roulette>0?'Sorteando…':'Sin ítem',72,106,13,r.item?KART_ITEMS[r.item].color:'#bfd5dd',{body:true,align:'left',weight:700});
    const cam=AV.videoFor(r.peer);if(cam){ctx.save();roundRect(ctx,b.w-94,short?76:72,80,60,9);ctx.clip();drawVideoCover(ctx,cam.v,b.w-94,short?76:72,80,60,cam.mirror);ctx.restore();}
    if(!short)this.map(race.course,b.w-166,152,150,112,race.racers);
    if(r.drift){const col=r.charge>2?'#d989ff':r.charge>1.3?GOLD:TEAL;ctx.fillStyle='#24354c';ctx.fillRect(b.w/2-95,b.h-69,190,8);ctx.fillStyle=col;ctx.fillRect(b.w/2-95,b.h-69,190*r.charge/2.7,8);}
    if(race.phase==='grid'){sfText(Math.ceil(race.countdown)>3?'PREPÁRATE':Math.ceil(race.countdown),b.w/2,b.h*.5,short?74:106,GOLD);}
    if(r.finish!==null){sfText('¡META!',b.w/2,b.h*.52,short?53:77,GOLD);text('Esperando a los demás pilotos',b.w/2,b.h*.52+49,16,PAPER,{body:true,stroke:'#102335',strokeW:3});}
    if(r.rescue)text('Regresando a la pista',b.w/2,short?151:169,13,'#c6e4eb',{body:true,stroke:'#102335',strokeW:3});
    if(mine&&Net.role==='guest'&&performance.now()-KartOnline.lastStateAt>1500){text('Reconectando con la carrera…',b.w/2,b.h-88,18,GOLD,{body:true,stroke:'#102335',strokeW:3});}
    ctx.restore();
  },
  hud(race){
    const r=race.player,pos=race.order.indexOf(r)+1,info=race.course.info;
    if(race.online){let y=306;for(const p of race.racers.filter(p=>p.human&&p!==r).slice(0,3)){const cam=AV.videoFor(p.peer);if(!cam)continue;this.panel(22,y,140,91);ctx.save();roundRect(ctx,28,y+6,128,66,6);ctx.clip();drawVideoCover(ctx,cam.v,28,y+6,128,66,cam.mirror);ctx.restore();text((p.label||CHARS[p.id].name).slice(0,17),92,y+80,12,PAPER,{body:true,weight:700});y+=98;}}
    this.panel(22,20,224,99);text(String(pos),57,69,70,'#ffc53d',{weight:700});text('/ 8',99,83,23,'#a8becd',{body:true,weight:700});
    text('VUELTA',169,43,13,'#a8becd',{body:true,weight:700});text(`${Math.min(3,r.completedLaps+1)} / 3`,169,78,39,'#f5f7ef',{weight:700});
    this.panel(476,20,328,66);text(info.name,640,41,16,'#d0e5e7',{body:true,weight:600});text(this.time(r.finish===null?race.time:r.finish),640,66,28,'#fff6d8',{weight:700});
    this.panel(1050,20,206,187);this.map(race.course,1062,28,182,162,race.racers);
    this.panel(1094,222,162,41);text('●  '+r.coins+' / 10',1174,243,22,'#ffdc7c',{weight:700});
    if(r.slip>.1){this.panel(1094,273,162,45);text('REBUFO',1175,285,13,'#8ee7ee',{body:true,weight:700});ctx.fillStyle='#73e4ed';ctx.fillRect(1105,303,140*clamp(r.slip/2,0,1),4);}
    if(!TouchPad.active){this.panel(1088,588,168,105);text(Math.round(r.v*1.8)+'',1172,627,59,'#fff5d1',{weight:700});text('km/h',1172,671,15,'#b7d0dd',{body:true});}
    this.panel(22,137,222,90);
    const item=r.item?KART_ITEMS[r.item]:null,rolling=r.roulette>0;
    ctx.fillStyle=item?'#15374c':rolling?'#8ee9ee':'#284356';roundRect(ctx,34,149,60,60,12);ctx.fill();if(item){ctx.drawImage(this.itemIcon(r.item).img,34,149,60,60);}else text(rolling?'?':'—',64,180,29,'#092334',{weight:700});
    text(rolling?'SORTEANDO…':item?'ÍTEM LISTO':'BUSCA UNA CAJA',163,163,12,'#b8cbd4',{body:true,weight:700});
    text(item?item.name:'Vacío',163,190,item?15:19,item?item.color:'#f3f5eb',{body:true,weight:700});
    if(item&&!TouchPad.active){text('E / J / LB: lanzar  ·  Q / B: lanzar atrás',26,243,12,'#f2f5ec',{body:true,align:'left',weight:600,stroke:'#102335',strokeW:3});}
    if(r.drift){this.panel(464,642,352,46);const col=r.charge>2?'#d989ff':r.charge>1.3?'#ffc53d':'#69e9ee';ctx.fillStyle='#294255';roundRect(ctx,480,660,210,10,5);ctx.fill();ctx.fillStyle=col;roundRect(ctx,480,660,Math.max(1,210*r.charge/2.7),10,5);ctx.fill();text('SUELTA → TURBO',750,666,13,col,{body:true,weight:700});}
    for(const m of race.messages){ctx.save();ctx.globalAlpha=clamp(m.life*3,0,1);this.panel(500,103,280,35);text(m.msg,640,121,18,m.color,{body:true,weight:700});ctx.restore();}
    if(race.phase==='grid'){
      const n=Math.ceil(race.countdown);ctx.fillStyle='rgba(6,14,27,.25)';ctx.fillRect(0,0,W,H);
      sfText(n>3?'PREPÁRATE':String(n),640,320,n>3?64:142,n===1?'#6dffe1':'#fff3c6');
      text('Acelera al final del 2 para una salida turbo',640,420,20,'#fff7e6',{body:true,weight:600,stroke:'#112232',strokeW:4});
      text(`${CHARS[r.id].name}  ·  ${race.cc.name}  ·  3 vueltas`,640,462,19,'#d1edec',{body:true,weight:600,stroke:'#112232',strokeW:4});
    }
    if(r.rescue){this.panel(1088,552,168,30);text('Regresando a pista',1172,568,12,'#c6e4eb',{body:true});}
    if(race.phase==='finish'&&race.resultTime<2.5){sfText('¡META!',640,350,132,'#fff0a9');text(`${pos}.º lugar  ·  ${this.time(r.finish)}`,640,435,30,'#fff',{body:true,weight:700});}
  },
};
