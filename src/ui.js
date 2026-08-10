/* ============================================================================
 * ui.js — View/theme/alignment, settings drawer, modals, library shelf,
 * and the global highlights review list.
 * ==========================================================================*/

import {
  state, els, LS, $, $$, allIssues, escHtml, toast, confirmDialog, readJson, lsSet, countEnglishWords,
  VIEW_MODES, THEMES, webpUrl, imgWithWebFallback,
} from './core.js';
import { loadHighlights, saveHighlights } from './highlight.js';
import { loadWordbook } from './wordbook.js';
import { loadPage, enterReaderRoom } from './reader.js';
import { renderManualShelfSection } from './manual.js';

// ==================================================================
// 期刊馆
// ==================================================================
export function renderLibraryShelf() {
  const grid = els.magazineShelfGrid;
  if (!grid) return;
  grid.innerHTML = '';

  const ids = Object.keys(allIssues).filter(function (id) {
    const issue = allIssues[id];
    if (state.currentPubFilter === 'all') return true;
    if (state.currentPubFilter === 'the-atlantic') return issue.pubId === 'the-atlantic' || !issue.pubId;
    return issue.pubId === state.currentPubFilter;
  });

  if (ids.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;padding:36px;text-align:center;background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;">' +
      '<h3 style="font-size:17px;color:var(--text-primary);margin-bottom:8px;">该刊物待入库</h3>' +
      '<p style="font-size:12.5px;color:var(--text-secondary);">可用 <code>python scripts/ingest_magazine.py --pdf raw_pdf/xxx.pdf --pub ' +
      escHtml(state.currentPubFilter) + ' --issue 2026-09 --name "2026年9月刊"</code> 一键入库</p></div>';
    return;
  }

  const frag = document.createDocumentFragment();
  ids.forEach(function (id) {
    const issue = allIssues[id];
    const card = document.createElement('div');
    card.className = 'shelf-issue-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.issue = id;
    card.innerHTML =
      '<div class="shelf-cover-wrap">' +
      '<img src="' + escHtml(webpUrl(issue.coverImage)) + '" class="shelf-cover-img" alt="Cover ' + escHtml(issue.name) + '" loading="lazy" decoding="async">' +
      '</div>' +
      '<div class="shelf-details"><div class="shelf-details-top">' +
      '<span class="issue-date-tag">' + escHtml(issue.name) + ' &bull; ' + escHtml(issue.vol) + '</span>' +
      '<h3>' + escHtml(issue.pubName || 'The Atlantic') + '</h3>' +
      '<p>' + escHtml(issue.leadArticle || 'Bilingual Digital Archive') + '</p>' +
      '<div class="shelf-meta-tags">' +
      '<span class="meta-tag">🔤 ' + countEnglishWords(issue) + ' 词</span>' +
      '<span class="meta-tag">📖 ' + escHtml(issue.totalPages) + ' 页双语转录</span>' +
      '<span class="meta-tag">¶ ' + Math.round(state.globalFontScale) + 'px 大字逐段对照</span>' +
      '<span class="meta-tag">🔊 Web Speech TTS</span>' +
      '</div></div>' +
      '<button class="shelf-enter-btn" data-issue="' + escHtml(id) + '" aria-label="开始沉浸阅读 ' + escHtml(issue.name) + '">' +
      '<span>开始沉浸阅读</span>' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
      '</button></div>';
    const shelfCoverImg = card.querySelector('.shelf-cover-img');
    imgWithWebFallback(shelfCoverImg);
    frag.appendChild(card);
  });

  grid.appendChild(frag);

  // 刷新手建文库分组（位于期刊网格下方）：Markdown 文章 + 应用内草稿 + 新建入口
  renderManualShelfSection();
}

// ==================================================================
// 视图 / 主题 / 对齐
// ==================================================================
export function setViewMode(mode) {
  if (VIEW_MODES.indexOf(mode) < 0) mode = 'interlinear';
  VIEW_MODES.forEach(function (m) { document.body.classList.remove('view-' + m); });
  document.body.classList.add('view-' + mode);
  lsSet(LS.view, mode);
  $$('.view-btn').forEach(function (b) {
    const act = b.dataset.view === mode;
    b.classList.toggle('active', act);
    b.setAttribute('aria-pressed', String(act));
  });
}

export function applyTheme(name) {
  if (THEMES.indexOf(name) < 0) name = 'light';
  THEMES.forEach(function (t) { document.body.classList.remove('theme-' + t); });
  document.body.classList.add('theme-' + name);
  lsSet(LS.theme, name);
  $$('.popover-theme-card').forEach(function (c) { c.classList.toggle('active', c.dataset.theme === name); });
}

export function applyAlignMode(mode) {
  state.currentAlignModeInternal = mode === 'justify' ? 'justify' : 'flush';
  document.body.classList.remove('align-mode-flush', 'align-mode-justify');
  document.body.classList.add('align-mode-' + state.currentAlignModeInternal);
  lsSet(LS.align, state.currentAlignModeInternal);
  if (els.alignModeText) {
    els.alignModeText.textContent = state.currentAlignModeInternal === 'flush'
      ? '📖 自然恒定均距 (零拉伸)' : '📐 纸刊两端平齐 (Justified)';
  }
}

// ==================================================================
// 设置抽屉 / 快捷键速查
// ==================================================================
export function toggleSettingsPopover(force) {
  if (!els.settingsPopover) return;
  const active = force !== undefined ? force : !els.settingsPopover.classList.contains('active');
  els.settingsPopover.classList.toggle('active', active);
  if (els.settingsBackdrop) els.settingsBackdrop.classList.toggle('active', active);
  if (els.moreSettingsBtn) els.moreSettingsBtn.classList.toggle('active', active);
}
export function toggleShortcutsModal() { if (els.shortcutsModal) els.shortcutsModal.classList.toggle('active'); }
export function toggleSidebar(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const sb = els.appSidebar;
  if (!sb) return;
  const collapsed = sb.classList.toggle('collapsed');
  toast(collapsed ? '📋 目录已收起' : '📖 目录已展开');
}

// ---------------------------------------------------------------- 行为回调
export function cycleAudioSpeed() {
  if (state.audioSpeed === 1.0) state.audioSpeed = 1.25;
  else if (state.audioSpeed === 1.25) state.audioSpeed = 1.5;
  else if (state.audioSpeed === 1.5) state.audioSpeed = 0.75;
  else state.audioSpeed = 1.0;
  lsSet(LS.speed, String(state.audioSpeed));
  updateSpeedDisplays();
  toast('朗读倍速：' + state.audioSpeed + 'x');
}
export function updateSpeedDisplays() {
  const txt = state.audioSpeed + 'x';
  if (els.topAudioSpeedBtn) els.topAudioSpeedBtn.textContent = txt;
  // 只有 1x 才标"标准"，1.25/1.5/0.75 不再误标
  if (els.drawerAudioSpeedBtn) els.drawerAudioSpeedBtn.textContent = state.audioSpeed === 1 ? '1x 标准' : txt;
  if (els.audioSpeedBtn) els.audioSpeedBtn.textContent = txt;
}
export function toggleFont() {
  state.isSerifMode = !state.isSerifMode;
  document.body.classList.toggle('font-mode-serif', state.isSerifMode);
  if (els.fontToggleBtn) els.fontToggleBtn.textContent = state.isSerifMode ? '🔠 典雅衬线' : '🔤 现代黑体';
  lsSet(LS.font, state.isSerifMode ? 'serif' : 'sans');
}
export function toggleFullscreen() {
  if (!document.fullscreenElement) { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }
  else if (document.exitFullscreen) document.exitFullscreen();
}
export function jumpToPage(p) {
  loadPage(p);
  if (window.innerWidth <= 900 && els.appSidebar) els.appSidebar.classList.add('collapsed');
}
export function jumpFromInput() {
  const input = $('quick-jump-num');
  if (!input) return;
  const v = parseInt(input.value, 10);
  if (v >= 1 && v <= state.currentIssueObj.totalPages) jumpToPage(v);
}
export function copyPageMarkdown() {
  const pageObj = state.data[state.currentPage - 1];
  if (!pageObj || !pageObj.rawMd) { toast('⚠️ 本页无 Markdown 数据', 'warn'); return; }
  navigator.clipboard.writeText(pageObj.rawMd)
    .then(function () { toast('📋 本页 Markdown 已复制'); })
    .catch(function () { toast('⚠️ 复制失败，请手动选择文本复制', 'warn'); });
}

// ==================================================================
// 我的高亮（全局回顾清单）
// ==================================================================
export function renderHighlightsList() {
  const listEl = els.highlightsList;
  const countEl = els.highlightsCount;
  if (!listEl) return;
  const list = loadHighlights();
  if (countEl) countEl.textContent = list.length + ' 条';
  listEl.innerHTML = '';
  if (list.length === 0) {
    listEl.innerHTML = '<div class="wordbook-empty-hint">🔖 阅读中选中英文文本 → 点「🔖 高亮」即可收藏；高亮会在这里回顾</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  list.slice().reverse().forEach(function (h) {
    const item = document.createElement('div');
    item.className = 'wordbook-item';
    item.dataset.i = String(h.ts);
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    const issueMeta = allIssues[h.issue] || { displayName: h.issue };
    item.innerHTML =
      '<div class="wordbook-item-top">' +
      '<span class="wordbook-word">' + escHtml(h.text.slice(0, 60)) + (h.text.length > 60 ? '…' : '') + '</span>' +
      '<span class="wordbook-page-badge">' + escHtml((issueMeta.displayName || '').slice(-6)) + ' · P' + h.page + '</span>' +
      '<button class="wordbook-del-btn" data-del-highlight="' + h.ts + '" title="删除此高亮">✕</button></div>' +
      '<div class="wordbook-context">' + escHtml(String(h.text || '').slice(0, 160)) + '</div>';
    item.addEventListener('click', function () {
      const onPortal = !els.libraryPortal || !els.libraryPortal.classList.contains('hidden');
      if (onPortal || h.issue !== state.currentIssueId) enterReaderRoom(h.issue, h.page);
      else jumpToPage(h.page);
      if (els.highlightsModal) els.highlightsModal.classList.remove('active');
    });
    frag.appendChild(item);
  });
  listEl.appendChild(frag);
}
/** 弹窗内删除高亮（按 ts 定位） */
export function removeHighlightByTs(ts) {
  const n = Number(ts);
  saveHighlights(loadHighlights().filter(function (h) { return h.ts !== n; }));
  renderAllHighlightsCounts();
  renderHighlightsList();
  toast('🗑️ 已删除该高亮');
}
export function clearHighlightsAll() {
  confirmDialog({
    title: '清空全部高亮？',
    message: '将删除全部期刊的 ' + loadHighlights().length + ' 条高亮，此操作不可撤销。',
    okText: '清空',
    danger: true,
  }).then(function (ok) {
    if (ok) { saveHighlights([]); renderHighlightsList(); toast('🗑️ 高亮已清空'); }
  });
}
export function toggleHighlightsModal() {
  if (!els.highlightsModal) return;
  const active = els.highlightsModal.classList.toggle('active');
  if (active) { renderHighlightsList(); }
}
/** 门户首页「我的数据」计数徽标（生词/高亮/书签） */
export function renderAllHighlightsCounts() {
  const hls = loadHighlights().length;
  if (els.portalHighlightsBtn) els.portalHighlightsBtn.innerHTML = '🔖 我的高亮 <span class="portal-count">' + hls + '</span>';
  if (els.portalWordbookBtn) els.portalWordbookBtn.innerHTML = '📖 生词本 <span class="portal-count">' + loadWordbook().length + '</span>';
  if (els.portalBookmarksBtn) {
    let total = 0;
    Object.keys(allIssues).forEach(function (id) { total += readJson(LS.bookmarks + id, []).length; });
    els.portalBookmarksBtn.innerHTML = '🔖 我的书签 <span class="portal-count">' + total + '</span>';
  }
}
