# メタデータ編集 Phase 1: 画面の骨組み＋自動設定メタデータを隠す

- 日付: 2026-10-28
- 対象: `apps/mobile`
- 参照実装 (Web): teyvat `packages/catalyst.natsuneko.com/src/components/features/status/forms/EditMetadataForm/`

## 背景と全体計画

Web 版の「メタデータの編集」(`/status/:id/metadata`) と同じ機能をアプリに実装する。Web 版は次の 4 機能を持ち、アプリでは 4 フェーズに分けて 1 フェーズ 1 PR (`develop` 向け) で出す。

| Phase | 内容 | 保存先 |
| --- | --- | --- |
| **1 (本 spec)** | 編集画面の骨組み＋**自動設定メタデータを隠す** | `POST /epiclese/v1/tag/by/status/:id` |
| 2 | テキストベース: プラットフォーム / ワールド / 写っている人 | 同上 |
| 3 | 位置ベース: 写真上のピン (アイテム参照) | 同上 |
| 4 | 手元の生写真から読み込む | `POST /epiclese/v1/media/:mediaId/denormalized-metadata` (即時保存) |

Phase 2〜4 はそれぞれ別 spec で設計する。本 spec で決める画面構造・保存モデルは全フェーズ共通の土台になる。

### 全フェーズ共通の決定事項

- **画面構造**: 上部に写真 (左右スワイプで切替) とサムネイル列、下部に「この写真の設定」の行リスト。各行をタップするとシートか画面で編集する (Instagram の「タグ付け」「詳細設定」に近い構成)。Phase 3 では上部の写真領域がそのままピン編集キャンバスになる。
- **保存**: ヘッダー右の「保存」で全写真分を 1 回送信する。自動保存はしない。
- **一括適用**: リスト下の「すべての写真に適用…」ボタン 1 つ。押すとアクションシートで適用する項目を選ぶ。各フェーズは選択肢を足すだけで済む。

## 最重要の制約: 保存 API は全置換

`POST /epiclese/v1/tag/by/status/:id` は投稿の**全写真分**のメタデータ配列 (`CreateMetadata`) を受け取り、まとめて置き換える。したがって:

- アプリがまだ編集できない項目 (platform / world / users / reference) も、**読み込んだ値をそのまま送り返さなければならない**。送り忘れると、Web で設定したピンやワールドが保存のたびに消える。
- GET (`EpicleseStatusMetadataResponse`) と POST (`CreateMetadata`) は形が違うため、変換が要る。Web 版 `form.tsx` の `transform` と同じ変換をアプリ側に実装する:
  - `platform`: GET はプラットフォーム**名**、POST はプラットフォーム **ID**。`GET /epiclese/v1/platforms` の一覧で名前 → ID に引く。
  - `world`: `platform` (オブジェクト) → `platform.id ?? ""`、`author.platform` も同様に ID へ。`world: null` は `undefined` へ。
  - `users`: `{ id }` だけを送る (サーバーは `id` しか見ない)。
  - `reference`: `externalUrl: null` → `undefined`、`author.platform` → ID。他はそのまま。
  - `additionalData` / `additionalData2` はサーバー側で導出される値なので送らない。
- `privacyMetadata` は Epiclese のレスポンスではなく、投稿 (`catalyst.v11.status.id`) の `medias[].privacyMetadata` から読む。
- GET のレスポンスに無い写真 (メタデータ未設定) は `{ id: media.id, reference: [] }` として扱う。
- 送信順は投稿の `medias` の順。

## 1. 導線とルーティング

- 投稿詳細のメニュー (`isMyself` ブロック) の「編集する」の下に「メタデータを編集」を追加する。アイコンは lucide の `Tags` (ピン表示と揃える)。
- 新しいルート `status/[id]/metadata`。そのために `src/app/status/[id].tsx` を `src/app/status/[id]/index.tsx` へ移す (`album/[id]/index` + `edit` と同じ構成)。`_layout.tsx` の `Stack.Screen name="status/[id]"` を `status/[id]/index` に直し、`status/[id]/metadata` を追加する。
- ヘッダー: タイトル「メタデータ」、左「キャンセル」、右「保存」。

## 2. 画面レイアウト

```
┌ キャンセル  メタデータ  保存 ┐
│      [ 写真 2/4 ]        │  ← 横ページャ (左右スワイプ)
│ [■1✓][■2 ][■3✓][■4 ]     │  ← サムネイル列 (タップで切替)
├──────────────────────────┤
│ この写真の設定              │
│ 自動設定されたメタデータを   │
│ 表示しない          [○●] │
│ (説明文)                   │
│                          │
│ [すべての写真に適用…]       │  ← 写真 2 枚以上のときだけ
└──────────────────────────┘
```

- **写真ページャ**: 投稿の写真を横ページングで表示する。サムネイル列と選択中インデックスを同期させる。
- **サムネイルの ✓**: その写真に何らかのメタデータがあるとき表示する。判定は Web 版 `isMetadataConfigured` と同じで、platform / world / users / reference / privacyMetadata のいずれかがあれば ✓ (Phase 1 で編集できない項目も判定に含める)。
- **設定リスト**: Phase 1 の行は「自動設定されたメタデータを表示しない」のトグル 1 つ。説明文は Web 版と同じく「ResoniteScreenshotExtensions や VRCX などのツールで画像に埋め込まれたメタデータがある場合でも、表示したくないときは ON にしてください。編集画面から追加したメタデータは引き続き表示されます。」。
- 未実装フェーズの行 (ワールド、写っている人、ピン、元写真から読み込む) は**出さない**。グレーアウト表示もしない。
- **すべての写真に適用…**: 写真が 2 枚以上のときだけ表示する。押すとアクションシートを開き、Phase 1 の選択肢は「表示設定」のみ。選ぶと、表示中の写真の `privacyMetadata` を全写真にコピーする。
- スタイルは Uniwind のユーティリティクラスと既存の design-system コンポーネント (`CatalystSwitch`, `CatalystActionSheetItem` など) を使う。

## 3. 状態と保存

### 読み込み

画面を開いたら次を並列に取得し、編集用モデルを組み立てる。

1. 投稿: `client.catalyst.v11.status.id.get`
2. メタデータ: `client.epiclese.v1.tag.by.status.id.get`
3. プラットフォーム一覧: `client.epiclese.v1.platforms.get`

いずれも SDK のクライアントを使い、生の `fetch` は使わない。

### 編集用モデル

写真ごとに、送信形式 (`CreateMetadata[number]`) そのものを持つ。`privacyMetadata` だけを書き換え、他のフィールドは読み込んだまま保持する。モデルと変換・判定は純粋関数として `src/models/epiclese-metadata-editor.ts` (仮) に置き、画面から切り離してテストできるようにする:

- `toEditableMetadata(status, metadataResponse, platforms)` → 写真順の `CreateMetadata`
- `isMetadataConfigured(item)` → ✓ 判定
- `applyToAll(items, sourceIndex, field)` → 一括適用 (Phase 1 の `field` は `"privacyMetadata"` のみ。後続フェーズで増やす)

画面の状態は `useState` で持つ (この画面でしか使わないため Jotai にはしない)。読み込み直後の値を保持し、現在値と比べて未保存の変更があるかを判定する。

### 保存

- 「保存」で `client.epiclese.v1.tag.by.status.id.create` (POST) に編集用モデルを丸ごと送る。ログイン中アカウントの認証付きクライアント (`account.credential.client`) を使う。
- 送信中は「保存」ボタンを無効化し、インジケータを出す。
- 成功したら投稿詳細へ戻る。投稿詳細はメタデータと投稿を再取得する。仕組みは Jotai の「投稿 ID → リビジョン」アトムを保存成功時に進め、詳細画面の取得 `useEffect` の依存に含める形にする。
- 失敗したら `Alert` でエラーを出し、編集画面に留まる。編集内容は保持する。

### 未保存の変更の扱い

- 未保存の変更がある状態で「キャンセル」かスワイプバックで離れようとしたら、破棄確認の `Alert` (「変更を破棄しますか？」/ 破棄・編集を続ける) を出す。React Navigation 7 の `usePreventRemove` で実装する (アプリ内に既存の破棄確認パターンは無いので、ここで新設する)。
- 保存成功後に戻るときは確認しない。

## 4. エラーとエッジケース

- **読み込み失敗** (どれか 1 つでも失敗): エラー表示と「再読み込み」ボタン。部分的なデータでは編集させない (送り返す値が欠けて全置換で消えるのを防ぐため)。
- **他人の投稿** (ディープリンク等で開いた場合): 投稿の `user.id` とログイン中アカウントを比べ、違えば「この投稿のメタデータは編集できません」を表示して API を呼ばない。未ログインも同じ扱い。
- **プラットフォーム名が一覧に無い**: Web 版と同じく `platform` を `undefined` にする。Web と同じ挙動であり、Phase 1 では特別扱いしない。
- **写真 1 枚の投稿**: サムネイル列と「すべての写真に適用…」を出さない。

## 5. 検証

### ユニットテスト (jest)

`src/models/epiclese-metadata-editor.test.ts` に以下を書く:

- **往復テスト (最重要)**: ワールド・ユーザー・ピン (作者・外部 URL・説明あり/なし) を含む GET レスポンスを `toEditableMetadata` に通した結果が、Web 版 `transform` と同じ送信内容になること。ピンが 1 つも落ちないこと。
- GET に無い写真が空メタデータで補われ、`medias` の順で並ぶこと。
- `privacyMetadata` が投稿の `medias` から読まれること。
- `isMetadataConfigured` の各条件。
- `applyToAll` が `privacyMetadata` だけをコピーし、他のフィールドを変えないこと。

### 手動確認 (iOS シミュレータ)

- 自分の投稿のメニューに「メタデータを編集」が出て、他人の投稿には出ない。
- トグルを変えて保存すると、投稿詳細に戻ってメタデータ表示が更新される。
- **Web でピンとワールドを設定した投稿を、アプリでトグルだけ変えて保存しても、ピンとワールドが残る。**
- 未保存の状態でキャンセル / スワイプバックすると破棄確認が出る。
- 2 枚以上の投稿で「すべての写真に適用…」→「表示設定」が全写真に反映される。

## スコープ外

- プラットフォーム / ワールド / ユーザー / ピンの編集 UI (Phase 2, 3)
- 元写真からの読み込み (Phase 4)
- 投稿詳細の既存のメタデータ取得 (生 `fetch`) を SDK に置き換えること。詳細画面の再取得の仕組みを入れる際に触れるが、取得方法自体の変更はしない。
