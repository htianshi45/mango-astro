/**
 * 豆瓣条目抓取与解析（零依赖）
 *
 * 背景：Halo 的「豆瓣」插件在服务端抓页面再做结构化，静态站没有服务端，
 * 所以把同一套逻辑搬到本地脚本：粘贴链接 → 本机抓一次 → 生成 Markdown。
 *
 * 三条实测出来的硬约束：
 *   1. movie.douban.com 桌面版常年返回「安全验证」中转页（约 3KB、无 og 标签），
 *      电影改用官方自己的 j/subject_abstract 接口（605 字节、字段最全）；
 *   2. 图书/音乐页面里有的字段把值和标签塞在同一个 <span class="pl"> 里
 *      （例如「表演者: 萧敬腾」），所以信息块必须按 <br> 整行解析，不能按标签配对；
 *   3. 连续请求会被限流、封面有防盗链，所以带磁盘缓存 + 退避重试 + Referer。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CACHE_DIR = join(ROOT, '.cache', 'douban');
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 同一链接 7 天内不再打豆瓣

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const KIND_MAP = {
  book: { category: 'books', label: '图书' },
  movie: { category: 'movies', label: '电影' },
  music: { category: 'music', label: '音乐' },
};

/** 从任意文本（豆瓣 App 分享文案 / 剪贴板）里抠出条目链接 */
export function extractDoubanUrl(text) {
  if (!text) return null;
  const raw = String(text);

  const direct = raw.match(
    /https?:\/\/(?:book|movie|music|m)\.douban\.com\/(?:(book|movie|music)\/)?subject\/(\d+)\/?/i
  );
  if (direct) {
    let kind = (direct[1] || '').toLowerCase();
    if (!kind) {
      const host = raw.slice(direct.index, direct.index + 48).toLowerCase();
      kind = host.includes('book') ? 'book' : host.includes('music') ? 'music' : 'movie';
    }
    return { kind, id: direct[2], url: `https://${kind}.douban.com/subject/${direct[2]}/` };
  }

  const bare = raw.trim().match(/^(\d{6,12})$/);
  if (bare) return { kind: null, id: bare[1], url: null };

  return null;
}

function isBlocked(html) {
  if (!html) return true;
  if (html.length < 8000) return true;
  if (/<title>\s*豆瓣\s*<\/title>/.test(html) && !/og:title/.test(html)) return true;
  if (/id="sec"/.test(html) || /检测到有异常请求/.test(html)) return true;
  return !/og:title/.test(html);
}

const cacheFile = (name) => join(CACHE_DIR, name);

function readCache(name) {
  try {
    const file = cacheFile(name);
    if (!existsSync(file)) return null;
    if (Date.now() - statSync(file).mtimeMs > CACHE_TTL) return null;
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function writeCache(name, content) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cacheFile(name), content, 'utf8');
  } catch {
    /* 缓存失败不影响主流程 */
  }
}

/** cookie：环境变量 DOUBAN_COOKIE 优先，其次仓库根目录 .douban-cookie 文件 */
function getCookie() {
  if (process.env.DOUBAN_COOKIE) return process.env.DOUBAN_COOKIE.trim();
  try {
    const file = join(ROOT, '.douban-cookie');
    if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  } catch {
    /* ignore */
  }
  return '';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function headers(extra = {}) {
  const cookie = getCookie();
  return {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    Referer: 'https://www.douban.com/',
    ...(cookie ? { Cookie: cookie } : {}),
    ...extra,
  };
}

async function fetchHtml(url, { retries = 2 } = {}) {
  let lastError = '未知错误';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(2500 * attempt);
    try {
      const res = await fetch(url, {
        headers: headers(extraReferer(url)),
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 404) throw new Error('条目不存在（404），检查链接里的数字 ID');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (isBlocked(html)) throw new Error('被豆瓣安全验证拦截');
      return html;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError);
}

function extraReferer(url) {
  if (url.includes('book.douban.com')) return { Referer: 'https://book.douban.com/' };
  if (url.includes('music.douban.com')) return { Referer: 'https://music.douban.com/' };
  if (url.includes('movie.douban.com')) return { Referer: 'https://movie.douban.com/' };
  return { Referer: 'https://m.douban.com/' };
}

/** 电影专用：豆瓣自己前端在用的摘要接口，字段最全且不需要登录 */
async function fetchMovieAbstract(id) {
  const cached = readCache(`movie-${id}.json`);
  if (cached) {
    try {
      return { data: JSON.parse(cached), fromCache: true };
    } catch {
      /* 缓存坏了就重新拉 */
    }
  }
  const url = `https://movie.douban.com/j/subject_abstract?subject_id=${id}`;
  const res = await fetch(url, {
    headers: headers({ Referer: `https://movie.douban.com/subject/${id}/` }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`摘要接口 HTTP ${res.status}`);
  const json = await res.json();
  if (!json || json.r !== 0 || !json.subject) throw new Error('摘要接口无数据');
  writeCache(`movie-${id}.json`, JSON.stringify(json.subject));
  return { data: json.subject, fromCache: false };
}

async function loadPage(kind, id) {
  const cached = readCache(`${kind}-${id}.html`);
  if (cached) return { html: cached, fromCache: true };

  const candidates =
    kind === 'movie'
      ? [`https://m.douban.com/movie/subject/${id}/`, `https://movie.douban.com/subject/${id}/`]
      : kind === 'book'
        ? [`https://book.douban.com/subject/${id}/`, `https://m.douban.com/book/subject/${id}/`]
        : [`https://music.douban.com/subject/${id}/`, `https://m.douban.com/music/subject/${id}/`];

  let lastError = '';
  for (const url of candidates) {
    try {
      const html = await fetchHtml(url);
      writeCache(`${kind}-${id}.html`, html);
      return { html, fromCache: false, source: url };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError);
}

const decodeEntities = (str = '') =>
  str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();

function meta(html, prop) {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
  const m = html.match(a) || html.match(b);
  return m ? decodeEntities(m[1]) : '';
}

/**
 * 解析 #info 信息块：按 <br> 切行，每行「标签: 值」。
 * 豆瓣把部分字段的标签和值塞在同一个 span 里，按行解析才不会漏。
 */
function parseInfo(html) {
  const start = html.indexOf('id="info"');
  const info = {};
  if (start === -1) return info;
  const end = html.indexOf('</div>', start);
  const block = html.slice(start, end === -1 ? start + 4000 : end);
  for (const rawLine of block.split(/<br\s*\/?>/i)) {
    const text = decodeEntities(rawLine.replace(/<[^>]+>/g, ' ')).trim();
    const m = text.match(/^([^:：]{1,10})[:：]\s*(.+)$/);
    if (m) {
      const key = m[1].trim();
      if (!info[key]) info[key] = m[2].trim();
    }
  }
  return info;
}

const firstOf = (value) =>
  String(value || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)[0] || '';

function ldJson(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1].trim());
      if (data && typeof data === 'object') return data;
    } catch {
      /* 豆瓣偶尔写坏 JSON，跳过 */
    }
  }
  return null;
}

function cleanDescription(raw, { max = 150 } = {}) {
  let text = decodeEntities(raw || '')
    .replace(/^【[^】]*】\s*/, '')
    // 「肖申克的救赎豆瓣评分：9.7 简介：...」这类前缀
    .replace(/^.{0,30}豆瓣评分[:：]\s*[\d.]+\s*/, '')
    // 「专辑介绍：」「剧情简介：」「内容简介：」
    .replace(/^(?:简介|内容简介|剧情简介|专辑介绍|图书简介|影片简介)[:：]\s*/, '')
    .replace(/\.{3,}$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // og:description 常在半句处收尾，统一收在最近的标点上，避免「…登月的脚」这种断肢感。
  // 优先句末标点，退而求其次才用逗号，实在没有就补省略号。
  if (text.length > max || !/[。！？.!?]$/.test(text)) {
    const win = text.slice(0, max);
    const sentence = ['。', '！', '？', '!', '?'];
    const clause = ['；', '，', ';', ','];
    const pick = (stops) => stops.reduce((best, stop) => Math.max(best, win.lastIndexOf(stop)), -1);
    let cut = pick(sentence);
    if (cut < max * 0.4) cut = pick(clause);
    text = cut > max * 0.4 ? win.slice(0, cut + 1).trim() : `${win.trim()}…`;
  }
  return text;
}

function parseRating(html) {
  const m =
    html.match(/property="v:average"[^>]*>\s*([\d.]+)/) ||
    html.match(/class="rating_num"[^>]*>\s*([\d.]+)/) ||
    html.match(/ratingValue["'][^>]*content=["']([\d.]+)/) ||
    html.match(/"ratingValue"\s*:\s*"?([\d.]+)"?/);
  const value = m ? Number(m[1]) : 0;
  return Number.isFinite(value) ? value : 0;
}

export function parseBook(html) {
  const info = parseInfo(html);
  const ld = ldJson(html) || {};
  const authors = Array.isArray(ld.author)
    ? ld.author.map((a) => a?.name).filter(Boolean)
    : ld.author?.name
      ? [ld.author.name]
      : [];
  return {
    title: (meta(html, 'og:title') || ld.name || '').replace(/\s*-\s*图书\s*$/, ''),
    cover: meta(html, 'og:image') || '',
    description: cleanDescription(meta(html, 'og:description')),
    creator: firstOf(authors.join(' / ')) || firstOf(info['作者']),
    year: (String(info['出版年'] || '').match(/\d{4}/) || [])[0] || '',
    rating: parseRating(html),
    extra: {
      出版社: info['出版社'] || '',
      ISBN: info['ISBN'] || ld.isbn || '',
      页数: info['页数'] || '',
    },
  };
}

export function parseMusic(html) {
  const info = parseInfo(html);
  const ld = ldJson(html) || {};
  const artists = Array.isArray(ld.byArtist)
    ? ld.byArtist.map((a) => a?.name).filter(Boolean)
    : ld.byArtist?.name
      ? [ld.byArtist.name]
      : [];
  return {
    title: (meta(html, 'og:title') || ld.name || '').replace(/\s*-\s*音乐\s*$/, ''),
    cover: meta(html, 'og:image') || '',
    description: cleanDescription(meta(html, 'og:description')),
    creator:
      firstOf(artists.join(' / ')) || firstOf(info['表演者']) || firstOf(info['艺术家']),
    year:
      (String(info['发行时间'] || '').match(/\d{4}/) || [])[0] ||
      (String(ld.datePublished || '').match(/\d{4}/) || [])[0] ||
      '',
    rating: parseRating(html),
    extra: {
      流派: info['流派'] || '',
      专辑类型: info['专辑类型'] || '',
      介质: info['介质'] || '',
    },
  };
}

/** 电影：优先用摘要接口，页面只负责封面与简介 */
export function parseMoviePage(html) {
  const info = parseInfo(html);
  const ld = ldJson(html) || {};
  return {
    title: (meta(html, 'og:title') || '').replace(/\s*-\s*电影\s*$/, ''),
    cover: meta(html, 'og:image') || '',
    description: cleanDescription(meta(html, 'og:description')),
    creator: firstOf(info['导演']) || '',
    year:
      (String(info['上映日期'] || '').match(/\d{4}/) || [])[0] ||
      (String(ld.datePublished || '').match(/\d{4}/) || [])[0] ||
      '',
    rating: parseRating(html),
    extra: { 主演: firstOf(info['主演']), 类型: info['类型'] || '', 片长: info['片长'] || '' },
  };
}

function fromMovieAbstract(subject, page) {
  const rawTitle = String(subject.title || '').replace(/\s*[\u200e\u200f]?\s*\((\d{4})\)\s*$/, '').trim();
  const cleanTitle = String(subject.title || '')
    .replace(/\s*[\u200e\u200f]?\s*\((\d{4})\)\s*$/, '')
    .trim();
  // 「肖申克的救赎 The Shawshank Redemption」→ 中文名做标题，原名留在 extra
  const split = cleanTitle.match(/^([\u4e00-\u9fa5《》·、：:！？\-—\s]+?)\s+([A-Za-z0-9][\s\S]*)$/);
  const title = split ? split[1].trim() : cleanTitle || page?.title || '';
  const originalTitle = split ? split[2].trim() : '';
  return {
    title,
    cover: page?.cover || '',
    description: page?.description || cleanDescription(subject.short_comment?.content || ''),
    creator: firstOf((subject.directors || []).join(' / ')) || page?.creator || '',
    year: String(subject.release_year || page?.year || ''),
    rating: Number(subject.rate) || page?.rating || 0,
    extra: {
      原名: originalTitle,
      主演: (subject.actors || []).slice(0, 3).join(' / '),
      类型: (subject.types || []).join(' / '),
      片长: subject.duration || '',
      地区: subject.region || '',
    },
    _raw: rawTitle,
  };
}

/**
 * 主入口：传入任意含豆瓣链接的文本，返回结构化条目。
 */
export async function fetchDoubanItem(text, { forceKind = '' } = {}) {
  const found = extractDoubanUrl(text);
  if (!found) {
    throw new Error(
      '没找到豆瓣链接。支持 book / movie / music.douban.com 的 /subject/数字 链接，也可以直接粘一串条目 ID。'
    );
  }

  let kind = (found.kind || forceKind || '').toLowerCase();
  let page = null;
  let html = '';

  if (kind && kind !== 'movie') {
    const loaded = await loadPage(kind, found.id);
    html = loaded.html;
    page = kind === 'book' ? parseBook(html) : parseMusic(html);
    if (!page.title) throw new Error('页面里没解析出标题，豆瓣可能改版或返回了验证页。');
    return finalize(page, kind, found.id, loaded.fromCache);
  }

  // 电影：先试摘要接口（快且字段全），失败再退回移动版页面
  try {
    const { data, fromCache } = await fetchMovieAbstract(found.id);
    kind = 'movie';
    try {
      const loaded = await loadPage('movie', found.id);
      page = parseMoviePage(loaded.html);
    } catch {
      /* 封面/简介拿不到就先空着，不阻塞 */
    }
    const merged = fromMovieAbstract(data, page);
    if (!merged.title) throw new Error('摘要接口没返回标题');
    return finalize(merged, kind, found.id, fromCache);
  } catch (abstractError) {
    if (!kind) {
      throw new Error(
        `${abstractError.message}；又因为链接里没有 book./movie./music. 域名，判断不出类型。请贴完整链接。`
      );
    }
    const loaded = await loadPage(kind, found.id);
    page = parseMoviePage(loaded.html);
    if (!page.title) throw new Error(`${abstractError.message}，页面也没解析出标题。`);
    return finalize(page, kind, found.id, loaded.fromCache);
  }
}

function finalize(parsed, kind, id, fromCache) {
  return {
    ...parsed,
    kind,
    id,
    category: KIND_MAP[kind].category,
    label: KIND_MAP[kind].label,
    url: `https://${kind}.douban.com/subject/${id}/`,
    fromCache: !!fromCache,
    extra: Object.fromEntries(Object.entries(parsed.extra || {}).filter(([, v]) => v)),
  };
}

/** 下载封面到 public/images/uploads/douban/，返回站内路径 */
export async function downloadCover(coverUrl, slug) {
  if (!coverUrl) return '';
  const extMatch = coverUrl.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
  const rel = `/images/uploads/douban/${slug}.${ext}`;
  const dest = join(ROOT, 'public', rel);
  if (existsSync(dest)) return rel;

  const res = await fetch(coverUrl, {
    headers: {
      'User-Agent': UA,
      Referer: 'https://book.douban.com/',
      Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`封面下载失败 HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1024) throw new Error('封面文件过小，可能被防盗链拦了');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buffer);
  return rel;
}
