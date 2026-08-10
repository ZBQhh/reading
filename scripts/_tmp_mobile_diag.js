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

  // Open a manual/markdown article
  const opened = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.shelf-enter-btn'));
    const m = btns.find(b => /manual|md-/.test(b.getAttribute('data-issue') || ''));
    if (m) { m.click(); return m.getAttribute('data-issue'); }
    return null;
  });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => {
    const out = {};
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent || '').trim().slice(0, 80),
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        left: Math.round(r.left), right: Math.round(r.right),
        w: Math.round(r.width), h: Math.round(r.height),
        overflow: cs.overflow, whiteSpace: cs.whiteSpace, fontSize: cs.fontSize,
        scrollW: el.scrollWidth, clientW: el.clientWidth
      };
    };
    out.appHeader = pick('.app-header');
    out.headerLeft = pick('.header-left');
    out.brand = pick('.magazine-brand');
    out.masthead = pick('.masthead-logo');
    out.pill = pick('.issue-switcher-pill');
    out.pillFull = pick('.issue-pill-full');
    out.pillCompact = pick('.issue-pill-compact');
    out.pageMetaHeader = pick('.page-meta-header');
    out.sectionBadge = pick('#current-section-badge');
    out.pageBadge = pick('#current-page-badge');
    out.viewportH = window.innerHeight;
    out.viewportW = window.innerWidth;
    out.docScrollW = document.documentElement.scrollWidth;
    return out;
  });
  console.log('OPENED:', opened);
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'scripts/_tmp_mobile_diag.png', fullPage: false });
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
