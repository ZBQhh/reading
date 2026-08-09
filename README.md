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
- **移动端**：以 `max(15px, var(--reader-font-scale))` 建立舒适区下限，`A±` 在 15–36px 区间依然逐级响应，**不再被媒体查询焊死**。

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

### 📱 6. 移动端 8px 极致紧凑双语韵律与零幽灵占位
- **彻底根除隐形幽灵占位**：从 DOM 移除了段落底部的冗余操作条，释放了 $25\text{px}$ 的无效虚空距离；
- **段间距直降 80%**：移动端段间距严格锁定为 **`8.0px`**，英文卡片与中文精译伴读段内间距收紧为 **`1px~2px`**；
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
├── reader.html                    # 由构建器同步输出的同构副本（构建产物）
├── README.md                      # 本项目设计与技术白皮书
├── CODE_REVIEW.md                 # 360° 全维度评审报告与修复执行记录
├── .gitignore                     # 严密的安全过滤规则（自动忽略大型 PDF、构建产物与缓存）
│
├── assets/
│   ├── css/reader_style.css       # 核心样式源码（唯一真源，构建时镜像至根目录）
│   ├── js/reader_app.js           # 核心交互源码（唯一真源，构建时镜像至根目录）
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
        └── inspect_* / check_* / audit_*                      # 转录期的临时审计工具
```

> **说明**：根目录的 `index.html` / `reader.html` / `reader_style.css` / `reader_app.js` 与 `scripts/legacy/` 下的历史脚本、历史上的 `output/` 构建产物均为**构建产物或一次性工具**，已列入 `.gitignore` 或归档至 `scripts/legacy/`，不可编辑——一切修改请作用于 `assets/` 真源后重新构建。

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

## 🛠️ 2026-08-09 修复执行记录（v2.0）

基于 `CODE_REVIEW.md` 的 6 项缺陷清单完成全局修复与回归：

| 编号 | 缺陷 | 修复方式 | 验证 |
| :---: | :--- | :--- | :--- |
| P0-1 | 盲切软连字符（`extraordinary → ext-rao-rdi-na-ry`） | 删除 `injectSyllables()`，改依赖浏览器原生 `hyphens: auto` 词典断行（`lang="en-US"`） | 数据软连字符 0 残留；JS 无该函数 |
| P0-2 | 事件监听器持续累积（翻页/切刊后重复绑定） | 委托 + 一次性绑定（`dataset.bound` / `bindOne` / `bindStaticEvents`） | 代码审查 + `node --check` |
| P0-3 | 搜索正则崩溃（输入 `a.b((` 触发 `SyntaxError`） | `escRegex()` 全量转义 + 150ms 防抖 + 扁平内存索引 | 行为探针实跑 `a.b((` 通过 |
| P1-1 | 双刊与硬编码路径（`issues/2026-08`） | 数据补 `pubId` / `imageRoot`，全部 `currentIssueObj` 数据驱动 | 压力测试：两刊 imageRoot 目录断言 |
| P1-2 | 移动端 `A+` 失效（28 处 `!important` 焊死 15px） | 样式表重构为纯 CSS 变量管道，移动端 `max(15px, var(...))` 舒适区下限 | 压力测试：`!important` = 0 |
| P1-3 | 滑块拖动触发全量重渲染卡顿 | 拖动只更新文案，`change` 事件才 `loadPage()` | 代码审查 |
| P2/P3 | 剪贴板静默失败、`confirm()` 系统弹窗、无障碍缺口 | `navigator.clipboard` catch、自定义确认模态、`prefers-reduced-motion`、`:focus-visible` | 压力测试断言通过 |
| R-6 | 期刊馆首页误显示阅读器整套 UI（顶栏/收藏复制条/阅读区/底部栏） | `portal 可见 → 整套阅读器 display:none` 纯 CSS 状态联动 | 浏览器审计 8 视口 portal 全隐藏 |
| R-7 | 移动端顶栏挤压不均（320px 品牌仅 3px、胶囊裁半） | 三级降级：隐藏朗读控件 → 胶囊整宽保全 → ≤359px 让位于品牌 | 320px 品牌 61px + 胶囊整宽；390px 品牌 77px |
| R-8 | 桌面阅读区左右留白偏大；sans 模式下英文仍是衬线 | 阅读区 1060→1260px（split 1720→1900px）；`.en-text` 基底改 `var(--font-sans)`，衬线由 `font-mode-serif` 单独覆盖 | 浏览器实测宽度与 computed 字体族均符合 |
| R-9 | 移动端缺失「朗读本页」按钮（≤640px 整块隐藏） | 只隐藏顶栏 `1.0x` 倍速胶囊（语速仍在「更多」菜单），朗读按钮降级为 46px 纯图标 | 浏览器实测 320/390px 朗读按钮可见、不挤压 |
| R-10 | 项目结构冗余（`output/`、全文镜像、一次性脚本/报告） | 删除产物并归档 22 个历史脚本至 `scripts/legacy/`，README 目录树重写 | 213 文件出库；build/audit/stress 全绿 |
| R-11 | **移动端朗读整页按钮残缺 + 转圈抖动**：图标与文字同在一个 span，≤900px 全隐藏致空心按钮；Google Fonts 阻塞首屏、离线打不开 | 按钮拆「图标+文字」两 span；**彻底移除 Google Fonts，改用系统字体栈**（离线下秒开、零网络请求、零抖动） | 移动端按钮 ▶ 可见；8 视口 0 溢出；完全离线可用 |
| R-12 | **移动端隐藏了倍速胶囊**（R-9 期间为腾宽度加入「更多」菜单） | ≤640px 恢复显示 `#audio-speed-btn-top`，压缩为 11.5px/紧凑 padding（实测 30px 宽），品牌/返回按钮让位 | 320/390px 实测倍速胶囊 30px 可见、整行不溢出 |

**构建与测试闭环**（修改数据后请依次执行）：

```powershell
python scripts/build_master_portal.py  # 重建 index.html / reader.html（assets/ 真源 → 根目录镜像）
python scripts/stress_test_engine.py   # 6 套件 30 项断言全绿
node scripts/browser_layout_audit.js   # 真实浏览器多端溢出审计（8 视口 × 7 状态，需 node + playwright-core）
```
