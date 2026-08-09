# The Atlantic Reader v2.1 · 终局全面评测
## 以顶尖个人项目为基准线的毒舌锐评（最终版）

> **评测对象**：v2.1.0（`reader_app.js` 63.5KB / `reader_style.css` 45.4KB / 216 页双语数据）
> **对标基准**：Linear / Obsidian / Typora / Readwise Reader / Things 3 —— 1-3 人打造却达产品级精致度的作品
> **评测范围**：代码架构 / 功能完整性 / UI·UX / 性能 / 可维护性 / 文档呈现 / 创新性 —— 7 大维度全覆盖
> **评测原则**：毒舌但每条有源码行号或实测数据背书；先承认修复，再挑刺；拒绝泛泛而谈
> **日期**：2026-08-09

---

## 〇、总评

**这是一个"修复速度惊人、但地基仍是沙土"的项目。**

三轮迭代（v1.0 → v2.0 → v2.1）消灭了 40+ 项缺陷，修复执行力超过 95% 的个人开发者。`browser_layout_audit.js`（8 视口 × 7 状态真实浏览器审计）是 90% 个人项目都没有的专业级资产。但当我把镜头从"代码细节"拉远到"项目全貌"，几个被持续忽视的硬伤浮出水面——**它们不在代码里，在项目的地基上**。

| 维度 | 得分 | 一句话判定 |
|:-----|:----:|:-----------|
| 一·代码架构与工程化 | 15.0 / 20 | 单文件巨石未拆，但声明式映射/事件委托/模块化思维已萌芽 |
| 二·功能完整性与边界处理 | 13.5 / 15 | 功能闭环完整，边界处理扎实，滑动手势补上了移动短板 |
| 三·UI/UX 设计与交互 | 12.5 / 15 | 双卡层级比 v1.0 更精致，但字体仍是系统默认 |
| 四·性能表现与优化 | 9.5 / 15 | **240MB PNG 图片 + 内联 2.8MB JSON 双重拖累**，fetch 增量是半吊子 |
| 五·可维护性与代码规范 | 10.0 / 15 | 无 ESLint/Prettier/TypeScript，靠人工维持 1400 行一致性 |
| 六·文档与项目呈现 | 10.0 / 10 → **7.0 / 10** | README 专业，但**无 LICENSE、3 小时重构未提交、git 形同虚设** |
| 七·创新性与差异化 | 6.5 / 10 | 1:1 双语同频是真差异，但缺笔记/高亮/导出/AI 等阅读器标配 |
| **综合总分** | **84.0 / 100（B+）** | 修复力 A 级，地基工程 C+ 级 |

> **一句话**：它已经从"能用的原型"进化到"好用的工具"，但距离"想用一生的作品"，差的不是代码——是**把项目当产品对待的工程自觉**。

---

## 一、先承认：v2.1.0 修复了什么（公正清单）

在毒舌之前，必须先承认修复的执行力。对照我的 HARSH_REVIEW，v2.1.0 逐一消灭：

| 修复项 | 证据 | 质量 |
|:-------|:-----|:----:|
| Bug A 书签崩溃（const 赋值） | L427 `list.sort(...)` 不再赋值 | ✅ 根治 |
| Bug B 缩略图高亮（tile id） | L499 `tile.id = 'tile-' + p` | ✅ 根治 |
| 双卡视觉层级 | L879-902 英文卡升级为**渐变+高光内描边**羊皮纸质感 | ✅ 超预期（比 v1.0 更精致） |
| 断行精细控制 | L887-893 `hyphenate-limit-chars/lines` + `text-wrap:pretty` + `font-feature-settings` | ✅ 全部恢复 |
| 滑动手势 | L1183-1196 触屏滑动翻页 | ✅ 新增 |
| els 声明式映射 | L1214-1266 `ELS_BY_ID` 对象替代 50 行手写 | ✅ 根治 |
| vim G 键惯例 | L949-950 Shift+G 顶部 / G 底部 | ✅ 修正 |
| 搜索键盘导航 | L1037 Enter 跳转 + `bindSearchResultKeys` | ✅ 新增 |
| 语速文案"1.5x 标准" | L893-894 只有 1x 标"标准" | ✅ 修正 |
| meta-tag 硬编码 22px | L252 `Math.round(globalFontScale)` | ✅ 动态化 |
| 空数据伪造 104 页 | L47 空对象 + boot 报错 | ✅ 根治 |
| fetch 增量刷新 | L1271-1290 HTTP 下 fetch，离线兜底 | ⚠️ 半修（见 4.2） |
| h3/h4 clamp | L937-939 | ✅ 根治 |
| confirm 聚焦安全侧 / toast 分级 / pickVoice 性能 / F 直达 / body._tapspeak | 注释标注"毒舌 X.X"逐条修复 | ✅ 根治 |

**修复清单里甚至直接引用了我的评审编号（"毒舌 3.3"、"毒舌 7.1"）——这种"把批评当 TODO 列表"的态度，是顶尖开发者才有的素养。**

---

## 二、代码架构与工程化（15.0 / 20）

### 2.1 单文件巨石未拆——声明式映射只是止痛药

**问题**：`reader_app.js` 约 1400 行单 IIFE。v2.1 用 `ELS_BY_ID`（L1214）消灭了手写 `els` 赋值，用事件委托消灭了监听器泄漏，用模块化常量（`LS`/`HELD`/`THEMES`）收拢了配置——这些都是**在单文件内部做整洁**，但没有解决**模块化**这个根本问题。

**对标差距**：Obsidian 拆成 editor/workspace/vault/commands 等十几个 ES Module；Typora 分 render/outline/export/theme。它们同样是"个人项目"，同样追求零构建——但用了浏览器原生 `<script type="module">`。本项目连一个 `import` 都没有。

**现代化改进方向**：
```text
assets/js/
├── main.js              # 入口，组合各模块
├── state.js             # 17 个裸 let 收拢为单一状态容器
├── reader.js            # loadPage/renderSegmentNode
├── speech.js            # TTS 状态机 + pickVoice
├── search.js            # 索引构建 + 键盘导航
├── bookmarks.js         # 书签/历史
└── ui.js                # 模态/Toast/主题
```
零构建、零依赖、原生 ES Modules——`main.js` 里 `import { loadPage } from './reader.js'` 即可。这不引入任何工具链，只是**拆分文件**。

### 2.2 17 个裸 `let` 状态变量仍无约束

**问题**：L44-60 仍是 17 个独立 `let`。v2.1 没有引入状态容器。`currentPlayingSegmentDiv`、`isPlayingAudio`、`currentUtterance`、`ttsVoice` 四个 TTS 相关状态散落，互相依赖靠注释维系。

**对标差距**：顶尖项目的状态变更有明确入口。本项目任何函数都能 `isPlayingAudio = true`，没人能保证不变量。

**改进方向**：单一状态对象 + 变更函数：
```javascript
const state = { page: 1, playing: false, utterance: null, /* ... */ };
function setPlaying(on) { state.playing = on; render(); }
```
不必上 Redux/Zustand，一个普通对象 + 约定即可。关键是**收敛写入口**。

### 2.3 无类型注解——Bug A 就是代价

**问题**：Bug A（const 重新赋值）能被任何静态分析工具拦截，但项目没有。纯 JSDoc 注释也没有——`pageObj`、`segment` 的形状全靠读代码推断。

**改进方向**：最低成本是 JSDoc（不引入构建）：
```javascript
/** @typedef {{pageNumber:number, image:string, segments:Array<{type:string,en:string,zh:string}>}} Page */
```
VS Code 原生支持 JSDoc 类型检查，零成本、零构建、立刻能在编辑器里报 Bug A 这类错误。要上台阶则用 TypeScript + `allowJs`（渐进式，不需全量重写）。

---

## 三、功能完整性与边界处理（13.5 / 15）

### 3.1 滑动手势是"及格线"，不是"Kindle 级"

**问题**（L1183-1196）：
```javascript
if (Math.abs(dx) > HELD.SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
  loadPage(currentPage + (dx < 0 ? 1 : -1));
}
```
- **无速度检测**：慢慢滑 60px 也翻页。真实阅读器要的是"快速甩动"（velocity > 阈值），慢滑应该回弹
- **无跟随反馈**：滑动过程中页面纹丝不动，松手瞬间跳变。Kindle/Apple Books 的页面会跟着手指移动
- **无方向锁定**：斜向滑动（dx=70, dy=58）满足 `70 > 58*1.2=69.6` 会误翻页，用户其实想滚动

**对标差距**：Readwise Reader 的滑动有位移跟随 + 速度阈值 + 回弹动画。本项目是"能用"，不是"好用"。

**改进方向**：
```javascript
// touchmove 中 transform: translateX(dx) 跟随
// touchend 中计算 velocity = dx / dt，velocity > 0.3px/ms 或 dx > 半屏 才翻页
// 否则 transition 回弹
```

### 3.2 fetch 增量的缓存策略错误

**问题**（L1274）：
```javascript
fetch('assets/data/magazines.json', { cache: 'force-cache' })
```
`force-cache` 意味着**永远用缓存，不检查更新**。用户更新了 magazines.json，浏览器还是给旧数据——增量刷新形同虚设。

**改进方向**：`cache: 'no-cache'`（带 ETag 协商缓存，更新才下载）或 `'default'`。

### 3.3 搜索结果键盘导航只有 Enter，没有上下选择

**问题**：v2.1 加了 Enter 跳转（L1037），但**没有 ↑/↓ 在结果间移动焦点**。用户还是得把手从键盘移到鼠标去点第 3 条结果。

**对标差距**：VS Code 命令面板、Linear 搜索——↑↓ 移动、Enter 确认、Esc 关闭是标配。

**改进方向**：维护 `activeIndex`，↑↓ 移动时 `scrollIntoView` + 高亮，Enter 跳转当前项。

---

## 四、性能表现与优化（9.5 / 15）—— 本次最大硬伤

### 4.1 🔴 240MB PNG 图片——性能维度的原罪

**实测数据**：
- 8月刊：104 张 PNG，共 **114.8MB**，平均 **1130KB/张**
- 7月刊：112 张 PNG，估算约 120MB
- **两刊合计约 240MB**

**问题**：单张 150 DPI 扫描页 1.13MB 的 PNG。首屏加载任何一页都要下载 1MB+ 图片。GitHub Pages 部署意味着全球用户每次翻页都在拉 1MB。这不是"高清"，这是"粗暴"。

**对标差距**：顶尖项目（Medium、Apple News+）用 WebP/AVIF + 响应式 srcset + 懒加载。同样视觉质量下，WebP 能减 60-70% 体积（1.13MB → ~350KB），AVIF 更狠（~200KB）。

**改进方向**：
```bash
# 一次性批处理（cwebp 或 sharp）
for f in issues/*/images/*.png; do cwebp -q 82 "$f" -o "${f%.png}.webp"; done
```
240MB → 约 70MB。再加 `<img loading="lazy" decoding="async" srcset="...webp">`。**这是整个项目性能收益最大的一件事**，没有之一。

### 4.2 HTTP 下"内联 2.8MB + 再 fetch 2.8MB"重复传输

**问题**：v2.1 的 fetch 增量（L1271）是在**已经内联 2.8MB JSON 的 HTML 之上**再 fetch 一次。HTTP 场景下：首屏解析 2.8MB 内联 JSON + 后台再下载 2.8MB。离线 file:// 必须内联（合理），但 HTTP 下这是**双倍成本**。

**改进方向**：构建脚本区分产物——`index.html`（离线版，内联 JSON）+ `online.html`（HTTP 版，不内联，纯 fetch）。或者用 `if (location.protocol.startsWith('http'))` 在构建时决定。现在是一个产物打天下，两边都不最优。

### 4.3 index.html 与 reader.html 仍是 2.76MB 完全重复

**问题**：两份字节级相同的 2.76MB 文件。磁盘浪费是小，维护时"改了哪份"的心智负担是大。

**改进方向**：删 `reader.html`，或让 `reader.html` 只做一个 `<meta http-equiv="refresh" content="0; url=index.html">` 跳转（3 行而非 2.76MB）。

### 4.4 主图无懒加载

**问题**：shelf 封面有 `loading="lazy"`，但阅读器主图 `#page-original-image`（216 张里真正常看的那张）没有。配合 1.13MB/张的 PNG，每次翻页都是性能税。

**改进方向**：主图加 `decoding="async"`，并考虑 `IntersectionObserver` 预取下两页而非全量。

---

## 五、可维护性与代码规范（10.0 / 15）

### 5.1 没有 ESLint / Prettier——Bug A 就是代价

**问题**：项目根目录只有 `.gitignore`，没有 `.eslintrc`、`.prettierrc`。1400 行 JS 的一致性全靠人肉。`'use strict'` 是运行时兜底，不是静态检查。

**对标差距**：Linear 即便 2 人团队也有完整 ESLint + Prettier + pre-commit。这不是"团队才需要"——**个人项目更需要**，因为没人帮你 review。

**改进方向**：一个 `.eslintrc.json`（30 行）就能拦截 Bug A：
```json
{ "rules": { "no-const-assign": "error", "no-unused-vars": "warn", "eqeqeq": "warn" } }
```
配合 Prettier 保证格式统一。零构建、VS Code 插件即用。

### 5.2 测试仍是"静态断言"，无功能性测试

**问题**：stress_test（30 断言）+ browser_layout_audit（布局溢出）都很专业，但**没有一个测试真正点击"收藏书签"验证它工作**。Bug A 漏掉的根本原因——测试只验证了"代码存在"和"布局不破"，没验证"功能正确"。

**改进方向**：用已有的 playwright-core 写 3 个功能性冒烟测试：
1. 点击书签按钮 → 断言 localStorage 有记录
2. 输入搜索词 → 断言结果数 > 0
3. 翻页 → 断言 `current-page-badge` 文本变化
这比 30 个静态断言都值钱。

---

## 六、文档与项目呈现（7.0 / 10）—— 本次第二大硬伤

### 6.1 🔴 3 小时高强度重构，0 次提交

**实测**：
```
git log 最新提交：2026-08-09 09:40:36  (v1.0 时代)
git status：M reader_app.js / M reader_style.css / M magazines.json / M index.html / D output/... (212 个文件)
```
**今天从 v1.0 到 v2.1 的全部重构（三轮、40+ 修复、约 3 小时高强度工作）全部未提交**。工作区飘着 212+ 个改动文件。一次误删、一次断电、一次 `git checkout .` 手滑，今天的所有修复灰飞烟灭。`_backups/` 里只有一个 JSON 备份，代码本身裸奔。

**对标差距**：顶尖个人项目"小步快跑，频繁提交"。Obsidian 作者的提交粒度细到"修一个图标对齐"。本项目是"攒一大波再考虑提交"——这是**版本控制的反面教材**。

**改进方向**：每修一个毒舌点就提交一次：
```bash
git commit -m "fix(reader): resolve const reassignment in toggleBookmark (Bug A)"
git commit -m "feat(reader): add touch swipe navigation"
```
现在的 git 历史很漂亮（32 个语义化提交），但今天断档了。

### 6.2 🔴 自称开源，却没有 LICENSE

**问题**：README 通篇"开源项目"、"GitHub Pages 部署"，代码注释写着 "$20/mo Tier" 商业字样——但**根目录没有 LICENSE 文件**。无 LICENSE 的代码默认"保留所有权利"，别人 clone 了都不能合法使用/修改/分发。这是开源项目最基础的要素，缺失即"伪开源"。

**改进方向**：加一个 `LICENSE`（个人项目推荐 MIT 或 Apache-2.0）。30 秒的事。

### 6.3 修复记录塞在 README 里，缺 CHANGELOG

**问题**：v2.0 的 12 项修复（R-6 到 R-12）写在 README 底部。README 应该是"项目是什么/怎么用"，不应该是"改了什么"。改动历史属于 CHANGELOG.md（遵循 Keep a Changelog 规范）。

**改进方向**：`CHANGELOG.md` 用 `## [2.1.0] - 2026-08-09` 分版本记录。README 只留一句链接。

### 6.4 git 提交全是英文长句，粒度混乱

**问题**：32 个提交的 subject 普遍 60-100 字符（"feat: mobile portal header symmetrical 50-50 grid refactor and automated 216-page extreme stress test suite with 100% pass"）。太长、一个提交塞多个不相关改动（50-50 格栅 + 压力测试是两个事）。

**改进方向**：Conventional Commits 规范——subject ≤ 50 字符，一个提交只做一件事，body 补充细节。

---

## 七、创新性与差异化竞争力（6.5 / 10）

### 7.1 真正的差异点（值得肯定）

1. **1:1 中英同频排版 + 双卡视觉层级**——这是市面双语阅读器（包括很多商业产品）没做好的。英文羊皮纸浮雕卡 + 中文通透辅读的设计语言，是有辨识度的。
2. **216 页零空白页**——非正文页嵌入扫描图+策展解说，解决了 PDF 转 Web 的"死页"顽疾。
3. **browser_layout_audit.js**——8 视口 × 7 状态真实浏览器布局审计，这是**连很多商业团队都没有的**质量保障。
4. **印刷排版重构算法**（`reconstruct_true_author_paragraphs.py`）——从 PDF 还原真实作者段落，这是内容工程的真功夫。

### 7.2 缺失的差异化武器（毒舌时间）

**问题**：作为"阅读器"，它缺的是**阅读之后的闭环**：

| 缺失能力 | 顶尖阅读器标配 | 影响 |
|:---------|:--------------|:-----|
| **高亮/笔记** | Readwise Reader、Apple Books 都有 | 读完留不住，216 页读了就忘 |
| **导出**（EPUB/Markdown/标注） | Obsidian、Readwise | 知识无法流转到笔记系统 |
| **跨设备同步** | 全部顶尖产品 | localStorage 锁死单设备，手机读了电脑不知道 |
| **AI 辅助**（摘要/问答/生词本） | 2026 年的阅读器默认项 | 双语场景的生词、长难句没人管 |
| **搜索增强**（全文/语义） | Readwise 全文搜索 | 当前是 `indexOf` 线性扫描的玩具 |

**对标差距**：Readwise Reader（1 个创始人起家）的核心不是"阅读"，是"高亮 → 同步 → 回顾"的闭环。本项目把 216 页内容呈现得很美，但**读完之后呢？** 没有高亮、没有笔记、没有导出——它是一个"展示器"，还不是一个"知识工具"。

**改进方向**（按投入产出排序）：
1. **选文高亮**：监听 `selectionchange`，把选区序列化存 localStorage，渲染高亮层。~100 行代码，直接补上最大短板
2. **导出 Markdown**：现有"复制本页 Markdown"扩成"导出全刊 + 我的高亮"
3. **生词本**：双击英文单词 → 查词 → 存生词本。双语阅读器的天作之合

---

## 八、终审总评

### 这个项目的真实画像

- **修复执行力：A 级**——三轮迭代消灭 40+ 缺陷，把我的毒舌评审当 TODO 列表逐条攻克
- **代码洁癖：B+ 级**——声明式映射、事件委托、CSS 变量管道，工程品味在线
- **排版美学：A− 级**——双卡层级 + 1:1 同频 + 断行精细控制，有真正的设计语言
- **测试基建：B+ 级**——stress_test + 浏览器布局审计，超过大多数个人项目
- **版本控制纪律：D 级**——3 小时重构 0 提交，今天的成果随时可能蒸发
- **性能工程：C 级**——240MB PNG + 内联 2.8MB，两个最大的性能问题拖了三轮
- **开源完备性：D 级**——自称开源却无 LICENSE
- **产品野心：C+ 级**——止于"展示"，未达"知识工具"

### 一句话

**v2.1 证明了作者"能修好任何被指出的问题"，但顶尖作品需要的不是"修得好"，而是"想得远"。** 它现在是 B+ 级的好工具——**修复力惊艳，地基待夯**。

### 通往 90+ 分的路线图（按优先级）

```text
第一优先级 · 保住今天的成果（10 分钟）
├─ git add -A && git commit          ← 3 小时重构未提交，最高风险
└─ 加 LICENSE（MIT）                  ← 自称开源的底线

第二优先级 · 性能止血（1 小时）
├─ PNG → WebP 批处理（240MB → ~70MB） ← 收益最大的一件事
├─ fetch 改 'no-cache' + 主图 lazy
└─ 删 reader.html 或改 3 行跳转

第三优先级 · 工程筑基（2 小时）
├─ 拆 ES Modules（6-7 个文件）
├─ 加 .eslintrc.json + JSDoc 类型
└─ 3 个功能性冒烟测试（playwright 现成）

第四优先级 · 产品升维（按需）
├─ 选文高亮 + localStorage           ← 从"展示器"到"知识工具"的关键一跃
├─ 导出 Markdown（含高亮）
└─ 自托管 woff2 字体（离线 + 出版级兼得）
```

**修复力已经证明。接下来要证明的，是把项目当产品的远见。**

---

> **评测声明**：本报告基于 v2.1.0 全量代码逐行精读 + 实测数据（240MB 图片、32 git 提交、0 次今日提交、无 LICENSE）。所有毒舌均有行号或数据背书。先承认修复，再指出差距——毒舌的目的是让好项目变得更好，不是贬低。

---

## 九、勘误与复核附录（2026-08-09 · v2.2.0 实测）

> 依据 v2.2.0（本日"执行完整路线图"后）全量复查，对正文两条**事实性论断**予以纠偏，并记录后续联动的工程修复。勘误遵循同一原则：每条有行号或实测数据背书。

### 9.1 纠偏一：正文 3.3「没有 ↑/↓」论断不成立

正文 3.3 称"搜索结果键盘导航只有 Enter，没有上下选择"。**复核结论：该论断在 v2.1.0 时代即不成立**。`reader_app.js` L357-358 存在完整的方向键导航：

```js
if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(list.length - 1, idx + 1); }
else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); }
```

↑/↓ 移动焦点 + Enter 确认 + Esc 关闭（3.3 所要求的能力底线）全部在位。正文 3.3 的"对标差距"与"改进方向"均基于误读，应撤回。修复清单中"搜索键盘导航"条目的 ✅ 判定反而是正确的。

### 9.2 纠偏二：正文 5.2「playwright-core 现成」前提不成立

正文 5.2 的改进方向写道「用**已有的** playwright-core 写 3 个功能性冒烟测试」。**核对结论：项目仓库内并无 playwright-core**（`node_modules` 不存在、`require.resolve('playwright-core')` 必失败）。此前 `browser_layout_audit.js` 依赖的 playwright-core 实际安装于临时目录（`%TEMP%\opencode\node_modules`），属审计脚本作者的环境性回退加载——**不是项目资产**。

本轮为落实 5.2 而编写的 `scripts/functional_smoke.js` 因此自带三级回退加载器（仓库内 → `%TEMP%\opencode` → 报错提示），6 项断言全绿：

```text
Functional smoke: 6 passed / 0 failed
```

（书签写入 localStorage / 期刊馆卡片渲染 / J-K 翻页 badge 联动 / 选高亮持久化 / 浏览器侧无未捕获异常）

### 9.3 纠偏三：行号与统计数字时效性

正文行号引用对应 v2.1.0 快照，v2.2.0 已漂移（示例：fetch 缓存 L1274 → 现 L1558；ELS_BY_ID L1214 → 现 L1450 附近）。附录以当前行号为准。数字口径变化：

| 正文旧值 | 实测现值 | 说明 |
|:---------|:---------|:-----|
| few 240MB PNG | **255.7MB** PNG 实测 | 8月刊 114.8MB + 7月刊 129.1MB，正文 7 B 级估算偏低 |
| 32 个 git 提交 | **38 个** + 本次 6 个新提交 | 本轮新增：checkpoint / LICENSE+CHANGELOG / WebP 管线 / ESLint+烟测 / 高亮+导出 / 自托管字体 |
| `reader_app.js` 约 1400 行 | **1588 行** | 高亮/导出/字体模式额外 200 行 |
| stress 30 断言 | **套件检查 25 + 探针数增** | `reader.html` 转为跳转壳后 2 个断言转移，其余全绿 25/0 |

### 9.4 正文时效消化（第 0-4 优先级逐条复核）

| 路线图 | 7 月清单 | 本轮状态 |
|:-------|:---------|:---------|
| P0 git 提交 | 3 小时重构未提交 → 风险 | ✅ 本轮首提交 `checkpoint v2.1` 完成，今日工作已分 6 个语义化 commit |
| P0 LICENSE | 无 LICENSE → 伪开源 | ✅ MIT LICENSE 新增（README 收敛） |
| P1 PNG→WebP(240→70MB) | 🔴 性能原罪 | ✅ 216 张全部转 woff2 等价物：**总图荷 42.7MB**（17.5%），`webpUrl()` 三处接入，`decoding="async"`；PNG 保留为降级兜底（评审曾建议删，本轮改为保留策略） |
| P1 fetch no-cache | force-cache 缓存错误 | ✅ L1558 改 `no-cache` |
| P1 reader.html 3 行跳转 | 2.76MB 重复 | ✅ 现为 3 行 redirect stub |
| P2 ESLint + JSDoc | 无静态检查 | ✅ `.eslintrc.json`（17 规则）+ `.prettierrc.json` + 全量 JSDoc @typedef |
| P2 3 个交互烟测 | 无功能测试 | ✅ 6 项 smoke 全绿（见 9.2） |
| P3 选文高亮 + localStorage | 「展示器」 | ✅ `LS.highlights` + 浮层按钮 + E 键 + 导出含高亮 |
| P3 导出 Markdown 全刊 | 无导出 | ✅ 生成器全刊 Markdown + 转换弹窗 |
| P4 自托管 woff2 字体 | 系统默认字体 | ✅ NewCM08/NewCM010 + 思源宋体子集 6 个 woff2（42.7MB → 字体 2.8MB），默认衬线模式读入即衬线 |

### 9.5 新增回归（本轮唯一布局回归点，已修复）

1024px 视口（iPad Pro 竖屏）顶部栏 `#more-settings-btn` 溢出 3px（scrollWidth 1027 > 1024）。经定位为顶栏按钮内边距压迫，`@media (max-width: 1180px)` 收紧 `padding: 7px 9px` 后，**8 视口 × 7 状态浏览器审计 ALL CLEAN**（回归前 6 状态报 1 溢出）。

### 9.6 勘误后遗疑点（未完成项，供下轮）

- 🔸 七次维度「跨设备同步 / AI 辅助 / 生词本」三条仍空缺（正文列为 2026 标配）
- 🔸 `reader.html` stub 迁移后 stress 断言数变化，需要文档口径同步
- 🔸 PNG 源档保留与 GitHub Pages 仓库体积（244MB）的权衡待决策——建议保留或迁移至独立 `scans/` 分支
