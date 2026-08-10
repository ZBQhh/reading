const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('file:///D:/Desktop/TheAtlantic/index.html', { waitUntil: 'networkidle' });

  // 查找包含 "OF NO PARTY" 或 "PARTY" 的文章——可能是自选文章
  const allInfo = await page.evaluate(() => {
    // 检查所有 segment-block（包括非 seg-card 的）
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
        enPadding: cs.paddingLeft,
        enPL_px: cs.paddingLeft,
        blockPadding: blockCs.paddingLeft,
        blockBorderLeft: blockCs.borderLeftWidth,
        blockBorderLeftStyle: blockCs.borderLeftStyle,
        blockBorderLeftColor: blockCs.borderLeftColor
      });
    });
    return results;
  });

  console.log(JSON.stringify(allInfo, null, 2));
  await browser.close();
})();
