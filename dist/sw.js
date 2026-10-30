const CACHE='null-tide-v5.0.1';
const SHELL=['/','/index.html','/style.css','/polish.css','/icon.svg','/assets/app-icon-192.png','/assets/app-icon-512.png','/manifest.webmanifest','/assets/gen.svg','/assets/icons.svg','/assets/cover.svg','/assets/submersible.svg','/src/main.js','/src/world.js','/src/render.js','/src/controls.js','/src/audio.js','/src/species.js','/src/species-data.js','/src/fish-art.js','/src/progression.js','/src/storage.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('null-tide-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 // One version owns the entire application shell, so offline modules cannot mix releases.
 if(SHELL.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));
});
