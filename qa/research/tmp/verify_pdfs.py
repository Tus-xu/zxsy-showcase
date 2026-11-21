# -*- coding: utf-8 -*-
"""校验 3 份 PDF：页数 = 数据页数；每页中文关键片段可在对应 PDF 页提取；无空页。"""
import json
import os
import re
from pypdf import PdfReader

ROOT = r'D:\zxsy-math-arena-showcase'
ART = os.path.join(ROOT, 'qa', 'research', 'artifacts')
SRC = os.path.join(ROOT, 'qa', 'research', 'tmp', 'papers.json')

with open(SRC, encoding='utf-8') as f:
    papers = json.load(f)
names = ['research-paper-1.pdf', 'research-paper-2.pdf', 'research-paper-3.pdf']


def norm(s):
    return re.sub(r'\s+', '', s)


def chinese_probe(text):
    """取文本中最长的连续中文串的尾部 6 字（跨页公式/拉丁文不影响探针）。"""
    parts = str(text or '').split('$')
    zh = ''.join(parts[0::2])
    runs = re.findall('[\u4e00-\u9fff]+', zh)
    if not runs:
        return ''
    runs.sort(key=len, reverse=True)
    best = runs[0]
    return best[-6:] if len(best) >= 6 else ''


ok = True
for paper, name in zip(papers, names):
    reader = PdfReader(os.path.join(ART, name))
    n = len(reader.pages)
    print(name + ': pdf pages=' + str(n) + ', data pages=' + str(len(paper['pages'])) + ', title=' + paper['title'])
    if n != len(paper['pages']):
        ok = False
        print('  !! page count mismatch')
    for pg in paper['pages']:
        text = norm(reader.pages[pg['no'] - 1].extract_text() or '')
        for it in pg['items']:
            probe = chinese_probe(it.get('text', ''))
            if probe and probe not in text:
                ok = False
                print('  !! p' + str(pg['no']) + ' missing probe: ' + repr(probe))
        if not text:
            ok = False
            print('  !! p' + str(pg['no']) + ' empty')
    last = norm(reader.pages[-1].extract_text() or '')
    marker = '第' + str(n) + '页/共' + str(n) + '页'
    if marker not in last:
        ok = False
        print('  !! footer page marker missing')
    head = norm(reader.pages[0].extract_text() or '')
    print('  first page head: ' + head[:70])
print('RESULT:', 'PASS' if ok else 'FAIL')
