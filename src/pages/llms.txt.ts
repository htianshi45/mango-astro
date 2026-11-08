import { getCollection } from 'astro:content';
import { siteConfig } from '@/config/site';
import { momentSlug } from '@/utils/feed';

/**
 * llms.txt（P2-19）
 *
 * 给 AI 爬虫/助手一份站点结构说明：比 sitemap 多一层语义（标题 + 摘要），
 * 比让爬虫去解析整页 HTML 更省 token。规范：H1 站名 > blockquote 摘要 > H2 分组 + 链接列表。
 */
export async function GET() {
  const url = (path) => new URL(path, siteConfig.url).href;
  const posts = (await getCollection('posts', ({ data }) => data.draft !== true))
    .sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime());
  const moments = (await getCollection('moments', ({ data }) => data.draft !== true))
    .sort((a, b) => new Date(b.data.published).getTime() - new Date(a.data.published).getTime());

  const lines = [
    `# ${siteConfig.name}`,
    '',
    `> ${siteConfig.description}。内容以摄影、数码、生活记录为主，含说说、收藏与书签导航。`,
    '',
    '## 文章',
    '',
    ...posts.map((post) =>
      `- [${post.data.title}](${url(`/posts/${post.slug}`)})${post.data.description ? `: ${post.data.description}` : ''}`
    ),
    '',
    '## 说说',
    '',
    ...moments.map((moment) =>
      `- [说说 · ${new Date(moment.data.published).toISOString().slice(0, 10)}](${url(`/moments/${momentSlug(moment.id)}`)})`
    ),
    '',
    '## 主要页面',
    '',
    `- [文章归档](${url('/archive')}): 按年份列出全部文章`,
    `- [标签云](${url('/tags')}): 全站标签索引`,
    `- [说说](${url('/moments')}): 朋友圈式短内容与图片`,
    `- [收藏夹](${url('/favorites')}): 书 / 电影 / 音乐 / 网址四个库`,
    `- [书签导航](${url('/bookmarks')}): 常用站点分组导航`,
    `- [搜索](${url('/search')}): 站内全文检索`,
    `- [关于](${url('/about')}): 作者介绍`,
    '',
    '## 订阅',
    '',
    `- [RSS](${url('/rss.xml')})`,
    `- [Atom](${url('/atom.xml')})`,
    `- [Sitemap](${url('/sitemap.xml')})`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
