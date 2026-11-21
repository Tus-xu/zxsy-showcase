# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-read5")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/read?project=p-fem")
    s.page.wait_for_timeout(2000)
    s.page.get_by_text("定理 2.1（Céa 引理）", exact=False).first.click()
    s.page.wait_for_timeout(500)
    s.page.locator(".selbar__btn--primary").click()
    s.page.wait_for_timeout(2400)
    s.page.get_by_role("button", name="加入笔记").click()
    s.page.wait_for_timeout(800)
    s.take("note-dialog")
    print("DIALOG:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('[class*=modal],[class*=dialog],[class*=drawer]')).filter(e=>e.offsetParent!==null).map(e=>({cls:(e.className||'').toString().slice(0,60),txt:(e.innerText||'').slice(0,500),inputs:Array.from(e.querySelectorAll('input,textarea')).map(x=>({tag:x.tagName,cls:x.className,ph:x.placeholder||'',v:x.value||''}))}))"""), ensure_ascii=False)[:3000])
    # fill dialog
    dlg = s.page.locator("[class*=modal], [class*=dialog]").last
    ins = dlg.locator("input,textarea")
    print("DLG INPUTS:", ins.count())
    for i in range(ins.count()):
        print(i, ins.nth(i).get_attribute("placeholder"), ins.nth(i).input_value()[:50])
    if ins.count() >= 2:
        ins.nth(0).fill("Céa 引理条件核验笔记")
        ins.nth(1).fill("定理 2.1 结论成立需 V_h⊂V、a 连续且 V-椭圆（α>0）。证据：讲义第 4 页定理 2.1、第 2 页定义 1.1。")
    s.page.get_by_role("button", name="保存笔记").click()
    s.page.wait_for_timeout(1500)
    s.take("note-saved")
    print("\nAFTER SAVE TAIL:\n", s.body()[-1200:])
    s.page.reload(); s.page.wait_for_timeout(2500)
    notes = s.page.locator(".noteitem").all_inner_texts()
    print("\nNOTES AFTER REFRESH:", notes)
    s.take("note-after-refresh")
finally:
    s.finish()
