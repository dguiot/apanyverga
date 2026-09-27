// Aceptación: dos pantallas, red con pérdidas, respuesta local y checksum confirmado.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const {spawn}=require('child_process');
(async()=>{
 const srv=spawn('python3',['-m','http.server','8775'],{cwd:process.cwd()+'/web',stdio:'ignore'});process.on('exit',()=>{try{srv.kill()}catch(e){}});
 const browser=await chromium.launch();let ok=0,fail=0;const check=(name,pass,value)=>{console.log((pass?'OK   ':'FAIL ')+name+' '+JSON.stringify(value));pass?ok++:fail++};
 try{
  await new Promise(r=>setTimeout(r,900));
  async function match(mode,seconds,label){
   const ctx=await browser.newContext({viewport:{width:1280,height:720}}),errors=[],pages=[];await ctx.addInitScript({path:'mocksupa.js'});await ctx.addInitScript(()=>window.requestAnimationFrame=()=>0);await ctx.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.APYV_CONFIG={client:window.__mockClient,ice:[]};'}));
   try{
    for(let i=0;i<2;i++){
     const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await p.goto('http://localhost:8775/index.html?rb='+mode+'&netdbg');pages.push(p);
     if(mode==='1'&&!await p.evaluate(()=>typeof RBStateCodec==='function'))return {missing:true,errors};
     await p.evaluate(async i=>{
      await Net.init();window.testPlayer=i;window.gameClock=0;window.response=null;window.probe=null;Devices.ctrls.rbtest=new Controller('rbtest');
      window.pump=setInterval(()=>{
       const playing=APP.screen==='battle'||APP.screen==='netview';if(playing)gameClock++;
       const t=gameClock,s=blankState();s.tapJump=false;
       if(playing&&t>=180&&t<210&&testPlayer===1)s.x=-1;
       if(playing&&t>=250){s.x=Math.sin((t+testPlayer*83)/77)>.2?.81:-.73;s.y=Math.cos((t+testPlayer*19)/127)*.4;s.jump=t%103<10;s.attack=t%37<2;s.special=t%181<2}
       Devices.ctrls.rbtest.update(s);
       const me=()=>((APP.screen==='battle'?APP.battle:Net.view)?.fighters||[]).find(f=>f.port===testPlayer);
       if(playing&&testPlayer===1&&t===180&&me())window.probe={t,x:me().x};step();
       if(probe&&response===null&&me()&&Math.abs(me().x-probe.x)>.01)response=t-probe.t;
      },1000/60);
     },i);
    }
    const host=await pages[0].evaluate(()=>{Net.host();Net.localDev='rbtest';APP.slots=[{type:'human',dev:'rbtest',cur:CHAR_ORDER.indexOf('nacho'),pick:'nacho',ready:true},{type:'none'},{type:'none'},{type:'none'}];APP.go('charsel');Net.publishLobby({ph:'lobby'});return Net.myPeer()});
    await pages[1].evaluate(h=>{Net.join(h);Net.localDev='rbtest';Net.guest.ch=CHAR_ORDER.indexOf('michi');Net.guest.rdy=1;Net.set({ch:Net.guest.ch,rdy:1});APP.go('netroom')},host);
    await pages[0].waitForFunction(mode=>Net.room.fastReady()&&APP.slots.some(s=>s.remote&&s.ready)&&(mode==='0'||Net.guestsOf(Net.myPeer()).every(g=>g.presence.rbc===1)),mode,{polling:100,timeout:20000});
    for(const p of pages)await p.evaluate(()=>{window.__netsim={delay:60,jitter:15,loss:.05};gameClock=0});
    const selected=await pages[0].evaluate(()=>{const g=Net.guestsOf(Net.myPeer())[0].peer;const setup={players:[{port:0,char:'nacho',dev:'rbtest',team:0},{port:1,char:'michi',dev:'net:'+g,remote:g,team:1}],stage:'temple',rules:{mode:'stock',stocks:99,time:0,items:2}};Net.startMatch(setup);APP.startBattle(setup);return setup.rollback});
    await pages[1].waitForFunction(mode=>APP.screen===(mode==='1'?'battle':'netview'),mode,{polling:100,timeout:10000});
    console.log('PARTIDA '+label+' iniciada '+JSON.stringify({selected,seconds}));
    for(let t=0;t<seconds;t+=10){await pages[0].waitForTimeout(Math.min(10,seconds-t)*1000);console.log('PROGRESO '+label+' '+Math.min(t+10,seconds)+'s')}
    for(const p of pages)await p.evaluate(()=>clearInterval(pump));await pages[0].waitForTimeout(400);
    const latency=await pages[1].evaluate(()=>response);
    if(mode==='0')return {latency,selected,errors};
    for(const p of pages)await p.evaluate(()=>Net.rollbackSession.reconcile());const cf=Math.min(...await Promise.all(pages.map(p=>p.evaluate(()=>Net.rollbackSession.confirmed))));
    const stats=await Promise.all(pages.map(p=>p.evaluate(cf=>{const r=Net.rollbackSession;return {frame:r.frame,confirmed:r.confirmed,hash:r.hashes.get(cf),delay:r.delay,rtt:Math.max(0,...r.rtts.values()),ahead:r.ahead,...r.metrics}},cf)));
    return {latency,selected,cf,stats,errors};
   }catch(e){console.log('DEBUG',JSON.stringify(await Promise.all(pages.map(p=>p.evaluate(()=>({screen:APP.screen,room:Net.room?._debug(),r:Net.rollbackSession?{frame:Net.rollbackSession.frame,confirmed:Net.rollbackSession.confirmed,metrics:Net.rollbackSession.metrics}:null})).catch(()=>null)))));throw e}finally{await ctx.close()}
  }
  const baseline=await match('0',7,'legado');check('latencia medida en modo anterior',baseline.latency!==null&&!baseline.selected,baseline);
  const runs=Number(process.env.ROLLBACK_RUNS||1);
  for(let i=1;i<=runs;i++){
   const r=await match('1',60,'rollback '+i);
   if(r.missing){check('falta árbitro de estado completo',false);break}
   check('respuesta local <=3 cuadros '+i,r.selected&&r.latency!==null&&r.latency<=3,{before:baseline.latency,after:r.latency});
   check('checksum confirmado igual '+i,r.cf>3000&&r.stats[0].hash===r.stats[1].hash&&r.stats[0].hash!==undefined,{cf:r.cf,stats:r.stats});
   check('cero errores de consola '+i,!r.errors.length,r.errors);
   if(fail)break;
  }
 }finally{await browser.close();srv.kill();console.log(ok+' OK, '+fail+' FAIL');process.exitCode=fail?1:0}
})().catch(e=>{console.error(e);process.exitCode=1});
