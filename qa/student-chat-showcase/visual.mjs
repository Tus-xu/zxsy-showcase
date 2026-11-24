/**
 * 视觉复核：两档桌面视口 + 200% 放大 + 减弱动效（方案 §8 / V08）。
 *
 * 检查项：
 *   1. 两个视口下都没有水平滚动（连线表/公式/长选项不撑破聊天区）
 *   2. 当前可操作卡片能完整滚到输入框上方，不被输入区遮挡
 *   3. 题眼高亮词在减弱动效下仍是静态可见（不靠动画表达含义）
 *   4. 200% 放大的局部截图（deviceScaleFactor=2 裁剪当前卡片）
 *
 * 用法（在 app 目录执行）：node ../qa/student-chat-showcase/visual.mjs [--entry <html>]
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createRequire } from 'node:module'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const require = createRequire(path.join(ROOT, 'app', 'package.json'))
const { chromium } = require('@playwright/test')

const argv = process.argv.slice(2)
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const ENTRY = 'file:///' + path.resolve(argOf('--entry', path.join(ROOT, 'release', '开始演示.html'))).replace(/\\/g, '/')
const OUT = path.join(HERE, 'visual')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1906x1035', width: 1906, height: 1035 },
]

const browser = await chromium.launch({ headless: true })
const result = { viewports: {}, reducedMotion: {}, zoom200: {} }

async function open(ctx, conv) {
  const page = await ctx.newPage()
  await page.goto(ENTRY, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  await page.selectOption('#preferred-role', 'student')
  await page.fill('#auth-phone', '13800001001')
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.waitForTimeout(800)
  await page.getByPlaceholder('6 位验证码').fill('246810')
  await page.getByRole('button', { name: '安全登录' }).click()
  await page.waitForTimeout(1800)
  await page.evaluate((r) => { location.hash = '#' + r }, `/dialog/${conv}`)
  await page.waitForTimeout(2200)
  return page
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, offline: true })
  const page = await open(ctx, 'sc-s5')
  const info = await page.evaluate(() => {
    const de = document.documentElement
    const list = document.querySelector('.dialog-messages')
    const input = document.querySelector('.chat-input, .ci-wrap, footer')
    const cards = Array.from(document.querySelectorAll('.ssc'))
    const live = cards[cards.length - 1]
    live?.scrollIntoView({ block: 'end' })
    const lr = live?.getBoundingClientRect()
    const ir = input?.getBoundingClientRect()
    return {
      scrollW: de.scrollWidth,
      clientW: de.clientWidth,
      listScrollW: list?.scrollWidth || 0,
      listClientW: list?.clientWidth || 0,
      liveBottom: lr ? Math.round(lr.bottom) : null,
      inputTop: ir ? Math.round(ir.top) : null,
      marks: Array.from(document.querySelectorAll('.ssc-mark')).map((m) => m.textContent.trim()),
    }
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, `vp-${vp.name}.png`) })
  // 局部 200%：当前卡片放大一倍裁剪
  const live = page.locator('.ssc').last()
  await live.screenshot({ path: path.join(OUT, `card-${vp.name}.png`) })
  result.viewports[vp.name] = {
    ...info,
    noHScrollDoc: info.scrollW <= info.clientW + 1,
    noHScrollList: info.listScrollW <= info.listClientW + 1,
    cardAboveInput: info.liveBottom != null && info.inputTop != null && info.liveBottom <= info.inputTop + 2,
  }
  console.log(`${vp.name}: noHScroll=${result.viewports[vp.name].noHScrollDoc} cardAboveInput=${result.viewports[vp.name].cardAboveInput} marks=${JSON.stringify(info.marks)}`)
  await ctx.close()
}

/* 200% 放大：DPR=2 的局部截图，检查文字是否清晰、无重叠 */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, offline: true })
  const page = await open(ctx, 'sc-s5')
  await page.locator('.ssc').last().screenshot({ path: path.join(OUT, 'card-zoom200.png') })
  const box = await page.evaluate(() => {
    const c = document.querySelectorAll('.ssc');
    const live = c[c.length - 1]
    const r = live.getBoundingClientRect()
    // 粗检重叠：卡内任意两个按钮的矩形不得相交
    const btns = Array.from(live.querySelectorAll('button')).map((b) => b.getBoundingClientRect())
    let overlap = 0
    for (let i = 0; i < btns.length; i++) {
      for (let j = i + 1; j < btns.length; j++) {
        const a = btns[i], b = btns[j]
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap++
      }
    }
    return { w: Math.round(r.width), h: Math.round(r.height), btns: btns.length, overlap }
  })
  result.zoom200 = box
  console.log('zoom200:', JSON.stringify(box))
  await ctx.close()
}

/* 减弱动效：静态形态可读，且没有正在跑的高亮动画 */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, offline: true, reducedMotion: 'reduce',
  })
  const page = await open(ctx, 'sc-s5')
  // 知识定位卡（题型三选）已按评审删除，改为检查导学卡整体：减弱动效下内容完整、无动画
  const info = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.ssc'))
    const btns = Array.from(document.querySelectorAll('.ssc button'))
    const anims = cards.map((c) => getComputedStyle(c).animationName)
    return {
      count: cards.length,
      texts: cards.map((c) => (c.querySelector('.ssc-title')?.textContent || '').trim()).filter(Boolean),
      anims,
      visible: cards.every((c) => c.getBoundingClientRect().height > 0) && btns.length > 0,
      btnCount: btns.length,
    }
  })
  await page.screenshot({ path: path.join(OUT, 'reduced-motion.png') })
  result.reducedMotion = { ...info, allStatic: info.anims.every((a) => a === 'none') }
  console.log('reducedMotion:', JSON.stringify(result.reducedMotion))
  await ctx.close()
}

fs.writeFileSync(path.join(OUT, 'visual.json'), JSON.stringify(result, null, 1))
const ok =
  Object.values(result.viewports).every((v) => v.noHScrollDoc && v.noHScrollList && v.cardAboveInput) &&
  result.zoom200.overlap === 0 &&
  result.reducedMotion.allStatic && result.reducedMotion.visible && result.reducedMotion.count >= 1
console.log(ok ? 'VISUAL CLEAN' : 'VISUAL BLOCKED')
await browser.close()
process.exit(ok ? 0 : 1)
