# -*- coding: utf-8 -*-
# 修复 JS 数据文件中的 LaTeX 反斜杠转义：字符串字面量内反斜杠后跟 2 个及以上字母
# （如 \frac、\sqrt、\usepackage）视为 LaTeX 控制词，补成双反斜杠；单字母转义（\n、\t 等）保持。
import re
import sys

PATH = sys.argv[1] if len(sys.argv) > 1 else r'D:\zxsy-math-arena-showcase\src\data\research.js'
src = open(PATH, encoding='utf-8').read()

out = []
i = 0
n = len(src)
in_str = None
while i < n:
    ch = src[i]
    if in_str is None:
        out.append(ch)
        if ch in ("'", '"', '`'):
            in_str = ch
        i += 1
        continue
    if ch == '\\':
        nxt = src[i + 1] if i + 1 < n else ''
        if nxt.isalpha():
            m = re.match(r'[A-Za-z]+', src[i + 1:])
            word = m.group(0) if m else ''
            if len(word) >= 2:
                out.append('\\\\' + word)
                i += 1 + len(word)
                continue
            out.append(ch)
            i += 1
            continue
        out.append(ch)
        i += 1
        continue
    if ch == in_str:
        in_str = None
    out.append(ch)
    i += 1

fixed = ''.join(out)
if fixed != src:
    open(PATH, 'w', encoding='utf-8').write(fixed)
    print('fixed', PATH, 'changed')
else:
    print('no change', PATH)
