# 学生端 · 练习/错题/知识库/资源/我的 验收报告（2026-11-21）

- 范围：PracticeView / ErrorsView / LibraryView / ResourcesView / MeView + src/data/practice.js + src/data/library.js + StudentThemeScope。
- 构建：`pnpm exec vite build --outDir dist-student-practice` 成功（2026-11-21 03:13，exit 0）。
- 构建产物验证：`pnpm exec vite preview --outDir dist-student-practice --port 5202` + `verify_dist.py`：5/5 页面渲染、console error 0。
- 开发实测：`pnpm dev --port 5201` + `qa_student_practice.py`（1672×941 / DPR1）：33/33 断言通过，网络尝试 0、console error 0。
- 覆盖：练习错/对/部分正确判分与错因、刷新恢复；错题自动弹层/定位/重开引导/标记掌握/刷新保留；知识库入库→就绪→切片→选中提问→引用原文定位→未找到提示→刷新保留；资源中心讲义阅读/标记已读/“无随包视频”说明；我的四 Tab（报告/地图/反馈/设置主题字号真实生效并刷新保留）；主持人整场复位恢复种子状态。
- 数学：`verify_math.py` 独立复算 20/20 通过（A 2√2、B 坐标验算、C 61/25 与变式 369/125）。
- 已知缺口：① 首轮曾因 `src/data/research.js` 语法错误整包白屏，已由 lead 修复；② dev 实测曾因本页 `group.items` 未定义白屏，已修复并用 dist 复验；③ harness.html 为 QA 备用入口（主入口正常时脚本自动走主入口），不进入发布包。
