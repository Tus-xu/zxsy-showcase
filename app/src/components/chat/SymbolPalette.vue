<template>
  <!-- sgv4（DESIGN F5）：符号点选面板——从 ExprAssembler.vue 抽出的共享组件。
       纯点选、零键盘（R21 防「打字模拟器」纪律）；按键集按 spec.keypad 裁剪（R1：
       last_resort 也不给裸 LaTeX 框，只给按题裁剪的符号键）。两个消费方：
       ① ExprAssembler（assemble 形式，对象键 {t,v,latex}，锁定态由调用方计算）；
       ② ExprInput / last_resort free_text 主通道（字符串键 'x'/'^2'/'√'/…）。
       DOM 类沿用 .ix-as-palette/.ix-as-key（v3 测试与既有样式契约零回退），
       另加 data-palette-key 稳定锚点供 DOM 级验收。 -->
  <div class="ix-as-palette" :class="{ locked }" :data-soc-palette="String(paletteId || '')">
    <button
      v-for="(p, pi) in normalizedKeys" :key="pi" type="button" class="ix-as-key"
      :data-palette-key="p.v" :disabled="locked" @click="$emit('press', p)"
    >{{ keyLabel(p) }}</button>
    <div v-if="locked && limitHint" class="ix-as-limit">{{ limitHint }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 键集：{t,v,latex?,label?} 对象（assemble）或字符串（keypad 裁剪）混合数组 */
  keys: { type: Array, default: () => [] },
  /** 锁定态（assemble >12 token 防打字模拟器） */
  locked: { type: Boolean, default: false },
  /** 锁定时显示的提示文案 */
  limitHint: { type: String, default: '' },
  /** 面板稳定锚点（e2e/测试用） */
  paletteId: { type: String, default: '' },
})
defineEmits(['press'])

/** 字符串键归一为对象键；无效项过滤 */
const normalizedKeys = computed(() =>
  (Array.isArray(props.keys) ? props.keys : [])
    .map((p) => (typeof p === 'string' ? { t: 'op', v: p } : p))
    .filter((p) => p && p.v !== undefined && p.v !== null && String(p.v) !== ''),
)

/** 显示标签：模板键换易读文案（沿 ExprAssembler 同表），其余显示原值 */
function keyLabel(p) {
  return { frac: 'a/b', sqrt: '√‾' }[p.v] || String(p.v)
}
</script>
