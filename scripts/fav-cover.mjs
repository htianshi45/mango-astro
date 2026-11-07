#!/usr/bin/env node
/**
 * 回填缺失封面
 *
 *   npm run fav:cover          # 只补 cover 为空的条目
 *   npm run fav:cover -- --all # 连已有封面也重新抓一遍（豆瓣换了图才用）
 *
 * 背景：电影的 j/subject_abstract 接口不返回封面，早期导入的电影条目 cover 都是空的；
 * 图书/音乐在撞上安全验证页时也会空。这里用 lib/douban.mjs 的 resolveCover 兜底，
 * 下载到 public/images/uploads/douban/ 并改写 frontmatter 的 cover 字段。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveCover, downloadCover } from './lib/douban.mjs';
import { CONTENT_DIR } from './lib/fav-store.mjs';

const ALL = process.argv.includes('--all');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length);
const CATEGORY_KIND = { books: 'book', movies: 'movie', music: 'music' };

const files = existsSync(CONTENT_DIR)
  ? readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'))
  : [];

const field = (text, name) => {
  const m = text.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^'(.*)'$/, '$1').replace(/''/g, "'") : '';
};

let fixed = 0;
let skipped = 0;

for (const file of files) {
  const path = join(CONTENT_DIR, file);
  const text = readFileSync(path, 'utf8');
  const category = field(text, 'category');
  const kind = CATEGORY_KIND[category];
  const currentCover = field(text, 'cover');
  const title = field(text, 'title');

  if (!kind) continue; // 收藏夹（网页收藏）没有豆瓣来源

  const slug = file.replace(/\.md$/, '');
  const forced = ALL || (ONLY && slug === ONLY);
  if (ONLY && slug !== ONLY) continue;
  if (currentCover && !forced) {
    skipped += 1;
    continue;
  }

  const doubanUrl = field(text, 'doubanUrl') || field(text, 'url');
  const idMatch = doubanUrl.match(/subject\/(\d+)/);
  if (!idMatch) {
    console.log(`· 跳过 ${file}：没有豆瓣条目 ID`);
    continue;
  }
  const id = idMatch[1];

  const url = await resolveCover(kind, id, title);
  if (!url) {
    console.log(`✗ ${file}：三个来源都没拿到封面（${title}）`);
    continue;
  }

  let localPath = '';
  try {
    localPath = await downloadCover(url, slug, { force: forced });
  } catch (error) {
    console.log(`✗ ${file}：封面下载失败 ${error.message}`);
    continue;
  }

  const next = text.replace(/^cover:\s*.*$/m, `cover: '${localPath}'`);
  if (next === text) {
    console.log(`· ${file}：封面已是最新（${localPath}）`);
    continue;
  }
  writeFileSync(path, next);
  fixed += 1;
  console.log(`✓ ${file}：${title} → ${localPath}`);
}

console.log(`\n完成：补封面 ${fixed} 条，已有封面跳过 ${skipped} 条。`);
if (fixed > 0) {
  console.log('下一步：npm run build && npx wrangler pages deploy dist --project-name=mango-astro');
}
