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
  options: ['A. −1', 'B. 1', 'C. 2', 'D. −2'],
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
  options: ['A. −1', 'B. 3', 'C. 0', 'D. 1'],
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
