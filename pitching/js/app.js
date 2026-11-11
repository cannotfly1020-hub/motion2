// 投球画面の設定。動画・シーク・ズーム・ドロワー・カルテ操作は MotionPlayerCore にある。
MotionPlayerCore.init({
  mode: 'pitching',
  accentTheme: 'pitching',
  storageKey: 'pitching_ai_records_v1',
  csvPrefix: '投球AIカルテ',
  defaultPlayerName: 'せんしゅ1',
  defaultFeel: '😆 めっちゃ良かった！',
  defaultBody: '🟢 どこも痛くない！元気！',
  savedMessage: function(name) { return '✅ ' + name + '君の測定データをカルテに保存しました！'; },
  notify: 'alert',
  confirmBulkDelete: true,
  keyPoints: [
    { id: 'footContact', buttonId: 'btn-manual-fc', label: '👟 べた足決定', color: 'rgba(59, 130, 246, 0.7)' },
    { id: 'release', buttonId: 'btn-set-release', label: '🎯 リリース決定', color: 'rgba(249, 115, 22, 0.8)' }
  ],
  primaryBadge: {
    key: 'footContact',
    format: function(val) {
      return '🎯 接地 ' + val.toFixed(1) + '°';
    }
  },
  metricsCards: [
    { id: 'stride', title: 'ステップ幅', unit: 'cm' },
    { id: 'mer', title: '肩外旋', unit: '°' },
    { id: 'releaseHeight', title: 'リリース高', unit: 'cm' }
  ],
  playIdleGradient: 'linear-gradient(135deg, var(--primary-accent), var(--primary-accent-strong))',
  scanAccent: 'var(--primary-accent)',
  scanAccentSoft: 'var(--badge-bg)',
  showScanCenterLine: true,
  scanGuideHtml: '🎯 <b>AIが検知したよ！</b> ズレがあれば<b>丸いハンドルを上下にドラッグ</b>して頭と足元にピッタリ合わせてね！',
  calculateMetrics: function(landmarks, frameIndex, context) {
    return applyPitchingBiomechanics(landmarks, context || { frameIndex: frameIndex });
  },
  diagnosticRules: {
    html: generatePitchingDiagnosisHtml,
    text: generatePitchingAICoachAdvice
  },
  badgeText: function() {
    if (selectedAngleMode === 'FRONT') {
      var toe = records.fcToeAngle;
      return (toe == null) ? '🎯 接地時開き --' : ('🎯 接地時開き ' + toe + '°');
    }
    var knee = records.ffKneeFlex;
    return (knee == null) ? '🎯 接地ヒザ --' : ('🎯 接地ヒザ ' + knee + '°');
  }
});
