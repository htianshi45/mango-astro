/**
 * 文章字数 / 阅读时长估算
 *
 * 中文按字计数，英文按词计数（一个英文单词 ≈ 一个汉字的信息量），
 * 阅读速度取 300 字/分钟。只在列表卡片上展示，不追求精确。
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const plain = text
    // 去掉 Markdown 图片、链接地址、代码块围栏，避免把 URL 算成字数
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ');

  const cjk = plain.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const latin = plain
    .replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ')
    .match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g)?.length ?? 0;

  return cjk + latin;
}

/** 阅读时长（分钟，向上取整，最少 1 分钟） */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 300));
}

/** 字数展示：过千折成 1.2k */
export function formatWords(words: number): string {
  if (words >= 1000) return `${(words / 1000).toFixed(1)}k`;
  return String(words);
}
