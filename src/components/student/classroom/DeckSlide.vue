<template>
  <article class="deck-slide" :class="{ 'deck-slide--title': isTitle }" :data-page="page">
    <header class="deck-slide__top">
      <span v-if="kickerText" class="deck-slide__kicker">{{ kickerText }}</span>
      <span class="deck-slide__brand">{{ brandText }}</span>
    </header>

    <!-- 封面页 -->
    <template v-if="isTitle">
      <div class="deck-slide__hero">
        <h2 class="deck-slide__title">{{ slide.title }}</h2>
        <p v-if="slide.subtitle" class="deck-slide__subtitle">{{ slide.subtitle }}</p>
        <p v-if="slide.lead" class="deck-slide__lead"><MathText :text="slide.lead" block /></p>
      </div>
      <footer class="deck-slide__foot">
        <span class="deck-slide__foot-text">{{ slide.footer || '' }}</span>
        <span class="deck-slide__pageno">{{ page }} / {{ total }}</span>
      </footer>
    </template>

    <!-- 内容页 -->
    <template v-else>
      <div class="deck-slide__head">
        <span class="deck-slide__bar"></span>
        <h2 class="deck-slide__h2">{{ slide.title }}</h2>
      </div>
      <div class="deck-slide__body" :class="{ 'deck-slide__body--split': hasAside }">
        <div class="deck-slide__main">
          <p v-if="slide.lead" class="deck-slide__lead"><MathText :text="slide.lead" block /></p>
          <div v-if="slide.equation" class="deck-slide__equation">
            <span class="deck-slide__eq-label">板书</span>
            <span class="deck-slide__eq-text">{{ slide.equation }}</span>
          </div>
          <ul v-if="hasBullets" class="deck-slide__bullets">
            <li v-for="(b, i) in slide.bullets" :key="i">
              <i class="deck-slide__dot"></i>
              <MathText :text="b" />
            </li>
          </ul>
        </div>
        <aside v-if="hasAside" class="deck-slide__aside">
          <figure v-if="slide.image" class="deck-slide__media">
            <img :src="slide.image" :alt="slide.imageCaption || '上传材料'" />
            <figcaption>{{ slide.imageCaption || '上传材料' }}</figcaption>
          </figure>
          <div v-else class="deck-slide__figure">
            <SlideFigure :deck-id="deckId" :page="page" :caption="slide.figure || ''" />
          </div>
        </aside>
      </div>
      <footer class="deck-slide__foot">
        <span class="deck-slide__foot-text">{{ slide.footer || '' }}</span>
        <span class="deck-slide__pageno">{{ page }} / {{ total }}</span>
      </footer>
    </template>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import MathText from '../../MathText.vue'
import SlideFigure from './SlideFigure.vue'

const props = defineProps({
  slide: { type: Object, default: () => ({}) },
  page: { type: Number, default: 1 },
  total: { type: Number, default: 1 },
  deckId: { type: String, default: '' },
  brand: { type: String, default: '' },
})

const isTitle = computed(() => props.slide.layout === 'title')
const hasAside = computed(() => !!(props.slide.image || props.slide.figure))
const hasBullets = computed(() => Array.isArray(props.slide.bullets) && props.slide.bullets.length > 0)
const brandText = computed(() => props.brand || '智学数研 · 双师课堂')
const kickerText = computed(() => props.slide.kicker || (isTitle.value ? '智学数研 · 双师课堂' : ''))
</script>

<style scoped>
.deck-slide {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: clamp(18px, 3.2cqw, 34px) clamp(22px, 3.8cqw, 42px) clamp(14px, 2.2cqw, 24px);
  background: #fff;
  color: var(--ink, #0f172a);
  overflow: hidden;
}
.deck-slide__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 22px;
  flex: none;
}
.deck-slide__kicker {
  font-size: clamp(11px, 1.35cqw, 14px);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--brand-deep, #4338ca);
  background: var(--brand-soft, #eef2ff);
  border-radius: 6px;
  padding: 2px 9px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 62%;
}
.deck-slide__brand {
  font-size: clamp(10.5px, 1.2cqw, 12.5px);
  color: var(--ink3, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ============ 封面 ============ */
.deck-slide__hero {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(8px, 1.2cqw, 14px);
  padding: clamp(6px, 1.4cqw, 18px) 0;
}
.deck-slide__title {
  margin: 0;
  font-size: clamp(28px, 5.2cqw, 52px);
  line-height: 1.16;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink, #0f172a);
}
.deck-slide__subtitle {
  margin: 0;
  font-size: clamp(14px, 2.2cqw, 21px);
  font-weight: 700;
  color: var(--brand, #4f46e5);
}
.deck-slide__lead {
  margin: 0;
  font-size: clamp(13.5px, 2.05cqw, 18.5px);
  line-height: 1.8;
  color: var(--ink2, #334155);
  max-width: 92%;
}

/* ============ 内容页 ============ */
.deck-slide__head {
  display: flex;
  align-items: flex-start;
  gap: clamp(8px, 1.4cqw, 14px);
  margin: clamp(8px, 1.6cqw, 18px) 0 clamp(6px, 1.2cqw, 12px);
  flex: none;
}
.deck-slide__bar {
  width: clamp(6px, 0.7cqw, 8px);
  align-self: stretch;
  min-height: clamp(22px, 3.4cqw, 34px);
  border-radius: 99px;
  background: linear-gradient(180deg, var(--brand, #4f46e5), var(--accent, #06b6d4));
  flex: none;
  margin-top: 3px;
}
.deck-slide__h2 {
  margin: 0;
  font-size: clamp(20px, 3.3cqw, 33px);
  line-height: 1.3;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink, #0f172a);
}
.deck-slide__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.1cqw, 11px);
  overflow: hidden;
}
.deck-slide__body--split {
  display: grid;
  grid-template-columns: minmax(0, 1.16fr) minmax(0, 0.84fr);
  gap: clamp(14px, 2.4cqw, 26px);
  align-items: center;
}
.deck-slide__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.1cqw, 12px);
  overflow: hidden;
}
.deck-slide__body--split .deck-slide__main {
  height: 100%;
  justify-content: center;
}
.deck-slide__equation {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: clamp(8px, 1.4cqw, 13px) clamp(10px, 1.8cqw, 16px);
  border-radius: 10px;
  border-left: 3px solid var(--brand, #4f46e5);
  background: linear-gradient(90deg, #f3f5ff 0%, #f8faff 100%);
}
.deck-slide__eq-label {
  flex: none;
  font-size: clamp(10.5px, 1.2cqw, 12.5px);
  font-weight: 700;
  color: var(--brand-deep, #4338ca);
  background: #fff;
  border: 1px solid #dfe5ff;
  border-radius: 5px;
  padding: 1px 6px;
  margin-top: 2px;
}
.deck-slide__eq-text {
  font-size: clamp(14.5px, 2.25cqw, 21px);
  line-height: 1.6;
  font-weight: 600;
  color: var(--ink, #0f172a);
  word-break: break-word;
}
.deck-slide__bullets {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.9cqw, 9px);
}
.deck-slide__bullets li {
  display: flex;
  align-items: flex-start;
  gap: clamp(7px, 1.1cqw, 11px);
  font-size: clamp(12.8px, 1.95cqw, 17.5px);
  line-height: 1.72;
  color: var(--ink2, #334155);
}
.deck-slide__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand, #4f46e5);
  flex: none;
  margin-top: 0.62em;
}
.deck-slide__aside {
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.deck-slide__figure {
  width: 100%;
  max-height: 100%;
  aspect-ratio: 440 / 300;
  border: 1px solid #e6ebff;
  border-radius: 14px;
  background: linear-gradient(160deg, #fbfcff 0%, #f4f7ff 100%);
  padding: clamp(6px, 1cqw, 10px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.deck-slide__media {
  margin: 0;
  width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.deck-slide__media img {
  width: 100%;
  max-height: clamp(110px, 24cqw, 230px);
  object-fit: contain;
  border: 1px solid #e6ebff;
  border-radius: 12px;
  background: #fff;
  padding: 6px;
}
.deck-slide__media figcaption {
  font-size: clamp(10.5px, 1.25cqw, 12.5px);
  color: var(--ink3, #94a3b8);
  text-align: center;
}

/* ============ 页脚 ============ */
.deck-slide__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: clamp(8px, 1.2cqw, 14px);
  margin-top: clamp(6px, 1cqw, 10px);
  border-top: 1px solid var(--line2, #f1f5f9);
  flex: none;
}
.deck-slide__foot-text {
  font-size: clamp(10.5px, 1.32cqw, 13px);
  color: var(--brand-mist, #818cf8);
  letter-spacing: 0.04em;
}
.deck-slide__pageno {
  font-family: var(--font-num, 'Inter', sans-serif);
  font-size: clamp(10.5px, 1.32cqw, 13px);
  color: var(--ink3, #94a3b8);
  font-weight: 600;
}
</style>
