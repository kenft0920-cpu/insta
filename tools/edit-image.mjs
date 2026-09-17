#!/usr/bin/env node
// Instagram向け画像編集ツール（Chromium + Canvas を使用、外部ライブラリ不要）
//
// 使い方:
//   node tools/edit-image.mjs <入力> <出力> [オプション]
// オプション:
//   --ratio=4:5      アスペクト比 (例 1:1, 4:5, 3:4)。省略時 4:5
//   --brightness=1.05  明るさ (1.0=変化なし)
//   --contrast=1.08    コントラスト
//   --saturate=1.1     彩度
//   --gravity=center   トリミング基準 (center|top|bottom|left|right)
//   --quality=92       JPEG品質 (1-100)
//
// 例:
//   node tools/edit-image.mjs photos/original/a.jpg photos/edited/a.jpg --ratio=4:5 --brightness=1.06

import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const [input, output] = args.filter((a) => !a.startsWith('--'));
if (!input || !output) {
  console.error('使い方: node tools/edit-image.mjs <入力> <出力> [--ratio=4:5 --brightness=1.05 ...]');
  process.exit(1);
}
const opt = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  })
);

const ratio = (opt.ratio || '4:5').split(':').map(Number);
const targetAR = ratio[0] / ratio[1];
const brightness = Number(opt.brightness ?? 1.0);
const contrast = Number(opt.contrast ?? 1.0);
const saturate = Number(opt.saturate ?? 1.0);
const gravity = opt.gravity || 'center';
const quality = Number(opt.quality ?? 92) / 100;

const buf = readFileSync(input);
const ext = path.extname(input).slice(1).toLowerCase();
const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
try {
  const page = await browser.newPage();
  const resultB64 = await page.evaluate(
    async ({ dataUrl, targetAR, brightness, contrast, saturate, gravity, quality }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = dataUrl;
      });
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const srcAR = iw / ih;

      // トリミング領域を算出（アスペクト比に合わせて中央/指定基準で切り抜く）
      let sw, sh;
      if (srcAR > targetAR) {
        sh = ih;
        sw = Math.round(ih * targetAR);
      } else {
        sw = iw;
        sh = Math.round(iw / targetAR);
      }
      let sx = Math.round((iw - sw) / 2);
      let sy = Math.round((ih - sh) / 2);
      if (gravity === 'top') sy = 0;
      if (gravity === 'bottom') sy = ih - sh;
      if (gravity === 'left') sx = 0;
      if (gravity === 'right') sx = iw - sw;

      // 出力解像度（長辺を最大1350pxに、インスタ推奨 1080x1350 相当）
      const maxLong = 1350;
      let ow, oh;
      if (sw >= sh) {
        ow = Math.min(sw, Math.round(maxLong * targetAR));
        oh = Math.round(ow / targetAR);
      } else {
        oh = Math.min(sh, maxLong);
        ow = Math.round(oh * targetAR);
      }

      const canvas = document.createElement('canvas');
      canvas.width = ow;
      canvas.height = oh;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);

      const out = canvas.toDataURL('image/jpeg', quality);
      return { b64: out.split(',')[1], ow, oh };
    },
    { dataUrl, targetAR, brightness, contrast, saturate, gravity, quality }
  );

  writeFileSync(output, Buffer.from(resultB64.b64, 'base64'));
  console.log(`✓ 出力: ${output} (${resultB64.ow}x${resultB64.oh}, ${(Buffer.from(resultB64.b64, 'base64').length / 1024).toFixed(0)}KB)`);
} finally {
  await browser.close();
}
