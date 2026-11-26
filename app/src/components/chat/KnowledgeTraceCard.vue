<template>
  <section class="kt" role="region" :aria-label="card.title || '知识追溯'">
    <header class="kt-head">
      <div class="kt-head-main">
        <span class="kt-ic" aria-hidden="true">🧭</span>
        <b class="kt-title">{{ card.title || '知识追溯' }}</b>
      </div>
      <div class="kt-ctrl">
        <template v-if="reduce">
          <button type="button" class="kt-btn" :disabled="revealed <= 0" @click="step(-1)">上一步</button>
          <button type="button" class="kt-btn" :disabled="revealed >= nodes.length" @click="step(1)">下一步</button>
        </template>
        <template v-else>
          <button type="button" class="kt-btn primary" :aria-pressed="playing" @click="toggle">
            {{ playing ? '暂停' : (revealed >= nodes.length ? '重新播放' : '播放') }}
          </button>
        </template>
      </div>
    </header>

    <ol class="kt-track" role="list">
      <li
        v-for="(n, i) in nodes"
        :key="n.id || i"
        class="kt-node"
        :class="[stateClass(n), { on: i < revealed, current: i === revealed - 1 }]"
        :aria-current="i === revealed - 1 ? 'step' : undefined"
      >
        <span class="kt-line" v-if="i < nodes.length - 1" aria-hidden="true">
          <span class="kt-line-fill" :style="{ width: i < revealed - 1 ? '100%' : '0%' }"></span>
        </span>
        <span class="kt-dot" aria-hidden="true"><span class="kt-dot-inner"></span></span>
        <div class="kt-label">
          <b>{{ n.label }}</b>
          <small>{{ n.detail }}</small>
        </div>
        <span class="kt-action">{{ n.action }}</span>
      </li>
    </ol>

    <p class="kt-caption" aria-live="polite">{{ caption }}</p>

    <div class="kt-foot">
      <span>{{ reduce ? '已展开' : '已回放' }} {{ revealed }}/{{ nodes.length }}</span>
      <span v-if="card.summary" class="kt-summary">{{ card.summary }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
})

const nodes = computed(() => (Array.isArray(props.card?.nodes) ? props.card.nodes : []))
const reduce = ref(false)
const playing = ref(false)
const revealed = ref(0)
let timer = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function stateClass(n) {
  return `is-${n?.state || 'pending'}`
}

const caption = computed(() => {
  if (!nodes.value.length) return ''
  if (revealed.value <= 0) return '点「播放」按顺序回看这道题用到的知识点。'
  const n = nodes.value[Math.min(revealed.value, nodes.value.length) - 1]
  return `${n.label}：${n.detail}${n.action ? `（${n.action}）` : ''}`
})

function tick() {
  clearTimer()
  if (!playing.value) return
  if (revealed.value >= nodes.value.length) {
    playing.value = false
    return
  }
  revealed.value += 1
  if (revealed.value < nodes.value.length) {
    timer = setTimeout(tick, 1100)
  } else {
    playing.value = false
  }
}

function play() {
  if (reduce.value) {
    revealed.value = nodes.value.length
    return
  }
  if (revealed.value >= nodes.value.length) revealed.value = 0
  playing.value = true
  tick()
}

function toggle() {
  if (playing.value) {
    playing.value = false
    clearTimer()
    return
  }
  play()
}

function replay() {
  clearTimer()
  revealed.value = 0
  playing.value = false
  if (reduce.value) {
    revealed.value = nodes.value.length
    return
  }
  play()
}

function step(dir) {
  if (reduce.value) {
    revealed.value = Math.max(0, Math.min(nodes.value.length, revealed.value + dir))
    return
  }
  revealed.value = Math.max(0, Math.min(nodes.value.length, revealed.value + dir))
}

function reset() {
  clearTimer()
  playing.value = false
  revealed.value = reduce.value ? nodes.value.length : 0
}

onMounted(() => {
  try {
    reduce.value = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  } catch {
    reduce.value = false
  }
  reset()
  if (!reduce.value && nodes.value.length) timer = setTimeout(play, 400)
})

onBeforeUnmount(clearTimer)
watch(() => props.card, reset)
</script>

<style scoped>
.kt {
  margin-top: 10px; padding: 12px 14px 11px; border-radius: var(--radius-md);
  border: 1px solid rgba(99, 102, 241, 0.3); background: rgba(250, 250, 255, 0.72);
}
.kt-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kt-head-main { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kt-ic { font-size: 14px; }
.kt-title { font-size: 13px; font-weight: 700; color: #4f46e5; }
.kt-ctrl { margin-left: auto; display: inline-flex; gap: 6px; }
.kt-btn {
  padding: 5px 11px; border-radius: 999px; border: 1px solid var(--line);
  background: #fff; color: var(--ink2); font: inherit; font-size: 11.5px; font-weight: 600;
  cursor: pointer; transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.kt-btn:hover:not(:disabled) { background: var(--brand-soft); border-color: var(--brand-border, #c7d2fe); color: var(--brand-deep); }
.kt-btn.primary { background: var(--brand); border-color: var(--brand); color: #fff; }
.kt-btn.primary:hover:not(:disabled) { background: var(--brand-deep); color: #fff; }
.kt-btn:disabled { opacity: .45; cursor: not-allowed; }

.kt-track {
  display: flex; align-items: flex-start; gap: 0; margin: 14px 0 6px; padding: 0; list-style: none;
}
.kt-node {
  position: relative; flex: 1 1 0; min-width: 0; display: flex; flex-direction: column;
  align-items: center; text-align: center; padding: 0 3px;
}
.kt-line {
  position: absolute; top: 7px; left: 50%; width: 100%; height: 2px;
  background: var(--line); z-index: 0; overflow: hidden;
}
.kt-line-fill { display: block; height: 100%; width: 0; background: var(--brand); transition: width .4s ease; }
.kt-dot {
  position: relative; z-index: 1; width: 16px; height: 16px; border-radius: 50%;
  background: #fff; border: 2px solid var(--ink4); display: grid; place-items: center;
  transition: border-color .2s ease, background .2s ease, transform .2s ease;
}
.kt-dot-inner { width: 6px; height: 6px; border-radius: 50%; background: var(--ink4); transition: background .2s ease; }
.kt-node.on .kt-dot { border-color: var(--brand); }
.kt-node.on .kt-dot-inner { background: var(--brand); }
.kt-node.current .kt-dot { transform: scale(1.22); box-shadow: 0 0 0 4px var(--brand-soft); }
.kt-node.is-pass.on .kt-dot { border-color: var(--ok); }
.kt-node.is-pass.on .kt-dot-inner { background: var(--ok); }
.kt-node.is-stuck.on .kt-dot { border-color: var(--warn); }
.kt-node.is-stuck.on .kt-dot-inner { background: var(--warn); }
.kt-node.is-error.on .kt-dot { border-color: var(--err); }
.kt-node.is-error.on .kt-dot-inner { background: var(--err); }

.kt-label { margin-top: 7px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.kt-label b { font-size: 11.5px; color: var(--ink); font-weight: 700; }
.kt-label small {
  font-size: 10.5px; color: var(--ink2); line-height: 1.35;
  max-width: 12ch; margin: 0 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.kt-node.on .kt-label b { color: var(--brand-deep); }
.kt-action {
  margin-top: 5px; font-size: 10px; line-height: 1; color: var(--ink2);
  background: var(--bg2); border-radius: 999px; padding: 3px 7px; white-space: nowrap;
}
.kt-node.is-pass.on .kt-action { color: var(--ok-deep); background: var(--ok-bg); }
.kt-node.is-stuck.on .kt-action { color: var(--warn-deep); background: var(--warn-bg); }
.kt-node.is-error.on .kt-action { color: var(--err-deep); background: var(--err-bg); }

.kt-caption {
  margin: 8px 0 0; padding: 7px 10px; border-radius: 8px;
  font-size: 12px; line-height: 1.55; color: var(--ink2);
  background: #fff; border: 1px solid var(--line);
}
.kt-foot {
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  margin-top: 8px; font-size: 10.5px; color: var(--ink2);
}
.kt-summary { color: var(--ink2); line-height: 1.5; }

@media (max-width: 640px) {
  .kt-label small { max-width: 9ch; }
  .kt-action { font-size: 9.5px; padding: 3px 5px; }
  .kt-title { font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .kt-line-fill, .kt-dot, .kt-dot-inner, .kt-btn { transition: none; }
}
</style>
