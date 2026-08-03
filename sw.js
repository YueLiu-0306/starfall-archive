/* ============================================================
   sw.js — 星落城资料站 Service Worker
   注意：仅在 http(s) 环境下注册（file:// 不支持 SW）。
   策略：导航请求走网络优先，其余资源走 stale-while-revalidate。
   ============================================================ */
const CACHE = 'starfall-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg',
  './styles/base.css',
  './styles/components.css',
  './styles/layout.css',
  './styles/modules.css',
  './js/core/ui.js',
  './js/core/cloud.js',
  './js/world-data.js',
  './js/core/store.js',
  './js/core/router.js',
  './js/pages/home.js',
  './js/pages/orgs.js',
  './js/pages/timeline.js',
  './js/pages/codex.js',
  './js/pages/archives.js',
  './js/pages/trial.js',
  './js/pages/square.js',
  './js/pages/me.js',
  './js/pages/admin.js',
  './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).catch(function () { /* 允许部分失败 */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  // 只缓存同源、非云端 API 的请求
  if (url.origin !== self.location.origin) return;

  // 导航（HTML）走网络优先
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // 其余资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
