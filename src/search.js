/* ============================================================================
 * search.js — Full-library and in-reader search (index + keyboard nav).
 * ==========================================================================*/

import { state, els, escHtml, $$, allIssues, debounce, escRegex, toPlainText, toDisplayText, HELD } from './core.js';
import { announce } from './a11y.js';
import { enterReaderRoom } from './reader.js';

/** 全库检索索引（惰性构建一次） */
export function buildSearchIndex() {
  if (state.searchIndexCache) return state.searchIndexCache;
  const idx = [];
  Object.keys(allIssues).forEach(function (issueId) {
    const issue = allIssues[issueId] || { pages: [] };
    (issue.pages || []).forEach(function (p, i) {
      const buf = [];
      (p.segments || []).forEach(function (seg) {
        if (seg.en) buf.push(String(seg.en).toLowerCase());
        if (seg.zh) buf.push(String(seg.zh).toLowerCase());
      });
      idx.push({ issueId: issueId, pageNum: i + 1, section: p.section || '', text: buf.join(' ') });
    });
  });
  state.searchIndexCache = idx;
  return idx;
}

export function runSearch(query, scopeIssueId) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  // 一个正则两用——test 不带 g（避免 lastIndex 游标），mark 版带 g
  const isMatch = new RegExp(escRegex(q));
  const re = new RegExp('(' + escRegex(q) + ')', 'gi');
  const out = [];
  buildSearchIndex().forEach(function (row) {
    if (scopeIssueId && row.issueId !== scopeIssueId) return;
    if (!isMatch.test(row.text)) return;
    // 标题先转纯文本再截断，绝不在 HTML 转义结果上切出半个标签
    const raw = toPlainText(row.section);
    const section = raw.length > 60 ? raw.slice(0, 60) + '…' : raw;
    const snippet = toDisplayText(row.text).slice(0, 120).replace(re, '<mark>$1</mark>');
    out.push({ issueId: row.issueId, pageNum: row.pageNum, section: section, snippet: snippet });
  });
  return out;
}

// ---------------------------------------------------------------- 搜索键盘导航（上下箭头选择 + Enter 直达）
export function bindSearchResultKeys(inputEl, itemSel, onPick) {
  if (!inputEl) return;
  let idx = -1;
  inputEl.addEventListener('keydown', function (e) {
    const list = $$(itemSel);
    if (list.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(list.length - 1, idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); }
    else if (e.key === 'Enter' && idx >= 0 && list[idx]) { e.preventDefault(); onPick(list[idx]); return; }
    else return;
    list.forEach(function (it, k) { it.classList.toggle('kv-active', k === idx); });
    if (list[idx]) list[idx].scrollIntoView({ block: 'nearest' });
  });
}

export function bindPortalSearch() {
  const input = els.portalSearch;
  const dropdown = els.portalDropdown;
  if (!input || !dropdown) return;
  bindSearchResultKeys(input, '.portal-search-item', function (el) {
    dropdown.classList.remove('active');
    enterReaderRoom(el.dataset.issue, parseInt(el.dataset.page, 10));
  });
  const handler = debounce(function () {
    const q = input.value.trim();
    dropdown.innerHTML = '';
    if (q.length < 2) { dropdown.classList.remove('active'); return; }
    const results = runSearch(q, null).slice(0, 12);
    if (results.length === 0) {
      const e = document.createElement('div');
      e.className = 'portal-search-empty';
      e.textContent = '全刊库未检索到匹配篇章';
      dropdown.appendChild(e);
      announce('未检索到匹配内容');
    } else {
      results.forEach(function (r) {
        const issue = allIssues[r.issueId] || {};
        const item = document.createElement('div');
        item.className = 'portal-search-item';
        item.dataset.issue = r.issueId;
        item.dataset.page = String(r.pageNum);
        item.innerHTML =
          '<div class="portal-search-item-header">' +
          '<span>' + escHtml(issue.name || r.issueId) + ' &bull; PAGE ' + String(r.pageNum).padStart(3, '0') + '</span>' +
          '</div>' +
          '<div class="portal-search-item-title">' + escHtml(r.section) + '</div>' +
          '<div class="portal-search-item-snippet">' + r.snippet.slice(0, 200) + '...</div>';
        item.addEventListener('click', function () {
          dropdown.classList.remove('active');
          enterReaderRoom(r.issueId, r.pageNum);
        });
        dropdown.appendChild(item);
      });
      announce(results.length + ' 条搜索结果');
    }
    dropdown.classList.add('active');
  }, HELD.SEARCH_DEBOUNCE);
  input.addEventListener('input', handler);
  document.addEventListener('click', function (e) {
    if (dropdown.classList.contains('active') && !dropdown.contains(e.target) && e.target !== input) {
      dropdown.classList.remove('active');
    }
  });
}
