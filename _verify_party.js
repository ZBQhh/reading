const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('file:///D:/Desktop/TheAtlantic/index.html', { waitUntil: 'networkidle' });

  // 进入第一篇文章
  const card = await page.$('.shelf-enter-btn');
  if (card) await card.click();
  await page.waitForTimeout(800);

  // 搜索包含 "PARTY" 或 "OF NO" 的页面
  const found = await page.evaluate(() => {
    return new Promise((resolve) => {
      // 尝试翻页查找
      let p = 1;
      const maxP = 110;
      function tryPage() {
        if (typeof window.goToPage === 'function') window.goToPage(p);
        setTimeout(() => {
          const bodyText = document.querySelector('.article-body');
          if (bodyText && bodyText.textContent.includes('OF NO PARTY')) {
            resolve({ found: true, page: p, preview: bodyText.textContent.substring(0, 200) });
            return;
          }
          p++;
          if (p <= maxP) { tryPage(); } else { resolve({ found: false }); }
        }, 300);
      }
      tryPage();
    });
  });

  console.log(JSON.stringify(found, null, 2));

  if (found.found) {
    await page.waitForTimeout(500);
    // 获取该页所有 segment 的信息
    const segInfo = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.segment-block');
      return Array.from(blocks).map((b, i) => ({
        i,
        cls: b.className,
        text: (b.querySelector('.en-text') || {}).textContent || '' .trim().substring(0, 60),
        enPL: getComputedStyle(b.querySelector('.en-text') || {}).paddingLeft,
        blockPL: getComputedStyle(b).paddingLeft
      })).filter(s => s.text.length > 0);
    });
    console.log('\nSegments on page ' + found.page + ':');
    console.log(JSON.stringify(segInfo, null, 2));

    await page.screenshot({ path: 'D:/Desktop/TheAtlantic/verify_party_fix.png', fullPage: false });
    console.log('\nScreenshot saved');
  }

  await browser.close();
})();
