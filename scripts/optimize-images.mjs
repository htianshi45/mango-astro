/**
 * 构建期图片优化（P0-2）
 *
 * 目标：给 public/images 下每一张 jpg/png 生成 WebP 多尺寸变体，
 * 并把「真实宽高 + 各档 URL」写进 src/data/image-manifest.json，
 * 供 src/utils/image-attrs.ts 在渲染时生成 srcset / width / height。
 *
 * 为什么不用 astro:assets：
 *   本项目所有内容（frontmatter、CMS 字段、豆瓣导入、JSON 配置）都用
 *   `/images/xxx.jpg` 这样的 public 绝对路径，改成 import 需要迁移全部内容与后台。
 *   用「构建期产物 + 属性函数」可以零迁移地拿到同样的 WebP/srcset/CLS 收益。
 *
 * 幂等：源文件与变体的 mtime 比较，未变化的图不重复编码；会清理孤立变体。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES_DIR = path.join(ROOT, 'public/images');
// 变体刻意放在 public/opt-images/ 而不是 public/images/opt/：
// Cloudflare Pages 的 _headers 规则是「前缀匹配 + 追加同名字段」，
// /images/* 会连同 /images/opt/* 一起命中并叠加出两个 Cache-Control 值。
// 独立前缀才能让「原图 7 天」与「带哈希变体 immutable」两条规则互斥。
const OUT_DIR = path.join(ROOT, 'public/opt-images');
const MANIFEST = path.join(ROOT, 'src/data/image-manifest.json');
const WIDTHS = [400, 800, 1200];
const QUALITY = 78;
const EXTS = new Set(['.jpg', '.jpeg', '.png']);

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'opt' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const sources = (await walk(IMAGES_DIR)).sort();
await fs.mkdir(OUT_DIR, { recursive: true });

const manifest = {};
const expected = new Set();
let encoded = 0;
let skipped = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for (const file of sources) {
  const rel = path.relative(IMAGES_DIR, file);
  const publicPath = `/images/${rel.split(path.sep).join('/')}`;
  const image = sharp(file);
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) {
    console.warn(`  ! 无法读取尺寸，跳过：${publicPath}`);
    continue;
  }

  const sourceBuffer = await fs.readFile(file);
  bytesBefore += sourceBuffer.byteLength;
  const stem = rel.slice(0, -path.extname(rel).length);
  // 内容哈希进文件名：源图一变 URL 就变，才能安全地对变体使用 immutable 长缓存。
  // 旧变体在下面的 sweep() 里自动清理，不会越积越多。
  const stamp = crypto.createHash('sha1').update(sourceBuffer).digest('hex').slice(0, 8);
  const variants = {};

  // 不放大：只生成不超过原图宽度的档位；小图至少留一档原宽
  const widths = WIDTHS.filter((w) => w < width);
  if (width <= WIDTHS[0]) widths.push(width);
  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);

  for (const w of uniqueWidths) {
    const outName = `${stem}-${w}.${stamp}.webp`;
    const outFile = path.join(OUT_DIR, outName);
    const outPublic = `/opt-images/${outName.split(path.sep).join('/')}`;
    expected.add(outFile);

    const stat = await fs.stat(file);
    let fresh = false;
    if (await exists(outFile)) {
      const outStat = await fs.stat(outFile);
      fresh = outStat.mtimeMs >= stat.mtimeMs;
    }
    if (!fresh) {
      await fs.mkdir(path.dirname(outFile), { recursive: true });
      await sharp(file)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toFile(outFile);
      encoded += 1;
    } else {
      skipped += 1;
    }
    variants[String(w)] = outPublic;
    bytesAfter += (await fs.stat(outFile)).size;
  }

  manifest[publicPath] = {
    width,
    height,
    // 默认取最大档作为 src；浏览器会按 srcset + sizes 自行挑更小的档
    default: variants[String(uniqueWidths[uniqueWidths.length - 1])],
    variants,
  };
}

// 清理源文件已删除/改名留下的孤立变体
let removed = 0;
async function sweep(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await sweep(full);
    else if (!expected.has(full)) {
      await fs.unlink(full);
      removed += 1;
    }
  }
}
if (await exists(OUT_DIR)) await sweep(OUT_DIR);

await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`  源图 ${sources.length} 张 · 新编码 ${encoded} · 复用 ${skipped} 个变体 · 清理 ${removed}`);
console.log(`  WebP 变体合计 ${(bytesAfter / 1024).toFixed(0)}KB（源图合计 ${(bytesBefore / 1024).toFixed(0)}KB）`);
console.log(`  manifest: ${path.relative(ROOT, MANIFEST)}`);
