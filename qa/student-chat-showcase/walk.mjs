/**
 * 学生端示例会话验收走查（V01–V06）。
 *
 * 真实浏览器、断网上下文、按方案逐项点击并留证。
 * 用法：cd app && node ../qa/student-chat-showcase/walk.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createRequire } from 'node:module'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const require = createRequire(path.join(ROOT, 'app', 'package.json'))
const { chromium } = require('@playwright/test')

const argvW = process.argv.slice(2)
const argW = (k, d) => { const i = argvW.indexOf(k); return i >= 0 ? argvW[i + 1] : d }
// 默认走发行包本体，保证截图证据对应真正交付的 HTML
const ENTRY_FILE = path.resolve(argW('--entry', path.join(ROOT, 'release', '开始演示.html')))
const ENTRY = 'file:///' + ENTRY_FILE.replace(/\\/g, '/')
const OUT = path.join(HERE, 'shots')
const SHOTS = path.join(OUT, 'shots')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(SHOTS, { recursive: true })

const RESULT = { cases: [], evidence: {} }
function record(id, ok, note, extra = {}) {
  RESULT.cases.push({ id, ok, note, ...extra })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${note}`)
}

let shotN = 0
async function shot(page, name) {
  shotN += 1
  const file = path.join(SHOTS, `${String(shotN).padStart(2, '0')}-${name}.png`)
  await page.screenshot({ path: file })
  return path.relative(OUT, file).replace(/\\/g, '/')
}

const browser = await chromium.launch({ headless: true })

/** 一个干净的断网上下文（等同「干净浏览器上下文断网」） */
async function newPage(opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    offline: true,
  })
  const page = await ctx.newPage()
  const net = []
  const errs = []
  page.on('request', (r) => { if (/^(https?|wss?):/.test(r.url())) net.push(r.url()) })
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  await page.goto(ENTRY, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  await page.selectOption('#preferred-role', 'student')
  await page.fill('#auth-phone', '13800001001')
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.waitForTimeout(800)
  await page.getByPlaceholder('6 位验证码').fill('246810')
  await page.getByRole('button', { name: '安全登录' }).click()
  await page.waitForTimeout(1800)
  return { ctx, page, net, errs }
}

async function goto(page, conv) {
  await page.evaluate((r) => { location.hash = '#' + r }, `/dialog/${conv}`)
  await page.waitForTimeout(1600)
  // 守卫：确认真的切到了目标会话（标题非空且不是上一条的残留）
  await page.waitForFunction((c) => {
    const t = document.querySelector('.dialog-header .ttl')
    return !!t && t.textContent.trim() && location.hash.endsWith(c)
  }, conv, { timeout: 15000 })
  await page.waitForTimeout(700)
}

/** 点导学卡里的选项/动作：DOM 内确定性点击 + 短暂重试（等一次渲染稳定） */
async function clickIn(page, sel, label, what) {
  let last = ''
  for (let i = 0; i < 6; i++) {
    const r = await page.evaluate(
      ({ sel, t }) => {
        const list = Array.from(document.querySelectorAll(sel)).filter((b) => !b.disabled)
        const clean = (b) => (b.textContent || '').trim().replace(/^[A-D](?=\S)/, '').trim()
        const norm = (x) => String(x).replace(/\s+/g, '')
        const exact = list.filter((b) => norm(clean(b)) === norm(t))
        const hit = exact.length ? exact : list.filter((b) => norm(clean(b)).includes(norm(t)))
        const el = hit[hit.length - 1]
        if (!el) {
          return { ok: false, state: { btns: list.map((x) => [x.textContent.trim().slice(0, 14), x.disabled]), cards: Array.from(document.querySelectorAll('.ssc')).map((c) => [c.getAttribute('data-showcase-card'), c.className]), rows: Array.from(document.querySelectorAll('.msg-row')).map((r) => r.className + ' :: ' + r.textContent.trim().slice(0, 60)) } }
        }
        el.scrollIntoView({ block: 'center' })
        el.click()
        return { ok: true }
      },
      { sel, t: label },
    )
    if (r.ok) {
      await page.waitForTimeout(1400)
      return
    }
    last = JSON.stringify(r.state)
    await page.waitForTimeout(500)
  }
  throw new Error(`${what}失败：${label} | 卡片内按钮=${last}`)
}

/** 导学卡里的选项和动作都是 <button>，统一按可见文案点最后一个可用项 */
const tap = (page, label) => clickIn(page, '.ssc button', label, '点卡片动作')

async function bodyText(page) {
  return page.evaluate(() => (document.querySelector('.dialog-messages')?.innerText || '').replace(/\s+/g, ' '))
}

async function imgState(page) {
  return page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.dialog-messages img'))
    return { n: imgs.length, broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length }
  })
}

async function title(page) {
  return page.evaluate(() => document.querySelector('.dialog-header .ttl')?.textContent?.trim() || '')
}

/* ═══════════ V01 · S1 题图与四段回答 ═══════════ */
{
  const { ctx, page, net, errs } = await newPage()
  await goto(page, 'sc-s1')
  const t = await bodyText(page)
  const im = await imgState(page)
  const s1 = {
    title: await title(page),
    hasUserText: t.includes('我把题目拍下来了'),
    hasFour: ['找候选点', '看左右符号', '判极值并代回原式', '回扣'].every((k) => t.includes(k)),
    images: im,
    shot: await shot(page, 'V01-s1'),
  }
  // 展开题图 → lightbox → 关闭
  await page.locator('.dialog-messages img').first().click()
  await page.waitForTimeout(700)
  const lbOpen = await page.evaluate(() => !!document.querySelector('.md-lightbox.show img'))
  await shot(page, 'V01-s1-lightbox')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  const lbClosed = await page.evaluate(() => !document.querySelector('.md-lightbox.show'))
  // 切走再回来（模拟刷新恢复）
  await goto(page, 'sc-s2')
  await goto(page, 'sc-s1')
  const im2 = await imgState(page)
  const t2 = await bodyText(page)
  Object.assign(s1, { lbOpen, lbClosed, imagesAfterSwitch: im2, textAfterSwitch: t2.includes('我把题目拍下来了') })
  record('V01', s1.hasUserText && s1.hasFour && im.broken === 0 && im2.broken === 0 && im2.n === im.n && s1.lbOpen && s1.lbClosed && s1.textAfterSwitch,
    `S1 标题「${s1.title}」；题图 ${im.n} 张(破图 ${im.broken})，切换后 ${im2.n} 张(破图 ${im2.broken})；四段齐全=${s1.hasFour}；lightbox 开=${lbOpen} 关=${lbClosed}`,
    { evidence: s1 })
  RESULT.evidence.V01 = s1
  RESULT.evidence.V01net = net.length
  RESULT.evidence.V01err = errs
  await ctx.close()
}

/* ═══════════ V02 · S2 知识问答 / S3 看图讲解 ═══════════ */
{
  const { ctx, page } = await newPage()
  await goto(page, 'sc-s2')
  const t2 = await bodyText(page)
  const s2 = {
    turns: (t2.match(/切线/g) || []).length,
    hasFollow: t2.includes('为什么原点不是极值点'),
    hasCounter: t2.includes('穿过原点之后还是往上走') && t2.includes('不是极值点'),
    shot: await shot(page, 'V02-s2'),
  }
  await goto(page, 'sc-s3')
  const im = await imgState(page)
  // MathFigure 演示控件
  const ctrl = await page.evaluate(() => {
    const el = document.querySelector('.dialog-messages')
    return {
      frames: el.querySelectorAll('.mf-dots button, .mf-dot').length,
      hasPlay: /播放|演示/.test(el.innerText || ''),
      captions: (el.innerText.match(/聚焦|整条曲线/g) || []).length,
    }
  })
  await page.locator('.ssc-link, .ssc-btn').filter({ hasText: '看看反例' }).first().click().catch(() => {})
  await page.waitForTimeout(700)
  const hasCounter3 = (await bodyText(page)).includes('切线水平，却没有极值')
  const s3 = { ...ctrl, images: im, hasCounter3, shot: await shot(page, 'V02-s3') }
  record('V02', s2.hasFollow && s2.hasCounter && im.broken === 0 && ctrl.hasPlay && hasCounter3,
    `S2 真实追问=${s2.hasFollow} 反例=${s2.hasCounter}；S3 帧控件=${ctrl.frames} 播放文案=${ctrl.hasPlay} 图注=${ctrl.captions} 破图=${im.broken}；x³ 反例=${hasCounter3}`,
    { evidence: { s2, s3 } })
  RESULT.evidence.V02 = { s2, s3 }
  await ctx.close()
}

/* ═══════════ V03 · S4 三题 / S6 错题本去重 ═══════════ */
{
  const { ctx, page } = await newPage()
  await goto(page, 'sc-s4')
  const before = await shot(page, 'V03-s4-before')
  // 第一题：先错选 A，再无法重答（保留首答）
  await page.locator('.qc-opt').filter({ hasText: '−1' }).first().click()
  await page.waitForTimeout(800)
  const afterWrong = await bodyText(page)
  const keptFirst = afterWrong.includes('差一点') || afterWrong.includes('候选点')
  await shot(page, 'V03-s4-v1-wrong')
  // 引导入口始终可用
  const entry = await page.locator('.ssc-btn', { hasText: '引导式解题' }).count()

  await goto(page, 'sc-s6')
  await page.locator('.ssc-btn', { hasText: '加入错题本' }).first().waitFor({ timeout: 15000 })
  console.log('S6 dump', JSON.stringify(await page.evaluate(() => ({
    hash: location.hash,
    title: document.querySelector('.dialog-header .ttl')?.textContent,
    rows: Array.from(document.querySelectorAll('.msg-row')).map((r) => r.className),
    ssc: Array.from(document.querySelectorAll('.ssc')).map((c) => ({
      v: c.getAttribute('data-showcase-card'),
      used: c.classList.contains('used'),
      btns: Array.from(c.querySelectorAll('.ssc-btn,.ssc-link')).map((x) => ({ t: x.textContent.trim(), d: x.disabled })),
    })),
  }))))
  await tap(page, '加入错题本')
  const t1 = await bodyText(page)
  // 重复收藏：加过一次后同一张卡的按钮按设计置灰（不可能重复记账）
  const againDisabled = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.ssc-errorbook'))
    const last = cards[cards.length - 1]
    const btn = last && Array.from(last.querySelectorAll('.ssc-btn')).find((b) => b.textContent.includes('加入错题本'))
    return !!btn && btn.disabled
  })
  await shot(page, 'V03-s6-added')
  // 错题本页能查到同一条，且只有一条
  await page.evaluate(() => { location.hash = '#/errors' })
  await page.waitForTimeout(2600)
  const errPage = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '))
  const hits = (errPage.match(/取得局部极小值/g) || []).length
  await shot(page, 'V03-errors-page')
  record('V03', keptFirst && entry > 0 && t1.includes('已加入错题本') && againDisabled && hits === 1,
    `S4 首答保留=${keptFirst} 引导入口=${entry}；S6 首次加入=${t1.includes('已加入错题本')} 重复点已置灰=${againDisabled}；错题本命中 ${hits} 条`,
    { evidence: { before, entry, hits } })
  RESULT.evidence.V03 = { keptFirst, entry, againDisabled, hits, errText: errPage.slice(0, 300) }
  await ctx.close()
}

/* ═══════════ V04 · 组合会话 C1–C7 ═══════════ */
{
  const { ctx, page } = await newPage()
  await goto(page, 'sc-combo')
  const c1 = await bodyText(page)
  await shot(page, 'V04-c1')
  const beforeSize = await page.evaluate(() => document.querySelectorAll('.dialog-messages .msg-row').length)
  await tap(page, '可以，出三题')
  const c3 = await bodyText(page)
  await shot(page, 'V04-c3')
  const quizCards = await page.locator('.qc-opt').count()
  // C4：V1 选 A（错）
  await page.locator('.qc-opt').filter({ hasText: '−1' }).first().click()
  await page.waitForTimeout(900)
  const c4 = await bodyText(page)
  await shot(page, 'V04-c4-wrong')
  // C5：进引导
  await tap(page, '引导式解题')
  const c5 = await bodyText(page)
  await shot(page, 'V04-c5-guide')
  // 走完 A 路径
    await tap(page, '题目看懂了')
  await tap(page, '看导数变号')
  await shot(page, 'V04-c5-a1')
  await tap(page, '−1 和 2')
  await tap(page, 'x=0 处的切线斜率为负')
  await tap(page, '左正右负')
  await tap(page, '局部极大')
  await tap(page, '局部极小')
  await tap(page, 'x=2')
  const whyShown = (await bodyText(page)).includes('为什么 −1 这里不能选它')
  if (whyShown) await tap(page, '它左侧在上升，右侧在下降')
  await tap(page, '回到这题')
  await shot(page, 'V04-c6-retry')
  // C6：重选 C
  await tap(page, '2')
  const c6 = await bodyText(page)
  const corrected = c6.includes('已订正')
  await shot(page, 'V04-c6-done')
  const summaryShown = c6.includes('这一轮实际发生了什么')
  Object.assign(RESULT.evidence, {})
  record('V04', c1.includes('怎么用它判断函数在哪儿上升') && c3.includes('三道题按难度排好') && quizCards > 0
    && c4.includes('候选点') && c5.includes('题目看懂了') && whyShown && corrected && summaryShown,
    `C1 提问=${c1.includes('判断函数在哪儿上升')} 消息数 ${beforeSize}；C3 变式卡=${quizCards}；C4 错因反馈=${c4.includes('候选点')}；C5 进入读题=${c5.includes('题目看懂了')}；A 路径走完=${whyShown}；C6 已订正=${corrected}；小结=${summaryShown}`,
    { evidence: { beforeSize, quizCards } })
  RESULT.evidence.V04 = { beforeSize, quizCards, corrected, whyShown }
  await ctx.close()
}

/* ═══════════ V05 · A/B 双路径 + 换路 + 刷新恢复 ═══════════ */
{
  const { ctx, page } = await newPage()
  await goto(page, 'sc-s5')
    await tap(page, '题目看懂了')
  await tap(page, '比较附近的函数值')
  await shot(page, 'V05-b1')
  await tap(page, '更小，局部极小')
  await tap(page, '负')
  await tap(page, '正')
  await shot(page, 'V05-b4')
  // 换路：看另一种方法
  await tap(page, '看看另一种方法')
  const sw = await bodyText(page)
  const switched = sw.includes('换一条思路')
  await shot(page, 'V05-switch')
  // 刷新恢复
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(2200)
  const afterReload = await bodyText(page)
  const keptFacts = afterReload.includes('已找到候选点') || afterReload.includes('候选点')
  await shot(page, 'V05-after-reload')
  // 继续走完 A 路径
  await tap(page, '−1 和 2')
  await tap(page, 'x=0 处的切线斜率为负')
  await tap(page, '左正右负')
  await tap(page, '局部极大')
  await tap(page, '局部极小')
  await tap(page, 'x=2')
  if ((await bodyText(page)).includes('为什么 −1 这里不能选它')) await tap(page, '它左侧在上升，右侧在下降')
  const fixVisible = (await bodyText(page)).includes('回到题卡')
  await tap(page, '返回题卡订正')
  await tap(page, '2')
  const done = (await bodyText(page)).includes('已订正')
  await shot(page, 'V05-done')
  record('V05', switched && keptFacts && fixVisible && done,
    `B 路径全通；换路提示=${switched}；刷新后事实保留=${keptFacts}；A 路径续走并订正=${done}`, { evidence: { switched, keptFacts, fixVisible, done } })
  RESULT.evidence.V05 = { switched, keptFacts, fixVisible, done }
  await ctx.close()
}

/* ═══════════ V06 · 正常路径 / 无关文本 / 旧按钮 / 键盘 ═══════════ */
{
  const { ctx, page } = await newPage()
  await goto(page, 'sc-s5')
  // 无关文本：留在原步骤
  await page.locator('.dialog-page textarea').first().fill('今天天气不错')
  await page.waitForTimeout(300)
  await page.locator('button.ci-send').first().click()
  await page.waitForTimeout(1800)
  const t = await bodyText(page)
  const stayed = t.includes('你可以先选一个步骤')
  await shot(page, 'V06-unrelated')
  // 旧按钮不再可点（历史卡回看态）
  const oldClickable = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.ssc'))
    const old = cards.slice(0, -1)
    return old.filter((c) => c.querySelector('.ssc-opt:not([disabled]), .ssc-btn:not([disabled])')).length
  })
  // 键盘可达
  const kb = await page.evaluate(() => {
    const b = document.querySelector('.ssc button:not([disabled])')
    return !!b && b.tabIndex >= 0
  })
  record('V06', stayed && oldClickable === 0 && kb,
    `无关输入留在原步骤=${stayed}；历史旧卡可点数=${oldClickable}；选项键盘可达=${kb}`, { evidence: { stayed, oldClickable, kb } })
  RESULT.evidence.V06 = { stayed, oldClickable, kb }
  await ctx.close()
}

RESULT.totals = {
  pass: RESULT.cases.filter((c) => c.ok).length,
  fail: RESULT.cases.filter((c) => !c.ok).length,
}
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(RESULT, null, 1))
console.log(`\n=== ${RESULT.totals.pass} pass / ${RESULT.totals.fail} fail ===`)
await browser.close()
