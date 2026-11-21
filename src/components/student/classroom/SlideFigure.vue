<template>
  <!-- 课件内的数学图形：按 deckId 渲染可理解的静态示意（不依赖网络/外部绘图服务） -->
  <svg class="slide-figure" viewBox="0 0 440 300" role="img" :aria-label="ariaLabel">
    <!-- 椭圆：定义 / 标准方程 / 参数联动 -->
    <g v-if="kind === 'ellipse'">
      <line x1="26" y1="150" x2="414" y2="150" class="axis" />
      <line x1="220" y1="24" x2="220" y2="276" class="axis" />
      <ellipse cx="220" cy="150" rx="140" ry="84" class="curve" />
      <template v-if="variant === 'definition'">
        <circle cx="164" cy="150" r="5" class="focus" />
        <circle cx="276" cy="150" r="5" class="focus" />
        <circle cx="298" cy="81" r="5" class="point" />
        <line x1="164" y1="150" x2="298" y2="81" class="dash" />
        <line x1="276" y1="150" x2="298" y2="81" class="dash" />
        <text x="140" y="172" class="lbl">F₁(−c, 0)</text>
        <text x="282" y="172" class="lbl">F₂(c, 0)</text>
        <text x="306" y="74" class="lbl">P(x, y)</text>
        <text x="230" y="140" class="lbl lbl--ink">O</text>
      </template>
      <template v-else-if="variant === 'standard'">
        <circle cx="164" cy="150" r="5" class="focus" />
        <circle cx="276" cy="150" r="5" class="focus" />
        <line x1="220" y1="150" x2="360" y2="150" class="solid-brand" />
        <line x1="220" y1="150" x2="220" y2="66" class="solid-brand" />
        <text x="286" y="140" class="lbl lbl--brand">a</text>
        <text x="228" y="104" class="lbl lbl--brand">b</text>
        <text x="186" y="140" class="lbl lbl--brand">c</text>
        <text x="122" y="176" class="lbl">F₁</text>
        <text x="286" y="176" class="lbl">F₂</text>
        <text x="352" y="132" class="lbl">x</text>
        <text x="230" y="40" class="lbl">y</text>
        <text x="150" y="262" class="lbl">b² = a² − c²</text>
      </template>
      <template v-else>
        <circle cx="164" cy="150" r="5" class="focus" />
        <circle cx="276" cy="150" r="5" class="focus" />
        <line x1="220" y1="150" x2="364" y2="150" class="solid-brand" />
        <line x1="220" y1="150" x2="220" y2="62" class="solid-brand" />
        <text x="288" y="140" class="lbl lbl--brand">a = 5</text>
        <text x="228" y="100" class="lbl lbl--brand">b = 3</text>
        <text x="176" y="140" class="lbl lbl--brand">c = 4</text>
        <text x="122" y="176" class="lbl">F₁(−4,0)</text>
        <text x="284" y="176" class="lbl">F₂(4,0)</text>
        <text x="250" y="262" class="lbl">e = c/a = 4/5</text>
      </template>
      <text x="34" y="286" class="caption">{{ caption }}</text>
    </g>

    <!-- 二次函数：顶点式与对称轴 -->
    <g v-else-if="kind === 'parabola'">
      <line x1="30" y1="240" x2="414" y2="240" class="axis" />
      <line x1="220" y1="26" x2="220" y2="272" class="axis" />
      <path d="M 96 44 Q 220 356 344 44" class="curve" />
      <line x1="220" y1="30" x2="220" y2="268" class="dash-brand" />
      <circle cx="220" cy="214" r="5" class="point" />
      <text x="230" y="234" class="lbl">顶点 (h, k)</text>
      <text x="232" y="122" class="lbl lbl--brand">x = h</text>
      <text x="330" y="258" class="lbl">x</text>
      <text x="228" y="40" class="lbl">y</text>
      <text x="46" y="70" class="lbl">y = a(x − h)² + k</text>
      <text x="34" y="284" class="caption">{{ caption }}</text>
    </g>

    <!-- 集合：子集 / 真子集 / 相等 -->
    <g v-else-if="kind === 'venn'">
      <rect x="34" y="36" width="372" height="216" rx="18" class="venn-frame" />
      <ellipse cx="220" cy="144" rx="132" ry="82" class="venn-b" />
      <ellipse cx="196" cy="144" rx="66" ry="42" class="venn-a" />
      <text x="152" y="98" class="lbl lbl--brand">A</text>
      <text x="316" y="92" class="lbl">B</text>
      <circle cx="176" cy="144" r="4" class="point" />
      <circle cx="204" cy="160" r="4" class="point" />
      <circle cx="288" cy="144" r="4" class="point" />
      <circle cx="316" cy="166" r="4" class="point" />
      <text x="80" y="286" class="caption">{{ caption }}</text>
    </g>

    <!-- 正三棱柱：建系与线面关系 -->
    <g v-else-if="kind === 'prism'">
      <path d="M 150 210 L 250 210 L 200 118 Z" class="prism-base" />
      <path d="M 150 74 L 250 74 L 200 24 Z" class="prism-top" />
      <line x1="150" y1="210" x2="150" y2="74" class="prism-edge" />
      <line x1="250" y1="210" x2="250" y2="74" class="prism-edge" />
      <line x1="200" y1="118" x2="200" y2="24" class="prism-edge" />
      <line x1="150" y1="210" x2="250" y2="210" class="solid-brand" />
      <line x1="200" y1="118" x2="200" y2="210" class="dash-brand" />
      <circle cx="200" cy="210" r="4" class="point" />
      <text x="132" y="230" class="lbl">B</text>
      <text x="256" y="230" class="lbl">C</text>
      <text x="196" y="112" class="lbl">A</text>
      <text x="130" y="70" class="lbl">B₁</text>
      <text x="256" y="70" class="lbl">C₁</text>
      <text x="196" y="18" class="lbl">A₁</text>
      <text x="206" y="226" class="lbl lbl--brand">D</text>
      <text x="62" y="286" class="caption">{{ caption }}</text>
    </g>

    <!-- 兜底：页面声明的图形说明 -->
    <g v-else>
      <rect x="26" y="26" width="388" height="248" rx="18" class="venn-frame" />
      <text x="220" y="150" class="lbl" text-anchor="middle">{{ caption || '数学图形' }}</text>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  deckId: { type: String, default: '' },
  page: { type: Number, default: 1 },
  caption: { type: String, default: '' },
})

const kind = computed(() => {
  const id = props.deckId
  if (id === 'deck-ellipse') return 'ellipse'
  if (id === 'deck-quadratic') return 'parabola'
  if (id === 'deck-set') return 'venn'
  if (id === 'deck-material-cubes') return 'prism'
  return 'plain'
})

const variant = computed(() => {
  if (kind.value !== 'ellipse') return 'definition'
  if (props.page >= 5) return 'params'
  if (props.page >= 4) return 'standard'
  return 'definition'
})

const ariaLabel = computed(() => `课件图形：${props.caption || kind.value}`)
</script>

<style scoped>
.slide-figure {
  width: 100%;
  height: 100%;
  display: block;
}
.axis {
  stroke: #cbd5e1;
  stroke-width: 1.4;
}
.curve {
  fill: none;
  stroke: var(--brand, #4f46e5);
  stroke-width: 2.6;
}
.focus {
  fill: #fb7185;
}
.point {
  fill: var(--brand, #4f46e5);
}
.dash {
  stroke: #94a3b8;
  stroke-width: 1.4;
  stroke-dasharray: 5 4;
}
.dash-brand {
  stroke: var(--brand, #4f46e5);
  stroke-width: 1.6;
  stroke-dasharray: 6 5;
}
.solid-brand {
  stroke: var(--brand, #4f46e5);
  stroke-width: 2.2;
}
.lbl {
  font-family: var(--font, 'PingFang SC', 'Microsoft YaHei', sans-serif);
  font-size: 15px;
  font-style: italic;
  fill: var(--ink2, #334155);
}
.lbl--brand {
  fill: var(--brand-deep, #4338ca);
  font-weight: 600;
}
.lbl--ink {
  fill: var(--ink, #0f172a);
}
.caption {
  font-family: var(--font, 'PingFang SC', 'Microsoft YaHei', sans-serif);
  font-size: 12.5px;
  fill: var(--ink3, #94a3b8);
}
.venn-frame {
  fill: #f8faff;
  stroke: #dfe5ff;
  stroke-width: 1.4;
}
.venn-b {
  fill: rgba(79, 70, 229, 0.08);
  stroke: var(--brand, #4f46e5);
  stroke-width: 2;
}
.venn-a {
  fill: rgba(6, 182, 212, 0.12);
  stroke: var(--accent, #06b6d4);
  stroke-width: 2;
}
.prism-base {
  fill: rgba(79, 70, 229, 0.1);
  stroke: var(--brand, #4f46e5);
  stroke-width: 2;
}
.prism-top {
  fill: rgba(6, 182, 212, 0.12);
  stroke: var(--accent, #06b6d4);
  stroke-width: 2;
}
.prism-edge {
  stroke: #64748b;
  stroke-width: 1.8;
}
</style>
