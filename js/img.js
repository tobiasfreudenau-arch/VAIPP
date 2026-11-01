// Bilder verkleinern (Original bleibt auf dem Handy, hochgeladen wird die verkleinerte Fassung)
window.IMG = (function () {
  const FULL = 1600, THUMB = 360;
  function load(file) {
    return new Promise((res, rej) => {
      if (window.createImageBitmap) {
        createImageBitmap(file, { imageOrientation: 'from-image' }).then(res).catch(() => loadImg(file).then(res, rej));
      } else loadImg(file).then(res, rej);
    });
  }
  function loadImg(file) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { URL.revokeObjectURL(u); res(im); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Bild konnte nicht gelesen werden')); };
      im.src = u;
    });
  }
  function draw(src, max, q) {
    const w = src.width, h = src.height;
    const s = Math.min(1, max / Math.max(w, h));
    const cw = Math.round(w * s), ch = Math.round(h * s);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, cw, ch);
    return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', q));
  }
  async function process(file) {
    const src = await load(file);
    const full = await draw(src, FULL, 0.82);
    const thumb = await draw(src, THUMB, 0.6);
    if (src.close) src.close();
    return { full, thumb };
  }
  function blobUrl(blob) { return URL.createObjectURL(blob); }
  return { process, blobUrl };
})();
