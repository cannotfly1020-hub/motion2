// DOM と MediaPipe に依存しない幾何計算。打撃・投球の両方がここを使う。

function biomechanicsPointUsable(point) {
  if (!point || typeof point !== 'object') return false;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  if (typeof point.visibility === 'number' && point.visibility < 0.5) return false;
  return true;
}

function biomechanicsVectorUsable(vector) {
  if (!vector || typeof vector !== 'object') return false;
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) return false;
  return Math.hypot(vector.x, vector.y) >= 1e-6;
}

function calculateJointAngle(p1, vertex, p2) {
  if (!biomechanicsPointUsable(p1) || !biomechanicsPointUsable(vertex) || !biomechanicsPointUsable(p2)) return null;
  var z1 = Number.isFinite(p1.z) ? p1.z : 0;
  var zv = Number.isFinite(vertex.z) ? vertex.z : 0;
  var z2 = Number.isFinite(p2.z) ? p2.z : 0;
  var v1x = p1.x - vertex.x;
  var v1y = p1.y - vertex.y;
  var v1z = z1 - zv;
  var v2x = p2.x - vertex.x;
  var v2y = p2.y - vertex.y;
  var v2z = z2 - zv;
  var mag1 = Math.hypot(v1x, v1y, v1z);
  var mag2 = Math.hypot(v2x, v2y, v2z);
  if (mag1 < 1e-6 || mag2 < 1e-6) return null;
  var cosVal = (v1x * v2x + v1y * v2y + v1z * v2z) / (mag1 * mag2);
  cosVal = Math.max(-1, Math.min(1, cosVal));
  return (Math.acos(cosVal) * 180) / Math.PI;
}

function calculateTorsionAngle(vectorA, vectorB) {
  if (!biomechanicsVectorUsable(vectorA) || !biomechanicsVectorUsable(vectorB)) return null;
  var degrees = (Math.atan2(vectorB.y, vectorB.x) - Math.atan2(vectorA.y, vectorA.x)) * 180 / Math.PI;
  while (degrees <= -180) degrees += 360;
  while (degrees > 180) degrees -= 360;
  return degrees;
}

function calculateSegmentDisplacement(pCurrent, pRef) {
  if (!biomechanicsPointUsable(pCurrent) || !biomechanicsPointUsable(pRef)) return null;
  var dz = (Number.isFinite(pCurrent.z) && Number.isFinite(pRef.z)) ? (pCurrent.z - pRef.z) : 0;
  return Math.hypot(pCurrent.x - pRef.x, pCurrent.y - pRef.y, dz);
}

function keyframeLandmark(frame, index) {
  if (!frame || typeof frame !== 'object') return null;
  var point = frame[index];
  if (!point || typeof point !== 'object') return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  if (typeof point.visibility === 'number' && point.visibility < 0.5) return null;
  return point;
}

function keyframeFrameAt(frames, index) {
  if (!frames || typeof frames !== 'object' || index < 0) return null;
  return frames[index] || null;
}

function keyframeFallback(frameCount) {
  var count = (typeof frameCount === 'number' && frameCount > 0 && Number.isFinite(frameCount)) ? Math.floor(frameCount) : 1;
  var last = Math.max(0, count - 1);
  var first = Math.round(last * 0.325);
  var second = Math.round(last * 0.575);
  if (first < 0) first = 0;
  if (first > last) first = last;
  if (second < 0) second = 0;
  if (second > last) second = last;
  if (second <= first) second = Math.min(last, first + 1);
  if (second > last) second = last;
  return { first: first, second: second };
}

function keyframeClampIndex(index, frameCount) {
  var count = (typeof frameCount === 'number' && frameCount > 0) ? Math.floor(frameCount) : 1;
  var last = count - 1;
  if (!Number.isFinite(index)) return 0;
  index = Math.round(index);
  if (index < 0) return 0;
  if (index > last) return last;
  return index;
}

function keyframeSpeed2(fromPoint, toPoint) {
  if (!fromPoint || !toPoint) return null;
  var dx = toPoint.x - fromPoint.x;
  var dy = toPoint.y - fromPoint.y;
  return dx * dx + dy * dy;
}

function keyframeTorsion(frame) {
  var leftShoulder = keyframeLandmark(frame, 11);
  var rightShoulder = keyframeLandmark(frame, 12);
  var leftHip = keyframeLandmark(frame, 23);
  var rightHip = keyframeLandmark(frame, 24);
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;
  var angle = calculateTorsionAngle(
    { x: rightShoulder.x - leftShoulder.x, y: (rightShoulder.z || 0) - (leftShoulder.z || 0) },
    { x: rightHip.x - leftHip.x, y: (rightHip.z || 0) - (leftHip.z || 0) }
  );
  if (angle == null) {
    angle = calculateTorsionAngle(
      { x: rightShoulder.x - leftShoulder.x, y: rightShoulder.y - leftShoulder.y },
      { x: rightHip.x - leftHip.x, y: rightHip.y - leftHip.y }
    );
  }
  return angle == null ? null : Math.abs(angle);
}

function detectBattingKeyframes(landmarksByFrame, frameCount, isRightHanded) {
  var fallback = keyframeFallback(frameCount);
  try {
    var count = Math.floor(frameCount);
    if (!(count >= 4) || !landmarksByFrame) {
      return { top: fallback.first, impact: fallback.second };
    }
    var wristIndex = isRightHanded ? 16 : 15;
    var otherWristIndex = isRightHanded ? 15 : 16;
    var frontAnkleIndex = isRightHanded ? 27 : 28;
    var wristX = new Array(count);
    var usable = 0;
    var startX = null;
    for (var i = 0; i < count; i++) {
      var wrist = keyframeLandmark(keyframeFrameAt(landmarksByFrame, i), wristIndex);
      wristX[i] = wrist ? wrist.x : null;
      if (!wrist) continue;
      usable += 1;
      if (startX == null) startX = wrist.x;
    }
    if (usable < 4) return { top: fallback.first, impact: fallback.second };

    var reversals = [];
    for (var r = 1; r < count - 1; r++) {
      if (wristX[r] == null || wristX[r - 1] == null || wristX[r + 1] == null) continue;
      var before = wristX[r] - wristX[r - 1];
      var after = wristX[r + 1] - wristX[r];
      if (before === 0 && after === 0) continue;
      if ((before * after) < 0 || (Math.abs(before) <= 0.002 && (before * after) <= 0)) reversals.push(r);
    }
    var searchUntil = Math.max(2, Math.floor(count * 0.75));
    var pool = [];
    for (var c = 0; c < reversals.length; c++) {
      if (reversals[c] < searchUntil) pool.push(reversals[c]);
    }
    if (!pool.length) {
      var deepest = 0;
      var deepDist = -1;
      for (var d = 0; d < searchUntil; d++) {
        if (wristX[d] == null || startX == null) continue;
        var dist = Math.abs(wristX[d] - startX);
        if (dist > deepDist) {
          deepDist = dist;
          deepest = d;
        }
      }
      pool.push(deepest);
    }
    var top = pool[0];
    var bestTorsion = -1;
    for (var p = 0; p < pool.length; p++) {
      var torsion = keyframeTorsion(keyframeFrameAt(landmarksByFrame, pool[p]));
      var score = torsion == null ? 0 : torsion;
      if (score > bestTorsion) {
        bestTorsion = score;
        top = pool[p];
      }
    }

    var peak = -1;
    var peakSpeed = -1;
    for (var v = top + 1; v < count; v++) {
      var current = keyframeFrameAt(landmarksByFrame, v);
      var previous = keyframeFrameAt(landmarksByFrame, v - 1);
      var gripSpeed = keyframeSpeed2(keyframeLandmark(previous, wristIndex), keyframeLandmark(current, wristIndex));
      var otherSpeed = keyframeSpeed2(keyframeLandmark(previous, otherWristIndex), keyframeLandmark(current, otherWristIndex));
      var parts = 0;
      var speed = 0;
      if (gripSpeed != null) { speed += gripSpeed; parts += 1; }
      if (otherSpeed != null) { speed += otherSpeed; parts += 1; }
      if (!parts) continue;
      speed = speed / parts;
      if (speed > peakSpeed) {
        peakSpeed = speed;
        peak = v;
      }
    }
    var impact = peak;
    if (peak >= 0) {
      var bestLine = Infinity;
      var chosen = peak;
      var windowEnd = Math.min(count - 1, peak + 2);
      for (var w = peak; w <= windowEnd; w++) {
        var wristNow = keyframeLandmark(keyframeFrameAt(landmarksByFrame, w), wristIndex);
        var ankle = keyframeLandmark(keyframeFrameAt(landmarksByFrame, w), frontAnkleIndex);
        if (!wristNow) continue;
        if (!ankle) {
          chosen = w;
          break;
        }
        var line = Math.abs(wristNow.x - ankle.x);
        if (line < bestLine) {
          bestLine = line;
          chosen = w;
        }
      }
      impact = chosen;
    }
    if (!(top >= 0)) top = fallback.first;
    if (!(impact >= 0)) impact = fallback.second;
    if (impact <= top) impact = Math.min(count - 1, top + 1);
    return { top: keyframeClampIndex(top, count), impact: keyframeClampIndex(impact, count) };
  } catch (err) {
    return { top: fallback.first, impact: fallback.second };
  }
}

function detectPitchingKeyframes(landmarksByFrame, frameCount, isRightHanded) {
  var fallback = keyframeFallback(frameCount);
  try {
    var count = Math.floor(frameCount);
    if (!(count >= 4) || !landmarksByFrame) {
      return { footContact: fallback.first, release: fallback.second };
    }
    var ankleIndex = isRightHanded ? 27 : 28;
    var wristIndex = isRightHanded ? 16 : 15;
    var throwShoulderIndex = isRightHanded ? 12 : 11;
    var speeds = new Array(count);
    var maxAnkleSpeed = 0;
    var ankleUsable = 0;
    for (var i = 1; i < count; i++) {
      var ankleSpeed = keyframeSpeed2(
        keyframeLandmark(keyframeFrameAt(landmarksByFrame, i - 1), ankleIndex),
        keyframeLandmark(keyframeFrameAt(landmarksByFrame, i), ankleIndex)
      );
      speeds[i] = ankleSpeed;
      if (ankleSpeed == null) continue;
      ankleUsable += 1;
      if (ankleSpeed > maxAnkleSpeed) maxAnkleSpeed = ankleSpeed;
    }
    var foot = -1;
    if (ankleUsable >= 3 && maxAnkleSpeed > 1e-8) {
      var fast = maxAnkleSpeed * 0.35;
      var slow = maxAnkleSpeed * 0.12;
      for (var a = 2; a < count; a++) {
        if (speeds[a] == null || speeds[a - 1] == null) continue;
        var nextSpeed = (a + 1 < count && speeds[a + 1] != null) ? speeds[a + 1] : speeds[a];
        if (speeds[a - 1] >= fast && speeds[a] <= slow && nextSpeed <= slow * 1.4) {
          foot = a;
          break;
        }
      }
    }
    if (foot < 0) foot = fallback.first;

    var wristPeak = -1;
    var wristMax = -1;
    var wristUsable = 0;
    for (var w = 1; w < count; w++) {
      var wristSpeed = keyframeSpeed2(
        keyframeLandmark(keyframeFrameAt(landmarksByFrame, w - 1), wristIndex),
        keyframeLandmark(keyframeFrameAt(landmarksByFrame, w), wristIndex)
      );
      if (wristSpeed == null) continue;
      wristUsable += 1;
      if (wristSpeed > wristMax) {
        wristMax = wristSpeed;
        wristPeak = w;
      }
    }
    var release = wristPeak;
    if (wristPeak >= 0) {
      var bestReach = -1;
      var chosen = wristPeak;
      var from = Math.max(0, wristPeak - 1);
      var to = Math.min(count - 1, wristPeak + 2);
      for (var e = from; e <= to; e++) {
        var frame = keyframeFrameAt(landmarksByFrame, e);
        var wrist = keyframeLandmark(frame, wristIndex);
        var shoulder = keyframeLandmark(frame, throwShoulderIndex);
        var nose = keyframeLandmark(frame, 0);
        var leftShoulder = keyframeLandmark(frame, 11);
        var rightShoulder = keyframeLandmark(frame, 12);
        if (!wrist || !shoulder) continue;
        var pastLine = true;
        if (leftShoulder && rightShoulder) {
          var shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
          var headY = nose ? Math.min(nose.y, shoulderY) : shoulderY;
          pastLine = wrist.y <= headY + 0.04;
        }
        if (!pastLine) continue;
        var reach = Math.hypot(wrist.x - shoulder.x, wrist.y - shoulder.y);
        if (reach > bestReach) {
          bestReach = reach;
          chosen = e;
        }
      }
      release = chosen;
    }
    if (wristUsable < 3) release = fallback.second;
    if (!(release >= 0)) release = fallback.second;
    if (release <= foot) release = Math.min(count - 1, foot + 1);
    return {
      footContact: keyframeClampIndex(foot, count),
      release: keyframeClampIndex(release, count)
    };
  } catch (err) {
    return { footContact: fallback.first, release: fallback.second };
  }
}
