# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-Cwrong")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/login")
    s.page.wait_for_timeout(1200)
    s.page.keyboard.press("Control+Shift+H")
    s.page.wait_for_timeout(700)
    s.page.get_by_role("button", name="复位").nth(2).click()
    s.page.wait_for_timeout(700)
    s.page.keyboard.press("Escape"); s.page.wait_for_timeout(400)
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/dialog")
    s.page.wait_for_timeout(1200)
    with s.page.expect_file_chooser() as fc:
        s.page.get_by_role("button", name="选择题目图片").first.click()
    fc.value.set_files(FRESH + r"\素材\题3.png")
    s.page.wait_for_timeout(2800)
    inp = s.page.locator("input.guide__input")
    def send(txt, wait=2200):
        inp.fill(txt); s.page.locator("button:has-text('发送')").last.click(); s.page.wait_for_timeout(wait)
        print(f"\nSENT {txt!r} PH={inp.get_attribute('placeholder') if inp.count() else '-'} ->", s.body()[-700:])
    # hint first
    s.page.get_by_role("button", name="🙋 给个提示").click()
    s.page.wait_for_timeout(1500)
    print("\nHINT:", s.body()[-900:])
    s.take("C-hint")
    send("3")
    s.take("C-wrong3")
finally:
    s.finish()
