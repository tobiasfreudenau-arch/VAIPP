// Module 2–4: Rollen-Startseite, Dienstplan & Tourbericht, Urlaubsplaner, Mitarbeiter-Übersicht, Einstellungen
(function () {
  const A = window.APP; if (!A) return;
  const { state, render, topbar, go, toast, overlay, hideOverlay, sheet, confirmDlg, esc, fmtD, fmtDT, boot, thumbUrl, bindNav } = A;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const de = I18N.lang !== 'en';
  const T = (d, e) => de ? d : (e || d);
  const GRP = { management: { de: 'Management', col: '#D0C090', txt: '#0A0A08' }, parkplatz: { de: 'Parkplatz', col: '#F2D24B', txt: '#0A0A08' }, ups: { de: 'UPS', col: '#4FA3E0', txt: '#06121c' }, beide: { de: 'UPS + Parkplatz', col: '#4CC46A', txt: '#05210d' } };
  const TYP = { urlaub: 'Urlaub', krank: 'Krank', kindkrank: 'Kind krank', elternzeit: 'Elternzeit', frei: 'Frei', sonderurlaub: 'Sonderurlaub', ueberstunden: 'Überstundenausgleich', unbezahlt: 'Unbezahlt', sonstiges: 'Sonstiges' };
  const STATUS_TXT = { tour: 'Tour', dienst: 'Dienst', urlaub: 'Urlaub', krank: 'Krank', kindkrank: 'Kind krank', frei: 'Frei', sonderurlaub: 'Sonderurlaub', buero: 'Büro', ueberhang: 'Überhang', ups: 'UPS', springer: 'Springer', elternzeit: 'Elternzeit', sonstiges: '' };
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const ymd = d => { const x = d instanceof Date ? d : new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const today = () => ymd(new Date());
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const dow = s => new Date(s + 'T12:00:00').getDay();
  const fmtShort = s => { const d = new Date(s + 'T12:00:00'); return WD[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; };
  const nowHM = () => new Date().toTimeString().slice(0, 5);
  const u = () => state.user || {};
  const grp = () => u().gruppe || 'ups';
  const mgmt = () => A.isMgmt() || grp() === 'management';
  const canUps = () => ['ups', 'beide', 'management'].indexOf(grp()) >= 0;
  const canPark = () => ['parkplatz', 'beide', 'management'].indexOf(grp()) >= 0;
  const errMsg = e => (e && e.message) || 'Fehler';
  const pill = g => { const x = GRP[g] || GRP.ups; return '<span class="badge" style="background:' + x.col + ';color:' + x.txt + ';border-color:' + x.col + '">' + esc(x.de) + '</span>'; };
  const card = (title, inner, cls) => '<div class="card ' + (cls || '') + '">' + (title ? '<h3>' + esc(title) + '</h3>' : '') + inner + '</div>';

  /* ---------- Fotos außerhalb des Protokoll-Assistenten (Tour beenden) ---------- */
  async function photoUpload(typ) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.className = 'file-hidden'; document.body.appendChild(inp);
    const file = await new Promise(res => { inp.onchange = () => res(inp.files[0] || null); inp.click(); });
    inp.remove(); if (!file) return null;
    overlay('…');
    try {
      const { full, thumb } = await IMG.process(file);
      const r = await API.call('uploadPhoto', { clientPhotoId: A.uuid(), typ, full: await API.blobToDataUrl(full), thumb: await API.blobToDataUrl(thumb), aufgenommenAm: new Date().toISOString() }, { timeout: 120000 });
      return { photoId: r.photoId, url: URL.createObjectURL(thumb) };
    } catch (e) { toast(errMsg(e), true); return null; } finally { hideOverlay(); }
  }

  /* ---------- Startseite nach Rolle ---------- */
  async function home() {
    render(topbar(T('Start', 'Home'), { right: '<button class="icon-btn" data-nav="settings">⚙︎</button>' }) + '<main><div class="spinner"></div></main>');
    const b = await boot(true); if (!b) return go('login');
    const drafts = await DB.all('drafts'); const outbox = await DB.all('outbox');
    const draft = drafts.filter(d => !outbox.find(o => o.clientId === d.clientId)).sort((a, c) => (c.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
    const h = b.heute || {}; const plan = (h.plan || []); const tourPlan = plan.find(p => p.status === 'tour'); const dienst = plan.find(p => p.quelle === 'schichtplan');
    const tb = h.tourbericht;
    let html = topbar(T('Start', 'Home'), { right: '<button class="icon-btn" data-nav="settings">⚙︎</button>' }) + '<main>';
    html += '<div class="row" style="margin-bottom:10px"><p class="muted grow" style="margin:0">Hallo ' + esc(u().vorname || u().name) + '</p>' + pill(grp()) + '</div>';
    // Heute
    let heute = '';
    if (h.abwesenheit) heute = '<div class="row"><span class="badge red">' + esc(h.abwesenheit.typText) + '</span><span class="grow">' + T('bis', 'until') + ' ' + fmtD(h.abwesenheit.bis) + '</span></div>';
    else if (tourPlan) heute = '<div style="font-size:26px;font-weight:700;color:var(--gold2)">' + esc(tourPlan.tour) + ' <span class="muted" style="font-size:15px;font-weight:400">' + esc(tourPlan.area || '') + '</span></div><div class="row wrap mt"><span class="badge">🚐 ' + esc(tourPlan.kennzeichen || '–') + '</span><span class="badge">⏰ ' + esc(tourPlan.start || '–') + '</span>' + (tb ? '<span class="badge ' + (tb.status === 'beendet' ? 'green' : '') + '">' + (tb.status === 'beendet' ? T('Tour beendet', 'Tour ended') : T('Gestartet', 'Started') + ' ' + esc(tb.startIst)) + '</span>' : '') + '</div>';
    else if (dienst) heute = '<div style="font-size:22px;font-weight:700;color:var(--gold2)">' + esc(STATUS_TXT[dienst.status] || dienst.code) + (dienst.start ? ' <span class="muted" style="font-size:15px;font-weight:400">ab ' + esc(dienst.start) + '</span>' : '') + '</div>';
    else if (plan.length) heute = '<div style="font-size:20px;font-weight:700;color:var(--gold2)">' + esc(STATUS_TXT[plan[0].status] || plan[0].code || '') + '</div>';
    else heute = '<p class="muted" style="margin:0">' + T('Kein Eintrag im Dienstplan für heute.', 'No schedule entry for today.') + '</p>';
    if (canUps() || canPark()) html += '<div class="card gold"><h3>' + T('Heute', 'Today') + ' · ' + fmtShort(h.datum || today()) + '</h3>' + heute + (canUps() && !h.abwesenheit ? '<div class="btn-row mt">' + (!tb || tb.status !== 'beendet' ? '<button class="btn ' + (tb ? 'secondary' : '') + '" data-nav="tourstart">▶ ' + T('Tour starten', 'Start tour') + '</button>' : '') + '<button class="btn ' + (tb && tb.status === 'beendet' ? 'ghost' : 'secondary') + '" data-nav="tourende">■ ' + T('Tour beenden', 'End tour') + '</button></div>' : '') + '</div>';
    if (outbox.length) html += '<div class="card gold"><h2>' + A.t('pending') + ' (' + outbox.length + ')</h2><p class="small muted">' + A.t('pendingHint') + '</p></div>';
    if (draft) html += '<div class="card gold"><h2>' + A.t('draftFound') + '</h2><p class="small muted">' + esc(draft.kennzeichenAnzeige || '–') + ' · ' + A.t('step') + ' ' + (draft.step || 1) + '/8</p><div class="btn-row"><button class="btn" id="cont">' + A.t('continueDraft') + '</button><button class="btn ghost" id="disc">' + A.t('discardDraft') + '</button></div></div>';
    (b.offeneBestaetigungen || []).forEach(p => { html += '<div class="card danger"><h2>' + A.t('toConfirm') + '</h2><button class="list-item" data-nav="protocol/' + p.id + '"><div class="main"><b>' + esc(p.kennzeichen) + ' · ' + esc(p.nr) + '</b><span>' + fmtDT(p.datum) + ' · ' + esc(p.von) + ' → ' + esc(p.an) + '</span></div><div class="chev">›</div></button></div>'; });
    html += '<button class="btn big" id="new">＋ ' + A.t('newProtocol') + '</button><div class="gold-line"></div>';
    const tile = (nav, ico, lbl, cnt) => '<button class="tile" data-nav="' + nav + '"><span class="ico">' + ico + '</span>' + lbl + (cnt ? '<span class="cnt badge red">' + cnt + '</span>' : '') + '</button>';
    html += '<div class="menu">' + tile('heute', '📅', T('Mein Dienstplan', 'My schedule')) + tile('urlaub', '🏖️', T('Urlaub', 'Vacation')) + tile('protocols', '📋', A.t('myProtocols')) + tile('vehicles', '🚐', A.t('vehicles')) + (canUps() ? tile('tourberichte', '🧾', T('Meine Touren', 'My tours')) : '');
    if (mgmt()) {
      let offen = 0; try { offen = (await API.call('listRequests', { status: 'beantragt', limit: 50 })).length; } catch (e) { }
      html += tile('tagesbericht', '📊', T('Tagesbericht', 'Daily report')) + tile('dienstplan', '🗓️', T('Dienstplan (alle)', 'Schedule (all)')) + tile('antraege', '✅', T('Urlaubsanträge', 'Requests'), offen) + tile('abwesenheit', '📝', T('Abwesenheit eintragen', 'Enter absence')) + tile('uebersicht', '👤', T('Mitarbeiter-Übersicht', 'Staff overview')) + tile('dashboard', '⚠️', A.t('dashboard') + ' / ' + A.t('damages'));
    }
    if (A.isAdmin()) html += tile('users', '👥', A.t('users')) + tile('einstellungen', '🛠️', T('Verwaltung', 'Admin'));
    html += '</div></main>';
    render(html);
    $('#new').onclick = async () => { if (draft) { if (!(await confirmDlg(A.t('reallyDiscard')))) return; await A.discardDraft(draft.clientId); } A.startDraft(); };
    if (draft) { $('#cont').onclick = () => { state.draft = draft; go('new'); }; $('#disc').onclick = async () => { if (await confirmDlg(A.t('reallyDiscard'))) { await A.discardDraft(draft.clientId); home(); } }; }
  }

  /* ---------- Mein Dienstplan (Woche) ---------- */
  async function viewHeute(arg) {
    let start = arg || ymd(new Date(new Date().setDate(new Date().getDate() - ((new Date().getDay() + 6) % 7))));
    render(topbar(T('Mein Dienstplan', 'My schedule'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let d; try { d = await API.call('dienstplan', { von: start, bis: addDays(start, 6) }); } catch (e) { return render(topbar('Dienstplan', { back: 'home' }) + '<main><div class="card danger">' + esc(errMsg(e)) + '</div></main>'); }
    let html = topbar(T('Mein Dienstplan', 'My schedule'), { back: 'home' }) + '<main><div class="row"><button class="btn small ghost" id="prev">‹</button><div class="grow center"><b>KW ' + isoWeek(start) + '</b><div class="small muted">' + fmtD(start) + ' – ' + fmtD(addDays(start, 6)) + '</div></div><button class="btn small ghost" id="next">›</button></div>';
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i); const mine = d.plan.filter(p => p.datum === day); const abw = (d.abwesenheiten || []).filter(a => a.userId === u().id && a.von <= day && a.bis >= day)[0];
      const isToday = day === today();
      let txt = '';
      if (abw) txt = '<span class="badge red">' + esc(abw.typText) + '</span>';
      else if (!mine.length) txt = '<span class="muted small">–</span>';
      else txt = mine.map(p => p.status === 'tour' ? '<b>' + esc(p.tour) + '</b> ' + esc(p.kennzeichen || '') + (p.start ? ' · ' + esc(p.start) : '') + (p.area ? '<br><span class="small muted">' + esc(p.area) + '</span>' : '') : '<b>' + esc(STATUS_TXT[p.status] || p.code) + '</b>' + (p.start ? ' ab ' + esc(p.start) : '')).join('<br>');
      html += '<div class="card ' + (isToday ? 'gold' : '') + '" style="padding:10px 14px"><div class="row"><div style="width:62px"><b>' + WD[dow(day)] + '</b><div class="small muted">' + day.slice(8) + '.' + day.slice(5, 7) + '.</div></div><div class="grow">' + txt + '</div></div></div>';
    }
    const others = (d.abwesenheiten || []).filter(a => a.userId !== u().id);
    if (others.length) html += card(T('Abwesend diese Woche', 'Absent this week'), others.map(a => '<div class="small">' + esc(a.name) + ' · ' + fmtD(a.von) + '–' + fmtD(a.bis) + (a.typ !== 'abwesend' ? ' (' + esc(a.typText) + ')' : '') + '</div>').join(''));
    render(html + '</main>');
    $('#prev').onclick = () => go('heute/' + addDays(start, -7)); $('#next').onclick = () => go('heute/' + addDays(start, 7));
  }
  function isoWeek(s) { const d = new Date(s + 'T12:00:00'); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); return Math.ceil((((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7); }

  /* ---------- Tour starten ---------- */
  async function viewTourStart() {
    render(topbar(T('Tour starten', 'Start tour'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    const b = await boot(); const h = await API.call('heute').catch(() => b.heute) || {};
    const plan = (h.plan || []).find(p => p.status === 'tour') || {}; const tb = h.tourbericht;
    const sel = { tour: (tb && tb.tourIst) || plan.tour || '', kz: (tb && tb.kennzeichenIst) || plan.kennzeichen || '', start: (tb && tb.startIst) || nowHM() };
    const tours = b.touren || [];
    const draw = () => {
      let html = topbar(T('Tour starten', 'Start tour'), { back: 'home' }) + '<main>';
      html += card(T('Tour', 'Tour'), (plan.tour ? '<p class="small muted">' + T('Laut Dienstplan', 'Per schedule') + ': <b>' + esc(plan.tour) + '</b> ' + esc(plan.area || '') + '</p>' : '<p class="small muted">' + T('Kein Dienstplan-Eintrag – bitte Tour wählen.', 'No schedule entry – choose a tour.') + '</p>') + '<div class="chips">' + tours.map(t => '<button class="chip ' + (sel.tour === t.code ? 'on' : '') + '" data-tour="' + esc(t.code) + '"><b>' + esc(t.code) + '</b>' + (t.gebiet ? '<span class="sub">' + esc(t.gebiet.slice(0, 22)) + '</span>' : '') + '</button>').join('') + '</div>');
      html += card(T('Fahrzeug', 'Vehicle'), '<input type="text" id="kz" value="' + esc(sel.kz) + '" placeholder="DZ-VF 103" autocapitalize="characters"><div class="chips mt" style="grid-template-columns:repeat(auto-fill,minmax(96px,1fr))">' + (b.fahrzeuge || []).slice(0, 24).map(v => '<button class="chip ' + (norm(sel.kz) === norm(v.kennzeichen) ? 'on' : '') + '" data-kz="' + esc(v.kennzeichen) + '" style="min-height:42px;font-size:13px">' + esc(v.kennzeichen) + '</button>').join('') + '</div>');
      html += card(T('Arbeitsbeginn', 'Start time'), '<input type="time" id="start" value="' + esc(sel.start) + '">');
      html += '<button class="btn" id="ok">▶ ' + T('Tour starten', 'Start tour') + '</button></main>';
      render(html);
      $$('[data-tour]').forEach(c => c.onclick = () => { sel.tour = c.getAttribute('data-tour'); draw(); });
      $$('[data-kz]').forEach(c => c.onclick = () => { sel.kz = c.getAttribute('data-kz'); draw(); });
      $('#kz').oninput = e => { sel.kz = e.target.value; };
      $('#start').oninput = e => { sel.start = e.target.value; };
      $('#ok').onclick = async () => {
        if (!sel.tour) return toast(T('Bitte Tour wählen', 'Choose a tour'), true);
        overlay('…');
        try { const v = (b.fahrzeuge || []).find(x => norm(x.kennzeichen) === norm(sel.kz)); await API.call('startTour', { tour: sel.tour, kennzeichen: sel.kz, fahrzeugId: v ? v.id : '', startIst: sel.start }); hideOverlay(); toast('✓ ' + T('Gute Fahrt!', 'Safe trip!')); state.boot = null; go('home'); }
        catch (e) { hideOverlay(); toast(errMsg(e), true); }
      };
    };
    draw();
  }
  const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');

  /* ---------- Tour beenden ---------- */
  async function viewTourEnd() {
    render(topbar(T('Tour beenden', 'End tour'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    const b = await boot(); const h = await API.call('heute').catch(() => b.heute) || {};
    const plan = (h.plan || []).find(p => p.status === 'tour') || {}; const tb = h.tourbericht || {};
    const f = { tour: tb.tourIst || plan.tour || '', kz: tb.kennzeichenIst || plan.kennzeichen || '', startIst: tb.startIst || plan.start || '', endeIst: tb.endeIst || nowHM(), kmEnde: tb.kmEnde || '', kmFotoId: tb.kmFotoId || '', kmUrl: '', stopps: tb.stopps || '', pakete: tb.pakete || '', kg: tb.kg || '', sauber: tb.sauber !== 'nein', neueSchaeden: tb.neueSchaeden === 'ja', schadenHinweis: tb.schadenHinweis || '', fahrtenbuch: tb.fahrtenbuch !== 'nein', tanken: !!tb.tankenLiter, tankenLiter: tb.tankenLiter || '', tankenBetrag: tb.tankenBetrag || '', tankenFotoId: tb.tankenFotoId || '', tankenUrl: '', bemerkung: tb.bemerkung || '' };
    const yn = (key, lbl, redYes) => '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="grow">' + lbl + '</div><div class="chips two" style="width:170px;gap:6px"><button class="chip ' + (f[key] ? 'on' : '') + (redYes ? ' red' : ' green') + '" data-yn="' + key + '" data-v="1" style="min-height:40px">' + A.t('yes') + '</button><button class="chip ' + (!f[key] ? 'on' : '') + (redYes ? ' green' : ' red') + '" data-yn="' + key + '" data-v="0" style="min-height:40px">' + A.t('no') + '</button></div></div>';
    const num = (key, lbl, ph) => '<label class="lbl">' + lbl + '</label><input type="number" inputmode="numeric" data-f="' + key + '" value="' + esc(f[key]) + '" placeholder="' + (ph || '') + '">';
    const draw = () => {
      let html = topbar(T('Tour beenden', 'End tour'), { back: 'home' }) + '<main>';
      html += card(T('Tour & Fahrzeug', 'Tour & vehicle'), '<div class="row"><div class="grow"><label class="lbl">Tour</label><select data-f="tour">' + (b.touren || []).map(t => '<option value="' + esc(t.code) + '" ' + (f.tour === t.code ? 'selected' : '') + '>' + esc(t.code) + (t.gebiet ? ' – ' + esc(t.gebiet.slice(0, 20)) : '') + '</option>').join('') + '</select></div><div class="grow"><label class="lbl">' + A.t('plate') + '</label><input type="text" data-f="kz" value="' + esc(f.kz) + '" autocapitalize="characters" list="kzl"><datalist id="kzl">' + (b.fahrzeuge || []).map(v => '<option value="' + esc(v.kennzeichen) + '">').join('') + '</datalist></div></div>' + (plan.tour && (plan.tour !== f.tour || (plan.kennzeichen && norm(plan.kennzeichen) !== norm(f.kz))) ? '<p class="small danger mt">' + T('Abweichung vom Dienstplan', 'Differs from schedule') + ' (' + esc(plan.tour) + ' / ' + esc(plan.kennzeichen || '–') + ')</p>' : ''));
      html += card(T('Zeiten & Kilometer', 'Times & km'), '<div class="row"><div class="grow"><label class="lbl">' + T('Arbeit Start', 'Start') + '</label><input type="time" data-f="startIst" value="' + esc(f.startIst) + '"></div><div class="grow"><label class="lbl">' + T('Arbeit Ende', 'End') + '</label><input type="time" data-f="endeIst" value="' + esc(f.endeIst) + '"></div></div>' +
        '<label class="lbl">' + T('KM-Stand Ende', 'Odometer end') + '</label><input type="number" inputmode="numeric" class="huge" data-f="kmEnde" value="' + esc(f.kmEnde) + '">');
      html += card(T('Fahrzeug-Check', 'Vehicle check'), yn('sauber', T('Fahrzeug sauber hinterlassen?', 'Vehicle left clean?')) + yn('neueSchaeden', T('Neue Schäden heute?', 'New damages today?'), true) + (f.neueSchaeden ? '<label class="lbl">' + T('Kurz: wo / was?', 'Where / what?') + '</label><input type="text" data-f="schadenHinweis" value="' + esc(f.schadenHinweis) + '"><p class="small muted">' + T('Nach dem Speichern bitte ein Übergabeprotokoll mit Foto erstellen.', 'After saving please create a handover protocol with a photo.') + '</p>' : '') + yn('fahrtenbuch', T('Fahrtenbuch geführt?', 'Logbook kept?')));
      html += card(T('Tanken', 'Fuel'), yn('tanken', T('Heute getankt?', 'Refuelled today?')) + (f.tanken ? '<div class="row"><div class="grow">' + num('tankenLiter', 'Liter') + '</div><div class="grow">' + num('tankenBetrag', 'Betrag €') + '</div></div><div class="photo-grid mt" style="grid-template-columns:1fr 1fr"><div class="photo-tile ' + (f.tankenFotoId ? 'done' : '') + '" id="tk-photo">' + (f.tankenUrl ? '<img src="' + f.tankenUrl + '">' : f.tankenFotoId ? '<span class="ico">✓</span>' : '<span class="ico">📷</span>') + '<div class="cap">' + T('Beleg', 'Receipt') + '</div></div></div>' : ''));
      html += card('', '<label class="lbl">' + A.t('remark') + '</label><textarea data-f="bemerkung">' + esc(f.bemerkung) + '</textarea>');
      html += '<button class="btn" id="ok">■ ' + T('Tour beenden & melden', 'End tour & report') + '</button></main>';
      render(html);
      $$('[data-f]').forEach(el => el.oninput = () => { f[el.getAttribute('data-f')] = el.value; });
      $$('[data-yn]').forEach(c => c.onclick = () => { f[c.getAttribute('data-yn')] = c.getAttribute('data-v') === '1'; draw(); });
      if ($('#tk-photo')) $('#tk-photo').onclick = async () => { const r = await photoUpload('sonstiges'); if (r) { f.tankenFotoId = r.photoId; f.tankenUrl = r.url; draw(); } };
      $('#ok').onclick = async () => {
        if (!f.kmEnde) return toast(T('Bitte KM-Stand eingeben', 'Please enter the odometer reading'), true);
        if (!f.tour) return toast(T('Bitte Tour wählen', 'Choose a tour'), true);
        overlay('…');
        try {
          const v = (b.fahrzeuge || []).find(x => norm(x.kennzeichen) === norm(f.kz));
          const r = await API.call('endTour', { tour: f.tour, kennzeichen: f.kz, fahrzeugId: v ? v.id : '', startIst: f.startIst, endeIst: f.endeIst, kmEnde: f.kmEnde, kmFotoId: f.kmFotoId, stopps: f.stopps, pakete: f.pakete, kg: f.kg, sauber: f.sauber, neueSchaeden: f.neueSchaeden, schadenHinweis: f.schadenHinweis, fahrtenbuch: f.fahrtenbuch, tankenLiter: f.tanken ? f.tankenLiter : '', tankenBetrag: f.tanken ? f.tankenBetrag : '', tankenFotoId: f.tanken ? f.tankenFotoId : '', bemerkung: f.bemerkung });
          hideOverlay(); state.boot = null;
          render(topbar(T('Gemeldet', 'Reported')) + '<main><div class="card ok center"><div style="font-size:52px">✓</div><h1>' + T('Tour gemeldet', 'Tour reported') + '</h1><p>' + esc(r.tourIst) + ' · ' + esc(r.kennzeichenIst) + ' · ' + esc(r.kmEnde) + ' km</p>' + (r.abweichungen && r.abweichungen.length ? '<p class="small danger">' + r.abweichungen.map(esc).join('<br>') + '</p>' : '') + '</div>' + (f.neueSchaeden ? '<button class="btn" id="np">＋ ' + A.t('newProtocol') + '</button>' : '') + '<button class="btn ghost mt" data-nav="home">' + A.t('home') + '</button></main>');
          if ($('#np')) $('#np').onclick = () => { A.startDraft(); if (v) setTimeout(() => A.selectVehicle(v.id), 150); };
        } catch (e) { hideOverlay(); toast(errMsg(e), true); }
      };
    };
    draw();
  }

  async function viewTourberichte() {
    render(topbar(T('Meine Touren', 'My tours'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let rows = []; try { rows = await API.call('myTourReports', { limit: 40 }); } catch (e) { toast(errMsg(e), true); }
    render(topbar(T('Meine Touren', 'My tours'), { back: 'home' }) + '<main>' + (rows.map(r => '<div class="card" style="padding:10px 14px"><div class="row"><b>' + fmtShort(r.datum) + '</b><span class="badge">' + esc(r.tourIst) + '</span><span class="muted small grow">' + esc(r.kennzeichenIst) + '</span><span class="badge ' + (r.status === 'beendet' ? 'green' : 'grey') + '">' + esc(r.status) + '</span></div><div class="small muted mt">' + esc(r.startIst || '') + '–' + esc(r.endeIst || '') + ' · ' + esc(r.kmEnde || '–') + ' km' + (r.neueSchaeden === 'ja' ? ' · <span class="danger">Schaden</span>' : '') + '</div>' + (r.abweichungen.length ? '<div class="small danger">' + r.abweichungen.map(esc).join('<br>') + '</div>' : '') + '</div>').join('') || '<p class="muted center mt">–</p>') + '</main>');
  }

  /* ---------- Tagesbericht (Management) ---------- */
  async function viewTagesbericht(arg) {
    const datum = arg || today();
    render(topbar(T('Tagesbericht', 'Daily report'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let b; try { b = await API.call('tagesbericht', { datum }); } catch (e) { return render(topbar('Tagesbericht', { back: 'home' }) + '<main><div class="card danger">' + esc(errMsg(e)) + '</div></main>'); }
    const s = b.summe;
    let html = topbar(T('Tagesbericht', 'Daily report'), { back: 'home' }) + '<main><div class="row"><button class="btn small ghost" data-nav="tagesbericht/' + addDays(datum, -1) + '">‹</button><div class="grow center"><b>' + fmtShort(datum) + '</b></div><button class="btn small ghost" data-nav="tagesbericht/' + addDays(datum, 1) + '">›</button></div>';
    html += '<div class="kpi mt"><div class="card"><div class="num">' + s.beendet + '/' + s.touren + '</div><div class="lbl">' + T('gemeldet', 'reported') + '</div></div><div class="card"><div class="num ' + (s.fehlt ? 'danger' : '') + '">' + s.fehlt + '</div><div class="lbl">' + T('ohne Meldung', 'missing') + '</div></div><div class="card"><div class="num ' + (s.abweichungen ? 'danger' : '') + '">' + s.abweichungen + '</div><div class="lbl">' + T('Abweichungen', 'Deviations') + '</div></div><div class="card"><div class="num ' + (s.neueSchaeden ? 'danger' : '') + '">' + s.neueSchaeden + '</div><div class="lbl">' + T('neue Schäden', 'new damages') + '</div></div></div>';
    if (!b.planVorhanden) html += '<div class="card danger mt">' + T('Für diesen Tag wurde keine DPL-Datei eingelesen.', 'No DPL file imported for this day.') + ' <button class="btn small secondary" id="imp">' + T('Jetzt einlesen', 'Import now') + '</button></div>';
    html += '<div class="card mt"><h3>' + T('Touren', 'Tours') + '</h3>' + (b.zeilen.map(z => { const r = z.bericht || {}; return '<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row"><span class="badge">' + esc(z.tour) + '</span><b class="grow">' + esc(z.fahrer) + '</b><span class="badge ' + (z.status === 'beendet' ? 'green' : z.status === 'gestartet' ? '' : 'red') + '">' + (z.status === 'fehlt' ? T('keine Meldung', 'missing') : esc(z.status)) + '</span></div><div class="small muted">' + esc(r.kennzeichenIst || z.kennzeichenPlan || '–') + ' · ' + esc(r.startIst || z.startPlan || '–') + (r.endeIst ? '–' + esc(r.endeIst) : '') + (r.kmEnde ? ' · ' + esc(r.kmEnde) + ' km' : '') + (r.sauber === 'nein' ? ' · <span class="danger">nicht sauber</span>' : '') + (r.neueSchaeden === 'ja' ? ' · <span class="danger">Schaden: ' + esc(r.schadenHinweis || '') + '</span>' : '') + (r.fahrtenbuch === 'nein' ? ' · <span class="danger">kein Fahrtenbuch</span>' : '') + (r.tankenLiter ? ' · ⛽ ' + esc(r.tankenLiter) + ' l' : '') + '</div>' + (r.abweichungen && r.abweichungen.length ? '<div class="small danger">' + r.abweichungen.map(esc).join('<br>') + '</div>' : '') + (r.bemerkung ? '<div class="small muted">„' + esc(r.bemerkung) + '“</div>' : '') + '</div>'; }).join('') || '<p class="muted small">–</p>') + '</div>';
    if (b.abwesend.length) html += card(T('Abwesend', 'Absent'), b.abwesend.map(a => '<span class="badge grey" style="margin:2px">' + esc(a.name) + ' · ' + esc(a.typText) + '</span>').join(''));
    if (b.parkplatz.length) html += card('Parkplatz', b.parkplatz.map(p => '<span class="badge grey" style="margin:2px">' + esc(p.name) + ': ' + esc(p.code || p.status) + '</span>').join(''));
    html += '<div class="card"><div class="row wrap"><button class="btn small secondary" id="send">✉︎ ' + T('Bericht jetzt mailen', 'Mail report now') + '</button><button class="btn small ghost" id="imp2">↻ DPL ' + T('einlesen', 'import') + '</button></div></div></main>';
    render(html);
    const imp = async () => { overlay('…'); try { const r = await API.call('importDienstplan', {}); hideOverlay(); toast((Array.isArray(r) ? r.length : 0) + ' ' + T('Datei(en) eingelesen', 'file(s) imported')); viewTagesbericht(datum); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
    if ($('#imp')) $('#imp').onclick = imp; $('#imp2').onclick = imp;
    $('#send').onclick = async () => { overlay('…'); try { const r = await API.call('sendTagesbericht', { datum }); hideOverlay(); toast('✓ ' + r.gesendetAn.length + ' Empfänger'); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
  }

  /* ---------- Dienstplan alle (Management, Tagesansicht) ---------- */
  async function viewDienstplan(arg) {
    const datum = arg || today();
    render(topbar('Dienstplan', { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let d; try { d = await API.call('dienstplan', { von: datum, bis: datum }); } catch (e) { return render(topbar('Dienstplan', { back: 'home' }) + '<main><div class="card danger">' + esc(errMsg(e)) + '</div></main>'); }
    const tours = d.plan.filter(p => p.quelle === 'dpl').sort((a, c) => String(a.tour).localeCompare(String(c.tour)));
    const park = d.plan.filter(p => p.quelle === 'schichtplan');
    let html = topbar('Dienstplan', { back: 'home' }) + '<main><div class="row"><button class="btn small ghost" data-nav="dienstplan/' + addDays(datum, -1) + '">‹</button><div class="grow center"><b>' + fmtShort(datum) + '</b></div><button class="btn small ghost" data-nav="dienstplan/' + addDays(datum, 1) + '">›</button></div>';
    html += card('UPS (' + tours.length + ')', tours.map(p => '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="badge">' + esc(p.tour || p.code) + '</span><b class="grow">' + esc(p.name) + (p.userId ? '' : ' <span class="danger small">(nicht zugeordnet)</span>') + '</b><span class="small muted">' + esc(p.kennzeichen || '') + ' ' + esc(p.start || '') + '</span></div>').join('') || '<p class="muted small">' + T('Keine DPL-Datei für diesen Tag.', 'No DPL file for this day.') + '</p>', 'mt');
    if (park.length) html += card('Parkplatz', park.map(p => '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><b class="grow">' + esc(p.name) + '</b><span class="badge grey">' + esc(STATUS_TXT[p.status] || p.code) + (p.start ? ' ' + esc(p.start) : '') + '</span></div>').join(''));
    if (d.abwesenheiten.length) html += card(T('Abwesend', 'Absent'), d.abwesenheiten.map(a => '<div class="row" style="padding:4px 0"><b class="grow">' + esc(a.name) + '</b>' + pill(a.gruppe) + '<span class="badge red">' + esc(a.typText) + '</span></div>').join(''));
    render(html + '</main>');
  }

  /* ---------- Urlaubsplaner ---------- */
  let cal = { jahr: new Date().getFullYear(), monat: new Date().getMonth() + 1, selStart: null, selEnd: null };
  async function viewUrlaub(arg) {
    if (arg) { const m = arg.match(/^(\d{4})-(\d{1,2})$/); if (m) { cal.jahr = Number(m[1]); cal.monat = Number(m[2]); } }
    render(topbar(T('Urlaub', 'Vacation'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let d; try { d = await API.call('urlaubKalender', { jahr: cal.jahr, monat: cal.monat }); } catch (e) { return render(topbar('Urlaub', { back: 'home' }) + '<main><div class="card danger">' + esc(errMsg(e)) + '</div></main>'); }
    const isM = mgmt();
    const first = cal.jahr + '-' + String(cal.monat).padStart(2, '0') + '-01'; const days = new Date(cal.jahr, cal.monat, 0).getDate();
    const prevM = cal.monat === 1 ? (cal.jahr - 1) + '-12' : cal.jahr + '-' + (cal.monat - 1), nextM = cal.monat === 12 ? (cal.jahr + 1) + '-1' : cal.jahr + '-' + (cal.monat + 1);
    const byDay = {}; (d.eintraege || []).forEach(e => { let x = e.von; while (x <= e.bis) { (byDay[x] = byDay[x] || []).push(e); x = addDays(x, 1); } });
    const weekOf = day => { const monday = addDays(day, -((dow(day) + 6) % 7)); return Object.keys(d.wochen || {}).map(k => d.wochen[k]).find(w => w.montag === monday); };
    let html = topbar(T('Urlaub', 'Vacation'), { back: 'home' }) + '<main>';
    html += '<div class="row"><button class="btn small ghost" data-nav="urlaub/' + prevM + '">‹</button><div class="grow center"><b>' + MON[cal.monat - 1] + ' ' + cal.jahr + '</b></div><button class="btn small ghost" data-nav="urlaub/' + nextM + '">›</button></div>';
    const k = d.konto || {};
    html += '<div class="kpi mt"><div class="card"><div class="num">' + (k.gepflegt ? k.rest : '–') + '</div><div class="lbl">' + T('Resturlaub', 'Remaining') + ' ' + cal.jahr + '</div></div><div class="card"><div class="num">' + (k.genommen || 0) + '</div><div class="lbl">' + T('genehmigt', 'approved') + '</div></div><div class="card"><div class="num">' + (k.beantragt || 0) + '</div><div class="lbl">' + T('beantragt', 'requested') + '</div></div></div>';
    if (d.dezSperre) html += '<div class="card danger mt"><b>' + T('Dezember: Urlaubssperre.', 'December: no vacation.') + '</b> ' + T('In diesem Monat sind keine Anträge möglich.', 'No requests possible this month.') + '</div>';
    // Kalender
    html += '<div class="card mt" style="padding:10px"><table class="cal"><tr>' + ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => '<th>' + w + '</th>').join('') + '<th class="kw">KW</th></tr>';
    let dayN = 1 - ((dow(first) + 6) % 7);
    while (dayN <= days) {
      html += '<tr>';
      let weekDay = null;
      for (let i = 0; i < 7; i++, dayN++) {
        if (dayN < 1 || dayN > days) { html += '<td class="off"></td>'; continue; }
        const day = cal.jahr + '-' + String(cal.monat).padStart(2, '0') + '-' + String(dayN).padStart(2, '0'); weekDay = day;
        const list = byDay[day] || []; const mine = list.filter(e => e.userId === u().id); const holiday = (d.feiertage || []).indexOf(day) >= 0; const blocked = (d.gesperrt || []).indexOf(day) >= 0;
        const inSel = cal.selStart && ((cal.selEnd && day >= cal.selStart && day <= cal.selEnd) || day === cal.selStart);
        let cls = 'd'; if (i >= 5) cls += ' we'; if (holiday) cls += ' hol'; if (blocked) cls += ' blk'; if (inSel) cls += ' sel'; if (day === today()) cls += ' today'; if (day < today()) cls += ' past';
        let dots = '';
        if (isM) dots = list.slice(0, 6).map(e => '<i style="background:' + (GRP[e.gruppe] || GRP.ups).col + (e.status === 'beantragt' ? ';opacity:.45' : '') + '"></i>').join('') + (list.length > 6 ? '<i class="more">+</i>' : '');
        else if (mine.length) dots = '<i style="background:' + (mine[0].status === 'beantragt' ? 'var(--warn)' : mine[0].typ === 'urlaub' ? 'var(--gold)' : 'var(--danger)') + '"></i>';
        html += '<td class="' + cls + '" data-day="' + day + '"><span>' + dayN + '</span><div class="dots">' + dots + '</div></td>';
      }
      const w = weekDay ? weekOf(weekDay) : null;
      html += '<td class="kw">' + (weekDay ? isoWeek(weekDay) : '') + (w && !d.dezSperre ? '<div class="occ ' + (w.max && w.anzahl >= w.max ? 'full' : '') + '">' + w.anzahl + (w.max ? '/' + w.max : '') + '</div>' : '') + '</td></tr>';
    }
    html += '</table><div class="legend">' + (isM ? Object.keys(GRP).map(g => '<span><i style="background:' + GRP[g].col + '"></i>' + GRP[g].de + '</span>').join('') : '<span><i style="background:var(--gold)"></i>' + T('mein Urlaub', 'my vacation') + '</span><span><i style="background:var(--warn)"></i>' + T('beantragt', 'requested') + '</span><span><i style="background:var(--danger)"></i>' + T('andere Abwesenheit', 'other absence') + '</span>') + '<span><i style="background:transparent;border:1px solid var(--danger)"></i>' + T('gesperrt', 'blocked') + '</span>' + (!isM && !d.dezSperre ? '<span class="muted">KW-Spalte: ' + T('belegt / maximal', 'used / max') + '</span>' : '') + '</div></div>';
    if (!d.dezSperre) html += '<p class="small muted">' + (cal.selStart && !cal.selEnd ? T('Jetzt den letzten Urlaubstag antippen.', 'Now tap the last day.') : T('Ersten Urlaubstag antippen, dann den letzten.', 'Tap first day, then last day.')) + '</p>';
    if (cal.selStart && cal.selEnd) html += '<div class="card gold"><b>' + fmtD(cal.selStart) + ' – ' + fmtD(cal.selEnd) + '</b><label class="lbl">' + T('Bemerkung (optional)', 'Note (optional)') + '</label><input type="text" id="u-k"><div class="btn-row mt"><button class="btn" id="u-req">' + T('Urlaub beantragen', 'Request vacation') + '</button><button class="btn ghost" id="u-x">✕</button></div></div>';
    // Meine Einträge
    const meine = (d.meine || []).sort((a, c) => a.von.localeCompare(c.von));
    if (meine.length) html += card(T('Meine Einträge', 'My entries'), meine.map(e => '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><div class="grow"><b>' + esc(e.typText) + '</b> ' + fmtD(e.von) + ' – ' + fmtD(e.bis) + ' <span class="muted small">(' + e.tage + ' Tg.)</span>' + (e.kommentarAdmin ? '<div class="small muted">' + esc(e.kommentarAdmin) + '</div>' : '') + '</div><span class="badge ' + (e.status === 'genehmigt' ? 'green' : e.status === 'beantragt' ? '' : 'red') + '">' + esc(e.status) + '</span>' + (e.typ === 'urlaub' && e.von >= today() && (e.status === 'beantragt' || e.status === 'genehmigt') ? '<button class="btn small ghost" data-cancel="' + e.id + '">✕</button>' : '') + '</div>').join(''));
    if (isM) html += '<div class="btn-row"><button class="btn secondary" data-nav="abwesenheit">＋ ' + T('Eintragen', 'Enter') + '</button><button class="btn ghost" data-nav="antraege">' + T('Anträge', 'Requests') + '</button></div>';
    html += '</main>';
    render(html);
    $$('td.d').forEach(td => td.onclick = () => {
      const day = td.getAttribute('data-day');
      if (isM) { const list = byDay[day] || []; if (list.length) sheet('<h2>' + fmtShort(day) + '</h2>' + list.map(e => '<div class="row" style="padding:6px 0;border-bottom:1px solid var(--line)"><b class="grow">' + esc(e.name) + '</b>' + pill(e.gruppe) + '<span class="badge ' + (e.status === 'genehmigt' ? 'green' : '') + '">' + esc(e.typText) + (e.status === 'beantragt' ? ' (beantragt)' : '') + '</span></div>').join('')); if (!list.length || true) { /* Auswahl auch für Management erlaubt (eigener Urlaub) */ } }
      if (d.dezSperre) return;
      if (!cal.selStart || cal.selEnd) { cal.selStart = day; cal.selEnd = null; } else { if (day < cal.selStart) { cal.selEnd = cal.selStart; cal.selStart = day; } else cal.selEnd = day; }
      viewUrlaub();
    });
    if ($('#u-x')) $('#u-x').onclick = () => { cal.selStart = cal.selEnd = null; viewUrlaub(); };
    if ($('#u-req')) $('#u-req').onclick = async () => { overlay('…'); try { const r = await API.call('requestVacation', { von: cal.selStart, bis: cal.selEnd, kommentar: $('#u-k').value }); hideOverlay(); cal.selStart = cal.selEnd = null; toast('✓ ' + T('Antrag gesendet', 'Request sent') + ' (' + r.tage + ' Tg.)'); viewUrlaub(); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
    $$('[data-cancel]').forEach(b => b.onclick = async () => { if (!(await confirmDlg(T('Eintrag stornieren?', 'Cancel entry?')))) return; try { await API.call('cancelAbsence', { id: b.getAttribute('data-cancel') }); viewUrlaub(); } catch (e) { toast(errMsg(e), true); } });
  }

  /* ---------- Anträge (Admin) ---------- */
  async function viewAntraege() {
    render(topbar(T('Urlaubsanträge', 'Requests'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let rows = []; try { rows = await API.call('listRequests', { limit: 200 }); } catch (e) { toast(errMsg(e), true); }
    const offen = rows.filter(r => r.status === 'beantragt'), rest = rows.filter(r => r.status !== 'beantragt').slice(0, 60);
    const item = r => '<div class="card" style="padding:10px 14px"><div class="row"><b class="grow">' + esc(r.name) + '</b>' + pill(r.gruppe) + '<span class="badge ' + (r.status === 'genehmigt' ? 'green' : r.status === 'beantragt' ? '' : 'red') + '">' + esc(r.status) + '</span></div><div class="mt"><b>' + esc(r.typText) + '</b> ' + fmtD(r.von) + ' – ' + fmtD(r.bis) + ' (' + r.tage + ' Tg.)' + (r.konto ? ' · ' + T('Rest danach', 'left after') + ': ' + (r.konto.gepflegt ? (r.konto.rest + (r.status === 'beantragt' ? 0 : 0)) : '–') : '') + '</div>' + (r.kommentar ? '<div class="small muted">„' + esc(r.kommentar) + '“</div>' : '') + (r.kommentarAdmin ? '<div class="small muted">Admin: ' + esc(r.kommentarAdmin) + '</div>' : '') + (r.status === 'beantragt' && A.isAdmin() ? '<div class="btn-row mt"><button class="btn small" data-ok="' + r.id + '">✓ ' + T('Genehmigen', 'Approve') + '</button><button class="btn small danger" data-no="' + r.id + '">✕ ' + T('Ablehnen', 'Decline') + '</button></div>' : '') + (r.status === 'genehmigt' && A.isAdmin() && r.von >= today() ? '<button class="btn small ghost mt" data-st="' + r.id + '">' + T('Stornieren', 'Cancel') + '</button>' : '') + '</div>';
    render(topbar(T('Urlaubsanträge', 'Requests') + ' (' + offen.length + ')', { back: 'home' }) + '<main>' + (offen.map(item).join('') || '<p class="muted center">' + T('Keine offenen Anträge.', 'No open requests.') + '</p>') + '<h3 class="mt">' + T('Entschieden / Einträge', 'Decided / entries') + '</h3>' + rest.map(item).join('') + '</main>');
    const decide = (id, status) => { const s = sheet('<h2>' + (status === 'genehmigt' ? T('Genehmigen', 'Approve') : T('Ablehnen', 'Decline')) + '</h2><label class="lbl">' + T('Kommentar (optional)', 'Comment (optional)') + '</label><input type="text" id="dk"><button class="btn mt ' + (status === 'genehmigt' ? '' : 'danger') + '" id="dok">OK</button>'); $('#dok', s.el).onclick = async () => { try { await API.call('decideAbsence', { id, status, kommentar: $('#dk', s.el).value }); s.close(); toast('✓'); viewAntraege(); } catch (e) { toast(errMsg(e), true); } }; };
    $$('[data-ok]').forEach(b => b.onclick = () => decide(b.getAttribute('data-ok'), 'genehmigt'));
    $$('[data-no]').forEach(b => b.onclick = () => decide(b.getAttribute('data-no'), 'abgelehnt'));
    $$('[data-st]').forEach(b => b.onclick = async () => { if (!(await confirmDlg(T('Stornieren?', 'Cancel?')))) return; try { await API.call('cancelAbsence', { id: b.getAttribute('data-st') }); viewAntraege(); } catch (e) { toast(errMsg(e), true); } });
  }

  /* ---------- Abwesenheit eintragen (Management) ---------- */
  async function viewAbwesenheit() {
    const b = await boot();
    const f = { userId: '', typ: 'krank', von: today(), bis: today(), kommentar: '', benachrichtigen: false };
    const draw = () => {
      render(topbar(T('Abwesenheit eintragen', 'Enter absence'), { back: 'home' }) + '<main>' +
        card(T('Mitarbeiter', 'Employee'), '<select id="a-u"><option value="">– ' + T('wählen', 'choose') + ' –</option>' + (b.mitarbeiter || []).map(m => '<option value="' + m.id + '" ' + (f.userId === m.id ? 'selected' : '') + '>' + esc(m.name) + ' (' + esc((GRP[m.gruppe] || {}).de || m.bereich || '') + ')</option>').join('') + '</select>') +
        card(T('Art', 'Type'), '<div class="chips">' + Object.keys(TYP).filter(k => k !== 'urlaub' || A.isAdmin()).map(k => '<button class="chip ' + (f.typ === k ? 'on' : '') + '" data-typ="' + k + '">' + esc(TYP[k]) + '</button>').join('') + '</div>') +
        card(T('Zeitraum', 'Period'), '<div class="row"><div class="grow"><label class="lbl">' + T('Von', 'From') + '</label><input type="date" id="a-v" value="' + f.von + '"></div><div class="grow"><label class="lbl">' + T('Bis', 'To') + '</label><input type="date" id="a-b" value="' + f.bis + '"></div></div><label class="lbl">' + T('Kommentar', 'Comment') + '</label><input type="text" id="a-k" value="' + esc(f.kommentar) + '"><div class="chips two mt"><button class="chip ' + (f.benachrichtigen ? 'on' : '') + '" id="a-n">✉︎ ' + T('Mitarbeiter per Mail informieren', 'Notify by e-mail') + '</button></div>') +
        '<button class="btn" id="a-ok">' + A.t('save') + '</button></main>');
      $('#a-u').onchange = e => f.userId = e.target.value; $('#a-v').onchange = e => { f.von = e.target.value; if (f.bis < f.von) f.bis = f.von; draw(); }; $('#a-b').onchange = e => f.bis = e.target.value; $('#a-k').oninput = e => f.kommentar = e.target.value;
      $$('[data-typ]').forEach(c => c.onclick = () => { f.typ = c.getAttribute('data-typ'); draw(); }); $('#a-n').onclick = () => { f.benachrichtigen = !f.benachrichtigen; draw(); };
      $('#a-ok').onclick = async () => { if (!f.userId) return toast(T('Bitte Mitarbeiter wählen', 'Choose employee'), true); overlay('…'); try { await API.call('adminCreateAbsence', f); hideOverlay(); toast('✓'); go('urlaub'); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
    };
    draw();
  }

  /* ---------- Mitarbeiter-Übersicht ---------- */
  async function viewUebersicht() {
    render(topbar(T('Mitarbeiter-Übersicht', 'Staff overview'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let tage = Number(localStorage.getItem('vip_ov_tage') || 30);
    const load = async () => {
      let rows = []; try { rows = await API.call('userOverview', { tage }); } catch (e) { toast(errMsg(e), true); }
      const ohne = rows.filter(r => !r.gesamt).length;
      let html = topbar(T('Mitarbeiter-Übersicht', 'Staff overview'), { back: 'home' }) + '<main><div class="tabs">' + [[30, '30 Tage'], [90, '90 Tage'], [365, '1 Jahr'], [0, 'Alle']].map(x => '<button class="' + (tage === x[0] ? 'on' : '') + '" data-t="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
      html += '<p class="small muted">' + rows.length + ' ' + T('Mitarbeiter', 'employees') + ' · <span class="' + (ohne ? 'danger' : 'ok') + '">' + ohne + ' ' + T('ohne Protokoll', 'without protocol') + '</span></p>';
      html += rows.map(r => '<div class="card ' + (!r.gesamt ? 'danger' : '') + '" style="padding:10px 14px"><div class="row"><b class="grow">' + esc(r.name) + '</b>' + pill(r.gruppe) + '<span class="badge ' + (r.gesamt ? '' : 'red') + '">' + r.gesamt + ' ' + T('Protokolle', 'protocols') + '</span></div><div class="small muted mt">' + T('übergeben', 'handed over') + ' ' + r.uebergeben + ' · ' + T('übernommen', 'taken over') + ' ' + r.uebernommen + ' · ' + T('erstellt', 'created') + ' ' + r.erstellt + ' · ' + T('zuletzt', 'last') + ': ' + (r.letztesProtokoll ? fmtD(r.letztesProtokoll) : '–') + (r.aktuellesFahrzeug ? ' · 🚐 ' + esc(r.aktuellesFahrzeug) : '') + (r.tourberichte30 ? ' · ' + r.tourberichte30 + ' Touren/30 Tg.' : '') + '</div></div>').join('');
      html += '<div class="card"><button class="btn small secondary" id="rb">↻ ' + T('Tabellenblatt „Übersicht Mitarbeiter“ aktualisieren', 'Refresh sheet') + '</button></div></main>';
      render(html);
      $$('[data-t]').forEach(b => b.onclick = () => { tage = Number(b.getAttribute('data-t')); localStorage.setItem('vip_ov_tage', tage); load(); });
      $('#rb').onclick = async () => { overlay('…'); try { await API.call('rebuildOverview'); hideOverlay(); toast('✓'); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
    };
    load();
  }

  /* ---------- Verwaltung / Einstellungen (Admin) ---------- */
  async function viewEinstellungen() {
    render(topbar(T('Verwaltung', 'Admin'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let st = [], imp = { importe: [] }, konten = [];
    const jahr = new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);
    try { st = await API.call('getSettings'); imp = await API.call('importStatus'); konten = await API.call('adminVacationAccounts', { jahr }); } catch (e) { toast(errMsg(e), true); }
    let html = topbar(T('Verwaltung', 'Admin'), { back: 'home' }) + '<main>';
    html += card(T('Regeln & Einstellungen', 'Rules & settings'), st.map(s => '<label class="lbl">' + esc(s.beschreibung || s.key) + '</label><input type="text" data-k="' + esc(s.key) + '" value="' + esc(s.wert) + '">').join('') + '<button class="btn secondary mt" id="s-save">' + A.t('save') + '</button>');
    html += card(T('Dienstplan-Import', 'Schedule import'), '<p class="small muted">' + T('Dateien „DPL tt.mm.jj.xlsx“ (Tagespläne) und optional „Schichtplan ….xlsx“ in den Drive-Ordner legen. Einlesen läuft stündlich automatisch.', 'Put “DPL dd.mm.yy.xlsx” files (and optional “Schichtplan …xlsx”) into the Drive folder. Import runs hourly.') + '</p><div class="row wrap"><a class="btn small ghost" style="display:inline-flex" href="' + esc(imp.ordner) + '" target="_blank">' + T('Ordner öffnen', 'Open folder') + '</a><button class="btn small secondary" id="imp-now">↻ ' + T('Jetzt einlesen', 'Import now') + '</button><button class="btn small ghost" id="imp-all">' + T('Alles neu einlesen', 'Re-import all') + '</button></div>' + (imp.importe.length ? '<table class="tbl mt"><tr><th>Datei</th><th>Zeilen</th><th>Nicht zugeordnet</th></tr>' + imp.importe.map(i => '<tr><td>' + esc(i.name) + '<br><span class="small muted">' + fmtDT(i.importiert_am) + '</span>' + (i.fehler ? '<br><span class="small danger">' + esc(i.fehler) + '</span>' : '') + '</td><td>' + esc(i.zeilen) + '</td><td class="small danger">' + esc(i.nicht_zugeordnet || '') + '</td></tr>').join('') + '</table>' : '<p class="small muted mt">' + T('Noch nichts eingelesen.', 'Nothing imported yet.') + '</p>'));
    html += card(T('Urlaubskonten', 'Vacation accounts') + ' ' + jahr, '<table class="tbl"><tr><th>Name</th><th>' + T('Anspruch', 'Entitlement') + '</th><th>' + T('Übertrag', 'Carry-over') + '</th><th>' + T('Rest', 'Left') + '</th></tr>' + konten.map(k => '<tr><td>' + esc(k.name) + '</td><td><input type="number" data-anspruch="' + k.userId + '" value="' + (k.gepflegt ? k.anspruch : '') + '" style="min-height:38px;padding:4px 8px;width:70px"></td><td><input type="number" data-uebertrag="' + k.userId + '" value="' + (k.gepflegt ? k.uebertrag : '') + '" style="min-height:38px;padding:4px 8px;width:70px"></td><td>' + (k.gepflegt ? k.rest : '–') + '</td></tr>').join('') + '</table><button class="btn secondary mt" id="k-save">' + T('Konten speichern', 'Save accounts') + '</button>');
    html += card(T('Touren', 'Tours'), '<button class="btn small secondary" id="t-edit">' + T('Touren bearbeiten', 'Edit tours') + '</button>');
    html += '</main>';
    render(html);
    $('#s-save').onclick = async () => { const werte = {}; $$('[data-k]').forEach(i => werte[i.getAttribute('data-k')] = i.value); overlay('…'); try { await API.call('setSettings', { werte }); hideOverlay(); toast('✓'); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
    const doImp = async alle => { overlay('…'); try { const r = await API.call('importDienstplan', { alle }); hideOverlay(); toast((Array.isArray(r) ? r.length : 0) + ' Datei(en)'); viewEinstellungen(); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
    $('#imp-now').onclick = () => doImp(false); $('#imp-all').onclick = () => doImp(true);
    $('#k-save').onclick = async () => { overlay('…'); try { for (const k of konten) { const a = $('[data-anspruch="' + k.userId + '"]').value, ue = $('[data-uebertrag="' + k.userId + '"]').value; if (a === '' && ue === '') continue; if (k.gepflegt && Number(a) === k.anspruch && Number(ue) === k.uebertrag) continue; await API.call('adminSetVacationAccount', { userId: k.userId, jahr, anspruch: a, uebertrag: ue }); } hideOverlay(); toast('✓'); viewEinstellungen(); } catch (e) { hideOverlay(); toast(errMsg(e), true); } };
    $('#t-edit').onclick = async () => { const tours = await API.call('listTours'); const s = sheet('<h2>Touren</h2>' + tours.map(t => '<div class="row" style="padding:4px 0"><b style="width:60px">' + esc(t.code) + '</b><input type="text" data-tg="' + esc(t.code) + '" value="' + esc(t.gebiet) + '" style="min-height:38px;padding:4px 8px"><input type="text" data-ts="' + esc(t.code) + '" value="' + esc(t.start) + '" style="min-height:38px;padding:4px 8px;width:70px"></div>').join('') + '<div class="row mt"><input type="text" id="t-new" placeholder="Neuer Code, z. B. C28" style="min-height:38px"><button class="btn small secondary" id="t-add">＋</button></div><button class="btn mt" id="t-ok">' + A.t('save') + '</button>'); $('#t-ok', s.el).onclick = async () => { overlay('…'); try { for (const t of tours) { const g = $('[data-tg="' + t.code + '"]', s.el).value, st2 = $('[data-ts="' + t.code + '"]', s.el).value; if (g !== t.gebiet || st2 !== t.start) await API.call('upsertTour', { code: t.code, gebiet: g, start: st2 }); } hideOverlay(); s.close(); toast('✓'); state.boot = null; } catch (e) { hideOverlay(); toast(errMsg(e), true); } }; $('#t-add', s.el).onclick = async () => { const c = $('#t-new', s.el).value.trim(); if (!c) return; try { await API.call('upsertTour', { code: c }); s.close(); toast('✓'); state.boot = null; $('#t-edit').click(); } catch (e) { toast(errMsg(e), true); } }; };
  }

  window.MOD = { home, routes: { heute: viewHeute, tourstart: viewTourStart, tourende: viewTourEnd, tourberichte: viewTourberichte, tagesbericht: viewTagesbericht, dienstplan: viewDienstplan, urlaub: viewUrlaub, antraege: viewAntraege, abwesenheit: viewAbwesenheit, uebersicht: viewUebersicht, einstellungen: viewEinstellungen } };
  // Startseite neu zeichnen, falls bereits geladen
  if ((location.hash || '#home') === '#home' && state.user) home();
})();
