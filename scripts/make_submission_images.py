# -*- coding: utf-8 -*-
"""生成三份演示用「学生手写答卷」图片（演示素材，非真实学生数据）。
题目分别对应三道指定题 A/B/C；答卷 1 完整正确、答卷 2 思路对但算错、答卷 3 漏条件。
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = r'D:\zxsy-math-arena-showcase\src\assets\submissions'
os.makedirs(OUT, exist_ok=True)
FONT = r'C:\Windows\Fonts\simkai.ttf'
FONT_B = r'C:\Windows\Fonts\simhei.ttf'
if not os.path.exists(FONT):
    FONT = r'C:\Windows\Fonts\simsun.ttc'

papers = [
    {
        'name': 'sub-A.png',
        'header': ('高二 (1) 班  林一川', '2026-11-20  20:41'),
        'title': '第 3 题（双曲线离心率）',
        'lines': [
            '解：设实半轴为 a，虚半轴为 b，半焦距为 c。',
            '由题意  2b = √7 · 2a，约去 2 得 b/a = √7。',
            '双曲线满足  c^2 = a^2 + b^2，',
            '所以 e^2 = c^2/a^2 = 1 + (b/a)^2 = 1 + 7 = 8，',
            'e > 0，故 e = √8 = 2√2。',
            '所以选 D。',
        ],
        'color': (30, 41, 70),
    },
    {
        'name': 'sub-B.png',
        'header': ('高二 (1) 班  周子墨', '2026-11-20  20:38'),
        'title': '第 14 题（有放回取球的期望）',
        'lines': [
            '解：X 表示三次中取出的球的个数。',
            '因为是有放回取三次，所以每次取到的球可能重复。',
            'E(X) = 3 × 1/5 = 3/5 ?',
            '再想想：五个球地位相同，每个球出现的概率是 1/5，',
            '取三次，所以 E(X) = 3。',
            '答：E(X) = 3。',
        ],
        'color': (60, 40, 30),
    },
    {
        'name': 'sub-C.png',
        'header': ('高二 (1) 班  陈可欣', '2026-11-20  20:45'),
        'title': '第 9 题（正三棱柱中的线面关系）',
        'lines': [
            '解：正三棱柱中，D 是 BC 中点，',
            '所以 AD ⊥ BC。又侧棱 AA1 ⊥ 底面，',
            '所以 BC ⊥ 平面 AA1D，B 正确。',
            'A 选项：AD 与 A1C 看起来垂直，也对？',
            'C 选项：AD ∥ A1B1，不对。',
            '所以选 A、B。',
        ],
        'color': (30, 50, 60),
    },
]

for paper in papers:
    img = Image.new('RGB', (900, 640), (252, 252, 250))
    d = ImageDraw.Draw(img)
    # 纸张纹理线
    for y in range(150, 620, 46):
        d.line([(50, y), (850, y)], fill=(232, 236, 244), width=1)
    d.rectangle([(28, 28), (872, 612)], outline=(214, 220, 232), width=2)
    f_name = ImageFont.truetype(FONT, 21)
    f_title = ImageFont.truetype(FONT_B, 22)
    f_body = ImageFont.truetype(FONT, 24)
    d.text((56, 48), paper['header'][0], font=f_name, fill=(70, 82, 105))
    d.text((640, 50), paper['header'][1], font=ImageFont.truetype(FONT, 17), fill=(120, 130, 148))
    d.text((56, 92), paper['title'], font=f_title, fill=(28, 38, 60))
    d.line([(56, 126), (844, 126)], fill=(200, 208, 224), width=1)
    y = 162
    for line in paper['lines']:
        d.text((64, y), line, font=f_body, fill=paper['color'])
        y += 52
    img.save(os.path.join(OUT, paper['name']))
    print('saved', paper['name'], os.path.getsize(os.path.join(OUT, paper['name'])))
print('done')
