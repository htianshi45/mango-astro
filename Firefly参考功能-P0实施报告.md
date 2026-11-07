[TOC]

# 参考 Firefly 的功能补齐 · P0 实施报告

> 工程：`/Users/ming/mango-astro` · 线上：`https://mango-astro.pages.dev`
> 实施日期：2026-11-07 · 版本：v1.0
> 本轮范围：统一配置与页面开关、RSS/Atom/sitemap 与 SEO、文章页阅读体验基建，以及上线过程中发现并修复的 CMS 写入问题。

---

## 1. 结论

P0 三项全部落地并已上线，`npm run build` 产出 **52 个页面**，Cloudflare Pages 部署成功，线上 9 个关键地址逐项核验通过。

额外发现并修复了一个会直接导致**整站构建失败**、以及一个会**静默改掉已发布文章网址**的 CMS 写入问题，并加了构建前体检做长期拦截。这是本轮计划外的增量，但属于上线必需。

| 项目 | 结果 |
|---|---|
| 构建 | `52 page(s) built in 4.39s`，内容体检 16 篇全通过 |
| 部署 | `https://a75a2c79.mango-astro.pages.dev`，85 个文件上传完成 |
| 线上核验 | 首页 / 文章 / feeds / sitemap / 后台全部 200 |
| Git | 推送时 `29a8e59..810ba3a main -> main`，本地与远程已同步、无分叉 |

---

## 2. 参考 Firefly 归纳出的玩法逻辑

读 Firefly 官方 README 与本地 `/Users/ming/Documents/firefly-blog/src/config/siteConfig.ts` 后，把它「好用」的原因归成三条，据此筛选本轮做什么：

| 逻辑 | Firefly 的做法 | 本轮借鉴 |
|---|---|---|
| 配置驱动 + 页面开关 | `src/config/` 分散配置，`resolvePageToggles` 控制页面与导航显隐 | 新建单一 `src/config/site.ts` 集中站点信息、`pageToggles`、`features`、`feed` |
| 一站承载多种内容形态 | 说说 / 相册 / 项目 / 书单 / 友链 / 打赏 | 不急着铺页面，先把「页面可开关」的骨架立住，P1 再加内容形态 |
| 内容消费闭环 | Pagefind、TOC、沉浸阅读、相关文章、分享、许可、过期提示 | 先做零依赖可交付的 TOC / 字数 / 阅读时间 / 进度条 / 上下篇 / 真分享 / 订阅源 |

**明确不做**：Live2D、追番、i18n、Swup、瀑布流文章列表。理由是与 Mango 的「朋友圈图文」定位冲突，或收益低于维护成本。

---

## 3. P0 实施清单

### 3.1 统一配置与页面开关

| 项 | 落点 | 说明 |
|---|---|---|
| 站点信息集中化 | `src/config/site.ts` | 站名、描述、URL、logo、每页文章数、ICP、`navItems`、`footerLinks`、`features`、`feed` |
| 页面开关 | `pageToggles` + `isPageEnabled()` | 关闭后导航隐藏、sitemap 排除、`Astro.rewrite('/404')` 直接返 404 |
| 导航 / 页脚数据源 | `visibleNavItems()`、`visibleFooterLinks()` | Header / Footer 不再硬编码菜单 |
| 配置落地 | `BaseLayout` / `Header` / `Footer` / `index` / `page/[page]` / `download` / `map` | 全部改读 `siteConfig` |

**开关实测**：关闭 `download` 后，导航项消失、sitemap 不再包含该 URL、`/download` 返回 404；恢复后全部正常。

### 3.2 RSS / Atom / sitemap 与 SEO

| 产物 | 文件 | 线上实测 |
|---|---|---|
| RSS 2.0 | `src/pages/rss.xml.ts` | 16 个 `<item>`，XML 合法 |
| Atom 1.0 | `src/pages/atom.xml.ts` | 16 个 `<entry>`，XML 合法 |
| sitemap.xml | `src/pages/sitemap.xml.ts` | 50 个 `<loc>`，不含 `/admin` |

`BaseLayout.astro` 统一注入：`canonical`、OpenGraph、Twitter card、RSS / Atom 自动发现、sitemap 声明、JSON-LD。普通页输出 `WebSite`，文章页输出 `BlogPosting`（含 `datePublished`、`author`、`keywords`）。

### 3.3 文章页阅读体验基建

`src/pages/posts/[slug].astro` 重写后包含：阅读进度条、目录 TOC（取 `post.render()` 的 h2/h3）、字数与阅读时间（中文按字、英文按词，300 字/分钟）、上一篇 / 下一篇、相关文章、`navigator.share` 与 Clipboard fallback 的分享按钮、复制链接、`BlogPosting` 结构化数据。

字数统计会先剥离代码块、图片、链接与 Markdown 标记，避免把语法符号算进正文。

---

## 4. 上线过程中的额外修复（计划外，但必需）

### 4.1 Git 分叉：保住 CMS 里写的文章

`git push` 被拒（non-fast-forward）。查到远程多一条 `29a8e59 Update 文章 "coffee-shops"`，是 Sveltia 后台保存产生的；本地 `ecd1d34` 也改过同一篇（早前灯箱测试扩写的示例内容）。

处理：`git rebase origin/main`，冲突文件取**远程版本**，完整保留你在后台写的内容与两张 picsum 配图；本地示例扩写丢弃。变基后历史线性，无强推。

### 4.2 CMS 写入的两个坑

合并后第一次构建直接失败，报错 `posts → 1321 data does not match collection schema / updatedDate: Invalid date`。追下去是两个独立问题：

| 坑 | 成因 | 后果 | 修复 |
|---|---|---|---|
| 可选日期留空 | Sveltia 把空的 datetime 写成 `updatedDate: ''`，`z.coerce.date()` 得到 Invalid Date | **整站构建失败** | `src/content/config.ts` 加 `optionalDate`，`z.preprocess` 把空串归一化为 `undefined` |
| URL 别名随手填 | Astro 把 frontmatter 的 `slug` 当路由别名 | 该文章网址静默变成 `/posts/1321/`，旧链接全 404 | `coffee-shops.md` 的 slug 改回文件名；CMS 字段加提示；构建前体检拦截 |

**URL 已恢复**：线上 `/posts/coffee-shops/` 返回 200、canonical 正确，`/posts/1321/` 返回 404（没有残留的旧路由）。

### 4.3 构建前内容体检

新增 `scripts/check-content.mjs`，串进 `npm run build`（`npm run check:content && astro build`），零依赖，检查：URL 别名与文件名一致性、别名重复、`title` / `pubDate` 必填、日期合法性、frontmatter 闭合。

实测：注入一个 `slug: 'oops'` 的测试文件时脚本打印具体文件与改法并以退出码 1 阻断；移除后 16 篇全通过。宁可构建失败，也不带病上线。

### 4.4 CMS 配置清理

`public/admin/config.yml`：把残留的 "Decap CMS" 抬头与「上线前必须替换 REPLACE」过期提示换成实际生产配置说明；移除已不在 schema 里的 `comments` 字段；给「URL 别名」加风险提示；文档链接换成 Sveltia。

---

## 5. 修改文件清单

**新增**：`src/config/site.ts`、`src/pages/rss.xml.ts`、`src/pages/atom.xml.ts`、`src/pages/sitemap.xml.ts`、`src/utils/post-images.ts`、`scripts/check-content.mjs`

**重写**：`src/layouts/BaseLayout.astro`、`src/components/Header.astro`、`src/components/Footer.astro`、`src/pages/posts/[slug].astro`

**修改**：`astro.config.mjs`、`package.json`、`public/admin/config.yml`、`src/content/config.ts`、`src/content/posts/coffee-shops.md`、`src/pages/index.astro`、`src/pages/page/[page].astro`、`src/pages/download.astro`、`src/pages/map.astro`、`PROJECT_SUMMARY.md`

**文档**：`站点管理与设置教程.md` / `.html` 升到 v2.1，新增 8.1「CMS 写入的常见坑」、故障排查新增 3 行、命令速查加入 `npm run check:content`；HTML 保留日间 / 夜间 / 系统三态切换并实拍验证。

**提交**：`18b9883`（P0 主体）、`810ba3a`（CMS 修复与体检）；本报告本身为纯文档提交，不改动线上产物

---

## 6. 线上核验结果

| 地址 | 状态 | 说明 |
|---|---|---|
| `/` | 200 | 59,634 B |
| `/posts/coffee-shops/` | 200 | canonical = `https://mango-astro.pages.dev/posts/coffee-shops/` |
| `/posts/1321/` | 404 | 旧的错误路由已消失 |
| `/rss.xml` | 200 | 16 item |
| `/atom.xml` | 200 | 16 entry |
| `/sitemap.xml` | 200 | 50 URL，0 处 `/admin` |
| `/admin/` | 200 | Sveltia CMS 入口 |
| `/admin/config.yml` | 200 | 抬头已是 Sveltia，含 URL 别名提示 |
| `/admin/sveltia-cms.mjs` | 200 | 2,681,179 B |

文章页另核对：`reading-progress`、`share-post`、`BlogPosting`、字数标注均存在。首页 SEO 标签、feeds 自动发现、JSON-LD 齐全。

---

## 7. 教程日夜两态验证

`站点管理与设置教程.html` 用 `?theme=light` / `?theme=dark` 实拍：内容区平均 RGB 浅色 `(241.9, 243.8, 246.6)`、夜间 `(31.7, 36.1, 43.8)`，差异明显；夜间截图检查目录侧栏、表格、代码块、复制按钮、三态切换按钮均清晰无错位。

---

## 8. 未做项与后续建议

按此前「价值 × 成本」四象限，P0 已完成，接下来按优先级：

| 优先级 | 项 | 备注 |
|---|---|---|
| P1 | 说说动态流 / 相册瀑布流 / 侧栏扩容 / Giscus 评论 | 需要新 collection 与页面，可复用本轮开关骨架 |
| P2 | Pagefind 全文搜索 / 图片优化 / 真实浏览量 | Pagefind 中文分词有限制，需评估；浏览量要接 Workers KV |
| 不做 | Live2D / 追番 / i18n / Swup / 瀑布流文章列表 | 与 Mango 定位冲突或维护成本高于收益 |

另有一条运维建议：若绑定 `mango.840428.xyz`，同步改 `src/config/site.ts` 的 `url` 与 `astro.config.mjs` 的 `site`，并检查 OAuth 网关的 `site_domain` 白名单。

---

## 9. 回滚方法

```bash
cd /Users/ming/mango-astro
git log --oneline -5                 # 找到 P0 之前的提交
git revert --no-commit 810ba3a 18b9883
git commit -m "回滚 P0" && git push
npm run build
wrangler pages deploy dist --project-name mango-astro --branch main --commit-dirty=true
```

只回滚代码不会自动回滚线上，必须重新构建并部署；也可在 Cloudflare Pages 的 Deployments 里直接把上一版设为 Production。

---

## 10. 数据来源与自洽校验

- 构建日志：`npm run build`，`52 page(s) built`，产物 `dist/`。
- 线上数据：对 `https://mango-astro.pages.dev` 逐路径 `curl` 实测，非推测。
- Git 数据：`git log` / `git status -sb` / `git push` 输出。
- 报告里的计数（16 篇文章、16 item、16 entry、50 URL、85 上传文件）分别来自 `check:content`、线上 feeds、线上 sitemap 与 wrangler 部署日志，与本地 `dist/` 逐项对得上。
- 教程 v2.1 的 8.1 章节与体检脚本报错文案互相引用，已核对章节锚点存在。
