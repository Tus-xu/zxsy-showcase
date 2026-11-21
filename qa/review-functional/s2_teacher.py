# -*- coding: utf-8 -*-
"""S2 教师端：备课中心 → 椭圆 PPT 工作台 → 改参数 a=6,b=4 → 改标题保存 → 导出 PPTX/PDF
→ 发布到班级（准备态/成功态）→ 教案 Tab 导出 DOCX/Markdown"""
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

EXPORTS = os.path.join(BASE, "exports")
s = Session("s2-teacher-prep")
manifests = {}
try:
    # ---------- 切换到教师端 ----------
    s.goto("#/login")
    s.host_open()
    s.check_in("主持人工具", "主持人工具打开")
    s.check_in("网络尝试次数（应为 0）：0", "主持人工具网络尝试次数 0")
    s.switch_role("教师端")
    s.check(s.hash().startswith("/teacher"), "切换到教师端", s.hash())
    s.check_in("教师工作台", "教师端壳层")
    s.check_in("备课中心", "教师端导航")
    s.check_in("椭圆及其标准方程", "备课中心课时卡")
    s.step("教师备课中心")

    # ---------- 进入椭圆工作台 ----------
    s.page.locator("button.lesson-card").first.click()
    s.page.wait_for_timeout(2000)
    s.check_in("课堂设计", "工作台三 Tab")
    s.check_in("教学路径", "课堂设计蓝图")
    s.check_in("发布课堂", "工作台发布入口")
    s.step("椭圆工作台-课堂设计")

    # ---------- PPT Tab ----------
    s.page.locator("nav.pw-tabs button", has_text="PPT").click()
    s.page.wait_for_timeout(1600)
    s.check_in("幻灯片", "PPT Tab 打开")
    s.check_in("导出 PPTX", "PPT 导出入口")
    s.check_in("导出 PDF", "PPT 导出 PDF 入口")
    n_pages = s.page.locator(".slide-row").count()
    s.check(n_pages == 6, "PPT 共 6 页", f"count={n_pages}")
    # 切到第 3 页（椭圆的定义）
    s.page.locator(".slide-row").nth(2).click()
    s.page.wait_for_timeout(1000)
    pager = s.page.locator(".pw-pager__btn").first.inner_text() if False else s.body()
    s.check_in("幻灯片 3 / 6", "PPT 定位第 3 页")
    # 属性面板初值
    prop = s.page.locator("aside.property-panel input")
    a0, b0 = prop.nth(0).input_value(), prop.nth(1).input_value()
    s.check((a0, b0) == ("5", "3"), "属性面板初值 a=5,b=3", f"{a0},{b0}")
    canvas0 = s.page.locator(".slide-canvas").inner_text()
    s.check_in_placeholder = None
    s.check("F₁(−4,0)" in canvas0, "初始图形焦点 F₁(−4,0)")
    s.check("x²/25" in canvas0, "初始公式 x²/25")
    # svg 几何基线
    svg0 = s.page.evaluate("""() => {
        const svg = document.querySelector('.slide-canvas svg');
        if(!svg) return null;
        const shapes = Array.from(svg.querySelectorAll('ellipse,circle')).map(e=>({tag:e.tagName,rx:e.getAttribute('rx'),ry:e.getAttribute('ry'),r:e.getAttribute('r'),cx:e.getAttribute('cx'),cy:e.getAttribute('cy'),cls:(e.getAttribute('class')||'')}));
        return {viewBox: svg.getAttribute('viewBox'), shapes: shapes.slice(0,10)};
    }""")
    s.check(svg0 is not None and len(svg0.get("shapes", [])) > 0, "图形为 SVG 且含椭圆/焦点", json.dumps(svg0, ensure_ascii=False)[:300])
    s.step("PPT-初始参数 a5b3")

    # ---------- 改参数 a=6,b=4 ----------
    prop.nth(0).fill("6"); prop.nth(0).press("Enter"); s.page.wait_for_timeout(900)
    prop.nth(1).fill("4"); prop.nth(1).press("Enter"); s.page.wait_for_timeout(1400)
    canvas1 = s.page.locator(".slide-canvas").inner_text()
    panel1 = s.page.locator("aside.property-panel").inner_text()
    # 三处：公式 / 标注 / 图形
    s.check("x²/36 + y²/16 = 1" in canvas1, "改参后公式 x²/36+y²/16")
    s.check("c = √(a² − b²) = √(6² − 4²) = 4.472" in canvas1, "改参后公式 c=4.472")
    s.check("e = c/a = 4.472/6 ≈ 0.745" in canvas1, "改参后公式 e=0.745")
    s.check("长轴长 12" in canvas1 and "短轴长 8" in canvas1, "改参后标注轴长 12/8")
    s.check("e = 0.745" in canvas1, "改参后标注 e=0.745")
    s.check("F₁(−4.472,0)" in canvas1 and "F₂(4.472,0)" in canvas1, "改参后图形焦点标签 −4.472/4.472")
    s.check("4.5" in panel1, "属性面板 c=4.5（√20 取一位小数）")
    s.check("0.745" in panel1, "属性面板 e=0.745")
    svg1 = s.page.evaluate("""() => {
        const svg = document.querySelector('.slide-canvas svg');
        if(!svg) return null;
        const shapes = Array.from(svg.querySelectorAll('ellipse,circle')).map(e=>({tag:e.tagName,rx:e.getAttribute('rx'),ry:e.getAttribute('ry'),r:e.getAttribute('r'),cx:e.getAttribute('cx'),cy:e.getAttribute('cy'),cls:(e.getAttribute('class')||'')}));
        return {viewBox: svg.getAttribute('viewBox'), shapes: shapes.slice(0,10)};
    }""")
    s.check(svg1 != svg0, "改参后图形 SVG 几何变化", f"before={json.dumps(svg0,ensure_ascii=False)[:160]} after={json.dumps(svg1,ensure_ascii=False)[:160]}")
    manifests["svg_before"] = svg0
    manifests["svg_after"] = svg1
    s.check_in("已保存", "改参后自动保存状态（已保存 HH:MM）")
    s.step("PPT-改参 a6b4")

    # ---------- 改标题 + 保存 ----------
    t = s.page.locator("input.sc-title-input")
    s.check(t.count() == 1, "当前页标题可编辑")
    t.fill("椭圆的定义（演示修订版）")
    t.press("Enter")
    s.page.wait_for_timeout(1200)
    s.check_in("椭圆的定义（演示修订版）", "改标题后侧栏同步")
    s.check_in("已保存", "改标题后保存状态")
    s.step("PPT-改标题保存")
    s.reload(2200)
    s.page.locator("nav.pw-tabs button", has_text="PPT").click()
    s.page.wait_for_timeout(1500)
    s.check(s.page.locator("input.sc-title-input").input_value() == "椭圆的定义（演示修订版）",
            "刷新后标题仍为修订版", s.page.locator("input.sc-title-input").input_value())
    prop2 = s.page.locator("aside.property-panel input")
    a1, b1 = prop2.nth(0).input_value(), prop2.nth(1).input_value()
    s.check((a1, b1) == ("6", "4"), "刷新后参数仍为 a=6,b=4", f"{a1},{b1}")
    s.step("PPT-刷新后保留编辑")

    # ---------- 导出 PPTX / PDF ----------
    results = {}
    for label, ext in [("导出 PPTX", "pptx"), ("导出 PDF", "pdf")]:
        with s.page.expect_download() as dl:
            s.page.get_by_role("button", name=label).click()
        d = dl.value
        fname = "review-椭圆课件-v2." + ext if False else d.suggested_filename
        p = os.path.join(EXPORTS, "s2-" + fname)
        d.save_as(p)
        size = os.path.getsize(p)
        results[label] = {"path": p, "size": size, "name": fname}
        s.check(size > 10000, f"{label} 生成真实文件", f"{fname} {size}B")
        s.page.wait_for_timeout(1200)
        s.check_in("导出成功", f"{label} 界面成功提示")
    manifests["exports"] = results
    s.step("PPT-导出成功")

    # ---------- 发布到班级：准备态 ----------
    s.page.get_by_role("button", name="发布课堂").click()
    s.page.wait_for_timeout(900)
    s.check_in("选择发布班级", "发布弹窗准备态-选班")
    s.check_in("开始发布", "发布弹窗准备态-开始发布按钮")
    s.check_in("高二 (1) 班", "发布弹窗班级选项")
    s.check_in("共 6 页", "发布弹窗页数")
    s.check_in("本次发布版本：v1", "发布弹窗版本 v1")
    s.step("发布-准备态")
    # 成功态
    s.page.get_by_role("button", name="开始发布").click()
    s.page.wait_for_timeout(2600)
    s.check_in("发布成功", "发布成功态")
    s.check_in("已发布到 高二 (1) 班", "发布成功-班级")
    s.check_in("页数", "发布成功-页数条目")
    s.check_in("6 页", "发布成功-6 页")
    s.check_in("发布人", "发布成功-发布人条目")
    s.check_in("张老师", "发布成功-发布人")
    s.check_in("版本 v1", "发布成功-版本 v1")
    s.check_in("完成", "发布成功-完成按钮")
    s.step("发布-成功态")
    s.page.get_by_role("button", name="完成", exact=True).click()
    s.page.wait_for_timeout(1000)
    s.check_in("已发布 v1", "发布后头部状态")
    s.step("发布后工作台")

    # ---------- 教案 Tab 导出 DOCX / Markdown ----------
    s.page.locator("nav.pw-tabs button", has_text="教案").click()
    s.page.wait_for_timeout(1800)
    s.check_in("教学目标", "教案 Tab 打开-教学目标")
    s.check_in("教学过程", "教案含教学过程")
    s.check_in("七、教学反思", "教案七章节")
    lesson = {}
    for label, ext in [("导出 DOCX", "docx"), ("导出 Markdown", "md")]:
        with s.page.expect_download() as dl:
            s.page.get_by_role("button", name=label).click()
        d = dl.value
        p = os.path.join(EXPORTS, "s2-" + d.suggested_filename)
        d.save_as(p)
        size = os.path.getsize(p)
        lesson[label] = {"path": p, "size": size, "name": d.suggested_filename}
        s.check(size > 1000, f"{label} 生成真实文件", f"{d.suggested_filename} {size}B")
        s.page.wait_for_timeout(1200)
        s.check_in("导出成功", f"{label} 界面成功提示")
    manifests["lesson_exports"] = lesson
    s.step("教案-导出成功")

    with open(os.path.join(RESULT, "s2-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifests, f, ensure_ascii=False, indent=1)
finally:
    s.finish()
