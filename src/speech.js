/* ============================================================================
 * speech.js — Web Speech TTS engine (paragraph + full-page朗读).
 * ==========================================================================*/

import { state, els, $$, toast, toPlainText, HELD } from './core.js';

// ---------------------------------------------------------------- TTS 引擎
export function pickVoice() {
  const synth = window.speechSynthesis;
  if (!synth || !synth.getVoices) return null;
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  // 英文嗓音只 filter 一次，循环只做 find
  const enVoices = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('en') === 0; });
  if (enVoices.length === 0) return null;
  const prefs = ['Google US English', 'Samantha', 'Microsoft Zira', 'Microsoft Aria'];
  for (let i = 0; i < prefs.length; i++) {
    const v = enVoices.find(function (v) { return v.name.indexOf(prefs[i]) >= 0; });
    if (v) return v;
  }
  return enVoices[0] || null;
}

export function resetSpeechState() {
  state.isPlayingAudio = false;
  state.currentPlayingSegmentDiv = null;
  if (els.playPageAudioBtn) {
    els.playPageAudioBtn.querySelector('.audio-btn-icon').textContent = '▶';
    els.playPageAudioBtn.querySelector('.audio-btn-text').textContent = '朗读';
    els.playPageAudioBtn.setAttribute('aria-label', '朗读整页');
  }
  $$('.segment-block.playing-active').forEach(function (b) { b.classList.remove('playing-active'); });
}

export function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  resetSpeechState();
}

export function speakText(text) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(toPlainText(text));
  u.lang = 'en-US';
  u.rate = state.audioSpeed;
  if (state.ttsVoice) u.voice = state.ttsVoice;
  u.onend = resetSpeechState;
  u.onerror = function () { resetSpeechState(); toast('⚠️ 朗读中断，请重试', 'warn'); };
  synth.speak(u);
}

export function playParagraphSpeech(text, block) {
  stopSpeech();
  const clean = toPlainText(text);
  if (!clean) return;
  state.isPlayingAudio = true;
  state.currentPlayingSegmentDiv = block;
  block.classList.add('playing-active');
  toast('🔊 朗读中（再次点击暂停）');
  speakText(clean);
}

export function playPageSpeech() {
  const synth = window.speechSynthesis;
  if (!synth) return;
  if (state.isPlayingAudio && !state.currentPlayingSegmentDiv) { stopSpeech(); toast('⏸ 整页朗读已暂停'); return; }
  stopSpeech();
  const pageObj = state.data[state.currentPage - 1];
  if (!pageObj || !pageObj.segments || pageObj.segments.length === 0) return;
  const enTexts = pageObj.segments.filter(function (s) { return s.en && s.en.length > HELD.MIN_SPEECH_SEG_CHARS; }).map(function (s) { return toPlainText(s.en); });
  if (enTexts.length === 0) return;
  state.isPlayingAudio = true;
  if (els.playPageAudioBtn) {
    els.playPageAudioBtn.querySelector('.audio-btn-icon').textContent = '⏸';
    els.playPageAudioBtn.querySelector('.audio-btn-text').textContent = '暂停';
    els.playPageAudioBtn.setAttribute('aria-label', '暂停朗读');
  }
  toast('🔊 正在朗读整页英文');
  speakText(enTexts.join('. '));
}
