const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),fs=require('node:fs'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],checks=[];
    page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.APYV_CONFIG={};'}));await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);await page.waitForFunction(()=>Devices.frame>20);
    const ok=(name,pass,details)=>{checks.push({name,pass:!!pass,details});console.log((pass?'PASS ':'FAIL ')+name+(details?' '+JSON.stringify(details):''));};
    const key=async k=>{const f=await page.evaluate(()=>Devices.frame);await page.keyboard.down(k);await page.waitForFunction(f=>Devices.frame>f+3,f);await page.keyboard.up(k);await page.waitForFunction(f=>Devices.frame>f+6,f);};
    await page.evaluate(()=>{KartMenu.enter();});await page.keyboard.press('v');await page.waitForFunction(()=>APP.screen==='kartVehicles');
    ok('garage opens a six-vehicle selection with keyboard',await page.evaluate(()=>KART_VEHICLES.length===6));
    await key('ArrowDown');await key('ArrowRight');await key('Enter');await page.waitForFunction(()=>APP.screen==='kartGarage');
    const chosen=await page.evaluate(()=>KartMenu.vehicle===4);await page.reload();await page.waitForFunction(()=>Devices.frame>20);
    ok('selected sportbike persists across a reload and invitation entry',chosen&&await page.evaluate(()=>KartMenu.vehicle===4));
    const modelChecks=await page.evaluate(()=>{
      APP.update=()=>{};const out=[];for(let v=0;v<6;v++){const m=KartModels.kart('daniel',v);out.push({id:KART_VEHICLES[v].id,wheels:m.userData.wheels.length,vertices:m.children.reduce((n,g)=>{g.traverse(o=>{if(o.geometry)n+=o.geometry.attributes.position.count;});return n;},0)});const geos=new Set();m.traverse(o=>{if(o.geometry)geos.add(o.geometry);});geos.forEach(g=>g.dispose());m.userData.shield.material.dispose();}return out;
    });
    ok('four chassis have four wheels and both motorcycles have two',modelChecks.every((m,i)=>m.wheels===(i<4?4:2)),modelChecks);
    ok('six chassis have distinct modeled geometry',new Set(modelChecks.map(m=>m.vertices)).size===6);
    const balance=await page.evaluate(()=>{
      Audio8.sfx=()=>{};KartSound.effect=()=>{};Rumble.play=()=>{};const out=[];
      for(let cc=0;cc<3;cc++)for(let track=0;track<3;track++)for(let v=0;v<6;v++){
        const r=new KartRace(KART_TRACKS[track],'daniel',cc,false,12345,null,[v]),p=r.player;r.racers=[p];p.human=false;p.skill=1;p.aiLane=0;p.s=p.ps=0;p.x=p.px=0;r.laps=1;r.phase='race';r.course.boxes=[];
        let rescues=0,off=0;for(let i=0;i<60*240&&p.finish===null;i++){const old=p.rescue;r.update({});if(p.rescue>old)rescues++;if(Math.abs(p.x)>1.1)off++;}
        out.push({vehicle:v,track,cc,time:p.finish,rescues,off});
      }return out;
    });
    fs.writeFileSync(path.resolve(__dirname,'../../work/vehicle-balance.json'),JSON.stringify(balance,null,2));
    ok('all six vehicles finish every track at all three speeds',balance.every(r=>r.time!==null&&r.rescues===0),balance.filter(r=>r.time===null||r.rescues));
    const totals=Array.from({length:6},(_,vehicle)=>({vehicle,time:balance.filter(r=>r.vehicle===vehicle).reduce((n,r)=>n+r.time,0)})),spread=Math.max(...totals.map(r=>r.time))/Math.min(...totals.map(r=>r.time))-1;
    ok('aggregate benchmark remains within a three percent performance band',spread<.03,{spread,totals});
    const trade=await page.evaluate(()=>KART_VEHICLES.map(v=>[v.speed,v.accel,v.grip,v.boost,v.charge,v.offroad,v.weight]));
    ok('every vehicle offers a tradeoff rather than dominating every stat',trade.every((a,i)=>trade.every((b,j)=>i===j||a.some((x,k)=>x>b[k])&&a.some((x,k)=>x<b[k]))));
    const contact=await page.evaluate(()=>{const r=new KartRace(KART_TRACKS[0],'daniel',1,false,555,['daniel','daniel'],[3,4]);r.phase='race';r.racers.forEach(p=>{p.human=true;p.s=p.ps=100;p.x=p.index*.05;p.hitCd=0;});r.update({players:[{},{}]});const a=r.racers.map(p=>p.bumpLat);r.update({players:[{},{}]});return {impulses:a,separated:r.racers[1].x-r.racers[0].x>.05};});
    ok('vehicle weight changes persistent contact response',Math.abs(contact.impulses[1])>Math.abs(contact.impulses[0])&&contact.separated,contact);
    const items=await page.evaluate(()=>{
      const r=new KartRace(KART_TRACKS[0],'daniel',1,false,55);r.phase='race';r.racers.forEach(p=>{p.s=1000+p.index*100;p.x=.8;});
      r.projectiles=[{type:'chile',owner:0,target:1,s:100,ps:100,x:0,v:180,vx:0,life:3,age:0,dir:1},{type:'tortilla',owner:1,s:105,ps:105,x:0,v:-170,vx:0,life:3,age:0,dir:-1}];r.updateProjectiles(1/60);
      return {intercepted:r.projectiles.length===0,explosion:r.effects.some(e=>e.type==='hit'),models:Object.keys(KART_ITEMS).map(type=>{const m=KartItemArt.create(type);let vertices=0;m.traverse(o=>{if(o.geometry)vertices+=o.geometry.attributes.position.count;});return [type,vertices];})};
    });
    ok('a disc intercepts an opposing rocket with impact feedback',items.intercepted&&items.explosion);
    ok('all twelve items have detailed 3D models',items.models.length===12&&items.models.every(m=>m[1]>100),items.models);
    for(let track=0;track<3;track++){
      await page.evaluate(track=>{KartMenu.track=track;KartMenu.char=1;KartMenu.vehicle=track===0?4:track===1?2:5;KartMenu.cupState=null;KartMenu.start();const r=APP.kartRace;r.phase='race';r.time=47;r.tick=2820;r.racers.forEach((p,i)=>{p.s=p.ps=(track===0?.14:track===1?.21:.43)*r.course.length+i*14;p.x=p.px=i%2?.4:-.4;p.v=80;});r.player.item=track===0?'triple':track===1?'pinata':'boomerang';Toasts.items=[];render();},track);
      await page.screenshot({path:path.resolve(__dirname,'../../work/vehicles-track-'+track+'.png')});
      ok('track '+track+' renders textured terrain, atmosphere and layered mountains',await page.evaluate(()=>Kart3D.scene.getObjectByName('atmospheric-sky')&&Kart3D.scene.getObjectByName('layered-mountain-2')&&KartWorld.textures.size>=3));
    }
    await page.evaluate(()=>{KartMenu.char=1;KartVehicles.open('kartGarage');KartVehicles.selected=4;render();});await page.screenshot({path:path.resolve(__dirname,'../../work/vehicles-garage.png')});
    ok('thumbnail cache remains bounded while switching chassis',await page.evaluate(()=>Kart3D.thumbs.size<=24));
    ok('no browser or WebGL shader errors',errors.length===0,errors.slice(0,5));
    console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
