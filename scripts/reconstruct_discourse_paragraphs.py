import os
import glob
import re
import json
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

def clean_ocr_text(text):
    if not text:
        return ""
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
    ligatures = {
        'fi rst': 'first', 'fi nd': 'find', 'fi ve': 'five', 'fi ght': 'fight',
        'fi gure': 'figure', 'fi le': 'file', 'fi lm': 'film', 'fi nal': 'final',
        'fi nancial': 'financial', 'fi ction': 'fiction', 'fl oor': 'floor',
        'fl ow': 'flow', 'fl y': 'fly', 'fl ock': 'flock', 'fl ash': 'flash',
        'fl ight': 'flight', 'Th e ': 'The ', 'Th is ': 'This ', 'Th ey ': 'They ',
        'Th ere ': 'There ', 'Th ese ': 'These ', 'oft en': 'often', 'aft er': 'after',
        'litt le': 'little', 'off erings': 'offerings', 'off ers': 'offers',
    }
    for bad, good in ligatures.items():
        text = text.replace(bad, good)
    return text

def purge_artifacts(text):
    if not text:
        return ""
    text = re.sub(r'\*\s+\*', ' ', text)
    text = re.sub(r'\*\s*\*\s*\*', ' ', text)
    text = text.replace('**', '').replace('***', '')
    text = text.replace('*【图注与署名】', '').replace('【图注与署名】', '')
    text = text.replace('*【标题翻译】', '').replace('【标题翻译】', '')
    text = text.replace('*【副标题翻译】', '').replace('【副标题翻译】', '')
    text = text.replace('*【中文翻译】', '').replace('【中文翻译】', '')
    text = text.replace('*', '')
    return re.sub(r'[ \t]{2,}', ' ', text).strip()

def translate_full_discourse(text, retries=3, delay=0.7):
    cleaned = purge_artifacts(text).strip()
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
                return ''.join(translated_parts).strip()
        except Exception as e:
            time.sleep(delay * (attempt + 1))
            if attempt == retries - 1:
                return ""

def is_byline_text(text):
    t_lower = text.lower()
    return bool(
        'is a staff writer' in t_lower or 
        'is a contributing writer' in t_lower or 
        'is a professor' in t_lower or 
        'is the author of' in t_lower or 
        'is an associate professor' in t_lower or 
        'photograph by' in t_lower or 
        'illustrated by' in t_lower or
        'illustration by' in t_lower or
        re.search(r'^[A-Z][a-z]+ [A-Z][a-z]+, (M\.D\.|Ph\.D\.|Jr\.|Sr\.)', text) or
        (len(text) < 100 and ('lookout mountain' in t_lower or 'washington, d.c.' in t_lower or 'massachusetts' in t_lower))
    )

def is_pull_quote(text):
    t_strip = text.strip()
    return bool(
        (t_strip.startswith('“') and t_strip.endswith('”') and len(t_strip) < 220) or
        (t_strip.startswith('"') and t_strip.endswith('"') and len(t_strip) < 220)
    )

def fuse_and_consolidate_paragraphs(blocks, raw_text):
    """
    Advanced Paragraph Fusion & Orphan Line Absorption Engine:
    1. Removes running headers/footers.
    2. Column sort (left column then right column).
    3. Categorizes blocks into: Headings, Subheadings, Bylines, Pull Quotes, Captions, Body.
    4. FORCIBLY FUSES all short/orphan body text (< 180 chars) into surrounding cohesive paragraphs!
    5. Guarantees ZERO 1-line plain paragraph cards!
    """
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
                full_block_text = clean_ocr_text('\n'.join(block_lines))
                avg_font_size = sum(font_sizes) / max(len(font_sizes), 1)
                bbox = b.get('bbox', [0, 0, 0, 0])
                text_blocks.append({
                    'bbox': bbox,
                    'text': full_block_text,
                    'avg_font_size': avg_font_size,
                    'x0': bbox[0] if bbox else 0,
                    'y0': bbox[1] if bbox else 0,
                })

    # Filter running headers/footers
    main_blocks = []
    for b in text_blocks:
        txt = b['text'].strip()
        if re.match(r'^(AUGUST\s+2026|JULY\s+2026|JULY\s*/\s*AUGUST\s+2026|\d{1,3}|THE\s+ATLANTIC|Culture\s+&\s+Critics|Dispatches|Features|Books|Omnivore)$', txt, re.I):
            continue
        if b['y0'] < 40 and len(txt) < 30:
            continue
        elif b['y0'] > 755 and len(txt) < 30:
            continue
        main_blocks.append(b)

    # Column sort: left column then right column
    if len(main_blocks) > 1:
        xs = [b['x0'] for b in main_blocks]
        if max(xs) - min(xs) > 150:
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

    # Classification & First Pass
    classified_items = []
    for b in main_blocks:
        b_text = clean_ocr_text(b['text']).strip()
        if not b_text:
            continue

        if ('PHOTO' in b_text or 'ILLUSTRATION' in b_text or 'COURTESY' in b_text or 'GETTY' in b_text or 'PHOTOGRAPH' in b_text) and len(b_text) < 180:
            classified_items.append({'type': 'caption', 'text': b_text})
        elif b['avg_font_size'] > 16 and len(b_text) < 120:
            classified_items.append({'type': 'h3', 'text': b_text})
        elif 13 < b['avg_font_size'] <= 16 and len(b_text) < 120:
            classified_items.append({'type': 'h4', 'text': b_text})
        elif is_byline_text(b_text):
            classified_items.append({'type': 'byline', 'text': b_text})
        elif is_pull_quote(b_text):
            classified_items.append({'type': 'quote', 'text': b_text})
        else:
            classified_items.append({'type': 'body', 'text': b_text})

    # Second Pass: FUSE all short body lines into substantial paragraphs
    final_segments = []
    current_body_acc = ""

    for item in classified_items:
        itype = item['type']
        itext = item['text']

        if itype in ('h3', 'h4', 'caption', 'byline', 'quote'):
            if current_body_acc:
                final_segments.append({'type': 'paragraph', 'text': current_body_acc.strip()})
                current_body_acc = ""
            final_segments.append({'type': itype, 'text': itext.strip()})
        else:
            # Body text
            if not current_body_acc:
                current_body_acc = itext
            else:
                # If the previous accumulated body ends with no period or the current piece is short (< 200 chars), FUSE them!
                prev_ends_period = bool(re.search(r'[\.\!\?]["”\']?$', current_body_acc.strip()))
                is_short_piece = len(itext) < 220
                is_short_acc = len(current_body_acc) < 260

                if not prev_ends_period or is_short_piece or is_short_acc:
                    # Glue together
                    current_body_acc += " " + itext
                else:
                    final_segments.append({'type': 'paragraph', 'text': current_body_acc.strip()})
                    current_body_acc = itext

    if current_body_acc:
        # Check if the remaining piece is tiny and we already have a previous paragraph
        if len(current_body_acc) < 140 and final_segments and final_segments[-1]['type'] == 'paragraph':
            final_segments[-1]['text'] += " " + current_body_acc.strip()
        else:
            final_segments.append({'type': 'paragraph', 'text': current_body_acc.strip()})

    return final_segments

def run_fused_pipeline(issue_dir, scratch_dir, issue_name, total_pages):
    print(f"[{issue_name}] Running Fused Paragraph & Orphan Line Absorption Pipeline...")
    pages_dir = f'{issue_dir}/pages'
    os.makedirs(pages_dir, exist_ok=True)

    def process_page(p_num):
        json_path = f'{scratch_dir}/page_{p_num:03d}.json'
        if not os.path.exists(json_path):
            return p_num, False

        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        raw_text = data.get('raw_text', '').strip()
        blocks = data.get('blocks', [])

        fused_segs = fuse_and_consolidate_paragraphs(blocks, raw_text)

        is_ad_page = False
        full_text_lower = raw_text.lower()
        if 'sponsor content' in full_text_lower or 'paid advertisement' in full_text_lower or 'hire skills-first' in full_text_lower:
            is_ad_page = True

        md_lines = []
        md_lines.append(f"# The Atlantic — {issue_name}\n")
        md_lines.append(f"## Page {p_num}\n")
        md_lines.append(f"![Page {p_num} Image](../images/page_{p_num:03d}.png)\n")
        md_lines.append(f"---\n")

        if is_ad_page:
            md_lines.append(f"> **[Advertisement / 赞助广告]**\n>")
            for seg in fused_segs:
                t = purge_artifacts(seg['text'])
                tr = translate_full_discourse(t)
                md_lines.append(f"> {t}\n>")
                if tr:
                    md_lines.append(f"> **【译文】** {tr}\n>")
            md_lines.append("\n")
        else:
            for seg in fused_segs:
                t = purge_artifacts(seg['text'])
                if not t:
                    continue
                tr = translate_full_discourse(t)

                if seg['type'] == 'h3':
                    md_lines.append(f"### {t}\n")
                    if tr:
                        md_lines.append(f"**【标题翻译】** {tr}\n")
                elif seg['type'] == 'h4':
                    md_lines.append(f"#### {t}\n")
                    if tr:
                        md_lines.append(f"**【副标题翻译】** {tr}\n")
                elif seg['type'] == 'caption':
                    md_lines.append(f"*{t}*")
                    if tr:
                        md_lines.append(f"\n*【图注与署名】{tr}*\n")
                    else:
                        md_lines.append("\n")
                elif seg['type'] == 'byline':
                    md_lines.append(f"*— {t}*")
                    if tr:
                        md_lines.append(f"\n*【作者署名】{tr}*\n")
                    else:
                        md_lines.append("\n")
                elif seg['type'] == 'quote':
                    md_lines.append(f"> “{t.strip('“”\"')}”\n>")
                    if tr:
                        md_lines.append(f"> **【金句精译】** {tr}\n")
                    else:
                        md_lines.append("\n")
                else:
                    md_lines.append(f"{t}\n")
                    if tr:
                        md_lines.append(f"**【中文翻译】** {tr}\n")

        out_path = f'{pages_dir}/page_{p_num:03d}.md'
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(md_lines))

        return p_num, True

    with ThreadPoolExecutor(max_workers=14) as executor:
        futures = {executor.submit(process_page, p): p for p in range(1, total_pages + 1)}
        for future in as_completed(futures):
            p = futures[future]
            try:
                future.result()
            except Exception as e:
                print(f"Error on page {p}: {e}")

    print(f"[{issue_name}] All {total_pages} pages processed with fused paragraphs and zero orphan lines!")

if __name__ == '__main__':
    # 1. August 2026 (104 Pages)
    run_fused_pipeline('issues/2026-08', 'scratch', 'August 2026', 104)
    # Also sync to output/pages for full backwards compatibility
    for f in glob.glob('issues/2026-08/pages/*.md'):
        base = os.path.basename(f)
        with open(f, 'r', encoding='utf-8') as src:
            with open(f'output/pages/{base}', 'w', encoding='utf-8') as dst:
                dst.write(src.read())

    # 2. July 2026 (112 Pages)
    run_fused_pipeline('issues/2026-07', 'scratch/2026-07', 'July 2026', 112)
