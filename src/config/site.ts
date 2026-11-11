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
 *
 * 导航栏数据单独放在 src/data/navigation.json：
 * 它由 Sveltia CMS 的「站点设置 → 导航栏」直接编辑，避免 CMS 去改 .ts 源码。
 */
import navigationData from '../data/navigation.json';

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

export interface ProfileLink {
  name: string;
  url: string;
  /** Bootstrap Icons 类名 */
  icon: string;
  /** true = 按钮带文字；false = 只显示图标 */
  showName?: boolean;
}

/**
 * 版心宽度
 *
 * baseWidth  = 单人阅读版心（文章页、关于页等单栏页面）
 * wideWidth  = 主栏 + 边栏的总宽（首页 / 分页 / 分类页）
 *
 * 三栏比例 3:1 且「边栏绝对宽度不变」的推导：
 *   旧版心 900 - 左右内边距 32 = 868；列间距 24 → 可用 844；侧栏 = 844 × 4/12 ≈ 281
 *   侧栏锁定 281 → 主栏 = 281 × 3 = 844 → 总宽 = 844 + 24 + 281 + 32 ≈ 1181
 * 所以 wideWidth 取 1180，主栏 844 / 侧栏 281，正好 3:1。
 */
export const layout = {
  baseWidth: 900,
  wideWidth: 1180,
  /** 主栏与边栏之间的间距（px），与 Tailwind 的 gap-6 保持一致 */
  gap: 24,
  /** 侧栏在宽版下的固定宽度（px），改这个值要同步改 wideWidth */
  sidebarWidth: 281,
};


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
  /** 站点默认社交分享大图（1200×630，由 npm run og 生成） */
  ogImage: '/og/home.jpg',
  /** Logo：public 下的绝对路径 */
  logo: '/images/logo.svg',
  /** 站点描述：meta description 与 RSS 摘要 */
  description: 'Mango - 微信朋友圈风格图片博客',
  /** 站点正式地址（Cloudflare Pages 分配域名，2026-11 迁到 Git 集成项目后改用 Git 项目名） */
  url: 'https://mango-astro-git.pages.dev',
  author: 'Mango',
  avatar: '/images/default-avatar.svg',
  keywords: ['Mango', 'Astro', '图片博客', '摄影', '朋友圈', '说说', '书签'],
  /** 备案号：留空则不渲染页脚那一行，避免占位文案上线 */
  icp: '',
  locale: 'zh_CN',

  /**
   * 作者信息卡 — 参考 Firefly 的 config/profileConfig.ts
   * 头像不再是小圆点，而是整块大图（点击进关于页），下面是姓名 / 简介 / 社交按钮。
   * links 里的 icon 用 Bootstrap Icons 类名（本站已内置该字体）。
   */
  profile: {
    name: 'Mango',
    avatar: '/images/default-avatar.svg',
    link: '/about',
    bio: '一个爱拍照、爱折腾博客的人',
    /** showName: true 时按钮显示文字，false 时只显示图标 */
    links: [
      { name: 'GitHub', url: 'https://github.com/htianshi45', icon: 'bi-github', showName: false },
      { name: 'RSS', url: '/rss.xml', icon: 'bi-rss', showName: false },
      { name: '关于我', url: '/about', icon: 'bi-person-badge', showName: true },
    ] as ProfileLink[],
  },

  /**
   * 导航：参考 Firefly 的「分组下拉」结构。
   * href 为 '#' 表示只作为下拉父级；children 里每项同样可带 page 开关。
   *
   * 数据源：src/data/navigation.json（后台「站点设置 → 导航栏」可可视化编辑）。
   * 改完不用动这个文件，TS 类型在下面用 as NavItem[] 兜住。
   */
  navItems: navigationData.items as unknown as NavItem[],

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

  /**
   * 文章列表卡片布局 — 参考 Firefly 的 siteConfig.postListLayout
   *
   * 卡片形态：
   *   list  = 横向图文卡，封面在右（默认，Firefly 的列表态）
   *   grid  = 竖向卡，封面在上，两列并排
   * 其余开关控制元信息长什么样，卡片本身不用改。
   */
  postListLayout: {
    mode: 'list' as 'list' | 'grid',
    /** 封面放下侧（'right'）还是放在左侧（'left'） */
    coverSide: 'right' as 'right' | 'left',
    /** 列表卡片是否显示封面图（2026-11-08 起关闭：纯文字卡片更干净） */
    showCover: false,
    /** 封面占卡片宽度的百分比（showCover 为 false 时不生效） */
    coverWidth: '30%',
    /** 摘要行数，0 = 不截断 */
    descriptionLines: 2,
    /** 元信息行：日期 / 分类 / 标签 / 字数 / 阅读时长 */
    meta: {
      showPublished: true,
      showCategory: true,
      showTags: true,
      /** 标签最多显示几个，0 = 全部 */
      tagCount: 2,
      showWords: false,
      showReadingTime: false,
    },
    /** 底部统计行：浏览 / 点赞 */
    showViews: true,
    showLikes: true,
    /** 标签放在元信息行（'meta'）还是卡片底部（'bottom'） */
    tagsPosition: 'meta' as 'meta' | 'bottom',
  },

  /**
   * 侧栏音乐播放器 — 参考 Firefly 的 config/musicConfig.ts
   * 实际播放列表在 src/config/music.ts 里维护，这里只放行为开关。
   */
  music: {
    enabled: true,
    /** 侧栏组件标题 */
    title: '正在听',
    /** 默认音量 0-1 */
    volume: 0.6,
    /** 播放模式：list 列表循环 / one 单曲循环 / random 随机 */
    playMode: 'list' as 'list' | 'one' | 'random',
    /** 是否把播放状态记到 localStorage（刷新后续播） */
    remember: true,
  },

  /** 首页混合时间流 */
  home: {
    /**
     * 首页是否把「说说」混进文章流。
     * false（默认）= 首页只放文章，说说独立成一级栏目 /moments；
     * true = 文章与说说按发布时间混排（旧行为）。
     */
    includeMoments: false,
    /**
     * timeline  = 文章与说说严格按发布时间倒序合并（includeMoments 为 true 时生效）
     * alternate = 文章 / 说说强制一比一交替，同类型内部仍按时间倒序
     */
    mixMode: 'timeline' as 'timeline' | 'alternate',
    /** 是否在卡片上显示「文章 / 说说」类型徽标（只有混排时才有意义） */
    showTypeBadge: true,
    /**
     * 置顶文章 / 置顶说说是否插队到最前。
     * 默认 false：严格按发布时间交替，置顶只用徽标体现；
     * 设为 true 会让置顶项集中排在最前，时间流会被打断。
     */
    stickyFirst: false,
  },

  /**
   * 评论（P1-1）：giscus 基于 GitHub Discussions，零后端。
   * 启用步骤：① 把仓库设为 Public ② 在仓库 Settings 打开 Discussions
   * ③ 安装 https://github.com/apps/giscus ④ 到 https://giscus.app 生成
   *    repo / repoId / category / categoryId 四项填到下面 ⑤ enabled: true
   * 未启用时组件不渲染任何 DOM，也不加载第三方脚本。
   */
  comments: {
    enabled: true,
    provider: 'giscus' as 'giscus',
    giscus: {
      repo: 'htianshi45/mango-astro',
      repoId: 'R_kgDOVlzmHw',
      category: 'Announcements',
      categoryId: 'DIC_kwDOVlzmH84DKocF',
      /** pathname = 按页面路径匹配 discussion；也可填 specific + term */
      mapping: 'pathname' as 'pathname' | 'url' | 'title' | 'og:title' | 'specific',
      term: '',
      reactionsEnabled: true,
    },
  },

  /** 最近评论小工具（P1-5）：填一个返回 JSON 数组的 API 地址即可启用 */
  recentComments: {
    enabled: false,
    /** 约定返回 [{ author, content, url, date }]；也兼容 Waline 的 {data:[...]} */
    apiUrl: '',
    limit: 5,
  },

  /**
   * Cloudflare Web Analytics（官方免费、无 Cookie、不影响性能）。
   * 开启方式：dash.cloudflare.com → Analytics & Logs → Web Analytics →
   * Add a site → 「Install manually」→ 把 JS 片段里 token 的值填到下面。
   * 留空时本站不会向 cloudflareinsights 发起任何请求。
   */
  analytics: {
    cloudflareKey: '',
  },

  /** 邮件订阅（P1-7）：填 Buttondown / follow.it 等服务的表单 action 即可启用 */
  subscribe: {
    enabled: false,
    action: '',
    emailField: 'email',
    placeholder: '你的邮箱地址',
    note: '有新文章时发一封邮件，不打扰、不发广告。',
    /** 表单里服务方可能要求额外隐藏字段，例如 Buttondown 的 tag */
    hiddenFields: {} as Record<string, string>,
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
