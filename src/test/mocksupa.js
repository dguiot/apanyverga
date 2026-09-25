// Supabase simulado para probar la versión web sin red: la misma forma que supabase-js v2 en lo que usa
// js/webshim.js (auth anónima, tablas con select/eq/in/order/limit/maybeSingle/insert/upsert,
// canales Realtime con presencia y broadcast). Las pestañas se hablan por BroadcastChannel;
// la "base" vive en localStorage compartido. Cada pestaña tiene su propia cuenta y su propio nombre.
(() => {
  const tab = sessionStorage.getItem('__tab') || (sessionStorage.setItem('__tab', Math.random().toString(36).slice(2, 8)), sessionStorage.getItem('__tab'));
  // nombre y sesión por pestaña (en la vida real cada quien está en su navegador)
  const gi = Storage.prototype.getItem, si = Storage.prototype.setItem;
  Storage.prototype.getItem = function (k) { return this === localStorage && /^apyv-/.test(k) ? gi.call(sessionStorage, k) : gi.call(this, k); };
  Storage.prototype.setItem = function (k, v) { return this === localStorage && /^apyv-/.test(k) ? si.call(sessionStorage, k, v) : si.call(this, k, v); };
  const uuid = () => crypto.randomUUID();
  const LAT = 30;
  window.__mockStats = { bcP: 0, bcPfast: 0, bcE: 0, bcD: 0, inserts: 0 };
  // ---------- auth ----------
  const auth = {
    async getSession() { const u = sessionStorage.getItem('__uid'); return { data: { session: u ? { user: { id: u } } : null }, error: null }; },
    async signInAnonymously() {
      if (window.__noAnon) return { data: {}, error: { message: 'Anonymous sign-ins are disabled' } };
      const id = uuid(); sessionStorage.setItem('__uid', id); return { data: { user: { id }, session: { user: { id } } }, error: null };
    },
  };
  // ---------- tablas ----------
  const KEY = t => '__mock_sb_' + t;
  const rows = t => JSON.parse(localStorage.getItem(KEY(t)) || '[]');
  const save = (t, r) => localStorage.setItem(KEY(t), JSON.stringify(r));
  function from(table) {
    const q = { f: [], ord: null, lim: null, single: false, op: 'select', row: null };
    const run = async () => {
      await new Promise(r => setTimeout(r, LAT));
      if (q.op === 'insert') {
        if (window.__dbReadOnly) return { data: null, error: { code: '42501', message: 'rls' } };
        const r = rows(table);
        if (table === 'apyv_docs' && r.some(x => x.coll === q.row.coll && x.id === q.row.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        r.push(Object.assign({ created_at: new Date(Date.now() + r.length).toISOString() }, q.row)); save(table, r); window.__mockStats.inserts++;
        return { data: null, error: null };
      }
      if (q.op === 'upsert') { const r = rows(table).filter(x => x.id !== q.row.id); r.push(q.row); save(table, r); return { data: null, error: null }; }
      let r = rows(table).filter(x => q.f.every(([k, v, op]) => op === 'in' ? v.includes(x[k]) : x[k] === v));
      if (q.ord) r.sort((a, b) => (a[q.ord[0]] < b[q.ord[0]] ? -1 : 1) * (q.ord[1] ? 1 : -1));
      if (q.lim) r = r.slice(0, q.lim);
      return { data: q.single ? (r[0] || null) : JSON.parse(JSON.stringify(r)), error: null };
    };
    const api = {
      select() { return api; }, eq(k, v) { q.f.push([k, v]); return api; }, in(k, v) { q.f.push([k, v, 'in']); return api; },
      order(k, o) { q.ord = [k, !o || o.ascending !== false]; return api; }, limit(n) { q.lim = n; return api; },
      maybeSingle() { q.single = true; return api; },
      insert(row) { q.op = 'insert'; q.row = row; return api; }, upsert(row) { q.op = 'upsert'; q.row = row; return api; },
      then(res, rej) { return run().then(res, rej); },
    };
    return api;
  }
  // ---------- realtime ----------
  const bc = new BroadcastChannel('__mock_sb_rt');
  const chans = [];
  bc.onmessage = e => setTimeout(() => { for (const c of chans) c._rx(e.data); }, LAT);
  function channel(name, opts) {
    const key = (opts && opts.config && opts.config.presence && opts.config.presence.key) || uuid();
    const hs = [], pres = {}, seen = {};
    let meta = null, cbStatus = null;
    const fire = (type, ev, arg) => { for (const h of hs) if (h.type === type && h.ev === ev) h.cb(arg); };
    const c = {
      on(type, filter, cb) { hs.push({ type, ev: filter.event, cb }); return c; },
      subscribe(cb) {
        cbStatus = cb; chans.push(c);
        setTimeout(() => { bc.postMessage({ ch: name, k: 'hello', from: key }); cb && cb('SUBSCRIBED'); }, LAT);
        return c;
      },
      async track(m) { meta = m; pres[key] = [m]; seen[key] = Date.now(); bc.postMessage({ ch: name, k: 'track', from: key, meta: m }); fire('presence', 'sync'); return 'ok'; },
      presenceState() { return JSON.parse(JSON.stringify(pres)); },
      async send(m) {
        if (window.__mockDown) return 'error';
        const s = window.__mockStats; if (m.event === 'P') { s.bcP++; if (m.payload && m.payload.patch && ('st' in m.payload.patch || 'inp' in m.payload.patch)) s.bcPfast++; } else if (m.event === 'E') s.bcE++; else if (m.event === 'D') s.bcD++;
        bc.postMessage({ ch: name, k: 'bc', from: key, event: m.event, payload: m.payload }); return 'ok';
      },
      _rx(m) {
        if (m.ch !== name || m.from === key) return;
        if (m.k === 'hello') { if (meta) bc.postMessage({ ch: name, k: 'track', from: key, meta }); return; }
        if (m.k === 'track') { pres[m.from] = [m.meta]; seen[m.from] = Date.now(); fire('presence', 'sync'); return; }
        if (m.k === 'leave') { delete pres[m.from]; fire('presence', 'sync'); return; }
        if (m.k === 'bc') fire('broadcast', m.event, { type: 'broadcast', event: m.event, payload: JSON.parse(JSON.stringify(m.payload)) });
      },
    };
    // latido de presencia; quien deja de latir sale de la sala
    setInterval(() => {
      if (meta) bc.postMessage({ ch: name, k: 'track', from: key, meta });
      const now = Date.now(); let ch = false;
      for (const k in pres) if (k !== key && now - (seen[k] || 0) > 3000) { delete pres[k]; ch = true; }
      if (ch) fire('presence', 'sync');
    }, 1000);
    addEventListener('pagehide', () => bc.postMessage({ ch: name, k: 'leave', from: key }));
    return c;
  }
  window.__mockClient = { auth, from, channel };
})();
