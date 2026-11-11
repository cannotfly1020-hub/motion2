// 推論へ渡す前の縮小と、1コマずつ seeked を待ってから推論する再生。
// 両アプリから読む。共有する名前は var。

var POSE_ASSET_BASE = '../libs/mediapipe/';
var POSE_INPUT_MAX_EDGE = 640;
var poseStride = 2;
var poseCalmCount = 0;
var poseApplyMetrics = true;
var poseInferPrev = null;
var poseInferLast = null;
var POSE_MOTION_JOINTS = [11, 12, 15, 16, 23, 24, 25, 26, 27, 28];
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

  var longEdge = Math.max(srcW, srcH);
  var scale = longEdge > POSE_INPUT_MAX_EDGE ? POSE_INPUT_MAX_EDGE / longEdge : 1;
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
    if (!videoElement || !Number.isFinite(target)) {
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
      clearTimeout(timer);
      videoElement.removeEventListener('seeked', done);
      resolve();
    }
    var timer = setTimeout(function() {
      console.warn('[VideoLoad] seek timeout at', target);
      done();
    }, 2500);
    videoElement.addEventListener('seeked', done);
    try {
      videoElement.currentTime = target;
    } catch (err) {
      console.warn('[VideoLoad] seek failed:', err);
      done();
    }
  });
}

var cancelVideoLoadWatch = null;

function applyInlineVideoPolicy(video) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
}

function startMeasurementVideo(video, src, onReady) {
  if (cancelVideoLoadWatch) cancelVideoLoadWatch();
  applyInlineVideoPolicy(video);
  var loaded = false;
  var timeoutId = setTimeout(function() {
    console.warn('[VideoLoad] 読み込みがタイムアウトしたため、強制的に解除して処理を続行します');
    finish('timeout');
  }, 5000);

  function detach() {
    clearTimeout(timeoutId);
    video.removeEventListener('loadedmetadata', onMeta);
    video.removeEventListener('loadeddata', onData);
    video.removeEventListener('canplay', onCanPlay);
    video.removeEventListener('error', onError);
  }

  function finish(reason) {
    if (loaded || cancelVideoLoadWatch === null) return;
    loaded = true;
    detach();
    cancelVideoLoadWatch = null;
    console.log('[VideoLoad] ready via', reason, 'readyState=', video.readyState, 'src=', video.currentSrc || video.src);
    try {
      var nudge = 0.001;
      if (Number.isFinite(video.duration) && video.duration > 0 && video.duration < nudge) {
        nudge = video.duration / 2;
      }
      if (Math.abs((video.currentTime || 0) - nudge) > 0.0004) video.currentTime = nudge;
    } catch (err) {
      console.warn('[VideoLoad] Initial seek failed:', err);
    }
    endAnalysisProgress('video');
    if (typeof onReady === 'function') {
      try {
        onReady();
      } catch (err) {
        console.error('[VideoLoad] preview failed:', err);
      }
    }
  }

  function onMeta() {
    console.log('[VideoLoad] loadedmetadata');
    finish('loadedmetadata');
  }
  function onData() {
    console.log('[VideoLoad] loadeddata');
    finish('loadeddata');
  }
  function onCanPlay() {
    console.log('[VideoLoad] canplay');
    finish('canplay');
  }
  function onError() {
    if (loaded) return;
    loaded = true;
    detach();
    cancelVideoLoadWatch = null;
    console.error('[VideoLoad] Video element error:', video.error);
    endAnalysisProgress('video');
    alert('動画の読み込みに失敗しました。別の動画を選択してください。');
  }

  cancelVideoLoadWatch = function() {
    loaded = true;
    detach();
    cancelVideoLoadWatch = null;
  };
  video.addEventListener('loadedmetadata', onMeta);
  video.addEventListener('loadeddata', onData);
  video.addEventListener('canplay', onCanPlay);
  video.addEventListener('error', onError);
  console.log('[VideoLoad] set src', src);
  try {
    video.src = src;
    video.load();
  } catch (err) {
    console.error('[VideoLoad] load() failed:', err);
    onError();
    return;
  }
  setTimeout(function() {
    if (!loaded && video.readyState >= 2) {
      console.log('[VideoLoad] readyState', video.readyState);
      finish('readyState');
    }
  }, 0);
}

var analysisProgressStack = [];
var analysisBusyControlIds = [
  'video-input-side',
  'video-input-front',
  'video-input-capture',
  'btn-capture-side',
  'btn-capture-front',
  'btn-scan-action',
  'btn-scan-next-step',
  'btn-start-analysis',
  'btn-re-scan'
];

function renderAnalysisProgress() {
  var root = document.getElementById('analysis-progress');
  if (!root) return;
  var titleEl = document.getElementById('analysis-progress-title');
  var detailEl = document.getElementById('analysis-progress-detail');
  var job = analysisProgressStack.length ? analysisProgressStack[analysisProgressStack.length - 1] : null;
  if (!job) {
    root.classList.remove('is-visible');
    root.setAttribute('aria-hidden', 'true');
    setAnalysisControlsBusy(false);
    return;
  }
  if (titleEl && titleEl.textContent !== job.title) titleEl.textContent = job.title;
  if (detailEl && detailEl.textContent !== (job.detail || '')) detailEl.textContent = job.detail || '';
  root.classList.add('is-visible');
  root.setAttribute('aria-hidden', 'false');
  setAnalysisControlsBusy(true);
}

function beginAnalysisProgress(key, title, detail) {
  var next = { key: key, title: title, detail: detail || '' };
  var index = -1;
  for (var i = 0; i < analysisProgressStack.length; i++) {
    if (analysisProgressStack[i].key === key) {
      index = i;
      break;
    }
  }
  if (index >= 0) analysisProgressStack[index] = next;
  else analysisProgressStack.push(next);
  renderAnalysisProgress();
}

function endAnalysisProgress(key) {
  var kept = [];
  for (var i = 0; i < analysisProgressStack.length; i++) {
    if (analysisProgressStack[i].key !== key) kept.push(analysisProgressStack[i]);
  }
  analysisProgressStack = kept;
  renderAnalysisProgress();
}

function setAnalysisControlsBusy(busy) {
  for (var i = 0; i < analysisBusyControlIds.length; i++) {
    var el = document.getElementById(analysisBusyControlIds[i]);
    if (el) el.disabled = busy;
  }
}

function reportPlaybackProgress() {
  if (!videoElement) return;
  var duration = videoElement.duration;
  var step = analysisFrameDuration > 0 ? analysisFrameDuration : (1 / 30);
  if (!Number.isFinite(duration) || duration <= 0) return;
  var total = Math.max(1, Math.round(duration / step));
  var index = Math.floor((videoElement.currentTime || 0) / step) + 1;
  if (index < 1) index = 1;
  if (index > total) index = total;
  var pct = Math.round((index / total) * 100);
  if (pct > 100) pct = 100;
  beginAnalysisProgress(
    'playback',
    'AI骨格スキャン中... 画面を閉じずにお待ちください',
    '解析進捗: ' + pct + '%（' + index + ' / ' + total + '）'
  );
}

function stopFrameAccuratePlayback() {
  frameSeekGeneration += 1;
  analysisTransportPlaying = false;
  frameSeekLoopActive = false;
  endAnalysisProgress('playback');
  if (typeof updatePlayState === 'function') updatePlayState();
}

function yieldToUi() {
  return new Promise(function(resolve) {
    setTimeout(resolve, 0);
  });
}

function copyLandmarks(landmarks) {
  if (typeof clonePoseLandmarks === 'function') return clonePoseLandmarks(landmarks);
  if (!landmarks || landmarks.length < 33) return null;
  var copy = new Array(33);
  for (var i = 0; i < 33; i++) {
    var point = landmarks[i];
    copy[i] = point ? { x: point.x, y: point.y, z: point.z || 0, visibility: point.visibility } : null;
  }
  return copy;
}

function maxJointMotion(fromPose, toPose) {
  if (!fromPose || !toPose) return 0;
  var maxMove = 0;
  for (var i = 0; i < POSE_MOTION_JOINTS.length; i++) {
    var index = POSE_MOTION_JOINTS[i];
    var a = fromPose[index];
    var b = toPose[index];
    if (!a || !b) continue;
    var move = Math.hypot(b.x - a.x, b.y - a.y);
    if (move > maxMove) maxMove = move;
  }
  return maxMove;
}

function hermiteLandmarks(p0, p1, p2, p3, t) {
  var out = new Array(33);
  var t2 = t * t;
  var t3 = t2 * t;
  for (var i = 0; i < 33; i++) {
    var b = p1 && p1[i];
    var c = p2 && p2[i];
    if (!b || !c) {
      out[i] = b || c || null;
      continue;
    }
    var a = (p0 && p0[i]) || b;
    var d = (p3 && p3[i]) || c;
    out[i] = {
      x: 0.5 * ((2 * b.x) + (-a.x + c.x) * t + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * t2 + (-a.x + 3 * b.x - 3 * c.x + d.x) * t3),
      y: 0.5 * ((2 * b.y) + (-a.y + c.y) * t + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * t2 + (-a.y + 3 * b.y - 3 * c.y + d.y) * t3),
      z: 0.5 * ((2 * (b.z || 0)) + (-(a.z || 0) + (c.z || 0)) * t + (2 * (a.z || 0) - 5 * (b.z || 0) + 4 * (c.z || 0) - (d.z || 0)) * t2 + (-(a.z || 0) + 3 * (b.z || 0) - 3 * (c.z || 0) + (d.z || 0)) * t3),
      visibility: (b.visibility || 0) * (1 - t) + (c.visibility || 0) * t
    };
  }
  return out;
}

function applyStoredPose(landmarks) {
  if (!landmarks || typeof beginAnalysisCanvas !== 'function') return;
  var bounds = beginAnalysisCanvas();
  if (!bounds) return;
  try {
    if (typeof applyBattingBiomechanics === 'function') applyBattingBiomechanics(landmarks, bounds);
    else if (typeof applyPitchingBiomechanics === 'function') applyPitchingBiomechanics(landmarks, bounds);
  } catch (err) {
    console.warn('[PoseScan] metrics failed:', err);
  }
  if (typeof endAnalysisCanvas === 'function') endAnalysisCanvas();
}

function drawBlendedPose(landmarks) {
  if (!landmarks || typeof beginAnalysisCanvas !== 'function') return;
  var bounds = beginAnalysisCanvas();
  if (!bounds) return;
  if (typeof rememberPoseLandmarks === 'function') rememberPoseLandmarks(landmarks);
  if (typeof paintGhostSkeletons === 'function') paintGhostSkeletons(outputCtx, bounds.x, bounds.y, bounds.w, bounds.h);
  if ((typeof isSkeletonVisible === 'undefined' || isSkeletonVisible) && typeof paintLiveSkeleton === 'function') {
    paintLiveSkeleton(outputCtx, landmarks, bounds.x, bounds.y, bounds.w, bounds.h);
  }
  if (typeof endAnalysisCanvas === 'function') endAnalysisCanvas();
}

function notePoseMotion(fromPose, toPose, framesSpanned) {
  var span = Math.max(1, framesSpanned || 1);
  var perFrame = maxJointMotion(fromPose, toPose) / span;
  if (perFrame > 0.02) {
    poseStride = 1;
    poseCalmCount = 0;
  } else if (perFrame > 0.008) {
    poseStride = 2;
    poseCalmCount = 0;
  } else {
    poseCalmCount += 1;
    poseStride = poseCalmCount >= 2 ? 3 : 2;
  }
  return perFrame;
}

function startFrameAccuratePlayback() {
  if (!videoElement || !videoElement.videoWidth) return;
  if (analysisTransportPlaying) return;
  var duration = videoElement.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;

  var generation = ++frameSeekGeneration;
  analysisTransportPlaying = true;
  frameSeekLoopActive = true;
  poseStride = 2;
  poseCalmCount = 0;
  poseInferPrev = null;
  poseInferLast = null;
  if (!videoElement.paused) videoElement.pause();
  if (typeof updatePlayState === 'function') updatePlayState();
  reportPlaybackProgress();

  var step = analysisFrameDuration;
  if (!(step > 0)) step = 1 / 30;
  step = Math.min(1 / 24, Math.max(1 / 240, step));
  var stalls = 0;

  function finish() {
    if (generation !== frameSeekGeneration) return;
    analysisTransportPlaying = false;
    frameSeekLoopActive = false;
    endAnalysisProgress('playback');
    if (typeof updatePlayState === 'function') updatePlayState();
  }

  function alive() {
    return generation === frameSeekGeneration;
  }

  function runInference(applyMetrics) {
    poseApplyMetrics = applyMetrics !== false;
    var pending = (typeof processSingleFrame === 'function') ? processSingleFrame() : null;
    return Promise.resolve(pending).then(yieldToUi, yieldToUi).then(function() {
      poseApplyMetrics = true;
    });
  }

  function continueScan() {
    if (!alive()) return;
    reportPlaybackProgress();
    if (typeof updateTimeUI === 'function') updateTimeUI();
    yieldToUi().then(tick);
  }

  function rememberInference(previous) {
    var current = copyLandmarks(lastPoseLandmarks);
    poseInferPrev = previous || current;
    poseInferLast = current;
    return current;
  }

  function fillGaps(timeA, timeB, p0, p1, p2, done) {
    var span = timeB - timeA;
    var cursor = timeA + step;
    function nextGap() {
      if (!alive()) return;
      if (!(cursor < timeB - step * 0.25) || span <= step * 0.5) {
        waitForSeeked(timeB).then(function() {
          if (!alive()) return;
          drawBlendedPose(p2);
          done();
        });
        return;
      }
      var mix = (cursor - timeA) / span;
      waitForSeeked(cursor).then(function() {
        if (!alive()) return;
        drawBlendedPose(hermiteLandmarks(p0, p1, p2, p2, Math.max(0, Math.min(1, mix))));
        reportPlaybackProgress();
        if (typeof updateTimeUI === 'function') updateTimeUI();
        cursor += step;
        yieldToUi().then(nextGap);
      });
    }
    nextGap();
  }

  function denseRescan(timeA, timeB, done) {
    var cursor = timeA + step;
    function nextFrame() {
      if (!alive()) return;
      if (!(cursor < timeB - step * 0.25)) {
        waitForSeeked(timeB).then(function() {
          if (!alive()) return;
          runInference().then(function() {
            if (!alive()) return;
            rememberInference(poseInferLast);
            done();
          });
        });
        return;
      }
      waitForSeeked(cursor).then(function() {
        if (!alive()) return;
        runInference().then(function() {
          if (!alive()) return;
          rememberInference(poseInferLast);
          reportPlaybackProgress();
          if (typeof updateTimeUI === 'function') updateTimeUI();
          cursor += step;
          yieldToUi().then(nextFrame);
        });
      });
    }
    nextFrame();
  }

  function tick() {
    if (!alive()) return;
    if (videoElement.currentTime >= duration - step * 0.25) {
      finish();
      return;
    }
    var timeA = videoElement.currentTime;
    var land0 = poseInferPrev || poseInferLast;
    var landA = poseInferLast;
    var stride = landA ? poseStride : 1;
    if (stride < 1) stride = 1;
    var target = Math.min(duration, timeA + stride * step);
    waitForSeeked(target).then(function() {
      if (!alive()) return;
      if (videoElement.currentTime < timeA + step * 0.5) {
        stalls += 1;
        if (stalls > 2) {
          finish();
          return;
        }
      } else {
        stalls = 0;
      }
      var timeB = videoElement.currentTime;
      var spanned = Math.max(1, Math.round((timeB - timeA) / step));
      runInference(false).then(function() {
        if (!alive()) return;
        var landB = rememberInference(landA);
        var motion = notePoseMotion(landA, landB, spanned);
        if (motion > 0.02 && spanned > 1 && landA && landB) {
          poseStride = 1;
          denseRescan(timeA, timeB, continueScan);
          return;
        }
        if (landB) applyStoredPose(landB);
        if (spanned > 1 && landA && landB) {
          fillGaps(timeA, timeB, land0 || landA, landA, landB, continueScan);
          return;
        }
        continueScan();
      });
    });
  }

  runInference().then(function() {
    if (!alive()) return;
    rememberInference(null);
    continueScan();
  });
}

function probeAnalysisFrameDuration() {
  if (!videoElement || typeof videoElement.requestVideoFrameCallback !== 'function') return;
  if (probingFrameRate || analysisTransportPlaying) return;
  probingFrameRate = true;
  beginAnalysisProgress('probe', '動画のコマ数を確認しています...', '画面を閉じずにお待ちください');
  console.log('[VideoLoad] probe frame duration');

  var samples = [];
  var previous = null;
  var origin = videoElement.currentTime || 0;
  var probeTimer = setTimeout(function() {
    console.warn('[VideoLoad] コマ数確認がタイムアウトしたため、既定のコマ間隔で続行します');
    restore();
  }, 5000);

  function restore() {
    if (!probingFrameRate) return;
    probingFrameRate = false;
    clearTimeout(probeTimer);
    endAnalysisProgress('probe');
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
  videoElement.play().catch(function(err) {
    console.warn('[VideoLoad] frame probe play failed:', err);
    restore();
  });
}

function installFrameProbe() {
  if (!videoElement) return;
  videoElement.addEventListener('loadedmetadata', function() {
    probeAnalysisFrameDuration();
  });
}
