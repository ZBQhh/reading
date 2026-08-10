const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const exe = process.env.EDGE_EXE ||
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({
    executablePath: exe,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const page = await ctx.newPage();
  const url = 'file://' + path.resolve('index.html');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Try to open a magazine reader (first issue card) to measure reading font
  const opened = await page.evaluate(() => {
    const btn = document.querySelector('.shelf-enter-btn');
    if (btn) { btn.click(); return true; }
    return false;
  });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const en = document.querySelector('.en-text');
    const zh = document.querySelector('.zh-text-card');
    const vp = document.querySelector('.reader-viewport');
    const cs = en ? getComputedStyle(en) : null;
    const rect = vp ? vp.getBoundingClientRect() : null;
    return {
      hasEn: !!en,
      enFontSize: cs ? cs.fontSize : null,
      zhFontSize: zh ? getComputedStyle(zh).fontSize : null,
      viewportH: window.innerHeight,
      vpBottom: rect ? Math.round(rect.bottom) : null,
      vpTop: rect ? Math.round(rect.top) : null,
      docBottomGap: rect ? Math.round(window.innerHeight - rect.bottom) : null
    };
  });
  console.log('OPENED:', opened);
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: 'scripts/_tmp_mobile_reader.png', fullPage: false });
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
