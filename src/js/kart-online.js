'use strict';
// Reuse Esmash rooms, invitations, fast DataChannels, relay fallback and AV.
// Only the host resolves racing items, contacts, checkpoints and results.
const KART_NET_FIELDS=['s','x','v','yaw','velocityYaw','steer','lat','drift','driftDir','charge','turbo','shield','stun','invuln','height','vy','airTime','trick','coins','star','magnet','slow','slip','roulette','completedLaps','finish','nextCheckpoint','rescue','launch','rampCd','air','boostCd','slipCd','hitCd'];
const KART_NET_ITEMS=Object.keys(KART_ITEMS);
const KartOnline={
  browsing:false,ep:0,seq:0,counters:[0,0,0],remote:new Map(),lastStateTick:-1,lastStateAt:0,sendTick:0,
  browse(){this.browsing=true;KartMenu.save();if(Net.user?.askName)Net.user.askName(false);APP.onSel=0;APP.go('online');},
  publish(extra){Object.assign(Net.lob,extra);const j=JSON.stringify(Net.lob);if(j!==Net.lastLobJSON){Net.lastLobJSON=j;Net.set({lob:Net.lob});}},
  lobby(){
    if(APP.kartRace)APP.kartRace.stop();APP.kartRace=null;KartMenu.cupState=null;
    Net.guest.rdy=0;Net.set({st:null,inp:null,rdy:0});
    this.publish({game:'kart',ph:'kartLobby',set:null,players:[],track:KartMenu.track,cc:KartMenu.cc,assist:KartMenu.assist});
    APP.go('kartLobby');this.syncLobby();
  },
  syncLobby(){
    const old=Net.lob.players||[],guests=Net.guestsOf(Net.myPeer());
    // Preserve existing slots when somebody leaves; extra arrivals watch until the next race.
    const ordered=old.slice(1).map(p=>guests.find(g=>g.peer===p.peer)).filter(Boolean);
    for(const g of guests)if(!ordered.includes(g))ordered.push(g);
    const players=[{peer:Net.myPeer(),ch:KartMenu.char,ready:1},...ordered.slice(0,3).map(g=>({peer:g.peer,ch:clamp(g.presence.ch|0,0,CHAR_ORDER.length-1),ready:g.presence.rdy?1:0}))];
    this.publish({players,track:KartMenu.track,cc:KartMenu.cc,assist:KartMenu.assist});
  },
  hostStart(){
    this.syncLobby();const humans=Net.lob.players;
    if(humans.some(p=>!p.ready)){Toasts.push('Espera a que todos marquen LISTO');return;}
    const seed=Date.now()>>>0,random=new SimRNG(seed),ids=humans.map(p=>CHAR_ORDER[p.ch]);
    const cpu=CHAR_ORDER.filter(id=>!ids.includes(id));while(ids.length<8)ids.push(cpu.splice(Math.floor(random.next()*cpu.length),1)[0]||CHAR_ORDER[ids.length]);
    const setup={v:1,ep:(Net.lob.ep||0)+1,track:KartMenu.track,cc:KartMenu.cc,assist:KartMenu.assist,seed,ids,humans};
    this.openRace(setup);this.publish({ph:'kartRace',ep:setup.ep,set:setup});this.pushState();
  },
  validSetup(s){return s&&s.v===1&&Number.isSafeInteger(s.ep)&&s.ep>=0&&Number.isInteger(s.track)&&s.track>=0&&s.track<3&&Number.isInteger(s.cc)&&s.cc>=0&&s.cc<3&&Number.isFinite(s.seed)&&Array.isArray(s.ids)&&s.ids.length===8&&s.ids.every(id=>CHAR_ORDER.includes(id))&&Array.isArray(s.humans)&&s.humans.length>0&&s.humans.length<=4&&s.humans.every(p=>p&&typeof p.peer==='string'&&p.peer.length<100)&&new Set(s.humans.map(p=>p.peer)).size===s.humans.length&&s.humans[0].peer===Net.hostPeer;},
  openRace(s){
    if(!this.validSetup(s))return false;
    if(APP.kartRace)APP.kartRace.stop();
    const race=APP.kartRace=new KartRace(KART_TRACKS[s.track],s.ids[0],s.cc,!!s.assist,s.seed,s.ids);
    race.online=true;race.setup=s;race.spectator=!s.humans.some(p=>p.peer===Net.myPeer());
    race.racers.forEach((r,i)=>{r.human=i<s.humans.length;r.peer=s.humans[i]?.peer||null;r.label=r.peer?Net.nameOf(r.peer):CHARS[r.id].name;});
    race.player=race.racers.find(r=>r.peer===Net.myPeer())||race.racers[0];
    this.ep=s.ep;this.seq=0;this.counters=[0,0,0];this.remote.clear();this.lastStateTick=-1;this.lastStateAt=performance.now();this.sendTick=0;
    KartMenu.cupState=null;KartMenu.recorded=false;KartControls.prev={};KartControls.tapped.clear();KartControls.read();
    APP.go('kartRace');TouchPad.release();return true;
  },
  leave(){const r=APP.kartRace;if(r)r.stop();APP.kartRace=null;Net.leave();this.browsing=true;APP.onSel=0;APP.go('online');},
  tick(){
    if(Net.role==='host'){
      if(Net.lob.game==='kart'&&APP.screen==='kartLobby')this.syncLobby();return;
    }
    const hp=Net.hostPres(),lob=hp?.lob;
    if(!lob){if(++Net.lostHostT>300){Toasts.push('Se perdió la sala');this.leave();}return;}
    Net.lostHostT=0;Net.rememberRoom(hp.code);
    if(lob.ph==='kartLobby'){
      if(APP.screen!=='kartLobby'){APP.kartRace?.stop();APP.kartRace=null;Net.guest.rdy=0;Net.set({rdy:0,inp:null});APP.go('kartLobby');}
      KartMenu.track=clamp(lob.track|0,0,2);KartMenu.cc=clamp(lob.cc|0,0,2);KartMenu.assist=!!lob.assist;
    }else if((lob.ph==='kartRace'||lob.ph==='kartResults')&&this.validSetup(lob.set)){
      if(!APP.kartRace?.online||this.ep!==lob.set.ep)this.openRace(lob.set);
      if(hp.st&&hp.st.k===1)this.applyState(hp.st);
      if(lob.ph==='kartResults'&&APP.screen!=='kartResults'){APP.kartRace.stop();APP.go('kartResults');}
    }
  },
  sendInput(input){
    if(APP.kartRace.spectator)return;
    ['itemPressed','driftPressed','rescuePressed'].forEach((k,i)=>{if(input[k])this.counters[i]++;});
    const bits=(input.gas?1:0)|(input.brake?2:0)|(input.drift?4:0)|(input.rear?8:0);
    // Send edges immediately, held controls at 30 Hz. Counters survive lost packets.
    if(this.sendTick++%2===0||input.itemPressed||input.driftPressed||input.rescuePressed)Net.set({inp:{k:1,e:this.ep,q:++this.seq,a:[Math.round(clamp(input.steer||0,-1,1)*100),bits,...this.counters]}});
  },
  inputFor(r){
    const pr=Net.presOf(r.peer),packet=pr?.inp,now=performance.now();let rec=this.remote.get(r.peer);
    if(!rec){rec={q:-1,c:[0,0,0],at:now,input:{}};this.remote.set(r.peer,rec);}
    const a=packet?.a;
    if(pr?.role==='guest'&&pr.join===Net.myPeer()&&packet?.k===1&&packet.e===this.ep&&Number.isSafeInteger(packet.q)&&packet.q>rec.q&&Array.isArray(a)&&a.length===5&&a.every(Number.isFinite)&&Math.abs(a[0])<=100&&Number.isInteger(a[1])&&a[1]>=0&&a[1]<=15&&a.slice(2).every(n=>Number.isSafeInteger(n)&&n>=0)){
      rec.q=packet.q;rec.at=now;rec.input={steer:a[0]/100,gas:!!(a[1]&1),brake:!!(a[1]&2),drift:!!(a[1]&4),rear:!!(a[1]&8)};
      ['itemPressed','driftPressed','rescuePressed'].forEach((key,i)=>{rec.input[key]=a[i+2]>rec.c[i];rec.c[i]=a[i+2];});
    }
    r.disconnected=!pr||pr.role!=='guest'||pr.join!==Net.myPeer()||now-rec.at>3000;
    const out=now-rec.at>600?{}:{...rec.input};
    rec.input.itemPressed=rec.input.driftPressed=rec.input.rescuePressed=false;return out;
  },
  snapshot(){
    const r=APP.kartRace,q=n=>typeof n==='number'?Math.round(n*100)/100:n;
    const snap={k:1,e:this.ep,t:r.tick,g:[q(r.time),q(r.countdown),['grid','race','finish'].indexOf(r.phase),q(r.resultTime)],
      r:r.racers.map(p=>[...KART_NET_FIELDS.map(k=>q(p[k])),KART_NET_ITEMS.indexOf(p.item),p.disconnected?1:0]),
      b:r.course.boxes.map(b=>q(Math.max(0,b.ready-r.time))),c:r.course.coins.map(c=>q(Math.max(0,c.ready-r.time))),
      p:r.projectiles.slice(-18).map(p=>[KART_NET_ITEMS.indexOf(p.type),p.owner,q(p.s),q(p.x),q(p.life),q(p.v),q(p.vx),q(p.age),p.target??-1,p.dir]),
      l:r.racers.filter(p=>p.human).map(p=>p.lapTimes.map(q)),d:r.effects.filter(e=>e.type!=='flame').slice(-4).map(e=>[e.type,q(e.s),q(e.x),q(e.life),q(e.max),e.color])};
    // Leave room for lobby/AV metadata under the original 4 KiB presence budget.
    while(JSON.stringify(snap).length>3000&&(snap.p.length||snap.d.length)){if(snap.d.length)snap.d.shift();else snap.p.shift();}
    return snap;
  },
  pushState(){Net.set({st:this.snapshot()});},
  applyState(s){
    const race=APP.kartRace;
    if(!race||s.e!==this.ep||!Number.isSafeInteger(s.t)||s.t<=this.lastStateTick||!Array.isArray(s.g)||s.g.length!==4||!s.g.every(Number.isFinite)||!Array.isArray(s.r)||s.r.length!==8||s.r.some(a=>!Array.isArray(a)||a.length!==KART_NET_FIELDS.length+2||a.some(v=>v!==null&&typeof v!=='boolean'&&!Number.isFinite(v))))return;
    if(!Array.isArray(s.p)||s.p.length>48||s.p.some(a=>!Array.isArray(a)||a.length!==10||!a.every(Number.isFinite)||!KART_NET_ITEMS[a[0]]||a[1]<0||a[1]>7))return;
    const first=this.lastStateTick<0;this.lastStateTick=s.t;this.lastStateAt=performance.now();
    const oldPhase=race.phase,oldCount=Math.ceil(race.countdown);
    race.time=s.g[0];race.countdown=s.g[1];race.phase=['grid','race','finish'][s.g[2]]||'grid';race.resultTime=s.g[3];race.tick=s.t;
    if(!first&&oldPhase==='grid'){if(race.phase==='race')KartSound.effect('confirm');else if(Math.ceil(race.countdown)!==oldCount)KartSound.effect('menu');}
    s.r.forEach((a,i)=>{const r=race.racers[i],old={s:r.s,x:r.x,yaw:r.yaw,velocityYaw:r.velocityYaw,v:r.v},wasFinish=r.finish,wasStun=r.stun,oldItem=r.item;
      KART_NET_FIELDS.forEach((k,j)=>r[k]=a[j]);r.item=KART_NET_ITEMS[a[KART_NET_FIELDS.length]]||null;r.disconnected=!!a[KART_NET_FIELDS.length+1];
      r.serverS=r.s;r.serverX=r.x;
      if(!first&&r===race.player&&!race.spectator&&race.phase==='race'&&!r.rescue&&r.finish===null&&Math.abs(old.s-r.s)<25){r.s=lerp(old.s,r.s,.4);r.x=lerp(old.x,r.x,.35);r.yaw=lerp(old.yaw,r.yaw,.4);r.velocityYaw=lerp(old.velocityYaw,r.velocityYaw,.4);r.v=lerp(old.v,r.v,.45);}
      r.ps=r.s;r.px=r.x;
      if(r.human&&s.l?.[i])r.lapTimes=s.l[i].filter(Number.isFinite);
      if(r===race.player&&!race.spectator){if(wasFinish===null&&r.finish!==null){race.say('¡META!');race.saveBest();KartSound.effect('confirm');}if(r.stun>wasStun+.3)race.feedback(r,'hit',.65);if(!oldItem&&r.item)KartSound.effect('confirm');}
    });
    race.course.boxes.forEach((b,i)=>b.ready=race.time+(+s.b?.[i]||0));race.course.coins.forEach((c,i)=>c.ready=race.time+(+s.c?.[i]||0));
    race.projectiles=s.p.map(a=>({type:KART_NET_ITEMS[a[0]],owner:a[1],s:a[2],ps:a[2],x:a[3],life:a[4],v:a[5],vx:a[6],age:a[7],target:a[8]<0?undefined:a[8],dir:a[9]}));
    race.effects=(s.d||[]).filter(a=>Array.isArray(a)&&['lightning','hit'].includes(a[0])&&a.slice(1,5).every(Number.isFinite)).map(a=>({type:a[0],s:a[1],x:a[2],life:a[3],max:a[4],color:a[5]}));
    this.sort(race);
  },
  sort(r){r.order=r.racers.slice().sort((a,b)=>a.finish!==null&&b.finish!==null?a.finish-b.finish:a.finish!==null?-1:b.finish!==null?1:b.s-a.s);},
  predict(input){
    const r=APP.kartRace,dt=1/60;r.tick++;
    if(r.phase==='grid'){r.countdown=Math.max(.01,r.countdown-dt);return;}
    if(performance.now()-this.lastStateAt>600)return;
    r.time+=dt;
    for(const p of r.racers){p.ps=p.s;p.px=p.x;
      if(p===r.player&&!r.spectator&&p.finish===null){r.predicting=true;r.drive(p,input,dt);r.predicting=false;}
      else {p.s+=p.v*Math.cos(p.velocityYaw)*dt;p.x=clamp(p.x+Math.sin(p.velocityYaw)*p.v/r.course.sample(p.s).width*dt,-1.48,1.48);}
    }
    for(const p of r.projectiles){p.ps=p.s;p.s+=p.v*dt;p.life-=dt;}r.projectiles=r.projectiles.filter(p=>p.life>0);
    for(const e of r.effects)e.life-=dt;r.effects=r.effects.filter(e=>e.life>0);this.sort(r);
  },
  raceUpdate(){
    const race=APP.kartRace,raw=KartControls.read();
    if(raw.musicPressed)Audio8.setSound(Audio8.musicOn?'fx':'all');
    if(raw.pausePressed){race.paused=!race.paused;race.pauseSel=0;TouchPad.release();}
    const input=race.paused||race.spectator?{}:raw;
    if(Net.role==='host'){
      const inputs=race.racers.map(r=>!r.human?{}:r.peer===Net.myPeer()?input:this.inputFor(r));
      const paused=race.paused;race.paused=false;race.update({players:inputs});race.paused=paused;
      if(this.sendTick++%3===0)this.pushState();
      if(race.phase==='finish'&&race.resultTime>=3){this.pushState();this.publish({ph:'kartResults'});race.stop();APP.go('kartResults');return;}
    }else {this.sendInput(input);this.predict(input);}
    KartSound.tick(race);
    if(!race.paused)return;
    const choose=i=>{if(i===0){race.paused=false;return;}if(i===1){if(Net.role==='host')this.lobby();else AV.setMic(!AV.mic);return;}this.leave();};
    for(const d of Devices.list){const n=Devices.nav(d);if(n.up||n.down)race.pauseSel=(race.pauseSel+(n.down?1:2))%3;if(n.confirm&&!raw.pausePressed)return choose(race.pauseSel);}
    for(let i=0;i<3;i++)if(KartMenu.hit({x:440,y:318+i*72,w:400,h:58}))return choose(i);
    if(KartMenu.hit({x:470,y:654,w:340,h:38}))Audio8.setSound(Audio8.musicOn?'fx':'all');
  },
  resultsUpdate(){
    for(const d of Devices.list){const n=Devices.nav(d);if(n.back)return this.leave();if((n.confirm||n.start)&&Net.role==='host')return this.lobby();}
    if(KartMenu.hit({x:730,y:582,w:485,h:62})&&Net.role==='host')return this.lobby();
    if(KartMenu.hit({x:730,y:659,w:485,h:40}))return this.leave();
  },
};

// Route existing online creation, joining and invite links by the host's game.
const kartNetHost=Net.host;Net.host=function(){kartNetHost.call(this);if(KartOnline.browsing){this.lob.game='kart';}};
const kartNetJoin=Net.join;Net.join=function(peer){kartNetJoin.call(this,peer);if(this.presOf(peer)?.lob?.game==='kart'){this.guest.ch=KartMenu.char;this.set({ch:this.guest.ch});}};
const kartNetTick=Net.tick;Net.tick=function(){
  const kart=this.role==='host'?this.lob.game==='kart':this.role==='guest'&&this.hostPres()?.lob?.game==='kart';
  if(kart){if(this.ok)KartOnline.tick();return;}kartNetTick.call(this);
};
const kartOnlineGo=APP.go;APP.go=function(s){
  if(s==='modesel'&&Net.role==='host'&&Net.lob.game==='kart'){KartOnline.lobby();return;}
  if(s==='main'){KartOnline.browsing=false;if(APP.kartRace?.online)Net.leave();}
  return kartOnlineGo.call(this,s);
};
const kartOnlineDraw=APP.onlineDraw;APP.onlineDraw=function(){
  kartOnlineDraw.call(this);
  if(KartOnline.browsing){ctx.fillStyle='#101b2b';ctx.fillRect(360,5,560,66);sfText('ESMASH KART · ONLINE',640,40,40,GOLD);}
  const hosts=Net.availableHosts();hosts.forEach((h,i)=>{if(h.presence.lob?.game==='kart'){ctx.fillStyle='#183d4e';roundRect(ctx,254,247+i*70,230,22,6);ctx.fill();text('KART · '+(h.presence.lob.players?.length||1)+'/4 · '+(h.presence.lob.ph==='kartLobby'?'sala abierta':'en carrera'),369,258,13,TEAL,{body:true,weight:700});}});
};
APP.kartLobbyUpdate=function(){
  const host=Net.role==='host',M=KartMenu,g=Net.guest,cur=host?M.char:g.ch;
  let ch=cur;const ready=()=>{if(host)return KartOnline.hostStart();g.rdy=g.rdy?0:1;Net.set({rdy:g.rdy});};
  for(const d of Devices.list){const n=Devices.nav(d);
    if(n.left)ch=(ch+CHAR_ORDER.length-1)%CHAR_ORDER.length;if(n.right)ch=(ch+1)%CHAR_ORDER.length;if(n.up)ch=(ch+CHAR_ORDER.length-5)%CHAR_ORDER.length;if(n.down)ch=(ch+5)%CHAR_ORDER.length;
    if(n.back)return KartOnline.leave();if(n.confirm||n.start)return ready();
    if(n.jump&&host)M.cc=(M.cc+1)%3;if(n.shield&&host)M.track=(M.track+1)%3;if(n.grab)Net.invite();
  }
  for(let i=0;i<CHAR_ORDER.length;i++){const b={x:42+i%5*152,y:329+Math.floor(i/5)*81,w:142,h:71};if(M.hit(b))ch=i;}
  if(ch!==cur){if(host)M.char=ch;else{g.ch=ch;g.rdy=0;Net.set({ch,rdy:0});}}
  if(host){for(let i=0;i<3;i++)if(M.hit({x:842,y:335+i*57,w:394,h:48}))M.track=i;if(M.hit({x:842,y:511,w:394,h:43}))M.cc=(M.cc+1)%3;}
  if(M.hit({x:842,y:576,w:394,h:55}))return ready();
  if(M.hit({x:42,y:652,w:196,h:42}))return KartOnline.leave();
  if(M.hit({x:253,y:652,w:256,h:42}))Net.invite();
};
APP.kartLobbyDraw=function(){
  const host=Net.role==='host',lob=host?Net.lob:Net.hostPres()?.lob||{},players=lob.players||[],M=KartMenu,cur=host?M.char:Net.guest.ch,mine=players.some(p=>p.peer===Net.myPeer());
  M.header('SALA ESMASH KART','CÓDIGO '+(host?Net.code:Net.hostPres()?.code||'…')+'  ·  Hasta cuatro pilotos · voz, cámara y pantalla dividida');
  for(let i=0;i<4;i++){const b={x:42+i*307,y:120,w:287,h:183},p=players[i];KartRender.panel(b.x,b.y,b.w,b.h);
    if(p){const id=CHAR_ORDER[p.ch]||CHAR_ORDER[0],cam=AV.videoFor(p.peer);if(cam)drawVideoCover(ctx,cam.v,b.x+12,b.y+12,94,80,cam.mirror);else ctx.drawImage(KartRender.kartSprite(id).img,b.x+12,b.y+7,108,104);
      text(Net.nameOf(p.peer),b.x+125,b.y+38,17,PAPER,{align:'left',body:true,weight:700});text(CHARS[id].name,b.x+125,b.y+71,19,GOLD,{align:'left',weight:700});
      text(i===0?'ANFITRIÓN':p.ready?'✓ LISTO':'ELIGIENDO…',b.x+22,b.y+142,20,p.ready?TEAL:'#c6d5e0',{align:'left',body:true,weight:700});
    }else{text('JUGADOR '+(i+1),b.x+143,b.y+60,25,'#7d9aaf',{weight:700});text('Esperando a un amigo…',b.x+143,b.y+116,17,'#7d9aaf',{body:true});}
  }
  for(let i=0;i<CHAR_ORDER.length;i++){const b={x:42+i%5*152,y:329+Math.floor(i/5)*81,w:142,h:71},id=CHAR_ORDER[i];slab(b.x,b.y,b.w,b.h,{edge:i===cur?GOLD:'#365269',lw:i===cur?3:1});drawPortrait(ctx,id,b.x+27,b.y+31,17);text(CHARS[id].name,b.x+57,b.y+37,15,i===cur?GOLD:PAPER,{align:'left',body:true,weight:700});}
  for(let i=0;i<3;i++)M.button(KART_TRACKS[i].name,{x:842,y:335+i*57,w:394,h:48},i===M.track);
  M.button(KART_CLASSES[M.cc].name+' · X / Espacio',{x:842,y:511,w:394,h:43});
  M.button(host?'INICIAR CARRERA →':!mine?'SALA LLENA · ESPECTADOR':Net.guest.rdy?'✓ LISTO · A: CAMBIAR':'ESTOY LISTO · A / ENTER',{x:842,y:576,w:394,h:55},true);
  text('← → piloto · A / Enter: '+(host?'iniciar':'listo')+' · U / LB: invitar',43,600,16,'#c3d7df',{align:'left',body:true});
  text(host?'LT / RT / L: pista · X / Espacio: cilindrada':'El anfitrión elige el circuito y la cilindrada.',43,627,15,'#8caabd',{align:'left',body:true});
  M.button('← SALIR',{x:42,y:652,w:196,h:42});M.button('INVITAR · U / LB',{x:253,y:652,w:256,h:42});
  text('Cada quien conduce su piloto. Todos ven las cámaras de la carrera.',1235,682,14,TEAL,{align:'right',body:true});
};
const kartOnlineFocus=APP.focusNative;APP.focusNative=function(d){
  if(this.screen==='kartLobby'){
    const host=Net.role==='host',cur=host?KartMenu.char:Net.guest.ch,items=CHAR_ORDER.map((_,i)=>({x:42+i%5*152,y:329+Math.floor(i/5)*81,w:142,h:71}));
    return {items,cur:items[cur],own:k=>k==='left'?cur%5>0:k==='right'?cur%5<4:k==='up'?cur>=5:cur<10,sel:i=>{if(host)KartMenu.char=i;else{Net.guest.ch=i;Net.guest.rdy=0;Net.set({ch:i,rdy:0});}}};
  }
  if(this.screen==='kartRace'&&this.kartRace?.online&&this.kartRace.paused){const items=Array.from({length:3},(_,i)=>({x:440,y:318+i*72,w:400,h:58})),cur=this.kartRace.pauseSel;return {items,cur:items[cur],own:k=>k==='up'?cur>0:k==='down'?cur<2:false,sel:i=>this.kartRace.pauseSel=i};}
  return kartOnlineFocus.call(this,d);
};
