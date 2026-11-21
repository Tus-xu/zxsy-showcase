<template>
  <div class="home" data-testid="research-home">
    <div class="home__inner">
      <section class="hero">
        <div class="hero__text">
          <div class="hero__eyebrow">Mathesis · 科研工作台</div>
          <h1 class="hero__title">阅读、核查、写作与编译，一处完成</h1>
          <p class="hero__sub">
            从随包演示讲义中选取段落向 Research Agent 提问，或直接进入 LaTeX 写作工作区：编辑、保存、编译、
            定位错误并导出真实 PDF。全部数据随包本地运行，断网可用。
          </p>
          <div class="hero__facts">
            <div><b>{{ projects.length }}</b><span>演示项目</span></div>
            <div><b>{{ totalPapers }}</b><span>随包讲义</span></div>
            <div><b>{{ formulaChecks.length }}</b><span>公式核查案例</span></div>
            <div><b>{{ noteCount }}</b><span>笔记</span></div>
          </div>
        </div>
        <div class="hero__side">
          <button class="btn btn--primary hero__new" data-testid="home-new-project" @click="newOpen = true">＋ 新建项目</button>
          <button class="btn" data-testid="home-goto-read" @click="enterRead(defaultProject)">进入阅读工作区 →</button>
          <button class="btn" data-testid="home-goto-write" @click="enterWrite(defaultProject)">进入写作工作区 →</button>
          <p class="hero__hint">演示声明：{{ RESEARCH_DISCLAIMER }}；Agent 结论均为离线审核结果，非模型实时生成。</p>
        </div>
      </section>

      <section class="section">
        <div class="section__head">
          <h2>我的项目</h2>
          <span class="section__sub">项目即工作区：阅读与写作共用同一项目 ID 与上下文</span>
        </div>
        <div class="projects">
          <article v-for="p in projects" :key="p.id" class="proj" :data-testid="'home-project-' + p.id">
            <div class="proj__top">
              <div class="proj__cover" :class="'proj__cover--' + (p.cover || 'writing')">{{ coverMark(p) }}</div>
              <div class="proj__id">
                <h3 :title="p.name">{{ p.name }}</h3>
                <span>{{ p.custom ? '新建项目' : '演示项目' }}</span>
              </div>
              <button v-if="p.custom" class="proj__del" title="删除新建项目" @click="removeProject(p)">✕</button>
            </div>
            <p class="proj__desc">{{ p.desc }}</p>
            <p class="proj__memory">{{ p.memory }}</p>
            <div class="proj__stats">
              <div><b>{{ statsOf(p).papers }}</b><span>文献</span></div>
              <div><b>{{ statsOf(p).drafts }}</b><span>草稿</span></div>
              <div><b>{{ statsOf(p).notes }}</b><span>笔记</span></div>
              <div><b>{{ statsOf(p).data }}</b><span>数据</span></div>
            </div>
            <div class="proj__papers">
              <span v-for="paper in papersOf(p).slice(0, 2)" :key="paper.id" class="proj__paper">📄 {{ paper.short }}</span>
              <span v-if="!papersOf(p).length" class="proj__paper proj__paper--empty">暂无文献（空白工程）</span>
            </div>
            <div class="proj__actions">
              <button class="btn btn--primary" :data-testid="'home-read-' + p.id" @click="enterRead(p)">进入阅读</button>
              <button class="btn" :data-testid="'home-write-' + p.id" @click="enterWrite(p)">进入写作</button>
            </div>
          </article>
        </div>
      </section>

      <section class="section">
        <div class="section__head">
          <h2>最近笔记</h2>
          <span class="section__sub">点击可回到原文页与段落；刷新后笔记仍在</span>
          <button class="section__more" @click="enterReadWithNotes">查看全部 →</button>
        </div>
        <div v-if="!notes.length" class="empty">
          <b>还没有笔记</b>
          <span>进入阅读工作区，点选论文中的一段话，在浮动工具条里「添加笔记」。</span>
        </div>
        <div v-else class="notes">
          <button v-for="n in notes" :key="n.key" class="note" :data-testid="'home-note-' + n.key" @click="openNote(n)">
            <span class="note__ico">📄</span>
            <span class="note__body">
              <b>{{ n.title }}</b>
              <small>{{ projectName(n.projectId) }}{{ n.paperId ? ' · 第 ' + n.page + ' 页' : '' }}</small>
            </span>
            <span class="note__time">{{ n.timeText }}</span>
          </button>
        </div>
      </section>

      <footer class="home__foot">
        <span>随包演示材料 · 断网可用 · 页面引文与页码均可在讲义中核对</span>
        <span>离线演示审核结论，非模型实时生成</span>
      </footer>
    </div>

    <div v-if="newOpen" class="modal" data-testid="home-new-dialog" @click.self="newOpen = false">
      <div class="modal__card">
        <div class="modal__head"><b>新建科研项目</b><button class="modal__x" @click="newOpen = false">✕</button></div>
        <p class="modal__hint">新建项目会附带一个最小可编译 LaTeX 起步工程（main.tex + refs.bib），保存在本地演示状态中。</p>
        <label class="modal__label">项目名称<input v-model="newName" placeholder="例如：特征值问题的误差分析" data-testid="home-new-name" /></label>
        <label class="modal__label">项目描述<input v-model="newDesc" placeholder="一句话说明研究主题（可留空）" data-testid="home-new-desc" /></label>
        <div class="modal__foot">
          <button class="btn" @click="newOpen = false">取消</button>
          <button class="btn btn--primary" data-testid="home-new-create" @click="createProject">创建并进入写作</button>
        </div>
      </div>
    </div>

    <div v-if="toastText" class="toast" data-testid="home-toast">{{ toastText }}</div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../../state/demo'
import {
  RESEARCH_DISCLAIMER,
  allProjects,
  createCustomProject,
  deleteCustomProject,
  enterReadProject,
  filesForWritingProject,
  formulaChecks,
  papersForProject,
  projectStats,
  recentNotes,
  researchUi,
  resetResearchUi,
  resolveProject,
} from '../../components/research/researchUi'

const router = useRouter()
const ui = researchUi()
const newOpen = ref(false)
const newName = ref('')
const newDesc = ref('')
const toastText = ref('')
let toastTimer = null

const projects = computed(() => allProjects())
const totalPapers = computed(() => projects.value.reduce((n, p) => n + papersForProject(p).length, 0))
const notes = computed(() => recentNotes(null, 6))
const noteCount = computed(() => notes.value.length)
const defaultProject = computed(() => resolveProject(ui.read.projectId || store.research.projectId || projects.value[0]?.id))

function statsOf(p) {
  return projectStats(p)
}
function papersOf(p) {
  return papersForProject(p)
}
function coverMark(p) {
  return p.cover === 'fem' ? '∫' : p.cover === 'condition' ? '√' : '{ }'
}
function projectName(id) {
  return allProjects().find((p) => p.id === id)?.name || '科研项目'
}
function enterRead(p) {
  if (!p) return
  enterReadProject(p)
  router.push({ path: '/research/read', query: { project: p.id } })
}
function enterWrite(p) {
  if (!p) return
  ui.write.projectId = p.id
  store.research.projectId = p.id
  filesForWritingProject(p)
  router.push({ path: '/research/write', query: { project: p.id } })
}
function enterReadWithNotes() {
  enterRead(defaultProject.value)
  setTimeout(() => (ui.read.section = 'notes'), 60)
}
function openNote(n) {
  const project = resolveProject(n.projectId || defaultProject.value.id)
  enterReadProject(project)
  router.push({
    path: '/research/read',
    query: { project: project.id, paper: n.paperId || undefined, page: n.page || undefined, block: n.block || undefined },
  })
}
function createProject() {
  const p = createCustomProject(newName.value, newDesc.value)
  newOpen.value = false
  newName.value = ''
  newDesc.value = ''
  pushToast(`已新建项目「${p.name}」，已进入写作工作区`)
  enterWrite(p)
}
function removeProject(p) {
  deleteCustomProject(p.id)
  pushToast(`已删除项目「${p.name}」`)
}
function pushToast(text) {
  toastText.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastText.value = ''), 2600)
}
</script>

<style scoped>
.home {
  height: 100%;
  overflow-y: auto;
  background: var(--rw-app-bg);
  color: var(--rw-text);
  font-family: var(--rw-font-sans);
}
.home__inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 26px 30px 30px;
}
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 26px;
  padding: 24px 26px;
  border: 1px solid var(--rw-border);
  border-radius: 14px;
  background: linear-gradient(120deg, #ffffff 0%, #f5f7ff 60%, #eef7ff 100%);
  box-shadow: var(--rw-shadow-card);
}
.hero__eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--rw-primary);
  font-weight: 700;
  text-transform: uppercase;
}
.hero__title {
  margin: 8px 0 8px;
  font-size: 26px;
  line-height: 1.35;
  font-weight: 800;
  color: var(--rw-brand-title);
  letter-spacing: 0.01em;
}
.hero__sub {
  margin: 0;
  max-width: 640px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--rw-text-2);
}
.hero__facts {
  display: flex;
  gap: 30px;
  margin-top: 18px;
}
.hero__facts > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hero__facts b {
  font-size: 22px;
  font-weight: 800;
  color: var(--rw-primary);
  font-family: var(--rw-font-latin);
}
.hero__facts span {
  font-size: 11px;
  color: var(--rw-text-3);
}
.hero__side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  justify-content: center;
}
.hero__new {
  height: 36px;
}
.hero__hint {
  margin: 4px 0 0;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--rw-text-3);
}
.btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 7px;
  border: 1px solid var(--rw-border);
  background: var(--rw-surface);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--rw-text-2);
}
.btn:hover {
  border-color: var(--rw-border-strong);
}
.btn--primary {
  background: var(--rw-primary);
  border-color: var(--rw-primary);
  color: #fff;
  font-weight: 600;
}
.btn--primary:hover {
  background: var(--rw-primary-hover);
}
.section {
  margin-top: 24px;
}
.section__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 11px;
}
.section__head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.section__sub {
  font-size: 11.5px;
  color: var(--rw-text-3);
}
.section__more {
  margin-left: auto;
  border: 0;
  background: none;
  color: var(--rw-primary);
  font-size: 11.5px;
}
.projects {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.proj {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--rw-border);
  border-radius: 11px;
  background: var(--rw-surface);
  box-shadow: var(--rw-shadow-card);
}
.proj__top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.proj__cover {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 19px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
}
.proj__cover--condition {
  background: linear-gradient(135deg, #0ea5e9, #22c55e);
}
.proj__cover--writing {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
}
.proj__id {
  flex: 1;
  min-width: 0;
}
.proj__id h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.proj__id span {
  font-size: 10.5px;
  color: var(--rw-text-3);
}
.proj__del {
  border: 0;
  background: none;
  color: var(--rw-text-3);
  font-size: 11px;
  width: 20px;
  height: 20px;
}
.proj__del:hover {
  color: var(--rw-danger);
}
.proj__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--rw-text-2);
}
.proj__memory {
  margin: 0;
  font-size: 11px;
  line-height: 1.65;
  color: var(--rw-text-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}
.proj__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--rw-border);
  border-bottom: 1px solid var(--rw-border);
  padding: 7px 0;
}
.proj__stats > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid var(--rw-border);
}
.proj__stats > div:last-child {
  border-right: 0;
}
.proj__stats b {
  font-size: 14px;
  font-weight: 700;
}
.proj__stats span {
  font-size: 10px;
  color: var(--rw-text-3);
}
.proj__papers {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 22px;
}
.proj__paper {
  font-size: 10.5px;
  color: var(--rw-text-2);
  background: var(--rw-inset);
  border-radius: 5px;
  padding: 2px 7px;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.proj__paper--empty {
  color: var(--rw-text-3);
}
.proj__actions {
  display: flex;
  gap: 7px;
  margin-top: auto;
}
.proj__actions .btn {
  flex: 1;
  height: 30px;
  padding: 0;
  font-size: 12px;
}
.notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}
.note {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border: 1px solid var(--rw-border);
  border-radius: 9px;
  background: var(--rw-surface);
  text-align: left;
}
.note:hover {
  border-color: var(--rw-border-strong);
}
.note__ico {
  font-size: 13px;
}
.note__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.note__body b {
  font-size: 12.5px;
  color: var(--rw-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note__body small {
  font-size: 10.5px;
  color: var(--rw-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note__time {
  flex: none;
  font-size: 10.5px;
  color: var(--rw-text-3);
}
.empty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px;
  border: 1px dashed var(--rw-border-strong);
  border-radius: 10px;
  font-size: 12px;
  color: var(--rw-text-2);
  background: var(--rw-surface);
}
.empty b {
  color: var(--rw-text);
  font-size: 13px;
}
.home__foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 26px;
  padding-top: 12px;
  border-top: 1px solid var(--rw-border);
  font-size: 10.5px;
  color: var(--rw-text-3);
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
  display: grid;
  place-items: center;
  z-index: 80;
}
.modal__card {
  width: 440px;
  max-width: calc(100vw - 40px);
  background: var(--rw-surface);
  border-radius: 12px;
  box-shadow: var(--rw-shadow-pop);
  padding: 16px 18px;
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.modal__head b {
  font-size: 15px;
}
.modal__x {
  border: 0;
  background: none;
  color: var(--rw-text-3);
  font-size: 14px;
}
.modal__hint {
  margin: 0 0 12px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--rw-text-2);
}
.modal__label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: var(--rw-text-2);
  margin-bottom: 10px;
}
.modal__label input {
  height: 32px;
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  padding: 0 9px;
  font-size: 13px;
  color: var(--rw-text);
}
.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  background: #111827;
  color: #f9fafb;
  font-size: 12.5px;
  padding: 9px 16px;
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.3);
  z-index: 90;
  white-space: nowrap;
}
@media (max-width: 1280px) {
  .projects {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
