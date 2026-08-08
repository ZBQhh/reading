import os
import re
import json
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

def clean_ocr_text(text):
    if not text:
        return ""
    
    # Fix broken hyphenated words at line ends: e.g. "collec-\n tion" -> "collection"
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
    
    # Fix common broken ligatures and spaces
    ligatures = {
        'fi rst': 'first',
        'fi nd': 'find',
        'fi ve': 'five',
        'fi ght': 'fight',
        'fi gure': 'figure',
        'fi le': 'file',
        'fi lm': 'film',
        'fi nal': 'final',
        'fi nancial': 'financial',
        'fi ction': 'fiction',
        'fl oor': 'floor',
        'fl ow': 'flow',
        'fl y': 'fly',
        'fl ock': 'flock',
        'fl ash': 'flash',
        'fl ight': 'flight',
        'Th e ': 'The ',
        'Th is ': 'This ',
        'Th ey ': 'They ',
        'Th ere ': 'There ',
        'Th ese ': 'These ',
        'oft en': 'often',
        'aft er': 'after',
        'litt le': 'little',
        'off erings': 'offerings',
        'off ers': 'offers',
    }
    for bad, good in ligatures.items():
        text = text.replace(bad, good)
        
    return text

def translate_text(text, retries=3, delay=0.8):
    cleaned = text.strip()
    if not cleaned or len(cleaned) <= 1:
        return ""
    
    # If text is very short numbers/symbols
    if re.match(r'^[\d\s\.,;:!@#\$%\^&\*\(\)\-—–_\+=\[\]\{\}<>\/\\\|"\']+$', cleaned):
        return cleaned

    # Contextual editorial overrides for specific known terms
    glossary = {
        "Sucker": "《受骗者》（Sucker：深陷赌博的一年）",
        "The Age of Reading Is Over": "阅读的时代已经终结",
        "Can civilization survive the postliterate era?": "文明能否在后文学时代存续？",
        "The Rosenberg Boys": "罗森堡夫妇之子",
        "The Demons of Maryville": "玛丽维尔的恶魔",
        "The Cicerone": "罗马引路人",
        "Behind the Cover": "封面故事",
        "The Commons": "读者来信与公共讨论",
        "The 'Consumer Socialism' Trap": "“消费社会主义”陷阱",
        "The Cruelest Game: Chasing Greatness": "最残酷的比赛：追逐网球伟大时代",
        "The Slave Ship and the Mayflower": "奴隶船与五月花号",
        "Paradise Revisited": "重访伊甸园：达尔文在加拉帕戈斯群岛的真实所见",
        "Look Closer": "细读名画",
    }
    if cleaned in glossary:
        return glossary[cleaned]

    for attempt in range(retries):
        try:
            url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=' + urllib.parse.quote(cleaned)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                translated_parts = []
                if data and isinstance(data, list) and data[0]:
                    for part in data[0]:
                        if part and len(part) > 0 and part[0]:
                            translated_parts.append(part[0])
                res = ''.join(translated_parts)
                return res
        except Exception as e:
            time.sleep(delay * (attempt + 1))
            if attempt == retries - 1:
                return ""

def process_single_page(page_num, scratch_dir='scratch', out_pages_dir='output/pages'):
    json_path = f'{scratch_dir}/page_{page_num:03d}.json'
    if not os.path.exists(json_path):
        return page_num, False, "JSON not found"
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    raw_text = data.get('raw_text', '').strip()
    blocks = data.get('blocks', [])
    
    text_blocks = []
    for b in blocks:
        if 'lines' in b and b.get('lines'):
            lines = b['lines']
            block_lines = []
            font_sizes = []
            for l in lines:
                spans_text = []
                for s in l.get('spans', []):
                    t = s.get('text', '').strip()
                    if t:
                        spans_text.append(t)
                        font_sizes.append(s.get('size', 10))
                if spans_text:
                    block_lines.append(' '.join(spans_text))
            
            if block_lines:
                full_block_text = '\n'.join(block_lines)
                avg_font_size = sum(font_sizes) / max(len(font_sizes), 1)
                bbox = b.get('bbox', [0, 0, 0, 0])
                text_blocks.append({
                    'bbox': bbox,
                    'text': full_block_text,
                    'avg_font_size': avg_font_size,
                    'x0': bbox[0] if bbox else 0,
                    'y0': bbox[1] if bbox else 0,
                    'x1': bbox[2] if bbox else 0,
                    'y1': bbox[3] if bbox else 0,
                })
                
    main_blocks = []
    for b in text_blocks:
        txt = b['text'].strip()
        if re.match(r'^(AUGUST\s+2026|\d{1,3}|THE\s+ATLANTIC|Culture\s+&\s+Critics|Dispatches|Features|Books|Omnivore)$', txt, re.I):
            continue
        if b['y0'] < 40 and len(txt) < 30:
            continue
        elif b['y0'] > 755 and len(txt) < 30:
            continue
        else:
            main_blocks.append(b)

    if len(main_blocks) > 1:
        xs = [b['x0'] for b in main_blocks]
        is_multi_col = max(xs) - min(xs) > 150
        if is_multi_col:
            def col_key(b):
                col_idx = 0
                if b['x0'] > 380:
                    col_idx = 2
                elif b['x0'] > 180:
                    col_idx = 1
                return (col_idx, b['y0'])
            main_blocks.sort(key=col_key)
        else:
            main_blocks.sort(key=lambda b: b['y0'])
            
    content_elements = []
    
    is_ad_page = False
    full_text_lower = raw_text.lower()
    if 'sponsor content' in full_text_lower or 'paid advertisement' in full_text_lower or 'hire skills-first' in full_text_lower:
        is_ad_page = True
    elif page_num == 101 or page_num == 103 or (len(raw_text) < 100 and ('presenting:' in full_text_lower or 'underwriters' in full_text_lower)):
        is_ad_page = True

    # Special handling for Page 101 CID font garbled text
    if page_num == 101:
        content_elements = [
            {'text': 'NEW BOOK RELEASE: An urgent signal illuminating how decades of coordinated efforts to stifle free expression snowballed into our present moment...', 'is_heading': True, 'is_subheading': False, 'is_credit_or_caption': False},
            {'text': '“Absorbing . . . A richly detailed genealogy of the continuing battle for artistic freedom in the U.S.” — KIRKUS REVIEWS', 'is_heading': False, 'is_subheading': False, 'is_credit_or_caption': False},
            {'text': '“An engaging and deeply researched book that deftly maps the far right’s attack on art and free speech in the 80s and 90s to the current day.” — TRICIA ROMANO', 'is_heading': False, 'is_subheading': False, 'is_credit_or_caption': False},
            {'text': '“Butler is one of the most exciting writers of non-fiction today.” — ETHAN HAWKE', 'is_heading': False, 'is_subheading': False, 'is_credit_or_caption': False},
            {'text': 'AVAILABLE NOW EVERYWHERE BOOKS, EBOOKS, AND AUDIOBOOKS ARE SOLD.', 'is_heading': False, 'is_subheading': True, 'is_credit_or_caption': False},
        ]
    else:
        for b in main_blocks:
            b_text = clean_ocr_text(b['text']).strip()
            if not b_text:
                continue
            
            # Identify real headings vs reader letter topic headers
            # If text is long (>100 chars), it's a paragraph even if font size is slightly larger
            is_heading = (b['avg_font_size'] > 16 and len(b_text) < 120 and not b_text.startswith('After reading') and not b_text.startswith('In the April issue'))
            is_subheading = (13 < b['avg_font_size'] <= 16 and len(b_text) < 120)
            is_credit_or_caption = ('PHOTO' in b_text or 'ILLUSTRATION' in b_text or 'COURTESY' in b_text or 'GETTY' in b_text or 'PHOTOGRAPH' in b_text)
            
            content_elements.append({
                'text': b_text,
                'is_heading': is_heading,
                'is_subheading': is_subheading,
                'is_credit_or_caption': is_credit_or_caption,
                'font_size': b['avg_font_size']
            })
        
    merged_elements = []
    idx = 0
    while idx < len(content_elements):
        curr = content_elements[idx]
        if len(curr['text']) == 1 and curr['text'].isalpha() and idx + 1 < len(content_elements):
            next_elem = content_elements[idx + 1]
            next_elem['text'] = curr['text'] + next_elem['text']
            idx += 1
            continue
        merged_elements.append(curr)
        idx += 1
        
    md_lines = []
    md_lines.append(f"# The Atlantic — August 2026\n")
    md_lines.append(f"## Page {page_num}\n")
    md_lines.append(f"![Page {page_num} Image](../images/page_{page_num:03d}.png)\n")
    md_lines.append(f"---\n")

    if is_ad_page:
        md_lines.append(f"> **[Advertisement / 赞助广告]**\n>")
        for elem in merged_elements:
            t = elem['text']
            tr = translate_text(t)
            md_lines.append(f"> {t}\n>")
            if tr:
                md_lines.append(f"> **【译文】** {tr}\n>")
        md_lines.append("\n")
    else:
        for elem in merged_elements:
            t = elem['text']
            if elem['is_credit_or_caption']:
                tr = translate_text(t)
                md_lines.append(f"*{t}*")
                if tr:
                    md_lines.append(f"\n*【图注与署名】{tr}*\n")
                else:
                    md_lines.append("\n")
            elif elem['is_heading']:
                tr = translate_text(t)
                md_lines.append(f"### {t}\n")
                if tr:
                    md_lines.append(f"**【标题翻译】** **{tr}**\n")
            elif elem['is_subheading']:
                tr = translate_text(t)
                md_lines.append(f"#### {t}\n")
                if tr:
                    md_lines.append(f"**【副标题翻译】** *{tr}*\n")
            else:
                paragraphs = [p.strip() for p in t.split('\n\n') if p.strip()]
                for p in paragraphs:
                    p_clean = ' '.join([line.strip() for line in p.split('\n') if line.strip()])
                    tr = translate_text(p_clean)
                    md_lines.append(f"{p_clean}\n")
                    if tr:
                        md_lines.append(f"**【中文翻译】** {tr}\n")

    out_file = f'{out_pages_dir}/page_{page_num:03d}.md'
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md_lines))

    return page_num, True, f"Saved to {out_file}"

def run_batch_transcription(max_workers=10):
    print("Re-running refined bilingual transcription...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_single_page, p): p for p in range(1, 105)}
        for future in as_completed(futures):
            p = futures[future]
            try:
                page_num, success, msg = future.result()
            except Exception as e:
                print(f"[✗] Page {p:03d} exception: {e}")

if __name__ == '__main__':
    run_batch_transcription(max_workers=12)
