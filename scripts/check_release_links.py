# -*- coding: utf-8 -*-
"""检查发行包里的外链资源（离线必须为 0）。"""
import re
import sys

p = r'D:\zxsy-math-arena-showcase\release\开始演示.html'
h = open(p, encoding='utf-8', errors='replace').read()
print('bytes', len(h))
for m in re.finditer(r'<link\b[^>]*>', h):
    tag = m.group(0)
    if 'http' in tag:
        print('LINK:', tag[:300])
for m in re.finditer(r'<script\b[^>]*>', h):
    tag = m.group(0)
    if 'src=' in tag and 'http' in tag:
        print('SCRIPT:', tag[:300])
# 统计 http:// 出现（头 20 个上下文）
urls = re.findall(r'https?://[^\s"\'<>)]+', h)
from collections import Counter
c = Counter(urls)
print('distinct urls:', len(c))
for u, n in c.most_common(15):
    print(f'  {n:5d}  {u[:110]}')