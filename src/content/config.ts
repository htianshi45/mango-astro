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

export const collections = {
  'posts': postsCollection,
};
