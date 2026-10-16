// MediaPipe Pose の初期化・設定・推論ループ

var showAiDebugHud = true;

var aiDiagnostics = {
  status: 'IDLE',
  latencyMs: 0,
  fps: 0,
  hasWorld3D: false,
  vis: {
    leftShoulder: 0,
    rightShoulder: 0,
    leftHip: 0,
    rightHip: 0
  },
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
  if (elapsed >= 250) {
    aiDiagnostics.fps = (_frameCount * 1000) / elapsed;
  }
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
  scanLoading.style.display = 'flex';
  aiLoading.style.display = 'flex';

  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  pose.setOptions({
    modelComplexity: 2,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.15,
    minTrackingConfidence: 0.15
  });

  pose.onResults(onPoseResults);
  return pose.initialize().then(() => {
    isPoseLoaded = true;
    scanLoading.style.display = 'none';
    aiLoading.style.display = 'none';
  }).catch(err => {
    console.error("MediaPipe Load Error:", err);
    scanLoading.style.display = 'none';
    aiLoading.style.display = 'none';
  });
}

function processSingleFrame() {
  if (!isPoseLoaded || isProcessing || !videoElement.videoWidth) {
    renderFrameOnly();
    return;
  }

  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;
  bufferCanvas.width = vw;
  bufferCanvas.height = vh;
  bufferCtx.drawImage(videoElement, 0, 0, vw, vh);

  isProcessing = true;
  _lastInferTime = performance.now();
  pose.send({ image: bufferCanvas }).catch(err => {
    console.error("Inference Error:", err);
    aiDiagnostics.status = 'ERROR';
    aiDiagnostics.latencyMs = Math.max(0, performance.now() - _lastInferTime);
    if (showAiDebugHud && !scanModeActive && outputCanvas.width > 0) {
      drawAiDiagnosticsHUD(outputCtx);
    }
  }).finally(() => {
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
        scanGuideText.innerHTML = "🎯 <b>AIが検知したよ！</b> ズレがあれば<b>丸いハンドルを上下にドラッグ</b>して合わせてね！";
        renderScanFrame();
      }
    }
    return;
  }

  const b = beginAnalysisCanvas();
  if (!b) return;

  if (results.poseLandmarks) {
    applyBattingBiomechanics(results.poseLandmarks, b);
  }

  endAnalysisCanvas();
}

function renderLoop() {
  if (!videoElement.paused && !videoElement.ended) {
    processSingleFrame();
    updateTimeUI();
    animationFrameId = requestAnimationFrame(renderLoop);
  }
}
