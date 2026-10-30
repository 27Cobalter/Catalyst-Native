# メタデータ編集 Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 投稿のオーナーがアプリから「自動設定されたメタデータを表示しない」を写真ごとに切り替えて保存できる編集画面 (`status/[id]/metadata`) を作る。後続フェーズの土台になる画面構造と保存モデルもここで作る。

**Architecture:** GET (`EpicleseStatusMetadataResponse`) → POST (`CreateMetadata`) の変換と判定は純粋関数として `src/models/epiclese-metadata-editor.ts` に置き、jest でテストする。画面は「写真ページャ＋サムネイル列＋設定リスト」で、状態は画面内の `useState`。保存は全写真分を 1 回の POST で送り、成功したら Jotai のリビジョンアトムを進めて投稿詳細に再取得させる。

**Tech Stack:** Expo / expo-router 58, React Navigation 7 (`usePreventRemove`), Jotai + jotai-family, Uniwind, `@natsuneko-laboratory/catalyst-sdk` 2026.10.26-beta.3, expo-image, @gorhom/bottom-sheet, jest (jest-expo)

**Spec:** `docs/superpowers/specs/2026-10-28-metadata-editor-phase1-design.md`

## Global Constraints

- 作業ディレクトリは `apps/mobile`。コマンドは `pnpm --filter mobile <script>` か `apps/mobile` で実行する。
- 保存 API は全置換。platform / world / users / reference は**読み込んだ値をそのまま送り返す**。
- API 呼び出しは SDK クライアントのみ (生の `fetch` を新しく書かない)。読み込みも保存も `account.credential.client` を使う。
  - 投稿: `client.catalyst.v11.status.id.get({ path: { id }, throwOnError: true })`
  - メタデータ: `client.epiclese.v1.tag.by.status.id.get({ path: { id }, throwOnError: true })`
  - プラットフォーム: `client.epiclese.v1.platforms.get({ throwOnError: true })` → `data.platforms`
  - 保存: `client.epiclese.v1.tag.by.status.id.create({ path: { id }, body, throwOnError: true })`
- SDK の型は `@natsuneko-laboratory/catalyst-sdk` から直接 import できる: `CreateMetadata`, `EpicleseStatusMetadataResponse`, `EpiclesePlatformResponse`。
- スタイルは Uniwind のユーティリティクラスと `@/components/design-system` を使う。インラインスタイル / StyleSheet は使わない (`@gorhom/bottom-sheet` の `backgroundStyle` 等、既存コードがやむを得ず使っている箇所に合わせるのは可)。
- 文言 (spec で固定):
  - ヘッダー: タイトル「メタデータ」、左「キャンセル」、右「保存」
  - メニュー項目: 「メタデータを編集」(アイコン lucide `Tags`)
  - セクション見出し: 「この写真の設定」
  - トグル: 「自動設定されたメタデータを表示しない」
  - トグル説明: 「ResoniteScreenshotExtensions や VRCX などのツールで画像に埋め込まれたメタデータがある場合でも、表示したくないときは ON にしてください。編集画面から追加したメタデータは引き続き表示されます。」
  - 一括適用ボタン: 「すべての写真に適用…」、Phase 1 の選択肢: 「表示設定」
  - 破棄確認: タイトル「変更を破棄しますか？」、ボタン「破棄」(destructive) /「編集を続ける」(cancel)
  - 他人の投稿 / 未ログイン: 「この投稿のメタデータは編集できません」
- 型チェック: `npx tsc --noEmit -p apps/mobile` の `Property 'className' does not exist` 系のエラーは既知の pnpm hoisting 由来なので無視してよい。それ以外の新規エラーは出さない。
- コミットメッセージ末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` を付ける (本文と空行 1 行で区切る)。

## Review Focus

1. **Epiclese にあって投稿に無い写真 ID** (写真が差し替え・削除された古いメタデータ): 送信配列に混ぜない。混ぜるとサーバー側で不明な media に書き込もうとする。→ Task 1 にテスト `投稿に無い写真のメタデータは捨てる` を追加済み。
2. **`externalUrl: null` / `world: null` / `platform: null` を null のまま送る**: サーバーの zod (`url()`, オブジェクト) で 400 になり、トグルだけ変えた保存すら失敗する。→ Task 1 の往復テストで `undefined` になることを固定済み。
3. **保存成功後の `router.back()` で破棄確認が出る**: `usePreventRemove` の条件が保存直後もまだ dirty のままだと、成功したのに確認ダイアログが出る。→ Task 3 で「保存済みフラグを立ててから戻る」ことを手順に入れ、Task 5 の手動確認で見る。
4. **保存ボタン連打による二重 POST**: 全置換なので害は小さいが、2 回目が古い状態で上書きし得る。→ Task 3 で送信中は保存ボタンを無効化。
5. **読み込みの一部失敗 (例: platforms だけ 500)**: 部分データで編集させると、送り返す値が欠けて全置換で消える。→ Task 2 で投稿 → (メタデータ, プラットフォーム) の取得をすべて待ち、どれか失敗したらエラー画面 (再読み込み) にする。

---

### Task 1: 編集モデル (純粋関数)

**Files:**
- Create: `apps/mobile/src/models/epiclese-metadata-editor.ts`
- Test: `apps/mobile/src/models/epiclese-metadata-editor.test.ts`

**Interfaces:**
- Produces:
  - `type EditableMediaMetadata = CreateMetadata[number]`
  - `type ApplyToAllField = "privacyMetadata"` (後続フェーズで `"world"` 等を足す)
  - `toEditableMetadata(medias: { id: string; privacyMetadata?: boolean }[], response: EpicleseStatusMetadataResponse, platforms: EpiclesePlatformResponse[]): EditableMediaMetadata[]`
  - `isMetadataConfigured(item: EditableMediaMetadata): boolean`
  - `applyToAll(items: EditableMediaMetadata[], sourceIndex: number, field: ApplyToAllField): EditableMediaMetadata[]`
  - `isMetadataDirty(initial: EditableMediaMetadata[], current: EditableMediaMetadata[]): boolean`

- [ ] **Step 1: 失敗するテストを書く**

`epiclese.test.ts` と同じく `describe` / `it` (日本語) で書く。フィクスチャ:

```ts
const platforms = [
  { id: "p-vrchat", name: "VRChat", description: "", url: null, startAt: null },
  { id: "p-resonite", name: "Resonite", description: "", url: null, startAt: null },
];
const platformObj = platforms[0]; // レスポンス内の platform オブジェクトとして使う
const author = { id: "a-1", platformIdentifier: "usr_1", platform: platformObj, name: "Author" };
```

テストと期待値:

- `toEditableMetadata` / `Web 版 transform と同じ送信内容になる (往復)`:
  入力 `medias = [{ id: "m1", privacyMetadata: true }]`、`response.m1 = { platform: "VRChat", world: { id: "w-1", platformIdentifier: "wrld_1", platform: platformObj, name: "Home", author }, users: [{ id: "u-1", screenName: "a", displayName: "A", profile: null }], reference: [ピン A: externalUrl "https://booth.pm/ja/items/1", description "desc", order 0, reference "i-1", imageUrl "x"; ピン B: externalUrl null, description "", order 1, reference "i-2", imageUrl null, author.platform null], additionalData: { World: "Home" } }`
  期待値 (`toEqual`):
  ```ts
  [{
    id: "m1",
    platform: "p-vrchat",
    world: { id: "w-1", platformIdentifier: "wrld_1", platform: "p-vrchat", name: "Home",
             author: { id: "a-1", platformIdentifier: "usr_1", platform: "p-vrchat", name: "Author" } },
    users: [{ id: "u-1" }],
    reference: [
      { x, y, order: 0, reference: "i-1", type, name, description: "desc", externalUrl: "https://booth.pm/ja/items/1",
        author: { id: "a-1", platformIdentifier: "usr_1", platform: "p-vrchat", name: "Author" } },
      { x, y, order: 1, reference: "i-2", type, name, description: "", externalUrl: undefined,
        author: { id: "a-1", platformIdentifier: "usr_1", platform: "", name: "Author" } },
    ],
    privacyMetadata: true,
  }]
  ```
  加えて `expect(result[0].reference).toHaveLength(2)`、`expect(result[0].reference[0]).not.toHaveProperty("imageUrl")`、`expect(result[0]).not.toHaveProperty("additionalData")`。
- `world が null なら undefined、world.platform が null なら ""`: `world: null` → `world` が `undefined`。別ケースで `world.platform: null`・`world.author: null` → `world.platform === ""`、`world.author === null`。
- `プラットフォーム名が一覧に無ければ platform は undefined`: `platform: "Unknown"` と `platform: null` の両方で `undefined`。
- `メタデータが無い写真は空で補い、投稿の写真順に並べる`: `medias = [m1, m2, m3]`、response は m3 と m1 だけ → 結果の `id` 順が `["m1","m2","m3"]`、m2 は `{ id: "m2", reference: [], privacyMetadata: false }`。
- `投稿に無い写真のメタデータは捨てる`: response に `m-deleted` があっても結果に含まれない (`length` が medias と同じ)。
- `privacyMetadata は投稿の medias から読み、未定義なら false`。
- `isMetadataConfigured`: `{ id, reference: [], privacyMetadata: false }` → false。`platform` / `world` / `users` 1 件以上 / `reference` 1 件以上 / `privacyMetadata: true` のそれぞれ単独で true。`users: []` だけなら false。
- `applyToAll`: 3 件で `sourceIndex = 1` の `privacyMetadata: true` → 全件 true。他のフィールド (platform, world, reference) は各写真の元の値のまま (`toBe` で同一参照でなくてよいが `toEqual` で不変)。元配列を変更しない。
- `isMetadataDirty`: 同じ内容の別インスタンス → false。1 件の `privacyMetadata` を変える → true。

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd apps/mobile && pnpm test src/models/epiclese-metadata-editor.test.ts`
Expected: FAIL (`Cannot find module './epiclese-metadata-editor'`)

- [ ] **Step 3: `src/models/epiclese-metadata-editor.ts` を実装**

ファイル冒頭に、なぜこの変換が要るか (保存 API が全置換で、未編集の項目も送り返す必要がある) を 2〜3 行のコメントで書く。変換規則は spec「最重要の制約」のとおり。`users` は `{ id }` だけに、`reference` は `imageUrl` を落とし、`externalUrl: null → undefined`、`author.platform → platform?.id ?? ""`。`isMetadataDirty` は両配列の `JSON.stringify` 比較でよい (どちらも `toEditableMetadata` 由来でキー順が揃うため)。

- [ ] **Step 4: テストが通ることを確認**

Run: `cd apps/mobile && pnpm test src/models/epiclese-metadata-editor.test.ts`
Expected: PASS (全ケース)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/models/epiclese-metadata-editor.ts apps/mobile/src/models/epiclese-metadata-editor.test.ts
git commit -m "feat(metadata): メタデータ編集用の変換と判定を追加"
```

---

### Task 2: ルート移動・導線・編集画面 (読み込み・表示・トグル)

**Files:**
- Move: `apps/mobile/src/app/status/[id].tsx` → `apps/mobile/src/app/status/[id]/index.tsx` (Step 1 では中身を変えない)
- Modify: `apps/mobile/src/app/status/[id]/index.tsx` (Step 3: `type MenuAction`、`handleMenuAction` の switch、`isMyself` ブロックのメニュー項目、`withUniwind` のアイコン定義)
- Modify: `apps/mobile/src/app/_layout.tsx` (`Stack.Screen name="status/[id]"` 周辺)
- Create: `apps/mobile/src/app/status/[id]/metadata.tsx`
- Create: `apps/mobile/src/components/metadata-editor/photo-pager.tsx`
- Create: `apps/mobile/src/components/metadata-editor/thumbnail-strip.tsx`

**Interfaces:**
- Consumes: Task 1 の `toEditableMetadata`, `isMetadataConfigured`, `EditableMediaMetadata`
- Produces:
  - `PhotoPager({ medias: Media[]; index: number; onIndexChange: (index: number) => void })`: 横ページング (`FlatList horizontal pagingEnabled`)。`index` が外から変わったら `scrollToIndex` で追従する、制御コンポーネント。画像は `expo-image` + `getCdnUrl({ src: media.url, variant: "post-details", width: 画面幅, aspect })`、`contentFit="contain"`。高さは画面幅の正方形でよい。Phase 3 でピン編集をこの上に重ねる前提なので、`MediaCarousel` は流用しない (保存・全画面表示など余計な機能を持つため)。
  - `ThumbnailStrip({ medias: Media[]; index: number; configured: boolean[]; onSelect: (index: number) => void })`: 横スクロールのサムネイル列。`getCdnUrl` の `variant: "upload-thumbnail"`。選択中は枠線で強調、`configured[i]` が true なら右上に ✓ (lucide `CheckCircle2`)。
  - 画面の状態 (Task 3, 4 が使う): `items: EditableMediaMetadata[]`, `initialItems: EditableMediaMetadata[]`, `index: number`, `setItems`

- [ ] **Step 1: ルートを移動して動作を確認**

`git mv "apps/mobile/src/app/status/[id].tsx" "apps/mobile/src/app/status/[id]/index.tsx"`。`_layout.tsx` の `name="status/[id]"` を `name="status/[id]/index"` に変え、その下に `name="status/[id]/metadata"` (`options={{ title: "メタデータ", headerBackTitle: "キャンセル" }}`) を足す。

Run: `cd apps/mobile && pnpm lint`
Expected: 新規エラーなし。シミュレータでタイムラインから投稿詳細を開けること (`/status/:id` が引き続き解決される)。

- [ ] **Step 2: Commit (移動だけの差分にする)**

```bash
git add -A apps/mobile/src/app/status apps/mobile/src/app/_layout.tsx
git commit -m "refactor(status): 投稿詳細を status/[id]/index へ移す"
```

- [ ] **Step 3: 投稿詳細メニューに導線を追加**

`MenuAction` に `"editMetadata"` を足し、`handleMenuAction` で ``router.push(`/status/${id}/metadata`)``。`isMyself` ブロックの「編集する」と `CatalystDivider` の後、「削除する」の前に `CatalystActionSheetItem icon={UniTags} title="メタデータを編集"` と `CatalystDivider className="ml-14 w-auto"` を足す (`const UniTags = withUniwind(Tags)`、既存の `UniPencil` と同じ書き方)。

- [ ] **Step 4: `PhotoPager` と `ThumbnailStrip` を実装**

上の Interfaces どおり。写真 1 枚のときは `ThumbnailStrip` を描画しない (呼び出し側で分岐)。

- [ ] **Step 5: `status/[id]/metadata.tsx` を実装 (保存以外)**

- `account` (`accountAtom`) が無ければ、API を呼ばずに `CatalystEmptyState` で「この投稿のメタデータは編集できません」。
- ログイン中なら、まず投稿を取得して所有者を判定する。`status.user.id !== account.user.id` なら同じ表示にして、メタデータ・プラットフォームは取得しない。
- 所有者なら、メタデータとプラットフォームを `Promise.all` で取得し、`toEditableMetadata(status.medias, metadata, platforms)` を `items` と `initialItems` に入れる。投稿を含むどれかの取得が失敗したらエラー表示 + 「再読み込み」ボタン (押すと最初から再取得)。読み込み中は `ActivityIndicator` (album/[id]/edit.tsx と同じ)。
- 本体: `ScrollView` の中に `PhotoPager` → (2 枚以上なら) `ThumbnailStrip` (`configured = items.map(isMetadataConfigured)`) → 見出し「この写真の設定」→ トグル行 (`CatalystSwitch`、`value={items[index].privacyMetadata ?? false}`、変更で `items[index]` の `privacyMetadata` だけ差し替え) と説明文。
- ヘッダー右の「保存」は album/[id]/edit.tsx と同じ `Pressable` + `CatalystText` で置くが、この Task では `onPress` は未接続 (無効表示) でよい。

- [ ] **Step 6: 確認**

Run: `cd apps/mobile && pnpm lint && pnpm test`
Expected: lint 新規エラーなし、テスト全件 PASS。シミュレータで:
- 自分の投稿のメニューに「メタデータを編集」が出て、編集画面が開く。他人の投稿・未ログインではメニューに出ない。
- 写真の切替 (スワイプとサムネイルタップが同期)、✓ 表示、トグル操作ができる。

- [ ] **Step 7: Commit**

```bash
git add "apps/mobile/src/app/status/[id]" apps/mobile/src/components/metadata-editor
git commit -m "feat(metadata): メタデータ編集画面を追加 (自動設定メタデータを隠す)"
```

---

### Task 3: 保存・破棄確認・投稿詳細の再取得

**Files:**
- Create: `apps/mobile/src/models/atoms/epiclese-metadata.ts`
- Modify: `apps/mobile/src/app/status/[id]/metadata.tsx`
- Modify: `apps/mobile/src/app/status/[id]/index.tsx` (データ取得の `useEffect`。移動前の 205〜247 行付近、依存配列 `[id, account, client]`)

**Interfaces:**
- Consumes: Task 1 の `isMetadataDirty`、Task 2 の画面状態
- Produces: `metadataRevisionAtomFamily: (statusId: string) => PrimitiveAtom<number>` (初期値 0)。`reactions.ts` と同じく `jotai-family` の `atomFamily` で作る。

- [ ] **Step 1: リビジョンアトムを作り、投稿詳細を追従させる**

投稿詳細で `const metadataRevision = useAtomValue(metadataRevisionAtomFamily(id))` を読み、データ取得 `useEffect` の依存配列に足す (取得処理自体は変えない)。

- [ ] **Step 2: 保存を実装**

`handleSave`: 送信中フラグを立てる → `create({ path: { id }, body: items, throwOnError: true })` → 成功したら `setRevision((r) => r + 1)`、保存済みフラグ (ref) を立ててから `router.back()`。失敗したら `Alert.alert("エラー", "メタデータの保存に失敗しました")` で留まり、`items` は保持。送信中は「保存」を無効化し、album/[id]/edit.tsx と同じ全面オーバーレイの `ActivityIndicator` を出す。`isMetadataDirty(initialItems, items)` が false のときも「保存」は無効。

- [ ] **Step 3: 破棄確認を実装**

`usePreventRemove` / `useNavigation` は `@react-navigation/native` から import する。

`usePreventRemove(isDirty && !isSaved, ({ data }) => Alert.alert("変更を破棄しますか？", undefined, [{ text: "編集を続ける", style: "cancel" }, { text: "破棄", style: "destructive", onPress: () => navigation.dispatch(data.action) }]))`。ヘッダー左の「キャンセル」は `router.back()` を呼ぶだけ (確認は `usePreventRemove` が拾う)。

`isSaved` は state。保存成功時は `setIsSaved(true)` だけを行い、`router.back()` は `useEffect(() => { if (isSaved) router.back(); }, [isSaved])` で呼ぶ。こうすると `usePreventRemove` が解除されたレンダーの後に戻るので、**保存成功後の back で確認が出ない**。Step 2 の「保存済みフラグを立ててから `router.back()`」はこの形で実装する。

- [ ] **Step 4: 確認**

Run: `cd apps/mobile && pnpm lint && pnpm test`
Expected: 新規エラーなし、PASS。シミュレータで:
- トグルを変えて「保存」→ 投稿詳細に戻り、確認ダイアログは出ない。詳細が再取得される (ネットワークログか表示で確認)。
- トグルを変えて「キャンセル」/ スワイプバック → 「変更を破棄しますか？」。「編集を続ける」で留まり、「破棄」で戻る。
- 何も変えずに「キャンセル」→ 確認なしで戻る。
- 機内モードで「保存」→ エラーの Alert、画面に留まり、トグルの状態は保持。

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/models/atoms/epiclese-metadata.ts "apps/mobile/src/app/status/[id]"
git commit -m "feat(metadata): メタデータの保存と破棄確認を追加"
```

---

### Task 4: すべての写真に適用

**Files:**
- Create: `apps/mobile/src/components/metadata-editor/apply-to-all-sheet.tsx`
- Modify: `apps/mobile/src/app/status/[id]/metadata.tsx`

**Interfaces:**
- Consumes: Task 1 の `applyToAll`, `ApplyToAllField`
- Produces: `ApplyToAllSheet` — `forwardRef<BottomSheetModal, { options: { field: ApplyToAllField; label: string }[]; onSelect: (field: ApplyToAllField) => void }>`。投稿詳細のメニュー (`status/[id]/index.tsx` の `BottomSheetModal` + `BottomSheetBackdrop` + `CatalystActionSheetItem`) と同じ見た目にする。選んだらシートを閉じて `onSelect`。

- [ ] **Step 1: シートを実装し、画面に「すべての写真に適用…」ボタンを置く**

ボタンは設定リストの下、`status.medias.length >= 2` のときだけ。`CatalystButton` (tone は secondary 相当、lucide `Copy` アイコン)。Phase 1 の `options` は `[{ field: "privacyMetadata", label: "表示設定" }]`。`onSelect` で `setItems((prev) => applyToAll(prev, index, field))`。

- [ ] **Step 2: 確認**

Run: `cd apps/mobile && pnpm lint`
Expected: 新規エラーなし。シミュレータで 3 枚の投稿の 2 枚目だけ ON →「すべての写真に適用…」→「表示設定」で全写真が ON、✓ が全部付く。1 枚の投稿ではボタンが出ない。

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/metadata-editor/apply-to-all-sheet.tsx "apps/mobile/src/app/status/[id]/metadata.tsx"
git commit -m "feat(metadata): メタデータをすべての写真に適用できるようにする"
```

---

### Task 5: 通しの手動確認

**Files:** なし (問題があれば該当 Task のファイルを直す)

- [ ] **Step 1: 全テストと lint**

Run: `cd apps/mobile && pnpm test && pnpm lint`
Expected: PASS / 新規エラーなし

- [ ] **Step 2: シミュレータで spec「手動確認」を通す**

- 自分の投稿のメニューに「メタデータを編集」が出て、他人の投稿には出ない。
- トグルを変えて保存すると、投稿詳細に戻ってメタデータ表示が更新される。
- **Web でピンとワールドを設定した投稿を、アプリでトグルだけ変えて保存しても、ピンとワールドが残る** (Web の `/status/:id/metadata` と投稿詳細のピン表示で確認)。
- 未保存の状態でキャンセル / スワイプバックすると破棄確認が出る。保存成功後は出ない。
- 2 枚以上の投稿で「すべての写真に適用…」→「表示設定」が全写真に反映される。

- [ ] **Step 3: 直した箇所があればコミット**

```bash
git add -A apps/mobile
git commit -m "fix(metadata): 通し確認での修正"
```
