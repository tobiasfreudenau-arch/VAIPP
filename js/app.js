// VIP Fahrzeugübergabe – App-Logik (Router, Ansichten, Protokoll-Assistent)
(function () {
  const t = I18N.t;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtD = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return String(iso); return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const fmtDT = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return String(iso); return fmtD(iso) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));
  const CODES = { B: 'Beule', D: 'Delle', F: 'Fehlt', G: 'Gebrochen', K: 'Kratzer', R: 'Rost', S: 'Steinschlag', T: 'Techn. Mangel', U: 'Undicht', V: 'Verformung', X: 'Bruch/Riss', A: 'Unfall' };
  const INVENTAR = [['schluessel', 'Schlüssel', 1], ['kfz_schein', 'KFZ-Schein', 1], ['reserverad', 'Reserverad', 0], ['tuev_bericht', 'TÜV/AU-Bericht', 0], ['warnweste', 'Warnweste', 1], ['warndreieck', 'Warndreieck', 1], ['verbandskasten', 'Verbandskasten', 1], ['sicherungsnetz', 'Sicherungsnetz', 0], ['sicherungsstange', 'Sicherungsstange', 0], ['steckbolzen', 'Steckbolzen', 0], ['kamera_laderaum', 'Kamera Laderaum', 0], ['kamera_dashcam', 'Kamera Dashcam', 0], ['navi', 'Navi', 0]];
  const ANLAESSE = ['wechsel', 'urlaub', 'krank', 'feierabend', 'werkstatt', 'rueckgabe', 'uebernahme', 'sonstiges'];
  const ANLASS_TXT = { wechsel: 'Fahrzeugwechsel', urlaub: 'Urlaub', krank: 'Krankheit', feierabend: 'Feierabend / Abstellen', werkstatt: 'Werkstatt', rueckgabe: 'Rückgabe an Firma', uebernahme: 'Übernahme von Firma', sonstiges: 'Sonstiges' };
  const PHOTO_REQ = ['front', 'heck', 'links', 'rechts', 'laderaum', 'cockpit'];
  const PHOTO_LBL = { front: 'front', heck: 'rear', links: 'left', rechts: 'right', laderaum: 'cargo', cockpit: 'cockpit', tacho: 'kmPhoto' };
  const VIEW_LBL = { links: 'left', rechts: 'right', front: 'front', heck: 'rear', dach: 'roof', innen: 'interior' };

  const state = { user: API.user(), boot: null, draft: null, thumbs: {}, lastRoute: '' };
  const LOGOS = { management: 'img/logo.png', beide: 'img/logo.png', parkplatz: 'img/logo-viparking.png', ups: 'img/logo-viparcel.png' };
  function logoFor(u) { return (u && LOGOS[u.gruppe]) || 'img/logo.png'; }
  let logoSrc = 'img/logo.png';

  /* ---------- UI-Helfer ---------- */
  function toast(msg, err) { const el = document.createElement('div'); el.className = 'toast' + (err ? ' err' : ''); el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), err ? 4200 : 2600); }
  function overlay(msg) { let o = $('#overlay'); if (!o) { o = document.createElement('div'); o.id = 'overlay'; o.className = 'loading-overlay'; document.body.appendChild(o); } o.innerHTML = '<div class="spinner"></div><div>' + esc(msg) + '</div>'; }
  function hideOverlay() { const o = $('#overlay'); if (o) o.remove(); }
  function sheet(html) {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet"><div class="grab"></div>' + html + '</div>';
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    return { el: bg, close };
  }
  function confirmDlg(msg) { return new Promise(res => { const s = sheet('<p style="font-size:17px">' + esc(msg) + '</p><div class="btn-row mt"><button class="btn ghost" id="c-no">' + t('cancel') + '</button><button class="btn" id="c-yes">OK</button></div>'); $('#c-no', s.el).onclick = () => { s.close(); res(false); }; $('#c-yes', s.el).onclick = () => { s.close(); res(true); }; }); }
  function topbar(title, opts) {
    opts = opts || {}; logoSrc = logoFor(state.user);
    return '<div class="topbar">' + (opts.back ? '<button class="back" data-nav="' + opts.back + '">‹</button>' : '<img class="logo" src="' + logoSrc + '" alt="">') +
      '<div class="title">' + esc(title) + '</div>' + (opts.right || '') + '</div>' + (navigator.onLine ? '' : '<div class="offline-bar">' + t('offline') + '</div>');
  }
  function render(html) { $('#app').innerHTML = html; bindNav(); window.scrollTo(0, 0); }
  function bindNav() { $$('[data-nav]').forEach(b => b.onclick = () => go(b.getAttribute('data-nav'))); }
  function go(route) { location.hash = '#' + route; }
  function userName(id) { if (id === 'firma') return t('company'); const m = (state.boot && state.boot.mitarbeiter || []).find(x => x.id === id); return m ? m.name : (state.user && state.user.id === id ? state.user.name : '?'); }
  function isMgmt() { return state.user && (state.user.rolle === 'admin' || state.user.rolle === 'dispo'); }
  function isAdmin() { return state.user && state.user.rolle === 'admin'; }
  function errMsg(e) { return (e && e.message) || t('errGeneric'); }

  /* ---------- Bootstrap ---------- */
  async function boot(force) {
    if (!state.user) return null;
    if (state.boot && !force) return state.boot;
    try {
      state.boot = await API.call('bootstrap');
      state.user = state.boot.user; localStorage.setItem('vip_user', JSON.stringify(state.user));
      await DB.kvSet('boot', state.boot);
    } catch (e) {
      if (e.code === 'AUTH') return null;
      state.boot = (await DB.kvGet('boot')) || { mitarbeiter: [], fahrzeuge: [], offeneBestaetigungen: [] };
    }
    return state.boot;
  }

  /* ---------- Login ---------- */
  function viewLogin(tab) {
    tab = tab || 'login';
    const html = '<div class="login-wrap"><img src="' + logoSrc + '" alt="VIP Freudenau GmbH"><div class="card gold">' +
      '<div class="tabs"><button data-tab="login" class="' + (tab === 'login' ? 'on' : '') + '">' + t('login') + '</button><button data-tab="register" class="' + (tab === 'register' ? 'on' : '') + '">' + t('register') + '</button><button data-tab="forgot" class="' + (tab === 'forgot' ? 'on' : '') + '">' + t('forgot') + '</button></div>' +
      '<form id="lf" autocomplete="on">' +
      '<label class="lbl">' + t('email') + '</label><input type="email" id="f-email" autocomplete="username" inputmode="email" autocapitalize="off" required>' +
      (tab === 'login' ? '<label class="lbl">' + t('password') + '</label><input type="password" id="f-pw" autocomplete="current-password" required>' : '') +
      (tab === 'register' ? '<p class="small muted mt">' + t('registerHint') + '</p><label class="lbl">' + t('password') + '</label><input type="password" id="f-pw" autocomplete="new-password" required minlength="6"><label class="lbl">' + t('password2') + '</label><input type="password" id="f-pw2" autocomplete="new-password" required>' : '') +
      (tab === 'forgot' ? '<div id="forgot2" class="hidden"><label class="lbl">' + t('code') + '</label><input type="text" id="f-code" inputmode="numeric" maxlength="6"><label class="lbl">' + t('newPassword') + '</label><input type="password" id="f-pw" autocomplete="new-password" minlength="6"></div>' : '') +
      '<div class="field-error hidden" id="f-err"></div>' +
      '<button class="btn mt" type="submit" id="f-submit">' + (tab === 'login' ? t('loginBtn') : tab === 'register' ? t('registerBtn') : t('sendCode')) + '</button>' +
      '</form>' + (tab === 'login' ? '<button class="btn ghost mt" data-tab="register">' + t('firstTime') + '</button>' : '') +
      '<div class="row mt" style="justify-content:center;gap:16px"><button class="btn small ghost" data-lang="de">Deutsch</button><button class="btn small ghost" data-lang="en">English</button></div>' +
      '</div><p class="small muted mt center">' + t('app') + ' · v' + window.VIP_CONFIG.APP_VERSION + '</p></div>';
    render(html);
    $$('[data-tab]').forEach(b => b.onclick = () => viewLogin(b.getAttribute('data-tab')));
    $$('[data-lang]').forEach(b => b.onclick = () => { I18N.setLang(b.getAttribute('data-lang')); viewLogin(tab); });
    const savedMail = localStorage.getItem('vip_last_email'); if (savedMail) $('#f-email').value = savedMail;
    let codeStage = false;
    $('#lf').onsubmit = async e => {
      e.preventDefault();
      const err = $('#f-err'); err.classList.add('hidden');
      const email = $('#f-email').value.trim(); localStorage.setItem('vip_last_email', email);
      const btn = $('#f-submit'); btn.disabled = true;
      try {
        if (tab === 'login') {
          const r = await API.call('login', { email, password: $('#f-pw').value, geraet: navigator.userAgent });
          API.setSession(r.token, r.user); state.user = r.user; state.boot = null; go('home');
        } else if (tab === 'register') {
          if ($('#f-pw').value !== $('#f-pw2').value) throw new Error(t('pwMismatch'));
          const r = await API.call('register', { email, password: $('#f-pw').value, geraet: navigator.userAgent });
          API.setSession(r.token, r.user); state.user = r.user; state.boot = null; go('home');
        } else if (!codeStage) {
          await API.call('forgotPassword', { email });
          toast(t('codeSent')); codeStage = true; $('#forgot2').classList.remove('hidden'); btn.textContent = t('resetBtn');
        } else {
          const r = await API.call('resetPassword', { email, code: $('#f-code').value.trim(), password: $('#f-pw').value, geraet: navigator.userAgent });
          API.setSession(r.token, r.user); state.user = r.user; state.boot = null; go('home');
        }
      } catch (ex) { err.textContent = errMsg(ex); err.classList.remove('hidden'); }
      btn.disabled = false;
    };
  }

  /* ---------- Home ---------- */
  async function viewHome() {
    render(topbar(t('app'), { right: '<button class="icon-btn" data-nav="settings">⚙︎</button>' }) + '<main><div class="spinner"></div></main>');
    const b = await boot();
    if (!b) return go('login');
    const drafts = await DB.all('drafts');
    const outbox = await DB.all('outbox');
    const draft = drafts.filter(d => !outbox.find(o => o.clientId === d.clientId)).sort((a, b2) => (b2.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
    let html = topbar(t('app'), { right: '<button class="icon-btn" data-nav="settings">⚙︎</button>' }) + '<main>';
    html += '<p class="muted" style="margin-bottom:12px">Hallo ' + esc(state.user.vorname || state.user.name) + '</p>';
    if (outbox.length) html += '<div class="card gold"><h2>' + t('pending') + ' (' + outbox.length + ')</h2><p class="small muted">' + t('pendingHint') + '</p>' + outbox.map(o => '<div class="small">' + esc(o.draft.kennzeichenAnzeige || '') + ' · ' + fmtDT(o.createdAt) + (o.error ? ' <span class="danger">' + esc(o.error) + '</span>' : '') + '</div>').join('') + '<button class="btn small secondary mt" id="retry">↻ ' + t('next') + '</button></div>';
    if (draft) html += '<div class="card gold"><h2>' + t('draftFound') + '</h2><p class="small muted">' + esc(draft.kennzeichenAnzeige || '–') + ' · ' + t('step') + ' ' + (draft.step || 1) + '/8 · ' + fmtDT(draft.updatedAt) + '</p><div class="btn-row"><button class="btn" id="cont">' + t('continueDraft') + '</button><button class="btn ghost" id="disc">' + t('discardDraft') + '</button></div></div>';
    (b.offeneBestaetigungen || []).forEach(p => { html += '<div class="card danger"><h2>' + t('toConfirm') + '</h2><p class="small">' + t('toConfirmHint') + '</p><button class="list-item" data-nav="protocol/' + p.id + '"><div class="main"><b>' + esc(p.kennzeichen) + ' · ' + esc(p.nr) + '</b><span>' + fmtDT(p.datum) + ' · ' + esc(p.von) + ' → ' + esc(p.an) + '</span></div><div class="chev">›</div></button></div>'; });
    html += '<button class="btn big" id="new">＋ ' + t('newProtocol') + '</button><div class="gold-line"></div>';
    html += '<div class="menu">' +
      '<button class="tile" data-nav="protocols"><span class="ico">📋</span>' + t('myProtocols') + '</button>' +
      '<button class="tile" data-nav="vehicles"><span class="ico">🚐</span>' + t('vehicles') + '<span class="cnt badge grey">' + (b.fahrzeuge || []).length + '</span></button>' +
      (isMgmt() ? '<button class="tile" data-nav="dashboard"><span class="ico">📊</span>' + t('dashboard') + '</button><button class="tile" data-nav="damages"><span class="ico">⚠️</span>' + t('damages') + '</button>' : '') +
      (isAdmin() ? '<button class="tile" data-nav="users"><span class="ico">👥</span>' + t('users') + '</button>' : '') +
      '<button class="tile" data-nav="settings"><span class="ico">⚙️</span>' + t('settings') + '</button></div>';
    html += '</main>';
    render(html);
    $('#new').onclick = async () => { if (draft) { const ok = await confirmDlg(t('reallyDiscard')); if (!ok) return; await discardDraft(draft.clientId); } startDraft(); };
    if (draft) { $('#cont').onclick = () => { state.draft = draft; go('new'); }; $('#disc').onclick = async () => { if (await confirmDlg(t('reallyDiscard'))) { await discardDraft(draft.clientId); viewHome(); } }; }
    if ($('#retry')) $('#retry').onclick = () => { API.flush(); toast('…'); };
  }

  async function discardDraft(clientId) {
    const photos = await DB.byIndex('photos', 'draft', clientId);
    for (const p of photos) await DB.del('photos', p.localId);
    await DB.del('drafts', clientId);
    if (state.draft && state.draft.clientId === clientId) state.draft = null;
  }

  /* ---------- Assistent (Wizard) ---------- */
  function startDraft() {
    state.draft = { clientId: uuid(), step: 1, createdAt: new Date().toISOString(), fahrzeugId: '', neuesFahrzeug: null, ctx: null, anlass: 'wechsel', vonId: '', anId: state.user.id, km: '', tank: '', bedingungen: [], fotos: {}, extraFotos: [], neueSchaeden: [], bestaetigteSchaeden: [], inventar: {}, innenraumBeschaedigt: false, innenraumText: '', warnleuchten: '', bemerkung: '', unterschriftVon: '', unterschriftAn: '', abwesend: '' };
    go('new');
  }
  async function saveDraft() { if (!state.draft) return; state.draft.updatedAt = new Date().toISOString(); await DB.put('drafts', state.draft); }

  const STEPS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
  function wizardShell(step, body, nav) {
    const prog = STEPS.map((s, i) => '<i class="' + (i + 1 < step ? 'done' : i + 1 === step ? 'cur' : '') + '"></i>').join('');
    const d = state.draft;
    return topbar((d.kennzeichenAnzeige ? d.kennzeichenAnzeige + ' · ' : '') + t('newProtocol'), { back: 'home' }) +
      '<main><div class="progress">' + prog + '</div><div class="step-title"><span class="n">' + t('step') + ' ' + step + ' ' + t('of') + ' 8</span><h1>' + t(STEPS[step - 1]) + '</h1></div>' + body + '</main>' +
      '<div class="bottom-nav"><div class="inner">' + (step > 1 ? '<button class="btn ghost" id="w-back">‹ ' + t('back') + '</button>' : '') + (nav || '<button class="btn" id="w-next">' + t('next') + ' ›</button>') + '</div></div>';
  }
  function wizNav(step, validate) {
    if (van3dView && step !== 5) { try { van3dView.destroy(); } catch (e) { } van3dView = null; }
    if ($('#w-back')) $('#w-back').onclick = () => { if (van3dView) { try { van3dView.destroy(); } catch (e) { } van3dView = null; } state.draft.step = step - 1; saveDraft(); viewWizard(); };
    if ($('#w-next')) $('#w-next').onclick = async () => { const err = validate ? await validate() : null; if (err) return toast(err, true); if (van3dView) { try { van3dView.destroy(); } catch (e) { } van3dView = null; } state.draft.step = step + 1; await saveDraft(); viewWizard(); };
  }

  async function viewWizard() {
    if (!state.draft) { const drafts = await DB.all('drafts'); if (drafts.length) state.draft = drafts.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0]; else return startDraft(); }
    await boot();
    const s = state.draft.step || 1;
    const fns = [stepVehicle, stepPeople, stepKm, stepPhotos, stepDamages, stepInterior, stepSummary, stepSign];
    fns[s - 1]();
  }

  // --- Schritt 1: Fahrzeug
  function stepVehicle() {
    const d = state.draft; const b = state.boot;
    const mine = (b.fahrzeuge || []).filter(v => v.fahrerId === state.user.id);
    const sorted = (b.fahrzeuge || []).slice().sort((a, c) => (c.letztesProtokollAm || '').localeCompare(a.letztesProtokollAm || ''));
    const list = mine.concat(sorted.filter(v => !mine.find(m => m.id === v.id)));
    const body = '<input type="text" id="v-search" placeholder="' + t('search') + '" autocapitalize="characters" autocomplete="off"><p class="small muted mt">' + t('pickVehicle') + '</p><div id="v-list"></div>' +
      '<div class="card mt"><h3>' + t('orPlate') + '</h3><label class="lbl">' + t('plate') + '</label><input type="text" id="v-plate" placeholder="DZ-XX 123" autocapitalize="characters" autocomplete="off"><label class="lbl">' + t('model') + '</label><input type="text" id="v-model" placeholder="z. B. Mercedes Sprinter"><button class="btn secondary mt" id="v-new">' + t('newVehicle') + '</button></div>';
    render(wizardShell(1, body, '<button class="btn" id="w-next">' + t('next') + ' ›</button>'));
    const renderList = q => {
      q = (q || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');
      $('#v-list').innerHTML = list.filter(v => !q || String(v.kennzeichen).toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '').indexOf(q) >= 0).slice(0, 40).map(v =>
        '<button class="list-item' + (d.fahrzeugId === v.id ? ' card gold' : '') + '" data-id="' + v.id + '"><div class="main"><b>' + esc(v.kennzeichen) + (v.fahrerId === state.user.id ? ' <span class="badge">' + t('me') + '</span>' : '') + '</b><span>' + esc(v.modell || '') + (v.km ? ' · ' + esc(v.km) + ' km' : '') + (v.fahrer ? ' · ' + esc(v.fahrer) : '') + (v.offeneSchaeden ? ' · ' + v.offeneSchaeden + ' ' + t('openDamages') : '') + '</span></div><div class="chev">' + (d.fahrzeugId === v.id ? '✓' : '›') + '</div></button>').join('') || '<p class="muted small">–</p>';
      $$('#v-list [data-id]').forEach(el => el.onclick = () => selectVehicle(el.getAttribute('data-id')));
    };
    renderList('');
    $('#v-search').oninput = e => renderList(e.target.value);
    $('#v-new').onclick = () => {
      const plate = $('#v-plate').value.trim(); if (plate.replace(/[^A-Za-z0-9]/g, '').length < 3) return toast(t('plateNeeded'), true);
      const norm = plate.toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');
      const ex = (b.fahrzeuge || []).find(v => String(v.kennzeichen).toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '') === norm);
      if (ex) return selectVehicle(ex.id);
      d.fahrzeugId = ''; d.neuesFahrzeug = { kennzeichen: plate.toUpperCase(), modell: $('#v-model').value.trim() }; d.kennzeichenAnzeige = plate.toUpperCase(); d.ctx = { fahrzeug: { kennzeichen: plate.toUpperCase() }, letztesProtokoll: null, offeneSchaeden: [] };
      d.vonId = 'firma'; d.anId = state.user.id; d.bestaetigteSchaeden = [];
      d.step = 2; saveDraft(); viewWizard();
    };
    wizNav(1, () => (!d.fahrzeugId && !d.neuesFahrzeug) ? t('plateNeeded') : null);
  }
  async function selectVehicle(id) {
    const d = state.draft; const v = state.boot.fahrzeuge.find(x => x.id === id);
    d.fahrzeugId = id; d.neuesFahrzeug = null; d.kennzeichenAnzeige = v ? v.kennzeichen : '';
    overlay('…');
    try { d.ctx = await API.call('getVehicleContext', { id }); }
    catch (e) { d.ctx = { fahrzeug: v || {}, letztesProtokoll: null, offeneSchaeden: [], offline: true }; if (e.code !== 'NET') toast(errMsg(e), true); }
    hideOverlay();
    const lp = d.ctx.letztesProtokoll;
    if (lp && lp.anId && lp.anId !== state.user.id) { d.vonId = lp.anId; d.anId = state.user.id; }
    else if (lp && lp.anId === state.user.id) { d.vonId = state.user.id; d.anId = ''; }
    else { d.vonId = 'firma'; d.anId = state.user.id; }
    if (lp && lp.inventar) { d.inventar = {}; Object.keys(lp.inventar).forEach(k => { d.inventar[k] = { soll: lp.inventar[k].soll, haben: lp.inventar[k].soll, nr: lp.inventar[k].nr || '' }; }); }
    d.bestaetigteSchaeden = [];
    d.step = 2; await saveDraft(); viewWizard();
  }

  // --- Schritt 2: Anlass & Personen
  function stepPeople() {
    const d = state.draft; const lp = d.ctx && d.ctx.letztesProtokoll;
    const personBtn = (which) => {
      const val = d[which];
      return '<div class="chips three mt" data-pick="' + which + '"><button class="chip ' + (val === state.user.id ? 'on' : '') + '" data-val="' + state.user.id + '">' + t('me') + '</button><button class="chip ' + (val === 'firma' ? 'on' : '') + '" data-val="firma">' + t('company') + '</button><button class="chip ' + (val && val !== 'firma' && val !== state.user.id ? 'on' : '') + '" data-val="pick">' + (val && val !== 'firma' && val !== state.user.id ? esc(userName(val)) : t('pickPerson') + ' …') + '</button></div>';
    };
    const body = '<h3>' + t('reason') + '</h3><div class="chips">' + ANLAESSE.map(a => '<button class="chip ' + (d.anlass === a ? 'on' : '') + '" data-anlass="' + a + '">' + esc(ANLASS_TXT[a]) + '</button>').join('') + '</div>' +
      '<div class="card mt"><h3>' + t('from') + '</h3>' + (lp ? '<p class="small muted">' + t('lastDriver') + ': <b>' + esc(lp.anName) + '</b> (' + fmtDT(lp.datum) + ')</p>' : '') + personBtn('vonId') +
      '<div class="center mt"><button class="btn small ghost" id="swap">⇅</button></div>' +
      '<h3 class="mt">' + t('to') + '</h3>' + personBtn('anId') + '</div>';
    render(wizardShell(2, body));
    $$('[data-anlass]').forEach(c => c.onclick = () => { d.anlass = c.getAttribute('data-anlass'); saveDraft(); stepPeople(); });
    $$('[data-pick]').forEach(g => { const which = g.getAttribute('data-pick'); $$('.chip', g).forEach(c => c.onclick = () => { const v = c.getAttribute('data-val'); if (v === 'pick') pickPerson(which); else { d[which] = v; saveDraft(); stepPeople(); } }); });
    $('#swap').onclick = () => { const x = d.vonId; d.vonId = d.anId; d.anId = x; saveDraft(); stepPeople(); };
    wizNav(2, () => { if (!d.vonId || !d.anId) return t('personNeeded'); if (d.vonId === d.anId && d.vonId !== 'firma') return t('samePerson'); return null; });
  }
  function pickPerson(which) {
    const d = state.draft; const list = state.boot.mitarbeiter || [];
    const s = sheet('<h2>' + t('pickPerson') + '</h2><input type="text" id="p-search" placeholder="' + t('search') + '" autocomplete="off"><div id="p-list" class="mt"></div>');
    const rl = q => { q = (q || '').toLowerCase(); $('#p-list', s.el).innerHTML = list.filter(m => m.name.toLowerCase().indexOf(q) >= 0).map(m => '<button class="list-item" data-id="' + m.id + '"><div class="main"><b>' + esc(m.name) + '</b><span>' + esc(m.bereich || '') + '</span></div></button>').join(''); $$('#p-list [data-id]', s.el).forEach(el => el.onclick = () => { d[which] = el.getAttribute('data-id'); saveDraft(); s.close(); stepPeople(); }); };
    rl(''); $('#p-search', s.el).oninput = e => rl(e.target.value); setTimeout(() => $('#p-search', s.el).focus(), 50);
  }

  // --- Fotos: Aufnahme & Anzeige
  let fileInput = null, fileResolve = null;
  function ensureFileInput() {
    if (fileInput) return;
    fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.setAttribute('capture', 'environment'); fileInput.className = 'file-hidden';
    document.body.appendChild(fileInput);
    fileInput.onchange = async () => { const f = fileInput.files[0]; fileInput.value = ''; if (fileResolve) { const r = fileResolve; fileResolve = null; r(f || null); } };
  }
  function pickFile() { ensureFileInput(); return new Promise(res => { fileResolve = res; fileInput.click(); }); }
  async function takePhoto(typ) {
    const file = await pickFile(); if (!file) return null;
    overlay('…');
    try {
      const { full, thumb } = await IMG.process(file);
      const localId = uuid();
      const p = { localId, clientPhotoId: localId, draftId: state.draft.clientId, typ, fullBlob: full, thumbBlob: thumb, status: 'pending', aufgenommenAm: new Date().toISOString(), fahrzeugId: state.draft.fahrzeugId || '' };
      await DB.put('photos', p);
      state.thumbs[localId] = URL.createObjectURL(thumb);
      setTimeout(() => API.flush(state.draft.clientId), 50);
      return localId;
    } catch (e) { toast(errMsg(e), true); return null; }
    finally { hideOverlay(); }
  }
  async function thumbUrl(localId) {
    if (!localId) return '';
    if (state.thumbs[localId]) return state.thumbs[localId];
    const p = await DB.get('photos', localId); if (!p) return '';
    state.thumbs[localId] = URL.createObjectURL(p.thumbBlob || p.fullBlob); return state.thumbs[localId];
  }
  async function photoTile(typ, localId, label, required) {
    const url = await thumbUrl(localId);
    return '<div class="photo-tile ' + (url ? 'done' : '') + (required ? ' req' : '') + '" data-photo="' + typ + '">' + (url ? '<img src="' + url + '"><span class="redo">' + t('retake') + '</span>' : '<span class="ico">📷</span><span class="frame"></span>') + '<div class="cap">' + esc(label) + '</div></div>';
  }

  // --- Schritt 3: km & Tank
  async function stepKm() {
    const d = state.draft; const lp = d.ctx && d.ctx.letztesProtokoll;
    const tanks = ['E', '1/4', '1/2', '3/4', '1/1'];
    const conds = [['dunkelheit', 'dark'], ['nass', 'wet'], ['schnee', 'snow'], ['verschmutzt', 'dirty']];
    const body = '<label class="lbl">' + t('km') + '</label><input type="number" inputmode="numeric" pattern="[0-9]*" id="km" class="huge" value="' + esc(d.km) + '" placeholder="0">' +
      (lp && lp.km !== '' ? '<p class="small muted mt">' + t('lastKm', { km: lp.km, date: fmtD(lp.datum) }) + '</p>' : '') + '<div class="field-error hidden" id="km-warn"></div>' +
      '<div class="photo-grid mt" style="grid-template-columns:1fr 1fr">' + await photoTile('tacho', d.fotos.tacho, t('kmPhoto'), true) + '<div></div></div>' +
      '<h3 class="mt">' + t('tank') + '</h3><div class="chips five">' + tanks.map(x => '<button class="chip ' + (d.tank === x ? 'on' : '') + '" data-tank="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<h3 class="mt">' + t('conditions') + '</h3><div class="chips">' + conds.map(c => '<button class="chip ' + (d.bedingungen.indexOf(c[0]) >= 0 ? 'on' : '') + '" data-cond="' + c[0] + '">' + t(c[1]) + '</button>').join('') + '</div>';
    render(wizardShell(3, body));
    const kmIn = $('#km');
    const checkKm = () => { const v = Number(kmIn.value); const w = $('#km-warn'); if (lp && lp.km !== '' && v && v < Number(lp.km)) { w.textContent = t('kmWarn', { km: lp.km }); w.classList.remove('hidden'); } else w.classList.add('hidden'); };
    kmIn.oninput = () => { d.km = kmIn.value; checkKm(); saveDraft(); }; checkKm();
    $$('[data-tank]').forEach(c => c.onclick = () => { d.tank = c.getAttribute('data-tank'); $$('[data-tank]').forEach(x => x.classList.toggle('on', x === c)); saveDraft(); });
    $$('[data-cond]').forEach(c => c.onclick = () => { const k = c.getAttribute('data-cond'); const i = d.bedingungen.indexOf(k); if (i >= 0) d.bedingungen.splice(i, 1); else d.bedingungen.push(k); c.classList.toggle('on'); saveDraft(); });
    $('[data-photo="tacho"]').onclick = async () => { const id = await takePhoto('tacho'); if (id) { d.fotos.tacho = id; await saveDraft(); stepKm(); } };
    wizNav(3, () => (!d.km || !d.fotos.tacho) ? t('kmNeeded') : null);
  }

  // --- Schritt 4: Rundgang-Fotos
  async function stepPhotos() {
    const d = state.draft;
    let tiles = '';
    for (const typ of PHOTO_REQ) tiles += await photoTile(typ, d.fotos[typ], t(PHOTO_LBL[typ]), true);
    for (let i = 0; i < d.extraFotos.length; i++) tiles += await photoTile('extra-' + i, d.extraFotos[i], t('extra') + ' ' + (i + 1), false);
    tiles += '<div class="photo-tile" data-photo="extra-new"><span class="ico">＋</span><div class="cap">' + t('extra') + '</div></div>';
    render(wizardShell(4, '<p class="small muted">' + t('photosHint') + '</p><div class="photo-grid">' + tiles + '</div>'));
    $$('[data-photo]').forEach(el => el.onclick = async () => {
      const typ = el.getAttribute('data-photo');
      if (typ === 'extra-new') { const id = await takePhoto('sonstiges'); if (id) { d.extraFotos.push(id); await saveDraft(); stepPhotos(); } return; }
      if (typ.indexOf('extra-') === 0) { const i = Number(typ.slice(6)); const id = await takePhoto('sonstiges'); if (id) { d.extraFotos[i] = id; await saveDraft(); stepPhotos(); } return; }
      const id = await takePhoto(typ); if (id) { d.fotos[typ] = id; await saveDraft(); stepPhotos(); }
    });
    wizNav(4, () => PHOTO_REQ.some(typ => !d.fotos[typ]) ? t('photoNeeded') : null);
  }

  // --- Schritt 5: Schäden
  let silView = 'iso', van3dView = null;
  function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  async function stepDamages() {
    const d = state.draft; const known = (d.ctx && d.ctx.offeneSchaeden) || [];
    const markers = known.map(k => { const st = d.bestaetigteSchaeden.find(b => b.schadenId === k.id); return { id: 'old:' + k.id, ansicht: k.ansicht, x: k.x, y: k.y, code: k.code, kind: st && st.status === 'repariert' ? 'fixed' : 'old' }; })
      .concat(d.neueSchaeden.map((n, i) => ({ id: 'new:' + i, ansicht: n.ansicht, x: n.x, y: n.y, code: n.code, kind: 'new' })));
    const count = v => markers.filter(m => m.ansicht === v).length;
    let knownHtml = '';
    if (known.length) {
      knownHtml = '<div class="card mt"><h3>' + t('knownDamages') + ' (' + known.length + ')</h3><p class="small muted">' + t('knownHint') + '</p>';
      for (const k of known) {
        const st = d.bestaetigteSchaeden.find(b => b.schadenId === k.id);
        knownHtml += '<div class="dmg-item"><div class="code">' + esc(k.code) + '</div>' + (k.thumb ? '<img class="thumb" src="' + k.thumb + '">' : '') + '<div class="info"><b>' + esc(k.codeText || CODES[k.code] || '') + '</b> · ' + t(VIEW_LBL[k.ansicht] || 'left') + (k.groesse ? ', ' + t(k.groesse) : '') + (k.beschreibung ? '<br>' + esc(k.beschreibung) : '') + '<span>' + t('firstSeen') + ' ' + fmtD(k.erstmeldungAm) + '</span>' +
          '<div class="chips two mt" style="gap:6px"><button class="chip ' + (st && st.status === 'vorhanden' ? 'on' : '') + '" data-known="' + k.id + '" data-st="vorhanden" style="min-height:40px;font-size:13px">' + t('stillThere') + '</button><button class="chip green ' + (st && st.status === 'repariert' ? 'on' : '') + '" data-known="' + k.id + '" data-st="repariert" style="min-height:40px;font-size:13px">' + t('repaired') + '</button></div></div></div>';
      }
      knownHtml += '</div>';
    }
    let newHtml = '<div class="card mt"><h3>' + t('newDamage') + ' (' + d.neueSchaeden.length + ')</h3>' + (d.neueSchaeden.length ? '' : '<p class="small muted">' + t('noDamages') + '</p>');
    for (let i = 0; i < d.neueSchaeden.length; i++) { const n = d.neueSchaeden[i]; const u = await thumbUrl(n.localPhotoId); newHtml += '<div class="dmg-item new"><div class="code">' + esc(n.code) + '</div>' + (u ? '<img class="thumb" src="' + u + '">' : '') + '<div class="info"><b>' + esc(CODES[n.code]) + '</b> · ' + t(VIEW_LBL[n.ansicht]) + (n.groesse ? ', ' + t(n.groesse) : '') + (n.text ? '<br>' + esc(n.text) : '') + '</div><button class="btn small danger" data-rm="' + i + '">✕</button></div>'; }
    newHtml += '</div>';
    const typ = (d.ctx && d.ctx.fahrzeug && d.ctx.fahrzeug.typ) || 'sprinter';
    const use3d = !!window.VAN3D && webglOk();
    const tabs3d = ['iso', 'links', 'rechts', 'front', 'heck', 'dach', 'innen'];
    const tabLbl = v => v === 'iso' ? '3D' : t(VIEW_LBL[v]);
    const body = '<p class="small muted">' + t('tapSil') + (use3d ? ' ' + t('rotateHint') : '') + '</p><div class="sil-wrap"><div class="sil-tabs">' + (use3d ? tabs3d : SIL.ORDER).map(v => '<button class="chip ' + (silView === v ? 'on' : '') + '" data-view="' + v + '">' + tabLbl(v) + (count(v) ? ' <span class="badge red" style="padding:0 6px">' + count(v) + '</span>' : '') + '</button>').join('') + '</div><div id="sil"></div>' + (use3d ? '<p class="small muted" style="margin:6px 0 0">' + esc(VAN3D.TYPEN[typ] || '') + '</p>' : '') +
      '<div class="legend"><span><i style="background:var(--gold)"></i>' + t('knownDamages') + '</span><span><i style="background:var(--danger)"></i>' + t('newDamage') + '</span><span><i style="background:var(--ok)"></i>' + t('repaired') + '</span></div></div>' + knownHtml + newHtml;
    render(wizardShell(5, body));
    const onMarkerTap = async id => { if (id.indexOf('new:') === 0) { const i = Number(id.slice(4)); if (await confirmDlg(t('remove') + '?')) { d.neueSchaeden.splice(i, 1); await saveDraft(); stepDamages(); } } else { const k = known.find(x => 'old:' + x.id === id); if (k) sheet('<h2>' + esc(k.code) + ' – ' + esc(k.codeText || '') + '</h2>' + (k.thumb ? '<img class="thumb lg" src="' + k.thumb + '">' : '') + '<p class="mt">' + esc(k.beschreibung || '') + '</p><p class="small muted">' + t('firstSeen') + ' ' + fmtD(k.erstmeldungAm) + ' · ' + t('responsible') + ': ' + esc(k.verantwortlich || '') + '</p>'); } };
    if (van3dView) { try { van3dView.destroy(); } catch (e) { } van3dView = null; }
    if (use3d && silView !== 'innen') {
      const m3 = known.map(k => { const st = d.bestaetigteSchaeden.find(b => b.schadenId === k.id); return { id: 'old:' + k.id, ansicht: k.ansicht, x: k.x, y: k.y, pos3d: k.pos3d, code: k.code, kind: st && st.status === 'repariert' ? 'fixed' : 'old' }; })
        .concat(d.neueSchaeden.map((n, i) => ({ id: 'new:' + i, ansicht: n.ansicht, x: n.x, y: n.y, pos3d: n.pos3d, code: n.code, kind: 'new' })));
      van3dView = VAN3D.mount($('#sil'), { typ, markers: m3.filter(m => m.ansicht !== 'innen'), view: silView, height: Math.min(360, Math.round(window.innerWidth * 0.78)), onTap: info => newDamageSheet(info.ansicht, info.x, info.y, info.pos3d), onMarker: onMarkerTap });
    } else {
      SIL.render($('#sil'), silView === 'iso' ? 'links' : silView, markers, { onTap: (x, y) => newDamageSheet(silView === 'iso' ? 'links' : silView, x, y), onMarker: onMarkerTap });
    }
    $$('[data-view]').forEach(b => b.onclick = () => { silView = b.getAttribute('data-view'); stepDamages(); });
    $$('[data-known]').forEach(b => b.onclick = async () => { const id = b.getAttribute('data-known'), st = b.getAttribute('data-st'); const ex = d.bestaetigteSchaeden.find(x => x.schadenId === id); if (ex) ex.status = st; else d.bestaetigteSchaeden.push({ schadenId: id, status: st }); await saveDraft(); stepDamages(); });
    $$('[data-rm]').forEach(b => b.onclick = async () => { d.neueSchaeden.splice(Number(b.getAttribute('data-rm')), 1); await saveDraft(); stepDamages(); });
    wizNav(5, () => { const open = known.filter(k => !d.bestaetigteSchaeden.find(b => b.schadenId === k.id)); return open.length ? t('knownHint') + ' (' + open.length + ' ' + t('unchecked') + ')' : null; });
  }
  function newDamageSheet(view, x, y, pos3d) {
    const d = state.draft; const n = { ansicht: view, x, y, pos3d: pos3d || null, code: '', groesse: 'mittel', text: '', localPhotoId: '' };
    const s = sheet('<h2>' + t('newDamage') + ' · ' + t(VIEW_LBL[view]) + '</h2><h3>' + t('damageCode') + '</h3><div class="chips" id="n-codes">' + Object.keys(CODES).map(c => '<button class="chip" data-code="' + c + '"><b style="font-size:18px">' + c + '</b><span class="sub">' + esc(CODES[c]) + '</span></button>').join('') + '</div>' +
      '<h3 class="mt">' + t('size') + '</h3><div class="chips three" id="n-size">' + ['klein', 'mittel', 'gross'].map(g => '<button class="chip ' + (g === 'mittel' ? 'on' : '') + '" data-size="' + g + '">' + t(g === 'gross' ? 'large' : g === 'klein' ? 'small' : 'medium') + '</button>').join('') + '</div>' +
      '<label class="lbl">' + t('note') + '</label><input type="text" id="n-text" maxlength="120">' +
      '<div class="photo-grid mt" style="grid-template-columns:1fr 1fr"><div class="photo-tile req" id="n-photo"><span class="ico">📷</span><div class="cap">' + t('damagePhoto') + '</div></div></div>' +
      '<button class="btn mt" id="n-ok" disabled>' + t('addDamage') + '</button>');
    const check = () => { $('#n-ok', s.el).disabled = !(n.code && n.localPhotoId); };
    $$('#n-codes .chip', s.el).forEach(c => c.onclick = () => { n.code = c.getAttribute('data-code'); $$('#n-codes .chip', s.el).forEach(x => x.classList.toggle('on', x === c)); check(); });
    $$('#n-size .chip', s.el).forEach(c => c.onclick = () => { n.groesse = c.getAttribute('data-size'); $$('#n-size .chip', s.el).forEach(x => x.classList.toggle('on', x === c)); });
    $('#n-photo', s.el).onclick = async () => { const id = await takePhoto('schaden'); if (id) { n.localPhotoId = id; const u = await thumbUrl(id); $('#n-photo', s.el).innerHTML = '<img src="' + u + '"><div class="cap">' + t('damagePhoto') + '</div>'; $('#n-photo', s.el).classList.add('done'); check(); } };
    $('#n-ok', s.el).onclick = async () => { n.text = $('#n-text', s.el).value.trim(); d.neueSchaeden.push(n); await saveDraft(); s.close(); stepDamages(); };
  }

  // --- Schritt 6: Innenraum & Inventar
  function stepInterior() {
    const d = state.draft;
    INVENTAR.forEach(it => { if (!d.inventar[it[0]]) d.inventar[it[0]] = { soll: it[2], haben: it[2], nr: '' }; });
    const inv = INVENTAR.map(it => { const e = d.inventar[it[0]]; const miss = Number(e.haben) < Number(e.soll); return '<div class="inv-row ' + (miss ? 'missing' : '') + '"><div class="name">' + esc(it[1]) + '<span>' + t('target') + ' ' + esc(e.soll) + (it[0] === 'navi' && e.nr ? ' · Nr. ' + esc(e.nr) : '') + '</span></div><div class="stepper"><button data-inv="' + it[0] + '" data-d="-1">−</button><div class="val">' + esc(e.haben) + '</div><button data-inv="' + it[0] + '" data-d="1">＋</button></div></div>'; }).join('');
    const body = '<div class="card"><h3>' + t('interiorDamaged') + '</h3><div class="chips two"><button class="chip ' + (!d.innenraumBeschaedigt ? 'on' : '') + '" data-int="0">' + t('no') + '</button><button class="chip red ' + (d.innenraumBeschaedigt ? 'on' : '') + '" data-int="1">' + t('yes') + '</button></div><div id="int-text" class="' + (d.innenraumBeschaedigt ? '' : 'hidden') + '"><label class="lbl">' + t('where') + '</label><input type="text" id="i-text" value="' + esc(d.innenraumText) + '"></div></div>' +
      '<div class="card"><h3>' + t('warnLights') + '</h3><div class="chips two"><button class="chip ' + (!d.warnleuchtenJa ? 'on' : '') + '" data-wl="0">' + t('none') + '</button><button class="chip red ' + (d.warnleuchtenJa ? 'on' : '') + '" data-wl="1">' + t('yes') + '</button></div><div id="wl-text" class="' + (d.warnleuchtenJa ? '' : 'hidden') + '"><label class="lbl">' + t('which') + '</label><input type="text" id="w-text" value="' + esc(d.warnleuchten) + '" placeholder="z. B. Motorkontrollleuchte, AdBlue"></div></div>' +
      '<div class="card"><h3>' + t('inventory') + ' (' + t('target') + ' / ' + t('actual') + ')</h3>' + inv + '<label class="lbl">' + t('naviNr') + '</label><input type="text" id="navi-nr" value="' + esc(d.inventar.navi.nr || '') + '"></div>' +
      '<div class="card"><label class="lbl">' + t('remark') + '</label><textarea id="bem">' + esc(d.bemerkung) + '</textarea></div>';
    render(wizardShell(6, body));
    $$('[data-int]').forEach(c => c.onclick = () => { d.innenraumBeschaedigt = c.getAttribute('data-int') === '1'; saveDraft(); stepInterior(); });
    $$('[data-wl]').forEach(c => c.onclick = () => { d.warnleuchtenJa = c.getAttribute('data-wl') === '1'; if (!d.warnleuchtenJa) d.warnleuchten = ''; saveDraft(); stepInterior(); });
    $('#i-text').oninput = e => { d.innenraumText = e.target.value; saveDraft(); };
    $('#w-text').oninput = e => { d.warnleuchten = e.target.value; saveDraft(); };
    $('#navi-nr').oninput = e => { d.inventar.navi.nr = e.target.value; saveDraft(); };
    $('#bem').oninput = e => { d.bemerkung = e.target.value; saveDraft(); };
    $$('[data-inv]').forEach(b => b.onclick = () => { const k = b.getAttribute('data-inv'); const e = d.inventar[k]; e.haben = Math.max(0, Math.min(9, Number(e.haben) + Number(b.getAttribute('data-d')))); if (e.haben > e.soll) e.soll = e.haben; saveDraft(); stepInterior(); });
    wizNav(6, () => (d.innenraumBeschaedigt && !d.innenraumText.trim()) ? t('where') : (d.warnleuchtenJa && !d.warnleuchten.trim()) ? t('which') : null);
  }

  // --- Schritt 7: Zusammenfassung
  async function stepSummary() {
    const d = state.draft;
    const miss = [];
    if (!d.fahrzeugId && !d.neuesFahrzeug) miss.push(t('s1'));
    if (!d.vonId || !d.anId) miss.push(t('s2'));
    if (!d.km || !d.fotos.tacho) miss.push(t('s3'));
    if (PHOTO_REQ.some(x => !d.fotos[x])) miss.push(t('s4'));
    const pend = await API.pendingPhotos(d.clientId);
    const fotoCount = Object.keys(d.fotos).length + d.extraFotos.length + d.neueSchaeden.filter(n => n.localPhotoId).length;
    const invMiss = INVENTAR.filter(it => d.inventar[it[0]] && Number(d.inventar[it[0]].haben) < Number(d.inventar[it[0]].soll));
    const row = (k, v) => '<tr><th>' + esc(k) + '</th><td>' + v + '</td></tr>';
    const body = '<div class="card"><table class="tbl">' + row(t('plate'), '<b>' + esc(d.kennzeichenAnzeige) + '</b>') + row(t('reason'), esc(ANLASS_TXT[d.anlass])) + row(t('from'), esc(userName(d.vonId))) + row(t('to'), esc(userName(d.anId))) + row(t('km'), esc(d.km) + ' km') + row(t('tank'), esc(d.tank || '–')) +
      row(t('photos'), fotoCount + (pend.length ? ' <span class="badge">' + pend.length + ' ⬆︎</span>' : ' <span class="badge green">✓</span>')) + row(t('newDamagesCount'), d.neueSchaeden.length ? '<span class="badge red">' + d.neueSchaeden.length + '</span> ' + d.neueSchaeden.map(n => n.code).join(', ') : '0') +
      row(t('knownDamages'), d.bestaetigteSchaeden.filter(b => b.status === 'repariert').length + ' ' + t('repaired') + ', ' + d.bestaetigteSchaeden.filter(b => b.status === 'vorhanden').length + ' ' + t('stillThere')) +
      row(t('interior'), d.innenraumBeschaedigt ? '<span class="danger">' + t('yes') + ' – ' + esc(d.innenraumText) + '</span>' : t('no')) + row(t('warnLights'), d.warnleuchten ? '<span class="danger">' + esc(d.warnleuchten) + '</span>' : t('none')) +
      row(t('inventory'), invMiss.length ? '<span class="danger">' + invMiss.map(i => i[1]).join(', ') + '</span>' : '✓') + (d.bemerkung ? row(t('remark'), esc(d.bemerkung)) : '') + '</table></div>' +
      (miss.length ? '<div class="card danger"><b>' + t('missing') + ':</b> ' + miss.join(', ') + '</div>' : '<div class="card ok">' + t('allGood') + '</div>');
    render(wizardShell(7, body));
    wizNav(7, () => miss.length ? t('missing') + ': ' + miss.join(', ') : null);
  }

  // --- Schritt 8: Unterschriften & Absenden
  function stepSign() {
    const d = state.draft; const me = state.user.id;
    const vonFirma = d.vonId === 'firma', anFirma = d.anId === 'firma';
    const pad = (which, lbl, person, firma) => firma ? '' : '<div class="card"><h3>' + lbl + '</h3><p class="small muted">' + esc(person) + '</p><div class="sig-box" id="sig-' + which + '"></div><div class="row mt"><button class="btn small ghost" data-clear="' + which + '">' + t('clear') + '</button><span class="grow"></span>' + (d[which === 'von' ? 'vonId' : 'anId'] !== me ? '<button class="chip ' + (d.abwesend === which ? 'on' : '') + '" data-abs="' + which + '" style="min-height:40px;padding:4px 12px;font-size:13px">' + t('notPresent') + '</button>' : '') + '</div>' + (d.abwesend === which ? '<p class="small muted mt">' + t('notPresentHint') + '</p>' : '') + '</div>';
    const body = '<p class="small muted">' + t('signHint') + '</p>' + pad('von', t('signFrom'), userName(d.vonId), vonFirma) + pad('an', t('signTo'), userName(d.anId), anFirma);
    render(wizardShell(8, body, '<button class="btn" id="w-send">✓ ' + t('send') + '</button>'));
    const pads = {};
    if (!vonFirma && d.abwesend !== 'von') pads.von = SIG($('#sig-von'), { hint: t('signHint') });
    if (!anFirma && d.abwesend !== 'an') pads.an = SIG($('#sig-an'), { hint: t('signHint') });
    if (d.abwesend === 'von' && $('#sig-von')) $('#sig-von').innerHTML = '<div class="hint">' + t('notPresent') + '</div>';
    if (d.abwesend === 'an' && $('#sig-an')) $('#sig-an').innerHTML = '<div class="hint">' + t('notPresent') + '</div>';
    $$('[data-clear]').forEach(b => b.onclick = () => { const p = pads[b.getAttribute('data-clear')]; if (p) p.clear(); });
    $$('[data-abs]').forEach(b => b.onclick = () => { const w = b.getAttribute('data-abs'); d.abwesend = d.abwesend === w ? '' : w; saveDraft(); stepSign(); });
    if ($('#w-back')) $('#w-back').onclick = () => { d.step = 7; saveDraft(); viewWizard(); };
    $('#w-send').onclick = async () => {
      d.unterschriftVon = pads.von && !pads.von.isEmpty() ? pads.von.dataUrl() : '';
      d.unterschriftAn = pads.an && !pads.an.isEmpty() ? pads.an.dataUrl() : '';
      const needVon = !vonFirma && d.abwesend !== 'von', needAn = !anFirma && d.abwesend !== 'an';
      if ((needVon && !d.unterschriftVon) || (needAn && !d.unterschriftAn)) return toast(t('signHint'), true);
      if (!d.unterschriftVon && !d.unterschriftAn && !(vonFirma && anFirma)) return toast(t('signHint'), true);
      d.datum = d.datum || new Date().toISOString();
      await saveDraft();
      await submitDraft();
    };
  }

  async function submitDraft() {
    const d = state.draft;
    const item = { clientId: d.clientId, draft: d, createdAt: new Date().toISOString() };
    await DB.put('outbox', item);
    overlay(t('sending'));
    try {
      let pend = await API.pendingPhotos(d.clientId);
      while (pend.length) {
        if (!navigator.onLine) throw Object.assign(new Error('offline'), { code: 'NET' });
        overlay(t('uploading', { n: pend.length }));
        const p = pend[0];
        try { await API.uploadPhoto(p); } catch (e) { if (e.code === 'NET' || e.code === 'AUTH' || e.code === 'CONFIG') throw e; p.status = 'error'; p.error = e.message; await DB.put('photos', p); }
        const rest = await API.pendingPhotos(d.clientId);
        if (rest.filter(x => x.status !== 'error').length === 0) { pend = []; if (rest.length) throw new Error('Foto-Upload fehlgeschlagen: ' + rest[0].error); } else pend = rest.filter(x => x.status !== 'error');
      }
      overlay(t('sending'));
      const r = await API.submitFromOutbox(item);
      await DB.del('outbox', d.clientId);
      state.draft = null; hideOverlay();
      state.boot = null;
      viewDone(r);
    } catch (e) {
      hideOverlay();
      if (e.code === 'NET' || e.code === 'CONFIG') { state.draft = null; toast(t('queued')); go('home'); }
      else { toast(errMsg(e), true); }
    }
  }
  function viewDone(r) {
    render(topbar(t('sent')) + '<main><div class="card ok center"><div style="font-size:52px">✓</div><h1>' + t('sent') + '</h1><p>' + t('sentNo') + ' <b>' + esc(r.nr) + '</b></p>' +
      (r.neueSchaeden ? '<p class="danger"><b>' + r.neueSchaeden + ' ' + t('newDamagesCount') + '</b></p>' : '') + (r.einseitig ? '<p class="small muted">' + t('notPresentHint') + '</p>' : '') + (!r.pdfOk ? '<p class="small muted">PDF folgt später.</p>' : '') + '</div>' +
      ((r.hinweise || []).length ? '<div class="card gold"><h3>' + t('hints') + '</h3>' + r.hinweise.map(h => '<p class="small">' + esc(h) + '</p>').join('') + '</div>' : '') +
      '<button class="btn" data-nav="home">' + t('home') + '</button><button class="btn ghost mt" data-nav="protocol/' + r.id + '">' + t('protocol') + ' ' + esc(r.nr) + '</button></main>');
  }

  /* ---------- Protokolle ---------- */
  async function viewProtocols(fahrzeugId) {
    render(topbar(t('myProtocols'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let scope = isMgmt() ? (localStorage.getItem('vip_scope') || 'mine') : 'mine';
    const load = async () => {
      let rows = [];
      try { rows = await API.call('listProtocols', { scope, fahrzeugId: fahrzeugId || '', limit: 100 }); } catch (e) { toast(errMsg(e), true); }
      let html = topbar(fahrzeugId ? t('protocol') : t('myProtocols'), { back: fahrzeugId ? 'vehicle/' + fahrzeugId : 'home' }) + '<main>';
      if (isMgmt() && !fahrzeugId) html += '<div class="tabs"><button class="' + (scope === 'mine' ? 'on' : '') + '" data-scope="mine">' + t('myProtocols') + '</button><button class="' + (scope === 'all' ? 'on' : '') + '" data-scope="all">' + t('allProtocols') + '</button></div>';
      html += rows.map(protoItem).join('') || '<p class="muted center mt">–</p>';
      render(html + '</main>');
      $$('[data-scope]').forEach(b => b.onclick = () => { scope = b.getAttribute('data-scope'); localStorage.setItem('vip_scope', scope); load(); });
    };
    load();
  }
  function protoItem(p) {
    const st = p.status === 'offen' ? '<span class="badge red">' + t('toConfirm') + '</span>' : p.status === 'widersprochen' ? '<span class="badge red">' + t('disputed') + '</span>' : p.neueSchaeden ? '<span class="badge red">' + p.neueSchaeden + ' ⚠︎</span>' : '<span class="badge green">✓</span>';
    return '<button class="list-item" data-nav="protocol/' + p.id + '"><div class="main"><b>' + esc(p.kennzeichen) + ' <span class="muted small">' + esc(p.nr) + '</span></b><span>' + fmtDT(p.datum) + ' · ' + esc(p.von) + ' → ' + esc(p.an) + ' · ' + esc(p.km) + ' km</span></div>' + st + '<div class="chev">›</div></button>';
  }
  async function viewProtocol(id) {
    render(topbar(t('protocol'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let p;
    try { p = await API.call('getProtocol', { id }); } catch (e) { return render(topbar(t('protocol'), { back: 'home' }) + '<main><div class="card danger">' + esc(errMsg(e)) + '</div></main>'); }
    const row = (k, v) => '<tr><th>' + esc(k) + '</th><td>' + v + '</td></tr>';
    const me = state.user.id;
    const canConfirm = p.status === 'offen' && p.einseitig && (p.vonId === me || p.anId === me) && p.erstelltVonId !== me;
    const invMiss = Object.keys(p.inventar || {}).filter(k => Number(p.inventar[k].haben) < Number(p.inventar[k].soll)).map(k => (INVENTAR.find(i => i[0] === k) || [k, k])[1]);
    let html = topbar(p.kennzeichen + ' · ' + p.nr, { back: 'home' }) + '<main>';
    if (canConfirm) html += '<div class="card danger"><h2>' + t('toConfirm') + '</h2><p class="small">' + t('toConfirmHint') + '</p><div class="btn-row"><button class="btn" id="p-confirm">' + t('confirm') + '</button><button class="btn danger" id="p-dispute">' + t('dispute') + '</button></div></div>';
    html += '<div class="card"><table class="tbl">' + row(t('date'), fmtDT(p.datum)) + row(t('reason'), esc(p.anlassText)) + row(t('from'), esc(p.von)) + row(t('to'), esc(p.an)) + row(t('km'), esc(p.km) + ' km') + row(t('tank'), esc(p.tank)) + row(t('status'), esc(p.status) + (p.einseitig ? ' (1 Unterschrift)' : '')) +
      row(t('interior'), p.innenraumBeschaedigt ? '<span class="danger">' + esc(p.innenraumText) + '</span>' : t('no')) + row(t('warnLights'), p.warnleuchten ? '<span class="danger">' + esc(p.warnleuchten) + '</span>' : t('none')) + row(t('inventory'), invMiss.length ? '<span class="danger">' + t('missing') + ': ' + esc(invMiss.join(', ')) + '</span>' : '✓') + (p.bemerkung ? row(t('remark'), esc(p.bemerkung)) : '') + (p.widerspruchText ? row(t('dispute'), '<span class="danger">' + esc(p.widerspruchText) + '</span>') : '') + '</table></div>';
    if ((p.hinweise || []).length) html += '<div class="card gold"><h3>' + t('hints') + '</h3>' + p.hinweise.map(h => '<p class="small">' + esc(h) + '</p>').join('') + '</div>';
    if ((p.neueSchaedenListe || []).length) html += '<div class="card danger"><h3>' + t('newDamagesCount') + ' (' + p.neueSchaedenListe.length + ')</h3>' + p.neueSchaedenListe.map(d => { const f = (p.fotos || []).find(x => x.id === d.fotoId); return '<div class="dmg-item new"><div class="code">' + esc(d.code) + '</div>' + (f && f.thumb ? '<img class="thumb" src="' + f.thumb + '" data-full="' + f.id + '">' : '') + '<div class="info"><b>' + esc(d.codeText) + '</b> · ' + t(VIEW_LBL[d.ansicht] || 'left') + (d.beschreibung ? '<br>' + esc(d.beschreibung) : '') + '<span>' + t('responsible') + ': ' + esc(d.verantwortlich) + '</span></div></div>'; }).join('') + '</div>';
    if ((p.sichtungen || []).length) html += '<div class="card"><h3>' + t('knownDamages') + '</h3>' + p.sichtungen.map(s => '<div class="small">' + esc(s.code) + ' ' + esc(s.codeText) + ' (' + t(VIEW_LBL[s.ansicht] || 'left') + ') → ' + (s.status === 'repariert' ? '<span class="ok">' + t('repaired') + '</span>' : t('stillThere')) + '</div>').join('') + '</div>';
    const rund = (p.fotos || []).filter(f => f.typ !== 'schaden');
    if (rund.length) html += '<div class="card"><h3>' + t('photos') + '</h3><div class="photo-grid three">' + rund.map(f => '<div class="photo-tile done" data-full="' + f.id + '">' + (f.thumb ? '<img src="' + f.thumb + '">' : '') + '<div class="cap">' + esc(f.typText) + '</div></div>').join('') + '</div></div>';
    if (p.unterschriften && (p.unterschriften.unterschrift_von || p.unterschriften.unterschrift_an)) html += '<div class="card"><h3>' + t('s8') + '</h3><div class="row">' + (p.unterschriften.unterschrift_von ? '<div class="grow center"><img src="' + p.unterschriften.unterschrift_von + '" style="max-width:100%;height:70px;background:#fff;border-radius:8px"><div class="small muted">' + esc(p.von) + '</div></div>' : '') + (p.unterschriften.unterschrift_an ? '<div class="grow center"><img src="' + p.unterschriften.unterschrift_an + '" style="max-width:100%;height:70px;background:#fff;border-radius:8px"><div class="small muted">' + esc(p.an) + '</div></div>' : '') + '</div></div>';
    if (isMgmt()) html += '<div class="card"><button class="btn small secondary" id="p-note">+ ' + t('adminNote') + '</button>' + (p.pdfId ? ' <a class="btn small ghost" style="display:inline-flex" href="https://drive.google.com/file/d/' + esc(p.pdfId) + '/view" target="_blank">' + t('pdf') + '</a>' : '') + '</div>';
    render(html + '</main>');
    $$('[data-full]').forEach(el => el.onclick = async () => { overlay('…'); try { const r = await API.call('getPhoto', { photoId: el.getAttribute('data-full') }); hideOverlay(); sheet('<img class="thumb lg" src="' + r.dataUrl + '">'); } catch (e) { hideOverlay(); toast(errMsg(e), true); } });
    if (canConfirm) {
      $('#p-confirm').onclick = () => { const s = sheet('<h2>' + t('confirm') + '</h2><div class="sig-box" id="c-sig"></div><button class="btn mt" id="c-ok">' + t('confirm') + '</button>'); const pad = SIG($('#c-sig', s.el), { hint: t('signHint') }); $('#c-ok', s.el).onclick = async () => { if (pad.isEmpty()) return toast(t('signHint'), true); overlay('…'); try { await API.call('confirmProtocol', { id, unterschrift: pad.dataUrl() }); s.close(); hideOverlay(); toast(t('confirmed')); state.boot = null; viewProtocol(id); } catch (e) { hideOverlay(); toast(errMsg(e), true); } }; };
      $('#p-dispute').onclick = () => { const s = sheet('<h2>' + t('dispute') + '</h2><label class="lbl">' + t('disputeReason') + '</label><textarea id="d-text"></textarea><button class="btn danger mt" id="d-ok">' + t('dispute') + '</button>'); $('#d-ok', s.el).onclick = async () => { const txt = $('#d-text', s.el).value.trim(); if (!txt) return; overlay('…'); try { await API.call('disputeProtocol', { id, text: txt }); s.close(); hideOverlay(); state.boot = null; viewProtocol(id); } catch (e) { hideOverlay(); toast(errMsg(e), true); } }; };
    }
    if ($('#p-note')) $('#p-note').onclick = () => { const s = sheet('<h2>' + t('adminNote') + '</h2><textarea id="n-text"></textarea><button class="btn mt" id="n-ok">' + t('save') + '</button>'); $('#n-ok', s.el).onclick = async () => { const txt = $('#n-text', s.el).value.trim(); if (!txt) return; try { await API.call('addAdminNote', { id, text: txt }); s.close(); viewProtocol(id); } catch (e) { toast(errMsg(e), true); } }; };
  }

  /* ---------- Fahrzeuge ---------- */
  async function viewVehicles() {
    render(topbar(t('vehicles'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let list = [];
    try { list = await API.call('listVehicles', { includeArchived: isMgmt() }); } catch (e) { list = (state.boot && state.boot.fahrzeuge) || []; }
    const days = v => v.letztesProtokollAm ? Math.round((Date.now() - new Date(v.letztesProtokollAm)) / 86400000) : null;
    let html = topbar(t('vehicles'), { back: 'home' }) + '<main><input type="text" id="vs" placeholder="' + t('search') + '" autocapitalize="characters"><div id="vl" class="mt"></div>' + (isMgmt() ? '<button class="btn secondary mt" id="imp">' + t('importVehicles') + '</button>' : '') + '</main>';
    render(html);
    const rl = q => { q = (q || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, ''); $('#vl').innerHTML = list.filter(v => !q || String(v.kennzeichen).toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '').indexOf(q) >= 0).map(v => { const dd = days(v); return '<button class="list-item" data-nav="vehicle/' + v.id + '"><div class="main"><b>' + esc(v.kennzeichen) + (v.status === 'archiviert' ? ' <span class="badge grey">Archiv</span>' : '') + '</b><span>' + esc(v.modell || '') + (v.km ? ' · ' + esc(v.km) + ' km' : '') + ' · ' + (v.fahrer ? esc(v.fahrer) : '–') + ' · ' + t('lastProtocol') + ': ' + (dd === null ? t('never') : dd + ' ' + t('days')) + '</span></div>' + (v.offeneSchaeden ? '<span class="badge red">' + v.offeneSchaeden + '</span>' : '') + (dd === null || dd >= 14 ? '<span class="badge">!</span>' : '') + '<div class="chev">›</div></button>'; }).join(''); bindNav(); };
    rl(''); $('#vs').oninput = e => rl(e.target.value);
    if ($('#imp')) $('#imp').onclick = () => { const s = sheet('<h2>' + t('importVehicles') + '</h2><p class="small muted">' + t('importHint') + '</p><textarea id="imp-t" style="min-height:160px" placeholder="DZ-FA 43  Mercedes Sprinter\nDZ-FA 36"></textarea><button class="btn mt" id="imp-ok">' + t('save') + '</button>'); $('#imp-ok', s.el).onclick = async () => { overlay('…'); try { const r = await API.call('importVehicles', { liste: $('#imp-t', s.el).value }); hideOverlay(); s.close(); toast(r.length + ' ✓'); state.boot = null; viewVehicles(); } catch (e) { hideOverlay(); toast(errMsg(e), true); } }; };
  }
  async function viewVehicle(id) {
    render(topbar(t('vehicles'), { back: 'vehicles' }) + '<main><div class="spinner"></div></main>');
    let ctx, protos = [];
    try { ctx = await API.call('getVehicleContext', { id }); protos = await API.call('listProtocols', { fahrzeugId: id, scope: isMgmt() ? 'all' : 'mine', limit: 30 }); } catch (e) { return render(topbar(t('vehicles'), { back: 'vehicles' }) + '<main><div class="card danger">' + esc(errMsg(e)) + '</div></main>'); }
    const v = ctx.fahrzeug;
    let html = topbar(v.kennzeichen, { back: 'vehicles' }) + '<main><div class="card gold"><h1>' + esc(v.kennzeichen) + '</h1><p class="muted">' + esc(v.modell || '') + (v.km ? ' · ' + esc(v.km) + ' km' : '') + '</p><p>' + t('driver') + ': <b>' + esc(v.fahrer || '–') + '</b></p>' + (isMgmt() ? '<div class="row wrap mt"><button class="btn small secondary" id="v-edit">✎ ' + t('model') + '</button><button class="btn small ghost" id="v-arch">' + t('archive') + '</button></div>' : '') + '</div>';
    html += '<button class="btn" id="v-new">＋ ' + t('newProtocol') + '</button>';
    if ((ctx.offeneSchaeden || []).length) html += '<div class="card mt"><h3>' + t('openDamages') + ' (' + ctx.offeneSchaeden.length + ')</h3>' + ctx.offeneSchaeden.map(d => '<div class="dmg-item"><div class="code">' + esc(d.code) + '</div>' + (d.thumb ? '<img class="thumb" src="' + d.thumb + '">' : '') + '<div class="info"><b>' + esc(d.codeText) + '</b> · ' + t(VIEW_LBL[d.ansicht] || 'left') + (d.beschreibung ? '<br>' + esc(d.beschreibung) : '') + '<span>' + t('firstSeen') + ' ' + fmtD(d.erstmeldungAm) + ' · ' + t('responsible') + ': ' + esc(d.verantwortlich) + '</span></div></div>').join('') + '</div>';
    html += '<h3 class="mt">' + t('protocol') + '</h3>' + (protos.map(protoItem).join('') || '<p class="muted small">–</p>') + '</main>';
    render(html);
    $('#v-new').onclick = async () => { const drafts = await DB.all('drafts'); if (drafts.length && !(await confirmDlg(t('reallyDiscard')))) return; for (const dr of drafts) await discardDraft(dr.clientId); startDraft(); await boot(); setTimeout(() => selectVehicle(id), 100); };
    if ($('#v-edit')) $('#v-edit').onclick = () => { const s = sheet('<h2>' + esc(v.kennzeichen) + '</h2><label class="lbl">' + t('model') + '</label><input type="text" id="e-m" value="' + esc(v.modell || '') + '"><label class="lbl">' + t('adminNote') + '</label><input type="text" id="e-n" value=""><button class="btn mt" id="e-ok">' + t('save') + '</button>'); $('#e-ok', s.el).onclick = async () => { try { await API.call('updateVehicle', { id, modell: $('#e-m', s.el).value, notiz: $('#e-n', s.el).value }); s.close(); state.boot = null; viewVehicle(id); } catch (e) { toast(errMsg(e), true); } }; };
    if ($('#v-arch')) $('#v-arch').onclick = async () => { if (!(await confirmDlg(t('archive') + ' ' + v.kennzeichen + '?'))) return; try { await API.call('updateVehicle', { id, status: 'archiviert' }); state.boot = null; go('vehicles'); } catch (e) { toast(errMsg(e), true); } };
  }

  /* ---------- Dashboard ---------- */
  async function viewDashboard() {
    render(topbar(t('dashboard'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let d;
    try { d = await API.call('dashboard', { tage: 30 }); } catch (e) { return render(topbar(t('dashboard'), { back: 'home' }) + '<main><div class="card danger">' + esc(errMsg(e)) + '</div></main>'); }
    const kpi = (n, l) => '<div class="card"><div class="num">' + n + '</div><div class="lbl">' + esc(l) + '</div></div>';
    const tbl = (rows, heads) => '<table class="tbl"><tr>' + heads.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
    const sec = (title, inner, cls) => '<div class="card ' + (cls || '') + '"><h3>' + esc(title) + '</h3>' + inner + '</div>';
    let html = topbar(t('dashboard'), { back: 'home' }) + '<main><p class="small muted">' + t('last30') + '</p><div class="kpi">' + kpi(d.neueSchaeden.length, t('newDamagesCount')) + kpi(d.anzahlProtokolleZeitraum, t('protocol')) + kpi(d.offeneSchaedenGesamt, t('openDamages')) + kpi(d.anzahlFahrzeuge, t('vehicles')) + '</div>';
    html += sec(t('newDamagesCount') + ' (' + d.neueSchaeden.length + ')', d.neueSchaeden.length ? d.neueSchaeden.map(x => '<div class="dmg-item new" data-dmg="' + x.id + '"><div class="code">' + esc(x.code) + '</div><div class="info"><b>' + esc(x.kennzeichen) + '</b> · ' + esc(x.codeText) + ' · ' + t(VIEW_LBL[x.ansicht] || 'left') + '<span>' + fmtD(x.erstmeldungAm) + ' · ' + t('responsible') + ': <b>' + esc(x.verantwortlich) + '</b></span></div><div class="chev">›</div></div>').join('') : '<p class="muted small">–</p>', 'mt');
    html += sec(t('byDriver'), tbl(Object.keys(d.proFahrer).sort((a, b) => d.proFahrer[b] - d.proFahrer[a]).map(k => [esc(k), d.proFahrer[k]]), [t('driver'), '#']));
    html += sec(t('byVehicle'), tbl(Object.keys(d.proFahrzeug).sort((a, b) => d.proFahrzeug[b] - d.proFahrzeug[a]).map(k => [esc(k), d.proFahrzeug[k]]), [t('plate'), '#']));
    html += sec(t('vehiclesNoProtocol') + ' (' + d.ohneProtokoll.length + ')', d.ohneProtokoll.map(v => '<button class="list-item" data-nav="vehicle/' + v.id + '"><div class="main"><b>' + esc(v.kennzeichen) + '</b><span>' + esc(v.fahrer || '–') + ' · ' + (v.tage === null ? t('never') : v.tage + ' ' + t('days')) + '</span></div><div class="chev">›</div></button>').join('') || '<p class="muted small">–</p>', d.ohneProtokoll.length ? 'danger' : '');
    html += sec(t('oneSided') + ' (' + d.offeneEinseitig.length + ')', d.offeneEinseitig.map(protoItem).join('') || '<p class="muted small">–</p>');
    html += sec(t('disputedProtocols') + ' (' + d.widersprochen.length + ')', d.widersprochen.map(protoItem).join('') || '<p class="muted small">–</p>', d.widersprochen.length ? 'danger' : '');
    html += sec(t('withHints') + ' (' + d.mitHinweisen.length + ')', d.mitHinweisen.map(p => protoItem(p) + '<p class="small muted" style="margin:-4px 0 10px 6px">' + p.hinweise.map(esc).join('<br>') + '</p>').join('') || '<p class="muted small">–</p>');
    html += sec(t('missingParts') + ' (' + d.fehlteile.length + ')', d.fehlteile.length ? tbl(d.fehlteile.map(f => [esc(f.kennzeichen), esc(f.teil), f.soll + ' / ' + f.haben, esc(f.fahrer || '')]), [t('plate'), '', t('target') + '/' + t('actual'), t('driver')]) : '<p class="muted small">–</p>');
    html += sec(t('recentProtocols'), d.letzteProtokolle.map(protoItem).join(''));
    html += sec(t('kmOverview'), tbl(d.kmUebersicht.map(k => [esc(k.kennzeichen), esc(k.km || '–'), esc(k.fahrer || '–'), fmtD(k.letztesProtokollAm)]), [t('plate'), 'km', t('driver'), t('date')]));
    html += '<div class="card"><div class="row wrap"><button class="btn small secondary" id="csv">' + t('exportCsv') + '</button><button class="btn small ghost" id="lnk-s">' + t('openSheet') + '</button><button class="btn small ghost" id="lnk-f">' + t('openFolder') + '</button></div></div></main>';
    render(html);
    $$('[data-dmg]').forEach(el => el.onclick = () => damageSheet(el.getAttribute('data-dmg'), viewDashboard));
    $('#csv').onclick = async () => { overlay('…'); try { const r = await API.call('exportCsv', { tabelle: 'Schaeden' }); hideOverlay(); dl(r.dateiname, r.csv); const r2 = await API.call('exportCsv', { tabelle: 'Protokolle' }); dl(r2.dateiname, r2.csv); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
    const links = async which => { try { const r = await API.call('links'); window.open(which === 's' ? r.tabelle : r.ordner, '_blank'); } catch (e) { toast(errMsg(e), true); } };
    $('#lnk-s').onclick = () => links('s'); $('#lnk-f').onclick = () => links('f');
  }
  function dl(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); }

  /* ---------- Schäden (Management) ---------- */
  async function viewDamages() {
    render(topbar(t('damages'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let status = localStorage.getItem('vip_dmg_status') || 'offen';
    const load = async () => {
      let rows = [];
      try { rows = await API.call('listDamages', { status: status === 'alle' ? '' : status, limit: 200 }); } catch (e) { toast(errMsg(e), true); }
      let html = topbar(t('damages'), { back: 'home' }) + '<main><div class="tabs">' + ['offen', 'repariert', 'bestritten', 'abgerechnet', 'alle'].map(s => '<button class="' + (status === s ? 'on' : '') + '" data-st="' + s + '">' + (s === 'alle' ? '∑' : t({ offen: 'open', repariert: 'fixed', bestritten: 'disputed', abgerechnet: 'settled' }[s])) + '</button>').join('') + '</div>';
      html += rows.map(x => '<button class="dmg-item ' + (x.status === 'offen' ? 'new' : '') + '" data-dmg="' + x.id + '" style="width:100%;text-align:left"><div class="code">' + esc(x.code) + '</div><div class="info"><b>' + esc(x.kennzeichen) + '</b> · ' + esc(x.codeText) + ' · ' + t(VIEW_LBL[x.ansicht] || 'left') + (x.beschreibung ? ' · ' + esc(x.beschreibung) : '') + '<span>' + fmtD(x.erstmeldungAm) + ' · ' + t('responsible') + ': <b>' + esc(x.verantwortlich) + '</b> · ' + esc(x.status) + '</span></div><div class="chev">›</div></button>').join('') || '<p class="muted center mt">–</p>';
      render(html + '</main>');
      $$('[data-st]').forEach(b => b.onclick = () => { status = b.getAttribute('data-st'); localStorage.setItem('vip_dmg_status', status); load(); });
      $$('[data-dmg]').forEach(el => el.onclick = () => damageSheet(el.getAttribute('data-dmg'), load));
    };
    load();
  }
  async function damageSheet(id, after) {
    overlay('…');
    let d;
    try { const rows = await API.call('listDamages', { limit: 500 }); d = rows.find(x => x.id === id); if (!d) throw new Error('?'); if (d.fotoId) { try { d.thumb = (await API.call('getPhoto', { photoId: d.fotoId })).dataUrl; } catch (e) { } } } catch (e) { hideOverlay(); return toast(errMsg(e), true); }
    hideOverlay();
    const s = sheet('<h2>' + esc(d.kennzeichen) + ' · ' + esc(d.code) + ' ' + esc(d.codeText) + '</h2>' + (d.thumb ? '<img class="thumb lg" src="' + d.thumb + '">' : '') +
      '<table class="tbl mt"><tr><th>' + t('firstSeen') + '</th><td>' + fmtDT(d.erstmeldungAm) + '</td></tr><tr><th>' + t('period') + '</th><td>' + (d.zeitraumVon ? fmtDT(d.zeitraumVon) + ' – ' : '') + fmtDT(d.zeitraumBis) + '</td></tr><tr><th>' + t('responsible') + '</th><td><b>' + esc(d.verantwortlich) + '</b></td></tr><tr><th>' + t('size') + '</th><td>' + esc(d.groesse) + ' · ' + t(VIEW_LBL[d.ansicht] || 'left') + '</td></tr>' + (d.beschreibung ? '<tr><th>' + t('note') + '</th><td>' + esc(d.beschreibung) + '</td></tr>' : '') + '</table>' +
      '<button class="btn ghost small mt" data-nav="protocol/' + esc(d.erstmeldungProtokollId) + '">' + t('protocol') + ' ›</button>' +
      (isMgmt() ? '<h3 class="mt">' + t('setStatus') + '</h3><div class="chips" id="ds">' + ['offen', 'repariert', 'bestritten', 'abgerechnet'].map(x => '<button class="chip ' + (d.status === x ? 'on' : '') + '" data-s="' + x + '">' + t({ offen: 'open', repariert: 'fixed', bestritten: 'disputed', abgerechnet: 'settled' }[x]) + '</button>').join('') + '</div><label class="lbl">' + t('adminNote') + '</label><input type="text" id="dn" value="' + esc(d.notizAdmin || '') + '"><button class="btn mt" id="d-save">' + t('save') + '</button>' : ''));
    $$('[data-nav]', s.el).forEach(b => b.onclick = () => { s.close(); go(b.getAttribute('data-nav')); });
    let st = d.status;
    $$('#ds .chip', s.el).forEach(c => c.onclick = () => { st = c.getAttribute('data-s'); $$('#ds .chip', s.el).forEach(x => x.classList.toggle('on', x === c)); });
    if ($('#d-save', s.el)) $('#d-save', s.el).onclick = async () => { try { await API.call('updateDamage', { id, status: st, notizAdmin: $('#dn', s.el).value }); s.close(); toast('✓'); if (after) after(); } catch (e) { toast(errMsg(e), true); } };
  }

  /* ---------- Mitarbeiter (Admin) ---------- */
  async function viewUsers() {
    render(topbar(t('users'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let rows = [];
    try { rows = await API.call('adminListUsers'); } catch (e) { return render(topbar(t('users'), { back: 'home' }) + '<main><div class="card danger">' + esc(errMsg(e)) + '</div></main>'); }
    rows.sort((a, b) => (a.nachname + a.vorname).localeCompare(b.nachname + b.vorname, 'de'));
    const roleT = r => t(r === 'admin' ? 'roleAdmin' : r === 'dispo' ? 'roleDispo' : 'roleDriver');
    let html = topbar(t('users') + ' (' + rows.filter(r => r.aktiv).length + ')', { back: 'home' }) + '<main><button class="btn secondary" id="u-add">＋ ' + t('addUser') + '</button><div class="mt">' +
      rows.map(u => '<button class="list-item" data-u="' + u.id + '"><div class="main"><b>' + esc(u.nachname) + ', ' + esc(u.vorname) + (!u.aktiv ? ' <span class="badge grey">inaktiv</span>' : '') + '</b><span>' + esc(u.email) + ' · ' + roleT(u.rolle) + ' · ' + esc(u.bereich || '') + '</span></div>' + (u.passwortGesetzt ? '<span class="badge green">PW</span>' : '<span class="badge grey">–</span>') + '<div class="chev">›</div></button>').join('') + '</div></main>';
    render(html);
    const edit = u => {
      const s = sheet('<h2>' + (u ? esc(u.vorname + ' ' + u.nachname) : t('addUser')) + '</h2><label class="lbl">' + t('firstName') + '</label><input type="text" id="u-v" value="' + esc(u ? u.vorname : '') + '"><label class="lbl">' + t('lastName') + '</label><input type="text" id="u-n" value="' + esc(u ? u.nachname : '') + '"><label class="lbl">' + t('email') + '</label><input type="email" id="u-e" value="' + esc(u ? u.email : '') + '" autocapitalize="off"><label class="lbl">' + t('role') + '</label><select id="u-r">' + ['fahrer', 'dispo', 'admin'].map(r => '<option value="' + r + '" ' + (u && u.rolle === r ? 'selected' : '') + '>' + roleT(r) + '</option>').join('') + '</select><label class="lbl">' + t('area') + '</label><input type="text" id="u-b" value="' + esc(u ? u.bereich : '') + '" list="areas"><datalist id="areas"><option>UPS-Fahrer</option><option>UPS-Fahrer (Samstag)</option><option>UPS-Sortierung</option><option>UPS-Disposition</option><option>Parkplatz</option><option>Verwaltung</option></datalist>' +
        '<label class="lbl">' + t('active') + '</label><div class="chips two"><button class="chip ' + (!u || u.aktiv ? 'on' : '') + '" data-a="1">' + t('yes') + '</button><button class="chip red ' + (u && !u.aktiv ? 'on' : '') + '" data-a="0">' + t('no') + '</button></div>' +
        '<button class="btn mt" id="u-ok">' + t('save') + '</button>' + (u ? '<button class="btn ghost mt" id="u-reset">' + t('resetPw') + '</button><p class="small muted">' + t('resetPwHint') + '</p>' : ''));
      let aktiv = !u || u.aktiv;
      $$('[data-a]', s.el).forEach(c => c.onclick = () => { aktiv = c.getAttribute('data-a') === '1'; $$('[data-a]', s.el).forEach(x => x.classList.toggle('on', x === c)); });
      $('#u-ok', s.el).onclick = async () => { try { await API.call('adminUpsertUser', { id: u ? u.id : '', vorname: $('#u-v', s.el).value.trim(), nachname: $('#u-n', s.el).value.trim(), email: $('#u-e', s.el).value.trim(), rolle: $('#u-r', s.el).value, bereich: $('#u-b', s.el).value.trim(), aktiv }); s.close(); state.boot = null; viewUsers(); } catch (e) { toast(errMsg(e), true); } };
      if (u) $('#u-reset', s.el).onclick = async () => { if (!(await confirmDlg(t('resetPw') + ': ' + u.vorname + ' ' + u.nachname + '?'))) return; try { await API.call('adminResetPassword', { id: u.id }); s.close(); toast('✓'); viewUsers(); } catch (e) { toast(errMsg(e), true); } };
    };
    $('#u-add').onclick = () => edit(null);
    $$('[data-u]').forEach(el => el.onclick = () => edit(rows.find(r => r.id === el.getAttribute('data-u'))));
  }

  /* ---------- Einstellungen ---------- */
  function viewSettings() {
    const u = state.user || {};
    render(topbar(t('settings'), { back: 'home' }) + '<main><div class="card"><b>' + esc(u.name || '') + '</b><div class="small muted">' + esc(u.email || '') + ' · ' + esc(u.rolle || '') + '</div></div>' +
      '<div class="card"><h3>' + t('language') + '</h3><div class="chips two"><button class="chip ' + (I18N.lang === 'de' ? 'on' : '') + '" data-l="de">Deutsch</button><button class="chip ' + (I18N.lang === 'en' ? 'on' : '') + '" data-l="en">English</button></div></div>' +
      '<div class="card"><h3>' + t('changePassword') + '</h3><label class="lbl">' + t('oldPassword') + '</label><input type="password" id="pw-old" autocomplete="current-password"><label class="lbl">' + t('newPassword') + '</label><input type="password" id="pw-new" autocomplete="new-password"><button class="btn secondary mt" id="pw-ok">' + t('save') + '</button></div>' +
      '<div class="card"><h3>' + t('privacy') + '</h3><p class="small muted">' + t('privacyText') + '</p></div>' +
      '<div class="card"><p class="small muted">' + t('installHint') + '</p></div>' +
      '<button class="btn danger" id="logout">' + t('logout') + '</button><p class="small muted center mt" id="ver">' + t('version') + ' ' + window.VIP_CONFIG.APP_VERSION + '</p></main>');
    $$('[data-l]').forEach(c => c.onclick = async () => { I18N.setLang(c.getAttribute('data-l')); try { await API.call('setLanguage', { sprache: I18N.lang }); } catch (e) { } viewSettings(); });
    $('#pw-ok').onclick = async () => { try { await API.call('changePassword', { oldPassword: $('#pw-old').value, password: $('#pw-new').value }); toast('✓'); $('#pw-old').value = ''; $('#pw-new').value = ''; } catch (e) { toast(errMsg(e), true); } };
    $('#logout').onclick = async () => { try { await API.call('logout'); } catch (e) { } API.clearSession(); state.user = null; state.boot = null; go('login'); };
    let taps = 0; $('#ver').onclick = () => { if (++taps >= 5) { taps = 0; const cur = localStorage.getItem('vip_api_url') || ''; const v = prompt('Backend-URL (leer = Standard aus config.js)', cur); if (v !== null) { if (v.trim()) localStorage.setItem('vip_api_url', v.trim()); else localStorage.removeItem('vip_api_url'); toast('✓'); } } };
  }

  /* ---------- Router ---------- */
  function route() {
    $$('.sheet-bg').forEach(el => el.remove()); hideOverlay();
    const h = (location.hash || '#home').slice(1);
    const [name, arg] = h.split('/');
    if (!API.configured()) return render('<div class="login-wrap"><img src="' + logoSrc + '"><div class="card danger"><b>Backend-Adresse fehlt.</b><p class="small">Bitte in <code>js/config.js</code> die Web-App-URL eintragen.</p><button class="btn small secondary mt" id="cfg">URL eingeben</button></div></div>') || ($('#cfg').onclick = () => { const v = prompt('Web-App-URL'); if (v) { localStorage.setItem('vip_api_url', v.trim()); route(); } });
    if (!state.user && name !== 'login') return go('login');
    if (state.user && name === 'login') return go('home');
    if (window.MOD && MOD.routes && MOD.routes[name]) return MOD.routes[name](arg);
    switch (name) {
      case 'login': return viewLogin();
      case 'home': return (window.MOD && MOD.home) ? MOD.home() : viewHome();
      case 'new': return viewWizard();
      case 'protocols': return viewProtocols();
      case 'protocol': return viewProtocol(arg);
      case 'vehicles': return viewVehicles();
      case 'vehicle': return viewVehicle(arg);
      case 'dashboard': return viewDashboard();
      case 'damages': return viewDamages();
      case 'users': return viewUsers();
      case 'settings': return viewSettings();
      default: return go('home');
    }
  }
  window.APP = { state, render, topbar, go, toast, overlay, hideOverlay, sheet, confirmDlg, esc, fmtD, fmtDT, t, boot, takePhoto, thumbUrl, userName, isMgmt, isAdmin, protoItem, startDraft, selectVehicle, discardDraft, uuid, bindNav, viewHome, logoFor, CODES, VIEW_LBL, INVENTAR };
  window.addEventListener('hashchange', route);
  window.addEventListener('vip:logout', () => { state.user = null; state.boot = null; go('login'); });
  window.addEventListener('online', () => { if ((location.hash || '#home') === '#home') viewHome(); });
  window.addEventListener('offline', () => { if ((location.hash || '#home') === '#home') viewHome(); });
  API.onProgress(ev => { if (ev.type === 'sent') { toast(t('sent') + ' ' + (ev.result && ev.result.nr || '')); if ((location.hash || '#home') === '#home') viewHome(); } });
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(() => { });
  route();
  if (state.user) setTimeout(() => API.flush(), 1500);
})();
