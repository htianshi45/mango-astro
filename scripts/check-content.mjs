/**
 * 构建前内容体检（零依赖）
 *
 * 背景：Sveltia / Decap CMS 直接在 GitHub 上写 Markdown，绕过本地校验。
 * 实测踩过两个坑：
 *   1. 可选 datetime 留空会写成 `updatedDate: ''`，z.coerce.date() 直接让整站构建失败；
 *   2. frontmatter 里的 `slug` 会被 Astro 当成路由别名，随手填个值就会把
 *      已发布文章的网址从 /posts/foo/ 静默改成 /posts/xxx/，旧链接全部 404。
 *
 * 现在覆盖 posts / moments / favorites 三个 collection，宁可让构建失败，
 * 也不要带病上线。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const SPECS = [
  {
    dir: 'src/content/posts',
    label: '文章',
    required: ['title', 'pubDate'],
    dateFields: ['pubDate', 'updatedDate'],
  },
  {
    dir: 'src/content/moments',
    label: '说说',
    required: ['published'],
    dateFields: ['published', 'updatedDate'],
  },
  {
    dir: 'src/content/favorites',
    label: '收藏',
    required: ['title', 'category', 'addedAt'],
    dateFields: ['addedAt'],
    category: ['bookmarks', 'books', 'movies', 'music'],
  },
];

const errors = [];
const notices = [];
const totals = {};

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

for (const spec of SPECS) {
  const dir = join(root, spec.dir);
  let files = [];
  try {
    files = readdirSync(dir).filter((name) => name.endsWith('.md'));
  } catch {
    errors.push(`${spec.dir}: 目录不存在`);
    totals[spec.label] = 0;
    continue;
  }
  totals[spec.label] = files.length;
  const seenSlugs = new Map();

  for (const file of files) {
    const filename = basename(file, '.md');
    const text = readFileSync(join(dir, file), 'utf8');
    const frontmatter = parseFrontmatter(text);
    const where = `${spec.dir}/${file}`;

    if (frontmatter === null) {
      errors.push(`${where}: 缺少合法的 frontmatter（文件需以 --- 开头并闭合）`);
      continue;
    }

    // 1. URL 别名必须与文件名一致，否则已发布内容会换网址 / 路由重复
    const slug = readField(frontmatter, 'slug');
    if (slug !== undefined && slug !== filename) {
      errors.push(
        `${where}: slug="${slug}" 与文件名 "${filename}" 不一致，` +
          `网址/条目 ID 会变化且旧链接可能 404。请改回 "${filename}" 或同步重命名文件。`
      );
    }
    const effectiveSlug = slug || filename;
    if (seenSlugs.has(effectiveSlug)) {
      errors.push(`${where}: 别名 "${effectiveSlug}" 与 ${seenSlugs.get(effectiveSlug)} 重复，会产生同名条目`);
    } else {
      seenSlugs.set(effectiveSlug, file);
    }

    // 2. 必填字段
    for (const key of spec.required) {
      if (!readField(frontmatter, key)) errors.push(`${where}: 缺少必填字段 ${key}`);
    }

    // 3. 日期（空串由 schema 归一化，仅提示）
    for (const key of spec.dateFields) {
      const value = readField(frontmatter, key);
      if (value === '') {
        notices.push(`${where}: ${key} 为空字符串（CMS 留空所致），已由 schema 归一化`);
      } else if (value !== undefined && Number.isNaN(new Date(value).getTime())) {
        errors.push(`${where}: ${key}="${value}" 不是合法日期`);
      }
    }

    // 4. 收藏专属：分类枚举与数值范围
    if (spec.category) {
      const category = readField(frontmatter, 'category');
      if (category && !spec.category.includes(category)) {
        errors.push(`${where}: category="${category}" 不在允许范围 [${spec.category.join(', ')}]`);
      }
      for (const [key, max] of [['rating', 10], ['progress', 100]]) {
        const raw = readField(frontmatter, key);
        if (raw === undefined || raw === '') continue;
        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0 || num > max) {
          errors.push(`${where}: ${key}=${raw} 超出 0–${max} 范围`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 导航栏数据（后台「站点设置 → 导航栏」直接写这个 JSON）
// 背景：CMS 的 list 控件允许留空，很容易写出 href 为空或 page 拼错 的导航项，
// 结果就是页面上多出一个点击没反应的菜单，构建期很难发现。这里提前拦。
// ---------------------------------------------------------------------------
const PAGE_KEYS = ['download', 'map', 'archive', 'tags', 'search', 'moments', 'bookmarks', 'favorites'];
const NAV_FILE = 'src/data/navigation.json';

function checkNavItems(items, trail) {
  if (!Array.isArray(items)) {
    errors.push(`${NAV_FILE}: ${trail} 不是数组`);
    return 0;
  }
  let count = 0;
  items.forEach((item, i) => {
    const where = `${NAV_FILE}: ${trail}[${i}]${item?.name ? ` (${item.name})` : ''}`;
    if (!item || typeof item !== 'object') {
      errors.push(`${where} 不是对象`);
      return;
    }
    if (!item.name || !String(item.name).trim()) errors.push(`${where} 缺少名称`);
    const href = String(item.href ?? '').trim();
    if (!href) {
      errors.push(`${where} 缺少链接 href（只想当分组标题请填 #）`);
    } else if (!/^(#|\/|https?:\/\/|mailto:)/.test(href)) {
      errors.push(`${where} href="${href}" 必须以 / 或 # 或 http(s):// 开头`);
    }
    if (item.page && !PAGE_KEYS.includes(item.page)) {
      errors.push(`${where} page="${item.page}" 不是合法开关键 [${PAGE_KEYS.join(', ')}]`);
    }
    count += 1;
    if (Array.isArray(item.children) && item.children.length) {
      count += checkNavItems(item.children, `${trail}[${i}].children`);
    }
  });
  return count;
}

let navCount = 0;
try {
  const navRaw = readFileSync(join(root, NAV_FILE), 'utf8');
  let nav;
  try {
    nav = JSON.parse(navRaw);
  } catch (e) {
    errors.push(`${NAV_FILE}: JSON 解析失败 —— ${e.message}（常见原因：多了一个逗号或少了引号）`);
    nav = null;
  }
  if (nav) {
    if (!Array.isArray(nav.items) || nav.items.length === 0) {
      errors.push(`${NAV_FILE}: items 不能为空，否则导航栏会整条消失`);
    } else {
      navCount = checkNavItems(nav.items, 'items');
    }
  }
} catch {
  errors.push(`${NAV_FILE}: 文件不存在或不可读`);
}

if (notices.length) {
  console.log(`[check-content] 提示 ${notices.length} 条：`);
  for (const notice of notices) console.log(`  · ${notice}`);
}

const summary = Object.entries(totals).map(([label, n]) => `${label} ${n}`).join(' · ');

if (errors.length) {
  console.error(`\n[check-content] 内容体检未通过，共 ${errors.length} 个问题：\n`);
  for (const error of errors) console.error(`  ✗ ${error}`);
  console.error('\n修好后再执行 npm run build。详见《站点管理与设置教程》「CMS 写入的常见坑」。\n');
  process.exit(1);
}

console.log(
  `[check-content] ✓ ${summary} · 导航 ${navCount} 项 全部通过（URL 别名、日期、必填字段、枚举与数值范围）`
);
