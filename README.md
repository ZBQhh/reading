# 🏛️ 《大西洋月刊与全球典藏期刊馆》（The Atlantic & Global Journals Digital Edition）

> **“依托 1:1 印刷排版首行缩进解析、真实作者段落集与 24px 英文微浮雕卡片，为您呈现比肩 Apple News+ 的双语深度私享阅读体验。”**

本项目为《大西洋月刊》（**2026年8月刊 104 页** 与 **2026年7月刊 112 页**，共 216 页完整典藏）及未来全球顶级期刊（《经济学人》、《纽约客》、《连线》、《哈佛商业评论》等）所打造的**高保真双语转录、全维印刷排版重构、双层零堆叠响应式与全自动流水线级 Web 数字典藏馆系统**。

---

## ✨ 核心特性与出版级架构

### 🎨 1. 六款顶级期刊定制阅读主题（6 Curated Luxury Editorial Themes）
顶栏【主题选择器】内置 6 款经过严苛光学对比度与护眼调校的顶级配色：
- **`☀️` 晨曦象牙白（*Light Ivory*）**：象牙白底色（`#f8f6f0`）+ 柔温纸感卡（`#f2ece0`），经典《大西洋月刊》纸刊质感。
- **`📜` 复古羊皮纸（*Sepia Vintage*）**：羊皮纸暖黄（`#f4ecd8`）+ 古籍金卡（`#ece0c6`），浓郁书卷气息，极佳温润纸感。
- **`🏖️` 清新夏日海滩（*Summer Beach*）**：海风蔚蓝（`#f0f7f8`）+ 细沙贝壳暖卡（`#e6f1f4`）+ 深海墨字（`#102a36`），清爽通透，久读不燥。
- **`🧊` 学术冷静冰川（*Academic Calm*）**：北欧冰川灰（`#f1f4f8`）+ 沉思冷灰卡（`#e4e9f1`）+ 牛津蓝墨（`#182232`），沉静专注，适合深度特稿。
- **`🌿` 森林晨雾薄荷（*Forest Sage*）**：抹茶晨雾绿（`#f2f7f2`）+ 竹青养眼卡（`#e5eee5`）+ 苍松深绿墨字（`#16291a`），天然极度护眼。
- **`🌙` 极夜深曜石（*Midnight OLED*）**：纯粹黑曜石（`#0c0e12`）+ 炭黑深邃卡（`#141720`），夜读省电无眩光。

---

### 📱 2. Apple News+ 双层零堆叠多端自适应（Dual-Deck Mobile Responsive Architecture）
- **桌面端（$\ge 1280\text{px}$）**：单行全景优雅展开，呼吸感十足，全功能一览无余。
- **移动与平板端（$\le 768\text{px}$ / $\le 480\text{px}$）**：
  - **顶层核心操作栏（Top Bar, 48px）**：`[ 🏛️ 馆 ] [ 目录 ]` 居左，`[ 📅 8月刊 ]` 居中，`[ 🔊 朗读 ] [ ☀️ 主题 ]` 居右；
  - **第二层分段视图栏（Mobile Sub-Bar, 38px）**：置顶高斯模糊毛玻璃条，满宽均匀排列 **`[ 📖 逐段 ]` `[ 🪟 原图 ]` `[ 🇺🇸 英文 ]` `[ 🇨🇳 中文 ]`**，单手大拇指轻触毫秒级切换，**全视口 0 堆叠、0 拥挤**；
  - **掌上 19px 温润纸感卡片**：手机端英文 19px（行高 1.74），中文 17px，配合 44px+ 触控黄金底栏与 iOS Safari 底部安全区适配（`env(safe-area-inset-bottom)`）。

---

### 🧠 3. 全维印刷排版重构算法 2.0（Print Layout Heuristic Engine 2.0）
- **大写首字下沉焊接（Drop-Cap Welding）**：自动识别 48pt 巨幅下沉字母，精准缝合回首个单词，杜绝断头字。
- **跨栏断词连字符自动缝合（Hyphenation Reconnection）**：智能识别排版断行连字符（如 `demo-` + `cracy` $\rightarrow$ `democracy`）。
- **多栏物理列流与拓扑排序（Multi-Column Flow）**：严格按左右物理栏位自顶向下聚类，彻底根除“Z”字形跳读。
- **极端纯画作页全画幅保护（Full-Bleed Art Protection）**：全版艺术摄影与画作自动优雅呈现为典藏画廊卡片，绝不白屏。

---

### 🧭 4. 出版级目录垂直黄金居中与全能快捷键套件
- **智能双向垂直居中联动（`block: 'center'`）**：翻页时，左侧【目录导航】与【缩略图】自动平滑滚动并将当前章节对齐到侧边栏视口中央，开头与末尾自然贴边。
- **防连跳单页翻页（Strict Single-Step Navigation）**：单重事件监听器与硬件级防抖锁，保证按一次按键严格翻阅 1 页。

| 快捷键 | 功能说明 | 快捷键 | 功能说明 |
| :---: | :--- | :---: | :--- |
| **`Space`** | 平滑向下翻半屏 | **`Shift + Space`** | 平滑向上翻半屏 |
| **`S` / `↓`** | 平滑向下微滚 260px | **`W` / `↑`** | 平滑向上微滚 260px |
| **`J` / `→` / `PageDown`** | 精准翻至下一页 | **`K` / `←` / `PageUp`** | 精准翻至上一页 |
| **`G` / `Home`** | 平滑直达本页顶部 | **`Shift + G` / `End`** | 平滑直达本页底部 |
| **`1` / `2` / `3` / `4`** | 秒切四大视图（逐段/原图/纯英/纯中） | **`M`** | 一键跨期秒切（8月刊/7月刊） |
| **`T`** | 展开 / 收起侧边栏目录 | **`P`** | 原声朗读本页英文 (TTS) |
| **`B`** | 收藏 / 取消本页书签 | **`F`** | 全屏沉浸阅读模式 |
| **`Esc` / `H`** | 收起弹窗或返回期刊馆首页 | **`?`** | 随时呼出快捷键速查面板 |

---

### ⚙️ 5. 多刊物品牌矩阵与一键全自动入库流水线
- **期刊馆矩阵筛选（Brand Filter Pills）**：支持在【全部典藏】、【大西洋月刊】、【经济学人】、【纽约客】、【连线】、【哈佛商业评论】之间秒级筛选。
- **全库全文秒级检索**：首页搜索栏支持对全刊库所有历史期刊、章节、特稿及双语段落进行实时秒查并一键直达。
- **标准化入库命令**：
  ```bash
  # 任意新 PDF 自动化一键切图、排版解析与入库：
  python scripts/ingest_magazine.py --pdf raw_pdf/Atlantic_2026_09.pdf --pub the-atlantic --issue 2026-09 --name "2026年9月刊"
  ```

---

## 📁 现代化目录组织与资产树

```tree
TheAtlantic/
├── index.html                     # 生产级双语阅读馆（纯相对路径，支持离线与 GitHub Pages 部署）
├── reader_style.css               # 6 大奢华主题与 Apple News+ 双层响应式样式表
├── reader_app.js                  # 核心交互引擎（TTS 朗读、垂直居中联动、快捷键套件、跨期切换）
├── README.md                      # 本项目设计与技术白皮书
├── .gitignore                     # 严密的安全过滤规则（自动忽略大型 PDF 与缓存）
│
├── assets/
│   ├── css/reader_style.css       # 核心样式源码
│   ├── js/reader_app.js           # 核心交互源码
│   └── data/
│       ├── publications.json      # 多刊物品牌矩阵元数据
│       └── magazines.json         # 双语期刊全量解析数据集
│
├── issues/
│   ├── 2026-08/                   # 2026 年 8 月刊（104 页完整转录）
│   │   ├── images/                # page_001.png ~ page_104.png (150 DPI 高清切图)
│   │   └── full_magazine.md       # 8月全本 Markdown 典藏
│   └── 2026-07/                   # 2026 年 7 月刊（112 页完整转录）
│       ├── images/                # page_001.png ~ page_112.png (150 DPI 高清切图)
│       └── full_magazine.md       # 7月全本 Markdown 典藏
│
└── scripts/                       # 自动化处理流水线
    ├── ingest_magazine.py         # 新刊一键标准化全自动入库 CLI
    ├── reconstruct_true_author_paragraphs.py # 印刷排版重构算法 2.0
    └── build_master_portal.py     # 生产单页应用自动化编译器
```

---

## 🚀 启动与部署

1. **本地运行**：直接在文件管理器中双击打开 **`index.html`** 即可完全离线畅读 216 页完整期刊！
2. **云端安全推送**：本项目完全兼容 **SafeGit** 自动化工作流：
   ```powershell
   Import-Module D:\Desktop\SafeGit\SafeGit.psd1
   sgit-update "feat: your update message"
   ```
3. **GitHub Pages 部署**：推送至 GitHub 仓库后，在仓库 Settings $\rightarrow$ Pages 中选择 `main` 分支根目录，即可自动获得全球 CDN 加速的在线阅读网站。
