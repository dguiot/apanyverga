'use strict';
// Gameplay and its help use the same bindings. Menu navigation stays physical.
const ModeControls={
 primary:new Map(),
 maps:{
  kart:{gas:{keys:['KeyW','ArrowUp'],buttons:[7,0,12]},brake:{keys:['KeyS','ArrowDown'],buttons:[6,13]},drift:{keys:['Space','ShiftLeft','ShiftRight'],buttons:[2,5]},item:{keys:['KeyE','KeyJ'],buttons:[4]},rear:{keys:['KeyQ'],buttons:[1]},pause:{keys:['Escape','Enter'],buttons:[9]}},
  fps:{grenade:{keys:['KeyG'],buttons:[4]},interact:{keys:['KeyF'],buttons:[11]},crouch:{keys:['KeyC','ControlLeft','ControlRight'],buttons:[1]},sprint:{keys:['ShiftLeft','ShiftRight'],buttons:[10]},jump:{keys:['Space'],buttons:[0]},reload:{keys:['KeyR'],buttons:[2,5]},swap:{keys:['KeyQ'],buttons:[3]},pause:{keys:['Escape'],buttons:[9]},fire:{keys:[],buttons:[7]},aim:{keys:[],buttons:[6]}},
 },
 pad(mode,dev=null){
  if(dev)return padInfo.find(p=>'pad'+p.index===dev)||null;
  // A second paired wireless controller must work even if an idle virtual pad
  // occupies index 0. Keep the last active controller while all are at rest.
  const active=padInfo.find(p=>p.buttons.some(Boolean)||p.axes.some(v=>Math.abs(v)>.25));
  if(active)this.primary.set(mode,active.index);
  return active||padInfo.find(p=>p.index===this.primary.get(mode))||padInfo[0]||null;
 },
 down(mode,action,pad,keyboard=true,tapped=null){const m=this.maps[mode][action];return !!(keyboard&&m.keys.some(k=>keysDown.has(k)||tapped?.has(k))||m.buttons.some(i=>pad?.buttons[i]));},
 keyLabel(mode,action){return this.maps[mode][action].keys.map(keyName).join(' / ');},
 padLabel(mode,action){return this.maps[mode][action].buttons.map(i=>PAD_BTN[i]).join(' / ');},
 help(mode){
  const k=a=>this.keyLabel(mode,a),p=a=>this.padLabel(mode,a);
  if(mode==='kart')return [['Dirección','A D / ← →','Palanca izquierda / cruceta'],['Acelerar / frenar','W S / ↑ ↓','RT / A / ↑ · LT / ↓'],['Derrape / acrobacia','Espacio / Shift',p('drift')],['Lanzar objeto adelante',k('item'),p('item')],['Lanzar objeto atrás',k('rear'),p('rear')],['Pausa / ajustes',k('pause'),'Menu / Options']];
  return [['Mover / mirar','WASD / ratón','Palancas izquierda / derecha'],['Correr (pulsar palanca)','Shift',p('sprint')],['Apuntar / disparar','Clic derecho / izquierdo','LT / RT · L2 / R2'],['Recargar / recoger arma','R / F','X / RB · R3: recoger'],['Saltar / agacharse (mantener)','Espacio / C o Ctrl','A / ✕ · B / ○ (mantener)'],['Arma / granada / pausa','Q / 1–5 · G · Esc','Y / △ · LB / L1 · Menu']];
 },
 diagnostic(){const pads=padInfo.map(p=>shortPadName(p.id)+' #'+(p.index+1)),held=padInfo.flatMap(p=>p.buttons.flatMap((v,i)=>v?[PAD_BTN[i]||'Botón '+i]:[]));return pads.length?pads.join(' · ')+'  |  '+(held.join(', ')||'Pulsa un botón para comprobarlo aquí'):'Sin mando detectado · conecta el mando y pulsa un botón';},
};
