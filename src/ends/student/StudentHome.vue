<template>
  <div class="page student-home">
    <div class="student-home__hello">
      <div>
        <h1 class="page-title">早上好，林一川 <span class="student-home__wave">👋</span></h1>
        <p class="page-sub">今天距高考还有 <b>198</b> 天 · 连续学习第 <b>7</b> 天</p>
      </div>
      <div class="student-home__streak-card">
        <span>本周独立解题率</span>
        <b>68%</b>
        <span class="trend">↑ 6%</span>
      </div>
    </div>

    <!-- 上传题图 -->
    <section class="student-home__upload ms-card">
      <div class="student-home__upload-left">
        <div class="student-home__upload-icon">📷</div>
        <div>
          <h2>上传题目，开始引导式解题</h2>
          <p>从文件选择器选择题目图片；系统识别后会先复述题面，再一步一步带你做，不会直接给答案。</p>
          <div class="student-home__upload-tags">
            <span class="ms-tag">支持 PNG / JPG</span>
            <span class="ms-tag ms-tag--gray">按内容匹配演示题库</span>
            <span class="ms-tag ms-tag--gray">错答与求助都有反馈</span>
          </div>
        </div>
      </div>
      <div class="student-home__upload-actions">
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" style="display: none" @change="onFile" />
        <button class="ms-btn ms-btn--primary" style="height: 42px; padding: 0 24px" @click="fileInput.click()">
          选择题目图片
        </button>
        <span v-if="uploadMsg" class="student-home__upload-msg" :class="{ err: uploadMsgErr }">{{ uploadMsg }}</span>
      </div>
    </section>

    <!-- 三题案例 -->
    <section class="student-home__section">
      <div class="student-home__section-head">
        <h2>本次演示的三道题</h2>
        <span>已按演示题库原图收录 · 答案经独立复核</span>
      </div>
      <div class="student-home__cases">
        <button v-for="c in cases" :key="c.id" class="student-home__case ms-card" @click="openCase(c.id)">
          <div class="student-home__case-thumb"><img :src="c.image" :alt="c.title" /></div>
          <div class="student-home__case-meta">
            <div class="student-home__case-top">
              <span class="ms-tag">{{ c.code }}</span>
              <span class="ms-tag ms-tag--gray">{{ c.chip }}</span>
            </div>
            <b>{{ c.title }}</b>
            <p>{{ short(c.ocrText) }}</p>
            <div class="student-home__case-foot">
              <span :class="statusClass(c.id)">{{ statusText(c.id) }}</span>
              <span class="go">进入引导 ›</span>
            </div>
          </div>
        </button>
      </div>
    </section>

    <div class="student-home__grid">
      <section class="ms-card student-home__panel">
        <div class="student-home__panel-head"><b>今日推荐</b><span>按学情生成</span></div>
        <button class="student-home__rec" @click="router.push('/student/practice')">
          <span class="ico">🎯</span>
          <span><b>举一反三 · 离心率与轴长比</b><small>基于你刚完成的题 1 生成</small></span>
        </button>
        <button class="student-home__rec" @click="router.push('/student/errors')">
          <span class="ico">📕</span>
          <span><b>错题复习 · 2 道待掌握</b><small>线面关系判断、有放回抽样</small></span>
        </button>
        <button class="student-home__rec" @click="router.push('/student/classroom')">
          <span class="ico">🎓</span>
          <span><b>课堂 · 1 份新课待打开</b><small>张老师刚发布了《椭圆及其标准方程》</small></span>
        </button>
      </section>
      <section class="ms-card student-home__panel">
        <div class="student-home__panel-head"><b>最近学习</b><span>近 7 天</span></div>
        <div class="student-home__timeline">
          <div class="student-home__tl-item"><i></i><div><b>题 1 · 双曲线离心率</b><small>昨天 20:14 · 引导解题完成</small></div></div>
          <div class="student-home__tl-item"><i></i><div><b>错题复习 · 正三棱柱</b><small>昨天 19:02 · 部分掌握</small></div></div>
          <div class="student-home__tl-item"><i></i><div><b>知识库提问 · 导数符号</b><small>2 天前 · 引用 3 处原文</small></div></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { guidanceCases } from '../../data/guidance'
import { caseGuidance } from '../../state/demo'
import { sha256File } from '../../lib/sha256'
import { initGuidanceSession } from '../../lib/guidanceFlow'

const router = useRouter()
const fileInput = ref(null)
const uploadMsg = ref('')
const uploadMsgErr = ref(false)
const cases = guidanceCases

function short(t) {
  return t.replace(/\n/g, ' ').slice(0, 46) + '…'
}
function statusText(id) {
  const s = caseGuidance(id)
  if (s.finished) return '已完成 · 可重做'
  if (s.uploaded) return '进行中 · 继续'
  return '未开始'
}
function statusClass(id) {
  const s = caseGuidance(id)
  if (s.finished) return 'is-done'
  if (s.uploaded) return 'is-doing'
  return 'is-todo'
}

function openCase(id) {
  router.push(`/student/guide/${id}`)
}

async function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  uploadMsg.value = ''
  uploadMsgErr.value = false
  try {
    const hash = await sha256File(file)
    const matched = cases.find((c) => c.sha256 === hash)
    if (!matched) {
      uploadMsg.value = '这张图片不在本次演示题库中，请重新选择（草稿已保留）。'
      uploadMsgErr.value = true
      e.target.value = ''
      return
    }
    const sess = caseGuidance(matched.id)
    initGuidanceSession(matched, sess, file.name)
    sess.fileHash = hash
    uploadMsg.value = `已识别为「${matched.code} · ${matched.title}」，正在进入引导…`
    setTimeout(() => router.push(`/student/guide/${matched.id}`), 450)
  } catch {
    uploadMsg.value = '读取文件失败，请重试。'
    uploadMsgErr.value = true
  }
  e.target.value = ''
}
</script>

