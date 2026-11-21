# -*- coding: utf-8 -*-
"""为离线单文件演示生成 PDF 用的 CJK 子集字体。
- 来源：Windows 系统字体 SimHei（可在构建机使用；发行包内只包含子集，不依赖系统字体）
- 范围：GB2312 一级 3755 字 + ASCII + 常用数学符号/标点
- 产物：src/assets/fonts/offline-cjk.ttf（供 pdf-lib 在浏览器内嵌）
"""
import os
import subprocess
import sys

chars = set()
for b1 in range(0xB0, 0xD8):
    for b2 in range(0xA1, 0xFF):
        try:
            chars.add(bytes([b1, b2]).decode('gb2312'))
        except Exception:
            pass
for c in range(0x20, 0x7F):
    chars.add(chr(c))
extra = (
    '“”‘’—…·×÷√≤≥≠≈±°²³¹⁰⁴⁵⁶⁷⁸⁹∞∑∏∫∈∉⊂⊆∪∩⊥∥∠△∵∴⇒⇔①②③④⑤⑥⑦⑧⑨⑩'
    '（），。、；：？！《》【】「」『』〔〕－＋＝％＃＠＆＊αβγδεζηθικλμνξοπρστυφχψω'
    'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'
)
chars.update(extra)
text = ''.join(sorted(chars))
with open('scripts/.font-charset.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print('charset chars:', len(text))

src = r'C:\Windows\Fonts\simhei.ttf'
out = 'src/assets/fonts/offline-cjk.ttf'
os.makedirs('src/assets/fonts', exist_ok=True)
cmd = [
    sys.executable, '-m', 'fontTools.subset', src,
    '--text-file=scripts/.font-charset.txt',
    f'--output-file={out}',
    '--drop-tables+=DSIG',
    '--no-hinting',
]
r = subprocess.run(cmd, capture_output=True, text=True)
print('rc', r.returncode)
print((r.stdout or '')[-300:])
print((r.stderr or '')[-300:])
if os.path.exists(out):
    print('subset size', os.path.getsize(out))
