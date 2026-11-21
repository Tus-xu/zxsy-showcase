<!-- 当前页画布（16:9）：按 slide.layout 渲染标题/导语/公式/要点/示意图；标题为真实输入框 -->
<template>
  <div class="slide-canvas" :class="{ 'is-title-layout': slide.layout === 'title' }" :data-slide-index="index">
    <template v-if="slide.layout === 'title'">
      <div class="sc-title-layout">
        <div class="sc-kicker">{{ slide.kicker || '智学数研 · 智学备课' }}</div>
        <input
          v-if="editable"
          class="sc-title-input sc-title-input--hero"
          data-testid="slide-title-input"
          :value="slide.title"
          aria-label="当前页标题"
          @input="$emit('update:title', $event.target.value)"
        />
        <h1 v-else class="sc-hero-title">{{ slide.title }}</h1>
        <p v-if="slide.subtitle" class="sc-hero-sub">{{ slide.subtitle }}</p>
        <div v-if="slide.lead" class="sc-lead sc-lead--hero">
          <MathText :text="slide.lead" />
        </div>
        <div class="sc-title-meta">{{ deck.meta?.textbook }} · {{ deck.meta?.className }} · {{ deck.meta?.duration }}</div>
      </div>
    </template>

    <template v-else>
      <div class="sc-top">
        <div class="sc-top-brand">
          <span class="sc-top-bar" />
          <span>{{ deck.title }}</span>
        </div>
        <div class="sc-top-meta">{{ deck.meta?.textbook }} · 高中数学 · {{ deck.subtitle }}</div>
      </div>

      <div class="sc-heading">
        <span class="sc-badge">{{ badge }}</span>
        <input
          v-if="editable"
          class="sc-title-input"
          data-testid="slide-title-input"
          :value="slide.title"
          aria-label="当前页标题"
          @input="$emit('update:title', $event.target.value)"
        />
        <h2 v-else class="sc-h2">{{ slide.title }}</h2>
      </div>

      <div v-if="slide.lead" class="sc-lead">
        <MathText :text="slide.lead" />
      </div>

      <div class="sc-main" :class="{ 'sc-main--split': !!figureKind }">
        <div v-if="figureKind" class="sc-figure">
          <EllipseFigure
            v-if="figureKind === 'ellipse'"
            :a="derived.a"
            :b="derived.b"
            :c-text="derived.cText"
            :valid="derived.valid"
            :error="derived.error"
            :show-focus="opts.showFocus"
            :show-axes="opts.showAxes"
            :show-aux="opts.showAux"
            :show-labels="opts.showLabels"
            :color="opts.color"
            :stroke-width="opts.strokeWidth"
            :animate="animate"
          />
          <ParabolaFigure
            v-else-if="figureKind === 'parabola'"
            :a="derived.a"
            :h="derived.h"
            :k="derived.k"
            :valid="derived.valid"
            :error="derived.error"
            :extremum="derived.extremum"
            :show-labels="opts.showLabels"
            :color="opts.color"
            :stroke-width="opts.strokeWidth"
          />
          <VennFigure
            v-else
            :n="derived.n"
            :subset-formula="derived.subsetFormula"
            :proper-formula="derived.properFormula"
            :element-text="derived.elementText"
            :show-labels="opts.showLabels"
          />
          <div class="sc-anno" data-testid="figure-annotation">
            <template v-if="figureKind === 'ellipse' && derived.valid">
              <div class="sc-anno-line">{{ derived.sumText }}</div>
              <div class="sc-anno-line sc-anno-line--sub">
                焦点 {{ derived.focus1 }}、{{ derived.focus2 }} · 长轴长 {{ derived.axisLong }} · 短轴长
                {{ derived.axisShort }} · 焦距 {{ derived.focal }} · e = {{ derived.eText }}
              </div>
            </template>
            <template v-else-if="figureKind === 'parabola' && derived.valid">
              <div class="sc-anno-line">当前参数：{{ derived.vertexForm }}</div>
              <div class="sc-anno-line sc-anno-line--sub">
                顶点 {{ derived.vertex }} · 对称轴 {{ derived.axis }} · {{ derived.opening }} · {{ derived.extremum }}
              </div>
            </template>
            <template v-else-if="figureKind === 'set'">
              <div class="sc-anno-line">当前参数：{{ derived.subsetFormula }}</div>
              <div class="sc-anno-line sc-anno-line--sub">{{ derived.properFormula }} · A ⊆ B ⇔ 任意 x∈A 都有 x∈B</div>
            </template>
            <template v-else>
              <div class="sc-anno-line">{{ derived.error || '参数调整后可在此看到联动结论' }}</div>
            </template>
          </div>
        </div>

        <div class="sc-side">
          <div v-if="equationText" class="sc-eq-card">
            <div class="sc-eq-title">{{ equationTitle }}</div>
            <div class="sc-eq-main"><MathText :text="equationText" /></div>
            <div v-if="secondaryEquation" class="sc-eq-sub" data-testid="equation-derived">
              <MathText :text="secondaryEquation" />
            </div>
          </div>
          <ul v-if="slide.bullets?.length" class="sc-bullets" data-testid="slide-bullets">
            <li v-for="(b, i) in slide.bullets" :key="i">
              <span class="sc-bullet-dot" />
              <MathText :text="b" />
            </li>
          </ul>
        </div>
      </div>

      <div class="sc-footer">
        <span class="sc-footer-note">{{ slide.footer || '用数学的眼光观察世界' }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MathText from '../../MathText.vue'
import EllipseFigure from './EllipseFigure.vue'
import ParabolaFigure from './ParabolaFigure.vue'
import VennFigure from './VennFigure.vue'

const props = defineProps({
  slide: { type: Object, required: true },
  deck: { type: Object, required: true },
  deckId: { type: String, default: '' },
  index: { type: Number, default: 0 },
  derived: { type: Object, default: () => ({ valid: true }) },
  opts: {
    type: Object,
    default: () => ({ showFocus: true, showAxes: true, showAux: true, showLabels: true, color: '#2563eb', strokeWidth: 2.4 }),
  },
  editable: { type: Boolean, default: true },
  animate: { type: Boolean, default: false },
})

defineEmits(['update:title'])

const CN = ['一', '二', '三', '四', '五', '六', '七', '八']
const badge = computed(() => CN[Math.max(0, Math.min(props.index - 1, CN.length - 1))] || String(props.index + 1))

/** 哪些页展示本课的参数图形（椭圆/Golden 第 3 页起、二次函数配方页、集合全部内容页） */
const figureKind = computed(() => {
  const id = props.slide?.id
  if (props.deckId === 'deck-ellipse') return ['s3', 's4', 's5'].includes(id) ? 'ellipse' : null
  if (props.deckId === 'deck-quadratic') return ['s2', 's3', 's4'].includes(id) ? 'parabola' : null
  if (props.deckId === 'deck-set') return props.slide?.layout === 'content' ? 'set' : null
  return null
})

const equationTitle = computed(() => {
  if (figureKind.value === 'ellipse') return '椭圆的标准方程'
  if (figureKind.value === 'parabola') return '当前参数 · 顶点式'
  if (figureKind.value === 'set') return '当前参数 · 子集个数'
  return '本页公式'
})

const equationText = computed(() => {
  const eq = props.slide?.equation
  const d = props.derived || {}
  // 参数图形页：公式必须与当前参数同源，避免与静态例题文字矛盾
  if (figureKind.value === 'parabola' && d.valid && d.vertexForm) return d.vertexForm
  if (figureKind.value === 'set' && d.subsetFormula) return d.subsetFormula
  if (eq) return eq
  return ''
})

/** 参数联动后的补充公式（与图形、标注同源） */
const secondaryEquation = computed(() => {
  const d = props.derived || {}
  if (figureKind.value === 'ellipse' && d.valid) {
    const standard = props.slide?.equation && /\\frac|x²/.test(props.slide.equation) ? '' : 'x²/a² + y²/b² = 1（a > b > 0）'
    return [standard, d.numericEquation, d.cFormula, d.eFormula].filter(Boolean).join('； ')
  }
  if (figureKind.value === 'parabola' && d.valid) {
    return `顶点 ${d.vertex} · 对称轴 ${d.axis} · ${d.opening} · ${d.extremum}`
  }
  if (figureKind.value === 'set' && d.subsetFormula) {
    return `${d.properFormula} · A ⊆ B ⇔ 任意 x∈A 都有 x∈B`
  }
  return ''
})
</script>

<style scoped>
.slide-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #fff;
  border: 1px solid #e3e8f2;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  padding: 22px 26px 30px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #111827;
}
.sc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8edf6;
  margin-bottom: 12px;
}
.sc-top-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
}
.sc-top-bar {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #2563eb;
  display: inline-block;
}
.sc-top-meta {
  font-size: 11px;
  color: #94a3b8;
}
.sc-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.sc-badge {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex: none;
}
.sc-title-input {
  flex: 1;
  min-width: 0;
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 30px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #0f172a;
  padding: 0 4px;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.sc-title-input:hover {
  border-color: #dbe3f0;
  background: #f8fbff;
}
.sc-title-input:focus {
  border-color: #2563eb;
  background: #f5f8ff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.sc-h2 {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.sc-lead {
  background: #f2f6fd;
  border: 1px solid #e6eefb;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14.5px;
  line-height: 1.75;
  color: #1e293b;
  margin-bottom: 12px;
}
.sc-main {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
}
.sc-main--split .sc-figure {
  flex: 1.06;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.sc-main--split .sc-side {
  flex: 0.94;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
}
.sc-figure svg {
  max-height: 100%;
}
.sc-anno {
  margin-top: 6px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  padding: 7px 10px;
}
.sc-anno-line {
  font-size: 11.5px;
  line-height: 1.6;
  color: #1e3a8a;
  font-weight: 600;
}
.sc-anno-line--sub {
  color: #64748b;
  font-weight: 500;
  font-size: 10.8px;
}
.sc-eq-card {
  border: 1px solid #dbe6f7;
  border-radius: 10px;
  background: #f8fbff;
  padding: 10px 12px;
}
.sc-eq-title {
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.sc-eq-title::before {
  content: '📖';
  font-size: 12px;
}
.sc-eq-main {
  font-size: 19px;
  font-weight: 600;
  color: #1e293b;
  text-align: center;
  padding: 4px 0;
}
.sc-eq-sub {
  font-size: 11.5px;
  line-height: 1.7;
  color: #334155;
  border-top: 1px dashed #dbe6f7;
  padding-top: 6px;
}
.sc-bullets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sc-bullets li {
  display: flex;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.65;
  color: #1f2937;
}
.sc-bullet-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2563eb;
  margin-top: 7px;
}
.sc-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 6px;
  border-top: 1px solid #eef2f7;
  margin-top: 6px;
}
.sc-footer-note {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}
/* ── 封面页 ── */
.slide-canvas.is-title-layout {
  justify-content: center;
  background:
    radial-gradient(680px 380px at 82% -12%, rgba(37, 99, 235, 0.1) 0%, transparent 60%),
    #fff;
}
.sc-title-layout {
  padding: 0 24px;
}
.sc-kicker {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 10px;
}
.sc-title-input--hero {
  font-size: 44px;
  padding: 2px 6px;
  max-width: 100%;
}
.sc-hero-title {
  margin: 0;
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sc-hero-sub {
  font-size: 17px;
  color: #475569;
  margin: 8px 0 16px;
}
.sc-lead--hero {
  font-size: 14px;
  max-width: 76%;
}
.sc-title-meta {
  margin-top: 18px;
  font-size: 12px;
  color: #94a3b8;
}
</style>
