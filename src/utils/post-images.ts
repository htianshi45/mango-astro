/** 从 Markdown 正文按出现顺序提取图片地址（含重复，用于九宫格 +N 计数）。 */
export function extractImages(body: string): string[] {
  const images: string[] = [];
  const markdown = /!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
  const html = /<img[^>]+src=["']([^"']+)["']/gi;

  for (const match of body.matchAll(markdown)) images.push(match[1]);
  for (const match of body.matchAll(html)) images.push(match[1]);

  return images;
}
