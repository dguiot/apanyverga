'use strict';
// Grafo para el canal fiable. Nunca se evalúa código recibido: las funciones son referencias locales.
class RBStateCodec {
  constructor(battle) {
    this.battle = battle; this.refs = new Map(); this.names = new Map();
    const add = (name, value, deep = false) => {
      this.names.set(name, value); if (value && (typeof value === 'object' || typeof value === 'function')) this.refs.set(value, name);
      if (deep && value && typeof value === 'object') for (const k of Object.keys(value).sort()) add(name + '/' + k, value[k], true);
    };
    add('setup', battle.setup); add('CHARS', CHARS, true); add('PARTY', PARTY_BY_ID, true); add('counter', COUNTER_HIT, true);
    for (const f of battle.fighters) {
      add('moves/' + f.port, f.moves, true);
      for (const k of ['dev', 'netPeer', 'label', 'uid', 'avPeer']) add('meta/' + f.port + '/' + k, f[k]);
    }
    for (const k of ['online', 'view', 'demo']) add('local/' + k, battle[k]);
    const seen = new Set();
    const stageFns = (v, path) => {
      if (typeof v === 'function') { add(path, v); return; }
      if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
      for (const k of Object.keys(v).sort()) {
        if (['clouds', 'stars', 'particles'].includes(k)) { add(path + '/' + k, v[k]); continue; }
        stageFns(v[k], path + '/' + k);
      }
    };
    stageFns(battle.stage, 'stage');
    this.types = { Battle, Fighter, AIBrain, Controller, ReplayCtrl, SimRNG };
  }
  encode(state) {
    const seen = new Map(), nodes = [];
    const enc = v => {
      if (v === undefined) return ['u'];
      if (typeof v === 'number' && !Number.isFinite(v)) return ['n', String(v)];
      if (this.refs.has(v)) return ['s', this.refs.get(v)];
      if (v === null || typeof v !== 'object') { if (typeof v === 'function') throw new Error('Función sin referencia de estado'); return v; }
      if (seen.has(v)) return ['r', seen.get(v)];
      const id = nodes.length; seen.set(v, id); const node = { t: 'Object', a: [] }; nodes.push(node);
      if (Array.isArray(v)) { node.t = 'Array'; node.a = v.map(enc); }
      else if (v instanceof Map) { node.t = 'Map'; node.a = [...v].map(([k, x]) => [enc(k), enc(x)]); }
      else if (v instanceof Set) { node.t = 'Set'; node.a = [...v].map(enc); }
      else {
        node.t = Object.getPrototypeOf(v) === null ? 'Null' : Object.keys(this.types).find(k => Object.getPrototypeOf(v) === this.types[k].prototype) || 'Object';
        for (const k of Object.keys(v)) {
          if (v instanceof Battle && STATE_VISUAL.has(k)) continue;
          if (v instanceof Fighter && ['swoosh', '_ltx', '_lty'].includes(k)) continue;
          let x;
          if (v instanceof Fighter && ['dev', 'netPeer', 'label', 'uid', 'avPeer'].includes(k)) x = ['s', 'meta/' + v.port + '/' + k];
          else if (v instanceof Battle && ['online', 'view', 'demo'].includes(k)) x = ['s', 'local/' + k];
          else x = enc(v[k]);
          node.a.push([k, x]);
        }
      }
      return ['r', id];
    };
    return { root: enc(state), nodes };
  }
  decode(wire) {
    if (!wire || !Array.isArray(wire.nodes) || wire.nodes.length > 25000) throw new Error('Estado de red inválido');
    const objects = wire.nodes.map(n => {
      if (n.t === 'Array') return []; if (n.t === 'Map') return new Map(); if (n.t === 'Set') return new Set();
      if (n.t === 'Null') return Object.create(null); if (n.t === 'Object') return {};
      if (!this.types[n.t]) throw new Error('Tipo de estado desconocido'); return Object.create(this.types[n.t].prototype);
    });
    const dec = x => {
      if (!Array.isArray(x)) return x;
      if (x[0] === 'u') return undefined;
      if (x[0] === 'n') return x[1] === 'NaN' ? NaN : x[1] === 'Infinity' ? Infinity : -Infinity;
      if (x[0] === 's') {
        if (!this.names.has(x[1])) throw new Error('Referencia de estado desconocida');
        if (x[1].startsWith('meta/')) { const [, port, key] = x[1].split('/'); return this.battle.fighters.find(f => f.port === +port)?.[key]; }
        return this.names.get(x[1]);
      }
      if (x[0] === 'r' && Number.isInteger(x[1]) && objects[x[1]]) return objects[x[1]];
      throw new Error('Referencia de grafo inválida');
    };
    wire.nodes.forEach((n, i) => {
      if (!Array.isArray(n.a) || n.a.length > 50000) throw new Error('Nodo de estado inválido');
      const o = objects[i];
      if (n.t === 'Array') for (const x of n.a) o.push(dec(x));
      else if (n.t === 'Map') for (const [k, x] of n.a) o.set(dec(k), dec(x));
      else if (n.t === 'Set') for (const x of n.a) o.add(dec(x));
      else for (const [k, x] of n.a) { if (['__proto__', 'constructor', 'prototype'].includes(k)) throw new Error('Propiedad de estado inválida'); o[k] = dec(x); }
    });
    const root = dec(wire.root); if (!(root instanceof Battle)) throw new Error('Falta la pelea en el estado'); return root;
  }
}
