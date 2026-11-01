// Lokaler Speicher (IndexedDB): Entwürfe, Fotos, Postausgang, Stammdaten-Cache
window.DB = (function () {
  const NAME = 'vip_fahrzeuguebergabe', VER = 1;
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('drafts')) d.createObjectStore('drafts', { keyPath: 'clientId' });
        if (!d.objectStoreNames.contains('photos')) { const s = d.createObjectStore('photos', { keyPath: 'localId' }); s.createIndex('draft', 'draftId'); s.createIndex('status', 'status'); }
        if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'clientId' });
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'k' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return open().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      try { out = fn(s); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }
  function req(store, mode, fn) {
    return open().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const r = fn(t.objectStore(store));
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  }
  return {
    put: (store, obj) => tx(store, 'readwrite', s => s.put(obj)),
    get: (store, key) => req(store, 'readonly', s => s.get(key)),
    del: (store, key) => tx(store, 'readwrite', s => s.delete(key)),
    all: (store) => req(store, 'readonly', s => s.getAll()),
    byIndex: (store, index, value) => req(store, 'readonly', s => s.index(index).getAll(value)),
    kvGet: (k) => req('kv', 'readonly', s => s.get(k)).then(r => r ? r.v : null),
    kvSet: (k, v) => tx('kv', 'readwrite', s => s.put({ k, v })),
    clearAll: async () => { for (const s of ['drafts', 'photos', 'outbox', 'kv']) await tx(s, 'readwrite', st => st.clear()); }
  };
})();
