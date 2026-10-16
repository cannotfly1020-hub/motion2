// 打撃バイオメカニクス（関節角度・骨盤/体幹の回旋・ステップ・軌道）
// トレーナーコメントの文章は trainer/batting_knowledge.js にある。

function formatTrainerNumber(value) {
  return (typeof value === 'number' && Number.isFinite(value)) ? String(value) : '--';
}

function fillTrainerText(text, metrics) {
  if (typeof text !== 'string') return '';
  return text.replace(/\{(\+)?([A-Za-z0-9_]+)\}/g, function(_, sign, key) {
    const value = metrics[key];
    if (sign === '+') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
      return (value > 0 ? '+' : '') + value;
    }
    return formatTrainerNumber(value);
  });
}

function formatTrainerRule(rule, metrics) {
  const rawTitle = rule.title || '評価';
  const title = rawTitle.charAt(0) === '【' ? rawTitle : '【' + rawTitle + '】';
  return title + '\n① ' + fillTrainerText(rule.description, metrics) +
    '\n② ' + fillTrainerText(rule.reason, metrics) +
    '\n③ ' + fillTrainerText(rule.exercise, metrics);
}

function renderTrainerKnowledge(rules, config, entry) {
  const list = Array.isArray(rules) ? rules : [];
  const safeEntry = entry || {};
  const metrics = Object.assign({ mode: safeEntry.mode }, safeEntry.metrics || {});
  const maxNotes = (config && config.maxNotes) || 2;
  const findings = [];
  const goods = [];

  list.forEach(function(rule) {
    if (!rule || typeof rule.evaluate !== 'function') return;
    let matched = false;
    try {
      matched = !!rule.evaluate(metrics);
    } catch (err) {
      matched = false;
    }
    if (!matched) return;
    const text = formatTrainerRule(rule, metrics);
    if (rule.severity === 'good') goods.push(text);
    else findings.push(text);
  });

  let chosen = findings.slice(0, maxNotes);
  if (chosen.length === 0 && goods.length > 0) chosen = [goods[0]];
  if (chosen.length === 0 && config && config.fallback) {
    chosen = [formatTrainerRule(config.fallback, metrics)];
  }

  const header = (config && config.header) ? config.header + '\n' : '';
  return header + chosen.join('\n\n');
}

function generateBattingAICoachAdvice(entry) {
  const rules = (typeof BATTING_TRAINER_RULES !== 'undefined') ? BATTING_TRAINER_RULES : [];
  const config = (typeof BATTING_TRAINER_CONFIG !== 'undefined') ? BATTING_TRAINER_CONFIG : null;
  return renderTrainerKnowledge(rules, config, entry);
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

  if (isSkeletonVisible) {
    drawBattingSkeleton(landmarks, b.x, b.y, b.w, b.h, isRightBatter);
  }

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
      if (shiftXCm > records.maxHeadShift && shiftXCm <= 60) {
        records.maxHeadShift = shiftXCm;
        paintHero(c5Max, 'MAX 頭前後', `${shiftXCm} cm`, true);
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
}
