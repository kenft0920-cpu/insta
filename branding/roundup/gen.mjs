// 「インド絶品グルメ5選」まとめカルーセル生成（全7枚・1080x1350）
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('branding/roundup/src', { recursive: true });

const P = '../../../photos/edited'; // src/ から見た写真フォルダ
const FONT = "'IPAGothic','Noto Sans CJK JP','DejaVu Sans',sans-serif";

// 共通スタイル
const base = `
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:1350px;overflow:hidden;font-family:${FONT}}
  .slide{position:relative;width:1080px;height:1350px;overflow:hidden;background:#2A1A12}
  .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 32%,rgba(0,0,0,0) 45%,rgba(0,0,0,.78) 100%)}
  .brandtag{position:absolute;top:40px;left:40px;background:#EE9A1E;color:#2A1A12;font-weight:800;
            font-size:34px;padding:12px 26px;border-radius:40px;letter-spacing:1px}
  .handle{position:absolute;bottom:38px;right:44px;color:#FBF1DD;font-size:30px;font-weight:700;opacity:.95;text-shadow:0 1px 6px rgba(0,0,0,.6)}
  .num{position:absolute;top:40px;left:40px;width:96px;height:96px;border-radius:50%;
       background:#EE9A1E;color:#2A1A12;font-size:60px;font-weight:800;display:flex;align-items:center;justify-content:center;
       box-shadow:0 4px 14px rgba(0,0,0,.35)}
  .cap{position:absolute;left:48px;right:48px;bottom:96px;color:#FBF1DD}
  .loc{display:inline-block;background:#C0392B;color:#fff;font-size:28px;font-weight:700;padding:7px 20px;border-radius:30px;margin-bottom:18px}
  .title{font-size:76px;font-weight:800;line-height:1.1;text-shadow:0 2px 10px rgba(0,0,0,.6)}
  .sub{font-size:38px;font-weight:600;margin-top:16px;line-height:1.35;text-shadow:0 2px 8px rgba(0,0,0,.6)}
`;

function slidePage(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}</style></head><body><div class="slide">${inner}</div></body></html>`;
}

// 表紙
const cover = slidePage(`
  <img class="bg" src="${P}/2026-09-21_lucknow_biryani_1_4x5.jpg">
  <div class="shade"></div>
  <div class="brandtag">🇮🇳 Masala Days</div>
  <div style="position:absolute;left:54px;right:54px;top:360px;color:#FBF1DD;text-align:left">
    <div style="display:inline-block;background:#C0392B;color:#fff;font-size:34px;font-weight:800;padding:10px 26px;border-radius:12px;letter-spacing:4px">保存版</div>
    <div style="font-size:120px;font-weight:800;line-height:1.05;margin-top:24px;text-shadow:0 3px 14px rgba(0,0,0,.7)">インド<br>絶品グルメ<br><span style="color:#F2C14E">5選</span></div>
    <div style="font-size:42px;font-weight:600;margin-top:28px;text-shadow:0 2px 8px rgba(0,0,0,.7)">現地で本当に旨かった店だけ🍛</div>
  </div>
  <div style="position:absolute;bottom:90px;left:54px;color:#FBF1DD;font-size:40px;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.7)">スワイプで見る →</div>
  <div class="handle">@masala.days</div>
`);

const items = [
  { n: '①', img: '2026-09-19_mysore_8_4x5.jpg', loc: 'マイソール', title: '南インドの定食', sub: '葉っぱがお皿。手で混ぜて食べる、本気の南インド' },
  { n: '②', img: '2026-09-21_lucknow_kebab_4x5.jpg', loc: 'ラクナウ / トゥンデー', title: 'ガロウティ・ケバブ', sub: '歯のない王様のために生まれた、とろけるケバブ' },
  { n: '③', img: '2026-09-21_lucknow_biryani_1_4x5.jpg', loc: 'ラクナウ / イドリース', title: 'マトンビリヤニ', sub: 'インド史上いちばん美味しかった一皿。臭みゼロ' },
  { n: '④', img: '2026-10-01_delhi_2_4x5.jpg', loc: 'デリー', title: 'タンドリーチキン', sub: '炭火の香ばしさ。出張の夜の定番' },
  { n: '⑤', img: '2026-10-02_pizza_1_4x5.jpg', loc: 'The Pizza Bakery', title: '窯焼きガーリックブレッド', sub: '生地に玉ねぎ＆チーズ。日本にも来てほしい' },
];

const itemPages = items.map((it) => slidePage(`
  <img class="bg" src="${P}/${it.img}">
  <div class="shade"></div>
  <div class="num">${it.n}</div>
  <div class="cap">
    <span class="loc">📍 ${it.loc}</span>
    <div class="title">${it.title}</div>
    <div class="sub">${it.sub}</div>
  </div>
  <div class="handle">@masala.days</div>
`));

// CTA（サフラン背景）
const cta = slidePage(`
  <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 35%,#F2B84B 0%,#EE9A1E 55%,#D97E12 100%)"></div>
  <div style="position:absolute;left:64px;right:64px;top:300px;text-align:center;color:#2A1A12">
    <div style="font-size:90px">🍛🧄🍗</div>
    <div style="font-size:72px;font-weight:800;line-height:1.2;margin-top:30px">保存して、<br>インド旅・駐在の<br>参考にどうぞ📌</div>
    <div style="font-size:40px;font-weight:600;margin-top:40px">他のインド情報も発信中！</div>
    <div style="display:inline-block;margin-top:26px;background:#2A1A12;color:#FBF1DD;font-size:46px;font-weight:800;padding:18px 40px;border-radius:50px">＠masala.days</div>
    <div style="font-size:36px;font-weight:700;margin-top:30px">フォローで続きも🇮🇳</div>
  </div>
`);

const pages = [['00_cover', cover], ...itemPages.map((p, i) => [`0${i + 1}_item`, p]), ['06_cta', cta]];
for (const [name, html] of pages) {
  writeFileSync(`branding/roundup/src/${name}.html`, html);
  console.log('wrote', name);
}
