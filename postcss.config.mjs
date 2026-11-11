// Tailwind v3 接入：@astrojs/tailwind 集成不支持 Astro 7（peer 只到 ^5），
// 官方推荐 Tailwind v4 + @tailwindcss/vite，但那是另一场迁移。
// Tailwind 3 原生就是 PostCSS 插件，Astro 内置支持 postcss.config，
// 用它替换集成层，行为（含 applyBaseStyles:false，即不注入 base）等价。
export default {
  plugins: {
    tailwindcss: {},
  },
};
