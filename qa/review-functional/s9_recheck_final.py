# -*- coding: utf-8 -*-
"""最终包（04:53/A188CA…）收口复验：M1 是否消除 + 关键回归（只读，不改产品代码）"""
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
import h
RECHECK = r"C:\Users\徐超\AppData\Local\Temp\ms-final-recheck"
h.ENTRY = RECHECK + r"\开始演示.html"
h.PROFILE = r"D:\zxsy-math-arena-showcase\qa\review-functional\_profile-recheck"
h.fresh_profile()
EXP = os.path.join(h.BASE, "exports-recheck")
os.makedirs(EXP, exist_ok=True)

s = h.Session("s-recheck-final")
manifest = {}
try:
    # ---------- 0. 嘉宾界面不再出现主持人浮标；登录页入口与快捷键仍可用 ----------
    s.goto("")
    s.check(s.page.locator(".ms-host-fab").count() == 0, "登录页无主持人浮标(.ms-host-fab)")
    s.check(s.page.get_by_text("主持人工具").count() >= 1, "登录页保留「主持人工具」入口")
    s.step("复验-登录页")
    s.page.keyboard.press("Control+Shift+H"); s.page.wait_for_timeout(900)
    s.check_in("主持人工具", "快捷键 Ctrl+Shift+H 打开主持人工具")
    s.check_in("网络尝试次数（应为 0）：0", "主持人工具网络尝试次数 0")
    host_txt = s.body()
    s.check(("素材\\题1.png" in host_txt) or ("素材/题1.png" in host_txt),
            "主持人工具原图路径改为发行包 素材\\", host_txt[-700:])
    s.check("zxsy-math-arena\\docs" not in host_txt and "zxsy-math-arena\\\\docs" not in host_txt,
            "主持人工具不再暴露旧工程绝对路径")
    s.step("复验-主持人工具路径")
    s.switch_role("教师端")
    s.check(s.page.locator(".ms-host-fab").count() == 0, "教师端无主持人浮标")
    s.check_in("教师工作台", "教师端可进入")

    # ---------- 1. 作业与批改默认页 + 批改工作台 ----------
    s.page.get_by_role("button", name="作业与批改", exact=True).click(); s.page.wait_for_timeout(1500)
    body_g = s.body()
    if "批改工作台" in body_g:
        s.check(True, "「作业与批改」直达批改工作台")
        s.step("复验-批改工作台直达")
    else:
        s.check(("作业发布" in body_g), "「作业与批改」默认页（作业发布，含批改工作台入口）")
        s.check(s.page.get_by_text("批改工作台").count() >= 1, "作业发布页含「批改工作台」入口")
        s.step("复验-作业与批改默认页")
        s.page.get_by_text("批改工作台").first.click(); s.page.wait_for_timeout(1400)
        s.check_in("批改工作台", "可由作业发布进入批改工作台")
    s.check(s.page.locator("button.queue__item").count() == 3, "批改队列 3 份",
            f"count={s.page.locator('button.queue__item').count()}")

    # ---------- 2. PPT 改参（a=6,b=4）→ 标题 → 导出 → 发布 ----------
    s.goto("#/teacher/prep/w/prep-ellipse/ppt"); s.page.wait_for_timeout(1800)
    s.page.locator(".slide-row").nth(2).click(); s.page.wait_for_timeout(900)
    s.check_in("幻灯片 3 / 6", "PPT 第 3 页")
    prop = s.page.locator("aside.property-panel input")
    prop.nth(0).fill("6"); prop.nth(0).press("Enter"); s.page.wait_for_timeout(700)
    prop.nth(1).fill("4"); prop.nth(1).press("Enter"); s.page.wait_for_timeout(1300)
    c = s.page.locator(".slide-canvas").inner_text()
    s.check("x²/36 + y²/16 = 1" in c, "画布公式派生 x²/36+y²/16")
    s.check("4.472" in c, "画布派生 c=4.472")
    s.check("0.745" in c, "画布派生 e=0.745")
    s.check("F₁(−4.472,0)" in c, "画布图形焦点派生")
    # 保存按钮是否存在（手册“点保存”口径）
    has_save = s.page.get_by_role("button", name="保存", exact=True).count()
    s.step("复验-PPT改参")
    t = s.page.locator("input.sc-title-input")
    t.fill("椭圆的定义（演示修订版）"); t.press("Enter"); s.page.wait_for_timeout(1200)
    s.check_in("已保存", "改标题后顶部「已保存 HH:MM」")
    s.check(has_save == 0, "PPT 工具栏无独立「保存」按钮（自动保存）", f"save_btn={has_save}")

    # 导出
    for label, ext in [("导出 PPTX", "pptx"), ("导出 PDF", "pdf")]:
        with s.page.expect_download() as dl:
            s.page.get_by_role("button", name=label).click()
        d = dl.value
        p = os.path.join(EXP, "recheck-" + d.suggested_filename)
        d.save_as(p)
        manifest[label] = p
        s.check(os.path.getsize(p) > 10000, f"{label} 真实文件", f"{os.path.getsize(p)}B")
        s.page.wait_for_timeout(1000)
    s.step("复验-导出完成")

    # 发布
    s.page.get_by_role("button", name="发布课堂").click(); s.page.wait_for_timeout(900)
    s.check_in("本次发布版本：v1", "发布准备态版本 v1")
    s.page.get_by_role("button", name="开始发布").click(); s.page.wait_for_timeout(2500)
    s.check_in("发布成功", "发布成功态")
    s.check_in("版本 v1", "首次发布版本 v1")
    s.step("复验-发布成功")
    s.page.get_by_role("button", name="完成", exact=True).click(); s.page.wait_for_timeout(900)

    # ---------- 3. 学生双师打开同一课件：派生内容可见 ----------
    s.switch_role("学生端")
    s.check(s.page.locator(".ms-host-fab").count() == 0, "学生端无主持人浮标")
    s.page.locator("div.nav-item", has_text="课堂").first.click(); s.page.wait_for_timeout(1600)
    if s.page.get_by_role("button", name="📋 课堂任务 2").count():
        s.page.get_by_role("button", name="📋 课堂任务 2").first.click(); s.page.wait_for_timeout(800)
    s.check_in("椭圆及其标准方程", "学生课堂出现已发布课件")
    s.page.locator("button.deck-task").first.click(); s.page.wait_for_timeout(2500)
    s.check_in("第 1 / 6 页" if "第 1 / 6 页" in s.body() else "/ 6 页", "双师页 6 页")
    s.page.locator(".du-rail__item").nth(2).click(); s.page.wait_for_timeout(1400)
    s.check_in("第 3 / 6 页", "双师页第 3/6 页")
    b3 = s.body()
    s.check_in("椭圆的定义（演示修订版）", "双师第 3 页含修订标题")
    s.check_in("当前参数", "双师第 3 页含「当前参数」派生")
    s.check("4.472" in b3, "双师第 3 页含 c=4.472")
    s.check("0.745" in b3, "双师第 3 页含 e=0.745")
    s.check(("x²/36" in b3) or ("x²/36 + y²/16" in b3), "双师第 3 页含 x²/36+y²/16")
    s.step("复验-学生双师派生内容")
    before = s.page.locator(".du-progress__text").inner_text()
    s.reload(2500)
    s.check(s.page.locator(".du-progress__text").inner_text() == before, "双师刷新进度保留", before)
    s.check_in("当前参数", "双师刷新后派生内容仍在")

    # ---------- 4. 科研端无主持人浮标 ----------
    s.switch_role("科研端")
    s.page.wait_for_timeout(1200)
    s.check(s.page.locator(".ms-host-fab").count() == 0, "科研端无主持人浮标")
    s.goto("#/research/read?project=p-fem"); s.page.wait_for_timeout(1600)
    s.check(s.page.locator(".ms-host-fab").count() == 0, "科研阅读页无主持人浮标")
    s.check_in("Research Agent", "科研阅读页可打开")
    s.step("复验-科研端无浮标")

    with open(os.path.join(h.RESULT, "s-recheck-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
finally:
    s.finish()
