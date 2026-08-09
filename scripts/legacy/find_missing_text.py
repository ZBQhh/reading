import fitz
import json

doc_aug = fitz.open("raw_pdf/The Atlantic - August 2026..pdf")

with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
    magazines = json.load(f)

aug_pages = magazines['2026-08']['pages']

print("=== Checking if any PDF pages have text that is missing from magazines.json ===")
missing_text_pages = []

for idx, p in enumerate(aug_pages):
    pnum = idx + 1
    pdf_page = doc_aug[idx]
    pdf_text = pdf_page.get_text("text").strip()
    
    segs = p.get('segments', [])
    json_en = " ".join([s.get('en', '') for s in segs]).strip()
    
    # Clean comparison: check if PDF has >= 300 characters but JSON has < 150 characters
    if len(pdf_text) >= 300 and len(json_en) < 150:
        missing_text_pages.append((pnum, len(pdf_text), len(json_en), pdf_text[:150]))

print(f"Pages where PDF text is rich but JSON is missing/short: {len(missing_text_pages)}")
for pnum, pdf_len, json_len, preview in missing_text_pages:
    print(f"  Page {pnum:03d}: PDF len={pdf_len}, JSON len={json_len}")
    print(f"    Preview: {preview.replace(chr(10), ' ')}")
