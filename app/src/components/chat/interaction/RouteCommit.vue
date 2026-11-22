<template>
  <div class="ix-route">
    <!-- sgv3（CHAIN-DESIGN §5.5）route_commit 押注路线（wow W3）· 免打字交互形式 9/9
         多解法题 planning 末两条路线押哪条走得通（预测承诺，productive failure 安全版）。
         押注本身不判分（实走后验证）；require_reason 时必跟理由点选（选择题合法用法②：
         低代价承诺+必追问——理由选项 → 心智模型编码，错选入 hypotheses）。 -->
    <div class="ix-rt-tip">🎲 两条都像能走——押一条，待会儿我们就沿着它做，看看你的眼光</div>

    <div class="ix-rt-routes">
      <button
        v-for="(r, i) in routes" :key="r.id" type="button"
        class="ix-rt-route" :class="{ on: wager === r.id }"
        @click="wager = wager === r.id ? '' : r.id"
      >
        <span class="ix-rt-badge">{{ r.id }}</span>
        <span class="ix-rt-body">{{ r.text }}</span>
        <span v-if="wager === r.id" class="ix-rt-mark">我的押注 🎯</span>
      </button>
    </div>

    <!-- 理由必选（R8：押注 choice 必跟理由点选） -->
    <div v-if="needReason && wager" class="ix-rt-reasons">
      <div class="ix-rt-rlabel">为什么押它？选一个理由：</div>
      <button
        v-for="(o, i) in reasonOptions" :key="i" type="button"
        class="ix-rt-reason" :class="{ on: reason === i }"
        @click="reason = reason === i ? null : i"
      >{{ o.text }}</button>
    </div>

    <div class="ix-rt-actions">
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">押定离手</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.5 spec：{routes:[{id,text}], require_reason, reason_options:[{text}]} */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit'])

const routes = computed(() =>
  (Array.isArray(props.spec?.routes) ? props.spec.routes : [])
    .filter((r) => r && r.id != null && r.text)
    .map((r) => ({ id: String(r.id), text: String(r.text) })),
)
const reasonOptions = computed(() =>
  (Array.isArray(props.spec?.reason_options) ? props.spec.reason_options : [])
    .filter((o) => o && o.text)
    .map((o) => ({ text: String(o.text) })),
)
const needReason = computed(() => props.spec?.require_reason === true && reasonOptions.value.length > 0)

const wager = ref('')
const reason = ref(null)
const canSubmit = computed(() => !!wager.value && (!needReason.value || reason.value != null))
function submit() {
  if (!canSubmit.value) return
  const out = { wager: wager.value }
  if (needReason.value) out.reason = reason.value
  emit('submit', out)
}
</script>

<style scoped>
.ix-route { font-size: 13px; }
.ix-rt-tip { font-size: 11.5px; color: var(--text-secondary); margin-bottom: 8px; }
.ix-rt-routes { display: flex; flex-direction: column; gap: 7px; }
.ix-rt-route {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 11px 13px; border-radius: var(--radius-md); cursor: pointer;
  border: 1.5px solid var(--border); background: rgba(255, 255, 255, 0.9); color: var(--text-primary);
  font: inherit; font-size: 13px; line-height: 1.6; transition: all .15s;
}
.ix-rt-route:hover { border-color: #8b5cf6; }
.ix-rt-route.on {
  border-color: #7c3aed; background: linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); font-weight: 600;
}
.ix-rt-badge {
  flex: 0 0 auto; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 800;
  background: #eef2ff; color: #5b5fc7; display: inline-flex; align-items: center; justify-content: center;
}
.ix-rt-route.on .ix-rt-badge { background: #7c3aed; color: #fff; }
.ix-rt-body { flex: 1; min-width: 0; }
.ix-rt-mark { flex: 0 0 auto; font-size: 11px; font-weight: 700; color: #5b21b6; white-space: nowrap; }
.ix-rt-reasons { margin-top: 9px; padding: 8px 10px; border-radius: var(--radius-sm); border: 1px dashed rgba(139, 92, 246, 0.35); background: #faf9ff; }
.ix-rt-rlabel { font-size: 11.5px; color: #6d28d9; font-weight: 700; margin-bottom: 6px; }
.ix-rt-reason {
  display: block; width: 100%; text-align: left; margin-bottom: 5px; padding: 7px 11px;
  border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; line-height: 1.6;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-primary); transition: all .13s;
}
.ix-rt-reason:hover { border-color: #8b5cf6; }
.ix-rt-reason.on { border-color: #7c3aed; background: #ede9fe; font-weight: 700; }
.ix-rt-actions { margin-top: 9px; }
.ix-submit {
  padding: 7px 18px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
