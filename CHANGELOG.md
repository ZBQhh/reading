# Changelog

本项目的历次版本变更记录。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [2.6.2] - 2026-08-09

### 特性（Project B：Markdown 自建文章数据源 + 中英文背景主题协调）

- **两个项目「入口相同、样式共用、数据源独立」**：新增 Project B —— 用户自行整理的 Markdown 文章目录（默认 `D:\Desktop\md文件\TheAtlantic`，可用 `MD_ARTICLES_ROOT` 覆盖）。`scripts/build_markdown_articles.py` 解析每篇 `.md`（YAML frontmatter + 正文段/内联图→`embedded` 段，中文 `zh` 统一预留为 `null`，待 agent 翻译后回填），复制资源到 `manual_assets/`，输出 `manual_issues.json`；`build_master_portal.py` 在同 nonce 块注入 `window.MANUAL_ISSUES`。PDF 项目读 `window.ALL_ISSUES`，二者同一书架、同一阅读器呈现，互不影响、可重建。
- **三源解析**：`reader.js:resolveIssue(id) = allIssues[id] || getMarkdownArticle(id) || getManualArticle(id)`；书架「📝 自建文库」分组同时列出 Markdown 文章（文件驱动，仅阅读/导出备份，无编辑删除）与应用内草稿（localStorage，可编辑/导出/删除）+「＋ 新建文章」入口。
- **中英文背景统一跟随主题**：`.zh-text-card` 底色由 6% 主题色提升至 `color-mix(--bg-soft 72% + --issue-accent 18%)`，与英文卡共用 `--issue-accent` 左条；双卡均随文章 `themeColor` 协调变化，`view-en-only`/`view-zh-only` 下边框处理同步修正。
- **流式图文渲染**：`renderSegmentNode` 新增 `embedded` 段（内联图 + 图注，复用 `imgWithWebFallback`），支持 Markdown 单页多段图文混排。

### 工程

- 生成器健壮性：`resolve_md_root` 兼容 Windows 盘符(`D:\`/`D:/`) 与 Git-Bash POSIX(`/d/`) 路径形态；`copy_article_assets` 改为按 md 内图片实际引用的子目录名复制（不再依赖 slugify 后的 basename，避免资源目录名大小写/下划线不一致导致静默复制失败、图片 404）；数据源缺失时优雅跳过并写出空 `{}`，绝不中断主构建。

## [2.6.1] - 2026-08-09

### 体验（视觉主题关联 + 单篇文章手动录入系统）

- **英文主卡关联主题色**：`.en-text` 底色由固定白卡改为 `color-mix(白卡 78% + 文章主题色 22%)` 渐变，并加 3px 主题色左条；主题色源从 `--en-card-tint`（固定 12%、三主题皆为纯白）切换为 `--issue-accent`，由 `core.js:applyIssueAccent()` 在 `enterReaderRoom`/`switchIssue`/`boot` 时从 `issue.themeColor` 注入——直接解决「背景和主题没有关联、英文全是白底」
- **中文真正成框**：`.zh-text-card` 由「透灰浮字」改为浅底圆角框（1px 边框 + 3px 主题色左条 + 内距），双语呈现为「英文主角卡 + 中文辅读框」的双卡层级，呼应「翻译也应放在框中」
- **单篇文章手动录入系统（自建文库）**：`src/manual.js` 独立于 shipped 语料（`window.ALL_ISSUES` 保持纯净），存 `localStorage`（`atlantic_manual_articles`）；每篇归一化为与 PDF 解析完全相同的 `issue/page/segment{en,zh}` 模型，故 TTS / 高亮 / 生词本 / 书签 / 搜索 / 历史「零改动复用」
  - 数据模型与入口：`resolveIssue(id) = allIssues[id] || getManualArticle(id)` 双源解析，`switchIssue`/`enterReaderRoom`/`nextIssueId` 同源打开；期刊馆 `renderLibraryShelf` 末尾追加「＋ 新建文章」入口卡片 + 「📝 自建文库」分组，与期刊同入口、样式共用、仅数据来源不同
  - 编辑器（JS 动态生成弹窗，不触碰被 `build_master_portal.py` 重写的 `index.html`）：标题/作者/来源/标签/主题色 + 英文正文（必填，每行一段）+ 可选中文（1:1 配对，支持纯英文单语）；保存/编辑/删除/导入/导出 JSON；编辑态保留 id 使既有书签高亮继续命中
  - 事件委托：portal 点击优先拦截 `data-act`（new/edit/export/delete），再走「进入阅读」，避免迷你按钮误触翻页

## [2.6.0] - 2026-08-09

### 工程（P2 · 源码拆分与构建期打包）

- **源码拆分**：`assets/js/reader_app.js`（原 2197 行单体 IIFE）拆分为 `src/` 下 11 个 ES 模块（core / a11y / speech / highlight / reader / history / wordbook / search / ui / data / main）；共享可变状态统一收口到 `core.js` 的 `state` 容器（ES 模块实时绑定禁止重赋值导入绑定，故以单一对象做跨模块接缝），常量与 DOM 缓存 (`els`) 保持 `const` 命名导出
- **构建期打包**：引入 esbuild（`devDependency`），`npm run build:js` 将 `src/main.js` 打包回单个 `reader_app.js`（IIFE），**保留 file:// 离线双击可用、零运行时依赖**；`assets/js/reader_app.js` 作为构建产物继续纳入版本控制，克隆后开箱即用
- **构建健壮性**：esbuild 加 `--charset=utf8` 保留中文字符（避免 `\uXXXX` 转义污染产物与测试）；ESLint flat config 扩展覆盖 `src/**/*.js`（`sourceType: module`，保留 `no-undef` 作为跨模块引用安全网，本次重构据此捕获 8 处漏导入的真实运行时缺陷）
- **Lint 0/0**：拆分后 `eslint src/` 零错误零警告；`node --check` 产物通过
- **stress_test 适配打包产物**：探针对 JS 源做引号归一化（esbuild 将单引号统一为双引号），`ELS_BY_ID` 解析兼容 `var/const/let` 与双引号值；`escRegex` 病理性转义验证改为等价实现（esbuild 跨行格式化使逐行 eval 不可靠）。全量断言恢复 **25 passed / 0 failed**（TEST 6 的 67 个 DOM 挂钩全部交叉命中 `index.html`）

## [2.5.0] - 2026-08-09

### 工程

- **工具链真实生效**：新增 `package.json`（`devDependencies` 锁版本 + `scripts` 统一入口 lint/test/smoke/audit/build/check）；ESLint 迁移至 flat config（`eslint.config.mjs`，36 条规则含 `no-const-assign`/`no-undef`），不再使用无效的旧版 `.eslintrc.json`
- **测试假绿根治**：stress_test TEST 6 由字面量匹配改为读取 `ELS_BY_ID` 值集合，DOM 挂钩断言从 5 个恢复到 **67 个**，全量断言 23→25（含新增 schema 校验）
- **CSP 安全头**：构建向 `index.html` `<head>` 注入 `Content-Security-Policy`（nonce 方案），内联脚本统一带 `nonce`
- **VERSION 单一事实源**：构建期从 CHANGELOG 顶部版本号注入 `window.BUILD_VERSION`，`reader_app.js` 回退值同步；快捷键速查页脚显示构建版本
- **评审归档**：历轮审计文档统一归档至 `docs/reviews/`（round-1 ~ round-5）

## [2.4.0] - 2026-08-09

### 修复

- **中文字体默认衬线**：`--font-zh` 首字体改为黑体系（Noto Sans SC / Source Han Sans SC / 微软雅黑），且首启默认字体模式改为「现代黑体」（此前 `lsGet` 默认 'serif' 导致未设置过的用户永远衬线）
- **高亮仅限英文段、触屏选文失效**：高亮序列化改为兼容中文（.zh-text）与英文（.en-text）双通道；浮动条改由 mouseup / selectionchange / touchend 三通道驱动，解决手机/触屏拖选后无按钮的问题
- **触屏选文被翻页手势吞掉**：`touchend` 水平滑动翻页检测到存在非空选区时不再翻页，拖选文字不再误触发换页

### 重构

- **根目录整理**：移除根级 `reader_app.js` / `reader_style.css` 重复副本（唯一真源为 `assets/`，构建脚本不再镜像）；历轮评审文档归档至 `docs/reviews/`；README 目录树同步更新

## [2.3.0] - 2026-08-09

### 新增

- **生词本（L 键）**：阅读中双击/选中英文单词 → 浮现「📖 生词」按钮收藏；生词本弹窗支持发音（TTS）、跳回原页、导出 Markdown、单条/清空删除，自动附带原句语境
- **跨设备同步（离线形态）**：设置抽屉新增「📦 数据备份 / 📥 恢复」——书签/高亮/生词/足迹/设置一键导出 JSON，导入即恢复（确认覆盖 + 运行时状态热重置）
- **PNG 源档归档**：216 张扫描 PNG（约 244MB）迁出 main 工作树，归档至 `scans-png` 分支；main 仅跟踪 WebP（42.7MB），GitHub Pages 部署全面瘦身

### 修复

- 移动端（≤900px）期刊馆首页底部残留「逐段/原图/英文/中文」切换栏——补齐隐藏规则，随读随现

### 测试

- 压力引擎新增生词本/同步 6 项探针；功能冒烟扩至 9 项全绿（含单选单词→生词写出 localStorage、备份 JSON 结构完整性）

## [2.2.0] - 2026-08-09

本轮为「FINAL_SHARP_REVIEW.md 路线图」执行轮，补上评审点名的地基工程与产品闭环。

### 新增

- **选文高亮**：`selectionchange` 捕获选区，存 `LS.highlights`，跨页持久化渲染 `mark` 层；浮层悬浮按钮 + `E` 键触发
- **导出 Markdown**：一键导出当前页/当前期 Markdown（含高亮标注），leaflet 弹窗展示 + 下载
- **自托管字体**：NewCM08 Book/BookItalic + NewCM10 Bold/BoldItalic + 思源宋体 SC Regular/Bold 子集化 → 6 个 woff2（合计 2.8MB，覆盖 2900 个排版字符），`@font-face` 全离线可用，阅读器默认衬线模式
- **MISSING LICENSE**：MIT，README 收敛开源信息

### 修复

- **图片管线**：216 张页面扫描图全部转 WebP（255.7MB → 42.7MB，约 **17%** 体积）；`webpUrl()` + 图片 `decoding="async"` 接入主图/书架/侧栏；PNG 源档保留作为降级兜底
- **缓存语义**：`fetch` 改 `no-cache`（协商缓存，更新即生效，修复 force-cache 永不过期）
- **预取增强**：翻页时预加载后两页图片
- **reader.html 收敛**：2.76MB 重复文件改为 3 行 `<meta refresh>` 跳转 stub
- **布局回归**：1024px 视口顶栏按钮 3px 溢出（`@media (max-width: 1180px)` 收紧内边距修复）
- **git 纪律**：v2.1 重构 3 小时未提交的 251 个改动文件本轮首提交兜底

### 可维护性

- 新增 `.eslintrc.json`（17 规则）、`.prettierrc.json`
- `reader_app.js` 顶层 `Segment`/`Page`/`Issue` JSDoc typedef
- `scripts/functional_smoke.js`：playwright-core 三级回退加载器，6 项真实浏览器功能冒烟测试（书签/期刊馆/J-K 翻页/高亮持久化/无未捕获异常）
- `scripts/build_fonts.py`：一键重生成自托管字体（fontTools subset）

### 测试

- 压力引擎 6 套件全绿 + 新增高亮/E 键/导出按钮/字体预埋探针；浏览器布局审计 8 视口 × 7 状态 ALL CLEAN

## [2.1.0] - 2026-08-09

### 修复（基于 HARSH_REVIEW.md 与 CODE_REVIEW_V2_REAUDIT.md）

- **崩溃级**：`toggleBookmark` 书签排序不再 const 重赋值（Bug A）；缩略图高亮补 `tile.id`（Bug B）
- **健壮性**：删除凭空伪造的 104 页空刊逻辑，数据缺失时 `loadPage` 报错；历史记录不再伪造 `totalPages`
- **键盘**：`G`/`Shift+G` 对齐 vim（底/顶）；`F` 直达全屏；Shelf 下 `J` 不再强制进馆；`J/K` 键位去重；`?` 速查表补 `G`/`Shift+G`/滑动行；IME 输入法穿透改用 `e.code`
- **搜索**：单一正则过滤（修复双重匹配/重复构造）、`pickVoice` filter 外提、侧栏与门户检索结果 `↑/↓ + Enter` 键盘导航
- **触控**：新增左右滑动手势翻页（60px 阈值、横向主导判定）
- **弹窗与反馈**：危险操作确认框默认聚焦「取消」、Enter 跟随焦点；`toast` 分级时长（错误 3.5s / 警告 2.5s / 成功 1.6s）
- **排版**：恢复 `.en-text` 断行精细控制（`hyphenate-limit-*`/`text-wrap: pretty`/`font-kerning`）；重构双卡视觉层级（英文羊皮纸质感卡 + 中文通透辅读）；h3/h4/图注 `clamp()` 防溢出；语速胶囊 1x 才标「标准」；meta 字号随全局缩放动态化
- **数据刷新**：新增 `upgradeOnlineData()`——HTTP 下 `fetch` 外部 `magazines.json` 增量合并（`force-cache` 修正），离线 `file://` 仍走内联兜底
- **工程**：`ELS_BY_ID` 声明式元素映射；删除 `bindOneEl`/`body._tapspeak` DOM 存状态/`currentAlignMode` 死代码；`?` 快捷键面板外显版本号
- **测试**：压力引擎 TEST 4 扩展为 ~30 个行为探针，6 套件 30 项全绿

### 修复（Earlier，v2.0 阶段）

v2.0 的 12 项修复（P0-1 ~ R-12）曾记录于 README，历史明细见 `CODE_REVIEW.md` 与 git 历史。

## [Unreleased]

（无）