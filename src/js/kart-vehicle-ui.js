'use strict';
const KartVehicles={
  selected:0,back:'kartGarage',
  openPressed(){return keyEdge('kb1','KeyV')||Devices.list.some(d=>d.startsWith('pad')&&Devices.ctrls[d]?.pressed('jump')&&padInfo.find(p=>'pad'+p.index===d)?.buttons[3]);},
  open(back){this.back=back;this.selected=KartMenu.vehicle;if(back==='kartLobby'&&Net.role==='guest'){Net.guest.rdy=0;Net.set({rdy:0});}APP.go('kartVehicles');},
  choose(){KartMenu.vehicle=this.selected;KartMenu.save();if(this.back==='kartLobby'&&Net.role==='guest'){Net.guest.vh=this.selected;Net.guest.rdy=0;Net.set({vh:this.selected,rdy:0});}APP.go(this.back);},
  rect(i){return {x:40+i%3*405,y:126+Math.floor(i/3)*230,w:390,h:215};},
};
const kartLoadVehicles=KartMenu.load;KartMenu.load=function(){kartLoadVehicles.call(this);try{this.vehicle=kartVehicleIndex(JSON.parse(localStorage.getItem('esmash-kart-garage-v1')||'{}').vehicle||0);}catch(e){this.vehicle=0;}};
KartMenu.load(); // invitations can enter a room before visiting the garage
APP.kartVehiclesUpdate=function(){
  const V=KartVehicles;
  for(const d of Devices.list){const n=Devices.nav(d);if(n.back)return APP.go(V.back);if(n.left)V.selected=(V.selected+5)%6;if(n.right)V.selected=(V.selected+1)%6;if(n.up||n.down)V.selected=(V.selected+3)%6;if(n.confirm||n.start)return V.choose();}
  for(let i=0;i<6;i++)if(KartMenu.hit(V.rect(i)))V.selected=i;
  if(KartMenu.hit({x:882,y:647,w:356,h:49}))return V.choose();if(KartMenu.hit({x:40,y:647,w:180,h:49}))APP.go(V.back);
};
APP.kartVehiclesDraw=function(){
  const V=KartVehicles,id=CHAR_ORDER[V.back==='kartLobby'&&Net.role==='guest'?Net.guest.ch:KartMenu.char],current=KART_VEHICLES[V.selected];
  KartMenu.header('ELIGE TU VEHÍCULO','SEIS FORMAS DE CORRER · CUATRO COCHES Y DOS MOTOS · TODOS LOS PILOTOS PUEDEN ELEGIR CUALQUIERA');
  KART_VEHICLES.forEach((v,i)=>{const b=V.rect(i),on=i===V.selected;slab(b.x,b.y,b.w,b.h,{edge:on?GOLD:'#3e5a70',lw:on?3:1,top:on?'#23485c':'#152c40',bottom:'#0b1829',skew:.03});
    ctx.drawImage(KartRender.kartSprite(id,i).img,b.x+3,b.y+10,185,178);sfText(v.name,b.x+187,b.y+29,29,on?GOLD:PAPER,{align:'left'});
    text(v.kind.endsWith('bike')?'MOTO':'CUATRO RUEDAS',b.x+189,b.y+60,11,'#8db7c7',{align:'left',body:true,weight:700});
    const labs=['Punta','Aceleración','Agarre','Derrape','Tierra'];for(let j=0;j<5;j++){text(labs[j],b.x+190,b.y+87+j*22,12,'#b5d1dc',{align:'left',body:true});for(let k=0;k<5;k++){ctx.fillStyle=k<v.bars[j]?(on?GOLD:TEAL):'#30485c';ctx.fillRect(b.x+285+k*16,b.y+82+j*22,12,6);}}
    text(v.tag,b.x+18,b.y+196,13,'#dae6e8',{align:'left',body:true,weight:600});
  });
  KartRender.panel(40,596,1198,39);text(current.desc,62,616,15,'#d6e6ea',{align:'left',body:true});
  KartMenu.button('← VOLVER',{x:40,y:647,w:180,h:49});text('← → / cruceta: elegir · A / Enter: confirmar',250,673,15,'#98b6c9',{align:'left',body:true});
  KartMenu.button('ELEGIR '+current.name,{x:882,y:647,w:356,h:49},true);
};
