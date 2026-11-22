<template>
  <div class="ix-bj" :data-soc-ix-binary="String(spec.question ? '1' : '')">
    <!-- sgv4（DESIGN §4.1 binary / F1）二元/三元判断按钮组 · 低输入成本认知动作「判断」。
         「x=-1 左边 f'(x) 取正还是取负」这类天然二元判断渲染为按钮组而非文本框
         （R-二元必二元，A2 DOM 级验收锚点 data-sbj-option）。
         交互：单选高亮 → 提交即抛（{choice: 选项id}）；改选 emit('edit')
         （§3.5 数据飞轮：改选次数计入 edit_count 脆弱掌握判据）。
         选项 maps_to 是后端误解映射判定键，前端不渲染不消费（防干扰作答）。 -->
    <div v-if="question" class="ix-bj-q">{{ question }}</div>
    <div v-if="options.length" class="ix-bj-opts" role="radiogroup" :aria-label="question || '判断选择'">
      <button
        v-for="o in options" :key="o.id" type="button" role="radio"
        class="ix-bj-opt" :class="{ picked: picked === o.id }"
        :data-sbj-option="String(o.id)" :aria-pressed="picked === o.id"
        @click="pick(o.id)"
      >
        <span class="ix-bj-key">{{ keyOf(o.id) }}</span>
        <span class="ix-bj-label">{{ o.label || o.id }}</span>
        <span v-if="picked === o.id" class="ix-bj-check">✓</span>
      </button>
    </div>
    <div v-else class="ix-bj-empty">这道判断题的选项还没有就绪——可以直接打字告诉我你的判断</div>
    <div v-if="options.length" class="ix-bj-actions">
      <button type="button" class="ix-submit" :disabled="!picked" @click="submit">就这样判断</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** sgv4 §4.1 binary spec：{question, options:[{id,label,maps_to?}]}（_correct 后端剥离不下发） */
  spec: { type: Object, required: true },
})
// submit：{choice}（判定器查表：命中 _correct→correct；命中 maps_to 项→wrong+该误解）
// edit：改选（已有选中项时再点其他项）——edit_count 脆弱掌握判据（§3.5/R5）
const emit = defineEmits(['submit', 'edit'])

const question = computed(() => String(props.spec?.question || '').trim())
const options = computed(() =>
  (Array.isArray(props.spec?.options) ? props.spec.options : [])
    .filter((o) => o && o.id != null),
)

const picked = ref('')
const pickedEver = ref(false)
function keyOf(id) {
  const i = options.value.findIndex((o) => String(o.id) === String(id))
  return 'ABCDEF'[i] || '•'
}
function pick(id) {
  const k = String(id)
  if (picked.value === k) return
  if (picked.value) emit('edit') // 改选：换选项计一次 edit
  picked.value = k
  pickedEver.value = true
}
function submit() {
  if (!picked.value) return
  emit('submit', { choice: picked.value })
}
</script>

<style scoped>
.ix-bj { font-size: 13px; }
.ix-bj-q { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
.ix-bj-opts { display: flex; flex-wrap: wrap; gap: 8px; }
.ix-bj-opt {
  flex: 1 1 120px; min-width: 96px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 12px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 14.5px; font-weight: 700;
  border: 1.5px solid var(--border); background: var(--bg-white); color: var(--text-primary);
  transition: all .14s; touch-action: manipulation;
}
.ix-bj-opt:hover:not(:disabled) { border-color: #8b5cf6; background: #f5f3ff; }
.ix-bj-opt.picked {
  border-color: #7c3aed; background: #f5f3ff; color: #5b21b6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
}
.ix-bj-key {
  width: 20px; height: 20px; border-radius: 50%; flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; background: #ede9fe; color: #6d28d9;
}
.ix-bj-opt.picked .ix-bj-key { background: #7c3aed; color: #fff; }
.ix-bj-label { flex: 0 1 auto; }
.ix-bj-check { color: #7c3aed; }
.ix-bj-empty { font-size: 12px; color: var(--text-muted); padding: 6px 0; }
.ix-bj-actions { margin-top: 9px; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
