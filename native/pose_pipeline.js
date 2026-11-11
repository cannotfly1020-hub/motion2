// 推論へ渡す前の縮小と、1コマずつ seeked を待ってから推論する再生。
// 両アプリから読む。共有する名前は var。

var POSE_ASSET_BASE = '../libs/mediapipe/';
var POSE_INPUT_MAX_EDGE = 640;
var poseStride = 2;
var poseCalmCount = 0;
var poseApplyMetrics = true;
var POSE_CACHE_FRAME_CAP = 240;
var POSE_LONG_VIDEO_NOTICE_SECONDS = 10;
var POSE_LONG_VIDEO_NOTICE = '長尺動画を検出しました。スイング（投球）動作を中心に最適化して読み込みます';
var poseCache = {
  videoId: null,
  totalFrames: 0,
  landmarksByFrame: Object.create(null),
  metricsByFrame: Object.create(null),
  visitedByFrame: Object.create(null),
  isFullyScanned: false,
  longVideoNotified: false
};
var cachePlaybackFrame = 0;
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
    noteLongVideoMemoryGuard();
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
  bindPoseCache(src);
  if (typeof stopFrameAccuratePlayback === 'function') stopFrameAccuratePlayback();
  try {
    video.pause();
  } catch (err) { /* 前の動画が止まっていれば何もしない */ }
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
  var countEl = document.getElementById('analysis-progress-count');
  var bar = document.getElementById('analysis-progress-bar');
  var meter = document.getElementById('analysis-progress-meter');
  var job = analysisProgressStack.length ? analysisProgressStack[analysisProgressStack.length - 1] : null;
  if (!job) {
    root.classList.remove('is-visible');
    root.setAttribute('aria-hidden', 'true');
    setAnalysisControlsBusy(false);
    return;
  }
  if (titleEl && titleEl.textContent !== job.title) titleEl.textContent = job.title;
  if (detailEl && detailEl.textContent !== (job.detail || '')) detailEl.textContent = job.detail || '';
  if (countEl) countEl.textContent = job.count || '';
  if (meter) meter.classList.toggle('is-indeterminate', !(job.pct >= 0));
  if (bar) bar.style.width = (job.pct >= 0) ? (job.pct + '%') : '';
  root.classList.add('is-visible');
  root.setAttribute('aria-hidden', 'false');
  setAnalysisControlsBusy(true);
}

function beginAnalysisProgress(key, title, detail, meter) {
  var next = {
    key: key,
    title: title,
    detail: detail || '',
    pct: meter && Number.isFinite(meter.pct) ? meter.pct : -1,
    count: meter && meter.count ? meter.count : ''
  };
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
  var total = poseCacheSlots();
  if (total <= 0) total = Math.max(1, Math.round(duration / step));
  var index = poseCacheIndexForNative(poseFrameIndex(videoElement.currentTime)) + 1;
  if (index < 1) index = 1;
  if (index > total) index = total;
  var pct = Math.round((index / total) * 100);
  if (pct > 100) pct = 100;
  beginAnalysisProgress(
    'playback',
    'AI骨格スキャンを実行中...',
    '長尺動画の場合は動作区間を最適化して読み込みます',
    { pct: pct, count: index + ' / ' + total }
  );
}

function stopFrameAccuratePlayback() {
  frameSeekGeneration += 1;
  if (cachePlaybackFrame) {
    cancelAnimationFrame(cachePlaybackFrame);
    cachePlaybackFrame = 0;
  }
  analysisTransportPlaying = false;
  frameSeekLoopActive = false;
  endAnalysisProgress('playback');
  if (typeof videoElement !== 'undefined' && videoElement && !videoElement.paused) {
    try { videoElement.pause(); } catch (err) { /* すでに停止 */ }
  }
  if (typeof updatePlayState === 'function') {
    try { updatePlayState(); } catch (err) { console.warn('[PoseCache] play state update skipped', err); }
  }
}

function yieldToUi() {
  return new Promise(function(resolve) {
    setTimeout(resolve, 0);
  });
}

function copyLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 33) return null;
  var copy = new Array(33);
  for (var i = 0; i < 33; i++) {
    var point = landmarks[i];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      copy[i] = null;
      continue;
    }
    copy[i] = {
      x: point.x,
      y: point.y,
      z: Number.isFinite(point.z) ? point.z : 0,
      visibility: Number.isFinite(point.visibility) ? point.visibility : 0
    };
  }
  return copy;
}

function emptyPoseCache(videoId) {
  return {
    videoId: videoId || null,
    totalFrames: 0,
    landmarksByFrame: Object.create(null),
    metricsByFrame: Object.create(null),
    visitedByFrame: Object.create(null),
    isFullyScanned: false,
    longVideoNotified: false
  };
}

function clearAnalysisCanvases() {
  var canvases = [
    [typeof bufferCanvas !== 'undefined' ? bufferCanvas : null, typeof bufferCtx !== 'undefined' ? bufferCtx : null],
    [typeof scanCanvas !== 'undefined' ? scanCanvas : null, typeof scanCtx !== 'undefined' ? scanCtx : null],
    [typeof outputCanvas !== 'undefined' ? outputCanvas : null, typeof outputCtx !== 'undefined' ? outputCtx : null]
  ];
  for (var i = 0; i < canvases.length; i++) {
    var canvas = canvases[i][0];
    var ctx = canvases[i][1];
    if (!canvas || !ctx) continue;
    ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
  }
  if (typeof bufferCanvas !== 'undefined' && bufferCanvas) {
    bufferCanvas.width = 2;
    bufferCanvas.height = 2;
  }
}

function clearPoseMemorySafely() {
  if (typeof stopFrameAccuratePlayback === 'function') stopFrameAccuratePlayback();
  poseInferPrev = null;
  poseInferLast = null;
  if (typeof lastPoseLandmarks !== 'undefined') lastPoseLandmarks = null;
  if (window.poseCache) {
    var oldFrames = window.poseCache.landmarksByFrame;
    var oldMetrics = window.poseCache.metricsByFrame;
    var oldVisited = window.poseCache.visitedByFrame;
    if (oldFrames) {
      for (var frameKey in oldFrames) delete oldFrames[frameKey];
    }
    if (oldMetrics) {
      for (var metricKey in oldMetrics) delete oldMetrics[metricKey];
    }
    if (oldVisited) {
      for (var visitKey in oldVisited) delete oldVisited[visitKey];
    }
    window.poseCache.landmarksByFrame = Object.create(null);
    window.poseCache.metricsByFrame = Object.create(null);
    window.poseCache.visitedByFrame = null;
    window.poseCache.isFullyScanned = false;
    window.poseCache = null;
  }
  clearAnalysisCanvases();
  poseCache = emptyPoseCache(null);
  window.poseCache = poseCache;
  if (typeof clearDetectedKeyframes === 'function') {
    try { clearDetectedKeyframes(); } catch (err) { console.warn('[PoseCache] keyframe clear skipped', err); }
  }
}

function resetPoseCache() {
  if (typeof videoElement !== 'undefined' && videoElement && !videoElement.paused) {
    try { videoElement.pause(); } catch (err) { /* すでに停止 */ }
  }
  clearPoseMemorySafely();
}

function bindPoseCache(videoId) {
  var id = videoId || '';
  if (poseCache && poseCache.videoId === id && id) return;
  clearPoseMemorySafely();
  if (poseCache) poseCache.videoId = id || null;
}

function noteLongVideoMemoryGuard() {
  if (typeof videoElement === 'undefined' || !videoElement || !poseCache) return;
  var duration = videoElement.duration;
  if (!Number.isFinite(duration) || duration < POSE_LONG_VIDEO_NOTICE_SECONDS) return;
  if (poseCache.longVideoNotified) return;
  poseCache.longVideoNotified = true;
  if (typeof showToast === 'function') showToast(POSE_LONG_VIDEO_NOTICE, 4200);
  else if (typeof notifyUser === 'function') notifyUser(POSE_LONG_VIDEO_NOTICE);
}

function poseFrameStep() {
  var step = analysisFrameDuration;
  if (!(step > 0)) step = 1 / 30;
  return Math.min(1 / 24, Math.max(1 / 240, step));
}

function poseFrameCount() {
  var duration = videoElement && videoElement.duration;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(1, Math.round(duration / poseFrameStep()));
}

function poseFrameIndex(time) {
  var count = poseFrameCount();
  var index = Math.round((time || 0) / poseFrameStep());
  if (index < 0) index = 0;
  if (count > 0 && index > count - 1) index = count - 1;
  return index;
}

function poseMemoryStride() {
  var total = poseFrameCount();
  if (total <= POSE_CACHE_FRAME_CAP) return 1;
  return Math.ceil(total / POSE_CACHE_FRAME_CAP);
}

function poseCacheSlots() {
  var total = poseFrameCount();
  if (total <= 0) return 0;
  return Math.min(POSE_CACHE_FRAME_CAP, Math.ceil(total / poseMemoryStride()));
}

function poseScanTimeStep() {
  return poseFrameStep() * poseMemoryStride();
}

function poseCacheIndexForNative(nativeIndex) {
  var stride = poseMemoryStride();
  var slot = Math.floor((nativeIndex || 0) / stride);
  if (slot < 0) slot = 0;
  var slots = poseCacheSlots();
  var limit = slots > 0 ? slots : POSE_CACHE_FRAME_CAP;
  if (slot >= limit) slot = limit - 1;
  return slot;
}

function poseCacheEntryCount() {
  if (!poseCache || !poseCache.landmarksByFrame) return 0;
  var count = 0;
  for (var key in poseCache.landmarksByFrame) {
    if (Object.prototype.hasOwnProperty.call(poseCache.landmarksByFrame, key)) count += 1;
  }
  return count;
}

function enforcePoseCacheCap() {
  if (!poseCache || !poseCache.landmarksByFrame) return;
  var slots = poseCacheSlots();
  var limit = slots > 0 ? slots : POSE_CACHE_FRAME_CAP;
  var frames = poseCache.landmarksByFrame;
  var metrics = poseCache.metricsByFrame;
  var visited = poseCache.visitedByFrame;
  for (var key in frames) {
    if (!Object.prototype.hasOwnProperty.call(frames, key)) continue;
    var index = Number(key);
    if (!Number.isFinite(index) || index < 0 || index >= limit) {
      delete frames[key];
      if (metrics) delete metrics[key];
      if (visited) delete visited[key];
    }
  }
}

function snapshotPoseMetrics() {
  var state = {};
  if (typeof currentCalculatedState === 'object' && currentCalculatedState) {
    for (var key in currentCalculatedState) {
      if (Object.prototype.hasOwnProperty.call(currentCalculatedState, key)) state[key] = currentCalculatedState[key];
    }
  }
  var texts = {};
  for (var i = 1; i <= 10; i++) {
    var el = document.getElementById('c' + i + '-val');
    if (el) texts['c' + i] = el.textContent;
  }
  return { state: state, texts: texts };
}

function restorePoseMetrics(snapshot) {
  if (!snapshot) return;
  if (snapshot.state && typeof currentCalculatedState === 'object' && currentCalculatedState) {
    for (var key in snapshot.state) {
      if (Object.prototype.hasOwnProperty.call(snapshot.state, key)) currentCalculatedState[key] = snapshot.state[key];
    }
  }
  if (snapshot.texts) {
    for (var n = 1; n <= 10; n++) {
      var label = snapshot.texts['c' + n];
      var node = document.getElementById('c' + n + '-val');
      if (node && label != null) node.textContent = label;
    }
  }
  if (typeof updateDrawerKeyBadge === 'function') updateDrawerKeyBadge();
}

function markPoseFrameVisited() {
  if (!videoElement || !poseCache) return;
  var slot = poseCacheIndexForNative(poseFrameIndex(videoElement.currentTime));
  if (!poseCache.visitedByFrame) poseCache.visitedByFrame = Object.create(null);
  poseCache.visitedByFrame[slot] = true;
  enforcePoseCacheCap();
}

function storePoseSample(landmarks, options) {
  if (!videoElement || !poseCache) return;
  var slot = poseCacheIndexForNative(poseFrameIndex(videoElement.currentTime));
  if (!poseCache.visitedByFrame) poseCache.visitedByFrame = Object.create(null);
  poseCache.visitedByFrame[slot] = true;
  if (!landmarks) {
    enforcePoseCacheCap();
    return;
  }
  var copy = copyLandmarks(landmarks);
  if (!copy) return;
  if (!poseCache.landmarksByFrame) poseCache.landmarksByFrame = Object.create(null);
  if (!poseCache.metricsByFrame) poseCache.metricsByFrame = Object.create(null);
  var fillOnly = options && options.fillOnly;
  var writeMetrics = options && options.writeMetrics;
  if (fillOnly) {
    if (!poseCache.landmarksByFrame[slot]) poseCache.landmarksByFrame[slot] = copy;
    if (!poseCache.metricsByFrame[slot]) poseCache.metricsByFrame[slot] = snapshotPoseMetrics();
  } else {
    poseCache.landmarksByFrame[slot] = copy;
    if (writeMetrics) poseCache.metricsByFrame[slot] = snapshotPoseMetrics();
  }
  var slots = poseCacheSlots();
  if (slots > poseCache.totalFrames) poseCache.totalFrames = slots;
  enforcePoseCacheCap();
}

function storeCurrentPose(measured) {
  storePoseSample(lastPoseLandmarks, { writeMetrics: !!measured });
}

function firstMissingPoseFrame() {
  var total = poseCacheSlots();
  if (!poseCache) return -1;
  for (var i = 0; i < total; i++) {
    var seen = poseCache.landmarksByFrame[i] || (poseCache.visitedByFrame && poseCache.visitedByFrame[i]);
    if (!seen) return i;
  }
  return -1;
}

function markPoseCacheComplete() {
  if (!poseCache) return;
  var total = poseCacheSlots();
  poseCache.totalFrames = total;
  enforcePoseCacheCap();
  if (total <= 0) {
    poseCache.isFullyScanned = false;
    return;
  }
  for (var i = 0; i < total; i++) {
    var seen = poseCache.landmarksByFrame[i] || (poseCache.visitedByFrame && poseCache.visitedByFrame[i]);
    if (!seen) {
      poseCache.isFullyScanned = false;
      console.warn('[PoseCache] missing frame', i, 'of', total);
      return;
    }
  }
  poseCache.isFullyScanned = true;
  console.log('[PoseCache] full scan cached', total, 'stride', poseMemoryStride(), 'kept', poseCacheEntryCount());
  if (typeof onPoseCacheComplete === 'function') {
    try { onPoseCacheComplete(); } catch (err) { console.warn('[PoseCache] keyframe detection skipped', err); }
  }
}

function renderCachedPose(index) {
  var landmarks = poseCache.landmarksByFrame[index];
  if (!landmarks) return false;
  if (typeof rememberPoseLandmarks === 'function') rememberPoseLandmarks(landmarks);
  var metrics = poseCache.metricsByFrame[index];
  if (metrics) restorePoseMetrics(metrics);
  if (typeof beginAnalysisCanvas !== 'function') return true;
  var bounds = beginAnalysisCanvas();
  if (!bounds) return true;
  if (typeof paintGhostSkeletons === 'function') paintGhostSkeletons(outputCtx, bounds.x, bounds.y, bounds.w, bounds.h);
  if ((typeof isSkeletonVisible === 'undefined' || isSkeletonVisible) && typeof paintLiveSkeleton === 'function') {
    paintLiveSkeleton(outputCtx, landmarks, bounds.x, bounds.y, bounds.w, bounds.h);
  }
  if (typeof endAnalysisCanvas === 'function') endAnalysisCanvas();
  return true;
}

function takeCachedPoseFrame() {
  if (typeof scanModeActive !== 'undefined' && scanModeActive) return false;
  if (!videoElement || !videoElement.videoWidth) return false;
  var index = poseCacheIndexForNative(poseFrameIndex(videoElement.currentTime));
  var cached = poseCache.landmarksByFrame[index];
  if (!cached) {
    if (poseCache.visitedByFrame && poseCache.visitedByFrame[index]) {
      if (typeof renderFrameOnly === 'function') renderFrameOnly();
      return true;
    }
    return false;
  }
  var wantMetrics = typeof poseApplyMetrics === 'undefined' || poseApplyMetrics;
  if (wantMetrics && !poseCache.metricsByFrame[index]) {
    applyStoredPose(cached);
    return true;
  }
  renderCachedPose(index);
  return true;
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
  storePoseSample(landmarks, { writeMetrics: true });
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
  storePoseSample(landmarks, { fillOnly: true });
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

function startCachePlayback() {
  if (!videoElement || !poseCache.isFullyScanned) return false;
  if (analysisTransportPlaying) return true;
  var duration = videoElement.duration;
  if (!Number.isFinite(duration) || duration <= 0) return false;

  var generation = ++frameSeekGeneration;
  analysisTransportPlaying = true;
  frameSeekLoopActive = true;
  if (typeof updatePlayState === 'function') updatePlayState();
  console.log('[PoseCache] playback from cache', poseCache.totalFrames);

  var sawPlaying = false;
  function paint() {
    if (generation !== frameSeekGeneration) return;
    if (!videoElement.paused && !videoElement.ended) sawPlaying = true;
    renderCachedPose(poseCacheIndexForNative(poseFrameIndex(videoElement.currentTime)));
    if (typeof updateTimeUI === 'function') updateTimeUI();
    if (videoElement.ended || videoElement.currentTime >= duration - 0.001) {
      stopFrameAccuratePlayback();
      return;
    }
    if (sawPlaying && videoElement.paused) {
      stopFrameAccuratePlayback();
      return;
    }
    cachePlaybackFrame = requestAnimationFrame(paint);
  }

  function beginPlay() {
    if (generation !== frameSeekGeneration) return;
    var started = videoElement.play();
    if (started && typeof started.then === 'function') {
      started.then(function() {
        if (generation !== frameSeekGeneration) return;
        cachePlaybackFrame = requestAnimationFrame(paint);
      }).catch(function(err) {
        console.warn('[PoseCache] play failed:', err);
        if (generation === frameSeekGeneration) stopFrameAccuratePlayback();
      });
      return;
    }
    cachePlaybackFrame = requestAnimationFrame(paint);
  }

  if (videoElement.currentTime >= duration - poseScanTimeStep()) {
    waitForSeeked(0).then(beginPlay);
    return true;
  }
  beginPlay();
  return true;
}

function startFrameAccuratePlayback() {
  if (!videoElement || !videoElement.videoWidth) return;
  if (analysisTransportPlaying) return;
  var duration = videoElement.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  if (poseCache.isFullyScanned) {
    startCachePlayback();
    return;
  }

  noteLongVideoMemoryGuard();
  var missing = firstMissingPoseFrame();
  var here = poseCacheIndexForNative(poseFrameIndex(videoElement.currentTime));
  var hereSeen = !!(poseCache && (poseCache.landmarksByFrame[here] || (poseCache.visitedByFrame && poseCache.visitedByFrame[here])));
  var sampleStep = poseScanTimeStep();
  var missingTime = missing * sampleStep;
  if (missing >= 0 && Math.abs((videoElement.currentTime || 0) - missingTime) > sampleStep * 0.4 && (hereSeen || videoElement.currentTime >= duration - sampleStep)) {
    var token = frameSeekGeneration;
    frameSeekLoopActive = true;
    waitForSeeked(missingTime).then(function() {
      if (token !== frameSeekGeneration) {
        frameSeekLoopActive = false;
        return;
      }
      frameSeekLoopActive = false;
      if (Math.abs((videoElement.currentTime || 0) - missingTime) > sampleStep) return;
      startFrameAccuratePlayback();
    });
    return;
  }

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

  var step = poseScanTimeStep();
  var stalls = 0;

  function finish(completed) {
    if (generation !== frameSeekGeneration) return;
    analysisTransportPlaying = false;
    frameSeekLoopActive = false;
    endAnalysisProgress('playback');
    if (completed) markPoseCacheComplete();
    if (typeof updatePlayState === 'function') updatePlayState();
  }

  function alive() {
    return generation === frameSeekGeneration;
  }

  function runInference(applyMetrics) {
    poseApplyMetrics = applyMetrics !== false;
    return yieldToUi().then(function() {
      var pending = (typeof processSingleFrame === 'function') ? processSingleFrame() : null;
      return Promise.resolve(pending).then(yieldToUi, yieldToUi);
    }).then(function() {
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
      finish(true);
      return;
    }
    var timeA = videoElement.currentTime;
    var land0 = poseInferPrev || poseInferLast;
    var landA = poseInferLast;
    var stride = poseMemoryStride() > 1 ? 1 : (landA ? poseStride : 1);
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
        var alreadyMeasured = !!poseCache.metricsByFrame[poseCacheIndexForNative(poseFrameIndex(timeB))];
        var motion = notePoseMotion(landA, landB, spanned);
        if (poseMemoryStride() === 1 && motion > 0.02 && spanned > 1 && landA && landB && !alreadyMeasured) {
          poseStride = 1;
          denseRescan(timeA, timeB, continueScan);
          return;
        }
        if (landB && !alreadyMeasured) applyStoredPose(landB);
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
      noteLongVideoMemoryGuard();
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
