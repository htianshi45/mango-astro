import { getCollection } from 'astro:content';
import { pageToggles, siteConfig } from '@/config/site';

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

  const totalPages = Math.ceil(posts.length / siteConfig.postsPerPage);
  for (let page = 2; page <= totalPages; page += 1) {
    staticPaths.push(`/page/${page}`);
  }

  const paths = [
    ...staticPaths,
    ...posts.map((post) => `/posts/${post.slug}`),
    ...Array.from(tags).map((tag) => `/tags/${encodeURIComponent(tag)}`),
    ...Array.from(categories).map((category) => `/categories/${encodeURIComponent(category)}`),
  ];

  const entries = paths
    .map((path) => {
      const loc = esc(new URL(path, siteConfig.url).href);
      const isHome = path === '/';
      const changefreq = isHome ? 'daily' : 'monthly';
      const priority = isHome ? '1.0' : path.startsWith('/posts/') ? '0.8' : '0.5';
      return `<url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
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
