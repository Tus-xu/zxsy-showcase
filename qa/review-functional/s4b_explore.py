# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-grading2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/teacher/grading")
    s.page.wait_for_timeout(1600)
    s.page.locator("button.queue__item").nth(1).click()
    s.page.wait_for_timeout(900)
    s.take("grading-subB")
    print("SUB B PANEL:\n", s.page.locator(".review, .grad__main, main").last.inner_text()[:1500])
    score = s.page.locator("input.field__score")
    comment = s.page.locator("textarea.field__comment")
    print("SCORE:", score.input_value(), "COMMENT:", comment.input_value())
    score.fill("2.5"); s.page.wait_for_timeout(200)
    comment.fill("思路正确，但漏了单位与条件；按评分细则给 2.5 分。"); s.page.wait_for_timeout(200)
    s.page.get_by_role("button", name="✓ 确认批改（写入终分）").click()
    s.page.wait_for_timeout(2000)
    s.take("grading-confirmed")
    print("\nAFTER CONFIRM BODY TAIL:\n", s.body()[-1400:])
    s.page.reload(); s.page.wait_for_timeout(2000)
    s.take("grading-after-refresh")
    print("\nAFTER REFRESH:\n", s.body()[-900:])
    print("已确认 count:", s.page.locator("text=已确认").count())
finally:
    s.finish()
