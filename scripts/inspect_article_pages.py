import fitz

doc_aug = fitz.open("raw_pdf/The Atlantic - August 2026..pdf")

pages_to_check = [14, 16, 28, 42, 54, 74, 86, 90]
for pnum in pages_to_check:
    page = doc_aug[pnum - 1]
    text = page.get_text("text").strip()
    print(f"\n==========================================")
    print(f"=== August 2026 Page {pnum:03d} (PDF Text Len: {len(text)}) ===")
    print(f"==========================================")
    print(text[:600])
