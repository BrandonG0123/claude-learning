#!/usr/bin/env python3
"""sheets.py — contact sheets from a (possibly sparse) frame directory. usage: python3 -I tools/sheets.py <frames_dir> <out_dir> [tile_w=384]
Per-second sheets (sheet_secN.png) with the frames that exist in that second, plus overview.png with everything."""
import sys, os, re, math
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]; TW = int(sys.argv[3]) if len(sys.argv) > 3 else 384
os.makedirs(out, exist_ok=True)
files = sorted(f for f in os.listdir(src) if re.match(r'frame_\d{4}\.(png|jpg)$', f))
frames = [(int(re.findall(r'\d{4}', f)[0]), os.path.join(src, f)) for f in files]
def sheet(items, cols, tw, path, label=None):
    th = round(tw * 1080 / 1920); rows = math.ceil(len(items) / cols); pad = 4
    im = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + pad) + pad + (28 if label else 0)), (32, 32, 32)); d = ImageDraw.Draw(im)
    if label: d.text((8, 6), label, fill=(255, 255, 255))
    for i, (n, p) in enumerate(items):
        t = Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS); x = pad + (i % cols) * (tw + pad); y = pad + (28 if label else 0) + (i // cols) * (th + pad)
        im.paste(t, (x, y)); d.rectangle([x, y, x + 46, y + 16], fill=(0, 0, 0)); d.text((x + 3, y + 2), f'f{n}', fill=(255, 255, 255))
    im.save(path)
for s in range(10):
    items = [f for f in frames if s * 60 <= f[0] < (s + 1) * 60]
    if items: sheet(items, 5, TW, os.path.join(out, f'sheet_sec{s}.png'), label=f'second {s}: frames {s*60}-{s*60+59} ({len(items)} shown)')
sheet(frames, 20, 160, os.path.join(out, 'overview.png'))
print(f'{len(frames)} frames → {out}')
