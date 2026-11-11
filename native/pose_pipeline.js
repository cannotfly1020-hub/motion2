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
        reportPlaybackProgress();
        if (typeof updateTimeUI === 'function') updateTimeUI();
        tick();
      });
    });
  }

  var first = (typeof processSingleFrame === 'function') ? processSingleFrame() : null;
  Promise.resolve(first).then(function() {
    if (generation !== frameSeekGeneration) return;
    reportPlaybackProgress();
    if (typeof updateTimeUI === 'function') updateTimeUI();
    tick();
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
