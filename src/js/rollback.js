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
    this.metrics.desyncs = 0; this.codec = new RBStateCodec(battle); this.checkpoints = new Map(); this.pendingChecks = new Map(); this.lastResync = -Infinity; this.rollbackTimes = [];
    this.clocks = new Map(); this.rtts = new Map(); this.pings = new Map(); this.pingSeq = 0; this.lastPing = -Infinity; this.ticks = 0; this.resimAvg = 0; this.ahead = 0;
    this.ports = Object.keys(this.owners).map(Number); this.local = this.ports.filter(p => this.owners[p] === this.myPeer);
    for (const p of this.ports) {
      this.real.set(p, new Map([[0, RB_NEUTRAL], [1, RB_NEUTRAL]])); this.used.set(p, new Map()); this.lastHeard.set(p, this.now());
      const f = battle.fighters.find(f => f.port === p); f.ctrl = new ReplayCtrl('rb:' + p); f.netPeer = this.owners[p] === this.hostPeer ? null : this.owners[p];
    }
    if (opts.room) {
      for (const k of ['ri', 'rq', 'rp', 'rp2']) this.off.push(opts.room.onFast(k, e => this.receive(k, e.data, e.peer)));
      this.off.push(opts.room.onState('rcpu', e => this.receive('rcpu', e.data, e.peer)));
      for (const k of ['rc', 'rs', 'rrs']) this.off.push(opts.room.onState(k, e => this.receive(k, e.data, e.peer)));
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
      const last = this.captured.get(p);
      if (last !== undefined) for (let n = last + 1; n < f; n++) entries.set(n, entries.get(last) || RB_NEUTRAL);
      if (!entries.has(f)) entries.set(f, ReplayCtrl.pack(this.read(p)));
      this.captured.set(p, f); this.send('ri', this.inputMessage(p, f));
    }
  }
  receive(k, v, peer) {
    if (this.stopped || !v || v.ep !== this.ep) return;
    if (k === 'rc' && this.host && Object.values(this.owners).includes(peer)) {
      if (!Number.isInteger(v.f) || v.f < 0 || v.f > this.frame + 120 || typeof v.h !== 'string') return;
      const checkpoint = this.checkpoints.get(v.f);
      if (checkpoint) this.compareCheck(peer, v.f, v.h);
      else { this.pendingChecks.set(peer + ':' + v.f, { peer, f: v.f, h: v.h }); if (this.pendingChecks.size > 32) this.pendingChecks.delete(this.pendingChecks.keys().next().value); }
      return;
    }
    if (k === 'rrs' && this.host && Object.values(this.owners).includes(peer)) { this.sendState(peer); return; }
    if (k === 'rs' && !this.host && peer === this.hostPeer) { this.loadAuthority(v); return; }
    if (k === 'rp') { this.send('rp2', { ep: this.ep, id: v.id }, peer); return; }
    if (k === 'rp2') {
      const pending = this.pings.get(v.id);
      if (pending && pending.peer === peer) {
        const rtt = Math.max(0, this.now() - pending.at), old = this.rtts.get(peer);
        this.rtts.set(peer, old === undefined ? rtt : old * 0.8 + rtt * 0.2); this.pings.delete(v.id);
      }
      return;
    }
    if (k === 'rq') {
      if (!Number.isInteger(v.p) || !Number.isInteger(v.f) || !this.ports.includes(v.p) || v.f < 0 || v.f > this.frame + 4) return;
      if (this.owners[v.p] === this.myPeer || this.host) {
        if (this.real.get(v.p).has(v.f)) this.send('ri', this.inputMessage(v.p, Math.min(v.f + 7, this.captured.get(v.p) ?? v.f)), peer);
      } else this.send('rq', v, this.owners[v.p]);
      return;
    }
    if (k === 'rcpu') {
      if (peer !== this.hostPeer || !this.ports.includes(v.p) || !Number.isInteger(v.f) || v.f < 0 || !Number.isInteger(v.first) || v.first < 0 || v.first > v.f || !Array.isArray(v.a) || v.a.length > 16 || !v.a.every(a => Array.isArray(a) && a.length === 5 && a.every((x, i) => Number.isInteger(x) && Math.abs(x) <= (i === 4 ? 1023 : 100)))) return;
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
    if (Number.isInteger(v.now) && (this.host || this.owners[v.p] === this.hostPeer)) {
      const owner = this.owners[v.p], samples = this.clocks.get(owner) || [];
      // Compensa la mitad del RTT: el sello ya tiene una ida de antigüedad al llegar.
      samples.push(this.frame - v.now - (this.rtts.get(owner) || 0) * 60 / 2000);
      if (samples.length > 60) samples.shift(); this.clocks.set(owner, samples);
    }
    for (let i = 0; i < v.a.length; i++) this.put(v.p, v.f - v.a.length + 1 + i, v.a[i]);
  }
  put(p, f, a) {
    if (f < 0 || !Array.isArray(a)) return;
    this.real.get(p).set(f, a.slice());
    const old = this.used.get(p).get(f);
    if (old && !rbSame(old, a)) this.rollbackFrom = Math.min(this.rollbackFrom ?? f, f);
  }
  advanceConfirmed() {
    while (this.confirmed + 1 < this.frame && this.ports.every(p => this.real.get(p).has(this.confirmed + 1) || (this.cpuAt.has(p) && this.confirmed + 1 >= this.cpuAt.get(p)))) {
      this.confirmed++;
      if (this.confirmed % 30 === 29) this.checkConfirmed(this.confirmed);
    }
  }
  checkConfirmed(f) {
    const state = f === this.frame - 1 ? this.battle.saveState() : this.snapshots.get(f + 1);
    if (!state) return;
    this.checkpoints.set(f, { state, hash: this.hashes.get(f) });
    while (this.checkpoints.size > 4) this.checkpoints.delete(this.checkpoints.keys().next().value);
    if (!this.host) this.send('rc', { ep: this.ep, f, h: this.hashes.get(f) }, this.hostPeer, true);
    else for (const [key, c] of this.pendingChecks) if (c.f <= f) { this.compareCheck(c.peer, c.f, c.h); this.pendingChecks.delete(key); }
  }
  compareCheck(peer, f, h) {
    const checkpoint = this.checkpoints.get(f);
    if (checkpoint && checkpoint.hash !== h) { this.metrics.desyncs++; this.sendState(peer, f); }
  }
  sendState(peer, f) {
    if (f === undefined) f = [...this.checkpoints.keys()].at(-1);
    const checkpoint = this.checkpoints.get(f); if (!checkpoint) return;
    const inputs = this.ports.map(p => ({ p, first: Math.max(0, f - 7), a: Array.from({ length: Math.min(8, f + 1) }, (_, i) => this.real.get(p).get(Math.max(0, f - 7) + i) || this.used.get(p).get(Math.max(0, f - 7) + i) || RB_NEUTRAL) }));
    this.send('rs', { ep: this.ep, f, h: checkpoint.hash, state: this.codec.encode(checkpoint.state), inputs, events: [...this.events.values()] }, peer, true);
  }
  loadAuthority(v) {
    if (!Number.isInteger(v.f) || v.f < 0 || v.f > this.frame + 3600 || !Array.isArray(v.inputs) || !Array.isArray(v.events)) return;
    let state; try { state = this.codec.decode(v.state); } catch (e) { return; }
    const end = Math.max(this.frame, v.f + 1), t = performance.now();
    for (const e of v.events) if (this.ports.includes(e.p)) { this.events.set(e.p, e); this.cpuAt.set(e.p, e.f); }
    for (const x of v.inputs) if (this.ports.includes(x.p) && Array.isArray(x.a)) for (let i = 0; i < x.a.length; i++) this.real.get(x.p).set(x.first + i, x.a[i]);
    this.battle.loadState(state); this.snapshots.clear(); this.checkpoints.clear(); this.confirmed = v.f; this.rollbackFrom = null; this.hashes.set(v.f, v.h);
    for (let f = v.f + 1; f < end; f++) this.simulate(f, true);
    this.frame = end; this.metrics.desyncs++; this.metrics.resimFrames += end - v.f - 1; this.metrics.resimMs = performance.now() - t; this.advanceConfirmed();
    while (this.snapshots.size > 8) this.snapshots.delete(this.snapshots.keys().next().value);
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
      if (!s) {
        this.rollbackFrom = from;
        if (!this.host && this.now() - this.lastResync > 1000) { this.lastResync = this.now(); this.send('rrs', { ep: this.ep }, this.hostPeer, true); }
        return false;
      }
      const t = performance.now(); this.battle.loadState(s);
      for (let f = from; f < this.frame; f++) this.simulate(f, true);
      this.metrics.rollbacks++; this.metrics.resimFrames += this.frame - from; this.metrics.resimMs = performance.now() - t;
      this.resimAvg = this.resimAvg * 0.9 + this.metrics.resimMs * 0.1;
      this.rollbackTimes.push(this.now());
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
    this.ticks++;
    this.rollbackTimes = this.rollbackTimes.filter(t => this.now() - t < 1000);
    if (this.now() - this.lastPing >= 1000) {
      this.lastPing = this.now();
      const peers = this.host ? [...new Set(Object.values(this.owners).filter(p => p !== this.myPeer))] : [this.hostPeer];
      for (const peer of peers) { const id = ++this.pingSeq; this.pings.set(id, { peer, at: this.now() }); this.send('rp', { ep: this.ep, id }, peer); }
      for (const [id, p] of this.pings) if (this.now() - p.at > 5000) this.pings.delete(id);
    }
    const rtt = Math.max(0, ...this.rtts.values());
    this.delay = Math.max(this.delay, rtt > 300 || this.resimAvg > 12 ? 4 : rtt > 200 || this.resimAvg > 6 ? 3 : 2);
    this.capture(); this.disconnects();
    if (!this.reconcile() || this.frame - this.confirmed > RB_WINDOW) {
      this.metrics.stalls++;
      for (const p of this.ports) if (!this.real.get(p).has(this.confirmed + 1) && !this.cpuAt.has(p)) this.send('rq', { ep: this.ep, p, f: this.confirmed + 1 }, this.host ? this.owners[p] : this.hostPeer);
      return;
    }
    const leads = [...this.clocks.values()].filter(s => s.length === 60).map(s => s.reduce((a, b) => a + b, 0) / 60);
    this.ahead = leads.length ? Math.max(...leads) : 0;
    if (this.ahead > 1 && this.ticks % 3 === 0) return;
    this.simulate(this.frame++, false); this.advanceConfirmed();
    if (this.host && Tourney.active && this.ticks % 2 === 0) Net.pushSnapshot(this.battle);
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
  drawDebug() {
    if (!new URLSearchParams(location.search).has('netdbg')) return;
    this.rollbackTimes = this.rollbackTimes.filter(t => this.now() - t < 1000);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(12, 12, 370, 128);
    text('Red ' + Math.round(Math.max(0, ...this.rtts.values())) + ' ms · entrada ' + this.delay + ' cuadros', 24, 34, 15, '#fff', { align: 'left', body: true });
    text('Adelanto ' + this.ahead.toFixed(1) + ' · rollback/s ' + this.rollbackTimes.length, 24, 61, 14, '#fff', { align: 'left', body: true });
    text('Re-simulados ' + this.metrics.resimFrames + ' · desync ' + this.metrics.desyncs, 24, 88, 14, '#fff', { align: 'left', body: true });
    text('Guardar ' + this.metrics.saveMs.toFixed(2) + ' ms · re-simular ' + this.metrics.resimMs.toFixed(2) + ' ms', 24, 115, 14, '#fff', { align: 'left', body: true }); ctx.restore();
  }
}
