import json

with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
    magazines = json.load(f)

for issue_id in ['2026-08', '2026-07']:
    pages = magazines[issue_id]['pages']
    print(f"\n=== Issue {issue_id}: Segment Counts per Page ===")
    for idx, p in enumerate(pages):
        pnum = p.get('pageNumber', idx + 1)
        segs = p.get('segments', [])
        total_en_len = sum(len(s.get('en', '')) for s in segs)
        total_zh_len = sum(len(s.get('zh', '')) for s in segs)
        if len(segs) < 4 or total_en_len < 500:
            print(f"Page {pnum:03d}: {len(segs):2d} segments, en_len={total_en_len:4d}, zh_len={total_zh_len:4d} | section='{p.get('section','')[:30]}'")
