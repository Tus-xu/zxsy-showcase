import asyncio
from playwright.async_api import async_playwright

URL = 'file:///D:/zxsy-math-arena-showcase/release/index.html'
OUT = r'D:\zxsy-math-arena-showcase\qa\review-visual\shots'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':1672,'height':941}, device_scale_factor=1, locale='zh-CN')
        page = await ctx.new_page()
        await page.goto(URL, wait_until='load'); await page.wait_for_timeout(800)
        await page.locator('.ms-role').nth(2).click(); await page.wait_for_timeout(900)
        await page.mouse.move(5, 5)
        for name, route in [('read', '/research/read'), ('write', '/research/write'), ('read-proj', '/research/read?project=p-fem')]:
            await page.evaluate(f"location.hash = '#{route}'")
            await page.wait_for_timeout(1500)
            await page.mouse.move(5, 5)
            await page.screenshot(path=OUT + f'\\probe-research-{name}.png')
            txt = await page.locator('body').inner_text()
            print(name, '| url:', page.url.split('#')[-1], '| len:', len(txt), '|', txt[:120].replace('\n',' / '))
        await b.close()

asyncio.run(main())
