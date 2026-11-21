<template>
  <div class="prep-history" data-testid="prep-history">
    <div class="prep-history__inner">
      <header class="prep-history__head">
        <div>
          <h1 class="prep-history__title">备课历史</h1>
          <p class="prep-history__sub">汇总你的全部备课记录，随时回到任意一次备课；发布版本按课时保留。</p>
        </div>
        <div class="prep-history__actions">
          <button class="ph-btn" type="button" @click="router.push('/teacher/prep')">返回备课中心</button>
          <button class="ph-btn ph-btn--primary" type="button" data-testid="history-new" @click="goNew">＋ 新建备课</button>
        </div>
      </header>

      <div class="prep-history__cols">
        <section class="history-list">
          <div class="history-list__head">
            <b>全部备课记录</b>
            <span>{{ sessions.length }} 个会话 · 按最近编辑排序</span>
          </div>
          <div class="history-list__rows">
            <div
              v-for="(s, i) in sessions"
              :key="s.sessionId"
              class="history-row"
              :data-testid="`history-row-${i}`"
            >
              <span class="history-row__glyph" :class="`history-row__glyph--${s.deckId}`">{{ deckGlyph(s.deckId) }}</span>
              <div class="history-row__main">
                <div class="history-row__title">
                  <b>{{ s.title }} · {{ s.subtitle }}</b>
                  <span class="ph-tag" :class="statusClass(s)">{{ statusLabel(s) }}</span>
                  <span v-if="s.isCustom" class="ph-tag ph-tag--violet">新一轮备课</span>
                </div>
                <div class="history-row__meta">
                  <span>{{ s.meta.textbook }}</span>
                  <span>{{ s.meta.className }}</span>
                  <span>{{ s.slideCount }} 页 PPT</span>
                  <span>{{ s.planSections }} 个教案章节</span>
                </div>
                <div class="history-row__times">
                  最近更新：{{ formatWhen(s.updatedAt) }}
                  <template v-if="s.publishedVersion"> · 已发布版本 v{{ s.publishedVersion }}</template>
                </div>
              </div>
              <div class="history-row__ops">
                <button class="ph-btn ph-btn--sm" type="button" @click="openSession(s.sessionId, 'ppt')">查看课件</button>
                <button class="ph-btn ph-btn--sm ph-btn--primary" type="button" :data-testid="`history-continue-${i}`" @click="openSession(s.sessionId, s.tab)">
                  继续编辑
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside class="version-card">
          <div class="version-card__head">
            <b>版本管理</b>
            <span>发布快照 · 不覆盖历史</span>
          </div>
          <div v-if="!versionGroups.length" class="version-card__empty">
            还没有发布记录。进入工作台发布课堂后，这里会出现版本历史。
          </div>
          <div v-for="group in versionGroups" :key="group.deckId" class="version-group">
            <div class="version-group__head">
              <span class="version-group__glyph" :class="`version-group__glyph--${group.deckId}`">{{ deckGlyph(group.deckId) }}</span>
              <b>{{ group.deckTitle }}</b>
              <span class="version-group__count">{{ group.records.length }} 个版本</span>
            </div>
            <div v-for="r in group.records" :key="r.id" class="version-row" :data-testid="`version-${r.id}`">
              <span class="version-row__badge">{{ r.meta?.versionLabel || `v${r.version}` }}</span>
              <div class="version-row__meta">
                <b>{{ r.className }}</b>
                <span>{{ r.meta?.publishedAtText || formatDateTime(r.publishedAt) }} · {{ r.slides?.length || 0 }} 页 · {{ r.editor }}</span>
              </div>
              <button class="version-row__open" type="button" title="回到该课时工作台" @click="openSession(r.meta?.sessionId || deckSessionId(r.deckId), 'ppt')">查看</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../../state/demo'
import {
  allSessionSummaries,
  formatDateTime,
  formatWhen,
  resolvePrepTarget,
} from '../../data/prepPublish'

const router = useRouter()

const sessions = computed(() => {
  const list = allSessionSummaries()
  return list.map((s) => {
    const target = resolvePrepTarget(s.sessionId)
    return { ...s, planSections: target?.plan?.sections?.length || 0 }
  })
})

const versionGroups = computed(() => {
  const all = store.teacher?.publish?.records || []
  const byDeck = new Map()
  for (const r of all) {
    if (!byDeck.has(r.deckId)) byDeck.set(r.deckId, { deckId: r.deckId, deckTitle: r.deckTitle, records: [] })
    byDeck.get(r.deckId).records.push(r)
  }
  return [...byDeck.values()].map((g) => ({ ...g, records: g.records.slice().reverse() }))
})

function statusLabel(s) {
  if (s.status === 'published') return `已发布 v${s.publishedVersion}`
  if (s.status === 'editing') return '编辑中'
  return '待开始'
}
function statusClass(s) {
  if (s.status === 'published') return 'ph-tag--ok'
  if (s.status === 'editing') return 'ph-tag--blue'
  return 'ph-tag--gray'
}
function deckGlyph(deckId) {
  if (deckId === 'deck-ellipse') return '◯'
  if (deckId === 'deck-quadratic') return '∪'
  return '⊆'
}
function deckSessionId(deckId) {
  const map = { 'deck-ellipse': 'prep-ellipse', 'deck-quadratic': 'prep-quadratic', 'deck-set': 'prep-set' }
  return map[deckId] || 'prep-ellipse'
}

function openSession(sessionId, tab) {
  router.push(`/teacher/prep/w/${sessionId}/${tab || 'classroom'}`)
}
function goNew() {
  router.push('/teacher/prep')
}
</script>

<style scoped>
.prep-history {
  height: calc(100vh - 56px - 44px);
  min-height: 540px;
  overflow-y: auto;
  background:
    radial-gradient(620px 320px at 92% -6%, rgba(37, 99, 235, 0.07) 0%, transparent 62%),
    #f6f8fb;
}
.prep-history__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 28px 40px;
}
.prep-history__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}
.prep-history__title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}
.prep-history__sub {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: #64748b;
}
.prep-history__actions {
  display: flex;
  gap: 8px;
  flex: none;
}
.ph-btn {
  height: 32px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
  white-space: nowrap;
}
.ph-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.ph-btn--primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.ph-btn--primary:hover {
  background: #1d4ed8;
  color: #fff;
}
.ph-btn--sm {
  height: 27px;
  padding: 0 10px;
  font-size: 11.5px;
}
.prep-history__cols {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.history-list {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  padding: 14px 16px 8px;
}
.history-list__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}
.history-list__head b {
  font-size: 14px;
  color: #0f172a;
}
.history-list__head span {
  font-size: 11.5px;
  color: #94a3b8;
}
.history-list__rows {
  display: flex;
  flex-direction: column;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 4px;
  border-bottom: 1px solid #f5f8fc;
}
.history-row:last-child {
  border-bottom: 0;
}
.history-row:hover {
  background: #fbfdff;
}
.history-row__glyph {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #eff4ff;
  color: #2563eb;
  font-size: 17px;
  display: grid;
  place-items: center;
  flex: none;
}
.history-row__glyph--deck-quadratic {
  background: #f3eefd;
  color: #7c3aed;
}
.history-row__glyph--deck-set {
  background: #ecfdf5;
  color: #059669;
}
.history-row__main {
  flex: 1;
  min-width: 0;
}
.history-row__title {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.history-row__title b {
  font-size: 13.5px;
  color: #0f172a;
}
.history-row__meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 3px;
}
.history-row__meta span {
  font-size: 11px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 999px;
  padding: 0 8px;
}
.history-row__times {
  margin-top: 4px;
  font-size: 10.5px;
  color: #94a3b8;
}
.history-row__ops {
  display: flex;
  gap: 7px;
  flex: none;
}
.version-card {
  width: 330px;
  flex: none;
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  padding: 14px 16px;
}
.version-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 6px;
}
.version-card__head b {
  font-size: 14px;
  color: #0f172a;
}
.version-card__head span {
  font-size: 11px;
  color: #94a3b8;
}
.version-card__empty {
  padding: 26px 6px;
  text-align: center;
  font-size: 12px;
  line-height: 1.7;
  color: #94a3b8;
}
.version-group {
  padding: 8px 0 4px;
  border-bottom: 1px solid #f5f8fc;
}
.version-group:last-child {
  border-bottom: 0;
}
.version-group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0 6px;
}
.version-group__glyph {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: #eff4ff;
  color: #2563eb;
  font-size: 11px;
  display: grid;
  place-items: center;
  flex: none;
}
.version-group__glyph--deck-quadratic {
  background: #f3eefd;
  color: #7c3aed;
}
.version-group__glyph--deck-set {
  background: #ecfdf5;
  color: #059669;
}
.version-group__head b {
  font-size: 12.5px;
  color: #1f2937;
  flex: 1;
}
.version-group__count {
  font-size: 10.5px;
  color: #94a3b8;
}
.version-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px 6px 6px;
  border-radius: 8px;
}
.version-row:hover {
  background: #f8fbff;
}
.version-row__badge {
  font-size: 10.5px;
  font-weight: 700;
  color: #1d4ed8;
  background: #eff4ff;
  border-radius: 6px;
  padding: 1px 7px;
  flex: none;
}
.version-row__meta {
  flex: 1;
  min-width: 0;
}
.version-row__meta b {
  display: block;
  font-size: 11.5px;
  color: #1f2937;
}
.version-row__meta span {
  display: block;
  font-size: 10px;
  color: #94a3b8;
}
.version-row__open {
  border: 1px solid #e5e9f2;
  background: #fff;
  border-radius: 6px;
  font-size: 10.5px;
  color: #64748b;
  padding: 2px 8px;
  flex: none;
}
.version-row__open:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.ph-tag {
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 999px;
  padding: 1px 8px;
}
.ph-tag--ok {
  background: #ecfdf5;
  color: #047857;
}
.ph-tag--blue {
  background: #eff4ff;
  color: #2563eb;
}
.ph-tag--gray {
  background: #f1f5f9;
  color: #64748b;
}
.ph-tag--violet {
  background: #f3eefd;
  color: #7c3aed;
}
</style>
