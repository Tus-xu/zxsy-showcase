# -*- coding: utf-8 -*-
"""把 index.html + src/app.css + src/app.js 打成单个离线 HTML。

产物：学生端V3原型.html（双击即用，file:// 下零请求）
用法：python v3-prototype/build.py
"""
import hashlib
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, '学生端V3原型.html')


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def main():
    html = read(os.path.join(HERE, 'index.html'))
    css = read(os.path.join(SRC, 'app.css'))
    js = read(os.path.join(SRC, 'app.js'))

    # 外链换内联；用 </style > 与 </script > 防止正文里出现终止标签
    assert '<link rel="stylesheet" href="src/app.css">' in html
    html = html.replace(
        '<link rel="stylesheet" href="src/app.css">',
        '<style>\n' + css.replace('</style', '</style ') + '\n</style>',
    )
    assert '<script src="src/app.js"></script>' in html
    html = html.replace(
        '<script src="src/app.js"></script>',
        '<script>\n' + js.replace('</script', '</script ') + '\n</script>',
    )

    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

    data = open(OUT, 'rb').read()
    # 静态检查：不得有任何外链资源
    text = data.decode('utf-8')
    bad = re.findall(r'(?:src|href)="(https?://[^"]+)"', text)
    print(f'产物：{OUT}')
    print(f'大小：{len(data):,} 字节')
    print(f'SHA-256：{hashlib.sha256(data).hexdigest()}')
    print('外链资源：' + ('无' if not bad else '、'.join(bad)))


if __name__ == '__main__':
    main()
