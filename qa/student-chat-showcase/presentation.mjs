// Run with: node qa/student-chat-showcase/presentation.mjs <offline-html> <evidence-directory>
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const [entryFile, output] = process.argv.slice(2)
if (!entryFile || !output) throw new Error('Supply the offline HTML and an evidence directory.')

const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(path.join(root, 'app', 'package.json'))
const { chromium, expect } = require('@playwright/test')
const browser = await chromium.launch({ channel: process.env.SHOWCASE_BROWSER || 'chrome', headless: true })
const entry = pathToFileURL(entryFile).href
const report = { browser: browser.version(), checks: [], layout: {}, network: [], pageErrors: [], consoleErrors: [] }
await fs.mkdir(output, { recursive: true })

async function withStudent(options, scenario) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    offline: true,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    ...options,
  })
  try {
    const page = await context.newPage()
    page.setDefaultTimeout(8000)
    page.on('request', (request) => {
      if (/^(https?|wss?):/.test(request.url())) report.network.push(new URL(request.url()).origin)
    })
    page.on('websocket', (socket) => { report.network.push(new URL(socket.url()).origin) })
    page.on('pageerror', (error) => { report.pageErrors.push(error.message) })
    page.on('console', (event) => { if (event.type() === 'error') report.consoleErrors.push(event.text().slice(0, 170)) })
    await page.goto(entry)
    await page.selectOption('#preferred-role', 'student')
    await page.fill('#auth-phone', '13800001001')
    await page.getByRole('button', { name: '获取验证码' }).click()
    await page.getByPlaceholder('6 位验证码').fill('246810')
    await page.getByRole('button', { name: '安全登录' }).click()
    await expect(page.locator('.dialog-header h1')).toHaveText('新对话')
    await scenario(page)
  } finally {
    await context.close()
  }
}

const assistant = (page) => page.locator('.msg-row.ai')
const composer = (page) => page.getByRole('textbox', { name: '输入数学问题' })
const send = (page) => page.locator('.ci-send')
const choice = (page, label) => page.locator('.ssc button:enabled').getByText(label, { exact: true }).last()
const scrollDistance = (page) => page.locator('.dialog-messages').evaluate(
  (el) => Math.round(el.scrollHeight - el.scrollTop - el.clientHeight),
)

async function open(page, title, id) {
  await page.locator('.cs-item-title').getByText(title, { exact: true }).click()
  await page.waitForURL((current) => current.hash.endsWith('/' + id))
  await expect(page.locator('.dialog-header h1')).toHaveText(title)
  await expect(assistant(page).last()).toBeVisible()
}

async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' })
}

async function measure(page, name) {
  await expect(page.locator('.ambient')).toBeVisible()
  for (const layer of ['.dialog-main', '.dialog-header', '.dialog-dock']) {
    await expect(page.locator(layer)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  }
  const sizes = await page.evaluate(() => {
    const list = document.querySelector('.dialog-messages')
    const box = document.querySelector('.ci-box').getBoundingClientRect()
    const reading = document.querySelector('.dialog-thread')?.getBoundingClientRect()
    return {
      box: Math.round(box.width),
      editor: Math.round(document.querySelector('.ci-ta').getBoundingClientRect().height),
      column: Math.round(reading?.width || 0),
      leftGap: Math.round(reading ? box.left - reading.left : 0),
      rightGap: Math.round(reading ? box.right - reading.right : 0),
      listBottom: Math.round(list.getBoundingClientRect().bottom),
      boxTop: Math.round(box.top),
      overflow: Math.max(document.documentElement.scrollWidth - innerWidth, list.scrollWidth - list.clientWidth),
    }
  })
  report.layout[name] = sizes
  assert.ok(sizes.editor >= 44, name + ' editor height')
  assert.ok(sizes.overflow <= 1, name + ' horizontal overflow')
  assert.ok(sizes.listBottom <= sizes.boxTop, name + ' dock covers messages')
  if (sizes.column) {
    assert.ok(Math.abs(sizes.leftGap) <= 12 && Math.abs(sizes.rightGap) <= 12, name + ' composer alignment')
  }
}

async function submit(page, message) {
  await composer(page).fill(message)
  await composer(page).press('Enter')
  await expect(send(page)).toBeDisabled()
}

try {
  await withStudent({}, async (page) => {
    await expect(send(page)).toBeDisabled()
    await expect(page.getByRole('button', { name: '拍一道不会的题' })).toBeVisible()
    await expect(page.getByRole('button', { name: '引用知识库资料' })).toBeVisible()
    await expect(page.getByText('学习进度', { exact: true })).toBeVisible()
    await measure(page, 'home-1440')
    await shot(page, '01-home')
    await page.getByRole('button', { name: '引用知识库资料' }).click()
    const picker = page.getByRole('dialog', { name: '引用知识库资料' })
    await picker.locator('.kb-picker__item').first().click()
    await picker.getByRole('button', { name: '关闭' }).click()
    await expect(page.locator('.ci-kb-chip')).toHaveCount(1)
    await page.getByRole('button', { name: '移除引用' }).click()
    await expect(page.locator('.ci-kb-chip')).toHaveCount(0)
    await page.getByText('离线体验', { exact: true }).press('Enter')
    await expect(page.getByText('这里提供预设练习和已录制的讲解。', { exact: false })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('这里提供预设练习和已录制的讲解。', { exact: false })).toBeHidden()
    const suggestions = page.getByRole('button', { name: '提问建议' })
    await suggestions.press('Enter')
    assert.ok((await page.locator('.sugg-grid').boundingBox()).height <= 86)
    await page.keyboard.press('Escape')
    await expect(page.locator('.sugg-grid')).toBeHidden()
    await composer(page).fill('公式草稿')
    await composer(page).press('Shift+Enter')
    await expect(composer(page)).toHaveValue('公式草稿\n')
    await composer(page).dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true })
    await expect(composer(page)).toHaveValue('公式草稿\n')
    await composer(page).fill('')
    report.checks.push('空会话、原有背景、知识库引用、离线说明、建议收起和中文输入')

    await suggestions.press('Enter')
    await page.getByRole('button', { name: '从提问到订正，学一遍导数' }).click()
    await page.waitForURL((current) => current.hash.endsWith('/sc-combo'))
    await choice(page, '先不练').click()
    await expect(assistant(page).last()).toContainText('想练的时候再说一声')
    await expect(choice(page, '可以，出三题')).toBeEnabled()
    report.checks.push('跳过建议后保留继续练习入口')

    await open(page, '知识问答 · 导数的几何意义', 'sc-s2')
    await expect(page.locator('.katex-display').first()).toBeVisible()
    await expect(page.locator('.dialog-messages .aigc-mark')).toHaveCount(0)
    await measure(page, 'qa-1440')
    await shot(page, '02-qa-1440')
    const source = page.locator('.src-toggle').last()
    await source.press('Enter')
    await expect(source).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('.src-snippet').last()).toBeVisible()
    await source.press('Enter')
    await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = 0 })
    await expect(page.getByRole('button', { name: '回到最新' })).toBeVisible()
    await shot(page, '03-qa-formula')
    await page.getByRole('button', { name: '回到最新' }).click()
    await expect.poll(() => scrollDistance(page)).toBeLessThanOrEqual(1)
    await page.getByRole('button', { name: '在曲线上看导数与极值' }).click()
    await page.waitForURL((current) => current.hash.endsWith('/sc-s3'))
    const figure = page.locator('.math-figure').first()
    const dots = figure.locator('.mf-dot')
    const figureImage = figure.locator('.mf-img')
    await expect(dots).toHaveCount(3)
    await figure.getByTitle('从头播放').click()
    for (let index = 0; index < 3; index += 1) {
      const dot = dots.nth(index)
      await expect(dot).toHaveClass(/on/)
      await expect(figureImage).toHaveAttribute('alt', await dot.getAttribute('aria-label'))
      await figureImage.screenshot({ path: path.join(output, 'figure-frame-' + (index + 1) + '.png'), animations: 'disabled' })
    }
    await dots.nth(1).click()
    await expect(dots.nth(1)).toHaveClass(/on/)
    await page.getByRole('button', { name: '看看反例' }).click()
    await expect(page.locator('.ssc-reveal-text')).toBeVisible()
    await page.locator('.mf-dots').scrollIntoViewIfNeeded()
    await shot(page, '08-figure')
    report.checks.push('数学排版、来源键盘展开、回到最新、图形帧和反例')

    await open(page, '拍照解题 · 双曲线离心率', 'sc-s1')
    const photo = page.locator('.ub-atts .att-img')
    await photo.scrollIntoViewIfNeeded()
    await expect.poll(() => photo.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
    await page.locator('.dialog-messages').evaluate((el) => { el.scrollTop = 0 })
    await shot(page, '04-photo-top')
    await photo.click()
    await expect(page.locator('.md-lightbox.show')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.md-lightbox.show')).toBeHidden()
    report.checks.push('题图加载、看原图和关闭')

    await open(page, '引导式解题 · 双曲线离心率', 'sc-s5')
    await expect(assistant(page).last()).toContainText('先别急着定选项')
    await measure(page, 'guide-1440')
    await shot(page, '05-guide')
    // 键盘选择分支（当前卡是 live 的最后一条 AI 消息）
    await expect(choice(page, '√7 是 b/a，离心率是 c/a')).toBeEnabled()
    await choice(page, '√7 是 b/a，离心率是 c/a').click()
    await expect(assistant(page).last()).toContainText('2√2')
    await page.waitForTimeout(2400)
    await shot(page, '06-branch')
    // 超出范围：给具体边界，不推进；刷新后输入仍在
    await submit(page, '黎曼曲率张量怎么计算？')
    await expect(assistant(page).last()).toContainText(/超出了当前示例的范围|没有对应的练习动作/)
    await shot(page, '07-unsupported')
    await page.reload()
    await expect(page.getByText('黎曼曲率张量怎么计算？', { exact: true })).toBeVisible()
    report.checks.push('键盘继续纠错、超出范围不推进、刷新保留输入')
  })

  for (const viewport of [{ width: 1906, height: 1035 }, { width: 720, height: 450 }]) {
    await withStudent({ viewport, reducedMotion: 'reduce' }, async (page) => {
      await open(page, '引导式解题 · 双曲线离心率', 'sc-s5')
      await expect(choice(page, '√7 是 b/a，离心率是 c/a')).toBeVisible()
      await measure(page, 'guide-' + viewport.width)
      await expect.poll(() => scrollDistance(page)).toBeLessThanOrEqual(1)
      await choice(page, '√7 是 b/a，离心率是 c/a').scrollIntoViewIfNeeded()
      const active = await choice(page, '√7 是 b/a，离心率是 c/a').boundingBox()
      const dock = await page.locator('.dialog-dock').boundingBox()
      assert.ok(active.y + active.height <= dock.y + 1, 'active control is above the dock')
      assert.equal(await page.locator('.dialog-page').evaluate((el) => getComputedStyle(el).animationName), 'none')
      await shot(page, '09-guide-' + viewport.width)
    })
  }
  report.checks.push('宽视口、720×450 窄视口和减弱动效')
  assert.deepEqual(report.network, [])
  assert.deepEqual(report.pageErrors, [])
  // 旧版与新版单文件启动时，MathLive 都会报告资源相对路径定位提示。
  const mathLiveWarning = 'Can\'t use relative paths to specify assets location'
  report.newConsoleErrors = report.consoleErrors.filter((message, index, all) =>
    !message.includes(mathLiveWarning)
      && !(message.startsWith('[    at ') && all[index + 1]?.includes(mathLiveWarning)),
  )
  assert.deepEqual(report.newConsoleErrors, [])
  console.log('PASS ' + report.checks.join(' / '))
} finally {
  await fs.writeFile(path.join(output, 'presentation.json'), JSON.stringify(report, null, 2))
  await browser.close()
}
