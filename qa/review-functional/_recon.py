# -*- coding: utf-8 -*-
"""Recon: open released single-file app offline, dump visible UI.""" 
import json, sys, time, os
sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

FRESH = r"C:\Users\徐超\AppData\Local\Temp\ms-final-20261121-040157"
ENTRY = FRESH + r"\开始演示.html"
OUT = r"D:\zxsy-math-arena-showcase\qa\review-functional"
SHOTS = OUT + r"\shots"
os.makedirs(SHOTS, exist_ok=True)
report = {}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width":1672,"height":941}, device_scale_factor=1)
    def route_handler(route):
        req = route.request
        if req.url.startswith(("http://", "https://", "ws://", "wss://")):
            report.setdefault("net", []).append({"url": req.url, "type": req.resource_type})
            route.abort()
        else:
            route.continue_()
    ctx.route("**/*", route_handler)
    page = ctx.new_page()
    report["console"]=[]; report["pageerrors"]=[]
    page.on("console", lambda m: report["console"].append({"type": m.type, "text": m.text}))
    page.on("pageerror", lambda e: report["pageerrors"].append(str(e)))
    page.goto("file:///" + ENTRY.replace("\\", "/"))
    page.wait_for_timeout(2500)
    page.screenshot(path=SHOTS + r"\recon-01-landing.png")
    report["title"]=page.title(); report["url"]=page.url
    report["bodytext"]=page.inner_text("body")
    items = page.evaluate("""() => {
      const out=[];
      document.querySelectorAll('button,a,[role=button],[class*=card],[class*=btn],[class*=item],[class*=tab]').forEach(el=>{
        if(el.offsetParent===null && el.offsetWidth===0) return;
        const t=(el.innerText||'').trim().replace(/\\s+/g,' ').slice(0,100);
        if(!t) return;
        const r=el.getBoundingClientRect();
        out.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,80), text:t, x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height)});
      });
      return out.slice(0,300);
    }""")
    report["clickable"]=items
    report["inputs"]=page.evaluate("""() => Array.from(document.querySelectorAll('input,textarea,select')).map(el=>({tag:el.tagName,type:el.type||'',ph:el.placeholder||'',cls:(el.className||'').toString().slice(0,60)}))""")
    with open(OUT + r"\_recon.json","w",encoding="utf-8") as f:
        json.dump(report,f,ensure_ascii=False,indent=1)
    print("saved recon", len(report["bodytext"]), "chars;", len(items), "clickables;")
    print("net:", len(report.get("net",[])), "console:", len(report["console"]), "pageerrors:", len(report["pageerrors"]))
    browser.close()
