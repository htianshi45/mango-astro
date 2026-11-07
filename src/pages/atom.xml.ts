import { siteConfig } from '@/config/site';
import { getMixedFeed } from '@/utils/feed';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function momentTitle(text: string): string {
  const firstLine = text.split('\n').find((line) => line.trim()) || '';
  return (firstLine.replace(/[#*`\[\]>]/g, '').trim().slice(0, 24) || '一条说说') + ' · 说说';
}

export async function GET() {
  if (!siteConfig.feed.atom) {
    return new Response('Not Found', { status: 404 });
  }

  const feed = (await getMixedFeed()).filter(
    (entry) => entry.type === 'post' || siteConfig.feed.includeMoments
  );

  const entries = feed
    .map((entry) => {
      if (entry.type === 'post') {
        const post = entry.post;
        const link = new URL(`/posts/${post.slug}`, siteConfig.url).href;
        const summary = esc(post.data.description || post.data.title);
        const published = new Date(post.data.pubDate).toISOString();
        return [
          '<entry>',
          `<title>${esc(post.data.title)}</title>`,
          `<link href="${link}" />`,
          `<id>${link}</id>`,
          `<published>${published}</published>`,
          `<updated>${new Date(post.data.updatedDate || post.data.pubDate).toISOString()}</updated>`,
          `<summary type="html">${summary}</summary>`,
          (post.data.tags || []).map((tag) => `<category term="${esc(tag)}" />`).join(''),
          '</entry>',
        ].join('');
      }

      const link = new URL(`/moments/#moment-${entry.moment.id}`, siteConfig.url).href;
      const published = new Date(entry.moment.data.published).toISOString();
      return [
        '<entry>',
        `<title>${esc(momentTitle(entry.text))}</title>`,
        `<link href="${link}" />`,
        `<id>${link}</id>`,
        `<published>${published}</published>`,
        `<updated>${new Date(entry.moment.data.updatedDate || entry.moment.data.published).toISOString()}</updated>`,
        `<summary type="html">${esc(entry.text.slice(0, 200))}</summary>`,
        '<category term="说说" />',
        '</entry>',
      ].join('');
    })
    .join('\n  ');

  const updated = feed.length
    ? new Date(feed[0].timestamp).toISOString()
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
