/**
 * Mango Astro · 统一站点配置
 *
 * 参考 Firefly 的「配置驱动 + 页面开关」思路，收敛为单文件：
 * 站名、Logo、描述、备案号、导航、页脚、功能开关都只在这里改。
 * 关闭某个页面开关时，对应的导航项 / 页脚链接会自动隐藏，
 * 可选页面（download / map）本身会 rewrite 到 404。
 *
 * 注意：修改 site.url 时，必须同步修改 astro.config.mjs 的 site，
 * 否则 canonical、RSS、sitemap 里的绝对链接会不一致。
 */

export type PageKey = 'download' | 'map' | 'archive' | 'tags' | 'search';

export interface NavItem {
  name: string;
  href: string;
  icon?: string;
  page?: PageKey;
  children?: NavItem[];
}

export interface FooterLink {
  name: string;
  href: string;
  page?: PageKey;
}

/** 页面开关：false 会隐藏导航/页脚入口，并让对应模板页返回 404 */
export const pageToggles: Record<PageKey, boolean> = {
  download: true,
  map: true,
  archive: true,
  tags: true,
  search: true,
};

export function isPageEnabled(key?: PageKey): boolean {
  return key ? pageToggles[key] !== false : true;
}

export function visibleNavItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => isPageEnabled(item.page));
}

export function visibleFooterLinks(items: FooterLink[]): FooterLink[] {
  return items.filter((item) => isPageEnabled(item.page));
}

export const siteConfig = {
  /** 站名：显示在 Logo 旁、页脚版权、RSS 标题 */
  name: 'Mango',
  /** Logo：public 下的绝对路径 */
  logo: '/images/logo.svg',
  /** 站点描述：meta description 与 RSS 摘要 */
  description: 'Mango - 微信朋友圈风格图片博客',
  /** 站点正式地址（当前 Cloudflare Pages 分配域名） */
  url: 'https://mango-astro.pages.dev',
  author: 'Mango',
  avatar: '/images/default-avatar.svg',
  keywords: ['Mango', 'Astro', '图片博客', '摄影', '朋友圈'],
  /** 备案号：留空则不渲染页脚那一行，避免占位文案上线 */
  icp: '',
  locale: 'zh_CN',

  navItems: [
    { name: '风景', href: '/categories/风景' },
    { name: '旅拍', href: '/categories/旅拍', icon: 'bi-palette' },
    {
      name: '科技',
      href: '/categories/科技',
      children: [
        { name: '数码', href: '/categories/数码' },
        { name: '软件', href: '/categories/软件' },
      ],
    },
    { name: '主题下载', href: '/download', page: 'download' },
    { name: '旅游地图', href: '/map', page: 'map' },
  ] as NavItem[],

  footerLinks: [
    { name: '关于我们', href: '/about' },
    { name: '标签云', href: '/tags', page: 'tags' },
    { name: '文章归档', href: '/archive', page: 'archive' },
    { name: '主题下载', href: '/download', page: 'download' },
    { name: '旅游地图', href: '/map', page: 'map' },
  ] as FooterLink[],

  pages: pageToggles,

  /** 首页与分页每页文章数（两处共用，避免像原来那样各写一遍 8） */
  postsPerPage: 8,

  /** 文章页功能开关：全部可一键关闭，关掉后不渲染任何 DOM */
  features: {
    toc: true,
    readingProgress: true,
    wordCount: true,
    readingTime: true,
    postNavigation: true,
    share: true,
    relatedPosts: true,
  },

  /** 订阅与站点地图 */
  feed: {
    rss: true,
    atom: true,
    sitemap: true,
    /** true = RSS 里带 Markdown 全文；false = 只带摘要，体积更小 */
    fullContent: false,
  },
};
