# -*- coding: utf-8 -*-
"""从 run-02 学生端采证结果生成机器可读回放包 flow-A.json / flow-B.json / flow-C.json。

用法：
  python gen_flows.py              # 使用小林的证据（guide-results.json / steps.json）
  python gen_flows.py --tag x --suffix -alt   # 备用（同班演示学生）证据
输入：
  api/guide-results.json（或 guide-results-<tag>-ABC.json）
  api/steps.json（或 steps-<tag>.json）
  api/bodies/*.sse.txt（每轮 SSE 原文，CDP 实测）
输出：
  api/flow-A.json flow-B.json flow-C.json（--suffix 时加后缀）
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\student")
API = BASE / "api"
IMAGES = {
    "A": r"D:\zxsy-math-arena\docs\superpowers\plans\题1.png",
    "B": r"D:\zxsy-math-arena\docs\superpowers\plans\题2.png",
    "C": r"D:\zxsy-math-arena\docs\superpowers\plans\题3.png",
}
TERMINAL_PATTERNS = ["本次引导完成", "引导完成", "引导结束", "恭喜你", "最终答案",
                     "答案为", "正确答案", "独立完成", "你已经掌握", "本题结束", "引导到这里"]


def parse_args():
    tag = None
    suffix = ""
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--tag" and i + 1 < len(sys.argv):
            tag = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--suffix" and i + 1 < len(sys.argv):
            suffix = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    return tag, suffix


def sha256_lower(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def body_text(entry: dict | None) -> str | None:
    if not entry:
        return None
    p = entry.get("resp_body_path")
    if p and (API / p).exists():
        return (API / p).read_text(encoding="utf-8", errors="replace")
    head = entry.get("resp_body_head") or ""
    return head or None


def req_text(entry: dict | None) -> str | None:
    if not entry:
        return None
    p = entry.get("req_body_path")
    if p and (API / p).exists():
        return (API / p).read_text(encoding="utf-8", errors="replace")
    head = entry.get("req_body_head") or ""
    return head or None


def chat_message(req: str | None) -> str | None:
    if not req:
        return None
    try:
        return json.loads(req).get("message")
    except Exception:  # noqa: BLE001
        m = re.search(r'"message"\s*:\s*"((?:[^"\\]|\\.)*)"', req)
        if not m:
            return None
        try:
            return json.loads('"' + m.group(1) + '"')
        except Exception:  # noqa: BLE001
            return m.group(1)


def redact_req(text: str | None) -> str | None:
    if not text:
        return text
    return re.sub(r'("(?:authorization|cookie|token|access_token|refresh_token|password)"\s*:\s*")[^"]*',
                  r'\1<redacted>', text, flags=re.I)


def sanitize(text: str | None) -> str | None:
    if not text:
        return text
    text = re.sub(r"(token=)[^\"&\\]+", r"\1<redacted>", text)
    text = re.sub(r'("(?:token|access_token|refresh_token)"\s*:\s*")[^"]*', r"\1<redacted>", text)
    text = re.sub(r"(sig=)[^\"&\\]+", r"\1<redacted>", text)
    return text


def upload_request_info(entries: list[dict]) -> dict:
    for e in entries:
        if e.get("url", "").endswith("/api/files/upload") and e.get("method") == "POST":
            txt = req_text(e)
            info = {"upload_req_filename": None, "upload_req_size_bytes": None,
                    "upload_req_sha256": None}
            if txt:
                try:
                    d = json.loads(txt)
                    info["upload_req_filename"] = d.get("filename")
                    info["upload_req_size_bytes"] = d.get("size_bytes")
                    info["upload_req_sha256"] = d.get("sha256")
                    if info["upload_req_sha256"]:
                        info["upload_req_sha256"] = info["upload_req_sha256"].lower()
                except Exception:  # noqa: BLE001
                    m = re.search(r'"filename"\s*:\s*"([^"]+)"', txt)
                    if m:
                        info["upload_req_filename"] = m.group(1)
            return info
    return {"upload_req_filename": None, "upload_req_size_bytes": None, "upload_req_sha256": None}


def main() -> int:
    tag, suffix = parse_args()
    if tag:
        guide_path = API / f"guide-results-{tag}-ABC.json"
        steps_path = API / f"steps-{tag}.json"
    else:
        guide_path = API / "guide-results.json"
        steps_path = API / "steps.json"
    guide = json.loads(guide_path.read_text(encoding="utf-8"))
    steps = json.loads(steps_path.read_text(encoding="utf-8"))["entries"]
    summary = {}
    for case in ("A", "B", "C"):
        res = guide["cases"].get(case) or {}
        img = IMAGES[case]
        entries = [e for e in steps if re.match(rf"T{case}-", e.get("step") or "")]
        up_entry = next((e for e in entries if e.get("url", "").endswith("/api/files/upload")
                         and e.get("method") == "POST"), None)
        parse_entry = next((e for e in entries if "/parse" in e.get("url", "")
                            and e.get("method") == "POST"), None)
        content_entry = next((e for e in entries if "/content" in e.get("url", "")
                              and e.get("method") == "GET"), None)
        file_id = None
        if parse_entry:
            m = re.search(r"/api/files/([0-9a-f-]+)/parse", parse_entry.get("url", ""))
            if m:
                file_id = m.group(1)
        if not content_entry and file_id:
            content_entry = next((e for e in steps
                                  if f"/api/files/{file_id}/content" in e.get("url", "")), None)

        turns = []
        for t in sorted(res.get("turns", []), key=lambda x: x.get("turn", 0)):
            idx = t.get("turn", 0)
            step_name = f"T{case}-send-image" if idx == 0 else f"T{case}-turn{idx}"
            chat_entries = [e for e in steps if e.get("step") == step_name
                            and e.get("url", "").endswith("/api/agent/chat")
                            and e.get("method") == "POST"]
            req = req_text(chat_entries[-1]) if chat_entries else None
            sse_text = None
            for s in t.get("sse") or []:
                fp = s.get("file")
                if fp and (API / fp).exists():
                    sse_text = (API / fp).read_text(encoding="utf-8", errors="replace")
                    break
            turns.append({
                "idx": idx,
                "input": None if idx == 0 else chat_message(req),
                "attachment": idx == 0,
                "req": redact_req(req),
                "sse": sse_text,
                "kind": t.get("kind"),
                "input_note": t.get("detail") or t.get("note"),
                "reply_text_dom": t.get("reply"),
            })

        last = res.get("turns", [{}])[-1] if res.get("turns") else {}
        last_text = last.get("reply") or ""
        concluded = bool(last.get("terminal_detected")) or last.get("stopped") == "socratic_complete_card" \
            or any(p in (last_text or "") for p in TERMINAL_PATTERNS)
        blocked = res.get("blocked")
        if not blocked and not concluded:
            if last.get("stopped"):
                blocked = last.get("stopped")
            elif len(turns) >= 9:
                blocked = "max_turns_reached"
        final_state = {
            "concluded": concluded,
            "last_ai_text": last_text,
            "blocked_at": None if concluded else blocked,
            "url": res.get("conv_url") or (res.get("conversation_new") or {}).get("url"),
            "blocked_reason": (None if concluded else
                               "最后一轮仍停在结构化交互卡（圈点标注/式子输入/补课检验），未出现收束/最终答案；"
                               "采集脚本在 expr_input 卡上重复提交同一式子，部分加剧了循环（见 collector_limitation）"),
        }

        upload_resp = sanitize(body_text(up_entry))
        parse_resp = sanitize(body_text(parse_entry))
        content_resp = sanitize(body_text(content_entry))
        if content_entry and not content_resp:
            content_note = (f"响应体未捕获/不可文本化（HTTP {content_entry.get('status')}，"
                            f"mime={content_entry.get('resp_mime') or '?'}，bytes={content_entry.get('resp_body_bytes')}）")
            content_resp = None
        else:
            content_note = None
        flow = {
            "case": case,
            "image": {"src": img, "sha256": sha256_lower(img), "bytes": Path(img).stat().st_size},
            "upload": {"status": up_entry.get("status") if up_entry else None,
                       "resp": upload_resp},
            "parse": {"status": parse_entry.get("status") if parse_entry else None,
                      "resp": parse_resp},
            "file_content": {"status": content_entry.get("status") if content_entry else None,
                             "resp": content_resp, "note": content_note},
            "turns": turns,
            "final_state": final_state,
        }
        flow.update(upload_request_info(entries))
        flow["upload_file_id"] = file_id
        if tag:
            flow["collector_account"] = {"phone": "13800001004", "tag": tag,
                                        "note": "主账号 13800001001 触发每用户每小时 10 次上传限流；备用同班演示学生采集"}
            flow["collector_limitation"] = ("自动化采集器在 socratic_interaction(form=expr_input) 卡上"
                                            "未按轮次递增候选式子，多次提交同一表达式，平台因此反复退回/换提示；"
                                            "该重复部分是采集器策略所致，复现时可按正确式子逐轮作答。")
        out = API / f"flow-{case}{suffix}.json"
        out.write_text(json.dumps(flow, ensure_ascii=False, indent=2), encoding="utf-8")
        ss = sum(1 for t in turns if t["sse"])
        summary[case] = {"turns": len(turns), "turns_with_sse": ss,
                         "concluded": concluded, "blocked_at": final_state["blocked_at"],
                         "upload_status": flow["upload"]["status"],
                         "parse_status": flow["parse"]["status"],
                         "content_status": flow["file_content"]["status"],
                         "filename": flow["upload_req_filename"]}
        print(f"{out.name}: {summary[case]}", flush=True)
    print("SUMMARY " + json.dumps(summary, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())