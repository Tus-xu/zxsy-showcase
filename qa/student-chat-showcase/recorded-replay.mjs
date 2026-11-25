// Run with: node qa/student-chat-showcase/recorded-replay.mjs <offline-html> <evidence-directory>
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
const results = { browser: browser.version(), network: [], errors: [], cases: {}, stop: false, unknownPhotoRejected: false }
await fs.mkdir(output, { recursive: true })

const hanText = (raw) => (raw.match(/\p{Script=Han}/gu) || []).join('')
const reply = (page) => page.locator('.msg-row.ai').last().locator('.ai-bubble')

function recordedText(sse) {
  return sse.split(/\n\n+/).filter((block) => block.startsWith('event: token\n'))
    .map((block) => JSON.parse(block.split('\n').find((line) => line.startsWith('data: ')).slice(6)).text)
    .join('')
}

async function withStudent(scenario) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    offline: true,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  })
  try {
    const page = await context.newPage()
    page.setDefaultTimeout(8000)
    page.on('pageerror', (error) => results.errors.push(error.message))
    page.on('request', (request) => {
      if (/^(https?|wss?):/.test(request.url())) results.network.push(new URL(request.url()).origin)
    })
    page.on('websocket', (socket) => results.network.push(new URL(socket.url()).origin))
    await page.goto(pathToFileURL(entryFile).href)
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

async function choosePhoto(page, file) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '拍一道不会的题' }).click()
  await (await chooser).setFiles(file)
}

async function sendText(page, text) {
  await page.locator('.ci-ta').fill(text)
  await page.locator('.ci-ta').press('Enter')
  await expect(page.locator('.ci-send')).toBeDisabled()
}

async function submitCapturedInput(page, request, step, result) {
  const interaction = request.context?.tutor_interaction
  if (step === 0) {
    await page.locator('.ci-send').click()
  } else if (request.context?.tutor_action === 'skip') {
    await page.getByRole('button', { name: request.message, exact: true }).last().click()
  } else if (interaction?.form === 'expr_input') {
    const card = page.locator('.msg-row.ai .ix-ei').last()
    await card.locator('.ix-ei-input').fill(interaction.payload.latex)
    await card.getByRole('button', { name: '写好了' }).click()
  } else if (interaction?.form === 'cloze') {
    const card = page.locator('.msg-row.ai .ix-cloze').last()
    const blank = card.locator('.ix-cz-blank')
    const submit = card.getByRole('button', { name: '填好了' })
    await blank.click()
    await card.locator('.ix-cz-opt').filter({ hasNotText: /^=$/ }).first().click()
    await submit.click()
    await expect(reply(page)).toContainText('这次输入没有对应的录制讲解')
    await expect(page.locator('.ci-stop')).toHaveCount(0)
    await blank.click()
    await card.getByRole('button', { name: '=', exact: true }).click()
    await submit.click()
    result.rejectedCardCanRetry = true
  } else {
    await sendText(page, request.message)
  }
}

try {
  for (const [index, name] of ['A', 'B', 'C'].entries()) {
    const fixture = JSON.parse(await fs.readFile(path.join(root, 'app/src/offline/fixtures/student', 'flow-' + name + '.run03.json'), 'utf8'))
    const result = results.cases[name] = { matched: 0, total: fixture.turns.length, unmatchedPreserved: false, photoRestored: false, endsHonestly: false }
    await withStudent(async (page) => {
      await choosePhoto(page, path.join(root, 'release', '素材', '题' + (index + 1) + '.png'))
      await expect(page.locator('.att-card.ready')).toBeVisible({ timeout: 8000 })
      for (const [step, turn] of fixture.turns.entries()) {
        const request = typeof turn.req === 'string' ? JSON.parse(turn.req) : turn.req
        await submitCapturedInput(page, request, step, result)
        await expect(page.locator('.ci-send')).toBeDisabled()
        const expected = hanText(recordedText(turn.sse)).slice(0, 21)
        assert.ok(expected, name + ' expected text for step ' + (step + 1))
        await expect.poll(async () => hanText(await reply(page).innerText())).toContain(expected)
        result.matched += 1

        if (step === 0) {
          await page.reload()
          const photo = page.locator('.ub-atts .att-img').first()
          await photo.scrollIntoViewIfNeeded()
          await expect.poll(() => photo.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
          result.photoRestored = true
          await sendText(page, '黎曼曲率张量怎么计算？')
          await expect(reply(page)).toContainText('这次输入没有对应的录制讲解')
          result.unmatchedPreserved = true
        }
      }
      await expect(reply(page)).not.toContainText('支持强度')
      await page.screenshot({ path: path.join(output, 'recorded-' + name + '.png'), animations: 'disabled' })
      await sendText(page, '可以再讲一次吗？')
      await expect(reply(page)).toContainText('这道题的录制讲解到这里结束')
      result.endsHonestly = true
    })
    console.log(name, result)
  }

  await withStudent(async (page) => {
    const newImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC9kAAAAASUVORK5CYII=', 'base64')
    await choosePhoto(page, { name: '题1.png', mimeType: 'image/png', buffer: newImage })
    await expect(page.locator('.att-card.failed')).toContainText('离线体验暂未收录这份附件')
    await expect(page.locator('.ci-send')).toBeDisabled()
    results.unknownPhotoRejected = true
    await page.getByTitle('移除').click()

    await choosePhoto(page, path.join(root, 'release', '素材', '题1.png'))
    await expect(page.locator('.att-card.ready')).toBeVisible()
    await page.locator('.ci-send').click()
    await page.getByTitle('停止回复').click()
    await expect(reply(page)).toContainText('已停止回复')
    await expect(page.locator('.ci-send')).toBeDisabled()
    results.stop = true
  })
  assert.deepEqual(results.network, [])
  assert.deepEqual(results.errors, [])
  console.log('PASS A/B/C, unknown attachment, and stop')
} finally {
  await fs.writeFile(path.join(output, 'recorded.json'), JSON.stringify(results, null, 2))
  await browser.close()
}
