import fitz
import json

doc_aug = fitz.open("raw_pdf/The Atlantic - August 2026..pdf")
doc_jul = fitz.open("raw_pdf/The Atlantic-2026-07.pdf")

with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
    magazines = json.load(f)

print("=== COMPREHENSIVE SCAN: August 2026 (104 Pages) ===")
aug_pages = magazines['2026-08']['pages']
sparse_aug = []

for idx, p in enumerate(aug_pages):
    pnum = idx + 1
    pdf_text = doc_aug[idx].get_text("text").strip()
    segs = p.get('segments', [])
    json_text = " ".join([s.get('en', '') for s in segs]).strip()
    
    # Check discrepancy
    pdf_len = len(pdf_text)
    json_len = len(json_text)
    
    if pdf_len > 300 and json_len < 100:
        sparse_aug.append((pnum, "MISSING_SEGMENTS", pdf_len, json_len, p.get('section', '')))
    elif json_len < 200:
        sparse_aug.append((pnum, "SHORT_CONTENT", pdf_len, json_len, p.get('section', '')))

print(f"Total sparse/short pages in Aug: {len(sparse_aug)}")
for item in sparse_aug:
    print(f"  Page {item[0]:03d} [{item[1]}]: PDF chars={item[2]}, JSON chars={item[3]} | Section: {item[4]}")

print("\n=== COMPREHENSIVE SCAN: July 2026 (112 Pages) ===")
jul_pages = magazines['2026-07']['pages']
sparse_jul = []

for idx, p in enumerate(jul_pages):
    pnum = idx + 1
    pdf_text = doc_jul[idx].get_text("text").strip()
    segs = p.get('segments', [])
    json_text = " ".join([s.get('en', '') for s in segs]).strip()
    
    pdf_len = len(pdf_text)
    json_len = len(json_text)
    
    if pdf_len > 300 and json_len < 100:
        sparse_jul.append((pnum, "MISSING_SEGMENTS", pdf_len, json_len, p.get('section', '')))
    elif json_len < 200:
        sparse_jul.append((pnum, "SHORT_CONTENT", pdf_len, json_len, p.get('section', '')))

print(f"Total sparse/short pages in Jul: {len(sparse_jul)}")
for item in sparse_jul:
    print(f"  Page {item[0]:03d} [{item[1]}]: PDF chars={item[2]}, JSON chars={item[3]} | Section: {item[4]}")
