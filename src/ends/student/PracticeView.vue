<template>
  <StudentThemeScope class="page practice">
    <header class="prac-head">
      <div>
        <h1 class="page-title">练题 <span class="ms-tag">举一反三</span></h1>
        <p class="page-sub">
          由本次演示的三道题各生成一组变式；作答后按封存数学基准判分，给出错因反馈与完整解析，记录保存在本机。
        </p>
      </div>
      <div class="prac-head__right">
        <span class="prac-baseline">判分依据：封存数学基准（2026-11-21）</span>
        <button class="ms-btn ms-btn--sm" @click="router.push('/student/errors')">查看错题本</button>
      </div>
    </header>

    <!-- 统计 -->
    <section class="prac-stats">
      <div class="prac-stat ms-card">
        <span>练习进度</span>
        <b>{{ stats.done }}<small>/{{ stats.total }}</small></b>
        <i class="prac-stat__bar"><em :style="{ width: progressWidth }"></em></i>
      </div>
      <div class="prac-stat ms-card">
        <span>一次答对</span>
        <b>{{ stats.firstPass }}</b>
        <i class="prac-stat__hint">首次提交即正确的题数</i>
      </div>
      <div class="prac-stat ms-card">
        <span>待复习</span>
        <b :class="{ 'is-warn': stats.todo > 0 }">{{ stats.todo }}</b>
        <i class="prac-stat__hint">最近一次结果不是“答对”</i>
      </div>
      <div class="prac-stat ms-card">
        <span>练习记录</span>
        <b>{{ stats.logCount }}</b>
        <i class="prac-stat__hint">每次提交都会入账</i>
      </div>
    </section>

    <!-- 三题分组 -->
    <nav class="prac-tabs" aria-label="变式分组">
      <button
        v-for="g in practiceGroups"
        :key="g.caseId"
        class="prac-tab"
        :class="{ active: g.caseId === ps.selectedCase }"
        :data-qa="`practice-tab-${g.caseId}`"
        @click="selectCase(g.caseId)"
      >
        <span class="prac-tab__code">{{ g.code }}</span>
        <span class="prac-tab__title">{{ g.title }}</span>
        <span class="prac-tab__count">{{ groupDone(g.caseId) }}/{{ g.items.length }}</span>
      </button>
    </nav>

    <div class="prac-main">
      <!-- 题目卡 -->
      <section class="prac-card ms-card">
        <div class="prac-card__items">
          <button
            v-for="it in currentGroup.items"
            :key="it.id"
            class="prac-pill"
            :class="[`is-${statusOf(it.id)}`, { active: it.id === currentItem.id }]"
            :data-qa="`practice-item-${it.id}`"
            @click="selectItem(it.id)"
          >
            <span class="prac-pill__dot"></span>
            {{ it.shortTitle }}
            <span v-if="statusOf(it.id) === 'correct'" class="prac-pill__ok">✓</span>
            <span v-else-if="statusOf(it.id) === 'partial'" class="prac-pill__partial">◐</span>
            <span v-else-if="statusOf(it.id) === 'wrong'" class="prac-pill__bad">!</span>
          </button>
        </div>

        <div class="prac-meta">
          <span class="ms-tag">{{ currentItem.kind === 'original' ? '原题' : '变式' }}</span>
          <span class="ms-tag ms-tag--gray">{{ currentItem.kind === 'original' ? currentItem.sourceNote : '本题库自撰 · 变式' }}</span>
          <span class="ms-tag ms-tag--gray">{{ currentGroup.knowledge }}</span>
          <span class="prac-meta__source">{{ currentItem.title }}</span>
        </div>

        <div class="prac-stem">
          <MathText :text="currentItem.stem" block />
        </div>

        <!-- 作答区 -->
        <div v-if="!answeredView" class="prac-answer">
          <div v-if="currentItem.type !== 'fill'" class="prac-options" :class="{ 'is-multi': currentItem.type === 'multi' }">
            <button
              v-for="opt in currentItem.options"
              :key="opt.key"
              class="prac-option"
              :class="{ selected: picked.includes(opt.key) }"
              :data-qa="`practice-option-${opt.key}`"
              @click="toggleOption(opt.key)"
            >
              <span class="prac-option__key">{{ opt.key }}</span>
              <MathText :text="opt.text" />
            </button>
          </div>
          <div v-else class="prac-fill">
            <input
              v-model="draft"
              class="prac-input"
              :placeholder="currentItem.type === 'fill' ? '填写最终结果（分数或小数均可）' : '填写你的答案'"
              data-qa="practice-input"
              @keydown.enter.prevent="submit"
            />
            <span class="prac-fill__hint">可接受等价写法，例如分数 61/25 或小数 2.44</span>
          </div>

          <div class="prac-submit-row">
            <button
              class="ms-btn ms-btn--primary"
              :disabled="!canSubmit"
              data-qa="practice-submit"
              @click="submit"
            >
              提交判分
            </button>
            <button class="ms-btn" @click="router.push(`/student/guide/${currentGroup.caseId}`)">
              回到原题引导
            </button>
            <span v-if="currentItem.type === 'multi'" class="prac-submit-row__tip">多选题：可点选多项后提交</span>
          </div>
        </div>

        <!-- 判分结果 -->
        <div v-if="answeredView" class="prac-result" :class="`is-${currentItemRec.status}`" data-qa="practice-result">
          <div class="prac-result__head">
            <span class="prac-result__badge">{{ resultLabel(currentItemRec.status) }}</span>
            <b v-if="currentItemRec.status === 'correct'">回答正确</b>
            <b v-else-if="currentItemRec.status === 'partial'">部分正确，还差一步</b>
            <b v-else>这次还不对</b>
            <span class="prac-result__saved" data-qa="practice-saved">已记录 {{ formatTime(currentItemRec.lastAt) }}</span>
          </div>
          <dl class="prac-result__rows">
            <div>
              <dt>你的作答</dt>
              <dd data-qa="practice-your-answer">{{ currentItemRec.lastAnswer || '（空）' }}</dd>
            </div>
            <div>
              <dt>{{ currentItem.kind === 'original' ? '封存答案' : '参考答案' }}</dt>
              <dd>{{ currentItemRec.answerDisplay }}</dd>
            </div>
            <div v-if="currentItemRec.attempts > 1">
              <dt>作答次数</dt>
              <dd>第 {{ currentItemRec.attempts }} 次提交</dd>
            </div>
          </dl>

          <div v-if="currentItemRec.feedback && currentItemRec.feedback.length" class="prac-cause" data-qa="practice-feedback">
            <b>错因反馈</b>
            <ul>
              <li v-for="(f, i) in currentItemRec.feedback" :key="i"><MathText :text="f" /></li>
            </ul>
          </div>

          <details class="prac-solution" open data-qa="practice-solution">
            <summary>完整解析</summary>
            <MathText :text="currentItem.solution" block />
            <p class="prac-solution__key"><b>关键点</b><MathText :text="currentItem.keyPoint" /></p>
          </details>

          <div class="prac-result__actions">
            <button class="ms-btn ms-btn--primary" data-qa="practice-redo" @click="redo">再答一次</button>
            <button class="ms-btn" data-qa="practice-next" @click="nextItem">下一题 ›</button>
            <button class="ms-btn" @click="router.push(`/student/errors`)">去错题本复习</button>
          </div>
        </div>
      </section>

      <!-- 右栏 -->
      <aside class="prac-side">
        <section class="prac-panel ms-card">
          <div class="prac-panel__head"><b>原题</b><span>{{ currentGroup.code }} · {{ currentGroup.chip }}</span></div>
          <div class="prac-origin">
            <img :src="currentGroup.image" :alt="currentGroup.title" @click="router.push(`/student/guide/${currentGroup.caseId}`)" />
            <div class="prac-origin__meta">
              <b>{{ currentGroup.title }}</b>
              <span>{{ currentGroup.sealedNote }}</span>
              <button class="ms-btn ms-btn--sm" @click="router.push(`/student/guide/${currentGroup.caseId}`)">打开引导解题</button>
            </div>
          </div>
        </section>

        <section class="prac-panel ms-card">
          <div class="prac-panel__head"><b>练习记录</b><span>最近 {{ Math.min(ps.log.length, 6) }} 条</span></div>
          <ol v-if="ps.log.length" class="prac-log" data-qa="practice-log">
            <li v-for="(log, i) in recentLog" :key="i">
              <span class="prac-log__time">{{ formatTime(log.at) }}</span>
              <span class="prac-log__title">{{ shortTitleOf(log.itemId) }}</span>
              <span class="prac-log__tag" :class="`is-${log.result}`">{{ resultShort(log.result) }}</span>
            </li>
          </ol>
          <div v-else class="prac-empty" data-qa="practice-log-empty">
            还没有练习记录。选一道题提交后，这里会按时间倒序记录每次作答（刷新后仍在）。
          </div>
        </section>
      </aside>
    </div>
  </StudentThemeScope>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MathText from '../../components/MathText.vue'
import StudentThemeScope from '../../components/student/StudentThemeScope.vue'
import {
  describePracticeAnswer,
  findPracticeGroup,
  findPracticeItem,
  judgePracticeItem,
  practiceGroups,
  practiceItems,
} from '../../data/practice'
import { store } from '../../state/demo'

const route = useRoute()
const router = useRouter()

/* ---------------- 持久化状态 ---------------- */
function blankPractice() {
  return { selectedCase: 'A', selectedItem: {}, records: {}, log: [] }
}
function ensurePractice() {
  if (!store.ext.studentPractice || typeof store.ext.studentPractice !== 'object') {
    store.ext.studentPractice = blankPractice()
  }
  const s = store.ext.studentPractice
  if (!s.records || typeof s.records !== 'object') s.records = {}
  if (!Array.isArray(s.log)) s.log = []
  if (!s.selectedItem || typeof s.selectedItem !== 'object') s.selectedItem = {}
  if (!findPracticeGroup(s.selectedCase)) s.selectedCase = 'A'
  return s
}
const ps = ensurePractice()

const picked = ref([])
const draft = ref('')
const redoMode = ref(false)

/* ---------------- 当前题目 ---------------- */
const currentGroup = computed(() => findPracticeGroup(ps.selectedCase) || practiceGroups[0])
const currentItem = computed(() => {
  const group = currentGroup.value
  const wanted = ps.selectedItem[group.caseId]
  return findPracticeItem(wanted) || group.items[0]
})
const currentItemRec = computed(() => ps.records[currentItem.value.id] || null)
const answeredView = computed(() => !!currentItemRec.value && !redoMode.value)

const canSubmit = computed(() => {
  if (currentItem.value.type === 'fill') return !!draft.value.trim()
  return picked.value.length > 0
})

/* ---------------- 统计 ---------------- */
const stats = computed(() => {
  const answered = practiceItems.filter((it) => ps.records[it.id])
  const correct = answered.filter((it) => ps.records[it.id].status === 'correct')
  const todo = answered.filter((it) => ps.records[it.id].status !== 'correct')
  return {
    total: practiceItems.length,
    done: answered.length,
    firstPass: answered.filter((it) => ps.records[it.id].firstCorrect).length,
    todo: todo.length,
    logCount: ps.log.length,
  }
})
const progressWidth = computed(() => `${Math.round((stats.value.done / stats.value.total) * 100)}%`)

const recentLog = computed(() => ps.log.slice(0, 6))

function statusOf(itemId) {
  const rec = ps.records[itemId]
  return rec ? rec.status : 'none'
}
function groupDone(caseId) {
  const group = findPracticeGroup(caseId)
  if (!group) return 0
  return group.items.filter((it) => ps.records[it.id]).length
}

/* ---------------- 交互 ---------------- */
function resetDraft() {
  picked.value = []
  draft.value = ''
  redoMode.value = false
}

function ensureItemChoice(caseId) {
  const group = findPracticeGroup(caseId)
  if (!group) return
  const wanted = ps.selectedItem[caseId]
  if (!findPracticeItem(wanted)) ps.selectedItem[caseId] = group.items[0].id
}

function selectCase(caseId) {
  if (!findPracticeGroup(caseId)) return
  ps.selectedCase = caseId
  ensureItemChoice(caseId)
  resetDraft()
}
function selectItem(itemId) {
  const item = findPracticeItem(itemId)
  if (!item) return
  ps.selectedCase = item.caseId
  ps.selectedItem[item.caseId] = item.id
  resetDraft()
}
function toggleOption(key) {
  if (currentItem.value.type === 'single') {
    picked.value = [key]
    return
  }
  const i = picked.value.indexOf(key)
  if (i >= 0) picked.value.splice(i, 1)
  else picked.value.push(key)
}

function submit() {
  if (!canSubmit.value) return
  const item = currentItem.value
  const raw =
    item.type === 'fill' ? { text: draft.value.trim() } : { keys: picked.value.slice() }
  const res = judgePracticeItem(item, raw)
  const now = Date.now()
  const prev = ps.records[item.id] || {}
  const history = Array.isArray(prev.history) ? prev.history.slice(-9) : []
  history.push({ answer: describePracticeAnswer(item, raw), status: res.status, at: now })
  const attempts = (prev.attempts || 0) + 1
  ps.records[item.id] = {
    status: res.status,
    feedback: res.feedback,
    answerDisplay: res.answerDisplay,
    lastAnswer: describePracticeAnswer(item, raw),
    attempts,
    firstCorrect: attempts === 1 ? res.status === 'correct' : !!prev.firstCorrect,
    firstStatus: attempts === 1 ? res.status : prev.firstStatus || null,
    lastAt: now,
    history,
  }
  const logEntry = {
    itemId: item.id,
    caseId: item.caseId,
    result: res.status,
    answer: describePracticeAnswer(item, raw),
    at: now,
  }
  ps.log = [logEntry, ...ps.log].slice(0, 40)
  redoMode.value = false
}

function redo() {
  redoMode.value = true
  picked.value = []
  draft.value = ''
}

function nextItem() {
  const group = currentGroup.value
  const idx = group.items.findIndex((it) => it.id === currentItem.value.id)
  let next = group.items[idx + 1]
  if (next) {
    selectItem(next.id)
    return
  }
  const gi = practiceGroups.findIndex((g) => g.caseId === group.caseId)
  const nextGroup = practiceGroups[(gi + 1) % practiceGroups.length]
  ps.selectedCase = nextGroup.caseId
  ensureItemChoice(nextGroup.caseId)
  selectItem(ps.selectedItem[nextGroup.caseId])
}

/* ---------------- 展示辅助 ---------------- */
function resultLabel(status) {
  if (status === 'correct') return '答对'
  if (status === 'partial') return '部分正确'
  return '还不对'
}
function resultShort(status) {
  if (status === 'correct') return '答对'
  if (status === 'partial') return '部分'
  return '还不对'
}
function shortTitleOf(itemId) {
  const item = findPracticeItem(itemId)
  if (!item) return itemId
  const group = findPracticeGroup(item.caseId)
  return `${group ? group.code : item.caseId} · ${item.shortTitle}`
}
function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (d.toDateString() === now.toDateString()) return `今天 ${hm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

/* ---------------- 从「我的 → 掌握地图」带参进入 ---------------- */
function applyRouteCase() {
  const q = route.query.case
  if (q && findPracticeGroup(String(q))) {
    if (ps.selectedCase !== String(q)) {
      ps.selectedCase = String(q)
      ensureItemChoice(String(q))
      resetDraft()
    }
  }
}
applyRouteCase()
watch(() => route.query.case, applyRouteCase)

// 初次进入：确保当前分组有选中的题目
ensureItemChoice(ps.selectedCase)
watch(
  () => ps.selectedCase,
  (id) => ensureItemChoice(id),
)
</script>

<style scoped>
.page.practice {
  padding: 22px 30px 40px;
}
.prac-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}
.prac-head .page-title {
  margin-bottom: 2px;
}
.prac-head .page-sub {
  margin-bottom: 0;
  font-size: 13px;
  color: var(--ink2);
}
.prac-head__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  padding-top: 6px;
}
.prac-baseline {
  font-size: 11.5px;
  color: var(--ink3);
}
.prac-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.prac-stat {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.prac-stat > span {
  font-size: 11.5px;
  color: var(--ink3);
}
.prac-stat b {
  font-size: 23px;
  line-height: 1.2;
  font-family: var(--font-num, inherit);
  color: var(--ink);
}
.prac-stat b small {
  font-size: 13px;
  color: var(--ink3);
  font-weight: 500;
}
.prac-stat b.is-warn {
  color: var(--warn-deep);
}
.prac-stat__hint {
  font-size: 10.8px;
  color: var(--ink3);
  font-style: normal;
}
.prac-stat__bar {
  display: block;
  height: 5px;
  border-radius: 99px;
  background: var(--bg2);
  margin-top: 4px;
  overflow: hidden;
}
.prac-stat__bar em {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--brand), var(--brand2));
  transition: width 0.3s ease;
}
.prac-tabs {
  display: flex;
  gap: 9px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.prac-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink2);
  font-size: 13px;
  transition: all 0.16s ease;
}
.prac-tab:hover {
  border-color: var(--brand);
  color: var(--brand-deep);
}
.prac-tab.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 700;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}
.prac-tab__code {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--bg2);
  color: var(--ink2);
}
.prac-tab.active .prac-tab__code {
  background: var(--brand);
  color: #fff;
}
.prac-tab__count {
  font-size: 11px;
  color: var(--ink3);
}
.prac-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 14px;
  align-items: start;
}
.prac-card {
  padding: 16px 18px 18px;
}
.prac-card__items {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.prac-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 99px;
  padding: 5px 13px;
  font-size: 12.5px;
  color: var(--ink2);
}
.prac-pill:hover {
  border-color: var(--brand);
}
.prac-pill.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 700;
}
.prac-pill__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink4);
}
.prac-pill.is-correct .prac-pill__dot {
  background: var(--ok);
}
.prac-pill.is-partial .prac-pill__dot {
  background: var(--warn);
}
.prac-pill.is-wrong .prac-pill__dot {
  background: var(--err);
}
.prac-pill__ok {
  color: var(--ok);
  font-weight: 800;
}
.prac-pill__partial {
  color: var(--warn);
  font-weight: 800;
}
.prac-pill__bad {
  color: var(--err);
  font-weight: 800;
}
.prac-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.prac-meta__source {
  font-size: 11.5px;
  color: var(--ink3);
}
.prac-stem {
  font-size: var(--st-read, 14px);
  line-height: 1.95;
  color: var(--ink);
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bg2);
  border: 1px solid var(--line2, var(--line));
}
.prac-answer {
  margin-top: 14px;
}
.prac-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}
.prac-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--card);
  font-size: 13.5px;
  color: var(--ink);
  text-align: left;
  transition: all 0.14s ease;
}
.prac-option:hover {
  border-color: var(--brand);
}
.prac-option.selected {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.13);
}
.prac-option__key {
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--bg2);
  color: var(--ink2);
}
.prac-option.selected .prac-option__key {
  background: var(--brand);
  color: #fff;
}
.prac-fill {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.prac-input {
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 0 14px;
  font-size: 14.5px;
  font-family: inherit;
  background: var(--card);
  color: var(--ink);
  outline: none;
  transition: all 0.15s ease;
}
.prac-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}
.prac-fill__hint {
  font-size: 11px;
  color: var(--ink3);
}
.prac-submit-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.prac-submit-row__tip {
  font-size: 11.5px;
  color: var(--ink3);
}
.prac-result {
  margin-top: 14px;
  border-radius: 13px;
  padding: 13px 15px;
  border: 1px solid var(--line);
  background: var(--card);
}
.prac-result.is-correct {
  border-color: var(--ok-border, #a7f3d0);
  background: var(--ok-bg);
}
.prac-result.is-partial {
  border-color: var(--warn-border, #fde68a);
  background: var(--warn-bg);
}
.prac-result.is-wrong {
  border-color: var(--err-border, #fecaca);
  background: var(--err-bg);
}
.prac-result__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.prac-result__head b {
  font-size: 14px;
}
.prac-result__badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 9px;
  border-radius: 99px;
  background: var(--ok, #059669);
  color: #fff;
}
.prac-result.is-partial .prac-result__badge {
  background: var(--warn, #d97706);
}
.prac-result.is-wrong .prac-result__badge {
  background: var(--err, #dc2626);
}
.prac-result__saved {
  margin-left: auto;
  font-size: 11px;
  color: var(--ink3);
}
.prac-result__rows {
  display: flex;
  gap: 26px;
  flex-wrap: wrap;
  margin: 0 0 8px;
}
.prac-result__rows dt {
  font-size: 10.8px;
  color: var(--ink3);
}
.prac-result__rows dd {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  word-break: break-all;
}
.prac-cause {
  margin-top: 8px;
  padding: 10px 13px;
  border-radius: 10px;
  background: var(--card);
  border: 1px dashed var(--line);
  font-size: 12.8px;
  line-height: 1.85;
  color: var(--ink2);
}
.prac-cause b {
  display: block;
  font-size: 11.5px;
  color: var(--ink3);
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.prac-cause ul {
  margin: 0;
  padding-left: 18px;
}
.prac-cause li + li {
  margin-top: 3px;
}
.prac-solution {
  margin-top: 9px;
  font-size: 12.8px;
  line-height: 1.9;
  color: var(--ink2);
}
.prac-solution summary {
  cursor: pointer;
  font-size: 11.8px;
  font-weight: 700;
  color: var(--brand-deep);
  margin-bottom: 5px;
}
.prac-solution__key {
  margin: 8px 0 0;
  padding: 9px 12px;
  border-radius: 9px;
  background: var(--bg2);
  font-size: 12.3px;
  display: flex;
  gap: 8px;
}
.prac-solution__key b {
  flex: none;
  color: var(--brand-deep);
}
.prac-result__actions {
  margin-top: 11px;
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}
.prac-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.prac-panel {
  padding: 14px 16px;
}
.prac-panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.prac-panel__head b {
  font-size: 13.5px;
}
.prac-panel__head span {
  font-size: 11px;
  color: var(--ink3);
}
.prac-origin {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.prac-origin img {
  width: 100%;
  height: 128px;
  object-fit: contain;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}
.prac-origin__meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.prac-origin__meta b {
  font-size: 13px;
}
.prac-origin__meta span {
  font-size: 11.3px;
  color: var(--ink3);
  line-height: 1.6;
}
.prac-origin__meta .ms-btn {
  align-self: flex-start;
  margin-top: 2px;
}
.prac-log {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.prac-log li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--bg2);
}
.prac-log__time {
  color: var(--ink3);
  font-size: 10.8px;
  flex: none;
}
.prac-log__title {
  flex: 1;
  color: var(--ink2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prac-log__tag {
  flex: none;
  font-size: 10.8px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 99px;
}
.prac-log__tag.is-correct {
  background: var(--ok-bg);
  color: var(--ok-deep);
}
.prac-log__tag.is-partial {
  background: var(--warn-bg);
  color: var(--warn-deep);
}
.prac-log__tag.is-wrong {
  background: var(--err-bg);
  color: var(--err-deep);
}
.prac-empty {
  font-size: 12px;
  color: var(--ink3);
  line-height: 1.75;
}
</style>
