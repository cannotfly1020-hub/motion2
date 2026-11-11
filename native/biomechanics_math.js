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
