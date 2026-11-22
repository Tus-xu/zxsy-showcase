<template>
  <div class="ix-seq">
    <!-- sgv3（CHAIN-DESIGN §5.4）sequence 步骤排序 / 思路地图 · 免打字交互形式 4/9
         步骤卡排成推理链 + 干扰卡（弯路）显式弃置。判定后端偏序 DAG 确定性
         （拓扑合法∧干扰未选 → complete；误选干扰 → partial+误概念）。
         交互降级纪律：点选卡片 → 「放入下一步 / 标为弯路」两动作（pointer/tap 可用，
         不强依赖 HTML5 DnD——设计 F2 行）。 -->
    <div v-if="note" class="ix-sq-note">🗂 {{ note }}</div>

    <!-- 推理链槽位 -->
    <ol class="ix-sq-slots">
      <li v-for="(id, si) in order" :key="si" class="ix-sq-slot">
        <span class="ix-sq-no">{{ si + 1 }}</span>
        <span class="ix-sq-txt">{{ cardText(id) }}</span>
        <button type="button" class="ix-sq-x" title="移出这一步" @click="removeAt(si)">✕</button>
      </li>
      <li v-for="si in emptySlots" :key="'e' + si" class="ix-sq-slot empty"><span class="ix-sq-no">{{ order.length + si + 1 }}</span><span class="ix-sq-txt muted">待放入</span></li>
    </ol>

    <!-- 卡池 -->
    <div class="ix-sq-pool">
      <div v-if="picked" class="ix-sq-tip">
        「{{ picked.text }}」——
        <button type="button" class="ix-sq-mini primary" :disabled="!order.length && !slots" @click="appendPicked">↓ 放入下一步</button>
        <button type="button" class="ix-sq-mini warn" @click="discardPicked">🚫 这是弯路</button>
      </div>
      <div class="ix-sq-cards">
        <button
          v-for="c in poolCards" :key="c.id" type="button"
          class="ix-sq-card" :class="{ picked: picked && picked.id === c.id }"
          @click="picked = picked && picked.id === c.id ? null : c"
        >{{ c.text }}</button>
        <div v-if="!poolCards.length && !discards.length" class="ix-sq-empty">卡片都排完了</div>
      </div>
    </div>

    <!-- 弯路弃置区（干扰卡） -->
    <div v-if="discards.length" class="ix-sq-discards">
      <div class="ix-sq-dlabel">🚫 弯路区（不放进修题步骤）</div>
      <button v-for="id in discards" :key="id" type="button" class="ix-sq-dcard" title="点一下放回卡池" @click="undiscard(id)">{{ cardText(id) }} <span class="ix-sq-undo">↩︎</span></button>
    </div>

    <div class="ix-sq-actions">
      <span class="ix-sq-progress">{{ order.length }}/{{ slots }} 步已排</span>
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">排好了，交给你看</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.4 spec：{cards:[{id,text}], slots, note} */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit'])

const cards = computed(() =>
  (Array.isArray(props.spec?.cards) ? props.spec.cards : [])
    .filter((c) => c && c.id != null && c.text)
    .map((c) => ({ id: String(c.id), text: String(c.text) })),
)
const slots = computed(() => {
  const n = Number(props.spec?.slots)
  if (Number.isFinite(n) && n > 0) return Math.min(n, cards.value.length)
  return cards.value.length
})
const note = computed(() => String(props.spec?.note || '').trim())

const order = ref([]) // 卡 id 序列
const discards = ref([]) // 显式弃置的卡 id
const picked = ref(null)
const poolCards = computed(() => cards.value.filter((c) => !order.value.includes(c.id) && !discards.value.includes(c.id)))
const cardText = (id) => cards.value.find((c) => c.id === id)?.text || id
const emptySlots = computed(() => Math.max(0, slots.value - order.value.length))

function appendPicked() {
  if (!picked.value || order.value.length >= slots.value) return
  order.value = [...order.value, picked.value.id]
  picked.value = null
}
function discardPicked() {
  if (!picked.value) return
  discards.value = [...discards.value, picked.value.id]
  picked.value = null
}
function undiscard(id) {
  discards.value = discards.value.filter((d) => d !== id)
}
function removeAt(si) {
  order.value = order.value.filter((_, i) => i !== si)
}
const canSubmit = computed(() => slots.value > 0 && order.value.length === slots.value)
function submit() {
  if (!canSubmit.value) return
  emit('submit', { order: [...order.value], excluded: [...discards.value] })
}
</script>

<style scoped>
.ix-seq { font-size: 13px; }
.ix-sq-note { font-size: 11.5px; color: var(--text-secondary); margin-bottom: 7px; }
.ix-sq-slots { list-style: none; margin: 0 0 9px; padding: 6px 8px; border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.7); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 5px; min-height: 36px; }
.ix-sq-slot { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: #f5f3ff; border: 1px solid rgba(139, 92, 246, 0.25); font-size: 12.5px; }
.ix-sq-slot.empty { background: transparent; border-style: dashed; border-color: var(--border); }
.ix-sq-no { flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; background: #7c3aed; color: #fff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.ix-sq-slot.empty .ix-sq-no { background: #cbd5e1; }
.ix-sq-txt { flex: 1; min-width: 0; color: var(--text-primary); }
.ix-sq-txt.muted { color: var(--text-muted); font-style: italic; }
.ix-sq-x { flex: 0 0 auto; border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 2px 4px; border-radius: 4px; }
.ix-sq-x:hover { color: #dc2626; background: rgba(220, 38, 38, 0.08); }
.ix-sq-pool { margin-bottom: 8px; }
.ix-sq-tip { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 12px; color: #6d28d9; margin-bottom: 6px; }
.ix-sq-mini { padding: 4px 10px; border-radius: 999px; cursor: pointer; font-size: 11.5px; font-weight: 700; border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary); }
.ix-sq-mini.primary { border-color: #7c3aed; background: #ede9fe; color: #5b21b6; }
.ix-sq-mini.warn { border-color: rgba(217, 119, 6, 0.4); background: #fffbeb; color: #b45309; }
.ix-sq-mini:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-sq-cards { display: flex; flex-wrap: wrap; gap: 6px; }
.ix-sq-card {
  padding: 7px 12px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-primary); transition: all .14s;
}
.ix-sq-card:hover { border-color: #8b5cf6; background: #f5f3ff; }
.ix-sq-card.picked { border-color: #7c3aed; background: #ede9fe; font-weight: 700; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); }
.ix-sq-empty { font-size: 12px; color: var(--text-muted); }
.ix-sq-discards { padding: 7px 9px; border-radius: var(--radius-sm); border: 1px dashed rgba(217, 119, 6, 0.35); background: rgba(255, 251, 235, 0.6); margin-bottom: 8px; }
.ix-sq-dlabel { font-size: 11px; color: #b45309; font-weight: 700; margin-bottom: 5px; }
.ix-sq-dcard {
  display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; margin: 0 5px 5px 0;
  border-radius: var(--radius-md); cursor: pointer; font-size: 12px; text-decoration: line-through;
  border: 1px solid rgba(217, 119, 6, 0.3); background: #fff; color: #92400e;
}
.ix-sq-undo { text-decoration: none; }
.ix-sq-actions { display: flex; align-items: center; gap: 10px; }
.ix-sq-progress { font-size: 11px; color: var(--text-muted); }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
