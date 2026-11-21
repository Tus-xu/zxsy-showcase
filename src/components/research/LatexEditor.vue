<template>
  <div class="ed" :class="{ 'ed--no-gutter': !showLineNumbers, 'ed--readonly': readonly }">
    <div v-if="showLineNumbers" ref="gutter" class="ed__gutter" aria-hidden="true">
      <div v-for="ln in lineCount" :key="ln" class="ed__ln" :class="{ 'ed__ln--active': ln === activeLine }">{{ ln }}</div>
    </div>
    <div class="ed__body">
      <pre ref="hl" class="ed__hl" aria-hidden="true"><code v-html="highlighted"></code></pre>
      <textarea
        ref="ta"
        class="ed__input"
        :value="modelValue"
        spellcheck="false"
        wrap="off"
        :readonly="readonly"
        aria-label="LaTeX 源码编辑器"
        data-testid="latex-editor"
        @input="onInput"
        @scroll="syncScroll"
        @keyup="emitCursor"
        @click="emitCursor"
        @keydown.tab.prevent="insertTab"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  activeLine: { type: Number, default: 1 },
  showLineNumbers: { type: Boolean, default: true },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'cursor'])

const ta = ref(null)
const hl = ref(null)
const gutter = ref(null)

const lineCount = computed(() => String(props.modelValue || '').split('\n').length)

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function colorLine(line) {
  // 语法着色：注释 / 行内数学 / \命令 / 花括号 / 普通文本
  const out = []
  const re = /(%[^]*$|\$[^$]*\$|\\[a-zA-Z@]+\*?|\\[^a-zA-Z]|[{}])/g
  let last = 0
  let m
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(esc(line.slice(last, m.index)))
    const tok = m[0]
    if (tok.startsWith('%')) out.push(`<span class="t-comment">${esc(tok)}</span>`)
    else if (tok.startsWith('$')) out.push(`<span class="t-math">${esc(tok)}</span>`)
    else if (tok.startsWith('\\') && tok.length > 1) {
      if (tok.length === 2) out.push(`<span class="t-cmd">${esc(tok)}</span>`)
      else out.push(`<span class="t-cmd">${esc(tok)}</span>`)
    } else if (tok === '{' || tok === '}') out.push(`<span class="t-brace">${esc(tok)}</span>`)
    else out.push(esc(tok))
    last = re.lastIndex
  }
  if (last < line.length) out.push(esc(line.slice(last)))
  return out.join('')
}

const highlighted = computed(() => String(props.modelValue || '').split('\n').map(colorLine).join('\n') + '\n')

function onInput(e) {
  emit('update:modelValue', e.target.value)
  emitCursor()
}
function emitCursor() {
  const el = ta.value
  if (!el) return
  const pos = el.value.slice(0, el.selectionStart || 0)
  const line = pos.split('\n').length
  emit('cursor', line)
}
function syncScroll() {
  const el = ta.value
  if (!el) return
  if (hl.value) hl.value.style.transform = `translate(${-el.scrollLeft}px, ${-el.scrollTop}px)`
  if (gutter.value) gutter.value.style.transform = `translateY(${-el.scrollTop}px)`
}
function insertTab() {
  insertSnippet('  ')
}
function insertSnippet(text) {
  const el = ta.value
  if (!el || props.readonly) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const value = el.value
  const next = value.slice(0, start) + text + value.slice(end)
  emit('update:modelValue', next)
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + text.length, start + text.length)
    emitCursor()
  })
}
function revealLine(line) {
  const el = ta.value
  if (!el) return
  const lines = el.value.split('\n')
  const target = Math.min(Math.max(1, line || 1), lines.length)
  let offset = 0
  for (let i = 0; i < target - 1; i++) offset += lines[i].length + 1
  const lh = 22
  el.scrollTop = Math.max(0, (target - 1) * lh - 90)
  syncScroll()
  nextTick(() => {
    el.focus()
    el.setSelectionRange(offset, offset + (lines[target - 1] || '').length)
    emitCursor()
  })
}
function focus() {
  ta.value?.focus()
}
function execUndo() {
  ta.value?.focus()
  document.execCommand('undo')
}
function execRedo() {
  ta.value?.focus()
  document.execCommand('redo')
}

watch(
  () => props.activeLine,
  (v) => {
    if (!v) return
    nextTick(() => {
      if (gutter.value) gutter.value.style.transform = `translateY(${-(ta.value?.scrollTop || 0)}px)`
    })
  },
)
watch(
  () => props.modelValue,
  () => nextTick(syncScroll),
)

defineExpose({ revealLine, insertSnippet, focus, execUndo, execRedo })
</script>

<style scoped>
.ed {
  height: 100%;
  min-height: 0;
  display: flex;
  background: var(--rw-surface);
  font-family: var(--rw-font-mono);
  font-size: 13px;
  line-height: 22px;
  position: relative;
  overflow: hidden;
}
.ed__gutter {
  flex: none;
  width: 44px;
  padding: 10px 0 40px;
  text-align: right;
  background: var(--rw-surface-2);
  border-right: 1px solid var(--rw-border);
  color: var(--rw-text-3);
  user-select: none;
  overflow: hidden;
  position: relative;
}
.ed__ln {
  padding-right: 9px;
  font-size: 11px;
  line-height: 22px;
}
.ed__ln--active {
  color: var(--rw-primary);
  font-weight: 700;
  background: var(--rw-primary-soft);
}
.ed__body {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.ed__hl,
.ed__input {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 10px 14px 40px;
  font-family: inherit;
  font-size: 13px;
  line-height: 22px;
  letter-spacing: 0;
  tab-size: 2;
  white-space: pre;
  overflow: hidden;
  border: 0;
  background: transparent;
}
.ed__hl {
  pointer-events: none;
  color: var(--rw-text);
}
.ed__hl code {
  font-family: inherit;
}
.ed__input {
  width: 100%;
  height: 100%;
  resize: none;
  overflow: auto;
  color: transparent;
  caret-color: #1e293b;
  outline: none;
  scrollbar-width: thin;
}
.ed__input::selection {
  background: rgba(79, 70, 229, 0.22);
}
:deep(.t-cmd) {
  color: var(--rw-code-macro);
}
:deep(.t-comment) {
  color: var(--rw-code-comment);
}
:deep(.t-math) {
  color: var(--rw-code-math);
}
:deep(.t-brace) {
  color: var(--rw-code-brace);
}
.ed--no-gutter .ed__hl,
.ed--no-gutter .ed__input {
  padding-left: 16px;
}
</style>
