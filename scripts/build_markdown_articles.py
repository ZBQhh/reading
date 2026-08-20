#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_markdown_articles.py — Project B 数据源生成器（与 PDF 解析项目相互独立）。

职责（与用户约定）：
- 数据源：用户自行整理的 Markdown 文章目录（默认 D:\\Desktop\\reading\\reading data\\TheAtlantic，
  可用环境变量 MD_ARTICLES_ROOT 覆盖）。每篇一个 .md，结构与示例一致：
    ---
    title / author / date / website / month / source / saved_at
    ---
    # 标题
    > 元信息 blockquote（忽略）
    ![alt](./assets/<slug>/x.jpg)   ← 内联图
    *caption*                       ← 图注
    正文段落……（仅英文，无中文）
- 输出：与 PDF 解析完全相同的 issue/page/segment 模型，zh 字段统一预留为 null
  （用户后续用 agent 翻译后回填，schema 保持一致）。
- 图片：把每篇的 ./assets/<slug>/ 复制到项目根 manual_assets/<slug>/，并把 md 内
  相对路径改写为 manual_assets/<slug>/...，保证 file:// 离线可读。
- 产物：manual_issues.json（供 build_master_portal.py 注入 window.MANUAL_ISSUES）。

与 PDF 项目的关系：两个项目「入口相同、样式共用、仅数据来源不同」——
PDF 项目读 assets/data/magazines.json → window.ALL_ISSUES；
本生成器读 md 目录 → window.MANUAL_ISSUES；二者同一书架 / 同一阅读器呈现。
"""

import os
import re
import json
import shutil
import sys

# ----------------------------------------------------------------- 路径
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
DEFAULT_MD_ROOT = r"D:\Desktop\reading\reading data\TheAtlantic"
MANUAL_ASSETS = os.path.join(PROJECT_ROOT, "manual_assets")
OUT_JSON = os.path.join(PROJECT_ROOT, "manual_issues.json")
TRANSLATIONS_DIR = os.path.join(PROJECT_ROOT, "manual_translations")


def load_translation(slug):
    """读取与文章同名的译文侧车 manual_translations/<slug>.zh.json。

    结构：{"paragraphs": [中文...按段落顺序], "captions": [中文图注...按嵌入式顺序]}。
    该文件纳入 git，使译文在每次 `npm run build` 时都能被重新回填，
    不会因 manual_issues.json 是构建产物而被覆盖丢失。
    缺失则返回 None（文章保持 zh=null，等待 agent 翻译）。
    """
    p = os.path.join(TRANSLATIONS_DIR, slug + ".zh.json")
    if not os.path.isfile(p):
        return None
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("[markdown]   ⚠ 译文侧车读取失败 %s: %s" % (p, e))
        return None


def apply_translation(segs, tr):
    """按段落 / 嵌入式顺序回填 zh 及背景/双关注解 notes。返回 (填段数, 填图注数, 填注解数)。"""
    para_zh = tr.get("paragraphs") or []
    cap_zh = tr.get("captions") or []
    notes = tr.get("notes") or tr.get("annotations") or {}
    pi = ci = ni = 0
    for s in segs:
        if s.get("type") == "paragraph":
            if pi < len(para_zh):
                s["zh"] = para_zh[pi]
            # notes 支持稀疏字典 {"0": "...", "5": "..."} 或对齐列表
            note_val = None
            if isinstance(notes, dict):
                note_val = notes.get(str(pi)) or notes.get(pi)
            elif isinstance(notes, list) and pi < len(notes):
                note_val = notes[pi]
            if note_val and str(note_val).strip():
                s["annotation"] = str(note_val).strip()
                ni += 1
            pi += 1
        elif s.get("type") == "embedded" and ci < len(cap_zh):
            s["zh"] = cap_zh[ci]
            ci += 1
    return pi, ci, ni


def resolve_md_root(env_val):
    r"""兼容多种路径形态：Windows 盘符（D:\ / D:/）与 Git-Bash POSIX（/d/）。"""
    if not env_val:
        return None
    cands = [env_val]
    m = re.match(r"^([A-Za-z]):[\\/](.*)$", env_val)
    if m:
        drive, rest = m.group(1), m.group(2)
        cands.append("/" + drive.lower() + "/" + rest)
        cands.append("/" + drive.upper() + "/" + rest)
    m2 = re.match(r"^/([A-Za-z])/(.*)$", env_val)
    if m2:
        drive, rest = m2.group(1), m2.group(2)
        cands.append(drive.upper() + ":\\" + rest.replace("/", "\\"))
    for c in cands:
        if os.path.isdir(c):
            return c
    return env_val


def find_md_roots():
    roots = []
    # 1. 环境变量覆盖
    env_val = os.environ.get("MD_ARTICLES_ROOT")
    if env_val:
        resolved = resolve_md_root(env_val)
        if resolved and os.path.isdir(resolved):
            roots.append(resolved)
    # 2. 仓库内持久化数据源 (manual_source)
    in_repo = os.path.join(PROJECT_ROOT, "manual_source")
    if os.path.isdir(in_repo):
        roots.append(in_repo)
    # 3. 阿里云备份源
    backup_path = r"D:\Desktop\Tools\阿里云桌面备份\html_data\reading\reading data"
    if os.path.isdir(backup_path):
        roots.append(backup_path)
    # 4. 默认数据源
    if os.path.isdir(r"D:\Desktop\reading\reading data"):
        roots.append(r"D:\Desktop\reading\reading data")
    elif os.path.isdir(DEFAULT_MD_ROOT):
        roots.append(DEFAULT_MD_ROOT)

    unique_roots = []
    for r in roots:
        norm = os.path.normpath(r)
        if norm not in unique_roots:
            unique_roots.append(norm)
    return unique_roots


# 各来源默认主题色（与 PDF 项目一致；可被 frontmatter theme_color 覆盖）
WEBSITE_THEME = {
    "theatlantic": "#b91c1c",
    "the atlantic": "#b91c1c",
    "nytimes": "#1a4ed8",
    "the new york times": "#1a4ed8",
    "newyorker": "#c0392b",
    "the new yorker": "#c0392b",
    "guardian": "#0b6e4f",
    "the guardian": "#0b6e4f",
    "bbc": "#0b5fa5",
    "wired": "#111111",
    "economist": "#e3120b",
    "the economist": "#e3120b",
    "wsj": "#005689",
    "the wall street journal": "#005689",
    "bloomberg": "#104f96",
}
DEFAULT_THEME = "#b3802f"

IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif")


# ----------------------------------------------------------------- 工具
def slugify(s):
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "article"


def parse_frontmatter(text):
    """极简 YAML 解析：仅支持 key: "value" 标量（与示例 frontmatter 形态匹配）。"""
    fm = {}
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        return fm, text
    body = text[m.end():]
    for line in m.group(1).splitlines():
        mm = re.match(r'^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$', line)
        if not mm:
            continue
        key, val = mm.group(1), mm.group(2)
        val = val.strip()
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        fm[key.lower()] = val
    return fm, body


def split_segments(md_body):
    """把 markdown 正文切成有序段列表：paragraph / embedded（内联图）。zh 统一为 null。"""
    lines = md_body.splitlines()
    segs = []
    i = 0
    n = len(lines)
    first_h1_skipped = False
    pending_caption = None

    def flush_caption():
        nonlocal pending_caption
        if pending_caption is not None:
            # 孤立图注行（无前导图片）：作为普通段落保留，清空待定
            segs.append({"type": "paragraph", "en": pending_caption, "zh": None})
            pending_caption = None

    while i < n:
        line = lines[i].rstrip()
        stripped = line.strip()

        # 空行：段落边界，图注若孤立则落为段落
        if not stripped:
            flush_caption()
            i += 1
            continue

        # 标题：跳过首个 H1（标题已在 frontmatter），其余 H1/H2 作为段落（保留原文本）
        if stripped.startswith("#"):
            if not first_h1_skipped and stripped.startswith("# "):
                first_h1_skipped = True
                i += 1
                continue
            flush_caption()
            segs.append({"type": "paragraph", "en": stripped.lstrip("#").strip(), "zh": None})
            i += 1
            continue

        # 引用块（元信息）：忽略
        if stripped.startswith(">"):
            flush_caption()
            i += 1
            continue

        # 分隔线
        if re.match(r"^-{3,}$", stripped):
            flush_caption()
            i += 1
            continue

        # 图片：![alt](path)
        img = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$", stripped)
        if img:
            flush_caption()
            alt = img.group(1).strip()
            src = img.group(2).strip()
            # 图注：图片之后、跳过空行、首个斜体行 *caption*（示例 md 中图与图注间有空行）
            cap = None
            j = i + 1
            while j < n and not lines[j].strip():
                j += 1
            if j < n:
                cm = re.match(r"^\*([^*]+)\*\s*$", lines[j].strip())
                if cm:
                    cap = cm.group(1).strip()
                    i = j  # 消费掉空行 + 图注行
            segs.append({
                "type": "embedded",
                "src": rewrite_asset_path(src),
                "caption": cap or alt or "",
                "en": "",
                "zh": None,
            })
            i += 1
            continue

        # 普通段落：合并连续非空、非特殊行
        flush_caption()
        buf = [stripped]
        i += 1
        while i < n:
            nxt = lines[i].strip()
            if not nxt or nxt.startswith("#") or nxt.startswith(">") or re.match(r"^-{3,}$", nxt) or re.match(r"^!\[", nxt):
                break
            buf.append(nxt)
            i += 1
        para = " ".join(buf).strip()
        if para:
            segs.append({"type": "paragraph", "en": para, "zh": None})

    flush_caption()
    return segs


def rewrite_asset_path(src):
    """把 md 内相对资源路径改写为项目内 manual_assets/ 下路径。"""
    s = src
    s = re.sub(r"^\.{1,2}/", "", s)          # 去掉 ./ 或 ../
    s = s.replace("\\", "/")
    # 形如 assets/<slug>/x.ext → manual_assets/<slug>/x.ext
    m = re.match(r"^assets/(.+)$", s)
    if m:
        return "manual_assets/" + m.group(1)
    # 其它相对路径（如直接 <slug>/x.ext）也规整到 manual_assets/
    if not s.startswith("manual_assets/"):
        s = "manual_assets/" + s.lstrip("/")
    return s


def copy_article_assets(month_dir, asset_folders):
    """复制 md 中实际引用到的 <month>/assets/<folder>/ 到项目 manual_assets/<folder>/。

    关键点：asset 子目录名以 md 内图片引用为准（保留原始大小写/下划线），
    而非 slugify 后的 basename，避免二者不一致导致复制静默失败、图片 404。

    覆盖策略：用 copytree(dirs_exist_ok=True) 直接覆盖，避免 rmtree 触发
    沙箱安全删除拦截（其回收站操作在 workspace 内会失败）。
    """
    for folder in asset_folders:
        src = os.path.join(month_dir, "assets", folder)
        dst = os.path.join(MANUAL_ASSETS, folder)
        if not os.path.isdir(src):
            print("[markdown]   ⚠ 资源目录缺失，跳过：%s" % src)
            continue
        shutil.copytree(src, dst, dirs_exist_ok=True)


# ----------------------------------------------------------------- 主流程
def build():
    md_roots = find_md_roots()
    if not md_roots:
        print("[markdown] 数据源目录不存在")
        print("[markdown] 跳过生成（manual_issues.json 保持为空或未更新）。")
        # 仍写出空对象，保证注入不报错
        with open(OUT_JSON, "w", encoding="utf-8") as f:
            json.dump({}, f, ensure_ascii=False, indent=2)
        return {}

    # 准备 manual_assets 目录（不整体 rmtree，避免触发沙箱安全删除拦截）
    os.makedirs(MANUAL_ASSETS, exist_ok=True)

    issues = {}
    md_files = []
    scanned_slugs = set()
    for root_dir in md_roots:
        if not os.path.isdir(root_dir):
            continue
        for root, _dirs, files in os.walk(root_dir):
            for fn in files:
                if fn.lower().endswith(".md"):
                    # 跳过 README 等非文章说明文件
                    if fn.lower().startswith("readme"):
                        continue
                    # 跳过 assets 目录下的文件（若有）
                    if os.sep + "assets" + os.sep in root.replace("/", os.sep):
                        continue
                    full_path = os.path.join(root, fn)
                    slug = slugify(os.path.splitext(fn)[0])
                    if slug not in scanned_slugs:
                        scanned_slugs.add(slug)
                        md_files.append(full_path)

    md_files.sort()
    for path in md_files:
        try:
            with open(path, "r", encoding="utf-8") as fh:
                raw = fh.read()
        except Exception as e:
            print("[markdown] 读取失败 %s: %s" % (path, e))
            continue

        fm, body = parse_frontmatter(raw)
        slug = slugify(os.path.splitext(os.path.basename(path))[0])
        month_dir = os.path.dirname(path)

        title = fm.get("title") or re.sub(r"^\d{4}-\d{2}-\d{2}_", "", os.path.splitext(os.path.basename(path))[0]).replace("_", " ")
        author = fm.get("author") or ""
        date = fm.get("date") or ""
        website = fm.get("website") or "theatlantic"
        source = fm.get("source") or ""
        theme = fm.get("theme_color") or WEBSITE_THEME.get(website.strip().lower(), DEFAULT_THEME)

        segs = split_segments(body)
        # 从图片引用中抽取实际引用的 asset 子目录名，用于复制资源
        asset_folders = set()
        for s in segs:
            if s.get("type") == "embedded" and s.get("src"):
                mm = re.match(r"^manual_assets/([^/]+)/", s["src"])
                if mm:
                    asset_folders.add(mm.group(1))
        copy_article_assets(month_dir, asset_folders)

        # 回填译文侧车（若存在）：zh 及 notes
        tr = load_translation(slug)
        if tr:
            pn, cn, ni = apply_translation(segs, tr)
            print("[markdown]   ✓ 译文回填 %d 段 / %d 图注 / %d 注释" % (pn, cn, ni))

        issue_id = "md-" + slug
        issues[issue_id] = {
            "id": issue_id,
            "name": slug,
            "displayName": title,
            "author": author,
            "date": date,
            "website": website,
            "source": source,
            "sourceType": "markdown",
            "pubId": "manual",
            "themeColor": theme,
            "tags": [],
            "totalPages": 1,
            "imageRoot": "",
            "pages": [
                {
                    "pageNumber": 1,
                    "section": title,
                    "image": None,
                    "segments": segs,
                }
            ],
        }
        print("[markdown] + %s  (%d 段)" % (issue_id, len(segs)))

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(issues, f, ensure_ascii=False, indent=2)

    print("[markdown] 生成完成：%d 篇 → %s" % (len(issues), OUT_JSON))
    return issues


if __name__ == "__main__":
    build()
