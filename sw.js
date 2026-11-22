/* ============================================================
   sw.js — Service Worker Student Assessment (PWA)
   - Aset aplikasi (versi ?v=) : cache dulu → buka instan
   - Halaman (index.html)       : jaringan dulu (maks 3 dtk) → cadangan cache
   - config.js                  : jaringan dulu (URL /exec bisa diganti tanpa naik versi)
   - Google Apps Script (API)   : TIDAK pernah di-cache
   - CDN (font, xlsx, pdf)      : stale-while-revalidate
   Naikkan VERSI setiap merilis frontend baru.
   ============================================================ */
const VERSI = '2.0.0';
const CACHE = 'sa-app-' + VERSI, CACHE_CDN = 'sa-cdn-v1';
const V = '?v=' + VERSI;
const ASET = ['./', './index.html', './manifest.json', './css/app.css' + V,
  './js/icons.js' + V, './js/core.js' + V, './js/charts.js' + V, './js/hasil.js' + V, './js/peserta.js' + V, './js/staf.js' + V, './js/admin.js' + V, './js/pro.js' + V,
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASET)));
  // tidak skipWaiting otomatis: pengguna ditawari "Perbarui" agar siswa yang sedang tes tidak terganggu
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sa-app-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

const jaringanDulu = (req, ms) => new Promise(resolve => {
  let selesai = false;
  const cadangan = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'));
  const t = setTimeout(() => { if (!selesai) cadangan().then(r => { if (r && !selesai) { selesai = true; resolve(r); } }); }, ms);
  fetch(req).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    if (!selesai) { selesai = true; clearTimeout(t); resolve(res); }
  }).catch(() => cadangan().then(r => { if (!selesai) { selesai = true; clearTimeout(t); resolve(r || Response.error()); } }));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;              // API GAS → selalu jaringan
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') { e.respondWith(jaringanDulu(req, 3000)); return; }
    if (/\/js\/config\.js$/.test(url.pathname)) { e.respondWith(jaringanDulu(req, 4000)); return; }
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { if (res.ok && url.search.indexOf('v=') > -1) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE_CDN).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
