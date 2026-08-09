/* ============================================================================
 * data.js — Cross-device sync (offline form): JSON backup export / import.
 * ==========================================================================*/

import { state, els, LS, toast, confirmDialog, readFloat, lsGet, allIssues, THEMES } from './core.js';
import { renderBookmarksTab, applyFontScale } from './reader.js';
import { applyTheme, setViewMode, applyAlignMode } from './ui.js';
import { renderWordbook } from './wordbook.js';
import { renderHistoryTab, renderContinueBanner } from './history.js';

export function collectLocalData() {
  const bag = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf('atlantic_reader_') === 0) bag[k] = localStorage.getItem(k);
  }
  return bag;
}
export function exportLocalDataJson() {
  const bag = collectLocalData();
  const blob = new Blob([JSON.stringify({ app: 'the-atlantic-reader', version: 1, exportedAt: new Date().toISOString(), data: bag }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'atlantic-reader-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  toast('📦 已导出本地数据备份（' + Object.keys(bag).length + ' 项）');
}
export function importLocalData(file) {
  const reader = new FileReader();
  reader.onerror = function () { toast('⚠️ 备份文件读取失败', 'error'); };
  reader.onload = function () {
    try {
      const payload = JSON.parse(String(reader.result));
      // schema 版本校验：未知版本直接拒绝（未来版本迁移钩子统一在此处理）
      if (payload && typeof payload === 'object' && typeof payload.version !== 'undefined' && payload.version !== 1) {
        toast('⚠️ 备份版本 v' + payload.version + ' 与当前不兼容，已拒绝', 'error'); return;
      }
      const raw = payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object' ? payload.data : (payload && typeof payload === 'object' ? payload : null);
      if (!raw || typeof raw !== 'object') { toast('⚠️ 备份格式无法识别', 'error'); return; }
      // schema 校验：localStorage 契约要求值为字符串，拒绝结构化/恶意载荷（否则 setItem 会把对象写成 "[object Object]" 污染状态）
      const bag = {};
      let skipped = 0;
      Object.keys(raw).forEach(function (k) {
        if (k.indexOf('atlantic_reader_') !== 0) return;
        if (typeof raw[k] !== 'string') { skipped++; return; }
        bag[k] = raw[k];
      });
      const keys = Object.keys(bag);
      if (keys.length === 0) { toast(skipped ? '⚠️ 备份数据格式非法，已拒绝导入' : '⚠️ 备份中无本应用数据', skipped ? 'error' : 'warn'); return; }
      confirmDialog({
        title: '导入备份（覆盖本地数据）？',
        message: '将导入 ' + keys.length + ' 项数据（书签/高亮/生词/足迹/设置），覆盖当前设备同名数据。',
        okText: '导入',
        danger: true,
      }).then(function (ok) {
        if (!ok) return;
        keys.forEach(function (k) {
          try { localStorage.setItem(k, bag[k]); } catch (_e) { /* 配额满时跳过 */ }
        });
        // 重置运行时状态以反映恢复的数据
        state.currentIssueId = lsGet(LS.issue, '');
        if (!allIssues[state.currentIssueId]) state.currentIssueId = Object.keys(allIssues)[0] || '';
        state.currentIssueObj = allIssues[state.currentIssueId] || { id: '', pages: [], totalPages: 0, displayName: '未加载' };
        state.data = state.currentIssueObj.pages || [];
        renderBookmarksTab();
        renderHistoryTab();
        renderContinueBanner();
        if (els.wordbookList) renderWordbook();
        applyFontScale(readFloat(LS.fontScale, 0) || state.globalFontScale);
        const restoredTheme = lsGet(LS.theme, '');
        if (THEMES.indexOf(restoredTheme) >= 0) applyTheme(restoredTheme);
        setViewMode(lsGet(LS.view, 'interlinear'));
        applyAlignMode(lsGet(LS.align, 'flush'));
        toast('✅ 备份导入成功（' + keys.length + ' 项）');
      });
    } catch (_e) {
      toast('⚠️ 备份文件解析失败', 'error');
    }
  };
  reader.readAsText(file);
}
