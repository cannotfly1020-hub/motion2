// Canvasへの骨格・肩肘アライメント・スキャン定規・フェーズ描画

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
  return { x, y, w, h };
}

function updateScanScreenSize() {
  const rect = scanCanvas.parentElement.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    scanCanvas.width = rect.width;
    scanCanvas.height = rect.height;
  }
}

function renderScanFrame() {
  const cw = scanCanvas.width;
  const ch = scanCanvas.height;
  if (cw === 0 || ch === 0 || !videoElement.videoWidth) return;

  scanCtx.clearRect(0, 0, cw, ch);
  const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, cw, ch);
  scanCtx.drawImage(videoElement, b.x, b.y, b.w, b.h);

  if (Number.isFinite(videoElement.duration) && videoElement.duration > 0) {
    scanSeekBar.value = (videoElement.currentTime / videoElement.duration) * 100;
    scanTimeDisp.textContent = `${videoElement.currentTime.toFixed(2)} / ${videoElement.duration.toFixed(2)}`;
  }

  if (tuneRuler.isActive) {
    drawInteractiveRuler(b);
  }
}

function drawInteractiveRuler(b) {
  const topY = b.y + tuneRuler.topYNorm * b.h;
  const bottomY = b.y + tuneRuler.bottomYNorm * b.h;
  const centerX = b.x + tuneRuler.centerXNorm * b.w;
  const barWidth = 50;

  scanCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  scanCtx.lineWidth = 4;
  scanCtx.beginPath();
  scanCtx.moveTo(centerX, topY);
  scanCtx.lineTo(centerX, bottomY);
  scanCtx.stroke();

  scanCtx.strokeStyle = "#38bdf8";
  scanCtx.lineWidth = 2;
  scanCtx.beginPath();
  scanCtx.moveTo(centerX, topY);
  scanCtx.lineTo(centerX, bottomY);
  scanCtx.stroke();

  scanCtx.strokeStyle = "#10b981";
  scanCtx.lineWidth = 3.5;
  scanCtx.beginPath();
  scanCtx.moveTo(centerX - barWidth, topY);
  scanCtx.lineTo(centerX + barWidth, topY);
  scanCtx.stroke();

  scanCtx.fillStyle = "#10b981";
  scanCtx.beginPath();
  scanCtx.arc(centerX, topY, 11, 0, Math.PI * 2);
  scanCtx.fill();
  scanCtx.strokeStyle = "#ffffff";
  scanCtx.lineWidth = 2;
  scanCtx.stroke();

  scanCtx.fillStyle = "#ffffff";
  scanCtx.font = "bold 10px sans-serif";
  scanCtx.textAlign = "center";
  scanCtx.fillText("👑 あたま ↕", centerX, topY - 14);

  scanCtx.strokeStyle = "#f43f5e";
  scanCtx.lineWidth = 3.5;
  scanCtx.beginPath();
  scanCtx.moveTo(centerX - barWidth, bottomY);
  scanCtx.lineTo(centerX + barWidth, bottomY);
  scanCtx.stroke();

  scanCtx.fillStyle = "#f43f5e";
  scanCtx.beginPath();
  scanCtx.arc(centerX, bottomY, 11, 0, Math.PI * 2);
  scanCtx.fill();
  scanCtx.strokeStyle = "#ffffff";
  scanCtx.lineWidth = 2;
  scanCtx.stroke();

  scanCtx.fillStyle = "#ffffff";
  scanCtx.fillText("👟 じめん ↕", centerX, bottomY + 18);
}

function resetWorkspaceDimensions() {
  const rect = outputCanvas.parentElement.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    outputCanvas.width = rect.width;
    outputCanvas.height = rect.height;
  }
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
}

function renderFrameOnly() {
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
  outputCtx.restore();
}

function drawPrecisionSkeleton(landmarks, ox, oy, bw, bh, isSouthpaw, isRightHanded) {
  const connections = [
    [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
    [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
    [24, 26], [26, 28], [28, 30], [30, 32], [28, 32]
  ];

  outputCtx.strokeStyle = "#10b981";
  outputCtx.lineWidth = 3.5;
  connections.forEach(([i, j]) => {
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    if (p1 && p2) {
      outputCtx.beginPath();
      outputCtx.moveTo(ox + p1.x * bw, oy + p1.y * bh);
      outputCtx.lineTo(ox + p2.x * bw, oy + p2.y * bh);
      outputCtx.stroke();
    }
  });

  const keyJoints = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
  const throwWristIdx = isRightHanded ? 16 : 15;
  const throwElbowIdx = isRightHanded ? 14 : 13;
  const throwIndexIdx = isRightHanded ? 20 : 19;
  const leadKneeIdx = isRightHanded ? 25 : 26;
  const leadToeIdx = isRightHanded ? 31 : 32;

  keyJoints.forEach(idx => {
    const p = landmarks[idx];
    if (p) {
      let drawX = ox + p.x * bw;
      let drawY = oy + p.y * bh;

      if (idx === throwIndexIdx && landmarks[throwWristIdx]) {
        const wristP = landmarks[throwWristIdx];
        const dist = Math.hypot(p.x - wristP.x, p.y - wristP.y);
        if (dist > 0.18) {
          drawX = ox + wristP.x * bw;
          drawY = oy + wristP.y * bh;
        }
      }

      outputCtx.beginPath();
      let radius = 4.5;
      if (idx === throwIndexIdx) radius = 7;
      else if (idx === throwWristIdx) radius = 6;
      else if (idx === throwElbowIdx) radius = 5.5;
      else if (idx === leadKneeIdx) radius = 6;
      else if (idx === leadToeIdx) radius = 7;

      outputCtx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      
      if (idx === throwIndexIdx) outputCtx.fillStyle = "#ff007f";
      else if (idx === throwWristIdx) outputCtx.fillStyle = "#ff5252";
      else if (idx === throwElbowIdx) outputCtx.fillStyle = "#ff9f43";
      else if (idx === leadKneeIdx) outputCtx.fillStyle = "#ffe600";
      else if (idx === leadToeIdx) outputCtx.fillStyle = "#00d2ff";
      else if ([17, 18, 21, 22].includes(idx)) outputCtx.fillStyle = "#a855f7";
      else outputCtx.fillStyle = "#38bdf8";

      outputCtx.fill();
      outputCtx.strokeStyle = "#ffffff";
      outputCtx.lineWidth = 1.5;
      outputCtx.stroke();
    }
  });
}
