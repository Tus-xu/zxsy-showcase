# -*- coding: utf-8 -*-
"""追加视觉/功能评审发现的偏差与修复记录到 curation-g2.csv。"""
import csv

ROWS = [
    ['CUR-016', '科研阅读内联公式排版（视觉 M2）', 'qa/review-visual/shots/R04-read-default.png、crop-read-inline-math.png',
     '阅读纸面段落内联数学仍为 Unicode 纯文本（V_h⊂V、∥u-u_h∥_V），block 公式为 KaTeX', 'READ-GOLDEN 的排版标准',
     '登记为 ACCEPTED-DEVIATION：block 公式已 KaTeX；内联段落保持 Unicode 以保证离线数据可检索与可导出（不在展示主线放大检查）',
     '科研 READ / v1', 'review-visual', 'qa/review-visual/REPORT.md §3 M2', '策展补制/偏差登记'],
    ['CUR-017', '科研启动页导航与个人中心（视觉 M3）', 'qa/review-visual/shots/R01-research-home.png',
     '现役启动页顶栏为 启动页/工作台/个人中心；展示版收敛为 项目胶囊+阅读/写作，个人中心入口在用户菜单',
     'run-01 科研入口（inventory/routes.csv）',
     'ACCEPTED-DEVIATION：启动页重设计按策展补制；个人中心不单独建页，账号操作收敛到用户菜单（主持人手册 §7 已登记）',
     '科研壳层 / v1', 'review-visual', 'qa/review-visual/REPORT.md §3 M3', '策展改写'],
    ['CUR-018', '学生知识库缺「我的题库」Tab（视觉 M4）', 'qa/review-visual/shots/S11-library*.png',
     '现役 /library 有「我的资料/我的题库」两 Tab；展示版仅资料库', 'run-01 入口实拍 student-04-library.png',
     'ACCEPTED-DEVIATION：展示版知识库聚焦「自撰材料入库→引用问答」主线；题库入口由学生首页三题卡与练题页承担（主持人手册 §7 已登记）',
     '学生知识库 / v1', 'review-visual', 'qa/review-visual/REPORT.md §3 M4', '策展改写'],
    ['CUR-019', '教师工作台编辑工具条（视觉 M5）', 'qa/review-visual/shots/T04-ppt*.png',
     'Golden/实拍编辑工具条含 文本/公式/数学图形/图片/备注、B/I/U 等；展示版保留 添加页/删除页/缩略图换序/缩放/AI 改页/参数面板 等真实可用动作',
     'PPT-GOLDEN、teacher-15-ws-ppt.png',
     'ACCEPTED-DEVIATION：只保留有真实行为的编辑动作，不复刻纯展示按钮（UI Reality Contract）；已实现动作均可复演且进入导出/发布',
     '教师工作台 / v1', 'review-visual', 'qa/review-visual/REPORT.md §3 M5', '策展改写'],
    ['CUR-020', '导出物公式纯文本化', 'qa/acceptance/artifacts/final-椭圆-params.pptx / .pdf',
     '导出 PPTX/PDF 曾保留 $...$ LaTeX 标记', 'PPT 无法渲染 KaTeX；方案 §5 要求导出物可编辑可打开',
     '已实现 src/lib/plainMath.js：√/上下标/分式/关系符号转 Unicode；PPTX/PDF/DOCX 全部走该转换（导出文本实测无 $ 与反斜杠控制符）',
     '教师导出 / v1', 'review-functional（复验中）', 'qa/final_check.py 10/10；qa/acceptance/artifacts/', '策展补制'],
    ['CUR-021', '引导页锁定一屏 + 结论标题公式渲染（视觉 B1/B2）', 'qa/review-visual/shots/S05c-guide-A-final-scrolled.png、crop-guide-final-title.png',
     '旧包：引导页对话增长后输入区/结论卡被推出视口；结论标题显示裸 LaTeX', '方案 §5 溢出/公式错误直接判失败',
     '已修复：.layout:has(.guide) 锁定 100vh、聊天区内部滚动、输入区固定；结论标题接入 MathText',
     '学生引导页 / v2', 'review-visual（复验中）', 'qa/final_check.py 10/10；qa/explore/final-guide-A-fixed.png', '策展修正（缺陷驱动）'],
]

with open('evidence/curation-g2.csv', 'a', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    for r in ROWS:
        w.writerow(r)
print('appended', len(ROWS), 'rows')
