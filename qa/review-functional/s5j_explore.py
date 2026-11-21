# -*- coding: utf-8 -*-
import sys, os, json
sys.path.insert(0, r"D:\zxsy-math-arena-showcase\qa\review-functional")
from h import *

s = Session("explore-write2")
try:
    s.page.goto("file:///" + ENTRY.replace("\\", "/") + "#/research/write")
    s.page.wait_for_timeout(2200)
    ta = s.page.locator("textarea.ed__input")
    print("TEXTAREA count:", ta.count(), "len:", len(ta.input_value()))
    # append broken command before \end{document}
    val = ta.input_value()
    broken = val.replace("\\end{document}", "\\undefinedcommandhere\n\\end{document}")
    ta.fill(broken)
    s.page.wait_for_timeout(600)
    s.take("write-edited-broken")
    print("AFTER FILL BODY TAIL:", s.body()[-500:])
    # click 重新编译
    s.page.get_by_role("button", name="⟳ 重新编译").click()
    s.page.wait_for_timeout(2500)
    s.take("write-compile-error")
    print("\nAFTER COMPILE BODY TAIL:\n", s.body()[-2600:])
    print("\nLOG ENTRIES:", json.dumps(s.page.evaluate("""() => Array.from(document.querySelectorAll('.logline')).map(e=>(e.className||'')+':'+(e.innerText||'').trim().replace(/\\s+/g,' ').slice(0,120))"""), ensure_ascii=False)[:3000])
finally:
    s.finish()
