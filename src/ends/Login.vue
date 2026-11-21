<template>
  <div class="ms-login">
    <div class="ms-login__hero">
      <div class="ms-login__brand">
        <div class="ms-login__mark">π</div>
        <div>智学数研 · Mathesis</div>
      </div>
      <div>
        <h1 class="ms-login__title">一道题，从上传到讲透。<br />一节课，从备课到学生打开。</h1>
        <p class="ms-login__sub">
          这是三端离线交互演示。学生上传真实题图、逐轮引导解题；教师在备课中心改课件并发布；学生端打开同一页；
          科研端完成阅读溯源、公式推导检查与写作编译。全部数据随包本地运行，断网可用。
        </p>
        <div class="ms-login__facts">
          <div class="ms-login__fact"><strong>3</strong><span>道真实高考题</span></div>
          <div class="ms-login__fact"><strong>3</strong><span>端现役壳层</span></div>
          <div class="ms-login__fact"><strong>0</strong><span>网络请求</span></div>
        </div>
      </div>
      <div style="font-size: 12.5px; color: rgba(255, 255, 255, 0.62)">
        演示版界面按现役系统采集制作 · 案例讲解与课件经过复核优化
      </div>
    </div>

    <div class="ms-login__panel">
      <div class="ms-login__card">
        <h2>选择演示身份</h2>
        <p class="hint">演示账号已预置样例数据；切换身份不会影响已保存的演示进度。</p>
        <div class="ms-role-list">
          <button class="ms-role" @click="enter('student')">
            <div class="ms-role__icon">🎓</div>
            <div class="ms-role__meta">
              <b>学生 · 林一川</b>
              <span>高二 (1) 班 · 上传题图 / 引导解题 / 双师课堂 / 错题</span>
            </div>
            <div class="ms-role__go">›</div>
          </button>
          <button class="ms-role" @click="enter('teacher')">
            <div class="ms-role__icon">🧑‍🏫</div>
            <div class="ms-role__meta">
              <b>教师 · 张老师</b>
              <span>高中数学 · 备课中心 / 课件与教案 / 发布 / 批改</span>
            </div>
            <div class="ms-role__go">›</div>
          </button>
          <button class="ms-role" @click="enter('research')">
            <div class="ms-role__icon">🔬</div>
            <div class="ms-role__meta">
              <b>科研 · Xu Chao</b>
              <span>科研工作台 · 阅读溯源 / 公式检查 / 写作编译</span>
            </div>
            <div class="ms-role__go">›</div>
          </button>
        </div>
        <div class="ms-login__foot">
          <span>演示环境 · 全部数据保存在本机</span>
          <button class="ms-link-btn" @click="openHost">主持人工具</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { store } from '../state/demo'

const router = useRouter()

const HOME = {
  student: '/student/dialog',
  teacher: '/teacher/prep',
  research: '/research',
}

function enter(role) {
  store.role = role
  router.push(HOME[role])
}

function openHost() {
  window.dispatchEvent(new CustomEvent('ms-open-host'))
}
</script>
