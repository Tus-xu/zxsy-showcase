<template>
  <div class="read" data-testid="research-read">
    <!-- ═════════ 左栏：项目 / 导航 / 文献列表 / 最近笔记 ═════════ -->
    <aside class="read__left">
      <div class="projcard">
        <div class="projcard__cover" :class="'projcard__cover--' + (project.cover || 'writing')">{{ coverMark(project) }}</div>
        <div class="projcard__meta">
          <div class="projcard__name" :title="project.name">{{ project.name }}</div>
          <div class="projcard__desc" :title="project.desc">{{ project.desc }}</div>
        </div>
        <button class="projcard__switch" title="切换项目" data-testid="read-project-switch" @click.stop="projectMenuOpen = !projectMenuOpen">⇄</button>
        <div v-if="projectMenuOpen" class="projcard__menu" @click.stop>
          <button v-for="p in allProjects()" :key="p.id" :class="{ active: p.id === project.id }" @click="pickProject(p)">
            <b>{{ p.name }}</b><small>{{ p.papers?.length || 0 }} 篇文献{{ p.custom ? ' · 新建' : '' }}</small>
          </button>
        </div>
      </div>

      <div class="overview">
        <div class="overview__head">
          <span class="overview__spark">✦</span>
          <span class="overview__title">AI 项目概览</span>
          <span class="overview__more">›</span>
        </div>
        <p class="overview__text">{{ project.memory }}</p>
        <div class="overview__stats">
          <div><b>{{ stats.papers }}</b><span>文献</span></div>
          <div><b>{{ stats.drafts }}</b><span>草稿</span></div>
          <div><b>{{ stats.notes }}</b><span>笔记</span></div>
          <div><b>{{ stats.data }}</b><span>数据</span></div>
        </div>
      </div>

      <nav class="nav">
        <button v-for="item in NAV" :key="item.key" class="nav__item" :class="{ active: ui.read.section === item.key }" :data-testid="'read-nav-' + item.key" @click="ui.read.section = item.key">
          <span class="nav__ico">{{ item.icon }}</span><span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="read__scroll">
        <template v-if="ui.read.section === 'docs'">
          <div class="sect">
            <span class="sect__caret">▾</span><span class="sect__title">文献列表</span>
            <span class="sect__acts">
              <button title="导入文献（演示：随包讲义已内置）" @click="toast('离线演示内置 4 篇随包讲义，无外部文献导入')">＋</button>
              <button title="搜索文献" @click="docSearchOpen = !docSearchOpen">⌕</button>
            </span>
          </div>
          <div v-if="docSearchOpen" class="doc-search">
            <input v-model="docQuery" placeholder="搜索文献标题…" />
          </div>
          <div v-if="!filteredPapers.length" class="empty">
            <b>该项目还没有文献</b>
            <span>新建项目默认没有文献；可切换到内置项目查看随包演示讲义的阅读链路。</span>
          </div>
          <button
            v-for="p in filteredPapers"
            :key="p.id"
            class="docitem"
            :class="{ active: p.id === ui.read.paperId }"
            :data-testid="'read-doc-' + p.id"
            @click="openDoc(p)"
          >
            <span class="pdfbadge">PDF</span>
            <span class="docitem__body">
              <span class="docitem__title" :title="p.title">{{ p.title }}</span>
              <span class="docitem__sub">{{ p.authors }} · {{ p.year }}</span>
            </span>
          </button>

          <div class="sect sect--notes">
            <span class="sect__title">最近笔记</span>
            <span class="sect__acts"><button class="sect__more" @click="ui.read.section = 'notes'">更多 ›</button></span>
          </div>
          <div v-if="!notes.length" class="empty empty--small">
            <span>还没有笔记。阅读时点选段落，在浮动工具条中「添加笔记」即可回到原文位置。</span>
          </div>
          <button v-for="n in notes.slice(0, 4)" :key="n.key" class="noteitem" :data-testid="'read-note-' + n.key" @click="openNote(n)">
            <span class="noteitem__ico">📄</span>
            <span class="noteitem__title" :title="n.title">{{ n.title }}</span>
            <span class="noteitem__time">{{ n.timeText }}</span>
          </button>
        </template>

        <template v-else-if="ui.read.section === 'notes'">
          <div class="sect"><span class="sect__title">全部笔记 · {{ notes.length }}</span></div>
          <div v-if="!notes.length" class="empty"><b>暂无笔记</b><span>点选阅读区任意段落，在浮动工具条里「添加笔记」。</span></div>
          <div v-for="n in notes" :key="n.key" class="notecard" :data-testid="'read-notecard-' + n.key">
            <button class="notecard__main" @click="openNote(n)">
              <b>{{ n.title }}</b>
              <small>{{ n.projectId === project.id ? '本项目' : '其它项目' }} · {{ n.timeText }}{{ n.seeded ? ' · 预置' : '' }}</small>
              <span v-if="n.quote" class="notecard__quote">{{ n.quote }}</span>
            </button>
            <button v-if="!n.seeded" class="notecard__del" title="删除笔记" @click="removeNote(n)">✕</button>
          </div>
        </template>

        <template v-else-if="ui.read.section === 'project'">
          <div class="sect"><span class="sect__title">项目信息</span></div>
          <div class="infocard">
            <b>{{ project.name }}</b>
            <p>{{ project.memory }}</p>
            <div class="infocard__row"><span>项目 ID</span><code>{{ project.id }}</code></div>
            <div class="infocard__row"><span>文献数</span><b>{{ papers.length }}</b></div>
            <div class="infocard__row"><span>写作工程</span><b>{{ writingProjects[project.writeProjectId] ? '已就绪' : '新建起步工程' }}</b></div>
            <button class="btn btn--primary btn--block" @click="goWrite">进入写作工作区 →</button>
          </div>
          <div class="sect"><span class="sect__title">阅读声明</span></div>
          <p class="disclaimer">{{ RESEARCH_DISCLAIMER }}：全部引文与页码只指向随包页面，不引用外部论文。</p>
        </template>

        <template v-else>
          <div class="sect"><span class="sect__title">演示设置</span></div>
          <div class="infocard">
            <div class="infocard__row"><span>阅读缩放</span><b>{{ Math.round(ui.read.zoom * 100) }}%</b></div>
            <div class="infocard__row"><span>选中段落实体</span><code>{{ ui.read.blockId || '未选中' }}</code></div>
            <div class="infocard__row"><span>本项目笔记</span><b>{{ ui.read.notes.filter((n) => n.projectId === project.id).length }} 条（用户新建）</b></div>
            <button class="btn btn--block" data-testid="read-reset" @click="resetRead">复位科研阅读状态</button>
            <p class="hint-sm">复位只清空科研端演示状态（选中页 / 段落 / 笔记 / 高亮），不影响学生端、教师端进度。</p>
          </div>
        </template>
      </div>
    </aside>

    <!-- ═════════ 中栏：文档 Tab + 工具条 + 分页纸面 ═════════ -->
    <main class="read__center">
      <div class="doctabs">
        <button
          v-for="p in docTabs"
          :key="p.id"
          class="doctab"
          :class="{ active: p.id === ui.read.paperId }"
          :data-testid="'read-tab-' + p.id"
          @click="openDoc(p)"
        >
          <span class="pdfbadge pdfbadge--sm">PDF</span>
          <span class="doctab__title">{{ p.tabTitle || p.title }}</span>
          <span class="doctab__x">×</span>
        </button>
        <span class="doctabs__add" title="随包演示讲义已内置">＋</span>
      </div>

      <div v-if="!paper" class="center-empty">
        <div class="center-empty__ico">📚</div>
        <b>这个项目还没有可阅读的文献</b>
        <p>新建项目默认是空白工程。切换到「有限元误差分析 / 公式适用条件核查 / 写作与编译实验」即可看到随包演示讲义。</p>
        <button class="btn btn--primary" @click="pickProject(allProjects()[0])">打开内置项目</button>
      </div>

      <template v-else>
        <div class="toolbar">
          <button class="iconbtn" title="上一页" :disabled="ui.read.page <= 1" @click="turnPage(-1)">‹</button>
          <input v-model.number="pageInput" class="pageinput" data-testid="read-page-input" @change="applyPageInput" />
          <span class="pagetotal">/ {{ pagesCount }}</span>
          <button class="iconbtn" title="下一页" :disabled="ui.read.page >= pagesCount" @click="turnPage(1)">›</button>
          <span class="toolbar__sep"></span>
          <button class="iconbtn" title="缩小" @click="changeZoom(-0.1)">−</button>
          <span class="zoomval">{{ Math.round(ui.read.zoom * 100) }}%</span>
          <button class="iconbtn" title="放大" @click="changeZoom(0.1)">＋</button>
          <button class="toolbtn" title="按栏宽适宽显示" @click="fitWidth">适宽</button>
          <span class="toolbar__sep"></span>
          <button class="iconbtn iconbtn--txt" title="复制本页文字" data-testid="read-copy-page" @click="copyPage">⧉</button>
          <button class="iconbtn iconbtn--txt" :class="{ on: findOpen }" title="页内搜索" @click="toggleFind">⌕</button>
          <span class="toolbar__spacer"></span>
          <span class="toolbar__hint">点选段落 → 浮动工具条「问 AI」</span>
          <button class="iconbtn iconbtn--txt" title="专注模式（隐藏两侧栏）" @click="focusMode = !focusMode">{{ focusMode ? '⤡' : '⛶' }}</button>
        </div>

        <div v-if="findOpen" class="findbar">
          <input v-model="findText" placeholder="在当前页查找关键词…" @keydown.enter="findNext" />
          <span class="findbar__count">{{ findMatches.length ? findIndex + 1 + '/' + findMatches.length : '0/0' }}</span>
          <button class="btn btn--sm" @click="findNext">下一个</button>
          <button class="btn btn--sm btn--ghost" @click="findOpen = false">关闭</button>
        </div>

        <div ref="paperScroll" class="paper-scroll" :class="{ 'paper-scroll--focus': focusMode }">
          <div class="paper" :style="{ zoom: ui.read.zoom }" data-testid="read-paper">
            <div class="paper__meta">
              <span class="paper__brand">随包演示讲义</span>
              <span>{{ RESEARCH_DISCLAIMER }} · 第 {{ ui.read.page }} / {{ pagesCount }} 页</span>
            </div>
            <template v-for="(b, idx) in pageBlocks" :key="bid(b, idx)">
              <div
                class="blk"
                :class="[`blk--${b.t}`, blockClasses(b, idx)]"
                :data-block="bid(b, idx)"
                @click="selectBlock(b, idx)"
              >
                <!-- 选中浮动工具条 -->
                <div v-if="isSelected(b, idx)" class="selbar" @click.stop>
                  <button class="selbar__btn" data-testid="sel-highlight" @click="doHighlight(b, idx)">🖍 高亮</button>
                  <button class="selbar__btn" data-testid="sel-note" @click="openNoteDialog(b, idx)">✎ 添加笔记</button>
                  <button class="selbar__btn" data-testid="sel-cite" @click="copyCitation(b, idx)">❝ 引用</button>
                  <button class="selbar__btn selbar__btn--primary" data-testid="sel-ask" @click="askAI(b, idx)">✦ 问 AI</button>
                </div>

                <template v-if="b.t === 'title'">
                  <h1 class="paper__title">{{ b.title }}</h1>
                  <div v-if="b.sub" class="paper__sub">{{ b.sub }}</div>
                  <div class="paper__author">{{ b.author }}</div>
                  <div class="paper__date">{{ b.date }}</div>
                </template>
                <template v-else-if="b.t === 'h1'"><h2 class="ph ph--1">{{ b.text }}</h2></template>
                <template v-else-if="b.t === 'h2'"><h3 class="ph ph--2">{{ b.text }}</h3></template>
                <template v-else-if="b.t === 'h3'"><h4 class="ph ph--3">{{ b.text }}</h4></template>
                <template v-else-if="b.t === 'p'"><p class="pp"><MathText :text="markText(b.text)" /></p></template>
                <template v-else-if="b.t === 'formula'">
                  <div class="formula">
                    <MathText block :text="'$$' + fixTex(b.tex) + '$$'" />
                    <span v-if="b.num" class="formula__num">{{ b.num }}</span>
                  </div>
                </template>
                <template v-else-if="b.t === 'quote'"><blockquote class="quote">{{ b.text }}</blockquote></template>
                <template v-else-if="b.t === 'list'">
                  <ol v-if="b.ordered" class="plist plist--ol"><li v-for="(it, i) in b.items" :key="i"><MathText :text="markText(it)" /></li></ol>
                  <ul v-else class="plist"><li v-for="(it, i) in b.items" :key="i"><MathText :text="markText(it)" /></li></ul>
                </template>
                <template v-else-if="['defn', 'theorem', 'corollary', 'prop'].includes(b.t)">
                  <div class="box" :class="'box--' + b.t">
                    <div class="box__title">{{ b.title }}</div>
                    <div class="box__text"><MathText :text="markText(b.text)" /></div>
                  </div>
                </template>
                <template v-else-if="b.t === 'proof'">
                  <div class="proof">
                    <div class="proof__label">{{ b.label || '证明' }}</div>
                    <div class="proof__text"><MathText :text="markText(b.text)" /><span class="proof__qed">□</span></div>
                  </div>
                </template>
                <template v-else-if="b.t === 'table'">
                  <div class="ptable">
                    <div class="ptable__cap">{{ b.caption }}</div>
                    <table>
                      <thead><tr><th v-for="(h, i) in b.head" :key="i">{{ h }}</th></tr></thead>
                      <tbody><tr v-for="(r, ri) in b.rows" :key="ri"><td v-for="(c, ci) in r" :key="ci">{{ c }}</td></tr></tbody>
                    </table>
                    <div class="ptable__note">{{ b.note }}</div>
                  </div>
                </template>
                <template v-else-if="b.t === 'refs'">
                  <ol class="refs"><li v-for="(it, i) in b.items" :key="i">{{ it }}</li></ol>
                </template>
                <template v-else><p class="pp">{{ b.text }}</p></template>

                <span v-if="b.ask" class="askdot" title="该段落有预置审核问答（点选后「问 AI」）">✦ 可提问</span>
              </div>
            </template>
            <div class="paper__foot">
              <span>{{ RESEARCH_DISCLAIMER }}</span>
              <span>第 {{ ui.read.page }} / {{ pagesCount }} 页</span>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- ═════════ 右栏：Research Agent ═════════ -->
    <aside class="read__agent">
      <div class="agent">
        <div class="agent__head">
          <div class="agent__logo">π</div>
          <div class="agent__id">
            <div class="agent__name">Research Agent <span class="agent__cn">科研助理智能体</span><span class="agent__online">● 在线</span></div>
            <div class="agent__sub">基于文献、代码与数学工具的专业研究助手 · 离线审核结论</div>
          </div>
          <button class="agent__more" title="Agent 说明" @click="showAgentHelp = !showAgentHelp">⋯</button>
        </div>
        <div v-if="showAgentHelp" class="agent__help">
          本演示中的 Agent 回答来自随包离线审核知识库（非模型实时生成）；引文与页码均可回到左侧纸面核对。
        </div>

        <div class="ctx">
          <div class="ctx__head"><span class="ctx__lock">▣</span><span class="ctx__title">当前上下文</span><span class="ctx__note">（基于选定文献篇）</span></div>
          <div class="ctx__chips">
            <span v-if="selectedMeta" class="chip chip--active" data-testid="ctx-selected">＋ 当前选定 {{ selectedMeta.short }}</span>
            <span v-else class="chip chip--muted">未选中段落</span>
            <span v-if="paper" class="chip">📄 {{ paper.short }} · 第 {{ ui.read.page }} 页</span>
            <span class="chip">▤ 项目知识库 · {{ papers.length }} 篇</span>
            <span class="chip">🔒 随包讲义</span>
          </div>
        </div>

        <div class="agent__scroll">
          <div v-if="ui.read.ask" class="result" data-testid="agent-answer">
            <div class="result__status">
              <span class="status-ico" :class="'status-ico--' + statusTone(askQA?.status)">✓</span>
              <span class="result__cap">{{ askQA?.kind || '结构化回答' }}</span>
              <span class="pill" :class="'pill--' + statusTone(askQA?.status)">{{ askQA?.statusLabel || '离线审核结论' }}</span>
            </div>
            <div v-if="askContext" class="result__ctx">{{ askContext }}</div>
            <p class="result__judgment">{{ askQA?.judgment }}</p>
            <p class="result__summary">{{ askQA?.summary }}</p>
            <div v-if="askQA?.keyPoints?.length" class="inset">
              <div class="inset__title">关键信息</div>
              <ol class="inset__list"><li v-for="(k, i) in askQA.keyPoints" :key="i"><MathText :text="markText(k)" /></li></ol>
            </div>
            <div class="evid">
              <div class="evid__title">证据来源 <span class="evid__note">{{ RESEARCH_DISCLAIMER }}</span></div>
              <button v-for="(ev, i) in askQA?.evidence || []" :key="i" class="evid__row" data-testid="agent-evidence" @click="jumpTo(ev.paperId, ev.page, ev.block)">
                <span class="pdfbadge pdfbadge--sm">PDF</span>
                <span class="evid__label">{{ ev.label }}</span>
                <span class="evid__page">p. {{ ev.page }}</span>
              </button>
            </div>
            <div v-if="askQA?.note" class="result__note">备注：{{ askQA.note }}</div>
            <div class="actions">
              <button class="btn btn--outline" data-testid="agent-locate" @click="locateAnswer">定位原文</button>
              <button class="btn btn--outline" data-testid="agent-evidence-view" @click="viewEvidence">查看证据</button>
              <button class="btn btn--primary" data-testid="agent-add-note" @click="openNoteFromAnswer">加入笔记</button>
            </div>
            <div v-if="askQA?.suggestions?.length" class="sugg">
              <span class="sugg__label">继续追问</span>
              <button v-for="s in askQA.suggestions" :key="s" class="chip chip--btn" @click="askSuggestion(s)">{{ suggestionTitle(s) }}</button>
            </div>
            <div class="result__foot">离线演示审核结论，非模型实时生成 · 引文来自随包页面</div>
          </div>

          <template v-if="!ui.read.ask">
            <div v-if="!ui.read.capability" class="agent-empty">
              <div class="agent-empty__logo">π</div>
              <div class="agent-empty__title">今天想推进什么？</div>
              <p class="agent-empty__text">选中左侧论文中的一句话或一个公式，我会在这里给出解释、判断与可回跳的证据。</p>
              <button v-for="cap in capabilities" :key="cap.key" class="entry" :data-testid="'agent-entry-' + cap.key" @click="toggleCap(cap.key)">
                <span class="entry__ico" :class="'entry__ico--' + cap.key">{{ cap.icon }}</span>
                <span class="entry__meta"><b>{{ cap.label }}</b><small>{{ cap.desc }}</small></span>
                <span class="entry__arrow">→</span>
              </button>
            </div>
          </template>

          <!-- 能力 Accordion（只展示当前展开项；无选中/无能力时由空状态入口承担） -->
          <div v-for="cap in visibleCaps" :key="'acc-' + cap.key" class="acc" :class="{ open: ui.read.capability === cap.key }">
            <button class="acc__head" :data-testid="'agent-cap-' + cap.key" @click="toggleCap(cap.key)">
              <span class="entry__ico" :class="'entry__ico--' + cap.key">{{ cap.icon }}</span>
              <span class="acc__label">{{ cap.label }}</span>
              <span v-if="cap.key === 'formula'" class="acc__count">{{ formulaChecks.length }}</span>
              <span class="acc__caret">{{ ui.read.capability === cap.key ? '⌃' : '⌄' }}</span>
            </button>
            <div v-if="ui.read.capability === cap.key" class="acc__body">
              <template v-if="cap.key === 'formula'">
                <p class="acc__hint">公式检查三案例来自数据层的离线审核结论（规则引擎 + 预置反例），<b>非模型实时生成</b>。</p>
                <div class="fc__tabs">
                  <button v-for="c in formulaChecks" :key="c.id" class="fc__tab" :class="{ active: (ui.read.formulaId || formulaChecks[0].id) === c.id }" :data-testid="'formula-tab-' + c.id" @click="ui.read.formulaId = c.id">{{ c.title }}</button>
                </div>
                <div v-if="activeCheck" class="fc" :data-testid="'formula-card-' + activeCheck.id">
                  <div class="result__status">
                    <span class="status-ico" :class="'status-ico--' + statusTone(activeCheck.status)">{{ statusIcon(activeCheck.status) }}</span>
                    <span class="result__cap">{{ activeCheck.title }}</span>
                    <span class="pill" :class="'pill--' + statusTone(activeCheck.status)">{{ activeCheck.statusLabel }}</span>
                  </div>
                  <div class="fc__sub">{{ activeCheck.subtitle }}</div>
                  <p class="result__judgment">{{ activeCheck.judgment }}</p>
                  <div class="inset"><div class="inset__title">依据</div><p class="inset__p">{{ activeCheck.basis }}</p></div>
                  <div class="inset">
                    <div class="inset__title">反例 / 数值核验</div>
                    <p class="inset__p">{{ activeCheck.counterexample.text }}</p>
                    <div v-if="activeCheck.counterexample.samples" class="fc__samples">
                      <div class="fc__sample-head"><span>x</span><span>左边</span><span>右边</span><span>相等</span></div>
                      <div v-for="(s, i) in activeCheck.counterexample.samples" :key="i" class="fc__sample">
                        <span>{{ s.x }}</span><span>{{ s.left }}</span><span>{{ s.right }}</span><span>{{ s.left === s.right ? '✓' : '✗' }}</span>
                      </div>
                    </div>
                    <div v-else class="fc__calc">
                      代入 x={{ activeCheck.counterexample.x }}：左边 = {{ activeCheck.counterexample.computed }}，右边 = {{ activeCheck.counterexample.expected }}
                    </div>
                  </div>
                  <div class="evid">
                    <div class="evid__title">证据来源</div>
                    <button v-for="(ev, i) in activeCheck.evidence" :key="i" class="evid__row" @click="jumpTo(ev.paperId, ev.page, ev.block)">
                      <span class="pdfbadge pdfbadge--sm">PDF</span><span class="evid__label">{{ ev.label }}</span><span class="evid__page">p. {{ ev.page }}</span>
                    </button>
                  </div>
                  <p class="result__note">建议：{{ activeCheck.suggestion }}</p>
                  <div class="actions">
                    <button class="btn btn--outline" @click="locateFormula">定位原文</button>
                    <button class="btn btn--outline" @click="copyFormulaCite">引用此结论</button>
                    <button class="btn btn--primary" @click="noteFormula">加入笔记</button>
                  </div>
                  <div class="offline-note">离线演示审核结论，非模型实时生成 · {{ activeCheck.engine }}</div>
                </div>
              </template>

              <template v-else-if="cap.key === 'latex' && capData">
                <div class="result__status">
                  <span class="status-ico status-ico--info">i</span>
                  <span class="result__cap">LaTeX 对照</span>
                  <span class="pill pill--info">{{ capData.statusLabel }}</span>
                </div>
                <p class="result__summary">{{ capData.summary }}</p>
                <div v-if="capData.keyPoints?.length" class="inset">
                  <div class="inset__title">关键信息</div>
                  <ol class="inset__list"><li v-for="(k, i) in capData.keyPoints" :key="i">{{ k }}</li></ol>
                </div>
                <div v-if="capData.diff" class="diffblock">
                  <div class="diffblock__title">建议修改 · {{ capData.diff.file }} 第 {{ capData.diff.line }} 行</div>
                  <div class="diffblock__row diffblock__row--del">− {{ capData.diff.removed }}</div>
                  <div class="diffblock__row diffblock__row--add">＋ {{ capData.diff.added }}</div>
                  <div class="diffblock__note">{{ capData.diff.note }}</div>
                </div>
                <div class="actions">
                  <button class="btn btn--outline" @click="jumpFirstEvidence(capData)">定位原文</button>
                  <button class="btn btn--primary" @click="openWriteFromAgent">打开写作工作区</button>
                </div>
              </template>

              <template v-else-if="capData">
                <div class="result__status">
                  <span class="status-ico" :class="'status-ico--' + statusTone(capData.status)">{{ statusIcon(capData.status) }}</span>
                  <span class="result__cap">{{ cap.label }}</span>
                  <span class="pill" :class="'pill--' + statusTone(capData.status)">{{ capData.statusLabel }}</span>
                </div>
                <p class="result__summary">{{ capData.summary }}</p>
                <div v-if="capData.keyPoints?.length" class="inset">
                  <div class="inset__title">关键信息</div>
                  <ol class="inset__list"><li v-for="(k, i) in capData.keyPoints" :key="i"><MathText :text="markText(k)" /></li></ol>
                </div>
                <div v-if="capData.en" class="inset"><div class="inset__title">英文译稿</div><p class="inset__p">{{ capData.en }}</p></div>
                <div v-if="capData.evidence?.length" class="evid">
                  <div class="evid__title">证据来源</div>
                  <button v-for="(ev, i) in capData.evidence" :key="i" class="evid__row" @click="jumpTo(ev.paperId, ev.page, ev.block)">
                    <span class="pdfbadge pdfbadge--sm">PDF</span><span class="evid__label">{{ ev.label }}</span><span class="evid__page">p. {{ ev.page }}</span>
                  </button>
                </div>
                <p v-if="capData.note" class="result__note">备注：{{ capData.note }}</p>
                <div class="actions">
                  <button class="btn btn--outline" @click="jumpFirstEvidence(capData)">定位原文</button>
                  <button class="btn btn--outline" @click="noteCapability(cap)">加入笔记</button>
                  <button class="btn btn--primary" @click="askCapability(cap)">问这个问题</button>
                </div>
              </template>
              <p v-else class="acc__hint">该讲义未预置此项能力结论。</p>
            </div>
          </div>

          <div v-if="ui.read.chat.length" class="chatlog">
            <div v-for="(m, i) in ui.read.chat" :key="i" class="chatmsg" :class="'chatmsg--' + m.role">
              <div class="chatmsg__who">{{ m.role === 'user' ? '你' : 'Research Agent' }}</div>
              <div class="chatmsg__text">{{ m.text }}</div>
              <div v-if="m.hint" class="chatmsg__hint">{{ m.hint }}</div>
            </div>
          </div>
        </div>

        <div class="composer">
          <textarea
            v-model="composerText"
            class="composer__input"
            rows="2"
            placeholder="直接告诉我你想完成什么：解释推导、找证据、写入笔记、生成引用…"
            data-testid="agent-composer"
            @keydown.enter.exact.prevent="sendComposer"
          ></textarea>
          <div class="composer__bar">
            <span class="composer__ico" title="随包讲义已内置，无需附加文件">📎</span>
            <span class="composer__ico" title="可 @ 选中段落">@</span>
            <span class="composer__ico" title="引用项目知识库">📖</span>
            <span class="composer__hint">Enter 发送 · 演示回答来自离线审核库</span>
            <button class="composer__send" data-testid="agent-send" title="发送" @click="sendComposer">➤</button>
          </div>
        </div>
      </div>
    </aside>

    <div v-if="noteDialog.open" class="modal" data-testid="note-dialog" @click.self="noteDialog.open = false">
      <div class="modal__card">
        <div class="modal__head"><b>添加阅读笔记</b><button class="modal__x" @click="noteDialog.open = false">✕</button></div>
        <label class="modal__label">标题<input v-model="noteDialog.title" data-testid="note-title" /></label>
        <label class="modal__label">正文<textarea v-model="noteDialog.body" rows="3" data-testid="note-body" placeholder="记录你的阅读结论（本地保存，刷新后仍在）"></textarea></label>
        <div class="modal__cite">来源：{{ noteDialog.source }} · {{ RESEARCH_DISCLAIMER }}</div>
        <div class="modal__foot">
          <button class="btn btn--ghost" @click="noteDialog.open = false">取消</button>
          <button class="btn btn--primary" data-testid="note-save" @click="saveNote">保存笔记</button>
        </div>
      </div>
    </div>

    <div v-if="toastText" class="toast" data-testid="read-toast">{{ toastText }}</div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MathText from '../../components/MathText.vue'
import { store } from '../../state/demo'
import {
  RESEARCH_DISCLAIMER,
  activePaper,
  addNote,
  allProjects,
  createCustomProject,
  deleteNote,
  enterReadProject,
  formulaChecks,
  isHighlighted,
  papersForProject,
  projectStats,
  recentNotes,
  researchUi,
  resolveProject,
  resetResearchUi,
  toggleHighlight,
  writingProjects,
} from '../../components/research/researchUi'
import { blockId, blockQuote, matchQA, paperPage, plainBlockText, qaById, findQAOwning } from '../../data/research'
import { normalizeTex } from '../../components/research/latexEngine'

const route = useRoute()
const router = useRouter()
const ui = researchUi()

const NAV = [
  { key: 'docs', label: '文献', icon: '▥' },
  { key: 'notes', label: '笔记', icon: '▤' },
  { key: 'project', label: '项目', icon: '▭' },
  { key: 'settings', label: '设置', icon: '⚙' },
]

const projectMenuOpen = ref(false)
const docSearchOpen = ref(false)
const docQuery = ref('')
const pageInput = ref(ui.read.page)
const paperScroll = ref(null)
const focusMode = ref(false)
const findOpen = ref(false)
const findText = ref('')
const findIndex = ref(0)
const toastText = ref('')
const composerText = ref('')
const showAgentHelp = ref(false)
const noteDialog = reactive({ open: false, title: '', body: '', source: '', paperId: null, page: null, blockId: null, projectId: null })
let toastTimer = null

const project = computed(() => resolveProject(ui.read.projectId || store.research.projectId))
const papers = computed(() => papersForProject(project.value))
const docTabs = computed(() => papers.value.length ? papers.value : (paper.value ? [paper.value] : []))
const filteredPapers = computed(() => {
  const q = docQuery.value.trim().toLowerCase()
  return q ? papers.value.filter((p) => p.title.toLowerCase().includes(q)) : papers.value
})
const paper = computed(() => activePaper())
const pagesCount = computed(() => paper.value?.pages?.length || 1)
const pageData = computed(() => (paper.value ? paperPage(paper.value, ui.read.page) : null))
const pageBlocks = computed(() => pageData.value?.blocks || [])
const stats = computed(() => projectStats(project.value))
const notes = computed(() => recentNotes(project.value.id, 0))
const findMatches = ref([])

const askQARef = computed(() => {
  if (!ui.read.ask) return null
  return qaById(ui.read.ask.paperId, ui.read.ask.qaId)
})
const askQA = computed(() => {
  const local = askQARef.value
  if (local) return local
  const owner = findQAOwning(project.value.id, ui.read.ask?.qaId)
  return owner?.qa || null
})
const askContext = computed(() => {
  const ask = ui.read.ask
  if (!ask) return ''
  const p = paper.value
  return `当前上下文：${p ? '《' + p.title + '》' : ''}第 ${ask.page} 页${ask.blockTitle ? ' · ' + ask.blockTitle : ''}`
})
const selectedMeta = computed(() => {
  if (!ui.read.blockId) return null
  const idx = pageBlocks.value.findIndex((b, i) => bid(b, i) === ui.read.blockId)
  const b = idx >= 0 ? pageBlocks.value[idx] : null
  if (!b) return null
  const heads = ['h1', 'h2', 'h3']
  const prevHead = [...pageBlocks.value.slice(0, idx)].reverse().find((x) => heads.includes(x.t))
  return { short: (prevHead?.text || '本页').slice(0, 16), block: b }
})

const CAP_META = [
  { key: 'derive', label: '推导校验', icon: '✓', desc: '检查选中推导或结论是否成立', tool: 'verify' },
  { key: 'citations', label: '引用补全', icon: '❝', desc: '在项目文献中找到证据位置', tool: 'citations' },
  { key: 'latex', label: 'LaTeX 对照', icon: '{}', desc: '对照讲义公式与写作草稿', tool: 'latex' },
  { key: 'formula', label: '公式检查', icon: '%', desc: '三个条件漏洞案例的结构化结论', tool: null },
  { key: 'translate', label: '翻译与改写', icon: 'A文', desc: '离线审核译文（保留数学记号）', tool: 'translate' },
]
const capabilities = computed(() => CAP_META)
const visibleCaps = computed(() => {
  if (ui.read.capability) return CAP_META.filter((c) => c.key === ui.read.capability)
  if (ui.read.ask) return CAP_META
  return []
})

const capData = computed(() => {
  const key = ui.read.capability
  if (!key) return null
  const cap = CAP_META.find((c) => c.key === key)
  if (!cap || !cap.tool) return null
  return paper.value?.tools?.[cap.tool] || null
})
const activeCheck = computed(() => formulaChecks.find((c) => c.id === (ui.read.formulaId || formulaChecks[0].id)) || null)

/* ── 初始化 / 路由 ── */
onMounted(() => {
  applyRouteQuery()
  enterReadProject(project.value)
  pageInput.value = ui.read.page
  if (!ui.read.capability) ui.read.capability = null
})

watch(
  () => store.research.projectId,
  (id) => {
    if (!id || id === ui.read.projectId) return
    const p = resolveProject(id)
    if (p) {
      enterReadProject(p)
      pageInput.value = ui.read.page
      ui.read.section = 'docs'
    }
  },
)

watch(
  () => route.query,
  () => applyRouteQuery(),
)

watch(
  () => ui.read.page,
  (v) => {
    pageInput.value = v
    nextTick(flashSelectedBlock)
  },
)

function applyRouteQuery() {
  const q = route.query || {}
  if (q.project) {
    const p = allProjects().find((x) => x.id === q.project)
    if (p && p.id !== ui.read.projectId) enterReadProject(p)
  }
  if (q.paper) {
    const p = papers.value.find((x) => x.id === q.paper) || null
    if (p) {
      ui.read.paperId = p.id
      ui.read.page = Number(q.page) || p.defaultPage || 1
    }
  } else if (q.page) {
    ui.read.page = clampPage(Number(q.page))
  }
  if (q.block) ui.read.blockId = String(q.block)
  if (q.nav) ui.read.section = String(q.nav)
  pageInput.value = ui.read.page
}

function clampPage(n) {
  const v = Number.isFinite(n) ? Math.round(n) : 1
  return Math.min(Math.max(v, 1), pagesCount.value)
}

/* ── 切文献 / 翻页 / 缩放 ── */
function openDoc(p) {
  if (!p) return
  ui.read.paperId = p.id
  ui.read.page = p.defaultPage || 1
  ui.read.blockId = null
  ui.read.ask = null
  ui.read.zoom = 1
  pageInput.value = ui.read.page
}
function turnPage(delta) {
  ui.read.page = clampPage(ui.read.page + delta)
  ui.read.blockId = null
}
function applyPageInput() {
  ui.read.page = clampPage(pageInput.value)
  pageInput.value = ui.read.page
}
function changeZoom(delta) {
  const next = Math.round((ui.read.zoom + delta) * 10) / 10
  ui.read.zoom = Math.min(2.2, Math.max(0.6, next))
}
function fitWidth() {
  ui.read.zoom = 1
  pushToast('已恢复 100% 适宽显示')
}
function pickProject(p) {
  projectMenuOpen.value = false
  enterReadProject(p)
  pageInput.value = ui.read.page
  ui.read.section = 'docs'
}
function goWrite() {
  router.push({ path: '/research/write', query: { project: project.value.id } })
}
function openWriteFromAgent() {
  goWrite()
}

/* ── 段落选中 / 高亮 / 引用 ── */
function bid(b, idx) {
  return blockId(paper.value?.id, ui.read.page, b, idx)
}
function isSelected(b, idx) {
  return ui.read.blockId === bid(b, idx)
}
function blockClasses(b, idx) {
  return {
    'blk--selected': isSelected(b, idx),
    'blk--highlight': isHighlighted(paper.value?.id, ui.read.page, bid(b, idx)),
    'blk--hit': findMatches.value.includes(bid(b, idx)),
  }
}
function selectBlock(b) {
  ui.read.blockId = bid(b, pageBlocks.value.indexOf(b))
}
function doHighlight(b, idx) {
  const on = toggleHighlight(paper.value.id, ui.read.page, bid(b, idx))
  pushToast(on ? '已高亮该段落（已保存）' : '已取消高亮')
}
function copyCitation(b, idx) {
  const quote = blockQuote(paper.value.id, ui.read.page, bid(b, idx), 80)
  const text = `（${RESEARCH_DISCLAIMER}《${paper.value.title}》第 ${ui.read.page} 页：${quote}）`
  copyText(text)
  pushToast('引用已复制（可核对页码）')
}
function copyPage() {
  const text = pageBlocks.value.map((b) => plainBlockText(b)).filter(Boolean).join('\n')
  copyText(`《${paper.value.title}》第 ${ui.read.page} 页\n` + text)
  pushToast('本页文字已复制')
}
function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {})
    else {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
  } catch {
    /* 离线演示环境复制失败不阻断主链 */
  }
}

/* ── 问 AI / 结构化回答 ── */
function askAI(b, idx) {
  const blockIdNow = bid(b, idx)
  let qaId = b.ask || null
  let ownerPaperId = paper.value.id
  if (qaId && !qaById(ownerPaperId, qaId)) {
    const owner = findQAOwning(project.value.id, qaId)
    if (owner) ownerPaperId = owner.paper.id
    else qaId = null
  }
  if (!qaId) {
    const hit = matchQA(project.value.id, paper.value.id, plainBlockText(b))
    if (hit) {
      qaId = hit.qaId
      ownerPaperId = hit.paperId
    }
  }
  if (!qaId) {
    ui.read.ask = null
    ui.read.chat.push({
      role: 'agent',
      text: '这段内容没有预置的离线审核结论。',
      hint: '可点选带「✦ 可提问」标记的段落（如 Céa 引理、证明、公式条件、编译错误说明），或在下方输入关键词：Céa、条件、配方、约分、编译错误。',
    })
    pushToast('该段落未预置结论，已给出可用提问位置')
    return
  }
  const qa = qaById(ownerPaperId, qaId)
  ui.read.ask = {
    qaId,
    paperId: ownerPaperId,
    page: ui.read.page,
    blockId: blockIdNow,
    blockTitle: qa?.kind || '',
    at: Date.now(),
  }
  ui.read.capability = null
  ui.read.chat.push({ role: 'user', text: `关于所选段落：${blockQuote(paper.value.id, ui.read.page, blockIdNow, 70)}` })
  nextTick(() => {
    document.querySelector('[data-testid="agent-answer"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  })
}

function sendComposer() {
  const text = composerText.value.trim()
  if (!text) return
  composerText.value = ''
  ui.read.chat.push({ role: 'user', text })
  const hit = matchQA(project.value.id, ui.read.paperId, text)
  if (hit) {
    const qa = qaById(hit.paperId, hit.qaId) || hit.qa
    const firstEv = qa?.evidence?.[0]
    ui.read.ask = {
      qaId: hit.qaId,
      paperId: hit.paperId,
      page: firstEv?.page || ui.read.page,
      blockId: firstEv?.block || null,
      blockTitle: qa?.kind || '',
      at: Date.now(),
    }
    ui.read.capability = null
    ui.read.chat.push({ role: 'agent', text: `已匹配离线审核结论：${qa?.judgment || qa?.summary || ''}` })
  } else {
    ui.read.chat.push({
      role: 'agent',
      text: '这个问题的离线审核答案未收录。',
      hint: '本演示只回答随包讲义中已审核的问答；可尝试关键词：Céa 引理条件、证明两步、√(x²)、约分、配方、编译错误、收敛阶。',
    })
  }
  ui.read.section = 'docs'
}
function askSuggestion(qaId) {
  const owner = findQAOwning(project.value.id, qaId)
  if (!owner) return
  const ev = owner.qa.evidence?.[0]
  ui.read.ask = { qaId, paperId: owner.paper.id, page: ev?.page || 1, blockId: ev?.block || null, blockTitle: owner.qa.kind, at: Date.now() }
}
function suggestionTitle(qaId) {
  const owner = findQAOwning(project.value.id, qaId)
  return owner?.qa?.kind ? `追问：${owner.qa.kind}` : qaId
}

/* ── 证据定位 / 笔记 ── */
function jumpTo(paperId, page, blockIdNow) {
  const p = papers.value.find((x) => x.id === paperId) || null
  if (p) ui.read.paperId = p.id
  ui.read.page = clampPage(page)
  ui.read.blockId = blockIdNow || null
  nextTick(flashSelectedBlock)
}
function locateAnswer() {
  const ask = ui.read.ask
  if (!ask) return
  const ev = askQA.value?.evidence?.find((e) => e.block === ask.blockId) || askQA.value?.evidence?.[0]
  if (ev) jumpTo(ev.paperId, ev.page, ev.block)
}
function viewEvidence() {
  const ev = askQA.value?.evidence?.[0]
  if (ev) {
    jumpTo(ev.paperId, ev.page, ev.block)
    pushToast('已跳到证据所在页并高亮来源段落')
  }
}
function jumpFirstEvidence(data) {
  const ev = data?.evidence?.[0]
  if (ev) jumpTo(ev.paperId, ev.page, ev.block)
}
function locateFormula() {
  const ev = activeCheck.value?.evidence?.[0]
  if (ev) jumpTo(ev.paperId, ev.page, ev.block)
}
function copyFormulaCite() {
  const c = activeCheck.value
  copyText(`（${RESEARCH_DISCLAIMER}《${papers.value.find((p) => p.id === c.evidence[0].paperId)?.title || ''}》第 ${c.evidence[0].page} 页：${c.title}，${c.statusLabel}）`)
  pushToast('公式检查结论引用已复制')
}
function flashSelectedBlock() {
  const el = paperScroll.value?.querySelector('.blk--selected')
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function openNoteDialog(b, idx) {
  noteDialog.open = true
  noteDialog.title = blockTitleOf(b) || '阅读笔记'
  noteDialog.body = ''
  noteDialog.source = `《${paper.value.title}》第 ${ui.read.page} 页`
  noteDialog.paperId = paper.value.id
  noteDialog.page = ui.read.page
  noteDialog.blockId = bid(b, idx)
  noteDialog.projectId = project.value.id
}
function openNoteFromAnswer() {
  const ask = ui.read.ask
  const qa = askQA.value
  noteDialog.open = true
  noteDialog.title = qa?.kind ? `${qa.kind} · ${qa.statusLabel}` : 'Agent 结构化回答'
  noteDialog.body = [qa?.judgment, qa?.summary, ...(qa?.keyPoints || []).map((k) => '· ' + k)].filter(Boolean).join('\n')
  noteDialog.source = `Agent 回答 · 《${paper.value.title}》第 ${ask?.page || ui.read.page} 页`
  noteDialog.paperId = ask?.paperId || paper.value.id
  noteDialog.page = ask?.page || ui.read.page
  noteDialog.blockId = ask?.blockId || null
  noteDialog.projectId = project.value.id
}
function noteFormula() {
  const c = activeCheck.value
  noteDialog.open = true
  noteDialog.title = `公式检查：${c.title}（${c.statusLabel}）`
  noteDialog.body = [c.judgment, '依据：' + c.basis, '反例：' + c.counterexample.text].join('\n')
  noteDialog.source = `公式检查 · ${c.evidence[0].label}`
  noteDialog.paperId = c.evidence[0].paperId
  noteDialog.page = c.evidence[0].page
  noteDialog.blockId = c.evidence[0].block
  noteDialog.projectId = project.value.id
}
function noteCapability(cap) {
  const data = capData.value
  if (!data) return
  noteDialog.open = true
  noteDialog.title = `${cap.label} · ${data.statusLabel}`
  noteDialog.body = [data.summary, ...(data.keyPoints || []).map((k) => '· ' + k)].join('\n')
  noteDialog.source = `Agent 能力 · ${cap.label}`
  noteDialog.paperId = data.evidence?.[0]?.paperId || paper.value.id
  noteDialog.page = data.evidence?.[0]?.page || ui.read.page
  noteDialog.blockId = data.evidence?.[0]?.block || null
  noteDialog.projectId = project.value.id
}
function blockTitleOf(b) {
  if (['defn', 'theorem', 'corollary', 'prop'].includes(b.t)) return b.title
  if (b.t === 'proof') return '证明段落'
  if (b.t === 'title') return '论文标题'
  return plainBlockText(b).slice(0, 24) || '阅读笔记'
}
function saveNote() {
  if (!noteDialog.title.trim() && !noteDialog.body.trim()) {
    pushToast('请填写笔记标题或正文')
    return
  }
  const found = findBlockQuick(noteDialog.paperId, noteDialog.page, noteDialog.blockId)
  addNote({
    projectId: noteDialog.projectId,
    paperId: noteDialog.paperId,
    page: noteDialog.page,
    blockId: noteDialog.blockId,
    title: noteDialog.title,
    quote: found ? plainBlockText(found.block).slice(0, 90) : '',
    body: noteDialog.body,
  })
  noteDialog.open = false
  pushToast('已加入笔记（刷新后仍在）')
}
function findBlockQuick(paperId, pageNo, blockIdNow) {
  const p = papers.value.find((x) => x.id === paperId) || null
  if (!p || !blockIdNow) return null
  const pg = p.pages.find((x) => x.no === pageNo)
  if (!pg) return null
  const idx = pg.blocks.findIndex((b, i) => blockId(p.id, pageNo, b, i) === blockIdNow)
  return idx >= 0 ? { page: pg, block: pg.blocks[idx] } : null
}
function openNote(n) {
  if (!n.paperId) return
  const p = papers.value.find((x) => x.id === n.paperId)
  if (p) ui.read.paperId = p.id
  else {
    const owner = allProjects().map((pr) => papersForProject(pr).find((x) => x.id === n.paperId)).find(Boolean)
    if (owner) {
      const pr = allProjects().find((x) => papersForProject(x).some((y) => y.id === owner.id))
      if (pr) enterReadProject(pr)
      ui.read.paperId = owner.id
    }
  }
  ui.read.page = clampPage(n.page || 1)
  ui.read.blockId = n.block || null
  ui.read.section = 'docs'
  nextTick(flashSelectedBlock)
}
function removeNote(n) {
  deleteNote(n.id)
  pushToast('已删除该条笔记')
}
function resetRead() {
  resetResearchUi()
  enterReadProject(project.value)
  ui.read.section = 'docs'
  pageInput.value = ui.read.page
  pushToast('科研阅读状态已复位')
}

/* ── 能力 / 用户消息 ── */
function toggleCap(key) {
  ui.read.capability = ui.read.capability === key ? null : key
  if (key === 'formula' && !ui.read.formulaId) ui.read.formulaId = formulaChecks[0].id
}
function askCapability(cap) {
  const data = capData.value
  if (!data) return
  ui.read.chat.push({ role: 'user', text: `请检查：${cap.label}` })
  ui.read.chat.push({ role: 'agent', text: data.summary || data.statusLabel })
  pushToast('已将能力结论记入对话')
}

/* ── 页内搜索 ── */
function toggleFind() {
  findOpen.value = !findOpen.value
  if (!findOpen.value) {
    findText.value = ''
    findMatches.value = []
    findIndex.value = 0
  }
}
function runFind() {
  const q = findText.value.trim()
  findMatches.value = []
  findIndex.value = 0
  if (!q) return
  pageBlocks.value.forEach((b, i) => {
    if ((plainBlockText(b) || '').includes(q)) findMatches.value.push(bid(b, i))
  })
}
function findNext() {
  runFind()
  if (!findMatches.value.length) {
    pushToast('本页未找到该关键词')
    return
  }
  findIndex.value = (findIndex.value + 1) % findMatches.value.length
  nextTick(() => {
    const el = paperScroll.value?.querySelector('.blk--hit')
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

watch(findText, runFind)
watch(
  () => ui.read.formulaId,
  () => {},
)

function statusTone(status) {
  if (['verified', 'supported', 'ok'].includes(status)) return 'success'
  if (['needs-condition', 'warning'].includes(status)) return 'warn'
  if (['risk', 'danger'].includes(status)) return 'danger'
  return 'info'
}
function statusIcon(status) {
  const tone = statusTone(status)
  return tone === 'success' ? '✓' : tone === 'warn' ? '!' : tone === 'danger' ? '!' : 'i'
}
function markText(text) {
  return String(text || '')
}
function fixTex(tex) {
  return normalizeTex(tex)
}
function coverMark(p) {
  return p.cover === 'fem' ? '∫' : p.cover === 'condition' ? '√' : '{ }'
}
function pushToast(text) {
  toastText.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastText.value = ''), 2400)
}
</script>

<style scoped>
.read {
  height: 100%;
  display: grid;
  grid-template-columns: 20.5% minmax(0, 1fr) 36.3%;
  min-height: 0;
  background: var(--rw-app-bg);
  color: var(--rw-text);
  font-family: var(--rw-font-sans);
}

/* ── 左栏 ── */
.read__left {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--rw-surface);
  border-right: 1px solid var(--rw-border);
  padding: 12px 10px 0;
  position: relative;
}
.projcard {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: var(--rw-radius);
  background: var(--rw-surface-2);
  border: 1px solid var(--rw-border);
}
.projcard__cover {
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
}
.projcard__cover--condition {
  background: linear-gradient(135deg, #0ea5e9, #22c55e);
}
.projcard__cover--writing {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
}
.projcard__meta {
  min-width: 0;
  flex: 1;
}
.projcard__name {
  font-size: var(--rw-fs-h3);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.projcard__desc {
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.projcard__switch {
  border: 1px solid var(--rw-border);
  background: var(--rw-surface);
  border-radius: 6px;
  width: 24px;
  height: 24px;
  color: var(--rw-text-2);
  font-size: 12px;
}
.projcard__switch:hover {
  border-color: var(--rw-border-strong);
}
.projcard__menu {
  position: absolute;
  left: 0;
  right: 0;
  top: 66px;
  z-index: 30;
  background: var(--rw-surface);
  border: 1px solid var(--rw-border);
  border-radius: var(--rw-radius);
  box-shadow: var(--rw-shadow-pop);
  padding: 5px;
}
.projcard__menu button {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  border-radius: 6px;
  padding: 7px 8px;
}
.projcard__menu button:hover,
.projcard__menu button.active {
  background: var(--rw-primary-soft);
}
.projcard__menu b {
  font-size: var(--rw-fs-body);
}
.projcard__menu small {
  color: var(--rw-text-3);
  font-size: var(--rw-fs-xs);
}
.overview {
  margin-top: 10px;
  padding: 11px;
  border: 1px solid var(--rw-border);
  border-radius: var(--rw-radius);
  background: var(--rw-surface-2);
}
.overview__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.overview__spark {
  color: var(--rw-primary);
  font-size: 13px;
}
.overview__title {
  font-size: var(--rw-fs-h3);
  font-weight: 600;
  color: var(--rw-primary);
}
.overview__more {
  margin-left: auto;
  color: var(--rw-text-3);
}
.overview__text {
  margin: 6px 0 8px;
  font-size: var(--rw-fs-sm);
  line-height: 1.55;
  color: var(--rw-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.overview__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--rw-border);
  padding-top: 8px;
}
.overview__stats > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  border-right: 1px solid var(--rw-border);
}
.overview__stats > div:last-child {
  border-right: 0;
}
.overview__stats b {
  font-size: 15px;
  font-weight: 700;
}
.overview__stats span {
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-3);
}
.nav {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav__item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: none;
  font-size: var(--rw-fs-body);
  font-weight: 500;
  color: var(--rw-text-2);
  text-align: left;
}
.nav__item:hover {
  background: var(--rw-surface-2);
}
.nav__item.active {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-weight: 600;
}
.nav__ico {
  width: 16px;
  text-align: center;
  font-size: 13px;
}
.read__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 0 14px;
  scrollbar-width: thin;
}
.sect {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 6px 6px;
  font-size: var(--rw-fs-sm);
  font-weight: 600;
  color: var(--rw-text-2);
}
.sect--notes {
  margin-top: 8px;
  border-top: 1px solid var(--rw-border);
  padding-top: 10px;
}
.sect__caret {
  color: var(--rw-text-3);
  font-size: 10px;
}
.sect__title {
  font-size: 13px;
}
.sect__acts {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.sect__acts button {
  border: 0;
  background: none;
  color: var(--rw-text-3);
  font-size: 13px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
}
.sect__acts button:hover {
  background: var(--rw-surface-2);
  color: var(--rw-primary);
}
.sect__more {
  width: auto !important;
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-3);
}
.doc-search {
  padding: 0 6px 6px;
}
.doc-search input {
  width: 100%;
  height: 28px;
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  padding: 0 8px;
  font-size: var(--rw-fs-sm);
  color: var(--rw-text);
}
.docitem {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  border-radius: 6px;
  padding: 7px 6px;
}
.docitem:hover {
  background: var(--rw-surface-2);
}
.docitem.active {
  background: var(--rw-primary-soft);
}
.pdfbadge {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  background: var(--rw-pdf-badge);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: grid;
  place-items: center;
  letter-spacing: 0.02em;
}
.pdfbadge--sm {
  width: 22px;
  height: 20px;
  font-size: 8px;
  border-radius: 3px;
}
.docitem__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.docitem__title {
  font-size: var(--rw-fs-body);
  font-weight: 500;
  color: var(--rw-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docitem.active .docitem__title {
  color: var(--rw-primary);
}
.docitem__sub {
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.noteitem {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  border: 0;
  background: none;
  border-radius: 6px;
  padding: 6px;
  text-align: left;
}
.noteitem:hover {
  background: var(--rw-surface-2);
}
.noteitem__ico {
  font-size: 12px;
}
.noteitem__title {
  flex: 1;
  min-width: 0;
  font-size: var(--rw-fs-sm);
  color: var(--rw-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.noteitem__time {
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-3);
}
.empty {
  margin: 6px;
  padding: 14px 12px;
  border: 1px dashed var(--rw-border-strong);
  border-radius: var(--rw-radius);
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-2);
  line-height: 1.55;
}
.empty b {
  color: var(--rw-text);
  font-size: var(--rw-fs-body);
}
.empty--small {
  padding: 10px;
  font-size: var(--rw-fs-xs);
}
.notecard {
  display: flex;
  align-items: flex-start;
  border: 1px solid var(--rw-border);
  border-radius: var(--rw-radius);
  margin: 0 6px 7px;
  background: var(--rw-surface);
}
.notecard__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px;
  border: 0;
  background: none;
  text-align: left;
}
.notecard__main b {
  font-size: var(--rw-fs-body);
  color: var(--rw-text);
}
.notecard__main small {
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-3);
}
.notecard__quote {
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notecard__del {
  border: 0;
  background: none;
  color: var(--rw-text-3);
  font-size: 11px;
  padding: 8px;
}
.notecard__del:hover {
  color: var(--rw-danger);
}
.infocard {
  margin: 0 6px;
  padding: 11px;
  border: 1px solid var(--rw-border);
  border-radius: var(--rw-radius);
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-2);
}
.infocard b {
  color: var(--rw-text);
  font-size: var(--rw-fs-body);
}
.infocard p {
  margin: 6px 0 9px;
  line-height: 1.6;
}
.infocard__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  border-top: 1px solid var(--rw-border);
}
.infocard__row code {
  font-family: var(--rw-font-mono);
  font-size: 11px;
  color: var(--rw-primary);
}
.hint-sm {
  margin: 8px 0 0;
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-3);
  line-height: 1.5;
}
.disclaimer {
  margin: 0 10px;
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-2);
  line-height: 1.6;
}

/* ── 中栏 ── */
.read__center {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--rw-page-bg);
}
.doctabs {
  height: 38px;
  flex: none;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 0 10px;
  background: var(--rw-surface);
  border-bottom: 1px solid var(--rw-border);
  overflow-x: auto;
  scrollbar-width: none;
}
.doctab {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 6px 6px 0 0;
  background: none;
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-2);
  max-width: 260px;
}
.doctab.active {
  background: var(--rw-primary-soft);
  border-color: var(--rw-border);
  color: var(--rw-text);
}
.doctab__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.doctab__x {
  color: var(--rw-text-3);
  font-size: 12px;
}
.doctabs__add {
  color: var(--rw-text-3);
  padding: 0 8px 6px;
  font-size: 14px;
}
.toolbar {
  height: 40px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 10px;
  background: var(--rw-surface);
  border-bottom: 1px solid var(--rw-border);
}
.iconbtn {
  width: 26px;
  height: 26px;
  border: 0;
  background: none;
  border-radius: 5px;
  color: var(--rw-text-2);
  font-size: 15px;
  display: grid;
  place-items: center;
}
.iconbtn:hover:not(:disabled) {
  background: var(--rw-surface-2);
}
.iconbtn:disabled {
  color: var(--rw-border-strong);
}
.iconbtn--txt {
  font-size: 13px;
}
.iconbtn.on {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
}
.pageinput {
  width: 34px;
  height: 25px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  text-align: center;
  font-size: var(--rw-fs-sm);
  color: var(--rw-text);
}
.pagetotal,
.zoomval {
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-2);
  min-width: 26px;
  text-align: center;
}
.toolbtn {
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  background: var(--rw-surface);
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-2);
}
.toolbar__sep {
  width: 1px;
  height: 16px;
  background: var(--rw-border);
  margin: 0 5px;
}
.toolbar__spacer {
  flex: 1;
}
.toolbar__hint {
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-3);
  margin-right: 6px;
}
.findbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--rw-surface-2);
  border-bottom: 1px solid var(--rw-border);
}
.findbar input {
  width: 240px;
  height: 26px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  padding: 0 8px;
  font-size: var(--rw-fs-sm);
}
.findbar__count {
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-3);
}
.paper-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 18px 22px 30px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  scrollbar-width: thin;
}
.paper {
  width: 100%;
  max-width: 640px;
  background: var(--rw-surface);
  border: 1px solid var(--rw-border);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
  padding: 30px 38px 26px;
  min-height: 720px;
}
.paper__meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-3);
  border-bottom: 1px solid var(--rw-border);
  padding-bottom: 8px;
  margin-bottom: 18px;
}
.paper__brand {
  color: var(--rw-primary);
  font-weight: 600;
}
.paper__title {
  margin: 0 0 6px;
  font-size: 24px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-align: center;
}
.paper__sub {
  text-align: center;
  font-size: 13px;
  color: var(--rw-text-2);
}
.paper__author,
.paper__date {
  text-align: center;
  font-size: 12px;
  color: var(--rw-text-2);
  margin-top: 4px;
}
.ph {
  margin: 20px 0 8px;
  font-weight: 700;
  color: var(--rw-text);
}
.ph--1 {
  font-size: 18px;
}
.ph--2 {
  font-size: 15px;
}
.ph--3 {
  font-size: 14px;
  color: var(--rw-primary);
}
.pp {
  margin: 9px 0;
  font-size: 13.5px;
  line-height: 1.95;
  text-align: left;
  color: var(--rw-text);
}
.blk {
  position: relative;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.12s ease;
}
.blk:hover {
  background: rgba(79, 70, 229, 0.035);
}
.blk--selected {
  background: var(--rw-primary-soft);
  box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.25);
}
.blk--highlight {
  background: #fff7d6;
  box-shadow: 0 0 0 1px #f4d97a inset;
}
.blk--highlight.blk--selected {
  background: #fff3bf;
}
.blk--hit {
  outline: 2px solid #f59e0b;
  outline-offset: 1px;
}
.selbar {
  position: absolute;
  bottom: -32px;
  right: 0;
  z-index: 12;
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--rw-surface);
  border: 1px solid var(--rw-border);
  border-radius: 8px;
  box-shadow: var(--rw-shadow-pop);
}
.blk--selected {
  margin-bottom: 34px;
}
.selbar__btn {
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  background: none;
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-2);
  white-space: nowrap;
}
.selbar__btn:hover {
  background: var(--rw-surface-2);
}
.selbar__btn--primary {
  background: var(--rw-primary);
  color: #fff;
  font-weight: 600;
}
.selbar__btn--primary:hover {
  background: var(--rw-primary-hover);
}
.askdot {
  position: absolute;
  top: 2px;
  right: -64px;
  font-size: 10px;
  color: var(--rw-primary);
  opacity: 0;
  pointer-events: none;
}
.blk--selected .askdot {
  opacity: 1;
}
.formula {
  position: relative;
  margin: 12px 0;
  padding: 11px 32px 11px 16px;
  background: var(--rw-inset);
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  font-size: 14px;
  overflow-x: auto;
}
.formula__num {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--rw-text-3);
}
.quote {
  margin: 12px 0;
  padding: 8px 14px;
  border-left: 3px solid var(--rw-primary);
  background: var(--rw-primary-softer);
  font-size: 13px;
  color: var(--rw-text-2);
  line-height: 1.8;
}
.box {
  margin: 13px 0;
  padding: 12px 14px;
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  background: var(--rw-surface);
  border-left-width: 3px;
}
.box--defn {
  border-left-color: var(--rw-primary);
  background: var(--rw-primary-softer);
}
.box--theorem {
  border-left-color: #7c3aed;
  background: #faf7ff;
}
.box--corollary {
  border-left-color: #0ea5e9;
  background: #f5fbff;
}
.box--prop {
  border-left-color: var(--rw-success);
  background: var(--rw-success-soft);
}
.box__title {
  font-size: 13.5px;
  font-weight: 700;
  margin-bottom: 4px;
}
.box__text {
  font-size: 13.5px;
  line-height: 1.9;
  text-align: left;
}
.proof {
  margin: 10px 0;
  padding: 10px 14px;
  border: 1px dashed var(--rw-border-strong);
  border-radius: 6px;
  background: var(--rw-surface-2);
}
.proof__label {
  font-size: 12px;
  font-weight: 700;
  color: var(--rw-text-2);
  margin-bottom: 3px;
}
.proof__text {
  font-size: 13px;
  line-height: 1.9;
  text-align: left;
}
.proof__qed {
  float: right;
  color: var(--rw-text-2);
}
.plist {
  margin: 10px 0 10px 20px;
  padding: 0;
  font-size: 13.5px;
  line-height: 1.9;
}
.plist--ol {
  list-style: decimal;
}
.ptable {
  margin: 14px 0;
}
.ptable__cap {
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 6px;
}
.ptable table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.ptable th,
.ptable td {
  border: 1px solid var(--rw-border);
  padding: 6px 8px;
  text-align: center;
}
.ptable th {
  background: var(--rw-inset);
  font-weight: 600;
}
.ptable__note {
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--rw-text-2);
}
.refs {
  margin: 8px 0 0 18px;
  padding: 0;
  font-size: 12px;
  line-height: 1.8;
  color: var(--rw-text-2);
}
.paper__foot {
  margin-top: 26px;
  padding-top: 10px;
  border-top: 1px solid var(--rw-border);
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--rw-text-3);
}
.center-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px;
  text-align: center;
  color: var(--rw-text-2);
}
.center-empty__ico {
  font-size: 34px;
}
.center-empty b {
  color: var(--rw-text);
  font-size: 15px;
}
.center-empty p {
  max-width: 420px;
  font-size: var(--rw-fs-sm);
  line-height: 1.7;
}

/* ── 右栏 Agent ── */
.read__agent {
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--rw-border);
  background: var(--rw-surface);
  display: flex;
}
.agent {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.agent__head {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: var(--rw-primary-softer);
  border-bottom: 1px solid var(--rw-border);
}
.agent__logo {
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  background: radial-gradient(circle at 30% 25%, #8b5cf6, var(--rw-agent-logo));
}
.agent__id {
  min-width: 0;
  flex: 1;
}
.agent__name {
  font-size: var(--rw-fs-agent-title);
  font-weight: 700;
  color: var(--rw-agent-name);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.agent__cn {
  color: var(--rw-agent-name);
  font-size: 14px;
}
.agent__online {
  font-size: 11px;
  color: var(--rw-success);
  font-weight: 500;
}
.agent__sub {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--rw-agent-sub);
}
.agent__more {
  width: 26px;
  height: 26px;
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  background: var(--rw-surface);
  color: var(--rw-text-2);
}
.agent__help {
  flex: none;
  padding: 8px 14px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--rw-text-2);
  background: var(--rw-warning-soft);
  border-bottom: 1px solid var(--rw-border);
}
.ctx {
  flex: none;
  padding: 10px 14px 9px;
  border-bottom: 1px solid var(--rw-border);
}
.ctx__head {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--rw-fs-sm);
}
.ctx__lock {
  color: var(--rw-primary);
}
.ctx__title {
  font-weight: 600;
  color: var(--rw-primary);
}
.ctx__note {
  color: var(--rw-text-3);
  font-size: 11px;
}
.ctx__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}
.chip {
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-size: 11.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.chip--active {
  background: var(--rw-primary);
  color: #fff;
}
.chip--muted {
  background: var(--rw-inset);
  color: var(--rw-text-3);
}
.chip--btn {
  cursor: pointer;
}
.agent__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px 16px;
  scrollbar-width: thin;
}
.agent-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 4px 6px;
}
.agent-empty__logo {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  background: radial-gradient(circle at 30% 25%, #8b5cf6, var(--rw-agent-logo));
  box-shadow: 0 8px 22px rgba(79, 70, 229, 0.28);
}
.agent-empty__title {
  margin-top: 12px;
  font-size: 18px;
  font-weight: 700;
}
.agent-empty__text {
  margin: 6px 0 14px;
  font-size: var(--rw-fs-sm);
  color: var(--rw-text-2);
  text-align: center;
  line-height: 1.7;
}
.entry {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--rw-border);
  border-radius: 8px;
  background: var(--rw-surface);
  text-align: left;
}
.entry:hover {
  border-color: var(--rw-border-strong);
  background: var(--rw-surface-2);
}
.entry__ico {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 7px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
}
.entry__ico--citations {
  background: #ecfeff;
  color: #0891b2;
}
.entry__ico--formula {
  background: var(--rw-success-soft);
  color: var(--rw-success);
}
.entry__ico--translate {
  background: #f5f3ff;
  color: #7c3aed;
}
.entry__ico--latex {
  background: #fff7ed;
  color: #c2410c;
}
.entry__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.entry__meta b {
  font-size: var(--rw-fs-body);
  color: var(--rw-text);
}
.entry__meta small {
  font-size: var(--rw-fs-xs);
  color: var(--rw-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.entry__arrow {
  color: var(--rw-text-3);
  font-size: 12px;
}
.agent-empty__more {
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--rw-text-3);
  display: flex;
  align-items: center;
  gap: 5px;
}
.acc {
  border: 1px solid var(--rw-border);
  border-radius: 8px;
  background: var(--rw-surface);
  margin-bottom: 7px;
  overflow: hidden;
}
.acc.open {
  border-color: var(--rw-border-strong);
  box-shadow: var(--rw-shadow-card);
}
.acc__head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: 0;
  background: none;
  text-align: left;
}
.acc__head:hover {
  background: var(--rw-surface-2);
}
.acc__label {
  flex: 1;
  font-size: var(--rw-fs-body);
  font-weight: 600;
  color: var(--rw-text);
}
.acc__caret {
  color: var(--rw-text-3);
  font-size: 11px;
}
.acc__count {
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-size: 10px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.acc__body {
  border-top: 1px solid var(--rw-border);
  padding: 11px 11px 12px;
}
.acc__hint {
  margin: 0 0 8px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--rw-text-2);
}
.result {
  border: 1px solid var(--rw-border);
  border-radius: 10px;
  background: var(--rw-surface);
  box-shadow: var(--rw-shadow-card);
  padding: 12px;
  margin-bottom: 10px;
}
.result__status {
  display: flex;
  align-items: center;
  gap: 7px;
}
.status-ico {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex: none;
}
.status-ico--success {
  background: var(--rw-success);
}
.status-ico--warn {
  background: var(--rw-warning);
}
.status-ico--danger {
  background: var(--rw-danger);
}
.status-ico--info {
  background: var(--rw-primary);
}
.result__cap {
  font-size: 15px;
  font-weight: 700;
  color: var(--rw-text);
}
.pill {
  margin-left: auto;
  height: 21px;
  padding: 0 8px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.pill--success {
  background: var(--rw-success-soft);
  color: var(--rw-success);
}
.pill--warn {
  background: var(--rw-warning-soft);
  color: var(--rw-warning);
}
.pill--danger {
  background: var(--rw-danger-soft);
  color: var(--rw-danger);
}
.pill--info {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
}
.result__ctx {
  margin-top: 5px;
  font-size: 11px;
  color: var(--rw-text-3);
}
.result__judgment {
  margin: 9px 0 4px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--rw-text);
  font-weight: 500;
}
.result__summary {
  margin: 4px 0 9px;
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--rw-text-2);
}
.inset {
  background: var(--rw-inset);
  border-radius: 8px;
  padding: 9px 10px;
  margin: 8px 0;
}
.inset__title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 5px;
}
.inset__p {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--rw-text-2);
}
.inset__list {
  margin: 0 0 0 17px;
  padding: 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--rw-text);
}
.evid {
  margin: 9px 0;
}
.evid__title {
  font-size: 11.5px;
  color: var(--rw-text-3);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.evid__note {
  font-size: 10px;
  color: var(--rw-text-3);
}
.evid__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border: 0;
  background: none;
  text-align: left;
}
.evid__row:hover .evid__label {
  text-decoration: underline;
}
.evid__label {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--rw-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.evid__page {
  font-size: 11px;
  color: var(--rw-text-3);
}
.result__note {
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--rw-text-2);
  margin: 7px 0 0;
}
.actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.btn {
  height: 30px;
  padding: 0 11px;
  border-radius: 6px;
  border: 1px solid var(--rw-border);
  background: var(--rw-surface);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--rw-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.btn:hover {
  border-color: var(--rw-border-strong);
}
.btn--primary {
  background: var(--rw-primary);
  border-color: var(--rw-primary);
  color: #fff;
  font-weight: 600;
}
.btn--primary:hover {
  background: var(--rw-primary-hover);
}
.btn--outline {
  border-color: var(--rw-border-strong);
}
.btn--ghost {
  border-color: transparent;
  background: none;
}
.btn--sm {
  height: 26px;
  padding: 0 9px;
  font-size: 12px;
}
.btn--block {
  width: 100%;
  margin-top: 9px;
}
.result__foot {
  margin-top: 9px;
  padding-top: 7px;
  border-top: 1px solid var(--rw-border);
  font-size: 10.5px;
  color: var(--rw-text-3);
}
.offline-note {
  margin-top: 9px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--rw-warning-soft);
  color: var(--rw-warning);
  font-size: 10.5px;
  line-height: 1.5;
}
.sugg {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 9px;
}
.sugg__label {
  font-size: 11px;
  color: var(--rw-text-3);
}
.chatlog {
  border-top: 1px solid var(--rw-border);
  margin-top: 10px;
  padding-top: 9px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chatmsg {
  font-size: 12px;
  line-height: 1.6;
}
.chatmsg__who {
  font-size: 10.5px;
  color: var(--rw-text-3);
  margin-bottom: 2px;
}
.chatmsg--user .chatmsg__text {
  background: var(--rw-primary-soft);
  color: var(--rw-text);
  border-radius: 8px;
  padding: 6px 9px;
  display: inline-block;
  max-width: 100%;
}
.chatmsg--agent .chatmsg__text {
  color: var(--rw-text-2);
}
.chatmsg__hint {
  margin-top: 3px;
  padding: 7px 9px;
  background: var(--rw-inset);
  border-radius: 6px;
  color: var(--rw-text-2);
  font-size: 11.5px;
}
.fc__tabs {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 9px;
}
.fc__tab {
  height: 25px;
  padding: 0 8px;
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  background: var(--rw-surface);
  font-size: 11.5px;
  color: var(--rw-text-2);
}
.fc__tab.active {
  border-color: var(--rw-primary);
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-weight: 600;
}
.fc__sub {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--rw-text-3);
}
.fc__samples {
  margin-top: 6px;
  font-family: var(--rw-font-mono);
  font-size: 11px;
}
.fc__sample-head,
.fc__sample {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 40px;
  gap: 4px;
  padding: 2px 0;
  text-align: center;
}
.fc__sample-head {
  color: var(--rw-text-3);
  border-bottom: 1px solid var(--rw-border);
}
.fc__calc {
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--rw-text-2);
}
.diffblock {
  margin: 8px 0;
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  overflow: hidden;
  font-family: var(--rw-font-mono);
  font-size: 11px;
}
.diffblock__title {
  padding: 5px 8px;
  background: var(--rw-inset);
  font-family: var(--rw-font-sans);
  font-size: 11.5px;
  color: var(--rw-text-2);
}
.diffblock__row {
  padding: 5px 8px;
  line-height: 1.6;
  word-break: break-all;
}
.diffblock__row--del {
  background: var(--rw-danger-soft);
  color: var(--rw-danger);
}
.diffblock__row--add {
  background: var(--rw-success-soft);
  color: var(--rw-success);
}
.diffblock__note {
  padding: 5px 8px;
  font-family: var(--rw-font-sans);
  color: var(--rw-text-2);
  font-size: 11px;
}
.composer {
  flex: none;
  border-top: 1px solid var(--rw-border);
  padding: 10px 12px 12px;
}
.composer__input {
  width: 100%;
  resize: none;
  border: 1px solid var(--rw-border);
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 12.5px;
  font-family: var(--rw-font-sans);
  color: var(--rw-text);
  line-height: 1.6;
  outline: none;
}
.composer__input:focus {
  border-color: var(--rw-primary);
}
.composer__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.composer__ico {
  color: var(--rw-text-3);
  font-size: 13px;
}
.composer__hint {
  flex: 1;
  font-size: 10px;
  color: var(--rw-text-3);
  text-align: right;
}
.composer__send {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 0;
  background: var(--rw-primary);
  color: #fff;
  font-size: 13px;
}
.composer__send:hover {
  background: var(--rw-primary-hover);
}

/* ── 弹层 / toast ── */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
  display: grid;
  place-items: center;
  z-index: 80;
}
.modal__card {
  width: 430px;
  max-width: calc(100vw - 40px);
  background: var(--rw-surface);
  border-radius: 12px;
  box-shadow: var(--rw-shadow-pop);
  padding: 16px 18px;
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.modal__head b {
  font-size: 15px;
}
.modal__x {
  border: 0;
  background: none;
  color: var(--rw-text-3);
  font-size: 14px;
}
.modal__label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: var(--rw-text-2);
  margin-bottom: 10px;
}
.modal__label input,
.modal__label textarea {
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  padding: 7px 9px;
  font-size: 13px;
  font-family: var(--rw-font-sans);
  color: var(--rw-text);
  resize: vertical;
}
.modal__cite {
  font-size: 11px;
  color: var(--rw-text-3);
  margin-bottom: 12px;
}
.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  background: #111827;
  color: #f9fafb;
  font-size: 12.5px;
  padding: 9px 16px;
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.3);
  z-index: 90;
  white-space: nowrap;
}

/* 窄屏兜底 */
@media (max-width: 1500px) {
  .read {
    grid-template-columns: 21% minmax(0, 1fr) 35%;
  }
  .paper {
    padding: 24px 26px;
  }
}
@media (max-width: 1280px) {
  .read {
    grid-template-columns: 250px minmax(0, 1fr) 420px;
  }
  .toolbar__hint {
    display: none;
  }
}
</style>
