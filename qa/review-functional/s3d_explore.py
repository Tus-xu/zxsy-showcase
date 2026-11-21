# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-dual3")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/dual/pub-1795205534037")
    s.page.wait_for_timeout(1800)
    print("DATA-TEST:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('[data-test]')).map(e=>e.getAttribute('data-test')+':'+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,30))"""), ensure_ascii=False))
    s.page.locator("[data-test=dual-next]").click(); s.page.wait_for_timeout(800)
    s.page.locator("[data-test=dual-next]").click(); s.page.wait_for_timeout(800)
    s.take("dual-p5")
    print("PROGRESS:", s.page.locator(".du-progress__text").inner_text())
    # find play/pause button
    print("PLAY BTNS:", [b for b in s.page.evaluate("""() => Array.from(document.querySelectorAll('button')).map(e=>e.innerText.trim())""") if '讲解' in b])
    s.page.locator("[data-test=dual-play]").click(); s.page.wait_for_timeout(1800)
    s.take("dual-playing")
    print("PROGRESS2:", s.page.locator(".du-progress__text").inner_text())
    print("PLAY BTNS2:", [b for b in s.page.evaluate("""() => Array.from(document.querySelectorAll('button')).map(e=>e.innerText.trim())""") if '讲解' in b])
    s.page.reload(); s.page.wait_for_timeout(2600)
    s.take("dual-refresh")
    print("AFTER REFRESH:", s.page.locator(".du-progress__text").inner_text())
    print("HAS 进度已记录:", "进度已记录" in s.body())
    print("CURRENT RAIL ACTIVE:", s.page.locator(".du-rail__item.active").inner_text())
finally:
    s.finish()
