import os
import fitz
import json

def prepare():
    pdf_path = 'The Atlantic - August 2026..pdf'
    out_img_dir = 'output/images'
    out_pages_dir = 'output/pages'
    scratch_dir = 'scratch'

    os.makedirs(out_img_dir, exist_ok=True)
    os.makedirs(out_pages_dir, exist_ok=True)
    os.makedirs(scratch_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    print(f'Total pages in PDF: {len(doc)}')

    for i, page in enumerate(doc):
        page_num = i + 1
        
        # 1. Render high-res image (150 DPI)
        pix = page.get_pixmap(dpi=150)
        img_path = f'{out_img_dir}/page_{page_num:03d}.png'
        pix.save(img_path)
        
        # 2. Extract structured text and blocks (clean bytes from image blocks)
        text_page = page.get_text('dict')
        raw_text = page.get_text('text')
        
        clean_blocks = []
        for block in text_page.get('blocks', []):
            b_copy = {}
            for k, v in block.items():
                if k == 'image':
                    b_copy['type_name'] = 'image_block'
                    b_copy['image_bytes_len'] = len(v) if isinstance(v, bytes) else 0
                elif isinstance(v, (str, int, float, bool, list, dict, type(None))):
                    b_copy[k] = v
            clean_blocks.append(b_copy)
            
        page_data = {
            'page_number': page_num,
            'image_path': img_path,
            'raw_text': raw_text.strip(),
            'blocks': clean_blocks
        }
        with open(f'{scratch_dir}/page_{page_num:03d}.json', 'w', encoding='utf-8') as f:
            json.dump(page_data, f, ensure_ascii=False, indent=2)

    print('Successfully prepared all 104 pages (images + text metadata)!')

if __name__ == '__main__':
    prepare()
