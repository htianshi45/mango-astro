/**
 * 主动推送收录（P2-18）
 *
 * 从 dist/sitemap.xml 读取全部 URL，推送到 IndexNow（Bing / Yandex / Seznam 等）
 * 与百度站长平台。两者都通过环境变量提供凭据，不写进仓库、不进前端。
 *
 * 用法：
 *   INDEXNOW_KEY=xxx node scripts/push-indexnow.mjs --write-key  # 只写验证文件（构建前）
 *   INDEXNOW_KEY=xxx BAIDU_TOKEN=yyy node scripts/push-indexnow.mjs  # 部署后推送
 *
 * IndexNow 要求站点根目录下有 <key>.txt，内容就是 key 本身；
 * 所以必须先 --write-key 再 npm run build，让文件进入 dist。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL || 'https://mango-astro.pages.dev').replace(/\/+$/, '');
const KEY = process.env.INDEXNOW_KEY || '';
const BAIDU_TOKEN = process.env.BAIDU_TOKEN || '';
const writeKeyOnly = process.argv.includes('--write-key');

if (!KEY && writeKeyOnly) {
  console.log('  未设置 INDEXNOW_KEY，跳过 key 文件生成');
  process.exit(0);
}

if (!KEY && !BAIDU_TOKEN) {
  console.log('  未配置 INDEXNOW_KEY / BAIDU_TOKEN，跳过推送（不是错误）');
  process.exit(0);
}

if (KEY && writeKeyOnly) {
  const target = path.join(ROOT, 'public', `${KEY}.txt`);
  await fs.writeFile(target, `${KEY}\n`);
  console.log(`  已写入 ${path.relative(ROOT, target)}，请重新构建使文件进入 dist`);
  process.exit(0);
}

let urls = [];
try {
  const xml = await fs.readFile(path.join(ROOT, 'dist/sitemap.xml'), 'utf-8');
  urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
} catch {
  console.error('  读取 dist/sitemap.xml 失败，请先执行 npm run build');
  process.exit(1);
}

if (urls.length === 0) {
  console.error('  sitemap 里没有 URL，跳过推送');
  process.exit(1);
}

if (KEY) {
  const host = new URL(SITE).host;
  const body = {
    host,
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList: urls,
  };
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    console.log(`  IndexNow: HTTP ${res.status}（${urls.length} 条 URL）`);
  } catch (err) {
    console.log(`  IndexNow 推送失败: ${err.message}`);
  }
}

if (BAIDU_TOKEN) {
  try {
    const endpoint = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(SITE)}&token=${encodeURIComponent(BAIDU_TOKEN)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: urls.join('\n'),
    });
    console.log(`  百度站长: HTTP ${res.status} → ${await res.text()}`);
  } catch (err) {
    console.log(`  百度推送失败: ${err.message}`);
  }
}
