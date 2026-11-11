// 打撃画面の設定。動画・シーク・ズーム・ドロワー・カルテ操作は MotionPlayerCore にある。
MotionPlayerCore.init({
  mode: 'batting',
  accentTheme: 'batting',
  storageKey: 'batting_ai_records_v1',
  csvPrefix: '打撃AIカルテ',
  defaultPlayerName: 'バッター1',
  defaultFeel: '😆 めっちゃ芯で捉えた！',
  defaultBody: '🟢 どこも痛くない！元気！',
  savedMessage: function(name) { return '✅ ' + name + '君の打撃データをカルテに保存しました！'; },
  notify: 'toast',
  keyPoints: [
    { id: 'top', buttonId: 'btn-manual-top', label: '◎ トップ決定', color: 'rgba(59, 130, 246, 0.7)' },
    { id: 'impact', buttonId: 'btn-manual-impact', label: '💥 インパクト決定', color: 'rgba(249, 115, 22, 0.8)' }
  ],
  primaryBadge: {
    key: 'topTorsion',
    format: function(val) {
      return '🔥 TOP捻転差 ' + (val >= 0 ? '+' : '') + val.toFixed(1) + '°';
    }
  },
  metricsCards: [
    { id: 'topTorsion', title: 'トップ捻転差', unit: '°' },
    { id: 'impactKnee', title: '前足ヒザ壁角度', unit: '°' },
    { id: 'headDisplacement', title: '頭部前方移動量', unit: 'cm' }
  ],
  playIdleGradient: 'linear-gradient(135deg, var(--primary-accent), var(--primary-accent-strong))',
  scanAccent: 'var(--primary-accent)',
  scanAccentSoft: 'var(--badge-bg)',
  showScanCenterLine: false,
  scanGuideHtml: '🎯 <b>AIが検知したよ！</b> ズレがあれば<b>丸いハンドルを上下にドラッグ</b>して合わせてね！',
  calculateMetrics: function(landmarks, frameIndex, context) {
    return applyBattingBiomechanics(landmarks, context || { frameIndex: frameIndex });
  },
  diagnosticRules: {
    html: generateBattingDiagnosisHtml,
    text: generateBattingAICoachAdvice
  },
  badgeText: function() {
    var twist = records.maxTwistSigned;
    if (!twist) return '🔥 TOP捻転差 --';
    return '🔥 TOP捻転差 ' + (twist > 0 ? '+' : '') + twist + '°';
  }
});
