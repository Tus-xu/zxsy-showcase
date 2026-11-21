# -*- coding: utf-8 -*-
"""Recheck helper: inspect quadratic/ellipse parameter-linked slides in the packaged release."""
import os, shutil, sys, time
from playwright.sync_api import sync_playwright

BASE = r'D:\zxsy-math-arena-showcase'
RUN = os.path.join(os.environ.get('TEMP', BASE), f'mathesis-recheck-{time.strftime("%H%M%S")}')
shutil.copytree(os.path.join(BASE, 'release'), os.path.join(RUN, 'release'))
entry = os.path.join(RUN, 'release', '开始演示.html')


def login(page, role):
    page.goto(page.url.split('#')[0] + '#/login', wait_until='load')
    page.wait_for_timeout(400)
    page.locator('.ms-role', has_text=role).first.click()
    page.wait_for_timeout(300)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1672, 'height': 941}, device_scale_factor=1)
    page = ctx.new_page()
    page.goto('file:///' + entry.replace('\\', '/'), wait_until='load')
    page.wait_for_timeout(700)

    # ---- quadratic workbench, PPT tab (default active slide should be s3) ----
    login(page, '教师')
    page.goto(page.url.split('#')[0] + '#/teacher/prep/w/prep-quadratic/ppt', wait_until='load')
    page.wait_for_timeout(1200)
    eq = page.locator('.sc-eq-main').first.inner_text() if page.locator('.sc-eq-main').count() else '(none)'
    lead = page.locator('.sc-lead').first.inner_text() if page.locator('.sc-lead').count() else '(none)'
    anno = page.locator('.sc-anno').first.inner_text() if page.locator('.sc-anno').count() else '(none)'
    print('QUADRATIC eq-main:', eq)
    print('QUADRATIC lead   :', lead)
    print('QUADRATIC anno   :', anno.replace('\n', ' | '))
    page.screenshot(path=os.path.join(BASE, 'qa', 'review-math', 'tmp', 'recheck-quadratic-ppt.png'), full_page=False)

    # ---- ellipse workbench, switch to slide 5, change params ----
    page.goto(page.url.split('#')[0] + '#/teacher/prep/w/prep-ellipse/ppt', wait_until='load')
    page.wait_for_timeout(1200)
    # click slide 5 thumbnail (title contains 几何性质)
    thumbs = page.locator('.slide-thumb, [data-testid=slide-thumb]')
    if not thumbs.count():
        thumbs = page.locator('.slides-sidebar__item, .ss-item')
    print('ellipse thumbs count:', thumbs.count())
    try:
        page.locator('text=几何性质与参数联动').first.click()
        page.wait_for_timeout(600)
    except Exception as e:
        print('open slide5 failed:', e)
    before_lead = page.locator('.sc-lead').first.inner_text() if page.locator('.sc-lead').count() else '(none)'
    before_eq = page.locator('.sc-eq-main').first.inner_text() if page.locator('.sc-eq-main').count() else '(none)'
    print('ELLIPSE s5 lead(before):', before_lead)
    print('ELLIPSE s5 eq(before)  :', before_eq)
    # change a=10, b=6 via property panel
    try:
        page.locator('[data-testid=param-a]').first.fill('10')
        page.wait_for_timeout(300)
        page.locator('[data-testid=param-b]').first.fill('6')
        page.wait_for_timeout(600)
    except Exception as e:
        print('param change failed:', e)
    after_lead = page.locator('.sc-lead').first.inner_text() if page.locator('.sc-lead').count() else '(none)'
    after_eq = page.locator('.sc-eq-main').first.inner_text() if page.locator('.sc-eq-main').count() else '(none)'
    anno2 = page.locator('.sc-anno').first.inner_text() if page.locator('.sc-anno').count() else '(none)'
    print('ELLIPSE s5 lead(after) :', after_lead)
    print('ELLIPSE s5 eq(after)   :', after_eq)
    print('ELLIPSE s5 anno(after) :', anno2.replace('\n', ' | '))
    page.screenshot(path=os.path.join(BASE, 'qa', 'review-math', 'tmp', 'recheck-ellipse-s5-params.png'), full_page=False)

    browser.close()
print('RECнЕСК-DONE')
