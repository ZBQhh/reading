import json

with open('assets/data/magazines.json', 'r', encoding='utf-8') as f:
    magazines = json.load(f)

# 1. Enrich August 2026
aug_pages = magazines.get('2026-08', {}).get('pages', [])

aug_descriptions = {
    1: {
        "section": "Cover (封面)",
        "en": "The Atlantic — August 2026 (Cover: The Age of Reading Is Over)",
        "zh": "《大西洋月刊》2026年8月刊（封面专题：阅读的终结与后文学时代）"
    },
    2: {
        "section": "Inside Front Cover (封二广告与品牌专页)",
        "en": "Inside Front Cover — Brand Portfolio & Full-Bleed Advertisement",
        "zh": "封二专页 —— 原版品牌典藏与全版赞助特刊"
    },
    3: {
        "section": "Inside Front Cover Facing Page (跨页品牌典藏)",
        "en": "Editorial Facing Page — Visual Showcase & Sponsor Portfolio",
        "zh": "跨页典藏 —— 视觉呈现与赞助专页"
    },
    4: {
        "section": "Publisher Masthead & Portfolio (出版编务与赞助)",
        "en": "Publisher Masthead & Institutional Sponsor Portfolio",
        "zh": "出版编务与机构赞助版面"
    },
    10: {
        "section": "Behind the Cover & The Commons (封面故事与读者回响)",
        "en": "Photograph: The 16th-century Oratorio del Gonfalone in Rome (Photograph by Benedetta Ristori for The Atlantic)",
        "zh": "摄影特写：罗马16世纪贡法洛内礼拜堂（贝内黛塔·里斯托里为《大西洋月刊》拍摄）"
    },
    15: {
        "section": "Cover Story: The Age of Reading Is Over (封面专题：阅读的终结与后文学时代)",
        "en": "Cover Story Opener Artwork: The Age of Reading Is Over — Can Civilization Survive in a Post-Literate World?",
        "zh": "封面专题开篇艺术插画：阅读的终结 —— 文明能否在后文学时代存续？"
    },
    27: {
        "section": "Cover Story: The Age of Reading Is Over (封面专题：阅读的终结与后文学时代)",
        "en": "Editorial Artwork: The Crisis of Comprehension & Digital Distraction",
        "zh": "专题插画：理解力危机与数字时代的深度阅读退化"
    },
    49: {
        "section": "Feature: Protocol Art & Attention Guild (特稿：协议艺术与反数字垃圾)",
        "en": "Feature Photograph: Holly Herndon and Mat Dryhurst with their son at home in Berlin",
        "zh": "特稿摄影：霍莉·赫恩登与马特·德莱赫斯特在柏林住所与儿子合影"
    },
    64: {
        "section": "Feature: The Cicerone (特稿：永恒之城的引路人)",
        "en": "Full-page Photography: The Cicerone — Fulvio De Bonis and the Secret Monuments of Rome",
        "zh": "全版摄影：罗马引路人 —— 富尔维奥·德·博尼斯与永恒之城秘境"
    },
    91: {
        "section": "Essay: Paradise Revisited — Darwin in Galápagos (特写：重访伊甸园——达尔文与加拉帕戈斯)",
        "en": "Wildlife Artwork & Photography: What Darwin Saw in the Galápagos Archipelago",
        "zh": "自然特写与摄影：达尔文在加拉帕戈斯群岛的真实所见与物种演化"
    },
    104: {
        "section": "Look Closer: Pieter de Hooch (细读名画：荷兰黄金时代的室内静谧)",
        "en": "Look Closer: Pieter de Hooch — Interior with Women Beside a Linen Cupboard (1663, Rijksmuseum Amsterdam)",
        "zh": "细读名画：彼得·德·霍赫《亚麻柜旁的女子室内景》（1663年，阿姆斯特丹国立博物馆藏）"
    }
}

for p in aug_pages:
    pnum = p.get('pageNumber')
    if pnum in aug_descriptions:
        desc = aug_descriptions[pnum]
        p['section'] = desc['section']
        p['segments'] = [
            {
                "type": "caption",
                "en": desc['en'],
                "zh": desc['zh']
            }
        ]

# 2. Enrich July 2026
jul_pages = magazines.get('2026-07', {}).get('pages', [])

jul_descriptions = {
    1: {
        "section": "Cover: July 2026 (七月刊封面)",
        "en": "The Atlantic — July 2026 (Cover Edition: The AI Labor Revolution & Geopolitics)",
        "zh": "《大西洋月刊》2026年7月刊（封面特辑：AI 劳动革命与全球地缘新秩序）"
    },
    3: {
        "section": "Inside Front Cover (封二广告与品牌专页)",
        "en": "Inside Front Cover — Brand Portfolio & Luxury Showcase",
        "zh": "封二专页 —— 原版品牌典藏与全版赞助特刊"
    },
    5: {
        "section": "Contents (七月刊目录与编务)",
        "en": "July 2026 Contents & Editorial Masthead Overview",
        "zh": "七月刊目录与编务总览（全刊特稿与专栏索引）"
    },
    14: {
        "section": "Opening Argument: Economic Dispatches (开篇立论)",
        "en": "Opening Argument Editorial Artwork: Global Macroeconomic Realities",
        "zh": "开篇立论 —— 全球宏观经济格局与政策反思图版"
    },
    28: {
        "section": "Cover Story: Summer Feature (夏季重磅特稿)",
        "en": "Cover Story Opener Double-Page Spread & Artwork: Part I",
        "zh": "七月封面重磅特稿 —— 双跨页开篇图版与视觉特写（上）"
    },
    29: {
        "section": "Cover Story: Summer Feature (夏季重磅特稿)",
        "en": "Cover Story Opener Double-Page Spread & Artwork: Part II",
        "zh": "七月封面重磅特稿 —— 双跨页开篇图版与视觉特写（下）"
    },
    62: {
        "section": "Feature: Culture & Ideas (文化与观念特写)",
        "en": "Culture & Ideas Editorial Photography: Modern Society and Memory",
        "zh": "文化与观念特写 —— 现代社会与历史记忆全版摄影"
    },
    95: {
        "section": "Books: Summer Reading Guide (夏季书评专题)",
        "en": "Summer Reading Guide Editorial Illustration & Curated Book List",
        "zh": "夏季书评专题 —— 原创艺术插画与编辑部甄选书单"
    },
    112: {
        "section": "Look Closer & Art (艺术细读与刊尾)",
        "en": "Look Closer: Masterpiece Art Portfolio & Closing Retrospective",
        "zh": "艺术细读与刊尾典藏 —— 世界名画深度赏析与本期结语"
    }
}

for p in jul_pages:
    pnum = p.get('pageNumber')
    if pnum in jul_descriptions:
        desc = jul_descriptions[pnum]
        p['section'] = desc['section']
        p['segments'] = [
            {
                "type": "caption",
                "en": desc['en'],
                "zh": desc['zh']
            }
        ]

with open('assets/data/magazines.json', 'w', encoding='utf-8') as f:
    json.dump(magazines, f, ensure_ascii=False, indent=2)

print("magazines.json enriched successfully with full bilingual descriptions for all art/cover/ad pages!")
