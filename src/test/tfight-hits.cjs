// Golpes que se ven y se registran: armas a quemarropa, el filo y el bate pegan donde se dibujan,
// lo que se ve tocando al final del cuadro pega aunque los dos se muevan, nada atraviesa a nadie entre
// cuadros, cada tipo de golpe tiene su efecto y todo sigue siendo determinista para el online.
const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 const p=await b.newPage({viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.addInitScript(()=>{requestAnimationFrame=()=>0;navigator.getGamepads=()=>[];});await p.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 const checks=await p.evaluate(()=>{
  const out=[],ok=(name,pass,details)=>out.push({name,pass:!!pass,details});Audio8.sfx=()=>{};Rumble.play=()=>{};
  // pelea de dos con el blanco congelado (sin física ni defensa) para medir solo la detección
  const duel=(char='daniel',x=60)=>{APP.startBattle({players:[{port:0,char,dev:'kb1'},{port:1,char:'torito',dev:'kb2'}],stage:'temple',rules:{mode:'stock',stocks:3,items:0}});const B=APP.battle;B.phase='fight';B.t=400;const [a,t]=B.fighters;a.brain=t.brain=null;
   for(const f of [a,t]){f.state='idle';f.vx=f.vy=0;f.invuln=0;}a.x=0;a.face=1;t.x=x;t.face=-1;t.update=function(){this.sweepX=this.x;this.sweepY=this.y;};return {B,a,t};};
  const give=(f,type)=>{f.item={type,ammo:14,holder:f,t:0,hp:30};};
  const run=(B,t,n)=>{const p0=t.percent;for(let i=0;i<n&&t.percent===p0;i++)B.advance();return t.percent>p0;};
  // 1. pistola y objetos lanzados a quemarropa: el disparo sale de la mano, no de un punto ya pasado el rival
  const close=[12,20,28].map(d=>{const {B,a,t}=duel('daniel',d);give(a,'gun');a.startMove('gun');return run(B,t,40);});
  ok('a ray-gun shot fired point-blank hits the opponent in front',close.every(Boolean),{close});
  const behind=(()=>{const {B,a,t}=duel('daniel',-60);give(a,'gun');a.startMove('gun');return run(B,t,40);})();
  ok('point-blank shots still never hit someone standing behind the shooter',!behind);
  const thrown=[14,26].map(d=>{const {B,a,t}=duel('daniel',d);give(a,'bomb');a.startMove('itemThrow');return run(B,t,40);});
  ok('an item thrown at an opponent standing right in front connects',thrown.every(Boolean),{thrown});
  // 2. bate y espada: el golpe sigue al arma dibujada (de la empuñadura a la punta) en cada cuadro activo
  const blade=type=>{const {B,a}=duel('daniel',600);give(a,type);a.startMove(type);const h=a.move.def.hits[0],s=a.size(),segs=[];
   for(let i=0;i<60&&a.move;i++){B.advance();if(a.move&&a.move.f>=h.f0&&a.move.f<=h.f1)segs.push({f:a.move.f,seg:a.bladeSegment(),circle:[a.x+a.face*h.x*s,a.y+h.y*s,h.r*s]});}
   // el cuadro activo donde la punta queda más lejos del círculo fijo de antes
   const far=segs.map(q=>({...q,gap:Math.hypot(q.seg[2]-q.circle[0],q.seg[3]-q.circle[1])-q.circle[2]})).sort((x,y)=>y.gap-x.gap)[0];
   const r2=duel('daniel',0);give(r2.a,type);r2.a.startMove(type);const tt=r2.t;tt.grounded=false;tt.state='air';
   const hb=tt.hurtbox(),cx=far.seg[2],cy=far.seg[3],place=()=>{tt.x=cx+(cx>r2.a.x?18:-18);tt.y=cy+hb.h*0.5;tt.sweepX=tt.x;tt.sweepY=tt.y;};place();
   const box=tt.hurtbox(),[ox,oy,orr]=far.circle,outside=!circleRect(ox,oy,orr,box.x,box.y,box.w,box.h);
   const p0=tt.percent;for(let i=0;i<60&&r2.a.move&&tt.percent===p0;i++){r2.B.advance();place();}
   return {frame:far.f,gap:Math.round(far.gap),outside,hit:tt.percent>p0,frames:segs.length};};
  const sword=blade('sword'),bat=blade('bat');
  ok('the sword tip hits where it is drawn, beyond the old fixed circle',sword.outside&&sword.gap>8&&sword.hit,sword);
  ok('the bat barrel hits where it is drawn, beyond the old fixed circle',bat.outside&&bat.gap>8&&bat.hit,bat);
  const whiff=(()=>{const {B,a,t}=duel('daniel',-90);give(a,'sword');a.startMove('sword');return run(B,t,40);})();
  ok('a forward sword swing still misses an opponent well behind',!whiff);
  // 3. lo que se ve es lo que pega: si al final de un cuadro la caja activa toca al rival, ese cuadro le pegó
  let seen=0;const missed=[];
  for(const key of ['jab1','ftilt','dtilt','fsmash','dash','nair','bair','uair'])for(const v of [-6,-12,6])for(let d=40;d<=170;d+=13){
   const {B,a,t}=duel('daniel',d);if(/air$/.test(key)){a.y-=70;a.grounded=false;a.state='air';t.y-=70;t.grounded=false;}
   t.update=function(){this.sweepX=this.x;this.sweepY=this.y;this.x+=v;};a.startMove(key);const def=a.move.def,s=a.size(),p0=t.percent;
   for(let i=0;i<def.dur+5;i++){B.advance();const m=a.move;if(!m||m.def!==def||t.percent>p0)break;
    const hb=t.hurtbox(),touching=def.hits.some(h=>m.f>=h.f0&&m.f<=h.f1&&circleRect(a.x+a.face*h.x*s,a.y+h.y*s,h.r*s,hb.x,hb.y,hb.w,hb.h));
    if(touching){seen++;if(t.percent===p0)missed.push([key,d,v,m.f]);break;}}}
  ok('an active hitbox drawn touching a moving opponent at the end of a frame always registers',seen>40&&missed.length===0,{seen,missed:missed.slice(0,6)});
  // 4. sin atravesar: un rival muy rápido que cruza una caja activa entre dos cuadros recibe el golpe
  const tunnel=[30,45,60].map(v=>{const {B,a,t}=duel('daniel',400);t.update=function(){this.sweepX=this.x;this.sweepY=this.y;this.x-=v;};a.startMove('fsmash');const h=a.move.def.hits[0];
   for(let i=0;i<120&&a.move;i++){if(a.move.f===h.f0-1){const s=a.size(),cx=a.x+a.face*h.x*s;t.x=cx+h.r*s+20*t.size()+v*0.6;}B.advance();if(t.percent>0)return true;}return false;});
  ok('a fast opponent cannot pass through an active hitbox between frames',tunnel.every(Boolean),{tunnel});
  // 5. cada golpe se ve distinto: puño, patada, filo, contundente, disparo y meteoro
  const kindOf=(key,item)=>{const {B,a,t}=duel('daniel',key==='gun'?40:50);if(item)give(a,item);if(key==='dair'){a.y-=120;a.grounded=false;a.state='air';t.y-=60;t.grounded=false;t.state='air';}
   B.fx.length=0;a.startMove(key);const p0=t.percent;for(let i=0;i<60&&t.percent===p0;i++){if(key==='dair')t.x=a.x;B.advance();}const fx=B.fx.find(f=>f.type==='strike'&&f.kind!=='focus');
   return {kind:fx&&fx.kind,limb:animFor(a,{key,def:a.moves[key]}).limb,hit:t.percent>p0};};
  const jab=kindOf('jab1'),ftilt=kindOf('ftilt'),slash=kindOf('sword','sword'),bonk=kindOf('bat','bat'),shot=kindOf('gun','gun'),dair=kindOf('dair');
  const feet=l=>['footF','footB','feet','tail'].includes(l);
  ok('punches, kicks, blades, blunt weapons, shots and meteors each get their own hit effect',jab.kind===(feet(jab.limb)?'kick':'pow')&&ftilt.kind===(feet(ftilt.limb)?'kick':'pow')&&slash.kind==='slash'&&bonk.kind==='thwack'&&shot.kind==='proj'&&dair.kind==='spike'&&new Set([jab.kind,ftilt.kind,slash.kind,bonk.kind,shot.kind,dair.kind]).size>=5,{jab,ftilt,slash,bonk,shot,dair});
  const fire=strikeKind(null,{effect:'fire',ang:40},{}),elec=strikeKind(null,{effect:'elec',ang:40},{});
  ok('fire and electric hits keep their own looks',fire==='flame'&&elec==='zap',{fire,elec});
  const drawn=(()=>{const {B}=duel();let fails=0;for(const kind of ['pow','kick','slash','thwack','zap','flame','proj','spike','focus'])spawnFx('strike',0,-60,{txt:kind,r:30,ang:.4});
   for(let i=0;i<4;i++){try{B.draw();}catch(e){fails++;}B.advance();}return fails;})();
  ok('every hit effect draws without errors',drawn===0);
  // reacción del que recibe: a la cara, al cuerpo, abajo o por la espalda no se ven igual
  const react=(dy,back)=>{const {a,t}=duel('daniel',40);if(back)t.face=1;const hb=t.hurtbox();applyHit(a,t,{dmg:9,ang:40,bkb:6,kbg:6},1,{at:[t.x,hb.y+hb.h*dy]});return t.hurtPose;};
  const poses=[react(.05),react(.5),react(.95),react(.5,true)];
  ok('the victim reacts to where the hit landed',poses.join()==='hurtHigh,hurt,hurtLow,hurtBack',{poses});
  // 6. determinista: corridas iguales con bate, espada y pistola dan el mismo estado cuadro a cuadro (rollback y online)
  const sim=resim=>{const B=new Battle({seed:4242,stage:'temple',players:[{port:0,char:'daniel',cpu:9},{port:1,char:'torito',cpu:9},{port:2,char:'axo',cpu:9}],rules:{mode:'stock',stocks:99,items:3,time:0}},{demo:true});B.resim=resim;
   B.fighters.forEach((f,i)=>give(f,['bat','sword','gun'][i]));const sums=[];for(let i=0;i<1500;i++){B.update();sums.push(B.checksum());}return {last:sums[sums.length-1],sums,pct:B.fighters.map(f=>Math.round(f.percent))};};
  const s1=sim(false),s2=sim(false),s3=sim(true);
  ok('identical fights with bat, sword and gun stay in lockstep, also when resimulated',s1.sums.every((x,i)=>x===s2.sums[i]&&x===s3.sums[i])&&s1.pct.some(v=>v>0),{last:[s1.last,s2.last,s3.last],pct:s1.pct});
  return out;
 });for(const c of checks)console.log((c.pass?'PASS ':'FAIL ')+c.name+' '+JSON.stringify(c.details));console.log((errors.length?'FAIL ':'PASS ')+'no browser errors '+JSON.stringify(errors));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length+!errors.length,total:checks.length+1}));if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
