[TOC]

# 参考 Firefly 的四项功能移植 · 实施报告

> 工程：`/Users/ming/mango-astro` · 线上：`https://mango-astro.pages.dev`
> 实施日期：2026-11-07 · 版本：v1.0
> 需求：① 参考 Firefly 改造导航栏 ② 说说与文章按发布时间交替显示 ③ 书签导航 ④ 收藏夹 / 书架 / 片库 / 音乐库（仿番剧）

---

## 1. 结论

四项全部落地并已上线。构建 `60 page(s) built in ~5s`（原 52 页 + 7 个新页面 + 1 个新增分页页），内容体检 `文章 16 · 说说 8 · 收藏 10` 全通过，浅色/暗色/窄屏/下拉展开态均已实拍验收。

| 需求 | 结果 |
|---|---|
| ① 导航栏 | Firefly 风格分组下拉 + 毛玻璃胶囊 + 右侧工具按钮 + 窄屏抽屉，8 项页面开关递归生效 |
| ② 说说 | 新增 `moments` collection + `/moments/` 归档页；首页与 `/page/N` 共用混合时间流，实测严格「文章—说说」按时间倒序交替 |
| ③ 书签导航 | `/bookmarks/` 分组卡片网格，14 个书签 / 4 组，搜索 + 锚点 + favicon 自动回退 |
| ④ 收藏四库 | 一个 `favorites` collection 驱动总览 + 4 个分类页，仿番剧的分类 Tab / 状态筛选 / 评分 / 进度 / 统计条 |

---

## 2. 参考了 Firefly 的哪些实现

先读 Firefly 源码，再决定「借玩法」而非「搬代码」——它是 Svelte + Tailwind 4 + astro-icon，本站是纯 Astro + Tailwind 3 + Bootstrap Icons，直接复制不可行。

| 功能 | Firefly 的实现 | 本站借鉴的做法 |
|---|---|---|
| 导航栏 | `config/navBarConfig.ts`（`LinkPresets` 分组）+ `components/layout/Navbar.astro` / `NavMenuPanel.astro` / `DropdownMenu.astro` + `styles/navbar.css`（毛玻璃、滚动阴影、下拉面板） | `src/config/site.ts` 的分组 `navItems` + 重写 `Header.astro`；三段式胶囊、分组下拉、滚动阴影、窄屏抽屉 |
| 说说 | `content/dynamic/*.md` + `api/dynamic.json.ts`（构建期渲染 Markdown）+ `pages/dynamic/index.astro`（Svelte 客户端搜索/年份筛选/分页） | `content/moments/*.md` + 静态 `pages/moments/index.astro`，用原生 JS 做搜索/年份过滤，不引入 Svelte |
| 书签导航 | `config/booknavConfig.ts`（分组 + weight + favicon 接口）+ `pages/booknav.astro`（页头、搜索、锚点 pills、卡片网格） | `src/config/bookmarks.ts` + `pages/bookmarks/index.astro`，同样的分组/权重/favicon 回退逻辑 |
| 番剧 | `pages/bangumi.astro` 构建时拉 Bangumi API，按 `subject_type` 分 Tab，`BangumiGrid.svelte` 做状态统计与封面网格 | `src/config/favorites.ts`（分类元数据 + statuses + 封面比例）+ `content/favorites/*.md` + `pages/favorites/[category].astro`，本地数据不依赖第三方 API |

**为什么不直接接 Bangumi API**：Firefly 的番剧页在构建时会循环请求 `api.bangumi.one`，网络不稳就会拖慢甚至打断构建；而且用户要的是四个自定义库（收藏夹/书架/片库/音乐库），不是 Bangumi 的 book/anime/music/game 分类。用本地 Markdown 更可控，还能在 Sveltia CMS 后台直接维护。

---

## 3. 导航栏改造

`src/components/Header.astro` 重写，`src/config/site.ts` 的 `navItems` 从「一排平铺分类」改成 4 组：

| 分组 | 子项 |
|---|---|
| 主页 | 单项直达 |
| 文章 | 文章归档 / 标签云 / 说说 / 站内搜索 |
| 发现 | 书签导航 / 收藏总览 / 收藏夹 / 书架 / 片库 / 音乐库 |
| 我的 | 关于我 / 主题下载 / 旅游地图 |

细节：

- 三段式网格 `auto | 1fr | auto`，胶囊卡片 `rgba(...)` + `backdrop-filter: blur(18px)`，滚动 >12px 加投影（对应 Firefly 的 `navbar-sticky-shadow`）
- 下拉支持 **hover / 键盘 focus-within / 点击** 三种展开方式，`aria-expanded` 同步；父级 `href: '#'` 不跳转
- 当前路径命中父级或任意子级都会高亮（`isNavActive()` 递归）
- 右侧工具按钮：搜索、RSS、主题、移动端菜单；图标在 1024–1100px 区间隐藏（仿 Firefly 的 `.navbar-icon` 规则）
- 窄屏（<1024px）桌面菜单隐藏，改为右侧滑出抽屉，二级用原生 `<details>` 折叠，带遮罩 / ESC / body 滚动锁
- `.site-header` 全局底色改为透明，视觉交给内部胶囊；暗色有独立配色

---

## 4. 说说与首页混合时间流

### 4.1 数据

新增 `moments` collection（`src/content/config.ts`）：`published`、`pinned`、`location`、`tags`、`author`、`avatar`、`draft`、`updatedDate`。正文写 Markdown，图片自动抽出走九宫格 + 全站 FLIP 灯箱，文字由零依赖的 `src/utils/mini-markdown.ts` 渲染。

8 条示例说说的日期**特意穿插在现有文章之间**，让首页第一打开就是交替效果。

### 4.2 混合流

`src/utils/feed.ts` 把两类内容归一成 `FeedEntry`，`index.astro` 与 `page/[page].astro` 共用 `getMixedFeed()` + `paginateFeed()`，避免第一页与第二页顺序错位。`FeedList.astro` 按 `type` 分派 `PostCard` / `MomentCard`，两类卡片都带类型徽标。

`siteConfig.home` 提供三个开关：`mixMode`（`timeline` 严格时间 / `alternate` 强制一比一）、`stickyFirst`（默认 `false`）、`showTypeBadge`。

> **一处关键修正**：原站有 3 篇置顶文章（sticky 15 / 10 / 5）。初版把置顶项提到最前，实测首页变成「文章、说说、文章、文章…」且时间跳回 1 月，破坏了「按发布时间交替」。改为 `stickyFirst: false`，置顶只保留徽标不插队。

实测首页前 8 条（`dist/index.html` 解析）：

| # | 类型 | 发布时间 |
|---|---|---|
| 1 | 文章 | 2024-10-01 00:00 |
| 2 | 说说 | 2024-09-20 14:30 |
| 3 | 文章 | 2024-09-01 00:00 |
| 4 | 说说 | 2024-08-28 08:10 |
| 5 | 文章 | 2024-08-15 00:00 |
| 6 | 说说 | 2024-07-30 21:45 |
| 7 | 文章 | 2024-07-20 00:00 |
| 8 | 说说 | 2024-06-24 12:05 |

时间严格递减、类型严格交替。第 2 页延续同一份排序，说说用完后尾部只剩文章（正常）。

### 4.3 归档页与订阅

`/moments/` 仿 Firefly 的 `/dynamic/`：页头统计、关键词搜索、年份下拉、按年份分组时间线，纯前端过滤。RSS / Atom 也接了混合流，`feed.includeMoments` 默认 `false`（只订阅文章），开启后说说会以 `短内容 · 说说` 进订阅，链接指向 `#moment-<id>` 锚点（归档页已加对应 id）。

---

## 5. 书签导航

`src/config/bookmarks.ts` 是唯一数据源（仿 Firefly 的 `booknavConfig.ts`）：4 组 14 条，字段 `id / name / icon / desc / weight / items[{ title, url, desc, icon, weight }]`。

`/bookmarks/` 页头统计 + 搜索 + 分类锚点 pills，下面按分组渲染卡片网格。图标三种来源：`bi-*` 图标名、本地/远程图片、自动 favicon（`https://a.favicon.im/{domain}`）；**favicon 取不到时回退名称首字母**，不会裂图。

书签导航刻意**不放进 CMS**：它是 TS 配置文件，用 CMS 的 Markdown 编辑器打开会写坏文件。改配置 → 构建 → 部署即可。

---

## 6. 收藏夹 / 书架 / 片库 / 音乐库

### 6.1 架构

- 数据：`content/favorites/*.md`（10 条示例），字段 `title / category / cover / description / status / rating / progress / url / creator / year / tags / addedAt / weight / draft`，正文写短评
- 分类元数据：`src/config/favorites.ts`，定义名称、图标、强调色、封面比例、单位、状态标签、是否显示进度
- 页面：`/favorites/` 总览 + `/favorites/[category].astro` 动态路由（由 `favoriteCategories` 生成 4 个静态页）
- 卡片：`FavoriteCard.astro` 统一渲染封面、状态徽标、评分、进度条、标签、外链、可折叠短评

| 页面 | 分类键 | 封面比例 | 状态 | 示例数 |
|---|---|---|---|---|
| `/favorites/bookmarks` 收藏夹 | `bookmarks` | 1:1 | 待读 / 在读 / 已读 / 精选 | 2 |
| `/favorites/books` 书架 | `books` | 2:3 | 想读 / 在读 / 读过 / 最爱 | 3 |
| `/favorites/movies` 片库 | `movies` | 2:3 | 想看 / 在看 / 看过 / 最爱 | 3 |
| `/favorites/music` 音乐库 | `music` | 1:1 | 想听 / 在听 / 听过 / 循环 | 2 |

分类页有 Tab 切换、状态筛选 pills（带计数）、关键词搜索、统计条（平均评分 / 已完成 / 进行中 / 已评分），对应 Firefly `BangumiGrid` 的分类 Tab + 统计 + 网格。

10 张封面是本地生成的渐变 SVG（`public/images/favorites/`），含中文标题与副标题，零外链依赖。视觉验收时修了两处：封面自带的角标与状态徽标重叠 → 去掉角标；总览页混排 2:3 与 1:1 导致卡片高低不齐 → 总览统一 1:1。

---

## 7. 配置驱动与页面开关验证

`pageToggles` 从 5 项扩到 8 项（`moments` / `bookmarks` / `favorites`）。`visibleNavItems()` 改为**递归过滤**子菜单，分组无可用子项则整组隐藏。

实测把 `moments: false` 后重新构建：

| 检查项 | 结果 |
|---|---|
| `/moments/` | 渲染 404 内容 ✓ |
| 导航 / 页脚「说说」入口 | 全部消失 ✓ |
| sitemap | 不含 `/moments` ✓ |
| 首页 | **回到纯文章流**（0 条说说卡片、0 个 `href="/moments"`） ✓ |

> 这里发现并补了一个漏洞：初版 `getMixedFeed()` 没读页面开关，关闭后首页仍在渲染说说卡片，且 `MomentCard` 的「全部说说」链接指向 404。修复：`feed.ts` 关闭时返回空说说数组，`FeedList` 把 `showArchiveLink` 绑定到 `isPageEnabled('moments')`。

`sitemap.xml.ts` 的分页页数也改为按混合流计算（现在 3 页），并新增 7 个页面 URL，总计 58 条。

---

## 8. CMS 与内容体检

`public/admin/config.yml` 新增 `moments`、`favorites` 两个 collection，YAML 解析校验通过：

```
collections: ['posts', 'moments', 'favorites']
fields: {'posts': 16, 'moments': 9, 'favorites': 16}
```

**关键约定**：CMS 保存已有条目会重写整个 frontmatter，未列在 `fields` 里的字段会被抹掉，所以每个 collection 都把对应 schema 字段列全了（顺便给 `posts` 补上了原先漏掉的 `images`）。

说说与另外两个 collection 有一处刻意不同：说说的 `fields` 里**没有 `slug`**（用 `{{year}}-{{month}}-{{day}}-...` 自动生成文件名），避免 Astro 把 frontmatter `slug` 当条目 ID；文章和收藏保留 `slug` 字段，10 个收藏示例已补上与文件名一致的值。

`scripts/check-content.mjs` 从只查 posts 扩展到三个目录：别名一致性、别名重复、必填字段、日期合法性、`category` 枚举、`rating`/`progress` 范围。当前输出 `文章 16 · 说说 8 · 收藏 10 全部通过`。

---

## 9. 新增与修改文件

**新增**
- 配置：`src/config/bookmarks.ts`、`src/config/favorites.ts`
- 工具：`src/utils/feed.ts`、`src/utils/mini-markdown.ts`
- 组件：`MomentCard.astro`、`FeedList.astro`、`FavoriteCard.astro`、`PageHeader.astro`
- 页面：`moments/index.astro`、`bookmarks/index.astro`、`favorites/index.astro`、`favorites/[category].astro`
- 内容：`content/moments/` 8 篇、`content/favorites/` 10 篇、`public/images/favorites/` 10 张 SVG

**重写 / 修改**
- `config/site.ts`（分组导航、8 个开关、home / feed 配置）、`content/config.ts`（3 个 collection）
- `components/Header.astro`（Firefly 风格）、`components/PostCard.astro`（类型徽标 + 置顶徽标）
- `styles/global.css`（header 底色透明化）
- `pages/index.astro`、`pages/page/[page].astro`（混合流）
- `pages/rss.xml.ts`、`atom.xml.ts`、`sitemap.xml.ts`
- `public/admin/config.yml`、`scripts/check-content.mjs`
- `站点管理与设置教程.md/.html` v3.0、`PROJECT_SUMMARY.md`

---

## 10. 验收数据

| 项 | 结果 |
|---|---|
| 构建 | `60 page(s) built in 5.0s`，无报错 |
| 内容体检 | 文章 16 · 说说 8 · 收藏 10，全通过 |
| 新页面产物 | `/moments`、`/bookmarks`、`/favorites`、`/favorites/{bookmarks,books,movies,music}` 全部生成 |
| sitemap | 58 条 URL，含 7 个新路由 + `/page/3` |
| RSS / Atom | 各 16 item/entry（`includeMoments=false`），XML 合法 |
| 导航 DOM | 3 个下拉父级、13 个子项；下拉展开实测 6 项齐全 |
| 视觉 | 首页浅/暗、说说、书签、收藏总览、书架浅/暗均实拍；封面裂图 0 |
| 窄屏 | CDP 强制 390px：`scrollWidth=390`（无横向溢出）、桌面菜单 `display:none`、菜单按钮 `flex`、抽屉与遮罩正常 |
| 页面开关 | `moments=false` 五项联动全部通过（见第 7 节） |

---

## 11. 未做项与后续建议

- **未接 Pagefind / Giscus / 真实浏览量**：本轮聚焦四个需求，这些仍属于此前的 P1/P2 清单。
- **书签导航未进 CMS**：刻意如此（TS 配置）。若确实需要后台管理，可改成 `content/links/*.json` 的 data collection，但要评估 Sveltia 对 JSON 编辑的支持。
- **收藏封面**：目前是示例 SVG，建议替换成真实封面并统一放到 `public/images/uploads/`（CMS 上传目录）。
- **移动端抽屉**：二级分组默认折叠；若想默认展开当前所在组，`<details open={active}>` 已支持，把 `active` 判定放宽即可。

---

## 12. 回滚方法

```bash
cd /Users/ming/mango-astro
git log --oneline -8                 # 找到本轮之前的提交
git revert --no-commit <本轮提交>     # 或 git reset --hard <commit>（会丢未提交改动，慎用）
git commit -m "回滚 Firefly 功能移植" && git push
npm run build
wrangler pages deploy dist --project-name mango-astro --branch main --commit-dirty=true
```

也可在 Cloudflare Pages 的 Deployments 里直接把上一版设为 Production。只回滚代码不会自动回滚线上，必须重新构建部署。

---

## 13. 数据来源与自洽校验

- 首页顺序表来自对 `dist/index.html` 的逐卡片解析（类型 + 时间），非推测。
- 页面开关验证来自临时把 `moments` 改 `false` 后的真实构建产物，验证后已恢复 `true` 并重建。
- 60 页 / 58 URL / 16 item / 16 entry / 16+8+10 条内容分别来自构建日志、`dist/sitemap.xml`、`dist/rss.xml`、`dist/atom.xml` 与 `check-content` 输出，彼此对得上。
- 390px 无横向溢出的结论来自 CDP `Emulation.setDeviceMetricsOverride` 的真实视口测量（`scrollWidth=390`），而非无头 Chrome 的 `--window-size` —— 后者有最小窗口宽度限制，会给出假的裁切。
- Firefly 参考文件均实际读取：`navBarConfig.ts`、`navbar.css`、`Navbar.astro`、`dynamicConfig.ts`、`api/dynamic.json.ts`、`dynamic/index.astro`、`booknavConfig.ts`、`booknav.astro`、`bangumi.astro`。
