# 🏛️ 《大西洋月刊与全球典藏期刊馆》（The Atlantic & Global Journals Digital Edition）

> **“依托 1:1 印刷排版首行缩进解析、真实作者段落集与纯 CSS 变量排版管道，为您呈现比肩 Apple News+ 与 Apple Books 的双语深度私享阅读体验。”**

本项目为《大西洋月刊》（**2026年8月刊 104 页** 与 **2026年7月刊 112 页**，共 216 页完整典藏）及未来全球顶级期刊（《经济学人》、《纽约客》、《连线》、《哈佛商业评论》等）所打造的**高保真双语转录、全维印刷排版重构、双层零堆叠响应式、CSS 变量统一排版管道与全自动流水线级 Web 数字典藏馆系统**。

---

## ✨ 核心特性与出版级技术架构

### 🎨 1. Apple Books 抽屉式面板与 6 大奢华阅读主题
顶栏【更多 `(···)`】内置 6 款经过严苛光学对比度与护眼调校的顶级主题：
- **`☀️` 晨曦象牙白（*Light Ivory*）**：象牙白底色（`#f7f5f1`）+ 纸感白卡（`#ffffff`），经典《大西洋月刊》纸刊质感。
- **`📜` 复古羊皮纸（*Sepia Vintage*）**：羊皮纸暖黄（`#ece3d1`）+ 米纸卡（`#f4ecdb`），浓郁书卷气息，极佳温润纸感。
- **`🏖️` 清新夏日海滩（*Summer Beach*）**：海风蔚蓝（`#eaf4fa`）+ 贝壳白卡（`#ffffff`）+ 深海墨字（`#0f2d3f`），清爽通透，久读不燥。
- **`🧊` 学术冷静冰川（*Academic Calm*）**：北欧冰川灰（`#eef1f5`）+ 沉思冷灰卡（`#ffffff`）+ 牛津蓝墨（`#16202e`），沉静专注。
- **`🌿` 森林晨雾薄荷（*Forest Sage*）**：抹茶晨雾绿（`#edf3ec`）+ 竹青养眼卡（`#fbfcfb`）+ 苍松深绿墨字（`#143120`），天然极度护眼。
- **`🌙` 极夜深曜石（*Midnight OLED*）**：纯粹黑曜石（`#0e0f12`）+ 炭黑深邃卡（`#1c1f24`），夜读省电无眩光。

---

### 📐 2. 双排版对齐模式（自然恒定均距 / 纸刊两端平齐）与网页级微排版
在设置抽屉中提供行业级排版模式自主切换器：
1. **📖 模式 A：自然恒定均距（Flush-Left — 推荐默认）**：
   - **《大西洋月刊》官网与《纽约时报》App 官方阅读标准**；
   - **每一个单词之间的空格物理 100% 绝对等宽恒定**，彻底消灭任何单词间距拉大现象；
2. **📐 模式 B：纸刊两端平齐（Justified — 实体书标准）**：
   - **浏览器原生 `hyphens: auto` 词典断连词引擎**（依赖系统 `lang="en-US"` 语言词典，零 JavaScript 盲切）；
   - 自动在长单词音节处精准断词，两侧边缘如刀切般平齐，词距波动极低。

---

### 🔤 3. 全端中英 1:1 严谨等大与光学平衡
字号管道全量收口到单个 CSS 变量 `--reader-font-scale`，由 `A-`/`A+` 同步变频器驱动：
- **桌面端**：英文 `22.0px` == 中文 `22.0px`（默认旗舰大字，`A+` 最高 36px / `A-` 最低 14px）。
- **移动端**：以 `max(13.5px, calc(var(--reader-font-scale) * 0.8))` 建立舒适区下限（约 17.6px @ 22px 基准），`A±` 逐级响应且不被媒体查询焊死；中英左右内边距统一 **`24px`** 保证严格左对齐。

---

### 🔊 4. 轻点即朗读（Tap-to-Speak）与顶栏外显倍速记忆
- **轻点即朗读（Direct Tap-to-Speak）**：
  - 轻点任意英文段落卡片，直接触发高质量 Web Speech 原声朗读，伴随金色呼吸光圈（`playing-active`）；
  - **二次点击立即停止（Deterministic Stop Lock）**：再次轻点该段落即刻彻底终止语音输出并熄灭光圈，绝无反复播报；
- **顶栏外显倍速胶囊（`1.0x` / `1.25x` / `1.5x` / `0.75x`）**：
  - 倍速调节按钮外显至顶栏右侧，支持全局持久记忆（`localStorage`）；
  - 所选倍速同时应用于【整段点按朗读】与【整页连续朗读】。

---

### ⚖️ 5. Flex 左右镜像对称占位（Symmetrical Phantom Spacers）
- 顶栏左侧 `.header-left` 与右侧 `.header-right` 均被赋予 **`flex: 1 1 0`** 弹性占位约束；
- 中央的 **📖 逐段对照 / 🪟 原图分栏 / 🇺🇸 纯英文 / 🇨🇳 纯中文** 工具栏在目录展开、收起或窗口拉伸时，**始终 100% 绝对死锁于屏幕水平正中心**。

---

### 📱 6. 移动端极致紧凑双语韵律与零幽灵占位
- **彻底根除隐形幽灵占位**：从 DOM 移除了段落底部的冗余操作条，释放了无效的虚空距离；
- **卡片间段间距 18px**：移动端与桌面端一致（`.article-body` 纵向 `gap: 18px`），卡片内英文底→中文顶的段内间距收紧为约 **`13px`**（英文底 6px + 主题色分隔线 2px + 中文顶 5px），中英左右内边距统一 **`24px`** 保证严格左对齐、不显层次混乱；
- **目录跳转即时收拢**：在手机上点击目录中的任何章节、缩略图方块或检索结果时，**侧边栏目录立即自动平滑收拢**，视野瞬间铺满正文。

---

### ⌨️ 7. IME 输入法穿透级双轨物理键盘引擎
针对中文输入法状态下浏览器发送 `Process` 键码的问题，底层全面升级为 `e.code` 物理硬件键码优先捕获：

| 快捷键 | 功能说明 | 快捷键 | 功能说明 |
| :---: | :--- | :---: | :--- |
| **`Space`** | 平滑向下翻半屏 | **`Shift + Space`** | 平滑向上翻半屏 |
| **`S` / `↓`** | 平滑向下滚动 | **`W` / `↑`** | 平滑向上滚动 |
| **`J` / `→` / `PageDown`** | 精准翻至下一页（首页一键入馆） | **`K` / `←` / `PageUp`** | 精准翻至上一页 |
| **`G` / `Home`** | 平滑直达本页顶部 | **`Shift + G` / `End`** | 平滑直达本页底部 |
| **`1` / `2` / `3` / `4`** | 秒切四大视图（逐段/原图/纯英/纯中） | **`M`** | 一键跨期秒切（8月刊/7月刊） |
| **`T`** | 展开 / 收起侧边栏目录 | **`P`** | 原声朗读整页英文 (TTS) |
| **`B`** | 收藏 / 取消本页书签 | **`F`** | 全屏沉浸阅读模式 |
| **`Esc` / `H`** | 收起弹窗或返回期刊馆首页 | **`?`** | 随时呼出快捷键速查面板 |

---

## 📁 现代化目录组织与资产树

```tree
TheAtlantic/
├── index.html                     # 生产级双语阅读馆（构建产物，由 build_master_portal.py 生成）
├── reader.html                    # 由构建器同步输出的跳转桩（构建产物）
├── README.md                      # 本项目设计与技术白皮书
├── CHANGELOG.md                   # 分版本变更记录（Keep a Changelog）
├── LICENSE                        # MIT 开源许可证
├── .gitignore                     # 严密的安全过滤规则（自动忽略大型 PDF、构建产物与缓存）
│
├── assets/
│   ├── css/reader_style.css       # 核心样式源码（唯一真源）
│   ├── js/reader_app.js           # 核心交互源码（唯一真源）
│   └── data/
│       ├── publications.json      # 多刊物品牌矩阵元数据
│       └── magazines.json         # 双语期刊全量解析数据集 (216 页完整转录)
│
├── issues/
│   ├── 2026-08/                   # 2026 年 8 月刊（104 页完整转录）
│   │   ├── images/                # page_001.png ~ page_104.png (150 DPI 高清切图)
│   │   ├── pages/                 # page_001.md ~ page_104.md 逐页精校文本
│   │   └── full_magazine.md       # 8月全本 Markdown 典藏
│   └── 2026-07/                   # 2026 年 7 月刊（112 页完整转录）
│       ├── images/                # page_001.png ~ page_112.png (150 DPI 高清切图)
│       ├── pages/                 # page_001.md ~ page_112.md 逐页精校文本
│       └── full_magazine.md       # 7月全本 Markdown 典藏
│
├── docs/reviews/                  # 历轮评审报告与整改执行记录（归档）
├── raw_pdf/                       # 原始 PDF 来源（已被 .gitignore 排除，不入库）
│
└── scripts/                       # 自动化流水线（核心区）
    ├── build_master_portal.py     # 生产级单页应用编译器（读 assets/ + issues/，写 index/reader.html）
    ├── stress_test_engine.py      # 6 套件全维压力测试（node --check + 行为级断言）
    ├── browser_layout_audit.js    # 真实浏览器多端溢出审计（playwright-core + 系统 Edge，8 视口 × 7 状态）
    ├── ingest_magazine.py         # 新刊一键标准化全自动入库 CLI
    ├── process_july_issue.py      # 7月刊转录与入库
    ├── transcribe_and_translate.py            # 转录 + 双语翻译管道
    ├── reconstruct_discourse_paragraphs.py    # 印刷排版重构算法 1.0（句段补全）
    ├── reconstruct_true_author_paragraphs.py  # 印刷排版重构算法 2.0（真实作者段落）
    ├── enrich_art_pages.py        # 封面/艺术页策展词与内嵌扫描图增强
    └── legacy/                    # 一次性/历史脚本归档（首次入库与审计用）
        ├── build_web_reader.py / build_multi_issue_reader.py  # 早期单页构建器（已由 master 取代）
        ├── transpile_* / compile_* / fix_text.py               # 转录期的临时修复/编译工具
        └── inspect_* / check_* / audit_*                       # 转录期的临时审计工具
```

> **说明**：根目录的 `index.html` / `reader.html` 为**构建产物**（已列入 `.gitignore`，随构建自动再生成，仅保留最新版本入库）；根级不再存放 `reader_app.js` / `reader_style.css` 副本（已移除，唯一真源为 `assets/`）。`scripts/legacy/` 下的历史脚本与历史 `output/` 构建产物均已归档/忽略，不可编辑——一切修改请作用于 `assets/` 真源后重新构建。

---

## 🚀 启动与部署

1. **本地运行**：直接在文件管理器中双击打开 **`index.html`** 即可完全离线畅读 216 页完整期刊！
2. **云端安全推送**：本项目完全集成并兼容 **SafeGit** 自动化工作流：
   ```powershell
   Import-Module D:\Desktop\SafeGit\SafeGit.psd1
   sgit-update "feat: your update message"
   ```
3. **GitHub Pages 部署**：推送至 GitHub 仓库后，在仓库 Settings $\rightarrow$ Pages 中选择 `main` 分支根目录，即可自动获得全球 CDN 加速的在线阅读网站。

---

## 🛠️ 维护与变更记录

- **开发者 / Agent 上手指南**：见 [`AGENTS.md`](AGENTS.md)（架构、三大数据源、自选文章增改流程、CI 红线、测试与推送全流程）。**后续接手的 agent 请先读此文件。**
- **完整变更历史**：见 [`CHANGELOG.md`](CHANGELOG.md)（Keep a Changelog 规范，分版本记录，最新 v2.6.17）。
- **历轮评审与整改执行记录**：`docs/reviews/round-1-code-review.md`（v1.0 360° 评审）/ `round-2-reaudit.md`（v2.0 复核）/ `round-3-harsh-review.md`（v2.1 整改回执）/ `round-4-final-sharp.md`（终局评测 + v2.2 勘误附录）。

**构建与测试闭环**（修改数据后请依次执行）：

```powershell
python scripts/build_master_portal.py  # 重建 index.html / reader.html（assets/ 真源 → 根目录镜像）
python scripts/stress_test_engine.py   # 6 套件全绿（reader.html stub 化后 25 项断言）
node scripts/browser_layout_audit.js   # 真实浏览器多端溢出审计（8 视口 × 7 状态，需 node + playwright-core）
node scripts/functional_smoke.js       # 真实浏览器功能冒烟（6 项交互断言）
```
