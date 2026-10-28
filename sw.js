// Next Point Pickleball: shows phone alerts. It doesn't cache anything, so updates to the site show up right away.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

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
