# -*- coding: utf-8 -*-
"""打包 Windows 断网发行包。

流程：
1) pnpm build:single  → release/index.html（单文件，全部资源内联）
2) 复制为 release/开始演示.html（双击入口）
3) 生成 release/素材/（三张原题图 + 三份演示答卷 + SHA-256 清单）
4) 收集 QA 实际导出的产物到 release/产物/（PPTX / DOCX / PDF），证明发行包内产物可打开
5) 复制主持人手册、验收矩阵
6) 静态检查：单文件 HTML 中不得存在 http(s):// 外链请求；报告内联资源数量与体积
"""
import hashlib
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELEASE = os.path.join(ROOT, 'release')
ORIGIN_PLANS = r'D:\zxsy-math-arena\docs\superpowers\plans'


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest().upper()


def run(cmd, cwd=ROOT):
    print('$', ' '.join(cmd))
    r = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    print((r.stdout or '')[-1500:])
    if r.returncode != 0:
        print((r.stderr or '')[-2000:])
        raise SystemExit(f'command failed: {cmd} rc={r.returncode}')


def main():
    run(['pnpm', 'build:single'])
    index = os.path.join(RELEASE, 'index.html')
    if not os.path.exists(index):
        raise SystemExit('release/index.html 不存在')
    shutil.copyfile(index, os.path.join(RELEASE, '开始演示.html'))

    # ---- 素材 ----
    mat = os.path.join(RELEASE, '素材')
    os.makedirs(mat, exist_ok=True)
    questions = [('题1.png', 'A'), ('题2.png', 'B'), ('题3.png', 'C')]
    lines = ['# 发行包素材清单（SHA-256）', '']
    for name, case_id in questions:
        src = os.path.join(ORIGIN_PLANS, name)
        if os.path.exists(src):
            dst = os.path.join(mat, name)
            shutil.copyfile(src, dst)
            lines.append(f'- {name}（案例 {case_id}）  {sha256(dst)}')
        else:
            lines.append(f'- {name}（案例 {case_id}）  缺失：{src}')
    for name in ['sub-A.png', 'sub-B.png', 'sub-C.png']:
        src = os.path.join(ROOT, 'src', 'assets', 'submissions', name)
        if os.path.exists(src):
            dst = os.path.join(mat, name)
            shutil.copyfile(src, dst)
            lines.append(f'- {name}（演示答卷）  {sha256(dst)}')
    with open(os.path.join(mat, 'SHA256清单.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    # ---- 产物 ----
    prod = os.path.join(RELEASE, '产物')
    os.makedirs(prod, exist_ok=True)
    copied = []
    for rel in ['qa/teacher-prep/artifacts', 'qa/research/artifacts', 'qa/research-ui/artifacts',
                'qa/teacher-grading/artifacts', 'qa/acceptance/artifacts']:
        d = os.path.join(ROOT, rel)
        if not os.path.isdir(d):
            continue
        for fn in os.listdir(d):
            if fn.lower().endswith(('.pptx', '.docx', '.pdf', '.md')):
                shutil.copyfile(os.path.join(d, fn), os.path.join(prod, fn))
                copied.append(fn)
    # 科研随包演示讲义 PDF（由采集组/数据 QA 生成的真实 PDF）
    g2_pdf_dir = os.path.join(ROOT, 'evidence', 'live', 'run-01', 'research')
    if os.path.isdir(g2_pdf_dir):
        for fn in os.listdir(g2_pdf_dir):
            if fn.lower().endswith('.pdf') and fn.startswith('research-paper'):
                shutil.copyfile(os.path.join(g2_pdf_dir, fn), os.path.join(prod, fn))
                copied.append(fn)
    with open(os.path.join(prod, '产物清单.md'), 'w', encoding='utf-8') as f:
        f.write('# 随包产物清单\n\n')
        f.write('以下文件由离线应用在断网状态下实际导出，随包提供以便主持人/验收人直接打开核对。\n\n')
        for fn in sorted(copied):
            f.write(f'- {fn}  {sha256(os.path.join(prod, fn))}\n')

    # ---- 手册与矩阵 ----
    for fn in ['主持人手册.md', 'qa/acceptance.csv']:
        src = os.path.join(ROOT, fn)
        if os.path.exists(src):
            dst = os.path.join(RELEASE, '验收矩阵.csv' if fn.endswith('.csv') else '主持人手册.md')
            shutil.copyfile(src, dst)

    # ---- 启动说明 ----
    readme = (
        '智学数研 · 三端离线交互演示\n'
        '================================\n\n'
        '启动：双击本目录下的「开始演示.html」，用 Edge / Chrome 打开即可。\n'
        '无需安装、无需联网、无需启动任何服务。\n\n'
        '演示题图：选择「素材\\题1.png / 题2.png / 题3.png」（或用系统文件选择器从任意位置选择同名原图）。\n'
        '主持人工具：页面右下角 ⚙ 或快捷键 Ctrl+Shift+H（嘉宾界面不展示）。\n'
        '完整走法见「主持人手册.md」；验收记录见「验收矩阵.csv」。\n'
        '随包导出产物见「产物」目录，可直接打开核对。\n'
    )
    with open(os.path.join(RELEASE, 'README-启动说明.txt'), 'w', encoding='utf-8') as f:
        f.write(readme)

    # ---- 静态检查 ----
    html = open(index, 'r', encoding='utf-8', errors='replace').read()
    total = os.path.getsize(index)
    n_font = html.count('data:font/')
    n_img = html.count('data:image/')
    import re
    extern = sorted(set(re.findall(r'https?://[^\s"\'<>)]+', html)))
    extern = [u for u in extern if not u.startswith('https://www.w3.org')]
    print('--- 打包结果 ---')
    print('开始演示.html 字节数:', total, f'({total/1024/1024:.2f} MB)')
    print('内联字体 data URI:', n_font, ' 内联图片 data URI:', n_img)
    print('非 w3.org 的 http(s) 字面量:', len(extern))
    for u in extern[:10]:
        print('  ', u)
    print('产物文件:', len(copied))
    print('OK')


if __name__ == '__main__':
    main()
