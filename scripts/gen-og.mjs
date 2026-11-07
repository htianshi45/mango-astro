/**
 * 生成 1200×630 社交分享卡（P0-5）
 *
 * 之前 og:image 指向 logo.svg（方图、无文字），分享到微信/Telegram/X 时是一张空白卡。
 * 这里在构建期为首页与每篇文章生成标准尺寸卡片：
 *   - 有 heroImage 的文章：封面模糊压暗做底，叠加中文标题
 *   - 无封面：渐变色底
 * 字体用系统 PingFang SC（sharp/librsvg 直接可用），无需下载字体文件。
 *
 * 输出为 JPEG（社交平台兼容性好、体积约为 PNG 的 1/4）。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const OUT_DIR = path.join(ROOT, 'public/og');
const POST_OUT_DIR = path.join(OUT_DIR, 'posts');
const W = 1200;
const H = 630;
const FONT = 'PingFang SC, Heiti SC, sans-serif';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const charWidth = (ch) => (/[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.55);

/** 按「中文 1 格 / 西文 0.55 格」估算换行，最多 3 行，末行超长加省略号 */
function wrap(text, maxUnits = 17, maxLines = 3) {
  const lines = [];
  let line = '';
  let units = 0;
  for (const ch of text) {
    const w = charWidth(ch);
    if (units + w > maxUnits && line && lines.length < maxLines - 1) {
      lines.push(line);
      line = ch;
      units = w;
    } else {
      line += ch;
      units += w;
    }
  }
  if (line) lines.push(line);

  // 最后一行不再换行；只有确实超宽才截断，避免「刚好放得下」的标题被误砍
  const last = lines[lines.length - 1] || '';
  const lastUnits = [...last].reduce((sum, ch) => sum + charWidth(ch), 0);
  if (lastUnits > maxUnits) {
    let used = 0;
    let clipped = '';
    for (const ch of last) {
      const w = charWidth(ch);
      if (used + w > maxUnits - 1) break;
      clipped += ch;
      used += w;
    }
    lines[lines.length - 1] = `${clipped}…`;
  }
  return lines.slice(0, maxLines);
}

function parseFrontmatter(src) {
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[kv[1]] = value;
  }
  return data;
}

function textLayer({ eyebrow, titleLines, subtitle, footer }) {
  const title = titleLines
    .map((line, i) => `<text x="72" y="${232 + i * 76}" font-family="${FONT}" font-size="56" font-weight="700" fill="#ffffff">${esc(line)}</text>`)
    .join('\n  ');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#101014" stop-opacity="0.82"/>
      <stop offset="65%" stop-color="#101014" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#101014" stop-opacity="0.30"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c2683a"/>
      <stop offset="100%" stop-color="#2f6f5e"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#shade)"/>
  <rect x="72" y="88" width="52" height="5" rx="2.5" fill="url(#accent)"/>
  <text x="72" y="132" font-family="${FONT}" font-size="22" letter-spacing="5" fill="#e0a07c">${esc(eyebrow)}</text>
  ${title}
  <text x="72" y="${232 + titleLines.length * 76 + 44}" font-family="${FONT}" font-size="26" fill="#d6d0c7">${esc(subtitle)}</text>
  <rect x="72" y="530" width="${W - 144}" height="1" fill="#ffffff" fill-opacity="0.22"/>
  <text x="72" y="574" font-family="${FONT}" font-size="20" fill="#a8a29a">${esc(footer)}</text>
</svg>`);
}

async function baseLayer(cover) {
  if (cover) {
    const file = path.join(ROOT, 'public', cover.replace(/^\//, ''));
    try {
      await fs.access(file);
      return sharp(file)
        .resize(W, H, { fit: 'cover' })
        .blur(12)
        .modulate({ brightness: 0.72, saturation: 0.85 })
        .toBuffer();
    } catch {
      // 封面路径失效时退回纯色底
    }
  }
  return sharp({
    create: { width: W, height: H, channels: 3, background: '#1e1d23' },
  }).png().toBuffer();
}

async function render(outFile, layer, cover) {
  const base = await baseLayer(cover);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await sharp(base)
    .composite([{ input: layer, top: 0, left: 0 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(outFile);
}

const files = (await fs.readdir(POSTS_DIR)).filter((f) => /\.(md|mdx)$/.test(f)).sort();
let count = 0;

for (const file of files) {
  const src = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
  const data = parseFrontmatter(src);
  if (data.draft === 'true') continue;
  const slug = file.replace(/\.(md|mdx)$/, '');
  const title = data.title || slug;
  const subtitle = [data.category, data.pubDate].filter(Boolean).join(' · ') || 'Mango';
  const layer = textLayer({
    eyebrow: 'MANGO · BLOG',
    titleLines: wrap(title),
    subtitle,
    footer: 'mango-astro.pages.dev',
  });
  await render(path.join(POST_OUT_DIR, `${slug}.jpg`), layer, data.heroImage);
  count += 1;
}

const homeLayer = textLayer({
  eyebrow: 'MANGO · BLOG',
  titleLines: wrap('把日常的美图，安放在这里', 17, 3),
  subtitle: 'Mango - 微信朋友圈风格图片博客',
  footer: 'mango-astro.pages.dev',
});
await render(path.join(OUT_DIR, 'home.jpg'), homeLayer, null);

console.log(`  OG 卡片：首页 1 张 + 文章 ${count} 张 → public/og/`);
