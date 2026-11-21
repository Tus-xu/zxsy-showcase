<template>
  <div class="asg" data-testid="teacher-assign">
    <section class="tv3-hero asg__hero">
      <div class="asg__hero-main">
        <div class="asg__hero-icon">📝</div>
        <div>
          <div class="tv3-hero__title">作业发布</div>
          <div class="tv3-hero__sub">
            四步：选题 → 选班级 → 设置 → 发布；发布结果写入班级作业记录，可在下方回看。
          </div>
        </div>
      </div>
      <div class="asg__hero-right">
        <span class="tv3-tag tv3-tag--primary">高二 (1) 班 · 数学</span>
        <button type="button" class="tv3-btn tv3-btn--sm" data-testid="assign-go-grading" @click="router.push('/teacher/grading')">
          批改工作台 →
        </button>
      </div>
    </section>

    <section class="tv3-card asg__wizard" data-testid="assign-wizard">
      <div class="asg__steps">
        <div v-for="(s, i) in steps" :key="s.key" class="asg__step" :class="{ 'is-active': i === step, 'is-done': i < step || published }">
          <span class="asg__step-dot">{{ i < step || published ? '✓' : i + 1 }}</span>
          <span class="asg__step-label">{{ s.label }}</span>
          <span v-if="i < steps.length - 1" class="asg__step-line" :class="{ 'is-done': i < step }" />
        </div>
        <div class="asg__steps-spacer" />
        <span v-if="published" class="tv3-tag tv3-tag--ok">已发布 {{ publishedAssignment.id }}</span>
        <span v-else class="asg__steps-count">已选 {{ selectedIds.length }} 题 · {{ selectedClass || '未选班级' }}</span>
      </div>

      <div v-if="!published" class="asg__body">
        <!-- step 1 选题 -->
        <div v-if="step === 0" class="asg__pane" data-testid="assign-pane-questions">
          <div class="asg__pane-head">
            <div>
              <b>① 选题</b>
              <span>从本次演示的三道指定题中选择要布置的题目，可多选。</span>
            </div>
            <div class="asg__pane-actions">
              <button type="button" class="tv3-btn tv3-btn--sm" @click="selectAll">
                {{ selectedIds.length === questions.length ? '清空选择' : '全选三道题' }}
              </button>
            </div>
          </div>
          <div class="asg__questions">
            <button
              v-for="q in questions"
              :key="q.id"
              type="button"
              class="asg__qcard"
              :class="{ 'is-selected': selectedIds.includes(q.id) }"
              :data-testid="`assign-q-${q.id}`"
              @click="toggleQuestion(q.id)"
            >
              <span class="asg__qcheck">{{ selectedIds.includes(q.id) ? '✓' : '' }}</span>
              <span class="asg__qhead">
                <b>{{ q.code }} · 第 {{ q.no }} 题</b>
                <span class="tv3-tag tv3-tag--primary">{{ q.typeLabel }}</span>
              </span>
              <span class="asg__qtitle">{{ q.title }}</span>
              <span class="asg__qtext"><MathText :text="q.questionText" /></span>
              <span class="asg__qmeta">{{ q.kp }} · {{ q.source }}</span>
            </button>
          </div>
          <div class="asg__nav">
            <span class="asg__nav-hint">{{ selectedIds.length ? `已选 ${selectedIds.length} 题：${selectedCodes}` : '请至少选择 1 道题' }}</span>
            <button type="button" class="tv3-btn tv3-btn--primary" :disabled="!selectedIds.length" data-testid="assign-next-1" @click="goStep(1)">
              下一步：选班级 →
            </button>
          </div>
        </div>

        <!-- step 2 选班级 -->
        <div v-else-if="step === 1" class="asg__pane" data-testid="assign-pane-class">
          <div class="asg__pane-head">
            <div>
              <b>② 选班级</b>
              <span>作业会发布到所选班级；学生端在课堂任务中看到同一份题目。</span>
            </div>
          </div>
          <div class="asg__classes">
            <button
              v-for="c in classOptions"
              :key="c.name"
              type="button"
              class="asg__classcard"
              :class="{ 'is-selected': selectedClass === c.name }"
              :data-testid="`assign-class-${c.name}`"
              @click="selectedClass = c.name"
            >
              <span class="asg__classradio">{{ selectedClass === c.name ? '●' : '○' }}</span>
              <span class="asg__classmain">
                <b>{{ c.name }} · 数学</b>
                <span>{{ c.desc }}</span>
              </span>
              <span v-if="c.name === '高二 (1) 班'" class="tv3-tag tv3-tag--gold">演示班级</span>
            </button>
          </div>
          <div class="asg__nav">
            <button type="button" class="tv3-btn" @click="goStep(0)">← 上一步</button>
            <button type="button" class="tv3-btn tv3-btn--primary" :disabled="!selectedClass" data-testid="assign-next-2" @click="goStep(2)">
              下一步：设置 →
            </button>
          </div>
        </div>

        <!-- step 3 设置 -->
        <div v-else-if="step === 2" class="asg__pane" data-testid="assign-pane-settings">
          <div class="asg__pane-head">
            <div>
              <b>③ 设置</b>
              <span>设置作业标题与截止时间；这些字段会随发布结果一起写入班级作业。</span>
            </div>
          </div>
          <div class="asg__form">
            <label class="asg__field">
              <span class="asg__field-label">作业标题</span>
              <input v-model="title" type="text" class="tv3-input" maxlength="48" data-testid="assign-title" placeholder="例如：第 3、9、14 题 · 课后针对性练习" />
              <span class="asg__field-hint">{{ title.length }} / 48</span>
            </label>
            <label class="asg__field">
              <span class="asg__field-label">截止时间</span>
              <input v-model="dueAt" type="datetime-local" class="tv3-input asg__datetime" data-testid="assign-due" />
              <span class="asg__field-hint">{{ dueText }}</span>
            </label>
          </div>
          <div class="asg__summary-chips">
            <span class="tv3-tag tv3-tag--primary">班级：{{ selectedClass }}</span>
            <span class="tv3-tag tv3-tag--gold">题目：{{ selectedCodes }}</span>
            <span class="tv3-tag tv3-tag--gray">共 {{ selectedIds.length }} 题 · 每题 5 分</span>
          </div>
          <div class="asg__nav">
            <button type="button" class="tv3-btn" @click="goStep(1)">← 上一步</button>
            <button type="button" class="tv3-btn tv3-btn--primary" :disabled="!settingsValid" data-testid="assign-next-3" @click="goStep(3)">
              下一步：确认发布 →
            </button>
          </div>
        </div>

        <!-- step 4 发布 -->
        <div v-else class="asg__pane" data-testid="assign-pane-publish">
          <div class="asg__pane-head">
            <div>
              <b>④ 发布</b>
              <span>确认后写入 <code>store.ext.teacherGrading.assignments</code>；刷新页面仍可回看。</span>
            </div>
          </div>
          <div class="asg__review">
            <div class="asg__review-main">
              <div class="asg__review-title">{{ title || '（未填写标题）' }}</div>
              <div class="asg__review-meta">{{ selectedClass }} · 截止 {{ dueText }} · 共 {{ selectedIds.length }} 题</div>
              <div class="asg__review-questions">
                <div v-for="q in selectedQuestions" :key="q.id" class="asg__review-q">
                  <span class="tv3-tag tv3-tag--gray">{{ q.code }}</span>
                  <b>第 {{ q.no }} 题 · {{ q.title }}</b>
                  <span>{{ q.typeLabel }}</span>
                </div>
              </div>
            </div>
            <div class="asg__review-side">
              <div class="asg__review-side-row"><span>发布班级</span><b>{{ selectedClass }}</b></div>
              <div class="asg__review-side-row"><span>题目来源</span><b>演示题库原题 · 三题手册收录</b></div>
              <div class="asg__review-side-row"><span>题量 / 分值</span><b>{{ selectedIds.length }} 题 / {{ selectedIds.length * 5 }} 分</b></div>
              <div class="asg__review-side-row"><span>数据写入</span><b>ext.teacherGrading.assignments</b></div>
            </div>
          </div>
          <p v-if="publishError" class="asg__error" data-testid="assign-error">{{ publishError }}</p>
          <div class="asg__nav">
            <button type="button" class="tv3-btn" @click="goStep(2)">← 上一步</button>
            <button type="button" class="tv3-btn tv3-btn--primary asg__publish" data-testid="assign-publish" @click="publish">
              发布作业（写入班级作业）
            </button>
          </div>
        </div>
      </div>

      <div v-else class="asg__published-ok" data-testid="assign-published">
        <div class="asg__published-icon">✓</div>
        <div class="asg__published-main">
          <b>作业已发布</b>
          <p>{{ publishedAssignment.title }}</p>
          <div class="asg__published-meta">
            <span>{{ publishedAssignment.className }}</span>
            <span>{{ publishedAssignment.questionIds.length }} 题</span>
            <span>截止 {{ dueText }}</span>
            <span>发布于 {{ fmtDateTime(publishedAssignment.publishedAt) }}</span>
            <span class="asg__id">ID：{{ publishedAssignment.id }}</span>
          </div>
        </div>
        <div class="asg__published-actions">
          <button type="button" class="tv3-btn tv3-btn--sm" @click="startAnother">再发布一份</button>
          <button type="button" class="tv3-btn tv3-btn--primary tv3-btn--sm" @click="router.push('/teacher/grading')">去批改 →</button>
        </div>
      </div>
    </section>

    <section class="tv3-card asg__list" data-testid="assign-published-list">
      <div class="asg__list-head">
        <div>
          <b>已发布作业</b>
          <span>来自 <code>store.ext.teacherGrading.assignments</code>，按发布时间倒序</span>
        </div>
        <span class="tv3-tag tv3-tag--primary">{{ assignments.length }} 份</span>
      </div>
      <div v-if="!assignments.length" class="asg__list-empty">
        <b>还没有已发布作业</b>
        <p>按上面四步发布后，这里会出现可回看的作业记录。</p>
      </div>
      <div v-else class="asg__list-rows">
        <div v-for="a in sortedAssignments" :key="a.id" class="asg__list-row" :data-testid="`assign-list-${a.id}`">
          <span class="asg__list-icon">📝</span>
          <div class="asg__list-main">
            <div class="asg__list-title">
              <b>{{ a.title }}</b>
              <span class="tv3-tag tv3-tag--ok">已发布</span>
            </div>
            <div class="asg__list-meta">
              {{ a.className }} · {{ a.questionIds.length }} 题（{{ codesOf(a.questionIds) }}） · 截止 {{ fmtDateTime(a.dueAt) }} · 发布于 {{ fmtDateTime(a.publishedAt) }}
            </div>
          </div>
          <button type="button" class="asg__list-toggle" @click="toggleExpand(a.id)">
            {{ expandedId === a.id ? '收起题目 ▲' : '查看题目 ▼' }}
          </button>
        </div>
        <div v-if="expandedId" class="asg__list-detail" data-testid="assign-list-detail">
          <div v-for="q in questionList(expandedId)" :key="q.id" class="asg__list-detail-q">
            <span class="tv3-tag tv3-tag--gray">{{ q.code }}</span>
            <b>第 {{ q.no }} 题 · {{ q.title }}</b>
            <span>{{ q.typeLabel }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../../state/demo'
import { submissions } from '../../data/submissions'
import { guidanceCases } from '../../data/guidance'
import { coursewareDecks } from '../../data/courseware'
import MathText from '../../components/MathText.vue'

const router = useRouter()

const TYPE_LABEL = { single: '单选题', multi: '多选题', fill: '填空题' }
const KP = {
  A: '圆锥曲线 · 离心率',
  B: '立体几何 · 线面关系',
  C: '概率统计 · 期望',
}

const questions = guidanceCases.map((c) => ({
  id: c.id,
  code: c.code,
  no: c.printedNumber,
  title: c.title,
  type: c.type,
  typeLabel: TYPE_LABEL[c.type] || '解答题',
  kp: KP[c.id] || c.title,
  source: c.sourceLabel,
  questionText: c.questionText,
}))

function assignmentsArray() {
  if (!store.ext || typeof store.ext !== 'object') store.ext = {}
  if (!store.ext.teacherGrading || typeof store.ext.teacherGrading !== 'object') store.ext.teacherGrading = {}
  const ns = store.ext.teacherGrading
  if (!Array.isArray(ns.assignments)) ns.assignments = []
  return ns.assignments
}

const steps = [
  { key: 'questions', label: '选题' },
  { key: 'class', label: '选班级' },
  { key: 'settings', label: '设置' },
  { key: 'publish', label: '发布' },
]

const step = ref(0)
const selectedIds = ref(['A', 'B', 'C'])
const selectedClass = ref('')
const title = ref('')
const dueAt = ref(defaultDueInput())
const published = ref(false)
const publishedAssignment = ref(null)
const publishError = ref('')
const expandedId = ref('')

function pad(n) {
  return String(n).padStart(2, '0')
}
function defaultDueInput() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(22, 0, 0, 0)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const selectedQuestions = computed(() =>
  selectedIds.value.map((id) => questions.find((q) => q.id === id)).filter(Boolean),
)
const selectedCodes = computed(() => selectedQuestions.value.map((q) => q.code).join('、'))
const defaultTitle = computed(() => {
  const nos = selectedQuestions.value.map((q) => q.no).join('、')
  return `第 ${nos} 题 · 课后针对性练习`
})

const classOptions = computed(() => {
  const map = new Map()
  for (const s of submissions) {
    if (!map.has(s.className)) {
      map.set(s.className, { name: s.className, desc: '', count: 0, fromSubs: true })
    }
    map.get(s.className).count += 1
  }
  for (const d of coursewareDecks) {
    const name = d.meta.className
    if (!map.has(name)) map.set(name, { name, desc: '', count: 0, fromSubs: false, fromDeck: d.title })
  }
  return [...map.values()].map((c) => ({
    name: c.name,
    desc: c.fromSubs
      ? `${c.count} 份已提交作业 · 含演示学生 林一川`
      : `备课课件班级：${c.fromDeck}`,
  }))
})

const settingsValid = computed(() => {
  if (!title.value.trim()) return false
  if (!dueAt.value) return false
  const t = new Date(dueAt.value).getTime()
  return Number.isFinite(t) && t > Date.now()
})

const dueText = computed(() => {
  if (!dueAt.value) return '未设置'
  const d = new Date(dueAt.value)
  if (Number.isNaN(d.getTime())) return '时间格式不正确'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

const assignments = computed(() => {
  const ns = store.ext && store.ext.teacherGrading
  const list = ns && Array.isArray(ns.assignments) ? ns.assignments : []
  return list
})
const sortedAssignments = computed(() =>
  assignments.value.slice().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
)

function toggleQuestion(id) {
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter((x) => x !== id)
  else selectedIds.value = [...selectedIds.value, id]
}
function selectAll() {
  selectedIds.value = selectedIds.value.length === questions.length ? [] : questions.map((q) => q.id)
}

function goStep(i) {
  if (i > 0 && !selectedIds.value.length) return
  if (i > 1 && !selectedClass.value) return
  if (i === 2 && !title.value) title.value = defaultTitle.value
  if (i === 2 && !dueAt.value) dueAt.value = defaultDueInput()
  step.value = i
  publishError.value = ''
}

function publish() {
  if (!settingsValid.value) {
    publishError.value = '请填写作业标题，并设置一个晚于当前时间的截止时间。'
    return
  }
  const assignment = {
    id: 'assign-' + Date.now(),
    title: title.value.trim(),
    className: selectedClass.value,
    questionIds: [...selectedIds.value],
    dueAt: new Date(dueAt.value).toISOString(),
    publishedAt: new Date().toISOString(),
  }
  assignmentsArray().push(assignment)
  publishedAssignment.value = assignment
  published.value = true
  publishError.value = ''
}

function startAnother() {
  published.value = false
  publishedAssignment.value = null
  step.value = 0
  selectedIds.value = ['A', 'B', 'C']
  title.value = ''
  dueAt.value = defaultDueInput()
}

function fmtDateTime(raw) {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function codesOf(ids) {
  return (ids || []).map((id) => (questions.find((q) => q.id === id) || { code: id }).code).join('、')
}
function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? '' : id
}
function questionList(id) {
  const a = assignments.value.find((x) => x.id === id)
  if (!a) return []
  return (a.questionIds || []).map((qid) => questions.find((q) => q.id === qid)).filter(Boolean)
}
</script>

<style scoped>
.asg {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.asg__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 22px;
}
.asg__hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
}
.asg__hero-icon {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 13px;
  display: grid;
  place-items: center;
  font-size: 21px;
  background: linear-gradient(135deg, #eef2ff 0%, #ecfeff 100%);
  border: 1px solid var(--tv3-primary-border);
  box-shadow: 0 6px 16px -8px rgba(79, 70, 229, 0.5);
}
.asg__hero-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.asg__wizard {
  padding: 0;
  overflow: hidden;
}
.asg__steps {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 12px 18px;
  border-bottom: 1px solid var(--tv3-line2);
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 100%);
}
.asg__step {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: none;
}
.asg__step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--tv3-ink3);
  background: var(--tv3-bg2);
  border: 1.5px solid var(--tv3-line);
  font-family: var(--tv3-font-num);
}
.asg__step.is-active .asg__step-dot {
  background: var(--tv3-primary);
  border-color: var(--tv3-primary);
  color: #fff;
}
.asg__step.is-done .asg__step-dot {
  background: var(--tv3-teal);
  border-color: var(--tv3-teal);
  color: #fff;
}
.asg__step-label {
  font-size: 12px;
  color: var(--tv3-ink3);
}
.asg__step.is-active .asg__step-label {
  color: var(--tv3-ink);
  font-weight: 700;
}
.asg__step.is-done .asg__step-label {
  color: var(--tv3-teal);
}
.asg__step-line {
  width: 52px;
  height: 2px;
  margin: 0 10px;
  background: var(--tv3-line);
}
.asg__step-line.is-done {
  background: var(--tv3-teal);
}
.asg__steps-spacer {
  flex: 1;
}
.asg__steps-count {
  font-size: 11px;
  color: var(--tv3-ink3);
}
.asg__body {
  padding: 14px 18px 16px;
}
.asg__pane-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.asg__pane-head b {
  font-size: 13.5px;
  color: var(--tv3-ink);
}
.asg__pane-head span {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.asg__pane-head code {
  font-family: var(--tv3-font-num);
  font-size: 10.5px;
  color: var(--tv3-primary);
  background: var(--tv3-bg2);
  border-radius: 3px;
  padding: 0 3px;
}
.asg__questions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.asg__qcard {
  position: relative;
  text-align: left;
  border: 1px solid var(--tv3-line);
  border-radius: 13px;
  background: #fff;
  padding: 12px 13px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: all 0.14s ease;
}
.asg__qcard:hover {
  border-color: var(--tv3-primary-border);
  box-shadow: var(--tv3-shadow-sm);
}
.asg__qcard.is-selected {
  border-color: var(--tv3-primary);
  background: linear-gradient(180deg, #f5f7ff 0%, #ffffff 55%);
  box-shadow: 0 8px 22px -12px rgba(79, 70, 229, 0.55);
}
.asg__qcheck {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid var(--tv3-line);
  background: #fff;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: #fff;
}
.asg__qcard.is-selected .asg__qcheck {
  background: var(--tv3-primary);
  border-color: var(--tv3-primary);
}
.asg__qhead {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-right: 22px;
}
.asg__qhead b {
  font-size: 12.5px;
  color: var(--tv3-ink);
}
.asg__qtitle {
  font-size: 13px;
  font-weight: 700;
  color: var(--tv3-ink2);
}
.asg__qtext {
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--tv3-ink3);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 57px;
}
.asg__qmeta {
  font-size: 10px;
  color: var(--tv3-ink3);
}
.asg__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--tv3-line2);
}
.asg__nav-hint {
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.asg__classes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.asg__classcard {
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--tv3-line);
  border-radius: 12px;
  background: #fff;
  padding: 13px 14px;
  transition: all 0.14s ease;
}
.asg__classcard:hover {
  border-color: var(--tv3-primary-border);
}
.asg__classcard.is-selected {
  border-color: var(--tv3-primary);
  background: linear-gradient(180deg, #f5f7ff 0%, #ffffff 70%);
  box-shadow: 0 8px 22px -12px rgba(79, 70, 229, 0.55);
}
.asg__classradio {
  color: var(--tv3-primary);
  font-size: 13px;
}
.asg__classmain {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.asg__classmain b {
  font-size: 13px;
  color: var(--tv3-ink);
}
.asg__classmain span {
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.asg__form {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 16px;
}
.asg__field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.asg__field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tv3-ink2);
}
.asg__field-hint {
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.asg__datetime {
  max-width: 240px;
}
.asg__summary-chips {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.asg__review {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 14px;
  border: 1px solid var(--tv3-line);
  border-radius: 13px;
  padding: 14px;
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 60%);
}
.asg__review-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--tv3-ink);
}
.asg__review-meta {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.asg__review-questions {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.asg__review-q {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--tv3-ink2);
  background: var(--tv3-bg2);
  border-radius: 8px;
  padding: 6px 10px;
}
.asg__review-q b {
  flex: 1;
}
.asg__review-q > span:last-child {
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.asg__review-side {
  border-left: 1px dashed var(--tv3-line);
  padding-left: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.asg__review-side-row {
  display: flex;
  flex-direction: column;
}
.asg__review-side-row span {
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.asg__review-side-row b {
  font-size: 12px;
  color: var(--tv3-ink2);
}
.asg__error {
  margin: 10px 0 0;
  font-size: 11.5px;
  color: var(--tv3-rose);
  background: var(--tv3-rose-soft);
  border: 1px solid var(--tv3-rose-border);
  border-radius: 8px;
  padding: 6px 10px;
}
.asg__publish {
  padding: 9px 20px;
  font-weight: 700;
}
.asg__published-ok {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 60%, #eef2ff 100%);
}
.asg__published-icon {
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--tv3-teal);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
}
.asg__published-main {
  flex: 1;
}
.asg__published-main b {
  font-size: 14px;
  color: var(--tv3-teal);
}
.asg__published-main p {
  margin: 2px 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--tv3-ink);
}
.asg__published-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.asg__published-meta .asg__id {
  font-family: var(--tv3-font-num);
  color: var(--tv3-primary);
}
.asg__published-actions {
  display: flex;
  gap: 8px;
}
.asg__list {
  padding: 0;
}
.asg__list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--tv3-line2);
}
.asg__list-head b {
  font-size: 13.5px;
  color: var(--tv3-ink);
}
.asg__list-head span {
  margin-left: 8px;
  font-size: 11px;
  color: var(--tv3-ink3);
}
.asg__list-head code {
  font-family: var(--tv3-font-num);
  font-size: 10px;
  color: var(--tv3-primary);
  background: var(--tv3-bg2);
  border-radius: 3px;
  padding: 0 3px;
}
.asg__list-empty {
  padding: 22px 16px;
  text-align: center;
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.asg__list-empty b {
  display: block;
  margin-bottom: 3px;
  font-size: 12.5px;
  color: var(--tv3-ink2);
}
.asg__list-empty p {
  margin: 0;
}
.asg__list-rows {
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.asg__list-row {
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid var(--tv3-line2);
  border-radius: 11px;
  padding: 9px 12px;
  background: #fff;
}
.asg__list-icon {
  font-size: 18px;
}
.asg__list-main {
  flex: 1;
  min-width: 0;
}
.asg__list-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.asg__list-title b {
  font-size: 12.5px;
  color: var(--tv3-ink);
}
.asg__list-meta {
  margin-top: 2px;
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.asg__list-toggle {
  border: 0;
  background: transparent;
  font-size: 10.5px;
  color: var(--tv3-primary);
  font-weight: 600;
  white-space: nowrap;
}
.asg__list-detail {
  border: 1px dashed var(--tv3-line);
  border-radius: 11px;
  padding: 9px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--tv3-bg2);
}
.asg__list-detail-q {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--tv3-ink2);
}
</style>

