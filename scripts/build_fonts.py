#!/usr/bin/env python3
"""自托管字体子集化构建器（毒舌 7.7 / 4.4：离线 + 出版级兼得）

- 英文正文/标题：New Computer Modern（TeX 血统衬线，Book/SemiBold/Italic 共 4 字重）
- 中文正文/标题：思源宋体（Source Han Serif SC，Regular/Bold 2 字重）
- 全部按项目实际用字（216 页转录 + 界面标点）子集化 → woff2，零外部请求

用法：python scripts/build_fonts.py
输出：assets/fonts/*.woff2（构建产物，全量 OTF 不入库）
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_SRC = r'D:\Downloads\chrome'
OUT = os.path.join(ROOT, 'assets', 'fonts')
EN_CHARSET_ALL = (
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    ' .,:;!?()[]{}<>"\'`~@#$%^&*_+-=//\\|'
    '\u2018\u2019\u201c\u201d\u2013\u2014\u2026\u00a0\u00a9\u00ae\u00b0\u00d7\u00f7'
    '\u00e0\u00e1\u00e9\u00ed\u00f3\u00f4\u00f9\u00fa\u00fc\u00df'
    '\u2190\u2191\u2192\u2193\u25cf\u2588\u2500\u2502\u255a\u2510\u256c'
)

ZH_SOURCES = {
    'source-han-serif-sc-regular.woff2': (r'09_SourceHanSerifSC\OTF\SimplifiedChinese\SourceHanSerifSC-Regular.otf', 400, 'normal'),
    'source-han-serif-sc-bold.woff2': (r'09_SourceHanSerifSC\OTF\SimplifiedChinese\SourceHanSerifSC-Bold.otf', 700, 'normal'),
}
EN_SOURCES = {
    'newcm08-book.woff2': (r'newcomputermodern\newcomputermodern\otf\NewCM08-Book.otf', 400, 'normal'),
    'newcm08-bookitalic.woff2': (r'newcomputermodern\newcomputermodern\otf\NewCM08-BookItalic.otf', 400, 'italic'),
    'newcm10-bold.woff2': (r'newcomputermodern\newcomputermodern\otf\NewCM10-Bold.otf', 700, 'normal'),
    'newcm10-bolditalic.woff2': (r'newcomputermodern\newcomputermodern\otf\NewCM10-BoldItalic.otf', 700, 'italic'),
}
# 排版惯例：NewCM 家族 Book(Knuth) 系列为正文，Bold 系列同字号下更饱满，用于粗体
BOOK_BASE = os.path.join(FONT_SRC, r'newcomputermodern\newcomputermodern\otf')
TEXT_EN = EN_CHARSET_ALL


def collect_cjk_charset():
    charset = set()
    for root, _, files in os.walk(os.path.join(ROOT, 'assets', 'data')):
        for f in files:
            if not f.endswith('.json'):
                continue
            with open(os.path.join(root, f), encoding='utf-8') as fh:
                try:
                    data = json.load(fh)
                except Exception:
                    continue

            def walk(obj):
                if isinstance(obj, dict):
                    for v in obj.values():
                        walk(v)
                elif isinstance(obj, list):
                    for i in obj:
                        walk(i)
                elif isinstance(obj, str):
                    for ch in obj:
                        if '\u4e00' <= ch <= '\u9fff':
                            charset.add(ch)
            walk(data)
    return charset


def run_subset(in_path, out_path, text):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    args = [sys.executable if False else 'python', '-m', 'fontTools.subset', in_path,
            '--text=%s' % text,
            '--flavor=woff2', '--output-file=%s' % out_path,
            '--layout-features=*', '--glyph-names', '--symbol-cmap', '--legacy-cmap',
            '--name-IDs=0,1,2,3,4,5,6,7,8,9,10,11,12,13,14', '--name-legacy',
            '--drop-tables+=DSIG,FFTM', '--harfbuzz-repacker',
            '--no-prune-unicode-ranges']
    print('  subset %s -> %s' % (os.path.basename(in_path), os.path.basename(out_path)))
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print('FAIL: %s' % r.stderr)
        raise SystemExit(1)
    print('      -> %0.2f KB' % (os.path.getsize(out_path) / 1024))
    print('  @font-face: family=%s weight=%s style=%s' % (os.path.basename(out_path).split('-')[0], os.path.basename(out_path).split('-')[1].split('.')[0], os.path.basename(out_path).replace('.woff2', '').replace('-', ' ')))


def main():
    cjk = collect_cjk_charset()
    print('CJK charset: %d chars from data' % len(cjk))
    zh_text = ''.join(sorted(cjk)) + '，。、；：？！“”‘’（）《》—…·'
    base = os.path.join(FONT_SRC)

    for out_name, (rel, weight, style) in ZH_SOURCES.items():
        run_subset(os.path.join(base, rel), os.path.join(OUT, out_name), zh_text)
    for out_name, (rel, weight, style) in EN_SOURCES.items():
        run_subset(os.path.join(base, rel), os.path.join(OUT, out_name), EN_CHARSET_ALL)


if __name__ == '__main__':
    main()