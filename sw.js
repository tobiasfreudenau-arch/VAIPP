// VIP Freudenau GmbH App – Service Worker
// Strategie: Dateien sofort aus dem Speicher liefern, im Hintergrund aktualisieren.
// Bei jeder neuen Version CACHE hochzählen, dann holt sich das Handy alles einmal neu.
const CACHE = 'vip-app-v1.2.0';
const FILES = ['./', './index.html', './css/app.css', './js/config.js', './js/i18n.js', './js/db.js', './js/api.js', './js/img.js', './js/sig.js', './js/sil.js', './js/app.js', './js/modules.js', './manifest.webmanifest', './img/logo.png', './img/logo-viparcel.png', './img/logo-viparking.png', './img/icon-192.png', './img/apple-touch-icon.png'];
const LATER = ['./js/van3d.js', './img/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES).then(() => c.addAll(LATER).catch(() => {}))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Backend & fremde Hosts: direkt ins Netz
  const key = url.pathname.endsWith('/') ? './' : e.request;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true }) || (e.request.mode === 'navigate' ? await c.match('./index.html') : null);
    const net = fetch(e.request).then(res => { if (res && res.ok) c.put(e.request, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (await c.match('./index.html')) || Response.error();
  }));
});
