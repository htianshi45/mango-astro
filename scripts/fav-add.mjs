#!/usr/bin/env node
/**
 * 书影音条目一键导入（CLI）
 *
 * 用法：
 *   npm run fav -- "https://book.douban.com/subject/26953606/"
 *   npm run fav -- "【豆瓣】人类简史 https://book.douban.com/subject/26953606/ ..."（整段分享文案都行）
 *   npm run fav -- 26953606 --kind book
 *   npm run fav -- <链接> --status done --rating 9.1 --tags 历史,社科 --note "很好读"
 *   npm run fav -- <链接> --dry        # 只看抓到了什么，不写文件
 *
 * 生成的文件：src/content/favorites/douban-<kind>-<id>.md
 * 封面下载到：public/images/uploads/douban/
 */
import { fetchDoubanItem, downloadCover, KIND_MAP } from './lib/douban.mjs';
import { findExisting, writeFavorite, slugFor, STATUS_KEYS, STATUS_LABEL } from './lib/fav-store.mjs';

function parseArgs(argv) {
  const args = { text: '', status: 'wish', rating: null, tags: [], note: '', force: false, dry: false, kind: '', cover: true };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case '--status':
        args.status = argv[++i] || 'wish';
        break;
      case '--rating':
        args.rating = Number(argv[++i]);
        break;
      case '--tags':
        args.tags = String(argv[++i] || '')
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean);
        break;
      case '--note':
        args.note = argv[++i] || '';
        break;
      case '--kind':
        args.kind = argv[++i] || '';
        break;
      case '--force':
        args.force = true;
        break;
      case '--dry':
        args.dry = true;
        break;
      case '--no-cover':
        args.cover = false;
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        rest.push(token);
    }
  }
  args.text = rest.join(' ').trim();
  return args;
}

function printSummary(item) {
  const rows = [
    ['类型', `${item.label}（${item.category}）`],
    ['标题', item.title],
    ['作者/导演/歌手', item.creator || '（没抓到）'],
    ['年份', item.year || '（没抓到）'],
    ['豆瓣评分', item.rating ? String(item.rating) : '（没抓到）'],
    ['封面', item.cover ? '已抓到' : '（没抓到）'],
    ['简介', item.description || '（没抓到）'],
    ['补充', Object.entries(item.extra).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'],
  ];
  const width = Math.max(...rows.map(([k]) => [...k].length * 2));
  for (const [key, value] of rows) {
    console.log(`  ${key.padEnd(width / 2)}  ${value}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.text) {
    console.log(`
📚 豆瓣书影音一键导入

  npm run fav -- "<豆瓣链接或整段分享文案>" [选项]

选项
  --status wish|doing|done|favorite   状态，默认 wish
  --rating 9.1                        评分（默认用豆瓣评分）
  --tags 历史,社科                    标签，逗号分隔
  --note "写两句短评"                  正文短评（Markdown）
  --kind book|movie|music             链接里没有域名时手动指定类型
  --dry                               只预览抓取结果，不写文件
  --no-cover                          不下载封面
  --force                             同链接已存在时仍然新建

示例
  npm run fav -- "https://book.douban.com/subject/26953606/"
  npm run fav -- "https://movie.douban.com/subject/1292052/" --status done --tags 电影,经典
`);
    process.exit(args.text ? 0 : 1);
  }

  console.log('\n⏳ 正在抓取豆瓣条目…\n');
  let item;
  try {
    item = await fetchDoubanItem(args.text, { forceKind: args.kind });
  } catch (error) {
    console.error(`❌ ${error.message}\n`);
    process.exit(1);
  }

  if (item.fromCache) console.log('  （命中本地缓存，未重新请求豆瓣）');

  const existing = findExisting(item.url);
  if (existing && !args.force) {
    console.log(`⚠️  这个条目已经导入过了：src/content/favorites/${existing}\n`);
    console.log('   想重新生成就加 --force，或直接去后台改现有条目。\n');
    process.exit(0);
  }

  const slug = slugFor(item);
  const rating = Number.isFinite(args.rating) ? args.rating : item.rating;
  const status = STATUS_KEYS.includes(args.status) ? args.status : 'wish';
  const tags = args.tags.length ? args.tags : [];

  console.log('📥 抓取结果：');
  printSummary({ ...item, rating });
  console.log('');

  if (args.dry) {
    console.log('（--dry 模式，没有写文件）\n');
    return;
  }

  let cover = '';
  if (args.cover && item.cover) {
    try {
      cover = await downloadCover(item.cover, slug);
      console.log(`🖼  封面已保存：public${cover}`);
    } catch (error) {
      console.log(`⚠️  封面下载失败（${error.message}），先写成空封面，之后可在后台补。`);
    }
  }

  const saved = writeFavorite({ item, status, rating, tags, note: args.note, cover });

  console.log(`✅ 已写入 ${saved.file}`);
  console.log(`   分类：${KIND_MAP[item.kind].category} · 状态：${STATUS_LABEL[saved.status]}`);
  console.log('   下一步：npm run dev 预览，或直接 npm run build 发布会自动带上。\n');
}

main();
