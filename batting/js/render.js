// Canvasへの骨格・スキャン定規・動画フレーム描画

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
  canvas.style.width = "100%";
  canvas.style.maxWidth = "100%";
  canvas.style.height = "100%";
  canvas.style.maxHeight = "100%";
  canvas.style.objectFit = "contain";
  const changed = canvas.width !== size.w || canvas.height !== size.h;
  if (changed) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  watchStage(canvas);
  return changed;
}

function watchStage(canvas) {
  if (!canvas || canvas._stageWatch || typeof ResizeObserver === "undefined") return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const observer = new ResizeObserver(() => {
    if (!bindCanvasToStage(canvas)) return;
    if (canvas === scanCanvas && typeof renderScanFrame === "function") renderScanFrame();
    else if (typeof renderFrameOnly === "function") renderFrameOnly();
  });
  observer.observe(parent);
  canvas._stageWatch = true;
}

function updateScanScreenSize() {
  bindCanvasToStage(scanCanvas);
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

  scanCtx.strokeStyle = "rgba(16, 185, 129, 0.4)";
  scanCtx.lineWidth = 4;
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
  if (showAiDebugHud) drawAiDiagnosticsHUD(outputCtx);
}

function drawBattingSkeleton(landmarks, ox, oy, bw, bh, isRightBatter) {
  const connections = [
    [11, 12], [11, 13], [13, 15], [15, 17], [15, 19],
    [12, 14], [14, 16], [16, 18], [16, 20],
    [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27], [27, 29], [29, 31],
    [24, 26], [26, 28], [28, 30], [30, 32]
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

  const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];
  const frontKneeIdx = isRightBatter ? 25 : 26;

  keyJoints.forEach(idx => {
    const p = landmarks[idx];
    if (p) {
      let drawX = ox + p.x * bw;
      let drawY = oy + p.y * bh;

      outputCtx.beginPath();
      let radius = 5;
      if ([15, 16].includes(idx)) radius = 7;
      if (idx === frontKneeIdx) radius = 7;

      outputCtx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      
      if ([15, 16].includes(idx)) {
        outputCtx.fillStyle = "#f59e0b";
      } else if (idx === frontKneeIdx) {
        outputCtx.fillStyle = "#ffe600";
      } else {
        outputCtx.fillStyle = "#34d399";
      }

      outputCtx.fill();
      outputCtx.strokeStyle = "#ffffff";
      outputCtx.lineWidth = 1.5;
      outputCtx.stroke();
    }
  });
}

var isHudCollapsed = false;

var hudLayout = {
  x: 12,
  y: 30,
  expandedW: 270,
  expandedH: 158,
  collapsedW: 195,
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
  if (typeof showAiDebugHud !== 'undefined' && !showAiDebugHud) return false;
  if (!pos) return false;
  const box = getAiHudBox(canvasWidth);
  return pos.x >= box.x && pos.x <= box.x + box.w && pos.y >= box.y && pos.y <= box.y + box.h;
}

function drawAiDiagnosticsHUD(ctx) {
  const box = getAiHudBox(ctx.canvas.width);
  const x = box.localX;
  const y = box.localY;
  const w = box.localW;
  const h = box.localH;
  const radius = hudLayout.radius;

  ctx.save();
  if (box.scale < 1) {
    ctx.translate(box.originX, box.originY);
    ctx.scale(box.scale, box.scale);
  }

  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fill();
  ctx.strokeStyle = isHudCollapsed ? 'rgba(0, 255, 204, 0.3)' : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (isHudCollapsed) {
    const midY = y + h / 2;
    const dotColor = aiDiagnostics.status === 'RUNNING' ? '#30d158' : (aiDiagnostics.status === 'ERROR' ? '#ff3b30' : '#ffd60a');
    const statusShort = aiDiagnostics.status === 'RUNNING' ? '正常' : (aiDiagnostics.status === 'ERROR' ? 'エラー' : '待機');
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x + 14, midY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('🤖 AI認識: ' + statusShort, x + 24, midY);

    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText('[' + Math.round(aiDiagnostics.latencyMs) + 'ms]', x + 128, midY);
    ctx.fillStyle = '#8e8e93';
    ctx.fillText('▼', x + w - 16, midY);

    ctx.restore();
    return;
  }

  ctx.textBaseline = 'top';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#00ffcc';
  ctx.fillText('🤖 AI認識ステータス', x + 12, y + 10);
  ctx.fillStyle = '#8e8e93';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('▲ 閉じる', x + w - 58, y + 11);

  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let curY = y + 30;
  const lineGap = 17;

  ctx.fillStyle = '#aaa';
  ctx.fillText('状態:', x + 12, curY);
  let statusText = '一時停止中 (待機)';
  let statusColor = '#ffd60a';
  if (aiDiagnostics.status === 'RUNNING') {
    statusText = '正常稼働中';
    statusColor = '#30d158';
  } else if (aiDiagnostics.status === 'ERROR') {
    statusText = '処理落ち / エラー';
    statusColor = '#ff3b30';
  }
  ctx.fillStyle = statusColor;
  ctx.fillText(statusText, x + 68, curY);
  curY += lineGap;

  ctx.fillStyle = '#aaa';
  ctx.fillText('処理速度:', x + 12, curY);
  ctx.fillStyle = '#fff';
  ctx.fillText(Math.round(aiDiagnostics.latencyMs) + 'ms (' + Math.round(aiDiagnostics.fps) + 'コマ/秒)', x + 68, curY);
  curY += lineGap;

  ctx.fillStyle = '#aaa';
  ctx.fillText('3D空間認識:', x + 12, curY);
  ctx.fillStyle = aiDiagnostics.hasWorld3D ? '#30d158' : '#ff3b30';
  ctx.fillText(aiDiagnostics.hasWorld3D ? '良好 (全身33箇所)' : '未検出 / 2Dのみ', x + 82, curY);
  curY += lineGap;

  const getMark = (score) => {
    if (score >= 0.80) return { text: '◎', color: '#30d158' };
    if (score >= 0.50) return { text: '○', color: '#ffd60a' };
    return { text: '×(隠れ)', color: '#ff3b30' };
  };

  const drawVisPair = (labelA, markA, labelB, markB) => {
    let cursor = x + 68;
    ctx.fillStyle = '#ccc';
    ctx.fillText(labelA, cursor, curY);
    cursor += ctx.measureText(labelA).width + 2;
    ctx.fillStyle = markA.color;
    ctx.fillText(markA.text, cursor, curY);
    cursor += ctx.measureText(markA.text).width + 8;
    ctx.fillStyle = '#ccc';
    ctx.fillText(labelB, cursor, curY);
    cursor += ctx.measureText(labelB).width + 2;
    ctx.fillStyle = markB.color;
    ctx.fillText(markB.text, cursor, curY);
  };

  ctx.fillStyle = '#aaa';
  ctx.fillText('視認性:', x + 12, curY);
  drawVisPair('左肩:', getMark(aiDiagnostics.vis.leftShoulder), '右肩:', getMark(aiDiagnostics.vis.rightShoulder));
  curY += lineGap;
  drawVisPair('左腰:', getMark(aiDiagnostics.vis.leftHip), '右腰:', getMark(aiDiagnostics.vis.rightHip));
  curY += lineGap;

  ctx.fillStyle = '#aaa';
  ctx.fillText('骨盤向:', x + 12, curY);
  ctx.fillStyle = '#007aff';
  const pYaw = (aiDiagnostics.pelvisYaw >= 0 ? '+' : '') + aiDiagnostics.pelvisYaw.toFixed(1) + '°';
  ctx.fillText(pYaw, x + 55, curY);

  ctx.fillStyle = '#aaa';
  ctx.fillText('胸郭向:', x + 120, curY);
  ctx.fillStyle = '#ff375f';
  const tYaw = (aiDiagnostics.thoraxYaw >= 0 ? '+' : '') + aiDiagnostics.thoraxYaw.toFixed(1) + '°';
  ctx.fillText(tYaw, x + 165, curY);
  curY += lineGap;

  ctx.fillStyle = '#aaa';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('体幹捻転差:', x + 12, curY);
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(Math.abs(aiDiagnostics.torsionDiff).toFixed(1) + '°', x + 82, curY);

  ctx.restore();
}
