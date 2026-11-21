<template>
  <div class="page cls-page">
    <header class="cls-head">
      <div class="cls-head__text">
        <h1 class="page-title">🎓 课堂</h1>
        <p class="page-sub">老师发布的课件、作业任务与自主双师课堂——同学同一条线，完成情况都记在这里。</p>
      </div>
      <div class="cls-head__stats">
        <div class="cls-stat">
          <b class="is-warn">{{ pendingCount }}</b>
          <span>待完成</span>
        </div>
        <div class="cls-stat">
          <b class="is-ok">{{ gradedCount }}</b>
          <span>已批改</span>
        </div>
        <div class="cls-stat">
          <b>{{ deckCount }}</b>
          <span>已发布课件</span>
        </div>
      </div>
    </header>

    <!-- 与现役课堂一致的三 Tab：课堂任务 / 我的班级 / 双师课堂 -->
    <nav class="cls-tabs" data-test="class-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="cls-tab"
        :class="{ active: activeTab === tab.key }"
        :data-test="`tab-${tab.key}`"
        @click="switchTab(tab.key)"
      >
        <span class="cls-tab__icon">{{ tab.icon }}</span>
        {{ tab.label }}
        <span v-if="tab.count" class="cls-tab__count">{{ tab.count }}</span>
      </button>
    </nav>

    <!-- ===================== 课堂任务 ===================== -->
    <section v-if="activeTab === 'tasks'" class="cls-tasks" data-test="panel-tasks">
      <div class="cls-taskbar">
        <div class="cls-taskbar__title">
          课堂任务中心 · <b class="is-warn">{{ pendingCount }} 项待完成</b>
          <span>老师下发的作业与课堂课件，都在这里统一接收。</span>
        </div>
        <div class="cls-filters">
          <button
            v-for="f in filters"
            :key="f.key"
            type="button"
            class="cls-filter"
            :class="{ active: taskFilter === f.key }"
            :data-test="`task-filter-${f.key}`"
            @click="taskFilter = f.key"
          >
            {{ f.label }} <span>{{ f.count }}</span>
          </button>
        </div>
      </div>

      <div class="cls-tasklist">
        <template v-if="filteredTasks.length">
          <PublishedDeckCard
            v-for="item in filteredTasks.filter((t) => t.kind === 'courseware')"
            :key="item.key"
            :record="item.record"
            :progress="item.progress"
            compact
            @open="openRecord"
          />
          <HomeworkTask
            v-for="item in filteredTasks.filter((t) => t.kind === 'homework')"
            :key="item.key"
            :submission="item.submission"
            :grade="item.grade"
            @open="reviewOpen = true"
          />
        </template>
        <div v-else class="ms-empty">{{ taskFilter === 'done' ? '还没有已完成的任务。' : '待完成的任务都清空了，去双师课堂自主学一节课吧。' }}</div>
      </div>

      <p v-if="presetUsed" class="cls-preset-note">
        当前用 <b>deck-ellipse 预置发布 v1</b> 演示学生可见课件；教师端发布真实记录后，这里会自动切换为老师的发布版本。
      </p>
    </section>

    <!-- ===================== 我的班级 ===================== -->
    <MyClassPanel v-else-if="activeTab === 'class'" />

    <!-- ===================== 双师课堂 ===================== -->
    <section v-else class="cls-dual" data-test="panel-dual">
      <div class="cls-section">
        <div class="cls-section-head">
          <div>
            <h2>老师课堂</h2>
            <span>张老师发布到本班的课件 · AI 主讲逐页讲解、助教就当前页答疑</span>
          </div>
          <span class="cls-section-head__count">共 {{ records.length }} 份</span>
        </div>
        <div v-if="records.length" class="cls-pub-grid" :class="{ 'cls-pub-grid--single': records.length === 1 }">
          <PublishedDeckCard
            v-for="record in records"
            :key="record.id"
            :record="record"
            :progress="progressOf(record.deckId)"
            :hero="records.length === 1"
            @open="openRecord"
          />
        </div>
        <div v-else class="ms-empty">本班暂无老师发布的课件。老师发布后，这里会出现课堂入口。</div>
        <p v-if="presetUsed" class="cls-preset-note">
          <span class="ms-tag ms-tag--gray">预置发布版本</span>
          教师端还没有真实发布记录：这里用 <b>deck-ellipse</b> 生成“预置发布 v1”用于演示（不写入教师发布记录）；老师发布后会自动切换为真实发布版本。
        </p>
      </div>

      <div class="cls-dual-grid">
        <SelfClassPanel @open="openSelfClass" />

        <section class="cls-recent ms-card" data-test="recent-class">
          <div class="cls-section-head cls-section-head--inside">
            <div>
              <h2>最近课堂</h2>
              <span>打开过的双师课堂会记录进度，刷新后可继续</span>
            </div>
          </div>
          <div v-if="recent.length" class="cls-recent__list">
            <button
              v-for="item in recent"
              :key="item.deckId"
              type="button"
              class="cls-recent__item"
              data-test="recent-item"
              @click="openRecent(item)"
            >
              <span class="cls-recent__icon">{{ item.source === 'self' ? '🎬' : '🎞' }}</span>
              <span class="cls-recent__main">
                <b>{{ item.title }}</b>
                <span class="cls-recent__meta">
                  {{ item.source === 'self' ? '自主双师课堂' : '老师发布' }} · 第 {{ item.page }}/{{ item.total }} 页 · {{ formatTime(item.updatedAt) }}
                </span>
                <span class="cls-recent__bar"><i :style="{ width: item.pct + '%' }"></i></span>
              </span>
              <span class="cls-recent__pct">{{ item.pct }}%</span>
              <span class="cls-recent__go">继续 →</span>
            </button>
          </div>
          <div v-else class="cls-recent__empty">
            <span class="cls-recent__empty-icon">🎬</span>
            <p>还没有打开的课堂。点击左侧课题或上方“老师课堂”，进度会记录在这里。</p>
          </div>
        </section>
      </div>
    </section>

    <HomeworkReviewDialog
      v-if="homework"
      :open="reviewOpen"
      :submission="homework.submission"
      :grade="homework.grade"
      @close="reviewOpen = false"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PublishedDeckCard from '../../components/student/classroom/PublishedDeckCard.vue'
import HomeworkTask from '../../components/student/classroom/HomeworkTask.vue'
import HomeworkReviewDialog from '../../components/student/classroom/HomeworkReviewDialog.vue'
import MyClassPanel from '../../components/student/classroom/MyClassPanel.vue'
import SelfClassPanel from '../../components/student/classroom/SelfClassPanel.vue'
import { STUDENT_CLASS, deckForSelfClass, findSelfClass, selfClassTopics } from '../../data/classroom'
import {
  formatTime,
  getProgress,
  homeworkState,
  recentClassrooms,
  recordOpen,
  visiblePublishedRecords,
  ensureExt,
} from '../../components/student/classroom/progress'

const route = useRoute()
const router = useRouter()
ensureExt()

const TAB_KEYS = ['tasks', 'class', 'dual']
const activeTab = computed(() => {
  const raw = route.query.tab
  const key = Array.isArray(raw) ? raw[0] : raw
  return TAB_KEYS.includes(key) ? key : 'tasks'
})

const published = computed(() => visiblePublishedRecords())
const records = computed(() => published.value.records)
const presetUsed = computed(() => published.value.presetUsed)
const deckCount = computed(() => records.value.length)

const homework = computed(() => homeworkState())
const reviewOpen = ref(false)

const gradedCount = computed(() => (homework.value?.graded ? 1 : 0))

function progressOf(deckId) {
  return getProgress(deckId)
}

const coursewareTasks = computed(() =>
  records.value.map((record) => ({
    kind: 'courseware',
    key: `deck:${record.id}`,
    record,
    progress: getProgress(record.deckId),
    done: getProgress(record.deckId)?.status === 'completed',
  })),
)

const homeworkTasks = computed(() => {
  if (!homework.value) return []
  return [
    {
      kind: 'homework',
      key: `hw:${homework.value.submission.id}`,
      submission: homework.value.submission,
      grade: homework.value.grade,
      done: homework.value.graded,
    },
  ]
})

const allTasks = computed(() => [...coursewareTasks.value, ...homeworkTasks.value])
const pendingCount = computed(() => allTasks.value.filter((t) => !t.done).length)
const taskFilter = ref('all')
const filters = computed(() => [
  { key: 'all', label: '全部', count: allTasks.value.length },
  { key: 'todo', label: '待完成', count: pendingCount.value },
  { key: 'done', label: '已完成', count: allTasks.value.length - pendingCount.value },
])
const filteredTasks = computed(() => {
  if (taskFilter.value === 'todo') return allTasks.value.filter((t) => !t.done)
  if (taskFilter.value === 'done') return allTasks.value.filter((t) => t.done)
  return allTasks.value
})

const tabs = computed(() => [
  { key: 'tasks', icon: '📋', label: '课堂任务', count: pendingCount.value },
  { key: 'class', icon: '🏫', label: '我的班级', count: 0 },
  { key: 'dual', icon: '🎬', label: '双师课堂', count: deckCount.value },
])

function switchTab(key) {
  router.replace({ path: '/student/classroom', query: key === 'tasks' ? {} : { tab: key } })
}

function openRecord(record) {
  recordOpen({
    recordId: record.id,
    deckId: record.deckId,
    deckTitle: record.deckTitle,
    className: record.className,
    version: record.version,
    source: 'published',
    total: record.slides.length,
  })
  router.push(`/student/dual/${record.id}`)
}

function openSelfClass(topic) {
  const deck = deckForSelfClass(topic)
  if (!deck) return
  recordOpen({
    recordId: null,
    deckId: deck.id,
    deckTitle: deck.title,
    className: STUDENT_CLASS,
    version: null,
    source: 'self',
    total: deck.slides.length,
  })
  router.push(`/student/dual/${topic.id}`)
}

const recent = computed(() => recentClassrooms(4))

function openRecent(item) {
  // 发布记录 / 自主课题 / 上传材料：按进度里的 recordId + deckId 反查 sessionId
  const record = records.value.find((r) => r.id === item.recordId)
  if (record) {
    router.push(`/student/dual/${record.id}`)
    return
  }
  const topic = selfClassTopics.find((t) => t.id === item.recordId || t.deckId === item.deckId)
  if (topic) {
    router.push(`/student/dual/${topic.id}`)
    return
  }
  const fallback = findSelfClass('self-ellipse')
  if (fallback && item.deckId === 'deck-ellipse') router.push(`/student/dual/${fallback.id}`)
}
</script>

<style scoped>
.cls-page {
  padding-top: 22px;
}
.cls-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.cls-head .page-sub {
  margin-bottom: 0;
  max-width: 720px;
}
.cls-head__stats {
  display: flex;
  gap: 10px;
  flex: none;
}
.cls-stat {
  min-width: 86px;
  padding: 9px 14px;
  border-radius: 13px;
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}
.cls-stat b {
  font-size: 20px;
  font-weight: 800;
  font-family: var(--font-num, 'Inter', sans-serif);
  color: var(--ink, #0f172a);
}
.cls-stat b.is-warn {
  color: #b45309;
}
.cls-stat b.is-ok {
  color: var(--ok-deep, #047857);
}
.cls-stat span {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
  margin-top: 2px;
}

.cls-tabs {
  display: flex;
  gap: 10px;
  margin: 18px 0 16px;
  flex-wrap: wrap;
}
.cls-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 17px;
  border-radius: 999px;
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  color: var(--ink2, #334155);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.16s ease;
}
.cls-tab:hover {
  border-color: #c7d2fe;
  color: var(--brand-deep, #4338ca);
}
.cls-tab.active {
  background: var(--brand-soft, #eef2ff);
  border-color: #c7d2fe;
  color: var(--brand-deep, #4338ca);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
}
.cls-tab__icon {
  font-size: 15px;
}
.cls-tab__count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #fff;
  color: var(--brand-deep, #4338ca);
  font-size: 10.5px;
  font-weight: 800;
  display: inline-grid;
  place-items: center;
  border: 1px solid #dfe5ff;
}

/* ===================== 课堂任务 ===================== */
.cls-taskbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.cls-taskbar__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink, #0f172a);
}
.cls-taskbar__title b {
  font-weight: 800;
}
.cls-taskbar__title b.is-warn {
  color: #b45309;
}
.cls-taskbar__title span {
  display: block;
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
  font-weight: 400;
  margin-top: 2px;
}
.cls-filters {
  display: flex;
  gap: 6px;
}
.cls-filter {
  border: 0;
  background: none;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--ink2, #334155);
  font-family: inherit;
  font-weight: 600;
}
.cls-filter span {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
  margin-left: 2px;
}
.cls-filter:hover {
  background: var(--bg2, #f1f5f9);
}
.cls-filter.active {
  background: var(--brand-soft, #eef2ff);
  color: var(--brand-deep, #4338ca);
}
.cls-filter.active span {
  color: var(--brand, #4f46e5);
}
.cls-tasklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cls-preset-note {
  margin: 12px 0 0;
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
  line-height: 1.8;
}
.cls-preset-note b {
  color: var(--ink2, #334155);
  font-weight: 700;
}

/* ===================== 双师课堂 ===================== */
.cls-dual {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.cls-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}
.cls-section-head h2 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
}
.cls-section-head span {
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
}
.cls-section-head__count {
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
  flex: none;
}
.cls-section-head--inside {
  margin-bottom: 12px;
}
.cls-pub-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.cls-pub-grid--single {
  grid-template-columns: minmax(0, 1fr);
}
.cls-dual-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
  gap: 16px;
  align-items: start;
}
.cls-recent {
  padding: 16px 18px;
}
.cls-recent__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cls-recent__item {
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  font-family: inherit;
  transition: all 0.16s ease;
}
.cls-recent__item:hover {
  border-color: var(--brand, #4f46e5);
  background: #fafbff;
}
.cls-recent__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--brand-soft, #eef2ff);
  display: grid;
  place-items: center;
  font-size: 16px;
  flex: none;
}
.cls-recent__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cls-recent__main b {
  font-size: 12.5px;
  color: var(--ink, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cls-recent__meta {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
}
.cls-recent__bar {
  height: 4px;
  border-radius: 99px;
  background: #eef1f8;
  overflow: hidden;
  display: block;
}
.cls-recent__bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #4f46e5, #06b6d4);
}
.cls-recent__pct {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--brand-deep, #4338ca);
  flex: none;
}
.cls-recent__go {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--ink3, #94a3b8);
  flex: none;
}
.cls-recent__item:hover .cls-recent__go {
  color: var(--brand-deep, #4338ca);
}
.cls-recent__empty {
  padding: 18px 8px;
  text-align: center;
  color: var(--ink3, #94a3b8);
}
.cls-recent__empty-icon {
  font-size: 26px;
  display: block;
  margin-bottom: 6px;
}
.cls-recent__empty p {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.7;
}

@media (max-width: 1320px) {
  .cls-pub-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
