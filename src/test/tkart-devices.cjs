const {chromium}=require('playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  let passed=0,failed=0;const ok=(name,test,details)=>{test?passed++:failed++;console.log((test?'PASS ':'FAIL ')+name+(details?' '+JSON.stringify(details):''));};
  const errors=[],contexts=[];
  const mk=async(opts={})=>{
    const context=await browser.newContext({viewport:{width:1280,height:720},...opts});contexts.push(context);
    await context.addInitScript(()=>{
      window.__pad={id:'Xbox Wireless Controller',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};
      navigator.getGamepads=()=>[window.__pad,null,null,null];
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.APYV_CONFIG={};'}));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);await page.waitForFunction(()=>Devices.frame>20);return page;
  };
  const btn=async(p,i)=>{let f=await p.evaluate(i=>{__pad.buttons[i]={pressed:true,value:1,touched:true};return Devices.frame;},i);await p.waitForFunction(f=>Devices.frame>f+4,f);f=await p.evaluate(i=>{__pad.buttons[i]={pressed:false,value:0,touched:false};return Devices.frame;},i);await p.waitForFunction(f=>Devices.frame>f+3,f);};
  try{
    const p=await mk();await btn(p,0);await btn(p,15);await btn(p,0);ok('gamepad navigates hub to garage',await p.evaluate(()=>APP.screen==='kartGarage'));
    const cc=await p.evaluate(()=>KartMenu.cc);await btn(p,2);ok('X changes engine class',await p.evaluate(cc=>KartMenu.cc===(cc+1)%3,cc));
    await btn(p,6);ok('LT toggles steering assistance',await p.evaluate(()=>KartMenu.assist));
    await btn(p,0);await btn(p,0);ok('A enters race without immediately pausing',await p.evaluate(()=>APP.screen==='kartRace'&&!APP.kartRace.paused));
    await p.evaluate(()=>{APP.kartRace.phase='race';__pad.buttons[7]={pressed:true,value:1,touched:true};});await p.waitForTimeout(700);
    ok('RT accelerates',await p.evaluate(()=>APP.kartRace.player.v>15));
    const sx=await p.evaluate(()=>APP.kartRace.player.x);await p.evaluate(()=>__pad.axes[0]=-.8);await p.waitForTimeout(350);await p.evaluate(()=>__pad.axes[0]=0);
    ok('analog steering responds',await p.evaluate(x=>APP.kartRace.player.x<x-.04,sx));
    await p.evaluate(()=>APP.kartRace.player.item='shield');await btn(p,4);ok('LB uses held item once',await p.evaluate(()=>APP.kartRace.player.item===null&&APP.kartRace.player.shield>5));
    await p.keyboard.down('KeyM');await p.waitForTimeout(100);await p.keyboard.up('KeyM');await p.waitForTimeout(100);ok('M silences music while preserving effects',await p.evaluate(()=>!Audio8.musicOn&&!Audio8.muted));
    await p.keyboard.down('KeyM');await p.waitForTimeout(100);await p.keyboard.up('KeyM');await p.waitForTimeout(100);ok('M restores the new soundtrack',await p.evaluate(()=>Audio8.musicOn&&KartMusic.mood!==null));
    await btn(p,9);ok('Menu button pauses',await p.evaluate(()=>APP.kartRace.paused));
    const music=await p.evaluate(()=>Audio8.musicOn);await btn(p,2);ok('X in pause controls music',await p.evaluate(m=>Audio8.musicOn!==m,music));await btn(p,2);
    await btn(p,9);ok('Menu button resumes',await p.evaluate(()=>!APP.kartRace.paused));
    await p.evaluate(()=>window.dispatchEvent(new Event('blur')));ok('loss of focus pauses and releases engine sound',await p.evaluate(()=>APP.kartRace.paused&&!KartSound.node));
    // Cup identity, cumulative score, independent personal records and final standings.
    const cup=await p.evaluate(()=>{
      KartMenu.cup=true;KartMenu.char=1;KartMenu.cc=1;KartMenu.assist=false;KartMenu.begin();const ids=KartMenu.cupState.ids.slice();
      for(let round=0;round<3;round++){
        const race=APP.kartRace;race.player.finish=300-round*10;race.player.lapTimes=[100,100,100-round*10];race.order=race.racers.slice();race.saveBest();KartMenu.record();KartMenu.record();
        if(round<2){KartMenu.track=KartMenu.cupState.round;KartMenu.start();}
      }
      APP.go('kartResults');APP.draw();const saved=JSON.parse(localStorage.getItem(APP.kartRace.bestKey()));
      return {round:KartMenu.cupState.round,scores:KartMenu.cupState.scores,ids,same:JSON.stringify(APP.kartRace.racers.map(r=>r.id))===JSON.stringify(ids),saved,separate:APP.kartRace.bestKey().endsWith(':manual')};
    });ok('cup keeps the same eight drivers',cup.same);ok('three results counted once each',cup.round===3&&cup.scores[cup.ids[0]]===45&&Object.values(cup.scores).reduce((a,b)=>a+b,0)===174,cup.scores);
    if(process.env.KART_SHOTS)await p.screenshot({path:path.join(process.env.KART_SHOTS,'cup.png')});
    ok('personal best stored with assistance category',cup.saved.time===280&&cup.separate);
    await p.evaluate(()=>{APP.kartRace.player.finish=320;APP.kartRace.saveBest();});ok('slower finish does not replace record',await p.evaluate(()=>JSON.parse(localStorage.getItem(APP.kartRace.bestKey())).time===280));
    const touch=await mk({viewport:{width:1024,height:576},hasTouch:true,isMobile:true});
    await touch.evaluate(()=>{KartMenu.enter();KartMenu.char=3;KartMenu.track=0;KartMenu.start();APP.kartRace.phase='race';});
    await touch.touchscreen.tap(490,250);await touch.waitForTimeout(100);
    const labels=await touch.evaluate(()=>{TouchPad.measure();return TouchPad.L.btns.map(b=>b.label);});ok('race uses purpose-built touch labels',labels.join(',')==='GAS,FRENO,DERRAPE,ÍTEM,ATRÁS',labels);
    const cdp=await touch.context().newCDPSession(touch);
    const pts=await touch.evaluate(()=>{const L=TouchPad.L,b=L.btns.find(b=>b.a==='attack');return [{x:Math.round(L.home.x),y:Math.round(L.home.y),id:1},{x:Math.round(b.x),y:Math.round(b.y),id:2}];});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts});await touch.waitForTimeout(650);
    const beforeX=await touch.evaluate(()=>APP.kartRace.player.x);pts[0].x+=48;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts});await touch.waitForTimeout(300);
    ok('two simultaneous fingers accelerate and steer',await touch.evaluate(x=>APP.kartRace.player.v>15&&APP.kartRace.player.x>x+.05,beforeX));
    if(process.env.KART_SHOTS)await touch.screenshot({path:path.join(process.env.KART_SHOTS,'touch.png')});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForTimeout(100);ok('lifting fingers releases all touch controls',await touch.evaluate(()=>TouchPad.held.size===0&&TouchPad.stick===null));
    const musicTouch=await touch.evaluate(()=>{APP.kartRace.paused=true;return Audio8.musicOn;});await touch.touchscreen.tap(512,536);await touch.waitForTimeout(140);ok('touch pause has a working music button',await touch.evaluate(m=>Audio8.musicOn!==m,musicTouch));
    await touch.evaluate(()=>{APP.kartRace.stop();APP.go('controls');});ok('fighting touch labels restored',await touch.evaluate(()=>TouchPad.L.btns[0].label==='A'&&TouchPad.L.btns[2].label==='Saltar'));
    const xbox=await mk({viewport:{width:1920,height:1080},deviceScaleFactor:2,userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox Series S) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0'});
    await xbox.evaluate(()=>{KartMenu.enter();KartMenu.track=2;KartMenu.start();});ok('Xbox keeps render surface at 720p or below',await xbox.evaluate(()=>canvas.width<=1280&&canvas.height<=720&&IS_XBOX&&ART.lite));
    const perf=await xbox.evaluate(async()=>{const frames=[];let last=performance.now();for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();frames.push(now-last);last=now;}frames.sort((a,b)=>a-b);return {median:frames[60],p95:frames[114]};});
    ok('Xbox profile animation remains responsive in browser',perf.median<35&&perf.p95<80,perf);
    ok('no browser errors',errors.length===0,errors);console.log(JSON.stringify({passed,total:passed+failed}));if(failed)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});





