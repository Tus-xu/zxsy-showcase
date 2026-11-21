# Evidence 目录说明（run-01 · 2026-11-21）

本目录是 Mathesis 三端离线演示项目的**证据目录**。原系统只用于取证；展示改动全部在独立项目 `D:\zxsy-math-arena-showcase`。

## 目录结构

```
evidence/
├── solutions/
│   ├── blind/solver-1|2/        两名独立解题者的盲解（干净上下文，仅三张原图；各自 solutions.md + 图片副本）
│   └── sealed/math-baseline.md|json   主控核对后封存的数学基准（2026-11-21 02:15，首次真实上传前）
├── live/run-01/                 现役系统真实运行（本次唯一 run；重新采集须开新 run 目录）
│   ├── inventory/               三端正常登录入口盘点：routes.csv、entry-summary.md、76+ 张逐页截图、登录截图
│   ├── student/guide/A|B|C/     三题真实上传：逐轮截图、transcript.md、defects.md、分支（branch-wrong/branch-help）
│   ├── student/smoke/           AI 链路修复后的文本/视觉 smoke
│   ├── student/dual/            学生自主双师课堂实拍（本轮成功场景）
│   ├── student/assign/          学生端作业/批改回看实拍
│   ├── teacher/publish/         教师备课/发布/生成实拍与缺陷（G2-1）
│   ├── teacher/assign/          作业发布与批改工作台实拍与缺陷（G2-2）
│   ├── research/                科研端导入/阅读/写作实拍与缺陷（G2-3），含 3 份自撰讲义 PDF 与哈希
│   ├── student/guide/G1-SUMMARY.md  三题实传总表
│   └── G2-SUMMARY.md            G2 全场景总表
├── curation.csv                 逐项修订台账（curation 主表）
├── curation-g2.csv              G2 实测阶段的补充修订台账
└── showcase/                    展示版（发行包）实际运行截图（离线验收 + 各实现组 QA）
```

## 真实 / 失败 / 未尝试 的统计口径

- **真实成功**：学生自主双师课堂（G2-4）等。
- **真实失败（有证据锚点）**：A/B/C 三题引导缺陷（A-D1~D3、B-D1/D2、C-D1~D3）；教师备课/发布（G2-1-D1~D5、G2-5-D1）；作业发布与批改回流（G2-2-D1~D3）；科研 READ/WRITE（G2-3-D1/D2）。
- **未尝试 / 待证**：学生作业作答页 `/tasks/:id`、模考作答 `/exam/:id`、双师内 OCR 上传通道、教师工作台 materials/overview/chat 的触发点（见 `inventory/routes.csv` 的“本轮待证”）。

## 封存与只读

- `solutions/sealed/` 与 `live/run-01/` 在采集完成后只读封存；如需重采，另开 run 目录，不覆盖本 run。
- 真实凭据不落证据：登录记录仅保留演示手机号与页面显示的验证码机制，不含 token/密钥；`.env` 改动有备份与哈希记录（`.work/backup/`）。

## 与展示版的对应关系

`curation.csv` 的每一行给出：真实缺陷锚点 → 独立解/设计依据 → 展示稿（修订）→ 影响对象 → 独立审核人 → 最终离线证据（本目录 `showcase/` 或 `qa/`）。验收矩阵见 `qa/acceptance.csv`。
