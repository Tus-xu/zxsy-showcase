<template>
  <div class="ix-asm">
    <!-- sgv3（CHAIN-DESIGN §5.6）assemble 表达式拼装 · 免打字交互形式 5/9（guiding 主力）
         槽位 + 符号面板 + 拼装栈 → latex 线性化双发（tokens 显示序列 + latex 串）。
         面板是「插入」不是「自由编辑」（无光标管理，风险缓解 §14）；frac/sqrt 模板
         带子槽焦点填充；>12 token 锁面板转打字（防「打字模拟器」）。
         判定后端 sympy 等价 + 分叉定位；语音 LaTeX 回填由信封壳打字回退承载。 -->
    <div v-if="structureHint" class="ix-as-hint">💡 {{ structureHint }}</div>

    <!-- 拼装区：seed 前缀 + 拼装栈（实时 KaTeX 预览 + token 明文） -->
    <div class="ix-as-board">
      <div class="ix-as-preview">
        <LatexText v-if="fullLatex" :text="`$${fullLatex}$`" />
        <span v-else class="ix-as-empty">从下面的符号面板点选，把这一步拼出来</span>
      </div>
      <div class="ix-as-toks">
        <span v-if="seedLatex" class="ix-as-seed" :title="`上一步：${seedLatex}`">{{ seedLatex }}</span>
        <template v-for="(t, i) in stack" :key="i">
          <span v-if="t.k === 'atom'" class="ix-as-tok" :class="{ focus: isFocus([]) && i === stack.length - 1 }">{{ t.v }}</span>
          <span v-else-if="t.k === 'frac'" class="ix-as-frac" :class="{ focus: focusPath[0] === i }">
            <button type="button" class="ix-as-switch" :title="focusPath[0] === i ? '正在填：点切换分子/分母' : '点这里填这个分数'" @click="cycleFocus(i)">
              ⇄<small>{{ focusPath[0] === i ? (focusPath[1] === 'num' ? '分子' : '分母') : '分数' }}</small>
            </button>
            <span class="ix-as-fracbox">
              <span class="ix-as-fn" :class="{ on: focusPath[0] === i && focusPath[1] === 'num' }">{{ textOf(t.num) || '分子…' }}</span>
              <span class="ix-as-fd"></span>
              <span class="ix-as-fn" :class="{ on: focusPath[0] === i && focusPath[1] === 'den' }">{{ textOf(t.den) || '分母…' }}</span>
            </span>
          </span>
          <span v-else-if="t.k === 'sqrt'" class="ix-as-sqrt" :class="{ focus: focusPath[0] === i }" @click="focusPath = [i, 'rad']" title="点这里填根号里">√(<span class="ix-as-fn" :class="{ on: focusPath[0] === i }">{{ textOf(t.rad) || '…' }}</span>)</span>
        </template>
      </div>
    </div>

    <!-- 符号面板（sgv4 F5：抽出为共享 SymbolPalette；DOM 类 .ix-as-palette/.ix-as-key
         与 press→tapKey 交互契约不变，v3 测试零回退） -->
    <SymbolPalette
      :keys="palette" :locked="atLimit" palette-id="assemble"
      limit-hint="式子已经够长了——直接用打字告诉我这一步的结果吧"
      @press="tapKey"
    />

    <div class="ix-as-actions">
      <button type="button" class="ix-as-ghost" :disabled="!stack.length" @click="backspace">⌫ 退一格</button>
      <button type="button" class="ix-as-ghost" :disabled="!stack.length" @click="clearAll">清空重拼</button>
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">拼好了</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import LatexText from '@/components/LatexText.vue'
import SymbolPalette from '@/components/chat/SymbolPalette.vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.6 spec：{seed_latex, slots, palette, palette_size, structure_hint} */
  spec: { type: Object, required: true },
})
// sgv4（§3.5）：编辑操作 emit('edit')，信封壳汇总计入 edit_count（数据飞轮 R5）
const emit = defineEmits(['submit', 'edit'])

const MAX_TOKENS = 12 // 设计 §5.6 上限：>12 token 转 free_text
const seedLatex = computed(() => String(props.spec?.seed_latex || '').trim())
const structureHint = computed(() => String(props.spec?.structure_hint || '').trim())
const slotId = computed(() => String(props.spec?.slots?.[0]?.id || 's1'))

/** 面板键：后端 palette（tier 旋钮：6+2×tier 含干扰符号）优先，缺失走防御缺省集 */
const DEFAULT_PALETTE = [
  { t: 'num', v: '1' }, { t: 'num', v: '2' }, { t: 'num', v: '3' }, { t: 'num', v: '4' }, { t: 'num', v: '5' },
  { t: 'num', v: '6' }, { t: 'num', v: '7' }, { t: 'num', v: '8' }, { t: 'num', v: '9' }, { t: 'num', v: '0' },
  { t: 'var', v: 'x' }, { t: 'var', v: 'y' }, { t: 'var', v: 'a' },
  { t: 'op', v: '+' }, { t: 'op', v: '-' }, { t: 'op', v: '×', latex: '\\times' }, { t: 'op', v: '÷', latex: '\\div' },
  { t: 'op', v: '=' }, { t: 'op', v: '<' }, { t: 'op', v: '>' }, { t: 'op', v: '(' }, { t: 'op', v: ')' },
  { t: 'op', v: '^' }, { t: 'tmpl', v: 'frac' }, { t: 'tmpl', v: 'sqrt' },
]
const palette = computed(() => {
  const p = Array.isArray(props.spec?.palette) ? props.spec.palette.filter((x) => x && x.v) : []
  return p.length ? p : DEFAULT_PALETTE
})
/* ===== 拼装栈：原子 / frac(num,den) / sqrt(rad)；focusPath=[idx, part] 定位填充目标 ===== */
const stack = ref([])
const focusPath = ref([]) // [] = 主栈末尾
const isFocus = (p) => focusPath.value.length === p.length && focusPath.value.every((v, i) => v === p[i])

function targetList() {
  const [idx, part] = focusPath.value
  if (idx == null) return stack.value
  const t = stack.value[idx]
  if (!t || t.k === 'atom') return stack.value
  return t[part] || stack.value
}
function countAtoms(list) {
  let n = 0
  for (const t of list) {
    if (t.k === 'atom') n += 1
    else n += countAtoms(t.num || []) + countAtoms(t.den || []) + countAtoms(t.rad || [])
  }
  return n
}
const atomCount = computed(() => countAtoms(stack.value))
const atLimit = computed(() => atomCount.value >= MAX_TOKENS)

function tapKey(p) {
  if (atLimit.value) return
  emit('edit')
  if (p.t === 'tmpl' || p.v === 'frac' || p.v === 'sqrt') {
    const node = p.v === 'frac' ? { k: 'frac', num: [], den: [] } : { k: 'sqrt', rad: [] }
    // 模板只能落在主栈（嵌套模板后点模板键：先完成当前模板）
    const list = stack.value
    list.push(node)
    stack.value = [...list]
    focusPath.value = [stack.value.length - 1, p.v === 'frac' ? 'num' : 'rad']
    return
  }
  const list = targetList()
  list.push({ k: 'atom', v: String(p.v), latex: p.latex ? String(p.latex) : '' })
  stack.value = [...stack.value]
}
/** 模板焦点循环：主栈 → 分子 → 分母 → 主栈（点击已放模板上的 ⇄） */
function cycleFocus(idx) {
  const t = stack.value[idx]
  if (!t) return
  if (focusPath.value[0] !== idx) { focusPath.value = [idx, 'num']; return }
  if (t.k !== 'frac') { focusPath.value = []; return }
  focusPath.value = t.num.length && !t.den.length ? [idx, 'den'] : focusPath.value[1] === 'num' ? [idx, 'den'] : [idx, 'num']
}
function backspace() {
  emit('edit')
  const [idx, part] = focusPath.value
  if (idx == null) {
    stack.value = stack.value.slice(0, -1)
    return
  }
  const t = stack.value[idx]
  if (!t) { focusPath.value = []; return }
  const sub = t[part]
  if (Array.isArray(sub) && sub.length) {
    sub.pop()
    stack.value = [...stack.value]
    return
  }
  // 子栈已空：退模板本身
  stack.value = stack.value.filter((_, i) => i !== idx)
  focusPath.value = []
}
function clearAll() {
  emit('edit')
  stack.value = []
  focusPath.value = []
}

/* ===== 线性化：latex 串接（双发的另一半）+ 显示文本 ===== */
function latexOf(t) {
  if (t.k === 'frac') return `\\dfrac{${latexSeq(t.num)}}{${latexSeq(t.den)}}`
  if (t.k === 'sqrt') return `\\sqrt{${latexSeq(t.rad)}}`
  return t.latex || t.v
}
function latexSeq(list) {
  return (list || []).map(latexOf).join('')
}
function textOf(list) {
  return (list || []).map((t) => (t.k === 'atom' ? t.v : t.k === 'frac' ? `(${textOf(t.num)})/(${textOf(t.den)})` : `√(${textOf(t.rad)})`)).join(' ')
}
const fullLatex = computed(() => (seedLatex.value ? `${seedLatex.value} ${latexSeq(stack.value)}` : latexSeq(stack.value)).trim())

const canSubmit = computed(() => stack.value.length > 0)
function submit() {
  if (!canSubmit.value) return
  // 双发（§5.6）：tokens 显示序列（LLM 判答兜底用）+ latex 线性化（sympy 等价判定用）
  emit('submit', {
    [slotId.value]: {
      tokens: stack.value.map((t) => (t.k === 'atom' ? t.v : t.k === 'frac' ? `(${textOf(t.num)})/(${textOf(t.den)})` : `√(${textOf(t.rad)})`)),
      latex: latexSeq(stack.value),
    },
  })
}
</script>

<style scoped>
.ix-asm { font-size: 13px; }
.ix-as-hint { font-size: 11.5px; color: #6d28d9; background: #f5f3ff; border-radius: var(--radius-sm); padding: 5px 10px; margin-bottom: 7px; }
.ix-as-board { padding: 9px 11px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: rgba(255, 255, 255, 0.9); margin-bottom: 8px; }
.ix-as-preview { font-size: 15px; min-height: 26px; display: flex; align-items: center; padding-bottom: 6px; border-bottom: 1px dashed var(--border); margin-bottom: 7px; overflow-x: auto; }
.ix-as-empty { font-size: 12px; color: var(--text-muted); }
.ix-as-toks { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 26px; }
.ix-as-seed { font-size: 12px; color: var(--text-muted); padding: 2px 6px; background: var(--bg-subtle, #f1f5f9); border-radius: 5px; }
.ix-as-tok {
  padding: 2px 7px; border-radius: 5px; background: #ede9fe; color: #4c1d95;
  font-family: var(--font-serif, serif); font-weight: 700; font-size: 13.5px;
}
.ix-as-tok.focus { outline: 2px solid #8b5cf6; }
.ix-as-frac, .ix-as-sqrt { display: inline-flex; align-items: center; gap: 4px; padding: 2px 5px; border-radius: 6px; }
.ix-as-frac.focus, .ix-as-sqrt.focus { background: rgba(139, 92, 246, 0.1); }
.ix-as-switch {
  border: 1px solid rgba(139, 92, 246, 0.35); background: #fff; color: #6d28d9; cursor: pointer;
  border-radius: 999px; font-size: 10px; padding: 1px 6px; display: inline-flex; align-items: center; gap: 3px; flex: 0 0 auto;
}
.ix-as-switch small { font-size: 9px; }
.ix-as-fracbox { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
.ix-as-fn { font-size: 12px; color: #4c1d95; min-height: 16px; font-weight: 700; }
.ix-as-fn.on { color: #7c3aed; border-bottom: 2px solid #8b5cf6; }
.ix-as-fd { width: 100%; min-width: 22px; height: 2px; background: #7c3aed; border-radius: 1px; }
.ix-as-sqrt { cursor: pointer; font-size: 13px; color: #4c1d95; font-weight: 700; }
/* 符号面板 */
.ix-as-palette { display: flex; flex-wrap: wrap; gap: 5px; }
.ix-as-palette.locked { opacity: 0.55; }
.ix-as-key {
  min-width: 36px; padding: 6px 9px; border-radius: 8px; cursor: pointer; font-size: 13.5px; font-weight: 600;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-primary);
  font-family: var(--font-serif, serif); transition: all .12s; touch-action: manipulation;
}
.ix-as-key:hover:not(:disabled) { border-color: #7c3aed; background: #f5f3ff; }
.ix-as-key:active:not(:disabled) { transform: scale(0.94); }
.ix-as-key:disabled { cursor: not-allowed; opacity: 0.5; }
.ix-as-limit { width: 100%; font-size: 11px; color: #b45309; margin-top: 3px; }
.ix-as-actions { display: flex; align-items: center; gap: 8px; margin-top: 9px; flex-wrap: wrap; }
.ix-as-ghost {
  padding: 6px 12px; border-radius: var(--radius-md); cursor: pointer; font-size: 12px;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary);
}
.ix-as-ghost:hover:not(:disabled) { border-color: var(--border-strong, #cbd5e1); }
.ix-as-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
