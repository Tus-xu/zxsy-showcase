/**
 * 作业提交与批改 · 共享数据契约（教师端批改工作台 / 学生端回看共同读取）。
 * 三份答卷分别对应三道指定题（A/B/C），覆盖：完整正确、思路对但算错、漏条件。
 * 答卷图片由 scripts/make_submission_images.py 生成（演示素材，非真实学生）。
 */
const subA = ''
const subB = ''
const subC = ''
export const submissions = [
  {
    id: 'sub-A',
    caseId: 'A',
    questionNo: 3,
    questionTitle: '双曲线离心率',
    questionText: '若双曲线 C 的虚轴长为实轴长的 √7 倍，则 C 的离心率为',
    studentName: '林一川',
    className: '高二 (1) 班',
    submittedAt: '2026-11-20 20:41',
    image: subA,
    answerSummary: '2b=√7·2a ⇒ b/a=√7；c²=a²+b² ⇒ e²=8 ⇒ e=2√2，选 D',
    rubric: [
      { item: '由 2b=√7·2a 正确得到 b/a=√7', points: 2 },
      { item: '正确使用双曲线关系 c²=a²+b²', points: 2 },
      { item: '正确解出 e=2√2 并选 D', points: 1 },
    ],
    fullScore: 5,
    systemScore: 5,
    systemComment: '推导完整，轴长与半轴区分清楚，结论正确。',
    defect: '无',
  },
  {
    id: 'sub-B',
    caseId: 'C',
    questionNo: 14,
    questionTitle: '有放回取球的期望',
    questionText: '箱中有 5 个球编号 1~5，有放回取三次，至少取出一次的球的个数为 X，求 E(X)',
    studentName: '周子墨',
    className: '高二 (1) 班',
    submittedAt: '2026-11-20 20:38',
    image: subB,
    answerSummary: '意识到“有放回”与重复问题，但把 E(X) 直接算成 3',
    rubric: [
      { item: '正确理解 X 为出现过的不同号码种数', points: 1 },
      { item: '把问题转化为指示变量或分布列', points: 2 },
      { item: '正确计算 E(X)=61/25（或 2.44）', points: 2 },
    ],
    fullScore: 5,
    systemScore: 1,
    systemComment:
      '仅给 1 分：答卷把“X”理解成抽取次数（还写了 E(X)=3），未建立“不同号码种数”与指示变量的模型；按评分细则只有“意识到有放回/重复问题”这一层沾边。建议课堂上用 2、2、5 的例子重讲 X 的含义。',
    defect: '典型错答：把有放回抽样的期望误当抽取次数',
  },
  {
    id: 'sub-C',
    caseId: 'B',
    questionNo: 9,
    questionTitle: '正三棱柱中的线面关系',
    questionText: '在正三棱柱 ABC-A₁B₁C₁ 中，D 为 BC 中点，则下列关系成立的是',
    studentName: '陈可欣',
    className: '高二 (1) 班',
    submittedAt: '2026-11-20 20:45',
    image: subC,
    answerSummary: '判断出 B 正确，但凭图形判断 A 也“垂直”，漏掉 D',
    rubric: [
      { item: '由 AD⊥BC 与 BC⊥AA₁ 得到 B 项成立', points: 2 },
      { item: '正确判断 D 项（CC₁∥平面 AA₁D）', points: 2 },
      { item: '正确排除 A、C 两项', points: 1 },
    ],
    fullScore: 5,
    systemScore: 2,
    systemComment: 'B 项推理正确。A 项不能凭“看起来垂直”判断（数量积为 3）；D 项漏判，需补“面内平行线 + 面外”两步。',
    defect: '漏条件：线面平行需同时判断面内平行线与面外条件',
  },
]

export function findSubmission(id) {
  return submissions.find((s) => s.id === id) || null
}

/** 教师批改的本地状态键：store.teacher.grading.grades[submissionId] */
export const GRADING_STATE_HINT = 'store.teacher.grading.grades[submissionId] = { score, comment, confirmed, gradedAt }'
