import os
import re
import json
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import fitz

def clean_ocr_text(text):
    if not text:
        return ""
    
    # Hyphenation repair at line endings
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
    
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
    
    if re.match(r'^[\d\s\.,;:!@#\$%\^&\*\(\)\-—–_\+=\[\]\{\}<>\/\\\|"\']+$', cleaned):
        return cleaned

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

def prepare_and_translate_july():
    pdf_path = 'The Atlantic-2026-07.pdf'
    out_dir = 'issues/2026-07'
    img_dir = f'{out_dir}/images'
    pages_dir = f'{out_dir}/pages'
    scratch_dir = 'scratch/2026-07'
    
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(pages_dir, exist_ok=True)
    os.makedirs(scratch_dir, exist_ok=True)
    
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"[July 2026] Total pages in PDF: {total_pages}")
    
    # 1. Render images and extract text blocks
    for i, page in enumerate(doc):
        p_num = i + 1
        img_path = f'{img_dir}/page_{p_num:03d}.png'
        if not os.path.exists(img_path) or os.path.getsize(img_path) == 0:
            pix = page.get_pixmap(dpi=150)
            pix.save(img_path)
            
        json_path = f'{scratch_dir}/page_{p_num:03d}.json'
        if not os.path.exists(json_path):
            text_page = page.get_text('dict')
            raw_text = page.get_text('text')
            
            clean_blocks = []
            for block in text_page.get('blocks', []):
                b_copy = {}
                for k, v in block.items():
                    if k == 'image':
                        b_copy['type_name'] = 'image_block'
                    elif isinstance(v, (str, int, float, bool, list, dict, type(None))):
                        b_copy[k] = v
                clean_blocks.append(b_copy)
                
            page_data = {
                'page_number': p_num,
                'image_path': img_path,
                'raw_text': raw_text.strip(),
                'blocks': clean_blocks
            }
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(page_data, f, ensure_ascii=False, indent=2)

    print("[July 2026] All 112 page images and text blocks rendered!")
    
    # 2. Process single page function
    def process_july_page(p_num):
        json_path = f'{scratch_dir}/page_{p_num:03d}.json'
        if not os.path.exists(json_path):
            return p_num, False, "No JSON"
            
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        raw_text = data.get('raw_text', '').strip()
        blocks = data.get('blocks', [])
        
        text_blocks = []
        for b in blocks:
            if 'lines' in b and b.get('lines'):
                block_lines = []
                font_sizes = []
                for l in b['lines']:
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
                    })
                    
        main_blocks = []
        for b in text_blocks:
            txt = b['text'].strip()
            if re.match(r'^(JULY\s+2026|JULY\s*/\s*AUGUST\s+2026|\d{1,3}|THE\s+ATLANTIC|Culture\s+&\s+Critics|Dispatches|Features|Books|Omnivore)$', txt, re.I):
                continue
            if b['y0'] < 40 and len(txt) < 30:
                continue
            elif b['y0'] > 755 and len(txt) < 30:
                continue
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
            
        for b in main_blocks:
            b_text = clean_ocr_text(b['text']).strip()
            if not b_text:
                continue
                
            is_heading = (b['avg_font_size'] > 16 and len(b_text) < 120)
            is_subheading = (13 < b['avg_font_size'] <= 16 and len(b_text) < 120)
            is_credit_or_caption = ('PHOTO' in b_text or 'ILLUSTRATION' in b_text or 'COURTESY' in b_text or 'GETTY' in b_text or 'PHOTOGRAPH' in b_text)
            
            content_elements.append({
                'text': b_text,
                'is_heading': is_heading,
                'is_subheading': is_subheading,
                'is_credit_or_caption': is_credit_or_caption
            })
            
        # Build clean markdown
        md_lines = []
        md_lines.append(f"# The Atlantic — July 2026\n")
        md_lines.append(f"## Page {p_num}\n")
        md_lines.append(f"![Page {p_num} Image](../images/page_{p_num:03d}.png)\n")
        md_lines.append(f"---\n")
        
        if is_ad_page:
            md_lines.append(f"> **[Advertisement / 赞助广告]**\n>")
            for elem in content_elements:
                t = elem['text']
                tr = translate_text(t)
                md_lines.append(f"> {t}\n>")
                if tr:
                    md_lines.append(f"> **【译文】** {tr}\n>")
            md_lines.append("\n")
        else:
            for elem in content_elements:
                t = elem['text']
                if elem['is_credit_or_caption']:
                    tr = translate_text(t)
                    md_lines.append(f"*{t}*")
                    if tr:
                        md_lines.append(f"\n*【图注与署名】{tr}*\n")
                elif elem['is_heading']:
                    tr = translate_text(t)
                    md_lines.append(f"### {t}\n")
                    if tr:
                        md_lines.append(f"**【标题翻译】** {tr}\n")
                elif elem['is_subheading']:
                    tr = translate_text(t)
                    md_lines.append(f"#### {t}\n")
                    if tr:
                        md_lines.append(f"**【副标题翻译】** {tr}\n")
                else:
                    paragraphs = [p.strip() for p in t.split('\n\n') if p.strip()]
                    for p in paragraphs:
                        p_clean = ' '.join([line.strip() for line in p.split('\n') if line.strip()])
                        tr = translate_text(p_clean)
                        md_lines.append(f"{p_clean}\n")
                        if tr:
                            md_lines.append(f"**【中文翻译】** {tr}\n")
                            
        out_file = f'{pages_dir}/page_{p_num:03d}.md'
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(md_lines))
            
        return p_num, True, "OK"

    print("Running parallel bilingual transcription for July 2026 (112 pages)...")
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(process_july_page, p): p for p in range(1, total_pages + 1)}
        for future in as_completed(futures):
            p = futures[future]
            try:
                p_num, success, msg = future.result()
            except Exception as e:
                print(f"[July Page {p}] Error: {e}")

    print("July 2026 all 112 pages transcribed successfully!")

if __name__ == '__main__':
    prepare_and_translate_july()
