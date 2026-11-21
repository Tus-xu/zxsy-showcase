# -*- coding: utf-8 -*-
"""教师备课中心 / PPT / 教案 / 发布 / 导出 全链路 E2E（1672×941 DPR1，截图 + 真实下载）。

运行前置：pnpm exec vite --port 5203 --strictPort
运行：python qa/teacher-prep/run_e2e.py
产物：qa/teacher-prep/*.png、artifacts/*（PPTX/PDF/DOCX/MD）、records.json、manifest.json
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5203"
ROOT = Path(r"D:\zxsy-math-arena-showcase\qa\teacher-prep")
ART = ROOT / "artifacts"
SHOTS = ROOT

ART.mkdir(parents=True, exist_ok=True)

STEPS: list[tuple[str, bool, str]] = []
CONSOLE_ERRORS: list[str] = []
DOWNLOADS: dict[str, Path] = {}


def check(name: str, ok: bool, detail: str = "") -> None:
    STEPS.append((name, bool(ok), detail))
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f" :: {detail}" if detail else ""), flush=True)


def shot(page, name: str) -> Path:
    path = SHOTS / name
    page.screenshot(path=str(path), full_page=False)
    return path


def wait(page, ms: int = 350) -> None:
    page.wait_for_timeout(ms)


def text(page, selector: str, default: str = "") -> str:
    el = page.query_selector(selector)
    return el.inner_text().strip() if el else default


def value(page, selector: str) -> str:
    el = page.query_selector(selector)
    return el.input_value() if el else ""


def save_download(page, click_selector: str, target: Path, label: str) -> Path | None:
    try:
        with page.expect_download(timeout=30000) as dl_info:
            page.click(click_selector)
        download = dl_info.value
        download.save_as(str(target))
        DOWNLOADS[label] = target
        size = target.stat().st_size if target.exists() else 0
        check(f"下载 {label}", size > 800, f"{target.name} · {size} bytes")
        return target
    except Exception as exc:  # noqa: BLE001
        check(f"下载 {label}", False, repr(exc)[:240])
        return None


def state(page) -> dict:
    return page.evaluate("JSON.parse(localStorage.getItem('mathesis-showcase-v1') || '{}')")


def goto(page, route: str, wait_ms: int = 900) -> None:
    page.goto(f"{BASE}/#{route}", wait_until="domcontentloaded")
    page.wait_for_timeout(wait_ms)


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(
            viewport={"width": 1672, "height": 941},
            device_scale_factor=1,
            accept_downloads=True,
            locale="zh-CN",
        )
        page = context.new_page()
        page.on("pageerror", lambda e: CONSOLE_ERRORS.append(f"pageerror: {e}"))
        page.on(
            "console",
            lambda m: CONSOLE_ERRORS.append(f"console.{m.type}: {m.text}") if m.type == "error" else None,
        )

        # ── 0. 清空历史演示状态，保证从干净基线开始 ─────────────────────
        goto(page, "/teacher/prep", 400)
        page.evaluate("localStorage.removeItem('mathesis-showcase-v1')")
        goto(page, "/teacher/prep", 900)

        check("备课中心加载", page.query_selector("[data-testid=prep-center]") is not None)
        cards = page.query_selector_all(".lesson-card")
        check("备课中心三课时卡片", len(cards) >= 3, f"{len(cards)} 张")
        lesson_titles = [text(page, f"[data-testid=lesson-card-{i}] .lesson-card__title") for i in range(3)]
        check(
            "三课时名称",
            all(any(k in t for t in lesson_titles) for k in ["椭圆", "二次函数", "集合"]),
            " / ".join(lesson_titles),
        )
        shot(page, "01-prep-center.png")

        # ── 1. 打开椭圆课时 → PPT Tab 默认页（Golden 3/6） ─────────────
        page.click("[data-testid=lesson-card-0]")
        page.wait_for_url("**/teacher/prep/w/prep-ellipse/**")
        wait(page, 800)
        check("进入工作台", page.query_selector("[data-testid=prep-workbench]") is not None)
        shot(page, "02-workbench-classroom.png")

        page.click("[data-testid=tab-ppt]")
        wait(page, 700)
        check("PPT Tab 激活", "is-active" in (page.get_attribute("[data-testid=tab-ppt]", "class") or ""))
        counter = text(page, "[data-testid=slide-counter]")
        check("默认停在 Golden 第 3/6 页", "3 / 6" in counter, counter)
        title_value = value(page, "[data-testid=slide-title-input]")
        check("默认页标题", "椭圆的定义" in title_value, title_value)
        c_before = text(page, "[data-testid=param-c]")
        e_before = text(page, "[data-testid=param-e]")
        check("默认 a=5,b=3 → c=4.0", c_before == "4.0", f"c={c_before}")
        check("默认 e=0.8", e_before == "0.8", f"e={e_before}")
        shot(page, "03-ppt-before-params.png")

        # ── 2. 修改 a、b → c/e、图形标注、公式三处同步 ──────────────────
        page.fill("[data-testid=param-a]", "6")
        wait(page, 150)
        page.fill("[data-testid=param-b]", "4")
        wait(page, 450)
        c_after = text(page, "[data-testid=param-c]")
        e_after = text(page, "[data-testid=param-e]")
        check("修改 a=6,b=4 → c=4.5", c_after == "4.5", f"c={c_after}")
        check("修改后 e≈0.745", e_after.startswith("0.745"), f"e={e_after}")
        anno = text(page, "[data-testid=figure-annotation]")
        eq_derived = text(page, "[data-testid=equation-derived]")
        check("图形标注同步 2a=12", "2a = 12" in anno, anno[:80])
        check("标注中含 c 计算式 4.472", "4.472" in anno, anno[:120])
        check("公式区同步 x²/36 + y²/16", "36" in eq_derived and "16" in eq_derived, eq_derived[:120])
        check("公式区同步 e 值", "0.745" in eq_derived, eq_derived[:160])
        shot(page, "04-ppt-after-params.png")

        # ── 3. 编辑当前页标题（真实输入框）→ 自动保存 ────────────────────
        page.fill("[data-testid=slide-title-input]", "椭圆的定义（终审版）")
        wait(page, 500)
        saved = text(page, "[data-testid=saved-indicator]")
        check("标题编辑后显示已保存时间", "已保存" in saved, saved)
        st = state(page)
        sess = st.get("ext", {}).get("teacherPrep", {}).get("sessions", {}).get("prep-ellipse", {})
        saved_title = (sess.get("slides") or [{}] * 6)[2].get("title", "")
        check("编辑进入 store.ext.teacherPrep", saved_title == "椭圆的定义（终审版）", saved_title)
        shot(page, "05-ppt-title-edited.png")

        # ── 4. 底部 AI 改页：真实添加要点 ───────────────────────────────
        bullets_before = page.locator("[data-testid=slide-bullets] li").count()
        page.fill("[data-testid=ai-input]", "添加要点：焦点弦的长度随参数联动")
        page.click("[data-testid=ai-send]")
        wait(page, 450)
        feedback = text(page, "[data-testid=ai-feedback]")
        bullets_after = page.locator("[data-testid=slide-bullets] li").count()
        check("AI 改页产生真实要点", bullets_after == bullets_before + 1, f"{bullets_before} -> {bullets_after}")
        check("AI 改页反馈", "添加要点" in feedback, feedback[:80])
        shot(page, "06-ppt-ai-edit.png")

        # 4.1 AI 未识别指令：不假装成功（显示可恢复的错误提示）
        page.fill("[data-testid=ai-input]", "帮我变好看一点")
        page.click("[data-testid=ai-send]")
        wait(page, 400)
        err_feedback = text(page, "[data-testid=ai-feedback]")
        err_cls = page.get_attribute("[data-testid=ai-feedback]", "class") or ""
        check("AI 未识别指令显示错误态", "未识别" in err_feedback and "is-error" in err_cls, err_feedback[:80])

        # 4.2 缩略图上下移动（真实换序，可复原）
        before_order = [t for t in state(page)["ext"]["teacherPrep"]["sessions"]["prep-ellipse"]["slides"]]
        before_titles = [s["title"] for s in before_order]
        page.locator("[data-testid=slide-thumb-0]").hover()
        page.click("[data-testid=slide-move-down-0]")
        wait(page, 350)
        moved_titles = [s["title"] for s in state(page)["ext"]["teacherPrep"]["sessions"]["prep-ellipse"]["slides"]]
        check("缩略图下移真实换序", moved_titles[1] == before_titles[0], f"{moved_titles[:2]}")
        page.locator("[data-testid=slide-thumb-1]").hover()
        page.click("[data-testid=slide-move-up-1]")
        wait(page, 350)
        restored_titles = [s["title"] for s in state(page)["ext"]["teacherPrep"]["sessions"]["prep-ellipse"]["slides"]]
        check("缩略图上移复原", restored_titles == before_titles, f"{restored_titles[:2]}")

        # 4.3 添加页 / 删除页 / 缩放（真实状态变化）
        page.click("[data-testid=add-slide]")
        wait(page, 350)
        counter_added = text(page, "[data-testid=slide-counter]")
        check("添加页后 7/7", "7 / 7" in counter_added, counter_added)
        page.click("[data-testid=delete-slide]")
        wait(page, 350)
        counter_deleted = text(page, "[data-testid=slide-counter]")
        check("删除页后回到 6/6", "6 / 6" in counter_deleted, counter_deleted)
        page.click("[data-testid=zoom-in]")
        wait(page, 150)
        z1 = text(page, "[data-testid=zoom-value]")
        page.click("[data-testid=zoom-out]")
        page.click("[data-testid=zoom-out]")
        wait(page, 150)
        z2 = text(page, "[data-testid=zoom-value]")
        check("缩放真实生效", z1 == "110%" and z2 == "90%", f"{z1} -> {z2}")
        page.click("[data-testid=zoom-in]")
        wait(page, 150)
        # 回到第 3 页并确认标题仍为编辑后的值
        page.click("[data-testid=slide-thumb-2]")
        wait(page, 300)
        check("返回第 3 页标题保持", "终审版" in value(page, "[data-testid=slide-title-input]"), value(page, "[data-testid=slide-title-input]"))

        # ── 5. 导出 PPTX / PDF（真实下载，内容来自当前编辑） ────────────
        save_download(page, "[data-testid=export-pptx]", ART / "ellipse-课件.pptx", "椭圆 PPTX")
        wait(page, 350)
        shot(page, "07-ppt-export-pptx.png")
        save_download(page, "[data-testid=export-pdf]", ART / "ellipse-课件.pdf", "椭圆 PDF")
        wait(page, 500)
        shot(page, "08-ppt-export-pdf.png")

        # ── 6. 发布 v1：准备态 → 发布中 → 成功态 ───────────────────────
        check("发布前学生端无该课件记录", len(state(page)["teacher"]["publish"]["records"]) == 0, "records 为空")
        page.click("[data-testid=publish-open]")
        page.wait_for_selector("[data-testid=publish-ready]")
        wait(page, 350)
        ready_text = text(page, "[data-testid=publish-dialog]")
        check("发布准备态含班级选择", "高二 (1) 班" in ready_text and "高一 (3) 班" in ready_text, ready_text[:80].replace("\n", " "))
        check("发布版本预览 v1", "v1" in text(page, "[data-testid=publish-next-version]"))
        shot(page, "09-publish-ready.png")
        page.locator("[data-testid=publish-dialog] .publish-class", has_text="高二 (1) 班").first.click()
        page.click("[data-testid=publish-confirm]")
        page.wait_for_selector("[data-testid=publish-success]", timeout=20000)
        success_text = text(page, "[data-testid=publish-success-text]")
        check("发布成功态 published 语义", "已发布到" in success_text and "版本" in success_text, success_text.replace("\n", " "))
        shot(page, "10-publish-success-v1.png")

        wait(page, 500)
        st = state(page)
        records = st.get("teacher", {}).get("publish", {}).get("records", [])
        check("publish.records 新增一条", len(records) == 1, f"{len(records)} 条")
        if records:
            rec = records[0]
            expect_keys = ["id", "deckId", "deckTitle", "className", "version", "publishedAt", "editor", "slides", "meta"]
            check("发布记录字段齐全", all(k in rec for k in expect_keys), ",".join(rec.keys()))
            check("发布记录 id 形状 pub-<ts>", str(rec.get("id", "")).startswith("pub-"), str(rec.get("id")))
            check("发布记录 deckId", rec.get("deckId") == "deck-ellipse", str(rec.get("deckId")))
            check("发布记录班级", rec.get("className") == "高二 (1) 班", str(rec.get("className")))
            check("发布记录版本 v1", rec.get("version") == 1, str(rec.get("version")))
            check("发布记录 slides 深拷贝含编辑标题", rec["slides"][2].get("title") == "椭圆的定义（终审版）", rec["slides"][2].get("title"))
            check("发布记录 editor 张老师", rec.get("editor") == "张老师", str(rec.get("editor")))
            check("发布记录 meta.sessionId", rec.get("meta", {}).get("sessionId") == "prep-ellipse", str(rec.get("meta", {}).get("sessionId")))
            ext_sess = st.get("ext", {}).get("teacherPrep", {}).get("sessions", {}).get("prep-ellipse", {})
            check("发布后 ext.publishedVersion=1", ext_sess.get("publishedVersion") == 1, str(ext_sess.get("publishedVersion")))

        # ── 7. 再次编辑后发布 v2：新版本追加，旧快照不被污染 ────────────
        page.click("[data-testid=publish-done]")
        wait(page, 400)
        page.fill("[data-testid=slide-title-input]", "椭圆的定义（v2 发布版）")
        wait(page, 450)
        page.click("[data-testid=publish-open]")
        page.wait_for_selector("[data-testid=publish-ready]")
        wait(page, 350)
        v2 = text(page, "[data-testid=publish-next-version]")
        check("第二次发布预览 v2", v2 == "v2", v2)
        page.click("[data-testid=publish-confirm]")
        page.wait_for_selector("[data-testid=publish-success]", timeout=20000)
        success2 = text(page, "[data-testid=publish-success-text]")
        check("第二次发布成功 v2", "版本 v2" in success2, success2.replace("\n", " "))
        shot(page, "11-publish-success-v2.png")
        wait(page, 500)
        st = state(page)
        records = st["teacher"]["publish"]["records"]
        check("发布记录追加为 2 条", len(records) == 2, f"{len(records)} 条")
        check("旧快照标题保持 v1 内容", records[0]["slides"][2]["title"] == "椭圆的定义（终审版）", records[0]["slides"][2]["title"])
        check("新快照含 v2 内容", records[1]["slides"][2]["title"] == "椭圆的定义（v2 发布版）", records[1]["slides"][2]["title"])
        check("版本号递增", records[1]["version"] == 2, str(records[1]["version"]))
        page.click("[data-testid=publish-done]")
        wait(page, 300)

        # 恢复一个与导出文件一致的标题（导出发生在发布前，文件为“终审版”）
        shot(page, "12-workbench-after-publish.png")

        # ── 8. 教案 Tab：编辑标题并导出 DOCX / Markdown ────────────────
        page.click("[data-testid=tab-plan]")
        wait(page, 800)
        check("教案 Tab 结构", page.query_selector("[data-testid=plan-pane]") is not None)
        outline_count = page.locator(".plan-outline__item").count()
        check("教案大纲章节数 ≥ 6", outline_count >= 6, str(outline_count))
        shot(page, "13-plan-tab.png")
        page.fill("[data-testid=plan-title-input]", "《椭圆及其标准方程》第一课时 · 教案（终审版）")
        wait(page, 500)
        save_download(page, "[data-testid=plan-export-docx]", ART / "ellipse-教案.docx", "椭圆教案 DOCX")
        wait(page, 350)
        shot(page, "14-plan-export-docx.png")
        save_download(page, "[data-testid=plan-export-md]", ART / "ellipse-教案.md", "椭圆教案 Markdown")
        wait(page, 350)
        shot(page, "15-plan-export-md.png")

        # ── 9. 二次函数课时：参数联动 + 改标题 + 导出 ──────────────────
        goto(page, "/teacher/prep/w/prep-quadratic/ppt", 1200)
        counter_q = text(page, "[data-testid=slide-counter]")
        check("二次函数课时 PPT 打开", "3 / 5" in counter_q, counter_q)
        page.fill("[data-testid=param-a]", "3")
        page.fill("[data-testid=param-h]", "1")
        page.fill("[data-testid=param-k]", "-4")
        wait(page, 450)
        vertex = text(page, "[data-testid=param-vertex]")
        check("二次函数顶点式联动", "y = 3" in vertex and "- 1" in vertex.replace("−", "-") and "- 4" in vertex.replace("−", "-"), vertex)
        page.fill("[data-testid=slide-title-input]", "配方法的三步（修改版）")
        wait(page, 450)
        shot(page, "16-quadratic-ppt.png")
        save_download(page, "[data-testid=export-pptx]", ART / "quadratic-课件.pptx", "二次函数 PPTX")
        wait(page, 350)

        # ── 10. 集合课时：子集数联动 + 改标题 + 导出 ────────────────────
        goto(page, "/teacher/prep/w/prep-set/ppt", 1200)
        page.fill("[data-testid=param-n]", "4")
        wait(page, 450)
        subsets = text(page, "[data-testid=param-subsets]")
        proper = text(page, "[data-testid=param-proper]")
        check("集合子集数联动 2^4=16", subsets == "16", subsets)
        check("集合真子集数 15", proper == "15", proper)
        page.fill("[data-testid=slide-title-input]", "子集个数与空集（修改版）")
        wait(page, 450)
        shot(page, "17-set-ppt.png")
        save_download(page, "[data-testid=export-pptx]", ART / "set-课件.pptx", "集合 PPTX")
        wait(page, 350)

        # ── 11. 历史页：3+ 条记录、状态、更新时间、版本管理 ─────────────
        goto(page, "/teacher/prep/history", 800)
        rows = page.locator(".history-row").count()
        check("历史列表 ≥ 3 条", rows >= 3, str(rows))
        history_text = text(page, "[data-testid=prep-history]")
        check("历史页含更新时间", "最近更新" in history_text, "")
        check("版本管理含 v2 / v1", ("v2" in history_text) and ("v1" in history_text), "")
        shot(page, "18-prep-history.png")

        # ── 12. 新建备课：创建独立会话并进入工作台 ─────────────────────
        goto(page, "/teacher/prep", 800)
        page.click("[data-testid=prep-new-btn]")
        page.wait_for_selector("[data-testid=prep-new-dialog]")
        shot(page, "19-new-prep-dialog.png")
        page.click("[data-testid='new-deck-deck-quadratic']")
        page.click("[data-testid='new-class-高一 (3) 班']")
        page.click("[data-testid=new-confirm]")
        page.wait_for_function("location.hash.includes('/teacher/prep/w/prep-') && !location.hash.includes('prep-quadratic')", timeout=15000)
        wait(page, 900)
        new_url = page.url
        check("新建备课进入独立会话", "/teacher/prep/w/prep-" in new_url and "prep-quadratic" not in new_url, new_url.split("#")[-1])
        new_workbench = page.query_selector("[data-testid=prep-workbench]") is not None
        check("新建会话工作台可用", new_workbench)
        badge = text(page, ".pw-title__badge")
        check("新建会话标记", "新一轮备课" in badge, badge)
        shot(page, "20-new-prep-workbench.png")

        # ── 13. tab 别名兼容：design → classroom ────────────────────────
        goto(page, "/teacher/prep/w/prep-ellipse/design", 700)
        active_tab = page.get_attribute(".pw-tab.is-active", "data-testid")
        check("design 别名映射到 classroom", active_tab == "tab-classroom", str(active_tab))

        # ── 14. 预览演示 / 同步到教案（真实状态变化） ───────────────────
        goto(page, "/teacher/prep/w/prep-ellipse/ppt", 1000)
        page.click("[data-testid=preview-open]")
        page.wait_for_selector("[data-testid=preview-dialog]")
        shot(page, "21-preview-demo.png")
        page.click("[data-testid=preview-next]")
        wait(page, 250)
        page.click("[data-testid=preview-close]")
        check("预览演示关闭", page.query_selector("[data-testid=preview-dialog]") is None)

        sync_before = state(page)["ext"]["teacherPrep"]["sessions"]["prep-ellipse"]["plan"]["sections"]
        page.click("[data-testid=sync-to-plan]")
        wait(page, 500)
        toast = text(page, "[data-testid=workbench-toast]")
        check("同步到教案反馈", "已同步到教案" in toast, toast[:80])
        sync_after = state(page)["ext"]["teacherPrep"]["sessions"]["prep-ellipse"]["plan"]["sections"]
        check("同步真实写入教案覆盖", json.dumps(sync_before, ensure_ascii=False) != json.dumps(sync_after, ensure_ascii=False))
        shot(page, "22-sync-to-plan.png")

        # ── 15. 汇总证据 ────────────────────────────────────────────────
        st = state(page)
        ext = st.get("ext", {}).get("teacherPrep", {})
        records = st.get("teacher", {}).get("publish", {}).get("records", [])
        sessions_summary = {}
        for sid, sess in (ext.get("sessions") or {}).items():
            sessions_summary[sid] = {
                "deckId": sess.get("deckId"),
                "savedAt": sess.get("savedAt"),
                "publishedVersion": sess.get("publishedVersion"),
                "slideCount": len(sess.get("slides") or []),
                "slideTitles": [s.get("title") for s in (sess.get("slides") or [])],
                "planTitle": (sess.get("plan") or {}).get("title"),
                "params": sess.get("params"),
            }
        evidence = {
            "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            "publishRecords": records,
            "sessions": sessions_summary,
            "networkAttempts": page.evaluate("window.__MATHSIS_NET_LOG__ ? window.__MATHSIS_NET_LOG__.length : -1"),
            "networkLog": page.evaluate("window.__MATHSIS_NET_LOG__ ? window.__MATHSIS_NET_LOG__.slice(0, 8) : []"),
        }
        (ROOT / "records.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")

        manifest = {
            "生成时间": evidence["generatedAt"],
            "课件": [
                {
                    "file": "ellipse-课件.pptx",
                    "kind": "pptx",
                    "slides": 6,
                    "contains": ["椭圆的定义（终审版）", "椭圆及其标准方程", "椭圆的定义"],
                },
                {
                    "file": "quadratic-课件.pptx",
                    "kind": "pptx",
                    "slides": 5,
                    "contains": ["配方法的三步（修改版）", "二次函数与配方法"],
                },
                {
                    "file": "set-课件.pptx",
                    "kind": "pptx",
                    "slides": 5,
                    "contains": ["子集个数与空集（修改版）", "集合间的基本关系"],
                },
                {
                    "file": "ellipse-课件.pdf",
                    "kind": "pdf",
                    "minPages": 2,
                    "contains": ["椭圆的定义（终审版）", "椭圆及其标准方程"],
                },
                {
                    "file": "ellipse-教案.docx",
                    "kind": "docx",
                    "contains": ["《椭圆及其标准方程》第一课时 · 教案（终审版）", "教学目标", "教学过程", "板书设计"],
                },
                {
                    "file": "ellipse-教案.md",
                    "kind": "markdown",
                    "contains": ["# 《椭圆及其标准方程》第一课时 · 教案（终审版）", "## 一、教学目标"],
                },
            ],
            "发布记录版本": [{"deckId": r["deckId"], "version": r["version"], "className": r["className"]} for r in records],
        }
        (ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

        check("浏览器控制台无错误", not CONSOLE_ERRORS, "; ".join(CONSOLE_ERRORS[:3])[:300])
        browser.close()

    failed = [s for s in STEPS if not s[1]]
    print("\n===== E2E SUMMARY =====", flush=True)
    print(f"PASS {len(STEPS) - len(failed)} / {len(STEPS)}", flush=True)
    for name, ok, detail in failed:
        print(f"FAILED: {name} :: {detail}", flush=True)
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
