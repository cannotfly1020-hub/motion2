// 打撃と投球で共有する動画・キャッシュ・ドロワー・キャンバス。
// 指標と診断は MotionPlayerCore.init(config) で注入する。

var MotionPlayerCore = {
  config: null,
  init: function(config) {
    this.config = config || {};
    if (document.documentElement) {
      document.documentElement.dataset.motionMode = this.config.mode || '';
    }
    (this.config.keyPoints || []).forEach(function(point) {
      if (!point || !point.buttonId || !point.label) return;
      var button = document.getElementById(point.buttonId);
      if (button) button.textContent = point.label;
    });
  },
  applyBiomechanics: function(landmarks, bounds) {
    var calculator = this.config && this.config.metricsCalculator;
    if (calculator && typeof calculator.apply === 'function') {
      return calculator.apply(landmarks, bounds);
    }
    return null;
  }
};

function paintScanPreview() {
  if (!stepViews[2].classList.contains('active')) return;
  updateScanScreenSize();
  renderScanFrame();
}

function armScanPreview(src) {
  if (typeof startMeasurementVideo !== 'function') {
    endAnalysisProgress('video');
    return;
  }
  startMeasurementVideo(videoElement, src, function() {
    paintScanPreview();
    if (typeof videoElement.requestVideoFrameCallback === 'function') {
      videoElement.requestVideoFrameCallback(function() { paintScanPreview(); });
    }
  });
}

function handleVideoLoad(file, angleMode) {
  if (!file) return;
  if (videoFileUrl) {
    URL.revokeObjectURL(videoFileUrl);
    videoFileUrl = null;
  }
  videoFileUrl = URL.createObjectURL(file);
  openMeasurementVideo(videoFileUrl, angleMode);
}

function openMeasurementVideo(src, angleMode) {
  selectedAngleMode = angleMode;
  updateCardLabels();
  setStep(2);
  beginAnalysisProgress('video', '動画を読み込んでいます...', '画面を閉じずにお待ちください');
  if (typeof clearGhostCache === 'function') clearGhostCache();
  try {
    armScanPreview(src);
  } catch (err) {
    console.error('[VideoLoad] open failed:', err);
    endAnalysisProgress('video');
    alert('動画の読み込みに失敗しました。別の動画を選択してください。');
  }
  try {
    var pending = initMediaPipe();
    Promise.resolve(pending)
      .catch(function(err) { console.warn('[VideoLoad] MediaPipe init error:', err); })
      .finally(function() { paintScanPreview(); });
  } catch (err) {
    console.error('[VideoLoad] MediaPipe init error:', err);
    if (typeof endAnalysisProgress === 'function') endAnalysisProgress('model');
  }
}

MotionPlayerCore.openMeasurementVideo = openMeasurementVideo;
MotionPlayerCore.handleVideoLoad = handleVideoLoad;

function getAspectFitBounds(srcW, srcH, dstW, dstH) {
  if (!srcW || !srcH || !dstW || !dstH) return { x: 0, y: 0, w: dstW || 300, h: dstH || 200 };
  const srcAspect = srcW / srcH;
  const dstAspect = dstW / dstH;
  let w, h, x, y;
  if (srcAspect > dstAspect) {
    w = dstW;
    h = dstW / srcAspect;
    x = 0;
    y = (dstH - h) / 2;
  } else {
    h = dstH;
    w = dstH * srcAspect;
    x = (dstW - w) / 2;
    y = 0;
  }
  w = Math.max(0, Math.min(w, dstW));
  h = Math.max(0, Math.min(h, dstH));
  x = Math.max(0, Math.min(x, Math.max(0, dstW - w)));
  y = Math.max(0, Math.min(y, Math.max(0, dstH - h)));
  return { x, y, w, h };
}

function stagePixelSize(canvas) {
  const parent = canvas && canvas.parentElement;
  if (!parent) return null;
  const maxW = parent.clientWidth;
  const maxH = parent.clientHeight;
  if (maxW <= 0 || maxH <= 0) return null;
  const rect = parent.getBoundingClientRect();
  return {
    w: Math.max(1, Math.min(maxW, Math.floor(rect.width))),
    h: Math.max(1, Math.min(maxH, Math.floor(rect.height)))
  };
}

function bindCanvasToStage(canvas) {
  const size = stagePixelSize(canvas);
  if (!size) return false;
  canvas.style.width = '100%';
  canvas.style.maxWidth = '100%';
  canvas.style.height = '100%';
  canvas.style.maxHeight = '100%';
  canvas.style.objectFit = 'contain';
  const changed = canvas.width !== size.w || canvas.height !== size.h;
  if (changed) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  watchStage(canvas);
  return changed;
}

function watchStage(canvas) {
  if (!canvas || canvas._stageWatch || typeof ResizeObserver === 'undefined') return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const observer = new ResizeObserver(function() {
    if (!bindCanvasToStage(canvas)) return;
    if (canvas === scanCanvas && typeof renderScanFrame === 'function') renderScanFrame();
    else if (typeof renderFrameOnly === 'function') renderFrameOnly();
  });
  observer.observe(parent);
  canvas._stageWatch = true;
}

function updateScanScreenSize() {
  bindCanvasToStage(scanCanvas);
}

function scanPaintStyle() {
  var cfg = MotionPlayerCore.config || {};
  return {
    soft: cfg.scanAccentSoft || 'rgba(16, 185, 129, 0.4)',
    solid: cfg.scanAccent || '#10b981',
    centerLine: !!cfg.showScanCenterLine
  };
}

function renderScanFrame() {
  const cw = scanCanvas.width;
  const ch = scanCanvas.height;
  if (cw === 0 || ch === 0 || !videoElement.videoWidth) return;
  if (videoElement.readyState < 2) return;

  scanCtx.clearRect(0, 0, cw, ch);
  const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, cw, ch);
  scanCtx.drawImage(videoElement, b.x, b.y, b.w, b.h);

  if (Number.isFinite(videoElement.duration) && videoElement.duration > 0) {
    scanSeekBar.value = (videoElement.currentTime / videoElement.duration) * 100;
    scanTimeDisp.textContent = videoElement.currentTime.toFixed(2) + ' / ' + videoElement.duration.toFixed(2);
  }

  if (tuneRuler.isActive) drawInteractiveRuler(b);
}

function drawInteractiveRuler(b) {
  const topY = b.y + tuneRuler.topYNorm * b.h;
  const bottomY = b.y + tuneRuler.bottomYNorm * b.h;
  const centerX = b.x + tuneRuler.centerXNorm * b.w;
  const barWidth = 50;
  const paint = scanPaintStyle();

  scanCtx.strokeStyle = paint.soft;
  scanCtx.lineWidth = 4;
  scanCtx.beginPath();
  scanCtx.moveTo(centerX, topY);
  scanCtx.lineTo(centerX, bottomY);
  scanCtx.stroke();

  if (paint.centerLine) {
    scanCtx.strokeStyle = paint.solid;
    scanCtx.lineWidth = 2;
    scanCtx.beginPath();
    scanCtx.moveTo(centerX, topY);
    scanCtx.lineTo(centerX, bottomY);
    scanCtx.stroke();
  }

  scanCtx.strokeStyle = paint.solid;
  scanCtx.lineWidth = 3.5;
  scanCtx.beginPath();
  scanCtx.moveTo(centerX - barWidth, topY);
  scanCtx.lineTo(centerX + barWidth, topY);
  scanCtx.stroke();
  scanCtx.fillStyle = paint.solid;
  scanCtx.beginPath();
  scanCtx.arc(centerX, topY, 11, 0, Math.PI * 2);
  scanCtx.fill();
  scanCtx.strokeStyle = '#ffffff';
  scanCtx.lineWidth = 2;
  scanCtx.stroke();
  scanCtx.fillStyle = '#ffffff';
  scanCtx.font = 'bold 10px sans-serif';
  scanCtx.textAlign = 'center';
  scanCtx.fillText('👑 あたま ↕', centerX, topY - 14);

  scanCtx.strokeStyle = '#f43f5e';
  scanCtx.lineWidth = 3.5;
  scanCtx.beginPath();
  scanCtx.moveTo(centerX - barWidth, bottomY);
  scanCtx.lineTo(centerX + barWidth, bottomY);
  scanCtx.stroke();
  scanCtx.fillStyle = '#f43f5e';
  scanCtx.beginPath();
  scanCtx.arc(centerX, bottomY, 11, 0, Math.PI * 2);
  scanCtx.fill();
  scanCtx.strokeStyle = '#ffffff';
  scanCtx.lineWidth = 2;
  scanCtx.stroke();
  scanCtx.fillStyle = '#ffffff';
  scanCtx.fillText('👟 じめん ↕', centerX, bottomY + 18);
}

function resetWorkspaceDimensions() {
  bindCanvasToStage(outputCanvas);
}

function beginAnalysisCanvas() {
  const cw = outputCanvas.width;
  const ch = outputCanvas.height;
  if (cw === 0 || ch === 0 || !videoElement.videoWidth) return null;

  outputCtx.clearRect(0, 0, cw, ch);
  outputCtx.save();
  outputCtx.translate(cw / 2 + zoomPan.x, ch / 2 + zoomPan.y);
  outputCtx.scale(zoomScale, zoomScale);
  outputCtx.translate(-cw / 2, -ch / 2);

  const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, cw, ch);
  outputCtx.drawImage(videoElement, b.x, b.y, b.w, b.h);
  return b;
}

function endAnalysisCanvas() {
  outputCtx.restore();
  if (showAiDebugHud) drawAiDiagnosticsHUD(outputCtx);
}

function renderFrameOnly() {
  drawAiDiagnosticsHUD(outputCtx);
  const cw = outputCanvas.width;
  const ch = outputCanvas.height;
  if (cw === 0 || ch === 0 || !videoElement.videoWidth) return;

  outputCtx.clearRect(0, 0, cw, ch);
  outputCtx.save();
  outputCtx.translate(cw / 2 + zoomPan.x, ch / 2 + zoomPan.y);
  outputCtx.scale(zoomScale, zoomScale);
  outputCtx.translate(-cw / 2, -ch / 2);

  const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, cw, ch);
  if (videoElement.readyState >= 2) {
    outputCtx.drawImage(videoElement, b.x, b.y, b.w, b.h);
  }
  if (typeof paintGhostSkeletons === 'function') {
    paintGhostSkeletons(outputCtx, b.x, b.y, b.w, b.h);
  }
  if (typeof lastPoseLandmarks !== 'undefined' && lastPoseLandmarks && (typeof isSkeletonVisible === 'undefined' || isSkeletonVisible) && typeof paintLiveSkeleton === 'function') {
    paintLiveSkeleton(outputCtx, lastPoseLandmarks, b.x, b.y, b.w, b.h);
  }
  outputCtx.restore();
}

function drawBattingSkeleton(landmarks, ox, oy, bw, bh) {
  if (typeof paintGhostSkeletons === 'function') paintGhostSkeletons(outputCtx, ox, oy, bw, bh);
  if (typeof paintLiveSkeleton === 'function') paintLiveSkeleton(outputCtx, landmarks, ox, oy, bw, bh);
}

function drawPrecisionSkeleton(landmarks, ox, oy, bw, bh, isSouthpaw, isRightHanded) {
  const throwWristIdx = isRightHanded ? 16 : 15;
  const throwIndexIdx = isRightHanded ? 20 : 19;
  let drawLandmarks = landmarks;
  const wrist = landmarks[throwWristIdx];
  const indexTip = landmarks[throwIndexIdx];
  if (wrist && indexTip && typeof clonePoseLandmarks === 'function') {
    const dist = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
    if (dist > 0.18 || indexTip.visibility < 0.25) {
      drawLandmarks = clonePoseLandmarks(landmarks);
      if (drawLandmarks) drawLandmarks[throwIndexIdx] = { x: wrist.x, y: wrist.y, z: wrist.z || 0, visibility: wrist.visibility };
    }
  }
  if (typeof paintGhostSkeletons === 'function') paintGhostSkeletons(outputCtx, ox, oy, bw, bh);
  if (typeof paintLiveSkeleton === 'function') paintLiveSkeleton(outputCtx, drawLandmarks, ox, oy, bw, bh);
}

var isHudCollapsed = true;
var hudLayout = {
  x: 12,
  y: 30,
  expandedW: 270,
  expandedH: 158,
  collapsedW: 112,
  collapsedH: 26,
  radius: 8
};

function getAiHudBox(canvasWidth) {
  const localW = isHudCollapsed ? hudLayout.collapsedW : hudLayout.expandedW;
  const localH = isHudCollapsed ? hudLayout.collapsedH : hudLayout.expandedH;
  let scale = 1;
  let originX = 0;
  let originY = 0;
  let localX = hudLayout.x;
  let localY = hudLayout.y;
  if (canvasWidth > 0 && canvasWidth < localW + hudLayout.x + 8) {
    scale = Math.max(0.62, (canvasWidth - 8) / (localW + 8));
    originX = 4;
    originY = 4;
    localX = 0;
    localY = 0;
  }
  return {
    x: originX + localX * scale,
    y: originY + localY * scale,
    w: localW * scale,
    h: localH * scale,
    scale: scale,
    originX: originX,
    originY: originY,
    localX: localX,
    localY: localY,
    localW: localW,
    localH: localH
  };
}

function hitTestAiHud(pos, canvasWidth) {
  const hud = document.getElementById('ai-status-hud');
  if (hud && hud.closest('.drawer-body')) return false;
  if (typeof showAiDebugHud !== 'undefined' && !showAiDebugHud) return false;
  if (!pos) return false;
  const box = getAiHudBox(canvasWidth);
  return pos.x >= box.x && pos.x <= box.x + box.w && pos.y >= box.y && pos.y <= box.y + box.h;
}

function hudVisMark(score) {
  if (score >= 0.80) return '◎';
  if (score >= 0.50) return '○';
  return '×(隠れ)';
}

function ensureAiStatusHud(el) {
  if (el._ready) return;
  el._ready = true;
  el.innerHTML =
    '<div class="hud-collapsed-line" data-k="collapsed"></div>' +
    '<div class="hud-body">' +
      '<div class="hud-head"><span class="hud-title">🤖 AI認識詳細</span></div>' +
      '<div>状態: <b data-k="status"></b></div>' +
      '<div>処理速度: <b data-k="speed"></b></div>' +
      '<div>3D空間認識: <b data-k="world"></b></div>' +
      '<div>視認性: <span data-k="vis"></span></div>' +
      '<div>骨盤向: <b data-k="pelvis"></b>　胸郭向: <b data-k="thorax"></b></div>' +
      '<div>体幹捻転差: <b data-k="torsion"></b></div>' +
    '</div>';
  el.addEventListener('pointerdown', function(e) {
    if (el.closest('.drawer-body')) return;
    e.preventDefault();
    e.stopPropagation();
    isHudCollapsed = !isHudCollapsed;
    drawAiDiagnosticsHUD();
  });
}

function drawAiDiagnosticsHUD() {
  const el = document.getElementById('ai-status-hud');
  if (!el) return;
  ensureAiStatusHud(el);
  const hidden = (typeof showAiDebugHud !== 'undefined' && !showAiDebugHud) ||
    (typeof scanModeActive !== 'undefined' && scanModeActive);
  if (hidden) {
    el.hidden = true;
    return;
  }
  const diag = (typeof aiDiagnostics !== 'undefined') ? aiDiagnostics : null;
  const status = diag ? diag.status : 'IDLE';
  const latency = diag ? Math.round(diag.latencyMs) : 0;
  const fps = diag ? Math.round(diag.fps) : 0;
  el.hidden = false;
  const inDrawer = !!el.closest('.drawer-body');
  el.classList.toggle('is-collapsed', !inDrawer && !!isHudCollapsed);
  const collapsed = el.querySelector('[data-k="collapsed"]');
  collapsed.textContent = '▼ AIステータス';
  let statusText = '一時停止中 (待機)';
  let statusColor = '#ffd60a';
  if (status === 'RUNNING') {
    statusText = '正常稼働中';
    statusColor = '#30d158';
  } else if (status === 'ERROR') {
    statusText = '処理落ち / エラー';
    statusColor = '#ff3b30';
  }
  const statusEl = el.querySelector('[data-k="status"]');
  statusEl.textContent = statusText;
  statusEl.style.color = statusColor;
  el.querySelector('[data-k="speed"]').textContent = latency + 'ms (' + fps + 'コマ/秒)';
  const worldEl = el.querySelector('[data-k="world"]');
  const hasWorld = !!(diag && diag.hasWorld3D);
  worldEl.textContent = hasWorld ? '良好 (全身33箇所)' : '未検出 / 2Dのみ';
  worldEl.style.color = hasWorld ? '#30d158' : '#ff3b30';
  const vis = (diag && diag.vis) || {};
  el.querySelector('[data-k="vis"]').textContent =
    '左肩' + hudVisMark(vis.leftShoulder || 0) +
    ' 右肩' + hudVisMark(vis.rightShoulder || 0) +
    ' 左腰' + hudVisMark(vis.leftHip || 0) +
    ' 右腰' + hudVisMark(vis.rightHip || 0);
  const pYaw = diag ? diag.pelvisYaw : 0;
  const tYaw = diag ? diag.thoraxYaw : 0;
  const torsion = diag ? diag.torsionDiff : 0;
  const pelvisEl = el.querySelector('[data-k="pelvis"]');
  pelvisEl.textContent = (pYaw >= 0 ? '+' : '') + pYaw.toFixed(1) + '°';
  pelvisEl.style.color = '#007aff';
  const thoraxEl = el.querySelector('[data-k="thorax"]');
  thoraxEl.textContent = (tYaw >= 0 ? '+' : '') + tYaw.toFixed(1) + '°';
  thoraxEl.style.color = '#ff375f';
  const torsionEl = el.querySelector('[data-k="torsion"]');
  torsionEl.textContent = Math.abs(torsion).toFixed(1) + '°';
  torsionEl.style.color = '#ffcc00';
}

var showAiDebugHud = true;
var aiDiagnostics = {
  status: 'IDLE',
  latencyMs: 0,
  fps: 0,
  hasWorld3D: false,
  vis: { leftShoulder: 0, rightShoulder: 0, leftHip: 0, rightHip: 0 },
  pelvisYaw: 0,
  thoraxYaw: 0,
  torsionDiff: 0
};
var _lastInferTime = performance.now();
var _frameCount = 0;
var _fpsTimer = performance.now();

function transverseYawDeg(leftPt, rightPt) {
  if (!leftPt || !rightPt) return 0;
  const dx = rightPt.x - leftPt.x;
  const dz = (rightPt.z || 0) - (leftPt.z || 0);
  if (Math.hypot(dx, dz) < 1e-6) return 0;
  return Math.atan2(dz, dx) * 180 / Math.PI;
}

function wrapAngleDeg(deg) {
  let d = deg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function landmarkVisibility(landmarks, index) {
  const point = landmarks && landmarks[index];
  return point && Number.isFinite(point.visibility) ? point.visibility : 0;
}

function recordAiDiagnostics(results) {
  const now = performance.now();
  aiDiagnostics.latencyMs = Math.max(0, now - _lastInferTime);
  _frameCount += 1;
  const elapsed = now - _fpsTimer;
  if (elapsed >= 250) aiDiagnostics.fps = (_frameCount * 1000) / elapsed;
  if (elapsed >= 1000) {
    _frameCount = 0;
    _fpsTimer = now;
  }
  const world = results && (results.poseWorldLandmarks || results.worldLandmarks);
  aiDiagnostics.hasWorld3D = !!(world && world.length >= 33 && world[11] && world[12] && world[23] && world[24]);
  const landmarks = results && results.poseLandmarks;
  aiDiagnostics.vis.leftShoulder = landmarkVisibility(landmarks, 11);
  aiDiagnostics.vis.rightShoulder = landmarkVisibility(landmarks, 12);
  aiDiagnostics.vis.leftHip = landmarkVisibility(landmarks, 23);
  aiDiagnostics.vis.rightHip = landmarkVisibility(landmarks, 24);
  if (aiDiagnostics.hasWorld3D) {
    aiDiagnostics.pelvisYaw = transverseYawDeg(world[23], world[24]);
    aiDiagnostics.thoraxYaw = transverseYawDeg(world[11], world[12]);
    aiDiagnostics.torsionDiff = wrapAngleDeg(aiDiagnostics.thoraxYaw - aiDiagnostics.pelvisYaw);
  } else {
    aiDiagnostics.pelvisYaw = 0;
    aiDiagnostics.thoraxYaw = 0;
    aiDiagnostics.torsionDiff = 0;
  }
  aiDiagnostics.status = (videoElement.paused || videoElement.ended) ? 'IDLE' : 'RUNNING';
}

function initMediaPipe() {
  if (pose) return Promise.resolve();
  beginAnalysisProgress('model', 'AIモデル初期化中...', '画面を閉じずにお待ちください');
  console.log('[VideoLoad] MediaPipe initialize start');
  var modelTimer = setTimeout(function() {
    console.warn('[VideoLoad] AIモデル初期化がタイムアウトしたため、オーバーレイを解除します');
    endAnalysisProgress('model');
  }, 15000);
  try {
    pose = new Pose({
      locateFile: function(file) { return localPoseUrl(file); }
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65
    });
    pose.onResults(onPoseResults);
    return pose.initialize().then(function() {
      isPoseLoaded = true;
      console.log('[VideoLoad] MediaPipe initialize done');
    }).catch(function(err) {
      console.error('[VideoLoad] MediaPipe Load Error:', err);
    }).finally(function() {
      clearTimeout(modelTimer);
      endAnalysisProgress('model');
    });
  } catch (err) {
    clearTimeout(modelTimer);
    endAnalysisProgress('model');
    console.error('[VideoLoad] MediaPipe Load Error:', err);
    return Promise.reject(err);
  }
}

function processSingleFrame() {
  if (typeof takeCachedPoseFrame === 'function' && takeCachedPoseFrame()) {
    return Promise.resolve();
  }
  if (!isPoseLoaded || isProcessing || !videoElement.videoWidth) {
    renderFrameOnly();
    return Promise.resolve();
  }
  if (!paintPoseInputCanvas()) {
    renderFrameOnly();
    return Promise.resolve();
  }
  isProcessing = true;
  _lastInferTime = performance.now();
  if (!processSingleFrame._logged) {
    processSingleFrame._logged = true;
    console.log('[VideoLoad] MediaPipe inference start');
  }
  return pose.send({ image: bufferCanvas }).catch(function(err) {
    console.error('Inference Error:', err);
    aiDiagnostics.status = 'ERROR';
    aiDiagnostics.latencyMs = Math.max(0, performance.now() - _lastInferTime);
    if (showAiDebugHud && !scanModeActive && outputCanvas.width > 0) drawAiDiagnosticsHUD(outputCtx);
  }).finally(function() {
    isProcessing = false;
  });
}

function onPoseResults(results) {
  recordAiDiagnostics(results);
  if (scanModeActive) {
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;
      const NOSE = landmarks[0];
      const L_HEEL = landmarks[29] || landmarks[27];
      const R_HEEL = landmarks[30] || landmarks[28];
      if (NOSE && L_HEEL && R_HEEL) {
        tuneRuler.isActive = true;
        tuneRuler.topYNorm = Math.max(0.02, NOSE.y - 0.08);
        tuneRuler.bottomYNorm = Math.min(0.98, Math.max(L_HEEL.y, R_HEEL.y));
        tuneRuler.centerXNorm = NOSE.x;
        btnScanNextStep.style.display = 'block';
        var guide = MotionPlayerCore.config && MotionPlayerCore.config.scanGuideHtml;
        scanGuideText.innerHTML = guide || '🎯 <b>AIが検知したよ！</b> ズレがあれば<b>丸いハンドルを上下にドラッグ</b>して合わせてね！';
        renderScanFrame();
      }
    }
    return;
  }

  const b = beginAnalysisCanvas();
  if (!b) {
    drawAiDiagnosticsHUD(outputCtx);
    return;
  }
  if (typeof poseApplyMetrics !== 'undefined' && !poseApplyMetrics) {
    if (results.poseLandmarks && typeof rememberPoseLandmarks === 'function') {
      rememberPoseLandmarks(results.poseLandmarks);
    }
    if (results.poseLandmarks && typeof paintGhostSkeletons === 'function') {
      paintGhostSkeletons(outputCtx, b.x, b.y, b.w, b.h);
      if ((typeof isSkeletonVisible === 'undefined' || isSkeletonVisible) && typeof paintLiveSkeleton === 'function') {
        paintLiveSkeleton(outputCtx, results.poseLandmarks, b.x, b.y, b.w, b.h);
      }
    }
    if (results.poseLandmarks && typeof storeCurrentPose === 'function') storeCurrentPose(false);
    else if (typeof markPoseFrameVisited === 'function') markPoseFrameVisited();
    endAnalysisCanvas();
    return;
  }
  if (results.poseLandmarks) {
    MotionPlayerCore.applyBiomechanics(results.poseLandmarks, b);
    if (typeof storeCurrentPose === 'function') storeCurrentPose(true);
  } else if (typeof markPoseFrameVisited === 'function') {
    markPoseFrameVisited();
  }
  endAnalysisCanvas();
}

function renderLoop() {
  if (typeof startFrameAccuratePlayback === 'function' && !analysisTransportPlaying) {
    startFrameAccuratePlayback();
  }
}
