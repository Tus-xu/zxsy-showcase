<template>
  <div class="write" data-testid="research-write">
    <!-- ═════════ 左栏：项目条 + 图标轨 + 文件树 / 论文结构 ═════════ -->
    <aside class="write__left">
      <div class="wproj">
        <div class="wproj__cover" :class="'wproj__cover--' + (project.cover || 'writing')">{{ coverMark(project) }}</div>
        <div class="wproj__meta">
          <b :title="project.name">{{ project.name }}</b>
          <span>学术论文项目 · 进行中</span>
        </div>
        <button class="wproj__btn" title="返回项目启动页" data-testid="write-home" @click="router.push('/research')">⌂</button>
      </div>
      <div class="write__leftbody">
        <div class="rail">
          <button v-for="r in RAIL" :key="r.key" class="rail__item" :class="{ active: railActive === r.key }" :title="r.label" @click="onRail(r)">
            <span class="rail__ico">{{ r.icon }}</span><span class="rail__label">{{ r.label }}</span>
          </button>
        </div>
        <div class="explorer">
          <div class="explorer__tabs">
            <button class="explorer__tab" :class="{ active: leftTab === 'tree' }" data-testid="write-tab-tree" @click="leftTab = 'tree'">文件树</button>
            <button class="explorer__tab" :class="{ active: leftTab === 'outline' }" data-testid="write-tab-outline" @click="leftTab = 'outline'">论文结构</button>
            <span class="explorer__acts">
              <button title="保存工程" @click="saveFiles">💾</button>
              <button title="刷新结构" @click="refreshTree">⟳</button>
            </span>
          </div>
          <div v-if="leftTab === 'tree'" class="tree">
            <template v-for="node in fileTree" :key="node.path || node.name">
              <div v-if="node.type === 'dir'" class="tree__group">
                <div class="tree__dir">
                  <span class="tree__caret">{{ node.open ? '▾' : '▸' }}</span>
                  <span class="tree__ico tree__ico--dir">{{ node.open ? '📂' : '📁' }}</span>
                  <span class="tree__name">{{ node.name }}/</span>
                </div>
                <button
                  v-for="child in node.children"
                  :key="child.path"
                  class="tree__file tree__file--child"
                  :class="{ active: activeFile === child.path, 'tree__file--asset': child.asset }"
                  :data-testid="'write-file-' + child.path"
                  @click="openFile(child.path)"
                >
                  <span class="tree__ico">{{ fileIcon(child.path) }}</span>
                  <span class="tree__name">{{ child.name }}</span>
                  <span v-if="child.asset" class="tree__lock">只读</span>
                </button>
              </div>
              <button
                v-else
                class="tree__file"
                :class="{ active: activeFile === node.path }"
                :data-testid="'write-file-' + node.path"
                @click="openFile(node.path)"
              >
                <span class="tree__ico">{{ fileIcon(node.path) }}</span>
                <span class="tree__name">{{ node.name }}</span>
              </button>
            </template>
          </div>
          <div v-else class="outline">
            <button v-for="(o, i) in outline" :key="i" class="outline__item" :class="'outline__item--l' + o.level" @click="gotoOutline(o)">
              <span class="outline__text">{{ o.text }}</span>
              <span class="outline__file">{{ o.file.split('/').pop() }}:{{ o.line }}</span>
            </button>
            <p v-if="!outline.length" class="hint-sm">工程还没有章节，编辑 main.tex 后结构会实时更新。</p>
          </div>
          <div class="explorer__foot">
            <span>工程文件 {{ Object.keys(files).length }} 个</span>
            <span>{{ savedLabel }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- ═════════ 中栏：编译条 + 编辑器 / 预览 + 编译日志 ═════════ -->
    <main class="write__center">
      <div class="compilebar">
        <div class="compilebar__left">
          <span class="compilebar__label">编译配置</span>
          <button class="cbtn" data-testid="write-compiler" @click="compilerOpen = !compilerOpen">XeLaTeX ⌄</button>
          <div v-if="compilerOpen" class="compilebar__menu" @click.stop>
            <button class="active">XeLaTeX（离线常用命令子集）</button>
            <button disabled>PDFLaTeX（演示包未内置）</button>
          </div>
          <button class="cbtn cbtn--toggle" data-testid="write-autocompile" @click="ui.write.autoCompile = !ui.write.autoCompile">
            <span class="cbtn__dot" :class="{ on: ui.write.autoCompile }"></span>自动编译
          </button>
          <button class="cbtn cbtn--primary" data-testid="write-compile" @click="runCompile('manual')">⟳ 重新编译</button>
        </div>
        <div class="compilebar__right">
          <span v-if="compile.status === 'success'" class="cstatus cstatus--ok" data-testid="write-compile-status">✅ 编译成功 <i>{{ compileTimeText }}</i></span>
          <span v-else-if="compile.status === 'error'" class="cstatus cstatus--err" data-testid="write-compile-status">❌ 编译失败 <i>{{ compile.errors.length }} 个错误</i></span>
          <span v-else class="cstatus" data-testid="write-compile-status">未编译</span>
          <span class="cstatus__ver">v{{ compile.version || 0 }}</span>
          <button class="cbtn cbtn--icon" title="编译日志折叠" @click="logOpen = !logOpen">{{ logOpen ? '⌄' : '⌃' }}</button>
        </div>
      </div>

      <div class="workarea">
        <!-- 编辑器 -->
        <section class="editorpane">
          <div class="filetabs">
            <button v-for="f in openFiles" :key="f" class="filetab" :class="{ active: f === activeFile }" data-testid="write-opentab" @click="openFile(f)">
              <span>{{ f.split('/').pop() }}</span>
              <span class="filetab__x" @click.stop="closeFile(f)">×</span>
            </button>
            <button class="filetabs__add" title="打开文件" @click="filePickerOpen = !filePickerOpen">＋</button>
            <div v-if="filePickerOpen" class="filepicker" @click.stop>
              <button v-for="p in Object.keys(files)" :key="p" @click="openFile(p)">{{ p }}</button>
            </div>
            <span class="filetabs__spacer"></span>
            <span class="savestate" :class="{ dirty }" data-testid="write-savestate">{{ savedLabel }}</span>
            <button class="sbtn" data-testid="write-save" @click="saveFiles">保存</button>
          </div>
          <div class="formatbar">
            <button class="fbtn" title="撤销" @click="editorRef?.execUndo()">↺</button>
            <button class="fbtn" title="重做" @click="editorRef?.execRedo()">↻</button>
            <span class="fbar__sep"></span>
            <button class="fbtn" title="加粗" @click="insert('\\textbf{}', 8)">B</button>
            <button class="fbtn" title="斜体" @click="insert('\\emph{}', 6)">I</button>
            <button class="fbtn" title="行内公式" @click="insert('$$', 1)">π</button>
            <button class="fbtn" title="花括号" @click="insert('{}', 1)">{}</button>
            <span class="fbar__sep"></span>
            <button class="fbtn" title="公式环境" @click="insert('\\begin{equation}\n  \n\\end{equation}', 19)">∑</button>
            <button class="fbtn" title="列表" @click="insert('\\begin{itemize}\n  \\item \n\\end{itemize}', 22)">≡</button>
            <button class="fbtn" title="插入引用" @click="insert('\\cite{}', 6)">❝</button>
            <span class="fbar__sep"></span>
            <button class="fbtn" title="查找" @click="editorFind = !editorFind">⌕</button>
            <span class="fbar__spacer"></span>
            <label class="fbar__toggle"><input v-model="showLineNumbers" type="checkbox" /> 行号</label>
            <span class="fbar__pos">{{ cursorLine }}:{{ cursorCol }}</span>
          </div>
          <div v-if="editorFind" class="editorfind">
            <input v-model="findNeedle" placeholder="在文件中查找…" @keydown.enter="findInFile" />
            <span class="hint-sm">{{ findResult }}</span>
            <button class="btn btn--sm" @click="findInFile">查找</button>
          </div>
          <div v-if="isAsset" class="assetview">
            <div class="assetview__ico">📎</div>
            <b>{{ activeFile }}</b>
            <p>这是写作工程声明的随包资产（数据层 assets），离线演示不内置二进制文件内容，仅用于展示工程结构；请在左侧选择 .tex / .bib 文件继续编辑。</p>
          </div>
          <LatexEditor
            v-else
            ref="editorRef"
            v-model="activeContent"
            :active-line="activeLine"
            :show-line-numbers="showLineNumbers"
            @cursor="onCursor"
          />
        </section>

        <!-- PDF 预览 -->
        <section class="previewpane">
          <div class="pvbar">
            <button class="fbtn" :disabled="previewPage <= 1" @click="previewPage = Math.max(1, previewPage - 1)">‹</button>
            <input v-model.number="previewPageInput" class="pvpage" data-testid="write-preview-page" @change="applyPreviewPage" />
            <span class="pvtotal">/ {{ previewPages.length }}</span>
            <button class="fbtn" :disabled="previewPage >= previewPages.length" @click="previewPage = Math.min(previewPages.length, previewPage + 1)">›</button>
            <span class="fbar__sep"></span>
            <button class="fbtn" @click="previewZoom = Math.max(0.6, Math.round((previewZoom - 0.1) * 10) / 10)">−</button>
            <span class="pvzoom">{{ Math.round(previewZoom * 100) }}%</span>
            <button class="fbtn" @click="previewZoom = Math.min(1.6, Math.round((previewZoom + 0.1) * 10) / 10)">＋</button>
            <span class="fbar__spacer"></span>
            <button class="btn btn--sm btn--primary" data-testid="write-export" :disabled="!lastSuccess" @click="downloadPdf">导出 PDF</button>
          </div>
          <div v-if="compile.status === 'error'" class="preview-banner preview-banner--err" data-testid="write-preview-banner">
            ⚠ 本次编译失败，预览保留上次成功版本 v{{ lastSuccess?.version }}（{{ lastSuccessPages }} 页）
          </div>
          <div class="pvscroll">
            <div v-if="!lastSuccess" class="pvempty">
              <div class="pvempty__ico">📄</div>
              <b>还没有成功编译的 PDF 预览</b>
              <p>点击顶部「⟳ 重新编译」，成功后这里显示离线排版结果，并可导出真实 PDF。</p>
            </div>
            <div v-else class="pvpaper" :style="{ zoom: previewZoom }" data-testid="write-preview-paper">
              <div class="pvpaper__meta">
                <span>随包演示写作工程 · 离线编译</span>
                <span>第 {{ previewPage }} / {{ previewPages.length }} 页</span>
              </div>
              <h1 class="pvpaper__title">{{ lastDoc.title }}</h1>
              <div v-if="lastDoc.meta?.length" class="pvpaper__sub">{{ lastDoc.meta.join('　·　') }}</div>
              <div class="pvpaper__rule"></div>
              <template v-for="(b, i) in previewBlocks" :key="i">
                <h2 v-if="b.t === 'title'" class="pv-h1">{{ b.title }}</h2>
                <h2 v-else-if="b.t === 'h1'" class="pv-h1">{{ b.text }}</h2>
                <h3 v-else-if="b.t === 'h2'" class="pv-h2">{{ b.text }}</h3>
                <h4 v-else-if="b.t === 'h3'" class="pv-h3">{{ b.text }}</h4>
                <div v-else-if="b.t === 'formula'" class="pv-formula">
                  <MathText block :text="'$$' + fixTex(b.tex) + '$$'" />
                  <span v-if="b.num" class="pv-formula__num">{{ b.num }}</span>
                </div>
                <ul v-else-if="b.t === 'list'" class="pv-list">
                  <li v-for="(it, k) in b.items" :key="k"><MathText :text="it" /></li>
                </ul>
                <ol v-else-if="b.t === 'refs'" class="pv-list pv-list--ol">
                  <li v-for="(it, k) in b.items" :key="k">{{ it }}</li>
                </ol>
                <blockquote v-else-if="b.t === 'quote'" class="pv-quote">{{ b.text }}</blockquote>
                <div v-else-if="b.t === 'theorem' || b.t === 'defn' || b.t === 'proof'" class="pv-box">
                  <b v-if="b.title">{{ b.title }}</b><b v-else-if="b.label">{{ b.label }}</b>
                  <MathText :text="b.text" />
                </div>
                <p v-else class="pv-p"><MathText :text="b.text" /></p>
              </template>
              <div class="pvpaper__foot">智学数研 · 离线演示　{{ previewPage }} / {{ previewPages.length }}</div>
            </div>
          </div>
        </section>
      </div>

      <!-- 编译日志 -->
      <section v-if="logOpen" class="logpane">
        <div class="logpane__head">
          <button class="logtab" :class="{ active: logTab === 'log' }" data-testid="write-log-tab" @click="logTab = 'log'">编译日志 <span class="logtab__n">{{ compile.log.length }}</span></button>
          <button class="logtab" :class="{ active: logTab === 'errors' }" @click="logTab = 'errors'">错误 <span class="pill pill--danger">{{ compile.errors.length }}</span></button>
          <button class="logtab" :class="{ active: logTab === 'warnings' }" @click="logTab = 'warnings'">警告 <span class="pill pill--warn">{{ compile.warnings.length }}</span></button>
          <button class="logtab" :class="{ active: logTab === 'infos' }" @click="logTab = 'infos'">信息 <span class="pill pill--info">{{ compile.infos.length }}</span></button>
          <span class="fbar__spacer"></span>
          <button class="btn btn--sm btn--ghost" @click="clearLog">清空日志</button>
        </div>
        <div class="logpane__body">
          <button
            v-for="(l, i) in visibleLog"
            :key="i"
            class="logline"
            :class="['logline--' + l.level, { 'logline--clickable': l.file && l.line }]"
            :data-testid="l.level === 'error' ? 'log-error-' + i : 'logline-' + i"
            @click="clickLog(l)"
          >
            <span class="logline__time">{{ l.time }}</span>
            <span class="logline__msg">{{ l.text }}</span>
            <span v-if="l.file && l.line" class="logline__loc">{{ l.file }}:{{ l.line }}</span>
          </button>
          <div v-if="!visibleLog.length" class="logempty">暂无日志。点击「重新编译」生成日志。</div>
        </div>
      </section>
    </main>

    <!-- ═════════ 右栏：写作 Agent ═════════ -->
    <aside class="write__agent">
      <div class="agent">
        <div class="agent__head">
          <div class="agent__logo">π</div>
          <div class="agent__id">
            <div class="agent__name">Research Agent</div>
            <div class="agent__sub">你的学术写作助手 · 离线审核结论</div>
          </div>
          <button class="agent__more" title="Agent 说明" @click="agentHelp = !agentHelp">⋯</button>
        </div>
        <div v-if="agentHelp" class="agent__help">Agent 回答来自随包离线审核规则（非模型实时生成）；所有修改前都会展示差异，需点击「应用」才会写入工程。</div>
        <div class="ctx">
          <div class="ctx__head"><span class="ctx__lock">▣</span><span class="ctx__title">当前上下文</span><span class="ctx__note">（自动装载，非用户筛选）</span></div>
          <div class="ctx__chips">
            <span class="chip" data-testid="write-ctx-file">{{ activeFile }} L{{ activeLine }}</span>
            <span class="chip">{{ currentSection }}</span>
            <span class="chip">refs.bib</span>
            <span class="chip">项目知识库</span>
          </div>
        </div>

        <div class="capchips">
          <button v-for="cap in capabilities" :key="'capchip-' + cap.key" class="capchip" :class="{ active: ui.write.activeCapability === cap.key }" :data-testid="'write-cap-' + cap.key" :title="cap.desc" @click="ui.write.activeCapability = cap.key">
            {{ cap.label }}
          </button>
        </div>

        <div class="agent__scroll">
          <div v-if="!ui.write.activeCapability || ui.write.activeCapability === 'errors'" class="cardwrap">
            <div v-if="currentError" class="result" data-testid="write-error-card">
              <div class="result__status">
                <span class="status-ico status-ico--danger">!</span>
                <span class="result__cap result__cap--danger">{{ errorTitle(currentError) }}</span>
              </div>
              <p class="result__summary">{{ errorExplain(currentError) }}</p>
              <div class="inset">
                <div class="inset__title">文件位置</div>
                <button class="locrow" data-testid="write-error-locate" @click="gotoError(currentError)">
                  <span class="pdfbadge pdfbadge--sm" style="background: var(--rw-primary)">TEX</span>
                  <span>{{ currentError.file }} · 第 <b class="locrow__line">{{ currentError.line }}</b> 行</span>
                </button>
              </div>
              <div class="inset">
                <div class="inset__title">建议修改</div>
                <div class="diff">
                  <div class="diff__row diff__row--del">− {{ errorFixDiff(currentError).removed }}</div>
                  <div class="diff__row diff__row--add">＋ {{ errorFixDiff(currentError).added }}</div>
                </div>
                <p class="inset__p">{{ errorFixDiff(currentError).note }}</p>
              </div>
              <div class="actions">
                <button class="btn btn--primary" data-testid="error-fix" @click="applyErrorFix(currentError)">{{ errorFixDiff(currentError).action }}</button>
                <button class="btn btn--outline" @click="gotoError(currentError)">定位到第 {{ currentError.line }} 行</button>
                <button class="btn btn--outline" @click="noteError(currentError)">加入笔记</button>
              </div>
            </div>
            <div v-else class="result">
              <div class="result__status">
                <span class="status-ico status-ico--success">✓</span>
                <span class="result__cap">编译诊断</span>
                <span class="pill pill--success">{{ compile.status === 'success' ? '编译成功' : '尚未编译' }}</span>
              </div>
              <p class="result__judgment">当前工程没有终止编译的错误。</p>
              <p class="result__summary">{{ compile.status === 'success' ? `已生成 main.pdf（${lastSuccessPages} 页，版本 v${lastSuccess?.version}）。可以继续编辑、应用改进建议，或导出 PDF。` : '点击顶部「重新编译」开始一次离线编译。' }}</p>
              <div v-if="compile.warnings.length" class="inset">
                <div class="inset__title">待处理警告</div>
                <ol class="inset__list"><li v-for="(w, i) in compile.warnings" :key="i">{{ w.message }}</li></ol>
              </div>
              <div class="actions">
                <button class="btn btn--primary" @click="runCompile('manual')">重新编译</button>
                <button class="btn btn--outline" @click="ui.write.activeCapability = 'suggest'">查看改进建议</button>
              </div>
            </div>
          </div>

          <div v-else-if="ui.write.activeCapability === 'suggest' || ui.write.activeCapability === 'polish' || ui.write.activeCapability === 'translate'" class="cardwrap">
            <div class="result">
              <div class="result__status">
                <span class="status-ico status-ico--info">i</span>
                <span class="result__cap">{{ capLabel(ui.write.activeCapability) }}</span>
                <span class="pill pill--info">先看差异再接受</span>
              </div>
              <p class="result__summary">{{ capIntro(ui.write.activeCapability) }}</p>
              <div class="patchlist">
                <button v-for="p in visiblePatches" :key="p.id" class="patchitem" :class="{ active: selectedPatchId === p.id }" :data-testid="'patch-' + p.id" @click="selectedPatchId = p.id">
                  <b>{{ p.title }}</b><small>{{ p.capability }} · {{ p.diff.file }}</small>
                </button>
              </div>
              <template v-if="selectedPatch">
                <div class="inset">
                  <div class="inset__title">{{ selectedPatch.title }}</div>
                  <p class="inset__p">{{ selectedPatch.summary }}</p>
                </div>
                <div class="diff">
                  <div v-for="(r, i) in selectedPatch.diff.removed || []" :key="'r' + i" class="diff__row diff__row--del">− {{ r }}</div>
                  <div v-if="!selectedPatch.diff.removed?.length" class="diff__row diff__row--del">− （无）</div>
                  <div v-for="(a, i) in selectedPatch.diff.added || []" :key="'a' + i" class="diff__row diff__row--add">＋ {{ a }}</div>
                </div>
                <p class="result__note">{{ selectedPatch.diff.note }}</p>
                <div class="actions">
                  <button class="btn btn--primary" :data-testid="'patch-apply-' + selectedPatch.id" :disabled="patchApplied(selectedPatch.id)" @click="applyPatch(selectedPatch)">
                    {{ patchApplied(selectedPatch.id) ? '已应用' : '应用修改' }}
                  </button>
                  <button class="btn btn--outline" @click="gotoPatch(selectedPatch)">定位到文件</button>
                  <button class="btn btn--outline" @click="notePatch(selectedPatch)">加入笔记</button>
                </div>
              </template>
            </div>
          </div>

          <div v-else-if="ui.write.activeCapability === 'citations'" class="cardwrap">
            <div class="result" data-testid="write-citation-card">
              <div class="result__status">
                <span class="status-ico" :class="citationWarning ? 'status-ico--warn' : 'status-ico--success'">{{ citationWarning ? '!' : '✓' }}</span>
                <span class="result__cap">{{ citationWarning ? '未定义的引用标识符' : '引用检查' }}</span>
                <span class="pill" :class="citationWarning ? 'pill--warn' : 'pill--success'">{{ citationWarning ? '需要补充' : '全部可解析' }}</span>
              </div>
              <template v-if="citationWarning">
                <p class="result__summary">编译日志显示 <code class="code">{{ '\\cite{' + citationWarning.key + '}' }}</code> 在 refs.bib 中找不到对应条目，PDF 会显示 [?]。</p>
                <div class="inset">
                  <div class="inset__title">文件位置</div>
                  <button class="locrow" @click="gotoWarning(citationWarning)">
                    <span class="pdfbadge pdfbadge--sm" style="background: var(--rw-primary)">TEX</span>
                    <span>{{ citationWarning.file }} · 第 <b class="locrow__line">{{ citationWarning.line }}</b> 行</span>
                  </button>
                </div>
                <div class="diff">
                  <div class="diff__row diff__row--del">− \cite{ {{ citationWarning.key }} }</div>
                  <div class="diff__row diff__row--add">＋ \cite{ {{ citationWarning.suggestion }} }</div>
                </div>
                <p class="result__note">refs.bib 中的候选条目：{{ bibKeys.join('、') }}（均为随包演示材料，非外部论文）。</p>
                <div class="actions">
                  <button class="btn btn--primary" data-testid="citation-fix" @click="applyCitationFix(citationWarning)">应用修复</button>
                  <button class="btn btn--outline" @click="gotoWarning(citationWarning)">定位到第 {{ citationWarning.line }} 行</button>
                  <button class="btn btn--outline" @click="noteCitation(citationWarning)">加入笔记</button>
                </div>
              </template>
              <template v-else>
                <p class="result__summary">正文引用 {{ usedCites.length }} 个键，refs.bib 提供 {{ bibKeys.length }} 条项目内材料；未发现外部引用或伪造 DOI。</p>
                <div class="inset"><div class="inset__title">项目内文献</div><ol class="inset__list"><li v-for="k in bibKeys" :key="k">{{ k }}</li></ol></div>
                <div class="actions"><button class="btn btn--primary" @click="runCompile('manual')">重新检查</button></div>
              </template>
            </div>
          </div>

          <div v-else-if="ui.write.activeCapability === 'latex'" class="cardwrap">
            <div class="result" data-testid="write-latex-card">
              <div class="result__status">
                <span class="status-ico status-ico--info">i</span>
                <span class="result__cap">LaTeX 对照</span>
                <span class="pill pill--info">{{ latexCompare.status }}</span>
              </div>
              <p class="result__summary">{{ latexCompare.summary }}</p>
              <div class="inset">
                <div class="inset__title">讲义公式（随包讲义 · 第 4 页）</div>
                <MathText block :text="'$$' + latexCompare.lectureTex + '$$'" />
              </div>
              <div class="inset">
                <div class="inset__title">写作草稿中的公式</div>
                <MathText v-if="latexCompare.draftTex" block :text="'$$' + latexCompare.draftTex + '$$'" />
                <p v-else class="inset__p">草稿中没有找到对应公式。</p>
              </div>
              <div class="actions">
                <button class="btn btn--primary" @click="goReadLecture">打开讲义对照</button>
                <button class="btn btn--outline" @click="runCompile('manual')">重新检查</button>
              </div>
            </div>
          </div>

          <div v-else-if="ui.write.activeCapability === 'formula'" class="cardwrap">
            <div class="result" data-testid="write-formula-card">
              <div class="result__status">
                <span class="status-ico status-ico--success">%</span>
                <span class="result__cap">公式检查</span>
                <span class="pill pill--success">离线规则核验</span>
              </div>
              <p class="result__summary">草稿中共 {{ draftFormulaCount }} 个公式环境。以下三组条件核查结论来自随包数据层 formulaChecks（离线规则引擎 + 预置反例），非模型实时生成。</p>
              <div class="fc__tabs">
                <button v-for="c in formulaChecks" :key="c.id" class="fc__tab" :class="{ active: (writeFormulaId || formulaChecks[0].id) === c.id }" :data-testid="'write-formula-' + c.id" @click="writeFormulaId = c.id">{{ c.title }}</button>
              </div>
              <template v-if="activeFormula">
                <div class="result__status">
                  <span class="status-ico" :class="statusIconClass(activeFormula.status)">{{ statusGlyph(activeFormula.status) }}</span>
                  <span class="result__cap">{{ activeFormula.statusLabel }}</span>
                  <span class="pill" :class="statusPillClass(activeFormula.status)">{{ activeFormula.title }}</span>
                </div>
                <p class="result__judgment">{{ activeFormula.judgment }}</p>
                <div class="inset"><div class="inset__title">依据</div><p class="inset__p">{{ activeFormula.basis }}</p></div>
                <div class="inset"><div class="inset__title">反例 / 核验</div><p class="inset__p">{{ activeFormula.counterexample.text }}</p></div>
                <div class="actions">
                  <button class="btn btn--outline" @click="goFormulaSource(activeFormula)">定位原文</button>
                  <button class="btn btn--primary" @click="noteFormulaCheck(activeFormula)">加入笔记</button>
                </div>
                <div class="offline-note">离线演示审核结论，非模型实时生成 · {{ activeFormula.engine }}</div>
              </template>
            </div>
          </div>

          <div v-else class="cardwrap agent-empty">
            <div class="agent-empty__logo">π</div>
            <div class="agent-empty__title">有什么可以帮你的吗？</div>
            <p class="agent-empty__text">面向当前 LaTeX 工程：解释编译错误、给出改进差异、补全引用、检查公式。</p>
            <button v-for="cap in capabilities" :key="cap.key" class="entry" :data-testid="'write-entry-' + cap.key" @click="ui.write.activeCapability = cap.key">
              <span class="entry__ico">{{ cap.icon }}</span>
              <span class="entry__meta"><b>{{ cap.label }}</b><small>{{ cap.desc }}</small></span>
              <span class="entry__arrow">→</span>
            </button>
          </div>

          <div v-if="writeChat.length" class="chatlog">
            <div v-for="(m, i) in writeChat" :key="i" class="chatmsg" :class="'chatmsg--' + m.role">
              <div class="chatmsg__who">{{ m.role === 'user' ? '你' : 'Research Agent' }}</div>
              <div class="chatmsg__text">{{ m.text }}</div>
            </div>
          </div>
        </div>

        <div class="composer">
          <textarea v-model="composerText" class="composer__input" rows="2" placeholder="有什么可以帮你的吗？" data-testid="write-composer" @keydown.enter.exact.prevent="sendComposer"></textarea>
          <div class="composer__bar">
            <span class="composer__ico">📎</span><span class="composer__ico">@</span><span class="composer__ico">📖</span>
            <span class="composer__hint">Enter 发送</span>
            <button class="composer__send" data-testid="write-send" @click="sendComposer">➤</button>
          </div>
        </div>
      </div>
    </aside>

    <div v-if="settingsOpen" class="modal" data-testid="write-settings" @click.self="settingsOpen = false">
      <div class="modal__card">
        <div class="modal__head"><b>写作工作区设置</b><button class="modal__x" @click="settingsOpen = false">✕</button></div>
        <div class="settingrow"><span>自动编译</span><button class="cbtn cbtn--toggle" @click="ui.write.autoCompile = !ui.write.autoCompile"><span class="cbtn__dot" :class="{ on: ui.write.autoCompile }"></span>{{ ui.write.autoCompile ? '已开启' : '已关闭' }}</button></div>
        <div class="settingrow"><span>当前编译版本</span><b>v{{ compile.version || 0 }} · {{ compile.status === 'success' ? '成功' : compile.status === 'error' ? '失败' : '未编译' }}</b></div>
        <div class="settingrow"><span>工程文件</span><b>{{ Object.keys(files).length }} 个</b></div>
        <p class="hint-sm">复位只清空本项目的写作演示状态（文件修改 / 编译记录 / 已应用补丁），数据层只读文件不受影响。</p>
        <div class="modal__foot">
          <button class="btn" @click="settingsOpen = false">取消</button>
          <button class="btn btn--primary" data-testid="write-reset" @click="resetWrite">复位写作状态</button>
        </div>
      </div>
    </div>

    <div v-if="toastText" class="toast" data-testid="write-toast">{{ toastText }}</div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MathText from '../../components/MathText.vue'
import LatexEditor from '../../components/research/LatexEditor.vue'
import { store } from '../../state/demo'
import {
  RESEARCH_DISCLAIMER,
  allProjects,
  assetsForProject,
  filesForWritingProject,
  formulaChecks,
  researchUi,
  resolveProject,
  writingProjects,
} from '../../components/research/researchUi'
import {
  buildPdfDoc,
  compileProject,
  guessSection,
  normalizeTex,
  outlineProject,
  parseProject,
  validateProject,
} from '../../components/research/latexEngine'
import { exportPdf } from '../../lib/exportPdf'
import { formatClock, paginateDoc, pdfSafeText } from '../../data/research'

const route = useRoute()
const router = useRouter()
const ui = researchUi()

const RAIL = [
  { key: 'project', label: '项目', icon: '▭' },
  { key: 'docs', label: '文献', icon: '▥' },
  { key: 'notes', label: '笔记', icon: '▤' },
  { key: 'settings', label: '设置', icon: '⚙' },
]
const CAPS = [
  { key: 'errors', icon: '!', label: '编译错误解释', desc: '定位错误文件与行号，给出修复差异' },
  { key: 'suggest', icon: '💡', label: '改进建议', desc: '证毕符号 / 摘要润色 / 摘要翻译（先看差异）' },
  { key: 'citations', icon: '❝', label: '引用补全', desc: '未定义引用键与 refs.bib 候选条目' },
  { key: 'formula', icon: '%', label: '公式检查', desc: '配方恒等式与条件漏洞的离线核查' },
  { key: 'latex', icon: '{}', label: 'LaTeX 对照', desc: '讲义公式与写作草稿逐字对照' },
  { key: 'polish', icon: '✎', label: '语言润色', desc: '只改措辞，不改公式与引用' },
  { key: 'translate', icon: 'A文', label: '翻译成英文', desc: '保留数学记号与引用键' },
]

const routeProjectId = computed(() => (route.query.project ? String(route.query.project) : ''))
const project = computed(() => resolveProject(ui.write.projectId || routeProjectId.value || store.research.projectId))
const compile = computed(
  () =>
    ui.write.compileByProject[project.value.id] || {
      status: 'idle',
      version: 0,
      at: null,
      errors: [],
      warnings: [],
      infos: [],
      log: [],
      lastSuccess: null,
    },
)
const files = computed(() => ui.write.filesByProject[project.value.id] || {})
const openFiles = computed(() => ui.write.openFilesByProject[project.value.id] || ['main.tex'])
const activeFile = computed(() => ui.write.activeFileByProject[project.value.id] || 'main.tex')
const isAsset = computed(() => !files.value[activeFile.value])
const activeContent = computed({
  get: () => files.value[activeFile.value]?.content || '',
  set: (v) => {
    if (!files.value[activeFile.value]) return
    files.value[activeFile.value].content = v
    markDirty()
  },
})
const dirty = computed(() => !!ui.write.dirtyByProject[project.value.id])
const savedAt = computed(() => ui.write.savedAtByProject[project.value.id])
const savedLabel = computed(() => (dirty.value ? '未保存' : savedAt.value ? `已保存 ${formatClock(savedAt.value)}` : '已保存'))
const outline = computed(() => (Object.keys(files.value).length ? outlineProject(files.value) : []))
const lastSuccess = computed(() => compile.value.lastSuccess || null)
const lastDoc = computed(() => lastSuccess.value?.doc || null)
const previewPages = computed(() => (lastDoc.value ? paginateDoc(lastDoc.value) : [[]]))
const lastSuccessPages = computed(() => lastSuccess.value?.pages || previewPages.value.length)
const previewPage = computed({
  get: () => Math.min(Math.max(ui.write.previewPageByProject[project.value.id] || 1, 1), previewPages.value.length),
  set: (v) => {
    ui.write.previewPageByProject[project.value.id] = Math.min(Math.max(Number(v) || 1, 1), previewPages.value.length)
  },
})
const previewBlocks = computed(() => (previewPages.value[previewPage.value - 1] || []).filter((b) => b.t !== 'title'))
const compileTimeText = computed(() => (compile.value.at ? formatClock(compile.value.at) : ''))

const currentError = computed(() => compile.value.errors[0] || null)
const citationWarnings = computed(() => compile.value.warnings.filter((w) => w.code === 'undefined-citation'))
const citationWarning = computed(() => citationWarnings.value[0] || null)
const bibKeys = computed(() => {
  const out = []
  for (const f of Object.values(files.value)) {
    if ((f.kind || '') !== 'bib') continue
    for (const m of String(f.content || '').matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,/g)) out.push(m[1])
  }
  return out
})
const usedCites = computed(() => {
  const out = new Set()
  for (const f of Object.values(files.value)) {
    if ((f.kind || '') !== 'tex') continue
    for (const m of String(f.content || '').matchAll(/\\cite\{([^}]*)\}/g)) m[1].split(',').forEach((k) => out.add(k.trim()))
  }
  return [...out]
})
const currentSection = computed(() => guessSection(files.value, activeFile.value, activeLine.value))
const lastExport = computed(() => ui.write.lastExport)

const patches = computed(() => writingProjects[project.value.writeProjectId]?.patches || [])
const visiblePatches = computed(() => {
  const cap = ui.write.activeCapability
  if (cap === 'polish') return patches.value.filter((p) => p.capability === '语言润色')
  if (cap === 'translate') return patches.value.filter((p) => p.capability === '翻译成英文')
  return patches.value
})
const selectedPatch = computed(() => visiblePatches.value.find((p) => p.id === selectedPatchId.value) || visiblePatches.value[0] || null)
const patchApplied = (id) => !!ui.write.appliedPatchesByProject?.[project.value.id]?.includes(id)

const draftDoc = computed(() => (Object.keys(files.value).length ? parseProject(files.value) : null))
const draftFormulaCount = computed(() => (draftDoc.value ? draftDoc.value.blocks.filter((b) => b.t === 'formula').length + 2 : 0))
const latexCompare = computed(() => {
  const lectureTex = String.raw`\|u-u_h\|_V \le \frac{M}{\alpha} \inf_{v_h\in V_h}\|u-v_h\|_V`
  const draftFormulas = draftDoc.value?.blocks.filter((b) => b.t === 'formula') || []
  const target = draftFormulas.find((b) => String(b.tex).includes('u-u_h'))
  if (!target) {
    return { status: '需要补充', summary: '写作草稿里没有找到 Céa 引理估计式；讲义 (2.2) 与草稿暂时无法逐项对照。', lectureTex, draftTex: '' }
  }
  const normalized = normalizeTex(String(target.tex))
  const rawMatch = /u-u_h/.test(normalized) && /M/.test(normalized) && /alpha/.test(normalized)
  return {
    status: rawMatch ? '主体一致（需补条件说明）' : '需要核对',
    summary: rawMatch
      ? '草稿公式与讲义 (2.2) 的主体结构一致（范数、常数 M/α、下确界）；建议按讲义第 4 页补一句 V-椭圆性假设 α>0。'
      : '草稿公式与讲义 (2.2) 存在差异，请按讲义第 4 页核对系数与下标。',
    lectureTex,
    draftTex: normalizeTex(String(target.tex)),
  }
})
const activeFormula = computed(() => formulaChecks.find((c) => c.id === (writeFormulaId.value || formulaChecks[0].id)) || null)

const writeChat = computed(() => ui.write.chatByProject?.[project.value.id] || [])

/* ── 状态初始化 ── */
const editorRef = ref(null)
const leftTab = ref('tree')
const railActive = ref('project')
const compilerOpen = ref(false)
const filePickerOpen = ref(false)
const logOpen = ref(true)
const logTab = ref('log')
const showLineNumbers = ref(true)
const editorFind = ref(false)
const findNeedle = ref('')
const findResult = ref('')
const cursorLine = ref(1)
const cursorCol = ref(1)
const activeLine = ref(1)
const previewZoom = ref(1)
const previewPageInput = ref(1)
const composerText = ref('')
const agentHelp = ref(false)
const toastText = ref('')
const selectedPatchId = ref('')
const writeFormulaId = ref('')
const settingsOpen = ref(false)
let toastTimer = null

function ensureProject(p) {
  if (!p) return
  ui.write.projectId = p.id
  store.research.projectId = p.id
  filesForWritingProject(p)
  if (!ui.write.compileByProject[p.id]) {
    nextTick(() => runCompile('initial'))
  }
}

onMounted(() => {
  const fromQuery = route.query.project ? allProjects().find((p) => p.id === String(route.query.project)) : null
  ensureProject(fromQuery || project.value)
  previewPageInput.value = previewPage.value
  if (ui.write.activeCapability === undefined) ui.write.activeCapability = null
})

watch(
  () => store.research.projectId,
  (id) => {
    if (!id || id === ui.write.projectId) return
    ensureProject(resolveProject(id))
  },
)
watch(
  () => ui.write.previewPageByProject[project.value.id],
  (v) => (previewPageInput.value = v || 1),
)
watch(previewPage, (v) => (previewPageInput.value = v))

/* ── 文件树 ── */
const fileTree = computed(() => {
  const paths = Object.keys(files.value)
  const dirs = new Map()
  const roots = []
  for (const path of paths) {
    const parts = path.split('/')
    let bucket = roots
    let prefix = ''
    for (let i = 0; i < parts.length - 1; i++) {
      prefix = prefix ? `${prefix}/${parts[i]}` : parts[i]
      let dir = dirs.get(prefix)
      if (!dir) {
        dir = { type: 'dir', name: parts[i], path: prefix, open: true, children: [] }
        dirs.set(prefix, dir)
        bucket.push(dir)
      }
      bucket = dir.children
    }
    bucket.push({ type: 'file', name: parts[parts.length - 1], path, asset: false })
  }
  // 数据层声明的资产（figures/tables）：只展示、不进编辑器可写集合
  for (const asset of assetsForProject(project.value)) {
    const clean = asset.replace(/\/$/, '')
    if (clean.endsWith('.png') || clean.endsWith('.pdf')) {
      const parts = clean.split('/')
      if (parts.length === 2) {
        let dir = dirs.get(parts[0])
        if (!dir) {
          dir = { type: 'dir', name: parts[0], path: parts[0], open: true, children: [] }
          dirs.set(parts[0], dir)
          roots.push(dir)
        }
        if (!dir.children.some((c) => c.path === clean)) dir.children.push({ type: 'file', name: parts[1], path: clean, asset: true })
      }
    } else if (!fileTreeNameExists(roots, clean)) {
      roots.push({ type: 'dir', name: clean, path: clean, open: false, children: [] })
    }
  }
  return roots
})
function fileTreeNameExists(nodes, name) {
  return nodes.some((n) => n.name === name)
}
function fileIcon(path) {
  if (path.endsWith('.tex')) return '📄'
  if (path.endsWith('.bib')) return '📚'
  if (path.endsWith('.png')) return '🖼'
  if (path.endsWith('.pdf')) return '📕'
  return '📄'
}
function openFile(path) {
  const pid = project.value.id
  if (files.value[path]) {
    ui.write.activeFileByProject[pid] = path
    const open = new Set(ui.write.openFilesByProject[pid] || ['main.tex'])
    open.add(path)
    ui.write.openFilesByProject[pid] = [...open]
    filePickerOpen.value = false
    activeLine.value = 1
  } else {
    ui.write.activeFileByProject[pid] = path
    filePickerOpen.value = false
    pushToast('该文件为随包资产声明（只读，不参与离线编译）')
  }
}
function closeFile(path) {
  const pid = project.value.id
  const open = (ui.write.openFilesByProject[pid] || ['main.tex']).filter((f) => f !== path)
  ui.write.openFilesByProject[pid] = open.length ? open : ['main.tex']
  if (ui.write.activeFileByProject[pid] === path) ui.write.activeFileByProject[pid] = ui.write.openFilesByProject[pid][0]
}
function refreshTree() {
  pushToast('文件结构与论文大纲已刷新')
}
function gotoOutline(o) {
  openFile(o.file)
  revealLine(o.line)
}
function revealLine(line) {
  activeLine.value = line
  nextTick(() => editorRef.value?.revealLine(line))
}
function onCursor(line) {
  if (line) activeLine.value = line
}

/* ── 保存 / 编译 ── */
function markDirty() {
  ui.write.dirtyByProject[project.value.id] = true
}
function saveFiles() {
  const pid = project.value.id
  ui.write.savedAtByProject[pid] = Date.now()
  ui.write.dirtyByProject[pid] = false
  pushToast('已保存到本地演示状态（刷新后仍在）')
}
function formatLogTime() {
  return formatClock(Date.now())
}
function runCompile(reason = 'manual') {
  const pid = project.value.id
  const projectFiles = filesForWritingProject(project.value)
  const started = Date.now()
  const report = validateProject(projectFiles)
  const version = (compile.value.version || 0) + 1
  const log = []
  const t = formatLogTime()
  log.push({ time: t, level: 'info', text: 'Compiling main.tex (XeLaTeX)...' })
  saveFilesSilent()
  ui.write.dirtyByProject[pid] = false
  if (report.errors.length) {
    report.errors.forEach((e) => log.push({ time: t, level: 'error', text: `${e.file}:${e.line}  ${e.message}`, file: e.file, line: e.line }))
    log.push({ time: t, level: 'error', text: `❌ 编译失败：发现 ${report.errors.length} 个错误（保留上次成功产物）。` })
    ui.write.compileByProject[pid] = {
      status: 'error',
      version,
      at: Date.now(),
      duration: (Date.now() - started) / 1000,
      errors: report.errors,
      warnings: report.warnings,
      infos: report.infos,
      log,
      lastSuccess: lastSuccess.value,
    }
    logOpen.value = true
    logTab.value = 'log'
    ui.write.activeCapability = 'errors'
    pushToast(`编译失败：${report.errors.length} 个错误，已展开「编译错误解释」`)
    return
  }
  const doc = parseProject(projectFiles)
  const pages = paginateDoc(doc).length
  report.warnings.forEach((w) => log.push({ time: t, level: 'warning', text: `LaTeX Warning: ${w.message}`, file: w.file, line: w.line }))
  report.infos.forEach((info) => log.push({ time: t, level: 'info', text: info.message }))
  const duration = Math.max(0.1, (Date.now() - started) / 1000)
  log.push({ time: t, level: 'success', text: `Output written on main.pdf (${pages} pages).` })
  log.push({ time: t, level: 'success', text: `✅ 编译完成，用时 ${duration.toFixed(1)} 秒。` })
  ui.write.compileByProject[pid] = {
    status: 'success',
    version,
    at: Date.now(),
    duration,
    errors: [],
    warnings: report.warnings,
    infos: report.infos,
    log,
    lastSuccess: { doc, version, at: Date.now(), pages, pdfName: `${project.value.name}.pdf` },
  }
  ui.write.previewPageByProject[pid] = 1
  logTab.value = 'log'
  if (!ui.write.activeCapability) ui.write.activeCapability = 'errors'
  pushToast(`编译成功 · v${version}（${pages} 页）`)
}
function saveFilesSilent() {
  const pid = project.value.id
  ui.write.savedAtByProject[pid] = Date.now()
}
function clickLog(l) {
  if (!l.file || !l.line) return
  openFile(l.file)
  revealLine(l.line)
}
function clearLog() {
  const c = ui.write.compileByProject[project.value.id]
  if (c) c.log = []
  pushToast('编译日志已清空（工程与产物不受影响）')
}
const visibleLog = computed(() => {
  const c = compile.value
  if (logTab.value === 'errors') return c.log.filter((l) => l.level === 'error')
  if (logTab.value === 'warnings') return c.log.filter((l) => l.level === 'warning')
  if (logTab.value === 'infos') return c.log.filter((l) => l.level === 'info')
  return c.log
})

/* ── 预览 / 导出 ── */
function applyPreviewPage() {
  previewPage.value = previewPageInput.value
}
async function downloadPdf() {
  if (!lastSuccess.value) {
    pushToast('请先编译成功后再导出 PDF')
    return
  }
  try {
    const raw = buildPdfDoc(lastSuccess.value.doc)
    // 离线 CJK 子集字体缺少部分数学字形：按数据层 pdfSafeText 规则剔除/替换后再排版
    const safe = (s) => pdfSafeText(String(s || '')).replace(/é/g, 'e').replace(/É/g, 'E')
    const doc = {
      title: safe(raw.title),
      meta: (raw.meta || []).map((m) => safe(m)),
      blocks: (raw.blocks || []).map((b) => ({ ...b, text: safe(b.text || '') })),
    }
    const name = `${project.value.name}-v${lastSuccess.value.version}.pdf`
    const res = await exportPdf(doc, name)
    ui.write.lastExport = { name, size: res.bytes, at: Date.now(), version: lastSuccess.value.version }
    pushToast(`PDF 已导出：${name}`)
  } catch (err) {
    pushToast('PDF 导出失败：' + (err?.message || '本地导出器异常'))
  }
}

/* ── 错误修复 ── */
function errorTitle(err) {
  if (err.code === 'undefined-command') return `未定义的控制序列：\\${err.command}`
  if (/环境不匹配/.test(err.message)) return '环境不匹配'
  if (/花括号/.test(err.message)) return '花括号未闭合'
  return '编译错误'
}
function errorExplain(err) {
  if (err.code === 'undefined-command' && err.command === 'qedhere') {
    return '\\qedhere 由 amsthm 宏包提供。当前导言区没有 \\usepackage{amsthm}，因此离线编译器无法识别该命令；加入宏包后重新编译即可恢复。'
  }
  if (err.code === 'undefined-command') return `离线演示编译器不支持 \\${err.command}；换用子集内的命令，或按提示先加载对应宏包。`
  return err.message
}
function errorFixDiff(err) {
  if (err.code === 'undefined-command' && err.command === 'qedhere') {
    return { removed: '（导言区缺少宏包声明）', added: '\\usepackage{amsthm}', note: '在 main.tex 导言区加入 amsthm 后重新编译；也可删除 \\qedhere。', action: '应用修复（加入 amsthm）' }
  }
  if (err.code === 'undefined-command') {
    return { removed: `\\${err.command}`, added: '（替换为离线子集支持的等价命令）', note: '按讲义第 3 页的错误恢复建议处理。', action: '定位并手工修正' }
  }
  return { removed: '（当前行）', added: '（按日志提示修正）', note: err.message, action: '定位到错误行' }
}
function applyErrorFix(err) {
  if (err.code === 'undefined-command' && err.command === 'qedhere') {
    const main = files.value['main.tex']
    if (main && !main.content.includes('amsthm')) {
      if (main.content.includes('\\usepackage{amsmath, amssymb}')) {
        main.content = main.content.replace('\\usepackage{amsmath, amssymb}', '\\usepackage{amsmath, amssymb}\n\\usepackage{amsthm}')
      } else {
        main.content = main.content.replace(/(\\documentclass[^\n]*\n)/, `$1\\usepackage{amsthm}\n`)
      }
      markDirty()
      saveFiles()
      runCompile('fix')
      pushToast('已加入 \\usepackage{amsthm} 并重新编译')
      return
    }
  }
  gotoError(err)
  pushToast('请按建议修改后重新编译')
}
function gotoError(err) {
  openFile(err.file)
  revealLine(err.line)
  logTab.value = 'errors'
}
function gotoWarning(w) {
  openFile(w.file)
  revealLine(w.line)
}
function noteError(err) {
  pushNote(`编译错误：${errorTitle(err)}`, `${errorExplain(err)}\n建议：${errorFixDiff(err).note}`)
}
function pushNote(title, body) {
  const pid = project.value.id
  if (!ui.write.notesByProject) ui.write.notesByProject = {}
  if (!ui.write.notesByProject[pid]) ui.write.notesByProject[pid] = []
  ui.write.notesByProject[pid].unshift({ id: `wnote-${Date.now()}`, title, body, at: Date.now(), timeText: formatClock(Date.now()) })
  pushToast('已加入写作笔记（左侧「笔记」可查看）')
}

/* ── 引用修复 ── */
function applyCitationFix(w) {
  const file = files.value[w.file]
  if (!file) return
  const lines = file.content.split('\n')
  const idx = w.line - 1
  if (lines[idx]) {
    lines[idx] = lines[idx].replace(`\\cite{${w.key}}`, `\\cite{${w.suggestion}}`)
    file.content = lines.join('\n')
    markDirty()
    saveFiles()
    runCompile('citation-fix')
    pushToast(`已把引用键 ${w.key} 修正为 ${w.suggestion}`)
  }
}
function noteCitation(w) {
  pushNote(`引用补全：${w.key} → ${w.suggestion}`, `${w.message}\nrefs.bib 候选：${bibKeys.value.join('、')}`)
}

/* ── 改进建议 / 补丁 ── */
function applyPatch(patch) {
  const file = files.value[patch.patch.file]
  if (!file) {
    pushToast('补丁目标文件不存在')
    return
  }
  if (patch.patch.mode === 'insertAfter') {
    const anchor = patch.patch.anchor
    const idx = file.content.indexOf(anchor)
    if (idx < 0) {
      pushToast('未找到补丁锚点，请手工定位')
      return
    }
    const at = idx + anchor.length
    file.content = file.content.slice(0, at) + '\n' + patch.patch.text + file.content.slice(at)
  } else if (patch.patch.mode === 'replace') {
    if (!file.content.includes(patch.patch.find)) {
      pushToast('未找到待替换文本，可能已应用')
      return
    }
    file.content = file.content.replace(patch.patch.find, patch.patch.replace)
  }
  if (!ui.write.appliedPatchesByProject) ui.write.appliedPatchesByProject = {}
  if (!ui.write.appliedPatchesByProject[project.value.id]) ui.write.appliedPatchesByProject[project.value.id] = []
  ui.write.appliedPatchesByProject[project.value.id].push(patch.id)
  markDirty()
  saveFiles()
  runCompile('patch')
  pushToast(patch.afterApply || '修改已应用并重新编译')
}
function gotoPatch(patch) {
  openFile(patch.patch.file)
  const anchor = patch.patch.anchor || patch.patch.find
  if (anchor) {
    const idx = files.value[patch.patch.file]?.content.indexOf(String(anchor).slice(0, 20)) ?? -1
    const line = idx >= 0 ? files.value[patch.patch.file].content.slice(0, idx).split('\n').length : 1
    revealLine(line)
  }
}
function notePatch(patch) {
  pushNote(`改进建议：${patch.title}`, `${patch.summary}\n${patch.diff.note}\n能力：${patch.capability}`)
}

/* ── 公式检查 / 对照 ── */
function goFormulaSource(c) {
  router.push({ path: '/research/read', query: { project: 'p-condition', paper: c.evidence[0].paperId, page: c.evidence[0].page, block: c.evidence[0].block } })
}
function noteFormulaCheck(c) {
  pushNote(`公式检查：${c.title}（${c.statusLabel}）`, `${c.judgment}\n依据：${c.basis}\n反例：${c.counterexample.text}`)
}
function goReadLecture() {
  router.push({ path: '/research/read', query: { project: 'p-fem', paper: 'fem-cea', page: 4, block: 'thm-cea' } })
}
function statusPillClass(status) {
  if (['verified', 'supported'].includes(status)) return 'pill--success'
  if (['needs-condition', 'warning'].includes(status)) return 'pill--warn'
  return 'pill--info'
}
function statusIconClass(status) {
  if (['verified', 'supported'].includes(status)) return 'status-ico--success'
  if (['needs-condition', 'warning'].includes(status)) return 'status-ico--warn'
  return 'status-ico--info'
}
function statusGlyph(status) {
  const cls = statusIconClass(status)
  return cls.endsWith('success') ? '✓' : cls.endsWith('warn') ? '!' : 'i'
}

/* ── 编辑器工具栏 / 查找 ── */
function insert(snippet, offset = snippet.length) {
  editorRef.value?.insertSnippet(snippet)
  pushToast('已插入 LaTeX 片段')
}
function findInFile() {
  const needle = findNeedle.value
  if (!needle) {
    findResult.value = ''
    return
  }
  const lines = activeContent.value.split('\n')
  const idx = lines.findIndex((l) => l.includes(needle))
  if (idx < 0) {
    findResult.value = '未找到'
    return
  }
  findResult.value = `第 ${idx + 1} 行`
  revealLine(idx + 1)
}

/* ── 能力 / 对话 / 其他 ── */
const capabilities = CAPS
function capLabel(key) {
  return CAPS.find((c) => c.key === key)?.label || 'Agent'
}
function capIntro(key) {
  if (key === 'polish') return '语言润色只调整措辞，不改变结论、公式与引用。请先查看差异，再决定是否应用。'
  if (key === 'translate') return '翻译保持数学记号与引用键不变；应用后需要重新编译并核对预览与下载 PDF。'
  return '以下改进均由离线规则生成；每项都先展示差异，点击「应用修改」才会写入工程并触发重新编译。'
}
function onRail(r) {
  railActive.value = r.key
  if (r.key === 'docs') {
    router.push({ path: '/research/read', query: { project: project.value.id } })
    return
  }
  if (r.key === 'notes') {
    const notes = ui.write.notesByProject?.[project.value.id] || []
    pushToast(notes.length ? `写作笔记 ${notes.length} 条：${notes[0].title}` : '还没有写作笔记；在 Agent 结果卡点「加入笔记」')
    return
  }
  if (r.key === 'settings') {
    settingsOpen.value = true
    return
  }
  leftTab.value = 'tree'
}
function resetWrite() {
  const pid = project.value.id
  delete ui.write.filesByProject[pid]
  delete ui.write.activeFileByProject[pid]
  delete ui.write.openFilesByProject[pid]
  delete ui.write.savedAtByProject[pid]
  delete ui.write.dirtyByProject[pid]
  delete ui.write.compileByProject[pid]
  delete ui.write.previewPageByProject[pid]
  if (ui.write.appliedPatchesByProject) delete ui.write.appliedPatchesByProject[pid]
  if (ui.write.notesByProject) delete ui.write.notesByProject[pid]
  if (ui.write.chatByProject) delete ui.write.chatByProject[pid]
  settingsOpen.value = false
  filesForWritingProject(project.value)
  ui.write.activeCapability = 'errors'
  nextTick(() => runCompile('reset'))
  pushToast('写作演示状态已复位为初始工程')
}
function sendComposer() {
  const text = composerText.value.trim()
  if (!text) return
  composerText.value = ''
  const pid = project.value.id
  if (!ui.write.chatByProject) ui.write.chatByProject = {}
  if (!ui.write.chatByProject[pid]) ui.write.chatByProject[pid] = []
  const chat = ui.write.chatByProject[pid]
  chat.push({ role: 'user', text })
  const q = text.toLowerCase()
  if (/错误|编译|error|qedhere|日志/.test(q)) {
    ui.write.activeCapability = 'errors'
    chat.push({ role: 'agent', text: currentError.value ? errorExplain(currentError.value) : '当前没有编译错误；可点击「改进建议」应用一项修改来复现可恢复的错误链路。' })
  } else if (/引用|cite|文献|bib/.test(q)) {
    ui.write.activeCapability = 'citations'
    chat.push({ role: 'agent', text: citationWarning.value ? `发现未定义引用 ${citationWarning.value.key}，建议改为 ${citationWarning.value.suggestion}。` : '当前引用全部可解析，refs.bib 条目均为随包演示材料。' })
  } else if (/公式|latex|对照/.test(q)) {
    ui.write.activeCapability = 'latex'
    chat.push({ role: 'agent', text: latexCompare.value.summary })
  } else if (/润色|翻译|摘要/.test(q)) {
    ui.write.activeCapability = 'suggest'
    chat.push({ role: 'agent', text: '已打开改进建议；摘要润色与翻译均先展示差异，确认后才会应用。' })
  } else {
    chat.push({ role: 'agent', text: '离线演示只处理与当前 LaTeX 工程相关的问题：编译错误、引用补全、公式检查、LaTeX 对照、润色/翻译。' })
  }
}

/* ── toast ── */
function pushToast(text) {
  toastText.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastText.value = ''), 2600)
}
function fixTex(tex) {
  return normalizeTex(tex)
}
function coverMark(p) {
  return p.cover === 'fem' ? '∫' : p.cover === 'condition' ? '√' : '{ }'
}
</script>

<style scoped>
.write {
  height: 100%;
  display: grid;
  grid-template-columns: 18.3% minmax(0, 1fr) 18.8%;
  min-height: 0;
  background: var(--rw-app-bg);
  color: var(--rw-text);
  font-family: var(--rw-font-sans);
}

/* ── 左栏 ── */
.write__left {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--rw-surface);
  border-right: 1px solid var(--rw-border);
}
.wproj {
  height: 56px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border-bottom: 1px solid var(--rw-border);
  background: var(--rw-surface-2);
}
.wproj__cover {
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
}
.wproj__cover--condition {
  background: linear-gradient(135deg, #0ea5e9, #22c55e);
}
.wproj__cover--writing {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
}
.wproj__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.wproj__meta b {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wproj__meta span {
  font-size: 10.5px;
  color: var(--rw-text-3);
}
.wproj__btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  background: var(--rw-surface);
  color: var(--rw-text-2);
  font-size: 12px;
}
.write__leftbody {
  flex: 1;
  min-height: 0;
  display: flex;
}
.rail {
  width: 64px;
  flex: none;
  background: var(--rw-app-bg-alt);
  border-right: 1px solid var(--rw-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 9px 0;
  gap: 3px;
}
.rail__item {
  width: 54px;
  height: 50px;
  border: 0;
  border-radius: 7px;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--rw-text-3);
}
.rail__item:hover {
  background: var(--rw-surface-2);
}
.rail__item.active {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
}
.rail__ico {
  font-size: 17px;
  line-height: 1;
}
.rail__label {
  font-size: 10px;
}
.explorer {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}
.explorer__tabs {
  height: 36px;
  flex: none;
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 0 6px;
  border-bottom: 1px solid var(--rw-border);
}
.explorer__tab {
  border: 0;
  background: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--rw-text-3);
  padding: 0 8px;
  border-bottom: 2px solid transparent;
}
.explorer__tab.active {
  color: var(--rw-primary);
  border-bottom-color: var(--rw-primary);
}
.explorer__acts {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
}
.explorer__acts button {
  border: 0;
  background: none;
  color: var(--rw-text-3);
  font-size: 11px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
}
.explorer__acts button:hover {
  background: var(--rw-surface-2);
}
.tree,
.outline {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 5px;
  scrollbar-width: thin;
}
.tree__group {
  display: contents;
}
.tree__dir {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rw-text-2);
}
.tree__caret {
  font-size: 9px;
  color: var(--rw-text-3);
}
.tree__file {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 27px;
  padding: 0 6px;
  border: 0;
  border-radius: 5px;
  background: none;
  text-align: left;
  font-size: 12.5px;
  color: var(--rw-text);
}
.tree__file--child {
  padding-left: 20px;
}
.tree__file:hover {
  background: var(--rw-surface-2);
}
.tree__file.active {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-weight: 600;
}
.tree__file--asset {
  color: var(--rw-text-2);
}
.tree__ico {
  font-size: 12px;
  line-height: 1;
}
.tree__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree__lock {
  font-size: 9px;
  color: var(--rw-text-3);
}
.outline__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: none;
  text-align: left;
  padding: 5px 6px;
  border-radius: 5px;
  font-size: 12.5px;
  color: var(--rw-text);
}
.outline__item:hover {
  background: var(--rw-surface-2);
}
.outline__item--l1 {
  font-weight: 600;
}
.outline__item--l2 {
  padding-left: 18px;
  font-size: 12px;
  color: var(--rw-text-2);
}
.outline__item--l3 {
  padding-left: 28px;
  font-size: 11.5px;
  color: var(--rw-text-2);
}
.outline__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.outline__file {
  font-size: 9.5px;
  color: var(--rw-text-3);
  font-family: var(--rw-font-mono);
}
.explorer__foot {
  flex: none;
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  border-top: 1px solid var(--rw-border);
  font-size: 10.5px;
  color: var(--rw-text-3);
}
.hint-sm {
  font-size: 11px;
  color: var(--rw-text-3);
  padding: 6px;
  line-height: 1.5;
}

/* ── 中栏 ── */
.write__center {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: 44px minmax(0, 1fr) auto;
  background: var(--rw-page-bg);
}
.compilebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 12px;
  background: var(--rw-surface);
  border-bottom: 1px solid var(--rw-border);
  position: relative;
  z-index: 5;
}
.compilebar__left {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}
.compilebar__label {
  font-size: 11px;
  color: var(--rw-text-3);
}
.compilebar__menu {
  position: absolute;
  top: 34px;
  left: 56px;
  width: 230px;
  background: var(--rw-surface);
  border: 1px solid var(--rw-border);
  border-radius: 8px;
  box-shadow: var(--rw-shadow-pop);
  padding: 4px;
  z-index: 20;
}
.compilebar__menu button {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  padding: 7px 8px;
  border-radius: 5px;
  font-size: 12px;
  color: var(--rw-text-2);
}
.compilebar__menu button.active {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-weight: 600;
}
.compilebar__menu button:disabled {
  color: var(--rw-text-3);
}
.cbtn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  background: var(--rw-surface);
  font-size: 12px;
  color: var(--rw-text-2);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.cbtn:hover {
  border-color: var(--rw-border-strong);
}
.cbtn--primary {
  background: var(--rw-primary);
  border-color: var(--rw-primary);
  color: #fff;
  font-weight: 600;
}
.cbtn--primary:hover {
  background: var(--rw-primary-hover);
}
.cbtn--icon {
  width: 28px;
  padding: 0;
  justify-content: center;
}
.cbtn__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--rw-border-strong);
}
.cbtn__dot.on {
  background: var(--rw-success);
  box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.16);
}
.compilebar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cstatus {
  font-size: 12px;
  color: var(--rw-text-3);
}
.cstatus i {
  font-style: normal;
  color: var(--rw-text-3);
  font-size: 11px;
}
.cstatus--ok {
  color: var(--rw-success);
  font-weight: 600;
}
.cstatus--err {
  color: var(--rw-danger);
  font-weight: 600;
}
.cstatus__ver {
  font-size: 10.5px;
  color: var(--rw-text-3);
  font-family: var(--rw-font-mono);
}
.workarea {
  min-height: 0;
  display: grid;
  grid-template-columns: 56% minmax(0, 1fr);
}
.editorpane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--rw-surface);
  border-right: 1px solid var(--rw-border);
  position: relative;
}
.filetabs {
  height: 36px;
  flex: none;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  padding: 0 8px;
  border-bottom: 1px solid var(--rw-border);
  position: relative;
}
.filetab {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 29px;
  padding: 0 9px;
  border: 1px solid var(--rw-border);
  border-bottom: 0;
  border-radius: 6px 6px 0 0;
  background: var(--rw-surface-2);
  font-size: 12px;
  color: var(--rw-text-2);
}
.filetab.active {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-weight: 600;
}
.filetab__x {
  font-size: 12px;
  color: var(--rw-text-3);
}
.filetabs__add {
  width: 22px;
  height: 24px;
  border: 0;
  background: none;
  color: var(--rw-text-3);
  font-size: 13px;
  margin-bottom: 3px;
}
.filetabs__spacer {
  flex: 1;
}
.savestate {
  font-size: 10.5px;
  color: var(--rw-success);
  margin-bottom: 7px;
}
.savestate.dirty {
  color: var(--rw-warning);
}
.sbtn {
  height: 24px;
  padding: 0 9px;
  margin-bottom: 5px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  background: var(--rw-surface);
  font-size: 11.5px;
  color: var(--rw-text-2);
}
.sbtn:hover {
  border-color: var(--rw-primary);
  color: var(--rw-primary);
}
.filepicker {
  position: absolute;
  top: 32px;
  left: 70px;
  width: 210px;
  background: var(--rw-surface);
  border: 1px solid var(--rw-border);
  border-radius: 8px;
  box-shadow: var(--rw-shadow-pop);
  padding: 4px;
  z-index: 20;
}
.filepicker button {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  padding: 6px 8px;
  border-radius: 5px;
  font-size: 11.5px;
  font-family: var(--rw-font-mono);
  color: var(--rw-text-2);
}
.filepicker button:hover {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
}
.formatbar {
  height: 34px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  border-bottom: 1px solid var(--rw-border);
  background: var(--rw-surface-2);
}
.fbtn {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--rw-text-2);
  font-size: 12px;
  display: grid;
  place-items: center;
}
.fbtn:hover:not(:disabled) {
  background: var(--rw-surface);
}
.fbtn:disabled {
  color: var(--rw-border-strong);
}
.fbar__sep {
  width: 1px;
  height: 14px;
  background: var(--rw-border);
  margin: 0 4px;
}
.fbar__spacer {
  flex: 1;
}
.fbar__toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: var(--rw-text-2);
}
.fbar__pos {
  font-size: 10px;
  font-family: var(--rw-font-mono);
  color: var(--rw-text-3);
  min-width: 40px;
  text-align: right;
}
.editorfind {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--rw-border);
  background: var(--rw-surface-2);
}
.editorfind input {
  width: 200px;
  height: 24px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  padding: 0 7px;
  font-size: 11.5px;
}
.assetview {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 30px;
  color: var(--rw-text-2);
}
.assetview__ico {
  font-size: 30px;
}
.assetview b {
  color: var(--rw-text);
  font-family: var(--rw-font-mono);
  font-size: 13px;
}
.assetview p {
  max-width: 320px;
  font-size: 12px;
  line-height: 1.7;
}
.previewpane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--rw-page-bg);
}
.pvbar {
  height: 34px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 8px;
  background: var(--rw-surface);
  border-bottom: 1px solid var(--rw-border);
}
.pvpage {
  width: 30px;
  height: 23px;
  border: 1px solid var(--rw-border);
  border-radius: 4px;
  text-align: center;
  font-size: 11.5px;
}
.pvtotal {
  font-size: 11.5px;
  color: var(--rw-text-2);
}
.pvzoom {
  font-size: 11px;
  color: var(--rw-text-2);
  min-width: 30px;
  text-align: center;
}
.preview-banner {
  flex: none;
  padding: 6px 10px;
  font-size: 11px;
  line-height: 1.5;
}
.preview-banner--err {
  background: var(--rw-danger-soft);
  color: var(--rw-danger);
  border-bottom: 1px solid var(--rw-border);
}
.pvscroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 14px 12px 24px;
  scrollbar-width: thin;
}
.pvpaper {
  width: 100%;
  max-width: 400px;
  background: var(--rw-surface);
  border: 1px solid var(--rw-border);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
  padding: 24px 26px 20px;
  min-height: 520px;
  font-size: 10.5px;
}
.pvpaper__meta {
  display: flex;
  justify-content: space-between;
  font-size: 8.5px;
  color: var(--rw-text-3);
  border-bottom: 1px solid var(--rw-border);
  padding-bottom: 6px;
  margin-bottom: 14px;
}
.pvpaper__title {
  margin: 0 0 5px;
  font-size: 16px;
  line-height: 1.4;
  text-align: center;
  font-weight: 700;
}
.pvpaper__sub {
  text-align: center;
  font-size: 9px;
  color: var(--rw-text-2);
}
.pvpaper__rule {
  height: 1px;
  background: var(--rw-border);
  margin: 10px 0 6px;
}
.pv-h1 {
  font-size: 13px;
  margin: 14px 0 5px;
  font-weight: 700;
}
.pv-h2 {
  font-size: 11.5px;
  margin: 11px 0 4px;
  font-weight: 700;
}
.pv-h3 {
  font-size: 10.5px;
  margin: 9px 0 3px;
  color: var(--rw-primary);
  font-weight: 700;
}
.pv-p {
  margin: 5px 0;
  font-size: 10px;
  line-height: 1.85;
  text-align: justify;
}
.pv-formula {
  position: relative;
  margin: 8px 0;
  padding: 6px 24px 6px 10px;
  background: var(--rw-inset);
  border-radius: 4px;
  font-size: 10px;
  overflow-x: auto;
}
.pv-formula__num {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8.5px;
  color: var(--rw-text-3);
}
.pv-list {
  margin: 5px 0 5px 16px;
  padding: 0;
  font-size: 10px;
  line-height: 1.8;
}
.pv-list--ol {
  list-style: decimal;
}
.pv-quote {
  margin: 7px 0;
  padding: 5px 9px;
  border-left: 2px solid var(--rw-primary);
  background: var(--rw-primary-softer);
  font-size: 9.5px;
  color: var(--rw-text-2);
}
.pv-box {
  margin: 7px 0;
  padding: 6px 9px;
  border: 1px solid var(--rw-border);
  border-radius: 4px;
  font-size: 10px;
  line-height: 1.8;
}
.pv-box b {
  display: block;
  font-size: 10px;
  margin-bottom: 2px;
}
.pvpaper__foot {
  margin-top: 16px;
  padding-top: 6px;
  border-top: 1px solid var(--rw-border);
  font-size: 8px;
  color: var(--rw-text-3);
  text-align: center;
}
.pvempty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 20px;
  text-align: center;
  color: var(--rw-text-2);
}
.pvempty__ico {
  font-size: 30px;
}
.pvempty b {
  color: var(--rw-text);
  font-size: 13px;
}
.pvempty p {
  font-size: 11.5px;
  line-height: 1.7;
  max-width: 260px;
}

/* ── 编译日志 ── */
.logpane {
  height: 164px;
  flex: none;
  display: flex;
  flex-direction: column;
  background: var(--rw-surface);
  border-top: 1px solid var(--rw-border);
  min-height: 0;
}
.logpane__head {
  height: 32px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-bottom: 1px solid var(--rw-border);
}
.logtab {
  height: 30px;
  border: 0;
  background: none;
  font-size: 11.5px;
  color: var(--rw-text-2);
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  border-bottom: 2px solid transparent;
}
.logtab.active {
  color: var(--rw-primary);
  font-weight: 600;
  border-bottom-color: var(--rw-primary);
}
.logtab__n {
  font-size: 10px;
  color: var(--rw-text-3);
}
.pill {
  height: 16px;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}
.pill--danger {
  background: var(--rw-danger-soft);
  color: var(--rw-danger);
}
.pill--warn {
  background: var(--rw-warning-soft);
  color: var(--rw-warning);
}
.pill--info {
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
}
.pill--success {
  background: var(--rw-success-soft);
  color: var(--rw-success);
}
.logpane__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 8px 8px;
  scrollbar-width: thin;
}
.logline {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: var(--rw-font-mono);
  font-size: 11.5px;
  line-height: 1.55;
}
.logline--clickable:hover {
  background: var(--rw-surface-2);
}
.logline__time {
  flex: none;
  color: var(--rw-text-3);
  font-size: 10.5px;
}
.logline__msg {
  flex: 1;
  min-width: 0;
  color: var(--rw-text-2);
  text-align: left;
  word-break: break-word;
}
.logline--error .logline__msg {
  color: var(--rw-danger);
}
.logline--warning .logline__msg {
  color: var(--rw-warning);
}
.logline--success .logline__msg {
  color: var(--rw-success);
}
.logline--info .logline__msg {
  color: var(--rw-text-2);
}
.logline__loc {
  flex: none;
  font-size: 10px;
  color: var(--rw-primary);
}
.logempty {
  padding: 16px;
  font-size: 11.5px;
  color: var(--rw-text-3);
  text-align: center;
}

/* ── 右栏 Agent ── */
.write__agent {
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--rw-border);
  background: var(--rw-surface);
  display: flex;
}
.agent {
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.agent__head {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 12px;
  background: var(--rw-primary-softer);
  border-bottom: 1px solid var(--rw-border);
}
.agent__logo {
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  background: radial-gradient(circle at 30% 25%, #8b5cf6, var(--rw-agent-logo));
}
.agent__id {
  flex: 1;
  min-width: 0;
}
.agent__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--rw-agent-name);
}
.agent__sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--rw-agent-sub);
}
.agent__more {
  width: 24px;
  height: 24px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  background: var(--rw-surface);
  color: var(--rw-text-2);
}
.agent__help {
  flex: none;
  padding: 7px 12px;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--rw-text-2);
  background: var(--rw-warning-soft);
  border-bottom: 1px solid var(--rw-border);
}
.ctx {
  flex: none;
  padding: 9px 12px 8px;
  border-bottom: 1px solid var(--rw-border);
}
.ctx__head {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
}
.ctx__lock {
  color: var(--rw-primary);
}
.ctx__title {
  font-weight: 600;
  color: var(--rw-primary);
}
.ctx__note {
  font-size: 10px;
  color: var(--rw-text-3);
}
.ctx__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.chip {
  height: 22px;
  padding: 0 7px;
  border: 0;
  border-radius: 5px;
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-size: 10.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.agent__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 11px 14px;
  scrollbar-width: thin;
}
.capchips {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 7px 11px;
  border-bottom: 1px solid var(--rw-border);
}
.capchip {
  height: 22px;
  padding: 0 7px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  background: var(--rw-surface);
  font-size: 10px;
  color: var(--rw-text-2);
  white-space: nowrap;
}
.capchip:hover {
  border-color: var(--rw-border-strong);
}
.capchip.active {
  background: var(--rw-primary-soft);
  border-color: var(--rw-primary);
  color: var(--rw-primary);
  font-weight: 600;
}
.cardwrap {
  display: flex;
  flex-direction: column;
}
.result {
  border: 1px solid var(--rw-border);
  border-radius: 9px;
  background: var(--rw-surface);
  box-shadow: var(--rw-shadow-card);
  padding: 11px;
}
.result__status {
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-ico {
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 50%;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.status-ico--danger {
  background: var(--rw-danger);
}
.status-ico--success {
  background: var(--rw-success);
}
.status-ico--warn {
  background: var(--rw-warning);
}
.status-ico--info {
  background: var(--rw-primary);
}
.result__cap {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--rw-text);
  line-height: 1.4;
}
.result__cap--danger {
  color: var(--rw-danger);
}
.result__status .pill {
  margin-left: auto;
}
.result__summary {
  margin: 7px 0 9px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--rw-text-2);
}
.result__judgment {
  margin: 7px 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--rw-text);
  font-weight: 500;
}
.result__note {
  margin: 6px 0 0;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--rw-text-2);
}
.inset {
  margin: 8px 0;
  padding: 8px 9px;
  background: var(--rw-inset);
  border-radius: 7px;
}
.inset__title {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 4px;
}
.inset__p {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.65;
  color: var(--rw-text-2);
}
.inset__list {
  margin: 0 0 0 15px;
  padding: 0;
  font-size: 11px;
  line-height: 1.75;
  color: var(--rw-text);
}
.code {
  font-family: var(--rw-font-mono);
  font-size: 10.5px;
  background: var(--rw-surface);
  border: 1px solid var(--rw-border);
  border-radius: 3px;
  padding: 0 3px;
}
.locrow {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: 0;
  background: none;
  text-align: left;
  font-size: 11px;
  color: var(--rw-text-2);
  padding: 2px 0;
}
.locrow:hover {
  color: var(--rw-primary);
}
.locrow__line {
  color: var(--rw-primary);
  font-family: var(--rw-font-mono);
}
.diff {
  margin: 5px 0;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  overflow: hidden;
  font-family: var(--rw-font-mono);
  font-size: 10.5px;
}
.diff__row {
  padding: 4px 7px;
  line-height: 1.55;
  word-break: break-all;
}
.diff__row--del {
  background: var(--rw-danger-soft);
  color: var(--rw-danger);
}
.diff__row--add {
  background: var(--rw-success-soft);
  color: var(--rw-success);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.btn {
  height: 27px;
  padding: 0 9px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  background: var(--rw-surface);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--rw-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn:hover:not(:disabled) {
  border-color: var(--rw-border-strong);
}
.btn:disabled {
  opacity: 0.55;
}
.btn--primary {
  background: var(--rw-primary);
  border-color: var(--rw-primary);
  color: #fff;
  font-weight: 600;
}
.btn--primary:hover:not(:disabled) {
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
  height: 23px;
  padding: 0 7px;
  font-size: 10.5px;
}
.patchlist {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 7px 0;
}
.patchitem {
  display: flex;
  flex-direction: column;
  gap: 1px;
  border: 1px solid var(--rw-border);
  border-radius: 6px;
  background: var(--rw-surface);
  padding: 6px 8px;
  text-align: left;
}
.patchitem:hover {
  border-color: var(--rw-border-strong);
}
.patchitem.active {
  border-color: var(--rw-primary);
  background: var(--rw-primary-softer);
}
.patchitem b {
  font-size: 11.5px;
  color: var(--rw-text);
}
.patchitem small {
  font-size: 10px;
  color: var(--rw-text-3);
}
.fc__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0;
}
.fc__tab {
  height: 23px;
  padding: 0 7px;
  border: 1px solid var(--rw-border);
  border-radius: 5px;
  background: var(--rw-surface);
  font-size: 10.5px;
  color: var(--rw-text-2);
}
.fc__tab.active {
  border-color: var(--rw-primary);
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-weight: 600;
}
.offline-note {
  margin-top: 7px;
  padding: 5px 7px;
  border-radius: 5px;
  background: var(--rw-warning-soft);
  color: var(--rw-warning);
  font-size: 9.5px;
  line-height: 1.5;
}
.agent-empty {
  align-items: center;
  padding-top: 12px;
}
.agent-empty__logo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 21px;
  font-weight: 700;
  background: radial-gradient(circle at 30% 25%, #8b5cf6, var(--rw-agent-logo));
}
.agent-empty__title {
  margin-top: 9px;
  font-size: 15px;
  font-weight: 700;
}
.agent-empty__text {
  margin: 5px 0 11px;
  font-size: 11px;
  line-height: 1.65;
  color: var(--rw-text-2);
  text-align: center;
}
.entry {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--rw-border);
  border-radius: 7px;
  background: var(--rw-surface);
  padding: 7px 8px;
  margin-bottom: 5px;
  text-align: left;
}
.entry:hover {
  background: var(--rw-surface-2);
  border-color: var(--rw-border-strong);
}
.entry__ico {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 6px;
  background: var(--rw-primary-soft);
  color: var(--rw-primary);
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.entry__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.entry__meta b {
  font-size: 11.5px;
  color: var(--rw-text);
}
.entry__meta small {
  font-size: 9.5px;
  color: var(--rw-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.entry__arrow {
  color: var(--rw-text-3);
  font-size: 10px;
}
.chatlog {
  border-top: 1px solid var(--rw-border);
  margin-top: 9px;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.chatmsg {
  font-size: 11px;
  line-height: 1.6;
}
.chatmsg__who {
  font-size: 10px;
  color: var(--rw-text-3);
  margin-bottom: 1px;
}
.chatmsg--user .chatmsg__text {
  background: var(--rw-primary-soft);
  border-radius: 7px;
  padding: 5px 8px;
  display: inline-block;
}
.chatmsg--agent .chatmsg__text {
  color: var(--rw-text-2);
}
.composer {
  flex: none;
  border-top: 1px solid var(--rw-border);
  padding: 9px 10px 11px;
}
.composer__input {
  width: 100%;
  resize: none;
  border: 1px solid var(--rw-border);
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 11.5px;
  font-family: var(--rw-font-sans);
  color: var(--rw-text);
  line-height: 1.55;
  outline: none;
}
.composer__input:focus {
  border-color: var(--rw-primary);
}
.composer__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
}
.composer__ico {
  color: var(--rw-text-3);
  font-size: 12px;
}
.composer__hint {
  flex: 1;
  text-align: right;
  font-size: 9.5px;
  color: var(--rw-text-3);
}
.composer__send {
  width: 27px;
  height: 27px;
  border: 0;
  border-radius: 50%;
  background: var(--rw-primary);
  color: #fff;
  font-size: 11px;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  background: #111827;
  color: #f9fafb;
  font-size: 12px;
  padding: 8px 15px;
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.3);
  z-index: 90;
  white-space: nowrap;
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
  display: grid;
  place-items: center;
  z-index: 85;
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
  margin-bottom: 10px;
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
.settingrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--rw-border);
  font-size: 12.5px;
  color: var(--rw-text-2);
}
.settingrow b {
  color: var(--rw-text);
  font-size: 12px;
}
.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

@media (max-width: 1500px) {
  .write {
    grid-template-columns: 19% minmax(0, 1fr) 19.5%;
  }
  .workarea {
    grid-template-columns: 58% minmax(0, 1fr);
  }
}
@media (max-width: 1280px) {
  .write {
    grid-template-columns: 250px minmax(0, 1fr) 300px;
  }
  .logpane {
    height: 140px;
  }
}
</style>
