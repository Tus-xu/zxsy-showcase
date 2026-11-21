# -*- coding: utf-8 -*-
"""科研端栏宽 / Header 高度：Golden vs 最终离线包。"""
from PIL import Image

G = r'D:\zxsy-math-arena\docs\research-workspace\golden'
S = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'


def col_edges(path, y, x0=0, x1=1672, thresh=10, topn=8):
    im = Image.open(path).convert('RGB')
    px = im.load()
    cand = []
    prev = None
    for x in range(x0, x1):
        c = px[x, y]
        if prev is not None:
            d = sum(abs(a - b) for a, b in zip(c[:3], prev[:3]))
            if d > thresh:
                cand.append((x, d, c[:3]))
        prev = c
    cand.sort(key=lambda t: -t[1])
    return im.size, sorted(cand[:topn])


def row_edges(path, x, y0=0, y1=120, thresh=10):
    im = Image.open(path).convert('RGB')
    px = im.load()
    cand = []
    prev = None
    for y in range(y0, y1):
        c = px[x, y]
        if prev is not None:
            d = sum(abs(a - b) for a, b in zip(c[:3], prev[:3]))
            if d > thresh:
                cand.append((y, d))
        prev = c
    return sorted(cand, key=lambda t: -t[1])[:4]


def report(tag, path, y):
    size, cand = col_edges(path, y)
    print(f'--- {tag} {size} y={y} ---')
    print('  strong vertical edges:', cand[:8])
    print('  header rows at x=800:', row_edges(path, 800))


report('GOLDEN READ', G + r'\READ-GOLDEN.png', 300)
report('FINAL READ  ', S + r'\R04-read-default.png', 300)
report('GOLDEN WRITE', G + r'\WRITE-GOLDEN.png', 300)
report('FINAL WRITE ', S + r'\R07-write-default.png', 300)
