/**
 * 文章统计 API（浏览 / 点赞）· EdgeOne Makers Cloud Function + Blob
 *
 * 路由：GET|POST /api/stats/:slug
 *   GET  -> { views, likes, live: true }
 *   POST -> body { views: 1 } 计一次浏览，或 { likes: 1 } 点一次赞
 *
 * 存储：EdgeOne Blob store「mango-stats」，strong 一致性。
 *   - 计数：stats/<slug>.json  -> { views, likes }
 *   - 去重：dedupe/<type>_<fp>_<slug>.json -> { ts: <timestamp> }
 *     读取时判断是否还在 24h 窗口内（Blob 无 TTL）。
 *
 * 为什么从 Edge Function + KV 改成 Cloud Function + Blob：
 *   实测本项目部署后 Edge Function 路由未生效（/api/stats 返回静态 404），
 *   而 Cloud Function 的 /img /upload /auth 路由都正常。统到 Cloud Function 更稳。
 *   Blob 的 strong 一致性对 read-modify-write 计数也更合适。
 */
import { getStore } from '@edgeone/pages-blob';

const SLUG_RE = /^[A-Za-z0-9_-]{1,120}$/;
const DAY = 86400 * 1000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });

function fingerprint(context) {
  const reqHeaders = context.request.headers || {};
  const ip =
    context.clientIp ||
    reqHeaders['x-forwarded-for'] ||
    reqHeaders['cf-connecting-ip'] ||
    'unknown';
  let h = 2166136261;
  for (let i = 0; i < ip.length; i += 1) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

async function readStats(store, slug) {
  const base = { views: 0, likes: 0 };
  try {
    const data = await store.get(`stats/${slug}.json`, { type: 'json' });
    return data ? { ...base, ...data } : base;
  } catch {
    return base;
  }
}

async function isRecent(store, key) {
  try {
    const data = await store.get(key, { type: 'json' });
    if (!data || !Number.isFinite(data.ts)) return false;
    return Date.now() - data.ts < DAY;
  } catch {
    return false;
  }
}

export async function onRequestGet({ params }) {
  const slug = String(params.slug || '');
  if (!SLUG_RE.test(slug)) return json({ error: 'bad_slug' }, 400);
  const store = getStore({ name: 'mango-stats', consistency: 'strong' });
  return json({ ...(await readStats(store, slug)), live: true });
}

export async function onRequestPost(context) {
  const { params, request } = context;
  const slug = String(params.slug || '');
  if (!SLUG_RE.test(slug)) return json({ error: 'bad_slug' }, 400);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const addViews = body.views === 1 ? 1 : 0;
  const addLikes = body.likes === 1 ? 1 : 0;
  if (!addViews && !addLikes) return json({ error: 'no_change' }, 400);

  const store = getStore({ name: 'mango-stats', consistency: 'strong' });
  const fp = fingerprint(context);
  const dedupeKey = `dedupe/${addLikes ? 'liked' : 'viewed'}_${fp}_${slug}.json`;
  if (await isRecent(store, dedupeKey)) {
    return json({ ...(await readStats(store, slug)), live: true, deduped: true });
  }

  const current = await readStats(store, slug);
  const next = {
    views: Math.max(0, Number(current.views) || 0) + addViews,
    likes: Math.max(0, Number(current.likes) || 0) + addLikes,
  };
  await store.setJSON(`stats/${slug}.json`, next);
  await store.setJSON(dedupeKey, { ts: Date.now() });
  return json({ ...next, live: true });
}
