# note 半自動公開ガイド（最後に「公開」を押すだけ）

noteには外部からの自動投稿APIが無いため、**ブラウザ操作**で半自動化する。
クラウド側のClaudeはブラウザを操作できないので、**PCのClaudeデスクトップアプリ**
（このリポジトリを開いた状態）で実行する。

## 事前準備（PC側・1回）
1. Chromeで note.com に **ログイン**しておく
2. Claudeデスクトップアプリでこのプロジェクトを開く
3. 「Claude in Chrome」拡張を有効化（私がブラウザを操作できる状態にする）

## 毎回の流れ
1. 最新を取り込む：`git pull`
2. バンドルを生成：`node tools/make-note-bundle.mjs all`
   → `note_bundles/<記事ID>/` に `title.txt` `body.txt` `01.jpg…` が出来る
3. デスクトップのClaudeにこう頼む：
   > 「note_bundles/2026-10-14_butterchicken を note に下書きして。
   >  タイトルと本文を貼り付け、画像を01→02…の順にアップして、
   >  **公開ボタンの直前で止めて**」
4. Claudeが Chrome で note を開き、タイトル・本文・画像をセット
5. あなたが内容を確認して **「公開」をクリック**（ここだけ手動）

## 記事IDの一覧（note_bundles/ 配下）
- 2026-09-20_mysore_palace … マイソール宮殿
- 2026-09-22_mysore_chamundi … チャムンディの丘
- 2026-09-24_mysore_food … 南インド定食
- 2026-09-26_mysore_cathedral … 大聖堂
- 2026-09-28_lucknow_kebab … ラクナウのケバブ
- 2026-09-30_lucknow_biryani … イドリースのビリヤニ
- 2026-10-02_mango … マンゴー
- 2026-10-05_delhi … デリー出張
- 2026-10-08_carpet … カシミール絨毯
- 2026-10-11_pizza … ガーリックブレッド
- 2026-10-14_butterchicken … バターチキン

## メモ
- 公開済みの記事は、このファイルにチェックを付けて管理するとよい（手動）
- noteの見出しは、貼り付け後に「■」行を note の見出し機能にすると読みやすい
