'use strict';
// Racing simulation. Online sessions reuse Net's room and transport.
const KART_CLASSES = [
  {name:'100 cc',label:'Ágil',speed:.86,ai:.88,turn:.86},
  {name:'150 cc',label:'Competitivo',speed:1,ai:.95,turn:1},
  {name:'200 cc',label:'Experto',speed:1.16,ai:1.01,turn:1.12},
];
const KART_ITEMS = {
  chile:{name:'Chile cohete',icon:'CH',color:'#ff725e',desc:'Busca al rival que va delante.'},
  tortilla:{name:'Disco de tortilla',icon:'DT',color:'#ffe09c',desc:'Rebota en los bordes; apunta bien.'},
  salsa:{name:'Salsa brava',icon:'SB',color:'#fa6469',desc:'Deja una trampa detrás de tu kart.'},
  turbo:{name:'Pan turbo',icon:'PT',color:'#ffc53d',desc:'Acelerón para adelantar o recortar terreno.'},
  shield:{name:'Burbuja de Axo',icon:'BA',color:'#77edec',desc:'Te protege de un impacto durante 7 segundos.'},
  pinata:{name:'Piñata explosiva',icon:'PE',color:'#e0a1ff',desc:'Explota delante; B / Q la lanza atrás.'},
  boomerang:{name:'Búmeran',icon:'BU',color:'#f3b46b',desc:'Golpea a la ida y al regresar.'},
  triple:{name:'Triple chile',icon:'3C',color:'#ff886c',desc:'Tres cohetes buscan a los rivales de delante.'},
  lightning:{name:'Tormenta',icon:'TO',color:'#fff0a0',desc:'Rayo que ralentiza rivales cercanos. La burbuja protege.'},
  magnet:{name:'Imán',icon:'IM',color:'#f391b9',desc:'Atrae monedas y cajas durante 9 segundos.'},
  star:{name:'Estrella',icon:'ES',color:'#ffdd79',desc:'Invulnerabilidad y velocidad durante 6 segundos.'},
  spring:{name:'Resorte',icon:'RE',color:'#a9eea1',desc:'Salta obstáculos. Pulsa derrape en el aire para una acrobacia.'},
};
const kartStats=(id,vehicle=0)=>{
  const c=CHARS[id],heavy=clamp((c.weight-74)/60,0,1),V=kartVehicle(vehicle);
  return {speed:(108+heavy*7)*V.speed,accel:(39-heavy*9)*V.accel,grip:(1.09-heavy*.18)*V.grip,weight:(.75+heavy*.6)*V.weight,
    bars:[clamp(Math.round(3+heavy*2+(V.speed-1)*45),1,5),clamp(Math.round(5-heavy*2+(V.accel-1)*12),1,5),clamp(Math.round(5-heavy*2+(V.grip-1)*18),1,5)]};
};
const KartHandling={
  driftTurn:1.08,
  axis(v){const a=Math.abs(v||0);if(a<=.18)return 0;const n=clamp((a-.18)/.82,0,1);return sign(v)*(.42*n+.58*n*n*n);},
};
const KartControls = {
  prev:{},tapped:new Set(),
  read(dev=null) {
    const k=keysDown,has=(...a)=>a.some(q=>k.has(q)||this.tapped.has(q));
    let steer=(has('KeyD','ArrowRight')?1:0)-(has('KeyA','ArrowLeft')?1:0);
    let gas=has('KeyW','ArrowUp'),brake=has('KeyS','ArrowDown'),drift=has('Space','ShiftLeft','ShiftRight');
    const keyboard=!dev||dev.startsWith('kb');
    if(!keyboard){steer=0;gas=brake=drift=false;}
    let item=false,rear=false,pause=false;
    const p=ModeControls.pad('kart',dev);
    for(const action of ['gas','brake','drift','item','rear','pause']){
      const value=ModeControls.down('kart',action,p,keyboard,this.tapped);
      if(action==='gas')gas=value;else if(action==='brake')brake=value;else if(action==='drift')drift=value;else if(action==='item')item=value;else if(action==='rear')rear=value;else pause=value;
    }
    if(p) {
      const b=p.buttons,a=p.axes;
      const analog=KartHandling.axis(a[0]);if(Math.abs(analog)>Math.abs(steer))steer=analog;
      if(b[14]) steer=-1;if(b[15]) steer=1;
    }
    const t=Devices.ctrls.touch;
    if((!dev||dev==='kb1')&&TouchPad.active&&t){const c=t.cur;if(Math.abs(c.x)>.08)steer=c.x;gas=gas||c.attack;brake=brake||c.special;drift=drift||c.jump;item=item||c.shield;rear=rear||c.grab;pause=pause||c.start;}
    // Course lateral +x is screen-left from the chase camera. Convert human
    // screen-right input here once; AI, physics and network packets use course space.
    const now={steer:-steer,gas:!!gas,brake:!!brake,drift:!!drift,item:!!item,rear:!!rear,pause:!!pause,music:keyboard&&has('KeyM')};
    this.devices??=new Map();const prev=dev?this.devices.get(dev)||{}:this.prev;
    const out={...now,itemPressed:(now.item&&!prev.item)||(now.rear&&!prev.rear),driftPressed:now.drift&&!prev.drift,pausePressed:now.pause&&!prev.pause,musicPressed:now.music&&!prev.music};
    if(dev)this.devices.set(dev,now);else this.prev=now;this.tapped.clear();return out;
  },
};

class KartRace {
  constructor(info,character,cc=1,assist=false,seed=Date.now(),roster=null,vehicles=null) {
    this.course=new KartCourse(info);this.cc=KART_CLASSES[cc];this.ccIndex=cc;this.assist=assist;
    this.rng=new SimRNG(seed);this.time=0;this.tick=0;this.countdown=3.5;this.phase='grid';this.paused=false;this.pauseSel=0;
    this.projectiles=[];this.effects=[];this.messages=[];this.laps=3;this.finishOrder=[];this.resultTime=0;this.camera=null;this.audio=null;
    const ids=roster||[character,...CHAR_ORDER.filter(id=>id!==character).sort(()=>this.rng.next()-.5).slice(0,7)];
    this.racers=ids.map((id,i)=>({id,index:i,human:i===0,s:-18-Math.floor((7-i)/2)*9,x:i%2?-.4:.4,px:i%2?-.4:.4,ps:-18-Math.floor((7-i)/2)*9,
      v:0,steer:0,lat:0,drift:0,driftDir:0,charge:0,turbo:0,shield:0,stun:0,invuln:0,air:0,rescue:0,
      item:null,roulette:0,vehicle:kartVehicleIndex(vehicles?.[i]||0),stats:kartStats(id,vehicles?.[i]||0),nextCheckpoint:0,completedLaps:0,lastLapAt:0,lapTimes:[],finish:null,
      aiLane:(this.rng.next()-.5)*.85,skill:.94+this.rng.next()*.07,aiUse:1+this.rng.next()*3,hitCd:0,boostCd:0,launch:0}));
    this.racers.forEach(r=>Object.assign(r,{yaw:0,velocityYaw:0,turnRate:0,height:0,vy:0,airTime:0,trick:false,coins:0,slip:0,slipCd:0,star:0,magnet:0,slow:0,rampCd:0,bumpLat:0}));
    this.player=this.racers[0];this.order=this.racers.slice().sort((a,b)=>b.s-a.s||b.index-a.index);KartControls.prev={};KartControls.devices?.clear();
  }
  random(){return this.rng.next();}
  say(msg,color='#ffc53d') {
    // Pickups, hits, drift boosts and recovery already have visual/audio cues.
    // Only race milestones deserve a text notification.
    if(!/VUELTA|META|A CORRER/.test(msg))return;
    this.messages=[{msg,color,life:1.8}];
  }
  feedback(r,sfx,force=.3){if(r.human&&(!this.online||r===this.player)){KartSound.effect(sfx);Rumble.play(KartHaptics.device(this,r),force,.15+force*.4,110);}}
  startBoost(r,seconds,label) {r.turbo=Math.max(r.turbo,seconds);if(r.human&&label)this.say(label,'#69e9ee');}
  update(input,dt=1/60) {
    if(this.paused)return;
    const control=r=>input.players?input.players[r.index]||{}:input;
    this.tick++;for(const r of this.racers){r.ps=r.s;r.px=r.x;}
    for(const m of this.messages)m.life-=dt;this.messages=this.messages.filter(m=>m.life>0);
    for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
    if(this.phase==='grid'){
      const old=Math.ceil(this.countdown);this.countdown-=dt;
      // A small, learnable start boost; holding gas throughout overheats it.
      for(const r of this.racers.filter(r=>r.human)){if(control(r).gas)r.launch+=dt;else r.launch=Math.max(0,r.launch-dt*2);}
      if(Math.ceil(this.countdown)!==old&&this.countdown>0)KartSound.effect('menu');
      if(this.countdown<=0){this.phase='race';KartSound.effect('confirm');this.say('¡A CORRER!');
        for(const r of this.racers.filter(r=>r.human)){if(r.launch>.18&&r.launch<1.25)this.startBoost(r,1.6,'¡SALIDA TURBO!');
        else if(r.launch>=2.8){r.stun=.7;if(r===this.player)this.say('Motor caliente · acelera al final del 2');}}
      }return;
    }
    this.time+=dt;
    for(const r of this.racers){const ai=!r.human||r.disconnected||r.finish!==null;this.drive(r,ai?this.ai(r):control(r),dt);}
    const humans=this.racers.filter(r=>r.human);
    if(this.online&&this.phase==='race'&&humans.every(r=>r.finish!==null||r.disconnected)){this.phase='finish';this.resultTime=0;}
    this.updateProjectiles(dt);
    // Car contacts are symmetric and bounded, and have a cooldown to avoid repeated hits.
    for(let i=0;i<this.racers.length;i++)for(let j=i+1;j<this.racers.length;j++){
      const a=this.racers[i],b=this.racers[j],ds=KartMath.delta(a.s,b.s,this.course.length),dx=a.x-b.x;
      if(Math.abs(ds)<4.1&&Math.abs(dx)<.19&&!a.rescue&&!b.rescue&&!a.hitCd&&!b.hitCd){
        const dir=dx>=0?1:-1;a.bumpLat=clamp(a.bumpLat+dir*.8*b.stats.weight/a.stats.weight,-1.8,1.8);b.bumpLat=clamp(b.bumpLat-dir*.8*a.stats.weight/b.stats.weight,-1.8,1.8);
        if(ds<0)a.v*=.9;else b.v*=.9;a.hitCd=b.hitCd=.45;this.feedback(a,'land',.15);this.feedback(b,'land',.15);
      }
    }
    this.order=this.racers.slice().sort((a,b)=>a.finish!==null&&b.finish!==null?a.finish-b.finish:a.finish!==null?-1:b.finish!==null?1:b.s-a.s);
    if(this.phase==='finish'){this.resultTime+=dt;}
  }
  ai(r) {
    const p=this.course.sample(r.s),ahead=this.course.sample(r.s+55+r.v*.25),curve=Math.max(Math.abs(p.curve),Math.abs(ahead.curve));
    let lane=r.aiLane;
    for(const h of this.course.hazards){const d=KartMath.delta(h.s,r.s,this.course.length);if(d>0&&d<70){const hx=this.course.hazardX(h,this.time);if(Math.abs(lane-hx)<.35)lane=hx>0?-.57:.57;}}
    for(const q of this.projectiles){const d=KartMath.delta(q.s,r.s,this.course.length);if(d>0&&d<38&&Math.abs(q.x-lane)<.3)lane=q.x>0?-.65:.65;}
    if(!r.item){const row=this.course.boxes.find(b=>b.ready<=this.time&&KartMath.delta(b.s,r.s,this.course.length)>0&&KartMath.delta(b.s,r.s,this.course.length)<75);if(row)lane=row.x;}
    const ratio=r.v/(r.stats.speed*this.cc.speed),maxTurn=(1.62-.42*Math.min(1.4,ratio))*r.stats.grip;
    const desiredVelocity=Math.atan2((lane-r.x)*p.width*1.8,Math.max(30,r.v));
    const desiredBody=desiredVelocity+(r.drift?r.driftDir*.2:0);
    const steer=clamp((p.curve*r.v+(desiredBody-r.yaw)*5)/(maxTurn*(r.drift?KartHandling.driftTurn:1)),-1,1);
    const target=Math.min(r.stats.speed*this.cc.speed*this.cc.ai*r.skill*clamp(1.1-curve*46,.48,1),curve>.001?1.15/curve:999);
    const use=r.item&&this.time>r.aiUse;r.aiUse=use?this.time+2+this.random()*3:r.aiUse;
    return {steer,gas:r.v<target,brake:r.v>target+8,drift:curve>.0028&&curve<.007&&r.v>55&&Math.abs(r.x)<.72,itemPressed:!!use,rear:false};
  }
  drive(r,input,dt) {
    const C=this.course,p=C.sample(r.s),max=r.stats.speed*this.cc.speed,ratio=r.v/max,V=kartVehicle(r.vehicle);
    for(const k of ['turbo','shield','stun','invuln','air','hitCd','boostCd'])r[k]=Math.max(0,r[k]-dt);
    if(r.rescue>0){r.rescue-=dt;r.v=0;r.x=lerp(r.x,0,dt*7);r.lat=0;r.bumpLat=0;r.yaw=0;r.velocityYaw=0;r.turnRate=0;r.drift=0;r.charge=0;r.height=0;r.vy=0;return;}
    if(r.roulette>0){r.roulette-=dt;if(r.roulette<=0&&!this.predicting){r.item=this.rollItem(r);this.feedback(r,'confirm',.15);}}
    r.steer=approach(r.steer,input.steer||0,dt*(input.steer?5.5:7.5));
    for(const k of ['star','magnet','slow','slipCd','rampCd'])r[k]=Math.max(0,r[k]-dt);
    const wasFlying=r.height>0||r.vy>0;
    if(wasFlying){r.airTime+=dt;r.height=Math.max(0,r.height+r.vy*dt);r.vy-=24*dt;
      if(input.driftPressed&&r.height>.65&&!r.trick){r.trick=true;r.trickAt=r.airTime;this.feedback(r,'jump',.15);}
      if(r.height===0&&r.vy<0){r.vy=0;if(r.trick)this.startBoost(r,1.5,r.human?'¡ACROBACIA!':null);r.trick=false;r.airTime=0;}
    }
    const drifting=!!input.drift&&r.v>max*.36&&Math.abs(r.x)<1.14&&!r.stun&&(!wasFlying||r.drift);
    if(drifting&&!r.drift&&Math.abs(r.steer)>.18){r.drift=1;r.driftDir=sign(r.steer);r.air=.25;r.vy=3.4;r.height=.03;}
    if(r.drift){
      if(!drifting){if(r.charge>.7)this.startBoost(r,(r.charge>2?2.2:r.charge>1.3?1.45:.8)*V.boost,r.human?'¡MINI TURBO!':null);r.drift=0;r.charge=0;}
      else {
        // Countersteering adjusts the racing line without instantly cancelling a drift.
        const into=r.steer*r.driftDir;
        r.charge=Math.min(2.7,r.charge+dt*(.6+Math.max(0,into)*.3)*V.charge);
      }
    }
    if(r.stun){r.v=approach(r.v,max*.25,dt*max*1.8);r.drift=0;r.charge=0;}
    else if(input.brake){r.v=approach(r.v,0,dt*max*1.12*V.brake);}
    else if(input.gas||r.turbo||r.star){
      const scrub=clamp((r.drift?.07:0)+Math.abs(r.yaw-r.velocityYaw)*.33+Math.abs(r.turnRate)*.025,0,.22);
      r.v=approach(r.v,max*(1-scrub)*(r.turbo?1.32:r.star?1.2:1)*(1+r.coins*.005)*(r.slow?.58:1),dt*r.stats.accel*(r.turbo||r.star?2.3:1));
    }
    else r.v=approach(r.v,0,dt*18);
    // Integrate heading and tyre velocity separately. With no steering the kart
    // keeps its world heading instead of automatically following the track.
    const grip=p.zone==='wet'?.73:1;
    const maxTurn=(1.62-.42*Math.min(1.4,ratio))*r.stats.grip;
    const steer=r.steer+(this.assist&&r.human?clamp(p.curve*r.v/maxTurn-r.x*.25,-.55,.55):0);
    r.turnRate=lerp(r.turnRate,clamp(steer,-1,1)*maxTurn*(r.drift?KartHandling.driftTurn:1)*Math.min(1,ratio*3),1-Math.exp(-dt*12*V.response));
    const rotation=p.curve*r.v*Math.cos(r.velocityYaw)*dt;
    r.yaw=clamp(r.yaw+r.turnRate*dt-rotation,-1.23,1.23);r.velocityYaw-=rotation;
    const tyreTarget=r.yaw-(r.drift?r.driftDir*.14:0);
    r.velocityYaw=lerp(r.velocityYaw,tyreTarget,1-Math.exp(-dt*(r.drift?7.5:14)*grip*(r.height>.3?.35:1)));
    if(r.height<.3){const slip=Math.abs(r.yaw-r.velocityYaw);r.v=Math.max(0,r.v-r.v*(.012+slip*.38+(r.drift?.065:0))*dt);}
    r.lat=Math.sin(r.velocityYaw)*r.v/p.width+r.bumpLat;r.bumpLat=approach(r.bumpLat,0,dt*2.8);
    if(r.stun){r.lat*=.7;r.yaw*=.99;}
    r.x+=r.lat*dt;
    if(Math.abs(r.x)>1&&!r.star&&r.height<.3){r.v=approach(r.v,max*V.offroad,dt*max*.95);r.charge=0;}
    if((p.zone==='gravel'||p.zone==='cobbles')&&!r.turbo)r.v=approach(r.v,max*.88,dt*15);
    if(Math.abs(r.x)>1.48){if(p.zone==='bridge'){this.rescue(r);return;}r.x=clamp(r.x,-1.48,1.48);r.lat*=-.25;r.v*=.94;}
    if(this.assist&&r.human)r.x=clamp(r.x,-1.3,1.3);
    const oldS=r.s;r.s+=r.v*Math.cos(r.velocityYaw)*dt;
    if(this.predicting)return; // clients predict driving only; the host owns pickups, hits and laps
    const gate=C.length/16;
    while(oldS<=r.nextCheckpoint*gate&&r.s>=r.nextCheckpoint*gate&&r.nextCheckpoint<=this.laps*16){
      if(r.nextCheckpoint>0&&r.nextCheckpoint%16===0){
        r.completedLaps++;r.lapTimes.push(this.time-r.lastLapAt);r.lastLapAt=this.time;
        if(r.human&&r.completedLaps<this.laps){this.say(r.completedLaps===2?'¡ÚLTIMA VUELTA!':'VUELTA 2 / 3');this.feedback(r,'go',.3);}
        if(r.completedLaps===this.laps&&r.finish===null){r.finish=this.time;this.finishOrder.push(r);
          if(r.human){if(!this.online)this.phase='finish';this.say('¡META!');if(r===this.player){if(!this.online){Audio8.stopSong();KartMusic.play('results');}this.saveBest();Rumble.play('local',.6,.8,300);}}
        }
      }r.nextCheckpoint++;
    }
    if(input.itemPressed&&r.item&&!r.stun)this.useItem(r,!!input.rear);
    // Swept longitudinal tests: fast karts cannot skip boxes, traps or turbo panels.
    const crossed=(s,range)=>{const d=KartMath.delta(s,oldS,C.length);return d>=-range&&d<=r.s-oldS+range;};
    if(!r.item&&r.roulette<=0)for(const b of C.boxes)if(b.ready<=this.time&&crossed(b.s,2)&&Math.abs(b.x-r.x)<(r.magnet?.75:.19)){b.ready=this.time+3.8;r.roulette=.65;this.feedback(r,'menu',.12);break;}
    if(!r.boostCd)for(const b of C.boosts)if(crossed(b.s,7)&&Math.abs(b.x-r.x)<.34){this.startBoost(r,1.2,r.human?'¡PLACA TURBO!':null);r.boostCd=1;this.feedback(r,'jump',.2);break;}
    if(!r.stun&&!r.invuln&&r.height<1.1)for(const h of C.hazards)if(crossed(h.s,3)&&Math.abs(C.hazardX(h,this.time)-r.x)<.22){this.hit(r,null,.8);break;}
    for(const c of C.coins)if(c.ready<=this.time&&crossed(c.s,2.2)&&Math.abs(c.x-r.x)<(r.magnet?.9:.18)){
      c.ready=this.time+4;r.coins=Math.min(10,r.coins+1);if(r.human&&this.tick%2)this.feedback(r,'menu',.06);
    }
    if(!r.rampCd&&r.height<.15)for(const q of C.ramps)if(crossed(q.s,3)&&Math.abs(q.x-r.x)<.28&&r.v>40){r.vy=11;r.height=.03;r.airTime=0;r.rampCd=1.5;r.drift=0;r.charge=0;if(r.human)this.say('¡EN EL AIRE! · pulsa derrape','#a5eacf');break;}
    if(!r.slipCd&&r.height<.3&&r.v>55){
      const behind=this.racers.some(q=>q!==r&&Math.abs(q.x-r.x)<.2&&KartMath.delta(q.s,r.s,C.length)>5&&KartMath.delta(q.s,r.s,C.length)<43);
      r.slip=behind?Math.min(2.2,r.slip+dt):Math.max(0,r.slip-dt*2);
      if(r.slip>=2){this.startBoost(r,1.35,r.human?'¡REBUFO!':null);r.slip=0;r.slipCd=3;}
    }else r.slip=Math.max(0,r.slip-dt);
    if(r.turbo&&this.tick%5===0)this.effects.push({s:r.s-4,x:r.x,life:.35,max:.35,type:'flame',color:'#71ecff'});
  }
  rescue(r){r.rescue=1.25;r.invuln=3;r.v=0;r.x=clamp(r.x,-1.35,1.35);r.turbo=0;r.drift=0;r.charge=0;r.lat=0;if(r.human){this.say('De vuelta a la pista');this.feedback(r,'back',.3);}}
  rollItem(r) {
    const place=this.racers.filter(q=>q.s>r.s).length;
    const pool=place<2?['tortilla','salsa','shield','pinata','boomerang','magnet','spring']:place<5?['chile','tortilla','turbo','shield','pinata','boomerang','magnet','spring','triple']:['chile','turbo','triple','star','lightning','spring','magnet','turbo'];
    return pool[Math.floor(this.random()*pool.length)];
  }
  useItem(r,rear=false) {
    const item=r.item;if(!item)return false;r.item=null;
    this.feedback(r,'swing',.25);
    if(item==='turbo'){this.startBoost(r,2.6,r.human?'¡PAN TURBO!':null);return true;}
    if(item==='shield'){r.shield=7;if(r.human)this.say('BURBUJA · 7 segundos','#77edec');return true;}
    if(item==='star'){r.star=6;r.invuln=6;r.stun=0;r.slow=0;this.startBoost(r,1,'¡ESTRELLA!');return true;}
    if(item==='magnet'){r.magnet=9;if(r.human)this.say('¡IMÁN ACTIVADO!','#f391b9');return true;}
    if(item==='spring'){r.vy=14;r.height=.05;r.airTime=0;r.drift=0;r.charge=0;if(r.human)this.say('¡RESORTE! · acrobacia con derrape','#a9eea1');return true;}
    if(item==='lightning'){
      for(const q of this.racers)if(q!==r&&Math.abs(KartMath.delta(q.s,r.s,this.course.length))<260&&!q.star){if(q.shield)this.hit(q,r.index,.3);else if(!q.invuln){q.slow=3.5;q.v*=.65;this.effects.push({type:'lightning',s:q.s,x:q.x,life:.5,max:.5,color:'#ffeba0'});if(q.human)this.say('¡TORMENTA!','#ffeba0');}}
      if(r.human)this.say('¡TORMENTA!','#fff0a0');return true;
    }
    const dir=rear||item==='salsa'?-1:1;
    const targets=this.racers.filter(q=>q!==r&&q.finish===null&&KartMath.delta(q.s,r.s,this.course.length)*dir>0).sort((a,b)=>Math.abs(KartMath.delta(a.s,r.s,this.course.length))-Math.abs(KartMath.delta(b.s,r.s,this.course.length)));
    const amount=item==='triple'?3:1;
    for(let i=0;i<amount;i++)this.projectiles.push({type:item==='triple'?'chile':item,owner:r.index,s:r.s+dir*(7+i*3),ps:r.s+dir*(7+i*3),x:clamp(r.x+(i-1)*(amount>1?.18:0),-.95,.95),life:item==='salsa'?14:7,
      v:item==='salsa'?0:dir*(item==='chile'||item==='triple'?185:item==='pinata'?95:170),vx:item==='tortilla'?r.steer*.5:0,age:0,target:targets[i%Math.max(1,targets.length)]?.index,dir});
    return true;
  }
  hit(r,owner,strength=1) {
    if(r.invuln||r.rescue||r.finish!==null)return false;
    if(r.shield>0){r.shield=0;r.invuln=.75;this.feedback(r,'parry',.3);if(r.human)this.say('¡LA BURBUJA TE PROTEGIÓ!','#77edec');return true;}
    r.stun=1.05*strength;r.invuln=2;r.v*=.48;r.turbo=0;r.charge=0;r.drift=0;r.coins=Math.max(0,r.coins-3);
    this.effects.push({s:r.s,x:r.x,life:.55,max:.55,type:'hit',color:'#ffce6c'});
    this.feedback(r,'hit',.65);if(r.human)this.say('¡IMPACTO!','#ff8b7e');
    if(owner!==null&&owner!==undefined&&this.racers[owner].human){this.say('¡LE DISTE!','#9bf3a6');Audio8.sfx('hit');}return true;
  }
  updateProjectiles(dt) {
    const C=this.course;
    for(const q of this.projectiles){q.ps=q.s;q.life-=dt;q.age+=dt;
      if(q.type==='chile'&&q.target!==undefined){const r=this.racers[q.target];if(r&&r.finish===null){q.x=approach(q.x,r.x,dt*1.25);if(KartMath.delta(r.s,q.s,C.length)*q.dir<0)q.target=undefined;}}
      q.s+=q.v*dt;q.x+=q.vx*dt;
      if(q.type==='boomerang'&&q.age>1.1){const owner=this.racers[q.owner],d=KartMath.delta(owner.s,q.s,C.length);q.v=clamp(d*4,-185,185);q.x=approach(q.x,owner.x,dt*1.1);if(Math.abs(d)<4&&Math.abs(q.x-owner.x)<.18)q.life=0;}
      if(Math.abs(q.x)>.94){q.x=clamp(q.x,-.94,.94);q.vx*=-1;}
      const explode=q.type==='pinata'&&q.age>1.45;
      for(const r of this.racers){if((r.index===q.owner&&(q.age<.6||q.type==='boomerang'))||r.height>1.25)continue;
        const d0=KartMath.delta(q.ps-r.ps,0,C.length),d1=KartMath.delta(q.s-r.s,0,C.length);
        const passed=d0*d1<=0&&Math.abs(d0-d1)<30;
        if((Math.abs(d1)<(explode?20:4)||passed)&&Math.abs(q.x-r.x)<(explode?.65:.2)){
          if(this.hit(r,q.owner,q.type==='salsa'?.8:1)&&q.type!=='boomerang')q.life=0;
        }
      }
      if(explode){q.life=0;this.effects.push({s:q.s,x:q.x,life:.6,max:.6,type:'hit',color:'#e0a1ff'});}
    }
    // A well-aimed disc can intercept an incoming rocket.
    for(let i=0;i<this.projectiles.length;i++)for(let j=i+1;j<this.projectiles.length;j++){
      const a=this.projectiles[i],b=this.projectiles[j];if(a.life<=0||b.life<=0||a.owner===b.owner||!['chile','tortilla'].includes(a.type)||!['chile','tortilla'].includes(b.type))continue;
      const d0=KartMath.delta(a.ps,b.ps,C.length),d1=KartMath.delta(a.s,b.s,C.length),cross=d0*d1<=0&&Math.abs(d1-d0)<45;
      if((Math.abs(d1)<3||cross)&&Math.abs(a.x-b.x)<.22){a.life=b.life=0;this.effects.push({type:'hit',s:a.s,x:a.x,life:.4,max:.4,color:'#ffe3a7'});}
    }
    this.projectiles=this.projectiles.filter(q=>q.life>0).slice(-48);
  }
  bestKey(){return 'esmash-kart-v2:'+this.course.info.id+':'+this.ccIndex+':'+(this.assist?'assist':'manual');}
  saveBest(){try{const best=JSON.parse(localStorage.getItem(this.bestKey())||'null'),p=this.player;
    if(!best||p.finish<best.time){localStorage.setItem(this.bestKey(),JSON.stringify({time:p.finish,char:p.id,vehicle:kartVehicle(p.vehicle).id,lap:Math.min(...p.lapTimes)}));this.newRecord=true;}
  }catch(e){/* private browsing */}}
  stop(){KartSound.stop();Rumble.stopAll();TouchPad.release();}
}

// One quiet engine oscillator, reused, released when leaving a race or pausing.
const KartSound={
  node:null,gain:null,
  tick(race){const a=Audio8;if(!a.ready||race.paused||race.phase==='grid'){this.stop();return;}
    if(!this.node){this.node=a.ctx.createOscillator();this.gain=a.ctx.createGain();this.node.type='sawtooth';this.gain.gain.value=0;this.node.connect(this.gain);this.gain.connect(a.sfxGain);this.node.start();}
    const r=race.player;this.node.frequency.setTargetAtTime(36+r.v*.85+(r.drift?7:0),a.ctx.currentTime,.06);
    this.gain.gain.setTargetAtTime(race.phase==='finish'?.008:.018+(r.v/140)*.014,a.ctx.currentTime,.08);
  },
  stop(){if(this.node){try{this.node.stop();this.node.disconnect();this.gain.disconnect();}catch(e){}this.node=null;this.gain=null;}},
};
window.addEventListener('blur',()=>{if(typeof APP!=='undefined'&&APP.screen==='kartRace'&&APP.kartRace){APP.kartRace.paused=true;KartSound.stop();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&typeof APP!=='undefined'&&APP.screen==='kartRace'&&APP.kartRace){APP.kartRace.paused=true;KartSound.stop();}});
window.addEventListener('keydown',e=>{if(!e.repeat&&typeof APP!=='undefined'&&APP.screen==='kartRace')KartControls.tapped.add(e.code);});
