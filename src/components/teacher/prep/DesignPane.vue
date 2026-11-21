<!-- 课堂设计 Tab：Teaching Blueprint（目标/重难点/教学路径/例题），目标可编辑并持久化 -->
<template>
  <div class="design-pane" data-testid="design-pane">
    <div class="design-pane__bar">
      <div class="design-pane__bar-left">
        <span class="design-chip">课堂设计</span>
        <span class="design-pane__bar-sub">Teaching Blueprint · PPT 与教案共享同一教学中间状态</span>
      </div>
      <div class="design-pane__bar-right">
        <button class="dp-btn" type="button" @click="$emit('switch-tab', 'ppt')">查看课件 PPT</button>
        <button class="dp-btn" type="button" @click="$emit('switch-tab', 'plan')">查看教案</button>
      </div>
    </div>

    <div class="design-pane__body">
      <div class="design-main">
        <section class="dp-card">
          <div class="dp-card__head">
            <b>教学目标</b>
            <span>可编辑 · 自动保存</span>
          </div>
          <div class="dp-goals">
            <div v-for="(goal, i) in session.design.goals" :key="i" class="dp-goal">
              <span class="dp-goal__no">{{ i + 1 }}</span>
              <input
                class="dp-goal__input"
                :value="goal"
                :data-testid="`design-goal-${i}`"
                aria-label="教学目标"
                @input="editGoal(i, $event.target.value)"
              />
              <button class="dp-goal__remove" type="button" title="删除该目标" @click="removeGoal(i)">×</button>
            </div>
            <button class="dp-add" type="button" data-testid="design-add-goal" @click="addGoal">＋ 添加教学目标</button>
          </div>
        </section>

        <section class="dp-card">
          <div class="dp-card__head">
            <b>教学路径 · {{ totalMinutes }} 分钟</b>
            <span>来自共享教学蓝图 · 与 PPT 页序对应</span>
          </div>
          <table class="dp-path">
            <thead>
              <tr>
                <th class="dp-path__phase">环节</th>
                <th class="dp-path__min">时长</th>
                <th>教师活动</th>
                <th>学生活动</th>
                <th>设计意图</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in path" :key="i">
                <td class="dp-path__phase">
                  <span class="dp-path__dot">{{ i + 1 }}</span>{{ p.phase }}
                </td>
                <td class="dp-path__min">{{ p.minutes }} min</td>
                <td>{{ p.teacher }}</td>
                <td>{{ p.student }}</td>
                <td class="dp-path__intent">{{ p.intent }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="dp-card">
          <div class="dp-card__head">
            <b>例题与变式</b>
            <span>进入 PPT 或教案后仍需与蓝图保持一致</span>
          </div>
          <div class="dp-example">
            <div class="dp-example__title">{{ example.title || '例题' }}</div>
            <p class="dp-example__q"><MathText :text="example.question" /></p>
            <p class="dp-example__a"><b>答案：</b><MathText :text="example.answer" /></p>
            <p v-if="example.note" class="dp-example__note">讲评提示：{{ example.note }}</p>
          </div>
          <div v-if="extraExamples.length" class="dp-examples-more">
            <div v-for="(e, i) in extraExamples" :key="i" class="dp-example dp-example--sub">
              <div class="dp-example__title">{{ e.title }}</div>
              <p class="dp-example__q"><MathText :text="e.question" /></p>
              <p class="dp-example__a"><b>答案：</b><MathText :text="e.answer" /></p>
            </div>
          </div>
        </section>
      </div>

      <aside class="design-side">
        <section class="dp-card dp-card--side">
          <div class="dp-card__head"><b>课时信息</b></div>
          <div class="dp-kv"><span>课时</span><b>{{ target.title }} · {{ target.subtitle }}</b></div>
          <div class="dp-kv"><span>教材</span><b>{{ target.meta.textbook }}</b></div>
          <div class="dp-kv"><span>班级</span><b>{{ target.meta.className }}</b></div>
          <div class="dp-kv"><span>时长</span><b>{{ target.meta.duration }}</b></div>
          <div class="dp-kv"><span>课型</span><b>{{ blueprint.genre || '新授课' }}</b></div>
        </section>

        <section class="dp-card dp-card--side">
          <div class="dp-card__head"><b>重点与难点</b></div>
          <div class="dp-sub-title">重点</div>
          <ul class="dp-list">
            <li v-for="(f, i) in blueprint.focus || []" :key="`f${i}`">{{ f }}</li>
          </ul>
          <div class="dp-sub-title">难点</div>
          <ul class="dp-list dp-list--warn">
            <li v-for="(d, i) in blueprint.difficulties || []" :key="`d${i}`">{{ d }}</li>
          </ul>
        </section>

        <section class="dp-card dp-card--side">
          <div class="dp-card__head"><b>教学产物</b></div>
          <button class="dp-product" type="button" @click="$emit('switch-tab', 'ppt')">
            <span class="dp-product__icon">▤</span>
            <span><b>课件 PPT</b><small>{{ session.slides.length }} 页 · 可编辑/导出 PPTX</small></span>
            <span class="dp-product__go">›</span>
          </button>
          <button class="dp-product" type="button" @click="$emit('switch-tab', 'plan')">
            <span class="dp-product__icon">📄</span>
            <span><b>教案</b><small>{{ session.plan?.sections?.length || 0 }} 个章节 · 可编辑/导出 DOCX</small></span>
            <span class="dp-product__go">›</span>
          </button>
          <div class="dp-publish">
            <span>发布状态</span>
            <b v-if="publishedVersion" class="dp-publish__ok">已发布 v{{ publishedVersion }}</b>
            <b v-else class="dp-publish__todo">未发布</b>
          </div>
          <button class="dp-btn dp-btn--primary" type="button" data-testid="design-publish" @click="$emit('publish')">发布课堂</button>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MathText from '../../MathText.vue'
import { touchPrepSession } from '../../../data/prepPublish'

const props = defineProps({
  session: { type: Object, required: true },
  target: { type: Object, required: true },
  publishedVersion: { type: Number, default: 0 },
})
const emit = defineEmits(['switch-tab', 'publish'])

const blueprint = computed(() => props.target.blueprint || { goals: [], focus: [], difficulties: [], path: [], examples: [] })
const path = computed(() => blueprint.value.path || [])
const totalMinutes = computed(() => path.value.reduce((sum, p) => sum + (Number(p.minutes) || 0), 0))
const example = computed(() => blueprint.value.examples?.[0] || props.session.design?.examples?.[0] || { title: '例题', question: '', answer: '' })
const extraExamples = computed(() => (props.session.design?.examples || []).slice(1))

function editGoal(index, value) {
  props.session.design.goals[index] = value
  touchPrepSession(props.session.sessionId)
}
function addGoal() {
  props.session.design.goals.push('新的教学目标（可编辑）')
  touchPrepSession(props.session.sessionId)
}
function removeGoal(index) {
  if (props.session.design.goals.length <= 1) return
  props.session.design.goals.splice(index, 1)
  touchPrepSession(props.session.sessionId)
}
</script>

<style scoped>
.design-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f6f8fb;
}
.design-pane__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e9f2;
}
.design-pane__bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.design-chip {
  background: #eff4ff;
  color: #2563eb;
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 6px;
  padding: 3px 9px;
  flex: none;
}
.design-pane__bar-sub {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.design-pane__bar-right {
  display: flex;
  gap: 8px;
}
.dp-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
}
.dp-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.dp-btn--primary {
  width: 100%;
  margin-top: 10px;
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.dp-btn--primary:hover {
  background: #1d4ed8;
  color: #fff;
}
.design-pane__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.design-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.design-side {
  width: 288px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dp-card {
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  padding: 14px 16px;
}
.dp-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 12px;
}
.dp-card__head b {
  font-size: 14px;
  color: #0f172a;
}
.dp-card__head span {
  font-size: 11px;
  color: #94a3b8;
}
.dp-goals {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dp-goal {
  display: flex;
  align-items: center;
  gap: 9px;
}
.dp-goal__no {
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 50%;
  background: #eff4ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.dp-goal__input {
  flex: 1;
  border: 1px solid transparent;
  border-radius: 7px;
  background: #f8fafc;
  font-family: inherit;
  font-size: 13px;
  color: #1f2937;
  padding: 7px 10px;
  outline: none;
}
.dp-goal__input:hover {
  border-color: #dbe3ef;
}
.dp-goal__input:focus {
  border-color: #2563eb;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.dp-goal__remove {
  border: 0;
  background: none;
  color: #cbd5e1;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
}
.dp-goal__remove:hover {
  color: #dc2626;
}
.dp-add {
  align-self: flex-start;
  border: 1px dashed #cbd5e1;
  background: none;
  border-radius: 7px;
  padding: 5px 10px;
  font-size: 12px;
  color: #64748b;
}
.dp-add:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.dp-path {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.dp-path th {
  text-align: left;
  font-weight: 600;
  color: #94a3b8;
  font-size: 11px;
  padding: 0 8px 7px;
  border-bottom: 1px solid #f1f5f9;
}
.dp-path td {
  padding: 8px;
  border-bottom: 1px solid #f8fafc;
  color: #334155;
  line-height: 1.55;
  vertical-align: top;
}
.dp-path tr:last-child td {
  border-bottom: 0;
}
.dp-path__phase {
  white-space: nowrap;
  font-weight: 600;
  color: #1f2937 !important;
}
.dp-path__dot {
  display: inline-grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #eff4ff;
  color: #2563eb;
  font-size: 10px;
  margin-right: 6px;
}
.dp-path__min {
  white-space: nowrap;
  color: #2563eb !important;
  font-weight: 600;
}
.dp-path__intent {
  color: #64748b !important;
}
.dp-example__title {
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
  margin-bottom: 6px;
}
.dp-example__q,
.dp-example__a {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #1f2937;
}
.dp-example__a {
  color: #065f46;
}
.dp-example__note {
  margin: 0;
  font-size: 11.5px;
  color: #94a3b8;
}
.dp-example--sub {
  border-top: 1px dashed #eef2f7;
  margin-top: 10px;
  padding-top: 10px;
}
.dp-card--side {
  padding: 13px 15px;
}
.dp-kv {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  padding: 3px 0;
}
.dp-kv span {
  color: #94a3b8;
  flex: none;
}
.dp-kv b {
  color: #1f2937;
  font-weight: 600;
  text-align: right;
}
.dp-sub-title {
  font-size: 11px;
  color: #94a3b8;
  margin: 6px 0 4px;
}
.dp-list {
  margin: 0 0 6px;
  padding-left: 16px;
  font-size: 12px;
  line-height: 1.7;
  color: #334155;
}
.dp-list--warn li::marker {
  color: #d97706;
}
.dp-product {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #eef2f7;
  background: #fbfdff;
  border-radius: 9px;
  padding: 8px 10px;
  margin-bottom: 7px;
  text-align: left;
}
.dp-product:hover {
  border-color: #dbe6fb;
  background: #f5f8ff;
}
.dp-product__icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #eff4ff;
  display: grid;
  place-items: center;
  font-size: 13px;
  flex: none;
}
.dp-product b {
  display: block;
  font-size: 12.5px;
  color: #1f2937;
}
.dp-product small {
  display: block;
  font-size: 10.5px;
  color: #94a3b8;
}
.dp-product > span:nth-child(2) {
  flex: 1;
}
.dp-product__go {
  color: #cbd5e1;
}
.dp-publish {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}
.dp-publish span {
  color: #94a3b8;
}
.dp-publish__ok {
  color: #047857;
}
.dp-publish__todo {
  color: #94a3b8;
}
</style>
