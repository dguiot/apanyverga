'use strict';
// Original compositions: warm extended chords, syncopated electric bass, clean
// plucked strings and disco percussion. The existing lobby theme stays intact.
const STAGE_SCORE={
 temple:{title:'Piedra y terciopelo',bpm:110,key:0,chords:[[57,60,64,67],[53,57,60,64],[55,59,62,65],[52,55,59,62]],bass:[0,3,6,10,12,15],melody:[76,72,69,67,72,76,79,74],guitar:[2,7,10,14],swing:.09,energy:.65},
 volcano:{title:'Disco de magma',bpm:128,key:-2,chords:[[57,60,64,67],[55,59,62,65],[53,57,60,64],[52,56,59,62]],bass:[0,2,5,7,8,11,14],melody:[76,79,81,76,74,72,71,68],guitar:[2,6,9,14],swing:.04,energy:.95},
 ship:{title:'Sal en el vinilo',bpm:105,key:2,chords:[[53,57,60,64],[55,59,62,65],[52,55,59,62],[57,60,64,67]],bass:[0,3,7,8,10,14],melody:[72,76,74,69,67,69,72,76],guitar:[3,6,11,14],swing:.12,energy:.58},
 space:{title:'Órbita de seda',bpm:116,key:5,chords:[[48,52,55,59],[50,53,57,60],[57,60,64,67],[55,59,62,65]],bass:[0,3,6,8,11,15],melody:[71,76,79,83,81,79,76,74],guitar:[2,6,10,15],swing:.04,energy:.75},
 city:{title:'Semáforo ámbar',bpm:121,key:-1,chords:[[55,59,62,66],[57,60,64,67],[53,57,60,64],[52,55,59,62]],bass:[0,2,6,8,11,14],melody:[74,78,79,76,72,69,72,71],guitar:[2,5,10,13],swing:.085,energy:.88},
 stadium:{title:'La última vuelta al sol',bpm:125,key:1,chords:[[48,52,55,59],[55,59,62,65],[57,60,64,67],[53,57,60,64]],bass:[0,3,4,7,10,12,15],melody:[76,79,81,79,74,76,72,71],guitar:[2,6,10,14],swing:.035,energy:1},
 xochi:{title:'Canal de miel',bpm:103,key:0,chords:[[53,57,60,64],[52,55,59,62],[50,53,57,60],[55,59,62,65]],bass:[0,3,7,10,12,14],melody:[76,72,69,65,67,69,72,74],guitar:[3,6,10,15],swing:.13,energy:.58},
 pyramid:{title:'Cobre al amanecer',bpm:113,key:-3,chords:[[50,53,57,60],[55,59,62,65],[48,52,55,59],[57,60,64,67]],bass:[0,3,6,8,10,14],melody:[77,74,72,69,72,76,74,71],guitar:[2,7,10,14],swing:.08,energy:.72},
 mercado:{title:'Domingo de groove',bpm:119,key:0,chords:[[48,52,55,59],[57,60,64,67],[50,53,57,60],[55,59,62,65]],bass:[0,3,6,8,11,14],melody:[76,79,76,72,74,76,71,69],guitar:[2,6,9,14],swing:.1,energy:.82},
 volcan:{title:'Fuego de medianoche',bpm:130,key:-2,chords:[[57,60,64,67],[53,57,60,64],[50,53,57,60],[52,56,59,62]],bass:[0,2,5,8,10,11,14],melody:[81,79,76,74,77,76,72,68],guitar:[2,5,10,14],swing:.025,energy:1},
 neon:{title:'Lluvia cromada',bpm:123,key:3,chords:[[50,53,57,60],[55,59,62,66],[48,52,55,59],[57,60,64,67]],bass:[0,3,6,7,10,12,15],melody:[77,76,74,72,76,79,81,76],guitar:[2,6,10,13],swing:.06,energy:.9},
 aurora:{title:'Horizonte eléctrico',bpm:112,key:-1,chords:[[52,55,59,62],[57,60,64,67],[53,57,60,64],[55,59,62,65]],bass:[0,3,6,8,11,14],melody:[71,76,79,76,72,69,67,74],guitar:[2,7,10,14],swing:.075,energy:.6},
};
for(const [id,d] of Object.entries(STAGE_SCORE))KartMusic.themes[id]={bpm:d.bpm,key:d.key,lead:.7};
const scorePlay=KartMusic.play;KartMusic.play=function(mood){const changed=this.mood!==mood;scorePlay.call(this,mood);if(changed&&STAGE_SCORE[mood])Audio8.nowPlaying={title:STAGE_SCORE[mood].title,t:performance.now()};};
const lobbySchedule=KartMusic.schedule;
KartMusic.electric=function(ctx,g,time,n,dur,gain,bright=1600){this.note(ctx,g.bus,time,n,dur,gain,'sine',bright,.006,g.delay);this.note(ctx,g.bus,time,n+12,dur*.45,gain*.25,'triangle',bright*1.7,.003);this.note(ctx,g.bus,time,n+19,dur*.19,gain*.1,'sine',bright*2,.002);};
KartMusic.schedule=function(ctx,g,index,time,mood){
 const d=STAGE_SCORE[mood];if(!d)return lobbySchedule.call(this,ctx,g,index,time,mood);
 const sp=60/d.bpm/4,step=index%16,bar=Math.floor(index/16),phrase=bar%32,section=Math.floor(bar/2)%4,chord=d.chords[section].map(n=>n+d.key),t=time+(step%2?sp*d.swing:0),breakdown=phrase>=24&&phrase<28,energy=d.energy*(breakdown?.5:1);
 if(step%4===0&&(!breakdown||step===0||step===8))this.drum(ctx,g.bus,t,'kick',.75+.15*energy);
 if((step===4||step===12)&&!breakdown)this.drum(ctx,g.bus,t+.006,'clap',.7*energy);
 if(step%4===2)this.drum(ctx,g.bus,t,'hat',.47*energy);else if(step%2===1&&!breakdown)this.drum(ctx,g.bus,t,'hat',.18*energy);
 if(phrase===31&&step>=12)this.drum(ctx,g.bus,t,'clap',.18+(step-12)*.06);
 if(d.bass.includes(step)){
  const n=chord[0]-12+(step===7||step===15?12:step===11?7:0),accent=step===0||step===8;
  this.note(ctx,g.bus,t+.008,n,sp*(accent?2.5:1.35),.25,'triangle',accent?760:540,.006);this.note(ctx,g.bus,t+.008,n-12,sp*1.5,.095,'sine',230,.008);
 }
 if(step===0)chord.forEach(n=>this.note(ctx,g.bus,t,n+12,sp*14,.032,'triangle',1000,.12,g.delay));
 if(d.guitar.includes(step)&&!breakdown)chord.forEach((n,i)=>{this.note(ctx,g.bus,t+i*.005,n+12,sp*.9,.035,'triangle',2100,.002);this.note(ctx,g.bus,t+i*.005,n+24,sp*.45,.008,'sine',3000,.002);});
 if((step===0||step===7||step===10)&&phrase>=4)chord.forEach((n,i)=>this.electric(ctx,g,t+i*.008,n+12,sp*(step===0?4:2.5),.026));
 if(phrase>=8&&!breakdown&&step%2===0){const flip=phrase>=16&&phrase<24,at=(step/2+(flip?3:0))%8,n=d.melody[at]+d.key+(bar%4===3?-12:0);this.electric(ctx,g,t+.012,n,sp*2.25,.057*energy,2500);}
 if(phrase>=28&&step===14)this.electric(ctx,g,t,chord[3]+24,sp*1.6,.045);
};
const stageMusicGo=APP.go;APP.go=function(s){stageMusicGo.call(this,s);if(['battle','demo','netview','vs'].includes(s)){
 const id=this.battle?.stage?.id||this.battle?.setup?.stage||this.pendingSetup?.stage||this.lastSetup?.stage||Net.view?.stage?.id;KartMusic.play(STAGE_SCORE[id]?id:'temple');
 }else if(s==='fpsGame')KartMusic.play('aurora');};
// Legacy battle shuffle must not restart chip tunes over the stage score.
const stagePlayBattle=Audio8.playBattle;Audio8.playBattle=function(...args){if(['battle','demo','netview','vs'].includes(APP.screen)){const id=APP.battle?.stage?.id||APP.lastSetup?.stage||'temple';KartMusic.play(STAGE_SCORE[id]?id:'temple');return;}return stagePlayBattle.apply(this,args);};
