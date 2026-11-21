<template>
  <div v-if="session" class="du" data-test="dual-view">
    <!-- 顶栏：返回课堂 + 课堂来源 + 进度 -->
    <header class="du-head">
      <div class="du-head__left">
        <button type="button" class="du-back" data-test="dual-back" @click="backToClass">← 返回课堂</button>
        <div class="du-head__title">
          <b>{{ session.title }}</b>
          <div class="du-head__meta">
            <span v-if="session.kind === 'published'" class="ms-tag">{{ versionLabel(session.version) }}</span>
            <span v-if="session.isPreset" class="ms-tag ms-tag--gray">预置发布版本</span>
            <span>{{ session.sourceLabel }}</span>
            <span>·</span>
            <span>{{ session.className }}</span>
            <span v-if="session.publishedAt">· 发布 {{ formatTime(session.publishedAt) }}</span>
          </div>
        </div>
      </div>
      <div class="du-head__right">
        <div class="du-progress">
          <div class="du-progress__text" data-test="dual-page">
            第 <b>{{ page }}</b> / {{ total }} 页 · 已看 {{ pct }}%
          </div>
          <div class="du-progress__bar"><i :style="{ width: pct + '%' }"></i></div>
        </div>
        <span class="du-head__saved" data-test="dual-saved">✓ 进度已记录</span>
      </div>
    </header>

    <div class="du-body">
      <!-- 课件目录 -->
      <nav class="du-rail" data-test="dual-rail">
        <div class="du-rail__label">课件目录 · {{ total }} 页</div>
        <div class="du-rail__list">
          <button
            v-for="(s, i) in session.slides"
            :key="s.id || i"
            type="button"
            class="du-rail__item"
            :class="{ active: i + 1 === page, done: i + 1 < page }"
            :data-test="`dual-rail-${i + 1}`"
            @click="goPage(i + 1)"
          >
            <span class="du-rail__no">{{ i + 1 }}</span>
            <span class="du-rail__title">{{ plainTitle(s.title) }}</span>
          </button>
        </div>
        <div class="du-rail__foot">
          <span v-if="session.editor">👩‍🏫 {{ session.editor }} 发布</span>
          <span v-else>🎬 AI 主讲</span>
        </div>
      </nav>

      <!-- 舞台：课件 + 逐段字幕 -->
      <div class="du-stage" data-test="dual-stage">
        <div class="du-slide">
          <DeckSlide
            :key="page"
            :slide="activeSlide"
            :page="page"
            :total="total"
            :deck-id="session.deckId"
            :brand="brandText"
          />
        </div>

        <div class="du-subtitle" data-test="dual-subtitle">
          <div class="du-subtitle__top">
            <span class="du-subtitle__status">
              <i class="du-subtitle__dot" :class="{ playing }"></i>
              {{ playing ? 'AI 主讲讲解中' : atScriptEnd ? '本页讲解完毕' : '已暂停' }}
              <span class="du-subtitle__count">字幕 {{ Math.min(segIndex + 1, segCount) }} / {{ segCount }} 段</span>
            </span>
            <span class="du-subtitle__hintline">字幕逐段出现 · 可暂停 / 继续 / 翻页，也可点右侧讲稿跳段</span>
          </div>

          <div class="du-subtitle__history" data-test="dual-subtitle-line">
            <div
              v-for="(seg, i) in visibleSegments"
              :key="i"
              class="du-subtitle__hline"
              :class="{ current: i === visibleSegments.length - 1 }"
            >
              <span class="du-subtitle__tag">{{ seg.label }}</span>
              <MathText :text="seg.text" block />
            </div>
            <span v-if="!visibleSegments.length" class="du-subtitle__empty">本页没有可播放的讲稿。</span>
          </div>

          <div class="du-subtitle__controls">
            <button type="button" class="ms-btn ms-btn--sm" :disabled="page <= 1" data-test="dual-prev" @click="goPage(page - 1)">
              上一页
            </button>
            <button type="button" class="ms-btn ms-btn--primary ms-btn--sm" data-test="dual-play" @click="togglePlay">
              {{ playing ? '⏸ 暂停讲解' : atScriptEnd ? '↻ 重播本页' : '▶ 继续讲解' }}
            </button>
            <button type="button" class="ms-btn ms-btn--sm" :disabled="page >= total" data-test="dual-next" @click="goPage(page + 1)">
              下一页
            </button>
            <span class="du-subtitle__hint">暂停 / 继续 / 翻页都会改变本地播放状态，刷新后回到同一页同一段。</span>
          </div>
        </div>
      </div>

      <!-- 右侧：AI 助教 + 本页讲稿 -->
      <aside class="du-side">
        <AssistantPanel class="du-assistant" :deck="qaDeck" :page="page" @jump="goPage" />

        <section class="du-script ms-card" data-test="dual-script">
          <header class="du-script__head">
            <b>本页讲稿</b>
            <span>{{ page }} / {{ total }} 页 · 共 {{ segCount }} 段</span>
          </header>
          <div class="du-script__list" data-test="dual-script-list">
            <button
              v-for="(seg, i) in segments"
              :key="i"
              type="button"
              class="du-script__item"
              :class="{ active: i === segIndex, done: i < segIndex }"
              :data-test="`dual-script-${i}`"
              @click="seekSegment(i)"
            >
              <span class="du-script__idx">{{ i + 1 }}</span>
              <span class="du-script__text"><MathText :text="seg.text" /></span>
            </button>
          </div>
        </section>
      </aside>
    </div>
  </div>

  <div v-else class="du du--miss" data-test="dual-missing">
    <div class="ms-card du-miss">
      <span class="du-miss__icon">🎬</span>
      <h2>没有找到这节双师课堂</h2>
      <p>链接里的课堂可能已复位，或老师撤回了发布。回到课堂可以重新选择课件或自主课题。</p>
      <button type="button" class="ms-btn ms-btn--primary" @click="router.push('/student/classroom')">返回课堂</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DeckSlide from '../../components/student/classroom/DeckSlide.vue'
import AssistantPanel from '../../components/student/classroom/AssistantPanel.vue'
import MathText from '../../components/MathText.vue'
import { plainText } from '../../data/classroom'
import {
  ensureExt,
  formatTime,
  getPlayback,
  getProgress,
  recordOpen,
  resolveDualSession,
  savePlayback,
  versionLabel,
  writeProgress,
} from '../../components/student/classroom/progress'

const route = useRoute()
const router = useRouter()
ensureExt()

const TICK_MS = 1800

const sessionId = computed(() => String(route.params.sessionId || ''))
const session = computed(() => resolveDualSession(sessionId.value))

const page = ref(1)
const segIndex = ref(0)
const playing = ref(false)
let timer = null

const total = computed(() => session.value?.slides?.length || 0)
const activeSlide = computed(() => session.value?.slides?.[page.value - 1] || {})
const qaDeck = computed(() => ({ id: session.value?.deckId || '', slides: session.value?.slides || [] }))
const pct = computed(() => {
  const t = Math.max(1, total.value)
  return Math.min(100, Math.max(0, Math.round((page.value / t) * 100)))
})
const brandText = computed(() =>
  session.value?.kind === 'published'
    ? `${session.value.editor || '老师'} · ${versionLabel(session.value.version)}`
    : '智学数研 · 自主双师课堂',
)

const segments = computed(() => buildScript(activeSlide.value, page.value))
const segCount = computed(() => segments.value.length)
const visibleSegments = computed(() => {
  const end = Math.min(segCount.value, Math.max(1, segIndex.value + 1))
  return segments.value.slice(Math.max(0, end - 3), end)
})
const atScriptEnd = computed(() => segCount.value > 0 && segIndex.value >= segCount.value - 1)

/* ---------------- 恢复与持久化 ---------------- */

function clamp(n, min, max) {
  return Math.min(Math.max(Number(n) || min, min), max)
}

function restore() {
  const s = session.value
  if (!s) return
  const progress = getProgress(s.deckId)
  const playback = getPlayback(s.deckId)
  const restoredPage = clamp(progress?.page || 1, 1, Math.max(1, total.value))
  page.value = restoredPage
  const segTotal = buildScript(s.slides?.[restoredPage - 1], restoredPage).length
  if (playback && Number(playback.page) === restoredPage) {
    segIndex.value = clamp(playback.segmentIndex, 0, Math.max(0, segTotal - 1))
  } else {
    segIndex.value = 0
  }
  // 打开即建立/恢复进度（跨端契约：progress[deckId] + opened）
  recordOpen({
    recordId: s.recordId,
    deckId: s.deckId,
    deckTitle: s.title,
    className: s.className,
    version: s.version,
    source: s.kind,
    total: total.value,
    page: restoredPage,
  })
  savePlayback(s.deckId, { page: restoredPage, segmentIndex: segIndex.value })
}

if (session.value) restore()

/* ---------------- 讲解字幕（逐段出现） ---------------- */

function buildScript(slide, pageNo) {
  if (!slide) return []
  const segs = []
  segs.push({ label: '主讲', text: `我们来看第 ${pageNo} 页：${plainText(slide.title)}。` })
  if (slide.subtitle) segs.push({ label: '主讲', text: slide.subtitle })
  if (slide.lead) segs.push({ label: '主讲', text: slide.lead })
  if (slide.image) segs.push({ label: '材料', text: '对照我上传的材料照片，先读题再动手。' })
  if (slide.equation) segs.push({ label: '板书', text: `板书：${slide.equation}` })
  if (Array.isArray(slide.bullets)) {
    for (const b of slide.bullets) segs.push({ label: '要点', text: b })
  }
  if (slide.figure) segs.push({ label: '看图', text: `结合图形看：${slide.figure}。` })
  segs.push({ label: '收束', text: '这一页先讲到这里。理解后点“下一页”；有疑问可以在右侧直接问 AI 助教。' })
  return segs
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function persistPlayback() {
  const s = session.value
  if (!s) return
  savePlayback(s.deckId, { page: page.value, segmentIndex: segIndex.value })
}

function scheduleTick() {
  clearTimer()
  if (!playing.value) return
  timer = setTimeout(() => {
    timer = null
    if (!playing.value) return
    if (segIndex.value < segCount.value - 1) {
      segIndex.value += 1
      persistPlayback()
      scheduleTick()
    } else {
      playing.value = false
      persistPlayback()
    }
  }, TICK_MS)
}

function startPlay() {
  clearTimer()
  if (!session.value) return
  if (segCount.value === 0) return
  if (segIndex.value >= segCount.value - 1) segIndex.value = 0
  playing.value = true
  persistPlayback()
  scheduleTick()
}

function togglePlay() {
  if (playing.value) {
    playing.value = false
    clearTimer()
    persistPlayback()
  } else {
    startPlay()
  }
}

function goPage(target) {
  const s = session.value
  if (!s) return
  const next = clamp(target, 1, Math.max(1, total.value))
  page.value = next
  segIndex.value = 0
  playing.value = false
  clearTimer()
  writeProgress({
    deckId: s.deckId,
    title: s.title,
    page: next,
    total: total.value,
    recordId: s.recordId,
  })
  savePlayback(s.deckId, { page: next, segmentIndex: 0 })
  // 翻页后逐段重新出现：自动开始本页讲解
  startPlay()
}

function seekSegment(i) {
  playing.value = false
  clearTimer()
  segIndex.value = clamp(i, 0, Math.max(0, segCount.value - 1))
  persistPlayback()
}

function backToClass() {
  router.push('/student/classroom?tab=dual')
}

function plainTitle(title) {
  return plainText(title) || '未命名页面'
}

onBeforeUnmount(() => {
  playing.value = false
  clearTimer()
  persistPlayback()
})
</script>

<style scoped>
:global(.main:has(.du)) {
  padding: 0;
  overflow: hidden;
}
.du {
  height: calc(100vh - var(--topbar-h, 60px));
  display: flex;
  flex-direction: column;
  background: #f6f8fc;
  overflow: hidden;
}

/* ===================== 顶栏 ===================== */
.du-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 11px 20px;
  background: #fff;
  border-bottom: 1px solid var(--line, #e2e8f0);
  flex: none;
  min-height: 62px;
}
.du-head__left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.du-back {
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  color: var(--ink2, #334155);
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-family: inherit;
  white-space: nowrap;
  flex: none;
}
.du-back:hover {
  border-color: var(--brand, #4f46e5);
  color: var(--brand-deep, #4338ca);
  background: #fafbff;
}
.du-head__title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.du-head__title b {
  font-size: 15px;
  font-weight: 800;
  color: var(--ink, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.du-head__meta {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: var(--ink3, #94a3b8);
  flex-wrap: wrap;
}
.du-head__right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: none;
}
.du-progress {
  width: 210px;
}
.du-progress__text {
  font-size: 11.5px;
  color: var(--ink2, #334155);
  margin-bottom: 3px;
  text-align: right;
}
.du-progress__text b {
  color: var(--brand-deep, #4338ca);
  font-size: 13px;
}
.du-progress__bar {
  height: 5px;
  border-radius: 99px;
  background: #eef1f8;
  overflow: hidden;
}
.du-progress__bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #4f46e5, #06b6d4);
  transition: width 0.3s ease;
}
.du-head__saved {
  font-size: 10.5px;
  color: var(--ok-deep, #047857);
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  padding: 3px 9px;
  white-space: nowrap;
}

/* ===================== 主体三栏 ===================== */
.du-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 152px minmax(0, 1fr) 356px;
  gap: 14px;
  padding: 12px 18px 16px;
}

/* 目录导轨 */
.du-rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 14px;
  overflow: hidden;
}
.du-rail__label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink3, #94a3b8);
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--line2, #f1f5f9);
  flex: none;
}
.du-rail__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 7px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.du-rail__item {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  padding: 7px 8px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  transition: all 0.15s ease;
}
.du-rail__item:hover {
  background: #f8fafc;
}
.du-rail__item.done .du-rail__no {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: var(--ok-deep, #047857);
}
.du-rail__item.active {
  background: var(--brand-soft, #eef2ff);
  border-color: #c7d2fe;
}
.du-rail__no {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  display: grid;
  place-items: center;
  font-size: 10.5px;
  font-weight: 800;
  color: var(--ink2, #334155);
  flex: none;
}
.du-rail__item.active .du-rail__no {
  background: var(--brand, #4f46e5);
  border-color: var(--brand, #4f46e5);
  color: #fff;
}
.du-rail__title {
  font-size: 11px;
  line-height: 1.35;
  color: var(--ink2, #334155);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.du-rail__item.active .du-rail__title {
  color: var(--brand-deep, #4338ca);
  font-weight: 700;
}
.du-rail__foot {
  flex: none;
  padding: 8px 12px;
  border-top: 1px solid var(--line2, #f1f5f9);
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 舞台 */
.du-stage {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}
.du-slide {
  flex: 1;
  min-height: 0;
  width: 100%;
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 16px;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
  overflow: hidden;
  container-type: inline-size;
  animation: du-slide-in 0.26s ease both;
}
@keyframes du-slide-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 字幕条 */
.du-subtitle {
  flex: none;
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 14px;
  padding: 10px 16px 12px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.du-subtitle__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.du-subtitle__status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--brand-deep, #4338ca);
  flex: none;
}
.du-subtitle__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #cbd5e1;
  flex: none;
}
.du-subtitle__dot.playing {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
  animation: du-pulse 1.4s ease-in-out infinite;
}
@keyframes du-pulse {
  50% {
    opacity: 0.55;
  }
}
.du-subtitle__count {
  font-weight: 500;
  color: var(--ink3, #94a3b8);
  font-size: 10.5px;
}
.du-subtitle__note {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.du-subtitle__hintline {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
}
.du-subtitle__history {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 66px;
  max-height: 78px;
  overflow: hidden;
  justify-content: flex-end;
}
.du-subtitle__hline {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 11.5px;
  line-height: 1.62;
  color: var(--ink3, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.du-subtitle__hline > :last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.du-subtitle__hline.current {
  font-size: 14px;
  line-height: 1.7;
  font-weight: 600;
  color: var(--ink, #0f172a);
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.du-subtitle__hline.current > :last-child {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.du-subtitle__tag {
  flex: none;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #06b6d4);
  border-radius: 6px;
  padding: 1px 7px;
  margin-top: 2px;
  opacity: 0.55;
}
.du-subtitle__hline.current .du-subtitle__tag {
  opacity: 1;
  font-size: 10.5px;
}
.du-subtitle__empty {
  color: var(--ink3, #94a3b8);
  font-size: 12px;
}
.du-subtitle__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.du-subtitle__hint {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
}

/* 右栏 */
.du-side {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.du-assistant {
  flex: 1;
  min-height: 0;
}
.du-script {
  flex: none;
  height: 208px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.du-script__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line2, #f1f5f9);
  flex: none;
}
.du-script__head b {
  font-size: 12.5px;
}
.du-script__head span {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
}
.du-script__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 7px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.du-script__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--ink3, #94a3b8);
}
.du-script__item:hover {
  background: #f8fafc;
  color: var(--ink2, #334155);
}
.du-script__item.done {
  color: var(--ink2, #334155);
}
.du-script__item.active {
  background: var(--brand-soft, #eef2ff);
  border-color: #dfe5ff;
  color: var(--brand-deep, #4338ca);
  font-weight: 600;
}
.du-script__idx {
  flex: none;
  width: 17px;
  height: 17px;
  border-radius: 5px;
  background: #f1f5f9;
  display: grid;
  place-items: center;
  font-size: 9.5px;
  font-weight: 800;
  margin-top: 1px;
}
.du-script__item.active .du-script__idx {
  background: var(--brand, #4f46e5);
  color: #fff;
}
.du-script__text {
  min-width: 0;
}

/* 缺失态 */
.du--miss {
  display: grid;
  place-items: center;
  background: #f6f8fc;
}
.du-miss {
  width: 460px;
  max-width: 92%;
  padding: 34px 30px;
  text-align: center;
}
.du-miss__icon {
  font-size: 38px;
  display: block;
  margin-bottom: 8px;
}
.du-miss h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.du-miss p {
  margin: 0 0 18px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink2, #334155);
}
</style>
