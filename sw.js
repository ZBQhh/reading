/* The Atlantic Reader — 最简 Service Worker（P3 · PWA）
 * 应用壳缓存优先 + 运行时图片缓存；离线可用。
 * 注意：Service Worker 仅在 HTTP(S) 下生效（file:// 不支持），
 * 注册逻辑已在 reader_app.js 中按 location.protocol 守卫。
 */
const CACHE = 'atlantic-reader-v1';
const APP_SHELL = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'assets/css/reader_style.css',
  'assets/js/reader_app.js',
  'assets/data/magazines.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(APP_SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 应用壳：缓存优先
  if (APP_SHELL.indexOf(url.pathname.replace(/^\//, '')) >= 0 || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
    return;
  }

  // 图片/数据：先网络，失败回退缓存（运行时缓存）
  if (/\.(webp|png|jpe?g|gif|json|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
  }
});
