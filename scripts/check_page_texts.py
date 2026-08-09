import os
import json

# Let's inspect page 1, 2, 3, 4, 5, 10, 14, 15, 27, 49, 64, 91, 104 in output/ if available
print("Checking output/ and tools/ for raw extracted data...")
if os.path.exists('output'):
    print("Files in output/:", os.listdir('output'))
if os.path.exists('raw_pdf'):
    print("Files in raw_pdf/:", os.listdir('raw_pdf'))

# Let's check issues/2026-08/full_magazine.md around page 10, 15, 27
with open('issues/2026-08/full_magazine.md', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pages = re.split(r'<a id="page-\d+"></a>', text)
print(f"Total markdown sections: {len(pages)}")

for pnum in [1, 2, 3, 4, 5, 8, 9, 10, 14, 15, 27, 49, 64, 91, 104]:
    pattern = rf'<a id="page-{pnum}"></a>(.*?)(?=<a id="page-\d+"></a>|$)'
    m = re.search(pattern, text, re.DOTALL)
    if m:
        body = m.group(1).strip()
        # Remove headers, links, images
        lines = [l for l in body.split('\n') if not l.startswith('#') and not l.startswith('![') and not l.startswith('[↑') and not l.startswith('---') and l.strip()]
        print(f"Page {pnum:03d}: {len(lines)} non-header text lines -> {lines[:2] if lines else 'EMPTY'}")
