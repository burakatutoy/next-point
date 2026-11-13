// Next Point Pickleball: phone alerts, and opening the site without signal.
// Pages are fetched from the network first (so updates show up right away) and kept as a copy for when the signal is gone.
const CACHE = 'np-pages-v1';
const SHELL = ['./', 'index.html', 'scoresheet.html', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('np-pages-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // the database and fonts go straight to the network
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const net = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error('slow')), req.mode === 'navigate' ? 6000 : 8000))]);
      if (net && net.ok && net.type === 'basic') cache.put(req, net.clone()).catch(() => {});
      return net;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const page = url.pathname.endsWith('scoresheet.html') ? 'scoresheet.html' : 'index.html';
        const shell = await cache.match(page);
        if (shell) return shell;
      }
      throw err;
    }
  })());
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {} } catch (x) { d = { title: 'Next Point', body: e.data ? e.data.text() : '' } }
  const call = d.kind === 'call' || d.kind === 'ref';
  e.waitUntil(self.registration.showNotification(d.title || 'Next Point', {
    body: d.body || '',
    tag: d.tag || 'np',
    renotify: true,
    requireInteraction: call,
    vibrate: call ? [400, 150, 400, 150, 700] : [250],
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: d.url || '#player' },
    actions: d.kind === 'call' ? [{ action: 'here', title: "I'm on my way" }] : []
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.url) || '#player';
  const target = new URL(hash, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.split('#')[0] === target.split('#')[0] && 'focus' in c) {
        c.postMessage({ url: hash });
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
