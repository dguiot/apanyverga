'use strict';
// Original four-to-the-floor score: soft pads, rounded bass, restrained plucks
// and filtered percussion. It uses the existing volume/mute settings.
const KartMusic={
  mood:null,bus:null,delay:null,step:0,next:0,context:null,noiseCache:new WeakMap(),
  themes:{menu:{bpm:108,key:-3,lead:.55},mercado:{bpm:118,key:0,lead:.75},volcan:{bpm:126,key:-2,lead:.65},neon:{bpm:114,key:2,lead:.8},results:{bpm:112,key:0,lead:.7}},
  play(mood){if(this.mood===mood)return;this.mood=mood;this.step=0;this.next=0;Audio8.stopSong();},
  stop(){this.mood=null;if(this.bus&&this.context)this.bus.gain.setTargetAtTime(0,this.context.currentTime,.12);},
  noise(ctx){if(!this.noiseCache.has(ctx)){const b=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),a=b.getChannelData(0);const rng=srand(792);for(let i=0;i<a.length;i++)a[i]=rng()*2-1;this.noiseCache.set(ctx,b);}return this.noiseCache.get(ctx);},
  graph(ctx,destination){
    const bus=ctx.createGain();bus.gain.value=.21;bus.connect(destination);
    const delay=ctx.createDelay(1),feedback=ctx.createGain(),wet=ctx.createGain();delay.delayTime.value=.355;feedback.gain.value=.24;wet.gain.value=.16;delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(bus);
    return {bus,delay};
  },
  note(ctx,bus,time,midi,duration,gain,wave='sine',cutoff=2200,attack=.012,delay=null){
    const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type=wave;o.frequency.value=440*Math.pow(2,(midi-69)/12);
    f.type='lowpass';f.frequency.setValueAtTime(cutoff,time);f.frequency.exponentialRampToValueAtTime(Math.max(160,cutoff*.35),time+duration);
    g.gain.setValueAtTime(.00001,time);g.gain.linearRampToValueAtTime(gain,time+attack);g.gain.exponentialRampToValueAtTime(.00001,time+duration);
    o.connect(f);f.connect(g);g.connect(bus);if(delay)g.connect(delay);o.start(time);o.stop(time+duration+.02);
  },
  drum(ctx,bus,time,type,volume=1){
    const g=ctx.createGain();g.connect(bus);
    if(type==='kick'){
      const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(135,time);o.frequency.exponentialRampToValueAtTime(47,time+.095);
      g.gain.setValueAtTime(.00001,time);g.gain.linearRampToValueAtTime(.75*volume,time+.004);g.gain.exponentialRampToValueAtTime(.00001,time+.31);o.connect(g);o.start(time);o.stop(time+.33);
    }else{
      const src=ctx.createBufferSource(),f=ctx.createBiquadFilter();src.buffer=this.noise(ctx);f.type='bandpass';f.frequency.value=type==='clap'?1850:7200;f.Q.value=type==='clap'?.65:.9;
      const dur=type==='clap'?.14:.055;g.gain.setValueAtTime((type==='clap'?.13:.065)*volume,time);g.gain.exponentialRampToValueAtTime(.00001,time+dur);src.connect(f);f.connect(g);src.start(time);src.stop(time+dur+.01);
    }
  },
  schedule(ctx,graph,index,time,mood){
    const d=this.themes[mood]||this.themes.menu,sp=60/d.bpm/4,bar=Math.floor(index/16),step=index%16,section=Math.floor(bar/2)%4;
    const chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],chord=chords[section].map(n=>n+d.key);
    if(step%4===0)this.drum(ctx,graph.bus,time,'kick',.92);
    if(step===4||step===12)this.drum(ctx,graph.bus,time+.004,'clap',.85);
    if(step%4===2)this.drum(ctx,graph.bus,time+.003,'hat',.6);
    else if(step%2===1)this.drum(ctx,graph.bus,time,'hat',.25);
    if([0,3,6,8,11,14].includes(step)){
      const n=chord[0]-12+(step===11?7:step===3||step===14?12:0);
      this.note(ctx,graph.bus,time+.015,n,sp*(step%4===0?2.6:1.6),.28,'triangle',470,.008);
      this.note(ctx,graph.bus,time+.015,n-12,sp*1.8,.13,'sine',250,.008);
    }
    if(step===0)for(const n of chord)this.note(ctx,graph.bus,time,n+12,sp*15,.065,'triangle',1300,.12,graph.delay);
    const melodies=[[69,72,76,74,72,69,67,64],[69,72,77,76,72,69,65,64],[67,72,76,79,76,72,67,64],[67,71,74,76,74,71,67,62]];
    if(bar%8>=2&&step%2===0&&step!==12){const n=melodies[section][step/2]+d.key;
      this.note(ctx,graph.bus,time+.009,n,sp*2.8,.095*d.lead,'sine',3200,.008,graph.delay);
      this.note(ctx,graph.bus,time+.009,n+12,sp*1.6,.018*d.lead,'triangle',2400,.008,graph.delay);
    }
  },
  tick(){
    const a=Audio8;if(!this.mood||!a.ready){if(this.bus&&this.context)this.bus.gain.setTargetAtTime(0,this.context.currentTime,.1);return;}
    if(this.context!==a.ctx){this.context=a.ctx;const g=this.graph(a.ctx,a.master);this.bus=g.bus;this.delay=g.delay;this.next=0;}
    const paused=APP.screen==='kartRace'&&APP.kartRace?.paused;this.bus.gain.setTargetAtTime(a.musicOn?(paused?.08:.2):0,a.ctx.currentTime,.12);
    const sp=60/(this.themes[this.mood]||this.themes.menu).bpm/4;if(this.next<a.ctx.currentTime-.2)this.next=a.ctx.currentTime+.035;
    while(this.next<a.ctx.currentTime+.16){this.schedule(a.ctx,{bus:this.bus,delay:this.delay},this.step++,this.next,this.mood);this.next+=sp;}
  },
};

// Quiet mechanical engine and filtered tyre noise, without the old sawtooth buzz.
Object.assign(KartSound,{
  effect(type){const a=Audio8;if(!a.ready)return;const t=a.ctx.currentTime;
    if(type.startsWith('drift')){const tier=Number(type.slice(-1));KartMusic.note(a.ctx,a.sfxGain,t,73+tier*4,.1,.055,'sine',3200);KartMusic.note(a.ctx,a.sfxGain,t+.035,80+tier*4,.13,.03,'sine',4000);}
    else if(type==='boost'){a.noise(.17,.055,1300,.5,0,'bandpass',null,4200);KartMusic.note(a.ctx,a.sfxGain,t,69,.15,.04,'triangle',2400);}
    else if(type==='parry'){a.tone('sine',1100,2100,.12,.07);a.noise(.06,.04,4500,.8);}
    else if(type==='hit'||type==='land')KartMusic.drum(a.ctx,a.sfxGain,t,'kick',type==='hit'?.35:.12);
    else if(type==='swing')KartMusic.drum(a.ctx,a.sfxGain,t,'hat',.5);
    else{const midi=type==='back'?58:type==='jump'?76:84;KartMusic.note(a.ctx,a.sfxGain,t,midi,.16,.065,'sine',2400);if(type==='confirm')KartMusic.note(a.ctx,a.sfxGain,t+.065,midi+7,.2,.045,'sine',2400);}
  },
  tick(race){const a=Audio8;if(!a.ready||race.paused||race.phase==='grid'){this.stop();return;}
    if(!this.node){
      this.node=a.ctx.createOscillator();this.node.type='triangle';this.gain=a.ctx.createGain();this.gain.gain.value=0;
      const filter=a.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=380;this.node.connect(filter);filter.connect(this.gain);this.gain.connect(a.sfxGain);this.node.start();
      this.road=a.ctx.createBufferSource();this.road.buffer=KartMusic.noise(a.ctx);this.road.loop=true;this.roadFilter=a.ctx.createBiquadFilter();this.roadFilter.type='bandpass';this.roadFilter.Q.value=.7;
      this.roadGain=a.ctx.createGain();this.roadGain.gain.value=0;this.road.connect(this.roadFilter);this.roadFilter.connect(this.roadGain);this.roadGain.connect(a.sfxGain);this.road.start();
    }
    const r=race.player;this.node.frequency.setTargetAtTime(31+r.v*.64,a.ctx.currentTime,.08);this.gain.gain.setTargetAtTime(.018+r.v*.00018,a.ctx.currentTime,.1);
    this.roadFilter.frequency.setTargetAtTime(r.drift?1350:580,a.ctx.currentTime,.12);this.roadGain.gain.setTargetAtTime((r.height>.15?.001:r.drift?.045:.008)*Math.min(1,r.v/70),a.ctx.currentTime,.1);
  },
  stop(){for(const name of ['node','road'])if(this[name]){try{this[name].stop();this[name].disconnect();}catch(e){}this[name]=null;}for(const name of ['gain','roadGain','roadFilter'])if(this[name]){try{this[name].disconnect();}catch(e){}this[name]=null;}},
});
