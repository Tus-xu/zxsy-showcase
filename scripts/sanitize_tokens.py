# -*- coding: utf-8 -*-
"""发行前脱敏：把采证 fixture / 证据中的真实 JWT 与常见密钥替换为占位符。

规则（只替换、不破坏结构）：
  - JWT（eyJ...eyJ...签名）→ REDACTED_JWT
  - Authorization: Bearer xxx → Bearer REDACTED
  - access_token / refresh_token 字段值（非占位符）→ REDACTED_TOKEN
  - sk-… / ghp_… / gho_… / AKIA… → REDACTED_KEY

用法：python scripts/sanitize_tokens.py [--dry]
"""
import json
import os
import re
import sys

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = '--dry' in sys.argv
ROOTS = [
    os.path.join(WT, 'app', 'src', 'offline', 'fixtures'),
    os.path.join(WT, 'evidence', 'live', 'run-03'),
    os.path.join(WT, 'evidence', 'live', 'run-03b'),
    os.path.join(WT, 'qa', 'student-showcase'),
]

JWT = re.compile(r'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}')
BEARER = re.compile(r'Bearer\s+(?!REDACTED)[A-Za-z0-9._-]{16,}')
TOKEN_FIELD = re.compile(r'("(?:access_token|refresh_token|id_token|token)"\s*:\s*")([^"]{20,})(")')
KEYS = re.compile(r'\b(sk-[A-Za-z0-9]{20,}|gh[po]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b')

TEXT_EXT = {'.json', '.txt', '.md', '.csv', '.py', '.log'}


def scrub(text):
    n = 0
    text, k = JWT.subn('REDACTED_JWT', text)
    n += k
    text, k = BEARER.subn('Bearer REDACTED', text)
    n += k
    text, k = TOKEN_FIELD.subn(lambda m: m.group(1) + 'REDACTED_TOKEN' + m.group(3), text)
    n += k
    text, k = KEYS.subn('REDACTED_KEY', text)
    n += k
    return text, n


total_files = 0
total_hits = 0
changed = []
for root in ROOTS:
    for dp, _, fs in os.walk(root):
        for f in fs:
            p = os.path.join(dp, f)
            if os.path.splitext(f)[1].lower() not in TEXT_EXT:
                continue
            if '_profile' in p:
                continue
            try:
                text = open(p, encoding='utf-8', errors='strict').read()
            except Exception:
                continue
            new, n = scrub(text)
            if n:
                total_files += 1
                total_hits += n
                changed.append((os.path.relpath(p, WT), n))
                if not DRY:
                    open(p, 'w', encoding='utf-8').write(new)

print(json.dumps({'dry': DRY, 'files_changed': total_files, 'replacements': total_hits,
                  'sample': changed[:12]}, ensure_ascii=False, indent=1))