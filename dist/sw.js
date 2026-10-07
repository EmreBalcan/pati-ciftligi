const CACHE='merge-meadow-v5';
const CORE=['/','/manifest.webmanifest','/icon.svg','/assets/forest-ground.png','/assets/desert-ground.png','/assets/polar-ground.png','/assets/fence/piece-0.png','/assets/fence/piece-2.png',...['forest','desert','polar'].flatMap(m=>Array.from({length:9},(_,i)=>`/assets/animals/${m}-${i}.png`))];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
