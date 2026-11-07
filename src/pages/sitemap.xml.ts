import { getCollection } from 'astro:content';
import { favoriteCategories } from '@/config/favorites';
import { pageToggles, siteConfig } from '@/config/site';
import { getMixedFeed, momentSlug } from '@/utils/feed';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  if (!siteConfig.feed.sitemap) {
    return new Response('Not Found', { status: 404 });
  }

  const posts = await getCollection('posts', ({ data }) => data.draft !== true);
  const moments = await getCollection('moments', ({ data }) => data.draft !== true);
  const tags = new Set<string>();
  const categories = new Set<string>();
  posts.forEach((post) => {
    (post.data.tags || []).forEach((tag) => tags.add(tag));
    if (post.data.category) categories.add(post.data.category);
  });

  const staticPaths = ['/', '/about'];
  if (pageToggles.search) staticPaths.push('/search');
  if (pageToggles.tags) staticPaths.push('/tags');
  if (pageToggles.archive) staticPaths.push('/archive');
  if (pageToggles.download) staticPaths.push('/download');
  if (pageToggles.map) staticPaths.push('/map');
  if (pageToggles.moments) staticPaths.push('/moments');
  if (pageToggles.bookmarks) staticPaths.push('/bookmarks');
  if (pageToggles.favorites) {
    staticPaths.push('/favorites');
    favoriteCategories.forEach((meta) => staticPaths.push(`/favorites/${meta.id}`));
  }

  // 分页页数按「文章 + 说说」的混合流计算，与首页 /page/N 一致
  const feed = await getMixedFeed();
  const totalPages = Math.ceil(feed.length / siteConfig.postsPerPage);
  for (let page = 2; page <= totalPages; page += 1) {
    staticPaths.push(`/page/${page}`);
  }

  /**
   * lastmod：只给「内容确实由文章驱动」的 URL 标注，静态页（关于/收藏/导航等）
   * 没有可信的更新时间，宁可留空也不要编一个构建日期，否则会误导爬虫反复重抓。
   * 日期用 W3C date（YYYY-MM-DD），符合 sitemaps.org 规范。
   */
  const day = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
  const lastmodByPath = new Map<string, string>();
  const postDay = (post: (typeof posts)[number]) =>
    day(post.data.updatedDate ?? post.data.pubDate);

  posts.forEach((post) => {
    const d = postDay(post);
    lastmodByPath.set(`/posts/${post.slug}`, d);
    (post.data.tags || []).forEach((tag) => {
      const key = `/tags/${encodeURIComponent(tag)}`;
      if (!lastmodByPath.has(key) || lastmodByPath.get(key)! < d) lastmodByPath.set(key, d);
    });
    if (post.data.category) {
      const key = `/categories/${encodeURIComponent(post.data.category)}`;
      if (!lastmodByPath.has(key) || lastmodByPath.get(key)! < d) lastmodByPath.set(key, d);
    }
  });

  // 说说详情页（P1-6）也要进 sitemap，否则新页面只能靠内链被发现
  moments.forEach((moment) => {
    lastmodByPath.set(`/moments/${momentSlug(moment.id)}`, day(moment.data.published));
  });

  // 首页、归档、分页与最近文章列表同源，用全站最新一篇文章的日期
  if (posts.length > 0) {
    const latest = posts.reduce(
      (max, post) => (postDay(post) > max ? postDay(post) : max),
      postDay(posts[0])
    );
    ['/', '/archive', ...Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => `/page/${i + 2}`)].forEach(
      (path) => lastmodByPath.set(path, latest)
    );
  }

  const paths = [
    ...staticPaths,
    ...posts.map((post) => `/posts/${post.slug}`),
    ...moments.map((moment) => `/moments/${momentSlug(moment.id)}`),
    ...Array.from(tags).map((tag) => `/tags/${encodeURIComponent(tag)}`),
    ...Array.from(categories).map((category) => `/categories/${encodeURIComponent(category)}`),
  ];

  const entries = paths
    .map((path) => {
      const loc = esc(new URL(path, siteConfig.url).href);
      const isHome = path === '/';
      const changefreq = isHome ? 'daily' : 'monthly';
      const priority = isHome ? '1.0' : path.startsWith('/posts/') ? '0.8' : '0.5';
      const lastmod = lastmodByPath.get(path);
      return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
    })
    .join('\n  ');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${entries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
