const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../native/biomechanics_math.js'), 'utf8');
const context = { Math: Math, Number: Number };
vm.createContext(context);
vm.runInContext(source, context);

const cases = [];

function check(name, actual, expected) {
  const pass = actual === expected || (
    typeof expected === 'number' &&
    typeof actual === 'number' &&
    Math.abs(actual - expected) <= 0.1
  );
  cases.push({ name: name, pass: pass, actual: actual, expected: expected });
}

const rightAngle = context.calculateJointAngle(
  { x: 0.5, y: 0.0 },
  { x: 0.5, y: 0.5 },
  { x: 1.0, y: 0.5 }
);
check('膝の直角は 90°', rightAngle, 90);

const straightElbow = context.calculateJointAngle(
  { x: 0.2, y: 0.5 },
  { x: 0.5, y: 0.5 },
  { x: 0.8, y: 0.5 }
);
check('肘の完全伸展は 180°', straightElbow, 180);

const folded = context.calculateJointAngle(
  { x: 0.5, y: 0.0 },
  { x: 0.5, y: 0.5 },
  { x: 0.5, y: 0.2 }
);
check('同じ方向へ折れた関節は 0°', folded, 0);

const torsion = context.calculateTorsionAngle(
  { x: 1, y: 0 },
  { x: 1 / Math.sqrt(2), y: 1 / Math.sqrt(2) }
);
check('水平と 45° ベクトルの捻転差は 45°', torsion, 45);

const parallel = context.calculateTorsionAngle({ x: 1, y: 0 }, { x: 2, y: 0 });
check('平行な肩と骨盤の捻転差は 0°', parallel, 0);

check('点が無い関節角は null', context.calculateJointAngle(undefined, { x: 0, y: 0 }, { x: 1, y: 0 }), null);
check(
  'visibility 0.5 未満の関節角は null',
  context.calculateJointAngle(
    { x: 0.5, y: 0.0, visibility: 0.49 },
    { x: 0.5, y: 0.5 },
    { x: 1.0, y: 0.5 }
  ),
  null
);
check('ゼロベクトルの捻転差は null', context.calculateTorsionAngle({ x: 0, y: 0 }, { x: 1, y: 0 }), null);
check(
  '基準から (0.3, 0.4) の変位は 0.5',
  context.calculateSegmentDisplacement({ x: 0.3, y: 0.4 }, { x: 0, y: 0 }),
  0.5
);
check(
  '基準点が無い変位は null',
  context.calculateSegmentDisplacement({ x: 0.2, y: 0.2 }, undefined),
  null
);

function keyframeBody(spec) {
  const points = [];
  for (let i = 0; i < 33; i += 1) points.push({ x: 0.5, y: 0.55, z: 0, visibility: 1 });
  points[0] = { x: 0.5, y: 0.2, z: 0, visibility: 1 };
  points[11] = { x: 0.42, y: 0.32, z: 0, visibility: 1 };
  points[12] = { x: 0.58, y: 0.32, z: spec.shoulderZ || 0.02, visibility: 1 };
  points[15] = { x: spec.wristX - 0.02, y: spec.wristY, z: 0, visibility: 1 };
  points[16] = { x: spec.wristX, y: spec.wristY, z: 0, visibility: 1 };
  points[23] = { x: 0.45, y: 0.62, z: 0, visibility: 1 };
  points[24] = { x: 0.55, y: 0.62, z: 0.04, visibility: 1 };
  points[27] = { x: spec.ankleX, y: 0.9, z: 0, visibility: 1 };
  points[28] = { x: spec.ankleX + 0.2, y: 0.9, z: 0, visibility: 1 };
  return points;
}

const swingX = [0.50, 0.40, 0.30, 0.20, 0.35, 0.55, 0.80, 0.90];
const swing = swingX.map(function(x, index) {
  return keyframeBody({
    wristX: x,
    wristY: 0.4,
    ankleX: index >= 6 ? x : 0.2,
    shoulderZ: index === 3 ? 0.2 : 0.02
  });
});
const battingKeys = context.detectBattingKeyframes(swing, swing.length, true);
check('打撃トップは手首が反転したコマ', battingKeys.top, 3);
check('打撃インパクトは速度ピーク直後の前足ライン', battingKeys.impact, 6);

const ankleX = [0.20, 0.35, 0.55, 0.80, 0.82, 0.82, 0.82, 0.82];
const pitch = ankleX.map(function(x, index) {
  return keyframeBody({
    wristX: index < 6 ? 0.55 : 0.9,
    wristY: index === 6 ? 0.12 : 0.45,
    ankleX: x
  });
});
const pitchKeys = context.detectPitchingKeyframes(pitch, pitch.length, true);
check('右投げのべた足は足首が止まった最初のコマ', pitchKeys.footContact, 4);
check('リリースは手首速度のピーク付近', pitchKeys.release, 6);

const fallbackKeys = context.detectBattingKeyframes(null, 10, true);
check('検出できない動画の第1候補は25〜40%', fallbackKeys.top, 3);
check('検出できない動画の第2候補は50〜65%', fallbackKeys.impact, 5);
const safeKeys = context.detectPitchingKeyframes(undefined, Number.NaN, true);
check('壊れた入力でもキーフレームは数値', Number.isFinite(safeKeys.footContact) && Number.isFinite(safeKeys.release), true);

let failed = 0;
cases.forEach(function(item) {
  if (item.pass) {
    console.log('PASS  ' + item.name);
  } else {
    failed += 1;
    console.error('FAIL  ' + item.name + '  actual=' + item.actual + '  expected=' + item.expected);
  }
});

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log(cases.length + ' passed');
