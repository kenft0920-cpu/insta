// ③スパイス皿ロゴの背景/スタイル違いを生成するテンプレート
import { writeFileSync } from 'node:fs';

// 中央に配置する「スパイス皿」イラスト（蒸気・4色マウンド・具材）
// cx=540 を中心、bowlTop あたりに皿。textColor で文字色を変える。
function bowl({ bg, bowlColor, bowlRim, textMain, textSub, frame, ringText }) {
  const steam = `
    <g stroke="${textSub}" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.55">
      <path d="M460 300 q-24 -34 0 -68 q24 -34 0 -68"/>
      <path d="M540 285 q-24 -34 0 -68 q24 -34 0 -68"/>
      <path d="M620 300 q-24 -34 0 -68 q24 -34 0 -68"/>
    </g>`;
  const frameSvg = frame
    ? `<circle cx="540" cy="540" r="500" fill="none" stroke="${textMain}" stroke-width="12"/>
       <circle cx="540" cy="540" r="470" fill="none" stroke="${textMain}" stroke-width="4" stroke-dasharray="3 16"/>`
    : '';
  const ring = ringText
    ? `<defs>
         <path id="rt" d="M 540 540 m -410,0 a 410,410 0 1,1 820,0 a 410,410 0 1,1 -820,0"/>
       </defs>
       <text font-size="52" font-weight="800" fill="${textMain}" letter-spacing="10">
         <textPath href="#rt" startOffset="25%" text-anchor="middle">MASALA DAYS</textPath>
       </text>
       <text font-size="40" font-weight="700" fill="${textMain}" letter-spacing="8">
         <textPath href="#rt" startOffset="75%" text-anchor="middle">LIFE IN INDIA</textPath>
       </text>`
    : '';
  // ringあり時は文字を中央下に置かず、皿を少し上へ
  const wordmark = ringText
    ? ''
    : `<text x="540" y="810" text-anchor="middle" font-size="120" font-weight="800" fill="${textMain}" letter-spacing="1">Masala</text>
       <text x="540" y="895" text-anchor="middle" font-size="56" font-weight="700" fill="${textSub}" letter-spacing="24">DAYS</text>`;
  const cy = ringText ? 540 : 470; // 皿の口の高さ
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}text{font-family:'DejaVu Sans','Liberation Sans',sans-serif}</style></head><body>
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1080" fill="${bg}"/>
  ${frameSvg}
  <g transform="translate(0 ${cy - 470})">
    ${steam}
    <!-- 4色スパイスマウンド -->
    <path d="M300 470 q70 -140 150 0 z" fill="#F2A81D"/>
    <path d="M420 470 q55 -170 120 0 z" fill="#D23B2E"/>
    <path d="M520 470 q55 -175 120 0 z" fill="#4C7A34"/>
    <path d="M630 470 q70 -140 150 0 z" fill="#8E44AD"/>
    <!-- specks -->
    <circle cx="360" cy="435" r="6" fill="#8a5e08"/>
    <circle cx="480" cy="410" r="6" fill="#7A1F1A"/>
    <circle cx="580" cy="405" r="6" fill="#2F5220"/>
    <circle cx="700" cy="438" r="6" fill="#4a2170"/>
    <!-- bowl body -->
    <path d="M250 470 h580 a290 290 0 0 1 -580 0 z" fill="${bowlColor}"/>
    <!-- rim -->
    <rect x="232" y="452" width="616" height="34" rx="17" fill="${bowlRim}"/>
  </g>
  ${wordmark}
  ${ring}
</svg></body></html>`;
}

const variants = {
  'v3a-cream': bowl({ bg: '#FBF1DD', bowlColor: '#7A1F1A', bowlRim: '#8E2A22', textMain: '#7A1F1A', textSub: '#E8622C', frame: false, ringText: false }),
  'v3b-teal':  bowl({ bg: '#14524E', bowlColor: '#C0392B', bowlRim: '#7A1F1A', textMain: '#F6E7C6', textSub: '#F2A81D', frame: false, ringText: false }),
  'v3c-saffron': bowl({ bg: '#EE9A1E', bowlColor: '#7A1F1A', bowlRim: '#5A1512', textMain: '#FBF1DD', textSub: '#FBF1DD', frame: false, ringText: false }),
  'v3d-badge': bowl({ bg: '#FBF1DD', bowlColor: '#7A1F1A', bowlRim: '#8E2A22', textMain: '#7A1F1A', textSub: '#E8622C', frame: true, ringText: true }),
};

for (const [name, html] of Object.entries(variants)) {
  writeFileSync(`branding/src/${name}.html`, html);
  console.log('wrote', name);
}
