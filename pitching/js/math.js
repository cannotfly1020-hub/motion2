// 投球バイオメカニクス（角度・速度・フェーズ検出・AIアドバイス判定）

function trainerBlock(title, phenomenon, background, approach) {
  return `【${title}】\n① ${phenomenon}\n② ${background}\n③ ${approach}`;
}

function generatePitchingAICoachAdvice(entry) {
  const notes = [];
  const m = entry.metrics || {};

  if (entry.mode === 'SIDE') {
    const mer = Number.isFinite(m.mer) ? m.mer : 0;
    if (mer >= 170) {
      notes.push(trainerBlock(
        '肩関節への剪断力リスク',
        `MER時の外旋角度が大きく（${mer}°）、肩前方関節包および肘内側に高い牽引・外反ストレスがかかりやすい状態です。`,
        '胸椎伸展や肩甲胸郭の安定が不足すると、外旋を肩関節前面で作りすぎる代償が起きます。',
        '肩甲胸郭関節の安定性と胸椎伸展の可動域を確保しましょう。'
      ));
    } else if (mer > 0 && mer < 150) {
      notes.push(trainerBlock(
        '肩甲帯の外旋可動域',
        `MER時の外旋角度が小さく（${mer}°）、肩甲上腕リズムでのしなりが不足しています。`,
        '胸椎伸展や肩甲骨後傾の制限を、体幹の早期回旋や肘の過伸展で補う代償が起きやすくなります。',
        '胸椎伸展と肩甲胸郭関節の可動性を確認し、外旋を肘で作らないよう評価してください。'
      ));
    }

    const trunk = Number.isFinite(m.trunkTilt) ? m.trunkTilt : 0;
    if (trunk > 0 && trunk < 25) {
      notes.push(trainerBlock(
        '肩肘アライメント注意',
        `リリース時の体幹前傾が不足しています（${trunk}°）。肘が肩のラインより残りやすく、インピンジメントや肘内側側副靭帯（UCL）への負荷が増大します。`,
        '体幹屈曲の遅れを肩の水平内転や肘下がりで補う代償が疑われます。',
        '体幹前傾角の確保と、広背筋・体幹屈曲の連動を促すドリルを推奨します。'
      ));
    }

    const twist = Number.isFinite(m.twist) ? m.twist : 0;
    if (twist > 0 && twist < 22) {
      notes.push(trainerBlock(
        '体幹と骨盤の分離不足',
        `体幹の捻転差が小さく（${twist}°）、運動連鎖のタメが早く抜けています。`,
        '骨盤と胸郭のタイミングがずれ、肩肘で速度を作る代償が起きやすくなります。',
        '胸椎回旋の可動域と、軸足股関節で骨盤を残すタイミングを再評価してください。'
      ));
    }

    const ffK = Number.isFinite(m.ffKneeFlex) ? m.ffKneeFlex : 0;
    const relK = Number.isFinite(m.releaseKneeFlex) ? m.releaseKneeFlex : 0;
    if (relK > ffK + 10 && relK > 0) {
      notes.push(trainerBlock(
        '前足のブレーキ力',
        `リリースで前膝の屈曲が接地時より深く（接地 ${ffK}° → リリース ${relK}°）、ブレーキが抜けています。`,
        '床反力を体幹へ返せず、肩肘への牽引で投球を完結させる代償が疑われます。',
        '前足股関節・殿筋の遠心性支持と、片脚での安定性を評価してください。'
      ));
    }

    const strideRatio = Number.isFinite(m.strideRatio) ? m.strideRatio : 0;
    if (strideRatio > 0 && strideRatio < 72) {
      notes.push(trainerBlock(
        'ステップと股関節伸展',
        `歩幅が短く（身長比 ${strideRatio}%）、前方への重心移動が不足しています。`,
        '軸足股関節の伸展が出ず、上肢で球速を補う代償が起きやすくなります。',
        '股関節伸展の可動域と、軸足から前足への荷重移動を確認しましょう。'
      ));
    }

    const chainClear = mer >= 150 && mer < 170 && (trunk === 0 || trunk >= 25) && notes.length === 0;
    if (chainClear) {
      notes.push(trainerBlock(
        '良好な運動連鎖',
        '下肢から体幹、肩甲帯、上肢へとエネルギーが順に伝達されています。',
        '肩前方や肘内側への過剰な牽引・外反ストレスは目立っていません。',
        'この負担の少ない投球連鎖を、登板後の肩甲帯ケアで維持しましょう。'
      ));
    }
  } else {
    const toe = Number.isFinite(m.toeAngle) ? m.toeAngle : 0;
    if (toe > 12) {
      notes.push(trainerBlock(
        '骨盤先行開きの代償',
        `接地時につま先が開き（${toe}°）、骨盤が早期に開いて運動連鎖のタメが抜けています。`,
        '軸足で骨盤を残せないと、肩肘が先行して牽引ストレスが増えます。',
        '軸足の股関節外転・外旋保持力および回旋筋群のタイミングを再評価してください。'
      ));
    }

    const slot = Number.isFinite(m.armSlot) ? m.armSlot : 0;
    if (slot > 0 && slot < 100) {
      notes.push(trainerBlock(
        '肩肘アライメント注意',
        `挙上角度が低く（${slot}°）、肘が肩のラインより下がっており、インピンジメントや肘内側側副靭帯（UCL）への負荷が増大しています。`,
        '体幹前傾や肩甲帯の上方回旋が不足し、肘の高さでリリース位置を補う代償が疑われます。',
        '体幹前傾角の確保と、広背筋・体幹屈曲の連動を促すドリルを推奨します。'
      ));
    }

    const valgus = Number.isFinite(m.valgus) ? m.valgus : 0;
    if (valgus > 6) {
      notes.push(trainerBlock(
        '接地脚の膝アライメント',
        `着地足の膝が内外へ崩れています（${valgus}°）。`,
        '股関節の支持が不足し、膝関節と体幹の側方バランスで接地を支える代償が見られます。',
        '殿筋群の安定性と、足部の荷重位置を評価してください。'
      ));
    }

    const lateral = Number.isFinite(m.trunkLateral) ? m.trunkLateral : 0;
    if (lateral > 25) {
      notes.push(trainerBlock(
        '体幹側屈の過大',
        `体幹の側屈が大きく（${lateral}°）、投球側へ体が倒れています。`,
        '腰椎への側屈ストレスが増え、肩甲帯の位置が崩れて肘への負荷が変わります。',
        '体幹の抗側屈と、反対側股関節での支持をチェックしましょう。'
      ));
    }

    const inStep = Number.isFinite(m.inStep) ? m.inStep : 0;
    if (inStep > 12) {
      notes.push(trainerBlock(
        '踏み出し位置と骨盤',
        `踏み出しの横ずれが大きく（${inStep}cm）、接地位置が投球線から外れています。`,
        '骨盤の向きが早く変わり、肩肘で方向を修正する代償が起きやすくなります。',
        '軸足股関節の向きと、ステップ足の接地位置を再評価してください。'
      ));
    }

    const chainClear = toe <= 12 && (slot === 0 || slot >= 100) && valgus <= 6 && notes.length === 0 && (toe > 0 || slot >= 100);
    if (chainClear) {
      notes.push(trainerBlock(
        '良好な運動連鎖',
        '下肢から体幹、肩甲帯、上肢へとエネルギーが順に伝達されています。',
        '肩前方や肘内側への過剰な牽引・外反ストレスは目立っていません。',
        'この負担の少ない投球連鎖を、登板後の肩甲帯ケアで維持しましょう。'
      ));
    }
  }

  if (notes.length === 0) {
    notes.push(trainerBlock(
      '動作スクリーニング',
      '現時点で突出した肩肘への代償は見当たりません。',
      'MER・接地・リリースの数値が揃うと、運動連鎖をより正確に評価できます。',
      '登板後の肩甲帯と体幹のコンディションをあわせて確認しましょう。'
    ));
  }

  return '【🩺 AIトレーナー（肩肘・運動連鎖チェック）】\n' + notes.slice(0, 2).join('\n\n');
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
}
