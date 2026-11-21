/**
 * 离线 LaTeX 引擎（页面侧等价实现，不改只读数据文件）。
 *
 * 为什么页面里要有一份：src/data/research.js 的 validateLatexProject / parseLatexProject
 * 的正则受导出文本转义影响（例如 /\\\begin/ 中的 \b 被解释为词边界、/\\\section/ 中的 \s
 * 被解释为空白、/\\\def/ 中的 \d 被解释为数字），且工程源码为双反斜杠转义；页面侧以
 * normalizeTex + 本文件的等价实现保证「编辑→保存→编译→日志定位→导出 PDF」真实可跑。
 * 数据层字段（writingProjects.patches / assets 等）继续复用。
 *
 * 能力边界：XeLaTeX 常用命令子集；不支持完整 TeX 宏语言。所有诊断与排版均为本地规则。
 */

/* ───────────────────────── 文本还原 ───────────────────────── */

export function normalizeTex(src) {
  return String(src ?? '').replace(/\\\\/g, '\\')
}

export function normalizeFiles(files) {
  const out = {}
  for (const [path, file] of Object.entries(files || {})) {
    out[path] = { kind: file?.kind || (path.endsWith('.bib') ? 'bib' : 'tex'), content: normalizeTex(file?.content) }
  }
  return out
}

function stripComment(line) {
  let out = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && i + 1 < line.length) {
      out += ch + line[i + 1]
      i++
      continue
    }
    if (ch === '%') break
    out += ch
  }
  return out
}

/* ───────────────────────── 命令表 ───────────────────────── */

const BASE_COMMANDS = new Set(
  `documentclass usepackage title author date begin end maketitle section subsection subsubsection input include bibliography bibliographystyle cite label ref eqref pageref frac dfrac tfrac sqrt mathbb mathrm mathbf mathit mathsf mathtt text textbf textit emph item centering caption inclugraphics includegraphics href hline newpage newcommand renewcommand setlength quad qquad left right nabla cdot cdots ldots dots le ge ne leq geq approx sim in notin subset subseteq forall exists partial int sum prod lim to rightarrow leftarrow Rightarrow infinity pm times div ast star circ alpha beta gamma delta epsilon varepsilon zeta eta theta lambda mu nu xi pi rho sigma tau phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi Omega hbar ell operatorname displaystyle textstyle scriptstyle mathop limits nolimits nonumber tag notag linewidth textwidth columnwidth hspace vspace smallskip medskip bigskip italic bf it rm sf tt underline mbox hfil hfill par noindent indent protect relax expandafter csname endcsname boldsymbol mathcal mathfrak stackrel overset underset binom choose cfrac inf sup lim limsup liminf max min log ln exp sin cos tan cot sec csc arcsin arccos arctan det dim ker deg arg hom gcd Pr mod bmod pmod`.split(
    /\s+/,
  ),
)

const PACKAGE_COMMANDS = {
  amsthm: ['qedhere', 'qed', 'proofname'],
  amsmath: ['text', 'frac', 'dfrac', 'tfrac', 'binom', 'overset', 'underset', 'tag', 'nonumber', 'notag', 'eqref', 'boldsymbol', 'operatorname', 'limits', 'nolimits', 'displaystyle', 'textstyle'],
  amssymb: ['mathbb', 'mathfrak', 'leqslant', 'geqslant', 'varnothing', 'therefore', 'because'],
  ctex: [],
  graphicx: ['includegraphics'],
  hyperref: ['href', 'url'],
  enumerate: [],
}

const BASE_ENVS = new Set([
  'document', 'abstract', 'equation', 'equation*', 'align', 'align*', 'gather', 'gather*',
  'itemize', 'enumerate', 'proof', 'theorem', 'lemma', 'corollary', 'definition', 'proposition',
  'table', 'tabular', 'figure', 'center', 'displaymath', 'quote', 'verbatim', 'minipage',
])

const THEOREM_ENVS = {
  theorem: '定理',
  lemma: '引理',
  corollary: '推论',
  definition: '定义',
  proposition: '命题',
}

/* ───────────────────────── 工程信息 ───────────────────────── */

export function usePackages(files) {
  const pkgs = new Set()
  for (const file of Object.values(files || {})) {
    const src = String(file?.content ?? '')
    for (const m of src.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]*)\}/g)) {
      m[1].split(',').forEach((p) => {
        const name = p.trim()
        if (name) pkgs.add(name)
      })
    }
  }
  return pkgs
}

export function knownCommands(files) {
  const pkgs = usePackages(files)
  const set = new Set(BASE_COMMANDS)
  for (const p of pkgs) for (const c of PACKAGE_COMMANDS[p] || []) set.add(c)
  for (const file of Object.values(files || {})) {
    const src = String(file?.content ?? '')
    for (const m of src.matchAll(/\\newcommand\*?\{?\\([a-zA-Z@]+)\}?/g)) set.add(m[1])
    for (const m of src.matchAll(/\\def\\([a-zA-Z@]+)/g)) set.add(m[1])
  }
  return set
}

function bibKeysOf(files) {
  const src = Object.values(files || {})
    .filter((f) => (f?.kind || '') === 'bib' || String(f?.content || '').includes('@misc'))
    .map((f) => String(f?.content || ''))
    .join('\n')
  return [...src.matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,/g)].map((m) => m[1])
}

function parseBibEntries(src) {
  const out = []
  for (const m of String(src || '').matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\n\}/g)) {
    const key = m[1]
    const body = m[2]
    const title = (body.match(/title\s*=\s*\{([^}]*)\}/) || [])[1] || ''
    const author = (body.match(/author\s*=\s*\{([^}]*)\}/) || [])[1] || ''
    out.push({ key, title, author })
  }
  return out
}

/* ───────────────────────── 诊断 ───────────────────────── */

/**
 * 诊断工程：返回 { errors, warnings, infos, packages, bibKeys }。
 * level=error 表示终止编译；warning 表示可继续但存在待处理项。
 */
export function validateProject(files) {
  const errors = []
  const warnings = []
  const cmds = knownCommands(files)
  const pkgs = usePackages(files)
  const bibKeys = bibKeysOf(files)
  const labels = new Set()
  const refs = []

  for (const [path, file] of Object.entries(files || {})) {
    const kind = file?.kind || (path.endsWith('.bib') ? 'bib' : 'tex')
    if (kind !== 'tex') continue
    const lines = String(file?.content || '').split('\n')
    const braceStack = []
    const envStack = []
    let hasDocBegin = false
    let hasDocEnd = false
    lines.forEach((raw, i) => {
      const lineNo = i + 1
      const line = stripComment(raw)
      // 花括号配对（跳过 \{ \} 转义）
      for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci]
        if (ci > 0 && line[ci - 1] === '\\') continue
        if (ch === '{') braceStack.push(lineNo)
        else if (ch === '}') {
          if (!braceStack.length) errors.push({ level: 'error', file: path, line: lineNo, message: '多余的右花括号 }；编译终止。' })
          else braceStack.pop()
        }
      }
      // 环境配对
      for (const m of line.matchAll(/\\begin\{([^}]+)\}/g)) {
        envStack.push({ name: m[1], line: lineNo })
        if (m[1] === 'document') hasDocBegin = true
        if (!BASE_ENVS.has(m[1])) warnings.push({ level: 'warning', file: path, line: lineNo, message: `未知环境 ${m[1]}；离线演示编译器可能无法排版。` })
      }
      for (const m of line.matchAll(/\\end\{([^}]+)\}/g)) {
        if (m[1] === 'document') hasDocEnd = true
        const top = envStack.pop()
        if (!top || top.name !== m[1]) {
          errors.push({ level: 'error', file: path, line: lineNo, message: `环境不匹配：期望 \\end{${top ? top.name : '?'}}，实际为 \\end{${m[1]}}。` })
        }
      }
      // 未定义命令
      for (const m of line.matchAll(/\\([a-zA-Z@]+)/g)) {
        const name = m[1]
        if (cmds.has(name)) continue
        errors.push({
          level: 'error',
          file: path,
          line: lineNo,
          message: `未定义的控制序列：\\${name}；离线演示编译器不支持该命令（amsthm 等宏包提供的命令需先在导言区加载）。`,
          code: 'undefined-command',
          command: name,
        })
      }
      // 未定义引用
      for (const m of line.matchAll(/\\cite\{([^}]*)\}/g)) {
        m[1].split(',').forEach((keyRaw) => {
          const key = keyRaw.trim()
          if (key && !bibKeys.includes(key)) {
            const close = bibKeys.find((k) => k.toLowerCase() === key.toLowerCase())
            warnings.push({
              level: 'warning',
              file: path,
              line: lineNo,
              message: `Citation '${key}' on page 1 undefined on input line ${lineNo}.`,
              code: 'undefined-citation',
              key,
              suggestion: close || bibKeys[0] || null,
            })
          }
        })
      }
      for (const m of line.matchAll(/\\label\{([^}]+)\}/g)) labels.add(m[1])
      for (const m of line.matchAll(/\\(?:ref|eqref)\{([^}]+)\}/g)) refs.push({ key: m[1], file: path, line: lineNo })
      // \input 文件存在性
      for (const m of line.matchAll(/\\input\{([^}]+)\}/g)) {
        const name = m[1].trim()
        const candidates = [name, name.endsWith('.tex') ? name : `${name}.tex`]
        if (!candidates.some((c) => files[c])) {
          errors.push({ level: 'error', file: path, line: lineNo, message: `找不到被 \\input 的文件：${name}。` })
        }
      }
    })
    if (braceStack.length) errors.push({ level: 'error', file: path, line: braceStack[0], message: '花括号未闭合；编译终止。' })
    if (envStack.length) errors.push({ level: 'error', file: path, line: envStack[envStack.length - 1].line, message: `环境 {${envStack[envStack.length - 1].name}} 未闭合。` })
    if (path === 'main.tex' && !hasDocBegin) errors.push({ level: 'error', file: path, line: 1, message: '缺少 \\begin{document}。' })
    if (path === 'main.tex' && !hasDocEnd) errors.push({ level: 'error', file: path, line: lines.length, message: '缺少 \\end{document}。' })
  }
  for (const r of refs) {
    if (!labels.has(r.key)) warnings.push({ level: 'warning', file: r.file, line: r.line, message: `Reference '${r.key}' on page 1 undefined on input line ${r.line}.`, code: 'undefined-ref' })
  }
  if (refs.some((r) => !labels.has(r.key))) {
    warnings.push({ level: 'warning', file: 'main.tex', line: 1, message: 'There were undefined references.' })
  }
  if (warnings.some((w) => w.code === 'undefined-citation')) {
    warnings.push({ level: 'warning', file: 'main.tex', line: 1, message: 'There were undefined references.' })
  }
  const infos = []
  if (pkgs.size) infos.push({ level: 'info', file: 'main.tex', line: 1, message: `已加载宏包：${[...pkgs].join(', ')}。` })
  return { errors, warnings, infos, packages: [...pkgs], bibKeys }
}

/* ───────────────────────── 解析 ───────────────────────── */

function readCommandArg(src, name) {
  const m = String(src || '').match(new RegExp('\\\\' + name + '\\{([^}]*)\\}'))
  return m ? m[1].trim() : ''
}

export function expandInput(files, mainFile = 'main.tex', depth = 0) {
  if (depth > 6) return ''
  const file = files?.[mainFile]
  if (!file) return ''
  const src = String(file.content || '')
  return src.replace(/\\(?:input|include)\{([^}]+)\}/g, (_, name) => {
    const clean = name.trim()
    const key = files[clean] ? clean : `${clean}.tex`
    if (!files[key]) return ''
    return '\n' + expandInput(files, key, depth + 1) + '\n'
  })
}

function refNumber(refKeys, key) {
  const i = refKeys.indexOf(key)
  return i >= 0 ? `[${i + 1}]` : '[?]'
}

function unescapeLatex(s) {
  return String(s)
    .replace(/\\%/g, '%')
    .replace(/\\_/g, '_')
    .replace(/\\&/g, '&')
    .replace(/\\#/g, '#')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\\\/g, ' ')
    .replace(/~/g, ' ')
}

function cleanInlineForPreview(text, refKeys) {
  let s = String(text || '')
  s = s.replace(/\\textbf\{([^{}]*)\}/g, '**$1**')
  s = s.replace(/\\(?:emph|textit)\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\cite\{([^}]*)\}/g, (_, keys) => keys.split(',').map((k) => refNumber(refKeys, k.trim())).join(''))
  s = s.replace(/\\qedhere\b|\\qed\b/g, '□')
  s = s.replace(/\\(?:label|index)\{[^}]*\}/g, '')
  s = unescapeLatex(s)
  return s.replace(/[ \t]+/g, ' ').trim()
}

function cleanInlineForPdf(text, refKeys) {
  let s = String(text || '')
  s = s.replace(/\\cite\{([^}]*)\}/g, (_, keys) => keys.split(',').map((k) => refNumber(refKeys, k.trim())).join(''))
  s = s.replace(/\\(?:label|index)\{[^}]*\}/g, '')
  s = s.replace(/\$([^$]*)\$/g, (_, tex) => plainMath(tex))
  s = s.replace(/\\(?:textbf|emph|textit|text|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\[a-zA-Z@]+\*?/g, '')
  s = unescapeLatex(s)
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * 解析工程为预览 / PDF 共用的文档模型。
 * @returns {{title,author,date,meta,blocks,pdfBlocks,sections,usedCites,refKeys,bibEntries}}
 */
export function parseProject(files, mainFile = 'main.tex') {
  const main = String(files?.[mainFile]?.content || '')
  const merged = expandInput(files, mainFile)
  const preamble = main.slice(0, Math.max(0, main.indexOf('\\begin{document}')))
  const title = readCommandArg(preamble, 'title') || '未命名论文'
  const author = readCommandArg(preamble, 'author') || 'Xu Chao'
  const date = readCommandArg(preamble, 'date') || ''
  const bodyStart = merged.indexOf('\\begin{document}')
  const bodyEnd = merged.lastIndexOf('\\end{document}')
  const body = bodyStart >= 0 ? merged.slice(bodyStart + '\\begin{document}'.length, bodyEnd > 0 ? bodyEnd : merged.length) : merged

  const bibContents = Object.values(files || {})
    .filter((f) => (f?.kind || '') === 'bib')
    .map((f) => String(f?.content || ''))
  const refKeys = bibContents.flatMap((src) => [...src.matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,/g)].map((m) => m[1]))
  const bibEntries = bibContents.flatMap((src) => parseBibEntries(src))

  const blocks = []
  const pdfBlocks = []
  const sections = []
  let sectionNo = 0
  let subNo = 0
  let eqNo = 0

  const pushParaDoc = (text) => {
    const cleaned = cleanInlineForPreview(text, refKeys)
    const plain = cleanInlineForPdf(text, refKeys)
    if (!cleaned && !plain) return
    blocks.push({ t: 'p', text: cleaned })
    pdfBlocks.push({ type: 'p', text: plain })
  }

  // 标题块（PDF 由导出器画大标题，这里只进预览）
  blocks.push({ t: 'title', title, sub: '', author, date })

  const lines = body.split('\n')
  let i = 0
  let para = []
  const flushPara = () => {
    const text = para.join(' ').trim()
    para = []
    if (text) pushParaDoc(text)
  }

  while (i < lines.length) {
    const raw = lines[i]
    const line = stripComment(raw).trim()
    if (!line) {
      flushPara()
      i++
      continue
    }
    if (/^\\maketitle\b/.test(line)) {
      i++
      continue
    }
    const sec = line.match(/^\\section\*?\{([^}]*)\}/)
    if (sec) {
      flushPara()
      sectionNo++
      subNo = 0
      sections.push({ level: 1, text: `${sectionNo} ${sec[1]}` })
      blocks.push({ t: 'h1', text: `${sectionNo} ${sec[1]}` })
      pdfBlocks.push({ type: 'h', text: `${sectionNo} ${sec[1]}` })
      i++
      continue
    }
    const sub = line.match(/^\\subsection\*?\{([^}]*)\}/)
    if (sub) {
      flushPara()
      subNo++
      sections.push({ level: 2, text: `${sectionNo}.${subNo} ${sub[1]}` })
      blocks.push({ t: 'h2', text: `${sectionNo}.${subNo} ${sub[1]}` })
      pdfBlocks.push({ type: 'h', text: `${sectionNo}.${subNo} ${sub[1]}` })
      i++
      continue
    }
    const subsub = line.match(/^\\subsubsection\*?\{([^}]*)\}/)
    if (subsub) {
      flushPara()
      sections.push({ level: 3, text: subsub[1] })
      blocks.push({ t: 'h3', text: subsub[1] })
      pdfBlocks.push({ type: 'h', text: subsub[1] })
      i++
      continue
    }
    if (/\\begin\{abstract\}/.test(line)) {
      flushPara()
      i++
      const buffer = []
      while (i < lines.length && !/\\end\{abstract\}/.test(lines[i])) {
        buffer.push(stripComment(lines[i]).trim())
        i++
      }
      i++
      const text = buffer.filter(Boolean).join(' ')
      if (text) {
        blocks.push({ t: 'h3', text: '摘要' })
        blocks.push({ t: 'p', text: cleanInlineForPreview(text, refKeys) })
        pdfBlocks.push({ type: 'h', text: '摘要' })
        pdfBlocks.push({ type: 'p', text: cleanInlineForPdf(text, refKeys) })
      }
      continue
    }
    if (/\\begin\{equation\*?\}/.test(line)) {
      flushPara()
      i++
      const buffer = []
      while (i < lines.length && !/\\end\{equation\*?\}/.test(lines[i])) {
        buffer.push(stripComment(lines[i]).trim())
        i++
      }
      i++
      const tex = buffer.join(' ').trim()
      if (tex) {
        eqNo++
        blocks.push({ t: 'formula', tex, num: `(${eqNo})` })
        pdfBlocks.push({ type: 'formula', text: plainMath(tex) })
      }
      continue
    }
    if (/^\\\[/.test(line)) {
      flushPara()
      const first = line.replace(/^\\\[/, '')
      let tex = ''
      if (/\\\]\s*$/.test(first)) {
        tex = first.replace(/\\\]\s*$/, '').trim()
        i++
      } else {
        i++
        const buffer = first ? [first] : []
        while (i < lines.length && !/\\\]/.test(lines[i])) {
          buffer.push(stripComment(lines[i]).trim())
          i++
        }
        if (i < lines.length) {
          const tail = stripComment(lines[i]).replace(/\\\].*/, '').trim()
          if (tail) buffer.push(tail)
          i++
        }
        tex = buffer.filter(Boolean).join(' ').trim()
      }
      if (tex) {
        blocks.push({ t: 'formula', tex })
        pdfBlocks.push({ type: 'formula', text: plainMath(tex) })
      }
      continue
    }
    const listBegin = line.match(/\\begin\{(itemize|enumerate)\}/)
    if (listBegin) {
      flushPara()
      const ordered = listBegin[1] === 'enumerate'
      i++
      const items = []
      while (i < lines.length && !/\\end\{(?:itemize|enumerate)\}/.test(lines[i])) {
        const itemLine = stripComment(lines[i]).trim()
        const itemMatch = itemLine.match(/^\\item\s*(.*)$/)
        if (itemMatch) items.push(itemMatch[1])
        else if (items.length && itemLine) items[items.length - 1] += ' ' + itemLine
        i++
      }
      i++
      if (items.length) {
        blocks.push({ t: 'list', ordered, items: items.map((s) => cleanInlineForPreview(s, refKeys)) })
        pdfBlocks.push({ type: 'list', text: items.map((s) => cleanInlineForPdf(s, refKeys)).join('；') })
      }
      continue
    }
    if (/\\begin\{proof\}/.test(line)) {
      flushPara()
      i++
      const buffer = []
      while (i < lines.length && !/\\end\{proof\}/.test(lines[i])) {
        const cur = lines[i]
        if (/\\begin\{equation\*?\}/.test(cur)) {
          i++
          while (i < lines.length && !/\\end\{equation\*?\}/.test(lines[i])) i++
          i++
          continue
        }
        if (/^\s*\\\[/.test(stripComment(cur))) {
          i++
          while (i < lines.length && !/\\\]/.test(lines[i])) i++
          i++
          continue
        }
        buffer.push(stripComment(cur).trim())
        i++
      }
      i++
      const text = cleanInlineForPreview(buffer.filter(Boolean).join(' '), refKeys)
      if (text) {
        blocks.push({ t: 'proof', label: '证明', text })
        pdfBlocks.push({ type: 'p', text: `证明：${cleanInlineForPdf(buffer.filter(Boolean).join(' '), refKeys)}` })
      }
      continue
    }
    const theoremBegin = line.match(/\\begin\{(theorem|lemma|corollary|definition|proposition)\}(?:\[([^\]]*)\])?/)
    if (theoremBegin) {
      flushPara()
      const envName = THEOREM_ENVS[theoremBegin[1]]
      i++
      const buffer = []
      while (i < lines.length && !new RegExp('\\\\end\\{' + theoremBegin[1] + '\\}').test(lines[i])) {
        buffer.push(stripComment(lines[i]).trim())
        i++
      }
      i++
      const text = cleanInlineForPreview(buffer.filter(Boolean).join(' '), refKeys)
      const label = theoremBegin[2] ? `${envName}（${theoremBegin[2]}）` : envName
      if (text) {
        blocks.push({ t: 'theorem', title: label, text })
        pdfBlocks.push({ type: 'p', text: `${label} ${cleanInlineForPdf(buffer.filter(Boolean).join(' '), refKeys)}` })
      }
      continue
    }
    if (/\\begin\{(table|figure)\}/.test(line)) {
      flushPara()
      while (i < lines.length && !/\\end\{(?:table|figure)\}/.test(lines[i])) i++
      i++
      continue
    }
    if (/\\bibliography\{/.test(line) || /\\bibliographystyle\{/.test(line)) {
      flushPara()
      i++
      continue
    }
    if (/^\\(?:label|centering|newpage|clearpage|smallskip|medskip|bigskip|hspace|vspace)\b/.test(line)) {
      i++
      continue
    }
    para.push(line)
    i++
  }
  flushPara()

  if (bibEntries.length) {
    blocks.push({ t: 'h3', text: '参考文献' })
    blocks.push({
      t: 'refs',
      items: bibEntries.map((e) => `[${e.key}] ${e.title}${e.author ? ' · ' + e.author : ''}（随包演示材料，非外部论文）`),
    })
    pdfBlocks.push({ type: 'h', text: '参考文献' })
    for (const e of bibEntries) pdfBlocks.push({ type: 'list', text: `[${e.key}] ${e.title}（随包演示材料）` })
  }

  if (!blocks.some((b) => b.t !== 'title')) {
    blocks.push({ t: 'p', text: '（正文为空）可在左侧编辑 main.tex 后重新编译。' })
    pdfBlocks.push({ type: 'p', text: '（正文为空）' })
  }

  return {
    title,
    author,
    date,
    meta: [author, date, '随包演示写作工程 · 离线编译'].filter(Boolean),
    blocks,
    pdfBlocks,
    sections,
    usedCites: [...new Set(body.matchAll(/\\cite\{([^}]*)\}/g).flatMap((m) => m[1].split(',').map((s) => s.trim())))],
    refKeys,
    bibEntries,
  }
}

/** 结构大纲：由工程文件实时生成（点击定位到文件 + 行）。 */
export function outlineProject(files, mainFile = 'main.tex') {
  const out = []
  const main = String(files?.[mainFile]?.content || '')
  const abstractLine = main.split('\n').findIndex((l) => /\\begin\{abstract\}/.test(l)) + 1
  if (abstractLine > 0) out.push({ level: 1, text: '摘要', file: mainFile, line: abstractLine })
  let secNo = 0
  let subNo = 0
  const walk = (key, depth = 0) => {
    const src = String(files?.[key]?.content || '')
    const lines = src.split('\n')
    for (let idx = 0; idx < lines.length; idx++) {
      const line = stripComment(lines[idx]).trim()
      const secM = line.match(/^\\section\*?\{([^}]*)\}/)
      if (secM) {
        secNo++
        subNo = 0
        out.push({ level: 1, text: `${secNo} ${secM[1]}`, file: key, line: idx + 1 })
        continue
      }
      const subM = line.match(/^\\subsection\*?\{([^}]*)\}/)
      if (subM) {
        subNo++
        out.push({ level: 2, text: `${secNo}.${subNo} ${subM[1]}`, file: key, line: idx + 1 })
      }
    }
    for (let idx = 0; idx < lines.length; idx++) {
      const m = stripComment(lines[idx]).match(/\\input\{([^}]+)\}/)
      if (m) {
        const clean = m[1].trim()
        const child = files[clean] ? clean : `${clean}.tex`
        if (files[child]) walk(child, depth + 1)
      }
    }
  }
  walk(mainFile)
  const bibLine = main.split('\n').findIndex((l) => /\\bibliography\{/.test(l)) + 1
  if (bibLine > 0) out.push({ level: 1, text: '参考文献', file: mainFile, line: bibLine })
  return out
}

/** 某文件某行所属章节标题（Agent 上下文用）。 */
export function guessSection(files, file, line) {
  const outline = outlineProject(files).filter((e) => e.file === file && e.line <= line)
  return outline.length ? outline[outline.length - 1].text : '正文'
}

/* ───────────────────────── 数学 → 纯文本（PDF） ───────────────────────── */

export function plainMath(tex) {
  let s = String(tex || '')
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
  s = s.replace(/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
  s = s.replace(/\\tfrac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
  s = s.replace(/\\\|/g, '|')
  s = s.replace(/\\(?:left|right)\b\s*/g, '')
  s = s.replace(/\\(?:quad|qquad)\b/g, '  ')
  s = s.replace(/\\[,;!]/g, ' ')
  s = s.replace(/\\text\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\mathrm\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\mathbb\{R\}/g, 'R')
  s = s.replace(/\\mathbb\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ').replace(/\\delta/g, 'δ')
  s = s.replace(/\\varepsilon/g, 'ε').replace(/\\epsilon/g, 'ε').replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ')
  s = s.replace(/\\pi/g, 'π').replace(/\\rho/g, 'ρ').replace(/\\sigma/g, 'σ').replace(/\\tau/g, 'τ')
  s = s.replace(/\\phi/g, 'φ').replace(/\\varphi/g, 'φ').replace(/\\psi/g, 'ψ').replace(/\\omega/g, 'ω')
  s = s.replace(/\\Omega/g, 'Ω').replace(/\\Sigma/g, 'Σ').replace(/\\Phi/g, 'Φ').replace(/\\Psi/g, 'Ψ')
  s = s.replace(/\\nabla/g, 'grad ').replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\pm/g, '±')
  s = s.replace(/\\le\b|\\leq\b/g, '≤').replace(/\\ge\b|\\geq\b/g, '≥').replace(/\\ne\b|\\neq\b/g, '≠')
  s = s.replace(/\\in\b/g, '∈').replace(/\\notin\b/g, '∉').replace(/\\subset\b/g, '⊂').replace(/\\subseteq\b/g, '⊆')
  s = s.replace(/\\forall/g, '∀').replace(/\\exists/g, '∃').replace(/\\partial/g, '∂').replace(/\\infty/g, '∞')
  s = s.replace(/\\int/g, '∫').replace(/\\sum/g, '∑').replace(/\\prod/g, '∏')
  s = s.replace(/\\to\b|\\rightarrow\b/g, '->').replace(/\\Rightarrow/g, '=>')
  s = s.replace(/\\hbar/g, 'h').replace(/\\ell/g, 'l').replace(/\\ldots|\\dots|\\cdots/g, '...')
  s = s.replace(/\\inf(?![a-zA-Z])/g, 'inf').replace(/\\sup(?![a-zA-Z])/g, 'sup').replace(/\\lim(?![a-zA-Z])/g, 'lim')
  s = s.replace(/\\(?:displaystyle|textstyle|limits|nolimits|mathbf|mathit|rm|bf)\b/g, '')
  s = s.replace(/\\\\/g, ' ')
  s = s.replace(/[{}]/g, '').replace(/\$/g, '')
  s = s.replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/_\{([^{}]*)\}/g, '_($1)')
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/∇/g, 'grad ').replace(/ℝ/g, 'R').replace(/ℓ/g, 'l').replace(/⟨|⟩/g, '<>').replace(/⋅/g, '·').replace(/↦/g, '->').replace(/§/g, '第 ').replace(/｜/g, '|')
  return s
}

/** 编译（诊断通过后产出文档模型）；不写状态，由页面决定如何落库。 */
export function compileProject(files) {
  const report = validateProject(files)
  if (report.errors.length) return { ok: false, ...report }
  const doc = parseProject(files)
  return { ok: true, ...report, doc }
}

/** 导出 PDF 用的 {title, meta, blocks}（src/lib/exportPdf.buildPdf 契约）。 */
export function buildPdfDoc(doc) {
  return {
    title: doc.title,
    meta: doc.meta,
    blocks: (doc.pdfBlocks || []).map((b) => {
      if (b.type === 'list') return { type: 'list', text: b.text || (b.items || []).join('；') }
      if (b.type === 'formula') return { type: 'formula', text: b.text }
      if (b.type === 'h') return { type: 'h', text: b.text }
      if (b.type === 'quote') return { type: 'quote', text: b.text }
      return { type: 'p', text: b.text }
    }),
  }
}
