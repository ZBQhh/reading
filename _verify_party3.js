const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('file:///D:/Desktop/TheAtlantic/index.html', { waitUntil: 'networkidle' });

  // 获取所有 shelf 卡片并逐个检查
  const cards = await page.$$('.shelf-enter-btn');
  console.log('Total cards:', cards.length);

  for (let i = 0; i < cards.length; i++) {
    await page.goto('file:///D:/Desktop/TheAtlantic/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const allCards = await page.$$('.shelf-enter-btn');
    if (!allCards[i]) continue;
    await allCards[i].click();
    await page.waitForTimeout(800);

    const hasTarget = await page.evaluate(() => {
      const body = document.querySelector('.article-body');
      return body ? body.textContent.includes('OF NO PARTY') : false;
    });

    if (hasTarget) {
      console.log(`\nFound on card index ${i}!`);
      const segInfo = await page.evaluate(() => {
        const blocks = document.querySelectorAll('.segment-block');
        return Array.from(blocks).map((b, idx) => {
          const en = b.querySelector('.en-text');
          return {
            idx,
            cls: b.className,
            text: en ? en.textContent.trim().substring(0, 70) : '',
            enPL: en ? getComputedStyle(en).paddingLeft : '-',
            blockPL: getComputedStyle(b).paddingLeft
          };
        }).filter(s => s.text.length > 0);
      });
      console.log(JSON.stringify(segInfo, null, 2));
      await page.screenshot({ path: 'D:/Desktop/TheAtlantic/verify_party_fix.png', fullPage: false });
      console.log('Screenshot saved!');
      await browser.close();
      return;
    }
  }

  console.log('Not found in any card');
  await browser.close();
})();
