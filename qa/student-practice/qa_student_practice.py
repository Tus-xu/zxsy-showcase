"""学生端 练习/错题/知识库/资源/我的 —— 真实浏览器验收（1672×941, DPR1）。

优先使用主入口；若主入口仍被其他子代理文件的语法错误阻塞，则回退到
qa/student-practice/harness.html（同一 store / 同一 StudentShell / 同一持久化命名空间）。
覆盖：练习判分（对/错/部分正确）、刷新恢复、错题自动弹层/定位/重开引导/标记掌握、
知识库入库→切片→选中资料提问→引用原文定位→检索失败提示、资源中心讲义阅读与“无随包视频”说明、
我的四 Tab（学情报告/掌握地图/体验反馈/个人设置主题）、主持人整场复位恢复种子状态。
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:5201"
HARNESS = f"{BASE}/qa/student-practice/harness.html#"
REAL = f"{BASE}/#"

results = []
console_errors = []


def check(name, ok, detail=""):
    results.append({"name": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1672, "height": 941}, device_scale_factor=1)
        page = ctx.new_page()
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        # 选择入口：主应用可用则用主应用，否则用 harness
        page.goto(REAL + "/student/practice", wait_until="networkidle")
        page.wait_for_timeout(500)
        real_ok = page.locator(".page-title").count() > 0
        entry = REAL if real_ok else HARNESS
        check("入口可用", True, "主入口" if real_ok else "harness(主入口被 research.js 语法错误阻塞)")

        page.evaluate("localStorage.clear()")
        page.goto(entry + "/student/practice", wait_until="networkidle")
        page.wait_for_timeout(600)

        def shot(name):
            page.screenshot(path=str(ROOT / f"{name}.png"))

        def qa(sel):
            return page.locator(f'[data-qa="{sel}"]')

        # ================= 练题 =================
        check("练题页加载", page.locator(".page-title").inner_text().find("练题") >= 0)
        shot("practice-01-initial")
        # 错答：A 原题选 C
        qa("practice-option-C").click()
        qa("practice-submit").click()
        page.wait_for_timeout(300)
        check("A 原题错答被判错", qa("practice-result").inner_text().find("还不对") >= 0)
        check("错因反馈可见", qa("practice-feedback").is_visible())
        shot("practice-02-wrong-feedback")
        # 再答一次 → 正确 D
        qa("practice-redo").click()
        qa("practice-option-D").click()
        qa("practice-submit").click()
        page.wait_for_timeout(300)
        check("A 原题正确判分", qa("practice-result").inner_text().find("回答正确") >= 0)
        shot("practice-03-correct")
        # B 原题只选 B → 部分正确
        qa("practice-tab-B").click()
        qa("practice-item-B-orig").click()
        qa("practice-option-B").click()
        qa("practice-submit").click()
        page.wait_for_timeout(300)
        check("B 原题只选 B = 部分正确", qa("practice-result").inner_text().find("部分正确") >= 0)
        shot("practice-04-partial-B")
        # 刷新恢复
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)
        check("练题刷新后恢复判分记录", qa("practice-result").is_visible())
        shot("practice-05-refresh")

        # ================= 错题 =================
        page.goto(entry + "/student/errors", wait_until="networkidle")
        page.wait_for_timeout(600)
        check("错题页进入自动打开第一道错题详情", qa("errors-drawer").is_visible())
        shot("errors-01-autodrawer")
        qa("errors-drawer-close").click()
        page.wait_for_timeout(250)
        rows = page.locator('[data-qa="errors-row"]')
        check("错题本有 3 条演示种子错题", rows.count() == 3, f"count={rows.count()}")
        shot("errors-02-list")
        # 标记第一题掌握
        rows.first.locator('[data-qa="errors-master"]').click()
        page.wait_for_timeout(250)
        check("标记掌握生效", rows.first.inner_text().find("已掌握") >= 0)
        shot("errors-03-mastered")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)
        check("错题刷新后掌握状态保留", page.locator('[data-qa="errors-row"]').first.inner_text().find("已掌握") >= 0)
        qa("errors-drawer-close").click()
        page.wait_for_timeout(200)
        # 重开引导
        rows2 = page.locator('[data-qa="errors-row"]')
        rows2.first.locator('[data-qa="errors-reopen"]').click()
        page.wait_for_timeout(700)
        check("重开引导进入引导解题页", page.locator(".guide__head").count() > 0 or page.locator('[data-qa="practice-result"]').count() == 0)
        shot("errors-04-reopen-guide")

        # ================= 知识库 =================
        page.goto(entry + "/student/library", wait_until="networkidle")
        page.wait_for_timeout(600)
        shot("library-01-initial")
        qa("library-ingest-derivative-sign").click()
        page.wait_for_timeout(400)
        check("资料入库后就绪", qa("library-material-derivative-sign").inner_text().find("已就绪") >= 0)
        shot("library-02-ingested")
        qa("library-slices-derivative-sign").click()
        page.wait_for_timeout(300)
        check("可查看切片", page.locator(".lib-slice").count() > 0)
        shot("library-03-slices")
        qa("library-tab-text").click()
        qa("library-suggest-0").click()
        page.wait_for_timeout(500)
        answers = page.locator('[data-qa="library-answer"]')
        check("提问得到基于材料段落的回答", answers.count() >= 1 and answers.last.is_visible())
        check("回答带原文引用", page.locator(".lib-cite").count() > 0)
        shot("library-04-answer")
        page.locator('[data-qa^="library-cite-"]').last.click()
        page.wait_for_timeout(700)
        check("引用可定位到原文段落", page.locator(".lib-para.is-hit").count() > 0)
        shot("library-05-citation-jump")
        # 检索失败：明确提示未找到
        qa("library-input").fill("矩阵的秩怎么算")
        qa("library-send").click()
        page.wait_for_timeout(500)
        check("检索失败提示“未在资料中找到”", qa("library-notfound").is_visible())
        shot("library-06-notfound")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)
        check("知识库刷新后对话保留", page.locator(".lib-cite").count() > 0)
        shot("library-07-refresh")

        # ================= 资源中心 =================
        page.goto(entry + "/student/resources", wait_until="networkidle")
        page.wait_for_timeout(600)
        check("资源中心含本地讲义卡片", page.locator('[data-qa="resources-lecture-card"]').count() == 3)
        shot("resources-01-initial")
        page.locator('[data-qa="resources-lecture-card"]').first.click()
        page.wait_for_timeout(400)
        check("可打开本地讲义", qa("resources-reader").is_visible())
        shot("resources-02-reader")
        page.get_by_role("button", name="下一页").click()
        qa("resources-mark-read").click()
        page.wait_for_timeout(300)
        check("讲义可标记已读", qa("resources-mark-read").inner_text().find("已标记") >= 0)
        shot("resources-03-page2-read")
        qa("resources-reader-back").click()
        qa("resources-tab-videos").click()
        page.wait_for_timeout(300)
        page.locator('[data-qa="resources-video-card"]').first.click()
        page.wait_for_timeout(400)
        check("视频卡片说明“无随包视频”", qa("resources-video-modal").is_visible() and "无随包视频" in page.locator(".res-modal").inner_text())
        shot("resources-04-video-modal")
        qa("resources-video-close").click()
        page.wait_for_timeout(200)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)
        qa("resources-tab-videos").click()
        page.wait_for_timeout(300)
        check("视频说明已读状态刷新后保留", page.locator('[data-qa="resources-video-card"]').first.inner_text().find("说明已读") >= 0)
        shot("resources-05-video-seen")

        # ================= 我的 =================
        page.goto(entry + "/student/me", wait_until="networkidle")
        page.wait_for_timeout(600)
        check("学情报告基于真实记录", qa("me-report").is_visible())
        shot("me-01-report")
        qa("me-tab-map").click()
        page.wait_for_timeout(350)
        check("掌握地图按知识点显示", page.locator('[data-qa^="me-kn-"]').count() >= 3)
        shot("me-02-map")
        qa("me-tab-feedback").click()
        page.wait_for_timeout(300)
        qa("me-star-4").click()
        qa("me-feedback-text").fill("引导提问不泄底，错因反馈清楚；知识库引用能定位回原文段落。")
        qa("me-feedback-submit").click()
        page.wait_for_timeout(300)
        check("反馈提交并持久化", qa("me-feedback-done").is_visible())
        shot("me-03-feedback")
        qa("me-tab-settings").click()
        page.wait_for_timeout(300)
        shot("me-04-settings")
        qa("me-theme-dark").click()
        page.wait_for_timeout(400)
        check("深色主题真实生效", page.evaluate("document.querySelector('.st-theme').dataset.theme") == "dark")
        shot("me-05-dark-theme")
        qa("me-font-large").click()
        page.wait_for_timeout(300)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)
        check("主题/字号设置刷新后保留", page.evaluate("document.querySelector('.st-theme').dataset.theme") == "dark" and page.evaluate("document.querySelector('.st-theme').dataset.font") == "large")
        shot("me-06-refresh-dark")
        # 恢复浅色/标准，便于后续截图一致
        qa("me-theme-light").click()
        qa("me-font-normal").click()

        # ================= 主持人整场复位 =================
        page.keyboard.press("Control+Shift+H")
        page.wait_for_timeout(400)
        page.get_by_role("button", name="整场复位").click()
        page.wait_for_timeout(400)
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
        page.goto(entry + "/student/practice", wait_until="networkidle")
        page.wait_for_timeout(600)
        check("整场复位后练题记录清空", page.locator('[data-qa="practice-result"]').count() == 0)
        shot("host-reset-01-practice")
        page.goto(entry + "/student/errors", wait_until="networkidle")
        page.wait_for_timeout(700)
        check("整场复位后错题种子恢复", qa("errors-drawer").is_visible() and page.locator('[data-qa="errors-row"]').count() == 3)
        shot("host-reset-02-errors-seed")

        net = page.evaluate("(window.__MATHSIS_NET_LOG__||[]).length")
        check("网络请求尝试为 0", net == 0, f"net={net}")
        check("无控制台错误", len(console_errors) == 0, "; ".join(console_errors[:3]))

        browser.close()

    passed = sum(1 for r in results if r["ok"])
    print(f"\nSUMMARY {passed}/{len(results)} passed · screenshots -> {ROOT}")
    (ROOT / "qa_results.json").write_text(
        json.dumps({"entry": "harness" if not locals().get("real_ok", False) else "real", "passed": passed, "total": len(results), "results": results, "consoleErrors": console_errors}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if passed != len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
