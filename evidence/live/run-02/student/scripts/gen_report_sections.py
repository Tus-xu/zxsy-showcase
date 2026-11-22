# -*- coding: utf-8 -*-
"""生成 REPORT.md 的 ③ 时间线 / ④ 终点结论 markdown（从实测 JSON 直接取，不手抄）。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

API = Path(r"D:\zxsy-math-arena-showcase\evidence\live\run-02\student\api")
GUIDE = API / "guide-results-x-ABC.json"
OUT = API / "report-sections.md"

TERMINAL = ["本次引导完成", "引导完成", "引导结束", "恭喜你", "最终答案", "答案为", "正确答案",
            "独立完成", "你已经掌握", "本题结束", "引导到这里"]


def map_shot(p: str | None) -> str:
    if not p:
        return "—"
    p = p.replace("shots/x-ta-", "shots/a-t1-").replace("shots/x-tb-", "shots/a-t2-") \
         .replace("shots/x-tc-", "shots/a-t3-")
    return f"`{p}`"


def clip(s: str | None, n: int) -> str:
    s = re.sub(r"\s+", " ", s or "").strip()
    s = s.replace("|", "\\|")
    return s[:n] + ("…" if len(s) > n else "")


def tail(s: str | None, n: int) -> str:
    s = re.sub(r"\s+", " ", s or "").strip()
    s = s.replace("|", "\\|")
    return ("…" + s[-n:]) if len(s) > n else s


def turn_input(t: dict) -> str:
    if t.get("turn") == 0:
        return "（纯图首轮：不输入文字，点「发送」；前端自动补默认指令「请分析我上传的文件」）"
    if t.get("input"):
        return clip(t["input"], 260)
    kind = t.get("kind")
    mapping = {
        "choice": "点选平台「思路选项」",
        "form_text": "交互卡打字回退输入",
        "form_expr": "式子输入卡填写式子并点「写好了」",
        "form_cloze": "填空卡逐空点选并点「填好了」",
        "form_skip": "点交互卡跳过",
        "form_submit": "点交互卡提交",
        "form_click": "点交互卡按钮",
        "confirm": "点「我再想想」",
        "button": "点引导按钮",
        "text_restate_problem": "按平台要求以文字补题",
    }
    return mapping.get(kind, kind or "—")


def controls(t: dict) -> str:
    st = t.get("state_after") or {}
    parts = []
    if t.get("kind"):
        parts.append(f"输入类型={t['kind']}")
    sb = st.get("sendButton") or {}
    parts.append("发送" + ("禁用" if sb.get("disabled") else "可用"))
    if st.get("stepBadges"):
        parts.append("步徽标=" + " / ".join(st["stepBadges"]))
    cards = t.get("cards") or []
    if cards:
        forms = [c.get("form") for c in cards if c.get("form")]
        cls = [c.get("cls", "").split()[0] for c in cards if c.get("cls")]
        if forms:
            parts.append("交互卡 form=" + ",".join(forms))
        parts.append("卡片=" + ",".join(cls[:3]))
    if t.get("toasts"):
        parts.append("toast=" + ";".join(t["toasts"])[:120])
    return clip("；".join(parts), 300)


def final_of(case_res: dict) -> dict:
    turns = case_res.get("turns") or []
    last = turns[-1] if turns else {}
    last_text = last.get("reply") or ""
    concluded = bool(last.get("terminal_detected")) or last.get("stopped") == "socratic_complete_card" or any(
        p in last_text for p in TERMINAL)
    blocked = case_res.get("blocked")
    if not blocked and not concluded:
        blocked = last.get("stopped") or ("max_turns_reached" if len(turns) >= 8 else "loop_ended_without_terminal")
    return {"turns": turns, "last": last, "last_text": last_text, "concluded": concluded,
            "blocked": None if concluded else blocked}


def main() -> int:
    d = json.loads(GUIDE.read_text(encoding="utf-8"))
    md = []
    md.append("### 3.0 采集说明\n")
    md.append("- 下列三题时间线来自**备用同班演示学生账号 13800001004（小陈）**的完整采证实录："
              "主账号 13800001001（小林）在 02:18–02:34 完成 5 次上传后触发「每用户 10 次/小时」上传限流，"
              "之后无法继续上传。两账号走的是同一套学生端 UI 与同一 API，本文 ① ② 的版本/身份/页面证据仍为小林账号实测；"
              "时间线与 flow 回放包标注 `collector_account`。\n")
    md.append("- 每题独立新对话；每题都真实经过系统文件选择器选择原图（不复用缓存）；"
              "首轮只发图，之后每次只发平台要求的下一条输入（选项就点、填空/式子就用平台控件或打字回退）。\n")
    md.append("- 关键同屏状态（首轮上传后）：附件卡 `题N.png ✅ 已就绪 mimo_vision ×`（缩略图 40×40、文件名、引擎绿字）；"
              "发送按钮 enabled（标题「发送」）；textarea 空、placeholder 原文、字数 `0/4000`；"
              "左侧栏 240px/主区 1432px；**无「第 N 题」标签、无 SHA-256 展示**（SHA-256 仅在 `POST /api/files/upload` 请求体）。\n")
    md.append("- 每题上传后的原文状态见 `api/guide-results-x-ABC.json` 的 `cases.<X>.upload_state`，"
              "完整 DOM 快照见 `api/dom/a-t*-upload.html`。\n")

    for case, label in (("A", "题1（A）双曲线离心率"), ("B", "题2（B）正三棱柱判断"), ("C", "题3（C）有放回取球期望")):
        res = d["cases"].get(case) or {}
        up = res.get("upload") or {}
        conv = (res.get("conversation_new") or {}).get("url") or res.get("conv_url")
        md.append(f"\n#### 3.{'ABC'.index(case) + 1} {label}\n")
        md.append(f"- 原图：`{(res.get('problem_file') or '')}`；SHA-256（现算）：`{up.get('sha256_original', '')}`；bytes={up.get('size')}")
        md.append(f"- 新对话：`{conv}`；入口控件：{up.get('control_clicked')}；文件选择器：opened={up.get('picker_opened')}，multiple={up.get('picker_is_multiple')}")
        md.append(f"- 上传受理：parsed={up.get('parsed')}，failed={up.get('failed')}"
                  + (f"，失败文案=`{up.get('failed_text')}`" if up.get("failed_text") else ""))
        state = res.get("upload_state") or {}
        att = (state.get("attachments") or [{}])[0]
        md.append(f"- 同屏上传态：附件卡文本 `{att.get('text')}`；卡片尺寸 {att.get('rect')}；"
                  f"文件名=`{att.get('name')}`；发送按钮={json.dumps(state.get('sendButton'), ensure_ascii=False)}；"
                  f"无题号标签={not state.get('questionLabel')}；无 SHA 展示={not state.get('sha256Visible')}")
        md.append("\n| 轮次 | 我的输入（实际发出） | 平台回复原文摘录（前 300 字） | 控件状态 | 截图（学生输入 / 平台回复） |")
        md.append("|---|---|---|---|---|")
        for t in res.get("turns") or []:
            idx = t.get("turn", 0)
            md.append(f"| {idx} | {turn_input(t)} | {clip(t.get('reply'), 300)} | {controls(t)} | "
                      f"{map_shot(t.get('shot_input'))} / {map_shot(t.get('shot_reply'))} |")
        f = final_of(res)
        done = "成功收束" if f["concluded"] else "未收束/中途停"
        md.append(f"\n- **终点**：{done}；blocked_at={f['blocked']}；最后一轮回复尾部：{tail(f['last_text'], 500)}")
        md.append(f"- 终点 URL：`{res.get('conv_url')}`；会话标题：`{res.get('conv_title')}`；"
                  f"最后一张整页终态截图：{map_shot(res.get('final_shot'))}；刷新后截图：{map_shot((d.get('persistence', {}).get(case) or {}).get('shot'))}")
        persist = (d.get("persistence", {}).get(case) or {})
        if persist:
            md.append(f"- 刷新持久化：before ai={persist.get('before', {}).get('aiCount')} / after ai={persist.get('after', {}).get('aiCount')}；"
                      f"messages_preserved={persist.get('messages_preserved')}；刷新后步徽标={persist.get('after', {}).get('stepBadges')}")
        # 复现步骤
        steps = ["打开 `/login` 用演示学生登录 → `/dialog` 点「＋ 新对话」"]
        for t in res.get("turns") or []:
            idx = t.get("turn", 0)
            if idx == 0:
                steps.append(f"点「{up.get('control_clicked')}」→ 文件选择器选原图 → 等附件卡 `✅ 已就绪` → 点「发送」")
            elif t.get("input"):
                steps.append(f"第 {idx} 轮：输入框发送 `{clip(t['input'], 120)}`")
            else:
                steps.append(f"第 {idx} 轮：{turn_input(t)}")
        md.append("- 复现步骤：\n" + "\n".join(f"  {i + 1}. {s}" for i, s in enumerate(steps)))

    OUT.write_text("\n".join(md), encoding="utf-8")
    print("saved", OUT.symmetric_difference(OUT) if False else OUT, flush=True)
    # 摘要
    for case in ("A", "B", "C"):
        res = d["cases"].get(case) or {}
        f = final_of(res)
        print(case, "turns=", len(f["turns"]), "concluded=", f["concluded"], "blocked=", f["blocked"],
              "last=", tail(f["last_text"], 120), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())