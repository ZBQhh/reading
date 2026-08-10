/* ============================================================================
 * core.js — Shared state, constants, DOM cache, and low-level utilities.
 *
 * Every reassigned runtime scalar lives on `state` so other ES modules can
 * import and mutate it. ES module live bindings forbid reassigning an imported
 * binding, so a single container object is the seam between modules.
 * `els` (DOM cache) and the constants are `const` objects whose *contents*
 * mutate — those bindings are never reassigned, so they stay named exports.
 * ==========================================================================*/

export const LS = {
  issue: 'atlantic_reader_issue',
  pagePrefix: 'atlantic_reader_last_page_',
  theme: 'atlantic_reader_theme',
  view: 'atlantic_reader_view',
  font: 'atlantic_reader_font_mode',
  bookmarks: 'atlantic_reader_bookmarks_',
  history: 'atlantic_reader_history_log',
  speed: 'atlantic_reader_audio_speed',
  align: 'atlantic_reader_align_mode',
  fontScale: 'atlantic_reader_font_scale',
  highlights: 'atlantic_reader_highlights',
  wordbook: 'atlantic_reader_wordbook',
};

export const VIEW_MODES = ['interlinear', 'split', 'en-only', 'zh-only'];
export const THEMES = ['light', 'sepia', 'beach', 'academic', 'forest', 'dark'];
export const HELD = {
  SEARCH_DEBOUNCE: 150,
  HISTORY_MAX: 50,
  ZOOM_MAX: 4,
  ZOOM_MIN: 0.5,
  JUMP_LOCK_MS: 60,
  MIN_SPEECH_SEG_CHARS: 5,
  SWIPE_THRESHOLD_PX: 60,
  WORDBOOK_MAX: 500,
};

export const VERSION = window.BUILD_VERSION || '2.6.18';
export const allIssues = window.ALL_ISSUES || {};

// DOM cache — populated once in main.js (ELS_BY_ID). Contents mutate; binding does not.
export const els = {};

// Reassigned runtime state. Initialized here so every module shares one source.
export const state = {
  currentPubFilter: 'all',
  magazineNewestFirst: false, // 杂志列表「最新在前」翻转
  manualNewestFirst: false,   // 自选文库「最新在前」翻转
  currentIssueId: lsGet(LS.issue, ''),
  currentIssueObj: null,
  data: [],
  currentPage: 1,
  currentZoom: 1.0,
  globalFontScale: 22,
  isPlayingAudio: false,
  audioSpeed: readFloat(LS.speed, 1.0),
  currentPlayingSegmentDiv: null,
  isSerifMode: false,
  isNavigating: false,
  searchIndexCache: null,
  ttsVoice: null,
  currentAlignModeInternal: 'flush',
};

// 注意：数据缺失时绝不伪造 104 页空刊——boot 时报错（见 reader.js / boot）
if (!allIssues[state.currentIssueId]) state.currentIssueId = Object.keys(allIssues)[0] || '';
state.currentIssueObj = allIssues[state.currentIssueId] || { id: '', pages: [], totalPages: 0, displayName: '未加载' };
state.data = state.currentIssueObj.pages || [];

// ---------------------------------------------------------------- 工具
/** 读取存储（异常/缺失安全） */
export function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (_e) {
    return fallback;
  }
}
export function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_e) { /* 隐私模式/配额满时静默降级 */ }
}
export function readFloat(key, fallback) {
  const v = parseFloat(lsGet(key, ''));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
export function readInt(str, fallback) {
  const v = parseInt(str, 10);
  return Number.isFinite(v) ? v : fallback;
}
export function readJson(key, fallback) {
  try {
    const v = JSON.parse(lsGet(key, ''));
    return Array.isArray(v) ? v : fallback;
  } catch (_e) {
    return fallback;
  }
}
export function $(id) { return document.getElementById(id); }
export function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
export function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function escRegex(q) { return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function stripInvisibles(s) { return (s || '').replace(/[\u00AD\u200B-\u200D\uFEFF]/g, ''); }
export function debounce(fn, ms) {
  let t;
  return function () { const args = arguments; const self = this; clearTimeout(t); t = setTimeout(() => fn.apply(self, args), ms); };
}
export function smoothByPref() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/** 显示态文本：HTML 转义 + 最小 Markdown(*…* → <em>) 后注入 innerHTML 使用 */
export function toDisplayText(str) {
  if (!str) return '';
  let s = String(str);
  s = escHtml(s);
  s = s.replace(/\*\s+\*/g, ' ').replace(/\*\*\*/g, ' ');
  s = s.replace(/\*\*\*/g, '').replace(/\*\*/g, '');
  s = s.replace(/\*【[^】]*】/g, '');
  s = s.replace(/(^|\s)\*([^*]+)\*(\s|$)/g, '$1<em>$2</em>$3');
  s = s.replace(/\*/g, '');
  return s.trim();
}

/** 纯文本态：供 TTS / 属性 / 剪贴板，无任何 HTML 痕迹 */
export function toPlainText(str) {
  if (!str) return '';
  return stripInvisibles(String(str))
    .replace(/\*\s+\*/g, ' ').replace(/\*\*\*/g, ' ')
    .replace(/\*【[^】]*】/g, ' ')
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------- HUD
// toast(msg, type)：type = ok(1.6s) / warn(2.5s) / error(3.5s)，按消息性质分级
let toastNode = null;
export function toast(msg, type) {
  if (!toastNode) {
    toastNode = document.createElement('div');
    toastNode.className = 'reader-hud-toast';
    document.body.appendChild(toastNode);
  }
  toastNode.textContent = msg;
  toastNode.classList.add('visible');
  clearTimeout(toastNode._t);
  const ms = type === 'error' ? 3500 : (type === 'warn' ? 2500 : 1600);
  toastNode._t = setTimeout(function () { toastNode.classList.remove('visible'); }, ms);
}

// ---------------------------------------------------------------- 自定义确认框
export function confirmDialog(opts) {
  return new Promise(function (resolve) {
    const wrap = document.createElement('div');
    wrap.className = 'confirm-modal';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML =
      '<div class="confirm-card" role="document">' +
      '<h3>' + escHtml(opts.title || '确认操作') + '</h3>' +
      '<p>' + escHtml(opts.message || '') + '</p>' +
      '<div class="confirm-actions">' +
      '<button class="confirm-btn confirm-cancel">' + escHtml(opts.cancelText || '取消') + '</button>' +
      '<button class="confirm-btn confirm-ok' + (opts.danger ? ' danger' : '') + '">' + escHtml(opts.okText || '确认') + '</button>' +
      '</div></div>';
    document.body.appendChild(wrap);

    let done = false;
    function finish(val) {
      if (done) return;
      done = true;
      wrap.remove();
      resolve(val);
    }
    wrap.addEventListener('click', function (e) {
      if (e.target.classList.contains('confirm-ok')) finish(true);
      else if (e.target.classList.contains('confirm-cancel')) finish(false);
      else if (e.target === wrap) finish(false);
    });
    const onKey = function (e) {
      e.stopPropagation();
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'Enter' && !e.shiftKey) {
        // 危险操作默认安全侧——Enter 取决于当前焦点钮
        const focused = wrap.querySelector(':focus');
        finish(focused && focused.classList.contains('confirm-cancel') ? false : true);
      }
    };
    wrap.addEventListener('keydown', onKey, true);
    // 危险操作默认聚焦"取消"，避免误回车；普通确认聚焦"确认"
    const focusBtn = wrap.querySelector(opts.danger ? '.confirm-cancel' : '.confirm-ok');
    if (focusBtn) focusBtn.focus();
  });
}

// ---------------------------------------------------------------- 滚动
export function scrollPage(delta) {
  const portal = els.libraryPortal;
  if (portal && !portal.classList.contains('hidden')) { portal.scrollTop += delta; return; }
  const vp = els.readerViewport;
  if (vp) vp.scrollTop += delta;
}

// ---------------------------------------------------------------- 图片预载
export function webpUrl(pngSrc) {
  return String(pngSrc || '').replace(/\.png$/i, '.webp');
}
// srcset 响应式（P4）：仅当构建期已生成 @1x/@2x 变体并置 window.ATL_SRCSET 时启用，避免 404
export function webpSrcset(pngSrc) {
  if (!window.ATL_SRCSET) return '';
  const base = String(pngSrc || '').replace(/\.png$/i, '');
  return webpUrl(base + '@1x.png') + ' 1x, ' + webpUrl(base + '@2x.png') + ' 2x';
}
export function imgWithWebFallback(imgEl) {
  if (!imgEl || imgEl.dataset.webpFB) return;
  imgEl.dataset.webpFB = '1';
  imgEl.addEventListener('error', function () {
    const cur = imgEl.getAttribute('src') || '';
    if (/\.webp$/i.test(cur)) imgEl.src = cur.replace(/\.webp$/i, '.png');
  });
}
export function preloadAdjacentPages(pNum) {
  const root = state.currentIssueObj.imageRoot || 'issues/' + state.currentIssueObj.id;
  const pre = function (n) {
    if (n < 1 || n > state.currentIssueObj.totalPages) return;
    new Image().src = webpUrl(root + '/images/page_' + String(n).padStart(3, '0') + '.png');
  };
  pre(pNum - 1);
  pre(pNum + 1);
  pre(pNum + 2);
}

// ---------------------------------------------------------------- 主题色注入
// 阅读框/分隔线/标题条的主题色跟随「阅读主题」(--accent) 实时变化，
// 不再把文章固定 themeColor 注入 --issue-accent（避免颜色写死、不随主题切换）。
// --issue-accent 的 CSS 默认值即 var(--accent)，切换主题即整体联动。
export function applyIssueAccent() {
  document.documentElement.style.removeProperty('--issue-accent');
}

// Project B（markdown 自建文章）数据源：由 build_markdown_articles.py 注入 window.MANUAL_ISSUES
export function getMarkdownArticle(id) {
  if (typeof window === 'undefined' || !window.MANUAL_ISSUES) return null;
  return window.MANUAL_ISSUES[id] || null;
}

// 书架列表折叠：当卡片数量超过阈值时，只展示前 N 张，其余隐藏，
// 并追加一个「显示全部 N 篇 ▾ / 收起」切换按钮（作为容器最后一个子元素，
// 自动跨满整行）。响应式阈值：桌面 12、移动(≤640) 6。
// opts.exclude：不参与折叠/计数的选择器（如「＋新建」入口卡，始终可见）。
export function applyShelfCollapse(container, opts) {
  if (!container) return;
  opts = opts || {};
  const exclude = opts.exclude || null;
  const cards = [];
  Array.prototype.forEach.call(container.children, function (c) {
    if (c.classList && c.classList.contains('shelf-issue-card') && (!exclude || !c.matches(exclude))) cards.push(c);
  });
  const limit = (typeof window !== 'undefined' && window.innerWidth <= 640) ? 6 : 12;
  const expanded = container.getAttribute('data-expanded') === '1';
  cards.forEach(function (c, i) {
    c.style.display = (expanded || i < limit) ? '' : 'none';
  });
  const oldToggle = container.querySelector('.shelf-collapse-toggle');
  if (oldToggle) oldToggle.remove();
  if (cards.length <= limit) {
    container.removeAttribute('data-expanded');
    return;
  }
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'shelf-collapse-toggle';
  toggle.textContent = expanded ? '△ 收起' : ('显示全部 ' + cards.length + ' 篇 ▾');
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    container.setAttribute('data-expanded', container.getAttribute('data-expanded') === '1' ? '0' : '1');
    applyShelfCollapse(container, opts);
  });
  container.appendChild(toggle);
}

// 统计一篇文章（或整刊）的英文单词总数：遍历 pages → segments → en 文本。
// 用于书架卡片与阅读器药丸上的「🔤 N 词」统计。
export function countEnglishWords(issue) {
  if (!issue || !Array.isArray(issue.pages)) return 0;
  let total = 0;
  issue.pages.forEach(function (page) {
    (page.segments || []).forEach(function (seg) {
      const en = seg && seg.en;
      if (!en) return;
      const m = String(en).match(/[A-Za-z]+(?:'[A-Za-z]+)*/g);
      if (m) total += m.length;
    });
  });
  return total;
}
