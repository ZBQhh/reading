import fitz
import json

doc_aug = fitz.open("raw_pdf/The Atlantic - August 2026..pdf")

print("=== Inspecting August 2026 Page 6 in PDF ===")
p6 = doc_aug[5] # 0-indexed: page 6
text_p6 = p6.get_text("text").strip()
print(f"Page 6 PDF Text ({len(text_p6)} chars):\n{text_p6}\n")

with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
    magazines = json.load(f)

p6_json = magazines['2026-08']['pages'][5]
print("=== Inspecting August 2026 Page 6 in magazines.json ===")
print(json.dumps(p6_json, ensure_ascii=False, indent=2))
