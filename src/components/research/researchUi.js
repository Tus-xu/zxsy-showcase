/**
 * 科研端页面状态 + 数据适配层（页面侧，只读数据文件不改）。
 *
 * 状态命名空间：store.ext.researchUi（持久化 / 随整场复位清空）
 *   {
 *     customProjects: [{ id, name, desc, memory, cover, papers: [], writeProjectId, custom: true }],
 *     read: { projectId, paperId, page, blockId, zoom, section, highlights[], notes[],
 *             ask, capability, formulaId, chat[] },
 *     write: { projectId, filesByProject, activeFileByProject, openFilesByProject,
 *              savedAtByProject, dirtyByProject, compileByProject, previewPageByProject,
 *              autoCompile, activeCapability, activePatch }
 *   }
 *
 * 数据层适配说明（详见 qa/research-ui/REPORT.md）：
 *   1. 只读数据文件 src/data/research.js 中的 .tex / 公式源码出现了「双反斜杠」转义
 *      （String.raw 内写成 \\documentclass），页面导入时必须 normalizeTex 还原为单反斜杠；
 *   2. 数据层 validateLatexProject / parseLatexProject 的部分正则受此影响（如 /\\\begin/
 *      中 \b 被解释为词边界），页面改用 latexEngine.js 中的等价实现，不改数据文件。
 */
import { store } from '../../state/demo'
import {
  CUSTOM_PROJECT_TEMPLATE,
  RESEARCH_DISCLAIMER,
  findPaper,
  findProject,
  formulaChecks,
  initialWritingFiles,
  projectPapers,
  researchPapers,
  researchProjects,
  seedNotes,
  starterWritingFiles,
  writingProjects,
} from '../../data/research'
import { normalizeFiles } from './latexEngine'

export {
  RESEARCH_DISCLAIMER,
  findPaper,
  findProject,
  formulaChecks,
  projectPapers,
  researchPapers,
  researchProjects,
  seedNotes,
  writingProjects,
}

function defaultUi() {
  return {
    customProjects: [],
    read: {
      projectId: null,
      paperId: null,
      page: 1,
      blockId: null,
      zoom: 1,
      section: 'docs',
      highlights: [],
      notes: [],
      ask: null,
      capability: null,
      formulaId: null,
      chat: [],
    },
    write: {
      projectId: null,
      filesByProject: {},
      activeFileByProject: {},
      openFilesByProject: {},
      savedAtByProject: {},
      dirtyByProject: {},
      compileByProject: {},
      previewPageByProject: {},
      autoCompile: true,
      activeCapability: null,
      activePatch: null,
      lastExport: null,
    },
  }
}

function mergeDefaults(target, defaults) {
  for (const [k, v] of Object.entries(defaults)) {
    if (target[k] === undefined) target[k] = v
  }
}

/** 取得（并按需初始化）科研 UI 命名空间。 */
export function researchUi() {
  if (!store.ext || typeof store.ext !== 'object') store.ext = {}
  if (!store.ext.researchUi || typeof store.ext.researchUi !== 'object') {
    store.ext.researchUi = defaultUi()
  }
  const ui = store.ext.researchUi
  const d = defaultUi()
  if (!Array.isArray(ui.customProjects)) ui.customProjects = []
  if (!ui.read || typeof ui.read !== 'object') ui.read = d.read
  mergeDefaults(ui.read, d.read)
  if (!Array.isArray(ui.read.highlights)) ui.read.highlights = []
  if (!Array.isArray(ui.read.notes)) ui.read.notes = []
  if (!Array.isArray(ui.read.chat)) ui.read.chat = []
  if (!ui.write || typeof ui.write !== 'object') ui.write = d.write
  mergeDefaults(ui.write, d.write)
  for (const key of ['filesByProject', 'activeFileByProject', 'openFilesByProject', 'savedAtByProject', 'dirtyByProject', 'compileByProject', 'previewPageByProject']) {
    if (!ui.write[key] || typeof ui.write[key] !== 'object') ui.write[key] = {}
  }
  return ui
}

export function resetResearchUi() {
  if (!store.ext || typeof store.ext !== 'object') store.ext = {}
  const fresh = defaultUi()
  if (!store.ext.researchUi || typeof store.ext.researchUi !== 'object') {
    store.ext.researchUi = fresh
  } else {
    // 就地复位：保持页面持有的同一引用可用（store.ext.researchUi 是持久化命名空间）
    for (const key of Object.keys(store.ext.researchUi)) delete store.ext.researchUi[key]
    Object.assign(store.ext.researchUi, fresh)
  }
  return researchUi()
}

/* ───────────────────────── 项目 ───────────────────────── */

export function allProjects() {
  const ui = researchUi()
  return [...researchProjects, ...ui.customProjects.filter((p) => p && p.id)]
}

export function resolveProject(id) {
  return allProjects().find((p) => p.id === id) || researchProjects[0]
}

export function currentProjectId() {
  const ui = researchUi()
  return ui.read.projectId || store.research.projectId || researchProjects[0].id
}

export function currentProject() {
  return resolveProject(currentProjectId())
}

export function papersForProject(project) {
  if (!project) return []
  return projectPapers(project)
}

export function projectStats(project) {
  const ui = researchUi()
  const papers = papersForProject(project).length
  const notes = seedNotes(project.id).length + ui.read.notes.filter((n) => n.projectId === project.id).length
  let drafts = 0
  const wp = writingProjects[project.writeProjectId]
  if (wp) drafts = Object.keys(wp.files).length
  else if (ui.write.filesByProject[project.id]) drafts = Object.keys(ui.write.filesByProject[project.id]).length
  else drafts = 2
  const data = formulaChecks.length
  return { papers, drafts, notes, data }
}

/** 新建自定义项目（保留在 store.ext.researchUi.customProjects，刷新可用）。 */
export function createCustomProject(name, desc) {
  const ui = researchUi()
  const clean = String(name || '').trim() || `${CUSTOM_PROJECT_TEMPLATE.name} ${ui.customProjects.length + 1}`
  const id = `custom-${Date.now().toString(36)}`
  const project = {
    id,
    name: clean,
    desc: String(desc || '').trim() || CUSTOM_PROJECT_TEMPLATE.desc,
    memory: CUSTOM_PROJECT_TEMPLATE.memory,
    cover: CUSTOM_PROJECT_TEMPLATE.cover,
    papers: [],
    writeProjectId: id,
    seedNotes: [],
    custom: true,
  }
  ui.customProjects.push(project)
  return project
}

export function deleteCustomProject(id) {
  const ui = researchUi()
  ui.customProjects = ui.customProjects.filter((p) => p.id !== id)
  delete ui.write.filesByProject[id]
  delete ui.write.compileByProject[id]
}

/* ───────────────────────── 阅读 ───────────────────────── */

export function enterReadProject(project) {
  const ui = researchUi()
  if (!project) return
  if (ui.read.projectId !== project.id) {
    ui.read.projectId = project.id
    const papers = papersForProject(project)
    const paper = papers[0] || null
    ui.read.paperId = paper ? paper.id : null
    ui.read.page = paper ? paper.defaultPage || 1 : 1
    ui.read.blockId = null
    ui.read.ask = null
    ui.read.capability = null
    ui.read.formulaId = null
    ui.read.zoom = 1
  } else if (!ui.read.paperId) {
    const paper = papersForProject(project)[0]
    if (paper) {
      ui.read.paperId = paper.id
      ui.read.page = paper.defaultPage || 1
    }
  }
  store.research.projectId = project.id
  return ui.read
}

export function activePaper() {
  const ui = researchUi()
  if (!ui.read.paperId) return null
  const paper = findPaper(ui.read.paperId)
  if (!paper) return null
  return paper
}

export function paperPages(paper) {
  return paper?.pages || []
}

export function blocksOfPage(page) {
  return page?.blocks || []
}

export function blockKey(paperId, pageNo, blockId) {
  return `${paperId}:${pageNo}:${blockId}`
}

export function recentNotes(projectId = null, limit = 8) {
  const ui = researchUi()
  const seeded = seedNotes(projectId).map((n) => ({
    ...n,
    key: n.id,
    timeText: n.time || '演示预置',
    seeded: true,
  }))
  const mine = ui.read.notes
    .filter((n) => !projectId || n.projectId === projectId)
    .map((n) => ({
      ...n,
      key: n.id,
      timeText: n.timeText || '',
      seeded: false,
    }))
  const all = [...mine, ...seeded]
  return limit ? all.slice(0, limit) : all
}

export function addNote({ projectId, paperId, page, blockId, title, quote, body }) {
  const ui = researchUi()
  const now = Date.now()
  const note = {
    id: `note-${now}`,
    projectId,
    paperId,
    page,
    blockId,
    title: String(title || '').trim() || '阅读笔记',
    quote: quote || '',
    body: body || '',
    createdAt: now,
    timeText: formatNoteTime(now),
    seeded: false,
  }
  ui.read.notes.unshift(note)
  return note
}

export function deleteNote(id) {
  const ui = researchUi()
  ui.read.notes = ui.read.notes.filter((n) => n.id !== id)
}

export function formatNoteTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const pad = (v) => String(v).padStart(2, '0')
  if (d.toDateString() === now.toDateString()) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  const yest = new Date(now.getTime() - 86400000)
  if (d.toDateString() === yest.toDateString()) return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export function toggleHighlight(paperId, pageNo, blockId) {
  const ui = researchUi()
  const key = blockKey(paperId, pageNo, blockId)
  const idx = ui.read.highlights.indexOf(key)
  if (idx >= 0) ui.read.highlights.splice(idx, 1)
  else ui.read.highlights.push(key)
  return idx < 0
}

export function isHighlighted(paperId, pageNo, blockId) {
  return researchUi().read.highlights.includes(blockKey(paperId, pageNo, blockId))
}

/* ───────────────────────── 写作 ───────────────────────── */

export function filesForWritingProject(project) {
  const ui = researchUi()
  if (!project) return {}
  if (!ui.write.filesByProject[project.id]) {
    const wp = writingProjects[project.writeProjectId]
    const seed = wp ? initialWritingFiles(project.writeProjectId) : starterWritingFiles(project.name)
    ui.write.filesByProject[project.id] = normalizeFiles(seed)
    ui.write.activeFileByProject[project.id] = 'main.tex'
    ui.write.openFilesByProject[project.id] = ['main.tex']
    ui.write.savedAtByProject[project.id] = Date.now()
    ui.write.dirtyByProject[project.id] = false
    ui.write.previewPageByProject[project.id] = 1
  }
  return ui.write.filesByProject[project.id]
}

export function writingProjectBundle(project) {
  const ui = researchUi()
  const files = filesForWritingProject(project)
  return {
    files,
    activeFile: ui.write.activeFileByProject[project.id] || 'main.tex',
    openFiles: ui.write.openFilesByProject[project.id] || ['main.tex'],
    savedAt: ui.write.savedAtByProject[project.id] || null,
    dirty: !!ui.write.dirtyByProject[project.id],
    compile:
      ui.write.compileByProject[project.id] || {
        status: 'idle',
        version: 0,
        at: null,
        duration: null,
        errors: [],
        warnings: [],
        infos: [],
        log: [],
        lastSuccess: null,
      },
    previewPage: ui.write.previewPageByProject[project.id] || 1,
  }
}

export function patchProject(projectId, mutate) {
  const ui = researchUi()
  const bundle = ui.write.compileByProject[projectId]
  mutate(ui, projectId)
  return bundle
}

/** 项目资产（数据层声明的 figures/tables；只展示、不参与离线编译）。 */
export function assetsForProject(project) {
  const wp = writingProjects[project?.writeProjectId]
  return wp?.assets || []
}
