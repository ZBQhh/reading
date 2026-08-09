import os
import glob
import re

def clean_markdown_content(content):
    lines = content.split('\n')
    cleaned_lines = []
    
    for line in lines:
        if '### Tom Langston, M.D.' in line:
            cleaned_lines.append("*— Tom Langston, M.D. (Lookout Mountain, Ga.)*")
            cleaned_lines.append("*【署名】汤姆·兰斯顿 医学博士（佐治亚州卢考特山）*\n")
            continue
            
        if 'Lookout Mountain, Ga.' in line and 'Tom Langston' not in line:
            continue
            
        if '【标题翻译】' in line and '汤姆·兰斯顿' in line:
            continue
            
        # Clean up stray unclosed markdown bold marks inside title translation
        if '【标题翻译】' in line:
            clean_zh_title = line.replace('**【标题翻译】**', '').replace('**', '').replace('###', '').strip()
            if clean_zh_title:
                cleaned_lines.append(f"**【标题翻译】** {clean_zh_title}")
            continue

        if '【副标题翻译】' in line:
            clean_zh_sub = line.replace('**【副标题翻译】**', '').replace('**', '').replace('*', '').replace('####', '').strip()
            if clean_zh_sub:
                cleaned_lines.append(f"**【副标题翻译】** {clean_zh_sub}")
            continue

        cleaned_lines.append(line)
        
    res = '\n'.join(cleaned_lines)
    res = re.sub(r'\n{3,}', '\n\n', res)
    return res

def process_all_markdown_files():
    pages = sorted(glob.glob('output/pages/page_*.md'))
    for p in pages:
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read()
            
        cleaned = clean_markdown_content(content)
        with open(p, 'w', encoding='utf-8') as f:
            f.write(cleaned)
            
    print(f"Cleaned all {len(pages)} markdown page files safely!")

if __name__ == '__main__':
    process_all_markdown_files()
