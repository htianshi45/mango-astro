/**
 * Giscus 评论配置。
 *
 * 启用步骤：
 * 1. 准备一个公开的 GitHub 仓库，并在 Settings → General → Features 勾选 Discussions；
 * 2. 到 https://giscus.app/ 输入仓库名，获取 repoId 与 categoryId（推荐分类 Announcements）；
 * 3. 把下面的 repo / repoId / categoryId 填好，并把 enabled 设为 true；
 * 4. 在仓库安装 giscus app 并授权。
 *
 * 未配置时评论区会显示「评论未启用」占位块，不会注入任何会报错的脚本。
 */
export interface GiscusConfig {
  enabled: boolean;
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: string;
  lang: string;
}

export const giscusConfig: GiscusConfig = {
  enabled: false,
  repo: '', // 形如 'yourname/yourrepo'
  repoId: '', // 从 giscus.app 获取
  category: 'Announcements',
  categoryId: '', // 从 giscus.app 获取
  mapping: 'pathname',
  lang: 'zh-CN',
};

export const isGiscusConfigured =
  giscusConfig.enabled &&
  Boolean(giscusConfig.repo && giscusConfig.repoId && giscusConfig.categoryId);
