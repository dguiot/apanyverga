const {chromium}=require('playwright'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
(async()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../../index.html')),server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url.startsWith('/config.js')?'application/javascript':'text/html; charset=utf-8');res.end(req.url.startsWith('/config.js')?'window.APYV_CONFIG={};':html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--autoplay-policy=document-user-activation-required']});
 const errors=[],checks=[],ok=(name,pass,details)=>{checks.push(!!pass);console.log((pass?'PASS ':'FAIL ')+name+' '+JSON.stringify(details));};
 const url='http://127.0.0.1:'+server.address().port;
 const open=async(saved,probe=false)=>{const context=await browser.newContext({viewport:{width:1280,height:720}});if(saved)await context.addInitScript(s=>{for(const [k,v]of Object.entries(s))if(localStorage.getItem(k)===null)localStorage.setItem(k,v);},saved);if(probe)await context.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{window.__beforeGesture={prompt:!AudioStatus.button.hidden,noContext:!Audio8.ctx};Audio8.unlock();window.__programmaticState=Audio8.ctx.state;}));const p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));await p.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await p.goto(url);await p.waitForFunction(()=>Devices.frame>5);return p;};
 // Inspect the live, post-compressor output; oscillator creation alone is not
 // evidence of audible output. No autoplay-bypass launch flag is used.
 const meter=p=>p.evaluate(async()=>{
  const a=Audio8,analyser=a.ctx.createAnalyser();analyser.fftSize=2048;a.comp.connect(analyser);const samples=new Float32Array(analyser.fftSize);let rms=0,peak=0;
  for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,70));analyser.getFloatTimeDomainData(samples);let sum=0;for(const n of samples){sum+=n*n;peak=Math.max(peak,Math.abs(n));}rms=Math.max(rms,Math.sqrt(sum/samples.length));}a.comp.disconnect(analyser);return {rms,peak};
 });
 try{
  const p=await open(null,true);ok('audio activation is visible on the new cover before any gesture',await p.evaluate(()=>__beforeGesture.prompt&&__beforeGesture.noContext));
  // Runtime.evaluate can itself carry a DevTools user gesture, so the blocked
  // attempt must originate inside the page before any test evaluation.
  ok('strict autoplay really blocks programmatic playback',await p.evaluate(()=>__programmaticState==='suspended'));
  await p.locator('#game-audio').click();await p.waitForFunction(()=>Audio8.ready);let m=await meter(p);
  ok('native activation resumes a pending context and produces lobby sound',m.rms>.001&&m.peak<1,m);
  ok('activation does not also select Local or Online',await p.evaluate(()=>APP.screen==='title'&&!ShellUI.active));
  ok('activation prompt disappears only once the unmuted context is running',await p.locator('#game-audio').isHidden());
  await p.evaluate(()=>{Audio8.setMusic(false);KartMusic.tick();});await p.waitForTimeout(1100);m=await meter(p);ok('disabling music actually silences the live music bus',m.rms<.00002,m);
  await p.evaluate(()=>Audio8.sfx('bighit'));m=await meter(p);ok('effects remain audible with music disabled',m.rms>.001,m);
  await p.evaluate(()=>{Audio8.setMusic(true);KartMusic.tick();});m=await meter(p);ok('music can resume without resetting the game or context',m.rms>.001,m);
  // Ducking previously left scheduled gain automation that could overwrite
  // a later unmute. Test the output, including while chat is connected.
  await p.evaluate(()=>{AV.on=true;AV.count=()=>1;Audio8.duckCheck();Audio8.setMuted(true);});await p.waitForTimeout(300);m=await meter(p);ok('master mute silences music and effects after voice ducking',m.rms<.00002,m);
  await p.evaluate(()=>{Audio8.setMuted(false);Audio8.setMusic(false);Audio8.sfx('bighit');});m=await meter(p);ok('explicit unmute overrides old gain automation while preserving music preference',m.rms>.0002&&await p.evaluate(()=>!Audio8.musicOn),m);
  await p.evaluate(()=>{AV.on=false;AV.count=()=>0;Audio8.duckCheck();Audio8.setMusic(true);});
  await p.evaluate(async()=>{await Audio8.ctx.suspend();});ok('a suspended context exposes the activation control again',await p.locator('#game-audio').isVisible());
  await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForFunction(()=>Audio8.ready);m=await meter(p);ok('returning to the page resumes previously active audio',m.rms>.001,m);
  await p.evaluate(async()=>{await Audio8.ctx.suspend();window.__resume=Audio8.ctx.resume.bind(Audio8.ctx);Audio8.ctx.resume=()=>Promise.reject(new Error('test resume rejection'));Audio8.unlock();});await p.waitForFunction(()=>Audio8.error&&!Audio8.resumeTask);ok('a rejected resume exposes a visible retry action',/Reintentar/.test(await p.locator('#game-audio').textContent()));
  await p.evaluate(()=>Audio8.ctx.resume=__resume);await p.locator('#game-audio').click();await p.waitForFunction(()=>Audio8.ready&&!Audio8.error);m=await meter(p);ok('retry after a resume error restores real output',m.rms>.001,m);
  await p.evaluate(async()=>{window.__oldAudio=Audio8.ctx;await Audio8.ctx.close();});await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>Audio8.ready&&Audio8.ctx!==__oldAudio&&KartMusic.context===Audio8.ctx);m=await meter(p);ok('a closed context and its music graph are rebuilt on a trusted gesture',m.rms>.001,m);
  for(const game of ['fight','kart','fps']){
   await p.evaluate(game=>{ShellUI.begin(false);ShellUI.choose(game);ShellUI.config.locals=1;ShellUI.launch();},game);
   await p.waitForFunction(()=>['battle','kartRace','fpsGame'].includes(APP.screen));m=await meter(p);ok(game+' has live stage music through the actual game route',m.rms>.001,m);
   await p.evaluate(()=>ShellUI.pause());m=await meter(p);ok(game+' pause retains audible music',m.rms>.0001,m);await p.evaluate(()=>ShellUI.room());
  }
  await p.context().close();
  const saved=await open({'golpazo-audio-v2':JSON.stringify({muted:true,musicOn:false})});
  ok('saved mute and music choice are reflected before an audio context exists',await saved.evaluate(()=>Audio8.muted&&!Audio8.musicOn&&Audio8.ctx===null)&&/silenciado/i.test(await saved.locator('#game-audio').textContent()));
  await saved.locator('#game-audio').focus();await saved.keyboard.press('Enter');await saved.waitForFunction(()=>Audio8.ready);
  ok('keyboard can activate the native button without entering a game',await saved.evaluate(()=>APP.screen==='title'&&!Audio8.muted&&!Audio8.musicOn));
  await saved.evaluate(()=>Audio8.sfx('bighit'));m=await meter(saved);ok('activation preserves disabled music and restores effects',m.rms>.001,m);
  await saved.reload();await saved.waitForFunction(()=>Devices.frame>5);ok('separate music and master preferences survive reload',await saved.evaluate(()=>!Audio8.muted&&!Audio8.musicOn));await saved.context().close();
  for(const [legacy,music,muted]of [['fx',false,false],['1',true,true],['0',true,false]]){const q=await open({'golpazo-muted':legacy});ok('legacy preference '+legacy+' migrates before a gesture',await q.evaluate(([music,muted])=>Audio8.musicOn===music&&Audio8.muted===muted,[music,muted]));await q.context().close();}
  ok('no browser errors',errors.length===0,errors);console.log(JSON.stringify({passed:checks.filter(Boolean).length,total:checks.length}));if(checks.some(c=>!c))process.exitCode=1;
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
