const CACHE='neon-rift-v4-3';
const ASSETS=[
  './','./index.html',
  './styles.css?v=10','./v3.css?v=3','./v3.1.css?v=2','./v3.3.css?v=1','./v4.css?v=2',
  './src/game-v3.js?v=3','./src/upgrade-v3.1.js?v=2','./src/v3.3.js?v=1',
  './src/v4/config.js?v=1','./src/v4/audio-vfx.js?v=1','./src/v4/rarity-patch.js?v=1','./src/v4/gameplay.js?v=1','./src/v4/meta.js?v=1',
  './manifest.webmanifest','./assets/v4-icon.svg'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
      return res;
    }).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))
  );
});
