<template>
  <StudentThemeScope class="page resources">
    <header class="res-head">
      <div>
        <h1 class="page-title">资源中心</h1>
        <p class="page-sub">
          随包本地讲义可直接阅读并标记已读；现役平台的视频库是外部在线资源，本演示包<strong>未随包提供视频文件</strong>，视频卡片只打开说明与讲义替代入口。
        </p>
      </div>
      <div class="res-head__right">
        <span class="res-honest">断网可用 · 无外部链接</span>
      </div>
    </header>

    <!-- 统计 -->
    <section class="res-stats">
      <div class="res-stat ms-card">
        <span>本地讲义</span>
        <b>{{ lectures.length }}</b>
      </div>
      <div class="res-stat ms-card">
        <span>已读讲义</span>
        <b :class="{ 'is-ok': readCount > 0 }">{{ readCount }}</b>
      </div>
      <div class="res-stat ms-card">
        <span>视频占位条目</span>
        <b>{{ videos.length }}</b>
      </div>
      <div class="res-stat ms-card">
        <span>视频说明已读</span>
        <b>{{ noticeCount }}</b>
      </div>
    </section>

    <nav class="res-tabs">
      <button
        class="res-tab"
        :class="{ active: rs.tab === 'lectures' }"
        data-qa="resources-tab-lectures"
        @click="rs.tab = 'lectures'"
      >
        📄 本地讲义 <span>{{ lectures.length }}</span>
      </button>
      <button
        class="res-tab"
        :class="{ active: rs.tab === 'videos' }"
        data-qa="resources-tab-videos"
        @click="rs.tab = 'videos'"
      >
        🎬 视频 <span class="res-tab__warn">{{ videos.length }} 条 · 未含文件</span>
      </button>
      <span class="res-tabs__hint">视频条目仅保留平台索引信息用于说明，播放能力不在演示包内。</span>
    </nav>

    <!-- 讲义列表 / 阅读器 -->
    <template v-if="rs.tab === 'lectures'">
      <div v-if="!readerLecture" class="res-grid">
        <article
          v-for="lec in lectures"
          :key="lec.id"
          class="res-card ms-card"
          data-qa="resources-lecture-card"
          @click="openLecture(lec.id)"
        >
          <div class="res-card__top">
            <span class="res-card__ico">📄</span>
            <span class="ms-tag ms-tag--gray">{{ lec.topic }}</span>
            <span v-if="isRead(lec.id)" class="ms-tag ms-tag--ok">已读</span>
            <span v-else class="ms-tag">未读</span>
          </div>
          <h3>{{ lec.title }}</h3>
          <p>{{ lec.summary }}</p>
          <div class="res-card__foot">
            <span>{{ lec.pages.length }} 页 · 约 {{ lec.minutes }} 分钟</span>
            <span class="res-card__go">{{ isRead(lec.id) ? '重新阅读' : '开始学习' }} ›</span>
          </div>
        </article>
      </div>

      <!-- 阅读器 -->
      <section v-else class="res-reader ms-card" data-qa="resources-reader">
        <header class="res-reader__head">
          <button class="res-back" data-qa="resources-reader-back" @click="closeLecture">← 返回资源列表</button>
          <div class="res-reader__title">
            <b>{{ readerLecture.title }}</b>
            <span class="ms-tag ms-tag--gray">{{ readerLecture.topic }}</span>
            <span class="ms-tag ms-tag--gray">{{ readerLecture.source }}</span>
            <span v-if="isRead(readerLecture.id)" class="ms-tag ms-tag--ok">已读</span>
          </div>
          <div class="res-reader__pager">
            <button class="ms-btn ms-btn--sm" :disabled="pageIndex === 0" @click="turnPage(-1)">上一页</button>
            <span>{{ pageIndex + 1 }} / {{ readerLecture.pages.length }}</span>
            <button class="ms-btn ms-btn--sm" :disabled="pageIndex >= readerLecture.pages.length - 1" @click="turnPage(1)">
              下一页
            </button>
          </div>
        </header>

        <div class="res-reader__body ms-scroll">
          <div class="res-page ms-card" :key="`${readerLecture.id}-${pageIndex}`">
            <div class="res-page__idx">第 {{ pageIndex + 1 }} 页 / 共 {{ readerLecture.pages.length }} 页</div>
            <h3>{{ currentPage.heading }}</h3>
            <div class="res-page__blocks">
              <div v-for="(block, bi) in currentPage.blocks" :key="bi" class="res-block" :class="`is-${block.kind || 'text'}`">
                <div v-if="block.label" class="res-block__label">{{ block.label }}</div>
                <MathText :text="block.text" block />
              </div>
            </div>
          </div>

          <div class="res-page__side">
            <div class="res-kp">
              <b>对应知识点</b>
              <span>{{ readerLecture.topic }}</span>
            </div>
            <div class="res-kp">
              <b>关联演示题</b>
              <span>{{ readerLecture.relatedCase }} · {{ readerLecture.relatedTitle }}</span>
            </div>
            <div class="res-kp__actions">
              <button class="ms-btn ms-btn--sm" @click="router.push(`/student/practice?case=${readerLecture.relatedCaseId}`)">去练题</button>
              <button class="ms-btn ms-btn--sm" @click="router.push(`/student/guide/${readerLecture.relatedCaseId}`)">去引导解题</button>
            </div>
            <p class="res-kp__note">讲义为随包自撰演示材料（非教材），阅读记录仅保存在本机。</p>
          </div>
        </div>

        <footer class="res-reader__foot">
          <span>阅读进度：第 {{ pageIndex + 1 }} 页</span>
          <div>
            <button class="ms-btn ms-btn--sm" data-qa="resources-mark-read" :disabled="isRead(readerLecture.id)" @click="markRead(readerLecture.id)">
              {{ isRead(readerLecture.id) ? '已标记为已读' : '标记本讲义为已读' }}
            </button>
            <button
              v-if="pageIndex >= readerLecture.pages.length - 1"
              class="ms-btn ms-btn--sm ms-btn--primary"
              data-qa="resources-read-done"
              @click="finishLecture"
            >
              读完了
            </button>
          </div>
        </footer>
      </section>
    </template>

    <!-- 视频 -->
    <template v-else>
      <div class="res-video-note ms-card">
        <b>关于视频</b>
        <span>
          现役平台的「资源中心」展示的是外部在线视频库。按断网演示要求，本演示包不包含任何外部视频文件、不做外链跳转；
          下面的条目仅用于说明平台视频索引的状态。点击任意视频会打开“无随包视频”的说明，并提供同知识点的随包讲义替代。
        </span>
      </div>
      <div class="res-grid res-grid--videos">
        <article
          v-for="v in videos"
          :key="v.id"
          class="res-card res-card--video ms-card"
          data-qa="resources-video-card"
          @click="openVideoNotice(v)"
        >
          <div class="res-video__cover" :style="{ background: v.cover }">
            <span class="res-video__play">▶</span>
            <span class="res-video__badge">演示包未含文件</span>
            <span class="res-video__dur">{{ v.duration }}</span>
          </div>
          <div class="res-video__body">
            <div class="res-card__top">
              <span class="ms-tag ms-tag--gray">{{ v.topic }}</span>
              <span v-if="isNoticeSeen(v.id)" class="ms-tag ms-tag--ok">说明已读</span>
              <span v-else class="ms-tag ms-tag--warn">说明未读</span>
            </div>
            <h3>{{ v.title }}</h3>
            <p>{{ v.desc }}</p>
            <div class="res-card__foot">
              <span>{{ v.source }}</span>
              <span class="res-card__go">查看说明 ›</span>
            </div>
          </div>
        </article>
      </div>
    </template>

    <!-- 视频说明弹层 -->
    <div v-if="videoNotice" class="res-mask" data-qa="resources-video-modal" @click.self="closeVideoNotice">
      <div class="res-modal ms-card" role="dialog" aria-label="视频说明">
        <header class="res-modal__head">
          <span class="res-modal__badge">无法播放</span>
          <b>无随包视频</b>
          <button class="res-modal__close" data-qa="resources-video-close" @click="closeVideoNotice">关闭</button>
        </header>
        <p class="res-modal__title">《{{ videoNotice.title }}》</p>
        <div class="res-modal__body">
          <p><b>为什么打不开？</b></p>
          <ul>
            <li>这条视频来自现役平台的<b>外部在线视频源</b>，演示包按“断网可冷启动”要求不包含外部媒体文件，也不做外链跳转。</li>
            <li>本机演示包内<b>没有对应的视频文件</b>（也无权随包分发），因此不做假播放器、不伪造播放进度。</li>
            <li>视频索引信息（标题 / 知识点 / 时长标注）保留在卡片上，仅用于说明该资源在平台中的存在。</li>
          </ul>
          <p><b>可用的替代内容</b>：已随包提供同知识点的本地讲义，可立即阅读、标记已读并记录进度。</p>
          <div class="res-modal__lecture">
            <span class="res-card__ico">📄</span>
            <div>
              <b>{{ alternativeLecture.title }}</b>
              <p>{{ alternativeLecture.summary }}</p>
            </div>
            <button class="ms-btn ms-btn--sm ms-btn--primary" data-qa="resources-video-alt" @click="openAlternativeLecture">
              打开讲义
            </button>
          </div>
        </div>
        <footer class="res-modal__foot">
          <span>已记录本次说明查阅（刷新后仍保留“说明已读”状态）</span>
          <button class="ms-btn ms-btn--sm" @click="closeVideoNotice">知道了</button>
        </footer>
      </div>
    </div>
  </StudentThemeScope>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import MathText from '../../components/MathText.vue'
import StudentThemeScope from '../../components/student/StudentThemeScope.vue'
import { store } from '../../state/demo'

const router = useRouter()

/* ------------------------------------------------------------------ */
/* 随包本地讲义（自撰，非教材；内容与封存数学基准一致）                  */
/* ------------------------------------------------------------------ */
const lectures = [
  {
    id: 'lec-hyperbola-e',
    title: '双曲线离心率速查：从轴长比到 e',
    topic: '圆锥曲线',
    summary: '把“虚轴长是实轴长的 k 倍”翻译成 b/a=k，再用 c²=a²+b² 求 e，附三个典型误判。',
    minutes: 6,
    source: '随包自撰讲义 · 非教材',
    relatedCase: '题1 双曲线离心率',
    relatedCaseId: 'A',
    pages: [
      {
        heading: '一、先把“轴长”翻译成半轴比',
        blocks: [
          {
            kind: 'text',
            text: '实半轴为 $a$、虚半轴为 $b$ 时，实轴长是 $2a$、虚轴长是 $2b$。若题目说“虚轴长是实轴长的 $\\sqrt{7}$ 倍”，就是 $2b=\\sqrt{7}\\cdot 2a$，约去 2 得到：',
          },
          { kind: 'formula', label: '轴长比', text: '$$\\frac{b}{a}=\\sqrt{7}$$' },
          { kind: 'tip', label: '注意', text: '“$\\sqrt{7}$ 倍”说的是整条轴，不是半轴；先两边同时除以 2 再比。' },
        ],
      },
      {
        heading: '二、用双曲线的 a、b、c 关系求离心率',
        blocks: [
          { kind: 'text', text: '双曲线中半焦距最大，满足 $c^2=a^2+b^2$（不要和椭圆的 $a^2=b^2+c^2$ 混）。离心率定义为 $e=\\dfrac{c}{a}$，于是：' },
          { kind: 'formula', label: '离心率公式', text: '$$e^2=\\frac{c^2}{a^2}=1+\\left(\\frac{b}{a}\\right)^2$$' },
          { kind: 'text', text: '代入 $\\dfrac{b}{a}=\\sqrt{7}$：$e^2=1+7=8$，因为 $e>0$，所以 $e=\\sqrt{8}=2\\sqrt{2}$。' },
        ],
      },
      {
        heading: '三、三个典型误判',
        blocks: [
          { kind: 'warn', label: '误判 1', text: '把 $\\dfrac{b}{a}=\\sqrt{7}$ 当成离心率 → 错选 $\\sqrt{7}$。离心率不是轴长比。' },
          { kind: 'warn', label: '误判 2', text: '默认 $b=a$（等轴双曲线，$e=\\sqrt{2}$）→ 忽略题目给的倍数条件。' },
          { kind: 'warn', label: '误判 3', text: '把 $\\sqrt{8}$ 化简成 2 → 漏掉平方根里的因子 2，$\\sqrt{8}=2\\sqrt{2}\\approx 2.83$。' },
          { kind: 'text', text: '自查方法：把 $a=1$、$b=\\sqrt{7}$ 代回去，算出 $c=\\sqrt{8}$，再算 $e=c/a=2\\sqrt{2}$，与选项 D 一致。' },
        ],
      },
    ],
  },
  {
    id: 'lec-prism',
    title: '正三棱柱线面关系判定清单',
    topic: '立体几何',
    summary: '线面垂直找“面内两条相交直线”，线面平行要“面内一条平行线 + 直线不在面内”；用坐标验算排除干扰项。',
    minutes: 7,
    source: '随包自撰讲义 · 非教材',
    relatedCase: '题2 正三棱柱线面关系',
    relatedCaseId: 'B',
    pages: [
      {
        heading: '一、先找底面里的垂直关系',
        blocks: [
          { kind: 'text', text: '正三棱柱的底面是正三角形，侧棱垂直于底面。$D$ 为 $BC$ 中点时，$AD$ 既是中线也是高，所以 $AD\\perp BC$；侧棱 $AA_1\\perp$ 底面，所以 $AA_1\\perp BC$。' },
          { kind: 'formula', label: '线面垂直判定', text: '$$\\left.\\begin{array}{l} BC\\perp AD\\\\ BC\\perp AA_1\\end{array}\\right\\}\\Rightarrow BC\\perp\\text{平面 }AA_1D$$' },
          { kind: 'tip', label: '要点', text: '判定定理要求两条直线在平面内且<b>相交</b>；$AD$ 与 $AA_1$ 交于 $A$，满足条件。' },
        ],
      },
      {
        heading: '二、线面平行要同时满足两个条件',
        blocks: [
          { kind: 'text', text: '要证 $CC_1\\parallel$ 平面 $AA_1D$：第一，$CC_1\\parallel AA_1$，而 $AA_1$ 在平面内；第二，$CC_1$ 不在平面内。' },
          { kind: 'text', text: '平面 $AA_1D$ 与底面的交线是 $AD$，而 $C\\notin AD$，所以 $C\\notin$ 平面 $AA_1D$，进而 $CC_1$ 不在平面内。两个条件都满足，$CC_1\\parallel$ 平面 $AA_1D$ 成立。' },
          { kind: 'warn', label: '易错', text: '只写“$CC_1\\parallel AA_1$”不够，必须补上“$CC_1$ 不在平面内”这一条。' },
        ],
      },
      {
        heading: '三、用坐标排除干扰项',
        blocks: [
          { kind: 'text', text: '取 $D=(0,0,0)$、$B=(-1,0,0)$、$C=(1,0,0)$、$A=(0,\\sqrt{3},0)$，上底面各点沿 $z$ 轴升高 $h>0$。' },
          { kind: 'formula', label: '点积验算', text: '$$\\overrightarrow{AD}\\cdot\\overrightarrow{A_1C}=0\\cdot1+(-\\sqrt{3})(-\\sqrt{3})+0\\cdot(-h)=3\\ne0$$' },
          { kind: 'text', text: '点积不为 0，说明 $AD$ 与 $A_1C$ 不垂直，A 项排除；$A_1B_1\\parallel AB$，而 $AD$ 与 $AB$ 成 $30^\\circ$，C 项排除。最终成立的选项是 B、D，多选必须都选上。' },
        ],
      },
    ],
  },
  {
    id: 'lec-indicator',
    title: '有放回抽样的指示变量法',
    topic: '概率统计',
    summary: '用 0-1 指示变量把“不同号码个数”拆成 5 个期望之和；补事件求单号出现概率，注意有放回与无放回的区别。',
    minutes: 6,
    source: '随包自撰讲义 · 非教材',
    relatedCase: '题3 有放回取球的期望',
    relatedCaseId: 'C',
    pages: [
      {
        heading: '一、把“个数”拆成 5 个指示变量',
        blocks: [
          { kind: 'text', text: '盒中 5 个球编号 $1\\sim5$，有放回取三次，$X$ 表示至少取出一次的球的个数。设 $I_i$ 表示第 $i$ 号球至少出现一次（出现记 1，没出现记 0），则：' },
          { kind: 'formula', label: '分解', text: '$$X=I_1+I_2+\\cdots+I_5$$' },
          { kind: 'text', text: '由期望的线性性，$E(X)=E(I_1)+\\cdots+E(I_5)$，并且这个等式<b>不要求</b>各 $I_i$ 相互独立。' },
        ],
      },
      {
        heading: '二、用补事件算单个号码的概率',
        blocks: [
          { kind: 'text', text: '一次取不到 $i$ 号的概率是 $\\dfrac45$，三次都取不到是 $\\left(\\dfrac45\\right)^3=\\dfrac{64}{125}$。所以：' },
          { kind: 'formula', label: '至少一次', text: '$$P(I_i=1)=1-\\left(\\frac45\\right)^3=1-\\frac{64}{125}=\\frac{61}{125}$$' },
          { kind: 'text', text: '五个号码地位相同，所以 $E(I_i)=\\dfrac{61}{125}$，$E(X)=5\\times\\dfrac{61}{125}=\\dfrac{61}{25}=2.44$。' },
        ],
      },
      {
        heading: '三、有放回与无放回别混',
        blocks: [
          { kind: 'warn', label: '易错', text: '把答案写成 3：那是“无放回取三次”的结果——三次必取到三个不同号码，$X\\equiv3$。' },
          { kind: 'warn', label: '易错', text: '把答案写成 $\\dfrac{61}{125}$：那只是一个号码的期望，漏乘了 5。' },
          { kind: 'text', text: '计数验算：125 个等可能结果中，只出现一种球 5 个、恰出现两种 60 个、三种互异 60 个，加权 $\\dfrac{5\\times1+60\\times2+60\\times3}{125}=\\dfrac{305}{125}=\\dfrac{61}{25}$。' },
        ],
      },
    ],
  },
]

const videos = [
  {
    id: 'vid-eccentricity',
    title: '双曲线离心率：轴长比与 e 的换算',
    topic: '圆锥曲线',
    duration: '12:40',
    desc: '平台视频索引条目。讲解如何从轴长比推出离心率，以及 $e^2=1+(b/a)^2$ 的常见误用。',
    source: '平台外部视频 · 索引占位',
    cover: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    lectureId: 'lec-hyperbola-e',
  },
  {
    id: 'vid-prism',
    title: '立体几何：线面垂直与线面平行的判定',
    topic: '立体几何',
    duration: '18:05',
    desc: '平台视频索引条目。用正三棱柱例讲“面内两条相交直线”和“面外条件”的判定套路。',
    source: '平台外部视频 · 索引占位',
    cover: 'linear-gradient(135deg,#0f766e,#0ea5e9)',
    lectureId: 'lec-prism',
  },
  {
    id: 'vid-indicator',
    title: '概率统计：指示变量与期望线性性',
    topic: '概率统计',
    duration: '15:22',
    desc: '平台视频索引条目。用有放回取球讲 0-1 指示变量、补事件和期望线性性。',
    source: '平台外部视频 · 索引占位',
    cover: 'linear-gradient(135deg,#b45309,#f59e0b)',
    lectureId: 'lec-indicator',
  },
  {
    id: 'vid-derivative',
    title: '导数与单调性：什么时候能直接说“递增”',
    topic: '微积分',
    duration: '21:16',
    desc: '平台视频索引条目。讨论 $f′(x)>0$、个别驻点与严格单调之间的细节。',
    source: '平台外部视频 · 索引占位',
    cover: 'linear-gradient(135deg,#1e293b,#475569)',
    lectureId: 'lec-hyperbola-e',
  },
  {
    id: 'vid-ellipse',
    title: '椭圆 a、b、c 与焦距的关系',
    topic: '解析几何',
    duration: '10:48',
    desc: '平台视频索引条目。梳理椭圆标准方程、$c^2=a^2-b^2$ 与焦距 $2c$ 的计算。',
    source: '平台外部视频 · 索引占位',
    cover: 'linear-gradient(135deg,#be185d,#f472b6)',
    lectureId: 'lec-hyperbola-e',
  },
  {
    id: 'vid-square',
    title: '配方法：从二次函数到顶点最值',
    topic: '代数',
    duration: '13:37',
    desc: '平台视频索引条目。演示配方步骤、顶点公式与常见符号错误。',
    source: '平台外部视频 · 索引占位',
    cover: 'linear-gradient(135deg,#4338ca,#6366f1)',
    lectureId: 'lec-prism',
  },
]

/* ---------------- 持久化状态 ---------------- */
function ensureResourcesExt() {
  if (!store.ext.studentResources || typeof store.ext.studentResources !== 'object') {
    store.ext.studentResources = {
      tab: 'lectures',
      selectedLectureId: null,
      lecturePage: {},
      readLectures: [],
      videoNoticesSeen: [],
    }
  }
  const s = store.ext.studentResources
  if (!['lectures', 'videos'].includes(s.tab)) s.tab = 'lectures'
  if (!Array.isArray(s.readLectures)) s.readLectures = []
  if (!Array.isArray(s.videoNoticesSeen)) s.videoNoticesSeen = []
  if (!s.lecturePage || typeof s.lecturePage !== 'object') s.lecturePage = {}
  if (s.selectedLectureId && !lectures.some((l) => l.id === s.selectedLectureId)) s.selectedLectureId = null
  return s
}
const rs = ensureResourcesExt()

/* ---------------- 派生 ---------------- */
const readCount = computed(() => lectures.filter((l) => rs.readLectures.includes(l.id)).length)
const noticeCount = computed(() => videos.filter((v) => rs.videoNoticesSeen.includes(v.id)).length)
const readerLecture = computed(() => (rs.selectedLectureId ? lectures.find((l) => l.id === rs.selectedLectureId) : null))
const pageIndex = computed(() => {
  const lec = readerLecture.value
  if (!lec) return 0
  const saved = Number(rs.lecturePage[lec.id] || 0)
  return Math.min(Math.max(saved, 0), lec.pages.length - 1)
})
const currentPage = computed(() => (readerLecture.value ? readerLecture.value.pages[pageIndex.value] : null))

const videoNotice = ref(null)
const alternativeLecture = computed(() => {
  if (!videoNotice.value) return lectures[0]
  return lectures.find((l) => l.id === videoNotice.value.lectureId) || lectures[0]
})

/* ---------------- 讲义交互 ---------------- */
function isRead(id) {
  return rs.readLectures.includes(id)
}
function openLecture(id) {
  rs.selectedLectureId = id
  if (!(id in rs.lecturePage)) rs.lecturePage[id] = 0
}
function closeLecture() {
  rs.selectedLectureId = null
}
function turnPage(delta) {
  const lec = readerLecture.value
  if (!lec) return
  const next = Math.min(Math.max(pageIndex.value + delta, 0), lec.pages.length - 1)
  rs.lecturePage[lec.id] = next
  nextTick(() => {
    const body = document.querySelector('.res-reader__body')
    if (body) body.scrollTop = 0
  })
}
function markRead(id) {
  if (!rs.readLectures.includes(id)) rs.readLectures.push(id)
}
function finishLecture() {
  const lec = readerLecture.value
  if (!lec) return
  markRead(lec.id)
  rs.tab = 'lectures'
  rs.selectedLectureId = null
}

/* ---------------- 视频说明 ---------------- */
function isNoticeSeen(id) {
  return rs.videoNoticesSeen.includes(id)
}
function openVideoNotice(video) {
  videoNotice.value = video
  if (!rs.videoNoticesSeen.includes(video.id)) rs.videoNoticesSeen.push(video.id)
}
function closeVideoNotice() {
  videoNotice.value = null
}
function openAlternativeLecture() {
  const lec = alternativeLecture.value
  videoNotice.value = null
  rs.tab = 'lectures'
  openLecture(lec.id)
}
</script>

<style scoped>
.page.resources {
  padding: 22px 30px 40px;
  /* fixed 弹层需要脱离 .page 的层叠上下文，避免被顶栏遮挡 */
  position: static;
  z-index: auto;
}
.res-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}
.res-head .page-title {
  margin-bottom: 2px;
}
.res-head .page-sub {
  margin-bottom: 0;
  font-size: 13px;
  max-width: 940px;
  color: var(--ink2);
}
.res-honest {
  font-size: 11.5px;
  color: var(--ink3);
  padding: 6px 12px;
  border-radius: 99px;
  border: 1px dashed var(--line);
  background: var(--card);
  white-space: nowrap;
}
.res-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}
.res-stat {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.res-stat span {
  font-size: 11.5px;
  color: var(--ink3);
}
.res-stat b {
  font-size: 22px;
  font-family: var(--font-num, inherit);
}
.res-stat b.is-ok {
  color: var(--ok-deep);
}
.res-tabs {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.res-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 99px;
  border: 1px solid var(--line);
  background: var(--card);
  font-size: 12.8px;
  color: var(--ink2);
}
.res-tab > span {
  font-size: 10.8px;
  padding: 0 6px;
  border-radius: 99px;
  background: var(--bg2);
  color: var(--ink2);
}
.res-tab__warn {
  background: var(--warn-bg) !important;
  color: var(--warn-deep) !important;
}
.res-tab.active {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 700;
}
.res-tabs__hint {
  margin-left: auto;
  font-size: 11.3px;
  color: var(--ink3);
}
.res-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13px;
}
.res-grid--videos {
  margin-top: 12px;
}
.res-card {
  padding: 15px 17px;
  cursor: pointer;
  transition: all 0.16s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.res-card:hover {
  border-color: var(--brand);
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(79, 70, 229, 0.11);
}
.res-card__top {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.res-card__ico {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--brand-soft);
  display: grid;
  place-items: center;
  font-size: 14px;
}
.res-card h3 {
  margin: 0;
  font-size: 14.2px;
  line-height: 1.45;
}
.res-card p {
  margin: 0;
  font-size: 11.8px;
  line-height: 1.7;
  color: var(--ink3);
  flex: 1;
}
.res-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--ink3);
}
.res-card__go {
  color: var(--brand);
  font-weight: 600;
}
.res-video-note {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: var(--warn-bg);
  border-color: var(--warn-border, #fde68a);
}
.res-video-note b {
  font-size: 12.5px;
  color: var(--warn-deep);
}
.res-video-note span {
  font-size: 11.8px;
  line-height: 1.75;
  color: var(--ink2);
}
.res-card--video {
  padding: 0;
  overflow: hidden;
  gap: 0;
}
.res-video__cover {
  position: relative;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.res-video__play {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  display: grid;
  place-items: center;
  font-size: 15px;
  padding-left: 2px;
  opacity: 0.62;
}
.res-video__badge {
  position: absolute;
  left: 10px;
  top: 10px;
  font-size: 10.5px;
  font-weight: 700;
  color: #fff;
  background: rgba(15, 23, 42, 0.55);
  border-radius: 99px;
  padding: 2px 9px;
}
.res-video__dur {
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-size: 10.5px;
  color: #fff;
  background: rgba(15, 23, 42, 0.55);
  border-radius: 5px;
  padding: 1px 6px;
}
.res-video__body {
  padding: 12px 15px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
}
/* ---------- 阅读器 ---------- */
.res-reader {
  padding: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 300px);
  min-height: 480px;
}
.res-reader__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.res-back {
  border: 0;
  background: none;
  color: var(--ink3);
  font-size: 12px;
  padding: 4px 0;
}
.res-back:hover {
  color: var(--brand);
}
.res-reader__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13.5px;
  min-width: 0;
}
.res-reader__pager {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.8px;
  color: var(--ink3);
}
.res-reader__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 268px;
  gap: 14px;
  align-items: start;
}
.res-page {
  padding: 18px 20px;
  animation: resFade 0.22s ease;
}
@keyframes resFade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.res-page__idx {
  font-size: 10.5px;
  color: var(--ink3);
  letter-spacing: 0.04em;
  margin-bottom: 5px;
}
.res-page h3 {
  margin: 0 0 12px;
  font-size: 17px;
}
.res-page__blocks {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.res-block {
  font-size: var(--st-read, 13.5px);
  line-height: 1.95;
  color: var(--ink2);
}
.res-block__label {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 1px 8px;
  border-radius: 5px;
  margin-bottom: 4px;
  background: var(--brand-soft);
  color: var(--brand-deep);
}
.res-block.is-formula {
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
}
.res-block.is-formula .res-block__label {
  background: var(--card);
}
.res-block.is-tip {
  border-left: 3px solid var(--brand);
  padding: 6px 12px;
  background: var(--brand-soft);
  border-radius: 0 8px 8px 0;
  font-size: 12.8px;
}
.res-block.is-tip .res-block__label {
  background: var(--card);
}
.res-block.is-warn {
  border-left: 3px solid var(--err);
  padding: 6px 12px;
  background: var(--err-bg);
  border-radius: 0 8px 8px 0;
  font-size: 12.8px;
}
.res-block.is-warn .res-block__label {
  background: var(--card);
  color: var(--err-deep);
}
.res-page__side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: var(--bg2);
  border: 1px solid var(--line);
}
.res-kp {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.res-kp b {
  font-size: 10.8px;
  color: var(--ink3);
  font-weight: 700;
}
.res-kp span {
  font-size: 12.3px;
  color: var(--ink);
}
.res-kp__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.res-kp__note {
  margin: 4px 0 0;
  font-size: 10.8px;
  line-height: 1.6;
  color: var(--ink3);
}
.res-reader__foot {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 18px;
  border-top: 1px solid var(--line);
  font-size: 11.8px;
  color: var(--ink3);
  flex-wrap: wrap;
}
.res-reader__foot > div {
  display: flex;
  gap: 8px;
}
/* ---------- 视频说明弹层 ---------- */
.res-mask {
  position: fixed;
  inset: 0;
  z-index: 85;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  padding: 24px;
}
.res-modal {
  width: 620px;
  max-width: 94vw;
  max-height: 88vh;
  overflow-y: auto;
  padding: 20px 22px;
}
.res-modal__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.res-modal__head b {
  font-size: 16px;
}
.res-modal__badge {
  font-size: 10.5px;
  font-weight: 800;
  padding: 2px 9px;
  border-radius: 99px;
  background: var(--err);
  color: #fff;
}
.res-modal__close {
  margin-left: auto;
  border: 0;
  background: var(--bg2);
  color: var(--ink2);
  border-radius: 8px;
  padding: 5px 11px;
  font-size: 12px;
}
.res-modal__title {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--ink3);
}
.res-modal__body {
  font-size: 12.8px;
  line-height: 1.85;
  color: var(--ink2);
}
.res-modal__body p {
  margin: 0 0 6px;
}
.res-modal__body ul {
  margin: 0 0 12px;
  padding-left: 20px;
}
.res-modal__body li + li {
  margin-top: 5px;
}
.res-modal__lecture {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 11px;
  background: var(--bg2);
  border: 1px solid var(--line);
}
.res-modal__lecture > div {
  flex: 1;
  min-width: 0;
}
.res-modal__lecture b {
  font-size: 12.8px;
}
.res-modal__lecture p {
  margin: 3px 0 0;
  font-size: 11.5px;
  color: var(--ink3);
}
.res-modal__foot {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: var(--ink3);
}
</style>
