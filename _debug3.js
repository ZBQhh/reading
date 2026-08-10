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
  await page.waitForTimeout(800);

  // 跳转到第 5 页（用户截图中的页面）
  await page.evaluate(() => {
    // 找到页码输入框或使用 goToPage
    const input = document.querySelector('.page-jump-input');
    if (input) {
      input.value = '5';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // 或者直接调用
    if (typeof window.goToPage === 'function') window.goToPage(5);
  });
  await page.waitForTimeout(800);

  // 检查所有 segment 的样式
  const allInfo = await page.evaluate(() => {
    const allBlocks = document.querySelectorAll('.segment-block');
    const results = [];
    allBlocks.forEach((block, i) => {
      const enText = block.querySelector('.en-text');
      if (!enText) return;
      const text = enText.textContent.trim();
      if (text.length === 0) return;
      const cs = getComputedStyle(enText);
      const blockCs = getComputedStyle(block);
      results.push({
        index: i,
        classes: block.className,
        textPreview: text.substring(0, 80),
        enPaddingLeft: cs.paddingLeft,
        blockPaddingLeft: blockCs.paddingLeft,
        blockBorderLeft: blockCs.borderLeftWidth + ' ' + blockCs.borderLeftStyle + ' ' + blockCs.borderLeftColor.substring(0, 16)
      });
    });
    return results;
  });

  console.log(JSON.stringify(allInfo, null, 2));

  // 截图第5页
  await page.screenshot({ path: 'D:/Desktop/TheAtlantic/debug_p5.png', fullPage: false });
  console.log('Screenshot p5 saved');

  await browser.close();
})();
