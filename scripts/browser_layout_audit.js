let playwright;
try {
  playwright = require('playwright-core');
} catch (e) {
  const alt = require('path').join(require('os').tmpdir(), 'opencode', 'node_modules', 'playwright-core');
  playwright = require(alt);
}
const { chromium } = playwright;
// 本审计需要本地 GUI 浏览器（Windows Edge）+ 本地文件路径，仅适合本地运行。
const path = require('path');
const REPO_ROOT = path.resolve(__dirname, '..');
function toFileUrl(p) {
  const norm = path.resolve(p).replace(/\\/g, '/');
  if (/^[A-Za-z]:/.test(norm)) return 'file:///' + norm;
  return 'file://' + norm;
}
const EDGE = process.env.AUDIT_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET = process.env.AUDIT_TARGET || toFileUrl(path.join(REPO_ROOT, 'index.html'));

if (process.env.CI) {
  console.log('AUDIT SKIPPED on CI (requires a local headless browser + local file path).');
  process.exit(0);
}

const VIEWPORTS = [
  { name: 'iPhone SE 320', w: 320, h: 568 },
  { name: 'iPhone 12 390', w: 390, h: 844 },
  { name: 'Pixel 412', w: 412, h: 915 },
  { name: 'iPad 768', w: 768, h: 1024 },
  { name: 'iPad Pro 1024', w: 1024, h: 1366 },
  { name: 'laptop 1280', w: 1280, h: 800 },
  { name: 'desktop 1440', w: 1440, h: 900 },
  { name: 'wide 1920', w: 1920, h: 1080 },
];

function probeFn() {
  function clippedByAncestor(el) {
    var sb = el.closest('.app-sidebar');
    if (sb && sb.clientWidth < 40) return true;
    var a = el.parentElement;
    while (a && a !== document.body) {
      var acs = window.getComputedStyle(a);
      if ((acs.overflow === 'hidden' || acs.overflowX === 'hidden' || acs.overflow === 'clip' || acs.overflowX === 'clip') && a.clientWidth < el.getBoundingClientRect().width && a.clientWidth < 200) return true;
      a = a.parentElement;
    }
    return false;
  }
  var issues = [];
  var doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) issues.push('ROOT scrollWidth=' + doc.scrollWidth + ' > clientWidth=' + doc.clientWidth);
  if (doc.scrollLeft > 1) issues.push('ROOT scrollLeft=' + Math.round(doc.scrollLeft));
  var els = document.querySelectorAll('body *');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (cs.position === 'fixed' || cs.position === 'absolute') {
      if ((r.right <= 0 || r.left >= window.innerWidth)) continue;
    } else if (r.right <= 0 || r.left >= window.innerWidth) {
      continue;
    }
    var label = el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' && el.className ? el.className.trim().split(/\s+/)[0] : '') + '#' + (el.id || '');
    if (r.left < -1) issues.push('H ' + label + ' left=' + Math.round(r.left));
    if ((cs.position === 'fixed' || cs.position === 'absolute') && (r.right > window.innerWidth + 1 || r.left < -1)) {
      issues.push('H ' + label + ' fixed-pos right=' + Math.round(r.right) + ' left=' + Math.round(r.left) + ' vw=' + window.innerWidth);
    }
    var clipped = cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflow === 'clip' || cs.overflowX === 'clip';
    if (clipped && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && cs.whiteSpace !== 'nowrap') {
      if (r.left < window.innerWidth && r.right > 0 && !clippedByAncestor(el)) issues.push('T ' + label + ' text-clip sw=' + el.scrollWidth + ' cw=' + el.clientWidth);
    }
  }
  var containers = document.querySelectorAll('.bottom-bar, .app-header, .settings-popover-menu, .lightbox-modal, .shortcuts-modal, .mobile-view-bar');
  for (var j = 0; j < containers.length; j++) {
    var c = containers[j];
    var cs2 = window.getComputedStyle(c);
    if (cs2.display === 'none' || cs2.position === 'absolute') continue;
    if (cs2.overflowY === 'auto' || cs2.overflowY === 'scroll') continue;
    var cr = c.getBoundingClientRect();
    if (cr.right <= 0 || cr.left >= window.innerWidth) continue;
    var kids = c.children;
    for (var k = 0; k < kids.length; k++) {
      var ch = kids[k];
      if (window.getComputedStyle(ch).display === 'none') continue;
      var rr = ch.getBoundingClientRect();
      if (rr.bottom > cr.bottom + 1 && !clippedByAncestor(ch)) issues.push('V ' + (ch.className + '').split(' ')[0] + ' escapes ' + c.tagName.toLowerCase() + ' (bottom ' + Math.round(rr.bottom) + ' > ' + Math.round(cr.bottom) + ')');
      if (rr.top < cr.top - 1 && !clippedByAncestor(ch)) issues.push('V ' + (ch.className + '').split(' ')[0] + ' above ' + c.tagName.toLowerCase() + ' (top ' + Math.round(rr.top) + ' < ' + Math.round(cr.top) + ')');
    }
  }
  return issues.slice(0, 40);
}

async function click(page, selector) {
  await page.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); else throw new Error('missing ' + s); }, selector);
}

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const out = [];
  let total = 0;
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.route('**/*', r => {
      const u = r.request().url();
      if (u.includes('fonts.googleapis') || u.includes('fonts.gstatic')) return r.abort();
      return r.continue();
    });
    await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const issuesPortal = await page.evaluate(probeFn);
    if (issuesPortal.length) { out.push('[' + vp.name + ' | portal] ' + issuesPortal.length + ' issues'); issuesPortal.forEach(l => out.push('   ' + l)); total += issuesPortal.length; }
    await click(page, '.shelf-enter-btn');
    await page.waitForTimeout(400);
    const states = ['reader', 'view-split', 'view-en-only', 'view-zh-only', 'sidebar-open', 'popover-open'];
    for (const st of states) {
      if (st === 'view-split' || st === 'view-en-only' || st === 'view-zh-only') {
        await page.evaluate(mode => {
          const btns = document.querySelectorAll('.view-btn');
          for (const b of btns) { if (b.dataset.view === mode && b.offsetParent !== null) { b.click(); return; } }
        }, st.replace('view-', ''));
        await page.waitForTimeout(300);
      } else if (st === 'sidebar-open') {
        await click(page, '#toggle-sidebar-btn');
        await page.waitForTimeout(400);
      } else if (st === 'popover-open') {
        await click(page, '#more-settings-btn');
        await page.waitForTimeout(350);
      }
      const issues = await page.evaluate(probeFn);
      if (issues.length) { total += issues.length; out.push('[' + vp.name + ' | ' + st + '] ' + issues.length + ':'); issues.forEach(l => out.push('   ' + l)); }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(total === 0 ? 'ALL CLEAN — 0 issues across all viewports/states' : out.join('\n'));
})().catch(e => { console.error('FATAL', e); process.exit(1); });