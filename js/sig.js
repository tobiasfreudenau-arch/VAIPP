// Unterschrift per Finger
window.SIG = function (container, opts) {
  opts = opts || {};
  container.innerHTML = '<canvas></canvas><div class="hint">' + (opts.hint || '') + '</div><div class="baseline"></div>';
  const canvas = container.querySelector('canvas');
  const hint = container.querySelector('.hint');
  const ctx = canvas.getContext('2d');
  let drawing = false, empty = true, last = null;
  function resize() {
    const r = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const data = empty ? null : canvas.toDataURL();
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
    if (data) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, r.width, r.height); im.src = data; }
  }
  function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); drawing = true; last = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x + .1, last.y + .1); ctx.stroke(); empty = false; hint.style.display = 'none'; if (opts.onChange) opts.onChange(false); });
  canvas.addEventListener('pointermove', e => { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
  const up = e => { if (!drawing) return; drawing = false; if (opts.onChange) opts.onChange(false); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', up);
  resize();
  window.addEventListener('resize', resize);
  return {
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); empty = true; hint.style.display = ''; if (opts.onChange) opts.onChange(true); },
    isEmpty() { return empty; },
    dataUrl() {
      if (empty) return '';
      // auf weißen Hintergrund legen, damit das PNG auf dem PDF sauber ist
      const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(canvas, 0, 0);
      return c.toDataURL('image/png');
    },
    destroy() { window.removeEventListener('resize', resize); }
  };
};
