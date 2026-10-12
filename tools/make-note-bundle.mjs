#!/usr/bin/env node
// note下書き(.md)を「アップ用バンドル」に変換する。
//   - title.txt   … タイトル（1行）
//   - body.txt    … 本文（noteにそのまま貼り付け）
//   - 01.jpg,02..  … 添付写真を順番どおりにコピー（元の拡張子を保持）
//   - README.txt  … 手順メモ
// 使い方:
//   node tools/make-note-bundle.mjs all                 # 全下書きをバンドル化
//   node tools/make-note-bundle.mjs posts/note/xxx.md   # 1件だけ
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const arg = process.argv[2] || 'all';
const files = arg === 'all'
  ? readdirSync('posts/note').filter((f) => f.endsWith('.md')).map((f) => `posts/note/${f}`)
  : [arg];

function parseNote(md) {
  const text = readFileSync(md, 'utf8');
  // 見出しで分割
  const titleM = text.match(/#\s*タイトル案\s*\n+([^\n]+)/);
  const bodyM = text.match(/#\s*本文[^\n]*\n+([\s\S]*?)\n#\s*添付する写真/);
  const title = titleM ? titleM[1].trim() : '';
  const body = bodyM ? bodyM[1].trim() : '';
  // 画像行: "1. path （desc）"
  const imgs = [];
  const re = /^\s*\d+\.\s*(\S+)/gm;
  let m;
  const tail = text.slice(text.indexOf('添付する写真'));
  while ((m = re.exec(tail))) imgs.push(m[1]);
  return { title, body, imgs };
}

for (const md of files) {
  const id = path.basename(md, '.md');
  const { title, body, imgs } = parseNote(md);
  const outDir = `note_bundles/${id}`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/title.txt`, title + '\n');
  writeFileSync(`${outDir}/body.txt`, body + '\n');
  imgs.forEach((src, i) => {
    const ext = path.extname(src) || '.jpg';
    const dst = `${outDir}/${String(i + 1).padStart(2, '0')}${ext}`;
    try { copyFileSync(src, dst); } catch (e) { console.error(`  ⚠ 画像コピー失敗: ${src}`); }
  });
  writeFileSync(`${outDir}/README.txt`,
    `noteアップ手順\n1) noteで「記事を書く」\n2) title.txt の文をタイトルに貼る\n3) body.txt の文を本文に貼る\n4) 01→02→... の順に画像をアップロード\n5) 内容を確認して「公開」\n`);
  console.log(`✓ ${id}  （本文${body.length}字 / 画像${imgs.length}枚）`);
}
