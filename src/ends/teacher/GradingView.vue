<template>
  <div class="grad" data-testid="grading-page">
    <section class="tv3-hero grad__hero">
      <div class="grad__hero-main">
        <div class="grad__hero-icon">✍️</div>
        <div>
          <div class="tv3-hero__title">批改工作台</div>
          <div class="tv3-hero__sub">
            题聚焦 · 原图终审 · 教师唯一写分；确认后学生端按同一份提交 ID 回看分数与评语。
          </div>
        </div>
      </div>
      <div class="grad__hero-right">
        <div class="grad__stat">
          <b>{{ confirmedCount }}</b>
          <span>已确认</span>
        </div>
        <div class="grad__stat">
          <b>{{ pendingCount }}</b>
          <span>待批 / 共 {{ submissions.length }} 份</span>
        </div>
        <span class="tv3-tag tv3-tag--warn grad__hero-note">系统建议仅作参考，终评以教师确认为准</span>
        <button type="button" class="tv3-btn tv3-btn--sm" data-testid="grading-insights-link" @click="router.push('/teacher/insights')">
          学情洞察 →
        </button>
      </div>
    </section>

    <div class="grad__grid">
      <GradingQueue
        class="grad__col"
        :submissions="submissions"
        :grades="store.teacher.grading.grades"
        :active-id="activeId"
        @select="selectSubmission"
      />
      <GradingSubmission
        v-if="activeSubmission"
        class="grad__col"
        :submission="activeSubmission"
        :index="activeIndex"
        :case-data="activeCase"
        :reference="activeReference"
      />
      <GradingReview
        v-if="activeSubmission"
        class="grad__col"
        :submission="activeSubmission"
        :draft="activeDraft"
        :grade="activeGrade"
        :error="errorMsg"
        :next-id="nextPendingId"
        @update:score="updateScore"
        @update:comment="updateComment"
        @confirm="confirmGrading"
        @next="goNextPending"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../../state/demo'
import { submissions } from '../../data/submissions'
import { guidanceCases } from '../../data/guidance'
import GradingQueue from '../../components/teacher/grading/GradingQueue.vue'
import GradingSubmission from '../../components/teacher/grading/GradingSubmission.vue'
import GradingReview from '../../components/teacher/grading/GradingReview.vue'

const router = useRouter()

function isConfirmed(id) {
  const g = store.teacher.grading.grades[id]
  return !!(g && g.confirmed === true)
}

const firstPending = submissions.find((s) => !isConfirmed(s.id))
const activeId = ref(firstPending ? firstPending.id : submissions[0].id)
const errorMsg = ref('')

function initialDraft(sub) {
  const g = store.teacher.grading.grades[sub.id]
  const confirmed = !!(g && g.confirmed === true)
  return {
    score: confirmed ? g.score : sub.systemScore,
    comment: confirmed ? g.comment : sub.systemComment,
  }
}
// 进入页面时一次性建立三份草稿：已确认的取终评回显，未确认的以系统建议为起点（教师可改）
const drafts = reactive(Object.fromEntries(submissions.map((s) => [s.id, initialDraft(s)])))

const activeIndex = computed(() => submissions.findIndex((s) => s.id === activeId.value))
const activeSubmission = computed(() => submissions[activeIndex.value] || submissions[0])
const activeCase = computed(() => guidanceCases.find((c) => c.id === activeSubmission.value.caseId) || null)
const activeGrade = computed(() => store.teacher.grading.grades[activeSubmission.value.id] || null)
const activeDraft = computed(() => drafts[activeSubmission.value.id])

const activeReference = computed(() => {
  const c = activeCase.value
  if (!c || !c.final) return { answer: '', lines: [], keyPoint: '' }
  const title = c.final.title || ''
  const answer = title.replace(/^[ABC]\s*·\s*结论[:：]\s*/, '')
  return { answer, lines: c.final.lines || [], keyPoint: c.final.keyPoint || '' }
})

const confirmedCount = computed(() => submissions.filter((s) => isConfirmed(s.id)).length)
const pendingCount = computed(() => submissions.length - confirmedCount.value)
const nextPending = computed(() => submissions.find((s) => s.id !== activeId.value && !isConfirmed(s.id)) || null)
const nextPendingId = computed(() => (nextPending.value ? nextPending.value.id : ''))

function selectSubmission(id) {
  if (id === activeId.value) return
  activeId.value = id
  errorMsg.value = ''
}

function updateScore(value) {
  activeDraft.value.score = value
  errorMsg.value = ''
}
function updateComment(value) {
  activeDraft.value.comment = value
}

function confirmGrading() {
  const sub = activeSubmission.value
  const draft = activeDraft.value
  const raw = draft.score
  const num = typeof raw === 'string' ? Number(raw.trim()) : Number(raw)
  if (raw === '' || raw === null || raw === undefined || Number.isNaN(num)) {
    errorMsg.value = '请填写教师终评分（0 ~ ' + sub.fullScore + ' 分）'
    return
  }
  if (num < 0 || num > sub.fullScore) {
    errorMsg.value = `终评分需在 0 ~ ${sub.fullScore} 分之间，当前为 ${num}`
    return
  }
  const comment = String(draft.comment || '').trim()
  store.teacher.grading.grades[sub.id] = {
    score: num,
    comment,
    confirmed: true,
    gradedAt: new Date().toISOString(),
  }
  draft.score = num
  draft.comment = comment
  errorMsg.value = ''
}

function goNextPending() {
  if (nextPending.value) selectSubmission(nextPending.value.id)
}
</script>

<style scoped>
.grad {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.grad__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 22px;
}
.grad__hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.grad__hero-icon {
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
.grad__hero-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.grad__stat {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  text-align: right;
}
.grad__stat b {
  font-size: 20px;
  font-weight: 800;
  color: var(--tv3-primary);
  font-family: var(--tv3-font-num);
}
.grad__stat span {
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.grad__hero-note {
  max-width: 230px;
  border-radius: 999px;
  padding: 4px 10px;
  font-weight: 500;
  line-height: 1.4;
}
.grad__grid {
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr) 356px;
  gap: 14px;
  align-items: stretch;
  height: calc(100vh - 226px);
  min-height: 540px;
}
.grad__col {
  height: 100%;
  min-height: 0;
}
@media (max-width: 1500px) {
  .grad__grid {
    grid-template-columns: 268px minmax(0, 1fr) 330px;
  }
}
</style>
