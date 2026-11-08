/**
 * Mango 离线缓存（P2-17）
 *
 * 策略刻意区分两类请求：
 *   - HTML 导航：network-first。永远优先拿线上最新内容，只有断网才回缓存，
 *     避免「发了新文章但老访客被 Service Worker 钉在旧页面」。
 *   - 带内容哈希的静态资源：cache-first。/_astro/* 与 /opt-images/* 的文件名
 *     随内容变化，永久缓存是安全的。
 *   - /api/ 与其它请求：不缓存，避免统计/评论数据被缓存成旧值。
 *
 * 版本号改动即会触发新 cache 建立、旧 cache 清理。
 */
const VERSION = 'mango-v2';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
// Cloudflare Pages 会把 /offline.html 308 到 /offline，预缓存必须写最终 URL，
// 否则缓存的是重定向响应，离线时拿不到页面。
const OFFLINE_URL = '/offline';
const CACHEABLE_PREFIXES = ['/_astro/', '/opt-images/', '/fonts/', '/icons/', '/js/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE)
      .then((cache) => cache.addAll(['/', OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('mango-') && ![STATIC_CACHE, PAGE_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
  }
});
