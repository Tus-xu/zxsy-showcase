<!-- 右侧「智能属性」面板：参数输入 → c/e 实时计算 → 图形/公式/标注同源联动 -->
<template>
  <aside class="property-panel" data-testid="property-panel">
    <div class="property-panel__head">
      <span>智能属性</span>
      <button class="property-panel__close" type="button" title="收起属性面板" @click="$emit('close')">×</button>
    </div>

    <div class="pp-tabs">
      <button
        class="pp-tab"
        type="button"
        :class="{ 'is-active': tab === 'figure' }"
        data-testid="property-tab-figure"
        @click="tab = 'figure'"
      >
        图形属性
      </button>
      <button
        class="pp-tab"
        type="button"
        :class="{ 'is-active': tab === 'style' }"
        data-testid="property-tab-style"
        @click="tab = 'style'"
      >
        设计样式
      </button>
    </div>

    <div class="property-panel__body">
      <template v-if="tab === 'figure'">
        <div class="pp-figure-head">
          <div class="pp-figure-icon" :class="`pp-figure-icon--${kind}`">
            <svg v-if="kind === 'ellipse'" viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="13" ry="8" fill="none" stroke="#2563eb" stroke-width="1.6" /><circle cx="9" cy="16" r="1.8" fill="#dc2626" /><circle cx="23" cy="16" r="1.8" fill="#dc2626" /></svg>
            <svg v-else-if="kind === 'quadratic'" viewBox="0 0 32 32"><path d="M4 6 Q16 32 28 6" fill="none" stroke="#2563eb" stroke-width="1.6" /><circle cx="16" cy="19" r="1.8" fill="#dc2626" /></svg>
            <svg v-else viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#eff6ff" stroke="#2563eb" stroke-width="1.4" /><circle cx="16" cy="16" r="6" fill="#dbeafe" stroke="#2563eb" stroke-width="1.4" /></svg>
          </div>
          <div>
            <b>{{ kindLabel }}</b>
            <span>{{ kind === 'ellipse' ? '调整参数，实时更新图形与标注' : kind === 'quadratic' ? '调整参数，实时更新顶点与对称轴' : '调整元素个数，实时更新子集数' }}</span>
          </div>
        </div>

        <div v-if="kind === 'ellipse'" class="pp-params" data-testid="param-ellipse">
          <label class="pp-row">
            <span>长半轴 a</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              :value="params.a"
              data-testid="param-a"
              @input="emitParam('a', $event.target.value)"
            />
          </label>
          <label class="pp-row">
            <span>短半轴 b</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              :value="params.b"
              data-testid="param-b"
              @input="emitParam('b', $event.target.value)"
            />
          </label>
          <div class="pp-row pp-row--readonly">
            <span>半焦距 c</span>
            <b data-testid="param-c">{{ derived.cFixed1 }}</b>
          </div>
          <div class="pp-hint">（c² = a² − b²）</div>
          <div class="pp-row pp-row--readonly">
            <span>离心率 e</span>
            <b data-testid="param-e">{{ derived.eText }}</b>
          </div>
          <div class="pp-hint">（e = c/a，e 越大越“扁”）</div>
          <div v-if="!derived.valid" class="pp-error" data-testid="param-error">{{ derived.error }}</div>
        </div>

        <div v-else-if="kind === 'quadratic'" class="pp-params" data-testid="param-quadratic">
          <label class="pp-row">
            <span>二次项系数 a</span>
            <input type="number" step="0.5" :value="params.a" data-testid="param-a" @input="emitParam('a', $event.target.value)" />
          </label>
          <label class="pp-row">
            <span>顶点横坐标 h</span>
            <input type="number" step="0.5" :value="params.h" data-testid="param-h" @input="emitParam('h', $event.target.value)" />
          </label>
          <label class="pp-row">
            <span>顶点纵坐标 k</span>
            <input type="number" step="0.5" :value="params.k" data-testid="param-k" @input="emitParam('k', $event.target.value)" />
          </label>
          <div class="pp-row pp-row--readonly">
            <span>顶点式</span>
            <b class="pp-readonly-text" data-testid="param-vertex">{{ derived.vertexForm }}</b>
          </div>
          <div class="pp-hint">（对称轴 {{ derived.axis }}，{{ derived.opening }}）</div>
          <div v-if="!derived.valid" class="pp-error">{{ derived.error }}</div>
        </div>

        <div v-else class="pp-params" data-testid="param-set">
          <label class="pp-row">
            <span>集合元素个数 n</span>
            <input type="number" step="1" min="1" max="8" :value="params.n" data-testid="param-n" @input="emitParam('n', $event.target.value)" />
          </label>
          <div class="pp-row pp-row--readonly">
            <span>子集个数</span>
            <b data-testid="param-subsets">{{ derived.subsets }}</b>
          </div>
          <div class="pp-row pp-row--readonly">
            <span>真子集个数</span>
            <b data-testid="param-proper">{{ derived.proper }}</b>
          </div>
          <div class="pp-hint">（每个元素“选或不选” ⇒ 2ⁿ 个子集）</div>
        </div>

        <div class="pp-divider" />

        <template v-if="kind === 'ellipse'">
          <div class="pp-toggle" data-testid="toggle-focus">
            <span>显示焦点 F₁、F₂</span>
            <button class="pp-switch" type="button" :class="{ 'is-on': opts.showFocus }" @click="$emit('update-style', { showFocus: !opts.showFocus })"><i /></button>
          </div>
          <div class="pp-toggle">
            <span>显示坐标轴</span>
            <button class="pp-switch" type="button" :class="{ 'is-on': opts.showAxes }" @click="$emit('update-style', { showAxes: !opts.showAxes })"><i /></button>
          </div>
          <div class="pp-toggle">
            <span>显示辅助线（PF₁、PF₂）</span>
            <button class="pp-switch" type="button" :class="{ 'is-on': opts.showAux }" @click="$emit('update-style', { showAux: !opts.showAux })"><i /></button>
          </div>
        </template>
        <div class="pp-toggle">
          <span>显示数值标注</span>
          <button class="pp-switch" type="button" :class="{ 'is-on': opts.showLabels }" @click="$emit('update-style', { showLabels: !opts.showLabels })"><i /></button>
        </div>

        <div class="pp-divider" />
        <div class="pp-section-title">图形样式</div>
        <div class="pp-style-row">
          <div class="pp-swatches">
            <button
              v-for="c in COLORS"
              :key="c.value"
              class="pp-swatch"
              type="button"
              :class="{ 'is-active': opts.color === c.value }"
              :style="{ background: c.value }"
              :title="c.label"
              @click="$emit('update-style', { color: c.value })"
            />
          </div>
          <select class="pp-select" :value="opts.strokeWidth" @change="$emit('update-style', { strokeWidth: Number($event.target.value) })">
            <option :value="2">2px</option>
            <option :value="2.4">2.4px</option>
            <option :value="3">3px</option>
          </select>
        </div>
      </template>

      <template v-else>
        <div class="pp-section-title">主题色</div>
        <div class="pp-swatches pp-swatches--lg">
          <button
            v-for="c in COLORS"
            :key="c.value"
            class="pp-swatch pp-swatch--lg"
            type="button"
            :class="{ 'is-active': opts.color === c.value }"
            :style="{ background: c.value }"
            :title="c.label"
            @click="$emit('update-style', { color: c.value })"
          />
        </div>
        <div class="pp-section-title">线条粗细</div>
        <div class="pp-seg">
          <button
            v-for="w in [2, 2.4, 3]"
            :key="w"
            type="button"
            class="pp-seg__btn"
            :class="{ 'is-active': opts.strokeWidth === w }"
            @click="$emit('update-style', { strokeWidth: w })"
          >
            {{ w }}px
          </button>
        </div>
        <div class="pp-divider" />
        <button class="pp-reset" type="button" @click="$emit('reset-style')">恢复默认样式</button>
      </template>

      <div class="pp-divider" />
      <div class="pp-section-title">AI 快捷操作</div>
      <button class="pp-ai-action" type="button" data-testid="ai-animation" @click="$emit('action', 'animate')">
        <span class="pp-ai-icon">◉</span>
        <span class="pp-ai-text"><b>{{ animate ? '停止推导动画' : '生成推导动画' }}</b><small>基于当前图形生成动态演示</small></span>
        <span class="pp-ai-go">›</span>
      </button>
      <button class="pp-ai-action" type="button" data-testid="ai-simplify" @click="$emit('action', 'simplify')">
        <span class="pp-ai-icon">✎</span>
        <span class="pp-ai-text"><b>让本页更简洁</b><small>精简文字，突出要点</small></span>
        <span class="pp-ai-go">›</span>
      </button>
      <button class="pp-ai-action" type="button" data-testid="ai-sync-plan" @click="$emit('action', 'sync')">
        <span class="pp-ai-icon">⇄</span>
        <span class="pp-ai-text"><b>讲稿同步到教案</b><small>把本页讲稿写入教案教学过程</small></span>
        <span class="pp-ai-go">›</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  deckId: { type: String, default: '' },
  params: { type: Object, default: () => ({}) },
  derived: { type: Object, default: () => ({ valid: true }) },
  opts: {
    type: Object,
    default: () => ({ showFocus: true, showAxes: true, showAux: true, showLabels: true, color: '#2563eb', strokeWidth: 2.4 }),
  },
  animate: { type: Boolean, default: false },
})

const emit = defineEmits(['update-param', 'update-style', 'action', 'close', 'reset-style'])

const tab = ref('figure')

const COLORS = [
  { label: '主蓝', value: '#2563eb' },
  { label: '靛蓝', value: '#4f46e5' },
  { label: '青色', value: '#0891b2' },
  { label: '玫红', value: '#db2777' },
]

const kind = computed(() => props.derived?.kind || 'none')
const kindLabel = computed(() => {
  if (kind.value === 'ellipse') return '椭圆图形'
  if (kind.value === 'quadratic') return '二次函数图象'
  if (kind.value === 'set') return '集合关系图'
  return '页面图形'
})

function emitParam(key, value) {
  emit('update-param', { key, value })
}
</script>

<style scoped>
.property-panel {
  width: 292px;
  flex: none;
  background: #fff;
  border-left: 1px solid #e5e9f2;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.property-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px 10px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.property-panel__close {
  border: 0;
  background: none;
  font-size: 18px;
  line-height: 1;
  color: #94a3b8;
  padding: 0 2px;
}
.property-panel__close:hover {
  color: #475569;
}
.pp-tabs {
  display: flex;
  gap: 4px;
  margin: 0 14px;
  background: #f1f5f9;
  border-radius: 9px;
  padding: 3px;
}
.pp-tab {
  flex: 1;
  border: 0;
  background: transparent;
  border-radius: 7px;
  padding: 6px 0;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
}
.pp-tab.is-active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}
.property-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px 20px;
}
.pp-figure-head {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 4px 0 10px;
}
.pp-figure-icon {
  width: 44px;
  height: 38px;
  flex: none;
  border-radius: 9px;
  background: #eff4ff;
  border: 1px solid #dbe6fb;
  display: grid;
  place-items: center;
  padding: 5px;
}
.pp-figure-icon svg {
  width: 100%;
  height: 100%;
}
.pp-figure-head b {
  display: block;
  font-size: 13px;
  color: #0f172a;
}
.pp-figure-head span {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}
.pp-params {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.pp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12.5px;
  color: #334155;
  min-height: 32px;
}
.pp-row input {
  width: 96px;
  height: 30px;
  border: 1px solid #dbe3ef;
  border-radius: 7px;
  padding: 0 9px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  text-align: left;
  outline: none;
  background: #fff;
}
.pp-row input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.pp-row--readonly b {
  font-size: 13.5px;
  color: #0f172a;
  font-weight: 700;
}
.pp-readonly-text {
  font-size: 11.5px !important;
  color: #1d4ed8 !important;
  max-width: 170px;
  text-align: right;
}
.pp-hint {
  font-size: 10.5px;
  color: #94a3b8;
  text-align: right;
  margin-top: -3px;
}
.pp-error {
  font-size: 11.5px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 7px;
  padding: 6px 8px;
  line-height: 1.5;
}
.pp-divider {
  height: 1px;
  background: #eef2f7;
  margin: 12px 0;
}
.pp-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: #334155;
  padding: 5px 0;
}
.pp-switch {
  width: 36px;
  height: 20px;
  flex: none;
  border: 0;
  border-radius: 999px;
  background: #dbe3ee;
  padding: 2px;
  transition: background 0.16s ease;
}
.pp-switch i {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 0.16s ease;
}
.pp-switch.is-on {
  background: #2563eb;
}
.pp-switch.is-on i {
  transform: translateX(16px);
}
.pp-section-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.04em;
  margin: 2px 0 8px;
}
.pp-style-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pp-swatches {
  display: flex;
  gap: 7px;
}
.pp-swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid transparent;
  padding: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}
.pp-swatch.is-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #dbeafe;
}
.pp-swatches--lg {
  gap: 10px;
  margin-bottom: 4px;
}
.pp-swatch--lg {
  width: 30px;
  height: 30px;
  border-radius: 8px;
}
.pp-select {
  height: 28px;
  border: 1px solid #dbe3ef;
  border-radius: 7px;
  font-family: inherit;
  font-size: 12px;
  color: #334155;
  padding: 0 6px;
  background: #fff;
}
.pp-seg {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 4px;
}
.pp-seg__btn {
  flex: 1;
  border: 0;
  background: transparent;
  border-radius: 6px;
  padding: 5px 0;
  font-size: 12px;
  color: #64748b;
}
.pp-seg__btn.is-active {
  background: #fff;
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}
.pp-reset {
  width: 100%;
  border: 1px solid #dbe3ef;
  background: #fff;
  border-radius: 8px;
  padding: 7px 0;
  font-size: 12.5px;
  color: #475569;
}
.pp-reset:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.pp-ai-action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #eef2f7;
  background: #fbfdff;
  border-radius: 10px;
  padding: 8px 10px;
  margin-bottom: 7px;
  text-align: left;
}
.pp-ai-action:hover {
  border-color: #dbe6fb;
  background: #f5f8ff;
}
.pp-ai-icon {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #eff4ff;
  color: #2563eb;
  display: grid;
  place-items: center;
  font-size: 13px;
  flex: none;
}
.pp-ai-text {
  flex: 1;
  min-width: 0;
}
.pp-ai-text b {
  display: block;
  font-size: 12.5px;
  color: #1f2937;
}
.pp-ai-text small {
  display: block;
  font-size: 10.5px;
  color: #94a3b8;
  line-height: 1.5;
}
.pp-ai-go {
  color: #cbd5e1;
  font-size: 15px;
}
</style>
