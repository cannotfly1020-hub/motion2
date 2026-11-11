// 打撃バイオメカニクス（関節角度・骨盤/体幹の回旋・ステップ・軌道）
// フィジカル診断の文章は trainer/batting_knowledge.js にある。

function escapeTrainerHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function trainerNumber(value) {
  return (typeof value === 'number' && Number.isFinite(value)) ? value : null;
}

function fillPhysicalText(text, tokens) {
  return String(text || '').replace(/\{([A-Za-z0-9_]+)\}/g, function(_, key) {
    return tokens[key] == null ? '' : String(tokens[key]);
  });
}

function selectBattingPhysicalFindings(entry) {
  const copy = (typeof BATTING_PHYSICAL_COPY !== 'undefined') ? BATTING_PHYSICAL_COPY : null;
  const metrics = (entry && entry.metrics) || {};
  const empty = { alerts: [], goods: [], notes: [] };
  if (!copy) return empty;

  const twist = trainerNumber(metrics.twist);
  const twistCaptured = metrics.topTwistCaptured === true || (metrics.topTwistCaptured == null && twist !== null && twist !== 0);
  const knee = trainerNumber(metrics.impactKneeFlex);
  const kneeLocked = metrics.impactKneeLocked === true && knee !== null;
  const kneeOut = trainerNumber(metrics.kneeValgus);
  const kneeOutLocked = metrics.kneeValgusLocked === true && kneeOut !== null;
  const outward = kneeOutLocked && kneeOut > 10 && String(metrics.kneeValgusLabel || '').indexOf('外') !== -1;
  const headRatio = trainerNumber(metrics.headShiftRatio);
  const headCm = trainerNumber(metrics.headShift);
  const tokens = {
    twist: twist === null ? '--' : ((twist > 0 ? '+' : '') + twist + '°'),
    knee: knee === null ? '--' : (knee + '°'),
    kneeOut: kneeOut === null ? '--' : (kneeOut + '°'),
    headPct: headRatio === null ? '--' : (Math.round(headRatio * 100) + '%'),
    headCm: headCm === null ? '' : ('、' + headCm + 'cm'),
    kneeFlexNote: (kneeLocked && knee > 30) ? ('インパクト時の前足ヒザ屈曲は ' + knee + '°。') : ''
  };

  const alerts = [];
  const goods = [];
  const notes = [];
  if (twistCaptured && twist !== null) {
    if (twist < 30) alerts.push('twistShort');
    else if (twist >= 35) goods.push('twistGood');
    else notes.push('トップ捻転差 ' + tokens.twist);
  }
  if (outward || (kneeLocked && knee > 30)) {
    alerts.push(outward ? 'kneeOut' : 'kneeFlex');
  } else if (kneeLocked && knee >= 10 && knee <= 25) {
    goods.push('kneeGood');
  } else if (kneeLocked) {
    notes.push('インパクト前足ヒザ屈曲 ' + tokens.knee);
  }
  if (headRatio !== null && headRatio >= 0.10) alerts.push('headForward');
  else if (headRatio !== null && headRatio > 0) notes.push('頭の前方移動 画面幅の ' + tokens.headPct);

  return { alerts: alerts, goods: goods, notes: notes, tokens: tokens, copy: copy };
}

function materializePhysicalCard(id, pack) {
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

function collectBattingDiagnosisCards(entry) {
  const pack = selectBattingPhysicalFindings(entry);
  if (!pack.copy) return [];
  const ids = pack.alerts.slice(0, 2);
  if (ids.length === 0 && pack.goods.length > 0) ids.push.apply(ids, pack.goods.slice(0, 2));
  if (ids.length === 0 && pack.notes.length > 0) ids.push('clear');
  if (ids.length === 0) ids.push('waiting');
  return ids.map(function(id) { return materializePhysicalCard(id, pack); }).filter(Boolean);
}

function renderBattingDiagnosisHtml(cards) {
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

function renderBattingDiagnosisText(cards) {
  return cards.map(function(card) {
    const drills = card.drills.map(function(item) { return '・' + item; }).join('\n');
    return '【🏋️ フィジカル・可動域診断】' + card.summary +
      '\n動作の現れ: ' + card.finding +
      '\n疑われる身体要因: ' + card.cause +
      (drills ? '\nおすすめの身体ケア・補強:\n' + drills : '');
  }).join('\n\n');
}

function generateBattingDiagnosisHtml(entry) {
  return renderBattingDiagnosisHtml(collectBattingDiagnosisCards(entry));
}

function generateBattingAICoachAdvice(entry) {
  return renderBattingDiagnosisText(collectBattingDiagnosisCards(entry));
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

function applyBattingBiomechanics(landmarks, b) {
  const NOSE = landmarks[0];
  const L_SHOULDER = landmarks[11];
  const R_SHOULDER = landmarks[12];
  const L_ELBOW = landmarks[13];
  const R_ELBOW = landmarks[14];
  const L_WRIST = landmarks[15];
  const R_WRIST = landmarks[16];
  const L_HIP = landmarks[23];
  const R_HIP = landmarks[24];
  const L_KNEE = landmarks[25];
  const R_KNEE = landmarks[26];
  const L_ANKLE = landmarks[27];
  const R_ANKLE = landmarks[28];
  const L_HEEL = landmarks[29];
  const R_HEEL = landmarks[30];

  const normalizedStatureHeight = (tuneRuler.bottomYNorm - tuneRuler.topYNorm) > 0.1 ? (tuneRuler.bottomYNorm - tuneRuler.topYNorm) : 0.75;
  const activePxPerCm = (normalizedStatureHeight * b.h) / userHeightCm;

  const isRightBatter = (selectedBatSide === 'RIGHT');
  const frontHip = isRightBatter ? L_HIP : R_HIP;
  const backHip = isRightBatter ? R_HIP : L_HIP;
  const frontKnee = isRightBatter ? L_KNEE : R_KNEE;
  const frontAnkle = isRightBatter ? L_ANKLE : R_ANKLE;
  const frontHeel = isRightBatter ? (L_HEEL || L_ANKLE) : (R_HEEL || R_ANKLE);
  const backHeel = isRightBatter ? (R_HEEL || R_ANKLE) : (L_HEEL || L_ANKLE);

  const frontShoulder = isRightBatter ? L_SHOULDER : R_SHOULDER;
  const backShoulder = isRightBatter ? R_SHOULDER : L_SHOULDER;

  const topWrist = isRightBatter ? R_WRIST : L_WRIST;

  const leadElbowJoints = isRightBatter 
    ? { s: L_SHOULDER, e: L_ELBOW, w: L_WRIST } 
    : { s: R_SHOULDER, e: R_ELBOW, w: R_WRIST };
  const backElbowJoints = isRightBatter 
    ? { s: R_SHOULDER, e: R_ELBOW, w: R_WRIST } 
    : { s: L_SHOULDER, e: L_ELBOW, w: L_WRIST };

  if (typeof rememberPoseLandmarks === 'function') rememberPoseLandmarks(landmarks);

  if (NOSE && initialNoseX === null) {
    initialNoseX = NOSE.x;
    initialNoseY = NOSE.y;
  }

  if (frontShoulder && backShoulder && frontHip && backHip) {
    const hipDx = (frontHip.x - backHip.x);
    const hipDz = ((frontHip.z || 0) - (backHip.z || 0));
    const shoulderDx = (frontShoulder.x - backShoulder.x);
    const shoulderDz = ((frontShoulder.z || 0) - (backShoulder.z || 0));

    const hipRot = Math.atan2(hipDz, hipDx) * (180.0 / Math.PI);
    const shoulderRot = Math.atan2(shoulderDz, shoulderDx) * (180.0 / Math.PI);

    let signedTwist = isRightBatter ? (hipRot - shoulderRot) : (shoulderRot - hipRot);
    if (signedTwist > 180) signedTwist -= 360;
    if (signedTwist < -180) signedTwist += 360;
    
    let roundedTwist = Math.round(signedTwist);
    if (roundedTwist >= -40 && roundedTwist <= 60) {
      let twistLabel = "同調 (0°)";
      if (roundedTwist >= 22 && roundedTwist <= 38) {
        twistLabel = "💮 理想タメ (下半身先行)";
      } else if (roundedTwist > 38) {
        twistLabel = "○ タメ大";
      } else if (roundedTwist >= 10 && roundedTwist < 22) {
        twistLabel = "○ やや下半身先行";
      } else if (roundedTwist < -5) {
        twistLabel = "⚠️ 手打ち (上体先行)";
      }

      currentCalculatedState.twistSignedDeg = roundedTwist;
      currentCalculatedState.twistStatusLabel = twistLabel;

      if (selectedAngleMode === 'SIDE') {
        c1Val.textContent = `${roundedTwist >= 0 ? '+' : ''}${roundedTwist}°`;
        if (roundedTwist > records.maxTwistSigned && roundedTwist >= 5) {
          records.maxTwistSigned = roundedTwist;
          records.twistStatusLabel = twistLabel;
          paintHero(c1Max, 'TOP 捻転差', `+${roundedTwist}°`, true);
          if (typeof captureGhostLandmarks === 'function') captureGhostLandmarks(1, false);
        }
      }
    }
  }

  if (frontHip && frontKnee && frontAnkle) {
    const rawKneeAngle = calcJointAngle3D(frontHip, frontKnee, frontAnkle);
    if (Number.isFinite(rawKneeAngle) && rawKneeAngle >= 40 && rawKneeAngle <= 180) {
      const flexAngle = Math.max(0, Math.round(180 - rawKneeAngle));
      currentCalculatedState.kneeFlexAngle = flexAngle;
      if (selectedAngleMode === 'SIDE') {
        c2Val.textContent = `屈曲 ${flexAngle}°`;
      }
    }
  }

  if (frontHeel && backHeel) {
    const stridePx = Math.hypot((frontHeel.x - backHeel.x) * b.w, (frontHeel.y - backHeel.y) * b.h);
    const strideCm = Math.round(stridePx / activePxPerCm);
    if (Number.isFinite(strideCm) && strideCm >= 10 && strideCm <= Math.round(userHeightCm * 1.0)) {
      const strideRatio = Math.round((strideCm / userHeightCm) * 100);
      currentCalculatedState.strideCm = strideCm;
      if (selectedAngleMode === 'SIDE') {
        c3Val.textContent = `${strideCm} cm`;
        if (strideCm > records.maxStride) {
          records.maxStride = strideCm;
          paintHero(c3Max, 'MAX ステップ', `${strideCm}cm (${strideRatio}%)`, true);
        }
      }
    }
  }

  if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
    const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
    const midHip = { x: (L_HIP.x + R_HIP.x)/2, y: (L_HIP.y + R_HIP.y)/2 };
    const tiltDeg = Math.round(Math.abs((Math.atan2(midShoulder.x - midHip.x, midHip.y - midShoulder.y) * 180.0) / Math.PI));
    if (Number.isFinite(tiltDeg) && tiltDeg <= 55) {
      currentCalculatedState.trunkTiltDeg = tiltDeg;
      if (selectedAngleMode === 'SIDE') {
        c4Val.textContent = `${tiltDeg}°`;
        if (tiltDeg > records.maxTrunkTilt) {
          records.maxTrunkTilt = tiltDeg;
          paintHero(c4Max, 'MAX 体幹', `${tiltDeg}°`, true);
        }
      } else {
        c5Val.textContent = `${tiltDeg}°`;
        if (tiltDeg > records.maxTrunkTilt) {
          records.maxTrunkTilt = tiltDeg;
          paintHero(c5Max, 'MAX 側屈', `${tiltDeg}°`, true);
        }
      }
    }
  }

  if (NOSE && initialNoseX !== null) {
    const shiftXPx = Math.abs((NOSE.x - initialNoseX) * b.w);
    const shiftYPx = Math.abs((NOSE.y - initialNoseY) * b.h);
    const shiftXCm = Math.round(shiftXPx / activePxPerCm);
    const shiftYCm = Math.round(shiftYPx / activePxPerCm);

    currentCalculatedState.headShiftCm = shiftXCm;
    currentCalculatedState.headShiftYCm = shiftYCm;

    if (selectedAngleMode === 'SIDE') {
      c5Val.textContent = `${shiftXCm} cm`;
      const shiftXNorm = Math.abs(NOSE.x - initialNoseX);
      if (shiftXCm <= 60 && shiftXCm > 0 && shiftXCm >= records.maxHeadShift) {
        if (shiftXCm > records.maxHeadShift) {
          records.maxHeadShift = shiftXCm;
          paintHero(c5Max, 'MAX 頭前後', `${shiftXCm} cm`, true);
        }
        records.maxHeadShiftRatio = Math.round(shiftXNorm * 1000) / 1000;
      }
      c6Val.textContent = `${shiftYCm} cm`;
      if (shiftYCm > records.maxHeadShiftY && shiftYCm <= 50) {
        records.maxHeadShiftY = shiftYCm;
        paintHero(c6Max, 'MAX 頭上下', `${shiftYCm} cm`, true);
      }
    } else {
      c1Val.textContent = `${shiftXCm} cm`;
      c2Val.textContent = `${shiftYCm} cm`;
      if (shiftXCm > records.maxHeadShift && shiftXCm <= 50) {
        records.maxHeadShift = shiftXCm;
        paintHero(c1Max, 'MAX 頭横', `${shiftXCm} cm`, true);
      }
      if (shiftYCm > records.maxHeadShiftY && shiftYCm <= 50) {
        records.maxHeadShiftY = shiftYCm;
        paintHero(c2Max, 'MAX 頭上下', `${shiftYCm} cm`, true);
      }
    }
  }

  if (topWrist && frontHeel) {
    const lowestGroundY = Math.max(frontHeel.y, backHeel ? backHeel.y : frontHeel.y) * b.h;
    const currentHandH = Math.round(Math.max(0, lowestGroundY - topWrist.y * b.h) / activePxPerCm);
    if (Number.isFinite(currentHandH) && currentHandH >= 30 && currentHandH <= Math.round(userHeightCm * 1.4)) {
      currentCalculatedState.impactHandHeightCm = currentHandH;
      c7Val.textContent = `${currentHandH} cm`;
      c8Val.textContent = `${currentHandH} cm`;
      if (currentHandH > records.maxTopHandH) {
        records.maxTopHandH = currentHandH;
        currentCalculatedState.topHandHeightCm = currentHandH;
        paintHero(c7Max, 'TOP グリップ', `${currentHandH} cm`, true);
      }
    }
  }

  if (selectedAngleMode === 'FRONT') {
    if (frontShoulder && backShoulder) {
      const dx = (frontShoulder.x - backShoulder.x);
      const dz = ((frontShoulder.z || 0) - (backShoulder.z || 0));
      
      const shoulderSpan = Math.hypot(dx, dz);
      let openRatio = Math.abs(dx) / (shoulderSpan || 1);
      let rawOpenAngle = Math.round(Math.asin(Math.min(1.0, Math.max(0.0, openRatio))) * (180.0 / Math.PI));

      let sLabel = "◎ タメ十分 (壁キープ)";
      if (rawOpenAngle > 25) {
        sLabel = "⚠️ 開き早い (胸が正対)";
      } else if (rawOpenAngle > 18) {
        sLabel = "○ やや開き";
      }

      currentCalculatedState.shoulderOpenDeg = rawOpenAngle;
      currentCalculatedState.shoulderOpenLabel = sLabel;

      c3Val.textContent = `${rawOpenAngle}°`;
    }

    if (frontHeel && backHeel) {
      const stepOffsetPx = Math.abs((frontHeel.x - backHeel.x) * b.w);
      const inStepCm = Math.round(stepOffsetPx / activePxPerCm);
      const isCross = isRightBatter ? (frontHeel.x > backHeel.x) : (frontHeel.x < backHeel.x);
      const dirLabel = inStepCm <= 4 ? "まっすぐ" : (isCross ? "インステップ" : "アウトステップ");
      currentCalculatedState.inStepCm = inStepCm;
      currentCalculatedState.inStepDir = dirLabel;
      c4Val.textContent = `${inStepCm} cm`;
      if (inStepCm > records.maxInStepCm && inStepCm <= 45) {
        records.maxInStepCm = inStepCm;
        records.inStepDir = dirLabel;
        paintHero(c4Max, 'MAX 踏出', `${inStepCm}cm ${dirLabel}`, true);
      }
    }

    if (frontHip && frontKnee && frontAnkle) {
      const thighAngle = Math.atan2(frontKnee.y - frontHip.y, frontKnee.x - frontHip.x);
      const shankAngle = Math.atan2(frontAnkle.y - frontKnee.y, frontAnkle.x - frontKnee.x);
      let valgusDiff = (shankAngle - thighAngle) * 180.0 / Math.PI;
      if (valgusDiff > 180) valgusDiff -= 360;
      if (valgusDiff < -180) valgusDiff += 360;

      let devAngle = isRightBatter ? valgusDiff : -valgusDiff;
      let absDev = Math.min(30, Math.round(Math.abs(devAngle)));
      let valgusStatus = "◎ 踏ん張り良好";
      if (absDev > 10) {
        valgusStatus = (devAngle > 0) ? "⚠️ 割れ(外逃げ)" : "⚠️ 内入り";
      } else if (absDev > 6) {
        valgusStatus = (devAngle > 0) ? "○ やや開き" : "○ やや内";
      }

      currentCalculatedState.kneeValgusAngle = absDev;
      currentCalculatedState.kneeValgusLabel = valgusStatus;
      c6Val.textContent = `${absDev}°`;
    }
  }

  if (leadElbowJoints.s && leadElbowJoints.e && leadElbowJoints.w) {
    const rawLeadElbowAngle = calcJointAngle3D(leadElbowJoints.s, leadElbowJoints.e, leadElbowJoints.w);
    if (Number.isFinite(rawLeadElbowAngle) && rawLeadElbowAngle >= 35 && rawLeadElbowAngle <= 180) {
      const leadDeg = Math.round(rawLeadElbowAngle);
      currentCalculatedState.leadElbowAngle = leadDeg;
      c9Val.textContent = `${leadDeg}°`;
    }
  }

  if (backElbowJoints.s && backElbowJoints.e && backElbowJoints.w) {
    const rawBackElbowAngle = calcJointAngle3D(backElbowJoints.s, backElbowJoints.e, backElbowJoints.w);
    if (Number.isFinite(rawBackElbowAngle) && rawBackElbowAngle >= 35 && rawBackElbowAngle <= 180) {
      const backDeg = Math.round(rawBackElbowAngle);
      currentCalculatedState.backElbowAngle = backDeg;
      c10Val.textContent = `${backDeg}°`;
    }
  }

  if (typeof updateDrawerKeyBadge === 'function') updateDrawerKeyBadge();
  if (isSkeletonVisible) {
    drawBattingSkeleton(landmarks, b.x, b.y, b.w, b.h, isRightBatter);
  }
}
