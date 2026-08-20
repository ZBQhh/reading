#!/usr/bin/env node
/**
 * scripts/curate_article.js — Daily Article Curation & Scaffolding Tool
 *
 * Usage:
 *   node scripts/curate_article.js --website TheAtlantic --url https://...
 *   node scripts/curate_article.js --website Wired --url https://...
 *   node scripts/curate_article.js --website TheEconomist --url https://...
 *   node scripts/curate_article.js --website NewYorker --url https://...
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Resolve playwright-core from repo node_modules
const { chromium } = require(path.join(__dirname, '..', 'node_modules', 'playwright-core'));

function printUsage() {
  console.log(`
========================================================================
 🏛️ BilingualReader Article Curation CLI
========================================================================
Usage:
  node scripts/curate_article.js --website <Website> --url <ArticleURL> [options]

Arguments:
  --website, -w   Website/Publisher (TheAtlantic | NewYorker | Wired | TheEconomist | FT | Bloomberg)
  --url, -u       Target article URL to fetch and parse
  --date, -d      Article publish date (YYYY-MM-DD, defaults to today)
  --month, -m     Archive month folder (YYYY-MM, defaults to current month)
  --edge-path     Path to Edge/Chrome binary (defaults to system Edge)

Examples:
  node scripts/curate_article.js -w TheAtlantic -u https://www.theatlantic.com/ideas/archive/...
  node scripts/curate_article.js -w TheEconomist -u https://www.economist.com/leaders/...
  node scripts/curate_article.js -w Wired -u https://www.wired.com/story/...
========================================================================
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    website: '',
    url: '',
    date: new Date().toISOString().slice(0, 10),
    month: new Date().toISOString().slice(0, 7),
    edgePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--website' || a === '-w') params.website = args[++i];
    else if (a === '--url' || a === '-u') params.url = args[++i];
    else if (a === '--date' || a === '-d') params.date = args[++i];
    else if (a === '--month' || a === '-m') params.month = args[++i];
    else if (a === '--edge-path') params.edgePath = args[++i];
    else if (a === '--help' || a === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  if (!params.website || !params.url) {
    printUsage();
    console.error('❌ Error: --website and --url are required parameters.');
    process.exit(1);
  }

  return params;
}

function sanitizeFilename(name) {
  return name
    .replace(/[\\/*?:"<>|]/g, '')
    .replace(/[\s_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'article';
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function downloadImage(imgUrl, destPath) {
  return new Promise((resolve) => {
    if (!imgUrl || !imgUrl.startsWith('http')) return resolve(null);
    const mod = imgUrl.startsWith('https') ? https : http;
    const req = mod.get(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(destPath);
        });
      } else {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function run() {
  const params = parseArgs();
  console.log(`\n🚀 [Curator] Fetching article from ${params.website}:`);
  console.log(`   URL: ${params.url}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: params.edgePath
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0'
  });

  const page = await context.newPage();

  try {
    await page.goto(params.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);

    const articleData = await page.evaluate(() => {
      let title = document.querySelector('meta[property="og:title"]')?.content ||
                  document.querySelector('meta[name="twitter:title"]')?.content ||
                  document.title || '';
      title = title.replace(/\s*\|\s*(The Atlantic|The New Yorker|WIRED|The Economist|Financial Times|Bloomberg).*$/i, '').trim();

      let author = document.querySelector('meta[name="author"]')?.content ||
                   document.querySelector('meta[property="article:author"]')?.content ||
                   document.querySelector('[class*="byline"], [class*="author"]')?.innerText ||
                   'Unknown';
      author = author.replace(/^By\s+/i, '').trim();

      let heroImg = document.querySelector('meta[property="og:image"]')?.content ||
                    document.querySelector('meta[name="twitter:image"]')?.content || '';

      let heroCap = document.querySelector('figcaption')?.innerText || '';

      const articleEl = document.querySelector('article') || document.querySelector('main') || document.body;
      const pEls = Array.from(articleEl.querySelectorAll('p'));
      const paragraphs = pEls
        .map(p => p.innerText.trim())
        .filter(t => t.length > 25 &&
          !t.toLowerCase().includes('all rights reserved') &&
          !t.toLowerCase().includes('newsletter') &&
          !t.toLowerCase().includes('subscriber-only') &&
          !t.toLowerCase().includes('listen to this story') &&
          !t.toLowerCase().includes('photo-illustration') &&
          !t.toLowerCase().includes('photograph:'));

      return { title, author, heroImg, heroCap, paragraphs };
    });

    if (!articleData.paragraphs || articleData.paragraphs.length === 0) {
      throw new Error('No valid body paragraphs extracted from page.');
    }

    const safeTitle = sanitizeFilename(articleData.title);
    const folderBase = `${params.date}_${safeTitle}`;
    const slug = slugify(`${params.date}-${articleData.title}`);

    const baseRoot = path.join(__dirname, '..', 'manual_source');
    const targetMonthDir = path.join(baseRoot, params.website, params.month);
    const targetAssetsDir = path.join(targetMonthDir, 'assets', folderBase);

    fs.mkdirSync(targetAssetsDir, { recursive: true });

    let heroMd = '';
    if (articleData.heroImg) {
      const hash = crypto.createHash('md5').update(articleData.heroImg).digest('hex').slice(0, 12);
      const imgFile = `${hash}.jpg`;
      const imgDest = path.join(targetAssetsDir, imgFile);
      await downloadImage(articleData.heroImg, imgDest);
      const relMdSrc = `./assets/${folderBase}/${imgFile}`;
      const capMd = articleData.heroCap ? `\n*${articleData.heroCap}*\n` : '';
      heroMd = `\n![${articleData.title}](${relMdSrc})\n${capMd}\n`;
    }

    const bodyText = articleData.paragraphs.join('\n\n');
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const fullMd = `---
title: "${articleData.title.replace(/"/g, '\\"')}"
author: "${articleData.author.replace(/"/g, '\\"')}"
date: "${params.date}"
website: "${params.website}"
month: "${params.month}"
source: "${params.url}"
saved_at: "${nowStr}"
---

# ${articleData.title}

> **作者**: ${articleData.author} | **发布日期**: ${params.date} | **来源**: [${params.website}](${params.url})

${heroMd}
---

${bodyText}
`;

    const mdFileName = `${params.date}_${safeTitle}.md`;
    const mdFilePath = path.join(targetMonthDir, mdFileName);
    fs.writeFileSync(mdFilePath, fullMd, 'utf8');

    console.log(`\n✅ [1/2] Markdown saved: ${path.relative(path.join(__dirname, '..'), mdFilePath)}`);
    console.log(`   - Title: ${articleData.title}`);
    console.log(`   - Author: ${articleData.author}`);
    console.log(`   - Paragraphs: ${articleData.paragraphs.length}`);

    const trDir = path.join(__dirname, '..', 'manual_translations');
    fs.mkdirSync(trDir, { recursive: true });
    const trPath = path.join(trDir, `${slug}.zh.json`);

    if (!fs.existsSync(trPath)) {
      const skeleton = {
        paragraphs: articleData.paragraphs.map((_, idx) => `[待翻译段落 ${idx + 1}]`),
        captions: articleData.heroImg ? [articleData.heroCap || '图注翻译'] : [],
        notes: {
          "0": "💡【时代背景】在此填写本段涉及的时代历史背景、文化典故或修辞双关解释..."
        }
      };
      fs.writeFileSync(trPath, JSON.stringify(skeleton, null, 2), 'utf8');
      console.log(`✅ [2/2] Translation sidecar created: ${path.relative(path.join(__dirname, '..'), trPath)}`);
    } else {
      console.log(`ℹ️ [2/2] Existing translation sidecar preserved: ${path.relative(path.join(__dirname, '..'), trPath)}`);
    }

    console.log(`\n🎉 Curation completed successfully for "${articleData.title}"!`);
  } catch (err) {
    console.error(`❌ Curation failed:`, err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
