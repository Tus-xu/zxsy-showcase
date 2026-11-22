// V4.1 A4 补充快照：打开既有引导会话，定位带 citations 徽标的卡片（概念卡/detour 卡）
// 并滚动到位截图（卡面「📖 来源」徽标 = A4 的 DOM 渲染证据；DB 侧 chunk_id 回溯已闭环）。
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const base = process.env.BASE || 'http://127.0.0.1:5176'
const OUT = 'D:/zxsy-math-arena/docs/design/student-guided-solving-v4/evidence-v41'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1500, height: 980 }, locale: 'zh-CN' })
const page = await ctx.newPage()
page.setDefaultTimeout(45000)

await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
await page.locator('#preferred-role').selectOption('student')
await page.getByRole('tab', { name: '密码登录' }).click()
await page.locator('input.input[placeholder="请输入中国大陆手机号"]').fill('13800001001')
await page.locator('#auth-password').fill('MathArenaDemo2026!')
await page.getByRole('button', { name: /安全登录/ }).click()
await page.waitForURL((u) => !String(u).includes('/login'), { timeout: 30000 })
await page.goto(`${base}/dialog`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

// 打开最近的真实引导会话（列表第一条含「单调区间」的会话）
const item = page.locator('.cs-item, .conv-item, [class*="conv"]').filter({ hasText: '单调区间' }).first()
await item.click()
await page.waitForTimeout(2500)

// 加载完整历史（可能需多次滚到顶部）
for (let i = 0; i < 25; i++) {
  const hasBadge = await page.locator('.soc-cite-badge').first().isVisible().catch(() => false)
  if (hasBadge) break
  await page.evaluate(() => {
    const el = document.querySelector('.dialog-messages') || document.scrollingElement
    el.scrollTop = 0
  })
  await page.waitForTimeout(700)
}
const badgeCount = await page.locator('.soc-cite-badge').count()
console.log('cite-badges:', badgeCount)
if (badgeCount > 0) {
  const first = page.locator('.soc-cite-badge').first()
  await first.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  const badgeInfo = await page.evaluate(() => {
    const badge = document.querySelector('.soc-cite-badge')
    const wrap = badge?.closest('[data-soc-citations], .soc-detour, [data-soc-concept-card], .soc-ix, .msg-row')
    return {
      badgeText: badge?.textContent?.trim() || '',
      label: document.querySelector('.soc-cites-label')?.textContent?.trim() || '',
      cardType: wrap?.getAttribute('data-soc-concept-card') !== null && document.querySelector('[data-soc-concept-card]') ? 'concept/detour' : (wrap?.className || '').slice(0, 60),
      hoverQuote: document.querySelector('.soc-cite-quote')?.textContent?.trim().slice(0, 80) || '',
    }
  })
  fs.writeFileSync(path.join(OUT, 'v41-a4-card-badge.json'), JSON.stringify({ badgeCount, ...badgeInfo, assert: 'A4 卡面「📖 来源」徽标渲染（SocraticCitations.vue：doc_title/chunk_id 徽标 + quote 展开）' }, null, 2))
  await page.screenshot({ path: path.join(OUT, 'v41-a4-citations-badge.png'), fullPage: false })
  // 徽标展开 quote 再拍一张
  await first.hover().catch(() => {})
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, 'v41-a4-citations-badge-hover.png'), fullPage: false })
  console.log('badge-info:', JSON.stringify(badgeInfo))
} else {
  fs.writeFileSync(path.join(OUT, 'v41-a4-card-badge.json'), JSON.stringify({ badgeCount: 0, note: '该会话历史无 .soc-cite-badge（citations 全走降级）' }, null, 2))
  console.log('NO-BADGE')
}
await browser.close()
