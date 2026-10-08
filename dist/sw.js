const CACHE='merge-meadow-v7';
const CORE=['/','/manifest.webmanifest','/icon.svg','/assets/forest-ground.png','/assets/desert-ground.png','/assets/polar-ground.png','/assets/fence/piece-0.png','/assets/fence/piece-2.png',...Array.from({length:6},(_,i)=>`/assets/decor/forest-${i}.png`),...['forest','desert','polar'].flatMap(m=>Array.from({length:9},(_,i)=>`/assets/animals/${m}-${i}.png`))];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')return e.respondWith(fetch(e.request).then(r=>{let copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
