/* ============================================================================
 * highlight.js — Selection highlighting, highlight persistence, and
 * full-issue / highlights Markdown export.
 * ==========================================================================*/

import { state, els, LS, toast } from './core.js';

// ==================================================================
// 选文高亮 + 全刊导出（毒舌 7.2：阅读闭环——高亮 → 导出 → 回顾）
// ==================================================================
export function loadHighlights() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(LS.highlights) || '[]'); } catch (_e) { return []; }
  if (!Array.isArray(raw)) return [];
  // 清洗：丢弃字段缺失 / start>=end 的损坏或越界条目，避免恢复时误渲染
  return raw.filter(function (h) {
    return h && typeof h.issue === 'string' && typeof h.page === 'number' &&
      typeof h.seg === 'number' && typeof h.lang === 'string' &&
      typeof h.start === 'number' && typeof h.end === 'number' && h.end > h.start;
  });
}
export function saveHighlights(list) {
  try { localStorage.setItem(LS.highlights, JSON.stringify(list)); } catch (_e) { /* 配额满时静默 */ }
}

/** 把 section 内的绝对字符偏移转换为 (文本节点, 节点内偏移) */
export function locateTextOffset(container, offset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let acc = 0; let node;
  while ((node = walker.nextNode())) {
    const len = (node.nodeValue || '').length;
    if (acc + len > offset) return { node: node, off: offset - acc };
    acc += len;
  }
  return { node: walker.lastChild, off: (walker.lastChild ? (walker.lastChild.nodeValue || '').length : 0) };
}

/** 序列化当前鼠标选区为高亮（英文 .en-text 或中文 .zh-text 均可） */
export function captureSelectionHighlight() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) { toast('💡 请先选中一段文字', 'warn'); return; }
  const rg = sel.getRangeAt(0);
  const startEl = rg.startContainer.nodeType === Node.ELEMENT_NODE ? rg.startContainer : rg.startContainer.parentElement;
  const endEl = rg.endContainer.nodeType === Node.ELEMENT_NODE ? rg.endContainer : rg.endContainer.parentElement;
  const segBlock = startEl.closest && startEl.closest('.segment-block');
  if (!segBlock || !endEl.closest || !endEl.closest('.segment-block')) { toast('⚠️ 高亮仅支持单段选区', 'error'); return; }
  if (startEl.closest('.segment-block') !== endEl.closest('.segment-block')) { toast('⚠️ 高亮仅支持单段选区', 'warn'); return; }
  const inZh = !!startEl.closest('.zh-text-card');
  const zhInner = inZh ? segBlock.querySelector('.zh-text-card > div:first-child') : null;
  const enEl = segBlock.querySelector('.en-text');
  const targetEl = inZh ? zhInner : enEl;
  if (!targetEl) { toast('⚠️ 该段无可用正文', 'warn'); return; }
  const walker = document.createTreeWalker(targetEl, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let n; while ((n = walker.nextNode())) textNodes.push(n);
  let startAbs = -1; let endAbs = -1; let acc = 0;
  for (let i = 0; i < textNodes.length; i++) {
    const tn = textNodes[i];
    const len = (tn.nodeValue || '').length;
    if (startAbs < 0 && (tn === rg.startContainer || tn.contains(rg.startContainer) || rg.startContainer === targetEl)) {
      if (rg.startContainer === targetEl) startAbs = acc;
      else if (tn === rg.startContainer) startAbs = acc + rg.startOffset;
      else if (tn.contains(rg.startContainer)) {
        let cur = rg.startContainer; let off = rg.startOffset;
        while (cur && cur !== tn) { off += (cur.previousSibling ? (cur.previousSibling.textContent || '').length : 0); cur = cur.parentNode; }
        startAbs = acc + off;
      }
    }
    if (endAbs === -1 && (tn === rg.endContainer || (tn.contains(rg.endContainer) && rg.endContainer !== targetEl))) {
      if (tn === rg.endContainer) endAbs = acc + rg.endOffset;
      else {
        let cur = rg.endContainer; let off = rg.endOffset;
        while (cur && cur !== tn) { off += (cur.previousSibling ? (cur.previousSibling.textContent || '').length : 0); cur = cur.parentNode; }
        endAbs = acc + off;
      }
    } else if (endAbs === -1 && rg.endContainer.nodeType === Node.TEXT_NODE && rg.endContainer === tn) {
      endAbs = acc + rg.endOffset;
    }
    if (startAbs >= 0 && endAbs >= 0) break;
    acc += len;
  }
  if (startAbs < 0 || endAbs < 0) { toast('⚠️ 无法定位选区，请重选', 'warn'); return; }
  const segIdx = parseInt(String(segBlock.id).replace('seg-', ''), 10);
  if (isNaN(segIdx)) { toast('⚠️ 段索引异常', 'error'); return; }
  const text = sel.toString().trim();
  if (!text) return;
  const hls = loadHighlights();
  const lang = inZh ? 'zh' : 'en';
  // 去重：同页同段同区间不重复添加
  const dup = hls.some(function (h) { return h.issue === state.currentIssueId && h.page === state.currentPage && h.seg === segIdx && h.lang === lang && h.start === startAbs && h.end === endAbs; });
  if (dup) { removeHighlight(segIdx, startAbs, endAbs, lang); }
  else {
    hls.push({ issue: state.currentIssueId, page: state.currentPage, seg: segIdx, lang: lang, start: startAbs, end: endAbs, text: text.slice(0, 300), ts: Date.now() });
    saveHighlights(hls);
    applyPageHighlights();
    toast('🔖 已高亮「' + text.slice(0, 24) + (text.length > 24 ? '…' : '') + '」');
  }
  sel.removeAllRanges();
}

export function removeHighlight(segIdx, start, end, lang) {
  let hls = loadHighlights();
  hls = hls.filter(function (h) { return !(h.issue === state.currentIssueId && h.page === state.currentPage && h.seg === segIdx && h.lang === lang && h.start === start && h.end === end); });
  saveHighlights(hls);
  applyPageHighlights();
}

/** 重渲染当前页高亮（en/zh 双语 mark 包裹） */
export function applyPageHighlights() {
  const body = els.articleBody;
  if (!body) return;
  const pageHl = loadHighlights().filter(function (h) { return h.issue === state.currentIssueId && h.page === state.currentPage; });
  if (pageHl.length === 0) return;
  pageHl.forEach(function (hl) {
    const segBlock = body.querySelector('#seg-' + hl.seg);
    if (!segBlock) return;
    const targetEl = hl.lang === 'zh' ? segBlock.querySelector('.zh-text-card > div:first-child') : segBlock.querySelector('.en-text');
    if (!targetEl) return;
    // 越界修复：按目标文本实际长度校验偏移，过期/越界高亮直接跳过，不钳制误渲染
    const textLen = (targetEl.textContent || '').length;
    if (hl.start < 0 || hl.end <= hl.start || hl.end > textLen) return;
    const a = locateTextOffset(targetEl, hl.start);
    const b = locateTextOffset(targetEl, hl.end);
    if (!a.node || !b.node || a.node === b.node && a.off === b.off) return;
    const rg = document.createRange();
    rg.setStart(a.node, a.off);
    rg.setEnd(b.node, b.off);
    const mark = document.createElement('mark');
    mark.className = 'page-highlight';
    try {
      rg.surroundContents(mark);
    } catch (_e) {
      try {
        const frag = rg.extractContents();
        mark.appendChild(frag);
        rg.insertNode(mark);
      } catch (_e2) { /* 跨元素选区过期，忽略重建 */ }
    }
  });
}

/** 导出全刊 Markdown（含本刊高亮节） */
export function exportAllMarkdown() {
  const total = state.currentIssueObj.totalPages || (state.data && state.data.length) || 0;
  if (total <= 0) { toast('⚠️ 刊目数据缺失，无法导出', 'error'); return; }
  const md = state.data.map(function (pageObj, i) {
    if (!pageObj || typeof pageObj.rawMd !== 'string') return '';
    return '\n\n---\n\n## PAGE ' + String(i + 1).padStart(3, '0') + ' — ' + (pageObj.section || '') + '\n\n' + pageObj.rawMd.trim();
  }).join('');
  const hls = loadHighlights().filter(function (h) { return h.issue === state.currentIssueId; });
  const hlSection = hls.length === 0 ? '' : '\n\n---\n\n## 📌 我的高亮（' + hls.length + ' 条）\n\n' + hls.map(function (h) {
    return '> **PAGE ' + String(h.page).padStart(3, '0') + '** — ' + h.text.replace(/\n/g, ' ') + '\n';
  }).join('\n');
  const header = '# ' + state.currentIssueObj.displayName + '\n\n> 由 The Atlantic Private Bespoke Reader 导出 · ' + state.currentIssueObj.totalPages + ' 页双语典藏\n\n已含高亮节（' + hls.length + ' 条）';
  const full = header + md + hlSection + '\n';
  const blob = new Blob([full], { type: 'text/markdown;charset=utf-8' });
  const urlName = 'the-atlantic-' + state.currentIssueId + '-export.md';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = urlName;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  toast('📤 已导出 ' + urlName + '（含 ' + hls.length + ' 条高亮）');
}
/** 高亮数据导出（纯高亮清单） */
export function exportHighlightsMd() {
  const hls = loadHighlights().filter(function (h) { return h.issue === state.currentIssueId; });
  const md = '# 我的高亮 — ' + state.currentIssueObj.displayName + '\n\n' + (hls.length === 0 ? '（暂无高亮）' : hls.map(function (h) {
    return '> **PAGE ' + String(h.page).padStart(3, '0') + '** — ' + h.text.replace(/\n/g, ' ') + '\n';
  }).join('\n'));
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'my-highlights-' + state.currentIssueId + '.md';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  toast('📤 已导出高亮清单（' + hls.length + ' 条）');
}
