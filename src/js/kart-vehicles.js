'use strict';
// Small, opposing advantages; every chassis accepts every original pilot.
const KART_VEHICLES=[
  {id:'cometa',name:'Cometa',kind:'kart',tag:'El punto de equilibrio',desc:'Predecible al frenar y salir de las curvas. Sin puntos débiles marcados.',speed:1,accel:1,grip:1,weight:1,brake:1,charge:1,boost:1,offroad:.42,response:1,bars:[3,3,3,3,3]},
  {id:'flecha',name:'Flecha GP',kind:'formula',tag:'Velocidad y trazadas limpias',desc:'Más punta y turbo largo; recupera velocidad más despacio y exige cuidar el asfalto.',speed:1.018,accel:.92,grip:.98,weight:.95,brake:.97,charge:.94,boost:1.08,offroad:.39,response:.98,bars:[5,2,3,4,2]},
  {id:'rally',name:'Rally 4×4',kind:'buggy',tag:'Estabilidad y terreno difícil',desc:'Agarre, frenada y mejor salida de la tierra; menor velocidad punta y turbo más corto.',speed:.994,accel:1.035,grip:1.04,weight:1.12,brake:1.07,charge:1.03,boost:.95,offroad:.52,response:.96,bars:[2,4,4,2,5]},
  {id:'titan',name:'Titán GT',kind:'coupe',tag:'Inercia y turbos potentes',desc:'Carrocería estable y turbos largos. Pesa más y tarda en acelerar y cambiar de apoyo.',speed:1.012,accel:.94,grip:.99,weight:1.16,brake:.94,charge:.96,boost:1.12,offroad:.43,response:.92,bars:[4,2,3,5,3]},
  {id:'centella',name:'Centella R',kind:'sportbike',tag:'Moto deportiva · reacción rápida',desc:'Acelera y cambia de dirección con rapidez. Carga el derrape antes, con turbo más breve y menos peso.',speed:1.005,accel:1.04,grip:.975,weight:.82,brake:1.02,charge:1.14,boost:.88,offroad:.40,response:1.09,bars:[4,4,2,4,2]},
  {id:'gacela',name:'Gacela Trail',kind:'trailbike',tag:'Moto de campo · control y recuperación',desc:'Aceleración, agarre y buena recuperación fuera de pista; cede punta y duración del turbo.',speed:.992,accel:1.09,grip:1.05,weight:.86,brake:1.08,charge:1.04,boost:.95,offroad:.51,response:1.06,bars:[2,5,5,2,5]},
];
const kartVehicle=v=>KART_VEHICLES[Number.isInteger(v)?v:KART_VEHICLES.findIndex(q=>q.id===v)]||KART_VEHICLES[0];
const kartVehicleIndex=v=>KART_VEHICLES.indexOf(kartVehicle(v));
