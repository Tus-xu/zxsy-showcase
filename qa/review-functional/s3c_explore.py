# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-dual2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/dual/pub-1795205534037")
    s.page.wait_for_timeout(1800)
    # click page 3 rail
    s.page.locator("button.du-rail__item").nth(2).click()
    s.page.wait_for_timeout(1200)
    s.take("dual-page3")
    b = s.body()
    print("URL:", s.page.url)
    print("PAGE3 BODY TAIL:\n", b[-3000:])
    for k in ["演示修订版", "x²/36", "x²/16", "4.472", "0.745"]:
        print(f"page3 contains {k!r}:", k in b)
    # click next, next
    s.page.get_by_role("button", name="下一页").click()
    s.page.wait_for_timeout(900)
    s.page.get_by_role("button", name="下一页").click()
    s.page.wait_for_timeout(900)
    s.take("dual-page5")
    print("\nAFTER NEXT x2 progress:", s.page.locator(".du-progress__text").inner_text())
    # play/pause
    s.page.get_by_role("button", name="▶ 继续讲解").click()
    s.page.wait_for_timeout(1500)
    print("AFTER PLAY btn:", [s.page.get_by_role("button", name=n).count() for n in ["暂停讲解", "继续讲解", "⏸ 暂停讲解"]])
    s.take("dual-playing")
    print("BODY TAIL:", s.body()[-1200:])
    # refresh
    s.page.reload(); s.page.wait_for_timeout(2500)
    s.take("dual-refresh")
    print("\nAFTER REFRESH:", s.page.locator(".du-progress__text").inner_text())
    print("BODY TAIL:", s.body()[-900:])
finally:
    s.finish()
