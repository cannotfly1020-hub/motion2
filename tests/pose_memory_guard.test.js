const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = {
  document: { getElementById: function() { return null; } },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  requestAnimationFrame: function() { return 0; },
  cancelAnimationFrame: function() {},
  Promise: Promise,
  Object: Object,
  Math: Math,
  Number: Number,
  Array: Array
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../native/pose_pipeline.js'), 'utf8'), context);

let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log('PASS  ' + name);
    return;
  }
  failed += 1;
  console.error('FAIL  ' + name);
}

function fakePose(marker) {
  const points = [];
  for (let i = 0; i < 33; i += 1) {
    points.push({ x: 0.2, y: 0.4, z: 0.1, visibility: 0.9, marker: marker, texture: { hold: true } });
  }
  return points;
}

function useVideo(duration, frameDuration) {
  context.analysisFrameDuration = frameDuration;
  context.videoElement = {
    duration: duration,
    currentTime: 0,
    paused: true,
    videoWidth: 3840,
    videoHeight: 2160,
    pause: function() {}
  };
  context.clearPoseMemorySafely();
}

function fillEveryNativeFrame() {
  const total = context.poseFrameCount();
  const step = context.poseFrameStep();
  for (let i = 0; i < total; i += 1) {
    context.videoElement.currentTime = i * step;
    context.storePoseSample(fakePose(i), { writeMetrics: false });
  }
}

useVideo(2, 1 / 30);
assert('2秒・30fps は間引かない', context.poseMemoryStride() === 1 && context.poseCacheSlots() === 60);

useVideo(30, 1 / 30);
assert('30秒は 240 枠以内', context.poseFrameCount() === 900 && context.poseMemoryStride() === 4 && context.poseCacheSlots() === 225 && context.poseCacheSlots() <= 240);
fillEveryNativeFrame();
assert('900コマ入れても保持は枠数だけ', context.poseCacheEntryCount() === 225 && context.poseCacheEntryCount() <= 240);

useVideo(10, 1 / 240);
assert('10秒・240fps も 240 枠', context.poseFrameCount() === 2400 && context.poseMemoryStride() === 10 && context.poseCacheSlots() === 240);
fillEveryNativeFrame();
assert('2400コマ入れても 240 を超えない', context.poseCacheEntryCount() === 240);
const stored = context.poseCache.landmarksByFrame[0][0];
assert('キャッシュは座標だけ', stored && stored.texture == null && stored.marker == null && stored.x === 0.2 && stored.visibility === 0.9);

const previousMap = context.poseCache.landmarksByFrame;
context.bindPoseCache('blob:next-video');
assert('次の動画で前のキャッシュを手放す', context.poseCache.landmarksByFrame !== previousMap && context.poseCacheEntryCount() === 0 && previousMap[0] == null);

context.storePoseSample(fakePose(1), { writeMetrics: false });
context.clearPoseMemorySafely();
context.clearPoseMemorySafely();
context.clearPoseMemorySafely();
assert('連続クリア後も空のキャッシュに戻る', context.poseCache && context.poseCacheEntryCount() === 0 && context.poseCache.isFullyScanned === false);

context.activeTrimStart = function() { return 2; };
context.activeTrimEnd = function() { return 5; };
useVideo(10, 1 / 30);
assert('3秒区間は90コマ', context.poseFrameCount() === 90 && context.poseCacheSlots() === 90);
assert('区間の先頭秒は枠0', context.poseFrameIndex(2) === 0);
assert('区間より前は枠0に丸まる', context.poseFrameIndex(0) === 0);
assert('区間内の1秒後は30枠', context.poseFrameIndex(3) === 30);
context.videoElement.currentTime = 2;
context.storePoseSample(fakePose(2), { writeMetrics: false });
assert('区間の先頭時刻は枠0に入る', context.poseCache.landmarksByFrame[0] && context.poseCache.landmarksByFrame[30] == null);
delete context.activeTrimStart;
delete context.activeTrimEnd;

if (failed > 0) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('pose memory guard passed');
