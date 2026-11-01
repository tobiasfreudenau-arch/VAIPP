// Sprachen: Deutsch (Standard) und Englisch
window.I18N = (function () {
  const de = {
    app: 'VIP Fahrzeugübergabe',
    login: 'Anmelden', register: 'Passwort festlegen', forgot: 'Passwort vergessen',
    email: 'E-Mail-Adresse', password: 'Passwort', password2: 'Passwort wiederholen', newPassword: 'Neues Passwort', code: 'Code aus der E-Mail',
    firstTime: 'Erstes Mal hier? Passwort festlegen', loginBtn: 'Anmelden', registerBtn: 'Passwort speichern & anmelden', sendCode: 'Code anfordern', resetBtn: 'Passwort ändern',
    registerHint: 'Nur mit deiner bei VIP Freudenau hinterlegten E-Mail-Adresse möglich.', pwMismatch: 'Die Passwörter stimmen nicht überein.', codeSent: 'Wenn die E-Mail bekannt ist, wurde ein Code gesendet.',
    home: 'Start', newProtocol: 'Neues Protokoll', myProtocols: 'Meine Protokolle', allProtocols: 'Alle Protokolle', vehicles: 'Fahrzeuge', dashboard: 'Übersicht', damages: 'Schäden', users: 'Mitarbeiter', settings: 'Einstellungen',
    pending: 'Wartet auf Übertragung', pendingHint: 'Wird automatisch gesendet, sobald wieder Netz da ist.', toConfirm: 'Bitte bestätigen', toConfirmHint: 'Ein Protokoll mit dir wurde ohne deine Unterschrift erstellt.',
    draftFound: 'Angefangenes Protokoll', continueDraft: 'Weiter', discardDraft: 'Verwerfen',
    offline: 'Kein Netz – Eingaben werden gespeichert und später gesendet.',
    step: 'Schritt', of: 'von', next: 'Weiter', back: 'Zurück', done: 'Fertig', cancel: 'Abbrechen', save: 'Speichern', send: 'Protokoll absenden', skip: 'Überspringen',
    s1: 'Fahrzeug', s2: 'Anlass & Personen', s3: 'Tacho & Tank', s4: 'Rundgang-Fotos', s5: 'Schäden', s6: 'Innenraum & Inventar', s7: 'Zusammenfassung', s8: 'Unterschriften',
    pickVehicle: 'Fahrzeug antippen', orPlate: 'oder Kennzeichen eingeben', plate: 'Kennzeichen', model: 'Modell (optional)', newVehicle: 'Neues Fahrzeug anlegen', recent: 'Zuletzt', search: 'Suchen …',
    reason: 'Anlass', from: 'Übergeben von', to: 'Übergeben an', me: 'Ich', company: 'Firma / Hof', pickPerson: 'Person wählen', lastDriver: 'Letzter Fahrer laut Protokoll',
    km: 'Kilometerstand', kmPhoto: 'Foto vom Tacho', tank: 'Tankstand', kmWarn: 'Kleiner als im letzten Protokoll ({km} km) – bitte prüfen!', lastKm: 'Letztes Protokoll: {km} km am {date}',
    photosHint: 'Stell dich so hin, dass das ganze Fahrzeug im Bild ist.', takePhoto: 'Foto', retake: 'Neu', required: 'Pflicht', conditions: 'Erschwerte Bedingungen',
    front: 'Front', rear: 'Heck', left: 'Fahrerseite', right: 'Beifahrerseite', cargo: 'Laderaum', cockpit: 'Cockpit', roof: 'Dach', interior: 'Innenraum', extra: 'Weiteres Foto',
    dark: 'Dunkelheit', wet: 'Nass', snow: 'Schnee/Eis', dirty: 'Verschmutzt',
    knownDamages: 'Bekannte Schäden', knownHint: 'Bitte jeden bekannten Schaden prüfen: noch da oder repariert?', stillThere: 'Noch da', repaired: 'Repariert / weg', newDamage: 'Neuer Schaden', tapSil: 'Stelle auf dem Fahrzeug antippen, um einen neuen Schaden zu melden.',
    noDamages: 'Keine neuen Schäden', damageCode: 'Art des Schadens', size: 'Größe', small: 'klein', medium: 'mittel', large: 'groß', note: 'Stichwort (optional)', damagePhoto: 'Nahfoto vom Schaden', addDamage: 'Schaden übernehmen', remove: 'Entfernen', unchecked: 'noch nicht geprüft',
    interiorDamaged: 'Innenraum beschädigt?', yes: 'Ja', no: 'Nein', where: 'Wo / was?', warnLights: 'Fehlermeldungen / Warnleuchten?', none: 'Keine', which: 'Welche?', inventory: 'Inventar', target: 'Soll', actual: 'Ist', naviNr: 'Navi-Nr.', remark: 'Bemerkung (optional)',
    summary: 'Zusammenfassung', newDamagesCount: 'Neue Schäden', photos: 'Fotos', missing: 'Fehlt noch', allGood: 'Alles vollständig.',
    signFrom: 'Unterschrift Übergeber', signTo: 'Unterschrift Übernehmer', signHint: 'Mit dem Finger unterschreiben', clear: 'Löschen', notPresent: 'Nicht anwesend', notPresentHint: 'Die Person bestätigt das Protokoll später in der App.',
    sending: 'Protokoll wird gesendet …', uploading: 'Fotos werden hochgeladen ({n} offen) …', sent: 'Protokoll gespeichert', sentNo: 'Protokoll-Nr.', queued: 'Gespeichert – wird gesendet, sobald Netz da ist.',
    protocol: 'Protokoll', date: 'Datum', status: 'Status', confirm: 'Bestätigen', dispute: 'Widersprechen', disputeReason: 'Was stimmt nicht?', confirmed: 'Bestätigt', hints: 'Hinweise', pdf: 'PDF im Drive',
    openDamages: 'Offene Schäden', driver: 'Fahrer', lastProtocol: 'Letztes Protokoll', never: 'noch nie', days: 'Tage', archive: 'Archivieren', activate: 'Aktivieren', importVehicles: 'Kennzeichen importieren', importHint: 'Ein Kennzeichen pro Zeile, optional Modell nach zwei Leerzeichen.',
    language: 'Sprache', changePassword: 'Passwort ändern', oldPassword: 'Altes Passwort', logout: 'Abmelden', version: 'Version', privacy: 'Datenschutz-Hinweis', privacyText: 'Diese App dokumentiert den Zustand der Firmenfahrzeuge (Fotos vom Fahrzeug, Kilometerstand, Schäden, Unterschrift) zur Schadensdokumentation. Gespeichert werden Name, E-Mail, Zeitpunkt und die Protokolldaten. Fotos sollen nur das Fahrzeug zeigen, keine Personen.',
    responsible: 'Verantwortlich', period: 'Zeitraum', firstSeen: 'Erstmeldung', setStatus: 'Status setzen', adminNote: 'Notiz', open: 'offen', fixed: 'repariert', disputed: 'bestritten', settled: 'abgerechnet',
    last30: 'Letzte 30 Tage', vehiclesNoProtocol: 'Fahrzeuge ohne Protokoll ≥ 14 Tage', oneSided: 'Einseitige Protokolle (offen)', disputedProtocols: 'Widersprochene Protokolle', withHints: 'Protokolle mit Hinweisen', missingParts: 'Fehlende Inventarteile', byDriver: 'Neue Schäden je Fahrer', byVehicle: 'Neue Schäden je Fahrzeug', recentProtocols: 'Letzte Protokolle', kmOverview: 'Kilometerstände',
    addUser: 'Mitarbeiter anlegen', role: 'Rolle', area: 'Bereich', active: 'Aktiv', pwSet: 'Passwort gesetzt', resetPw: 'Passwort zurücksetzen', resetPwHint: 'Der Mitarbeiter legt beim nächsten Öffnen über „Passwort festlegen“ ein neues Passwort fest.', firstName: 'Vorname', lastName: 'Nachname',
    roleAdmin: 'Admin', roleDispo: 'Disposition', roleDriver: 'Fahrer / Mitarbeiter', exportCsv: 'CSV-Export', openSheet: 'Tabelle öffnen', openFolder: 'Drive-Ordner öffnen',
    errNet: 'Keine Verbindung zum Server.', errGeneric: 'Es ist ein Fehler aufgetreten.', reallyDiscard: 'Angefangenes Protokoll wirklich verwerfen?', photoNeeded: 'Bitte zuerst die Pflichtfotos machen.', plateNeeded: 'Bitte ein Fahrzeug wählen.', personNeeded: 'Bitte Übergeber und Übernehmer wählen.', kmNeeded: 'Bitte Kilometerstand eingeben und Tacho fotografieren.', samePerson: 'Übergeber und Übernehmer müssen verschieden sein.',
    installHint: 'Tipp: Über „Teilen“ → „Zum Home-Bildschirm“ wird die App installiert.',
    rotateHint: 'Mit einem Finger drehen, mit zwei Fingern zoomen.'
  };
  const en = {
    app: 'VIP Vehicle Handover',
    login: 'Sign in', register: 'Set password', forgot: 'Forgot password',
    email: 'E-mail address', password: 'Password', password2: 'Repeat password', newPassword: 'New password', code: 'Code from e-mail',
    firstTime: 'First time here? Set your password', loginBtn: 'Sign in', registerBtn: 'Save password & sign in', sendCode: 'Request code', resetBtn: 'Change password',
    registerHint: 'Only possible with the e-mail address registered at VIP Freudenau.', pwMismatch: 'Passwords do not match.', codeSent: 'If the e-mail is known, a code has been sent.',
    home: 'Home', newProtocol: 'New handover', myProtocols: 'My handovers', allProtocols: 'All handovers', vehicles: 'Vehicles', dashboard: 'Overview', damages: 'Damages', users: 'Staff', settings: 'Settings',
    pending: 'Waiting for upload', pendingHint: 'Will be sent automatically once online.', toConfirm: 'Please confirm', toConfirmHint: 'A handover involving you was created without your signature.',
    draftFound: 'Unfinished handover', continueDraft: 'Continue', discardDraft: 'Discard',
    offline: 'No network – your input is saved and sent later.',
    step: 'Step', of: 'of', next: 'Next', back: 'Back', done: 'Done', cancel: 'Cancel', save: 'Save', send: 'Submit handover', skip: 'Skip',
    s1: 'Vehicle', s2: 'Reason & people', s3: 'Odometer & fuel', s4: 'Walk-around photos', s5: 'Damages', s6: 'Interior & inventory', s7: 'Summary', s8: 'Signatures',
    pickVehicle: 'Tap a vehicle', orPlate: 'or type the plate', plate: 'Licence plate', model: 'Model (optional)', newVehicle: 'Create new vehicle', recent: 'Recent', search: 'Search …',
    reason: 'Reason', from: 'Handed over by', to: 'Handed over to', me: 'Me', company: 'Company / yard', pickPerson: 'Choose person', lastDriver: 'Last driver per protocol',
    km: 'Odometer (km)', kmPhoto: 'Photo of odometer', tank: 'Fuel level', kmWarn: 'Lower than last protocol ({km} km) – please check!', lastKm: 'Last protocol: {km} km on {date}',
    photosHint: 'Stand so that the whole vehicle is in the picture.', takePhoto: 'Photo', retake: 'Redo', required: 'Required', conditions: 'Difficult conditions',
    front: 'Front', rear: 'Rear', left: "Driver's side", right: 'Passenger side', cargo: 'Cargo area', cockpit: 'Cockpit', roof: 'Roof', interior: 'Interior', extra: 'Extra photo',
    dark: 'Darkness', wet: 'Wet', snow: 'Snow/ice', dirty: 'Dirty',
    knownDamages: 'Known damages', knownHint: 'Check every known damage: still there or repaired?', stillThere: 'Still there', repaired: 'Repaired / gone', newDamage: 'New damage', tapSil: 'Tap the spot on the vehicle to report a new damage.',
    noDamages: 'No new damages', damageCode: 'Type of damage', size: 'Size', small: 'small', medium: 'medium', large: 'large', note: 'Keyword (optional)', damagePhoto: 'Close-up photo', addDamage: 'Add damage', remove: 'Remove', unchecked: 'not checked yet',
    interiorDamaged: 'Interior damaged?', yes: 'Yes', no: 'No', where: 'Where / what?', warnLights: 'Error messages / warning lights?', none: 'None', which: 'Which?', inventory: 'Inventory', target: 'Target', actual: 'Actual', naviNr: 'Navi no.', remark: 'Remark (optional)',
    summary: 'Summary', newDamagesCount: 'New damages', photos: 'Photos', missing: 'Still missing', allGood: 'Everything complete.',
    signFrom: 'Signature – handing over', signTo: 'Signature – taking over', signHint: 'Sign with your finger', clear: 'Clear', notPresent: 'Not present', notPresentHint: 'The person confirms the protocol later in the app.',
    sending: 'Sending protocol …', uploading: 'Uploading photos ({n} left) …', sent: 'Protocol saved', sentNo: 'Protocol no.', queued: 'Saved – will be sent once online.',
    protocol: 'Protocol', date: 'Date', status: 'Status', confirm: 'Confirm', dispute: 'Dispute', disputeReason: 'What is wrong?', confirmed: 'Confirmed', hints: 'Notes', pdf: 'PDF in Drive',
    openDamages: 'Open damages', driver: 'Driver', lastProtocol: 'Last protocol', never: 'never', days: 'days', archive: 'Archive', activate: 'Activate', importVehicles: 'Import plates', importHint: 'One plate per line, optional model after two spaces.',
    language: 'Language', changePassword: 'Change password', oldPassword: 'Old password', logout: 'Sign out', version: 'Version', privacy: 'Privacy note', privacyText: 'This app documents the condition of company vehicles (photos of the vehicle, mileage, damages, signature). Stored: name, e-mail, time and protocol data. Photos should only show the vehicle, no people.',
    responsible: 'Responsible', period: 'Period', firstSeen: 'First seen', setStatus: 'Set status', adminNote: 'Note', open: 'open', fixed: 'repaired', disputed: 'disputed', settled: 'settled',
    last30: 'Last 30 days', vehiclesNoProtocol: 'Vehicles without protocol ≥ 14 days', oneSided: 'One-sided protocols (open)', disputedProtocols: 'Disputed protocols', withHints: 'Protocols with notes', missingParts: 'Missing inventory', byDriver: 'New damages per driver', byVehicle: 'New damages per vehicle', recentProtocols: 'Recent protocols', kmOverview: 'Odometer readings',
    addUser: 'Add staff member', role: 'Role', area: 'Area', active: 'Active', pwSet: 'Password set', resetPw: 'Reset password', resetPwHint: 'The staff member sets a new password via "Set password" next time.', firstName: 'First name', lastName: 'Last name',
    roleAdmin: 'Admin', roleDispo: 'Dispatch', roleDriver: 'Driver / staff', exportCsv: 'CSV export', openSheet: 'Open sheet', openFolder: 'Open Drive folder',
    errNet: 'No connection to the server.', errGeneric: 'An error occurred.', reallyDiscard: 'Really discard the unfinished handover?', photoNeeded: 'Please take the required photos first.', plateNeeded: 'Please choose a vehicle.', personNeeded: 'Please choose both persons.', kmNeeded: 'Please enter the odometer reading and photograph it.', samePerson: 'Both persons must be different.',
    installHint: 'Tip: use "Share" → "Add to Home Screen" to install the app.',
    rotateHint: 'Rotate with one finger, zoom with two.'
  };
  const dict = { de, en };
  let lang = localStorage.getItem('vip_lang') || 'de';
  function t(key, vars) {
    let s = (dict[lang] && dict[lang][key]) || dict.de[key] || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  return { t, get lang() { return lang; }, setLang(l) { lang = dict[l] ? l : 'de'; localStorage.setItem('vip_lang', lang); } };
})();
