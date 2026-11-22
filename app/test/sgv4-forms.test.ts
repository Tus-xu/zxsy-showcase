/**
 * sgv4 引导链路 V4 · 五新交互形式组件测试（DESIGN §4.1 形式目录 / F1-F6 前端落地）
 *
 * 覆盖（全部离线 jsdom，spec 按 DESIGN §4.1 下行协议构造——_correct/_answer/_segments
 * 为后端判定键，经 strip_private 剥离不下发，前端测试 spec 同口径不含答案键）：
 * 1. BinaryJudge：data-sbj-option DOM 锚点（A2）/单选高亮/改选 edit/submit {choice}；
 * 2. NumLineMark：sign 模式（选段+正负上色 → {segments}）/drag 模式（微调 → {drops}）；
 * 3. FigureProbe：曲线渲染（exprEval 复用）/point 落点 {picked}（坐标换算 stub rect）/
 *    非 function 图形降级标注；
 * 4. FigureSlider：滑块试探 trials/submit {values, trials}/曲线随参数重绘；
 * 5. ExprInput + SymbolPalette：keypad 按题裁剪/骨架模板/编辑 edit/submit {latex}；
 * 6. FORM_ZH/summarizeInteraction 五新形式扩列（F9）；
 * 7. SocraticInteractionCard：新形式分发/last_resort 徽标/degraded/citations/hints
 *    /free_text 主通道/edit_count 汇总上行（F6）；
 * 8. MessageBubble 分发 binary 卡：[data-soc-ix-form="binary"] [data-sbj-option] ≥2（A2 DOM 级）。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import SocraticInteractionCard from '@/components/chat/SocraticInteractionCard.vue'
import BinaryJudge from '@/components/chat/interaction/BinaryJudge.vue'
import NumLineMark from '@/components/chat/interaction/NumLineMark.vue'
import FigureProbe from '@/components/chat/interaction/FigureProbe.vue'
import FigureSlider from '@/components/chat/interaction/FigureSlider.vue'
import ExprInput from '@/components/chat/interaction/ExprInput.vue'
import SymbolPalette from '@/components/chat/SymbolPalette.vue'
import { FORM_ZH, newAssistantMsg, applySseEvent, summarizeInteraction } from '@/components/chat/messageModel'

type AnyMsg = any

function socraticMsg(): AnyMsg {
  const msg = newAssistantMsg(`cm-${Math.random().toString(36).slice(2)}`)
  msg.status = 'done'
  msg.skill = 'socratic_solver'
  return msg
}
function addCard(msg: AnyMsg, data: any) {
  applySseEvent(msg, 'card', data)
  return msg
}

/* ================= 1. BinaryJudge（F1） ================= */
describe('sgv4 BinaryJudge 二元判断按钮组', () => {
  const spec = {
    question: 'x = -1 左边，f\'(x) 取正还是取负？',
    options: [
      { id: 'pos', label: '取正' },
      { id: 'neg', label: '取负', maps_to: 'derivative_sign' },
      { id: 'zero', label: '为零' },
    ],
  }

  it('选项按钮统一带 data-sbj-option 锚点（A2 DOM 断言，不依赖样式类）；≥2 个', () => {
    const w = mount(BinaryJudge, { props: { spec } })
    const opts = w.findAll('[data-sbj-option]')
    expect(opts.length).toBe(3)
    expect(opts.map((o) => o.attributes('data-sbj-option'))).toEqual(['pos', 'neg', 'zero'])
  })

  it('单选高亮 → 提交即抛 {choice}；改选 emit edit 一次', async () => {
    const w = mount(BinaryJudge, { props: { spec } })
    await w.find('[data-sbj-option="pos"]').trigger('click')
    expect(w.find('[data-sbj-option="pos"]').classes()).toContain('picked')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ choice: 'pos' })
    // 改选：选过 pos 再点 neg → edit 一次（首次选择不算改选）
    const w2 = mount(BinaryJudge, { props: { spec } })
    await w2.find('[data-sbj-option="pos"]').trigger('click')
    expect(w2.emitted('edit')).toBeFalsy()
    await w2.find('[data-sbj-option="neg"]').trigger('click')
    expect(w2.emitted('edit')!.length).toBe(1)
    await w2.find('.ix-submit').trigger('click')
    expect(w2.emitted('submit')![0][0]).toEqual({ choice: 'neg' })
  })

  it('未选不可提交；空选项降级提示不白屏', async () => {
    const w = mount(BinaryJudge, { props: { spec } })
    expect((w.find('.ix-submit').element as HTMLButtonElement).disabled).toBe(true)
    const empty = mount(BinaryJudge, { props: { spec: { question: '判断', options: [] } } })
    expect(empty.find('.ix-bj-empty').exists()).toBe(true)
    expect(empty.find('[data-sbj-option]').exists()).toBe(false)
  })
})

/* ================= 2. NumLineMark（F2） ================= */
describe('sgv4 NumLineMark 数轴标注', () => {
  it('sign 模式：断点切段 → 选段+正/负上色 → submit {segments}；操作 emit edit', async () => {
    const w = mount(NumLineMark, {
      props: {
        spec: { mode: 'sign', axis: { min: -2, max: 2, points: [0] }, prompt: '标出 f\'(x) 的符号段' },
      },
    })
    const segs = w.findAll('.nl-seg')
    expect(segs.length).toBe(2) // (-2,0) 与 (0,2)
    await segs[0].trigger('click')
    await w.find('[data-nl-sign="pos"]').trigger('click')
    await segs[1].trigger('click')
    await w.find('[data-nl-sign="neg"]').trigger('click')
    expect(w.emitted('edit')!.length).toBe(2) // 两次上色各计一次
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({
      segments: [
        { from: -2, to: 0, sign: 'pos' },
        { from: 0, to: 2, sign: 'neg' },
      ],
    })
  })

  it('drag 模式：◀▶ 微调（确定性路径）→ submit {drops}；每次微调 emit edit', async () => {
    const w = mount(NumLineMark, {
      props: {
        spec: { mode: 'drag', axis: { min: -3, max: 3 }, targets: [{ id: 't1', x: 0, label: '驻点' }] },
      },
    })
    await w.find('[data-nl-nudge="r:t1"]').trigger('click')
    await w.find('[data-nl-nudge="r:t1"]').trigger('click')
    expect(w.emitted('edit')!.length).toBe(2)
    await w.find('.ix-submit').trigger('click')
    const payload = w.emitted('submit')![0][0] as any
    expect(payload.drops).toHaveLength(1)
    expect(payload.drops[0].id).toBe('t1')
    expect(payload.drops[0].x).toBeCloseTo(0.24, 1) // step = 6/50 = 0.12 × 2 次
  })

  it('axis 缺失防御降级不白屏', () => {
    const w = mount(NumLineMark, { props: { spec: { mode: 'sign' } } })
    expect(w.find('.ix-nl-empty').exists()).toBe(true)
  })
})

/* ================= 3. FigureProbe（F3） ================= */
describe('sgv4 FigureProbe 图上探点', () => {
  const figure = {
    type: 'function',
    params: { curves: [{ expr: 'x**2 - 4' }], x_range: [-4, 4], y_range: [-4, 4] },
  }
  // jsdom 无布局：stub viewBox svg 的 rect（W=100 视图坐标 ↔ 400px 实宽）
  function stubRect(w: ReturnType<typeof mount>) {
    const el = w.find('svg').element as unknown as HTMLElement
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
  }

  it('function 图形渲染曲线 path；point 模式落点 → {picked:[{x,y}]} 数学坐标', async () => {
    const w = mount(FigureProbe, {
      props: {
        spec: { figure, mode: 'point', prompt: '点出图象与 x 轴的交点', targets: [{ id: 'p1', x: 2, y: 0, tol: 0.3 }] },
      },
    })
    stubRect(w)
    expect(w.findAll('.fp-curve').length).toBe(1) // x**2-4 曲线渲染成功
    // 点击 (clientX=300, clientY=150) → 视图 (75, 37.5) → 数学 (2, 0)
    await w.find('svg').trigger('pointerdown', { clientX: 300, clientY: 150 })
    expect(w.emitted('edit')!.length).toBe(1)
    await w.find('.ix-submit').trigger('click')
    const payload = w.emitted('submit')![0][0] as any
    expect(payload.picked).toHaveLength(1)
    expect(payload.picked[0].x).toBeCloseTo(2, 1)
    expect(payload.picked[0].y).toBeCloseTo(0, 1)
  })

  it('targets 判定坐标不渲染（泄题红线）：DOM 中不出现目标坐标文本', () => {
    const w = mount(FigureProbe, {
      props: { spec: { figure, mode: 'point', prompt: '找交点', targets: [{ id: 'p1', x: 2, y: 0, tol: 0.3 }] } },
    })
    expect(w.text()).not.toContain('tol')
    expect(w.findAll('[data-fp-target]').length).toBe(0)
  })

  it('非 function 图形降级：坐标保留 + 降级标注（绝不白屏）', () => {
    const w = mount(FigureProbe, {
      props: { spec: { figure: { type: 'cube', params: {} }, mode: 'point', prompt: '点出棱中点' } },
    })
    expect(w.find('.ix-fp-degrade').exists()).toBe(true)
    expect(w.find('svg').exists()).toBe(true) // 坐标系仍在
  })
})

/* ================= 4. FigureSlider（F4） ================= */
describe('sgv4 FigureSlider 滑块试探', () => {
  const spec = {
    figure: { type: 'function', params: { curves: [{ expr: 'a*x**2' }], x_range: [-4, 4], y_range: [-4, 4] } },
    sliders: [{ id: 'a', min: 0, max: 2, step: 0.5, value: 1, label: '开口系数 a' }],
    prompt: '拖动 a，让抛物线开口符合题意',
  }

  it('滑块拖动（input 实时重绘 / change 计试探）→ submit {values, trials}', async () => {
    const w = mount(FigureSlider, { props: { spec } })
    expect(w.findAll('.fs-curve').length).toBe(1) // a=1 初始曲线
    const range = w.find('[data-fs-slider="a"]')
    const el = range.element as HTMLInputElement
    el.value = '1.5'
    await range.trigger('input') // 实时重绘（不计数）
    expect(w.find('[data-fs-value="a"]').text()).toBe('1.5')
    expect(w.emitted('edit')).toBeFalsy() // 拖动中不计试探
    await range.trigger('change') // 松手：试探 +1
    expect(w.emitted('edit')!.length).toBe(1)
    el.value = '2'
    await range.trigger('input')
    await range.trigger('change')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ values: { a: 2 }, trials: 2 })
  })

  it('无滑块 spec 防御降级：提示文案 + 提交禁用', () => {
    const w = mount(FigureSlider, { props: { spec: { prompt: 'x' } } })
    expect(w.find('.ix-fs-empty').exists()).toBe(true)
    expect((w.find('.ix-submit').element as HTMLButtonElement).disabled).toBe(true)
  })
})

/* ================= 5. ExprInput + SymbolPalette（F5） ================= */
describe('sgv4 ExprInput last_resort 式子输入 + SymbolPalette', () => {
  it('SymbolPalette：keypad 按题裁剪渲染（data-palette-key 锚点）+ 字符串键归一', () => {
    const w = mount(SymbolPalette, { props: { keys: ['x', '^2', '(', ')', '√'], paletteId: 'expr-input' } })
    const keys = w.findAll('.ix-as-key')
    expect(keys.length).toBe(5)
    expect(keys.map((k) => k.attributes('data-palette-key'))).toEqual(['x', '^2', '(', ')', '√'])
  })

  it('SymbolPalette：locked 禁点（assemble >12 token 纪律沿用）', () => {
    const w = mount(SymbolPalette, { props: { keys: ['x'], locked: true, limitHint: '已经够长了' } })
    expect((w.find('.ix-as-key').element as HTMLButtonElement).disabled).toBe(true)
    expect(w.text()).toContain('已经够长了')
  })

  it('ExprInput：键集裁剪 + 点键插入 + 骨架填入 + submit {latex}；编辑 emit edit', async () => {
    const w = mount(ExprInput, {
      props: {
        spec: { prompt: '把 x²-16 的因式分解写出来', keypad: ['x', '^2', '(', ')', '-', '√'], skeleton: '(□-4)(□+4)' },
      },
    })
    expect(w.findAll('.ix-as-key').length).toBe(6) // keypad 裁剪（非缺省全集）
    // 填入骨架（□ 去除）→ 学生补全
    await w.find('.ix-ei-skel-fill').trigger('click')
    expect((w.find('input').element as HTMLInputElement).value).toBe('(-4)(+4)')
    await w.find('input').setValue('(-4)(+4)')
    await w.find('[data-palette-key="x"]').trigger('click') // 光标外追加（简化插入语义）
    expect((w.find('input').element as HTMLInputElement).value).toBe('(-4)(+4)x')
    await w.find('input').setValue('(x-4)(x+4)')
    await w.find('.ix-submit').trigger('click')
    expect(w.emitted('submit')![0][0]).toEqual({ latex: '(x-4)(x+4)' })
    expect(w.emitted('edit')!.length).toBeGreaterThanOrEqual(3)
  })

  it('ExprInput：keypad 缺失走防御缺省集（不回退裸输入），空值禁提交', async () => {
    const w = mount(ExprInput, { props: { spec: { prompt: '写出来' } } })
    expect(w.findAll('.ix-as-key').length).toBeGreaterThan(5)
    expect((w.find('.ix-submit').element as HTMLButtonElement).disabled).toBe(true)
    await w.find('input').setValue('x=1')
    expect((w.find('.ix-submit').element as HTMLButtonElement).disabled).toBe(false)
  })
})

/* ================= 6. FORM_ZH / summarize 扩列（F9） ================= */
describe('sgv4 FORM_ZH / summarizeInteraction 五新形式', () => {
  it('FORM_ZH 扩 5 新形式中文名（v3 十一种不动）', () => {
    expect(FORM_ZH.binary).toBe('二元判断')
    expect(FORM_ZH.numline).toBe('数轴标注')
    expect(FORM_ZH.figure_probe).toBe('图上探点')
    expect(FORM_ZH.figure_slider).toBe('滑块试探')
    expect(FORM_ZH.expr_input).toBe('式子输入')
    expect(FORM_ZH.assemble).toBe('表达式拼装') // v3 零回退
    expect(FORM_ZH.free_text).toBe('自由作答')
  })

  it('summarizeInteraction：五新形式摘要含关键作答内容（历史回显 + LLM 兜底判答双用途）', () => {
    expect(
      summarizeInteraction('binary', { options: [{ id: 'neg', label: '取负' }] }, { choice: 'neg' }),
    ).toBe('[判断] 「取负」')
    expect(
      summarizeInteraction('numline', {}, { segments: [{ from: -2, to: 0, sign: 'pos' }, { from: 0, to: 2, sign: 'neg' }] }),
    ).toBe('[数轴] (-2，0)正 · (0，2)负')
    expect(summarizeInteraction('numline', {}, { drops: [{ id: 't1', x: 1.2 }] })).toBe('[数轴] t1=1.2')
    expect(summarizeInteraction('figure_probe', {}, { picked: [{ x: 2, y: 0 }] })).toBe('[探点] (2, 0)')
    expect(summarizeInteraction('figure_slider', {}, { values: { a: 1.5 }, trials: 3 })).toBe('[滑块] a=1.5（试探 3 次）')
    expect(summarizeInteraction('expr_input', {}, { latex: '(x-4)(x+4)' })).toBe('[式子] (x-4)(x+4)')
    expect(summarizeInteraction('binary', {}, {})).toBe('[判断] 已提交')
  })
})

/* ================= 7. 信封壳 SocraticInteractionCard 扩展（F6） ================= */
describe('sgv4 SocraticInteractionCard 新形式分发与信封新字段', () => {
  const baseCard = {
    card_type: 'socratic_interaction',
    session_id: 'sess-4',
    step_no: 2,
    interaction_id: 'ix_sgv4_1',
    move: 'elicit',
    stage: 'guiding',
    allow_text_fallback: true,
    allow_skip: false,
  }

  it('binary 分发：[data-soc-ix-form="binary"] 内 [data-sbj-option] ≥2（A2 DOM 级锚点）；edit 汇总 editCount 上行', async () => {
    const w = mount(SocraticInteractionCard, {
      props: {
        card: {
          ...baseCard,
          form: 'binary',
          prompt_lead: 'x = -1 左边 f\'(x) 取正还是取负？',
          spec: { question: '判断 f\'(x) 的符号', options: [{ id: 'pos', label: '取正' }, { id: 'neg', label: '取负' }] },
        },
      },
    })
    expect(w.attributes('data-soc-ix-form')).toBe('binary')
    const opts = w.findAll('[data-sbj-option]')
    expect(opts.length).toBeGreaterThanOrEqual(2) // A2：按钮组而非文本框
    await opts[0].trigger('click')
    await opts[1].trigger('click') // 改选 → edit
    await w.find('.ix-submit').trigger('click')
    const evt = w.emitted('submit')! as any[][]
    expect(evt[0][0].payload).toEqual({ choice: 'neg' })
    expect(evt[0][0].editCount).toBe(1)
    expect(evt[0][0].summary).toBe('[判断] 「取负」')
  })

  it('numline/figure_probe/figure_slider/expr_input 四形式分发渲染对应子组件', () => {
    const cases: Array<[string, any, any]> = [
      ['numline', NumLineMark, { mode: 'sign', axis: { min: -2, max: 2, points: [0] } }],
      ['figure_probe', FigureProbe, { figure: { type: 'function', params: { curves: [{ expr: 'x**2' }], x_range: [-4, 4], y_range: [-4, 4] } }, mode: 'point' }],
      ['figure_slider', FigureSlider, { sliders: [{ id: 'a', min: 0, max: 2, step: 0.5, value: 1 }] }],
      ['expr_input', ExprInput, { prompt: '写出来', keypad: ['x'] }],
    ]
    for (const [form, comp, spec] of cases) {
      const w = mount(SocraticInteractionCard, { props: { card: { ...baseCard, form, spec } } })
      expect(w.findComponent(comp).exists(), `form=${form} 应分发到对应子组件`).toBe(true)
    }
  })

  it('free_text last_resort：主通道文本输入 + 符号面板 + 理由徽标；不再渲染重复回退行', async () => {
    const w = mount(SocraticInteractionCard, {
      props: {
        card: {
          ...baseCard,
          form: 'free_text',
          prompt_lead: '这一步需要你完整写出思路',
          last_resort: { reason_code: 'rt_material_failed', reason_zh: '这一步需要完整式子，其他点选形式都不适用', keypad: ['x', '^2', '√'] },
        },
      },
    })
    expect(w.find('[data-soc-ix-last-resort]').text()).toContain('其他点选形式都不适用')
    expect(w.find('[data-soc-ix-ft-input]').exists()).toBe(true)
    // 按题裁剪键集（R1 强制）
    expect(w.findAll('.ix-as-key').map((k) => k.attributes('data-palette-key'))).toEqual(['x', '^2', '√'])
    // 主通道即文本 → 不再渲染 si-fallback 重复行
    expect(w.find('.si-fallback').exists()).toBe(false)
    // 提交走 text（attempt 判答链路，_judge 九字段）
    await w.find('[data-soc-ix-ft-input]').setValue('先求定义域')
    await w.find('.si-send').trigger('click')
    expect(w.emitted('text')![0]).toEqual(['先求定义域'])
  })

  it('expr_input + last_resort：理由徽标 + is-last-resort 类；结构化形式回退视觉降级（minor）', () => {
    const w = mount(SocraticInteractionCard, {
      props: {
        card: {
          ...baseCard,
          form: 'expr_input',
          spec: { prompt: '写出分解式', keypad: ['x', '^2'] },
          last_resort: { reason_code: 'rt_traits_missing', reason_zh: '需要完整式子', keypad: ['x'] },
        },
      },
    })
    expect(w.classes()).toContain('is-last-resort')
    expect(w.find('[data-soc-ix-last-resort]').exists()).toBe(true)
    // expr_input 主通道为结构化输入 → 通用回退行隐藏
    expect(w.find('.si-fallback').exists()).toBe(false)
    // 结构化形式（cloze）回退行存在但带 minor 视觉降级
    const w2 = mount(SocraticInteractionCard, {
      props: { card: { ...baseCard, form: 'cloze', spec: { body_latex: 'a □_1 0', blanks: [{ id: 'b1' }], palette_by_blank: { b1: ['>', '<'] } } } },
    })
    expect(w2.find('.si-fallback').classes()).toContain('minor')
  })

  it('信封新字段：hints/degraded/citations/routing_reason/form_source 渲染与 tooltip；旧卡缺字段零渲染', () => {
    const w = mount(SocraticInteractionCard, {
      props: {
        card: {
          ...baseCard,
          form: 'binary',
          spec: { question: '判断', options: [{ id: 'a', label: '甲' }, { id: 'b', label: '乙' }] },
          hints: { level: 1, text: '注意 f\'(x) 在 x<-1 时三个因式都取负' },
          degraded: { why: 'kb_no_hit', zh: '未找到教材原文，本讲解由 AI 生成，仅供参考' },
          citations: [{ doc_title: '人教A版 选修二', chunk_id: 'chunk_5_1_2', kp_codes: ['KP0001'], quote: '导数的符号与单调性……' }],
          routing_reason: 'rt_gap_detour→probe(binary)',
          form_source: 'router',
        },
      },
    })
    expect(w.find('[data-soc-ix-hint]').text()).toContain('x<-1 时三个因式都取负')
    expect(w.find('[data-soc-ix-hint]').text()).toContain('L1')
    expect(w.find('[data-soc-ix-degraded]').text()).toContain('未找到教材原文')
    const cites = w.find('[data-soc-citations]')
    expect(cites.exists()).toBe(true)
    expect(cites.text()).toContain('人教A版 选修二')
    expect(w.find('.si-form').attributes('title')).toContain('route:rt_gap_detour→probe(binary)')
    expect(w.find('.si-form').attributes('title')).toContain('form_source:router')
    // 旧卡（无新字段）零渲染：徽标区全不出现
    const old = mount(SocraticInteractionCard, { props: { card: { ...baseCard, form: 'cloze', spec: { body_latex: 'a □_1 0', blanks: [{ id: 'b1' }], palette_by_blank: { b1: ['>', '<'] } } } } })
    expect(old.find('[data-soc-ix-hint]').exists()).toBe(false)
    expect(old.find('[data-soc-ix-degraded]').exists()).toBe(false)
    expect(old.find('[data-soc-ix-last-resort]').exists()).toBe(false)
    expect(old.find('[data-soc-citations]').exists()).toBe(false)
  })
})

/* ================= 8. MessageBubble 分发 binary（A2 DOM 级全链） ================= */
describe('sgv4 MessageBubble 分发 binary 卡（A2 全链）', () => {
  it('真实信封流：[data-soc-ix-form="binary"] [data-sbj-option] ≥2，主答渠道非文本框', async () => {
    const msg = addCard(socraticMsg(), {
      card_type: 'socratic_interaction',
      session_id: 'sess-4',
      step_no: 2,
      interaction_id: 'ix_sgv4_2',
      form: 'binary',
      stage: 'guiding',
      prompt_lead: 'x = -1 左边 f\'(x) 取正还是取负？',
      spec: { question: '判断符号', options: [{ id: 'pos', label: '取正' }, { id: 'neg', label: '取负' }] },
    })
    const w = mount(MessageBubble, { props: { msg } })
    const binaryZone = w.find('[data-soc-ix-form="binary"]')
    expect(binaryZone.exists()).toBe(true)
    expect(binaryZone.findAll('[data-sbj-option]').length).toBeGreaterThanOrEqual(2)
    // 点选 → interactionSubmit 载荷含 editCount
    await binaryZone.findAll('[data-sbj-option]')[1].trigger('click')
    await binaryZone.find('.ix-submit').trigger('click')
    const evt = w.emitted('interactionSubmit')! as any[][]
    expect(evt[0][0]).toMatchObject({ interactionId: 'ix_sgv4_2', form: 'binary', payload: { choice: 'neg' } })
    expect(evt[0][0].editCount).toBe(0) // 未改选 → 0
  })
})
