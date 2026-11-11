import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import { rehypeOptimizeImages } from './src/utils/rehype-images.mjs';

// Astro 7 起 Markdown/MDX 默认走原生 Sätteri，remark/rehype 插件需要
// 通过 unified() 管线传入（官方推荐形式，markdown 与 mdx 共用，MDX 自动继承）。
const markdownProcessor = unified({ rehypePlugins: [rehypeOptimizeImages] });

export default defineConfig({
  // 站点正式地址：影响 canonical / sitemap / RSS / OG 里的绝对链接。
  // 换域名时，必须同步修改 src/config/site.ts 的 siteConfig.url。
  // Cloudflare 构建时可用环境变量 SITE_URL 覆盖（预览分支想指向不同域名时用）。
  site: process.env.SITE_URL || 'https://mango-astro-git.pages.dev',
  // Astro 7 默认改为 JSX 空白规则（行内元素间的换行空格会被剥掉，
  // 可能改变渲染结果）。显式保留 v6 及以前的 HTML 感知压缩行为。
  compressHTML: true,
  // 视口内的站内链接自动预取，跳转近乎瞬时。
  // 注意：这里只开 prefetch，不启用 ClientRouter（View Transitions）——
  // 后者会让全站 16 个组件的 <script> 在二次导航后不再执行，
  // 需要逐个改造成 astro:page-load 监听才能安全开启。
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  // CMS 后台要独占整个页面，dev toolbar 的悬浮按钮会挡住它
  devToolbar: { enabled: false },
  integrations: [
    mdx(),
  ],
  markdown: {
    processor: markdownProcessor,
    shikiConfig: {
      theme: 'github-dark',
    },
  },
  vite: {
    build: {
      assetsInlineLimit: 4096,
    },
  },
});
