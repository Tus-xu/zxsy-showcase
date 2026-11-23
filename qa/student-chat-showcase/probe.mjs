/**
 * 示例会话冒烟探针：打开每条示例会话，dump 可见文本 / 卡片 / 图片状态 / 网络请求。
 *
 * 用法（在 app 目录下执行，复用 app/node_modules 的 Playwright）：
 *   node ../qa/student-chat-showcase/probe.mjs [--entry <html>] [--conv sc-s5]
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createRequire } from 'node:module'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
// Playwright 装在 app/node_modules：从 app/package.json 解析，脚本本身放在 qa/ 也能跑
const require = createRequire(path.join(ROOT, 'app', 'package.json'))
const { chromium } = require('@playwright/test')
const argv = process.argv.slice(2)
const argOf = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : d
}
const ENTRY = 'file:///' + path.resolve(argOf('--entry', path.join(ROOT, 'app', 'dist-offline', 'index.html'))).replace(/\\/g, '/')
const OUT = path.join(HERE, 'probe')
const ONLY = argOf('--conv', null)
const CONVS = ONLY ? [ONLY] : ['sc-combo', 'sc-s1', 'sc-s5', 'sc-s2', 'sc-s3', 'sc-s4', 'sc-s6']
fs.mkdirSync(OUT, { recursive: true })

const PROBE = `(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const cards = Array.from(document.querySelectorAll('[data-showcase-card]')).map(c => c.getAttribute('data-showcase-card'));
  return {
    text: (document.body.innerText || '').replace(/\\n{3,}/g, '\\n\\n'),
    imgs: imgs.length,
    broken: imgs.filter(i => !i.complete || i.naturalWidth === 0).length,
    imgSrc: imgs.map(i => (i.getAttribute('src') || '').slice(0, 30)),
    cards,
    opts: Array.from(document.querySelectorAll('.ssc-opt')).map(b => b.textContent.trim().slice(0, 26)),
    actions: Array.from(document.querySelectorAll('.ssc-btn, .ssc-link')).map(b => b.textContent.trim()),
    scrollW: document.documentElement.scrollWidth,
  };
})()`

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, offline: true })
const page = await ctx.newPage()
const reqs = []
const errs = []
const cons = []
page.on('request', (r) => { if (/^(https?|wss?):/.test(r.url())) reqs.push(r.url()) })
page.on('pageerror', (e) => errs.push(String(e).slice(0, 220)))
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') cons.push(`${m.type()}:${m.text().slice(0, 140)}`) })

await page.goto(ENTRY, { waitUntil: 'load' })
await page.waitForTimeout(1400)
await page.selectOption('#preferred-role', 'student')
await page.fill('#auth-phone', '13800001001')
await page.getByRole('button', { name: '获取验证码' }).click()
await page.waitForTimeout(900)
await page.getByPlaceholder('6 位验证码').fill('246810')
await page.getByRole('button', { name: '安全登录' }).click()
await page.waitForTimeout(2000)

const out = {}
for (const cid of CONVS) {
  await page.evaluate((r) => { location.hash = '#' + r }, `/dialog/${cid}`)
  await page.waitForTimeout(2200)
  const info = await page.evaluate(PROBE)
  await page.screenshot({ path: path.join(OUT, `${cid}.png`) })
  out[cid] = info
  console.log(`--- ${cid} imgs=${info.imgs} broken=${info.broken} cards=${JSON.stringify(info.cards)} scrollW=${info.scrollW}`)
  console.log('    text:', info.text.replace(/\n+/g, ' | ').slice(0, 260))
  if (info.opts.length) console.log('    opts:', info.opts.join(' / '))
  if (info.actions.length) console.log('    actions:', info.actions.join(' / '))
}

console.log('\nhttp requests:', reqs.length, reqs.slice(0, 5))
console.log('page errors:', errs.slice(0, 5))
console.log('console:', cons.slice(0, 6))
fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify({ convs: out, http: reqs, errors: errs, console: cons }, null, 1))
await browser.close()
