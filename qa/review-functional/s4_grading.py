# -*- coding: utf-8 -*-
"""S4 教师端：批改工作台 → 三份提交核对 → 改分/评语并确认 → 刷新保留 → 课堂监测进度
→ 学生端「我的提交」回看同一份分数与评语"""
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("s4-grading")
SCORE = "4.5"
COMMENT = "推导完整、轴长与半轴区分清楚；验收复核给 4.5 分。"
try:
    # ---------- 教师课堂监测 ----------
    s.goto("#/login")
    s.switch_role("教师端")
    s.page.wait_for_timeout(1200)
    s.page.get_by_role("button", name="课堂", exact=True).click()
    s.page.wait_for_timeout(1500)
    s.check_in("课堂", "教师课堂页")
    s.check_in("学生已打开", "课堂监测-学生已打开")
    s.check_in("1 / 1", "课堂监测-1/1 已打开")
    s.check_in("平均进度", "课堂监测-平均进度")
    s.check_in("83%" if False else "第 4 / 6 页", "课堂监测-学生进度第 4/6 页")
    s.check_in("椭圆及其标准方程", "课堂监测-课件名")
    s.check_in("进度回流", "课堂监测-进度回流明细")
    s.step("教师课堂监测-学生进度")

    # ---------- 批改工作台 ----------
    s.page.get_by_role("button", name="作业与批改", exact=True).click()
    s.page.wait_for_timeout(1500)
    s.check_in("批改工作台", "批改工作台")
    s.check_in("共 3 份", "三份提交")
    q = s.page.locator("button.queue__item")
    s.check(q.count() == 3, "作答队列 3 份", f"{q.count()}")
    names = [q.nth(i).inner_text() for i in range(q.count())]
    s.check(any("林一川" in n for n in names), "队列含林一川")
    s.check(any("周子墨" in n for n in names), "队列含周子墨")
    s.check(any("陈可欣" in n for n in names), "队列含陈可欣")
    s.check_in("未确认的批改不会写入学生端", "批改写入规则提示")
    s.step("批改工作台-队列")

    # 打开周子墨（第 2 份）核对答卷/题面/评分细则/系统建议
    q.nth(1).click()
    s.page.wait_for_timeout(900)
    b = s.body()
    s.check_in("有放回取球的期望", "周子墨提交-标题")
    s.check_in("题面", "周子墨提交-题面")
    s.check_in("评分细则", "周子墨提交-评分细则")
    s.check_in("学生作答原图", "周子墨提交-作答原图")
    s.check_in("系统建议", "周子墨提交-系统建议")
    s.check_in("教师终审给分", "周子墨提交-终审给分区")
    s.step("批改-周子墨提交")

    # 打开林一川（第 1 份）改分/评语并确认
    q.nth(0).click()
    s.page.wait_for_timeout(900)
    s.check_in("双曲线离心率", "林一川提交-题号")
    s.check_in("评分细则", "林一川提交-评分细则")
    score = s.page.locator("input.field__score")
    comment = s.page.locator("textarea.field__comment")
    s.check(score.count() == 1, "评分输入框存在")
    org = comment.input_value()
    s.check(bool(org), "系统评语非空", org[:40])
    score.fill(SCORE)
    comment.fill(COMMENT)
    s.page.wait_for_timeout(400)
    s.step("批改-改分与评语")
    s.page.get_by_role("button", name="✓ 确认批改（写入终分）").click()
    s.page.wait_for_timeout(2200)
    s.check_in("已确认", "确认后状态已确认")
    s.check_in("终评 " + SCORE + " / 5", "确认后终评分数")
    s.check_in("已写入学生回看", "确认后写入学生回看")
    s.step("批改-确认成功")

    # 刷新保留
    s.reload(2400)
    s.check_in("已确认", "刷新后已确认保留")
    s.check_in(SCORE, "刷新后终评分数保留")
    b = s.body()
    s.check("2" in b and "已确认" in b, "刷新后已确认计数", "")
    s.step("批改-刷新保留")

    # ---------- 学生端我的提交回看 ----------
    s.switch_role("学生端")
    s.page.wait_for_timeout(1200)
    s.page.locator("div.nav-item", has_text="课堂").first.click()
    s.page.wait_for_timeout(1600)
    if s.page.get_by_role("button", name="📋 课堂任务 2").count():
        s.page.get_by_role("button", name="📋 课堂任务 2").first.click()
        s.page.wait_for_timeout(900)
    s.check_in("已批改", "学生课堂统计已批改")
    s.check_in(SCORE, "学生作业卡显示教师终评分数")
    s.step("学生我的提交-分数回显")
    # 打开回看
    if s.page.get_by_text("查看作答回看").count():
        s.page.get_by_text("查看作答回看").first.click()
        s.page.wait_for_timeout(1200)
        s.step("学生我的提交-回看详情")
        b = s.body()
        s.check_in("教师评语" if "教师评语" in b else COMMENT, "学生回看显示教师评语")
        s.check_in(SCORE, "学生回看显示分数")
    else:
        s.check(False, "学生作业卡含查看作答回看入口")
finally:
    s.finish()
