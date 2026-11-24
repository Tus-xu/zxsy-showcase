/**
 * 学生端 V3 原型 · 逐屏验证
 * 用法：node v3-prototype/verify.mjs [--entry <html>] [--w <宽>] [--h <高>]
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createRequire } from 'node:module'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const require = createRequire(path.join(ROOT, 'app', 'package.json'))
const { chromium } = require('@playwright/test')

const argv = process.argv.slice(2)
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d }
const ENTRY = 'file:///' + path.resolve(argOf('--entry', path.join(HERE, 'index.html'))).replace(/\\/g, '/')
const W = Number(argOf('--w', 1440))
const H = Number(argOf('--h', 900))
const OUT = path.join(HERE, 'shots')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, offline: true })
const page = await ctx.newPage()
const net = []
const errs = []
const cons = []
page.on('request', (r) => { if (/^(https?|wss?):/.test(r.url())) net.push(r.url()) })
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)) })

const shot = async (name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }) }
const probe = () => page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
}))

await page.goto(ENTRY, { waitUntil: 'load' })
await page.waitForTimeout(700)

const steps = []
const record = async (name, note) => {
  const p = await probe()
  steps.push({ name, note, ...p })
  await shot(name)
  console.log(`${p.overflow ? 'OVERFLOW' : 'ok      '} ${name} — ${note}`)
}

await record('01-chat-opening', '开场：错因诊断 + 独立题块 + 符号槽位')

// 先答错一次，验证就地反馈
await page.click('[data-side="left"][data-sign="-"]')
await page.click('[data-side="right"][data-sign="+"]')
await page.click('[data-act="probe-submit"]')
await page.waitForTimeout(250)
await record('02-probe-miss', '答错：保留原卡片，就地给提示')

await page.click('[data-side="left"][data-sign="+"]')
await page.click('[data-side="right"][data-sign="-"]')
await page.click('[data-act="probe-submit"]')
await page.waitForTimeout(300)
await record('03-probe-ok', '答对：对照图 + 打开画布')

await page.click('[data-act="open-canvas"]')
await page.waitForTimeout(500)
await record('04-workbench', '形态 B：画布 + 实时读数 + AI 读状态')

// 拖到变号位置
const box = await page.locator('#plot-wrap svg').boundingBox()
await page.mouse.move(box.x + box.width * 0.30, box.y + box.height * 0.5)
await page.mouse.down()
await page.mouse.move(box.x + box.width * 0.44, box.y + box.height * 0.5, { steps: 14 })
await page.mouse.up()
await page.waitForTimeout(400)
await record('05-workbench-signflip', '切点划过变号位置：AI 主动指出')

// 切到 x³ 反例，再把切点移向原点：切线水平但不变号
await page.click('[data-act="fn-cube"]')
await page.waitForTimeout(350)
await record('06-workbench-cube', '反例 f(x)=x³：切点在 1.6，斜率为正')

await page.evaluate(() => {
  const sl = document.querySelector('#xr')
  sl.value = '0.16'
  sl.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.waitForTimeout(450)
await record('06b-workbench-flat', '反例切到原点附近：切线水平但两侧同号，AI 主动点破')

await page.click('[data-act="to-practice"]')
await page.waitForTimeout(450)
await record('07-practice', '形态 C：草稿 + 按需提示 + 练习目标')

// 写一份不完整的草稿，验证逐项核对是真实判定
await page.fill('#draft', 'h\'(x) = -3x² + 6x + 9')
await page.click('[data-act="submit-work"]')
await page.waitForTimeout(400)
await record('08-practice-partial', '只写了导数：只勾一项，其余标为待补')

await page.fill('#draft', 'h\'(x) = -3x² + 6x + 9 = -3(x+1)(x-3)\n符号 -、+、-，左正右负对应极大\n所以 x = 3 时取得局部极大')
await page.click('[data-act="submit-work"]')
await page.waitForTimeout(500)
await record('09-practice-pass', '完整推导：三项都过')

await page.click('[data-act="to-summary"]').catch(async () => {
  await page.click('[data-view="summary"]')
})
await page.waitForTimeout(500)
await record('10-summary', '学习总结：真实统计 + 证据条 + 错因')

await page.click('[data-view="errors"]')
await page.waitForTimeout(300)
await record('11-errors', '错题本：按错因归类')

console.log('\nhttp:', net.length, net.slice(0, 3))
console.log('pageErrors:', errs)
console.log('consoleErrors:', cons)
fs.writeFileSync(path.join(OUT, 'verify.json'), JSON.stringify({ steps, net, errs, cons, w: W, h: H }, null, 1))
const bad = steps.filter((s) => s.overflow).length
console.log(bad ? `\n${bad} 屏有水平溢出` : '\n全部屏幕无水平溢出')
await browser.close()
process.exit(bad || errs.length ? 1 : 0)
