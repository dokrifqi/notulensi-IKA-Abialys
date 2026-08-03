// Service Worker - Notulensi PPDS IKA
// Strategi: NETWORK-FIRST untuk index.html supaya versi terbaru selalu
// diambil dari server begitu ada koneksi internet. Cache hanya dipakai
// sebagai fallback saat offline.

const CACHE_NAME = 'notulensi-ppds-ika-v2';
const OFFLINE_URLS = [
  './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './img/abyalis-1.jpg', './img/abyalis-2.jpg', './img/abyalis-3.jpg', './img/abyalis-4.jpg',
  './img/jaga-list-tulisan-tangan.jpg', './img/jaga-list-pasien-flamboyan9.jpg', './img/jaga-grup-pasien-baru-wa.jpg',
];

// Install: cache aset dasar, langsung aktif tanpa menunggu tab lama ditutup
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
});

// Activate: hapus cache versi lama, ambil alih kontrol semua tab yang terbuka
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST untuk navigasi/HTML (auto-update), CACHE-FIRST untuk aset statis
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET request
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Network-first: selalu coba ambil versi terbaru dari server dulu
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Aset lain (icon, manifest): cache-first, update cache di background
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Terima pesan dari halaman (misalnya trigger skipWaiting manual jika diperlukan)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
