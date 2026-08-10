# AGENTS.md — TheAtlantic Reader 开发者 / Agent 上手指南

> 面向**后续接手本项目的任意 agent（或人类开发者）**。读完本文件即可独立完成：
> 同步自选文章数据、翻译回填、UI/排版修改、构建、测试、部署推送。
> 产品说明见 `README.md`；版本变更见 `CHANGELOG.md`。

---

## 0. 一句话定位

一个**纯静态、离线可用**的中英双语阅读器（The Atlantic 等英文刊物 + 用户自建「自选文章」）。
技术栈：Vanilla JS（ES Modules）+ esbuild（打包为 IIFE）+ 原生 CSS + 少量 Python 构建脚本。
无后端、无框架，部署到 GitHub Pages。

- 仓库：`ZBQhh/reading`（GitHub）
- 当前版本：`src/core.js` 中 `export const VERSION`（当前 `2.6.14`）
- 工作树根目录：`D:\Desktop\TheAtlantic`

---

## 1. 仓库结构与关键文件

```
D:\Desktop\TheAtlantic\
├── index.html                ← 主页门户（⚠️ 由脚本整文件重写，勿手写改动静态结构）
├── reader.html               ← 阅读器壳（极薄，加载打包后的 JS）
├── assets/
│   ├── js/reader_app.js      ← esbuild 打包产物（src/*.js 合并）
│   └── css/reader_style.css  ← 全部样式（含桌面 / 移动端媒体查询）
├── src/                      ← 源码（ES Modules）
│   ├── main.js               ← 主编排：书架、翻页、触屏、键盘、切换菜单
│   ├── reader.js             ← 阅读器核心：loadPage / enterReaderRoom / 进度条
│   ├── manual.js             ← 自选文章排序与解析辅助
│   ├── core.js               ← VERSION / 常量
│   ├── highlight.js, wordbook.js, ...   ← 高亮、生词本等特性
├── scripts/
│   ├── build_markdown_articles.py  ← 数据源 → manual_issues.json（自选文章生成器）
│   ├── build_master_portal.py      ← 注入 window.MANUAL_ISSUES 并重写 index.html
│   ├── functional_smoke.js         ← 冒烟测试（playwright-core + Edge）
│   ├── browser_layout_audit.js     ← 布局审计（需浏览器）
│   └── stress_test_engine.py       ← 引擎压力测试
├── manual_issues.json        ← 自选文章数据（⚠️ 构建产物，被 .gitignore 忽略）
├── manual_assets/            ← 自选文章内联图（✅ 须纳入 git，否则线上 404）
├── manual_translations/      ← 译文侧车 <slug>.zh.json（✅ 须纳入 git，译文持久化）
├── issues/                   ← 杂志刊数据源（PDF 解析项目产出，window.ALL_ISSUES）
├── docs/                     ← 其他文档（reviews 等）
├── .github/workflows/ci.yml  ← CI 流水线
├── _config.yml / .nojekyll    ← GitHub Pages 部署配置
└── package.json              ← 脚本入口（见 §3）
```

**⚠️ `.workbuddy/` 已被 .gitignore 忽略**——本项目的 agent 记忆（`.workbuddy/memory/`）不进仓库。
本 `AGENTS.md` 就是把那些记忆中应长期保留的部分「固化」进仓库的载体，二者需保持同步。

---

## 2. 三大数据源与合并模型

阅读器书架由三类数据合并而成，运行时统一为 `allIssues` 对象：

| 来源 | 标识 | 注入方式 | 说明 |
|---|---|---|---|
| 杂志刊 | `source:"magazine"`（默认） | `window.ALL_ISSUES`（由 `issues/` 解析） | PDF 解析项目产出，不在本仓库构建 |
| **自选文章** | `sourceType:"markdown", pubId:"manual"` | `window.MANUAL_ISSUES` | 本仓库 `manual_issues.json` 产出（§4） |
| 本地草稿 | `source:"manual"` | `localStorage` | 用户在浏览器内新建的草稿 |

- 判定「是否为自选文章」用 `isManualIssue(obj)`（reader.js 导出）：`obj.source === 'manual' || obj.sourceType === 'markdown'`。
- 单篇流式文章（`isManualIssue`）**不接管水平手势翻页**（它没有多页），进度条为 0–100 的读进度。
- 杂志刊用 `nextIssueId()` 在 `Object.keys(allIssues)` 中循环切换——仅含杂志，**自选不在循环内**。
  切回「自选文库」靠顶部日期胶囊下拉菜单（`openIssueSwitcher`），不要依赖 `nextIssueId()`。

---

## 3. 构建管线（`npm run build`）

`package.json` 脚本：
```
build:js   = esbuild src/main.js --bundle --format=iife --target=es2018 --charset=utf8 --outfile=assets/js/reader_app.js
build:md   = python scripts/build_markdown_articles.py
build      = npm run build:js && npm run build:md && python scripts/build_master_portal.py
lint       = eslint src/
test       = python scripts/stress_test_engine.py
smoke      = node scripts/functional_smoke.js
audit      = node scripts/browser_layout_audit.js
```

**⚠️ 关键约束**：`index.html` 由 `build_master_portal.py` **用写死的 HTML 模板整文件重写**，
不只是注入 JSON。任何对 `index.html` 静态结构（筛选项、顶部按钮、弹窗骨架等）的改动，
**必须改 `build_master_portal.py` 里的模板字符串**，直接改 `index.html` 会在下次 `npm run build` 被覆盖。
JS 逻辑改动走 `src/*.js`（经 esbuild 打包）。

---

## 4. 自选文章工作流（最常用操作）

数据源（用户自行整理）：**`D:\Desktop\reading\reading data\TheAtlantic`**，按月份分子目录
（如 `2026-08/`），每篇一个 `.md`（同名 `.html` 可并存，构建只吃 `.md`）。

> 可用环境变量 `MD_ARTICLES_ROOT` 覆盖默认数据源根目录（脚本已做 Windows 盘符 / Git-Bash POSIX 路径兼容）。

### 4.1 新增 / 更新一篇自选文章

1. 把文章 `.md` 放进 `D:\Desktop\reading\reading data\TheAtlantic\<月份>\`。
2. 确保 frontmatter 头部完整（见 4.2）。
3. 运行 **`npm run build:md`**（或完整 `npm run build`）。
   脚本会：解析全部 `.md` → 生成 `manual_issues.json` → 把 `./assets/<原文件夹>/` 复制到
   `manual_assets/<原文件夹>/` → 回填译文侧车（若有）→ 最后 `build_master_portal.py` 注入 `window.MANUAL_ISSUES`。
4. 文章**无需翻译**也能上线（`zh` 字段为 `null`，阅读器会显示原文）。

### 4.2 Markdown frontmatter 规范

```markdown
---
title: "A Culture War in the Bedroom"      # 显示标题（displayName）
author: "Faith Hill"                        # 作者
date: "2026-08-10"                          # 发布日期
website: "TheAtlantic"                      # 来源站点（决定默认主题色，见 4.4）
month: "2026-08"                            # 月份分组
source: "https://..."                       # 原文链接
saved_at: "2026-08-10 21:32:21"             # 采集时间（可选）
---

# 标题（首行 H1 会被跳过，避免与 frontmatter 重复）

> **作者**: ... | **发布日期**: ... | **来源**: ...    ← 引用块（> 开头）被忽略

![alt](./assets/<原文件夹>/x.jpg)            ← 内联图，路径会被改写为 manual_assets/...
*图注（斜体行）*                              ← 图片后首个斜体行作为图注 caption

正文段落……（仅英文，无中文）
```

- 正文切段规则（`split_segments`）：空行分段；`#` 标题行保留为段落文本；`>` 引用块忽略；
  `---` 分隔线忽略；`![alt](src)` 为内联图段（`embedded`），其后首个 `*斜体*` 为图注。
- `zh` 字段**一律预留为 `null`**，由译文侧车回填（见 4.3），不写在 md 里。

### 4.3 译文回填（侧车机制）

译文**不**写进 `manual_issues.json`（它是可重建产物，会被覆盖）。译文持久化在
**`manual_translations/<slug>.zh.json`**（纳入 git）：

```json
{
  "paragraphs": ["第1段中文…", "第2段中文…", "…"],
  "captions":   ["第1张图注中文…"]
}
```

- `paragraphs` 按段落顺序、`captions` 按内联图出现顺序回填。
- `slug` = 文件名 `slugify`：`2026-08-10_A_Culture_War_in_the_Bedroom.md`
  → `2026-08-10-a-culture-war-in-the-bedroom`（保留日期前缀，下划线转连字符）。
- **用不同 agent 翻译时**：让 agent 读取 `manual_issues.json` 中某篇 `segments[].en`，
  按相同顺序写出 `manual_translations/<slug>.zh.json`，再跑 `npm run build:md` 即可回填。
- 资源文件夹名保留**原始大小写 / 下划线**（如 `2026-08-10_A_Culture_War_in_the_Bedroom`），
  与 slug 不同，复制时以 md 内图片引用为准，不要自行 slugify 资源目录。

### 4.4 主题色

默认按 `website` 映射（`theatlantic→#b91c1c`、`nytimes→#1a4ed8`、`newyorker→#c0392b` 等），
可被 frontmatter `theme_color` 覆盖。该色写入 issue 的 `themeColor`，运行时作为文章强调色。

---

## 5. 渲染模型与 DOM 契约（改 CSS/JS 时必读）

段落 DOM 结构（**类名被多个脚本直接查询，改动会破坏功能**）：

```
.segment-block.seg-card              ← 外层唯一框（仅 paragraph / ad 加 seg-card）
   ├── .en-text                       ← 英文段（深色底）
   └── .zh-text-card                  ← 中文段（浅色底 + 实线 border-top 分隔）
```

- **类名 `.en-text` / `.zh-text-card` 被 `main.js`、`highlight.js`、`wordbook.js`、
  `functional_smoke.js` 直接 `querySelector`**。改动渲染结构时**必须保留这两个类名**，
  否则高亮 / 生词本 / 冒烟测试会失效。
- 标题段（`h3`/`h4`）、图注**不**套 `seg-card`。
- 强调框的左边框色用 `border-top: 2px solid var(--issue-accent);`。

---

## 6. 主题系统（⚠️ 易错点）

`--issue-accent` 必须在**每个** `body.theme-*` 块内绑定为 `var(--accent)`：
```css
body.theme-light  { --accent: #...; --issue-accent: var(--accent); }
body.theme-sepia  { --accent: #...; --issue-accent: var(--accent); }
/* beach / academic / forest / dark 同样各自绑定 */
```
**不能只在 `:root` 声明** `--issue-accent: var(--accent)`——因为 `--accent` 不在 `:root` 定义，
`:root` 处 `var(--accent)` 会解析为无效值，导致整条 border/background 被丢弃、颜色不随主题变。
（用户反复强调：强调框颜色应随主题改变、不写死。）

---

## 7. 移动端适配约定（≤640px）

- `viewport-fit=cover` + `env(safe-area-inset-*)`：header / bottom-bar 的 padding
  **必须**含 safe area，否则 iPhone 全面屏溢出 / 重叠。
- **字号用 CSS 响应式缩放**（不改 JS 默认值）：
  `.en-text` / `.zh-text-card` 用 `max(13.5px, calc(var(--reader-font-scale) * 0.8))`。
  不要改 `state.globalFontScale` 默认值（会持久化到 localStorage 影响桌面端）。
- **中英左右内边距**：当前 **24px**（经 15→20→17→20→24 多轮迭代；中英严格一致保证左对齐；
  文字距强调框线 = 1px border + 24px = 25px）。
- **⚠️ h3/h4 标题段坑**：`.segment-h3 .en-text { padding: 0 }` 特异性高于通用 `.en-text` 移动端规则，
  导致标题段实际只吃父容器 `.segment-h3 { padding: 8px 14px }`（桌面值）。
  **改移动端 `.en-text` padding 时，必须同步在 `@media (max-width:640px)` 覆盖
  `.segment-h3 { padding: 10px 24px; }` / `.segment-h4 { padding: 7px 24px; }`**，否则标题段贴边。
- **返回键拦截**：阅读文章时按浏览器返回键 → 回首页而非退出网页。
  实现：首次进入阅读室时 `history.pushState({_atl:'reader'})` 注入状态，`popstate` 监听器检测到
  阅读中则 pushState 回填 + `openLibraryShelf()`。通过全局回调 `window.__atl_armReaderHistory`
  从 `reader.js` 回调 `main.js`（ES Module import 不可重新赋值的绕过方式）。
- 触屏翻页：旧页沿手指方向滑出（FLIP_MS=240），新页从对侧滑入（SLIDE_IN_MS=280），
  `cubic-bezier(.22,.61,.36,1)` 缓动；单篇流式文章（`isManualIssue`）不接管水平手势。

---

## 8. CI 红线（务必遵守，否则 CI 红）

1. **模块级函数只能调用模块级函数**：`src/main.js` 中模块级函数（如全局键盘处理器
   `handleGlobalKeyDown`）只能调用模块级函数。在 `init`/`setup` 作用域内定义的辅助函数
   （如 `openIssueSwitcher` 及其依赖）若被模块级代码引用，**必须整体提升到模块级**，
   否则 ESLint `no-undef` 会让 `npm run lint` 报错、CI 红。ESLint 仅 error 才红（warning 不影响 exit code）。
2. **index.html 静态结构走 Python 模板**（见 §3），不要手写改 `index.html`。
3. **浏览器脚本路径不写死**：`scripts/browser_layout_audit.js` 与 `scripts/functional_smoke.js`
   用 `path.join(__dirname,'..','index.html')` 推导目标；浏览器路径用 `process.env.AUDIT_BROWSER` 覆盖。
   CI（Ubuntu）无系统浏览器：`audit` 直接跳过；`smoke` 改用 `chromium.launch()`（playwright 自带），
   launch 失败则 `process.exit(0)` 优雅跳过；并过滤 `fonts.googleapis/gstatic/net::ERR` 等网络噪声。
   本地（非 CI）用系统 Edge + `executablePath`。

### CI 流水线（`.github/workflows/ci.yml`）
`push` 到 `main`/`master` 触发：`npm install` → `npm run lint` → `npm run build` →
`npm test` → `npx playwright-core install chromium` → `npm run smoke` → `npm run audit`。
全部绿才允许发布。本地可在推送前用同样命令自检。

---

## 9. 测试与验证（推送前必跑）

```bash
npm run lint     # ESLint，0 error
npm run build    # 打包 JS + 生成数据 + 重写 index.html
npm test         # 引擎压力测试（python，当前 ~26/26）
npm run smoke    # 浏览器功能冒烟（12/12）
npm run audit    # 布局审计（需浏览器；CI 上自动跳过）
```
任一失败先本地修，再推送。

---

## 10. 部署（GitHub Pages）

- 仓库用 GitHub Pages「从分支部署」（main/根），默认走 Jekyll；根目录 `.nojekyll` 已禁用 Jekyll。
- `_config.yml` 的 `exclude` 列出非站点目录（`docs/ issues/ scripts/ src/ tools/ node_modules/
  _backups/ raw_pdf/ manual_translations/ .github/` 等）与 `*.md`，双保险防止 Jekyll 误解析
  `docs/reviews/*.md` 的 `{{ }}` JSDoc 导致部署失败。
- `manual_assets/` **须纳入 git**（文章内联图，否则线上 404）；`manual_issues.json` 为可重建中间产物，
  保持忽略（其数据已 inline 进 `index.html` 的 `window.MANUAL_ISSUES`）。
- 改完可能影响部署的提交后，去 Actions 看最新 "pages build and deployment" run，确认 `conclusion=success`。

---

## 11. 推送流程（SafeGit，勿裸 `git push`）

本仓库推送**必须**用 SafeGit，不要裸 `git push`：

```powershell
Import-Module D:\Desktop\SafeGit\SafeGit.psd1
sgit-update "feat: 你的提交说明"
```

`sgit-update` 会自行 `git add .` + commit + push，并带**仓库守卫**：比对
`tools/git/git-config.psd1` 的 `ExpectedRepo = ZBQhh/reading` 与 origin，一致才放行。
（仓库记忆：曾因裸 `git push` 推错远端，故强制 SafeGit。）

---

## 12. 版本与 CHANGELOG

- 版本号：`src/core.js` 的 `export const VERSION`（语义：x.y.z，如 `2.6.14`）。每次功能性变更 bump。
- 变更记录：`CHANGELOG.md`（Keep a Changelog 规范），新版本追加在顶部。
- `README.md` 顶部「最新版本」描述需同步更新。

---

## 13. 沙箱 / 清理注意事项

- 删除工作树内文件**优先 `git rm`**（从索引移除）；未跟踪的小文件用 PowerShell
  `Remove-Item -LiteralPath <绝对路径> -Force`（避免 `rm` 被安全删除包装器拦截报错）。
- **不要**用 `shutil.rmtree` / `rm -rf` 删除个人目录（Desktop/Downloads 等）——本仓库的
  构建脚本已改用 `copytree(dirs_exist_ok=True)` 覆盖而非 rmtree，规避沙箱安全删除拦截。
- 临时验证脚本（如 `_verify_*.js`、`_debug*.js`、`debug_*.png`）**勿提交**进仓库；
  用完即删，避免污染 `git ls-files`。

---

## 14. 快速上手清单（新 agent 第一次干活）

1. 读 §2–§4 弄清数据与自选文章流程。
2. 要加文章：放 `.md` 到数据源 → `npm run build:md` → 验证 `manual_issues.json` 篇数。
3. 要翻译：写 `manual_translations/<slug>.zh.json` → `npm run build:md` 回填。
4. 要改 UI：改 `src/*.js` 或 `assets/css/reader_style.css`（遵守 §5/§6/§7/§8 约束）。
5. 改 `index.html` 静态结构 → 改 `scripts/build_master_portal.py` 模板。
6. 本地跑 §9 全绿。
7. 改 `src/core.js` 版本号 + 追加 `CHANGELOG.md` + 同步 `README.md` 版本。
8. `sgit-update "feat: ..."` 推送，去 Actions 看部署结果。
