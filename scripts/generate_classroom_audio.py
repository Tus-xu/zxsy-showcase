# -*- coding: utf-8 -*-
"""按 build-classroom-audio.mjs 产出的 jobs.json 生成 edge-tts 神经语音。

只用于构建期；运行期零依赖。生成的 mp3 放在 app/src/assets/classroom-audio/。
用法：PYTHONPATH=.work/pydeps python scripts/generate_classroom_audio.py .work/classroom-audio-jobs.json
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
CONCURRENCY = 4
RETRIES = 3


async def one(job, sem, results):
    out = ROOT / job['file']
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists() and out.stat().st_size > 1024:
        results.append((job['id'], 'skip', out.stat().st_size))
        return
    async with sem:
        last = None
        for attempt in range(1, RETRIES + 1):
            try:
                comm = edge_tts.Communicate(
                    job['text'],
                    voice=job['voice'],
                    rate=job.get('rate', '-5%'),
                    pitch=job.get('pitch', '+0Hz'),
                    volume=job.get('volume', '+0%'),
                )
                await comm.save(str(out))
                if out.exists() and out.stat().st_size > 1024:
                    results.append((job['id'], 'ok', out.stat().st_size))
                    return
                last = 'empty output'
            except Exception as e:  # noqa: BLE001 - 构建期重试并汇报
                last = str(e)
                await asyncio.sleep(0.8 * attempt)
        results.append((job['id'], f'fail: {last}', 0))


async def main():
    jobs_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '.work' / 'classroom-audio-jobs.json'
    jobs = json.loads(jobs_path.read_text(encoding='utf-8'))['jobs']
    sem = asyncio.Semaphore(CONCURRENCY)
    results = []
    await asyncio.gather(*(one(j, sem, results) for j in jobs))
    ok = sum(1 for _, st, _ in results if st in ('ok', 'skip'))
    fail = [r for r in results if r[1].startswith('fail')]
    print(f'[audio] clips={len(jobs)} ok={ok} fail={len(fail)}')
    for r in fail[:20]:
        print('  FAIL', r)
    if fail:
        raise SystemExit(1)


if __name__ == '__main__':
    asyncio.run(main())
