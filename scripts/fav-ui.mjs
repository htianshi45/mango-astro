#!/usr/bin/env node
/**
 * 豆瓣书影音导入 · 本地界面
 *
 *   npm run fav:ui
 *
 * 打开 http://127.0.0.1:5199/，粘贴豆瓣链接就能提取字段、预览、选状态后保存。
 * 为什么需要本地服务：浏览器直接抓豆瓣会被 CORS 和防盗链挡住，
 * 这里由本机 Node 代抓（顺带绕开图片防盗链 /api/cover）。
 *
 * 只监听 127.0.0.1，不对外暴露；关掉终端进程即停止。
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchDoubanItem, downloadCover, KIND_MAP } from './lib/douban.mjs';
import { findExisting, writeFavorite, slugFor } from './lib/fav-store.mjs';

const PORT = Number(process.env.FAV_UI_PORT || 5199);
const HTML = readFileSync(fileURLToPath(new URL('./lib/fav-ui.html', import.meta.url)), 'utf8');
const OPEN = !process.argv.includes('--no-open');

const json = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) reject(new Error('请求过大'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  // 首页
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(HTML);
    return;
  }

  // 封面代理：豆瓣图片有防盗链，浏览器直接 <img src> 会 403
  if (req.method === 'GET' && url.pathname === '/api/cover') {
    const target = url.searchParams.get('u');
    if (!target || !/^https?:\/\/[^/]*doubanio\.com\//.test(target)) {
      json(res, 400, { ok: false, error: '只代理 doubanio 的图片' });
      return;
    }
    try {
      const upstream = await fetch(target, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
          Referer: 'https://book.douban.com/',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!upstream.ok) {
        json(res, 502, { ok: false, error: `封面抓取失败 ${upstream.status}` });
        return;
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(200, {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(buffer);
    } catch (error) {
      json(res, 502, { ok: false, error: error.message });
    }
    return;
  }

  // 抓取
  if (req.method === 'POST' && url.pathname === '/api/parse') {
    try {
      const body = await readBody(req);
      const item = await fetchDoubanItem(String(body.text || ''), { forceKind: body.kind || '' });
      json(res, 200, { ok: true, item });
    } catch (error) {
      json(res, 200, { ok: false, error: error.message });
    }
    return;
  }

  // 保存
  if (req.method === 'POST' && url.pathname === '/api/save') {
    try {
      const body = await readBody(req);
      const item = body.item;
      if (!item || !item.kind || !item.id || !item.title) {
        json(res, 200, { ok: false, error: '条目信息不完整，先抓取一次再保存' });
        return;
      }
      if (!KIND_MAP[item.kind]) {
        json(res, 200, { ok: false, error: `不认识的类型：${item.kind}` });
        return;
      }
      const existing = findExisting(item.url);
      if (existing) {
        json(res, 200, { ok: false, error: `这个条目已经导入过了：src/content/favorites/${existing}` });
        return;
      }

      let cover = '';
      if (item.cover) {
        try {
          cover = await downloadCover(item.cover, slugFor(item));
        } catch {
          cover = ''; // 封面失败不阻塞，后台还能补
        }
      }

      const saved = writeFavorite({
        item,
        status: body.status,
        rating: body.rating,
        tags: Array.isArray(body.tags) ? body.tags : [],
        note: body.note || '',
        cover,
        url: body.url || '',
      });
      json(res, 200, { ok: true, ...saved, cover });
    } catch (error) {
      json(res, 200, { ok: false, error: error.message });
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`\n🍬 豆瓣导入界面已启动：${url}`);
  console.log('   粘贴豆瓣链接 → 抓取 → 选状态 → 保存；Ctrl+C 结束。\n');
  if (OPEN) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
  }
});
