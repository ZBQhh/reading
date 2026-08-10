const { chromium } = require('playwright-core');
const path = require('path');

async function run(width) {
  const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => { try { require('fs').accessSync(p); return true; } catch (e) { return false; } });
  const browser = await chromium.launch({ executablePath: edge });
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: width <= 640, hasTouch: width <= 640 });
  const page = await ctx.newPage();
  await page.goto('file://' + path.resolve('index.html'));
  await page.evaluate(() => {
    // 打开第一本杂志（含 h3 标题段的更可能）
    const btns = [...document.querySelectorAll('.shelf-enter-btn[data-issue]')];
    (btns[0] || document.querySelector('.shelf-enter-btn[data-issue]')).click();
  });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const card = document.querySelector('.segment-block.seg-card');
    const h3 = document.querySelector('.segment-h3');
    function probe(block, sel) {
      if (!block) return null;
      const el = block.querySelector(sel);
      if (!el) return null;
      const br = block.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        blockLeft: Math.round(br.left), elLeft: Math.round(er.left),
        padLeft: parseFloat(cs.paddingLeft),
        elToBlockLeft: Math.round(er.left - br.left),
        padRight: parseFloat(cs.paddingRight),
      };
    }
    return {
      ok: true,
      bodyCardEn: probe(card, '.en-text'),
      bodyCardZh: probe(card, '.zh-text-card'),
      h3En: probe(h3, '.en-text'),
      h3Zh: probe(h3, '.zh-text-card'),
    };
  });
  await browser.close();
  return m;
}

(async () => {
  const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => { try { require('fs').accessSync(p); return true; } catch (e) { return false; } });
  const browser = await chromium.launch({ executablePath: edge });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('file://' + path.resolve('index.html'));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.shelf-enter-btn[data-issue]')].find(x => (x.getAttribute('data-source') || '') !== 'manual');
    (b || document.querySelector('.shelf-enter-btn[data-issue]')).click();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scripts/_tmp_align_reader.png' });
  await browser.close();
  console.log('shot done');
})();
