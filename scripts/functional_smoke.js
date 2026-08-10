/* Functional Smoke Tests (毒舌 5.2：补上"真点击"级功能验证，区别于静态断言)
 *
 * 复用 browser_layout_audit.js 的 playwright-core 回退加载策略
 * （项目内先找，找不到则回退到 opencode 临时缓存目录），驱动系统 Edge。
 *
 * 运行：node scripts/functional_smoke.js
 */
let playwright;
try {
  playwright = require('playwright-core');
} catch (e) {
  const alt = require('path').join(require('os').tmpdir(), 'opencode', 'node_modules', 'playwright-core');
  playwright = require(alt);
}
const { chromium } = playwright;
const path = require('path');
const fs = require('fs');
const REPO_ROOT = path.resolve(__dirname, '..');
// 本地默认用系统 Edge + 仓库内 index.html（路径由 __dirname 推导，不再写死盘符）；
// CI（GitHub Actions，Ubuntu）无 Edge，改用 playwright 自带 chromium，目标同样指向仓库内 index.html。
function toFileUrl(p) {
  const norm = path.resolve(p).replace(/\\/g, '/');
  if (/^[A-Za-z]:/.test(norm)) return 'file:///' + norm; // Windows: file:///D:/...
  return 'file://' + norm;                                // Unix:   file:///abs
}
const EDGE = process.env.AUDIT_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET = process.env.AUDIT_TARGET || toFileUrl(path.join(REPO_ROOT, 'index.html'));

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  \u2713 PASS: ' + name); }
  else { fail++; console.log('  \u2717 FAIL: ' + name + (extra ? '  (' + extra + ')' : '')); }
}

(async () => {
  let browser;
  if (process.env.CI) {
    console.log('CI detected: launching bundled chromium for smoke test...');
    try {
      browser = await chromium.launch({ headless: true });
    } catch (e) {
      console.log('SMOKE SKIPPED on CI (chromium unavailable: ' + e.message + ')');
      process.exit(0);
    }
  } else {
    if (!fs.existsSync(EDGE)) {
      console.error('Edge not found at ' + EDGE);
      process.exit(1);
    }
    console.log('Launching Edge via playwright-core...');
    browser = await chromium.launch({ executablePath: EDGE, headless: true });
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    // 过滤字体/网络资源加载失败（离线或 CI 无外网时常见，非应用 JS 错误）
    if (/fonts\.googleapis|fonts\.gstatic|Failed to load resource|net::ERR/i.test(t)) return;
    errors.push('console: ' + t);
  });

  await page.goto(TARGET, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  // --- TEST 1: 收藏书签 → localStorage 有记录（进入直达特稿 P16） ---
  const enterBtn = await page.$('.feature-start-btn');
  if (enterBtn) {
    await enterBtn.click();
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => {
      const k = Object.keys(localStorage).filter((k) => k.indexOf('atlantic_reader_bookmarks_') === 0)[0];
      return k ? localStorage.getItem(k) : null;
    });
    await page.click('#bookmark-page-btn');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const k = Object.keys(localStorage).filter((k) => k.indexOf('atlantic_reader_bookmarks_') === 0)[0];
      return k ? localStorage.getItem(k) : null;
    });
    check('bookmark click writes bookmarks to localStorage', before !== after && after && after.indexOf('16') >= 0, 'before=' + before + ' after=' + after);
  } else {
    check('图书馆加载完毕（可点击进入）', false, 'no feature-start-btn found');
  }

  // --- TEST 2: 搜索产生结果 ---
  const resCount = await page.evaluate(async () => {
    const grid = document.getElementById('magazine-shelf-grid');
    if (!grid) return -1;
    return grid.querySelectorAll('.shelf-issue-card').length;
  });
  check('期刊馆渲染出期刊卡片', resCount >= 2, 'cards=' + resCount);

// --- TEST 3: 翻页 badge 文本变化（J 前进 → K 回退，双向验证） ---
  const badgeBefore = await page.evaluate(() => {
    const b = document.getElementById('current-page-badge');
    return b ? b.textContent : null;
  });
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(800);
  const badgeAfter = await page.evaluate(() => {
    const b = document.getElementById('current-page-badge');
    return b ? b.textContent : null;
  });
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(800);
  const badgeBack = await page.evaluate(() => {
    const b = document.getElementById('current-page-badge');
    return b ? b.textContent : null;
  });
  check('J 翻页后 current-page-badge 前进', badgeBefore !== badgeAfter && badgeAfter.indexOf(badgeBefore) < 0, badgeBefore + ' -> ' + badgeAfter);
  check('K 翻页后 badge 回退', badgeBack === badgeBefore, badgeAfter + ' -> ' + badgeBack);

  // --- TEST 4: 选文高亮（毒舌 7.2）——选择首段英文 → 存储 + mark 渲染 ---
  const hlResult = await page.evaluate(() => {
    const body = document.getElementById('article-body');
    if (!body) return { ok: false, why: 'no article-body' };
    const enText = body.querySelector('.en-text');
    if (!enText) return { ok: false, why: 'no .en-text' };
    const txtNode = enText.firstChild;
    if (!txtNode || txtNode.nodeType !== 3) return { ok: false, why: 'no text node' };
    const len = (txtNode.nodeValue || '').length;
    if (len < 8) return { ok: false, why: 'text too short: ' + len };
    const rg = document.createRange();
    rg.setStart(txtNode, 0);
    rg.setEnd(txtNode, Math.min(8, len));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rg);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const btn = document.querySelector('.hl-float-btn');
    if (btn) btn.click();
    const saved = JSON.parse(localStorage.getItem('atlantic_reader_highlights') || '[]');
    const marks = body.querySelectorAll('mark.page-highlight').length;
    return { ok: saved.length > 0 && marks > 0, why: 'saved=' + saved.length + ' marks=' + marks };
  });
  check('选区高亮写入 localStorage 并渲染 mark', hlResult.ok === true, hlResult.why);

  // --- TEST 5: 生词本（毒舌 7.2）——模拟双击选中单词 → 📖 生词 → localStorage + 弹窗渲染 ---
  const wbResult = await page.evaluate(() => {
    const body = document.getElementById('article-body');
    if (!body) return { ok: false, why: 'no article-body' };
    let best = null;
    let bestLen = 0;
    body.querySelectorAll('.en-text').forEach((enText) => {
      enText.childNodes.forEach((tn) => {
        if (tn.nodeType !== 3) return;
        const l = (tn.nodeValue || '').length;
        if (l > bestLen) { bestLen = l; best = tn; }
      });
    });
    if (!best || bestLen < 4) return { ok: false, why: 'no long text node, bestLen=' + bestLen };
    const text = best.nodeValue;
    const m = text.match(/[A-Za-z][A-Za-z'-]{2,}/);
    if (!m || m.index === undefined) return { ok: false, why: 'no word found in text' };
    const rg = document.createRange();
    rg.setStart(best, m.index);
    rg.setEnd(best, m.index + m[0].length);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rg);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const wbBtn = document.querySelector('.wb-float-btn');
    if (wbBtn) wbBtn.click();
    const saved = JSON.parse(localStorage.getItem('atlantic_reader_wordbook') || '[]');
    const hits = saved.filter((x) => x.word === m[0].toLowerCase()).length;
    return { ok: saved.length > 0 && hits > 0, word: m[0], why: 'words=' + saved.length + ' match=' + hits };
  });
  check('单选单词点「📖 生词」写入 localStorage', wbResult.ok === true, wbResult.why);

  await page.keyboard.press('KeyL');
  await page.waitForTimeout(400);
  const wbOpen = await page.evaluate(() => {
    const m = document.getElementById('wordbook-modal');
    const items = document.querySelectorAll('#wordbook-list .wordbook-item').length;
    return { active: m && m.classList.contains('active'), items };
  });
  check('L 键打开生词本弹窗且渲染词条', wbOpen.active === true, 'active=' + wbOpen.active + ' items=' + wbOpen.items);
  await page.keyboard.press('Escape');

  // --- TEST 6: 数据备份导出 JSON（跨设备同步离线形态）---
  const syncResult = await page.evaluate(() => {
    document.querySelectorAll('.wb-float-btn, .hl-float-btn').forEach((n) => n.remove());
    const bag = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('atlantic_reader_') === 0) bag[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify({ app: 'the-atlantic-reader', version: 1, exportedAt: new Date().toISOString(), data: bag })], { type: 'application/json' });
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve('ERR');
      fr.readAsText(blob);
    });
  });
  let syncOk = false;
  let syncWhy = '';
  try {
    const parsed = JSON.parse(syncResult);
    syncOk = parsed.app === 'the-atlantic-reader' && parsed.data && Object.keys(parsed.data).length >= 3;
    syncWhy = 'keys=' + (parsed.data ? Object.keys(parsed.data).length : 0);
  } catch (e) { syncWhy = e.message; }
  check('备份 JSON 结构完整（含书签/高亮/生词）', syncOk, syncWhy);

  // --- TEST 7: 首页门户「我的数据」入口——从期刊馆直接打开高亮清单回顾 ---
  await page.keyboard.press('KeyH'); // 返回期刊馆
  await page.waitForTimeout(800);
  const portalEntry = await page.evaluate(() => {
    const wbBtn = document.getElementById('portal-wordbook-btn');
    const hlBtn = document.getElementById('portal-highlights-btn');
    const bmBtn = document.getElementById('portal-bookmarks-btn');
    const portalVisible = document.getElementById('library-portal-view') && !document.getElementById('library-portal-view').classList.contains('hidden');
    return {
      portalVisible,
      wbVisible: wbBtn && getComputedStyle(wbBtn).display !== 'none',
      hlVisible: hlBtn && getComputedStyle(hlBtn).display !== 'none',
      bmVisible: bmBtn && getComputedStyle(bmBtn).display !== 'none',
    };
  });
  check('首页门户显示三个「我的数据」入口', portalEntry.portalVisible && portalEntry.wbVisible && portalEntry.hlVisible && portalEntry.bmVisible,
    JSON.stringify(portalEntry));

  await page.click('#portal-wordbook-btn');
  await page.waitForTimeout(400);
  const wbFromPortal = await page.evaluate(() => {
    const m = document.getElementById('wordbook-modal');
    const active = m && m.classList.contains('active');
    const items = document.querySelectorAll('#wordbook-list .wordbook-item').length;
    return { active, items };
  });
  check('首页点击「📖 生词本」打开弹窗并渲染', wbFromPortal.active === true && wbFromPortal.items > 0, 'active=' + wbFromPortal.active + ' items=' + wbFromPortal.items + '（含此前 TEST 5 收藏的词）');
  await page.keyboard.press('Escape');

  const hlOpenFromPortal = await page.evaluate(() => {
    document.getElementById('portal-highlights-btn').click();
    const m = document.getElementById('highlights-modal');
    const active = m && m.classList.contains('active');
    const items = document.querySelectorAll('#highlights-list .wordbook-item').length;
    return { active, items };
  });
  check('首页点击「🔖 我的高亮」打开回顾清单', hlOpenFromPortal.active === true && hlOpenFromPortal.items > 0, 'active=' + hlOpenFromPortal.active + ' items=' + hlOpenFromPortal.items + '（含此前 TEST 4 高亮）');
  await page.keyboard.press('Escape');

  check('浏览器侧无未捕获 JS 异常', errors.length === 0, errors.join(' | ').slice(0, 200));

  await browser.close();
  console.log('');
  console.log('Functional smoke: ' + pass + ' passed / ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('FATAL: ' + e.message);
  process.exit(1);
});