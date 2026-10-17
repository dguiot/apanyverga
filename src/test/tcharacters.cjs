const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),errors=[];try{
 const p=await b.newPage({viewport:{width:1280,height:720}});p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.addInitScript(()=>requestAnimationFrame=()=>0);await p.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 const checks=await p.evaluate(()=>{const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details});
  ok('Esmash keeps its original animated Canvas renderer',typeof CharacterStudio==='undefined'&&typeof drawToonHead==='function'&&typeof drawCreatureHead==='function');
  ok('there is exactly one immutable design per playable ID',CHAR_ORDER.length===15&&CHAR_ORDER.every(id=>LOOKS[id]===CharacterDesign.get(id)&&Object.isFrozen(LOOKS[id])));
  ok('no photographic face data or loaders exist',typeof FACE_DATA==='undefined'&&typeof FACE_IMG==='undefined'&&typeof loadFaces==='undefined');
  const cv=document.createElement('canvas');cv.width=320;cv.height=330;const c=cv.getContext('2d');let drawn=0;
  for(const id of CHAR_ORDER){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,320,330);c.translate(160,270);drawCharacter(c,id,mkPose(POSES.jump));let count=0;for(const a of c.getImageData(0,0,320,330).data.filter((_,i)=>i%4===3))if(a>80)count++;if(count>600)drawn++;
   const art=CharacterArt.drawing(id),torso=CharacterArt.drawing(id,'torso'),kart=KartModels.kart(id,0),fps=FPSView.character(id),k=kart.userData.head,f=fps.userData.head;
   ok(id+' uses the actual Esmash face and costume drawing in both 3D modes',art.source===drawHead&&torso.source===drawTorso&&k.userData.front.material===f.userData.front.material&&k.userData.front.material.map===art.texture&&kart.userData.design===fps.userData.design&&fps.userData.design===LOOKS[id]);
   const normal=k.userData.front.geometry.attributes.normal.array;ok(id+' face stays on a front surface, not a camera-facing billboard',k.userData.front.isMesh&&k.userData.front.material.side===0&&Array.from(normal).filter((_,i)=>i%3===2).every(z=>z>.1));
   let finite=true;for(const model of [kart,fps]){model.updateMatrixWorld(true);model.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))finite=false;if(o.geometry&&!Array.from(o.geometry.attributes.position.array).every(Number.isFinite))finite=false;});}
   ok(id+' has valid seated and standing geometry',finite);
   CharacterModels.expression(k,'hurt');ok(id+' expressions reuse the Esmash hurt face',k.userData.front.material===CharacterArt.drawing(id,'head','hurt').material);
   const gun=FPSView.weapon(0,id),hands=gun.children.filter(o=>o.name.includes('fps-')&&o.name.endsWith('-hand'));ok(id+' first-person hands share the selected identity',hands.length===2&&hands.every(h=>h.userData.design===LOOKS[id]));
   for(const m of [kart,fps,gun])m.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  }
  ok('all 15 original fighters remain visibly drawn',drawn===15,{drawn});
  const before=CharacterArt.cache.size;for(let i=0;i<30;i++)CharacterArt.drawing('daniel');ok('shared art is cached rather than regenerated per frame',CharacterArt.cache.size===before);
  ok('visible FPS name is simply FPS',ShellUI.games.find(g=>g.id==='fps').name==='FPS'&&ShellUI.stages.call({...ShellUI,game:'fps'})[0].name==='FPS');return out;
 });
 const html=fs.readFileSync(path.resolve(__dirname,'../../index.html'),'utf8');checks.push({name:'release contains neither photos nor an Esmash 3D replacement',pass:!html.includes('FACE_DATA')&&!html.includes('character-studio.js')});checks.push({name:'no browser errors',pass:errors.length===0,details:errors});checks.forEach(c=>console.log((c.pass?'PASS ':'FAIL ')+c.name+' '+JSON.stringify(c.details)));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
