<template>
  <section class="assistant ms-card" data-test="assistant-panel">
    <header class="assistant__head">
      <span class="assistant__icon">🤖</span>
      <div class="assistant__title">
        <b>AI 助教 · 本页答疑</b>
        <span>回答只基于本页课件讲稿，未命中会明确说明</span>
      </div>
      <span class="assistant__page" data-test="assistant-page">第 {{ page }} 页</span>
    </header>

    <div ref="listEl" class="assistant__messages" data-test="assistant-messages">
      <div v-if="!messages.length" class="assistant__empty">
        <p class="assistant__empty-title">我在听这一页的讲解。关于本页讲稿、公式或例题，可以直接问我。</p>
        <div v-if="overviewLines.length" class="assistant__overview">
          <div class="assistant__overview-label">本页讲稿速览</div>
          <ul class="assistant__overview-list">
            <li v-for="(line, i) in overviewLines" :key="i">{{ line }}</li>
          </ul>
        </div>
        <p class="assistant__empty-note">回答来自已审核的课件讲稿，不会编造讲稿之外的内容。</p>
      </div>
      <div v-for="(m, i) in messages" :key="i" class="a-msg" :class="`a-msg--${m.role}`">
        <div class="a-msg__who">{{ m.role === 'student' ? '我' : 'AI 助教' }}</div>
        <div class="a-msg__bubble">
          <span v-if="m.role === 'assistant'" class="a-msg__tag" :class="tagClass(m)">{{ tagText(m) }}</span>
          <MathText :text="m.text" block />
          <div v-if="m.cite" class="a-msg__cite">{{ m.cite }}</div>
          <button v-if="m.slide" type="button" class="a-msg__jump" data-test="assistant-jump" @click="$emit('jump', m.slide)">
            跳到第 {{ m.slide }} 页 →
          </button>
        </div>
      </div>
    </div>

    <div class="assistant__chips">
      <button
        v-for="q in recommendations"
        :key="q"
        type="button"
        class="assistant__chip"
        data-test="assistant-chip"
        @click="ask(q)"
      >
        {{ q }}
      </button>
    </div>

    <div class="assistant__composer">
      <input
        v-model="input"
        class="assistant__input"
        data-test="assistant-input"
        type="text"
        placeholder="就当前页提问，例如：为什么必须 2a > |F₁F₂|？"
        @keyup.enter="ask()"
      />
      <button type="button" class="ms-btn ms-btn--primary ms-btn--sm" :disabled="!input.trim()" data-test="assistant-send" @click="ask()">
        提问
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import MathText from '../../MathText.vue'
import { answerQuestion, plainText, recommendedQuestions } from '../../../data/classroom'
import { pushQaMessage, qaMessages } from './progress'

const props = defineProps({
  deck: { type: Object, required: true },
  page: { type: Number, default: 1 },
})
defineEmits(['jump'])

const input = ref('')
const listEl = ref(null)

const messages = computed(() => qaMessages(props.deck.id, props.page))
const recommendations = computed(() => recommendedQuestions(props.deck, props.page))

/** 空态速览：只取当前页真实内容，不编造 */
const overviewLines = computed(() => {
  const slide = props.deck.slides?.[props.page - 1]
  if (!slide) return []
  const lines = []
  if (slide.lead) lines.push(`讲解：${truncate(plainText(slide.lead), 62)}`)
  if (slide.equation) lines.push(`板书：${truncate(plainText(slide.equation), 52)}`)
  if (Array.isArray(slide.bullets)) {
    for (const b of slide.bullets.slice(0, 2)) lines.push(`要点：${truncate(plainText(b), 46)}`)
  }
  return lines.slice(0, 4)
})

function truncate(text, n) {
  const s = String(text || '')
  return s.length > n ? s.slice(0, n) + '…' : s
}

function tagText(m) {
  if (m.hit === 'current') return '命中本页讲稿'
  if (m.hit === 'other') return `属于第 ${m.slide} 页`
  return '当前页讲稿未包含'
}
function tagClass(m) {
  if (m.hit === 'current') return 'is-ok'
  if (m.hit === 'other') return 'is-warn'
  return 'is-err'
}

function ask(preset) {
  const text = (typeof preset === 'string' ? preset : input.value).trim()
  if (!text) return
  pushQaMessage(props.deck.id, props.page, { role: 'student', text })
  const answer = answerQuestion(props.deck, props.page, text)
  pushQaMessage(props.deck.id, props.page, {
    role: 'assistant',
    text: answer.text,
    hit: answer.hit,
    cite: answer.cite || '',
    slide: answer.slide || null,
  })
  input.value = ''
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    const el = listEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(
  () => [props.page, messages.value.length],
  () => scrollToBottom(),
)
</script>

<style scoped>
.assistant {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.assistant__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line2, #f1f5f9);
  flex: none;
}
.assistant__icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #eef2ff, #ecfeff);
  border: 1px solid #dfe5ff;
  display: grid;
  place-items: center;
  font-size: 16px;
  flex: none;
}
.assistant__title {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
  min-width: 0;
}
.assistant__title b {
  font-size: 13px;
}
.assistant__title span {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
}
.assistant__page {
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--brand-deep, #4338ca);
  background: var(--brand-soft, #eef2ff);
  border-radius: 999px;
  padding: 2px 9px;
  flex: none;
}
.assistant__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 60%);
}
.assistant__empty {
  margin: auto;
  text-align: left;
  color: var(--ink3, #94a3b8);
  padding: 8px 4px;
  width: 100%;
}
.assistant__empty-title {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.7;
  text-align: center;
}
.assistant__overview {
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 9px 11px;
  background: #f8fafc;
}
.assistant__overview-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ink2, #334155);
  margin-bottom: 5px;
  letter-spacing: 0.04em;
}
.assistant__overview-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.assistant__overview-list li {
  font-size: 11px;
  line-height: 1.6;
  color: var(--ink3, #94a3b8);
  padding-left: 10px;
  position: relative;
}
.assistant__overview-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #c7d2fe;
}
.assistant__empty-note {
  margin: 10px 0 0 !important;
  font-size: 10.5px !important;
  line-height: 1.7;
  text-align: center;
  opacity: 0.85;
}
.a-msg {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 100%;
}
.a-msg--student {
  align-items: flex-end;
}
.a-msg__who {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
  padding: 0 3px;
}
.a-msg__bubble {
  max-width: 96%;
  border-radius: 12px;
  padding: 8px 11px;
  font-size: 12px;
  line-height: 1.75;
  color: var(--ink2, #334155);
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  word-break: break-word;
}
.a-msg--student .a-msg__bubble {
  background: var(--brand, #4f46e5);
  border-color: var(--brand, #4f46e5);
  color: #fff;
}
.a-msg--student .a-msg__bubble :deep(.katex) {
  color: #fff;
}
.a-msg__tag {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 700;
  border-radius: 5px;
  padding: 0 6px;
  margin-bottom: 5px;
}
.a-msg__tag.is-ok {
  background: #ecfdf5;
  color: #047857;
}
.a-msg__tag.is-warn {
  background: #fffbeb;
  color: #92400e;
}
.a-msg__tag.is-err {
  background: #fef2f2;
  color: #b91c1c;
}
.a-msg__cite {
  margin-top: 5px;
  font-size: 10px;
  color: var(--ink3, #94a3b8);
  border-top: 1px dashed var(--line, #e2e8f0);
  padding-top: 4px;
}
.a-msg__jump {
  margin-top: 6px;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: var(--brand-deep, #4338ca);
  border-radius: 7px;
  padding: 3px 9px;
  font-size: 10.5px;
  font-weight: 700;
  font-family: inherit;
}
.assistant__chips {
  flex: none;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 8px 14px 0;
  border-top: 1px solid var(--line2, #f1f5f9);
  background: #fff;
}
.assistant__chip {
  flex: none;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  color: var(--ink2, #334155);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 10.5px;
  font-family: inherit;
  white-space: nowrap;
}
.assistant__chip:hover {
  border-color: var(--brand, #4f46e5);
  color: var(--brand-deep, #4338ca);
  background: #fff;
}
.assistant__composer {
  flex: none;
  display: flex;
  gap: 8px;
  padding: 9px 14px 12px;
  background: #fff;
}
.assistant__input {
  flex: 1;
  min-width: 0;
  height: 34px;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 9px;
  padding: 0 11px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  color: var(--ink, #0f172a);
}
.assistant__input:focus {
  border-color: var(--brand, #4f46e5);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}
</style>
