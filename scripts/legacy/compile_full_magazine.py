import os

def compile_full_magazine():
    pages_dir = 'output/pages'
    
    lines = []
    lines.append("# The Atlantic — August 2026")
    lines.append("**Volume 338, No. 2 | Complete Bilingual Edition (中英双语完整版)**\n")
    lines.append("> 本刊物由多模态解析与双语对照引擎逐页转录生成，包含全本 104 页高清图文对照、版面重排、引述整理与精校中文译文。\n")
    lines.append("---\n")
    
    # Table of Contents
    lines.append("## 目录索引 (Table of Contents)\n")
    
    toc_entries = [
        (1, "Cover: The Atlantic August 2026 (封面)"),
        (5, "Contents & Masthead (杂志目录与编务信息)"),
        (8, "Behind the Cover: The Crisis of Reading (封面背后的故事)"),
        (9, "The Commons: Discussion & Debate (读者来信与公共讨论)"),
        (11, "Dispatches / Opening Argument: The 'Consumer Socialism' Trap (消费社会主义陷阱 - Idrees Kahloon)"),
        (14, "Cover Story: The Age of Reading Is Over (阅读的终结：文明能否在后文学时代存续？ - Rose Horowitch)"),
        (28, "Feature: The Rosenberg Boys (罗森堡夫妇之子：冷战余波与历史追寻)"),
        (42, "Feature: Protocol Art & The Attention Guild (霍莉·赫恩登与马特·德莱赫斯特：抵抗数字垃圾与AI时代艺术 - Spencer Kornhaber)"),
        (54, "Feature: The Demons of Maryville (玛丽维尔的恶魔：信仰、政治与现代分裂 - Stephanie McCrummen)"),
        (64, "Feature: The Cicerone (罗马引路人：富尔维奥·德·博尼斯与永恒之城 - Cullen Murphy)"),
        (74, "Omnivore: Punctuation & The Evolution of Meaning (标点符号与文化批评)"),
        (79, "Books: Tennis's New Golden Age (网球新黄金时代书评)"),
        (82, "Books: The Slave Ship and the Mayflower (奴隶船与五月花号：重述美国起源)"),
        (86, "Art & Critics: Duchamp's Erotic Enigma (杜尚的艺术谜题与《新娘甚至被光棍们剥光了衣服》)"),
        (90, "Essay: Paradise Revisited — What Darwin Saw in the Galápagos (重访伊甸园：达尔文在加拉帕戈斯群岛的真实所见 - Helen Lewis)"),
        (102, "Look Closer: Pieter de Hooch's Interior With Women Beside a Linen Cupboard (细读名画：彼得·德·霍赫的荷兰室内静谧 - Susan Tallman)"),
    ]
    
    lines.append("### 主要专题与文章导航 (Feature Navigation)")
    for page_num, title in toc_entries:
        lines.append(f"- [**Page {page_num:03d}** - {title}](#page-{page_num})")
    
    lines.append("\n### 逐页快速直达 (Quick Page Index)")
    page_links = []
    for p in range(1, 105):
        page_links.append(f"[[P{p:03d}]](#page-{p})")
    lines.append(" ".join(page_links) + "\n")
    lines.append("---\n")
    
    # Concatenate all pages
    for p in range(1, 105):
        page_file = f'{pages_dir}/page_{p:03d}.md'
        if os.path.exists(page_file):
            with open(page_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                
            # Add an anchor
            lines.append(f'<a id="page-{p}"></a>\n')
            lines.append(content)
            lines.append("\n\n[↑ 返回目录 (Back to Top)](#目录索引-table-of-contents)\n\n---\n")

    full_content = '\n'.join(lines)
    
    # Write to root and output directory
    with open('full_magazine.md', 'w', encoding='utf-8') as f:
        f.write(full_content)
    with open('output/full_magazine.md', 'w', encoding='utf-8') as f:
        f.write(full_content)
        
    print(f"Compiled full magazine: {len(lines)} lines, {len(full_content)} bytes.")

if __name__ == '__main__':
    compile_full_magazine()
