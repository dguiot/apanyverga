// Cargar restaura el grafo, los controles y el azar dentro de la misma Battle.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const path=require('path');
(async()=>{const br=await chromium.launch(),p=await br.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{window.requestAnimationFrame=()=>0});await p.goto('file://'+path.resolve(process.env.PAGE||'index.html'));
const result=await p.evaluate(()=>{
 if(!Battle.prototype.saveState||typeof ReplayCtrl==='undefined')return {missing:true};
 const rows=[];
 const input=(t,p)=>{const n=(Math.imul(t+11+p*73,1103515245)+12345)>>>0;return [n%201-100,(n>>>8)%201-100,0,0,(n%29===0?1:0)|(n%11===0?2:0)|(n%59===0?4:0)];};
 const setup=stage=>({seed:8231,stage,players:[{port:0,char:'nacho',dev:'q1'},{port:1,char:'michi',dev:'q2'},{port:2,char:'chilazo',cpu:9},{port:3,char:'torito',cpu:9}],rules:{stocks:99,mode:'stock',time:0,items:2}});
 function tick(b,t){for(const f of b.fighters)if(!f.cpu)f.ctrl.feed(input(t,f.port));b.update()}
 function check(b,at,label){
  const s=b.saveState(),a=[],ref=b;for(let i=0;i<200;i++){tick(b,at+i);a.push(b.checksum())}
  b.loadState(s);BATTLE=b;
  const links=b.fighters.every(f=>(!f.grabbing||f.grabbing.grabbedBy===f)&&(!f.grabbedBy||f.grabbedBy.grabbing===f)&&(!f.item||f.item.holder===f)&&(!f.brain||f.brain.f===f));
  const c=[];for(let i=0;i<200;i++){tick(b,at+i);c.push(b.checksum())}
  const first=a.findIndex((x,i)=>x!==c[i]); rows.push({label,pass:first<0&&links&&b===ref,first,links});
 }
 for(const st of STAGE_INFO){
  const b=new Battle(setup(st.id),{demo:true});for(const f of b.fighters)if(!f.cpu)f.ctrl=new ReplayCtrl(f.dev);
  for(let t=0;t<300;t++)tick(b,t);check(b,300,st.id+' 300+200');
  for(let k=0;k<3;k++){const n=17+((k*83+st.id.length*23)%177);for(let i=0;i<n;i++)tick(b,500+i);check(b,500+n,st.id+' azar '+k)}
 }
 const b=new Battle(setup('city'),{demo:true});for(const f of b.fighters)if(!f.cpu)f.ctrl=new ReplayCtrl(f.dev);for(let i=0;i<300;i++)tick(b,i);
 const a=b.fighters[0],c=b.fighters[1];a.grabbing=c;c.grabbedBy=a;a.setState('holding');c.setState('grabbed');check(b,300,'agarre compartido');
 const f=b.fighters[0],it=SimRNG.run(b.rng,()=>spawnRandomItem('bat'));it.holder=f;f.item=it;check(b,500,'objeto en mano');
 b.fighters[0].grabLedge(b.stage.ledges()[0]);check(b,700,'orilla');
 SimRNG.run(b.rng,()=>applyHit(b.fighters[1],b.fighters[0],{dmg:18,ang:65,bkb:12,kbg:8},1));check(b,900,'golpe y hitlag');
 // Escenario más cargado: medir sin mezclar el tiempo del checksum.
 const times=[];for(let i=0;i<240;i++){const t=performance.now();b.saveState();times.push(performance.now()-t);tick(b,1100+i)}
 times.sort((a,b)=>a-b);return {rows,perf:{avg:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)],max:times.at(-1)}};
});let fail=result.missing?1:result.rows.filter(x=>!x.pass).length; if(result.missing)console.log('FAIL faltan saveState/loadState/ReplayCtrl');else {for(const r of result.rows)console.log((r.pass?'OK   ':'FAIL ')+JSON.stringify(r));console.log('SAVE_MS',result.perf)}if(errors.length){console.log('ERRORES',errors);fail++}console.log((result.rows?.filter(x=>x.pass).length||0)+' OK, '+fail+' FAIL');await br.close();process.exitCode=fail?1:0})().catch(e=>{console.error(e);process.exitCode=1});
