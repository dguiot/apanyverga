// Estilo compartido (tinta, cel, cielo), cámara al hombro, arenas del mismo mundo, números de daño,
// la banda y Esmash Total de punta a punta (carrera → combate → gran final).
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const p=await b.newPage({viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.addInitScript(()=>{requestAnimationFrame=()=>0;navigator.getGamepads=()=>[];try{localStorage.removeItem('esmash-fps-cam');}catch(e){}});await p.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.APYV_CONFIG={};'}));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 const checks=await p.evaluate(()=>{
  const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details});Audio8.sfx=()=>{};Rumble.play=()=>{};
  const count=(root,test)=>{let n=0;root.traverse(o=>{if(test(o))n++;});return n;};
  // ---------- estilo ----------
  const kart=KartModels.kart('daniel',0);let toon=0,ink=0,plain=0;kart.traverse(o=>{if(o.userData.esInk)ink++;else if(o.isMesh&&o.material?.userData?.esToon)toon++;else if(o.isMesh)plain++;});
  ok('kart pilots use the cel material and the vehicle keeps its paint',toon>8&&plain>4,{toon,plain});
  ok('karts carry an ink outline on every opaque part',ink>10&&kart.userData.esInked,{ink});
  const fighter=FPSGear.character('torito');ok('FPS characters are inked and cel shaded like the fighters',count(fighter,o=>o.userData.esInk)>10&&count(fighter,o=>o.isMesh&&o.material?.userData?.esToon)>10);
  ok('FPS characters no longer wear a tactical plate carrier',![...KartModels.materials.keys()].some(k=>k.startsWith('fps-tactical:')));
  ok('ink can be switched off for low budgets',(()=>{Style3D.inkBudget(false);const off=[...KartModels.materials].filter(([k])=>k.startsWith('esmash-ink:')).every(([,m])=>!m.visible);Style3D.inkBudget(true);return off&&[...KartModels.materials].filter(([k])=>k.startsWith('esmash-ink:')).every(([,m])=>m.visible);})());
  const sh={uniforms:{},fragmentShader:'#include <common>\n#include <color_fragment>\n#include <lights_physical_pars_fragment>\n#include <opaque_fragment>'};Style3D.inject(sh,Style3D.toon('#ff0000'));
  ok('the shared shader adds rim light, vivid colour and one-step shadows',sh.uniforms.esRim&&sh.fragmentShader.includes('RE_Direct_Esmash')&&sh.fragmentShader.includes('esSky'));
  ok('three sky moods share one painted sky',['day','sunset','night'].every(t=>Style3D.THEMES[t])&&Style3D.themeOf({theme:'canyon'})==='sunset'&&Style3D.themeOf({theme:'neon'})==='night');
  const parts=[];Style3D.tree((type,color,pos)=>parts.push({type,color,pos}),0,0,0,10,srand(3));ok('block trees are built from one shared function',parts.length>=4&&parts.every(q=>q.pos.every(Number.isFinite)));
  ok('each gun has its own toy colours',new Set(FPSWeaponArt.SKINS.map(s=>s.black)).size===5&&FPSWeaponArt.skin(2).black.color.getHexString()==='2bb5a0');
  // ---------- cámara al hombro ----------
  FPSMenu.char=5;FPSMenu.count=1;FPSMenu.start();let m=APP.fps,me=m.player;m.players.forEach(q=>{if(q!==me){q.x=200;q.z=200;q.y=FPSWorld.height(200,200);}});
  me.x=0;me.z=6;me.y=FPSWorld.height(0,6);me.yaw=0;me.pitch=0;me.prev=null;GameFeel.frame(16.7);render();
  let view=FPSView.views.get(0),cam=view.camera,T=KartGL;
  ok('the default camera sits behind the right shoulder',FPSCam.third&&view.third&&cam.position.z>me.z+1.5&&cam.position.x>me.x+.3&&cam.position.y>me.y+FPSBody.eye,{x:cam.position.x-me.x,z:cam.position.z-me.z});
  ok('your own character is drawn in third person',FPSView.models[0].visible);
  const eye=new T.Vector3(me.x,me.y+FPSBody.eye,me.z),aim=eye.clone().add(new T.Vector3(0,0,-1).multiplyScalar(view.tpAim)),fwd=new T.Vector3(0,0,-1).applyQuaternion(cam.quaternion),to=aim.clone().sub(cam.position).normalize();
  ok('the crosshair converges on the point the bullet reaches',fwd.dot(to)>.9999,{dot:fwd.dot(to)});
  const open=view.tpDist;FPSWorld.solids.push({x:0,z:me.z+1.4,w:6,d:.4,h:5,y:me.y-1,type:'stone'});view.tpDist=null;render();const near=view.tpDist;FPSWorld.solids.pop();
  ok('a wall behind the player pulls the camera in',near<open-1&&near>.2,{open,near});
  me.gun=4;me.ads=1;render();ok('the scoped sniper switches to first person',!view.third&&!FPSView.models[0].visible||!view.third);me.gun=2;me.ads=0;
  FPSCam.toggle();render();ok('V toggles first person and the choice is stored',!FPSCam.third&&!view.third&&localStorage.getItem('esmash-fps-cam')==='first');FPSCam.toggle();
  // ---------- números de daño y recogidas ----------
  const foe=m.players[1];foe.x=me.x;foe.z=me.z-8;foe.y=me.y;foe.invuln=0;foe.shield=0;FPSPop.scan(m);m.damage(me,foe,30,{head:true});FPSPop.scan(m);
  ok('a hit pops a damage number over the target',FPSPop.list.length===1&&Math.round(FPSPop.list[0].value)===30&&FPSPop.list[0].kind==='head');
  m.damage(me,foe,20);FPSPop.scan(m);ok('repeated hits add up in the same number',FPSPop.list.length===1&&Math.round(FPSPop.list[0].value)===50);
  ok('pickups float under a light beam',FPSView.pickupModels.every(q=>q.userData.beam&&q.userData.baseY!==undefined));
  FPSMenu.exit();
  // ---------- arenas del mismo mundo ----------
  ok('two arenas are set in the kart and FPS worlds',STAGE_INFO.some(s=>s.id==='mercado')&&STAGE_INFO.some(s=>s.id==='sierra')&&STAGE_INFO.length===10);
  const varied=cv=>{if(!cv)return false;const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,seen=new Set(),hop=4*Math.max(1,Math.floor(d.length/4/3000)|1);for(let i=0;i<d.length;i+=hop)seen.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4));return seen.size>12;};
  const shotM=WorldShots.get('mercado'),shotS=WorldShots.get('sierra');
  ok('arena backdrops are photographs of the real 3D worlds',shotM?.width===1920&&shotS?.width===1920&&varied(shotM)&&varied(shotS));
  ok('taking the photographs leaves no race or match behind',!Kart3D.scene&&!FPSView.scene&&!APP.kartRace&&!APP.fps);
  ok('crossing karts are sprites of the real kart models',varied(WorldShots.kartSide('torito',1)));
  const cv=mkCanvas(320,180),c=cv.getContext('2d');c.scale(.25,.25);WorldShots.paint(c,{x:0,y:0},'sierra');ok('a painted fallback exists without WebGL',varied(cv));
  const fight=stage=>{APP.startBattle({players:[{port:0,char:'daniel',dev:'kb1'},{port:1,char:'torito',cpu:5}],stage,rules:{mode:'stock',stocks:3,items:0}});const B=APP.battle;B.phase='fight';for(const f of B.fighters){f.brain=null;f.invuln=0;}return B;};
  const ground=(B,f,x)=>{const s=B.stage.solids[0];f.x=x;f.y=s.y;f.vx=f.vy=0;f.grounded=true;f.surface=s;f.state='idle';};
  let B=fight('mercado');ground(B,B.fighters[0],0);const awning=B.stage.plats[0];Object.assign(B.fighters[1],{x:awning.x+awning.w/2,y:awning.y,grounded:true,surface:awning,state:'idle',vx:0,vy:0});
  B.stage.nextKarts=1;let hit=false,safe=true;for(let i=0;i<260;i++){ground(B,B.fighters[0],0);Object.assign(B.fighters[1],{x:awning.x+awning.w/2,y:awning.y,grounded:true,surface:awning,vx:0,vy:0});B.stage.update();if(B.fighters[0].percent>0)hit=true;if(B.fighters[1].percent>0)safe=false;}
  ok('karts run over a fighter standing on the street',hit,{percent:B.fighters[0].percent});ok('the awnings are a refuge from the karts',safe);
  B=fight('sierra');B.stage.nextNades=1;const before=B.projectiles.length;B.stage.update();const after=B.projectiles.length;
  ok('grenades fall on the Sierra arena',after-before===3,{before,after});BATTLE=null;APP.battle=null;
  // ---------- la banda ----------
  ok('every composition has a style and the band graph has a room and a compressor',Object.keys(STAGE_SCORE).every(id=>Band.STYLE[id])&&Object.keys(STAGE_SCORE).length===14);
  const race=new KartRace(KART_TRACKS[0],'daniel',1,false,5);APP.kartRace=race;APP.screen='kartRace';race.player.completedLaps=2;for(let i=0;i<200;i++)KartMusic.direct();
  ok('the last lap speeds the music up and raises the intensity',KartMusic.tempo>1.05&&KartMusic.heat>.95,{tempo:KartMusic.tempo,heat:KartMusic.heat});
  race.player.completedLaps=0;for(let i=0;i<200;i++)KartMusic.direct();ok('earlier laps play at the written tempo',KartMusic.tempo===1&&KartMusic.heat<.8);APP.kartRace=null;APP.screen='title';
  ok('chord helpers keep harmonies inside the chord',Band.snap(61,[60,64,67])===60&&[60,64,67].includes(Band.below(72,[60,64,67])%12+60));
  // ---------- Esmash Total ----------
  ShellUI.begin(false);ok('the hub offers Esmash Total as a fourth game',ShellUI.games.length===4&&ShellUI.cards().length===4&&ShellUI.cards()[3].x+ShellUI.cards()[3].w<=1240);
  ShellUI.config.locals=1;ShellUI.choose('total');
  ok('Total gathers four different characters',Total.active&&APP.screen==='totalNext'&&new Set(Total.ids).size===4&&Total.ids[0]===CHAR_ORDER[ShellUI.locals[0].ch]);
  ok('the Total screen draws without errors',(()=>{try{Total.draw();return true;}catch(e){return e.message;}})()===true);
  Total.start();let r=APP.kartRace;
  ok('round one is a race on Mercado del Sol with the four rivals on the grid',APP.screen==='kartRace'&&r.course.info.id==='mercado'&&r.racers.slice(0,4).map(q=>q.id).join()===Total.ids.join()&&r.racers.length===8&&r.racers[0].human&&!r.racers[1].human);
  r.racers.forEach((q,i)=>{q.finish=[52,50,61,58][i]??70+i;});APP.go('kartResults');
  ok('race placings become points and Total moves on',APP.screen==='totalNext'&&Total.round===1&&Total.points.join()==='7,10,3,5'&&!APP.kartRace,{points:Total.points});
  Total.start();m=APP.fps;
  ok('round two is the FPS to eight kills in three minutes',APP.screen==='fpsGame'&&m.target===8&&m.duration===180&&m.players.map(q=>q.id).join()===Total.ids.join());
  ok('the race podium carries kills and grenades into combat',m.players.map(q=>q.kills).join()==='1,2,0,0'&&m.players.map(q=>q.grenades).join()==='2,3,1,1');
  m.players[0].kills=8;m.players[3].kills=5;m.players[1].kills=3;m.players[2].kills=1;APP.go('fpsResults');
  ok('combat placings are added to the table',Total.round===2&&Total.points.join()==='17,15,6,12'&&!APP.fps,{points:Total.points});
  Total.start();ok('the final is announced on the versus screen',APP.screen==='vs'&&APP.pendingSetup.total&&APP.pendingSetup.stage==='mercado');
  APP.startBattle(APP.pendingSetup);B=APP.battle;const byPort=i=>B.fighters.find(f=>f.port===i);
  ok('the table decides lives and the leader arrives with the final smash',[0,1,2,3].map(i=>byPort(i).stocks).join()==='3,3,2,2'&&byPort(0).finalReady&&!byPort(1).finalReady,{stocks:[0,1,2,3].map(i=>byPort(i).stocks)});
  ok('the final mixes the kart and grenade hazards',B.stage.id==='mercado'&&B.stage.totalMix===true);
  APP.showResults({ranked:[{port:3},{port:0},{port:1},{port:2}]});
  ok('the final is worth double and crowns a champion',Total.done&&Total.points.join()==='31,25,12,32'&&Total.ranks().order[0]===3&&APP.screen==='totalNext'&&!APP.battle,{points:Total.points});
  ok('the champion screen draws without errors',(()=>{try{Total.draw();return true;}catch(e){return e.message;}})()===true);
  ok('Total has its own theme between rounds',KartMusic.mood==='total');
  ShellUI.room();ok('leaving to the hub ends Total',!Total.active&&APP.screen==='uiHub');
  APP.kartRace=new KartRace(KART_TRACKS[0],'daniel',1,false,5);APP.go('kartResults');ok('normal races still reach their own results',APP.screen==='kartResults');APP.kartRace.stop();APP.kartRace=null;
  ShellUI.online=true;Total.enter();ok('Total does not start inside an online room',!Total.active);ShellUI.online=false;
  return out;
 });
 for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.details?' '+JSON.stringify(c.details):''));console.log((errors.length?'FAIL ':'PASS ')+'no browser errors '+JSON.stringify(errors.slice(0,4)));
 console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length+!errors.length,total:checks.length+1}));if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
