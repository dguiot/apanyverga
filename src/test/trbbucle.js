// Entradas atrasadas, predicción de sostenidos, ventana, pausa y CPU por evento.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const path=require('path');
(async()=>{const br=await chromium.launch(),p=await br.newPage();await p.addInitScript(()=>{window.requestAnimationFrame=()=>0});await p.goto('file://'+path.resolve('index.html'));const out=await p.evaluate(()=>{
 if(typeof RollbackSession==='undefined')return [{name:'falta RollbackSession',pass:false}];
 const tests=[],check=(name,pass,value)=>tests.push({name,pass,value}),players=[{port:0,char:'nacho',dev:'q1'},{port:1,char:'michi',dev:'q2'},{port:2,char:'chilazo',cpu:9},{port:3,char:'torito',cpu:9}];
 const setup={seed:712,stage:'temple',players,rules:{stocks:99,mode:'stock',time:0,items:2}},owners={0:'H',1:'G'};
 let clock=0,queue=[],sent=0;
 const state=(t,port)=>Object.assign(blankState(),{x:Math.sin((t+port*23)/19)*.873,y:Math.cos((t+port*17)/31)*.649,jump:t%89===0,attack:t%17===0,special:t%113===0});
 const bs=[new Battle(setup,{demo:true}),new Battle(setup,{demo:true})],rs=[];
 for(let i=0;i<2;i++)rs.push(new RollbackSession(bs[i],{myPeer:i?'G':'H',hostPeer:'H',owners,ep:1,read:port=>state(clock,port),now:()=>clock*1000/60,send:(k,v,to,reliable)=>{if(!reliable&&++sent%29===0)return true;queue.push({at:clock+(reliable?1:3+sent%3),from:i,to:1-i,k,v:JSON.parse(JSON.stringify(v))});return true;}}));
 for(clock=0;clock<600;clock++){const due=queue.filter(m=>m.at<=clock);queue=queue.filter(m=>m.at>clock);for(const m of due)rs[m.to].receive(m.k,m.v,m.from?'G':'H');rs[0].tick();rs[1].tick();}
 for(const m of queue)rs[m.to].receive(m.k,m.v,m.from?'G':'H');for(const r of rs)r.reconcile();
 const cf=Math.min(rs[0].confirmed,rs[1].confirmed);check('600 cuadros con retraso/pérdida convergen',rs[0].hashes.get(cf)===rs[1].hashes.get(cf),{cf,h:rs.map(r=>r.hashes.get(cf)),frames:rs.map(r=>r.frame)});
 check('sí hubo rollback',rs.every(r=>r.metrics.rollbacks>0),rs.map(r=>r.metrics.rollbacks));check('anillo acotado a 8',rs.every(r=>r.snapshots.size<=8),rs.map(r=>r.snapshots.size));
 check('cuantización local',rs[0].real.get(0).get(2)[0]===ReplayCtrl.pack(state(0,0))[0],rs[0].real.get(0).get(2));
 const hold=new ReplayCtrl('q');hold.feed([0,0,0,0,1]);const edge=hold.pressed(BUTTONS[0]);hold.feed([0,0,0,0,1]);check('sostenido predicho no repite flanco',edge&&!hold.pressed(BUTTONS[0]));
 const b=new Battle(setup,{demo:true}),r=new RollbackSession(b,{myPeer:'H',hostPeer:'H',owners,ep:2,read:()=>blankState(),now:()=>0,send:()=>true});for(let i=0;i<20;i++)r.tick();const f=r.frame;r.tick();check('espera si falta más de la ventana',r.frame===f&&r.metrics.stalls>0,{f,stalls:r.metrics.stalls});
 const hist=Array.from({length:8},()=>[0,0,0,0,0]);r.receive('ri',{ep:2,p:1,f:f-1,a:hist,ack:0,now:f},'G');r.tick();check('se recupera al llegar las entradas',r.frame>f,r.frame);
 const old=r.real.get(1).size;r.receive('ri',{ep:9,p:1,f:100,a:hist},'G');check('otro partido no contamina el registro',r.real.get(1).size===old);
 const pauseBs=[new Battle(setup,{demo:true}),new Battle(setup,{demo:true})];let pc=0,pq=[];
 const prs=pauseBs.map((b,i)=>{b.demo=false;b.phase='fight';return new RollbackSession(b,{myPeer:i?'G':'H',hostPeer:'H',owners,ep:3,read:p=>Object.assign(blankState(),{start:p===0?(pc===0||pc===8):pc===4}),now:()=>pc*1000/60,send:(k,v)=>{pq.push({to:1-i,k,v,peer:i?'G':'H'});return true}})});
 for(pc=0;pc<4;pc++){for(const m of pq.splice(0))prs[m.to].receive(m.k,m.v,m.peer);prs.forEach(r=>r.tick())}
 check('pausa del anfitrión en ambas pantallas',pauseBs.every(b=>b.paused));
 for(;pc<8;pc++){for(const m of pq.splice(0))prs[m.to].receive(m.k,m.v,m.peer);prs.forEach(r=>r.tick())}
 check('start del invitado no cambia la pausa',pauseBs.every(b=>b.paused));
 for(;pc<14;pc++){for(const m of pq.splice(0))prs[m.to].receive(m.k,m.v,m.peer);prs.forEach(r=>r.tick())}
 check('anfitrión continúa la pelea',pauseBs.every(b=>!b.paused));
 let wall=0,ce=null;const cb=new Battle(setup,{demo:true}),cr=new RollbackSession(cb,{myPeer:'H',hostPeer:'H',owners,ep:4,read:()=>blankState(),now:()=>wall,send:(k,v)=>{if(k==='rcpu')ce=v;return true}});for(let i=0;i<20;i++)cr.tick();wall=3001;cr.tick();check('desconectado pasa a CPU por evento de cuadro',cb.fighters[1].cpu&&ce?.f===10,ce);
 const gb=new Battle(setup,{demo:true}),gr=new RollbackSession(gb,{myPeer:'G',hostPeer:'H',owners,ep:4,read:()=>blankState(),now:()=>0,send:()=>true});gr.receive('rcpu',ce,'H');for(let i=0;i<11;i++){gr.receive('ri',cr.inputMessage(0,Math.min(i+2,12)),'H');gr.tick()}check('invitado aplica CPU en el mismo cuadro',gb.fighters[1].cpu&&gr.cpuAt.get(1)===cr.cpuAt.get(1));
 return tests;
});for(const x of out)console.log((x.pass?'OK   ':'FAIL ')+x.name+' '+JSON.stringify(x.value));const fail=out.filter(x=>!x.pass).length;console.log(out.length-fail+' OK, '+fail+' FAIL');await br.close();process.exitCode=fail?1:0})().catch(e=>{console.error(e);process.exitCode=1});
