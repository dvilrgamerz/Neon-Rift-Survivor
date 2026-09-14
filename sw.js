const CACHE='neon-rift-v4-1';
const ASSETS=['./','./index.html','./styles.css','./v3.css','./v3.1.css','./v3.3.css','./v4.css','./src/game-v3.js','./src/upgrade-v3.1.js','./src/v3.3.js','./src/v4/config.js','./src/v4/audio-vfx.js','./src/v4/gameplay.js','./src/v4/meta.js','./src/v4/rarity-patch.js','./manifest.webmanifest','./assets/v4-icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match('./index.html'))));
});