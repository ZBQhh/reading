const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('file:///D:/Desktop/TheAtlantic/index.html', { waitUntil: 'networkidle' });

  // 点击进入第一篇文章
  const card = await page.$('.shelf-enter-btn');
  if (card) await card.click();
  await page.waitForTimeout(1000);

  // 找到所有 seg-card 的 en-text 并检查它们的 padding
  const info = await page.evaluate(() => {
    const cards = document.querySelectorAll('.segment-block.seg-card');
    const results = [];
    cards.forEach((card, i) => {
      const enText = card.querySelector('.en-text');
      if (!enText) return;
      const cs = getComputedStyle(enText);
      const cardCs = getComputedStyle(card);
      results.push({
        index: i,
        textPreview: enText.textContent.trim().substring(0, 60),
        enTextPadding: cs.padding,
        enTextPL: cs.paddingLeft,
        enTextPT: cs.paddingTop,
        cardClasses: card.className,
        cardBorderLeft: cardCs.borderLeftWidth,
        cardBorder: cardCs.border,
        cardOverflow: cardCs.overflow,
        allCardClasses: card.className
      });
    });
    return results;
  });

  console.log(JSON.stringify(info, null, 2));

  // 截图
  await page.screenshot({ path: 'D:/Desktop/TheAtlantic/debug_mobile.png', fullPage: false });
  console.log('Screenshot saved');

  await browser.close();
})();
