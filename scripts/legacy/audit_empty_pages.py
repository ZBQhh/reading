import json
import os

with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
    magazines = json.load(f)

for issue_id, issue_data in magazines.items():
    pages = issue_data.get('pages', [])
    print(f"\n==========================================")
    print(f"=== Issue {issue_id}: Total {len(pages)} pages ===")
    print(f"==========================================")
    empty_pages = []
    art_placeholder_pages = []
    has_content_pages = []
    
    for idx, p in enumerate(pages):
        pnum = p.get('pageNumber', idx + 1)
        segs = p.get('segments', [])
        raw_md = p.get('rawMd', '')
        image_path = p.get('image', '')
        
        # Check if image file exists
        img_exists = os.path.exists(image_path) if image_path else False
        
        if not segs or len(segs) == 0:
            empty_pages.append((pnum, p.get('section', ''), 'NO_SEGMENTS', len(raw_md), img_exists))
        else:
            has_text = any(s.get('en', '').strip() or s.get('zh', '').strip() for s in segs)
            if not has_text:
                empty_pages.append((pnum, p.get('section', ''), 'EMPTY_TEXT_SEGS', len(raw_md), img_exists))
            elif any('Full-bleed illustration' in s.get('en', '') for s in segs):
                art_placeholder_pages.append((pnum, p.get('section', ''), len(segs), img_exists))
            else:
                has_content_pages.append((pnum, len(segs)))
                
    print(f"Total Content Pages: {len(has_content_pages)}")
    print(f"Total Truly Empty Pages (no segments): {len(empty_pages)}")
    print(f"Total Art / Full-Bleed Pages: {len(art_placeholder_pages)}")
    
    if empty_pages:
        print("\n--- Detailed Empty Pages List ---")
        for pnum, sec, reason, md_len, img_ex in empty_pages:
            print(f"  Page {pnum:03d}: section='{sec}', rawMd_len={md_len}, img_exists={img_ex}")
            
    if art_placeholder_pages:
        print("\n--- Art/Illustration Pages ---")
        for pnum, sec, num_segs, img_ex in art_placeholder_pages:
            print(f"  Page {pnum:03d}: section='{sec}', segs={num_segs}, img_exists={img_ex}")
