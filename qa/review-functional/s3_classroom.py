# -*- coding: utf-8 -*-
"""S3 学生端：课堂 → 双师课堂 → 打开教师刚发布的同一页（核对标题/页数/公式）→ 翻页与讲解 → 刷新进度保留"""
import sys, os, json, re
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("s3-student-classroom")
try:
    s.goto("#/login")
    s.switch_role("学生端")
    s.page.wait_for_timeout(1200)
    s.page.locator("div.nav-item", has_text="课堂").first.click()
    s.page.wait_for_timeout(1600)
    # 显式切到课堂任务 Tab（上次停留的双师课堂 Tab 也会保留）
    if s.page.get_by_role("button", name="📋 课堂任务 2").count():
        s.page.get_by_role("button", name="📋 课堂任务 2").first.click()
        s.page.wait_for_timeout(800)
    s.check_in("课堂任务", "学生课堂页")
    s.check_in("老师课件", "课堂含老师课件")
    s.check_in("椭圆及其标准方程", "课堂含椭圆课件")
    s.check_in("v1", "课件版本 v1")
    s.check_in("张老师", "发布人张老师")
    s.check_in("6 页", "课件 6 页")
    s.step("学生课堂-课件列表")

    # 打开双师课堂
    s.page.locator("button.deck-task").first.click()
    s.page.wait_for_timeout(2500)
    s.check("/student/dual/" in s.hash(), "打开双师课堂", s.hash())
    s.check_in("椭圆及其标准方程", "双师页课件标题")
    s.check_in("张老师 · 发布 v1", "双师页发布信息")
    prog = s.page.locator(".du-progress__text").inner_text()
    m = re.search(r"第 (\d+) / 6 页", prog)
    start_page = int(m.group(1)) if m else -1
    s.check(start_page >= 1, "双师页显示第 N/6 页（可续播）", prog)
    s.check_in("已看", "双师页已看进度")
    rail = s.page.locator(".du-rail__item").all_inner_texts()
    s.check(len(rail) == 6, "双师页目录 6 页", f"{len(rail)}")
    s.check(any("演示修订版" in r for r in rail), "目录第 3 页含修订标题", str([r[:30] for r in rail]))
    s.step("双师-打开（续播）")

    # 点目录第 3 页，核对标题/页数/公式
    s.page.locator(".du-rail__item").nth(2).click()
    s.page.wait_for_timeout(1300)
    s.check_in("第 3 / 6 页", "目录跳转第 3 页")
    b3 = s.body()
    s.check_in("椭圆的定义（演示修订版）", "学生打开的第 3 页标题为修订版")
    s.check_in("|PF₁| + |PF₂| = 2a", "第 3 页板书公式")
    s.check_in("两定点叫焦点", "第 3 页要点 1")
    s.check_in("不可省略", "第 3 页要点 2（2a>2c 必要性）")
    s.check_in("张老师 · v1", "第 3 页版本标记")
    s.step("双师-第3页修订标题与公式")

    # 讲解 暂停/继续
    s.check_in("暂停讲解", "第 3 页讲解可暂停")
    s.page.locator("[data-test=dual-play]").click(); s.page.wait_for_timeout(1500)
    s.check_in("继续讲解", "暂停后按钮变为继续讲解")
    s.step("双师-暂停讲解")
    s.page.locator("[data-test=dual-play]").click(); s.page.wait_for_timeout(1500)
    s.check_in("暂停讲解", "继续讲解后再次可暂停")
    s.step("双师-继续讲解")

    # 翻页＋字幕
    s.page.locator("[data-test=dual-next]").click(); s.page.wait_for_timeout(1300)
    s.check_in("第 4 / 6 页", "继续翻到第 4 页")
    s.check_in("字幕", "字幕区域存在")
    s.check_in("几何性质与参数联动", "第 4 页为几何性质与参数联动" if False else "第 4 页内容更新")
    s.step("双师-第4页")

    # 刷新进度保留
    before = s.page.locator(".du-progress__text").inner_text()
    s.reload(2600)
    after = s.page.locator(".du-progress__text").inner_text()
    s.check(before == after, "刷新后回到同一页", f"{before} -> {after}")
    s.check_in("进度已记录", "刷新后进度已记录")
    s.check_in("第 4 / 6 页", "刷新后第 4/6 页")
    s.step("双师-刷新进度保留")

    # 返回课堂：进度回显
    s.page.locator("[data-test=dual-back]").click()
    s.page.wait_for_timeout(1600)
    s.check_in("老师课堂", "返回课堂页")
    s.check_in("椭圆及其标准方程", "课堂仍含椭圆课件")
    s.check(("我的进度" in s.body()) and ("第 4/6 页" in s.body()), "课堂回显我的进度 第4/6页", "")
    s.step("学生课堂-进度已回传")

    # 课堂任务 Tab：作业卡（批改前）
    if s.page.get_by_role("button", name="📋 课堂任务 2").count():
        s.page.get_by_role("button", name="📋 课堂任务 2").first.click()
        s.page.wait_for_timeout(900)
    s.check_in("作业", "课堂含作业任务")
    s.check_in("双曲线离心率", "作业题为双曲线离心率")
    s.check_in("待批改", "批改前作业状态待批改")
    s.step("学生课堂-作业卡")
finally:
    s.finish()
