'use strict';
// ============================================================
//  CÁMARA Y VOZ en las salas online. Cada jugador que la enciende
//  se conecta directo con los demás (WebRTC, de navegador a navegador);
//  la sala de Claude solo pasa las señales para encontrarse (tema "rtc").
//  Nada se graba ni se guarda.
// ============================================================
// en la versión web se pueden agregar servidores TURN (APYV_CONFIG.ice) para redes que no dejan conectar directo
const AV_ICE = (window.APYV_CONFIG && window.APYV_CONFIG.ice) || [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const AV_CHUNK = 2800; // la señal viaja en trozos: cada mensaje de la sala admite 4 KiB
const AV = {
  on: false, starting: false, stream: null, err: null, errT: 0, pcs: new Map(), parts: new Map(),
  wired: false, mic: true, cam: true, barH: 0, el: null, tiles: new Map(), t: 0, denied: false,
  supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection); },
  inRoom() { return Net.ok && !!Net.room && (Net.role === 'host' || Net.role === 'guest'); },
  myKey() { return Net.role === 'host' ? Net.myPeer() : Net.hostPeer; },
  keyOf(p) { const pr = p.presence || {}; return pr.role === 'host' ? p.peer : pr.join; },
  count() { let n = 0; for (const r of this.pcs.values()) if (r.pc.connectionState === 'connected') n++; return n; },

  async toggle() { if (this.on || this.starting) this.stop(true); else await this.start(); },
  async start() {
    if (!this.inRoom()) { Toasts.push('La cámara y la voz funcionan dentro de una sala online'); return; }
    if (!this.supported()) return this.fail('Este navegador no permite cámara ni micrófono aquí.');
    if (this.denied) return this.fail('Tu acceso a este juego no permite enviar video. Pide al dueño que te dé permiso para interactuar.');
    this.starting = true; this.err = null;
    let stream = null, err = null;
    // iPhone: con micrófono el audio tiene que ser de llamada (el juego lo pone en 'playback' para ignorar el modo silencio)
    try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) { /* sin sesión */ }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 20 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      err = e;
      if (e && ['NotFoundError', 'NotReadableError', 'OverconstrainedError'].includes(e.name)) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); Toasts.push('No encontré cámara: entras solo con voz'); } catch (e2) { err = e2; }
      }
    }
    if (!stream) { this.starting = false; return this.fail(this.explain(err)); }
    if (!this.starting) { stream.getTracks().forEach(t => t.stop()); return; } // se canceló mientras pedía permiso
    this.stream = stream; this.on = true; this.starting = false; this.mic = true; this.cam = stream.getVideoTracks().length > 0;
    this.wire();
    Net.set({ av: 1 });
    this.ui();
    Toasts.push('🎥 Cámara y voz encendidas');
  },
  explain(e) {
    const fp = document.featurePolicy || document.permissionsPolicy;
    const blocked = fp && typeof fp.allowsFeature === 'function' && !fp.allowsFeature('camera') && !fp.allowsFeature('microphone');
    if (blocked || (e && e.name === 'SecurityError')) return 'Esta vista no deja usar la cámara ni el micrófono dentro del juego. Hagan una videollamada aparte (FaceTime, WhatsApp o Meet) mientras juegan.';
    if (e && e.name === 'NotAllowedError') return 'El permiso de cámara o micrófono está bloqueado. Actívalo desde el candado junto a la dirección y vuelve a intentar.';
    return 'No se pudo abrir la cámara ni el micrófono.';
  },
  fail(msg) { this.err = msg; this.errT = performance.now(); Toasts.push('🎥 No se pudo encender la cámara y voz'); },
  stop(say) {
    this.starting = false;
    for (const peer of [...this.pcs.keys()]) { this.send(peer, { t: 'bye' }); this.close(peer); }
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    const was = this.on; this.on = false;
    if (Net.ok) Net.set({ av: null });
    this.ui();
    if (say && was) Toasts.push('Cámara y voz apagadas');
  },
  setMic(v) { this.mic = v; if (this.stream) this.stream.getAudioTracks().forEach(t => { t.enabled = v; }); this.ui(); },
  setCam(v) { this.cam = v; if (this.stream) this.stream.getVideoTracks().forEach(t => { t.enabled = v; }); this.ui(); },

  // ---------- señales por la sala ----------
  wire() {
    if (this.wired || !Net.room) return;
    this.wired = true;
    try { Net.room.on('rtc', msg => this.onMsg(msg), () => {}); } catch (e) { /* sin sala */ }
  },
  send(to, obj) {
    if (!Net.room || !to) return;
    const put = d => Net.room.emit('rtc', Object.assign({ to }, d)).catch(e => {
      if (e && e.code === 'not_permitted') { this.denied = true; this.fail('Tu acceso a este juego no permite enviar video. Pide al dueño que te dé permiso para interactuar.'); this.stop(false); }
    });
    if (obj.sdp && obj.sdp.length > AV_CHUNK) {
      const id = Math.random().toString(36).slice(2, 8), n = Math.ceil(obj.sdp.length / AV_CHUNK);
      for (let i = 0; i < n; i++) put({ t: obj.t, id, i, n, s: obj.sdp.slice(i * AV_CHUNK, (i + 1) * AV_CHUNK) });
    } else put(obj.sdp ? { t: obj.t, s: obj.sdp } : obj);
  },
  async onMsg(msg) {
    if (!msg || msg.sameTab || !msg.data || typeof msg.data !== 'object') return;
    const d = msg.data, peer = msg.peer;
    if (d.to !== Net.myPeer() || typeof d.t !== 'string') return;
    let sdp = typeof d.s === 'string' ? d.s : null;
    if (d.id && d.n) { // reunir los trozos
      if (typeof d.id !== 'string' || !(d.n > 0 && d.n < 12) || !(d.i >= 0 && d.i < d.n)) return;
      const k = peer + ':' + d.id, a = this.parts.get(k) || { n: d.n, got: [], t: performance.now() };
      a.got[d.i] = d.s; this.parts.set(k, a);
      for (const [kk, v] of this.parts) if (performance.now() - v.t > 20000) this.parts.delete(kk);
      if (a.got.filter(x => typeof x === 'string').length < a.n) return;
      this.parts.delete(k); sdp = a.got.join('');
    }
    try {
      if (d.t === 'bye') { this.close(peer); return; }
      if (!this.on) return;
      if (d.t === 'offer' && sdp) {
        let rec = this.pcs.get(peer);
        if (rec && rec.caller) return; // nos toca ofrecer a nosotros (id menor)
        if (rec && rec.pc.signalingState !== 'stable') { this.close(peer); rec = null; }
        if (!rec) rec = this.makePc(peer, false);
        await rec.pc.setRemoteDescription({ type: 'offer', sdp });
        await this.flush(rec);
        const ans = await rec.pc.createAnswer();
        await rec.pc.setLocalDescription(ans);
        this.send(peer, { t: 'answer', sdp: rec.pc.localDescription.sdp });
      } else if (d.t === 'answer' && sdp) {
        const rec = this.pcs.get(peer);
        if (rec && rec.caller && rec.pc.signalingState === 'have-local-offer') { await rec.pc.setRemoteDescription({ type: 'answer', sdp }); await this.flush(rec); }
      } else if (d.t === 'ice' && Array.isArray(d.c)) {
        const rec = this.pcs.get(peer); if (!rec) return;
        for (const c of d.c.slice(0, 40)) { if (c && typeof c === 'object') rec.remoteCands.push(c); }
        if (rec.pc.remoteDescription) await this.flush(rec);
      }
    } catch (e) { /* señal fuera de orden: se reintenta sola */ }
  },
  async flush(rec) { const cs = rec.remoteCands.splice(0); for (const c of cs) { try { await rec.pc.addIceCandidate(c); } catch (e) { /* candidato viejo */ } } },
  makePc(peer, caller) {
    const pc = new RTCPeerConnection({ iceServers: AV_ICE });
    const rec = { pc, peer, caller, stream: null, cands: [], candT: null, remoteCands: [], born: performance.now() };
    if (this.stream) for (const t of this.stream.getTracks()) pc.addTrack(t, this.stream);
    pc.ontrack = e => { rec.stream = e.streams && e.streams[0] ? e.streams[0] : (rec.stream || new MediaStream()); if (!e.streams || !e.streams[0]) rec.stream.addTrack(e.track); this.ui(); };
    pc.onicecandidate = e => {
      if (!e.candidate) return;
      rec.cands.push(e.candidate.toJSON());
      if (!rec.candT) rec.candT = setTimeout(() => { rec.candT = null; if (this.pcs.get(peer) === rec) this.send(peer, { t: 'ice', c: rec.cands.splice(0) }); }, 150);
    };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') { if (this.pcs.get(peer) === rec) this.close(peer); } this.ui(); };
    this.pcs.set(peer, rec);
    if (caller) pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => this.send(peer, { t: 'offer', sdp: pc.localDescription.sdp })).catch(() => {});
    return rec;
  },
  close(peer) {
    const rec = this.pcs.get(peer); if (!rec) return;
    this.pcs.delete(peer);
    try { rec.pc.close(); } catch (e) { /* ya cerrada */ }
    this.ui();
  },
  // cada ~medio segundo: con quién debo estar conectado
  tick() {
    if (!this.on) return;
    if (++this.t % 30) return;
    if (!this.inRoom()) { this.stop(true); return; }
    const me = Net.myPeer(), key = this.myKey();
    const want = Net.peers().filter(p => !p.sameTab && p.kind !== 'agent' && p.presence && p.presence.g === 'golpazo' && p.presence.av === 1 && this.keyOf(p) === key).map(p => p.peer);
    for (const peer of [...this.pcs.keys()]) if (!want.includes(peer)) this.close(peer);
    for (const peer of want) {
      const rec = this.pcs.get(peer), caller = me < peer;
      // conexión trabada: el que ofrece vuelve a intentar
      if (rec && caller && rec.pc.connectionState !== 'connected' && performance.now() - rec.born > 15000) { this.close(peer); continue; }
      if (!rec && caller) this.makePc(peer, true);
    }
    if (this.t % 90 === 0) this.ui(); // nombres al día
  },

  // ---------- franja de caras (debajo del juego) ----------
  ui() {
    if (!this.on) {
      if (this.el) { this.el.remove(); this.el = null; this.tiles.clear(); }
      if (this.barH) { this.barH = 0; window.AV_BAR = 0; resize(); }
      return;
    }
    if (!this.el) {
      const el = document.createElement('div'); el.id = 'av';
      el.innerHTML = '<div class="av-tiles"></div><div class="av-ctl"><button data-a="mic" tabindex="-1"></button><button data-a="cam" tabindex="-1"></button><button data-a="off" tabindex="-1">Salir</button></div>';
      el.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); }); // sin foco: Espacio sigue siendo salto
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.a === 'mic') this.setMic(!this.mic);
        if (b.dataset.a === 'cam') this.setCam(!this.cam);
        if (b.dataset.a === 'off') this.stop(true);
        try { canvas.focus(); } catch (err) { /* nada */ }
      });
      document.body.appendChild(el); this.el = el;
    }
    const list = [{ key: 'me', stream: this.stream, name: 'Tú', me: true }];
    for (const [peer, rec] of this.pcs) list.push({ key: peer, stream: rec.stream, name: Net.nameOf(peer), state: rec.pc.connectionState });
    const box = this.el.querySelector('.av-tiles');
    for (const [k, t] of this.tiles) if (!list.find(x => x.key === k)) { t.remove(); this.tiles.delete(k); }
    for (const it of list) {
      let t = this.tiles.get(it.key);
      if (!t) {
        t = document.createElement('div'); t.className = 'av-tile';
        t.innerHTML = '<video autoplay playsinline></video><span class="av-nm"></span><span class="av-st"></span>';
        const v = t.querySelector('video'); if (it.me) { v.muted = true; v.classList.add('me'); }
        box.appendChild(t); this.tiles.set(it.key, t);
      }
      const v = t.querySelector('video');
      if (it.stream && v.srcObject !== it.stream) { v.srcObject = it.stream; v.play().catch(() => {}); }
      t.querySelector('.av-nm').textContent = it.name; // nombres: siempre como texto
      t.querySelector('.av-st').textContent = it.me ? (this.mic ? '' : '🔇') : (it.state === 'connected' ? '' : 'conectando…');
      t.classList.toggle('off', it.me && !this.cam);
    }
    this.el.querySelector('[data-a=mic]').textContent = this.mic ? '🎤 Micrófono' : '🔇 Silenciado';
    this.el.querySelector('[data-a=cam]').textContent = this.cam ? '📷 Cámara' : '🚫 Sin cámara';
    const h = Math.round(clamp(window.innerHeight * 0.18, 96, 170));
    if (h !== this.barH) { this.barH = h; window.AV_BAR = h; this.el.style.height = h + 'px'; resize(); }
  },
};
window.addEventListener('resize', () => { if (AV.on) AV.ui(); });
window.addEventListener('pagehide', () => { if (AV.on) AV.stop(false); });
