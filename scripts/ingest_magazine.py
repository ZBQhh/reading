import os
import sys
import json
import argparse
import fitz  # PyMuPDF
from PIL import Image

def ingest(pdf_path, pub_id, issue_id, display_name, year="2026", lead_article="Bilingual Digital Archive"):
    print(f"[*] Starting ingestion for {pub_id} - {issue_id} ({display_name})...")
    
    if not os.path.exists(pdf_path):
        print(f"[!] Error: PDF path '{pdf_path}' not found!")
        return False
        
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"[*] Opened PDF: {total_pages} total pages detected.")

    issue_dir = f"issues/{issue_id}"
    img_dir = f"{issue_dir}/images"
    os.makedirs(img_dir, exist_ok=True)

    pages_data = []

    for i in range(total_pages):
        page_num = i + 1
        page = doc[i]
        
        # 1. Render 150 DPI Page Scan
        img_filename = f"page_{page_num:03d}.png"
        img_rel_path = f"{img_dir}/{img_filename}"
        
        if not os.path.exists(img_rel_path):
            pix = page.get_pixmap(dpi=150)
            pix.save(img_rel_path)
            
        # 2. Extract author paragraphs
        blocks = page.get_text("blocks")
        segments = []
        
        for b in blocks:
            text = b[4].strip()
            if not text or len(text) < 4:
                continue
            
            # Simple heuristic paragraph segmentation
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            combined_en = " ".join(lines)
            
            if len(combined_en) > 10:
                segments.append({
                    "type": "paragraph",
                    "en": combined_en,
                    "zh": "" # Ready for translation injection
                })

        pages_data.append({
            "pageNumber": page_num,
            "section": f"{display_name} - Page {page_num}",
            "image": img_rel_path,
            "segments": segments,
            "rawMd": f"# {display_name} Page {page_num}\n\n" + "\n\n".join([s["en"] for s in segments])
        })
        
        if page_num % 20 == 0 or page_num == total_pages:
            print(f"    -> Processed {page_num}/{total_pages} pages...")

    # Update magazines.json
    magazines_json_path = "assets/data/magazines.json"
    if os.path.exists(magazines_json_path):
        with open(magazines_json_path, 'r', encoding='utf-8') as f:
            all_issues = json.load(f)
    else:
        all_issues = {}

    all_issues[issue_id] = {
        "id": issue_id,
        "pubId": pub_id,
        "name": display_name,
        "vol": f"VOL. {year} ISS. {issue_id.split('-')[-1]}",
        "displayName": display_name,
        "totalPages": total_pages,
        "coverImage": f"{img_dir}/page_001.png",
        "leadArticle": lead_article,
        "pages": pages_data
    }

    with open(magazines_json_path, 'w', encoding='utf-8') as f:
        json.dump(all_issues, f, ensure_ascii=False, indent=2)

    # Update publications.json catalog
    pub_catalog_path = "assets/data/publications.json"
    if os.path.exists(pub_catalog_path):
        with open(pub_catalog_path, 'r', encoding='utf-8') as f:
            pub_catalog = json.load(f)
    else:
        pub_catalog = {
            "publications": [
                {
                    "id": "the-atlantic",
                    "name": "The Atlantic",
                    "chineseName": "大西洋月刊",
                    "badge": "思想特稿与深度随笔",
                    "desc": "创立于 1857 年，以敏锐的政经洞察、前沿思潮与文学随笔著称。",
                    "issues": ["2026-08", "2026-07"]
                },
                {
                    "id": "the-economist",
                    "name": "The Economist",
                    "chineseName": "经济学人",
                    "badge": "全球商业与宏观科技",
                    "desc": "权威全球政经与宏观商业深度周刊，洞察全球资本与科技脉动。",
                    "issues": []
                },
                {
                    "id": "the-new-yorker",
                    "name": "The New Yorker",
                    "chineseName": "纽约客",
                    "badge": "时代文学与深度纪实",
                    "desc": "汇聚顶级文学随笔、长篇深度调查与当代文化艺术评论。",
                    "issues": []
                },
                {
                    "id": "wired",
                    "name": "Wired",
                    "chineseName": "连线",
                    "badge": "未来数字文明与人工智能",
                    "desc": "全球科技思潮领航者，聚焦 AI 革命、生物科技与前沿创新。",
                    "issues": []
                }
            ]
        }

    # Ensure issue is registered in publication
    for pub in pub_catalog["publications"]:
        if pub["id"] == pub_id:
            if issue_id not in pub["issues"]:
                pub["issues"].insert(0, issue_id)

    with open(pub_catalog_path, 'w', encoding='utf-8') as f:
        json.dump(pub_catalog, f, ensure_ascii=False, indent=2)

    print(f"[+] Successfully ingested {issue_id} into {pub_id}! Total pages: {total_pages}")
    return True

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Ingest any magazine PDF into The Atlantic Digital Reader platform")
    parser.add_argument("--pdf", required=True, help="Path to raw PDF file")
    parser.add_argument("--pub", default="the-atlantic", help="Publication ID (the-atlantic, the-economist, the-new-yorker, wired)")
    parser.add_argument("--issue", required=True, help="Issue ID (e.g. 2026-09)")
    parser.add_argument("--name", required=True, help="Display Name (e.g. 2026年9月刊)")
    parser.add_argument("--year", default="2026", help="Publication Year")
    parser.add_argument("--lead", default="Bilingual Digital Archive", help="Lead article summary")

    args = parser.parse_args()
    ingest(args.pdf, args.pub, args.issue, args.name, args.year, args.lead)
