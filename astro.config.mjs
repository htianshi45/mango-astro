import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import { rehypeOptimizeImages } from './src/utils/rehype-images.mjs';

export default defineConfig({
  // 站点正式地址：影响 canonical / sitemap / RSS / OG 里的绝对链接。
  // 换域名时，必须同步修改 src/config/site.ts 的 siteConfig.url。
  site: 'https://mango-astro.pages.dev',
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
    tailwind({
      applyBaseStyles: false,
    }),
    mdx({ rehypePlugins: [rehypeOptimizeImages] }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
    // 正文图片走同一份构建期 WebP 清单，补齐 srcset / width / height
    rehypePlugins: [rehypeOptimizeImages],
  },
  vite: {
    build: {
      assetsInlineLimit: 4096,
    },
  },
});
