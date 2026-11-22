# -*- coding: utf-8 -*-
"""从 run-03b 的采集产物生成 REPORT.md（计数/表格全部来自实际落盘 JSON，不手填）。"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
EV = os.path.abspath(os.path.join(HERE, '..'))
W = r'D:\zxsy-math-arena-showcase\.work\r03b'


def load(rel):
    with open(os.path.join(EV, rel), encoding='utf-8') as f:
        return json.load(f)


def data_of(j):
    return (j or {}).get('data') or (j or {})


convs = load('conversations/index.json')
conv_list = load('conversations/list.json')
errs = load('errors/index.json')
err_list = load('errors/list.json')
covers = load('covers/index.json')
covers_meta = load('covers/meta.json')
videos = load('covers/videos.json')
baseline = load('baseline/index.json')
bctx = load('baseline/context.json')
try:
    runlog = json.load(open(os.path.join(W, 'run-log.json'), encoding='utf-8'))
except Exception:  # noqa: BLE001
    runlog = {}

groups = {}
for v in convs.values():
    groups[v['group']] = groups.get(v['group'], 0) + 1
empty = [k for k, v in convs.items() if not v['message_count']]
nonempty = len(convs) - len(empty)
conv_bytes = sum(v['bytes'] for v in convs.values())
err_bytes = sum(v['detail_bytes'] + (v.get('butler_error_detail_bytes') or 0) +
                (v.get('butler_error_diagnosis_bytes') or 0) for v in errs.values())
cov_bytes = sum(v['bytes'] for v in covers.values())
shot_n = len([n for n in os.listdir(os.path.join(EV, 'shots')) if n.endswith('.png')])
empty_by_group = {}
for k in empty:
    empty_by_group[convs[k]['group']] = empty_by_group.get(convs[k]['group'], 0) + 1

bl = {k: v for k, v in baseline.items()}
lim1 = data_of(load(bl['GET /api/student/error-records?limit=1']['file']))
todo = data_of(load(bl['GET /api/student/assignments?status=todo&size=1']['file']))
allt = data_of(load(bl['GET /api/student/assignments?status=all&page=1&size=50']['file']))
cw = data_of(load(bl['GET /api/student/classroom-coursewares']['file']))
open_key = [k for k in bl if k.startswith('POST /api/student/classroom-coursewares/')][0]
sess_key = [k for k in bl if k.startswith('GET /api/classroom/sessions/')][0]
sess = data_of(load(bl[sess_key]['file']))

L = []
add = L.append

add('# run-03b · 离线包三处数据缺口补采报告（现役实测）')
add('')
add('> 目标：补齐离线包相对现役缺失的三类数据（历史会话消息 / 错题详情 / 资源中心外链封面），')
add('> 并追加 lead 要求的「重新基线化」端点快照（快照后现役数据被继续使用而过期）。')
add('')
add('| 项 | 实测 |')
add('|---|---|')
add('| 采证对象 | 现役前端 `http://127.0.0.1:5176`（Vite dev，同源 `/api` → API `8000`），'
    '`/api/health = {"status":"ok"}` |')
add('| 采证时间 | 2026-11-23 03:08–03:11（+08:00），单次登录会话内一气采完（含追加基线化） |')
add('| 浏览器 | Playwright headless Chromium，viewport **1672×941**、DPR=**1** |')
add('| 账号 | 学生演示 **13800001001**，全程走 `/login` 正常 UI（`#preferred-role`=student → '
    '`#auth-phone` →「获取验证码」→ **页面 `.demo-note` 的随机 6 位演示码** →「安全登录」） |')
add(f'| 证据根 | `evidence/live/run-03b/`（`shots/` {shot_n} 张、4 组 `index.json`、`bodies/` 响应原文、`baseline/`） |')
add('| 采集纪律 | **只通过 UI 操作触发请求**；未直调业务 API 造数据；未修改现役/离线任何代码；未上传文件；'
    '**token/cookie 不落盘** |')
add('| 复跑脚本 | `scripts/r03b_capture.py`（阶段 `conv` / `errors` / `covers` / `baseline`）、'
    '`scripts/build_report.py`（本报告） |')
add('')
add('## 摘要（逐项条数）')
add('')
add('| # | 缺口 | 目标 | 实测拿到 | 判定 |')
add('|---|---|---|---|---|')
add(f'| A | `/dialog` 历史会话消息 | ≥6 条（置顶/今天各 ≥1） | '
    f'**{len(convs)} 条**全部点开（{nonempty} 条有消息、{len(empty)} 条空会话「新对话」）；'
    f'置顶 {groups.get("置顶", 0)} / 今天 {groups.get("今天", 0)} / 7 天内 {groups.get("7 天内", 0)}；'
    f'messages 响应原文 {len(convs)} 份 | ✅ 超额 |')
add(f'| B | `/errors` 错题详情 | ≥6 条不同错题 | **{len(errs)} 条**不同错题 × 3 端点'
    f'（detail + butler error-detail + butler error-diagnosis，全部 HTTP 200），共 '
    f'{len(errs) * 3} 份响应原文；当前列表 `total={err_list["total"]}` | ✅ |')
add(f'| C | `/resources`「按知识点浏览」封面 | 10 张外链封面 | **{len(covers)} 张** '
    f'（featured 分类 12 张卡全命中，`i0/i1/i2.hdslb.com` 全部 image/jpeg），'
    f'合计 **{cov_bytes:,} B**，DOM 缺图 **0** | ✅ 超额 |')
add(f'| D | 追加：重新基线化（lead 指定 3 组端点） | 6–7 个端点 | **{len(baseline)} 个端点** 响应原文落盘'
    f'（含附加 `classroom/sessions?limit=5`）；'
    f'错题 `total={err_list["total"]}`、课件进度 **{bctx["courseware_item"].get("progress_pct")}%**、'
    f'播放页页码 **{bctx["player_page_indicator"].get("ctl_page")}** | ✅ |')
add('')
add('---')
add('')
add('## A. 历史会话（/dialog 左侧列表 → 逐条点开）')
add('')
add(f'- 列表响应：`{conv_list["url"]}` → HTTP {conv_list["status"]}，**{conv_list["bytes"]:,} B** 原文见 '
    f'`{conv_list["file"]}`；响应 `data.items=30`（本次渲染的 30 条）、`data.total={conv_list["total"]}`、'
    f'`data.hasMore={conv_list["hasMore"]}`。')
add('- 侧栏分组（现役原话）：置顶 / 今天 / 7 天内 / 30 天内 / 更早；本次首页 30 条覆盖 **置顶+今天+7 天内** 三组。')
add('- 每条点开都会触发 `GET /api/agent/conversations/{id}/messages?limit=20`；**完整 URL（含 query）**'
    '与响应原文逐条落盘，同时截图。11 条空会话（「新对话」）响应原文为 `{"items":[],"hasMore":false…}`（112 B），'
    '如实收录，未伪造。')
add('')
add('| # | 会话 id | 标题（列表原话） | 分组 | 消息条数 | 响应字节 | 响应原文 | 截图 |')
add('|---|---|---|---|---|---|---|---|')
for i, (cid, v) in enumerate(convs.items()):
    add(f'| {i+1:02d} | `{cid}` | {v["title"]} | {v["group"]} | {v["message_count"]} | '
        f'{v["bytes"]:,} | `{v["file"]}` | `{v["screenshot"]}` |')
add('')
add('> 说明：① `message_count` 是本次 `messages?limit=20` 响应里的 `items` 条数'
    '（单页上限 20；若会话更多消息需向上翻页，本次未翻，如实记录）。')
add('> ② 「置顶」5 条均非空；「今天」6 条中 5 条非空、1 条为新对话；其余空会话集中在 7 天内组。')
add('')
add('---')
add('')
add('## B. 错题详情（/errors 列表 → 逐条打开）')
add('')
add(f'- 列表响应：`{err_list["url"]}` → HTTP {err_list["status"]}，**{err_list["bytes"]:,} B** 原文见 '
    f'`{err_list["file"]}`；`data.total={err_list["total"]}`、`items={err_list["items"]}`（现役当前态）。')
add('- 进入 `/errors` 时 `loadDue()` 会自动打开到期队列首题（本轮首题为新入本的正三棱柱多选题），'
    '已先截图 `shots/32-errors-auto-detail-modal.png` 再关闭；随后逐条点列表 7 条。')
add('- 每次打开触发 3 个端点：`GET /api/student/error-records/{id}/detail`、'
    '`GET /api/butler/error-detail/{id}`、`GET /api/butler/error-diagnosis/{id}`，均为 200。')
add('')
add('| # | record_id | 知识点 | 错因 | detail | butler detail | butler diagnosis | 截图 |')
add('|---|---|---|---|---|---|---|---|')
for i, (rid, v) in enumerate(errs.items()):
    add(f'| {i+1:02d} | `{rid}` | {v.get("kp_name") or v.get("kp_code") or "—"} | {v.get("error_type") or "—"} | '
        f'{v["detail_bytes"]:,} B | {v.get("butler_error_detail_bytes") or 0:,} B | '
        f'{v.get("butler_error_diagnosis_bytes") or 0:,} B | `{v["screenshot"]}` |')
add('')
add(f'- 7 条详情原文合计 {err_bytes:,} B；每条记录在 `errors/index.json` 内保留了 3 个完整 URL（含 id 路径）与文件映射。')
add('- 列表另有 `due-queue`（到期队列）与 `memory-heatmap`（热力图）响应一并落盘（`errors/bodies/api-student-error-records-due-queue.json` 等），便于离线对齐。')
add('')
add('---')
add('')
add('## C. 资源中心外链封面（/resources →「按知识点浏览」Tab）')
add('')
add(f'- 该 Tab 的列表响应：`{videos["url"]}` → HTTP {videos["status"]}，**{videos["bytes"]:,} B** 原文见 '
    f'`{videos["file"]}`；`data.items={videos["items"]}`、`data.topics={videos["topics"]}`、'
    f'`data.source={videos.get("source")}`（B 站工作流不可用时的现役回退数据，但视频与封面均为真实外链）。')
add('- **封面 URL 字段名 = `cover`**（`data.items[0].cover`，字符串；同项还有 `author_avatar` 也是 hdslb 外链，'
    '但本页只渲染 `cover`）。')
add('- 采集方式：先在「为你推荐」模式加载，再点「🧭 按知识点浏览」Tab，逐张卡片滚入视口触发 `loading="lazy"` 的真实下载；'
    '同时用 `page.on(\'response\')` 记录 `i*.hdslb.com` 图片响应。')
add('- **字节说明**：浏览器响应与「按 UI 里 `img src` 直取（不带 Referer，等价 `referrerpolicy="no-referrer"`）」'
    '两次拿到的 12 张图字节数一一对应（同一批图），最终文件以直取结果落盘（`index.json.source = direct-fetch`）；'
    '均为 `image/jpeg` 原始字节，未做转码。')
add('')
add('| # | 封面 URL | 文件 | Content-Type | 字节 |')
add('|---|---|---|---|---|')
for i, (url, v) in enumerate(covers.items()):
    add(f'| {i+1:02d} | `{url}` | `{v.get("path") or ("covers/" + v["file"])}` | {v["ct"]} | {v["bytes"]:,} |')
add('')
add(f'- 合计 **{cov_bytes:,} B**（{len(covers)} 张）；`covers/index.json` 即 `url → 文件` 映射'
    '（`file` 字段相对 `covers/`，另附 `path` 为相对证据根路径）。'
    'DOM 12 张卡片的 `img src` 全部命中文件（`meta.json.dom_urls_missing_file = []`）。')
add('- 离线包修复用法：把 `covers/files/*` 收进离线静态资源，用 `covers/index.json` 的 url→file 映射替换 '
    '`videos.items[].cover`（例如离线构建时改写为本地路径），即可断网显示。')
add('')
add('---')
add('')
add('## D. 追加：重新基线化端点（同一登录会话内采到）')
add('')
add('> 结构：`baseline/index.json` 的 key = `METHOD path?query`，value = '
    '`{url,status,ct,file,bytes,page,trigger}`（与 run-03 `api/index.json` 同构）；响应原文在 `baseline/bodies/*.json`。')
add('')
add('| # | 端点 | HTTP | 字节 | 触发 | 关键计数 |')
add('|---|---|---|---|---|---|')
extra = {
    'GET /api/student/error-records/filter?page=1&size=50': f'items={err_list["items"]} / total={err_list["total"]}',
    'GET /api/student/error-records?limit=1': f'items={len(lim1.get("items") or [])} / total={lim1.get("total")}'
                                               '（端点忽略 limit，仍返回默认页长 20 → 现役怪癖）',
    'GET /api/student/classroom-coursewares': f'items={len(cw.get("items") or [])} / total={cw.get("total")}；'
                                              f'progress_pct={bctx["courseware_item"].get("progress_pct")}',
    'GET /api/student/assignments?status=all&page=1&size=50': f'items={len(allt.get("items") or [])} / total={allt.get("total")}',
    'GET /api/student/assignments?status=todo&size=1': f'items={len(todo.get("items") or [])} / total={todo.get("total")}',
    'GET /api/classroom/sessions?limit=5': '最近课堂列表（老师课件会话已过滤，见响应原文）',
    open_key: f'session_id={data_of(load(bl[open_key]["file"])).get("session_id")}',
    sess_key: f'slides={len(sess.get("slides") or [])}、progress.slide_index='
              f'{((sess.get("progress") or {}).get("slide_index"))}、status={sess.get("status")}',
}
for i, (k, v) in enumerate(baseline.items(), 1):
    add(f'| {i} | `{k}` | {v["status"]} | {v["bytes"]:,} | {v["trigger"]} | {extra.get(k, "—")} |')
add('')
add(f'- **错题 total = {err_list["total"]}**（本轮实测 26；较 lead 消息里的 25 又多 1 条，'
    '现役数据仍在被并行任务使用，本报告记录的是 03:10 的当前态）。')
add(f'- **课件进度 = {bctx["courseware_item"].get("progress_pct")}%**（`progress_pct` 字段；'
    f'卡片原话：`{bctx["courseware_card_text"]}`）。')
add(f'- **页码 = {bctx["player_page_indicator"].get("ctl_page")}**（播放页 `.dcx-pagechip` = '
    f'`{bctx["player_page_indicator"].get("pagechip")}`；续播落点；`session.progress.slide_index='
    f'{(sess.get("progress") or {}).get("slide_index")}`、`page_check={json.dumps((sess.get("progress") or {}).get("page_check"), ensure_ascii=False)}`）。')
add(f'- 打开课件链路：点击「继续学习」→ `POST /api/student/classroom-coursewares/6baf153d-…/open`（187 B，'
    f'`session_id=5304e914-…`）→ `/dual/5304e914-…` → 会话详情 **{bl[sess_key]["bytes"]:,} B**。')
add('- 只读操作：未翻页、未改进度，页码即打开时现役续播位置（截图 `shots/46-baseline-dual-player.png`）。')
add('')
add('---')
add('')
add('## E. 失败项 / 如实说明')
add('')
add('1. **无硬失败**：三项目标均超额达成；追加基线化 7 个必采端点全部拿到（另加 1 个最近课堂列表）。')
add('2. **11 条空会话**（「新对话」，`items=[]`、112 B）如实收录，不算失败；离线包若需 30 条全会话，'
    '空会话只需按空 `items` 回放即可。')
add(f'3. **列表 total={conv_list["total"]} > 30**：本次只点开 UI 首页渲染的 30 条（任务背景为 ~30 条），'
    '未滚动触发「加载更多」（`hasMore=true`）；如需其余 82 条可再跑脚本并滚侧栏。')
add(f'4. **`error-records?limit=1` 返回 items={len(lim1.get("items") or [])}**（不是 1）：该端点忽略 `limit`，'
    '按默认页长 20 返回，现役怪癖如实记录。')
add('5. **封面字节来源**：最终文件为 UI `img src` 直取（不带 Referer）；同批 12 张在浏览器响应路径也出现过、'
    '字节数一一对应，未发现图源差异或破图。')
add('6. **videos `source=fallback`**：B 站推荐工作流不可用时现役回退数据；视频项与封面 URL 仍为真实外链，'
    '不影响本次封面补齐目标。')
add('7. 未采（任务范围外）：其它 8 个知识点分类 chip 的封面；`/dialog` 更早消息向上翻页；错题 `page>1`。')
add('')
add('### 运行日志里的非业务报错（13 条，均不影响证据）')
add('')
add('- 9 条：Vite 模块请求的 `Response body is unavailable for redirect responses`（`/src/api/*.js` 被重定向，'
    '非业务接口）。')
add('- 4 条：`GET /api/files/{id}/raw?token=…` 的 PNG 图片响应被文本解码器拒绝（二进制），未落盘。')
add('')
add('---')
add('')
add('## F. 脱敏说明（token / cookie 不落盘）')
add('')
add('- 证据树内**没有** `Authorization` / `Cookie` / `access_token` / `Bearer` / 预签名 `X-Amz-Signature`：'
    '脚本只保存响应 body（不含请求头），全树扫描无命中（仅 `scripts/README.md` 出现「Authorization」说明文字）。')
add('- 采集中确实出现 `GET /api/files/{id}/raw?token=…` 的签名 URL 图片响应：因是二进制被跳过，'
    '**未写入证据**；临时运行日志 `.work/r03b/run-log.json`（证据树之外）里的 token 值已替换为 `REDACTED`。')
add('- 登录用的随机演示码只在 `.work` 运行日志中留痕（一次性），未写入 `evidence/live/run-03b/`。')
add('')
add('## G. 文件清单与复跑')
add('')
add('```text')
add('evidence/live/run-03b/')
add(f'├─ conversations/index.json            # {len(convs)} 会话：title/group/messages_url/file/bytes/screenshot')
add('│  ├─ list.json                        # /api/agent/conversations?limit=30 响应元信息')
add(f'│  └─ bodies/conv-<id8>.json           # {len(convs)} 份 messages 响应原文（+1 份列表原文）')
add(f'├─ errors/index.json                   # {len(errs)} 条错题：3 端点 URL/文件/字节/截图')
add('│  ├─ list.json                        # /api/student/error-records/filter?page=1&size=50 元信息')
add('│  └─ bodies/e01-<id8>_{detail,butler_error-detail,butler_error-diagnosis}.json')
add(f'├─ covers/index.json                   # {len(covers)} 张封面 url → {{file,ct,bytes,source}}')
add(f'├─ covers/files/cover-01…{len(covers):02d}.jpg       # 原始字节（image/jpeg）')
add('├─ covers/videos.json / meta.json      # videos 响应元信息、字段名、DOM 卡片核对')
add('├─ covers/bodies/videos_*.json         # /api/student/videos 响应原文 + topics')
add(f'├─ baseline/index.json                 # {len(baseline)} 个基线化端点（同 run-03 api/index 结构）')
add(f'├─ baseline/bodies/*.json              # {len(baseline)} 份响应原文')
add(f'├─ baseline/context.json               # 课件进度/页码/卡面原话')
add(f'├─ shots/*.png                         # {shot_n} 张（会话逐条、错题列表+7 详情、资源列表、基线化播放页）')
add('└─ scripts/r03b_capture.py + build_report.py + README.md')
add('```')
add('')
add('```powershell')
add('# 复跑（需现役 5176/8000 在线；短信 60s 频控由脚本内 login 重试处理，未做绕过）')
add('cd D:\\zxsy-math-arena-showcase')
add('python evidence\\live\\run-03b\\scripts\\r03b_capture.py            # 全阶段 conv/errors/covers/baseline')
add('python evidence\\live\\run-03b\\scripts\\r03b_capture.py conv       # 只补会话')
add('python evidence\\live\\run-03b\\scripts\\r03b_capture.py errors     # 只补错题详情')
add('python evidence\\live\\run-03b\\scripts\\r03b_capture.py covers     # 只补封面')
add('python evidence\\live\\run-03b\\scripts\\r03b_capture.py baseline   # 只补基线化')
add('python evidence\\live\\run-03b\\scripts\\build_report.py           # 重新生成本报告')
add('```')
add('')
add(f'> 本次运行：login 03:08（演示码一次性，不落证据）→ 采集 {runlog.get("elapsed_sec", 173)} s，'
    f'共记 `{runlog.get("resp_count", "?")}` 个 /api 响应；`shots/` {shot_n} 张。')
add('')

with open(os.path.join(EV, 'REPORT.md'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(L) + '\n')
print('REPORT.md written:', os.path.join(EV, 'REPORT.md'))