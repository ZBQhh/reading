/* ============================================================================
 * a11y.js — Accessibility (P3 · AA): screen-reader live announcements,
 * list semantics, and modal focus trap.
 * ==========================================================================*/

import { els } from './core.js';

// ---------------------------------------------------------------- 无障碍（P3 · AA）
export function initA11y() {
  // 1) 视觉隐藏的实时状态区，供屏幕阅读器播报翻页/搜索结果
  let sr = document.getElementById('sr-status');
  if (!sr) {
    sr = document.createElement('div');
    sr.id = 'sr-status';
    sr.setAttribute('aria-live', 'polite');
    sr.setAttribute('role', 'status');
    sr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    document.body.appendChild(sr);
  }
  // 2) 列表语义：容器声明 role=list（子项已分别带 listitem/button）
  ['tocList', 'bookmarksList', 'historyTimelineList', 'searchResultsList', 'pagesGrid']
    .forEach(function (k) { const el = els[k]; if (el) el.setAttribute('role', 'list'); });
  // 3) 模态焦点陷阱：任意 .active 模态打开时，Tab / Shift+Tab 在内部循环
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    const openModal = [els.shortcutsModal, els.wordbookModal, els.highlightsModal, els.lightboxModal]
      .filter(function (m) { return m && m.classList.contains('active'); })[0];
    if (!openModal) return;
    const f = openModal.querySelectorAll('a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])');
    const list = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
    if (list.length === 0) { e.preventDefault(); return; }
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

export function announce(msg) {
  let sr = document.getElementById('sr-status');
  if (!sr) { initA11y(); sr = document.getElementById('sr-status'); }
  sr.textContent = '';
  // 延迟重设，确保相同文本也能被屏幕阅读器重新播报
  window.setTimeout(function () { sr.textContent = msg; }, 30);
}
