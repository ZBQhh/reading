import os
import glob
import re
import json

def purge_markdown_artifacts(text):
    if not text:
        return ""
    text = re.sub(r'\*\s+\*', ' ', text)
    text = re.sub(r'\*\s*\*\s*\*', ' ', text)
    text = text.replace('**【中文翻译】**', '').replace('【中文翻译】', '')
    text = text.replace('**【标题翻译】**', '').replace('【标题翻译】', '')
    text = text.replace('**【副标题翻译】**', '').replace('【副标题翻译】', '')
    text = text.replace('*【图注与署名】', '').replace('【图注与署名】', '')
    text = text.replace('*【作者署名】', '').replace('【作者署名】', '')
    text = text.replace('**【金句精译】**', '').replace('【金句精译】', '')
    text = text.replace('**', '').replace('***', '')
    text = text.replace('*', '')
    return re.sub(r'[ \t]{2,}', ' ', text).strip()

def parse_markdown_to_clean_segments(md_text):
    # Filter out empty lines first so adjacent translation lines are strictly i + 1
    raw_lines = [l.strip() for l in md_text.split('\n') if l.strip()]
    segments = []
    
    if '> **[Advertisement / 赞助广告]**' in md_text or '> **[Advertisement' in md_text:
        ad_en_lines = []
        ad_zh_lines = []
        for l in raw_lines:
            if not l.startswith('>'):
                continue
            clean_l = l.replace('>', '').replace('**', '').strip()
            if '【译文】' in clean_l:
                ad_zh_lines.append(clean_l.replace('【译文】', '').strip())
            elif not clean_l.startswith('[Advertisement'):
                ad_en_lines.append(clean_l)
        en_str = purge_markdown_artifacts(' '.join(ad_en_lines))
        zh_str = purge_markdown_artifacts(' '.join(ad_zh_lines))
        return [{
            'type': 'ad',
            'en': en_str if en_str else '[Sponsored Advertisement Page]',
            'zh': ('【赞助内容 / 商业广告页】 ' + zh_str) if zh_str else '【赞助专页】'
        }]
        
    i = 0
    while i < len(raw_lines):
        line = raw_lines[i]
        
        if line.startswith('# The Atlantic') or line.startswith('## Page') or line.startswith('![Page') or line == '---':
            i += 1
            continue
            
        if line.startswith('### '):
            en_title = purge_markdown_artifacts(line.replace('### ', ''))
            zh_title = ''
            if i + 1 < len(raw_lines) and '【标题翻译】' in raw_lines[i+1]:
                zh_title = purge_markdown_artifacts(raw_lines[i+1])
                i += 1
            if en_title:
                segments.append({'type': 'h3', 'en': en_title, 'zh': zh_title})
            i += 1
            continue
            
        if line.startswith('#### '):
            en_sub = purge_markdown_artifacts(line.replace('#### ', ''))
            zh_sub = ''
            if i + 1 < len(raw_lines) and '【副标题翻译】' in raw_lines[i+1]:
                zh_sub = purge_markdown_artifacts(raw_lines[i+1])
                i += 1
            if en_sub:
                segments.append({'type': 'h4', 'en': en_sub, 'zh': zh_sub})
            i += 1
            continue
            
        # Byline Note (作者署名)
        if line.startswith('*—') or (line.startswith('*') and 'is a staff writer' in line.lower()):
            en_byline = purge_markdown_artifacts(line)
            zh_byline = ''
            if i + 1 < len(raw_lines) and '【作者署名】' in raw_lines[i+1]:
                zh_byline = purge_markdown_artifacts(raw_lines[i+1])
                i += 1
            if en_byline:
                segments.append({'type': 'byline', 'en': en_byline, 'zh': zh_byline})
            i += 1
            continue

        # Pull Quote (大字金句)
        if line.startswith('> “') or line.startswith('> "'):
            en_quote = purge_markdown_artifacts(line.replace('>', ''))
            zh_quote = ''
            if i + 1 < len(raw_lines) and '【金句精译】' in raw_lines[i+1]:
                zh_quote = purge_markdown_artifacts(raw_lines[i+1].replace('>', ''))
                i += 1
            if en_quote:
                segments.append({'type': 'quote', 'en': en_quote, 'zh': zh_quote})
            i += 1
            continue
            
        # Photo/Art Caption
        if line.startswith('*') and line.endswith('*') and ('PHOTO' in line or 'ILLUSTRATION' in line or 'COURTESY' in line or 'GETTY' in line):
            en_cap = purge_markdown_artifacts(line)
            zh_cap = ''
            if i + 1 < len(raw_lines) and '【图注与署名】' in raw_lines[i+1]:
                zh_cap = purge_markdown_artifacts(raw_lines[i+1])
                i += 1
            if en_cap:
                segments.append({'type': 'caption', 'en': en_cap, 'zh': zh_cap})
            i += 1
            continue
            
        # Standard 1:1 Author Paragraph (一段英文原文 + 一段中文精译)
        en_para = purge_markdown_artifacts(line)
        zh_para = ''
        if i + 1 < len(raw_lines) and ('**【中文翻译】**' in raw_lines[i+1] or '【中文翻译】' in raw_lines[i+1]):
            zh_para = purge_markdown_artifacts(raw_lines[i+1])
            i += 1
            
        if en_para or zh_para:
            segments.append({'type': 'paragraph', 'en': en_para, 'zh': zh_para})
        i += 1
        
    return segments

def compile_issue(issue_id, issue_title, total_pages, pages_dir, img_dir, toc_lookup):
    pages_data = []
    for p in range(1, total_pages + 1):
        md_path = f'{pages_dir}/page_{p:03d}.md'
        img_rel = f'{img_dir}/page_{p:03d}.png'
        
        md_text = ''
        if os.path.exists(md_path):
            with open(md_path, 'r', encoding='utf-8') as f:
                md_text = f.read()
                
        segments = parse_markdown_to_clean_segments(md_text)
        
        section_title = toc_lookup.get(p, "")
        if not section_title:
            prev_keys = [k for k in sorted(toc_lookup.keys()) if k <= p]
            if prev_keys:
                section_title = toc_lookup[prev_keys[-1]]
                
        pages_data.append({
            'pageNumber': p,
            'image': img_rel,
            'section': section_title,
            'segments': segments,
            'rawMd': md_text
        })
    return pages_data

def build_all():
    print("Compiling strictly 1:1 author paragraph dataset...")
    
    august_toc = {
        1: "Cover (封面)",
        5: "Contents & Masthead (目录与编务)",
        8: "Behind the Cover & The Commons (封面故事与读者回响)",
        11: "Dispatches: The 'Consumer Socialism' Trap (开篇立论：消费社会主义陷阱)",
        14: "Cover Story: The Age of Reading Is Over (封面专题：阅读的终结与后文学时代)",
        28: "Feature: The Rosenberg Boys (特稿：罗森堡夫妇之子)",
        42: "Feature: Protocol Art & Attention Guild (特稿：协议艺术与反数字垃圾)",
        54: "Feature: The Demons of Maryville (特稿：玛丽维尔的恶魔)",
        64: "Feature: The Cicerone (特稿：永恒之城的引路人)",
        74: "Omnivore: Punctuation & Culture (文化杂食家：标点符号与演化)",
        79: "Books: Tennis's New Golden Age (书评：网球新黄金时代)",
        82: "Books: The Slave Ship and the Mayflower (书评：奴隶船与五月花号)",
        86: "Art: Duchamp's Erotic Enigma (艺术观察：杜尚的色情之谜)",
        90: "Essay: Paradise Revisited — Darwin in Galápagos (特写：重访伊甸园——达尔文与加拉帕戈斯)",
        100: "Colophon & Index (刊尾信息)",
        102: "Look Closer: Pieter de Hooch (细读名画：荷兰黄金时代的室内静谧)"
    }
    
    july_toc = {
        1: "Cover: July 2026 (封面)",
        4: "Contents (七月刊目录)",
        8: "The Commons (读者来信与辩论)",
        12: "Opening Argument: Economic Dispatches (开篇立论)",
        18: "Cover Story: Summer Feature (夏季重磅特稿)",
        36: "Feature: Global Dispatches (全球深度调查)",
        56: "Feature: Culture & Ideas (文化与观念特写)",
        76: "Omnivore & Critics (文化批评与专栏)",
        88: "Books: Summer Reading Guide (夏季书评专题)",
        104: "Look Closer & Art (艺术细读与刊尾)"
    }
    
    august_data = compile_issue("2026-08", "August 2026", 104, "issues/2026-08/pages", "issues/2026-08/images", august_toc)
    july_data = compile_issue("2026-07", "July 2026", 112, "issues/2026-07/pages", "issues/2026-07/images", july_toc)
    
    all_issues_dict = {
        "2026-08": {
            "id": "2026-08",
            "name": "August 2026",
            "displayName": "2026年8月刊",
            "vol": "VOL. 338 NO. 2",
            "coverImage": "issues/2026-08/images/page_001.png",
            "totalPages": 104,
            "themeColor": "#b91c1c",
            "leadArticle": "The Age of Reading Is Over (阅读的终结与后文学时代)",
            "pages": august_data
        },
        "2026-07": {
            "id": "2026-07",
            "name": "July 2026",
            "displayName": "2026年7月刊",
            "vol": "VOL. 338 NO. 1",
            "coverImage": "issues/2026-07/images/page_001.png",
            "totalPages": 112,
            "themeColor": "#0369a1",
            "leadArticle": "July Summer Special (夏季重磅特刊)",
            "pages": july_data
        }
    }
    
    with open('output/multi_issue_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_issues_dict, f, ensure_ascii=False)
        
    with open('assets/data/magazines.json', 'w', encoding='utf-8') as f:
        json.dump(all_issues_dict, f, ensure_ascii=False)
        
    print(f"Compiled strictly 1:1 author paragraph dataset: August ({len(august_data)} pages), July ({len(july_data)} pages)")

if __name__ == '__main__':
    build_all()
