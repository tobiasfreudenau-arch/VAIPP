// Service Worker: App-Dateien offline verfügbar halten. Backend-Aufrufe werden nie gecacht.
const CACHE = 'vip-uebergabe-v1.1.0';
const FILES = ['./', './index.html', './css/app.css', './js/config.js', './js/i18n.js', './js/db.js', './js/api.js', './js/img.js', './js/sig.js', './js/sil.js', './js/van3d.js', './js/app.js', './js/modules.js', './manifest.webmanifest', './img/logo.png', './img/logo-viparcel.png', './img/logo-viparking.png', './img/icon-192.png', './img/icon-512.png', './img/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Backend & fremde Hosts: direkt
  e.respondWith(
    fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
