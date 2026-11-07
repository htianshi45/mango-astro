/**
 * 构建前内容体检（零依赖）
 *
 * 背景：Sveltia / Decap CMS 直接在 GitHub 上写 Markdown，绕过本地校验。
 * 实测踩过两个坑：
 *   1. 可选 datetime 留空会写成 `updatedDate: ''`，z.coerce.date() 直接让整站构建失败；
 *   2. frontmatter 里的 `slug` 会被 Astro 当成路由别名，随手填个值就会把
 *      已发布文章的网址从 /posts/foo/ 静默改成 /posts/xxx/，旧链接全部 404。
 *
 * 这里在 astro build 之前做一次静态检查，宁可让构建失败，也不要带病上线。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const postsDir = join(root, 'src/content/posts');

const errors = [];
const notices = [];
const seenSlugs = new Map();

function readField(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  if (!match) return undefined;
  return match[1].trim().replace(/^['"]|['"]$/g, '').trim();
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  return text.slice(4, end);
}

const files = readdirSync(postsDir).filter((name) => name.endsWith('.md'));

for (const file of files) {
  const filename = basename(file, '.md');
  const text = readFileSync(join(postsDir, file), 'utf8');
  const frontmatter = parseFrontmatter(text);

  if (frontmatter === null) {
    errors.push(`${file}: 缺少合法的 frontmatter（文件需以 --- 开头并闭合）`);
    continue;
  }

  // 1. URL 别名必须与文件名一致，否则已发布文章会换网址
  const slug = readField(frontmatter, 'slug');
  if (slug !== undefined && slug !== filename) {
    errors.push(
      `${file}: slug="${slug}" 与文件名 "${filename}" 不一致，` +
        `文章网址会变成 /posts/${slug}/ 且旧链接 404。请改回 "${filename}" 或同步重命名文件。`
    );
  }

  const effectiveSlug = slug || filename;
  if (seenSlugs.has(effectiveSlug)) {
    errors.push(`${file}: URL 别名 "${effectiveSlug}" 与 ${seenSlugs.get(effectiveSlug)} 重复，会产生同名路由`);
  } else {
    seenSlugs.set(effectiveSlug, file);
  }

  // 2. 必填字段（正文在 frontmatter 之后，不在此处检查）
  for (const key of ['title', 'pubDate']) {
    const value = readField(frontmatter, key);
    if (!value) errors.push(`${file}: 缺少必填字段 ${key}`);
  }

  const pubDate = readField(frontmatter, 'pubDate');
  if (pubDate && Number.isNaN(new Date(pubDate).getTime())) {
    errors.push(`${file}: pubDate="${pubDate}" 不是合法日期`);
  }

  // 3. CMS 空日期：schema 已做容错，仅提示，不拦截
  const updatedDate = readField(frontmatter, 'updatedDate');
  if (updatedDate === '') {
    notices.push(`${file}: updatedDate 为空字符串（CMS 留空所致），已由 schema 归一化，不影响构建`);
  }
}

if (notices.length) {
  console.log(`[check-content] 提示 ${notices.length} 条：`);
  for (const notice of notices) console.log(`  · ${notice}`);
}

if (errors.length) {
  console.error(`\n[check-content] 内容体检未通过，共 ${errors.length} 个问题：\n`);
  for (const error of errors) console.error(`  ✗ ${error}`);
  console.error('\n修好后再执行 npm run build。详见《站点管理与设置教程》「CMS 写入的常见坑」。\n');
  process.exit(1);
}

console.log(`[check-content] ✓ ${files.length} 篇文章通过体检（URL 别名、日期、必填字段）`);
