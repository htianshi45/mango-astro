/**
 * POST /api/upload —— 图片上传（R2 桶）
 *
 * 流程：上传页(/tools/upload)在浏览器里用 canvas 压成 WebP（≤1200px、q82），
 * 这里只做鉴权 + 入桶，不做服务端图像处理（Workers 跑不了 sharp）。
 *
 * 鉴权：请求头 X-Upload-Token 必须等于 Pages 环境变量 UPLOAD_KEY
 *       （2026-11-12 已通过 API 写入项目配置）。
 * 存储：R2 桶，绑定名 MANGO_IMG（wrangler.toml）。启用 R2 前此接口返回 503。
 * 返回：{ url: "https://<站点>/img/<key>" }，经 functions/img/[[key]].js 读桶回源，
 *       浏览器与 CDN 按 immutable 缓存（key 里带内容哈希）。
 */

const MAX_SIZE = 15 * 1024 * 1024; // 15MB，压缩后一般 <500KB，防误传原图
const ALLOWED_TYPES = /^image\/(webp|jpeg|png)$/;

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost({ request, env }) {
  // 依赖就绪检查：没绑 R2 或没设密钥时给出明确提示，而不是神秘 500
  if (!env.UPLOAD_KEY || !env.MANGO_IMG) {
    return json(503, { error: '上传功能未启用：缺少 MANGO_IMG 绑定或 UPLOAD_KEY 环境变量' });
  }

  const token = request.headers.get('X-Upload-Token') || '';
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

  // key 由上传页生成（p/<年月>/<内容哈希>.<ext>），这里再做一次白名单校验
  const key = String(form.get('key') || '');
  if (!/^[a-z0-9][a-z0-9/_.-]{3,120}$/i.test(key) || key.includes('..')) {
    return json(400, { error: `key 不合法: ${key}` });
  }

  await env.MANGO_IMG.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  const origin = new URL(request.url).origin;
  return json(200, { url: `${origin}/img/${key}`, size: file.size });
}
