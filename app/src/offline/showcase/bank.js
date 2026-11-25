/**
 * 本轮示例复用的题库：变式三题（V1/V2/V3）。
 *
 * 三题共用同一份数据，S4（举一反三）与组合会话（C3–C7）各自独立记进度。
 * 答案已数学校对，见 `transcripts.test.js`。
 */

export const V1 = {
  key: 'v1',
  item_no: 1,
  q_type: 'choice',
  question_text: 'g(x)=2x³−3x²−12x+1 在哪个 x 取得局部极小值？',
  options: ['−1', '1', '2', '−2'],
  answer: 'C',
  // 错选 A 的首句就是方案要求的针对性提示（答错后展开「答案与解析」即可看到）
  answer_analysis:
    '你找到了候选点。先看它左右两边的导数符号。g′(x)=6x²−6x−12=6(x+1)(x−2)，三段符号 +、−、+。g(−1)=8 为局部极大值，g(2)=−19 为局部极小值。错选 A 是把局部极大当成了极小。',
  variant_note: '换系数：同一题型，只把系数改掉',
  difficulty: 'easy',
  kp_code: 'DR-02',
  kp_name: '导数的应用与极值',
}

export const V2 = {
  key: 'v2',
  item_no: 2,
  q_type: 'choice',
  question_text: 'h(x)=−x³+3x²+9x−1 在哪个 x 取得局部极大值？',
  options: ['−1', '3', '0', '1'],
  answer: 'B',
  answer_analysis:
    'h′(x)=−3x²+6x+9=−3(x+1)(x−3)，三段符号 −、+、−。(−1,−6) 为局部极小点，(3,26) 为局部极大点。提示：观察首项系数对导数符号的影响。',
  variant_note: '改变函数走势：首项为负，符号表整体反过来',
  difficulty: 'medium',
  kp_code: 'DR-02',
  kp_name: '导数的应用与极值',
}

export const V3 = {
  key: 'v3',
  item_no: 3,
  q_type: 'choice',
  question_text: 'q(x)=(x−1)³+2，关于 x=1 哪项正确？',
  options: ['A. 此处有局部极大值', 'B. 此处切线水平，且有局部极小值', 'C. 此处切线竖直', 'D. 此处切线水平，且无局部极值'],
  answer: 'D',
  answer_analysis:
    'q′(x)=3(x−1)²，两侧均为正，函数通过 x=1 时仍严格递增。所以切线水平但没有局部极值。提示：比较驻点两侧符号。',
  variant_note: '容易误判：切线水平但不是极值',
  difficulty: 'hard',
  kp_code: 'DR-02',
  kp_name: '导数的应用与极值',
}

export const QUESTIONS = [V1, V2, V3]

/** 变式链卡：QuizSetCard 的 chain 模式按 chain_id 合并、按顺序解锁 */
export function quizChain(items = QUESTIONS) {
  return {
    type: 'quiz_set',
    chain: 'variant',
    chain_id: 'sc-variant-1',
    chain_total: items.length,
    items,
  }
}

/** 归一化题干，用于把 learning-events 里的作答对回本题（不 eval、不做正则替换） */
export function qidOf(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[，。？！、；：,\.\?!;:]/g, '')
    .toLowerCase()
}

/* ===== 真实题1（双曲线离心率）及其三种问法 ===== */
export const HYP = {
  key: 'hyp1',
  item_no: 1,
  q_type: 'choice',
  question_text: '若双曲线 C 的虚轴长为实轴长的 √7 倍，则 C 的离心率为（ ）',
  options: ['√2', '2', '√7', '2√2'],
  answer: 'D',
  answer_analysis:
    '由 2b=√7·2a 约掉 2 得 b/a=√7；双曲线 c²=a²+b²，所以 e²=1+(b/a)²=8，e=2√2（e>0）。',
  variant_note: '同一道题：先化轴比，再求离心率',
  difficulty: 'easy',
  kp_code: 'HY-01',
  kp_name: '双曲线的离心率',
}

export const HYP_QUESTIONS = [
  {
    key: 'hyp_b',
    item_no: 1,
    q_type: 'choice',
    question_text: '若双曲线 C 的虚轴长为实轴长的 √7 倍，化简 2b=√7·2a 后，b/a 等于（ ）',
    options: ['√7', '√7/2', '7', '2√7'],
    answer: 'A',
    answer_analysis: '两边约掉 2：b=√7·a，所以 b/a=√7。注意题目说的是整条轴的比例。',
    variant_note: '第一步：先化轴比',
    difficulty: 'easy',
    kp_code: 'HY-01',
    kp_name: '双曲线的离心率',
  },
  {
    key: 'hyp_e',
    item_no: 2,
    q_type: 'choice',
    question_text: '沿用上题：该双曲线的离心率 e 等于（ ）',
    options: ['√2', '2', '√7', '2√2'],
    answer: 'D',
    answer_analysis: 'e²=1+(b/a)²=1+7=8，且 e>0，所以 e=2√2。',
    variant_note: '第二步：用轴比求离心率',
    difficulty: 'easy',
    kp_code: 'HY-01',
    kp_name: '双曲线的离心率',
  },
  {
    key: 'hyp_swap',
    item_no: 3,
    q_type: 'choice',
    question_text: '若把实轴长与虚轴长对调，离心率会怎样变化？',
    options: ['不变', '变大', '变小', '无法判断'],
    answer: 'C',
    answer_analysis: '原题 b/a=√7，e=√(1+7)=2√2；对调后新的 b/a=1/√7，e=√(1+1/7)=√(8/7) < 2√2，所以变小。',
    variant_note: '第三步：换轴后比值取倒数',
    difficulty: 'medium',
    kp_code: 'HY-01',
    kp_name: '双曲线的离心率',
  },
]

export function hyperbolaChain() {
  return {
    type: 'quiz_set',
    chain: 'variant',
    chain_id: 'sc-hyp-1',
    chain_total: HYP_QUESTIONS.length,
    items: HYP_QUESTIONS,
  }
}
