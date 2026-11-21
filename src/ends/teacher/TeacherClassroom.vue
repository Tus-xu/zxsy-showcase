<template>
  <div class="cls" data-testid="teacher-classroom">
    <section class="tv3-hero cls__hero">
      <div class="cls__hero-main">
        <div class="cls__hero-icon">🎓</div>
        <div>
          <div class="tv3-hero__title">课堂</div>
          <div class="tv3-hero__sub">
            双师课堂 · 已发布课件 · 学生进度回流；进度来自学生端真实写入，教师端只读展示。
          </div>
        </div>
      </div>
      <div class="cls__hero-right">
        <select v-if="classOptions.length > 2" v-model="classFilter" class="tv3-input cls__class" data-testid="classroom-class-filter">
          <option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
        </select>
        <span v-else class="tv3-tag tv3-tag--primary">{{ classOptions[1] || '高二 (1) 班' }} · 数学</span>
        <button type="button" class="tv3-btn tv3-btn--sm" data-testid="classroom-go-prep" @click="router.push('/teacher/prep')">
          备课中心 →
        </button>
      </div>
    </section>

    <div class="cls__stats">
      <div class="cls__stat tv3-card">
        <span class="cls__stat-label">已发布课件</span>
        <b>{{ latestRecords.length }}</b>
        <span class="cls__stat-note">共 {{ records.length }} 条发布记录（同一课件保留历史版本）</span>
      </div>
      <div class="cls__stat tv3-card">
        <span class="cls__stat-label">学生已打开</span>
        <b>{{ openedCount }} <small>/ {{ latestRecords.length }}</small></b>
        <span class="cls__stat-note">{{ openedCount ? '学生端已进入课堂并回传进度' : '暂无学生打开' }}</span>
      </div>
      <div class="cls__stat tv3-card">
        <span class="cls__stat-label">平均进度</span>
        <b>{{ progressEntries.length ? avgPct + '%' : '—' }}</b>
        <span class="cls__stat-note">{{ progressEntries.length ? '按学生端已回传进度计算' : '等待学生打开课件' }}</span>
      </div>
      <div class="cls__stat tv3-card">
        <span class="cls__stat-label">进度回流</span>
        <b>{{ progressEntries.length }}</b>
        <span class="cls__stat-note">classroom.progress 中的课件进度条目</span>
      </div>
    </div>

    <div class="cls__grid">
      <section class="tv3-card cls__published" data-testid="classroom-published">
        <div class="cls__card-head">
          <div>
            <b>已发布课件</b>
            <span>按发布时间倒序 · 以发布快照为准（学生端可见的唯一事实源）</span>
          </div>
          <button type="button" class="tv3-btn tv3-btn--sm" @click="refreshView">刷新</button>
        </div>

        <div v-if="!latestRecords.length" class="cls__empty" data-testid="classroom-no-publish">
          <div class="cls__empty-icon">📚</div>
          <b>暂无已发布课件</b>
          <p>在备课中心完成课件编辑后发布到班级，学生打开后进度会回流到本页。</p>
          <button type="button" class="tv3-btn tv3-btn--primary tv3-btn--sm" @click="router.push('/teacher/prep')">
            去备课中心发布
          </button>
        </div>

        <div v-else class="cls__cards">
          <article
            v-for="r in latestRecords"
            :key="r.deckId"
            class="cls__deck"
            :data-testid="`classroom-card-${r.deckId}`"
          >
            <div class="cls__deck-top">
              <div class="cls__deck-title">
                <b>{{ titleOf(r) }}</b>
                <span class="tv3-tag tv3-tag--primary">{{ versionLabel(r) }}</span>
              </div>
              <span class="tv3-tag" :class="progressOf(r.deckId) ? 'tv3-tag--ok' : 'tv3-tag--gray'">
                {{ progressOf(r.deckId) ? (progressOf(r.deckId).status === 'completed' ? '学生已完成' : '学生已打开') : '未打开' }}
              </span>
            </div>
            <div class="cls__deck-meta">
              {{ classOf(r) }} · {{ pagesOf(r) }} 页 · 发布 {{ fmtTime(publishedAtOf(r)) }} · 编辑 {{ r.editor || '张老师' }}
            </div>
            <div class="cls__deck-progress">
              <div class="cls__bar">
                <div class="cls__bar-fill" :style="{ width: (progressOf(r.deckId) ? progressOf(r.deckId).pct : 0) + '%' }" />
              </div>
              <span class="cls__deck-progress-text">
                <template v-if="progressOf(r.deckId)">
                  第 {{ progressOf(r.deckId).page }} / {{ progressOf(r.deckId).total }} 页 · {{ progressOf(r.deckId).pct }}% ·
                  {{ progressOf(r.deckId).status === 'completed' ? '已完成' : '进行中' }}
                </template>
                <template v-else>暂无学生打开</template>
              </span>
            </div>
            <div class="cls__deck-foot">
              <span>会话 {{ sessionOf(r) }} · 快照 {{ snapshotSlides(r) }} 页</span>
              <span v-if="progressOf(r.deckId)">最近更新 {{ fmtTime(progressOf(r.deckId).updatedAt) }}</span>
              <button type="button" class="cls__link" @click="router.push('/teacher/insights')">查看学情 →</button>
            </div>
          </article>
        </div>
      </section>

      <aside class="tv3-card cls__side">
        <div class="cls__card-head">
          <div>
            <b>进度回流明细</b>
            <span>学生端 classroom.progress / opened 事件</span>
          </div>
          <span class="tv3-tag">{{ progressEntries.length }} 条</span>
        </div>

        <div v-if="!progressEntries.length" class="cls__empty cls__empty--side" data-testid="classroom-no-student-opened">
          <div class="cls__empty-icon">👀</div>
          <b>暂无学生打开</b>
          <p>学生从“课堂 → 老师课堂”打开已发布课件并翻页后，页码与进度会实时回流到这里。</p>
        </div>

        <div v-else class="cls__progress-list">
          <article v-for="p in progressEntries" :key="p.deckId" class="cls__progress-item" :data-testid="`classroom-progress-${p.deckId}`">
            <div class="cls__progress-top">
              <b>{{ p.title }}</b>
              <span class="tv3-tag" :class="p.status === 'completed' ? 'tv3-tag--ok' : 'tv3-tag--gold'">
                {{ p.status === 'completed' ? '已完成' : '进行中' }}
              </span>
            </div>
            <div class="cls__progress-meta">
              第 {{ p.page }} / {{ p.total }} 页 · {{ p.pct }}% · 打开 {{ fmtTime(p.openedAt) }} · 更新 {{ fmtTime(p.updatedAt) }}
            </div>
            <div class="cls__bar">
              <div class="cls__bar-fill" :style="{ width: p.pct + '%' }" />
            </div>
          </article>
        </div>

        <div v-if="openedEvents.length" class="cls__events">
          <div class="cls__events-title">打开事件（opened）</div>
          <div v-for="(e, i) in openedEvents" :key="i" class="cls__event">
            <span class="cls__event-dot" />
            <span class="cls__event-text">
              <b>{{ e.deckTitle }}</b>
              <small>{{ e.className }} · {{ e.source === 'self' ? '自建双师课堂' : '老师发布' }} · {{ fmtTime(e.at) }}</small>
            </span>
            <span class="tv3-tag tv3-tag--gray">{{ e.version || 'v1' }}</span>
          </div>
        </div>

        <div class="cls__source">
          数据来源：<code>store.student.classroom.progress[deckId]</code>（学生端写入，本页只读）与
          <code>store.teacher.publish.records</code>（发布快照）。无数据时如实显示“暂无学生打开”，不生成模拟进度。
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../../state/demo'
import { findDeck } from '../../data/courseware'

const router = useRouter()
const classFilter = ref('全部班级')

const studentClassroom = computed(() => store.student.classroom || { opened: [], progress: {} })
const progressMap = computed(() => studentClassroom.value.progress || {})
const openedEventsRaw = computed(() => (Array.isArray(studentClassroom.value.opened) ? studentClassroom.value.opened : []))

const records = computed(() =>
  Array.isArray(store.teacher.publish && store.teacher.publish.records) ? store.teacher.publish.records : [],
)

function titleOf(r) {
  return r.deckTitle || (r.snapshot && r.snapshot.title) || (findDeck(r.deckId) && findDeck(r.deckId).title) || r.deckId
}
function classOf(r) {
  return (
    r.className ||
    (r.snapshot && r.snapshot.meta && r.snapshot.meta.className) ||
    (r.meta && r.meta.className) ||
    '未标注班级'
  )
}
function sessionOf(r) {
  return (r.meta && r.meta.sessionId) || (r.snapshot && r.snapshot.sessionId) || '—'
}
function slidesOf(r) {
  if (Array.isArray(r.slides)) return r.slides
  if (r.snapshot && Array.isArray(r.snapshot.slides)) return r.snapshot.slides
  const deck = findDeck(r.deckId)
  return deck && Array.isArray(deck.slides) ? deck.slides : []
}
function pagesOf(r) {
  const n = slidesOf(r).length
  return n || '—'
}
function snapshotSlides(r) {
  return slidesOf(r).length || '—'
}
function versionLabel(r) {
  if (r.meta && r.meta.versionLabel) return r.meta.versionLabel
  return r.version ? 'v' + r.version : '已发布'
}
function timeOf(r) {
  const raw = r.publishedAt !== undefined ? r.publishedAt : r.at
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const t = new Date(raw).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}
function publishedAtOf(r) {
  return r.publishedAt !== undefined ? r.publishedAt : r.at
}

const classOptions = computed(() => {
  const set = new Set(records.value.map(classOf))
  return ['全部班级', ...set]
})

const filteredRecords = computed(() => {
  if (classFilter.value === '全部班级') return records.value
  return records.value.filter((r) => classOf(r) === classFilter.value)
})

const latestRecords = computed(() => {
  const map = new Map()
  for (const r of filteredRecords.value) {
    const prev = map.get(r.deckId)
    if (!prev) {
      map.set(r.deckId, r)
      continue
    }
    const ver = (x) => (typeof x.version === 'number' ? x.version : Number(x.version) || 0)
    if (timeOf(r) > timeOf(prev) || (timeOf(r) === timeOf(prev) && ver(r) >= ver(prev))) map.set(r.deckId, r)
  }
  return [...map.values()].sort((a, b) => timeOf(b) - timeOf(a))
})

function progressOf(deckId) {
  const p = progressMap.value[deckId]
  if (!p || typeof p !== 'object') return null
  return p
}

const openedCount = computed(() => latestRecords.value.filter((r) => progressOf(r.deckId)).length)

const progressEntries = computed(() => {
  const keys = new Set(Object.keys(progressMap.value || {}))
  if (!keys.size) return []
  return [...keys]
    .map((deckId) => {
      const p = progressMap.value[deckId] || {}
      const rec = records.value.filter((r) => r.deckId === deckId).sort((a, b) => timeOf(b) - timeOf(a))[0]
      const deck = findDeck(deckId)
      return {
        deckId,
        title: p.title || titleOf(rec || { deckId }) || deckId,
        page: Number.isFinite(p.page) ? p.page : 0,
        total: Number.isFinite(p.total) ? p.total : (deck ? deck.slides.length : 0),
        pct: Number.isFinite(p.pct) ? p.pct : 0,
        status: p.status || 'opened',
        openedAt: p.openedAt,
        updatedAt: p.updatedAt,
        recordId: p.recordId || null,
      }
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
})

const avgPct = computed(() => {
  if (!progressEntries.value.length) return 0
  const sum = progressEntries.value.reduce((acc, p) => acc + (Number(p.pct) || 0), 0)
  return Math.round(sum / progressEntries.value.length)
})

const openedEvents = computed(() => {
  const deckIds = new Set([...records.value.map((r) => r.deckId), ...Object.keys(progressMap.value || {})])
  return openedEventsRaw.value
    .filter((e) => e && deckIds.has(e.deckId))
    .slice()
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, 8)
})

function pad(n) {
  return String(n).padStart(2, '0')
}
function fmtTime(raw) {
  if (raw === null || raw === undefined || raw === '') return '—'
  const d = new Date(typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function refreshView() {
  // 进度由学生端写入 localStorage：刷新页面从持久化状态重新读取，避免展示过期快照
  window.location.reload()
}
</script>

<style scoped>
.cls {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cls__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 22px;
}
.cls__hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
}
.cls__hero-icon {
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: linear-gradient(135deg, #eef2ff 0%, #ecfeff 100%);
  border: 1px solid var(--tv3-primary-border);
  box-shadow: 0 6px 16px -8px rgba(79, 70, 229, 0.5);
}
.cls__hero-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.cls__class {
  width: 160px;
  height: 32px;
  padding: 4px 10px;
  font-size: 12px;
}
.cls__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.cls__stat {
  padding: 13px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cls__stat-label {
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.cls__stat b {
  font-size: 24px;
  line-height: 1.15;
  font-weight: 800;
  color: var(--tv3-ink);
  font-family: var(--tv3-font-num);
}
.cls__stat b small {
  font-size: 13px;
  font-weight: 600;
  color: var(--tv3-ink3);
}
.cls__stat-note {
  font-size: 10.5px;
  color: var(--tv3-ink3);
  line-height: 1.5;
}
.cls__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.cls__published,
.cls__side {
  display: flex;
  flex-direction: column;
  min-height: 300px;
}
.cls__card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--tv3-line2);
}
.cls__card-head b {
  font-size: 13.5px;
  color: var(--tv3-ink);
}
.cls__card-head span {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--tv3-ink3);
}
.cls__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 44px 24px;
  text-align: center;
}
.cls__empty-icon {
  font-size: 34px;
  opacity: 0.8;
}
.cls__empty b {
  font-size: 14px;
  color: var(--tv3-ink2);
}
.cls__empty p {
  margin: 0 0 8px;
  max-width: 420px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--tv3-ink3);
}
.cls__empty--side {
  padding: 34px 20px;
}
.cls__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px 16px;
}
.cls__deck {
  border: 1px solid var(--tv3-line);
  border-radius: 12px;
  padding: 11px 13px;
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 60%);
}
.cls__deck-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.cls__deck-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.cls__deck-title b {
  font-size: 13.5px;
  color: var(--tv3-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cls__deck-meta {
  margin-top: 3px;
  font-size: 11px;
  color: var(--tv3-ink3);
}
.cls__deck-progress {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.cls__bar {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: var(--tv3-bg2);
  overflow: hidden;
}
.cls__bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%);
  transition: width 0.3s ease;
}
.cls__deck-progress-text {
  flex: none;
  font-size: 11px;
  color: var(--tv3-ink2);
  font-family: var(--tv3-font-num);
}
.cls__deck-foot {
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px dashed var(--tv3-line);
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.cls__link {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--tv3-primary);
  font-size: 11px;
  font-weight: 600;
  padding: 0;
}
.cls__progress-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
}
.cls__progress-item {
  border: 1px solid var(--tv3-line);
  border-radius: 11px;
  padding: 9px 11px;
  background: #fff;
}
.cls__progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cls__progress-top b {
  font-size: 12.5px;
  color: var(--tv3-ink);
}
.cls__progress-meta {
  margin: 3px 0 6px;
  font-size: 10.5px;
  color: var(--tv3-ink3);
  font-family: var(--tv3-font-num);
}
.cls__events {
  margin: 0 16px 12px;
  border-top: 1px dashed var(--tv3-line);
  padding-top: 9px;
}
.cls__events-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--tv3-ink2);
  margin-bottom: 6px;
}
.cls__event {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 0;
}
.cls__event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tv3-primary);
  flex: none;
}
.cls__event-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.cls__event-text b {
  font-size: 11.5px;
  color: var(--tv3-ink2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cls__event-text small {
  font-size: 10px;
  color: var(--tv3-ink3);
}
.cls__source {
  margin: auto 16px 12px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--tv3-bg2);
  border: 1px dashed var(--tv3-line);
  font-size: 10px;
  line-height: 1.7;
  color: var(--tv3-ink3);
}
.cls__source code {
  font-family: var(--tv3-font-num);
  font-size: 9.5px;
  color: var(--tv3-primary);
  background: #fff;
  border: 1px solid var(--tv3-line);
  border-radius: 3px;
  padding: 0 3px;
}
</style>
