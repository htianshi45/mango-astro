/**
 * GET /img/<key> —— 从 R2 桶读取上传的图片并回源
 *
 * 为什么不用 R2 自定义域：需要去控制台手动绑域；函数回源这条路
 * 依赖更少（Pages 自带 CDN 会按 Cache-Control 边缘缓存），等以后
 * 想换 img.840428.xyz 直连，改 key 前缀即可，URL 规则不变。
 */

export async function onRequestGet({ env, params }) {
  if (!env.MANGO_IMG) return new Response('图片服务未启用', { status: 503 });

  // [[key]] 是 catch-all：Pages 传字符串（含斜杠），防御性兼容数组
  const key = Array.isArray(params.key) ? params.key.join('/') : String(params.key || '');
  if (!key || key.includes('..')) return new Response('Bad Request', { status: 400 });

  const obj = await env.MANGO_IMG.get(key);
  if (!obj) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', obj.httpEtag);
  return new Response(obj.body, { headers });
}
