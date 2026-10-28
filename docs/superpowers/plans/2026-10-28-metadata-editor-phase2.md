# メタデータ編集 Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 編集画面で写真ごとにプラットフォーム・ワールド (登録を含む)・写っている人を設定して保存できるようにする。

**Architecture:** 変換と判定は Phase 1 と同じ `src/models/epiclese-metadata-editor.ts` に純粋関数で足す。編集画面に 3 行を足し、プラットフォームはボトムシート、ワールドと写っている人はフルスクリーンの `Modal` (pageSheet) で選ぶ。モーダルは選んだ値をコールバックで返すだけで、状態は編集画面の `useState` に残す。検索は新しい `useDebouncedSearch` フックで 300ms debounce する。

**Tech Stack:** Expo / expo-router 58, React Native `Modal`, Jotai, Uniwind, `@natsuneko-laboratory/catalyst-sdk` 2026.10.26-beta.3, @gorhom/bottom-sheet, jest (jest-expo) + @testing-library/react-native v14 (async API)

**Spec:** `docs/superpowers/specs/2026-10-28-metadata-editor-phase2-design.md` (前提: `docs/superpowers/specs/2026-10-28-metadata-editor-phase1-design.md`)

## Global Constraints

- ブランチ `claude/metadata-phase2-text` (Phase 1 の `claude/metadata-settings-phased-8d1023` の上)。PR はベースを Phase 1 のブランチにした通常の draft PR。GitHub の stacked PR 機能は使わない。
- 保存は Phase 1 のまま全置換。Phase 2 は `platform` / `world` / `users` だけを書き換え、`reference` と `privacyMetadata` は触らない。
- SDK 呼び出し (どれも `useAtomValue(clientAtom)` のクライアント、`throwOnError: true`):
  - ワールド検索 `client.epiclese.v1.worlds.get({ query: { q, platform } })` → `data.items`
  - ワールド登録 `client.epiclese.v1.worlds.create({ body: { name, platformIdentifier, platform, author } })` → `data.world`
  - 作者検索 `client.epiclese.v1.authors.get({ query: { q, platform } })` → `data.items`
  - 作者登録 `client.epiclese.v1.authors.create({ body: { name, platformIdentifier, platform? } })` → `data.author`
  - ユーザー検索 `client.egeria.v1.search.get({ query: { q } })` → `data.users`
- SDK の型: `EpicleseWorldResponse`, `EpicleseAuthorResponse`, `EpiclesePlatformResponse`, `UserResponse`, `CreateMetadata` を `@natsuneko-laboratory/catalyst-sdk` から import。
- `usePreventRemove` 等のナビゲーションフックは `expo-router` から import する (`@react-navigation/native` は同梱版と別物でクラッシュする)。
- ボトムシートは `ApplyToAllSheet` と同じ形 (React 19 の `ref` prop + `open()` を持つ handle、`BottomSheetModal` + `BottomSheetBackdrop`)。
- スタイルは Uniwind のユーティリティクラスと `@/components/design-system`。インラインスタイルは既存シートと同じ `backgroundStyle` 等と、計算値の幅・高さだけ。
- 文言 (spec で固定):
  - 行: 「プラットフォーム」「ワールド」「写っている人」、未設定は「未選択」、ワールド行の無効表示「先にプラットフォームを選択してください」、人数「n 人」
  - プラットフォームのシート: 先頭「選択しない」
  - 一括適用の選択肢 (順): 「プラットフォームとワールド」「写っている人」「表示設定」
  - ワールド検索: プレースホルダ「ワールド名もしくは ID を入力...」、0 件「一致するワールドが見つかりませんでした。」、「選択を外す」、「見つからない場合はワールドを登録」
  - ワールド登録: タイトル「ワールド情報を入力」、「ワールド名」(説明「ワールドの名前を正確に入力してください」)、「ワールドID」(説明「ワールドID もしくは URL を入力してください。」)、「ワールド作者」(説明「ワールドの作者を選択、もしくは入力してください。」)、ボタン「保存」、失敗「ワールド情報の保存に失敗しました」
  - 作者検索: 「作者名もしくは ID を入力...」、0 件「一致する作者が見つかりませんでした。」、「見つからない場合は作者を登録」
  - 作者登録: タイトル「作者情報を入力」、「プラットフォーム」(説明「この作者が所属するプラットフォームを選択します。写真自体のプラットフォームと異なっていても構いません（例：BOOTH のショップのみを持つ作者）」、選択肢「なし（BOOTH のショップなど）」)、「作者名」、「ユーザー ID」、失敗「作者情報の保存に失敗しました」
  - 写っている人: 「表示名やユーザー名で検索...」、0 件「一致するユーザーが見つかりませんでした。」、0 人「ユーザーが選択されていません」、「n/10 人」、上限「最大 10 人まで選べます」、ヘッダー「キャンセル」「完了」
  - モーダル内の取得失敗: 「読み込みに失敗しました」+「再読み込み」
  - エラーは `Alert.alert("エラー", <文言>)`
- ID のプレースホルダ (プラットフォーム名の小文字で引く。無ければ VRChat のもの):
  - ワールド: vrchat `wrld_a5e9ec13-36b1-4e63-ae0c-dab9023401f9` / cluster `https://cluster.mu/w/20d14291-1d6b-4ad9-9f4e-fe8b87dd6f0c` / resonite `https://go.resonite.com/world/U-esnya/R-3acf68b3-b78b-4a8c-96ef-97a2f744602f`
  - 作者: vrchat `usr_f0ae733a-b3ea-4462-b9a7-8c386e860ac1` / cluster `https://cluster.mu/u/ichiganryuta` / resonite `U-esnya` / なし `https://your-shop.booth.pm/`
- 画面のテストは `src/app` の外 (`src/components/metadata-editor/`) に置く (`src/app` 配下はルートになる)。RNTL v14 の `render` / `fireEvent` は `await` する。
- 型チェック `npx tsc --noEmit -p apps/mobile` の `Property 'className'` 系は既知の誤検知なので無視。他の新規エラーは出さない。
- コミットは署名付き (1Password)。本文末尾に空行 1 行を挟んで `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。

## Review Focus

1. **プラットフォームを同じ値で選び直したらワールドが消える**: 同じ値ならワールドを残すのが Web と同じ挙動。→ Task 1 のテスト `同じプラットフォームならワールドを残す`。
2. **検索の古いレスポンスが新しい結果を上書きする** (速く打つと 2 文字目の結果の後に 1 文字目の結果が届く): 最後に打った語の結果だけを出す。→ Task 2 のテスト `古い問い合わせの結果は捨てる`。
3. **写っている人の 11 人目**: サーバーの zod (最大 10) で保存ごと 400 になる。→ Task 1 の `toggleUser` と Task 4 の画面テスト。
4. **ワールド登録フォームで作者を選んで戻ったら、入力中のワールド名・ID が消える**: ステップを切り替えても登録フォームの入力は保持する。→ Task 6 でフォームの値をモーダル (親) の state に置く。手動確認で見る。
5. **一括適用でワールドだけ / プラットフォームだけがコピーされる**: 写真ごとにプラットフォームとワールドの組が食い違うと、別プラットフォームのワールドが付く。→ Task 1 の `applyToAll` テストで組でコピーされることを固定。

---

### Task 1: 編集モデルの追加関数

**Files:**
- Modify: `apps/mobile/src/models/epiclese-metadata-editor.ts`
- Test: `apps/mobile/src/models/epiclese-metadata-editor.test.ts`

**Interfaces:**
- Produces:
  - `type ApplyToAllField = "privacyMetadata" | "platformAndWorld" | "users"`
  - `type EditableWorld = NonNullable<EditableMediaMetadata["world"]>`
  - `type UserProfile = { displayName: string; screenName: string; iconUrl: string | null }`
  - `const MAX_USERS = 10`
  - `setPlatform(item: EditableMediaMetadata, platformId: string | undefined): EditableMediaMetadata`
  - `toEditableWorld(world: EpicleseWorldResponse): EditableWorld` (Phase 1 の非公開 `toWorld` を、引数の型を `EpicleseWorldResponse` に合わせてこれに置き換え、`toEditableMetadata` からも使う)
  - `toggleUser(users: { id: string }[], userId: string): { users: { id: string }[]; limited: boolean }`
  - `collectUserProfiles(response: EpicleseStatusMetadataResponse): Record<string, UserProfile>`
  - `toUserProfile(user: UserResponse): UserProfile` (`iconUrl: user.profile?.iconUrl ?? null`)
  - `applyToAll` は同じシグネチャのまま `field` を拡張

- [ ] **Step 1: 失敗するテストを書く** (既存の describe に足す。フィクスチャは既存の `platforms` / `author` / `responseItem` / `empty` を使う)

- `setPlatform`:
  - `違うプラットフォームならワールドを消す`: `{ ...empty("m1"), platform: "p-vrchat", world: W }` に `"p-resonite"` → `platform === "p-resonite"`、`world` が `undefined`。
  - `同じプラットフォームならワールドを残す`: 同じ入力に `"p-vrchat"` → `world` が `W` のまま。
  - `undefined ならプラットフォームとワールドを消す`。
  - `reference と privacyMetadata は変えない`: ピン 1 つ・`privacyMetadata: true` の入力で、結果の `reference` / `privacyMetadata` が `toEqual` で同じ。
- `toEditableWorld`: `{ id: "w-1", platformIdentifier: "wrld_1", platform: null, name: "Home", author: { ...author, platform: null } }` → `{ id: "w-1", platformIdentifier: "wrld_1", platform: "", name: "Home", author: { id: "a-1", platformIdentifier: "usr_1", platform: "", name: "Author" } }`。`author: null` → `author: null`。
- `toggleUser`:
  - 追加: `toggleUser([{ id: "u1" }], "u2")` → `{ users: [{ id: "u1" }, { id: "u2" }], limited: false }`
  - 解除: `toggleUser([{ id: "u1" }, { id: "u2" }], "u1")` → `{ users: [{ id: "u2" }], limited: false }`
  - 10 人目まで追加できる: 9 人に足す → `users.length === 10`, `limited: false`
  - 11 人目は追加しない: 10 人に足す → 同じ 10 人、`limited: true`
  - 上限中でも解除はできる: 10 人から 1 人外す → 9 人、`limited: false`
- `collectUserProfiles`: m1 に u1、m2 に u1 と u2 (u2 は `profile: null`) → `{ u1: { displayName, screenName, iconUrl }, u2: { ..., iconUrl: null } }`、キーは 2 つ。
- `applyToAll`:
  - `platformAndWorld は platform と world を組でコピーする`: 3 件、source (index 1) が `platform: "p-resonite", world: W2`、他は `platform: "p-vrchat", world: W1` やワールドなし → 全件 `platform === "p-resonite"` かつ `world` が `W2`。各件の `users` / `reference` / `privacyMetadata` は元のまま。
  - `source にワールドが無ければ全件のワールドを消す`: source が `platform: "p-vrchat"` だけ → 全件 `world` が `undefined`。
  - `users は users だけをコピーする`。
- 往復: `ワールドを差し替えてもピンは落ちない`: Phase 1 の往復テストの入力を `toEditableMetadata` に通し、`setPlatform` でなく `{ ...item, world: toEditableWorld(別のワールド) }` にした結果の `reference` が元と `toEqual`、長さ 2。

- [ ] **Step 2: 失敗を確認**

Run: `cd apps/mobile && pnpm test src/models/epiclese-metadata-editor.test.ts`
Expected: FAIL (`setPlatform` などが export されていない / `applyToAll` の新しい field で期待どおりにならない)

- [ ] **Step 3: 実装**

`applyToAll` の `platformAndWorld` は `{ ...item, platform: source.platform, world: source.world }`、`users` は `{ ...item, users: source.users }`。`toggleUser` は既に含まれていれば除き、含まれず `users.length >= MAX_USERS` なら `limited: true` で元の配列を返す。

- [ ] **Step 4: 成功を確認**

Run: `cd apps/mobile && pnpm test src/models/epiclese-metadata-editor.test.ts`
Expected: PASS (Phase 1 の 10 件を含む全件)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/models/epiclese-metadata-editor.ts apps/mobile/src/models/epiclese-metadata-editor.test.ts
git commit -m "feat(metadata): プラットフォーム・ワールド・写っている人の編集関数を追加"
```

---

### Task 2: debounce 付き検索フック

**Files:**
- Create: `apps/mobile/src/hooks/use-debounced-search.ts`
- Test: `apps/mobile/src/hooks/use-debounced-search.test.ts`

**Interfaces:**
- Produces: `useDebouncedSearch<T>(query: string, fetcher: (q: string) => Promise<T[]>, options?: { delay?: number; skipEmpty?: boolean }): { results: T[]; isLoading: boolean; isError: boolean; retry: () => void }`。`delay` 既定 300。`skipEmpty` が true で `query.trim() === ""` なら取得せず `results: []`。`fetcher` は呼び出し側で `useCallback` する前提で、変わったら取り直す。

- [ ] **Step 1: 失敗するテストを書く** (`renderHook` + `jest.useFakeTimers()`)

- `300ms 待ってから最後の語で 1 回だけ取得する`: query を `"a"` → `"ab"` と 100ms 以内に変え、300ms 進める → `fetcher` は 1 回、引数 `"ab"`。
- `古い問い合わせの結果は捨てる`: `"a"` の fetcher は遅い Promise、`"ab"` は速い Promise。`"ab"` の結果の後に `"a"` が解決しても `results` は `"ab"` のもの。
- `skipEmpty なら空欄で取得しない`: `skipEmpty: true`, query `"  "` → 300ms 後も `fetcher` 未呼び出し、`results` は `[]`、`isLoading` false。
- `失敗したら isError、retry で取り直す`: fetcher が reject → `isError` true。`retry()` 後に成功 → `isError` false、`results` が入る。

- [ ] **Step 2: 失敗を確認**

Run: `cd apps/mobile && pnpm test src/hooks/use-debounced-search.test.ts`
Expected: FAIL (`Cannot find module './use-debounced-search'`)

- [ ] **Step 3: 実装** — 呼び出しごとの連番を ref に持ち、解決時に最新の連番でなければ捨てる。`retry` は連番用とは別の state を進めて effect を再実行させる。

- [ ] **Step 4: 成功を確認**

Run: `cd apps/mobile && pnpm test src/hooks/use-debounced-search.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/hooks/use-debounced-search.ts apps/mobile/src/hooks/use-debounced-search.test.ts
git commit -m "feat(hooks): debounce 付きの検索フックを追加"
```

---

### Task 3: 編集画面の行・プラットフォームのシート・一括適用の選択肢

**Files:**
- Create: `apps/mobile/src/components/metadata-editor/metadata-row.tsx`
- Create: `apps/mobile/src/components/metadata-editor/platform-sheet.tsx`
- Modify: `apps/mobile/src/app/status/[id]/metadata.tsx`

**Interfaces:**
- Consumes: Task 1 の `setPlatform`, `collectUserProfiles`, `UserProfile`, `ApplyToAllField`
- Produces:
  - `MetadataRow({ label: string; value: ReactNode; disabled?: boolean; onPress: () => void })`: 左にラベル、右に値と `ChevronRight`。`disabled` で押せず薄く表示。アルバムフォームの行 (`min-h-16 ... bg-light-background px-5 py-3 dark:bg-dark-surface`) と同じ見た目で、行間は `CatalystDivider className="ml-5 w-auto"`。
  - `PlatformSheet` — `{ ref: React.Ref<PlatformSheetRef>; platforms: EpiclesePlatformResponse[]; value: string | undefined; onSelect: (platformId: string | undefined) => void }`、`PlatformSheetRef = { open: () => void }`。先頭「選択しない」、選択中に `Check`。選んだら閉じて `onSelect`。
  - 画面の状態 (Task 4〜6 が使う): `platforms: EpiclesePlatformResponse[]` (読み込み時に保持)、`userProfiles: Record<string, UserProfile>`、`updateCurrent(updater: (item: EditableMediaMetadata) => EditableMediaMetadata)`

- [ ] **Step 1: 画面を拡張する**
  - 読み込み時に `platforms` と `collectUserProfiles(metadata)` を state に保持する。
  - 「この写真の設定」の見出しとトグルの間に 3 行を置く。ワールド行の値はワールド名 + (作者があれば) `・作者名`。写っている人の行は `CatalystAvatar size="sm"` を最大 3 つ重ねて「n 人」。`userProfiles` に無い ID のアバターは `fallback` に ID の先頭 8 文字を使う。0 人や未設定は「未選択」。
  - プラットフォーム行 → `PlatformSheet.open()`、`onSelect` で `updateCurrent((item) => setPlatform(item, platformId))`。ワールド行・写っている人の行の `onPress` はこの Task では空関数 (Task 4, 5 で接続)。
  - `APPLY_TO_ALL_OPTIONS` を spec の順 (「プラットフォームとワールド」`MapPin`、「写っている人」`Users`、「表示設定」`EyeOff`) にする。

- [ ] **Step 2: 確認**

Run: `cd apps/mobile && pnpm test && pnpm lint`
Expected: PASS / 新規エラーなし (`metadata-screen.test.tsx` の既存 2 件も通る。モックに `lucide-react-native` の新アイコン (`ChevronRight`, `Check`, `MapPin`, `Users`) と `@/components/metadata-editor/platform-sheet`, `metadata-row` を必要に応じて足す)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/metadata-editor "apps/mobile/src/app/status/[id]/metadata.tsx"
git commit -m "feat(metadata): プラットフォームの選択と編集項目の行を追加"
```

---

### Task 4: 写っている人の選択モーダル

**Files:**
- Create: `apps/mobile/src/components/metadata-editor/user-picker-modal.tsx`
- Test: `apps/mobile/src/components/metadata-editor/user-picker-modal.test.tsx`
- Modify: `apps/mobile/src/app/status/[id]/metadata.tsx`

**Interfaces:**
- Consumes: Task 1 の `toggleUser`, `toUserProfile`, `UserProfile`, `MAX_USERS`、Task 2 の `useDebouncedSearch`
- Produces: `UserPickerModal({ visible: boolean; users: { id: string }[]; profiles: Record<string, UserProfile>; onCancel: () => void; onDone: (users: { id: string }[], profiles: Record<string, UserProfile>) => void })`。開くたびに `users` から下書きを作り、「完了」で下書きと、検索結果から増えた分を足した `profiles` を返す。

- [ ] **Step 1: 失敗するテストを書く** (`clientAtom` を返す jotai Provider、`client.egeria.v1.search.get` をモック、fake timers で debounce を進める)
  - `11 人目は追加せずメッセージを出す`: `users` に 10 人、検索結果に u11 → u11 をタップしても「完了」の `onDone` の第 1 引数は 10 人のまま、「最大 10 人まで選べます」が表示される。
  - `キャンセルでは反映しない`: 1 人追加してから「キャンセル」→ `onCancel` が呼ばれ `onDone` は呼ばれない。
  - `完了で選んだ人と表示用情報を返す`: 0 人から u1 を追加 → `onDone([{ id: "u1" }], { u1: { displayName, screenName, iconUrl } })`。

- [ ] **Step 2: 失敗を確認**

Run: `cd apps/mobile && pnpm test src/components/metadata-editor/user-picker-modal.test.tsx`
Expected: FAIL (`Cannot find module './user-picker-modal'`)

- [ ] **Step 3: 実装** — `Modal animationType="slide" presentationStyle="pageSheet"`。ヘッダー (キャンセル / 完了)、「n/10 人」、チップ (× で外す、`accessibilityLabel` は「{表示名} を外す」)、`CatalystSearchField`、結果リスト (`skipEmpty: true`)。表示名が `userProfiles` に無いチップは ID の先頭 8 文字を出す。上限メッセージは次の追加操作か解除で消す。取得失敗は「読み込みに失敗しました」+「再読み込み」(`retry`)。

- [ ] **Step 4: 成功を確認**

Run: `cd apps/mobile && pnpm test src/components/metadata-editor/user-picker-modal.test.tsx`
Expected: PASS

- [ ] **Step 5: 画面に接続** — 写っている人の行で開き、`onDone` で `updateCurrent((item) => ({ ...item, users }))` と `setUserProfiles((prev) => ({ ...prev, ...profiles }))`。

- [ ] **Step 6: 確認して Commit**

Run: `cd apps/mobile && pnpm test && pnpm lint`
Expected: PASS / 新規エラーなし

```bash
git add apps/mobile/src/components/metadata-editor "apps/mobile/src/app/status/[id]/metadata.tsx"
git commit -m "feat(metadata): 写っている人を選べるようにする"
```

---

### Task 5: ワールド選択モーダル (検索・選択)

**Files:**
- Create: `apps/mobile/src/components/metadata-editor/world-picker/index.tsx`
- Create: `apps/mobile/src/components/metadata-editor/world-picker/world-search-step.tsx`
- Modify: `apps/mobile/src/app/status/[id]/metadata.tsx`

**Interfaces:**
- Consumes: Task 1 の `toEditableWorld`, `EditableWorld`、Task 2 の `useDebouncedSearch`
- Produces:
  - `WorldPickerModal({ visible: boolean; platform: EpiclesePlatformResponse; platforms: EpiclesePlatformResponse[]; value: EditableWorld | undefined; onCancel: () => void; onSelect: (world: EditableWorld | undefined) => void })`。内部に `step: "world-search" | "world-form" | "author-search" | "author-form"` を持つ (Task 6 で残り 3 つを足す)。開くたびに `"world-search"` から始める。
  - `WorldSearchStep({ platform; value; onSelect: (world: EpicleseWorldResponse) => void; onClear: () => void; onRegister: () => void })`

- [ ] **Step 1: 実装**
  - 検索は `useDebouncedSearch(q, fetchWorlds)` (`skipEmpty: false`、開いた直後は `q: ""` で一覧)。結果にワールド名と作者名、選択中 (`value?.id`) に `Check`。`value` が結果に無ければ先頭に出す (`value` は送信形式なので、表示にはワールド名と作者名だけを使う)。
  - 「選択を外す」は `value` があるときだけ。0 件は「一致するワールドが見つかりませんでした。」。末尾に「見つからない場合はワールドを登録」(この Task では `onRegister` は何もしない)。取得失敗は「読み込みに失敗しました」+「再読み込み」(`retry`)。
  - 選んだら `onSelect(toEditableWorld(world))`、外したら `onSelect(undefined)`。
  - 画面: ワールド行 (プラットフォーム設定時のみ有効) で開き、`onSelect` で `updateCurrent((item) => ({ ...item, world }))`。プラットフォームは `platforms.find((p) => p.id === current.platform)`。

- [ ] **Step 2: 確認**

Run: `cd apps/mobile && pnpm test && pnpm lint`
Expected: PASS / 新規エラーなし

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/metadata-editor "apps/mobile/src/app/status/[id]/metadata.tsx"
git commit -m "feat(metadata): ワールドを検索して選べるようにする"
```

---

### Task 6: ワールドと作者の登録

**Files:**
- Create: `apps/mobile/src/components/metadata-editor/world-picker/world-form-step.tsx`
- Create: `apps/mobile/src/components/metadata-editor/world-picker/author-search-step.tsx`
- Create: `apps/mobile/src/components/metadata-editor/world-picker/author-form-step.tsx`
- Create: `apps/mobile/src/components/metadata-editor/world-picker/placeholders.ts`
- Modify: `apps/mobile/src/components/metadata-editor/world-picker/index.tsx`

**Interfaces:**
- Consumes: Task 5 の `WorldPickerModal` の step、Task 2 の `useDebouncedSearch`
- Produces:
  - `placeholders.ts`: `getWorldIdPlaceholder(platform: EpiclesePlatformResponse | undefined): string`, `getAuthorIdPlaceholder(platform: EpiclesePlatformResponse | undefined): string` (`undefined` は「なし」のプレースホルダ。値は Global Constraints の表)
  - `WorldFormStep({ draft: WorldDraft; onChange: (draft: WorldDraft) => void; onPickAuthor: () => void; onSaved: (world: EpicleseWorldResponse) => void; platform })`、`type WorldDraft = { name: string; platformIdentifier: string; author: EpicleseAuthorResponse | null }`
  - `AuthorSearchStep({ platform; onSelect: (author: EpicleseAuthorResponse) => void; onRegister: () => void })`
  - `AuthorFormStep({ platform; platforms; onSaved: (author: EpicleseAuthorResponse) => void })`

- [ ] **Step 1: `placeholders.ts` のテストを書いて実装する**

Test: `apps/mobile/src/components/metadata-editor/world-picker/placeholders.test.ts` — `getWorldIdPlaceholder({ name: "cluster", ... })` が cluster の値、`{ name: "Unknown" }` が VRChat の値。`getAuthorIdPlaceholder(undefined)` が `https://your-shop.booth.pm/`。
Run: `cd apps/mobile && pnpm test src/components/metadata-editor/world-picker/placeholders.test.ts` → FAIL (module なし) → 実装 → PASS。

- [ ] **Step 2: 登録ステップを実装する**
  - **ワールド登録の下書き (`WorldDraft`) はモーダル (`index.tsx`) の state に置く。** 作者の検索・登録に行って戻っても名前と ID が消えないようにするため。下書きはモーダルを開くたびに空にする。
  - `WorldFormStep`: `CatalystTextField` 2 つと作者行 (`MetadataRow`)。名前と ID のどちらかが空なら「保存」無効。保存中は二度押しを防ぐ。`worlds.create` の `author` は `draft.author ? { id, name, platformIdentifier, platform: author.platform?.id } : null`、`platform` は写真のプラットフォーム ID。成功で `onSaved(data.world)` → モーダルが `onSelect(toEditableWorld(world))` して閉じる。失敗は Alert で入力を保持。
  - `AuthorSearchStep`: `authors.get` を `useDebouncedSearch` で。選んだら下書きの `author` にしてワールド登録へ戻る。
  - `AuthorFormStep`: プラットフォームの選択 (一覧 + 「なし（BOOTH のショップなど）」、初期値は写真のプラットフォーム。**`PlatformSheet` は使わず、ステップ内にチェック付きの行を並べる**。`BottomSheetModal` はルートのポータルに描画されるので、RN の `Modal` の中から開くとモーダルの裏に出てしまうため)、作者名、ユーザー ID (プレースホルダは選んだプラットフォームに追従)。「なし」なら `platform` を送らない。成功で作者を下書きに入れてワールド登録へ戻る。失敗は Alert。
  - 各ステップのヘッダー左は「戻る」(前のステップへ)。ワールド検索のステップだけ「キャンセル」(モーダルを閉じる)。

- [ ] **Step 3: 確認**

Run: `cd apps/mobile && pnpm test && pnpm lint`
Expected: PASS / 新規エラーなし

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/metadata-editor/world-picker
git commit -m "feat(metadata): ワールドと作者を登録できるようにする"
```

---

### Task 7: 通しの確認と stacked PR

**Files:** なし (問題があれば該当 Task のファイルを直す)

- [ ] **Step 1: 全テストと lint**

Run: `cd apps/mobile && pnpm test && pnpm lint && npx tsc --noEmit -p .`
Expected: PASS / 新規エラーなし

- [ ] **Step 2: シミュレータで spec「手動確認」を通す** (サインインが必要。未サインインならできた範囲と残りを PR に書く)

- [ ] **Step 3: push して draft PR を作る**

```bash
git push -u origin claude/metadata-phase2-text
gh pr create --draft --repo teyvat-project/Catalyst-Native --base claude/metadata-settings-phased-8d1023 --head claude/metadata-phase2-text
```

本文の先頭に「#77 (Phase 1) の上に積んだ PR。#77 のマージ後にベースを develop に変える」と書く。
