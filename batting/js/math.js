// 打撃バイオメカニクス（関節角度・骨盤/体幹の回旋・ステップ・軌道・アドバイス判定）

function trainerBlock(title, phenomenon, background, approach) {
  return `【${title}】\n① ${phenomenon}\n② ${background}\n③ ${approach}`;
}

function generateBattingAICoachAdvice(entry) {
  const notes = [];
  const m = entry.metrics || {};

  if (entry.mode === 'SIDE') {
    const twist = Number.isFinite(m.twist) ? m.twist : 0;
    if (twist !== 0 && twist < 22) {
      notes.push(trainerBlock(
        '胸郭・股関節連鎖のチェック',
        `体幹と骨盤の捻転差が小さく（${twist >= 0 ? '+' : ''}${twist}°）、腕主導（手打ち）の代償が見られます。`,
        '腰椎への回旋ストレスに注意が必要な状態です。',
        '股関節内旋可動域と胸郭の回旋モビリティをチェックしましょう。'
      ));
    } else if (twist > 38) {
      notes.push(trainerBlock(
        '胸郭・股関節の分離過剰',
        `体幹と骨盤の捻転差が大きく（+${twist}°）、分離が過剰です。`,
        '切り返しで腰椎の回旋ストレスが増え、上肢でタイミングを合わせる代償が起きやすくなります。',
        '胸郭回旋の可動域を保ちつつ、股関節から体幹へ返すタイミングを評価してください。'
      ));
    }

    const head = Number.isFinite(m.headShift) ? m.headShift : 0;
    if (head > 8) {
      notes.push(trainerBlock(
        '重心移動・軸足支持',
        `軸足から前足への重心移動で突っ込みが見られます（頭の前方移動 ${head}cm）。`,
        '前足のブレーキ力（床反力）が不足している可能性があります。',
        '下肢の踏ん張り力と殿筋群の遠心性支持性を評価してください。'
      ));
    }

    const kFlex = (m.impactKneeFlex !== null && m.impactKneeFlex !== undefined && Number.isFinite(m.impactKneeFlex))
      ? m.impactKneeFlex : null;
    if (kFlex !== null && kFlex > 38) {
      notes.push(trainerBlock(
        '前足の遠心性支持',
        `インパクトで前膝の屈曲が深く（${kFlex}°）、ブレーキが抜けています。`,
        '前足の床反力が不足し、体幹が前方へ流れる代償が疑われます。',
        '殿筋群の遠心性支持と、片脚での踏ん張りを評価してください。'
      ));
    } else if (kFlex !== null && kFlex > 0 && kFlex < 10) {
      notes.push(trainerBlock(
        '膝関節の衝撃吸収',
        `前膝が伸展位に近く（屈曲 ${kFlex}°）、衝撃を関節で受けやすい状態です。`,
        '股関節と足部での力の吸収が不足し、膝前面への圧縮ストレスが増えます。',
        '軽度屈曲位での遠心性コントロールと、足関節の可動性を確認しましょう。'
      ));
    }

    const headY = Number.isFinite(m.headShiftY) ? m.headShiftY : 0;
    if (headY > 6) {
      notes.push(trainerBlock(
        '頭部の垂直安定',
        `スイング中の頭の上下動が大きく（${headY}cm）、視線の高さが崩れています。`,
        '体幹の伸び上がり、または股関節での沈み込み不足による代償が疑われます。',
        '股関節の屈曲可動域と体幹の抗重力安定をチェックしましょう。'
      ));
    }

    const strideRatio = Number.isFinite(m.strideRatio) ? m.strideRatio : 0;
    if (strideRatio > 0 && strideRatio < 38) {
      notes.push(trainerBlock(
        'ステップと股関節伸展',
        `ステップ幅が短く（身長比 ${strideRatio}%）、前方への重心移動が不足しています。`,
        '軸足股関節の伸展が出ず、上肢で距離を補う代償が起きやすくなります。',
        '股関節伸展可動域と、軸足からの体重移動を評価してください。'
      ));
    } else if (strideRatio > 58) {
      notes.push(trainerBlock(
        'ステップ幅と骨盤制御',
        `ステップ幅が広く（身長比 ${strideRatio}%）、骨盤の安定が遅れやすい状態です。`,
        '着地後に体幹が遅れ、腰椎や前膝でタイミングを合わせる代償が疑われます。',
        'ステップ幅を整え、着地側股関節の安定性を確認しましょう。'
      ));
    }

    const leadElbow = (m.takebackLeadElbow !== null && m.takebackLeadElbow !== undefined && Number.isFinite(m.takebackLeadElbow))
      ? m.takebackLeadElbow : null;
    if (leadElbow !== null && leadElbow > 140) {
      notes.push(trainerBlock(
        'リード肘のアライメント',
        `テイクバックで前肘が伸びすぎています（${leadElbow}°）。`,
        '肩甲帯で軌道を作れず、肘関節への牽引でバットを運ぶ代償が見られます。',
        '肘の軽度屈曲を保ち、肩甲骨の後傾と胸郭回旋の連動を確認しましょう。'
      ));
    } else if (leadElbow !== null && leadElbow > 0 && leadElbow < 100) {
      notes.push(trainerBlock(
        'リード肘の可動域',
        `テイクバックで前肘の屈曲が強く（${leadElbow}°）、懐が狭くなっています。`,
        '胸郭の回旋不足を肘の屈曲で補っている可能性があります。',
        '胸椎回旋と肩関節の水平外転の可動域をチェックしましょう。'
      ));
    }

    const backElbow = (m.impactBackElbow !== null && m.impactBackElbow !== undefined && Number.isFinite(m.impactBackElbow))
      ? m.impactBackElbow : null;
    if (backElbow !== null && backElbow > 125) {
      notes.push(trainerBlock(
        'インパクト時の肘位置',
        `インパクトで後ろ肘が体から離れています（${backElbow}°）。`,
        '体幹の回旋が遅れ、上肢だけでインパクトを作る代償が疑われます。',
        '肩甲胸郭関節の安定と、体幹から上肢への力の伝達を評価してください。'
      ));
    }

    const chainClear = twist >= 22 && twist <= 38 && head <= 8 && notes.length === 0;
    if (chainClear) {
      notes.push(trainerBlock(
        '良好なキネティックチェーン',
        '下半身から体幹、上肢へとエネルギーがスムーズに伝達されています。',
        '過剰な代償動作は見られず、身体への負担が少ない状態です。',
        'この効率的なスイング連鎖を、疲労時も崩さないようコンディショニングを継続しましょう。'
      ));
    }
  } else {
    const headX = Number.isFinite(m.headShiftX) ? m.headShiftX : 0;
    if (headX > 6) {
      notes.push(trainerBlock(
        '頭部の側方安定',
        `頭の横ブレが大きく（${headX}cm）、視線の軸が揺れています。`,
        '体幹の側方安定が不足し、頸部や肩でバランスを取る代償が疑われます。',
        '体幹の抗側屈と、股関節での片脚支持を評価してください。'
      ));
    }

    const headY = Number.isFinite(m.headShiftY) ? m.headShiftY : 0;
    if (headY > 6) {
      notes.push(trainerBlock(
        '頭部の垂直安定',
        `頭の上下動が大きく（${headY}cm）、視線の高さが崩れています。`,
        '股関節の沈み込み、または体幹の伸び上がりによる代償が疑われます。',
        '股関節屈曲の可動域と体幹の抗重力安定をチェックしましょう。'
      ));
    }

    const sOpen = (m.shoulderOpen !== null && m.shoulderOpen !== undefined && Number.isFinite(m.shoulderOpen))
      ? m.shoulderOpen : null;
    if (sOpen !== null && sOpen > 25) {
      notes.push(trainerBlock(
        '肩甲帯の早期回旋',
        `前肩の開きが大きく（${sOpen}°）、体幹より上肢が先行しています。`,
        '胸郭の回旋タメが抜け、肩関節前面でスイングを作る代償が見られます。',
        '胸椎回旋の可動域と、肩甲胸郭関節の安定性を確認しましょう。'
      ));
    }

    const valgus = (m.kneeValgus !== null && m.kneeValgus !== undefined && Number.isFinite(m.kneeValgus))
      ? m.kneeValgus : null;
    if (valgus !== null && valgus > 10) {
      notes.push(trainerBlock(
        '前膝のアライメント',
        `前膝が内側へ崩れています（${valgus}°）。`,
        '股関節外転・外旋の支持が不足し、膝内側への外反ストレスが増えています。',
        '殿筋群の安定性と、足部での荷重位置を評価してください。'
      ));
    }

    const inStep = Number.isFinite(m.inStep) ? m.inStep : 0;
    if (inStep > 8) {
      notes.push(trainerBlock(
        'ステップ方向と骨盤',
        `踏み出しが投球線からずれています（${inStep}cm）。`,
        '骨盤の向きが早く変わり、体幹の回旋タイミングがずれる代償が疑われます。',
        '軸足股関節の向きと、踏み出し足の接地位置を再評価してください。'
      ));
    }

    const trunk = Number.isFinite(m.trunkTilt) ? m.trunkTilt : 0;
    if (trunk > 28) {
      notes.push(trainerBlock(
        '体幹側屈の過大',
        `スイング軸の側屈が大きく（${trunk}°）、体幹が倒れています。`,
        '腰椎への側屈ストレスが増え、上肢で軌道を合わせる代償が起きやすくなります。',
        '体幹の抗側屈と、股関節での荷重支持をチェックしましょう。'
      ));
    }

    const chainClear = headX <= 6 && (sOpen === null || sOpen <= 18) && (valgus === null || valgus <= 6) && notes.length === 0 && (headX > 0 || sOpen !== null);
    if (chainClear) {
      notes.push(trainerBlock(
        '良好なキネティックチェーン',
        '下半身から体幹、上肢へとエネルギーがスムーズに伝達されています。',
        '過剰な代償動作は見られず、身体への負担が少ない状態です。',
        'この効率的なスイング連鎖を、疲労時も崩さないようコンディショニングを継続しましょう。'
      ));
    }
  }

  if (notes.length === 0) {
    notes.push(trainerBlock(
      '動作スクリーニング',
      '現時点で突出した代償動作は見当たりません。',
      '主要局面の数値が揃うと、運動連鎖をより正確に評価できます。',
      '疲労の有無と、股関節・胸郭の可動域をあわせて確認しましょう。'
    ));
  }

  return '【🩺 AIトレーナー分析】\n' + notes.slice(0, 2).join('\n\n');
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
