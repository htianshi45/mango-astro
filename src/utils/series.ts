import type { CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

export interface SeriesGroup {
  name: string;
  items: PostEntry[];
}

/**
 * 按 frontmatter 的 series 给文章分组（P2-13）。
 * 组内排序：先 seriesOrder（小→大），同序号按发布时间正序，正好是阅读顺序。
 */
export function groupSeries(posts: PostEntry[]): SeriesGroup[] {
  const map = new Map<string, PostEntry[]>();
  posts.forEach((post) => {
    const name = (post.data.series || '').trim();
    if (!name) return;
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(post);
  });

  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0) ||
        new Date(a.data.pubDate).getTime() - new Date(b.data.pubDate).getTime()
    );
  }

  return Array.from(map.entries())
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, 'zh-CN'));
}
