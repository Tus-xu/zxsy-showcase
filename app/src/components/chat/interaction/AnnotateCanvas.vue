<template>
  <div class="ix-annotate" :data-ix-mode="mode">
    <!-- sgv3（CHAIN-DESIGN §5.1）annotate 圈点标注 · 免打字交互形式 1/9
         三模式：tokens 题干划选（点选/拖选区间）/ figure 图上点选（SVG 数学坐标系命中点）/
         lasso 原题照片框选（pointer events 矩形选区）。
         纯展示组件：状态本地、提交即抛；targets 标准答案不下发前端（防作弊纪律），
         判定在后端 judge_annotate（F1≥0.9 → complete）。全字段防御判空。 -->
    <!-- 任务说明（targets_hint：引导圈哪类信息，不含答案位置） -->
    <div v-if="hintText" class="ix-an-hint">{{ hintText }}</div>

    <!-- ============ tokens 模式：题干分词划选 ============ -->
    <div v-if="mode === 'tokens'" class="ix-an-tokens" @pointerup="onUp($event)">
      <span
        v-for="(tk, i) in tokens"
        :key="i"
        class="ix-an-tok"
        :class="{
          sel: hitToken(i),
          preview: previewRange && i >= previewRange[0] && i <= previewRange[1],
        }"
        @pointerdown="anchorIdx = i"
        @pointerenter="dragIdx = i"
        @pointerup.stop="onUp($event, i)"
      >{{ tk }}</span>
    </div>
    <div v-if="mode === 'tokens'" class="ix-an-count">
      已圈 {{ selectedRanges.length }} 处<template v-if="nExpected"> · 建议至少 {{ nExpected }} 处</template>
    </div>

    <!-- ============ figure 模式：图上点选关键对象 ============ -->
    <template v-if="mode === 'figure'">
      <div v-if="figRanges" class="ix-an-figwrap">
        <svg class="ix-an-fig" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet" role="img" aria-label="图上点选">
          <!-- 坐标轴（x 轴 y=0 / y 轴 x=0，若在范围内） -->
          <line v-if="hAxisY !== null" x1="0" :y1="hAxisY" x2="100" :y2="hAxisY" class="ix-an-axis" />
          <line v-if="vAxisX !== null" :x1="vAxisX" y1="0" :x2="vAxisX" y2="80" class="ix-an-axis" />
          <!-- 命中点（后端算好数学坐标+半径下发） -->
          <g v-for="r in regions" :key="r.id" class="ix-an-region" :class="{ picked: pickedRegions.includes(r.id) }" @click="toggleRegion(r.id)">
            <circle :cx="px(r.x)" :cy="py(r.y)" :r="hitR(r)" class="ix-an-hit" />
            <circle :cx="px(r.x)" :cy="py(r.y)" r="1.1" class="ix-an-dot" />
            <text v-if="r.label" :x="px(r.x) + 3" :y="py(r.y) - 2.5" class="ix-an-rlabel">{{ r.label }}</text>
          </g>
        </svg>
        <div class="ix-an-count">已点 {{ pickedRegions.length }} 个关键对象</div>
      </div>
      <!-- 降级：坐标系范围缺失（历史数据/物料 fail-open）→ 点选按钮组，绝不白屏 -->
      <div v-else class="ix-an-regionlist">
        <button
          v-for="r in regions" :key="r.id" type="button"
          class="ix-an-regionbtn" :class="{ picked: pickedRegions.includes(r.id) }"
          @click="toggleRegion(r.id)"
        >
          <span class="ix-an-rb-dot">◉</span>{{ r.label || r.kind || r.id }}
        </button>
        <div v-if="!regions.length" class="ix-an-empty">这张图暂没有可点选的标注点</div>
      </div>
    </template>

    <!-- ============ lasso 模式：原题照片框选 ============ -->
    <div v-if="mode === 'lasso'" class="ix-an-imgwrap" @pointerdown="lassoStart" @pointermove="lassoMove" @pointerup="lassoEnd" @pointerleave="lassoEnd">
      <img v-if="imageUrl" :src="imageUrl" class="ix-an-img" alt="原题图片" draggable="false" @load="imgReady = true" />
      <div v-else class="ix-an-empty">题目图片加载中或已过期——可以改用打字告诉我条件</div>
      <!-- 已确认选区（归一化 bbox 渲染） -->
      <div
        v-for="(b, bi) in lassoBoxes" :key="bi" class="ix-an-lasso"
        :style="{ left: b[0] * 100 + '%', top: b[1] * 100 + '%', width: b[2] * 100 + '%', height: b[3] * 100 + '%' }"
      >
        <button type="button" class="ix-an-lasso-x" title="删掉这个圈" @click.stop="lassoBoxes.splice(bi, 1)">✕</button>
      </div>
      <!-- 拖拽中的预览框 -->
      <div
        v-if="lassoDraft" class="ix-an-lasso drafting"
        :style="{ left: lassoDraft[0] * 100 + '%', top: lassoDraft[1] * 100 + '%', width: lassoDraft[2] * 100 + '%', height: lassoDraft[3] * 100 + '%' }"
      ></div>
      <div class="ix-an-lasso-tip">在图上按住拖一个框，把题目告诉你的条件圈出来（可圈多处）</div>
    </div>

    <div class="ix-an-actions">
      <button type="button" class="ix-submit" :disabled="!canSubmit" @click="submit">{{ submitLabel }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** CHAIN-DESIGN §5.1 spec：{mode, canvas{...}, targets_hint, n_expected} */
  spec: { type: Object, required: true },
})
const emit = defineEmits(['submit'])

/* ===== 模式推断：spec.mode 显式优先，缺省按 canvas.type（防御旧数据） ===== */
const canvas = computed(() => props.spec?.canvas || {})
const mode = computed(() => {
  const m = String(props.spec?.mode || '').trim()
  if (m) return m
  return String(canvas.value.type || 'tokens')
})
const hintText = computed(() => {
  const h = Array.isArray(props.spec?.targets_hint) ? props.spec.targets_hint.filter(Boolean) : []
  if (h.length) return `圈出：${h.join(' / ')}`
  return ''
})
const nExpected = computed(() => Number(props.spec?.n_expected) || 0)

/* ===== tokens 划选：区间集合 [[a,b],...]（闭区间，token 下标） ===== */
const tokens = computed(() => (Array.isArray(canvas.value.tokens) ? canvas.value.tokens.map((t) => String(t ?? '')) : []))
const selectedRanges = ref([]) // [[a,b], ...]
const anchorIdx = ref(-1)
const dragIdx = ref(-1)
const previewRange = computed(() => {
  if (anchorIdx.value < 0) return null
  const end = dragIdx.value >= 0 ? dragIdx.value : anchorIdx.value
  return [Math.min(anchorIdx.value, end), Math.max(anchorIdx.value, end)]
})
function hitToken(i) {
  return selectedRanges.value.some(([a, b]) => i >= a && i <= b)
}
/** 区间 toggle：与既有某区间重叠 → 删除该区间；否则并入（合并相邻重叠段） */
function toggleRange([a, b]) {
  const list = selectedRanges.value.filter(([x, y]) => !(a <= y && x <= b)) // 删重叠
  list.push([a, b])
  list.sort((r1, r2) => r1[0] - r2[0])
  // 合并相邻
  const merged = []
  for (const r of list) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  selectedRanges.value = merged
}
function onUp(evt, upIdx) {
  if (anchorIdx.value < 0) return
  const end = upIdx ?? anchorIdx.value
  const range = [Math.min(anchorIdx.value, end), Math.max(anchorIdx.value, end)]
  anchorIdx.value = -1
  dragIdx.value = -1
  if (range[0] === range[1]) {
    // 单 token 点击：toggle
    if (hitToken(range[0])) {
      selectedRanges.value = selectedRanges.value.filter(([a, b]) => !(range[0] >= a && range[0] <= b))
    } else toggleRange(range)
  } else toggleRange(range)
}

/* ===== figure 点选：数学坐标 → viewBox 100x80（pad 8% 防边缘点裁切） ===== */
const regions = computed(() =>
  (Array.isArray(canvas.value.hit_regions) ? canvas.value.hit_regions : [])
    .filter((r) => r && r.id != null)
    .map((r) => ({ ...r, x: Number(r.x), y: Number(r.y), radius: Number(r.radius) || 0 }),
    ),
)
const figRanges = computed(() => {
  const fp = canvas.value.figure_params || {}
  const xr = fp.x_range || fp.xrange || (fp.xmin != null && fp.xmax != null ? [Number(fp.xmin), Number(fp.xmax)] : null)
  const yr = fp.y_range || fp.yrange || (fp.ymin != null && fp.ymax != null ? [Number(fp.ymin), Number(fp.ymax)] : null)
  if (!Array.isArray(xr) || !Array.isArray(yr) || xr.length < 2 || yr.length < 2) return null
  const [x0, x1] = [Number(xr[0]), Number(xr[1])]
  const [y0, y1] = [Number(yr[0]), Number(yr[1])]
  if (![x0, x1, y0, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) return null
  return { x0, x1, y0, y1 }
})
const PAD = 0.08
const sx = computed(() => {
  const r = figRanges.value
  if (!r) return null
  const w = r.x1 - r.x0
  return { min: r.x0 - w * PAD, max: r.x1 + w * PAD }
})
const sy = computed(() => {
  const r = figRanges.value
  if (!r) return null
  const h = r.y1 - r.y0
  return { min: r.y0 - h * PAD, max: r.y1 + h * PAD }
})
const px = (x) => (sx.value ? ((x - sx.value.min) / (sx.value.max - sx.value.min)) * 100 : 50)
const py = (y) => (sy.value ? 80 - ((y - sy.value.min) / (sy.value.max - sy.value.min)) * 80 : 40)
const hitR = (r) => (r.radius ? Math.max(2, r.radius * 3) : 3)
// x 轴（水平线 y=0）：像素 y = py(0)，仅当 y 范围含 0；y 轴（竖直线 x=0）同理
const hAxisY = computed(() => (figRanges.value && figRanges.value.y0 <= 0 && figRanges.value.y1 >= 0 ? py(0) : null))
const vAxisX = computed(() => (figRanges.value && figRanges.value.x0 <= 0 && figRanges.value.x1 >= 0 ? px(0) : null))
const pickedRegions = ref([])
function toggleRegion(id) {
  const k = String(id)
  const i = pickedRegions.value.indexOf(k)
  if (i >= 0) pickedRegions.value.splice(i, 1)
  else pickedRegions.value.push(k)
}

/* ===== lasso 框选：归一化 bbox [x,y,w,h]（0-1，相对图片容器） ===== */
const imageUrl = computed(() => String(canvas.value.image_url || canvas.value.imageUrl || ''))
const lassoBoxes = ref([])
const lassoDraft = ref(null)
const lassoAnchor = ref(null)
const imgReady = ref(false)
function lassoStart(e) {
  if (!imageUrl.value) return
  const box = e.currentTarget.getBoundingClientRect()
  lassoAnchor.value = { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height, w: box.width, h: box.height }
  lassoDraft.value = [lassoAnchor.value.x, lassoAnchor.value.y, 0, 0]
}
function lassoMove(e) {
  if (!lassoAnchor.value) return
  const a = lassoAnchor.value
  const box = e.currentTarget.getBoundingClientRect()
  const cx = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
  const cy = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height))
  lassoDraft.value = [Math.min(a.x, cx), Math.min(a.y, cy), Math.abs(cx - a.x), Math.abs(cy - a.y)]
}
function lassoEnd() {
  const d = lassoDraft.value
  lassoAnchor.value = null
  lassoDraft.value = null
  if (d && d[2] > 0.02 && d[3] > 0.02) lassoBoxes.value.push(d)
}

/* ===== 提交 ===== */
const canSubmit = computed(() => {
  if (mode.value === 'tokens') return selectedRanges.value.length > 0
  if (mode.value === 'figure') return pickedRegions.value.length > 0
  return lassoBoxes.value.length > 0
})
const submitLabel = computed(() => ({ tokens: '圈好了，交给你看', figure: '点好了', lasso: '圈好了' }[mode.value] || '提交'))
function submit() {
  if (!canSubmit.value) return
  if (mode.value === 'tokens') {
    emit('submit', { selected_tokens: selectedRanges.value.map(([a, b]) => [a, b]) })
  } else if (mode.value === 'figure') {
    emit('submit', { picked_regions: [...pickedRegions.value] })
  } else {
    emit('submit', { lasso: lassoBoxes.value.map((b) => ({ bbox: b })) })
  }
}
</script>

<style scoped>
.ix-annotate { font-size: 13px; }
.ix-an-hint { font-size: 11.5px; color: var(--text-secondary); margin-bottom: 7px; }
.ix-an-count { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
/* tokens 划选 */
.ix-an-tokens {
  padding: 10px 12px; border-radius: var(--radius-sm); line-height: 2.1;
  background: rgba(255, 255, 255, 0.85); border: 1px solid var(--border);
  user-select: none; touch-action: pan-y;
}
.ix-an-tok {
  padding: 2px 1px; margin: 0 1px; border-radius: 4px; cursor: pointer;
  border-bottom: 2px solid transparent; transition: background .12s;
}
.ix-an-tok:hover { background: rgba(139, 92, 246, 0.08); }
.ix-an-tok.preview { background: rgba(139, 92, 246, 0.14); }
.ix-an-tok.sel {
  background: rgba(139, 92, 246, 0.18); border-bottom-color: #8b5cf6; font-weight: 700; color: #5b21b6;
}
/* figure 点选 */
.ix-an-figwrap { border: 1px solid var(--border); border-radius: var(--radius-sm); background: #fff; padding: 6px; }
.ix-an-fig { width: 100%; height: auto; display: block; }
.ix-an-axis { stroke: #cbd5e1; stroke-width: 0.5; }
.ix-an-region { cursor: pointer; }
.ix-an-hit { fill: rgba(139, 92, 246, 0.12); stroke: rgba(139, 92, 246, 0.35); stroke-width: 0.3; transition: fill .15s; }
.ix-an-region:hover .ix-an-hit { fill: rgba(139, 92, 246, 0.28); }
.ix-an-region.picked .ix-an-hit { fill: rgba(139, 92, 246, 0.45); stroke: #7c3aed; stroke-width: 0.6; }
.ix-an-dot { fill: #7c3aed; }
.ix-an-rlabel { font-size: 3.6px; fill: #6d28d9; }
.ix-an-regionlist { display: flex; flex-wrap: wrap; gap: 6px; }
.ix-an-regionbtn {
  padding: 6px 11px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary);
  transition: all .14s; display: inline-flex; align-items: center; gap: 5px;
}
.ix-an-regionbtn:hover { border-color: #8b5cf6; color: #6d28d9; }
.ix-an-regionbtn.picked { border-color: #7c3aed; background: #f5f3ff; color: #5b21b6; font-weight: 700; }
.ix-an-rb-dot { color: #7c3aed; }
/* lasso 框选 */
.ix-an-imgwrap {
  position: relative; border: 1px solid var(--border); border-radius: var(--radius-sm);
  overflow: hidden; background: #fff; touch-action: none;
}
.ix-an-img { width: 100%; display: block; pointer-events: none; }
.ix-an-lasso { position: absolute; border: 2px solid #8b5cf6; background: rgba(139, 92, 246, 0.12); border-radius: 4px; }
.ix-an-lasso.drafting { border-style: dashed; }
.ix-an-lasso-x {
  position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; border-radius: 50%;
  border: 1px solid var(--border); background: #fff; color: #dc2626; cursor: pointer;
  font-size: 10px; line-height: 1; display: flex; align-items: center; justify-content: center;
}
.ix-an-lasso-tip { position: absolute; left: 0; right: 0; bottom: 0; padding: 3px 8px; font-size: 10.5px; color: #fff; background: rgba(30, 27, 55, 0.55); pointer-events: none; }
.ix-an-empty { padding: 14px 10px; text-align: center; font-size: 12px; color: var(--text-muted); }
.ix-an-actions { margin-top: 9px; }
.ix-submit {
  padding: 7px 16px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 700;
  border: 1px solid rgba(139, 92, 246, 0.45); color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); transition: filter .15s;
}
.ix-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.ix-submit:not(:disabled):hover { filter: brightness(1.06); }
</style>
