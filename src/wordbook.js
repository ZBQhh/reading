/* ============================================================================
 * wordbook.js — Personal vocabulary book: add/remove/speak/export + render.
 * ==========================================================================*/

import { state, els, LS, escHtml, toast, confirmDialog, readFloat, HELD } from './core.js';
import { pickVoice } from './speech.js';
import { switchIssue } from './reader.js';
import { jumpToPage } from './ui.js';

export function loadWordbook() {
  try { return JSON.parse(localStorage.getItem(LS.wordbook) || '[]'); } catch (_e) { return []; }
}
export function saveWordbook(list) {
  try { localStorage.setItem(LS.wordbook, JSON.stringify(list.slice(0, HELD.WORDBOOK_MAX))); } catch (_e) { /* 配额满时静默 */ }
}
/** 取当前页含该词的 .en-text 片段作为语境（上限 120 字符） */
export function wordContext(word) {
  const pageObj = state.data[state.currentPage - 1];
  if (!pageObj || !pageObj.segments) return '';
  const lower = word.toLowerCase();
  for (let i = 0; i < pageObj.segments.length; i++) {
    const en = pageObj.segments[i].en;
    if (en && en.toLowerCase().indexOf(lower) >= 0) {
      const idx = en.toLowerCase().indexOf(lower);
      const start = Math.max(0, idx - 40);
      return (start > 0 ? '…' : '') + en.slice(start, idx + word.length + 60) + '…';
    }
  }
  return '';
}
export function addWord(word) {
  const w = String(word || '').trim().replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
  if (!w || w.length < 2) return;
  const lower = w.toLowerCase();
  let list = loadWordbook().filter(function (x) { return x.word !== lower; });
  const pageObj = state.data[state.currentPage - 1];
  list.unshift({
    word: lower,
    display: w,
    issue: state.currentIssueId,
    page: state.currentPage,
    section: (pageObj && pageObj.section) || 'Page ' + state.currentPage,
    context: wordContext(w),
    ts: Date.now(),
  });
  saveWordbook(list);
  renderWordbook();
  toast('📖 已收藏生词：' + w);
}
export function removeWord(word) {
  saveWordbook(loadWordbook().filter(function (x) { return x.word !== word; }));
  renderWordbook();
  toast('🗑️ 已移出生词本');
}
export function clearWordbook() {
  confirmDialog({
    title: '清空生词本？',
    message: '将删除全部 ' + loadWordbook().length + ' 个收藏生词，此操作不可撤销。',
    okText: '清空',
    danger: true,
  }).then(function (ok) {
    if (ok) { saveWordbook([]); renderWordbook(); toast('🗑️ 生词本已清空'); }
  });
}
export function speakWord(word) {
  if (!window.speechSynthesis) { toast('⚠️ 当前浏览器不支持朗读'); return; }
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  const rate = readFloat(LS.speed, 1);
  u.rate = rate > 0 ? rate : 1;
  const v = pickVoice();
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
/** 生词本导出 Markdown（词 + 出处页 + 语境句） */
export function exportWordbookMd() {
  const list = loadWordbook();
  const md = '# 我的生词本（' + list.length + ' 词）\n\n' + (list.length === 0 ? '（暂无生词）' : list.map(function (x) {
    return '- **' + x.display + '** — P' + x.page + ' (' + escHtml(x.section) + ')' + (x.context ? '\n  > ' + escHtml(x.context) : '');
  }).join('\n'));
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'my-wordbook.md';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  toast('📤 已导出生词本（' + list.length + ' 词）');
}
/** 渲染生词本列表（弹窗内） */
export function renderWordbook() {
  const listEl = els.wordbookList;
  const countEl = els.wordbookCount;
  if (!listEl) return;
  const list = loadWordbook();
  if (countEl) countEl.textContent = list.length + ' 词';
  listEl.innerHTML = '';
  if (list.length === 0) {
    listEl.innerHTML = '<div class="wordbook-empty-hint">📖 阅读中双击选中的英文单词 → 点「📖 生词」即可收藏</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(function (x) {
    const item = document.createElement('div');
    item.className = 'wordbook-item';
    item.dataset.word = x.word;
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    item.innerHTML =
      '<div class="wordbook-item-top">' +
      '<span class="wordbook-word">' + escHtml(x.display) + '</span>' +
      '<span class="wordbook-page-badge">P' + x.page + '</span>' +
      '<button class="wordbook-speak-btn" data-speak="' + escHtml(x.word) + '" title="朗读发音">🔊</button>' +
      '<button class="wordbook-del-btn" data-del="' + escHtml(x.word) + '" title="移出生词本">✕</button></div>' +
      (x.context ? '<div class="wordbook-context">' + escHtml(x.context) + '</div>' : '');
    item.addEventListener('click', function () {
      if (x.issue !== state.currentIssueId) { switchIssue(x.issue); }
      jumpToPage(x.page);
      if (els.wordbookModal) els.wordbookModal.classList.remove('active');
    });
    frag.appendChild(item);
  });
  listEl.appendChild(frag);
}
export function renderWordbookByDelegate(e) {
  const del = e.target.closest('.wordbook-del-btn');
  if (del) { e.stopPropagation(); removeWord(del.dataset.del); return; }
  const spk = e.target.closest('.wordbook-speak-btn');
  if (spk) { e.stopPropagation(); speakWord(spk.dataset.speak); }
}
export function toggleWordbookModal() {
  if (!els.wordbookModal) return;
  const active = els.wordbookModal.classList.toggle('active');
  if (active) { renderWordbook(); }
}
