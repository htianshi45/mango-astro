import { z, defineCollection } from 'astro:content';

// CMS 未填日期时会写成空字符串，空串不能直接 coerce 成 Date。
const optionalDate = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce.date().optional()
);

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: optionalDate,
    heroImage: z.string().optional(),
    images: z.array(z.string()).optional().default([]),
    author: z.string().default('Mango'),
    avatar: z.string().default('/images/default-avatar.svg'),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional(),
    sticky: z.number().optional().default(0),
    views: z.number().optional().default(0),
    likes: z.number().optional().default(0),
    draft: z.boolean().optional().default(false),
  }),
});

/**
 * 说说（Moment）— 参考 Firefly 的 content/dynamic：
 * 一条短内容 + 可选图片 + 地点 + 置顶，正文用 Markdown。
 * 与文章共用首页时间流，但独立归档页 /moments/。
 */
const momentsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    published: z.coerce.date(),
    updatedDate: optionalDate,
    pinned: z.boolean().optional().default(false),
    location: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    author: z.string().optional().default('Mango'),
    avatar: z.string().optional().default('/images/default-avatar.svg'),
    draft: z.boolean().optional().default(false),
  }),
});

/**
 * 收藏条目 — 参考 Firefly 番剧页的「分类 + 状态 + 评分 + 进度」模型，
 * 一个 collection 驱动收藏夹 / 书架 / 片库 / 音乐库四个页面。
 * 正文写短评（Markdown），frontmatter 全结构化。
 */
const favoritesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['bookmarks', 'books', 'movies', 'music']),
    cover: z.string().optional().default(''),
    description: z.string().optional().default(''),
    /** 状态键，取值由 src/config/favorites.ts 里各分类的 statuses 定义 */
    status: z.string().optional().default('done'),
    /** 0–10 分，0 表示未评分 */
    rating: z.number().min(0).max(10).optional().default(0),
    /** 0–100，用于书籍阅读页数 / 剧集进度 */
    progress: z.number().min(0).max(100).optional().default(0),
    url: z.string().optional().default(''),
    /** 作者 / 导演 / 歌手 / 站点 */
    creator: z.string().optional().default(''),
    year: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    addedAt: z.coerce.date(),
    weight: z.number().optional().default(0),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = {
  'posts': postsCollection,
  'moments': momentsCollection,
  'favorites': favoritesCollection,
};
