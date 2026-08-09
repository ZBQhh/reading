import fitz
import json

doc_aug = fitz.open("raw_pdf/The Atlantic - August 2026..pdf")
print(f"=== Total pages in August 2026 PDF: {len(doc_aug)} ===")

aug_empty_pages = [1, 2, 3, 4, 10, 15, 27, 49, 64, 91, 104]
for pnum in aug_empty_pages:
    page = doc_aug[pnum - 1]
    text = page.get_text("text").strip()
    print(f"\n--- August 2026 Page {pnum:03d} (PDF Text Length: {len(text)}) ---")
    if text:
        print(text[:300])
    else:
        print("[NO TEXT IN PDF - PURE VECTOR/RASTER IMAGE/AD]")

doc_jul = fitz.open("raw_pdf/The Atlantic-2026-07.pdf")
print(f"\n=== Total pages in July 2026 PDF: {len(doc_jul)} ===")

jul_empty_pages = [1, 3, 5, 14, 28, 29, 62, 95, 112]
for pnum in jul_empty_pages:
    page = doc_jul[pnum - 1]
    text = page.get_text("text").strip()
    print(f"\n--- July 2026 Page {pnum:03d} (PDF Text Length: {len(text)}) ---")
    if text:
        print(text[:300])
    else:
        print("[NO TEXT IN PDF - PURE VECTOR/RASTER IMAGE/AD]")
