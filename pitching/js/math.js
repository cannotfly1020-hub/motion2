// 投球バイオメカニクス（角度・速度・フェーズ検出・AIアドバイス判定）

function generatePitchingAICoachAdvice(entry) {
  let praises = [];
  let improvements = [];

  if (entry.mode === 'SIDE') {
    const m = entry.metrics;
    // 1. 歩幅
    if (m.strideRatio >= 75 && m.strideRatio <= 88) {
      praises.push(`歩幅【${m.strideRatio}%】！力強い体重移動ができています！(⚡ 球速UP)`);
    } else if (m.strideRatio < 72 && m.strideRatio > 0) {
      improvements.push(`幅跳びジャンプなどで前への推進力をつけ、もう少し広く踏み出そう！(⚡ スピードUP)`);
    }

    // 2. 肩外旋（しなり）
    if (m.mer >= 155) {
      praises.push(`腕のしなり【${m.mer}°】！ムチのように鋭く振れています！(⚡ 球速UP)`);
    } else if (m.mer > 0) {
      improvements.push(`胸や肩甲骨のストレッチで、肩に力を入れず自然なしなりを作ろう！(🛡️ ケガ予防)`);
    }

    // 3. 捻転差
    if (m.twist >= 25 && m.twist <= 45) {
      praises.push(`体幹のタメ【${m.twist}°】がバッチリ！キレのある球が投げられます！(⚡ 初速UP)`);
    } else if (m.twist > 0 && m.twist < 22) {
      improvements.push(`着地まで上半身を開かない意識で、腰から先に回す練習をしよう！(⚡ スピードUP)`);
    }

    // 4. ヒザの壁
    const ffK = m.ffKneeFlex || 0;
    const relK = m.releaseKneeFlex || 0;
    if (relK > 0 && relK <= ffK) {
      praises.push(`前ヒザでしっかり踏ん張れており、強い回転ブレーキが効いています！(🎯 コントロールUP)`);
    } else if (relK > ffK + 10) {
      improvements.push(`ランジや片足立ちで前足をしっかり固定し、軸を安定させよう！(🎯 制球力UP)`);
    }
  } else {
    // FRONT MODE
    const m = entry.metrics;
    // つま先
    if (m.toeAngle <= 12) {
      praises.push(`つま先が捕手へ真っ直ぐ向いており、体の開きが抑えられています！(🎯 コントロールUP)`);
    } else {
      improvements.push(`つま先が外に開かないよう、地面のラインに沿って真っ直ぐ踏み出そう！(🎯 制球力UP)`);
    }

    // ヒザ内外反
    if (m.valgus <= 6) {
      praises.push(`着地足のヒザがブレずに真っ直ぐ踏ん張れています！(🎯 コントロールUP)`);
    } else {
      improvements.push(`片足バランストレーニングで、着地足のグラつきを抑えよう！(🎯 ケガ予防)`);
    }
  }

  const praiseText = praises.length > 0 ? praises.slice(0, 2).map(p => "・" + p).join("\n") : "・思い切り腕を振って投げられています！";
  const improveText = improvements.length > 0 ? improvements.slice(0, 1).map(i => "・" + i).join("\n") : "・今の良いフォームバランスをキープして練習しよう！";

  let text = "【🤖 AIコーチ診断】\n";
  text += "🌟 ナイス！:\n" + praiseText + "\n\n";
  text += "🎯 つぎの意識:\n" + improveText;
  return text;
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

  if (isSkeletonVisible) {
    drawPrecisionSkeleton(landmarks, b.x, b.y, b.w, b.h, isSouthpaw, isRightHanded);
  }

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
          c1Max.textContent = `最大: ${strideCm} cm (${strideRatio}%身)`;
        }
      }
    }

    if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP && throwElbow && throwWrist) {
      const trueMerDeg = calcTrueMER(L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, throwElbow, throwWrist);
      if (Number.isFinite(trueMerDeg) && trueMerDeg >= 30 && trueMerDeg <= 200) {
        const roundedMER = Math.round(trueMerDeg);
        c2Val.textContent = `${roundedMER} °`;
        if (roundedMER > records.maxMER && roundedMER <= 190) {
          records.maxMER = roundedMER;
          c2Max.textContent = `最大: ${roundedMER} °`;
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
          c3Val.textContent = `${roundedTwist} °`;
          if (roundedTwist > records.maxTwist && roundedTwist >= 5) {
            records.maxTwist = roundedTwist;
            c3Max.textContent = `最大: ${roundedTwist} °`;
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
        c5Val.textContent = `屈曲 ${flexAngle} °`;

        if (isKinematicFF && records.ffKneeFlex === null) {
          records.ffKneeFlex = flexAngle;
        }

        if (isThrowingPhase && leadHeel && pivotHeel) {
          const lowestGroundY = Math.max(leadHeel.y, pivotHeel.y) * b.h;
          const releaseTarget = (throwIndex && throwIndex.y !== undefined) ? throwIndex : throwWrist;
          if (releaseTarget) {
            const releasePointY = releaseTarget.y * b.h;
            const releaseHeightPx = Math.max(0, lowestGroundY - releasePointY);
            const releaseHeightCm = Math.round(releaseHeightPx / activePxPerCm);

            if (Number.isFinite(releaseHeightCm) && releaseHeightCm >= 40 && releaseHeightCm <= Math.round(userHeightCm * 1.45)) {
              c4Val.textContent = `${releaseHeightCm} cm`;
              if (releaseHeightCm > records.maxRelease) {
                records.maxRelease = releaseHeightCm;
                records.releaseKneeFlex = flexAngle;
                c4Max.textContent = `最高: ${releaseHeightCm} cm`;
              }
            }
          }
        }

        const ffText = records.ffKneeFlex !== null ? `屈曲 ${records.ffKneeFlex}°` : '屈曲 --°';
        const brText = records.releaseKneeFlex !== null ? `屈曲 ${records.releaseKneeFlex}°` : '屈曲 --°';
        c5Max.textContent = `FF時: ${ffText} (リリース時: ${brText})`;
      }
    }

    if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
      const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
      const midHip = { x: (L_HIP.x + R_HIP.x)/2, y: (L_HIP.y + R_HIP.y)/2 };
      const trunkDeg = Math.round(Math.abs((Math.atan2(midShoulder.x - midHip.x, midHip.y - midShoulder.y) * 180.0) / Math.PI));
      if (Number.isFinite(trunkDeg) && trunkDeg <= 60) {
        c6Val.textContent = `${trunkDeg} °`;
        if (trunkDeg > records.maxTrunkTilt) {
          records.maxTrunkTilt = trunkDeg;
          c6Max.textContent = `最大前傾: ${trunkDeg} °`;
        }
      }
    }

  } else {
    if (leadHeel && leadToe && leadAnkle) {
      if (!isStepping) {
        smoothToeDeg = 0;
        c1Val.textContent = `0 °`;
        if (!records.fcToeLabel) c1Max.textContent = `構え位置`;
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
        c1Val.textContent = `${displayAngle} °`;

        if (isKinematicFF && records.fcToeAngle === null) {
          records.fcToeAngle = displayAngle;
          records.fcToeLabel = `べた足時: ${displayAngle}° (${stateLabel})`;
        }
        c1Max.textContent = records.fcToeLabel || stateLabel;
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
      c2Val.textContent = `${absDev} °`;

      if (isKinematicFF && records.ffValgusAngle === null) {
        records.ffValgusAngle = absDev;
        records.ffValgusLabel = `べた足時: ${absDev}° (${valgusStatus})`;
      }
      c2Max.textContent = records.ffValgusLabel || valgusStatus;
      if (absDev > records.maxValgus && isStepping) records.maxValgus = absDev;
    }

    if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
      const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
      const midHip = { x: (L_HIP.x + R_HIP.x)/2, y: (L_HIP.y + R_HIP.y)/2 };
      const lateralDeg = Math.round(Math.abs((Math.atan2(midShoulder.x - midHip.x, midHip.y - midShoulder.y) * 180.0) / Math.PI));
      if (Number.isFinite(lateralDeg) && lateralDeg <= 45) {
        c3Val.textContent = `${lateralDeg} °`;
        if (lateralDeg > records.maxTrunkLateral) {
          records.maxTrunkLateral = lateralDeg;
          c3Max.textContent = `最大傾き: ${lateralDeg} °`;
        }
      }
    }

    if (throwWrist && throwShoulder && L_SHOULDER && R_SHOULDER) {
      const otherShoulder = isRightHanded ? L_SHOULDER : R_SHOULDER;
      const armSlotAngle = calcJointAngle3D(throwWrist, throwShoulder, otherShoulder);
      if (Number.isFinite(armSlotAngle) && armSlotAngle >= 30 && armSlotAngle <= 180) {
        const roundedSlot = Math.round(armSlotAngle);
        c4Val.textContent = `${roundedSlot} °`;
        if (roundedSlot > records.maxArmSlot) {
          records.maxArmSlot = roundedSlot;
          c4Max.textContent = `最大挙上: ${roundedSlot} °`;
        }
      }
    }

    if (leadHeel && pivotHeel) {
      if (!isStepping) {
        c5Val.textContent = `0 cm`;
        c5Max.textContent = `構え位置`;
      } else {
        const lateralOffsetPx = Math.abs((leadHeel.x - pivotHeel.x) * b.w);
        const lateralOffsetCm = Math.round(lateralOffsetPx / activePxPerCm);
        if (Number.isFinite(lateralOffsetCm) && lateralOffsetCm <= 40) {
          const isCross = isRightHanded ? (leadHeel.x < pivotHeel.x) : (leadHeel.x > pivotHeel.x);
          const dirText = isCross ? "インステップ" : "アウトステップ";
          c5Val.textContent = `${lateralOffsetCm} cm`;
          if (lateralOffsetCm > records.maxInStepCm) {
            records.maxInStepCm = lateralOffsetCm;
            c5Max.textContent = `${dirText}: ${lateralOffsetCm} cm`;
          }
        }
      }
    }

    const isFrontThrowingPhase = isStepping && throwWrist && throwShoulder && (throwWrist.y < throwShoulder.y);
    if (isFrontThrowingPhase && L_SHOULDER && R_SHOULDER) {
      const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
      const releaseTarget = (throwIndex && throwIndex.x !== undefined) ? throwIndex : throwWrist;
      if (releaseTarget) {
        const lateralReleasePx = Math.abs((releaseTarget.x - midShoulder.x) * b.w);
        const lateralReleaseCm = Math.round(lateralReleasePx / activePxPerCm);
        if (Number.isFinite(lateralReleaseCm) && lateralReleaseCm <= 80) {
          c6Val.textContent = `${lateralReleaseCm} cm`;
          if (lateralReleaseCm > records.maxReleaseLateral) {
            records.maxReleaseLateral = lateralReleaseCm;
            c6Max.textContent = `最大横幅: ${lateralReleaseCm} cm`;
          }
        }
      }
    }
  }
}
