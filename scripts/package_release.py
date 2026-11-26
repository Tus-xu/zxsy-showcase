# -*- coding: utf-8 -*-
"""打包离线发行包（唯一对外交付入口）。

构成：
  release/开始演示.html      现役前端 fork 的单文件离线构建（file:// 双击即用）
  release/素材/题1..3.png    三张原题图（与现役上传采证同源、逐字节一致）
  release/主持人手册.md      录制讲解、学生预设练习与三端操作说明
  release/现役离线对照表.md  逐项对照（现役证据 → 离线状态）
  release/未通过项.md        现役阻塞/未采证项，如实登记
  release/README-启动说明.txt

用法：python scripts/package_release.py
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'app')
RELEASE = os.path.join(ROOT, 'release')
# 题图只从演示仓库内取（app/src/assets/showcase/ti1..3.png 与采证原图逐字节一致）。
# 禁止回读原真实项目 D:\zxsy-math-arena（原项目保护规则）。
ASSET_DIR = os.path.join(APP, 'src', 'assets', 'showcase')

ENTRY_SRC = os.path.join(APP, 'dist-offline', 'index.html')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def build():
    env = dict(os.environ)
    env.update({
        'VITE_OFFLINE': '1',
        'VITE_PREP_SURFACE': 'immersive',
        'VITE_RESEARCH_SURFACE': 'immersive',
    })
    print('[1/5] 构建离线单文件 …')
    r = subprocess.run(['pnpm', 'exec', 'vite', 'build', '--config', 'vite.config.offline.mjs'],
                       cwd=APP, env=env, shell=True)
    if r.returncode != 0:
        raise SystemExit(f'构建失败 exit={r.returncode}')
    if not os.path.exists(ENTRY_SRC):
        raise SystemExit(f'未生成构建产物：{ENTRY_SRC}')


def assemble():
    print('[2/5] 组装 release/ …')
    os.makedirs(RELEASE, exist_ok=True)
    # 清理旧的展示版遗留（旧方案的伪造内容必须撤下）
    for name in ('产物', '验收矩阵.csv', 'index.html'):
        p = os.path.join(RELEASE, name)
        if os.path.isdir(p):
            shutil.rmtree(p)
        elif os.path.exists(p):
            os.remove(p)

    shutil.copyfile(ENTRY_SRC, os.path.join(RELEASE, '开始演示.html'))

    mat = os.path.join(RELEASE, '素材')
    if os.path.isdir(mat):
        # 先清空：旧版自造素材（如演示答卷图片）必须撤下，不能随包
        for fn in os.listdir(mat):
            fp = os.path.join(mat, fn)
            if os.path.isfile(fp):
                os.remove(fp)
    os.makedirs(mat, exist_ok=True)
    for i in (1, 2, 3):
        src = os.path.join(ASSET_DIR, f'ti{i}.png')
        if not os.path.exists(src):
            raise SystemExit(f'缺少随包题图 {src}（应与 release 素材逐字节一致；不得回读原真实项目）')
        shutil.copyfile(src, os.path.join(mat, f'题{i}.png'))

    # 素材清单（只登记随包的三张题图；哈希匹配仅内部使用，界面不显示）
    manifest = ['# 素材 SHA-256 清单', '', '| 文件 | 字节 | SHA-256 |', '|---|---|---|']
    for i in (1, 2, 3):
        p = os.path.join(mat, f'题{i}.png')
        if os.path.exists(p):
            manifest.append(f'| 题{i}.png | {os.path.getsize(p)} | `{sha256(p)}` |')
    manifest += ['', '说明：三张题图与现役 run-02 上传采证所用文件逐字节一致；'
                 '离线回放层按上传请求里的 sha256 匹配回放数据（匹配逻辑仅在内部，界面不显示哈希）。']
    with open(os.path.join(mat, 'SHA256清单.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(manifest) + '\n')

    for name in ('主持人手册.md', '现役离线对照表.md', '未通过项.md'):
        src = os.path.join(ROOT, name)
        if os.path.exists(src):
            shutil.copyfile(src, os.path.join(RELEASE, name))
        else:
            print(f'  ⚠ 缺少 {name}')


def write_readme(entry_hash, entry_size):
    txt = f"""Mathesis 离线演示（现役复刻版）
================================

启动方式
  1. 把整个 release 目录复制到任意路径（无需安装、无需联网、无需启动服务）
  2. 双击「开始演示.html」，用浏览器打开
  3. 登录页「进入身份」选择 学生端/教师端/科研端，手机号任填演示号，
     点「获取验证码」后，页面会显示本次演示验证码（离线固定为 246810），填入即可进入

演示脚本     主持人手册.md
逐项对照     现役离线对照表.md（每个页面/控件对应的现役实测证据）
未通过项     未通过项.md（现役系统本身阻塞或本轮未采证的项，离线不编造）
原题图       素材/题1.png（双曲线）、题2.png（正三棱柱）、题3.png（有放回取球）

本包特性
  - 单文件 HTML，全资源内联，file:// 直接运行
  - 断网可用，沿用智学数研的三端入口
  - 学生端侧栏「体验分类」：三张真实题图 × 知识问答 / 错题本 / 举一反三 / 引导式解题，共 12 个
    预填对话；点发送逐轮流式推进，走完可重新体验
  - 练题中心三套专项题组（双曲线 / 导数 / 三角），判分后内联正解与解析
  - 双师课堂三套真实 PPT 语义课件，预填主题 → 生成 → 播放，中文语音讲解
  - 新对话里「导数与极值」主线的自由问答（离线预设内容 + 本地真实计算；范围有限）

版本
  构建时间：{__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
  入口 SHA-256：{entry_hash}
  文件大小：{entry_size:,} 字节
"""
    with open(os.path.join(RELEASE, 'README-启动说明.txt'), 'w', encoding='utf-8') as f:
        f.write(txt)


def static_check():
    print('[3/5] 静态检查 …')
    src = os.path.join(RELEASE, '开始演示.html')
    with open(src, encoding='utf-8', errors='replace') as f:
        html = f.read()
    problems = []
    # 只看文档 <head>：body 内的字符串可能包含导出模板用的 CDN 片段（现役导出链路在离线不可达）
    head = html.split('</head>')[0] if '</head>' in html else html[:4000]
    for pat in ('<script src="http', '<link rel="stylesheet" href="http'):
        if pat in head:
            problems.append(f'head 存在外链资源：{pat}')
    return problems


def main():
    build()
    assemble()
    problems = static_check()
    entry = os.path.join(RELEASE, '开始演示.html')
    h, size = sha256(entry), os.path.getsize(entry)
    write_readme(h, size)
    print('[4/5] 发行包内容：')
    for name in sorted(os.listdir(RELEASE)):
        p = os.path.join(RELEASE, name)
        if os.path.isdir(p):
            print(f'  {name}/  ({len(os.listdir(p))} 个文件)')
        else:
            print(f'  {name}  ({os.path.getsize(p):,} B)')
    print(f'[5/5] 入口 SHA-256 = {h}')
    if problems:
        print('静态检查问题：')
        for x in problems:
            print('  -', x)
        return 1
    print('OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
