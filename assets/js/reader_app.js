(() => {
  // src/core.js
  var LS = {
    issue: "atlantic_reader_issue",
    pagePrefix: "atlantic_reader_last_page_",
    theme: "atlantic_reader_theme",
    view: "atlantic_reader_view",
    font: "atlantic_reader_font_mode",
    bookmarks: "atlantic_reader_bookmarks_",
    history: "atlantic_reader_history_log",
    speed: "atlantic_reader_audio_speed",
    align: "atlantic_reader_align_mode",
    fontScale: "atlantic_reader_font_scale",
    highlights: "atlantic_reader_highlights",
    wordbook: "atlantic_reader_wordbook"
  };
  var VIEW_MODES = ["interlinear", "split", "en-only", "zh-only"];
  var THEMES = ["light", "sepia", "beach", "academic", "forest", "dark"];
  var HELD = {
    SEARCH_DEBOUNCE: 150,
    HISTORY_MAX: 50,
    ZOOM_MAX: 4,
    ZOOM_MIN: 0.5,
    JUMP_LOCK_MS: 60,
    MIN_SPEECH_SEG_CHARS: 5,
    SWIPE_THRESHOLD_PX: 60,
    WORDBOOK_MAX: 500
  };
  var VERSION = window.BUILD_VERSION || "2.5.0";
  var allIssues = window.ALL_ISSUES || {};
  var els = {};
  var state = {
    currentPubFilter: "all",
    currentIssueId: lsGet(LS.issue, ""),
    currentIssueObj: null,
    data: [],
    currentPage: 1,
    currentZoom: 1,
    globalFontScale: 22,
    isPlayingAudio: false,
    audioSpeed: readFloat(LS.speed, 1),
    currentPlayingSegmentDiv: null,
    isSerifMode: false,
    isNavigating: false,
    searchIndexCache: null,
    ttsVoice: null,
    currentAlignModeInternal: "flush"
  };
  if (!allIssues[state.currentIssueId]) state.currentIssueId = Object.keys(allIssues)[0] || "";
  state.currentIssueObj = allIssues[state.currentIssueId] || { id: "", pages: [], totalPages: 0, displayName: "未加载" };
  state.data = state.currentIssueObj.pages || [];
  function lsGet(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (_e) {
      return fallback;
    }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_e) {
    }
  }
  function readFloat(key, fallback) {
    const v = parseFloat(lsGet(key, ""));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  }
  function readInt(str, fallback) {
    const v = parseInt(str, 10);
    return Number.isFinite(v) ? v : fallback;
  }
  function readJson(key, fallback) {
    try {
      const v = JSON.parse(lsGet(key, ""));
      return Array.isArray(v) ? v : fallback;
    } catch (_e) {
      return fallback;
    }
  }
  function $(id) {
    return document.getElementById(id);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function escHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escRegex(q) {
    return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function stripInvisibles(s) {
    return (s || "").replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "");
  }
  function debounce(fn, ms) {
    let t;
    return function() {
      const args = arguments;
      const self = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(self, args), ms);
    };
  }
  function smoothByPref() {
    return matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }
  function toDisplayText(str) {
    if (!str) return "";
    let s = String(str);
    s = escHtml(s);
    s = s.replace(/\*\s+\*/g, " ").replace(/\*\*\*/g, " ");
    s = s.replace(/\*\*\*/g, "").replace(/\*\*/g, "");
    s = s.replace(/\*【[^】]*】/g, "");
    s = s.replace(/(^|\s)\*([^*]+)\*(\s|$)/g, "$1<em>$2</em>$3");
    s = s.replace(/\*/g, "");
    return s.trim();
  }
  function toPlainText(str) {
    if (!str) return "";
    return stripInvisibles(String(str)).replace(/\*\s+\*/g, " ").replace(/\*\*\*/g, " ").replace(/\*【[^】]*】/g, " ").replace(/\*\*/g, "").replace(/\*/g, "").replace(/[\r\n]+/g, " ").trim();
  }
  var toastNode = null;
  function toast(msg, type) {
    if (!toastNode) {
      toastNode = document.createElement("div");
      toastNode.className = "reader-hud-toast";
      document.body.appendChild(toastNode);
    }
    toastNode.textContent = msg;
    toastNode.classList.add("visible");
    clearTimeout(toastNode._t);
    const ms = type === "error" ? 3500 : type === "warn" ? 2500 : 1600;
    toastNode._t = setTimeout(function() {
      toastNode.classList.remove("visible");
    }, ms);
  }
  function confirmDialog(opts) {
    return new Promise(function(resolve) {
      const wrap = document.createElement("div");
      wrap.className = "confirm-modal";
      wrap.setAttribute("role", "dialog");
      wrap.setAttribute("aria-modal", "true");
      wrap.innerHTML = '<div class="confirm-card" role="document"><h3>' + escHtml(opts.title || "确认操作") + "</h3><p>" + escHtml(opts.message || "") + '</p><div class="confirm-actions"><button class="confirm-btn confirm-cancel">' + escHtml(opts.cancelText || "取消") + '</button><button class="confirm-btn confirm-ok' + (opts.danger ? " danger" : "") + '">' + escHtml(opts.okText || "确认") + "</button></div></div>";
      document.body.appendChild(wrap);
      let done = false;
      function finish(val) {
        if (done) return;
        done = true;
        wrap.remove();
        resolve(val);
      }
      wrap.addEventListener("click", function(e) {
        if (e.target.classList.contains("confirm-ok")) finish(true);
        else if (e.target.classList.contains("confirm-cancel")) finish(false);
        else if (e.target === wrap) finish(false);
      });
      const onKey = function(e) {
        e.stopPropagation();
        if (e.key === "Escape") finish(false);
        else if (e.key === "Enter" && !e.shiftKey) {
          const focused = wrap.querySelector(":focus");
          finish(focused && focused.classList.contains("confirm-cancel") ? false : true);
        }
      };
      wrap.addEventListener("keydown", onKey, true);
      const focusBtn = wrap.querySelector(opts.danger ? ".confirm-cancel" : ".confirm-ok");
      if (focusBtn) focusBtn.focus();
    });
  }
  function scrollPage(delta) {
    const portal = els.libraryPortal;
    if (portal && !portal.classList.contains("hidden")) {
      portal.scrollTop += delta;
      return;
    }
    const vp = els.readerViewport;
    if (vp) vp.scrollTop += delta;
  }
  function webpUrl(pngSrc) {
    return String(pngSrc || "").replace(/\.png$/i, ".webp");
  }
  function webpSrcset(pngSrc) {
    if (!window.ATL_SRCSET) return "";
    const base = String(pngSrc || "").replace(/\.png$/i, "");
    return webpUrl(base + "@1x.png") + " 1x, " + webpUrl(base + "@2x.png") + " 2x";
  }
  function imgWithWebFallback(imgEl) {
    if (!imgEl || imgEl.dataset.webpFB) return;
    imgEl.dataset.webpFB = "1";
    imgEl.addEventListener("error", function() {
      const cur = imgEl.getAttribute("src") || "";
      if (/\.webp$/i.test(cur)) imgEl.src = cur.replace(/\.webp$/i, ".png");
    });
  }
  function preloadAdjacentPages(pNum) {
    const root = state.currentIssueObj.imageRoot || "issues/" + state.currentIssueObj.id;
    const pre = function(n) {
      if (n < 1 || n > state.currentIssueObj.totalPages) return;
      new Image().src = webpUrl(root + "/images/page_" + String(n).padStart(3, "0") + ".png");
    };
    pre(pNum - 1);
    pre(pNum + 1);
    pre(pNum + 2);
  }
  function applyIssueAccent() {
    document.documentElement.style.removeProperty("--issue-accent");
  }
  function getMarkdownArticle(id) {
    if (typeof window === "undefined" || !window.MANUAL_ISSUES) return null;
    return window.MANUAL_ISSUES[id] || null;
  }

  // src/speech.js
  function pickVoice() {
    const synth = window.speechSynthesis;
    if (!synth || !synth.getVoices) return null;
    const voices = synth.getVoices();
    if (voices.length === 0) return null;
    const enVoices = voices.filter(function(v) {
      return v.lang && v.lang.toLowerCase().indexOf("en") === 0;
    });
    if (enVoices.length === 0) return null;
    const prefs = ["Google US English", "Samantha", "Microsoft Zira", "Microsoft Aria"];
    for (let i = 0; i < prefs.length; i++) {
      const v = enVoices.find(function(v2) {
        return v2.name.indexOf(prefs[i]) >= 0;
      });
      if (v) return v;
    }
    return enVoices[0] || null;
  }
  function resetSpeechState() {
    state.isPlayingAudio = false;
    state.currentPlayingSegmentDiv = null;
    if (els.playPageAudioBtn) {
      els.playPageAudioBtn.querySelector(".audio-btn-icon").textContent = "▶";
      els.playPageAudioBtn.querySelector(".audio-btn-text").textContent = "朗读";
      els.playPageAudioBtn.setAttribute("aria-label", "朗读整页");
    }
    $$(".segment-block.playing-active").forEach(function(b) {
      b.classList.remove("playing-active");
    });
  }
  function stopSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    resetSpeechState();
  }
  function speakText(text) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(toPlainText(text));
    u.lang = "en-US";
    u.rate = state.audioSpeed;
    if (state.ttsVoice) u.voice = state.ttsVoice;
    u.onend = resetSpeechState;
    u.onerror = function() {
      resetSpeechState();
      toast("⚠️ 朗读中断，请重试", "warn");
    };
    synth.speak(u);
  }
  function playParagraphSpeech(text, block) {
    stopSpeech();
    const clean = toPlainText(text);
    if (!clean) return;
    state.isPlayingAudio = true;
    state.currentPlayingSegmentDiv = block;
    block.classList.add("playing-active");
    toast("🔊 朗读中（再次点击暂停）");
    speakText(clean);
  }
  function playPageSpeech() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (state.isPlayingAudio && !state.currentPlayingSegmentDiv) {
      stopSpeech();
      toast("⏸ 整页朗读已暂停");
      return;
    }
    stopSpeech();
    const pageObj = state.data[state.currentPage - 1];
    if (!pageObj || !pageObj.segments || pageObj.segments.length === 0) return;
    const enTexts = pageObj.segments.filter(function(s) {
      return s.en && s.en.length > HELD.MIN_SPEECH_SEG_CHARS;
    }).map(function(s) {
      return toPlainText(s.en);
    });
    if (enTexts.length === 0) return;
    state.isPlayingAudio = true;
    if (els.playPageAudioBtn) {
      els.playPageAudioBtn.querySelector(".audio-btn-icon").textContent = "⏸";
      els.playPageAudioBtn.querySelector(".audio-btn-text").textContent = "暂停";
      els.playPageAudioBtn.setAttribute("aria-label", "暂停朗读");
    }
    toast("🔊 正在朗读整页英文");
    speakText(enTexts.join(". "));
  }

  // src/highlight.js
  function loadHighlights() {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(LS.highlights) || "[]");
    } catch (_e) {
      return [];
    }
    if (!Array.isArray(raw)) return [];
    return raw.filter(function(h) {
      return h && typeof h.issue === "string" && typeof h.page === "number" && typeof h.seg === "number" && typeof h.lang === "string" && typeof h.start === "number" && typeof h.end === "number" && h.end > h.start;
    });
  }
  function saveHighlights(list) {
    try {
      localStorage.setItem(LS.highlights, JSON.stringify(list));
    } catch (_e) {
    }
  }
  function locateTextOffset(container, offset) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let acc = 0;
    let node;
    while (node = walker.nextNode()) {
      const len = (node.nodeValue || "").length;
      if (acc + len > offset) return { node, off: offset - acc };
      acc += len;
    }
    return { node: walker.lastChild, off: walker.lastChild ? (walker.lastChild.nodeValue || "").length : 0 };
  }
  function captureSelectionHighlight() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      toast("💡 请先选中一段文字", "warn");
      return;
    }
    const rg = sel.getRangeAt(0);
    const startEl = rg.startContainer.nodeType === Node.ELEMENT_NODE ? rg.startContainer : rg.startContainer.parentElement;
    const endEl = rg.endContainer.nodeType === Node.ELEMENT_NODE ? rg.endContainer : rg.endContainer.parentElement;
    const segBlock = startEl.closest && startEl.closest(".segment-block");
    if (!segBlock || !endEl.closest || !endEl.closest(".segment-block")) {
      toast("⚠️ 高亮仅支持单段选区", "error");
      return;
    }
    if (startEl.closest(".segment-block") !== endEl.closest(".segment-block")) {
      toast("⚠️ 高亮仅支持单段选区", "warn");
      return;
    }
    const inZh = !!startEl.closest(".zh-text-card");
    const zhInner = inZh ? segBlock.querySelector(".zh-text-card > div:first-child") : null;
    const enEl = segBlock.querySelector(".en-text");
    const targetEl = inZh ? zhInner : enEl;
    if (!targetEl) {
      toast("⚠️ 该段无可用正文", "warn");
      return;
    }
    const walker = document.createTreeWalker(targetEl, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let n;
    while (n = walker.nextNode()) textNodes.push(n);
    let startAbs = -1;
    let endAbs = -1;
    let acc = 0;
    for (let i = 0; i < textNodes.length; i++) {
      const tn = textNodes[i];
      const len = (tn.nodeValue || "").length;
      if (startAbs < 0 && (tn === rg.startContainer || tn.contains(rg.startContainer) || rg.startContainer === targetEl)) {
        if (rg.startContainer === targetEl) startAbs = acc;
        else if (tn === rg.startContainer) startAbs = acc + rg.startOffset;
        else if (tn.contains(rg.startContainer)) {
          let cur = rg.startContainer;
          let off = rg.startOffset;
          while (cur && cur !== tn) {
            off += cur.previousSibling ? (cur.previousSibling.textContent || "").length : 0;
            cur = cur.parentNode;
          }
          startAbs = acc + off;
        }
      }
      if (endAbs === -1 && (tn === rg.endContainer || tn.contains(rg.endContainer) && rg.endContainer !== targetEl)) {
        if (tn === rg.endContainer) endAbs = acc + rg.endOffset;
        else {
          let cur = rg.endContainer;
          let off = rg.endOffset;
          while (cur && cur !== tn) {
            off += cur.previousSibling ? (cur.previousSibling.textContent || "").length : 0;
            cur = cur.parentNode;
          }
          endAbs = acc + off;
        }
      } else if (endAbs === -1 && rg.endContainer.nodeType === Node.TEXT_NODE && rg.endContainer === tn) {
        endAbs = acc + rg.endOffset;
      }
      if (startAbs >= 0 && endAbs >= 0) break;
      acc += len;
    }
    if (startAbs < 0 || endAbs < 0) {
      toast("⚠️ 无法定位选区，请重选", "warn");
      return;
    }
    const segIdx = parseInt(String(segBlock.id).replace("seg-", ""), 10);
    if (isNaN(segIdx)) {
      toast("⚠️ 段索引异常", "error");
      return;
    }
    const text = sel.toString().trim();
    if (!text) return;
    const hls = loadHighlights();
    const lang = inZh ? "zh" : "en";
    const dup = hls.some(function(h) {
      return h.issue === state.currentIssueId && h.page === state.currentPage && h.seg === segIdx && h.lang === lang && h.start === startAbs && h.end === endAbs;
    });
    if (dup) {
      removeHighlight(segIdx, startAbs, endAbs, lang);
    } else {
      hls.push({ issue: state.currentIssueId, page: state.currentPage, seg: segIdx, lang, start: startAbs, end: endAbs, text: text.slice(0, 300), ts: Date.now() });
      saveHighlights(hls);
      applyPageHighlights();
      toast("🔖 已高亮「" + text.slice(0, 24) + (text.length > 24 ? "…" : "") + "」");
    }
    sel.removeAllRanges();
  }
  function removeHighlight(segIdx, start, end, lang) {
    let hls = loadHighlights();
    hls = hls.filter(function(h) {
      return !(h.issue === state.currentIssueId && h.page === state.currentPage && h.seg === segIdx && h.lang === lang && h.start === start && h.end === end);
    });
    saveHighlights(hls);
    applyPageHighlights();
  }
  function applyPageHighlights() {
    const body = els.articleBody;
    if (!body) return;
    const pageHl = loadHighlights().filter(function(h) {
      return h.issue === state.currentIssueId && h.page === state.currentPage;
    });
    if (pageHl.length === 0) return;
    pageHl.forEach(function(hl) {
      const segBlock = body.querySelector("#seg-" + hl.seg);
      if (!segBlock) return;
      const targetEl = hl.lang === "zh" ? segBlock.querySelector(".zh-text-card > div:first-child") : segBlock.querySelector(".en-text");
      if (!targetEl) return;
      const textLen = (targetEl.textContent || "").length;
      if (hl.start < 0 || hl.end <= hl.start || hl.end > textLen) return;
      const a = locateTextOffset(targetEl, hl.start);
      const b = locateTextOffset(targetEl, hl.end);
      if (!a.node || !b.node || a.node === b.node && a.off === b.off) return;
      const rg = document.createRange();
      rg.setStart(a.node, a.off);
      rg.setEnd(b.node, b.off);
      const mark = document.createElement("mark");
      mark.className = "page-highlight";
      try {
        rg.surroundContents(mark);
      } catch (_e) {
        try {
          const frag = rg.extractContents();
          mark.appendChild(frag);
          rg.insertNode(mark);
        } catch (_e2) {
        }
      }
    });
  }
  function exportAllMarkdown() {
    const total = state.currentIssueObj.totalPages || state.data && state.data.length || 0;
    if (total <= 0) {
      toast("⚠️ 刊目数据缺失，无法导出", "error");
      return;
    }
    const md = state.data.map(function(pageObj, i) {
      if (!pageObj || typeof pageObj.rawMd !== "string") return "";
      return "\n\n---\n\n## PAGE " + String(i + 1).padStart(3, "0") + " — " + (pageObj.section || "") + "\n\n" + pageObj.rawMd.trim();
    }).join("");
    const hls = loadHighlights().filter(function(h) {
      return h.issue === state.currentIssueId;
    });
    const hlSection = hls.length === 0 ? "" : "\n\n---\n\n## 📌 我的高亮（" + hls.length + " 条）\n\n" + hls.map(function(h) {
      return "> **PAGE " + String(h.page).padStart(3, "0") + "** — " + h.text.replace(/\n/g, " ") + "\n";
    }).join("\n");
    const header = "# " + state.currentIssueObj.displayName + "\n\n> 由 The Atlantic Private Bespoke Reader 导出 · " + state.currentIssueObj.totalPages + " 页双语典藏\n\n已含高亮节（" + hls.length + " 条）";
    const full = header + md + hlSection + "\n";
    const blob = new Blob([full], { type: "text/markdown;charset=utf-8" });
    const urlName = "the-atlantic-" + state.currentIssueId + "-export.md";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = urlName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1e3);
    toast("📤 已导出 " + urlName + "（含 " + hls.length + " 条高亮）");
  }
  function exportHighlightsMd() {
    const hls = loadHighlights().filter(function(h) {
      return h.issue === state.currentIssueId;
    });
    const md = "# 我的高亮 — " + state.currentIssueObj.displayName + "\n\n" + (hls.length === 0 ? "（暂无高亮）" : hls.map(function(h) {
      return "> **PAGE " + String(h.page).padStart(3, "0") + "** — " + h.text.replace(/\n/g, " ") + "\n";
    }).join("\n"));
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-highlights-" + state.currentIssueId + ".md";
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1e3);
    toast("📤 已导出高亮清单（" + hls.length + " 条）");
  }

  // src/history.js
  function getHistory() {
    return readJson(LS.history, []);
  }
  function saveHistory(list) {
    lsSet(LS.history, JSON.stringify(list.slice(0, HELD.HISTORY_MAX)));
    renderContinueBanner();
    renderHistoryTab();
  }
  function formatAgo(t) {
    if (!t) return "刚刚";
    const diff = Math.floor((Date.now() - t) / 1e3);
    if (diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
    if (diff < 2592e3) return Math.floor(diff / 86400) + " 天前";
    const d = new Date(t);
    return d.getMonth() + 1 + "月" + d.getDate() + "日";
  }
  function recordReadingHistory(issueId, pageNum, sectionTitle) {
    if (!issueId || !pageNum) return;
    const meta = allIssues[issueId] || { displayName: issueId };
    const total = meta.totalPages || meta.pages && meta.pages.length || 0;
    if (total <= 0) return;
    const pct = Math.min(100, Math.max(1, Math.round(pageNum / total * 100)));
    const list = getHistory().filter(function(h) {
      return h.issueId !== issueId;
    });
    list.unshift({
      issueId,
      issueName: meta.displayName || issueId,
      page: pageNum,
      totalPages: total,
      progress: pct,
      sectionTitle: toPlainText(sectionTitle) || "Page " + pageNum,
      timestamp: Date.now()
    });
    saveHistory(list);
  }
  function renderContinueBanner() {
    const hero = $("continue-reading-hero");
    if (!hero) return;
    const h = getHistory();
    if (h.length === 0) {
      hero.style.display = "none";
      return;
    }
    const latest = h[0];
    hero.style.display = "flex";
    hero.innerHTML = '<div class="continue-left"><span class="continue-badge">最近在读 · 进度 ' + latest.progress + "%</span><h4>" + escHtml(latest.issueName) + "</h4><p>上次读到：第 " + latest.page + " 页 · " + escHtml(latest.sectionTitle) + " (" + escHtml(formatAgo(latest.timestamp)) + ')</p></div><button class="continue-btn" aria-label="一键直达断点继续阅读"><span>继续阅读</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>';
  }
  function renderHistoryTab() {
    const listEl = $("history-timeline-list");
    const countEl = $("history-count");
    if (!listEl) return;
    const h = getHistory();
    if (countEl) countEl.textContent = h.length + " 条阅读足迹";
    listEl.innerHTML = "";
    if (h.length === 0) {
      listEl.innerHTML = '<div class="bookmark-empty-hint">暂无阅读历史，翻阅期刊时系统将自动实时记录您的阅读足迹</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    h.forEach(function(item) {
      const card = document.createElement("div");
      card.className = "history-item";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.innerHTML = '<div class="history-item-top"><span class="history-page-badge">P' + item.page + " · " + item.progress + '%</span><span class="history-time-tag">' + escHtml(formatAgo(item.timestamp)) + '</span></div><div class="history-title">' + escHtml(item.sectionTitle) + '</div><div class="history-issue-tag">' + escHtml(item.issueName) + '</div><div class="history-progress-track"><div class="history-progress-fill" style="width:' + item.progress + '%"></div></div>';
      card.addEventListener("click", function() {
        jumpFromHistory(item);
      });
      frag.appendChild(card);
    });
    listEl.appendChild(frag);
  }
  function jumpFromHistory(item) {
    enterReaderRoom(item.issueId, item.page);
    if (window.innerWidth <= 960 && els.appSidebar) els.appSidebar.classList.add("collapsed");
  }

  // src/a11y.js
  function initA11y() {
    let sr = document.getElementById("sr-status");
    if (!sr) {
      sr = document.createElement("div");
      sr.id = "sr-status";
      sr.setAttribute("aria-live", "polite");
      sr.setAttribute("role", "status");
      sr.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;";
      document.body.appendChild(sr);
    }
    ["tocList", "bookmarksList", "historyTimelineList", "searchResultsList", "pagesGrid"].forEach(function(k) {
      const el = els[k];
      if (el) el.setAttribute("role", "list");
    });
    document.addEventListener("keydown", function(e) {
      if (e.key !== "Tab") return;
      const openModal = [els.shortcutsModal, els.wordbookModal, els.highlightsModal, els.lightboxModal].filter(function(m) {
        return m && m.classList.contains("active");
      })[0];
      if (!openModal) return;
      const f = openModal.querySelectorAll('a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])');
      const list = Array.prototype.filter.call(f, function(el) {
        return el.offsetParent !== null;
      });
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
  function announce(msg) {
    let sr = document.getElementById("sr-status");
    if (!sr) {
      initA11y();
      sr = document.getElementById("sr-status");
    }
    sr.textContent = "";
    window.setTimeout(function() {
      sr.textContent = msg;
    }, 30);
  }

  // src/manual.js
  var MANUAL_LS = "atlantic_manual_articles";
  var DEFAULT_THEME = "#b3802f";
  function loadManualArticles() {
    const list = readJson(MANUAL_LS, []);
    const map = {};
    list.forEach(function(a) {
      if (a && a.id) map[a.id] = a;
    });
    return map;
  }
  function saveManualArticles(map) {
    try {
      lsSet(MANUAL_LS, JSON.stringify(Object.keys(map).map(function(k) {
        return map[k];
      })));
    } catch (_e) {
      toast("⚠️ 本地存储已满，无法保存", "error");
    }
  }
  function getManualArticle(id) {
    return loadManualArticles()[id] || null;
  }
  function splitParas(text) {
    return String(text || "").split(/\r?\n/).map(function(l) {
      return l.trim();
    }).filter(function(l) {
      return l.length > 0;
    });
  }
  function createManualArticle(fields) {
    const en = splitParas(fields.enText);
    const zh = splitParas(fields.zhText);
    const n = Math.max(en.length, zh.length);
    const segments = [];
    for (let i = 0; i < n; i++) {
      segments.push({ type: "paragraph", en: en[i] || "", zh: zh[i] || "" });
    }
    const title = (fields.title || "").trim() || "未命名文章";
    const id = "manual-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    const article = {
      id,
      name: title,
      displayName: title,
      pubId: "manual",
      source: "manual",
      pubName: "自建文库",
      author: (fields.author || "").trim(),
      sourceUrl: (fields.sourceUrl || "").trim(),
      tags: splitParas(fields.tags).map(function(t) {
        return t.replace(/[,，]/g, "").trim();
      }).filter(Boolean),
      themeColor: (fields.themeColor || DEFAULT_THEME).trim(),
      coverImage: "",
      vol: "MANUAL",
      leadArticle: en[0] || title,
      totalPages: 1,
      imageRoot: "",
      pages: [{ pageNumber: 1, section: title, image: null, segments, rawMd: "" }]
    };
    const map = loadManualArticles();
    map[id] = article;
    saveManualArticles(map);
    return article;
  }
  function deleteManualArticle(id) {
    const map = loadManualArticles();
    if (!map[id]) return false;
    delete map[id];
    saveManualArticles(map);
    return true;
  }
  function exportArticleJson(article) {
    const blob = new Blob([JSON.stringify(article, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (article.displayName || "article") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 1e3);
  }
  function importArticleJson(file) {
    return new Promise(function(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function() {
        try {
          const obj = JSON.parse(String(reader.result));
          if (!obj || !Array.isArray(obj.pages) || obj.pages.length === 0) throw new Error("格式不符：缺少 pages");
          obj.id = obj.id || "manual-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
          obj.pubId = "manual";
          obj.source = "manual";
          obj.displayName = obj.displayName || obj.name || "导入文章";
          obj.themeColor = obj.themeColor || DEFAULT_THEME;
          obj.totalPages = obj.pages.length;
          const map = loadManualArticles();
          map[obj.id] = obj;
          saveManualArticles(map);
          resolve(obj);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = function() {
        reject(new Error("读取文件失败"));
      };
      reader.readAsText(file);
    });
  }
  var EDIT_FIELDS = [
    { key: "title", label: "文章标题", type: "text", placeholder: "例如：The Age of Reading Is Over", required: true },
    { key: "author", label: "作者（可选）", type: "text", placeholder: "Author Name" },
    { key: "sourceUrl", label: "来源链接（可选）", type: "text", placeholder: "https://..." },
    { key: "tags", label: "标签（可选，逗号分隔）", type: "text", placeholder: "essay, tech" },
    { key: "themeColor", label: "主题色", type: "color", value: DEFAULT_THEME }
  ];
  var editorNode = null;
  var editingId = null;
  function buildEditorDom() {
    const wrap = document.createElement("div");
    wrap.className = "manual-editor-modal";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-label", "新建 / 编辑单篇文章");
    let fieldsHtml = "";
    EDIT_FIELDS.forEach(function(f) {
      const val = f.value ? ' value="' + escHtml(f.value) + '"' : "";
      const ph = f.placeholder ? ' placeholder="' + escHtml(f.placeholder) + '"' : "";
      const req = f.required ? " required" : "";
      fieldsHtml += '<label class="manual-field"><span>' + escHtml(f.label) + (f.required ? " *" : "") + '</span><input type="' + f.type + '" data-field="' + f.key + '"' + val + ph + req + "></label>";
    });
    wrap.innerHTML = '<div class="manual-editor-card" role="document"><div class="manual-editor-head"><h3 id="manual-editor-title">✎ 新建单篇文章</h3><button class="manual-editor-close" aria-label="关闭">✕</button></div><div class="manual-editor-body">' + fieldsHtml + '<label class="manual-field manual-field-col"><span>英文正文（每行一段；必填）</span><textarea data-field="enText" rows="8" placeholder="Paste or type the English text here.&#10;One paragraph per line." required></textarea></label><label class="manual-field manual-field-col"><span>中文翻译（可选；每行一段，与英文 1:1 配对）</span><textarea data-field="zhText" rows="6" placeholder="在此粘贴或输入中文翻译。&#10;留空则仅英文单语阅读。"></textarea></label></div><div class="manual-editor-actions"><button class="manual-btn manual-btn-ghost" data-act="import">📥 导入 JSON</button><button class="manual-btn manual-btn-ghost" data-act="export">⤓ 导出 JSON</button><span class="manual-editor-spacer"></span><button class="manual-btn manual-btn-ghost" data-act="cancel">取消</button><button class="manual-btn manual-btn-primary" data-act="save">💾 保存并阅读</button></div></div>';
    return wrap;
  }
  function getFieldVal(node, key) {
    const el = node.querySelector('[data-field="' + key + '"]');
    return el ? el.value : "";
  }
  function openManualEditor(article) {
    closeManualEditor();
    editingId = article ? article.id : null;
    editorNode = buildEditorDom();
    document.body.appendChild(editorNode);
    const titleEl = editorNode.querySelector("#manual-editor-title");
    if (titleEl) titleEl.textContent = article ? "✎ 编辑文章" : "✎ 新建单篇文章";
    if (article) {
      EDIT_FIELDS.forEach(function(f) {
        const el = editorNode.querySelector('[data-field="' + f.key + '"]');
        if (el) el.value = article[f.key] || (f.key === "themeColor" ? DEFAULT_THEME : "");
      });
      const enEl = editorNode.querySelector('[data-field="enText"]');
      if (enEl) enEl.value = (article.pages[0].segments || []).map(function(s) {
        return s.en;
      }).join("\n");
      const zhEl = editorNode.querySelector('[data-field="zhText"]');
      if (zhEl) zhEl.value = (article.pages[0].segments || []).map(function(s) {
        return s.zh;
      }).join("\n");
    }
    editorNode.addEventListener("click", function(e) {
      if (e.target === editorNode) {
        closeManualEditor();
        return;
      }
      const act = e.target.getAttribute && e.target.getAttribute("data-act");
      if (!act) return;
      if (act === "cancel" || e.target.classList.contains("manual-editor-close")) closeManualEditor();
      else if (act === "save") doSave(editorNode);
      else if (act === "import") doImport();
      else if (act === "export") doExportFromEditor(editorNode);
    });
    const closeBtn = editorNode.querySelector(".manual-editor-close");
    if (closeBtn) closeBtn.addEventListener("click", closeManualEditor);
    const firstInput = editorNode.querySelector('[data-field="title"]');
    if (firstInput) firstInput.focus();
  }
  function closeManualEditor() {
    if (editorNode) {
      editorNode.remove();
      editorNode = null;
    }
    editingId = null;
  }
  function buildArticleFromForm(node) {
    const fields = {
      title: getFieldVal(node, "title"),
      author: getFieldVal(node, "author"),
      sourceUrl: getFieldVal(node, "sourceUrl"),
      tags: getFieldVal(node, "tags"),
      themeColor: getFieldVal(node, "themeColor") || DEFAULT_THEME,
      enText: getFieldVal(node, "enText"),
      zhText: getFieldVal(node, "zhText")
    };
    return fields;
  }
  function doSave(node) {
    const fields = buildArticleFromForm(node);
    if (!fields.title.trim()) {
      toast("请填写文章标题", "warn");
      return;
    }
    if (!fields.enText.trim()) {
      toast("请填写英文正文", "warn");
      return;
    }
    if (editingId) {
      const article2 = createManualArticle(fields);
      const map = loadManualArticles();
      delete map[editingId];
      article2.id = editingId;
      map[editingId] = article2;
      saveManualArticles(map);
      closeManualEditor();
      toast("✅ 已更新文章");
      if (els.magazineShelfGrid) renderManualShelfSection();
      enterReaderRoom(editingId, 1);
      return;
    }
    const article = createManualArticle(fields);
    closeManualEditor();
    toast("✅ 已保存文章");
    if (els.magazineShelfGrid) renderManualShelfSection();
    enterReaderRoom(article.id, 1);
  }
  function doImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    input.addEventListener("change", function() {
      if (input.files && input.files[0]) {
        importArticleJson(input.files[0]).then(function(a) {
          closeManualEditor();
          toast("✅ 已导入：" + a.displayName);
          if (els.magazineShelfGrid) renderManualShelfSection();
        }).catch(function(e) {
          toast("⚠️ 导入失败：" + e.message, "error");
        });
      }
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }
  function doExportFromEditor(node) {
    const fields = buildArticleFromForm(node);
    if (!fields.title.trim() || !fields.enText.trim()) {
      toast("请先填写标题与英文正文再导出", "warn");
      return;
    }
    const article = createManualArticle(fields);
    exportArticleJson(article);
    const map = loadManualArticles();
    delete map[article.id];
    saveManualArticles(map);
    toast("⤓ 已导出 JSON");
  }
  function renderManualShelfSection() {
    const grid = els.magazineShelfGrid;
    if (!grid) return;
    const mdMap = typeof window !== "undefined" && window.MANUAL_ISSUES ? window.MANUAL_ISSUES : {};
    const mdIds = Object.keys(mdMap);
    const draftMap = loadManualArticles();
    const draftIds = Object.keys(draftMap);
    let section = grid.querySelector("#manual-shelf-section");
    if (!section) {
      section = document.createElement("div");
      section.id = "manual-shelf-section";
      section.className = "shelf-section";
      grid.parentNode.insertBefore(section, grid.nextSibling);
    }
    section.innerHTML = '<div class="shelf-section-title">📝 自建文库 · Markdown ' + mdIds.length + " 篇 · 草稿 " + draftIds.length + "</div>";
    const frag = document.createDocumentFragment();
    mdIds.forEach(function(id) {
      const a = mdMap[id];
      const card = document.createElement("div");
      card.className = "shelf-issue-card shelf-manual-card shelf-md-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.dataset.issue = id;
      const segs = a.pages && a.pages[0] && a.pages[0].segments || [];
      const color = a.themeColor || DEFAULT_THEME;
      const hasZh = segs.some(function(s) {
        return s.zh && String(s.zh).trim();
      });
      card.innerHTML = '<div class="shelf-cover-wrap shelf-manual-cover" style="background:' + escHtml(color) + ';"><span class="shelf-manual-monogram">M</span></div><div class="shelf-details"><div class="shelf-details-top"><span class="issue-date-tag">Markdown · ' + segs.length + " 段" + (hasZh ? " · 已译" : " · 待译") + "</span><h3>" + escHtml(a.displayName || id) + "</h3><p>" + escHtml(a.author ? "作者：" + a.author : a.website || "自建文章") + '</p><div class="shelf-meta-tags"><span class="meta-tag">📄 单页流式</span>' + (a.source ? '<span class="meta-tag">🔗 来源</span>' : "") + '</div></div><div class="shelf-manual-actions"><button class="shelf-enter-btn" data-issue="' + escHtml(id) + '"><span>开始阅读</span></button><button class="manual-mini-btn" data-act="md-export" data-issue="' + escHtml(id) + '" aria-label="导出 JSON 备份">⤓</button></div></div>';
      frag.appendChild(card);
    });
    draftIds.forEach(function(id) {
      const a = draftMap[id];
      const card = document.createElement("div");
      card.className = "shelf-issue-card shelf-manual-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.dataset.issue = id;
      const segs = a.pages && a.pages[0] && a.pages[0].segments || [];
      const color = a.themeColor || DEFAULT_THEME;
      card.innerHTML = '<div class="shelf-cover-wrap shelf-manual-cover" style="background:' + escHtml(color) + ';"><span class="shelf-manual-monogram">✎</span></div><div class="shelf-details"><div class="shelf-details-top"><span class="issue-date-tag">草稿 · ' + segs.length + " 段</span><h3>" + escHtml(a.displayName || id) + "</h3><p>" + escHtml(a.author ? "作者：" + a.author : "手动录入文章") + '</p><div class="shelf-meta-tags"><span class="meta-tag">🔤 单语/双语</span>' + (a.sourceUrl ? '<span class="meta-tag">🔗 来源</span>' : "") + '</div></div><div class="shelf-manual-actions"><button class="shelf-enter-btn" data-issue="' + escHtml(id) + '"><span>开始阅读</span></button><button class="manual-mini-btn" data-act="edit" data-issue="' + escHtml(id) + '" aria-label="编辑">✎</button><button class="manual-mini-btn" data-act="export" data-issue="' + escHtml(id) + '" aria-label="导出">⤓</button><button class="manual-mini-btn manual-mini-danger" data-act="delete" data-issue="' + escHtml(id) + '" aria-label="删除">🗑</button></div></div>';
      frag.appendChild(card);
    });
    const newCard = document.createElement("div");
    newCard.className = "shelf-issue-card shelf-new-manual-card";
    newCard.setAttribute("role", "button");
    newCard.setAttribute("tabindex", "0");
    newCard.setAttribute("data-act", "new");
    newCard.innerHTML = '<div class="shelf-cover-wrap shelf-new-manual-cover"><span class="shelf-new-manual-plus">＋</span></div><div class="shelf-details"><div class="shelf-details-top"><span class="issue-date-tag">自建 · 快速草稿</span><h3>新建单篇文章</h3><p>粘贴英文（可附中文），或导入 JSON。也可直接往 md 数据源文件夹放 .md 由构建生成。</p><div class="shelf-meta-tags"><span class="meta-tag">✎ 对照 / 整篇录入</span><span class="meta-tag">🔤 纯英文亦可</span></div></div></div>';
    frag.appendChild(newCard);
    section.appendChild(frag);
  }
  function handleManualCardAction(act, id) {
    let a = getManualArticle(id);
    if (!a && typeof window !== "undefined" && window.MANUAL_ISSUES && window.MANUAL_ISSUES[id]) {
      a = window.MANUAL_ISSUES[id];
    }
    if (!a) return;
    if (act === "edit") openManualEditor(a);
    else if (act === "export" || act === "md-export") exportArticleJson(a);
    else if (act === "delete") {
      confirmDialog({ title: "删除这篇文章？", message: "《" + a.displayName + "》将被永久删除，不可撤销。", okText: "删除", danger: true }).then(function(ok) {
        if (ok) {
          deleteManualArticle(id);
          toast("🗑 已删除");
          if (els.magazineShelfGrid) renderManualShelfSection();
        }
      });
    }
  }

  // src/reader.js
  function resolveIssue(id) {
    return allIssues[id] || getMarkdownArticle(id) || getManualArticle(id) || null;
  }
  function enterReaderRoom(issueId, targetPage) {
    const resolved = resolveIssue(issueId);
    if (!resolved) {
      toast("未找到该文章", "error");
      return;
    }
    const isUserAuthored = resolved.source === "manual" || resolved.sourceType === "markdown";
    if (issueId !== state.currentIssueId || isUserAuthored) {
      state.currentIssueId = issueId;
      state.currentIssueObj = resolved;
      state.data = resolved.pages || [];
      lsSet(LS.issue, state.currentIssueId);
      applyIssueAccent();
      initTOC();
      renderBookmarksTab();
    }
    const portal = els.libraryPortal;
    if (portal) portal.classList.add("hidden");
    refreshPill();
    loadPage(targetPage || 1);
  }
  function openLibraryShelf() {
    stopSpeech();
    const portal = els.libraryPortal;
    if (portal) portal.classList.remove("hidden");
  }
  function refreshPill() {
    const pill = els.issueSwitcherPill;
    if (!pill) return;
    const name = state.currentIssueObj.displayName || state.currentIssueObj.id;
    const full = pill.querySelector(".issue-pill-full");
    const compact = pill.querySelector(".issue-pill-compact");
    if (full) full.textContent = "📅 " + name + " • " + state.currentIssueObj.totalPages + "P";
    if (compact) compact.textContent = "📅 " + String(state.currentIssueObj.id || "").replace("-", "/");
  }
  function nextIssueId() {
    const ids = Object.keys(allIssues);
    return ids.length > 1 ? ids[(ids.indexOf(state.currentIssueId) + 1) % ids.length] : state.currentIssueId;
  }
  function switchIssue(newIssueId) {
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
    const last = readInt(lsGet(LS.pagePrefix + state.currentIssueId, "1"), 1);
    loadPage(last);
    toast("切换至：" + resolved.displayName);
  }
  function getBookmarks() {
    return readJson(LS.bookmarks + state.currentIssueId, []);
  }
  function saveBookmarks(list) {
    lsSet(LS.bookmarks + state.currentIssueId, JSON.stringify(list));
    renderBookmarksTab();
  }
  function toggleBookmark(pageNum) {
    const list = getBookmarks();
    const i = list.indexOf(pageNum);
    if (i >= 0) {
      list.splice(i, 1);
      toast("☆ 已取消收藏 第 " + pageNum + " 页");
    } else {
      list.push(pageNum);
      list.sort(function(a, b) {
        return a - b;
      });
      toast("⭐ 已收藏 第 " + pageNum + " 页");
    }
    saveBookmarks(list);
    updateBookmarkButton(pageNum);
  }
  function updateBookmarkButton(pageNum) {
    if (!els.bookmarkPageBtn) return;
    const active = getBookmarks().indexOf(pageNum) >= 0;
    els.bookmarkPageBtn.classList.toggle("active", active);
    els.bookmarkPageBtn.textContent = active ? "⭐ 已收藏" : "☆ 收藏本页";
  }
  function renderBookmarksTab() {
    const listEl = els.bookmarksList;
    if (!listEl) return;
    const list = getBookmarks();
    listEl.innerHTML = "";
    if (list.length === 0) {
      listEl.innerHTML = '<div class="bookmark-empty-hint">暂无书签，点击页面顶部“收藏本页”可快速标记重要章节</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(function(p) {
      const pageObj = state.data[p - 1] || {};
      const item = document.createElement("div");
      item.className = "toc-item";
      if (p) item.dataset.page = p;
      item.setAttribute("role", "button");
      item.innerHTML = '<div class="toc-item-header"><span>PAGE ' + String(p).padStart(3, "0") + '</span><span style="color:var(--accent-gold);">★ 书签</span></div><div class="toc-item-title">' + toDisplayText(pageObj.section) + "</div>";
      frag.appendChild(item);
    });
    listEl.appendChild(frag);
  }
  function isArticlePage(pageObj) {
    const chars = (pageObj.segments || []).reduce(function(a, s) {
      return a + (s.en ? s.en.length : 0);
    }, 0);
    return chars >= 350 || pageObj.segments && pageObj.segments.length >= 3;
  }
  function initTOC() {
    const tocList = els.tocList;
    if (tocList) {
      tocList.innerHTML = "";
      const frag = document.createDocumentFragment();
      state.data.forEach(function(pageObj, idx) {
        const pNum = idx + 1;
        if (!pageObj.section || !String(pageObj.section).trim()) return;
        const isArticle = isArticlePage(pageObj);
        const isCover = pNum <= 4 || String(pageObj.section).indexOf("Cover") >= 0 && String(pageObj.section).indexOf("Story") < 0;
        const badge = isArticle ? "badge-article" : isCover ? "badge-cover" : "badge-visual";
        const label = isArticle ? "📖 深度长文" : isCover ? "🏛️ 封面/刊头" : "🎨 视觉图版";
        const li = document.createElement("li");
        li.className = "toc-item " + (isArticle ? "type-article" : "type-visual");
        li.dataset.page = String(pNum);
        li.dataset.type = isArticle ? "article" : "visual";
        li.setAttribute("role", "button");
        li.tabIndex = 0;
        li.innerHTML = '<div class="toc-item-header"><span>PAGE ' + String(pNum).padStart(3, "0") + '</span><span class="toc-type-badge ' + badge + '">' + label + '</span></div><div class="toc-item-title">' + toDisplayText(pageObj.section) + "</div>";
        frag.appendChild(li);
      });
      tocList.appendChild(frag);
    }
    const pagesGrid = els.pagesGrid;
    if (pagesGrid) {
      pagesGrid.innerHTML = "";
      const frag2 = document.createDocumentFragment();
      for (let p = 1; p <= state.currentIssueObj.totalPages; p++) {
        const tile = document.createElement("div");
        tile.id = "tile-" + p;
        tile.className = "page-tile" + (p === state.currentPage ? " active" : "");
        tile.dataset.page = String(p);
        tile.setAttribute("role", "button");
        tile.innerHTML = "<span>P" + p + "</span>";
        frag2.appendChild(tile);
      }
      pagesGrid.appendChild(frag2);
    }
  }
  function syncSidebarActiveState(pageNum) {
    const smooth = smoothByPref();
    $$(".page-tile").forEach(function(t) {
      t.classList.remove("active");
    });
    const tile = $("tile-" + pageNum);
    if (tile) {
      tile.classList.add("active");
      tile.scrollIntoView({ behavior: smooth, block: "center", inline: "nearest" });
    }
    $$(".toc-item").forEach(function(i) {
      i.classList.remove("active");
      i.removeAttribute("aria-current");
    });
    const items = $$("#toc-list .toc-item");
    let active = null;
    for (let i = 0; i < items.length; i++) {
      if (parseInt(items[i].dataset.page, 10) <= pageNum) active = items[i];
      else break;
    }
    if (!active) active = items[0];
    if (active) {
      active.classList.add("active");
      active.setAttribute("aria-current", "page");
      active.scrollIntoView({ behavior: smooth, block: "center", inline: "nearest" });
    }
  }
  function applyFontScale(px) {
    state.globalFontScale = Math.min(36, Math.max(14, px));
    state.globalFontScale = Math.round(state.globalFontScale * 2) / 2;
    lsSet(LS.fontScale, String(state.globalFontScale));
    document.documentElement.style.setProperty("--reader-font-scale", state.globalFontScale + "px");
  }
  function stubPage(pageNum) {
    return {
      pageNumber: pageNum,
      segments: [],
      section: state.currentIssueObj.displayName + " (Page " + pageNum + ")",
      image: (state.currentIssueObj.imageRoot || "issues/" + state.currentIssueObj.id) + "/images/page_" + String(pageNum).padStart(3, "0") + ".png"
    };
  }
  function renderSegmentNode(seg, idx) {
    const type = seg.type || "paragraph";
    const isCard = type === "paragraph" || type === "ad";
    const div = document.createElement("div");
    div.className = "segment-block segment-" + type + (isCard ? " seg-card" : "");
    div.id = "seg-" + idx;
    const en = toDisplayText(seg.en);
    const zh = toDisplayText(seg.zh);
    const zhHtml = seg.zh && String(seg.zh).trim() ? '<div class="zh-text-card" lang="zh-CN"><div>' + zh + "</div></div>" : "";
    if (type === "embedded") {
      const fig = document.createElement("figure");
      fig.className = "embedded-figure";
      const cap = seg.caption ? toDisplayText(seg.caption) : "";
      const capZh = seg.zh && String(seg.zh).trim() ? toDisplayText(seg.zh) : "";
      fig.innerHTML = '<img src="' + escHtml(seg.src) + '" class="embedded-figure-img" alt="' + escHtml(cap || seg.en || "") + '" loading="lazy" decoding="async">' + (cap ? '<figcaption class="embedded-figure-cap">' + cap + (capZh ? ' <span class="embedded-figure-cap-zh" lang="zh-CN">' + capZh + "</span>" : "") + "</figcaption>" : "");
      imgWithWebFallback(fig.querySelector(".embedded-figure-img"));
      div.appendChild(fig);
      return div;
    }
    let enHtml;
    if (type === "caption") enHtml = '<div class="en-text" lang="en"><em>' + en + "</em></div>";
    else if (type === "ad") enHtml = '<div class="en-text" lang="en"><strong>[Advertisement]</strong> ' + en + "</div>";
    else enHtml = '<div class="en-text" lang="en">' + en + "</div>";
    div.innerHTML = enHtml + zhHtml;
    return div;
  }
  function renderArtCard(pageObj, pageNum, doc) {
    const wrap = document.createElement("div");
    wrap.className = "embedded-art-card";
    wrap.innerHTML = '<div class="embedded-art-img-wrap"><img src="' + escHtml(webpUrl(pageObj.image)) + '" class="embedded-art-img" alt="' + escHtml(pageObj.section) + '" loading="lazy" decoding="async"><span class="embedded-art-zoom-hint">🔍 点击查看 150 DPI 高清全屏原图</span></div><div class="segment-block segment-caption"><div class="en-text" lang="en">The Atlantic — ' + escHtml(state.currentIssueObj.displayName) + " (Page " + pageNum + ')</div><div class="zh-text-card" lang="zh-CN"><div>《大西洋月刊》' + escHtml(state.currentIssueObj.displayName) + "（第 " + pageNum + " 页原版图版）</div></div></div>";
    imgWithWebFallback(wrap.querySelector(".embedded-art-img"));
    doc.appendChild(wrap);
  }
  function renderShortVisualPage(pageObj, doc) {
    const wrap = document.createElement("div");
    wrap.className = "embedded-art-card";
    wrap.innerHTML = '<div class="embedded-art-img-wrap"><img src="' + escHtml(webpUrl(pageObj.image)) + '" class="embedded-art-img" alt="' + escHtml(pageObj.section || "原版扫描页") + '" loading="lazy" decoding="async"><span class="embedded-art-zoom-hint">🔍 点击查看 150 DPI 高清全屏原图</span></div>';
    imgWithWebFallback(wrap.querySelector(".embedded-art-img"));
    doc.appendChild(wrap);
    const segWrap = document.createElement("div");
    segWrap.className = "short-page-segments";
    (pageObj.segments || []).forEach(function(seg, i) {
      segWrap.appendChild(renderSegmentNode(seg, i));
    });
    doc.appendChild(segWrap);
  }
  function loadPage(pageNum) {
    const total = state.currentIssueObj.totalPages || state.data && state.data.length || 0;
    if (total <= 0) {
      toast("⚠️ 刊目数据缺失，无法翻页", "error");
      return;
    }
    if (pageNum < 1) pageNum = 1;
    if (pageNum > total) pageNum = total;
    state.currentPage = pageNum;
    lsSet(LS.pagePrefix + state.currentIssueId, String(pageNum));
    stopSpeech();
    preloadAdjacentPages(pageNum);
    const pageObj = state.data[pageNum - 1] || stubPage(pageNum);
    if (els.currentPageBadge) els.currentPageBadge.textContent = "PAGE " + String(pageNum).padStart(3, "0") + " / " + state.currentIssueObj.totalPages;
    if (els.currentSectionBadge) els.currentSectionBadge.textContent = toDisplayText(pageObj.section) || "The Atlantic (Page " + pageNum + ")";
    if (els.pageSlider) {
      els.pageSlider.max = state.currentIssueObj.totalPages;
      els.pageSlider.value = pageNum;
    }
    if (els.pageCounterText) els.pageCounterText.textContent = "第 " + pageNum + " / " + state.currentIssueObj.totalPages + " 页";
    announce("已翻到第 " + pageNum + " 页，共 " + state.currentIssueObj.totalPages + " 页");
    updateBookmarkButton(pageNum);
    if (els.pageOriginalImg) {
      els.pageOriginalImg.src = webpUrl(pageObj.image);
      const ss = webpSrcset(pageObj.image);
      if (ss) els.pageOriginalImg.srcset = ss;
      els.pageOriginalImg.loading = "lazy";
      els.pageOriginalImg.decoding = "async";
      imgWithWebFallback(els.pageOriginalImg);
      if (els.imageInfoTag) els.imageInfoTag.textContent = "PAGE " + String(pageNum).padStart(3, "0") + " 原版高清扫描图 (150 DPI)";
      resetImageZoom();
    }
    const body = els.articleBody;
    if (body) {
      body.innerHTML = "";
      const segs = pageObj.segments || [];
      const totalEn = segs.reduce(function(a, s) {
        return a + (s.en ? s.en.length : 0);
      }, 0);
      const isShortVisual = segs.length === 0 || segs.length <= 3 && totalEn < 450;
      const doc = document.createDocumentFragment();
      if (segs.length === 0) {
        renderArtCard(pageObj, pageNum, doc);
      } else if (isShortVisual) {
        renderShortVisualPage(pageObj, doc);
      } else {
        segs.forEach(function(seg, i) {
          doc.appendChild(renderSegmentNode(seg, i));
        });
      }
      body.appendChild(doc);
      applyPageHighlights();
    }
    recordReadingHistory(state.currentIssueId, pageNum, pageObj.section);
    syncSidebarActiveState(pageNum);
    if (els.readerViewport) els.readerViewport.scrollTop = 0;
  }
  function openLightboxImage(src) {
    if (!els.lightboxModal || !els.lightboxImg) return;
    els.lightboxImg.src = src;
    els.lightboxModal.classList.add("active");
    const c = els.lightboxModal.querySelector(".close-lightbox");
    if (c) c.focus();
  }
  function resetImageZoom() {
    state.currentZoom = 1;
    if (els.pageOriginalImg) els.pageOriginalImg.style.transform = "scale(1)";
  }
  function zoomBy(delta) {
    state.currentZoom = Math.min(4, Math.max(0.5, state.currentZoom + delta));
    if (els.pageOriginalImg) els.pageOriginalImg.style.transform = "scale(" + state.currentZoom + ")";
  }

  // src/ui.js
  function renderLibraryShelf() {
    const grid = els.magazineShelfGrid;
    if (!grid) return;
    grid.innerHTML = "";
    const ids = Object.keys(allIssues).filter(function(id) {
      const issue = allIssues[id];
      if (state.currentPubFilter === "all") return true;
      if (state.currentPubFilter === "the-atlantic") return issue.pubId === "the-atlantic" || !issue.pubId;
      return issue.pubId === state.currentPubFilter;
    });
    if (ids.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:36px;text-align:center;background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;"><h3 style="font-size:17px;color:var(--text-primary);margin-bottom:8px;">该刊物待入库</h3><p style="font-size:12.5px;color:var(--text-secondary);">可用 <code>python scripts/ingest_magazine.py --pdf raw_pdf/xxx.pdf --pub ' + escHtml(state.currentPubFilter) + ' --issue 2026-09 --name "2026年9月刊"</code> 一键入库</p></div>';
      return;
    }
    const frag = document.createDocumentFragment();
    ids.forEach(function(id) {
      const issue = allIssues[id];
      const card = document.createElement("div");
      card.className = "shelf-issue-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.dataset.issue = id;
      card.innerHTML = '<div class="shelf-cover-wrap"><img src="' + escHtml(webpUrl(issue.coverImage)) + '" class="shelf-cover-img" alt="Cover ' + escHtml(issue.name) + '" loading="lazy" decoding="async"></div><div class="shelf-details"><div class="shelf-details-top"><span class="issue-date-tag">' + escHtml(issue.name) + " &bull; " + escHtml(issue.vol) + "</span><h3>" + escHtml(issue.pubName || "The Atlantic") + "</h3><p>" + escHtml(issue.leadArticle || "Bilingual Digital Archive") + '</p><div class="shelf-meta-tags"><span class="meta-tag">📖 ' + escHtml(issue.totalPages) + ' 页双语转录</span><span class="meta-tag">¶ ' + Math.round(state.globalFontScale) + 'px 大字逐段对照</span><span class="meta-tag">🔊 Web Speech TTS</span></div></div><button class="shelf-enter-btn" data-issue="' + escHtml(id) + '" aria-label="开始沉浸阅读 ' + escHtml(issue.name) + '"><span>开始沉浸阅读</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div>';
      const shelfCoverImg = card.querySelector(".shelf-cover-img");
      imgWithWebFallback(shelfCoverImg);
      frag.appendChild(card);
    });
    grid.appendChild(frag);
    renderManualShelfSection();
  }
  function setViewMode(mode) {
    if (VIEW_MODES.indexOf(mode) < 0) mode = "interlinear";
    VIEW_MODES.forEach(function(m) {
      document.body.classList.remove("view-" + m);
    });
    document.body.classList.add("view-" + mode);
    lsSet(LS.view, mode);
    $$(".view-btn").forEach(function(b) {
      const act = b.dataset.view === mode;
      b.classList.toggle("active", act);
      b.setAttribute("aria-pressed", String(act));
    });
  }
  function applyTheme(name) {
    if (THEMES.indexOf(name) < 0) name = "light";
    THEMES.forEach(function(t) {
      document.body.classList.remove("theme-" + t);
    });
    document.body.classList.add("theme-" + name);
    lsSet(LS.theme, name);
    $$(".popover-theme-card").forEach(function(c) {
      c.classList.toggle("active", c.dataset.theme === name);
    });
  }
  function applyAlignMode(mode) {
    state.currentAlignModeInternal = mode === "justify" ? "justify" : "flush";
    document.body.classList.remove("align-mode-flush", "align-mode-justify");
    document.body.classList.add("align-mode-" + state.currentAlignModeInternal);
    lsSet(LS.align, state.currentAlignModeInternal);
    if (els.alignModeText) {
      els.alignModeText.textContent = state.currentAlignModeInternal === "flush" ? "📖 自然恒定均距 (零拉伸)" : "📐 纸刊两端平齐 (Justified)";
    }
  }
  function toggleSettingsPopover(force) {
    if (!els.settingsPopover) return;
    const active = force !== void 0 ? force : !els.settingsPopover.classList.contains("active");
    els.settingsPopover.classList.toggle("active", active);
    if (els.settingsBackdrop) els.settingsBackdrop.classList.toggle("active", active);
    if (els.moreSettingsBtn) els.moreSettingsBtn.classList.toggle("active", active);
  }
  function toggleShortcutsModal() {
    if (els.shortcutsModal) els.shortcutsModal.classList.toggle("active");
  }
  function toggleSidebar(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const sb = els.appSidebar;
    if (!sb) return;
    const collapsed = sb.classList.toggle("collapsed");
    toast(collapsed ? "📋 目录已收起" : "📖 目录已展开");
  }
  function cycleAudioSpeed() {
    if (state.audioSpeed === 1) state.audioSpeed = 1.25;
    else if (state.audioSpeed === 1.25) state.audioSpeed = 1.5;
    else if (state.audioSpeed === 1.5) state.audioSpeed = 0.75;
    else state.audioSpeed = 1;
    lsSet(LS.speed, String(state.audioSpeed));
    updateSpeedDisplays();
    toast("朗读倍速：" + state.audioSpeed + "x");
  }
  function updateSpeedDisplays() {
    const txt = state.audioSpeed + "x";
    if (els.topAudioSpeedBtn) els.topAudioSpeedBtn.textContent = txt;
    if (els.drawerAudioSpeedBtn) els.drawerAudioSpeedBtn.textContent = state.audioSpeed === 1 ? "1x 标准" : txt;
    if (els.audioSpeedBtn) els.audioSpeedBtn.textContent = txt;
  }
  function toggleFont() {
    state.isSerifMode = !state.isSerifMode;
    document.body.classList.toggle("font-mode-serif", state.isSerifMode);
    if (els.fontToggleBtn) els.fontToggleBtn.textContent = state.isSerifMode ? "🔠 典雅衬线" : "🔤 现代黑体";
    lsSet(LS.font, state.isSerifMode ? "serif" : "sans");
  }
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) document.exitFullscreen();
  }
  function jumpToPage(p) {
    loadPage(p);
    if (window.innerWidth <= 900 && els.appSidebar) els.appSidebar.classList.add("collapsed");
  }
  function jumpFromInput() {
    const input = $("quick-jump-num");
    if (!input) return;
    const v = parseInt(input.value, 10);
    if (v >= 1 && v <= state.currentIssueObj.totalPages) jumpToPage(v);
  }
  function copyPageMarkdown() {
    const pageObj = state.data[state.currentPage - 1];
    if (!pageObj || !pageObj.rawMd) {
      toast("⚠️ 本页无 Markdown 数据", "warn");
      return;
    }
    navigator.clipboard.writeText(pageObj.rawMd).then(function() {
      toast("📋 本页 Markdown 已复制");
    }).catch(function() {
      toast("⚠️ 复制失败，请手动选择文本复制", "warn");
    });
  }
  function renderHighlightsList() {
    const listEl = els.highlightsList;
    const countEl = els.highlightsCount;
    if (!listEl) return;
    const list = loadHighlights();
    if (countEl) countEl.textContent = list.length + " 条";
    listEl.innerHTML = "";
    if (list.length === 0) {
      listEl.innerHTML = '<div class="wordbook-empty-hint">🔖 阅读中选中英文文本 → 点「🔖 高亮」即可收藏；高亮会在这里回顾</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    list.slice().reverse().forEach(function(h) {
      const item = document.createElement("div");
      item.className = "wordbook-item";
      item.dataset.i = String(h.ts);
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      const issueMeta = allIssues[h.issue] || { displayName: h.issue };
      item.innerHTML = '<div class="wordbook-item-top"><span class="wordbook-word">' + escHtml(h.text.slice(0, 60)) + (h.text.length > 60 ? "…" : "") + '</span><span class="wordbook-page-badge">' + escHtml((issueMeta.displayName || "").slice(-6)) + " · P" + h.page + '</span><button class="wordbook-del-btn" data-del-highlight="' + h.ts + '" title="删除此高亮">✕</button></div><div class="wordbook-context">' + escHtml(String(h.text || "").slice(0, 160)) + "</div>";
      item.addEventListener("click", function() {
        const onPortal = !els.libraryPortal || !els.libraryPortal.classList.contains("hidden");
        if (onPortal || h.issue !== state.currentIssueId) enterReaderRoom(h.issue, h.page);
        else jumpToPage(h.page);
        if (els.highlightsModal) els.highlightsModal.classList.remove("active");
      });
      frag.appendChild(item);
    });
    listEl.appendChild(frag);
  }
  function removeHighlightByTs(ts) {
    const n = Number(ts);
    saveHighlights(loadHighlights().filter(function(h) {
      return h.ts !== n;
    }));
    renderAllHighlightsCounts();
    renderHighlightsList();
    toast("🗑️ 已删除该高亮");
  }
  function clearHighlightsAll() {
    confirmDialog({
      title: "清空全部高亮？",
      message: "将删除全部期刊的 " + loadHighlights().length + " 条高亮，此操作不可撤销。",
      okText: "清空",
      danger: true
    }).then(function(ok) {
      if (ok) {
        saveHighlights([]);
        renderHighlightsList();
        toast("🗑️ 高亮已清空");
      }
    });
  }
  function toggleHighlightsModal() {
    if (!els.highlightsModal) return;
    const active = els.highlightsModal.classList.toggle("active");
    if (active) {
      renderHighlightsList();
    }
  }
  function renderAllHighlightsCounts() {
    const hls = loadHighlights().length;
    if (els.portalHighlightsBtn) els.portalHighlightsBtn.innerHTML = '🔖 我的高亮 <span class="portal-count">' + hls + "</span>";
    if (els.portalWordbookBtn) els.portalWordbookBtn.innerHTML = '📖 生词本 <span class="portal-count">' + loadWordbook().length + "</span>";
    if (els.portalBookmarksBtn) {
      let total = 0;
      Object.keys(allIssues).forEach(function(id) {
        total += readJson(LS.bookmarks + id, []).length;
      });
      els.portalBookmarksBtn.innerHTML = '🔖 我的书签 <span class="portal-count">' + total + "</span>";
    }
  }

  // src/wordbook.js
  function loadWordbook() {
    try {
      return JSON.parse(localStorage.getItem(LS.wordbook) || "[]");
    } catch (_e) {
      return [];
    }
  }
  function saveWordbook(list) {
    try {
      localStorage.setItem(LS.wordbook, JSON.stringify(list.slice(0, HELD.WORDBOOK_MAX)));
    } catch (_e) {
    }
  }
  function wordContext(word) {
    const pageObj = state.data[state.currentPage - 1];
    if (!pageObj || !pageObj.segments) return "";
    const lower = word.toLowerCase();
    for (let i = 0; i < pageObj.segments.length; i++) {
      const en = pageObj.segments[i].en;
      if (en && en.toLowerCase().indexOf(lower) >= 0) {
        const idx = en.toLowerCase().indexOf(lower);
        const start = Math.max(0, idx - 40);
        return (start > 0 ? "…" : "") + en.slice(start, idx + word.length + 60) + "…";
      }
    }
    return "";
  }
  function addWord(word) {
    const w = String(word || "").trim().replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");
    if (!w || w.length < 2) return;
    const lower = w.toLowerCase();
    let list = loadWordbook().filter(function(x) {
      return x.word !== lower;
    });
    const pageObj = state.data[state.currentPage - 1];
    list.unshift({
      word: lower,
      display: w,
      issue: state.currentIssueId,
      page: state.currentPage,
      section: pageObj && pageObj.section || "Page " + state.currentPage,
      context: wordContext(w),
      ts: Date.now()
    });
    saveWordbook(list);
    renderWordbook();
    toast("📖 已收藏生词：" + w);
  }
  function removeWord(word) {
    saveWordbook(loadWordbook().filter(function(x) {
      return x.word !== word;
    }));
    renderWordbook();
    toast("🗑️ 已移出生词本");
  }
  function clearWordbook() {
    confirmDialog({
      title: "清空生词本？",
      message: "将删除全部 " + loadWordbook().length + " 个收藏生词，此操作不可撤销。",
      okText: "清空",
      danger: true
    }).then(function(ok) {
      if (ok) {
        saveWordbook([]);
        renderWordbook();
        toast("🗑️ 生词本已清空");
      }
    });
  }
  function speakWord(word) {
    if (!window.speechSynthesis) {
      toast("⚠️ 当前浏览器不支持朗读");
      return;
    }
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    const rate = readFloat(LS.speed, 1);
    u.rate = rate > 0 ? rate : 1;
    const v = pickVoice();
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
  function exportWordbookMd() {
    const list = loadWordbook();
    const md = "# 我的生词本（" + list.length + " 词）\n\n" + (list.length === 0 ? "（暂无生词）" : list.map(function(x) {
      return "- **" + x.display + "** — P" + x.page + " (" + escHtml(x.section) + ")" + (x.context ? "\n  > " + escHtml(x.context) : "");
    }).join("\n"));
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-wordbook.md";
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1e3);
    toast("📤 已导出生词本（" + list.length + " 词）");
  }
  function renderWordbook() {
    const listEl = els.wordbookList;
    const countEl = els.wordbookCount;
    if (!listEl) return;
    const list = loadWordbook();
    if (countEl) countEl.textContent = list.length + " 词";
    listEl.innerHTML = "";
    if (list.length === 0) {
      listEl.innerHTML = '<div class="wordbook-empty-hint">📖 阅读中双击选中的英文单词 → 点「📖 生词」即可收藏</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(function(x) {
      const item = document.createElement("div");
      item.className = "wordbook-item";
      item.dataset.word = x.word;
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      item.innerHTML = '<div class="wordbook-item-top"><span class="wordbook-word">' + escHtml(x.display) + '</span><span class="wordbook-page-badge">P' + x.page + '</span><button class="wordbook-speak-btn" data-speak="' + escHtml(x.word) + '" title="朗读发音">🔊</button><button class="wordbook-del-btn" data-del="' + escHtml(x.word) + '" title="移出生词本">✕</button></div>' + (x.context ? '<div class="wordbook-context">' + escHtml(x.context) + "</div>" : "");
      item.addEventListener("click", function() {
        if (x.issue !== state.currentIssueId) {
          switchIssue(x.issue);
        }
        jumpToPage(x.page);
        if (els.wordbookModal) els.wordbookModal.classList.remove("active");
      });
      frag.appendChild(item);
    });
    listEl.appendChild(frag);
  }
  function renderWordbookByDelegate(e) {
    const del = e.target.closest(".wordbook-del-btn");
    if (del) {
      e.stopPropagation();
      removeWord(del.dataset.del);
      return;
    }
    const spk = e.target.closest(".wordbook-speak-btn");
    if (spk) {
      e.stopPropagation();
      speakWord(spk.dataset.speak);
    }
  }
  function toggleWordbookModal() {
    if (!els.wordbookModal) return;
    const active = els.wordbookModal.classList.toggle("active");
    if (active) {
      renderWordbook();
    }
  }

  // src/search.js
  function buildSearchIndex() {
    if (state.searchIndexCache) return state.searchIndexCache;
    const idx = [];
    Object.keys(allIssues).forEach(function(issueId) {
      const issue = allIssues[issueId] || { pages: [] };
      (issue.pages || []).forEach(function(p, i) {
        const buf = [];
        (p.segments || []).forEach(function(seg) {
          if (seg.en) buf.push(String(seg.en).toLowerCase());
          if (seg.zh) buf.push(String(seg.zh).toLowerCase());
        });
        idx.push({ issueId, pageNum: i + 1, section: p.section || "", text: buf.join(" ") });
      });
    });
    state.searchIndexCache = idx;
    return idx;
  }
  function runSearch(query, scopeIssueId) {
    const q = String(query || "").trim().toLowerCase();
    if (q.length < 2) return [];
    const isMatch = new RegExp(escRegex(q));
    const re = new RegExp("(" + escRegex(q) + ")", "gi");
    const out = [];
    buildSearchIndex().forEach(function(row) {
      if (scopeIssueId && row.issueId !== scopeIssueId) return;
      if (!isMatch.test(row.text)) return;
      const raw = toPlainText(row.section);
      const section = raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
      const snippet = toDisplayText(row.text).slice(0, 120).replace(re, "<mark>$1</mark>");
      out.push({ issueId: row.issueId, pageNum: row.pageNum, section, snippet });
    });
    return out;
  }
  function bindSearchResultKeys(inputEl, itemSel, onPick) {
    if (!inputEl) return;
    let idx = -1;
    inputEl.addEventListener("keydown", function(e) {
      const list = $$(itemSel);
      if (list.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        idx = Math.min(list.length - 1, idx + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        idx = Math.max(0, idx - 1);
      } else if (e.key === "Enter" && idx >= 0 && list[idx]) {
        e.preventDefault();
        onPick(list[idx]);
        return;
      } else return;
      list.forEach(function(it, k) {
        it.classList.toggle("kv-active", k === idx);
      });
      if (list[idx]) list[idx].scrollIntoView({ block: "nearest" });
    });
  }
  function bindPortalSearch() {
    const input = els.portalSearch;
    const dropdown = els.portalDropdown;
    if (!input || !dropdown) return;
    bindSearchResultKeys(input, ".portal-search-item", function(el) {
      dropdown.classList.remove("active");
      enterReaderRoom(el.dataset.issue, parseInt(el.dataset.page, 10));
    });
    const handler = debounce(function() {
      const q = input.value.trim();
      dropdown.innerHTML = "";
      if (q.length < 2) {
        dropdown.classList.remove("active");
        return;
      }
      const results = runSearch(q, null).slice(0, 12);
      if (results.length === 0) {
        const e = document.createElement("div");
        e.className = "portal-search-empty";
        e.textContent = "全刊库未检索到匹配篇章";
        dropdown.appendChild(e);
        announce("未检索到匹配内容");
      } else {
        results.forEach(function(r) {
          const issue = allIssues[r.issueId] || {};
          const item = document.createElement("div");
          item.className = "portal-search-item";
          item.dataset.issue = r.issueId;
          item.dataset.page = String(r.pageNum);
          item.innerHTML = '<div class="portal-search-item-header"><span>' + escHtml(issue.name || r.issueId) + " &bull; PAGE " + String(r.pageNum).padStart(3, "0") + '</span></div><div class="portal-search-item-title">' + escHtml(r.section) + '</div><div class="portal-search-item-snippet">' + r.snippet.slice(0, 200) + "...</div>";
          item.addEventListener("click", function() {
            dropdown.classList.remove("active");
            enterReaderRoom(r.issueId, r.pageNum);
          });
          dropdown.appendChild(item);
        });
        announce(results.length + " 条搜索结果");
      }
      dropdown.classList.add("active");
    }, HELD.SEARCH_DEBOUNCE);
    input.addEventListener("input", handler);
    document.addEventListener("click", function(e) {
      if (dropdown.classList.contains("active") && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.classList.remove("active");
      }
    });
  }

  // src/data.js
  function collectLocalData() {
    const bag = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf("atlantic_reader_") === 0) bag[k] = localStorage.getItem(k);
    }
    return bag;
  }
  function exportLocalDataJson() {
    const bag = collectLocalData();
    const blob = new Blob([JSON.stringify({ app: "the-atlantic-reader", version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), data: bag }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "atlantic-reader-backup-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1e3);
    toast("📦 已导出本地数据备份（" + Object.keys(bag).length + " 项）");
  }
  function importLocalData(file) {
    const reader = new FileReader();
    reader.onerror = function() {
      toast("⚠️ 备份文件读取失败", "error");
    };
    reader.onload = function() {
      try {
        const payload = JSON.parse(String(reader.result));
        if (payload && typeof payload === "object" && typeof payload.version !== "undefined" && payload.version !== 1) {
          toast("⚠️ 备份版本 v" + payload.version + " 与当前不兼容，已拒绝", "error");
          return;
        }
        const raw = payload && typeof payload === "object" && payload.data && typeof payload.data === "object" ? payload.data : payload && typeof payload === "object" ? payload : null;
        if (!raw || typeof raw !== "object") {
          toast("⚠️ 备份格式无法识别", "error");
          return;
        }
        const bag = {};
        let skipped = 0;
        Object.keys(raw).forEach(function(k) {
          if (k.indexOf("atlantic_reader_") !== 0) return;
          if (typeof raw[k] !== "string") {
            skipped++;
            return;
          }
          bag[k] = raw[k];
        });
        const keys = Object.keys(bag);
        if (keys.length === 0) {
          toast(skipped ? "⚠️ 备份数据格式非法，已拒绝导入" : "⚠️ 备份中无本应用数据", skipped ? "error" : "warn");
          return;
        }
        confirmDialog({
          title: "导入备份（覆盖本地数据）？",
          message: "将导入 " + keys.length + " 项数据（书签/高亮/生词/足迹/设置），覆盖当前设备同名数据。",
          okText: "导入",
          danger: true
        }).then(function(ok) {
          if (!ok) return;
          keys.forEach(function(k) {
            try {
              localStorage.setItem(k, bag[k]);
            } catch (_e) {
            }
          });
          state.currentIssueId = lsGet(LS.issue, "");
          if (!allIssues[state.currentIssueId]) state.currentIssueId = Object.keys(allIssues)[0] || "";
          state.currentIssueObj = allIssues[state.currentIssueId] || { id: "", pages: [], totalPages: 0, displayName: "未加载" };
          state.data = state.currentIssueObj.pages || [];
          renderBookmarksTab();
          renderHistoryTab();
          renderContinueBanner();
          if (els.wordbookList) renderWordbook();
          applyFontScale(readFloat(LS.fontScale, 0) || state.globalFontScale);
          const restoredTheme = lsGet(LS.theme, "");
          if (THEMES.indexOf(restoredTheme) >= 0) applyTheme(restoredTheme);
          setViewMode(lsGet(LS.view, "interlinear"));
          applyAlignMode(lsGet(LS.align, "flush"));
          toast("✅ 备份导入成功（" + keys.length + " 项）");
        });
      } catch (_e) {
        toast("⚠️ 备份文件解析失败", "error");
      }
    };
    reader.readAsText(file);
  }

  // src/main.js
  var ELS_BY_ID = {
    libraryPortal: "library-portal-view",
    openPortalBtn: "open-portal-btn",
    appSidebar: "app-sidebar",
    articleBody: "article-body",
    pageOriginalImg: "page-original-image",
    currentPageBadge: "current-page-badge",
    currentSectionBadge: "current-section-badge",
    pageSlider: "page-slider",
    pageCounterText: "page-counter-text",
    prevPageBtn: "prev-page-btn",
    nextPageBtn: "next-page-btn",
    tocList: "toc-list",
    tocFilterBar: "toc-filter-bar",
    pagesGrid: "pages-grid",
    searchInput: "global-search",
    searchTab: "search-tab",
    searchResultsList: "search-results-list",
    lightboxModal: "lightbox-modal",
    lightboxImg: "lightbox-img",
    copyPageBtn: "copy-page-btn",
    bookmarkPageBtn: "bookmark-page-btn",
    bookmarksList: "bookmarks-list",
    playPageAudioBtn: "play-page-audio-btn",
    audioSpeedBtn: "audio-speed-btn",
    topAudioSpeedBtn: "audio-speed-btn-top",
    fontToggleBtn: "font-family-toggle",
    fontIncBtn: "font-inc-btn",
    fontDecBtn: "font-dec-btn",
    issueSwitcherPill: "issue-switcher-pill",
    magazineShelfGrid: "magazine-shelf-grid",
    shortcutsModal: "shortcuts-help-modal",
    settingsBackdrop: "settings-backdrop",
    settingsPopover: "settings-popover-menu",
    moreSettingsBtn: "more-settings-btn",
    alignModeToggle: "align-mode-toggle",
    alignModeText: "align-mode-text",
    fullscreenBtn: "fullscreen-btn",
    zoomInBtn: "zoom-in",
    zoomOutBtn: "zoom-out",
    zoomResetBtn: "zoom-reset",
    quickJumpBtn: "quick-jump-go",
    clearHistoryBtn: "clear-history-btn",
    portalSearch: "portal-global-search",
    portalDropdown: "portal-search-dropdown",
    toggleSidebarBtn: "toggle-sidebar-btn",
    closeSidebarBtn: "close-sidebar-btn",
    shortcutsOpenBtn: "shortcuts-open-btn",
    exportAllBtn: "export-all-btn",
    dataSyncExportBtn: "data-sync-export-btn",
    dataSyncImportBtn: "data-sync-import-btn",
    hlFloatBtn: null,
    wbFloatBtn: null,
    wordbookModal: "wordbook-modal",
    wordbookList: "wordbook-list",
    wordbookCount: "wordbook-count",
    wordbookOpenBtn: "wordbook-open-btn",
    wordbookExportBtn: "wordbook-export-btn",
    wordbookClearBtn: "wordbook-clear-btn",
    highlightsModal: "highlights-modal",
    highlightsList: "highlights-list",
    highlightsCount: "highlights-count",
    highlightsClearBtn: "highlights-clear-btn",
    highlightsExportBtn: "highlights-export-btn",
    portalWordbookBtn: "portal-wordbook-btn",
    portalHighlightsBtn: "portal-highlights-btn",
    portalBookmarksBtn: "portal-bookmarks-btn",
    imageInfoTag: "image-info-tag",
    quickJumpInput: "quick-jump-num",
    shortcutsVersion: "shortcuts-version"
  };
  Object.keys(ELS_BY_ID).forEach(function(k) {
    els[k] = $(ELS_BY_ID[k]);
  });
  els.readerViewport = document.querySelector(".reader-viewport");
  els.closeShortcutsBtn = document.querySelector(".close-shortcuts-btn");
  els.wordbookCloseBtn = document.querySelector(".close-wordbook-btn");
  els.highlightsCloseBtn = document.querySelector(".close-highlights-btn");
  function bindOne(id, fn) {
    const node = els[id];
    if (node) node.addEventListener("click", fn);
  }
  function bindStaticEvents() {
    const portal = els.libraryPortal;
    if (portal && !portal.dataset.bound) {
      portal.dataset.bound = "1";
      portal.addEventListener("click", function(e) {
        const filterBtn = e.target.closest(".pub-filter-btn");
        if (filterBtn) {
          $$(".pub-filter-btn").forEach(function(b) {
            b.classList.remove("active");
          });
          filterBtn.classList.add("active");
          state.currentPubFilter = filterBtn.dataset.pub;
          renderLibraryShelf();
          return;
        }
        const actBtn = e.target.closest("[data-act]");
        if (actBtn) {
          const act = actBtn.dataset.act;
          if (act === "new") {
            openManualEditor(null);
            return;
          }
          if (actBtn.dataset.issue) {
            handleManualCardAction(act, actBtn.dataset.issue);
            return;
          }
        }
        const enterBtn = e.target.closest(".shelf-enter-btn");
        const card = e.target.closest(".shelf-issue-card");
        const target = enterBtn || card;
        if (target && target.dataset && target.dataset.issue) {
          const jump = parseInt(target.dataset.page, 10);
          enterReaderRoom(target.dataset.issue, jump > 0 ? jump : 1);
        }
      });
      portal.addEventListener("keydown", function(e) {
        const card = e.target.closest(".shelf-issue-card");
        if (!card || !(e.key === "Enter" || e.key === " ")) return;
        e.preventDefault();
        if (card.dataset.act === "new") {
          openManualEditor(null);
          return;
        }
        enterReaderRoom(card.dataset.issue, 1);
      });
    }
    const filterBar = els.tocFilterBar;
    if (filterBar && !filterBar.dataset.bound) {
      filterBar.dataset.bound = "1";
      filterBar.addEventListener("click", function(e) {
        const btn = e.target.closest(".toc-filter-btn");
        if (!btn) return;
        $$(".toc-filter-btn").forEach(function(b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        const filter = btn.dataset.filter || "all";
        $$("#toc-list .toc-item").forEach(function(item) {
          item.style.display = filter === "all" || item.dataset.type === filter ? "" : "none";
        });
      });
    }
    const tocList = els.tocList;
    if (tocList && !tocList.dataset.bound) {
      tocList.dataset.bound = "1";
      tocList.addEventListener("click", function(e) {
        const item = e.target.closest(".toc-item");
        if (item && item.dataset.page) jumpToPage(parseInt(item.dataset.page, 10));
      });
      tocList.addEventListener("keydown", function(e) {
        const item = e.target.closest(".toc-item");
        if (item && item.dataset.page && e.key === "Enter") {
          e.preventDefault();
          jumpToPage(parseInt(item.dataset.page, 10));
        }
      });
    }
    const pagesGrid = els.pagesGrid;
    if (pagesGrid && !pagesGrid.dataset.bound) {
      pagesGrid.dataset.bound = "1";
      pagesGrid.addEventListener("click", function(e) {
        const tile = e.target.closest(".page-tile");
        if (tile && tile.dataset.page) jumpToPage(parseInt(tile.dataset.page, 10));
      });
    }
    const bm = els.bookmarksList;
    if (bm && !bm.dataset.bound) {
      bm.dataset.bound = "1";
      bm.addEventListener("click", function(e) {
        const item = e.target.closest(".toc-item");
        if (item && item.dataset.page) jumpToPage(parseInt(item.dataset.page, 10));
      });
    }
    bindOne("openPortalBtn", openLibraryShelf);
    bindOne("toggleSidebarBtn", toggleSidebar);
    bindOne("closeSidebarBtn", toggleSidebar);
    bindOne("prevPageBtn", function() {
      loadPage(state.currentPage - 1);
    });
    bindOne("nextPageBtn", function() {
      loadPage(state.currentPage + 1);
    });
    bindOne("bookmarkPageBtn", function() {
      toggleBookmark(state.currentPage);
    });
    bindOne("playPageAudioBtn", playPageSpeech);
    bindOne("moreSettingsBtn", function(e) {
      e.stopPropagation();
      toggleSettingsPopover();
    });
    bindOne("alignModeToggle", function() {
      applyAlignMode(state.currentAlignModeInternal === "flush" ? "justify" : "flush");
    });
    bindOne("fontToggleBtn", toggleFont);
    bindOne("fontIncBtn", function() {
      applyFontScale(state.globalFontScale + 1.5);
    });
    bindOne("fontDecBtn", function() {
      applyFontScale(state.globalFontScale - 1.5);
    });
    bindOne("fullscreenBtn", toggleFullscreen);
    bindOne("copyPageBtn", copyPageMarkdown);
    bindOne("quickJumpBtn", jumpFromInput);
    bindOne("issueSwitcherPill", function() {
      switchIssue(nextIssueId());
    });
    bindOne("topAudioSpeedBtn", cycleAudioSpeed);
    bindOne("audioSpeedBtn", cycleAudioSpeed);
    bindOne("zoomInBtn", function() {
      zoomBy(0.25);
    });
    bindOne("zoomOutBtn", function() {
      zoomBy(-0.25);
    });
    bindOne("zoomResetBtn", resetImageZoom);
    bindOne("closeShortcutsBtn", toggleShortcutsModal);
    bindOne("shortcutsOpenBtn", toggleShortcutsModal);
    if (els.settingsBackdrop) els.settingsBackdrop.addEventListener("click", function() {
      toggleSettingsPopover(false);
    });
    const openLightboxNode = $("open-lightbox");
    if (openLightboxNode) openLightboxNode.addEventListener("click", function() {
      if (els.pageOriginalImg) openLightboxImage(els.pageOriginalImg.src);
    });
    $$(".view-btn").forEach(function(b) {
      b.addEventListener("click", function() {
        setViewMode(b.dataset.view);
      });
    });
    $$(".popover-theme-card").forEach(function(c) {
      c.addEventListener("click", function() {
        applyTheme(c.dataset.theme);
      });
    });
    $$(".tab-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        $$(".tab-btn").forEach(function(b) {
          b.classList.remove("active");
        });
        $$(".tab-pane").forEach(function(p) {
          p.classList.remove("active");
        });
        btn.classList.add("active");
        const pane = $("tab-" + btn.dataset.tab);
        if (pane) {
          pane.classList.add("active");
          if (btn.dataset.tab === "history") renderHistoryTab();
          else if (btn.dataset.tab === "bookmarks") renderBookmarksTab();
          syncSidebarActiveState(state.currentPage);
        }
      });
    });
    if (els.lightboxModal) els.lightboxModal.addEventListener("click", function(e) {
      if (e.target === els.lightboxModal) els.lightboxModal.classList.remove("active");
    });
    if (els.shortcutsModal) els.shortcutsModal.addEventListener("click", function(e) {
      if (e.target === els.shortcutsModal) els.shortcutsModal.classList.remove("active");
    });
    const brand = document.querySelector(".magazine-brand");
    if (brand) brand.addEventListener("click", openLibraryShelf);
    const hero = $("continue-reading-hero");
    if (hero && !hero.dataset.bound) {
      hero.dataset.bound = "1";
      hero.addEventListener("click", function() {
        const h = getHistory();
        if (h.length > 0) enterReaderRoom(h[0].issueId, h[0].page);
      });
    }
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    document.addEventListener("copy", function(e) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const clean = stripInvisibles(sel.toString());
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", clean);
        e.preventDefault();
      }
    });
    if (els.readerViewport) els.readerViewport.addEventListener("click", function() {
      if (window.innerWidth <= 900 && els.appSidebar && !els.appSidebar.classList.contains("collapsed")) {
        els.appSidebar.classList.add("collapsed");
      }
    });
    const ab = els.articleBody;
    if (ab && !ab.dataset.boundTap) {
      ab.dataset.boundTap = "1";
      ab.addEventListener("click", function(e) {
        const hlMark = e.target.closest("mark.page-highlight");
        if (hlMark) {
          const block = hlMark.closest(".segment-block");
          if (block) {
            const segIdx = parseInt(block.id.replace("seg-", ""), 10);
            if (!isNaN(segIdx)) {
              const enEl = block.querySelector(".en-text");
              if (enEl) {
                const inZh = hlMark.closest(".zh-text-card") !== null;
                const targetEl = inZh ? block.querySelector(".zh-text-card > div:first-child") || enEl : enEl;
                let before = 0, total = 0;
                (function scan(el) {
                  el.childNodes.forEach(function(c) {
                    if (c === hlMark) {
                      before = total;
                    }
                    if (c.nodeType === Node.TEXT_NODE) total += (c.nodeValue || "").length;
                    else if (c.nodeType === Node.ELEMENT_NODE && !c.classList.contains("page-highlight")) scan(c);
                  });
                })(targetEl);
                const markLen = (hlMark.textContent || "").length;
                const hls0 = loadHighlights();
                saveHighlights(hls0.filter(function(h) {
                  return !(h.issue === state.currentIssueId && h.page === state.currentPage && h.seg === segIdx && h.lang === (inZh ? "zh" : "en") && h.start === before && h.end === before + markLen);
                }));
                const frag = document.createDocumentFragment();
                while (hlMark.firstChild) frag.appendChild(hlMark.firstChild);
                hlMark.parentNode.replaceChild(frag, hlMark);
                applyPageHighlights();
              }
            }
          }
          return;
        }
        const enCard = e.target.closest(".en-text");
        if (enCard) {
          const block = enCard.closest(".segment-block");
          if (block) {
            const segs = (state.data[state.currentPage - 1] || {}).segments || [];
            const target = segs[parseInt(block.id.replace("seg-", ""), 10)];
            if (target) {
              if (block.classList.contains("playing-active")) {
                stopSpeech();
                toast("⏸ 朗读已暂停");
              } else playParagraphSpeech(target.en, block);
            }
          }
          return;
        }
        const artWrap = e.target.closest(".embedded-art-img-wrap");
        if (artWrap) {
          const img = artWrap.querySelector("img");
          if (img) openLightboxImage(img.src);
        }
      });
    }
    if (els.readerViewport) {
      const vp = els.readerViewport;
      const FLIP_MS = 280;
      const VELOCITY_FLIP = 0.3;
      let sx = 0, sy = 0, st = 0, active = false, locked = false, horiz = false;
      vp.addEventListener("touchstart", function(e) {
        if (e.touches.length !== 1) {
          active = false;
          return;
        }
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
        st = e.timeStamp;
        active = true;
        locked = false;
        horiz = false;
        vp.style.transition = "none";
      }, { passive: true });
      vp.addEventListener("touchmove", function(e) {
        if (!active) return;
        const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
        if (!locked) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          horiz = Math.abs(dx) > Math.abs(dy);
          locked = true;
        }
        if (!horiz) return;
        e.preventDefault();
        let move = dx;
        const total = state.currentIssueObj.totalPages || 0;
        if (state.currentPage <= 1 && dx > 0 || state.currentPage >= total && dx < 0) move = dx * 0.35;
        vp.style.transform = "translateX(" + move + "px)";
      }, { passive: false });
      vp.addEventListener("touchend", function(e) {
        if (!active) return;
        active = false;
        const dx = e.changedTouches[0].clientX - sx;
        const dt = Math.max(1, e.timeStamp - st), v = dx / dt;
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          vp.style.transition = "transform " + FLIP_MS + "ms ease";
          vp.style.transform = "translateX(0)";
          horiz = false;
          return;
        }
        const commit = horiz && (Math.abs(dx) > window.innerWidth * 0.33 || Math.abs(v) > VELOCITY_FLIP);
        vp.style.transition = "transform " + FLIP_MS + "ms cubic-bezier(.22,.61,.36,1)";
        if (commit) {
          const dir = dx < 0 ? 1 : -1;
          vp.style.transform = "translateX(" + dir * window.innerWidth + "px)";
          setTimeout(function() {
            loadPage(state.currentPage + dir);
            vp.style.transition = "none";
            vp.style.transform = "";
          }, FLIP_MS);
        } else {
          vp.style.transform = "translateX(0)";
        }
        horiz = false;
      }, { passive: true });
    }
    const saved = readFloat(LS.fontScale, 0);
    if (saved > 0) applyFontScale(saved);
    else applyFontScale(state.globalFontScale);
    function removeSelectionToolbar() {
      if (els.hlFloatBtn) {
        els.hlFloatBtn.remove();
        els.hlFloatBtn = null;
      }
      if (els.wbFloatBtn) {
        els.wbFloatBtn.remove();
        els.wbFloatBtn = null;
      }
    }
    function selectionInsideBody() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
      const rg = sel.getRangeAt(0);
      let el = rg.startContainer;
      if (el.nodeType === Node.TEXT_NODE) el = el.parentElement;
      if (!el || !els.articleBody || !els.articleBody.contains(el)) return null;
      return { rg, sel };
    }
    function showSelectionToolbar() {
      const ctx = selectionInsideBody();
      if (!ctx) {
        removeSelectionToolbar();
        return;
      }
      const rect = ctx.rg.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      if (els.hlFloatBtn) {
        els.hlFloatBtn.style.top = Math.max(8, rect.top - 38) + "px";
        els.hlFloatBtn.style.left = Math.max(8, rect.left + rect.width / 2 - 34) + "px";
        if (els.wbFloatBtn) {
          els.wbFloatBtn.style.top = els.hlFloatBtn.style.top;
          els.wbFloatBtn.style.left = Math.min(window.innerWidth - 62, parseFloat(els.hlFloatBtn.style.left) + 74) + "px";
        }
        return;
      }
      const floatBtn = document.createElement("button");
      floatBtn.type = "button";
      floatBtn.className = "hl-float-btn";
      floatBtn.textContent = "🔖 高亮";
      floatBtn.setAttribute("aria-label", "高亮选中文本");
      floatBtn.style.top = Math.max(8, rect.top - 38) + "px";
      floatBtn.style.left = Math.max(8, rect.left + rect.width / 2 - 34) + "px";
      floatBtn.addEventListener("click", function() {
        captureSelectionHighlight();
        removeSelectionToolbar();
      });
      document.body.appendChild(floatBtn);
      els.hlFloatBtn = floatBtn;
      const selText = ctx.sel.toString().trim();
      const wordMatch = /^[A-Za-z][A-Za-z'-]*$/.test(selText);
      if (wordMatch) {
        const wordBtn = document.createElement("button");
        wordBtn.type = "button";
        wordBtn.className = "wb-float-btn";
        wordBtn.textContent = "📖 生词";
        wordBtn.setAttribute("aria-label", "收藏生词");
        wordBtn.style.top = floatBtn.style.top;
        wordBtn.style.left = Math.min(window.innerWidth - 62, parseFloat(floatBtn.style.left) + 74) + "px";
        wordBtn.addEventListener("click", function() {
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
    document.addEventListener("mouseup", showSelectionToolbar);
    document.addEventListener("selectionchange", scheduleSelectionToolbar);
    let touchToolbarTimer = null;
    document.addEventListener("touchend", function() {
      if (touchToolbarTimer) clearTimeout(touchToolbarTimer);
      touchToolbarTimer = setTimeout(showSelectionToolbar, 80);
    }, { passive: true });
    bindOne("exportAllBtn", exportAllMarkdown);
    bindOne("wordbookOpenBtn", toggleWordbookModal);
    if (els.wordbookExportBtn) els.wordbookExportBtn.addEventListener("click", exportWordbookMd);
    if (els.wordbookClearBtn) els.wordbookClearBtn.addEventListener("click", clearWordbook);
    if (els.wordbookCloseBtn) els.wordbookCloseBtn.addEventListener("click", toggleWordbookModal);
    if (els.wordbookList) els.wordbookList.addEventListener("click", renderWordbookByDelegate);
    if (els.wordbookModal) els.wordbookModal.addEventListener("click", function(e) {
      if (e.target === els.wordbookModal) els.wordbookModal.classList.remove("active");
    });
    bindOne("dataSyncExportBtn", exportLocalDataJson);
    bindOne("dataSyncImportBtn", function() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.style.display = "none";
      input.addEventListener("change", function() {
        if (input.files && input.files[0]) importLocalData(input.files[0]);
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    });
    bindOne("portalHighlightsBtn", toggleHighlightsModal);
    bindOne("highlightsExportBtn", exportHighlightsMd);
    bindOne("highlightsClearBtn", clearHighlightsAll);
    if (els.highlightsCloseBtn) els.highlightsCloseBtn.addEventListener("click", toggleHighlightsModal);
    if (els.highlightsModal) els.highlightsModal.addEventListener("click", function(e) {
      if (e.target === els.highlightsModal) els.highlightsModal.classList.remove("active");
    });
    if (els.highlightsList) els.highlightsList.addEventListener("click", function(e) {
      if (e.target.closest(".wordbook-del-btn")) {
        e.stopPropagation();
        const ts = e.target.closest(".wordbook-del-btn").dataset.delHighlight;
        if (ts !== void 0) removeHighlightByTs(ts);
      }
    });
    bindOne("portalWordbookBtn", toggleWordbookModal);
    bindOne("portalHighlightsBtn", toggleHighlightsModal);
    bindOne("portalBookmarksBtn", function() {
      const portalVisible = els.libraryPortal && !els.libraryPortal.classList.contains("hidden");
      if (portalVisible) enterReaderRoom(state.currentIssueId, state.currentPage);
      if (els.appSidebar) els.appSidebar.classList.remove("collapsed");
      $$(".tab-btn").forEach(function(b) {
        const on = b.dataset.tab === "bookmarks";
        b.classList.toggle("active", on);
        const pane = $("tab-" + b.dataset.tab);
        if (pane) pane.classList.toggle("active", on);
      });
      renderBookmarksTab();
    });
    renderAllHighlightsCounts();
  }
  function handleGlobalKeyDown(e) {
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
    if (isTyping) {
      if (e.key === "Escape") {
        activeEl.blur();
        e.preventDefault();
      }
      return;
    }
    const key = (e.key || "").toLowerCase();
    const code = e.code || "";
    const shelfOpen = els.libraryPortal && !els.libraryPortal.classList.contains("hidden");
    if (shelfOpen) {
      if (code === "Enter") {
        e.preventDefault();
        enterReaderRoom(state.currentIssueId, 1);
        return;
      }
    }
    if (code === "Space" || key === " ") {
      e.preventDefault();
      scrollPage(e.shiftKey ? -window.innerHeight * 0.6 : window.innerHeight * 0.6);
    } else if (code === "KeyW" || key === "w" || code === "ArrowUp") {
      e.preventDefault();
      scrollPage(-260);
    } else if (code === "KeyS" || key === "s" || code === "ArrowDown") {
      e.preventDefault();
      scrollPage(260);
    } else if (code === "KeyG" && e.shiftKey) {
      e.preventDefault();
      scrollPage(-1e9);
    } else if (code === "KeyG" && !e.shiftKey) {
      e.preventDefault();
      scrollPage(1e9);
    } else if (code === "Digit1" || key === "1") {
      e.preventDefault();
      setViewMode("interlinear");
    } else if (code === "Digit2" || key === "2") {
      e.preventDefault();
      setViewMode("split");
    } else if (code === "Digit3" || key === "3") {
      e.preventDefault();
      setViewMode("en-only");
    } else if (code === "Digit4" || key === "4") {
      e.preventDefault();
      setViewMode("zh-only");
    } else if (code === "KeyM" || key === "m") {
      e.preventDefault();
      switchIssue(nextIssueId());
    } else if (code === "KeyJ" || code === "ArrowRight" || code === "PageDown") {
      e.preventDefault();
      if (!state.isNavigating) {
        state.isNavigating = true;
        loadPage(state.currentPage + 1);
        setTimeout(function() {
          state.isNavigating = false;
        }, HELD.JUMP_LOCK_MS);
      }
    } else if (code === "KeyK" || code === "ArrowLeft" || code === "PageUp") {
      e.preventDefault();
      if (!state.isNavigating) {
        state.isNavigating = true;
        loadPage(state.currentPage - 1);
        setTimeout(function() {
          state.isNavigating = false;
        }, HELD.JUMP_LOCK_MS);
      }
    } else if (code === "KeyT" || key === "t") {
      e.preventDefault();
      toggleSidebar(e);
    } else if (e.key === "?" || e.shiftKey && code === "Slash") {
      e.preventDefault();
      toggleShortcutsModal();
    } else if (code === "Escape" || key === "escape") {
      const sb = els.appSidebar;
      if (els.shortcutsModal && els.shortcutsModal.classList.contains("active")) {
        els.shortcutsModal.classList.remove("active");
        return;
      }
      if (els.wordbookModal && els.wordbookModal.classList.contains("active")) {
        els.wordbookModal.classList.remove("active");
        return;
      }
      if (els.highlightsModal && els.highlightsModal.classList.contains("active")) {
        els.highlightsModal.classList.remove("active");
        return;
      }
      if (els.lightboxModal && els.lightboxModal.classList.contains("active")) {
        els.lightboxModal.classList.remove("active");
        return;
      }
      if (els.settingsPopover && els.settingsPopover.classList.contains("active")) {
        toggleSettingsPopover(false);
        return;
      }
      if (sb && !sb.classList.contains("collapsed")) {
        sb.classList.add("collapsed");
        toast("📋 目录已收起");
      } else openLibraryShelf();
    } else if (code === "KeyB" || key === "b") {
      e.preventDefault();
      toggleBookmark(state.currentPage);
    } else if (code === "KeyP" || key === "p") {
      e.preventDefault();
      playPageSpeech();
    } else if (code === "KeyF" || key === "f") {
      e.preventDefault();
      toggleFullscreen();
    } else if (code === "KeyE" || key === "e") {
      e.preventDefault();
      exportAllMarkdown();
    } else if (code === "KeyL" || key === "l") {
      e.preventDefault();
      toggleWordbookModal();
    } else if (code === "KeyH" || key === "h") {
      e.preventDefault();
      openLibraryShelf();
    }
  }
  function upgradeOnlineData() {
    const proto = location.protocol;
    if (proto !== "http:" && proto !== "https:") return;
    fetch("assets/data/magazines.json", { cache: "no-cache" }).then(function(r) {
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    }).then(function(json) {
      if (!json || typeof json !== "object") return;
      let changed = false;
      Object.keys(json).forEach(function(id) {
        if (!allIssues[id]) {
          allIssues[id] = json[id];
          changed = true;
        }
      });
      if (!changed) return;
      state.searchIndexCache = null;
      if (els.magazineShelfGrid) renderLibraryShelf();
      state.currentIssueObj = allIssues[state.currentIssueId] || { id: "", pages: [], totalPages: 0, displayName: "未加载" };
      state.data = state.currentIssueObj.pages || [];
      if (els.tocList) initTOC();
      refreshPill();
    }).catch(function() {
    });
  }
  function boot() {
    const storedTheme = lsGet(LS.theme, "");
    const initTheme = THEMES.indexOf(storedTheme) >= 0 ? storedTheme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(initTheme);
    $$(".popover-theme-card").forEach(function(c) {
      c.classList.toggle("active", c.dataset.theme === initTheme);
    });
    if (lsGet(LS.font, "sans") === "serif") {
      state.isSerifMode = true;
      document.body.classList.add("font-mode-serif");
      if (els.fontToggleBtn) els.fontToggleBtn.textContent = "🔠 典雅衬线";
    }
    setViewMode(lsGet(LS.view, "interlinear"));
    applyAlignMode(lsGet(LS.align, "flush"));
    updateSpeedDisplays();
    initA11y();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", function() {
        navigator.serviceWorker.register("sw.js").catch(function() {
        });
      });
    }
    if (els.appSidebar) els.appSidebar.classList.add("collapsed");
    applyIssueAccent();
    bindStaticEvents();
    bindPortalSearch();
    renderLibraryShelf();
    renderBookmarksTab();
    initTOC();
    refreshPill();
    if (els.pageSlider) {
      els.pageSlider.addEventListener("input", function() {
        if (els.pageCounterText) els.pageCounterText.textContent = "第 " + els.pageSlider.value + " / " + state.currentIssueObj.totalPages + " 页";
      });
      els.pageSlider.addEventListener("change", function() {
        const v = parseInt(els.pageSlider.value, 10);
        if (v && v !== state.currentPage) loadPage(v);
      });
    }
    if (els.searchInput) {
      bindSearchResultKeys(els.searchInput, "#search-results-list .toc-item", function(el) {
        jumpToPage(parseInt(el.dataset.page, 10));
      });
      els.searchInput.addEventListener("input", debounce(function() {
        const q = els.searchInput.value.trim();
        const listEls = els.searchResultsList;
        if (!listEls) return;
        if (q.length < 2) {
          if (els.searchTab) els.searchTab.style.display = "none";
          return;
        }
        if (els.searchTab) {
          els.searchTab.style.display = "block";
          els.searchTab.click();
        }
        listEls.innerHTML = "";
        const results = runSearch(q, state.currentIssueId).slice(0, 30);
        if (results.length === 0) {
          listEls.innerHTML = '<div style="padding:14px;font-size:12px;color:var(--text-muted);">未检索到匹配内容</div>';
          return;
        }
        const frag = document.createDocumentFragment();
        results.forEach(function(r) {
          const d = document.createElement("div");
          d.className = "toc-item";
          d.dataset.page = String(r.pageNum);
          d.setAttribute("role", "button");
          d.innerHTML = '<div class="toc-item-header"><span>PAGE ' + String(r.pageNum).padStart(3, "0") + "</span><span>" + escHtml(r.section) + '</span></div><div class="toc-item-title">' + r.snippet.slice(0, 200) + "...</div>";
          d.addEventListener("click", function() {
            jumpToPage(r.pageNum);
          });
          frag.appendChild(d);
        });
        listEls.appendChild(frag);
        announce(results.length + " 条搜索结果");
      }, HELD.SEARCH_DEBOUNCE));
    }
    bindOne("clearHistoryBtn", function() {
      confirmDialog({
        title: "清空全部阅读足迹？",
        message: "此操作不可撤销，将删除全部期刊的阅读历史记录。",
        okText: "清空",
        danger: true
      }).then(function(ok) {
        if (ok) {
          localStorage.removeItem(LS.history);
          renderContinueBanner();
          renderHistoryTab();
          toast("🗑️ 阅读足迹已清空");
        }
      });
    });
    if (getHistory().length === 0) {
      const initPage = readInt(lsGet(LS.pagePrefix + state.currentIssueId, "1"), 1);
      recordReadingHistory(state.currentIssueId, initPage, state.data[initPage - 1] && state.data[initPage - 1].section || "Cover");
    }
    renderContinueBanner();
    renderHistoryTab();
    if (window.speechSynthesis) {
      state.ttsVoice = pickVoice();
      if (window.speechSynthesis.onvoiceschanged == null) {
        window.speechSynthesis.onvoiceschanged = function() {
          state.ttsVoice = pickVoice();
        };
      }
    }
    if (els.shortcutsVersion) els.shortcutsVersion.textContent = "The Atlantic Reader v" + VERSION;
    upgradeOnlineData();
    window.loadPage = loadPage;
    window.switchIssue = switchIssue;
    window.enterReaderRoom = enterReaderRoom;
    window.openLibraryShelf = openLibraryShelf;
    window.toggleSidebar = toggleSidebar;
    window.toggleShortcutsModal = toggleShortcutsModal;
    window.readerVersion = VERSION;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
