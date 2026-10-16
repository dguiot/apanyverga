'use strict';
// Mode hub, garage, track selection, pause, results and a three-race cup.
const KartMenu={
  char:0,vehicle:0,track:0,cc:1,assist:false,cup:false,row:0,selection:0,courses:new Map(),cupState:null,
  course(i){if(!this.courses.has(i))this.courses.set(i,new KartCourse(KART_TRACKS[i]));return this.courses.get(i);},
  save(){try{localStorage.setItem('esmash-kart-garage-v1',JSON.stringify({char:this.char,vehicle:this.vehicle,track:this.track,cc:this.cc,assist:this.assist,cup:this.cup}));}catch(e){}},
  load(){try{const j=JSON.parse(localStorage.getItem('esmash-kart-garage-v1')||'null');if(j){this.char=clamp(j.char|0,0,CHAR_ORDER.length-1);this.track=clamp(j.track|0,0,2);this.cc=clamp(j.cc|0,0,2);this.assist=!!j.assist;this.cup=!!j.cup;}}catch(e){}},
  enter(){this.cupState=null;this.row=0;this.selection=this.char;this.load();APP.go('kartGarage');TouchPad.release();},
  card(i){return {x:40+(i%5)*148,y:117+Math.floor(i/5)*111,w:138,h:101};},
  trackRect(i){return {x:40+i*405,y:120,w:390,h:407};},
  button(label,b,on=false){sfButton(label,b.x,b.y,b.w,b.h,on||hover(b.x,b.y,b.w,b.h));},
  hit(b){return clickIn(b.x,b.y,b.w,b.h);},
  header(title,subtitle){drawMenuBG(7);sfText(title,44,47,49,PAPER,{align:'left'});text(subtitle,46,87,16,'#b3c9d4',{body:true,align:'left',weight:500});},
  begin(){
    this.save();this.cupState=this.cup?{round:0,ids:null,scores:{},results:[]}:null;
    if(this.cupState)this.track=0;
    this.start();
  },
  start(){
    if(APP.kartRace)APP.kartRace.stop();
    APP.kartRace=new KartRace(KART_TRACKS[this.track],CHAR_ORDER[this.char],this.cc,this.assist,Date.now(),this.cupState&&this.cupState.ids,Array.from({length:8},(_,i)=>i===0?this.vehicle:(i-1)%6));
    if(this.cupState&&!this.cupState.ids){this.cupState.ids=APP.kartRace.racers.map(r=>r.id);for(const id of this.cupState.ids)this.cupState.scores[id]=0;}
    this.selection=0;this.recorded=false;TouchPad.release();APP.go('kartRace');
    // Prime the finite sprite set outside the moving race.
    for(const r of APP.kartRace.racers)KartRender.kartSprite(r.id,r.vehicle);
    KartControls.tapped.clear();KartControls.read(); // menu confirmation must not immediately pause the race
  },
  record(){
    if(this.recorded)return;this.recorded=true;
    if(this.cupState){const order=APP.kartRace.order,points=[15,12,10,8,6,4,2,1];
      order.forEach((r,i)=>{this.cupState.scores[r.id]+=points[i];});this.cupState.results.push(order.map(r=>r.id));this.cupState.round++;
    }
  },
  exit(){if(APP.kartRace)APP.kartRace.stop();APP.kartRace=null;APP.menuSel=9;APP.go('main');},
};
const mainChooseBeforeKart=APP.mainChoose;
APP.mainChoose=function(i){if(i===9){Audio8.sfx('confirm');return KartMenu.enter();}return mainChooseBeforeKart.call(this,i);};
const mainOptionsBeforeKart=APP.mainOptions;
APP.mainOptions=function(){return [...mainOptionsBeforeKart.call(this),'Esmash Kart'];};
APP.mainRect=function(i){if(i===0||i===9)return {x:i===0?54:654,y:130,w:572,h:208};const j=i-1;return {x:74+j%2*580,y:367+Math.floor(j/2)*57,w:552,h:48};};
APP.mainUpdate=function(){
  for(const d of Devices.list){const n=Devices.nav(d);let i=this.menuSel;
    if(n.left||n.right)i=i===0?9:i===9?0:i%2?i+1:i-1;
    if(n.down)i=i===0?1:i===9?2:i>6?(i%2?0:9):i+2;
    if(n.up)i=i===0?7:i===9?8:i<3?(i===1?0:9):i-2;
    if(i!==this.menuSel){this.menuSel=i;Audio8.sfx('menu');}
    if(n.confirm||n.start){this.firstDev=d;return this.mainChoose(i);}
    if(n.back)return this.go('title');
  }
  for(let i=0;i<10;i++)if(KartMenu.hit(this.mainRect(i))){this.menuSel=i;this.firstDev=pointerDev();return this.mainChoose(i);}
};
APP.mainDraw=function(){
  drawMenuBG(1);sfText('ELIGE TU JUEGO',640,58,59,PAPER);text('ESMASH BROS  /  LOS MISMOS PERSONAJES, OTRA FORMA DE GANAR',640,100,15,'#b2c5d4',{body:true,weight:700});
  for(const i of [0,9]){
    const b=this.mainRect(i),on=this.menuSel===i||hover(b.x,b.y,b.w,b.h);
    slab(b.x,b.y,b.w,b.h,{skew:.07,edge:on?GOLD:'rgba(131,168,190,.4)',lw:on?4:2,top:i===0?'#572035':'#123a50',bottom:'#0b1829'});
    sfText(i===0?'PELEAS':'ESMASH KART',b.x+34,b.y+47,52,on?GOLD:PAPER,{align:'left'});
    text(i===0?'Golpes, especiales y Smash.':'Derrapa, lanza ítems y conquista la pista.',b.x+36,b.y+94,17,'#d0e3e9',{body:true,align:'left',weight:500});
    text(i===0?'1–4 JUGADORES  ·  LOCAL Y ONLINE':'1–4 ONLINE  ·  PANTALLA DIVIDIDA  ·  3 CIRCUITOS',b.x+36,b.y+174,13,i===0?'#ffada6':'#7bf0e6',{body:true,align:'left',weight:700});
    if(i===9){const sp=KartRender.kartSprite(CHAR_ORDER[KartMenu.char],KartMenu.vehicle);ctx.drawImage(sp.img,b.x+395,b.y+80,150,147);}
    else{const sp=ART.sprite('kart-hub-fight',170,170,c=>{c.translate(87,162);c.scale(.95,.95);drawCharacter(c,'torito',mkPose(POSES.idle));});ctx.drawImage(sp.img,b.x+385,b.y+35,170,170);}
  }
  const opts=this.mainOptions();for(let i=1;i<9;i++){const b=this.mainRect(i);sfButton(opts[i],b.x,b.y,b.w,b.h,this.menuSel===i||hover(b.x,b.y,b.w,b.h));}
  const desc=this.menuSel===9?'Carreras 3D, doce objetos, derrapes y acrobacias. Teclado, control o pantalla táctil.':this.menuSel===0?'Entra a la selección de los modos de pelea.':'A / J / Enter: elegir   ·   Cruceta / flechas: moverte   ·   B / K / Esc: volver';
  text(desc,640,634,16,'#d1dce5',{body:true,weight:500});
  text('ESMASH BROS',640,692,22,'#7593a7',{weight:700});
};
const focusBeforeKart=APP.focusNative;
APP.focusNative=function(d){
  if(this.screen==='main'){const items=Array.from({length:10},(_,i)=>this.mainRect(i));return {items,cur:items[this.menuSel],own:()=>true,sel:i=>this.menuSel=i};}
  if(this.screen.startsWith('kart'))return false; // all race controls have explicit keyboard/gamepad navigation
  return focusBeforeKart.call(this,d);
};

APP.kartGarageUpdate=function(){
  const M=KartMenu;
  if(KartVehicles.openPressed())return KartVehicles.open('kartGarage');
  for(const d of Devices.list){const n=Devices.nav(d);if(n.back)return M.exit();
    if(n.grab)return KartOnline.browse();
    if(n.left){M.char=(M.char+CHAR_ORDER.length-1)%CHAR_ORDER.length;Audio8.sfx('menu');}
    if(n.right){M.char=(M.char+1)%CHAR_ORDER.length;Audio8.sfx('menu');}
    if(n.up)M.char=(M.char+CHAR_ORDER.length-5)%CHAR_ORDER.length;
    if(n.down)M.char=(M.char+5)%CHAR_ORDER.length;
    if(n.confirm||n.start){M.save();Audio8.sfx('confirm');return this.go('kartTracks');}
    if(n.jump){M.cc=(M.cc+1)%3;Audio8.sfx('menu');}
    if(n.shield){M.assist=!M.assist;Audio8.sfx('menu');}
  }
  for(let i=0;i<CHAR_ORDER.length;i++)if(M.hit(M.card(i))){M.char=i;M.save();Audio8.sfx('menu');}
  if(M.hit({x:822,y:489,w:190,h:48}))M.cc=(M.cc+1)%3;
  if(M.hit({x:1022,y:489,w:210,h:48}))M.assist=!M.assist;
  if(M.hit({x:822,y:556,w:410,h:59})){M.save();return this.go('kartTracks');}
  if(M.hit({x:822,y:624,w:410,h:44}))return KartOnline.browse();
  if(M.hit({x:40,y:465,w:728,h:50}))return KartVehicles.open('kartGarage');
  if(M.hit({x:40,y:645,w:180,h:44}))return M.exit();
};
APP.kartGarageDraw=function(){
  const M=KartMenu,id=CHAR_ORDER[M.char],c=CHARS[id],st=kartStats(id,M.vehicle);
  M.header('ESMASH KART','01 / ELIGE A TU PILOTO   ·   Todos los personajes del juego original');
  for(let i=0;i<CHAR_ORDER.length;i++){
    const b=M.card(i),on=i===M.char;slab(b.x,b.y,b.w,b.h,{skew:.07,edge:on?GOLD:'rgba(115,163,186,.35)',lw:on?3:1,top:on?'#55502d':'#173247',bottom:'#10202e'});
    ctx.save();ctx.beginPath();ctx.rect(b.x+6,b.y+5,b.w-12,66);ctx.clip();drawPortrait(ctx,CHAR_ORDER[i],b.x+b.w/2,b.y+35,25);ctx.restore();
    text(CHARS[CHAR_ORDER[i]].name,b.x+b.w/2,b.y+83,fitSize(CHARS[CHAR_ORDER[i]].name,b.w-12,22),on?GOLD:PAPER,{weight:700});
  }
  KartRender.panel(810,117,430,356);const sp=KartRender.kartSprite(id,M.vehicle);ctx.drawImage(sp.img,902,123,240,235);
  sfText(c.name,1025,375,45,GOLD);const labs=['Velocidad','Aceleración','Agarre'];
  for(let i=0;i<3;i++){text(labs[i],840,414+i*20,13,'#bbd0d9',{body:true,align:'left',weight:600});for(let j=0;j<5;j++){ctx.fillStyle=j<st.bars[i]?'#77e6df':'#30475c';roundRect(ctx,975+j*41,408+i*20,34,9,3);ctx.fill();}}
  M.button(KART_CLASSES[M.cc].name,{x:822,y:489,w:190,h:48});M.button('Asistencia: '+(M.assist?'sí':'no'),{x:1022,y:489,w:210,h:48});
  M.button('ELEGIR CIRCUITO →',{x:822,y:556,w:410,h:59},true);
  M.button('ONLINE · U / LB',{x:822,y:624,w:410,h:44});
  M.button('VEHÍCULO: '+kartVehicle(M.vehicle).name+' · V / Y',{x:40,y:465,w:728,h:50});
  text('← → piloto · A / Enter: continuar · X: cilindrada · LT / RT: asistencia',43,536,14,'#9ebacb',{body:true,align:'left'});
  wrapText(M.assist?'Asistencia activa: ayuda en las curvas. Récords separados.':'Derrapa y corrige con contravolante. En una rampa, pulsa derrape en el aire para ganar un turbo al aterrizar.',43,561,690,16,25,'#d5e4e9','left');
  M.button('← VOLVER',{x:40,y:645,w:180,h:44});text('TRES VUELTAS. OCHO PILOTOS. UNA META.',815,672,18,'#7f9eb1');
};
APP.kartTracksUpdate=function(){
  const M=KartMenu;
  for(const d of Devices.list){const n=Devices.nav(d);if(n.back){Audio8.sfx('back');return this.go('kartGarage');}
    if(n.left||n.up){M.track=(M.track+2)%3;Audio8.sfx('menu');}if(n.right||n.down){M.track=(M.track+1)%3;Audio8.sfx('menu');}
    if(n.jump){M.cup=!M.cup;Audio8.sfx('menu');}if(n.confirm||n.start)return M.begin();}
  for(let i=0;i<3;i++)if(M.hit(M.trackRect(i))){M.track=i;Audio8.sfx('menu');}
  if(M.hit({x:40,y:555,w:375,h:56})){M.cup=!M.cup;Audio8.sfx('menu');}
  if(M.hit({x:846,y:555,w:394,h:56}))return M.begin();
  if(M.hit({x:40,y:645,w:180,h:44}))return this.go('kartGarage');
};
APP.kartTracksDraw=function(){
  const M=KartMenu;M.header('ELIGE TU CIRCUITO','02 / CURVAS LARGAS, SIETE RIVALES EN PISTA   ·   '+KART_CLASSES[M.cc].name+'  ·  '+CHARS[CHAR_ORDER[M.char]].name);
  for(let i=0;i<3;i++){
    const info=KART_TRACKS[i],b=M.trackRect(i),on=i===M.track,C=M.course(i);
    slab(b.x,b.y,b.w,b.h,{skew:.035,edge:on?GOLD:'rgba(131,168,190,.4)',lw:on?4:2,top:info.sky[0],bottom:'#102333'});
    text('0'+(i+1),b.x+24,b.y+27,21,info.accent,{align:'left',weight:700});text('●'.repeat(info.difficulty),b.x+b.w-24,b.y+28,15,info.accent,{body:true,align:'right'});
    KartRender.map(C,b.x+22,b.y+52,b.w-44,173);
    sfText(info.name,b.x+23,b.y+250,fitSize(info.name,b.w-50,37),on?GOLD:PAPER,{align:'left'});
    text((C.length/1000).toFixed(1)+' km / vuelta   ·   '+Math.round(C.length/(115*KART_CLASSES[M.cc].speed)*1.18)+'–'+Math.round(C.length/(85*KART_CLASSES[M.cc].speed)*1.2)+' s / vuelta',b.x+24,b.y+286,13,'#a9d8e1',{body:true,align:'left',weight:600});
    wrapText(info.desc,b.x+24,b.y+320,b.w-50,15,23,'#dde5e6','left');
    let best=null;try{best=JSON.parse(localStorage.getItem('esmash-kart-v2:'+info.id+':'+M.cc+':'+(M.assist?'assist':'manual'))||'null');}catch(e){}
    text(best?'Récord: '+KartRender.time(best.time):'Récord: por conquistar',b.x+24,b.y+384,13,best?GOLD:'#819aaf',{body:true,align:'left',weight:600});
  }
  M.button(M.cup?'COPA: LOS TRES CIRCUITOS':'CARRERA INDIVIDUAL',{x:40,y:555,w:375,h:56});M.button('¡A LA PARRILLA! →',{x:846,y:555,w:394,h:56},true);
  text(M.cup?'Tres carreras · puntos 15 / 12 / 10 / 8 / 6 / 4 / 2 / 1':'← → elegir pista   ·   X / Espacio: alternar carrera o copa',43,628,14,'#b8cbd4',{body:true,align:'left'});
  M.button('← PILOTOS',{x:40,y:645,w:180,h:44});text('A / Enter: correr   ·   B / Esc: volver',1238,671,15,'#a2b7c7',{body:true,align:'right'});
};
APP.kartRaceUpdate=function(){
  if(this.kartRace?.online)return KartOnline.raceUpdate();
  const race=this.kartRace;if(!race)return KartMenu.exit();const input=KartControls.read();
  if(input.musicPressed){Audio8.setSound(Audio8.musicOn?'fx':'all');Toasts.push(Audio8.musicOn?'Música activada':'Solo motor y efectos');}
  if(input.pausePressed){race.paused=!race.paused;race.pauseSel=0;TouchPad.release();KartSound.stop();Audio8.sfx('menu');return;}
  if(race.paused){
    for(const d of Devices.list){const n=Devices.nav(d);if(n.jump)Audio8.setSound(Audio8.musicOn?'fx':'all');if(n.up||n.down)race.pauseSel=(race.pauseSel+(n.down?1:2))%3;
      if(n.confirm){if(race.pauseSel===0){race.paused=false;return;}if(race.pauseSel===1)return KartMenu.start();return KartMenu.exit();}
    }
    for(let i=0;i<3;i++)if(KartMenu.hit({x:440,y:318+i*72,w:400,h:58})){if(i===0){race.paused=false;return;}if(i===1)return KartMenu.start();return KartMenu.exit();}
    if(KartMenu.hit({x:470,y:654,w:340,h:38}))Audio8.setSound(Audio8.musicOn?'fx':'all');
    return;
  }
  race.update(input);KartSound.tick(race);
  if(race.phase==='finish'&&race.resultTime>=3){KartMenu.record();race.stop();this.go('kartResults');}
};
APP.kartRaceDraw=function(){
  const race=this.kartRace;if(!race)return;KartRender.draw(race,clamp(acc/STEP,0,1));
  if(race.paused){ctx.fillStyle='rgba(4,13,24,.85)';ctx.fillRect(0,0,W,H);sfText('PAUSA',640,217,82,GOLD);
    for(let i=0;i<3;i++)KartMenu.button((race.online?['SEGUIR CORRIENDO',Net.role==='host'?'VOLVER A LA SALA':'MICRÓFONO: '+(AV.mic?'SÍ':'NO'),'SALIR DE LA SALA']:['SEGUIR CORRIENDO','REINICIAR CARRERA','SALIR AL MENÚ'])[i],{x:440,y:318+i*72,w:400,h:58},i===race.pauseSel);
    if(race.online)text('La carrera sigue mientras tienes abierto este menú.',640,274,18,TEAL,{body:true});
    text('RT / A: acelerar  ·  LT: frenar  ·  X / RB: derrape  ·  LB: ítem  ·  B: lanzar atrás',640,586,16,'#d4e7e9',{body:true});
    text('R / Y: rescate  ·  ☰ / Esc: continuar  ·  X / M: música '+(Audio8.musicOn?'sí':'no'),640,620,15,'#a2bacb',{body:true});
    KartMenu.button('MÚSICA: '+(Audio8.musicOn?'SÍ':'NO'),{x:470,y:654,w:340,h:38});
  }
};
APP.kartResultsUpdate=function(){
  if(this.kartRace?.online)return KartOnline.resultsUpdate();
  const M=KartMenu;
  const next=()=>{if(M.cupState&&M.cupState.round<3){M.track=M.cupState.round;return M.start();}return M.start();};
  for(const d of Devices.list){const n=Devices.nav(d);if(n.back){this.kartRace.stop();M.cupState=null;M.cup=false;return this.go('kartTracks');}
    if(n.confirm||n.start){if(M.cupState&&M.cupState.round===3){M.cupState=null;return this.go('kartTracks');}return next();}}
  if(M.hit({x:730,y:582,w:485,h:62})){if(M.cupState&&M.cupState.round===3){M.cupState=null;return this.go('kartTracks');}return next();}
  if(M.hit({x:730,y:659,w:485,h:40})){this.kartRace.stop();M.cupState=null;return this.go('kartTracks');}
};
APP.kartResultsDraw=function(){
  const M=KartMenu,race=this.kartRace,p=race.player,cup=M.cupState,final=cup&&cup.round===3;
  M.header(final?'RESULTADO DE LA COPA':'BANDERA A CUADROS',race.course.info.name+'  ·  '+race.cc.name+(cup?'  ·  Copa '+cup.round+' / 3':''));
  const order=final?cup.ids.map(id=>({id})).sort((a,b)=>cup.scores[b.id]-cup.scores[a.id]||cup.results[2].indexOf(a.id)-cup.results[2].indexOf(b.id)):race.order;
  for(let i=0;i<order.length;i++){
    const r=order[i],y=127+i*65,on=race.online?r.peer===Net.myPeer():r.id===p.id;KartRender.panel(40,y,640,57);if(on){ctx.strokeStyle=GOLD;ctx.lineWidth=2;roundRect(ctx,40,y,640,57,15);ctx.stroke();}
    text(String(i+1).padStart(2,'0'),70,y+29,29,on?GOLD:'#89a4b9',{weight:700});ctx.save();ctx.beginPath();ctx.rect(104,y+4,54,48);ctx.clip();drawPortrait(ctx,r.id,130,y+27,18);ctx.restore();
    text((race.online&&r.peer?r.label+' · ':'')+CHARS[r.id].name+(on?' · TÚ':''),175,y+28,race.online?17:20,on?GOLD:'#f0f5ee',{body:true,align:'left',weight:700});
    text(final?cup.scores[r.id]+' pts':r.finish!==null?KartRender.time(r.finish):'En pista',653,y+29,17,'#a9d1d8',{body:true,align:'right',weight:600});
  }
  const sp=KartRender.kartSprite(p.id,p.vehicle);ctx.drawImage(sp.img,843,111,255,249);sfText(final?`${order.findIndex(r=>r.id===p.id)+1}.º EN LA COPA`:`${race.order.indexOf(p)+1}.º LUGAR`,972,387,58,GOLD);
  text(KartRender.time(p.finish),972,442,45,PAPER,{weight:700});
  for(let i=0;i<p.lapTimes.length;i++)text('Vuelta '+(i+1)+'   '+KartRender.time(p.lapTimes[i]),972,481+i*26,17,'#c8dde3',{body:true,weight:500});
  if(race.newRecord)text('¡NUEVO RÉCORD PERSONAL!',972,566,16,'#71e7cc',{body:true,weight:700});
  M.button(race.online?(Net.role==='host'?'VOLVER A LA SALA':'ESPERANDO AL ANFITRIÓN'):final?'ELEGIR CIRCUITO':cup?'SIGUIENTE CARRERA →':'VOLVER A CORRER',{x:730,y:582,w:485,h:62},true);
  M.button(race.online?'SALIR DE LA SALA / B / ESC':'ELEGIR CIRCUITO / B / ESC',{x:730,y:659,w:485,h:40});
};

// Race labels and actions share the existing reliable multitouch handling.
const touchShownBeforeKart=TouchPad.shown;
TouchPad.shown=function(){return APP.screen==='kartRace'?this.active&&APP.kartRace&&!APP.kartRace.paused&&APP.kartRace.phase!=='finish':touchShownBeforeKart.call(this);};
const touchMeasureBeforeKart=TouchPad.measure;
TouchPad.measure=function(){touchMeasureBeforeKart.call(this);this.kartLabels();};
TouchPad.kartLabels=function(){if(!this.L)return;const kart=APP.screen==='kartRace',labels={attack:['GAS','Acelera'],special:['FRENO',null],jump:['DERRAPE',null],shield:['ÍTEM',null],grab:['ATRÁS',null]};
  for(const b of this.L.btns){const orig=this.BUTTONS.find(q=>q.a===b.a);b.label=kart?labels[b.a][0]:orig.label;b.sub=kart?labels[b.a][1]:orig.sub;}};
const goBeforeKart=APP.go;
APP.go=function(s){
  const was=this.screen;if(was==='kartRace'&&s!=='kartRace')KartSound.stop();goBeforeKart.call(this,s);
  if(s==='kartGarage'||s==='kartTracks'||s==='kartResults')Audio8.playSong(s==='kartResults'?'results':'menu');
  if(s!=='kartRace')Kart3D.hide();
  if(['battle','demo','netview','vs'].includes(s))KartMusic.stop();
  else {Audio8.stopSong();KartMusic.play(s==='kartRace'?APP.kartRace.course.info.id:s==='kartResults'?'results':'menu');}
  TouchPad.kartLabels();
};
// Browser gestures should not scroll while racing; key repeat does not create item presses.
window.addEventListener('keydown',e=>{if(APP.screen==='kartRace'&&['KeyQ','KeyE','KeyR','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();});
