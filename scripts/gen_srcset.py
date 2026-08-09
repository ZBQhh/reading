#!/usr/bin/env python3
"""
生成响应式 WebP 变体（P4 · srcset）：为每个页面图产出 @1x / @2x 两档。

用法：
    python scripts/gen_srcset.py [--src issues/2026-08/images] [--width1 900 --width2 1800]

- 从现有 .webp（或 .png）源图生成，命名 page_NNN@1x.webp / page_NNN@2x.webp
- 生成完毕后，在 index.html 注入 <script>window.ATL_SRCSET=true</script> 即可启用
  reader_app.js 的 webpSrcset() 路径（默认关闭，未生成变体时不产生 404）
- 依赖 Pillow：pip install pillow
"""
import argparse
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.stderr.write("需要 Pillow：pip install pillow\n")
    sys.exit(2)


def gen_for_dir(src_dir, width1, width2):
    src = Path(src_dir)
    if not src.is_dir():
        sys.stderr.write(f"源目录不存在：{src_dir}\n")
        return 0
    count = 0
    for p in sorted(src.glob("*.webp")) + sorted(src.glob("*.png")):
        if "@" in p.stem:  # 跳过已生成的变体
            continue
        try:
            with Image.open(p) as im:
                im = im.convert("RGB")
                base = p.with_suffix("")  # 去扩展名
                for tag, w in (("@1x", width1), ("@2x", width2)):
                    if im.width <= w:
                        continue  # 源已足够小，跳过该档
                    h = round(im.height * w / im.width)
                    v = im.resize((w, h), Image.LANCZOS)
                    out = base.parent / (base.name + tag + ".webp")
                    v.save(out, "WEBP", quality=82)
                count += 1
        except Exception as e:
            sys.stderr.write(f"跳过 {p.name}: {e}\n")
    return count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="issues/2026-08/images")
    ap.add_argument("--width1", type=int, default=900)
    ap.add_argument("--width2", type=int, default=1800)
    args = ap.parse_args()
    n = gen_for_dir(args.src, args.width1, args.width2)
    # 同时处理 7 月刊（若存在）
    alt = args.src.replace("2026-08", "2026-07")
    if os.path.isdir(alt):
        n += gen_for_dir(alt, args.width1, args.width2)
    print(f"已生成响应式变体：{n} 个源图")


if __name__ == "__main__":
    main()
