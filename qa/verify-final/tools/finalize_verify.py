# -*- coding: utf-8 -*-
"""汇总 verify.json：发行包静态扫描、断网审计合计、样板一/二/交互结论引用。"""
import datetime as dt
import hashlib
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = r'D:\zxsy-math-arena-showcase'
OUT = os.path.join(ROOT, 'qa', 'verify-final')
REL = os.path.join(ROOT, 'release', '开始演示.html')
d = json.load(open(os.path.join(OUT, 'verify.json'), encoding='utf-8'))

raw = open(REL, 'rb').read()
text = raw.decode('utf-8', errors='replace')
scan_tokens = ['演示身份卡', '三题陈列卡', '内容匹配', 'SHA-256', 'sha256', '发布成功 v1', '发布成功',
               '导出成功', '主持人浮标', '主持人工具', '主持人', 'Ctrl+Shift+H', '嘉宾模式', '演示专用']
scan = {'file': 'release/开始演示.html', 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw),
        'tokens': {t: text.count(t) for t in scan_tokens}}
d['release_scan'] = scan

# 包版本记录：v1（04:0x 构建，验收启动时）→ 最终包（04:40 构建，leader 通知后重跑）
d['package_versions'] = {
    'v1_superseded': {'sha256': 'ba0239c3bcab44912082299c5e264ab8d60aaa2182ce31b65a4ff3a1b2f2316e',
                      'bytes': 18467882, 'note': '首轮验收用包；留档于 *-sha-ba0239c3.json'},
    'v2_superseded': {'sha256': '782faff31291ccb88712508515db0625979cb50a316b3fe229bf9cf6d9b17ddb',
                      'bytes': 18471759, 'note': '第二次验收用包（新对话修复）；留档于 *-sha-782faff3.json'},
    'final': {'sha256': scan['sha256'], 'bytes': scan['bytes'],
              'note': '本次最终复核包；本报告逐屏/样板/交互/断网全部以该包重跑'},
}
scan_note = ('注意：SHA-256 / 发布成功 / 演示身份卡 等字符串若命中，均位于 JS 实现或属性中；'
             '21 页 + 登录页可见文本命中为 0。')
scan['note'] = scan_note

t1 = json.load(open(os.path.join(OUT, 'template1.json'), encoding='utf-8'))
t1c = json.load(open(os.path.join(OUT, 'template1_off_clean.json'), encoding='utf-8'))
t2 = json.load(open(os.path.join(OUT, 'template2.json'), encoding='utf-8'))
extra = json.load(open(os.path.join(OUT, 'live_extra.json'), encoding='utf-8'))

d['sample1'] = {
    'off_clean_consistent_rounds': t1c['consistent_rounds'], 'rounds': t1c['rounds'],
    'off_clean_rounds': [{'idx': s['idx'], 'kind': s['kind'], 'how': s['how'],
                          'retention_cn': s['retention_cn'], 'similarity_full': s['similarity_full']}
                         for s in t1c['clean_replay']['steps']],
    'off_clean_terminal': t1c['clean_replay']['terminal'],
    'live_terminal_has_remediation': t1['sides']['live']['terminal']['has_remediation'],
    'live_terminal_has_blank_0_1': t1['sides']['live']['terminal']['has_blank_0_1'],
    'live_terminal_has_finish_card': t1['sides']['live']['terminal']['has_finish_card'],
    'live_endpoint_text_tail': t1['sides']['live']['terminal']['tail'][:300],
    'off_endpoint_text_tail': t1['sides']['off']['terminal']['tail'][:300],
    'live_refresh': t1['sides']['live']['refresh'],
    'off_refresh_polluted_run': t1['sides']['off']['refresh'],
    'off_refresh_polluted_run_note': 'v1 包（ba0239c3）上"误点新对话导致会话被污染"的复跑；最终结论以 off_clean_refresh 为准',
    'off_clean_refresh': {
        'before_rows': t1c['clean_replay']['before_refresh_rows'],
        'after_rows': t1c['clean_replay']['after_refresh_rows'],
        'before_cards': t1c['clean_replay']['before_refresh'],
        'after_cards': t1c['clean_replay']['after_refresh'],
        'after_refresh_url': t1c['clean_replay']['after_refresh_url'],
        'after_last_ai_head': t1c['clean_replay']['after_refresh_last_ai'][:160],
        'thread_before': t1c['clean_replay'].get('thread_before_refresh'),
        'thread_after': t1c['clean_replay'].get('thread_after_refresh'),
        'last_ai_round8_retention': t1c['clean_replay'].get('last_ai_round8_retention'),
        'first_user_is_upload': t1c['clean_replay'].get('first_user_is_upload'),
        'known_deviation': '刷新后 18 条消息按顺序还原、首条「请分析我上传的文件」、末条为第 9 轮文本、无「附件已丢失」；'
                           '但交互卡片面板不重建（补课/填空/式子卡 0 个）、无附件缩略图 —— 已在 未通过项.md §C 声明的已知偏差（MINOR）。',
    },
    'new_chat_off': t1c['new_chat_probe'],
    'new_chat_live': extra['student_new_chat'],
    'upload': {'off': t1c['clean_replay']['attachment_ready'], 'live': t1['sides']['live']['upload']},
    'live_observers': {k: v for k, v in t1['sides']['live']['observers'].items() if k != 'responses'},
    'off_observers': {k: v for k, v in t1['sides']['off']['observers'].items() if k != 'responses'},
}
d['sample2'] = {
    'compare': t2['compare'],
    'live': t2['sides']['live']['t2_t3_workbench'],
    'off': t2['sides']['off']['t2_t3_workbench'],
    'ppt_live': {k: t2['sides']['live']['ppt_export_publish'].get(k) for k in
                 ('slide_pager_text', 'zero_pages', 'deck_tool_count', 'deck_tools_all_disabled',
                  'publish_tool', 'publish_disabled', 'publish_dialog_count', 'publish_requests',
                  'export_card_count', 'export_all_disabled', 'export_requests', 'downloads',
                  'plan_not_generated', 'plan_editable', 'plan_toolbar_disabled', 'forbidden_after_all')},
    'ppt_off': {k: t2['sides']['off']['ppt_export_publish'].get(k) for k in
                ('slide_pager_text', 'zero_pages', 'deck_tool_count', 'deck_tools_all_disabled',
                 'publish_tool', 'publish_disabled', 'publish_dialog_count', 'publish_requests',
                 'export_card_count', 'export_all_disabled', 'export_requests', 'downloads',
                 'plan_not_generated', 'plan_editable', 'plan_toolbar_disabled', 'forbidden_after_all')},
    'export_cards_live': t2['sides']['live']['ppt_export_publish'].get('export_cards'),
    'export_cards_off': t2['sides']['off']['ppt_export_publish'].get('export_cards'),
    't1_live': {k: t2['sides']['live']['t1_textbook'].get(k) for k in ('entry_cards', 'overlays_before', 'overlays_after', 'business_requests_after_click', 'text_changed')},
    't1_off': {k: t2['sides']['off']['t1_textbook'].get(k) for k in ('entry_cards', 'overlays_before', 'overlays_after', 'business_requests_after_click', 'text_changed')},
    'published_state_off': t2['sides']['off'].get('local_state_published'),
    'downloads_off': t2['sides']['off'].get('global_downloads'),
    'console_errors_live': t2['sides']['live'].get('console_errors'),
    'console_errors_off': t2['sides']['off'].get('console_errors'),
}
d['live_extra'] = extra

d['b1_fix_check'] = {
    'unknown_post': 'POST /api/foo/bar → HTTP 404 · code=40401「离线演示未收录该数据：POST /api/foo/bar」',
    'unknown_post_nested': 'POST /api/agent/conversations/xyz/actions → HTTP 404 · code=40401',
    'unknown_get': 'GET /api/nonexistent/path → HTTP 404 · code=40401',
    'actions_retry': 'POST /api/teacher-v3/prep/conversations/f5c84551…/actions → HTTP 409 · code=40900 · '
                     'message=动作 \'retry_run\' 不可执行：消息无上下文快照，无法重跑（请重新发送消息） · error_key=conflict · request_id=41a022f006504879',
    'classroom_retry_ui': '现役/离线均显示同一句 409 文案（t3_live_text_present=[true,true]），无 ErrorBoundary、无 pageerror',
    'immersive_retry_ui': '现役/离线均显示冲突卡「会话已被其他操作更新 / 服务端已有更新的版本。请刷新以获取最新内容，避免覆盖他人修改。/ 刷新查看新版本 / 重试 / request_id: …」，'
                          '归一化文本逐字一致（仅 request_id 不同）；HTTP 409、无 ErrorBoundary',
    'no_fake_sms_response': '未采证端点不再返回采证短信验证码；不再出现 demo_code 响应泄漏',
    'evidence': 'tools/probe_actions_da5025.log、tools/probe_unknown_da5025.log、template2.json、shots/template2/*-09-immersive-retry.png',
}

# 断网审计合计（含硬刷新）
audit = d['offline_audit']
audit['hard_reload_console_errors'] = {
    'per_hard_document_load': 2,
    'cold_login': len(d['guest_login']['off'].get('console_errors') or []),
    'sample1_clean_login_plus_reload': len(t1c['clean_replay'].get('console_errors') or []),
    'note': 'MathLive 静态字体装载器在 file:// 单文件下每"整页加载"报 2 条 console error；SPA 内导航 0 条；'
            '样板二脚本多次 reset 观察器，故其 console 计数不用于本口径。',
    'samples': sorted({c['text'][:160] for c in (d['guest_login']['off'].get('console_errors') or [])}),
}
audit['summary'] = {
    'pages_checked': len(d['pages']),
    'http_ws_requests': audit['http_ws_requests_total'],
    'pageerrors': audit['pageerrors_total'],
    'console_errors_spa_navigation': audit['console_errors_total'],
    'broken_images': audit['broken_images_total'],
}
with open(os.path.join(OUT, 'verify.json'), 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=1)
print('FINALIZED verify.json')
print('release_scan tokens', json.dumps(scan['tokens'], ensure_ascii=False))
print('audit', json.dumps(audit['summary'], ensure_ascii=False), json.dumps(audit['hard_reload_console_errors'], ensure_ascii=False)[:300])