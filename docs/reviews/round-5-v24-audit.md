# The Atlantic Reader v2.4 · 跟进终评
## 以顶尖个人项目为基准线的毒舌锐评（"现在呢"版）

> **评测对象**：v2.4.0（`reader_app.js` 2095 行 / `reader_style.css` 45.4KB / WebP 图档）
> **对照基线**：`FINAL_SHARP_REVIEW.md`（v2.1，84 分）的修复路线图
> **评测方式**：不只看"修了什么"，更核验"修到位没有"——逐项实测，拒绝纸面合规
> **日期**：2026-08-09

---

## 〇、总评

**这是我评审过的修复执行力最强的个人项目——没有之一。** 四轮迭代（v1.0→v2.4），我的 `FINAL_SHARP_REVIEW` 路线图被近乎全量攻克：WebP 图片管线、自托管字体、选文高亮、生词本、跨设备同步、LICENSE、CHANGELOG、git 纪律……甚至主动加了我没要求的功能。

但正因为它执行力强，我更要用放大镜找"**形式合规、实质无效**"的裂缝。这轮我找到了——而且最讽刺的一条，恰恰是作者**听从我的建议加上、却加完从未验证**的那个。

| 维度 | 得分 | 变化 | 一句话判定 |
|:-----|:----:|:----:|:-----------|
| 一·代码架构与工程化 | 13.5 / 20 | ▼ | **巨石恶化至 2095 行**，唯一被建议却坚决未拆的项 |
| 二·功能完整性与边界处理 | 14.5 / 15 | ▲ | 高亮/生词本/同步/导出/手势全补齐，功能最全 |
| 三·UI/UX 设计与交互 | 13.5 / 15 | ▲ | 自托管字体+双卡层级+触屏优化，出版级质感 |
| 四·性能表现与优化 | 13.5 / 15 | ▲▲ | WebP 解决最大硬伤（240MB→42.7MB） |
| 五·可维护性与代码规范 | 10.5 / 15 | ▲ | **ESLint 是跑不通的摆设**、无 package.json，但 JSDoc/功能测试到位 |
| 六·文档与项目呈现 | 9.0 / 10 | ▲▲ | README+CHANGELOG+LICENSE+git 纪律全部补齐 |
| 七·创新性与差异化 | 9.0 / 10 | ▲▲ | 从"展示器"进化为"知识工具" |
| **综合总分** | **87.0 / 100（A−）** | 84→87 | 修复力顶级，但"形式合规"裂缝开始显现 |

> **一句话**：它已经跨过"能用"和"好用"，摸到"想用"的门槛了。但要警惕——**当修复从"解决问题"滑向"打勾销项"，形式合规的裂缝就会出现。ESLint 摆设就是警报。**

---

## 一、先记功：v2.1→v2.4 攻克了什么

对照我的路线图，逐项实测确认（非纸面采信）：

| 路线项 | 状态 | 实测证据 |
|:-------|:----:|:---------|
| **git 提交纪律** | ✅ 根治 | 工作区 0 未提交，最新提交 15:05，v2.1 的 251 个飘移文件已兜底 |
| **LICENSE** | ✅ 根治 | MIT，1081 字节，真实存在 |
| **CHANGELOG** | ✅ 超预期 | 遵循 Keep a Changelog 规范，分版本记录到 2.4.0 |
| **WebP 图片管线** | ✅ 超预期 | 216 张 255.7MB → 42.7MB（17%），git 只跟踪 WebP，PNG 归档 `scans-png` 分支 |
| **fetch 缓存** | ✅ 根治 | `force-cache` → `no-cache`（L1959 协商缓存） |
| **reader.html 重复** | ✅ 根治 | 2.76MB → 572 字节 `<meta refresh>` 跳转 stub |
| **自托管字体** | ✅ 超预期 | NewCM08/10 + 思源宋体 SC 子集化，6 个 woff2 共 2.8MB，`@font-face` 全离线 |
| **选文高亮** | ✅ 新增 | `selectionchange` 捕获 + `LS.highlights` 持久化 + 中英双通道 + E 键 + 触屏选文 |
| **生词本** | ✅ 新增 | L 键，发音 TTS/跳回原页/导出 Markdown/单条删除，附原句语境 |
| **跨设备同步** | ✅ 新增 | 书签/高亮/生词/足迹/设置一键导出导入 JSON |
| **导出 Markdown** | ✅ 新增 | 当前页/当前期导出，含高亮标注 |
| **ESLint + Prettier** | ⚠️ **形式合规** | 文件存在，但**跑不通**（见 2.1） |
| **JSDoc typedef** | ✅ 根治 | `Segment`/`Page`/`Issue` 顶层注解 |
| **功能冒烟测试** | ✅ 新增 | `functional_smoke.js` playwright 实测书签/翻页/高亮持久化 |
| **根目录整理** | ✅ 根治 | 删除根级 JS/CSS 副本，唯一真源 `assets/` |

**16 项路线，14 项根治或超预期，1 项形式合规，1 项未做（模块化拆分）。** 这个完成度，绝大多数付费工程师做不到。

---

## 二、毒舌时间：形式合规的裂缝

### 2.1 🔴 ESLint 是跑不通的摆设——最讽刺的一条

**实测**（这不是推测，是我跑了）：
```
$ npx eslint assets/js/reader_app.js
Oops! Something went wrong! :(
ESLint: 10.8.1
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
From ESLint v9.0.0, the default configuration file is now eslint.config.js.
```

**问题**：作者加了 `.eslintrc.json`（17 条规则，CHANGELOG 记为成绩），但用的是**旧版 eslintrc 格式**。ESLint 9+ 起默认改用 flat config（`eslint.config.js`），到 ESLint 10 彻底不识别 `.eslintrc.json`。结果——**这 17 条规则从未真正拦截过任何一行代码**。`no-const-assign` 配了，但如果今天再写出一个 Bug A，它依然不会报警。

**为什么这是最讽刺的**：我上一轮说"开了 strict 没配 ESLint 是装了防盗门没锁"，作者就去配了——但**配完没跑过一次**。防盗门的钥匙插上去了，门却还是没锁，因为钥匙不对锁。这就是"打勾销项"和"解决问题"的区别。

**对标差距**：Linear/Obsidian 的 lint 是 CI 里必跑、pre-commit 必拦的。配置存在的意义是**被执行**，不是被 git 跟踪。

**改进方向**（5 分钟）：
```javascript
// eslint.config.js（flat config，ESLint 9+ 原生格式）
export default [{
  languageOptions: { ecmaVersion: 2020, sourceType: 'script', globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', location: 'readonly' } },
  rules: { 'no-const-assign': 'error', 'no-undef': 'error', 'no-unused-vars': 'warn', 'eqeqeq': 'warn' }
}];
```
跑一次 `npx eslint assets/js/reader_app.js`，**亲眼看到 0 errors 才算修完**。

### 2.2 🔴 没有 package.json——2.1 的根源

**问题**：项目根目录至今无 `package.json`。ESLint、Prettier、playwright-core 全靠 `npx` 临时下载**最新版**——所以 eslint 拉到 10.8.1，直接撞死旧配置（2.1 的直接原因）。没有版本锁定，意味着：
- 今天能跑的环境，明天 eslint 11 出来就崩
- 换台机器，所有人拿到不同版本的工具
- `functional_smoke.js`、`browser_layout_audit.js`、`build_fonts.py` 是**孤儿脚本**——没有 `npm test`/`npm run audit` 统一入口，新贡献者（或三个月后的作者自己）根本不知道要跑什么

**对标差距**：任何一个严肃项目都有 `package.json` 定义 `devDependencies` 版本 + `scripts` 入口。这是 Node 生态的地基，不是可选项。

**改进方向**（10 分钟）：
```json
{
  "name": "atlantic-reader", "private": true, "version": "2.4.0",
  "scripts": {
    "lint": "eslint assets/js/",
    "test": "python scripts/stress_test_engine.py",
    "smoke": "node scripts/functional_smoke.js",
    "audit": "node scripts/browser_layout_audit.js",
    "build": "python scripts/build_master_portal.py"
  },
  "devDependencies": { "eslint": "^9.0.0", "playwright-core": "^1.4x" }
}
```
锁定版本 + 统一入口，工具链才从"摆设"变"资产"。

### 2.3 🟡 巨石恶化：唯一被建议却坚决未拆的项

**问题**：`reader_app.js` 从 v2.1 的 1400 行涨到 **2095 行**，0 个 `import`/`export`。高亮、生词本、跨设备同步、导出……全塞进同一个 IIFE。我两轮前建议"拆 6-7 个 ES Module"，这是路线图上**唯一被明确点名却一行未动**的项。

**为什么这比看起来严重**：巨石不是因为行数多难看，而是**功能越加，风险越高**。2095 行里，高亮逻辑和 TTS 逻辑和搜索逻辑共享 17 个可变状态——改高亮时一个手滑就可能碰坏 TTS。Bug A（const 赋值）正是这种"高密度耦合"的产物。现在 ESLint 又是摆设（2.1），巨石里再长出 Bug，没有任何网兜接住。

**讽刺之处**：作者能把 PDF 重构成出版级排版、能写浏览器布局审计、能子集化字体——却不愿拆文件。**这不是能力问题，是认知问题**：把"零依赖"误解为"零模块"。浏览器原生 `<script type="module">` 就是零依赖的模块化。

**改进方向**：不必一次拆完。先把**生词本 + 高亮**（最新、最独立的功能）抽成 `wordbook.js` + `highlight.js` 两个模块，`main.js` 里 `import`。验证可行后再逐步拆。第一步永远是证明"模块能跑"。

### 2.4 🟡 测试假绿：断言数 30 → 25，覆盖盲区扩大

**实测**：stress_test 复跑 `25 passed / 0 failed`——但 v2.1 是 **30** 断言。TEST 6 的 "JS-$ 引用 DOM 挂钩"从 **53 个掉到 5 个**。

**根因**：v2.1 引入 `ELS_BY_ID` 声明式映射后，`$()` 调用集中进了 `forEach` 循环（`Object.keys(ELS_BY_ID).forEach(k => els[k] = $(ELS_BY_ID[k]))`），而测试的正则 `\$\('([^']+)'\)` 只匹配**字面量** `$('xxx')`，匹配不到变量 `$('ELS_BY_ID[k]')`。结果：**测试为了"全绿"，实际测得更少了**。53 个 DOM 挂钩的存在性验证，现在只剩 5 个。

**这是典型的"测试适应代码而非约束代码"**——重构让测试失效，没人发现，因为"全绿"看起来很美。

**改进方向**：TEST 6 改读 `ELS_BY_ID` 的值集合（正则匹配 `'[^']+'` 于映射表内），或干脆用 playwright 断言每个 id 真实存在于 DOM。

### 2.5 🟡 滑动手势仍是"原始物理"

**问题**：L1721 仍是 `Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2`。v2.4 修了"选文被翻页吞掉"的冲突（值得肯定），但手势本身：
- **无速度检测**：慢吞吞滑 61px 也翻页，Kindle 的"快速甩动才翻"的爽感没有
- **无跟随反馈**：滑动中页面纹丝不动，松手瞬间硬跳
- **无回弹动画**：不到位时无过渡

**对标差距**：Readwise Reader / Apple Books 的滑动有位移跟随 + velocity 阈值 + 回弹。本项目停留在"能触发"，未到"有手感"。

### 2.6 ⚪ VERSION 漂移

**问题**：JS L71 `VERSION = '2.3.0'`，但 CHANGELOG 已记到 `2.4.0`。快捷键速查面板显示的版本落后于实际。小事，但反映"版本号靠手改"而非构建注入。

**改进方向**：`build_master_portal.py` 构建时从 CHANGELOG 顶部版本号注入 `window.BUILD_VERSION`，单一事实源。

---

## 三、公正对比：v2.4 vs 顶尖个人项目

| 维度 | 顶尖基准 | v2.4 现状 | 判定 |
|:-----|:---------|:----------|:----:|
| 模块化 | ES Modules 拆分 | 2095 行单 IIFE | ❌ 未达标 |
| 类型安全 | TS / JSDoc | JSDoc typedef 顶层注解 | 🟡 起步 |
| Lint 生效 | CI 必跑 | **配置文件跑不通** | ❌ 摆设 |
| 依赖管理 | package.json 锁版本 | **无 package.json** | ❌ 缺失 |
| 图片优化 | WebP/AVIF + lazy | WebP 17% 体积 + lazy | ✅ 达标 |
| 字体策略 | 自托管 woff2 子集 | NewCM+思源宋体子集 | ✅ 超预期 |
| 功能测试 | 单元+集成+E2E | 静态断言+功能冒烟+布局审计 | 🟡 良好 |
| 文档 | README+CHANGELOG+LICENSE | 三者齐备且规范 | ✅ 达标 |
| 版本控制 | 小步快跑勤提交 | 已恢复纪律 | ✅ 达标 |
| 知识闭环 | 高亮+笔记+同步 | 高亮+生词本+同步+导出 | ✅ 超预期 |
| 手势质感 | 速度+跟随+回弹 | 仅阈值触发 | 🟡 及格 |

**结论**：11 项对标，6 项达标或超预期，3 项起步/及格，**2 项未达标（模块化、依赖管理），1 项摆设（Lint）**。

---

## 四、终审总评

### 这个项目的真实画像（v2.4）

- **修复执行力：S 级**——四轮 40+ 缺陷清零，把毒舌评审当 TODO 逐条攻克，还主动超预期
- **产品意识：A 级**——从"展示器"进化到"知识工具"（高亮/生词本/同步/导出），这一步很多项目永远迈不出
- **排版与工程品味：A− 级**——双卡层级、自托管字体、浏览器审计、Keep a Changelog
- **工程完备性：B 级**——被"ESLint 摆设 + 无 package.json + 巨石未拆"拖住
- **测试严谨性：B− 级**——有功能冒烟是加分，但断言数倒退暴露"假绿"风险

### 一句话

**v2.4 已经把"能被指出的问题"修得差不多了。接下来挡住它的，是那些"看起来修了、实则没到位"的裂缝**——ESLint 摆设、无 package.json、测试假绿、巨石未拆。这些不再是"代码对不对"，而是"工程真不真"。

### 通往 92+ 的精准路线（这次只有 4 条，都不难）

```text
1. ESLint 真生效（10 分钟）
   .eslintrc.json → eslint.config.js（flat 格式），npx eslint 亲见 0 errors

2. 补 package.json（10 分钟）
   devDependencies 锁版本 + scripts 统一入口（lint/test/smoke/audit/build）

3. 拆第一个模块（30 分钟）
   生词本 + 高亮抽成 wordbook.js/highlight.js，main.js import——证明模块能跑

4. 修测试假绿（15 分钟）
   TEST 6 改读 ELS_BY_ID 值集合，断言数回到 53
```

**前三条做完，巨石开始瓦解、工具链真正生效，分数到 92。第四条是让"全绿"重新可信。**

---

## 五、评分轨迹（全程回顾）

```
v1.0   70.0  B−   排版美学优秀，P0 三处阻塞
v2.0   82.0  B+   P0 全修，但引入 Bug A/B
v2.1   84.0  B+   18 项毒舌修复，外围基建被低估
v2.4   87.0  A−   路线图近乎全克，但现"形式合规"裂缝
```

**趋势是对的，斜率是陡的。** 唯一的风险信号：从 v2.4 开始，问题从"显性 Bug"转向"隐性裂缝"（摆设配置、假绿测试、巨石债）。这类问题不会被用户骂，只会在某个深夜让作者自己踩坑。

**修复力已封神。要登顶，需要的不是修得更快，而是验得更真。**

---

> **评测声明**：本报告所有"毒舌"均经实测验真——ESLint 无效是 `npx eslint` 跑出来的报错，断言数倒退是 stress_test 复跑的真实输出，巨石行数是 `wc -l` 的实测。不采信纸面声明，只采信可复现的证据。承认 16 项路线修复在前，指出 4 条裂缝在后——公正不是各打五十大板，是该记的功记满，该挑的刺挑穿。
