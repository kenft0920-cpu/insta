#!/usr/bin/env node
/*
 * Instagram 自動投稿スクリプト（Instagram Graph API / Content Publishing API）
 * 外部ライブラリ不要（Node 18+ の組み込み fetch を使用）。
 *
 * 必要な環境変数:
 *   IG_USER_ID       … Instagram ビジネスアカウントの ID（数字）
 *   IG_ACCESS_TOKEN  … 長期アクセストークン
 *   IMAGE_BASE_URL   … 画像の公開URLのベース
 *                      例: https://raw.githubusercontent.com/kenft0920-cpu/insta/main
 *                      （queue の image パスをこの後ろに連結して image_url にする）
 * 任意:
 *   DRY_RUN=1        … 実際には投稿せず、何をするかだけ表示（テスト用）
 *   MAX_POSTS=1      … 1回の実行で投稿する最大件数（既定 1）
 *   QUEUE_FILE       … キューのパス（既定 posts/queue.json）
 *   GRAPH_VERSION    … Graph API バージョン（既定 v21.0）
 *
 * 使い方:
 *   DRY_RUN=1 node tools/post-to-instagram.mjs      # 動作確認
 *   node tools/post-to-instagram.mjs                # 本番投稿
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const {
  IG_USER_ID: IG_USER_ID_RAW,
  IG_ACCESS_TOKEN: IG_ACCESS_TOKEN_RAW,
  IMAGE_BASE_URL,
  DRY_RUN,
  MAX_POSTS = '1',
  QUEUE_FILE = 'posts/queue.json',
  GRAPH_VERSION = 'v21.0',
  // 接続先ホスト:
  //  - Facebookログイン方式（ページ経由・Graph APIエクスプローラでトークン取得）: https://graph.facebook.com
  //  - Instagramログイン方式: https://graph.instagram.com
  GRAPH_BASE = 'https://graph.facebook.com',
} = process.env;

// Secretに紛れ込みがちな前後の空白・改行を除去（本番投稿の失敗防止）
const IG_USER_ID = (IG_USER_ID_RAW || '').trim();
const IG_ACCESS_TOKEN = (IG_ACCESS_TOKEN_RAW || '').trim();

const dryRun = DRY_RUN === '1' || DRY_RUN === 'true';
const verify = process.env.VERIFY === '1' || process.env.VERIFY === 'true';
const maxPosts = Number(MAX_POSTS) || 1;
const API = `${GRAPH_BASE.replace(/\/$/, '')}/${GRAPH_VERSION}`;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!dryRun) {
  if (!IG_USER_ID) fail('環境変数 IG_USER_ID が未設定です');
  if (!IG_ACCESS_TOKEN) fail('環境変数 IG_ACCESS_TOKEN が未設定です');
}
if (!IMAGE_BASE_URL) fail('環境変数 IMAGE_BASE_URL が未設定です（画像の公開URLベース）');

const queuePath = path.resolve(QUEUE_FILE);
const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
const now = Date.now();

function imageUrlForEarly(p) {
  const base = IMAGE_BASE_URL.replace(/\/$/, '');
  return `${base}/${p.image.replace(/^\//, '')}`;
}

// ── 接続確認モード（投稿しない）: トークン・IG接続・画像URLをチェック ──
if (verify) {
  console.log('=== 接続確認モード（投稿は行いません）===\n');
  let ok = true;

  // 1) 設定された IG_USER_ID でトークン & IGアカウント疎通
  try {
    const url = `${API}/${IG_USER_ID}?fields=id,username&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(`${res.status} ${JSON.stringify(json.error || json)}`);
    console.log(`✓ トークン有効・IG接続OK  →  @${json.username} (id=${json.id})`);
  } catch (e) {
    ok = false;
    console.error(`✗ 設定された IG_USER_ID での接続に失敗: ${e.message}`);
  }

  // 1b) トークンから「正しいIG_USER_ID」を自動発見して照合（診断用）
  try {
    const url = `${API}/me/accounts?fields=name,instagram_business_account{id,username}&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(`${res.status} ${JSON.stringify(json.error || json)}`);
    const igs = (json.data || []).map((p) => p.instagram_business_account).filter(Boolean);
    if (igs.length === 0) {
      console.log('  ⚠️ トークンから辿れるInstagramビジネスアカウントが見つかりません（連携/権限を確認）');
    } else {
      for (const ig of igs) {
        const match = String(ig.id) === String(IG_USER_ID || '');
        console.log(`  診断: 正しいIG_USER_ID = ${ig.id}（@${ig.username}） ／ 現在の設定値と一致: ${match ? '✅ はい' : '❌ いいえ（これを登録し直してください）'}`);
      }
    }
  } catch (e) {
    console.log(`  （自動発見の実行に失敗: ${e.message}）`);
  }

  // 2) 画像URLが公開でアクセス可能か（キューの先頭の画像で確認）
  const sample = (queue.posts || [])[0];
  if (sample) {
    const imgUrl = imageUrlForEarly(sample);
    try {
      const res = await fetch(imgUrl);
      const type = res.headers.get('content-type') || '';
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!type.startsWith('image/')) throw new Error(`画像ではありません (content-type=${type})`);
      console.log(`✓ 画像URL 公開アクセスOK  →  ${imgUrl} (${type})`);
    } catch (e) {
      ok = false;
      console.error(`✗ 画像URLにアクセスできません: ${imgUrl}\n   ${e.message}`);
    }
  } else {
    console.log('（キューに投稿が無いため画像チェックはスキップ）');
  }

  console.log(`\n=== 結果: ${ok ? '✅ すべてOK（本番投稿できる状態です）' : '❌ 問題あり（上のエラーを確認）'} ===`);
  process.exit(ok ? 0 : 1);
}

// 投稿対象: status === 'scheduled' かつ publish_at <= now
const due = (queue.posts || [])
  .filter((p) => p.status === 'scheduled' && new Date(p.publish_at).getTime() <= now)
  .sort((a, b) => new Date(a.publish_at) - new Date(b.publish_at))
  .slice(0, maxPosts);

if (due.length === 0) {
  console.log('投稿対象なし（scheduled かつ時刻到来のものがありません）。');
  process.exit(0);
}

async function graphPost(url, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: 'POST', body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(`Graph API エラー: ${res.status} ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

function imageUrlFor(p) {
  const base = IMAGE_BASE_URL.replace(/\/$/, '');
  return `${base}/${p.image.replace(/^\//, '')}`;
}

let posted = 0;
for (const p of due) {
  const caption = p.caption_file
    ? readFileSync(path.resolve(p.caption_file), 'utf8').trim()
    : (p.caption || '');
  const image_url = imageUrlFor(p);

  console.log(`\n── ${p.id} ──`);
  console.log(`  image_url: ${image_url}`);
  console.log(`  caption : ${caption.split('\n')[0]} …(${caption.length}文字)`);

  if (dryRun) {
    console.log('  [DRY_RUN] 実際の投稿はスキップしました。');
    continue;
  }

  try {
    // 1) メディアコンテナ作成
    const container = await graphPost(`${API}/${IG_USER_ID}/media`, {
      image_url,
      caption,
      access_token: IG_ACCESS_TOKEN,
    });
    console.log(`  container: ${container.id}`);

    // 2) 公開
    const published = await graphPost(`${API}/${IG_USER_ID}/media_publish`, {
      creation_id: container.id,
      access_token: IG_ACCESS_TOKEN,
    });
    console.log(`  ✓ 投稿完了 media_id=${published.id}`);

    p.status = 'posted';
    p.posted_at = new Date().toISOString();
    p.media_id = published.id;
    posted++;
  } catch (e) {
    console.error(`  ✗ 失敗: ${e.message}`);
    p.status = 'error';
    p.error = e.message;
  }
}

// キューを書き戻す（status 更新を保存）
if (!dryRun) {
  writeFileSync(queuePath, JSON.stringify(queue, null, 2) + '\n');
  console.log(`\nキュー更新: ${QUEUE_FILE}（投稿 ${posted} 件）`);
}
