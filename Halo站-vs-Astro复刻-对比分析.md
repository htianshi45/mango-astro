# Halo 站 `halo.840428.xyz` vs 本地 Astro 复刻 · 对比分析

> 新参照站：**https://halo.840428.xyz/**（「大明白日志」，你自己的线上站）
> 对比主体：`http://localhost:4321/`（本地 Astro v6，前六轮做完的 Mango 一比一复刻）
> 第三方基准：`https://mango.huitheme.cn/`（WordPress 原版演示站，前六轮一直用的基准）
> 对照图：`对比-Halo-vs-Astro-v6.png`（上 Halo / 下 Astro）、`对比-原版vs-Halo.png`（上原版 / 下 Halo），均 940×1930、同一 1440px 视口裁切
> 生成时间：2026-11-07 00:26

[TOC]

---

## 1. 先说清楚：这个站是什么 🔍

它**不是另一个原版参照**，而是 **Mango 主题的 Halo 移植版**，而且就是你自己的站：

| 证据 | 值 |
|---|---|
| 建站程序 | `<meta content="Halo 2.26.0" name="generator">` |
| 主题 | `/themes/theme-mango/...`，`v=1.0.0` |
| 样式表 | `bootstrap.min.css` + `bootstrap-icons.css` + `fancybox.css` + **`style.css`（31,549 B）** + **`mango.css`（20,839 B）** |
| 站点 | 标题「大明白日志」，作者「赵大明白 / htianshi45」，7 篇文章 |
| 插件 | `PluginCommentWidget` 3.1.2、`PluginSearchWidget` 1.8.0、`plugin-douban` 1.2.7 |
| 版心 | HTML 内联注入 `@media(min-width:992px){.container{max-width:min(900px, calc(100% - 48px))}}` |
| 主色 | `--ds_main_color:#4270f6`，由主题设置注入 |
| 暗色 | `localStorage["isDarkMode"]`（`"1"` 暗 / `"0"` 浅 / 缺省跟随 `prefers-color-scheme`），首屏防闪烁脚本 |

**最关键的发现**：`/themes/theme-mango/assets/css/style.css` 与我一直当基准的 `/tmp/mango-style.css` **是同一套 CSS** —— 头部同为 `Theme Name: Mango / Author: Crazy uncle / Version: 1.6.20241202`，大小 31,549 B vs 31,101 B，行号几乎逐行对应（`post_loop_conter` 都在 195 行、`post_img_2` 都在 203 行），差别只是把硬编码色值换成了 `var(--ds_main_color, #4270f6)`。

而多出来的 **20KB `mango.css` 是 Halo 移植版的定制覆盖层**，里面有明确的中文注释记录着「有意偏离原版」的决定。

---

## 2. 结论：两个站长得不一样，是因为参照物不同 🎯

| | 本地 Astro v6 | Halo 站 |
|---|---|---|
| 目标 | **严格一比一复刻 WordPress 原版演示站** | **在 Mango 基础上定制成「大明白日志」** |
| 做法 | 不拷贝原版 CSS，按数值与结构从零写等价实现 | 直接用原版 `style.css`，再叠一层 `mango.css` 覆盖 |
| 结果 | 更像「原版」 | 更像「你自己的博客」 |

**换句话说：不是谁做得差，是两者刻意走向了不同方向。** 如果拿「像不像原版 Mango 演示站」当尺子，**Astro v6 明显更接近**；如果拿「适不适合当个人博客用」当尺子，Halo 站的定制（无轮播、作者卡、真实评论与浏览数、在线后台）反而更实用。

决定性证据在 `mango.css:864-872`：

```css
/* ============================================================
   卡片内容对齐（2026-10-25）
   ------------------------------------------------------------
   原版 .post_loop_conter 有 60px 左缩进（对齐头像右侧），
   宽版下会在图片左侧留出空白带；这里取消缩进让图片/标签满宽，
   标题区（标题 + 摘要）居中，视觉重心落在卡片中轴。
   ============================================================ */
.post_loop .post_loop_conter { margin-left: 0; }
```

这一段直接解释了对照图里最刺眼的差别：**Halo 站标题与头像左对齐、Astro v6 标题缩进 60px** —— 不是 Halo 版漏做，是 10 月 25 日主动改掉的。

---

## 3. 视觉逐项对比（对照图 `对比-Halo-vs-Astro-v6.png`）📐

| 部位 | Halo 站（上） | 本地 Astro v6（下） | 谁更接近原版 |
|---|---|---|---|
| **轮播 banner** | ❌ **没有**（首页直接从文章列表开始） | ✅ 900×350 工作台图 + 「置顶精彩」角标 + 标题 + 指示器/箭头 | **Astro**（原版有） |
| 顶栏 logo | 圆形猫咪头像 +「大明白日志」 | 橙黄芒果图 +「Mango」 | Astro（原版是芒果图 + Mango） |
| 顶栏导航 | 只有「首页 / 关于」 | 风景 / 旅拍 / 科技▾ / 主题下载 / 旅游地图 | **Astro**（原版是分类菜单） |
| 顶栏右侧 | 灯泡圆按钮 + 搜索图标（无圆底） | 2 个 30×30 圆按钮（搜索 + 灯泡），点搜索展开 120px 顶部条 | Astro |
| 背景纹理 | 水波纹**很明显**（`bg.svg`） | 浅色下偏淡，暗色下清晰 | Halo 更明显 |
| 容器 | 900px ✅ | 900px ✅ | 一致 |
| **卡片内容缩进** | **0**（标题/摘要/图片与头像左对齐） | **60px**（标题区对齐头像右侧） | **Astro**（原版 `margin-left:60px`） |
| 时间格式 | **绝对日期** `2026-10-26 11:11` | 相对时间「X 年前 / X 月前」 | **Astro**（原版「4 年前」） |
| 摘要 | 3 行截断、灰色 `#8c8989`、13.5px | 原版式 14px / 300 / 1.8 行高、不截断 | Astro |
| 九宫格 | 第一张卡是 3 张**横向矩形**大图 | 3×3 **正方形**小图 + `+23` | **Astro**（原版 340×340 方图） |
| 图片布局 class | `post_img_1/2/3/6/9`（7 篇里各 1 次） | `post-img-1..9` 八套齐全 | 都有，Halo 少样本 |
| 标签 | `#定投日志` 浅蓝胶囊 ✅ | `#欢迎` 等浅蓝胶囊 ✅ | 一致 |
| 底部三数 | `0评论 / 13浏览 / 0`（**实时数据**） | `18 评论 / 1,024 浏览 / 56 点赞`（frontmatter 静态值） | 形态一致，数据来源不同 |
| 侧栏第一块 | **作者卡 `author_show_box`**（头像 + 名称 + 文章7 / 评论2） | 无，直接是「热门文章」 | **Astro**（原版首页侧栏无作者卡） |
| 侧栏热门文章 | 首条大图 + 2 条缩略图，副行是**日期** `2026-10-12` | 首条大图 + 2 条缩略图，副行是**「29 条留言」** | **Astro**（原版「29条留言」） |
| 侧栏其余 | 热门标签、最近评论 ✅ | 热门标签、最近评论 ✅ | 一致 |
| 页脚 | `footbox` + `links` + `copyright` ✅ | `.links` 独立块 + 版权 + 备案占位 ✅ | 一致 |
| 暗色 | 默认跟随系统，`isDarkMode` 可覆盖 | 默认浅色，`theme` 可切换 | 都可用 |

> 补一句：Halo 站首页有 **7 张 `post_loop`** 卡片、无 `index_banner`/`id="banner"`；原版首页是 8 张卡片 + 1 个轮播。所以三者连内容密度都不同。

---

## 4. Halo 相对原版做了哪些定制（对照图 `对比-原版vs-Halo.png`）🧩

从 `mango.css` 的规则与注释可以还原出这份「定制清单」：

| # | 定制 | `mango.css` 线索 |
|---|---|---|
| 1 | 去掉 60px 缩进、标题区左对齐 | `:870 .post_loop .post_loop_conter{margin-left:0}` + 注释「2026-10-25」 |
| 2 | 摘要改 3 行截断、弱化色 | `:881 p{-webkit-line-clamp:3; color:#8c8989; font-size:13.5px}` |
| 3 | 主色/版心/背景变量化，交给主题设置注入 | HTML 内联三段 `<style>`；`--ds_main_color` / `--ds_background` |
| 4 | 新增作者卡 | `:457 .author_show_box`，首页 DOM 有 1 个 |
| 5 | 图片规则扩展 `post_img_1`、响应式重写 | `:91 .post_img_1 a`、`:766 .post_images`、`:508 @media` |
| 6 | 首页不输出轮播 | HTML 里无 `banner`；`#banner` 规则仍留在 `style.css` 里未删 |
| 7 | 导航简化为「首页 / 关于」 | `header-menu-ul` 只有 2 项（后台菜单配置） |
| 8 | 暗色跟随系统 | `isDarkMode` + `prefers-color-scheme`，原版是纯手动切换 |
| 9 | 侧栏热门文章副行改日期 | 截图可见 `2026-10-12`（模板层改动） |
| 10 | 接入 Halo 插件生态 | 评论 / 搜索 / 豆瓣三个插件 |

---

## 5. 技术栈与运维对比 ⚙️

| 维度 | Halo 站 | 本地 Astro v6 |
|---|---|---|
| 渲染 | **动态 SSR**（Halo 2.26 Java 后端 + Thymeleaf 模板） | **静态 SSG**（Astro 5，构建出 51 个 HTML） |
| 内容 | Halo 数据库 + 在线后台可视化编辑 | `src/content/posts/*.md` + Content Collections（Zod schema） |
| 主题 | 原版 `style.css` 直移 + 20KB 定制层 | 按数值重写的 `global.css` + Tailwind + 组件 scoped CSS |
| 评论 | `PluginCommentWidget` 3.1.2，原生评论（Hello Halo 有 2 条） | Giscus（`src/config/comment.ts` 可配置，**当前未启用**显示占位块） |
| 搜索 | `PluginSearchWidget` 1.8.0（服务端） | `/search.astro` 客户端过滤 frontmatter |
| 浏览/点赞 | **数据库实时计数**（13 浏览等） | frontmatter 里写死的静态值 |
| 图片 | 媒体库 + Fancybox 灯箱 | `public/images/` + 自写灯箱（分组左右切换） |
| 暗色 | `isDarkMode` + 系统偏好，防闪烁 | `theme` localStorage + `<head>` 内联防闪烁 |
| 部署 | 自有服务器 + Cloudflare（`cf-ray ...-HKG`、`server: cloudflare`） | 任意静态托管（工程已有 `wrangler.toml` / `DEPLOYMENT.md`） |
| 优势 | 后台好用、数据真实、插件丰富、内容可随时改 | 无服务器成本、CDN 极快、无数据库攻击面、可进 Git |
| 代价 | 要维护 Java 服务与数据库 | 改内容要重新构建；动态计数/评论需外接服务 |

> 顺带一提：Halo 站 `<meta name="generator" content="Halo 2.26.0">`，和本次会话最开始分析的 `www.alei.kdns.fr`（Astro v7.1.3 + `/admin/` 404）是完全不同的技术路线，但两者都是「Mango 风格」。

---

## 6. 两个方向的操作清单 🛠️

### 方向 A：想让 **Astro v6 变成 Halo 站那个样子**

按影响从大到小（都只改 Astro 工程，不动原版基准）：

1. 去掉首页 `<Banner />`（`src/pages/index.astro`）；
2. `.moment-content-area{margin-left:60px}` → `0`（`global.css`）；
3. `formatTime()` 改成输出 `YYYY-MM-DD HH:mm`（`PostCard.astro`，原版现在是相对时间）；
4. 侧栏最上面插入作者卡组件（照 `mango.css:457 .author_show_box` 的结构：头像 + 名称 + 文章数/评论数）；
5. `HotPostsWidget` 副行从「N 条留言」改成日期；
6. 顶栏 `navItems` 精简成「首页 / 关于」，logo 换站点名；
7. 摘要加 3 行截断 + `#8c8989` / 13.5px；
8. 暗色改成默认跟随 `prefers-color-scheme`，键名换 `isDarkMode`；
9. 接真实评论（Giscus 或 Twikoo）+ 浏览量服务，替代 frontmatter 静态值。

> 注意：这样做会**主动放弃前六轮的一比一成果**，除非你打算把 Astro 版当成「大明白日志」的新家，否则不建议。

### 方向 B：想让 **Halo 站更接近 WordPress 原版**

1. 主题设置里重新启用轮播（`#banner` 的 CSS 还在，只是模板没输出）；
2. 把 `mango.css:870` 的 `margin-left:0` 改回 `60px`（或删掉这段覆盖）；
3. 后台菜单补齐「风景 / 旅拍 / 科技 / 主题下载 / 旅游地图」；
4. 时间格式切相对时间、热门文章副行切「N 条留言」；
5. 摘要恢复 14px / 300 / 1.8、不截断；
6. 首页侧栏取消作者卡（或移到关于页）；
7. 九宫格缩略图改成正方形裁切（当前是横向矩形）。

### 方向 C（我的建议）✅

**保持现状，各司其职**：Halo 站继续当你的主博客（后台好用、评论浏览真实、内容可随时改），Astro v6 作为「一比一复刻的技术样板 / 静态镜像」保留。如果哪天想给 Astro 版接真实数据，优先做 Giscus + 浏览量 API，而不是反向去改视觉。

---

## 7. 数据来源与自洽校验 🔗

| 结论来源 | 具体依据 |
|---|---|
| Halo 站身份 | `curl -sSL https://halo.840428.xyz/` → `/tmp/halo-home.html`（44,970 B）：`Halo 2.26.0`、`/themes/theme-mango/`、三个插件、内联 900px/主色/背景 `<style>`、`isDarkMode` 防闪烁脚本 |
| Halo 主题 CSS | `/tmp/halo-style.css`（31,549 B）与 `/tmp/mango-style.css`（31,101 B，原版基准）逐行对照：同 `Theme Name / Version: 1.6.20241202`、`post_loop_conter` 同在 195 行、`post_img_2` 同在 203 行 |
| 定制层 | `/tmp/halo-mango.css`（20,839 B），`:864-872` 的「卡片内容对齐（2026-10-25）」注释原文；`:457 .author_show_box`、`:91 .post_img_1 a`、`:836 .sidebar_sticky` |
| Halo 首页 DOM | 7 个 `post_loop`、1 个 `author_show_box`、`post_img_1/2/3/6/9` 各 1 次、**无 `index_banner` / `id="banner"`**、有 `footbox` / `links` / `header-menu-ul` / `sidebar_sticky` |
| 视觉 | `/tmp/halo-top.png`（默认暗色）、`/tmp/halo-light-top.png`（CDP 设 `isDarkMode="0"` 后 reload，状态 `html.className=""`）、`/tmp/halo-light-long.png`（1440×2200） |
| 本地 Astro v6 | `/tmp/mango-v6-top.png` / `对比-原版vs新版-v6.png`；六轮总验收结论 98% |
| 对照图 | `对比-Halo-vs-Astro-v6.png`、`对比-原版vs-Halo.png`（均 940×1930，同一 `box=(250,0,1190,900)` 裁切） |
| 自洽校验 | ① 用「CSS 同源 + 定制层注释」双重证明 Halo 站是**有意定制**而非实现缺陷；② 三方（原版 / Halo / Astro）在同一裁切区截图，避免视口差异误判；③ 暗色图因 CDP 设置后 `html.className` 为空，确认浅色截图有效；④ 长图首轮因 CDP 截图帧超 `websockets` 默认 1 MB 报 1009，加 `max_size=None` 后成功 |

> 如果你原本想对比的是「**原版 WordPress 演示站 vs Halo 站**」，报告第 4 节与 `对比-原版vs-Halo.png` 就是这部分；如果想对比「**Halo 站 vs 最初的 `www.alei.kdns.fr`**」，告诉我一声，我再补一份技术栈专项。
