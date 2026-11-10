# SYSTEM_BLUEPRINT

野球AIバイオメカニクス（motion2）の設計書兼コンテキスト。2026-11-10 時点のソースに基づく。別の実装者が機能追加・リファクタ・バグ修正に入るとき、この文書を先に読む。

このリポジトリに `package.json`、テスト、ビルド、バックエンドは無い。動くアプリは静的 HTML / CSS / 素の JavaScript である。

---

## 1. プロジェクト概要 & コンセプト

### 目的

ジュニア野球の投球フォームと打撃フォームを、スマートフォンで撮影した動画から端末内で測る。歩幅・関節角度・頭の移動・リリース位置などを数値化し、保存したカルテの中だけで AI トレーナー文を出す。監督・保護者へは LINE 共有（Web Share API）で渡す。

### 解決する課題

- 専門機材なしで、横向き / 正面の動画からフォームの数値を残す。
- 測定値は端末の `localStorage` に残り、通信サーバへは送らない。
- トレーナー文は「いま画面に出ている数値」ではなく、保存済みカルテの指標に対して出す。

### ターゲットユーザー

ジュニア野球の選手・指導者・保護者。UI 文言は児童向け（ひらがな混じり）と、カルテ内のトレーナー文（運動連鎖・代償・ケア）が同居する。

### アプリケーション種別

- インストール不要の静的 Web アプリ。
- ルート `index.html` だけが Service Worker を登録する PWA（`manifest.json`、`display: standalone`）。
- Electron / Capacitor / React Native ではない。
- フレームワークなし。バンドラなし。ES Modules ではない。`<script>` のグローバル共有。

### 主要なユースケース

1. ポータルで「投球」か「打撃」を選ぶ。
2. 横向き（`SIDE`）または正面（`FRONT`）の動画を選ぶ。
3. 姿勢スキャンで身長スケール用の定規（頭〜かかと）を合わせる。
4. 選手名・利き腕または打席・身長を入れる。
5. 測定画面で再生・コマ送りし、骨格と数値カードを見る。必要な局面を手動で固定する。
6. カルテに保存し、日付×選手でまとめて見る。CSV 出力、削除、共有ができる。
7. 共有文の末尾にだけ、その記録向けの AI トレーナー文が付く。

画面は 4 ステップ。ナビの pill は 3 つで、測定中（ステップ 4）は pill 3「選手情報」がアクティブのまま。

| ステップ | DOM | 内容 |
| --- | --- | --- |
| 1 | `#view-step1` | 横向き / 正面の動画選択、カルテを開く |
| 2 | `#view-step2` | 姿勢スキャン。定規ハンドル、コマ送り、AI 自動スキャン |
| 3 | `#view-step3` | 選手名・利き腕 or 打席・身長。解析開始 |
| 4 | `#view-step4` | 動画キャンバス、数値カード、再生と局面ボタン |

---

## 2. 技術スタック & 実行環境

### 言語・ライブラリ

| 要素 | 実体 |
| --- | --- |
| 言語 | HTML、CSS、JavaScript（モジュール化なし） |
| UI | 手書き CSS。コンポーネントライブラリなし |
| 姿勢推定 | MediaPipe Pose（BlazePose、33 ランドマーク）。CDN はバージョン未固定 |
| 永続化 | `localStorage` のみ。IndexedDB / SQLite なし |
| PWA | `sw.js`。キャッシュ名 `baseball-ai-v12`。取得は network-first |
| サーバ | なし。静的ファイルを配信すれば動く |

CDN（`batting/index.html` と `pitching/index.html` の head、同じ 4 本）:

```text
https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js
https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js
https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js
https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js
```

モデルファイルは `Pose({ locateFile })` が同じ CDN の `@mediapipe/pose/` から取る。初回だけ通信が要る。推論そのものはブラウザ内。アプリ用の API キーは無い。

Pose オプション（両 `js/mediapipe.js` の `initMediaPipe`）:

- `modelComplexity: 2`
- `smoothLandmarks: true`
- `enableSegmentation: false`
- `minDetectionConfidence: 0.15`
- `minTrackingConfidence: 0.15`

`camera_utils.js` は読み込むが、解析ループは `requestAnimationFrame` + 非表示 `<video>` + バッファ canvas であり、`Camera` クラスは使っていない。

### 状態管理とスタイル

- 状態は各アプリの `<script>` が共有するグローバル変数。Redux / Zustand / Context は無い。
- スタイルは各アプリ 1 枚の CSS。CSS Modules / Tailwind / プリプロセッサは無い。
- ポータル `index.html` だけインライン `<style>`。
- 打撃の基調色は緑 `#10b981`、投球は橙 `#ff5e36`、ポータルのテーマ色は `#0284c7`。

### バックエンド・DB・外部 API

- アプリサーバ、認証、データベースは無い。
- Supabase / Firebase は無い。
- 外部呼び出しは MediaPipe CDN と、カルテ共有時の `navigator.share` だけ。
- 動画ファイルは `URL.createObjectURL` でそのタブの中だけ。アップロードしない。

### 実行の前提

- 配信は HTTP(S)。開発時はリポジトリ直下で静的サーバを立て、`http://127.0.0.1:<port>/index.html` を開く。例: `python3 -m http.server 8776`。
- `file://` でもクラシック script は読める。Service Worker と一部の動画デコードは HTTP の方が確実。
- 対応ブラウザは、MediaPipe Pose（WASM）と `<video playsinline>` が動くもの。iOS Safari を想定した記述がある（ホームリンクの `preventDefault`、非表示 video の実寸保持）。

---

## 3. ディレクトリ & 全ファイル構造マップ

```text
motion2/
├── index.html                          ポータル
├── manifest.json                       PWA マニフェスト
├── sw.js                               Service Worker
├── SYSTEM_BLUEPRINT.md                 本ドキュメント
├── batting/
│   ├── index.html
│   ├── css/style.css
│   ├── js/math.js
│   ├── js/render.js
│   ├── js/mediapipe.js
│   ├── js/app.js
│   └── trainer/
│       ├── batting_knowledge.js
│       └── README_trainer.md
├── pitching/
│   ├── index.html
│   ├── css/style.css
│   ├── js/math.js
│   ├── js/render.js
│   ├── js/mediapipe.js
│   ├── js/app.js
│   └── trainer/
│       ├── pitching_knowledge.js
│       └── README_trainer.md
└── _backup/
    ├── batting.html                    旧・単一 HTML（非稼働）
    └── pitching.html                   旧・単一 HTML（非稼働）
```

`manifest.json` と各 HTML は `icon-192.png` を参照する。このワークツリーには PNG が無い。`sw.js` の `cache.addAll` は一覧のどれかが 404 だと install が失敗する。アイコンを足すときは `sw.js` の `STATIC_ASSETS` と整合させる。

打撃と投球はコピーに近い別アプリである。共通パッケージは無い。片方を直してももう片方は変わらない。トレーナー文の描画関数（`formatTrainerNumber` から `renderTrainerKnowledge`）は両 `math.js` に重複している。

### ファイル別の責務と依存

#### ポータルと PWA

- `index.html`
  - 役割: 投球 (`./pitching/index.html`) と打撃 (`./batting/index.html`) への入口。使い方ガイド。フッターに「完全端末内解析」。
  - 依存: `manifest.json`、`icon-192.png`、末尾で `sw.js` を `navigator.serviceWorker.register('sw.js')`。
  - ガイドの「③ AIトレーナー分析」はポータルの説明文。測定画面にライブコメントを出す実装ではない。
- `manifest.json`
  - 役割: 名前「野球AIバイオメカニクス」、`start_url: ./index.html`、`scope: ./`、`display: standalone`、`theme_color: #0284c7`。
- `sw.js`
  - 役割: 静的資産の network-first キャッシュ。`install` で `skipWaiting`、`activate` で旧キャッシュ削除と `clients.claim`。
  - 依存: `STATIC_ASSETS` に列挙した HTML / CSS / JS / `icon-192.png`。CDN の MediaPipe は一覧に無い。
  - キャッシュ名を上げないと、インストール済みクライアントは古い `sw.js` を掴み続ける。`sw.js` 自体の更新チェックはブラウザが行う。

#### 打撃 `batting/`

- `batting/index.html`
  - 役割: 4 ステップの DOM、10 枚のカード（`c1`〜`c10`）、キャンバス、`#ai-status-hud`、カルテモーダル、非表示 `#hidden-video` と `#buffer-canvas`。
  - 依存: head の MediaPipe 4 script、`css/style.css`。body 末尾の script 順は下の「script 順」を参照。
  - ステップ 4 の子の順: `.screen-wrapper#main-screen-wrapper` → `.dashboard` → `.controls-container`。
- `batting/css/style.css`
  - 役割: レイアウト、カード、ボタン、モーダル、HUD、測定画面の縦配分。
  - 依存: HTML の class / id のみ。JS からは色をインラインで触る箇所がある（利き腕トグル、骨格ボタン、角度バッジ）。
  - 1067 行以降の `#view-step4` 規則が測定画面の動画高さを固定する。スキャン用 `.screen-wrapper` の `flex: 1` は残している。
- `batting/trainer/batting_knowledge.js`
  - 役割: `var BATTING_TRAINER_CONFIG` と `var BATTING_TRAINER_RULES`。文章と `evaluate(metrics)` だけ。
  - 依存: なし。`math.js` より前に読む。
- `batting/trainer/README_trainer.md`
  - 役割: ルールの書き方と、使える `metrics` キー。
- `batting/js/math.js`
  - 役割: トレーナー文のレンダラ、`calcJointAngle3D`、`applyBattingBiomechanics`。
  - 依存: `BATTING_TRAINER_*`、`tuneRuler`、`userHeightCm`、`selectedBatSide`、`selectedAngleMode`、`isSkeletonVisible`、`records`、`currentCalculatedState`、カード DOM、`drawBattingSkeleton`、`paintHero`。
- `batting/js/render.js`
  - 役割: キャンバスの実ピクセル合わせ、スキャン定規、解析キャンバスのズーム、骨格線、AI ステータス HUD の DOM。
  - 依存: `outputCanvas`、`scanCanvas`、`videoElement`、`zoomScale`、`zoomPan`、`tuneRuler`、`showAiDebugHud`、`scanModeActive`、`aiDiagnostics`。
- `batting/js/mediapipe.js`
  - 役割: `Pose` の生成、1 フレーム推論、`onPoseResults`、再生ループ。
  - 依存: `pose`、`videoElement`、`bufferCanvas`、`applyBattingBiomechanics`、`beginAnalysisCanvas`、`endAnalysisCanvas`、`renderFrameOnly`、`drawAiDiagnosticsHUD`、`renderScanFrame`。
- `batting/js/app.js`
  - 役割: 画面遷移、動画読込、定規ドラッグ、ピンチズーム、局面ボタン、カルテ CRUD、CSV、共有、再生 UI。
  - 依存: 上記すべてのグローバルと DOM id。

#### 投球 `pitching/`

構造は打撃と同じ。差分は次のとおり。

- `pitching/index.html`
  - ステップ 4 は `.analysis-layout` > `.analysis-stage`（動画）と `.analysis-side`（操作、その下に 6 カード）。
  - 操作に「べた足決定」「リリース位置を決定」「解除」、シークバーに `#release-marker`。
  - カードは `c1`〜`c6`。
- `pitching/css/style.css`
  - 768px 以上で `.analysis-layout` が 2 列グリッド（動画 1.45fr、サイド 0.9fr、サイド最小 280px）。
  - 767px 以下は動画を `45vh` にし、サイド内でカード（`order: 1`）を操作（`order: 2`）の上に置く。
  - `#hidden-video` は `position: fixed`、実寸 320×180、`clip-path` で 1px だけ残す。本文フローから外すため。
- `pitching/js/math.js`
  - `generatePitchingAICoachAdvice`、`getSegmentAngle3D`、`calcTrueMER`、`applyPitchingBiomechanics`。
  - 骨格は `drawPrecisionSkeleton`。前足つま先座標を `lastCalculatedLeadToePt` に書く。
- `pitching/js/app.js`
  - 手動リリース（`manualReleaseTime`）、正面のつま先ドラッグ（`manualToeOffsetDeg`）、べた足ボタン。
  - ホームへ戻るときに `videoElement.pause()` と `cancelAnimationFrame` をする（打撃側のホームリンクは pause しない）。
  - 保存成功は `alert`。打撃は `showToast`。
- `pitching/trainer/pitching_knowledge.js`
  - `var PITCHING_TRAINER_CONFIG` と `var PITCHING_TRAINER_RULES`。

#### 旧ファイル

- `_backup/batting.html`、`_backup/pitching.html`
  - 分割前の単一 HTML。ポータルからはリンクされていない。ここを直しても稼働アプリは変わらない。新規実装の置き場所にしない。

### script 順（両アプリ共通。順序を崩さない）

```html
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
<!-- ほか MediaPipe 3 本は head -->
<script src="trainer/*_knowledge.js"></script>
<script src="js/math.js"></script>
<script src="js/render.js"></script>
<script src="js/mediapipe.js"></script>
<script src="js/app.js"></script>
```

`type="module"` にしない。ファイルをまたぐ状態は `var`（関数宣言でもよい）。`let` / `const` は同じファイル内だけで、他 script からは見えない。

---

## 4. 機能一覧 & 実装マッピング

### 4.1 ポータル

| 機能 | 場所 |
| --- | --- |
| 投球アプリへ | `index.html` `#link-pitching` → `./pitching/index.html` |
| 打撃アプリへ | `index.html` `#link-batting` → `./batting/index.html` |
| PWA 登録 | `index.html` 末尾の `serviceWorker.register('sw.js')` |
| オフライン読み | `sw.js` fetch: ネット成功時にキャッシュ更新、失敗時 `caches.match` |

### 4.2 共通の画面遷移

両方の `setStep(stepNum)`（`js/app.js`）。

```text
pill「1. どうが選択」 → setStep(1)（動画を止める）
pill「2. 姿勢スキャン」 → 動画があれば setStep(2) して renderScanFrame
pill「3. 選手情報」   → 動画があれば setStep(3)
動画選択               → handleVideoLoad → setStep(2)
スキャン「次へ」        → setStep(3)
「解析スタート」        → setStep(4) → resetWorkspaceDimensions → processSingleFrame
投球の setStep(4) は続けて drawAiDiagnosticsHUD() を呼ぶ
```

動画が無いとき pill 2 と 3 は進まない。

### 4.3 動画と姿勢推定

| 機能 | 関数 | ファイル |
| --- | --- | --- |
| ファイル選択 | `handleVideoLoad(file, 'SIDE'\|'FRONT')` | 各 `app.js` |
| オブジェクト URL | `videoFileUrl`、古い URL は `revokeObjectURL` | 各 `app.js` |
| Pose 初期化 | `initMediaPipe` | 各 `mediapipe.js` |
| 1 フレーム推論 | `processSingleFrame` → `pose.send({ image: bufferCanvas })` | 各 `mediapipe.js` |
| 結果 | `onPoseResults` | 各 `mediapipe.js` |
| 再生ループ | `renderLoop`（`requestAnimationFrame`） | 各 `mediapipe.js` |
| 一時停止時の描画 | `updatePlayState` が `renderFrameOnly` | 各 `app.js` |
| コマ送り | `#btn-frame-prev` / `#btn-frame-next`（約 1/30 秒） | 各 `app.js` |
| シーク | `#seek-bar` の input | 各 `app.js` |

`onPoseResults` の分岐:

1. `recordAiDiagnostics(results)`。
2. `scanModeActive` なら鼻とかかとで `tuneRuler` を置き、`renderScanFrame`。計測はしない。
3. それ以外は `beginAnalysisCanvas()`。失敗（幅 0 や動画未準備）なら HUD だけ更新して return。
4. `poseLandmarks` があれば `applyBattingBiomechanics` または `applyPitchingBiomechanics`。
5. `endAnalysisCanvas()` で `restore` し、HUD 表示中なら `drawAiDiagnosticsHUD`。

スキャン開始は `#btn-scan-action`。`scanModeActive = true` にして `processSingleFrame`。検知できると `#btn-scan-next-step` が出る。

### 4.4 身長スケール（定規）

`tuneRuler = { isActive, topYNorm, bottomYNorm, centerXNorm }`。

- 描画: `drawInteractiveRuler`（`render.js`）。
- 操作: `onScanPointerDown` / `Move` / `Up`（`app.js`）。上下ハンドル。
- 実寸: `activePxPerCm = (bottomYNorm - topYNorm) * 描画高さ / userHeightCm`。差が 0.1 以下なら 0.75 を使う（両 `math.js`）。

cm 系の指標はこの比だけに依存する。定規を動かさずに身長だけ変えると、同じ画素差の cm が変わる。

### 4.5 キャンバス、骨格、ズーム

| 機能 | 関数 | 注意 |
| --- | --- | --- |
| ステージに canvas 解像度を合わせる | `bindCanvasToStage` / `watchStage` / `resetWorkspaceDimensions` | `canvas.width` 代入はビットマップを消す |
| アスペクトフィット | `getAspectFitBounds` | 骨格と動画は同じ矩形 `b` |
| ズーム描画 | `beginAnalysisCanvas` | translate → scale(`zoomScale`) → 動画 → 骨格。HUD はこの transform の外 |
| 骨格の表示切替 | `#btn-toggle-skeleton` → `isSkeletonVisible` | 切替後に `processSingleFrame` |
| ピンチ | `touchstart` / `touchmove`（`app.js`） | 2 本指で距離、1 本指は `zoomScale > 1` のときパン |
| ズームリセット | `#btn-zoom-reset` | 投球は `manualToeOffsetDeg = 0` も戻す |
| 打撃の骨格 | `drawBattingSkeleton` | 打席で左右の色を入れ替える |
| 投球の骨格 | `drawPrecisionSkeleton` | 投げ腕側を強調 |

`renderFrameOnly` は動画フレームと HUD だけを描く。骨格は描かない。MediaPipe も走らせない。HUD の開閉はここを使う。`processSingleFrame` を HUD 操作から呼ぶと、推論中フラグとシークが噛み合って画面が固まる。

### 4.6 AI 認識ステータス HUD

DOM は `#ai-status-hud`（`.screen-wrapper` 内、`position: absolute`、z-index 20）。canvas には描かない。

| 操作 | 実装 |
| --- | --- |
| ボタン | `#btn-toggle-ai-hud` → `toggleAiDebugHud`。オフ文言は「（非表示）」 |
| キー | `D`（input / textarea 以外、修飾キーなし） |
| パネル折りたたみ | オーバーレイの `pointerdown`、またはキャンバス上の幾何ヒット `onCanvasPointerDown`。`isHudCollapsed` を反転し `renderFrameOnly` |
| タッチが HUD 上 | `touchstart` で `isPointOnAiHud` なら、ピンチ / パンのフラグを立てる前に return |
| スキャン中 | `scanModeActive` のときオーバーレイを隠す |

表示内容（`aiDiagnostics`、`recordAiDiagnostics`）:

- 状態 `IDLE` / `RUNNING` / `ERROR`（停止中は IDLE）
- 推論間隔 ms、fps
- `poseWorldLandmarks` または `worldLandmarks` が肩・腰まであれば「3D」、なければ「2Dのみ」
- 可視性: 左肩 11、右肩 12、左腰 23、右腰 24。0.80 以上 ◎、0.50 以上 ○、それ未満 ×
- 骨盤ヨー、胸郭ヨー、捻転差（3D が無いときは 0）

HUD のヨーは診断表示であり、カードの捻転差とは別計算。カード側を HUD の式に合わせたり、その逆をしたりしない。

### 4.7 打撃の測定

`applyBattingBiomechanics`（`batting/js/math.js`）。`selectedBatSide === 'RIGHT'` を右打者とする。右打者の前側は左半身（ランドマーク 11, 23, 25, 27…）、手元側の手首は右（15/16 の右）。

ライブ値は `cNVal`（CSS の `::before` で「現在: 」）。局面の確定値は `cNMax` を `paintHero` で書き、`.is-locked` を付ける。

横向き（`SIDE`）カード:

| id | 指標 | 記録の仕方 |
| --- | --- | --- |
| c1 | 捻転差（符号付き度） | 最大が 5° 以上で `records.maxTwistSigned`。範囲外（-40〜60 の外）は捨てる |
| c2 | 前膝屈曲 | ライブ。インパクトボタンで `impactKneeFlex` |
| c3 | ステップ cm と身長比 | 最大値。10cm〜身長×1.0 |
| c4 | 体幹軸傾斜 | 最大、55° 以下 |
| c5 | 頭の前後 cm | 最大。初回の鼻位置 `initialNoseX` 基準 |
| c6 | 頭の上下 cm | 最大。`initialNoseY` 基準 |
| c7 | グリップトップ高 | 最大 |
| c8 | インパクトのグリップ高 | インパクトボタン |
| c9 | テイクバック前ヒジ | トップボタン |
| c10 | インパクト後ヒジ | インパクトボタン |

正面（`FRONT`）は同じ 10 枚のタイトルを `updateCardLabels` で入れ替える。頭の横ずれ、頭の上下、前肩の開き、ステップの左右ずれ、体幹側傾、前膝の内外反、グリップ高、両ヒジ。トップ / インパクトボタンは正面でも有効（`app.js` の `btn-manual-impact` がモードで描画先カードを変える）。

手動局面:

- `#btn-manual-top`: `records.takebackLeadElbow = currentCalculatedState.leadElbowAngle`。
- `#btn-manual-impact`: 前膝屈曲、前肩の開き、後ヒジ、グリップ高、膝内外反を、そのフレームの `currentCalculatedState` で固定。
- `#btn-reset-max`: `records` を初期値に戻し `showWaitingHeroes`。

捻転ラベル（右打者は `hipRot - shoulderRot`、左打者は逆。-180〜180 に畳む）:

- 22〜38: 理想タメ
- 38 超: タメ大
- 10〜22: やや下半身先行
- -5 未満: 手打ち
- それ以外: 同調

肘の屈曲は内角を `calcJointAngle3D` で出し、表示は `180 - 内角`。0 に近いほど伸び、大きいほど曲がる。

### 4.8 投球の測定

`applyPitchingBiomechanics`（`pitching/js/math.js`）。`selectedThrowArm === 'RIGHT'` が右投げ。リード脚は右投げなら左側。

フェーズ（自動）:

- ステップ中: 歩幅 > 身長 × 0.35。
- べた足 `isKinematicFF`: ステップ中で、前足つま先の Y 速度が 0.003 未満かつ軸足かかと付近。連続 2 フレームで true。そのフレームだけ真。
- 横向きリリース窓 `isThrowingPhase`: 歩幅 > 身長 × 0.50、手首が肩より上、手首が投球方向へ肩を超えている。
- 正面リリース窓 `isFrontThrowingPhase`: ステップ中、手首が肩より上。

`manualReleaseTime == null` のときだけ、リリース窓の中で次を更新する。

- 横向き: `records.maxRelease`（リリース高）、`records.releaseKneeFlex`
- 正面: `records.maxReleaseLateral`

MER（`records.maxMER`）はこのゲートを通さない。リリースを手で固定しても、外旋の最大値は動き続ける。

手動リリース（`applyManualRelease`）:

- ボタン `#btn-set-release`。もう一度押すとそのフレームで上書き。
- `manualReleaseTime = videoElement.currentTime`（秒）。
- 横向きは現在のリリース高と前膝屈曲、正面は横幅を、その時点の `currentCalculatedState` でロック。`paintReleaseSnapshot` が前傾または側屈・肘屈曲・外旋を副文にする。
- `#release-marker` をシークバー上の割合位置に出す。
- `#btn-clear-release`（`clearManualRelease`）はリリース高または横幅と `releaseKneeFlex` だけ戻す。MER、べた足、歩幅の最大値は消さない。消したあとステップ 4 なら `processSingleFrame`。

べた足ボタン `#btn-manual-fc`:

- 正面: つま先角と膝内外反を SFC としてロック。
- 横向き: `records.ffKneeFlex` を現在の屈曲でロックし `paintSideKneeHero`（表示は `接地° / リリース°`）。

正面のつま先補正: タッチが HUD でなく、リードつま先から 35px 以内なら `isDraggingToe`。結果は `manualToeOffsetDeg` と `smoothToeDeg`。ズームリセットで 0 に戻る。

横向きカード（既定ラベルは左投げ。右投げは `updateCardLabels`）:

| id | 内容 | 英雄ラベル |
| --- | --- | --- |
| c1 | ステップ幅 | MAX ステップ |
| c2 | 肩外旋 MER（`calcTrueMER`、30〜200、記録は 190 以下の最大） | MER 肩外旋 |
| c3 | 肩線と腰線の絶対角度差（65° 以下、5° 以上で最大更新） | MAX 捻転差 |
| c4 | 指先のリリース高 | RELEASE 高さ |
| c5 | 前膝屈曲 | SFC/REL 前ヒザ |
| c6 | 体幹前傾 | MAX 体幹前傾 |

正面カード: つま先向き、膝内外反、体幹側屈、アームスロット、踏み出しの左右ずれ、リリース横幅。

`calcTrueMER` は体幹ベクトル（腰中点→肩中点）と前腕ベクトルのなす角を 180 から引いた値。手の速度は計算していない。新しい速度指標を足すときは、既存の式に存在しない値を推測で埋めない。

人差し指（19 / 20）が手首から 0.18 より遠いか visibility < 0.25 のときは手首を指先の代わりに使う。

### 4.9 カルテ

| 操作 | 打撃 | 投球 |
| --- | --- | --- |
| 保存 | `#btn-save-record` → `saveCurrentRecord` | 同じ |
| 開く | `#btn-open-carte` と `#btn-open-carte-top` | 同じ |
| 閉じる | `#btn-close-carte` | 同じ |
| 描画 | `renderCarteList` | 同じ |
| 選手フィルタ | `#player-select-filter` | 同じ |
| 日単位削除 | グループキー `` `${playerName}_${date}` `` | 投球は `deleteSingleDayGroup`。打撃も同キーで削除 |
| 全削除 / 選手全削除 | `#btn-delete-action` | 同じ |
| CSV | `#btn-export-csv` | 同じ |
| 共有 | `shareRecordToLine` | 同じ。`navigator.share`、無ければ `document.execCommand('copy')` |

モーダル `#carte-modal` は `.modal-overlay`。通常 `display: none`。`openCarteModal` が `flex` にする。AI トレーナーカードは `renderCarteList` がこのモーダルの中へ挿入する。測定画面 `#view-step4` には出さない。

保存時の振り返り初期値:

- 打撃: `feelGrade`「めっちゃ芯で捉えた！」、`bodyCondition`「どこも痛くない！元気！」
- 投球: `feelGrade`「めっちゃ良かった！」、`bodyCondition` は同じ

カルテ上でセレクトを変えると、その記録の `feelGrade` / `bodyCondition` / `playerNote` を `localStorage` へ書き戻す。

共有文は、その日の `SIDE` と `FRONT` を探して並べ、`generateBattingAICoachAdvice(first)` または `generatePitchingAICoachAdvice(first)` を足す。`first` はグループの先頭（`unshift` 保存なので最新）。横向きと正面で助言対象が先頭レコードになる点に注意。

### 4.10 トレーナー文

`renderTrainerKnowledge(rules, config, entry)`（両 `math.js`）:

1. `metrics = { mode: entry.mode, ...entry.metrics }`。
2. `rule.evaluate(metrics)` が真のものだけ残す。例外は不採用。
3. `severity === 'good'` は goods、それ以外は findings。
4. findings を `config.maxNotes`（2）件。findings が空なら goods の先頭 1 件。どちらも空なら `config.fallback`。
5. 各項目は `【題】`、`① description`、`② reason`、`③ exercise`。`{key}` と `{+key}` を `fillTrainerText` で置換。

文章の追加は `trainer/*_knowledge.js` だけ。`math.js` に文を書かない。

打撃ルール id: `side_twist_shortage`, `side_twist_excess`, `side_head_forward`, `side_lead_knee_collapse`, `side_lead_knee_lock`, `side_head_vertical`, `side_stride_short`, `side_stride_long`, `side_lead_elbow_long`, `side_lead_elbow_short`, `side_back_elbow_out`, `side_chain_clear`, `front_head_lateral`, `front_head_vertical`, `front_shoulder_open`, `front_knee_valgus`, `front_step_offset`, `front_trunk_sidebend`, `front_chain_clear`。

投球ルール id: `mer_hyper_external_rotation`, `mer_limited_external_rotation`, `trunk_flexion_shortage`, `side_twist_shortage`, `lead_leg_brake_loss`, `stride_short`, `side_chain_clear`, `sfc_pelvis_early_open`, `elbow_below_shoulder`, `lead_knee_valgus`, `trunk_lateral_excess`, `step_offset`, `front_chain_clear`。

配列の上が先に採用される。

### 4.11 測定画面のレイアウト（壊しやすい）

スマートフォン（実測の目安 390×844）では、動画 `.screen-wrapper` がヘッダー直下で高さ約 45vh（`min-height: 240px`、`max-height: 48vh`）。カードは残りの領域で `overflow-y: auto`。操作は下端。

- 打撃: `#view-step4` が縦 flex。動画は `flex: 0 0 auto`。ダッシュボードが縮む側。ボタン `min-height: 34px` は `#view-step4` 限定（スキャンの 44px は維持）。
- 投球モバイル: `body:has(#view-step4.view-section.active)` のときだけ `100dvh` で固定。`.app-container` は `min-height: 0` で縮む。`aspect-ratio: 16/9` をこの画面だけ `auto` にして、45vh と喧嘩させない。
- 投球デスクトップ（min-width 768px）: 左動画・右操作と数値。このグリッドをモバイル用の縦積み規則で上書きしない。
- `#hidden-video` を `display: none` にしない。iOS がフレームを出さなくなる。投球は固定配置 + 実寸 320×180 + clip。フローに戻すとカードの高さが 0 になる。

---

## 5. データモデル & 型定義

TypeScript は無い。以下は実行時のオブジェクト形状。

### 5.1 MediaPipe ランドマーク

`results.poseLandmarks[i]` は正規化座標 `{ x, y, z, visibility }`。x, y は画像内 0〜1。`poseWorldLandmarks` はメートル近似の別配列。計測の多くは画像座標。HUD のヨーだけ world を使う。

使うインデックス:

| index | 部位 |
| --- | --- |
| 0 | 鼻 |
| 11 / 12 | 左肩 / 右肩 |
| 13 / 14 | 左肘 / 右肘 |
| 15 / 16 | 左手首 / 右手首 |
| 17 / 18 | 左小指 / 右小指 |
| 19 / 20 | 左人差し指 / 右人差し指 |
| 23 / 24 | 左腰 / 右腰 |
| 25 / 26 | 左膝 / 右膝 |
| 27 / 28 | 左足首 / 右足首 |
| 29 / 30 | 左かかと / 右かかと |
| 31 / 32 | 左つま先 / 右つま先 |

### 5.2 セッション状態（保存しない）

共通:

```javascript
playerName          // 打撃初期値 "バッター1"、投球 "せんしゅ1"
userHeightCm        // 初期 140
videoFileUrl        // blob: URL。カルテには入らない
selectedAngleMode   // "SIDE" | "FRONT"
isSkeletonVisible   // bool
zoomScale           // 初期 1
zoomPan             // { x, y }
tuneRuler           // { isActive, topYNorm, bottomYNorm, centerXNorm }
scanModeActive
isPoseLoaded
isProcessing
showAiDebugHud      // 初期 true（mediapipe.js）
isHudCollapsed      // 初期 false（render.js）
aiDiagnostics       // status, latencyMs, fps, hasWorld3D, vis, pelvisYaw, thoraxYaw, torsionDiff
```

打撃だけ: `selectedBatSide` `"RIGHT" | "LEFT"`（初期 RIGHT）、`initialNoseX`、`initialNoseY`。

投球だけ: `selectedThrowArm`（初期 `"LEFT"`）、`manualReleaseTime`（秒または null）、`manualToeOffsetDeg`、`smoothToeDeg`、`prevLeadToeY`、`leadFootFlatStationaryCount`、`lastCalculatedLeadToePt`。

`currentCalculatedState` は直近フレーム。`records` は動画内の最大値と手動ロック。`#btn-reset-max` と選手切替系の `showWaitingHeroes` で `records` は戻る。カルテ保存済み配列とは別物。

打撃 `currentCalculatedState`: `twistSignedDeg`, `twistStatusLabel`, `kneeFlexAngle`, `strideCm`, `trunkTiltDeg`, `headShiftCm`, `headShiftYCm`, `topHandHeightCm`, `impactHandHeightCm`, `inStepCm`, `inStepDir`, `shoulderOpenDeg`, `shoulderOpenLabel`, `kneeValgusAngle`, `kneeValgusLabel`, `leadElbowAngle`, `backElbowAngle`。

投球 `currentCalculatedState`: `displayToeAngle`, `toeStateLabel`, `kneeDevAngle`, `kneeStateLabel`, `kneeFlexAngle`, `kneeFlexReady`, `releaseHeightCm`, `releaseLateralCm`, `trunkTiltDeg`, `trunkLateralDeg`, `elbowFlexDeg`, `merDeg`。毎フレーム、リリース関連は一度 null に戻してから再計算する。

### 5.3 localStorage

| キー | アプリ | 型 |
| --- | --- | --- |
| `batting_ai_records_v1` | 打撃 | `Entry[]` JSON |
| `pitching_ai_records_v1` | 投球 | `Entry[]` JSON |

新しい順（`unshift`）。キー名を変えると既存端末のカルテは見えなくなる。マイグレーション関数は無い。

```javascript
// 共通フィールド
{
  id: Number,              // Date.now()
  date: "YYYY/MM/DD",
  time: "HH:MM",
  playerName: String,
  height: Number,          // 保存時点の userHeightCm
  mode: "SIDE" | "FRONT",
  feelGrade: String,
  bodyCondition: String,
  playerNote: String,
  metrics: Object          // モードで形が違う
}

// 打撃は batSide: "RIGHT" | "LEFT"
// 投球は throwArm: "RIGHT" | "LEFT"
```

打撃 `metrics`（SIDE）: `twist`, `twistLabel`, `impactKneeFlex`, `stride`, `strideRatio`, `trunkTilt`, `headShift`, `headShiftY`, `topHandH`, `impactHandH`, `takebackLeadElbow`, `impactBackElbow`。

打撃 `metrics`（FRONT）: `headShiftX`, `headShiftY`, `shoulderOpen`, `shoulderOpenLabel`, `inStep`, `inStepDir`, `kneeValgus`, `kneeValgusLabel`, `trunkTilt`, `topHandH`, `impactHandH`, `takebackLeadElbow`, `impactBackElbow`。

投球 `metrics`（SIDE）: `stride`, `strideRatio`, `mer`, `twist`, `releaseH`, `ffKneeFlex`, `releaseKneeFlex`, `trunkTilt`。

投球 `metrics`（FRONT）: `toeAngle`, `toeLabel`, `valgus`, `valgusLabel`, `trunkLateral`, `armSlot`, `inStep`, `releaseLateral`。

未測定は `null` または `0` が混在する。ルールの `evaluate` は `0` を「まだ無い」と扱うものと、`null` を未測定と扱うものが両方ある。キーをリネームすると既存カルテの助言が黙って `--` になる。

### 5.4 トレーナー設定

```javascript
{
  header: String,
  maxNotes: 2,
  fallback: { title, description, reason, exercise }
}

// ルール
{
  id: String,
  phase: String,
  title: String,          // 【】付きを推奨
  description: String,    // {metric} / {+metric}
  reason: String,
  exercise: String,
  severity: "alert" | "warning" | "good",
  evaluate: function (metrics) { return Boolean; }
}
```

---

## 6. データフロー & 状態管理のアーキテクチャ

### 6.1 計測の1フレーム

```text
videoElement（非表示、再生中）
  → renderLoop
  → processSingleFrame
      bufferCanvas に drawImage
      pose.send({ image: bufferCanvas })
  → onPoseResults
      recordAiDiagnostics
      beginAnalysisCanvas（clear、ズーム transform、動画を描く）
      apply*Biomechanics(poseLandmarks, bounds)
          骨格を同じ transform 内に描く
          currentCalculatedState を更新
          条件を満たすとき records を更新
          cNVal / cNMax の text を更新
      endAnalysisCanvas（restore、HUD DOM を更新）
```

グローバルは単一タブ・単一動画。ストアの購読は無い。DOM がそのままビュー。

推論は `isProcessing` で 1 本。完了前の次フレームは `processSingleFrame` が `renderFrameOnly` に落ちる。

### 6.2 保存の流れ

```text
測定中の records + currentCalculatedState + 選手フォーム
  → saveCurrentRecord が Entry を組む
  → localStorage[STORAGE_KEY] = JSON.stringify([entry, ...既存])
  → カルテを開いたとき getSavedRecords → renderCarteList
  → 共有または CSV はその配列を読むだけ。再推論しない
```

キャッシュ層は無い。Service Worker は静的ファイル用で、カルテ JSON はキャッシュしない。

### 6.3 グローバルとローカル

ファイルをまたいで読む名前は `var` または `function`。

ファイル内だけの `let` がある（ドラッグ開始座標、ピンチ距離、トースト timer）。これらを他ファイルから参照しない。新しく共有するフラグを `let` / `const` で足すと、次の script からは `undefined` になる。

`const stepViews` や `const STORAGE_KEY` は定義した `app.js` の中だけで使っている。このパターンは維持してよい。他ファイルへ漏らす値は `var` にする。

### 6.4 リアルタイム

サーバ同期は無い。リアルタイムに見えるものは次だけ。

- `requestAnimationFrame` の推論ループ。
- `pointer` / `touch` イベント（ズーム、定規、HUD、つま先）。
- `video` の `timeupdate` / `seeked` から `updateTimeUI` と必要なら `processSingleFrame`。

### 6.5 既存の落とし穴（実装時に再発させない）

- HUD を canvas の `fillText` に戻すと、動画が低いときに下段がクリップされる。DOM オーバーレイのままにする。
- HUD の `pointerdown` から `processSingleFrame` を呼ばない。
- `canvas.width = ...` のあと描画しないと真っ黒になる。
- 測定画面に `.ai-coach-card` や `#live-ai-advice` を戻さない。トレーナー DOM の生成箇所は `renderCarteList` だけ。
- 投球のワイド画面用 `.analysis-layout` を消すと、デスクトップが 1 列に戻る。モバイル規則は `@media (max-width: 767px)` の中だけ。
- 古い Service Worker は cache-first だった。今は network-first。資産を増やしたら `STATIC_ASSETS` と `CACHE_NAME` を同時に更新する。

---

## 7. 環境変数 & 設定ファイル

### 環境変数

`.env` は無い。API キーも無い。秘密にして置く値は無い。

変えると挙動が変わる定数:

| 名前 | 場所 | 用途 |
| --- | --- | --- |
| `CACHE_NAME` | `sw.js` | PWA キャッシュ世代。配布のたびに上げる |
| `STATIC_ASSETS` | `sw.js` | precache するパス。404 を混ぜない |
| `STORAGE_KEY` | 各 `app.js` | カルテの localStorage キー |
| MediaPipe CDN URL | 各 `index.html` と `locateFile` | モデルの取得元。バージョンピンはしていない |
| Pose options | 各 `mediapipe.js` | 検出閾値とモデル複雑度 |

### ビルド・起動・テスト・デプロイ

- ビルドコマンドは無い。ソースがそのまま本番。
- テストランナーは無い。
- 起動: リポジトリ直下で静的 HTTP サーバ。ポータルは `/index.html`。
- デプロイ: このディレクトリを静的ホストのドキュメントルートに置く。`scope` が `./` なので、サブパス配下に置くなら `manifest.json` の `start_url` / `scope` と SW 登録パスを同じ深さに合わせる。
- 変更確認: ブラウザで該当ステップを操作する。CSS を変えたら、測定画面（ステップ 4）をスマホ幅と 768px 以上の両方で見る。
- Node は前提にしていない。`node --check` は使えない環境がある。

---

## 8. 開発ルール & 引き継ぎメモ

### 命名と置き場所

- DOM id はケバブ（`btn-save-record`、`c1-val`）。JS の対応変数は `c1Val` のように略す既存がある。新規カードを足すときも `cN-title` / `cN-val` / `cN-max` に合わせる。
- 角度モードの文字列は `'SIDE'` と `'FRONT'` だけ。
- 打席・投げ腕は `'RIGHT'` と `'LEFT'`。
- 日本語 UI はそのまま。識別子は英語。
- トレーナーの文章は `trainer/*_knowledge.js`。閾値の文言変更で `math.js` を開かない。
- 幾何とフェーズ判定は `js/math.js`。描画は `js/render.js`。推論ループは `js/mediapipe.js`。ボタンと保存は `js/app.js`。
- 打撃と投球を無理に共通ファイルへまとめない。まとめるなら script 順と `var` 境界を先に設計する。今の重複は意図的な分離。

### コーディング上の制約

- 共有状態は `var`。`const` の設定オブジェクトを他 script から読むと silent に落ち、トレーナーは fallback だけになる。
- 新しい `<script>` を足すときは knowledge → math → render → mediapipe → app の依存順を守る。
- 計測関数は渡された `landmarks` と既存の `records` 以外から数値を作らない。未検出は `NaN` / `null` のまま UI は `--`。
- 肘屈曲・MER・捻転の式を「一般的な野球の定義」に黙って置き換えない。カルテと比較可能性が壊れる。
- インラインの `onclick` HTML 属性は既存に無い。リスナーは `app.js`。
- スタイルの大域変更は `#view-step4` かメディアクエリに閉じる。スキャン画面とモーダルを巻き込まない。

### 壊してはいけない仕様

1. 骨格は `beginAnalysisCanvas` の transform の内側。HUD はその外側（DOM）。ズームしても HUD は画面固定。
2. 2 本指ピンチと、ズーム後の 1 本指パンを残す。HUD 上の 1 本指はパンにしない。投球正面では、HUD 以外かつつま先近傍の 1 本指はパンより優先してつま先補正。
3. 手動リリースはリリース高・リリース時膝・正面の横幅だけを固定する。MER の最大更新は止めない。解除で MER とべた足を 0 にしない。
4. 手動リリース未設定なら、自動のリリース窓で従来どおり最大値を更新する。
5. 打撃のトップは前ヒジ、インパクトは膝・肩の開き・後ヒジ・グリップ高・膝内外反。正面でもこのボタンは生きている。
6. AI トレーナー文はカルテモーダルと共有テキストだけ。測定画面にライブ助言を出さない。
7. カルテキーは `batting_ai_records_v1` と `pitching_ai_records_v1`。動画バイナリは保存しない。
8. 測定画面の動画領域は約 45vh、最低 240px。10 枚カードとボタンでキャンバスを 120px 前後まで潰さない。
9. `renderFrameOnly` は推論しない。HUD トグル、一時停止中の再描画、キャンバス未準備のフォールバックに使う。
10. `#hidden-video` は再生できる状態で DOM に残す。`display: none` と、フロー内の 180px 確保の両方を避ける。
11. `sw.js` は network-first。cache-first に戻さない。資産追加時は一覧と `CACHE_NAME` を更新する。
12. `_backup/*.html` は履歴。稼働パスは `batting/index.html` と `pitching/index.html`。
13. ホームへの戻りは `../index.html`。Safari 向けに `<a>` の既定遷移を `preventDefault` している。

### 変更後の確認

- ステップ 1 → 動画選択 → スキャンで定規 → 選手情報 → ステップ 4 で再生、コマ送り、骨格トグル、ピンチ、保存、カルテ再表示、共有文にトレーナーが含まれること。
- 投球はリリース決定、もう一度押して上書き、解除、シークバーのマーカー。横向きと正面でロックされるカードが違うこと。
- 打撃はトップとインパクト。横向きと正面でヒーローの書き込み先が違うこと。
- スマホ幅と 768px 以上。投球は 2 列が残っていること。
- `D` キーと HUD ボタン、パネル折りたたみ。折りたたみ直後に推論が止まって画面が固まらないこと。
