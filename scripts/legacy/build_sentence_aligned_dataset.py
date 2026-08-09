import os
import glob
import re
import json

def split_into_english_sentences(text):
    if not text:
        return []
    # Protect common abbreviations and honorifics
    t = text
    protected = {
        'Mr.': 'MR_DOT',
        'Mrs.': 'MRS_DOT',
        'Ms.': 'MS_DOT',
        'Dr.': 'DR_DOT',
        'Prof.': 'PROF_DOT',
        'U.S.': 'US_DOT',
        'M.D.': 'MD_DOT',
        'Ph.D.': 'PHD_DOT',
        'e.g.': 'EG_DOT',
        'i.e.': 'IE_DOT',
        'etc.': 'ETC_DOT',
        'vs.': 'VS_DOT',
        'Jan.': 'JAN_DOT',
        'Feb.': 'FEB_DOT',
        'Aug.': 'AUG_DOT',
        'Sept.': 'SEPT_DOT',
        'Oct.': 'OCT_DOT',
        'Nov.': 'NOV_DOT',
        'Dec.': 'DEC_DOT',
    }
    for k, v in protected.items():
        t = t.replace(k, v)
        
    # Split on sentence terminals followed by space and uppercase
    raw_sents = re.split(r'([\.\!\?]["”\']?\s+)(?=[A-Z0-9“\"\(])', t)
    
    sentences = []
    current = ""
    for piece in raw_sents:
        if re.match(r'[\.\!\?]["”\']?\s+', piece):
            current += piece.strip()
            # Restore abbreviations
            for k, v in protected.items():
                current = current.replace(v, k)
            sentences.append(current.strip())
            current = ""
        else:
            current += piece
            
    if current.strip():
        for k, v in protected.items():
            current = current.replace(v, k)
        sentences.append(current.strip())
        
    return [s for s in sentences if s]

def split_into_chinese_sentences(text):
    if not text:
        return []
    # Split on Chinese terminal punctuation
    raw = re.split(r'([。！？；]+[”’」』]?)', text)
    sentences = []
    current = ""
    for piece in raw:
        if re.match(r'[。！？；]+[”’」』]?', piece):
            current += piece
            sentences.append(current.strip())
            current = ""
        else:
            current += piece
    if current.strip():
        sentences.append(current.strip())
    return [s for s in sentences if s]

def pair_sentences(en_sents, zh_sents):
    """
    Pairs English sentences with Chinese sentences.
    If counts differ slightly, distributes proportionally.
    """
    if not en_sents:
        return []
    if not zh_sents:
        return [{'en': s, 'zh': ''} for s in en_sents]
        
    if len(en_sents) == len(zh_sents):
        return [{'en': en_sents[i], 'zh': zh_sents[i]} for i in range(len(en_sents))]
        
    # If unequal, map using fractional index
    pairs = []
    zh_len = len(zh_sents)
    en_len = len(en_sents)
    
    for i, en_s in enumerate(en_sents):
        zh_idx = int(round((i / max(en_len - 1, 1)) * (zh_len - 1)))
        zh_idx = min(max(zh_idx, 0), zh_len - 1)
        pairs.append({'en': en_s, 'zh': zh_sents[zh_idx]})
        
    return pairs

def augment_segments_with_sentences(segments):
    for seg in segments:
        en_text = seg.get('en', '')
        zh_text = seg.get('zh', '')
        
        if seg.get('type') == 'paragraph' and en_text and zh_text:
            en_sents = split_into_english_sentences(en_text)
            zh_sents = split_into_chinese_sentences(zh_text)
            seg['sentencePairs'] = pair_sentences(en_sents, zh_sents)
        else:
            seg['sentencePairs'] = []
    return segments

def run_augmentation():
    with open('output/multi_issue_data.json', 'r', encoding='utf-8') as f:
        all_issues = json.load(f)
        
    for issue_id in all_issues:
        issue = all_issues[issue_id]
        print(f"Augmenting {issue['displayName']} ({len(issue['pages'])} pages) with smart sentence pairs...")
        for page in issue['pages']:
            page['segments'] = augment_segments_with_sentences(page.get('segments', []))
            
    with open('output/multi_issue_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_issues, f, ensure_ascii=False)
        
    with open('assets/data/magazines.json', 'w', encoding='utf-8') as f:
        json.dump(all_issues, f, ensure_ascii=False)
        
    print("Dual-mode dataset (Paragraph + Sentence aligned) compiled successfully!")

if __name__ == '__main__':
    run_augmentation()
