/**
 * 练题中心 · 三套离线题组。
 *
 * 题源：原项目只读题库 D:/zxsy-math-arena/services/teacher-platform/corpus/staging/quiz_gaokao.jsonl
 * （787 道 GAOKAO-Bench 2010–2022 真题；源行的 difficulty/kp_code 为 null，本文件的难度与 kp
 * 是离线演示标注，不是源行字段）。题1 原题来自本仓库 bank.js 的 HYP。
 *
 * 纪律：全部 choice，答案字母精确匹配；题干/选项/解析经过清洗，不出现裸 LaTeX 命令。
 */

const q = (id, item_no, difficulty, stem, options, answer, explain, kp_code, kp_name, source) => ({
  id,
  item_no,
  type: 'choice',
  difficulty,
  stem,
  options,
  answer,
  explain,
  kp_code,
  kp_name,
  source: source || '离线演示题组',
})

const HYP_CODE = 'MATH-PEP-XBIXI1-EE9F73167A'
const DER_CODE = 'MATH-PEP-XBIXI2-8F19721552'
const TRI_CODE = 'MATH-PEP-BIXI2-E5F41AFCE2'

export const PRACTICE_SETS = [
  {
    id: 'set-hyp-ecc',
    title: '双曲线离心率',
    subtitle: '从题1原题到焦点三角形',
    kp: { code: HYP_CODE, name: '双曲线的离心率' },
    est_minutes: 20,
    difficulty_mix: { easy: 2, medium: 2, hard: 1 },
    grading: 'choice',
    questions: [
      q('hyp-01', 1, 'easy',
        '若双曲线 C 的虚轴长为实轴长的 √7 倍，则 C 的离心率为（ ）',
        { A: '√2', B: '2', C: '√7', D: '2√2' }, 'D',
        '由 2b=√7·2a 得 b/a=√7。双曲线 c²=a²+b²，所以 e²=1+(b/a)²=8，e=2√2。',
        HYP_CODE, '双曲线的离心率', '本仓库 bank.js 题1原题（答案经单测核对）'),
      q('hyp-02', 2, 'easy',
        '已知双曲线 x²/a² − y²/3 = 1（a>0）的离心率为 2，则实数 a =（ ）',
        { A: '2', B: '√6/2', C: '√5/2', D: '1' }, 'D',
        'e=c/a=√(a²+3)/a=2，得 a²+3=4a²，所以 a=1（a>0）。',
        HYP_CODE, '双曲线的离心率', 'GAOKAO-Bench 2014 新课标Ⅰ（第 249 行）'),
      q('hyp-03', 3, 'medium',
        '中心在原点、焦点在 x 轴上的双曲线的一条渐近线经过点 (4,2)，则它的离心率为（ ）',
        { A: '√6', B: '√5', C: '√6/2', D: '√5/2' }, 'D',
        '渐近线 y=(b/a)x 过 (4,2)，所以 b/a=1/2。e=√(1+(b/a)²)=√5/2。',
        HYP_CODE, '双曲线的离心率', 'GAOKAO-Bench 2010 新课标（第 219 行）'),
      q('hyp-04', 4, 'medium',
        '设直线 l 过双曲线 C 的一个焦点，且与 C 的一条对称轴垂直，l 与 C 交于 A、B 两点，|AB| 为 C 的实轴长的 2 倍，则 C 的离心率为（ ）',
        { A: '√2', B: '√3', C: '2', D: '3' }, 'B',
        '过焦点且垂直于对称轴的弦长为 2b²/a；题设为实轴长的 2 倍，即 2b²/a=4a，得 b²=2a²，所以 e=√(1+b²/a²)=√3。',
        HYP_CODE, '双曲线的离心率', 'GAOKAO-Bench 2011 新课标（第 14 行）'),
      q('hyp-05', 5, 'hard',
        '已知 F₁、F₂ 是双曲线 C 的两个焦点，P 为 C 上一点，且 ∠F₁PF₂=60°，|PF₁|=3|PF₂|，则 C 的离心率为（ ）',
        { A: '√7/2', B: '√13/2', C: '√7', D: '√13' }, 'A',
        '由 |PF₁|=3|PF₂| 且 |PF₁|−|PF₂|=2a，得 |PF₂|=a，|PF₁|=3a。在 △F₁PF₂ 中用余弦定理：4c²=9a²+a²−2·3a·a·cos60°=7a²，所以 e=√7/2。',
        HYP_CODE, '双曲线的离心率', 'GAOKAO-Bench 2021 全国甲卷（第 187 行）'),
    ],
  },
  {
    id: 'set-der-monotone',
    title: '导数与单调性 / 极值',
    subtitle: '从概念辨析到参数综合',
    kp: { code: DER_CODE, name: '导数与单调性 / 极值' },
    est_minutes: 20,
    difficulty_mix: { easy: 2, medium: 2, hard: 1 },
    grading: 'choice',
    questions: [
      q('der-01', 1, 'easy',
        '函数 f(x) 在 x=x₀ 处导数存在。若 p: f′(x₀)=0，q: x=x₀ 是 f(x) 的极值点，则（ ）',
        {
          A: 'p 是 q 的充分必要条件',
          B: 'p 是 q 的充分条件，但不是 q 的必要条件',
          C: 'p 是 q 的必要条件，但不是 q 的充分条件',
          D: 'p 既不是 q 的充分条件，也不是 q 的必要条件',
        }, 'C',
        'f′(x₀)=0 不一定有极值（如 f(x)=x³ 在 x=0），但极值点若导数存在则必有 f′(x₀)=0。所以 p 是 q 的必要不充分条件。',
        DER_CODE, '函数的极值', 'GAOKAO-Bench 2014 新课标Ⅱ（第 255 行）'),
      q('der-02', 2, 'easy',
        '函数 f(x)=ln(x²−2x−8) 的单调递增区间是（ ）',
        { A: '(−∞,−2)', B: '(−∞,−1)', C: '(1,+∞)', D: '(4,+∞)' }, 'D',
        '定义域 x²−2x−8>0，即 x<−2 或 x>4。内层 t=x²−2x−8 在 (4,+∞) 递增，ln t 也递增，所以 f(x) 的单调递增区间是 (4,+∞)。',
        DER_CODE, '函数的单调性', 'GAOKAO-Bench 2017 新课标Ⅱ（第 305 行）'),
      q('der-03', 3, 'medium',
        '若函数 f(x)=kx−ln x 在区间 (1,+∞) 单调递增，则 k 的取值范围是（ ）',
        { A: '(−∞,−2]', B: '(−∞,−1]', C: '[2,+∞)', D: '[1,+∞)' }, 'D',
        'f′(x)=k−1/x。在 (1,+∞) 上 f′(x)≥0 恒成立，所以 k≥1/x；x>1 时 1/x<1，故 k≥1。',
        DER_CODE, '函数的单调性', 'GAOKAO-Bench 2014 新课标Ⅱ（第 260 行）'),
      q('der-04', 4, 'medium',
        '若 x=−2 是函数 f(x)=(x²+ax−1)e^(x−1) 的极值点，则 f(x) 的极小值为（ ）',
        { A: '−1', B: '−2e⁻³', C: '5e⁻³', D: '1' }, 'A',
        'f′(x)=e^(x−1)[x²+(a+2)x+(a−1)]。由 f′(−2)=0 得 a=−1。于是 f′(x)=e^(x−1)(x+2)(x−1)，x=1 为极小值点，f(1)=−1。',
        DER_CODE, '函数的极值', 'GAOKAO-Bench 2017 新课标Ⅱ（第 98 行）'),
      q('der-05', 5, 'hard',
        '若函数 f(x)=x−(1/3)sin 2x+a sin x 在 (−∞,+∞) 单调递增，则 a 的取值范围是（ ）',
        { A: '[−1,1]', B: '[−1,1/3]', C: '[−1/3,1/3]', D: '[−1,−1/3]' }, 'C',
        'f′(x)=1−(2/3)cos 2x+a cos x=5/3−(4/3)cos²x+a cos x。令 t=cos x∈[−1,1]，需 g(t)=5/3−(4/3)t²+at≥0 对 t∈[−1,1] 恒成立。g 为开口向下，最小值在端点：g(1)=a+1/3≥0，g(−1)=1/3−a≥0，所以 −1/3≤a≤1/3。',
        DER_CODE, '函数的单调性', 'GAOKAO-Bench 2016 新课标Ⅰ（第 281 行）'),
    ],
  },
  {
    id: 'set-trig-triangle',
    title: '三角函数与解三角形',
    subtitle: '恒等变换到正余弦定理',
    kp: { code: TRI_CODE, name: '三角函数与解三角形' },
    est_minutes: 20,
    difficulty_mix: { easy: 2, medium: 2, hard: 1 },
    grading: 'choice',
    questions: [
      q('tri-01', 1, 'easy',
        '若 sin a = 1/3，则 cos 2a =（ ）',
        { A: '8/9', B: '7/9', C: '−7/9', D: '−8/9' }, 'B',
        'cos 2a=1−2sin²a=1−2/9=7/9。',
        TRI_CODE, '三角恒等变换', 'GAOKAO-Bench 2018 新课标Ⅲ（第 124 行）'),
      q('tri-02', 2, 'easy',
        '△ABC 的内角 A、B、C 的对边分别为 a、b、c。已知 a=√5，c=2，cos A=2/3，则 b=（ ）',
        { A: '√2', B: '√3', C: '2', D: '3' }, 'D',
        '由余弦定理 cos A=(b²+c²−a²)/(2bc)=(b²+4−5)/(4b)=2/3，得 3b²−8b−3=0，解得 b=3（舍去 −1/3）。',
        TRI_CODE, '余弦定理', 'GAOKAO-Bench 2016 新课标Ⅰ（第 278 行）'),
      q('tri-03', 3, 'medium',
        '若 cos(π/4−α)=3/5，则 sin 2α=（ ）',
        { A: '7/25', B: '1/5', C: '−1/5', D: '−7/25' }, 'D',
        'sin 2α=cos(π/2−2α)=cos[2(π/4−α)]=2cos²(π/4−α)−1=2·9/25−1=−7/25。',
        TRI_CODE, '三角恒等变换', 'GAOKAO-Bench 2016 新课标Ⅱ（第 76 行）'),
      q('tri-04', 4, 'medium',
        'cos²(π/12) − cos²(5π/12)=（ ）',
        { A: '1/2', B: '√3/3', C: '√2/2', D: '√3/2' }, 'D',
        '5π/12=π/2−π/12，所以 cos(5π/12)=sin(π/12)。原式=cos²(π/12)−sin²(π/12)=cos(π/6)=√3/2。',
        TRI_CODE, '三角恒等变换', 'GAOKAO-Bench 2021 新课标Ⅰ（第 386 行）'),
      q('tri-05', 5, 'hard',
        '△ABC 的内角 A、B、C 的对边分别为 a、b、c，已知 a sin A − b sin B = 4c sin C，cos A=−1/4，则 b/c=（ ）',
        { A: '6', B: '5', C: '4', D: '3' }, 'A',
        '由正弦定理，a sin A − b sin B = 4c sin C 可化为 a²−b²=4c²。由余弦定理 cos A=(b²+c²−a²)/(2bc)=(c²−4c²)/(2bc)=−3c/(2b)=−1/4，所以 b/c=6。',
        TRI_CODE, '余弦定理、正弦定理', 'GAOKAO-Bench 2019 新课标Ⅰ（第 339 行）'),
    ],
  },
]

export const PRACTICE_SET_BY_ID = Object.fromEntries(PRACTICE_SETS.map((s) => [s.id, s]))
export const PRACTICE_SET_BY_CODE = Object.fromEntries(PRACTICE_SETS.map((s) => [s.kp.code, s]))

export function practiceSetFor(kpCode) {
  return PRACTICE_SET_BY_CODE[kpCode] || PRACTICE_SETS[0]
}
