/**
 * 本轮「知识回溯 + 双师课件/主讲台」视觉走查。
 *
 * 用法（在仓库根执行）：
 *   node qa/experience-upgrade/rewind-dual.mjs
 *   node qa/experience-upgrade/rewind-dual.mjs --entry release/开始演示.html
 *
 * 只走内置离线回放，不访问网络；截图与 report.json 输出到 shots-rewind-dual/。
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
const entryFile = entryIdx >= 0
  ? path.resolve(argv[entryIdx + 1])
  : path.join(ROOT, 'app', 'dist-offline', 'index.html')
const ENTRY = pathToFileURL(entryFile).href
const OUT = path.join(HERE, 'shots-rewind-dual')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const report = { entry: ENTRY, shots: [], errors: [], checks: {} }
const browser = await chromium.launch({ channel: 'chrome', headless: true })

function watch(page) {
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (/relative paths|MathLive|katex|^\s*at |\[\s*at |at file:|html:\d+:\d+/i.test(t)) return
    report.errors.push(`console: ${t.slice(0, 240)}`)
  })
}

async function login(page) {
  await page.goto(ENTRY, { waitUntil: 'load' })
  await page.waitForTimeout(1400)
  await page.selectOption('#preferred-role', 'student')
  await page.fill('#auth-phone', '13800001001')
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.waitForTimeout(500)
  await page.getByPlaceholder('6 位验证码').fill('246810')
  await page.getByRole('button', { name: '安全登录' }).click()
  await page.waitForTimeout(1700)
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  report.shots.push(name)
}

async function send(page, wait = 2800) {
  await page.locator('button.ci-send').click()
  await page.waitForTimeout(wait)
}

async function answerBinary(page, index) {
  const bj = page.locator('.ix-bj').last()
  await bj.locator('.ix-bj-opt').nth(index).click()
  await bj.locator('.ix-submit').click()
  await page.waitForTimeout(2600)
}

async function answerClozeWrong(page) {
  const cz = page.locator('.ix-cloze').last()
  await cz.locator('.ix-cz-blank').nth(0).click()
  await page.waitForTimeout(180)
  await cz.locator('.ix-cz-opt').nth(1).click()
  await page.waitForTimeout(180)
  await cz.locator('.ix-cz-blank').nth(1).click()
  await page.waitForTimeout(180)
  await cz.locator('.ix-cz-opt').nth(0).click()
  await page.waitForTimeout(180)
  await cz.locator('.ix-submit').click()
  await page.waitForTimeout(3000)
}

async function scrollBottom(page) {
  await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.waitForTimeout(250)
}

/* ---------- 1440：知识回溯 ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true, locale: 'zh-CN' })
  const page = await ctx.newPage()
  watch(page)
  await login(page)
  await page.evaluate(() => { location.hash = '#/dialog/exp-t1-guided' })
  await page.waitForTimeout(1500)
  await send(page)
  await answerBinary(page, 0)
  await send(page)
  await answerClozeWrong(page)
  await scrollBottom(page)
  await shot(page, '01-guided-wrong')
  report.checks.reviewCta = await page.locator('.se-review-go').count()

  await page.locator('.se-review-go').last().click()
  await page.waitForTimeout(900)
  await shot(page, '02-rewind-level1')
  report.checks.panelTitle = await page.locator('.krw h2').first().textContent().catch(() => '')
  report.checks.level1Figure = await page.locator('.krf').count()

  await page.waitForTimeout(6200)
  const unsure = page.getByRole('button', { name: /还有点懵/ })
  if (await unsure.count()) await unsure.last().click()
  else {
    const finish = page.getByRole('button', { name: /讲完了，问我一句/ })
    if (await finish.count()) await finish.click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /还有点懵/ }).last().click()
  }
  await page.waitForTimeout(3200)
  await shot(page, '03-rewind-level2')
  report.checks.level2Title = await page.locator('.krw h2').first().textContent().catch(() => '')

  await page.waitForTimeout(6200)
  const got = page.getByRole('button', { name: /跟上了，回原题/ })
  if (await got.count()) await got.last().click()
  await page.waitForTimeout(500)
  await shot(page, '04-rewind-settled')
  report.checks.settledText = await page.locator('.krw-settled').first().innerText().catch(() => '')
  const retry = page.getByRole('button', { name: /回原题再试|回原题试一次/ })
  if (await retry.count()) await retry.last().click()
  await page.waitForTimeout(900)
  await shot(page, '05-back-to-question')
  report.checks.retryCardVisible = await page.locator('.soc-ix').count()
  await ctx.close()
}

/* ---------- 1440：双师课件 + 主讲台 ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true, locale: 'zh-CN' })
  const page = await ctx.newPage()
  watch(page)
  await login(page)
  await page.evaluate(() => { location.hash = '#/dual/sc-dual-line-full' })
  await page.waitForTimeout(2600)
  await shot(page, '06-dual-line-1440')
  report.checks.dualTitle = await page.locator('.dcx-course-name').first().textContent().catch(() => '')
  await page.locator('.dcx-oitem').nth(3).click()
  await page.waitForTimeout(900)
  await shot(page, '06b-dual-line-p4-1440')
  report.checks.figureCount = await page.locator('.pc-el__fig-img').count()
  report.checks.podiumHeight = await page.locator('.dcx-podium').evaluate((el) => Math.round(el.getBoundingClientRect().height)).catch(() => 0)
  report.checks.voiceBadge = await page.locator('.dcx-voice-badge').first().textContent().catch(() => '')
  await page.locator('.dcx-ctl.play').click()
  await page.waitForTimeout(2200)
  await shot(page, '07-dual-playing-1440')
  report.checks.audioSource = await page.locator('.dcx-podium').getAttribute('data-audio-source').catch(() => '')
  report.checks.playing = await page.locator('.dcx-podium.is-playing').count()
  report.checks.currentLine = await page.locator('.dcx-podium-now').first().innerText().catch(() => '')

  await page.evaluate(() => { location.hash = '#/dual/sc-dual-teacher-line' })
  await page.waitForTimeout(2600)
  await shot(page, '08-teacher-courseware-1440')
  report.checks.teacherTitle = await page.locator('.dcx-course-name').first().textContent().catch(() => '')
  report.checks.teacherBadge = await page.locator('.dcx-deckbadge').first().textContent().catch(() => '')
  await page.locator('.dcx-oitem').nth(3).click()
  await page.waitForTimeout(900)
  await shot(page, '08b-teacher-courseware-p4-1440')
  report.checks.teacherFigure = await page.locator('.pc-el__fig-img').count()

  await page.evaluate(() => { location.hash = '#/classroom?tab=dual' })
  await page.waitForTimeout(2200)
  await shot(page, '09-classroom-dual-tab')
  report.checks.coursewareCard = await page.locator('.tc-card').count()
  if (await page.locator('.tc-card').count()) {
    await page.locator('.tc-card').first().click()
    await page.waitForTimeout(2800)
    await shot(page, '10-courseware-opened')
    report.checks.coursewareUrl = page.url().split('#')[1] || ''
    report.checks.coursewareTitle = await page.locator('.dcx-course-name').first().textContent().catch(() => '')
  }
  await ctx.close()
}

/* ---------- 1920：主讲台与课件 ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, offline: true, locale: 'zh-CN' })
  const page = await ctx.newPage()
  watch(page)
  await login(page)
  await page.evaluate(() => { location.hash = '#/dual/sc-dual-sequence-sum' })
  await page.waitForTimeout(2600)
  await shot(page, '11-dual-sequence-1920')
  await page.locator('.dcx-oitem').nth(2).click()
  await page.waitForTimeout(900)
  await shot(page, '11b-dual-sequence-p3-1920')
  await page.locator('.dcx-ctl.play').click()
  await page.waitForTimeout(1800)
  await shot(page, '12-dual-sequence-playing-1920')
  report.checks.sequenceFigure = await page.locator('.pc-el__fig-img').count()
  report.checks.sequenceAudio = await page.locator('.dcx-podium').getAttribute('data-audio-source').catch(() => '')
  await ctx.close()
}

/* ---------- reduced motion：回溯静态展开 ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true, locale: 'zh-CN', reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  watch(page)
  await login(page)
  await page.evaluate(() => { location.hash = '#/dialog/exp-t1-guided' })
  await page.waitForTimeout(1400)
  await send(page)
  await answerBinary(page, 0)
  await send(page)
  await answerClozeWrong(page)
  await page.locator('.se-review-go').last().click()
  await page.waitForTimeout(900)
  await shot(page, '13-rewind-reduced-1440')
  report.checks.reducedButtons = await page.locator('.krw-anim-actions .krw-mini').allTextContents()
  await ctx.close()
}

fs.writeFileSync(path.join(HERE, 'report-rewind-dual.json'), JSON.stringify(report, null, 1))
console.log(JSON.stringify({ shots: report.shots.length, checks: report.checks, errors: report.errors }, null, 1))
await browser.close()
