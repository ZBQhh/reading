import os
import re

def refine_pages():
    # 1. Refine page_008.md
    p8_path = 'output/pages/page_008.md'
    if os.path.exists(p8_path):
        with open(p8_path, 'r', encoding='utf-8') as f:
            p8 = f.read()
            
        p8 = p8.replace(
            'In the April issue, McKay Coppins reflected on his year as a degenerate gambler. Sucker\n\n**【中文翻译】** 在四月号中，麦凯·科平斯回顾了他作为堕落赌徒的一年。吸盘',
            '**Discussion Topic:** In the April issue, McKay Coppins reflected on his year as a degenerate gambler ("Sucker").\n\n**【读者回响专题】** 在4月号中，麦凯·科平斯（McKay Coppins）撰文回顾了他沉迷体育博彩的一年（特稿标题为《受骗者》/ "Sucker"）。以下为读者来信与辩论：'
        )
        p8 = p8.replace(
            'In the April issue, McKay Coppins reflected on his year as a degenerate gambler. Sucker',
            '**Discussion Topic:** In the April issue, McKay Coppins reflected on his year as a degenerate gambler ("Sucker").'
        )
        with open(p8_path, 'w', encoding='utf-8') as f:
            f.write(p8)
            
    # 2. Refine page_101.md
    p101_path = 'output/pages/page_101.md'
    if os.path.exists(p101_path):
        p101_content = """# The Atlantic — August 2026

## Page 101

![Page 101 Image](../images/page_101.png)

---

> **[Advertisement / 新书出版赞助广告]**
>
> **NEW BOOK RELEASE:** An urgent signal illuminating how decades of coordinated efforts to stifle free expression snowballed into our present moment...
> **【新书推荐】** 一部极具启发性的重磅著作，揭示了数十年来压制言论自由的各种协同行动如何演变演进至我们当下的时代……
>
> “Absorbing . . . A richly detailed genealogy of the continuing battle for artistic freedom in the U.S.” — *KIRKUS REVIEWS*
> **【书评】** “引人入胜……对美国持续至今的艺术自由之战进行了极其详尽的谱系考证。” ——《柯克斯书评》
>
> “An engaging and deeply researched book that deftly maps the far right’s attack on art and free speech in the 80s and 90s to the current day.” — *TRICIA ROMANO, Author of The Freaks Came Out to Write*
> **【书评】** “一本引人深思且研究扎实的力作，精准梳理了从80、90年代至当下极右翼对艺术与言论自由的抨击。” —— 翠西亚·罗曼诺
>
> “Butler is one of the most exciting writers of non-fiction today.” — *ETHAN HAWKE*
> **【名家推荐】** “巴特勒是当今最令人振奋的非虚构作家之一。” —— 伊桑·霍克
>
> **AVAILABLE NOW EVERYWHERE BOOKS, EBOOKS, AND AUDIOBOOKS ARE SOLD.**
> **【发售信息】** 实体书、电子书及有声书现已在各大平台同步发售。
"""
        with open(p101_path, 'w', encoding='utf-8') as f:
            f.write(p101_content)
            
    print("Refined specific pages successfully!")

if __name__ == '__main__':
    refine_pages()
