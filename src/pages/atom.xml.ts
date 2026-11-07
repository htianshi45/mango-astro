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
  if (!siteConfig.feed.atom) {
    return new Response('Not Found', { status: 404 });
  }

  const posts = (
    await getCollection('posts', ({ data }) => data.draft !== true)
  ).sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime());

  const entries = posts
    .map((post) => {
      const link = new URL(`/posts/${post.slug}`, siteConfig.url).href;
      const summary = esc(post.data.description || post.data.title);
      return [
        '<entry>',
        `<title>${esc(post.data.title)}</title>`,
        `<link href="${link}" />`,
        `<id>${link}</id>`,
        `<published>${new Date(post.data.pubDate).toISOString()}</published>`,
        `<updated>${new Date(post.data.updatedDate || post.data.pubDate).toISOString()}</updated>`,
        `<summary type="html">${summary}</summary>`,
        (post.data.tags || []).map((tag) => `<category term="${esc(tag)}" />`).join(''),
        '</entry>',
      ].join('');
    })
    .join('\n  ');

  const updated = posts.length
    ? new Date(posts[0].data.pubDate).toISOString()
    : new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-CN">
  <title>${esc(siteConfig.name)}</title>
  <subtitle>${esc(siteConfig.description)}</subtitle>
  <link href="${esc(siteConfig.url)}" />
  <link href="${new URL('/atom.xml', siteConfig.url).href}" rel="self" type="application/atom+xml" />
  <id>${esc(siteConfig.url)}/</id>
  <updated>${updated}</updated>
  <author><name>${esc(siteConfig.author)}</name></author>
  ${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
