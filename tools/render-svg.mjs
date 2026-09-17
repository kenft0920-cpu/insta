#!/usr/bin/env node
// HTML/SVGファイルを 1080x1080 PNG に書き出す（Chromium利用、外部ライブラリ不要）
// 使い方: node tools/render-svg.mjs <入力.html> <出力.png> [size]
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [input, output, sizeArg] = process.argv.slice(2);
if (!input || !output) {
  console.error('使い方: node tools/render-svg.mjs <入力.html> <出力.png> [size|WxH|full]');
  process.exit(1);
}
// size 指定: "1080"(正方形) / "1080x1350"(矩形) / "full"(ページ全体)
let mode = 'square', width = 1080, height = 1080;
if (sizeArg === 'full') mode = 'full';
else if (sizeArg && sizeArg.includes('x')) {
  const [w, h] = sizeArg.split('x').map(Number);
  width = w; height = h; mode = 'rect';
} else if (sizeArg) { width = height = Number(sizeArg); }

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.resolve(input)).href, { waitUntil: 'networkidle' });
  if (mode === 'full') {
    await page.screenshot({ path: output, fullPage: true });
  } else {
    await page.screenshot({ path: output, clip: { x: 0, y: 0, width, height } });
  }
  console.log(`✓ ${output} (${mode})`);
} finally {
  await browser.close();
}
