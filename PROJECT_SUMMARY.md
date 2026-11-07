# 🥭 Mango Astro - 项目总结

## 项目概述

成功将 WordPress 的 Mango 主题复刻为基于 Astro 的静态站点，保留了核心的微信朋友圈风格布局，并集成了现代化的内容管理和部署方案。

> **维护状态（2026-11-07 更新，v3）**：本文件是项目初版总结，部分描述已过时，请以源码与《站点管理与设置教程》为准。后台已从 Decap CMS 换成 Sveltia CMS（中文界面），入口为 `src/pages/admin.astro`；站点设置已集中到 `src/config/site.ts`；已新增 RSS / Atom / sitemap、SEO（canonical / OG / JSON-LD）、文章页 TOC / 字数 / 阅读时间 / 阅读进度 / 上下篇 / 分享 / 复制链接、FLIP 图片灯箱、统一页面开关、构建前内容体检。
>
> **本轮（参考 Firefly 主题）新增**：分组下拉导航栏（桌面胶囊 + 窄屏抽屉）、说说（`moments` collection）与首页「文章 + 说说」混合时间流、书签导航（分组配置 + 搜索）、收藏夹 / 书架 / 片库 / 音乐库（统一 `favorites` collection 驱动四个分类页）。详见《Firefly功能移植-实施报告》与教程第 11 章。

## 已完成的功能

### ✅ 核心功能

1. **微信朋友圈式布局**
   - 时间线式卡片展示
   - 图片画廊（支持 1/2/3/4/9 宫格）
   - 置顶文章功能
   - 作者头像和信息展示
   - 时间戳格式化

2. **暗黑模式**
   - 主题切换按钮
   - localStorage 持久化
   - 系统偏好检测
   - 无闪烁加载

3. **响应式设计**
   - 移动端优先
   - 断点：sm/md/lg/xl/2xl
   - 自适应导航菜单
   - 触控友好的交互

4. **侧边栏组件**
   - 热门文章（带排名）
   - 标签云（动态大小）
   - 最新文章列表

### ✅ 内容管理

1. **Sveltia CMS 集成**
   - 可视化后台界面
   - GitHub 认证
   - Markdown 编辑
   - 图片上传支持
   - 草稿和发布状态

2. **内容结构**
   - 文章集合 `posts`（16 篇示例）
   - 说说集合 `moments`（8 条示例，与文章共用首页时间流）
   - 收藏集合 `favorites`（10 条示例，驱动 4 个分类页）
   - 标签系统 / 分类支持 / 置顶权重 / 浏览量统计
   - `npm run check:content` 构建前体检三个 collection（别名、日期、必填、枚举、数值范围）

### ✅ 页面路由

1. **首页** (`/`) - 文章与说说按发布时间混合的时间流（可切换严格交替）
2. **分页** (`/page/[page]`) - 与首页共用同一份混合流排序
3. **文章详情** (`/posts/[slug]`) - 完整文章内容 + 阅读基建 + SEO
4. **说说归档** (`/moments`) - 按年份分组、搜索与年份筛选
5. **书签导航** (`/bookmarks`) - 分组卡片网格、搜索与锚点
6. **收藏总览** (`/favorites`) - 四库入口 + 最近添加
7. **收藏分类** (`/favorites/[category]`) - `bookmarks` / `books` / `movies` / `music` 四页
8. **归档页** (`/archive`)、**标签页** (`/tags`)、**标签详情** (`/tags/[tag]`)、**分类详情** (`/categories/[slug]`)
9. **搜索 / 关于 / 主题下载 / 旅游地图 / 后台 / 404**
10. **订阅与地图** (`/rss.xml`、`/atom.xml`、`/sitemap.xml`)

### ✅ 部署配置

1. **Cloudflare Pages**
   - 构建配置
   - 缓存策略
   - 自定义域名支持

2. **Cloudflare R2**
   - 图床存储桶配置
   - API 访问设置
   - 自定义域名集成

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Astro | ^5.0.0 | 静态站点框架 |
| Tailwind CSS | ^3.4.0 | 样式框架 |
| TypeScript | ^5.7.0 | 类型安全 |
| Sveltia CMS | ^3.0.0 | 内容管理 |
| @astrojs/mdx | ^4.0.0 | Markdown 支持 |
| @tailwindcss/typography | ^0.5.10 | 排版样式 |

## 项目结构

```
mango-astro/
├── public/
│   ├── admin/
│   │   ├── index.html          # CMS 入口
│   │   └── config.yml          # CMS 配置
│   ├── images/
│   │   └── default-avatar.svg  # 默认头像
│   └── favicon.svg             # 站点图标
├── src/
│   ├── components/
│   │   ├── Header.astro        # 页头导航
│   │   ├── Footer.astro        # 页脚
│   │   ├── ThemeScript.astro   # 主题切换脚本
│   │   ├── MomentCard.astro    # 朋友圈卡片
│   │   ├── MomentImages.astro  # 图片画廊
│   │   ├── PostCard.astro      # 文章卡片
│   │   ├── Sidebar.astro       # 侧边栏容器
│   │   ├── HotPostsWidget.astro    # 热门文章
│   │   ├── RecentPostsWidget.astro # 最新文章
│   │   └── TagsWidget.astro    # 标签云
│   ├── content/
│   │   ├── config.ts           # 内容集合配置
│   │   └── posts/
│   │       ├── welcome.md      # 示例文章 1
│   │       └── my-first-photos.md  # 示例文章 2
│   ├── layouts/
│   │   └── BaseLayout.astro    # 基础布局
│   ├── pages/
│   │   ├── index.astro         # 首页
│   │   ├── archive.astro       # 归档页
│   │   ├── tags.astro          # 标签页
│   │   ├── about.astro         # 关于页
│   │   ├── 404.astro           # 404 页
│   │   ├── posts/
│   │   │   └── [slug].astro    # 文章详情
│   │   └── tags/
│   │       └── [tag].astro     # 标签详情
│   └── styles/
│       └── global.css          # 全局样式
├── astro.config.mjs            # Astro 配置
├── tailwind.config.mjs         # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
├── wrangler.toml               # Cloudflare 配置
├── package.json                # 依赖配置
├── .gitignore                  # Git 忽略
├── README.md                   # 项目说明
├── DEPLOYMENT.md               # 部署指南
└── quickstart.sh               # 快速启动脚本
```

## 快速开始

### 1. 安装依赖

```bash
cd mango-astro
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
# 或使用快速启动脚本
./quickstart.sh
```

### 3. 访问站点

- 站点首页：http://localhost:4321
- CMS 后台：http://localhost:4321/admin

### 4. 构建生产版本

```bash
npm run build
```

### 5. 预览生产版本

```bash
npm run preview
```

## 部署步骤

详细的部署指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 简要步骤

1. **推送代码到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO
   git push -u origin main
   ```

2. **配置 Cloudflare Pages**
   - 登录 Cloudflare Dashboard
   - 创建 Pages 应用
   - 连接 GitHub 仓库
   - 设置构建命令：`npm run build`
   - 设置输出目录：`dist`

3. **配置 Sveltia CMS**
   - 编辑 `public/admin/config.yml`
   - 更新 repo 为你的 GitHub 仓库
   - 配置 OAuth 认证

4. **配置 R2 图床**
   - 创建 R2 存储桶
   - 生成 API 令牌
   - 更新 CMS 配置

## 自定义配置

### 修改主题颜色

编辑 `tailwind.config.mjs`：

```javascript
colors: {
  mango: {
    light: '#ff6b6b',
    DEFAULT: '#ff5252',
    dark: '#e64545',
  },
},
```

### 修改站点信息

编辑 `astro.config.mjs`：

```javascript
export default defineConfig({
  site: 'https://your-domain.com',
});
```

### 添加新页面

在 `src/pages/` 目录下创建新的 `.astro` 文件。

## 性能优化

已内置的优化：

- ✅ 静态站点生成（SSG）
- ✅ 图片懒加载
- ✅ CSS/JS 压缩
- ✅ 缓存策略配置
- ✅ 响应式图片支持
- ✅ 暗黑模式无闪烁

可进一步优化的方向：

- 使用 Cloudflare Images 进行图片优化
- 集成分析工具（Google Analytics / Plausible）
- 添加 PWA 支持
- 配置 Service Worker

## 待完善功能

### 已完成（2026-11-07）

- [x] 搜索功能（客户端过滤 frontmatter，**暂不搜正文**）
- [x] 文章目录（TOC）、阅读进度条、字数与阅读时间
- [x] 分享 / 复制链接、上一篇 / 下一篇、相关文章推荐
- [x] sitemap.xml、RSS 2.0、Atom 1.0
- [x] canonical / OpenGraph / Twitter card / JSON-LD
- [x] FLIP 原位放大灯箱（滑动、缩放、拖拽）
- [x] 统一配置 `src/config/site.ts` + 页面开关

### 仍待完善

- [ ] 评论系统（Giscus 配置骨架已就位，填 `comment.ts` 三个参数即可启用）
- [ ] 全文搜索（Pagefind，中文分词需单独验证）
- [ ] 说说 / 动态流、相册页、友链页
- [ ] 浏览量真实化（当前 `views` 为 frontmatter 静态数字）

### 高级功能

- [ ] 多语言支持（i18n）
- [ ] 文章系列/专栏
- [ ] 会员系统
- [ ] 付费内容
- [ ] 统计分析后台

## 已知问题

无重大问题。如有问题请查看：
- [Astro 文档](https://docs.astro.build/)
- [Cloudflare 文档](https://developers.cloudflare.com/)
- [Sveltia CMS 文档](https://decapcms.org/docs/)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

- GitHub: [@yourusername](https://github.com)
- Email: your@email.com
- Twitter: [@yourusername](https://twitter.com)

---

🥭 **项目已完成！祝你使用愉快！**
