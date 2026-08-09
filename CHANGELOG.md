# Changelog

本项目的历次版本变更记录。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

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