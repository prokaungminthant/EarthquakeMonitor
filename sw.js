const CACHE_NAME = 'quakesense-v1';
const ASSETS = ['index.html','android.html','style.css','script.js','cities.json','alert.wav'];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  evt.respondWith(caches.match(evt.request).then(res => res || fetch(evt.request)));
});