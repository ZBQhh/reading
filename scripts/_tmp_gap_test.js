const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const edgePaths = [
    process.env.AUDIT_BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  let execPath = null;
  for (const p of edgePaths) {
    if (require('fs').existsSync(p)) { execPath = p; break; }
  }
  const browser = await chromium.launch(execPath ? { executablePath: execPath } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve('index.html'));

  // 打开一篇杂志文章（多页），进入阅读器
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.shelf-enter-btn[data-issue]')].find(x => (x.getAttribute('data-source') || '') !== 'manual') || document.querySelector('.shelf-enter-btn[data-issue]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);

  const m = await page.evaluate(() => {
    const card = document.querySelector('.segment-block.seg-card');
    if (!card) return { ok: false };
    const en = card.querySelector('.en-text');
    const zh = card.querySelector('.zh-text-card');
    if (!en || !zh) return { ok: false, hasEn: !!en, hasZh: !!zh };
    const er = en.getBoundingClientRect();
    const zr = zh.getBoundingClientRect();
    const cs = getComputedStyle(zh);
    return {
      ok: true,
      enLeft: er.left, enRight: er.right, enPadTop: parseFloat(getComputedStyle(en).paddingTop), enPadBottom: parseFloat(getComputedStyle(en).paddingBottom),
      enPadLeft: parseFloat(getComputedStyle(en).paddingLeft), enPadRight: parseFloat(getComputedStyle(en).paddingRight),
      zhLeft: zr.left, zhRight: zr.right,
      zhPadTop: parseFloat(getComputedStyle(zh).paddingTop), zhPadBottom: parseFloat(getComputedStyle(zh).paddingBottom),
      zhPadLeft: parseFloat(getComputedStyle(zh).paddingLeft), zhPadRight: parseFloat(getComputedStyle(zh).paddingRight),
      zhBorderTop: parseFloat(cs.borderTopWidth), zhBorderStyle: cs.borderTopStyle, zhBorderColor: cs.borderColor,
      bodyClass: document.body.className,
      zhInlineStyle: zh.getAttribute('style') || '',
      issueAccent: getComputedStyle(document.documentElement).getPropertyValue('--issue-accent').trim(),
      accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      zhIssueAccent: getComputedStyle(zh).getPropertyValue('--issue-accent').trim(),
      zhAccent: getComputedStyle(zh).getPropertyValue('--accent').trim(),
      enBottom: er.bottom, zhTop: zr.top,
      verticalGap: (zr.top - er.bottom), // 期望 = enPadBottom + zhBorderTop + zhPadTop
    };
  });
  console.log(JSON.stringify(m, null, 2));
  console.log('JS_ERRORS:', errors.length ? errors : 'none');
  // 截图确认分隔线与间距
  const card2 = await page.$('.segment-block.seg-card');
  if (card2) await card2.screenshot({ path: 'scripts/_tmp_gap_reader.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
