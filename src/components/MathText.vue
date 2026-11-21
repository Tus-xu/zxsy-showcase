<template>
  <span class="ms-katex" :class="{ 'ms-katex--block': block }" v-html="html" />
</template>

<script setup>
import { computed } from 'vue'
import katex from 'katex'

const props = defineProps({
  text: { type: String, default: '' },
  block: { type: Boolean, default: false },
})

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function katexOrRaw(tex, display) {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: display, strict: false })
  } catch {
    return esc(tex)
  }
}

function fmtText(seg) {
  // 非公式段落：转义 HTML 后支持 **加粗**、`代码`、换行
  let out = esc(seg)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\n/g, '<br/>')
  return out
}

/** 先切分数学片段，再分别处理；避免 HTML 转义污染公式源码。 */
function render(raw) {
  const src = String(raw ?? '')
  if (props.block) {
    const out = []
    const re = /\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g
    let last = 0
    let m
    while ((m = re.exec(src))) {
      if (m.index > last) out.push(fmtText(src.slice(last, m.index)))
      if (m[1] !== undefined) out.push(`<span class="ms-block">${katexOrRaw(m[1], true)}</span>`)
      else out.push(katexOrRaw(m[2], false))
      last = re.lastIndex
    }
    if (last < src.length) out.push(fmtText(src.slice(last)))
    return out.join('')
  }
  const out = []
  const re = /\$([^$\n]+)\$/g
  let last = 0
  let m
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(fmtText(src.slice(last, m.index)))
    out.push(katexOrRaw(m[1], false))
    last = re.lastIndex
  }
  if (last < src.length) out.push(fmtText(src.slice(last)))
  return out.join('')
}

const html = computed(() => render(props.text))
</script>

<style scoped>
.ms-katex {
  display: inline;
  word-break: break-word;
}
.ms-katex--block {
  display: block;
  line-height: 1.95;
}
.ms-katex :deep(.katex-display) {
  margin: 10px 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 0;
}
.ms-katex :deep(code) {
  background: rgba(99, 102, 241, 0.1);
  border-radius: 4px;
  padding: 0 4px;
  font-size: 0.92em;
}
.ms-katex :deep(.ms-block) {
  display: block;
  margin: 8px 0;
}
</style>
