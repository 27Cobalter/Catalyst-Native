# メタデータ編集 Phase 2: テキストベース (プラットフォーム / ワールド / 写っている人)

- 日付: 2026-10-28
- 対象: `apps/mobile`
- 前提: Phase 1 (`docs/superpowers/specs/2026-10-28-metadata-editor-phase1-design.md`) の画面構造・保存モデル・全置換の制約をそのまま引き継ぐ
- 参照実装 (Web): teyvat `packages/catalyst.natsuneko.com/src/components/features/status/forms/EditMetadataForm/` の `form.tsx`, `WorldSelector/`, `AuthorSelector/`, `UserSelector/`
- サーバー: teyvat `packages/api.natsuneko.com/src/services/epiclese.ts` (`createOrGetWorld`, `createOrGetAuthor`, `extract*PlatformIdentifier`)

## ブランチと PR

- ブランチ `claude/metadata-phase2-text` を Phase 1 のブランチ (`claude/metadata-settings-phased-8d1023`) の先端から切る。
- PR は GitHub の stacked PR 機能を使わず、ベースを Phase 1 のブランチにした通常の draft PR にする (差分は Phase 2 の分だけになる)。
- Phase 1 がマージされたら、この PR のベースを `develop` に変える。

## 1. 編集画面の行

「この写真の設定」セクションの、Phase 1 のトグルの上に 3 行を足す。各行は現在の値を表示し、タップで編集する。

| 行 | 値の表示 | タップで開くもの |
| --- | --- | --- |
| プラットフォーム | プラットフォーム名 / 「未選択」 | ボトムシート (一覧 + 「選択しない」) |
| ワールド | ワールド名と作者名 / 「未選択」 | ワールド選択モーダル |
| 写っている人 | アイコン最大 3 つ + 「n 人」 / 「未選択」 | 写っている人の選択モーダル |

- プラットフォームが未選択のとき、ワールド行は無効表示にし、値の位置に「先にプラットフォームを選択してください」を出す。
- プラットフォームを変えたら (別の値になったら) ワールドを消す。Web 版 `onSelectPlatform` と同じ (ワールドはプラットフォームに属するため)。同じ値を選び直したときは消さない。
- 「すべての写真に適用…」の選択肢を足す。並び順:
  1. 「プラットフォームとワールド」 — 表示中の写真の `platform` と `world` を組で全写真へコピー
  2. 「写っている人」 — 表示中の写真の `users` を全写真へコピー
  3. 「表示設定」 (Phase 1)

## 2. 選択 UI

ワールドと写っている人の選択は、画面ではなく **フルスクリーンのモーダル** (React Native の `Modal`、iOS は `presentationStyle="pageSheet"`) で出す。編集中の状態を編集画面の `useState` に置いたまま扱え、Phase 1 の状態管理 (共有アトム化を避けた判断) を変えずに済むため。各モーダルはヘッダーに「キャンセル」と (必要なら)「完了」を持つ。

### 2.1 プラットフォームのシート

- `GET /epiclese/v1/platforms` で読み込み済みの一覧を出す (Phase 1 で取得済み、追加の通信はしない)。
- 先頭に「選択しない」。選択中の項目に ✓。選んだらシートを閉じて反映する。

### 2.2 ワールド選択モーダル

モーダル内に 4 つのステップを持ち、モーダルの中で進む・戻る:

1. **ワールド検索** (最初のステップ)
   - 検索欄 (プレースホルダ「ワールド名もしくは ID を入力...」)。入力を 300ms debounce して `client.epiclese.v1.worlds.get({ query: { q, platform } })` を呼ぶ。開いた直後は `q: ""` で一覧を出す。
   - 結果はワールド名 + 作者名 (作者が無ければ省略)。選択中のワールドに ✓。現在の選択が結果に無ければ先頭に足す (Web 版と同じ)。
   - タップで選択して閉じる。ワールドが選択済みなら「選択を外す」を出す。
   - 結果 0 件のとき「一致するワールドが見つかりませんでした。」。
   - リスト末尾に「見つからない場合はワールドを登録」→ ステップ 2。
2. **ワールド登録フォーム**
   - タイトル「ワールド情報を入力」。項目:
     - ワールド名 (必須。説明「ワールドの名前を正確に入力してください」)
     - ワールドID (必須。説明「ワールドID もしくは URL を入力してください。」、プレースホルダはプラットフォームごと: VRChat `wrld_a5e9ec13-36b1-4e63-ae0c-dab9023401f9` / cluster `https://cluster.mu/w/20d14291-1d6b-4ad9-9f4e-fe8b87dd6f0c` / Resonite `https://go.resonite.com/world/U-esnya/R-3acf68b3-b78b-4a8c-96ef-97a2f744602f`)
     - ワールド作者 (任意。説明「ワールドの作者を選択、もしくは入力してください。」)。行をタップ → ステップ 3
   - 「保存」で `client.epiclese.v1.worlds.create({ body: { name, platformIdentifier, platform, author } })`。成功したら返ってきたワールドを選択してモーダルを閉じる。名前か ID が空なら「保存」を無効にする。
   - 失敗したら `Alert.alert("エラー", "ワールド情報の保存に失敗しました")`。入力は保持する。
   - 同じ ID のワールドが既にあればサーバーは既存を返す (`createOrGetWorld`) ので、重複登録は気にしない。
3. **作者検索**
   - 検索欄 (「作者名もしくは ID を入力...」)。`client.epiclese.v1.authors.get({ query: { q, platform } })`、300ms debounce。結果 0 件は「一致する作者が見つかりませんでした。」。
   - タップで作者を選んでステップ 2 に戻る。末尾に「見つからない場合は作者を登録」→ ステップ 4。
4. **作者登録フォーム**
   - タイトル「作者情報を入力」。項目:
     - プラットフォーム (一覧 + 「なし（BOOTH のショップなど）」、初期値は写真のプラットフォーム。説明「この作者が所属するプラットフォームを選択します。写真自体のプラットフォームと異なっていても構いません（例：BOOTH のショップのみを持つ作者）」)
     - 作者名 (必須)
     - ユーザー ID (必須。プレースホルダ: VRChat `usr_f0ae733a-b3ea-4462-b9a7-8c386e860ac1` / cluster `https://cluster.mu/u/ichiganryuta` / Resonite `U-esnya` / なし `https://your-shop.booth.pm/`)
   - 「保存」で `client.epiclese.v1.authors.create({ body: { name, platformIdentifier, platform } })` (「なし」のときは `platform` を送らない)。成功したら作者を選んでステップ 2 に戻る。
   - 失敗したら `Alert.alert("エラー", "作者情報の保存に失敗しました")`。入力は保持する。

ワールドと作者の登録はその場でサーバーのデータカタログに追加される (写真のメタデータ自体は、編集画面の「保存」まで変わらない)。モーダルを「キャンセル」で閉じたら、選択は変えない。

### 2.3 写っている人の選択モーダル

- 上部に選択中のユーザーのチップ (アイコン + 表示名、× で外す)。0 人なら「ユーザーが選択されていません」。
- 検索欄 (「表示名やユーザー名で検索...」)。300ms debounce して `client.egeria.v1.search.get({ query: { q } })`。空欄のときは結果を出さない。
- 結果はアイコン + 表示名 + `@screenName`。選択中に ✓。タップで追加 / 解除。結果 0 件は「一致するユーザーが見つかりませんでした。」。
- チップの上に「n/10 人」を出す。
- 最大 10 人 (サーバーの zod 上限)。11 人目を足そうとしたら追加せず「最大 10 人まで選べます」を出す。
- 「完了」で編集画面に反映して閉じる。「キャンセル」では反映しない。

### 2.4 表示用のユーザー情報

送信形式の `users` は `{ id }` しか持たないため、表示用に `ユーザー ID → { displayName, screenName, iconUrl }` の対応表を編集画面で持つ。読み込んだメタデータの `users` と、検索結果から埋める。対応表に無い ID (通常は起きない) は ID の先頭 8 文字で表示する。

## 3. モデル・保存・エラー

- 保存は Phase 1 と同じく、ヘッダーの「保存」で全写真分を 1 回 POST する (全置換)。Phase 2 の行は `platform` / `world` / `users` を書き換えるだけで、`reference` (ピン) は読み込んだまま送り返す。
- `src/models/epiclese-metadata-editor.ts` に純粋関数を足し、テストする:
  - `setPlatform(item, platformId | undefined)` — プラットフォームを設定し、値が変わったらワールドを消す
  - `toEditableWorld(world: EpicleseWorldResponse)` — 検索・登録の結果を送信形式のワールドへ (Phase 1 の `toWorld` と同じ変換を共有する)
  - `toggleUser(users, userId)` — 追加 / 解除。上限 10 人を超える追加は `{ users, limited: true }` を返して変えない
  - `collectUserProfiles(response)` — 読み込んだメタデータから表示用の対応表を作る
  - `applyToAll` の `field` に `"platformAndWorld"` と `"users"` を足す
- 一覧・検索の取得に失敗したら、各モーダル内で「読み込みに失敗しました」と「再読み込み」を出す (編集画面の状態は変えない)。

## 4. 検証

### ユニットテスト (jest)

- `setPlatform`: 違う値でワールドが消える / 同じ値なら残る / `undefined` で両方消える / `reference` は変わらない。
- `toEditableWorld`: `platform: null` → `""`、作者の `platform: null` → `""`、作者なし → `null`。
- `toggleUser`: 追加・解除・10 人目まで追加できる・11 人目は `limited: true` で変わらない。
- `collectUserProfiles`: 全写真の `users` から重複なく作る。
- `applyToAll`: `platformAndWorld` は platform と world だけ、`users` は users だけをコピーし、`reference` / `privacyMetadata` を変えない。
- 往復: ワールドを差し替えた後の送信内容で、ピン (`reference`) が 1 つも落ちない。
- 画面テスト: 写っている人のモーダルで 11 人目を追加できず、メッセージが出る。

### 手動確認 (iOS シミュレータ、サインイン済み)

- プラットフォーム → ワールド → 写っている人を設定して保存し、投稿詳細と Web の表示に反映される。
- プラットフォームを変えるとワールドが消える。
- ワールドを登録 (作者の検索・登録を含む) して選択できる。
- 「すべての写真に適用…」の新しい 2 項目が全写真に反映される。
- Web でピンを設定した投稿で、ワールドだけ変えて保存してもピンが残る。

## スコープ外

- ピンの編集 (Phase 3)、元写真からの読み込み (Phase 4)
- ワールドや作者の編集・削除 (登録のみ)
- Phase 1 で見送った軽微な問題 (保存連打のガード、ディープリンク直後の戻り先、回転時のページャ、サムネイルの自動スクロール)
