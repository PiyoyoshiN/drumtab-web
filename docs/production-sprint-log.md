# Production Sprint Log

## 2026-05-31: Grid practical notation sprint

### Sprint purpose

DrumTab Web の Grid 表示を、長い曲・複数小節・同時打音・8th / 16th / 32nd 切替に耐える、実用的なドラムタブ表示エンジンへ近づける。

### Non-goals

- 音声解析ロジックの大幅変更
- MIDI パーサの大幅変更
- Score 表示の本格五線譜化
- App.ts の大規模分割
- UI 全面作り直し
- ログイン、サーバー保存、外部 API 連携、高精度なドラム分離 AI

### Planned files

- `src/ui/GridView.ts`
- `src/ui/grid/gridTypes.ts`
- `src/ui/grid/gridRenderModel.ts`
- `src/ui/grid/gridTextRenderer.ts`
- `src/ui/styles.css`
- `public/samples/*.json`
- `scripts/check-samples.mjs`
- `package.json`
- `README.md`
- `AGENTS.md`
- `docs/grid-notation-design.md`
- `docs/manual-test-checklist.md`

### Completion conditions

- Grid 表示ロジックを DOM から分離する。
- 8th / 16th / 32nd を同じ描画モデルで扱う。
- 小節単位の読みやすさを改善し、長い曲でレーン名を見失いにくくする。
- 同時打音・同一セル衝突の情報を完全に消さない。
- Grid 確認用サンプル JSON を最低 3 つ追加する。
- 軽量チェックと `npm run build` を実行する。
- Production Sprint Mode を `AGENTS.md` に追加する。

### Risks

- Grid 文字列生成の分離時に playhead 表示や既存の `createGridView(track, { resolution })` API を壊す可能性がある。
- 小節ブロック表示により横幅は改善する一方、縦方向の表示量が増える可能性がある。
- 同一セル衝突の表現は、フラムや装飾音を正確に表すものではない。
- サンプルチェックを厳しくしすぎると、将来のサンプル追加を妨げる可能性がある。

### Initial findings

- `GridView.ts` が DOM 作成、レンダーモデル作成、テキスト整形をすべて持っており、サンプル JSON に対する表示検証がしにくい。
- 長い曲では1本の横長テキストになり、レーン名と小節番号を見失いやすい。
- 同一レーン・同一セルの複数 hit は `+` で示せるが、純粋関数として検証できる形ではない。
- UI 凡例はあるが、サンプルごとの確認観点と自動構造チェックが不足している。

### Work performed

- Grid 表示の中核を `src/ui/grid/` に分離した。
- 小節ブロック単位でテキストを出す renderer を追加し、複数小節でもレーン名が再掲されるようにした。
- `basic-rock-16th.json` に加え、8分、2小節フィル、32分確認用のサンプルを追加した。
- サンプル JSON の構造、必須ドラム、解像度別の小節数を確認する `npm run check:samples` を追加した。
- Production Sprint Mode を `AGENTS.md` に追加した。

### Verification notes

- `npm run check:samples` で全サンプルの構造チェックと 8th / 16th / 32nd のバー数計算を確認する。
- `npm run build` で TypeScript と Vite production build を確認する。

### Final verification result

- `npm run check:samples` passed for 4 sample files.
- Sample stats reported:
  - `basic-rock-16th.json`: 4 bars in 8th / 16th / 32nd, 14 stacked timing positions.
  - `eighth-note-groove.json`: 2 bars in 8th / 16th / 32nd, 6 stacked timing positions.
  - `rock-fill-2bar.json`: 2 bars in 8th / 16th / 32nd, 6 stacked timing positions.
  - `thirty-second-check.json`: 1 bar in 8th / 16th / 32nd, stacked positions vary by resolution as expected.
- `npm run build` passed. Vite still reports a large chunk warning, but the build exits successfully.

### Self-review after implementation

- The Grid DOM component is now thin; it owns DOM nodes and playhead state, while render model and text rendering live in `src/ui/grid/`.
- Small-to-medium length songs are easier to read because each 4-bar block repeats `Bar` / `Beat` / `Count` and lane names.
- The text renderer is still optimized for monospaced display and horizontal scroll. True responsive notation layout remains future work.
- Same-lane collisions are visible via `+`, but the exact order/timing of flams or very dense rolls is intentionally not represented yet.

## 2026-05-31: Production Sprint #5 — long-song Grid checks

### Sprint purpose

Grid 表示をさらに実用化し、長い曲・小節ブロック・renderGridText 相当の自動確認・サンプル JSON による再現可能な検証を強化する。

### Non-goals

- 音声解析ロジック、MIDI パーサ、Score 表示の本格五線譜化は変更しない。
- App.ts の大規模分割や UI 全面作り直しは行わない。
- ログイン、サーバー保存、外部 API 連携、高精度なドラム分離 AI は扱わない。

### Planned files

- `src/ui/grid/gridTypes.ts`
- `src/ui/grid/gridRenderModel.ts`
- `src/ui/grid/gridTextRenderer.ts`
- `scripts/check-grid-render.mjs`
- `scripts/check-samples.mjs`
- `public/samples/long-rock-8bar.json`
- `package.json`
- `README.md`
- `docs/grid-notation-design.md`
- `docs/manual-test-checklist.md`
- `docs/production-sprint-log.md`

### Completion conditions

- `check:grid` で全サンプルを 8th / 16th / 32nd で確認できる。
- 8小節程度の長いサンプルで `[Bars 1-4]` / `[Bars 5-8]` 相当のブロック分割を確認できる。
- Grid の先頭メタ情報にブロック小節数が表示される。
- `npm run check:samples`、`npm run check:grid`、`npm run check`、`npm run build` が成功する。
- docs に確認観点、制約、次 Sprint 候補を追記する。

### Expected risks

- TypeScript の UI モジュールを Node から直接 import するには追加設定または依存が必要になるため、今回は Node 標準機能だけの mirror check に留める可能性がある。
- 32nd かつ4小節ブロックでは行が長くなるため、狭い画面では横スクロールが残る。
- `barsPerBlock` を UI から変更する操作は今回入れず、型と renderer の土台だけに留める。

### Current issues found

- 前回の `renderGridText()` は分離済みだが、自動確認スクリプトは JSON 構造チェック中心で、Grid 出力のヘッダー・ブロック・レーン再掲までは確認していなかった。
- 長い曲用サンプルがなく、4小節を超えるブロック分割の確認が不足していた。
- `BARS_PER_BLOCK` は定数で、将来オプション化しやすい型になっていなかった。

### Planned work

- `GridViewOptions` に `barsPerBlock` を追加し、指定なしでは 4小節ブロックを維持する。
- `renderGridText()` のメタ情報とブロック見出しを読みやすくする。
- 8小節の `long-rock-8bar.json` を追加する。
- `scripts/check-grid-render.mjs` を追加し、全サンプル x 3解像度で Grid 表示相当の確認を行う。
- docs と manual checklist を更新する。

### Work performed

- `barsPerBlock` を `GridViewOptions` / `GridRenderModel` に追加し、既存 UI ではデフォルト 4小節ブロックを維持した。
- Grid メタ情報に `block=4 bars` を追加し、ブロック見出しを `=== Bars 1-4 / 8 ===` のようにした。
- `long-rock-8bar.json` を追加し、8小節でクラッシュ、HH/SN/BD、後半フィルを確認できるようにした。
- `check-grid-render.mjs` を追加し、各サンプルの 8th / 16th / 32nd 出力相当について metadata、timeline、lane labels、2ブロック目、行長 warning を確認した。

### Verification results

- `npm run check:samples` passed for 5 sample files.
- `npm run check:grid` passed for 5 sample files x 3 resolutions. 32nd の4小節ブロックなど、長い行は warning として報告されるが失敗扱いにはしていない。
- `npm run check` passed and runs both sample and grid checks.
- `npm run build` passed. Vite large chunk warning remains, but build exits successfully.

### Self-review and remaining issues

- Node 標準機能だけで完結させるため、`check-grid-render.mjs` は TypeScript の `renderGridText()` を直接 import せず、同等仕様の mirror check として実装した。完全な snapshot regression は次 Sprint 候補。
- 4小節ブロックは長い曲の見失いを減らすが、32nd ではまだ行が長い。将来的には 1〜2小節ブロック切替 UI または sticky lane labels が必要。
- `barsPerBlock` はオプションとして土台を作ったが、UI 操作は未実装。

### Next Production Sprint candidates

1. `renderGridText()` の実出力 snapshot test を追加し、mirror check から実 renderer check へ進める。
2. Playhead の自動スクロールと現在ブロックの強調表示を追加する。
3. Grid 上のイベント選択・追加・削除・移動に向けて、編集用 hit model と JSON バリデーションを設計する。
