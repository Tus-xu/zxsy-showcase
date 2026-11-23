# 独立数学校对稿（R03-MATH / PROOFREAD）

> **独立性声明**：本稿由独立上下文完成，只查看三张原题截图；**未**查阅本仓库任何 `evidence/`、`未通过项.md`、`主持人手册.md` 或既有采集/回放报告的结论，也**未**修改任何产品代码或证据文件。全部推导与复核均可按本文 `scripts/` 下的脚本复跑。

- 输入（仅此三图）：
  - `D:\zxsy-math-arena\docs\superpowers\plans\题1.png`（621×95）
  - `D:\zxsy-math-arena\docs\superpowers\plans\题2.png`（668×142）
  - `D:\zxsy-math-arena\docs\superpowers\plans\题3.png`（712×112）
- 转录核对：三图各放大 4 倍后逐字核对（下标、根号、运算符方向均按放大件确认），放大件位于
  `qa/student-showcase/math/scripts/zoom/ti{1,2,3}_x4.png`。
- 复核脚本（Python 3，仅标准库）：
  - `qa/student-showcase/math/scripts/q1_hyperbola.py`
  - `qa/student-showcase/math/scripts/q2_prism.py`
  - `qa/student-showcase/math/scripts/q3_draw.py`
  - 一键复跑：`qa/student-showcase/math/scripts/run_all.ps1`
- 运行环境：Python 3.12.14；复跑命令见文末「复跑方式」。

---

## 题 1（原图编号：第 3 题）

### 1.1 题干原文（抄录）

```
3. 若双曲线 C 的虚轴长为实轴长的 √7 倍，则 C 的离心率为
   A. √2        B. 2        C. √7        D. 2√2
```

- **题型：单选题**（A–D 四选一；下文逐项代入可知只有一项符合题意）。

### 1.2 推导

设双曲线 C 的标准方程为

$$\frac{x^2}{a^2}-\frac{y^2}{b^2}=1\quad(a>0,\ b>0),$$

则实轴长 $=2a$，虚轴长 $=2b$，$c^2=a^2+b^2$，离心率 $e=\dfrac{c}{a}>1$。

1. 由「虚轴长为实轴长的 $\sqrt7$ 倍」：$2b=\sqrt7\cdot 2a\ \Rightarrow\ b=\sqrt7\,a\ \Rightarrow\ \dfrac{b}{a}=\sqrt7$。
2. 由 $c^2=a^2+b^2$ 得
   $$e^2=\frac{c^2}{a^2}=\frac{a^2+b^2}{a^2}=1+\left(\frac{b}{a}\right)^2=1+7=8.$$
3. 因 $e>1$，故 $e=\sqrt8=2\sqrt2$。

（若焦点在 $y$ 轴，则实轴沿 $y$ 轴、虚轴沿 $x$ 轴，题设比值仍是「虚轴长/实轴长」$=\dfrac{b}{a}=\sqrt7$，离心率公式仍为 $e=\sqrt{1+(b/a)^2}$，结果不变。）

### 1.3 最终答案

**D．$2\sqrt2$**　（$e=\sqrt8=2\sqrt2\approx 2.8284$）

### 1.4 复核（独立方法，至少四种）

**方法①　选项代入、反解回代（双向验证）**
由 $e^2=1+(b/a)^2$ 反解 $\dfrac{b}{a}=\sqrt{e^2-1}$，把四个选项分别代回，与题设 $\sqrt7$ 比较：

| 选项 | $e$ | 反解 $b/a=\sqrt{e^2-1}$ | 是否等于 $\sqrt7$ |
|---|---|---|---|
| A | $\sqrt2$ | $1$ | 否 |
| B | $2$ | $\sqrt3$ | 否 |
| C | $\sqrt7$ | $\sqrt6$ | 否 |
| D | $2\sqrt2$ | $\sqrt7$ | **是（唯一）** |

**方法②　具体曲线 + 焦点—准线定义（几何定义复核）**
取 $\dfrac{x^2}{1}-\dfrac{y^2}{7}=1$（$a=1,\ b=\sqrt7,\ c=2\sqrt2$），右焦点 $F(2\sqrt2,0)$，右准线 $x=\dfrac{a^2}{c}=\dfrac{\sqrt2}{4}$。在上支取 $x=1.5,\,2,\,3,\,5$ 四个点 $P$，实测 $\dfrac{|PF|}{d(P,\text{准线})}$ 恒为 $2.828427\ldots=2\sqrt2$，与 $e=c/a$ 一致（见脚本输出）。

**方法③　渐近线视角**
渐近线斜率 $\tan\theta=\dfrac{b}{a}=\sqrt7$，而 $e=\sec\theta=\sqrt{1+\tan^2\theta}=\sqrt8=2\sqrt2$。

**方法④　尺度不变性**
取 $a=0.5,\,1,\,7,\,123$，$e$ 恒为 $2.828427\ldots$，说明 $e$ 只依赖于比值 $b/a$，与题面只给比值相符。

**脚本 `q1_hyperbola.py` 输出（原文粘贴）：**

```
========================================================================
Q1 verification: imaginary axis = sqrt(7) * real axis  =>  b/a = sqrt(7)
========================================================================
given b/a = sqrt(7) = 2.645751311065
direct  e = sqrt(1 + (b/a)^2) = sqrt(1+7) = sqrt(8) = 2*sqrt(2) = 2.828427124746
true e^2 (should be 8, exact) = 8

-- check 1: substitute each option, recover b/a, compare with sqrt(7) --
  option A: e = 1.414213562373  ->  b/a = sqrt(e^2-1) = 1.000000000000   no
  option B: e = 2.000000000000  ->  b/a = sqrt(e^2-1) = 1.732050807569   no
  option C: e = 2.645751311065  ->  b/a = sqrt(e^2-1) = 2.449489742783   no
  option D: e = 2.828427124746  ->  b/a = sqrt(e^2-1) = 2.645751311065   MATCH sqrt(7)
  => only option D is compatible with b/a = sqrt(7).

-- check 2: the opposite reading (real axis = sqrt(7)*imaginary axis, a/b = sqrt(7)) --
  then e = sqrt(1 + 1/7) = sqrt(8/7) = 1.069044967650 = 2*sqrt(2/7)
  this value is NOT among options A..D  => the stated reading is the intended one.

-- check 3: concrete hyperbola x^2/1 - y^2/7 = 1, focus-directrix ratio of points on it --
  a = 1, b = 2.6457513111, c = sqrt(a^2+b^2) = 2.8284271247, e = c/a = 2.8284271247
  right focus F = (2.8284271247, 0), right directrix x = a^2/c = 0.3535533906
    P=( 1.500,   2.95803989): |PF| = 3.242640687119, dist to directrix = 1.146446609407, |PF|/PD = 2.828427124746
    P=( 2.000,   4.58257569): |PF| = 4.656854249492, dist to directrix = 1.646446609407, |PF|/PD = 2.828427124746
    P=( 3.000,   7.48331477): |PF| = 7.485281374239, dist to directrix = 2.646446609407, |PF|/PD = 2.828427124746
    P=( 5.000,  12.96148140): |PF| = 13.142135623731, dist to directrix = 4.646446609407, |PF|/PD = 2.828427124746
  every ratio equals e = 2*sqrt(2) = 2.828427124746  (focus-directrix definition)

-- check 4: asymptote slope -> e = sec(theta), tan(theta) = b/a --
  tan(theta) = 2.645751311065, theta = 1.209429202888 rad, e = 1/cos(theta) = 2.828427124746

-- check 5: scale invariance (e does not depend on a) --
  a =    0.500, b =     1.322876, c =     1.414214, e = 2.828427124746
  a =    1.000, b =     2.645751, c =     2.828427, e = 2.828427124746
  a =    7.000, b =    18.520259, c =    19.798990, e = 2.828427124746
  a =  123.000, b =   325.427411, c =   347.896536, e = 2.828427124746

RESULT Q1: e = sqrt(8) = 2*sqrt(2)  ->  option D
```

### 1.5 歧义说明

1. **「$\sqrt7$ 倍」的方向（重点关注）**：按字面取「虚轴长 $=\sqrt7\times$ 实轴长」，即 $2b=\sqrt7\cdot2a$。若反向理解（实轴长 $=\sqrt7\times$ 虚轴长，$a/b=\sqrt7$），则 $e=\sqrt{1+\frac17}=\sqrt{\frac87}\approx1.069$，**不在 A–D 任何选项中**——选项集合本身构成方向判定的旁证。故采用字面理解。
2. **轴长 vs 半轴长**：教材约定「实轴长 $=2a$、虚轴长 $=2b$」。即使把 $a,b$ 误当作轴长作比，比值仍为 $\sqrt7$，$e$ 不变；此歧义不影响答案。
3. **焦点在 $x$ 轴还是 $y$ 轴**：题面未指定，但 $e=\sqrt{1+(b/a)^2}$ 对两种朝向一致；不影响答案。
4. **干扰项来源**：C $=\sqrt7$ 对应「误把 $e$ 当作 $b/a$」；B $=2$ 对应 $b/a=\sqrt3$；A $=\sqrt2$ 对应 $b/a=1$。均与题设不符。

---

## 题 2（原图编号：第 9 题）

### 2.1 题干原文（抄录）

```
9. 在正三棱柱 ABC–A₁B₁C₁ 中，D 为 BC 中点，则
   A. AD ⊥ A₁C
   B. BC ⊥ 平面 AA₁D
   C. AD ∥ A₁B₁
   D. CC₁ ∥ 平面 AA₁D
```

- **题型：多选题**（B、D 均可证明为真，单选不可能；截图只含题干与选项，未见「多选」说明文字，题型判定理由见 2.4 / 2.5）。

### 2.2 推导（坐标法，逐项）

**建系**：D 为原点，BC 沿 $x$ 轴，A 在 $+y$ 方向。设底面正三角形边长 $a>0$，侧棱长 $h>0$（正三棱柱 ⇒ 侧棱垂直于底面）：

```text
D (0, 0, 0)          B (−a/2, 0, 0)        C (a/2, 0, 0)
A (0, √3a/2, 0)      A₁(0, √3a/2, h)       B₁(−a/2, 0, h)      C₁(a/2, 0, h)
```

方向向量：

```text
AD  = D − A  = (0, −√3a/2, 0)          A₁C = C − A₁ = (a/2, −√3a/2, −h)
BC  = C − B  = (a, 0, 0)               AA₁ = A₁ − A = (0, 0, h)
A₁B₁ = B₁ − A₁ = (−a/2, −√3a/2, 0)     CC₁ = C₁ − C = (0, 0, h)
```

**平面 $AA_1D$**：$A,A_1,D$ 的 $x$ 坐标全为 0，且 $AD$ 方向 $(0,1,0)$ 与 $AA_1$ 方向 $(0,0,1)$ 不平行，三点不共线，故

$$\text{平面 }AA_1D:\ x=0,\qquad \vec n=(1,0,0).$$

**逐项判断**：

- **A．$AD\perp A_1C$？**
  $$\overrightarrow{AD}\cdot\overrightarrow{A_1C}=0\cdot\frac a2+\left(-\frac{\sqrt3a}{2}\right)\left(-\frac{\sqrt3a}{2}\right)+0\cdot(-h)=\frac{3a^2}{4}>0\ne0,$$
  故不垂直，**A 假**。更细地，$\cos\langle AD,A_1C\rangle=\dfrac{\sqrt3a}{2\sqrt{a^2+h^2}}>0$（$h>0$），夹角恒为锐角、永不为直角。
- **B．$BC\perp$ 平面 $AA_1D$？**
  $$\overrightarrow{BC}\cdot\overrightarrow{AD}=0,\qquad \overrightarrow{BC}\cdot\overrightarrow{AA_1}=0,$$
  $AD$ 与 $AA_1$ 是平面 $AA_1D$ 内两条相交直线（交于 $A$），故 $BC\perp$ 平面 $AA_1D$。**B 真**。
  几何说法：等边 $\triangle ABC$ 中 $AD$ 是中线 $\Rightarrow AD\perp BC$；直棱柱 $AA_1\perp$ 底面 $\Rightarrow AA_1\perp BC$；$BC$ 垂直于平面内两条相交直线 $\Rightarrow BC\perp$ 平面 $AA_1D$。
- **C．$AD\parallel A_1B_1$？**
  $AD=(0,-\frac{\sqrt3a}{2},0)$ 与 $A_1B_1=(-\frac a2,-\frac{\sqrt3a}{2},0)$ 的 $x$ 分量分别为 $0$ 与 $-\frac a2$，不成比例，故不平行。**C 假**。
  几何说法：$AD$ 是底边 $BC$ 上的中线（也是角平分线、高），与边 $AB$ 成 $30^\circ$；而 $A_1B_1\parallel AB$（棱柱侧面对边平行），故 $AD\not\parallel A_1B_1$。
- **D．$CC_1\parallel$ 平面 $AA_1D$？**
  $CC_1=(0,0,h)\parallel AA_1$，且 $AA_1\subset$ 平面 $AA_1D$；又 $C(\frac a2,0,0)$ 到平面 $x=0$ 的距离为 $\frac a2\ne0$，即 $C\notin$ 平面 $AA_1D$，故 $CC_1$ 与平面 $AA_1D$ 无公共点，$CC_1\parallel$ 平面 $AA_1D$。**D 真**。
  几何说法：$CC_1\parallel AA_1$ 且 $AA_1\subset$ 平面 $AA_1D$，又 $CC_1\not\subset$ 平面 $AA_1D$（否则 $C$ 在平面内，矛盾），由线面平行判定定理即得。

⇒ 真命题为 **B、D**。

### 2.3 最终答案

**BD**（多选，完整选项集合 $\{B,D\}$；A、C 错误）。

### 2.4 复核（坐标数值 + 参数扫掠 + 纯几何反证）

**方法①　具体数值坐标验算**（$a=2,\ h=3$）：$\overrightarrow{AD}\cdot\overrightarrow{A_1C}=3\ne0$；$\overrightarrow{BC}\cdot\overrightarrow{AD}=\overrightarrow{BC}\cdot\overrightarrow{AA_1}=0$；$AD$ 与 $A_1B_1$ 叉积非零；$\overrightarrow{CC_1}\cdot\vec n=0$ 且 $C$ 到平面距离 $=1\ne0$。真值（A,B,C,D）=（假,真,假,真）。

**方法②　参数扫掠（证明与题面未给出的 $a,h$ 无关）**：对 264 组 $(a,h)$（格点覆盖 $a\in[0.1,57]$、$h\in[0.1,1000]$，另加 200 组随机值 $a\in[0.05,100]$、$h\in[0.05,1000]$）逐组计算，真值签名唯一为 $(假,真,假,真)$。题面没有给任何长度，因此「对任意正三棱柱恒真/恒假」正是本题的命题形态。

**方法③　纯几何反证（复核 A，不用坐标）**：若 $AD\perp A_1C$，又 $AD\perp BC$（等边三角形中线），且 $BC$ 与 $A_1C$ 相交于 $C$，则 $AD\perp$ 平面 $A_1BC$。另一方面，直棱柱中 $AD\perp CC_1$，又 $AD\perp BC$，而 $BC\cap CC_1=C$，故 $AD\perp$ 平面 $BCC_1B_1$。过 $C$ 且垂直于 $AD$ 的平面唯一，于是平面 $A_1BC=$ 平面 $BCC_1B_1$，从而 $A_1\in$ 平面 $BCC_1B_1$；但 $A_1$ 到该面的距离 $=\frac{\sqrt3a}{2}\ne0$，矛盾。故 **A 假**。

**方法④　线面平行判定定理（复核 D）**：$CC_1\parallel AA_1$，$AA_1\subset$ 平面 $AA_1D$，$CC_1\not\subset$ 平面 $AA_1D$ ⇒ $CC_1\parallel$ 平面 $AA_1D$。

**脚本 `q2_prism.py` 输出（原文粘贴）：**

```
========================================================================
Q2 verification: regular triangular prism, D = midpoint of BC
========================================================================
sample prism: a = 2.0 (side of equilateral base), h = 3.0
  AD    = (  0.0000,  -1.7321,   0.0000)
  A1C   = (  1.0000,  -1.7321,  -3.0000)
  BC    = (  2.0000,   0.0000,   0.0000)
  AA1   = (  0.0000,   0.0000,   3.0000)
  A1B1  = ( -1.0000,  -1.7321,   0.0000)
  CC1   = (  0.0000,   0.0000,   3.0000)
  plane AA1D normal n = (5.19615, 0, -0)  [i.e. plane is x = 0]

  AD . A1C = 3.000000  -> angle not 90 deg (cos = 0.480384)
  BC . AD  = 0.000000   BC . AA1 = 0.000000   (both zero)
  signed distance from C to plane AA1D = 1.000000 (nonzero -> C not in the plane)
  signed distance from A1 to face plane BCC1B1 = -1.732051 (A1 not in that face)

  option A: FALSE
  option B: TRUE
  option C: FALSE
  option D: TRUE
  true option set = {B, D}

-- sweep: truth values for many (a,h), incl. tiny/large heights --
  tested 264 prisms; distinct truth signatures = {(False, True, False, True)}
  => A false, B true, C false, D true, for every right prism (independent of a, h).

-- why the word 正 (right prism) matters: oblique prism with the same equilateral base --
  take lateral vector v = (p, 0, h) with p != 0 (lateral edges NOT perpendicular to the base):
  p = +0.20: BC . AA1 = +0.400000, so B = FALSE
  p = -0.40: BC . AA1 = -0.800000, so B = FALSE
  p = +0.70: BC . AA1 = +1.400000, so B = FALSE
  => for an oblique prism B fails; answer BD relies on the standard definition 正三棱柱 = right prism.

RESULT Q2: B and D true, A and C false  ->  {B, D} (multi-select)
```

### 2.5 歧义说明

1. **「正三棱柱」的定义（重点关注）**：采用教材定义「底面是正三角形，且侧棱垂直于底面的直棱柱」。这是 B 成立的前提——若底面仍为正三角形但侧棱不垂直（斜三棱柱），$\overrightarrow{BC}\cdot\overrightarrow{AA_1}=a\cdot(\text{侧棱水平分量})\ne0$，B 会失败（脚本以 3 个斜棱柱反例展示）。D 在斜棱柱下仍真（$CC_1\parallel AA_1$ 且 $C\notin$ 平面 $AA_1D$），可作为稳健性备注。
2. **选项下标**：原图下标较小，已 4 倍放大逐字核对——A 为 $AD\perp A_1C$（不是 $AC$、也不是 $A_1B$），C 为 $AD\parallel A_1B_1$，D 为 $CC_1\parallel$ 平面 $AA_1D$。若误读下标会得到不同结论，本稿以上述放大件为准。
3. **题型**：截图不含「多选/单选」说明文字。由真值判定为多选（B、D 同时为真）；若原卷标为单选，则属题设/选项缺陷，仍应以真值 **BD** 为准。
4. **「D 为 BC 中点」**：指底面边 $BC$ 的中点（不是 $B_1C_1$ 中点）。按字面采用；经核验，即使误取 $B_1C_1$ 中点，B、D 仍为真（平面仍为 $x=0$），但 A 的真值会随 $h$ 变化——这与「题面不给长度」的命题风格不符，进一步支持字面理解。

---

## 题 3（原图编号：第 14 题）

### 3.1 题干原文（抄录）

```
14. 一个箱子里有 5 个球，分别以 1～5 标号，若有放回取三次，记至少取出一次的球的个数 X，则 E(X) = ______.
```

- **题型：填空题**（求期望值，填分数/小数）。

### 3.2 推导（三种独立方法）

**方法一　分布列（定义法）**
- 样本空间：每次 5 球等可能、相互独立，三次有放回抽取的有序三元组共 $5^3=125$ 个，等可能。
- $X=$ 三次结果中出现过的不同标号个数（即「至少被取出一次的球」的个数），$X\in\{1,2,3\}$。
  - $X=1$：三次同标号，$5$ 种 ⇒ $P(X=1)=\dfrac{5}{125}=\dfrac{1}{25}$。
  - $X=3$：三次标号互异，$5\cdot4\cdot3=60$ 种 ⇒ $P(X=3)=\dfrac{60}{125}=\dfrac{12}{25}$。
  - $X=2$：$125-5-60=60$ 种（等价：先选 2 个标号 $C_5^2=10$，三次恰取到这两个标号 $2^3-2=6$，共 $60$ 种）⇒ $P(X=2)=\dfrac{60}{125}=\dfrac{12}{25}$。
  - **归一化检验**：$\dfrac{1}{25}+\dfrac{12}{25}+\dfrac{12}{25}=1$ ✓，计数 $5+60+60=125=5^3$ ✓。
- $$E(X)=1\cdot\frac{1}{25}+2\cdot\frac{12}{25}+3\cdot\frac{12}{25}=\frac{1+24+36}{25}=\frac{61}{25}.$$

**方法二　指示变量 + 期望线性性**
令 $I_i=1$ 若第 $i$ 号球三次中至少出现一次，否则 $0$（$i=1,\dots,5$），则 $X=\sum_{i=1}^5 I_i$。
$$P(I_i=1)=1-P(\text{三次都取不到 }i)=1-\left(\frac45\right)^3=1-\frac{64}{125}=\frac{61}{125},$$
$$E(X)=\sum_{i=1}^5E(I_i)=5\cdot\frac{61}{125}=\frac{61}{25}.$$

**方法三　补集（首次出现次数）**
令 $Y_k=1$ 若第 $k$ 次（$k=2,3$）取的标号在前 $k-1$ 次中已出现过，否则 $Y_k=0$。每个不同标号恰贡献一次「首次出现」，所以 $X=3-(Y_2+Y_3)$。
$$E(Y_2)=P(\text{第 2 次与第 1 次同号})=\frac15,$$
$$E(Y_3)=1-P(\text{第 3 次与前两次都不同})=1-\left(\frac45\right)^2=1-\frac{16}{25}=\frac{9}{25},$$
$$E(X)=3-\frac15-\frac{9}{25}=\frac{75-5-9}{25}=\frac{61}{25}.$$

### 3.3 最终答案

**$E(X)=\dfrac{61}{25}=2.44$**　（分数 $61/25$，小数 $2.44$）

### 3.4 复核（穷举 + 三法互证 + 蒙特卡洛）

- **穷举复核**：枚举全部 $125$ 个有序三元组，逐个统计不同标号数；分布为 $5/60/60$，均值 $305/125=61/25=2.44$，与三种解析方法精确一致（三种方法在脚本中以精确分数断言相等）。
- **蒙特卡洛独立抽样**：$1{,}000{,}000$ 次、固定种子 `20261123`，均值 $2.4403\approx2.44$。
- **概率归一化验证**：$\sum_k P(X=k)=\frac{5+60+60}{125}=1$ ✓。
- **反例探针（排除误读）**：若 $X$ 误读为「恰好被取出一次的球的个数」，则 $E=5\cdot3\cdot\frac15\cdot\left(\frac45\right)^2=\frac{48}{25}=1.92$（与题面「至少」不符，排除）；若误读为「不放回」，则 $X\equiv3$（题面明示「有放回」，排除）。

**脚本 `q3_draw.py` 输出（原文粘贴）：**

```
========================================================================
Q3 verification: 5 balls, 3 draws with replacement, X = #distinct labels
========================================================================
Method 1: exhaustive enumeration over all 5^3 = 125 ordered triples
  X = 1 :   5 outcomes, P =   5/125 = 1/25     = 0.040000
  X = 2 :  60 outcomes, P =  60/125 = 12/25    = 0.480000
  X = 3 :  60 outcomes, P =  60/125 = 12/25    = 0.480000
  sum of probabilities = 1
  E(X) = 61/25 = 2.440000  (exact fraction 61/25)

Method 2: linearity of expectation over 5 indicator variables
  P(ball i drawn at least once) = 1-(4/5)^3 = 1-64/125 = 61/125 = 0.488000
  E(X) = 5 * 61/125 = 61/25 = 2.440000

Method 3: complement, X = 3 - (Y2 + Y3), Yk = 1 iff k-th label already seen
  E(Y2) = 1/5 = 1/5
  E(Y3) = 1 - (4/5)^2 = 1 - 16/25 = 9/25 = 9/25
  E(X) = 3 - 1/5 - 9/25 = 61/25 = 2.440000

Cross-checks:
  three methods agree exactly: 61/25 = 2.44
  Monte-Carlo (1000000 reps, seed 20261123): mean X = 2.4403  (theory 2.44)

Alternative-reading probes (to document ambiguity handling):
  if X counted balls drawn EXACTLY once: E = 5*3*(1/5)*(4/5)^2 = 48/25 = 1.920000 (not the wording)
  if the 3 draws were WITHOUT replacement: X = 3 deterministically, E = 3. (wording says 有放回)

RESULT Q3: E(X) = 61/25 = 2.44
```

### 3.5 歧义说明

1. **$X$ 的定义（重点关注）**：采用「三次抽取中至少被取出过一次的球的个数」= 出现过的不同标号个数（$1\le X\le3$）。它与「首次出现的抽取次数」恒等（每个新标号恰对应一次首次出现，$X=3-(\text{重复出现次数})$），两种刻画同值。排除两种误读：「恰好一次」（得 $1.92$）、「抽取次数总和」（恒为 $3$）。
2. **「有放回」的概率模型**：默认每次从 5 球中等可能（均匀）抽取且各次独立。若各球概率不等 $p_i$，则 $E(X)=5-\sum_i(1-p_i)^3$，不再等于 $61/25$；题面按均匀理解。
3. **「球的个数」**：$X$ 计的是「球（标号）」的个数，不是抽取次数；标号 1–5 用于区分球。
4. **其他自设定义**：若把 $X$ 定义为「至少出现两次的球的个数」，则 $E=5\cdot\left(3\cdot\frac{1}{25}\cdot\frac45+\frac{1}{125}\right)=5\cdot\frac{13}{125}=\frac{13}{25}=0.52$——题面为「至少一次」，不采用（列出以说明定义敏感性）。

---

## 汇总表

| 题号（图内） | 题型 | 答案 | 复核方式 | 置信度 |
|---|---|---|---|---|
| 3 | 单选 | **D．$2\sqrt2$**（$e=\sqrt8$） | ① 四选项反解回代（唯一匹配 D）；② 具体双曲线 $x^2-y^2/7=1$ 的焦点—准线比恒为 $2\sqrt2$；③ 渐近线 $\sec\theta$；④ 尺度不变性（$a$ 取 4 个值） | **0.99** |
| 9 | 多选 | **BD**（$\{B,D\}$；A、C 错） | ① 坐标法逐项数值验算；② 264 组 $(a,h)$ 扫掠真值签名恒为（假,真,假,真）；③ 纯几何反证 A；④ 线面平行判定定理复核 D | **0.97**（B/D 真值 0.99，题型「多选」判定 0.9） |
| 14 | 填空 | **$\dfrac{61}{25}=2.44$** | ① 125 个有序三元组穷举（分布 5/60/60）；② 指示变量期望法；③ 首次出现补集法；④ 蒙特卡洛 $10^6$ 次；⑤ 归一化检验 | **0.99** |

---

## 复跑方式

在仓库工作区根目录执行（Windows PowerShell 5.1 或 PowerShell 7 均可）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File qa/student-showcase/math/scripts/run_all.ps1
# PowerShell 7+ 可用：pwsh -File qa/student-showcase/math/scripts/run_all.ps1
```

或分别运行（任意 Python 3，仅标准库）：

```bash
python qa/student-showcase/math/scripts/q1_hyperbola.py
python qa/student-showcase/math/scripts/q2_prism.py
python qa/student-showcase/math/scripts/q3_draw.py
```

`scripts/q1_output.txt`、`scripts/q2_output.txt`、`scripts/q3_output.txt` 为对应的保存输出（与上文粘贴一致）；`scripts/run_all.ps1` 会依次运行三个脚本并在全部成功时打印 `ALL VERIFICATION SCRIPTS PASSED`。

## 边界与声明

- 本稿只写入 `qa/student-showcase/math/` 目录（PROOFREAD.md + `scripts/`），未改动任何产品代码、证据或其他文件。
- 数学上不确定之处已在各题「歧义说明」中显式标注；题 2 的「多选」题型判定依赖真值而非原卷题型文字，已在 2.5 注明。
- 本稿未参考任何既有采集/回放结论（含 `evidence/`、`未通过项.md`、`主持人手册.md`），可与平台结论独立比对。