// Regression for a black track behind a working HUD on an opaque PC canvas.
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[],checks=[],ok=(name,pass,details)=>{checks.push(!!pass);console.log((pass?'PASS ':'FAIL ')+name+(details?' '+JSON.stringify(details):''));};
 try{
  const p=await b.newPage({viewport:{width:1280,height:720}});p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('CONTEXT_LOST_WEBGL'))errors.push(m.text());});
  await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,this.id==='game'&&type==='2d'?{...options,alpha:false}:options);};});
  await p.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.APYV_CONFIG={};'}));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
  await p.addStyleTag({content:'#game{background:#000!important}'});
  ok('regression uses an opaque visible canvas',await p.evaluate(()=>ctx.getContextAttributes().alpha===false));
  const pixels=()=>p.evaluate(()=>{let colorful=0,alpha=0;const samples=[];for(let y=.36;y<.68;y+=.08)for(let x=.25;x<.75;x+=.1){const d=ctx.getImageData(Math.floor(canvas.width*x),Math.floor(canvas.height*y),1,1).data;samples.push([...d]);if(Math.max(...d.slice(0,3))-Math.min(...d.slice(0,3))>5&&d[0]+d[1]+d[2]>70)colorful++;if(d[3]===255)alpha++;}return {colorful,alpha,samples};});
  for(let track=0;track<3;track++){
   await p.evaluate(track=>{KartMenu.track=track;KartMenu.start();APP.kartRace.phase='race';},track);await p.waitForFunction(()=>Kart3D.race===APP.kartRace);await p.waitForTimeout(200);
   const image=await pixels();ok('track '+track+' is actually drawn into the visible canvas',image.colorful>=10&&image.alpha>=20,image);
  }
  ok('there is no second visible canvas that can be hidden behind the HUD',await p.evaluate(()=>getComputedStyle(Kart3D.renderer.domElement).display==='none'));
  await p.setViewportSize({width:1600,height:900});await p.waitForTimeout(160);ok('track stays visible after a window resize',(await pixels()).colorful>=10);
  await p.evaluate(()=>{APP.kartRace.paused=true;});await p.waitForTimeout(100);await p.evaluate(()=>{APP.kartRace.paused=false;});await p.waitForTimeout(100);ok('track stays visible after pause and resume',(await pixels()).colorful>=10);
  await p.evaluate(()=>{Kart3D.thumbnail('michi',4);render();});ok('garage thumbnail rendering cannot replace the visible race',(await pixels()).colorful>=10);
  await p.evaluate(()=>{const r=APP.kartRace;r.online=true;r.racers.slice(0,4).forEach(q=>q.human=true);r.player=r.racers[3];APP.update=()=>{};render();});
  ok('four online humans still produce exactly one full-screen viewport',await p.evaluate(()=>Kart3D.lastViewports.length===1&&Kart3D.lastViewports[0].w===W&&Kart3D.lastViewports[0].h===H));
  ok('online camera follows the assigned local racer',await p.evaluate(()=>{const r=APP.kartRace.player,v=KartMotion.view(r,1),w=APP.kartRace.course.world(v.s,v.x),q=APP.kartRace.course.sample(v.s);return (Kart3D.camera.position.x-w.x)*q.tx+(Kart3D.camera.position.z-w.z)*q.tz<0;}));
  ok('online race also has real world pixels behind the HUD',(await pixels()).colorful>=10);
  await p.evaluate(()=>{const r=APP.kartRace;r.online=false;r.localPlayers=r.racers.slice(0,2);render();});ok('split screen is reserved for local participants',await p.evaluate(()=>Kart3D.lastViewports.length===2));
  await p.evaluate(()=>{const r=APP.kartRace;delete r.localPlayers;r.player=r.racers[0];render();window.__loss=Kart3D.renderer.getContext().getExtension('WEBGL_lose_context');__loss.loseContext();});
  await p.waitForFunction(()=>Kart3D.contextLost);ok('context loss pauses local racing and shows recovery state',await p.evaluate(()=>APP.kartRace.paused));await p.waitForTimeout(150);await p.evaluate(()=>__loss.restoreContext());await p.waitForFunction(()=>!Kart3D.contextLost);await p.evaluate(()=>render());await p.waitForTimeout(150);
  ok('GPU context restoration rebuilds a visible track',(await pixels()).colorful>=10&&await p.evaluate(()=>!APP.kartRace.paused));
  await p.screenshot({path:path.resolve(__dirname,'../../work/kart-screen-fixed.png')});
  ok('no browser errors',errors.length===0,errors);console.log(JSON.stringify({passed:checks.filter(Boolean).length,total:checks.length}));if(checks.some(x=>!x)||errors.length)process.exitCode=1;
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
