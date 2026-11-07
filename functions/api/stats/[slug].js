/**
 * 文章统计 API（P1-2）· Cloudflare Pages Functions
 *
 * 路由：GET|POST /api/stats/:slug
 *   GET  -> { views, likes, live: true }
 *   POST -> body { views: 1 } 计一次浏览，或 { likes: 1 } 点一次赞
 *
 * 存储：KV namespace「mango-stats」，key = stats:<slug>，值 { views, likes }。
 * 防刷：按 CF-Connecting-IP 的哈希 + slug 生成去重 key，24 小时内同一 IP
 *       对同一篇文章只计一次浏览 / 一次赞（KV expirationTtl）。
 * 降级：KV 未绑定时返回 503，前端会保留 frontmatter 里的静态数字，不影响页面。
 *
 * 注意：KV 是最终一致性存储，read-modify-write 在极高并发下可能丢一次计数，
 *       对个人博客量级完全可接受，不引入 Durable Object 的额外复杂度。
 */
const SLUG_RE = /^[A-Za-z0-9_-]{1,120}$/;
const DAY = 86400;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });

const statKey = (slug) => `stats:${slug}`;

function fingerprint(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  let h = 2166136261;
  for (let i = 0; i < ip.length; i += 1) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

async function readStats(kv, slug) {
  const base = { views: 0, likes: 0 };
  try {
    const raw = await kv.get(statKey(slug));
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  } catch {
    return base;
  }
}

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || '');
  if (!SLUG_RE.test(slug)) return json({ error: 'bad_slug' }, 400);
  if (!env.mango_stats) return json({ error: 'kv_not_bound' }, 503);
  return json({ ...(await readStats(env.mango_stats, slug)), live: true });
}

export async function onRequestPost({ params, env, request }) {
  const slug = String(params.slug || '');
  if (!SLUG_RE.test(slug)) return json({ error: 'bad_slug' }, 400);
  if (!env.mango_stats) return json({ error: 'kv_not_bound' }, 503);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const addViews = body.views === 1 ? 1 : 0;
  const addLikes = body.likes === 1 ? 1 : 0;
  if (!addViews && !addLikes) return json({ error: 'no_change' }, 400);

  const kv = env.mango_stats;
  const fp = fingerprint(request);
  const dedupeKey = `${addLikes ? 'liked' : 'viewed'}:${fp}:${slug}`;
  const already = await kv.get(dedupeKey);
  if (already) return json({ ...(await readStats(kv, slug)), live: true, deduped: true });

  const current = await readStats(kv, slug);
  const next = {
    views: Math.max(0, Number(current.views) || 0) + addViews,
    likes: Math.max(0, Number(current.likes) || 0) + addLikes,
  };
  await kv.put(statKey(slug), JSON.stringify(next));
  await kv.put(dedupeKey, '1', { expirationTtl: DAY });
  return json({ ...next, live: true });
}
