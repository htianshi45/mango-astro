#!/usr/bin/env python3
"""
Bootstrap Icons 子集生成（P0-3）

为什么要做：
  站点每页都引完整的 bootstrap-icons.css（97KB，2078 条规则）+ woff2（131KB），
  但实际只用到 73 个图标。按真实用量裁剪后 CSS 与字体都降到十几 KB。

怎么用：
  npm run icons
  在 CMS 里选用了清单外的新图标时，重跑一次即可（脚本会自动扫描全站源码）。

实现：
  1. 扫描 src/ 与 public/js/ 里出现的 bi-* 类名
  2. 合并 EXTRA_ICONS（后台常用的备选图标，避免选完显示空白）
  3. 从官方 CSS 解析 类名 -> Unicode 码位 的映射
  4. 用 fontTools 的 pyftsubset 裁出 woff2 字形子集
  5. 生成只含这些类名的精简 CSS
  原始完整文件保留不动，随时可回退。
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_IN = os.path.join(ROOT, 'public/fonts/bootstrap-icons.css')
FONT_IN = os.path.join(ROOT, 'public/fonts/fonts/bootstrap-icons.woff2')
FONT_OUT = os.path.join(ROOT, 'public/fonts/fonts/bootstrap-icons.subset.woff2')
CSS_OUT = os.path.join(ROOT, 'public/fonts/bootstrap-icons.subset.css')

# 后台可能在「导航栏 / 书签 / 收藏」里选到、但当前内容尚未使用的常用图标。
# 宁可多留一点（每个字形只有几十字节），也别让 CMS 选完出现空白。
EXTRA_ICONS = """
bi-house-door bi-house-door-fill bi-card-text bi-images bi-camera bi-camera-fill
bi-bookmark bi-bookmark-fill bi-collection bi-compass bi-globe2 bi-envelope
bi-link bi-telegram bi-twitter-x bi-mastodon bi-mortarboard bi-briefcase
bi-cup-hot bi-airplane bi-bicycle bi-car-front bi-train-front bi-sun bi-moon
bi-moon-stars bi-star bi-quote bi-chat bi-chat-dots bi-chat-heart
bi-hand-thumbs-up bi-hand-thumbs-up-fill bi-award bi-trophy bi-lightbulb
bi-laptop bi-phone bi-tablet bi-cpu bi-hdd bi-server bi-display bi-printer
bi-wifi bi-cloud bi-cloud-sun bi-umbrella bi-snow bi-thermometer bi-tree
bi-flower1 bi-vinyl bi-disc bi-mic bi-headphones bi-volume-down bi-play-circle
bi-youtube bi-pinterest bi-linkedin bi-wechat bi-alipay bi-paypal
bi-bar-chart bi-pie-chart bi-graph-up bi-speedometer2 bi-activity
bi-brush bi-easel bi-palette-fill bi-vector-pen bi-pen bi-pencil
bi-calendar bi-calendar-check bi-alarm bi-stopwatch bi-hourglass
bi-bookmark-check bi-bookmarks-fill bi-journal-bookmark bi-journal-richtext
bi-file-earmark-text bi-files bi-folder-symlink bi-box bi-box-seam
bi-flag bi-tag bi-tags-fill bi-bell bi-bookmark-plus bi-plus-lg bi-dash-lg
""".split()

ICON_RE = re.compile(r'\bbi-[a-z0-9]+(?:-[a-z0-9]+)*')
RULE_RE = re.compile(r'^\.(bi-[a-z0-9-]+)::before\s*\{\s*content:\s*"\\(f[0-9a-f]+)";\s*\}', re.M)

BASE_RULE = '''.bi::before,
[class^="bi-"]::before,
[class*=" bi-"]::before {
  display: inline-block;
  font-family: bootstrap-icons !important;
  font-style: normal;
  font-weight: normal !important;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  vertical-align: -.125em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}'''


def scan_used_icons():
    used = set()
    for root in ('src', 'public/js'):
        base = os.path.join(ROOT, root)
        for cur, _dirs, files in os.walk(base):
            for name in files:
                if not name.endswith(('.astro', '.ts', '.tsx', '.js', '.mjs', '.css', '.json', '.md', '.mdx', '.yml', '.html')):
                    continue
                path = os.path.join(cur, name)
                try:
                    with open(path, encoding='utf-8') as fh:
                        used.update(ICON_RE.findall(fh.read()))
                except (OSError, UnicodeDecodeError):
                    pass
    return used


def main():
    try:
        import fontTools  # noqa: F401
    except ImportError:
        sys.exit('缺少 fontTools，请先执行：/Users/ming/.workbuddy/binaries/python/envs/default/bin/python -m pip install fonttools brotli')

    with open(CSS_IN, encoding='utf-8') as fh:
        css = fh.read()
    mapping = dict(RULE_RE.findall(css))

    used = scan_used_icons()
    wanted = sorted(used | set(EXTRA_ICONS))
    missing = [name for name in wanted if name not in mapping]
    kept = [name for name in wanted if name in mapping]
    if missing:
        print(f'  ! 官方 CSS 中找不到的类名（已跳过）: {", ".join(missing)}')

    codepoints = sorted({mapping[name] for name in kept})
    unicodes = ','.join('U+' + cp for cp in codepoints)

    pyftsubset = os.path.join(os.path.dirname(sys.executable), 'pyftsubset')
    if not os.path.exists(pyftsubset):
        pyftsubset = 'pyftsubset'
    subprocess.run(
        [pyftsubset, FONT_IN, f'--unicodes={unicodes}', '--flavor=woff2',
         f'--output-file={FONT_OUT}', '--no-hinting'],
        check=True,
    )

    rules = '\n'.join(f'.{name}::before {{ content: "\\{mapping[name]}"; }}' for name in kept)
    out = f'''/*!
 * Bootstrap Icons v1.13.2 · 站点子集（由 scripts/subset-icons.py 生成，请勿手改）
 * 用法：在源码/CMS 里新增 bi-* 图标后执行 npm run icons 重新生成。
 * 原始完整文件：bootstrap-icons.css / fonts/bootstrap-icons.woff2
 */
@font-face {{
  font-display: block;
  font-family: "bootstrap-icons";
  src: url("./fonts/bootstrap-icons.subset.woff2") format("woff2");
}}

{BASE_RULE}

{rules}
'''
    with open(CSS_OUT, 'w', encoding='utf-8') as fh:
        fh.write(out)

    before_css = os.path.getsize(CSS_IN)
    before_font = os.path.getsize(FONT_IN)
    after_css = os.path.getsize(CSS_OUT)
    after_font = os.path.getsize(FONT_OUT)
    print(f'  图标字形 {len(codepoints)} 个（源码扫描 {len(used)} + 备选 {len(EXTRA_ICONS)}）')
    print(f'  CSS   {before_css / 1024:.1f}KB -> {after_css / 1024:.1f}KB')
    print(f'  WOFF2 {before_font / 1024:.1f}KB -> {after_font / 1024:.1f}KB')
    print(f'  合计节省 {(before_css + before_font - after_css - after_font) / 1024:.1f}KB / 每页')


if __name__ == '__main__':
    main()
