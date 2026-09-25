'use strict';
// ============================================================
//  VERSIÓN WEB (GitHub Pages, fuera de claude.ai)
//  El juego pide window.claude.use('room' | 'db' | 'user') igual que en claude.ai.
//  Aquí esas tres piezas se arman sobre Supabase:
//   room — un canal de Realtime. La presencia dice quién está conectado; los cambios de estado
//          de cada quien y los mensajes (señales de voz y cámara) viajan por broadcast.
//          Lo que cambia 30 veces por segundo (la foto de la pelea "st" y los controles "inp")
//          va directo entre anfitrión e invitado por WebRTC DataChannel; si esa conexión no
//          se logra, cae al canal a menos cuadros por segundo (y el juego sigue).
//   db   — tabla apyv_docs: se puede leer y agregar, nunca cambiar ni borrar (supabase/schema.sql)
//   user — sesión anónima de Supabase + el nombre que escribe cada quien
//  Solo se instala si no hay un visor de Claude: dentro de claude.ai todo sigue igual.
// ============================================================
(function () {
  const CFG = window.APYV_CONFIG || {};
  if (window.claude && typeof window.claude.use === 'function') return;
  const SB = CFG.client || (typeof supabase !== 'undefined' && CFG.url && CFG.key
    ? supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'apyv-auth' } })
    : null);
  if (!SB) return;
  window.APYV_WEB = true;
  const ROOM = CFG.room || 'apyv-sala-v1';
  const ICE = CFG.ice || [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const FAST = new Set(['st', 'inp']);                  // lo que cambia cada cuadro
  const FALLBACK_MS = { st: 100, inp: 66 };            // sin conexión directa: ~10 y ~15 veces por segundo
  const rid = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } } };
  const isUuid = s => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  // ---------------- usuario ----------------
  let authP = null;
  function auth() {
    if (!authP) authP = (async () => {
      const s = await SB.auth.getSession();
      if (s && s.data && s.data.session) return s.data.session.user;
      const r = await SB.auth.signInAnonymously();
      if (r.error) throw r.error;
      return r.data.user;
    })().catch(e => { console.warn('A pan y verga: sin sesión (¿están activados los inicios anónimos en Supabase?)', e && e.message); return null; });
    return authP;
  }
  function cleanName(s) { return String(s || '').replace(/[<>\n\r\t]/g, '').trim().slice(0, 20); }
  // el nombre se pregunta al entrar a "Jugar online" (no al abrir la página); mientras, uno provisional
  function myName() {
    const n = cleanName(store.get('apyv-name'));
    if (n) return n;
    let auto = cleanName(store.get('apyv-name-auto'));
    if (!auto) { auto = 'Jugador ' + rid(3).toUpperCase(); store.set('apyv-name-auto', auto); }
    return auto;
  }
  function askName(force) {
    if (!force && cleanName(store.get('apyv-name'))) return;
    const n = cleanName(typeof prompt === 'function' ? prompt('¿Cómo te llamas? Así te van a ver en las salas y en el salón de la fama.', cleanName(store.get('apyv-name')) || '') : '');
    if (n) user.rename(n);
  }
  const names = new Map(); // id de cuenta → nombre
  let savedName = false;
  const user = {
    async id() { const u = await auth(); return u ? u.id : (store.get('apyv-local-id') || (store.set('apyv-local-id', 'local-' + rid(12)), store.get('apyv-local-id'))); },
    name: myName,
    askName,
    liveName(id) { return id && id === me.uid ? myName() : names.get(id) || null; },
    rename(n) { n = cleanName(n); if (!n) return; store.set('apyv-name', n); savedName = false; saveName(); room.setMeta(); },
    async profiles(ids) {
      const me = await user.id(), out = {};
      const want = [...new Set(ids)].filter(id => typeof id === 'string');
      const missing = want.filter(id => !names.has(id) && isUuid(id));
      if (missing.length) {
        const r = await SB.from('apyv_players').select('id,name').in('id', missing.slice(0, 200));
        if (r && r.data) for (const row of r.data) names.set(row.id, cleanName(row.name) || 'Alguien');
      }
      for (const id of want) out[id] = { name: id === me ? myName() : (names.get(id) || 'Alguien'), isMe: id === me };
      return out;
    },
  };
  async function saveName() {
    if (savedName) return; savedName = true;
    const u = await auth(); if (!u) return;
    const r = await SB.from('apyv_players').upsert({ id: u.id, name: myName(), updated_at: new Date().toISOString() });
    if (r && r.error) { savedName = false; console.warn('A pan y verga: no se guardó el nombre', r.error.message); }
  }

  // ---------------- base (salón de la fama) ----------------
  const db = {
    doc(path) {
      const [coll, id] = String(path).split('/');
      return {
        async get() {
          const r = await SB.from('apyv_docs').select('body').eq('coll', coll).eq('id', id).maybeSingle();
          if (r.error) throw { code: 'unavailable', message: r.error.message };
          return { exists: !!r.data, data: () => r.data && r.data.body };
        },
        async set(body) {
          const u = await auth();
          if (!u) throw { code: 'not_permitted' };
          const r = await SB.from('apyv_docs').insert({ coll, id, body, owner: u.id });
          if (r.error && r.error.code !== '23505') throw { code: r.error.code === '42501' ? 'not_permitted' : 'unavailable', message: r.error.message }; // 23505: ya estaba guardada
        },
      };
    },
    collection(coll) {
      const q = { coll, desc: true, n: 1000 };
      const api = {
        orderBy(_k, dir) { q.desc = dir !== 'asc'; return api; },
        limit(n) { q.n = n; return api; },
        onSnapshot(cb, err) {
          let dead = false, timer = null;
          const pull = async () => {
            if (dead) return;
            const r = await SB.from('apyv_docs').select('body').eq('coll', q.coll).order('created_at', { ascending: !q.desc }).limit(q.n);
            if (dead) return;
            if (r.error) { if (err) err({ code: 'unavailable', message: r.error.message }); return; }
            cb({ docs: r.data.map(row => ({ data: () => row.body })) });
            timer = setTimeout(pull, 20000); // se refresca cada 20 s mientras está abierta
          };
          pull().catch(e => err && err({ code: 'unavailable', message: e && e.message }));
          return () => { dead = true; clearTimeout(timer); };
        },
      };
      return api;
    },
  };

  // ---------------- sala ----------------
  const me = { peer: rid(10), state: {}, uid: null };
  const others = new Map(); // peer → { presence, by, nm, online, seq }
  const handlers = {};
  const conn = { up: false, on: [], off: [] };
  let ch = null, lastFull = 0;
  const fastPending = {}, fastTimer = {};
  const slowPending = {}; let slowQueued = false;

  function other(peer) { let o = others.get(peer); if (!o) others.set(peer, o = { presence: {}, by: null, nm: '', online: false, seq: 0 }); return o; }
  function send(event, payload) {
    if (!ch || !conn.up) return Promise.resolve('closed');
    return ch.send({ type: 'broadcast', event, payload }).catch(() => 'error');
  }
  function sendFull() { lastFull = performance.now(); return send('P', { peer: me.peer, full: 1, patch: me.state }); }
  function flushSlow() {
    slowQueued = false;
    const patch = Object.assign({}, slowPending); for (const k in slowPending) delete slowPending[k];
    if (Object.keys(patch).length) send('P', { peer: me.peer, patch });
  }
  // compañeros de pelea: el anfitrión y sus invitados (a ellos les llega lo rápido)
  function partners() {
    const out = [];
    if (me.state.role === 'host') { for (const [peer, o] of others) if (o.online && o.presence.role === 'guest' && o.presence.join === me.peer) out.push(peer); }
    else if (me.state.role === 'guest' && me.state.join && others.has(me.state.join)) out.push(me.state.join);
    return out;
  }
  function sendFast(k, v) {
    const ps = partners(); let viaCanal = false;
    for (const peer of ps) { const l = links.get(peer); if (l && l.dc && l.dc.readyState === 'open') { try { l.dc.send(JSON.stringify({ s: ++l.out, k, v })); } catch (e) { viaCanal = true; } } else viaCanal = true; }
    if (!viaCanal) return;
    fastPending[k] = v;
    if (!fastTimer[k]) fastTimer[k] = setTimeout(() => { fastTimer[k] = null; const p = {}; p[k] = fastPending[k]; send('P', { peer: me.peer, patch: p }); }, FALLBACK_MS[k] || 100);
  }

  // conexiones directas (DataChannel) con los compañeros de pelea; el invitado llama
  const links = new Map(); // peer → { pc, dc, out, in, born }
  function closeLink(peer) { const l = links.get(peer); if (!l) return; links.delete(peer); try { l.dc && l.dc.close(); } catch (e) { /* ya cerrado */ } try { l.pc.close(); } catch (e) { /* ya cerrado */ } }
  function wireDc(l, dc) {
    l.dc = dc;
    dc.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || typeof m.k !== 'string' || !FAST.has(m.k) || !(m.s > l.in)) return; // sin orden garantizado: lo viejo se tira
      l.in = m.s; other(l.peer).presence[m.k] = m.v;
    };
  }
  function makeLink(peer, caller) {
    closeLink(peer);
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const l = { peer, pc, dc: null, out: 0, in: 0, born: performance.now(), cands: [], candT: null };
    links.set(peer, l);
    pc.onicecandidate = e => {
      if (!e.candidate) return;
      l.cands.push(e.candidate.toJSON());
      if (!l.candT) l.candT = setTimeout(() => { l.candT = null; if (links.get(peer) === l) send('D', { peer: me.peer, to: peer, t: 'ice', c: l.cands.splice(0) }); }, 120);
    };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState) && links.get(peer) === l) closeLink(peer); };
    if (caller) {
      wireDc(l, pc.createDataChannel('g', { ordered: false, maxRetransmits: 0 }));
      pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => send('D', { peer: me.peer, to: peer, t: 'offer', sdp: pc.localDescription.sdp })).catch(() => closeLink(peer));
    } else pc.ondatachannel = e => wireDc(l, e.channel);
    return l;
  }
  async function onSignal(d) {
    if (!d || d.to !== me.peer || typeof d.peer !== 'string') return;
    const peer = d.peer;
    try {
      if (d.t === 'offer' && typeof d.sdp === 'string') {
        const l = makeLink(peer, false);
        await l.pc.setRemoteDescription({ type: 'offer', sdp: d.sdp });
        await l.pc.setLocalDescription(await l.pc.createAnswer());
        send('D', { peer: me.peer, to: peer, t: 'answer', sdp: l.pc.localDescription.sdp });
      } else if (d.t === 'answer' && typeof d.sdp === 'string') {
        const l = links.get(peer); if (l && l.pc.signalingState === 'have-local-offer') await l.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
      } else if (d.t === 'ice' && Array.isArray(d.c)) {
        const l = links.get(peer); if (l) for (const c of d.c.slice(0, 40)) await l.pc.addIceCandidate(c).catch(() => {});
      }
    } catch (e) { closeLink(peer); }
  }
  // cada medio segundo: abrir las conexiones que hacen falta y cerrar las que sobran
  setInterval(() => {
    if (!conn.up || typeof RTCPeerConnection === 'undefined') return;
    const want = partners();
    for (const peer of [...links.keys()]) if (!want.includes(peer)) closeLink(peer);
    if (me.state.role !== 'guest') return;
    for (const peer of want) {
      const l = links.get(peer);
      const stale = l && (!l.dc || l.dc.readyState !== 'open') && performance.now() - l.born > 12000;
      if (!l || stale) makeLink(peer, true);
    }
  }, 500);

  function connect() {
    if (ch) return;
    ch = SB.channel(ROOM, { config: { presence: { key: me.peer }, broadcast: { self: false, ack: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState(), online = new Set(Object.keys(state));
      let fresh = false;
      for (const peer of online) {
        if (peer === me.peer) continue;
        const o = other(peer), meta = (state[peer] && state[peer][0]) || {};
        if (!o.online) fresh = true;
        o.online = true; o.by = typeof meta.by === 'string' ? meta.by : null; o.nm = cleanName(meta.nm);
        if (o.by && o.nm) names.set(o.by, o.nm);
      }
      for (const [peer, o] of others) if (!online.has(peer)) { others.delete(peer); closeLink(peer); }
      // alguien nuevo: que conozca mi estado completo (lo que ya había mandado no le llegó)
      if (fresh && performance.now() - lastFull > 250) sendFull();
    });
    ch.on('broadcast', { event: 'P' }, ({ payload: m }) => {
      if (!m || typeof m.peer !== 'string' || m.peer === me.peer || !m.patch || typeof m.patch !== 'object') return;
      const o = other(m.peer);
      if (m.full) o.presence = Object.assign({}, m.patch); else Object.assign(o.presence, m.patch);
    });
    ch.on('broadcast', { event: 'E' }, ({ payload: m }) => {
      if (!m || typeof m.peer !== 'string' || typeof m.ev !== 'string') return;
      for (const h of handlers[m.ev] || []) try { h({ peer: m.peer, data: m.data, sameTab: false }); } catch (e) { console.error(e); }
    });
    ch.on('broadcast', { event: 'D' }, ({ payload }) => { onSignal(payload); });
    ch.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        conn.up = true;
        await room.setMeta();
        sendFull();
        for (const f of conn.on) try { f(true); } catch (e) { /* nada */ }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const was = conn.up; conn.up = false;
        if (was) for (const f of conn.off) try { f(status); } catch (e) { /* nada */ }
      }
    });
  }
  const room = {
    async setMeta() { if (!ch || !conn.up) return; me.uid = await user.id(); await ch.track({ by: me.uid, nm: myName(), t: Date.now() }).catch(() => {}); },
    presence(patch) {
      if (!patch || typeof patch !== 'object') return Promise.resolve();
      Object.assign(me.state, patch);
      for (const k in patch) {
        if (FAST.has(k) && patch[k] !== null) sendFast(k, patch[k]);
        else { slowPending[k] = patch[k]; if (!slowQueued) { slowQueued = true; setTimeout(flushSlow, 0); } }
      }
      return Promise.resolve();
    },
    peers() {
      const list = [{ peer: me.peer, sameTab: true, presence: me.state, by: me.uid, kind: 'user' }];
      for (const [peer, o] of others) if (o.online) list.push({ peer, sameTab: false, presence: o.presence, by: o.by, kind: 'user' });
      return list;
    },
    emit(ev, data) {
      return send('E', { peer: me.peer, ev, data }).then(r => { if (r !== 'ok' && r !== undefined) throw { code: r === 'rate limited' ? 'rate_limited' : 'unavailable' }; });
    },
    on(ev, cb) { (handlers[ev] || (handlers[ev] = [])).push(cb); return () => { handlers[ev] = handlers[ev].filter(h => h !== cb); }; },
    onConnection(onUp, onDown) { if (onUp) conn.on.push(onUp); if (onDown) conn.off.push(onDown); if (conn.up && onUp) onUp(true); },
    // para pruebas y diagnóstico
    _debug() { return { me: me.peer, up: conn.up, links: [...links].map(([p, l]) => [p, l.dc ? l.dc.readyState : 'none', l.pc.connectionState]), others: [...others.keys()] }; },
  };

  window.claude = {
    web: true,
    async use(name) {
      if (name === 'room') { connect(); saveName(); return room; }
      if (name === 'db') return db;
      if (name === 'user') return user;
      return null;
    },
  };
})();
