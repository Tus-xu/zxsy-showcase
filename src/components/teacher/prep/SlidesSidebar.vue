<!-- 左侧幻灯片缩略图列表：点选、上下移动（编辑状态写入 store.ext.teacherPrep） -->
<template>
  <aside class="slides-sidebar" data-testid="slides-sidebar">
    <div class="slides-sidebar__head">
      <span>幻灯片</span>
      <span class="slides-sidebar__count">{{ slides.length }} 页</span>
    </div>
    <div class="slides-sidebar__list">
      <div
        v-for="(slide, i) in slides"
        :key="slide.id || i"
        class="slide-row"
        :class="{ 'is-active': i === activeIndex }"
        :data-testid="`slide-thumb-${i}`"
        role="button"
        tabindex="0"
        @click="$emit('select', i)"
        @keydown.enter="$emit('select', i)"
      >
        <span class="slide-row__num">{{ i + 1 }}</span>
        <div class="slide-row__thumb" :class="`slide-row__thumb--${deckId}`">
          <div v-if="slide.layout === 'title'" class="mini mini--cover">
            <span class="mini__cover-title">{{ slide.title }}</span>
          </div>
          <div v-else class="mini">
            <span class="mini__title">{{ slide.title }}</span>
            <span v-if="hasFigure(slide)" class="mini__figure">
              <svg viewBox="0 0 60 30" aria-hidden="true">
                <ellipse v-if="deckId === 'deck-ellipse'" cx="30" cy="15" rx="22" ry="11" fill="none" stroke="#2563eb" stroke-width="1.4" />
                <path v-else-if="deckId === 'deck-quadratic'" d="M8 4 Q30 30 52 4" fill="none" stroke="#2563eb" stroke-width="1.4" />
                <g v-else>
                  <circle cx="30" cy="15" r="12" fill="none" stroke="#2563eb" stroke-width="1.2" />
                  <circle cx="30" cy="15" r="6" fill="#dbeafe" stroke="#2563eb" stroke-width="1.2" />
                </g>
              </svg>
            </span>
            <span v-else class="mini__lines">
              <i /><i /><i />
            </span>
          </div>
        </div>
        <div class="slide-row__meta">
          <b class="slide-row__title">{{ slide.title }}</b>
          <span class="slide-row__desc">{{ describe(slide) }}</span>
        </div>
        <div class="slide-row__ops" @click.stop>
          <button
            class="slide-row__op"
            type="button"
            title="上移"
            :disabled="i === 0"
            :data-testid="`slide-move-up-${i}`"
            @click="$emit('move', i, -1)"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 10 4-4 4 4" /></svg>
          </button>
          <button
            class="slide-row__op"
            type="button"
            title="下移"
            :disabled="i === slides.length - 1"
            :data-testid="`slide-move-down-${i}`"
            @click="$emit('move', i, 1)"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 6 4 4 4-4" /></svg>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
const props = defineProps({
  slides: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: 0 },
  deckId: { type: String, default: '' },
})
defineEmits(['select', 'move'])

function hasFigure(slide) {
  const id = slide?.id || ''
  if (props.deckId === 'deck-ellipse') return ['s3', 's4', 's5'].includes(id)
  if (props.deckId === 'deck-quadratic') return ['s2', 's3', 's4'].includes(id)
  if (props.deckId === 'deck-set') return slide?.layout === 'content'
  return false
}

function describe(slide) {
  const text = slide?.lead || slide?.subtitle || slide?.note || ''
  const plain = String(text)
    .replace(/\$[^$]*\$/g, (m) => m.replace(/\$/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > 26 ? `${plain.slice(0, 26)}…` : plain
}
</script>

<style scoped>
.slides-sidebar {
  width: 264px;
  flex: none;
  border-right: 1px solid #e5e9f2;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.slides-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.02em;
}
.slides-sidebar__count {
  font-weight: 500;
  color: #94a3b8;
  font-size: 11.5px;
}
.slides-sidebar__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.slide-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 6px 7px 2px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}
.slide-row:hover {
  background: #f8fafc;
}
.slide-row.is-active {
  background: #eff4ff;
  border-color: #a2befd;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
}
.slide-row__num {
  width: 14px;
  flex: none;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}
.slide-row.is-active .slide-row__num {
  color: #2563eb;
}
.slide-row__thumb {
  position: relative;
  width: 92px;
  height: 52px;
  flex: none;
  border-radius: 6px;
  background: #fbfdff;
  border: 1px solid #e3e8f2;
  overflow: hidden;
}
.slide-row__thumb--deck-ellipse.is-title-layout,
.slide-row__thumb--deck-quadratic {
  border-color: #e3e8f2;
}
.slide-row__badge {
  position: absolute;
  left: 4px;
  top: 3px;
  font-size: 8px;
  color: #fff;
  background: #2563eb;
  border-radius: 3px;
  padding: 0 3px;
  line-height: 1.5;
}
.mini {
  width: 100%;
  height: 100%;
  padding: 8px 7px 5px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mini--cover {
  background: linear-gradient(135deg, #eff4ff 0%, #f8fbff 60%, #eef2ff 100%);
  justify-content: center;
  padding: 6px 8px;
}
.mini__cover-title {
  font-size: 9px;
  font-weight: 800;
  color: #1e3a8a;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mini__title {
  font-size: 7.5px;
  font-weight: 700;
  color: #334155;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini__figure {
  display: flex;
  justify-content: center;
  flex: 1;
  min-height: 0;
}
.mini__figure svg {
  width: 100%;
  height: 100%;
}
.mini__lines {
  display: flex;
  flex-direction: column;
  gap: 2.5px;
  margin-top: 2px;
}
.mini__lines i {
  display: block;
  height: 2px;
  border-radius: 2px;
  background: #dbe3f0;
}
.mini__lines i:nth-child(1) {
  width: 88%;
}
.mini__lines i:nth-child(2) {
  width: 70%;
}
.mini__lines i:nth-child(3) {
  width: 80%;
}
.slide-row__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.slide-row__title {
  font-size: 12.5px;
  font-weight: 700;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slide-row.is-active .slide-row__title {
  color: #1d4ed8;
}
.slide-row__desc {
  font-size: 10.5px;
  line-height: 1.45;
  color: #94a3b8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.slide-row__ops {
  position: absolute;
  right: 3px;
  top: 50%;
  transform: translateY(-50%);
  display: none;
  flex-direction: column;
  gap: 2px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e5e9f2;
  border-radius: 7px;
  padding: 2px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
}
.slide-row:hover .slide-row__ops {
  display: flex;
}
.slide-row__op {
  width: 18px;
  height: 17px;
  border: 0;
  background: none;
  border-radius: 4px;
  color: #475569;
  display: grid;
  place-items: center;
  padding: 0;
}
.slide-row__op:hover:not(:disabled) {
  background: #eff4ff;
  color: #2563eb;
}
.slide-row__op:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
