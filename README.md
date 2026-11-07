# 🥭 Mango Astro

一个基于 Astro 构建的微信朋友圈风格图片博客主题。

## ✨ 特性

- 📱 **响应式设计** - 完美适配各种设备
- 🌙 **暗黑模式** - 保护你的眼睛
- 🎨 **微信朋友圈风格** - 熟悉的交互体验
- ⚡ **极速加载** - Astro 构建的静态站点
- 📝 **Markdown 支持** - 方便的内容管理
- 🖼️ **图片画廊** - 优雅的图片展示
- 🔧 **Decap CMS** - 可视化内容管理
- ☁️ **Cloudflare 部署** - 快速稳定的托管

## 🚀 快速开始

### 1. 安装依赖

```bash
cd mango-astro
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:4321` 查看站点。

### 3. 构建生产版本

```bash
npm run build
```

### 4. 预览生产版本

```bash
npm run preview
```

## 📝 内容管理

### 使用 Decap CMS

1. 访问 `/admin` 路径进入后台管理界面
2. 使用 GitHub 账号登录
3. 创建和编辑文章

### 手动管理

在 `src/content/posts/` 目录下创建 Markdown 文件：

```markdown
---
title: 文章标题
description: 文章描述
pubDate: 2024-01-01
heroImage: /images/cover.jpg
author: 作者名
avatar: /images/avatar.png
tags:
  - 标签1
  - 标签2
category: 分类
sticky: 0
views: 0
draft: false
---

开头段落……

![第一张图](/images/image1.jpg)

中间段落……

![第二张图](/images/image2.jpg)

结尾段落……
```

**图片规则（与原版一致）**：图片按段落插入正文，详情页原样随文显示；首页卡片的九宫格由正文图片自动提取（按出现顺序取前 9 张，超出显示 `+N`，点击可灯箱浏览全部）。因此不需要在 frontmatter 里再维护图片列表，新增图片只要插在正文里即可。

## 🔍 站内搜索说明

原版 Mango 基于 WordPress 服务端 `?s=` 搜索。本项目是 Astro 静态站点，采用了**客户端过滤**的等价替代方案：

- 顶栏点击搜索图标 → 从顶部展开 120px 高的搜索条（与原版形态一致）；
- 提交后跳转 `/search?q=关键词`，页面把全部文章标题 / 摘要 / 标签 / 分类序列化到前端做实时过滤。

这是静态站对 WordPress 服务端搜索的合理替代，不作为与原版逐字节一致的承诺。

## ☁️ 部署到 Cloudflare Pages

### 方法一：通过 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 点击 **Create application** → **Pages**
4. 选择 **Connect to Git**
5. 选择你的 GitHub 仓库
6. 配置构建设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: `20`
7. 点击 **Save and Deploy**

### 方法二：使用 Wrangler CLI

1. 安装 Wrangler：

```bash
npm install -g wrangler
```

2. 登录 Cloudflare：

```bash
wrangler login
```

3. 部署：

```bash
npm run build
wrangler pages deploy dist --project-name=mango-astro
```

## 🖼️ 配置 Cloudflare R2 图床

### 1. 创建 R2 存储桶

1. 登录 Cloudflare Dashboard
2. 进入 **R2 对象存储**
3. 点击 **创建存储桶**
4. 输入存储桶名称（如 `mango-images`）
5. 点击 **创建存储桶**

### 2. 配置自定义域名（可选）

1. 在 R2 存储桶详情页，点击 **设置**
2. 在 **自定义域名** 部分，点击 **添加域名**
3. 输入你的域名（如 `images.yourdomain.com`）
4. 按照提示配置 DNS

### 3. 更新 Decap CMS 配置

编辑 `public/admin/config.yml`：

```yaml
media_library:
  name: cloudflare-r2
  config:
    bucket: mango-images
    accountId: YOUR_ACCOUNT_ID
    accessKeyId: YOUR_ACCESS_KEY_ID
    secretAccessKey: YOUR_SECRET_ACCESS_KEY
```

## 🎨 自定义配置

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
  // ...
});
```

## 📁 项目结构

```
mango-astro/
├── public/
│   ├── admin/          # Decap CMS 后台
│   └── images/         # 静态图片资源
├── src/
│   ├── components/     # Astro 组件
│   ├── content/
│   │   └── posts/      # Markdown 文章
│   ├── layouts/        # 页面布局
│   ├── pages/          # 页面路由
│   └── styles/         # 全局样式
├── astro.config.mjs    # Astro 配置
├── tailwind.config.mjs # Tailwind 配置
└── package.json
```

## 🛠️ 技术栈

- **框架**: [Astro](https://astro.build/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **CMS**: [Decap CMS](https://decapcms.org/)
- **部署**: [Cloudflare Pages](https://pages.cloudflare.com/)
- **图床**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

- GitHub: [@yourusername](https://github.com)
- Email: your@email.com
- Twitter: [@yourusername](https://twitter.com)

---

🥭 Made with love by Mango Theme
