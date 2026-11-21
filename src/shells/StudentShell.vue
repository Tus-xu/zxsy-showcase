<template>
  <div class="layout" :class="{ collapsed }">
    <div class="ambient" aria-hidden="true">
      <span class="ambient-b1"></span><span class="ambient-b2"></span><span class="ambient-b3"></span>
    </div>

    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="mark">π</div>
          <span>智学数研</span>
          <span class="sub">学生端</span>
        </div>
        <div class="spacer"></div>
        <div class="right">
          <span class="streak" title="连续学习 7 天 · 继续加油">
            <span class="ic">🔥</span>
            <span><span class="num">7</span> 连击</span>
          </span>
          <div class="user-wrap">
            <button type="button" class="user-chip" title="账号菜单" @click.stop="userMenu = !userMenu">
              <div class="avatar">林</div>
              <div class="text">
                <span class="name">林一川</span>
                <span class="sub">高二 (1) 班</span>
              </div>
            </button>
            <div v-if="userMenu" class="user-menu" @click.stop>
              <button type="button" class="user-menu__item" @click="go('/student/me')">进入个人中心</button>
              <button type="button" class="user-menu__item user-menu__item--danger" @click="switchRole">切换演示身份</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <aside class="sidebar">
      <div class="sb-nav-head">
        <h4>学习闭环</h4>
        <button class="collapse-btn" :title="collapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleCollapsed">
          {{ collapsed ? '»' : '«' }}
        </button>
      </div>
      <div
        v-for="item in nav"
        :key="item.key"
        class="nav-item"
        :class="{ active: isActive(item) }"
        :data-tip="item.name"
        @click="go(item.to)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="txt">{{ item.name }}</span>
        <span v-if="item.badge" class="badge">{{ item.badge }}</span>
      </div>
    </aside>

    <main class="main">
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
    </main>

    <div class="ms-butler" title="AI 管家（演示）" @click="butlerOpen = !butlerOpen">🤖</div>
    <div v-if="butlerOpen" class="ms-butler-panel" @click.stop>
      <div class="ms-butler-panel__head">
        <b>AI 管家</b>
        <span class="ms-tag ms-tag--ok">在线</span>
      </div>
      <p class="ms-butler-panel__hint">今天有 2 个待办，2 道错题待复习。</p>
      <button class="ms-butler-panel__item" @click="go('/student/classroom')">🎓 课堂待完成任务 <span>1</span></button>
      <button class="ms-butler-panel__item" @click="go('/student/errors')">📕 错题复习 <span>2</span></button>
      <button class="ms-butler-panel__item" @click="go('/student/dialog')">🏠 回到首页</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ErrorBoundary from '../components/ErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const collapsed = ref(localStorage.getItem('ms_sidebar_collapsed') === '1')
const userMenu = ref(false)
const butlerOpen = ref(false)
document.addEventListener('click', () => {
  userMenu.value = false
  butlerOpen.value = false
})

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  localStorage.setItem('ms_sidebar_collapsed', collapsed.value ? '1' : '0')
}

const nav = [
  { key: 'home', icon: '🏠', name: '首页', to: '/student/dialog' },
  { key: 'practice', icon: '✏️', name: '练题', to: '/student/practice', badge: '沉浸' },
  { key: 'errors', icon: '📕', name: '错题', to: '/student/errors', badge: '2' },
  { key: 'library', icon: '📚', name: '知识库', to: '/student/library' },
  { key: 'resources', icon: '📺', name: '资源中心', to: '/student/resources' },
  { key: 'classroom', icon: '🎓', name: '课堂', to: '/student/classroom', badge: '1' },
  { key: 'me', icon: '👤', name: '我的', to: '/student/me' },
]

const isActive = (item) =>
  route.path === item.to || (item.to && route.path.startsWith(item.to + '/')) || (item.key === 'home' && route.path.startsWith('/student/guide'))

function go(to) {
  if (to) router.push(to)
}
function switchRole() {
  router.push('/login')
}
</script>

<style scoped>
/* 从原 V4Layout 组件 scoped 样式迁移（vendor CSS 不含这些局部样式） */
.sb-nav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.sb-nav-head h4 {
  margin: 0;
}
.layout.collapsed .sb-nav-head {
  justify-content: center;
  margin-bottom: 2px;
}
.ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.ambient-b1 {
  position: absolute;
  top: -80px;
  left: -60px;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.1);
  filter: blur(70px);
}
.ambient-b2 {
  position: absolute;
  top: -40px;
  right: -80px;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  background: rgba(6, 182, 212, 0.08);
  filter: blur(70px);
}
.ambient-b3 {
  position: absolute;
  bottom: -100px;
  left: 30%;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.07);
  filter: blur(80px);
}

.ms-butler {
  position: fixed;
  right: 22px;
  bottom: 24px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.28);
  display: grid;
  place-items: center;
  font-size: 22px;
  cursor: pointer;
  z-index: 60;
  border: 1px solid rgba(79, 70, 229, 0.18);
}
.ms-butler:hover {
  transform: translateY(-2px);
}
.ms-butler-panel {
  position: fixed;
  right: 22px;
  bottom: 80px;
  width: 280px;
  background: #fff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
  padding: 14px;
  z-index: 61;
}
.ms-butler-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13.5px;
  margin-bottom: 6px;
}
.ms-butler-panel__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--ink3, #94a3b8);
}
.ms-butler-panel__item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0;
  background: var(--bg2, #f1f5f9);
  border-radius: 10px;
  padding: 9px 11px;
  margin-bottom: 7px;
  font-size: 12.5px;
  color: var(--ink2, #334155);
}
.ms-butler-panel__item:hover {
  background: var(--brand-soft, #eef2ff);
  color: var(--brand-deep, #4338ca);
}
</style>
