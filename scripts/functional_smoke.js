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
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET = 'file:///D:/Desktop/TheAtlantic/index.html';

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  \u2713 PASS: ' + name); }
  else { fail++; console.log('  \u2717 FAIL: ' + name + (extra ? '  (' + extra + ')' : '')); }
}

(async () => {
  if (require('fs').existsSync(EDGE)) {
    console.log('Launching Edge via playwright-core...');
  } else {
    console.error('Edge not found at ' + EDGE);
    process.exit(1);
  }
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

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

  check('浏览器侧无未捕获 JS 异常', errors.length === 0, errors.join(' | ').slice(0, 200));

  await browser.close();
  console.log('');
  console.log('Functional smoke: ' + pass + ' passed / ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('FATAL: ' + e.message);
  process.exit(1);
});