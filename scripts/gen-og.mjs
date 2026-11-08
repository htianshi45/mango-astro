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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const MOMENTS_DIR = path.join(ROOT, 'src/content/moments');
const OUT_DIR = path.join(ROOT, 'public/og');
const POST_OUT_DIR = path.join(OUT_DIR, 'posts');
const MOMENT_OUT_DIR = path.join(OUT_DIR, 'moments');
const W = 1200;
const H = 630;
const FONT = 'PingFang SC, Heiti SC, sans-serif';

/** 卡片页脚显示的站点地址：跟随 SITE_URL，避免换域名时三处手改漏掉一处 */
const SITE_LABEL = (process.env.SITE_URL || 'https://mango-astro-git.pages.dev')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');

/**
 * 中文可用性探测 —— 云端构建的护栏
 *
 * sharp 渲染 SVG 文本走的是 librsvg + fontconfig，缺中文字体时中文会变成一排
 * 「豆腐块」，而且**不会报错**，只有把分享卡发到微信里才会发现。
 * 本机 macOS 有 PingFang SC；Cloudflare Pages / GitHub Actions 的 Linux 镜像没有。
 * 所以云端构建时：已存在同名卡片就原样保留（仓库里提交的是本机生成的好版本），
 * 不拿乱码覆盖。新增文章请在本地跑一次 `npm run og` 再提交。
 */
function hasCJKFont() {
  if (process.env.OG_ASSUME_NO_CJK === '1') return false; // 本地模拟云端环境用
  try {
    const out = execFileSync('fc-list', [':lang=zh', 'family'], {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim().length > 0;
  } catch {
    // macOS 默认不带 fc-list：PingFang 一定在，直接放行
    return process.platform === 'darwin';
  }
}

const CJK_OK = hasCJKFont() || process.argv.includes('--force');
let rendered = 0;
let kept = 0;
let missing = [];

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
  if (!CJK_OK) {
    try {
      await fs.access(outFile);
      kept += 1;
      return; // 保留仓库里已有的卡片，不用豆腐块覆盖
    } catch {
      missing.push(path.relative(ROOT, outFile));
      return; // 没有可保留的版本：宁可不生成，让页面回退到默认 ogImage
    }
  }
  const base = await baseLayer(cover);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await sharp(base)
    .composite([{ input: layer, top: 0, left: 0 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(outFile);
  rendered += 1;
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
    footer: SITE_LABEL,
  });
  await render(path.join(POST_OUT_DIR, `${slug}.jpg`), layer, data.heroImage);
  count += 1;
}

const homeLayer = textLayer({
  eyebrow: 'MANGO · BLOG',
  titleLines: wrap('把日常的美图，安放在这里', 17, 3),
  subtitle: 'Mango - 微信朋友圈风格图片博客',
  footer: SITE_LABEL,
});
await render(path.join(OUT_DIR, 'home.jpg'), homeLayer, null);

// 说说详情页的分享卡：标题取正文首行，背景用第一张配图（如果有）
const firstImage = (body) => body.match(/!\[[^\]]*\]\(\s*([^)\s]+)/)?.[1] || '';
const plainText = (body) => body
  .replace(/^---[\s\S]*?---/, '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/<img[^>]*>/g, '')
  .replace(/[#*`\[\]>]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

let momentCount = 0;
for (const file of (await fs.readdir(MOMENTS_DIR)).filter((f) => f.endsWith('.md')).sort()) {
  const src = await fs.readFile(path.join(MOMENTS_DIR, file), 'utf-8');
  const data = parseFrontmatter(src);
  if (data.draft === 'true') continue;
  const id = file.replace(/\.md$/, '');
  const text = plainText(src);
  const layer = textLayer({
    eyebrow: 'MANGO · 说说',
    titleLines: wrap(text.slice(0, 60) || '一条说说'),
    subtitle: [data.location, String(data.published || '').slice(0, 10)].filter(Boolean).join(' · ') || 'Mango',
    footer: SITE_LABEL,
  });
  await render(path.join(MOMENT_OUT_DIR, `${id}.jpg`), layer, firstImage(src));
  momentCount += 1;
}

if (!CJK_OK) {
  console.log(`  OG 卡片：当前环境没有中文字体，跳过渲染（保留已有 ${kept} 张）`);
  if (missing.length) {
    console.warn(`  ⚠ 以下 ${missing.length} 张卡片尚不存在，页面将回退到默认分享图：`);
    for (const f of missing.slice(0, 10)) console.warn(`    - ${f}`);
    if (missing.length > 10) console.warn(`    … 另外 ${missing.length - 10} 张`);
    console.warn('  → 请在有中文字体的机器上执行 npm run og 后提交 public/og/');
  }
} else {
  console.log(`  OG 卡片：首页 1 张 + 文章 ${count} 张 + 说说 ${momentCount} 张 → public/og/`);
}
