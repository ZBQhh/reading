import os
import json
import re

def parse_markdown_to_segments(md_text):
    lines = md_text.split('\n')
    segments = []
    
    if '> **[Advertisement / 赞助广告]**' in md_text or '> **[Advertisement' in md_text:
        ad_lines = [l.replace('>', '').strip() for l in lines if l.strip().startswith('>')]
        clean_text = ' '.join(ad_lines)
        return [{
            'type': 'ad',
            'en': clean_text,
            'zh': '【赞助内容 / 商业广告页】' + clean_text
        }]
        
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
            
        if line.startswith('# The Atlantic') or line.startswith('## Page') or line.startswith('![Page') or line == '---':
            i += 1
            continue
            
        if line.startswith('### '):
            en_title = line.replace('### ', '').replace('**', '').strip()
            zh_title = ''
            if i + 1 < len(lines) and '【标题翻译】' in lines[i+1]:
                zh_title = lines[i+1].replace('**【标题翻译】**', '').replace('【标题翻译】', '').replace('**', '').strip()
                i += 1
            segments.append({'type': 'h3', 'en': en_title, 'zh': zh_title})
            i += 1
            continue
            
        if line.startswith('#### '):
            en_sub = line.replace('#### ', '').replace('**', '').strip()
            zh_sub = ''
            if i + 1 < len(lines) and '【副标题翻译】' in lines[i+1]:
                zh_sub = lines[i+1].replace('**【副标题翻译】**', '').replace('【副标题翻译】', '').replace('**', '').replace('*', '').strip()
                i += 1
            segments.append({'type': 'h4', 'en': en_sub, 'zh': zh_sub})
            i += 1
            continue
            
        if line.startswith('*') and line.endswith('*') and ('PHOTO' in line or 'ILLUSTRATION' in line or 'COURTESY' in line or 'GETTY' in line):
            en_cap = line.strip('*')
            zh_cap = ''
            if i + 1 < len(lines) and '【图注与署名】' in lines[i+1]:
                zh_cap = lines[i+1].replace('*【图注与署名】', '').replace('【图注与署名】', '').replace('*', '').strip()
                i += 1
            segments.append({'type': 'caption', 'en': en_cap, 'zh': zh_cap})
            i += 1
            continue
            
        if line.startswith('**【中文翻译】**') or line.startswith('【中文翻译】'):
            zh_text = line.replace('**【中文翻译】**', '').replace('【中文翻译】', '').replace('**', '').strip()
            if segments and segments[-1]['type'] == 'paragraph' and not segments[-1]['zh']:
                segments[-1]['zh'] = zh_text
            else:
                segments.append({'type': 'paragraph', 'en': '', 'zh': zh_text})
            i += 1
            continue
            
        en_para = line.replace('**', '')
        zh_para = ''
        if i + 1 < len(lines) and ('**【中文翻译】**' in lines[i+1] or '【中文翻译】' in lines[i+1]):
            zh_para = lines[i+1].strip().replace('**【中文翻译】**', '').replace('【中文翻译】', '').replace('**', '').strip()
            i += 1
            
        segments.append({'type': 'paragraph', 'en': en_para, 'zh': zh_para})
        i += 1
        
    return segments

def build_reader():
    pages_data = []
    
    toc_lookup = {
        1: "Cover (封面)",
        5: "Contents & Masthead (目录与编务)",
        8: "Behind the Cover & The Commons (封面故事与读者回响)",
        9: "The Commons (读者来信与辩论)",
        11: "Dispatches: The 'Consumer Socialism' Trap (开篇立论：消费社会主义陷阱)",
        14: "Cover Story: The Age of Reading Is Over (封面专题：阅读的终结与后文学时代)",
        28: "Feature: The Rosenberg Boys (特稿：罗森堡夫妇之子)",
        42: "Feature: Protocol Art & Attention Guild (特稿：协议艺术与反数字垃圾)",
        54: "Feature: The Demons of Maryville (特稿：玛丽维尔的恶魔)",
        64: "Feature: The Cicerone (特稿：永恒之城的引路人)",
        74: "Omnivore: Punctuation & Culture (文化杂食家：标点符号与演化)",
        79: "Books: Tennis's New Golden Age (书评：网球新黄金时代)",
        82: "Books: The Slave Ship and the Mayflower (书评：奴隶船与五月花号)",
        86: "Art: Duchamp's Erotic Enigma (艺术观察：杜尚的色情之谜)",
        90: "Essay: Paradise Revisited — Darwin in Galápagos (特写：重访伊甸园——达尔文与加拉帕戈斯)",
        100: "Colophon & Index (刊尾信息)",
        102: "Look Closer: Pieter de Hooch (细读名画：荷兰黄金时代的室内静谧)"
    }
    
    for p in range(1, 105):
        md_path = f'output/pages/page_{p:03d}.md'
        img_rel = f'output/images/page_{p:03d}.png'
        
        md_text = ''
        if os.path.exists(md_path):
            with open(md_path, 'r', encoding='utf-8') as f:
                md_text = f.read()
                
        segments = parse_markdown_to_segments(md_text)
        
        section_title = toc_lookup.get(p, "")
        if not section_title:
            prev_keys = [k for k in sorted(toc_lookup.keys()) if k <= p]
            if prev_keys:
                section_title = toc_lookup[prev_keys[-1]]
                
        pages_data.append({
            'pageNumber': p,
            'image': img_rel,
            'section': section_title,
            'segments': segments,
            'rawMd': md_text
        })
        
    with open('output/magazine_data.json', 'w', encoding='utf-8') as f:
        json.dump(pages_data, f, ensure_ascii=False)
        
    html_content = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Atlantic — August 2026 | 双语沉浸式杂志阅读器</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Noto+Sans+SC:wght@300;400;500;600;700;900&family=Noto+Serif+SC:wght@300;400;600;700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="reader_style.css">
</head>
<body class="theme-light view-interlinear">
  <!-- Top App Navigation -->
  <header class="app-header">
    <div class="header-left">
      <button id="toggle-sidebar-btn" class="icon-btn" title="切换侧边栏 (T)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      <div class="magazine-brand" onclick="window.location.reload()">
        <span class="masthead-logo">THE ATLANTIC</span>
        <span class="issue-tag">AUGUST 2026 &bull; VOL. 338 NO. 2</span>
      </div>
    </div>

    <!-- Center View Mode Switcher -->
    <div class="view-controls">
      <button class="view-btn active" data-view="interlinear" title="中英逐段对照模式">
        <span>📖 双语对照</span>
      </button>
      <button class="view-btn" data-view="split" title="左侧原版高清图 + 右侧精校双语排版">
        <span>🪟 原图分栏</span>
      </button>
      <button class="view-btn" data-view="en-only" title="纯英文原版阅读">
        <span>🇺🇸 纯英文</span>
      </button>
      <button class="view-btn" data-view="zh-only" title="纯中文译文沉浸">
        <span>🇨🇳 纯中文</span>
      </button>
    </div>

    <!-- Header Right Controls -->
    <div class="header-right">
      <!-- Font Family Switcher -->
      <button id="font-family-toggle" class="font-family-toggle" title="切换屏幕无衬线/典雅衬线字体">🔤 现代黑体</button>

      <!-- TTS Speech Widget -->
      <div class="audio-player-widget">
        <button id="play-page-audio-btn" class="audio-btn" title="原声朗读本页英文 (P)">▶ 朗读本页</button>
        <button id="audio-speed-btn" class="audio-speed-btn" title="调节语速">1.0x</button>
      </div>

      <!-- Search Input -->
      <div class="search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="global-search" placeholder="全书 104 页秒级检索...">
      </div>

      <!-- Theme Switcher -->
      <div class="theme-selector">
        <button class="theme-btn active" data-theme="light" title="浅色明亮">☀️</button>
        <button class="theme-btn" data-theme="sepia" title="复古羊皮纸">📜</button>
        <button class="theme-btn" data-theme="dark" title="暗黑奢华">🌙</button>
      </div>

      <!-- Font Resizer -->
      <div class="font-controls">
        <button id="font-dec-btn" class="tool-btn" title="减小字号">A-</button>
        <button id="font-inc-btn" class="tool-btn" title="增大字号">A+</button>
      </div>

      <button id="fullscreen-btn" class="icon-btn" title="全屏阅读 (F)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
      </button>
    </div>
  </header>

  <div class="main-layout">
    <!-- Left Navigation Sidebar -->
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-tabs">
        <button class="tab-btn active" data-tab="toc">目录导航</button>
        <button class="tab-btn" data-tab="pages">104页缩略</button>
        <button class="tab-btn" data-tab="bookmarks">书签收藏</button>
        <button class="tab-btn" data-tab="search-results" id="search-tab" style="display:none;">搜索结果</button>
      </div>

      <!-- Tab Content: TOC -->
      <div class="tab-pane active" id="tab-toc">
        <div class="toc-header">
          <img src="output/images/page_001.png" alt="Cover" class="sidebar-cover-preview" onclick="window.loadPage(1)">
          <div class="cover-info">
            <h4>The Atlantic</h4>
            <p>2026年8月刊 &bull; 104页全量</p>
            <span class="badge">44.5 万字双语精译</span>
          </div>
        </div>
        <ul class="toc-list" id="toc-list"></ul>
      </div>

      <!-- Tab Content: Pages Grid -->
      <div class="tab-pane" id="tab-pages">
        <div class="page-jump-input-wrap">
          <input type="number" id="quick-jump-num" min="1" max="104" placeholder="输入页码 (1-104)">
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

    <!-- Center Main Reading Canvas -->
    <main class="reader-viewport">
      <div class="reader-container" id="reader-container">
        <!-- Split View: Original Image Column -->
        <div class="image-column" id="image-column">
          <div class="image-toolbar">
            <span class="image-info-tag" id="image-info-tag">PAGE 001 原版高清图 (150 DPI)</span>
            <div class="zoom-tools">
              <button id="zoom-in" class="tiny-btn" title="放大">+</button>
              <button id="zoom-out" class="tiny-btn" title="缩小">-</button>
              <button id="zoom-reset" class="tiny-btn">重置</button>
              <button id="open-lightbox" class="tiny-btn" title="全屏查看大图">🔍 画中画全屏</button>
            </div>
          </div>
          <div class="image-canvas-wrap" id="image-canvas-wrap">
            <img id="page-original-image" src="output/images/page_001.png" alt="Magazine Original Page">
          </div>
        </div>

        <!-- Text Reader Column -->
        <div class="article-column" id="article-column">
          <div class="page-meta-header">
            <div>
              <span class="page-badge" id="current-page-badge">PAGE 001 / 104</span>
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
      <span class="page-counter-text" id="page-counter-text">第 1 / 104 页</span>
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

  <script>
    window.MAGAZINE_DATA = """ + json.dumps(pages_data, ensure_ascii=False) + """;
  </script>
  <script src="reader_app.js"></script>
</body>
</html>"""

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    with open('reader.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    with open('output/index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

    print("Re-compiled index.html with font switcher & clean segments successfully!")

if __name__ == '__main__':
    build_reader()
