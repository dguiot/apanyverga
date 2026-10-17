'use strict';
const FPSMenu={
 char:0,gun:2,count:1,
 enter(){Net.leave();FPSOnline.browsing=false;APP.go('fpsGarage');},
 exit(){document.exitPointerLock?.();FPSControls.reset();APP.fps=null;FPSView.dispose();APP.menuSel=10;APP.go('main');},
 start(){
  if(this.count>1&&padInfo.length<this.count-1){Toasts.push('Para '+this.count+' jugadores locales conecta '+(this.count-1)+' mandos; P1 usa teclado y ratón.');return;}
  const roster=Array.from({length:4},(_,i)=>({id:CHAR_ORDER[(this.char+i*3)%CHAR_ORDER.length],gun:i?i%5:this.gun,bot:i>=this.count}));
  APP.fps=new FPSMatch(roster);FPSControls.reset();APP.go('fpsGame');FPSControls.lock();
 },
 characterRect(i){return {x:40+i%5*137,y:134+Math.floor(i/5)*116,w:127,h:105};},
};
const fpsChoose=APP.mainChoose;APP.mainChoose=function(i){if(i===10)return FPSMenu.enter();return fpsChoose.call(this,i);};
const fpsOptions=APP.mainOptions;APP.mainOptions=function(){return [...fpsOptions.call(this),'FPS'];};
APP.mainRect=function(i){const top=[0,9,10].indexOf(i);if(top>=0)return {x:54+top*400,y:130,w:372,h:208};const j=i-1;return {x:74+j%2*580,y:367+Math.floor(j/2)*57,w:552,h:48};};
APP.mainUpdate=function(){
 for(const d of Devices.list){const n=Devices.nav(d),old=this.menuSel,top=[0,9,10],at=top.indexOf(old);let i=old;
  if(n.right||n.left)i=at>=0?top[(at+(n.right?1:2))%3]:old%2?old+1:old-1;
  if(n.down)i=at>=0?at===0?1:2:old>6?old%2?0:10:old+2;
  if(n.up)i=at>=0?at===0?7:8:old<3?old===1?0:9:old-2;
  if(i!==old){this.menuSel=i;Audio8.sfx('menu');}if(n.confirm||n.start){this.firstDev=d;return this.mainChoose(i);}if(n.back)return this.go('title');
 }
 for(let i=0;i<11;i++)if(KartMenu.hit(this.mainRect(i))){this.menuSel=i;return this.mainChoose(i);}
};
APP.mainDraw=function(){
 drawMenuBG(1);sfText('ELIGE TU JUEGO',640,58,59,PAPER);text('ESMASH BROS  /  TUS PERSONAJES, TRES FORMAS DE JUGAR',640,100,15,'#b2c5d4',{body:true,weight:700});
 for(const [i,title,desc,tag,color] of [[0,'PELEAS','Golpes, especiales y Smash.','1–4 · LOCAL Y ONLINE','#572035'],[9,'ESMASH KART','Derrapes, ítems y acrobacias.','3 PISTAS · TU PROPIA VISTA ONLINE','#123a50'],[10,'FPS','Explora, apunta y conquista.','5 ARMAS · MUNDO ABIERTO · ONLINE','#25433e']]){
  const b=this.mainRect(i),on=this.menuSel===i||hover(b.x,b.y,b.w,b.h);slab(b.x,b.y,b.w,b.h,{skew:.07,edge:on?GOLD:'rgba(131,168,190,.4)',lw:on?4:2,top:color,bottom:'#0b1829'});sfText(title,b.x+24,b.y+48,39,on?GOLD:PAPER,{align:'left'});text(desc,b.x+24,b.y+93,16,'#d0e3e9',{body:true,align:'left'});text(tag,b.x+24,b.y+178,12,TEAL,{body:true,align:'left',weight:700});
  ctx.strokeStyle=i===10?'#8fc9b9':i===9?'#71bdce':'#cd7e88';ctx.lineWidth=2;ctx.beginPath();for(let j=0;j<5;j++){const x=b.x+24+j*53,y=b.y+132;if(i===10){ctx.moveTo(x,y);ctx.lineTo(x+35,y);ctx.moveTo(x+17,y-11);ctx.lineTo(x+17,y+11);}else{ctx.moveTo(x,y+Math.sin(j)*10);ctx.lineTo(x+35,y+Math.cos(j)*10);}}ctx.stroke();
 }
 const opts=this.mainOptions();for(let i=1;i<9;i++){const b=this.mainRect(i);sfButton(opts[i],b.x,b.y,b.w,b.h,this.menuSel===i||hover(b.x,b.y,b.w,b.h));}text('A / J / Enter: elegir  ·  Cruceta / flechas: moverte  ·  B / K / Esc: volver',640,634,16,'#d1dce5',{body:true});text('ESMASH BROS',640,692,22,'#7593a7',{weight:700});
};
const fpsFocus=APP.focusNative;APP.focusNative=function(d){if(this.screen==='main'){const items=Array.from({length:11},(_,i)=>this.mainRect(i));return {items,cur:items[this.menuSel],own:()=>true,sel:i=>this.menuSel=i};}if(this.screen.startsWith('fps'))return false;return fpsFocus.call(this,d);};
APP.fpsGarageUpdate=function(){
 const M=FPSMenu;for(const d of Devices.list){const n=Devices.nav(d);if(n.back)return M.exit();if(n.left)M.char=(M.char+14)%15;if(n.right)M.char=(M.char+1)%15;if(n.up)M.char=(M.char+10)%15;if(n.down)M.char=(M.char+5)%15;if(n.shield)M.gun=(M.gun+1)%5;if(n.jump)M.count=M.count%4+1;if(n.grab)return FPSOnline.browse();if(n.confirm||n.start)return M.start();}
 if(keyEdge('kb1','KeyQ'))M.gun=(M.gun+4)%5;if(keyEdge('kb1','KeyE'))M.gun=(M.gun+1)%5;
 for(let i=0;i<15;i++)if(KartMenu.hit(M.characterRect(i)))M.char=i;for(let i=0;i<5;i++)if(KartMenu.hit({x:758,y:137+i*69,w:480,h:60}))M.gun=i;
 if(KartMenu.hit({x:40,y:535,w:670,h:51}))M.count=M.count%4+1;if(KartMenu.hit({x:758,y:535,w:480,h:51}))return FPSOnline.browse();if(KartMenu.hit({x:758,y:606,w:480,h:64}))return M.start();if(KartMenu.hit({x:40,y:618,w:230,h:50}))return M.exit();
};
APP.fpsGarageDraw=function(){
 const M=FPSMenu;M.count=clamp(M.count,1,4);KartMenu.header('FPS','FPS · Un mundo abierto · Combate libre hasta 12 bajas o 7 minutos');
 for(let i=0;i<15;i++){const b=M.characterRect(i),on=M.char===i;KartRender.panel(b.x,b.y,b.w,b.h,on?'#a3dfb9':'#274453');const sp=KartRender.kartSprite(CHAR_ORDER[i],0);ctx.drawImage(sp.img,b.x+18,b.y-13,92,100);text(CHARS[CHAR_ORDER[i]].name,b.x+b.w/2,b.y+90,13,on?GOLD:PAPER,{body:true,weight:700});}
 for(let i=0;i<5;i++){const g=FPS_GUNS[i],y=137+i*69;KartRender.panel(758,y,480,60,i===M.gun?g.color:'#274453');text((i+1)+'  '+g.name,781,y+22,20,i===M.gun?GOLD:PAPER,{align:'left',body:true,weight:700});text(g.kind.toUpperCase()+'  ·  '+g.mag+' balas  ·  '+g.reload+' s recarga',781,y+44,13,'#b9cdd1',{align:'left',body:true});}
 KartMenu.button('LOCAL: '+M.count+' JUGADOR'+(M.count>1?'ES':'')+' · X / ESPACIO',{x:40,y:535,w:670,h:51});KartMenu.button('ONLINE · VOZ Y CÁMARA · U / LB',{x:758,y:535,w:480,h:51});KartMenu.button('EXPLORAR Y JUGAR',{x:758,y:606,w:480,h:64},true);KartMenu.button('← VOLVER',{x:40,y:618,w:230,h:50});
 text('P1: teclado y ratón. En solitario también puedes usar un mando.',40,599,14,'#b9cdd1',{align:'left',body:true});text('P2–P4: un mando por persona. Online: cada quien tiene su pantalla.',40,691,14,TEAL,{align:'left',body:true});text('← → ↑ ↓: personaje  ·  LT / Q / E: arma',758,501,14,'#b9cdd1',{align:'left',body:true});
};
APP.fpsGameUpdate=function(){
 const m=APP.fps;if(!m)return FPSMenu.exit();const raw=FPSControls.read(0);
 if(raw.pause){m.paused=!m.paused;FPSControls.reset();if(m.paused)document.exitPointerLock?.();}
 if(m.paused){const resume=()=>{m.paused=false;FPSControls.reset();FPSControls.lock();},exit=()=>m.online?FPSOnline.leave():FPSMenu.exit();if(KartMenu.hit({x:430,y:310,w:420,h:60}))resume();if(KartMenu.hit({x:430,y:390,w:420,h:60}))return exit();for(const d of Devices.list){const n=Devices.nav(d);if(n.up||n.down)m.pauseSel=m.pauseSel?0:1;if(n.confirm&&!raw.pause){if(m.pauseSel)return exit();resume();}}}
 if(m.online)return FPSOnline.update(raw);if(m.paused)return;
 const inputs=m.players.map(p=>p.bot?{}:p.index===0?raw:FPSControls.read(p.index));m.update(inputs);if(m.phase==='done')APP.go('fpsResults');
};
APP.fpsGameDraw=function(){if(APP.fps)FPSView.draw(APP.fps);};
APP.fpsResultsUpdate=function(){for(const d of Devices.list){const n=Devices.nav(d);if(n.back)return APP.fps.online?FPSOnline.leave():FPSMenu.exit();if(n.confirm||n.start){if(APP.fps.online){if(Net.role==='host')return FPSOnline.lobby();}else return FPSMenu.start();}}if(KartMenu.hit({x:740,y:586,w:480,h:60})){if(APP.fps.online){if(Net.role==='host')FPSOnline.lobby();}else FPSMenu.start();}if(KartMenu.hit({x:60,y:586,w:480,h:60}))return APP.fps.online?FPSOnline.leave():FPSMenu.exit();};
APP.fpsResultsDraw=function(){const m=APP.fps;if(!m)return;KartMenu.header('RESULTADOS · FPS','12 bajas para ganar · ¡Vuelve al mundo con otra arma!');m.players.slice().sort((a,b)=>b.kills-a.kills||a.deaths-b.deaths).forEach((p,i)=>{const y=160+i*86;KartRender.panel(60,y,1160,73);text((i+1)+'. '+CHARS[p.id].name,95,y+38,28,p===m.player?GOLD:PAPER,{align:'left',weight:700});text(p.kills+' BAJAS  /  '+p.deaths+' CAÍDAS',1185,y+38,23,TEAL,{align:'right',weight:700});});KartMenu.button('SALIR',{x:60,y:586,w:480,h:60});KartMenu.button(m.online&&Net.role!=='host'?'ESPERANDO AL ANFITRIÓN':'VOLVER A JUGAR',{x:740,y:586,w:480,h:60});};
APP.fpsLobbyUpdate=function(){const host=Net.role==='host',M=FPSMenu,g=Net.guest,old=host?M.char:g.ch;let ch=old;const ready=()=>{if(host)FPSOnline.start();else{g.rdy=g.rdy?0:1;Net.set({rdy:g.rdy});}};
 for(const d of Devices.list){const n=Devices.nav(d);if(n.left)ch=(ch+14)%15;if(n.right)ch=(ch+1)%15;if(n.up)ch=(ch+10)%15;if(n.down)ch=(ch+5)%15;if(n.back)return FPSOnline.leave();if(n.confirm||n.start)return ready();if(n.shield){M.gun=(M.gun+1)%5;Net.set({fg:M.gun,rdy:0});g.rdy=0;}if(n.grab)Net.invite();}
 for(let i=0;i<15;i++)if(KartMenu.hit({x:42+i%5*152,y:329+Math.floor(i/5)*81,w:142,h:71}))ch=i;
 if(ch!==old){if(host)M.char=ch;else{g.ch=ch;g.rdy=0;Net.set({ch,rdy:0});}}
 if(KartMenu.hit({x:842,y:576,w:394,h:55}))ready();if(KartMenu.hit({x:42,y:652,w:196,h:42}))return FPSOnline.leave();if(KartMenu.hit({x:253,y:652,w:256,h:42}))Net.invite();if(KartMenu.hit({x:842,y:418,w:394,h:55})){M.gun=(M.gun+1)%5;Net.set({fg:M.gun,rdy:0});g.rdy=0;}
};
APP.fpsLobbyDraw=function(){const host=Net.role==='host',lob=host?Net.lob:Net.hostPres()?.lob||{},players=lob.players||[],ch=host?FPSMenu.char:Net.guest.ch;KartMenu.header('FPS · SALA '+(host?Net.code:Net.hostPres()?.code||'…'),'Hasta cuatro jugadores · Primera persona · Tu propia pantalla · Voz y cámara');
 for(let i=0;i<4;i++){const b={x:42+i*307,y:120,w:287,h:183},p=players[i];KartRender.panel(b.x,b.y,b.w,b.h);if(p){const cam=AV.videoFor(p.peer);if(cam)drawVideoCover(ctx,cam.v,b.x+12,b.y+12,94,80,cam.mirror);text(Net.nameOf(p.peer),b.x+145,b.y+40,18,PAPER,{body:true,weight:700});text(CHARS[p.id].name,b.x+145,b.y+82,20,GOLD,{weight:700});text(p.ready?'LISTO':'ELIGIENDO',b.x+145,b.y+133,16,p.ready?TEAL:GOLD,{weight:700});}else text('CPU / PLAZA LIBRE',b.x+145,b.y+90,18,MUTED,{body:true});}
 for(let i=0;i<15;i++){const b={x:42+i%5*152,y:329+Math.floor(i/5)*81,w:142,h:71};KartRender.panel(b.x,b.y,b.w,b.h,i===ch?GOLD:'#274453');text(CHARS[CHAR_ORDER[i]].name,b.x+71,b.y+36,17,i===ch?GOLD:PAPER,{body:true,weight:700});}
 text('FPS',1039,355,32,GOLD,{weight:700});text('Combate libre · 12 bajas · 7 min',1039,390,18,PAPER,{body:true});KartMenu.button(FPS_GUNS[FPSMenu.gun].name+' · LT',{x:842,y:418,w:394,h:55});KartMenu.button(host?'INICIAR':'LISTO / NO LISTO',{x:842,y:576,w:394,h:55},true);KartMenu.button('← SALIR',{x:42,y:652,w:196,h:42});KartMenu.button('INVITAR · U / LB',{x:253,y:652,w:256,h:42});text('← →: personaje · A: confirmar · LT: arma · LB: invitar',42,617,16,PAPER,{align:'left',body:true});
};
const fpsOnlineDraw=APP.onlineDraw;APP.onlineDraw=function(){fpsOnlineDraw.call(this);if(FPSOnline.browsing){ctx.fillStyle='#101f28';ctx.fillRect(360,5,560,66);sfText('FPS · ONLINE',640,40,40,GOLD);}Net.availableHosts().forEach((h,i)=>{if(h.presence.lob?.game==='fps'){ctx.fillStyle='#254b43';ctx.fillRect(254,247+i*70,230,22);text('FPS · '+(h.presence.lob.players?.length||1)+'/4',369,258,13,TEAL,{body:true});}});};
const fpsGo=APP.go;APP.go=function(s){
 if(s==='modesel'&&Net.role==='host'&&Net.lob.game==='fps')return FPSOnline.lobby();
 if(this.screen==='fpsGame'&&s!=='fpsGame'){document.exitPointerLock?.();FPSControls.reset();}
 if(s==='main')FPSOnline.browsing=false;fpsGo.call(this,s);if(s==='fpsGame')KartMusic.play('aurora');
};
