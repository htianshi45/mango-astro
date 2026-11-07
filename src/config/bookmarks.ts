/**
 * 书签导航配置 — 参考 Firefly 的 booknavConfig.ts
 *
 * 一个数组项就是一个分组，items 是该分组下的书签。
 * icon 用 Bootstrap Icons 类名（本站已自托管 /fonts/bootstrap-icons.css），
 * 也可以填图片路径 / 完整 URL；留空则自动取目标站点 favicon，失败时回退首字母。
 * weight 越大越靠前。改完保存后重新构建即可，无需动页面代码。
 */

export interface BookmarkItem {
  title: string;
  url: string;
  desc?: string;
  /** bi-* 图标名，或图片路径 / URL */
  icon?: string;
  weight?: number;
}

export interface BookmarkGroup {
  id: string;
  name: string;
  icon?: string;
  desc?: string;
  weight?: number;
  items: BookmarkItem[];
}

export const bookmarksPageConfig = {
  title: '书签导航',
  description: '常用的站点、工具与资料，按类别整理，方便随手打开。',
  /** 未指定 icon 时，是否自动获取目标站点 favicon */
  favicon: {
    enabled: true,
    /** {domain} 会被替换成目标站点域名；国内不可达时会自动回退首字母 */
    api: 'https://a.favicon.im/{domain}',
  },
  /** 页脚的「申请收录」说明，留空则不显示 */
  applyNote: '发现好站？欢迎在留言里推荐，我会不定期整理进来。',
};

export const bookmarkGroups: BookmarkGroup[] = [
  {
    id: 'dev',
    name: '开发',
    icon: 'bi-code-slash',
    desc: '写代码时离不开的站点',
    weight: 100,
    items: [
      { title: 'GitHub', url: 'https://github.com', desc: '全球最大的代码托管平台', icon: 'bi-github', weight: 10 },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', desc: '最权威的 Web 技术文档', weight: 9 },
      { title: 'Astro', url: 'https://astro.build', desc: '内容驱动型网站的 Web 框架', weight: 8 },
      { title: 'Tailwind CSS', url: 'https://tailwindcss.com', desc: '功能强大的原子化 CSS 框架', weight: 7 },
    ],
  },
  {
    id: 'design',
    name: '设计',
    icon: 'bi-palette',
    desc: '配色、图标与灵感来源',
    weight: 90,
    items: [
      { title: 'Iconify', url: 'https://icon-sets.iconify.design', desc: '海量开源图标集合搜索', weight: 10 },
      { title: 'Bootstrap Icons', url: 'https://icons.getbootstrap.com', desc: '本站正在用的图标库', icon: 'bi-bootstrap', weight: 9 },
      { title: 'iconfont', url: 'https://www.iconfont.cn', desc: '阿里巴巴矢量图标库', weight: 8 },
    ],
  },
  {
    id: 'tools',
    name: '工具',
    icon: 'bi-tools',
    desc: '顺手的在线小工具',
    weight: 80,
    items: [
      { title: 'TinyPNG', url: 'https://tinypng.com', desc: '在线压缩 PNG / JPEG 图片', weight: 10 },
      { title: 'Squoosh', url: 'https://squoosh.app', desc: 'Google 出品的图片压缩与格式转换', weight: 9 },
      { title: 'Carbon', url: 'https://carbon.now.sh', desc: '把代码片段生成漂亮的图片', weight: 8 },
      { title: 'Can I use', url: 'https://caniuse.com', desc: '查浏览器兼容性', weight: 7 },
    ],
  },
  {
    id: 'reading',
    name: '阅读',
    icon: 'bi-book',
    desc: '文档、教程与长期阅读',
    weight: 70,
    items: [
      { title: 'Astro 文档', url: 'https://docs.astro.build', desc: 'Astro 官方文档', weight: 10 },
      { title: 'Cloudflare Docs', url: 'https://developers.cloudflare.com', desc: 'Pages / Workers / DNS 文档', weight: 9 },
      { title: '豆瓣读书', url: 'https://book.douban.com', desc: '找书、记书单', weight: 8 },
    ],
  },
];

/** 按权重排序，分组与组内条目都排 */
export function getVisibleBookmarkGroups(): BookmarkGroup[] {
  return bookmarkGroups
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)),
    }))
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

export function getBookmarkDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function getBookmarkLetter(title: string): string {
  return (title.trim()[0] || '#').toUpperCase();
}

/** 决定该书签图标怎么渲染 */
export function resolveBookmarkIcon(item: BookmarkItem):
  | { kind: 'icon'; value: string }
  | { kind: 'image'; value: string }
  | { kind: 'favicon'; value: string } {
  if (item.icon) {
    return item.icon.startsWith('bi-')
      ? { kind: 'icon', value: item.icon }
      : { kind: 'image', value: item.icon };
  }
  const domain = getBookmarkDomain(item.url);
  return {
    kind: 'favicon',
    value: bookmarksPageConfig.favicon.api.replace('{domain}', domain),
  };
}
