/* ============================================================================
 * reader.js — Reading room: page rendering, navigation, TOC, bookmarks,
 * issue switching, and the library-shelf entry point.
 * ==========================================================================*/

import {
  state, els, LS, $, $$, allIssues, escHtml, toast, lsGet, lsSet, readInt, readJson,
  webpUrl, webpSrcset, imgWithWebFallback, preloadAdjacentPages, smoothByPref, toDisplayText,
  applyIssueAccent,
} from './core.js';
import { stopSpeech } from './speech.js';
import { applyPageHighlights } from './highlight.js';
import { recordReadingHistory } from './history.js';
import { announce } from './a11y.js';
import { getManualArticle } from './manual.js';

// 双源解析：优先 shipped 语料，其次手建文库（同入口、不同数据来源）
export function resolveIssue(id) {
  return allIssues[id] || getManualArticle(id) || null;
}

// ==================================================================
// 阅读室
// ==================================================================
export function enterReaderRoom(issueId, targetPage) {
  const resolved = resolveIssue(issueId);
  if (!resolved) { toast('未找到该文章', 'error'); return; }
  // 手建文章编辑后再次进入时 id 不变，但内容已变，需强制重载；新刊照常重载
  if (issueId !== state.currentIssueId || resolved.source === 'manual') {
    state.currentIssueId = issueId;
    state.currentIssueObj = resolved;
    state.data = resolved.pages || [];
    lsSet(LS.issue, state.currentIssueId);
    applyIssueAccent();
    initTOC();
    renderBookmarksTab();
  }
  const portal = els.libraryPortal;
  if (portal) portal.classList.add('hidden');
  refreshPill();
  loadPage(targetPage || 1);
}

export function openLibraryShelf() {
  stopSpeech();
  const portal = els.libraryPortal;
  if (portal) portal.classList.remove('hidden');
}

export function refreshPill() {
  const pill = els.issueSwitcherPill;
  if (!pill) return;
  const name = state.currentIssueObj.displayName || state.currentIssueObj.id;
  const full = pill.querySelector('.issue-pill-full');
  const compact = pill.querySelector('.issue-pill-compact');
  if (full) full.textContent = '📅 ' + name + ' • ' + state.currentIssueObj.totalPages + 'P';
  if (compact) compact.textContent = '📅 ' + String(state.currentIssueObj.id || '').replace('-', '/');
}

export function nextIssueId() {
  const ids = Object.keys(allIssues);
  return ids.length > 1 ? ids[(ids.indexOf(state.currentIssueId) + 1) % ids.length] : state.currentIssueId;
}

export function switchIssue(newIssueId) {
  const resolved = resolveIssue(newIssueId);
  if (!resolved || newIssueId === state.currentIssueId) return;
  state.currentIssueId = newIssueId;
  state.currentIssueObj = resolved;
  state.data = resolved.pages || [];
  lsSet(LS.issue, state.currentIssueId);
  applyIssueAccent();
  refreshPill();
  if (els.pageSlider) els.pageSlider.max = resolved.totalPages;
  initTOC();
  renderBookmarksTab();
  const last = readInt(lsGet(LS.pagePrefix + state.currentIssueId, '1'), 1);
  loadPage(last);
  toast('切换至：' + resolved.displayName);
}

// ---------------------------------------------------------------- 书签
export function getBookmarks() { return readJson(LS.bookmarks + state.currentIssueId, []); }
export function saveBookmarks(list) { lsSet(LS.bookmarks + state.currentIssueId, JSON.stringify(list)); renderBookmarksTab(); }
export function toggleBookmark(pageNum) {
  const list = getBookmarks();
  const i = list.indexOf(pageNum);
  if (i >= 0) { list.splice(i, 1); toast('☆ 已取消收藏 第 ' + pageNum + ' 页'); }
  else { list.push(pageNum); list.sort(function (a, b) { return a - b; }); toast('⭐ 已收藏 第 ' + pageNum + ' 页'); }
  saveBookmarks(list);
  updateBookmarkButton(pageNum);
}
export function updateBookmarkButton(pageNum) {
  if (!els.bookmarkPageBtn) return;
  const active = getBookmarks().indexOf(pageNum) >= 0;
  els.bookmarkPageBtn.classList.toggle('active', active);
  els.bookmarkPageBtn.textContent = active ? '⭐ 已收藏' : '☆ 收藏本页';
}
export function renderBookmarksTab() {
  const listEl = els.bookmarksList;
  if (!listEl) return;
  const list = getBookmarks();
  listEl.innerHTML = '';
  if (list.length === 0) {
    listEl.innerHTML = '<div class="bookmark-empty-hint">暂无书签，点击页面顶部“收藏本页”可快速标记重要章节</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(function (p) {
    const pageObj = state.data[p - 1] || {};
    const item = document.createElement('div');
    item.className = 'toc-item';
    if (p) item.dataset.page = p;
    item.setAttribute('role', 'button');
    item.innerHTML =
      '<div class="toc-item-header"><span>PAGE ' + String(p).padStart(3, '0') + '</span>' +
      '<span style="color:var(--accent-gold);">★ 书签</span></div>' +
      '<div class="toc-item-title">' + toDisplayText(pageObj.section) + '</div>';
    frag.appendChild(item);
  });
  listEl.appendChild(frag);
}

// ---------------------------------------------------------------- 目录
export function isArticlePage(pageObj) {
  const chars = (pageObj.segments || []).reduce(function (a, s) { return a + (s.en ? s.en.length : 0); }, 0);
  return chars >= 350 || (pageObj.segments && pageObj.segments.length >= 3);
}
export function initTOC() {
  const tocList = els.tocList;
  if (tocList) {
    tocList.innerHTML = '';
    const frag = document.createDocumentFragment();
    state.data.forEach(function (pageObj, idx) {
      const pNum = idx + 1;
      if (!pageObj.section || !String(pageObj.section).trim()) return;
      const isArticle = isArticlePage(pageObj);
      const isCover = pNum <= 4 || (String(pageObj.section).indexOf('Cover') >= 0 && String(pageObj.section).indexOf('Story') < 0);
      const badge = isArticle ? 'badge-article' : (isCover ? 'badge-cover' : 'badge-visual');
      const label = isArticle ? '📖 深度长文' : (isCover ? '🏛️ 封面/刊头' : '🎨 视觉图版');
      const li = document.createElement('li');
      li.className = 'toc-item ' + (isArticle ? 'type-article' : 'type-visual');
      li.dataset.page = String(pNum);
      li.dataset.type = isArticle ? 'article' : 'visual';
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      li.innerHTML =
        '<div class="toc-item-header"><span>PAGE ' + String(pNum).padStart(3, '0') + '</span>' +
        '<span class="toc-type-badge ' + badge + '">' + label + '</span></div>' +
        '<div class="toc-item-title">' + toDisplayText(pageObj.section) + '</div>';
      frag.appendChild(li);
    });
    tocList.appendChild(frag);
  }
  const pagesGrid = els.pagesGrid;
  if (pagesGrid) {
    pagesGrid.innerHTML = '';
    const frag2 = document.createDocumentFragment();
    for (let p = 1; p <= state.currentIssueObj.totalPages; p++) {
      const tile = document.createElement('div');
      tile.id = 'tile-' + p;
      tile.className = 'page-tile' + (p === state.currentPage ? ' active' : '');
      tile.dataset.page = String(p);
      tile.setAttribute('role', 'button');
      tile.innerHTML = '<span>P' + p + '</span>';
      frag2.appendChild(tile);
    }
    pagesGrid.appendChild(frag2);
  }
}

// ---------------------------------------------------------------- 侧栏同步
export function syncSidebarActiveState(pageNum) {
  const smooth = smoothByPref();
  $$('.page-tile').forEach(function (t) { t.classList.remove('active'); });
  const tile = $('tile-' + pageNum);
  if (tile) { tile.classList.add('active'); tile.scrollIntoView({ behavior: smooth, block: 'center', inline: 'nearest' }); }
  $$('.toc-item').forEach(function (i) { i.classList.remove('active'); i.removeAttribute('aria-current'); });
  const items = $$('#toc-list .toc-item');
  let active = null;
  for (let i = 0; i < items.length; i++) {
    if (parseInt(items[i].dataset.page, 10) <= pageNum) active = items[i];
    else break;
  }
  if (!active) active = items[0];
  if (active) { active.classList.add('active'); active.setAttribute('aria-current', 'page'); active.scrollIntoView({ behavior: smooth, block: 'center', inline: 'nearest' }); }
}

// ---------------------------------------------------------------- 字号管道（纯 CSS 变量）
export function applyFontScale(px) {
  state.globalFontScale = Math.min(36, Math.max(14, px));
  state.globalFontScale = Math.round(state.globalFontScale * 2) / 2;
  lsSet(LS.fontScale, String(state.globalFontScale));
  document.documentElement.style.setProperty('--reader-font-scale', state.globalFontScale + 'px');
}

// ==================================================================
// 页面渲染
// ==================================================================
export function stubPage(pageNum) {
  return {
    pageNumber: pageNum,
    segments: [],
    section: state.currentIssueObj.displayName + ' (Page ' + pageNum + ')',
    image: (state.currentIssueObj.imageRoot || 'issues/' + state.currentIssueObj.id) + '/images/page_' + String(pageNum).padStart(3, '0') + '.png',
  };
}

export function renderSegmentNode(seg, idx) {
  const type = seg.type || 'paragraph';
  const div = document.createElement('div');
  div.className = 'segment-block segment-' + type;
  div.id = 'seg-' + idx;
  const en = toDisplayText(seg.en);
  const zh = toDisplayText(seg.zh);
  const zhHtml = (seg.zh && String(seg.zh).trim()) ? '<div class="zh-text-card" lang="zh-CN"><div>' + zh + '</div></div>' : '';
  let enHtml;
  if (type === 'caption') enHtml = '<div class="en-text" lang="en"><em>' + en + '</em></div>';
  else if (type === 'ad') enHtml = '<div class="en-text" lang="en"><strong>[Advertisement]</strong> ' + en + '</div>';
  else enHtml = '<div class="en-text" lang="en">' + en + '</div>';
  div.innerHTML = enHtml + zhHtml;
  return div;
}

export function renderArtCard(pageObj, pageNum, doc) {
  const wrap = document.createElement('div');
  wrap.className = 'embedded-art-card';
  wrap.innerHTML =
    '<div class="embedded-art-img-wrap">' +
    '<img src="' + escHtml(webpUrl(pageObj.image)) + '" class="embedded-art-img" alt="' + escHtml(pageObj.section) + '" loading="lazy" decoding="async">' +
    '<span class="embedded-art-zoom-hint">🔍 点击查看 150 DPI 高清全屏原图</span>' +
    '</div>' +
    '<div class="segment-block segment-caption">' +
    '<div class="en-text" lang="en">The Atlantic — ' + escHtml(state.currentIssueObj.displayName) + ' (Page ' + pageNum + ')</div>' +
    '<div class="zh-text-card" lang="zh-CN"><div>《大西洋月刊》' + escHtml(state.currentIssueObj.displayName) + '（第 ' + pageNum + ' 页原版图版）</div></div>' +
    '</div>';
  imgWithWebFallback(wrap.querySelector('.embedded-art-img'));
  doc.appendChild(wrap);
}

export function renderShortVisualPage(pageObj, doc) {
  const wrap = document.createElement('div');
  wrap.className = 'embedded-art-card';
  wrap.innerHTML =
    '<div class="embedded-art-img-wrap">' +
    '<img src="' + escHtml(webpUrl(pageObj.image)) + '" class="embedded-art-img" alt="' + escHtml(pageObj.section || '原版扫描页') + '" loading="lazy" decoding="async">' +
    '<span class="embedded-art-zoom-hint">🔍 点击查看 150 DPI 高清全屏原图</span>' +
    '</div>';
  imgWithWebFallback(wrap.querySelector('.embedded-art-img'));
  doc.appendChild(wrap);
  const segWrap = document.createElement('div');
  segWrap.className = 'short-page-segments';
  (pageObj.segments || []).forEach(function (seg, i) {
    segWrap.appendChild(renderSegmentNode(seg, i));
  });
  doc.appendChild(segWrap);
}

export function loadPage(pageNum) {
  const total = state.currentIssueObj.totalPages || (state.data && state.data.length) || 0;
  if (total <= 0) { toast('⚠️ 刊目数据缺失，无法翻页', 'error'); return; }
  if (pageNum < 1) pageNum = 1;
  if (pageNum > total) pageNum = total;
  state.currentPage = pageNum;
  lsSet(LS.pagePrefix + state.currentIssueId, String(pageNum));

  stopSpeech();
  preloadAdjacentPages(pageNum);

  const pageObj = state.data[pageNum - 1] || stubPage(pageNum);

  if (els.currentPageBadge) els.currentPageBadge.textContent = 'PAGE ' + String(pageNum).padStart(3, '0') + ' / ' + state.currentIssueObj.totalPages;
  if (els.currentSectionBadge) els.currentSectionBadge.textContent = toDisplayText(pageObj.section) || ('The Atlantic (Page ' + pageNum + ')');
  if (els.pageSlider) { els.pageSlider.max = state.currentIssueObj.totalPages; els.pageSlider.value = pageNum; }
  if (els.pageCounterText) els.pageCounterText.textContent = '第 ' + pageNum + ' / ' + state.currentIssueObj.totalPages + ' 页';
  announce('已翻到第 ' + pageNum + ' 页，共 ' + state.currentIssueObj.totalPages + ' 页');

  updateBookmarkButton(pageNum);

  if (els.pageOriginalImg) {
    els.pageOriginalImg.src = webpUrl(pageObj.image);
    const ss = webpSrcset(pageObj.image);
    if (ss) els.pageOriginalImg.srcset = ss;
    els.pageOriginalImg.loading = 'lazy';
    els.pageOriginalImg.decoding = 'async';
    imgWithWebFallback(els.pageOriginalImg);
    if (els.imageInfoTag) els.imageInfoTag.textContent = 'PAGE ' + String(pageNum).padStart(3, '0') + ' 原版高清扫描图 (150 DPI)';
    resetImageZoom();
  }

  const body = els.articleBody;
  if (body) {
    body.innerHTML = '';
    const segs = pageObj.segments || [];
    const totalEn = segs.reduce(function (a, s) { return a + (s.en ? s.en.length : 0); }, 0);
    const isShortVisual = segs.length === 0 || (segs.length <= 3 && totalEn < 450);
    const doc = document.createDocumentFragment();

    if (segs.length === 0) {
      renderArtCard(pageObj, pageNum, doc);
    } else if (isShortVisual) {
      renderShortVisualPage(pageObj, doc);
    } else {
      segs.forEach(function (seg, i) { doc.appendChild(renderSegmentNode(seg, i)); });
    }
    body.appendChild(doc);
    applyPageHighlights();
  }

  recordReadingHistory(state.currentIssueId, pageNum, pageObj.section);
  syncSidebarActiveState(pageNum);

  if (els.readerViewport) els.readerViewport.scrollTop = 0;
}

// ---------------------------------------------------------------- 灯箱 / 缩放
export function openLightboxImage(src) {
  if (!els.lightboxModal || !els.lightboxImg) return;
  els.lightboxImg.src = src;
  els.lightboxModal.classList.add('active');
  const c = els.lightboxModal.querySelector('.close-lightbox');
  if (c) c.focus();
}
export function resetImageZoom() {
  state.currentZoom = 1.0;
  if (els.pageOriginalImg) els.pageOriginalImg.style.transform = 'scale(1)';
}
export function zoomBy(delta) {
  state.currentZoom = Math.min(4, Math.max(0.5, state.currentZoom + delta));
  if (els.pageOriginalImg) els.pageOriginalImg.style.transform = 'scale(' + state.currentZoom + ')';
}
