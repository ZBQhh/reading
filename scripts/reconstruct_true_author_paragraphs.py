import os
import sys
import json
import re
import fitz  # PyMuPDF

def is_drop_cap(b, next_b):
    """Detect if block b is an isolated drop-cap initial for next_b."""
    txt = b.get("text", "").strip()
    if len(txt) == 1 and txt.isalpha() and txt.isupper():
        bbox = b.get("bbox", (0, 0, 0, 0))
        next_bbox = next_b.get("bbox", (0, 0, 0, 0))
        # Top aligns closely and x0 is immediately to the left
        if abs(bbox[1] - next_bbox[1]) < 30 and bbox[0] <= next_bbox[0] + 5:
            return True
    return False

def reconnect_hyphens(text):
    """Recombine hyphenated words split across line breaks."""
    # e.g. "demo- cracy" -> "democracy", "inter- national" -> "international"
    return re.sub(r'([a-zA-Z]{2,})-\s+([a-zA-Z]{2,})', r'\1\2', text)

def extract_clean_page_blocks(page):
    """Print Layout Heuristic Engine 2.0: Multi-column sorting, drop-caps welding, and hyphen repair."""
    page_dict = page.get_text("dict")
    raw_blocks = []
    
    for b in page_dict.get("blocks", []):
        if b.get("type") == 0:  # Text block
            full_text = ""
            font_sizes = []
            for line in b.get("lines", []):
                line_text = ""
                for span in line.get("spans", []):
                    line_text += span.get("text", "")
                    font_sizes.append(span.get("size", 10.0))
                full_text += line_text + " "
                
            clean_t = reconnect_hyphens(full_text.strip())
            avg_font = sum(font_sizes) / len(font_sizes) if font_sizes else 10.0
            
            if clean_t and len(clean_t) > 2:
                raw_blocks.append({
                    "text": clean_t,
                    "bbox": b.get("bbox", (0, 0, 0, 0)),
                    "fontSize": avg_font,
                    "x0": b.get("bbox", (0, 0, 0, 0))[0],
                    "y0": b.get("bbox", (0, 0, 0, 0))[1]
                })

    if not raw_blocks:
        return []

    # 1. Multi-Column Sorting: Group into left and right columns if page width is standard ~612pt
    left_col = [b for b in raw_blocks if b["x0"] < 300]
    right_col = [b for b in raw_blocks if b["x0"] >= 300]
    
    left_col.sort(key=lambda b: b["y0"])
    right_col.sort(key=lambda b: b["y0"])
    
    sorted_blocks = left_col + right_col if right_col else left_col

    # 2. Drop-Cap Welding
    welded_blocks = []
    i = 0
    while i < len(sorted_blocks):
        curr = sorted_blocks[i]
        if i + 1 < len(sorted_blocks) and is_drop_cap(curr, sorted_blocks[i+1]):
            # Weld drop cap into next block
            next_b = sorted_blocks[i+1]
            next_b["text"] = curr["text"] + next_b["text"]
            welded_blocks.append(next_b)
            i += 2
        else:
            welded_blocks.append(curr)
            i += 1

    return welded_blocks

def parse_page_to_segments(blocks):
    """Categorize blocks into paragraph, heading, quote, byline, or caption."""
    segments = []
    
    for b in blocks:
        text = b["text"]
        f_size = b["fontSize"]
        
        # Skip pure page numbers
        if re.match(r'^\d{1,3}\s*$', text):
            continue
            
        if f_size >= 24:
            segments.append({
                "type": "h3",
                "en": text,
                "zh": ""
            })
        elif f_size >= 17:
            segments.append({
                "type": "h4",
                "en": text,
                "zh": ""
            })
        elif text.startswith("—") or "is a staff writer" in text.lower() or "is a contributing writer" in text.lower():
            segments.append({
                "type": "byline",
                "en": text,
                "zh": ""
            })
        elif text.startswith("“") or text.startswith('"') and len(text) < 180:
            segments.append({
                "type": "quote",
                "en": text,
                "zh": ""
            })
        elif "PHOTO:" in text or "ILLUSTRATION BY" in text or "GETTY" in text or "COURTESY OF" in text:
            segments.append({
                "type": "caption",
                "en": text,
                "zh": ""
            })
        else:
            segments.append({
                "type": "paragraph",
                "en": text,
                "zh": ""
            })
            
    return segments

print("Print Layout Heuristic Engine 2.0 initialized with Drop-Cap welding, multi-column topology, and hyphen reconnection.")
