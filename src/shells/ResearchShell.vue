<template>
  <div class="rw-shell" data-research-app>
    <div class="rw-ambient" aria-hidden="true">
      <span class="rw-ambient__b1"></span><span class="rw-ambient__b2"></span><span class="rw-ambient__b3"></span>
    </div>

    <header class="rw-header">
      <div class="rw-header__brand">
        <div class="rw-header__logo">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <path d="M4 19 8 5M10 19l4-14M16 19l4-14" />
          </svg>
        </div>
        <div>
          <div class="rw-header__title">科研工作台</div>
          <div class="rw-header__sub">让研究更高效，让思想走更远</div>
        </div>
      </div>

      <div class="rw-header__center">
        <button class="rw-project-pill" @click.stop="projectOpen = !projectOpen">
          <span class="rw-project-pill__icon">📄</span>
          <span class="rw-project-pill__name">{{ project.name }}</span>
          <span class="rw-project-pill__caret">▾</span>
        </button>
        <div v-if="projectOpen" class="rw-project-menu" @click.stop>
          <button
            v-for="p in projects"
            :key="p.id"
            class="rw-project-menu__item"
            :class="{ active: p.id === project.id }"
            @click="selectProject(p)"
          >
            <b>{{ p.name }}</b>
            <small>{{ p.desc }}</small>
          </button>
        </div>
        <div class="rw-seg">
          <button class="rw-seg__item" :class="{ active: isRead }" @click="go('/research/read')">阅读</button>
          <button class="rw-seg__item" :class="{ active: isWrite }" @click="go('/research/write')">写作</button>
        </div>
      </div>

      <div class="rw-header__right">
        <span class="rw-sync"><span class="dot"></span>已同步 · 今天 {{ nowText }}</span>
        <button class="rw-head-btn" @click="go('/research/read')">历史</button>
        <button class="rw-head-btn rw-head-btn--bell">🔔<span class="badge">3</span></button>
        <div class="rw-user" @click.stop="userOpen = !userOpen">
          <div class="rw-user__avatar">徐</div>
          <span class="rw-user__name">Xu Chao</span>
          <span class="rw-user__caret">▾</span>
          <div v-if="userOpen" class="rw-user__menu" @click.stop>
            <button @click="go('/research/read')">阅读工作区</button>
            <button @click="go('/research/write')">写作工作区</button>
            <button class="danger" @click="switchRole">切换演示身份</button>
          </div>
        </div>
      </div>
    </header>

    <div class="rw-body">
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { researchProjects } from '../data/research'
import { store } from '../state/demo'
import ErrorBoundary from '../components/ErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const projectOpen = ref(false)
const userOpen = ref(false)
const projects = researchProjects
let hideTimer = null

const project = computed(() => projects.find((p) => p.id === store.research.projectId) || projects[0])
const isRead = computed(() => route.path.startsWith('/research/read') || route.path === '/research')
const isWrite = computed(() => route.path.startsWith('/research/write'))
const nowText = '10:24'

document.addEventListener('click', () => {
  projectOpen.value = false
  userOpen.value = false
})

function selectProject(p) {
  store.research.projectId = p.id
  projectOpen.value = false
}
function go(path) {
  router.push(path)
}
function switchRole() {
  router.push('/login')
}
onMounted(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>
