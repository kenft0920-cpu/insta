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
3. アプリに Instagram連携を追加（ユースケース例：**「Instagramでメッセージとコンテンツを管理」**）

> 📌 接続方式は2種類あります。本手順は **Instagramログイン方式（graph.instagram.com）** を前提にしています
> （新しく・簡単。スクリプト/ワークフローの既定もこちら＝`GRAPH_BASE=https://graph.instagram.com`）。
> 従来のFacebookログイン方式を使う場合は `GRAPH_BASE=https://graph.facebook.com` に変更してください。

## C. アクセストークンとIDを取得（Instagramログイン方式）

1. アプリのダッシュボードで **ユースケース**（例「Instagramでメッセージとコンテンツを管理」）を開く
2. **「Instagramアカウントを追加/ビジネスログイン設定」** で **@masala.days を接続**
   - 権限に **`instagram_business_basic`** と **`instagram_business_content_publish`** が含まれることを確認
3. **「アクセストークンを生成」** でトークンを発行 → これが **IG_ACCESS_TOKEN**
4. **IG_USER_ID** は同じ画面（接続済みアカウント欄）に表示される **InstagramユーザーID（数字）**
   - もしくは `GET https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=...` で確認
5. トークンの寿命:
   - ここで出るのは短期トークンのことがある → **長期トークン（約60日）** に変換して使う
   - 変換: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=<APIシークレット>&access_token=<短期トークン>`
   - ※約60日で失効 → 期限前に更新（`grant_type=ig_refresh_token` で延長可）

> メモ: 開発モードのままでも、アプリに紐づく自分のアカウントには投稿可能。
> 継続運用するなら後で本番公開＋ビジネス認証をしておくと安定します。

<details><summary>（参考）Facebookログイン方式でやる場合のC</summary>

1. グラフAPIエクスプローラで権限 `instagram_basic` `instagram_content_publish`
   `pages_show_list` `pages_read_engagement` `business_management` を付与
2. `GET me/accounts` → ページの `id` → `GET {page-id}?fields=instagram_business_account`
   の戻り値が **IG_USER_ID**
3. 長期トークンに変換（`grant_type=fb_exchange_token`）
4. `GRAPH_BASE=https://graph.facebook.com` に設定
</details>

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
