/**
 * Service worker: makes the site installable and keeps it usable on a bad
 * connection, without ever pinning visitors to an old copy.
 *
 * - Pages: network first. The live page always wins when there is signal; the
 *   last copy seen is only used offline, and if a page was never opened the
 *   offline page shows instead.
 * - /assets/ (photos, css, fonts, scripts): served from cache for speed and
 *   refreshed in the background, so a changed file shows on the next visit.
 * - Everything else (data/site.json, the dashboard, other sites) is left alone.
 *
 * Bump VERSION when this file changes in a way that needs old caches cleared.
 */
const VERSION = 'v1';
const PAGES = `bb-pages-${VERSION}`;
const ASSETS = `bb-assets-${VERSION}`;
const SCOPE = new URL(self.registration.scope).pathname; // "/" on Vercel
const OFFLINE = `${SCOPE}offline.html`;

// Public pages only. The dashboard lives at a secret address and must never be
// stored on a device, so anything not on this list goes straight to the network.
const PUBLIC_PAGE = /^(?:|story\/|menu\/|locations\/(?:[a-z0-9-]+\/)?|careers\/|contact\/|news\/|privacy\/)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  const rel = url.pathname.slice(SCOPE.length);

  if (req.mode === 'navigate') {
    if (!PUBLIC_PAGE.test(rel)) return;
    // Cache by path alone: ?sent=1 and friends are the same page.
    const key = url.origin + url.pathname;
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            e.waitUntil(caches.open(PAGES).then((c) => c.put(key, copy)));
          }
          return res;
        })
        .catch(() => caches.match(key).then((hit) => hit || caches.match(OFFLINE)))
    );
    return;
  }

  if (rel.startsWith('assets/')) {
    e.respondWith(
      caches.open(ASSETS).then((c) => c.match(req).then((hit) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') c.put(req, res.clone());
          return res;
        });
        if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
        return fresh;
      }))
    );
  }
});
