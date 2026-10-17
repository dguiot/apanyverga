'use strict';
// One front door, one persistent party, and the same three preparation steps.
const ShellUI={
 active:false,online:false,game:'fight',step:'room',focus:0,tab:0,playerTab:0,edit:0,paused:false,returnScreen:null,connecting:false,joinWait:0,
 config:{locals:1,cpus:3,cpuLevel:5,target:12,minutes:7},locals:Array.from({length:4},(_,i)=>({ch:i*3%15,vh:i%6,fg:i%5})),ready:false,padPrev:new Map(),
 games:[{id:'fight',name:'ESMASH',sub:'PELEAS',color:'#ed9b73',desc:'Golpes, especiales y Smash.'},{id:'kart',name:'ESMASH KART',sub:'CARRERAS',color:'#72d7d1',desc:'Derrapes, objetos y seis vehículos.'},{id:'fps',name:'AURORA',sub:'PRIMERA PERSONA',color:'#adc7ef',desc:'Un mundo abierto y cinco armas.'}],
 poster:new Image(),
 screens:new Set(['uiHub','uiRoom','uiSettings','uiPlayers','uiStage']),
 host(){return !this.online||Net.role==='host';},
 gameInfo(){return this.games.find(g=>g.id===this.game)||this.games[0];},
 show(screen){this.focus=0;APP.go(screen);},
 begin(online){
  this.active=true;this.online=online;this.paused=false;this.ready=false;this.edit=0;this.tab=0;KartOnline.browsing=FPSOnline.browsing=false;
  if(!online){if(Net.role==='host'||Net.role==='guest')Net.leave();this.step='room';return this.show('uiHub');}
  if(Net.user?.askName)Net.user.askName(false);this.connecting=true;this.joinWait=0;this.show('uiRoom');this.connect();
 },
 connect(){
  if(!this.connecting||!Net.ok)return;
  if(Net.wantCode){const h=Net.hostByCode(Net.wantCode);if(h){Net.wantCode=null;Net.join(h.peer);this.connecting=false;Net.set({ch:this.locals[0].ch,vh:this.locals[0].vh,fg:this.locals[0].fg,rdy:0});}return;}
  Net.host();this.connecting=false;this.room();
 },
 publish(extra={}){
  if(!this.online||Net.role!=='host')return;
  const ui={v:1,step:this.step,game:this.game,cfg:[this.config.cpus,this.config.cpuLevel,this.config.target,this.config.minutes]};
  Object.assign(Net.lob,{ui,game:this.game,...extra});const json=JSON.stringify(Net.lob);if(json!==Net.lastLobJSON){Net.lastLobJSON=json;Net.set({lob:Net.lob});}
 },
 clearPlay(){
  Net.stopRollback();NetEv.on=false;BATTLE=null;APP.battle=null;Net.view=null;APP.kartRace?.stop();APP.kartRace=null;APP.fps=null;FPSView.dispose();FPSControls.reset();this.paused=false;this.returnScreen=null;
 },
 room(){
  this.clearPlay();this.step='room';this.ready=false;this.stayInRoom=false;Net.guest.rdy=0;Net.set({st:null,inp:null,rdy:0});
  if(this.online&&Net.role==='host'){Net.lob.ep=(Net.lob.ep||0)+1;this.publish({ph:'shell',set:null,res:null});}
  this.show(this.online?'uiRoom':'uiHub');
 },
 leave(){this.clearPlay();if(this.online)Net.leave();this.online=false;this.connecting=false;this.active=false;APP.go('title');},
 choose(game){
  if(!this.host()){Net.set({uiRequest:game});Toasts.push('Propuesta enviada al anfitrión');return;}
  this.clearPlay();this.game=game;if(game==='kart'&&(this.online||this.config.locals>1))KartMenu.cup=false;this.step='settings';this.tab=0;this.ready=false;this.resetReady();this.publish({ph:'shell',set:null,res:null});this.show('uiSettings');
 },
 resetReady(){this.ready=false;Net.guest.rdy=0;Net.set({rdy:0});},
 roster(){
  if(!this.online)return this.locals.slice(0,this.config.locals).map((p,i)=>({...p,peer:null,name:'Jugador '+(i+1),ready:i===this.edit?this.ready:true}));
  const host=Net.role==='host'?Net.myPeer():Net.hostPeer,pr=Net.presOf(host)||{},my=Net.myPeer();
  const guests=Net.peers().filter(p=>p.presence?.g==='golpazo'&&p.presence.role==='guest'&&p.presence.join===host).map(p=>p.peer);if(Net.role==='guest'&&!guests.includes(my))guests.push(my);
  const order=[host,...guests].filter(Boolean).slice(0,4);
  return order.map((peer,i)=>{const p=Net.presOf(peer)||{},mine=peer===my;return {peer,name:Net.nameOf(peer),ch:mine?this.locals[0].ch:clamp(p.ch|0,0,14),vh:mine?this.locals[0].vh:kartVehicleIndex(p.vh|0),fg:mine?this.locals[0].fg:clamp(p.fg|0,0,4),ready:mine?this.ready:!!p.rdy,host:i===0};});
 },
 tick(){
  if(this.connecting){this.connect();return;}
  if(Net.role==='host'){
   if(['uiSettings','uiPlayers','uiStage','uiRoom'].includes(APP.screen))this.publish();
   for(const p of Net.guestsOf(Net.myPeer()))if(p.presence.uiRequest&&this.requests?.get(p.peer)!==p.presence.uiRequest){this.requests??=new Map();this.requests.set(p.peer,p.presence.uiRequest);Toasts.push(Net.nameOf(p.peer)+' propone '+(this.games.find(g=>g.id===p.presence.uiRequest)?.name||'otro juego'));}return;
  }
  const hp=Net.hostPres(),u=hp?.lob?.ui;
  if(!hp||hp.role!=='host'||!hp.lob){if(++Net.lostHostT>300){this.leave();Toasts.push('La sala se cerró');}return;}Net.lostHostT=0;
  if(!u||u.v!==1||!this.games.some(g=>g.id===u.game))return;
  this.active=true;this.online=true;this.game=u.game;
  if(hp.lob.ph!=='shell'){if(this.step!=='playing'){this.step='playing';this.stayInRoom=false;}return;}
  if(!['room','settings','players','stage'].includes(u.step))return;
  const changed=this.step!==u.step;this.step=u.step;if(changed)this.stayInRoom=false;
  if(changed){if(u.step!=='stage')this.resetReady();this.focus=0;this.playerTab=0;}
  if(Array.isArray(u.cfg)&&u.cfg.length===4&&u.cfg.every(Number.isFinite)){this.config.cpus=clamp(u.cfg[0]|0,0,3);this.config.cpuLevel=clamp(u.cfg[1]|0,1,AI_MAX);this.config.target=clamp(u.cfg[2]|0,5,30);this.config.minutes=clamp(u.cfg[3]|0,3,15);}
  if(hp.lob.ru)APP.rules={...APP.rules,...Net.decRules(hp.lob.ru)};
  KartMenu.cc=clamp(hp.lob.cc|0,0,2);KartMenu.assist=!!hp.lob.assist;KartMenu.track=clamp(hp.lob.track|0,0,2);APP.stageSel=clamp(hp.lob.stg|0,0,STAGE_INFO.length-1);
  const screen={room:'uiRoom',settings:'uiSettings',players:'uiPlayers',stage:'uiStage'}[u.step];
  if(!this.stayInRoom&&(changed||!this.returnScreen)&&APP.screen!==screen){this.clearPlay();APP.go(screen);}
 },
 next(){
  if(!this.host())return;
  if(this.step==='settings'){
   const need=this.game==='fight'?Math.max(0,this.config.locals-2):this.config.locals-1;
   if(!this.online&&padInfo.length<need){Toasts.push('Conecta '+need+' mando'+(need===1?'':'s')+' para esos jugadores locales');return;}
   this.step='players';this.playerTab=0;this.edit=0;this.resetReady();Net.set({ch:this.locals[0].ch,vh:this.locals[0].vh,fg:this.locals[0].fg});this.publish({ph:'shell',ru:Net.encRules(APP.rules),cc:KartMenu.cc,assist:KartMenu.assist});return this.show('uiPlayers');
  }
  if(this.step==='players'){
   this.ready=true;Net.set({rdy:1});if(this.online&&this.roster().some(p=>!p.ready)){Toasts.push('Espera a que los demás confirmen su personaje');return;}
   this.step='stage';this.publish({ph:'shell',stg:APP.stageSel,track:KartMenu.track});return this.show('uiStage');
  }
  if(this.step==='stage')return this.launch();
 },
 back(){
  if(this.returnScreen)return this.resume();
  if(!this.host()){this.stayInRoom=true;this.resetReady();return this.show('uiRoom');}
  if(this.step==='room')return this.leave();
  this.step=this.step==='stage'?'players':this.step==='players'?'settings':'room';this.resetReady();this.publish({ph:'shell'});this.show({room:this.online?'uiRoom':'uiHub',settings:'uiSettings',players:'uiPlayers'}[this.step]);
 },
 launch(){
  if(!this.host())return;const people=this.roster();this.step='playing';this.stayInRoom=false;this.publish();
   if(this.game==='fight'){
   if(APP.rules.mode==='soccer')APP.stageSel=STAGE_INFO.findIndex(s=>s.id==='stadium');
   const devs=this.localDevices(),slots=people.map((p,i)=>({type:'human',dev:this.online?i?'net:'+p.peer:'local':devs[i],remote:this.online&&i?p.peer:null,cur:p.ch,pick:CHAR_ORDER[p.ch],ready:true,team:i%2}));
   for(let i=slots.length;i<Math.min(4,people.length+this.config.cpus);i++)slots.push({type:'cpu',cur:(i*4+2)%15,pick:CHAR_ORDER[(i*4+2)%15],ready:true,level:this.config.cpuLevel,team:i%2});
   if(slots.length<2)slots.push({type:'cpu',cur:3,pick:CHAR_ORDER[3],ready:true,level:this.config.cpuLevel,team:1});while(slots.length<4)slots.push({type:'none'});APP.slots=slots;return APP.launch();
  }
  if(this.game==='kart'){
   KartMenu.char=this.locals[0].ch;KartMenu.vehicle=this.locals[0].vh;
   if(this.online){Net.lob.players=people.map(p=>({peer:p.peer,ch:p.ch,vh:p.vh,ready:1}));const sync=KartOnline.syncLobby;KartOnline.syncLobby=()=>{};try{return KartOnline.hostStart();}finally{KartOnline.syncLobby=sync;}}
   const ids=people.map(p=>CHAR_ORDER[p.ch]);while(ids.length<8)ids.push(CHAR_ORDER.find(id=>!ids.includes(id)));const vehicles=ids.map((_,i)=>people[i]?.vh??i%6),r=APP.kartRace=new KartRace(KART_TRACKS[KartMenu.track],ids[0],KartMenu.cc,KartMenu.assist,Date.now(),ids,vehicles);r.racers.forEach((p,i)=>p.human=i<people.length);r.localPlayers=r.racers.slice(0,people.length);r.player=r.racers[0];r.localDevices=this.localDevices();KartMenu.cupState=KartMenu.cup?{round:0,firstTrack:KartMenu.track,ids,scores:Object.fromEntries(ids.map(id=>[id,0])),results:[]}:null;KartMenu.recorded=false;KartControls.read();return APP.go('kartRace');
  }
  FPSMenu.char=this.locals[0].ch;FPSMenu.gun=this.locals[0].fg;
  if(this.online){Net.lob.players=people.map(p=>({peer:p.peer,id:CHAR_ORDER[p.ch],gun:p.fg,ready:1}));const sync=FPSOnline.sync;FPSOnline.sync=()=>{};try{return FPSOnline.start();}finally{FPSOnline.sync=sync;}}
  const roster=Array.from({length:4},(_,i)=>({id:CHAR_ORDER[people[i]?.ch??(i*3+2)%15],gun:people[i]?.fg??i%5,bot:i>=people.length}));APP.fps=new FPSMatch(roster);APP.fps.target=this.config.target;APP.fps.duration=this.config.minutes*60;FPSControls.reset();APP.go('fpsGame');FPSControls.lock();
 },
 localDevices(){if(this.config.locals===1)return [APP.firstDev?.startsWith('pad')?APP.firstDev:'kb1'];const pads=padInfo.map(p=>'pad'+p.index);return this.game==='fight'?['kb1',...(pads.length>=this.config.locals-1?pads:['kb2',...pads])]:['kb1',...pads];},
 player(){return this.locals[this.online?0:this.edit];},
 setPlayer(key,value){const p=this.player();p[key]=value;this.resetReady();if(this.online)Net.set({ch:p.ch,vh:p.vh,fg:p.fg});},
 current(){return this.game==='fight'?APP.battle||Net.view:this.game==='kart'?APP.kartRace:APP.fps;},
 pause(){const m=this.current();if(!m)return;this.paused=true;this.returnScreen=APP.screen;this.tab=0;this.focus=0;if(this.game!=='fight'||!m.rollback)m.paused=true;FPSControls.reset();document.exitPointerLock?.();KartSound.stop();},
 guestRoom(){Net.set({uiRequest:'room'});Toasts.push('Pediste al anfitrión volver a la sala');},
 quietFight(){const saved=[];for(const c of Object.values(Devices.ctrls)){saved.push([c,c.cur]);c.cur=blankState();}try{APP.battle?.update();}finally{for(const [c,cur] of saved)c.cur=cur;}},
 resume(){const m=this.current(),target=this.returnScreen;if(m&&!(this.game==='fight'&&m.rollback))m.paused=false;this.paused=false;this.returnScreen=null;this.focus=0;FPSControls.reset();if(target&&APP.screen!==target)APP.go(target);if(this.game==='fps')FPSControls.lock();},
 nav(items,activate,change=null){
  if(!items.length)return;this.focus=clamp(this.focus,0,items.length-1);
  for(const d of Devices.list){const n=Devices.nav(d);if(n.back)return this.back();
   if(change&&(n.left||n.right)&&items[this.focus].row!==undefined){change(items[this.focus].row,n.left?-1:1);Audio8.sfx('menu');continue;}
   const dir=n.left?[-1,0]:n.right?[1,0]:n.up?[0,-1]:n.down?[0,1]:null;
   if(dir){const a=items[this.focus],ax=a.x+a.w/2,ay=a.y+a.h/2;let best=-1,score=Infinity;items.forEach((b,i)=>{const dx=b.x+b.w/2-ax,dy=b.y+b.h/2-ay,along=dx*dir[0]+dy*dir[1],cross=Math.abs(dx*dir[1]-dy*dir[0]);if(along>4){const s=along+cross*2.5;if(s<score){score=s;best=i;}}});if(best>=0){this.focus=best;Audio8.sfx('menu');}}
   if(n.confirm||n.start){APP.firstDev=d;return activate(this.focus);}
  }
  for(let i=0;i<items.length;i++){const b=items[i];if(clickIn(b.x,b.y,b.w,b.h)){this.focus=i;return activate(i);}}
 },
 button(label,b,on=false,sub=null){const selected=on||hover(b.x,b.y,b.w,b.h);slab(b.x,b.y,b.w,b.h,{skew:.035,top:selected?'#e4ba66':'#172c3b',bottom:selected?'#bc8e44':'#10212d',edge:selected?'#fff1bb':'#405767',lw:selected?3:1});text(label,b.x+b.w/2,b.y+b.h*(sub?.38:.5),fitSize(label,b.w-26,Math.min(24,b.h*.43)),selected?'#11222b':PAPER,{body:true,weight:750});if(sub)text(sub,b.x+b.w/2,b.y+b.h*.73,13,selected?'#24333b':'#9eb5c0',{body:true});},
 notices(){for(const it of Toasts.items)it.t++;const it=Toasts.items.at(-1);if(it&&it.t<240){ctx.save();ctx.globalAlpha=clamp(Math.min(it.t/10,(240-it.t)/20),0,1);text(it.msg.slice(0,125),APP.screen==='title'?640:44,APP.screen==='title'?542:132,12,GOLD,{align:APP.screen==='title'?'center':'left',body:true,weight:650,stroke:'#0b1c27',strokeW:2});ctx.restore();}Toasts.items=Toasts.items.filter(it=>it.t<240);},
 header(title,subtitle,stage=null){
  drawMenuBG(4);text(this.online?'SALA '+(Net.role==='host'?Net.code:Net.hostPres()?.code||'…'):'JUEGO LOCAL',44,30,12,'#8faebb',{align:'left',body:true,weight:700});text(title,44,69,35,PAPER,{align:'left',body:true,weight:800});text(subtitle,1236,40,14,'#a6bdc7',{align:'right',body:true});
  if(stage){const labels=['AJUSTES','PERSONAJES'+(this.game==='kart'?' Y VEHÍCULOS':''),'ESCENARIO'];labels.forEach((label,i)=>{const x=45+i*365;ctx.fillStyle=i===stage-1?this.gameInfo().color:'#334955';ctx.fillRect(x,93,340,3);text('0'+(i+1)+'  '+label,x,116,13,i===stage-1?PAPER:'#7894a3',{align:'left',body:true,weight:700});});}
 },
 cards(){return this.games.map((g,i)=>({x:44+i*402,y:this.online?146:196,w:388,h:238}));},
 drawGames(){
  const cards=this.cards();cards.forEach((b,i)=>{const g=this.games[i],on=this.focus===i;slab(b.x,b.y,b.w,b.h,{skew:.025,top:on?'#29424b':'#152b36',bottom:'#0b1b25',edge:on?GOLD:'#3a5362',lw:on?3:1});ctx.save();roundRect(ctx,b.x+4,b.y+4,b.w-8,126,9);ctx.clip();if(this.poster.complete&&this.poster.naturalWidth){const [x,y,width]=[[0,.12,.46],[.26,.46,.46],[.65,.35,.35]][i],sw=this.poster.width*width,sh=sw/((b.w-8)/126);ctx.drawImage(this.poster,this.poster.width*x,this.poster.height*y,sw,sh,b.x+4,b.y+4,b.w-8,126);}ctx.restore();text(g.sub,b.x+22,b.y+151,11,g.color,{align:'left',body:true,weight:800});text(g.name,b.x+22,b.y+184,29,PAPER,{align:'left',body:true,weight:800});text(g.desc,b.x+22,b.y+214,14,'#9fb9c4',{align:'left',body:true});});
 },
 drawMembers(y=446){
  const roster=this.roster();for(let i=0;i<4;i++){const p=roster[i],x=44+i*302,w=288;KartRender.panel(x,y,w,154);if(!p){text('PLAZA LIBRE',x+w/2,y+76,15,'#5f7c8b',{body:true,weight:700});continue;}
   const video=this.online?AV.videoFor(p.peer):null;if(video){ctx.save();roundRect(ctx,x+8,y+8,104,100,8);ctx.clip();drawVideoCover(ctx,video.v,x+8,y+8,104,100,video.mirror);ctx.restore();}
   else{ctx.fillStyle='#243e49';roundRect(ctx,x+10,y+12,98,92,9);ctx.fill();text((p.name||'J').slice(0,2).toUpperCase(),x+59,y+54,30,'#c0d7df',{body:true,weight:700});text('CÁMARA APAGADA',x+59,y+88,8,'#90aeb9',{body:true,weight:700});}
   text(p.name.slice(0,17),x+124,y+38,17,PAPER,{align:'left',body:true,weight:700});text(p.host?'ANFITRIÓN':p.ready?'LISTO':'EN LA SALA',x+124,y+65,11,p.ready?TEAL:'#aac2cc',{align:'left',body:true,weight:700});text('● CONECTADO',x+124,y+92,11,'#79d7b8',{align:'left',body:true});text(CHARS[CHAR_ORDER[p.ch]].name+(this.game==='kart'?' · '+kartVehicle(p.vh).name:''),x+14,y+133,12,'#afc5ce',{align:'left',body:true});
  }
 },
 rows(){
  const r=APP.rules,cycle=(a,value,d)=>a[(a.indexOf(value)+d+a.length)%a.length],rule=(label,value,change,locked=false)=>({label,value,change,locked});
  if(this.tab===2)return [];
  if(this.tab===1)return [
   rule('Música',Audio8.musicOn?'Activada':'Desactivada',()=>Audio8.setSound(Audio8.musicOn?'fx':'all')),
   rule('Audio general',Audio8.muted?'Silenciado':'Activado',()=>Audio8.setMuted(!Audio8.muted)),
   rule('Vibración',Rumble.on?'Activada':'Desactivada',()=>Rumble.set(!Rumble.on)),
   ...Prefs.rows().map(([label,value],i)=>rule(label,value,d=>Prefs.change(i,d))),
   ...(this.online?[rule('Voz',AV.on?AV.mic?'Micrófono abierto':'Micrófono apagado':'Activar voz y cámara',()=>AV.on?AV.setMic(!AV.mic):AV.start()),rule('Cámara',AV.on&&AV.cam?'Encendida':'Apagada',()=>AV.on?AV.setCam(!AV.cam):AV.start())]:[]),
  ];
  const locked=!this.host()||!!this.returnScreen;
  const common=this.online?[]:[rule('Jugadores locales',String(this.config.locals),d=>{this.config.locals=clamp(this.config.locals+d,1,4);if(this.config.locals>1)KartMenu.cup=false;},locked)];
  if(this.game==='fight')return [rule('Tipo de partida',MODE_BY_ID[r.mode].name,d=>r.mode=MODES[(MODES.findIndex(m=>m.id===r.mode)+d+6)%6].id,locked),rule('Vidas / barras',String(r.stocks),d=>r.stocks=clamp(r.stocks+d,1,9),locked),rule('Tiempo límite',r.time+' min',d=>r.time=clamp(r.time+d,1,9),locked),rule('Objetos',['Ninguno','Pocos','Normal','Muchos'][r.items],d=>r.items=(r.items+d+4)%4,locked),rule('Equipos',r.teams||r.mode==='soccer'?'Sí':'No',()=>r.teams=!r.teams,locked),rule('Modo fiesta',r.party?'Sí':'No',()=>r.party=!r.party,locked),...common,rule('Rivales CPU',String(this.config.cpus),d=>this.config.cpus=clamp(this.config.cpus+d,0,3),locked),rule('Nivel CPU',String(this.config.cpuLevel),d=>this.config.cpuLevel=clamp(this.config.cpuLevel+d,1,AI_MAX),locked)];
  if(this.game==='kart')return [rule('Cilindrada',KART_CLASSES[KartMenu.cc].name,d=>KartMenu.cc=(KartMenu.cc+d+3)%3,locked),rule('Ayuda de dirección',KartMenu.assist?'Activada':'Desactivada',()=>KartMenu.assist=!KartMenu.assist,locked),rule('Tipo de carrera',KartMenu.cup?'Copa de tres pistas':'Carrera individual',()=>KartMenu.cup=!KartMenu.cup,locked||this.online||this.config.locals>1),...common,rule('Vueltas / participantes','3 vueltas · 8 pilotos',()=>{},true)];
  return [rule('Tipo de partida','Combate libre',()=>{},true),rule('Bajas para ganar',String(this.config.target),d=>this.config.target=clamp(this.config.target+d*5,5,30),locked),rule('Tiempo límite',this.config.minutes+' min',d=>this.config.minutes=clamp(this.config.minutes+d,3,15),locked),...common,rule('Rivales CPU','Completan cuatro plazas',()=>{},true)];
 },
 settingsItems(){const rows=this.rows(),items=[0,1,2].map(i=>({x:44+i*244,y:146,w:230,h:43,tab:i}));rows.forEach((r,i)=>items.push({x:44+(i>=5?610:0),y:211+(i%5)*68,w:580,h:57,row:i}));if(this.tab===2&&this.game==='fight')items.push({x:834,y:540,w:400,h:46,bind:true});items.push({x:44,y:641,w:220,h:49,back:true});items.push({x:864,y:631,w:370,h:59,next:true});if(this.returnScreen)items.push({x:340,y:641,w:460,h:49,room:true});return items;},
 settingsChange(i,d){const row=this.rows()[i];if(!row||row.locked)return;row.change(d);this.publish({ru:Net.encRules(APP.rules),cc:KartMenu.cc,assist:KartMenu.assist});},
 settingsUpdate(){const items=this.settingsItems();this.nav(items,i=>{const b=items[i];if(b.tab!==undefined){this.tab=b.tab;this.focus=b.tab;}else if(b.row!==undefined)this.settingsChange(b.row,1);else if(b.back)this.back();else if(b.bind){this.inBindings=true;APP.bind.col=0;APP.bind.dev=0;APP.go('binds');}else if(b.room){if(this.host())this.room();else this.guestRoom();}else if(b.next){if(this.returnScreen)this.resume();else this.next();}},(i,d)=>this.settingsChange(i,d));},
 settingsDraw(){
  this.header(this.returnScreen?'PAUSA Y AJUSTES':this.gameInfo().name+' · AJUSTES','Todo lo de este juego, en un solo lugar',1);const items=this.settingsItems(),rows=this.rows();
  items.forEach((b,i)=>{if(b.tab!==undefined)this.button(['PARTIDA','SONIDO E IMAGEN','CONTROLES'][b.tab],b,this.focus===i||this.tab===b.tab);else if(b.row!==undefined){const row=rows[b.row];KartRender.panel(b.x,b.y,b.w,b.h,this.focus===i?GOLD:'#334c59');text(row.label,b.x+19,b.y+29,16,row.locked?'#859da8':PAPER,{align:'left',body:true,weight:650});text((row.locked?'':'‹  ')+row.value+(row.locked?'':'  ›'),b.x+b.w-20,b.y+29,16,row.locked?'#91aebc':GOLD,{align:'right',body:true,weight:650});}else this.button(b.back?this.returnScreen?'VOLVER AL JUEGO':'← VOLVER':b.next?this.returnScreen?'REANUDAR':this.host()?'PERSONAJES →':'ESPERANDO AL ANFITRIÓN':b.room?'VOLVER A '+(this.online?'LA SALA':'ELEGIR JUEGO'):'PERSONALIZAR ASIGNACIÓN',b,this.focus===i);});
  if(this.tab===2)this.drawControls();text(this.returnScreen?'Las reglas de la ronda se cambian al preparar otra partida. Sonido, imagen y controles se ajustan aquí.':!this.host()?'El anfitrión configura la partida. Puedes ajustar tu sonido, imagen y controles.':'Cruceta / ↑ ↓: navegar · ← →: cambiar · A / Enter: elegir · B / Esc: volver',46,601,14,'#96afbb',{align:'left',body:true});
 },
 drawControls(){
  const rows=this.game==='kart'?[['Acelerar / frenar','W / S o ↑ / ↓','RT / LT'],['Dirección','A D o ← →','Palanca izquierda'],['Derrapar / acrobacia','Espacio','X / RB'],['Objeto / atrás','E / Q','LB / B'],['Rescate / pausa','R / Esc','Y / Menu']]:this.game==='fps'?[['Mover / mirar','WASD / ratón','Palancas izq. / der.'],['Correr','Shift','Pulsar L3'],['Apuntar / disparar','Clic der. / izq.','LT / RT'],['Recargar / saltar','R / Espacio','X / A'],['Cambiar arma / pausa','1–5 / Q / Esc','Y / Menu']]:[['Mover / saltar','WASD / Espacio','Palanca izq. / X'],['Ataque / especial','J / K','A / B'],['Escudo / agarre','L / U','LT / LB'],['Smash','Dirección + ataque','Palanca derecha'],['Pausa','Enter / Esc','Menu']];
  ['ACCIÓN','TECLADO Y RATÓN','MANDO'].forEach((s,i)=>text(s,65+i*390,223,12,TEAL,{align:'left',body:true,weight:800}));rows.forEach((r,i)=>{ctx.fillStyle=i%2?'#142936':'#1b303d';roundRect(ctx,44,247+i*55,1190,47,7);ctx.fill();r.forEach((s,j)=>text(s,65+j*390,272+i*55,17,PAPER,{align:'left',body:true}));});
  text('En local: P1 teclado; cada jugador adicional usa su mando. En Esmash también hay teclado 2.',48,552,13,'#93aeba',{align:'left',body:true});
 },
 playersItems(){const items=[{x:44,y:143,w:220,h:42,tab:0}];if(this.game==='kart')items.push({x:278,y:143,w:240,h:42,tab:1});if(!this.online)for(let i=0;i<this.config.locals;i++)items.push({x:700+i*134,y:144,w:122,h:40,edit:i});
  const count=this.game==='kart'&&this.playerTab===1?6:15;for(let i=0;i<count;i++)items.push(count===6?{x:44+i%3*246,y:211+Math.floor(i/3)*180,w:230,h:165,vh:i}:{x:44+i%5*147,y:211+Math.floor(i/5)*117,w:136,h:105,ch:i});
  if(this.game==='fps')for(let i=0;i<5;i++)items.push({x:817,y:251+i*55,w:417,h:46,fg:i});
  items.push({x:44,y:642,w:218,h:47,back:true},{x:817,y:623,w:417,h:66,next:true});return items;
 },
 playersUpdate(){const items=this.playersItems();for(const p of padInfo){const prev=this.padPrev.get(p.index)||[];if(p.buttons[3]&&!prev[3]&&this.game==='kart'){this.playerTab=1-this.playerTab;this.focus=0;}if(!this.online&&this.config.locals>1&&(p.buttons[4]&&!prev[4]||p.buttons[5]&&!prev[5])){this.edit=(this.edit+(p.buttons[4]?this.config.locals-1:1))%this.config.locals;this.focus=0;}this.padPrev.set(p.index,p.buttons.slice());}
  this.nav(items,i=>{const b=items[i];if(b.tab!==undefined){this.playerTab=b.tab;this.focus=0;}else if(b.edit!==undefined){this.edit=b.edit;this.focus=0;}else if(b.ch!==undefined)this.setPlayer('ch',b.ch);else if(b.vh!==undefined)this.setPlayer('vh',b.vh);else if(b.fg!==undefined)this.setPlayer('fg',b.fg);else if(b.back)this.back();else if(b.next){if(this.online&&!this.host()){this.ready=!this.ready;Net.guest.rdy=this.ready?1:0;Net.set({rdy:Net.guest.rdy});}else this.next();}});
 },
 playersDraw(){
  const p=this.player();this.header(this.gameInfo().name+' · PERSONAJES',this.online?'Cada quien elige su personaje y confirma LISTO':'Configura a cada jugador antes de elegir escenario',2);const items=this.playersItems();
  for(const [i,b] of items.entries()){
   if(b.tab!==undefined)this.button(b.tab?'VEHÍCULOS · Y':'PERSONAJES',b,this.playerTab===b.tab||this.focus===i);else if(b.edit!==undefined)this.button('JUGADOR '+(b.edit+1),b,b.edit===this.edit||this.focus===i);
   else if(b.ch!==undefined){KartRender.panel(b.x,b.y,b.w,b.h,this.focus===i?GOLD:p.ch===b.ch?TEAL:'#334c59');ctx.save();ctx.beginPath();ctx.rect(b.x+5,b.y+4,b.w-10,72);ctx.clip();drawPortrait(ctx,CHAR_ORDER[b.ch],b.x+b.w/2,b.y+41,27);ctx.restore();text(CHARS[CHAR_ORDER[b.ch]].name,b.x+b.w/2,b.y+87,14,PAPER,{body:true,weight:700});}
   else if(b.vh!==undefined){KartRender.panel(b.x,b.y,b.w,b.h,this.focus===i?GOLD:p.vh===b.vh?TEAL:'#334c59');const sp=KartRender.kartSprite(CHAR_ORDER[p.ch],b.vh);ctx.drawImage(sp.img,b.x+45,b.y-12,140,140);text(kartVehicle(b.vh).name,b.x+b.w/2,b.y+130,19,PAPER,{body:true,weight:700});text(kartVehicle(b.vh).tag,b.x+b.w/2,b.y+151,11,'#a0b9c4',{body:true});}
   else if(b.fg!==undefined)this.button(FPS_GUNS[b.fg].name,b,p.fg===b.fg||this.focus===i);else this.button(b.back?'← AJUSTES':this.online&&!this.host()?this.ready?'LISTO ✓ · CAMBIAR':'CONFIRMAR · LISTO':this.online?'TODOS LISTOS → ESCENARIO':'ELEGIR ESCENARIO →',b,this.focus===i||b.next&&this.ready);
  }
  if(this.game!=='fps'){KartRender.panel(817,211,417,366);const sp=KartRender.kartSprite(CHAR_ORDER[p.ch],this.game==='kart'?p.vh:0);if(this.game==='kart')ctx.drawImage(sp.img,896,220,260,249);else{ctx.save();ctx.translate(1025,460);ctx.scale(1.35,1.35);drawCharacter(ctx,CHAR_ORDER[p.ch],mkPose(POSES.idle));ctx.restore();}text(CHARS[CHAR_ORDER[p.ch]].name,1025,494,27,GOLD,{body:true,weight:800});wrapText(this.game==='kart'?kartVehicle(p.vh).desc:'Tu personaje, tus golpes y especiales.',1025,529,375,13,19,'#b1c6d0');}
  else{text('ARMA INICIAL',822,224,13,TEAL,{align:'left',body:true,weight:700});text('También puedes cambiarla dentro del juego.',822,550,13,'#9ab4c0',{align:'left',body:true});}
  if(this.online){const all=this.roster();text(all.map(p=>(p.ready?'✓ ':'○ ')+p.name).join('    '),46,606,15,TEAL,{align:'left',body:true});}else text(this.game==='kart'?'Y: personajes / vehículos · LB / RB: jugador · Cruceta: navegar · A: elegir':'LB / RB: jugador · Cruceta: navegar · A: elegir',46,606,14,'#9db6c1',{align:'left',body:true});
 },
 stages(){return this.game==='fight'?STAGE_INFO:this.game==='kart'?KART_TRACKS:[{id:'aurora',name:'Cuenca Aurora',desc:'Valle, bosque, río, edificios y azoteas. Un mundo abierto para explorar y combatir.'}];},
 stageItems(){const count=this.stages().length,cols=count>3?4:count;return this.stages().map((_,i)=>({x:44+i%cols*(1190/cols),y:154+Math.floor(i/cols)*213,w:1190/cols-14,h:count===1?420:198,stage:i})).concat([{x:44,y:642,w:218,h:47,back:true},{x:817,y:623,w:417,h:66,next:true}]);},
 stageUpdate(){const items=this.stageItems();this.nav(items,i=>{const b=items[i];if(b.back)this.back();else if(b.next){if(this.host())this.next();}else if(this.host()){if(this.game==='fight'){if(APP.rules.mode==='soccer'&&this.stages()[b.stage].id!=='stadium'){Toasts.push('Fútbol se juega en el Estadio');return;}APP.stageSel=b.stage;}else if(this.game==='kart')KartMenu.track=b.stage;this.publish({stg:APP.stageSel,track:KartMenu.track});}});},
 stageDraw(){this.header(this.gameInfo().name+' · ESCENARIO',this.host()?'Último paso: elige dónde jugar': 'El anfitrión elige el escenario',3);const selected=this.game==='fight'?APP.stageSel:this.game==='kart'?KartMenu.track:0;let generated=0;this.stageCache??=new Map();this.stageItems().forEach((b,i)=>{if(b.back||b.next)return this.button(b.back?'← PERSONAJES':this.host()?'¡JUGAR!':'ESPERANDO AL ANFITRIÓN',b,this.focus===i);const info=this.stages()[b.stage];slab(b.x,b.y,b.w,b.h,{skew:.02,top:'#17313d',bottom:'#0c202b',edge:selected===b.stage?TEAL:this.focus===i?GOLD:'#3b5360',lw:3});if(this.game==='kart'){KartRender.map(KartMenu.course(b.stage),b.x+18,b.y+18,b.w-36,110);}else if(this.game==='fight'){const key=[info.id,Prefs.quality,Prefs.fx,VIEW.k,APP.rules.mode==='soccer'].join(':');if(!this.stageCache.has(key)&&generated++<2){if(this.stageCache.size>=32)this.stageCache.delete(this.stageCache.keys().next().value);this.stageCache.set(key,APP.stageThumb(info,APP.rules.mode==='soccer',Math.floor(b.w-16),115,true));}const preview=this.stageCache.get(key);if(preview?.img)ctx.drawImage(preview.img,b.x+8,b.y+8,b.w-16,115);}else if(this.poster.complete&&this.poster.naturalWidth)ctx.drawImage(this.poster,this.poster.width*.64,0,this.poster.width*.36,this.poster.height*.7,b.x+8,b.y+8,b.w-16,115);text(info.name,b.x+15,b.y+150,fitSize(info.name,b.w-30,24),PAPER,{align:'left',body:true,weight:750});text(selected===b.stage?'SELECCIONADO':'',b.x+15,b.y+179,11,TEAL,{align:'left',body:true,weight:800});});},
};
ShellUI.poster.src='assets/cover-three-games.webp';

APP.titleUpdate=function(){const items=[{x:330,y:576,w:292,h:68},{x:650,y:576,w:300,h:68}];ShellUI.nav(items,i=>ShellUI.begin(i===1));};
APP.titleDraw=function(){ctx.fillStyle='#0a1925';ctx.fillRect(0,0,W,H);const image=ShellUI.poster;if(image.complete&&image.naturalWidth)ctx.drawImage(image,0,0,W,H);const shade=ctx.createLinearGradient(0,440,0,H);shade.addColorStop(0,'rgba(3,13,22,0)');shade.addColorStop(1,'rgba(3,13,22,.92)');ctx.fillStyle=shade;ctx.fillRect(0,420,W,300);text('ESMASH',640,108,74,'#fff0c9',{weight:900,stroke:'#102839',strokeW:8});text('BROS',640,165,49,'#f1c574',{weight:900,stroke:'#102839',strokeW:6});text('PELEAS  /  KARTS  /  AURORA FPS',640,210,12,'#d7e5ed',{body:true,weight:750});ShellUI.button('JUEGO LOCAL',{x:330,y:576,w:292,h:68},ShellUI.focus===0,'EN ESTE DISPOSITIVO');ShellUI.button('JUEGO ONLINE',{x:650,y:576,w:300,h:68},ShellUI.focus===1,'CREA TU SALA E INVITA');text('15 PERSONAJES · 3 JUEGOS · TU MISMA SALA',640,684,12,'#b4c8d1',{body:true,weight:700});};
APP.uiHubUpdate=function(){const s=ShellUI,items=s.cards().concat([{x:44,y:642,w:218,h:47}]);s.nav(items,i=>i<3?s.choose(s.games[i].id):s.leave());};
APP.uiHubDraw=function(){const s=ShellUI;s.header('¿A QUÉ JUGAMOS?','Elige un juego para preparar tu partida');s.drawGames();text('AJUSTES → PERSONAJES → ESCENARIO',640,501,18,'#a2beca',{body:true,weight:650});s.button('← PORTADA',{x:44,y:642,w:218,h:47},s.focus===3);};
APP.uiRoomUpdate=function(){const s=ShellUI;if(s.connecting){s.connect();if(++s.joinWait>1200&&Net.wantCode){Toasts.push('No encontramos esa sala. Puedes crear una nueva.');Net.wantCode=null;}if(keyEdge('kb1','Escape'))s.leave();return;}const items=s.cards().concat([{x:1016,y:66,w:218,h:48},{x:44,y:643,w:218,h:46},{x:530,y:643,w:218,h:46},{x:764,y:643,w:218,h:46}]);s.nav(items,i=>i<3?s.choose(s.games[i].id):i===3?Net.invite():i===4?s.leave():i===5?AV.on?AV.setMic(!AV.mic):AV.start():AV.on?AV.setCam(!AV.cam):AV.start());};
APP.uiRoomDraw=function(){const s=ShellUI;s.header(s.connecting?'CONECTANDO TU SALA…':'TU SALA · LOS TRES JUEGOS',s.host()?'Elige un juego. La sala permanece abierta.':'El anfitrión confirma el juego; tú puedes proponerlo.');if(s.connecting){text(Net.wantCode?'Entrando con tu invitación: '+Net.wantCode:Net.ok?'Creando tu sala…':'Conectando con las salas online…',640,329,24,GOLD,{body:true});text('Esc: volver a la portada',640,400,16,MUTED,{body:true});return;}s.drawGames();s.button('INVITAR',{x:1016,y:66,w:218,h:48},s.focus===3,'SALA '+(Net.role==='host'?Net.code:Net.hostPres()?.code||'…'));text('JUGADORES EN LA SALA',44,421,12,'#a2bac7',{align:'left',body:true,weight:800});s.drawMembers();s.button('← SALIR DE LA SALA',{x:44,y:643,w:218,h:46},s.focus===4);s.button(AV.on&&AV.mic?'MICRÓFONO: ON':'ACTIVAR MICRÓFONO',{x:530,y:643,w:218,h:46},s.focus===5);s.button(AV.on&&AV.cam?'CÁMARA: ON':'ACTIVAR CÁMARA',{x:764,y:643,w:218,h:46},s.focus===6);};
APP.uiSettingsUpdate=()=>ShellUI.settingsUpdate();APP.uiSettingsDraw=()=>ShellUI.settingsDraw();APP.uiPlayersUpdate=()=>ShellUI.playersUpdate();APP.uiPlayersDraw=()=>ShellUI.playersDraw();APP.uiStageUpdate=()=>ShellUI.stageUpdate();APP.uiStageDraw=()=>ShellUI.stageDraw();

const shellNetTick=Net.tick;Net.tick=function(){
 const hp=this.role==='guest'?this.hostPres():null,lob=this.role==='host'?this.lob:hp?.lob;
 if(ShellUI.active&&ShellUI.online&&this.role==='guest'&&(!hp||hp.role!=='host'||!hp.lob)){ShellUI.tick();return;}
 if(lob?.ui?.v===1){ShellUI.active=true;ShellUI.online=true;ShellUI.game=lob.ui.game;const cap=window.APYV_WEB&&this.room&&typeof this.room.fastReady==='function'&&this.rollbackChoice()!=='0'?RB_COMPAT:0;if(this.rbCap!==cap){this.rbCap=cap;this.set({rbc:cap});}ShellUI.tick();if(lob.ph==='shell'||ShellUI.stayInRoom)return;}
 if(ShellUI.connecting){ShellUI.connect();return;}
 return shellNetTick.call(this);
};
const shellGo=APP.go;APP.go=function(s){
  if(ShellUI.active){if(ShellUI.inBindings&&s!=='binds'){ShellUI.inBindings=false;return shellGo.call(this,'uiSettings');}if(s==='main')return ShellUI.room();if(['controls','settings'].includes(s)){ShellUI.tab=s==='controls'?2:1;return shellGo.call(this,'uiSettings');}if(s==='online')return ShellUI.begin(true);}
 return shellGo.call(this,s);
};
const shellFocus=APP.focusNative;APP.focusNative=function(d){if(this.screen==='title'||ShellUI.active&&(ShellUI.screens.has(this.screen)||ShellUI.paused))return false;return shellFocus.call(this,d);};
const shellUpdate=APP.update;APP.update=function(){
 if(this.screen==='title'&&Net.wantCode&&!ShellUI.active){ShellUI.begin(true);return;}
 if(ShellUI.active&&ShellUI.inBindings&&!Capture.active&&Devices.list.some(d=>Devices.nav(d).back)){APP.go('uiSettings');return;}
  if(ShellUI.active&&['results','kartResults','fpsResults'].includes(this.screen))return ShellUI.resultsUpdate();
  if(ShellUI.active&&['battle','netview','kartRace','fpsGame'].includes(this.screen)){
  const pause=keyEdge('kb1','Escape')||Devices.list.some(d=>Devices.nav(d).start);
  if(pause){if(ShellUI.paused)ShellUI.resume();else ShellUI.pause();return;}
  if(Pointer.clicked&&clickIn(W-194,H-36,170,28)){ShellUI.pause();return;}
  if(!ShellUI.paused&&ShellUI.current()?.paused)ShellUI.pause();
  if(ShellUI.paused){if(ShellUI.online&&ShellUI.game==='kart')KartOnline.raceUpdate();else if(ShellUI.online&&ShellUI.game==='fps')FPSOnline.update({});else if(ShellUI.online&&ShellUI.game==='fight')ShellUI.quietFight();ShellUI.settingsUpdate();return;}
 }
 return shellUpdate.call(this);
};
const shellDraw=APP.draw;APP.draw=function(){
 if(this.screen==='title'||ShellUI.active&&ShellUI.screens.has(this.screen)){this[this.screen+'Draw']?.();ShellUI.notices();return;}
 if(ShellUI.active&&['results','kartResults','fpsResults'].includes(this.screen)){ShellUI.resultsDraw();Toasts.draw();return;}
 if(ShellUI.active&&ShellUI.paused&&this.screen!=='binds'){ShellUI.settingsDraw();Toasts.draw();return;}
 shellDraw.call(this);if(ShellUI.active&&['battle','netview','kartRace','fpsGame'].includes(this.screen))ShellUI.button('PAUSA / AJUSTES',{x:W-194,y:H-36,w:170,h:28});
};

// Gamepads select vehicles directly; no dependency on the fighting button map.
const ShellKartInput={prev:new Map(),read(dev){const keyboard=dev?.startsWith('kb'),keys=keysDown,pad=dev?.startsWith('pad')?padInfo.find(p=>'pad'+p.index===dev):null,b=pad?.buttons||[],a=pad?.axes||[];let steer=keyboard?((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)):0;
 if(pad&&Math.abs(a[0]||0)>.16)steer=(a[0]-sign(a[0])*.16)/.84;if(b[14])steer=-1;if(b[15])steer=1;
 const raw={steer:-steer,gas:keyboard&&(keys.has('KeyW')||keys.has('ArrowUp'))||b[7]||b[0],brake:keyboard&&(keys.has('KeyS')||keys.has('ArrowDown'))||b[6],drift:keyboard&&(keys.has('Space')||keys.has('ShiftLeft'))||b[2]||b[5],item:keyboard&&(keys.has('KeyE')||keys.has('KeyJ'))||b[4],rear:keyboard&&keys.has('KeyQ')||b[1],rescue:keyboard&&keys.has('KeyR')||b[3]},prev=this.prev.get(dev)||{},out={...raw,itemPressed:!!raw.item&&!prev.item,driftPressed:!!raw.drift&&!prev.drift,rescuePressed:!!raw.rescue&&!prev.rescue};this.prev.set(dev,raw);return out;}};
const shellKartUpdate=APP.kartRaceUpdate;APP.kartRaceUpdate=function(){const r=this.kartRace;if(!ShellUI.active||r?.online)return shellKartUpdate.call(this);if(!r||r.paused)return;const locals=r.localPlayers||[r.player],devs=r.localDevices||ShellUI.localDevices(),inputs={};locals.forEach((p,i)=>inputs[p.index]=locals.length===1&&TouchPad.active?KartControls.read():ShellKartInput.read(devs[i]));r.update({players:inputs});KartSound.tick(r);if(r.phase==='finish'&&r.resultTime>=3){KartMenu.record();r.stop();this.go('kartResults');}};
const shellAttachRollback=Net.attachRollback;Net.attachRollback=function(b){shellAttachRollback.call(this,b);const read=this.rollbackSession.read;this.rollbackSession.read=p=>ShellUI.active&&ShellUI.paused?blankState():read(p);};
const shellSendInput=Net.sendInput;Net.sendInput=function(){if(!ShellUI.active||!ShellUI.paused)return shellSendInput.call(this);const c=Devices.ctrls[this.localDev],cur=c?.cur;if(c)c.cur=blankState();try{return shellSendInput.call(this);}finally{if(c)c.cur=cur;}};
const shellInviteURL=Net.inviteURL;Net.inviteURL=function(){if(!ShellUI.active||this.role!=='guest')return shellInviteURL.call(this);const code=this.hostPres()?.code;return window.APYV_WEB&&code?location.origin+location.pathname+'?sala='+encodeURIComponent(code):null;};
Object.assign(ShellUI,{
 resultsItems(){return [{x:44,y:640,w:300,h:50},{x:864,y:629,w:370,h:61}];},
 resultsUpdate(){this.nav(this.resultsItems(),i=>{if(!this.host())return this.guestRoom();if(i===0)return this.room();if(this.game==='kart'&&!this.online&&KartMenu.cupState&&KartMenu.cupState.round<3){KartMenu.track=(KartMenu.cupState.firstTrack+KartMenu.cupState.round)%3;return KartMenu.start();}this.step='settings';this.tab=0;this.resetReady();this.publish({ph:'shell',set:null,res:null});this.show('uiSettings');});},
 resultsDraw(){this.header('RESULTADOS · '+this.gameInfo().name,'La sala y la conexión de voz/cámara se conservan');
  let rows=[];if(this.game==='kart')rows=APP.kartRace.order.map((p,i)=>({name:p.peer?Net.nameOf(p.peer):CHARS[p.id].name,score:p.finish===null?'EN PISTA':KartRender.time(p.finish)}));else if(this.game==='fps')rows=APP.fps.players.slice().sort((a,b)=>b.kills-a.kills).map(p=>({name:CHARS[p.id].name,score:p.kills+' BAJAS / '+p.deaths+' CAÍDAS'}));else rows=(APP.results?.ranked||[]).map(p=>({name:p.label||CHARS[p.id].name,score:p.kos+' KO / '+p.falls+' CAÍDAS'}));
  rows.slice(0,8).forEach((r,i)=>{const y=137+i*(rows.length>4?55:100);KartRender.panel(44,y,1190,rows.length>4?47:79);text((i+1)+'. '+r.name,68,y+(rows.length>4?25:41),rows.length>4?19:27,PAPER,{align:'left',body:true,weight:700});text(r.score,1210,y+(rows.length>4?25:41),19,GOLD,{align:'right',body:true,weight:700});});this.resultsItems().forEach((b,i)=>this.button(i===0?'VOLVER A '+(this.online?'LA SALA':'LOS JUEGOS'):this.host()?(this.game==='kart'&&KartMenu.cupState?.round<3?'SIGUIENTE CARRERA':'PREPARAR OTRA PARTIDA'):'ESPERANDO AL ANFITRIÓN',b,this.focus===i));
 },
});
const shellPause=ShellUI.pause;ShellUI.pause=function(){shellPause.call(this);if(this.online&&this.game==='fight'&&this.current())this.current().paused=false;};
const shellStageDraw=APP.uiStageDraw;APP.uiStageDraw=function(){if(ShellUI.game!=='fps')return shellStageDraw();const s=ShellUI,b=s.stageItems()[0];s.header('AURORA · ELIGE TU MUNDO','Un mundo abierto para explorar y combatir',3);KartRender.panel(b.x,b.y,b.w,b.h,s.focus===0?GOLD:TEAL);if(s.poster.complete&&s.poster.naturalWidth){const sw=s.poster.width*.45,sh=sw/2;ctx.save();roundRect(ctx,b.x+14,b.y+14,660,330,9);ctx.clip();ctx.drawImage(s.poster,s.poster.width*.55,s.poster.height*.2,sw,sh,b.x+14,b.y+14,660,330);ctx.restore();}text('CUENCA AURORA',766,230,31,PAPER,{align:'left',body:true,weight:800});wrapText(s.stages()[0].desc,766,277,420,18,28,'#b1c9d4','left');text(s.config.target+' bajas · '+s.config.minutes+' minutos',766,391,19,GOLD,{align:'left',body:true});text(s.online?'Cada jugador tiene su propia pantalla.':'Pantalla dividida solo en multijugador local.',766,434,16,'#93b7c5',{align:'left',body:true});text('SELECCIONADO',b.x+24,b.y+383,12,TEAL,{align:'left',body:true,weight:800});s.stageItems().slice(1).forEach((b,i)=>s.button(i===0?'← PERSONAJES':s.host()?'¡JUGAR!':'ESPERANDO AL ANFITRIÓN',b,s.focus===i+1));};
