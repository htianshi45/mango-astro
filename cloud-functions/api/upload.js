/**
 * POST /api/upload —— 图片上传（EdgeOne Makers Blob）
 *
 * 流程：上传页(/tools/upload)在浏览器里用 canvas 压成 WebP（≤1200px、q82），
 * 这里只做鉴权 + 入 Blob，不做服务端图像处理。
 *
 * 鉴权：请求头 X-Upload-Token 必须等于环境变量 UPLOAD_KEY。
 * 存储：EdgeOne Blob store「mango-img」，key 由上传页生成（p/<年月>/<内容哈希>.<ext>）。
 * 返回：{ url: "https://<站点>/img/<key>" }，经 cloud-functions/img/[[key]].js 回源。
 *
 * 与 Cloudflare 版的差异：
 *   - R2 绑定 env.MANGO_IMG -> getStore({ name: 'mango-img', consistency: 'strong' })
 *   - R2 的 httpMetadata（contentType / cacheControl）由回源函数按扩展名推断 + 固定 immutable 头。
 */
import { getStore } from '@edgeone/pages-blob';

const MAX_SIZE = 15 * 1024 * 1024; // 15MB，压缩后一般 <500KB，防误传原图
const ALLOWED_TYPES = /^image\/(webp|jpeg|png)$/;

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.UPLOAD_KEY) {
    return json(503, { error: '上传功能未启用：缺少 UPLOAD_KEY 环境变量' });
  }

  const token = request.headers.get('x-upload-token') || '';
  if (token !== env.UPLOAD_KEY) {
    return json(401, { error: '访问密钥不正确' });
  }

  if (!(request.headers.get('content-type') || '').includes('multipart/form-data')) {
    return json(400, { error: '需要 multipart/form-data 格式' });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: '请求体解析失败' });
  }

  const file = form.get('file');
  if (!(file instanceof File)) return json(400, { error: '缺少 file 字段' });
  if (file.size > MAX_SIZE) return json(413, { error: `文件超过 ${MAX_SIZE / 1024 / 1024}MB 上限` });
  if (!ALLOWED_TYPES.test(file.type)) return json(415, { error: `不支持的类型: ${file.type}` });

  const key = String(form.get('key') || '');
  if (!/^[a-z0-9][a-z0-9/_.-]{3,120}$/i.test(key) || key.includes('..')) {
    return json(400, { error: `key 不合法: ${key}` });
  }

  const store = getStore({ name: 'mango-img', consistency: 'strong' });
  await store.set(key, await file.arrayBuffer());

  // ⚠️ 函数运行时 request.url 的 origin 是 EdgeOne 内部域名（pages-scf-*.qcloudteo.com），
  // 不能用它拼公网 URL —— 前端拿到会访问不到。用环境变量 SITE_ORIGIN 指定正式域名。
  const origin = env.SITE_ORIGIN || new URL(request.url).origin;
  return json(200, { url: `${origin.replace(/\/$/, '')}/img/${key}`, size: file.size });
}
