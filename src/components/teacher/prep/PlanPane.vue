<!-- 教案 Tab：左侧大纲 / 中间教案纸（可编辑）/ 右侧智能辅助；导出 DOCX 与 Markdown -->
<template>
  <div class="plan-pane" data-testid="plan-pane">
    <aside class="plan-outline">
      <div class="plan-outline__head">教案大纲</div>
      <button
        v-for="(sec, i) in sections"
        :key="i"
        type="button"
        class="plan-outline__item"
        :class="{ 'is-active': i === activeSection }"
        :data-testid="`plan-outline-${i}`"
        @click="focusSection(i)"
      >
        <span class="plan-outline__icon">{{ OUTLINE_ICONS[i] || '·' }}</span>
        <span class="plan-outline__label">{{ shortHeading(sec.heading) }}</span>
      </button>
      <div class="plan-outline__foot">共 {{ sections.length }} 个章节</div>
    </aside>

    <div class="plan-main">
      <div class="plan-toolbar">
        <div class="plan-toolbar__left">
          <button class="plan-btn" type="button" data-testid="plan-edit-all" @click="toggleEdit(activeSection)">
            {{ editingSection === activeSection ? '完成编辑' : '编辑本节' }}
          </button>
          <span class="plan-toolbar__hint">正文可直接编辑 · 自动保存</span>
        </div>
        <div class="plan-toolbar__right">
          <button class="plan-btn" type="button" data-testid="plan-export-docx" :disabled="exporting" @click="$emit('export', 'docx')">
            导出 DOCX
          </button>
          <button class="plan-btn" type="button" data-testid="plan-export-md" :disabled="exporting" @click="$emit('export', 'markdown')">
            导出 Markdown
          </button>
          <button class="plan-btn plan-btn--primary" type="button" data-testid="plan-publish" @click="$emit('publish')">发布课堂</button>
        </div>
      </div>

      <div ref="paperScroll" class="plan-paper-wrap">
        <article class="plan-paper">
          <input
            class="plan-paper__title"
            data-testid="plan-title-input"
            :value="plan.title"
            aria-label="教案标题"
            @input="editTitle($event.target.value)"
          />
          <div class="plan-paper__meta">
            <span v-for="(m, i) in plan.meta || []" :key="i">{{ m }}</span>
          </div>
          <div class="plan-paper__rule" />

          <section
            v-for="(sec, i) in sections"
            :id="`plan-sec-${i}`"
            :key="i"
            class="plan-sec"
            :data-testid="`plan-section-${i}`"
          >
            <div class="plan-sec__head">
              <span class="plan-sec__no">{{ i + 1 }}</span>
              <h3 class="plan-sec__title">{{ sec.heading }}</h3>
              <button class="plan-sec__edit" type="button" :title="editingSection === i ? '完成编辑' : '编辑本节'" @click="toggleEdit(i)">
                {{ editingSection === i ? '完成' : '编辑' }}
              </button>
            </div>
            <textarea
              v-if="editingSection === i"
              class="plan-sec__textarea"
              :data-testid="`plan-section-textarea-${i}`"
              :value="editBuffer"
              @input="editBuffer = $event.target.value"
            />
            <div v-else class="plan-sec__body">
              <template v-for="(item, j) in sec.items || []" :key="j">
                <h4 v-if="String(item).startsWith('## ')" class="plan-sec__sub">{{ String(item).slice(3) }}</h4>
                <p v-else-if="String(item).startsWith('- ')" class="plan-sec__bullet">{{ String(item).slice(2) }}</p>
                <p v-else class="plan-sec__p">{{ item }}</p>
              </template>
            </div>
          </section>

          <div class="plan-paper__foot">智学数研 · 备课中心 · 教案随课件版本同步（生成时间由本机演示数据决定）</div>
        </article>
      </div>
    </div>

    <aside class="plan-aside">
      <div class="plan-aside__head">智能辅助</div>
      <div class="plan-aside__locate">
        <span>当前定位</span>
        <b>{{ shortHeading(sections[activeSection]?.heading || '教学目标') }}</b>
      </div>
      <div class="plan-aside__section-title">AI 助手建议</div>
      <button class="plan-ai" type="button" data-testid="plan-ai-simplify" @click="simplifyCurrent">
        <span class="plan-ai__icon">✦</span>
        <span><b>精简语言</b><small>让这一部分表述更简洁清晰</small></span>
        <span class="plan-ai__go">›</span>
      </button>
      <button class="plan-ai" type="button" data-testid="plan-ai-board" @click="supplementBoard">
        <span class="plan-ai__icon">✎</span>
        <span><b>补充板书要点</b><small>按当前课件页生成板书设计建议</small></span>
        <span class="plan-ai__go">›</span>
      </button>
      <button class="plan-ai" type="button" data-testid="plan-ai-goals" @click="syncGoalsToDesign">
        <span class="plan-ai__icon">⇄</span>
        <span><b>同步教学目标到课堂设计</b><small>让课堂设计与教案保持一致</small></span>
        <span class="plan-ai__go">›</span>
      </button>

      <div class="plan-aside__ai-input">
        <div v-if="aiFeedback" class="plan-ai-feedback" :class="{ 'is-error': !aiOk }" data-testid="plan-ai-feedback">
          {{ aiFeedback }}
        </div>
        <div class="plan-ai-box">
          <input
            v-model="aiText"
            class="plan-ai-box__input"
            data-testid="plan-ai-input"
            placeholder="告诉 AI 如何修改这一部分…"
            @keyup.enter="runPlanAi"
          />
          <button class="plan-ai-box__send" type="button" data-testid="plan-ai-send" @click="runPlanAi">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>
          </button>
        </div>
        <p class="plan-ai-box__hint">可试：目标：理解… / 反思：… / 精简本节</p>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { deepCopy, syncPlanToDesign, touchPrepSession } from '../../../data/prepPublish'

const props = defineProps({
  session: { type: Object, required: true },
  target: { type: Object, required: true },
  exporting: { type: Boolean, default: false },
})
const emit = defineEmits(['export', 'publish'])

const OUTLINE_ICONS = ['🎯', '⚑', '📋', '✎', '▤', '📄', '💡']
const paperScroll = ref(null)
const activeSection = ref(0)
const editingSection = ref(-1)
const editBuffer = ref('')
const aiText = ref('')
const aiFeedback = ref('')
const aiOk = ref(true)

const plan = computed(() => props.session.plan)
const sections = computed(() => plan.value?.sections || [])

function shortHeading(heading) {
  return String(heading || '').replace(/^[一二三四五六七八九十]+、\s*/, '')
}

function editTitle(value) {
  plan.value.title = value
  touchPrepSession(props.session.sessionId)
}

function focusSection(index) {
  activeSection.value = index
  const el = document.getElementById(`plan-sec-${index}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function toggleEdit(index) {
  if (editingSection.value === index) {
    saveSection(index)
    return
  }
  if (editingSection.value >= 0) saveSection(editingSection.value)
  activeSection.value = index
  editingSection.value = index
  editBuffer.value = (sections.value[index]?.items || []).join('\n')
}

function saveSection(index) {
  const sec = sections.value[index]
  if (!sec) return
  const lines = editBuffer.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  sec.items = lines
  touchPrepSession(props.session.sessionId)
  editingSection.value = -1
  editBuffer.value = ''
}

function simplifyCurrent() {
  const sec = sections.value[activeSection.value]
  if (!sec) return
  let changed = 0
  sec.items = (sec.items || []).map((item) => {
    const text = String(item)
    if (text.startsWith('## ') || text.startsWith('- ') === false) return item
    const body = text.slice(2)
    const clause = body.split(/[，；]/)[0]
    if (clause.length < body.length) {
      changed += 1
      return `- ${clause}`
    }
    return item
  })
  touchPrepSession(props.session.sessionId)
  aiOk.value = true
  aiFeedback.value = changed ? `已精简「${shortHeading(sec.heading)}」中 ${changed} 条表述` : '这一部分已经很简洁，无需修改'
}

function supplementBoard() {
  const board = sections.value.find((s) => /板书/.test(s.heading))
  if (!board) {
    aiOk.value = false
    aiFeedback.value = '当前教案没有“板书设计”章节，无法补充'
    return
  }
  const titles = (props.session.slides || []).filter((s) => s.layout === 'content').map((s) => s.title).slice(0, 4)
  const marker = '【课件要点】'
  board.items = (board.items || []).filter((i) => !String(i).includes(marker))
  board.items.push(`- ${marker}${titles.join('；')}`)
  touchPrepSession(props.session.sessionId)
  aiOk.value = true
  aiFeedback.value = `已把 ${titles.length} 个课件页要点补充到板书设计`
}

function syncGoalsToDesign() {
  const count = syncPlanToDesign(props.session.sessionId)
  aiOk.value = count > 0
  aiFeedback.value = count > 0 ? `已把 ${count} 条教学目标同步到课堂设计` : '教学目标章节没有可同步的内容'
}

function findGoalSection() {
  return sections.value.find((s) => /教学目标/.test(s.heading)) || sections.value[0]
}
function findReflectSection() {
  return sections.value.find((s) => /反思/.test(s.heading))
}

function runPlanAi() {
  const text = aiText.value.trim()
  if (!text) return
  const target = sections.value[activeSection.value]
  let m = text.match(/(?:添加|新增|补充)?(?:教学)?目标[：:]\s*(.+)/)
  if (m) {
    const sec = findGoalSection()
    sec.items = sec.items || []
    sec.items.push(`- ${m[1].trim()}`)
    touchPrepSession(props.session.sessionId)
    aiOk.value = true
    aiFeedback.value = `已添加到教学目标：${m[1].trim()}`
    aiText.value = ''
    return
  }
  m = text.match(/(?:添加|新增|补充)?(?:教学)?反思[：:]\s*(.+)/)
  if (m) {
    const sec = findReflectSection()
    if (!sec) {
      aiOk.value = false
      aiFeedback.value = '当前教案没有教学反思章节'
      return
    }
    sec.items = sec.items || []
    sec.items.push(`- ${m[1].trim()}`)
    touchPrepSession(props.session.sessionId)
    aiOk.value = true
    aiFeedback.value = `已添加到教学反思：${m[1].trim()}`
    aiText.value = ''
    return
  }
  if (/(精简|简洁|简短)/.test(text)) {
    simplifyCurrent()
    aiText.value = ''
    return
  }
  if (/(板书)/.test(text) && /(补充|生成|同步)/.test(text)) {
    supplementBoard()
    aiText.value = ''
    return
  }
  aiOk.value = false
  aiFeedback.value = `未识别的教案修改指令${target ? `（当前在「${shortHeading(target.heading)}」）` : ''}。可试「目标：…」「反思：…」「精简本节」「补充板书」`
}

defineExpose({ activeSection })
</script>

<style scoped>
.plan-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  background: #f6f8fb;
}
.plan-outline {
  width: 206px;
  flex: none;
  background: #fff;
  border-right: 1px solid #e5e9f2;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
}
.plan-outline__head {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  padding: 2px 8px 12px;
}
.plan-outline__item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  border: 0;
  background: none;
  border-radius: 9px;
  padding: 8px 9px;
  font-size: 13px;
  color: #334155;
  text-align: left;
}
.plan-outline__item:hover {
  background: #f8fafc;
}
.plan-outline__item.is-active {
  background: #eff4ff;
  color: #1d4ed8;
  font-weight: 600;
}
.plan-outline__icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #eef4ff;
  display: grid;
  place-items: center;
  font-size: 12px;
  flex: none;
}
.plan-outline__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.plan-outline__foot {
  margin-top: auto;
  font-size: 11px;
  color: #94a3b8;
  padding: 10px 8px 0;
  border-top: 1px solid #f1f5f9;
}
.plan-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.plan-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 18px;
  background: #fff;
  border-bottom: 1px solid #e5e9f2;
}
.plan-toolbar__left,
.plan-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.plan-toolbar__hint {
  font-size: 11.5px;
  color: #94a3b8;
}
.plan-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
}
.plan-btn:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}
.plan-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.plan-btn--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.plan-btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
  color: #fff;
}
.plan-paper-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 24px 30px;
}
.plan-paper {
  max-width: 900px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
  padding: 30px 44px 26px;
}
.plan-paper__title {
  display: block;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: inherit;
  font-size: 23px;
  font-weight: 800;
  color: #0f172a;
  text-align: center;
  padding: 5px 8px;
  outline: none;
}
.plan-paper__title:hover {
  border-color: #e5e9f2;
}
.plan-paper__title:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.plan-paper__meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.plan-paper__meta span {
  background: #f1f5f9;
  border-radius: 999px;
  color: #64748b;
  font-size: 11.5px;
  padding: 2px 10px;
}
.plan-paper__rule {
  height: 2px;
  background: linear-gradient(90deg, #2563eb, #93c5fd, transparent);
  border-radius: 2px;
  margin: 16px 0 6px;
}
.plan-sec {
  padding: 14px 0 6px;
}
.plan-sec__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.plan-sec__no {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex: none;
}
.plan-sec__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
}
.plan-sec__edit {
  border: 1px solid #e5e9f2;
  background: #fff;
  border-radius: 6px;
  font-size: 11.5px;
  color: #64748b;
  padding: 2px 9px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.plan-sec:hover .plan-sec__edit,
.plan-sec__edit:focus {
  opacity: 1;
}
.plan-sec__edit:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.plan-sec__body {
  padding-left: 34px;
}
.plan-sec__sub {
  margin: 8px 0 4px;
  font-size: 13px;
  color: #1d4ed8;
  font-weight: 600;
}
.plan-sec__bullet {
  position: relative;
  margin: 3px 0;
  font-size: 13px;
  line-height: 1.75;
  color: #334155;
  padding-left: 14px;
}
.plan-sec__bullet::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #93c5fd;
}
.plan-sec__p {
  margin: 3px 0;
  font-size: 13px;
  line-height: 1.75;
  color: #334155;
}
.plan-sec__textarea {
  width: 100%;
  min-height: 120px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #f8fbff;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
  color: #1f2937;
  padding: 10px 12px;
  outline: none;
  resize: vertical;
}
.plan-sec__textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.plan-paper__foot {
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px dashed #e5e9f2;
  font-size: 10.5px;
  color: #b6c2d4;
  text-align: right;
}
.plan-aside {
  width: 288px;
  flex: none;
  background: #fff;
  border-left: 1px solid #e5e9f2;
  padding: 14px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
}
.plan-aside__head {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}
.plan-aside__head::before {
  content: '✦';
  color: #2563eb;
  font-size: 13px;
}
.plan-aside__locate {
  background: #eff4ff;
  border-radius: 10px;
  padding: 9px 12px;
  margin: 4px 0 6px;
}
.plan-aside__locate span {
  display: block;
  font-size: 11px;
  color: #64748b;
}
.plan-aside__locate b {
  display: block;
  font-size: 13px;
  color: #1d4ed8;
  margin-top: 2px;
}
.plan-aside__section-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
  margin: 4px 0 2px;
}
.plan-ai {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #eef2f7;
  background: #fbfdff;
  border-radius: 10px;
  padding: 8px 10px;
  text-align: left;
}
.plan-ai:hover {
  border-color: #dbe6fb;
  background: #f5f8ff;
}
.plan-ai__icon {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #eff4ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  font-size: 12px;
  flex: none;
}
.plan-ai b {
  display: block;
  font-size: 12.5px;
  color: #1f2937;
}
.plan-ai small {
  display: block;
  font-size: 10.5px;
  color: #94a3b8;
  line-height: 1.5;
}
.plan-ai > span:nth-child(2) {
  flex: 1;
}
.plan-ai__go {
  color: #cbd5e1;
}
.plan-aside__ai-input {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}
.plan-ai-feedback {
  font-size: 11.5px;
  line-height: 1.6;
  color: #047857;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 7px 9px;
  margin-bottom: 8px;
}
.plan-ai-feedback.is-error {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}
.plan-ai-box {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #fff;
  padding: 4px 4px 4px 10px;
}
.plan-ai-box:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.plan-ai-box__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  font-family: inherit;
  font-size: 12.5px;
  color: #1f2937;
  background: transparent;
}
.plan-ai-box__send {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 0;
  background: #2563eb;
  color: #fff;
  display: grid;
  place-items: center;
  flex: none;
}
.plan-ai-box__send:hover {
  background: #1d4ed8;
}
.plan-ai-box__hint {
  margin: 6px 2px 0;
  font-size: 10.5px;
  color: #94a3b8;
  line-height: 1.5;
}
</style>
