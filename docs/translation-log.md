# 自选文章翻译工作日志（translation-log）

> **用途**：记录每一次 agent 对「自选文章」（manual / markdown 来源）的翻译工作范围与核对情况。
> **核心原则**：每次只翻译/核对**本次新增或改动**的文章，不重复核对历史已核验文章，避免重复劳动。
> 工作流总览见 [`AGENTS.md`](AGENTS.md) §4（自选文章）与 §4.3（译文侧车）。

---

## 一、翻译工作流（每次 agent 必读）

1. **取英文原文**：运行 `npm run build:md` 从数据源 `D:\Desktop\reading\reading data\TheAtlantic` 生成
   `manual_issues.json`（构建产物，已 gitignore）。每篇文章的段落英文在
   `manual_issues.json[<issueId>].pages[0].segments[]` 中：
   - `type:"paragraph"` 的 `en` 字段 → 按顺序进入译文侧的 `paragraphs` 数组；
   - `type:"embedded"` 的 `caption` 字段 → 按顺序进入 `captions` 数组（图注）。
2. **写译文侧车**：在 `manual_translations/<slug>.zh.json` 写入
   ```json
   { "paragraphs": ["第1段中文…", "…"], "captions": ["第1张图注中文…"] }
   ```
   - `<slug>` = 文件名 slugify（**保留日期前缀、下划线转连字符**，如
     `2026-08-10_A_Culture_War_in_the_Bedroom.md` → `2026-08-10-a-culture-war-in-the-bedroom`），
     **不带** `md-` 前缀（issueId 才是 `md-<slug>`）。
   - **顺序必须严格对应** manual_issues.json 的 segments：先 paragraph 后 embedded 各自按出现顺序，
     不要按文章视觉顺序硬排。可用下方命令抽取核对：
     ```bash
     python -c "import json;d=json.load(open('manual_issues.json',encoding='utf-8'));s=d['md-<slug>']['pages'][0]['segments'];print([x.get('en') or x.get('caption') for x in s])"
     ```
3. **回填**：写完侧车后运行 `npm run build:md`（脚本的 `apply_translation` 会按段落/图注顺序回填 `zh`）。
4. **翻译质量要求**：
   - 通顺流畅、语义准确；不增删原意、不改变段落数。
   - 专有名词（人名、刊名、作品名、术语）保留英文或采用通用中文译名，首次出现可附原文。
   - 文学性/评论性文本注意语气与修辞的对应，避免机翻腔。
5. **核对范围**：本批次只核对**本次新增/修改**的文章；历史状态表中标记为「已核对」的文章**不再重复核对**。
6. **登记**：在下方「状态表」为本次每篇文章追加/更新一行（slug、标题、段数、图注数、译者、日期、核对状态、备注）。
7. **提交**：`npm run build` + `npm run smoke` 通过后，用 SafeGit 推送（见 AGENTS.md §11）。

---

## 二、状态表（每次 agent 追加/更新）

| # | slug | 标题 | 段数 | 图注 | 译者 | 日期 | 核对状态 | 备注 |
|---|------|------|-----|------|------|------|----------|------|
| 1 | 2026-08-09-the-mysterious-art-of-conducting | The Mysterious Art of Conducting | 35 | 1 | 历史 agent | 2026-08-10 | 已核对 | 历史译文本轮统一通读核对，流畅度 OK；build 回填 35 段/1 图注 |
| 2 | 2026-08-10-a-culture-war-in-the-bedroom | A Culture War in the Bedroom | 15 | 1 | 当前 agent | 2026-08-10 | 已翻译+已核对 | 全文翻译并通读核对 |
| 3 | 2026-08-10-are-raccoons-evolving-into-pets | Are Raccoons Evolving Into Pets? | 35 | 1 | 当前 agent | 2026-08-10 | 已翻译+已核对 | 全文翻译并通读核对 |
| 4 | 2026-08-10-someone-is-mysteriously-snapping-up-used-books-around-the-wo | Someone Is Mysteriously Snapping Up Used Books Around the World | 18 | 1 | 当前 agent | 2026-08-10 | 已翻译+已核对 | 全文翻译并通读核对 |
| 5 | 2026-08-10-the-color-recession-may-be-permanent | The Color Recession May Be Permanent | 30 | 1 | 当前 agent | 2026-08-10 | 已翻译+已核对 | 全文翻译并通读核对 |
| 6 | 2026-08-10-the-internet-is-more-image-focused-than-ever | The Internet Is More Image-Focused Than Ever | 172 | 1 | 当前 agent | 2026-08-10 | 已翻译+已核对 | 全文翻译（播客文字稿，含对话署名）并通读核对 |
| 7 | 2026-08-10-the-watchdogs-are-barking-themselves-hoarse | The Watchdogs Are Barking Themselves Hoarse | 20 | 1 | 当前 agent | 2026-08-10 | 已翻译+已核对 | 全文翻译并通读核对 |
| 8 | 2026-08-10-why-i-quit-the-tenure-track | Why I Quit the Tenure Track | 108 | 1 | 当前 agent | 2026-08-10 | 已翻译+已核对 | 全文翻译并通读核对 |

> 段数/图注数以 `manual_issues.json` 实际 segments 为准（build:md 生成）。
> 批量翻译批次（2026-08-10）：8 篇全部完成翻译与通读核对，`npm run build` 回填成功（35+15+35+18+30+172+20+108 段）。
> 后续新增文章：先在表中插入行（状态「未翻译」），翻译后更新为「已翻译+已核对」，且只核对本轮新增/改动篇目。
