#!/usr/bin/env python3
"""生成「稍后阅读」PWA 图标：靛蓝圆角方块 + 白色书签。
用法：python3 scripts/gen-icons.py
输出到 public/icons/：icon-192.png / icon-512.png / icon-maskable-512.png / icon-180.png / icon.svg
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(OUT, exist_ok=True)

PRIMARY = (79, 70, 229, 255)      # #4f46e5 靛蓝
WHITE = (255, 255, 255, 255)


def draw_bookmark(d, size, cx, cy, w, h, color):
    """在 (cx, cy) 居中画一个书签：圆角矩形主体 + 底部缺口三角。"""
    bw, bh = w, h * 0.78
    x0, y0 = cx - bw / 2, cy - h / 2 + h * 0.02
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=bw * 0.14, fill=color)
    notch = h * 0.22
    d.polygon(
        [(x0, y0 + bh), (x0 + bw, y0 + bh), (x0 + bw / 2, y0 + bh + notch)],
        fill=color,
    )


def make_icon(size, out_path, bookmark_scale, background_radius=None):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if background_radius is None:
        background_radius = size * 0.5  # 满背景圆角（any 图标）
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=background_radius, fill=PRIMARY)
    bm = size * bookmark_scale
    draw_bookmark(d, size, size / 2, size / 2, bm, bm * 1.15, WHITE)
    img.save(out_path, 'PNG')
    print('生成', out_path)


make_icon(192, os.path.join(OUT, 'icon-192.png'), 0.42)
make_icon(512, os.path.join(OUT, 'icon-512.png'), 0.42)
make_icon(512, os.path.join(OUT, 'icon-maskable-512.png'), 0.30, background_radius=512 * 0.12)
make_icon(180, os.path.join(OUT, 'icon-180.png'), 0.42)

# SVG 图标（favicon 用）
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#4f46e5"/>
  <path d="M215 138 h82 a34 34 0 0 1 34 34 v174 l-75 -48 l-75 48 v-174 a34 34 0 0 1 34 -34 z" fill="#fff"/>
</svg>'''
with open(os.path.join(OUT, 'icon.svg'), 'w', encoding='utf-8') as f:
    f.write(svg)
print('生成', os.path.join(OUT, 'icon.svg'))
