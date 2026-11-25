(() => {
  const data = window.V5_DATA
  const byId = Object.fromEntries(data.scenes.map((scene) => [scene.id, scene]))
  const $ = (id) => document.getElementById(id)
  const thread = $('thread')
  const scroll = $('scroll')
  const draft = $('draft')
  const send = $('send')
  const notice = $('notice')
  const storageKey = 'zhixueshuyan-v5-design-preview'
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const announcement = document.createElement('p')
  announcement.className = 'v5-announcement'
  announcement.setAttribute('role', 'status')
  document.body.append(announcement)
  const normalize = (text) => text.normalize('NFKC').toLowerCase().replace(/[−–—]/g, '-')
    .replace(/\s+/g, '').replace(/[。!?！？;；，,]+$/g, '')

  let storageAvailable = true
  let state = { runs: {}, notebook: {} }
  try {
    const previous = JSON.parse(localStorage.getItem(storageKey))
    if (previous?.version === data.version && previous.runs && previous.notebook) state = previous
  } catch {
    storageAvailable = false
  }
  let current = byId[location.hash.slice(1)] || byId.photo
  let pending = null
  let attachment = null
  let fileSequence = 0
  let disposables = []

  function persist() {
    if (!storageAvailable) return false
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...state, version: data.version }))
      return true
    } catch {
      storageAvailable = false
      return false
    }
  }

  function newRun(scene) {
    return {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()) + '-' + Math.random().toString(36).slice(2),
      entries: [...(scene.seed ? [{ kind: 'seed', ...scene.seed }] : []), { kind: 'assistant', node: scene.start }],
      attempts: {},
      figures: {},
    }
  }

  const run = () => state.runs[current.id] ??= newRun(current)
  const latest = () => run().entries.findLast((entry) => entry.kind === 'assistant')

  function element(tag, className, text) {
    const created = document.createElement(tag)
    if (className) created.className = className
    if (text !== undefined) created.textContent = text
    return created
  }

  function math(target, latex, displayMode = false) {
    if (window.katex) window.katex.render(latex, target, { displayMode, throwOnError: false })
    else target.textContent = latex
  }

  function rich(tag, text, className) {
    const parent = element(tag, className)
    const parts = String(text || '').split(/(\\\(.+?\\\)|\*\*.+?\*\*)/s)
    for (const part of parts) {
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        const rendered = element('span')
        math(rendered, part.slice(2, -2))
        parent.append(rendered)
      } else if (part.startsWith('**') && part.endsWith('**')) {
        const emphasized = rich('strong', part.slice(2, -2))
        parent.append(emphasized)
      } else {
        parent.append(document.createTextNode(part))
      }
    }
    return parent
  }

  function button(text, action, className = 'action') {
    const control = element('button', className, text)
    control.type = 'button'
    control.addEventListener('click', action)
    return control
  }

  function setNotice(text = '') {
    notice.textContent = text
    notice.hidden = !text
  }

  function syncSend() {
    if (pending) {
      send.textContent = '停止回放'
      send.disabled = false
      return
    }
    send.textContent = '发送'
    send.disabled = latest()?.stopped || (!draft.value.trim() && !attachment)
  }

  function closeNavigation() {
    document.body.classList.remove('sidebar-open')
    $('sidebar-toggle').setAttribute('aria-expanded', 'false')
  }

  function switchScene(id, changeHash = true) {
    if (!byId[id] || current.id === id) {
      closeNavigation()
      return
    }
    haltReplay()
    fileSequence += 1
    current = byId[id]
    if (changeHash) history.replaceState(null, '', '#' + id)
    setNotice()
    closeNavigation()
    draft.value = ''
    setAttachment(null)
    render('top')
  }

  function openDialog(dialog, heading, contents) {
    const body = element('div', 'dialog-inner')
    const close = button('关闭', () => dialog.close(), 'dialog-close')
    const title = element('h2', '', heading)
    body.append(close, title, ...contents)
    dialog.replaceChildren(body)
    dialog.showModal()
  }

  function photo(attachmentId) {
    const asset = data.assets[attachmentId]
    const img = element('img')
    img.src = asset.path
    img.alt = asset.title
    const trigger = button('', () => {
      const full = img.cloneNode()
      full.className = 'photo-full'
      openDialog($('photo-dialog'), asset.title, [full])
    }, 'photo-button')
    trigger.setAttribute('aria-label', '放大' + asset.title)
    trigger.append(img)
    return trigger
  }

  function citation(id) {
    const source = data.sources[id]
    return button(source.title + ' · ' + source.section + '  ↗', () => {
      const original = element('a', 'source-original', '在新标签页查看讲义文件')
      original.href = source.path
      original.target = '_blank'
      original.rel = 'noopener noreferrer'
      openDialog($('source-dialog'), source.title, [
        element('p', 'muted', source.section),
        rich('p', source.text),
        original,
      ])
    }, 'source-button')
  }

  const causes = {
    A: '错答落在另一个导数零点。回看 −1 两侧的走势，区分峰顶与谷底。',
    B: '错答落在下降区间内。先解出两个因子的零点，再去判断变号。',
    D: '错答选了可用于验符号的测试点。把测试点与区间边界分开。',
  }

  function describe(problem, choice) {
    const value = data.problems[problem]?.options.find(([key]) => key === choice)?.[1]
    return choice + (value ? ' · ' + value : '')
  }

  function reviewFor(problem, answers) {
    if (problem === 'variants') {
      const completed = ['v1', 'v2', 'v3'].filter((id) => answers[id]?.length)
      const panel = element('div', 'review-record')
      const first = completed.filter((id) => answers[id][0].correct).length
      const last = completed.filter((id) => answers[id].at(-1).correct).length
      panel.append(element('strong', '', '本次作答记录'))
      panel.append(element('p', '', '已提交 ' + completed.length + '/3 题 · 首答正确 ' + first + '/' + completed.length + ' · 最近作答正确 ' + last + '/' + completed.length))
      for (const id of completed) {
        const history = answers[id]
        panel.append(element('p', 'muted', data.problems[id].title + ' · ' + describe(id, history[0].value) +
          (history.length > 1 ? ' → ' + describe(id, history.at(-1).value) : '')))
      }
      return panel
    }
    const history = answers[problem] ?? []
    if (!history.length) return element('p', 'empty', '本次还没有提交过这道题的答案。')
    const start = history[0]
    const end = history.at(-1)
    const wrong = history.findLast((attempt) => !attempt.correct)
    const panel = element('div', 'review-record')
    panel.append(element('strong', '', wrong && end.correct ? '已订正' : '本次作答'))
    const description = '首答 ' + describe(problem, start.value) +
      (wrong && wrong !== start && wrong !== end ? ' → 最近错答 ' + describe(problem, wrong.value) : '') +
      (history.length > 1 ? ' → 最近作答 ' + describe(problem, end.value) : '')
    panel.append(element('p', '', description))
    if (wrong && causes[wrong.value]) panel.append(element('p', 'muted', causes[wrong.value]))
    return panel
  }

  function notebook() {
    const records = Object.values(state.notebook)
    if (!records.length) {
      const empty = element('div', 'empty')
      empty.append(element('p', '', '这里还没有保存的错题。'))
      empty.append(button('打开引导与订正', () => switchScene('guide'), 'action action--primary'))
      return empty
    }
    const content = element('div')
    content.append(element('p', '', '以下记录来自你在预览中实际提交并加入错题本的作答。'))
    for (const record of records) {
      const history = { [record.problem]: record.attempts }
      const panel = reviewFor(record.problem, history)
      panel.prepend(rich('p', data.problems[record.problem].text))
      panel.append(element('p', 'muted', record.temporary ? '当前窗口的临时记录 · 刷新后无法恢复' : '已保存在此浏览器 · 原题与首答随记录保留'))
      content.append(panel)
    }
    return content
  }

  function blockFor(block, index, entryIndex) {
    switch (block.type) {
      case 'p':
        return rich('p', block.text, 'response-block')
      case 'math': {
        const div = element('div', 'math-display')
        math(div, block.latex, true)
        return div
      }
      case 'note': {
        const note = element('aside', 'note')
        if (block.label) note.append(element('strong', 'note-label', block.label))
        note.append(rich('p', block.text))
        return note
      }
      case 'table': {
        const wrap = element('div', 'table-wrap')
        const table = element('table', 'data-table')
        const head = table.createTHead().insertRow()
        for (const header of block.headers) {
          const th = rich('th', header)
          th.scope = 'col'
          head.append(th)
        }
        const body = table.createTBody()
        for (const row of block.rows) {
          const tr = body.insertRow()
          for (const [index, value] of row.entries()) {
            const cell = rich(index === 0 ? 'th' : 'td', value)
            if (index === 0) cell.scope = 'row'
            tr.append(cell)
          }
        }
        wrap.append(table)
        return wrap
      }
      case 'figure': {
        const thisRun = run()
        const key = entryIndex + ':' + index
        const figure = window.V5_CHARTS.create(block.kind, thisRun.figures[key], (value) => {
          thisRun.figures[key] = value
          persist()
        })
        disposables.push(figure.dispose)
        return figure.container
      }
      case 'source':
        return citation(block.id)
      case 'problem': {
        const item = data.problems[block.id]
        const problem = element('div', 'problem-block')
        problem.append(element('strong', '', item.title), rich('p', item.text))
        return problem
      }
      case 'review':
        return reviewFor(block.problem, run().entries[entryIndex].reviewAttempts ?? run().attempts)
      case 'notebook':
        return notebook()
    }
  }

  function actionsFor(node, entry) {
    if (!node.actions?.length) return null
    const usable = node.actions.filter((action) => action.kind !== 'save' ||
      Boolean((run().attempts[action.problem] ?? []).some((answer) => !answer.correct) && run().attempts[action.problem].at(-1).correct))
    if (!usable.length) return null
    const row = element('div', 'action-row')
    let mainAssigned = false
    for (const action of usable) {
      const classes = ['action']
      if (action.kind === 'answer') classes.push('action--answer')
      else if (!mainAssigned && action.kind !== 'link') {
        classes.push('action--primary')
        mainAssigned = true
      }
      const saved = action.kind === 'save' && state.notebook[run().id + ':' + action.problem]
      const control = button(saved ? (saved.temporary ? '本窗口已记录' : '已保存到错题本') : action.label,
        () => commitAction(action, entry), classes.join(' '))
      if (saved) control.disabled = true
      row.append(control)
    }
    return row
  }

  function render() {
    const scrollTop = scroll.scrollTop
    disposables.forEach((dispose) => dispose())
    disposables = []
    const thisRun = run()
    const active = latest()
    $('scene-title').textContent = current.title
    $('scene-subtitle').textContent = current.subtitle || ''
    $('scene-subtitle').hidden = !current.subtitle
    const productSection = current.id === 'error' ? 'error' : current.id === 'variants' ? 'practice' : 'home'
    for (const navButton of document.querySelectorAll('[data-product-nav]')) {
      if (navButton.dataset.productNav === productSection) navButton.setAttribute('aria-current', 'page')
      else navButton.removeAttribute('aria-current')
    }
    for (const sceneButton of $('scenes').children) {
      if (sceneButton.dataset.scene === current.id) sceneButton.setAttribute('aria-current', 'page')
      else sceneButton.removeAttribute('aria-current')
    }
    const children = []
    for (const [index, entry] of thisRun.entries.entries()) {
      if (entry.kind !== 'assistant') {
        const row = element('article', 'msg msg--student')
        row.setAttribute('aria-label', entry.kind === 'seed' ? '示例学生的起始消息' : '你的消息')
        const bubble = element('div', 'user-bubble')
        if (entry.attachment) bubble.append(photo(entry.attachment))
        if (entry.text) {
          const prose = entry.kind === 'seed' ? rich('p', entry.text) : element('p', '', entry.text)
          bubble.append(prose)
        }
        row.append(bubble)
        children.push(row)
        continue
      }
      const row = element('article', 'msg msg--assistant')
      row.dataset.node = entry.node
      row.dataset.index = index
      const mark = element('span', 'msg-avatar', 'π')
      mark.setAttribute('aria-hidden', 'true')
      const main = element('div', 'msg-main')
      main.append(element('div', 'msg-author', '智学助教'))
      const panel = element('div', 'reply-panel')
      const node = current.nodes[entry.node]
      const loading = pending?.entry === entry
      const count = loading ? pending.visible : entry.stopped ? entry.visible : node.blocks.length
      for (const [blockIndex, block] of node.blocks.slice(0, count).entries()) panel.append(blockFor(block, blockIndex, index))
      if (loading) {
        panel.setAttribute('aria-busy', 'true')
        panel.append(element('p', 'inline-state', '正在回放预设讲解…'))
      } else if (entry.stopped) {
        const footer = element('div', 'action-row')
        footer.append(element('span', 'inline-state', '回放已暂停'), button('继续查看讲解', () => continueReplay(entry)))
        panel.append(footer)
      } else if (entry === active) {
        const actions = actionsFor(node, entry)
        if (actions) panel.append(actions)
      } else if (entry.selected) {
        panel.append(element('p', 'inline-state', '本步作答 · ' + entry.selected))
      }
      main.append(panel)
      row.append(mark, main)
      children.push(row)
    }
    thread.replaceChildren(...children)
    scroll.scrollTop = scrollTop
    onScroll()
    syncSend()
  }

  function goToStart(entry) {
    const index = run().entries.indexOf(entry)
    const active = thread.querySelector('[data-index="' + index + '"]')
    if (active && active.getBoundingClientRect().bottom > scroll.getBoundingClientRect().bottom) {
      active.scrollIntoView({ block: 'start', inline: 'nearest' })
      onScroll()
    }
  }

  function onScroll() {
    $('jump').hidden = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 52
  }

  function finishReplay() {
    if (!pending) return
    const done = pending.entry
    pending = null
    delete done.stopped
    delete done.visible
    persist()
    render()
    announcement.textContent = '预设讲解已载入。'
  }

  function stepReplay() {
    if (!pending) return
    const count = current.nodes[pending.entry.node].blocks.length
    if (pending.visible >= count) {
      finishReplay()
      return
    }
    pending.visible += 1
    render()
    pending.entry.visible = pending.visible
    persist()
    pending.timer = setTimeout(stepReplay, 145)
  }

  function startReplay(entry, visible = 0) {
    if (reducedMotion.matches) {
      delete entry.stopped
      delete entry.visible
      persist()
      render()
      announcement.textContent = '预设讲解已载入。'
      goToStart(entry)
      return
    }
    pending = { entry, visible, timer: null }
    stepReplay()
    goToStart(entry)
  }

  function haltReplay() {
    if (!pending) return
    clearTimeout(pending.timer)
    pending.entry.stopped = true
    pending.entry.visible = pending.visible
    pending = null
    persist()
  }

  function continueReplay(entry) {
    if (latest() === entry && entry.stopped && !pending) startReplay(entry, entry.visible)
  }

  function transition(edge, { text, picture, label }) {
    if (!edge?.to || pending || latest()?.stopped) return
    const thisRun = run()
    const active = latest()
    if (label) active.selected = label
    if (text || picture) thisRun.entries.push({ kind: 'student', text, attachment: picture })
    if (edge.record) {
      const { problem, value, correct } = edge.record
      const attempts = thisRun.attempts[problem] ??= []
      attempts.push({ value, correct })
    }
    const entry = { kind: 'assistant', node: edge.to, stopped: true, visible: 0 }
    if (current.nodes[edge.to].blocks.some((block) => block.type === 'review')) {
      entry.reviewAttempts = structuredClone(thisRun.attempts)
    }
    thisRun.entries.push(entry)
    const durable = persist()
    setNotice(durable ? '' : '本窗口可继续体验，浏览器暂时无法保存进度。')
    announcement.textContent = ''
    startReplay(entry)
  }

  function commitAction(action, entry) {
    if (entry !== latest() || pending || entry.stopped) return
    if (action.kind === 'link') {
      switchScene(action.scene)
      return
    }
    if (action.kind === 'save') {
      const key = run().id + ':' + action.problem
      if (state.notebook[key]) return
      const record = { problem: action.problem, attempts: structuredClone(run().attempts[action.problem]) }
      state.notebook[key] = record
      const durable = persist()
      if (!durable) record.temporary = true
      render()
      setNotice(durable ? '已保存。可以从左侧「错题」打开这次的首答和订正。'
        : '已加入当前窗口的错题列表。浏览器暂时无法保存，刷新后无法恢复。')
      return
    }
    scroll.focus({ preventScroll: true })
    transition(action, { label: action.kind === 'answer' ? action.label : undefined })
  }

  function setAttachment(id) {
    attachment = id
    const holder = $('draft-attachment')
    holder.hidden = !id
    holder.replaceChildren()
    if (id) {
      const chip = element('span', 'attachment-chip', data.assets[id].title)
      chip.append(button('移除', () => setAttachment(null), 'action'))
      holder.append(chip)
    }
    syncSend()
  }

  async function selectAttachment(file) {
    if (!file) return
    const sequence = ++fileSequence
    setAttachment(null)
    if (!globalThis.crypto?.subtle) {
      setNotice('当前浏览器无法核对题图。可以在左侧打开拍照示例。')
      return
    }
    const buffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    if (sequence !== fileSequence) return
    const hash = [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    const recognized = Object.keys(data.assets).find((id) => data.assets[id].sha256 === hash)
    if (!recognized) {
      setNotice('这个预览只支持随包的两张题图。可以换成示例题图，或直接打开拍照解题会话。')
      return
    }
    setNotice('已选中本地题图，可以发送。')
    setAttachment(recognized)
  }

  function submit() {
    if (pending) {
      haltReplay()
      render()
      return
    }
    if (latest()?.stopped) return
    const text = draft.value.trim()
    if (attachment) {
      const picture = attachment
      if (text && !['看题图', '请讲解这道题', '请分析题图'].includes(normalize(text))) {
        setNotice('题图已选中。可以直接发送题图，或输入「请讲解这道题」。')
        return
      }
      switchScene('photo')
      if (latest()?.stopped) {
        draft.value = text
        setAttachment(picture)
        setNotice('上次的题图讲解已暂停。继续查看或重置会话后，可以发送选中的题图。')
        return
      }
      const photoRun = run()
      if (photoRun.entries.length === 2 && photoRun.entries[0].kind === 'seed' && latest().node === 'photo-open') {
        photoRun.entries = []
      }
      draft.value = ''
      setAttachment(null)
      transition({ to: picture === 'unclear' ? 'confirm-image' : 'photo-upload' }, { text, picture })
      return
    }
    if (!text) return
    const edge = current.nodes[latest().node].inputs?.find((input) =>
      input.aliases.some((alias) => normalize(alias) === normalize(text)))
    if (!edge) {
      setNotice('这一句超出本场景的预设范围。可以换个问法，或用当前回复里的操作继续。')
      return
    }
    draft.value = ''
    transition(edge, { text })
  }

  for (const scene of data.scenes) {
    const item = button(scene.label, () => switchScene(scene.id), 'scenario-item')
    item.dataset.scene = scene.id
    item.title = scene.title
    $('scenes').append(item)
  }
  const product = { home: 'photo', practice: 'variants', error: 'error' }
  for (const item of document.querySelectorAll('[data-product-nav]')) {
    item.addEventListener('click', () => switchScene(product[item.dataset.productNav]))
  }
  $('sidebar-toggle').addEventListener('click', (event) => {
    const opened = document.body.classList.toggle('sidebar-open')
    event.currentTarget.setAttribute('aria-expanded', String(opened))
  })
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNavigation() })
  window.addEventListener('hashchange', () => switchScene(location.hash.slice(1), false))
  $('restart').addEventListener('click', () => {
    haltReplay()
    fileSequence += 1
    state.runs[current.id] = newRun(current)
    draft.value = ''
    setAttachment(null)
    scroll.scrollTop = 0
    persist()
    render()
    setNotice('本示例已重开。之前保存的错题仍可在「错题」查看。')
  })
  scroll.addEventListener('scroll', onScroll, { passive: true })
  $('jump').addEventListener('click', () => { scroll.scrollTop = scroll.scrollHeight })
  $('attach').addEventListener('click', () => $('file').click())
  $('file').addEventListener('change', (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    selectAttachment(file).catch(() => setNotice('这张图暂时无法读取。可以重新选择随包题图。'))
  })
  $('composer').addEventListener('submit', (event) => { event.preventDefault(); submit() })
  draft.addEventListener('input', syncSend)
  draft.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return
    event.preventDefault()
    if (!pending) submit()
  })

  render()
  if (!storageAvailable) setNotice('浏览器未开放本地保存。当前窗口内可以继续体验。')
})()
