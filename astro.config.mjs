import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // 站点正式地址：影响 canonical / sitemap / RSS / OG 里的绝对链接。
  // 换域名时，必须同步修改 src/config/site.ts 的 siteConfig.url。
  site: 'https://mango-astro.pages.dev',
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
