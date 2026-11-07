import { getCollection } from 'astro:content';
import { siteConfig } from '@/config/site';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  if (!siteConfig.feed.rss) {
    return new Response('Not Found', { status: 404 });
  }

  const posts = (
    await getCollection('posts', ({ data }) => data.draft !== true)
  ).sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime());

  const items = posts
    .map((post) => {
      const link = new URL(`/posts/${post.slug}`, siteConfig.url).href;
      const description = esc(post.data.description || '');
      const categories = (post.data.tags || [])
        .map((tag) => `<category>${esc(tag)}</category>`)
        .join('');
      const content = siteConfig.feed.fullContent
        ? `<content:encoded><![CDATA[${post.body}]]></content:encoded>`
        : '';
      return [
        '<item>',
        `<title>${esc(post.data.title)}</title>`,
        `<link>${link}</link>`,
        `<guid isPermaLink="true">${link}</guid>`,
        `<pubDate>${new Date(post.data.pubDate).toUTCString()}</pubDate>`,
        `<description>${description}</description>`,
        categories,
        content,
        '</item>',
      ].join('');
    })
    .join('\n  ');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(siteConfig.name)}</title>
    <link>${esc(siteConfig.url)}</link>
    <description>${esc(siteConfig.description)}</description>
    <language>${siteConfig.locale.replace('_', '-').toLowerCase()}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${new URL('/rss.xml', siteConfig.url).href}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
