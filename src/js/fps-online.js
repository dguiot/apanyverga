'use strict';
const FPS_FIELDS=['x','y','z','vx','vz','vy','yaw','pitch','gun','health','shield','kills','deaths','dead','invuln','cool','reloading','sprint','ads','recoil','shot','bob','hit','hurt','grounded'];
const FPS_SURFACES=['earth','plaster','stone','steel','roof','container','crate','bridge','trunk','floor','stair','shield','body'];
const FPSOnline={
 browsing:false,ep:0,seq:0,lastTick:-1,lastAt:0,remote:new Map(),sendTick:0,counters:[0,0,0,0],
 publish(extra){Object.assign(Net.lob,extra);const json=JSON.stringify(Net.lob);if(json!==Net.lastLobJSON){Net.lastLobJSON=json;Net.set({lob:Net.lob});}},
 browse(){this.browsing=true;KartOnline.browsing=false;APP.go('online');},
 lobby(){APP.fps=null;FPSControls.reset();document.exitPointerLock?.();Net.guest.rdy=0;Net.set({st:null,inp:null,rdy:0});this.publish({game:'fps',ph:'fpsLobby',set:null,players:[]});APP.go('fpsLobby');this.sync();},
 sync(){const old=Net.lob.players||[],guests=Net.guestsOf(Net.myPeer()),ordered=old.slice(1).map(p=>guests.find(g=>g.peer===p.peer)).filter(Boolean);for(const g of guests)if(!ordered.includes(g))ordered.push(g);
  this.publish({players:[{peer:Net.myPeer(),id:CHAR_ORDER[FPSMenu.char],gun:FPSMenu.gun,ready:1},...ordered.slice(0,3).map(g=>({peer:g.peer,id:CHAR_ORDER[clamp(g.presence.ch|0,0,CHAR_ORDER.length-1)],gun:clamp(g.presence.fg|0,0,4),ready:g.presence.rdy?1:0}))]});},
 start(){this.sync();if(Net.lob.players.some(p=>!p.ready)){Toasts.push('Espera a que todos estén listos');return;}const setup={v:1,ep:(Net.lob.ep||0)+1,seed:Date.now()>>>0,players:Net.lob.players.map(p=>({...p,bot:false}))};if(ShellUI.active)setup.rules={target:ShellUI.config.target,minutes:ShellUI.config.minutes};while(setup.players.length<4)setup.players.push({id:CHAR_ORDER[(setup.players.length*3+1)%CHAR_ORDER.length],gun:setup.players.length%5,bot:true});this.open(setup);this.publish({ph:'fpsGame',set:setup,ep:setup.ep});this.push();},
 valid(s){return s&&s.v===1&&Number.isSafeInteger(s.ep)&&s.ep>=0&&Number.isSafeInteger(s.seed)&&Array.isArray(s.players)&&s.players.length===4&&s.players.every(p=>p&&CHAR_ORDER.includes(p.id)&&Number.isInteger(p.gun)&&p.gun>=0&&p.gun<5&&typeof p.bot==='boolean'&&(p.bot||typeof p.peer==='string'&&p.peer.length<100))&&s.players[0].peer===Net.hostPeer&&new Set(s.players.filter(p=>!p.bot).map(p=>p.peer)).size===s.players.filter(p=>!p.bot).length;},
 open(s){if(!this.valid(s))return false;const m=APP.fps=new FPSMatch(s.players,true,s.seed);if(s.rules){m.target=clamp(s.rules.target|0,5,30);m.duration=clamp(s.rules.minutes|0,3,15)*60;}m.player=m.players.find(p=>p.peer===Net.myPeer())||m.players[0];m.spectator=!m.players.some(p=>p.peer===Net.myPeer());m.setup=s;this.ep=s.ep;this.seq=0;this.lastTick=-1;this.lastAt=performance.now();this.remote.clear();this.counters=[0,0,0,0];this.sendTick=0;FPSControls.reset();APP.go('fpsGame');return true;},
 leave(){document.exitPointerLock?.();APP.fps=null;FPSView.dispose();FPSControls.reset();Net.leave();this.browsing=true;APP.go('online');},
 tick(){
  if(Net.role==='host'){if(APP.screen==='fpsLobby')this.sync();return;}
  const hp=Net.hostPres(),lob=hp?.lob;if(!lob){if(++Net.lostHostT>300)this.leave();return;}Net.lostHostT=0;Net.rememberRoom(hp.code);
  if(lob.ph==='fpsLobby'){if(APP.screen!=='fpsLobby'){APP.fps=null;Net.guest.rdy=0;Net.set({rdy:0,inp:null});APP.go('fpsLobby');}}
  else if(['fpsGame','fpsResults'].includes(lob.ph)&&this.valid(lob.set)){if(!APP.fps?.online||this.ep!==lob.set.ep)this.open(lob.set);if(hp.st?.k===2)this.apply(hp.st);if(lob.ph==='fpsResults'&&APP.screen!=='fpsResults')APP.go('fpsResults');}
 },
 send(I){if(APP.fps.spectator)return;for(const [i,k] of ['jump','reload','swap','sprintTap'].entries())if(I[k])this.counters[i]++;
  const p=APP.fps.player,scale=APP.fps.lookScale(p),dx=clamp(I.lx||0,-.3,.3)*scale,dy=clamp(I.ly||0,-.3,.3)*scale,yaw=Math.atan2(Math.sin(p.yaw+dx),Math.cos(p.yaw+dx)),pitch=clamp(p.pitch+dy,-1.4,1.4);
  const edge=I.jump||I.reload||I.swap||I.sprintTap||I.gun>=0;
  if(this.sendTick++%2===0||edge)Net.set({inp:{k:2,e:this.ep,q:++this.seq,a:[I.x||0,I.z||0,yaw,pitch,(I.fire?1:0)|(I.aim?2:0)|(I.sprint?4:0),I.gun??-1,...this.counters]}});
 },
 input(p){const presence=Net.presOf(p.peer),packet=presence?.inp,now=performance.now();let rec=this.remote.get(p.peer);if(!rec){rec={q:-1,c:[0,0,0,0],at:now,input:{}};this.remote.set(p.peer,rec);}
  const a=packet?.a;
  if(presence?.role==='guest'&&presence.join===Net.myPeer()&&packet?.k===2&&packet.e===this.ep&&Number.isSafeInteger(packet.q)&&packet.q>rec.q&&Array.isArray(a)&&a.length===10&&a.every(Number.isFinite)&&a.slice(0,2).every(n=>Math.abs(n)<=1)&&Math.abs(a[2])<=Math.PI&&Math.abs(a[3])<=1.4&&Number.isInteger(a[4])&&a[4]>=0&&a[4]<=7&&Number.isInteger(a[5])&&a[5]>=-1&&a[5]<5&&a.slice(6).every(n=>Number.isSafeInteger(n)&&n>=0)){
   rec.q=packet.q;rec.at=now;rec.input={x:a[0],z:a[1],lx:Math.atan2(Math.sin(a[2]-p.yaw),Math.cos(a[2]-p.yaw)),ly:a[3]-p.pitch,absoluteLook:true,fire:!!(a[4]&1),aim:!!(a[4]&2),sprint:!!(a[4]&4),gun:a[5]};['jump','reload','swap','sprintTap'].forEach((k,i)=>{rec.input[k]=a[i+6]>rec.c[i];rec.c[i]=a[i+6];});
  }
  p.disconnected=now-rec.at>3000;const out=now-rec.at>600?{}:{...rec.input};rec.input.lx=rec.input.ly=0;rec.input.gun=-1;for(const k of ['jump','reload','swap','sprintTap'])rec.input[k]=false;return out;
 },
 push(){const m=APP.fps,round=n=>Math.round(n*100)/100;Net.set({st:{k:2,e:this.ep,t:m.tick,time:+m.time.toFixed(3),phase:m.phase,p:m.players.map(p=>[...FPS_FIELDS.map(k=>typeof p[k]==='number'?Math.round(p[k]*1000)/1000:p[k]?1:0),...p.ammo,...p.reserve]),pick:m.pickups.map(p=>Math.max(0,Math.round(p.ready-m.time))),fx:m.effects.filter(e=>e.type==='trace').slice(-12).map(e=>[e.a.x,e.a.y,e.a.z,e.b.x,e.b.y,e.b.z,e.owner].map(round)),imp:m.effects.filter(e=>e.type==='impact').slice(-16).map(e=>[e.a.x,e.a.y,e.a.z,e.b.x,e.b.y,e.b.z,Math.max(0,FPS_SURFACES.indexOf(e.surface)),e.owner,e.gun,e.life,e.seq].map(round)),feed:m.feed.slice(-4).map(f=>[round(f.time),f.from,f.to,f.head?1:0])}});},
 apply(s){const m=APP.fps,n=FPS_FIELDS.length;if(!m||s?.k!==2||s.e!==this.ep||!Number.isSafeInteger(s.t)||s.t<=this.lastTick||!Number.isFinite(s.time)||s.time<0||s.time>1000||!['play','done'].includes(s.phase)||!Array.isArray(s.p)||s.p.length!==4||!s.p.every(a=>Array.isArray(a)&&a.length===n+10&&a.every(Number.isFinite)&&Math.abs(a[0])<=250&&Math.abs(a[2])<=250&&a[8]>=0&&a[8]<5&&Number.isInteger(a[8])&&a[9]>=0&&a[9]<=100&&a[10]>=0&&a[10]<=50)||!Array.isArray(s.pick)||s.pick.length!==m.pickups.length||!s.pick.every(v=>Number.isFinite(v)&&v>=0&&v<=20)||!Array.isArray(s.fx)||s.fx.length>12||!s.fx.every(a=>Array.isArray(a)&&a.length===7&&a.every(Number.isFinite)))return false;
  if(s.imp!==undefined&&(!Array.isArray(s.imp)||s.imp.length>16||!s.imp.every(a=>Array.isArray(a)&&a.length===11&&a.every(Number.isFinite)&&a.slice(0,3).every(n=>Math.abs(n)<1500)&&a.slice(3,6).every(n=>Math.abs(n)<=1.01)&&Number.isInteger(a[6])&&a[6]>=0&&a[6]<FPS_SURFACES.length&&Number.isInteger(a[7])&&a[7]>=0&&a[7]<4&&Number.isInteger(a[8])&&a[8]>=0&&a[8]<5&&a[9]>=0&&a[9]<=1&&Number.isSafeInteger(a[10])&&a[10]>0)))return false;
  this.lastTick=s.t;this.lastAt=performance.now();m.tick=s.t;m.time=s.time;m.phase=s.phase;
  m.players.forEach((p,i)=>{const a=s.p[i],old={x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch},oldShot=p.shot,oldHealth=p.health;FPS_FIELDS.forEach((k,j)=>p[k]=['sprint','grounded'].includes(k)?!!a[j]:a[j]);p.ammo=a.slice(n,n+5);p.reserve=a.slice(n+5,n+10);
   // Preserve responsive guest look; smooth small movement corrections over the
   // next few rendered frames. Teleports and respawns snap immediately.
   if(p===m.player&&!p.dead){const dist=Math.hypot(old.x-p.x,old.z-p.z);if(dist<2){p.x=lerp(old.x,p.x,.35);p.z=lerp(old.z,p.z,.35);}p.yaw=old.yaw;p.pitch=old.pitch;}
   p.prev=Math.hypot(old.x-p.x,old.z-p.z)>8?{x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch}:old;const distance=Math.hypot(p.x-m.player.x,p.z-m.player.z);if(p.shot>oldShot&&p!==m.player&&distance<95)FPSAudio.play('shot',p,.55*clamp(1-distance/110,.08,1));if(p.health<oldHealth&&p===m.player)Rumble.play('local',.3,.5,150);
  });
  m.pickups.forEach((p,i)=>p.ready=m.time+s.pick[i]);m.effects=s.fx.map(a=>({type:'trace',a:{x:a[0],y:a[1],z:a[2]},b:{x:a[3],y:a[4],z:a[5]},owner:a[6],life:.045})).concat((s.imp||[]).map(a=>({type:'impact',a:{x:a[0],y:a[1],z:a[2]},b:{x:a[3],y:a[4],z:a[5]},surface:FPS_SURFACES[a[6]],owner:a[7],gun:a[8],life:a[9],maxLife:.55,seq:a[10]})));
  if(Array.isArray(s.feed)&&s.feed.length<=4&&s.feed.every(a=>Array.isArray(a)&&a.length===4&&a.every(Number.isFinite)&&Number.isInteger(a[1])&&a[1]>=0&&a[1]<4&&Number.isInteger(a[2])&&a[2]>=0&&a[2]<4))m.feed=s.feed.map(a=>({time:a[0],from:a[1],to:a[2],head:!!a[3]}));return true;
 },
 update(raw){const m=APP.fps,I=m.paused||m.spectator?{}:raw;if(Net.role==='host'){
   const inputs=m.players.map(p=>p.bot?{}:p===m.player?I:this.input(p));m.update(inputs);if(this.sendTick++%3===0)this.push();if(m.phase==='done'){this.push();this.publish({ph:'fpsResults'});APP.go('fpsResults');}
  }else{
   this.send(I);const p=m.player;if(performance.now()-this.lastAt<650&&!m.spectator){p.prev={x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch};m.move(p,I,1/60);p.cool=Math.max(0,p.cool-1/60);if(I.fire&&!p.cool&&!p.reloading&&p.ammo[p.gun]){p.cool=FPS_GUNS[p.gun].rate;p.recoil=FPS_GUNS[p.gun].kick;p.shot++;FPSAudio.play('shot',p);}}
   for(const q of m.players)if(q!==p){q.prev={x:q.x,y:q.y,z:q.z,yaw:q.yaw,pitch:q.pitch};if(performance.now()-this.lastAt<200){q.x+=q.vx/60;q.z+=q.vz/60;}}for(const e of m.effects)e.life-=1/60;m.effects=m.effects.filter(e=>e.life>0);
  }
 },
};
const fpsNetHost=Net.host;Net.host=function(){fpsNetHost.call(this);if(FPSOnline.browsing)this.lob.game='fps';};
const fpsNetJoin=Net.join;Net.join=function(peer){fpsNetJoin.call(this,peer);if(this.presOf(peer)?.lob?.game==='fps'){this.guest.ch=FPSMenu.char;this.guest.fg=FPSMenu.gun;this.set({ch:this.guest.ch,fg:this.guest.fg});}};
const fpsNetTick=Net.tick;Net.tick=function(){const fps=this.role==='host'?this.lob.game==='fps':this.role==='guest'&&this.hostPres()?.lob?.game==='fps';if(fps){if(this.ok)FPSOnline.tick();return;}fpsNetTick.call(this);};
