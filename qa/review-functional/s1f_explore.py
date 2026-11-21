# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-B")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/student/dialog")
    s.page.wait_for_timeout(1200)
    with s.page.expect_file_chooser() as fc:
        s.page.get_by_role("button", name="选择题目图片").first.click()
    fc.value.set_files(FRESH + r"\素材\题2.png")
    s.page.wait_for_timeout(3000)
    s.take("B-upload")
    print("URL:", s.page.url)
    print("TAIL:\n", s.body()[-2600:])
    print("VISIBLE:", s.page.evaluate("""() => Array.from(document.querySelectorAll('input,textarea,button')).filter(e=>e.offsetParent!==null).map(e=>({tag:e.tagName,cls:e.className,ph:e.placeholder||'',txt:(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,60)}))"""))
    s.dump_ui("B", RESULT + r"\_ui-B.json")
finally:
    s.finish()
