#!/usr/bin/env node
// 縦型リール(1080x1920)を生成する。
//   1) 各シーンを Chromium で 1080x1920 PNG に合成（写真＋テロップ）
//   2) ffmpeg で 緩やかズーム(Ken Burns) + クロスフェード 連結 → MP4(無音)
// 使い方: node tools/make-reel.mjs <config.json> <出力.mp4>
// 音源はアプリ内でトレンド曲を乗せる前提（無音ベース）。
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const [cfgPath, outPath] = process.argv.slice(2);
if (!cfgPath || !outPath) { console.error('usage: make-reel.mjs <config.json> <out.mp4>'); process.exit(1); }
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const W = 1080, H = 1920, FPS = 30;
const DUR = cfg.sceneSec ?? 2.6;      // 1シーンの長さ(秒)
const XF = cfg.xfadeSec ?? 0.5;       // クロスフェード(秒)
const tmp = cfg.tmpDir || '/tmp/reel_build';
mkdirSync(tmp, { recursive: true });

const FONT = "'IPAGothic','Noto Sans CJK JP','DejaVu Sans',sans-serif";
const ACCENT = '#EE9A1E', CREAM = '#FBF1DD';

function esc(s = '') { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function dataURL(file) {
  const ext = (path.extname(file).slice(1) || 'jpeg').toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,` + readFileSync(file).toString('base64');
}

function sceneHTML(sc) {
  const img = dataURL(path.resolve(sc.image));
  const pos = sc.center
    ? `top:0;bottom:0;left:60px;right:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center`
    : `left:60px;right:60px;bottom:220px;text-align:left`;
  const tag = sc.tag ? `<div style="display:inline-block;background:${ACCENT};color:#2A1A12;font-weight:800;font-size:40px;padding:10px 26px;border-radius:40px;margin-bottom:26px;letter-spacing:1px">${esc(sc.tag)}</div>` : '';
  const title = sc.title ? `<div style="font-size:${sc.center ? 92 : 78}px;font-weight:800;line-height:1.18;color:#fff;text-shadow:0 3px 18px rgba(0,0,0,.75)">${esc(sc.title).replace(/\n/g, '<br>')}</div>` : '';
  const sub = sc.sub ? `<div style="font-size:44px;font-weight:600;line-height:1.4;color:${CREAM};margin-top:22px;text-shadow:0 2px 12px rgba(0,0,0,.8)">${esc(sc.sub).replace(/\n/g, '<br>')}</div>` : '';
  const handle = sc.handle ? `<div style="position:absolute;bottom:70px;left:0;right:0;text-align:center;color:#fff;font-size:40px;font-weight:700;opacity:.95;text-shadow:0 2px 10px rgba(0,0,0,.7)">@masala.days.jp</div>` : '';
  // 下（とセンター時は上下）に暗幕、文字の視認性確保
  const shade = sc.center
    ? `background:radial-gradient(ellipse at center, rgba(0,0,0,.25) 0%, rgba(0,0,0,.55) 100%)`
    : `background:linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 48%, rgba(0,0,0,.82) 100%)`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:${FONT};background:#000}
    .wrap{position:relative;width:${W}px;height:${H}px;overflow:hidden}
    .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .shade{position:absolute;inset:0;${shade}}
    .txt{position:absolute;${pos}}
  </style></head><body><div class="wrap">
    <img class="bg" src="${img}">
    <div class="shade"></div>
    <div class="txt">${tag}${title}${sub}</div>
    ${handle}
  </div></body></html>`;
}

const frames = [];
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (let i = 0; i < cfg.scenes.length; i++) {
  const f = `${tmp}/scene_${String(i).padStart(2, '0')}.png`;
  await page.setContent(sceneHTML(cfg.scenes[i]), { waitUntil: 'load' });
  await page.waitForTimeout(120);
  await page.screenshot({ path: f, clip: { x: 0, y: 0, width: W, height: H } });
  frames.push(f);
  console.log('scene', i, '→', path.basename(f));
}
await browser.close();

// --- ffmpeg: 各PNGに緩やかズーム → xfadeで連結 ---
const N = frames.length;
const dFrames = Math.round(DUR * FPS);
// PNGは1フレーム入力。zoompanが d=dFrames 枚を生成する（-loopすると入力が無限フレームになりzoompanが暴走するので付けない）
const inputs = [];
frames.forEach((f) => { inputs.push('-i', f); });

// 各入力に zoompan（ゆっくり拡大）
const zoom = (idx) =>
  `[${idx}:v]scale=${W}:${H},zoompan=z='min(zoom+0.0006,1.10)':d=${dFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p[v${idx}]`;
const parts = frames.map((_, i) => zoom(i));

// xfade 連鎖
let last = 'v0';
let offset = DUR - XF;
for (let i = 1; i < N; i++) {
  const out = i === N - 1 ? 'vout' : `x${i}`;
  parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${XF}:offset=${offset.toFixed(3)}[${out}]`);
  last = out;
  offset += DUR - XF;
}
const filter = parts.join(';');

const args = [...inputs, '-filter_complex', filter, '-map', '[vout]',
  '-r', String(FPS), '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-y', outPath];
console.log('ffmpeg encoding…', N, 'scenes');
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
const total = (N * DUR - (N - 1) * XF).toFixed(1);
console.log(`✓ ${outPath}  (${total}s, ${W}x${H}, 無音)`);
