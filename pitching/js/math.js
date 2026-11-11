// 投球バイオメカニクス（角度・速度・フェーズ検出）
// フィジカル診断の文章は trainer/pitching_knowledge.js にある。

function escapeTrainerHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function trainerNumber(value) {
  return (typeof value === 'number' && Number.isFinite(value)) ? value : null;
}

function pitchingMeasured(metrics, flag, value) {
  const number = trainerNumber(value);
  if (number === null || metrics[flag] === false) return null;
  if (metrics[flag] !== true && number === 0) return null;
  return number;
}

function fillPhysicalText(text, tokens) {
  return String(text || '').replace(/\{([A-Za-z0-9_]+)\}/g, function(_, key) {
    return tokens[key] == null ? '' : String(tokens[key]);
  });
}

function selectPitchingPhysicalFindings(entry) {
  const copy = (typeof PITCHING_PHYSICAL_COPY !== 'undefined') ? PITCHING_PHYSICAL_COPY : null;
  const metrics = (entry && entry.metrics) || {};
  if (!copy) return { alerts: [], goods: [], notes: [] };

  const toe = pitchingMeasured(metrics, 'toeLocked', metrics.toeAngle);
  const arm = pitchingMeasured(metrics, 'armCaptured', metrics.armSlot);
  const knee = pitchingMeasured(metrics, 'ffKneeLocked', metrics.ffKneeFlex);
  const valgus = pitchingMeasured(metrics, 'valgusLocked', metrics.valgus);
  const outward = valgus !== null && valgus > 12 && String(metrics.valgusLabel || '').indexOf('割れ') !== -1;
  const stride = pitchingMeasured(metrics, 'strideCaptured', metrics.strideRatio);
  const trunk = pitchingMeasured(metrics, 'trunkCaptured', metrics.trunkTilt);
  const mer = pitchingMeasured(metrics, 'merCaptured', metrics.mer);
  const tokens = {
    toe: toe === null ? '--' : (toe + '°'),
    arm: arm === null ? '--' : (arm + '°'),
    knee: knee === null ? '--' : (knee + '°'),
    valgus: valgus === null ? '--' : (valgus + '°'),
    stride: stride === null ? '--' : (stride + '%'),
    trunk: trunk === null ? '--' : (trunk + '°'),
    mer: mer === null ? '--' : (mer + '°'),
    kneeOutNote: outward ? ('あわせてヒザが外側へ ' + valgus + '° 流れています。') : ''
  };

  const alerts = [];
  const goods = [];
  const notes = [];
  const toeOpen = toe !== null && (toe > 20 || String(metrics.toeLabel || '').indexOf('開き注意') !== -1);
  if (toeOpen) alerts.push('earlyOpen');
  else if (toe !== null && toe <= 10) notes.push('べた足のつま先 ' + tokens.toe);

  if (arm !== null && arm < 100) alerts.push('elbowLow');
  else if (arm !== null && arm >= 100) goods.push('elbowHeight');

  if (knee !== null && knee > 55) alerts.push('kneeFlex');
  else if (outward) alerts.push('kneeOut');
  else if (knee !== null && knee >= 15 && knee <= 55) goods.push('kneeGood');

  if (stride !== null && stride < 75) alerts.push('strideShort');
  else if (stride !== null && stride >= 80) goods.push('strideGood');
  else if (stride !== null) notes.push('ステップ幅 身長の ' + tokens.stride);

  if (trunk !== null && trunk < 25) alerts.push('trunkShort');
  else if (trunk !== null && trunk >= 30) goods.push('trunkGood');
  else if (trunk !== null) notes.push('体幹前傾の最大 ' + tokens.trunk);

  if (mer !== null && mer < 165) alerts.push('merShort');
  else if (mer !== null && mer >= 170) goods.push('merGood');
  else if (mer !== null) notes.push('肩の最大外旋 ' + tokens.mer);

  return { alerts: alerts, goods: goods, notes: notes, tokens: tokens, copy: copy };
}

function materializePitchingCard(id, pack) {
  const source = pack.copy[id];
  if (!source) return null;
  const tokens = Object.assign({}, pack.tokens, { detail: pack.notes.join('、') });
  return {
    summary: fillPhysicalText(source.summary, tokens),
    finding: fillPhysicalText(source.finding, tokens),
    cause: fillPhysicalText(source.cause, tokens),
    drills: (source.drills || []).map(function(item) { return fillPhysicalText(item, tokens); })
  };
}

function collectPitchingDiagnosisCards(entry) {
  const pack = selectPitchingPhysicalFindings(entry);
  if (!pack.copy) return [];
  let ids = pack.alerts.slice(0, 2);
  if (ids.length === 0) {
    const goodIds = pack.goods.filter(function(id) { return pack.copy[id]; });
    ids = goodIds.slice(0, 2);
  }
  if (ids.length === 0 && pack.notes.length > 0) ids = ['clear'];
  if (ids.length === 0) ids = ['waiting'];
  return ids.map(function(id) { return materializePitchingCard(id, pack); }).filter(Boolean);
}

function renderPitchingDiagnosisHtml(cards) {
  return cards.map(function(card) {
    const drills = card.drills.length
      ? '<ul>' + card.drills.map(function(item) { return '<li>' + escapeTrainerHtml(item) + '</li>'; }).join('') + '</ul>'
      : '';
    return '<article class="trainer-diagnosis-card">' +
      '<div class="diagnosis-header">' +
        '<span class="diagnosis-badge">🏋️ フィジカル・可動域診断</span>' +
        '<span class="diagnosis-summary">【要点】' + escapeTrainerHtml(card.summary) + '</span>' +
      '</div>' +
      '<div class="diagnosis-body">' +
        '<p class="diagnosis-finding"><strong>🔍 動作の現れ:</strong> ' + escapeTrainerHtml(card.finding) + '</p>' +
        '<p class="diagnosis-cause"><strong>🎯 疑われる身体要因:</strong> ' + escapeTrainerHtml(card.cause) + '</p>' +
        (drills ? '<div class="diagnosis-prescription"><strong>💡 おすすめの身体ケア・補強:</strong>' + drills + '</div>' : '') +
      '</div></article>';
  }).join('');
}

function renderPitchingDiagnosisText(cards) {
  return cards.map(function(card) {
    const drills = card.drills.map(function(item) { return '・' + item; }).join('\n');
    return '【🏋️ フィジカル・可動域診断】' + card.summary +
      '\n動作の現れ: ' + card.finding +
      '\n疑われる身体要因: ' + card.cause +
      (drills ? '\nおすすめの身体ケア・補強:\n' + drills : '');
  }).join('\n\n');
}

function generatePitchingDiagnosisHtml(entry) {
  return renderPitchingDiagnosisHtml(collectPitchingDiagnosisCards(entry));
}

function generatePitchingAICoachAdvice(entry) {
  return renderPitchingDiagnosisText(collectPitchingDiagnosisCards(entry));
}

function getSegmentAngle3D(p1, p2) {
  if (!p1 || !p2) return NaN;
  return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180.0) / Math.PI;
}

function calcJointAngle3D(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return NaN;
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: (p1.z || 0) - (p2.z || 0) };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: (p3.z || 0) - (p2.z || 0) };

  const mag1 = Math.hypot(v1.x, v1.y, v1.z);
  const mag2 = Math.hypot(v2.x, v2.y, v2.z);
  if (mag1 < 1e-6 || mag2 < 1e-6) return NaN;

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const cosVal = Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)));
  return (Math.acos(cosVal) * 180.0) / Math.PI;
}

function calcTrueMER(shoulderL, shoulderR, hipL, hipR, elbow, wrist) {
  if (!shoulderL || !shoulderR || !hipL || !hipR || !elbow || !wrist) return NaN;

  const midShoulder = {
    x: (shoulderL.x + shoulderR.x) / 2,
    y: (shoulderL.y + shoulderR.y) / 2,
    z: ((shoulderL.z || 0) + (shoulderR.z || 0)) / 2
  };
  const midHip = {
    x: (hipL.x + hipR.x) / 2,
    y: (hipL.y + hipR.y) / 2,
    z: ((hipL.z || 0) + (hipR.z || 0)) / 2
  };

  const trunkV = {
    x: midShoulder.x - midHip.x,
    y: midShoulder.y - midHip.y,
    z: midShoulder.z - midHip.z
  };

  const forearmV = {
    x: wrist.x - elbow.x,
    y: wrist.y - elbow.y,
    z: (wrist.z || 0) - (elbow.z || 0)
  };

  const trunkMag = Math.hypot(trunkV.x, trunkV.y, trunkV.z);
  const forearmMag = Math.hypot(forearmV.x, forearmV.y, forearmV.z);
  if (trunkMag < 1e-6 || forearmMag < 1e-6) return NaN;

  const dot = trunkV.x * forearmV.x + trunkV.y * forearmV.y + trunkV.z * forearmV.z;
  const cosVal = Math.max(-1.0, Math.min(1.0, dot / (trunkMag * forearmMag)));
  const baseAngle = (Math.acos(cosVal) * 180.0) / Math.PI;

  return 180.0 - baseAngle;
}

function applyPitchingBiomechanics(landmarks, b) {
  currentCalculatedState.kneeFlexReady = false;
  currentCalculatedState.releaseHeightCm = null;
  currentCalculatedState.releaseLateralCm = null;
  currentCalculatedState.trunkTiltDeg = null;
  currentCalculatedState.trunkLateralDeg = null;
  currentCalculatedState.elbowFlexDeg = null;
  currentCalculatedState.merDeg = null;

  const L_SHOULDER = landmarks[11];
  const R_SHOULDER = landmarks[12];
  const L_ELBOW = landmarks[13];
  const R_ELBOW = landmarks[14];
  const L_WRIST = landmarks[15];
  const R_WRIST = landmarks[16];
  const L_INDEX = landmarks[19];
  const R_INDEX = landmarks[20];
  const L_HIP = landmarks[23];
  const R_HIP = landmarks[24];
  const L_KNEE = landmarks[25];
  const R_KNEE = landmarks[26];
  const L_ANKLE = landmarks[27];
  const R_ANKLE = landmarks[28];
  const L_HEEL = landmarks[29];
  const R_HEEL = landmarks[30];
  const L_FOOT_INDEX = landmarks[31];
  const R_FOOT_INDEX = landmarks[32];

  const normalizedStatureHeight = (tuneRuler.bottomYNorm - tuneRuler.topYNorm) > 0.1 ? (tuneRuler.bottomYNorm - tuneRuler.topYNorm) : 0.75;
  const activePxPerCm = (normalizedStatureHeight * b.h) / userHeightCm;

  const isRightHanded = (selectedThrowArm === 'RIGHT');
  const isSouthpaw = !isRightHanded;

  const throwShoulder = isRightHanded ? R_SHOULDER : L_SHOULDER;
  const throwElbow = isRightHanded ? R_ELBOW : L_ELBOW;
  const throwWrist = isRightHanded ? R_WRIST : L_WRIST;
  let throwIndex = isRightHanded ? R_INDEX : L_INDEX;

  if (throwWrist && throwIndex) {
    const handDist = Math.hypot(throwIndex.x - throwWrist.x, throwIndex.y - throwWrist.y);
    if (handDist > 0.18 || throwIndex.visibility < 0.25) {
      throwIndex = throwWrist;
    }
  }

  if (throwShoulder && throwElbow && throwWrist) {
    const elbowInterior = calcJointAngle3D(throwShoulder, throwElbow, throwWrist);
    if (Number.isFinite(elbowInterior)) {
      currentCalculatedState.elbowFlexDeg = Math.max(0, Math.round(180 - elbowInterior));
    }
  }

  const leadHip = isRightHanded ? L_HIP : R_HIP;
  const leadKnee = isRightHanded ? L_KNEE : R_KNEE;
  const leadAnkle = isRightHanded ? L_ANKLE : R_ANKLE;
  const leadHeel = isRightHanded ? (L_HEEL || L_ANKLE) : (R_HEEL || R_ANKLE);
  const leadToe = isRightHanded ? (L_FOOT_INDEX || L_ANKLE) : (R_FOOT_INDEX || R_ANKLE);

  const pivotHeel = isRightHanded ? (R_HEEL || R_ANKLE) : (L_HEEL || L_ANKLE);

  if (leadToe) {
    lastCalculatedLeadToePt = {
      x: b.x + leadToe.x * b.w,
      y: b.y + leadToe.y * b.h
    };
  }

  if (typeof rememberPoseLandmarks === 'function') rememberPoseLandmarks(landmarks);

  let currentStrideCm = 0;
  let isStepping = false;
  let isKinematicFF = false;

  if (leadHeel && leadToe && pivotHeel) {
    const currentStridePx = Math.hypot((leadHeel.x - pivotHeel.x) * b.w, (leadHeel.y - pivotHeel.y) * b.h);
    currentStrideCm = currentStridePx / activePxPerCm;
    isStepping = currentStrideCm > (userHeightCm * 0.35);

    if (isStepping) {
      const currentLeadToeY = leadToe.y;
      if (prevLeadToeY !== null) {
        const toeVel = (currentLeadToeY - prevLeadToeY);
        if (Math.abs(toeVel) < 0.003 && currentLeadToeY >= (pivotHeel.y - 0.05)) {
          leadFootFlatStationaryCount++;
          if (leadFootFlatStationaryCount === 2) {
            isKinematicFF = true;
            if (typeof captureGhostLandmarks === 'function') captureGhostLandmarks(1, false);
          }
        } else {
          leadFootFlatStationaryCount = 0;
        }
      }
      prevLeadToeY = currentLeadToeY;
    }
  }

  if (selectedAngleMode === 'SIDE') {
    if (Number.isFinite(currentStrideCm)) {
      const strideCm = Math.round(currentStrideCm);
      if (strideCm >= 15 && strideCm <= Math.round(userHeightCm * 1.15)) {
        const strideRatio = Math.round((strideCm / userHeightCm) * 100);
        c1Val.textContent = `${strideCm} cm`;
        if (strideCm > records.maxStride) {
          records.maxStride = strideCm;
          paintHero(c1Max, 'MAX ステップ', `${strideCm}cm (${strideRatio}%)`, true);
        }
      }
    }

    if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP && throwElbow && throwWrist) {
      const trueMerDeg = calcTrueMER(L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, throwElbow, throwWrist);
      if (Number.isFinite(trueMerDeg) && trueMerDeg >= 30 && trueMerDeg <= 200) {
        const roundedMER = Math.round(trueMerDeg);
        currentCalculatedState.merDeg = roundedMER;
        c2Val.textContent = `${roundedMER}°`;
        if (roundedMER > records.maxMER && roundedMER <= 190) {
          records.maxMER = roundedMER;
          paintHero(c2Max, 'MER 肩外旋', `${roundedMER}°`, true);
        }
      }
    }

    if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
      const shoulderAngle = getSegmentAngle3D(L_SHOULDER, R_SHOULDER);
      const hipAngle = getSegmentAngle3D(L_HIP, R_HIP);
      if (Number.isFinite(shoulderAngle) && Number.isFinite(hipAngle)) {
        let diff = Math.abs(shoulderAngle - hipAngle);
        if (diff > 180) diff = 360 - diff;
        const roundedTwist = Math.round(diff);
        if (roundedTwist <= 65) {
          c3Val.textContent = `${roundedTwist}°`;
          if (roundedTwist > records.maxTwist && roundedTwist >= 5) {
            records.maxTwist = roundedTwist;
            paintHero(c3Max, 'MAX 捻転差', `${roundedTwist}°`, true);
          }
        }
      }
    }

    let isHandForward = false;
    if (throwWrist && throwShoulder && leadHeel && pivotHeel) {
      const isThrowingToRight = leadHeel.x > pivotHeel.x;
      isHandForward = isThrowingToRight ? (throwWrist.x >= throwShoulder.x - 0.05) : (throwWrist.x <= throwShoulder.x + 0.05);
    }
    const isThrowingPhase = (currentStrideCm > (userHeightCm * 0.50)) && throwWrist && throwShoulder && (throwWrist.y < throwShoulder.y) && isHandForward;

    if (leadHip && leadKnee && leadAnkle) {
      const rawKneeAngle = calcJointAngle3D(leadHip, leadKnee, leadAnkle);
      if (Number.isFinite(rawKneeAngle) && rawKneeAngle >= 40 && rawKneeAngle <= 180) {
        const flexAngle = Math.max(0, Math.round(180 - rawKneeAngle));
        currentCalculatedState.kneeFlexAngle = flexAngle;
        currentCalculatedState.kneeFlexReady = true;
        c5Val.textContent = `屈曲 ${flexAngle}°`;

        if (isKinematicFF && records.ffKneeFlex === null) {
          records.ffKneeFlex = flexAngle;
        }

        paintSideKneeHero();
      }
    }

    if (leadHeel && pivotHeel) {
      const lowestGroundY = Math.max(leadHeel.y, pivotHeel.y) * b.h;
      const releaseTarget = (throwIndex && throwIndex.y !== undefined) ? throwIndex : throwWrist;
      if (releaseTarget) {
        const releasePointY = releaseTarget.y * b.h;
        const releaseHeightPx = Math.max(0, lowestGroundY - releasePointY);
        const releaseHeightCm = Math.round(releaseHeightPx / activePxPerCm);

        if (Number.isFinite(releaseHeightCm) && releaseHeightCm >= 40 && releaseHeightCm <= Math.round(userHeightCm * 1.45)) {
          currentCalculatedState.releaseHeightCm = releaseHeightCm;
          c4Val.textContent = `${releaseHeightCm} cm`;
          if (manualReleaseTime == null && isThrowingPhase && releaseHeightCm > records.maxRelease) {
            records.maxRelease = releaseHeightCm;
            if (currentCalculatedState.kneeFlexReady) {
              records.releaseKneeFlex = currentCalculatedState.kneeFlexAngle;
            }
            paintHero(c4Max, 'RELEASE 高さ', `${releaseHeightCm} cm`, true);
          }
        }
      }
    }

    if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
      const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
      const midHip = { x: (L_HIP.x + R_HIP.x)/2, y: (L_HIP.y + R_HIP.y)/2 };
      const trunkDeg = Math.round(Math.abs((Math.atan2(midShoulder.x - midHip.x, midHip.y - midShoulder.y) * 180.0) / Math.PI));
      if (Number.isFinite(trunkDeg) && trunkDeg <= 60) {
        currentCalculatedState.trunkTiltDeg = trunkDeg;
        c6Val.textContent = `${trunkDeg}°`;
        if (trunkDeg > records.maxTrunkTilt) {
          records.maxTrunkTilt = trunkDeg;
          paintHero(c6Max, 'MAX 体幹前傾', `${trunkDeg}°`, true);
        }
      }
    }

  } else {
    if (leadHeel && leadToe && leadAnkle) {
      if (!isStepping) {
        smoothToeDeg = 0;
        c1Val.textContent = `0°`;
      } else {
        const deltaX = (leadToe.x - leadHeel.x) * b.w;
        const deltaY = Math.max(10, (leadToe.y - leadHeel.y) * b.h);
        let angleDeg = (Math.atan2(deltaX, deltaY) * 180.0 / Math.PI) + manualToeOffsetDeg;
        let signedToeDev = isRightHanded ? angleDeg : -angleDeg;
        smoothToeDeg = smoothToeDeg === 0 ? signedToeDev : (smoothToeDeg * 0.7 + signedToeDev * 0.3);
        const displayAngle = Math.round(Math.abs(smoothToeDeg));
        let stateLabel = "◎ ストレート (0〜10°)";

        if (smoothToeDeg > 20) stateLabel = "⚠️ 開き注意 (アウト)";
        else if (smoothToeDeg > 10) stateLabel = "○ やや開き";
        else if (smoothToeDeg < -15) stateLabel = "⚠️ 被り・閉じすぎ (イン)";
        else if (smoothToeDeg < -5) stateLabel = "○ やや閉じ (クローズ)";

        currentCalculatedState.displayToeAngle = displayAngle;
        currentCalculatedState.toeStateLabel = stateLabel;
        c1Val.textContent = `${displayAngle}°`;

        if (isKinematicFF && records.fcToeAngle === null) {
          records.fcToeAngle = displayAngle;
          records.fcToeLabel = `べた足時: ${displayAngle}° (${stateLabel})`;
        }
        if (records.fcToeAngle !== null) {
          paintHero(c1Max, 'SFC つま先', `${records.fcToeAngle}°`, true);
        }
      }
    }

    if (leadHip && leadKnee && leadAnkle) {
      const thighAngle = Math.atan2(leadKnee.y - leadHip.y, leadKnee.x - leadHip.x);
      const shankAngle = Math.atan2(leadAnkle.y - leadKnee.y, leadAnkle.x - leadKnee.x);
      let valgusDiff = (shankAngle - thighAngle) * 180.0 / Math.PI;
      if (valgusDiff > 180) valgusDiff -= 360;
      if (valgusDiff < -180) valgusDiff += 360;

      let devAngle = isRightHanded ? -valgusDiff : valgusDiff;
      let absDev = Math.min(30, Math.round(Math.abs(devAngle)));
      let valgusStatus = "まっすぐ (◎ 正常)";
      if (absDev > 12) valgusStatus = (devAngle > 0) ? "⚠️ ニーイン (外反)" : "⚠️ 割れ (内反)";
      else if (absDev > 6) valgusStatus = (devAngle > 0) ? "○ やや内入り" : "○ やや外開き";

      currentCalculatedState.kneeDevAngle = absDev;
      currentCalculatedState.kneeStateLabel = valgusStatus;
      c2Val.textContent = `${absDev}°`;

      if (isKinematicFF && records.ffValgusAngle === null) {
        records.ffValgusAngle = absDev;
        records.ffValgusLabel = `べた足時: ${absDev}° (${valgusStatus})`;
      }
      if (records.ffValgusAngle !== null) {
        paintHero(c2Max, 'SFC 膝角度', `${records.ffValgusAngle}°`, true);
      }
      if (absDev > records.maxValgus && isStepping) records.maxValgus = absDev;
    }

    if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
      const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
      const midHip = { x: (L_HIP.x + R_HIP.x)/2, y: (L_HIP.y + R_HIP.y)/2 };
      const lateralDeg = Math.round(Math.abs((Math.atan2(midShoulder.x - midHip.x, midHip.y - midShoulder.y) * 180.0) / Math.PI));
      if (Number.isFinite(lateralDeg) && lateralDeg <= 45) {
        currentCalculatedState.trunkLateralDeg = lateralDeg;
        c3Val.textContent = `${lateralDeg}°`;
        if (lateralDeg > records.maxTrunkLateral) {
          records.maxTrunkLateral = lateralDeg;
          paintHero(c3Max, 'MAX 側屈', `${lateralDeg}°`, true);
        }
      }
    }

    if (throwWrist && throwShoulder && L_SHOULDER && R_SHOULDER) {
      const otherShoulder = isRightHanded ? L_SHOULDER : R_SHOULDER;
      const armSlotAngle = calcJointAngle3D(throwWrist, throwShoulder, otherShoulder);
      if (Number.isFinite(armSlotAngle) && armSlotAngle >= 30 && armSlotAngle <= 180) {
        const roundedSlot = Math.round(armSlotAngle);
        c4Val.textContent = `${roundedSlot}°`;
        if (roundedSlot > records.maxArmSlot) {
          records.maxArmSlot = roundedSlot;
          paintHero(c4Max, 'MAX 挙上', `${roundedSlot}°`, true);
        }
      }
    }

    if (leadHeel && pivotHeel) {
      if (!isStepping) {
        c5Val.textContent = `0 cm`;
      } else {
        const lateralOffsetPx = Math.abs((leadHeel.x - pivotHeel.x) * b.w);
        const lateralOffsetCm = Math.round(lateralOffsetPx / activePxPerCm);
        if (Number.isFinite(lateralOffsetCm) && lateralOffsetCm <= 40) {
          const isCross = isRightHanded ? (leadHeel.x < pivotHeel.x) : (leadHeel.x > pivotHeel.x);
          const dirText = isCross ? "インステップ" : "アウトステップ";
          c5Val.textContent = `${lateralOffsetCm} cm`;
          if (lateralOffsetCm > records.maxInStepCm) {
            records.maxInStepCm = lateralOffsetCm;
            paintHero(c5Max, 'MAX 踏出', `${lateralOffsetCm}cm ${dirText}`, true);
          }
        }
      }
    }

    const isFrontThrowingPhase = isStepping && throwWrist && throwShoulder && (throwWrist.y < throwShoulder.y);
    if (L_SHOULDER && R_SHOULDER && (throwIndex || throwWrist)) {
      const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
      const releaseTarget = (throwIndex && throwIndex.x !== undefined) ? throwIndex : throwWrist;
      if (releaseTarget) {
        const lateralReleasePx = Math.abs((releaseTarget.x - midShoulder.x) * b.w);
        const lateralReleaseCm = Math.round(lateralReleasePx / activePxPerCm);
        if (Number.isFinite(lateralReleaseCm) && lateralReleaseCm <= 80) {
          currentCalculatedState.releaseLateralCm = lateralReleaseCm;
          c6Val.textContent = `${lateralReleaseCm} cm`;
          if (manualReleaseTime == null && isFrontThrowingPhase && lateralReleaseCm > records.maxReleaseLateral) {
            records.maxReleaseLateral = lateralReleaseCm;
            paintHero(c6Max, 'RELEASE 横幅', `${lateralReleaseCm} cm`, true);
          }
        }
      }
    }
  }

  if (typeof updateDrawerKeyBadge === 'function') updateDrawerKeyBadge();
  if (isSkeletonVisible) {
    drawPrecisionSkeleton(landmarks, b.x, b.y, b.w, b.h, isSouthpaw, isRightHanded);
  }
}
