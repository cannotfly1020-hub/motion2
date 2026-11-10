// 推論へ渡す前の縮小と、1コマずつ seeked を待ってから推論する再生。
// 両アプリから読む。共有する名前は var。

var POSE_ASSET_BASE = '../libs/mediapipe/';
var POSE_INPUT_MAX_WIDTH = 640;
var analysisFrameDuration = 1 / 30;
var analysisTransportPlaying = false;
var frameSeekLoopActive = false;
var probingFrameRate = false;
var frameSeekGeneration = 0;

function localPoseUrl(file) {
  return '../libs/mediapipe/' + file;
}

function paintPoseInputCanvas() {
  var srcW = videoElement.videoWidth;
  var srcH = videoElement.videoHeight;
  if (!srcW || !srcH) return false;

  var scale = srcW > POSE_INPUT_MAX_WIDTH ? POSE_INPUT_MAX_WIDTH / srcW : 1;
  var dw = Math.max(2, Math.round(srcW * scale));
  var dh = Math.max(2, Math.round(srcH * scale));
  if (dw % 2) dw -= 1;
  if (dh % 2) dh -= 1;
  if (dw < 2) dw = 2;
  if (dh < 2) dh = 2;

  if (bufferCanvas.width !== dw) bufferCanvas.width = dw;
  if (bufferCanvas.height !== dh) bufferCanvas.height = dh;
  bufferCtx.drawImage(videoElement, 0, 0, dw, dh);
  return true;
}

function waitForSeeked(target) {
  return new Promise(function(resolve) {
    if (!Number.isFinite(target)) {
      resolve();
      return;
    }
    if (Math.abs((videoElement.currentTime || 0) - target) < 0.0004) {
      resolve();
      return;
    }
    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      videoElement.removeEventListener('seeked', done);
      resolve();
    }
    videoElement.addEventListener('seeked', done);
    try {
      videoElement.currentTime = target;
    } catch (err) {
      done();
    }
  });
}

function stopFrameAccuratePlayback() {
  frameSeekGeneration += 1;
  analysisTransportPlaying = false;
  frameSeekLoopActive = false;
  if (typeof updatePlayState === 'function') updatePlayState();
}

function startFrameAccuratePlayback() {
  if (!videoElement || !videoElement.videoWidth) return;
  if (analysisTransportPlaying) return;
  var duration = videoElement.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;

  var generation = ++frameSeekGeneration;
  analysisTransportPlaying = true;
  frameSeekLoopActive = true;
  if (!videoElement.paused) videoElement.pause();
  if (typeof updatePlayState === 'function') updatePlayState();

  var step = analysisFrameDuration;
  if (!(step > 0)) step = 1 / 30;
  step = Math.min(1 / 24, Math.max(1 / 240, step));
  var stalls = 0;

  function finish() {
    if (generation !== frameSeekGeneration) return;
    analysisTransportPlaying = false;
    frameSeekLoopActive = false;
    if (typeof updatePlayState === 'function') updatePlayState();
  }

  function tick() {
    if (generation !== frameSeekGeneration) return;
    if (videoElement.currentTime >= duration - step * 0.25) {
      finish();
      return;
    }
    var before = videoElement.currentTime;
    var target = Math.min(duration, before + step);
    waitForSeeked(target).then(function() {
      if (generation !== frameSeekGeneration) return;
      if (videoElement.currentTime < before + step * 0.5) {
        stalls += 1;
        if (stalls > 2) {
          finish();
          return;
        }
      } else {
        stalls = 0;
      }
      var pending = (typeof processSingleFrame === 'function') ? processSingleFrame() : null;
      Promise.resolve(pending).then(function() {
        if (generation !== frameSeekGeneration) return;
        if (typeof updateTimeUI === 'function') updateTimeUI();
        tick();
      });
    });
  }

  var first = (typeof processSingleFrame === 'function') ? processSingleFrame() : null;
  Promise.resolve(first).then(function() {
    if (generation !== frameSeekGeneration) return;
    if (typeof updateTimeUI === 'function') updateTimeUI();
    tick();
  });
}

function probeAnalysisFrameDuration() {
  if (!videoElement || typeof videoElement.requestVideoFrameCallback !== 'function') return;
  if (probingFrameRate || analysisTransportPlaying) return;
  probingFrameRate = true;

  var samples = [];
  var previous = null;
  var origin = videoElement.currentTime || 0;

  function restore() {
    probingFrameRate = false;
    try { videoElement.pause(); } catch (err) { /* すでに停止 */ }
    waitForSeeked(origin);
  }

  function take(now, metadata) {
    var mediaTime = metadata && metadata.mediaTime;
    if (typeof previous === 'number' && typeof mediaTime === 'number') {
      var delta = mediaTime - previous;
      if (delta > 0.001 && delta < 0.1) samples.push(delta);
    }
    previous = mediaTime;
    if (samples.length >= 6) {
      samples.sort(function(a, b) { return a - b; });
      var mid = samples[Math.floor(samples.length / 2)];
      analysisFrameDuration = Math.min(1 / 24, Math.max(1 / 240, mid));
      restore();
      return;
    }
    videoElement.requestVideoFrameCallback(take);
  }

  videoElement.requestVideoFrameCallback(take);
  videoElement.play().catch(function() {
    probingFrameRate = false;
  });
}

function installFrameProbe() {
  if (!videoElement) return;
  videoElement.addEventListener('loadedmetadata', function() {
    probeAnalysisFrameDuration();
  });
}
