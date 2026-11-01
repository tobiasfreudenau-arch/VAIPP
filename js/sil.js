// Fahrzeug-Silhouetten (Transporter) als SVG mit antippbaren Stellen
window.SIL = (function () {
  const VIEWS = {
    links: { w: 320, h: 160, label: 'left' },
    rechts: { w: 320, h: 160, label: 'right' },
    front: { w: 200, h: 200, label: 'front' },
    heck: { w: 200, h: 200, label: 'rear' },
    dach: { w: 320, h: 160, label: 'roof' },
    innen: { w: 320, h: 160, label: 'interior' }
  };
  const ORDER = ['links', 'rechts', 'front', 'heck', 'dach', 'innen'];

  function side() {
    return '<path class="body" d="M22,122 L22,72 Q26,48 52,42 L92,26 Q98,22 110,22 L292,22 Q304,22 304,34 L304,122 Z"/>' +
      '<path class="glass" d="M60,44 L96,31 L124,31 L124,74 L56,74 Z"/>' +
      '<path class="line" d="M130,26 L130,118 M205,26 L205,118 M22,100 L304,100 M304,60 L292,60"/>' +
      '<rect class="glass" x="138" y="34" width="60" height="34" rx="3"/>' +
      '<circle class="wheel" cx="78" cy="122" r="17"/><circle class="wheel" cx="78" cy="122" r="7"/>' +
      '<circle class="wheel" cx="248" cy="122" r="17"/><circle class="wheel" cx="248" cy="122" r="7"/>' +
      '<path class="line" d="M24,122 L61,122 M95,122 L231,122 M265,122 L304,122"/>' +
      '<rect class="body" x="40" y="60" width="10" height="14" rx="2"/>' +
      '<text class="lbl" x="150" y="150" text-anchor="middle">Schiebetür</text><text class="lbl" x="60" y="150" text-anchor="middle">Fahrertür</text><text class="lbl" x="255" y="150" text-anchor="middle">Heck</text>';
  }
  function sideRight() {
    return '<g transform="translate(320,0) scale(-1,1)">' + side().replace(/<text[\s\S]*$/, '') + '</g>' +
      '<text class="lbl" x="170" y="150" text-anchor="middle">Schiebetür</text><text class="lbl" x="260" y="150" text-anchor="middle">Beifahrertür</text><text class="lbl" x="65" y="150" text-anchor="middle">Heck</text>';
  }
  function front() {
    return '<path class="body" d="M30,186 L30,84 Q30,28 72,24 L128,24 Q170,28 170,84 L170,186 Z"/>' +
      '<path class="glass" d="M48,44 L152,44 L160,98 L40,98 Z"/>' +
      '<path class="line" d="M38,118 L162,118 M38,150 L162,150"/>' +
      '<rect class="glass" x="62" y="126" width="76" height="18" rx="3"/>' +
      '<ellipse class="glass" cx="48" cy="134" rx="9" ry="7"/><ellipse class="glass" cx="152" cy="134" rx="9" ry="7"/>' +
      '<rect class="body" x="14" y="70" width="16" height="22" rx="3"/><rect class="body" x="170" y="70" width="16" height="22" rx="3"/>' +
      '<rect class="wheel" x="38" y="178" width="26" height="16" rx="3"/><rect class="wheel" x="136" y="178" width="26" height="16" rx="3"/>' +
      '<text class="lbl" x="100" y="172" text-anchor="middle">Stoßstange</text>';
  }
  function rear() {
    return '<path class="body" d="M30,186 L30,60 Q30,26 64,24 L136,24 Q170,26 170,60 L170,186 Z"/>' +
      '<path class="line" d="M100,30 L100,170"/>' +
      '<rect class="glass" x="42" y="40" width="50" height="40" rx="3"/><rect class="glass" x="108" y="40" width="50" height="40" rx="3"/>' +
      '<rect class="glass" x="34" y="120" width="12" height="34" rx="2"/><rect class="glass" x="154" y="120" width="12" height="34" rx="2"/>' +
      '<path class="line" d="M34,170 L166,170"/>' +
      '<rect class="wheel" x="38" y="178" width="26" height="16" rx="3"/><rect class="wheel" x="136" y="178" width="26" height="16" rx="3"/>' +
      '<text class="lbl" x="100" y="110" text-anchor="middle">Hecktüren</text>';
  }
  function roof() {
    return '<rect class="body" x="30" y="30" width="268" height="100" rx="14"/>' +
      '<path class="line" d="M96,30 L96,130 M30,50 L96,50 M30,110 L96,110"/>' +
      '<rect class="body" x="20" y="48" width="10" height="20" rx="2"/><rect class="body" x="20" y="92" width="10" height="20" rx="2"/>' +
      '<text class="lbl" x="62" y="84" text-anchor="middle">Kabine</text><text class="lbl" x="196" y="84" text-anchor="middle">Dach Laderaum</text>' +
      '<text class="lbl" x="160" y="22" text-anchor="middle">Fahrerseite</text><text class="lbl" x="160" y="146" text-anchor="middle">Beifahrerseite</text>';
  }
  function interior() {
    return '<rect class="body" x="30" y="30" width="268" height="100" rx="12"/>' +
      '<path class="line" d="M100,30 L100,130"/>' +
      '<rect class="glass" x="44" y="42" width="24" height="26" rx="4"/><rect class="glass" x="44" y="92" width="24" height="26" rx="4"/>' +
      '<rect class="glass" x="34" y="36" width="8" height="88" rx="2"/>' +
      '<path class="line" d="M100,30 L298,30 M100,130 L298,130 M120,45 L280,45 M120,115 L280,115"/>' +
      '<text class="lbl" x="56" y="80" text-anchor="middle">Sitze</text><text class="lbl" x="38" y="80" text-anchor="middle" transform="rotate(-90 38,80)">Armaturen</text>' +
      '<text class="lbl" x="200" y="84" text-anchor="middle">Laderaum (Boden / Wände / Regal)</text>';
  }
  const DRAW = { links: side, rechts: sideRight, front, heck: rear, dach: roof, innen: interior };

  function render(container, view, markers, handlers) {
    handlers = handlers || {};
    const v = VIEWS[view] || VIEWS.links;
    let svg = '<svg class="sil" viewBox="0 0 ' + v.w + ' ' + v.h + '" xmlns="http://www.w3.org/2000/svg">' + DRAW[view || 'links']();
    (markers || []).forEach(m => {
      if (m.ansicht !== view) return;
      const cx = m.x / 100 * v.w, cy = m.y / 100 * v.h;
      svg += '<g class="mk ' + (m.kind || 'old') + '" data-id="' + m.id + '"><circle cx="' + cx + '" cy="' + cy + '" r="11"/><text x="' + cx + '" y="' + cy + '">' + (m.code || '!') + '</text></g>';
    });
    svg += '</svg>';
    container.innerHTML = svg;
    const el = container.querySelector('svg');
    el.addEventListener('click', e => {
      const mk = e.target.closest('.mk');
      if (mk) { if (handlers.onMarker) handlers.onMarker(mk.getAttribute('data-id')); return; }
      if (!handlers.onTap) return;
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100));
      const y = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
      handlers.onTap(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    });
    return el;
  }
  return { render, VIEWS, ORDER };
})();
