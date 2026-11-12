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

  // ===== 书影音导航（2026-11-13 自资料库「猫哈哈导航站整理」影音书导航分类导入）=====
  {
    id: 'movie',
    name: '影视',
    icon: 'bi-film',
    desc: '影视搜索与在线观看',
    weight: 66,
    items: [
      { title: "4K影视", url: "https://4kvm.site/", desc: "优质在线 秒播不卡" },
      { title: "七味", url: "https://www.qn63.com", desc: "在线观看+磁力下载，片源多，更新快。（移动端广告多！电脑端干净）" },
      { title: "懂片帝", url: "https://dongpiandi.ai/", desc: "非常强的搜索观看工具，UI设计高效合理！" },
      { title: "搜TV", url: "https://www.sotvla.com/", desc: "聚合搜索，免费看各大站VIP，真超清资源解析。" },
      { title: "搜剧AI", url: "https://souju.ai/", desc: "又一个AI搜片工具，搜索即播放，可看最新影视剧。" },
      { title: "搜片", url: "https://soupian.plus/", desc: "聚合N个电影网站搜索" },
      { title: "毒舌电影", url: "https://www.dushe02.com/", desc: "资源线路多，片源超清，更新快。" },
      { title: "袋鼠影视", url: "https://dsystv.com/", desc: "超清片源，资源更新快。" },
      { title: "魔法影视", url: "https://int.cm/", desc: "界面简单但片源好，播放快。" },
    ],
  },
  {
    id: 'music',
    name: '音乐',
    icon: 'bi-music-note-beamed',
    desc: '在线听歌与无损下载',
    weight: 65,
    items: [
      { title: "午安音乐", url: "https://www.mvcat.com/music/noon/", desc: "午安，世界！" },
      { title: "早安音乐", url: "https://www.mvcat.com/music/morning/", desc: "早安，世界！" },
      { title: "晚安音乐", url: "https://www.mvcat.com/music/night/", desc: "晚安，世界！" },
      { title: "枫叶音乐盒", url: "https://mu-jie.cc/", desc: "在线听歌 有分类歌单" },
      { title: "歌曲宝", url: "https://gequbao.com/", desc: "搜索/试听/下载/歌词" },
      { title: "熊猫无损音乐", url: "https://xmwsyy.com/", desc: "无损音乐下载，包括无损格式和高音质mp3，无需注册直接下载。" },
      { title: "米兔音乐", url: "https://qqmp3.vip/", desc: "在线+下载 有无损下载" },
      { title: "糖果无损音乐", url: "https://tgws.cc/", desc: "无损+mp3格式，网盘下载，无需注册。" },
      { title: "街声", url: "https://www.streetvoice.cn", desc: "国内独立音乐平台" },
      { title: "随机音乐", url: "https://www.mvcat.com/music/random/", desc: "站长自制自用" },
      { title: "雀乐", url: "https://www.indie.cn", desc: "独立音乐平台，原来叫“落网”。" },
    ],
  },
  {
    id: 'ebook',
    name: '图书听书',
    icon: 'bi-book-half',
    desc: '电子书、报刊与有声书',
    weight: 62,
    items: [
      { title: "JOJO看报", url: "https://reader.jojokanbao.cn/", desc: "在线阅读人民日报、参考消息、红旗杂志等历史报刊，重温历史记忆。提供便捷的搜索和浏览功能。" },
      { title: "owllook", url: "https://github.com/howie6879/owllook", desc: "开源项目，在线小说搜索引擎。能解析超过 200+ 小说网站，在线搜书和看书一次搞定。" },
      { title: "Z-Library", url: "https://zh.z-lib.gd/", desc: "世界上最大的电子图书馆。自由访问知识和文化。" },
      { title: "万本小说", url: "https://10000txt.com/", desc: "txt小说下载，可搜索直接下载！有批量打包下载。" },
      { title: "安娜的档案", url: "https://zh.annas-archive.gd/", desc: "世界上最大的开源、开放数据图书馆。不仅是 Sci-Hub, Library Genesis, Z-Library 等站的镜像。" },
      { title: "报刊大全", url: "http://www.53bk.com/baokan/", desc: "全国报纸期刊大全，分类清晰，在线查阅&下载PDF！同时提供相当数量的国外资源。" },
      { title: "无限小说", url: "https://wuxianbook.com", desc: "免费在线小说" },
      { title: "时光图书馆", url: "https://atimebook.com", desc: "老照片/老课本/老杂志/老报纸期刊/书画/古籍等等综合收藏站！" },
      { title: "老画报", url: "https://laohuabao.com", desc: "老连环画/画报/漫画在线看！" },
      { title: "耳朵听书", url: "https://erduowang.com/", desc: "有声小说/评书/相声等免费听，不用注册。" },
      { title: "金屋电子书", url: "https://alltool.top/", desc: "电子书原本分享，提供网盘下载，书籍信息详细，每一本图书信息与资源均经过人工检验。" },
      { title: "鬼话连篇", url: "https://www.guihualianpian.cn", desc: "一个分享原创鬼故事的网站" },
    ],
  },];

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
