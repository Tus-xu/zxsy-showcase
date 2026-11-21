<template>
  <div class="bank" data-testid="teacher-bank">
    <section class="tv3-hero bank__hero">
      <div class="bank__hero-main">
        <div class="bank__hero-icon">📚</div>
        <div>
          <div class="tv3-hero__title">题库与组卷</div>
          <div class="tv3-hero__sub">
            三道指定题按原题入库，勾选后本地生成 A4 试卷预览；不调外部服务、不转写教材原文。
          </div>
        </div>
      </div>
      <div class="bank__hero-right">
        <span class="tv3-tag tv3-tag--primary">题库 {{ bank.items.length }} / {{ questionMeta.length }} 题</span>
        <span class="tv3-tag tv3-tag--gold">已选 {{ selectedIds.length }} 题</span>
        <button
          v-if="bank.items.length < questionMeta.length"
          type="button"
          class="tv3-btn tv3-btn--gold tv3-btn--sm"
          data-testid="bank-add-all"
          @click="addAll"
        >
          + 将三道指定题入库
        </button>
      </div>
    </section>

    <div class="bank__grid">
      <aside class="tv3-card bank__tree">
        <div class="bank__side-head">
          <b>分类树</b>
          <span>按知识点定位</span>
        </div>
        <div class="tree">
          <button
            v-for="g in knowledgeGroups"
            :key="g.key"
            type="button"
            class="tree__item"
            :class="{ 'is-active': kpFilter === g.key }"
            :data-testid="`bank-tree-${g.key}`"
            @click="kpFilter = g.key"
          >
            <span>{{ g.label }}</span>
            <em>{{ g.count }}</em>
          </button>
        </div>
        <div class="bank__side-head bank__side-head--sub">
          <b>我的专题夹</b>
          <span>跨知识点引用 · 演示</span>
        </div>
        <div v-if="bank.items.length" class="bank__folder">
          <div class="bank__folder-title">本次演示 · 三道指定题</div>
          <div v-for="q in bankQuestions" :key="q.id" class="bank__folder-item">{{ q.code }} · {{ q.kp }}</div>
          <div class="bank__folder-note">专题夹引用同一批题目对象，不入库也可在此快速选题。</div>
        </div>
        <div v-else class="bank__folder-empty">还没有专题夹。先入库，或把三道指定题按专题引用收集。</div>
        <div class="bank__source-note">
          入库内容为演示题图与审核稿文字；教材切片源未挂载，未伪造任何教材原文。
        </div>
      </aside>

      <section class="tv3-card bank__list">
        <div class="bank__list-head">
          <div>
            <b>{{ kpFilter === 'all' ? '全部知识点' : kpLabel(kpFilter) }}</b>
            <span>{{ filteredQuestions.length }} / {{ questionMeta.length }} 题</span>
          </div>
          <div class="bank__tools">
            <input v-model="search" class="tv3-input bank__search" type="search" placeholder="搜索题干或知识点关键词" />
            <select v-model="typeFilter" class="tv3-input bank__select">
              <option value="all">全部题型</option>
              <option value="single">单选题</option>
              <option value="multi">多选题</option>
              <option value="fill">填空题</option>
            </select>
            <select v-model="stateFilter" class="tv3-input bank__select">
              <option value="all">全部状态</option>
              <option value="in">已入库</option>
              <option value="out">未入库</option>
            </select>
          </div>
        </div>

        <div v-if="!questionMeta.length" class="bank__empty">题库为空</div>
        <div v-else-if="!filteredQuestions.length" class="bank__empty">当前筛选下没有题目</div>

        <div v-else class="bank__rows">
          <div
            v-for="q in filteredQuestions"
            :key="q.id"
            class="bank__row"
            :class="{ 'is-in': isInBank(q.id), 'is-selected': selectedIds.includes(q.id) }"
            :data-testid="`bank-item-${q.id}`"
          >
            <label class="bank__check">
              <input
                type="checkbox"
                :checked="selectedIds.includes(q.id)"
                :disabled="!isInBank(q.id)"
                :data-testid="`bank-select-${q.id}`"
                @change="toggleSelect(q.id)"
              />
            </label>
            <div class="bank__qmain">
              <div class="bank__qtitle">
                <b>{{ q.code }} · {{ q.title }}</b>
                <span class="tv3-tag tv3-tag--primary">{{ q.typeLabel }}</span>
                <span v-if="isInBank(q.id)" class="tv3-tag tv3-tag--ok">已入库</span>
              </div>
              <div class="bank__qtext"><MathText :text="q.questionText" /></div>
              <div class="bank__qmeta">
                <span>{{ q.kp }}</span>
                <span>难度：{{ q.difficulty }}</span>
                <span>{{ q.source }}</span>
              </div>
            </div>
            <div class="bank__qactions">
              <button v-if="!isInBank(q.id)" type="button" class="tv3-btn tv3-btn--sm" @click="addQuestion(q.id)">入库</button>
              <button v-else type="button" class="bank__remove" @click="removeQuestion(q.id)">移出</button>
            </div>
          </div>
        </div>
      </section>

      <aside class="tv3-card bank__compose">
        <div class="bank__side-head">
          <b>组卷</b>
          <span>勾选题目 → 本地 A4 预览</span>
        </div>
        <div class="compose">
          <label class="compose__label" for="paper-title">试卷标题</label>
          <input id="paper-title" v-model="bank.paperTitle" class="tv3-input" type="text" data-testid="bank-paper-title" />

          <div class="compose__label compose__label--row">
            已选题目
            <button v-if="selectedIds.length" type="button" class="compose__clear" @click="clearSelection">清空</button>
          </div>
          <div v-if="!selectedIds.length" class="compose__empty">尚未勾选题目。先在左侧题库勾选需要组卷的题目。</div>
          <div v-else class="compose__chips">
            <span v-for="q in selectedQuestions" :key="q.id" class="compose__chip">
              <b>{{ q.code }}</b>
              <span>{{ q.typeLabel }}</span>
              <button type="button" :aria-label="`移除 ${q.code}`" @click="toggleSelect(q.id)">×</button>
            </span>
          </div>

          <div class="compose__stat">
            <div><span>题量</span><b>{{ selectedIds.length }} 题</b></div>
            <div><span>题分</span><b>{{ totalScore }} 分</b></div>
            <div><span>建议时长</span><b>{{ selectedIds.length ? selectedIds.length * 8 : 0 }} 分钟</b></div>
          </div>

          <button
            type="button"
            class="tv3-btn tv3-btn--primary compose__gen"
            :disabled="!selectedIds.length"
            data-testid="bank-generate"
            @click="generatePreview"
          >
            {{ previewOpen ? '重新生成 A4 预览' : '生成 A4 预览' }}
          </button>
          <p class="compose__note">
            组卷只读取本地题目与 KaTeX 渲染；卷面标注“演示自撰素材”，不含教材原文或网络图片。
          </p>
        </div>
      </aside>
    </div>

    <div v-if="previewOpen" class="a4-mask" data-testid="bank-a4-mask">
      <div class="a4-actions">
        <span class="a4-actions__label">A4 试卷预览 · {{ selectedQuestions.length }} 题 · 本机渲染</span>
        <button type="button" class="tv3-btn tv3-btn--sm" @click="printA4">打印 A4</button>
        <button type="button" class="tv3-btn tv3-btn--primary tv3-btn--sm" @click="previewOpen = false">关闭预览</button>
      </div>
      <div class="a4-scroll">
        <div class="a4-sheet" data-testid="bank-a4-preview">
          <div class="a4-sheet__top">
            <span>智学数研 · 高中数学</span>
            <span>2026 学年第一学期 · 单元练习卷</span>
          </div>
          <h2 class="a4-sheet__title">{{ bank.paperTitle || '数学限时训练' }}</h2>
          <div class="a4-sheet__meta">
            <span>班级：__________</span><span>姓名：__________</span><span>学号：__________</span><span>成绩：______</span>
          </div>
          <div class="a4-sheet__note">
            共 {{ selectedQuestions.length }} 题 · 满分 {{ totalScore }} 分 · 建议用时 {{ selectedIds.length * 8 }} 分钟 ·
            答案写在答题区
          </div>
          <div class="a4-sheet__body">
            <div v-for="(q, i) in selectedQuestions" :key="q.id" class="a4-q">
              <div class="a4-q__no">{{ i + 1 }}.</div>
              <div class="a4-q__main">
                <div class="a4-q__stem"><MathText :text="q.questionText" /></div>
                <div v-if="q.options" class="a4-q__options">
                  <span v-for="o in q.options" :key="o.key" class="a4-q__option">
                    {{ o.key }}．<MathText :text="o.text" />
                  </span>
                </div>
                <div v-if="q.type === 'fill'" class="a4-q__answerline">答：__________________</div>
                <div v-if="q.type === 'multi'" class="a4-q__hint">（多选，把全部正确选项填入答题区）</div>
              </div>
            </div>
          </div>
          <div class="a4-sheet__foot">
            <span>出卷：张老师 · 组卷时间 {{ generatedAtText }}</span>
            <span>本试卷为演示自撰素材（教材切片源未挂载），不冒充教材原文。</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { store } from '../../state/demo'
import { guidanceCases } from '../../data/guidance'
import MathText from '../../components/MathText.vue'

const KP = {
  A: { group: '圆锥曲线', name: '双曲线的离心率' },
  B: { group: '立体几何', name: '线面垂直与平行的判定' },
  C: { group: '概率统计', name: '离散型随机变量的期望' },
}
const DIFFICULTY = { A: '中等', B: '中等', C: '较难' }
const TYPE_LABEL = { single: '单选题', multi: '多选题', fill: '填空题' }
const FULL_SCORE = 5

const questionMeta = guidanceCases.map((c) => ({
  id: c.id,
  code: c.code,
  no: c.printedNumber,
  title: c.title,
  type: c.type,
  typeLabel: TYPE_LABEL[c.type] || '解答题',
  kp: (KP[c.id] && KP[c.id].name) || c.title,
  kpGroup: (KP[c.id] && KP[c.id].group) || '未分类',
  difficulty: DIFFICULTY[c.id] || '中等',
  source: c.sourceLabel,
  questionText: c.questionText,
  options: c.options || null,
}))

function bankNS() {
  if (!store.ext || typeof store.ext !== 'object') store.ext = {}
  if (!store.ext.teacherGrading || typeof store.ext.teacherGrading !== 'object') store.ext.teacherGrading = {}
  const ns = store.ext.teacherGrading
  if (!ns.bank || typeof ns.bank !== 'object') ns.bank = {}
  const bank = ns.bank
  if (!Array.isArray(bank.items)) bank.items = []
  if (!Array.isArray(bank.selected)) bank.selected = []
  if (typeof bank.paperTitle !== 'string' || !bank.paperTitle) bank.paperTitle = '高二 (1) 班 · 数学限时训练（演示组卷）'
  return bank
}

const bank = bankNS()

const search = ref('')
const typeFilter = ref('all')
const stateFilter = ref('all')
const kpFilter = ref('all')
const previewOpen = ref(false)
const generatedAt = ref(null)

const bankIds = computed(() => bank.items.map((i) => i.id))
const selectedIds = computed(() => bank.selected.filter((id) => bankIds.value.includes(id)))
const selectedQuestions = computed(() =>
  selectedIds.value.map((id) => questionMeta.find((q) => q.id === id)).filter(Boolean),
)
const bankQuestions = computed(() => questionMeta.filter((q) => bankIds.value.includes(q.id)))
const totalScore = computed(() => selectedQuestions.value.length * FULL_SCORE)

const knowledgeGroups = computed(() => {
  const groups = [
    { key: 'all', label: '全部知识点', count: bank.items.length },
    { key: '圆锥曲线', label: '圆锥曲线', count: 0 },
    { key: '立体几何', label: '立体几何', count: 0 },
    { key: '概率统计', label: '概率统计', count: 0 },
  ]
  for (const q of bankQuestions.value) {
    const g = groups.find((x) => x.key === q.kpGroup)
    if (g) g.count += 1
  }
  return groups
})

function isInBank(id) {
  return bankIds.value.includes(id)
}
function kpLabel(key) {
  const g = knowledgeGroups.value.find((x) => x.key === key)
  return g ? g.label : '全部知识点'
}

const filteredQuestions = computed(() =>
  questionMeta.filter((q) => {
    if (kpFilter.value !== 'all' && q.kpGroup !== kpFilter.value) return false
    if (typeFilter.value !== 'all' && q.type !== typeFilter.value) return false
    if (stateFilter.value === 'in' && !isInBank(q.id)) return false
    if (stateFilter.value === 'out' && isInBank(q.id)) return false
    if (search.value.trim()) {
      const kw = search.value.trim().toLowerCase()
      const hay = `${q.title} ${q.kp} ${q.questionText}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  }),
)

function addQuestion(id) {
  if (isInBank(id)) return
  bank.items.push({ id, addedAt: Date.now() })
}
function addAll() {
  for (const q of questionMeta) addQuestion(q.id)
}
function removeQuestion(id) {
  bank.items = bank.items.filter((i) => i.id !== id)
  bank.selected = bank.selected.filter((x) => x !== id)
  if (!selectedIds.value.length) previewOpen.value = false
}
function toggleSelect(id) {
  if (!isInBank(id)) return
  if (selectedIds.value.includes(id)) {
    bank.selected = bank.selected.filter((x) => x !== id)
  } else {
    bank.selected = [...selectedIds.value, id]
  }
}
function clearSelection() {
  bank.selected = []
  previewOpen.value = false
}

function pad(n) {
  return String(n).padStart(2, '0')
}
const generatedAtText = computed(() => {
  if (!generatedAt.value) return '—'
  const d = new Date(generatedAt.value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

function generatePreview() {
  if (!selectedIds.value.length) return
  generatedAt.value = Date.now()
  previewOpen.value = true
}
function printA4() {
  window.print()
}
</script>

<style scoped>
.bank {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bank__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 22px;
}
.bank__hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
}
.bank__hero-icon {
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
.bank__hero-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.bank__grid {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr) 312px;
  gap: 14px;
  align-items: stretch;
  height: calc(100vh - 208px);
  min-height: 560px;
}
.bank__tree,
.bank__list,
.bank__compose {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.bank__side-head {
  padding: 12px 14px 9px;
  border-bottom: 1px solid var(--tv3-line2);
}
.bank__side-head b {
  display: block;
  font-size: 12.5px;
  color: var(--tv3-ink);
}
.bank__side-head span {
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.bank__side-head--sub {
  border-top: 1px solid var(--tv3-line2);
}
.tree {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tree__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--tv3-ink2);
  text-align: left;
}
.tree__item em {
  font-style: normal;
  font-size: 10.5px;
  color: var(--tv3-ink3);
  font-family: var(--tv3-font-num);
}
.tree__item:hover {
  background: var(--tv3-bg2);
}
.tree__item.is-active {
  background: var(--tv3-primary-soft);
  color: var(--tv3-primary);
  font-weight: 600;
}
.tree__item.is-active em {
  color: var(--tv3-primary);
}
.bank__folder {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bank__folder-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--tv3-ink2);
  margin-bottom: 2px;
}
.bank__folder-item {
  font-size: 10.5px;
  color: var(--tv3-ink3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bank__folder-note {
  margin-top: 4px;
  font-size: 9.5px;
  line-height: 1.6;
  color: var(--tv3-ink3);
}
.bank__folder-empty {
  padding: 12px;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--tv3-ink3);
}
.bank__source-note {
  margin: auto 12px 12px;
  padding: 8px 9px;
  border-radius: 8px;
  background: var(--tv3-amber-soft);
  border: 1px solid var(--tv3-amber-border);
  font-size: 9.5px;
  line-height: 1.65;
  color: var(--tv3-amber);
}
.bank__list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--tv3-line2);
}
.bank__list-head b {
  font-size: 13.5px;
  color: var(--tv3-ink);
}
.bank__list-head span {
  margin-left: 8px;
  font-size: 11px;
  color: var(--tv3-ink3);
}
.bank__tools {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bank__search {
  width: 190px;
  height: 30px;
  padding: 3px 10px;
  font-size: 12px;
}
.bank__select {
  width: 104px;
  height: 30px;
  padding: 3px 8px;
  font-size: 12px;
}
.bank__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  font-size: 12px;
  color: var(--tv3-ink3);
}
.bank__rows {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bank__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid var(--tv3-line);
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
  transition: all 0.13s ease;
}
.bank__row.is-in {
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 60%);
}
.bank__row.is-selected {
  border-color: var(--tv3-primary);
  box-shadow: 0 6px 18px -10px rgba(79, 70, 229, 0.6);
}
.bank__check {
  padding-top: 3px;
}
.bank__check input {
  width: 14px;
  height: 14px;
  accent-color: var(--tv3-primary);
}
.bank__qmain {
  flex: 1;
  min-width: 0;
}
.bank__qtitle {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.bank__qtitle b {
  font-size: 13px;
  color: var(--tv3-ink);
}
.bank__qtext {
  margin-top: 4px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--tv3-ink3);
  max-height: 38px;
  overflow: hidden;
}
.bank__qmeta {
  margin-top: 5px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 10.5px;
  color: var(--tv3-ink3);
}
.bank__qactions {
  flex: none;
  display: flex;
  align-items: center;
}
.bank__remove {
  border: 0;
  background: transparent;
  font-size: 10.5px;
  color: var(--tv3-ink3);
  padding: 2px 4px;
}
.bank__remove:hover {
  color: var(--tv3-rose);
}
.compose {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow-y: auto;
}
.compose__label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--tv3-ink2);
  margin-top: 4px;
}
.compose__label--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.compose__clear {
  border: 0;
  background: transparent;
  font-size: 10.5px;
  color: var(--tv3-primary);
  padding: 0;
}
.compose__empty {
  padding: 14px 10px;
  border: 1px dashed var(--tv3-line);
  border-radius: 9px;
  background: var(--tv3-bg2);
  font-size: 10.5px;
  line-height: 1.65;
  color: var(--tv3-ink3);
  text-align: center;
}
.compose__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.compose__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--tv3-primary-border);
  background: var(--tv3-primary-soft);
  color: var(--tv3-primary);
  border-radius: 999px;
  padding: 2px 4px 2px 9px;
  font-size: 10.5px;
  font-weight: 600;
}
.compose__chip span {
  font-weight: 400;
  color: var(--tv3-ink3);
}
.compose__chip button {
  border: 0;
  background: rgba(79, 70, 229, 0.12);
  color: var(--tv3-primary);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 11px;
  line-height: 1;
  padding: 0;
}
.compose__stat {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  background: var(--tv3-bg2);
  border-radius: 10px;
  padding: 9px 10px;
}
.compose__stat span {
  display: block;
  font-size: 9.5px;
  color: var(--tv3-ink3);
}
.compose__stat b {
  font-size: 13px;
  color: var(--tv3-ink);
  font-family: var(--tv3-font-num);
}
.compose__gen {
  width: 100%;
  margin-top: 8px;
  justify-content: center;
}
.compose__note {
  margin: 4px 0 0;
  font-size: 9.5px;
  line-height: 1.6;
  color: var(--tv3-ink3);
}
.a4-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  flex-direction: column;
  padding: 16px 24px 24px;
}
.a4-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
}
.a4-actions__label {
  margin-right: auto;
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
}
.a4-scroll {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
}
.a4-sheet {
  width: 794px;
  min-height: 1123px;
  background: #fff;
  color: #111827;
  padding: 42px 52px 30px;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Inter', sans-serif;
  box-shadow: 0 20px 60px rgba(2, 6, 23, 0.5);
  margin-bottom: 20px;
}
.a4-sheet__top {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #4b5563;
  border-bottom: 1.5px solid #111827;
  padding-bottom: 8px;
}
.a4-sheet__title {
  margin: 18px 0 10px;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
}
.a4-sheet__meta {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 11.5px;
  color: #374151;
  padding-bottom: 10px;
  border-bottom: 1px dashed #9ca3af;
}
.a4-sheet__note {
  margin-top: 8px;
  text-align: center;
  font-size: 10.5px;
  color: #6b7280;
}
.a4-sheet__body {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.a4-q {
  display: flex;
  gap: 8px;
}
.a4-q__no {
  flex: none;
  width: 20px;
  font-weight: 700;
  font-size: 13px;
}
.a4-q__main {
  flex: 1;
}
.a4-q__stem {
  font-size: 13px;
  line-height: 1.9;
}
.a4-q__options {
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 22px;
  font-size: 12.5px;
}
.a4-q__option {
  white-space: nowrap;
}
.a4-q__answerline {
  margin-top: 12px;
  font-size: 12.5px;
  color: #374151;
}
.a4-q__hint {
  margin-top: 6px;
  font-size: 10.5px;
  color: #6b7280;
}
.a4-sheet__foot {
  margin-top: 36px;
  padding-top: 10px;
  border-top: 1px dashed #9ca3af;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 9.5px;
  color: #6b7280;
}
</style>

<style>
/* 打印：只输出 A4 试卷本身（仅在本页预览打开时生效） */
@media print {
  body * {
    visibility: hidden;
  }
  .a4-mask,
  .a4-mask * {
    visibility: visible;
  }
  .a4-mask {
    position: absolute !important;
    inset: 0 !important;
    background: #fff !important;
    padding: 0 !important;
    display: block !important;
  }
  .a4-actions,
  .tv3-page,
  .a4-scroll {
    overflow: visible !important;
  }
  .a4-actions {
    display: none !important;
  }
  .a4-scroll {
    display: block !important;
  }
  .a4-sheet {
    box-shadow: none !important;
    margin: 0 auto !important;
    width: auto !important;
  }
}
</style>
