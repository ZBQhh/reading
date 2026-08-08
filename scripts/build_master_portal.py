import os
import json
import shutil

def build_portal():
    with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
        all_issues = json.load(f)
        
    shutil.copy2('assets/css/reader_style.css', 'reader_style.css')
    shutil.copy2('assets/js/reader_app.js', 'reader_app.js')
    
    html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>The Atlantic & Global Journals — Private Bespoke Reader | 顶级期刊双语私享数字典藏</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Noto+Sans+SC:wght@300;400;500;600;700;900&family=Noto+Serif+SC:wght@300;400;600;700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/reader_style.css">
</head>
<body class="theme-light view-interlinear">

  <!-- ==========================================================================
       1. APPLE NEWS+ DIGITAL MAGAZINE LIBRARY PORTAL (全刊库首页 + 矩阵筛选 + 全库检索)
       ========================================================================== -->
  <div id="library-portal-view" class="library-portal-view">
    <header class="portal-header">
      <div class="portal-brand">
        <h1>THE ATLANTIC &bull; GLOBAL JOURNALS</h1>
        <p>Private Bespoke Digital Archive &bull; 双语私享数字期刊典藏馆</p>
      </div>
      <div class="portal-controls">
        <button class="shelf-enter-btn" onclick="window.enterReaderRoom('2026-08', 1)">
          <span>快速进入 8月刊</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </header>

    <main class="portal-hero">
      <span class="portal-hero-badge">DIGITAL BESPOKE ARCHIVE</span>
      <h2>精选典藏期刊库</h2>
      <p>依托 1:1 印刷排版首行缩进解析、真实作者段落集与 24px 英文微浮雕卡片，汇聚全球顶级政经、文学与前沿科技思想典籍。</p>
      
      <!-- Home Portal Global Multi-Issue Instant Search -->
      <div class="portal-search-wrap">
        <svg class="portal-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="portal-global-search" class="portal-search-input" placeholder="🔍 检索 8月刊 / 7月刊 全库特稿、作者与双语段落...">
        <div id="portal-search-dropdown" class="portal-search-results-dropdown"></div>
      </div>

      <!-- Multi-Publication Brand Matrix Filter Pills -->
      <div class="portal-pub-filters">
        <button class="pub-filter-btn active" data-pub="all">🏛️ 全部典藏 ALL</button>
        <button class="pub-filter-btn" data-pub="the-atlantic">📜 大西洋月刊 (The Atlantic)</button>
        <button class="pub-filter-btn" data-pub="the-economist">📈 经济学人 (The Economist)</button>
        <button class="pub-filter-btn" data-pub="the-new-yorker">✍️ 纽约客 (The New Yorker)</button>
        <button class="pub-filter-btn" data-pub="wired">⚡ 连线 (Wired)</button>
      </div>

      <div class="magazine-shelf-grid" id="magazine-shelf-grid">
        <!-- Injected via JavaScript -->
      </div>
    </main>
  </div>

  <!-- ==========================================================================
       2. IMMERSIVE READER ROOM (沉浸阅读室)
       ========================================================================== -->
  <header class="app-header">
    <div class="header-left">
      <!-- Back to Library Portal Button -->
      <button id="open-portal-btn" class="back-to-library-btn" title="返回期刊馆主页 (H / Esc)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>🏛️ 期刊馆</span>
      </button>

      <button id="toggle-sidebar-btn" class="icon-btn" onclick="window.toggleSidebar(event)" title="展开/收起目录 (T)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        <span>目录</span>
      </button>
      
      <div class="magazine-brand" onclick="window.openLibraryShelf ? window.openLibraryShelf() : window.location.reload()">
        <span class="masthead-logo">THE ATLANTIC</span>
      </div>

      <!-- Quick Issue Switcher Pill Button -->
      <div class="issue-switcher-pill" id="issue-switcher-pill" title="点击一键切换 8月刊 / 7月刊 (M)">
        📅 2026年8月刊 &bull; 104P
      </div>
    </div>

    <!-- Center Compact View Mode Switcher -->
    <div class="view-controls">
      <button class="view-btn active" data-view="interlinear" title="1:1 逐段对照，24px 英文卡片主显，20.5px 中文纯字辅读 (快捷键 1)">
        <span>📖 逐段对照</span>
      </button>
      <button class="view-btn" data-view="split" title="左侧原版 150 DPI 高清扫描图 + 右侧精校排版 (快捷键 2)">
        <span>🪟 原图分栏</span>
      </button>
      <button class="view-btn" data-view="en-only" title="纯英文原版阅读 (快捷键 3)">
        <span>🇺🇸 纯英文</span>
      </button>
      <button class="view-btn" data-view="zh-only" title="纯中文精译沉浸 (快捷键 4)">
        <span>🇨🇳 纯中文</span>
      </button>
    </div>

    <!-- Header Right Controls -->
    <div class="header-right">
      <!-- Font Switcher -->
      <button id="font-family-toggle" class="font-family-toggle" title="切换屏幕现代黑体 / 经典衬线体">🔤 现代黑体</button>

      <!-- TTS Speech Widget: Strictly horizontal flex row -->
      <div class="audio-player-widget">
        <button id="play-page-audio-btn" class="audio-btn" title="原声朗读本页英文 (P)">▶ 朗读本页</button>
        <button id="audio-speed-btn" class="audio-speed-btn" title="调节语速">1.0x</button>
      </div>

      <!-- Search Input -->
      <div class="search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="global-search" placeholder="全书检索...">
      </div>

      <!-- Theme Switcher: 6 Curated Luxury Editorial Palettes -->
      <div class="theme-selector" title="选择阅读主题色系">
        <button class="theme-btn active" data-theme="light" title="☀️ 晨曦象牙白">☀️</button>
        <button class="theme-btn" data-theme="sepia" title="📜 复古羊皮纸">📜</button>
        <button class="theme-btn" data-theme="beach" title="🏖️ 清新夏日海滩">🏖️</button>
        <button class="theme-btn" data-theme="academic" title="🧊 学术冷静冰川">🧊</button>
        <button class="theme-btn" data-theme="forest" title="🌿 森林晨雾薄荷">🌿</button>
        <button class="theme-btn" data-theme="dark" title="🌙 极夜深曜石">🌙</button>
      </div>

      <!-- English Font Resizer -->
      <div class="font-controls">
        <button id="font-dec-btn" class="tool-btn" title="减小英文主字号">A-</button>
        <button id="font-inc-btn" class="tool-btn" title="增大英文主字号">A+</button>
      </div>

      <!-- Shortcuts Help Button -->
      <button class="icon-btn shortcuts-help-trigger" onclick="window.toggleShortcutsModal()" title="查看全站快捷键 (? / Shift+/)">
        <span>⌨️ 快捷键</span>
      </button>

      <button id="fullscreen-btn" class="icon-btn" title="全屏阅读 (F)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
      </button>
    </div>
  </header>

  <div class="main-layout">
    <!-- Left Navigation Sidebar with One-Click Close Button -->
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-tabs">
        <button class="tab-btn active" data-tab="toc">目录导航</button>
        <button class="tab-btn" data-tab="pages">缩略图</button>
        <button class="tab-btn" data-tab="bookmarks">书签</button>
        <button class="tab-btn" data-tab="search-results" id="search-tab" style="display:none;">检索</button>
        <button class="sidebar-close-btn" id="close-sidebar-btn" onclick="window.toggleSidebar(event)" title="收起目录 (T / Esc)">✕ 收起</button>
      </div>

      <!-- Tab Content: TOC -->
      <div class="tab-pane active" id="tab-toc">
        <ul class="toc-list" id="toc-list"></ul>
      </div>

      <!-- Tab Content: Pages Grid -->
      <div class="tab-pane" id="tab-pages">
        <div class="page-jump-input-wrap">
          <input type="number" id="quick-jump-num" min="1" max="112" placeholder="输入页码">
          <button id="quick-jump-go">跳转</button>
        </div>
        <div class="pages-grid" id="pages-grid"></div>
      </div>

      <!-- Tab Content: Bookmarks -->
      <div class="tab-pane" id="tab-bookmarks">
        <div class="bookmarks-list" id="bookmarks-list"></div>
      </div>

      <!-- Tab Content: Search Results -->
      <div class="tab-pane" id="tab-search-results">
        <div id="search-results-list" class="search-results-list"></div>
      </div>
    </aside>

    <!-- Center Main Reading Canvas: Fluid Full-Width Expansion -->
    <main class="reader-viewport">
      <div class="reader-container" id="reader-container">
        <!-- Split View: Original 150 DPI Scan Column -->
        <div class="image-column" id="image-column">
          <div class="image-toolbar">
            <span class="image-info-tag" id="image-info-tag">原版高清扫描图 (150 DPI)</span>
            <div class="zoom-tools">
              <button id="zoom-in" class="tiny-btn" title="放大">+</button>
              <button id="zoom-out" class="tiny-btn" title="缩小">-</button>
              <button id="zoom-reset" class="tiny-btn">重置</button>
              <button id="open-lightbox" class="tiny-btn" title="全屏查看大图">🔍 全屏</button>
            </div>
          </div>
          <div class="image-canvas-wrap" id="image-canvas-wrap">
            <img id="page-original-image" src="issues/2026-08/images/page_001.png" alt="Magazine Original Page">
          </div>
        </div>

        <!-- Text Reader Card Column (Hero English 24px Warm Cards & Pure 20.5px Subtle Chinese) -->
        <div class="article-column" id="article-column">
          <div class="page-meta-header">
            <div>
              <span class="page-badge" id="current-page-badge">PAGE 001</span>
              <span class="section-title-badge" id="current-section-badge">Cover (封面)</span>
            </div>
            <div class="page-actions">
              <button id="bookmark-page-btn" class="text-action-btn bookmark-btn" title="添加到书签 (B)">☆ 收藏本页</button>
              <button id="copy-page-btn" class="text-action-btn" title="复制本页 Markdown">📋 复制 Markdown</button>
            </div>
          </div>

          <div class="article-body" id="article-body"></div>
        </div>
      </div>
    </main>
  </div>

  <!-- Bottom Floating Navigation Bar -->
  <footer class="bottom-bar">
    <div class="bottom-left">
      <button id="prev-page-btn" class="nav-page-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        上一页 (← / K)
      </button>
    </div>

    <div class="bottom-center">
      <input type="range" id="page-slider" min="1" max="104" value="1" class="page-slider">
      <span class="page-counter-text" id="page-counter-text">第 1 页</span>
    </div>

    <div class="bottom-right">
      <button id="next-page-btn" class="nav-page-btn">
        下一页 (→ / J)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  </footer>

  <!-- Lightbox Modal -->
  <div id="lightbox-modal" class="lightbox-modal">
    <span class="close-lightbox">&times;</span>
    <img id="lightbox-img" src="" alt="Zoomed view">
  </div>

  <!-- Keyboard Shortcuts Cheat Sheet Modal -->
  <div id="shortcuts-help-modal" class="shortcuts-modal">
    <div class="shortcuts-card">
      <div class="shortcuts-header">
        <h3>⌨️ 全站全能快捷键速查</h3>
        <button class="close-shortcuts-btn" onclick="window.toggleShortcutsModal()">&times;</button>
      </div>
      <div class="shortcuts-grid">
        <div class="shortcut-row">
          <span>平滑向下翻半屏</span>
          <span class="shortcut-key-badge">Space</span>
        </div>
        <div class="shortcut-row">
          <span>平滑向上翻半屏</span>
          <span class="shortcut-key-badge">Shift + Space</span>
        </div>
        <div class="shortcut-row">
          <span>平滑向下滚动</span>
          <span class="shortcut-key-badge">S / ↓</span>
        </div>
        <div class="shortcut-row">
          <span>平滑向上滚动</span>
          <span class="shortcut-key-badge">W / ↑</span>
        </div>
        <div class="shortcut-row">
          <span>上一页 / 下一页</span>
          <span class="shortcut-key-badge">← / → (J / K)</span>
        </div>
        <div class="shortcut-row">
          <span>收起/展开目录</span>
          <span class="shortcut-key-badge">T</span>
        </div>
        <div class="shortcut-row">
          <span>一键跨期切换 (8月/7月)</span>
          <span class="shortcut-key-badge">M</span>
        </div>
        <div class="shortcut-row">
          <span>切换逐段 / 原图 / 单语</span>
          <span class="shortcut-key-badge">1 / 2 / 3 / 4</span>
        </div>
        <div class="shortcut-row">
          <span>原声朗读 (TTS)</span>
          <span class="shortcut-key-badge">P</span>
        </div>
        <div class="shortcut-row">
          <span>收藏本页书签</span>
          <span class="shortcut-key-badge">B</span>
        </div>
        <div class="shortcut-row">
          <span>全屏阅读</span>
          <span class="shortcut-key-badge">F</span>
        </div>
        <div class="shortcut-row">
          <span>返回期刊馆 / 退出</span>
          <span class="shortcut-key-badge">Esc / H</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Embedded Multi-Issue Archive
    window.ALL_ISSUES = {json.dumps(all_issues, ensure_ascii=False)};
  </script>
  <script src="assets/js/reader_app.js"></script>
</body>
</html>"""

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    with open('reader.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

    print("Master portal compiled successfully with Multi-Publication Brand Matrix and full automated ingestion pipeline!")

if __name__ == '__main__':
    build_portal()
