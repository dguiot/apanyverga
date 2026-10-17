const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.addInitScript(()=>requestAnimationFrame=()=>0);await page.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
const checks=await page.evaluate(()=>{
 const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details}),m=new FPSMatch([{id:'daniel',gun:4,bot:false}]);APP.fps=m;APP.go('fpsGame');GameFeel.dt=1/60;GameFeel.alpha=1;const p=m.player,buildings=FPSWorld.decor.filter(b=>b.type==='building');
 for(const [i,b]of buildings.entries()){
  for(const side of [-1,1]){
   Object.assign(p,{x:b.x,z:b.z+side*(b.d/2+1.1),y:b.y+.08,vx:0,vz:0,vy:0,grounded:true,stance:0});for(let n=0;n<100;n++)FPSWorld.move(p,0,-side*.05,1/60);
   ok('building '+i+' door '+side+' admits a standing capsule',side*(p.z-b.z)<b.d/2-2,{z:p.z});
  }
  let glass=0,backed=0;for(const wall of b.walls)for(const o of wall.openings.filter(o=>o.type==='window')){
   const point={x:b.x+(wall.axis==='x'?wall.side*(b.w/2+1):o.u),y:b.y+o.y+o.h*.5,z:b.z+(wall.axis==='z'?wall.side*(b.d/2+1):o.u)},direction={x:wall.axis==='x'?-wall.side:0,y:0,z:wall.axis==='z'?-wall.side:0},hit=FPSWorld.wallHit(point,direction,2);
   glass++;if(hit?.surface==='steel'&&hit.distance>.85&&hit.distance<1)backed++;
  }
  ok('building '+i+' windows have recessed ballistic glazing',glass>7&&glass===backed,{glass,backed});
  const st=b.stair;Object.assign(p,{x:st.x,z:st.start-.6,y:FPSWorld.height(st.x,st.start-.6),vx:0,vz:0,vy:0,grounded:true,stance:0});let last=p.y,largestRise=0;for(let n=0;n<500&&p.z<st.end;n++){FPSWorld.move(p,0,.05,1/60);largestRise=Math.max(largestRise,p.y-last);last=p.y;}
  ok('building '+i+' entire stair flight climbs without jumping',p.z>=st.end&&Math.abs(p.y-st.top)<.03&&largestRise<.43,{y:p.y,top:st.top,z:p.z,end:st.end,largestRise});
  for(let n=0;n<110;n++)FPSWorld.move(p,-.05,0,1/60);ok('building '+i+' landing connects to the roof',p.x<b.x+b.w/2-1&&Math.abs(p.y-st.top)<.03,{x:p.x,y:p.y});
 }
 Object.assign(p,{x:0,z:24,y:FPSWorld.height(0,24),yaw:-.48,pitch:.015,ads:0,gun:4,reloading:0,recoil:0});for(let i=0;i<20;i++)FPSView.draw(m);
 const T=KartGL,g=FPSView.guns.get('0:4'),lens=g.getObjectByName('scope-coated-lens-1'),v=FPSView.views.get(0);g.updateMatrixWorld(true);const c=new T.Vector3();lens.getWorldPosition(c);c.project(v.weaponCamera);const sx=Math.round((c.x+1)*640),sy=Math.round((1-c.y)*360),sample=()=>Array.from(ctx.getImageData(sx-3,sy-3,6,6).data);
 const material=new T.MeshBasicMaterial({color:'#ff2929',side:T.DoubleSide});FPSView.scene.overrideMaterial=material;FPSView.draw(m);const red=sample();material.color.set('#2aff31');FPSView.draw(m);const green=sample();FPSView.scene.overrideMaterial=null;material.dispose();const diff=red.reduce((s,v,i)=>s+Math.abs(v-green[i]),0)/red.length;
 ok('hip scope lens hides the background in actual rendered pixels',sx>0&&sx<1280&&sy>0&&sy<600&&diff<1,{sx,sy,diff});ok('lens writes depth with opaque coated glass',lens.material.depthWrite&&!lens.material.transparent);
 p.ads=1;for(let i=0;i<20;i++)FPSView.draw(m);ok('ADS keeps the scoped world view free of weapon glass',!g.visible&&v.camera.fov===20);
 const ground=FPSView.scene.getObjectByName('fps-contoured-terrain'),gp=ground.geometry.attributes.position;let interiorSamples=0,clear=true;for(let n=0;n<gp.count;n++)for(const b of buildings)if(Math.abs(gp.getX(n)-b.x)<b.w/2&&Math.abs(-gp.getY(n)-b.z)<b.d/2){interiorSamples++;if(gp.getZ(n)>b.y-.08)clear=false;}
 ok('terrain sits below every interior floor, preventing grass and z-fighting',interiorSamples>70&&clear,{interiorSamples});
 let badGeometry=false;FPSView.scene.traverse(o=>{if(o.geometry&&!Array.from(o.geometry.attributes.position.array).every(Number.isFinite))badGeometry=true;});ok('architectural meshes have finite vertices',!badGeometry);
 for(const id of CHAR_ORDER){const model=FPSView.weapon(2,id),u=model.userData;model.updateMatrixWorld(true);let finite=true;model.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))finite=false;});ok(id+' has two finite hand rigs with four fingers each',finite&&[u.leftHand,u.rightHand].every(h=>h.userData.fingers.length===4&&h.userData.design===CharacterDesign.get(id)));FPSView.release(model);}
 FPSView.dispose();return out;
});checks.push({name:'no browser errors',pass:!errors.length,details:errors});for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+' '+JSON.stringify(c.details));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
