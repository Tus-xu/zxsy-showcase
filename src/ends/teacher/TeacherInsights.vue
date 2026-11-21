<template>
  <div class="ins" data-testid="teacher-insights">
    <section class="tv3-hero ins__hero">
      <div class="ins__hero-main">
        <div class="ins__hero-icon">📊</div>
        <div>
          <div class="tv3-hero__title">学情洞察</div>
          <div class="tv3-hero__sub">
            基于三份提交的评分细则缺陷与学生端错答录入的热力图 / 错因统计；每条数字都可点回原始记录。
          </div>
        </div>
      </div>
      <div class="ins__hero-right">
        <span class="tv3-tag tv3-tag--primary">高二 (1) 班 · 数学</span>
        <span class="tv3-tag tv3-tag--gray">数据源：提交缺陷 + 学生错答</span>
      </div>
    </section>

    <div class="ins__kpis">
      <div class="ins__kpi tv3-card" data-testid="insight-kpi-confirmed">
        <span class="ins__kpi-label">已确认批改</span>
        <b>{{ confirmedCount }}<small> / {{ submissions.length }}</small></b>
        <span class="ins__kpi-note">教师终审写分后计入</span>
      </div>
      <div class="ins__kpi tv3-card" data-testid="insight-kpi-avg">
        <span class="ins__kpi-label">班级平均分</span>
        <b v-if="confirmedCount">{{ avgScore }}<small> / {{ totalFullScore }}</small></b>
        <b v-else>—</b>
        <span class="ins__kpi-note">{{ confirmedCount ? `按 ${confirmedCount} 份已确认终评计算` : '尚无已确认批改，不估算' }}</span>
      </div>
      <div class="ins__kpi tv3-card" data-testid="insight-kpi-pending">
        <span class="ins__kpi-label">待批</span>
        <b>{{ pendingCount }}</b>
        <span class="ins__kpi-note">去批改工作台完成终审</span>
      </div>
      <div class="ins__kpi tv3-card" data-testid="insight-kpi-evidence">
        <span class="ins__kpi-label">错答证据</span>
        <b>{{ allRecords.length }}</b>
        <span class="ins__kpi-note">提交缺陷 {{ defectRecords.length }} 条 + 学生错答 {{ studentErrorRecords.length }} 条</span>
      </div>
    </div>

    <div class="ins__grid">
      <section class="tv3-card ins__heat" data-testid="insights-heatmap">
        <div class="ins__card-head">
          <div>
            <b>知识点薄弱热力图</b>
            <span>行 = 三道指定题，列 = 错因类型；计数来自真实录入记录</span>
          </div>
          <span class="tv3-tag tv3-tag--gold">共 {{ allRecords.length }} 条证据</span>
        </div>
        <div class="heat" :style="{ '--cols': visibleCauses.length }">
          <div class="heat__corner">题目 \ 错因</div>
          <div v-for="c in visibleCauses" :key="c.key" class="heat__col-head" :title="c.desc">
            {{ c.label }}
          </div>
          <template v-for="row in heatRows" :key="row.id">
            <div class="heat__row-head">
              <b>题{{ row.meta.no }}</b>
              <small>{{ row.meta.title }}</small>
            </div>
            <button
              v-for="c in visibleCauses"
              :key="c.key"
              type="button"
              class="heat__cell"
              :class="{
                'is-zero': row.counts[c.key] === 0,
                'is-selected': selected && selected.caseId === row.id && selected.cause === c.key,
              }"
              :style="cellStyle(row.counts[c.key])"
              :title="cellTitle(row.id, c.key, row.counts[c.key])"
              :data-testid="`insight-cell-${row.id}-${c.key}`"
              @click="toggleCell(row.id, c.key)"
            >
              {{ row.counts[c.key] }}
            </button>
          </template>
        </div>
        <div class="heat__foot">
          <span class="heat__legend"><i class="lv0" />0 <i class="lv1" />1 <i class="lv2" />2 <i class="lv3" />≥3</span>
          <span>点击任意单元格 → 下方证据明细按该题 × 错因过滤</span>
        </div>
        <details class="heat__rules">
          <summary>查看错因归类规则（按引导解题步骤，避免拍脑袋归因）</summary>
          <div class="heat__rules-body">
            <div v-for="r in ruleRows" :key="r.caseId + r.stepId" class="heat__rule">
              <span class="tv3-tag tv3-tag--gray">题{{ r.no }} · {{ r.stepId }}</span>
              <span class="heat__rule-ask">{{ r.ask }}</span>
              <span class="tv3-tag tv3-tag--primary">{{ r.causeLabel }}</span>
            </div>
          </div>
        </details>
      </section>

      <section class="tv3-card ins__causes" data-testid="insights-causes">
        <div class="ins__card-head">
          <div>
            <b>错因构成</b>
            <span>占全部 {{ allRecords.length }} 条错答证据的比例</span>
          </div>
        </div>
        <div class="cause-list">
          <div v-for="c in visibleCauses" :key="c.key" class="cause">
            <div class="cause__top">
              <span class="cause__label">{{ c.label }}</span>
              <b>{{ causeCounts[c.key] || 0 }}<small> 条</small></b>
            </div>
            <div class="cause__bar">
              <div class="cause__bar-fill" :style="{ width: causePct(c.key) + '%', background: c.color }" />
            </div>
            <div class="cause__note">{{ c.desc }}</div>
          </div>
          <div v-if="!allRecords.length" class="cause__empty">暂无错答证据录入</div>
        </div>
        <div class="ins__cause-foot">
          <b>结论（由计数生成）：</b>
          <span>{{ causeInsightText }}</span>
        </div>
      </section>
    </div>

    <div class="ins__grid ins__grid--bottom">
      <section class="tv3-card ins__evidence" data-testid="insights-evidence">
        <div class="ins__card-head">
          <div>
            <b>错答证据明细</b>
            <span>每条记录标出来源与归类依据，可回到对应提交批改</span>
          </div>
          <button v-if="selected" type="button" class="tv3-btn tv3-btn--sm" @click="selected = null">
            清除筛选：题{{ caseNo(selected.caseId) }} · {{ causeLabel(selected.cause) }} ×
          </button>
        </div>
        <div v-if="!filteredRecords.length" class="ins__empty">
          {{ selected ? '该题 × 错因下暂无记录' : '暂无错答证据' }}
        </div>
        <div v-else class="evidence-list ms-scroll">
          <div v-for="r in filteredRecords" :key="r.id" class="evidence" :class="{ 'is-student': r.source === 'student' }">
            <span class="tv3-tag" :class="r.source === 'submission' ? 'tv3-tag--primary' : 'tv3-tag--warn'">
              {{ r.source === 'submission' ? '提交缺陷' : '学生错答' }}
            </span>
            <span class="evidence__src">
              题{{ caseNo(r.caseId) }} · {{ r.source === 'submission' ? r.id : r.id + (r.stepId ? ' · ' + r.stepId : '') }}
            </span>
            <span class="evidence__text">{{ r.text }}</span>
            <span class="tv3-tag tv3-tag--gray">{{ causeLabel(r.cause) }}</span>
            <button v-if="r.source === 'submission'" type="button" class="evidence__go" @click="router.push('/teacher/grading')">
              去批改 →
            </button>
          </div>
        </div>
      </section>

      <section class="tv3-card ins__subs" data-testid="insights-submissions">
        <div class="ins__card-head">
          <div>
            <b>三份提交对照</b>
            <span>系统建议 vs 教师终评，缺陷与状态实时读取</span>
          </div>
        </div>
        <table class="sub-table">
          <thead>
            <tr>
              <th>学生</th>
              <th>题目</th>
              <th>系统建议</th>
              <th>教师终分</th>
              <th>缺陷</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in submissions" :key="s.id" :data-testid="`insight-sub-${s.id}`">
              <td>{{ s.studentName }}</td>
              <td>题{{ caseNo(s.caseId) }} · {{ s.questionTitle }}</td>
              <td>{{ s.systemScore }} / {{ s.fullScore }}</td>
              <td>
                <b v-if="gradeOf(s.id)" class="sub-table__score">{{ gradeOf(s.id).score }} / {{ s.fullScore }}</b>
                <span v-else class="sub-table__pending">待批</span>
              </td>
              <td class="sub-table__defect">{{ s.defect }}</td>
              <td>
                <span class="tv3-tag" :class="gradeOf(s.id) ? 'tv3-tag--ok' : 'tv3-tag--warn'">
                  {{ gradeOf(s.id) ? '已确认' : '待批' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="ins__sub-foot">
          数字均来自本地已录入数据：提交缺陷来自 <code>src/data/submissions.js</code> 的 defect 字段，学生错答来自
          <code>store.student.errors</code>；无数据时显示 0，不编造随机数。
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../../state/demo'
import { submissions } from '../../data/submissions'
import { findGuidanceCase } from '../../data/guidance'

const router = useRouter()

const CAUSES = [
  { key: 'concept', label: '概念理解', color: '#6366f1', desc: '定义、对象含义或判定依据理解偏差' },
  { key: 'compute', label: '运算错误', color: '#0891b2', desc: '公式代入、化简或数值计算出错' },
  { key: 'condition', label: '条件遗漏', color: '#d97706', desc: '漏判判定所需的平行/垂直/面外等条件' },
  { key: 'reading', label: '审题表达', color: '#db2777', desc: '读题或选项表达、书写转化偏差' },
  { key: 'other', label: '未归类', color: '#64748b', desc: '未匹配到引导步骤归类的错答记录' },
]

/** 引导解题步骤 → 错因归类（依据每步 ask 的教学目标，界面上可展开核对） */
const STEP_CAUSE = {
  A: { s1: 'concept', s2: 'concept', s3: 'compute', s4: 'reading' },
  B: { s1: 'concept', s2: 'compute', s3: 'concept', s4: 'condition' },
  C: { s1: 'concept', s2: 'compute', s3: 'compute', s4: 'concept' },
}

function caseNo(caseId) {
  const c = findGuidanceCase(caseId)
  return c && c.printedNumber !== undefined ? c.printedNumber : caseId
}
function caseMeta(caseId) {
  const c = findGuidanceCase(caseId)
  return {
    id: caseId,
    no: c && c.printedNumber !== undefined ? c.printedNumber : caseId,
    title: c ? c.title : caseId,
  }
}
function causeLabel(key) {
  const c = CAUSES.find((x) => x.key === key)
  return c ? c.label : '未归类'
}

function isConfirmed(id) {
  const g = store.teacher.grading.grades[id]
  return !!(g && g.confirmed === true)
}
function gradeOf(id) {
  const g = store.teacher.grading.grades[id]
  return g && g.confirmed === true ? g : null
}

const confirmedCount = computed(() => submissions.filter((s) => isConfirmed(s.id)).length)
const pendingCount = computed(() => submissions.length - confirmedCount.value)
const totalFullScore = computed(() => submissions.reduce((a, s) => a + s.fullScore, 0))
const avgScore = computed(() => {
  const graded = submissions.filter((s) => isConfirmed(s.id))
  if (!graded.length) return 0
  const sum = graded.reduce((a, s) => a + Number(gradeOf(s.id).score || 0), 0)
  const avg = sum / graded.length
  return Math.round(avg * 10) / 10
})

/** 提交缺陷 → 错因（按 defect 文本中的关键词映射，规则在证据明细中可见） */
function causeOfDefect(text) {
  const t = String(text || '')
  if (!t || t === '无') return null
  if (t.includes('漏')) return 'condition'
  if (t.includes('误当') || t.includes('错答') || t.includes('混淆')) return 'concept'
  if (t.includes('算') || t.includes('计算')) return 'compute'
  return 'reading'
}

const defectRecords = computed(() =>
  submissions
    .map((s) => {
      const cause = causeOfDefect(s.defect)
      if (!cause) return null
      return {
        id: s.id,
        source: 'submission',
        student: s.studentName,
        caseId: s.caseId,
        cause,
        text: s.defect,
        stepId: '',
        at: s.submittedAt,
      }
    })
    .filter(Boolean),
)

const studentErrorRecords = computed(() => {
  const list = Array.isArray(store.student.errors) ? store.student.errors : []
  return list.map((e, i) => {
    const map = STEP_CAUSE[e.caseId] || {}
    return {
      id: 'err-' + (i + 1),
      source: 'student',
      student: '林一川',
      caseId: e.caseId,
      cause: map[e.stepId] || 'other',
      text: e.wrongInput,
      stepId: e.stepId || '',
      at: e.at,
      mastered: !!e.mastered,
    }
  })
})

const allRecords = computed(() => [...defectRecords.value, ...studentErrorRecords.value])

const visibleCauses = computed(() => {
  const used = new Set(allRecords.value.map((r) => r.cause))
  return CAUSES.filter((c) => c.key !== 'other' || used.has('other'))
})

const heatRows = computed(() =>
  ['A', 'B', 'C'].map((caseId) => {
    const meta = caseMeta(caseId)
    const counts = {}
    for (const c of visibleCauses.value) {
      counts[c.key] = allRecords.value.filter((r) => r.caseId === caseId && r.cause === c.key).length
    }
    return { id: caseId, meta, counts }
  }),
)

const maxCell = computed(() => {
  let max = 1
  for (const row of heatRows.value) for (const c of visibleCauses.value) max = Math.max(max, row.counts[c.key] || 0)
  return max
})

function cellStyle(count) {
  if (!count) return { background: '#f8fafc', color: '#cbd5e1' }
  const ratio = Math.min(1, count / maxCell.value)
  const alpha = 0.16 + ratio * 0.6
  return {
    background: `rgba(99, 102, 241, ${alpha.toFixed(2)})`,
    color: ratio > 0.55 ? '#fff' : '#312e81',
  }
}

function cellTitle(caseId, causeKey, count) {
  const items = allRecords.value.filter((r) => r.caseId === caseId && r.cause === causeKey)
  if (!count) return '暂无记录'
  return `题${caseNo(caseId)} · ${causeLabel(causeKey)}：${count} 条\n` +
    items.map((r) => `${r.source === 'submission' ? r.id : r.id} ${r.text}`).join('\n')
}

const causeCounts = computed(() => {
  const out = {}
  for (const c of visibleCauses.value) out[c.key] = allRecords.value.filter((r) => r.cause === c.key).length
  return out
})
function causePct(key) {
  if (!allRecords.value.length) return 0
  return Math.round(((causeCounts.value[key] || 0) / allRecords.value.length) * 100)
}

const causeInsightText = computed(() => {
  if (!allRecords.value.length) return '尚无错答证据，需先完成引导解题或批改。'
  const ranked = visibleCauses.value
    .map((c) => ({ label: c.label, n: causeCounts.value[c.key] || 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  if (!ranked.length) return '尚无错答证据。'
  const top = ranked[0]
  const second = ranked[1]
  let text = `最高频错因为「${top.label}」${top.n} 条（占 ${Math.round((top.n / allRecords.value.length) * 100)}%）`
  if (second) text += `，其次「${second.label}」${second.n} 条`
  text += '。建议按对应题目在课堂讲评中重讲判定条件与对象含义。'
  return text
})

const selected = ref(null)
function toggleCell(caseId, causeKey) {
  if (selected.value && selected.value.caseId === caseId && selected.value.cause === causeKey) {
    selected.value = null
    return
  }
  selected.value = { caseId, cause: causeKey }
}

const filteredRecords = computed(() => {
  if (!selected.value) return allRecords.value
  return allRecords.value.filter((r) => r.caseId === selected.value.caseId && r.cause === selected.value.cause)
})

const ruleRows = computed(() => {
  const rows = []
  for (const caseId of ['A', 'B', 'C']) {
    const c = findGuidanceCase(caseId)
    if (!c) continue
    for (const step of c.steps || []) {
      const cause = (STEP_CAUSE[caseId] || {})[step.id]
      if (!cause) continue
      rows.push({
        caseId,
        no: c.printedNumber,
        stepId: step.id,
        ask: String(step.ask || '').replace(/\$[^$]*\$/g, '').slice(0, 30) + '…',
        causeLabel: causeLabel(cause),
      })
    }
  }
  return rows
})
</script>

<style scoped>
.ins {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ins__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 22px;
}
.ins__hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ins__hero-icon {
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
.ins__hero-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.ins__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.ins__kpi {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ins__kpi-label {
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.ins__kpi b {
  font-size: 23px;
  line-height: 1.12;
  font-weight: 800;
  color: var(--tv3-ink);
  font-family: var(--tv3-font-num);
}
.ins__kpi b small {
  font-size: 13px;
  font-weight: 600;
  color: var(--tv3-ink3);
}
.ins__kpi-note {
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.ins__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.ins__grid--bottom {
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
}
.ins__card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--tv3-line2);
}
.ins__card-head b {
  font-size: 13.5px;
  color: var(--tv3-ink);
}
.ins__card-head span {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--tv3-ink3);
}
.ins__heat {
  display: flex;
  flex-direction: column;
}
.heat {
  display: grid;
  grid-template-columns: 132px repeat(var(--cols, 4), minmax(0, 1fr));
  gap: 6px;
  padding: 12px 16px 8px;
  align-items: stretch;
}
.heat__corner {
  font-size: 10.5px;
  color: var(--tv3-ink3);
  display: flex;
  align-items: center;
}
.heat__col-head {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--tv3-ink2);
  text-align: center;
  padding: 4px 0;
}
.heat__row-head {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
}
.heat__row-head b {
  font-size: 12.5px;
  color: var(--tv3-ink);
}
.heat__row-head small {
  font-size: 10px;
  color: var(--tv3-ink3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.heat__cell {
  border: 1px solid transparent;
  border-radius: 10px;
  min-height: 40px;
  font-size: 16px;
  font-weight: 800;
  font-family: var(--tv3-font-num);
  transition: all 0.13s ease;
}
.heat__cell.is-zero {
  border-color: var(--tv3-line2);
  font-weight: 600;
  font-size: 13px;
}
.heat__cell:hover {
  box-shadow: 0 6px 18px -8px rgba(79, 70, 229, 0.6);
  transform: translateY(-1px);
}
.heat__cell.is-selected {
  outline: 2px solid var(--tv3-primary);
  outline-offset: 1px;
}
.heat__foot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px 10px;
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.heat__legend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.heat__legend i {
  width: 13px;
  height: 13px;
  border-radius: 4px;
  display: inline-block;
  margin-left: 4px;
}
.heat__legend i.lv0 {
  background: #f8fafc;
  border: 1px solid var(--tv3-line);
}
.heat__legend i.lv1 {
  background: rgba(99, 102, 241, 0.32);
}
.heat__legend i.lv2 {
  background: rgba(99, 102, 241, 0.62);
}
.heat__legend i.lv3 {
  background: rgba(99, 102, 241, 0.86);
}
.heat__rules {
  margin: 0 16px 12px;
  border: 1px dashed var(--tv3-line);
  border-radius: 9px;
  background: var(--tv3-bg2);
  font-size: 11px;
  color: var(--tv3-ink2);
}
.heat__rules summary {
  cursor: pointer;
  padding: 6px 10px;
  color: var(--tv3-ink3);
}
.heat__rules-body {
  padding: 0 10px 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 10px;
  max-height: 132px;
  overflow-y: auto;
}
.heat__rule {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: var(--tv3-ink2);
  min-width: 0;
}
.heat__rule-ask {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--tv3-ink3);
}
.ins__causes {
  display: flex;
  flex-direction: column;
}
.cause-list {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cause__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.cause__label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tv3-ink2);
}
.cause__top b {
  font-size: 16px;
  color: var(--tv3-ink);
  font-family: var(--tv3-font-num);
}
.cause__top b small {
  font-size: 10.5px;
  color: var(--tv3-ink3);
  font-weight: 500;
}
.cause__bar {
  margin: 4px 0 2px;
  height: 6px;
  border-radius: 999px;
  background: var(--tv3-bg2);
  overflow: hidden;
}
.cause__bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.cause__note {
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.cause__empty {
  padding: 12px;
  text-align: center;
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.ins__cause-foot {
  margin: 2px 16px 12px;
  padding: 9px 11px;
  border-radius: 9px;
  background: var(--tv3-primary-soft);
  border: 1px solid var(--tv3-primary-border);
  font-size: 11px;
  line-height: 1.7;
  color: var(--tv3-ink2);
}
.ins__cause-foot b {
  color: var(--tv3-primary);
}
.ins__evidence {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.evidence-list {
  max-height: 168px;
  overflow-y: auto;
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.evidence {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border-radius: 9px;
  background: var(--tv3-bg2);
  font-size: 11.5px;
  color: var(--tv3-ink2);
}
.evidence.is-student {
  background: var(--tv3-amber-soft);
}
.evidence__src {
  flex: none;
  font-family: var(--tv3-font-num);
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.evidence__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.evidence__go {
  border: 0;
  background: transparent;
  color: var(--tv3-primary);
  font-size: 10.5px;
  font-weight: 600;
  padding: 0;
  flex: none;
}
.ins__empty {
  padding: 30px 16px;
  text-align: center;
  font-size: 11.5px;
  color: var(--tv3-ink3);
}
.ins__subs {
  display: flex;
  flex-direction: column;
}
.sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}
.sub-table th {
  text-align: left;
  padding: 7px 10px 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--tv3-ink3);
  border-bottom: 1px solid var(--tv3-line2);
  white-space: nowrap;
}
.sub-table td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--tv3-line2);
  color: var(--tv3-ink2);
  vertical-align: middle;
}
.sub-table tr:last-child td {
  border-bottom: 0;
}
.sub-table td:first-child {
  white-space: nowrap;
}
.sub-table .tv3-tag {
  white-space: nowrap;
}
.sub-table__score {
  color: var(--tv3-teal);
  font-family: var(--tv3-font-num);
}
.sub-table__pending {
  color: var(--tv3-amber);
}
.sub-table__defect {
  max-width: 200px;
  color: var(--tv3-ink3);
  font-size: 10.5px;
  line-height: 1.5;
}
.ins__sub-foot {
  margin-top: auto;
  padding: 8px 12px 10px;
  border-top: 1px dashed var(--tv3-line);
  font-size: 10px;
  line-height: 1.7;
  color: var(--tv3-ink3);
}
.ins__sub-foot code {
  font-family: var(--tv3-font-num);
  font-size: 9.5px;
  color: var(--tv3-primary);
  background: var(--tv3-bg2);
  border-radius: 3px;
  padding: 0 3px;
}
</style>
