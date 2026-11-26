/**
 * 知识引用 + t2/t3 知识回溯视觉走查。
 *
 * 用法：node qa/experience-upgrade/citations.mjs [--entry <html>]
 * 输出：qa/experience-upgrade/shots-citations/ + report-citations.json
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
  : path.join(ROOT, 'release', '开始演示.html')
const ENTRY = pathToFileURL(entryFile).href
const OUT = path.join(HERE, 'shots-citations')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const report = { entry: ENTRY, shots: [], errors: [], checks: {} }
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true, locale: 'zh-CN' })
const page = await ctx.newPage()
page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  const t = m.text()
  if (/relative paths|MathLive|katex|^\s*at |\[\s*at |at file:|html:\d+:\d+/i.test(t)) return
  report.errors.push(`console: ${t.slice(0, 240)}`)
})

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  report.shots.push(name)
}
async function login() {
  await page.goto(ENTRY, { waitUntil: 'load' })
  await page.waitForTimeout(900)
  await page.selectOption('#preferred-role', 'student')
  await page.fill('#auth-phone', '13800001001')
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.waitForTimeout(400)
  await page.getByPlaceholder('6 位验证码').fill('246810')
  await page.getByRole('button', { name: '安全登录' }).click()
  await page.waitForTimeout(1300)
}
async function send(wait = 2200) {
  await page.locator('button.ci-send').click()
  await page.waitForTimeout(wait)
}
async function binary(index) {
  const bj = page.locator('.ix-bj').last()
  await bj.locator('.ix-bj-opt').nth(index).click()
  await bj.locator('.ix-submit').click()
  await page.waitForTimeout(2200)
}
async function openReview() {
  await page.locator('.se-review-go').last().click()
  await page.waitForTimeout(800)
}
async function closeReview() {
  await page.locator('.krw-close').click()
  await page.waitForTimeout(350)
}

await login()

/* t1：AI 回答后的知识引用 */
await page.evaluate(() => { location.hash = '#/dialog/exp-t1-guided' })
await page.waitForTimeout(1200)
await send()
await binary(0)
report.checks.t1Refs = await page.locator('.src-card').count()
report.checks.t1Compact = await page.locator('.soc-cites').count()
report.checks.t1Titles = await page.locator('.src-card .src-title').allTextContents()
await shot('01-t1-citations')
await closeReview().catch(() => {})

/* t3：错题 -> 知识回溯（路径图 + 引用） */
await page.evaluate(() => { location.hash = '#/dialog/exp-t3-guided' })
await page.waitForTimeout(1200)
await send()
await binary(1)
await send()
const t3cz = page.locator('.ix-cloze').last()
await t3cz.locator('.ix-cz-blank').nth(0).click()
await page.waitForTimeout(160)
await t3cz.locator('.ix-cz-opt').nth(1).click()
await t3cz.locator('.ix-cz-submit, .ix-submit').last().click()
await page.waitForTimeout(2400)
report.checks.t3RawLatex = await page.evaluate(() => /\\left|\\frac|\\right/.test(document.body.innerText))
report.checks.t3ReviewCta = await page.locator('.se-review-go').count()
await openReview()
report.checks.t3Path = await page.locator('.kpf').count()
report.checks.t3Refs = await page.locator('.krw .src-card').count()
await shot('02-t3-rewind')
await closeReview()

/* t2：错题 -> 知识回溯 */
await page.evaluate(() => { location.hash = '#/dialog/exp-t2-guided' })
await page.waitForTimeout(1200)
await send()
await binary(0)
await send()
await binary(1)
report.checks.t2ReviewCta = await page.locator('.se-review-go').count()
await openReview()
report.checks.t2Path = await page.locator('.kpf').count()
report.checks.t2Refs = await page.locator('.krw .src-card').count()
await shot('03-t2-rewind')

fs.writeFileSync(path.join(HERE, 'report-citations.json'), JSON.stringify(report, null, 1))
console.log(JSON.stringify({ shots: report.shots.length, checks: report.checks, errors: report.errors }, null, 1))
await browser.close()
