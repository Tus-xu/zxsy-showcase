<template>
  <StudentThemeScope class="page errors">
    <header class="err-head">
      <div>
        <h1 class="page-title">错题 <span class="ms-tag ms-tag--err">{{ errors.length }} 道</span></h1>
        <p class="page-sub">
          错题来自引导解题里的真实错答；错题本为空时，用三题手册中的三份典型错答作为演示种子初始化。可定位原题、重开引导、标记掌握。
        </p>
      </div>
      <div class="err-head__right">
        <button class="ms-btn" data-qa="errors-go-guide" @click="router.push('/student/dialog')">去上传新题</button>
      </div>
    </header>

    <!-- 统计 -->
    <section class="err-stats">
      <div class="err-stat ms-card">
        <span>全部错题</span>
        <b>{{ errors.length }}</b>
      </div>
      <div class="err-stat ms-card is-warn">
        <span>待掌握</span>
        <b>{{ counts.pending }}</b>
      </div>
      <div class="err-stat ms-card is-ok">
        <span>已掌握</span>
        <b>{{ counts.mastered }}</b>
      </div>
      <div class="err-stat ms-card">
        <span>来自引导 / 种子</span>
        <b>{{ counts.fromGuide }}<small> / {{ counts.seed }}</small></b>
      </div>
    </section>

    <!-- 筛选 -->
    <nav class="err-tabs" aria-label="错题筛选">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        class="err-tab"
        :class="{ active: es.filter === tab.key }"
        :data-qa="`errors-tab-${tab.key}`"
        @click="setFilter(tab.key)"
      >
        {{ tab.label }}
        <span>{{ tab.count }}</span>
      </button>
      <span class="err-tabs__hint">点击任意错题打开详情；本页进入时会自动打开第一道错题详情。</span>
    </nav>

    <!-- 列表 -->
    <section v-if="visibleErrors.length" class="err-list">
      <article
        v-for="(row, i) in visibleErrors"
        :key="row.key"
        class="err-row ms-card"
        :class="{ 'is-mastered': row.record.mastered }"
        data-qa="errors-row"
        @click="openDetail(row.record)"
      >
        <span class="err-row__index">{{ String(i + 1).padStart(2, '0') }}</span>
        <div class="err-row__main">
          <div class="err-row__title">
            <span class="ms-tag">{{ row.group.code }}</span>
            <b>{{ row.group.title }}</b>
            <span v-if="row.record.mastered" class="ms-tag ms-tag--ok">已掌握</span>
            <span v-else class="ms-tag ms-tag--warn">待掌握</span>
            <span class="ms-tag ms-tag--gray">{{ row.record.seed ? '演示种子 · 三题手册典型错答' : '引导解题实时记录' }}</span>
          </div>
          <div class="err-row__wrong">
            <span class="err-row__label">你的错答</span>
            <code>{{ row.record.wrongInput || '（空）' }}</code>
            <span class="err-row__time">{{ formatTime(row.record.at) }}</span>
          </div>
          <div class="err-row__diag">
            <span class="err-row__label">错因</span>
            <span :class="`err-level err-level--${row.diagnosis.level}`">{{ row.diagnosis.levelText }}</span>
            <MathText :text="row.diagnosis.reason" />
          </div>
        </div>
        <div class="err-row__actions" @click.stop>
          <button class="ms-btn ms-btn--sm" data-qa="errors-detail" @click="openDetail(row.record)">查看详情</button>
          <button class="ms-btn ms-btn--sm" data-qa="errors-reopen" @click="reopenGuide(row.record)">重开引导</button>
          <button
            class="ms-btn ms-btn--sm"
            :class="{ 'ms-btn--primary': !row.record.mastered }"
            data-qa="errors-master"
            @click="toggleMastered(row.record)"
          >
            {{ row.record.mastered ? '取消掌握' : '标记掌握' }}
          </button>
        </div>
      </article>
    </section>
    <div v-else class="err-empty ms-card" data-qa="errors-empty">
      <b>{{ es.filter === 'mastered' ? '还没有标记为已掌握的错题' : '当前筛选下没有错题' }}</b>
      <span v-if="es.filter === 'pending'">所有错题都已掌握，去练题巩固一下所学内容。</span>
      <span v-else>完成引导解题后，错答会自动出现在这里。</span>
      <button class="ms-btn ms-btn--sm" @click="router.push('/student/practice')">去练题</button>
    </div>

    <!-- 详情弹层（右侧抽屉） -->
    <div v-if="detail" class="err-drawer-mask" data-qa="errors-drawer" @click.self="closeDetail">
      <aside class="err-drawer" role="dialog" aria-label="错题详情">
        <header class="err-drawer__head">
          <div>
            <span class="ms-tag">{{ detail.group.code }}</span>
            <b>{{ detail.group.title }}</b>
            <span v-if="detail.record.mastered" class="ms-tag ms-tag--ok">已掌握</span>
            <span v-else class="ms-tag ms-tag--warn">待掌握</span>
          </div>
          <button class="err-drawer__close" data-qa="errors-drawer-close" @click="closeDetail">关闭 (Esc)</button>
        </header>

        <div class="err-drawer__body ms-scroll">
          <section class="err-sec">
            <h4>原题定位</h4>
            <div class="err-origin">
              <img :src="detail.group.image" :alt="detail.group.title" />
              <div>
                <div class="err-origin__stem"><MathText :text="detail.original.stem" block /></div>
                <ol class="err-origin__options">
                  <li v-for="opt in detail.original.options || []" :key="opt.key">
                    <span>{{ opt.key }}</span><MathText :text="opt.text" />
                  </li>
                </ol>
                <button class="ms-btn ms-btn--sm" data-qa="errors-locate" @click="router.push(`/student/guide/${detail.record.caseId}`)">
                  在引导页打开原题
                </button>
              </div>
            </div>
          </section>

          <section class="err-sec">
            <h4>你的错答</h4>
            <div class="err-wrong-block">
              <code data-qa="errors-drawer-wrong">{{ detail.record.wrongInput || '（空）' }}</code>
              <span>{{ formatTime(detail.record.at) }} · {{ detail.record.seed ? '演示种子（三题手册典型错答）' : '来自引导解题的真实记录' }}</span>
            </div>
          </section>

          <section class="err-sec">
            <h4>错因反馈</h4>
            <div class="err-diag-block" :class="`is-${detail.diagnosis.level}`" data-qa="errors-diagnosis">
              <span class="err-level" :class="`err-level--${detail.diagnosis.level}`">{{ detail.diagnosis.levelText }}</span>
              <MathText :text="detail.diagnosis.reason" block />
            </div>
            <div class="err-answer-row">
              <span>正确答案</span>
              <b data-qa="errors-answer">{{ detail.original.answerDisplay }}</b>
              <span class="err-answer-row__note">{{ detail.group.sealedNote }}</span>
            </div>
          </section>

          <section class="err-sec">
            <h4>下一步</h4>
            <div class="err-next">
              <button class="ms-btn ms-btn--primary" data-qa="errors-drawer-reopen" @click="reopenGuide(detail.record)">
                重开引导（回到原题重做）
              </button>
              <button
                class="ms-btn"
                :class="{ 'ms-btn--primary': !detail.record.mastered }"
                data-qa="errors-drawer-master"
                @click="toggleMastered(detail.record)"
              >
                {{ detail.record.mastered ? '取消掌握' : '标记为已掌握' }}
              </button>
            </div>
            <p class="err-next__tip">重开引导会重新初始化这道题的引导对话（错题记录保留），用于“先纠错、再独立重做”的复习闭环。</p>
          </section>
        </div>
      </aside>
    </div>
  </StudentThemeScope>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MathText from '../../components/MathText.vue'
import StudentThemeScope from '../../components/student/StudentThemeScope.vue'
import { guidanceCases } from '../../data/guidance'
import { findPracticeGroup, normalizeAnswer } from '../../data/practice'
import { caseGuidance, store } from '../../state/demo'
import { initGuidanceSession } from '../../lib/guidanceFlow'

const router = useRouter()

/* ---------------- 状态（统一扩展命名空间） ---------------- */
function ensureErrorsExt() {
  if (!store.ext.studentErrors || typeof store.ext.studentErrors !== 'object') {
    store.ext.studentErrors = { filter: 'all', audit: [], detailOpenedAt: null, autoOpened: 0 }
  }
  const e = store.ext.studentErrors
  if (!['all', 'pending', 'mastered'].includes(e.filter)) e.filter = 'all'
  if (!Array.isArray(e.audit)) e.audit = []
  return e
}
const es = ensureErrorsExt()

/* ---------------- 种子错题：仅在错题本为空时初始化 ---------------- */
const HOUR = 3600 * 1000
function seedIfEmpty() {
  if (store.student.errors.length > 0) return
  const now = Date.now()
  store.student.errors.push(
    {
      caseId: 'C',
      wrongInput: '61/125',
      stepId: 's4',
      at: now - 3 * HOUR,
      mastered: false,
      seed: true,
      source: '三题手册 · 典型错答（只算单个号码的概率）',
    },
    {
      caseId: 'A',
      wrongInput: '我选 C，因为比值就是 √7',
      stepId: 's1',
      at: now - 26 * HOUR,
      mastered: false,
      seed: true,
      source: '三题手册 · 典型错答（把 b/a 当离心率）',
    },
    {
      caseId: 'B',
      wrongInput: 'B',
      stepId: 's4',
      at: now - 50 * HOUR,
      mastered: false,
      seed: true,
      source: '三题手册 · 典型错答（只选 B，漏 D）',
    },
  )
}
seedIfEmpty()

/* ---------------- 列表 ---------------- */
const errors = computed(() => store.student.errors.slice())

const counts = computed(() => {
  const mastered = errors.value.filter((e) => e.mastered).length
  const seed = errors.value.filter((e) => e.seed).length
  return {
    pending: errors.value.length - mastered,
    mastered,
    seed,
    fromGuide: errors.value.length - seed,
  }
})

const filterTabs = computed(() => [
  { key: 'all', label: '全部错题', count: errors.value.length },
  { key: 'pending', label: '待掌握', count: counts.value.pending },
  { key: 'mastered', label: '已掌握', count: counts.value.mastered },
])

const visibleErrors = computed(() => {
  const sorted = errors.value
    .map((record, index) => {
      const group = findPracticeGroup(record.caseId) || { code: record.caseId, title: record.caseId }
      return { record, group, diagnosis: diagnose(record), key: `${record.caseId}-${record.at}-${index}`, index }
    })
    .sort((a, b) => (b.record.at || 0) - (a.record.at || 0))
  if (es.filter === 'pending') return sorted.filter((r) => !r.record.mastered)
  if (es.filter === 'mastered') return sorted.filter((r) => r.record.mastered)
  return sorted
})

/* ---------------- 错因分析（引用封存基准口径） ---------------- */
function diagnose(record) {
  const caseId = record.caseId
  const group = findPracticeGroup(caseId)
  const original = group ? group.items[0] : null
  const raw = String(record.wrongInput || '')
  const norm = normalizeAnswer(raw)

  if (caseId === 'A') {
    if (/c/.test(raw.toLowerCase())) {
      return {
        level: 'wrong',
        levelText: '典型错答',
        reason:
          '把 $\\dfrac{b}{a}=\\sqrt{7}$ 直接当成离心率，漏掉 $e^2=1+\\left(\\dfrac{b}{a}\\right)^2$ 中的 “1”。正确路径：轴长比 $\\to c^2=a^2+b^2$ $\\to e^2=8\\to e=2\\sqrt{2}$。',
      }
    }
    if (norm.includes('a')) {
      return { level: 'wrong', levelText: '概念混淆', reason: '默认 $b=a$（等轴双曲线），忽略了题目给的 $\\sqrt{7}$ 倍条件。' }
    }
    return { level: 'wrong', levelText: '待复核', reason: '这次作答与封存答案 D（$2\\sqrt{2}$）不一致，建议重开引导从轴长关系重新推导。' }
  }

  if (caseId === 'B') {
    const keys = Array.from(new Set(raw.toUpperCase().replace(/[^ABCD]/g, '').split(''))).sort()
    if (keys.length === 1 && keys[0] === 'B') {
      return {
        level: 'partial',
        levelText: '部分正确',
        reason:
          '只选 B 是部分正确：漏掉 D。$CC_1\\parallel AA_1\\subset$ 平面 $AA_1D$，且 $C\\notin$ 平面 $AA_1D$（平面与底面交于 $AD$，$C\\notin AD$），所以 $CC_1\\parallel$ 平面 $AA_1D$。多选题要把成立的结论全部选上。',
      }
    }
    if (keys.length === 1 && keys[0] === 'D') {
      return {
        level: 'partial',
        levelText: '部分正确',
        reason:
          '只选 D 是部分正确：漏掉 B。$BC\\perp AD$、$BC\\perp AA_1$，两条相交直线都在平面 $AA_1D$ 内，由线面垂直判定得 $BC\\perp$ 平面 $AA_1D$。',
      }
    }
    if (keys.includes('A')) {
      return {
        level: 'wrong',
        levelText: '视觉误判',
        reason:
          'A 不成立：$A_1C$ 的底面投影是 $AC$，$AD$ 与 $AC$ 成 $30^\\circ$；坐标验算 $\\overrightarrow{AD}\\cdot\\overrightarrow{A_1C}=3\\ne 0$，不垂直。',
      }
    }
    if (keys.includes('C')) {
      return {
        level: 'wrong',
        levelText: '方向误判',
        reason: 'C 不成立：$A_1B_1\\parallel AB$，而 $AD$ 与 $AB$ 成 $30^\\circ$，两直线不平行。',
      }
    }
    return { level: 'wrong', levelText: '待复核', reason: '与封存答案（B、D 均成立）不一致，建议逐项按线面垂直/平行的判定条件核对。' }
  }

  if (caseId === 'C') {
    const pitfall = (original?.pitfalls || []).find((p) => {
      try {
        return new RegExp(p.pattern, 'i').test(norm)
      } catch {
        return false
      }
    })
    if (pitfall) return { level: 'wrong', levelText: '典型错答', reason: pitfall.reason }
    if (norm.includes('61/125')) {
      return {
        level: 'wrong',
        levelText: '漏乘 5',
        reason: '只算了单个号码“至少出现一次”的概率 $\\dfrac{61}{125}$；$X$ 是 5 个指示变量之和，期望要乘 5。',
      }
    }
    return { level: 'wrong', levelText: '待复核', reason: '与封存答案 $\\dfrac{61}{25}=2.44$ 不一致，建议按“指示变量 + 期望线性性”重新计算。' }
  }

  return { level: 'wrong', levelText: '待复核', reason: '该记录缺少可用的错因模板，请重开引导重新作答。' }
}

/* ---------------- 详情弹层 ---------------- */
const detailRecord = ref(null)
const detail = computed(() => {
  const record = detailRecord.value
  if (!record) return null
  const group = findPracticeGroup(record.caseId)
  const original = group ? group.items[0] : null
  return { record, group, original: original || { stem: '原题数据缺失', options: [], answerDisplay: '—' }, diagnosis: diagnose(record) }
})

function openDetail(record) {
  detailRecord.value = record
  es.detailOpenedAt = Date.now()
}
function closeDetail() {
  detailRecord.value = null
}

// 进入页面自动打开第一道错题详情（与现役入口行为一致），可关闭
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  const first = visibleErrors.value[0]
  if (first) {
    detailRecord.value = first.record
    es.autoOpened = (es.autoOpened || 0) + 1
    es.detailOpenedAt = Date.now()
  }
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
function onKeydown(e) {
  if (e.key === 'Escape' && detailRecord.value) closeDetail()
}

/* ---------------- 操作 ---------------- */
function setFilter(key) {
  es.filter = key
}

function toggleMastered(record) {
  record.mastered = !record.mastered
  es.audit = [
    ...es.audit,
    { action: record.mastered ? 'master' : 'unmaster', caseId: record.caseId, wrongInput: record.wrongInput, at: Date.now() },
  ].slice(-40)
}

function reopenGuide(record) {
  const cs = guidanceCases.find((c) => c.id === record.caseId)
  if (!cs) return
  const sess = caseGuidance(record.caseId)
  const fileName = sess.fileName || `${cs.code}.png`
  initGuidanceSession(cs, sess, fileName)
  sess.fileHash = cs.sha256
  es.audit = [...es.audit, { action: 'reopen-guide', caseId: record.caseId, at: Date.now() }].slice(-40)
  closeDetail()
  router.push(`/student/guide/${record.caseId}`)
}

/* ---------------- 展示辅助 ---------------- */
function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (d.toDateString() === now.toDateString()) return `今天 ${hm}`
  const diff = Math.floor((now.getTime() - ts) / HOUR)
  if (diff < 72) return `${diff} 小时前`
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}
</script>

<style scoped>
.page.errors {
  padding: 22px 30px 44px;
  /* 让 fixed 定位的详情抽屉不受 .page 的层叠上下文限制（否则会被 50 层的顶栏盖住） */
  position: static;
  z-index: auto;
}
.err-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}
.err-head .page-title {
  margin-bottom: 2px;
}
.err-head .page-sub {
  margin-bottom: 0;
  font-size: 13px;
  max-width: 920px;
  color: var(--ink2);
}
.err-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.err-stat {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.err-stat span {
  font-size: 11.5px;
  color: var(--ink3);
}
.err-stat b {
  font-size: 23px;
  font-family: var(--font-num, inherit);
  color: var(--ink);
}
.err-stat b small {
  font-size: 13px;
  color: var(--ink3);
  font-weight: 500;
}
.err-stat.is-warn b {
  color: var(--warn-deep);
}
.err-stat.is-ok b {
  color: var(--ok-deep);
}
.err-tabs {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.err-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 99px;
  border: 1px solid var(--line);
  background: var(--card);
  font-size: 12.8px;
  color: var(--ink2);
}
.err-tab span {
  font-size: 11px;
  padding: 0 6px;
  border-radius: 99px;
  background: var(--bg2);
  color: var(--ink2);
}
.err-tab.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 700;
}
.err-tab.active span {
  background: var(--brand);
  color: #fff;
}
.err-tabs__hint {
  margin-left: auto;
  font-size: 11.3px;
  color: var(--ink3);
}
.err-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.err-row {
  display: flex;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.err-row:hover {
  border-color: var(--brand);
  box-shadow: 0 10px 26px rgba(79, 70, 229, 0.1);
}
.err-row.is-mastered {
  opacity: 0.72;
}
.err-row__index {
  font-size: 18px;
  font-weight: 800;
  color: var(--ink4);
  font-family: var(--font-num, inherit);
  width: 30px;
  flex: none;
  padding-top: 2px;
}
.err-row__main {
  flex: 1;
  min-width: 0;
}
.err-row__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 7px;
}
.err-row__title b {
  font-size: 14.5px;
}
.err-row__wrong {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12.3px;
  margin-bottom: 5px;
}
.err-row__label {
  font-size: 10.8px;
  color: var(--ink3);
  letter-spacing: 0.03em;
  flex: none;
}
.err-row__wrong code {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 12.5px;
  padding: 1px 8px;
  border-radius: 6px;
  background: var(--bg2);
  color: var(--ink);
  word-break: break-all;
}
.err-row__time {
  font-size: 10.8px;
  color: var(--ink3);
}
.err-row__diag {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12.3px;
  color: var(--ink2);
  line-height: 1.7;
}
.err-level {
  flex: none;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 99px;
}
.err-level--wrong {
  background: var(--err-bg);
  color: var(--err-deep);
}
.err-level--partial {
  background: var(--warn-bg);
  color: var(--warn-deep);
}
.err-row__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: none;
  justify-content: center;
}
.err-empty {
  padding: 44px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--ink3);
  font-size: 13px;
}
.err-empty b {
  font-size: 15px;
  color: var(--ink);
}

/* ---------- 详情抽屉 ---------- */
.err-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.38);
  display: flex;
  justify-content: flex-end;
  animation: errFade 0.16s ease;
}
@keyframes errFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.err-drawer {
  width: 560px;
  max-width: 94vw;
  height: 100%;
  background: var(--card);
  border-left: 1px solid var(--line);
  box-shadow: -22px 0 60px rgba(2, 6, 23, 0.3);
  display: flex;
  flex-direction: column;
}
.err-drawer__head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}
.err-drawer__head > div {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.err-drawer__head b {
  font-size: 15px;
}
.err-drawer__close {
  border: 0;
  background: var(--bg2);
  color: var(--ink2);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
}
.err-drawer__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px 30px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.err-sec h4 {
  margin: 0 0 9px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--ink3);
  font-weight: 700;
}
.err-origin {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.err-origin img {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #fff;
}
.err-origin__stem {
  font-size: var(--st-read, 13.5px);
  line-height: 1.9;
  color: var(--ink);
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--bg2);
}
.err-origin__options {
  list-style: none;
  margin: 8px 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  font-size: 12.5px;
}
.err-origin__options li {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--card);
}
.err-origin__options li span {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink3);
}
.err-wrong-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 11px 13px;
  border-radius: 10px;
  background: var(--err-bg);
  border: 1px solid var(--err-border, #fecaca);
}
.err-wrong-block code {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 13.5px;
  color: var(--err-deep);
  word-break: break-all;
}
.err-wrong-block span {
  font-size: 11px;
  color: var(--ink3);
}
.err-diag-block {
  padding: 11px 13px;
  border-radius: 10px;
  font-size: var(--st-read, 13px);
  line-height: 1.85;
  color: var(--ink2);
  background: var(--bg2);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.err-diag-block.is-partial {
  background: var(--warn-bg);
  border-color: var(--warn-border, #fde68a);
}
.err-diag-block.is-wrong {
  background: var(--err-bg);
  border-color: var(--err-border, #fecaca);
}
.err-diag-block .err-level {
  align-self: flex-start;
}
.err-answer-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 9px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--ink3);
}
.err-answer-row b {
  font-size: 15px;
  color: var(--ok-deep);
}
.err-answer-row__note {
  font-size: 11px;
  color: var(--ink3);
}
.err-next {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.err-next__tip {
  margin: 9px 0 0;
  font-size: 11.5px;
  color: var(--ink3);
  line-height: 1.7;
}
</style>
