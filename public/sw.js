// 稍后阅读 · Service Worker
// 策略：导航请求网络优先（保证列表新鲜），离线时回退首页缓存；
// 静态资源缓存优先。动态接口（/api、/share-target）一律不缓存。
const CACHE = 'read-later-v1';
const SHELL = ['/', '/style.css', '/app.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 动态请求不缓存
  if (url.pathname.startsWith('/api/') || url.pathname === '/share-target') return;

  // 页面导航：网络优先，离线回退首页缓存
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  // 静态资源：缓存优先，未命中则网络并写入缓存
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
