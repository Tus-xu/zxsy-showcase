<template>
  <!-- 用户右气泡 -->
  <div v-if="msg.role === 'user'" class="msg-row user">
    <div class="user-col">
      <!-- 附件放在气泡外：题图是数学内容块，不是聊天文字的一部分 -->
      <div v-if="msg.attachments?.length" class="ub-atts outside">
        <AttachmentThumb v-for="a in msg.attachments" :key="a.file_id || a.name" :attachment="a" />
      </div>
      <div class="bubble user-bubble">
        <!-- 题目白卡：讲解/变式消息把题干独立成白色题目区（LaTeX 正常渲染） -->
        <div v-if="msg.question?.text" class="ub-question">
          <MarkdownView :text="msg.question.text" :zoomable="false" />
          <div v-if="msg.question.options?.length" class="ub-q-opts">
            <div v-for="(o, qi) in msg.question.options" :key="qi" class="ub-q-opt">
              <span class="ub-q-key">{{ 'ABCDEF'[qi] }}</span>
              <span class="ub-q-body"><MarkdownView :text="String(o)" :zoomable="false" /></span>
            </div>
          </div>
        </div>
        <!-- 内联编辑态（M2 §4.2：textarea 保存调 edit 端点） -->
        <div v-if="editing" class="ub-edit">
          <textarea ref="editTaRef" v-model="editDraft" class="ub-edit-ta" rows="3" maxlength="4000"></textarea>
          <div class="ub-edit-btns">
            <button class="btn btn-sm ub-edit-cancel" @click="cancelEdit">取消</button>
            <button class="btn btn-sm ub-edit-save" :disabled="!editDraft.trim()" @click="saveEdit">保存并发送</button>
          </div>
        </div>
        <MarkdownView v-else :text="msg.text" />
      </div>
      <!-- 用户消息操作条（hover 显示；编辑中隐藏） -->
      <div v-if="!editing" class="msg-actions user-actions">
        <button class="act" title="复制" @click="onCopy">
          <UiIcon :name="copied ? 'check' : 'copy'" :size="14" />
        </button>
        <button class="act" title="编辑并重新发送" @click="startEdit">
          <UiIcon name="edit" :size="14" />
        </button>
        <span v-if="msg.createdAt" class="act-time">{{ fmtHm(msg.createdAt) }}</span>
      </div>
    </div>
  </div>

  <!-- AI 左气泡 -->
  <div v-else class="msg-row ai">
    <div class="ai-avatar">π</div>
    <div class="ai-col">
      <!-- 过程提示（status 事件，可折叠） -->
      <details v-if="msg.statuses.length" class="status-bar" :open="msg.status === 'streaming'">
        <summary>
          <span v-if="msg.status === 'streaming'" class="spinner"></span>
          {{ msg.statuses[msg.statuses.length - 1].text || '处理中…' }}
          <span class="sb-count">{{ msg.statuses.length }} 条过程</span>
        </summary>
        <div class="sb-list">
          <div v-for="(s, i) in msg.statuses" :key="i" class="sb-item">
            <span v-if="s.stage" class="tag gray sb-stage">{{ stageName(s.stage) }}</span>{{ s.text }}
          </div>
        </div>
      </details>

      <div class="bubble ai-bubble glass-card">
        <!-- 正文 markdown：增量流式渲染（AI 先提问/讲解，用户再看下方选项） -->
        <IncrementalMarkdown v-if="msg.text" :text="msg.text" :streaming="msg.status === 'streaming'" />
        <!-- P1-9：选项在正文之后（先让 AI 把问题讲清楚，用户再选择） -->
        <div v-if="msg.clarify" class="clarify-box">
          <div v-if="msg.clarify.question" class="clarify-q">
            <MarkdownView :text="msg.clarify.question" :zoomable="false" />
          </div>
          <div v-if="clarifyOpts.length" class="clarify-opts">
            <button v-for="(o, i) in clarifyOpts" :key="i" class="clarify-chip" @click="$emit('clarify', o)">
              <span class="cc-key">{{ 'ABCD'[i] }}</span>
              <span class="cc-body"><MarkdownView :text="o" :zoomable="false" /></span>
            </button>
          </div>
        </div>

        <!-- F11 graph block -->
        <GraphBlock v-if="msg.graph" :graph="msg.graph" />

        <!-- F13 可视化讲解图形卡（figure 事件，可多次：图形随讲解步骤逐步出现） -->
        <MathFigure
          v-for="(f, fi) in msg.figures"
          :key="'fig' + fi"
          :figure="f"
          :streaming="msg.status === 'streaming'"
        />

        <!-- card 事件按类型分发 -->
        <template v-for="(c, ci) in msg.cards" :key="ci">
          <QuizSetCard
            v-if="cardType(c) === 'quiz_set'"
            :card="c"
            @enter="$emit('quizEnter', $event)"
            @explain="(...args) => $emit('quizExplain', ...args)"
            @wrong="(...args) => $emit('quizWrong', ...args)"
            @answered="(...args) => $emit('quizAnswered', ...args)"
            @more="(...args) => $emit('quizMore', ...args)"
            @chain-action="$emit('quizChainAction', $event, c)"
          />
          <!-- 离线教学示例的导学阶段卡：与 socratic_step_choice 同一交互契约
               （点选即可读标签作为作答发送），历史里的旧卡由 live 置为回看态 -->
          <ShowcaseStageCard
            v-else-if="cardType(c) === 'showcase_stage'"
            :card="c"
            :used="!live"
            :card-key="`${msg.key}:${ci}`"
            @choose="(t) => onChoiceClick(ci, t, c)"
          />
          <div v-else-if="cardType(c) === 'socratic_hint'" class="soc-tag">
            💡 提示 · {{ hintLabel(c) }}
          </div>
          <!-- sgv3（CHAIN-DESIGN §3.1③）：reading 开场 start 卡省略 steps_count（求解并行，
               步数未定）——缺省不显示「共 ? 步」，字段全防御渲染 -->
          <div v-else-if="cardType(c) === 'socratic_start'" class="soc-tag">
            🧭 引导式解题{{ c.steps_count ? ` · 共 ${c.steps_count} 步` : ' · 先读题理解' }}{{ c.difficulty ? ` · 难度「${difficultyName(c.difficulty)}」` : '' }}
          </div>
          <!-- sgv2 进度卡（DESIGN §6.2：由不渲染改为渲染为紧凑进度条；旧历史消息缺字段时隐藏） -->
          <div
            v-else-if="cardType(c) === 'socratic_progress' && hasProgressData(c) && !hasShowcaseCard"
            class="soc-progress"
          >
            <div class="sp-top">
              <span class="sp-step">第 {{ c.current_step }}/{{ c.steps_count }} 步</span>
              <!-- 离线教学示例：四主阶段名（读题/选方法/分步推导/订正），比后端 phase 更好懂 -->
              <span v-if="c.stage_label" class="sp-chip sp-phase">{{ c.stage_label }}</span>
              <span v-else-if="phaseZh(c.phase)" class="sp-chip sp-phase">{{ phaseZh(c.phase) }}</span>
              <span v-if="c.kp_name" class="sp-chip sp-kp">{{ c.kp_name }}</span>
            </div>
            <div v-if="c.fast_path || c.oversplit" class="sp-note">
              <span v-if="c.fast_path">⚡ 已启用快速引导</span>
              <span v-if="c.oversplit">本题步骤较多，已尽量精简引导</span>
            </div>
            <div class="sp-track"><div class="sp-fill" :class="verdictCls(c.verdict)" :style="{ width: progressPct(c) }"></div></div>
          </div>
          <!-- sgv2 错因分析卡：错在哪 + 原话依据 + 追问（misconception_zh 后端下发） -->
          <SocraticErrorAnalysisCard v-else-if="cardType(c) === 'socratic_error_analysis'" :card="c" />
          <!-- 引导式解题「每步思路选项」：点选即作为学生回答发送，走既有判答链路；
               V2 单发纪律 + 已用态（点击置灰，历史回显由 markHistoryUsedChoices 还原） -->
          <div
            v-else-if="cardType(c) === 'socratic_step_choice'"
            class="soc-choices"
            :class="{ used: isChoiceUsed(ci) }"
            :data-soc-choice-step="String(c.step_no || c.step || '')"
          >
            <div class="soc-choices-title">{{ choiceLead(c, ci) }}</div>
            <button
              v-for="(o, oi) in (c.options || [])"
              :key="oi"
              class="soc-choice"
              :disabled="isChoiceUsed(ci)"
              @click="onChoiceClick(ci, o, c)"
            >
              <span class="soc-choice-key">{{ 'ABCD'[oi] }}</span>
              <span class="soc-choice-body"><MarkdownView :text="o" :zoomable="false" /></span>
              <span v-if="isChoiceUsed(ci)" class="soc-choice-used">已选 ✓</span>
            </button>
          </div>
          <!-- sgv2 前置补课卡：工作示例 + 检验题作答 + 回原题/跳过 -->
          <!-- sgv3（CHAIN-DESIGN §6.1）统一交互信封卡：form 分发九种免打字形态；
               提交走 interact 协议（视图组 tutor_interaction 上下文），打字回退/跳过走
               既有 attempt 链路兜底；已用态置灰防重复作答（markInteractionUsed 同款纪律） -->
          <SocraticInteractionCard
            v-else-if="cardType(c) === 'socratic_interaction'"
            :card="c"
            :used="isInteractionUsed(ci)"
            @submit="(p) => onInteractionSubmit(ci, c, p)"
            @text="(t) => $emit('socraticChoice', { text: t, sessionId: ixSessionId(c), stepNo: ixStepNo(c) })"
            @skip="(label) => $emit('socraticChoice', { text: label, sessionId: ixSessionId(c), stepNo: ixStepNo(c), action: 'skip' })"
          />
          <!-- sgv3（CHAIN-DESIGN §9.1）门禁卡：无题不引导——四入口（拍照/打字/选题/AI出题）
               由视图承接（DialogView/DualView 双处同步，前端不做拦截判定只改入口语义） -->
          <div v-else-if="cardType(c) === 'socratic_need_problem'" class="soc-needprob" data-soc-need-problem="">
            <div class="np-hint">🧾 {{ c.hint || '把题目给我，我才能带你解' }}</div>
            <div class="np-entries">
              <button
                v-for="e in needEntries(c)" :key="e.kind" type="button"
                class="np-btn" :data-np-kind="e.kind"
                @click="$emit('needProblem', e.action || e.kind)"
              >{{ e.label }}</button>
            </div>
          </div>
          <!-- sgv3（CHAIN-DESIGN §7.3）换挡宣告卡：掌握度升降显式宣告（wow W5），
               四档支持强度人设化（陪拆/搭手架/递工具/当裁判）——学生看见自己赢得的自主权 -->
          <div
            v-else-if="cardType(c) === 'socratic_tier_shift'"
            class="soc-tier-shift" :class="c.direction === 'down' ? 'down' : 'up'"
            :data-soc-tier-shift="String(c.direction || '')"
          >
            <span class="ts-badge">{{ c.direction === 'down' ? '🧗 换挡' : '🚀 换挡' }}</span>
            <span class="ts-move">{{ tierZh(c.from) }} → {{ tierZh(c.to) }}</span>
            <span v-if="c.text" class="ts-text">{{ c.text }}</span>
          </div>
          <SocraticDetourCard
            v-else-if="cardType(c) === 'socratic_detour'"
            :card="c"
            @act="$emit('tutorAction', $event)"
            @check="$emit('socraticChoice', {
              text: $event,
              sessionId: c.session_id || c.sessionId || '',
              stepNo: null,
            })"
            @check-interaction="(p) => $emit('interactionSubmit', {
              summary: p.summary, payload: p.payload, spentMs: p.spentMs,
              sessionId: c.session_id || c.sessionId || '',
              stepNo: null,
              interactionId: p.interactionId || '', form: p.form || '',
              cardIndex: ci, msgKey: msg.key,
            })"
          />
          <!-- sgv2 补课结果：紧凑状态条（bridge_text 由相邻文本消息承载，不重复渲染） -->
          <div v-else-if="cardType(c) === 'socratic_detour_result'" class="soc-tag" :class="detourResultCls(c)">
            {{ detourResultText(c) }}
          </div>
          <!-- sgv3（CHAIN-DESIGN §10-W6 / §2.2 reflecting）思维轨迹回放卡：展示型
               （本会话真实数据的攀登路线图，无作答回传无已用态）；replay 缺失/空
               不渲染（禁套话，沿 hasProgressData 防御判空纪律，旧消息零影响） -->
          <SocraticReplayCard
            v-else-if="cardType(c) === 'socratic_replay' && hasReplayData(c)"
            :card="c"
          />
          <SocraticCompleteCard
            v-else-if="cardType(c) === 'socratic_complete'"
            :card="c"
            @act="$emit('completeAction', { type: $event, card: c })"
          />
          <!-- sgv4（DESIGN F16 分发链接线）：确认/引导按钮卡族三语境（exit_offer/confirm/nudge）
               与 L2 概念卡——缺此注册则新卡全落 GenericCard 死卡兜底（违 AGENTS §8
               UI Reality Contract），按钮动作经 tutorAction 白名单透传（无对错判定不计轮次） -->
          <SocraticConfirmCard
            v-else-if="['socratic_exit_offer', 'socratic_confirm', 'socratic_nudge'].includes(cardType(c))"
            :card="c"
            @act="$emit('tutorAction', $event)"
          />
          <SocraticConceptCard
            v-else-if="cardType(c) === 'socratic_concept_card'"
            :card="c"
            @act="$emit('tutorAction', $event)"
          />
          <div v-else-if="cardType(c) === 'socratic_degraded'" class="soc-tag orange">⚠️ 引导服务降级中，按普通对话继续</div>
          <!-- P1 对话内视频推荐卡（B站真实数据，整卡新标签打开；历史经 envelope.blocks type=card 还原同构） -->
          <VideoCardsCard v-else-if="cardType(c) === 'video_cards'" :card="c" />
          <!-- R2 学情可视化卡：FSRS 记忆曲线 / BKT 掌握度（数据全部后端现算下发，
               前端不自取数；空态诚实展示；act 事件转发既有 action(open_page) 协议） -->
          <RetentionCurveCard
            v-else-if="cardType(c) === 'fsrs_retention'"
            :card="c"
            @act="$emit('action', $event)"
          />
          <MasteryBktCard
            v-else-if="cardType(c) === 'mastery_bkt'"
            :card="c"
            @act="$emit('action', $event)"
          />
          <!-- socratic_confirm_answer：由下方确认条承接，不重复渲染（sgv2：progress 已上移为进度条）；
               socratic_progress 无字段旧卡在此兜底隐藏（§6.5.3 防御性判空，不进 GenericCard） -->
          <!-- 兜底：历史数据把 action 装进 card 块（seed/旧消息）→ 仍渲染为可点按钮 -->
          <div v-else-if="cardType(c) === 'action'" class="action-card">
            <button class="action-btn" @click="$emit('action', c)">
              🚀 {{ c.label || '立即前往' }}
            </button>
          </div>
          <GenericCard
            v-else-if="!['socratic_confirm_answer', 'socratic_progress'].includes(cardType(c))"
            :card="c"
          />
        </template>

        <!-- 防泄题「直接看答案」二次确认条（ADR-033） -->
        <div v-if="msg.answerConfirm && !msg.confirmDismissed" class="confirm-bar">
          <div class="cb-text">⚠️ 直接查看答案会失去逐步引导的机会，确定要看完整解答吗？</div>
          <div class="cb-btns">
            <button class="btn btn-sm btn-danger" @click="$emit('answerConfirm', msg)">确认查看完整解答</button>
            <button class="btn btn-sm" @click="$emit('thinkMore', msg)">我再想想</button>
          </div>
        </div>

        <!-- v1.4 功能直达按钮卡（open_page action：AI 先回答确认语，用户主动点击才跳转；
             替代迭代14 的静默跳页——对齐「AI 回答 + 按钮」的主流交互） -->
        <div v-if="msg.action && msg.action.kind === 'open_page'" class="action-card">
          <button class="action-btn" @click="$emit('action', msg.action)">
            🚀 {{ msg.action.label || '立即前往' }}
          </button>
        </div>

        <!-- notice / 未知 block 占位 -->
        <div v-for="(n, i) in msg.notices" :key="'n' + i" class="notice-bar">{{ n }}</div>
        <div v-for="(b, i) in msg.unknownBlocks" :key="'u' + i" class="unknown-block">
          暂不支持的内容类型：{{ b.type || '未知' }}
        </div>

        <!-- 引用来源卡片（阶段 6B：SourceCard 展示 title/url/snippet/retrieved_at，缺失字段回退 source） -->
        <div v-if="msg.citations.length" class="citations">
          <SourceCard
            v-for="c in msg.citations"
            :key="c.n"
            :c="c"
            :open="expandedCite === c.n"
            @toggle="expandedCite = expandedCite === c.n ? 0 : c.n"
          />
        </div>

        <!-- 搜索降级提示（阶段 6B：web_search 工具降级结果透传） -->
        <div v-if="msg.degraded" class="degraded-bar">⚠️ {{ degradedText }}</div>

        <!-- 底部徽标行（tokens/耗时已挪入操作条 meta 的 title tooltip，不再常驻） -->
        <div v-if="hasFoot" class="msg-foot">
          <span v-if="msg.badge" class="tag cyan">{{ badgeText }}</span>
          <span v-if="msg.interrupted || msg.status === 'aborted'" class="tag orange">已中断</span>
          <span v-if="msg.status === 'error'" class="tag red">{{ msg.errorText || '出错了' }}</span>
        </div>

        <!-- AI 生成标识：只在该会话最后一条 AI 回复末尾显示一次（评审：每条都挂是噪声） -->
        <AiGeneratedMark v-if="live" :provider="aiSkillLabel" :content-id="String(msg.msgId || msg.key || '')" />
      </div>

      <!-- AI 消息操作条（M2 §4.2：复制｜重新生成｜版本导航｜👍👎｜时间戳+模型徽标） -->
      <div v-if="msg.status === 'done' || msg.status === 'aborted' || msg.status === 'error'" class="msg-actions">
        <button class="act" :title="copied ? '已复制' : '复制'" @click="onCopy">
          <UiIcon :name="copied ? 'check' : 'copy'" :size="14" />
        </button>
        <button class="act" title="重新生成" @click="$emit('regenerate', msg)">
          <UiIcon name="refresh" :size="14" />
        </button>

        <!-- 版本导航 ◀ 1/2 ▶（versions.count>1 时显示） -->
        <template v-if="msg.versions && msg.versions.count > 1">
          <button
            class="act" title="上一个版本" :disabled="msg.versions.index <= 1"
            @click="switchVersion(msg.versions.index - 1)"
          >
            <UiIcon name="chevron-left" :size="14" />
          </button>
          <span class="ver-ind">{{ msg.versions.index }}/{{ msg.versions.count }}</span>
          <button
            class="act" title="下一个版本" :disabled="msg.versions.index >= msg.versions.count"
            @click="switchVersion(msg.versions.index + 1)"
          >
            <UiIcon name="chevron-right" :size="14" />
          </button>
        </template>

        <button
          class="act" :class="{ on: msg.feedback === 'up' }" title="有帮助"
          @click="$emit('feedback', msg, 'up', '')"
        >
          <UiIcon name="thumbs-up" :size="14" />
        </button>
        <button
          class="act" :class="{ on: msg.feedback === 'down' }" title="有问题"
          @click="onThumbsDown"
        >
          <UiIcon name="thumbs-down" :size="14" />
        </button>

        <!-- hover 显现：时间戳 + 模型徽标（tokens/耗时挪进 title tooltip） -->
        <span class="act-meta" :title="metaTooltip">
          {{ fmtHm(msg.createdAt) }}<template v-if="msg.skill"> · {{ skillTitle }}</template>
        </span>

        <!-- 引导技能专属操作（会话已结束则隐藏，防止结束后动作掉状态机）；
             sgv2（DESIGN §8.1/§3.5 触发器 3）：「我没思路」低评判固定求助入口——
             发文本 attempt 不改协议，后端按显式求助强信号直接触发 gap 门控 -->
        <template v-if="msg.skill === 'socratic_solver' && !tutorDone">
          <button class="act hint" title="这里的求助不计入任何评价" @click="$emit('tutorAction', 'stuck')">我没思路</button>
          <button class="act hint" @click="$emit('tutorAction', 'hint')">来点提示</button>
          <button class="act hint" @click="$emit('tutorAction', 'answer')">直接看答案</button>
        </template>
      </div>

      <!-- 点踩原因弹层（M2 §4.2：reason 随 feedback 持久化） -->
      <div v-if="downOpen" class="down-pop glass-card">
        <div class="down-title">回答哪里有问题？（可不填直接提交）</div>
        <textarea
          v-model="downReason" class="down-ta" rows="2" maxlength="500"
          placeholder="如：步骤跳跃看不懂 / 答案算错了 / 公式渲染异常…"
        ></textarea>
        <div class="down-btns">
          <button class="btn btn-sm" @click="downOpen = false">取消</button>
          <button class="btn btn-primary btn-sm" @click="submitDown">提交反馈</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'
import IncrementalMarkdown from './IncrementalMarkdown.vue'
import GraphBlock from './GraphBlock.vue'
import MathFigure from './MathFigure.vue'
import QuizSetCard from './QuizSetCard.vue'
import GenericCard from './GenericCard.vue'
import SocraticCompleteCard from './SocraticCompleteCard.vue'
import SocraticErrorAnalysisCard from './SocraticErrorAnalysisCard.vue'
import SocraticReplayCard from './SocraticReplayCard.vue'
import SocraticDetourCard from './SocraticDetourCard.vue'
import SocraticInteractionCard from './SocraticInteractionCard.vue'
import SocraticConfirmCard from './SocraticConfirmCard.vue'
import SocraticConceptCard from './SocraticConceptCard.vue'
import ShowcaseStageCard from './ShowcaseStageCard.vue'
import AttachmentThumb from './AttachmentThumb.vue'
import SourceCard from './SourceCard.vue'
import VideoCardsCard from './VideoCardsCard.vue'
import RetentionCurveCard from './RetentionCurveCard.vue'
import MasteryBktCard from './MasteryBktCard.vue'
import AiGeneratedMark from './AiGeneratedMark.vue'
import UiIcon from '@/components/common/UiIcon.vue'
import {
  HINT_LEVEL_ZH, PHASE_ZH, MASTERY_STATE_ZH, SCAFFOLD_LABEL_ZH, SCAFFOLD_LEVEL_ZH, fmtHm,
} from './messageModel'
import { skillByKey, SKILLS, SKILL_KEY_BY_ID } from '@/config/skills'
import { difficultyName } from '@/components/student/labels'
import { copyText } from '@/utils/markdown'

const props = defineProps({
  msg: { type: Object, required: true },
  /** 是否是该会话最后一条 AI 消息：只有它可交互，历史旧卡只回看（不向当前步骤注入事件） */
  live: { type: Boolean, default: true },
})
// P1-5：选项统一在 AI 消息卡片下方渲染（主题色、KaTeX）
const clarifyOpts = computed(() => (props.msg?.clarify?.options || []))
const emit = defineEmits([
  'clarify', 'socraticChoice', 'regenerate', 'feedback', 'quizEnter', 'quizExplain', 'quizWrong', 'quizAnswered', 'quizMore', 'quizChainAction', 'tutorAction',
  'answerConfirm', 'thinkMore', 'edit', 'versionSwitch', 'action', 'completeAction',
  'interactionSubmit', 'needProblem',
])

const expandedCite = ref(0)

// 搜索降级文案（阶段 6B）：优先透传 message，否则按 error_code 映射
const DEGRADED_ZH = {
  confirmation_required: '本地知识库未检索到相关内容，联网搜索需先授权',
}
const degradedText = computed(() => {
  const d = props.msg.degraded
  if (!d) return ''
  return d.message || DEGRADED_ZH[d.error_code] || '服务降级，已按本地知识库作答'
})

/* ===== 复制 ===== */
const copied = ref(false)
async function onCopy() {
  const ok = await copyText(props.msg.text || '')
  if (ok) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1200)
  }
}

/* ===== 用户消息内联编辑 ===== */
const editing = ref(false)
const editDraft = ref('')
const editTaRef = ref(null)
function startEdit() {
  editDraft.value = props.msg.text
  editing.value = true
  nextTick(() => editTaRef.value?.focus())
}
function cancelEdit() { editing.value = false }
function saveEdit() {
  const t = editDraft.value.trim()
  if (!t) return
  editing.value = false
  emit('edit', props.msg, t)
}

/* ===== 版本导航 ===== */
function switchVersion(newIndex) {
  const v = props.msg.versions
  if (!v || newIndex < 1 || newIndex > v.count) return
  const targetId = v.ids?.[newIndex - 1]
  if (targetId) emit('versionSwitch', props.msg, targetId)
}

/* ===== 👎 原因弹层 ===== */
const downOpen = ref(false)
const downReason = ref('')
function onThumbsDown() {
  if (props.msg.feedback === 'down') {
    emit('feedback', props.msg, 'down', '') // 再点取消点踩
    return
  }
  downReason.value = props.msg.feedbackReason || ''
  downOpen.value = !downOpen.value
}
function submitDown() {
  downOpen.value = false
  emit('feedback', props.msg, 'down', downReason.value.trim())
}

/* ===== 展示计算 ===== */
const skillTitle = computed(() => {
  try { return props.msg.skill ? skillByKey(props.msg.skill).title : '' } catch { return props.msg.skill }
})

/**
 * AI 标识里的「生成方」：后端 meta.skill 下发的是 skill_id（如 socratic_solver），
 * 需先归一为前端 key（socratic）再取中文名；未知标识回显原文，不误落默认「自由对话」。
 * 注：上方 skillTitle 未做归一，是既有问题，本次不动。
 */
const aiSkillLabel = computed(() => {
  const id = String(props.msg.skill || '')
  if (!id) return ''
  const hit = SKILLS.find((s) => s.key === (SKILL_KEY_BY_ID[id] || id))
  return hit ? hit.title : id
})

// tokens/耗时 → 操作条 meta 的 tooltip（不再常驻小字）
const metaTooltip = computed(() => {
  const parts = []
  if (props.msg.createdAt) parts.push(fmtHm(props.msg.createdAt))
  if (props.msg.skill) parts.push(skillTitle.value)
  if (props.msg.usage) parts.push(`tokens ${props.msg.usage.tokens_in}/${props.msg.usage.tokens_out}`)
  if (props.msg.latencyMs) parts.push(`${props.msg.latencyMs}ms`)
  return parts.join(' · ')
})

const hasFoot = computed(
  () => props.msg.badge || props.msg.interrupted
    || props.msg.status === 'aborted' || props.msg.status === 'error'
)

const badgeText = computed(() => {
  const b = props.msg.badge
  if (b === 'web_supplement') return '🌐 联网补充'
  return b
})

/** 该消息是否含离线教学示例的导学卡：是则阶段只由顶部徽标表达，卡内不再重复进度条 */
const hasShowcaseCard = computed(() =>
  (props.msg.cards || []).some((c) => (c?.type || c?.card_type) === 'showcase_stage'),
)

function cardType(c) {
  return c?.type || c?.card_type || ''
}

// 引导会话已结束（消息内含 socratic_complete 完成卡）：
// 隐藏「来点提示/直接看答案」——结束后点动作会掉出状态机幻觉出题（M2.2 修复），
// 后续学习出口由完成卡按钮行（举一反三/错题本/学情，v1.4）承接
const tutorDone = computed(
  () => (props.msg.cards || []).some((c) => cardType(c) === 'socratic_complete')
)
function hintLevelZh(c) {
  return HINT_LEVEL_ZH[c.level] || ''
}

/* ===== sgv2（DESIGN §8 前端重构）：对话流新卡片 helpers ===== */

// 提示卡标签：优先五档脚手架名（scaffold_label 英文 key 由后端下发，prompts/policy 对齐），
// 旧卡（只有 level 1-3）回退既有文案
function hintLabel(c) {
  const zh = SCAFFOLD_LABEL_ZH[c.scaffold_label]
  if (zh) return zh
  return `第 ${c.level} 级${hintLevelZh(c) ? `（${hintLevelZh(c)}）` : ''}`
}

// 进度条仅在字段齐备时渲染（§6.5.3：旧历史消息无新字段 → 隐藏，防御性判空）
function hasProgressData(c) {
  return Number(c?.current_step) > 0 && Number(c?.steps_count) > 0
}
function progressPct(c) {
  const cur = Number(c?.current_step) || 0
  const total = Number(c?.steps_count) || 0
  if (total <= 0) return '0%'
  return `${Math.max(4, Math.min(100, Math.round((cur / total) * 100)))}%`
}
function phaseZh(phase) {
  return PHASE_ZH[phase] || ''
}
// 五档名：scaffold_level（0-4 数字）优先，scaffold_label（英文 key）兜底
function scaffoldZh(c) {
  if (c?.scaffold_level !== undefined && c?.scaffold_level !== null) {
    return SCAFFOLD_LEVEL_ZH[Number(c.scaffold_level)] || ''
  }
  return SCAFFOLD_LABEL_ZH[c?.scaffold_label] || ''
}
function masteryZh(state) {
  return MASTERY_STATE_ZH[state] || ''
}
// 判分着色进度条填充（verdict 缺省 → 品牌色）
function verdictCls(verdict) {
  return { correct: 'is-correct', partial: 'is-partial', wrong: 'is-wrong' }[verdict] || ''
}

// 选项已用态：msg.usedChoices[cardIndex]（点击置位；历史回显由 markHistoryUsedChoices 还原）
function isChoiceUsed(cardIndex) {
  return !!props.msg.usedChoices?.[cardIndex]
}

/* ===== sgv3（CHAIN-DESIGN §6.1/§6.2）交互信封卡 helpers ===== */
// sgv3（§10-W6）：回放卡仅在 replay 有效时渲染——后端 build_replay_data 无数据
// 已不下发卡，这里防异常 payload/旧消息（沿 hasProgressData 防御判空纪律）
function hasReplayData(c) {
  const r = c?.replay
  if (!r || typeof r !== 'object') return false
  return (Array.isArray(r.steps) && r.steps.some((s) => s && typeof s === 'object' && (Number(s.wrong_count) > 0 || Number(s.hints) > 0 || s.what)))
    || (Array.isArray(r.forms_used) && r.forms_used.length > 0)
    || (Array.isArray(r.tier_path) && r.tier_path.length > 0)
}
// 交互卡已用态：msg.usedInteractions[cardIndex]（提交置位；历史回显由 markHistoryUsedChoices 还原）
function isInteractionUsed(cardIndex) {
  return !!props.msg.usedInteractions?.[cardIndex]
}
function ixSessionId(card) {
  return card?.session_id || card?.sessionId || ''
}
// reading/planning 阶段 step_no=0 → 不带 tutor_step_no 键（与选项卡 Number||null 同款）
function ixStepNo(card) {
  return Number(card?.step_no) || null
}
// 信封卡提交：透传 summary/payload/spentMs/editCount(sgv4 §3.5) + 卡上下文，
// 由视图组 tutor_interaction（interact 协议）
function onInteractionSubmit(cardIndex, card, p) {
  if (isInteractionUsed(cardIndex)) return
  emit('interactionSubmit', {
    summary: p?.summary || '',
    payload: p?.payload || {},
    spentMs: Number(p?.spentMs) || 0,
    editCount: Number(p?.editCount) || 0, // sgv4 数据飞轮：改选/编辑次数（R5 脆弱掌握判据）
    sessionId: ixSessionId(card),
    stepNo: ixStepNo(card),
    interactionId: card?.interaction_id || '',
    form: String(card?.form || ''),
    cardIndex,
    msgKey: props.msg.key,
  })
}
// 门禁卡四入口（§9.1 entries 协议；空 entries 防御性不渲染按钮）
function needEntries(c) {
  return Array.isArray(c?.entries) ? c.entries.filter((e) => e && (e.label || e.kind)) : []
}
// 四档支持强度人设化文案（§7.3：T0 最强支持 → T3 自主；from/to 后端下发 0-3）
function tierZh(v) {
  return { 0: '陪拆', 1: '搭手架', 2: '递工具', 3: '当裁判' }[Number(v)] || String(v ?? '')
}
// 点击选项：透传 cardIndex/msgKey，由视图层在真实发送时置位已用态
// （DESIGN §8.2 onSocraticChoice 透传 cardIndex；流式中点击被守卫拒绝则不置灰，
// 避免「已选但未发送」的假状态）。发送契约不变：选项原文作为 attempt（§3.6 点选即执行）。
function onChoiceClick(cardIndex, optionText, card) {
  if (isChoiceUsed(cardIndex)) return
  emit('socraticChoice', {
    text: optionText,
    sessionId: card?.session_id || card?.sessionId || '',
    stepNo: Number(card?.step_no || card?.step || card?.stepNo || 0) || null,
    cardIndex,
    msgKey: props.msg.key,
  })
}
// V2 G15（DESIGN §10.4.1）：选项组引导语差异化——消除「这一步可以从哪儿入手？」固定复读感：
// 已用态 > 后端随卡下发的自定义引导语（lead/guide_text，防御两种字段名）> kind/阶段差异化。
// opening「先选个方向试试」/ guiding「换个思路？点一个或直接打字」（设计指定文案，
// 仅用于答错纠偏语境；同消息 progress 卡 verdict=correct 的「进入新步」语境换成步入语）/ replay「回到这一步…」
function choiceLead(c, cardIndex) {
  if (isChoiceUsed(cardIndex)) return '方向已选 · 看老师对这步的回应 👆'
  const lead = String(c?.lead || c?.guide_text || '').trim()
  if (lead) return lead
  if (c?.kind === 'replay') return '回到这一步？还是可以从这几个方向入手 👇'
  // sgv3（CHAIN-DESIGN §2.2）：choice 在 reading/planning 阶段的两个合法语境差异化
  //（R5 题型辨析 / R8 押注承诺）——后端 lead 下发仍最高优先（G15 遗留补全）
  const stage = choiceStage(c)
  if (stage === 'reading') return '这题最像哪一类？选出题型，顺便想想你的判断依据 👇'
  if (stage === 'planning') return '先押一条你觉得走得通的路线 👇'
  if (choicePhase(c) === 'opening') return '先选个方向试试 👇'
  const prevProgress = progressBefore(c)
  if (prevProgress?.verdict === 'correct') return '进入下一步——从哪儿入手？点一个或直接打字 👇'
  return '换个思路？点一个，或直接打字说你的想法 👇'
}
// sgv3：选项卡所在轮的 stage 子阶段——同消息内更早的 progress/start/interaction 卡
// 的 stage 字段 > done.meta.socratic.stage（§4.3 build_meta_socratic 五字段下发）
function choiceStage(card) {
  const cards = props.msg.cards || []
  const idx = cards.indexOf(card)
  for (let i = (idx < 0 ? cards.length : idx) - 1; i >= 0; i--) {
    const c = cards[i]
    const t = cardType(c)
    if ((t === 'socratic_progress' || t === 'socratic_start' || t === 'socratic_interaction') && c.stage) {
      return String(c.stage)
    }
  }
  return String(props.msg.doneMeta?.socratic?.stage || '')
}
// 选项卡所在轮的教学阶段：同消息内更早的 progress 卡 phase > start 卡（opening）
// > done.meta.socratic.phase（流式完成信封）；历史消息经 blocks 还原的卡序同样适用
function choicePhase(card) {
  const cards = props.msg.cards || []
  const idx = cards.indexOf(card)
  for (let i = (idx < 0 ? cards.length : idx) - 1; i >= 0; i--) {
    const c = cards[i]
    const t = cardType(c)
    if (t === 'socratic_progress' && c.phase) return String(c.phase)
    if (t === 'socratic_start') return 'opening'
  }
  return String(props.msg.doneMeta?.socratic?.phase || '')
}
// 同消息内选项卡之前最近一张 progress 卡（G15 判「答错纠偏 vs 进入新步」语境用）
function progressBefore(card) {
  const cards = props.msg.cards || []
  const idx = cards.indexOf(card)
  for (let i = (idx < 0 ? cards.length : idx) - 1; i >= 0; i--) {
    if (cardType(cards[i]) === 'socratic_progress') return cards[i]
  }
  return null
}

// 补课结果状态条文案（bridge_text 由相邻文本消息承载，不在卡内重复）
function detourResultCls(c) {
  return { passed: 'green', failed: 'orange' }[c?.status] || ''
}
function detourResultText(c) {
  return (
    {
      passed: '✓ 补课检验通过，回到原题继续',
      failed: '补课未通过——这一步我直接做给你看',
      skipped: '已跳过补课，直接看这一步的做法',
    }[c?.status] || '补课结束，回到原题'
  )
}

// 迭代15 L1-4：过程条 stage 英文 key 中文化（程序员词汇不暴露给学生）
// R2：管家数据查询链路 stage（后端 chat_bridge 发什么 key 以其为准，未列出的回退原文）
const STAGE_ZH = {
  kb_search: '查题库',
  solving: '分析题目',
  guiding: '准备提问',
  generating: '生成中',
  verifying: '校验中',
  judging: '判分中',
  file: '文件解析',
  butler_plan: '管家规划',
  butler_query: '查询学情数据',
  butler_execute: '执行数据查询',
  butler_degraded: '降级提示',
  offline: '离线示例',
}
function stageName(stage) {
  return STAGE_ZH[stage] || stage
}
</script>

<style scoped>
.msg-row { display: flex; margin-bottom: var(--space-4); }
.msg-row.user { justify-content: flex-end; }
.user-col { display: flex; flex-direction: column; align-items: flex-end; max-width: 78%; }
.bubble { max-width: 100%; padding: var(--space-3) var(--space-4); font-size: var(--text-sm); }
.user-bubble {
  background: var(--primary);
  color: #fff; border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
/* 白字只管气泡自身正文（直接子级）；用子选择器避开 .ub-question 白卡，否则题干白字压白底 */
.user-bubble > :deep(.md-body) { color: #fff; }
/* 题目白卡（与出题卡 qc-stem-box 同风格：暖白纸面+圆角）。注意在用户气泡内必须是深字（气泡本身是紫色渐变） */
.ub-question {
  background: #fff; color: var(--text-primary);
  border: 1px solid rgba(120, 120, 160, .25);
  border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;
  font-size: 14px; line-height: 1.7; box-shadow: 0 1px 3px rgba(0, 0, 0, .06);
}
.ub-question :deep(.md-body p) { margin: 0 0 4px; }
.ub-q-opts { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.ub-q-opt { display: flex; gap: 6px; align-items: flex-start; font-size: 13px; }
.ub-q-key {
  width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
  background: #EEF1FF; color: #5B5FC7; font-size: 11px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; margin-top: 2px;
}
.ub-q-body { flex: 1; min-width: 0; }
.user-bubble > :deep(.md-body) code { background: rgba(255, 255, 255, 0.18); color: #fff; }
.ub-atts { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2); }
/* 气泡外的题图：白底细边框，不再被紫色底衬 */
.ub-atts.outside { justify-content: flex-end; margin-bottom: 10px; }
.ub-atts.outside :deep(.att-img) {
  border: 1px solid var(--border); background: #fff; border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.ub-atts.outside :deep(.att-thumb) { max-width: 100%; }
/* 内联编辑 */
.ub-edit-ta {
  width: 100%; min-width: 320px; border: none; outline: none; resize: vertical;
  background: rgba(255, 255, 255, 0.14); color: #fff; border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3); font-family: var(--font); font-size: var(--text-sm); line-height: 1.6;
}
.ub-edit-ta::placeholder { color: rgba(255, 255, 255, 0.6); }
.ub-edit-btns { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-2); }
.ub-edit-cancel { background: transparent; border-color: rgba(255, 255, 255, 0.4); color: #fff; }
.ub-edit-cancel:hover { background: rgba(255, 255, 255, 0.12); color: #fff; border-color: rgba(255, 255, 255, 0.6); }
.ub-edit-save { background: #fff; border-color: #fff; color: var(--primary); }
.ub-edit-save:hover:not(:disabled) { background: var(--bg-subtle); color: var(--primary-hover); }

.msg-row.ai { justify-content: flex-start; }
.ai-avatar {
  width: 32px; height: 32px; border-radius: var(--radius-md); flex-shrink: 0; margin-right: var(--space-2);
  background: var(--primary); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: var(--font-semibold); font-size: var(--text-sm);
  font-family: var(--font-serif);
}
.ai-col { max-width: 82%; min-width: 0; }
.ai-bubble { border-radius: var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg); padding: var(--space-3) var(--space-4); background: var(--bg-white); border: 1px solid var(--border); }
.typing { color: var(--text-muted); font-size: var(--text-sm); display: flex; align-items: center; gap: var(--space-2); }

.status-bar { margin-bottom: var(--space-2); font-size: var(--text-xs); color: var(--text-muted); }
.status-bar summary {
  cursor: pointer; display: flex; align-items: center; gap: var(--space-2); list-style: none;
  padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); background: var(--bg-white);
  border: 1px solid var(--border); width: fit-content; max-width: 100%;
}
.sb-count { color: var(--primary); margin-left: var(--space-1); }
.sb-list { padding: var(--space-2) var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); }
.sb-item { display: flex; align-items: center; gap: var(--space-2); }
.sb-stage { font-size: 10px; }

/* M2 重构：模型思考过程面板 */
.thinking-bar { margin-bottom: var(--space-2); font-size: var(--text-xs); color: var(--text-muted); }
.thinking-bar summary {
  cursor: pointer; display: flex; align-items: center; gap: var(--space-2); list-style: none;
  padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); background: var(--bg-white);
  border: 1px dashed var(--primary-border); width: fit-content; max-width: 100%; color: var(--primary);
}
.thinking-content {
  padding: var(--space-2) var(--space-3); white-space: pre-wrap; word-break: break-word;
  font-family: var(--font); line-height: 1.7; max-height: 320px; overflow-y: auto;
  background: var(--bg-white); border: 1px dashed var(--border); border-radius: var(--radius-sm);
  margin-top: var(--space-1); color: var(--text-muted);
}

.clarify-box { margin-top: 8px; }
.clarify-q { font-size: 12.5px; color: var(--ink3); margin-bottom: 8px; }
.clarify-opts { display: flex; flex-direction: column; gap: 8px; }
.clarify-chip {
  display: flex; align-items: center; gap: 10px; text-align: left;
  padding: 11px 14px; border: 1px solid var(--line); border-radius: 10px;
  background: var(--brand-soft); color: var(--ink); font-size: 13.5px; line-height: 1.55;
  cursor: pointer; transition: all .15s; width: 100%;
}
.clarify-chip:hover { background: #E3E7FF; border-color: var(--brand-faint); }
.cc-key {
  width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0;
  background: var(--brand); color: #fff; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; font-size: 12px;
}
.cc-body { flex: 1; min-width: 0; }
.cc-body :deep(.md-body p) { margin: 0; }
.cc-body :deep(.katex) { font-size: 1.02em; color: var(--ink); }
.soc-tag {
  margin-top: 8px; font-size: 12px; color: var(--primary); background: #EEF1FF;
  border-radius: var(--radius-sm); padding: 4px 10px; width: fit-content;
}
.soc-tag.green { color: #059669; background: #ecfdf5; }
.soc-tag.orange { color: #d97706; background: #fffbeb; }

/* sgv3 门禁卡（CHAIN-DESIGN §9.1）：无题不引导——四入口按钮组 */
.soc-needprob {
  margin-top: 10px; padding: 12px 14px; border-radius: var(--radius-md);
  border: 1px solid rgba(245, 158, 11, 0.4); background: rgba(255, 251, 235, 0.7);
}
.np-hint { font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 9px; }
.np-entries { display: flex; flex-wrap: wrap; gap: 7px; }
.np-btn {
  padding: 8px 14px; border-radius: var(--radius-md); cursor: pointer; font-size: 12.5px; font-weight: 600;
  border: 1px solid rgba(217, 119, 6, 0.35); background: var(--bg-white); color: #b45309;
  transition: all var(--transition-fast);
}
.np-btn:hover { border-color: #d97706; background: #fffbeb; transform: translateY(-1px); }

/* sgv3 换挡宣告卡（CHAIN-DESIGN §7.3，wow W5）：升档荣誉绿 / 降档台阶琥珀 */
.soc-tier-shift {
  margin-top: 10px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  padding: 9px 13px; border-radius: var(--radius-md); font-size: 12.5px;
}
.soc-tier-shift.up { border: 1px solid rgba(5, 150, 105, 0.35); background: rgba(236, 253, 245, 0.7); }
.soc-tier-shift.down { border: 1px solid rgba(217, 119, 6, 0.35); background: rgba(255, 251, 235, 0.7); }
.ts-badge { font-weight: 800; }
.soc-tier-shift.up .ts-badge { color: #047857; }
.soc-tier-shift.down .ts-badge { color: #b45309; }
.ts-move { font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.ts-text { color: var(--text-secondary); font-size: 12px; }

/* 引导式解题：每步思路选项（点选即作为学生回答发送，走既有判答链路） */
.soc-choices { margin-top: 12px; }
.soc-choices-title { font-size: 12.5px; color: var(--ink3, #94a3b8); margin-bottom: 8px; }
.soc-choice {
  display: flex; align-items: flex-start; gap: 8px; width: 100%;
  margin-bottom: 6px; padding: 10px 12px; text-align: left;
  border: 1px solid var(--line, #e2e8f0); border-radius: var(--radius-md);
  background: var(--card, #fff); cursor: pointer; font: inherit; font-size: 13.5px;
  color: var(--ink, #1e293b); transition: background .16s, border-color .16s;
}
.soc-choice:hover { background: var(--primary-subtle, #eef2ff); border-color: var(--primary-border, #c7d2fe); }
.soc-choice-key {
  flex: 0 0 auto; width: 20px; height: 20px; line-height: 20px; text-align: center;
  border-radius: 6px; background: var(--primary-subtle, #eef2ff);
  color: var(--primary, #5b5bd6); font-size: 12px; font-weight: 600;
}
.soc-choice-body { flex: 1 1 auto; min-width: 0; }
/* V2 已用态：置灰 + 「已选」标记（点选即执行，方向不可重选；§3.6） */
.soc-choice.used { cursor: default; opacity: 0.62; background: var(--bg-subtle, #f8fafc); }
.soc-choice.used:hover { background: var(--bg-subtle, #f8fafc); border-color: var(--line, #e2e8f0); }
.soc-choice-used {
  flex: 0 0 auto; align-self: center; font-size: 11px; font-weight: 600;
  color: var(--primary, #5b5bd6); white-space: nowrap;
}

/* sgv2 进度条卡（socratic_progress 紧凑渲染：步数/阶段/档位/知识点/轮次） */
.soc-progress { margin-top: 10px; }
.sp-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
.sp-step { font-size: 12px; font-weight: 700; color: var(--primary); }
.sp-chip { font-size: 11px; border-radius: var(--radius-full); padding: 1px 8px; }
.sp-phase { color: var(--text-secondary); background: var(--bg-subtle, #f1f5f9); }
.sp-scaffold { color: #6d28d9; background: #f5f3ff; }
.sp-kp { color: var(--primary); background: #eef2ff; }
.sp-mastery { color: #047857; background: #ecfdf5; }
.sp-rounds { font-size: 10.5px; color: var(--text-muted); margin-left: auto; }
.sp-note { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 5px; font-size: 10.5px; color: #b45309; }
.sp-track { height: 5px; border-radius: 999px; background: var(--bg-subtle, #eef2f7); overflow: hidden; }
.sp-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--primary, #5b5bd6), #7c7ce0);
  transition: width .3s ease;
}
.sp-fill.is-correct { background: linear-gradient(90deg, #059669, #34d399); }
.sp-fill.is-partial { background: linear-gradient(90deg, #d97706, #fbbf24); }
.sp-fill.is-wrong { background: linear-gradient(90deg, #dc2626, #f87171); }

.confirm-bar {
  margin-top: 10px; padding: 10px 12px; border-radius: var(--radius-md);
  border: 1px solid rgba(245, 158, 11, 0.4); background: #fffbeb;
}
.cb-text { font-size: 13px; color: #92400e; margin-bottom: 8px; }
.cb-btns { display: flex; gap: 8px; }

/* v1.4 功能直达按钮卡（蓝紫渐变主按钮，对齐愿景 token） */
.action-card { margin-top: 12px; display: flex; gap: 8px; }
.action-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: var(--radius-md); border: none; cursor: pointer;
  background: linear-gradient(135deg, var(--primary, #5b5bd6) 0%, #7c7ce0 100%);
  color: #fff; font-size: 14px; font-weight: 600; letter-spacing: 0.02em;
  box-shadow: 0 2px 10px rgba(91, 91, 214, 0.28);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(91, 91, 214, 0.38); }
.action-btn:active { transform: translateY(0); }

.notice-bar {
  margin-top: 8px; font-size: 12px; color: var(--text-secondary);
  background: #f1f5f9; border-radius: var(--radius-sm); padding: 4px 10px;
}
.unknown-block {
  margin-top: 8px; font-size: 12px; color: var(--text-muted);
  background: #f1f5f9; border-radius: var(--radius-sm); padding: 4px 10px; font-style: italic;
}

.citations { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }

.degraded-bar {
  margin-top: 10px; font-size: 12px; color: #92400e;
  background: var(--warn-bg); border: 1px solid var(--warn-border);
  border-radius: var(--radius-sm); padding: 6px 10px; line-height: 1.6;
}

.msg-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }

/* ===== 操作条（AI + 用户共用；hover 显现） ===== */
.msg-actions {
  display: flex; align-items: center; gap: 2px; margin-top: 4px;
  opacity: 0; transition: opacity var(--transition-fast);
}
.msg-row:hover .msg-actions, .msg-actions:focus-within { opacity: 1; }
.user-actions { justify-content: flex-end; }
.act {
  border: none; background: none; cursor: pointer; color: var(--text-muted);
  width: 26px; height: 26px; border-radius: var(--radius-sm); transition: all 0.15s;
  display: inline-flex; align-items: center; justify-content: center;
}
.act:hover:not(:disabled) { background: rgba(138, 90, 86, 0.1); color: var(--primary); }
.act:disabled { opacity: 0.35; cursor: not-allowed; }
.act.on { color: var(--primary); background: rgba(138, 90, 86, 0.12); }
.act.hint { width: auto; padding: 0 var(--space-2); font-size: 12px; color: var(--primary); font-family: var(--font); }
.ver-ind { font-size: 11px; color: var(--text-muted); padding: 0 2px; user-select: none; }
.act-time { font-size: 11px; color: var(--text-muted); padding: 0 var(--space-1); user-select: none; }
.act-meta {
  font-size: 11px; color: var(--text-muted); padding: 0 var(--space-1);
  user-select: none; cursor: default; white-space: nowrap;
}

/* 👎 原因弹层 */
.down-pop { margin-top: 6px; padding: var(--space-3); max-width: 380px; }
.down-title { font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: var(--space-2); }
.down-ta {
  width: 100%; border: 1px solid var(--border); border-radius: var(--radius-md); outline: none;
  padding: var(--space-2) var(--space-3); font-family: var(--font); font-size: var(--text-xs);
  resize: vertical; background: var(--bg-white); color: var(--text-primary);
}
.down-ta:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-subtle); }
.down-btns { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-2); }

/* 触屏无 hover：操作条常显（降低透明度代替完全隐藏） */
@media (hover: none) {
  .msg-actions { opacity: 0.75; }
}
</style>
