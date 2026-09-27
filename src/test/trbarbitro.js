// Estado serializable, referencias compartidas y reparación por el árbitro.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const path=require('path');
(async()=>{const br=await chromium.launch();try{const p=await br.newPage();await p.addInitScript(()=>window.requestAnimationFrame=()=>0);await p.goto('file://'+path.resolve('index.html'));const out=await p.evaluate(()=>{
 if(typeof RBStateCodec==='undefined')return [{name:'falta codec fiable',pass:false}];const out=[],check=(name,pass,value)=>out.push({name,pass,value});
 for(const stage of STAGE_INFO.map(s=>s.id)){
  const setup={seed:1621,stage,players:[{port:0,char:'nacho',dev:'q'},{port:1,char:'michi',dev:'r'},{port:2,char:'chilazo',cpu:9},{port:3,char:'torito',cpu:9}],rules:{stocks:99,time:0,items:2}};
  const a=new Battle(setup,{demo:true}),b=new Battle(setup,{demo:true});for(const B of [a,b])for(const f of B.fighters)if(!f.cpu)f.ctrl=new ReplayCtrl('rb:'+f.port);
  const codecs=[new RBStateCodec(a),new RBStateCodec(b)];
  const advance=(B,t)=>{BATTLE=B;for(const f of B.fighters)if(!f.cpu)f.ctrl.feed([Math.round(Math.sin((t+f.port*43)/13)*100),0,0,0,t%37===0?1:0]);B.update()};
  for(let t=0;t<300;t++)advance(a,t);
  a.fighters[0].backT=NaN;a.fighters[0].testInfinity=Infinity;a.fighters[0].grabbing=a.fighters[1];a.fighters[1].grabbedBy=a.fighters[0];a.fighters[0].setState('holding');a.fighters[1].setState('grabbed');BATTLE=a;const it=SimRNG.run(a.rng,()=>spawnRandomItem('bat'));it.holder=a.fighters[0];a.fighters[0].item=it;
  const wire=JSON.parse(JSON.stringify(codecs[0].encode(a.saveState())));b.loadState(codecs[1].decode(wire));check(stage+': mismo checksum tras JSON',a.checksum()===b.checksum(),{bytes:JSON.stringify(wire).length});check(stage+': referencias y números especiales',b.fighters[0].grabbing===b.fighters[1]&&b.fighters[1].grabbedBy===b.fighters[0]&&b.items.at(-1).holder===b.fighters[0]&&Number.isNaN(b.fighters[0].backT)&&b.fighters[0].testInfinity===Infinity);
  let same=true;for(let t=300;t<400;t++){advance(a,t);advance(b,t);if(a.checksum()!==b.checksum()){same=false;break}}check(stage+': sigue simulando igual',same);
 }
 let clock=0,queue=[];const setup={seed:77,stage:'temple',players:[{port:0,char:'nacho',dev:'q'},{port:1,char:'michi',dev:'r'}],rules:{stocks:99,time:0,items:0}},bs=[new Battle(setup,{demo:true}),new Battle(setup,{demo:true})];const owners={0:'H',1:'G'};
 const rs=bs.map((b,i)=>new RollbackSession(b,{myPeer:i?'G':'H',hostPeer:'H',owners,ep:9,now:()=>clock*1000/60,read:()=>blankState(),send:(k,v,to,reliable)=>{queue.push({to:1-i,k,v:JSON.parse(JSON.stringify(v)),peer:i?'G':'H',reliable});return true}}));
 for(clock=0;clock<150;clock++){for(const m of queue.splice(0))rs[m.to].receive(m.k,m.v,m.peer);if(clock===65){bs[1].stage.windDir=-bs[1].stage.windDir;for(const s of rs[1].snapshots.values())s.stage.windDir=bs[1].stage.windDir}rs.forEach(r=>r.tick())}
 for(const m of queue.splice(0))rs[m.to].receive(m.k,m.v,m.peer);rs.forEach(r=>r.reconcile());const cf=Math.min(...rs.map(r=>r.confirmed));check('árbitro detecta desync y recupera',rs.every(r=>r.metrics.desyncs>0)&&rs[0].hashes.get(cf)===rs[1].hashes.get(cf),{desyncs:rs.map(r=>r.metrics.desyncs),cf,hash:rs.map(r=>r.hashes.get(cf))});
 const old=rs[1].frame;rs[1].receive('rs',{ep:9,f:999,state:{}},'extraño');check('solo el anfitrión puede mandar estado',rs[1].frame===old);return out;
 });for(const x of out)console.log((x.pass?'OK   ':'FAIL ')+x.name+' '+JSON.stringify(x.value));const fail=out.filter(x=>!x.pass).length;console.log(out.length-fail+' OK, '+fail+' FAIL');process.exitCode=fail?1:0}finally{await br.close()}})().catch(e=>{console.error(e);process.exitCode=1});
