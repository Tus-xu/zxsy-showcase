/** 引导解题的会话初始化：上传成功后写入首轮消息，供首页上传入口与引导页共用。 */
export function initGuidanceSession(cs, sess, fileName) {
  sess.uploaded = true
  sess.fileName = fileName
  sess.startedAt = Date.now()
  sess.stepIndex = 0
  sess.finished = false
  sess.selected = []
  sess.wrongCount = 0
  sess.helpCount = 0
  sess.variantIndex = -1
  sess.lastHint = null
  sess.messages = []
  const t = nowText()
  sess.messages.push({ role: 'student', text: `【上传题目】${fileName}`, time: t })
  sess.messages.push({
    role: 'ai',
    text: `我收到了这道题（${cs.code} · 第 ${cs.printedNumber} 题）。先把它识别成文字，和你确认一下题面。`,
    time: t,
  })
  sess.messages.push({ role: 'ai', kind: 'ocr', text: cs.ocrText, time: t })
  for (const line of cs.opening) sess.messages.push({ role: 'ai', text: line, time: t })
  sess.messages.push({ role: 'ai', text: cs.steps[0].ask, time: t })
}

export function nowText() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
