/**
 * 体验升级 · 真实浏览器截图（1440/1920 + reduced-motion）。
 * 用法：node qa/experience-upgrade/capture.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const require = createRequire(path.join(ROOT, 'app', 'package.json'))
const { chromium } = require('@playwright/test')
const argv = process.argv.slice(2)
const entryIdx = argv.indexOf('--entry')
const entryFile = entryIdx >= 0 ? path.resolve(argv[entryIdx + 1]) : path.join(ROOT, 'app/dist-offline/index.html')
const ENTRY = pathToFileURL(entryFile).href
const OUT = path.join(HERE, 'shots')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const report = { shots: [], errors: [], warnings: [] }
const browser = await chromium.launch({ channel: 'chrome', headless: true })

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, offline: true, locale: 'zh-CN', ...opts })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (/relative paths|MathLive|katex|^\s*at |\[\s*at |at file:|html:\d+:\d+/i.test(t)) report.warnings.push(t.slice(0, 160))
    else report.errors.push(`console: ${t.slice(0, 200)}`)
  })
  await page.goto(ENTRY, { waitUntil: 'load' })
  await page.waitForTimeout(900)
  await page.selectOption('#preferred-role', 'student')
  await page.fill('#auth-phone', '13800001001')
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.waitForTimeout(500)
  await page.getByPlaceholder('6 位验证码').fill('246810')
  await page.getByRole('button', { name: '安全登录' }).click()
  await page.waitForTimeout(1700)
  return { ctx, page }
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file })
  report.shots.push(name)
  return file
}

async function send(page, wait = 2700) {
  await page.locator('button.ci-send').click()
  await page.waitForTimeout(wait)
}

async function answerBinary(page, index = 0) {
  const bj = page.locator('.ix-bj').last()
  await bj.locator('.ix-bj-opt').nth(index).click()
  await bj.locator('.ix-submit').click()
  await page.waitForTimeout(2500)
}

async function fillCloze(page) {
  const cz = page.locator('.ix-cloze').last()
  await cz.locator('.ix-cz-blank').nth(0).click()
  await page.waitForTimeout(150)
  await page.locator('.ix-cz-opt').first().click()
  await page.waitForTimeout(150)
  await cz.locator('.ix-cz-blank').nth(1).click()
  await page.waitForTimeout(150)
  await page.locator('.ix-cz-opt').first().click()
  await page.waitForTimeout(150)
  await cz.locator('.ix-submit').click()
  await page.waitForTimeout(2700)
}

async function walkGuided(page) {
  await send(page)
  await answerBinary(page, 0)
  await send(page)
  await fillCloze(page)
  await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.waitForTimeout(300)
  await shot(page, '05b-guided-step2-correct-1440')
  await send(page)
  await answerBinary(page, 3)
  await page.waitForTimeout(900)
}

/* ---------------- 1440 ---------------- */
{
  const { ctx, page } = await newPage({ width: 1440, height: 900 })
  await shot(page, '01-home-1440')
  await page.evaluate(() => {
    const el = document.querySelector('.cs-list')
    if (el) el.scrollTop = el.scrollHeight
  })
  await page.waitForTimeout(400)
  const scrolled = await page.evaluate(() => (document.querySelector('.cs-list')?.scrollTop || 0) > 0)
  report.historyScrolled = scrolled
  await shot(page, '02-rail-history-1440')
  await page.evaluate(() => { document.querySelector('.sidebar')?.scrollTo(0, 0) })
  await page.locator('[data-experience="exp-t1-guided"]').click()
  await page.waitForTimeout(1000)
  await shot(page, '03-cover-1440')
  await send(page)
  await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = 0 })
  await page.waitForTimeout(300)
  await shot(page, '04-guided-step1-1440')
  await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.waitForTimeout(300)
  await shot(page, '04b-guided-binary-1440')
  await answerBinary(page, 0)
  await send(page)
  await shot(page, '05-guided-step2-1440')
  await fillCloze(page)
  await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.waitForTimeout(300)
  await shot(page, '05b-guided-step2-correct-1440')
  await send(page)
  await answerBinary(page, 3)
  await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.waitForTimeout(600)
  await shot(page, '06-guided-complete-1440')
  await page.waitForTimeout(4200)
  await page.locator('.kt').last().scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(300)
  await shot(page, '07-trace-1440')

  await page.evaluate(() => { location.hash = '#/practice' })
  await page.waitForTimeout(2200)
  await shot(page, '08-practice-1440')
  await page.locator('.p-set-card').first().click()
  await page.waitForTimeout(2200)
  const start = page.locator('.daily-quest button.start-btn').first()
  await start.waitFor({ state: 'visible', timeout: 15000 })
  await start.click()
  await page.waitForTimeout(1800)
  await page.locator('.ans').first().click()
  await page.waitForTimeout(1500)
  await shot(page, '09-practice-reveal-1440')

  await page.evaluate(() => { location.hash = '#/dual' })
  await page.waitForTimeout(1800)
  await shot(page, '10-dual-home-1440')
  await page.evaluate(() => { location.hash = '#/dual' })
  await page.waitForTimeout(1200)
  await page.locator('.dcx-composer-bar .dcx-btn.primary').click()
  await page.waitForTimeout(500)
  await shot(page, '11a-dual-generating-1440')
  await page.waitForTimeout(3500)
  await shot(page, '11-dual-player-1440')
  await page.locator('.dcx-round').first().click().catch(() => {})
  await page.waitForTimeout(900)
  await shot(page, '11b-dual-playing-1440')

  await page.evaluate(() => { location.hash = '#/errors' })
  await page.waitForTimeout(2200)
  await shot(page, '12-errors-1440')
  await page.locator('.err-row').first().click()
  await page.waitForTimeout(1200)
  await shot(page, '13-errors-detail-1440')
  await ctx.close()
}

/* ---------------- 1920 ---------------- */
{
  const { ctx, page } = await newPage({ width: 1920, height: 1080 })
  await shot(page, '20-home-1920')
  await page.locator('[data-experience="exp-t1-guided"]').click()
  await page.waitForTimeout(1000)
  await send(page)
  await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = 0 })
  await page.waitForTimeout(300)
  await shot(page, '21-guided-1920')
  await page.evaluate(() => { location.hash = '#/practice' })
  await page.waitForTimeout(2200)
  await shot(page, '22-practice-1920')
  await page.locator('.p-set-card').first().click()
  await page.waitForTimeout(2200)
  const start1920 = page.locator('.daily-quest button.start-btn').first()
  await start1920.waitFor({ state: 'visible', timeout: 15000 })
  await start1920.click()
  await page.waitForTimeout(1600)
  await page.locator('.ans').first().click()
  await page.waitForTimeout(1200)
  await shot(page, '24-practice-answer-1920')
  await page.evaluate(() => { location.hash = '#/dual/sc-dual-line-full' })
  await page.waitForTimeout(2200)
  await shot(page, '23-dual-1920')
  await ctx.close()
}

/* ---------------- reduced motion ---------------- */
{
  const { ctx, page } = await newPage({ width: 1440, height: 900 }, { reducedMotion: 'reduce' })
  await page.locator('[data-experience="exp-t1-guided"]').click()
  await page.waitForTimeout(900)
  await walkGuided(page)
  await page.locator('.kt').last().scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(400)
  await shot(page, '30-trace-reduced-1440')
  report.reducedMotionButtons = await page.locator('.kt .kt-btn').allTextContents()
  await ctx.close()
}

fs.writeFileSync(path.join(HERE, 'report.json'), JSON.stringify(report, null, 1))
console.log(JSON.stringify({ shots: report.shots.length, errors: report.errors, warnings: report.warnings.length, reducedMotionButtons: report.reducedMotionButtons }, null, 1))
await browser.close()
