// 打撃AIトレーナーの知見辞書。文章の追加・修正はこのファイルだけ。
// 各項目: id / phase / title / description / reason / exercise / evaluate(metrics)
// metrics.mode は "SIDE"（横向き）または "FRONT"（正面）。
// {twist} のように指標名を書くと、画面ではその数値に置き換わる。{+twist} は符号付き。
// severity が "good" の項目は、alert / warning が1件も無いときだけ出る。
// 書き方の詳細は README_trainer.md。

const BATTING_TRAINER_CONFIG = {
  header: "【🩺 AIトレーナー分析】",
  maxNotes: 2,
  fallback: {
    title: "【動作スクリーニング】",
    description: "現時点で突出した代償動作は見当たりません。",
    reason: "主要局面の数値が揃うと、運動連鎖をより正確に評価できます。",
    exercise: "疲労の有無と、股関節・胸郭の可動域をあわせて確認しましょう。"
  }
};

const BATTING_TRAINER_RULES = [
  {
    id: "side_twist_shortage",
    phase: "Top",
    title: "【胸郭・股関節連鎖のチェック】",
    description: "体幹と骨盤の捻転差が小さく（{+twist}°）、腕主導（手打ち）の代償が見られます。",
    reason: "腰椎への回旋ストレスに注意が必要な状態です。",
    exercise: "股関節内旋可動域と胸郭の回旋モビリティをチェックしましょう。",
    severity: "alert",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.twist !== 0 && metrics.twist < 22;
    }
  },
  {
    id: "side_twist_excess",
    phase: "Top",
    title: "【胸郭・股関節の分離過剰】",
    description: "体幹と骨盤の捻転差が大きく（+{twist}°）、分離が過剰です。",
    reason: "切り返しで腰椎の回旋ストレスが増え、上肢でタイミングを合わせる代償が起きやすくなります。",
    exercise: "胸郭回旋の可動域を保ちつつ、股関節から体幹へ返すタイミングを評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.twist > 38;
    }
  },
  {
    id: "side_head_forward",
    phase: "Impact",
    title: "【重心移動・軸足支持】",
    description: "軸足から前足への重心移動で突っ込みが見られます（頭の前方移動 {headShift}cm）。",
    reason: "前足のブレーキ力（床反力）が不足している可能性があります。",
    exercise: "下肢の踏ん張り力と殿筋群の遠心性支持性を評価してください。",
    severity: "alert",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.headShift > 8;
    }
  },
  {
    id: "side_lead_knee_collapse",
    phase: "Impact",
    title: "【前足の遠心性支持】",
    description: "インパクトで前膝の屈曲が深く（{impactKneeFlex}°）、ブレーキが抜けています。",
    reason: "前足の床反力が不足し、体幹が前方へ流れる代償が疑われます。",
    exercise: "殿筋群の遠心性支持と、片脚での踏ん張りを評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      const flex = metrics.impactKneeFlex;
      return metrics.mode === "SIDE" && flex !== null && flex !== undefined && flex > 38;
    }
  },
  {
    id: "side_lead_knee_lock",
    phase: "Impact",
    title: "【膝関節の衝撃吸収】",
    description: "前膝が伸展位に近く（屈曲 {impactKneeFlex}°）、衝撃を関節で受けやすい状態です。",
    reason: "股関節と足部での力の吸収が不足し、膝前面への圧縮ストレスが増えます。",
    exercise: "軽度屈曲位での遠心性コントロールと、足関節の可動性を確認しましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      const flex = metrics.impactKneeFlex;
      return metrics.mode === "SIDE" && flex !== null && flex !== undefined && flex > 0 && flex < 10;
    }
  },
  {
    id: "side_head_vertical",
    phase: "Impact",
    title: "【頭部の垂直安定】",
    description: "スイング中の頭の上下動が大きく（{headShiftY}cm）、視線の高さが崩れています。",
    reason: "体幹の伸び上がり、または股関節での沈み込み不足による代償が疑われます。",
    exercise: "股関節の屈曲可動域と体幹の抗重力安定をチェックしましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.headShiftY > 6;
    }
  },
  {
    id: "side_stride_short",
    phase: "Step",
    title: "【ステップと股関節伸展】",
    description: "ステップ幅が短く（身長比 {strideRatio}%）、前方への重心移動が不足しています。",
    reason: "軸足股関節の伸展が出ず、上肢で距離を補う代償が起きやすくなります。",
    exercise: "股関節伸展可動域と、軸足からの体重移動を評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.strideRatio > 0 && metrics.strideRatio < 38;
    }
  },
  {
    id: "side_stride_long",
    phase: "Step",
    title: "【ステップ幅と骨盤制御】",
    description: "ステップ幅が広く（身長比 {strideRatio}%）、骨盤の安定が遅れやすい状態です。",
    reason: "着地後に体幹が遅れ、腰椎や前膝でタイミングを合わせる代償が疑われます。",
    exercise: "ステップ幅を整え、着地側股関節の安定性を確認しましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.strideRatio > 58;
    }
  },
  {
    id: "side_lead_elbow_long",
    phase: "Top",
    title: "【リード肘のアライメント】",
    description: "テイクバックで前肘が伸びすぎています（{takebackLeadElbow}°）。",
    reason: "肩甲帯で軌道を作れず、肘関節への牽引でバットを運ぶ代償が見られます。",
    exercise: "肘の軽度屈曲を保ち、肩甲骨の後傾と胸郭回旋の連動を確認しましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      const elbow = metrics.takebackLeadElbow;
      return metrics.mode === "SIDE" && elbow !== null && elbow !== undefined && elbow > 140;
    }
  },
  {
    id: "side_lead_elbow_short",
    phase: "Top",
    title: "【リード肘の可動域】",
    description: "テイクバックで前肘の屈曲が強く（{takebackLeadElbow}°）、懐が狭くなっています。",
    reason: "胸郭の回旋不足を肘の屈曲で補っている可能性があります。",
    exercise: "胸椎回旋と肩関節の水平外転の可動域をチェックしましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      const elbow = metrics.takebackLeadElbow;
      return metrics.mode === "SIDE" && elbow !== null && elbow !== undefined && elbow > 0 && elbow < 100;
    }
  },
  {
    id: "side_back_elbow_out",
    phase: "Impact",
    title: "【インパクト時の肘位置】",
    description: "インパクトで後ろ肘が体から離れています（{impactBackElbow}°）。",
    reason: "体幹の回旋が遅れ、上肢だけでインパクトを作る代償が疑われます。",
    exercise: "肩甲胸郭関節の安定と、体幹から上肢への力の伝達を評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      const elbow = metrics.impactBackElbow;
      return metrics.mode === "SIDE" && elbow !== null && elbow !== undefined && elbow > 125;
    }
  },
  {
    id: "side_chain_clear",
    phase: "Impact",
    title: "【良好なキネティックチェーン】",
    description: "下半身から体幹、上肢へとエネルギーがスムーズに伝達されています。",
    reason: "過剰な代償動作は見られず、身体への負担が少ない状態です。",
    exercise: "この効率的なスイング連鎖を、疲労時も崩さないようコンディショニングを継続しましょう。",
    severity: "good",
    evaluate: function(metrics) {
      return metrics.mode === "SIDE" && metrics.twist >= 22 && metrics.twist <= 38 && (metrics.headShift || 0) <= 8;
    }
  },
  {
    id: "front_head_lateral",
    phase: "Impact",
    title: "【頭部の側方安定】",
    description: "頭の横ブレが大きく（{headShiftX}cm）、視線の軸が揺れています。",
    reason: "体幹の側方安定が不足し、頸部や肩でバランスを取る代償が疑われます。",
    exercise: "体幹の抗側屈と、股関節での片脚支持を評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.headShiftX > 6;
    }
  },
  {
    id: "front_head_vertical",
    phase: "Impact",
    title: "【頭部の垂直安定】",
    description: "頭の上下動が大きく（{headShiftY}cm）、視線の高さが崩れています。",
    reason: "股関節の沈み込み、または体幹の伸び上がりによる代償が疑われます。",
    exercise: "股関節屈曲の可動域と体幹の抗重力安定をチェックしましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.headShiftY > 6;
    }
  },
  {
    id: "front_shoulder_open",
    phase: "Impact",
    title: "【肩甲帯の早期回旋】",
    description: "前肩の開きが大きく（{shoulderOpen}°）、体幹より上肢が先行しています。",
    reason: "胸郭の回旋タメが抜け、肩関節前面でスイングを作る代償が見られます。",
    exercise: "胸椎回旋の可動域と、肩甲胸郭関節の安定性を確認しましょう。",
    severity: "alert",
    evaluate: function(metrics) {
      const open = metrics.shoulderOpen;
      return metrics.mode === "FRONT" && open !== null && open !== undefined && open > 25;
    }
  },
  {
    id: "front_knee_valgus",
    phase: "Impact",
    title: "【前膝のアライメント】",
    description: "前膝が内側へ崩れています（{kneeValgus}°）。",
    reason: "股関節外転・外旋の支持が不足し、膝内側への外反ストレスが増えています。",
    exercise: "殿筋群の安定性と、足部での荷重位置を評価してください。",
    severity: "alert",
    evaluate: function(metrics) {
      const valgus = metrics.kneeValgus;
      return metrics.mode === "FRONT" && valgus !== null && valgus !== undefined && valgus > 10;
    }
  },
  {
    id: "front_step_offset",
    phase: "Step",
    title: "【ステップ方向と骨盤】",
    description: "踏み出しが投球線からずれています（{inStep}cm）。",
    reason: "骨盤の向きが早く変わり、体幹の回旋タイミングがずれる代償が疑われます。",
    exercise: "軸足股関節の向きと、踏み出し足の接地位置を再評価してください。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.inStep > 8;
    }
  },
  {
    id: "front_trunk_sidebend",
    phase: "Impact",
    title: "【体幹側屈の過大】",
    description: "スイング軸の側屈が大きく（{trunkTilt}°）、体幹が倒れています。",
    reason: "腰椎への側屈ストレスが増え、上肢で軌道を合わせる代償が起きやすくなります。",
    exercise: "体幹の抗側屈と、股関節での荷重支持をチェックしましょう。",
    severity: "warning",
    evaluate: function(metrics) {
      return metrics.mode === "FRONT" && metrics.trunkTilt > 28;
    }
  },
  {
    id: "front_chain_clear",
    phase: "Impact",
    title: "【良好なキネティックチェーン】",
    description: "下半身から体幹、上肢へとエネルギーがスムーズに伝達されています。",
    reason: "過剰な代償動作は見られず、身体への負担が少ない状態です。",
    exercise: "この効率的なスイング連鎖を、疲労時も崩さないようコンディショニングを継続しましょう。",
    severity: "good",
    evaluate: function(metrics) {
      if (metrics.mode !== "FRONT") return false;
      const open = metrics.shoulderOpen;
      const valgus = metrics.kneeValgus;
      const openOk = open === null || open === undefined || open <= 18;
      const valgusOk = valgus === null || valgus === undefined || valgus <= 6;
      const measured = metrics.headShiftX > 0 || (open !== null && open !== undefined);
      return metrics.headShiftX <= 6 && openOk && valgusOk && measured;
    }
  }
];
