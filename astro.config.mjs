import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // 原模板残留的是 WordPress 原版演示站域名，已改为本站计划域名。
  // 部署后如果换了域名，改这里（影响 canonical / sitemap / RSS 绝对链接）。
  site: 'https://mango.840428.xyz',
  // CMS 后台要独占整个页面，dev toolbar 的悬浮按钮会挡住它
  devToolbar: { enabled: false },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    mdx(),
  ],
  markdown: {
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
