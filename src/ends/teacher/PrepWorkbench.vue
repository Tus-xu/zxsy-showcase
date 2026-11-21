<template>
  <div class="prep-wb" data-testid="prep-workbench">
    <!-- 未找到会话 -->
    <div v-if="!target" class="prep-wb__missing">
      <div class="prep-wb__missing-card">
        <b>备课会话不存在</b>
        <p>当前演示数据中只有三节课（椭圆、二次函数配方、集合关系），请返回备课中心重新进入。</p>
        <button class="pw-action-btn pw-action-btn--primary" type="button" @click="router.push('/teacher/prep')">返回备课中心</button>
      </div>
    </div>

    <template v-else-if="target && session">
      <!-- 工作台顶栏（对齐 PPT-GOLDEN 结构） -->
      <header class="pw-header">
        <div class="pw-brand">
          <span class="pw-brand__logo">S</span>
          <span class="pw-brand__text">智学备课</span>
        </div>

        <div class="pw-title">
          <div class="pw-title__main">
            {{ target.title }}<span class="pw-title__sub">· {{ target.subtitle }}</span>
            <span v-if="target.isCustom" class="pw-title__badge">新一轮备课</span>
            <span v-if="publishedVersion" class="pw-title__published" data-testid="header-published">
              已发布 v{{ publishedVersion }}
            </span>
          </div>
          <div class="pw-title__meta">{{ target.meta.textbook }} · {{ target.meta.className }} · {{ target.meta.duration }}</div>
        </div>

        <nav class="pw-tabs" role="tablist" aria-label="备课视图">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            role="tab"
            class="pw-tab"
            :class="{ 'is-active': tab === t.key }"
            :aria-selected="tab === t.key"
            :data-testid="`tab-${t.key}`"
            @click="switchTab(t.key)"
          >
            {{ t.label }}
          </button>
        </nav>

        <div class="pw-actions">
          <span class="pw-saved" :data-testid="'saved-indicator'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m4 12.5 5 5L20 6.5" /></svg>
            <span>{{ savedLabel }}</span>
          </span>
          <button class="pw-action-btn" type="button" data-testid="preview-open" @click="openPreview">预览演示</button>
          <button v-if="tab === 'ppt'" class="pw-action-btn" type="button" data-testid="sync-to-plan" @click="onSyncToPlan">
            同步到教案
          </button>
          <button v-if="tab === 'plan'" class="pw-action-btn" type="button" data-testid="header-export-docx" :disabled="!!exporting" @click="runExport('docx')">
            导出
          </button>
          <div class="pw-teacher">
            <span class="pw-teacher__avatar">张</span>
            <span class="pw-teacher__name">张老师</span>
          </div>
          <div class="pw-more-wrap">
            <button class="pw-more" type="button" data-testid="more-menu-btn" title="更多操作" @click.stop="moreOpen = !moreOpen">⋯</button>
            <div v-if="moreOpen" class="pw-more-menu" @click.stop>
              <button type="button" @click="goHistory">备课历史</button>
              <button type="button" @click="router.push('/teacher/prep')">返回备课中心</button>
              <div class="pw-more-menu__sep" />
              <button type="button" class="pw-more-menu__danger" data-testid="reset-edits" @click="resetEdits">重置本课时编辑</button>
            </div>
          </div>
        </div>
      </header>

      <!-- 主体：三个 Tab -->
      <div class="pw-body">
        <DesignPane
          v-if="tab === 'classroom'"
          :session="session"
          :target="target"
          :published-version="publishedVersion"
          @switch-tab="switchTab"
          @publish="openPublish"
        />

        <template v-else-if="tab === 'ppt'">
          <SlidesSidebar
            :slides="session.slides"
            :active-index="activeSlide"
            :deck-id="target.deckId"
            @select="selectSlide"
            @move="onMoveSlide"
          />

          <main class="pw-center">
            <div class="pw-ppt-toolbar">
              <div class="pw-ppt-toolbar__left">
                <button class="pw-tool" type="button" data-testid="add-slide" @click="onAddSlide">＋ 添加页</button>
                <button class="pw-tool" type="button" data-testid="delete-slide" :disabled="session.slides.length <= 1" @click="onDeleteSlide">删除本页</button>
                <span class="pw-tool-sep" />
                <span class="pw-tool-hint">共 {{ session.slides.length }} 页 · 标题可直接点击修改</span>
              </div>
              <div class="pw-ppt-toolbar__right">
                <button class="pw-tool" type="button" data-testid="export-pptx" :disabled="!!exporting" @click="runExport('pptx')">
                  {{ exporting === 'pptx' ? '导出中…' : '导出 PPTX' }}
                </button>
                <button class="pw-tool" type="button" data-testid="export-pdf" :disabled="!!exporting" @click="runExport('pdf')">
                  {{ exporting === 'pdf' ? '导出中…' : '导出 PDF' }}
                </button>
                <button class="pw-tool pw-tool--primary" type="button" data-testid="publish-open" @click="openPublish">发布课堂</button>
              </div>
            </div>

            <div class="pw-canvas-area" :class="{ 'is-grid': showGrid }" @click.self="moreOpen = false">
              <div class="pw-canvas-scaler" :style="{ transform: `scale(${zoom / 100})` }">
                <SlideCanvas
                  v-if="slide"
                  :slide="slide"
                  :deck="deckForCanvas"
                  :deck-id="target.deckId"
                  :index="activeSlide"
                  :derived="derived"
                  :opts="style"
                  :animate="animate"
                  @update:title="onTitleInput"
                />
              </div>
              <button v-if="!panelOpen" class="pw-reopen-panel" type="button" @click="panelOpen = true">智能属性 ›</button>
            </div>

            <div class="pw-bottom">
              <div class="pw-pager">
                <button class="pw-pager__btn" type="button" data-testid="pager-prev" :disabled="activeSlide <= 0" @click="selectSlide(activeSlide - 1)">‹</button>
                <span class="pw-pager__text" data-testid="slide-counter">幻灯片 {{ activeSlide + 1 }} / {{ session.slides.length }}</span>
                <button
                  class="pw-pager__btn"
                  type="button"
                  data-testid="pager-next"
                  :disabled="activeSlide >= session.slides.length - 1"
                  @click="selectSlide(activeSlide + 1)"
                >
                  ›
                </button>
              </div>

              <div class="pw-ai">
                <div v-if="aiFeedback" class="pw-ai__feedback" :class="{ 'is-error': !aiOk }" data-testid="ai-feedback">
                  {{ aiFeedback }}
                </div>
                <div class="pw-ai__box">
                  <span class="pw-ai__star">✦</span>
                  <input
                    v-model="aiText"
                    class="pw-ai__input"
                    data-testid="ai-input"
                    placeholder="告诉 AI 如何修改当前页…（标题：… / 添加要点：… / a=6 b=4 / 让本页更简洁）"
                    @keyup.enter="runAi"
                  />
                  <button class="pw-ai__send" type="button" data-testid="ai-send" title="发送" @click="runAi">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>
                  </button>
                </div>
              </div>

              <div class="pw-zoom">
                <button class="pw-zoom__btn" type="button" data-testid="zoom-out" @click="setZoom(zoom - 10)">−</button>
                <span class="pw-zoom__value" data-testid="zoom-value">{{ zoom }}%</span>
                <button class="pw-zoom__btn" type="button" data-testid="zoom-in" @click="setZoom(zoom + 10)">＋</button>
                <button class="pw-zoom__grid" type="button" title="显示网格" :class="{ 'is-on': showGrid }" @click="showGrid = !showGrid">▦</button>
              </div>
            </div>
          </main>

          <PropertyPanel
            v-if="panelOpen"
            :deck-id="target.deckId"
            :params="session.params"
            :derived="derived"
            :opts="style"
            :animate="animate"
            @update-param="onParamChange"
            @update-style="onStyleChange"
            @action="onPanelAction"
            @reset-style="resetStyle"
            @close="panelOpen = false"
          />
        </template>

        <PlanPane
          v-else
          :session="session"
          :target="target"
          :exporting="!!exporting"
          @export="runExport"
          @publish="openPublish"
        />
      </div>

      <!-- 导出 / 操作反馈 -->
      <transition name="toast">
        <div v-if="toast" class="pw-toast" :class="{ 'is-error': !toast.ok }" data-testid="workbench-toast">
          <span class="pw-toast__icon">{{ toast.ok ? '✓' : '!' }}</span>
          <span>{{ toast.message }}</span>
        </div>
      </transition>

      <!-- 预览演示（真实播放当前编辑后的全部页面） -->
      <Teleport to="body">
        <div v-if="previewOpen" class="pw-preview" data-testid="preview-dialog" @click.self="previewOpen = false">
          <div class="pw-preview__box">
            <div class="pw-preview__head">
              <div>
                <b>预览演示</b>
                <span>{{ target.title }} · {{ session.slides.length }} 页 · 学生端将看到“已发布”版本的快照</span>
              </div>
              <button class="pw-preview__close" type="button" data-testid="preview-close" @click="previewOpen = false">×</button>
            </div>
            <div class="pw-preview__stage">
              <SlideCanvas
                v-if="previewSlide"
                :slide="previewSlide"
                :deck="deckForCanvas"
                :deck-id="target.deckId"
                :index="previewIndex"
                :derived="derived"
                :opts="style"
                :editable="false"
              />
            </div>
            <div class="pw-preview__foot">
              <button class="pw-preview__nav" type="button" data-testid="preview-prev" :disabled="previewIndex <= 0" @click="previewIndex -= 1">‹</button>
              <span class="pw-preview__counter">{{ previewIndex + 1 }} / {{ session.slides.length }}</span>
              <button class="pw-preview__nav" type="button" data-testid="preview-next" :disabled="previewIndex >= session.slides.length - 1" @click="previewIndex += 1">›</button>
              <span class="pw-preview__hint">按 ← → 翻页 · Esc 关闭</span>
            </div>
          </div>
        </div>
      </Teleport>

      <PublishCoursewareDialog
        :open="publishOpen"
        :session-id="sessionId"
        :deck-title="target.title"
        :deck-subtitle="target.subtitle"
        :default-class="target.meta.className"
        :slide-count="session.slides.length"
        :next-version="nextVersion"
        @close="publishOpen = false"
        @published="onPublished"
      />
    </template>

    <div v-else class="prep-wb__loading">正在载入备课会话…</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../../state/demo'
import {
  applyPageAi,
  addSlide,
  computeDerived,
  deckForExport,
  deckToPdfDoc,
  deleteSlide,
  formatClock,
  moveSlide,
  normalizeTab,
  planForExport,
  publishVersionFor,
  resetPrepSessionEdits,
  resolvePrepTarget,
  sessionSummary,
  setActiveSlide,
  setParams,
  setSlideTitle,
  syncSlideToPlan,
  ensurePrepSession,
  touchPrepSession,
} from '../../data/prepPublish'
import { exportDeckPptx } from '../../lib/exportPptx'
import { exportPdf } from '../../lib/exportPdf'
import { exportPlanDocx, planToMarkdown } from '../../lib/exportDocx'
import { downloadText } from '../../lib/download'
import SlidesSidebar from '../../components/teacher/prep/SlidesSidebar.vue'
import SlideCanvas from '../../components/teacher/prep/SlideCanvas.vue'
import PropertyPanel from '../../components/teacher/prep/PropertyPanel.vue'
import DesignPane from '../../components/teacher/prep/DesignPane.vue'
import PlanPane from '../../components/teacher/prep/PlanPane.vue'
import PublishCoursewareDialog from '../../components/teacher/prep/PublishCoursewareDialog.vue'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'classroom', label: '课堂设计' },
  { key: 'ppt', label: 'PPT' },
  { key: 'plan', label: '教案' },
]

const sessionId = computed(() => String(route.params.sessionId || ''))
const tab = computed(() => normalizeTab(route.params.tab))
const target = computed(() => resolvePrepTarget(sessionId.value))
const session = computed(() => store.ext?.teacherPrep?.sessions?.[sessionId.value] || null)

const activeSlide = computed(() => {
  const slides = session.value?.slides || []
  const idx = session.value?.activeSlide ?? 0
  return Math.max(0, Math.min(idx, slides.length - 1))
})
const slide = computed(() => session.value?.slides?.[activeSlide.value] || null)
const derived = computed(() => {
  if (!target.value) return { valid: true }
  // 依赖参数与 deckId，保证编辑后图形/公式/标注同源更新
  return computeDerived(target.value.deckId, session.value?.params || {})
})
const style = computed(() => ({
  showFocus: true,
  showAxes: true,
  showAux: true,
  showLabels: true,
  color: '#2563eb',
  strokeWidth: 2.4,
  ...(session.value?.style || {}),
}))
const deckForCanvas = computed(() => ({
  title: target.value?.title || '',
  subtitle: target.value?.subtitle || '',
  meta: target.value?.meta || {},
}))
const publishedVersion = computed(() => {
  const summary = sessionSummary(sessionId.value)
  return summary?.publishedVersion || 0
})
const nextVersion = computed(() => (target.value ? publishVersionFor(target.value.deckId) : 1))
const savedLabel = computed(() => {
  const ts = session.value?.savedAt
  return ts ? `已保存 ${formatClock(ts)}` : '草稿 · 未编辑'
})

const previewOpen = ref(false)
const previewIndex = ref(0)
const publishOpen = ref(false)
const panelOpen = ref(true)
const moreOpen = ref(false)
const zoom = ref(100)
const showGrid = ref(false)
const animate = ref(false)
const aiText = ref('')
const aiFeedback = ref('')
const aiOk = ref(true)
const exporting = ref('')
const toast = ref(null)
let toastTimer = null

const previewSlide = computed(() => session.value?.slides?.[previewIndex.value] || null)

/** 初始化 / 切换会话：确保编辑状态存在（写 store.ext.teacherPrep） */
watch(
  sessionId,
  (id) => {
    if (!id) return
    const sess = ensurePrepSession(id)
    if (sess) {
      if (typeof store.teacher?.prep === 'object') store.teacher.prep.activeSessionId = id
      previewIndex.value = sess.activeSlide || 0
    }
    // 切课时重置本页视图态，避免上一课时的提示/缩放/动画串场
    animate.value = false
    zoom.value = 100
    aiText.value = ''
    aiFeedback.value = ''
    aiOk.value = true
    exporting.value = ''
    toast.value = null
    moreOpen.value = false
  },
  { immediate: true },
)
watch(tab, () => {
  moreOpen.value = false
  if (tab.value !== 'ppt') animate.value = false
})

function switchTab(key) {
  const next = normalizeTab(key)
  const sess = ensurePrepSession(sessionId.value)
  if (sess) sess.tab = next
  router.push(`/teacher/prep/w/${sessionId.value}/${next}`)
}

function selectSlide(index) {
  setActiveSlide(sessionId.value, index)
  previewIndex.value = activeSlide.value
}

function onMoveSlide(index, dir) {
  moveSlide(sessionId.value, index, dir)
}

function onAddSlide() {
  addSlide(sessionId.value)
  showToast(true, `已添加第 ${session.value.slides.length} 页（可编辑并导出）`)
}

function onDeleteSlide() {
  const page = activeSlide.value + 1
  if (!deleteSlide(sessionId.value, activeSlide.value)) {
    showToast(false, '至少保留一页，无法删除')
    return
  }
  showToast(true, `已删除第 ${page} 页`)
}

function onTitleInput(value) {
  setSlideTitle(sessionId.value, activeSlide.value, value)
}

function onParamChange({ key, value }) {
  if (value === '' || value === null) return
  setParams(sessionId.value, { [key]: value })
}

function onStyleChange(patch) {
  const sess = ensurePrepSession(sessionId.value)
  if (!sess) return
  sess.style = { ...(sess.style || {}), ...patch }
  touchPrepSession(sessionId.value)
}

function resetStyle() {
  const sess = ensurePrepSession(sessionId.value)
  if (!sess) return
  sess.style = { showFocus: true, showAxes: true, showAux: true, showLabels: true, color: '#2563eb', strokeWidth: 2.4 }
  touchPrepSession(sessionId.value)
  showToast(true, '已恢复默认图形样式')
}

function onPanelAction(action) {
  if (action === 'animate') {
    animate.value = !animate.value
    return
  }
  if (action === 'simplify') {
    const res = applyPageAi(sessionId.value, activeSlide.value, '让本页更简洁')
    aiOk.value = res.ok
    aiFeedback.value = res.message
    return
  }
  if (action === 'sync') onSyncToPlan()
}

function runAi() {
  const res = applyPageAi(sessionId.value, activeSlide.value, aiText.value)
  aiOk.value = res.ok
  aiFeedback.value = res.message
  if (res.ok) aiText.value = ''
}

function onSyncToPlan() {
  const line = syncSlideToPlan(sessionId.value, activeSlide.value)
  if (line) showToast(true, `已同步到教案：${line.replace(/^- /, '')}`)
  else showToast(false, '当前课时没有可同步的教案')
}

function setZoom(value) {
  zoom.value = Math.max(70, Math.min(130, value))
}

function openPreview() {
  previewIndex.value = activeSlide.value
  previewOpen.value = true
}

function openPublish() {
  publishOpen.value = true
}

function onPublished(record) {
  showToast(true, `published · 已发布到 ${record.className} · 版本 ${record.meta?.versionLabel}`)
}

function showToast(ok, message) {
  toast.value = { ok, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 5200)
}

function goHistory() {
  moreOpen.value = false
  router.push('/teacher/prep/history')
}

function resetEdits() {
  moreOpen.value = false
  resetPrepSessionEdits(sessionId.value)
  showToast(true, '已重置本课时编辑（发布历史保留）')
}

function fileStamp() {
  const d = new Date()
  const pad = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

async function runExport(kind) {
  if (!target.value || !session.value || exporting.value) return
  exporting.value = kind
  try {
    if (kind === 'pptx' || kind === 'pdf') {
      const deck = deckForExport(sessionId.value)
      if (!deck) throw new Error('没有可导出的课件')
      const base = `${deck.title}-${target.value.className}-${fileStamp()}`
      if (kind === 'pptx') {
        const res = await exportDeckPptx(deck, `${base}-课件.pptx`)
        showToast(true, `PPTX 导出成功：${res.name} · ${(res.bytes / 1024).toFixed(1)} KB · ${deck.slides.length} 页`)
      } else {
        const res = await exportPdf(deckToPdfDoc(deck), `${base}-课件.pdf`)
        showToast(true, `PDF 导出成功：${res.name} · ${(res.bytes / 1024).toFixed(1)} KB`)
      }
      rememberExportSafe(kind, true)
      return
    }
    if (kind === 'docx' || kind === 'markdown') {
      const plan = planForExport(sessionId.value)
      if (!plan) throw new Error('当前课时没有教案')
      const base = `${plan.title.replace(/[《》]/g, '')}-${target.value.className}-${fileStamp()}`
      if (kind === 'docx') {
        const res = await exportPlanDocx(plan, `${base}-教案.docx`)
        showToast(true, `DOCX 导出成功：${res.name} · ${(res.bytes / 1024).toFixed(1)} KB`)
      } else {
        const text = planToMarkdown(plan)
        const name = `${base}-教案.md`
        downloadText(text, name, 'text/markdown')
        showToast(true, `Markdown 导出成功：${name} · ${(new Blob([text]).size / 1024).toFixed(1)} KB`)
      }
      rememberExportSafe(kind, true)
      return
    }
    throw new Error(`不支持的导出格式：${kind}`)
  } catch (err) {
    showToast(false, `导出失败：${err instanceof Error ? err.message : String(err)}`)
    rememberExportSafe(kind, false)
  } finally {
    exporting.value = ''
  }
}

function rememberExportSafe(kind, ok) {
  try {
    const sess = ensurePrepSession(sessionId.value)
    if (sess) sess.lastExport = { kind, ok, at: Date.now() }
  } catch {
    /* ignore */
  }
}

function onKeydown(e) {
  const tag = (e.target?.tagName || '').toUpperCase()
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
  if (e.key === 'Escape') {
    if (previewOpen.value) previewOpen.value = false
    else if (publishOpen.value) publishOpen.value = false
    else if (moreOpen.value) moreOpen.value = false
    return
  }
  if (typing || tab.value !== 'ppt' || previewOpen.value) {
    if (previewOpen.value && !typing) {
      if (e.key === 'ArrowLeft') previewIndex.value = Math.max(0, previewIndex.value - 1)
      if (e.key === 'ArrowRight') previewIndex.value = Math.min(session.value.slides.length - 1, previewIndex.value + 1)
    }
    return
  }
  if (e.key === 'ArrowLeft') selectSlide(activeSlide.value - 1)
  if (e.key === 'ArrowRight') selectSlide(activeSlide.value + 1)
}
function closeMenus() {
  moreOpen.value = false
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', closeMenus)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', closeMenus)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.prep-wb {
  position: relative;
  height: calc(100vh - 56px - 44px);
  min-height: 560px;
  background: #f6f8fb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.prep-wb__missing {
  flex: 1;
  display: grid;
  place-items: center;
}
.prep-wb__loading {
  flex: 1;
  display: grid;
  place-items: center;
  font-size: 13px;
  color: #94a3b8;
}
.prep-wb__missing-card {
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 14px;
  padding: 26px 32px;
  max-width: 440px;
  text-align: center;
}
.prep-wb__missing-card b {
  font-size: 15px;
  color: #0f172a;
}
.prep-wb__missing-card p {
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.7;
  margin: 8px 0 16px;
}
/* ── 顶栏 ── */
.pw-header {
  height: 56px;
  flex: none;
  background: #fff;
  border-bottom: 1px solid #e5e9f2;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  position: relative;
  z-index: 20;
}
.pw-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.pw-brand__logo {
  width: 27px;
  height: 27px;
  border-radius: 7px;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  display: grid;
  place-items: center;
  font-family: Georgia, serif;
}
.pw-brand__text {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
}
.pw-title {
  min-width: 0;
  flex: none;
  max-width: 360px;
  padding-left: 6px;
  border-left: 1px solid #eef2f7;
}
.pw-title__main {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pw-title__sub {
  font-weight: 500;
  color: #64748b;
  font-size: 12.5px;
}
.pw-title__badge {
  font-size: 10px;
  font-weight: 600;
  color: #7c3aed;
  background: #f3eefd;
  border: 1px solid #ddd0f8;
  border-radius: 999px;
  padding: 0 6px;
  flex: none;
}
.pw-title__published {
  font-size: 10px;
  font-weight: 600;
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  padding: 0 6px;
  flex: none;
}
.pw-title__meta {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pw-tabs {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}
.pw-tab {
  position: relative;
  border: 0;
  background: none;
  padding: 18px 16px 17px;
  font-size: 13.5px;
  font-weight: 600;
  color: #64748b;
}
.pw-tab:hover {
  color: #2563eb;
}
.pw-tab.is-active {
  color: #2563eb;
}
.pw-tab.is-active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: #2563eb;
}
.pw-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.pw-saved {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: #16a34a;
  font-weight: 600;
  white-space: nowrap;
}
.pw-action-btn {
  height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.pw-action-btn:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}
.pw-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pw-action-btn--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.pw-teacher {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 4px;
}
.pw-teacher__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.pw-teacher__name {
  font-size: 12.5px;
  font-weight: 600;
  color: #0f172a;
}
.pw-more-wrap {
  position: relative;
}
.pw-more {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid #e5e9f2;
  background: #fff;
  color: #64748b;
  font-size: 16px;
  line-height: 1;
  display: grid;
  place-items: center;
}
.pw-more:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.pw-more-menu {
  position: absolute;
  right: 0;
  top: 34px;
  width: 178px;
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 10px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.14);
  padding: 5px;
  z-index: 60;
}
.pw-more-menu button {
  display: block;
  width: 100%;
  border: 0;
  background: none;
  text-align: left;
  font-size: 12.5px;
  color: #334155;
  padding: 7px 10px;
  border-radius: 7px;
}
.pw-more-menu button:hover {
  background: #f1f5f9;
}
.pw-more-menu__sep {
  height: 1px;
  background: #f1f5f9;
  margin: 4px 2px;
}
.pw-more-menu__danger {
  color: #dc2626 !important;
}
/* ── 主体 ── */
.pw-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.pw-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #f6f8fb;
}
.pw-ppt-toolbar {
  height: 40px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid #e5e9f2;
}
.pw-ppt-toolbar__left,
.pw-ppt-toolbar__right {
  display: flex;
  align-items: center;
  gap: 7px;
}
.pw-tool {
  height: 26px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #334155;
  font-size: 12px;
  white-space: nowrap;
}
.pw-tool:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}
.pw-tool:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pw-tool--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.pw-tool--primary:hover:not(:disabled) {
  background: #1d4ed8;
  color: #fff;
}
.pw-tool-sep {
  width: 1px;
  height: 16px;
  background: #e5e9f2;
  margin: 0 3px;
}
.pw-tool-hint {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}
.pw-canvas-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 22px;
  position: relative;
}
.pw-canvas-area.is-grid {
  background-image:
    linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}
.pw-canvas-scaler {
  width: 100%;
  max-width: 100%;
  transition: transform 0.12s ease;
  transform-origin: center center;
}
.pw-reopen-panel {
  position: absolute;
  right: 10px;
  top: 12px;
  border: 1px solid #dbe6fb;
  background: #eff4ff;
  color: #2563eb;
  border-radius: 8px;
  font-size: 11.5px;
  padding: 5px 9px;
}
.pw-bottom {
  height: 60px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: #fff;
  border-top: 1px solid #e5e9f2;
  position: relative;
}
.pw-pager {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}
.pw-pager__btn {
  width: 27px;
  height: 27px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 15px;
  line-height: 1;
  display: grid;
  place-items: center;
}
.pw-pager__btn:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}
.pw-pager__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.pw-pager__text {
  font-size: 11.5px;
  color: #64748b;
  margin: 0 6px;
  white-space: nowrap;
}
.pw-ai {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.pw-ai__feedback {
  max-width: 100%;
  font-size: 11px;
  line-height: 1.5;
  color: #047857;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 7px;
  padding: 3px 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pw-ai__feedback.is-error {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}
.pw-ai__box {
  width: 100%;
  max-width: 640px;
  height: 38px;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 5px 0 13px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.pw-ai__box:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.pw-ai__star {
  color: #2563eb;
  font-size: 12px;
  flex: none;
}
.pw-ai__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  color: #1f2937;
}
.pw-ai__input::placeholder {
  color: #a8b6c8;
}
.pw-ai__send {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 0;
  background: #2563eb;
  color: #fff;
  display: grid;
  place-items: center;
  flex: none;
}
.pw-ai__send:hover {
  background: #1d4ed8;
}
.pw-zoom {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: none;
}
.pw-zoom__btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 13px;
  line-height: 1;
  display: grid;
  place-items: center;
}
.pw-zoom__btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.pw-zoom__value {
  width: 42px;
  text-align: center;
  font-size: 11.5px;
  color: #64748b;
}
.pw-zoom__grid {
  width: 26px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #94a3b8;
  font-size: 12px;
  margin-left: 2px;
}
.pw-zoom__grid.is-on {
  border-color: #2563eb;
  color: #2563eb;
  background: #eff4ff;
}
/* ── 反馈 toast ── */
.pw-toast {
  position: absolute;
  left: 50%;
  bottom: 76px;
  transform: translateX(-50%);
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12.5px;
  border-radius: 10px;
  padding: 9px 15px;
  box-shadow: 0 16px 40px rgba(2, 6, 23, 0.32);
  max-width: 80%;
}
.pw-toast.is-error {
  background: #7f1d1d;
}
.pw-toast__icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  display: grid;
  place-items: center;
  font-size: 11px;
  flex: none;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}
/* ── 预览 ── */
.pw-preview {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(15, 23, 42, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}
.pw-preview__box {
  width: min(1180px, 94vw);
  background: #0f172a;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 30px 90px rgba(2, 6, 23, 0.6);
}
.pw-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  color: #e2e8f0;
}
.pw-preview__head b {
  font-size: 14px;
  display: block;
}
.pw-preview__head span {
  display: block;
  font-size: 11.5px;
  color: #94a3b8;
}
.pw-preview__close {
  border: 0;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  font-size: 17px;
  line-height: 1;
}
.pw-preview__stage {
  padding: 0 18px;
}
.pw-preview__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  color: #cbd5e1;
}
.pw-preview__nav {
  width: 32px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
  font-size: 16px;
  line-height: 1;
}
.pw-preview__nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.pw-preview__counter {
  font-size: 12.5px;
  min-width: 52px;
  text-align: center;
}
.pw-preview__hint {
  margin-left: auto;
  font-size: 11px;
  color: #64748b;
}
</style>
