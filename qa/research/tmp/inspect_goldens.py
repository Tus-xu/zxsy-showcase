"""Crop READ/WRITE goldens into 2x regions for close inspection + sample panel widths/colors."""
from PIL import Image
import os

OUT = os.path.join(os.path.dirname(__file__), 'golden-crops')
os.makedirs(OUT, exist_ok=True)

READ = r'D:\zxsy-math-arena\docs\research-workspace\golden\READ-GOLDEN.png'
WRITE = r'D:\zxsy-math-arena\docs\research-workspace\golden\WRITE-GOLDEN.png'


def crop(src, name, box, scale=2):
    im = Image.open(src).convert('RGB')
    c = im.crop(box)
    c = c.resize((c.width * scale, c.height * scale), Image.LANCZOS)
    p = os.path.join(OUT, name)
    c.save(p)
    print(name, c.size)


# READ regions
crop(READ, 'read-left-2x.png', (0, 56, 330, 941))
crop(READ, 'read-center-toolbar-2x.png', (300, 56, 1080, 360))
crop(READ, 'read-center-paper-2x.png', (300, 350, 1080, 941))
crop(READ, 'read-right-top-2x.png', (1060, 56, 1672, 560))
crop(READ, 'read-right-bottom-2x.png', (1060, 540, 1672, 941))

# WRITE regions
crop(WRITE, 'write-left-2x.png', (0, 56, 320, 941))
crop(WRITE, 'write-header-2x.png', (880, 56, 1672, 120))
crop(WRITE, 'write-editor-2x.png', (300, 110, 910, 780))
crop(WRITE, 'write-preview-2x.png', (900, 110, 1350, 780))
crop(WRITE, 'write-right-2x.png', (1340, 56, 1672, 941))
crop(WRITE, 'write-log-2x.png', (300, 760, 1350, 941))

# Panel boundary / palette analysis
im = Image.open(READ).convert('RGB')
px = im.load()
print('\nREAD vertical scan at y=400 (x, color):')
prev = None
for x in range(0, 1672):
    c = px[x, 400]
    if prev is None or (abs(c[0] - prev[0]) + abs(c[1] - prev[1]) + abs(c[2] - prev[2]) > 24):
        if x < 340 or 1040 < x < 1100:
            print(x, c)
    prev = c

im2 = Image.open(WRITE).convert('RGB')
px2 = im2.load()
print('\nWRITE vertical scan at y=400:')
prev = None
for x in range(0, 1672):
    c = px2[x, 400]
    if prev is None or (abs(c[0] - prev[0]) + abs(c[1] - prev[1]) + abs(c[2] - prev[2]) > 24):
        if x < 330 or 880 < x < 930 or 1330 < x < 1370:
            print(x, c)
    prev = c

print('\nREAD header height scan at x=600:')
for y in range(50, 75):
    print(y, px[600, y])
