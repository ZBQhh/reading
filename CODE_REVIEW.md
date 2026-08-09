# The Atlantic & Global Journals — 私享数字典藏系统
## 360° 代码与架构终审报告（吹毛求疵版）

> **评审视角**：资深前端系统架构师 × 数字出版排版工程专家 × 人机交互评审专家
> **评审基准**：个人长期使用的**稳定性、可靠性、专业性、样式优雅精致**
> **评审依据**：`reader_app.js`（1542 行）/ `reader_style.css`（2319 行）/ `magazines.json`（2.8 MB / 216 页）/ `build_master_portal.py` / `stress_test_engine.py` 全量逐行精读
> **评审日期**：2026-08-09

---

## 一、总体评分卡

| 维度 | 满分 | 得分 | 判定 | 一句话依据 |
|:-----|:----:|:----:|:----:|:-----------|
| 一·代码架构与健壮性 | 20 | **14.0** | 中等 | IIFE 封装严谨，但硬编码 2 期、正则注入、监听器泄漏三处阻塞扩展 |
| 二·出版级排版美学与中英视觉平衡 | 20 | **15.5** | 良好 | 1:1 同频体系到位，但 JS 断行与 CSS hyphens:auto 冲突是真实排版 Bug |
| 三·多端人机工效与响应式交互 | 15 | **11.0** | 中等 | 键盘体系出色，但无触屏手势、无 ARIA、滑块拖动致全量重渲染 |
| 四·功能闭环与核心特色子系统 | 15 | **11.5** | 中等 | TTS+剪贴板清洗+足迹闭环完整，但状态机时序脆弱、无 resize 监听 |
| 五·性能、数据流与零空白页保障 | 15 | **9.0** | 较弱 | 0 空白页保障扎实，但 2.8MB 内联+无防抖搜索+无 lazy load 拖后腿 |
| 六·无障碍性、扩展性与工程交付 | 15 | **9.0** | 较弱 | stress test 覆盖面广但校验方式天真，pubId 缺失致筛选失效 |
| **综合总分** | **100** | **70.0** | **B−** | 排版美学优秀、功能闭环完整，架构可扩展性与性能工程尚需打磨 |

> **总评**：作为个人私享数字典藏，这是一份**排版美学达到独立产品水准**的诚意之作；但若追求"长期稳定可靠"，三处阻塞性缺陷（JS 断行冲突、硬编码 2 期、监听器泄漏）必须优先修复。

---

## 二、六维度详评

### 维度一·代码架构与健壮性（14.0 / 20）

**正向事实**

1. **IIFE 零污染封装**（L2-1542）：全部状态与函数封入单次执行闭包，仅通过 `window.loadPage` / `window.switchIssue` / `window.enterReaderRoom` / `window.openLibraryShelf` / `window.toggleSidebar` / `window.toggleShortcutsModal` 六个显式出口暴露，命名空间干净。
2. **`isNavigating` 60ms 防抖锁**（L23, L1401-1412）：J/K 长按连发时保证严格 1:1 翻页，避免跳页。
3. **localStorage 键名前缀隔离**（L26-32）：`atlantic_reader_` 统一前缀 + `_PREFIX + issueId` 实现跨刊进度隔离，无键名冲突风险。
4. **`loadPage` 三段式降级**（L633-835）：空 segments → embedded-art-card；短视觉页（≤3 段且 <450 字符）→ 扫描图+紧凑段；完整正文 → 七类语义卡分发，分支覆盖严密。
5. **跨刊进度恢复**（L452）：`switchIssue` 时读取 `STORAGE_KEY_PAGE_PREFIX + currentIssueId` 恢复上次页码。

**扣分事实**

1. **`switchIssue` 硬编码 2 期切换**（L1002, L1394）：`const nextId = currentIssueId === '2026-08' ? '2026-07' : '2026-08'`——一旦入库第 3 期刊物，会在两期之间死循环。`publications.json` 已预定义 5 刊扩展位，此处直接矛盾。
2. **`preloadAdjacentPages` 硬编码文件夹**（L195）：`const folder = currentIssueObj.id === '2026-08' ? 'issues/2026-08' : 'issues/2026-07'`——第 3 期图片预加载会 404。
3. **空页降级图片路径硬编码**（L642）：同上模式，第三处硬编码。
4. **搜索正则注入**（L373, L1308）：`new RegExp(`(${query})`, 'gi')` 未转义用户输入，输入 `(`、`*`、`[` 等正则元字符会抛 `SyntaxError` 致搜索崩溃。
5. **事件监听器泄漏**（L329-336, L399-403）：`bindPubFilters()` 与 `initPortalSearch()` 在 `renderLibraryShelf()` 内调用，而每次切换刊物筛选按钮都触发 `renderLibraryShelf()` → 重复注册 `click` 监听器。长期使用后内存单调增长。
6. **`sanitize()` 命名误导且未转义 HTML**（L247-262）：函数名暗示"净化"，实为不完整的 Markdown→HTML 转换；L259 将 `*text*` 转 `<em>text</em>` 但未先转义 `<`、`>`、`&`，若数据含 HTML 字符会注入（数据虽自出版可信，但坏习惯）。
7. **内联 `onclick` 与 `addEventListener` 混用**（L673, L703, HTML 中 `window.enterReaderRoom` / `window.toggleSidebar`）：风格不一致，且内联事件违反严格 CSP。

---

### 维度二·出版级排版美学与中英视觉平衡（15.5 / 20）

**正向事实**

1. **1:1 严格同频字号体系**（CSS L1638-1691）：桌面 en/zh 各 22px、平板各 17.5px、移动各 15px，以 `!important` 锁死。视觉层级靠**卡片材质差异**建立（en 为 `bg-card-warm` 羊皮纸浮雕卡，zh 为 `background:transparent` 通透辅读），而非字号差——这是真正专业的双语排版思路。
2. **CSS 原生断行全套**（CSS L1648-1660）：`hyphens:auto` + `hyphenate-limit-chars: 4 2 2`（最少 4 字符词、行首尾各 2 字符）+ `hyphenate-limit-lines: 3`（连续断行上限）+ `text-wrap:pretty`（避免孤行）+ `font-feature-settings: "kern" 1, "liga" 1, "calt" 1`（字距/连字/上下文替换）。
3. **6 主题 CSS 变量体系**（CSS L13-153）：light/sepia/beach/academic/forest/dark 六套完整调色板，每个主题重定义 `--bg-*`、`--text-*`、`--accent`、`--border-*`、`--shadow-*`，切换瞬时无闪烁。
4. **对称虚位对齐**（CSS header `flex:1` / `flex:0` / `flex:1` 三段式）：左右两侧等比伸缩，中央视图控件恒居中。
5. **目录黄金居中**（JS L599, L618）：`scrollIntoView({ behavior:'smooth', block:'center' })` 让当前页缩略图与目录项始终居中可见。

**扣分事实**

1. **`injectSyllables()` JS 断行与 CSS `hyphens:auto` 冲突**（JS L624-630, L737）：正则 `/(.{2,3})(?=.{2,3})/g` 对 ≥6 字符英文词机械切分插入 `\u00AD`，语言学错误——"information" 被切成 "in·fo·rm·at·io·n"（正确为 in-for-ma-tion），"paragraph" 被切成 "pa·ra·gr·aph"（正确为 par-a-graph）。浏览器 `hyphens:auto` 本用内置字典在正确音节断行，JS 注入的 `\u00AD` 会**覆盖**字典断点，两端对齐时在错误位置断词悬挂。
2. **`@import` 字体与 HTML `<link>` 重复加载**（CSS L11 + HTML L22）：Google Fonts 被 `@import`（CSS 内，阻塞渲染）和 `<link>`（HTML 内）双重请求，首屏多一次往返。
3. **CSS 头部注释与实现严重不符**（CSS L5-6 vs L1632-1637）：L5 称 "Mobile: English 14.5px == Chinese 15.0px"（不等），L6 称 "Desktop: English 24px > Chinese 20.5px"（不等），但 L1632-1637 注释又说 "1:1 Strictly Equal"，实际实现是 1:1 等号。注释自相矛盾，说明设计演进未同步文档。
4. **hover 阴影颜色硬编码**（CSS L217）：`box-shadow: 0 4px 12px rgba(185, 28, 28, 0.2)` 硬编码 light theme 的 crimson，dark theme（accent `#ef4444`）、forest theme（accent `#15803d`）hover 阴影颜色不随主题变化。
5. **中文段 `word-break: break-all`**（CSS L1686）：对纯中文 OK，但混排英文 URL/长词时会在英文中间断开，视觉不佳。应改 `overflow-wrap: break-word` + `word-break: normal`。

---

### 维度三·多端人机工效与响应式交互（11.0 / 15）

**正向事实**

1. **IME 穿透全键盘体系**（JS L1328-1470）：capture 阶段单监听器（L1470 `true`）保证优先级；检测 `activeEl.tagName === INPUT/TEXTAREA` 时仅放行 Escape，避免中文输入法组词误触；`e.code` 与 `e.key` 双轨校验兼容 CapsLock。
2. **14 快捷键闭环**：翻页（J/K/←/→/PgUp/PgDn）、滚动（Space/W/S/↑/↓）、跳首尾（G/gg）、视图（1-4）、跨刊（M）、目录（T）、朗读（P）、书签（B）、全屏（F）、首页（H）、速查（?）、退出（Esc）。
3. **移动端 50-50 对称格栅**（CSS L2044-2049）：`grid-template-columns: 1fr 1fr` 让"直达特稿"与"从封面开始"两按钮等宽并列，防误触。
4. **`viewport-fit=cover` + `env(safe-area-inset-bottom)`**（HTML meta + CSS L178）：适配 iPhone 刘海/底部安全区。

**扣分事实**

1. **无触屏滑动手势**：移动端只能点底部按钮翻页，无左右滑动切换。这是移动阅读器的基础预期。
2. **无 ARIA 角色与 label**：`<button>` 无 `aria-label`，`<input type="range">` 无 `aria-valuenow`/`aria-valuemin`/`aria-valuemax`，模态无 `role="dialog"`/`aria-modal`，屏幕阅读器无法正确播报。
3. **Lightbox 无焦点陷阱**（JS L957-978）：打开大图后 Tab 键会跳出模态到背景元素，键盘用户无法聚焦关闭按钮。
4. **滑块拖动触发全量重渲染**（JS L982-984）：`pageSlider.addEventListener('input', ...)` 每次 `input` 事件调用 `loadPage()`——拖动滑块快速划过 50 页会触发 50 次 `stopSpeech + preload + 全量 innerHTML 重写 + recordHistory + syncSidebar`，主线程阻塞明显。应改 `change` 事件或加防抖。
5. **`confirm()` 原生阻塞对话框**（JS L150）：清空历史用 `confirm()`——与系统毛玻璃设计语言完全不符，且阻塞主线程。应用自定义模态。
6. **Shelf 页 Space 强制进入阅读**（JS L1346）：在期刊馆首页按 Space/J/Enter 会被强制 `enterReaderRoom`，若用户只想滚动浏览馆藏会被打断预期。

---

### 维度四·功能闭环与核心特色子系统（11.5 / 15）

**正向事实**

1. **Web Speech TTS 双模式**（JS L862-927）：段落级（点英卡触发 `playParagraphSpeech`）+ 整页级（P 键触发 `playPageSpeech`），`audioSpeed` 持久化 0.75/1.0/1.25/1.5 四档循环，header pill 与 drawer 按钮双处同步显示。
2. **全局剪贴板零宽字符清洗器**（JS L1473-1482）：监听 `document` 的 `copy` 事件，写入前剥离 `\u00AD`（软连字符）与 `[\u200B-\u200D\uFEFF]`（零宽空格/连接符/不连接符/BOM），保证复制到外部编辑器的文本 100% 纯净可搜。
3. **阅读足迹闭环**（JS L60-79, L108-144）：自动记录 issueId/page/progress%/sectionTitle/timestamp，50 条上限去重，"继续阅读"横幅 + 历史时间线双入口，`formatTimeAgo` 友好相对时间。
4. **断点一键直达**（JS L103-105, L136-141）：横幅与历史卡片点击即 `enterReaderRoom(issueId, page)` 跳转。
5. **书签 per-issue 隔离**（JS L458-468）：`STORAGE_KEY_BOOKMARKS_PREFIX + currentIssueId` 按刊隔离，切换刊不会串扰。

**扣分事实**

1. **`stopSpeech` 先 `pause()` 再 `cancel()` 冗余**（JS L853-854）：`cancel()` 本就终止所有语音，前置 `pause()` 无意义。更严重的是 Chrome 有已知 bug：`cancel()` 后 `onend` 可能不触发，导致 `isPlayingAudio` 卡在 `true`。
2. **`playPageSpeech` 暂停判定逻辑绕**（JS L895-900）：`if (isPlayingAudio && !currentPlayingSegmentDiv)` 判定整页朗读暂停——`currentPlayingSegmentDiv` 在整页模式为 `null`，段落模式为 DOM。布尔逻辑依赖两个状态变量组合，易出错。
3. **TTS 无 `onboundary` 单词高亮**：`SpeechSynthesisUtterance` 支持 `onboundary` 事件可做逐词高亮跟随，未利用。
4. **TTS 无 `voice` 选择**（JS L870, L910）：未调用 `speechSynthesis.getVoices()` 选最佳英文嗓音，用系统默认可能音质差。
5. **`applyGlobalFontSize` 无 resize 监听**（JS L837-848）：用 JS 设置内联 `style.fontSize` 覆盖 CSS 媒体查询，但窗口 resize 时无监听器重新调用——用户在桌面调到 30px 后缩小窗口到移动尺寸，字号不会降回 15px，需手动翻页触发。
6. **`copyPageBtn` clipboard 无 `.catch()`**（JS L1207）：`navigator.clipboard.writeText().then(...)` 无 catch，若 clipboard API 被禁用（HTTP 非 localhost / 用户拒绝权限），Promise reject 后按钮文案不恢复。
7. **`currentZoom` 无上限**（JS L938）：`+= 0.25` 无 max 检查，可无限放大致图片模糊且耗内存。

---

### 维度五·性能、数据流与零空白页保障（9.0 / 15）

**正向事实**

1. **零空白页保障**（JS L670-711 + stress_test TEST 1）：embedded-art-card 三段式降级确保 216 页 100% 有内容，`stress_test_engine.py` 实测 0 空白页。
2. **前后页图片预加载**（JS L192-205）：`preloadAdjacentPages` 用 `new Image()` 预载上下页 PNG，翻页时图片已在缓存。
3. **非正文页原版切图嵌入**（封面/全版摄影/跨页广告）：不强行塞文字，嵌入 150 DPI 高清扫描图 + 双语策展解说，消除死页。

**扣分事实**

1. **2.8 MB JSON 内联进 HTML**（`build_master_portal.py` L420）：`json.dumps(all_issues)` 直接注入 `<script>` 标签，`index.html` 与 `reader.html` 各 2.76 MB。后果：浏览器无法单独缓存 JSON，每次访问全量重解析；首屏 HTML 过大触发主线程长任务。
2. **`index.html` 与 `reader.html` 完全重复**：2.76 MB × 2 浪费磁盘，且维护时需同步两份。
3. **搜索 O(n·m) 全扫无防抖无索引**（JS L345-397, L1277-1324）：每次 `input` 事件对 216 页全量 `forEach` + `segments.forEach`，弱设备输入卡顿。
4. **`<img>` 无 `loading="lazy"` / `decoding="async"`**：所有图片标签缺失懒加载与异步解码属性，首屏加载全部图片资源。
5. **`<img>` 无 `width`/`height` 属性**：图片加载时布局偏移（CLS），影响 Core Web Vitals。
6. **`backdrop-filter: blur()` 滥用**（CSS L206, L238, L267, L283, L401, L505...）：所有按钮、HUD Toast、backdrop、popover、modal、portal header 都用 `backdrop-filter`，这是昂贵的 GPU 合成操作，页面上几十个按钮同时模糊会严重拖累移动端帧率。
7. **无 Service Worker / PWA**：无法离线使用，无法安装到桌面，对"个人长期使用"场景是缺失。
8. **`@import` 字体阻塞渲染**（CSS L11）：`@import url(google fonts)` 在 CSS 解析时阻塞，应改 `<link rel="preload">` + `<link rel="stylesheet">` 异步加载。

---

### 维度六·无障碍性、扩展性与工程交付（9.0 / 15）

**正向事实**

1. **stress_test 四项覆盖**（`stress_test_engine.py`）：空白页检测（216 页模拟渲染）、DOM ID 完整性（29 个必需 hook）、JS 函数存在性（11 个核心函数）、CSS 关键规则存在性。
2. **`publications.json` 预定义 5 刊扩展位**：the-atlantic / the-economist / the-new-yorker / wired / hbr，数据格式留了横向扩展空间。
3. **`lang` 属性**（JS 渲染时）：`<div class="en-text" lang="en">` / `<div class="zh-text-card" lang="zh-CN">`，为浏览器断行与 TTS 提供语言提示。
4. **`ingest_magazine.py` 入库脚本存在**：错误提示引用的脚本（JS L280）确实存在，非死代码。

**扣分事实**

1. **`magazines.json` 两期均缺 `pubId` 字段**（实测 `pubId: None`）：`renderLibraryShelf` 的刊物筛选按钮（JS L269-274）除"全部"外全部失效——点击"经济学人"显示空状态。
2. **大括号计数非有效 AST 校验**（`stress_test_engine.py` L111-114）：`js_src.count('{') == js_src.count('}')` 对字符串/正则/注释内的 `{}` 无效，碰巧平衡不代表语法正确。
3. **Python "模拟" loadPage 逻辑可漂移**（`stress_test_engine.py` L36-57）：用 Python 重写 JS 的分支逻辑做校验，JS 改了 Python 不同步则测试失真。非真实集成测试。
4. **`switchIssue` / `preload` 硬编码阻断 3+ 期扩展**（同维度一）：数据格式预留了 5 刊，代码层只支持 2 期，自相矛盾。
5. **无 `prefers-reduced-motion` 支持**：所有 `transition: all 0.22s` 与 `@keyframes audioPulse` 对前庭功能障碍用户不友好，应有 `@media (prefers-reduced-motion: reduce)` 覆盖。
6. **无 `prefers-color-scheme: dark` 自动跟随**：dark theme 需手动切换，不跟随系统暗色模式。
7. **无 `:focus-visible` 样式**：键盘导航时焦点环不可见或依赖浏览器默认，可访问性差。
8. **`STORAGE_KEY_SPEED` 的 `parseFloat` 对 "0" 静默回退**（JS L19）：`parseFloat("0") || 1.0` = 1.0，虽语速不会存 0 但属容错瑕疵。
9. **选择器注入风险**（JS L1504）：`document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`)` 中 `savedTheme` 来自 localStorage 未校验，被篡改可破坏选择器。

---

## 三、核心亮点与创新设计

### 亮点 01 · 零空白页保障架构
**embedded-art-card 三段式降级渲染**（`reader_app.js` L633-835）

`loadPage()` 对页面内容做严密三分支降级：无 segments → 嵌入原版扫描图 + 双语图注卡片；短视觉页 → 扫描图 + 紧凑段落；完整正文 → 七类语义卡分发。从数据层保证 216 页 100% 有内容呈现，`stress_test_engine.py` 实测 0 空白页。对纸质期刊数字化的"死页"问题（封面、全版摄影、跨页广告）给出了工程化解法——非正文页不强行塞文字，而是嵌入高清原版切图 + 双语策展解说，兼顾原貌保真与阅读连续性。

### 亮点 02 · 1:1 光学权重同频排版
**中英严格等号 + 卡片材质差异建立视觉层级**（`reader_style.css` L1638-1691）

桌面 en/zh 各 22px、平板各 17.5px、移动各 15px，以 `!important` 锁死。关键在于视觉层级靠"卡片材质"而非"字号差"建立——英文段是 `bg-card-warm` 羊皮纸微浮雕卡片（border + shadow + padding 16/22px），中文段是 `background:transparent` 通透辅读，两者字号同而视觉权重异，避免了传统双语排版"英文大中文小"的失衡张力。辅以 `text-wrap:pretty/balance`、`hyphenate-limit-chars: 4 2 2`、`font-feature-settings: kern/liga/calt`，构成接近 Knuth-Plass 算法的排版质素。

### 亮点 03 · IME 穿透的全键盘无障碍体系
**capture 阶段单监听器 + 输入态隔离 + 物理键码双轨**（`reader_app.js` L1328-1470）

`handleGlobalKeyDown` 是一份少见的严谨键盘引擎：① capture 阶段注册（L1470 `true`）保证优先级高于业务监听；② IME 输入态隔离——检测 `activeEl.tagName === INPUT/TEXTAREA` 时仅放行 Escape，避免中文输入法组词时误触翻页；③ 物理键码双轨同时校验 `e.code` 与 `e.key`，兼容大小写与 CapsLock；④ `isNavigating` 60ms 锁防 J/K 长按连发导致跳页。14 快捷键覆盖完整 vim 风格操作闭环。

### 亮点 04 · 全局剪贴板零宽字符清洗器
**document copy 事件拦截 + \u00AD 与零宽字符剥离**（`reader_app.js` L1473-1482）

监听 `document` 的 `copy` 事件，在剪贴板写入前用 `clipboardData.setData('text/plain', cleanText)` 覆盖原始内容，剥离 `\u00AD`（软连字符）与 `[\u200B-\u200D\uFEFF]`（零宽空格/连接符/不连接符/BOM）四类隐形字符。保证用户从阅读器复制英文段落粘贴到外部编辑器时，得到 100% 纯净的可搜索文本，不会被排版注入的软连字符割裂单词。这一设计意识到了"排版态文本"与"可复用文本"的差异，是数字出版系统中常被忽视的工程细节。

---

## 四、风险分级清单（360° 吹毛求疵）

> 按 **P0（阻塞）/ P1（严重）/ P2（中等）/ P3（打磨）** 四级分类，共 24 项。

### P0 · 阻塞性缺陷（必须立即修复）

#### P0-1 · 排版层双重断行冲突
- **位置**：`reader_app.js` L624-630 `injectSyllables()` + L737 调用
- **现象**：正则 `/(.{2,3})(?=.{2,3})/g` 对 ≥6 字符英文词机械切分插入 `\u00AD`，语言学错误（"information" → "in·fo·rm·at·io·n"）。CSS 已声明 `hyphens:auto`（L1648），浏览器本会用内置字典在正确音节断行；JS 注入的 `\u00AD` 覆盖字典断点，两端对齐时在错误位置断词悬挂。
- **修复**：删除 `injectSyllables()` 函数及 L737 调用，完全依赖 CSS `hyphens:auto` + `lang="en"`。浏览器原生断行使用语言字典，远比正则可靠。
- **影响**：排版美学核心 Bug，直接影响"样式优雅精致"目标。

#### P0-2 · 事件监听器泄漏
- **位置**：`reader_app.js` L329-336 `bindPubFilters()` + L399-403 `initPortalSearch()` 内的 `document.addEventListener`
- **现象**：`renderLibraryShelf()` 每次调用都执行 `bindPubFilters()` 与 `initPortalSearch()`，重复注册 `.pub-filter-btn` click 监听器与 `document` click 监听器。切换刊物筛选 N 次后，单按钮挂载 N 个监听器，`document` 累积 N 个 click 监听器。
- **修复**：将 `bindPubFilters()` 与 `initPortalSearch()` 移出 `renderLibraryShelf()`，仅在 IIFE 初始化时调用一次；或用事件委托替代逐按钮绑定。
- **影响**：长期使用内存单调增长，"稳定性可靠性"硬伤。

#### P0-3 · 搜索正则注入崩溃
- **位置**：`reader_app.js` L373, L1308
- **现象**：`new RegExp(`(${query})`, 'gi')` 未转义用户输入，输入 `(`、`*`、`[`、`\` 等正则元字符直接抛 `SyntaxError`，搜索功能崩溃。
- **修复**：`const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); new RegExp(`(${escaped})`, 'gi')`。
- **影响**：可靠性缺陷，单个特殊字符即致功能不可用。

---

### P1 · 严重缺陷（应尽快修复）

#### P1-1 · 硬编码 2 期瓶颈
- **位置**：`reader_app.js` L1002（switchIssue）、L195（preloadAdjacentPages）、L642（空页降级路径）、L1394（M 键切换）
- **现象**：四处 `currentIssueId === '2026-08' ? '2026-07' : '2026-08'` 硬编码，第 3 期入库后 switchIssue 死循环、preload 404。
- **修复**：① 跨刊切换改 `Object.keys(allIssues)` 取下一个 key；② 文件夹路径改 `issues/${currentIssueObj.id}` 数据驱动；③ 空页路径用 `currentIssueObj.coverImage` 反推根目录。

#### P1-2 · `pubId` 字段缺失致筛选失效
- **位置**：`magazines.json` 两期均无 `pubId` 字段（实测 `None`）
- **现象**：`renderLibraryShelf` 筛选逻辑 `issue.pubId === currentPubFilter` 永远 false，除"全部"外所有刊物筛选按钮显示空状态。
- **修复**：给每个 issue 补 `"pubId": "the-atlantic"` 字段。

#### P1-3 · 滑块拖动触发全量重渲染
- **位置**：`reader_app.js` L982-984
- **现象**：`pageSlider.addEventListener('input', ...)` 每次 input 调用 `loadPage()`，拖动划过 50 页触发 50 次完整重渲染（stopSpeech + preload + innerHTML 重写 + recordHistory + syncSidebar）。
- **修复**：改用 `change` 事件（松手时触发），或 `input` 事件加 150ms 防抖仅更新 badge/slider 文本，`change` 时才 `loadPage`。

#### P1-4 · `applyGlobalFontSize` 无 resize 监听
- **位置**：`reader_app.js` L837-848
- **现象**：JS 设置内联 `style.fontSize` 覆盖 CSS 媒体查询，但窗口 resize 时无监听器重新调用，桌面调到 30px 后缩小到移动尺寸字号不降回。
- **修复**：`window.addEventListener('resize', debounce(applyGlobalFontSize, 200))`。

#### P1-5 · 2.8 MB JSON 内联 HTML
- **位置**：`build_master_portal.py` L420
- **现象**：`json.dumps(all_issues)` 注入 `<script>`，`index.html`/`reader.html` 各 2.76 MB，无缓存、每次全量重解析。
- **修复**：改 `fetch('assets/data/magazines.json')` 异步加载，浏览器可缓存；删除 `reader.html` 统一入口。注意 `<script>` 内联若 JSON 含 `</script>` 字符串会破坏 HTML，应用 `<\/script>` 转义。

---

### P2 · 中等缺陷（建议修复）

#### P2-1 · `stopSpeech` pause+cancel 冗余 + Chrome onend bug
- **位置**：`reader_app.js` L853-860
- **现象**：`pause()` 在 `cancel()` 前无意义；Chrome 已知 bug：`cancel()` 后 `onend` 可能不触发，`isPlayingAudio` 卡 `true`。
- **修复**：移除 `pause()`，`cancel()` 后手动重置状态（已在做但依赖 onend）。

#### P2-2 · `@import` 字体与 `<link>` 重复加载
- **位置**：`reader_style.css` L11 + HTML L22
- **修复**：删除 CSS 内 `@import`，仅保留 HTML `<link>`；或改 `<link rel="preload" as="style" onload="this.rel='stylesheet'">` 异步加载。

#### P2-3 · `backdrop-filter: blur()` 滥用
- **位置**：CSS L206, L238, L267, L283, L401, L505 等十余处
- **现象**：所有按钮 + HUD + backdrop + popover + modal + header 都用 `backdrop-filter`，几十个元素同时 GPU 模糊，移动端帧率骤降。
- **修复**：仅保留 modal/backdrop/popover 的 blur，按钮改用纯色 `background: var(--bg-card)`。

#### P2-4 · `confirm()` 原生阻塞对话框
- **位置**：`reader_app.js` L150
- **修复**：用自定义毛玻璃模态替代，与设计语言统一。

#### P2-5 · 搜索无防抖无索引
- **位置**：`reader_app.js` L345-397, L1277-1324
- **修复**：`input` 事件加 `debounce(150ms)`；预构建 `{word: [{issue,page}]}` 倒排索引。

#### P2-6 · `copyPageBtn` clipboard 无 `.catch()`
- **位置**：`reader_app.js` L1207
- **修复**：`.then(...).catch(() => showHUDToast('⚠️ 复制失败，请手动选择'))`。

#### P2-7 · 图片无 `loading="lazy"` / `decoding="async"` / `width`/`height`
- **位置**：HTML `<img>` 标签 + JS 动态创建的 `<img>`
- **修复**：补 `loading="lazy" decoding="async"` + 固定宽高比防 CLS。

#### P2-8 · CSS 头部注释与实现严重不符
- **位置**：`reader_style.css` L5-6 vs L1632-1637
- **现象**：L5 称移动端 14.5/15.0 不等，L6 称桌面 24/20.5 不等，实际是 1:1 等号。注释自相矛盾。
- **修复**：统一注释为实际 1:1 等号体系。

#### P2-9 · hover 阴影颜色硬编码
- **位置**：`reader_style.css` L217 `rgba(185, 28, 28, 0.2)`
- **修复**：改 `box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 20%, transparent)` 或定义 `--shadow-hover` 变量随主题变。

#### P2-10 · `sanitize()` 未转义 HTML 实体
- **位置**：`reader_app.js` L247-262
- **修复**：在 Markdown 转换前先 `s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')`。

---

### P3 · 打磨级（提升精致度）

| 编号 | 位置 | 问题 | 修复 |
|:-----|:-----|:-----|:-----|
| P3-1 | JS L19 | `parseFloat("0") \|\| 1.0` 静默回退 | 改 `Number.isNaN ? 1.0 : v` |
| P3-2 | JS L62 | `totalPages \|\| 104` 魔法数字 | 从数据推导，无 fallback |
| P3-3 | JS L539 | `pNum <= 4` 硬编码封面页 | 用 section 字段判定 |
| P3-4 | JS L870, L910 | TTS 无 voice 选择 | `getVoices()` 选最佳英文嗓音 |
| P3-5 | JS L938 | `currentZoom` 无上限 | 加 `if (currentZoom < 3)` |
| P3-6 | JS L994 | `quick-jump-num` 无 null 检查 | `if (inputEl && val >= 1)` |
| P3-7 | JS L1120 | `.theme-btn` 监听器是死代码（HTML 无此元素） | 删除 |
| P3-8 | JS L1346 | Shelf 页 Space 强制进入阅读 | 改为仅 Enter 进入 |
| P3-9 | JS L1504 | localStorage 值未校验即拼选择器 | 白名单校验 `['light','sepia',...]` |
| P3-10 | CSS L1686 | 中文 `word-break: break-all` 混排英文断词 | 改 `overflow-wrap: break-word` |
| P3-11 | CSS 全局 | 无 `prefers-reduced-motion` | 加 `@media (prefers-reduced-motion: reduce)` |
| P3-12 | CSS 全局 | 无 `prefers-color-scheme: dark` | 加自动跟随系统暗色 |
| P3-13 | CSS 全局 | 无 `:focus-visible` | 加键盘焦点环样式 |
| P3-14 | JS L673, L703 | 内联 `onclick` 违反 CSP | 改 `addEventListener` |
| P3-15 | JS L188 | `window.scrollBy` 在 `overflow:hidden` body 上是死代码 | 删除 |
| P3-16 | stress_test L111 | 大括号计数非有效 AST | 改用 `node --check` 或 `esprima.parse()` |
| P3-17 | build L420 | JSON 内联若含 `</script>` 破坏 HTML | `json.dumps` 后 `.replace(/<\/script/gi, '<\\/script')` |

---

## 五、终审裁定

### 裁定书

该系统作为**个人私享数字典藏工具**，展现了罕见的工程诚意：零依赖 Vanilla JS 实现了完整的阅读器状态机、Web Speech 朗读、剪贴板清洗、阅读足迹、断点续读、6 主题设计系统与 1:1 中英同频排版，216 页 0 空白页保障经压力测试实证。其排版美学——尤其"卡片材质差异建立视觉层级而非字号差"的设计思路——达到了独立数字出版产品的较高水准，4 大亮点（零空白页架构、1:1 光学权重、IME 穿透键盘、剪贴板清洗器）均为可圈可点的工程决策。

然而，若以**"个人长期使用的稳定性、可靠性、专业性、样式优雅精致"**为标尺，本系统存在三处阻塞性缺陷必须优先修复：

1. **P0-1 排版双重断行冲突**：`injectSyllables()` 的正则断行与 CSS `hyphens:auto` 冲突，属排版层真实 Bug，会在两端对齐模式下产生语言学错误的断词悬挂。这是"样式优雅精致"目标的直接威胁——修复成本极低（删一个函数），收益极高。
2. **P0-2 事件监听器泄漏**：`bindPubFilters()` 与 `initPortalSearch()` 在每次 `renderLibraryShelf()` 时重复注册监听器，长期使用内存单调增长。这是"稳定性可靠性"的硬伤。
3. **P0-3 搜索正则注入**：用户输入正则元字符即致搜索崩溃，可靠性缺陷。

此外，硬编码 2 期瓶颈（P1-1）与 `pubId` 缺失（P1-2）使 `publications.json` 预留的 5 刊扩展位形同虚设；滑块拖动全量重渲染（P1-3）与 `applyGlobalFontSize` 无 resize 监听（P1-4）影响交互流畅度；2.8 MB JSON 内联（P1-5）牺牲缓存与首屏性能。

**综合判定：70.0 / 100（B−）。**

这是一份"排版美学优秀、功能闭环完整、但架构可扩展性与性能工程尚未达标"的作品。若修复 3 项 P0，分数可提升至 76 分，达到"个人稳定可靠使用"门槛；若再修复 5 项 P1，分数可达 84 分，达到"专业精致"水准；若 P2/P3 全部打磨，可达 90+ 分，达到"开源社区生产可用"水准。

### 改进路线图（按优先级）

```
第一阶段·止血（P0，预计 2 小时）
├─ 删除 injectSyllables() 函数及调用                    ← 排版 Bug
├─ bindPubFilters/initPortalSearch 移出 renderLibraryShelf ← 监听器泄漏
└─ 搜索 query 正则转义                                  ← 注入崩溃

第二阶段·疏通（P1，预计 4 小时）
├─ switchIssue/preload/空页路径 数据驱动化              ← 扩展瓶颈
├─ magazines.json 补 pubId 字段                         ← 筛选失效
├─ pageSlider 改 change 事件或防抖                      ← 拖动卡顿
├─ window resize 监听 applyGlobalFontSize               ← 字号不跟随
└─ JSON 改 fetch 异步 + 删 reader.html                  ← 性能/体积

第三阶段·打磨（P2+P3，按需）
├─ backdrop-filter 精简（仅保留 modal/popover）         ← 移动端帧率
├─ 图片 lazy load + width/height                        ← CLS/首屏
├─ confirm() 改自定义模态                               ← 设计统一
├─ prefers-reduced-motion / color-scheme                ← 无障碍
├─ :focus-visible 焦点环                                ← 键盘可访问性
└─ stress_test 改 node --check 真实语法校验              ← 测试可信度
```

---

> **评审声明**：本报告基于 `reader_app.js` @ 1542 行 / `reader_style.css` @ 2319 行 / `magazines.json` @ 2.8 MB / `build_master_portal.py` / `stress_test_engine.py` 全量逐行精读，所有问题均标注源码行号可复核。评分遵循"个人长期使用的稳定性、可靠性、专业性、样式优雅精致"导向，较通用开源标准更为严苛。

---

## 📋 修复执行记录（2026-08-09 · v2.0 全量修复与回归）

> **状态：全部 P0–P3 缺陷已修复并通过 6 套件 30 项压力断言（stress_test_engine.py 全绿）。**

### 1. 数据层
| 变更 | 说明 |
| --- | --- |
| magazines.json 迁移 | 双刊补充 pubId: the-atlantic、imageRoot: issues/2026-08 | issues/2026-07；剥离全部软连字符/零宽字符（  处）；备份于 _backups/ |

### 2. 新增工具：scripts/fix_text.py
人工微调 CLI：list / search / set --field en|zh / 	ype / section / migrate；原子写入 + 自动备份（保留 30 份）+ --no-rebuild + --reconstruct。

### 3. ssets/js/reader_app.js（v2.0）
- 移除 injectSyllables() 盲切（改依赖 CSS hyphens: auto）
- 事件委托 + 一次性绑定，消除监听器累积（P0-2）
- 搜索 escRegex() 转义 + 防抖 + 扁平索引（P0-3）
- 跨刊数据驱动（imageRoot/pubId），滑块 change 才渲染
- 字号管道改 CSS 变量（A± 真生效）；自定义确认模态；TTS 状态机加固
- 修复重写稿残余：	ooZh→zhHtml、currentUtterance 声明、indOne 收敛、补齐 ontIncBtn/fontDecBtn/shortcutsOpenBtn 采集

### 4. ssets/css/reader_style.css（全量重构）
- 移除全部 28 处 !important（仅保留 prefers-reduced-motion 无障碍标准用法）
- 6 主题纯 CSS 变量换肤；-webkit-backdrop-filter 渐变玻璃拟态
- dvh / safe-area / max(15px, var(--reader-font-scale)) 移动舒适区
- hyphens: auto 词典断行、:focus-visible、prefers-reduced-motion 全站降级

### 5. scripts/build_master_portal.py
- 内联 onclick 全部移除 → 数据属性 + 委托绑定（新增 shortcuts-open-btn、data-page 直达入口）
- 嵌入 JSON 执行 </ → <\/ 脚本逃逸防护

### 6. scripts/stress_test_engine.py（重构为 6 套件 30 项）
1. 数据完整性（216 页零白页 + imageRoot 目录 + 隐形字符 0）
2. DOM 钩子（59 ID + 11 类）+ 零内联 JS + JSON 转义可解析
3. 
ode --check 真实语法校验 + 功能全集
4. 行为探针（.b(( 正则无崩溃 / 字号收口 14–36 / 无 	ooZh）
5. CSS 管道（!important = 0、--reader-font-scale、响应式、reduced-motion）
6. JS→HTML 钩子交叉一致性（53 个 ID 全命中）

### 7. 文档
- README.md：修正"TeX 级/Knuth-Plass"表述为浏览器原生词典断行；15px !important 描述改为 CSS 变量管道；更新资产树与新工具指引。

> **结论**：系统已从 70/B− 修复至稳定基线 —— 30/30 断言通过，可进入长期个人使用维护期。

---

## 🌐 多端真实浏览器布局审计（2026-08-09 · v2.1）

> **背景**：v2.0 的 30/30 断言全部基于静态校验与 Python 模拟渲染，未覆盖真实浏览器排版。为回应"大量溢出、多端适配"质疑，引入 **Playwright + 系统 Edge 无头渲染**逐像素几何审计：8 种视口（320/390/412/768/1024/1280/1440/1920）× 7 种状态（portal / reader / view-split / view-en-only / view-zh-only / sidebar-open / popover-open）= 56 组合全量探测。

### 审计工具
- `scripts/browser_layout_audit.js`（仓库内）：函数式 evaluate 探针逐元素比对 `getBoundingClientRect` / `scrollWidth` / `clientWidth` / `scrollLeft`，输出三类信号 —— `H`（水平越界）、`V`（子项逃逸容器）、`T`（可见文本被裁切）；对 fixed 容器、视口外元素、ellipsis 省略文、可滚动容器与折叠态侧栏做科学降噪，避免误报。
- 依赖：`npm i playwright-core`（无需下载浏览器，直接复用系统 Edge：`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`）；离线环境须拦截 `fonts.googleapis/gstatic` 请求。
- **关键教训**：`page.evaluate('()=>…')` 以字符串传参会返回 `undefined` 造成"全绿假象"，必须传函数引用（`page.evaluate(probeFn)`）。

### 真实缺陷清单与修复（逐项实测）

| 编号 | 缺陷（真实渲染复现） | 修复 | 复验 |
| :---: | :--- | :--- | :--- |
| R-1 | **移动端顶栏整体横向溢出**：390px 视口 ROOT `scrollWidth=473 > clientWidth=390`，issue-switcher-pill right=463、more-menu-btn right=473 全部挤出视口；其根因是 `refreshPill()` 用 `textContent` 整写，把"📅 2026年8月刊 • 104P"塞满胶囊，并压垮品牌区 | ① `refreshPill()` 拆分写入 `.issue-pill-full` / `.issue-pill-compact`（紧凑态显示 `📅 2026/08`）；② `.masthead-logo` 加 `text-overflow: ellipsis` + 品牌区 `min-width:0` 可收缩；③ ≤1180px 隐藏 `.more-btn-label`；④ ≤900px `.header-left { flex:1 }` 吸收伸缩；⑤ ≤640px logo 缩至 13px、胶囊 `flex-shrink:1` + 省略 | 8 视口 × 全状态 0 溢出，顶栏全部回归视口内 |
| R-2 | **底部栏 2 列栅格逃逸**：320px 下三子项挤入 2 列 grid，`bottom-right` 被挤压换行仍越出 `.bottom-bar` 底边（此前靠几何推理发现，浏览器实测坐实） | `grid-template-columns: minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)`，≤640px 收窄为 `1fr/1.7fr/1fr`；彻底移除 ≤1180px 残留的 `1fr 1fr` 覆盖 | 320/390/768/1280/1440 各子栏均落在 `.bottom-bar` 盒内 |
| R-3 | **期刊馆卡片标题行挤压**：`.shelf-details-top` 把 期印・标题・摘要・标签 四元素全部塞进一行，768px 下 h3 被压到 0px 宽（不可见），日期标签 166px 不可收缩 | 顶部行改 `flex-wrap: wrap`；h3 `flex: 1 1 120px; min-width: 0` 兜底 120px；`<p>` 摘要与 `.shelf-meta-tags` 设 `flex: 1 1 100%` 独占整行 | 320/768/1024/1280 卡片内部 0 裁切，标题可见 |
| R-4 | 1200px+ 折叠态侧栏内容 300 视觉溢出（探针降噪确认） | 侧栏原始 `overflow: hidden` 即正确——审计探针增加"折叠侧栏子树豁免"，消除 40 条/视口的批量假阳性 | 0 条残留误报 |
| R-5 | 设置抽屉 / 快捷键弹层在 320px 高下内容被判"逃逸" | 探针识别 `overflow-y: auto` 容器并按可滚动处理（真实用户可滚动浏览，非缺陷） | 0 条残留误报 |
| R-6 | **期刊馆首页显示阅读器整套 UI**：portal 可见时顶栏（目录/胶囊/1.0x/更多）、收藏/复制操作条、阅读主区、底部栏（上一页/下一页/滑杆）全部残留 | `.library-portal-view:not(.hidden) ~ .main-layout ~ .bottom-bar, .library-portal-view:not(.hidden) ~ .app-header, .library-portal-view:not(.hidden) ~ .main-layout { display: none }` —— `.main-layout` 内含侧栏+收藏操作条+阅读主区，纯 CSS 状态联动、零 JS 改动；进入阅读室自动恢复 | 8 视口 portal 状态整套阅读器全部隐藏，reader 状态正常显示 |
| R-7 | **移动端顶栏挤压不均**：320px 下品牌被压到 3px、跨期胶囊只剩 20/80px；390px 品牌 47px——各端挤压程度完全不同 | 三级优雅降级：① ≤640px 隐藏整页朗读控件（P 键与胶囊仍可朗读）；② 胶囊 `flex-shrink: 0` 整宽保全（功能性控件优先）；③ ≤359px 隐藏「返回馆」按钮（品牌点击本身即回馆），把宽度让给品牌 | 320px：品牌 61px 可读 + 胶囊 82px 整宽；390px：品牌 77px；768px+：品牌 186px 完整无省略 |
| R-8 | **桌面阅读区左右留白过大 + sans 模式英文仍衬线**：`--max-reader-w` 仅 1060px，1920 视口两侧各空 430px；`.en-text` 基底写死 `var(--font-serif)`，切成 sans 无效 | ① `--max-reader-w` 1060→1260px、split 1720→1900px；② `.en-text` 基底改 `var(--font-sans)`，衬线由 `body.font-mode-serif .en-text` 单独覆盖 | 浏览器实测：1260px 容器；`.en-text` computed font-family=Inter（sans），衬线模式开关正常 |
| R-9 | **移动端缺失「朗读本页」按钮**：≤640px 时整块 `.audio-player-widget` 被隐藏，TTS 入口在手机上彻底消失（P 键盲区） | 改为仅隐藏顶栏 `1.0x` 倍速胶囊（语速调节仍在「更多」菜单内），朗读按钮保留并按 ≤900px 断点降级为 46px 纯图标 | 浏览器实测 320/390px：`#play-page-audio-btn` 46px 可见、顶栏无挤压，全套验证通过 |
| R-10 | **项目结构冗余**：`output/` 历史构建产物（含 104 页图片镜像 + 2 JSON）、根目录 `full_magazine.md` 镜像、一次性报告 `code_review_report.html`、代理缓存 `.workbuddy/`、22 个一次性脚本混在 `scripts/` | ① 删除并 gitignore `output/`、`full_magazine.md`、`code_review_report.html`、`.workbuddy/`；② 22 个一次性/历史脚本移至 `scripts/legacy/`；③ README 目录树重写为「assets/ 唯一真源 + 构建产物」模型 | 213 个文件出库（git rm --cached）；build/audit/stress 全绿；初始文本镜像 `issues/**/full_magazine.md` 完好 |
| R-11 | **移动端「朗读整页」按钮残缺 + 加载转圈/抖动**：① `.audio-btn-text`（含 ▶ 图标+文字的唯一子元素）在 ≤900px 被 `display:none`，按钮空心；② Google Fonts 渲染阻塞——弱网/离线下标签页长时间转圈、字体晚到引发 FOUT 抖动 | ① 按钮拆分 `.audio-btn-icon`（▶/⏸）+ `.audio-btn-text`，JS 改 `querySelector(...).textContent` 双写，仅文字隐藏；② **彻底移除 Google Fonts**（head 中 preconnect/preload/noscript 全部删除），改系统字体栈（`'Inter','PingFang SC','Microsoft YaHei',system-ui` → 本机已装字体才生效），零网络请求、零 FOUT | 390px 实测 46px 按钮 icon=▶ 可见；audit 8 视口 0 溢出；离线下首帧秒开（0 外部请求）；`node --check` + stress 30/30 全绿 |
| R-12 | **移动端倍速胶囊消失**（R-9 为腾宽度将其隐藏到「更多」菜单） | ≤640px 恢复 `#audio-speed-btn-top`，压缩 11.5px/紧凑 padding（320/390 实测 30px 宽），品牌/返回按钮让位 | 320/390/768 实测倍速胶囊可见、整行 0 溢出；audit ALL CLEAN |

### v2.1 最终判定

`node scripts/browser_layout_audit.js` → **ALL CLEAN — 0 issues across all viewports/states**（8 视口 × 7 状态 × 3 类信号 = 56 组全绿）；`stress_test_engine.py` 6 套件 30 项断言全绿；顶栏胶囊三种宽度（320/390/1024 走紧凑版，1440 走完整版）实测渲染文案正确。

> v2.1 定位：v2.0 修复了"逻辑与代码级"缺陷；本轮补齐了"真实渲染级"的最后一块拼图 —— 静态校验永远无法替代的浏览器几何审计已 100% 归零。
