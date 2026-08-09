/* ============================================================================
 * history.js — Reading history tracking + "continue reading" hero banner.
 * ==========================================================================*/

import { els, $, LS, allIssues, escHtml, toPlainText, readJson, lsSet, HELD } from './core.js';
import { enterReaderRoom } from './reader.js';

// ==================================================================
// 阅读历史
// ==================================================================
export function getHistory() { return readJson(LS.history, []); }
export function saveHistory(list) {
  lsSet(LS.history, JSON.stringify(list.slice(0, HELD.HISTORY_MAX)));
  renderContinueBanner();
  renderHistoryTab();
}
export function formatAgo(t) {
  if (!t) return '刚刚';
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
  const d = new Date(t);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}
export function recordReadingHistory(issueId, pageNum, sectionTitle) {
  if (!issueId || !pageNum) return;
  const meta = allIssues[issueId] || { displayName: issueId };
  const total = meta.totalPages || (meta.pages && meta.pages.length) || 0;
  if (total <= 0) return; // 无数据不记录（毒舌 2.7：不再伪造 104）
  const pct = Math.min(100, Math.max(1, Math.round((pageNum / total) * 100)));
  const list = getHistory().filter(function (h) { return h.issueId !== issueId; });
  list.unshift({
    issueId: issueId,
    issueName: meta.displayName || issueId,
    page: pageNum,
    totalPages: total,
    progress: pct,
    sectionTitle: toPlainText(sectionTitle) || ('Page ' + pageNum),
    timestamp: Date.now(),
  });
  saveHistory(list);
}
export function renderContinueBanner() {
  const hero = $('continue-reading-hero');
  if (!hero) return;
  const h = getHistory();
  if (h.length === 0) { hero.style.display = 'none'; return; }
  const latest = h[0];
  hero.style.display = 'flex';
  hero.innerHTML =
    '<div class="continue-left"><span class="continue-badge">最近在读 · 进度 ' + latest.progress + '%</span>' +
    '<h4>' + escHtml(latest.issueName) + '</h4>' +
    '<p>上次读到：第 ' + latest.page + ' 页 · ' + escHtml(latest.sectionTitle) + ' (' + escHtml(formatAgo(latest.timestamp)) + ')</p></div>' +
    '<button class="continue-btn" aria-label="一键直达断点继续阅读"><span>继续阅读</span>' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>';
  // 毒舌 7.12：事件绑定挪到 bindStaticEvents 一次性委托，这里只渲染内容
}
export function renderHistoryTab() {
  const listEl = $('history-timeline-list');
  const countEl = $('history-count');
  if (!listEl) return;
  const h = getHistory();
  if (countEl) countEl.textContent = h.length + ' 条阅读足迹';
  listEl.innerHTML = '';
  if (h.length === 0) {
    listEl.innerHTML = '<div class="bookmark-empty-hint">暂无阅读历史，翻阅期刊时系统将自动实时记录您的阅读足迹</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  h.forEach(function (item) {
    const card = document.createElement('div');
    card.className = 'history-item';
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.innerHTML =
      '<div class="history-item-top"><span class="history-page-badge">P' + item.page + ' · ' + item.progress + '%</span>' +
      '<span class="history-time-tag">' + escHtml(formatAgo(item.timestamp)) + '</span></div>' +
      '<div class="history-title">' + escHtml(item.sectionTitle) + '</div>' +
      '<div class="history-issue-tag">' + escHtml(item.issueName) + '</div>' +
      '<div class="history-progress-track"><div class="history-progress-fill" style="width:' + item.progress + '%"></div></div>';
    card.addEventListener('click', function () { jumpFromHistory(item); });
    frag.appendChild(card);
  });
  listEl.appendChild(frag);
}
export function jumpFromHistory(item) {
  enterReaderRoom(item.issueId, item.page);
  if (window.innerWidth <= 960 && els.appSidebar) els.appSidebar.classList.add('collapsed');
}
