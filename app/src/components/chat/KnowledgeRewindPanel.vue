<template>
  <Teleport to="body">
    <div v-if="review" class="krw-mask" @click.self="close">
      <section
        ref="panelEl"
        class="krw"
        role="dialog"
        aria-modal="true"
        aria-labelledby="krw-title"
        tabindex="-1"
        @keydown.esc.stop="close"
      >
        <header class="krw-head">
          <div class="krw-head-copy">
            <div class="krw-kicker">
              <span class="krw-kicker-dot"></span>
              知识回溯 · 第 {{ levelIndex + 1 }} / {{ maxLayers }} 层
              <span class="krw-kicker-sep">·</span>
              {{ review.short }}
            </div>
            <h2 id="krw-title">{{ level.title }}</h2>
            <p v-if="levelIndex === 0" class="krw-why">{{ review.why }}</p>
            <p v-else class="krw-why">换一种讲法，不重复刚才那段。把字母换成数字，再看一遍。</p>
          </div>
          <button type="button" class="krw-close" aria-label="关闭知识回溯" @click="close">✕</button>
        </header>

        <div class="krw-levelbar" aria-label="回溯层级">
          <div
            v-for="(lv, i) in levels" :key="lv.level"
            class="krw-level"
            :class="{ on: i === levelIndex, done: i < levelIndex }"
          >
            <span>{{ i < levelIndex ? '✓' : i + 1 }}</span>
            <b>{{ lv.label }}</b>
            <em>{{ levelStatus(i) }}</em>
          </div>
        </div>

        <div ref="bodyEl" class="krw-body">
          <div class="krw-visual">
            <KnowledgePathFigure
              v-if="currentVisual === 'path'"
              :labels="level.pathLabels || []"
              :details="level.pathDetails || []"
              :step="figureStep"
              :caption="level.pathCaption || ''"
              :reduced="reduce"
            />
            <KnowledgeRewindFigure v-else :mode="currentVisual" :step="figureStep" :reduced="reduce" />
            <div class="krw-visual-foot">
              <div class="krw-path" aria-label="本层知识路径">
                <span
                  v-for="(s, i) in level.steps" :key="s.kicker"
                  class="krw-path-node" :class="{ on: i < stepIndex, current: i === stepIndex - 1 }"
                >{{ s.kicker }}</span>
              </div>
              <div class="krw-anim-actions">
                <button type="button" class="krw-mini" :disabled="reduce || stepIndex <= 1" @click="step(-1)">上一步</button>
                <button type="button" class="krw-mini" :disabled="reduce || phase !== 'teach'" @click="toggleAuto">
                  {{ auto ? '暂停' : '继续' }}
                </button>
                <button type="button" class="krw-mini" :disabled="reduce" @click="replay">重播</button>
              </div>
            </div>
          </div>

          <div class="krw-copy">
            <div class="krw-speaker">
              <span class="krw-speaker-avatar">π</span>
              <b>AI 主讲</b>
              <span class="krw-speaker-state" :class="{ live: auto }">
                <i></i>{{ phase === 'teach' ? (auto ? '正在讲' : '已暂停') : phase === 'check' ? '讲完了，问你一句' : '回原题' }}
              </span>
            </div>

            <div class="krw-beats" aria-live="polite">
              <article
                v-for="(s, i) in visibleSteps" :key="i"
                class="krw-beat" :class="{ current: i === visibleSteps.length - 1 && phase === 'teach' }"
              >
                <div class="krw-beat-kicker">{{ s.kicker }}</div>
                <h3>{{ s.title }}</h3>
                <p>{{ s.text }}</p>
              </article>
              <p v-if="!visibleSteps.length" class="krw-lead">{{ review.why }}</p>
            </div>

            <div v-if="Array.isArray(review.citations) && review.citations.length" class="krw-cites">
              <div class="krw-cites-label">📖 知识依据</div>
              <SourceCard
                v-for="(c, i) in review.citations" :key="i" :c="c" :student-dialog="true"
                :open="openCite === i" @toggle="openCite = openCite === i ? -1 : i"
              />
            </div>

            <div v-if="phase === 'teach'" class="krw-teach-actions">
              <span>看动画时不用急着记，先跟着图走。</span>
              <button v-if="stepIndex < level.steps.length" type="button" class="krw-primary" @click="step(1)">下一步 →</button>
              <button v-else type="button" class="krw-primary" @click="phase = 'check'">讲完了，问我一句 →</button>
            </div>

            <div v-else-if="phase === 'check'" class="krw-check">
              <div class="krw-check-kicker">检查一下，不用逞强</div>
              <h3>{{ level.checkpoint.question }}</h3>
              <p>{{ level.checkpoint.hint }}</p>
              <div class="krw-check-actions">
                <button type="button" class="krw-primary" @click="settle('got')">跟上了，回原题</button>
                <button type="button" class="krw-secondary" @click="settle('unsure')">
                  {{ levelIndex + 1 < maxLayers ? '还有点懵，再退一层' : '还有点懵' }}
                </button>
              </div>
            </div>

            <div v-else-if="phase === 'done'" class="krw-settled">
              <div class="krw-settled-mark">✓</div>
              <h3>{{ review.finish.title }}</h3>
              <p>{{ review.finish.text }}</p>
              <div class="krw-settled-chips">
                <span v-for="s in level.steps" :key="s.kicker">{{ s.kicker }}</span>
              </div>
              <div class="krw-settled-actions">
                <button type="button" class="krw-primary" @click="$emit('finished')">{{ review.finish.cta }}</button>
                <button type="button" class="krw-secondary" @click="replay">再看一遍这一层</button>
              </div>
            </div>

            <div v-else-if="phase === 'floor'" class="krw-settled floor">
              <div class="krw-settled-mark">◎</div>
              <h3>{{ review.stillStuck.title }}</h3>
              <p>{{ review.stillStuck.text }}</p>
              <div class="krw-settled-actions">
                <button type="button" class="krw-primary" @click="$emit('finished')">{{ review.stillStuck.cta }}</button>
                <button type="button" class="krw-secondary" @click="goLevel(0)">从第 1 层再来</button>
              </div>
            </div>
          </div>
        </div>

        <footer class="krw-foot">
          <span>最多回退 2 层，不把知识点越堆越多。</span>
          <div>
            <button type="button" class="krw-ghost" @click="close">先回原题</button>
            <button v-if="phase !== 'done' && phase !== 'floor'" type="button" class="krw-ghost" @click="skipToCheck">快进到自评</button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import KnowledgeRewindFigure from './KnowledgeRewindFigure.vue'
import KnowledgePathFigure from './KnowledgePathFigure.vue'
import SourceCard from './SourceCard.vue'

const props = defineProps({
  review: { type: Object, default: null },
})
const emit = defineEmits(['close', 'finished'])

const panelEl = ref(null)
const bodyEl = ref(null)
const levelIndex = ref(0)
const stepIndex = ref(0)
const phase = ref('teach') // teach | check | done | floor
const auto = ref(true)
const reduce = ref(false)
const openCite = ref(-1)
let timer = null

const levels = computed(() => (Array.isArray(props.review?.levels) ? props.review.levels : []))
const maxLayers = computed(() => Math.min(2, levels.value.length || 2))
const level = computed(() => levels.value[levelIndex.value] || levels.value[0] || { steps: [], checkpoint: {} })
const visibleSteps = computed(() => (level.value.steps || []).slice(0, stepIndex.value))
const currentVisual = computed(() => level.value.steps?.[Math.max(0, stepIndex.value - 1)]?.visual || level.value.visual || 'three-sides')
const figureStep = computed(() => Math.max(0, Math.min(2, stepIndex.value - 1)))

function clearTimer() {
  if (timer) { clearTimeout(timer); timer = null }
}
function schedule() {
  clearTimer()
  if (reduce.value || !auto.value || phase.value !== 'teach') return
  if (stepIndex.value >= (level.value.steps || []).length) {
    auto.value = false
    timer = setTimeout(() => { phase.value = 'check' }, 900)
    return
  }
  timer = setTimeout(() => {
    if (phase.value !== 'teach' || !auto.value) return
    stepIndex.value += 1
    schedule()
  }, stepIndex.value === 0 ? 380 : 2500)
}
function levelStatus(i) {
  if (phase.value === 'done') return i < levelIndex.value ? '已走过' : i === levelIndex.value ? '已走完' : '还没到'
  if (phase.value === 'floor') return i < levelIndex.value ? '已走过' : i === levelIndex.value ? '已回原题' : '还没到'
  return i < levelIndex.value ? '已走过' : i === levelIndex.value ? '正在这里' : '还没到'
}
function resetLevel() {
  if (reduce.value) {
    stepIndex.value = (level.value.steps || []).length
    phase.value = 'check'
    auto.value = false
    clearTimer()
    return
  }
  stepIndex.value = 1
  phase.value = 'teach'
  auto.value = true
  schedule()
}
function goLevel(i) {
  levelIndex.value = Math.max(0, Math.min(maxLayers.value - 1, i))
  resetLevel()
}
function step(dir) {
  auto.value = false
  clearTimer()
  const max = (level.value.steps || []).length
  if (dir > 0) {
    if (stepIndex.value < max) stepIndex.value += 1
    else phase.value = 'check'
  } else if (stepIndex.value > 1) {
    stepIndex.value -= 1
  }
}
function toggleAuto() {
  auto.value = !auto.value
  if (auto.value) schedule()
  else clearTimer()
}
function replay() {
  goLevel(levelIndex.value)
}
function skipToCheck() {
  auto.value = false
  clearTimer()
  stepIndex.value = (level.value.steps || []).length
  phase.value = 'check'
}
function settle(kind) {
  auto.value = false
  clearTimer()
  if (kind === 'got') {
    phase.value = 'done'
    return
  }
  if (levelIndex.value + 1 < maxLayers.value) {
    goLevel(levelIndex.value + 1)
    return
  }
  phase.value = 'floor'
}
function close() {
  emit('close')
}
function scrollToAction() {
  nextTick(() => {
    const el = bodyEl.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: reduce.value ? 'auto' : 'smooth' })
  })
}
watch(phase, (p) => { if (p !== 'teach') scrollToAction() })

function reset() {
  clearTimer()
  try {
    reduce.value = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  } catch { reduce.value = false }
  levelIndex.value = 0
  stepIndex.value = reduce.value ? (levels.value[0]?.steps || []).length : 1
  phase.value = reduce.value ? 'check' : 'teach'
  auto.value = !reduce.value
  if (reduce.value) return
  schedule()
}

function onKey(e) {
  if (e.key === 'Escape') close()
}
onMounted(() => {
  reset()
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
  nextTick(() => panelEl.value?.focus?.())
})
onBeforeUnmount(() => {
  clearTimer()
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
watch(() => props.review, reset)

defineExpose({ reset })
</script>

<style scoped>
.krw-mask {
  position: fixed; inset: 0; z-index: 1400; background: rgba(15, 23, 42, .46);
  backdrop-filter: blur(5px); display: grid; place-items: center; padding: 24px;
}
.krw {
  width: min(1020px, 100%); max-height: min(90vh, 820px); display: flex; flex-direction: column;
  border-radius: 22px; background: #fff; border: 1px solid #e5eaf4;
  box-shadow: 0 30px 80px rgba(15, 23, 42, .28); overflow: hidden; outline: none;
}
.krw-head { display: flex; align-items: flex-start; gap: 16px; padding: 22px 26px 14px; background: linear-gradient(180deg, #fbfdff, #fff); }
.krw-head-copy { flex: 1; min-width: 0; }
.krw-kicker { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; color: #4f46e5; letter-spacing: .02em; }
.krw-kicker-dot { width: 6px; height: 6px; border-radius: 50%; background: #4f46e5; box-shadow: 0 0 0 4px #eef2ff; }
.krw-kicker-sep { color: #c7d2fe; }
.krw h2 { margin: 6px 0 4px; font-size: 24px; line-height: 1.3; color: #111827; letter-spacing: -.01em; text-wrap: balance; }
.krw-why { margin: 0; max-width: 70ch; font-size: 13px; line-height: 1.7; color: #64748b; }
.krw-close {
  flex: none; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e5e9f2;
  background: #fff; color: #64748b; font-size: 15px; cursor: pointer;
}
.krw-close:hover { background: #f1f5f9; color: #1f2937; }
.krw-levelbar { display: flex; gap: 8px; padding: 0 26px 14px; }
.krw-level {
  flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0;
  padding: 8px 10px; border: 1px solid #eef2f7; border-radius: 10px; background: #fbfcff;
}
.krw-level > span {
  width: 21px; height: 21px; border-radius: 50%; display: grid; place-items: center;
  background: #eef2ff; color: #64748b; font-size: 10px; font-weight: 800; flex: none;
}
.krw-level b { font-size: 11.5px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.krw-level em { font-style: normal; margin-left: auto; font-size: 10.5px; color: #64748b; white-space: nowrap; }
.krw-level.on { border-color: #c7d2fe; background: #eef2ff; }
.krw-level.on > span { background: #4f46e5; color: #fff; }
.krw-level.on b { color: #4338ca; }
.krw-level.done > span { background: #dcfce7; color: #15803d; }
.krw-level.done em { color: #15803d; }
.krw-body {
  display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr); gap: 18px;
  padding: 0 26px 16px; min-height: 0; overflow: auto;
}
.krw-visual { min-height: 330px; display: flex; flex-direction: column; gap: 9px; align-self: start; }
.krw-visual > :first-child { flex: 0 0 auto; height: min(342px, 39vh); }
.krw-visual-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.krw-path { display: flex; align-items: center; gap: 5px; flex: 1; min-width: 0; flex-wrap: wrap; }
.krw-path-node {
  font-size: 10.5px; font-weight: 700; color: #64748b; background: #f8fafc;
  border: 1px solid #eef2f7; border-radius: 999px; padding: 3px 8px; white-space: nowrap;
}
.krw-path-node.on { color: #4f46e5; background: #eef2ff; border-color: #c7d2fe; }
.krw-path-node.current { color: #fff; background: #4f46e5; border-color: #4f46e5; }
.krw-anim-actions { display: flex; gap: 5px; flex: none; }
.krw-mini {
  border: 1px solid #e5e9f2; background: #fff; color: #475569; border-radius: 999px;
  min-height: 30px; padding: 5px 11px; font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer;
}
.krw-mini:hover:not(:disabled) { border-color: #c7d2fe; color: #4f46e5; background: #eef2ff; }
.krw-mini:disabled { opacity: .4; cursor: not-allowed; }
.krw-copy { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.krw-speaker { display: flex; align-items: center; gap: 7px; min-height: 30px; }
.krw-speaker-avatar {
  width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
  background: linear-gradient(135deg, #4f46e5, #818cf8); color: #fff; font: 800 15px/1 var(--font-serif);
}
.krw-speaker b { font-size: 12px; color: #1f2937; }
.krw-speaker-state { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; font-size: 10.5px; font-weight: 700; color: #64748b; }
.krw-speaker-state i { width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1; }
.krw-speaker-state.live { color: #4f46e5; }
.krw-speaker-state.live i { background: #4f46e5; animation: krw-pulse 1.5s ease-in-out infinite; }
@keyframes krw-pulse { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
.krw-beats { flex: 1; min-height: 170px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 2px; }
.krw-beat { padding: 9px 11px; border-radius: 10px; border: 1px solid transparent; background: #fbfcff; }
.krw-beat.current { border-color: #dbe4ff; background: #f8faff; }
.krw-beat-kicker { font-size: 10px; font-weight: 800; color: #4f46e5; letter-spacing: .02em; }
.krw-beat h3 { margin: 2px 0 3px; font-size: 14px; line-height: 1.5; color: #111827; }
.krw-beat p { margin: 0; font-size: 13px; line-height: 1.72; color: #475569; }
.krw-lead { margin: 0; font-size: 12.5px; line-height: 1.75; color: #64748b; }
.krw-teach-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-top: 2px; }
.krw-teach-actions > span { flex: 1; min-width: 150px; font-size: 10.5px; color: #94a3b8; line-height: 1.5; }
.krw-primary, .krw-secondary, .krw-ghost {
  border-radius: 999px; font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer;
  min-height: 38px; padding: 8px 14px; white-space: nowrap;
}
.krw-primary { border: 1px solid #4f46e5; background: #4f46e5; color: #fff; box-shadow: 0 5px 14px rgba(79, 70, 229, .22); }
.krw-primary:hover { background: #4338ca; }
.krw-secondary { border: 1px solid #e5e9f2; background: #fff; color: #64748b; }
.krw-secondary:hover { border-color: #c7d2fe; color: #4f46e5; background: #eef2ff; }
.krw-ghost { border: 1px solid transparent; background: transparent; color: #475569; min-height: 32px; padding: 6px 9px; }
.krw-ghost:hover { color: #4f46e5; background: #eef2ff; }
.krw-check { padding: 12px; border: 1px solid #dbe4ff; background: #f8faff; border-radius: 12px; }
.krw-check-kicker { font-size: 10px; font-weight: 800; color: #4f46e5; letter-spacing: .02em; }
.krw-check h3 { margin: 4px 0 4px; font-size: 15px; color: #111827; }
.krw-check p { margin: 0 0 10px; font-size: 12px; line-height: 1.65; color: #64748b; }
.krw-check-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.krw-settled { padding: 14px; border: 1px solid #d1fae5; background: #f0fdf4; border-radius: 12px; }
.krw-settled.floor { border-color: #fde68a; background: #fffbeb; }
.krw-settled-mark { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: #dcfce7; color: #15803d; font-weight: 900; }
.krw-settled.floor .krw-settled-mark { background: #fef3c7; color: #b45309; }
.krw-settled h3 { margin: 8px 0 4px; font-size: 15px; color: #111827; }
.krw-settled p { margin: 0 0 10px; font-size: 12.5px; line-height: 1.7; color: #475569; }
.krw-settled-chips { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; }
.krw-settled-chips span { font-size: 10px; color: #15803d; background: #dcfce7; border-radius: 999px; padding: 3px 8px; }
.krw-settled-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.krw-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 11px 26px; border-top: 1px solid #eef2f7; background: #fbfcff;
}
.krw-foot > span { font-size: 11px; color: #64748b; }
.krw-foot > div { display: flex; gap: 6px; align-items: center; }

@media (max-width: 860px) {
  .krw-mask { padding: 10px; }
  .krw { max-height: 94vh; border-radius: 16px; }
  .krw-head { padding: 16px 16px 10px; }
  .krw h2 { font-size: 20px; }
  .krw-levelbar { padding: 0 16px 10px; }
  .krw-level em { display: none; }
  .krw-body { grid-template-columns: 1fr; padding: 0 16px 12px; gap: 12px; }
  .krw-visual { min-height: 240px; }
  .krw-foot { padding: 9px 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .krw-speaker-state.live i { animation: none; }
}

.krw-cites { display: flex; flex-direction: column; gap: 5px; padding-top: 2px; }
.krw-cites-label { font-size: 10.5px; font-weight: 800; color: #0f766e; letter-spacing: .02em; }
.krw-cites :deep(.src-card) { max-width: 100%; min-width: 0; }
.krw-cites :deep(.src-toggle) { padding: 5px 7px; }
</style>
