'use strict';
// Menu input is independent of remappable fighting controls and keyboard
// sharing during a paused match. One physical arrow press moves one cursor.
Object.assign(ShellUI,{
 inputMode:'keys',navState:new Map(),focusRect:null,
 ownsNavigation(){return APP.screen==='title'||this.active&&(this.screens.has(APP.screen)||APP.screen==='binds'||this.paused||['results','kartResults','fpsResults'].includes(APP.screen));},
 physicalNavigation(dev){
  if(dev==='local'){const combined={};for(const d of Devices.list){const input=this.physicalNavigation(d);for(const key of Object.keys(input))combined[key]=!!combined[key]||!!input[key];}return combined;}
  if(dev==='kb2')return {};
  if(dev==='kb1'){
   const held=(...keys)=>keys.some(k=>keysDown.has(k)||keyPulses.has(k));
   return {left:held('ArrowLeft','KeyA'),right:held('ArrowRight','KeyD'),up:held('ArrowUp','KeyW'),down:held('ArrowDown','KeyS'),confirm:held('Enter','NumpadEnter','KeyJ'),back:held('Escape','KeyK','Backspace'),start:false};
  }
  if(dev==='touch'){const c=Devices.ctrls[dev];return {left:c.x<-.55,right:c.x>.55,up:c.y<-.55,down:c.y>.55,confirm:c.cur.attack,back:c.cur.special,start:c.cur.start};}
  const p=padInfo.find(p=>'pad'+p.index===dev);
  if(!p)return {};const b=p.buttons,a=p.axes;
  if(p.mapping&&p.mapping!=='standard'){const c=Devices.ctrls[dev];return {left:c.x<-.6,right:c.x>.6,up:c.y<-.6,down:c.y>.6,confirm:c.cur.attack,back:c.cur.special,start:c.cur.start};}
  return {left:!!b[14]||a[0]<-.55,right:!!b[15]||a[0]>.55,up:!!b[12]||a[1]<-.55,down:!!b[13]||a[1]>.55,confirm:!!b[0],back:!!b[1],start:!!b[9],jump:!!b[2],grab:!!b[4],shield:!!b[6]};
 },
 readNavigation(dev){
  const now=this.physicalNavigation(dev),state=this.navState.get(dev)||{prev:{},repeat:{}},out={};
  for(const key of ['left','right','up','down']){const n=state.repeat[key]=now[key]?(state.repeat[key]||0)+1:0;out[key]=n===1||n>18&&n%6===0;}
  for(const key of ['confirm','back','start','jump','grab','shield'])out[key]=!!now[key]&&!state.prev[key];
  state.prev=now;this.navState.set(dev,state);return out;
 },
 seedNavigation(){
  this.navState.clear();for(const dev of [...Devices.list,'local']){const now=this.physicalNavigation(dev);this.navState.set(dev,{prev:now,repeat:Object.fromEntries(['left','right','up','down'].map(k=>[k,now[k]?1:0]))});}
 },
 navigationItems(){
  if(APP.screen==='title')return [{x:330,y:576,w:292,h:68},{x:650,y:576,w:300,h:68}];
  if(this.paused&&APP.screen!=='binds'||APP.screen==='uiSettings')return this.settingsItems();
  if(APP.screen==='uiPlayers')return this.playersItems();if(APP.screen==='uiStage')return this.stageItems();
  if(APP.screen==='uiHub')return this.cards().concat([{x:44,y:642,w:218,h:47}]);
  if(APP.screen==='uiRoom')return this.connecting?[]:this.cards().concat([{x:1016,y:66,w:218,h:48},{x:44,y:643,w:218,h:46},{x:530,y:643,w:218,h:46},{x:764,y:643,w:218,h:46}]);
  if(['results','kartResults','fpsResults'].includes(APP.screen))return this.resultsItems();return [];
 },
 drawFocus(){
  this.focusRect=null;if(!this.ownsNavigation()||InviteBox.isOpen())return;
  let b;if(APP.screen==='binds'){if(Capture.active)return;const native=APP.focusNative('kb1');b=UIFocus.cur||native?.cur;}
  else{const items=this.navigationItems();if(!items.length)return;this.focus=clamp(this.focus,0,items.length-1);b=items[this.focus];}if(!b)return;
  this.focusRect={...b,index:this.focus,screen:APP.screen};
  ctx.save();ctx.globalAlpha=1;ctx.strokeStyle='#ffc53d';ctx.lineWidth=4;ctx.lineJoin='round';ctx.shadowColor='#000b';ctx.shadowBlur=6;
  const x=b.x-5,y=b.y-5,w=b.w+10,h=b.h+10,l=Math.min(22,h*.35);
  ctx.beginPath();for(const [cx,cy,sx,sy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){ctx.moveTo(cx,cy+sy*l);ctx.lineTo(cx,cy);ctx.lineTo(cx+sx*l,cy);}ctx.stroke();
  ctx.shadowBlur=0;ctx.fillStyle='#ffc53d';ctx.beginPath();ctx.moveTo(b.x-18,b.y+b.h/2-6);ctx.lineTo(b.x-10,b.y+b.h/2);ctx.lineTo(b.x-18,b.y+b.h/2+6);ctx.fill();ctx.restore();
 },
});
const navigationGo=APP.go;APP.go=function(screen){const before=this.screen,result=navigationGo.call(this,screen);if(this.screen!==before&&ShellUI.ownsNavigation())ShellUI.seedNavigation();return result;};
const navigationPause=ShellUI.pause;ShellUI.pause=function(){navigationPause.call(this);this.seedNavigation();};
const navigationDraw=APP.draw;APP.draw=function(){navigationDraw.call(this);ShellUI.drawFocus();};
window.addEventListener('mousemove',e=>{
 if(!ShellUI.ownsNavigation()||typeof TVBOX!=='undefined'&&TVBOX.fakeMouse(e))return;
 ShellUI.inputMode='pointer';const items=ShellUI.navigationItems(),i=items.findIndex(b=>hover(b.x,b.y,b.w,b.h));if(i>=0)ShellUI.focus=i;
},{passive:true});
