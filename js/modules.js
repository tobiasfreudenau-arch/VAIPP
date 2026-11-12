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
  const onHome = () => ['', '#', '#home'].indexOf(location.hash) >= 0;
  let homeRefreshing = false;
  async function home() {
    let cached = state.boot || await DB.kvGet('boot').catch(() => null);
    // nur Zwischenspeicher derselben Person verwenden (Gerätewechsel / anderer Login)
    if (cached && (!cached.user || !state.user || cached.user.id !== state.user.id)) { cached = null; state.boot = null; }
    if (cached && cached.user) {
      state.boot = cached;
      await drawHome(cached, true);
      if (!homeRefreshing) {
        homeRefreshing = true;
        boot(true).then(b => { homeRefreshing = false; if (!b) return go('login'); if (onHome()) drawHome(b, false); }).catch(() => { homeRefreshing = false; });
      }
    } else {
      render(topbar(T('Start', 'Home'), { right: '<button class="icon-btn" data-nav="settings">⚙︎</button>' }) + '<main><div class="spinner"></div></main>');
      const b = await boot(true); if (!b) return go('login');
      await drawHome(b, false);
    }
    A.preloadVan3d();
  }
  async function drawHome(b, stale) {
    const drafts = await DB.all('drafts'); const outbox = await DB.all('outbox');
    const draft = drafts.filter(d => !outbox.find(o => o.clientId === d.clientId)).sort((a, c) => (c.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
    const h0 = b.heute || {}; const h = (stale && h0.datum && h0.datum !== today()) ? { datum: today(), plan: [] } : h0; const plan = (h.plan || []); const tourPlan = plan.find(p => p.status === 'tour'); const dienst = plan.find(p => p.quelle === 'schichtplan');
    const tb = h.tourbericht;
    let html = topbar(T('Start', 'Home'), { right: '<button class="icon-btn" data-nav="settings">⚙︎</button>' }) + '<main>';
    html += '<div class="row" style="margin-bottom:10px"><p class="muted grow" style="margin:0">Hallo ' + esc(u().vorname || u().name) + '</p>' + pill(grp()) + '</div>';
    // Heute
    let heute = '';
    if (h.abwesenheit) heute = '<div class="row"><span class="badge red">' + esc(h.abwesenheit.typText) + '</span><span class="grow">' + T('bis', 'until') + ' ' + fmtD(h.abwesenheit.bis) + '</span></div>';
    else if (tourPlan) heute = '<div style="font-size:26px;font-weight:700;color:var(--gold2)">' + esc(tourPlan.tour) + ' <span class="muted" style="font-size:15px;font-weight:400">' + esc(tourPlan.area || '') + '</span></div><div class="row wrap mt"><span class="badge">🚐 ' + esc(tourPlan.kennzeichen || '–') + '</span><span class="badge">⏰ ' + esc(tourPlan.start || '–') + '</span>' + (tb ? '<span class="badge ' + (tb.status === 'beendet' ? 'green' : '') + '">' + (tb.status === 'beendet' ? T('Tour beendet', 'Tour ended') : T('Gestartet', 'Started') + ' ' + esc(tb.startIst)) + '</span>' : '') + '</div>';
    else if (dienst) heute = '<div style="font-size:22px;font-weight:700;color:var(--gold2)">' + esc(STATUS_TXT[dienst.status] || dienst.code) + (dienst.start ? ' <span class="muted" style="font-size:15px;font-weight:400">ab ' + esc(dienst.start) + '</span>' : '') + '</div>';
    else if (plan.length) heute = '<div style="font-size:20px;font-weight:700;color:var(--gold2)">' + esc(STATUS_TXT[plan[0].status] || plan[0].code || '') + '</div>';
    else heute = '<p class="muted" style="margin:0">' + (stale ? T('Wird aktualisiert …', 'Updating …') : T('Kein Eintrag im Dienstplan für heute.', 'No schedule entry for today.')) + '</p>';
    const m = h.morgen;
    if (m && (m.abwesenheit || (m.plan || []).length)) {
      const mp = (m.plan || []).find(p => p.status === 'tour') || (m.plan || [])[0];
      const mtxt = m.abwesenheit ? '<span class="badge red">' + esc(m.abwesenheit.typText) + '</span>' : mp ? (mp.status === 'tour' ? '<b>' + esc(mp.tour) + '</b> ' + esc(mp.area || '') + (mp.start ? ' · ' + esc(mp.start) : '') : '<b>' + esc(STATUS_TXT[mp.status] || mp.code || '') + '</b>') : '';
      heute += '<div class="small mt" style="border-top:1px solid var(--line);padding-top:8px"><span class="muted">' + T('Morgen', 'Tomorrow') + ' · ' + fmtShort(m.datum) + ':</span> ' + mtxt + '</div>';
    }
    const locked = !!b.gesperrt;
    if (!locked && (canUps() || canPark())) html += '<div class="card gold"><h3>' + T('Heute', 'Today') + ' · ' + fmtShort(h.datum || today()) + '</h3>' + heute + (canUps() && !h.abwesenheit ? '<div class="btn-row mt">' + (!tb || tb.status !== 'beendet' ? '<button class="btn ' + (tb ? 'secondary' : '') + '" data-nav="tourstart">▶ ' + T('Tour starten', 'Start tour') + '</button>' : '') + '<button class="btn ' + (tb && tb.status === 'beendet' ? 'ghost' : 'secondary') + '" data-nav="tourende">■ ' + T('Tour beenden', 'End tour') + '</button></div>' : '') + '</div>';
    if (locked && canUps()) {
      const th = b.tourHeute;
      html += '<div class="card gold"><h3>' + T('Heute', 'Today') + ' · ' + fmtShort(today()) + '</h3>' + (th && th.kmStart
        ? (th.status === 'beendet' ? '<p style="margin:0">✓ ' + T('Tour beendet', 'Tour finished') + ': <b>' + esc(th.tour || '') + '</b> · 🚐 ' + esc(th.kennzeichen || '') + '</p>'
          : '<p style="margin:0">✓ ' + T('Tour gestartet', 'Tour started') + ': <b>' + esc(th.tour || '') + '</b> · 🚐 ' + esc(th.kennzeichen || '') + ' · ' + fmtKm(th.kmStart) + ' km</p><div class="btn-row mt"><button class="btn" data-nav="tourende">■ ' + T('Tour beenden', 'End tour') + '</button><button class="btn secondary" data-nav="tourstart">' + T('Fahrzeug / km ändern', 'Change vehicle / km') + '</button></div>')
        : '<p class="small muted" style="margin:0 0 8px">' + T('Vor Fahrtbeginn: Fahrzeug wählen und Kilometerstand eintragen.', 'Before driving: choose the vehicle and enter the odometer reading.') + '</p><button class="btn" data-nav="tourstart">▶ ' + T('Tour starten', 'Start tour') + '</button>') + '</div>';
    }
    if (mgmt() && b.km && b.km.warnungen) html += '<button class="card danger kmalert" data-nav="kilometer" style="display:block;width:100%;text-align:left"><h3>🛣️ ' + T('Kilometer', 'Mileage') + ': ' + b.km.warnungen + ' ' + T('Fahrzeug' + (b.km.warnungen === 1 ? '' : 'e') + ' kritisch', 'critical') + '</h3>' + b.km.fahrzeuge.map(k => '<div class="small">' + esc(k.kennzeichen) + ' – ' + fmtKm(k.gefahren) + ' / ' + fmtKm(k.limit) + ' km · ' + esc(k.statusText) + (k.prognose != null ? ' (' + T('Prognose', 'forecast') + ' ' + fmtKm(k.prognose) + ')' : '') + '</div>').join('') + (b.km.tausch ? '<div class="small mt"><b>🔁 ' + b.km.tausch + ' ' + T('Tauschvorschlag' + (b.km.tausch === 1 ? '' : 'e') + ' ansehen ›', 'swap suggestion(s) ›') + '</b></div>' : '') + '</button>';
    if (outbox.length) html += '<div class="card gold"><h2>' + A.t('pending') + ' (' + outbox.length + ')</h2><p class="small muted">' + A.t('pendingHint') + '</p></div>';
    if (draft) html += '<div class="card gold"><h2>' + A.t('draftFound') + '</h2><p class="small muted">' + esc(draft.kennzeichenAnzeige || '–') + ' · ' + A.t('step') + ' ' + (draft.step || 1) + '/8</p><div class="btn-row"><button class="btn" id="cont">' + A.t('continueDraft') + '</button><button class="btn ghost" id="disc">' + A.t('discardDraft') + '</button></div></div>';
    (b.offeneBestaetigungen || []).forEach(p => { html += '<div class="card danger"><h2>' + A.t('toConfirm') + '</h2><button class="list-item" data-nav="protocol/' + p.id + '"><div class="main"><b>' + esc(p.kennzeichen) + ' · ' + esc(p.nr) + '</b><span>' + fmtDT(p.datum) + ' · ' + esc(p.von) + ' → ' + esc(p.an) + '</span></div><div class="chev">›</div></button></div>'; });
    html += '<button class="btn big" id="new">＋ ' + A.t('newProtocol') + '</button><div class="gold-line"></div>';
    const tile = (nav, ico, lbl, cnt) => '<button class="tile" data-nav="' + nav + '"><span class="ico">' + ico + '</span>' + lbl + (cnt ? '<span class="cnt badge red">' + cnt + '</span>' : '') + '</button>';
    const soon = (ico, lbl) => '<button class="tile soon" type="button" aria-disabled="true"><span class="ico">' + ico + '</span>' + lbl + '<span class="soon-badge">' + T('Kommt bald', 'Coming soon') + '</span></button>';
    if ((b.nachnahmeOffen || []).length) html += '<button class="card danger" data-nav="tourstart" style="display:block;width:100%;text-align:left"><h3>💶 ' + T('Nachnahme noch abgeben', 'Cash still to hand over') + '</h3><p class="small" style="margin:0">' + b.nachnahmeOffen.map(n => fmtD(n.datum) + ': ' + fmtEur(n.betrag)).join(' · ') + ' – ' + T('vor dem nächsten Tourstart übergeben', 'hand over before the next tour start') + '</p></button>';
    const nnTile = b.nachnahmeEmpfaenger ? tile('nachnahmen', '💶', T('Nachnahmen', 'Cash on delivery')) : '';
    if (locked) html += '<div class="menu">' + nnTile + tile('urlaub', '🏖️', T('Urlaub', 'Vacation')) + tile('protocols', '📋', A.t('myProtocols')) + tile('vehicles', '🚐', A.t('vehicles')) + soon('📅', T('Mein Dienstplan', 'My schedule')) + (canUps() ? soon('🧾', T('Meine Touren', 'My tours')) : '');
    else html += '<div class="menu">' + nnTile + tile('heute', '📅', T('Mein Dienstplan', 'My schedule')) + tile('urlaub', '🏖️', T('Urlaub', 'Vacation')) + tile('protocols', '📋', A.t('myProtocols')) + tile('vehicles', '🚐', A.t('vehicles')) + (canUps() ? tile('tourberichte', '🧾', T('Meine Touren', 'My tours')) : '');
    if (mgmt()) {
      const offen = b.offeneAntraege || 0;
      html += tile('kilometer', '🛣️', T('Kilometer', 'Mileage'), b.km && b.km.warnungen) + tile('tagesbericht', '📊', T('Tagesbericht', 'Daily report')) + tile('dienstplan', '🗓️', T('Dienstplan (alle)', 'Schedule (all)')) + tile('antraege', '✅', T('Urlaubsanträge', 'Requests'), offen) + tile('abwesenheit', '📝', T('Abwesenheit eintragen', 'Enter absence')) + tile('uebersicht', '👤', T('Mitarbeiter-Übersicht', 'Staff overview')) + tile('dashboard', '⚠️', A.t('dashboard') + ' / ' + A.t('damages'));
    }
    if (A.isAdmin()) html += tile('users', '👥', A.t('users')) + tile('einstellungen', '🛠️', T('Verwaltung', 'Admin'));
    html += '</div></main>';
    render(html);
    $$('.tile.soon').forEach(el => el.onclick = () => toast(T('Dieser Bereich kommt bald.', 'This area is coming soon.')));
    $('#new').onclick = async () => { if (draft) { if (!(await confirmDlg(A.t('reallyDiscard')))) return; await A.discardDraft(draft.clientId); } A.startDraft(); };
    if (draft) { $('#cont').onclick = () => { state.draft = draft; go('new'); }; $('#disc').onclick = async () => { if (await confirmDlg(A.t('reallyDiscard'))) { await A.discardDraft(draft.clientId); home(); } }; }
  }

  /* ---------- Mein Dienstplan (Woche) ---------- */
  async function viewHeute(arg) {
    const wd = new Date().getDay(); // Sa/So -> nächste Woche zeigen
    let start = arg || addDays(today(), wd === 6 ? 2 : wd === 0 ? 1 : -(wd - 1));
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
    render(html + '</main>');
    $('#prev').onclick = () => go('heute/' + addDays(start, -7)); $('#next').onclick = () => go('heute/' + addDays(start, 7));
  }
  function isoWeek(s) { const d = new Date(s + 'T12:00:00'); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); return Math.ceil((((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7); }

  /* ---------- Tour starten ---------- */
  const fmtKm = n => (n == null || n === '' || isNaN(Number(n))) ? '–' : Math.round(Number(n)).toLocaleString('de-DE');
  const KMCLS = { ueber: 'red', warnung: 'red', prognose: 'warn', ok: 'green', keine_daten: 'grey' };
  const kmBar = k => { const pct = Math.min(100, Math.round((k.gefahren || 0) / (k.limit || 1) * 100)); const soll = k.sollHeute ? Math.min(100, Math.round(k.sollHeute / k.limit * 100)) : null; return '<div class="kmbar ' + (KMCLS[k.status] || '') + '"><span style="width:' + pct + '%"></span>' + (soll != null ? '<i style="left:' + soll + '%" title="' + T('Soll heute', 'Target today') + '"></i>' : '') + '</div>'; };
  const kmHinweisMa = k => {
    if (!k || !k.status) return '';
    const basis = esc(k.kennzeichen) + ': ' + T('diesen Monat', 'this month') + ' <b>' + fmtKm(k.gefahren) + '</b> ' + T('von', 'of') + ' ' + fmtKm(k.limit) + ' ' + T('freien km', 'free km') + ' (' + (k.prozent || 0) + ' %)';
    if (k.status === 'ueber') return '<div class="card danger"><h3>⚠️ ' + T('Kilometer-Grenze überschritten', 'Mileage limit exceeded') + '</h3><p>' + basis + '.</p><p class="small">' + T('Die Disposition ist informiert und meldet sich wegen eines Fahrzeugtauschs.', 'Dispatch has been informed and will arrange a vehicle swap.') + '</p></div>';
    if (k.status === 'warnung') return '<div class="card danger"><h3>⚠️ ' + T('Kilometer-Grenze fast erreicht', 'Mileage limit almost reached') + '</h3><p>' + basis + '.</p><p class="small">' + T('Bitte keine unnötigen Fahrten. Die Disposition ist informiert.', 'Please avoid unnecessary trips. Dispatch has been informed.') + '</p></div>';
    if (k.status === 'prognose') return '<div class="card gold"><h3>🛣️ ' + T('Achtung Kilometer', 'Mileage notice') + '</h3><p>' + basis + '.</p><p class="small">' + T('Bei gleicher Fahrleistung werden es bis Monatsende ca. ', 'At this rate it will be about ') + fmtKm(k.prognose) + ' km. ' + T('Die Disposition prüft einen Fahrzeugtausch.', 'Dispatch will check a vehicle swap.') + '</p></div>';
    return '';
  };

  /* ---------- Gemeinsame Bausteine: Ja/Nein mit Begründung, Tacho-Foto, Nachnahme-Übergabe ---------- */
  const fmtEur = n => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const ynq = (f, key, lbl, opt) => {
    opt = opt || {}; const v = f[key];
    const cls = x => v === x ? ' on ' + ((x === 'ja') !== !!opt.redJa ? 'green' : 'red') : '';
    const why = v === 'ja' ? (opt.whyJa || T('Warum? (optional)', 'Why? (optional)')) : T('Warum nicht? (optional)', 'Why not? (optional)');
    return '<div class="ynq" style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row" style="align-items:center;gap:8px"><div class="grow">' + lbl + '</div><div class="chips two" style="width:170px;gap:6px">' +
      '<button type="button" class="chip' + cls('ja') + '" data-ynk="' + key + '" data-v="ja" style="min-height:40px">' + A.t('yes') + '</button><button type="button" class="chip' + cls('nein') + '" data-ynk="' + key + '" data-v="nein" style="min-height:40px">' + A.t('no') + '</button></div></div>' +
      (opt.hint ? '<p class="small muted" style="margin:6px 0 0">' + opt.hint + '</p>' : '') +
      (v ? '<input type="text" style="margin-top:8px" data-grund="' + key + '" value="' + esc(f[key + 'Grund'] || '') + '" placeholder="' + esc(why) + '">' : '') + '</div>';
  };
  const bindYn = (f, redraw) => {
    $$('[data-ynk]').forEach(c => c.onclick = () => { f[c.getAttribute('data-ynk')] = c.getAttribute('data-v'); redraw(); });
    $$('[data-grund]').forEach(i => i.oninput = () => { f[i.getAttribute('data-grund') + 'Grund'] = i.value; });
  };
  const kmFoto = (s, id) => '<div class="row" style="gap:12px;align-items:stretch"><div class="photo-tile' + (s.fotoId ? ' done' : ' req') + '" id="' + id + '-foto" style="width:120px;min-height:110px;flex:none">' +
    (s.fotoUrl ? '<img src="' + s.fotoUrl + '"><span class="redo">' + A.t('retake') + '</span>' : '<span class="ico">📷</span>') + '<div class="cap">' + T('Tacho-Foto', 'Odometer photo') + '</div></div>' +
    '<div class="grow small" style="align-self:center">' + (s.ocrLaeuft ? '⏳ ' + T('Kilometerstand wird vom Foto gelesen …', 'Reading the odometer from the photo …') : s.ocr ? '📷 ' + T('Vom Foto erkannt', 'Read from photo') + ': <b>' + fmtKm(s.ocr) + ' km</b>' : s.fotoId ? T('Zahl nicht erkannt – bitte genau abtippen.', 'Not detected – please type it exactly.') : '<b>' + T('Pflicht:', 'Required:') + '</b> ' + T('Tacho fotografieren – die Zahl wird dann automatisch gelesen.', 'Photograph the odometer – the number is read automatically.')) + '</div></div>' +
    '<input type="number" inputmode="numeric" class="huge mt" id="' + id + '-km" value="' + esc(s.km || '') + '" placeholder="' + T('Kilometerstand (exakt vom Tacho)', 'Odometer (exact)') + '">';
  const bindKmFoto = (s, id, fzId, redraw) => {
    const inp = $('#' + id + '-km'); if (inp) inp.oninput = () => { s.km = inp.value.replace(/[^\d]/g, ''); s.manuell = true; };
    const tile = $('#' + id + '-foto'); if (!tile) return;
    tile.onclick = async () => {
      const r = await photoUpload('tacho'); if (!r) return;
      s.fotoId = r.photoId; s.fotoUrl = r.url; s.ocr = null; s.ocrLaeuft = true; redraw();
      try { const o = await API.call('kmOcr', { fotoId: r.photoId, fahrzeugId: fzId() || '' }, { timeout: 60000 }); s.ocr = o.km || null; if (o.km && (!s.km || !s.manuell)) s.km = String(o.km); } catch (e) { }
      s.ocrLaeuft = false; redraw();
    };
  };
  const kmFotoPruefen = async s => {
    if (!s.fotoId) { toast(T('Bitte den Tacho fotografieren (Pflicht)', 'Please photograph the odometer (required)'), true); return false; }
    if (s.ocrLaeuft) { toast(T('Einen Moment – das Foto wird noch gelesen', 'One moment – still reading the photo'), true); return false; }
    if (!s.km || Number(s.km) <= 0) { toast(T('Bitte den Kilometerstand eintragen', 'Enter the odometer reading'), true); return false; }
    if (s.ocr && Math.abs(Number(s.ocr) - Number(s.km)) > 2) return confirmDlg(T('Auf dem Foto steht ', 'The photo shows ') + fmtKm(s.ocr) + ' km, ' + T('eingetragen ist ', 'you entered ') + fmtKm(s.km) + ' km.\n\n' + T('Ist deine Zahl wirklich exakt richtig? Abweichungen werden gemeldet.', 'Is your number really exact? Differences are reported.'));
    return true;
  };
  function nachnahmeSheet(betrag, datum, onConfirm) {
    const liste = (state.boot && state.boot.nachnahmeEmpfaengerListe) || [];
    let empf = '';
    const s = sheet('<h3>💶 ' + T('Nachnahme übergeben', 'Hand over cash on delivery') + '</h3><p style="font-size:24px;margin:2px 0 4px"><b>' + fmtEur(betrag) + '</b></p>' + (datum ? '<p class="small muted" style="margin:0 0 8px">' + T('vom', 'from') + ' ' + fmtD(datum) + '</p>' : '') +
      '<label class="lbl">' + T('Wer nimmt das Geld entgegen?', 'Who receives the money?') + '</label><div class="chips" id="nn-emp">' + liste.map(n => '<button type="button" class="chip" data-emp="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>' +
      '<label class="lbl mt">' + T('Unterschrift Fahrer', 'Driver signature') + '</label><div class="sig-box" id="nn-sf"></div><button type="button" class="btn ghost" id="nn-cf" style="min-height:36px">' + T('Löschen', 'Clear') + '</button>' +
      '<label class="lbl mt">' + T('Unterschrift Empfänger', 'Receiver signature') + '</label><div class="sig-box" id="nn-se"></div><button type="button" class="btn ghost" id="nn-ce" style="min-height:36px">' + T('Löschen', 'Clear') + '</button>' +
      '<button class="btn mt" id="nn-ok">✓ ' + T('Übergabe bestätigen', 'Confirm handover') + '</button>');
    const pf = SIG($('#nn-sf', s.el), {}), pe = SIG($('#nn-se', s.el), {});
    $('#nn-cf', s.el).onclick = () => pf.clear(); $('#nn-ce', s.el).onclick = () => pe.clear();
    $$('[data-emp]', s.el).forEach(c => c.onclick = () => { empf = c.getAttribute('data-emp'); $$('[data-emp]', s.el).forEach(x => x.classList.toggle('on', x === c)); });
    $('#nn-ok', s.el).onclick = async () => {
      if (!empf) return toast(T('Bitte auswählen, wer das Geld entgegennimmt', 'Choose the receiver'), true);
      if (pf.isEmpty() || pe.isEmpty()) return toast(T('Bitte beide unterschreiben lassen', 'Both must sign'), true);
      const ok = await onConfirm({ empfaenger: empf, sigFahrer: pf.dataUrl(), sigEmpfaenger: pe.dataUrl() });
      if (ok !== false) s.close();
    };
  }

  /* ---------- Tour starten: offene Nachnahme → Fahrzeug → Tacho-Foto + km → Tour → Sicherheits-Check ---------- */
  async function viewTourStart() {
    render(topbar(T('Tour starten', 'Start tour'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let b = await boot(); const h = (b.gesperrt ? null : await API.call('heute').catch(() => b.heute)) || {};
    const plan = (h.plan || []).find(p => p.status === 'tour') || {}; const tb = h.tourbericht || b.tourHeute || null;
    const fzList = (b.fahrzeuge || []).filter(v => !v.status || v.status === 'aktiv');
    const vorFz = (tb && (tb.fahrzeugId || tb.kennzeichenIst || tb.kennzeichen)) || plan.kennzeichen || '';
    const findFz = x => fzList.find(v => v.id === x || norm(v.kennzeichen) === norm(x));
    const nach = state.tourNach || null; state.tourNach = null;
    const ob = await DB.all('outbox').catch(() => []);
    const ausstehend = ob.filter(i => i.draft && i.draft.anId === u().id).map(i => i.draft.fahrzeugId);
    if (nach && nach.ausstehend) ausstehend.push(nach.fahrzeugId);
    const sel = { fz: nach ? (findFz(nach.fahrzeugId) || null) : (vorFz ? (findFz(vorFz) || null) : null), tour: (tb && (tb.tourIst || tb.tour)) || plan.tour || '', filter: '' };
    const km = { km: (nach && nach.km) || '', fotoId: '', fotoUrl: '', ocr: null };
    if (nach && nach.fotoLocalId) { try { const p = await DB.get('photos', nach.fotoLocalId); if (p && p.photoId) { km.fotoId = p.photoId; km.fotoUrl = p.thumbBlob ? URL.createObjectURL(p.thumbBlob) : ''; } } catch (e) { } }
    const chk = {};
    let info = null, infoFor = '';
    const tours = b.touren || [];
    const protokollFehlt = v => !!v && v.fahrerId !== u().id && ausstehend.indexOf(v.id) < 0 && !(tb && tb.fahrzeugId === v.id);
    const loadInfo = async () => {
      if (!sel.fz || infoFor === sel.fz.id) return; infoFor = sel.fz.id; info = null; drawInfo();
      try { info = await API.call('kmFahrzeug', { fahrzeugId: sel.fz.id }); } catch (e) { info = null; }
      if (sel.fz && infoFor === sel.fz.id) drawInfo();
    };
    const drawInfo = () => {
      const el = $('#kminfo'); if (!el) return;
      if (!sel.fz) { el.innerHTML = ''; return; }
      const letzter = (info && info.letzterKm) || sel.fz.km;
      el.innerHTML = (letzter ? '<p class="small muted" style="margin:6px 0 0">' + T('Letzter Stand', 'Last reading') + ': <b>' + fmtKm(letzter) + ' km</b>' + (info && info.letzterAm ? ' · ' + fmtD(info.letzterAm) + (info.letzteQuelle ? ' (' + esc(info.letzteQuelle) + ')' : '') : '') + '</p>' : '') +
        (info && info.gefahren != null && info.status !== 'keine_daten' ? '<div class="mt">' + kmBar(info) + '<p class="small muted" style="margin:4px 0 0">' + T('Diesen Monat', 'This month') + ': ' + fmtKm(info.gefahren) + ' / ' + fmtKm(info.limit) + ' km</p></div>' : '');
    };
    const draw = () => {
      const y = window.scrollY;
      const offen = (b.nachnahmeOffen || []);
      let html = topbar(T('Tour starten', 'Start tour'), { back: 'home' }) + '<main>';
      if (offen.length) html += card('💶 ' + T('Zuerst: Nachnahme abgeben', 'First: hand over cash'), offen.map(n => '<div class="row" style="align-items:center;gap:8px;margin-bottom:8px"><div class="grow">' + fmtD(n.datum) + (n.tour ? ' · ' + esc(n.tour) : '') + '<br><b style="font-size:20px">' + fmtEur(n.betrag) + '</b></div><button class="btn" style="width:auto;padding:0 16px" data-nn="' + esc(n.id) + '">' + T('Jetzt abgeben', 'Hand over now') + '</button></div>').join('') + '<p class="small muted" style="margin:0">' + T('Die Tour kann erst gestartet werden, wenn die Nachnahme übergeben und von beiden unterschrieben ist.', 'You can start once the cash is handed over and signed by both.') + '</p>', 'danger');
      const f = norm(sel.filter);
      const chips = fzList.filter(v => !f || norm(v.kennzeichen).indexOf(f) >= 0).map(v => '<button class="chip ' + (sel.fz && sel.fz.id === v.id ? 'on' : '') + '" data-fz="' + esc(v.id) + '">' + esc(v.kennzeichen) + '</button>').join('');
      html += card('1 · ' + T('Fahrzeug wählen', 'Choose vehicle'), (plan.kennzeichen ? '<p class="small muted">' + T('Laut Dienstplan', 'Per schedule') + ': <b>' + esc(plan.kennzeichen) + '</b></p>' : '') +
        (fzList.length > 12 ? '<input type="search" id="fzf" value="' + esc(sel.filter) + '" placeholder="' + T('Kennzeichen suchen …', 'Search plate …') + '" autocapitalize="characters">' : '') +
        '<div class="chips mt" style="grid-template-columns:repeat(auto-fill,minmax(104px,1fr))">' + (chips || '<p class="small muted">' + T('Kein Fahrzeug gefunden.', 'No vehicle found.') + '</p>') + '</div>', sel.fz ? '' : 'gold');
      const fehlt = protokollFehlt(sel.fz);
      if (fehlt) html += card('2 · ' + T('Übergabeprotokoll (Pflicht)', 'Handover protocol (required)'), '<p style="margin:0 0 6px">🔁 <b>' + esc(sel.fz.kennzeichen) + '</b> ' + T('ist dir noch nicht zugeordnet', 'is not assigned to you yet') + (sel.fz.fahrer ? ' (' + T('zuletzt', 'last') + ': ' + esc(sel.fz.fahrer) + ')' : '') + '.</p><p class="small muted" style="margin:0 0 10px">' + T('Bevor du losfährst, mach bitte das Übergabeprotokoll – danach geht es automatisch hier weiter.', 'Before you drive off, please complete the handover protocol – you will be brought back here afterwards.') + '</p><button class="btn" id="doprot">📋 ' + T('Übergabeprotokoll jetzt machen', 'Do handover protocol now') + '</button>', 'danger');
      else html += card('2 · ' + T('Kilometerstand (Pflicht)', 'Odometer (required)'), sel.fz ? kmFoto(km, 'ks') + '<div id="kminfo"></div>'
        : '<p class="small muted" style="margin:0">' + T('Bitte zuerst oben das Fahrzeug auswählen – dann wird der Kilometerstand diesem Fahrzeug zugeordnet.', 'Choose the vehicle first – the reading is then assigned to it.') + '</p>', sel.fz && !km.fotoId ? 'gold' : '');
      html += card('3 · ' + T('Tour', 'Tour'), (plan.tour ? '<p class="small muted">' + T('Laut Dienstplan', 'Per schedule') + ': <b>' + esc(plan.tour) + '</b> ' + esc(plan.area || '') + '</p>' : '') + '<div class="chips" style="grid-template-columns:repeat(auto-fill,minmax(64px,1fr))">' + tours.map(t => '<button class="chip ' + (sel.tour === t.code ? 'on' : '') + '" data-tour="' + esc(t.code) + '">' + esc(t.code) + '</button>').join('') + '</div>');
      html += card('4 · ' + T('Sicherheits-Check (Pflicht)', 'Safety check (required)'), ynq(chk, 'warnweste', T('Warnweste an?', 'Wearing hi-vis vest?')) + ynq(chk, 'schuhe', T('Arbeitsschuhe an?', 'Wearing safety shoes?')) + ynq(chk, 'uniform', T('Uniform an?', 'Wearing uniform?')));
      html += '<button class="btn' + (fehlt || offen.length ? ' disabled' : '') + '" id="ok">▶ ' + T('Tour starten', 'Start tour') + '</button></main>';
      render(html); window.scrollTo(0, y);
      $$('[data-fz]').forEach(c => c.onclick = () => { const v = fzList.find(x => x.id === c.getAttribute('data-fz')); if (!sel.fz || sel.fz.id !== v.id) { sel.fz = v; Object.assign(km, { km: '', fotoId: '', fotoUrl: '', ocr: null, manuell: false }); } draw(); });
      $$('[data-tour]').forEach(c => c.onclick = () => { sel.tour = c.getAttribute('data-tour'); draw(); });
      $$('[data-nn]').forEach(c => c.onclick = () => { const n = offen.find(x => x.id === c.getAttribute('data-nn')); nachnahmeSheet(n.betrag, n.datum, async d => {
        overlay('…'); try { await API.call('nachnahmeAbgeben', Object.assign({ id: n.id }, d)); hideOverlay(); toast('✓ ' + T('Nachnahme übergeben', 'Cash handed over')); b = await boot(true); draw(); return true; } catch (e) { hideOverlay(); toast(errMsg(e), true); return false; }
      }); });
      if ($('#fzf')) $('#fzf').oninput = e => { sel.filter = e.target.value; const pos = e.target.selectionStart; draw(); const n = $('#fzf'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } };
      if ($('#doprot')) $('#doprot').onclick = () => A.startDraft({ fahrzeugId: sel.fz.id, zurTour: true });
      bindKmFoto(km, 'ks', () => sel.fz && sel.fz.id, draw);
      bindYn(chk, draw);
      drawInfo(); if (!fehlt) loadInfo();
      $('#ok').onclick = () => send(false);
    };
    const send = async bestaetigt => {
      if ((b.nachnahmeOffen || []).length) return toast(T('Bitte zuerst die Nachnahme abgeben', 'Please hand over the cash first'), true);
      if (!sel.fz) return toast(T('Bitte zuerst das Fahrzeug auswählen', 'Choose the vehicle first'), true);
      if (protokollFehlt(sel.fz)) return toast(T('Bitte zuerst das Übergabeprotokoll machen', 'Please complete the handover protocol first'), true);
      if (!bestaetigt && !(await kmFotoPruefen(km))) return;
      if (!sel.tour) return toast(T('Bitte Tour wählen', 'Choose a tour'), true);
      if (!chk.warnweste || !chk.schuhe || !chk.uniform) return toast(T('Bitte den Sicherheits-Check beantworten', 'Please answer the safety check'), true);
      overlay('…');
      try {
        const r = await API.call('startTour', { tour: sel.tour, kennzeichen: sel.fz.kennzeichen, fahrzeugId: sel.fz.id, kmStart: Number(km.km), kmFotoId: km.fotoId, kmBestaetigt: bestaetigt, protokollAusstehend: ausstehend.indexOf(sel.fz.id) >= 0,
          warnweste: chk.warnweste, warnwesteGrund: chk.warnwesteGrund || '', schuhe: chk.schuhe, schuheGrund: chk.schuheGrund || '', uniform: chk.uniform, uniformGrund: chk.uniformGrund || '' }, { timeout: 90000 });
        hideOverlay(); state.boot = null;
        const warn = kmHinweisMa(r && r.km);
        if (warn) { const s = sheet(warn + '<button class="btn" id="kmok">' + T('Verstanden', 'Got it') + '</button>'); $('#kmok', s.el).onclick = () => { s.close(); go('home'); }; }
        else { toast('✓ ' + T('Gute Fahrt!', 'Safe trip!')); go('home'); }
      } catch (e) {
        hideOverlay();
        if ((e.code === 'KM_LOW' || e.code === 'KM_HIGH') && !bestaetigt) {
          if (await confirmDlg(e.message + '\n\n' + T('Ist der Kilometerstand ' + fmtKm(km.km) + ' trotzdem richtig?', 'Is ' + fmtKm(km.km) + ' still correct?'))) return send(true);
          return;
        }
        if (e.code === 'PROTOKOLL_NOETIG') { sel.fz = Object.assign({}, sel.fz, { fahrerId: '' }); draw(); }
        if (e.code === 'NACHNAHME_OFFEN') { b = await boot(true); draw(); }
        toast(errMsg(e), true);
      }
    };
    draw();
  }

  /* ---------- Kilometer-Übersicht (Management) ---------- */
  async function viewKilometer(frisch) {
    render(topbar(T('Kilometer', 'Mileage'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let r;
    try { r = await API.call('kmUebersicht', { frisch: !!frisch }); } catch (e) { render(topbar(T('Kilometer', 'Mileage'), { back: 'home' }) + '<main>' + card('', '<p class="danger">' + esc(errMsg(e)) + '</p>') + '</main>'); return; }
    const [jj, mm] = r.monat.split('-');
    let html = topbar(T('Kilometer', 'Mileage'), { back: 'home', right: '<button class="icon-btn" id="kmre" aria-label="Aktualisieren">↻</button>' }) + '<main>';
    html += '<p class="small muted" style="margin:0 0 10px">' + MON[Number(mm) - 1] + ' ' + jj + ' · ' + T('frei', 'free') + ' ' + fmtKm(r.limitStandard) + ' km ' + T('pro Fahrzeug', 'per vehicle') + ' · ' + T('Warnung ab', 'warning from') + ' ' + r.warnProzent + ' %</p>';
    if (r.summe && r.summe.limit && r.summe.prognose > r.summe.limit) html += card('', '<p style="margin:0">⚠️ ' + T('Alle Fahrzeuge zusammen laufen auf ca. ', 'All vehicles together head for about ') + '<b>' + fmtKm(r.summe.prognose) + ' km</b> ' + T('zu – mehr als die ', '– more than the ') + fmtKm(r.summe.limit) + T(' freien km. Tauschen allein reicht nicht; ein weiteres Fahrzeug oder kürzere Wege prüfen.', ' free km. Swapping alone is not enough.') + '</p>', 'danger');
    if ((r.tausch || []).length) {
      html += '<h2 class="sec">🔁 ' + T('Tauschvorschläge', 'Swap suggestions') + '</h2>';
      r.tausch.forEach(t => {
        const wer = (kz, fa, to) => '<b>' + esc(kz) + '</b>' + (fa || to ? '<span class="small muted"> · ' + esc([to, fa].filter(Boolean).join(' · ')) + '</span>' : '');
        html += card('', '<div class="row wrap" style="gap:6px;align-items:center">' + wer(t.a, t.aFahrer, t.aTour) + '<span style="font-size:20px;color:var(--gold2)">⇄</span>' + wer(t.b, t.bFahrer, t.bTour) + '</div>' +
          '<p class="small" style="margin:8px 0 4px"><b>' + esc(t.dauer.charAt(0).toUpperCase() + t.dauer.slice(1)) + '</b></p>' +
          '<table class="kmt"><tr><td></td><td>' + T('ohne Tausch', 'no swap') + '</td><td>' + T('mit Tausch', 'with swap') + '</td></tr>' +
          '<tr><td>' + esc(t.a) + '</td><td class="' + (t.aVorher > t.aLimit ? 'danger' : '') + '">' + fmtKm(t.aVorher) + ' km</td><td class="' + (t.aNachher > t.aLimit ? 'danger' : 'ok') + '">' + fmtKm(t.aNachher) + ' km</td></tr>' +
          '<tr><td>' + esc(t.b) + '</td><td class="' + (t.bVorher > t.bLimit ? 'danger' : '') + '">' + fmtKm(t.bVorher) + ' km</td><td class="' + (t.bNachher > t.bLimit ? 'danger' : 'ok') + '">' + fmtKm(t.bNachher) + ' km</td></tr></table>', 'gold');
      });
    } else if (r.warnungen) html += card('', '<p class="small" style="margin:0">' + T('Kein sinnvoller Tausch möglich – bitte ein Ersatzfahrzeug prüfen.', 'No useful swap – consider a spare vehicle.') + '</p>');
    else html += card('', '<p class="small ok" style="margin:0">✓ ' + T('Alle Fahrzeuge liegen im Plan – kein Tausch nötig.', 'All vehicles on track – no swap needed.') + '</p>');
    html += '<h2 class="sec">🚐 ' + T('Fahrzeuge', 'Vehicles') + '</h2>';
    r.fahrzeuge.forEach(k => {
      const badge = '<span class="badge ' + (k.status === 'ok' ? 'green' : k.status === 'keine_daten' ? 'grey' : k.status === 'prognose' ? '' : 'red') + '">' + esc(k.statusText || '') + '</span>';
      html += '<div class="card kmcard"><div class="row" style="align-items:center"><b class="grow" style="font-size:18px">' + esc(k.kennzeichen) + '</b>' + badge + '</div>' +
        (k.status === 'keine_daten' ? '<p class="small muted" style="margin:6px 0 0">' + T('Diesen Monat noch kein Kilometerstand.', 'No reading this month yet.') + (k.letzterKm ? ' ' + T('Letzter Stand', 'Last') + ': ' + fmtKm(k.letzterKm) + ' km' + (k.letzterAm ? ' (' + fmtD(k.letzterAm) + ')' : '') : '') + '</p>' :
        '<div class="mt">' + kmBar(k) + '</div><div class="row wrap small" style="gap:4px 14px;margin-top:6px"><span><b>' + fmtKm(k.gefahren) + '</b> / ' + fmtKm(k.limit) + ' km (' + k.prozent + ' %)</span><span class="muted">Ø ' + fmtKm(k.proTag) + ' km/' + T('Tag', 'day') + '</span><span>' + T('Prognose', 'Forecast') + ' <b class="' + (k.prognose > k.limit ? 'danger' : '') + '">' + fmtKm(k.prognose) + ' km</b></span></div>' +
        '<p class="small muted" style="margin:4px 0 0">' + T('Stand', 'Reading') + ' ' + fmtKm(k.letzterKm) + ' km · ' + fmtD(k.letzterAm) + (k.letzteQuelle ? ' · ' + esc(k.letzteQuelle) : '') + (k.fahrer ? ' · ' + esc(k.fahrer) + (k.tour ? ' (' + esc(k.tour) + ')' : '') : '') + (k.geschaetzt ? ' · ' + T('Monatsanfang geschätzt', 'month start estimated') : '') + '</p>') + '</div>';
    });
    html += '<p class="small muted">' + T('Die Werte stammen aus den Kilometerständen bei Tourstart, Tourende und Übergabeprotokoll. Prognose = bisher gefahren + Ø der letzten 14 Tage bis Monatsende. Grenze und Warnschwelle änderst du unter Verwaltung → Einstellungen.', 'Based on odometer readings at tour start/end and handovers.') + '</p></main>';
    render(html);
    $('#kmre').onclick = () => viewKilometer(true);
  }

  const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');

  /* ---------- Tour beenden ---------- */
  /* ---------- Tour beenden: km mit Foto, Stopps, Nachnahme, Fahrtenbuch, Schäden ---------- */
  async function viewTourEnd() {
    render(topbar(T('Tour beenden', 'End tour'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    const b = await boot(); const h = (b.gesperrt ? null : await API.call('heute').catch(() => b.heute)) || {};
    const plan = (h.plan || []).find(p => p.status === 'tour') || {}; const tb = h.tourbericht || b.tourHeute || {};
    const fz = (b.fahrzeuge || []).find(v => v.id === tb.fahrzeugId) || null;
    const f = { tour: tb.tourIst || tb.tour || plan.tour || '', kz: tb.kennzeichenIst || tb.kennzeichen || plan.kennzeichen || '', stopps: '', nachnahme: '', modus: 'jetzt', bemerkung: '' };
    const km = { km: '', fotoId: '', fotoUrl: '', ocr: null };
    const draw = () => {
      const y = window.scrollY;
      let html = topbar(T('Tour beenden', 'End tour'), { back: 'home' }) + '<main>';
      html += card(T('Tour & Fahrzeug', 'Tour & vehicle'), fz ? '<p style="margin:0;font-size:18px"><b>' + esc(f.tour || '–') + '</b> · 🚐 ' + esc(fz.kennzeichen) + (tb.kmStart ? '<span class="small muted"> · Start ' + fmtKm(tb.kmStart) + ' km</span>' : '') + '</p>'
        : '<div class="row"><div class="grow"><label class="lbl">Tour</label><select data-f="tour">' + (b.touren || []).map(t => '<option value="' + esc(t.code) + '" ' + (f.tour === t.code ? 'selected' : '') + '>' + esc(t.code) + '</option>').join('') + '</select></div><div class="grow"><label class="lbl">' + A.t('plate') + '</label><input type="text" data-f="kz" value="' + esc(f.kz) + '" autocapitalize="characters"></div></div>');
      html += card(T('Kilometerstand Ende (Pflicht)', 'Odometer at end (required)'), kmFoto(km, 'ke'), !km.fotoId ? 'gold' : '');
      html += card(T('Stopps & Nachnahme (Pflicht)', 'Stops & cash (required)'), '<div class="row"><div class="grow"><label class="lbl">' + T('Anzahl Stopps', 'Number of stops') + '</label><input type="number" inputmode="numeric" data-f="stopps" value="' + esc(f.stopps) + '"></div><div class="grow"><label class="lbl">' + T('Nachnahme (€)', 'Cash on delivery (€)') + '</label><input type="text" inputmode="decimal" data-f="nachnahme" value="' + esc(f.nachnahme) + '" placeholder="0,00"></div></div>' +
        '<button type="button" class="chip mt' + (f.nachnahme === '0' ? ' on' : '') + '" id="nn0" style="width:100%">' + T('Keine Nachnahme heute (0 €)', 'No cash today (0 €)') + '</button>' +
        (Number(String(f.nachnahme).replace(',', '.')) > 0 ? '<label class="lbl mt">' + T('Abgabe', 'Handover') + '</label><div class="chips two"><button type="button" class="chip' + (f.modus === 'jetzt' ? ' on' : '') + '" data-modus="jetzt">' + T('Jetzt übergeben', 'Hand over now') + '</button><button type="button" class="chip' + (f.modus === 'morgen' ? ' on' : '') + '" data-modus="morgen">' + T('Morgen früh abgeben', 'Tomorrow morning') + '</button></div><p class="small muted" style="margin:6px 0 0">' + (f.modus === 'jetzt' ? T('Beim Absenden wählst du, wer das Geld nimmt – dann unterschreiben beide.', 'When submitting you choose the receiver – then both sign.') : T('Beim nächsten Tourstart wird die Abgabe mit beiden Unterschriften abgefragt.', 'At the next tour start the handover is requested with both signatures.')) + '</p>' : ''));
      html += card(T('Abschluss (Pflicht)', 'Wrap-up (required)'), ynq(f, 'fahrtenbuch', T('Fahrtenbuch ausgefüllt?', 'Logbook filled in?')) +
        ynq(f, 'neueSchaeden', T('Neue Schäden?', 'New damage?'), { redJa: true, whyJa: T('Was ist passiert? (optional)', 'What happened? (optional)'), hint: '⚠️ ' + T('Freiwillig gemeldete Schäden: nur die Selbstbeteiligung der Versicherung. Schäden, die erst durch unsere Auswertung festgestellt werden: 100 € Strafaufschlag und Abmahnung.', 'Damage reported voluntarily: only the insurance deductible. Damage found later by our checks: €100 penalty and a formal warning.') }));
      html += card('', '<label class="lbl">' + A.t('remark') + ' (optional)</label><textarea data-f="bemerkung">' + esc(f.bemerkung) + '</textarea>');
      html += '<button class="btn" id="ok">■ ' + T('Tour beenden & melden', 'End tour & report') + '</button></main>';
      render(html); window.scrollTo(0, y);
      $$('[data-f]').forEach(el => el.oninput = () => { f[el.getAttribute('data-f')] = el.value; if (el.getAttribute('data-f') === 'nachnahme') { const was = Number(String(el.dataset.prev || '').replace(',', '.')) > 0, ist = Number(String(el.value).replace(',', '.')) > 0; el.dataset.prev = el.value; if (was !== ist) { draw(); const n = $('[data-f="nachnahme"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); } } });
      const nnIn = $('[data-f="nachnahme"]'); if (nnIn) nnIn.dataset.prev = f.nachnahme;
      $('#nn0').onclick = () => { f.nachnahme = '0'; draw(); };
      $$('[data-modus]').forEach(c => c.onclick = () => { f.modus = c.getAttribute('data-modus'); draw(); });
      bindKmFoto(km, 'ke', () => fz ? fz.id : ((b.fahrzeuge || []).find(v => norm(v.kennzeichen) === norm(f.kz)) || {}).id, draw);
      bindYn(f, draw);
      $('#ok').onclick = submit;
    };
    const submit = async () => {
      if (!(await kmFotoPruefen(km))) return;
      if (f.stopps === '' || isNaN(Number(f.stopps))) return toast(T('Bitte die Anzahl der Stopps eintragen', 'Enter the number of stops'), true);
      const betrag = Number(String(f.nachnahme).replace(',', '.'));
      if (f.nachnahme === '' || isNaN(betrag) || betrag < 0) return toast(T('Bitte den Nachnahmebetrag eintragen (0, wenn keine)', 'Enter the cash amount (0 if none)'), true);
      if (!f.fahrtenbuch || !f.neueSchaeden) return toast(T('Bitte alle Ja/Nein-Fragen beantworten', 'Please answer all yes/no questions'), true);
      const v = fz || (b.fahrzeuge || []).find(x => norm(x.kennzeichen) === norm(f.kz));
      const payload = { tour: f.tour, kennzeichen: f.kz, fahrzeugId: v ? v.id : '', kmEnde: Number(km.km), kmFotoId: km.fotoId, stopps: Number(f.stopps), nachnahme: betrag, nachnahmeModus: betrag > 0 ? f.modus : '',
        fahrtenbuch: f.fahrtenbuch, fahrtenbuchGrund: f.fahrtenbuchGrund || '', neueSchaeden: f.neueSchaeden, schadenGrund: f.neueSchaedenGrund || '', bemerkung: f.bemerkung };
      const senden = async extra => {
        overlay('…');
        try {
          const r = await API.call('endTour', Object.assign(payload, extra || {}), { timeout: 90000 });
          hideOverlay(); state.boot = null;
          render(topbar(T('Gemeldet', 'Reported')) + '<main><div class="card ok center"><div style="font-size:52px">✓</div><h1>' + T('Tour gemeldet', 'Tour reported') + '</h1><p>' + esc(r.tourIst) + ' · ' + esc(r.kennzeichenIst) + ' · ' + fmtKm(r.kmEnde) + ' km</p>' +
            (r.nachnahme ? '<p>💶 ' + fmtEur(r.nachnahme.betrag) + ' – ' + (r.nachnahme.status === 'offen' ? T('Abgabe morgen früh', 'hand over tomorrow') : T('übergeben an', 'handed to') + ' ' + esc(r.nachnahme.empfaenger)) + '</p>' : '') +
            (r.kmAuffaellig ? '<p class="small danger">' + esc(r.kmAuffaellig) + '</p>' : '') + '</div>' +
            (f.neueSchaeden === 'ja' && v ? '<button class="btn" id="np">📋 ' + T('Schaden jetzt mit Protokoll dokumentieren', 'Document damage with a protocol now') + '</button>' : '') + '<button class="btn ghost mt" data-nav="home">' + A.t('home') + '</button></main>');
          if ($('#np')) $('#np').onclick = () => A.startDraft({ fahrzeugId: v.id });
          return true;
        } catch (e) { hideOverlay(); toast(errMsg(e), true); return false; }
      };
      if (betrag > 0 && f.modus === 'jetzt') nachnahmeSheet(betrag, '', d => senden(d));
      else senden();
    };
    draw();
  }

  /* ---------- Nachnahme-Übersicht (für alle, die Nachnahmen entgegennehmen) ---------- */
  async function viewNachnahmen(arg) {
    const heute = today(); const mStart = heute.slice(0, 8) + '01';
    const vorMonat = (() => { const d = new Date(mStart + 'T12:00:00'); d.setMonth(d.getMonth() - 1); return ymd(d); })();
    const zeitraum = arg === 'vormonat' ? { von: vorMonat, bis: addDays(mStart, -1), lbl: T('Letzter Monat', 'Last month') } : { von: mStart, bis: heute, lbl: T('Dieser Monat', 'This month') };
    render(topbar(T('Nachnahmen', 'Cash on delivery'), { back: 'home' }) + '<main><div class="spinner"></div></main>');
    let r; try { r = await API.call('nachnahmen', { von: zeitraum.von, bis: zeitraum.bis }); } catch (e) { render(topbar(T('Nachnahmen', 'Cash on delivery'), { back: 'home' }) + '<main>' + card('', '<p class="danger">' + esc(errMsg(e)) + '</p>') + '</main>'); return; }
    let html = topbar(T('Nachnahmen', 'Cash on delivery'), { back: 'home' }) + '<main>';
    html += '<div class="chips two"><button class="chip' + (arg !== 'vormonat' ? ' on' : '') + '" data-nav="nachnahmen">' + T('Dieser Monat', 'This month') + '</button><button class="chip' + (arg === 'vormonat' ? ' on' : '') + '" data-nav="nachnahmen/vormonat">' + T('Letzter Monat', 'Last month') + '</button></div>';
    html += card('', '<div class="row wrap" style="gap:6px 18px"><span>' + T('Gesamt', 'Total') + ' <b style="font-size:20px">' + fmtEur(r.summe.gesamt) + '</b></span><span class="' + (r.summe.offen ? 'danger' : 'muted') + '">' + T('noch offen', 'still open') + ' <b>' + fmtEur(r.summe.offen) + '</b></span></div>' +
      (Object.keys(r.summe.proEmpfaenger).length ? '<p class="small muted" style="margin:8px 0 0">' + Object.keys(r.summe.proEmpfaenger).map(k => esc(k) + ': <b>' + fmtEur(r.summe.proEmpfaenger[k]) + '</b>').join(' · ') + '</p>' : ''), 'gold');
    if (!r.liste.length) html += card('', '<p class="muted" style="margin:0">' + T('Keine Nachnahmen in diesem Zeitraum.', 'No cash on delivery in this period.') + '</p>');
    let tag = '';
    r.liste.forEach(n => {
      if (n.datum !== tag) { tag = n.datum; html += '<h2 class="sec">' + fmtShort(n.datum) + '</h2>'; }
      html += '<div class="card" style="padding:10px 14px"><div class="row" style="align-items:center"><div class="grow"><b>' + esc(n.name) + '</b>' + (n.tour ? ' <span class="small muted">· ' + esc(n.tour) + '</span>' : '') + '<br><span class="small ' + (n.status === 'offen' ? 'danger' : 'muted') + '">' + (n.status === 'offen' ? T('noch nicht abgegeben', 'not handed over yet') : '✓ ' + T('an', 'to') + ' ' + esc(n.empfaenger) + (n.abgegebenAm ? ' · ' + fmtDT(n.abgegebenAm) : '')) + '</span></div><b style="font-size:18px">' + fmtEur(n.betrag) + '</b></div></div>';
    });
    render(html + '</main>');
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
    let html = topbar('Dienstplan', { back: 'home' }) + '<main><div class="day-switch"><button class="chip ' + (datum === today() ? 'on' : '') + '" data-nav="dienstplan/' + today() + '">' + T('Heute', 'Today') + '</button><button class="chip ' + (datum === addDays(today(), 1) ? 'on' : '') + '" data-nav="dienstplan/' + addDays(today(), 1) + '">' + T('Morgen', 'Tomorrow') + '</button></div><div class="row"><button class="btn small ghost" data-nav="dienstplan/' + addDays(datum, -1) + '">‹</button><div class="grow center"><b>' + fmtShort(datum) + '</b></div><button class="btn small ghost" data-nav="dienstplan/' + addDays(datum, 1) + '">›</button></div>';
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

  // Gesperrte Bereiche (Freigabe noch nicht erteilt): zurück zur Startseite
  const guard = fn => async arg => {
    let b = state.boot; if (!b) { try { b = await boot(); } catch (e) { b = null; } }
    if (b && b.gesperrt) { toast(T('Dieser Bereich kommt bald.', 'This area is coming soon.')); return go('home'); }
    return fn(arg);
  };
  window.MOD = { home, routes: { heute: guard(viewHeute), tourstart: viewTourStart, kilometer: () => viewKilometer(false), tourende: viewTourEnd, nachnahmen: viewNachnahmen, tourberichte: guard(viewTourberichte), tagesbericht: viewTagesbericht, dienstplan: guard(viewDienstplan), urlaub: viewUrlaub, antraege: viewAntraege, abwesenheit: viewAbwesenheit, uebersicht: viewUebersicht, einstellungen: viewEinstellungen } };
  // Startseite neu zeichnen, falls bereits geladen
  if ((location.hash || '#home') === '#home' && state.user && document.readyState !== 'loading') home();
})();
