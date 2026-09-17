# インスタ自動投稿 セットアップ手順（Masala Days）

Instagram Graph API ＋ GitHub Actions で「予約時刻に自動投稿」する仕組み。
コード側（スクリプト・ワークフロー）は用意済み。あなたの作業は主に **A〜D の初期設定**（1回だけ）です。

---

## 全体像

```
posts/queue.json（写真＋キャプション＋予約時刻）
        │
        ▼
GitHub Actions（毎時実行）
        │  時刻が来た投稿を拾う
        ▼
tools/post-to-instagram.mjs
        │  Instagram Graph API を呼ぶ
        ▼
インスタに自動投稿 ✅
```

---

## A. アカウントをプロ化＆Facebookページ連携（アプリ操作）

1. インスタアプリ → 設定 → アカウント → **プロアカウントに切り替え**（クリエイター推奨）
2. Facebookで**ページを新規作成**（名前は「Masala Days」でOK・無料）
3. インスタの設定でその**Facebookページと連携**

## B. Meta開発者アプリを作成（PC推奨）

1. https://developers.facebook.com/ にログイン → **マイアプリ → アプリを作成**
2. タイプは「**ビジネス**」を選択
3. アプリに **Instagram Graph API** 製品を追加

## C. アクセストークンとIDを取得

1. **グラフAPIエクスプローラ**（Tools → Graph API Explorer）を開く
2. 権限（アクセス許可）に以下を付与してトークン生成:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
3. **IG_USER_ID の取得**（インスタのビジネスアカウントID）:
   - `GET me/accounts` → 対象ページの `id` を確認
   - `GET {page-id}?fields=instagram_business_account` → 返る `id` が **IG_USER_ID**
4. **長期トークンに変換**（短期は数時間で切れるため）:
   - 「アクセストークンツール」で長期化、または
     `GET oauth/access_token?grant_type=fb_exchange_token&...` で60日トークンを取得
   - ※長期トークンでも約60日で期限切れ → 定期的な更新が必要（下の運用メモ参照）

> メモ: 初期はアプリが「開発モード」でも、自分のアカウントには投稿可能。
> 継続運用するなら後で「本番モード」＋ビジネス認証をしておくと安定します。

## D. GitHubに秘密情報を登録

リポジトリ → **Settings → Secrets and variables → Actions → New repository secret** で2つ登録:

| Secret名 | 値 |
|---|---|
| `IG_USER_ID` | Cで取得したビジネスアカウントID（数字） |
| `IG_ACCESS_TOKEN` | Cで取得した長期トークン |

> 🔐 トークンは絶対にコードに直書きしない（必ず Secrets に入れる）。

---

## 画像の公開URLについて（重要）

Graph API は**画像を公開URLから取得**します。本ワークフローは
`https://raw.githubusercontent.com/<repo>/<commit>/<画像パス>` を使うため、
**このリポジトリが「公開(public)」である必要があります**。

- 写真はどのみちインスタで公開されるので、リポジトリ公開でも実害は小さい
- 非公開のままにしたい場合の代替:
  - GitHub Pages で画像だけ公開する
  - 画像ホスティング(例: Cloudinary)にアップして `IMAGE_BASE_URL` を差し替える
  - → 必要なら対応するので声をかけてください

---

## 使い方（投稿の流れ）

1. 写真を編集（`tools/edit-image.mjs`）してリポジトリに追加
2. キャプションを `posts/captions/<id>.txt` に用意
3. `posts/queue.json` に投稿を追加し、**status を `scheduled`**、`publish_at` に予約時刻（ISO8601, +05:30=IST）を設定
4. コミット＆プッシュ
5. 予約時刻を過ぎると、GitHub Actions（毎時）が自動投稿し、status を `posted` に更新

### queue.json の例
```json
{
  "posts": [
    {
      "id": "2026-09-17_temple",
      "image": "photos/edited/2026-09-17_temple_4x5.jpg",
      "caption_file": "posts/captions/2026-09-17_temple.txt",
      "publish_at": "2026-09-20T19:00:00+05:30",
      "status": "scheduled"
    }
  ]
}
```

- `status`: `draft`(投稿しない) / `scheduled`(予約) / `posted`(投稿済) / `error`(失敗)

### 手動テスト
- GitHubの **Actions → Instagram Auto-post → Run workflow** で `dry_run=true` にすると、
  投稿せずに「何が投稿対象か」だけ確認できます。

---

## 運用メモ / 注意

- **API制限**: 24時間で最大25投稿
- **スケジュール実行はデフォルトブランチ(main)にワークフローがある場合のみ動作** → このブランチをmainにマージして有効化
- **トークン期限**: 長期トークンも約60日で失効。切れたら再取得して `IG_ACCESS_TOKEN` を更新
- **cronの粒度**: 既定は毎時。より細かくしたい場合は `.github/workflows/instagram-autopost.yml` の cron を調整
- 画像は正方形/縦長(4:5)推奨。動画(リール)投稿は別対応が必要（必要なら拡張します）
