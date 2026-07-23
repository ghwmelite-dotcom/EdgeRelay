// DEPRECATED — push handling moved into /sw.js so the PWA and push SW
// don't compete for scope '/'. This file remains as a self-destruct: any
// browser that still has it cached will activate this stub, unregister
// itself, and yield scope '/' back to sw.js.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { await self.registration.unregister(); } catch {}
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const c of clients) { try { c.navigate(c.url); } catch {} }
  })());
});
