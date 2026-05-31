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
