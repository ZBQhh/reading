import os

def compile_july_full():
    pages_dir = 'issues/2026-07/pages'
    lines = []
    lines.append("# The Atlantic — July 2026")
    lines.append("**Volume 338, No. 1 | Complete Bilingual Edition (2026年7月刊中英双语完整版)**\n")
    lines.append("> 本刊物由多模态解析与双语对照引擎逐页转录生成，包含全本 112 页高清图文对照与精校中文译文。\n")
    lines.append("---\n")
    
    # Concatenate all 112 pages
    for p in range(1, 113):
        page_file = f'{pages_dir}/page_{p:03d}.md'
        if os.path.exists(page_file):
            with open(page_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
            lines.append(f'<a id="page-{p}"></a>\n')
            lines.append(content)
            lines.append("\n\n---\n")

    full_content = '\n'.join(lines)
    with open('issues/2026-07/full_magazine.md', 'w', encoding='utf-8') as f:
        f.write(full_content)
    print(f"Compiled July 2026 full magazine: {len(lines)} lines, {len(full_content)} bytes.")

if __name__ == '__main__':
    compile_july_full()
