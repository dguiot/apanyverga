'use strict';
// Cada pantalla simula con entradas cuantizadas; el anfitrión decide eventos y resultados.
const RB_WINDOW = 8, RB_NEUTRAL = [0, 0, 0, 0, 0];
const rbSame = (a, b) => a && b && a.every((x, i) => x === b[i]);
class RollbackSession {
  constructor(battle, opts) {
    this.battle = battle; battle.rollback = true; battle.rollbackSession = this;
    this.myPeer = opts.myPeer; this.hostPeer = opts.hostPeer; this.owners = opts.owners; this.ep = opts.ep;
    this.host = this.myPeer === this.hostPeer; this.frame = 0; this.confirmed = -1; this.delay = 2;
    this.now = opts.now || (() => performance.now()); this.read = opts.read || (p => {
      const f = this.battle.fighters.find(f => f.port === p);
      return (Devices.ctrls[f.dev] || Devices.ctrls[Net.localDev] || {}).cur || blankState();
    });
    this.send = opts.send || ((k, v, to, reliable) => reliable ? Net.room.stateSend(k, v, to) : Net.room.fastSend(k, v, to));
    this.real = new Map(); this.used = new Map(); this.lastHeard = new Map(); this.captured = new Map();
    this.snapshots = new Map(); this.hashes = new Map(); this.events = new Map(); this.cpuAt = new Map();
    this.rollbackFrom = null; this.running = false; this.stopped = false; this.off = [];
    this.metrics = { rollbacks: 0, resimFrames: 0, resimMs: 0, saveMs: 0, stalls: 0 };
    this.ports = Object.keys(this.owners).map(Number); this.local = this.ports.filter(p => this.owners[p] === this.myPeer);
    for (const p of this.ports) {
      this.real.set(p, new Map([[0, RB_NEUTRAL], [1, RB_NEUTRAL]])); this.used.set(p, new Map()); this.lastHeard.set(p, this.now());
      const f = battle.fighters.find(f => f.port === p); f.ctrl = new ReplayCtrl('rb:' + p); f.netPeer = this.owners[p] === this.hostPeer ? null : this.owners[p];
    }
    if (opts.room) {
      for (const k of ['ri', 'rq']) this.off.push(opts.room.onFast(k, e => this.receive(k, e.data, e.peer)));
      this.off.push(opts.room.onState('rcpu', e => this.receive('rcpu', e.data, e.peer)));
    }
  }
  stop() { this.stopped = true; this.off.forEach(fn => fn()); this.off = []; }
  inputMessage(p, end, count = 8) {
    const entries = this.real.get(p), a = []; let first = end;
    while (first > Math.max(0, end - count + 1) && entries.has(first - 1)) first--;
    for (let f = first; f <= end; f++) { if (!entries.has(f)) break; a.push(entries.get(f)); }
    return { ep: this.ep, p, f: first + a.length - 1, a, ack: this.confirmed, now: this.frame };
  }
  capture() {
    for (const p of this.local) {
      if (this.cpuAt.has(p)) continue;
      const f = this.frame + this.delay, entries = this.real.get(p);
      if (!entries.has(f)) entries.set(f, ReplayCtrl.pack(this.read(p)));
      this.captured.set(p, f); this.send('ri', this.inputMessage(p, f));
    }
  }
  receive(k, v, peer) {
    if (this.stopped || !v || v.ep !== this.ep) return;
    if (k === 'rq') {
      if (!Number.isInteger(v.p) || !Number.isInteger(v.f) || !this.ports.includes(v.p) || v.f < 0 || v.f > this.frame + 4) return;
      if (this.owners[v.p] === this.myPeer || this.host) {
        if (this.real.get(v.p).has(v.f)) this.send('ri', this.inputMessage(v.p, Math.min(v.f + 7, this.captured.get(v.p) ?? v.f)), peer);
      } else this.send('rq', v, this.owners[v.p]);
      return;
    }
    if (k === 'rcpu') {
      if (peer !== this.hostPeer || !this.ports.includes(v.p) || !Number.isInteger(v.f) || v.f < 0 || !Array.isArray(v.a) || v.a.length > 16) return;
      this.cpuAt.set(v.p, v.f); this.events.set(v.p, v);
      for (let i = 0; i < v.a.length; i++) this.put(v.p, v.first + i, v.a[i]);
      if (v.f < this.frame) this.rollbackFrom = Math.min(this.rollbackFrom ?? v.f, v.f);
      return;
    }
    if (k !== 'ri' || !this.ports.includes(v.p) || this.cpuAt.has(v.p)) return;
    if (peer !== this.owners[v.p] && !(peer === this.hostPeer && !this.host)) return;
    if (!Number.isInteger(v.f) || v.f < 0 || v.f > this.frame + 120 || !Array.isArray(v.a) || !v.a.length || v.a.length > 8) return;
    if (!v.a.every(a => Array.isArray(a) && a.length === 5 && a.every((x, i) => Number.isInteger(x) && Math.abs(x) <= (i === 4 ? 1023 : 100)))) return;
    this.lastHeard.set(v.p, this.now());
    for (let i = 0; i < v.a.length; i++) this.put(v.p, v.f - v.a.length + 1 + i, v.a[i]);
  }
  put(p, f, a) {
    if (f < 0 || !Array.isArray(a)) return;
    this.real.get(p).set(f, a.slice());
    const old = this.used.get(p).get(f);
    if (old && !rbSame(old, a)) this.rollbackFrom = Math.min(this.rollbackFrom ?? f, f);
  }
  advanceConfirmed() {
    while (this.confirmed + 1 < this.frame && this.ports.every(p => this.real.get(p).has(this.confirmed + 1) || (this.cpuAt.has(p) && this.confirmed + 1 >= this.cpuAt.get(p)))) this.confirmed++;
  }
  simulate(f, resim) {
    const b = this.battle; BATTLE = b; b.resim = resim;
    const t = performance.now(); this.snapshots.set(f, b.saveState()); this.metrics.saveMs = performance.now() - t;
    for (const p of this.ports) {
      const fighter = b.fighters.find(x => x.port === p), event = this.events.get(p);
      if (event && f >= event.f) {
        if (!fighter.cpu) { fighter.cpu = true; fighter.brain = new AIBrain(5); fighter.brain.f = fighter; fighter.ctrl = fighter.brain.ctrl; }
        continue;
      }
      const a = this.real.get(p).get(f) || this.used.get(p).get(f - 1) || RB_NEUTRAL;
      this.used.get(p).set(f, a); fighter.ctrl.feed(a);
    }
    this.running = true;
    try { b.update(); } finally { this.running = false; b.resim = false; }
    this.hashes.set(f, b.checksum());
  }
  reconcile() {
    const from = this.rollbackFrom; this.rollbackFrom = null;
    if (from !== null && from < this.frame) {
      const s = this.snapshots.get(from);
      if (!s) { this.rollbackFrom = from; return false; }
      const t = performance.now(); this.battle.loadState(s);
      for (let f = from; f < this.frame; f++) this.simulate(f, true);
      this.metrics.rollbacks++; this.metrics.resimFrames += this.frame - from; this.metrics.resimMs = performance.now() - t;
    }
    this.advanceConfirmed(); return true;
  }
  disconnects() {
    if (!this.host) return;
    for (const p of this.ports) if (this.owners[p] !== this.myPeer && !this.cpuAt.has(p) && this.now() - this.lastHeard.get(p) > 3000) {
      const first = this.confirmed + 1, a = [];
      for (let f = first; f < this.frame; f++) a.push(this.used.get(p).get(f) || RB_NEUTRAL);
      const event = { ep: this.ep, p, f: this.frame, first, a };
      this.receive('rcpu', event, this.hostPeer); this.send('rcpu', event, undefined, true);
    }
  }
  tick() {
    if (this.stopped) return;
    this.capture(); this.disconnects();
    if (!this.reconcile() || this.frame - this.confirmed > RB_WINDOW) {
      this.metrics.stalls++;
      for (const p of this.ports) if (!this.real.get(p).has(this.confirmed + 1) && !this.cpuAt.has(p)) this.send('rq', { ep: this.ep, p, f: this.confirmed + 1 }, this.host ? this.owners[p] : this.hostPeer);
      return;
    }
    this.simulate(this.frame++, false); this.advanceConfirmed();
    for (const f of this.snapshots.keys()) if (f < this.frame - RB_WINDOW) this.snapshots.delete(f);
    // Se conserva un minuto de entradas para recuperar paquetes perdidos, sin crecer toda la visita.
    for (const m of [...this.real.values(), ...this.used.values(), this.hashes]) for (const f of m.keys()) if (f < this.frame - 3600) m.delete(f);
    const b = this.battle, committed = this.confirmed === this.frame - 1 ? b : this.snapshots.get(this.confirmed + 1);
    if (this.host && !b.demo && committed) {
      if (committed.rbCommand) {
        const cmd = committed.rbCommand; delete b.rbCommand; this.stop();
        if (cmd === 1) { Net.startMatch(b.setup); APP.startBattle(b.setup); }
        else { BATTLE = null; Net.publishLobby({ ph: 'lobby', set: null }); APP.go('charsel'); }
      } else if (committed.phase === 'end' && committed.endT >= 150) { if (committed !== b) b.loadState(committed); this.stop(); APP.showResults(b.results()); }
    }
  }
}
