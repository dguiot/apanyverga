// Real browser peers and WebRTC; only the existing Supabase signaling service is mocked.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
  const root=path.resolve(__dirname,'../..'),html=fs.readFileSync(path.join(root,'index.html'));
  const server=http.createServer((req,res)=>{if(req.url.startsWith('/config.js')){res.setHeader('Content-Type','application/javascript');res.end('window.APYV_CONFIG={client:window.__mockClient,ice:[]};');}else if(req.url.startsWith('/favicon.ico')){res.writeHead(204);res.end();}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errors=[],checks=[],ok=(name,pass,details)=>{checks.push({name,pass:!!pass});console.log((pass?'PASS ':'FAIL ')+name+(details?' '+JSON.stringify(details):''));};
  try{
    const context=await browser.newContext({viewport:{width:1280,height:720},permissions:['camera','microphone']});
    // Four worlds compile on one shared test GPU. Avoid treating that temporary
    // main-thread stall as a participant leaving the simulated presence service.
    await context.addInitScript({content:fs.readFileSync(path.join(__dirname,'mocksupa.js'),'utf8').replace('> 3000','> 15000')});
    // Windows Chrome's fake capture device can end immediately. A moving canvas
    // supplies deterministic video; AV signaling, codecs and RTP remain real.
    await context.addInitScript(()=>{const gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async c=>{const s=await gum({audio:c.audio});if(c.video){const cv=document.createElement('canvas');cv.width=320;cv.height=240;const cx=cv.getContext('2d');let t=0;const draw=()=>{cx.fillStyle='#183e58';cx.fillRect(0,0,320,240);cx.fillStyle='#f6bf54';cx.fillRect((t++*3)%280,60,40,120);};draw();const timer=setInterval(draw,66),v=cv.captureStream(15).getVideoTracks()[0];v.addEventListener('ended',()=>clearInterval(timer));s.addTrack(v);}return s;};});
    const mk=async(name,suffix='')=>{const p=await context.newPage();p.on('pageerror',e=>errors.push(name+': '+e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(name+': '+m.text());});p.on('dialog',d=>d.accept(name));await p.goto(url+suffix);await p.waitForFunction(()=>Net.ok&&Devices.frame>20);return p;};
    const wait=async(p,fn,timeout=15000)=>p.waitForFunction(fn,null,{timeout});
    const key=async(p,k)=>{const frame=await p.evaluate(()=>Devices.frame);await p.keyboard.down(k);await p.waitForFunction(f=>Devices.frame>f+3,frame);await p.keyboard.up(k);await p.waitForFunction(f=>Devices.frame>f+6,frame);};
    const A=await mk('Ana');await A.evaluate(()=>{KartMenu.enter();});await key(A,'u');ok('garage keyboard opens existing room browser',await A.evaluate(()=>APP.screen==='online'&&KartOnline.browsing));
    await key(A,'Enter');await wait(A,()=>APP.screen==='kartLobby'&&Net.lob.players.length===1);ok('existing create-room flow opens Kart lobby',await A.evaluate(()=>Net.role==='host'&&Net.lob.game==='kart'&&!!Net.code));
    const code=await A.evaluate(()=>Net.code),B=await mk('Beto','/?sala='+code);await B.evaluate(()=>APP.go('online'));await wait(B,()=>APP.screen==='kartLobby');
    ok('existing invitation joins Kart automatically',await B.evaluate(()=>Net.role==='guest'&&Net.hostPres().code===new URLSearchParams(location.search).get('sala')));
    await key(B,'v');await wait(B,()=>APP.screen==='kartVehicles');await key(B,'ArrowDown');await key(B,'ArrowRight');await key(B,'Enter');await wait(B,()=>APP.screen==='kartLobby');await wait(A,()=>Net.lob.players[1]?.vh===4);
    ok('guest selects a sportbike through the online garage',await B.evaluate(()=>KartMenu.vehicle===4&&Net.guest.vh===4&&Net.guest.rdy===0));
    await B.evaluate(()=>{Net.guest.ch=1;Net.set({ch:1});});await key(B,'Enter');await wait(A,()=>Net.lob.players.length===2&&Net.lob.players[1].ready);
    await A.evaluate(()=>AV.start());await B.evaluate(()=>AV.start());
    await wait(A,()=>AV.count()===1,25000);await wait(B,()=>!!AV.videoFor(Net.hostPeer),25000);
    ok('existing voice and camera connect between real WebRTC peers',await B.evaluate(()=>AV.count()===1&&[...AV.pcs.values()][0].stream.getAudioTracks().length===1&&!!AV.videoFor(Net.hostPeer)));
    await key(A,'Enter');await wait(B,()=>APP.screen==='kartRace'&&APP.kartRace.online);
    ok('both peers share seed, course, roster and epoch',JSON.stringify(await A.evaluate(()=>APP.kartRace.setup))===JSON.stringify(await B.evaluate(()=>APP.kartRace.setup)));
    await wait(A,()=>Kart3D.lastViewports?.length===2);await wait(B,()=>Kart3D.lastViewports?.length===2);
    ok('two players produce exactly two chase cameras on each screen',await B.evaluate(()=>Kart3D.views.size===2&&Kart3D.lastViewports.every(b=>b.w===640&&b.h===720)));
    ok('guest controls its own pilot',await B.evaluate(()=>APP.kartRace.player.peer===Net.myPeer()&&APP.kartRace.player.index===1));
    ok('chosen motorcycle and its handling are shared by host and guest',await B.evaluate(()=>APP.kartRace.player.vehicle===4&&Kart3D.drivers[1].userData.wheels.length===2&&APP.kartRace.player.stats.accel===kartStats(APP.kartRace.player.id,4).accel)&&await A.evaluate(()=>APP.kartRace.racers[1].vehicle===4));
    ok('camera and voice survive the transition into racing',await B.evaluate(()=>AV.on&&AV.count()===1&&!!AV.videoFor(Net.hostPeer)&&avButtonShown()));
    await wait(B,()=>Net.room.fastReady());ok('Kart uses the existing direct data channels',await B.evaluate(()=>Net.room._debug().links.some(l=>l[1]==='open'&&l[3]==='open')));
    await A.evaluate(()=>{APP.kartRace.countdown=.05;KartOnline.pushState();});await wait(A,()=>APP.kartRace.phase==='race');await wait(B,()=>APP.kartRace.phase==='race');
    await B.keyboard.down('ArrowUp');await wait(A,()=>APP.kartRace.racers[1].v>8);await B.keyboard.up('ArrowUp');
    ok('remote accelerator moves only the assigned human',await A.evaluate(()=>APP.kartRace.racers[1].v>8&&APP.kartRace.racers[0].v<1));
    for(const p of [A,B])await p.evaluate(()=>{window.__netsim={delay:70,jitter:25,loss:.05};});
    await B.evaluate(()=>{
      window.__correctionProbe=[];const original=KartMotion.reconcile;
      KartMotion.reconcile=function(r,previous,hard){original.call(this,r,previous,hard);if(r===APP.kartRace.player&&!hard&&Math.abs(previous.s-r.s)<12&&Math.abs(previous.x-r.x)<.4){const v=this.view(r,1);__correctionProbe.push(Math.hypot(v.s-previous.s,v.x-previous.x));}};
      window.__inputProbe={frame:Devices.frame,v:APP.kartRace.player.v};
    });
    await B.keyboard.down('ArrowUp');await wait(B,()=>APP.kartRace.player.v>__inputProbe.v+.1);
    const responseFrames=await B.evaluate(()=>Devices.frame-__inputProbe.frame);await B.waitForTimeout(1800);await B.keyboard.up('ArrowUp');
    const continuity=await B.evaluate(()=>({samples:__correctionProbe.length,max:Math.max(0,...__correctionProbe)}));
    ok('local kart responds without waiting for the delayed host',responseFrames<=6,{frames:responseFrames,networkDelayMs:70});
    ok('visual corrections remain continuous with jitter and five percent packet loss',continuity.samples>5&&continuity.max<.001,continuity);
    for(const p of [A,B])await p.evaluate(()=>{delete window.__netsim;});
    await A.evaluate(()=>{const r=APP.kartRace.racers[1];r.item='triple';r.v=0;r.s=100;r.x=0;KartOnline.pushState();});await wait(B,()=>APP.kartRace.player.item==='triple');
    await key(B,'e');await wait(A,()=>APP.kartRace.racers[1].item===null);
    ok('guest item button launches three authoritative projectiles',await A.evaluate(()=>APP.kartRace.projectiles.filter(p=>p.owner===1&&p.type==='chile').length===3));
    await A.evaluate(()=>{const r=APP.kartRace.racers[1];r.item='shield';Net.presOf(r.peer).inp={k:1,e:KartOnline.ep-1,q:999999,a:[0,1,99,0,0]};KartOnline.inputFor(r);});
    ok('old-race inputs cannot consume items or hijack a new race',await A.evaluate(()=>APP.kartRace.racers[1].item==='shield'&&KartOnline.remote.get(APP.kartRace.racers[1].peer).q<999999));
    const frozen=await B.evaluate(()=>{const s=Net.hostPres().st,t=KartOnline.lastStateTick;KartOnline.applyState({...s,e:s.e-1,t:t+1000});KartOnline.applyState({...s,t:t-1});return KartOnline.lastStateTick===t;});ok('stale and wrong-epoch snapshots are rejected',frozen);
    const before=await A.evaluate(()=>APP.kartRace.time);await key(B,'Escape');await B.waitForTimeout(350);
    ok('opening a guest menu does not pause the room',await A.evaluate(t=>APP.kartRace.time>t,before));await key(B,'Escape');
    await A.screenshot({path:path.join(root,'work','kart-online-2.png')});
    const C=await mk('Caro');await C.evaluate(()=>{APP.go('online');});await wait(C,()=>Net.availableHosts().length>0);await C.evaluate(()=>{APP.onSel=1;});await key(C,'Enter');await wait(C,()=>APP.screen==='kartRace');
    ok('mid-race arrival watches without stealing a driving slot',await C.evaluate(()=>APP.kartRace.spectator&&APP.kartRace.racers.filter(r=>r.human).length===2));
    await A.evaluate(()=>KartOnline.lobby());await wait(B,()=>APP.screen==='kartLobby');await wait(C,()=>APP.screen==='kartLobby');await wait(A,()=>Net.lob.players.length===3);
    await key(B,'Enter');await key(C,'Enter');await wait(A,()=>Net.lob.players.every(p=>p.ready));await key(A,'Enter');await wait(C,()=>APP.screen==='kartRace'&&Kart3D.lastViewports?.length===3);
    ok('three players fill three non-overlapping viewports',await C.evaluate(()=>{const b=Kart3D.lastViewports;return b.length===3&&b.reduce((n,r)=>n+r.w*r.h,0)===W*H&&b[0].h===720&&b[1].h===360&&b[2].y===360;}));
    await C.screenshot({path:path.join(root,'work','kart-online-3.png')});
    const D=await mk('Dani');await D.evaluate(()=>APP.go('online'));await wait(D,()=>Net.availableHosts().length>0);await D.evaluate(()=>APP.onSel=1);await key(D,'Enter');await wait(D,()=>APP.screen==='kartRace');
    await A.evaluate(()=>KartOnline.lobby());for(const p of [B,C,D])await wait(p,()=>APP.screen==='kartLobby');await wait(A,()=>Net.lob.players.length===4);
    await C.evaluate(()=>{Net.guest.ch=3;Net.set({ch:3});});await D.evaluate(()=>{Net.guest.ch=7;Net.set({ch:7});});
    await C.evaluate(()=>AV.start());await D.evaluate(()=>AV.start());for(const p of [A,B,C,D])await wait(p,()=>AV.count()===3,25000);
    ok('all four participants share the existing voice/video mesh',await D.evaluate(()=>AV.count()===3&&[...AV.pcs.values()].every(r=>r.stream?.getAudioTracks().length===1)));
    await wait(D,()=>[...AV.pcs.keys()].every(peer=>!!AV.videoFor(peer)),25000);
    ok('all remote video streams decode in the four-player room',await D.evaluate(()=>[...AV.pcs.keys()].every(peer=>AV.videoFor(peer)?.v.videoWidth>0)));
    for(const p of [B,C,D])await key(p,'Enter');await wait(A,()=>Net.lob.players.every(p=>p.ready));await key(A,'Enter');for(const p of [B,C,D])await wait(p,()=>APP.screen==='kartRace'&&Kart3D.lastViewports?.length===4);
    ok('four-player grid shares one WebGL context per browser',await D.evaluate(()=>Kart3D.lastViewports.length===4&&Kart3D.views.size===4&&document.querySelectorAll('#kart-world').length===1));
    ok('every split camera follows behind its own racer',await D.evaluate(()=>APP.kartRace.racers.filter(r=>r.human).every(r=>{const v=Kart3D.views.get(r.index),w=APP.kartRace.course.world(r.s,r.x),q=APP.kartRace.course.sample(r.s);return (v.camera.position.x-w.x)*q.tx+(v.camera.position.z-w.z)*q.tz<0;})));
    await A.evaluate(()=>{const r=APP.kartRace;r.countdown=.01;r.racers.forEach(p=>{p.s=1000+p.index*25;p.ps=p.s;p.x=p.index%2?.3:-.3;p.px=p.x;});KartOnline.pushState();});await wait(D,()=>APP.kartRace.phase==='race');
    await D.keyboard.down('ArrowUp');await D.keyboard.down('ArrowRight');await wait(A,()=>APP.kartRace.racers[3].v>5);await D.keyboard.down('Space');await D.waitForTimeout(200);await D.keyboard.up('Space');await D.keyboard.up('ArrowRight');await D.keyboard.up('ArrowUp');
    ok('fourth guest has independent steering and accelerator',await A.evaluate(()=>APP.kartRace.racers[3].v>5&&APP.kartRace.racers[3].yaw>0&&APP.kartRace.racers[0].v<1));
    const size=await A.evaluate(()=>({snapshot:JSON.stringify(KartOnline.snapshot()).length,presence:new TextEncoder().encode(JSON.stringify(Net.me().presence)).length}));ok('four-player state stays inside original presence limit',size.presence<=4096,size);
    await A.evaluate(()=>{Toasts.items=[];});await A.screenshot({path:path.join(root,'work','kart-online-4.png')});
    // Force relay mode through the production room adapter, not a separate Kart transport.
    await D.evaluate(()=>Net.set({role:'idle'}));await wait(D,()=>Net.room._debug().links.length===0);const relays=await D.evaluate(()=>window.__mockStats.bcPfast);
    await D.evaluate(()=>{Net.set({role:'guest'});KartOnline.sendInput({gas:true});});await D.waitForFunction(n=>window.__mockStats.bcPfast>n,relays);
    await D.keyboard.down('ArrowUp');await wait(A,()=>APP.kartRace.racers[3].v>8);await D.keyboard.up('ArrowUp');
    ok('room relay remains usable while direct links reconnect',await D.evaluate(n=>window.__mockStats.bcPfast>n,relays));
    await D.evaluate(()=>KartOnline.leave());await wait(A,()=>APP.kartRace.racers[3].disconnected);
    ok('a departed driver becomes CPU without ending the race',await A.evaluate(()=>APP.kartRace.phase==='race'&&APP.kartRace.racers[3].human&&APP.kartRace.racers[3].disconnected));
    await A.evaluate(()=>{const r=APP.kartRace;r.projectiles=[];for(const p of r.racers.filter(p=>p.human&&!p.disconnected)){p.s=r.course.length*3-1;p.ps=p.s;p.nextCheckpoint=48;p.completedLaps=2;p.v=100;p.yaw=p.velocityYaw=p.turnRate=0;p.x=0;p.rescue=p.stun=p.height=p.vy=p.air=0;p.rampCd=p.invuln=2;}KartOnline.pushState();});
    await wait(A,()=>APP.screen==='kartResults',20000);await wait(B,()=>APP.screen==='kartResults');
    ok('host publishes shared results after all connected humans finish',await B.evaluate(()=>APP.kartRace.racers.filter(p=>p.human&&!p.disconnected).every(p=>p.finish!==null)&&AV.on&&AV.count()>=1));
    await key(A,'Enter');await wait(B,()=>APP.screen==='kartLobby');ok('rematch returns everyone to the same room with AV intact',await B.evaluate(()=>Net.role==='guest'&&AV.on&&APP.screen==='kartLobby'));
    await A.evaluate(()=>KartOnline.leave());await wait(B,()=>APP.screen==='online',18000);ok('host departure returns guests to online browser',await B.evaluate(()=>Net.role==='off'&&!AV.on));
    // Fight room still routes through its original menus.
    await A.evaluate(()=>{KartOnline.browsing=false;Net.host();APP.slots=[{type:'human',dev:'local',cur:0,ready:false,edit:0},{type:'none'},{type:'none'},{type:'none'}];APP.go('modesel');});
    ok('existing fighting rooms retain their original mode flow',await A.evaluate(()=>APP.screen==='modesel'&&Net.lob.game!=='kart'));
    ok('no browser errors',errors.length===0,errors.slice(0,8));
    console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length,errors},null,2));
    if(checks.some(c=>!c.pass))process.exitCode=1;
  }catch(e){console.error(e.stack);console.error('Browser errors',errors);for(const c of browser.contexts())for(const p of c.pages())console.error('Diagnostic',JSON.stringify(await p.evaluate(()=>({screen:APP.screen,on:AV.on,err:AV.err,pcs:[...AV.pcs].map(([p,r])=>[p,r.pc.connectionState]),videos:[...AV.tiles].map(([k,v])=>[k,v.videoWidth,v.readyState,v.paused,v.srcObject?.getTracks().map(t=>[t.kind,t.readyState,t.enabled,t.muted])])})).catch(()=>null)));process.exitCode=1;}
  finally{await browser.close();await new Promise(r=>server.close(r));}
})();
