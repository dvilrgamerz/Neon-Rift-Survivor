// Neon Rift Survivor: cache app assets for offline play without hijacking other traffic.
const CACHE = 'neon-rift-v4-5-offline';
const PREFIX = 'neon-rift-';
const ASSETS = [
  './','./index.html',
  './styles.css?v=10','./v3.css?v=3','./v3.1.css?v=2','./v3.3.css?v=1','./v4.css?v=2','./v4.3-ui.css?v=1',
  './src/game-v3.js?v=3','./src/upgrade-v3.1.js?v=2','./src/v3.3.js?v=1',
  './src/v4/config.js?v=1','./src/v4/audio-vfx.js?v=1','./src/v4/rarity-patch.js?v=1',
  './src/v4/gameplay.js?v=1','./src/v4/meta.js?v=1','./src/v4/ui-polish.js?v=1',
  './manifest.webmanifest','./assets/v4-icon.svg'
];
const STATIC_PATHS = new Set(ASSETS.map(path => new URL(path, self.location.href).pathname));
self.addEventListener('install',event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate',event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(PREFIX) && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch',event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/.netlify/functions/') || url.pathname.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (!response.ok) throw new Error('Navigation unavailable');
      return response;
    }).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match('./index.html')) || Response.error();
    }));
    return;
  }
  if (!STATIC_PATHS.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  }));
});
