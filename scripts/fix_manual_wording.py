# -*- coding: utf-8 -*-
"""按独立功能验收的 3 处 MINOR 口径修订主持人手册（不触碰应用代码，发行包 HTML 哈希不变）。"""
import shutil

P = r'D:\zxsy-math-arena-showcase\主持人手册.md'
s = open(P, encoding='utf-8').read()

s = s.replace(
    '> 主持人工具：右下角 ⚙ 或快捷键 `Ctrl + Shift + H`（嘉宾界面不展示；可跳检查点、复位单案/整场、查看网络尝试次数）',
    '> 主持人工具：按 `Ctrl + Shift + H`（或登录页底部「主持人工具」）打开。嘉宾界面不展示该入口；工具内可跳检查点、复位单案/整场、查看网络尝试次数',
)
s = s.replace('3. 打开 ⚙ 主持人工具，确认', '3. 按 `Ctrl + Shift + H` 打开主持人工具，确认')
s = s.replace('⚙ →', '`Ctrl + Shift + H` →')
s = s.replace(
    '| 4 | 双击/编辑当前页标题，加一个可识别的词（如 `（演示修订版）`），点「保存」 | “老师改一页并保存。” | 顶部显示「已保存 HH:MM」；刷新后修改仍在 |',
    '| 4 | 编辑当前页标题，加一个可识别的词（如 `（演示修订版）`） | “老师改一页，自动保存。” | 顶部显示「已保存 HH:MM」（无「保存」按钮，编辑即自动保存）；刷新后修改仍在 |',
)

# 镜头 4 后补充口径说明
anchor = '---\n\n## 2. 备选切入（约 5–8 分钟）'
if anchor in s and '作业与批改默认页' not in s:
    s = s.replace(
        anchor,
        '**口径提示**：教师左导航点「作业与批改」默认进入“作业发布”，批改工作台需在该页再点「批改工作台 →」（或主持人跳检查点直达）。\n'
        '课件参数面板的 c 在不同位置保留 1 位或 3 位小数（如 4.5 / 4.472 / 8.94），属显示精度差异，派生值同源，验收以“三处同源”为准。\n\n'
        + anchor,
        1,
    )

# 主持人工具原图路径说明
s = s.replace(
    '发行包三张原图',
    '发行包三张原图',
)
anchor2 = '- 开发侧证据：`D:\\zxsy-math-arena-showcase\\evidence\\`（真实运行 run-01、数学基准、产物导出记录）'
if anchor2 in s:
    s = s.replace(
        anchor2,
        anchor2 + '\n- 主持人工具中显示的“原始采证副本”绝对路径仅在本开发机存在；演示现场请使用 `素材\\题1..3.png`（按内容哈希识别，改名不影响）。',
    )

open(P, 'w', encoding='utf-8').write(s)
print('manual updated')
shutil.copyfile(P, r'D:\zxsy-math-arena-showcase\release\主持人手册.md')
print('copied to release')
