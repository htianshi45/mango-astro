/**
 * 收藏条目的落盘逻辑（CLI 与本地导入界面共用）
 *
 * 为什么单独抽一层：命令行和网页写出来的 Markdown 必须完全一致，
 * 否则 CMS 一保存就会因为字段不全把内容抹掉。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const CONTENT_DIR = join(ROOT, 'src', 'content', 'favorites');

export const STATUS_KEYS = ['wish', 'doing', 'done', 'favorite'];
export const STATUS_LABEL = {
  wish: '想读 / 想看 / 想听',
  doing: '进行中',
  done: '已完成',
  favorite: '精选 / 最爱',
};

const yamlStr = (value) => `'${String(value ?? '').replace(/'/g, "''")}'`;
const yamlList = (list) => `[${list.map((item) => yamlStr(item)).join(', ')}]`;

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const slugFor = (item) => `douban-${item.kind}-${item.id}`;

/** 已有同链接的条目就跳过，避免重复导入 */
export function findExisting(url) {
  if (!url || !existsSync(CONTENT_DIR)) return null;
  for (const file of readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(CONTENT_DIR, file), 'utf8');
    if (text.includes(`url: ${url}`) || text.includes(`url: '${url}'`)) return file;
  }
  return null;
}

/**
 * 写一个收藏条目。
 * @param {object} p
 * @param {object} p.item       fetchDoubanItem 返回的条目
 * @param {string} p.status     wish / doing / done / favorite
 * @param {number} p.rating     0–10
 * @param {string[]} p.tags
 * @param {string} p.note       正文短评（Markdown）
 * @param {string} p.cover      站内封面路径，空表示没封面
 */
export function writeFavorite({ item, status = 'wish', rating = 0, tags = [], note = '', cover = '' }) {
  const slug = slugFor(item);
  const safeStatus = STATUS_KEYS.includes(status) ? status : 'wish';
  const safeRating = Number.isFinite(Number(rating)) ? Math.min(10, Math.max(0, Number(rating))) : 0;

  const frontmatter = [
    '---',
    `slug: ${yamlStr(slug)}`,
    `title: ${yamlStr(item.title)}`,
    `category: ${item.category}`,
    `cover: ${yamlStr(cover)}`,
    `description: ${yamlStr(item.description)}`,
    `status: ${safeStatus}`,
    `rating: ${safeRating}`,
    'progress: 0',
    `url: ${yamlStr(item.url)}`,
    `creator: ${yamlStr(item.creator)}`,
    `year: ${yamlStr(item.year)}`,
    `tags: ${yamlList(tags)}`,
    `addedAt: ${today()}`,
    'weight: 0',
    '---',
    '',
    note ? String(note).trim() : '',
    '',
  ].join('\n');

  const dest = join(CONTENT_DIR, `${slug}.md`);
  writeFileSync(dest, frontmatter, 'utf8');
  return { slug, file: `src/content/favorites/${slug}.md`, status: safeStatus, rating: safeRating };
}
