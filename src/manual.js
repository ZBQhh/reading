/* ============================================================================
 * manual.js — 单篇文章手动录入系统（自建文库）。
 *
 * 设计原则（与用户约定）：与原文解析系统「入口相同、样式共用、仅数据来源不同」。
 * - 数据独立于 window.ALL_ISSUES（shipped 语料保持纯净），存 localStorage。
 * - 每篇手建文章归一化为与 PDF 解析完全相同的 issue/page/segment 模型，
 *   因此阅读引擎（TTS / 高亮 / 生词本 / 书签 / 搜索 / 历史）零改动复用。
 * - 编辑器弹窗由 JS 动态生成（与 toast / confirmDialog 同套路），不触碰
 *   build_master_portal.py 重写的 index.html，避免被构建覆盖。
 * ==========================================================================*/

import {
  els, escHtml, toast, confirmDialog, lsSet, readJson,
} from './core.js';
import { enterReaderRoom } from './reader.js';

const MANUAL_LS = 'atlantic_manual_articles';
const DEFAULT_THEME = '#b3802f';

// ---------------------------------------------------------------- 存储
export function loadManualArticles() {
  const list = readJson(MANUAL_LS, []);
  const map = {};
  list.forEach(function (a) { if (a && a.id) map[a.id] = a; });
  return map;
}
function saveManualArticles(map) {
  try { lsSet(MANUAL_LS, JSON.stringify(Object.keys(map).map(function (k) { return map[k]; }))); }
  catch (_e) { toast('⚠️ 本地存储已满，无法保存', 'error'); }
}
export function getManualArticle(id) {
  return loadManualArticles()[id] || null;
}

// ---------------------------------------------------------------- 创建
function splitParas(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(function (l) { return l.trim(); })
    .filter(function (l) { return l.length > 0; });
}

export function createManualArticle(fields) {
  const en = splitParas(fields.enText);
  const zh = splitParas(fields.zhText);
  const n = Math.max(en.length, zh.length);
  const segments = [];
  for (let i = 0; i < n; i++) {
    segments.push({ type: 'paragraph', en: en[i] || '', zh: zh[i] || '' });
  }
  const title = (fields.title || '').trim() || '未命名文章';
  const id = 'manual-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const article = {
    id: id,
    name: title,
    displayName: title,
    pubId: 'manual',
    source: 'manual',
    pubName: '自建文库',
    author: (fields.author || '').trim(),
    sourceUrl: (fields.sourceUrl || '').trim(),
    tags: splitParas(fields.tags).map(function (t) { return t.replace(/[,，]/g, '').trim(); }).filter(Boolean),
    themeColor: (fields.themeColor || DEFAULT_THEME).trim(),
    coverImage: '',
    vol: 'MANUAL',
    leadArticle: en[0] || title,
    totalPages: 1,
    imageRoot: '',
    pages: [{ pageNumber: 1, section: title, image: null, segments: segments, rawMd: '' }],
  };
  const map = loadManualArticles();
  map[id] = article;
  saveManualArticles(map);
  return article;
}

export function deleteManualArticle(id) {
  const map = loadManualArticles();
  if (!map[id]) return false;
  delete map[id];
  saveManualArticles(map);
  return true;
}

// ---------------------------------------------------------------- 导出 / 导入单篇
export function exportArticleJson(article) {
  const blob = new Blob([JSON.stringify(article, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (article.displayName || 'article') + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

export function importArticleJson(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const obj = JSON.parse(String(reader.result));
        if (!obj || !Array.isArray(obj.pages) || obj.pages.length === 0) throw new Error('格式不符：缺少 pages');
        // 归一化必填字段，避免脏数据污染阅读器
        obj.id = obj.id || ('manual-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7));
        obj.pubId = 'manual';
        obj.source = 'manual';
        obj.displayName = obj.displayName || obj.name || '导入文章';
        obj.themeColor = obj.themeColor || DEFAULT_THEME;
        obj.totalPages = obj.pages.length;
        const map = loadManualArticles();
        map[obj.id] = obj;
        saveManualArticles(map);
        resolve(obj);
      } catch (e) { reject(e); }
    };
    reader.onerror = function () { reject(new Error('读取文件失败')); };
    reader.readAsText(file);
  });
}

// ---------------------------------------------------------------- 编辑器弹窗（JS 动态生成）
const EDIT_FIELDS = [
  { key: 'title', label: '文章标题', type: 'text', placeholder: '例如：The Age of Reading Is Over', required: true },
  { key: 'author', label: '作者（可选）', type: 'text', placeholder: 'Author Name' },
  { key: 'sourceUrl', label: '来源链接（可选）', type: 'text', placeholder: 'https://...' },
  { key: 'tags', label: '标签（可选，逗号分隔）', type: 'text', placeholder: 'essay, tech' },
  { key: 'themeColor', label: '主题色', type: 'color', value: DEFAULT_THEME },
];

let editorNode = null;
let editingId = null; // 非空表示编辑已有文章

function buildEditorDom() {
  const wrap = document.createElement('div');
  wrap.className = 'manual-editor-modal';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', '新建 / 编辑单篇文章');

  let fieldsHtml = '';
  EDIT_FIELDS.forEach(function (f) {
    const val = f.value ? ' value="' + escHtml(f.value) + '"' : '';
    const ph = f.placeholder ? ' placeholder="' + escHtml(f.placeholder) + '"' : '';
    const req = f.required ? ' required' : '';
    fieldsHtml +=
      '<label class="manual-field"><span>' + escHtml(f.label) + (f.required ? ' *' : '') + '</span>' +
      '<input type="' + f.type + '" data-field="' + f.key + '"' + val + ph + req + '></label>';
  });

  wrap.innerHTML =
    '<div class="manual-editor-card" role="document">' +
    '<div class="manual-editor-head">' +
    '<h3 id="manual-editor-title">✎ 新建单篇文章</h3>' +
    '<button class="manual-editor-close" aria-label="关闭">✕</button>' +
    '</div>' +
    '<div class="manual-editor-body">' +
    fieldsHtml +
    '<label class="manual-field manual-field-col"><span>英文正文（每行一段；必填）</span>' +
    '<textarea data-field="enText" rows="8" placeholder="Paste or type the English text here.&#10;One paragraph per line." required></textarea></label>' +
    '<label class="manual-field manual-field-col"><span>中文翻译（可选；每行一段，与英文 1:1 配对）</span>' +
    '<textarea data-field="zhText" rows="6" placeholder="在此粘贴或输入中文翻译。&#10;留空则仅英文单语阅读。"></textarea></label>' +
    '</div>' +
    '<div class="manual-editor-actions">' +
    '<button class="manual-btn manual-btn-ghost" data-act="import">📥 导入 JSON</button>' +
    '<button class="manual-btn manual-btn-ghost" data-act="export">⤓ 导出 JSON</button>' +
    '<span class="manual-editor-spacer"></span>' +
    '<button class="manual-btn manual-btn-ghost" data-act="cancel">取消</button>' +
    '<button class="manual-btn manual-btn-primary" data-act="save">💾 保存并阅读</button>' +
    '</div></div>';
  return wrap;
}

function getFieldVal(node, key) {
  const el = node.querySelector('[data-field="' + key + '"]');
  return el ? el.value : '';
}

export function openManualEditor(article) {
  closeManualEditor();
  editingId = article ? article.id : null;
  editorNode = buildEditorDom();
  document.body.appendChild(editorNode);
  const titleEl = editorNode.querySelector('#manual-editor-title');
  if (titleEl) titleEl.textContent = article ? '✎ 编辑文章' : '✎ 新建单篇文章';

  if (article) {
    EDIT_FIELDS.forEach(function (f) {
      const el = editorNode.querySelector('[data-field="' + f.key + '"]');
      if (el) el.value = article[f.key] || (f.key === 'themeColor' ? DEFAULT_THEME : '');
    });
    const enEl = editorNode.querySelector('[data-field="enText"]');
    if (enEl) enEl.value = (article.pages[0].segments || []).map(function (s) { return s.en; }).join('\n');
    const zhEl = editorNode.querySelector('[data-field="zhText"]');
    if (zhEl) zhEl.value = (article.pages[0].segments || []).map(function (s) { return s.zh; }).join('\n');
  }

  editorNode.addEventListener('click', function (e) {
    if (e.target === editorNode) { closeManualEditor(); return; }
    const act = e.target.getAttribute && e.target.getAttribute('data-act');
    if (!act) return;
    if (act === 'cancel' || e.target.classList.contains('manual-editor-close')) closeManualEditor();
    else if (act === 'save') doSave(editorNode);
    else if (act === 'import') doImport();
    else if (act === 'export') doExportFromEditor(editorNode);
  });
  // 关闭按钮
  const closeBtn = editorNode.querySelector('.manual-editor-close');
  if (closeBtn) closeBtn.addEventListener('click', closeManualEditor);
  const firstInput = editorNode.querySelector('[data-field="title"]');
  if (firstInput) firstInput.focus();
}

export function closeManualEditor() {
  if (editorNode) { editorNode.remove(); editorNode = null; }
  editingId = null;
}

// 编辑态：从当前表单构建文章对象（不落库），供导出预览
function buildArticleFromForm(node) {
  const fields = {
    title: getFieldVal(node, 'title'),
    author: getFieldVal(node, 'author'),
    sourceUrl: getFieldVal(node, 'sourceUrl'),
    tags: getFieldVal(node, 'tags'),
    themeColor: getFieldVal(node, 'themeColor') || DEFAULT_THEME,
    enText: getFieldVal(node, 'enText'),
    zhText: getFieldVal(node, 'zhText'),
  };
  return fields;
}

function doSave(node) {
  const fields = buildArticleFromForm(node);
  if (!fields.title.trim()) { toast('请填写文章标题', 'warn'); return; }
  if (!fields.enText.trim()) { toast('请填写英文正文', 'warn'); return; }
  if (editingId) {
    // 覆盖式编辑：删除旧 id 后以新结构重建（保留 id 以便书签/高亮仍然命中）
    const article = createManualArticle(fields);
    const map = loadManualArticles();
    delete map[editingId];
    article.id = editingId;
    map[editingId] = article;
    saveManualArticles(map);
    closeManualEditor();
    toast('✅ 已更新文章');
    if (els.magazineShelfGrid) renderManualShelfSection();
    enterReaderRoom(editingId, 1);
    return;
  }
  const article = createManualArticle(fields);
  closeManualEditor();
  toast('✅ 已保存文章');
  if (els.magazineShelfGrid) renderManualShelfSection();
  enterReaderRoom(article.id, 1);
}

function doImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  input.addEventListener('change', function () {
    if (input.files && input.files[0]) {
      importArticleJson(input.files[0])
        .then(function (a) { closeManualEditor(); toast('✅ 已导入：' + a.displayName); if (els.magazineShelfGrid) renderManualShelfSection(); })
        .catch(function (e) { toast('⚠️ 导入失败：' + e.message, 'error'); });
    }
    input.remove();
  });
  document.body.appendChild(input);
  input.click();
}

function doExportFromEditor(node) {
  const fields = buildArticleFromForm(node);
  if (!fields.title.trim() || !fields.enText.trim()) { toast('请先填写标题与英文正文再导出', 'warn'); return; }
  const article = createManualArticle(fields);
  exportArticleJson(article);
  // 导出预览稿不落库（避免误存未确认内容）
  const map = loadManualArticles();
  delete map[article.id];
  saveManualArticles(map);
  toast('⤓ 已导出 JSON');
}

// 书架中手建文章分组的增量重渲染（由 ui.js 的 renderLibraryShelf 调用）
export function renderManualShelfSection() {
  const grid = els.magazineShelfGrid;
  if (!grid) return;
  // 合并两大自建来源：markdown 构建产物(window.MANUAL_ISSUES) + 应用内草稿(localStorage)
  const mdMap = (typeof window !== 'undefined' && window.MANUAL_ISSUES) ? window.MANUAL_ISSUES : {};
  const mdIds = Object.keys(mdMap);
  const draftMap = loadManualArticles();
  const draftIds = Object.keys(draftMap);

  let section = grid.querySelector('#manual-shelf-section');
  if (!section) {
    section = document.createElement('div');
    section.id = 'manual-shelf-section';
    section.className = 'shelf-section';
    grid.parentNode.insertBefore(section, grid.nextSibling);
  }
  section.innerHTML = '<div class="shelf-section-title">📝 自建文库 · Markdown ' + mdIds.length + ' 篇 · 草稿 ' + draftIds.length + '</div>';
  const frag = document.createDocumentFragment();

  // —— Project B：markdown 自建文章（文件驱动，无删除/编辑，仅阅读 + 导出备份）——
  mdIds.forEach(function (id) {
    const a = mdMap[id];
    const card = document.createElement('div');
    card.className = 'shelf-issue-card shelf-manual-card shelf-md-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.issue = id;
    const segs = (a.pages && a.pages[0] && a.pages[0].segments) || [];
    const color = a.themeColor || DEFAULT_THEME;
    const hasZh = segs.some(function (s) { return s.zh && String(s.zh).trim(); });
    card.innerHTML =
      '<div class="shelf-cover-wrap shelf-manual-cover" style="background:' + escHtml(color) + ';">' +
      '<span class="shelf-manual-monogram">M</span></div>' +
      '<div class="shelf-details"><div class="shelf-details-top">' +
      '<span class="issue-date-tag">Markdown · ' + segs.length + ' 段' + (hasZh ? ' · 已译' : ' · 待译') + '</span>' +
      '<h3>' + escHtml(a.displayName || id) + '</h3>' +
      '<p>' + escHtml(a.author ? ('作者：' + a.author) : (a.website || '自建文章')) + '</p>' +
      '<div class="shelf-meta-tags">' +
      '<span class="meta-tag">📄 单页流式</span>' +
      (a.source ? '<span class="meta-tag">🔗 来源</span>' : '') +
      '</div></div>' +
      '<div class="shelf-manual-actions">' +
      '<button class="shelf-enter-btn" data-issue="' + escHtml(id) + '"><span>开始阅读</span></button>' +
      '<button class="manual-mini-btn" data-act="md-export" data-issue="' + escHtml(id) + '" aria-label="导出 JSON 备份">⤓</button>' +
      '</div></div>';
    frag.appendChild(card);
  });

  // —— 应用内草稿（localStorage，可编辑/导出/删除）——
  draftIds.forEach(function (id) {
    const a = draftMap[id];
    const card = document.createElement('div');
    card.className = 'shelf-issue-card shelf-manual-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.issue = id;
    const segs = (a.pages && a.pages[0] && a.pages[0].segments) || [];
    const color = a.themeColor || DEFAULT_THEME;
    card.innerHTML =
      '<div class="shelf-cover-wrap shelf-manual-cover" style="background:' + escHtml(color) + ';">' +
      '<span class="shelf-manual-monogram">✎</span></div>' +
      '<div class="shelf-details"><div class="shelf-details-top">' +
      '<span class="issue-date-tag">草稿 · ' + segs.length + ' 段</span>' +
      '<h3>' + escHtml(a.displayName || id) + '</h3>' +
      '<p>' + escHtml(a.author ? ('作者：' + a.author) : '手动录入文章') + '</p>' +
      '<div class="shelf-meta-tags">' +
      '<span class="meta-tag">🔤 单语/双语</span>' +
      (a.sourceUrl ? '<span class="meta-tag">🔗 来源</span>' : '') +
      '</div></div>' +
      '<div class="shelf-manual-actions">' +
      '<button class="shelf-enter-btn" data-issue="' + escHtml(id) + '"><span>开始阅读</span></button>' +
      '<button class="manual-mini-btn" data-act="edit" data-issue="' + escHtml(id) + '" aria-label="编辑">✎</button>' +
      '<button class="manual-mini-btn" data-act="export" data-issue="' + escHtml(id) + '" aria-label="导出">⤓</button>' +
      '<button class="manual-mini-btn manual-mini-danger" data-act="delete" data-issue="' + escHtml(id) + '" aria-label="删除">🗑</button>' +
      '</div></div>';
    frag.appendChild(card);
  });

  // —— 「＋ 新建文章」入口（打开应用内编辑器，作为快速草稿）——
  const newCard = document.createElement('div');
  newCard.className = 'shelf-issue-card shelf-new-manual-card';
  newCard.setAttribute('role', 'button');
  newCard.setAttribute('tabindex', '0');
  newCard.setAttribute('data-act', 'new');
  newCard.innerHTML =
    '<div class="shelf-cover-wrap shelf-new-manual-cover"><span class="shelf-new-manual-plus">＋</span></div>' +
    '<div class="shelf-details"><div class="shelf-details-top">' +
    '<span class="issue-date-tag">自建 · 快速草稿</span>' +
    '<h3>新建单篇文章</h3>' +
    '<p>粘贴英文（可附中文），或导入 JSON。也可直接往 md 数据源文件夹放 .md 由构建生成。</p>' +
    '<div class="shelf-meta-tags"><span class="meta-tag">✎ 对照 / 整篇录入</span>' +
    '<span class="meta-tag">🔤 纯英文亦可</span></div></div></div>';
  frag.appendChild(newCard);

  section.appendChild(frag);
}

// 手建文章卡片上的 编辑/导出/删除 委托处理（由 main.js 的门户委托调用）
export function handleManualCardAction(act, id) {
  // 草稿(localStorage) 优先；否则取 markdown 构建产物(window.MANUAL_ISSUES)
  let a = getManualArticle(id);
  if (!a && typeof window !== 'undefined' && window.MANUAL_ISSUES && window.MANUAL_ISSUES[id]) {
    a = window.MANUAL_ISSUES[id];
  }
  if (!a) return;
  if (act === 'edit') openManualEditor(a);
  else if (act === 'export' || act === 'md-export') exportArticleJson(a);
  else if (act === 'delete') {
    confirmDialog({ title: '删除这篇文章？', message: '《' + a.displayName + '》将被永久删除，不可撤销。', okText: '删除', danger: true })
      .then(function (ok) {
        if (ok) { deleteManualArticle(id); toast('🗑 已删除'); if (els.magazineShelfGrid) renderManualShelfSection(); }
      });
  }
}
