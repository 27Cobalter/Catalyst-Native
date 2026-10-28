# メタデータ編集 Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** レタッチ前の元画像を写真ライブラリから選び、端末内で撮影情報を読み取り、確認してからレタッチ済みの写真に付与できるようにする。

**Architecture:** memora の解析結果を Web 版と同じ `records` に変換する純粋関数を `src/lib/photo-metadata-records.ts` に移植する。編集画面の「元の写真から読み込む」行が、写真の選択・解析・確認シートの表示を受け持つ部品 (`OriginalPhotoImport`) を持つ。確認シートの中身 (`ImportConfirmContent`) が付与の API を呼び、成功したら投稿詳細のリビジョンを進める。

**Tech Stack:** Expo / expo-router 58, expo-image-picker, expo-file-system (`File`), `@natsuneko-laboratory/memora` 0.3.0 (`parseAllImageMetadata`), dayjs, @gorhom/bottom-sheet, react-native-toast-message, Jotai, Uniwind, `@natsuneko-laboratory/catalyst-sdk` 2026.10.26-beta.3, jest + @testing-library/react-native v14

**Spec:** `docs/superpowers/specs/2026-10-28-metadata-editor-phase4-design.md` (前提: Phase 1〜3 の spec)

## Global Constraints

- ブランチ `claude/metadata-phase4-original-photo` (Phase 3 の `claude/metadata-phase3-pins` の上)。PR はベースを Phase 3 のブランチにした通常の draft PR。GitHub の stacked PR 機能は使わない。
- 付与 API: `client.epiclese.v1.media.mediaId.denormalizedMetadata.create({ path: { mediaId }, body: { records }, throwOnError: true })` (`useAtomValue(clientAtom)` のクライアント)。型は SDK の `ImportDenormalizedMetadata` (`records`)。
- 付与は編集画面の下書き (`items`) を変えない。成功したら `metadataRevisionAtomFamily(statusId)` を進める。
- サーバーの上限: 値 1024 文字、`referenceId` 256 文字、`referenceType` は `author` / `world` / `item`、キーは spec「サーバー側の挙動」の 12 個。
- 写真の選択は `ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 1 })`。ファイルは `expo-file-system` の `File`、64MB 超は解析しない (既存の `src/lib/image-metadata.ts` と同じ上限)。
- 確認シートは編集画面の上に出すので `BottomSheetModal` (既存のシートと同じ見た目)。
- 文言 (spec で固定):
  - 行「元の写真から読み込む」、説明「レタッチする前の元画像を選ぶと、埋め込まれたワールドや撮影者などの情報をこの端末内だけで読み取り、この写真に付与します。選んだ画像自体は送信・保存されません。」、解析中「画像を解析しています...」
  - 未検出 `Alert.alert("エラー", "この画像から VRChat や Resonite などの撮影情報を検出できませんでした。")`
  - 失敗 `Alert.alert("エラー", "メタデータの取得に失敗しました。")`
  - 成功 `Toast.show({ type: "success", text1: "メタデータを取得し、この写真に付与しました。" })`
  - シート: タイトル「検出されたメタデータ」、注意「ヘッダーの「保存」とは別に、すぐにこの写真へ付与されます」、表示しない設定 ON のとき「表示しない設定が ON のため、付与しても投稿には表示されません」、ボタン「この写真に付与」「キャンセル」
  - ラベル: `Platform` 撮影プラットフォーム / `LocationName`・`World` 撮影ワールド (`records.Platform === "Resonite"` の `LocationName` は撮影場所) / `TakenBy`・`Author` 撮影者 / `TakenAt` 撮影日時 / 他はキー名
- 移植元: teyvat `packages/foreign-model/src/photo-metadata.ts` と `packages/catalyst.natsuneko.com/src/lib/extractPhotoMetadata.ts`。**Web と同じ `records` を作ること** が要件。移植したファイルの冒頭に移植元を書く。
- 画面テストは `src/app` の外。RNTL v14 は `await`。design-system の switch / tabs、`expo-image`、`lucide-react-native`、`@gorhom/bottom-sheet` は必要に応じてモックする。
- tsc の `Property 'className'` 系は既知の誤検知。コミットは署名付き、本文末尾に空行を挟んで `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。

## Spec の訂正

spec の「2. 解析」は Resonite の `TakenAt` を「解釈できなければ無し」としているが、移植元は `dayjs(timeTaken).toISOString()` が例外を投げ、その候補ごと飛ばして次の候補 (VRChat など) を試す (コメント "fallback after unusable dates")。**Web と同じ records にする** という spec の要件を優先し、移植元と同じく候補ごと飛ばす。この Task 1 のコミットで spec の該当行も直す。

## Review Focus

1. **Web と違う records を送る** (同じ写真を Web とアプリで付与すると別の値になる): 移植元と同じ順序・条件・キー。→ Task 1 のフィクスチャテスト。
2. **上限を超える値で全体が 400**: 1024 / 256 文字で切る。→ Task 1 のテスト。
3. **大きな画像でアプリが落ちる / 固まる**: 64MB 超は解析しない、解析前にイベントループへ譲る。→ Task 2 で既存の上限を使い、手動確認。
4. **付与を二度押しして 2 回 POST**: 送信中はボタンを無効にする。→ Task 2 の画面テスト `送信中は二度押しできない`。
5. **失敗したのにシートが閉じて、何も付かなかったことに気付かない**: 失敗時はシートを残して Alert。→ Task 2 の画面テスト。

---

### Task 1: 解析結果を records に変換する

**Files:**
- Create: `apps/mobile/src/lib/photo-metadata-records.ts`
- Test: `apps/mobile/src/lib/photo-metadata-records.test.ts`
- Modify: `docs/superpowers/specs/2026-10-28-metadata-editor-phase4-design.md` (上の「Spec の訂正」)

**Interfaces:**
- Produces:
  - `type DenormalizedRecords = ImportDenormalizedMetadata["records"]`
  - `toDenormalizedRecords(results: ImageMetadata[]): DenormalizedRecords | null` (0 件なら `null`)
  - `readDenormalizedRecords(uri: string): Promise<DenormalizedRecords | null>` (`File` で読み、64MB 超は `null`、`parseAllImageMetadata` に渡して `toDenormalizedRecords`)
  - `type RecordRow = { key: string; label: string; value: string }`
  - `toRecordRows(records: DenormalizedRecords): RecordRow[]` (spec のラベル。`TakenAt` は `dayjs(value).format("YYYY/MM/DD HH:mm")`。参照の `value` が空なら `referenceId`)

- [ ] **Step 1: 失敗するテストを書く** (フィクスチャは memora の型どおりに `raw: new Uint8Array()` を付けて作る)
  - Resonite (全項目): `{ type: "ResoniteScreenshotExtensions", locationName: "Home", timeTaken: "2026-10-01T12:00:00Z", takenBy: { name: "Neko", id: "U-neko" }, appVersion: "2026.1", cameraFOV: 60 }` → `{ LocationName: "Home", TakenAt: "2026-10-01T12:00:00.000Z", TakenBy: { value: "Neko", referenceId: "U-neko", referenceType: "author" }, Platform: "Resonite", AppVersion: "2026.1", CameraFOV: "60" }`
  - Resonite (撮影者・場所なし): `LocationName` と `TakenBy` が無い。
  - Resonite の日付が不正なら次の候補を使う: `[Resonite(timeTaken: "not a date"), VRChat 新形式]` → VRChat の records。
  - VRCX v1: `{ type: "VRCX", version: 1, world: { name: "Home", id: "wrld_1" }, author: { displayName: "Neko", id: "usr_1" } }` → `{ LocationName: { value: "Home", referenceId: "wrld_1", referenceType: "world" }, TakenBy: { value: "Neko", referenceId: "usr_1", referenceType: "author" }, Platform: "VRChat", Application: "VRCX", Version: "1" }`。`version: 2` は使わない (`null`)。
  - VRChat 旧形式: `{ type: "VRChat", author: "usr_1", world: "wrld_1" }` → `{ CreatorTool: "VRChat", Platform: "VRChat", Author: { value: "", referenceId: "usr_1", referenceType: "author" }, World: { value: "", referenceId: "wrld_1", referenceType: "world" }, Parser: "2025.07.22-beta.1674" }`
  - VRChat 新形式: `{ type: "VRChat", author: "Neko", authorId: "usr_1", worldId: "wrld_1", worldDisplayName: "Home" }` → `Author: { value: "Neko", ... }`, `World: { value: "Home", referenceId: "wrld_1", ... }`, `Parser: "2025.08.01-beta.1678"`。`worldId: ""` で表示名なし → `World.value === "<Private World>"`。
  - 条件を満たさない VRChat (`author: "Neko"` だけ) → `null`。
  - Resonite と VRChat が両方 → Resonite (`Platform: "Resonite"`)。
  - 上限: 1500 文字の `locationName` → `LocationName` が 1024 文字。300 文字の `takenBy.id` → `referenceId` が 256 文字。
  - `toRecordRows`: Resonite の records → `撮影場所` / `撮影者` / `撮影日時` / `撮影プラットフォーム` を含む。VRChat 旧形式 → `撮影ワールド` の値が `wrld_1` (空の value は referenceId)。未知のキー (`AppVersion`) はキー名のまま。

- [ ] **Step 2: 失敗を確認**

Run: `cd apps/mobile && pnpm test src/lib/photo-metadata-records.test.ts`
Expected: FAIL (`Cannot find module './photo-metadata-records'`)

- [ ] **Step 3: 実装** — 移植元の switch をそのまま移す。候補ごとの `try / catch` で `continue`。`dayjs(x).toISOString()` は不正な日付で例外を投げる (dayjs の `Invalid Date` → `RangeError`) ので、移植元と同じく候補を飛ばす結果になる。変換の後で `null` を落とし、数値を `String()`、文字列と `value` を 1024、`referenceId` を 256 で切る。

- [ ] **Step 4: 成功を確認**

Run: `cd apps/mobile && pnpm test src/lib/photo-metadata-records.test.ts`
Expected: PASS

- [ ] **Step 5: spec を訂正して Commit**

spec「2. 解析」の Resonite の `TakenAt` を「ISO8601。解釈できない日付なら、Web 版と同じくこの候補ごと飛ばして次の候補を試す」に直す。

```bash
git add apps/mobile/src/lib/photo-metadata-records.ts apps/mobile/src/lib/photo-metadata-records.test.ts docs/superpowers/specs/2026-10-28-metadata-editor-phase4-design.md
git commit -m "feat(metadata): 元写真の撮影情報を Web と同じ records に変換する"
```

---

### Task 2: 「元の写真から読み込む」と確認シート

**Files:**
- Create: `apps/mobile/src/components/metadata-editor/original-photo-import/index.tsx` (`OriginalPhotoImport`: 行・説明・選択・解析・シート)
- Create: `apps/mobile/src/components/metadata-editor/original-photo-import/import-confirm-content.tsx`
- Test: `apps/mobile/src/components/metadata-editor/original-photo-import/import-confirm-content.test.tsx`
- Modify: `apps/mobile/src/app/status/[id]/metadata.tsx`, `apps/mobile/src/components/metadata-editor/metadata-screen.test.tsx` (モックを足す)

**Interfaces:**
- Consumes: Task 1 の `readDenormalizedRecords`, `toRecordRows`, `DenormalizedRecords`、Phase 1 の `metadataRevisionAtomFamily`、Phase 2 の `MetadataRow`
- Produces:
  - `ImportConfirmContent({ mediaId: string; records: DenormalizedRecords; hidesAutoMetadata: boolean; onApplied: () => void; onCancel: () => void })`: 行・注意・ボタン。「この写真に付与」で API を呼び、送信中は無効、成功で `onApplied()`、失敗で Alert (閉じない)。
  - `OriginalPhotoImport({ statusId: string; mediaId: string; hidesAutoMetadata: boolean })`: `MetadataRow label="元の写真から読み込む"` と説明。タップで写真を選び、`setTimeout(0)` で譲ってから `readDenormalizedRecords`。解析中は行の値を「画像を解析しています...」(+ `ActivityIndicator`) にして行を無効にする。`null` なら未検出の Alert、例外なら失敗の Alert。検出したらシートを開く。`onApplied` でシートを閉じ、Toast を出し、`setMetadataRevision((r) => r + 1)`。

- [ ] **Step 1: 失敗するテストを書く** (`import-confirm-content.test.tsx`。`clientAtom` 用に jotai Provider、`denormalizedMetadata.create` をモック、`Alert.alert` を spy)
  - `付与を押したときだけ API を呼ぶ`: 描画しただけでは呼ばれない。「この写真に付与」→ `create` が `{ path: { mediaId: "m1" }, body: { records }, throwOnError: true }` で 1 回、`onApplied` が 1 回。
  - `キャンセルでは API を呼ばない`: 「キャンセル」→ `onCancel` 1 回、`create` 0 回。
  - `失敗したら閉じずに Alert を出す`: `create` が reject → `Alert.alert("エラー", "メタデータの取得に失敗しました。")`、`onApplied` は呼ばれない、「この写真に付与」がまだ表示されている。
  - `送信中は二度押しできない`: `create` を解決しない Promise にして 2 回押す → `create` は 1 回。
  - `表示しない設定が ON なら注意を出す`: `hidesAutoMetadata` で「表示しない設定が ON のため、付与しても投稿には表示されません」が出る / false なら出ない。
  - `検出した項目を並べる`: Resonite の records で「撮影場所」「Home」が表示される。

- [ ] **Step 2: 失敗を確認**

Run: `cd apps/mobile && pnpm test src/components/metadata-editor/original-photo-import`
Expected: FAIL (`Cannot find module './import-confirm-content'`)

- [ ] **Step 3: 実装** — `ImportConfirmContent` は送信中フラグを `useRef` でも持ち、state の反映前の二度押しも防ぐ。`OriginalPhotoImport` のシートは既存のシートと同じく `BottomSheetModal` + `BottomSheetBackdrop` + `BottomSheetView` (`enableDynamicSizing`)。画面では「元の写真から読み込む」をトグルの行の直前に置き、`hidesAutoMetadata={current?.privacyMetadata ?? false}`、`mediaId={medias[index].id}`。

- [ ] **Step 4: 成功を確認**

Run: `cd apps/mobile && pnpm test && pnpm lint`
Expected: PASS / 新規エラーなし

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/metadata-editor "apps/mobile/src/app/status/[id]/metadata.tsx"
git commit -m "feat(metadata): 元の写真から撮影情報を読み込んで付与できるようにする"
```

---

### Task 3: 通しの確認と stacked PR

**Files:** なし

- [ ] **Step 1: 全テストと lint と型**

Run: `cd apps/mobile && pnpm test && pnpm lint && npx tsc --noEmit -p .`
Expected: PASS / 新規エラーなし

- [ ] **Step 2: シミュレータで spec「手動確認」を通す** (サインインが必要。未サインインならバンドルが通ることまで確認し、残りを PR に書く)

- [ ] **Step 3: push して draft PR**

```bash
git push -u origin claude/metadata-phase4-original-photo
gh pr create --draft --repo teyvat-project/Catalyst-Native --base claude/metadata-phase3-pins --head claude/metadata-phase4-original-photo
```

本文の先頭に「#79 (Phase 3) の上に積んだ PR。下のフェーズのマージ後にベースを付け替える」と書く。
