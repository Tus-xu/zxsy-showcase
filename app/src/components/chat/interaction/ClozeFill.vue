<template>
  <div class="ix-cloze">
    <!-- sgv3（CHAIN-DESIGN §5.7）cloze 填空模板（faded worked example）· 免打字交互形式 6/9
         body_latex 带 □ 占位 → 前端切分为「文本段（KaTeX 渲染）+ 空 chip」；
         每空 palette_by_blank 点选填入（逐空确定性判定，空位数随 tier 递增）。
         占位归一：$□_1$ / □_1 / □1 全兼容（数学环境内占位摘出为 chip）。 -->
    <div class="ix-cz-body">
      <template v-for="(seg, i) in segments" :key="i">
        <MarkdownView v-if="seg.type === 'text' && seg.text" :text="seg.text" :zoomable="false" />
        <button
          v-else-if="seg.type === 'blank'"
          type="button" class="ix-cz-blank" :class="{ filled: !!answers[seg.id], open: openBlank === seg.id }"
          :title="blankKindZh(seg.id)"
          @click="toggleOpen(seg.id)"
        >
          <span v-if="answers[seg.id]" class="ix-cz-val">{{ answers[seg.id] }}</span>
          <span v-else class="ix-cz-slot">空 {{ seg.id.replace(/^b/, '') }} ▾</span>
        </button>
      </template>
    </div>

    <!-- 展开的空选项面板（palette_by_blank；缺失走通用符号集防御） -->
    <div v-if="openBlank" class="ix-cz-panel">
      <div class="ix-cz-plabel">选一个填进「空 {{ openBlank.replace(/^b/, '') }}」：</div>
      <div class="ix-cz-opts">
        <button
          v-for="(o, oi) in openPalette" :key="oi" type="button"
          class="ix-cz-opt" :class="{ on: answers[openBlank] === o }"
          @click="fill(openBlank, o)"
        >{{ o }}</button>
      </div>
    </div>

    <div class="ix-cz-actions">
      <span class="ix-cz-progress">{{ filledCount }}/{{ blanks.length }} 空已填</span>
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">填好了</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.7 spec：{body_latex, blanks:[{id,answer_kind}], palette_by_blank:{id:[...]}} */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit', 'edit']) // sgv4 §3.5：填空编辑操作 emit('edit')，信封壳汇总 edit_count

const GENERIC_PALETTE = ['>', '<', '≥', '≤', '=', '上', '下', '正', '负', '0', '1', '2']

const blanks = computed(() =>
  (Array.isArray(props.spec?.blanks) ? props.spec.blanks : [])
    .filter((b) => b && b.id != null)
    .map((b) => ({ id: String(b.id), kind: String(b.answer_kind || '') })),
)
const blankIds = computed(() => new Set(blanks.value.map((b) => b.id)))

/**
 * 占位 id 规范化：设计协议 body 写 □_1 而 blanks id 为 b1（编号派生），
 * 也有直接同 id 的写法——统一映射到 blanks 里存在的 id，两种都对齐；
 * 都不存在时原样返回（渲染 chip 但不计入提交判定，防御旧物料）。
 */
function canonicalBlankId(id) {
  if (blankIds.value.has(id)) return id
  if (blankIds.value.has(`b${id}`)) return `b${id}`
  if (/^b/.test(id) && blankIds.value.has(id.slice(1))) return id.slice(1)
  return id
}

/**
 * 占位切分状态机：先归一 `$□_1$` → `□_1`（包裹定界符摘除），
 * 再扫描 $ 开闭状态，遇 □id 切出 chip（数学环境内的占位段自动补齐定界符）。
 */
const segments = computed(() => {
  const raw = String(props.spec?.body_latex || props.spec?.body || '')
  const text = raw.replace(/\$\s*□\s*_?\s*([A-Za-z0-9]+)\s*\$/g, '□_$1')
  const out = []
  let buf = ''
  let inMath = false
  let i = 0
  const flush = () => {
    if (buf) out.push({ type: 'text', text: buf })
    buf = inMath ? '$' : ''
  }
  while (i < text.length) {
    const rest = text.slice(i)
    if (rest.startsWith('$$')) { buf += '$$'; inMath = !inMath; i += 2; continue }
    if (text[i] === '$') { buf += '$'; inMath = !inMath; i += 1; continue }
    const m = rest.match(/^□\s*_?\s*([A-Za-z0-9]+)/)
    if (m) {
      flush()
      out.push({ type: 'blank', id: canonicalBlankId(m[1]) })
      i += m[0].length
      continue
    }
    buf += text[i]
    i += 1
  }
  if (buf) out.push({ type: 'text', text: buf })
  return out
})

const answers = ref({})
const openBlank = ref('')
const openPalette = computed(() => {
  if (!openBlank.value) return []
  const p = props.spec?.palette_by_blank?.[openBlank.value]
  if (Array.isArray(p) && p.length) return p.map((v) => String(v))
  return GENERIC_PALETTE
})
function toggleOpen(id) {
  openBlank.value = openBlank.value === id ? '' : id
}
function fill(id, val) {
  emit('edit') // sgv4 §3.5：每次填空编辑计一次（数据飞轮 edit_count）
  answers.value = { ...answers.value, [id]: val }
  openBlank.value = ''
}
const filledCount = computed(() => blanks.value.filter((b) => answers.value[b.id]).length)
const canSubmit = computed(() => blanks.value.length > 0 && filledCount.value === blanks.value.length)
function blankKindZh(id) {
  const b = blanks.value.find((x) => x.id === id)
  return ({ relation: '填关系符号', word: '填词', number: '填数' }[b?.kind]) || '点选填空'
}
function submit() {
  if (!canSubmit.value) return
  const out = {}
  for (const b of blanks.value) out[b.id] = answers.value[b.id]
  emit('submit', { blanks: out })
}
</script>

<style scoped>
.ix-cloze { font-size: 13px; }
.ix-cz-body {
  padding: 10px 12px; border-radius: var(--radius-sm); line-height: 2;
  background: rgba(255, 255, 255, 0.85); border: 1px solid var(--border);
}
.ix-cz-body :deep(.md-body) { display: inline; font-size: 13px; }
.ix-cz-body :deep(.md-body p) { display: inline; margin: 0; }
.ix-cz-body :deep(.katex) { font-size: 1.02em; }
.ix-cz-blank {
  display: inline-flex; align-items: center; vertical-align: middle; margin: 0 2px;
  min-width: 34px; padding: 1px 8px; border-radius: 6px; cursor: pointer;
  border: 1.5px dashed #8b5cf6; background: #f5f3ff; color: #5b21b6;
  font-size: 12.5px; font-weight: 700; transition: all .13s;
}
.ix-cz-blank:hover { background: #ede9fe; }
.ix-cz-blank.open { border-style: solid; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); }
.ix-cz-blank.filled { border-style: solid; border-color: #059669; background: #ecfdf5; color: #047857; }
.ix-cz-slot { opacity: 0.75; font-weight: 500; }
.ix-cz-val { font-family: var(--font-serif, serif); }
.ix-cz-panel { margin-top: 8px; padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid rgba(139, 92, 246, 0.25); background: #faf9ff; }
.ix-cz-plabel { font-size: 11.5px; color: #6d28d9; margin-bottom: 6px; }
.ix-cz-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.ix-cz-opt {
  padding: 6px 13px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-primary);
  font-family: var(--font-serif, serif); transition: all .12s;
}
.ix-cz-opt:hover { border-color: #8b5cf6; background: #f5f3ff; }
.ix-cz-opt.on { border-color: #059669; background: #ecfdf5; color: #047857; }
.ix-cz-actions { display: flex; align-items: center; gap: 10px; margin-top: 9px; }
.ix-cz-progress { font-size: 11px; color: var(--text-muted); }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
