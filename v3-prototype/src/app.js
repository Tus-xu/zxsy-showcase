/**
 * 提示由「跨越变号」触发，而不是要求精确落在 f′(x)=0 上：
 * 拖动时上一刻斜率为正、这一刻为负，说明学生真的划过了变号点。
 */
function maybeNote(prevK, nextK) {
  const c = S.canvas;
  if (c.fn === 'ext' && !c.notedSign && prevK > 0 && nextK < 0) {
    c.notedSign = true;
    S.pendingScroll = true;
    pushAI([
      { t: 'p', html: `就是这里：斜率从正变到负，切线在变平的那一瞬间翻了方向 —— 所以 ${M('x = −1')} 是<strong>局部极大</strong>。` },
      { t: 'p', html: `那「切线水平」本身就够了吗？切到 ${M('f(x) = x³')} 看看。` },
      { t: 'actions', items: [{ id: 'fn-cube', label: '切换到 f(x) = x³', kind: 'primary' }] },
    ]);
    refreshThread();
    return;
  }
  if (c.fn === 'cube' && !c.notedCube && Math.abs(nextK) < 0.35 && Math.abs(nextK) < Math.abs(prevK)) {
    c.notedCube = true;
    S.pendingScroll = true;
    pushAI([
      { t: 'p', html: `这里切线也水平，但两侧斜率都为正，曲线一直在上升 —— <strong>它不是极值点</strong>。所以「切线水平只是候选，变号才是判据」。` },
      { t: 'actions', items: [{ id: 'to-practice', label: '自己解一道', kind: 'primary' }] },
    ]);
    refreshThread();
  }
}

/* ==========================================================================
   智学数研 · 学生端 V3 原型 · 交互
   说明：本原型不连接大模型。教学对话是按「一个真实错因」编排的确定性脚本，
        图形与数值全部本地实时计算；学生的操作真的会改变 AI 的下一句话。
   ========================================================================== */
'use strict';

/* ─────────────────────────── 工具 ─────────────────────────── */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 数学排版：变量用衬线斜体，运算符用真减号 */
const mi = (s) => `<i>${s}</i>`;
const M = (s) => `<span class="m">${s}</span>`;

/* ─────────────────────────── 函数与绘图 ─────────────────────────── */

const FN = {
  ext: {
    key: 'ext',
    label: 'f(x) = x³ − 3x',
    f: (x) => x ** 3 - 3 * x,
    fp: (x) => 3 * x * x - 3,
    ys: 17,          // 每单位 y 的像素
    yStep: 2,
    marks: [{ x: -1, kind: 'max' }, { x: 1, kind: 'min' }],
  },
  cube: {
    key: 'cube',
    label: 'f(x) = x³',
    f: (x) => x ** 3,
    fp: (x) => 3 * x * x,
    ys: 9,
    yStep: 4,
    marks: [{ x: 0, kind: 'flat' }],
  },
};

const PLOT = { w: 720, h: 420, cx: 360, cy: 210, xs: 118, pad: 26 };

const px = (x) => PLOT.cx + PLOT.xs * x;
const py = (y, cfg) => PLOT.cy - cfg.ys * y;

function fmt(v, d = 2) {
  const r = Math.round(v * 10 ** d) / 10 ** d;
  if (Object.is(r, -0) || r === 0) return '0';
  return String(r).replace('-', '−');
}

/** 曲线图的内部标记（更新时只替换这里，不重建 svg 元素） */
function plotInner(cfgKey, x, opt = {}) {
  const cfg = FN[cfgKey];
  const showTangent = opt.showTangent !== false;
  const y = cfg.f(x);
  const k = cfg.fp(x);
  const yMax = Math.floor((PLOT.h / 2 - PLOT.pad) / cfg.ys);
  const xMinV = -2.6;
  const xMaxV = 2.6;
  const out = [];

  out.push(`<defs><clipPath id="clip-${cfg.key}"><rect x="${PLOT.pad}" y="${PLOT.pad}" width="${PLOT.w - PLOT.pad * 2}" height="${PLOT.h - PLOT.pad * 2}"/></clipPath></defs>`);

  // 网格
  for (let gx = -3; gx <= 3; gx++) {
    const X = px(gx);
    if (X < PLOT.pad || X > PLOT.w - PLOT.pad) continue;
    out.push(`<line x1="${X}" y1="${PLOT.pad}" x2="${X}" y2="${PLOT.h - PLOT.pad}" stroke="#eeecf6" stroke-width="1"/>`);
    if (gx !== 0) out.push(`<text x="${X}" y="${PLOT.cy + 16}" text-anchor="middle" font-size="11.5" fill="#a4a2b8">${gx}</text>`);
  }
  for (let gy = -yMax; gy <= yMax; gy += cfg.yStep) {
    const Y = py(gy, cfg);
    if (Y < PLOT.pad || Y > PLOT.h - PLOT.pad) continue;
    out.push(`<line x1="${PLOT.pad}" y1="${Y}" x2="${PLOT.w - PLOT.pad}" y2="${Y}" stroke="#f4f2fb" stroke-width="1"/>`);
    if (gy !== 0) out.push(`<text x="${PLOT.cx - 9}" y="${Y + 4}" text-anchor="end" font-size="11.5" fill="#a4a2b8">${gy}</text>`);
  }

  // 坐标轴
  out.push(`<line x1="${PLOT.pad}" y1="${PLOT.cy}" x2="${PLOT.w - PLOT.pad}" y2="${PLOT.cy}" stroke="#c9c6d8" stroke-width="1.2"/>`);
  out.push(`<line x1="${PLOT.cx}" y1="${PLOT.pad}" x2="${PLOT.cx}" y2="${PLOT.h - PLOT.pad}" stroke="#c9c6d8" stroke-width="1.2"/>`);
  out.push(`<text x="${PLOT.w - PLOT.pad - 4}" y="${PLOT.cy - 9}" font-size="12" fill="#a4a2b8">x</text>`);
  out.push(`<text x="${PLOT.cx + 9}" y="${PLOT.pad + 12}" font-size="12" fill="#a4a2b8">y</text>`);

  // 曲线（400 段折线，遇到非有限值断开）
  out.push(`<g clip-path="url(#clip-${cfg.key})">`);
  let d = '';
  let pen = false;
  for (let i = 0; i <= 400; i++) {
    const u = xMinV + (i * (xMaxV - xMinV)) / 400;
    const v = cfg.f(u);
    if (!Number.isFinite(v)) { pen = false; continue; }
    const X = px(u);
    const Y = py(v, cfg);
    d += (pen ? 'L' : 'M') + X.toFixed(1) + ' ' + Y.toFixed(1) + ' ';
    pen = true;
  }
  out.push(`<path d="${d}" fill="none" stroke="#5a49d1" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`);

  // 候选点（静态标注）
  for (const mk of cfg.marks) {
    const Y = py(cfg.f(mk.x), cfg);
    if (Y < PLOT.pad || Y > PLOT.h - PLOT.pad) continue;
    out.push(`<circle cx="${px(mk.x)}" cy="${Y}" r="4.5" fill="#fff" stroke="#8f86e0" stroke-width="2"/>`);
  }

  // 切线
  if (showTangent) {
    const x1 = xMinV;
    const x2 = xMaxV;
    out.push(`<line x1="${px(x1)}" y1="${py(y + k * (x1 - x), cfg)}" x2="${px(x2)}" y2="${py(y + k * (x2 - x), cfg)}" stroke="#c9843a" stroke-width="2.2" opacity="0.9"/>`);
  }

  // 切点竖线与切点
  out.push(`<line x1="${px(x)}" y1="${py(y, cfg)}" x2="${px(x)}" y2="${PLOT.cy}" stroke="#b9b4cc" stroke-width="1.2" stroke-dasharray="4 4"/>`);
  out.push(`<circle cx="${px(x)}" cy="${py(y, cfg)}" r="7" fill="#c9843a" stroke="#fff" stroke-width="2.4"/>`);
  out.push('</g>');

  return out.join('');
}

/** 曲线图外壳 */
function plotSVG(cfgKey, x, opt = {}) {
  const cfg = FN[cfgKey];
  return `<svg viewBox="0 0 ${PLOT.w} ${PLOT.h}" role="img" aria-label="函数曲线与切线，当前切点 x = ${fmt(x)}" data-plot="${cfg.key}">${plotInner(cfgKey, x, opt)}</svg>`;
}

/** 对话里用的小图：对比「有变号 / 无变号」 */
function miniSVG(kind) {
  const cfg = FN.ext;
  const w = 320;
  const h = 176;
  const cx = w / 2;
  const cy = h / 2;
  const xs = 44;
  const ys = kind === 'cube' ? 5.5 : 10;
  const c = kind === 'cube' ? FN.cube : FN.ext;
  const X = (u) => cx + xs * u;
  const Y = (v) => cy - ys * v;
  const parts = [];
  parts.push(`<line x1="14" y1="${cy}" x2="${w - 14}" y2="${cy}" stroke="#d9d6e6" stroke-width="1"/>`);
  parts.push(`<line x1="${cx}" y1="14" x2="${cx}" y2="${h - 14}" stroke="#d9d6e6" stroke-width="1"/>`);
  for (let gx = -3; gx <= 3; gx++) parts.push(`<line x1="${X(gx)}" y1="14" x2="${X(gx)}" y2="${h - 14}" stroke="#f4f2fb" stroke-width="1"/>`);
  let d = '';
  for (let i = 0; i <= 160; i++) {
    const u = -2.9 + (i * 5.8) / 160;
    d += (i ? 'L' : 'M') + X(u).toFixed(1) + ' ' + Y(c.f(u)).toFixed(1) + ' ';
  }
  parts.push(`<path d="${d}" fill="none" stroke="#5a49d1" stroke-width="2.6" stroke-linecap="round"/>`);
  // 切点位置：有极值取 -1，无变号取 0
  const tx = kind === 'cube' ? 0 : -1;
  parts.push(`<line x1="${X(-2.9)}" y1="${Y(c.f(tx))}" x2="${X(2.9)}" y2="${Y(c.f(tx))}" stroke="#c9843a" stroke-width="1.8" opacity=".9"/>`);
  parts.push(`<circle cx="${X(tx)}" cy="${Y(c.f(tx))}" r="4.5" fill="#c9843a" stroke="#fff" stroke-width="2"/>`);
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${kind === 'cube' ? 'x³ 在原点切线水平但无变号' : 'x³−3x 在 −1 处切线水平且变号'}">${parts.join('')}</svg>`;
}

/* ─────────────────────────── 状态 ─────────────────────────── */

const S = {
  view: 'chat',
  thread: [],
  probe: { left: null, right: null, sent: false, ok: false, tries: 0 },
  canvas: { fn: 'ext', x: -1, sawZero: false, switched: false, notedSign: false, notedCube: false },
  practice: { draft: '', hint: 0, submitted: false, goals: [false, false, false], reasons: ['', '', ''] },
  summary: null,
  chatStage: 'opening', // opening → probed → canvas → practice → done
};

const ME = 'me';

function pushMe(text, attach) {
  S.thread.push({ who: ME, text, attach });
}

function pushAI(blocks) {
  S.thread.push({ who: 'ai', blocks });
}

/* ─────────────────────────── 对话脚本 ─────────────────────────── */

const PROBLEM_BLOCK = () => `
  <div class="problem">
    <div class="problem-head">
      <span class="problem-tag">原题</span>
      <span class="problem-src">来自你的拍照 · 已识别</span>
    </div>
    ${problemSheetSVG()}
    <p class="problem-text" style="margin-top:14px">
      选项　A. −1　　B. 1　　C. 2　　D. −2
    </p>
    <div class="ocr-note">
      <span>识别有误？</span>
      <button class="link-btn" data-act="fix-ocr">手动修正题干</button>
    </div>
  </div>`;

/** 题图：本地排版的题面。按显示宽度 1:1 设计，保证放大后仍清晰 */
function problemSheetSVG() {
  return `<svg class="problem-img" viewBox="0 0 720 300" role="img" aria-label="题图：已知 g(x)=2x³−3x²−12x+1，求局部极小值">
    <rect x="0.5" y="0.5" width="719" height="299" rx="12" fill="#fcfcfe" stroke="#eeecf6"/>
    <rect x="30" y="26" width="34" height="34" rx="9" fill="#5a49d1"/>
    <text x="47" y="48" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" font-family="system-ui">1</text>
    <text x="78" y="38" font-size="11" fill="#a4a2b8" letter-spacing="1.3">函数与导数 · 极值判断</text>
    <text x="78" y="58" font-size="14" font-weight="600" fill="#1b1a29">三次函数极值 · 练习</text>
    <text x="690" y="46" text-anchor="end" font-size="11" fill="#a4a2b8">自编题面</text>
    <line x1="30" y1="82" x2="690" y2="82" stroke="#eeecf6"/>

    <text x="30" y="122" font-size="17" fill="#1b1a29" font-family="Cambria Math, Cambria, 'Times New Roman', serif">已知 g(x) = 2x³ − 3x² − 12x + 1。</text>
    <text x="30" y="156" font-size="17" fill="#1b1a29" font-family="Cambria Math, Cambria, 'Times New Roman', serif">则 g(x) 取得局部极小值的 x 是（　　）</text>
    <text x="30" y="194" font-size="13" fill="#75738c">（先求 g′(x)，再判断导数在候选点附近是否变号。）</text>

    <text x="30" y="272" font-size="10.5" fill="#a4a2b8">自编题图 · 本地演示素材</text>
    <text x="690" y="272" text-anchor="end" font-size="10.5" fill="#a4a2b8">离线原型 · 无外网请求</text>
  </svg>`;
}

function startOpening() {
  S.thread = [];
  pushMe(
    '老师布置的题，我拍下来了。我算了一下选 A：x = −1 让导数等于零，所以这里应该是极小值吧？',
    '题图 · 三次函数极值.png',
  );
  pushAI([
    { t: 'h2', html: '你找到了候选点，卡在极值类型的判断' },
    { t: 'problem' },
    { t: 'p', html: `你算出的 ${M('x = −1')} 确实让导数为零，这一步没问题。但<strong>导数等于零只说明这一点的切线是水平的</strong>；它是极大、极小还是都不是，要看曲线经过这个点时先升后降，还是先降后升。` },
    { t: 'math', html: `g(x) = 2x³ − 3x² − 12x + 1<br>g′(x) = 6(x + 1)(x − 2)` },
    { t: 'p', html: `把导数写成两个因子相乘，符号就看得见了。试着判断：${M('x = −1')} 的<strong>左侧</strong>和<strong>右侧</strong>，导数分别是正还是负？` },
    { t: 'probe' },
  ]);
  S.chatStage = 'opening';
  S.pendingScroll = false;
}

function onProbeSubmit() {
  const { left, right } = S.probe;
  if (left === null || right === null) return;
  S.probe.sent = true;
  const ok = left === '+' && right === '-';
  S.probe.ok = ok;
  if (!ok) {
    S.probe.tries += 1;
    return; // 保留原卡片，就地给反馈（不重绘整段）
  }
  S.chatStage = 'probed';
  S.pendingScroll = true;
  pushAI([
    { t: 'p', html: `对。左侧为正、右侧为负，说明曲线在这里先上升后下降 —— 这是<strong>局部极大</strong>，和你选的 A 正好相反。` },
    { t: 'p', html: `那 ${M('x = 2')} 呢？它在符号表上是「左负右正」。光看符号还是有点抽象，我们把切线放到曲线上拖着看。` },
    { t: 'figs', which: 'contrast' },
    { t: 'actions', items: [{ id: 'open-canvas', label: '打开数学画布', kind: 'primary' }] },
  ]);
}

function probeVerdictHTML() {
  const { left, right, sent, ok, tries } = S.probe;
  if (!sent) return '';
  if (ok) {
    return `<div class="verdict good"><span class="tag">✓</span><div>左侧为正、右侧为负 —— 这一段的走向已经判断对了。往下看。</div></div>`;
  }
  const hint =
    tries >= 2
      ? `还是不行的话，直接代一个数：${M('g′(−2) = 6(−1)(−4) = 24 > 0')}，${M('g′(0) = 6(1)(−2) = −12 < 0')}。`
      : `先别猜类型。把 ${M('x = −2')} 和 ${M('x = 0')} 分别代进 ${M('6(x + 1)(x − 2)')}，看两个因子各自的正负。`;
  return `<div class="verdict miss"><span class="tag">↺</span><div>再试一次：左边和右边要分开判断，符号只看两个因子的乘积。${hint}</div></div>`;
}

function renderProbe() {
  const { left, right, sent, ok } = S.probe;
  const btn = (side, sign) => {
    const on = S.probe[side] === sign ? ' on' : '';
    const dis = sent && ok ? ' disabled' : '';
    return `<button class="sign${on}"${dis} data-act="sign" data-side="${side}" data-sign="${sign}" aria-pressed="${S.probe[side] === sign}">${sign === '+' ? '+' : '−'}</button>`;
  };
  return `<div class="probe">
    <div class="probe-cap">导数在 ${M('x = −1')} 两侧的符号</div>
    <div class="slots">
      <div class="slot">
        <span class="slot-label">左侧</span>
        <span class="sign-pick">${btn('left', '+')}${btn('left', '-')}</span>
      </div>
      <div class="slot">
        <span class="slot-label">右侧</span>
        <span class="sign-pick">${btn('right', '+')}${btn('right', '-')}</span>
      </div>
    </div>
    <div class="probe-foot">
      <button class="btn ${sent && ok ? '' : 'primary'}" data-act="probe-submit"${sent && ok ? ' disabled' : ''}>${sent && ok ? '✓ 已判断' : '提交判断'}</button>
      <span style="font-size:12.5px;color:var(--ink-4)">用符号表回答，不用打字</span>
    </div>
    ${probeVerdictHTML()}
  </div>`;
}

const FIGS_CONTRAST = () => `
  <div class="figrow">
    <figure class="figcard" style="margin:0">
      ${miniSVG('cube')}
      <figcaption class="figcap">${M('f(x) = x³')}：切线水平，但两侧同号 —— <strong>无极值</strong></figcaption>
    </figure>
    <figure class="figcard" style="margin:0">
      ${miniSVG('ext')}
      <figcaption class="figcap">${M('f(x) = x³ − 3x')}：切线水平，且两侧变号 —— <strong>有极值</strong></figcaption>
    </figure>
  </div>`;

/* ─────────────────────────── 画布（形态 B） ─────────────────────────── */

function canvasComment() {
  const { fn, x } = S.canvas;
  const cfg = FN[fn];
  const k = cfg.fp(x);
  if (Math.abs(k) < 0.16) {
    if (fn === 'cube') return '斜率刚好到 0，切线水平。但往左往右看，斜率都是正的 —— 曲线一直上升，所以这里不是极值点。';
    return `斜率刚好到 0。往左一点是正的，往右一点是负的 —— 这一瞬间就是变号，所以 ${M('x = −1')} 是局部极大。`;
  }
  if (fn === 'cube') return '不管切点在哪，斜率都不会是负的。这条曲线始终上升，只在原点短暂变平。';
  if (x < -1) return '斜率是正的，曲线正在上升。继续往右拖，注意斜率的符号什么时候换。';
  if (x < 1) return '斜率变负了，曲线开始下降。这里就是刚才符号表里「中间一段为负」的部分。';
  return '过了 1 之后斜率又变正，曲线重新上升。两个候选点，两种变号方向。';
}

function renderWorkbench() {
  const c = S.canvas;
  const cfg = FN[c.fn];
  const y = cfg.f(c.x);
  const k = cfg.fp(c.x);
  const state =
    Math.abs(k) < 0.16
      ? c.fn === 'cube'
        ? '平稳拐点'
        : c.x < 0
          ? '局部极大'
          : '局部极小'
      : k > 0
        ? '递增'
        : '递减';
  const cls = Math.abs(k) < 0.16 ? 'zero' : k > 0 ? 'pos' : 'neg';

  const threadHTML = renderThread({ compact: true });

  return `<div class="workbench">
    <div class="wb-chat">
      <div class="wb-chat-body" id="wb-scroll">${threadHTML}</div>
      <div class="composer" style="padding:12px 20px 16px">
        <div class="composer-inner">
          <div class="composer-box">
            <textarea id="wb-input" rows="1" placeholder="输入你的思考…" aria-label="输入你的思考"></textarea>
            <button class="composer-send" data-act="wb-send" aria-label="发送">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11.5V2.5M3 6.5 7 2.5l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="wb-canvas">
      <div class="canvas-head">
        <h2>交互画布</h2>
        <span class="canvas-fn">${M(cfg.label)}</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn" data-act="fn-toggle">切换 ${c.fn === 'ext' ? 'f(x) = x³' : 'f(x) = x³ − 3x'}</button>
          <button class="btn ghost" data-act="back-chat">回到对话</button>
        </div>
      </div>
      <div class="plot-wrap" id="plot-wrap">${plotSVG(c.fn, c.x)}</div>
      <div class="canvas-controls">
        <div class="slider-wrap">
          <label for="xr">移动切点 x</label>
          <input id="xr" type="range" min="-2.4" max="2.4" step="0.02" value="${c.x}" aria-label="切点横坐标">
          <span class="m" style="min-width:76px;text-align:right">x = ${fmt(c.x)}</span>
        </div>
      </div>
      <div class="metrics">
        <div class="metric"><span class="k">函数值 f(x)</span><span class="v">${fmt(y)}</span></div>
        <div class="metric"><span class="k">导数 f′(x)</span><span class="v ${cls}">${fmt(k)}</span></div>
        <div class="metric"><span class="k">局部状态</span><span class="v state ${cls}">${state}</span></div>
      </div>
      <div class="legend">
        <span><i style="background:#5a49d1"></i>函数曲线</span>
        <span><i style="background:#c9843a"></i>切点与切线</span>
        <span style="color:var(--ink-4)">可拖动切点，或用滑块 / 方向键</span>
      </div>
      <div class="live-read" style="margin-top:18px">
        <div class="live-row"><span class="k">AI 正在看</span></div>
        <p style="margin:0;font-size:13.5px;line-height:1.7;color:var(--ink-2)">${canvasComment()}</p>
      </div>
    </div>
  </div>`;
}

function updateCanvasLive() {
  const wrap = $('#plot-wrap');
  if (!wrap) return;
  const svgEl = wrap.querySelector('svg');
  if (svgEl) {
    // 保留 svg 元素：拖动中的指针捕获与监听都挂在它身上
    svgEl.innerHTML = plotInner(S.canvas.fn, S.canvas.x);
    svgEl.setAttribute('aria-label', `函数曲线与切线，当前切点 x = ${fmt(S.canvas.x)}`);
  } else {
    wrap.innerHTML = plotSVG(S.canvas.fn, S.canvas.x);
  }
  const c = S.canvas;
  const cfg = FN[c.fn];
  const y = cfg.f(c.x);
  const k = cfg.fp(c.x);
  const state =
    Math.abs(k) < 0.16
      ? c.fn === 'cube'
        ? '平稳拐点'
        : c.x < 0
          ? '局部极大'
          : '局部极小'
      : k > 0
        ? '递增'
        : '递减';
  const cls = Math.abs(k) < 0.16 ? 'zero' : k > 0 ? 'pos' : 'neg';
  const vs = document.querySelectorAll('.metric .v');
  if (vs.length >= 3) {
    vs[0].textContent = fmt(y);
    vs[1].textContent = fmt(k);
    vs[1].className = 'v ' + cls;
    vs[2].textContent = state;
    vs[2].className = 'v state ' + cls;
  }
  const xlab = document.querySelector('.slider-wrap .m');
  if (xlab) xlab.textContent = 'x = ' + fmt(c.x);
  const live = document.querySelector('.live-read p');
  if (live) live.textContent = canvasComment();

}

/** 切点真的划过变号位置时才说话；然后引导学生看一个反例 */

/* ─────────────────────────── 专注解题（形态 C） ─────────────────────────── */

const PRACTICE_Q = {
  no: '迁移练习 01',
  title: '判断函数的局部极大值',
  expr: 'h(x) = −x³ + 3x² + 9x − 1',
  ask: '求函数取得局部极大值时的 x，并说明理由。',
  answer: '3',
};

const HINTS = [
  '先求导。三次函数的导数是一次二次式，把二次式因式分解，候选点就出来了。',
  'h′(x) = −3x² + 6x + 9。提取 −3 之后，括号里是 x² − 2x − 3，它可以分解成两个一次因式。',
  'h′(x) = −3(x + 1)(x − 3)。首项系数是负的，所以三个区间的符号是「−、+、−」；左正右负对应极大。',
];

/** 容错判定：不追求解析任意写法，只在读不到时如实说明 */
function checkGoals(text) {
  const t = text
    .replace(/[−–—－]/g, '-')
    .replace(/\s+/g, '')
    .replace(/[，。；、]/g, ',');
  const hasDeriv =
    /-3x(\^?2|\²)(\+6x\+9)?/.test(t) ||
    /-3\(x\+1\)\(x-3\)/.test(t) ||
    /-3\(x-3\)\(x\+1\)/.test(t) ||
    /\(x\+1\)\(x-3\)/.test(t) ||
    /\(x-3\)\(x\+1\)/.test(t);
  const hasSign =
    /左.*正.*右.*负|先正后负|\+,-|左\+右-|-,-\+,-/.test(t) ||
    (/[+\-]{1},[+\-]{1},[+\-]{1}/.test(t) && /-,\+,-/.test(t));
  const hasAnswer = /x=3|x＝3|极大.*3|3.*极大/.test(t);
  return [
    { ok: hasDeriv, why: hasDeriv ? '导数形式可用于本题' : '没有读到可用于本题的导数式' },
    { ok: hasSign, why: hasSign ? '符号表写出了每段的正负' : '没有读到各段导数的符号' },
    { ok: hasAnswer, why: hasAnswer ? '结论指向 x = 3 且判为极大' : '没有读到「x = 3 且为极大」的结论' },
  ];
}

function renderPractice() {
  const p = S.practice;
  const done = p.goals.filter(Boolean).length;
  const goals = [
    { label: '正确计算导数', st: p.submitted ? (p.goals[0] ? 'done' : 'fail') : '' },
    { label: '判断导数符号', st: p.submitted ? (p.goals[1] ? 'done' : 'fail') : '' },
    { label: '区分极值类型', st: p.submitted ? (p.goals[2] ? 'done' : 'fail') : '' },
  ];
  const goalHTML = goals
    .map(
      (g) =>
        `<div class="goal ${g.st}"><span class="mark">${g.st === 'done' ? '✓' : g.st === 'fail' ? '!' : ''}</span><span>${g.label}</span></div>`,
    )
    .join('');

  const coach =
    !p.submitted && p.hint === 0
      ? '你先自己算。求导、分解、看符号，三步都在草稿里写出来，我再根据你写的判断。'
      : !p.submitted
        ? HINTS[Math.min(p.hint - 1, HINTS.length - 1)]
        : done === 3
          ? '三项都过了。你已经能独立完成「求导 → 符号 → 极值类型」这条链。'
          : `三项里过了 ${done} 项。${
              !p.goals[0]
                ? '先把导数写出来：h′(x) = −3x² + 6x + 9。'
                : !p.goals[1]
                  ? '导数对了，接着把三个区间的符号写出来。'
                  : '符号也对了，最后把「哪一段是极大」说清楚。'
            }`;

  return `<div style="display:flex;flex-direction:column;min-height:0;flex:1">
    <div class="practice-bar"><span style="width:${p.submitted ? 100 : 34}%"></span></div>
    <div class="practice" style="flex:1;min-height:0">
      <div class="practice-main" style="overflow-y:auto">
        <div class="practice-cap"><span class="practice-no">${PRACTICE_Q.no}</span><span>导数与极值 · 针对性训练</span><span style="margin-left:auto">1 / 3</span></div>
        <h2>${PRACTICE_Q.title}</h2>
        <p class="practice-q expr"><span class="m">${PRACTICE_Q.expr}</span></p>
        <p class="practice-q">${PRACTICE_Q.ask}</p>
        <div class="draft">
          <div class="draft-cap">解题草稿 · 写推导过程，不用只写答案</div>
          <textarea id="draft" placeholder="例如：h′(x) = …，令 h′(x) = 0 得 …，各区间符号 …" aria-label="解题草稿">${esc(p.draft)}</textarea>
          <div class="draft-foot">
            <span>${p.draft.trim().length} 字</span>
            <span style="margin-left:auto">提交后按「求导 / 符号 / 类型」三项分别核对</span>
          </div>
        </div>
        <div class="practice-actions">
          <button class="btn primary" data-act="submit-work">${p.submitted ? '重新核对' : '提交解题过程'}</button>
          <button class="btn" data-act="hint">给我一点提示</button>
          ${p.submitted ? '<button class="btn ghost" data-act="to-summary">看这次的学习总结</button>' : ''}
        </div>
      </div>
      <div class="practice-side">
        <div class="coach">
          <div class="coach-who"><span class="pi" style="font-family:var(--font-math);font-style:italic">π</span> AI 导师</div>
          <p>${coach}</p>
        </div>
        <div class="goals">
          <h3>本次练习目标</h3>
          ${goalHTML}
        </div>
      </div>
    </div>
  </div>`;
}

function onSubmitWork() {
  const ta = $('#draft');
  S.practice.draft = ta ? ta.value : S.practice.draft;
  const res = checkGoals(S.practice.draft);
  S.practice.goals = res.map((r) => r.ok);
  S.practice.reasons = res.map((r) => r.why);
  S.practice.submitted = true;
  render();
}

/* ─────────────────────────── 学习总结 ─────────────────────────── */

function buildSummary() {
  const passed = S.practice.goals.filter(Boolean).length;
  const independent = passed === 3 ? 1 : 0;
  return {
    stats: { done: 1, miscon: 1, independent },
    evidence: [
      { name: '导数计算', state: S.practice.goals[0] ? 'ok' : 'warn', label: S.practice.goals[0] ? '已展示能力' : '待补', pct: S.practice.goals[0] ? 100 : 58 },
      { name: '求解驻点', state: 'ok', label: '已展示能力', pct: 100 },
      { name: '导数符号与单调性', state: S.practice.goals[1] ? 'ok' : 'warn', label: S.practice.goals[1] ? '独立练习通过' : '待巩固', pct: S.practice.goals[1] ? 92 : 64 },
      { name: '极值的判定', state: S.practice.goals[2] ? 'ok' : 'warn', label: S.practice.goals[2] ? '独立练习通过' : '已纠正，待巩固', pct: S.practice.goals[2] ? 90 : 62 },
    ],
    misconception: '把「导数等于零」当成极小值的充分条件。',
    correction: '驻点只是候选，要再看候选点附近导数符号（或函数值）是否变号：左正右负是局部极大，左负右正是局部极小。',
    next: S.practice.goals[2]
      ? '独立练习含水平拐点的函数（如 (x−1)³+2），确认能否区分「切线水平」与「有极值」。'
      : '先把 −3(x+1)(x−3) 的符号表写完整，再回到这道题说清哪一段是极大。',
  };
}

function renderSummary() {
  if (!S.summary) S.summary = buildSummary();
  const s = S.summary;
  return `<div style="flex:1;overflow-y:auto">
    <div class="summary">
      <h1>本次学习总结</h1>
      <p class="sub">依据本次会话中真实发生的操作生成；不是校准后的掌握概率。</p>
      <div class="stats">
        <div class="stat"><span class="k">完成练习</span><span class="v">${s.stats.done}</span></div>
        <div class="stat"><span class="k">发现认知误区</span><span class="v">${s.stats.miscon}</span></div>
        <div class="stat"><span class="k">独立解题通过</span><span class="v">${s.stats.independent}</span></div>
      </div>
      <div class="evidence">
        <h2>知识点学习证据</h2>
        ${s.evidence
          .map(
            (e) => `<div class="ev">
          <div class="ev-top">
            <span class="ev-name">${e.name}</span>
            <span class="ev-state ${e.state}">${e.label}</span>
          </div>
          <div class="ev-track"><div class="ev-fill ${e.state === 'warn' ? 'warn' : ''}" style="width:${e.pct}%"></div></div>
        </div>`,
          )
          .join('')}
      </div>
      <div class="cognition">
        <h2>本次纠正的错误认知</h2>
        <div class="cog-row bad"><span class="sym">✗</span><span class="txt-bad">${s.misconception}</span></div>
        <div class="cog-row good"><span class="sym">✓</span><span class="txt-good">${s.correction}</span></div>
        <div class="next-step"><b>下一步</b>　${s.next}</div>
      </div>
      <div style="margin-top:28px;display:flex;gap:10px">
        <button class="btn primary" data-act="back-chat">回到对话</button>
        <button class="btn" data-view="errors">看错题本</button>
      </div>
    </div>
  </div>`;
}

/* ─────────────────────────── 错题本 ─────────────────────────── */

function renderErrors() {
  const has = S.practice.submitted || S.chatStage !== 'opening';
  return `<div style="flex:1;overflow-y:auto">
    <div class="errlist">
      <h1>错题本</h1>
      <p class="sub">按错因归类，不是题目堆叠。</p>
      ${
        has
          ? `<div class="err-item">
        <div class="err-head">
          <span class="err-kp">导数 · 极值判定</span>
          <span style="font-size:13px;color:var(--ink)">三次函数局部极小值</span>
          <span class="err-when">今天</span>
        </div>
        <p class="err-why"><strong>当时怎么想的：</strong>把「导数等于零」当成极小值的充分条件，选了 x = −1。</p>
        <p class="err-fix"><b>纠正依据：</b>驻点只是候选。左正右负是局部极大，左负右正是局部极小 —— 这道题里 2 才是极小。</p>
      </div>`
          : `<div class="err-item"><p class="err-why">这次还没有产生错题记录。完成一次练习后会出现在这里。</p></div>`
      }
      <div class="err-item" style="background:#fbfaff">
        <p class="err-why" style="margin:0"><strong>说明：</strong>本原型只演示一条教学路径，错题本里的记录来自本次会话真实发生的操作，不预置其他学生的数据。</p>
      </div>
    </div>
  </div>`;
}

/* ─────────────────────────── 渲染 ─────────────────────────── */

/** 窄栏（工作台左列）里的原题：一行引用 + 可展开，不重复占满屏 */
const COMPACT_PROBLEM = () => `
  <details class="problem-compact">
    <summary><span class="problem-tag">原题</span> ${M('g(x) = 2x³ − 3x² − 12x + 1')}　问局部极小值的 x</summary>
    <div style="margin-top:10px">${PROBLEM_BLOCK()}</div>
  </details>`;

function blockHTML(b, opt = {}) {
  switch (b.t) {
    case 'problem':
      return opt.compact ? COMPACT_PROBLEM() : PROBLEM_BLOCK();
    case 'h2':
      return `<h2>${b.html}</h2>`;
    case 'h3':
      return `<h3>${b.html}</h3>`;
    case 'p':
      return `<p>${b.html}</p>`;
    case 'math':
      return `<div class="math-block">${b.html}</div>`;
    case 'raw':
      return b.html;
    case 'probe':
      return renderProbe();
    case 'figs':
      return FIGS_CONTRAST();
    case 'verdict':
      return `<div class="verdict ${b.kind}"><span class="tag">${b.kind === 'good' ? '✓' : '↺'}</span><div>${b.html}</div></div>`;
    case 'actions':
      return `<div class="probe-foot" style="margin-top:18px">${b.items
        .map((it) => `<button class="btn ${it.kind || ''}" data-act="${it.id}">${it.label}</button>`)
        .join('')}</div>`;
    default:
      return '';
  }
}

function renderThread(opt = {}) {
  let prevWasAI = false;
  return `<div class="thread">
    ${S.thread
      .map((item) => {
        if (item.who === ME) {
          prevWasAI = false;
          return `<div class="me-row"><div class="me">${
            item.attach ? `<span class="me-attach">📎 ${esc(item.attach)}</span>` : ''
          }${esc(item.text)}</div></div>`;
        }
        // 连续几条 AI 内容是同一个导师声音，只在第一段署名，避免每段都挂标签
        const who = prevWasAI ? '' : '<div class="doc-who"><span class="pi">π</span><span>AI 导师</span></div>';
        prevWasAI = true;
        return `<div class="doc">
          ${who}
          ${item.blocks.map((b) => blockHTML(b, opt)).join('')}
        </div>`;
      })
      .join('')}
  </div>`;
}

function renderChat() {
  return `<div style="flex:1;overflow-y:auto" id="chat-scroll">
      <div class="viewport-inner">${renderThread()}</div>
    </div>
    <div class="composer">
      <div class="composer-inner">
        <div class="composer-box">
          <textarea id="chat-input" rows="1" placeholder="继续提问，或写出你的推导…" aria-label="输入消息"></textarea>
          <button class="composer-send" data-act="chat-send" aria-label="发送">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11.5V2.5M3 6.5 7 2.5l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="composer-hint">Enter 发送 · Shift + Enter 换行 · 本原型按一条预设教学路径推进</div>
      </div>
    </div>`;
}

function render() {
  const vp = $('#viewport');
  const prevScroller = $('#chat-scroll') || $('#wb-scroll');
  const prevTop = prevScroller ? prevScroller.scrollTop : 0;
  document.querySelectorAll('.nav-item[data-view]').forEach((n) => {
    n.classList.toggle('active', n.dataset.view === S.view);
  });
  const meta = $('#tb-meta');
  if (S.view === 'practice') meta.textContent = '针对性训练 · 第 1 题';
  else if (S.view === 'summary') meta.textContent = '本次学习结果';
  else if (S.view === 'errors') meta.textContent = '按错因归类';
  else if (S.view === 'workbench') meta.textContent = '共享当前题目与切点';
  else meta.textContent = '今天 · 第 1 次学习';

  if (S.view === 'chat') vp.innerHTML = renderChat();
  else if (S.view === 'workbench') vp.innerHTML = renderWorkbench();
  else if (S.view === 'practice') vp.innerHTML = renderPractice();
  else if (S.view === 'summary') vp.innerHTML = renderSummary();
  else vp.innerHTML = renderErrors();

  // 滚动策略：追加内容滚到底；其它重绘保留学生当前阅读位置
  const sc = $('#chat-scroll') || $('#wb-scroll');
  if (sc && prevScroller === sc) sc.prevTop = prevTop;
  else if (sc) sc.prevTop = 0;
  if (sc) {
    const toBottom = !!S.pendingScroll;
    S.pendingScroll = false;
    requestAnimationFrame(() => {
      sc.scrollTop = toBottom ? sc.scrollHeight : Math.min(sc.prevTop || 0, sc.scrollHeight);
    });
  }
  bindCanvas();
}

/* ─────────────────────────── 事件 ─────────────────────────── */

function showView(v) {
  if (v === 'summary' && !S.summary) S.summary = buildSummary();
  S.view = v;
  render();
}

function bindCanvas() {
  const svg = document.querySelector('#plot-wrap svg');
  const slider = $('#xr');
  if (slider) {
    slider.addEventListener('input', () => {
      const prevK = FN[S.canvas.fn].fp(S.canvas.x);
      S.canvas.x = Number(slider.value);
      updateCanvasLive();
      maybeNote(prevK, FN[S.canvas.fn].fp(S.canvas.x));
    });
  }
  if (!svg) return;
  let dragging = false;
  const toX = (ev) => {
    const r = svg.getBoundingClientRect();
    const scale = PLOT.w / r.width;
    const localX = (ev.clientX - r.left) * scale;
    return (localX - PLOT.cx) / PLOT.xs;
  };
  const apply = (x) => {
    const prevK = FN[S.canvas.fn].fp(S.canvas.x);
    S.canvas.x = Math.max(-2.4, Math.min(2.4, Math.round(x * 50) / 50));
    const sl = $('#xr');
    if (sl) sl.value = String(S.canvas.x);
    updateCanvasLive();
    maybeNote(prevK, FN[S.canvas.fn].fp(S.canvas.x));
  };
  svg.addEventListener('pointerdown', (ev) => {
    dragging = true;
    svg.setPointerCapture?.(ev.pointerId);
    apply(toX(ev));
  });
  svg.addEventListener('pointermove', (ev) => {
    if (dragging) apply(toX(ev));
  });
  svg.addEventListener('pointerup', () => {
    dragging = false;
  });
  svg.addEventListener('pointercancel', () => (dragging = false));
}

/** 只刷新对话线程：画布元素与拖动状态都保留 */
function refreshThread() {
  const box = $('#wb-scroll') || $('#chat-scroll');
  if (!box) return render();
  const holder = box.querySelector('.thread') ? box : box;
  holder.innerHTML = renderThread();
  requestAnimationFrame(() => {
    box.scrollTop = box.scrollHeight;
  });
}

/** 自由输入的关键词路由：命中就给对应教学回应，读不到就如实说明 */
function replyTo(text) {
  S.pendingScroll = true;
  const t = text.replace(/\s+/g, '');
  if (/为什么|不一定|变号|切线水平/.test(t)) {
    pushAI([
      { t: 'p', html: `因为「切线水平」只是一个<strong>必要条件</strong>。${M('f(x) = x³')} 在原点切线也水平，但两侧导数都为正，曲线一直上升，那里不是极值点。要看的是<strong>两侧符号有没有变</strong>。` },
    ]);
    return;
  }
  if (/极大|极小|哪个|答案|选什么/.test(t)) {
    pushAI([
      { t: 'p', html: `这道题里 ${M('x = −1')} 是局部<strong>极大</strong>，${M('x = 2')} 才是局部<strong>极小</strong>。先别记结论 —— 你能说出 ${M('x = 2')} 两侧的导数符号吗？` },
    ]);
    return;
  }
  if (/看不懂|不会|难|懵/.test(t)) {
    pushAI([
      { t: 'p', html: `那我们把步骤拆细一点：先只做一件事 —— 把 ${M('g′(x) = 6(x+1)(x−2)')} 里两个因子分别在什么时候为零写出来。` },
    ]);
    return;
  }
  pushAI([
    { t: 'p', html: `这句我先记下了。不过这条原型只演示一条教学路径，我不假装理解任意提问 —— 你可以试着问「为什么切线水平不一定有极值」，或者直接把推导写出来，我按你写的判断。` },
  ]);
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act],[data-view]');
  if (!el) return;

  if (el.dataset.view) {
    showView(el.dataset.view);
    return;
  }

  const act = el.dataset.act;
  if (act === 'new') {
    S.view = 'chat';
    S.probe = { left: null, right: null, sent: false, ok: false, tries: 0 };
    S.canvas = { fn: 'ext', x: -1, sawZero: false, switched: false, notedSign: false, notedCube: false };
    S.practice = { draft: '', hint: 0, submitted: false, goals: [false, false, false], reasons: ['', '', ''] };
    S.summary = null;
    startOpening();
    render();
  } else if (act === 'sign') {
    S.probe[el.dataset.side] = el.dataset.sign;
    render();
  } else if (act === 'probe-submit') {
    onProbeSubmit();
    render();
  } else if (act === 'open-canvas') {
    S.view = 'workbench';
    S.canvas.x = -1.9;
    render();
  } else if (act === 'back-chat') {
    showView('chat');
  } else if (act === 'fn-cube') {
    S.canvas.fn = 'cube';
    S.canvas.x = 1.6;
    S.canvas.switched = true;
    render();
    maybeNote(FN.cube.fp(1.6), FN.cube.fp(1.6));
  } else if (act === 'fn-toggle') {
    S.canvas.fn = S.canvas.fn === 'ext' ? 'cube' : 'ext';
    S.canvas.x = S.canvas.fn === 'cube' ? 0 : -1;
    if (S.canvas.fn === 'cube') S.canvas.switched = true;
    render();
  } else if (act === 'to-practice') {
    showView('practice');
  } else if (act === 'hint') {
    S.practice.hint = Math.min(S.practice.hint + 1, HINTS.length);
    render();
  } else if (act === 'submit-work') {
    onSubmitWork();
  } else if (act === 'to-summary') {
    S.summary = buildSummary();
    showView('summary');
  } else if (act === 'fix-ocr') {
    pushAI([
      { t: 'p', html: `好，题干以你确认的为准。这类识别偏差在拍照题里很常见 —— 你可以直接把正确式子打给我，我按你写的重新看。` },
    ]);
    render();
  } else if (act === 'chat-send') {
    const ta = $('#chat-input');
    const text = ta ? ta.value.trim() : '';
    if (!text) return;
    pushMe(text);
    replyTo(text);
    render();
  } else if (act === 'wb-send') {
    const ta = $('#wb-input');
    const text = ta ? ta.value.trim() : '';
    if (!text) return;
    pushMe(text);
    replyTo(text);
    render();
  }
});

// 草稿输入实时保存
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'draft') {
    S.practice.draft = ev.target.value;
    const foot = ev.target.parentElement.querySelector('.draft-foot span');
    if (foot) foot.textContent = `${ev.target.value.trim().length} 字`;
  }
});

// Enter 发送
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || ev.shiftKey) return;
  if (ev.target.id === 'chat-input' || ev.target.id === 'wb-input') {
    ev.preventDefault();
    const btn = ev.target.parentElement.querySelector('.composer-send');
    if (btn) btn.click();
  }
});

/* ─────────────────────────── 启动 ─────────────────────────── */

startOpening();
render();
