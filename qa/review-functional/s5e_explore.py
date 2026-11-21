# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-read4")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/read?project=p-fem")
    s.page.wait_for_timeout(2000)
    s.page.get_by_text("定理 2.1（Céa 引理）", exact=False).first.click()
    s.page.wait_for_timeout(500)
    s.page.locator(".selbar__btn--primary").click()
    s.page.wait_for_timeout(2600)
    s.page.get_by_role("button", name="定位原文").click()
    s.page.wait_for_timeout(1500)
    s.take("read-located")
    print("URL:", s.page.url)
    print("PAGE INPUT:", s.page.locator("input.pageinput").input_value())
    print("HAS HL:", s.page.evaluate("""() => Array.from(document.querySelectorAll('[class*=hl],[class*=highlight]')).map(e=>(e.className||'')+':'+(e.innerText||'').slice(0,50))"""))
    print("BODY TAIL:\n", s.body()[-1400:])
    # add note
    s.page.get_by_role("button", name="加入笔记").click()
    s.page.wait_for_timeout(1500)
    s.take("read-note-added")
    print("\nAFTER NOTE TAIL:\n", s.body()[-1600:])
    # refresh
    s.page.reload(); s.page.wait_for_timeout(2500)
    s.take("read-after-refresh")
    print("\nAFTER REFRESH notes:", s.page.locator(".noteitem").count())
    print("BODY TAIL:\n", s.body()[-1600:])
finally:
    s.finish()
