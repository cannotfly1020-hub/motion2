function showWaitingHeroes() {
  if (selectedAngleMode === 'SIDE') {
    paintHero(c1Max, 'TOP 捻転差', '--', false);
    paintHero(c2Max, 'IMPACT 前ヒザ', '--', false);
    paintHero(c3Max, 'MAX ステップ', '--', false);
    paintHero(c4Max, 'MAX 体幹', '--', false);
    paintHero(c5Max, 'MAX 頭前後', '--', false);
    paintHero(c6Max, 'MAX 頭上下', '--', false);
  } else {
    paintHero(c1Max, 'MAX 頭横', '--', false);
    paintHero(c2Max, 'MAX 頭上下', '--', false);
    paintHero(c3Max, 'IMPACT 前肩', '--', false);
    paintHero(c4Max, 'MAX 踏出', '--', false);
    paintHero(c5Max, 'MAX 側屈', '--', false);
    paintHero(c6Max, 'IMPACT 前ヒザ', '--', false);
  }
  paintHero(c7Max, 'TOP グリップ', '--', false);
  paintHero(c8Max, 'IMPACT グリップ', '--', false);
  paintHero(c9Max, 'TOP 前ヒジ', '--', false);
  paintHero(c10Max, 'IMPACT 後ヒジ', '--', false);
  [c1Val, c2Val, c3Val, c4Val, c5Val, c6Val, c7Val, c8Val, c9Val, c10Val].forEach((el) => {
    el.textContent = '--';
  });
}

function updateCardLabels() {
  const isLeft = (selectedBatSide === 'LEFT');
  if (selectedAngleMode === 'SIDE') {
    angleModeBadge.textContent = "横向き解析 🏏";
    angleModeBadge.style.background = "";

    c1Title.textContent = "🔄 捻転差 (下半身先行度)";
    c2Title.textContent = isLeft ? "🦵 前足ヒザ壁 (右屈曲)" : "🦵 前足ヒザ壁 (左屈曲)";
    c3Title.textContent = "🚶 ステップ幅 (歩幅)";
    c4Title.textContent = "📐 体幹軸傾斜 (スイング軸)";
    c5Title.textContent = "👀 頭の前後移動 (突っ込み)";
    c6Title.textContent = "👀 頭の上下動 (沈み込み)";
    c7Title.textContent = "✊ グリップトップ高";
    c8Title.textContent = "💥 インパクトグリップ高";
    c9Title.textContent = isLeft ? "💪 テイクバック前ヒジ (右肘)" : "💪 テイクバック前ヒジ (左肘)";
    c10Title.textContent = isLeft ? "💥 インパクト後ヒジ (左肘)" : "💥 インパクト後ヒジ (右肘)";
  } else {
    angleModeBadge.textContent = "正面（投手側）解析 🎯";
    angleModeBadge.style.background = "";

    c1Title.textContent = "👀 頭の横ズレ幅 (目線ブレ)";
    c2Title.textContent = "👀 頭の上下動 (沈み込み/浮き)";
    c3Title.textContent = isLeft ? "🛡️ 前肩の開き (右肩のタメ)" : "🛡️ 前肩の開き (左肩のタメ)";
    c4Title.textContent = "🚶 ステップのズレ (イン/アウト)";
    c5Title.textContent = "📐 上半身の傾き (軸の左右倒れ)";
    c6Title.textContent = isLeft ? "🦵 前ヒザの踏ん張り (右足)" : "🦵 前ヒザの踏ん張り (左足)";
    c7Title.textContent = "✊ グリップトップ高";
    c8Title.textContent = "💥 インパクトグリップ高";
    c9Title.textContent = isLeft ? "💪 テイクバック前ヒジ (右肘)" : "💪 テイクバック前ヒジ (左肘)";
    c10Title.textContent = isLeft ? "💥 インパクト後ヒジ (左肘)" : "💥 インパクト後ヒジ (右肘)";
  }
  showWaitingHeroes();
}

function snapshotAdviceEntry() {
  return {
    mode: selectedAngleMode,
    metrics: selectedAngleMode === 'SIDE' ? {
      twist: records.maxTwistSigned !== 0 ? records.maxTwistSigned : currentCalculatedState.twistSignedDeg,
      topTwistCaptured: records.maxTwistSigned !== 0,
      twistLabel: records.twistStatusLabel || currentCalculatedState.twistStatusLabel,
      impactKneeFlex: records.impactKneeFlex !== null ? records.impactKneeFlex : currentCalculatedState.kneeFlexAngle,
      stride: records.maxStride,
      strideRatio: Math.round((records.maxStride / userHeightCm) * 100),
      trunkTilt: records.maxTrunkTilt,
      headShift: records.maxHeadShift,
      headShiftRatio: records.maxHeadShiftRatio || 0,
      headShiftY: records.maxHeadShiftY,
      impactKneeLocked: records.impactKneeFlex !== null,
      topHandH: records.maxTopHandH,
      impactHandH: records.impactHandH !== null ? records.impactHandH : currentCalculatedState.impactHandHeightCm,
      takebackLeadElbow: records.takebackLeadElbow !== null ? records.takebackLeadElbow : currentCalculatedState.leadElbowAngle,
      impactBackElbow: records.impactBackElbow !== null ? records.impactBackElbow : currentCalculatedState.backElbowAngle
    } : {
      headShiftX: records.maxHeadShift,
      headShiftY: records.maxHeadShiftY,
      shoulderOpen: records.impactShoulderOpen !== null ? records.impactShoulderOpen : currentCalculatedState.shoulderOpenDeg,
      shoulderOpenLabel: records.impactShoulderOpenLabel || currentCalculatedState.shoulderOpenLabel,
      inStep: records.maxInStepCm,
      inStepDir: records.inStepDir,
      kneeValgus: records.impactKneeValgus !== null ? records.impactKneeValgus : currentCalculatedState.kneeValgusAngle,
      kneeValgusLabel: records.impactKneeValgusLabel || currentCalculatedState.kneeValgusLabel,
      kneeValgusLocked: records.impactKneeValgus !== null,
      trunkTilt: records.maxTrunkTilt,
      topHandH: records.maxTopHandH,
      impactHandH: records.impactHandH !== null ? records.impactHandH : currentCalculatedState.impactHandHeightCm,
      takebackLeadElbow: records.takebackLeadElbow,
      impactBackElbow: records.impactBackElbow
    }
  };
}

function shareRecordToLine(groupKey) {
  const allRecords = getSavedRecords();
  const groupRecords = allRecords.filter(r => `${r.playerName}_${r.date}` === groupKey);
  if (groupRecords.length === 0) return;

  const first = groupRecords[0];
  const sideRec = groupRecords.find(r => r.mode === 'SIDE');
  const frontRec = groupRecords.find(r => r.mode === 'FRONT');

  let text = `💥 【打撃バイオメカニクス 選手レポート】 ⚾\n`;
  text += `👤 選手名: ${first.playerName} 選手 (${first.height}cm / ${first.batSide === 'RIGHT' ? '右打ち' : '左打ち'})\n`;
  text += `📅 測定日: ${first.date}\n\n`;

  if (sideRec) {
    const isLeft = (first.batSide === 'LEFT');
    text += `📊 【横向き測定データ（論文準拠）】\n`;
    text += `・捻転差(下半身先行): ${sideRec.metrics.twist >= 0 ? '+' : ''}${sideRec.metrics.twist}° (${sideRec.metrics.twistLabel || 'タメ'})\n`;
    text += `・前ヒザの壁: 屈曲 ${sideRec.metrics.impactKneeFlex}°\n`;
    if (sideRec.metrics.takebackLeadElbow !== null && sideRec.metrics.takebackLeadElbow !== undefined) {
      text += `・テイクバック前ヒジ(${isLeft ? '右' : '左'}): ${sideRec.metrics.takebackLeadElbow}°\n`;
    }
    if (sideRec.metrics.impactBackElbow !== null && sideRec.metrics.impactBackElbow !== undefined) {
      text += `・インパクト後ヒジ(${isLeft ? '左' : '右'}): ${sideRec.metrics.impactBackElbow}°\n`;
    }
    text += `・ステップ幅: ${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio}%身)\n`;
    text += `・頭の突っ込み(前後): ${sideRec.metrics.headShift}cm\n`;
    text += `・頭の上下動(沈み込み): ${sideRec.metrics.headShiftY || 0}cm\n`;
    text += `・体幹スイング軸傾斜: ${sideRec.metrics.trunkTilt}°\n`;
    text += `・トップ高: ${sideRec.metrics.topHandH}cm / インパクト高: ${sideRec.metrics.impactHandH || '--'}cm\n\n`;
  }

  if (frontRec) {
    text += `🎯 【正面測定データ（論文準拠）】\n`;
    text += `・頭の横ブレ(目線): ${frontRec.metrics.headShiftX}cm\n`;
    text += `・頭の上下動(目線): ${frontRec.metrics.headShiftY}cm\n`;
    text += `・前肩の開き(タメ): ${frontRec.metrics.shoulderOpen || 0}° (${frontRec.metrics.shoulderOpenLabel || 'タメ十分'})\n`;
    text += `・前ヒザの踏ん張り(割れ): ${frontRec.metrics.kneeValgus || 0}° (${frontRec.metrics.kneeValgusLabel || '正常'})\n`;
    text += `・ステップズレ: ${frontRec.metrics.inStep}cm (${frontRec.metrics.inStepDir || 'まっすぐ'})\n`;
    text += `・上半身の傾き: ${frontRec.metrics.trunkTilt}°\n\n`;
  }

  text += generateBattingAICoachAdvice(first) + "\n\n";

  text += `👦 【せんしゅのふりかえり】\n`;
  text += `・打った感覚: ${first.feelGrade || '😆 めっちゃ芯で捉えた！'}\n`;
  text += `・カラダの調子: ${first.bodyCondition || '🟢 どこも痛くない！元気！'}\n`;
  if (first.playerNote && first.playerNote.trim() !== '') {
    text += `・ひとこと: 「${first.playerNote.trim()}」\n`;
  }

  var shareTitle = `${first.playerName}選手の打撃フォームレポート`;
  function fallbackShare() {
    if (navigator.share) {
      navigator.share({ title: shareTitle, text: text }).catch(err => {
        if (err.name !== 'AbortError') console.log('Share error:', err);
      });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showToast("📋 レポート文をクリップボードにコピーしました！\nLINE等に貼り付けて監督に送れます。");
      });
      return;
    }
    showToast("📋 共有メニューを開けませんでした");
  }
  if (typeof nativeSharePayload === 'function') {
    nativeSharePayload(shareTitle, text).then(function(handled) {
      if (!handled) fallbackShare();
    });
    return;
  }
  fallbackShare();
}

function renderCarteList(isInitialOpen) {
  const allRecords = getSavedRecords();
  carteHistoryList.innerHTML = '';

  const playerNames = Array.from(new Set(allRecords.map(r => r.playerName)));
  const previousSelection = playerSelectFilter.value;

  playerSelectFilter.innerHTML = '<option value="ALL">🌟 全員のカルテを表示</option>';
  playerNames.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = `👤 ${p}`;
    playerSelectFilter.appendChild(opt);
  });

  if (isInitialOpen) {
    playerSelectFilter.value = playerNames.includes(playerName) ? playerName : 'ALL';
  } else if (playerNames.includes(previousSelection) || previousSelection === 'ALL') {
    playerSelectFilter.value = previousSelection;
  } else {
    playerSelectFilter.value = 'ALL';
  }

  const selectedFilter = playerSelectFilter.value;
  btnDeleteAction.textContent = (selectedFilter === 'ALL') ? "⚠️ 全カルテ初期化" : `🗑️ ${selectedFilter}を全削除`;

  const filtered = selectedFilter === 'ALL' ? allRecords : allRecords.filter(r => r.playerName === selectedFilter);

  if (filtered.length === 0) {
    carteHistoryList.innerHTML = '<div style="text-align:center; padding: 20px; color:#64748b; font-weight:800;">保存されたカルテはありません</div>';
    return;
  }

  const groups = {};
  filtered.forEach(r => {
    const key = `${r.playerName}_${r.date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  Object.keys(groups).forEach(key => {
    const recs = groups[key];
    const first = recs[0];
    const sideRec = recs.find(r => r.mode === 'SIDE');
    const frontRec = recs.find(r => r.mode === 'FRONT');
    const isLeft = (first.batSide === 'LEFT');

    const curFeel = first.feelGrade || "😆 めっちゃ芯で捉えた！";
    const curBody = first.bodyCondition || "🟢 どこも痛くない！元気！";

    const card = document.createElement('div');
    card.className = 'history-card';

    const aiAdviceHtml = generateBattingDiagnosisHtml(first);

    card.innerHTML = `
      <div class="history-card-head">
        <span>👤 ${first.playerName} (${first.height}cm・${isLeft ? '左打' : '右打'})</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="color:#64748b; font-size:0.65rem;">📅 ${first.date}</span>
          <button class="btn-item-delete" data-group="${key}">🗑️</button>
        </div>
      </div>

      <div class="history-unified-grid">
        <div class="metric-section-block">
          <div class="metric-section-title">
            <span>🏏 横向き（側方）解析</span>
            <span style="font-size:0.60rem; color:${sideRec ? '#10b981' : '#94a3b8'};">${sideRec ? '● 測定済' : '○ 未測定'}</span>
          </div>
          ${sideRec ? `
            <div class="metric-row-item"><span>🔄 捻転差(タメ):</span><b>${sideRec.metrics.twist >= 0 ? '+' : ''}${sideRec.metrics.twist}° (${sideRec.metrics.twistLabel || 'タメ'})</b></div>
            <div class="metric-row-item"><span>🦵 前ヒザの壁:</span><b>屈曲 ${sideRec.metrics.impactKneeFlex}°</b></div>
            <div class="metric-row-item"><span>💪 テイクバック前ヒジ:</span><b>${sideRec.metrics.takebackLeadElbow !== undefined && sideRec.metrics.takebackLeadElbow !== null ? sideRec.metrics.takebackLeadElbow + '°' : '--'}</b></div>
            <div class="metric-row-item"><span>💥 インパクト後ヒジ:</span><b>${sideRec.metrics.impactBackElbow !== undefined && sideRec.metrics.impactBackElbow !== null ? sideRec.metrics.impactBackElbow + '°' : '--'}</b></div>
            <div class="metric-row-item"><span>🚶 ステップ幅:</span><b>${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio}%)</b></div>
            <div class="metric-row-item"><span>👀 頭の突っ込み:</span><b>${sideRec.metrics.headShift}cm</b></div>
            <div class="metric-row-item"><span>👀 頭の上下動:</span><b>${sideRec.metrics.headShiftY || 0}cm</b></div>
            <div class="metric-row-item"><span>📐 スイング軸傾斜:</span><b>${sideRec.metrics.trunkTilt}°</b></div>
            <div class="metric-row-item"><span>✊ トップ/インパクト高:</span><b>${sideRec.metrics.topHandH}cm / ${sideRec.metrics.impactHandH || '--'}cm</b></div>
          ` : `
            <div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">横向き動画のデータなし</div>
          `}
        </div>

        <div class="metric-section-block">
          <div class="metric-section-title">
            <span>🎯 正面（投手側）解析</span>
            <span style="font-size:0.60rem; color:${frontRec ? '#10b981' : '#94a3b8'};">${frontRec ? '● 測定済' : '○ 未測定'}</span>
          </div>
          ${frontRec ? `
            <div class="metric-row-item"><span>👀 頭の横ブレ:</span><b>${frontRec.metrics.headShiftX}cm</b></div>
            <div class="metric-row-item"><span>👀 頭の上下動:</span><b>${frontRec.metrics.headShiftY}cm</b></div>
            <div class="metric-row-item"><span>🛡️ 前肩の開き:</span><b>${frontRec.metrics.shoulderOpen || 0}° (${frontRec.metrics.shoulderOpenLabel || 'タメ十分'})</b></div>
            <div class="metric-row-item"><span>🦵 前ヒザの踏ん張り:</span><b>${frontRec.metrics.kneeValgus || 0}° (${frontRec.metrics.kneeValgusLabel || '正常'})</b></div>
            <div class="metric-row-item"><span>🚶 踏出ズレ:</span><b>${frontRec.metrics.inStep}cm (${frontRec.metrics.inStepDir || 'まっすぐ'})</b></div>
            <div class="metric-row-item"><span>📐 軸の左右傾き:</span><b>${frontRec.metrics.trunkTilt}°</b></div>
          ` : `
            <div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">正面動画のデータなし</div>
          `}
        </div>
      </div>

      <div class="trainer-diagnosis-list">${aiAdviceHtml}</div>

      <div class="player-reflection-box">
        <div class="reflection-sec-title">🏏 今日の打撃の感覚は？</div>
        <div class="chip-group" data-type="feel" data-group="${key}">
          <div class="choice-chip ${curFeel.includes('芯') ? 'active' : ''}" data-val="😆 めっちゃ芯で捉えた！">😆 芯で捉えた</div>
          <div class="choice-chip ${curFeel.includes('ふつう') ? 'active' : ''}" data-val="😊 ふつう・いつも通り">😊 いつも通り</div>
          <div class="choice-chip ${curFeel.includes('詰まった') || curFeel.includes('いまいち') ? 'active' : ''}" data-val="😣 詰まった / 泳がされた">😣 詰まった</div>
        </div>

        <div class="reflection-sec-title">💪 カラダの調子・違和感</div>
        <div class="chip-group" data-type="body" data-group="${key}">
          <div class="choice-chip ${curBody.includes('痛くない') ? 'active' : ''}" data-val="🟢 どこも痛くない！元気！">🟢 痛くない</div>
          <div class="choice-chip ${curBody.includes('重い') ? 'active' : ''}" data-val="🟡 腰や手首がちょっと重い">🟡 ちょっと重い</div>
          <div class="choice-chip ${curBody.includes('違和感') ? 'active' : ''}" data-val="🔴 腰や手首に違和感・痛みあり">🔴 違和感あり</div>
        </div>

        <div class="reflection-sec-title">📝 じぶんの気づき、監督、お父さん、お母さんへひとこと</div>
        <textarea class="player-textarea" data-group="${key}" placeholder="気づいたことや、次にやってみたいことを書いてね！">${first.playerNote || ''}</textarea>

        <button class="btn-share-line" data-group="${key}">
          <span>💬 📤 今日の打撃レポートを監督に送る</span>
        </button>
      </div>
    `;
    carteHistoryList.appendChild(card);
  });

  if (typeof MotionPlayerCore !== 'undefined') MotionPlayerCore.bindCarteInteractions();
}


function createMotionState() {
  return {
    twistSignedDeg: 0,
    twistStatusLabel: "同調 (0°)",
    kneeFlexAngle: 0,
    strideCm: 0,
    trunkTiltDeg: 0,
    headShiftCm: 0,
    headShiftYCm: 0,
    topHandHeightCm: 0,
    impactHandHeightCm: 0,
    inStepCm: 0,
    inStepDir: "まっすぐ",
    shoulderOpenDeg: 0,
    shoulderOpenLabel: "◎ タメ十分 (壁キープ)",
    kneeValgusAngle: 0,
    kneeValgusLabel: "まっすぐ (◎ 正常)",
    leadElbowAngle: 0,
    backElbowAngle: 0
  };
}

function createMotionRecords() {
  return {
    maxTwistSigned: 0,
    twistStatusLabel: null,
    impactKneeFlex: null,
    maxStride: 0,
    maxTrunkTilt: 0,
    maxHeadShift: 0,
    maxHeadShiftRatio: 0,
    maxHeadShiftY: 0,
    maxTopHandH: 0,
    impactHandH: null,
    impactShoulderOpen: null,
    impactShoulderOpenLabel: null,
    maxInStepCm: 0,
    inStepDir: "まっすぐ",
    impactKneeValgus: null,
    impactKneeValgusLabel: null,
    takebackLeadElbow: null,
    impactBackElbow: null
  };
}

function resetMotionRecords() { return createMotionRecords(); }

function decorateSavedRecord(entry) {
  entry.batSide = selectedBatSide;
}

function onStartAnalysis() {
  initialNoseX = null;
  initialNoseY = null;
}

function onResetAnalysis() {
  initialNoseX = null;
  initialNoseY = null;
}

function onReselectVideo() {
  initialNoseX = null;
  initialNoseY = null;
}

function buildCsvDocument(allRecords) {
  var csvContent = "\uFEFF日付,選手名,身長,打席,測定向き,捻転差(deg),捻転状態,前ヒザ壁(deg),テイクバック前ヒジ(deg),インパクト後ヒジ(deg),ステップ幅(cm),ステップ率(%),頭突っ込み(cm),頭上下動(cm),スイング軸傾斜(deg),頭横ブレ(cm),前肩開き(deg),前肩状態,前ヒザ内外反(deg),ステップズレ(cm),打った感覚,カラダの調子,選手コメント\n";
  allRecords.forEach(function(r) {
    var isSide = (r.mode === 'SIDE');
    var noteSafe = '"' + (r.playerNote || '').replace(/"/g, '""') + '"';
    var row = [
      '"' + r.date + '"',
      '"' + r.playerName + '"',
      r.height,
      r.batSide === 'RIGHT' ? "右打" : "左打",
      isSide ? "横向き" : "正面",
      isSide ? r.metrics.twist : "",
      isSide ? '"' + (r.metrics.twistLabel || '') + '"' : "",
      isSide ? r.metrics.impactKneeFlex : "",
      isSide ? (r.metrics.takebackLeadElbow || "") : "",
      isSide ? (r.metrics.impactBackElbow || "") : "",
      isSide ? r.metrics.stride : "",
      isSide ? r.metrics.strideRatio : "",
      isSide ? r.metrics.headShift : "",
      isSide ? (r.metrics.headShiftY || 0) : (!isSide ? r.metrics.headShiftY : ""),
      isSide ? r.metrics.trunkTilt : r.metrics.trunkTilt,
      !isSide ? r.metrics.headShiftX : "",
      !isSide ? (r.metrics.shoulderOpen || 0) : "",
      !isSide ? '"' + (r.metrics.shoulderOpenLabel || '') + '"' : "",
      !isSide ? (r.metrics.kneeValgus || 0) : "",
      !isSide ? (r.metrics.inStep || 0) : "",
      '"' + (r.feelGrade || '😆 芯で捉えた') + '"',
      '"' + (r.bodyCondition || '🟢 痛くない') + '"',
      noteSafe
    ];
    csvContent += row.join(",") + "\n";
  });
  return csvContent;
}

function bindModeExtras() {
  var btnBatRight = document.getElementById('btn-bat-right');
  var btnBatLeft = document.getElementById('btn-bat-left');
  btnBatRight.addEventListener('click', function() {
    selectedBatSide = 'RIGHT';
    btnBatRight.classList.add('active');
    btnBatLeft.classList.remove('active');
    updateCardLabels();
  });
  btnBatLeft.addEventListener('click', function() {
    selectedBatSide = 'LEFT';
    btnBatLeft.classList.add('active');
    btnBatRight.classList.remove('active');
    updateCardLabels();
  });
  document.getElementById('btn-manual-top').addEventListener('click', function() {
    if (typeof stopFrameAccuratePlayback === 'function') stopFrameAccuratePlayback();
    if (typeof nativeHaptic === 'function') nativeHaptic('LIGHT');
    records.takebackLeadElbow = currentCalculatedState.leadElbowAngle;
    paintHero(c9Max, 'TOP 前ヒジ', records.takebackLeadElbow + '°', true);
    if (typeof captureGhostLandmarks === 'function') captureGhostLandmarks(1, true);
    if (typeof redrawPoseOverlay === 'function') redrawPoseOverlay();
    showToast('🎯 トップ時の前ヒジ角度【' + records.takebackLeadElbow + '°】を記録しました！');
  });
  document.getElementById('btn-manual-impact').addEventListener('click', function() {
    if (typeof stopFrameAccuratePlayback === 'function') stopFrameAccuratePlayback();
    if (typeof nativeHaptic === 'function') nativeHaptic('MEDIUM');
    records.impactKneeFlex = currentCalculatedState.kneeFlexAngle;
    records.impactShoulderOpen = currentCalculatedState.shoulderOpenDeg;
    records.impactShoulderOpenLabel = currentCalculatedState.shoulderOpenLabel;
    records.impactBackElbow = currentCalculatedState.backElbowAngle;
    records.impactHandH = currentCalculatedState.impactHandHeightCm;
    records.impactKneeValgus = currentCalculatedState.kneeValgusAngle;
    records.impactKneeValgusLabel = currentCalculatedState.kneeValgusLabel;
    if (selectedAngleMode === 'SIDE') {
      paintHero(c2Max, 'IMPACT 前ヒザ', records.impactKneeFlex + '°', true);
      paintHero(c8Max, 'IMPACT グリップ', records.impactHandH + ' cm', true);
      paintHero(c10Max, 'IMPACT 後ヒジ', records.impactBackElbow + '°', true);
    } else {
      paintHero(c3Max, 'IMPACT 前肩', records.impactShoulderOpen + '°', true);
      paintHero(c6Max, 'IMPACT 前ヒザ', records.impactKneeValgus + '°', true);
      paintHero(c8Max, 'IMPACT グリップ', records.impactHandH + ' cm', true);
      paintHero(c10Max, 'IMPACT 後ヒジ', records.impactBackElbow + '°', true);
    }
    if (typeof captureGhostLandmarks === 'function') captureGhostLandmarks(2, true);
    if (typeof redrawPoseOverlay === 'function') redrawPoseOverlay();
    showToast('💥 インパクト瞬間の各数値を記録しました！');
  });
  if (typeof updateCardLabels === 'function') updateCardLabels();
}
