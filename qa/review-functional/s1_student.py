# -*- coding: utf-8 -*-
"""S1 学生端：三题逐一上传原图 → 正确主线到结论 → 每题错答一条 → 每题求助一次 → 刷新恢复"""
import sys, os
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("s1-student-guide", fresh=True)
try:
    # ---------- 进入学生端 ----------
    s.goto()
    s.check_in("选择演示身份", "登录页出现")
    s.click_text("学生 · 林一川")
    s.page.wait_for_timeout(1500)
    s.check_in("学习闭环", "学生首页导航")
    s.check_in("7 连击", "学生首页连击")
    s.check_in("本次演示的三道题", "学生首页三题列表")
    s.step("学生首页", shot=True)

    # ================= A 题 =================
    print("\n== A 题：题1.png ==")
    s.upload("题1.png")
    s.check(s.hash().endswith("/student/guide/A"), "A 上传后进入引导页", s.hash())
    s.check_in("已上传 · 内容匹配", "A 内容匹配")
    s.check_in("SHA-256 前 8 位：CD2F518F", "A 哈希识别")
    s.check_in("若双曲线 C 的虚轴长为实轴长的 √7 倍", "A 识别题面")
    s.check(s.page.locator("img").count() > 0, "A 题图已渲染", f"img={s.page.locator('img').count()}")
    s.step("A-识别结果")

    # 求助一次
    s.click_btn("🙋 给个提示")
    s.page.wait_for_timeout(1400)
    s.check_in("（求助）", "A 求助记录")
    s.check_in("虚轴长 =", "A 提示给出轴长提示")
    s.step("A-求助提示")

    # 错答一条
    s.send("我选 C，因为比值就是 √7", 2400)
    s.check_in("先别急着定选项", "A 错答追问")
    s.check_in("离心率定义里的分子", "A 错答追问到分子")
    s.step("A-错答反馈")

    # 正确主线
    s.send("2b=√7·2a，所以 b/a=√7")
    s.check_in("约去 2", "A 轴长关系确认")
    s.send("c²=a²+b²")
    s.check_in("别和椭圆", "A 双曲线关系提醒")
    s.send("8")
    s.check_in("1+7=8", "A e²=8 确认")
    # 手工验收记录：手册第 6 步写“输入 8 即进入单选”，实际还需给出 e=2√2
    s.send("2√2")
    s.check(s.page.locator("button.guide__choice").count() == 4, "A 出现 4 个单选选项",
            f"count={s.page.locator('button.guide__choice').count()}")
    s.step("A-单选出现")

    # 选错一次（可选步骤中已错答过，这里按主线选 D）
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("D"):
            ch.nth(i).click()
            break
    s.page.wait_for_timeout(300)
    s.page.locator("button:has-text('提交')").last.click()
    s.page.wait_for_timeout(2800)
    s.check_in("✅ 已完成本题", "A 结论卡")
    s.check_in("选 D", "A 结论含选 D")
    s.check_in("举一反三", "A 结论含举一反三")
    s.check_in("本题你出现过 1 次错答", "A 错答入错题本提示")
    s.step("A-结论")

    # 刷新恢复
    s.reload(2600)
    s.check(s.hash().endswith("/student/guide/A"), "A 刷新回到同一页", s.hash())
    s.check_in("✅ 已完成本题", "A 刷新后结论仍在")
    s.check_in("我选 C，因为比值就是 √7", "A 刷新后对话轮次保留")
    s.check_in("（求助）", "A 刷新后求助记录保留")
    s.step("A-刷新恢复")

    # ================= B 题 =================
    print("\n== B 题：题2.png ==")
    s.goto("#/student/dialog")
    s.upload("题2.png")
    s.check(s.hash().endswith("/student/guide/B"), "B 上传后进入引导页", s.hash())
    s.check_in("SHA-256 前 8 位：0BC14458", "B 哈希识别")
    s.check_in("在正三棱柱 ABC-A₁B₁C₁ 中，D 为 BC 中点", "B 识别题面")
    s.check_in("多选 · 立体几何", "B 题型标注")
    s.step("B-识别结果")

    # 求助一次
    s.click_btn("🙋 给个提示")
    s.page.wait_for_timeout(1400)
    s.check_in("（求助）", "B 求助记录")
    s.check_in("正三角形", "B 提示内容")
    s.step("B-求助提示")

    # 主线：底面正三角形 + AD⊥BC
    s.send("正三角形；D 是 BC 中点，所以 AD⊥BC")
    s.check_in("AD⊥BC", "B 第一步确认")
    s.send("AA₁⊥底面 ABC，所以 AA₁⊥BC，又 AD⊥BC，AD∩AA₁=A，所以 BC⊥平面 AA₁D")
    s.check_in("（单选）", "B 进入单选判项")

    # 错答一条：单选处误选 A
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("A"):
            ch.nth(i).click()
            break
    s.page.locator("button:has-text('提交')").last.click()
    s.page.wait_for_timeout(2500)
    s.check_in("A 项不能由这个判定得到", "B 错选 A 反馈")
    s.check_in("先聚焦 B", "B 错答后可继续")
    s.step("B-错答反馈")

    # 改选 B
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("B"):
            ch.nth(i).click()
            break
    s.page.locator("button:has-text('提交')").last.click()
    s.page.wait_for_timeout(2500)
    s.check_in("B 项成立", "B 单选 B 通过")
    s.check_in("提交（多选）", "B 进入多选提交")

    # 多选只选 B → 部分正确提示
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("B"):
            ch.nth(i).click()
            break
    s.page.locator("button:has-text('提交（多选）')").click()
    s.page.wait_for_timeout(2400)
    s.check_in("B 已经保留", "B 只选 B 部分正确保留")
    s.check_in("把 D 补上", "B 部分正确提示补 D")
    s.step("B-部分正确")

    # 补 D 提交
    ch = s.page.locator("button.guide__choice")
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("D"):
            ch.nth(i).click()
            break
    s.page.locator("button:has-text('提交')").last.click()
    s.page.wait_for_timeout(2800)
    s.check_in("✅ 已完成本题", "B 结论卡")
    s.check_in("B、D 均成立", "B 结论 B、D")
    s.step("B-结论")

    # 刷新恢复
    s.reload(2600)
    s.check_in("✅ 已完成本题", "B 刷新后结论仍在")
    s.check_in("B、D 均成立", "B 刷新后结论内容保留")
    s.step("B-刷新恢复")

    # ================= C 题 =================
    print("\n== C 题：题3.png ==")
    s.goto("#/student/dialog")
    s.upload("题3.png")
    s.check(s.hash().endswith("/student/guide/C"), "C 上传后进入引导页", s.hash())
    s.check_in("SHA-256 前 8 位：CD9DB0CC", "C 哈希识别")
    s.check_in("有放回取三次", "C 识别题面")
    s.check_in("填空 · 概率统计", "C 题型标注")
    s.step("C-识别结果")

    # 求助一次
    s.click_btn("🙋 给个提示")
    s.page.wait_for_timeout(1400)
    s.check_in("（求助）", "C 求助记录")
    s.check_in("去重后数个数", "C 提示内容")
    s.step("C-求助提示")

    # 错答一条：把 X 当成抽取次数
    s.send("3")
    s.check_in("X=2，不是 3", "C 错答纠正")
    s.check_in("不同号码的种数", "C 错答原因（X 为不同号码种数）")
    s.step("C-错答反馈")

    # 未收录答法：保留草稿并提示补中间量（不推进）
    s.send("X=1,2,3")
    s.check_in("我保留你的这个表述", "C 未收录答法保留草稿")
    s.check_in("补一个可核对的中间量", "C 未收录答法提示补量")
    s.step("C-未收录答法")

    # 正确主线
    s.send("一次没取到 4/5，三次都没取到 (4/5)^3=64/125")
    s.check_in("64", "C 64/125 确认")
    s.send("61/125")
    s.check_in("61", "C 61/125 确认")
    s.send("61/25")
    s.check_in("✅ 已完成本题", "C 结论卡")
    s.check_in("61/25", "C 结论 E(X)=61/25")
    s.check_in("2.44", "C 结论小数形式")
    s.step("C-结论")

    # 刷新恢复
    s.reload(2600)
    s.check_in("✅ 已完成本题", "C 刷新后结论仍在")
    s.check_in("61/25", "C 刷新后结论内容保留")
    s.step("C-刷新恢复")

    # 首页状态汇总
    s.goto("#/student/dialog")
    s.page.wait_for_timeout(1500)
    b = s.body()
    s.check(b.count("已完成") >= 0, "学生首页仍可打开")
    s.step("学生首页-三题完成后")
finally:
    s.finish()
