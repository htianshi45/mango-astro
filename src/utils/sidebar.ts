/**
 * 侧栏数据聚合
 *
 * 首页 / 分页 / 文章详情 / 归档 / 标签 / 说说 都复用同一份侧栏数据，
 * 避免每个页面各写一遍 getCollection + buildSidebarData。
 */
import { getCollection } from 'astro:content';
import { buildSidebarData } from '@/utils/feed';

export type SidebarData = ReturnType<typeof buildSidebarData>;

export async function getSidebarData(): Promise<SidebarData> {
  const posts = await getCollection('posts', ({ data }) => data.draft !== true);
  return buildSidebarData(posts);
}
