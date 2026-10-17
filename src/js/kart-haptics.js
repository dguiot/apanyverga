'use strict';
const KartHaptics={
  last:new Map(),
  device(race,r){
    if(race.online&&r!==race.player)return null;
    const locals=race.localPlayers||[race.player];if(!locals.includes(r))return null;
    if(locals.length>1){const dev=race.localDevices?.[locals.indexOf(r)];return dev?.startsWith('pad')?dev:null;}
    const index=ModeControls.primary.get('kart');return index!==undefined&&padInfo.some(p=>p.index===index)?'pad'+index:TouchPad.active?'touch':null;
  },
  feel(race,r){
    if(race.paused||race.phase!=='race'||r.rescue||r.stun||r.finish!==null||r.height>.3||r.v<5)return {strong:0,weak:0};
    const speed=clamp(r.v/(r.stats.speed*race.cc.speed),0,1.3),p=race.course.sample(r.s),bend=clamp(Math.abs(p.curve)*r.v,0,1.3),load=clamp(Math.max(Math.abs(r.turnRate||0),bend)*speed,0,1),slip=clamp(Math.abs(r.yaw-r.velocityYaw)/.32,0,1),rough=p.zone==='gravel'?.07:p.zone==='cobbles'?.04:0;
    return {strong:clamp(.012*speed+.2*load*speed+.13*slip*speed,0,.38),weak:clamp(.035*speed*speed+.11*load+.09*slip*speed+(r.drift?.045:0)+rough*speed+(r.turbo?.035:0),0,.36)};
  },
  tick(race){
    if(!Rumble.on)return;const now=performance.now(),locals=race.online?[race.player]:race.localPlayers||[race.player];
    for(const r of locals){const dev=this.device(race,r);if(!r.human||!dev?.startsWith('pad')||!Rumble.canRumble(dev)||now-(this.last.get(dev)||-1000)<80)continue;
      const f=this.feel(race,r);if(f.strong+f.weak<.012)continue;
      // Rumble keeps a stronger impact alive; road texture cannot cancel it.
      if(Rumble.play(dev,f.strong,f.weak,100))this.last.set(dev,now);
    }
  },
};
