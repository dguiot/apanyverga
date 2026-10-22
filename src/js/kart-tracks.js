'use strict';
// Closed, arc-length sampled courses. Distances and speed use metres and seconds.
// Keeping geometry in the simulation makes turns, the map and the road agree.
const KART_TRACKS = [
  { id: 'mercado', name: 'Mercado del Sol', tag: 'EL BARRIO A TODA VELOCIDAD', difficulty: 3,
    desc: 'Adoquines, curvas enlazadas y un puente sobre los canales. Cuidado con los puestos.',
    sky: ['#258bc6', '#caeff5'], ground: '#668b51', road: '#5b6770', edge: '#ee7851', accent: '#ffc53d', fog: '#bddde2', theme: 'town', width: 14,
    points: [[0,0,0],[0,0,380],[180,10,650],[480,22,670],[650,25,490],[620,8,200],[870,6,60],[1090,16,260],[1180,34,600],[1450,42,720],[1690,32,520],[1740,10,100],[1580,5,-210],[1210,10,-320],[990,24,-150],[740,35,-390],[470,20,-470],[180,6,-350],[-100,0,-170]],
    zones: [{from:.27,to:.35,type:'bridge',width:10.8},{from:.61,to:.68,type:'cobbles'},{from:.81,to:.87,type:'narrow',width:11.8}],
    hazards: [{at:.17,x:.65,type:'crate'},{at:.38,x:-.55,type:'crate'},{at:.65,x:.42,type:'crate'},{at:.85,x:-.5,type:'crate'}],
    boosts: [.12,.43,.73], boxes: [.065,.21,.37,.51,.67,.84,.94] },
  { id: 'volcan', name: 'Cañón de Fuego', tag: 'DOMINA EL BORDE DEL VOLCÁN', difficulty: 4,
    desc: 'Horquillas en ascenso, puentes estrechos y rocas que cruzan la pista. Frena antes de girar.',
    sky: ['#492d62', '#e9a16e'], ground: '#704a42', road: '#473e48', edge: '#f56c3e', accent: '#ff9857', fog: '#b37671', theme: 'canyon', width: 13,
    points: [[0,5,0],[0,18,400],[240,68,740],[590,110,780],[800,136,580],[680,120,370],[440,90,350],[420,64,120],[750,50,40],[1100,75,300],[1420,116,630],[1650,140,560],[1720,125,260],[1480,90,30],[1500,70,-330],[1210,42,-570],[900,30,-470],[640,22,-650],[280,12,-540],[-120,6,-300]],
    zones: [{from:.2,to:.29,type:'bridge',width:9.8},{from:.54,to:.62,type:'bridge',width:10.4},{from:.76,to:.83,type:'gravel'}],
    hazards: [{at:.135,x:.2,type:'rock',moving:true},{at:.34,x:-.4,type:'rock'},{at:.47,x:.3,type:'rock',moving:true},{at:.71,x:-.3,type:'rock',moving:true},{at:.88,x:.55,type:'rock'}],
    boosts: [.09,.4,.67,.93], boxes: [.06,.18,.31,.45,.6,.74,.89] },
  { id: 'neon', name: 'Cumbre Neón', tag: 'LA NOCHE SE GANA DERRAPANDO', difficulty: 5,
    desc: 'Una cumbre de neón: eses rápidas, asfalto mojado y una horquilla final de precisión.',
    sky: ['#080d30', '#313261'], ground: '#152c43', road: '#23374e', edge: '#32e5db', accent: '#d989ff', fog: '#303759', theme: 'neon', width: 13.5,
    points: [[0,0,0],[0,8,420],[230,34,760],[500,52,650],[600,65,410],[880,90,370],[1050,112,660],[1340,138,800],[1630,125,650],[1740,96,340],[1520,70,140],[1260,54,230],[1110,40,-20],[1250,26,-360],[1550,20,-580],[1510,12,-850],[1200,5,-980],[900,0,-760],[550,15,-850],[230,28,-620],[360,20,-410],[120,6,-280],[-140,0,-230]],
    zones: [{from:.22,to:.3,type:'bridge',width:10.8},{from:.42,to:.51,type:'wet'},{from:.64,to:.73,type:'wet'},{from:.85,to:.93,type:'narrow',width:10}],
    hazards: [{at:.16,x:.5,type:'barrier'},{at:.38,x:-.55,type:'barrier'},{at:.57,x:.35,type:'barrier',moving:true},{at:.79,x:-.25,type:'barrier',moving:true},{at:.91,x:.5,type:'barrier'}],
    boosts: [.1,.33,.6,.8], boxes: [.055,.19,.34,.48,.63,.77,.94] },
];

// Escala de las pistas: con 1.45 cada vuelta medía 9–11 km y duraba 1.5–2.5 minutos (una carrera de 3
// vueltas pasaba de 5 minutos). Con .76 la vuelta mide ~4.6–5.7 km y dura ~45–60 s, como en un juego de karts.
// Todo lo que va sobre la pista (cajas, turbos, rampas, obstáculos, monedas) se coloca por fracción de vuelta.
const KART_TRACK_SCALE = .76;
const KartMath = {
  wrap(n, length) { return ((n % length) + length) % length; },
  delta(a, b, length) { return this.wrap(a - b + length / 2, length) - length / 2; },
  cat(a,b,c,d,t) { return .5 * (2*b + (-a+c)*t + (2*a-5*b+4*c-d)*t*t + (-a+3*b-3*c+d)*t*t*t); },
};

class KartCourse {
  constructor(info) {
    this.info = info; this.samples = []; this.step = 6;
    const pts = info.points, dense = [], n = pts.length;
    // A dense spline first, then uniform distance: no acceleration spikes at control points.
    for (let i=0;i<n;i++) for (let j=0;j<100;j++) {
      const p = [0,1,2].map(k => KartMath.cat(pts[(i+n-1)%n][k],pts[i][k],pts[(i+1)%n][k],pts[(i+2)%n][k],j/100)*KART_TRACK_SCALE);
      dense.push({x:p[0],y:p[1],z:p[2]});
    }
    dense.push(dense[0]); let len=0;
    for (let i=0;i<dense.length;i++) { if(i) len+=Math.hypot(dense[i].x-dense[i-1].x,dense[i].z-dense[i-1].z); dense[i].s=len; }
    const count=Math.ceil(len/this.step); this.length=len; this.step=len/count;
    let at=1;
    for(let i=0;i<count;i++) {
      const s=i*this.step; while(dense[at].s<s) at++;
      const a=dense[at-1],b=dense[at],t=(s-a.s)/(b.s-a.s);
      this.samples.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,s});
    }
    for(let i=0;i<count;i++) {
      const p=this.samples[i],a=this.samples[(i+count-1)%count],b=this.samples[(i+1)%count];
      const h=Math.hypot(b.x-a.x,b.z-a.z); p.tx=(b.x-a.x)/h;p.tz=(b.z-a.z)/h;
      const ax=p.x-a.x,az=p.z-a.z,bx=b.x-p.x,bz=b.z-p.z;
      p.curve=Math.atan2(az*bx-ax*bz,ax*bx+az*bz)/this.step;
      const zone=info.zones.find(q=>i/count>=q.from&&i/count<q.to);
      p.width=zone&&zone.width||info.width;p.zone=zone&&zone.type||'road';
    }
    this.boxes=info.boxes.flatMap((at,row)=>[-.66,0,.66].map((x,col)=>({s:at*len,x,key:row*3+col,ready:0})));
    this.boosts=info.boosts.map((at,i)=>({s:at*len,x:i%2?-.38:.38}));
    this.hazards=info.hazards.map((q,i)=>({...q,s:q.at*len,phase:i*2.3}));
    this.ramps=[.145,.46,.795].map((at,i)=>({s:at*len,x:i%2?-.38:.38}));
    this.coins=[];
    for(let row=0;row<18;row++)for(let j=0;j<4;j++)this.coins.push({s:len*(.035+row*.052)+j*6,x:(row%3-1)*.52,ready:0});
  }
  sample(s) {
    const v=KartMath.wrap(s,this.length)/this.step,i=Math.floor(v+1e-9)%this.samples.length,t=v-Math.floor(v+1e-9); // s de una muestra = esa muestra (sin error de redondeo)
    const a=this.samples[i],b=this.samples[(i+1)%this.samples.length];
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,
      tx:a.tx+(b.tx-a.tx)*t,tz:a.tz+(b.tz-a.tz)*t,curve:a.curve+(b.curve-a.curve)*t,width:a.width+(b.width-a.width)*t,zone:a.zone};
  }
  world(s,x=0,h=0) { const p=this.sample(s);return {x:p.x+p.tz*x*p.width,y:p.y+h,z:p.z-p.tx*x*p.width}; }
  hazardX(h,time) { return h.moving ? Math.sin(time*.85+h.phase)*.78 : h.x; }
}
