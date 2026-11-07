/**
 * 收藏配置 — 参考 Firefly 番剧页（bangumi.astro + BangumiGrid.svelte）
 *
 * Firefly 是构建时从 Bangumi API 拉数据、按 subject_type 分 Tab；
 * 这里改成「本地 Markdown 数据 + 分类元数据驱动」，好处是：
 *   - 不依赖第三方 API，构建稳定；
 *   - 四个库共用一套卡片/筛选/统计逻辑；
 *   - 可以直接在 Sveltia CMS 后台增删条目。
 *
 * 新增分类只需在这里加一项，并在 src/pages/favorites/[category].astro 的
 * getStaticPaths 会自动从 favoriteCategories 生成路由。
 */

export type FavoriteCategory = 'bookmarks' | 'books' | 'movies' | 'music';

export interface FavoriteStatus {
  key: string;
  label: string;
}

export interface FavoriteCategoryMeta {
  id: FavoriteCategory;
  name: string;
  icon: string;
  desc: string;
  /** 卡片强调色（hex），用于徽标、进度条与悬停描边 */
  accent: string;
  /** 封面宽高比，书/电影用 2:3，专辑/网页用 1:1 */
  coverRatio: '2 / 3' | '1 / 1';
  /** 单个条目的称呼，用于页头统计，如「本」「部」 */
  unit: string;
  statuses: FavoriteStatus[];
  /** 该分类是否展示进度条 */
  showProgress: boolean;
}

export const favoritePageConfig = {
  title: '我的收藏',
  description: '读过、看过、听过的，还有那些想留着以后慢慢翻的东西。',
};

export const favoriteCategories: FavoriteCategoryMeta[] = [
  {
    id: 'bookmarks',
    name: '收藏夹',
    icon: 'bi-bookmark-star',
    desc: '收藏的网页、文章与长帖',
    accent: '#4270f5',
    coverRatio: '1 / 1',
    unit: '条',
    showProgress: false,
    statuses: [
      { key: 'wish', label: '待读' },
      { key: 'doing', label: '在读' },
      { key: 'done', label: '已读' },
      { key: 'favorite', label: '精选' },
    ],
  },
  {
    id: 'books',
    name: '书架',
    icon: 'bi-book',
    desc: '书架上的书，和正在读的那几本',
    accent: '#c78a3b',
    coverRatio: '2 / 3',
    unit: '本',
    showProgress: true,
    statuses: [
      { key: 'wish', label: '想读' },
      { key: 'doing', label: '在读' },
      { key: 'done', label: '读过' },
      { key: 'favorite', label: '最爱' },
    ],
  },
  {
    id: 'movies',
    name: '片库',
    icon: 'bi-film',
    desc: '电影、剧集与纪录片',
    accent: '#a9559b',
    coverRatio: '2 / 3',
    unit: '部',
    showProgress: true,
    statuses: [
      { key: 'wish', label: '想看' },
      { key: 'doing', label: '在看' },
      { key: 'done', label: '看过' },
      { key: 'favorite', label: '最爱' },
    ],
  },
  {
    id: 'music',
    name: '音乐库',
    icon: 'bi-music-note-beamed',
    desc: '专辑、单曲与循环了一整天的歌单',
    accent: '#2f9e79',
    coverRatio: '1 / 1',
    unit: '张',
    showProgress: false,
    statuses: [
      { key: 'wish', label: '想听' },
      { key: 'doing', label: '在听' },
      { key: 'done', label: '听过' },
      { key: 'favorite', label: '循环' },
    ],
  },
];

export function getCategoryMeta(id: string): FavoriteCategoryMeta | undefined {
  return favoriteCategories.find((category) => category.id === id);
}

export function getStatusLabel(category: FavoriteCategoryMeta, key: string): string {
  return category.statuses.find((status) => status.key === key)?.label ?? key;
}
