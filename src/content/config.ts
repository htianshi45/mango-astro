import { z, defineCollection } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    images: z.array(z.string()).optional().default([]),
    author: z.string().default('Mango'),
    avatar: z.string().default('/images/default-avatar.svg'),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional(),
    sticky: z.number().optional().default(0),
    views: z.number().optional().default(0),
    comments: z.number().optional().default(0),
    likes: z.number().optional().default(0),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = {
  'posts': postsCollection,
};
