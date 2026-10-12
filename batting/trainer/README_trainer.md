# 打撃AIトレーナーの書き方

コメントの追加と修正は `batting_knowledge.js` の `BATTING_TRAINER_RULES` だけです。`js/math.js` には文章を書きません。

配列の上にある項目ほど先に出ます。`alert` と `warning` は合わせて最大2件です。それらが無いときだけ `severity: "good"` が出ます。どれにも当てはまらなければ、ファイル先頭の `fallback` が出ます。

```javascript
{
  id: "side_twist_shortage",
  phase: "Top",
  title: "【胸郭・股関節連鎖のチェック】",
  description: "体幹と骨盤の捻転差が小さく（{+twist}°）、腕主導の代償が見られます。",
  reason: "腰椎への回旋ストレスに注意が必要な状態です。",
  exercise: "股関節内旋可動域と胸郭の回旋モビリティをチェックしましょう。",
  severity: "alert",
  evaluate: function(metrics) {
    return metrics.mode === "SIDE" && metrics.twist !== 0 && metrics.twist < 22;
  }
}
```

| 項目 | 書くこと |
| --- | --- |
| `id` | 半角の固有名 |
| `phase` | `Top` / `Impact` / `Step` など、見ている局面 |
| `title` | 見出し。`【】` 付き |
| `description` | ① 力学的な現象 |
| `reason` | ② 代償と身体的な背景 |
| `exercise` | ③ 予防・ケア・確認すること |
| `severity` | `alert` / `warning` / `good` |
| `evaluate` | `function(metrics) { return 条件; }` |

`metrics.mode` は `"SIDE"`（横向き）か `"FRONT"`（正面）です。文章中の `{twist}` はその数値、`{+twist}` は `+12` のような符号付きになります。

## 使える指標

横向き: `twist`（捻転差。未測定は 0）、`impactKneeFlex`（前膝屈曲。未測定は null）、`stride`、`strideRatio`、`trunkTilt`、`headShift`、`headShiftY`、`takebackLeadElbow`、`impactBackElbow`

正面: `headShiftX`、`headShiftY`、`shoulderOpen`、`kneeValgus`、`inStep`、`trunkTilt`

追加したあとは打撃画面を再読み込みします。インストール済みのアプリでは `sw.js` の `CACHE_NAME` を1段上げてください。`batting/trainer/batting_knowledge.js` はキャッシュ一覧に入っています。
