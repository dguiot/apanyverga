'use strict';
// A native button can unlock browser audio, including when a gamepad is the
// only game input. The control disappears once audio is running and enabled.
const AudioStatus={
 button:null,
 install(){
  const style=document.createElement('style');style.textContent='#game-audio{position:fixed;right:14px;bottom:0;z-index:8;max-width:calc(100vw - 28px);border:2px solid #ffc53d;border-radius:9px;background:#102635;color:#fff0c3;padding:3px 10px;font:700 clamp(9px,min(1vw,1.7vh),12px)/1.25 system-ui;cursor:pointer;box-shadow:0 3px 16px #0008}#game-audio[hidden]{display:none}#game-audio:focus-visible{outline:3px solid white;outline-offset:2px}';document.head.append(style);
  const b=this.button=document.createElement('button');b.id='game-audio';b.type='button';b.title='Activa el audio del juego';
  b.addEventListener('click',e=>{e.stopPropagation();this.test();});
  b.addEventListener('pointerdown',e=>e.stopPropagation());
  b.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();this.test();}});
  document.body.append(b);this.update();
  const recover=()=>{if(!document.hidden&&Audio8.ctx&&Audio8.hadPlayback)Audio8.unlock();this.update();};
  window.addEventListener('focus',recover);window.addEventListener('pageshow',recover);document.addEventListener('visibilitychange',recover);
 },
 update(){
  const b=this.button;if(!b)return;const hidden=!!Audio8.ready&&!Audio8.muted;if(b.hidden!==hidden)b.hidden=hidden;
  const label=Audio8.muted?'Sonido silenciado · Activar':Audio8.error?'Reintentar sonido':'Activar sonido · clic, toque o tecla';
  if(b.textContent!==label){b.textContent=label;b.setAttribute('aria-label',label);}
 },
 async test(){
  Audio8.setMuted(false);const ready=await Audio8.unlock();
  if(ready){Audio8.sfx('confirm');KartMusic.tick();}this.update();return ready;
 },
};AudioStatus.install();
