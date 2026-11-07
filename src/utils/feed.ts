/**
 * 首页混合时间流
 *
 * 参考 Firefly 的「说说 / 文章都是内容流」思路：把 posts 与 moments
 * 归一成同一种 FeedEntry，再按发布时间合并。index.astro 与 page/[page].astro
 * 共用这一份排序结果，避免第一页和第二页顺序不一致。
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { siteConfig, isPageEnabled } from '@/config/site';
import { extractImages } from '@/utils/post-images';

export type PostEntry = CollectionEntry<'posts'>;
export type MomentEntry = CollectionEntry<'moments'>;

export type FeedEntry =
  | {
      type: 'post';
      timestamp: number;
      sticky: boolean;
      post: PostEntry;
      images: string[];
    }
  | {
      type: 'moment';
      timestamp: number;
      sticky: boolean;
      moment: MomentEntry;
      images: string[];
      /** 去掉图片语法后的纯文本，供说说卡片渲染 */
      text: string;
    };

function toTimestamp(value: Date | string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** 说说正文里把 Markdown 图片抽掉，剩下的文字（保留其它 Markdown 标记） */
export function stripImages(body: string): string {
  return body
    .replace(/!\[[^\]]*\]\(\s*[^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function getMixedFeed(): Promise<FeedEntry[]> {
  const [posts, moments] = await Promise.all([
    getCollection('posts', ({ data }) => data.draft !== true),
    // 首页可以在配置里关掉说说（说说独立成一级栏目 /moments 时用）；
    // 页面开关关闭时同理，否则会留下一堆指向 404 的说说卡片
    siteConfig.home.includeMoments && isPageEnabled('moments')
      ? getCollection('moments', ({ data }) => data.draft !== true)
      : Promise.resolve([] as MomentEntry[]),
  ]);

  const postEntries: FeedEntry[] = posts.map((post) => ({
    type: 'post',
    timestamp: toTimestamp(post.data.pubDate),
    sticky: (post.data.sticky ?? 0) > 0,
    post,
    images: extractImages(post.body),
  }));

  const momentEntries: FeedEntry[] = moments.map((moment) => ({
    type: 'moment',
    timestamp: toTimestamp(moment.data.published),
    sticky: moment.data.pinned === true,
    moment,
    images: extractImages(moment.body),
    text: stripImages(moment.body),
  }));

  const byTime = (a: FeedEntry, b: FeedEntry) => b.timestamp - a.timestamp;
  const all = [...postEntries, ...momentEntries];

  if (siteConfig.home.mixMode === 'alternate') {
    // 严格一比一交替：文章 / 说说各自按时间倒序，再轮流取；
    // 某一类取完后把另一类剩余项按时间追加，避免丢内容。
    const p = [...postEntries].sort(byTime);
    const m = [...momentEntries].sort(byTime);
    const interleaved: FeedEntry[] = [];
    const max = Math.max(p.length, m.length);
    for (let i = 0; i < max; i += 1) {
      if (p[i]) interleaved.push(p[i]);
      if (m[i]) interleaved.push(m[i]);
    }
    return stickyFirst(interleaved);
  }

  // timeline：纯按发布时间倒序；置顶项（文章 sticky / 说说 pinned）可选置顶
  return stickyFirst(all.sort(byTime));
}

function stickyFirst(entries: FeedEntry[]): FeedEntry[] {
  if (!siteConfig.home.stickyFirst) return entries;
  const pinned = entries.filter((entry) => entry.sticky).sort((a, b) => b.timestamp - a.timestamp);
  const rest = entries.filter((entry) => !entry.sticky);
  return [...pinned, ...rest];
}

/** 首页与 /page/N 共用的分页计算 */
export function paginateFeed(entries: FeedEntry[], page: number) {
  const perPage = siteConfig.postsPerPage;
  const totalPages = Math.max(1, Math.ceil(entries.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  return {
    entries: entries.slice(start, start + perPage),
    currentPage,
    totalPages,
    total: entries.length,
  };
}

/** 侧栏数据仍只取文章，保持热门文章小工具的语义 */
export function buildSidebarData(posts: PostEntry[]) {
  const tagCounts = new Map<string, number>();
  posts.forEach((post) => {
    post.data.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
  });
  const tags = Array.from(tagCounts.entries()).map(([name, count]) => ({ name, count }));
  const postData = posts.map((post) => ({
    title: post.data.title,
    slug: post.slug,
    timestamp: post.data.pubDate,
    views: post.data.views,
    heroImage: post.data.heroImage ?? extractImages(post.body)[0],
    excerpt: post.data.description,
  }));
  return { tags, postData };
}
