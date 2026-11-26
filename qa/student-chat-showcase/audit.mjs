/**
 * 发行包审计（V07 回归 + V08 断网），本轮用 Node Playwright 实现。
 *
 * 为什么不用 qa/release-audit/audit_release.py：本机没有 Python Playwright
 * （`pip install playwright` 不可用），按方案 §7「工具缺失时仍按这些工程步骤运行并记录替代工具」
 * 用 app/node_modules 里现成的 Playwright 复刻同样口径：逐角色逐路由访问、统计
 * http(s)/ws 请求、页面错误、破图，并对示例会话做一次真实点击。
 *
 * 用法（在 app 目录执行）：
 *   node ../qa/student-chat-showcase/audit.mjs [--entry <html>] [--out <dir>]
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createRequire } from 'node:module'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const require = createRequire(path.join(ROOT, 'app', 'package.json'))
const { chromium } = require('@playwright/test')

const argv = process.argv.slice(2)
const argOf = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : d
}
const REL = path.resolve(argOf('--entry', path.join(ROOT, 'release', '开始演示.html')))
const ENTRY = 'file:///' + REL.replace(/\\/g, '/')
const OUT = path.resolve(argOf('--out', path.join(HERE, 'audit')))
const SHOTS = path.join(OUT, 'shots')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(SHOTS, { recursive: true })

const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')

const ROUTES = {
  student: ['/dialog', '/practice', '/errors', '/library', '/resources', '/classroom', '/me'],
  teacher: ['/teacher-v3/prep', '/teacher-v3/classes', '/teacher-v3/bank', '/teacher-v3/assign',
    '/teacher-v3/insights', '/teacher-v3/resources', '/teacher-v3/grading',
    '/teacher-v3/prep-immersive/f5c84551-18a7-454d-b49c-8f115e816299'],
  researcher: ['/research-workspace', '/research-workspace/workspace',
    '/research-workspace/e49b27e2-b05f-45c3-ac99-dd0792d9ab80/read',
    '/research-workspace/e49b27e2-b05f-45c3-ac99-dd0792d9ab80/write',
    '/research-workspace/account'],
}
const PHONE = { student: '13800001001', teacher: '13800001002', researcher: '13800001003' }

const report = { entry: ENTRY, sha256: sha256(REL), bytes: fs.statSync(REL).size, routes: {}, showcase: {}, totals: {} }
const browser = await chromium.launch({ channel: process.env.SHOWCASE_BROWSER || 'chrome', headless: true })

async function login(page, role) {
  await page.selectOption('#preferred-role', role)
  await page.fill('#auth-phone', PHONE[role])
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.waitForTimeout(800)
  await page.getByPlaceholder('6 位验证码').fill('246810')
  await page.getByRole('button', { name: '安全登录' }).click()
  await page.waitForTimeout(1800)
}

const PROBE = `(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const text = (document.body.innerText || '');
  return {
    textLen: text.length,
    broken: imgs.filter(i => !i.complete || i.naturalWidth === 0).length,
    imgs: imgs.length,
    head: text.replace(/\\s+/g, ' ').slice(0, 90),
    leakedShowcase: text.includes('导数学习 · 从提问到改错') || text.includes('为什么不是极小值'),
  };
})()`

let totalHttp = 0
let totalErr = 0
for (const role of Object.keys(ROUTES)) {
  const ctx = await browser.newContext({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1, offline: true })
  const page = await ctx.newPage()
  const reqs = []
  const errs = []
  page.on('request', (r) => { if (/^(https?|wss?):/.test(r.url())) reqs.push(r.url()) })
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)))
  await page.goto(ENTRY, { waitUntil: 'load' })
  await page.waitForTimeout(1400)
  await login(page, role)
  for (const route of ROUTES[role]) {
    const before = reqs.length
    await page.evaluate((r) => { location.hash = '#' + r }, route)
    await page.waitForTimeout(3000)
    // 图片懒加载兜底：等所有 img 落定再判破图，避免把「还在加载」误判成破图
    await page.waitForFunction(() => Array.from(document.querySelectorAll('img')).every((i) => i.complete), null, { timeout: 6000 }).catch(() => {})
    const info = await page.evaluate(PROBE)
    const slug = route.replace(/\//g, '_') || 'root'
    await page.screenshot({ path: path.join(SHOTS, `${role}${slug}.png`) })
    report.routes[`${role}${route}`] = { http: reqs.length - before, ...info }
    // 其他角色页面不得出现学生示例会话
    if (role !== 'student' && info.leakedShowcase) {
      errs.push(`示例会话泄漏到 ${role} 的 ${route}`)
    }
  }
  report.routes[`${role}__errors`] = errs.slice(0, 5)
  totalHttp += reqs.length
  totalErr += errs.length
  console.log(`${role}: routes=${ROUTES[role].length} http=${reqs.length} errors=${errs.length}`)
  await ctx.close()
}

/* ── 示例会话在发行包里的真实点击（V08：断网可完成练习） ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, offline: true })
  const page = await ctx.newPage()
  const reqs = []
  const errs = []
  page.on('request', (r) => { if (/^(https?|wss?):/.test(r.url())) reqs.push(r.url()) })
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)))
  await page.goto(ENTRY, { waitUntil: 'load' })
  await page.waitForTimeout(1400)
  await login(page, 'student')
  await page.evaluate(() => { location.hash = '#/dialog/sc-s5' })
  await page.waitForTimeout(2200)
  const tap = async (label) => {
    await page.evaluate((t) => {
      const list = Array.from(document.querySelectorAll('.ssc button')).filter((b) => !b.disabled)
      const clean = (b) => (b.textContent || '').trim().replace(/^[A-D](?=\S)/, '').trim()
      const norm = (x) => String(x).replace(/\s+/g, '')
      const exact = list.filter((b) => norm(clean(b)) === norm(t))
      const hit = exact.length ? exact : list.filter((b) => norm(clean(b)).includes(norm(t)))
      const el = hit[hit.length - 1]
      if (!el) throw new Error('未找到：' + t)
      el.scrollIntoView({ block: 'center' })
      el.click()
    }, label)
    await page.waitForTimeout(1400)
  }
  // S5 已改为双曲线首答纠错链（旧三次函数步骤不再适用）
  for (const step of ['√7 是 b/a，离心率是 c/a', '2√2']) {
    await tap(step)
  }
  const body = await page.evaluate(() => (document.querySelector('.dialog-messages')?.innerText || '').replace(/\s+/g, ' '))
  await page.screenshot({ path: path.join(SHOTS, 'showcase-s5-done.png') })
  report.showcase = {
    corrected: body.includes('已订正'),
    http: reqs.length,
    errors: errs.slice(0, 5),
    broken: await page.evaluate(() => Array.from(document.querySelectorAll('.dialog-messages img')).filter((i) => !i.complete || i.naturalWidth === 0).length),
  }
  totalHttp += reqs.length
  totalErr += errs.length
  console.log(`showcase: corrected=${report.showcase.corrected} http=${reqs.length} errors=${errs.length}`)
  await ctx.close()
}

report.totals = { http_requests: totalHttp, page_errors: totalErr, routes_checked: Object.values(ROUTES).flat().length }
fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(report, null, 1))
console.log('\n=== audit summary ===')
console.log(JSON.stringify(report.totals))
console.log('entry sha256:', report.sha256)
const blocked = report.totals.http_requests > 0 || report.totals.page_errors > 0 || !report.showcase.corrected
console.log(blocked ? 'BLOCKED' : 'CLEAN')
await browser.close()
process.exit(blocked ? 1 : 0)
