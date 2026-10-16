// 投球AIトレーナーの知見辞書。文章の追加・修正はこのファイルだけ。
// 各項目: id / phase / title / description / reason / exercise / evaluate(metrics)
// metrics.mode は "SIDE"（横向き）または "FRONT"（正面）。
// {mer} のように指標名を書くと、画面ではその数値に置き換わる。
// severity が "good" の項目は、alert / warning が1件も無いときだけ出る。
// 書き方の詳細は README_trainer.md。

var PITCHING_TRAINER_CONFIG = {
  header: "【🩺 AIトレーナー（肩肘・運動連鎖チェック）】",
  maxNotes: 2,
  fallback: {
    title: "【動作スクリーニング】",
    description: "現時点で突出した肩肘への代償は見当たりません。",
    reason: "MER・接地・リリースの数値が揃うと、運動連鎖をより正確に評価できます。",
    exercise: "登板後の肩甲帯と体幹のコンディションをあわせて確認しましょう。"
  }
};

var PITCHING_TRAINER_RULES = [
  {
    id: "mer_hyper_external_rotation",
    phase: "MER",
    title: "【肩関節への剪断力リスク】",
    description: "MER時の外旋角度が大きく（{mer}°）、肩前方関節包および肘内側に高い牽引・外反ストレスがかかりやすい状態です。",
    reason: "胸椎伸展や肩甲胸郭の安定が不足すると、外旋を肩関節前面で作りすぎる代償が起きます。",
    exercise: "肩甲胸郭関節の安定性と胸椎伸展の可動域を確保しましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.mer >= 170;
    }
  },
  {
    id: "mer_limited_external_rotation",
    phase: "MER",
    title: "【肩甲帯の外旋可動域】",
    description: "MER時の外旋角度が小さく（{mer}°）、肩甲上腕リズムでのしなりが不足しています。",
    reason: "胸椎伸展や肩甲骨後傾の制限を、体幹の早期回旋や肘の過伸展で補う代償が起きやすくなります。",
    exercise: "胸椎伸展と肩甲胸郭関節の可動性を確認し、外旋を肘で作らないよう評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.mer > 0 && metrics.mer < 150;
    }
  },
  {
    id: "trunk_flexion_shortage",
    phase: "Release",
    title: "【肩肘アライメント注意】",
    description: "リリース時の体幹前傾が不足しています（{trunkTilt}°）。肘が肩のラインより残りやすく、インピンジメントや肘内側側副靭帯（UCL）への負荷が増大します。",
    reason: "体幹屈曲の遅れを肩の水平内転や肘下がりで補う代償が疑われます。",
    exercise: "体幹前傾角の確保と、広背筋・体幹屈曲の連動を促すドリルを推奨します。",
    severity: "alert",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.trunkTilt > 0 && metrics.trunkTilt < 25;
    }
  },
  {
    id: "side_twist_shortage",
    phase: "MER",
    title: "【体幹と骨盤の分離不足】",
    description: "体幹の捻転差が小さく（{twist}°）、運動連鎖のタメが早く抜けています。",
    reason: "骨盤と胸郭のタイミングがずれ、肩肘で速度を作る代償が起きやすくなります。",
    exercise: "胸椎回旋の可動域と、軸足股関節で骨盤を残すタイミングを再評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.twist > 0 && metrics.twist < 22;
    }
  },
  {
    id: "lead_leg_brake_loss",
    phase: "Release",
    title: "【前足のブレーキ力】",
    description: "リリースで前膝の屈曲が接地時より深く（接地 {ffKneeFlex}° → リリース {releaseKneeFlex}°）、ブレーキが抜けています。",
    reason: "床反力を体幹へ返せず、肩肘への牽引で投球を完結させる代償が疑われます。",
    exercise: "前足股関節・殿筋の遠心性支持と、片脚での安定性を評価してください。",
    severity: "alert",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.releaseKneeFlex > (metrics.ffKneeFlex || 0) + 10 && metrics.releaseKneeFlex > 0;
    }
  },
  {
    id: "stride_short",
    phase: "SFC",
    title: "【ステップと股関節伸展】",
    description: "歩幅が短く（身長比 {strideRatio}%）、前方への重心移動が不足しています。",
    reason: "軸足股関節の伸展が出ず、上肢で球速を補う代償が起きやすくなります。",
    exercise: "股関節伸展の可動域と、軸足から前足への荷重移動を確認しましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.strideRatio > 0 && metrics.strideRatio < 72;
    }
  },
  {
    id: "side_chain_clear",
    phase: "Release",
    title: "【良好な運動連鎖】",
    description: "下肢から体幹、肩甲帯、上肢へとエネルギーが順に伝達されています。",
    reason: "肩前方や肘内側への過剰な牽引・外反ストレスは目立っていません。",
    exercise: "この負担の少ない投球連鎖を、登板後の肩甲帯ケアで維持しましょう。",
    severity: "good",
    evaluate: function(metrics) {
      if (metrics.mode !== "SIDE") return false;
      const trunk = metrics.trunkTilt || 0;
      return metrics.mer >= 150 && metrics.mer < 170 && (trunk === 0 || trunk >= 25);
    }
  },
  {
    id: "sfc_pelvis_early_open",
    phase: "SFC",
    title: "【骨盤先行開きの代償】",
    description: "接地時につま先が開き（{toeAngle}°）、骨盤が早期に開いて運動連鎖のタメが抜けています。",
    reason: "軸足で骨盤を残せないと、肩肘が先行して牽引ストレスが増えます。",
    exercise: "軸足の股関節外転・外旋保持力および回旋筋群のタイミングを再評価してください。",
    severity: "alert",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.toeAngle > 12;
    }
  },
  {
    id: "elbow_below_shoulder",
    phase: "Release",
    title: "【肩肘アライメント注意】",
    description: "挙上角度が低く（{armSlot}°）、肘が肩のラインより下がっており、インピンジメントや肘内側側副靭帯（UCL）への負荷が増大しています。",
    reason: "体幹前傾や肩甲帯の上方回旋が不足し、肘の高さでリリース位置を補う代償が疑われます。",
    exercise: "体幹前傾角の確保と、広背筋・体幹屈曲の連動を促すドリルを推奨します。",
    severity: "alert",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.armSlot > 0 && metrics.armSlot < 100;
    }
  },
  {
    id: "lead_knee_valgus",
    phase: "SFC",
    title: "【接地脚の膝アライメント】",
    description: "着地足の膝が内外へ崩れています（{valgus}°）。",
    reason: "股関節の支持が不足し、膝関節と体幹の側方バランスで接地を支える代償が見られます。",
    exercise: "殿筋群の安定性と、足部の荷重位置を評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.valgus > 6;
    }
  },
  {
    id: "trunk_lateral_excess",
    phase: "Release",
    title: "【体幹側屈の過大】",
    description: "体幹の側屈が大きく（{trunkLateral}°）、投球側へ体が倒れています。",
    reason: "腰椎への側屈ストレスが増え、肩甲帯の位置が崩れて肘への負荷が変わります。",
    exercise: "体幹の抗側屈と、反対側股関節での支持をチェックしましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.trunkLateral > 25;
    }
  },
  {
    id: "step_offset",
    phase: "SFC",
    title: "【踏み出し位置と骨盤】",
    description: "踏み出しの横ずれが大きく（{inStep}cm）、接地位置が投球線から外れています。",
    reason: "骨盤の向きが早く変わり、肩肘で方向を修正する代償が起きやすくなります。",
    exercise: "軸足股関節の向きと、ステップ足の接地位置を再評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.inStep > 12;
    }
  },
  {
    id: "front_chain_clear",
    phase: "SFC",
    title: "【良好な運動連鎖】",
    description: "下肢から体幹、肩甲帯、上肢へとエネルギーが順に伝達されています。",
    reason: "肩前方や肘内側への過剰な牽引・外反ストレスは目立っていません。",
    exercise: "この負担の少ない投球連鎖を、登板後の肩甲帯ケアで維持しましょう。",
    severity: "good",
    evaluate: function(metrics) {
      if (metrics.mode !== "FRONT") return false;
      const slot = metrics.armSlot || 0;
      const valgus = metrics.valgus || 0;
      return metrics.toeAngle <= 12 && (slot === 0 || slot >= 100) && valgus <= 6 && (metrics.toeAngle > 0 || slot >= 100);
    }
  }
];
