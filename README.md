# 🏛️ 《大西洋月刊》（The Atlantic）私享数字典藏与中英双语阅读馆

本项目为《大西洋月刊》（**2026年8月刊 104 页** 与 **2026年7月刊 112 页**）的**高保真双语转录、智能版面重排、多模态原图对照与多期合一私人订制 Web 阅读器系统**。

---

## ✨ 核心特性与 $20 私人阅读体验设计

1. **多期合一无缝切换（Multi-Issue Digital Archive）**：
   - 顶部提供 **`📅 2026年8月刊 (104P)` $\leftrightarrow$ `📅 2026年7月刊 (112P)`** 一键即时切换。
   - 侧边栏专属「期刊馆」抽屉，包含封面画廊、卷号、主打特稿与双语页数概览。

2. **黄金阅读比例与消灭侧边空隙**：
   - 阅读卡片拓宽至现代舒适黄金比例（`1060px`，分栏模式可展至 `1720px`），彻底消除多余白边。
   - 白色阅读卡片自适应延伸至页面末尾，内容零截断、零视口外溢。

3. **双向净化与纯净排版（Zero Asterisk Noise）**：
   - 自动化 AST 级正则清洗流水线，全量剥除所有未渲染的游离星号（`* *`、`**`）、破损加粗标记与 OCR 噪点。
   - 双语译文采用精致内嵌浮雕卡片（Soft Azure / Amber Card），段落间距与文字呼吸感达到出版物级美感。

4. **现代无衬线屏显字体栈（Screen Sans）与【黑体/衬线】一键切换**：
   - **默认配置**：英文采用高清晰度 `Plus Jakarta Sans` / `Inter`，中文采用 `PingFang SC`（苹方）/ `HarmonyOS Sans` / `Microsoft YaHei UI`。
   - **字体切换**：顶部工具栏支持 **`🔤 现代黑体` $\leftrightarrow$ `🔠 典雅衬线`** 自由切换并自动持久化。

5. **智能辅助与离线运行**：
   - 🔊 **Web Speech TTS 原声朗读**：支持英文段落点击即听与整页原声连贯朗读（提供 `1.0x` / `1.25x` / `1.5x` 调速）。
   - 🔍 **全书即时毫秒级检索**：输入任意关键词瞬间定位并高亮全书。
   - ⭐ **智能书签与进度记忆**：自动记忆上次阅读刊期、页码与收藏夹列表。

---

## 📁 目录结构与资产组织

```tree
TheAtlantic/
├── index.html                     # 现代私享双语 Web 阅读馆（直接双击即可离线运行）
├── reader.html                    # 备用阅读器入口
├── reader_style.css               # 旗舰级 CSS 样式表（含多主题与屏幕排版系统）
├── reader_app.js                  # 多期切换、TTS 朗读、全文检索与书签引擎
├── full_magazine.md               # 2026年8月刊全本 104 页汇编 Markdown
├── README.md                      # 本项目设计与使用指南
├── The Atlantic - August 2026..pdf# 8月刊原版 PDF
├── The Atlantic-2026-07.pdf       # 7月刊原版 PDF
│
├── issues/
│   ├── 2026-08/                   # 2026 年 8 月刊（104 页）
│   │   ├── full_magazine.md       # 8月全本 Markdown
│   │   ├── images/                # 104 张 150 DPI 高清扫描图
│   │   └── pages/                 # page_001.md ~ page_104.md 单页 Markdown
│   └── 2026-07/                   # 2026 年 7 月刊（112 页）
│       ├── full_magazine.md       # 7月全本 Markdown
│       ├── images/                # 112 张 150 DPI 高清扫描图
│       └── pages/                 # page_001.md ~ page_112.md 单页 Markdown
│
└── scripts/                       # 自动化处理流水线
    ├── audit_and_fix_pipeline.py  # 自动化全量质检与自愈脚本
    ├── process_july_issue.py      # 7月刊高清切图与双语转录
    ├── organize_august_issue.py   # 8月刊模块化规范重组
    ├── compile_multi_issue_reader.py # 多期双语数据集编译
    └── build_master_portal.py     # 旗舰 Web 阅读馆生成器
```

---

## 🚀 使用方式

- **打开阅读器**：在文件管理器中**双击打开 [index.html](file:///D:/Desktop/TheAtlantic/index.html)** 即可畅享 7 月刊与 8 月刊的全量双语阅读！
- **快捷键**：`→` / `J` 下一页，`←` / `K` 上一页，`B` 收藏书签，`P` 原声朗读，`T` 侧边栏，`F` 全屏。
