import os
import json
import re
import secrets

def resolve_version():
    """VERSION 单一事实源：从 CHANGELOG.md 顶部 `## [x.y.z]` 解析（v2.5 起构建注入）。"""
    try:
        with open('CHANGELOG.md', 'r', encoding='utf-8') as f:
            head = f.read(2000)
        m = re.search(r'##\s*\[\s*(\d+\.\d+\.\d+)\s*\]', head)
        if m:
            return m.group(1)
    except OSError:
        pass
    return '2.5.0'

def build_portal():
    with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
        all_issues = json.load(f)
    # Project B（markdown 自建文章）数据源：由 build_markdown_articles.py 生成
    manual_issues = {}
    if os.path.exists('manual_issues.json'):
        try:
            with open('manual_issues.json', 'r', encoding='utf-8') as f:
                manual_issues = json.load(f)
        except Exception:
            manual_issues = {}
    build_version = resolve_version()
    nonce = secrets.token_hex(16)
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'nonce-" + nonce + "'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "manifest-src 'self'; "
        "media-src 'self' blob:"
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0e1116">
  <meta http-equiv="Content-Security-Policy" content="{csp}">
  <meta name="build-version" content="{build_version}">
  <link rel="manifest" href="manifest.webmanifest">
  <title>The Atlantic & Global Journals — Private Bespoke Reader | 顶级期刊双语私享数字典藏</title>
  <link rel="stylesheet" href="assets/css/reader_style.css">
</head>
<body class="theme-light view-interlinear align-mode-flush">

  <!-- ==========================================================================
       1. APPLE NEWS+ DIGITAL MAGAZINE LIBRARY PORTAL (全刊库首页 + 矩阵筛选 + 全库检索 + 最近在读)
       ========================================================================== -->
  <div id="library-portal-view" class="library-portal-view">
    <header class="portal-header">
      <div class="portal-brand">
        <h1>THE ATLANTIC &bull; GLOBAL JOURNALS</h1>
        <p>Private Bespoke Digital Archive &bull; 双语私享数字期刊典藏馆</p>
      </div>
      <div class="portal-controls">
        <button class="shelf-enter-btn feature-start-btn" data-issue="2026-08" data-page="16" style="background: var(--accent-gold); color: #121316; font-weight: 800;" title="直接跳过刊头广告与目录，秒进8万字重磅正文特稿专区">
          <span>📖 直达重磅特稿 (P16: 阅读的终结)</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <button class="shelf-enter-btn" data-issue="2026-08">
          <span>从封面开始 (P1)</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <button class="shelf-enter-btn portal-data-btn" id="portal-wordbook-btn" title="回顾收藏的生词（双击英文单词即可收藏）"><span>📖 生词本</span></button>
        <button class="shelf-enter-btn portal-data-btn" id="portal-highlights-btn" title="回顾已收藏的高亮选段"><span>🔖 我的高亮</span></button>
        <button class="shelf-enter-btn portal-data-btn" id="portal-bookmarks-btn" title="回顾收藏的书签页"><span>🗂️ 书签</span></button>
      </div>
    </header>

    <main class="portal-hero">
      <span class="portal-hero-badge">DIGITAL BESPOKE ARCHIVE</span>
      <h2>精选典藏期刊库</h2>
      <p>依托 1:1 印刷排版首行缩进解析、真实作者段落集与 22px 英文微浮雕卡片，汇聚全球顶级政经、文学与前沿科技思想典籍。</p>

      <!-- Continue Reading Hero Banner (Auto-Populated from LocalStorage History) -->
      <div id="continue-reading-hero" class="continue-reading-hero" style="display: none;"></div>
      
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
       2. IMMERSIVE READER ROOM (Unified Clean Top Bar & Zero-Obstruction Layout)
       ========================================================================== -->
  <header class="app-header">
    <div class="header-left">
      <!-- Back to Library Portal Button -->
      <button id="open-portal-btn" class="back-to-library-btn" title="返回期刊馆主页 (H / Esc)">
        <span class="btn-icon">🏛️</span>
        <span class="btn-label">馆</span>
      </button>

      <button id="toggle-sidebar-btn" class="icon-btn" title="展开/收起目录 (T)">
        <span class="btn-icon">📋</span>
        <span class="btn-label">目录</span>
      </button>
      
      <div class="magazine-brand">
        <span class="masthead-logo">THE ATLANTIC</span>
      </div>

      <!-- Quick Issue Switcher Pill Button -->
      <div class="issue-switcher-pill" id="issue-switcher-pill" title="点击一键切换 8月刊 / 7月刊 (M)">
        <span class="issue-pill-full">📅 加载中…</span>
        <span class="issue-pill-compact">📅 …</span>
      </div>
    </div>

    <!-- Center Desktop View Mode Switcher -->
    <div class="view-controls">
      <button class="view-btn active" data-view="interlinear" title="1:1 逐段对照，22px 英文卡片主显，22px 中文纯字辅读 (快捷键 1)">
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

    <!-- Header Right Controls: Desktop Speed Pill Outside + Clean Audio + Expandable More Menu -->
    <div class="header-right">
      <!-- Desktop Audio Speed Button Placed Outside -->
      <button id="audio-speed-btn-top" class="audio-btn speed-btn" title="点击调节朗读语速 (1.0x / 1.25x / 1.5x / 0.75x)">1.0x</button>

      <!-- Full Page Audio Widget -->
      <div class="audio-player-widget">
        <button id="play-page-audio-btn" class="audio-btn" title="原声朗读本页英文 (P)">
          <span class="audio-btn-icon">▶</span>
          <span class="audio-btn-text">朗读</span>
        </button>
      </div>

      <!-- Apple Books Expandable "More (···)" Settings & Themes Trigger -->
      <button id="more-settings-btn" class="more-menu-btn" title="偏好设置与 6 大主题 (快捷键 ?)">
        <span class="more-btn-icon">⚙️</span>
        <span class="more-btn-label">更多 (···)</span>
      </button>
    </div>
  </header>

  <!-- Settings Backdrop & Apple Books Style Drawer Popover -->
  <div id="settings-backdrop" class="settings-backdrop"></div>
  <div id="settings-popover-menu" class="settings-popover-menu">
    <!-- Section 1: 6 Curated Luxury Editorial Themes -->
    <div class="popover-section">
      <div class="popover-section-title">🎨 6 大奢华阅读主题</div>
      <div class="popover-theme-grid">
        <div class="popover-theme-card active" data-theme="light">
          <span class="theme-emoji">☀️</span>
          <span>晨曦白</span>
        </div>
        <div class="popover-theme-card" data-theme="sepia">
          <span class="theme-emoji">📜</span>
          <span>羊皮纸</span>
        </div>
        <div class="popover-theme-card" data-theme="beach">
          <span class="theme-emoji">🏖️</span>
          <span>夏日海滩</span>
        </div>
        <div class="popover-theme-card" data-theme="academic">
          <span class="theme-emoji">🧊</span>
          <span>学术冰川</span>
        </div>
        <div class="popover-theme-card" data-theme="forest">
          <span class="theme-emoji">🌿</span>
          <span>森林薄荷</span>
        </div>
        <div class="popover-theme-card" data-theme="dark">
          <span class="theme-emoji">🌙</span>
          <span>极夜黑</span>
        </div>
      </div>
    </div>

    <!-- Section 2: Alignment & Typographic Modes (User-Customizable) -->
    <div class="popover-section">
      <div class="popover-section-title">📐 对齐与排版模式</div>
      <div class="popover-controls-row">
        <button id="align-mode-toggle" class="popover-pill-btn active" style="flex: 1; text-align: center;" title="一键切换自然恒定均距与纸刊两端对齐">
          <span id="align-mode-text">📖 自然恒定均距 (零拉伸)</span>
        </button>
      </div>
    </div>

    <!-- Section 3: Typography & Font Scaling -->
    <div class="popover-section">
      <div class="popover-section-title">🔤 字体与全局 1:1 同步字号</div>
      <div class="popover-controls-row">
        <button id="font-family-toggle" class="popover-pill-btn" title="切换现代黑体/典雅衬线">🔤 现代黑体</button>
        <div class="popover-btn-group">
          <button id="font-dec-btn" class="popover-pill-btn" title="减小全局中英字号">A-</button>
          <button id="font-inc-btn" class="popover-pill-btn" title="增大全局中英字号">A+</button>
        </div>
      </div>
    </div>

    <!-- Section 4: Speech Speed (Synced with Header Speed Pill) -->
    <div class="popover-section">
      <div class="popover-section-title">🔊 原声朗读语速</div>
      <div class="popover-controls-row">
        <div class="popover-btn-group">
          <button id="audio-speed-btn" class="popover-pill-btn" title="调节朗读语速">1.0x 标准</button>
        </div>
      </div>
    </div>

    <!-- Section 5: In-Drawer Global Search -->
    <div class="popover-section">
      <div class="popover-section-title">🔍 全书检索</div>
      <div class="search-box" style="width: 100%;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="global-search" placeholder="输入关键词秒查全刊..." style="width: 100%;">
      </div>
    </div>

    <!-- Section 6: Utilities -->
    <div class="popover-section">
      <div class="popover-controls-row">
        <button id="shortcuts-open-btn" class="popover-pill-btn" title="查看全站快捷键">⌨️ 快捷键速查</button>
        <button id="wordbook-open-btn" class="popover-pill-btn" title="双语阅读生词本 (L)">📖 生词本</button>
      </div>
      <div class="popover-controls-row">
        <button id="fullscreen-btn" class="popover-pill-btn" title="全屏沉浸阅读 (F)">⛶ 全屏沉浸</button>
        <button class="popover-pill-btn" id="data-sync-export-btn" title="导出全部本地数据（书签/高亮/生词/足迹）为 JSON，用于跨设备备份">📦 数据备份</button>
        <button class="popover-pill-btn" id="data-sync-import-btn" title="从 JSON 备份恢复本地数据（跨设备迁移）">📥 恢复</button>
      </div>
    </div>
  </div>

  <!-- Mobile Sub-Bar: Standalone sticky view segmented pill switcher on mobile -->
  <div class="mobile-view-bar">
    <button class="view-btn active" data-view="interlinear" title="1:1 逐段对照 (快捷键 1)">
      <span>📖 逐段</span>
    </button>
    <button class="view-btn" data-view="split" title="原图分栏 (快捷键 2)">
      <span>🪟 原图</span>
    </button>
    <button class="view-btn" data-view="en-only" title="纯英文 (快捷键 3)">
      <span>🇺🇸 英文</span>
    </button>
    <button class="view-btn" data-view="zh-only" title="纯中文 (快捷键 4)">
      <span>🇨🇳 中文</span>
    </button>
  </div>

  <div class="main-layout">
    <!-- Left Navigation Sidebar with One-Click Close Button (Default Collapsed for pure reading focus) -->
    <aside class="app-sidebar collapsed" id="app-sidebar">
      <div class="sidebar-tabs">
        <button class="tab-btn active" data-tab="toc">目录导航</button>
        <button class="tab-btn" data-tab="pages">缩略图</button>
        <button class="tab-btn" data-tab="history">⏱️ 历史</button>
        <button class="tab-btn" data-tab="bookmarks">书签</button>
        <button class="tab-btn" data-tab="search-results" id="search-tab" style="display:none;">检索</button>
        <button class="sidebar-close-btn" id="close-sidebar-btn" title="收起目录 (T / Esc)">✕ 收起</button>
      </div>

      <!-- Tab Content: TOC -->
      <div class="tab-pane active" id="tab-toc">
        <div class="toc-filter-bar" id="toc-filter-bar">
          <button class="toc-filter-btn active" data-filter="all">全部</button>
          <button class="toc-filter-btn" data-filter="article">📖 仅看长文特稿</button>
          <button class="toc-filter-btn" data-filter="visual">🎨 视觉图版</button>
        </div>
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

      <!-- Tab Content: Reading History Footprints Timeline -->
      <div class="tab-pane" id="tab-history">
        <div class="history-pane-header">
          <span class="history-count" id="history-count">0 条阅读足迹</span>
          <button id="clear-history-btn" class="clear-history-btn" title="清空全部历史足迹">🗑️ 清空</button>
        </div>
        <div class="history-timeline-list" id="history-timeline-list"></div>
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
            <img id="page-original-image" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Magazine Original Page" decoding="async">
          </div>
        </div>

        <!-- Text Reader Card Column (Hero English Cards & Pure Subtle Chinese) -->
        <div class="article-column" id="article-column">
          <div class="page-meta-header">
            <div>
              <span class="page-badge" id="current-page-badge">PAGE 001</span>
              <span class="section-title-badge" id="current-section-badge">Cover (封面)</span>
            </div>
            <div class="page-actions">
              <button id="bookmark-page-btn" class="text-action-btn bookmark-btn" title="添加到书签 (B)">☆ 收藏本页</button>
              <button id="copy-page-btn" class="text-action-btn" title="复制本页 Markdown">📋 复制 Markdown</button>
              <button id="export-all-btn" class="text-action-btn" title="导出全刊 Markdown（含我的高亮）(E)">📤 导出全刊</button>
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
      <button id="prev-page-btn" class="nav-page-btn" title="上一页 (← / K)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        <span>上一页</span><span class="key-hint"> (← / K)</span>
      </button>
    </div>

    <div class="bottom-center">
      <input type="range" id="page-slider" min="1" max="104" value="1" class="page-slider">
      <span class="page-counter-text" id="page-counter-text">第 1 页</span>
    </div>

    <div class="bottom-right">
      <button id="next-page-btn" class="nav-page-btn" title="下一页 (→ / J)">
        <span>下一页</span><span class="key-hint"> (→ / J)</span>
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
        <button class="close-shortcuts-btn">&times;</button>
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
          <span>回到页首 (vim gg)</span>
          <span class="shortcut-key-badge">Shift + G</span>
        </div>
        <div class="shortcut-row">
          <span>滑到底部 (vim G)</span>
          <span class="shortcut-key-badge">G</span>
        </div>
        <div class="shortcut-row">
          <span>触屏左右滑动翻页</span>
          <span class="shortcut-key-badge">Swipe</span>
        </div>
        <div class="shortcut-row">
          <span>切换逐段 / 原图 / 单语</span>
          <span class="shortcut-key-badge">1 / 2 / 3 / 4</span>
        </div>
        <div class="shortcut-row">
          <span>原声朗读整页 (TTS)</span>
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
          <span>选中文字 → 🔖 高亮（点击高亮可取消）</span>
          <span class="shortcut-key-badge">鼠标选区</span>
        </div>
        <div class="shortcut-row">
          <span>导出全刊 Markdown（含高亮）</span>
          <span class="shortcut-key-badge">E</span>
        </div>
        <div class="shortcut-row">
          <span>生词本（双击英文单词收藏）</span>
          <span class="shortcut-key-badge">L</span>
        </div>
        <div class="shortcut-row">
          <span>返回期刊馆</span>
          <span class="shortcut-key-badge">Esc / H</span>
        </div>
      </div>
      <div id="shortcuts-version" class="shortcuts-version" style="padding:10px 0 2px; font-size:11px; color:var(--text-muted);"></div>
    </div>
  </div>

  <!-- 生词本弹窗（毒舌 7.2：双语阅读器的天作之合） -->
  <div id="wordbook-modal" class="shortcuts-modal">
    <div class="wordbook-card">
      <div class="shortcuts-header">
        <h3>📖 生词本 <span id="wordbook-count" class="wordbook-count"></span></h3>
        <button class="close-wordbook-btn close-shortcuts-btn">&times;</button>
      </div>
      <div class="wordbook-toolbar">
        <button id="wordbook-export-btn" class="wordbook-pill" title="导出 Markdown 生词表">📤 导出</button>
        <button id="wordbook-clear-btn" class="wordbook-pill danger" title="清空全部生词">🗑️ 清空</button>
      </div>
      <div id="wordbook-list" class="wordbook-list"></div>
      <div class="wordbook-tip">💡 阅读中双击选中的英文单词 → 点「📖 生词」即可收藏；点击词条可跳回原页复习；🔊 可在线发音。</div>
    </div>
  </div>

  <!-- 我的高亮弹窗（毒舌 7.2：读完留得住——全局回顾 + 删除 + 导出） -->
  <div id="highlights-modal" class="shortcuts-modal">
    <div class="wordbook-card">
      <div class="shortcuts-header">
        <h3>🔖 我的高亮 <span id="highlights-count" class="wordbook-count"></span></h3>
        <button class="close-highlights-btn close-shortcuts-btn">&times;</button>
      </div>
      <div class="wordbook-toolbar">
        <button id="highlights-export-btn" class="wordbook-pill" title="导出全部高亮 Markdown">📤 导出</button>
        <button id="highlights-clear-btn" class="wordbook-pill danger" title="清空全部高亮">🗑️ 清空</button>
      </div>
      <div id="highlights-list" class="wordbook-list"></div>
      <div class="wordbook-tip">💡 阅读中选中英文文本 → 点「🔖 高亮」即可收藏；点击词条可跳回原页回顾。</div>
    </div>
  </div>

  <script nonce="{nonce}">
    // Embedded Multi-Issue Archive
    window.ALL_ISSUES = {json.dumps(all_issues, ensure_ascii=False).replace('</', '<\\/')};
    window.MANUAL_ISSUES = {json.dumps(manual_issues, ensure_ascii=False).replace('</', '<\\/')};
    window.BUILD_VERSION = '{build_version}';
  </script>
  <script src="assets/js/reader_app.js" nonce="{nonce}"></script>
</body>
</html>"""

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    # reader.html 是给旧书签/旧链接的 3 行跳转桩（对齐 index.html，避免 2.64MB 字节级重复；毒舌 4.3）
    redirect_stub = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=index.html">
  <title>The Atlantic & Global Journals — Reader</title>
  <style>body{font-family:system-ui,sans-serif;background:#f7f5f1;color:#333;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:0 16px}div{max-width:420px}a{color:#7a5c1e}</style>
</head>
<body>
  <div>跳转至数码典藏馆…<br>若未自动跳转，请<a href="index.html">点击进入阅读器</a></div>
</body>
</html>
"""
    with open('reader.html', 'w', encoding='utf-8') as f:
        f.write(redirect_stub)

    print("Master portal compiled successfully with TOC Filter Bar & Feature Fast-Track!")

if __name__ == '__main__':
    build_portal()
