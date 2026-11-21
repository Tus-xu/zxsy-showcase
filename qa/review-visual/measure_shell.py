# -*- coding: utf-8 -*-
"""测量壳层几何：顶栏高度、侧栏宽度，实拍 vs 离线复刻。"""
from PIL import Image
import os

LIVE = r'D:\zxsy-math-arena-showcase\evidence\live\run-01\inventory'
MINE = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'


def edge_scan(img, axis, fixed, rng, thresh=8):
    """在固定列/行上找相邻像素差最大的位置（返回 top-3）。"""
    px = img.load()
    cand = []
    prev = None
    for v in range(*rng):
        c = px[fixed, v] if axis == 'y' else px[v, fixed]
        if prev is not None:
            d = sum(abs(a - b) for a, b in zip(c[:3], prev[:3]))
            if d > thresh:
                cand.append((v, d, c[:3], prev[:3]))
        prev = c
    cand.sort(key=lambda t: -t[1])
    return cand[:4]


def report(path, tag):
    img = Image.open(path).convert('RGB')
    print(f'--- {tag} {os.path.basename(path)} {img.size} ---')
    # 顶栏下边界：主内容区列 x=1000，y 40..100
    print(' topbar y candidates(x=1000):', [(c[0], c[1]) for c in edge_scan(img, 'y', 1000, (30, 110))])
    # 侧栏右边界：行 y=300（学生/教师）
    print(' sidebar x candidates(y=300):', [(c[0], c[1]) for c in edge_scan(img, 'x', 300, (180, 300))])
    # 研究端 header：x=1000，y 40..100
    print(' header  y candidates(x=1000):', [(c[0], c[1]) for c in edge_scan(img, 'y', 1000, (20, 110))])


for name, tag in [('student-01-home.png', 'LIVE student-home'), ('teacher-01-prep-home.png', 'LIVE teacher-prep'),
                  ('researcher-01-landing.png', 'LIVE research-landing'), ('teacher-13-prep-workspace.png', 'LIVE teacher-wb')]:
    p = os.path.join(LIVE, name)
    if os.path.exists(p):
        report(p, tag)
for name, tag in [('S01-home.png', 'MINE student-home'), ('T01-prep-home.png', 'MINE teacher-prep'),
                  ('R01-research-home.png', 'MINE research-home'), ('T04-wb-classroom.png', 'MINE teacher-wb')]:
    p = os.path.join(MINE, name)
    if os.path.exists(p):
        report(p, tag)
