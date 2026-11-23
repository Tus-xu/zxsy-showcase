# -*- coding: utf-8 -*-
"""按本轮证据回填 coverage.csv 的判定列（不改行数、不删分母）。

证据映射：
  FQA  kqa/student-showcase/fqa/FQA.json（12 条独立功能 QA）
  VQA  qa/student-showcase/vqa/VQA.json（10 页独立视觉 QA）
  P3   qa/student-showcase/probes/probe3b.json（缺口补采后复验）
  G    evidence/live/run-03/guide/REPORT.md（三题重测，均未收束）
"""
import csv
import json
import os

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(WT, 'qa', 'student-showcase', 'coverage.csv')

# id -> (功能结论, 视觉结论, 采证/用例, 截图, 未通过原因)
M = {
    'S-DLG-01': ('通过', '通过', 'FQA-01 / VQA p1', 'fqa/shots/01a-dialog-initial.png; vqa/side/p01-dialog.png', ''),
    'S-DLG-02': ('通过', '通过', 'FQA-01 / VQA p1', 'fqa/shots/01a-dialog-initial.png; vqa/side/p01-dialog.png',
                 '本轮补采后 30 条会话（run-03b）'),
    'S-DLG-03': ('通过', '', 'FQA-02', 'fqa/shots/02a-new-dialog.png', ''),
    'S-DLG-04': ('通过', '', 'FQA-03 / P3 会话 30 条点开', 'fqa/shots/03a-history-restored.png', '11 条为空会话（现役真实空数据）'),
    'S-DLG-05': ('通过', '', 'probes/smoke-A2（att ready→首轮回复）', 'probes/smoke-A2.png', ''),
    'S-DLG-06': ('BLOCKED', '', 'G flow-A（10 轮）', 'evidence/live/run-03/guide/shots/A-t09-after.png',
                 '现役 socratic solver 未收束：第 9 轮重复第 6 轮追问（a、b、c 关系式），并把「求离心率」误判为缺定大小条件；无完成卡'),
    'S-DLG-07': ('BLOCKED', '', 'G flow-B（8 轮）', 'evidence/live/run-03/guide/shots/B-t04-after.png',
                 '现役结构化卡目标式抽取与提问不一致（keypad 只给 AA_1D），数学正确的 BC⊥AA₁ 被判错，停在第 2/5 步'),
    'S-DLG-08': ('BLOCKED', '', 'G flow-C（9 轮）', 'evidence/live/run-03/guide/shots/C-*.png',
                 '现役在给出正确指示变量推导后转示范并改问 X=3，不回收束，停在第 3/5 步'),
    'S-DLG-09': ('通过', '', 'FQA-12 刷新 / probes', 'fqa/shots/12a-refresh-dialog.png', '卡片面板不重建（已知偏差，见 未通过项 C）'),
    'S-PRC-01': ('待采证', '', '', '', ''),
    'S-PRC-02': ('待采证', '', '', '', ''),
    'S-PRC-03': ('待采证', '', '', '', ''),
    'S-PRC-04': ('待采证', '', '', '', ''),
    'S-ERR-01': ('通过', '通过', 'FQA-07 / VQA p5', 'fqa/shots/07a-errors-autodetail.png; vqa/side/p05-errors.png', ''),
    'S-ERR-02': ('通过', '', 'FQA-07 / run-03 5 个筛选 Tab', 'fqa/shots/07b-errors-list.png', ''),
    'S-ERR-03': ('通过', '', 'run-03b 7 条详情 × 3 端点 / P3 01/26', 'evidence/live/run-03b/shots/34-errors-detail-01-*.png', ''),
    'S-ERR-04': ('待采证', '', '', '', ''),
    'S-ERR-05': ('待采证', '', '', '', ''),
    'S-LIB-01': ('通过', '通过', 'VQA p2', 'vqa/side/p02-library-docs.png', ''),
    'S-LIB-02': ('通过', '通过', 'FQA-04 / VQA p3 / P3', 'fqa/shots/04a-library-questions.png; vqa/side/p03-library-questions.png', '24/24 条（现役同）'),
    'S-LIB-03': ('通过', '', 'FQA-05（守门线）', 'fqa/shots/05a-search-hanshu.png', '函数 14/14、导数 6/6、清空 24/24'),
    'S-LIB-04': ('待采证', '', 'run-03 采证 offset>0 现役不可达（24<页长 30）', '', '现役 UI 无「加载更多」'),
    'S-LIB-05': ('待采证', '', '', '', ''),
    'S-LIB-06': ('待采证', '', '', '', ''),
    'S-RES-01': ('通过', '通过', 'FQA-06 / VQA p4', 'fqa/shots/06a-resources-reco.png; vqa/side/p04-resources.png', ''),
    'S-RES-02': ('通过', '', 'run-03b 12 张封面内联 / P3 0 破图', 'probes/p3-resources-kp.png', ''),
    'S-RES-03': ('BLOCKED', '', 'FQA-06', '', '外部依赖：卡片目标为 bilibili.com，断网不可达'),
    'S-CLS-01': ('通过', '通过', 'FQA-08 / VQA p6', 'fqa/shots/08a-classroom-tasks.png; vqa/side/p06-classroom.png', ''),
    'S-CLS-02': ('待采证', '', '', '', ''),
    'S-CLS-03': ('通过', '', 'P3 双师课堂卡片（已学完/复习）', 'probes/p3-deck2.png', ''),
    'S-CLS-04': ('通过', '通过', 'FQA-09 / VQA p7 / P3 5/5', 'fqa/shots/09a-deck-open.png; vqa/side/p07-dual.png', ''),
    'S-CLS-05': ('待采证', '', '', '', ''),
    'S-CLS-06': ('通过', '', 'P3 续播落点 5/5（现役同）', 'probes/p3-deck2.png', ''),
    'S-ASG-01': ('待采证', '', '', '', ''),
    'S-ASG-02': ('待采证', '', '', '', ''),
    'S-ASG-03': ('通过', '通过', 'FQA-10 / VQA p8', 'fqa/shots/10a-task-feedback-graded.png; vqa/side/p08-task-graded.png', 'teacher_feedback 为 null 属现役数据'),
    'S-ASG-04': ('待采证', '', '', '', ''),
    'S-ASG-05': ('待采证', '', '', '', ''),
    'S-ME-01': ('通过', '通过', 'VQA p9', 'vqa/side/p09-me-report.png', ''),
    'S-ME-02': ('通过', '通过', 'VQA p10', 'vqa/side/p10-me-map.png', ''),
    'S-ME-03': ('BLOCKED', '', 'FQA-11', '', '现役缺陷：/api/api/trial/metrics 恒 404'),
    'S-ME-04': ('待验', '', 'FQA-11（3/4 Tab 正常）', '', ''),
    'S-ROL-01': ('待采证', '', '', '', ''),
    'S-ROL-02': ('待验', '', '', '', ''),
    'S-ROL-03': ('待采证', '', '', '', ''),
    'S-ROL-04': ('待采证', '', '', '', ''),
}

rows = list(csv.DictReader(open(CSV, encoding='utf-8-sig')))
for r in rows:
    if r['id'] in M:
        fn, vis, ev, shots, why = M[r['id']]
        r['功能结论'] = fn
        r['视觉结论'] = vis
        r['现役采证'] = ev
        r['离线用例'] = ev
        r['截图编号'] = shots
        r['未通过原因'] = why
with open(CSV, 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

from collections import Counter
print('rows', len(rows))
print('功能:', Counter(r['功能结论'] for r in rows))
print('视觉:', Counter(r['视觉结论'] or '(空)' for r in rows))