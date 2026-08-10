/* ============================================================================
 * main.js — Entry module: DOM cache population, static event binding,
 * global keyboard map, online data upgrade, and boot sequence.
 *
 * esbuild bundles every module under src/ into a single IIFE that is written
 * to assets/js/reader_app.js. This preserves the project's file:// offline,
 * zero-runtime-dependency contract while giving us maintainable source.
 * ==========================================================================*/

import {
  state, els, LS, lsGet, $, $$, allIssues, escHtml, toast, confirmDialog,
  debounce, stripInvisibles, readFloat, readInt, HELD, THEMES, VERSION, scrollPage,
  applyIssueAccent,
} from './core.js';
import { pickVoice, playPageSpeech, stopSpeech, playParagraphSpeech } from './speech.js';
import {
  loadHighlights, saveHighlights, captureSelectionHighlight, applyPageHighlights,
  exportAllMarkdown, exportHighlightsMd,
} from './highlight.js';
import {
  applyFontScale, loadPage, switchIssue, nextIssueId, enterReaderRoom, openLibraryShelf, isManualIssue,
  initTOC, refreshPill, renderBookmarksTab, toggleBookmark, syncSidebarActiveState,
  openLightboxImage, zoomBy, resetImageZoom,
} from './reader.js';
import {
  getHistory, renderHistoryTab, renderContinueBanner, recordReadingHistory,
} from './history.js';
import {
  addWord, exportWordbookMd, clearWordbook, renderWordbookByDelegate, toggleWordbookModal,
} from './wordbook.js';
import { runSearch, bindSearchResultKeys, bindPortalSearch } from './search.js';
import {
  toggleSidebar, toggleSettingsPopover, applyAlignMode, toggleFont, toggleFullscreen,
  copyPageMarkdown, jumpFromInput, jumpToPage, applyTheme, setViewMode, toggleShortcutsModal,
  toggleHighlightsModal, clearHighlightsAll, removeHighlightByTs, renderAllHighlightsCounts,
  renderLibraryShelf, updateSpeedDisplays, cycleAudioSpeed,
} from './ui.js';
import { initA11y, announce } from './a11y.js';
import { exportLocalDataJson, importLocalData } from './data.js';
import { openManualEditor, handleManualCardAction } from './manual.js';

// 毒舌 1.2：els 由声明式 id 映射表生成，杜绝 50 行手写体力活与 typo 静默失效
const ELS_BY_ID = {
  libraryPortal: 'library-portal-view',
  openPortalBtn: 'open-portal-btn',
  appSidebar: 'app-sidebar',
  articleBody: 'article-body',
  pageOriginalImg: 'page-original-image',
  currentPageBadge: 'current-page-badge',
  currentSectionBadge: 'current-section-badge',
  pageSlider: 'page-slider',
  pageCounterText: 'page-counter-text',
  prevPageBtn: 'prev-page-btn',
  nextPageBtn: 'next-page-btn',
  tocList: 'toc-list',
  tocFilterBar: 'toc-filter-bar',
  pagesGrid: 'pages-grid',
  searchInput: 'global-search',
  searchTab: 'search-tab',
  searchResultsList: 'search-results-list',
  lightboxModal: 'lightbox-modal',
  lightboxImg: 'lightbox-img',
  copyPageBtn: 'copy-page-btn',
  bookmarkPageBtn: 'bookmark-page-btn',
  bookmarksList: 'bookmarks-list',
  playPageAudioBtn: 'play-page-audio-btn',
  audioSpeedBtn: 'audio-speed-btn',
  topAudioSpeedBtn: 'audio-speed-btn-top',
  fontToggleBtn: 'font-family-toggle',
  fontIncBtn: 'font-inc-btn',
  fontDecBtn: 'font-dec-btn',
  issueSwitcherPill: 'issue-switcher-pill',
  magazineShelfGrid: 'magazine-shelf-grid',
  shortcutsModal: 'shortcuts-help-modal',
  settingsBackdrop: 'settings-backdrop',
  settingsPopover: 'settings-popover-menu',
  moreSettingsBtn: 'more-settings-btn',
  alignModeToggle: 'align-mode-toggle',
  alignModeText: 'align-mode-text',
  fullscreenBtn: 'fullscreen-btn',
  zoomInBtn: 'zoom-in',
  zoomOutBtn: 'zoom-out',
  zoomResetBtn: 'zoom-reset',
  quickJumpBtn: 'quick-jump-go',
  clearHistoryBtn: 'clear-history-btn',
  portalSearch: 'portal-global-search',
  portalDropdown: 'portal-search-dropdown',
  toggleSidebarBtn: 'toggle-sidebar-btn',
  closeSidebarBtn: 'close-sidebar-btn',
  shortcutsOpenBtn: 'shortcuts-open-btn',
  exportAllBtn: 'export-all-btn',
  dataSyncExportBtn: 'data-sync-export-btn',
  dataSyncImportBtn: 'data-sync-import-btn',
  hlFloatBtn: null,
  wbFloatBtn: null,
  wordbookModal: 'wordbook-modal',
  wordbookList: 'wordbook-list',
  wordbookCount: 'wordbook-count',
  wordbookOpenBtn: 'wordbook-open-btn',
  wordbookExportBtn: 'wordbook-export-btn',
  wordbookClearBtn: 'wordbook-clear-btn',
  highlightsModal: 'highlights-modal',
  highlightsList: 'highlights-list',
  highlightsCount: 'highlights-count',
  highlightsClearBtn: 'highlights-clear-btn',
  highlightsExportBtn: 'highlights-export-btn',
  portalWordbookBtn: 'portal-wordbook-btn',
  portalHighlightsBtn: 'portal-highlights-btn',
  portalBookmarksBtn: 'portal-bookmarks-btn',
  imageInfoTag: 'image-info-tag',
  quickJumpInput: 'quick-jump-num',
  shortcutsVersion: 'shortcuts-version',
};
Object.keys(ELS_BY_ID).forEach(function (k) { els[k] = $(ELS_BY_ID[k]); });
els.readerViewport = document.querySelector('.reader-viewport');
els.closeShortcutsBtn = document.querySelector('.close-shortcuts-btn');
els.wordbookCloseBtn = document.querySelector('.close-wordbook-btn');
els.highlightsCloseBtn = document.querySelector('.close-highlights-btn');

// ---------------------------------------------------------------- 静态事件绑定（启动时执行一次，杜绝监听器累积）
function bindOne(id, fn) {
  const node = els[id];
  if (node) node.addEventListener('click', fn);
}

function bindStaticEvents() {
  // 书架：过滤 + 进入（委托）
  const portal = els.libraryPortal;
  if (portal && !portal.dataset.bound) {
    portal.dataset.bound = '1';
    portal.addEventListener('click', function (e) {
      const filterBtn = e.target.closest('.pub-filter-btn');
      if (filterBtn) {
        $$('.pub-filter-btn').forEach(function (b) { b.classList.remove('active'); });
        filterBtn.classList.add('active');
        state.currentPubFilter = filterBtn.dataset.pub;
        renderLibraryShelf();
        return;
      }
      // 手建文库动作（新建 / 编辑 / 导出 / 删除）优先于“进入阅读”
      const actBtn = e.target.closest('[data-act]');
      if (actBtn) {
        const act = actBtn.dataset.act;
        if (act === 'new') { openManualEditor(null); return; }
        if (actBtn.dataset.issue) { handleManualCardAction(act, actBtn.dataset.issue); return; }
      }
      const enterBtn = e.target.closest('.shelf-enter-btn');
      const card = e.target.closest('.shelf-issue-card');
      const target = enterBtn || card;
      if (target && target.dataset && target.dataset.issue) {
        const jump = parseInt(target.dataset.page, 10);
        enterReaderRoom(target.dataset.issue, jump > 0 ? jump : 1);
      }
    });
    portal.addEventListener('keydown', function (e) {
      const card = e.target.closest('.shelf-issue-card');
      if (!card || !(e.key === 'Enter' || e.key === ' ')) return;
      e.preventDefault();
      if (card.dataset.act === 'new') { openManualEditor(null); return; }
      enterReaderRoom(card.dataset.issue, 1);
    });
  }

  // 目录过滤条（委托）
  const filterBar = els.tocFilterBar;
  if (filterBar && !filterBar.dataset.bound) {
    filterBar.dataset.bound = '1';
    filterBar.addEventListener('click', function (e) {
      const btn = e.target.closest('.toc-filter-btn');
      if (!btn) return;
      $$('.toc-filter-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      const filter = btn.dataset.filter || 'all';
      $$('#toc-list .toc-item').forEach(function (item) {
        item.style.display = (filter === 'all' || item.dataset.type === filter) ? '' : 'none';
      });
    });
  }

  // 目录点击
  const tocList = els.tocList;
  if (tocList && !tocList.dataset.bound) {
    tocList.dataset.bound = '1';
    tocList.addEventListener('click', function (e) {
      const item = e.target.closest('.toc-item');
      if (item && item.dataset.page) jumpToPage(parseInt(item.dataset.page, 10));
    });
    tocList.addEventListener('keydown', function (e) {
      const item = e.target.closest('.toc-item');
      if (item && item.dataset.page && (e.key === 'Enter')) { e.preventDefault(); jumpToPage(parseInt(item.dataset.page, 10)); }
    });
  }

  // 缩略图格
  const pagesGrid = els.pagesGrid;
  if (pagesGrid && !pagesGrid.dataset.bound) {
    pagesGrid.dataset.bound = '1';
    pagesGrid.addEventListener('click', function (e) {
      const tile = e.target.closest('.page-tile');
      if (tile && tile.dataset.page) jumpToPage(parseInt(tile.dataset.page, 10));
    });
  }

  // 书签列表（复用目录样式，点击直达）
  const bm = els.bookmarksList;
  if (bm && !bm.dataset.bound) {
    bm.dataset.bound = '1';
    bm.addEventListener('click', function (e) {
      const item = e.target.closest('.toc-item');
      if (item && item.dataset.page) jumpToPage(parseInt(item.dataset.page, 10));
    });
  }

  // 主功能按钮
  bindOne('openPortalBtn', openLibraryShelf);
  bindOne('toggleSidebarBtn', toggleSidebar);
  bindOne('closeSidebarBtn', toggleSidebar);
  bindOne('prevPageBtn', function () { loadPage(state.currentPage - 1); });
  bindOne('nextPageBtn', function () { loadPage(state.currentPage + 1); });
  bindOne('bookmarkPageBtn', function () { toggleBookmark(state.currentPage); });
  bindOne('playPageAudioBtn', playPageSpeech);
  bindOne('moreSettingsBtn', function (e) { e.stopPropagation(); toggleSettingsPopover(); });
  bindOne('alignModeToggle', function () { applyAlignMode(state.currentAlignModeInternal === 'flush' ? 'justify' : 'flush'); });
  bindOne('fontToggleBtn', toggleFont);
  bindOne('fontIncBtn', function () { applyFontScale(state.globalFontScale + 1.5); });
  bindOne('fontDecBtn', function () { applyFontScale(state.globalFontScale - 1.5); });
  bindOne('fullscreenBtn', toggleFullscreen);
  bindOne('copyPageBtn', copyPageMarkdown);
  bindOne('quickJumpBtn', jumpFromInput);
  bindOne('issueSwitcherPill', function () { switchIssue(nextIssueId()); });
  bindOne('topAudioSpeedBtn', cycleAudioSpeed);
  bindOne('audioSpeedBtn', cycleAudioSpeed);
  bindOne('zoomInBtn', function () { zoomBy(0.25); });
  bindOne('zoomOutBtn', function () { zoomBy(-0.25); });
  bindOne('zoomResetBtn', resetImageZoom);
  bindOne('closeShortcutsBtn', toggleShortcutsModal);
  bindOne('shortcutsOpenBtn', toggleShortcutsModal);
  if (els.settingsBackdrop) els.settingsBackdrop.addEventListener('click', function () { toggleSettingsPopover(false); });

  const openLightboxNode = $('open-lightbox');
  if (openLightboxNode) openLightboxNode.addEventListener('click', function () {
    if (els.pageOriginalImg) openLightboxImage(els.pageOriginalImg.src);
  });

  // 视图切换
  $$('.view-btn').forEach(function (b) { b.addEventListener('click', function () { setViewMode(b.dataset.view); }); });
  // 主题卡
  $$('.popover-theme-card').forEach(function (c) { c.addEventListener('click', function () { applyTheme(c.dataset.theme); }); });
  // Tab 切换
  $$('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      $$('.tab-pane').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      const pane = $('tab-' + btn.dataset.tab);
      if (pane) {
        pane.classList.add('active');
        if (btn.dataset.tab === 'history') renderHistoryTab();
        else if (btn.dataset.tab === 'bookmarks') renderBookmarksTab();
        syncSidebarActiveState(state.currentPage);
      }
    });
  });

  // 模态关闭（点背景）
  if (els.lightboxModal) els.lightboxModal.addEventListener('click', function (e) {
    if (e.target === els.lightboxModal) els.lightboxModal.classList.remove('active');
  });
  if (els.shortcutsModal) els.shortcutsModal.addEventListener('click', function (e) {
    if (e.target === els.shortcutsModal) els.shortcutsModal.classList.remove('active');
  });

  // 品牌徽标 → 回馆
  const brand = document.querySelector('.magazine-brand');
  if (brand) brand.addEventListener('click', openLibraryShelf);

  // 继续阅读按卡片（毒舌 7.12：addEventListener 委托，而非每帧 onclick 覆盖）
  const hero = $('continue-reading-hero');
  if (hero && !hero.dataset.bound) {
    hero.dataset.bound = '1';
    hero.addEventListener('click', function () {
      const h = getHistory();
      if (h.length > 0) enterReaderRoom(h[0].issueId, h[0].page);
    });
  }

  // 键盘
  window.addEventListener('keydown', handleGlobalKeyDown, true);

  // 剪贴板净化器（全局唯一，binding 一次）
  document.addEventListener('copy', function (e) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const clean = stripInvisibles(sel.toString());
    if (e.clipboardData) { e.clipboardData.setData('text/plain', clean); e.preventDefault(); }
  });

  // 移动端点按正文自动收侧栏
  if (els.readerViewport) els.readerViewport.addEventListener('click', function () {
    if (window.innerWidth <= 900 && els.appSidebar && !els.appSidebar.classList.contains('collapsed')) {
      els.appSidebar.classList.add('collapsed');
    }
  });

  // 轻点朗读 / 原图灯箱：正文委托「一次性」绑定（毒舌 1.10 —— 不再用 body._tapspeak 存状态）
  const ab = els.articleBody;
  if (ab && !ab.dataset.boundTap) {
    ab.dataset.boundTap = '1';
    ab.addEventListener('click', function (e) {
      const hlMark = e.target.closest('mark.page-highlight');
      if (hlMark) {
        const block = hlMark.closest('.segment-block');
        if (block) {
          const segIdx = parseInt(block.id.replace('seg-', ''), 10);
          if (!isNaN(segIdx)) {
            const enEl = block.querySelector('.en-text');
            if (enEl) {
              // 计算被包裹文本在目标容器（en/zh）文本流中的绝对偏移
              const inZh = hlMark.closest('.zh-text-card') !== null;
              const targetEl = inZh ? (block.querySelector('.zh-text-card > div:first-child') || enEl) : enEl;
              let before = 0, total = 0;
              (function scan(el) {
                el.childNodes.forEach(function (c) {
                  if (c === hlMark) { before = total; }
                  if (c.nodeType === Node.TEXT_NODE) total += (c.nodeValue || '').length;
                  else if (c.nodeType === Node.ELEMENT_NODE && !c.classList.contains('page-highlight')) scan(c);
                });
              })(targetEl);
              const markLen = (hlMark.textContent || '').length;
              const hls0 = loadHighlights();
              saveHighlights(hls0.filter(function (h) {
                return !(h.issue === state.currentIssueId && h.page === state.currentPage && h.seg === segIdx &&
                  h.lang === (inZh ? 'zh' : 'en') && h.start === before && h.end === before + markLen);
              }));
              // 物理移除 mark（保留文本）
              const frag = document.createDocumentFragment();
              while (hlMark.firstChild) frag.appendChild(hlMark.firstChild);
              hlMark.parentNode.replaceChild(frag, hlMark);
              applyPageHighlights();
            }
          }
        }
        return;
      }
      const enCard = e.target.closest('.en-text');
      if (enCard) {
        const block = enCard.closest('.segment-block');
        if (block) {
          const segs = (state.data[state.currentPage - 1] || {}).segments || [];
          const target = segs[parseInt(block.id.replace('seg-', ''), 10)];
          if (target) {
            if (block.classList.contains('playing-active')) { stopSpeech(); toast('⏸ 朗读已暂停'); }
            else playParagraphSpeech(target.en, block);
          }
        }
        return;
      }
      const artWrap = e.target.closest('.embedded-art-img-wrap');
      if (artWrap) {
        const img = artWrap.querySelector('img');
        if (img) openLightboxImage(img.src);
      }
    });
  }

  // 触屏滑动手势翻页（移动端；手指跟随 + 速度阈值 + 越界回弹 + 方向修正 + 单页文章不接管）
  if (els.readerViewport) {
    const vp = els.readerViewport;
    const FLIP_MS = 240;
    const VELOCITY_FLIP = 0.3; // px/ms：快速甩动即翻页（≈300px/s）
    let sx = 0, sy = 0, st = 0, active = false, locked = false, horiz = false, lastMove = 0;
    vp.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { active = false; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = e.timeStamp;
      active = true; locked = false; horiz = false;
      vp.style.transition = 'none';
    }, { passive: true });
    vp.addEventListener('touchmove', function (e) {
      if (!active) return;
      const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      if (!locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        const horizontalIntent = Math.abs(dx) > Math.abs(dy);
        // 单篇流式文章（自选/自建）无翻页概念：水平手势不接管，放行原生行为（纵向滚动等）
        if (horizontalIntent && isManualIssue(state.currentIssueObj)) { horiz = false; locked = true; return; }
        horiz = horizontalIntent; locked = true;
      }
      if (!horiz) return; // 纵向手势放行，保留正常滚动
      e.preventDefault();
      let move = dx;
      const total = state.currentIssueObj.totalPages || 0;
      if ((state.currentPage <= 1 && dx > 0) || (state.currentPage >= total && dx < 0)) move = dx * 0.35; // 边界阻尼
      vp.style.transform = 'translateX(' + move + 'px)';
      lastMove = move;
    }, { passive: false });
    vp.addEventListener('touchend', function (e) {
      if (!active) return; active = false;
      const dx = e.changedTouches[0].clientX - sx;
      const dt = Math.max(1, e.timeStamp - st), v = dx / dt;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        // 本次为文本选择（选词/选段），不翻页，平滑归位
        vp.style.transition = 'transform ' + FLIP_MS + 'ms ease';
        vp.style.transform = 'translateX(0)'; horiz = false; return;
      }
      const total = state.currentIssueObj.totalPages || 1;
      const atBoundary = (dx > 0 && state.currentPage <= 1) || (dx < 0 && state.currentPage >= total);
      const commit = horiz && !isManualIssue(state.currentIssueObj) && !atBoundary && (Math.abs(dx) > window.innerWidth * 0.33 || Math.abs(v) > VELOCITY_FLIP);
      vp.style.transition = 'transform ' + FLIP_MS + 'ms cubic-bezier(.22,.61,.36,1)';
      if (commit) {
        const goNext = dx < 0;                                   // 左滑=下一页，右滑=上一页
        const W = window.innerWidth;
        const outX = (goNext ? -1 : 1) * W;                     // 旧页沿手指方向滑出
        const inX = (lastMove || 0) + (goNext ? W : -W);         // 新页紧贴旧页起始处对侧进入，两层全程无缝拼合（不留缝隙）
        // 快照当前页作为覆盖层：滑动全程由「旧页滑出 + 新页滑入」两层拼满屏幕，底层永不留白
        const snap = vp.cloneNode(true);
        snap.classList.add('flip-snap');
        snap.removeAttribute('id');
        snap.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
        snap.style.position = 'fixed';
        const r = vp.getBoundingClientRect();
        snap.style.top = r.top + 'px';
        snap.style.left = r.left + 'px';
        snap.style.width = r.width + 'px';
        snap.style.height = r.height + 'px';
        snap.style.margin = '0';
        snap.style.zIndex = '50';
        snap.style.pointerEvents = 'none';
        snap.style.transition = 'none';
        snap.style.transform = 'translateX(' + (lastMove || 0) + 'px)'; // 从手指停留处继续滑出，无缝衔接
        snap.scrollTop = vp.scrollTop;
        vp.parentNode.insertBefore(snap, vp.nextSibling);
        // 立即加载新页（此刻被快照完全覆盖，无闪烁）
        loadPage(state.currentPage + (goNext ? 1 : -1));
        vp.style.transition = 'none';
        vp.style.transform = 'translateX(' + inX + 'px)';
        void vp.offsetWidth; // 强制重排，确保起始位置生效
        requestAnimationFrame(function () {
          const ease = 'cubic-bezier(.22,.61,.36,1)';
          snap.style.transition = 'transform ' + FLIP_MS + 'ms ' + ease;
          snap.style.transform = 'translateX(' + outX + 'px)';
          vp.style.transition = 'transform ' + FLIP_MS + 'ms ' + ease;
          vp.style.transform = 'translateX(0)';
        });
        let cleaned = false;
        const cleanup = function () {
          if (cleaned) return; cleaned = true;
          if (snap.parentNode) snap.parentNode.removeChild(snap);
          vp.style.transition = '';
          vp.style.transform = '';
        };
        vp.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, FLIP_MS + 90);
      } else {
        vp.style.transform = 'translateX(0)'; // 越界回弹
      }
      horiz = false;
    }, { passive: true });
  }

  // 字号记忆恢复
  const saved = readFloat(LS.fontScale, 0);
  if (saved > 0) applyFontScale(saved);
  else applyFontScale(state.globalFontScale);

  // 选文浮动条（毒舌 7.2 增强）：mouseup / selectionchange / touchend 三通道驱动。
  // 选中英文段落 → 「🔖 高亮」；单选英文单词 → 追加「📖 生词」；选中中文 → 仅高亮（双语高亮 v2.4）
  function removeSelectionToolbar() {
    if (els.hlFloatBtn) { els.hlFloatBtn.remove(); els.hlFloatBtn = null; }
    if (els.wbFloatBtn) { els.wbFloatBtn.remove(); els.wbFloatBtn = null; }
  }
  function selectionInsideBody() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const rg = sel.getRangeAt(0);
    let el = rg.startContainer;
    if (el.nodeType === Node.TEXT_NODE) el = el.parentElement;
    if (!el || !els.articleBody || !els.articleBody.contains(el)) return null;
    return { rg: rg, sel: sel };
  }
  function showSelectionToolbar() {
    const ctx = selectionInsideBody();
    if (!ctx) { removeSelectionToolbar(); return; }
    const rect = ctx.rg.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    if (els.hlFloatBtn) {
      els.hlFloatBtn.style.top = Math.max(8, rect.top - 38) + 'px';
      els.hlFloatBtn.style.left = Math.max(8, rect.left + rect.width / 2 - 34) + 'px';
      if (els.wbFloatBtn) {
        els.wbFloatBtn.style.top = els.hlFloatBtn.style.top;
        els.wbFloatBtn.style.left = Math.min(window.innerWidth - 62, parseFloat(els.hlFloatBtn.style.left) + 74) + 'px';
      }
      return;
    }
    const floatBtn = document.createElement('button');
    floatBtn.type = 'button';
    floatBtn.className = 'hl-float-btn';
    floatBtn.textContent = '🔖 高亮';
    floatBtn.setAttribute('aria-label', '高亮选中文本');
    floatBtn.style.top = Math.max(8, rect.top - 38) + 'px';
    floatBtn.style.left = Math.max(8, rect.left + rect.width / 2 - 34) + 'px';
    floatBtn.addEventListener('click', function () {
      captureSelectionHighlight();
      removeSelectionToolbar();
    });
    document.body.appendChild(floatBtn);
    els.hlFloatBtn = floatBtn;
    const selText = ctx.sel.toString().trim();
    const wordMatch = /^[A-Za-z][A-Za-z'-]*$/.test(selText);
    if (wordMatch) {
      const wordBtn = document.createElement('button');
      wordBtn.type = 'button';
      wordBtn.className = 'wb-float-btn';
      wordBtn.textContent = '📖 生词';
      wordBtn.setAttribute('aria-label', '收藏生词');
      wordBtn.style.top = floatBtn.style.top;
      wordBtn.style.left = Math.min(window.innerWidth - 62, parseFloat(floatBtn.style.left) + 74) + 'px';
      wordBtn.addEventListener('click', function () {
        addWord(selText);
        window.getSelection().removeAllRanges();
        removeSelectionToolbar();
      });
      document.body.appendChild(wordBtn);
      els.wbFloatBtn = wordBtn;
    }
  }
  let selectionToolbarTimer = null;
  function scheduleSelectionToolbar() {
    if (selectionToolbarTimer) clearTimeout(selectionToolbarTimer);
    selectionToolbarTimer = setTimeout(showSelectionToolbar, 30);
  }
  // 桌面 mouseup：同步显示（即时响应 + 冒烟/回归测试同步断言依赖）
  document.addEventListener('mouseup', showSelectionToolbar);
  document.addEventListener('selectionchange', scheduleSelectionToolbar);
  let touchToolbarTimer = null;
  document.addEventListener('touchend', function () {
    // 触屏拖动选词后可能无 mouseup（部分 Android WebView），用 touchend 兜底
    if (touchToolbarTimer) clearTimeout(touchToolbarTimer);
    touchToolbarTimer = setTimeout(showSelectionToolbar, 80);
  }, { passive: true });

  bindOne('exportAllBtn', exportAllMarkdown);

  // 生词本：开关/清空/导出/列表委托（毒舌 7.2）
  bindOne('wordbookOpenBtn', toggleWordbookModal);
  if (els.wordbookExportBtn) els.wordbookExportBtn.addEventListener('click', exportWordbookMd);
  if (els.wordbookClearBtn) els.wordbookClearBtn.addEventListener('click', clearWordbook);
  if (els.wordbookCloseBtn) els.wordbookCloseBtn.addEventListener('click', toggleWordbookModal);
  if (els.wordbookList) els.wordbookList.addEventListener('click', renderWordbookByDelegate);
  if (els.wordbookModal) els.wordbookModal.addEventListener('click', function (e) {
    if (e.target === els.wordbookModal) els.wordbookModal.classList.remove('active');
  });

  // 数据备份/还原（跨设备同步的离线形态）
  bindOne('dataSyncExportBtn', exportLocalDataJson);
  bindOne('dataSyncImportBtn', function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) importLocalData(input.files[0]);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });

  // 我的高亮弹窗（全局回顾 + 删除 + 导出 + 清空）
  bindOne('portalHighlightsBtn', toggleHighlightsModal);
  bindOne('highlightsExportBtn', exportHighlightsMd);
  bindOne('highlightsClearBtn', clearHighlightsAll);
  if (els.highlightsCloseBtn) els.highlightsCloseBtn.addEventListener('click', toggleHighlightsModal);
  if (els.highlightsModal) els.highlightsModal.addEventListener('click', function (e) {
    if (e.target === els.highlightsModal) els.highlightsModal.classList.remove('active');
  });
  if (els.highlightsList) els.highlightsList.addEventListener('click', function (e) {
    if (e.target.closest('.wordbook-del-btn')) {
      e.stopPropagation();
      const ts = e.target.closest('.wordbook-del-btn').dataset.delHighlight;
      if (ts !== undefined) removeHighlightByTs(ts);
    }
  });

  // 门户「我的数据」：生词本 / 高亮 / 书签入口
  bindOne('portalWordbookBtn', toggleWordbookModal);
  bindOne('portalHighlightsBtn', toggleHighlightsModal);
  bindOne('portalBookmarksBtn', function () {
    const portalVisible = els.libraryPortal && !els.libraryPortal.classList.contains('hidden');
    if (portalVisible) enterReaderRoom(state.currentIssueId, state.currentPage);
    if (els.appSidebar) els.appSidebar.classList.remove('collapsed');
    $$('.tab-btn').forEach(function (b) {
      const on = b.dataset.tab === 'bookmarks';
      b.classList.toggle('active', on);
      const pane = $('tab-' + b.dataset.tab);
      if (pane) pane.classList.toggle('active', on);
    });
    renderBookmarksTab();
  });
  renderAllHighlightsCounts();
}

// ---------------------------------------------------------------- 全局键盘映射（毒舌 2.3/2.4：vim 风 + 阅读快捷键）
function handleGlobalKeyDown(e) {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
  if (isTyping) {
    if (e.key === 'Escape') { activeEl.blur(); e.preventDefault(); }
    return;
  }
  const key = (e.key || '').toLowerCase();
  const code = e.code || '';

  const shelfOpen = els.libraryPortal && !els.libraryPortal.classList.contains('hidden');
  if (shelfOpen) {
    if (code === 'Enter') { e.preventDefault(); enterReaderRoom(state.currentIssueId, 1); return; }
  }

  if (code === 'Space' || key === ' ') {
    e.preventDefault();
    scrollPage(e.shiftKey ? -window.innerHeight * 0.6 : window.innerHeight * 0.6);
  } else if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') { e.preventDefault(); scrollPage(-260); }
  else if (code === 'KeyS' || key === 's' || code === 'ArrowDown') { e.preventDefault(); scrollPage(260); }
  // 毒舌 2.3：对齐 vim 惯例——G 到底部 / Shift+G 回顶部（键盘速查表已同步）
  else if (code === 'KeyG' && e.shiftKey) { e.preventDefault(); scrollPage(-1e9); }
  else if (code === 'KeyG' && !e.shiftKey) { e.preventDefault(); scrollPage(1e9); }
  else if (code === 'Digit1' || key === '1') { e.preventDefault(); setViewMode('interlinear'); }
  else if (code === 'Digit2' || key === '2') { e.preventDefault(); setViewMode('split'); }
  else if (code === 'Digit3' || key === '3') { e.preventDefault(); setViewMode('en-only'); }
  else if (code === 'Digit4' || key === '4') { e.preventDefault(); setViewMode('zh-only'); }
  else if (code === 'KeyM' || key === 'm') { e.preventDefault(); switchIssue(nextIssueId()); }
  else if ((code === 'KeyJ' || code === 'ArrowRight' || code === 'PageDown') && !isManualIssue(state.currentIssueObj)) {
    e.preventDefault();
    if (!state.isNavigating) { state.isNavigating = true; loadPage(state.currentPage + 1); setTimeout(function () { state.isNavigating = false; }, HELD.JUMP_LOCK_MS); }
  } else if ((code === 'KeyK' || code === 'ArrowLeft' || code === 'PageUp') && !isManualIssue(state.currentIssueObj)) {
    e.preventDefault();
    if (!state.isNavigating) { state.isNavigating = true; loadPage(state.currentPage - 1); setTimeout(function () { state.isNavigating = false; }, HELD.JUMP_LOCK_MS); }
  } else if (code === 'KeyT' || key === 't') { e.preventDefault(); toggleSidebar(e); }
  else if (e.key === '?' || (e.shiftKey && code === 'Slash')) { e.preventDefault(); toggleShortcutsModal(); }
  else if (code === 'Escape' || key === 'escape') {
    const sb = els.appSidebar;
    if (els.shortcutsModal && els.shortcutsModal.classList.contains('active')) { els.shortcutsModal.classList.remove('active'); return; }
    if (els.wordbookModal && els.wordbookModal.classList.contains('active')) { els.wordbookModal.classList.remove('active'); return; }
    if (els.highlightsModal && els.highlightsModal.classList.contains('active')) { els.highlightsModal.classList.remove('active'); return; }
    if (els.lightboxModal && els.lightboxModal.classList.contains('active')) { els.lightboxModal.classList.remove('active'); return; }
    if (els.settingsPopover && els.settingsPopover.classList.contains('active')) { toggleSettingsPopover(false); return; }
    if (sb && !sb.classList.contains('collapsed')) { sb.classList.add('collapsed'); toast('📋 目录已收起'); }
    else openLibraryShelf();
  } else if (code === 'KeyB' || key === 'b') { e.preventDefault(); toggleBookmark(state.currentPage); }
  else if (code === 'KeyP' || key === 'p') { e.preventDefault(); playPageSpeech(); }
  // 毒舌 2.4：F 直接调函数，不绕按钮模拟点击
  else if (code === 'KeyF' || key === 'f') { e.preventDefault(); toggleFullscreen(); }
  else if (code === 'KeyE' || key === 'e') { e.preventDefault(); exportAllMarkdown(); }
  else if (code === 'KeyL' || key === 'l') { e.preventDefault(); toggleWordbookModal(); }
  else if (code === 'KeyH' || key === 'h') { e.preventDefault(); openLibraryShelf(); }

  // 其余按键原样放行（无死语句 —— 毒舌 6.5）
}

// ---------------------------------------------------------------- 数据增强（毒舌 5.1：HTTP 下 fetch 增量刷新，离线 file:// 仍走内联兜底）
function upgradeOnlineData() {
  const proto = location.protocol;
  if (proto !== 'http:' && proto !== 'https:') return;
  fetch('assets/data/magazines.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
    .then(function (json) {
      if (!json || typeof json !== 'object') return;
      let changed = false;
      Object.keys(json).forEach(function (id) {
        if (!allIssues[id]) { allIssues[id] = json[id]; changed = true; }
      });
      if (!changed) return;
      state.searchIndexCache = null;
      if (els.magazineShelfGrid) renderLibraryShelf();
      state.currentIssueObj = allIssues[state.currentIssueId] || { id: '', pages: [], totalPages: 0, displayName: '未加载' };
      state.data = state.currentIssueObj.pages || [];
      if (els.tocList) initTOC();
      refreshPill();
    })
    .catch(function () { /* 离线/失败：保持内联数据 */ });
}

// ==================================================================
// 启动
// ==================================================================
function boot() {
  // 主题初值（无记忆时跟随系统）
  const storedTheme = lsGet(LS.theme, '');
  const initTheme = THEMES.indexOf(storedTheme) >= 0 ? storedTheme
    : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initTheme);
  $$('.popover-theme-card').forEach(function (c) { c.classList.toggle('active', c.dataset.theme === initTheme); });

  // 字体模式（毒舌 7.4：自托管 NewCM08 + 思源宋体，默认即出版级衬线）
  if (lsGet(LS.font, 'sans') === 'serif') { state.isSerifMode = true; document.body.classList.add('font-mode-serif'); if (els.fontToggleBtn) els.fontToggleBtn.textContent = '🔠 典雅衬线'; }

  // 视图 / 对齐还原
  setViewMode(lsGet(LS.view, 'interlinear'));
  applyAlignMode(lsGet(LS.align, 'flush'));
  updateSpeedDisplays();
  initA11y();

  // PWA：仅 HTTP(S) 下注册 Service Worker（file:// 离线双击不支持 SW）
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* 注册失败不阻塞应用 */ });
    });
  }

  // 侧栏默认收起
  if (els.appSidebar) els.appSidebar.classList.add('collapsed');

  // 初始刊物主题色注入（英文主卡 / 中文辅读框据此染色）
  applyIssueAccent();

  bindStaticEvents();
  bindPortalSearch();
  renderLibraryShelf();
  renderBookmarksTab();
  initTOC();
  refreshPill();

  // 滑块：杂志=翻页；单篇流式文章（自选/自建）= 阅读百分比指示器
  if (els.pageSlider) {
    els.pageSlider.addEventListener('input', function () {
      if (state.currentIssueObj && isManualIssue(state.currentIssueObj)) {
        const pct = parseInt(els.pageSlider.value, 10) || 0;
        if (els.pageCounterText) els.pageCounterText.textContent = '进度 ' + pct + '%';
        sliderProgrammatic = true;
        scrollViewportToPercent(pct);
        scheduleSliderRelease();
      } else {
        if (els.pageCounterText) els.pageCounterText.textContent = '第 ' + els.pageSlider.value + ' / ' + state.currentIssueObj.totalPages + ' 页';
      }
    });
    els.pageSlider.addEventListener('change', function () {
      const v = parseInt(els.pageSlider.value, 10);
      if (state.currentIssueObj && isManualIssue(state.currentIssueObj)) {
        scrollViewportToPercent(v);
      } else if (v && v !== state.currentPage) {
        loadPage(v);
      }
    });
  }

  // 单篇流式文章（自选/自建）：底部滑块改为「阅读百分比」指示器，随滚动实时更新
  let sliderProgrammatic = false;
  function scrollViewportToPercent(pct) {
    const vp = els.readerViewport;
    if (!vp) return;
    const max = vp.scrollHeight - vp.clientHeight;
    if (max <= 0) return;
    vp.scrollTop = Math.max(0, Math.min(max, Math.round(max * (pct / 100))));
  }
  function scheduleSliderRelease() {
    requestAnimationFrame(function () { requestAnimationFrame(function () { sliderProgrammatic = false; }); });
  }
  function updateManualScrollProgress() {
    if (!state.currentIssueObj || !isManualIssue(state.currentIssueObj)) return;
    const vp = els.readerViewport;
    if (!vp || !els.pageSlider) return;
    const max = vp.scrollHeight - vp.clientHeight;
    const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((vp.scrollTop / max) * 100))) : 100;
    if (!sliderProgrammatic) els.pageSlider.value = pct;
    if (els.pageCounterText) els.pageCounterText.textContent = '进度 ' + pct + '%';
  }
  if (els.readerViewport) {
    els.readerViewport.addEventListener('scroll', function () { updateManualScrollProgress(); }, { passive: true });
  }

  // 侧栏检索（防抖 + 索引）
  if (els.searchInput) {
    bindSearchResultKeys(els.searchInput, '#search-results-list .toc-item', function (el) {
      jumpToPage(parseInt(el.dataset.page, 10));
    });
    els.searchInput.addEventListener('input', debounce(function () {
      const q = els.searchInput.value.trim();
      const listEls = els.searchResultsList;
      if (!listEls) return;
      if (q.length < 2) { if (els.searchTab) els.searchTab.style.display = 'none'; return; }
      if (els.searchTab) { els.searchTab.style.display = 'block'; els.searchTab.click(); }
      listEls.innerHTML = '';
      const results = runSearch(q, state.currentIssueId).slice(0, 30);
      if (results.length === 0) {
        listEls.innerHTML = '<div style="padding:14px;font-size:12px;color:var(--text-muted);">未检索到匹配内容</div>';
        return;
      }
      const frag = document.createDocumentFragment();
      results.forEach(function (r) {
        const d = document.createElement('div');
        d.className = 'toc-item';
        d.dataset.page = String(r.pageNum);
        d.setAttribute('role', 'button');
        d.innerHTML =
          '<div class="toc-item-header"><span>PAGE ' + String(r.pageNum).padStart(3, '0') + '</span>' +
          '<span>' + escHtml(r.section) + '</span></div>' +
          '<div class="toc-item-title">' + r.snippet.slice(0, 200) + '...</div>';
        d.addEventListener('click', function () { jumpToPage(r.pageNum); });
        frag.appendChild(d);
      });
      listEls.appendChild(frag);
      announce(results.length + ' 条搜索结果');
    }, HELD.SEARCH_DEBOUNCE));
  }

  // 清空历史（自定义模态）
  bindOne('clearHistoryBtn', function () {
    confirmDialog({
      title: '清空全部阅读足迹？',
      message: '此操作不可撤销，将删除全部期刊的阅读历史记录。',
      okText: '清空',
      danger: true,
    }).then(function (ok) {
      if (ok) { localStorage.removeItem(LS.history); renderContinueBanner(); renderHistoryTab(); toast('🗑️ 阅读足迹已清空'); }
    });
  });

  // 历史首次初始化
  if (getHistory().length === 0) {
    const initPage = readInt(lsGet(LS.pagePrefix + state.currentIssueId, '1'), 1);
    recordReadingHistory(state.currentIssueId, initPage, (state.data[initPage - 1] && state.data[initPage - 1].section) || 'Cover');
  }
  renderContinueBanner();
  renderHistoryTab();

  // TTS 嗓音预热（毒舌 7.8：== null 更稳健，兼容 undefined）
  if (window.speechSynthesis) {
    state.ttsVoice = pickVoice();
    if (window.speechSynthesis.onvoiceschanged == null) {
      window.speechSynthesis.onvoiceschanged = function () { state.ttsVoice = pickVoice(); };
    }
  }

  // VERSION 不再死代码（毒舌 6.5）：显示在快捷键速查页脚
  if (els.shortcutsVersion) els.shortcutsVersion.textContent = 'The Atlantic Reader v' + VERSION;

  // HTTP 环境异步增量加载外部 JSON（毒舌 5.1）
  upgradeOnlineData();

  // 暴露 API
  window.loadPage = loadPage;
  window.switchIssue = switchIssue;
  window.enterReaderRoom = enterReaderRoom;
  window.openLibraryShelf = openLibraryShelf;
  window.toggleSidebar = toggleSidebar;
  window.toggleShortcutsModal = toggleShortcutsModal;
  window.readerVersion = VERSION;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
