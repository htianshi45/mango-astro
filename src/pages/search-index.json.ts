import { getCollection } from 'astro:content';

/**
 * 搜索索引 endpoint（P0-7）
 *
 * 之前索引通过 <script define:vars> 内联进 /search 的 HTML，
 * 每个访客都要重复下载、且无法单独缓存。改为独立 JSON 后：
 *   - 页面 HTML 从 ~26KB 降到 ~8KB
 *   - 索引可被浏览器/CDN 缓存，搜索页多次访问零传输
 *   - 后续接 Pagefind 或扩到说说/收藏时，只需改这一处数据出口
 *
 * 安全：只输出展示所需的公开字段，绝不把 post.body / draft 内容写进索引。
 */
export async function GET() {
  const posts = await getCollection('posts', ({ data }) => data.draft !== true);

  const index = posts
    .sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime())
    .map((post) => ({
      title: post.data.title,
      slug: post.slug,
      description: post.data.description || '',
      tags: post.data.tags || [],
      category: post.data.category || '',
      date: new Date(post.data.pubDate).toISOString().slice(0, 10),
    }));

  return new Response(JSON.stringify({ posts: index }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
