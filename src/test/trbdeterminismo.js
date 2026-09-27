// Semilla, efectos y reloj: dos corridas de 3600 cuadros por escenario.
const { chromium, webkit } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
 let fail=0, ok=0, reference;
 for (const engine of [chromium, webkit]) {
  const browser=await engine.launch(), page=await browser.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;navigator.getGamepads=()=>[]});
  await page.goto('file://'+path.resolve(process.env.PAGE||'index.html'));
  const result=await page.evaluate(()=>{
   if(typeof Battle.prototype.checksum!=='function')return {missing:true};
   const rows=[];
   function run(stage, resim=false) {
    const b=new Battle({seed:71903,stage,players:[{port:0,char:'nacho',dev:'q1'},{port:1,char:'michi',dev:'q2'},{port:2,char:'chilazo',cpu:9},{port:3,char:'torito',cpu:9}],rules:{mode:'stock',stocks:99,items:2,time:0}},{demo:true});
    b.fighters.slice(0,2).forEach((f,p)=>{f.ctrl=new Controller('q'+p)});
    b.resim=resim;
    const sums=[];
    for(let t=0;t<3600;t++) {
     b.fighters.slice(0,2).forEach((f,p)=>{const n=(Math.imul(t+1+p*137,1103515245)+12345)>>>0;f.ctrl.update(Object.assign(blankState(),{x:((n>>>20)%201-100)/100,y:((n>>>12)%201-100)/100,jump:n%73===0,attack:n%11===0,special:n%37===0,shield:n%61<4,grab:n%97===0}));});
     b.update();sums.push(b.checksum());
     // dibujar y cambiar el RNG visual no debe tocar la siguiente decisión.
     for(let i=0;i<t%7;i++)Math.random();
    }
    return sums;
   }
   for(const st of STAGE_INFO){const a=run(st.id),b=run(st.id),c=run(st.id,true);rows.push({stage:st.id,sums:a,same:a.findIndex((s,i)=>s!==b[i]),resim:a.findIndex((s,i)=>s!==c[i])});}
   return {rows};
  });
  if(result.missing){console.log('FAIL falta Battle.checksum / semilla');fail++;}
  else {
   for(const r of result.rows){const pass=r.same<0&&r.resim<0;pass?ok++:fail++; console.log((pass?'OK   ':'FAIL ')+engine.name()+' '+r.stage+' repetición='+r.same+' resim='+r.resim);}
   if(!reference)reference=result.rows; else for(const r of result.rows){const a=reference.find(x=>x.stage===r.stage);console.log('MOTORES '+r.stage+' primer cuadro distinto: '+a.sums.findIndex((s,i)=>s!==r.sums[i]));}
  }
  if(errors.length){console.log('ERRORES',errors.slice(0,3));fail++;}
  await browser.close();
 }
 console.log(ok+' OK, '+fail+' FAIL');process.exitCode=fail?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
