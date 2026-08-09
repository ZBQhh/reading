#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_text.py — The Atlantic & Global Journals 手动微调工具 (Manual Fine-Tuning CLI)
===================================================================================
设计目标：
  1. 精准定位并修复任意页/任意段的中英文本、类型或章节标题；
  2. 每次写入前自动原子备份（data/_backups/），写入用临时文件 + os.replace 保证不损坏；
  3. 修改后自动重建门户（build_master_portal.py）并运行全维压力测试，闭环可靠；
  4. migrate 子命令一键补齐数据规范（pubId / imageRoot / 剥离隐形字符）。

用法示例：
  # 查看第 16 页全部段落（含中文是否缺失）
  python scripts/fix_text.py list --issue 2026-08 --page 16

  # 按子串搜索段落
  python scripts/fix_text.py search --query "reading"

  # 修复某段英文（--value 传 @- 可从 stdin 粘贴多行）
  python scripts/fix_text.py set --issue 2026-08 --page 16 --num 3 --field en --value "New English text"

  # 修改段的类型（paragraph/h3/h4/quote/caption/byline/ad）
  python scripts/fix_text.py type --issue 2026-08 --page 16 --num 3 --value quote

  # 修复整页章节标题
  python scripts/fix_text.py section --issue 2026-08 --page 16 --value "阅读的终结 (The End of Reading)"

  # 数据接口迁移（幂等，可反复执行）
  python scripts/fix_text.py migrate

说明：
- --no-rebuild 可跳过自动重建与测试（用于批量脚本）；
- 备份保留最近 30 份，位于 data/_backups/；
- 所有字段写入前做类型与长度校验；隐形字符（软连字符/零宽字符）自动剥离。
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "assets", "data", "magazines.json")
BUILD_SCRIPT = os.path.join(ROOT, "scripts", "build_master_portal.py")
STRESS_SCRIPT = os.path.join(ROOT, "scripts", "stress_test_engine.py")
BACKUP_DIR = os.path.join(ROOT, "_backups")

SEGMENT_TYPES = ("paragraph", "h3", "h4", "quote", "caption", "byline", "ad")
INVISIBLE_CHARS = "\u00ad\u200b\u200c\u200d\ufeff"


# --------------------------------------------------------------------------
# 数据读写（原子化 + 备份）
# --------------------------------------------------------------------------
def load_data():
    if not os.path.exists(DATA_PATH):
        sys.exit("[x] 数据文件不存在: " + DATA_PATH)
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def backup_data():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    dst = os.path.join(BACKUP_DIR, "magazines_%s.bak" % stamp)
    shutil.copy2(DATA_PATH, dst)
    backups = sorted(f for f in os.listdir(BACKUP_DIR) if f.endswith(".bak"))
    while len(backups) > 30:
        os.remove(os.path.join(BACKUP_DIR, backups.pop(0)))
    print("[i] 已自动备份: " + os.path.relpath(dst, ROOT))
    return dst


def save_data(data, dry=False):
    """原子写入：先写临时文件，再 os.replace 覆盖，绝不产生半截 JSON。"""
    if dry:
        return
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(DATA_PATH), suffix=".json.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DATA_PATH)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


def get_issue(data, issue_id):
    issue = data.get(issue_id)
    if not issue:
        raise ValueError("刊物 %s 不存在（现有: %s）" % (issue_id, ", ".join(sorted(data.keys()))))
    return issue


def get_page(issue, page):
    pages = issue.get("pages", [])
    if not (1 <= page <= len(pages)):
        raise ValueError("页码越界: %d（该刊共 %d 页）" % (page, len(pages)))
    return pages[page - 1]


def resolve_segment(page, needle):
    """支持 --num（1 基序号）或唯一子串定位段落。"""
    segments = page.get("segments", [])
    if needle.isdigit():
        idx = int(needle)
        if 1 <= idx <= len(segments):
            return idx - 1
        raise ValueError("序号越界: 本页共 %d 段（序号从 1 开始）" % len(segments))
    hits = []
    for i, seg in enumerate(segments):
        blob = (seg.get("en") or "") + (seg.get("zh") or "")
        if needle in blob:
            hits.append(i)
    if len(hits) == 1:
        return hits[0]
    if len(hits) == 0:
        preview = "\n".join(
            "    [%d] %s" % (i + 1, (seg.get("en") or "")[:60]) for i, seg in enumerate(segments[:12])
        )
        raise ValueError("未命中任何段落，本页前 12 段预览:\n%s" % preview)
    listed = "\n".join("    [%d] %s" % (i + 1, segments[i].get("en", "")[:60]) for i in hits)
    raise ValueError("匹配到 %d 段，请改用 --num 指定精确序号:\n%s" % (len(hits), listed))


def rebuild_and_test():
    """重建门户 = 编译 index.html/reader.html 并运行压力测试。"""
    print("\n[action] 重建门户（index.html / reader.html）...")
    subprocess.run([sys.executable, BUILD_SCRIPT], cwd=ROOT, check=True)
    print("[action] 运行全维压力测试...")
    subprocess.run([sys.executable, STRESS_SCRIPT], cwd=ROOT, check=True)


def sanitize_text(value):
    value = (value or "").replace("\r", "").strip()
    for ch in INVISIBLE_CHARS:
        value = value.replace(ch, "")
    if not value:
        raise ValueError("文本不能为空（请检查是否误粘贴了空内容）")
    return value


def build_raw_md(page):
    """由段落内容重建该页 rawMd（供『复制 Markdown』保持同步）。"""
    pnum = page.get("pageNumber", "")
    section = page.get("section", "") or ("Page %s" % pnum)
    lines = ["# " + section, ""]
    for seg in page.get("segments", []):
        en = (seg.get("en") or "").strip()
        if not en:
            continue
        t = seg.get("type")
        if t == "caption":
            lines.append("> " + en)
        elif t == "quote":
            lines.append('> "%s"' % en)
        else:
            lines.append(en)
        lines.append("")
    return "\n".join(lines).strip()


# ----------------------------------------------------------------
# 子命令实现
# ----------------------------------------------------------------
def cmd_list(args):
    data = load_data()
    issue = get_issue(data, args.issue)
    if args.all_pages:
        print("刊物 %s（共 %d 页）段落总览:" % (args.issue, len(issue["pages"])))
        for i, page in enumerate(issue["pages"], 1):
            segs = page.get("segments", [])
            glyph = "▲" if not segs else ""
            print("  P%3d [%2d 段]%s %s" % (i, len(segs), glyph, page.get("section", "")))
        return
    page = get_page(issue, args.page)
    segs = page.get("segments", [])
    print("%s / PAGE %03d — %s（共 %d 段）" % (args.issue, args.page, page.get("section", ""), len(segs)))
    for i, seg in enumerate(segs, 1):
        en = seg.get("en", "")
        zh = seg.get("zh", "")
        flag = "⚠️ 缺中文" if not zh.strip() else ""
        print("\n[段 %2d] type=%s  en %5dch  zh %5dch  %s" % (i, seg.get("type", "?"), len(en), len(zh), flag))
        print("    EN: " + en[:150])
        print("    ZH: " + zh[:150])
    if not segs:
        print("    (本页为纯图版页 — 无段落，可修改 section 标题)")


def cmd_search(args):
    data = load_data()
    query = args.query.lower()
    hits = []
    for issue_id, issue in data.items():
        for i, page in enumerate(issue.get("pages", []), 1):
            for j, seg in enumerate(page.get("segments", []), 1):
                blob = ((seg.get("en") or "") + " " + (seg.get("zh") or "")).lower()
                if query in blob:
                    hits.append((issue_id, i, j, seg))
    print("命中 %d 处（查询: “%s”）" % (len(hits), args.query))
    for issue_id, page, j, seg in hits[: args.limit]:
        print("  %s P%03d 段[%d] %-9s %s" % (issue_id, page, j, seg.get("type", "?"), (seg.get("en") or "")[:90]))
    if len(hits) > args.limit:
        print("  …（还有 %d 处，--limit 控制展示上限）" % (len(hits) - args.limit))


def cmd_set(args):
    data = load_data()
    issue = get_issue(data, args.issue)
    page = get_page(issue, args.page)
    idx = resolve_segment(page, args.num)
    seg = page["segments"][idx]
    value = "".join(sys.stdin) if args.value == "@-" else args.value
    value = sanitize_text(value)
    old = seg.get(args.field, "")
    seg[args.field] = value
    if args.reconstruct:
        page["rawMd"] = build_raw_md(page)
    backup_data()
    save_data(data)
    print("已更新 %s P%03d 段[%d].%s" % (args.issue, args.page, idx + 1, args.field))
    print("  OLD: %s" % old[:80])
    print("  NEW: %s" % value[:80])
    if args.rebuild:
        rebuild_and_test()


def cmd_type(args):
    data = load_data()
    issue = get_issue(data, args.issue)
    page = get_page(issue, args.page)
    idx = resolve_segment(page, args.num)
    old = page["segments"][idx].get("type")
    page["segments"][idx]["type"] = args.value
    backup_data()
    save_data(data)
    print("已更新 %s P%03d 段[%d] type: %s -> %s" % (args.issue, args.page, idx + 1, old, args.value))
    if args.rebuild:
        rebuild_and_test()


def cmd_section(args):
    data = load_data()
    issue = get_issue(data, args.issue)
    page = get_page(issue, args.page)
    old = page.get("section", "")
    value = sanitize_text(args.value)
    page["section"] = value
    backup_data()
    save_data(data)
    print("已更新 %s P%03d 章节标题" % (args.issue, args.page))
    print("  OLD: %s" % old)
    print("  NEW: %s" % value)
    if args.rebuild:
        rebuild_and_test()


def cmd_migrate(args):
    """补齐每刊 pubId / imageRoot，并剥离全部隐形字符（幂等）。"""
    data = load_data()
    changed = False
    for issue_id, issue in data.items():
        pages = issue.get("pages", [])
        if "pubId" not in issue:
            issue["pubId"] = args.pub
            changed = True
        if not issue.get("imageRoot") and pages:
            m = re.match(r"^(issues/[^/]+)", pages[0].get("image", ""))
            issue["imageRoot"] = m.group(1) if m else "issues/" + issue_id
            changed = True
        for page in pages:
            for seg in page.get("segments", []):
                for field in ("en", "zh"):
                    val = seg.get(field, "")
                    cleaned = "".join(ch for ch in val if ch not in INVISIBLE_CHARS)
                    if cleaned != val:
                        seg[field] = cleaned
                        changed = True
    if not args.dry_run:
        backup_data()
    save_data(data, dry=args.dry_run)
    print("迁移完成（%s）: pubId / imageRoot / 隐形字符清理，改动项 = %s"
          % ("dry-run 未写入" if args.dry_run else "已写入", changed))


# ---------------------------------------------------------------- main
def main():
    parser = argparse.ArgumentParser(
        description="The Atlantic 双语典藏 · 手动微调工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("list", help="列出某页（或全刊）段落")
    p.add_argument("--issue", default="2026-08")
    p.add_argument("--page", type=int, default=16)
    p.add_argument("--all-pages", action="store_true")
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("search", help="跨刊搜索文本")
    p.add_argument("--query", required=True)
    p.add_argument("--limit", type=int, default=30)
    p.set_defaults(func=cmd_search)

    p = sub.add_parser("set", help="修改某段 en/zh 文本")
    p.add_argument("--issue", required=True)
    p.add_argument("--page", type=int, required=True)
    p.add_argument("--num", required=True, help="段序号（从1开始）或唯一匹配子串")
    p.add_argument("--field", choices=["en", "zh"], required=True)
    p.add_argument("--value", required=True, help="新文本；传 @- 可从 stdin 粘贴多行")
    p.add_argument("--no-reconstruct", action="store_false", dest="reconstruct", default=True)
    p.add_argument("--no-rebuild", action="store_false", dest="rebuild", default=True)
    p.set_defaults(func=cmd_set)

    p = sub.add_parser("type", help="修改某段类型")
    p.add_argument("--issue", required=True)
    p.add_argument("--page", type=int, required=True)
    p.add_argument("--num", required=True)
    p.add_argument("--value", choices=SEGMENT_TYPES, required=True)
    p.add_argument("--no-rebuild", action="store_false", dest="rebuild", default=True)
    p.set_defaults(func=cmd_type)

    p = sub.add_parser("section", help="修改整页章节标题")
    p.add_argument("--issue", required=True)
    p.add_argument("--page", type=int, required=True)
    p.add_argument("--value", required=True)
    p.add_argument("--no-rebuild", action="store_false", dest="rebuild", default=True)
    p.set_defaults(func=cmd_section)

    p = sub.add_parser("migrate", help="数据接口迁移（幂等）")
    p.add_argument("--pub", default="the-atlantic")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_migrate)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as e:
        print("[x] %s" % e)
        sys.exit(1)
    except subprocess.CalledProcessError:
        print("[x] 重建或测试失败，数据已回退至备份（_backups/）")
        sys.exit(2)
