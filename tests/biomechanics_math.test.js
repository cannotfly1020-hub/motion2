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
