// Dos pantallas usan la Battle real, con transporte directo y lobby de la sala.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {spawn}=require('child_process');
(async()=>{
 const srv=spawn('python3',['-m','http.server','8774'],{cwd:process.cwd()+'/web',stdio:'ignore'});process.on('exit',()=>{try{srv.kill()}catch(e){}});
 const browser=await chromium.launch();let ctx;let ok=0,fail=0;const errors=[];const check=(n,c,v)=>{console.log((c?'OK   ':'FAIL ')+n+' '+JSON.stringify(v));c?ok++:fail++};
 try{
  await new Promise(r=>setTimeout(r,900));ctx=await browser.newContext();await ctx.addInitScript({path:'mocksupa.js'});await ctx.addInitScript(()=>window.requestAnimationFrame=()=>0);await ctx.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.APYV_CONFIG={client:window.__mockClient,ice:[]};'}));const pages=[];
  for(let i=0;i<2;i++){const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await p.goto('http://localhost:8774/index.html'+(process.env.RB_DEFAULT_CHECK==='1'?'?netdbg':'?rb=1'));pages.push(p);await p.evaluate(async()=>{await Net.init();window.cl=0;Devices.ctrls.rbtest=new Controller('rbtest');window.pump=setInterval(()=>{Devices.ctrls.rbtest.update(Object.assign(blankState(),{x:cl>180&&cl<210?.8:0,attack:cl>220&&cl%47===0}));cl++;step()},1000/60)})}
  if(!await pages[0].evaluate(()=>typeof RollbackSession==='function')){check('falta RollbackSession',false);return}
  const host=await pages[0].evaluate(()=>{Net.host();Net.localDev='rbtest';APP.slots=[{type:'human',dev:'rbtest',cur:0,pick:'nacho',ready:true},{type:'none'},{type:'none'},{type:'none'}];APP.go('charsel');Net.publishLobby({ph:'lobby'});return Net.myPeer()});
  await pages[1].evaluate(h=>{Net.join(h);Net.localDev='rbtest';Net.guest.ch=CHAR_ORDER.indexOf('michi');Net.guest.rdy=1;Net.set({ch:Net.guest.ch,rdy:1});APP.go('netroom')},host);
  await pages[0].waitForFunction(()=>Net.room.fastReady()&&APP.slots.some(s=>s.remote&&s.ready)&&Net.guestsOf(Net.myPeer()).every(g=>g.presence.rbc===1),null,{polling:100,timeout:20000});
  const rb=await pages[0].evaluate(()=>{const guest=Net.guestsOf(Net.myPeer())[0].peer;const setup={players:[{port:0,char:'nacho',dev:'rbtest'},{port:1,char:'michi',dev:'net:'+guest,remote:guest}],stage:'temple',rules:{mode:'stock',stocks:99,time:0,items:0}};cl=0;Net.startMatch(setup);APP.startBattle(setup);return setup.rollback});
  console.log('MODO',rb,await pages[0].evaluate(()=>({cap:Net.rbCap,peers:Net.peers().map(p=>({peer:p.peer,p:p.presence})),set:Net.lob.set})));await pages[1].waitForFunction(()=>APP.screen==='battle'&&!!Net.rollbackSession,null,{polling:100,timeout:10000});
  check('ambos simulan la misma semilla',rb&&await pages[1].evaluate(()=>!APP.battle.view&&APP.lastSetup.seed===Net.hostPres().lob.set.sd));
  await pages[0].waitForTimeout(6500);for(const p of pages)await p.evaluate(()=>clearInterval(pump));await pages[0].waitForTimeout(250);const cf=Math.min(...await Promise.all(pages.map(p=>p.evaluate(()=>{Net.rollbackSession.reconcile();return Net.rollbackSession.confirmed}))));
  const states=await Promise.all(pages.map(p=>p.evaluate(cf=>({hash:Net.rollbackSession.hashes.get(cf),frame:Net.rollbackSession.frame,confirmed:Net.rollbackSession.confirmed,rollbacks:Net.rollbackSession.metrics.rollbacks,hashes:Array.from(Net.rollbackSession.hashes.entries())}),cf)));
  console.log('PRIMERA DIVERGENCIA',states[0].hashes.find(([f,h])=>f<=cf&&states[1].hashes.find(([q])=>q===f)?.[1]!==h)?.[0]);states.forEach(s=>delete s.hashes);check('último cuadro confirmado coincide',states[0].hash===states[1].hash,states);check('simulación avanza en ambas',states.every(s=>s.frame>300),states.map(s=>s.frame));check('cero errores de consola',!errors.length,errors);
 }catch(e){console.log('DEBUG',await Promise.all((await ctx.pages()).map(p=>p.evaluate(()=>({screen:APP.screen,rb:!!Net.rollbackSession,lob:Net.hostPres()?.lob})).catch(()=>null))));throw e;}finally{await browser.close();srv.kill();console.log(ok+' OK, '+fail+' FAIL');process.exitCode=fail?1:0}
})().catch(e=>{console.error(e);process.exitCode=1});
