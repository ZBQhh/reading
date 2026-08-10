const path = require('path');
const { chromium } = require('playwright-core');
(async () => {
  const edgePaths = [
    process.env.AUDIT_BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  let execPath = null;
  for (const p of edgePaths) { if (require('fs').existsSync(p)) { execPath = p; break; } }
  const browser = await chromium.launch(execPath ? { executablePath: execPath } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve('index.html'));
  // 打开一篇杂志文章
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.shelf-enter-btn[data-issue]')].find(x => (x.getAttribute('data-source') || '') !== 'manual') || document.querySelector('.shelf-enter-btn[data-issue]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(700);
  // 按 M 打开切换菜单
  await page.keyboard.press('m');
  await page.waitForTimeout(200);
  const opened = await page.evaluate(() => !!document.getElementById('issue-switcher-menu'));
  const itemCount = await page.evaluate(() => document.querySelectorAll('#issue-switcher-menu .issue-switcher-item').length);
  const hasManualGroup = await page.evaluate(() => /自选文库/.test(document.getElementById('issue-switcher-menu')?.textContent || ''));
  // 关闭
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const closed = await page.evaluate(() => !document.getElementById('issue-switcher-menu'));
  console.log(JSON.stringify({ opened, itemCount, hasManualGroup, closed, errors: errors.length ? errors : 'none' }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
