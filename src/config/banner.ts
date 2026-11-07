export interface BannerItem {
  title: string;
  image: string;
  url?: string;
  sticky?: boolean;
}

export const banners: BannerItem[] = [
  {
    title: '干净通透的沉浸式工作台[文章分页效果]',
    image: '/images/banner-1.jpg',
    url: '/posts/welcome',
    sticky: true,
  },
  {
    title: '也许是最实用的万兆 NAS 超长文分页',
    image: '/images/banner-2.jpg',
    url: '/posts/my-first-photos',
    sticky: true,
  },
];
