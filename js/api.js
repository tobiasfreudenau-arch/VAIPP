// Verbindung zum Backend (Google Apps Script) + Upload-Warteschlange
window.API = (function () {
  function url() { return localStorage.getItem('vip_api_url') || window.VIP_CONFIG.API_URL; }
  function token() { return localStorage.getItem('vip_token') || ''; }
  function setSession(tok, user) { localStorage.setItem('vip_token', tok); localStorage.setItem('vip_user', JSON.stringify(user)); }
  function user() { try { return JSON.parse(localStorage.getItem('vip_user') || 'null'); } catch (e) { return null; } }
  function clearSession() { localStorage.removeItem('vip_token'); localStorage.removeItem('vip_user'); }
  function configured() { const u = url(); return u && u.indexOf('http') === 0; }

  async function call(action, payload, opts) {
    opts = opts || {};
    if (!configured()) throw mkErr('CONFIG', 'Backend-Adresse nicht eingetragen (js/config.js).');
    const body = Object.assign({ action, token: token() }, payload || {});
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || 60000);
    let res;
    try {
      res = await fetch(url(), { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', signal: ctrl.signal });
    } catch (e) {
      clearTimeout(timer);
      throw mkErr('NET', I18N.t('errNet'));
    }
    clearTimeout(timer);
    let data;
    try { data = await res.json(); } catch (e) { throw mkErr('NET', 'Ungültige Antwort vom Server (' + res.status + ')'); }
    if (!data.ok) {
      if (data.code === 'AUTH') { clearSession(); window.dispatchEvent(new CustomEvent('vip:logout')); }
      throw mkErr(data.code || 'ERR', data.error || I18N.t('errGeneric'));
    }
    return data.data;
  }
  function mkErr(code, msg) { const e = new Error(msg); e.code = code; return e; }

  // ---------- Foto-Upload-Warteschlange ----------
  let uploading = false;
  const listeners = [];
  function onProgress(fn) { listeners.push(fn); }
  function emit(ev) { listeners.forEach(fn => { try { fn(ev); } catch (e) { } }); }

  function blobToDataUrl(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }

  async function pendingPhotos(draftId) {
    const all = draftId ? await DB.byIndex('photos', 'draft', draftId) : await DB.all('photos');
    return all.filter(p => p.status !== 'uploaded');
  }

  async function uploadPhoto(p) {
    const full = await blobToDataUrl(p.fullBlob);
    const thumb = p.thumbBlob ? await blobToDataUrl(p.thumbBlob) : null;
    const r = await call('uploadPhoto', { clientPhotoId: p.clientPhotoId, typ: p.typ, full, thumb, aufgenommenAm: p.aufgenommenAm, fahrzeugId: p.fahrzeugId || '' }, { timeout: 120000 });
    p.status = 'uploaded'; p.photoId = r.photoId;
    await DB.put('photos', p);
    return p;
  }

  async function flush(draftId) {
    if (uploading) return;
    if (!navigator.onLine || !token()) return;
    uploading = true;
    try {
      const list = await pendingPhotos(draftId);
      for (let i = 0; i < list.length; i++) {
        emit({ type: 'photo', left: list.length - i });
        try { await uploadPhoto(list[i]); } catch (e) { if (e.code === 'NET' || e.code === 'AUTH' || e.code === 'CONFIG') { break; } list[i].status = 'error'; list[i].error = e.message; await DB.put('photos', list[i]); }
      }
      emit({ type: 'photo', left: 0 });
      // Postausgang
      const outbox = await DB.all('outbox');
      for (const item of outbox) {
        const open = await pendingPhotos(item.clientId);
        if (open.length) continue;
        try {
          const r = await submitFromOutbox(item);
          await DB.del('outbox', item.clientId);
          emit({ type: 'sent', clientId: item.clientId, result: r });
        } catch (e) {
          if (e.code === 'NET' || e.code === 'AUTH' || e.code === 'CONFIG') break;
          item.error = e.message; item.errorAt = new Date().toISOString(); await DB.put('outbox', item);
          emit({ type: 'senderror', clientId: item.clientId, error: e.message });
        }
      }
    } finally { uploading = false; }
  }

  async function submitFromOutbox(item) {
    const photos = await DB.byIndex('photos', 'draft', item.clientId);
    const byLocal = {}; photos.forEach(p => byLocal[p.localId] = p);
    const pid = l => (l && byLocal[l] && byLocal[l].photoId) || '';
    const d = item.draft;
    const protokoll = {
      clientId: d.clientId, fahrzeugId: d.fahrzeugId || '', neuesFahrzeug: d.neuesFahrzeug || null, datum: d.datum,
      anlass: d.anlass, vonId: d.vonId, anId: d.anId, km: d.km, tank: d.tank, bedingungen: d.bedingungen || [],
      inventar: d.inventar || {}, innenraumBeschaedigt: !!d.innenraumBeschaedigt, innenraumText: d.innenraumText || '', warnleuchten: d.warnleuchten || '', bemerkung: d.bemerkung || '',
      fotos: Object.keys(d.fotos || {}).map(typ => ({ typ, photoId: pid(d.fotos[typ]) })).concat((d.extraFotos || []).map(l => ({ typ: 'sonstiges', photoId: pid(l) }))).filter(f => f.photoId),
      neueSchaeden: (d.neueSchaeden || []).map(s => ({ ansicht: s.ansicht, x: s.x, y: s.y, pos3d: s.pos3d || null, code: s.code, groesse: s.groesse, text: s.text, photoId: pid(s.localPhotoId) })),
      bestaetigteSchaeden: (d.bestaetigteSchaeden || []).map(s => ({ schadenId: s.schadenId, status: s.status, photoId: pid(s.localPhotoId) })),
      unterschriftVon: d.unterschriftVon || '', unterschriftAn: d.unterschriftAn || '', appVersion: window.VIP_CONFIG.APP_VERSION
    };
    const r = await call('submitProtocol', { protokoll }, { timeout: 180000 });
    // lokale Fotos aufräumen
    for (const p of photos) await DB.del('photos', p.localId);
    await DB.del('drafts', item.clientId);
    return r;
  }

  window.addEventListener('online', () => flush());
  setInterval(() => { if (navigator.onLine) flush(); }, 45000);

  return { call, url, token, user, setSession, clearSession, configured, flush, pendingPhotos, onProgress, blobToDataUrl, uploadPhoto, submitFromOutbox, isUploading: () => uploading };
})();
