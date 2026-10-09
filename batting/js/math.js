// 打撃バイオメカニクス（関節角度・骨盤/体幹の回旋・ステップ・軌道・アドバイス判定）

function generateBattingAICoachAdvice(entry) {
  let praises = [];
  let improvements = [];

  if (entry.mode === 'SIDE') {
    const m = entry.metrics;
    const twist = m.twist || 0;
    if (twist >= 22 && twist <= 38) {
      praises.push(`捻転差【+${twist}°】！下半身先行のタメがバッチリできています！(⚡ 飛距離UP)`);
    } else if (twist > 38) {
      improvements.push(`捻りを少し抑えて、スムーズに胸を回す意識を持とう！(🎯 ミート率安定)`);
    } else if (twist >= 8 && twist < 22) {
      improvements.push(`骨盤を先に回しながら胸を少し残し、タメを作ってみよう！(⚡ 打球初速UP)`);
    } else if (twist < 0) {
      improvements.push(`手から振らず、着地後に腰（骨盤）から回す意識を持とう！(⚡ パワーUP)`);
    }

    const kFlex = (m.impactKneeFlex !== null && m.impactKneeFlex !== undefined) ? m.impactKneeFlex : 0;
    if (kFlex >= 15 && kFlex <= 32) {
      praises.push(`前足ヒザ【屈曲 ${kFlex}°】の強い壁でパワーが伝わっています！(⚡ 強い打球)`);
    } else if (kFlex > 38) {
      improvements.push(`着地後に前ヒザをピタッと止め、回転の強い壁を作ろう！(⚡ 飛距離UP)`);
    } else if (kFlex < 10) {
      improvements.push(`前ヒザを突っ張りすぎず、少しゆとりを持って踏ん張ろう！(🎯 ケガ予防)`);
    }

    const leadElbow = (m.takebackLeadElbow !== null && m.takebackLeadElbow !== undefined) ? m.takebackLeadElbow : null;
    if (leadElbow !== null) {
      if (leadElbow >= 110 && leadElbow <= 135) {
        praises.push(`テイクバックの前ヒジ【${leadElbow}°】が理想的！最短軌道で振れています！(⚡ ヘッドスピードUP)`);
      } else if (leadElbow > 140) {
        improvements.push(`前ヒジを軽く曲げて懐を柔らかく保ち、遠回りを防ごう！(🎯 ミート力UP)`);
      } else if (leadElbow < 100) {
        improvements.push(`トップで懐を広く取る意識を持とう！(⚡ 飛距離UP)`);
      }
    }

    const backElbow = (m.impactBackElbow !== null && m.impactBackElbow !== undefined) ? m.impactBackElbow : null;
    if (backElbow !== null) {
      if (backElbow >= 85 && backElbow <= 115) {
        praises.push(`インパクトで後ろヒジ【${backElbow}°】が引きつけられ力強い！(⚡ 打球初速UP)`);
      } else if (backElbow > 125) {
        improvements.push(`ボールを体の近くまでしっかり引きつけて叩こう！(⚡ 強い打球)`);
      }
    }

    if (m.strideRatio >= 40 && m.strideRatio <= 55) {
      praises.push(`ステップ幅が身長の【${m.strideRatio}%】で理想の黄金比です！(🎯 タイミング安定)`);
    } else if (m.strideRatio > 0 && m.strideRatio < 38) {
      improvements.push(`前足を力強く踏み出して、体重移動の力を使おう！(⚡ 飛距離UP)`);
    } else if (m.strideRatio > 58) {
      improvements.push(`少しスタンスを狭めて、スムーズに腰を回そう！(🎯 ミート力UP)`);
    }

    if (m.headShift <= 8) {
      praises.push(`頭の突っ込み【${m.headShift}cm】が少なく、軸足に体重が残っています！(🎯 見極めUP)`);
    } else {
      improvements.push(`軸足の股関節に体重を残したままクルッと回転しよう！(🎯 空振り激減)`);
    }

    const headY = m.headShiftY || 0;
    if (headY > 0 && headY <= 6) {
      praises.push(`目線の上下動【${headY}cm】が少なく、ボールが見えています！(🎯 選球眼UP)`);
    } else if (headY > 6) {
      improvements.push(`スイング中の頭の高さをキープし、目線のズレをなくそう！(🎯 空振り激減)`);
    }
  } else {
    // FRONT MODE
    const m = entry.metrics;
    if (m.headShiftX <= 6) {
      praises.push(`頭の横ブレ【${m.headShiftX}cm】が少なく、目線がピタッと安定！(🎯 ミート率UP)`);
    } else {
      improvements.push(`片足立ち素振りで体幹を鍛え、目線をブラさない軸を作ろう！(🎯 ミート率UP)`);
    }

    if (m.headShiftY <= 6) {
      praises.push(`頭の上下動【${m.headShiftY}cm】が少なく、高低を見極められています！(🎯 コース対応UP)`);
    } else {
      improvements.push(`構えた高さをキープして回転し、高低の変化球に強くなろう！(🎯 選球眼UP)`);
    }

    const sOpen = (m.shoulderOpen !== null && m.shoulderOpen !== undefined) ? m.shoulderOpen : 0;
    if (sOpen <= 18) {
      praises.push(`前肩の開き【${sOpen}°】を抑え、懐の深いタメができています！(⚡ 外角対応UP)`);
    } else if (sOpen > 25) {
      improvements.push(`インパクト直前まで前肩を投手へ向け続け、タメを作ろう！(🎯 逆方向ヒッティング)`);
    }

    const valgus = (m.kneeValgus !== null && m.kneeValgus !== undefined) ? m.kneeValgus : 0;
    if (valgus <= 6) {
      praises.push(`前ヒザが外へ逃げず【${valgus}°】しっかり踏ん張れています！(⚡ 打球初速UP)`);
    } else if (valgus > 10) {
      improvements.push(`前足の内ももと母指球でグッと受け止め、力を伝えよう！(⚡ 飛距離UP)`);
    }

    if (m.inStep <= 8) {
      praises.push(`投手へ真っ直ぐ踏み込めており、全コースに対応できます！(🎯 コース対応)`);
    } else {
      improvements.push(`地面のラインに沿って真っ直ぐ踏み出す素振りをしよう！(🎯 コース見極め)`);
    }

    if (m.trunkTilt >= 10 && m.trunkTilt <= 25) {
      praises.push(`スイング軸の傾き【${m.trunkTilt}°】が理想的なライナー軌道です！(⚡ 長打力UP)`);
    } else if (m.trunkTilt > 28) {
      improvements.push(`上体をあおらず、軸を安定させて強いライナーを打とう！(⚡ ライナー量産)`);
    }
  }

  const praiseText = praises.length > 0 ? praises.slice(0, 2).map(p => "・" + p).join("\n") : "・一生懸命にフルスイングできています！";
  const improveText = improvements.length > 0 ? improvements.slice(0, 1).map(i => "・" + i).join("\n") : "・今の良いフォームバランスをキープしよう！";

  let text = "【🤖 打撃AIコーチ診断】\n";
  text += "🌟 ナイス！:\n" + praiseText + "\n\n";
  text += "🎯 つぎの意識:\n" + improveText;
  return text;
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
