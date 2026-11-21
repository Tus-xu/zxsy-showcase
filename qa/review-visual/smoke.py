import asyncio, json
from playwright.async_api import async_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':1672,'height':941}, device_scale_factor=1, locale='zh-CN')
        page = await ctx.new_page()
        errs = []
        page.on('console', lambda m: errs.append(('console', m.type, m.text[:300])) if m.type in ('error','warning') else None)
        page.on('pageerror', lambda e: errs.append(('pageerror', str(e)[:500])))
        await page.goto(URL, wait_until='load')
        await page.wait_for_timeout(1200)
        await page.screenshot(path=OUT + r'\00-login.png')
        print('title:', await page.title())
        print('url:', page.url)
        print('roles:', await page.locator('.ms-role').count())
        for role, sel in [('student','.ms-role:nth-child(1)'),('teacher','.ms-role:nth-child(2)'),('research','.ms-role:nth-child(3)')]:
            await page.goto(URL, wait_until='load')
            await page.wait_for_timeout(500)
            await page.locator('.ms-role').nth(['student','teacher','research'].index(role)).click()
            await page.wait_for_timeout(1200)
            print(role, '->', page.url)
            await page.screenshot(path=OUT + f'\\00-{role}-home.png')
        print('errors:', json.dumps(errs, ensure_ascii=False)[:2000])
        await b.close()

asyncio.run(main())
