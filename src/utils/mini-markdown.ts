/**
 * 极简 Markdown 行内渲染（零依赖）
 *
 * 说说卡片把图片抽出来单独走九宫格灯箱，剩下的文字只需要段落 / 加粗 /
 * 斜体 / 行内代码 / 链接这几种标记。不引 remark 是为了让组件保持静态、
 * 构建更快，也避免把正文图片再渲染一遍。
 *
 * 所有输入先做 HTML 转义；链接只允许 http(s) / 站内相对路径 / 锚点，
 * 防止 javascript: 之类的协议混进来。
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(raw: string): string {
  const href = raw.replace(/&amp;/g, '&').trim();
  if (/^(https?:\/\/|\/|#|mailto:)/i.test(href)) {
    return `href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"`;
  }
  return 'href="#"';
}

function renderInline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text: string, url: string) => `<a ${safeHref(url)}>${text}</a>`)
    .replace(/\n/g, '<br />');
}

export function renderMomentText(text: string): string {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const escaped = escapeHtml(block);
      // 以 # 开头当作小标题，其余当作段落
      const heading = /^#{1,3}\s+(.+)$/.exec(block);
      if (heading) {
        return `<h3>${renderInline(escapeHtml(heading[1]))}</h3>`;
      }
      return `<p>${renderInline(escaped)}</p>`;
    })
    .join('');
}
