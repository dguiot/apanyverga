const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),checks=[],errors=[];
 const ok=(name,pass,details)=>{checks.push(!!pass);console.log((pass?'PASS ':'FAIL ')+name+' '+JSON.stringify(details));};
 try{
  const p=await browser.newPage({viewport:{width:1280,height:720}});p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.addInitScript(()=>{window.__pads=[0,1,2].map(index=>({index,id:'Xbox Wireless Controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));navigator.getGamepads=()=>__pads;});
  await p.route('**/config.js',r=>r.fulfill({body:'window.APYV_CONFIG={};'}));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);await p.waitForFunction(()=>Devices.frame>10&&ShellUI.poster.naturalWidth);
  const frames=async(n=1)=>{const f=await p.evaluate(()=>Devices.frame);await p.waitForFunction(([f,n])=>Devices.frame>=f+n,[f,n]);};
  const press=async(key,device='keyboard')=>{
   const map={ArrowLeft:14,ArrowRight:15,ArrowUp:12,ArrowDown:13,Enter:0,Escape:1,Menu:9,Y:3};
   if(device==='keyboard')await p.keyboard.down(key);else await p.evaluate(({key,device,i})=>{if(device==='stick'&&key.startsWith('Arrow')){__pads[0].axes[/Left|Right/.test(key)?0:1]=/Left|Up/.test(key)?-.9:.9;}else __pads[0].buttons[i].pressed=true;},{key,device,i:map[key]});
   await frames();if(device==='keyboard')await p.keyboard.up(key);else await p.evaluate(()=>{__pads[0].buttons.forEach(b=>b.pressed=false);__pads[0].axes.fill(0);});await frames();
  };
  const visual=()=>{
   const items=ShellUI.navigationItems(),b=items[ShellUI.focus],s=canvas.width/W;let gold=0;
   if(b){const x=Math.max(0,Math.floor((b.x-8)*s)),y=Math.max(0,Math.floor((b.y-8)*s)),d=ctx.getImageData(x,y,Math.ceil(11*s),Math.ceil(11*s)).data;for(let i=0;i<d.length;i+=4)if(d[i]>210&&d[i+1]>130&&d[i+1]<230&&d[i+2]<100)gold++;}
   return {focus:ShellUI.focus,count:items.length,gold,rect:b&&[b.x,b.y,b.w,b.h],frame:ShellUI.focusRect?.index,screen:APP.screen};
  };
  // Explore actual key/pad transitions, then inspect rendered corner pixels at
  // every reachable destination. No copy of the navigation algorithm is used.
  const scan=async(name,device)=>{
   await p.evaluate(()=>ShellUI.focus=0);await frames();const queue=[0],seen=new Set([0]),bad=[];
   for(let q=0;q<queue.length;q++)for(const dir of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']){
    await p.evaluate(i=>ShellUI.focus=i,queue[q]);await press(dir,device);const v=await p.evaluate(visual);
    if(!v.gold||v.frame!==v.focus)bad.push(v);if(!seen.has(v.focus)){seen.add(v.focus);queue.push(v.focus);}
   }
   const count=await p.evaluate(()=>ShellUI.navigationItems().length);ok(name+' / '+device+' reaches every option',seen.size===count,{reachable:seen.size,total:count});ok(name+' / '+device+' paints a visible focus on every option',!bad.length,bad.slice(0,3));
   const layout=await p.evaluate(()=>{const list=ShellUI.navigationItems(),outside=list.some(b=>b.x<18||b.y<18||b.x+b.w>W-18||b.y+b.h>H-18),overlap=list.some((a,i)=>list.some((b,j)=>i<j&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h));return {outside,overlap};});ok(name+' fits without overlapping interactive controls',!layout.outside&&!layout.overlap,layout);
  };
  const setup=async({game='fight',screen='settings',tab=0,online=false,locals=1}={})=>{
   await p.evaluate(({game,screen,tab,online,locals})=>{
    ShellUI.begin(false);ShellUI.config.locals=locals;ShellUI.choose(game);ShellUI.tab=tab;
    if(screen==='players'){ShellUI.next();ShellUI.playerTab=tab;}
    if(screen==='stage'){ShellUI.next();ShellUI.next();}
    if(screen==='pause'||screen==='results')ShellUI.launch();
    if(screen==='hub')ShellUI.room();if(screen==='title')ShellUI.leave();
    if(screen==='room'){ShellUI.online=true;ShellUI.connecting=false;APP.go('uiRoom');}
    if(online)ShellUI.online=true;ShellUI.focus=0;ShellUI.seedNavigation();
   },{game,screen,tab,online,locals});
   if(screen==='pause'||screen==='results'){await p.waitForFunction(()=>['battle','kartRace','fpsGame'].includes(APP.screen));await p.evaluate(({screen,tab,game})=>{if(screen==='pause'){ShellUI.pause();ShellUI.tab=tab;}else APP.go({fight:'results',kart:'kartResults',fps:'fpsResults'}[game]);},{screen,tab,game});}await frames(3);
  };
  if(!process.env.MENU_REMAINING&&!process.env.MENU_FLOWS_ONLY)for(const screen of ['title','hub','room']){await setup({screen});for(const device of ['keyboard','pad'])await scan(screen,device);}
  if(!process.env.MENU_FLOWS_ONLY)for(const game of ['fight','kart','fps']){
   if(!process.env.MENU_REMAINING)for(const tab of [0,1,2]){await setup({game,tab,online:tab===1});for(const device of ['keyboard','pad'])await scan(game+' settings tab '+tab,device);}
   if(!process.env.MENU_REMAINING){await setup({game,screen:'players',locals:4});for(const device of ['keyboard','pad'])await scan(game+' characters / four locals',device);}
   if(game==='kart'&&!process.env.MENU_REMAINING){
    await press('Y','pad');ok('Y immediately places focus on the visible Vehicles tab',await p.evaluate(()=>ShellUI.playerTab===1&&ShellUI.focus===1&&ShellUI.playersItems()[ShellUI.focus].tab===1));await scan('Kart six vehicles','stick');
    await p.evaluate(()=>{ShellUI.focus=ShellUI.playersItems().findIndex(b=>b.vh===4);});await press('Enter','pad');ok('A selects a motorcycle at the focused tile',await p.evaluate(()=>ShellUI.player().vh===4));
    await p.screenshot({path:path.resolve(__dirname,'../../work/focus-vehicles.png')});
   }
   if(!process.env.MENU_REMAINING){await setup({game,screen:'stage'});for(const device of ['keyboard','pad'])await scan(game+' stages',device);}
   for(const tab of [0,1,2]){await setup({game,screen:'pause',tab});await scan(game+' pause tab '+tab,'pad');}
   await setup({game,screen:'results'});await scan(game+' results','keyboard');
  }
  await setup({game:'fight'});await p.evaluate(()=>{Binds.kb.kb1.left=['KeyZ'];Binds.kb.kb1.right=['KeyX'];Binds.kb.kb2.down=['KeyV'];Binds.editable('pad0').left=[{b:15}];Binds.editable('pad0').right=[{b:14}];Binds.refresh();});
  await press('ArrowRight');ok('keyboard menu arrows stay physical after gameplay remapping',await p.evaluate(()=>ShellUI.focus===1));await press('ArrowRight','pad');ok('D-pad directions stay physical after gameplay remapping',await p.evaluate(()=>ShellUI.focus===2));
  await setup({game:'kart',screen:'pause'});await press('ArrowRight');ok('a keyboard arrow moves only one item while a match is paused',await p.evaluate(()=>ShellUI.focus===1));
  await setup({game:'fps',screen:'players'});await p.mouse.move(1100,166);await frames();await press('ArrowLeft');ok('keyboard takes focus away from a stationary mouse',await p.evaluate(()=>ShellUI.inputMode==='keys'&&ShellUI.focus!==ShellUI.navigationItems().findIndex(b=>hover(b.x,b.y,b.w,b.h))));
  await setup({game:'kart',screen:'players',tab:1});await p.evaluate(()=>ShellUI.focus=ShellUI.playersItems().findIndex(b=>b.vh===0));await p.keyboard.down('ArrowRight');await frames(8);ok('a brief held direction has no premature repeat',await p.evaluate(()=>ShellUI.playersItems()[ShellUI.focus].vh===1));await frames(25);await p.keyboard.up('ArrowRight');await frames();ok('holding a direction repeats predictably and stays in bounds',await p.evaluate(()=>ShellUI.focus>=0&&ShellUI.focus<ShellUI.playersItems().length&&ShellUI.navState.get('kb1').repeat.right===0));
  await setup({game:'fight',tab:1});await p.evaluate(()=>ShellUI.focus=5);await frames();await p.screenshot({path:path.resolve(__dirname,'../../work/focus-settings.png')});await p.setViewportSize({width:960,height:540});await frames();ok('focus remains visible when the game is scaled to a smaller PC window',(await p.evaluate(visual)).gold>0);await p.screenshot({path:path.resolve(__dirname,'../../work/focus-small.png')});
  await setup({game:'fight',tab:2});await p.evaluate(()=>ShellUI.focus=3);await press('Enter');ok('controller remapping opens from the focused Controls action',await p.evaluate(()=>APP.screen==='binds'&&ShellUI.inBindings));await press('ArrowDown','pad');ok('physical D-pad selects the next device inside remapping',await p.evaluate(()=>APP.bind.dev===1));await press('ArrowRight','pad');await press('ArrowDown','pad');ok('physical D-pad reaches the selected binding row',await p.evaluate(()=>APP.bind.col===1&&APP.bind.row===1&&ShellUI.focusRect?.screen==='binds'));await press('Enter','pad');ok('A starts capture only on the highlighted binding',await p.evaluate(()=>Capture.active&&Capture.dev==='kb2'));await press('Escape');await frames(14);ok('Escape cancels capture while retaining the binding screen',await p.evaluate(()=>!Capture.active&&APP.screen==='binds'));await press('Escape');ok('back returns from remapping to the shared settings page',await p.evaluate(()=>APP.screen==='uiSettings'&&ShellUI.tab===2));
  await setup({screen:'room'});await p.evaluate(()=>{Net.code='TEST';ShellUI.focus=3;});await press('Enter');ok('Enter opens the focused invitation action and releases held menu keys',await p.evaluate(()=>InviteBox.isOpen()&&!keysDown.has('Enter')));const initial=await p.locator('#invite [data-a]:focus').getAttribute('data-a');await press('ArrowLeft');ok('keyboard arrows move the visible focus inside the invite dialog',await p.locator('#invite [data-a]:focus').getAttribute('data-a')!==initial);await press('ArrowRight','pad');ok('D-pad moves the same native dialog focus',await p.locator('#invite [data-a]:focus').getAttribute('data-a')===initial);await press('Enter','pad');ok('A activates the focused dialog action without activating the menu behind it',await p.evaluate(()=>!InviteBox.isOpen()&&APP.screen==='uiRoom'));
  ok('no browser errors',errors.length===0,errors.slice(0,4));console.log(JSON.stringify({passed:checks.filter(Boolean).length,total:checks.length}));if(checks.some(c=>!c))process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
