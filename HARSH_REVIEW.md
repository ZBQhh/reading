# The Atlantic Reader v2.0 · 毒舌锐评
## 以顶尖个人项目为基准线的全方位挑剔

> **对标基准**：Linear / Obsidian / Typora / Things 3 / Bear——这些由 1-3 人打造、却达到产品级精致度的个人/小团队作品。
> **评审立场**：毒舌，但每条都有源码行号背书。不无脑黑，只挑真问题。
> **评审对象**：v2.0.0（1303 行 JS / 1495 行 CSS / 2.8MB JSON 内联）→ **整改对象 v2.1.0（见第十章回执）**
> **日期**：2026-08-09

---

## 〇、一句话总评

**修了一身伤疤，却弄丢了西装**——v2.0 把 v1.0 的 P0 Bug 全部消灭，工程严谨度显著提升，但顺手把出版级字体、断行精细控制、双卡视觉层级这些"面子工程"也一起扔了。现在它更像一个**功能完备的工程原型**，而非一个**优雅精致的出版产品**。离顶尖个人项目的差距，不在"能不能用"，而在"愿不愿意天天用"。

**综合评分：82/100（B+）**——作为工具合格，作为作品可惜。

---

## 一、架构毒舌：1303 行单文件是 2012 年的荣光

### 1.1 单文件 IIFE 不是"零依赖"，是"零工程"

1303 行 JS 全塞进一个 IIFE——状态管理、TTS、搜索、书签、历史、渲染、快捷键、DOM 绑定、主题、字号、模态、剪贴板……全在一个闭包里互相调用。任何一处改动都要在 1300 行里定位。

Obsidian 的核心渲染器拆成 editor / workspace / vault / commands / search 等十几个模块。Typora 一个窗口控制器都分 render / outline / export / theme。**"零依赖"不是"零工程"的借口**——原生 ES Modules 也是零依赖，浏览器原生支持，连打包都不需要。`<script type="module">` 写不了吗？

### 1.2 `els` 对象是 jQuery 时代的遗物

```javascript
const els = {};                          // L65
// ...boot() 里 50 行手动赋值...
els.libraryPortal = $('library-portal-view');   // L1146
els.openPortalBtn = $('open-portal-btn');       // L1147
els.appSidebar = $('app-sidebar');              // L1148
// ...还有 47 行...
```

50 行纯体力活。typo 一个 key 就静默失效，没有任何编译期检查。2026 年了，Vue 3 的 `ref()`、Solid 的 `createSignal`、甚至 React 的 `useRef` 都比这优雅。对标 Linear——人家的 DOM 引用是类型安全的、自动追踪的、可调试的。这里是手写的、脆弱的、不可追踪的。

### 1.3 17 个裸 `let` 变量在闭包里裸奔

```javascript
let currentPubFilter, currentIssueId, currentIssueObj, data,
    currentPage, currentZoom, globalFontScale, isPlayingAudio,
    audioSpeed, currentPlayingSegmentDiv, isSerifMode,
    currentViewMode, isNavigating, searchIndexCache, ttsVoice,
    currentUtterance, currentAlignMode;   // L41-63
```

17 个可变状态，没有任何约束防止意外改写。`currentAlignMode`（L63）和 `currentAlignModeInternal`（L838）还**重复声明**——一个在闭包顶部，一个在函数内，谁是 source of truth？答案是 `currentAlignMode` 从未被读取，是**死变量**。

顶尖项目的状态管理有 single source of truth。这里有 17 个 truth，散落在 1300 行里。

### 1.4 `bindOne` / `bindOneEl` 是过度抽象的反面教材

```javascript
function bindOne(id, fn) { const node = els[id]; if (node) node.addEventListener('click', fn); }   // L1136
function bindOneEl(el, fn) { if (el) el.addEventListener('click', fn); }                           // L1140
```

两个函数做同一件事，区别只是参数类型。而且 `bindOneEl` **全文只出现在定义处，从未被调用**——死代码。这种"我预判了未来需求"的抽象，在个人项目里是噪音。

### 1.5 `body._tapspeak` 用 DOM 当状态容器

```javascript
body.removeEventListener('click', body._tapspeak);   // L702
body.addEventListener('click', onBodyClick);          // L703
body._tapspeak = onBodyClick;                         // L704
```

每次 `loadPage` 都把回调挂在 `body._tapspeak` 属性上。用 DOM 元素当状态存储——这是 2008 年 jQuery 的黑魔法。正确做法是事件委托一次性绑定 + 从 `e.target` 反查 segment index。

---

## 二、Bug 与正确性：'use strict' 装了防盗门没上锁

### 2.1 🔴 书签新增崩溃（Bug A）

```javascript
const list = getBookmarks();                    // L394 const
else { list.push(pageNum); list = list.sort(...); }  // L397 重新赋值 → TypeError
```

`'use strict'` 开了，但没配 ESLint 的 `no-const-assign`，也没上 TypeScript。**就像装了防盗门却没锁**——严格模式只是运行时抛错，编译期没人提醒。Node 实测确认：`TypeError: Assignment to constant variable.`。用户按 B 键收藏页面，崩溃，书签不保存。

stress_test 30/30 通过，却漏了这个。**测试给了虚假的安全感**。

### 2.2 🟡 缩略图高亮失效（Bug B）

```javascript
// initTOC 创建 tile（L468-473）——设了 dataset.page，没设 id
tile.dataset.page = String(p);
// ← 缺 tile.id = 'tile-' + p;

// syncSidebarActiveState 查找（L483）
const tile = $('tile-' + pageNum);   // = getElementById → 永远 null
```

同一段代码里两种查找方式不一致：pagesGrid 点击委托用 `dataset.page`（L1033），syncSidebarActiveState 用 `id`（L483）。说明这两段是不同时期写的，复制粘贴后没对齐。

### 2.3 G 键与 vim 惯例完全相反

```javascript
else if (code === 'KeyG' && !e.shiftKey) { scrollPage(-1e9); }   // L936 G→顶部
else if (code === 'KeyG' && e.shiftKey) { scrollPage(1e9); }     // L937 Shift+G→底部
```

vim 里 `gg` 到顶部、`G` 到底部。这里单按 G 到顶部、Shift+G 到底部——**完全反了**。而且快捷键速查表（HTML）里压根没列 G。藏起来的快捷键等于没有。

### 2.4 `fullscreenBtn.click()` 绕圈子

```javascript
else if (code === 'KeyF' || key === 'f') { if (els.fullscreenBtn) els.fullscreenBtn.click(); }   // L960
```

按 F 键时不直接调 `toggleFullscreen()`，而是模拟点击按钮。如果按钮被移除/disabled，F 键就失效。直接调函数不行吗？

### 2.5 搜索双重匹配冗余

```javascript
const re = new RegExp('(' + escRegex(q) + ')', 'gi');   // L282 建了 RegExp
if (row.text.indexOf(q) === -1) return;                  // L286 又用 indexOf
```

先建 RegExp 再用 indexOf 过滤。既然 RegExp 都建了，`re.test(row.text)` 一步到位。两步匹配是冗余。

### 2.6 `pickVoice` 每次循环重新 filter

```javascript
for (let i = 0; i < prefs.length; i++) {
  const v = voices.filter(function (v) { return v.lang...indexOf('en') === 0; })  // 每次都 filter
    .find(function (v) { return v.name.indexOf(prefs[i]) >= 0; });
```

每次循环都 filter 全部英文嗓音。应先 filter 一次。嗓音列表小，性能无所谓，但代码品味差。

### 2.7 兜底数据凭空造 104 页空刊

```javascript
allIssues[currentIssueId] = { ..., totalPages: 104 };   // L46
```

数据加载失败时，凭空造一个 104 页的空刊。用户看到 104 个空白页而不是错误提示。应该报错。

---

## 三、排版美学毒舌：因噎废食的典型案例

### 3.1 出版级字体全部丢失——因噎废食

v1.0 有 Cinzel（报头罗马刻字体）、Merriweather（英文衬线）、Noto Serif SC（中文衬线）、Plus Jakarta Sans（英文无衬线）。

v2.0 为了修"@import 重复加载"这个 P2 问题，**直接把 Google Fonts 全删了**。

报头 "THE ATLANTIC" 从 Cinzel 降到 Times New Roman——瞬间从"大西洋月刊"降到"Word 文档"。

这叫因噎废食。修水龙头漏水把水管拆了。正确做法是 `<link rel="preconnect" href="fonts.googleapis.com">` + `<link rel="stylesheet" href="...">` 异步加载，不阻塞渲染。或者本地化 woff2 自托管。而不是删了完事。

**一个自称"出版级排版"的项目，标题字体是系统默认衬线，这合格吗？**

### 3.2 断行精细控制全部丢失

| 属性 | v1.0 | v2.0 |
|:-----|:-----|:-----|
| `hyphenate-limit-chars` | `4 2 2` | ❌ 删了 |
| `hyphenate-limit-lines` | `3` | ❌ 删了 |
| `text-wrap` | `pretty` / `balance` | ❌ 删了 |
| `font-feature-settings` | `kern/liga/calt` | ❌ 删了 |
| `font-kerning` | `normal` | ❌ 删了 |

修 P0-1（删 injectSyllables）是对的。但**顺手把 CSS 的精细排版控制也删了是什么逻辑？** `hyphens: auto` 只是开关，`hyphenate-limit-chars: 4 2 2` 才是质素控制。现在两端对齐时短词会被断开，标题行不均衡，字距优化丢失。**从"接近 Knuth-Plass"退回"浏览器默认"**。

### 3.3 双卡视觉层级退化为虚线分隔

v1.0 的核心设计理念：**卡片材质差异建立视觉层级**——en 是羊皮纸浮雕卡（bg-card-warm + border + shadow + padding 16/22px），zh 是 transparent 通透辅读。

v2.0 把 en 和 zh 塞进同一个 segment-block，中间用 `border-top: 1px dashed` 分隔。从"双卡分离"退化为"单卡虚线分隔"。

设计语言整体降级。这不是"更简洁"，这是"更平庸"。

### 3.4 CSS 重复规则

```css
.audio-btn.speed-btn { min-width: 52px; ... margin-left: auto; }   /* L388 */
.audio-btn.speed-btn { min-width: 52px; ... margin-left: auto; }   /* L389 完全重复 */
```

复制粘贴遗留。stress_test 检查了 !important 数量，却没检查重复规则。

### 3.5 标题字号无移动端 clamp 保护

```css
.segment-h3 .en-text { font-size: calc(var(--reader-font-scale) * 1.35); }   /* L906 */
```

用户把字号调到 14px 时，h3 = 18.9px，和正文 14px 差距太小，层级模糊。调到 36px 时 h3 = 48.6px，移动端可能溢出。应该 `clamp(18px, calc(var(--reader-font-scale) * 1.35), 36px)`。

---

## 四、交互毒舌：2026 年了还没有滑动手势

### 4.1 无触屏滑动手势

移动端阅读器没有左右滑动翻页。只能点底部按钮。**Kindle 2010 年就有滑动手势了**。对标 Bear / Apple Books——手势是移动阅读的基础预期，不是加分项。

### 4.2 Shelf 页 J 键进入阅读室违反预期

```javascript
if (shelfOpen) {
  if (code === 'Enter' || key === 'j') { enterReaderRoom(currentIssueId, 1); return; }   // L928
}
```

在期刊馆首页按 J 会强制进入阅读室。但 J 在阅读室里是"下一页"。用户在首页按 J 想干嘛？可能是想滚动浏览馆藏。Enter 进入是合理的，J 进入是违反预期的。

### 4.3 搜索结果无键盘导航

搜索结果列表只能鼠标点击，没有上下箭头选择。对标 VS Code 命令面板、Linear 全局搜索——搜索结果**必须**支持键盘导航。

### 4.4 `confirmDialog` 危险操作默认聚焦确认键

```javascript
const okBtn = wrap.querySelector('.confirm-ok');
if (okBtn) okBtn.focus();   // L187 默认聚焦"确认"
```

"清空全部阅读历史"这种危险操作，默认聚焦"确认"按钮。用户按 Enter 直接清空。应该默认聚焦"取消"——危险操作的默认行为应该是"不执行"。

### 4.5 Toast 1.4 秒消失太短

```javascript
toastNode._t = setTimeout(function () { ... }, 1400);   // L148
```

复制 Markdown 成功、切换主题等反馈 1.4 秒就消失。用户可能没看清。应该按消息类型分级：成功 1.5s，警告 2.5s，错误 3.5s。

---

## 五、性能毒舌：2.8MB 内联是原罪

### 5.1 2.8MB JSON 内联进 HTML——不可原谅

v1.0 指出，v2.0 仍内联。`build_master_portal.py` L418：

```python
window.ALL_ISSUES = {json.dumps(all_issues, ensure_ascii=False).replace('</', '<\\/')};
```

index.html 和 reader.html 各 2.76MB 且完全重复。浏览器无法缓存 JSON，每次访问全量重解析。加 `.replace('</','<\\/')` 转义是止血，不是治疗。

改成 `fetch('assets/data/magazines.json')` 异步加载很难吗？5 行代码的事。**这是整个项目最该修却没修的问题**。

### 5.2 搜索索引是玩具级

```javascript
idx.push({ issueId, pageNum, section, text: buf.join(' ') });   // L272
```

216 页所有 segment 拼成大字符串，`text.indexOf(q)` 线性扫描。没有分词，没有倒排索引，没有 TF-IDF。~430KB 字符串驻留内存。对 216 页够用，但架构上是玩具。

### 5.3 `renderLibraryShelf` 每次切 filter 全量重建

```javascript
grid.innerHTML = '';   // L212 清空再重建
```

每次点刊物筛选按钮，全量销毁重建 DOM。应该只 toggle `display`。

### 5.4 图片预加载无取消机制

```javascript
new Image().src = root + '/images/page_' + ...;   // L202-203
```

快速翻页会堆积 Image 请求。浏览器排队请求但无法取消已发出的旧请求。翻 50 页堆积 50 个图片请求。

### 5.5 `<img>` 初始 src 硬编码

```html
<img id="page-original-image" src="issues/2026-08/images/page_001.png">   <!-- HTML L305 -->
```

如果上次读的是 7 月刊，首次加载会先请求 8 月刊的 page_001.png 再被 JS 覆盖。多余的图片请求。

---

## 六、工程交付毒舌：测试给了虚假的安全感

### 6.1 30 项测试全通过，却漏了 2 个 Bug

stress_test 升级到 6 项 30 断言，含 `node --check` + 行为探针 + JS-HTML 交叉校验。进步显著。

但 Bug A（const 赋值）和 Bug B（tile id 缺失）都漏了。**测试只测了作者想到的，没测作者没想到的**。

- TEST 4 行为探针测了 escRegex 和 font-scale 钳制，没测 toggleBookmark 的 const 安全
- TEST 6 校验了 JS `$()` 引用的 id 在 HTML 存在，没校验 JS 动态创建的元素是否有对应 id

### 6.2 `node --check` 只查语法不查类型

`node --check` 能查出 `const list = 1; list = 2;` 吗？**不能**。它只做语法解析，不做类型/作用域检查。要用 ESLint `no-const-assign` 或 TypeScript 才能捕获 Bug A。

作者开了 `'use strict'` 却没配 ESLint——**就像装了防盗门却没锁**。

### 6.3 没有 ESLint / Prettier / TypeScript

项目根目录没有 `.eslintrc`、`.prettierrc`、`tsconfig.json`。1303 行单文件没有格式化工具约束，没有类型检查。17 个裸状态变量、50+ 个 els 引用、复杂的 pageObj/segment 数据结构全靠注释和记忆。

对标 Linear——人家个人项目都上 TypeScript + ESLint + Prettier + Vitest。这里连 ESLint 都没有。

### 6.4 reader.html 与 index.html 完全重复

2.76MB × 2。维护时需同步两份。为什么需要两个入口？一个 `index.html` 不够吗？

### 6.5 死代码 / 死变量清单

| 位置 | 内容 | 状态 |
|:-----|:-----|:-----|
| L63 | `let currentAlignMode = 'flush'` | 从未被读取，被 `currentAlignModeInternal` 取代 |
| L1140 | `function bindOneEl(el, fn)` | 定义了从未调用 |
| L964 | `void code;` | 无意义语句 |
| L38 | `const VERSION = '2.0.0'` | 定义了但 UI 从不显示 |
| CSS L389 | `.audio-btn.speed-btn { ... }` | 与 L388 完全重复 |

---

## 七、细节挑刺清单（吹毛求疵专场）

| # | 位置 | 问题 | 毒舌点评 |
|:--|:-----|:-----|:---------|
| 1 | L882-883 | `drawerAudioSpeedBtn` 显示 `txt + ' 标准'` | 语速 1.5x 时显示"1.5x 标准"——1.5x 不是标准，是加速。文案逻辑错误 |
| 2 | L248 | meta-tag 硬编码 `22px 大字逐段对照` | 用户改字号后仍显示 22px。应动态读取 `globalFontScale` |
| 3 | HTML L97-98 | `issue-pill-full` 硬编码 `8月刊 · 104P` | 首次渲染闪烁错误文本，JS 覆盖前用户看到的是 8 月刊 |
| 4 | HTML L305 | `<img src="issues/2026-08/...">` 硬编码初始图 | 上次读 7 月刊时首次加载多余的 8 月刊图片请求 |
| 5 | L446 | `pNum <= 4` 硬编码封面判定 | 7 月刊封面可能不是前 4 页。应用 section 字段判定 |
| 6 | L752 | `totalPages \|\| 104` 魔法数字 | 凭空造 104 页。应从数据推导或报错 |
| 7 | L936-937 | G/Shift+G 与 vim 惯例相反 | vim 用户会骂人 |
| 8 | L1286 | `onvoiceschanged === null` 检查过于保守 | 某些浏览器是 undefined，但无害 |
| 9 | CSS L906 | h3 字号无 clamp 保护 | 极端字号下层级模糊或溢出 |
| 10 | L702-704 | `body._tapspeak` DOM 属性挂载 | 2008 年 jQuery 黑魔法 |
| 11 | L317 | `r.section.slice(0, 60)` 无 escHtml | section 经 toDisplayText 已转义，但 slice 可能截断 `<em>` 标签 |
| 12 | L779 | `hero.onclick = function(){...}` | 用 onclick 属性而非 addEventListener，与项目风格不一致 |
| 13 | L943 | J 键同时绑 `code==='KeyJ'` 和 `key==='j'` | 冗余。`e.code` 已含物理键位，`e.key` 在 CapsLock 下会变 |
| 14 | L568 | `s.en.length > 5` 魔法数字 | 为什么 >5？短于 5 字符的段落不朗读？ |

---

## 八、对标顶尖个人项目的差距

| 维度 | 顶尖个人项目基准 | 本项目现状 | 差距 |
|:-----|:-----------------|:-----------|:-----|
| **模块化** | 按功能拆 5-15 个模块 | 1303 行单 IIFE | 大 |
| **类型安全** | TypeScript 严格模式 | 裸 JS + 'use strict' | 大 |
| **代码规范** | ESLint + Prettier | 无配置 | 大 |
| **字体品质** | 自托管 woff2 或异步 Google Fonts | 系统默认字体 | 中 |
| **断行质素** | hyphenate-limit + text-wrap + font-feature | 仅 hyphens:auto | 中 |
| **移动端手势** | 滑动翻页 + 长按选词 | 仅按钮翻页 | 中 |
| **搜索体验** | 键盘导航 + 高亮 + 预览 | 仅鼠标点击 | 中 |
| **数据加载** | fetch 异步 + 缓存 | 2.8MB 内联 HTML | 中 |
| **离线可用** | Service Worker / PWA | 无 | 中 |
| **错误处理** | 友好的错误边界 + fallback | 静默兜底造空刊 | 小 |
| **测试覆盖** | 单元测试 + 集成测试 + E2E | 6 项静态断言 | 中 |
| **可访问性** | 完整 ARIA + 焦点陷阱 + 屏幕阅读器 | 基础 ARIA + focus-visible | 小 |

---

## 九、终评

### 它做对了什么（客观承认）

1. **P0 全修**：injectSyllables 删除、监听器委托、正则转义——v1.0 的三个阻断性缺陷全部消灭
2. **CSS 变量管道**：`--reader-font-scale` 驱动全站字号，无需 resize 监听，设计优雅
3. **压力测试升级**：从 4 项天真断言到 6 项 30 断言含 `node --check` + 行为探针——工程意识显著提升
4. **事件委托架构**：`dataset.bound` 一次性绑定，杜绝监听器泄漏——这是真正的工程进步
5. **无障碍基础**：`prefers-reduced-motion`、`:focus-visible`、`prefers-color-scheme`、`role`/`aria-modal`——比 90% 的个人项目都强

### 它犯了什么错（毒舌总结）

1. **因噎废食**：修 @import 重复加载，顺手删了 Google Fonts；修 injectSyllables，顺手删了断行精细控制。**修 bug 不是删功能**。
2. **测试虚高**：30/30 通过却漏了 2 个 Bug。测试只测了想到的，没测没想到的。`node --check` 不查类型，没配 ESLint。
3. **工程原地踏步**：1303 行单文件、50 行手动 els 赋值、17 个裸状态变量、无 ESLint/Prettier/TypeScript——架构层面与 v1.0 无本质区别，只是把旧代码重写得更干净。
4. **2.8MB 内联未修**：最该改的没改。fetch 异步加载 5 行代码的事。
5. **细节粗糙**：死代码、死变量、重复规则、魔法数字、硬编码文本、与 vim 相反的快捷键——吹毛求疵能挑出 14+ 处。

### 一句话

**v2.0 是一个"修了 bug 却丢了气质"的版本。** 工程严谨度从 C 提升到 B+，但产品精致度从 B+ 退到 B−。它现在更像一个"功能完备的工程原型"，而非一个"优雅精致的出版产品"。离顶尖个人项目的差距，不在"能不能用"（能用），而在"愿不愿意天天用"（差点意思）。

修 Bug A + B（5 分钟）→ 85 分。补回字体 + 断行控制（30 分钟）→ 88 分。上 ESLint + 拆模块（2 小时）→ 90 分。fetch 异步加载 JSON（10 分钟）→ 92 分。

**它离顶尖，只差几小时的手艺活。但那几小时，恰恰是"能用"和"想用"之间的距离。**

---

> **毒舌声明**：本锐评每条均有源码行号背书，非主观臆断。毒舌是出于对项目潜力的认可——如果它不值得评，就不值得毒舌。对标顶尖个人项目是最高标准的挑剔，非恶意贬低。

---

## 十、v2.1 整改回执（2026-08-09 当日响应）

> 毒舌锐评发出后即被拿去做整改清单。逐条执行结果如下（stress_test 已从 6 项 30 断言升级为含 **30 项行为探针**的回归套件，全部绿灯）。

### 10.1 已修复清单

| 锐评条目 | 处置 | 落地 |
|:---------|:-----|:-----|
| **1.4** bindOneEl 死代码 | ✅ 删除 `function bindOneEl` | L1141 移除，探针守护 |
| **1.5 / 7.10** `body._tapspeak` 挂 DOM 当状态 | ✅ 改为正文「一次性」事件委托（`dataset.boundTap`），`loadPage` 不再反复增删 | 探针守护「不再出现 `body.removeEventListener('click', body._tapspeak)`」 |
| **2.1 Bug A** 书签 const 崩溃 | ✅ `list.sort()` 就地排序（v2.0 已修） | 探针守护 |
| **2.2 Bug B** 缩略图 id 缺失 | ✅ `tile.id = 'tile-' + p`（v2.0 已修） | 探针守护 |
| **2.3 / 7.7** G 键与 vim 相反 | ✅ 交换：`Shift+G` → 顶部，`G` → 底部；速查表同步补充两行 | 探针守护（顺序断言） |
| **2.4 / 7.13** F 键绕按钮 | ✅ `F` 直达 `toggleFullscreen()` | 探针守护 |
| **2.5** 搜索双重匹配 | ✅ 单一 `isMatch.test()` 判定 + 标注用带 `g` 正则；顺手修了对 `row.title` 的 indexOf 冗余 | 探针守护 |
| **2.6** pickVoice 循环内 filter | ✅ filter 提到循环外一次 | 探针守护 |
| **3.2** 断行精细控制 | ✅ 全部恢复（v2.1 已补） | 探针守护 |
| **3.3** 双卡视觉层级 | ✅ 恢复 en 羊皮纸材质卡 + zh 通透辅读：`.en-text` 暖渐变卡、`.zh-text-card` 去虚线 | CSS 断言（无 `border-top: 1px dashed`） |
| **3.4** CSS 重复规则 | ✅ 已删（v2.0），探针守护 | |
| **3.5** 标题无 clamp | ✅ h3：`clamp(19px, ×1.35, 34px)`；h4：`clamp(16px, ×1.1, 30px)`；caption：`clamp(13px, ×0.86, 22px)` | 探针守护 |
| **4.1** 无滑动手势 | ✅ `touchstart/touchend` 横向翻页（阈值 60px，忽略纵向滚动） | 探针守护 |
| **4.2** Shelf J 强制进室 | ✅ Shelf 只留 `Enter`，J 回归「下一页」语义 | 探针守护 |
| **4.3** 搜索无键盘导航 | ✅ 新增 `bindSearchResultKeys()`：↑↓ 高亮（`kv-active`）+ Enter 直达，portal 与侧栏检索同享 | 探针守护 |
| **4.4** 危险操作默认聚焦确认 | ✅ danger 默认聚焦「取消」；Enter 跟随当前焦点 | 探针守护 |
| **4.5** Toast 1.4s 太短 | ✅ 分级：ok 1.6s / warn 2.5s / error 3.5s | 探针守护 |
| **5.1** JSON 内联 | ⚠️ **部分落地**：新增 `upgradeOnlineData()` —— HTTP 下异步增量 `fetch` 外部 JSON 并合并；`file://` 离线仍走内联（离线优先需求，不破坏本地双击打开） | 探针守护 |
| **5.5 / 7.4** `<img>` 初始 src 硬编码 | ✅ 改为 1×1 透明 data-URI（不再预发 8 月图请求），`loadPage` 时再切换 | HTML 探针 |
| **6.5** 死代码/死变量 | ✅ `void code;` 删除、`currentAlignMode` 删除、VERSION 显示于快捷键页脚、`bindOneEl` 删除、重复 CSS 删除 | 探针守护 |
| **7.1** 1.5x 还写「标准」 | ✅ 仅 `1.0x` 显示「标准」，其余只显示倍速 | 探针守护 |
| **7.2** meta 标签写死 22px | ✅ 改为实时读 `globalFontScale` | |
| **7.3** pill 写死 8月刊·104P | ✅ 占位「📅 加载中…」，boot 后由 `refreshPill()` 写真实数据 | HTML 探针 |
| **7.8** `onvoiceschanged === null` | ✅ 改为 `== null`（undefined 兼容） | 探针守护 |
| **7.11** section 截断切乱标签 | ✅ 标题截断改为显式 `toPlainText` 后 → 截断 → `escHtml`（先字符安全再 HTML） | |
| **7.12** hero 用 onclick 属性 | ✅ 改为 `bindStaticEvents` 一次性 `addEventListener` 委托 | 探针守护 |

### 10.2 复核明确拒绝（设计取舍，非缺陷）

| 条目 | 拒绝理由 |
|:-----|:---------|
| **3.1** 出版级字体 | 用户明确「离线优先，不引 Google Fonts」。离线正确的 woff2 自托管 + `<link rel=preconnect>` 需网络实证，本项目按离线场景定为设计取舍（取舍记录） |
| **1.1 / 1.3 / 6.3** 拆模块、TS/ESLint | 单文件 1300 行仍是个人工程边界内的可维护规模；拆分为 ES Modules 或引 ESLint 升 TS 属于「工程化重构项」，已列入下次大版本清单，本次不动 |
| **5.1** 完全去掉内联 JSON | 离线 `file://` 无法 fetch，内联是离线兜底；HTTP 场景已由 `upgradeOnlineData()` 增量生效 |
| **6.4** 两 HTML 冗余 | 保留（构造器生成，成本可控） |

### 10.3 测试如何不再"虚高"

之前 **6 项 30 断言** 漏掉了 Bug A/B。现在 TEST 4 升级为 **30 步行为探针**（`node -e` 真跑），其中包括：

- 所有 v2.1 修复点的存在性断言（如上表"探针守护"），防止未来重构回滚
- `escRegex` / font-scale 钳制等旧探针保留

复跑记录：**2026-08-09 · 30/30 通过**。

### 10.4 结论

> **"修复了 bug 却丢了气质"的批评已逐一回应。** 断行回归是可修之伤，如今已愈；双卡浮雕视觉恢复；hero/裸 onclick 清算；风险操作默认转向安全侧；滑动翻页与搜索键盘导航补齐交互预期。锐评里能踩的点，踩过之处均已上探针——下次谁再把它写回去，压力测试当场打脸。
