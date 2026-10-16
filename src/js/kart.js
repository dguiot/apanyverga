'use strict';
// Racing is a separate local simulation; fighting/rollback state never enters here.
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
  pinata:{name:'Piñata explosiva',icon:'PE',color:'#e0a1ff',desc:'Explota delante; abajo + ítem la deja atrás.'},
};
const kartStats=id=>{
  const c=CHARS[id],heavy=clamp((c.weight-74)/60,0,1);
  return {speed:108+heavy*7,accel:39-heavy*9,grip:1.09-heavy*.18,weight:.75+heavy*.6,
    bars:[Math.round(3+heavy*2),Math.round(5-heavy*2),Math.round(5-heavy*2)]};
};
const KartControls = {
  prev:{},tapped:new Set(),
  read() {
    const k=keysDown,has=(...a)=>a.some(q=>k.has(q)||this.tapped.has(q));
    let steer=(has('KeyD','ArrowRight')?1:0)-(has('KeyA','ArrowLeft')?1:0);
    let gas=has('KeyW','ArrowUp'),brake=has('KeyS','ArrowDown'),drift=has('Space','ShiftLeft','ShiftRight');
    let item=has('KeyJ','KeyE'),rear=has('KeyQ'),pause=has('Escape','Enter'),rescue=has('KeyR');
    for(const p of padInfo) {
      const b=p.buttons,a=p.axes;
      if(Math.abs(a[0]||0)>.16) steer=Math.abs(a[0])>.98?sign(a[0]):(a[0]-sign(a[0])*.16)/.84;
      if(b[14]) steer=-1;if(b[15]) steer=1;
      gas=gas||b[7]||b[0]||b[12];brake=brake||b[6]||b[13];drift=drift||b[2]||b[5];
      item=item||b[4];rear=rear||b[1];pause=pause||b[9];rescue=rescue||b[3];
    }
    const t=Devices.ctrls.touch;
    if(TouchPad.active&&t){const c=t.cur;if(Math.abs(c.x)>.08)steer=c.x;gas=gas||c.attack;brake=brake||c.special;drift=drift||c.jump;item=item||c.shield;rear=rear||c.grab;pause=pause||c.start;}
    const now={steer,gas:!!gas,brake:!!brake,drift:!!drift,item:!!item,rear:!!rear,pause:!!pause,rescue:!!rescue};
    const out={...now,itemPressed:(now.item&&!this.prev.item)||(now.rear&&!this.prev.rear),pausePressed:now.pause&&!this.prev.pause,rescuePressed:now.rescue&&!this.prev.rescue};
    this.prev=now;this.tapped.clear();return out;
  },
};

class KartRace {
  constructor(info,character,cc=1,assist=false,seed=Date.now(),roster=null) {
    this.course=new KartCourse(info);this.cc=KART_CLASSES[cc];this.ccIndex=cc;this.assist=assist;
    this.rng=new SimRNG(seed);this.time=0;this.tick=0;this.countdown=3.5;this.phase='grid';this.paused=false;this.pauseSel=0;
    this.projectiles=[];this.effects=[];this.messages=[];this.laps=3;this.finishOrder=[];this.resultTime=0;this.camera=null;this.audio=null;
    const ids=roster||[character,...CHAR_ORDER.filter(id=>id!==character).sort(()=>this.rng.next()-.5).slice(0,7)];
    this.racers=ids.map((id,i)=>({id,index:i,human:i===0,s:-18-Math.floor((7-i)/2)*9,x:i%2?-.4:.4,px:i%2?-.4:.4,ps:-18-Math.floor((7-i)/2)*9,
      v:0,steer:0,lat:0,drift:0,driftDir:0,charge:0,turbo:0,shield:0,stun:0,invuln:0,air:0,rescue:0,
      item:null,roulette:0,stats:kartStats(id),nextCheckpoint:0,completedLaps:0,lastLapAt:0,lapTimes:[],finish:null,
      aiLane:(this.rng.next()-.5)*.85,skill:.94+this.rng.next()*.07,aiUse:1+this.rng.next()*3,hitCd:0,boostCd:0,launch:0}));
    this.player=this.racers[0];this.order=this.racers.slice().sort((a,b)=>b.s-a.s||b.index-a.index);KartControls.prev={};
  }
  random(){return this.rng.next();}
  say(msg,color='#ffc53d') {this.messages.push({msg,color,life:2.6});if(this.messages.length>3)this.messages.shift();}
  feedback(r,sfx,force=.3){if(r.human){Audio8.sfx(sfx);Rumble.play('local',force,.5,110);}}
  startBoost(r,seconds,label) {r.turbo=Math.max(r.turbo,seconds);if(r.human&&label)this.say(label,'#69e9ee');}
  update(input,dt=1/60) {
    if(this.paused)return;
    this.tick++;for(const r of this.racers){r.ps=r.s;r.px=r.x;}
    for(const m of this.messages)m.life-=dt;this.messages=this.messages.filter(m=>m.life>0);
    for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
    if(this.phase==='grid'){
      const old=Math.ceil(this.countdown);this.countdown-=dt;
      // A small, learnable start boost; holding gas throughout overheats it.
      if(input.gas)this.player.launch+=dt;else this.player.launch=Math.max(0,this.player.launch-dt*2);
      if(Math.ceil(this.countdown)!==old&&this.countdown>0)Audio8.sfx('menu');
      if(this.countdown<=0){this.phase='race';Audio8.sfx('go');this.say('¡A CORRER!');
        if(this.player.launch>.18&&this.player.launch<1.25)this.startBoost(this.player,1.6,'¡SALIDA TURBO!');
        else if(this.player.launch>=2.8){this.player.stun=.7;this.say('Motor caliente · acelera al final del 2');}
      }return;
    }
    this.time+=dt;
    for(const r of this.racers){const ai=!r.human||r.finish!==null;this.drive(r,ai?this.ai(r):input,dt);}
    this.updateProjectiles(dt);
    // Car contacts are symmetric and bounded, and have a cooldown to avoid repeated hits.
    for(let i=0;i<this.racers.length;i++)for(let j=i+1;j<this.racers.length;j++){
      const a=this.racers[i],b=this.racers[j],ds=KartMath.delta(a.s,b.s,this.course.length),dx=a.x-b.x;
      if(Math.abs(ds)<4.1&&Math.abs(dx)<.19&&!a.rescue&&!b.rescue&&!a.hitCd&&!b.hitCd){
        const dir=dx>=0?1:-1;a.lat+=dir*.75/b.stats.weight;b.lat-=dir*.75/a.stats.weight;
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
    const ratio=r.v/(r.stats.speed*this.cc.speed),centrifugal=p.curve*r.v*r.v*.022*this.cc.turn;
    const steer=clamp((lane-r.x)*2.6+centrifugal/(2.05*Math.max(.25,ratio)*r.stats.grip),-1,1);
    const target=r.stats.speed*this.cc.speed*this.cc.ai*r.skill*clamp(1.1-curve*60,.52,1);
    const use=r.item&&this.time>r.aiUse;r.aiUse=use?this.time+2+this.random()*3:r.aiUse;
    return {steer,gas:r.v<target,brake:r.v>target+8,drift:curve>.0028&&curve<.007&&r.v>55&&Math.abs(r.x)<.72,itemPressed:!!use,rear:false};
  }
  drive(r,input,dt) {
    const C=this.course,p=C.sample(r.s),max=r.stats.speed*this.cc.speed,ratio=r.v/max;
    for(const k of ['turbo','shield','stun','invuln','air','hitCd','boostCd'])r[k]=Math.max(0,r[k]-dt);
    if(r.rescue>0){r.rescue-=dt;r.v=0;r.x=lerp(r.x,0,dt*7);r.lat=0;r.drift=0;r.charge=0;return;}
    if(input.rescuePressed){this.rescue(r);return;}
    if(r.roulette>0){r.roulette-=dt;if(r.roulette<=0){r.item=this.rollItem(r);this.feedback(r,'confirm',.15);}}
    r.steer=approach(r.steer,input.steer||0,dt*(input.steer?11:15));
    const drifting=!!input.drift&&r.v>max*.38&&Math.abs(r.x)<1.08&&!r.stun;
    if(drifting&&!r.drift&&Math.abs(r.steer)>.15){r.drift=1;r.driftDir=sign(r.steer);r.air=.25;}
    if(r.drift){
      if(!drifting){if(r.charge>.7)this.startBoost(r,r.charge>2?2.2:r.charge>1.3?1.45:.8,r.human?'¡MINI TURBO!':null);r.drift=0;r.charge=0;}
      else if(Math.abs(r.steer)>.12)r.charge=Math.min(2.7,r.charge+dt*(.7+Math.abs(r.steer)*.5));
    }
    if(r.stun){r.v=approach(r.v,max*.25,dt*max*1.8);r.drift=0;r.charge=0;}
    else if(input.brake){r.v=approach(r.v,0,dt*max*1.12);}
    else if(input.gas||r.turbo){r.v=approach(r.v,max*(r.turbo?1.32:1),dt*r.stats.accel*(r.turbo?2.3:1));}
    else r.v=approach(r.v,0,dt*18);
    // Road-relative lateral velocity: immediate steering plus inertia and centrifugal force.
    const grip=p.zone==='wet'?.73:1;
    let lateral=r.steer*2.05*Math.max(.2,ratio)*r.stats.grip*(r.drift?1.28:1);
    lateral-=p.curve*r.v*r.v*.022*this.cc.turn;
    if(r.drift)lateral+=r.driftDir*.16;
    if(this.assist&&r.human){lateral-=r.x*Math.max(0,Math.abs(r.x)-.48)*3.5;}
    r.lat=approach(r.lat,lateral,dt*(p.zone==='wet'?4.5:9)*grip);
    if(r.stun)r.lat*=.96;
    r.x+=r.lat*dt;
    if(Math.abs(r.x)>1){r.v=approach(r.v,max*.42,dt*max*.95);r.charge=0;}
    if((p.zone==='gravel'||p.zone==='cobbles')&&!r.turbo)r.v=approach(r.v,max*.88,dt*15);
    if(Math.abs(r.x)>1.48){if(p.zone==='bridge'){this.rescue(r);return;}r.x=clamp(r.x,-1.48,1.48);r.lat*=-.25;r.v*=.94;}
    if(this.assist&&r.human)r.x=clamp(r.x,-1.3,1.3);
    const oldS=r.s;r.s+=r.v*dt;
    const gate=C.length/16;
    while(oldS<=r.nextCheckpoint*gate&&r.s>=r.nextCheckpoint*gate&&r.nextCheckpoint<=this.laps*16){
      if(r.nextCheckpoint>0&&r.nextCheckpoint%16===0){
        r.completedLaps++;r.lapTimes.push(this.time-r.lastLapAt);r.lastLapAt=this.time;
        if(r.human&&r.completedLaps<this.laps){this.say(r.completedLaps===2?'¡ÚLTIMA VUELTA!':'VUELTA 2 / 3');this.feedback(r,'go',.3);}
        if(r.completedLaps===this.laps&&r.finish===null){r.finish=this.time;this.finishOrder.push(r);
          if(r.human){this.phase='finish';this.say('¡META!');Audio8.playSong('results');this.saveBest();Rumble.play('local',.6,.8,300);}
        }
      }r.nextCheckpoint++;
    }
    if(input.itemPressed&&r.item&&!r.stun)this.useItem(r,!!input.rear||!!input.brake);
    // Swept longitudinal tests: fast karts cannot skip boxes, traps or turbo panels.
    const crossed=(s,range)=>{const d=KartMath.delta(s,oldS,C.length);return d>=-range&&d<=r.s-oldS+range;};
    if(!r.item&&r.roulette<=0)for(const b of C.boxes)if(b.ready<=this.time&&crossed(b.s,2)&&Math.abs(b.x-r.x)<.19){b.ready=this.time+3.8;r.roulette=.65;this.feedback(r,'menu',.12);break;}
    if(!r.boostCd)for(const b of C.boosts)if(crossed(b.s,7)&&Math.abs(b.x-r.x)<.34){this.startBoost(r,1.2,r.human?'¡PLACA TURBO!':null);r.boostCd=1;this.feedback(r,'jump',.2);break;}
    if(!r.stun&&!r.invuln)for(const h of C.hazards)if(crossed(h.s,3)&&Math.abs(C.hazardX(h,this.time)-r.x)<.22){this.hit(r,null,.8);break;}
    if(r.turbo&&this.tick%5===0)this.effects.push({s:r.s-4,x:r.x,life:.35,max:.35,type:'flame',color:'#71ecff'});
  }
  rescue(r){r.rescue=1.25;r.invuln=3;r.v=0;r.x=clamp(r.x,-1.35,1.35);r.turbo=0;r.drift=0;r.charge=0;r.lat=0;if(r.human){this.say('De vuelta a la pista');this.feedback(r,'back',.3);}}
  rollItem(r) {
    const place=this.racers.filter(q=>q.s>r.s).length;
    const pool=place<2?['tortilla','salsa','shield','pinata','tortilla']:place<5?['chile','tortilla','turbo','shield','pinata','salsa']:['chile','turbo','turbo','shield','pinata'];
    return pool[Math.floor(this.random()*pool.length)];
  }
  useItem(r,rear=false) {
    const item=r.item;if(!item)return false;r.item=null;
    this.feedback(r,'swing',.25);
    if(item==='turbo'){this.startBoost(r,2.6,r.human?'¡PAN TURBO!':null);return true;}
    if(item==='shield'){r.shield=7;if(r.human)this.say('BURBUJA · 7 segundos','#77edec');return true;}
    const dir=rear||item==='salsa'?-1:1;
    const targets=this.racers.filter(q=>q!==r&&q.finish===null&&KartMath.delta(q.s,r.s,this.course.length)*dir>0).sort((a,b)=>Math.abs(KartMath.delta(a.s,r.s,this.course.length))-Math.abs(KartMath.delta(b.s,r.s,this.course.length)));
    this.projectiles.push({type:item,owner:r.index,s:r.s+dir*7,ps:r.s+dir*7,x:r.x,life:item==='salsa'?14:7,
      v:item==='salsa'?0:dir*(item==='chile'?185:item==='pinata'?95:170),vx:item==='tortilla'?r.steer*.5:0,age:0,target:targets[0]&&targets[0].index,dir});
    return true;
  }
  hit(r,owner,strength=1) {
    if(r.invuln||r.rescue||r.finish!==null)return false;
    if(r.shield>0){r.shield=0;r.invuln=.75;this.feedback(r,'parry',.3);if(r.human)this.say('¡LA BURBUJA TE PROTEGIÓ!','#77edec');return true;}
    r.stun=1.05*strength;r.invuln=2;r.v*=.48;r.turbo=0;r.charge=0;r.drift=0;
    this.effects.push({s:r.s,x:r.x,life:.55,max:.55,type:'hit',color:'#ffce6c'});
    this.feedback(r,'hit',.65);if(r.human)this.say('¡IMPACTO!','#ff8b7e');
    if(owner!==null&&owner!==undefined&&this.racers[owner].human){this.say('¡LE DISTE!','#9bf3a6');Audio8.sfx('hit');}return true;
  }
  updateProjectiles(dt) {
    const C=this.course;
    for(const q of this.projectiles){q.ps=q.s;q.life-=dt;q.age+=dt;
      if(q.type==='chile'&&q.target!==undefined){const r=this.racers[q.target];if(r&&r.finish===null){q.x=approach(q.x,r.x,dt*1.25);if(KartMath.delta(r.s,q.s,C.length)*q.dir<0)q.target=undefined;}}
      q.s+=q.v*dt;q.x+=q.vx*dt;
      if(Math.abs(q.x)>.94){q.x=clamp(q.x,-.94,.94);q.vx*=-1;}
      const explode=q.type==='pinata'&&q.age>1.45;
      for(const r of this.racers){if(r.index===q.owner&&q.age<.6)continue;
        const d0=KartMath.delta(q.ps-r.ps,0,C.length),d1=KartMath.delta(q.s-r.s,0,C.length);
        const passed=d0*d1<=0&&Math.abs(d0-d1)<30;
        if((Math.abs(d1)<(explode?20:4)||passed)&&Math.abs(q.x-r.x)<(explode?.65:.2)){
          if(this.hit(r,q.owner,q.type==='salsa'?.8:1))q.life=0;
        }
      }
      if(explode){q.life=0;this.effects.push({s:q.s,x:q.x,life:.6,max:.6,type:'hit',color:'#e0a1ff'});}
    }
    this.projectiles=this.projectiles.filter(q=>q.life>0).slice(-48);
  }
  bestKey(){return 'esmash-kart-v1:'+this.course.info.id+':'+this.ccIndex+':'+(this.assist?'assist':'manual');}
  saveBest(){try{const best=JSON.parse(localStorage.getItem(this.bestKey())||'null'),p=this.player;
    if(!best||p.finish<best.time){localStorage.setItem(this.bestKey(),JSON.stringify({time:p.finish,char:p.id,lap:Math.min(...p.lapTimes)}));this.newRecord=true;}
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
