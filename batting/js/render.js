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
  outputCtx.restore();
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
      '<div class="hud-head"><span class="hud-title">🤖 AI認識ステータス</span><span class="hud-muted">▲ 閉じる</span></div>' +
      '<div>状態: <b data-k="status"></b></div>' +
      '<div>処理速度: <b data-k="speed"></b></div>' +
      '<div>3D空間認識: <b data-k="world"></b></div>' +
      '<div>視認性: <span data-k="vis"></span></div>' +
      '<div>骨盤向: <b data-k="pelvis"></b>　胸郭向: <b data-k="thorax"></b></div>' +
      '<div>体幹捻転差: <b data-k="torsion"></b></div>' +
    '</div>';
  el.addEventListener('pointerdown', function(e) {
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
  const statusShort = status === 'RUNNING' ? '正常' : (status === 'ERROR' ? 'エラー' : '待機');
  el.hidden = false;
  el.classList.toggle('is-collapsed', !!isHudCollapsed);
  const collapsed = el.querySelector('[data-k="collapsed"]');
  collapsed.textContent = '🤖 AI認識: ' + statusShort + '  [' + latency + 'ms]  ▼';
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

