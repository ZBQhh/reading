// === The Atlantic Grand 24px Digital Reader Script ($20/mo Tier) ===
(function() {
  const allIssues = window.ALL_ISSUES || {};
  let currentPubFilter = 'all';
  let currentIssueId = localStorage.getItem('atlantic_reader_issue') || "2026-08";
  if (!allIssues[currentIssueId]) {
    currentIssueId = Object.keys(allIssues)[0] || "2026-08";
  }

  let currentIssueObj = allIssues[currentIssueId] || { pages: [] };
  let data = currentIssueObj.pages || [];
  let currentPage = 1;
  let currentZoom = 1.0;
  let globalFontSize = 22.0; // Universal 1:1 Global Base Scale
  let speechSynth = window.speechSynthesis;
  let currentUtterance = null;
  let isPlayingAudio = false;
  const STORAGE_KEY_SPEED = 'atlantic_reader_audio_speed';
  let audioSpeed = parseFloat(localStorage.getItem(STORAGE_KEY_SPEED)) || 1.0;
  let currentPlayingSegmentDiv = null;
  let isSerifMode = false;
  let currentViewMode = localStorage.getItem('atlantic_reader_view') || 'interlinear';
  let isNavigating = false; // Lock to guarantee strict 1:1 page turns without double-firing jumps

  // LocalStorage Keys
  const STORAGE_KEY_PAGE_PREFIX = 'atlantic_reader_last_page_';
  const STORAGE_KEY_THEME = 'atlantic_reader_theme';
  const STORAGE_KEY_VIEW = 'atlantic_reader_view';
  const STORAGE_KEY_FONT = 'atlantic_reader_font_mode';
  const STORAGE_KEY_BOOKMARKS_PREFIX = 'atlantic_reader_bookmarks_';
  const STORAGE_KEY_ISSUE = 'atlantic_reader_issue';

  // HUD Toast Trigger
  function showHUDToast(msg) {
    let toast = document.getElementById('reader-hud-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'reader-hud-toast';
      toast.className = 'reader-hud-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 1200);
  }

  // Smooth Scroll Helper (Guaranteed across Library Portal and Reader Viewport)
  function scrollPage(delta) {
    const portal = document.getElementById('library-portal-view');
    if (portal && !portal.classList.contains('hidden')) {
      portal.scrollTop += delta;
      return;
    }

    const vp = document.querySelector('.reader-viewport');
    if (vp) {
      vp.scrollTop += delta;
    }
    window.scrollBy(0, delta);
  }

  // Zero-Delay Scan Image Preloader
  function preloadAdjacentPages(pNum) {
    const prevP = pNum - 1;
    const nextP = pNum + 1;
    const folder = currentIssueObj.id === '2026-08' ? 'issues/2026-08' : 'issues/2026-07';

    if (prevP >= 1) {
      const imgPrev = new Image();
      imgPrev.src = `${folder}/images/page_${String(prevP).padStart(3, '0')}.png`;
    }
    if (nextP <= currentIssueObj.totalPages) {
      const imgNext = new Image();
      imgNext.src = `${folder}/images/page_${String(nextP).padStart(3, '0')}.png`;
    }
  }

  // Bulletproof Global Sidebar Toggle
  window.toggleSidebar = function(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const sb = document.getElementById('app-sidebar');
    if (sb) {
      const isCollapsed = sb.classList.toggle('collapsed');
      showHUDToast(isCollapsed ? '📋 目录导航已收起' : '📖 目录导航已展开');
    }
  };

  // DOM Elements
  const libraryPortal = document.getElementById('library-portal-view');
  const openPortalBtn = document.getElementById('open-portal-btn');
  const sidebar = document.getElementById('app-sidebar');
  const articleBody = document.getElementById('article-body');
  const pageOriginalImg = document.getElementById('page-original-image');
  const currentPageBadge = document.getElementById('current-page-badge');
  const currentSectionBadge = document.getElementById('current-section-badge');
  const pageSlider = document.getElementById('page-slider');
  const pageCounterText = document.getElementById('page-counter-text');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const tocList = document.getElementById('toc-list');
  const pagesGrid = document.getElementById('pages-grid');
  const searchInput = document.getElementById('global-search');
  const searchTab = document.getElementById('search-tab');
  const searchResultsList = document.getElementById('search-results-list');
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const copyPageBtn = document.getElementById('copy-page-btn');
  const bookmarkPageBtn = document.getElementById('bookmark-page-btn');
  const bookmarksList = document.getElementById('bookmarks-list');
  const playPageAudioBtn = document.getElementById('play-page-audio-btn');
  const audioSpeedBtn = document.getElementById('audio-speed-btn');
  const fontToggleBtn = document.getElementById('font-family-toggle');
  const issueSwitcherPill = document.getElementById('issue-switcher-pill');
  const magazineShelfGrid = document.getElementById('magazine-shelf-grid');
  const shortcutsModal = document.getElementById('shortcuts-help-modal');

  // Text Sanitization
  function sanitize(str) {
    if (!str) return "";
    let s = str;
    s = s.replace(/\*\s+\*/g, ' ');
    s = s.replace(/\*\s*\*\s*\*/g, ' ');
    s = s.replace(/\*\*/g, '');
    s = s.replace(/\*【图注与署名】/g, '').replace(/【图注与署名】/g, '');
    s = s.replace(/\*【作者署名】/g, '').replace(/【作者署名】/g, '');
    s = s.replace(/\*【金句精译】/g, '').replace(/【金句精译】/g, '');
    s = s.replace(/\*【标题翻译】/g, '').replace(/【标题翻译】/g, '');
    s = s.replace(/\*【副标题翻译】/g, '').replace(/【副标题翻译】/g, '');
    s = s.replace(/\*【中文翻译】/g, '').replace(/【中文翻译】/g, '');
    s = s.replace(/(^|\s)\*([^\*]+)\*(\s|$)/g, '$1<em>$2</em>$3');
    s = s.replace(/\*/g, '');
    return s.trim();
  }

  // 1. Library Shelf View Rendering & Multi-Publication Brand Matrix
  function renderLibraryShelf() {
    if (!magazineShelfGrid) return;
    magazineShelfGrid.innerHTML = '';

    const issuesToRender = Object.keys(allIssues).filter(id => {
      const issue = allIssues[id];
      if (currentPubFilter === 'all') return true;
      if (currentPubFilter === 'the-atlantic') return issue.pubId === 'the-atlantic' || !issue.pubId;
      return issue.pubId === currentPubFilter;
    });

    if (issuesToRender.length === 0) {
      magazineShelfGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
          <h3 style="font-size: 18px; color: var(--text-primary); margin-bottom: 8px;">该刊物待入库</h3>
          <p style="font-size: 13.5px; color: var(--text-secondary);">可通过 <code>python scripts/ingest_magazine.py --pdf raw_pdf/xxx.pdf --pub ${currentPubFilter} --issue 2026-09 --name "2026年9月刊"</code> 一键全自动解析入库！</p>
        </div>
      `;
      return;
    }

    issuesToRender.forEach(id => {
      const issue = allIssues[id];
      const card = document.createElement('div');
      card.className = 'shelf-issue-card';
      card.innerHTML = `
        <div class="shelf-cover-wrap">
          <img src="${issue.coverImage}" class="shelf-cover-img" alt="Cover ${issue.name}">
        </div>
        <div class="shelf-details">
          <div class="shelf-details-top">
            <span class="issue-date-tag">${issue.name} &bull; ${issue.vol}</span>
            <h3>${issue.pubName || 'The Atlantic'}</h3>
            <p>${issue.leadArticle || 'Bilingual Digital Archive'}</p>
            <div class="shelf-meta-tags">
              <span class="meta-tag">📖 ${issue.totalPages} 页双语转录</span>
              <span class="meta-tag">¶ 24px 大字逐段对照</span>
              <span class="meta-tag">🔊 Web Speech TTS</span>
            </div>
          </div>
          <button class="shelf-enter-btn" data-issue="${id}">
            <span>开始沉浸阅读</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      `;

      card.querySelector('.shelf-enter-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        enterReaderRoom(id, 1);
      });
      card.addEventListener('click', () => {
        enterReaderRoom(id, 1);
      });

      magazineShelfGrid.appendChild(card);
    });

    initPortalSearch();
    bindPubFilters();
  }

  // Publication Filter Pills Handler
  function bindPubFilters() {
    document.querySelectorAll('.pub-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pub-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPubFilter = btn.dataset.pub;
        renderLibraryShelf();
      });
    });
  }

  // Global Home Portal Multi-Issue Instant Search
  function initPortalSearch() {
    const pInput = document.getElementById('portal-global-search');
    const pDropdown = document.getElementById('portal-search-dropdown');
    if (!pInput || !pDropdown) return;

    pInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query || query.length < 2) {
        pDropdown.classList.remove('active');
        pDropdown.innerHTML = '';
        return;
      }

      pDropdown.innerHTML = '';
      let matchCount = 0;

      Object.keys(allIssues).forEach(issueId => {
        const issue = allIssues[issueId];
        (issue.pages || []).forEach((p, idx) => {
          const pageNum = idx + 1;
          let matchedText = '';
          if (p.segments) {
            p.segments.forEach(seg => {
              if ((seg.en && seg.en.toLowerCase().includes(query)) || (seg.zh && seg.zh.toLowerCase().includes(query))) {
                matchedText += (seg.en || '') + ' ' + (seg.zh || '') + ' ';
              }
            });
          }

          if (matchedText && matchCount < 10) {
            matchCount++;
            const item = document.createElement('div');
            item.className = 'portal-search-item';
            const cleanSnippet = sanitize(matchedText.slice(0, 120)).replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');
            item.innerHTML = `
              <div class="portal-search-item-header">
                <span>${issue.name} &bull; PAGE ${String(pageNum).padStart(3, '0')}</span>
                <span>${sanitize(p.section) || ''}</span>
              </div>
              <div class="portal-search-item-title">${sanitize(p.section) || `Page ${pageNum}`}</div>
              <div class="portal-search-item-snippet">${cleanSnippet}...</div>
            `;
            item.addEventListener('click', () => {
              pDropdown.classList.remove('active');
              enterReaderRoom(issueId, pageNum);
            });
            pDropdown.appendChild(item);
          }
        });
      });

      if (matchCount > 0) {
        pDropdown.classList.add('active');
      } else {
        pDropdown.innerHTML = '<div style="padding:14px;color:var(--text-muted);font-size:12px;text-align:center;">全刊库未检索到匹配篇章</div>';
        pDropdown.classList.add('active');
      }
    });

    document.addEventListener('click', (e) => {
      if (pDropdown && !pDropdown.contains(e.target) && e.target !== pInput) {
        pDropdown.classList.remove('active');
      }
    });
  }

  function enterReaderRoom(issueId, targetPage) {
    if (allIssues[issueId]) {
      currentIssueId = issueId;
      currentIssueObj = allIssues[issueId];
      data = currentIssueObj.pages || [];
      localStorage.setItem(STORAGE_KEY_ISSUE, currentIssueId);
    }
    if (libraryPortal) {
      libraryPortal.classList.add('hidden');
    }
    if (issueSwitcherPill) {
      issueSwitcherPill.innerHTML = `📅 ${currentIssueObj.displayName} &bull; ${currentIssueObj.totalPages}P`;
    }
    initTOC();
    renderBookmarksTab();
    loadPage(targetPage || 1);
  }

  function openLibraryShelf() {
    stopSpeech();
    if (libraryPortal) {
      libraryPortal.classList.remove('hidden');
    }
  }

  if (openPortalBtn) {
    openPortalBtn.addEventListener('click', openLibraryShelf);
  }

  // Switch Active Issue
  function switchIssue(newIssueId) {
    if (!allIssues[newIssueId]) return;
    currentIssueId = newIssueId;
    currentIssueObj = allIssues[newIssueId];
    data = currentIssueObj.pages || [];
    localStorage.setItem(STORAGE_KEY_ISSUE, currentIssueId);

    if (issueSwitcherPill) {
      issueSwitcherPill.innerHTML = `📅 ${currentIssueObj.displayName} &bull; ${currentIssueObj.totalPages}P`;
    }
    if (pageSlider) {
      pageSlider.max = currentIssueObj.totalPages;
    }

    initTOC();
    renderBookmarksTab();
    const lastSavedPage = parseInt(localStorage.getItem(STORAGE_KEY_PAGE_PREFIX + currentIssueId), 10) || 1;
    loadPage(lastSavedPage);
    showHUDToast(`切换至：${currentIssueObj.displayName}`);
  }

  // Bookmarks Management
  function getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKMARKS_PREFIX + currentIssueId)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveBookmarks(list) {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS_PREFIX + currentIssueId, JSON.stringify(list));
    renderBookmarksTab();
  }

  function toggleBookmark(pageNum) {
    let list = getBookmarks();
    if (list.includes(pageNum)) {
      list = list.filter(p => p !== pageNum);
      showHUDToast(`☆ 已取消收藏 第 ${pageNum} 页`);
    } else {
      list.push(pageNum);
      list.sort((a, b) => a - b);
      showHUDToast(`⭐ 已成功收藏 第 ${pageNum} 页`);
    }
    saveBookmarks(list);
    updateBookmarkButton(pageNum);
  }

  function updateBookmarkButton(pageNum) {
    if (!bookmarkPageBtn) return;
    const list = getBookmarks();
    if (list.includes(pageNum)) {
      bookmarkPageBtn.classList.add('active');
      bookmarkPageBtn.innerHTML = '⭐ 已收藏';
    } else {
      bookmarkPageBtn.classList.remove('active');
      bookmarkPageBtn.innerHTML = '☆ 收藏本页';
    }
  }

  function handleJumpAndCloseSidebarOnMobile(targetPage) {
    loadPage(targetPage);
    if (window.innerWidth <= 960) {
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar) sidebar.classList.add('collapsed');
    }
  }

  function renderBookmarksTab() {
    if (!bookmarksList) return;
    const list = getBookmarks();
    bookmarksList.innerHTML = '';
    if (list.length === 0) {
      bookmarksList.innerHTML = '<div class="bookmark-empty-hint">暂无书签，点击页面顶部的“收藏本页”可快速标记重要章节</div>';
      return;
    }

    list.forEach(p => {
      const pageObj = data[p - 1] || {};
      const item = document.createElement('div');
      item.className = 'toc-item';
      item.innerHTML = `
        <div class="toc-item-header">
          <span>PAGE ${String(p).padStart(3, '0')}</span>
          <span style="color:var(--accent-gold);">★ 书签</span>
        </div>
        <div class="toc-item-title">${sanitize(pageObj.section) || `Page ${p}`}</div>
      `;
      item.addEventListener('click', () => handleJumpAndCloseSidebarOnMobile(p));
      bookmarksList.appendChild(item);
    });
  }

  // Initialize TOC
  function initTOC() {
    if (tocList) {
      tocList.innerHTML = '';
      data.forEach((pageObj, idx) => {
        const pNum = idx + 1;
        if (pageObj.section && pageObj.section.trim()) {
          const li = document.createElement('li');
          li.className = 'toc-item';
          li.id = `toc-item-p-${pNum}`;
          li.dataset.page = pNum;
          li.innerHTML = `
            <div class="toc-item-header">
              <span>PAGE ${String(pNum).padStart(3, '0')}</span>
            </div>
            <div class="toc-item-title">${sanitize(pageObj.section)}</div>
          `;
          li.addEventListener('click', () => handleJumpAndCloseSidebarOnMobile(pNum));
          tocList.appendChild(li);
        }
      });
    }

    if (pagesGrid) {
      pagesGrid.innerHTML = '';
      for (let p = 1; p <= currentIssueObj.totalPages; p++) {
        const tile = document.createElement('div');
        tile.className = 'page-tile' + (p === 1 ? ' active' : '');
        tile.id = `tile-p-${p}`;
        tile.innerHTML = `<span>P${p}</span>`;
        tile.addEventListener('click', () => handleJumpAndCloseSidebarOnMobile(p));
        pagesGrid.appendChild(tile);
      }
    }
  }

  // Professional Publishing-Grade Vertical Golden Centering (block: 'center')
  function syncSidebarActiveState(pageNum) {
    // 1. Sync Pages Grid with Vertical Centering
    document.querySelectorAll('.page-tile').forEach(t => t.classList.remove('active'));
    const activeTile = document.getElementById(`tile-p-${pageNum}`);
    if (activeTile) {
      activeTile.classList.add('active');
      activeTile.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    // 2. Sync TOC List with Vertical Golden Centering
    document.querySelectorAll('.toc-item').forEach(item => item.classList.remove('active'));
    const tocItems = Array.from(document.querySelectorAll('#toc-list .toc-item'));
    if (tocItems.length > 0) {
      let activeItem = null;
      for (let i = 0; i < tocItems.length; i++) {
        const pVal = parseInt(tocItems[i].dataset.page, 10);
        if (pVal <= pageNum) {
          activeItem = tocItems[i];
        } else {
          break;
        }
      }
      if (!activeItem) activeItem = tocItems[0];
      if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }
  }

  // High-performance syllabification injector for English publication typesetting
  function injectSyllables(text) {
    if (!text || typeof text !== 'string') return text;
    // Common multi-syllable patterns for English publication typesetting (breaks words >= 6 chars)
    return text.replace(/\b([a-zA-Z]{6,})\b/g, (word) => {
      return word.replace(/(.{2,3})(?=.{2,3})/g, '$1\u00AD');
    });
  }

  // Load and Render Page (Hero English 24px Card, Pure Ambient Chinese 20.5px)
  function loadPage(pageNum) {
    if (pageNum < 1) pageNum = 1;
    if (pageNum > currentIssueObj.totalPages) pageNum = currentIssueObj.totalPages;
    currentPage = pageNum;
    localStorage.setItem(STORAGE_KEY_PAGE_PREFIX + currentIssueId, pageNum);

    stopSpeech();
    preloadAdjacentPages(pageNum);

    const pageObj = data[pageNum - 1] || { pageNumber: pageNum, segments: [], image: `${currentIssueObj.id === '2026-08' ? 'issues/2026-08' : 'issues/2026-07'}/images/page_${String(pageNum).padStart(3, '0')}.png`, section: "" };

    // Update Badges & Slider
    if (currentPageBadge) currentPageBadge.textContent = `PAGE ${String(pageNum).padStart(3, '0')} / ${currentIssueObj.totalPages}`;
    if (currentSectionBadge) currentSectionBadge.textContent = sanitize(pageObj.section) || `The Atlantic (Page ${pageNum})`;
    if (pageSlider) {
      pageSlider.max = currentIssueObj.totalPages;
      pageSlider.value = pageNum;
    }
    if (pageCounterText) pageCounterText.textContent = `第 ${pageNum} / ${currentIssueObj.totalPages} 页`;

    updateBookmarkButton(pageNum);

    // Update Original Image
    if (pageOriginalImg) {
      pageOriginalImg.src = pageObj.image;
      const infoTag = document.getElementById('image-info-tag');
      if (infoTag) infoTag.textContent = `PAGE ${String(pageNum).padStart(3, '0')} 原版高清扫描图 (150 DPI)`;
      resetImageZoom();
    }

    // Render Article Body
    if (articleBody) {
      articleBody.innerHTML = '';
      if (!pageObj.segments || pageObj.segments.length === 0) {
        articleBody.innerHTML = `
          <div class="segment-block segment-paragraph">
            <div class="en-text">[Full-bleed illustration, photo portfolio or editorial art page]</div>
            <div class="zh-text-card">
              <div>【本页主要为全版摄影作品、插图画作或整版赞助专页】</div>
            </div>
          </div>
        `;
      } else {
        pageObj.segments.forEach((seg, idx) => {
          const segDiv = document.createElement('div');
          segDiv.className = `segment-block segment-${seg.type}`;
          segDiv.id = `seg-${idx}`;

          const cleanEn = sanitize(seg.en);
          const cleanZh = sanitize(seg.zh);
          const hyphenatedEn = injectSyllables(cleanEn);

          if (seg.type === 'h3') {
            segDiv.innerHTML = `
              <div class="en-text" lang="en" title="轻点原声朗读 (再次点击暂停)">${cleanEn}</div>
              ${cleanZh ? `
                <div class="zh-text-card" lang="zh-CN">
                  <div>${cleanZh}</div>
                </div>
              ` : ''}
            `;
          } else if (seg.type === 'h4') {
            segDiv.innerHTML = `
              <div class="en-text" lang="en" title="轻点原声朗读 (再次点击暂停)">${cleanEn}</div>
              ${cleanZh ? `
                <div class="zh-text-card" lang="zh-CN">
                  <div>${cleanZh}</div>
                </div>
              ` : ''}
            `;
          } else if (seg.type === 'caption') {
            segDiv.innerHTML = `
              <div class="en-text" lang="en" title="轻点原声朗读 (再次点击暂停)"><em>${cleanEn}</em></div>
              ${cleanZh ? `
                <div class="zh-text-card" lang="zh-CN">
                  <div><em>${cleanZh}</em></div>
                </div>
              ` : ''}
            `;
          } else if (seg.type === 'byline') {
            segDiv.innerHTML = `
              <div class="en-text" lang="en" title="轻点原声朗读 (再次点击暂停)">${cleanEn}</div>
              ${cleanZh ? `
                <div class="zh-text-card" lang="zh-CN">
                  <div>${cleanZh}</div>
                </div>
              ` : ''}
            `;
          } else if (seg.type === 'quote') {
            segDiv.innerHTML = `
              <div class="en-text" lang="en" title="轻点原声朗读 (再次点击暂停)">${cleanEn}</div>
              ${cleanZh ? `
                <div class="zh-text-card" lang="zh-CN">
                  <div>${cleanZh}</div>
                </div>
              ` : ''}
            `;
          } else if (seg.type === 'ad') {
            segDiv.innerHTML = `
              <div class="en-text" lang="en"><strong>[Advertisement]</strong> ${cleanEn}</div>
              ${cleanZh ? `
                <div class="zh-text-card" lang="zh-CN">
                  <div>${cleanZh}</div>
                </div>
              ` : ''}
            `;
            // Authentic 1:1 Author Paragraph: Pure Clean Words & Direct Tap-to-Speak
            segDiv.innerHTML = `
              <div class="en-text" lang="en" title="轻点原声朗读本段 (再次点击暂停)">${cleanEn}</div>
              ${cleanZh ? `
                <div class="zh-text-card" lang="zh-CN">
                  <div>${cleanZh}</div>
                </div>
              ` : ''}
            `;
          }

          // Direct Tap-to-Speak on the English text card
          const enCard = segDiv.querySelector('.en-text');
          if (enCard) {
            enCard.addEventListener('click', (e) => {
              if (segDiv.classList.contains('playing-active') && isPlayingAudio) {
                stopSpeech();
                showHUDToast('⏸ 朗读已暂停');
              } else {
                playParagraphSpeech(cleanEn, segDiv);
              }
            });
          }

          articleBody.appendChild(segDiv);
        });
      }
    }

    // Apply current global equal font size
    applyGlobalFontSize();

    // Trigger Smart Bidirectional TOC & Thumbnail Active Follower with Vertical Golden Centering
    syncSidebarActiveState(pageNum);

    // Scroll viewport to top smoothly
    const vp = document.querySelector('.reader-viewport');
    if (vp) vp.scrollTop = 0;
  }

  function applyGlobalFontSize() {
    const isDesktop = window.innerWidth > 960;
    const isTablet = window.innerWidth > 640 && window.innerWidth <= 960;
    const baseSize = isDesktop ? globalFontSize : (isTablet ? 17.5 : 15.0);

    document.querySelectorAll('.segment-paragraph .en-text').forEach(el => {
      el.style.fontSize = `${baseSize}px`;
    });
    document.querySelectorAll('.segment-paragraph .zh-text-card').forEach(el => {
      el.style.fontSize = `${baseSize}px`;
    });
  }

  // Web Speech TTS Engine with Synchronized Golden Glow Pulse & Strict Stop Lock
  function stopSpeech() {
    if (speechSynth) {
      if (speechSynth.pause) speechSynth.pause();
      if (speechSynth.cancel) speechSynth.cancel();
    }
    isPlayingAudio = false;
    currentPlayingSegmentDiv = null;
    if (playPageAudioBtn) playPageAudioBtn.innerHTML = '▶ 朗读';
    document.querySelectorAll('.segment-block').forEach(b => b.classList.remove('playing-active'));
  }

  function playParagraphSpeech(text, targetBlock) {
    if (!speechSynth) {
      alert('您的浏览器不支持 Web Speech 语音合成功能');
      return;
    }
    stopSpeech();

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = audioSpeed; // Always applies remembered speed

    isPlayingAudio = true;
    currentPlayingSegmentDiv = targetBlock;
    targetBlock.classList.add('playing-active');
    showHUDToast(`🔊 正在以 ${audioSpeed}x 朗读段落 (轻点可暂停)`);

    currentUtterance.onend = () => {
      isPlayingAudio = false;
      currentPlayingSegmentDiv = null;
      targetBlock.classList.remove('playing-active');
    };
    currentUtterance.onerror = () => {
      isPlayingAudio = false;
      currentPlayingSegmentDiv = null;
      targetBlock.classList.remove('playing-active');
    };

    speechSynth.speak(currentUtterance);
  }

  function playPageSpeech() {
    if (!speechSynth) return;

    if (isPlayingAudio && !currentPlayingSegmentDiv) {
      stopSpeech();
      showHUDToast('⏸ 整页朗读已暂停');
      return;
    }
    stopSpeech();

    const pageObj = data[currentPage - 1];
    if (!pageObj || !pageObj.segments || pageObj.segments.length === 0) return;

    const enTexts = pageObj.segments.filter(s => s.en && s.en.length > 5).map(s => sanitize(s.en));
    if (enTexts.length === 0) return;

    const fullPageEn = enTexts.join('. ');
    currentUtterance = new SpeechSynthesisUtterance(fullPageEn);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = audioSpeed; // Always applies remembered speed

    isPlayingAudio = true;
    if (playPageAudioBtn) playPageAudioBtn.innerHTML = '⏸ 暂停朗读';
    showHUDToast(`🔊 正在以 ${audioSpeed}x 原声朗读整页`);

    currentUtterance.onend = () => {
      isPlayingAudio = false;
      if (playPageAudioBtn) playPageAudioBtn.innerHTML = '▶ 朗读';
    };
    currentUtterance.onerror = () => {
      isPlayingAudio = false;
      if (playPageAudioBtn) playPageAudioBtn.innerHTML = '▶ 朗读';
    };

    speechSynth.speak(currentUtterance);
  }

  // Zoom controls for original image
  function resetImageZoom() {
    currentZoom = 1.0;
    if (pageOriginalImg) pageOriginalImg.style.transform = 'scale(1.0)';
  }

  const zoomInBtn = document.getElementById('zoom-in');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      currentZoom += 0.25;
      if (pageOriginalImg) pageOriginalImg.style.transform = `scale(${currentZoom})`;
    });
  }

  const zoomOutBtn = document.getElementById('zoom-out');
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      if (currentZoom > 0.6) {
        currentZoom -= 0.25;
        if (pageOriginalImg) pageOriginalImg.style.transform = `scale(${currentZoom})`;
      }
    });
  }

  const zoomResetBtn = document.getElementById('zoom-reset');
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', resetImageZoom);

  // Lightbox
  const openLightboxBtn = document.getElementById('open-lightbox');
  if (openLightboxBtn) {
    openLightboxBtn.addEventListener('click', () => {
      if (lightboxImg && pageOriginalImg) {
        lightboxImg.src = pageOriginalImg.src;
        lightboxModal.classList.add('active');
      }
    });
  }

  const closeLightboxBtn = document.querySelector('.close-lightbox');
  if (closeLightboxBtn) {
    closeLightboxBtn.addEventListener('click', () => {
      lightboxModal.classList.remove('active');
    });
  }

  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) lightboxModal.classList.remove('active');
    });
  }

  // Slider navigation
  if (pageSlider) {
    pageSlider.addEventListener('input', (e) => {
      loadPage(parseInt(e.target.value, 10));
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => loadPage(currentPage - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => loadPage(currentPage + 1));

  // Quick jump input
  const quickJumpBtn = document.getElementById('quick-jump-go');
  if (quickJumpBtn) {
    quickJumpBtn.addEventListener('click', () => {
      const val = parseInt(document.getElementById('quick-jump-num').value, 10);
      if (val >= 1 && val <= currentIssueObj.totalPages) handleJumpAndCloseSidebarOnMobile(val);
    });
  }

  // Issue Switcher Pill
  if (issueSwitcherPill) {
    issueSwitcherPill.addEventListener('click', () => {
      const nextId = currentIssueId === '2026-08' ? '2026-07' : '2026-08';
      switchIssue(nextId);
    });
  }

  // Sidebar Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pane = document.getElementById(`tab-${btn.dataset.tab}`);
      if (pane) {
        pane.classList.add('active');
        syncSidebarActiveState(currentPage);
      }
    });
  });

  // Switch View Mode Helper
  function setViewMode(modeName) {
    currentViewMode = modeName;
    document.body.classList.remove('view-interlinear', 'view-split', 'view-en-only', 'view-zh-only');
    document.body.classList.add(`view-${currentViewMode}`);
    localStorage.setItem(STORAGE_KEY_VIEW, currentViewMode);

    document.querySelectorAll('.view-btn').forEach(b => {
      if (b.dataset.view === currentViewMode) b.classList.add('active');
      else b.classList.remove('active');
    });

    const labels = {
      'interlinear': '📖 逐段对照',
      'split': '🪟 原图分栏',
      'en-only': '🇺🇸 纯英文',
      'zh-only': '🇨🇳 纯中文'
    };
    showHUDToast(`视图切换：${labels[modeName] || modeName}`);
  }

  // View Mode Switcher Click
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setViewMode(btn.dataset.view);
    });
  });

  // Settings & More Popover Drawer (Apple Books style)
  const moreSettingsBtn = document.getElementById('more-settings-btn');
  const settingsPopover = document.getElementById('settings-popover-menu');
  const settingsBackdrop = document.getElementById('settings-backdrop');

  function toggleSettingsPopover(force) {
    if (!settingsPopover) return;
    const isAct = force !== undefined ? force : !settingsPopover.classList.contains('active');
    if (isAct) {
      settingsPopover.classList.add('active');
      if (settingsBackdrop) settingsBackdrop.classList.add('active');
      if (moreSettingsBtn) moreSettingsBtn.classList.add('active');
      // Sync active state on theme cards
      const curTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
      document.querySelectorAll('.popover-theme-card').forEach(c => {
        if (c.dataset.theme === curTheme) c.classList.add('active');
        else c.classList.remove('active');
      });
    } else {
      settingsPopover.classList.remove('active');
      if (settingsBackdrop) settingsBackdrop.classList.remove('active');
      if (moreSettingsBtn) moreSettingsBtn.classList.remove('active');
    }
  }

  if (moreSettingsBtn) {
    moreSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSettingsPopover();
    });
  }

  if (settingsBackdrop) {
    settingsBackdrop.addEventListener('click', () => {
      toggleSettingsPopover(false);
    });
  }

  // Theme Switcher (Popover Cards & Top Buttons)
  function applyTheme(themeName) {
    document.body.classList.remove('theme-light', 'theme-sepia', 'theme-beach', 'theme-academic', 'theme-forest', 'theme-dark');
    document.body.classList.add(`theme-${themeName}`);
    localStorage.setItem(STORAGE_KEY_THEME, themeName);

    document.querySelectorAll('.popover-theme-card').forEach(c => {
      if (c.dataset.theme === themeName) c.classList.add('active');
      else c.classList.remove('active');
    });

    const themeNames = {
      'light': '☀️ 晨曦象牙白',
      'sepia': '📜 复古羊皮纸',
      'beach': '🏖️ 清新夏日海滩',
      'academic': '🧊 学术冷静冰川',
      'forest': '🌿 森林晨雾薄荷',
      'dark': '🌙 极夜深曜石'
    };
    showHUDToast(`主题切换：${themeNames[themeName] || themeName}`);
  }

  document.querySelectorAll('.popover-theme-card').forEach(card => {
    card.addEventListener('click', () => {
      applyTheme(card.dataset.theme);
    });
  });

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });
  });

  // Alignment & Typographic Modes (Flush Left Fixed Spacing vs Justified Two-Sided Alignment)
  const STORAGE_KEY_ALIGN = 'atlantic_reader_align_mode';
  let currentAlignMode = localStorage.getItem(STORAGE_KEY_ALIGN) || 'flush';
  const alignModeToggle = document.getElementById('align-mode-toggle');
  const alignModeText = document.getElementById('align-mode-text');

  function applyAlignMode(mode) {
    currentAlignMode = mode;
    document.body.classList.remove('align-mode-flush', 'align-mode-justify');
    document.body.classList.add(`align-mode-${mode}`);
    localStorage.setItem(STORAGE_KEY_ALIGN, mode);
    if (alignModeText) {
      alignModeText.textContent = mode === 'flush' ? '📖 自然恒定均距 (零拉伸)' : '📐 纸刊两端平齐 (Justified)';
    }
  }

  if (alignModeToggle) {
    alignModeToggle.addEventListener('click', () => {
      const nextMode = currentAlignMode === 'flush' ? 'justify' : 'flush';
      applyAlignMode(nextMode);
      showHUDToast(`排版模式：${nextMode === 'flush' ? '📖 自然恒定均距 (每个空格绝对等宽)' : '📐 纸刊两端平齐'}`);
    });
  }
  applyAlignMode(currentAlignMode);

  // Font Family Switcher (Modern Sans vs Classic Serif)
  if (fontToggleBtn) {
    fontToggleBtn.addEventListener('click', () => {
      isSerifMode = !isSerifMode;
      if (isSerifMode) {
        document.body.classList.add('font-mode-serif');
        fontToggleBtn.innerHTML = '🔠 典雅衬线';
        localStorage.setItem(STORAGE_KEY_FONT, 'serif');
      } else {
        document.body.classList.remove('font-mode-serif');
        fontToggleBtn.innerHTML = '🔤 现代黑体';
        localStorage.setItem(STORAGE_KEY_FONT, 'sans');
      }
    });
  }

  // Global Equal Font Resizer (1:1 Scaling for both English and Chinese)
  const fontIncBtn = document.getElementById('font-inc-btn');
  if (fontIncBtn) {
    fontIncBtn.addEventListener('click', () => {
      if (globalFontSize < 36) {
        globalFontSize += 1.5;
        applyGlobalFontSize();
        showHUDToast(`全局中英同号：${globalFontSize}px`);
      }
    });
  }

  const fontDecBtn = document.getElementById('font-dec-btn');
  if (fontDecBtn) {
    fontDecBtn.addEventListener('click', () => {
      if (globalFontSize > 14) {
        globalFontSize -= 1.5;
        applyGlobalFontSize();
        showHUDToast(`全局中英同号：${globalFontSize}px`);
      }
    });
  }

  // Fullscreen
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  // Copy Markdown
  if (copyPageBtn) {
    copyPageBtn.addEventListener('click', () => {
      const pageObj = data[currentPage - 1];
      if (pageObj && pageObj.rawMd) {
        navigator.clipboard.writeText(pageObj.rawMd).then(() => {
          copyPageBtn.textContent = '已复制!';
          showHUDToast('📋 本页 Markdown 已成功复制');
          setTimeout(() => copyPageBtn.textContent = '📋 复制 Markdown', 2000);
        });
      }
    });
  }

  // Bookmark Page Button
  if (bookmarkPageBtn) {
    bookmarkPageBtn.addEventListener('click', () => {
      toggleBookmark(currentPage);
    });
  }

  // Audio Play Trigger
  if (playPageAudioBtn) {
    playPageAudioBtn.addEventListener('click', playPageSpeech);
  }

  // Persistent Audio Speed Synchronizer (Header Pill + Popover Drawer + Memory)
  const topAudioSpeedBtn = document.getElementById('audio-speed-btn-top');
  const drawerAudioSpeedBtn = document.getElementById('audio-speed-btn');

  function updateSpeedDisplays() {
    const txt = `${audioSpeed}x`;
    if (topAudioSpeedBtn) topAudioSpeedBtn.textContent = txt;
    if (drawerAudioSpeedBtn) drawerAudioSpeedBtn.textContent = `${txt} 标准`;
  }

  function cycleAudioSpeed() {
    if (audioSpeed === 1.0) audioSpeed = 1.25;
    else if (audioSpeed === 1.25) audioSpeed = 1.5;
    else if (audioSpeed === 1.5) audioSpeed = 0.75;
    else audioSpeed = 1.0;

    localStorage.setItem(STORAGE_KEY_SPEED, audioSpeed);
    updateSpeedDisplays();
    showHUDToast(`朗读倍速已设为：${audioSpeed}x (整段与整页均已同步记忆)`);
  }

  if (topAudioSpeedBtn) {
    topAudioSpeedBtn.addEventListener('click', cycleAudioSpeed);
  }
  if (drawerAudioSpeedBtn) {
    drawerAudioSpeedBtn.addEventListener('click', cycleAudioSpeed);
  }
  updateSpeedDisplays();

  // Shortcuts Help Modal Toggle
  function toggleShortcutsModal() {
    if (!shortcutsModal) return;
    shortcutsModal.classList.toggle('active');
  }

  const closeShortcutsBtn = document.querySelector('.close-shortcuts-btn');
  if (closeShortcutsBtn) {
    closeShortcutsBtn.addEventListener('click', () => {
      if (shortcutsModal) shortcutsModal.classList.remove('active');
    });
  }
  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) shortcutsModal.classList.remove('active');
    });
  }

  // Full Text Instant Search in Sidebar
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query || query.length < 2) {
        if (searchTab) searchTab.style.display = 'none';
        return;
      }

      if (searchTab) {
        searchTab.style.display = 'block';
        searchTab.click();
      }

      if (!searchResultsList) return;
      searchResultsList.innerHTML = '';
      let matchesCount = 0;

      data.forEach((p, idx) => {
        const pageNum = idx + 1;
        let matchedText = '';
        if (p.segments) {
          p.segments.forEach(seg => {
            if ((seg.en && seg.en.toLowerCase().includes(query)) || (seg.zh && seg.zh.toLowerCase().includes(query))) {
              matchedText += (seg.en || '') + ' ' + (seg.zh || '') + ' ';
            }
          });
        }

        if (matchedText) {
          matchesCount++;
          const item = document.createElement('div');
          item.className = 'toc-item';
          const cleanSnippet = sanitize(matchedText.slice(0, 140)).replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');
          item.innerHTML = `
            <div class="toc-item-header">
              <span>PAGE ${String(pageNum).padStart(3, '0')}</span>
              <span>${sanitize(p.section) || ''}</span>
            </div>
            <div class="toc-item-title">${cleanSnippet}...</div>
          `;
          item.addEventListener('click', () => handleJumpAndCloseSidebarOnMobile(pageNum));
          searchResultsList.appendChild(item);
        }
      });

      if (matchesCount === 0) {
        searchResultsList.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:12px;">未检索到匹配内容</div>';
      }
    });
  }

  // GLOBAL EXTENDED KEYBOARD SHORTCUT SUITE (IME-Penetrating Dual-Track Physical Engine)
  function handleGlobalKeyDown(e) {
    // Only bypass if the user is actively typing inside an input or textarea
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    if (isTyping) {
      if (e.key === 'Escape' || e.code === 'Escape') {
        activeEl.blur();
        e.preventDefault();
      }
      return;
    }

    const key = (e.key || '').toLowerCase();
    const code = e.code || '';

    // If library shelf is open, J / K / Enter / Space automatically enters reader room
    const isShelfOpen = libraryPortal && !libraryPortal.classList.contains('hidden');
    if (isShelfOpen) {
      if (code === 'KeyJ' || key === 'j' || code === 'ArrowRight' || key === 'arrowright' || code === 'Enter' || code === 'Space') {
        e.preventDefault();
        enterReaderRoom(currentIssueId, 1);
        return;
      }
    }

    // 1. Smooth Scrolling with W, S, Space, Up, Down
    if (code === 'Space' || key === ' ') {
      e.preventDefault();
      const scrollDelta = window.innerHeight * 0.6;
      scrollPage(e.shiftKey ? -scrollDelta : scrollDelta);
    } else if (code === 'KeyW' || key === 'w' || code === 'ArrowUp' || key === 'arrowup') {
      e.preventDefault();
      scrollPage(-260);
    } else if (code === 'KeyS' || key === 's' || code === 'ArrowDown' || key === 'arrowdown') {
      e.preventDefault();
      scrollPage(260);
    } else if ((code === 'KeyG' || key === 'g') && !e.shiftKey) {
      e.preventDefault();
      const vp = document.querySelector('.reader-viewport');
      if (vp) vp.scrollTop = 0;
      window.scrollTo(0, 0);
    } else if ((code === 'KeyG' || key === 'g') && e.shiftKey) {
      e.preventDefault();
      const vp = document.querySelector('.reader-viewport');
      if (vp) vp.scrollTop = vp.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
    }

    // 2. View Mode Direct Numbers 1, 2, 3, 4
    else if (code === 'Digit1' || code === 'Numpad1' || key === '1') {
      e.preventDefault();
      setViewMode('interlinear');
    } else if (code === 'Digit2' || code === 'Numpad2' || key === '2') {
      e.preventDefault();
      setViewMode('split');
    } else if (code === 'Digit3' || code === 'Numpad3' || key === '3') {
      e.preventDefault();
      setViewMode('en-only');
    } else if (code === 'Digit4' || code === 'Numpad4' || key === '4') {
      e.preventDefault();
      setViewMode('zh-only');
    }

    // 3. Issue Quick Switch
    else if (code === 'KeyM' || key === 'm') {
      e.preventDefault();
      const nextId = currentIssueId === '2026-08' ? '2026-07' : '2026-08';
      switchIssue(nextId);
    }

    // 4. Strict 1:1 Sequential Page Navigation (J / K / → / ← / PageDown / PageUp)
    else if (code === 'KeyJ' || key === 'j' || code === 'ArrowRight' || key === 'arrowright' || code === 'PageDown' || key === 'pagedown') {
      e.preventDefault();
      if (!isNavigating) {
        isNavigating = true;
        loadPage(currentPage + 1);
        setTimeout(() => { isNavigating = false; }, 60);
      }
    } else if (code === 'KeyK' || key === 'k' || code === 'ArrowLeft' || key === 'arrowleft' || code === 'PageUp' || key === 'pageup') {
      e.preventDefault();
      if (!isNavigating) {
        isNavigating = true;
        loadPage(currentPage - 1);
        setTimeout(() => { isNavigating = false; }, 60);
      }
    }

    // 5. Sidebar Toggle
    else if (code === 'KeyT' || key === 't') {
      e.preventDefault();
      window.toggleSidebar(e);
    }

    // 6. Shortcuts Cheat Sheet
    else if (e.key === '?' || (e.shiftKey && (code === 'Slash' || key === '/'))) {
      e.preventDefault();
      toggleShortcutsModal();
    }

    // 7. Escape Navigation
    else if (code === 'Escape' || key === 'escape') {
      e.preventDefault();
      if (shortcutsModal && shortcutsModal.classList.contains('active')) {
        shortcutsModal.classList.remove('active');
        return;
      }
      if (lightboxModal && lightboxModal.classList.contains('active')) {
        lightboxModal.classList.remove('active');
        return;
      }
      const sb = document.getElementById('app-sidebar');
      if (sb && !sb.classList.contains('collapsed')) {
        sb.classList.add('collapsed');
        showHUDToast('📋 目录导航已收起');
      } else {
        openLibraryShelf();
      }
    }

    // 8. Bookmark
    else if (code === 'KeyB' || key === 'b') {
      e.preventDefault();
      toggleBookmark(currentPage);
    }

    // 9. Speech Audio
    else if (code === 'KeyP' || key === 'p') {
      e.preventDefault();
      playPageSpeech();
    }

    // 10. Fullscreen & Home
    else if (code === 'KeyF' || key === 'f') {
      e.preventDefault();
      if (fullscreenBtn) fullscreenBtn.click();
    } else if (code === 'KeyH' || key === 'h') {
      e.preventDefault();
      openLibraryShelf();
    }
  }

  // SINGLE LISTENER REGISTRATION (Capture phase for instant priority)
  window.addEventListener('keydown', handleGlobalKeyDown, true);

  // Global Clipboard Sanitizer: Guarantees 100% Pure, Unbroken Words on Copy (Stripping any soft hyphens)
  document.addEventListener('copy', (e) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const rawText = selection.toString();
    const cleanText = rawText.replace(/\u00AD/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
    if (e.clipboardData) {
      e.clipboardData.setData('text/plain', cleanText);
      e.preventDefault();
    }
  });

  // Startup Initialization: Ensure sidebar is cleanly collapsed by default
  if (sidebar) {
    sidebar.classList.add('collapsed');
  }

  // Click on reader viewport to auto-close drawer on mobile
  const vpEl = document.querySelector('.reader-viewport');
  if (vpEl) {
    vpEl.addEventListener('click', () => {
      if (window.innerWidth <= 960 && sidebar && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
      }
    });
  }

  renderLibraryShelf();

  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
  document.body.classList.remove('theme-light', 'theme-sepia', 'theme-beach', 'theme-academic', 'theme-forest', 'theme-dark');
  document.body.classList.add(`theme-${savedTheme}`);
  const activeThemeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
  if (activeThemeBtn) {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    activeThemeBtn.classList.add('active');
  }

  const savedFont = localStorage.getItem(STORAGE_KEY_FONT) || 'sans';
  if (savedFont === 'serif') {
    isSerifMode = true;
    document.body.classList.add('font-mode-serif');
    if (fontToggleBtn) fontToggleBtn.innerHTML = '🔠 典雅衬线';
  } else {
    isSerifMode = false;
    document.body.classList.remove('font-mode-serif');
    if (fontToggleBtn) fontToggleBtn.innerHTML = '🔤 现代黑体';
  }

  document.body.classList.add(`view-${currentViewMode}`);
  const activeViewBtn = document.querySelector(`.view-btn[data-view="${currentViewMode}"]`);
  if (activeViewBtn) {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    activeViewBtn.classList.add('active');
  }

  // Global hooks
  window.loadPage = loadPage;
  window.switchIssue = switchIssue;
  window.enterReaderRoom = enterReaderRoom;
  window.openLibraryShelf = openLibraryShelf;
  window.toggleShortcutsModal = toggleShortcutsModal;
})();
