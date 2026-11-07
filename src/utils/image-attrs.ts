/**
 * 图片属性生成器（P0-2）
 *
 * 只返回「属性对象」，不渲染 DOM —— 各组件继续自己写 <img {...imageAttrs(...)} />，
 * 这样 <img> 仍留在父组件模板里，Astro scoped CSS 的 data-astro-cid 不会丢失
 * （若抽成子组件，子组件根节点拿不到父组件的 scope id，样式会整片失效）。
 *
 * 未知图片（外链、SVG、新增但还没跑 npm run images 的图）原样返回，保证安全回退。
 */
import manifest from '../data/image-manifest.json';

type VariantMap = Record<string, string>;
interface ImageMeta {
  width: number;
  height: number;
  default: string;
  variants: VariantMap;
}

const INDEX = manifest as Record<string, ImageMeta>;

export interface ImageAttrsOptions {
  /** 告诉浏览器这个位置实际会显示多宽，用于从 srcset 里挑档 */
  sizes?: string;
  loading?: 'lazy' | 'eager';
  /** 首屏 LCP 图（如轮播第一张）设 high */
  fetchpriority?: 'high' | 'low' | 'auto';
}

const DEFAULT_SIZES = '(max-width: 640px) 100vw, 800px';

export function imageAttrs(src: string | undefined | null, options: ImageAttrsOptions = {}) {
  const original = src || '';
  const meta = original ? INDEX[original] : undefined;

  if (!meta) {
    return {
      src: original,
      loading: options.loading ?? 'lazy',
      decoding: 'async' as const,
      ...(options.fetchpriority ? { fetchpriority: options.fetchpriority } : {}),
    };
  }

  const srcset = Object.entries(meta.variants)
    .map(([width, url]) => `${url} ${width}w`)
    .join(', ');

  return {
    src: meta.default,
    srcset,
    sizes: options.sizes ?? DEFAULT_SIZES,
    // 真实宽高只用于提供宽高比、消除 CLS；显示尺寸仍由组件 CSS 决定
    width: meta.width,
    height: meta.height,
    loading: options.loading ?? 'lazy',
    decoding: 'async' as const,
    ...(options.fetchpriority ? { fetchpriority: options.fetchpriority } : {}),
  };
}
