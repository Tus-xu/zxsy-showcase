# -*- coding: utf-8 -*-
"""对 04:33 后最终发行包的最小回归：判分/公式显示/来源标注/批改写入"""
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
import h
NEW = r"C:\Users\徐超\AppData\Local\Temp\ms-final-new"
h.ENTRY = NEW + r"\开始演示.html"
h.PROFILE = r"D:\zxsy-math-arena-showcase\qa\review-functional\_profile-new"
h.fresh_profile()
s = h.Session("revalidate-new")
out = {}
try:
    # ---- 学生引导判分（A 单选 / B 多选组合 / C 填空） ----
    s.goto("#/login"); s.click_text("学生 · 林一川"); s.page.wait_for_timeout(1400)
    # A
    s.goto("#/student/dialog")
    s.upload("题1.png")
    s.check(s.hash().endswith("/guide/A"), "新包 A 上传进入引导")
    s.send("我选 C，因为比值就是 √7", 2200)
    s.check_in("先别急着定选项", "新包 A 错答判分反馈")
    s.send("2b=√7·2a，所以 b/a=√7", 2200)
    s.send("c²=a²+b²", 2200)
    s.send("8", 2200)
    s.send("2√2", 2200)
    s.check(s.page.locator("button.guide__choice").count() == 4, "新包 A 进入单选")
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("D"):
            ch.nth(i).click(); break
    s.page.locator("button:has-text('提交')").last.click(); s.page.wait_for_timeout(2600)
    s.check_in("✅ 已完成本题", "新包 A 单选判分正确到结论")
    s.take("new-A-conclusion")
    # B
    s.goto("#/student/dialog"); s.upload("题2.png")
    s.send("正三角形；D 是 BC 中点，所以 AD⊥BC", 2200)
    s.send("AA₁⊥底面 ABC，所以 AA₁⊥BC，又 AD⊥BC，AD∩AA₁=A，所以 BC⊥平面 AA₁D", 2200)
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("B"):
            ch.nth(i).click(); break
    s.page.locator("button:has-text('提交')").last.click(); s.page.wait_for_timeout(2200)
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("B"):
            ch.nth(i).click(); break
    s.page.locator("button:has-text('提交（多选）')").click(); s.page.wait_for_timeout(2200)
    s.check_in("B 已经保留", "新包 B 多选部分正确判分")
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("D"):
            ch.nth(i).click(); break
    s.page.locator("button:has-text('提交')").last.click(); s.page.wait_for_timeout(2600)
    s.check_in("✅ 已完成本题", "新包 B 多选组合判分正确到结论")
    s.take("new-B-conclusion")
    # C
    s.goto("#/student/dialog"); s.upload("题3.png")
    s.send("3", 2200)
    s.check_in("X=2，不是 3", "新包 C 错答判分")
    s.send("一次没取到 4/5，三次都没取到 (4/5)^3=64/125", 2300)
    s.send("61/125", 2300)
    s.send("61/25", 2600)
    s.check_in("✅ 已完成本题", "新包 C 填空判分正确到结论")
    s.check_in("2.44", "新包 C 结论 2.44")
    s.take("new-C-conclusion")

    # ---- 教师公式显示（a=6,b=4） ----
    s.goto("#/login"); s.switch_role("教师端")
    s.goto("#/teacher/prep/w/prep-ellipse/ppt"); s.page.wait_for_timeout(1600)
    s.page.locator(".slide-row").nth(2).click(); s.page.wait_for_timeout(900)
    prop = s.page.locator("aside.property-panel input")
    prop.nth(0).fill("6"); prop.nth(0).press("Enter"); s.page.wait_for_timeout(700)
    prop.nth(1).fill("4"); prop.nth(1).press("Enter"); s.page.wait_for_timeout(1200)
    c = s.page.locator(".slide-canvas").inner_text()
    s.check("x²/36 + y²/16 = 1" in c, "新包公式显示 x²/36+y²/16")
    s.check("√(6² − 4²) = 4.472" in c, "新包公式显示 c=4.472")
    s.check("e = 0.745" in c, "新包标注 e=0.745")
    s.check("F₁(−4.472,0)" in c, "新包图形标签同步")
    s.take("new-param")

    # ---- 科研公式检查来源标注 ----
    s.goto("#/research/read?project=p-fem"); s.page.wait_for_timeout(1800)
    s.page.locator(".acc__head").nth(3).click(); s.page.wait_for_timeout(800)
    tabs = s.page.locator(".fc__tab")
    cases = []
    for i in range(min(3, tabs.count())):
        tabs.nth(i).click(); s.page.wait_for_timeout(500)
        t = s.page.locator(".agent").inner_text()
        cases.append({"tab": i, "has_evidence": "证据来源" in t, "has_pdf": "PDF" in t,
                      "counterexample": ("x=−2" in t) or ("x=1" in t) or ("数值抽样" in t),
                      "snippet": t[t.find("公式检查"): t.find("公式检查")+60]})
        s.take(f"new-formula-case{i+1}")
    s.check(all(x["has_evidence"] and x["has_pdf"] for x in cases), "新包公式检查三案例来源标注", json.dumps(cases, ensure_ascii=False))
    out["formula_cases"] = cases

    # ---- 批改工作台写入 ----
    s.goto("#/teacher/grading"); s.page.wait_for_timeout(1600)
    s.check_in("批改工作台", "新包批改工作台可达")
    q = s.page.locator("button.queue__item")
    s.check(q.count() == 3, "新包批改队列 3 份", f"{q.count()}")
    q.nth(0).click(); s.page.wait_for_timeout(800)
    s.page.locator("input.field__score").fill("4.5")
    s.page.locator("textarea.field__comment").fill("验收复核：推导完整，给 4.5 分。")
    s.page.get_by_role("button", name="✓ 确认批改（写入终分）").click(); s.page.wait_for_timeout(2000)
    s.check_in("已确认", "新包批改确认写入")
    s.check_in("终评 4.5 / 5", "新包批改终评分数")
    s.reload(2200)
    s.check_in("终评 4.5 / 5", "新包批改刷新保留")
    s.take("new-grading")
finally:
    res = s.finish()
    with open(os.path.join(h.RESULT, "revalidate-new-checks.json"), "w", encoding="utf-8") as f:
        json.dump({"summary": res, "extra": out}, f, ensure_ascii=False, indent=1)
