# メタデータ編集 Phase 4: 元の写真から読み込む

- 日付: 2026-10-28
- 対象: `apps/mobile`
- 前提: Phase 1〜3 の spec (`docs/superpowers/specs/2026-10-28-metadata-editor-phase{1,2,3}-design.md`)
- 参照実装 (Web): teyvat `packages/catalyst.natsuneko.com/src/components/features/status/forms/EditMetadataForm/OriginalPhotoImport.tsx`、`src/lib/extractPhotoMetadata.ts`
- 解析の方針: teyvat `packages/foreign-model/src/photo-metadata.ts` (`extractCatalystPhotoMetadata`)
- サーバー: teyvat `packages/api.natsuneko.com/src/services/epiclese.ts` (`importDenormalizedMetadata`)、`packages/foreign-model/src/schema.ts` (`IMPORT_DENORMALIZED_METADATA_SCHEMA`)

## 背景

Photoshop などでレタッチして投稿した写真は、VRChat や Resonite が埋め込んだ撮影情報 (ワールド・撮影者など) を失っている。レタッチ前の元画像を端末内で解析し、抽出した値だけをレタッチ済みの写真に付与する。元画像そのものは送らない。

## ブランチと PR

- ブランチ `claude/metadata-phase4-original-photo` を Phase 3 のブランチ (`claude/metadata-phase3-pins`) の先端から切る。
- PR はベースを Phase 3 のブランチにした通常の draft PR。GitHub の stacked PR 機能は使わない。下のフェーズがマージされたらベースを付け替える。

## サーバー側の挙動

- `POST /epiclese/v1/media/:mediaId/denormalized-metadata`、SDK は `client.epiclese.v1.media.mediaId.denormalizedMetadata.create({ path: { mediaId }, body: { records }, throwOnError: true })`。投稿のオーナーのみ (それ以外は 403)。
- `records` のキーは `LocationName` / `TakenAt` / `TakenBy` / `Platform` / `Application` / `Version` / `AppVersion` / `CameraFOV` / `CreatorTool` / `Author` / `World` / `Parser` のみ。値は 1024 文字までの文字列、または `{ value (1024 字まで), referenceId (256 字まで), referenceType: "author" | "world" | "item" }`。1 件以上必要。1 つでも範囲外なら全体が 400。
- キーごとに upsert する。今回送らなかったキーの既存の値は残る。
- 保存先は Phase 1〜3 の `POST /epiclese/v1/tag/by/status/:id` とは別で、編集画面の全置換の保存には含まれない。

## 1. 導線と流れ

- 「この写真の設定」の、「自動設定されたメタデータを表示しない」トグルの上に **「元の写真から読み込む」** 行 (`MetadataRow`、値なし) を足す。行の下に説明「レタッチする前の元画像を選ぶと、埋め込まれたワールドや撮影者などの情報をこの端末内だけで読み取り、この写真に付与します。選んだ画像自体は送信・保存されません。」。
- タップで写真ライブラリを開く: `ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 1 })` (投稿画面と同じく再エンコードを避ける)。キャンセルなら何もしない。
- 選んだら端末内で解析する。解析中は行の値に「画像を解析しています...」とインジケータ、行は無効。
- 検出できなかったら (対象外・64MB 超・メタデータなし) `Alert.alert("エラー", "この画像から VRChat や Resonite などの撮影情報を検出できませんでした。")`。
- 解析自体が例外で失敗したら `Alert.alert("エラー", "メタデータの取得に失敗しました。")`。
- 検出できたら **確認シート** (`BottomSheetModal`。編集画面の上なので RN `Modal` ではない) を開く:
  - タイトル「検出されたメタデータ」
  - 検出した項目を行で並べる (ラベル: 値)。ラベルは Web 版 `globals:metadata.*` に合わせる:
    - `Platform` → 撮影プラットフォーム
    - `LocationName` / `World` → 撮影ワールド。ただし `records.Platform` が `"Resonite"` のときの `LocationName` は「撮影場所」
    - `TakenBy` / `Author` → 撮影者
    - `TakenAt` → 撮影日時 (`dayjs` で表示)
    - それ以外のキーはキー名のまま
    - 参照付きの値で `value` が空なら `referenceId` を表示する (VRChat 旧形式は名前を持たないため)
  - 注意「ヘッダーの「保存」とは別に、すぐにこの写真へ付与されます」
  - 表示中の写真の「自動設定されたメタデータを表示しない」が ON なら、さらに「表示しない設定が ON のため、付与しても投稿には表示されません」
  - ボタン「この写真に付与」(主) /「キャンセル」
- 「この写真に付与」: 送信中はボタンを無効にしてインジケータ。
  - 成功: シートを閉じ、`Toast.show({ type: "success", text1: "メタデータを取得し、この写真に付与しました。" })`。投稿詳細が再取得するよう、Phase 1 の `metadataRevisionAtomFamily(statusId)` を進める。
  - 失敗: `Alert.alert("エラー", "メタデータの取得に失敗しました。")`、シートは開いたまま (もう一度押せる)。
- 付与は編集画面の下書き (`items`) を変えないので、未保存の変更 (dirty) の判定には影響しない。

## 2. 解析 (Web と同じ records にする)

Web 版は `foreign-model` の `extractCatalystPhotoMetadata` を使うが、アプリは `foreign-model` に依存していない。アプリは同じ `@natsuneko-laboratory/memora` 0.3.0 を持っているので、その方針を **純粋関数として移植** し、Web と同じ `records` を作る:

- `parseAllImageMetadata` の結果を、`ResoniteScreenshotExtensions` を先頭にして順に試し、最初に条件を満たしたものを使う。
  - **Resonite**: `LocationName` (空なら無し)、`TakenAt` (ISO8601、解釈できなければ無し)、`TakenBy` (`{ value: takenBy.name ?? "", referenceId: takenBy.id ?? "", referenceType: "author" }`)、`Platform: "Resonite"`、`AppVersion`、`CameraFOV` (文字列に)。
  - **VRCX**: `version === 1` かつ `world` と `author` があるときだけ。`LocationName` (world 参照)、`TakenBy` (author 参照)、`Platform: "VRChat"`、`Application: "VRCX"`、`Version: "1"`。
  - **VRChat 旧形式**: `author` が `usr_` で始まり `world` が `wrld_` で始まる → `CreatorTool: "VRChat"`、`Platform: "VRChat"`、`Author` / `World` (値は空、`referenceId` に ID)、`Parser: "2025.07.22-beta.1674"`。
  - **VRChat 新形式**: `authorId` が `usr_` で始まり、`worldId` が `wrld_` で始まるか空 → `CreatorTool` / `Platform` 同上、`Author` (`author ?? ""` と `authorId`)、`World` (`worldDisplayName || "<Private World>"` と `worldId`)、`Parser: "2025.08.01-beta.1678"`。
  - 個々の候補で例外が出たら、次の候補を試す。
- `records` への変換: `null` は落とし、参照は `{ value, referenceId, referenceType }`、数値は文字列に。値は 1024 文字、`referenceId` は 256 文字で切る (サーバーの上限。超えると全体が 400)。結果が 0 件なら「検出できなかった」扱い。
- ファイルの読み込みは既存の `src/lib/image-metadata.ts` と同じく `expo-file-system` の `File` で読み、64MB を超えるものは解析しない。解析前に `setTimeout(0)` でイベントループに譲る (投稿画面と同じ、インジケータを描くため)。

純粋関数は `src/lib/photo-metadata-records.ts` に置く。Web の方針が変わったら合わせる必要があるので、ファイル冒頭に移植元 (`foreign-model/src/photo-metadata.ts`) を書く。

## 3. 検証

### ユニットテスト (jest)

- memora の解析結果のフィクスチャから、Web 版と同じ `records` になる: Resonite (全項目 / 日付が不正 / 撮影者なし)、VRCX (v1 / v1 以外は使わない)、VRChat 旧形式、新形式、新形式でワールド ID が空 (`<Private World>`)、条件を満たさない VRChat、Resonite と VRChat が両方あるときは Resonite。
- `null` は落ち、数値は文字列になり、1024 / 256 文字で切られる。
- 何も満たさなければ `null`。
- 表示用の行への変換 (ラベル、空の `value` は `referenceId`)。

### 画面テスト

- 確認シート: 「この写真に付与」でだけ API を呼ぶ / 「キャンセル」では呼ばない / 失敗したらシートが残り Alert が出る / 表示しない設定が ON なら注意が出る。

### 手動確認 (iOS シミュレータ、サインイン済み)

- VRChat / Resonite の元画像を選ぶと検出内容が出て、付与すると投稿詳細と Web にワールドや撮影者が出る。
- メタデータの無い画像では「検出できませんでした」。
- 付与のあと、編集画面の「保存」を押さなくても付与は残る。

## スコープ外

- 付与したメタデータの削除・編集 (サーバーに API が無い)
- ファイル App からの選択 (ネイティブ依存が増えるため、写真ライブラリのみ)
- 複数の写真にまとめて付与
