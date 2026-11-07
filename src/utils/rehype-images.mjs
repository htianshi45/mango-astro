/**
 * Markdown 正文图片优化（P0-2）
 *
 * 正文里的 <img> 由 Astro 的 Markdown 管线渲染，无法用组件替换，
 * 所以在 rehype 阶段改写 hast 节点属性：换成 WebP + srcset + 真实宽高。
 * 与 src/utils/image-attrs.ts 共用同一份 manifest，未收录的图片原样放过。
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../data/image-manifest.json', import.meta.url));

function readIndex() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    // 首次 clone 还没跑 npm run images 时不阻断构建，退化为原图
    return {};
  }
}

function visit(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child, fn);
  }
}

export function rehypeOptimizeImages() {
  const index = readIndex();
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'img') return;
      const props = node.properties || {};
      const src = String(props.src || '');
      const meta = index[src];
      if (!meta) return;

      props.src = meta.default;
      props.srcSet = Object.entries(meta.variants)
        .map(([width, url]) => `${url} ${width}w`)
        .join(', ');
      props.sizes = '(max-width: 900px) 100vw, 844px';
      props.width = meta.width;
      props.height = meta.height;
      props.style = `background-image:url('${meta.blur}');background-size:cover;background-position:center;`;
      props.loading = 'lazy';
      props.decoding = 'async';
    });
  };
}
