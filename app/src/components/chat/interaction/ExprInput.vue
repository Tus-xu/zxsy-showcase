<template>
  <div class="ix-ei">
    <!-- sgv4（DESIGN §4.1 expr_input / F5）last_resort 专用式子输入。
         确需产出完整数学表达式且低输入形式不适用时的结构化通道（T18 前置）——
         不是裸 LaTeX 文本框：SymbolPalette 按题裁剪键集（spec.keypad，R1 强制）
         点选插入 + 可选 skeleton 骨架模板；输出 latex 交后端归一化 + sympy 等价判定。
         编辑操作 emit('edit')（§3.5 数据飞轮）。 -->
    <div v-if="promptText" class="ix-ei-prompt">{{ promptText }}</div>

    <!-- 骨架模板（可选）：一键填入骨架，□ 位置由学生用符号面板补齐 -->
    <div v-if="skeletonText" class="ix-ei-skeleton">
      <span class="ix-ei-skel-label">参照骨架</span>
      <code class="ix-ei-skel">{{ skeletonText }}</code>
      <button type="button" class="ix-ei-skel-fill" @click="fillSkeleton">填入骨架再补全</button>
    </div>

    <div class="ix-ei-board">
      <input
        ref="inputRef" v-model="latex" class="ix-ei-input" data-soc-expr-input=""
        maxlength="200" :placeholder="placeholder" :disabled="disabled"
        @input="emit('edit')" @keydown.enter.prevent="submit"
      />
    </div>
    <SymbolPalette :keys="keypadKeys" palette-id="expr-input" @press="tapKey" />

    <div class="ix-ei-actions">
      <button type="button" class="ix-ei-ghost" :disabled="!latex" @click="clearAll">清空</button>
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">写好了</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import SymbolPalette from '@/components/chat/SymbolPalette.vue'

const props = defineProps({
  /** sgv4 §4.1 expr_input spec：{prompt, keypad:[...], skeleton?}（_answers 后端剥离） */
  spec: { type: Object, required: true },
  /** 已用态禁用（信封壳传入） */
  disabled: { type: Boolean, default: false },
})
// submit：{latex}（后端 normalize_for_compare 归一 + mathcheck.exprs_equivalent sympy 等价判定）
// edit：输入/点键/清空各计一次（edit_count 脆弱掌握判据 §3.5/R5）
const emit = defineEmits(['submit', 'edit'])

const promptText = computed(() => String(props.spec?.prompt || '').trim())
const skeletonText = computed(() => String(props.spec?.skeleton || '').trim())
const placeholder = computed(() => promptText.value ? '用下面的符号键把式子写出来' : '把这一步的式子写出来')

/** 按题裁剪键集：spec.keypad 优先（R1）；缺失走防御缺省集（不回退裸输入） */
const DEFAULT_KEYPAD = ['x', 'y', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '^2', '(', ')', '/']
const keypadKeys = computed(() => {
  const kp = Array.isArray(props.spec?.keypad) ? props.spec.keypad.filter((k) => k != null && String(k) !== '') : []
  return kp.length ? kp : DEFAULT_KEYPAD
})

/** 键插入文本：√ 给出左括号便于续写；其余按字面插入 */
const INSERT_MAP = { '√': '√(', 'sqrt': '√(' }
const inputRef = ref(null)
const latex = ref('')

function tapKey(p) {
  if (props.disabled) return
  const text = INSERT_MAP[p.v] ?? String(p.v)
  latex.value += text
  emit('edit')
  inputRef.value?.focus()
}
function fillSkeleton() {
  if (props.disabled || !skeletonText.value) return
  // 骨架 □ 挖空位：填入骨架（去掉 □），学生在空位处用符号键补全
  latex.value = skeletonText.value.replace(/[□_]+/g, '')
  emit('edit')
  inputRef.value?.focus()
}
function clearAll() {
  if (props.disabled || !latex.value) return
  latex.value = ''
  emit('edit')
}

const canSubmit = computed(() => !!latex.value.trim() && !props.disabled)
function submit() {
  if (!canSubmit.value) return
  emit('submit', { latex: latex.value.trim() })
}
defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<style scoped>
.ix-ei { font-size: 13px; }
.ix-ei-prompt { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 7px; }
.ix-ei-skeleton {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; border-radius: var(--radius-sm); margin-bottom: 8px;
  background: #f5f3ff; border: 1px dashed rgba(139, 92, 246, 0.4);
}
.ix-ei-skel-label { font-size: 11px; font-weight: 700; color: #6d28d9; }
.ix-ei-skel { font-size: 13.5px; font-weight: 700; color: #4c1d95; font-family: var(--font-serif, serif); }
.ix-ei-skel-fill {
  border: 1px solid rgba(139, 92, 246, 0.35); background: #fff; color: #6d28d9; cursor: pointer;
  border-radius: 999px; font-size: 11px; padding: 2px 10px;
}
.ix-ei-skel-fill:hover { background: #f5f3ff; }
.ix-ei-board { margin-bottom: 7px; }
.ix-ei-input {
  width: 100%; box-sizing: border-box; border: 1.5px solid rgba(139, 92, 246, 0.45); border-radius: var(--radius-sm);
  padding: 9px 12px; font-family: var(--font-serif, serif); font-size: 15px; font-weight: 600; outline: none;
  background: var(--bg-white); color: var(--text-primary);
}
.ix-ei-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.16); }
.ix-ei-input:disabled { opacity: 0.5; }
.ix-ei-actions { display: flex; align-items: center; gap: 8px; margin-top: 9px; }
.ix-ei-ghost {
  padding: 6px 12px; border-radius: var(--radius-md); cursor: pointer; font-size: 12px;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary);
}
.ix-ei-ghost:hover:not(:disabled) { border-color: var(--border-strong, #cbd5e1); }
.ix-ei-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
