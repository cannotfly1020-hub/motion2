// MediaPipe Pose の初期化・設定・推論ループ

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
  pose.send({ image: bufferCanvas }).catch(err => {
    console.error("Inference Error:", err);
  }).finally(() => {
    isProcessing = false;
  });
}

function onPoseResults(results) {
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
        scanGuideText.innerHTML = "🎯 <b>AIが検知したよ！</b> ズレがあれば<b>丸いハンドルを上下にドラッグ</b>して頭と足元にピッタリ合わせてね！";
        renderScanFrame();
      }
    }
    return;
  }

  const b = beginAnalysisCanvas();
  if (!b) return;

  if (results.poseLandmarks) {
    applyPitchingBiomechanics(results.poseLandmarks, b);
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
