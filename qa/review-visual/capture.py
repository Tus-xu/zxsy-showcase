# -*- coding: utf-8 -*-
"""独立视觉评审：从 release/index.html 发行包逐页截图 + 关键元素度量。
固定条件：file://、1672x941、DPR1、zh-CN、鼠标归位、失焦。"""
import json
import os
import traceback

from playwright.sync_api import sync_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'
Q = {
    'A': r'D:\zxsy-math-arena\docs\superpowers\plans\题1.png',
    'B': r'D:\zxsy-math-arena\docs\superpowers\plans\题2.png',
    'C': r'D:\zxsy-math-arena\docs\superpowers\plans\题3.png',
}
os.makedirs(OUT, exist_ok=True)

METRICS = []
ISSUES = []


def shot(page, name, full=False):
    page.mouse.move(3, 3)
    page.wait_for_timeout(260)
    page.evaluate('() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur() }')
    page.wait_for_timeout(60)
    page.screenshot(path=os.path.join(OUT, name + '.png'), full_page=full)


JS_METRICS = r"""
() => {
  const box = (r) => r ? { x: Math.round(r.x*10)/10, y: Math.round(r.y*10)/10, w: Math.round(r.width*10)/10, h: Math.round(r.height*10)/10 } : null;
  const one = (s) => { const el = document.querySelector(s); if (!el) return null; const cs = getComputedStyle(el); return { rect: box(el.getBoundingClientRect()), font: cs.fontSize, weight: cs.fontWeight, family: cs.fontFamily.split(',')[0].replace(/"/g,''), lineHeight: cs.lineHeight, color: cs.color, bg: cs.backgroundColor }; };
  const out = { url: location.hash, title: document.title, viewport: { w: innerWidth, h: innerHeight },
    scroll: { bodyScrollW: document.documentElement.scrollWidth, bodyClientW: document.documentElement.clientWidth, bodyScrollH: document.documentElement.scrollHeight, bodyClientH: document.documentElement.clientHeight },
    els: {
      topbar: one('.topbar'), sidebar: one('.sidebar'), main: one('.main'),
      tv3nav: one('.tv3-nav'), tv3topbar: one('.tv3-topbar'), tv3page: one('.tv3-page'),
      rwheader: one('.rw-header'), rwbody: one('.rw-body'),
      pageTitle: one('.page-title'), h1: one('h1'),
    },
    counts: { katexError: document.querySelectorAll('.katex-error').length, katex: document.querySelectorAll('.katex').length,
              imgBroken: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length },
  };
  // 文字溢出（被裁剪）元素
  const clipped = [];
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (el.closest('svg')) return;
    const txt = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (!txt) return;
    const ox = cs.overflowX, oy = cs.overflowY;
    const hidden = (v) => v === 'hidden' || v === 'clip';
    if ((hidden(ox) || hidden(oy)) && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) {
      clipped.push({ tag: el.tagName, cls: String(el.className||'').slice(0,60), text: txt.slice(0,70), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight });
    }
  });
  // 超出视口且在可见裁剪路径外的元素
  const outside = [];
  const clippedByAncestor = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.overflow === 'hidden')) {
        const pr = p.getBoundingClientRect();
        if (pr.right <= innerWidth + 2) return true;
      }
      p = p.parentElement;
    }
    return false;
  };
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return;
    if (el.closest('svg') || el.closest('[aria-hidden="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (r.right > innerWidth + 1 && !clippedByAncestor(el)) {
      outside.push({ tag: el.tagName, cls: String(el.className||'').slice(0,60), text: (el.innerText||'').replace(/\s+/g,' ').slice(0,60), right: Math.round(r.right), w: Math.round(r.width) });
    }
  });
  out.clipped = clipped.slice(0, 12);
  out.clippedCount = clipped.length;
  out.outside = outside.slice(0, 12);
  out.outsideCount = outside.length;
  return out;
}
"""


def capture_metrics(page, name):
    try:
        m = page.evaluate(JS_METRICS)
    except Exception as e:  # noqa: BLE001
        m = {'error': str(e)}
    m['shot'] = name
    METRICS.append(m)
    return m


def nav(page, hash_route, wait=1000):
    page.evaluate("h => { location.hash = h }", '#' + hash_route)
    page.wait_for_timeout(wait)


def goto_login(page):
    nav(page, '/login', 700)


def enter_role(page, idx, wait=1000):
    page.locator('.ms-role').nth(idx).click()
    page.wait_for_timeout(wait)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1, locale='zh-CN',
                                  timezone_id='Asia/Shanghai')
        page = ctx.new_page()
        page.on('console', lambda m: ISSUES.append({'kind': 'console', 'type': m.type, 'text': m.text[:400], 'page': page.url}) if m.type in ('error',) else None)
        page.on('pageerror', lambda e: ISSUES.append({'kind': 'pageerror', 'text': str(e)[:500], 'page': page.url}))
        page.goto(URL, wait_until='load')
        page.wait_for_timeout(1200)
        page.evaluate('() => localStorage.clear()')
        page.reload(wait_until='load')
        page.wait_for_timeout(1400)

        # ---------------- 登录 ----------------
        shot(page, '00-login')
        capture_metrics(page, '00-login')

        # ---------------- 学生端 ----------------
        enter_role(page, 0)
        shot(page, 'S01-home')
        capture_metrics(page, 'S01-home')

        # 引导 A：上传 -> 主线 -> 结论
        nav(page, '/student/guide/A')
        shot(page, 'S02-guide-A-upload')
        capture_metrics(page, 'S02-guide-A-upload')
        page.set_input_files('input[type=file]', Q['A'])
        page.wait_for_timeout(1200)
        shot(page, 'S03-guide-A-parsed')
        capture_metrics(page, 'S03-guide-A-parsed')
        try:
            page.fill('.guide__input', '2b=√7·2a')
            page.keyboard.press('Enter')
            page.wait_for_timeout(700)
            shot(page, 'S04-guide-A-turn2')
            page.fill('.guide__input', 'c^2=a^2+b^2')
            page.keyboard.press('Enter')
            page.wait_for_timeout(700)
            page.fill('.guide__input', '8')
            page.keyboard.press('Enter')
            page.wait_for_timeout(700)
            page.locator('.guide__choices .guide__choice').nth(3).click()
            page.wait_for_timeout(250)
            page.locator('.guide__choices .ms-btn--primary').click()
            page.wait_for_timeout(1200)
            shot(page, 'S05-guide-A-final')
            capture_metrics(page, 'S05-guide-A-final')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'guide A mainline failed: ' + traceback.format_exc()[-800:]})

        # 引导 B：上传 -> 单选 -> 多选状态 -> 结论
        nav(page, '/student/guide/B')
        try:
            page.set_input_files('input[type=file]', Q['B'])
            page.wait_for_timeout(1200)
            page.fill('.guide__input', '垂直')
            page.keyboard.press('Enter')
            page.wait_for_timeout(600)
            page.fill('.guide__input', '垂直')
            page.keyboard.press('Enter')
            page.wait_for_timeout(600)
            page.locator('.guide__choices .guide__choice').nth(1).click()
            page.wait_for_timeout(250)
            page.locator('.guide__choices .ms-btn--primary').click()
            page.wait_for_timeout(900)
            shot(page, 'S06-guide-B-multi')
            capture_metrics(page, 'S06-guide-B-multi')
            page.locator('.guide__choices .guide__choice').nth(1).click()
            page.locator('.guide__choices .guide__choice').nth(3).click()
            page.wait_for_timeout(250)
            page.locator('.guide__choices .ms-btn--primary').click()
            page.wait_for_timeout(1200)
            shot(page, 'S07-guide-B-final')
            capture_metrics(page, 'S07-guide-B-final')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'guide B mainline failed: ' + traceback.format_exc()[-800:]})

        # 引导 C：上传态
        nav(page, '/student/guide/C')
        try:
            page.set_input_files('input[type=file]', Q['C'])
            page.wait_for_timeout(1200)
            shot(page, 'S08-guide-C-parsed')
            capture_metrics(page, 'S08-guide-C-parsed')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'guide C failed: ' + traceback.format_exc()[-800:]})

        # 练题
        nav(page, '/student/practice')
        shot(page, 'S10-practice')
        capture_metrics(page, 'S10-practice')
        try:
            page.locator('[data-qa^="practice-item-"]').first.click()
            page.wait_for_timeout(600)
            shot(page, 'S11-practice-item')
            capture_metrics(page, 'S11-practice-item')
            opt = page.locator('[data-qa^="practice-option-"]').first
            if opt.count():
                opt.click()
                page.wait_for_timeout(300)
                page.locator('[data-qa="practice-submit"]').click()
                page.wait_for_timeout(800)
                shot(page, 'S12-practice-feedback')
                capture_metrics(page, 'S12-practice-feedback')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'practice interaction failed: ' + traceback.format_exc()[-800:]})

        # 错题
        nav(page, '/student/errors')
        shot(page, 'S13-errors-autodrawer')
        capture_metrics(page, 'S13-errors-autodrawer')
        try:
            page.locator('[data-qa="errors-drawer-close"]').click()
            page.wait_for_timeout(500)
            shot(page, 'S14-errors-list')
            capture_metrics(page, 'S14-errors-list')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'errors drawer close failed: ' + traceback.format_exc()[-400:]})

        # 知识库
        nav(page, '/student/library')
        shot(page, 'S15-library')
        capture_metrics(page, 'S15-library')
        try:
            ctas = page.locator('[data-qa^="library-ingest"]')
            if ctas.count():
                ctas.first.click()
                page.wait_for_timeout(1200)
                shot(page, 'S16-library-ingested')
                capture_metrics(page, 'S16-library-ingested')
            sug = page.locator('[data-qa^="library-suggest"]')
            if sug.count():
                sug.first.click()
                page.wait_for_timeout(1200)
                shot(page, 'S17-library-answer')
                capture_metrics(page, 'S17-library-answer')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'library interaction failed: ' + traceback.format_exc()[-600:]})

        # 资源中心
        nav(page, '/student/resources')
        shot(page, 'S18-resources')
        capture_metrics(page, 'S18-resources')
        try:
            cards = page.locator('[data-qa="resources-lecture-card"], [data-qa="resources-video-card"]')
            if cards.count():
                cards.first.click()
                page.wait_for_timeout(900)
                shot(page, 'S19-resources-detail')
                capture_metrics(page, 'S19-resources-detail')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'resources open failed: ' + traceback.format_exc()[-400:]})

        # 课堂
        nav(page, '/student/classroom')
        shot(page, 'S20-classroom-tasks')
        capture_metrics(page, 'S20-classroom-tasks')
        try:
            page.locator('[data-test="tab-class"]').click()
            page.wait_for_timeout(700)
            shot(page, 'S21-classroom-class')
            capture_metrics(page, 'S21-classroom-class')
            page.locator('[data-test="tab-dual"]').click()
            page.wait_for_timeout(700)
            shot(page, 'S22-classroom-dual')
            capture_metrics(page, 'S22-classroom-dual')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'classroom tabs failed: ' + traceback.format_exc()[-600:]})

        # 双师课堂
        nav(page, '/student/dual/preset-pub-ellipse-v1', 1600)
        shot(page, 'S23-dual')
        capture_metrics(page, 'S23-dual')

        # 我的
        nav(page, '/student/me')
        shot(page, 'S24-me-report')
        capture_metrics(page, 'S24-me-report')
        for tab, name in [('map', 'S25-me-map'), ('feedback', 'S26-me-feedback'), ('settings', 'S27-me-settings')]:
            try:
                page.locator(f'[data-qa="me-tab-{tab}"]').click()
                page.wait_for_timeout(700)
                shot(page, name)
                capture_metrics(page, name)
            except Exception:
                ISSUES.append({'kind': 'script', 'text': f'me tab {tab} failed: ' + traceback.format_exc()[-400:]})

        # ---------------- 教师端 ----------------
        goto_login(page)
        enter_role(page, 1)
        shot(page, 'T01-prep-home')
        capture_metrics(page, 'T01-prep-home')

        try:
            page.locator('button:has-text("新建备课")').first.click()
            page.wait_for_timeout(800)
            shot(page, 'T02-new-prep-dialog')
            capture_metrics(page, 'T02-new-prep-dialog')
            page.keyboard.press('Escape')
            page.wait_for_timeout(400)
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'new prep dialog failed: ' + traceback.format_exc()[-400:]})

        nav(page, '/teacher/prep/history')
        shot(page, 'T03-prep-history')
        capture_metrics(page, 'T03-prep-history')

        # 工作台三 Tab
        nav(page, '/teacher/prep/w/prep-ellipse/classroom', 1600)
        shot(page, 'T04-wb-classroom')
        capture_metrics(page, 'T04-wb-classroom')
        for tab, name in [('ppt', 'T05-wb-ppt'), ('plan', 'T06-wb-plan')]:
            try:
                page.locator(f'[data-testid="tab-{tab}"]').click()
                page.wait_for_timeout(1200)
                shot(page, name)
                capture_metrics(page, name)
            except Exception:
                ISSUES.append({'kind': 'script', 'text': f'workbench tab {tab} failed: ' + traceback.format_exc()[-500:]})
        try:
            page.locator('[data-testid="publish-open"]').click()
            page.wait_for_timeout(900)
            shot(page, 'T07-publish-dialog')
            capture_metrics(page, 'T07-publish-dialog')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'publish dialog failed: ' + traceback.format_exc()[-500:]})

        # 其他教师页
        for route, name in [('/teacher/classroom', 'T10-teacher-classroom'), ('/teacher/bank', 'T11-bank'),
                            ('/teacher/assign', 'T12-assign'), ('/teacher/grading', 'T13-grading'),
                            ('/teacher/insights', 'T14-insights'), ('/teacher/resources', 'T15-resources')]:
            nav(page, route, 1400)
            shot(page, name)
            capture_metrics(page, name)
            if name in ('T14-insights', 'T15-resources', 'T11-bank'):
                shot(page, name + '-full', full=True)

        # ---------------- 科研端 ----------------
        goto_login(page)
        enter_role(page, 2)
        shot(page, 'R01-research-home')
        capture_metrics(page, 'R01-research-home')
        nav(page, '/research/read', 1600)
        shot(page, 'R02-research-read')
        capture_metrics(page, 'R02-research-read')
        nav(page, '/research/write', 1600)
        shot(page, 'R03-research-write')
        capture_metrics(page, 'R03-research-write')

        # 主持人工具（浮标）
        try:
            nav(page, '/login')
            fab = page.locator('.ms-host-fab')
            if fab.count() == 0:
                fab = page.locator('button[title*="主持"], .ms-link-btn:has-text("主持人工具")')
            if fab.count():
                fab.first.click()
                page.wait_for_timeout(800)
                shot(page, 'X01-host-tool')
                capture_metrics(page, 'X01-host-tool')
        except Exception:
            ISSUES.append({'kind': 'script', 'text': 'host tool failed: ' + traceback.format_exc()[-400:]})

        browser.close()

    with open(r'D:\zxsy-math-arena-showcase\qa\review-visual\metrics.json', 'w', encoding='utf-8') as f:
        json.dump({'metrics': METRICS, 'issues': ISSUES}, f, ensure_ascii=False, indent=1)
    print('done. shots:', len(METRICS), 'issues:', len(ISSUES))
    for i in ISSUES:
        print(json.dumps(i, ensure_ascii=False)[:300])


if __name__ == '__main__':
    main()
