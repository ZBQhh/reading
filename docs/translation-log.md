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
| 1 | 2026-08-09-the-mysterious-art-of-conducting | The Mysterious Art of Conducting | 35 | 1 | 历史 agent | 2026-08-10 | 已翻译+已核对+已注释 | 回填 35 段/1 图注/4 注释 |
| 2 | 2026-08-10-a-culture-war-in-the-bedroom | A Culture War in the Bedroom | 15 | 1 | 历史 agent | 2026-08-10 | 已翻译+已核对+已注释 | 回填 15 段/1 图注/5 注释 |
| 3 | 2026-08-10-are-raccoons-evolving-into-pets | Are Raccoons Evolving Into Pets? | 35 | 1 | 历史 agent | 2026-08-10 | 已翻译+已核对+已注释 | 回填 35 段/1 图注/2 注释 |
| 4 | 2026-08-10-someone-is-mysteriously-snapping-up-used-books-around-the-wo | Someone Is Mysteriously Snapping Up Used Books Around the World | 18 | 1 | 历史 agent | 2026-08-10 | 已翻译+已核对+已注释 | 回填 18 段/1 图注/2 注释 |
| 5 | 2026-08-10-the-color-recession-may-be-permanent | The Color Recession May Be Permanent | 30 | 1 | 历史 agent | 2026-08-10 | 已翻译+已核对+已注释 | 回填 30 段/1 图注/2 注释 |
| 6 | 2026-08-10-the-internet-is-more-image-focused-than-ever | The Internet Is More Image-Focused Than Ever | 172 | 1 | 历史 agent | 2026-08-10 | 已翻译+已核对+已注释 | 回填 172 段/1 图注/2 注释 |
| 7 | 2026-08-10-the-watchdogs-are-barking-themselves-hoarse | The Watchdogs Are Barking Themselves Hoarse | 20 | 1 | 历史 agent | 2026-08-10 | 已翻译+已核对+已注释 | 回填 20 段/1 图注/2 注释 |
| 8 | 2026-08-10-why-i-quit-the-tenure-track | Why I Quit the Tenure Track | 108 | 1 | 历史 agent | 2026-08-10 | 已翻译+已核对+已注释 | 回填 108 段/1 图注/2 注释 |
| 9 | 2026-08-20-a-time-for-female-monsters | A Time for Female Monsters | 13 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Atlantic：女性主义文艺批评，回填 13 段/1 图注/2 注释 |
| 10 | 2026-08-20-are-you-sure-you-want-a-car-with-a-giant-touch-screen | Are You Sure You Want a Car With a Giant Touch Screen? | 12 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Atlantic：汽车大屏安全争议，回填 12 段/1 图注/2 注释 |
| 11 | 2026-08-20-the-case-for-chilling-out-about-birth-rates | The Case for Chilling Out About Birth Rates | 16 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Atlantic：人口出生率辩析，回填 16 段/1 图注/2 注释 |
| 12 | 2026-08-20-the-resistance-is-over | The ‘Resistance’ Is Over | 15 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Atlantic：美国自由派政治反思，回填 15 段/1 图注/3 注释 |
| 13 | 2026-08-20-why-the-closing-of-harvard-s-writing-center-matters | Why the Closing of Harvard’s Writing Center Matters | 11 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Atlantic：哈佛写作中心裁撤反思，回填 11 段/1 图注/2 注释 |
| 14 | 2026-08-20-bernie-sanders-takes-on-data-centers | Bernie Sanders Takes on Data Centers | 7 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The New Yorker：桑德斯调查 AI 算力中心能耗，回填 7 段/1 图注/2 注释 |
| 15 | 2026-08-20-dreams-in-nightmares-turns-the-art-life-political | “Dreams in Nightmares” Turns the Art Life Political | 10 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The New Yorker：独立电影美学与政治，回填 10 段/1 图注/2 注释 |
| 16 | 2026-08-20-the-glorious-disorder-of-michael-ondaatje-s-early-work | The Glorious Disorder of Michael Ondaatje’s Early Work | 16 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The New Yorker：翁达杰早期文学评述，回填 16 段/1 图注/3 注释 |
| 17 | 2026-08-20-the-mark-of-the-machine | The Mark of the Machine | 10 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The New Yorker：算法时代人性与机器笔触，回填 10 段/1 图注/2 注释 |
| 18 | 2026-08-20-the-real-meaning-of-the-jason-arday-scandal | The Real Meaning of the Jason Arday Scandal | 14 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The New Yorker：剑桥大学杰森·阿戴学术丑闻深度分析，回填 14 段/1 图注/2 注释 |
| 19 | 2026-08-20-after-hating-my-first-digital-wall-calendar-it-s-now-my-fav | After Hating My First Digital Wall Calendar, It’s Now My Favorite Gadget | 39 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | Wired：智能壁挂日历生活体验，回填 39 段/1 图注/2 注释 |
| 20 | 2026-08-20-coders-say-they-already-found-workarounds-to-claude-s-invisi | Coders Say They Already Found Workarounds to Claude’s Invisible Watermarks | 13 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | Wired：Claude 隐形水印破解与版权博弈，回填 13 段/1 图注/2 注释 |
| 21 | 2026-08-20-elon-musk-is-expected-to-point-his-money-machine-at-texas-po | Elon Musk Is Expected to Point His Money Machine at Texas Politics | 14 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | Wired：马斯克在得州的政治金权布局，回填 14 段/1 图注/2 注释 |
| 22 | 2026-08-20-i-saw-the-future-of-ai-in-a-robot-that-can-learn-on-the-spot | I Saw the Future of AI in a Robot That Can Learn on the Spot | 17 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | Wired：具身智能人形机器人现场学习，回填 17 段/1 图注/2 注释 |
| 23 | 2026-08-20-we-bought-a-500-counterfeit-rolex-so-good-even-rolex-didn | We Bought a $500 Counterfeit Rolex So Good, Even Rolex Didn’t Spot It | 56 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | Wired：顶级复刻劳力士工业调查，回填 56 段/1 图注/2 注释 |
| 24 | 2026-08-20-how-to-study-antarctic-ice-without-blowing-it-up | How to study Antarctic ice without blowing it up | 6 | 0 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Economist：南极冰盖非破坏性震源勘探，回填 6 段/0 图注/2 注释 |
| 25 | 2026-08-20-in-praise-of-designer-ish-babies | In praise of designer-ish babies | 4 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Economist：胚胎基因筛选与优生辩论，回填 4 段/1 图注/2 注释 |
| 26 | 2026-08-20-jason-arday-was-treated-as-a-symbol-not-a-man | Jason Arday was treated as a symbol, not a man | 4 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Economist：阿戴事件与制度性象征主义评析，回填 4 段/1 图注/2 注释 |
| 27 | 2026-08-20-rock-solid-evidence-for-the-origins-of-birds | Rock-solid evidence for the origins of birds | 3 | 1 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Economist：热河生物群带羽恐龙演化新证，回填 3 段/1 图注/2 注释 |
| 28 | 2026-08-20-why-bond-markets-are-unnerving-rich-world-politicians | Why bond markets are unnerving rich-world politicians | 6 | 0 | 当前 agent | 2026-08-20 | 已翻译+已核对+已注释 | The Economist：发达国家国债收益率与财政风险，回填 6 段/0 图注/2 注释 |

> 批量翻译批次（2026-08-20）：自选文库全量 28 篇（8 篇历史 + 20 篇新增）全部完成 100% 翻译、通读核对与时代背景/语言双关注释回填。
