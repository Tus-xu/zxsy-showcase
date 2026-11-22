# -*- coding: utf-8 -*-
"""run-02 教师端 · 脚本 99：把分脚本步骤/网络取证合并为 api/steps.json（证据总索引）。"""
from __future__ import annotations

import json
import time
from pathlib import Path

API = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\teacher\api")
FILES = [
    ("01", "run-01-identity-pages.json", "身份/外框导航/六页盘点/入口卡可用性"),
    ("02a", "run-02a-workspace.json", "打开既有椭圆的定义会话 + 六视图结构"),
    ("02b", "run-02b-edit-export-publish.json", "真实编辑/导出/发布尝试与阻塞"),
    ("03", "run-03-pages-detail.json", "课堂/作业/组卷/批改/学情/资源/题库/历史 细节"),
    ("04", "run-04-new-session.json", "新建备课会话实测"),
    ("05", "run-05-textbook-picker.json", "新建会话教材选择卡尝试"),
    ("06", "run-06-clean.json", "干净版登录/身份/六页截图"),
]

out = {"run": "run-02", "role": "teacher", "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
       "account": {"phone": "13800001002", "name": "张老师", "role": "高中数学 · 教师"},
       "base_url": "http://127.0.0.1:5176", "viewport": {"width": 1672, "height": 941, "dpr": 1, "engine": "Chromium headless"},
       "note": "api_calls 中 body_file 为 api/bodies/ 下文件；Authorization/Cookie/Set-Cookie 已脱敏为 ***MASKED***。"
               "SSE(text/event-stream) 与二进制响应只记录元数据，不落 body。",
       "scripts": [], "all_steps": [], "api_call_count": 0}
seen_urls = set()
for tag, fn, desc in FILES:
    p = API / fn
    if not p.exists():
        continue
    d = json.loads(p.read_text(encoding="utf-8"))
    for s in d.get("steps", []):
        s2 = {"script": tag, **s}
        out["all_steps"].append(s2)
    for c in d.get("api_calls", []):
        out.setdefault("flat_calls", []).append({"script": tag, **c})
    out["scripts"].append({"script": tag, "file": f"api/{fn}", "desc": desc,
                           "steps": d.get("steps", []), "api_calls": d.get("api_calls", []),
                           "console": d.get("console", []), "page_errors": d.get("page_errors", []),
                           "request_failed": d.get("request_failed", [])})
    out["api_call_count"] += len(d.get("api_calls", []))

(API / "steps.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"scripts={len(out['scripts'])} steps={len(out['all_steps'])} api={out['api_call_count']}")