// 打撃と投球で共有する動画・キャッシュ・ドロワー・キャンバス。
// 指標と診断は MotionPlayerCore.init(config) で注入する。

var MotionPlayerCore = {
  config: null,
  init: function(config) {
    this.config = config || {};
    if (document.documentElement) {
      document.documentElement.dataset.motionMode = this.config.mode || '';
      document.documentElement.dataset.theme = this.config.accentTheme || this.config.mode || '';
    }
    (this.config.keyPoints || []).forEach(function(point) {
      if (!point || !point.buttonId || !point.label) return;
      var button = document.getElementById(point.buttonId);
      if (button) button.textContent = point.label;
    });
    bootMotionShell();
  },
  applyBiomechanics: function(landmarks, bounds) {
    var cfg = this.config || {};
    if (typeof cfg.calculateMetrics === 'function') {
      return cfg.calculateMetrics(landmarks, bounds && bounds.frameIndex, bounds);
    }
    var calculator = cfg.metricsCalculator;
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

function themeColor(token, fallback) {
  var raw = getComputedStyle(document.documentElement).getPropertyValue(token);
  raw = raw ? raw.trim() : '';
  return raw || fallback;
}

function scanPaintStyle() {
  var cfg = MotionPlayerCore.config || {};
  var solid = cfg.scanAccent;
  var soft = cfg.scanAccentSoft;
  if (!solid || solid.indexOf('var(') === 0) solid = themeColor('--primary-accent', '#2563eb');
  if (!soft || soft.indexOf('var(') === 0) soft = themeColor('--badge-bg', 'rgba(37, 99, 235, 0.2)');
  return {
    soft: soft,
    solid: solid,
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

var videoElement;
var bufferCanvas;
var bufferCtx;
var scanCanvas;
var scanCtx;
var outputCanvas;
var outputCtx;
var pose = null;
var isPoseLoaded = false;
var isProcessing = false;
var animationFrameId = null;
var scanModeActive = false;
var playerName = '選手';
var userHeightCm = 140;
var selectedBatSide = 'RIGHT';
var selectedThrowArm = 'LEFT';
var videoFileUrl = null;
var selectedAngleMode = 'SIDE';
var isSkeletonVisible = true;
var tuneRuler = { isActive: false, topYNorm: 0.2, bottomYNorm: 0.8, centerXNorm: 0.5 };
var activeDragHandle = null;
var dragStartY = 0;
var snapTop = 0;
var snapBottom = 0;
var zoomScale = 1.0;
var zoomPan = { x: 0, y: 0 };
var initialPinchDistance = 0;
var initialZoomScale = 1.0;
var isPanning = false;
var panStart = { x: 0, y: 0 };
var panSnapshot = { x: 0, y: 0 };
var initialNoseX = null;
var initialNoseY = null;
var manualToeOffsetDeg = 0;
var isDraggingToe = false;
var toeDragOrigin = { x: 0, y: 0 };
var smoothToeDeg = 0;
var prevLeadToeY = null;
var leadFootFlatStationaryCount = 0;
var manualReleaseTime = null;
var lastCalculatedLeadToePt = null;
var currentCalculatedState = {};
var records = {};
var stepViews;
var stepPills;
var c1Title, c1Val, c1Max, c2Title, c2Val, c2Max, c3Title, c3Val, c3Max;
var c4Title, c4Val, c4Max, c5Title, c5Val, c5Max, c6Title, c6Val, c6Max;
var c7Title, c7Val, c7Max, c8Title, c8Val, c8Max, c9Title, c9Val, c9Max, c10Title, c10Val, c10Max;
var angleModeBadge, playerTagBadge, scanSeekBar, scanTimeDisp, seekBar, timeDisp, btnPlayPause;
var zoomBadge, aiLoading, scanLoading, btnScanNextStep, scanGuideText;
var carteModal, btnCloseCarte, carteHistoryList, playerSelectFilter, btnDeleteAction, toastBox;
var toastTimeout = null;
var skipNativePicker = false;
var pendingCaptureMode = 'SIDE';
var inputCapture = null;
var STORAGE_KEY = 'motion_records';
var shellBound = false;

function cardTriplet(prefix) {
  return {
    title: document.getElementById(prefix + '-title'),
    val: document.getElementById(prefix + '-val'),
    max: document.getElementById(prefix + '-max')
  };
}

function bootMotionShell() {
  if (shellBound) return;
  shellBound = true;
  var cfg = MotionPlayerCore.config || {};
  STORAGE_KEY = cfg.storageKey || STORAGE_KEY;
  playerName = cfg.defaultPlayerName || playerName;
  if (typeof createMotionState === 'function') currentCalculatedState = createMotionState();
  if (typeof createMotionRecords === 'function') records = createMotionRecords();

  videoElement = document.getElementById('hidden-video');
  if (typeof installFrameProbe === 'function') installFrameProbe();
  bufferCanvas = document.getElementById('buffer-canvas');
  bufferCtx = bufferCanvas.getContext('2d', { willReadFrequently: true });
  scanCanvas = document.getElementById('scan-canvas');
  scanCtx = scanCanvas.getContext('2d');
  outputCanvas = document.getElementById('output-canvas');
  outputCtx = outputCanvas.getContext('2d');

  stepViews = {
    1: document.getElementById('view-step1'),
    2: document.getElementById('view-step2'),
    3: document.getElementById('view-step3'),
    4: document.getElementById('view-step4')
  };
  stepPills = {
    1: document.getElementById('step-nav-1'),
    2: document.getElementById('step-nav-2'),
    3: document.getElementById('step-nav-3')
  };
  var cards = ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10'];
  cards.forEach(function(name) {
    var node = cardTriplet(name);
    if (name === 'c1') { c1Title = node.title; c1Val = node.val; c1Max = node.max; }
    if (name === 'c2') { c2Title = node.title; c2Val = node.val; c2Max = node.max; }
    if (name === 'c3') { c3Title = node.title; c3Val = node.val; c3Max = node.max; }
    if (name === 'c4') { c4Title = node.title; c4Val = node.val; c4Max = node.max; }
    if (name === 'c5') { c5Title = node.title; c5Val = node.val; c5Max = node.max; }
    if (name === 'c6') { c6Title = node.title; c6Val = node.val; c6Max = node.max; }
    if (name === 'c7') { c7Title = node.title; c7Val = node.val; c7Max = node.max; }
    if (name === 'c8') { c8Title = node.title; c8Val = node.val; c8Max = node.max; }
    if (name === 'c9') { c9Title = node.title; c9Val = node.val; c9Max = node.max; }
    if (name === 'c10') { c10Title = node.title; c10Val = node.val; c10Max = node.max; }
  });
  angleModeBadge = document.getElementById('angle-mode-badge');
  playerTagBadge = document.getElementById('player-tag-badge');
  scanSeekBar = document.getElementById('scan-seek-bar');
  scanTimeDisp = document.getElementById('scan-time-disp');
  seekBar = document.getElementById('seek-bar');
  timeDisp = document.getElementById('time-disp');
  btnPlayPause = document.getElementById('btn-play-pause');
  zoomBadge = document.getElementById('zoom-badge');
  aiLoading = document.getElementById('ai-loading');
  scanLoading = document.getElementById('scan-loading');
  btnScanNextStep = document.getElementById('btn-scan-next-step');
  scanGuideText = document.getElementById('scan-guide-text');
  carteModal = document.getElementById('carte-modal');
  btnCloseCarte = document.getElementById('btn-close-carte');
  carteHistoryList = document.getElementById('carte-history-list');
  playerSelectFilter = document.getElementById('player-select-filter');
  btnDeleteAction = document.getElementById('btn-delete-action');
  toastBox = document.getElementById('toast-box');
  inputCapture = document.getElementById('video-input-capture');

  var home = document.getElementById('home-link-btn');
  if (home) home.addEventListener('click', function(e) {
    e.preventDefault();
    if (typeof stopFrameAccuratePlayback === 'function') stopFrameAccuratePlayback();
    if (videoElement) videoElement.pause();
    window.location.href = '../index.html';
  });

  var skeletonBtn = document.getElementById('btn-toggle-skeleton');
  if (skeletonBtn) skeletonBtn.addEventListener('click', function() {
    isSkeletonVisible = !isSkeletonVisible;
    if (typeof syncPoseOverlayButtons === 'function') syncPoseOverlayButtons();
    processSingleFrame();
  });
  var hudBtn = document.getElementById('btn-toggle-ai-hud');
  if (hudBtn) hudBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleAiDebugHud();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'd' && e.key !== 'D') return;
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    toggleAiDebugHud();
  });

  stepPills[1].addEventListener('click', function() {
    videoElement.pause();
    tuneRuler.isActive = false;
    btnScanNextStep.style.display = 'none';
    setStep(1);
  });
  stepPills[2].addEventListener('click', function() {
    if (!videoFileUrl) return;
    videoElement.pause();
    setStep(2);
    setTimeout(function() { updateScanScreenSize(); renderScanFrame(); }, 100);
  });
  stepPills[3].addEventListener('click', function() {
    if (!videoFileUrl) return;
    videoElement.pause();
    setStep(3);
  });

  var inputSide = document.getElementById('video-input-side');
  var inputFront = document.getElementById('video-input-front');
  inputSide.addEventListener('click', function(e) {
    this.value = null;
    if (skipNativePicker) { skipNativePicker = false; return; }
    if (openVideoLibrary('SIDE', this)) e.preventDefault();
  });
  inputFront.addEventListener('click', function(e) {
    this.value = null;
    if (skipNativePicker) { skipNativePicker = false; return; }
    if (openVideoLibrary('FRONT', this)) e.preventDefault();
  });
  inputSide.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) handleVideoLoad(e.target.files[0], 'SIDE');
  });
  inputFront.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) handleVideoLoad(e.target.files[0], 'FRONT');
  });
  document.getElementById('btn-capture-side').addEventListener('click', function() { openVideoCapture('SIDE'); });
  document.getElementById('btn-capture-front').addEventListener('click', function() { openVideoCapture('FRONT'); });
  if (inputCapture) {
    inputCapture.addEventListener('click', function() { this.value = null; });
    inputCapture.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) handleVideoLoad(e.target.files[0], pendingCaptureMode);
    });
  }
  inputSide.addEventListener('click', function() {
    if (typeof nativePrepareCapture === 'function') nativePrepareCapture();
  }, true);
  inputFront.addEventListener('click', function() {
    if (typeof nativePrepareCapture === 'function') nativePrepareCapture();
  }, true);

  scanCanvas.addEventListener('mousedown', onScanPointerDown);
  scanCanvas.addEventListener('mousemove', onScanPointerMove);
  window.addEventListener('mouseup', onScanPointerUp);
  scanCanvas.addEventListener('touchstart', onScanPointerDown, { passive: true });
  scanCanvas.addEventListener('touchmove', onScanPointerMove, { passive: true });
  window.addEventListener('touchend', onScanPointerUp);
  scanSeekBar.addEventListener('input', function() {
    if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
    videoElement.currentTime = (scanSeekBar.value / 100) * videoElement.duration;
    tuneRuler.isActive = false;
    btnScanNextStep.style.display = 'none';
    renderScanFrame();
  });
  document.getElementById('btn-scan-prev').addEventListener('click', function() {
    videoElement.currentTime = Math.max(0, videoElement.currentTime - 0.033);
    tuneRuler.isActive = false;
    btnScanNextStep.style.display = 'none';
    renderScanFrame();
  });
  document.getElementById('btn-scan-next').addEventListener('click', function() {
    videoElement.currentTime = Math.min(videoElement.duration || 0, videoElement.currentTime + 0.033);
    tuneRuler.isActive = false;
    btnScanNextStep.style.display = 'none';
    renderScanFrame();
  });
  document.getElementById('btn-scan-action').addEventListener('click', async function() {
    beginAnalysisProgress('scan', '関節座標を計算中...', '画面を閉じずにお待ちください');
    scanModeActive = true;
    bufferCanvas.width = videoElement.videoWidth;
    bufferCanvas.height = videoElement.videoHeight;
    bufferCtx.drawImage(videoElement, 0, 0, bufferCanvas.width, bufferCanvas.height);
    try { await pose.send({ image: bufferCanvas }); }
    catch (err) { console.error('Scan Error:', err); }
    finally { scanModeActive = false; endAnalysisProgress('scan'); }
  });
  btnScanNextStep.addEventListener('click', function() { setStep(3); });
  document.getElementById('btn-re-scan').addEventListener('click', function() {
    tuneRuler.isActive = false;
    btnScanNextStep.style.display = 'none';
    setStep(2);
    setTimeout(function() { updateScanScreenSize(); renderScanFrame(); }, 100);
  });
  document.getElementById('btn-start-analysis').addEventListener('click', function() {
    var pName = document.getElementById('player-name-input').value.trim();
    playerName = pName || (cfg.defaultPlayerName || '選手');
    var hVal = parseFloat(document.getElementById('height-input').value);
    userHeightCm = (Number.isFinite(hVal) && hVal >= 80 && hVal <= 220) ? hVal : 140;
    playerTagBadge.textContent = '👤 ' + playerName + ' (' + userHeightCm + 'cm)';
    if (typeof onStartAnalysis === 'function') onStartAnalysis();
    setStep(4);
    setTimeout(function() {
      resetWorkspaceDimensions();
      beginAnalysisProgress('frame', '関節座標を計算中...', '画面を閉じずにお待ちください');
      Promise.resolve(processSingleFrame()).finally(function() { endAnalysisProgress('frame'); });
    }, 150);
  });

  window.addEventListener('resize', syncCanvasToViewport);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', syncCanvasToViewport);
  outputCanvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var next = Math.max(1.0, Math.min(5.0, zoomScale * (e.deltaY < 0 ? 1.15 : 0.85)));
    if (next === 1.0) zoomPan = { x: 0, y: 0 };
    zoomScale = next;
    updateZoomBadge();
    processSingleFrame();
  }, { passive: false });
  outputCanvas.addEventListener('touchstart', onOutputTouchStart, { passive: true });
  outputCanvas.addEventListener('touchmove', onOutputTouchMove, { passive: true });
  outputCanvas.addEventListener('touchend', onOutputTouchEnd, { passive: true });
  outputCanvas.addEventListener('pointerdown', onCanvasPointerDown);
  outputCanvas.addEventListener('pointermove', onHudPointerMove);
  document.getElementById('btn-zoom-reset').addEventListener('click', function() {
    zoomScale = 1.0;
    zoomPan = { x: 0, y: 0 };
    if (typeof onZoomReset === 'function') onZoomReset();
    updateZoomBadge();
    processSingleFrame();
  });
  document.getElementById('btn-save-record').addEventListener('click', saveCurrentRecord);
  document.getElementById('btn-open-carte').addEventListener('click', openCarteModal);
  document.getElementById('btn-open-carte-top').addEventListener('click', openCarteModal);
  btnCloseCarte.addEventListener('click', closeCarteModal);
  playerSelectFilter.addEventListener('change', function() { renderCarteList(false); });
  btnDeleteAction.addEventListener('click', deleteFilteredCartes);
  document.getElementById('btn-export-csv').addEventListener('click', exportCarteCsv);
  videoElement.addEventListener('play', updatePlayState);
  videoElement.addEventListener('pause', updatePlayState);
  videoElement.addEventListener('ended', updatePlayState);
  videoElement.addEventListener('seeked', function() {
    if (typeof probingFrameRate !== 'undefined' && probingFrameRate) return;
    if (typeof frameSeekLoopActive !== 'undefined' && frameSeekLoopActive) return;
    if (stepViews[2].classList.contains('active')) { paintScanPreview(); return; }
    if (stepViews[4].classList.contains('active')) processSingleFrame();
  });
  btnPlayPause.addEventListener('click', function(e) {
    e.stopPropagation();
    if (typeof nativeHaptic === 'function') nativeHaptic('LIGHT');
    if (typeof analysisTransportPlaying !== 'undefined' && analysisTransportPlaying) {
      stopFrameAccuratePlayback();
      videoElement.pause();
      return;
    }
    if (!videoElement.paused) { videoElement.pause(); return; }
    startFrameAccuratePlayback();
  });
  seekBar.addEventListener('input', function() {
    if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
    if (typeof stopFrameAccuratePlayback === 'function') stopFrameAccuratePlayback();
    videoElement.pause();
    videoElement.currentTime = (seekBar.value / 100) * videoElement.duration;
    updateTimeUI();
  });
  document.getElementById('btn-frame-prev').addEventListener('click', function(e) {
    e.stopPropagation();
    stepFrame(-1);
  });
  document.getElementById('btn-frame-next').addEventListener('click', function(e) {
    e.stopPropagation();
    stepFrame(1);
  });
  document.getElementById('btn-reset-max').addEventListener('click', function() {
    if (typeof resetMotionRecords === 'function') records = resetMotionRecords();
    if (typeof onResetAnalysis === 'function') onResetAnalysis();
    if (typeof clearGhostCache === 'function') clearGhostCache();
    if (typeof updateDrawerKeyBadge === 'function') updateDrawerKeyBadge();
    if (typeof showWaitingHeroes === 'function') showWaitingHeroes();
  });
  document.getElementById('btn-re-select').addEventListener('click', function() {
    videoElement.pause();
    tuneRuler.isActive = false;
    btnScanNextStep.style.display = 'none';
    zoomScale = 1.0;
    zoomPan = { x: 0, y: 0 };
    if (typeof onReselectVideo === 'function') onReselectVideo();
    if (typeof clearGhostCache === 'function') clearGhostCache();
    updateZoomBadge();
    setStep(1);
  });
  if (typeof bindModeExtras === 'function') bindModeExtras();
}

function showToast(text) {
  if (!toastBox) { alert(text); return; }
  if (toastTimeout) clearTimeout(toastTimeout);
  toastBox.textContent = text;
  toastBox.classList.add('show');
  toastTimeout = setTimeout(function() { toastBox.classList.remove('show'); }, 2500);
}

function paintHero(el, tag, value, locked) {
  if (!el) return;
  var safeTag = String(tag).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var safeVal = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  el.innerHTML = '<span class="phase-tag">' + safeTag + '</span><span class="phase-num">' + safeVal + '</span>';
  el.classList.toggle('is-locked', !!locked);
}

function updateAiHudButton() {
  var btn = document.getElementById('btn-toggle-ai-hud');
  if (!btn) return;
  btn.textContent = showAiDebugHud ? '🤖 AI認識ステータス' : '🤖 AI認識ステータス（非表示）';
  btn.classList.toggle('is-off', !showAiDebugHud);
}

function toggleAiDebugHud() {
  showAiDebugHud = !showAiDebugHud;
  updateAiHudButton();
  drawAiDiagnosticsHUD(outputCtx);
}

function setStep(stepNum) {
  if (stepNum !== 4 && typeof stopFrameAccuratePlayback === 'function') stopFrameAccuratePlayback();
  Object.keys(stepViews).forEach(function(s) { stepViews[s].classList.remove('active'); });
  if (stepViews[stepNum]) stepViews[stepNum].classList.add('active');
  Object.keys(stepPills).forEach(function(s) { stepPills[s].classList.remove('active'); });
  if (stepNum <= 3 && stepPills[stepNum]) stepPills[stepNum].classList.add('active');
  else if (stepNum === 4 && stepPills[3]) stepPills[3].classList.add('active');
  if (typeof drawAiDiagnosticsHUD === 'function') drawAiDiagnosticsHUD();
}

function openVideoCapture(angleMode) {
  var ready = (typeof nativePrepareCapture === 'function') ? nativePrepareCapture() : Promise.resolve();
  Promise.resolve(ready).then(function() {
    if (typeof nativeRecordVideo === 'function' && typeof nativePlatform === 'function' && nativePlatform()) {
      return nativeRecordVideo().then(function(src) {
        if (src) { openMeasurementVideo(src, angleMode); return; }
        pendingCaptureMode = angleMode;
        if (inputCapture) inputCapture.click();
      });
    }
    pendingCaptureMode = angleMode;
    if (inputCapture) inputCapture.click();
  });
}

function openVideoLibrary(angleMode, input) {
  if (!(typeof nativePickVideo === 'function' && typeof nativePlatform === 'function' && nativePlatform())) return false;
  nativePickVideo().then(function(src) {
    if (src) openMeasurementVideo(src, angleMode);
    else if (input) { skipNativePicker = true; input.click(); }
  });
  return true;
}

function getCanvasPoint(evt, canvas) {
  var rect = canvas.getBoundingClientRect();
  var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  var clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function onScanPointerDown(e) {
  if (!tuneRuler.isActive) return;
  var pt = getCanvasPoint(e, scanCanvas);
  var b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, scanCanvas.width, scanCanvas.height);
  var topY = b.y + tuneRuler.topYNorm * b.h;
  var bottomY = b.y + tuneRuler.bottomYNorm * b.h;
  var centerX = b.x + tuneRuler.centerXNorm * b.w;
  if (Math.abs(pt.y - topY) <= 30 && Math.abs(pt.x - centerX) <= 65) activeDragHandle = 'top';
  else if (Math.abs(pt.y - bottomY) <= 30 && Math.abs(pt.x - centerX) <= 65) activeDragHandle = 'bottom';
  else if (pt.y > topY && pt.y < bottomY && Math.abs(pt.x - centerX) <= 40) activeDragHandle = 'both';
  dragStartY = pt.y;
  snapTop = tuneRuler.topYNorm;
  snapBottom = tuneRuler.bottomYNorm;
}

function onScanPointerMove(e) {
  if (!activeDragHandle || !tuneRuler.isActive) return;
  var pt = getCanvasPoint(e, scanCanvas);
  var b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, scanCanvas.width, scanCanvas.height);
  var dNormY = (pt.y - dragStartY) / b.h;
  if (activeDragHandle === 'top') tuneRuler.topYNorm = Math.min(tuneRuler.bottomYNorm - 0.1, Math.max(0.01, snapTop + dNormY));
  else if (activeDragHandle === 'bottom') tuneRuler.bottomYNorm = Math.max(tuneRuler.topYNorm + 0.1, Math.min(0.99, snapBottom + dNormY));
  else if (activeDragHandle === 'both') {
    var heightNorm = snapBottom - snapTop;
    var newTop = Math.max(0.01, Math.min(0.99 - heightNorm, snapTop + dNormY));
    tuneRuler.topYNorm = newTop;
    tuneRuler.bottomYNorm = newTop + heightNorm;
  }
  renderScanFrame();
}

function onScanPointerUp() { activeDragHandle = null; }

function syncCanvasToViewport() {
  if (stepViews[4].classList.contains('active')) {
    resetWorkspaceDimensions();
    processSingleFrame();
  } else if (stepViews[2].classList.contains('active')) {
    updateScanScreenSize();
    renderScanFrame();
  }
}

function updateZoomBadge() {
  if (zoomBadge) zoomBadge.textContent = '🔍 ' + zoomScale.toFixed(1) + 'x (ピンチ可)';
}

function getCanvasTouchPos(e) {
  var rect = outputCanvas.getBoundingClientRect();
  var clientX = e.clientX;
  var clientY = e.clientY;
  if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
  else if (e.changedTouches && e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }
  return {
    x: (clientX - rect.left) * (outputCanvas.width / (rect.width || 1)),
    y: (clientY - rect.top) * (outputCanvas.height / (rect.height || 1))
  };
}

function isPointOnAiHud(e) {
  if (typeof showAiDebugHud !== 'undefined' && !showAiDebugHud) return false;
  if (typeof hitTestAiHud !== 'function') return false;
  return hitTestAiHud(getCanvasTouchPos(e), outputCanvas.width);
}

function onOutputTouchStart(e) {
  if (e.touches.length === 1 && isPointOnAiHud(e)) return;
  if (typeof onCanvasTouchStart === 'function' && onCanvasTouchStart(e)) return;
  if (e.touches.length === 2) {
    initialPinchDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    initialZoomScale = zoomScale;
  } else if (e.touches.length === 1 && zoomScale > 1.0) {
    isPanning = true;
    panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    panSnapshot = { x: zoomPan.x, y: zoomPan.y };
  }
}

function onOutputTouchMove(e) {
  if (e.touches.length === 2 && initialPinchDistance > 0) {
    var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    zoomScale = Math.max(1.0, Math.min(5.0, initialZoomScale * (dist / initialPinchDistance)));
    if (zoomScale === 1.0) zoomPan = { x: 0, y: 0 };
    updateZoomBadge();
    processSingleFrame();
  } else if (e.touches.length === 1) {
    if (typeof onCanvasTouchMove === 'function' && onCanvasTouchMove(e)) return;
    if (isPanning && zoomScale > 1.0) {
      zoomPan.x = panSnapshot.x + (e.touches[0].clientX - panStart.x);
      zoomPan.y = panSnapshot.y + (e.touches[0].clientY - panStart.y);
      processSingleFrame();
    }
  }
}

function onOutputTouchEnd(e) {
  if (e.touches.length < 2) initialPinchDistance = 0;
  if (e.touches.length === 0) {
    isPanning = false;
    isDraggingToe = false;
  }
}

function onCanvasPointerDown(e) {
  if (typeof e.button === 'number' && e.button !== 0) return;
  if (!isPointOnAiHud(e)) return;
  e.preventDefault();
  e.stopPropagation();
  if (typeof isHudCollapsed !== 'undefined') isHudCollapsed = !isHudCollapsed;
  if (typeof renderFrameOnly === 'function') renderFrameOnly();
}

function onHudPointerMove(e) {
  if (e.pointerType === 'mouse') outputCanvas.style.cursor = isPointOnAiHud(e) ? 'pointer' : '';
}

function getSavedRecords() {
  try {
    var data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveCurrentRecord() {
  var allRecords = getSavedRecords();
  var now = new Date();
  var adviceEntry = snapshotAdviceEntry();
  var cfg = MotionPlayerCore.config || {};
  var entry = {
    id: Date.now(),
    date: now.getFullYear() + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + String(now.getDate()).padStart(2, '0'),
    time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
    playerName: playerName,
    height: userHeightCm,
    mode: adviceEntry.mode,
    feelGrade: cfg.defaultFeel || '',
    bodyCondition: cfg.defaultBody || '',
    playerNote: '',
    metrics: adviceEntry.metrics
  };
  if (typeof decorateSavedRecord === 'function') decorateSavedRecord(entry);
  allRecords.unshift(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
    if (typeof nativeHapticSuccess === 'function') nativeHapticSuccess();
    var savedText = (typeof cfg.savedMessage === 'function')
      ? cfg.savedMessage(playerName)
      : (cfg.savedMessage || ('✅ ' + playerName + '君の測定データをカルテに保存しました！'));
    notifyUser(savedText);
  } catch (err) {
    notifyUser('⚠️ 保存容量がいっぱいです');
  }
}

function openCarteModal() {
  renderCarteList(true);
  carteModal.style.display = 'flex';
}

function closeCarteModal() { carteModal.style.display = 'none'; }

MotionPlayerCore.bindCarteInteractions = function() {
  carteHistoryList.querySelectorAll('.choice-chip').forEach(function(chip) {
    chip.addEventListener('click', function(e) {
      var parent = e.currentTarget.parentElement;
      var type = parent.getAttribute('data-type');
      var groupKey = parent.getAttribute('data-group');
      var val = e.currentTarget.getAttribute('data-val');
      parent.querySelectorAll('.choice-chip').forEach(function(c) { c.classList.remove('active'); });
      e.currentTarget.classList.add('active');
      var allRecs = getSavedRecords();
      allRecs.forEach(function(item) {
        if (item.playerName + '_' + item.date === groupKey) {
          if (type === 'feel') item.feelGrade = val;
          if (type === 'body') item.bodyCondition = val;
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecs));
    });
  });
  carteHistoryList.querySelectorAll('.player-textarea').forEach(function(textarea) {
    textarea.addEventListener('input', function(e) {
      var groupKey = e.currentTarget.getAttribute('data-group');
      var allRecs = getSavedRecords();
      allRecs.forEach(function(item) {
        if (item.playerName + '_' + item.date === groupKey) item.playerNote = e.currentTarget.value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecs));
    });
  });
  carteHistoryList.querySelectorAll('.btn-share-line').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      shareRecordToLine(e.currentTarget.getAttribute('data-group'));
    });
  });
  carteHistoryList.querySelectorAll('.btn-item-delete').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var groupKey = e.currentTarget.getAttribute('data-group');
      if (typeof deleteCarteGroup === 'function') {
        deleteCarteGroup(groupKey);
        return;
      }
      var allRecords = getSavedRecords().filter(function(r) { return r.playerName + '_' + r.date !== groupKey; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
      notifyUser('🗑️ カルテを1件削除しました');
      renderCarteList(false);
    });
  });
};

function notifyUser(text) {
  var cfg = MotionPlayerCore.config || {};
  if (cfg.notify === 'alert' || !toastBox) alert(text);
  else showToast(text);
}

function deleteFilteredCartes() {
  var selectedFilter = playerSelectFilter.value;
  var allRecords = getSavedRecords();
  if (allRecords.length === 0) return;
  var cfg = MotionPlayerCore.config || {};
  if (selectedFilter === 'ALL') {
    if (cfg.confirmBulkDelete && !confirm('⚠️ 【注意】すべての選手のカルテデータを完全に初期化しますか？')) return;
    localStorage.removeItem(STORAGE_KEY);
    if (!cfg.confirmBulkDelete) notifyUser('⚠️ 全カルテを初期化しました');
  } else {
    if (cfg.confirmBulkDelete && !confirm('👤 ' + selectedFilter + ' 選手のすべての測定データを削除しますか？')) return;
    allRecords = allRecords.filter(function(r) { return r.playerName !== selectedFilter; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
    if (!cfg.confirmBulkDelete) notifyUser('👤 ' + selectedFilter + ' 選手のデータを削除しました');
  }
  renderCarteList(false);
}

function exportCarteCsv() {
  var allRecords = getSavedRecords();
  if (allRecords.length === 0 || typeof buildCsvDocument !== 'function') {
    notifyUser('保存されたデータがありません');
    return;
  }
  var csv = buildCsvDocument(allRecords);
  if (!csv) { notifyUser('保存されたデータがありません'); return; }
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  var cfg = MotionPlayerCore.config || {};
  link.href = url;
  link.download = (cfg.csvPrefix || 'karte') + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function updatePlayState() {
  if (typeof probingFrameRate !== 'undefined' && probingFrameRate) return;
  if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
  var cfg = MotionPlayerCore.config || {};
  var playing = (typeof analysisTransportPlaying !== 'undefined' && analysisTransportPlaying) || !videoElement.paused;
  if (!playing) {
    btnPlayPause.textContent = '再生';
    btnPlayPause.style.background = cfg.playIdleGradient || 'linear-gradient(135deg, var(--primary-accent), var(--primary-accent-strong))';
    if (aiDiagnostics.status !== 'ERROR') aiDiagnostics.status = 'IDLE';
    if (showAiDebugHud && !scanModeActive && outputCanvas.width > 0) drawAiDiagnosticsHUD(outputCtx);
  } else {
    btnPlayPause.textContent = '停止';
    btnPlayPause.style.background = cfg.playActiveGradient || 'linear-gradient(135deg, #0284c7, #0369a1)';
  }
}

function updateTimeUI() {
  if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
  seekBar.value = (videoElement.currentTime / videoElement.duration) * 100;
  timeDisp.textContent = videoElement.currentTime.toFixed(2) + ' / ' + videoElement.duration.toFixed(2);
  if (typeof updateReleaseMarker === 'function') updateReleaseMarker();
}

function stepFrame(direction) {
  if (typeof nativeHaptic === 'function') nativeHaptic('LIGHT');
  if (typeof stopFrameAccuratePlayback === 'function') stopFrameAccuratePlayback();
  videoElement.pause();
  var step = (typeof analysisFrameDuration === 'number' && analysisFrameDuration > 0) ? analysisFrameDuration : 0.033;
  var next = videoElement.currentTime + direction * step;
  videoElement.currentTime = direction < 0 ? Math.max(0, next) : Math.min(videoElement.duration || 0, next);
  updateTimeUI();
}
