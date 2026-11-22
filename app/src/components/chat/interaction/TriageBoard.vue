<template>
  <div class="ix-triage">
    <!-- sgv3（CHAIN-DESIGN §5.2）triage 条件分拣 · 免打字交互形式 2/9
         题干短语卡分进「已知 / 要求 / 无关」三栏；truth 标注不下发前端，
         判定在后端逐卡确定性（goal 放错 → 重误概念）。
         交互：点选卡片 → 点目标栏放入（拖拽降级为两次点选，不依赖 HTML5 DnD）；
         pre_sorted = tier T0 示范位（预放「已知」栏并锁定，fading 首段）。 -->
    <!-- 待分拣卡池 -->
    <div class="ix-tr-pool" :class="{ empty: !poolCards.length }">
      <template v-if="poolCards.length">
        <div v-if="picked" class="ix-tr-tip">点下方一个栏，把「{{ picked.text }}」放进去</div>
        <button
          v-for="c in poolCards" :key="c.id" type="button"
          class="ix-tr-card" :class="{ picked: picked && picked.id === c.id }"
          @click="picked = picked && picked.id === c.id ? null : c"
        >{{ c.text }}</button>
      </template>
      <div v-else class="ix-tr-done">全部卡片都分完了 👇</div>
    </div>

    <!-- 三栏 -->
    <div class="ix-tr-bins">
      <div
        v-for="b in bins" :key="b" class="ix-tr-bin" :class="{ target: !!picked }"
        @click="dropInto(b)"
      >
        <div class="ix-tr-bin-head">{{ b }}<span class="ix-tr-bin-n">{{ inBin(b).length }}</span></div>
        <button
          v-for="c in inBin(b)" :key="c.id" type="button"
          class="ix-tr-bincard" :class="{ locked: c.locked }"
          :disabled="c.locked"
          :title="c.locked ? '示范卡：老师先放好一张给你看' : '点一下放回卡池'"
          @click.stop="backToPool(c)"
        >
          {{ c.text }}<span v-if="c.locked" class="ix-tr-lock">示范</span>
        </button>
      </div>
    </div>

    <div class="ix-tr-actions">
      <span class="ix-tr-progress">{{ assignedCount }}/{{ sortableCards.length }} 已分拣</span>
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">分拣完成，交给你看</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.2 spec：{cards:[{id,text}], bins:[...], pre_sorted:[id...]} */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit'])

const DEFAULT_BINS = ['已知', '要求', '无关']
const cards = computed(() =>
  (Array.isArray(props.spec?.cards) ? props.spec.cards : [])
    .filter((c) => c && c.id != null && c.text)
    .map((c) => ({ id: String(c.id), text: String(c.text) })),
)
const bins = computed(() => {
  const b = Array.isArray(props.spec?.bins) ? props.spec.bins.filter(Boolean) : []
  return b.length ? b : DEFAULT_BINS
})
const preSorted = computed(() =>
  (Array.isArray(props.spec?.pre_sorted) ? props.spec.pre_sorted : []).map((v) => String(v)),
)

// 归一化分拣状态：id -> bin 名；pre_sorted 锁定在首栏（示范位，CHAIN-DESIGN §3.2 T0 fading）
const lockedSet = computed(() => new Set(preSorted.value))
const assignment = ref({})
// 初始化示范卡（幂等：仅空态时放置）
function initPreSorted() {
  for (const id of lockedSet.value) {
    if (!(id in assignment.value)) assignment.value = { ...assignment.value, [id]: bins.value[0] }
  }
}
initPreSorted()

const sortableCards = computed(() => cards.value.filter((c) => !lockedSet.value.has(c.id)))
const poolCards = computed(() => sortableCards.value.filter((c) => !(c.id in assignment.value)))
const picked = ref(null)
function inBin(bin) {
  return cards.value
    .filter((c) => assignment.value[c.id] === bin)
    .map((c) => ({ ...c, locked: lockedSet.value.has(c.id) }))
}
function dropInto(bin) {
  if (!picked.value) return
  assignment.value = { ...assignment.value, [picked.value.id]: bin }
  picked.value = null
}
function backToPool(c) {
  if (c.locked) return
  const next = { ...assignment.value }
  delete next[c.id]
  assignment.value = next
}
const assignedCount = computed(() => sortableCards.value.filter((c) => c.id in assignment.value).length)
const canSubmit = computed(() => sortableCards.value.length > 0 && assignedCount.value === sortableCards.value.length)
function submit() {
  if (!canSubmit.value) return
  const out = {}
  for (const [id, bin] of Object.entries(assignment.value)) out[id] = bin
  emit('submit', { assignment: out })
}
</script>

<style scoped>
.ix-triage { font-size: 13px; }
.ix-tr-pool { min-height: 40px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ix-tr-pool.empty { padding: 8px 0; }
.ix-tr-tip { width: 100%; font-size: 11px; color: #6d28d9; margin-bottom: 2px; }
.ix-tr-card {
  padding: 7px 12px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-primary);
  transition: all .14s;
}
.ix-tr-card:hover { border-color: #8b5cf6; background: #f5f3ff; }
.ix-tr-card.picked { border-color: #7c3aed; background: #ede9fe; font-weight: 700; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); }
.ix-tr-done { font-size: 12px; color: var(--text-muted); }
.ix-tr-bins { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 9px; }
.ix-tr-bin {
  border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 7px;
  min-height: 74px; background: rgba(255, 255, 255, 0.6); transition: border-color .14s;
  display: flex; flex-direction: column; gap: 5px;
}
.ix-tr-bin.target { border-color: #8b5cf6; cursor: pointer; }
.ix-tr-bin-head { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); display: flex; justify-content: space-between; }
.ix-tr-bin-n { color: var(--text-muted); font-weight: 400; }
.ix-tr-bincard {
  padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 11.5px; text-align: left;
  border: 1px solid rgba(139, 92, 246, 0.25); background: #f5f3ff; color: #4c1d95;
  display: flex; align-items: center; justify-content: space-between; gap: 4px;
}
.ix-tr-bincard.locked { opacity: 0.75; cursor: default; }
.ix-tr-lock { font-size: 9.5px; color: #b45309; background: #fef3c7; border-radius: 999px; padding: 0 5px; flex: 0 0 auto; }
.ix-tr-actions { display: flex; align-items: center; gap: 10px; margin-top: 9px; }
.ix-tr-progress { font-size: 11px; color: var(--text-muted); }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
@media (max-width: 560px) { .ix-tr-bins { grid-template-columns: 1fr; } }
</style>
