# 🚀 部署指南

## 快速部署到 Cloudflare Pages

### 前置准备

1. 拥有 GitHub 账号
2. 拥有 Cloudflare 账号（免费注册：https://dash.cloudflare.com/sign-up）
3. 将项目推送到 GitHub 仓库

### 步骤一：推送代码到 GitHub

```bash
cd mango-astro
git init
git add .
git commit -m "Initial commit: Mango Astro theme"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 步骤二：配置 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单选择 **Workers & Pages**
3. 点击 **Create application**
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**

### 步骤三：连接 GitHub 仓库

1. 授权 Cloudflare 访问你的 GitHub
2. 选择 `mango-astro` 仓库
3. 点击 **Begin setup**

### 步骤四：配置构建设置

填写以下信息：

- **Framework preset**: 选择 `Astro`（或 None）
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/`（保持默认）
- **Environment variables**: 
  - 点击 **Add variable**
  - Name: `NODE_VERSION`
  - Value: `20`

### 步骤五：部署

1. 点击 **Save and Deploy**
2. 等待构建完成（约 2-3 分钟）
3. 部署成功后会生成一个域名：`https://YOUR_PROJECT.pages.dev`

### 步骤六：配置自定义域名（可选）

1. 在 Pages 应用详情页，点击 **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入你的域名（如 `blog.yourdomain.com`）
4. 按照提示添加 DNS 记录

## 配置 Decap CMS

### 步骤一：更新 CMS 配置

编辑 `public/admin/config.yml`：

```yaml
backend:
  name: github
  repo: YOUR_USERNAME/YOUR_REPO  # 替换为你的仓库
  branch: main
```

### 步骤二：配置 OAuth 认证

1. 访问 [Netlify OAuth](https://github.com/decaporg/decap-cms/blob/main/docs/authentication-backends.md#github-backend)
2. 创建 GitHub OAuth App
3. 获取 Client ID 和 Client Secret
4. 在 Cloudflare Pages 添加环境变量：
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

### 步骤三：测试 CMS

1. 访问 `https://YOUR_PROJECT.pages.dev/admin`
2. 使用 GitHub 账号登录
3. 尝试创建和编辑文章

## 配置 Cloudflare R2 图床

### 步骤一：创建 R2 存储桶

1. 登录 Cloudflare Dashboard
2. 左侧菜单选择 **R2 对象存储**
3. 点击 **创建存储桶**
4. 输入名称：`mango-images`
5. 选择区域：亚太（推荐）
6. 点击 **创建存储桶**

### 步骤二：配置 R2 API

1. 在 R2 详情页，点击 **管理 R2 API 令牌**
2. 点击 **创建 API 令牌**
3. 选择 **对象读和写** 权限
4. 记录以下信息：
   - Access Key ID
   - Secret Access Key
   - Account ID

### 步骤三：配置自定义域名（可选）

1. 在 R2 存储桶详情页，点击 **设置**
2. 在 **自定义域名** 部分，点击 **添加域名**
3. 输入：`images.yourdomain.com`
4. 按照提示配置 DNS

### 步骤四：更新 CMS 配置

编辑 `public/admin/config.yml`，添加：

```yaml
media_library:
  name: cloudflare-r2
  config:
    bucket: mango-images
    accountId: YOUR_ACCOUNT_ID
    accessKeyId: YOUR_ACCESS_KEY_ID
    secretAccessKey: YOUR_SECRET_ACCESS_KEY
    endpoint: https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

## 常见问题

### Q: 构建失败怎么办？

A: 检查以下几点：
1. Node.js 版本是否为 20+
2. 依赖是否正确安装
3. 查看构建日志中的错误信息

### Q: CMS 无法登录？

A: 检查以下几点：
1. `config.yml` 中的 repo 是否正确
2. GitHub OAuth 配置是否正确
3. 环境变量是否已设置

### Q: 图片无法上传？

A: 检查以下几点：
1. R2 存储桶是否已创建
2. API 令牌权限是否正确
3. CORS 配置是否允许上传

### Q: 如何更新站点？

A: 推送代码到 GitHub 后，Cloudflare Pages 会自动重新部署。

## 性能优化建议

1. **启用缓存**：已在 `wrangler.toml` 中配置
2. **图片优化**：使用 WebP 格式，压缩图片
3. **CDN 加速**：Cloudflare 自动提供全球 CDN
4. **懒加载**：图片已配置 `loading="lazy"`

## 监控和分析

1. 在 Cloudflare Dashboard 查看：
   - 流量统计
   - 性能指标
   - 错误日志

2. 可集成第三方分析工具：
   - Google Analytics
   - Plausible Analytics
   - Umami Analytics

---

如有其他问题，请查阅：
- [Astro 文档](https://docs.astro.build/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Decap CMS 文档](https://decapcms.org/docs/)
