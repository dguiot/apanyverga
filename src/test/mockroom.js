// Sala simulada (BroadcastChannel) con la misma forma que la capacidad "room",
// más "user" (ids y nombres falsos) y "db" (localStorage compartido entre pestañas)
(() => {
  const peerId = Math.random().toString(36).slice(2, 10);
  const myBy = 'u_' + peerId;
  const NAMES = ['Ana', 'Beto', 'Caro', 'Dani'];
  const bc = new BroadcastChannel('golpazo-room');
  const myPres = {}; const others = new Map();
  let snap = null; const LAT = 40;
  window.__presMax = 0;
  const rebuild = () => {
    const arr = [{ peer: peerId, by: myBy, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze(Object.assign({}, myPres)), updatedAt: Date.now() }];
    for (const [p, o] of others) arr.push({ peer: p, by: o.by, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: o.presence, updatedAt: o.t });
    snap = Object.freeze(arr);
  };
  rebuild();
  const handlers = {};
  const deliver = (m, self) => { for (const fn of handlers[m.topic] || []) fn({ peer: m.peer, by: m.by, isMe: self, sameTab: self, kind: 'viewer', guest: false, topic: m.topic, data: JSON.parse(JSON.stringify(m.data)) }); };
  bc.onmessage = e => setTimeout(() => {
    const m = e.data; if (m.db) return;
    if (m.emit) { deliver(m, false); return; }
    others.set(m.peer, { presence: Object.freeze(m.presence), by: m.by, t: Date.now() }); rebuild();
  }, LAT);
  setInterval(() => {
    bc.postMessage({ peer: peerId, by: myBy, presence: myPres });
    const now = Date.now(); for (const [p, o] of others) if (now - o.t > 3000) others.delete(p);
    rebuild();
  }, 33);
  const room = {
    presence(patch) { for (const k in patch) { if (patch[k] === null) delete myPres[k]; else myPres[k] = patch[k]; } window.__presMax = Math.max(window.__presMax, JSON.stringify(myPres).length); rebuild(); return Promise.resolve(); },
    peers() { return snap; }, onPeers() { return () => {}; }, onConnection(fn) { setTimeout(() => fn(true)); return () => {}; }, connected() { return true; },
    emit(topic, data) {
      if (window.__emitDenied) return Promise.reject({ code: 'not_permitted', message: 'tema solo para editores' });
      if (JSON.stringify(data).length > 4096) return Promise.reject({ code: 'invalid_argument', message: 'más de 4 KiB' });
      window.__emitMax = Math.max(window.__emitMax || 0, JSON.stringify(data).length); window.__emits = (window.__emits || 0) + 1;
      const m = { emit: true, topic, data, peer: peerId, by: myBy };
      bc.postMessage(m); setTimeout(() => deliver(m, true)); return Promise.resolve();
    },
    on(topic, fn) { (handlers[topic] = handlers[topic] || []).push(fn); return () => { handlers[topic] = handlers[topic].filter(f => f !== fn); }; },
  };
  // nombre estable por id (orden de llegada en localStorage)
  const nameFor = id => {
    let reg = JSON.parse(localStorage.getItem('__mock_names') || '[]');
    if (!reg.includes(id)) { reg.push(id); localStorage.setItem('__mock_names', JSON.stringify(reg)); }
    return NAMES[reg.indexOf(id) % NAMES.length];
  };
  nameFor(myBy);
  const user = {
    id: async () => myBy, me: async () => ({ id: myBy, name: nameFor(myBy), avatarUrl: '', color: '#2ec4b6', email: null, isOwner: false, canEdit: false }),
    profiles: async ids => { const o = {}; for (const id of [].concat(ids)) o[id] = { id, name: id.startsWith('u_') ? nameFor(id) : '', avatarUrl: '', color: '#3a86ff', email: null, isMe: id === myBy, guest: false }; return o; },
    isOwner: async () => false, canEdit: async () => false, can: async () => null,
  };
  const KEY = '__mock_db';
  const load = () => JSON.parse(localStorage.getItem(KEY) || '{}');
  const docSnap = (id, body) => ({ id, exists: !!body, data: () => body ? JSON.parse(JSON.stringify(body)) : undefined, metadata: { fromCache: false, hasPendingWrites: false } });
  const db = {
    doc(path) {
      return {
        id: path.split('/').pop(), path,
        async get() { return docSnap(path.split('/').pop(), load()[path]); },
        async set(body) { if (window.__dbReadOnly) throw { code: 'invalid_argument', message: 'solo vista' }; const d = load(); d[path] = body; localStorage.setItem(KEY, JSON.stringify(d)); window.__dbWrites = (window.__dbWrites || 0) + 1; },
      };
    },
    collection(cpath) {
      const q = { ord: null, lim: 1000 };
      const api = {
        orderBy(f, dir) { q.ord = [f, dir]; return api; }, limit(n) { q.lim = n; return api; },
        onSnapshot(next) {
          let last = '';
          const tick = () => {
            const d = load(), docs = Object.keys(d).filter(k => k.startsWith(cpath + '/')).map(k => docSnap(k.split('/').pop(), d[k]));
            if (q.ord) docs.sort((a, b) => (q.ord[1] === 'desc' ? -1 : 1) * ((a.data()[q.ord[0]] || 0) - (b.data()[q.ord[0]] || 0)));
            const j = JSON.stringify(docs.map(x => x.id));
            if (j !== last) { last = j; next({ docs: docs.slice(0, q.lim), size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }); }
          };
          tick(); const h = setInterval(tick, 400); return () => clearInterval(h);
        },
      };
      return api;
    },
  };
  window.claude = { use: async n => (n === 'room' ? room : n === 'user' ? user : n === 'db' && !window.__noDb ? db : null) };
  window.__peerId = peerId;
})();
