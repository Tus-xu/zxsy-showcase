# 科研端数据 QA（自动核验）

运行：`node qa/research/tmp/data_qa.mjs`　结果：**28/28 PASS**，FAIL 0。

```
PASS 页码连续且 meta 页数与 pages 一致：fem-cea — pages=6
PASS 页码连续且 meta 页数与 pages 一致：fem-num — pages=4
PASS 页码连续且 meta 页数与 pages 一致：cond-formula — pages=5
PASS 页码连续且 meta 页数与 pages 一致：write-lecture — pages=3
PASS 表 1 e_h/h 列可复算 — 0.4480,0.4464,0.4464,0.4480
PASS 表 1 能量范数一阶收敛（h 减半误差约减半） — 0.112,0.0558,0.0279,0.014
PASS 表 2 e_h/h^2 列可复算 — 0.2016,0.2010,0.1997,0.2048
PASS 表 2 L2 二阶收敛（h 减半误差约变为 1/4） — 0.0126,0.00314,0.00078,0.0002
PASS √(x²)=x 反例 x=−2：√4=2≠−2
PASS 约分反例 x=1：原式无定义 (NaN)
PASS 配方恒等式 5 组抽样左右相等（b=2） — -3,-0.5,0,1.5,4
PASS 三条公式检查均带“离线演示审核结论”说明
PASS Céa 引理表述含 V_h⊂V、连续、V-椭圆、M/α、inf
PASS Céa 证明含 Galerkin 正交性 + 连续/椭圆不等式两步
PASS 定理条件问答证据指向定理页
PASS 全部问答/工具/公式检查的证据 paper+page+block 均可定位
PASS 每份材料都属于已有项目
PASS 项目声明的论文 id 均存在
PASS 每个项目均有写作工程
PASS refs.bib 含 demo-cea 键
PASS 初稿含未定义引用键 Cea1971（可复现警告）
PASS 改进建议 qedhere 补丁锚点存在
PASS qedhere 修复补丁锚点（导言区）存在
PASS 润色补丁原文存在
PASS 翻译补丁原文存在
PASS 写作工程无外部文献条目（仅随包演示材料）
PASS 正文行内公式 $ 均成对
PASS 三份主讲义 meta 均含“随包演示讲义”标注
```
