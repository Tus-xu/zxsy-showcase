<template>
  <div class="ix-nl" :data-nl-mode="mode">
    <!-- sgv4（DESIGN §4.1 numline / F2）数轴标注 · 认知动作「标注」。
         mode=sign：点选区间段 + 正/负/零 上色（R-区间答案不让学生打字：解集/符号表一律数轴）；
         mode=drag：驻点/零点拖放定位（指针拖动 + ◀▶ 微调按钮，容差判定在后端）。
         提交 payload：sign → {segments:[{from,to,sign}]}；drag → {drops:[{id,x}]}。
         操作（上色/拖放/微调）均 emit('edit')（§3.5 数据飞轮）。
         _segments 判定答案后端剥离不下发（strip_private 纪律）；全字段防御判空。 -->
    <div v-if="promptText" class="ix-nl-prompt">{{ promptText }}</div>

    <!-- ===== sign 模式：数轴 + 可上色区间段 ===== -->
    <template v-if="mode === 'sign' && axisOk">
      <svg class="ix-nl-svg" viewBox="0 0 100 34" preserveAspectRatio="xMidYMid meet" role="img" aria-label="数轴符号标注">
        <!-- 符号色带（已标注段：+ 蓝在上 / − 红在下 / 0 灰贴线） -->
        <g v-for="seg in markedSegs" :key="'m' + seg.key">
          <rect v-if="seg.sign === 'pos'" :x="seg.px0" y="4" :width="seg.pw" height="6" rx="1.5" class="nl-band pos" />
          <rect v-else-if="seg.sign === 'neg'" :x="seg.px0" y="24" :width="seg.pw" height="6" rx="1.5" class="nl-band neg" />
          <circle v-else :cx="(seg.px0 + seg.px1) / 2" cy="17" r="2.6" class="nl-band zero" />
        </g>
        <!-- 主轴线 -->
        <line x1="2" y1="17" x2="98" y2="17" class="nl-axis" />
        <!-- 断点刻度（axis.points + 两端） -->
        <g v-for="bp in breakpoints" :key="'bp' + bp.v">
          <line :x1="bp.px" y1="13" :x2="bp.px" y2="21" class="nl-tick" />
          <text :x="bp.px" y="31" class="nl-ticklabel">{{ bp.label }}</text>
        </g>
        <!-- 可点选区间段（命中层） -->
        <g
          v-for="seg in segs" :key="seg.key" class="nl-seg"
          :class="{ marked: !!segSigns[seg.key], active: activeSegKey === seg.key }" :data-nl-seg="seg.key"
          @click="onSegClick(seg)"
        >
          <rect :x="seg.px0" y="8" :width="seg.pw" height="18" class="nl-hit" />
          <text v-if="seg.sign === 'pos'" :x="(seg.px0 + seg.px1) / 2" y="14.5" class="nl-signlabel pos">+</text>
          <text v-else-if="seg.sign === 'neg'" :x="(seg.px0 + seg.px1) / 2" y="20" class="nl-signlabel neg">−</text>
        </g>
      </svg>
      <!-- 符号调色：选中段后点符号上色（提示当前选中段） -->
      <div class="ix-nl-palette">
        <span class="ix-nl-selinfo">{{ selInfo }}</span>
        <button type="button" class="nl-signbtn pos" data-nl-sign="pos" :disabled="!activeSeg" @click="assignSign('pos')">＋ 正</button>
        <button type="button" class="nl-signbtn neg" data-nl-sign="neg" :disabled="!activeSeg" @click="assignSign('neg')">− 负</button>
        <!-- sign 模式不提供整段「0 为零」：根点 0 由系统标注，整段涂 0 是数学错误动作 -->
        <button type="button" class="nl-signbtn clear" :disabled="!activeSeg" @click="assignSign('')">清除</button>
      </div>
    </template>

    <!-- ===== drag 模式：拖放定位 + 微调按钮 ===== -->
    <template v-else-if="mode === 'drag' && axisOk && targets.length">
      <svg
        ref="dragSvgRef" class="ix-nl-svg" viewBox="0 0 100 34" preserveAspectRatio="xMidYMid meet"
        role="img" aria-label="数轴拖放定位"
        @pointermove="onDragMove" @pointerup="onDragEnd" @pointerleave="onDragEnd"
      >
        <line x1="2" y1="17" x2="98" y2="17" class="nl-axis" />
        <g v-for="bp in breakpoints" :key="'bp' + bp.v">
          <line :x1="bp.px" y1="13" :x2="bp.px" y2="21" class="nl-tick" />
          <text :x="bp.px" y="31" class="nl-ticklabel">{{ bp.label }}</text>
        </g>
        <!-- 拖放点（拖动中的高亮） -->
        <g
          v-for="t in dropMarkers" :key="t.id" class="nl-drop"
          :class="{ active: draggingId === t.id }" :data-nl-drop="String(t.id)"
          @pointerdown.stop.prevent="onDragStart(t.id, $event)"
        >
          <circle :cx="t.px" cy="17" r="4.2" class="nl-drop-hit" />
          <circle :cx="t.px" cy="17" r="2.4" class="nl-drop-dot" />
          <text :x="t.px" y="9.5" class="nl-droplabel">{{ t.label || t.id }}</text>
        </g>
      </svg>
      <!-- 微调按钮（触屏/键盘可达；jsdom 测试走此确定性路径） -->
      <div v-for="t in targets" :key="'n' + t.id" class="ix-nl-nudge">
        <span class="ix-nl-nudge-name">{{ t.label || t.id }}</span>
        <button type="button" class="nl-nudge-btn" :data-nl-nudge="`l:${t.id}`" @click="nudge(t.id, -1)">◀</button>
        <span class="ix-nl-nudge-val">{{ fmtNum(dropX[t.id]) }}</span>
        <button type="button" class="nl-nudge-btn" :data-nl-nudge="`r:${t.id}`" @click="nudge(t.id, 1)">▶</button>
      </div>
      <div class="ix-nl-tip">拖动圆点或用 ◀▶ 微调，把每个点放到你估计的位置</div>
    </template>

    <!-- ===== 防御降级：axis 缺失/无目标（历史数据/物料 fail-open）绝不白屏 ===== -->
    <div v-else class="ix-nl-empty">这道标注题的数轴还没有就绪——可以直接打字告诉我你的答案</div>

    <div class="ix-nl-actions">
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">
        {{ mode === 'sign' ? '标好了' : '放好了' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** sgv4 §4.1 numline spec：mode=sign → {axis:{min,max,points}, prompt}；
   *  mode=drag → {axis, targets:[{id,x,label?}]}（tol/_segments 后端留作判定/剥离） */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit', 'edit'])

const mode = computed(() => (String(props.spec?.mode || '').trim() === 'drag' ? 'drag' : 'sign'))
const promptText = computed(() => String(props.spec?.prompt || '').trim())

/* ===== 数轴几何：min/max + 断点刻度 → viewBox 100x34 映射（pad 2 防裁切） ===== */
const axis = computed(() => {
  const a = props.spec?.axis && typeof props.spec.axis === 'object' ? props.spec.axis : {}
  let min = Number(a.min)
  let max = Number(a.max)
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) { min = -5; max = 5 }
  const points = (Array.isArray(a.points) ? a.points : [])
    .map((p) => Number(p)).filter((p) => Number.isFinite(p) && p > min && p < max)
  return { min, max, points: [...new Set(points)].sort((x, y) => x - y) }
})
const hasAxis = computed(() => !!(props.spec?.axis && typeof props.spec.axis === 'object'))
const axisOk = computed(() => hasAxis.value && Number.isFinite(axis.value.min))
const px = (v) => 2 + ((v - axis.value.min) / (axis.value.max - axis.value.min)) * 96
const fmtNum = (v) => (Number.isFinite(Number(v)) ? String(Math.round(Number(v) * 100) / 100) : '—')
const fmtTick = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100))
const breakpoints = computed(() => {
  const vals = [axis.value.min, ...axis.value.points, axis.value.max]
  return vals.map((v) => ({ v, px: px(v), label: fmtTick(v) }))
})

/* ===== sign 模式：断点切出区间段；点击选段 → 符号上色 ===== */
const segs = computed(() => {
  const vals = [axis.value.min, ...axis.value.points, axis.value.max]
  const out = []
  for (let i = 0; i < vals.length - 1; i++) {
    out.push({
      key: `${fmtTick(vals[i])}:${fmtTick(vals[i + 1])}`,
      from: vals[i],
      to: vals[i + 1],
      px0: px(vals[i]),
      px1: px(vals[i + 1]),
      pw: Math.max(1, px(vals[i + 1]) - px(vals[i])),
      sign: '',
    })
  }
  return out
})
const segSigns = ref({}) // {segKey: 'pos'|'neg'|'zero'}
const activeSegKey = ref('')
const markedSegs = computed(() =>
  segs.value
    .filter((s) => segSigns.value[s.key])
    .map((s) => ({ ...s, sign: segSigns.value[s.key], pw: Math.max(2, s.pw) })),
)
const activeSeg = computed(() => segs.value.find((s) => s.key === activeSegKey.value) || null)
const selInfo = computed(() => {
  if (!activeSeg.value) return '先点选一段区间'
  return `已选 (${fmtTick(activeSeg.value.from)}, ${fmtTick(activeSeg.value.to)})${segSigns.value[activeSegKey.value] ? ' · 可改标或清除' : ''}`
})
function onSegClick(seg) {
  if (activeSegKey.value !== seg.key) activeSegKey.value = seg.key
  else if (!segSigns.value[seg.key]) activeSegKey.value = '' // 再点已选未标段 → 取消选中
  else activeSegKey.value = seg.key
}
function assignSign(sign) {
  if (!activeSeg.value) return
  if (sign) {
    if (segSigns.value[activeSegKey.value] !== sign) emit('edit')
    segSigns.value = { ...segSigns.value, [activeSegKey.value]: sign }
  } else {
    if (segSigns.value[activeSegKey.value]) emit('edit')
    const next = { ...segSigns.value }
    delete next[activeSegKey.value]
    segSigns.value = next
  }
}

/* ===== drag 模式：初始位 → 拖放/微调；拖放/微调各计一次 edit ===== */
const targets = computed(() =>
  (Array.isArray(props.spec?.targets) ? props.spec.targets : [])
    .filter((t) => t && t.id != null)
    .map((t) => ({ ...t, x: Number(t.x) })),
)
const dropX = ref({})
const touched = ref(false)
// 初始化：公开 targets 不含答案坐标；没有 x 时放在轴 20% 处。
// 后端 require_moved 会拒绝「未拖动直接提交」，防不动即对。
for (const t of targets.value) {
  const fallback = axis.value.min + (axis.value.max - axis.value.min) * 0.2
  dropX.value[t.id] = Number.isFinite(t.x) ? t.x : fallback
}
const dropMarkers = computed(() =>
  targets.value.map((t) => {
    const x = Number.isFinite(Number(dropX.value[t.id])) ? Number(dropX.value[t.id]) : axis.value.min
    const clamped = Math.min(axis.value.max, Math.max(axis.value.min, x))
    return { ...t, x: clamped, px: px(clamped) }
  }),
)
const draggingId = ref('')
const dragSvgRef = ref(null)
function onDragStart(id, evt) {
  draggingId.value = String(id)
  evt.currentTarget?.setPointerCapture?.(evt.pointerId)
}
function onDragMove(evt) {
  if (!draggingId.value) return
  const host = dragSvgRef.value
  if (!host) return
  const rect = host.getBoundingClientRect()
  if (!rect.width) return
  const ratio = Math.min(1, Math.max(0, (evt.clientX - rect.left) / rect.width))
  const x = axis.value.min + ratio * (axis.value.max - axis.value.min)
  if (Math.abs(x - Number(dropX.value[draggingId.value])) > 1e-9) {
    dropX.value = { ...dropX.value, [draggingId.value]: x }
    touched.value = true
  }
}
function onDragEnd() {
  if (draggingId.value) {
    emit('edit') // 一次拖放（含点击落点）计一次 edit
    draggingId.value = ''
  }
}
function nudge(id, dir) {
  const span = axis.value.max - axis.value.min
  const step = Number(props.spec?.step) > 0 ? Number(props.spec.step) : Math.max(span / 50, 0.1)
  const cur = Number(dropX.value[id]) || 0
  const next = Math.min(axis.value.max, Math.max(axis.value.min, cur + dir * step))
  if (next === cur) return
  dropX.value = { ...dropX.value, [id]: next }
  emit('edit')
}

/* ===== 提交 ===== */
const canSubmit = computed(() =>
  mode.value === 'sign'
    ? segs.value.length > 0 && segs.value.every((s) => !!segSigns.value[s.key])
    : dropMarkers.value.length > 0,
)
function submit() {
  if (!canSubmit.value) return
  if (mode.value === 'sign') {
    const segments = segs.value
      .filter((s) => segSigns.value[s.key])
      .map((s) => ({ from: s.from, to: s.to, sign: segSigns.value[s.key] }))
    emit('submit', { segments })
  } else {
    const drops = dropMarkers.value.map((t) => ({ id: t.id, x: Math.round(t.x * 100) / 100 }))
    emit('submit', { drops, moved: touched.value })
  }
}
</script>

<style scoped>
.ix-nl { font-size: 13px; }
.ix-nl-prompt { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.ix-nl-svg { width: 100%; height: auto; display: block; background: rgba(255, 255, 255, 0.9); border: 1px solid var(--border); border-radius: var(--radius-sm); }
.nl-axis { stroke: #64748b; stroke-width: 0.6; }
.nl-tick { stroke: #94a3b8; stroke-width: 0.5; }
.nl-ticklabel { font-size: 4.2px; fill: #64748b; text-anchor: middle; }
/* sign 模式 */
.nl-hit { fill: rgba(148, 163, 184, 0.08); stroke: rgba(148, 163, 184, 0.45); stroke-dasharray: 3 3; cursor: pointer; }
.nl-seg.marked .nl-hit { fill: rgba(139, 92, 246, 0.08); }
.nl-seg:hover .nl-hit { fill: rgba(139, 92, 246, 0.16); }
.nl-seg.active .nl-hit { fill: rgba(139, 92, 246, 0.2); stroke: #7c3aed; stroke-width: 1.2; stroke-dasharray: none; }
.nl-band.pos { fill: rgba(37, 99, 235, 0.55); }
.nl-band.neg { fill: rgba(220, 38, 38, 0.55); }
.nl-band.zero { fill: #64748b; }
.nl-signlabel { font-size: 6.5px; font-weight: 700; text-anchor: middle; pointer-events: none; }
.nl-signlabel.pos { fill: #1d4ed8; }
.nl-signlabel.neg { fill: #b91c1c; }
.ix-nl-palette { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 7px; }
.ix-nl-selinfo { font-size: 11.5px; color: var(--text-muted); margin-right: auto; }
.nl-signbtn {
  padding: 6px 12px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1.5px solid var(--border); background: var(--bg-white); color: var(--text-primary); transition: all .13s;
}
.nl-signbtn:disabled { opacity: 0.4; cursor: not-allowed; }
.nl-signbtn.pos:hover:not(:disabled) { border-color: #2563eb; color: #1d4ed8; background: #eff6ff; }
.nl-signbtn.neg:hover:not(:disabled) { border-color: #dc2626; color: #b91c1c; background: #fef2f2; }
.nl-signbtn.zero:hover:not(:disabled) { border-color: #64748b; }
.nl-signbtn.clear { font-weight: 500; color: var(--text-muted); }
/* drag 模式 */
.nl-drop { cursor: grab; }
.nl-drop.active { cursor: grabbing; }
.nl-drop-hit { fill: rgba(139, 92, 246, 0.16); stroke: #7c3aed; stroke-width: 0.5; }
.nl-drop.active .nl-drop-hit { fill: rgba(139, 92, 246, 0.34); }
.nl-drop-dot { fill: #7c3aed; }
.nl-droplabel { font-size: 4.6px; fill: #6d28d9; text-anchor: middle; font-weight: 700; }
.ix-nl-nudge { display: inline-flex; align-items: center; gap: 6px; margin: 7px 14px 0 0; }
.ix-nl-nudge-name { font-size: 11.5px; font-weight: 700; color: #6d28d9; }
.nl-nudge-btn {
  padding: 4px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary);
}
.nl-nudge-btn:hover { border-color: #8b5cf6; color: #6d28d9; }
.ix-nl-nudge-val { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-primary); min-width: 34px; text-align: center; }
.ix-nl-tip { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.ix-nl-empty { font-size: 12px; color: var(--text-muted); padding: 6px 0; }
.ix-nl-actions { margin-top: 9px; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
