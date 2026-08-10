const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('file:///D:/Desktop/TheAtlantic/index.html', { waitUntil: 'networkidle' });

  // 检查所有可用的文章（包括 manual）
  const issuesInfo = await page.evaluate(() => {
    const allIssues = window.ALL_ISSUES || [];
    const manualIssues = window.MANUAL_ISSUES || [];
    return {
      magazineCount: allIssues.length,
      manuals: manualIssues.map(m => ({ id: m.id, title: m.displayName || m.name, slug: m.slug }))
    };
  });
  console.log('Issues:', JSON.stringify(issuesInfo, null, 2));

  // 尝试进入自选文章
  const manualCards = await page.$$('.shelf-enter-btn');
  console.log('\nTotal shelf cards found:', manualCards.length);

  // 点击每个卡片查找目标文本
  for (let i = 0; i < manualCards.length; i++) {
    await page.goto('file:///D:/Desktop/TheAtlantic/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const cards = await page.$$('.shelf-enter-btn');
    if (!cards[i]) continue;
    await cards[i].click();
    await page.waitForTimeout(800);

    const hasTarget = await page.evaluate(() => {
      const body = document.querySelector('.article-body');
      return body ? body.textContent.includes('OF NO PARTY') : false;
    });

    const pageInfo = await page.evaluate(() => {
      const badge = document.querySelector('.current-page-badge');
      return badge ? badge.textContent : '?';
    });

    console.log(`Card ${i}: page=${pageInfo}, hasParty=${hasTarget}`);

    if (hasTarget) {
      // 获取 segment 详情
      const segInfo = await page.evaluate(() => {
        const blocks = document.querySelectorAll('.segment-block');
        return Array.from(blocks).map((b, i) => {
          const en = b.querySelector('.en-text');
          return {
            i,
            cls: b.className,
            text: en ? en.textContent.trim().substring(0, 70) : '',
            enPL: en ? getComputedStyle(en).paddingLeft : '-',
            blockPL: getComputedStyle(b).paddingLeft
          };
        }).filter(s => s.text.length > 0);
      });
      console.log('\nSegments:', JSON.stringify(segInfo, null, 2));
      await page.screenshot({ path: 'D:/Desktop/TheAtlantic/verify_party_fix.png', fullPage: false });
      console.log('Screenshot saved!');
      break;
    }
  }

  await browser.close();
})();
