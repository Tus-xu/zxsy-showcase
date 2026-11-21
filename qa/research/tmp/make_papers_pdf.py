# -*- coding: utf-8 -*-
"""把 qa/research/tmp/papers.json 渲染成 3 份真实 PDF（reportlab + simhei）。

- 每个 PDF 页与 data/research.js 中材料的“页”一一对应，便于界面证据定位后逐页核对；
- 页眉“随包演示讲义（自撰，非外部论文）”，页脚“第 N 页 / 共 M 页”；
- 数学源码在 Python 侧转换为可打印纯文本（JS 侧不参与，避免转义差异）。
运行：C:\\python13\\python.exe qa/research/tmp/make_papers_pdf.py
"""
import json
import os
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle, Spacer

ROOT = r'D:\zxsy-math-arena-showcase'
SRC = os.path.join(ROOT, 'qa', 'research', 'tmp', 'papers.json')
OUT = os.path.join(ROOT, 'qa', 'research', 'artifacts')
FONT = r'C:\Windows\Fonts\simhei.ttf'
BS = chr(92)

pdfmetrics.registerFont(TTFont('SimHei', FONT))

PAGE_W, PAGE_H = A4
ML, MR, MT, MB = 22 * mm, 22 * mm, 24 * mm, 20 * mm
CONTENT_W = PAGE_W - ML - MR

# 数学命令 → 可打印文本（键为不带反斜杠的命令名）
SYM = {
    'ge': '≥', 'geq': '≥', 'le': '≤', 'leq': '≤', 'ne': '≠', 'neq': '≠',
    'approx': '≈', 'sim': '~', 'pm': '±', 'times': '×', 'cdot': '·', 'div': '÷',
    'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε', 'varepsilon': 'ε',
    'lambda': 'λ', 'mu': 'μ', 'pi': 'π', 'rho': 'ρ', 'sigma': 'σ', 'tau': 'τ',
    'phi': 'φ', 'varphi': 'φ', 'psi': 'ψ', 'omega': 'ω', 'Omega': 'Ω', 'Sigma': 'Σ',
    'nabla': 'grad ', 'partial': 'd', 'infty': '∞', 'int': '∫', 'sum': '∑', 'prod': '∏',
    'in': '∈', 'notin': '不属于', 'subset': '包含于', 'subseteq': '包含于或等于',
    'forall': '任意', 'exists': '存在', 'to': '->', 'rightarrow': '->', 'Rightarrow': '=>',
    'ldots': '...', 'dots': '...', 'cdots': '...', 'hbar': 'h', 'ell': 'l',
    'sin': 'sin', 'cos': 'cos', 'exp': 'exp', 'inf': 'inf', 'sup': 'sup',
    '|': '||', 'quad': '  ', 'qquad': '    ',
}

SAFE_CHARS = {
    chr(0x2212): '-',      # −
    chr(0x2282): '包含于',  # ⊂
    chr(0x2286): '包含于或等于',
    chr(0x2209): '不属于',
    chr(0x2192): '->',
    chr(0x21D2): '=>',
    chr(0x2016): '||',
    chr(0xB2): '^2', chr(0xB3): '^3', chr(0xB9): '^1', chr(0xB0): '^0',
    chr(0x2200): '任意', chr(0x2203): '存在', chr(0x2202): 'd',
    chr(0x2207): 'grad ', chr(0x211D): 'R', chr(0x2113): 'l',
    chr(0x27E8): '<', chr(0x27E9): '>', chr(0x22C5): '·', chr(0x21A6): '->',
    chr(0xA7): '第', chr(0xFF5C): '|', chr(0x2211): '∑', chr(0x222B): '∫',
}


def read_group(tex, pos):
    """读取 { ... }（支持嵌套），返回 (内容, 结束位置)。"""
    while pos < len(tex) and tex[pos] in ' \t':
        pos += 1
    if pos >= len(tex) or tex[pos] != '{':
        return '', pos
    depth = 0
    start = pos + 1
    while pos < len(tex):
        if tex[pos] == '{':
            depth += 1
        elif tex[pos] == '}':
            depth -= 1
            if depth == 0:
                return tex[start:pos], pos + 1
        pos += 1
    return tex[start:], pos


def math_to_text(tex):
    out = []
    i = 0
    while i < len(tex):
        ch = tex[i]
        if ch == BS:
            j = i + 1
            if j >= len(tex):
                break
            if tex[j] == BS:
                out.append(' ')
                i += 2
                continue
            if not tex[j].isalpha():
                cmd = tex[j]
                out.append(SYM.get(cmd, cmd))
                i += 2
                continue
            k = j
            while k < len(tex) and (tex[k].isalpha() or tex[k] == '@'):
                k += 1
            name = tex[j:k]
            if name in ('frac', 'dfrac', 'tfrac'):
                a, p1 = read_group(tex, k)
                b, p2 = read_group(tex, p1)
                out.append('(' + math_to_text(a) + ')/(' + math_to_text(b) + ')')
                i = p2
                continue
            if name == 'sqrt':
                a, p1 = read_group(tex, k)
                out.append('√(' + math_to_text(a) + ')')
                i = p1
                continue
            if name in ('text', 'mathrm', 'mathbf', 'mathit', 'operatorname', 'mathbb'):
                a, p1 = read_group(tex, k)
                out.append(math_to_text(a))
                i = p1
                continue
            if name in ('left', 'right', 'displaystyle', 'textstyle', 'limits', 'nolimits', '!'):
                i = k
                continue
            out.append(SYM.get(name, name + ' '))
            i = k
            continue
        if ch in '{}':
            i += 1
            continue
        if ch == '$':
            i += 1
            continue
        out.append(ch)
        i += 1
    return ''.join(out)


def safe(text):
    s = str(text or '')
    for k, v in SAFE_CHARS.items():
        s = s.replace(k, v)
    # 去掉 emoji 与排版符号区
    s = ''.join(c for c in s if not (0x1F000 <= ord(c) <= 0x1FAFF or 0x2600 <= ord(c) <= 0x27BF))
    return s


def inline_mixed(text):
    """把含 $...$ 的文本转成可打印文本。"""
    parts = str(text or '').split('$')
    out = []
    for idx, seg in enumerate(parts):
        out.append(math_to_text(seg) if idx % 2 == 1 else safe(seg))
    return safe(''.join(out))


def st(name, size, leading, **kw):
    base = dict(fontName='SimHei', fontSize=size, leading=leading, wordWrap='CJK',
                textColor=colors.HexColor('#0F172A'))
    base.update(kw)
    return ParagraphStyle(name, **base)


STYLES = {
    'docTitle': st('docTitle', 21, 30, spaceAfter=6),
    'docSub': st('docSub', 11.5, 18, textColor=colors.HexColor('#334155')),
    'meta': st('meta', 9, 14, textColor=colors.HexColor('#64748B')),
    'h1': st('h1', 14.5, 22, spaceBefore=8, spaceAfter=6, textColor=colors.HexColor('#1E1B4B')),
    'h2': st('h2', 12.5, 20, spaceBefore=6, spaceAfter=3),
    'h3': st('h3', 11.8, 19, spaceBefore=5, spaceAfter=3),
    'p': st('p', 10.3, 17.6, spaceAfter=4),
    'proof': st('proof', 10.2, 17.4, spaceAfter=4, textColor=colors.HexColor('#1F2937')),
    'quote': st('quote', 9.6, 16, textColor=colors.HexColor('#475569'), leftIndent=8),
    'formula': st('formula', 10.6, 18, backColor=colors.HexColor('#EEF2FF'),
                  borderColor=colors.HexColor('#DBE3F0'), borderWidth=0.6,
                  borderPadding=6, spaceBefore=3, spaceAfter=6, leftIndent=10, rightIndent=10),
    'theorem': st('theorem', 10.3, 17.4, backColor=colors.HexColor('#F1F5F9'),
                  borderColor=colors.HexColor('#E2E8F0'), borderWidth=0.6,
                  borderPadding=6, spaceBefore=3, spaceAfter=6),
    'list': st('list', 10.2, 17, leftIndent=14, spaceAfter=2),
    'caption': st('caption', 9.8, 15, spaceBefore=4, textColor=colors.HexColor('#334155')),
    'ref': st('ref', 9.4, 15, leftIndent=6, textColor=colors.HexColor('#334155')),
}

STYLES['formula'].wordWrap = 'CJK'
STYLES['theorem'].wordWrap = 'CJK'


def esc(text):
    return escape(safe(text))


def build_flowables(items):
    flows = []
    for it in items:
        kind = it['kind']
        if kind == 'rule':
            flows.append(Spacer(1, 2))
            continue
        if kind == 'table':
            data = [[Paragraph(esc(c), STYLES['caption']) for c in it['head']]]
            for row in it['rows']:
                data.append([Paragraph(esc(c), STYLES['p']) for c in row])
            tb = Table(data, colWidths=[CONTENT_W / len(it['head'])] * len(it['head']))
            tb.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'SimHei'),
                ('FONTSIZE', (0, 0), (-1, -1), 9.5),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            flows.append(tb)
            flows.append(Spacer(1, 4))
            continue
        if kind == 'formula':
            text = escape(safe(math_to_text(it.get('tex', ''))))
            if it.get('num'):
                text += '    ' + esc(it['num'])
            flows.append(Paragraph(text, STYLES['formula']))
            continue
        if kind == 'theorem':
            text = '<b>' + escape(inline_mixed(it.get('title', '') + '  ' + it.get('text', ''))) + '</b>'
            flows.append(Paragraph(text, STYLES['theorem']))
            continue
        text = escape(inline_mixed(it.get('text', '')))
        flows.append(Paragraph(text, STYLES.get(kind, STYLES['p'])))
    return flows


def measure(flows, width):
    total = 0
    for f in flows:
        _, h = f.wrap(width, PAGE_H)
        total += h + getattr(f, 'getSpaceAfter', lambda: 0)()
    return total


def draw_flowables(c, flows, x, y):
    for f in flows:
        w, h = f.wrap(CONTENT_W, PAGE_H)
        y -= h
        f.drawOn(c, x, y)
        y -= getattr(f, 'getSpaceAfter', lambda: 0)()


def render_paper(paper, file_name, index):
    out_path = os.path.join(OUT, file_name)
    c = canvas.Canvas(out_path, pagesize=A4)
    c.setTitle(paper['title'] + ' · ' + paper['meta'])
    c.setAuthor('Mathesis 离线演示项目（自撰演示材料）')
    c.setSubject('随包演示讲义（自撰，非外部论文）')
    total = len(paper['pages'])
    for pg in paper['pages']:
        c.setFont('SimHei', 8.2)
        c.setFillColor(colors.HexColor('#64748B'))
        c.drawString(ML, PAGE_H - MT + 10, 'Mathesis 科研工作台 · 离线演示')
        c.drawRightString(PAGE_W - MR, PAGE_H - MT + 10, '随包演示讲义（自撰，非外部论文）')
        c.setStrokeColor(colors.HexColor('#E2E8F0'))
        c.setLineWidth(0.6)
        c.line(ML, PAGE_H - MT + 4, PAGE_W - MR, PAGE_H - MT + 4)

        flows = build_flowables(pg['items'])
        avail = PAGE_H - MT - MB - 6
        total_h = measure(flows, CONTENT_W)
        if total_h > avail:
            shrink = max(0.78, avail / total_h)
            for f in flows:
                if hasattr(f, 'style'):
                    s = ParagraphStyle('s-%d-%d' % (index, pg['no']), parent=f.style,
                                       fontSize=f.style.fontSize * shrink,
                                       leading=f.style.leading * shrink,
                                       borderPadding=getattr(f.style, 'borderPadding', 0) * shrink)
                    f.style = s
        draw_flowables(c, flows, ML, PAGE_H - MT - 6)

        c.setFont('SimHei', 8.2)
        c.setFillColor(colors.HexColor('#64748B'))
        c.drawString(ML, MB - 10, paper['title'] + ' · 第 ' + str(pg['no']) + ' 页')
        c.drawRightString(PAGE_W - MR, MB - 10, '第 ' + str(pg['no']) + ' 页 / 共 ' + str(total) + ' 页')
        c.showPage()
    c.save()
    print('wrote', out_path, 'pages=', total)


def main():
    os.makedirs(OUT, exist_ok=True)
    with open(SRC, encoding='utf-8') as f:
        papers = json.load(f)
    names = ['research-paper-1.pdf', 'research-paper-2.pdf', 'research-paper-3.pdf']
    for i, paper in enumerate(papers[:3]):
        render_paper(paper, names[i], i)


if __name__ == '__main__':
    main()
