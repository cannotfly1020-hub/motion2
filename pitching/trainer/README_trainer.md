# 投球AIトレーナーの書き方

コメントの追加と修正は `pitching_knowledge.js` の `PITCHING_TRAINER_RULES` だけです。`js/math.js` には文章を書きません。

配列の上にある項目ほど先に出ます。`alert` と `warning` は合わせて最大2件です。それらが無いときだけ `severity: "good"` が出ます。どれにも当てはまらなければ、ファイル先頭の `fallback` が出ます。

```javascript
{
  id: "mer_hyper_external_rotation",
  phase: "MER",
  title: "【肩関節への剪断力リスク】",
  description: "MER時の外旋角度が大きく（{mer}°）、肩前方と肘内側に牽引ストレスがかかりやすい状態です。",
  reason: "胸椎伸展の不足を、肩関節の過剰な外旋で補っている可能性があります。",
  exercise: "胸椎のモビリティと、肩甲骨周囲の安定性を確認しましょう。",
  severity: "warning",
  evaluate: function(metrics) {
    return metrics.mode === "SIDE" && metrics.mer >= 170;
  }
}
```

| 項目 | 書くこと |
| --- | --- |
| `id` | 半角の固有名 |
| `phase` | `MER` / `Release` / `SFC` など、見ている局面 |
| `title` | 見出し。`【】` 付き |
| `description` | ① 力学的な現象 |
| `reason` | ② 代償と身体的な背景 |
| `exercise` | ③ 予防・ケア・確認すること |
| `severity` | `alert` / `warning` / `good` |
| `evaluate` | `function(metrics) { return 条件; }` |

`metrics.mode` は `"SIDE"`（横向き）か `"FRONT"`（正面）です。最大外旋の指標名は `mer` です。文章中の `{mer}` はその数値に置き換わります。

## 使える指標

横向き: `mer`（最大外旋。未測定は 0）、`trunkTilt`（体幹前傾）、`twist`、`stride`、`strideRatio`、`releaseH`、`ffKneeFlex`（接地時の前膝）、`releaseKneeFlex`（リリース時の前膝）

正面: `toeAngle`（SFCのつま先の開き）、`armSlot`（挙上角。低いほど肘が下がりやすい）、`valgus`、`trunkLateral`、`inStep`、`releaseLateral`

追加したあとは投球画面を再読み込みします。インストール済みのアプリでは `sw.js` の `CACHE_NAME` を1段上げてください。`pitching/trainer/pitching_knowledge.js` はキャッシュ一覧に入っています。
