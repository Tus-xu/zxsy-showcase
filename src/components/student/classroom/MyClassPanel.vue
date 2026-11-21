<template>
  <div class="my-class" data-test="my-class-panel">
    <section class="my-class__hero">
      <div class="my-class__hero-main">
        <div class="my-class__hero-tags">
          <span class="ms-tag">🏫 {{ info.grade }} · {{ info.subject }}</span>
          <span class="ms-tag ms-tag--gray">共 {{ info.memberCount }} 人</span>
          <span class="ms-tag ms-tag--gray">演示数据</span>
        </div>
        <h2>{{ info.name }}</h2>
        <div class="my-class__hero-meta">
          <span>我的角色：{{ info.myRole }}</span>
          <span>任课老师：{{ info.teacher }}</span>
          <span>班级成员：{{ info.memberCount }}</span>
        </div>
      </div>
      <div class="my-class__hero-icon">🏫</div>
    </section>

    <div class="my-class__grid">
      <section class="ms-card my-class__card">
        <div class="my-class__card-head">
          <b>👥 班级成员</b>
          <span>{{ info.sourceLabel }}</span>
        </div>
        <div class="my-class__members">
          <div
            v-for="m in info.members"
            :key="m.name"
            class="my-class__member"
            :class="{ 'is-me': m.me, 'is-teacher': m.role === '任课老师' }"
          >
            <span class="my-class__avatar" :class="`tone-${m.tone}`">{{ m.avatar }}</span>
            <span class="my-class__member-name">
              {{ m.name }}
              <span v-if="m.me" class="my-class__me-tag">我</span>
            </span>
            <span class="my-class__member-role">{{ m.role }}</span>
          </div>
        </div>
      </section>

      <div class="my-class__right">
        <section class="ms-card my-class__card">
          <div class="my-class__card-head">
            <b>📣 班级动态 · 近 14 天</b>
          </div>
          <div class="my-class__empty">
            <span class="my-class__empty-icon">🌱</span>
            <p>演示环境暂无班级动态。老师发布课件或作业后，这里会出现通知。</p>
          </div>
        </section>
        <section class="ms-card my-class__card">
          <div class="my-class__card-head">
            <b>💡 错题共享 · 全班高频错题（近 30 天）</b>
            <span>按本班作业样例生成</span>
          </div>
          <div class="my-class__errors">
            <div v-for="e in info.sharedErrors" :key="e.id" class="my-class__error" :class="`level-${e.level}`">
              <span class="my-class__error-count">{{ e.count }} 人错了</span>
              <span class="my-class__error-label">{{ e.label }}</span>
              <span class="my-class__error-note">{{ e.note }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { classInfo } from '../../../data/classroom'

const info = classInfo
</script>

<style scoped>
.my-class {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.my-class__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 26px;
  border-radius: 18px;
  background: linear-gradient(120deg, #eef2ff 0%, #f4f7ff 52%, #ecfeff 100%);
  border: 1px solid #dfe5ff;
}
.my-class__hero-tags {
  display: flex;
  gap: 7px;
  margin-bottom: 9px;
  flex-wrap: wrap;
}
.my-class__hero h2 {
  margin: 0 0 7px;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink, #0f172a);
}
.my-class__hero-meta {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--ink2, #334155);
}
.my-class__hero-icon {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #dfe5ff;
  display: grid;
  place-items: center;
  font-size: 36px;
  flex: none;
}
.my-class__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: 16px;
  align-items: start;
}
.my-class__right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.my-class__card {
  padding: 16px 18px;
}
.my-class__card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.my-class__card-head b {
  font-size: 13.5px;
}
.my-class__card-head span {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
}
.my-class__members {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.my-class__member {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid transparent;
  font-size: 12.5px;
}
.my-class__member.is-me {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.my-class__member.is-teacher {
  background: #fffbeb;
  border-color: #fde68a;
}
.my-class__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  flex: none;
}
.tone-brand {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
}
.tone-cyan {
  background: linear-gradient(135deg, #06b6d4, #0284c7);
}
.tone-violet {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}
.tone-ok {
  background: linear-gradient(135deg, #10b981, #047857);
}
.tone-warn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.my-class__member-name {
  flex: 1;
  min-width: 0;
  color: var(--ink, #0f172a);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
}
.my-class__me-tag {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--brand-deep, #4338ca);
  background: #fff;
  border-radius: 4px;
  padding: 0 4px;
}
.my-class__member-role {
  font-size: 10.5px;
  color: var(--ink3, #94a3b8);
  flex: none;
}
.my-class__empty {
  padding: 14px 12px 18px;
  text-align: center;
  color: var(--ink3, #94a3b8);
}
.my-class__empty-icon {
  font-size: 26px;
  display: block;
  margin-bottom: 6px;
}
.my-class__empty p {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.7;
}
.my-class__errors {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.my-class__error {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 11.5px;
  flex-wrap: wrap;
}
.my-class__error.level-warn {
  background: #fffbeb;
}
.my-class__error.level-ok {
  background: #f0fdf4;
}
.my-class__error-count {
  font-weight: 700;
  color: var(--ink2, #334155);
  flex: none;
}
.my-class__error-label {
  font-weight: 700;
  color: var(--ink, #0f172a);
}
.my-class__error-note {
  color: var(--ink3, #94a3b8);
  flex: 1;
  min-width: 160px;
}
</style>
