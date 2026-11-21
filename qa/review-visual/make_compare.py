# -*- coding: utf-8 -*-
"""生成评审用并排对照图与局部放大图（写入 shots/）。"""
from PIL import Image, ImageDraw

S = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'
LIVE = r'D:\zxsy-math-arena-showcase\evidence\live\run-01\inventory'
G = r'D:\zxsy-math-arena\docs\research-workspace\golden'
TG = r'D:\zxsy-math-arena\docs\product\teacher-prep-center\golden'


def sbs(left_path, right_path, out, labels=('LIVE / GOLDEN', 'OFFLINE FINAL')):
    a = Image.open(left_path).convert('RGB')
    b = Image.open(right_path).convert('RGB')
    h = 470
    aw = round(a.width * h / a.height)
    bw = round(b.width * h / b.height)
    a = a.resize((aw, h), Image.LANCZOS)
    b = b.resize((bw, h), Image.LANCZOS)
    canvas = Image.new('RGB', (aw + bw + 8, h + 22), 'white')
    canvas.paste(a, (0, 22))
    canvas.paste(b, (aw + 8, 22))
    d = ImageDraw.Draw(canvas)
    d.text((6, 4), labels[0], fill='black')
    d.text((aw + 14, 4), labels[1], fill='black')
    canvas.save(out)
    print('saved', out, canvas.size)


pairs = [
    (LIVE + r'\student-01-home.png', S + r'\S01-home.png', S + r'\cmp-student-home.png', ('LIVE student-01-home', 'OFFLINE S01-home')),
    (LIVE + r'\teacher-01-prep-home.png', S + r'\T01-prep-home.png', S + r'\cmp-teacher-prep.png', ('LIVE teacher-01-prep-home', 'OFFLINE T01-prep-home')),
    (G + r'\READ-GOLDEN.png', S + r'\R06-read-agent.png', S + r'\cmp-research-read.png', ('READ-GOLDEN', 'OFFLINE R06-read-agent')),
    (G + r'\WRITE-GOLDEN.png', S + r'\R07-write-default.png', S + r'\cmp-research-write.png', ('WRITE-GOLDEN', 'OFFLINE R07-write-default')),
    (TG + r'\PPT-GOLDEN.png', S + r'\T05-wb-ppt.png', S + r'\cmp-teacher-ppt.png', ('PPT-GOLDEN', 'OFFLINE T05-wb-ppt')),
    (TG + r'\LESSONPLAN-GOLDEN.png', S + r'\T06-wb-plan.png', S + r'\cmp-teacher-plan.png', ('LESSONPLAN-GOLDEN', 'OFFLINE T06-wb-plan')),
    (LIVE + r'\student-06-classroom.png', S + r'\S20-classroom-tasks.png', S + r'\cmp-student-classroom.png', ('LIVE student-06-classroom', 'OFFLINE S20-classroom-tasks')),
]
for l, r, o, lab in pairs:
    sbs(l, r, o, lab)

# 局部放大：A 结论标题原始 LaTeX
im = Image.open(S + r'\S05c-guide-A-final-scrolled.png')
im.crop((560, 540, 1200, 620)).resize((640 * 2, 80 * 2), Image.LANCZOS).save(S + r'\crop-guide-final-title.png')
# 局部放大：右下浮标重叠
im = Image.open(S + r'\S01-home.png')
im.crop((1580, 860, 1672, 941)).resize((92 * 5, 81 * 5), Image.LANCZOS).save(S + r'\crop-fab-overlap.png')
# 局部放大：双师页右下遮挡
im = Image.open(S + r'\S23-dual.png')
im.crop((1440, 840, 1672, 941)).resize((232 * 3, 101 * 3), Image.LANCZOS).save(S + r'\crop-dual-fab-overlap.png')
# 科研阅读内联公式（段落纯文本 vs Golden）
im = Image.open(S + r'\R04-read-default.png')
im.crop((387, 230, 1023, 340)).resize((636 * 2, 110 * 2), Image.LANCZOS).save(S + r'\crop-read-inline-math.png')
print('done')
