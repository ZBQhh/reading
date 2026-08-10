const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('file:///D:/Desktop/TheAtlantic/index.html', { waitUntil: 'networkidle' });
  const card = await page.$('.shelf-enter-btn');
  if (card) await card.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'D:/Desktop/TheAtlantic/test_mobile_padding.png', fullPage: false });
  console.log('done');
  await browser.close();
})();
