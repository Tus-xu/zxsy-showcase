<template>
  <div class="st-theme" :data-theme="prefs.theme" :data-font="prefs.font" :style="themeStyle">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../../state/demo'

/**
 * 学生端「本场景」显示主题作用域。
 *
 * 个人设置里的主题/字号是真实生效的本地设置：
 *  - 主题通过覆盖设计令牌（--bg/--card/--ink/--brand…）并补几条 .ms-* 覆盖，
 *    对所有使用 StudentThemeScope 的学生页面（练题/错题/知识库/资源中心/我的）生效；
 *  - 字号通过 --st-read 作用到题干、解析、资料原文等阅读区；
 *  - 设置写入 store.ext.studentPrefs，store 已持久化，刷新后保留。
 */
const THEME_VARS = {
  light: {},
  warm: {
    '--bg': '#fbf4ea',
    '--bg2': '#f6ead9',
    '--card': '#fffaf2',
    '--ink': '#3e2c1f',
    '--ink2': '#6b5342',
    '--ink3': '#9a8674',
    '--ink4': '#d7c3ad',
    '--line': '#ecdccb',
    '--line2': '#f4e8da',
    '--brand': '#b45309',
    '--brand2': '#d97706',
    '--brand-deep': '#92400e',
    '--brand-soft': '#fdf1e0',
    '--brand-faint': '#fbe4c6',
    '--ok-deep': '#047857',
    '--warn-deep': '#92400e',
    '--err-deep': '#991b1b',
  },
  dark: {
    '--bg': '#0f172a',
    '--bg2': '#1b2437',
    '--card': '#172033',
    '--ink': '#e5e9f2',
    '--ink2': '#c3cddd',
    '--ink3': '#8b9bb2',
    '--ink4': '#46566e',
    '--line': '#2b3a52',
    '--line2': '#243247',
    '--brand': '#8b95f8',
    '--brand2': '#a5b4fc',
    '--brand-deep': '#c7d2fe',
    '--brand-soft': '#26305a',
    '--brand-faint': '#1e2a4a',
    '--ok-deep': '#6ee7b7',
    '--warn-deep': '#fcd34d',
    '--err-deep': '#fca5a5',
    '--ok-bg': '#0d2f25',
    '--warn-bg': '#3a2a10',
    '--err-bg': '#3a1a1a',
  },
}

function ensurePrefs() {
  if (!store.ext.studentPrefs || typeof store.ext.studentPrefs !== 'object') {
    store.ext.studentPrefs = { theme: 'light', font: 'normal' }
  }
  if (!THEME_VARS[store.ext.studentPrefs.theme]) store.ext.studentPrefs.theme = 'light'
  if (!['normal', 'large'].includes(store.ext.studentPrefs.font)) store.ext.studentPrefs.font = 'normal'
  return store.ext.studentPrefs
}

const prefs = ensurePrefs()

const themeStyle = computed(() => ({
  ...(THEME_VARS[prefs.theme] || {}),
  '--st-read': prefs.font === 'large' ? '16px' : '14px',
  '--st-read-lg': prefs.font === 'large' ? '18.5px' : '16px',
}))
</script>

<style scoped>
.st-theme {
  min-height: 100%;
  background: var(--bg, transparent);
  color: var(--ink, inherit);
  transition: background 0.2s ease, color 0.2s ease;
}
.st-theme[data-theme='warm'],
.st-theme[data-theme='dark'] {
  border-radius: 20px;
  border: 1px solid var(--line);
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.1);
}
</style>

<style>
/* 主题覆盖：.ms-card / .ms-btn 在 app.css 里写死了白底，这里按主题补齐。
   放在普通 <style>（非 scoped）中，选择器都带 .st-theme 祖先，不会影响不在作用域内的页面。 */
.st-theme[data-theme='warm'] .ms-card,
.st-theme[data-theme='dark'] .ms-card {
  background: var(--card);
  border-color: var(--line);
}
.st-theme[data-theme='warm'] .ms-btn,
.st-theme[data-theme='dark'] .ms-btn {
  background: var(--card);
  border-color: var(--line);
  color: var(--ink2);
}
.st-theme[data-theme='warm'] .ms-btn:hover:not(:disabled),
.st-theme[data-theme='dark'] .ms-btn:hover:not(:disabled) {
  border-color: var(--brand);
  color: var(--brand-deep);
}
.st-theme[data-theme='warm'] .ms-btn--primary,
.st-theme[data-theme='dark'] .ms-btn--primary {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.st-theme[data-theme='warm'] .ms-tag,
.st-theme[data-theme='dark'] .ms-tag {
  background: var(--brand-soft);
  color: var(--brand-deep);
}
.st-theme[data-theme='warm'] .ms-tag--gray,
.st-theme[data-theme='dark'] .ms-tag--gray {
  background: var(--bg2);
  color: var(--ink2);
}
.st-theme[data-theme='warm'] .ms-tag--ok,
.st-theme[data-theme='dark'] .ms-tag--ok {
  background: var(--ok-bg);
  color: var(--ok-deep);
}
.st-theme[data-theme='warm'] .ms-tag--warn,
.st-theme[data-theme='dark'] .ms-tag--warn {
  background: var(--warn-bg);
  color: var(--warn-deep);
}
.st-theme[data-theme='warm'] .ms-tag--err,
.st-theme[data-theme='dark'] .ms-tag--err {
  background: var(--err-bg);
  color: var(--err-deep);
}
.st-theme[data-theme='dark'] .ms-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
}
</style>
