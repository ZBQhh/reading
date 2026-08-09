import json

with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
    magazines = json.load(f)

for issue_id in ['2026-08', '2026-07']:
    p16 = magazines[issue_id]['pages'][15] # index 15 = page 16
    print(f"\n==========================================")
    print(f"=== Issue {issue_id} Page 16 ===")
    print(f"==========================================")
    print("Page number:", p16.get('pageNumber'))
    print("Image:", p16.get('image'))
    print("Section:", p16.get('section'))
    print("Segments count:", len(p16.get('segments', [])))
    for idx, s in enumerate(p16.get('segments', [])):
        print(f"  Segment {idx}: type={s.get('type')}")
        print(f"    EN: {s.get('en', '')[:100]}...")
        print(f"    ZH: {s.get('zh', '')[:100]}...")
