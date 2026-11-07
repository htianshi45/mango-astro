/**
 * Mango Astro · 统一站点配置
 *
 * 参考 Firefly 的「配置驱动 + 页面开关」思路，收敛为单文件：
 * 站名、Logo、描述、备案号、导航、页脚、功能开关都只在这里改。
 * 关闭某个页面开关时，对应的导航项 / 页脚链接会自动隐藏，
 * 可选页面本身会 rewrite 到 404，sitemap 也会同步排除。
 *
 * 注意：修改 site.url 时，必须同步修改 astro.config.mjs 的 site，
 * 否则 canonical、RSS、sitemap 里的绝对链接会不一致。
 */

export type PageKey =
  | 'download'
  | 'map'
  | 'archive'
  | 'tags'
  | 'search'
  | 'moments'
  | 'bookmarks'
  | 'favorites';

export interface NavItem {
  name: string;
  href: string;
  /** Bootstrap Icons 类名，例如 bi-house */
  icon?: string;
  page?: PageKey;
  /** 外链：新窗口打开并加 noopener */
  external?: boolean;
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
  moments: true,
  bookmarks: true,
  favorites: true,
};

export function isPageEnabled(key?: PageKey): boolean {
  return key ? pageToggles[key] !== false : true;
}

/** 递归过滤：子菜单同样受页面开关控制；分组若无可用子项则整组隐藏 */
export function visibleNavItems(items: NavItem[]): NavItem[] {
  return items
    .filter((item) => isPageEnabled(item.page))
    .map((item) => {
      if (!item.children?.length) return item;
      const children = visibleNavItems(item.children);
      return children.length ? { ...item, children } : null;
    })
    .filter((item): item is NavItem => item !== null);
}

export function visibleFooterLinks(items: FooterLink[]): FooterLink[] {
  return items.filter((item) => isPageEnabled(item.page));
}

/** 判断某个导航项（含其子项）是否命中当前路径，用于父级高亮 */
export function isNavActive(item: NavItem, pathname: string): boolean {
  const normalize = (path: string) => path.replace(/\/+$/, '') || '/';
  const current = normalize(pathname);
  const self = normalize(item.href);
  if (self !== '#' && (current === self || (self !== '/' && current.startsWith(`${self}/`)))) {
    return true;
  }
  return (item.children || []).some((child) => isNavActive(child, pathname));
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
  keywords: ['Mango', 'Astro', '图片博客', '摄影', '朋友圈', '说说', '书签'],
  /** 备案号：留空则不渲染页脚那一行，避免占位文案上线 */
  icp: '',
  locale: 'zh_CN',

  /**
   * 导航：参考 Firefly 的「分组下拉」结构。
   * href 为 '#' 表示只作为下拉父级；children 里每项同样可带 page 开关。
   */
  navItems: [
    { name: '主页', href: '/', icon: 'bi-house' },
    {
      name: '文章',
      href: '#',
      icon: 'bi-journal-text',
      children: [
        { name: '文章归档', href: '/archive', icon: 'bi-archive', page: 'archive' },
        { name: '标签云', href: '/tags', icon: 'bi-tags', page: 'tags' },
        { name: '说说', href: '/moments', icon: 'bi-chat-square-dots', page: 'moments' },
        { name: '站内搜索', href: '/search', icon: 'bi-search', page: 'search' },
      ],
    },
    {
      name: '发现',
      href: '#',
      icon: 'bi-compass',
      children: [
        { name: '书签导航', href: '/bookmarks', icon: 'bi-bookmarks', page: 'bookmarks' },
        { name: '收藏总览', href: '/favorites', icon: 'bi-stars', page: 'favorites' },
        { name: '收藏夹', href: '/favorites/bookmarks', icon: 'bi-bookmark-star', page: 'favorites' },
        { name: '书架', href: '/favorites/books', icon: 'bi-book', page: 'favorites' },
        { name: '片库', href: '/favorites/movies', icon: 'bi-film', page: 'favorites' },
        { name: '音乐库', href: '/favorites/music', icon: 'bi-music-note-beamed', page: 'favorites' },
      ],
    },
    {
      name: '我的',
      href: '#',
      icon: 'bi-person',
      children: [
        { name: '关于我', href: '/about', icon: 'bi-info-circle' },
        { name: '主题下载', href: '/download', icon: 'bi-download', page: 'download' },
        { name: '旅游地图', href: '/map', icon: 'bi-geo-alt', page: 'map' },
      ],
    },
  ] as NavItem[],

  footerLinks: [
    { name: '关于我们', href: '/about' },
    { name: '说说', href: '/moments', page: 'moments' },
    { name: '书签导航', href: '/bookmarks', page: 'bookmarks' },
    { name: '我的收藏', href: '/favorites', page: 'favorites' },
    { name: '标签云', href: '/tags', page: 'tags' },
    { name: '文章归档', href: '/archive', page: 'archive' },
    { name: '主题下载', href: '/download', page: 'download' },
    { name: '旅游地图', href: '/map', page: 'map' },
  ] as FooterLink[],

  pages: pageToggles,

  /** 首页与分页每页条目数（首页混合流里「文章 + 说说」一起计数） */
  postsPerPage: 8,

  /** 首页混合时间流 */
  home: {
    /**
     * timeline  = 文章与说说严格按发布时间倒序合并（默认，更贴近「按发布时间」）
     * alternate = 文章 / 说说强制一比一交替，同类型内部仍按时间倒序
     */
    mixMode: 'timeline' as 'timeline' | 'alternate',
    /** 是否在卡片上显示「文章 / 说说」类型徽标 */
    showTypeBadge: true,
    /**
     * 置顶文章 / 置顶说说是否插队到最前。
     * 默认 false：严格按发布时间交替，置顶只用徽标体现；
     * 设为 true 会让置顶项集中排在最前，时间流会被打断。
     */
    stickyFirst: false,
  },

  /** 说说归档页每页条数 */
  momentsPerPage: 20,

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
    /** 是否把说说也写进 RSS / Atom（默认只订阅文章） */
    includeMoments: false,
  },
};
