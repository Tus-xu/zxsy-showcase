# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-Bwrong")
try:
    # reset case B via host
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/login")
    s.page.wait_for_timeout(1200)
    s.page.keyboard.press("Control+Shift+H")
    s.page.wait_for_timeout(700)
    # find case2 row reset button: rows with text 题2 and a 复位 button
    row = s.page.locator("text=题2 · 正三棱柱中的线面关系").first
    print("row count:", row.count())
    btns = s.page.get_by_role("button", name="复位")
    print("reset btns:", btns.count())
    # order: case1 reset, case2 reset, case3 reset, then 复位学生端, 复位教师端, 复位科研端, 整场复位
    btns.nth(1).click()
    s.page.wait_for_timeout(800)
    s.page.keyboard.press("Escape")
    s.page.wait_for_timeout(500)
    print("AFTER RESET:", s.body()[-400:])
    # upload B
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/dialog")
    s.page.wait_for_timeout(1200)
    with s.page.expect_file_chooser() as fc:
        s.page.get_by_role("button", name="选择题目图片").first.click()
    fc.value.set_files(FRESH + r"\素材\题2.png")
    s.page.wait_for_timeout(2800)
    inp = s.page.locator("input.guide__input")
    def send(txt, wait=2200):
        inp.fill(txt); s.page.locator("button:has-text('发送')").last.click(); s.page.wait_for_timeout(wait)
        print(f"\nSENT {txt!r} ->", s.body()[-600:])
    send("矩形；AD 与 BC 平行")
    s.take("B-wrongtext")
    send("正三角形；D 是 BC 中点，所以 AD⊥BC")
    send("AA₁⊥底面 ABC，所以 AA₁⊥BC，又 AD⊥BC，AD∩AA₁=A，所以 BC⊥平面 AA₁D")
    # single choice: pick A (wrong)
    ch = s.page.locator("button.guide__choice")
    print("CHOICES:", [ch.nth(i).inner_text()[:8] for i in range(ch.count())])
    for i in range(ch.count()):
        if ch.nth(i).inner_text().strip().startswith("A"):
            ch.nth(i).click(); break
    s.page.locator("button:has-text('提交')").last.click()
    s.page.wait_for_timeout(2200)
    s.take("B-wrongchoice")
    print("\nAFTER WRONG CHOICE A:\n", s.body()[-1200:])
finally:
    s.finish()
