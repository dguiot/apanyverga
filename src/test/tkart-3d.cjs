const {chromium}=require('playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.APYV_CONFIG={};'}));await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
    const checks=await page.evaluate(async()=>{
      const checks=[],ok=(name,test,details)=>checks.push({name,pass:!!test,details}),fresh=()=>{const R=new KartRace(KART_TRACKS[0],'daniel',1,false,444);R.phase='race';return R;};
      APP.update=()=>{};KartMenu.char=1;KartMenu.track=0;KartMenu.start();const race=APP.kartRace;race.phase='race';render();
      ok('racing renders through WebGL2',Kart3D.renderer?.getContext() instanceof WebGL2RenderingContext);
      let sprites=0,texturedDrivers=0;for(const d of Kart3D.drivers)d.traverse(o=>{if(o.isSprite)sprites++;if(o.material?.map&&!(o.material.map.image instanceof HTMLCanvasElement))texturedDrivers++;});
      ok('drivers are solid geometry without photo billboards',sprites===0&&texturedDrivers===0);
      const w=race.course.world(race.player.s,race.player.x),t=race.course.sample(race.player.s);ok('chase camera is behind the pilot',(Kart3D.camera.position.x-w.x)*t.tx+(Kart3D.camera.position.z-w.z)*t.tz<0);
      ok('sky follows camera without far-plane holes',Kart3D.skyMesh.position.distanceTo(Kart3D.camera.position)<.001);
      ok('all 15 original pilots have 3D kart previews',CHAR_ORDER.every(id=>Kart3D.thumbnail(id)?.img.width===360));
      ok('twelve distinct item definitions and icons',Object.keys(KART_ITEMS).length===12&&Object.keys(KART_ITEMS).every(id=>KartRender.itemIcon(id).img.width>0));
      ok('course has functional ramps and coins',race.course.ramps.length===3&&race.course.coins.length===72);
      let R=fresh(),p=R.player;R.racers=[p];const curve=R.course.samples.find(q=>Math.abs(q.curve)>.007);p.s=curve.s;p.v=80;p.x=0;
      for(let i=0;i<20;i++)R.drive(p,{gas:true},1/60);ok('no steering retains world heading instead of following a curve',Math.abs(p.yaw)>.05&&Math.abs(p.x)>.05);
      R=fresh();p=R.player;R.racers=[p];p.v=85;p.s=100;p.x=0;
      for(let i=0;i<20;i++)R.drive(p,{gas:true,steer:.75,drift:true},1/60);const yaw=p.yaw,charge=p.charge;
      for(let i=0;i<18;i++)R.drive(p,{gas:true,steer:-.7,drift:true},1/60);
      ok('countersteering reverses angular velocity while maintaining the drift',p.drift===1&&p.driftDir===1&&p.turnRate<0&&p.charge>charge,{yawBefore:yaw,yawAfter:p.yaw,turnRate:p.turnRate});
      const turbos=[.8,1.5,2.2].map(charge=>{const r=fresh(),p=r.player;r.racers=[p];p.s=100;p.v=80;p.x=0;p.drift=1;p.driftDir=1;p.charge=charge;r.drive(p,{gas:true},1/60);return p.turbo;});
      ok('three increasing drift boost levels',turbos[0]<turbos[1]&&turbos[1]<turbos[2],turbos);
      R=fresh();p=R.player;R.racers=[p];p.s=100;p.x=0;p.v=85;p.item='spring';R.useItem(p);let maxHeight=0;
      for(let i=0;i<95;i++){R.drive(p,{gas:true,driftPressed:i===25},1/60);maxHeight=Math.max(maxHeight,p.height);}
      ok('spring jump has height and lands with an acrobatic turbo',maxHeight>3&&p.height===0&&p.turbo>.5,{maxHeight,turbo:p.turbo});
      R=fresh();p=R.player;R.racers=[p];const ramp=R.course.ramps[0];p.s=ramp.s-1;p.x=ramp.x;p.v=80;R.drive(p,{gas:true},1/60);ok('crossing a ramp launches the kart',p.vy>8&&p.height>0);
      R=fresh();p=R.player;const target=R.racers[1];p.s=100;target.s=122;p.x=target.x=0;p.v=85;
      for(let i=0;i<145;i++){p.x=0;p.yaw=p.velocityYaw=0;target.s=p.s+22;target.x=0;R.drive(p,{gas:true},1/60);}ok('slipstream rewards holding a racing line',p.slipCd>0&&p.turbo>0);
      R=fresh();p=R.player;R.racers=[p];const coin=R.course.coins[0];p.s=coin.s-1;p.x=coin.x;p.v=80;R.drive(p,{gas:true},1/60);ok('coin pickup adds speed currency and sets cooldown',p.coins===1&&coin.ready>R.time);
      p.coins=10;R.hit(p,null);ok('impact drops three coins',p.coins===7);
      R=fresh();p=R.player;R.racers=[p];const box=R.course.boxes[0];p.s=box.s-1;p.x=box.x+.5;p.v=80;p.item='magnet';R.useItem(p);R.drive(p,{gas:true},1/60);ok('magnet attracts a box from another line',p.magnet>8&&p.roulette>0);
      R=fresh();p=R.player;p.s=100;for(let i=1;i<R.racers.length;i++){R.racers[i].s=120+i*20;R.racers[i].x=0;}p.item='triple';R.useItem(p);
      ok('triple chile launches three homing projectiles',R.projectiles.length===3&&new Set(R.projectiles.map(q=>q.target)).size===3);
      R=fresh();p=R.player;p.s=100;p.item='boomerang';R.useItem(p);const q=R.projectiles[0];q.age=1.2;q.s=p.s+100;R.updateProjectiles(1/60);ok('boomerang returns toward its owner',q.v<0);
      R=fresh();p=R.player;p.s=100;R.racers[1].s=130;R.racers[1].shield=5;R.racers[2].s=150;R.racers[3].s=700;p.item='lightning';R.useItem(p);
      ok('lightning respects range and shields',R.racers[1].shield===0&&R.racers[1].slow===0&&R.racers[2].slow>3&&R.racers[3].slow===0);
      p.item='star';R.useItem(p);const before=p.v;ok('star blocks damage for six seconds',!R.hit(p,1)&&p.v===before&&p.star===6);
      ok('new score replaces the racing chiptune',KartMusic.mood==='mercado'&&Audio8.song===null);
      // Render a score excerpt offline: catches silence, clipped synthesis and graph errors.
      const seconds=20,ctx=new OfflineAudioContext(2,22050*seconds,22050),graph=KartMusic.graph(ctx,ctx.destination),sp=60/KartMusic.themes.mercado.bpm/4;
      for(let i=0;i*sp<seconds-2;i++)KartMusic.schedule(ctx,graph,i,i*sp+.02,'mercado');const buffer=await ctx.startRendering(),audio=buffer.getChannelData(0);let peak=0,rms=0;
      for(const v of audio){peak=Math.max(peak,Math.abs(v));rms+=v*v;}rms=Math.sqrt(rms/audio.length);ok('new soundtrack is audible and does not clip',peak>.03&&peak<.98&&rms>.005,{peak,rms});
      window.__kartMusicPreview=audio;
      const renderer=Kart3D.renderer;APP.go('kartGarage');ok('leaving race hides WebGL without changing fights',renderer.domElement.style.display==='none');
      KartMenu.start();render();ok('restarting reuses one WebGL context',Kart3D.renderer===renderer&&document.querySelectorAll('#kart-world').length===1);
      return checks;
    });
    for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.details?' '+JSON.stringify(c.details):''));
    if(process.env.KART_AUDIO){
      const audio=await page.evaluate(()=>{const a=window.__kartMusicPreview,out=new Uint8Array(44+a.length*2),v=new DataView(out.buffer),str=(i,s)=>{for(let j=0;j<s.length;j++)v.setUint8(i+j,s.charCodeAt(j));};str(0,'RIFF');v.setUint32(4,out.length-8,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,22050,true);v.setUint32(28,44100,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,a.length*2,true);for(let i=0;i<a.length;i++)v.setInt16(44+i*2,Math.max(-32767,Math.min(32767,a[i]*32767)),true);let binary='';for(let i=0;i<out.length;i+=8192)binary+=String.fromCharCode(...out.subarray(i,i+8192));return btoa(binary);});fs.writeFileSync(process.env.KART_AUDIO,Buffer.from(audio,'base64'));
    }
    console.log('Browser errors: '+JSON.stringify(errors));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
