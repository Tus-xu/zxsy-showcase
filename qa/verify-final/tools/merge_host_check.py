# -*- coding: utf-8 -*-
"""并入 host_check.json 与补充观察，写回 verify.json。"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
OUT = os.path.join(ROOT, 'qa', 'verify-final')
d = json.load(open(os.path.join(OUT, 'verify.json'), encoding='utf-8'))
d['host_check'] = json.load(open(os.path.join(OUT, 'host_check.json'), encoding='utf-8'))
d['sample1']['off_clean_refresh']['observed'] = (
    '刷新后 URL=#/dialog/1d9dcbb2…（会话已恢复、9 条 AI 消息在 DOM 中），但消息按倒序呈现（最新在上、最早在下），'
    '页面滚到底部显示的是第 1 轮问答；终态补课卡/填空卡（.ix-*/.si-*/.fill）全部消失，附件卡显示「附件已丢失」。'
    '现役刷新后顺序正确、最后一条为终态回复、补课卡与 0/1 空已填保留。')
d['sample1']['off_clean_refresh']['off_after_last_is_turn0'] = True
with open(os.path.join(OUT, 'verify.json'), 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=1)
print('merged host_check + refresh observation')
print('host_check:', json.dumps({k: v for k, v in d['host_check'].items() if k != 'login_visible_text'}, ensure_ascii=False)[:600])