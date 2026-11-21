# -*- coding: utf-8 -*-
"""向验收矩阵追加「评审驱动修复」两行（视觉 B1/B2/M1、导出/发布同源）。"""
import csv

PATH = r'D:\zxsy-math-arena-showcase\qa\acceptance.csv'
ACC = 'qa/acceptance'
rows = [
    ['视觉/可靠性修复（评审驱动）', '学生引导页 /student/guide/*；全端右下角', 'A/B/C 引导全程；双师/科研/工作台右下区域',
     '四轮对话后检查输入区与结论卡；检查右下浮标', 'review-visual 在 03:55 包发现 B1 溢出、B2 裸 LaTeX、M1 双浮标重叠',
     'qa/review-visual/shots/S05c-*、crop-fab-overlap.png', '策展修正（CUR-021）',
     'PASS：引导页锁定 100vh（scrollHeight=941=视口）、聊天区内部滚动、结论卡完整可见；结论标题经 MathText 渲染；嘉宾界面仅 AI 管家一个浮标',
     '—', 'qa/explore/final-guide-A-fixed.png', '—', '0 网络请求', 'qa/final_check.py 10/10；review-visual 收口复验中'],
    ['导出与发布同源（评审驱动）', '教师工作台 PPT → 导出/发布 → 学生双师', '椭圆课件（a=6,b=4）',
     '改参→导出 PPTX/PDF→发布→学生打开同页', 'review-functional 在 03:55 包发现导出物仅含标题修订、不含参数派生',
     'qa/review-functional/_results/artifacts-check.json', '策展修正（CUR-020）',
     'PASS：导出 PPTX/PDF 含 4.472/0.745/当前参数；发布快照含派生；学生双师同页可见；导出物公式为 Unicode（无 $/反斜杠）',
     'publish.records / 版本快照', 'qa/final_check.py（PPTX/PDF 文本抽取）', 'qa/acceptance/artifacts/final-椭圆-params.pptx|pdf', '0 网络请求', 'qa/final_check.py 10/10；review-functional 收口复验中'],
]
with open(PATH, 'a', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f)
    for r in rows:
        w.writerow(r)
print('appended', len(rows))
