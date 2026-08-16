// ==============================================================================
// scripts/build-dist.js — BilingualReader 生产部署包构建器 (Cloudflare / GitHub Pages)
// ==============================================================================
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

console.log("🔨 [1/3] Bundling JavaScript with esbuild...");
try {
  execSync("npx -y esbuild src/main.js --bundle --format=iife --target=es2018 --charset=utf8 --outfile=assets/js/reader_app.js", {
    cwd: root,
    stdio: "inherit"
  });
} catch (e) {
  console.error("esbuild bundle failed:", e.message);
  process.exit(1);
}

console.log("📁 [2/3] Preparing clean dist/ directory...");
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((child) => {
      if (child.endsWith(".png") && child.includes("scans")) return;
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("📄 [3/3] Copying production static assets to dist/...");
// 1. 核心 HTML / PWA / 资源
const rootFiles = ["index.html", "reader.html", "icon.svg", "manifest.webmanifest", "sw.js", ".nojekyll"];
rootFiles.forEach((file) => {
  const p = path.join(root, file);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(dist, file));
  }
});

// 2. 核心静态目录
const staticDirs = ["assets", "issues", "manual_assets"];
staticDirs.forEach((dir) => {
  const srcDir = path.join(root, dir);
  const destDir = path.join(dist, dir);
  if (fs.existsSync(srcDir)) {
    copyRecursive(srcDir, destDir);
  }
});

console.log("✅ Production build complete! Output directory: dist/");
