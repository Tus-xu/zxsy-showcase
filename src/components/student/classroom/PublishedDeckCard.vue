<template>
  <!-- 单份课件：整行 hero（带发布快照预览） -->
  <button v-if="hero" type="button" class="pub-hero" :class="{ 'pub-hero--preset': record.preset }" data-test="published-deck-card" @click="$emit('open', record)">
    <div class="pub-hero__main">
      <div class="pub-card__top">
        <span class="pub-card__avatar">张</span>
        <div class="pub-card__who">
          <b>{{ record.editor || '张老师' }}</b>
          <span>发布到 {{ record.className || '高二 (1) 班' }}</span>
        </div>
        <span class="pub-card__tags">
          <span class="ms-tag">{{ versionLabel(record.version) }}</span>
          <span v-if="record.preset" class="ms-tag ms-tag--gray">预置发布版本</span>
          <span v-else-if="!record.isLatest" class="ms-tag ms-tag--gray">历史版本</span>
          <span v-else class="ms-tag ms-tag--ok">当前版本</span>
        </span>
      </div>
      <h3 class="pub-hero__title">{{ record.deckTitle }}</h3>
      <div class="pub-card__meta">
        <span>📄 {{ record.slides.length }} 页</span>
        <span>·</span>
        <span>发布 {{ formatTime(record.publishedAt) }}</span>
        <span v-if="record.meta?.duration">· {{ record.meta.duration }}</span>
      </div>
      <div class="pub-card__progress">
        <div class="pub-card__bar"><i :style="{ width: (progress?.pct || 0) + '%' }"></i></div>
        <span class="pub-card__progress-text">
          <template v-if="progress">我的进度 {{ progress.pct }}% · 第 {{ progress.page }}/{{ progress.total }} 页</template>
          <template v-else>未开始 · 点击打开第 1 页</template>
        </span>
      </div>
      <div class="pub-card__foot">
        <span class="pub-card__hint">AI 主讲逐页讲解 · 助教就当前页答疑</span>
        <span class="pub-card__cta">{{ progress ? '继续学习' : '开始学习' }} →</span>
      </div>
    </div>
    <div class="pub-hero__preview">
      <div class="pub-hero__preview-label">发布快照 · 前 3 页</div>
      <div v-for="(s, i) in record.slides.slice(0, 3)" :key="s.id || i" class="pub-hero__slide">
        <span class="pub-hero__no">{{ i + 1 }}</span>
        <b>{{ plainTitle(s.title) }}</b>
      </div>
      <div class="pub-hero__more">共 {{ record.slides.length }} 页 · 学生端严格按老师发布的快照渲染</div>
    </div>
  </button>

  <!-- 列表卡片（双师课堂 tab） -->
  <button v-else-if="!compact" type="button" class="pub-card" :class="{ 'pub-card--preset': record.preset }" data-test="published-deck-card" @click="$emit('open', record)">
    <div class="pub-card__top">
      <span class="pub-card__avatar">张</span>
      <div class="pub-card__who">
        <b>{{ record.editor || '张老师' }}</b>
        <span>{{ record.className || '高二 (1) 班' }}</span>
      </div>
      <span class="pub-card__tags">
        <span class="ms-tag">{{ versionLabel(record.version) }}</span>
        <span v-if="record.preset" class="ms-tag ms-tag--gray" title="教师端还没有发布记录，这里用 deck-ellipse 生成预置发布快照展示">预置发布版本</span>
        <span v-else-if="!record.isLatest" class="ms-tag ms-tag--gray">历史版本</span>
      </span>
    </div>
    <h3 class="pub-card__title">{{ record.deckTitle }}</h3>
    <div class="pub-card__meta">
      <span>📄 {{ record.slides.length }} 页</span>
      <span>·</span>
      <span>发布 {{ formatTime(record.publishedAt) }}</span>
      <span v-if="record.meta?.duration">· {{ record.meta.duration }}</span>
    </div>
    <div class="pub-card__progress">
      <div class="pub-card__bar"><i :style="{ width: (progress?.pct || 0) + '%' }"></i></div>
      <span class="pub-card__progress-text">
        <template v-if="progress">我的进度 {{ progress.pct }}% · 第 {{ progress.page }}/{{ progress.total }} 页</template>
        <template v-else>未开始 · 点击打开第 1 页</template>
      </span>
    </div>
    <div class="pub-card__foot">
      <span class="pub-card__hint">AI 主讲逐页讲解 · 助教就当前页答疑</span>
      <span class="pub-card__cta">{{ progress ? '继续学习' : '开始学习' }} →</span>
    </div>
  </button>

  <button v-else type="button" class="deck-task" data-test="courseware-task" @click="$emit('open', record)">
    <span class="deck-task__icon">🎞</span>
    <span class="deck-task__main">
      <span class="deck-task__line">
        <span class="ms-tag">老师课件</span>
        <b>{{ record.deckTitle }}</b>
        <span class="ms-tag ms-tag--gray">{{ versionLabel(record.version) }}</span>
        <span v-if="record.preset" class="ms-tag ms-tag--gray">预置发布版本</span>
        <span v-else-if="!record.isLatest" class="ms-tag ms-tag--gray">历史版本</span>
      </span>
      <span class="deck-task__meta">
        👩‍🏫 {{ record.editor || '张老师' }} · {{ record.className || '高二 (1) 班' }} · {{ record.slides.length }} 页 · 发布 {{ formatTime(record.publishedAt) }}
      </span>
      <span class="deck-task__progress">
        <span class="deck-task__bar"><i :style="{ width: (progress?.pct || 0) + '%' }"></i></span>
        <span>{{ progress ? `已看 ${progress.pct}% · 第 ${progress.page}/${progress.total} 页` : '尚未打开' }}</span>
      </span>
    </span>
    <span class="deck-task__status" :class="progress ? 'is-doing' : 'is-todo'">
      {{ progress ? (progress.status === 'completed' ? '已完成' : '进行中') : '未开始' }}
    </span>
    <span class="ms-btn ms-btn--primary ms-btn--sm">{{ progress ? '继续学习' : '开始学习' }}</span>
  </button>
</template>

<script setup>
import { formatTime, versionLabel } from './progress'
import { plainText } from '../../../data/classroom'

defineProps({
  record: { type: Object, required: true },
  progress: { type: Object, default: null },
  compact: { type: Boolean, default: false },
  hero: { type: Boolean, default: false },
})
defineEmits(['open'])

function plainTitle(title) {
  return plainText(title) || '未命名页面'
}
</script>

<style scoped>
/* ============ 卡片（双师课堂 tab） ============ */
.pub-card {
  width: 100%;
  text-align: left;
  border: 1px solid var(--line, #e2e8f0);
  background: #fff;
  border-radius: 16px;
  padding: 16px 18px 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04);
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: inherit;
}
.pub-card:hover {
  transform: translateY(-2px);
  border-color: #c7d2fe;
  box-shadow: 0 14px 34px rgba(79, 70, 229, 0.12);
}
.pub-card--preset {
  border-style: dashed;
  border-color: #cfd8ff;
}
.pub-card__top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pub-card__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  display: grid;
  place-items: center;
  flex: none;
}
.pub-card__who {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.pub-card__who b {
  font-size: 12.5px;
  color: var(--ink, #0f172a);
}
.pub-card__who span {
  font-size: 11px;
  color: var(--ink3, #94a3b8);
}
.pub-card__tags {
  margin-left: auto;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.pub-card__title {
  margin: 2px 0 0;
  font-size: 16.5px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink, #0f172a);
}
.pub-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
  flex-wrap: wrap;
}
.pub-card__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.pub-card__bar {
  height: 6px;
  flex: none;
  width: 132px;
  border-radius: 99px;
  background: #eef1f8;
  overflow: hidden;
}
.pub-card__bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #4f46e5, #06b6d4);
  transition: width 0.4s ease;
}
.pub-card__progress-text {
  font-size: 11.5px;
  color: var(--ink2, #334155);
}
.pub-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--line, #e2e8f0);
}
.pub-card__hint {
  font-size: 11px;
  color: var(--ink3, #94a3b8);
}
.pub-card__cta {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--brand, #4f46e5);
  white-space: nowrap;
}

/* ============ 单份课件 hero ============ */
.pub-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.65fr);
  gap: 22px;
  width: 100%;
  text-align: left;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 18px;
  padding: 18px 20px;
  background: linear-gradient(120deg, #ffffff 0%, #fbfcff 55%, #f4f7ff 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05);
  transition: all 0.18s ease;
  font-family: inherit;
}
.pub-hero:hover {
  transform: translateY(-2px);
  border-color: #c7d2fe;
  box-shadow: 0 16px 38px rgba(79, 70, 229, 0.12);
}
.pub-hero--preset {
  border-style: dashed;
  border-color: #cfd8ff;
}
.pub-hero__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pub-hero__title {
  margin: 2px 0 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink, #0f172a);
}
.pub-hero__preview {
  min-width: 0;
  border-left: 1px dashed var(--line, #e2e8f0);
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  justify-content: center;
}
.pub-hero__preview-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink3, #94a3b8);
}
.pub-hero__slide {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 10px;
  border-radius: 9px;
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  font-size: 12px;
  color: var(--ink2, #334155);
}
.pub-hero__no {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: var(--brand-soft, #eef2ff);
  color: var(--brand-deep, #4338ca);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  flex: none;
}
.pub-hero__slide b {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pub-hero__more {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
  margin-top: 2px;
}

/* ============ 任务行（课堂任务 tab） ============ */
.deck-task {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  padding: 14px 18px;
  border: 1px solid var(--line, #e2e8f0);
  border-left: 3px solid var(--brand, #4f46e5);
  border-radius: 14px;
  background: #fff;
  font-family: inherit;
  transition: all 0.16s ease;
}
.deck-task:hover {
  border-color: #c7d2fe;
  background: #fafbff;
}
.deck-task__icon {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 12px;
  background: var(--brand-soft, #eef2ff);
  display: grid;
  place-items: center;
  font-size: 20px;
}
.deck-task__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.deck-task__line {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 14px;
  color: var(--ink, #0f172a);
}
.deck-task__line b {
  font-size: 14px;
}
.deck-task__meta {
  font-size: 11.5px;
  color: var(--ink3, #94a3b8);
}
.deck-task__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--ink2, #334155);
}
.deck-task__bar {
  width: 132px;
  height: 5px;
  border-radius: 99px;
  background: #eef1f8;
  overflow: hidden;
  flex: none;
}
.deck-task__bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #06b6d4);
  border-radius: 99px;
  transition: width 0.4s ease;
}
.deck-task__status {
  font-size: 12px;
  font-weight: 700;
  flex: none;
}
.deck-task__status.is-todo {
  color: #b45309;
}
.deck-task__status.is-doing {
  color: var(--brand-deep, #4338ca);
}
</style>
