/**
 * GET /img/<key> —— 从 EdgeOne Blob 读取上传的图片并回源
 *
 * 用函数回源而非自定义域：URL 规则 /img/<key> 保持不变，
 * 浏览器与 CDN 按 immutable 缓存（key 里带内容哈希）。
 *
 * 与 Cloudflare 版的差异：
 *   - env.MANGO_IMG.get(key) 返回 R2 对象（含 writeHttpMetadata / httpEtag）
 *   - EdgeOne Blob 用 store.get(key, { type: 'arrayBuffer' }) 取原始字节
 *   - contentType 按扩展名推断；Blob 无 R2 式 httpEtag，不输出 ETag（仍 immutable 缓存）
 */
import { getStore } from '@edgeone/pages-blob';

const MIME = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

function contentTypeOf(key) {
  const ext = (key.split('.').pop() || '').toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

export async function onRequestGet({ params }) {
  const raw = params.key;
  const key = Array.isArray(raw) ? raw.join('/') : String(raw || '');
  if (!key || key.includes('..')) return new Response('Bad Request', { status: 400 });

  const store = getStore({ name: 'mango-img', consistency: 'strong' });
  const body = await store.get(key, { type: 'arrayBuffer' });
  if (!body) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  headers.set('Content-Type', contentTypeOf(key));
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(body, { headers });
}
