# -*- coding: utf-8 -*-
"""检测竖分隔线位置：统计每列在 y 区间内出现强变化且上下相邻也变化的次数。"""
from PIL import Image
import sys

G = r'D:\zxsy-math-arena\docs\research-workspace\golden'
S = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'


def borders(path, y0=110, y1=860, xr=(250, 1400)):
    im = Image.open(path).convert('RGB')
    px = im.load()
    W, H = im.size
    counts = []
    for x in range(xr[0], min(xr[1], W - 2)):
        n = 0
        for y in range(y0, min(y1, H)):
            c0 = px[x - 1, y]
            c1 = px[x, y]
            c2 = px[x + 1, y]
            d1 = sum(abs(a - b) for a, b in zip(c0[:3], c1[:3]))
            d2 = sum(abs(a - b) for a, b in zip(c1[:3], c2[:3]))
            if d1 > 18 and d2 > 18:
                n += 1
        counts.append((n, x))
    counts.sort(reverse=True)
    # 抑制相邻重复
    picked = []
    for n, x in counts:
        if n < (y1 - y0) * 0.4:
            break
        if all(abs(x - p) > 6 for p in picked):
            picked.append(x)
        if len(picked) >= 8:
            break
    return sorted(picked)


for tag, path in [
    ('GOLDEN READ', G + r'\READ-GOLDEN.png'),
    ('FINAL READ', S + r'\R04-read-default.png'),
    ('GOLDEN WRITE', G + r'\WRITE-GOLDEN.png'),
    ('FINAL WRITE', S + r'\R07-write-default.png'),
]:
    print(tag, '-> vertical borders x:', borders(path))
