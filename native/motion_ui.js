var ghostLandmarksKey1 = null;
var ghostLandmarksKey2 = null;
var showGhostOverlay = true;
var lastPoseLandmarks = null;
var peakLiftKneeY = null;
var ghost1Locked = false;
var ghost2Locked = false;
var drawerSwipeTeardown = null;

var GHOST_STYLE_LIVE = {
  stroke: 'rgba(16, 185, 129, 0.95)',
  lineWidth: 2.5,
  joint: '#ffffff',
  jointStroke: 'rgba(16, 185, 129, 0.95)',
  jointRadius: 4.5
};

var GHOST_STYLE_KEY1 = {
  stroke: 'rgba(56, 189, 248, 0.45)',
  lineWidth: 1.8,
  joint: 'rgba(14, 165, 233, 0.5)',
  jointStroke: 'rgba(56, 189, 248, 0.55)',
  jointRadius: 3.4,
  dash: [5, 4]
};

var GHOST_STYLE_KEY2 = {
  stroke: 'rgba(249, 115, 22, 0.45)',
  lineWidth: 1.8,
  joint: 'rgba(234, 88, 12, 0.5)',
  jointStroke: 'rgba(249, 115, 22, 0.55)',
  jointRadius: 3.4,
  dash: [2, 4]
};

var POSE_DRAW_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [15, 19],
  [12, 14], [14, 16], [16, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 31],
  [24, 26], [26, 28], [28, 32]
];

var POSE_DRAW_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];

function clonePoseLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 33) return null;
  var copy = new Array(33);
  for (var i = 0; i < 33; i++) {
    var point = landmarks[i];
    if (!point) {
      copy[i] = null;
      continue;
    }
    copy[i] = {
      x: point.x,
      y: point.y,
      z: point.z || 0,
      visibility: point.visibility
    };
  }
  return copy;
}

function rememberPoseLandmarks(landmarks) {
  lastPoseLandmarks = clonePoseLandmarks(landmarks);
}

function captureGhostLandmarks(slot, manual) {
  var source = lastPoseLandmarks;
  if (manual && typeof poseFrameIndex === 'function' && typeof videoElement !== 'undefined' && videoElement && typeof poseCache !== 'undefined' && poseCache.landmarksByFrame) {
    var nativeIndex = poseFrameIndex(videoElement.currentTime);
    var slot = (typeof poseCacheIndexForNative === 'function') ? poseCacheIndexForNative(nativeIndex) : nativeIndex;
    var cached = poseCache.landmarksByFrame[slot];
    if (cached) source = cached;
  }
  var copy = clonePoseLandmarks(source);
  if (!copy) return;
  if (slot === 1) {
    if (ghost1Locked && !manual) return;
    ghostLandmarksKey1 = copy;
    if (manual) ghost1Locked = true;
  } else {
    if (ghost2Locked && !manual) return;
    ghostLandmarksKey2 = copy;
    if (manual) ghost2Locked = true;
  }
}

function noteLegLiftPeak(kneeY) {
  if (!Number.isFinite(kneeY)) return;
  if (peakLiftKneeY != null && kneeY >= peakLiftKneeY - 0.003) return;
  peakLiftKneeY = kneeY;
  captureGhostLandmarks(1, false);
}

function syncPoseOverlayButtons() {
  var ghostBtn = document.getElementById('btn-ghost-toggle');
  if (ghostBtn) {
    ghostBtn.textContent = showGhostOverlay ? '👻 残像: ON' : '👻 残像: OFF';
    ghostBtn.classList.toggle('is-off', !showGhostOverlay);
  }
  var skeletonBtn = document.getElementById('btn-toggle-skeleton');
  if (skeletonBtn) {
    var skeletonOn = typeof isSkeletonVisible !== 'undefined' && !!isSkeletonVisible;
    skeletonBtn.textContent = skeletonOn ? '🦴 骨格: ON' : '🦴 骨格: OFF';
    skeletonBtn.classList.toggle('is-off', !skeletonOn);
    skeletonBtn.style.background = '';
    skeletonBtn.style.color = '';
  }
}

function resetPoseOverlayVisibility() {
  showGhostOverlay = true;
  if (typeof isSkeletonVisible !== 'undefined') isSkeletonVisible = true;
  syncPoseOverlayButtons();
  if (typeof redrawPoseOverlay === 'function' && typeof videoElement !== 'undefined' && videoElement && videoElement.videoWidth) {
    redrawPoseOverlay();
  }
}

function clearGhostCache() {
  ghostLandmarksKey1 = null;
  ghostLandmarksKey2 = null;
  lastPoseLandmarks = null;
  peakLiftKneeY = null;
  ghost1Locked = false;
  ghost2Locked = false;
  if (typeof resetPoseCache === 'function') resetPoseCache();
  resetPoseOverlayVisibility();
}

function drawSkeleton(ctx, landmarks, colorStyle, isGhost, ox, oy, bw, bh) {
  if (!ctx || !landmarks || !colorStyle) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colorStyle.stroke;
  ctx.lineWidth = colorStyle.lineWidth;
  ctx.setLineDash(isGhost && colorStyle.dash ? colorStyle.dash : []);
  POSE_DRAW_CONNECTIONS.forEach(function(pair) {
    var p1 = landmarks[pair[0]];
    var p2 = landmarks[pair[1]];
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(ox + p1.x * bw, oy + p1.y * bh);
    ctx.lineTo(ox + p2.x * bw, oy + p2.y * bh);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  POSE_DRAW_JOINTS.forEach(function(index) {
    var point = landmarks[index];
    if (!point) return;
    ctx.beginPath();
    ctx.arc(ox + point.x * bw, oy + point.y * bh, colorStyle.jointRadius, 0, Math.PI * 2);
    ctx.fillStyle = colorStyle.joint;
    ctx.fill();
    ctx.lineWidth = isGhost ? 1 : 1.6;
    ctx.strokeStyle = colorStyle.jointStroke;
    ctx.stroke();
  });
  ctx.restore();
}

function paintGhostSkeletons(ctx, ox, oy, bw, bh) {
  if (!showGhostOverlay || !ctx) return;
  if (ghostLandmarksKey1) drawSkeleton(ctx, ghostLandmarksKey1, GHOST_STYLE_KEY1, true, ox, oy, bw, bh);
  if (ghostLandmarksKey2) drawSkeleton(ctx, ghostLandmarksKey2, GHOST_STYLE_KEY2, true, ox, oy, bw, bh);
}

function paintLiveSkeleton(ctx, landmarks, ox, oy, bw, bh) {
  if (typeof isSkeletonVisible !== 'undefined' && !isSkeletonVisible) return;
  drawSkeleton(ctx, landmarks, GHOST_STYLE_LIVE, false, ox, oy, bw, bh);
}

function redrawPoseOverlay() {
  if (typeof beginAnalysisCanvas !== 'function' || typeof endAnalysisCanvas !== 'function') return;
  var bounds = beginAnalysisCanvas();
  if (!bounds) return;
  paintGhostSkeletons(outputCtx, bounds.x, bounds.y, bounds.w, bounds.h);
  if (lastPoseLandmarks && (typeof isSkeletonVisible === 'undefined' || isSkeletonVisible)) {
    paintLiveSkeleton(outputCtx, lastPoseLandmarks, bounds.x, bounds.y, bounds.w, bounds.h);
  }
  endAnalysisCanvas();
}

function updateDrawerKeyBadge() {
  var el = document.getElementById('drawer-key-badge');
  if (!el || typeof records === 'undefined') return;
  if (typeof MotionPlayerCore !== 'undefined' && MotionPlayerCore.config && typeof MotionPlayerCore.config.badgeText === 'function') {
    el.textContent = MotionPlayerCore.config.badgeText();
    return;
  }
  if (typeof selectedBatSide !== 'undefined') {
    var twist = records.maxTwistSigned;
    el.textContent = twist ? ('🔥 TOP捻転差 ' + (twist > 0 ? '+' : '') + twist + '°') : '🔥 TOP捻転差 --';
    return;
  }
  if (typeof selectedAngleMode !== 'undefined' && selectedAngleMode === 'FRONT') {
    var toe = records.fcToeAngle;
    el.textContent = (toe == null) ? '🎯 接地時開き --' : ('🎯 接地時開き ' + toe + '°');
    return;
  }
  var knee = records.ffKneeFlex;
  el.textContent = (knee == null) ? '🎯 接地ヒザ --' : ('🎯 接地ヒザ ' + knee + '°');
}

function refreshDrawerAdvice() {
  var el = document.getElementById('drawer-advice-text');
  if (!el) return;
  if (typeof snapshotAdviceEntry !== 'function') {
    el.textContent = '主要な数値が決まると、ここにワンポイントが出ます。';
    return;
  }
  var entry = snapshotAdviceEntry();
  var rules = (typeof MotionPlayerCore !== 'undefined' && MotionPlayerCore.config) ? MotionPlayerCore.config.diagnosticRules : null;
  if (rules && typeof rules.html === 'function') {
    el.innerHTML = rules.html(entry);
    return;
  }
  if (typeof generateBattingDiagnosisHtml === 'function') {
    el.innerHTML = generateBattingDiagnosisHtml(entry);
    return;
  }
  if (typeof generatePitchingDiagnosisHtml === 'function') {
    el.innerHTML = generatePitchingDiagnosisHtml(entry);
    return;
  }
  el.textContent = '主要な数値が決まると、ここにワンポイントが出ます。';
}

function setDrawerExpanded(drawerElement, open) {
  drawerElement.classList.toggle('is-expanded', !!open);
  drawerElement.classList.toggle('is-collapsed', !open);
  drawerElement.dataset.state = open ? 'expanded' : 'collapsed';
  if (open) refreshDrawerAdvice();
}

function setupDrawerSwipe(drawerElement) {
  if (drawerSwipeTeardown) drawerSwipeTeardown();
  if (!drawerElement) return;
  var handle = drawerElement.querySelector('.drawer-handle');
  var startY = 0;
  var tracking = false;
  var suppressClick = false;

  function pointY(event) {
    if (event.touches && event.touches.length) return event.touches[0].clientY;
    if (event.changedTouches && event.changedTouches.length) return event.changedTouches[0].clientY;
    return event.clientY;
  }

  function onHandleClick(event) {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }
    setDrawerExpanded(drawerElement, !drawerElement.classList.contains('is-expanded'));
  }

  function onStart(event) {
    var onGrip = event.target.closest('.drawer-grip');
    if (!onGrip && event.target.closest('#drawer-body, input, button, a, select, textarea')) {
      tracking = false;
      return;
    }
    tracking = true;
    startY = pointY(event);
  }

  function onEnd(event) {
    if (!tracking) return;
    tracking = false;
    var delta = startY - pointY(event);
    if (Math.abs(delta) > 36) {
      suppressClick = true;
      setDrawerExpanded(drawerElement, delta > 0);
    }
  }

  if (handle) handle.addEventListener('click', onHandleClick);
  drawerElement.addEventListener('touchstart', onStart, { passive: true });
  drawerElement.addEventListener('touchend', onEnd);
  drawerElement.addEventListener('pointerdown', onStart);
  drawerElement.addEventListener('pointerup', onEnd);

  drawerSwipeTeardown = function() {
    if (handle) handle.removeEventListener('click', onHandleClick);
    drawerElement.removeEventListener('touchstart', onStart);
    drawerElement.removeEventListener('touchend', onEnd);
    drawerElement.removeEventListener('pointerdown', onStart);
    drawerElement.removeEventListener('pointerup', onEnd);
    drawerSwipeTeardown = null;
  };
}

function exportAnalysisImage() {
  var canvas = document.getElementById('output-canvas');
  if (!canvas || !canvas.width) return;
  canvas.toBlob(function(blob) {
    if (!blob) return;
    var file = new File([blob], 'motion-frame.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: '骨格解析' }).catch(function() {});
      return;
    }
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'motion-frame.png';
    link.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }, 'image/png');
}

function initMotionChrome() {
  var drawer = document.getElementById('drawer-sheet');
  if (drawer) setupDrawerSwipe(drawer);
  var ghostBtn = document.getElementById('btn-ghost-toggle');
  if (ghostBtn && !ghostBtn._motionBound) {
    ghostBtn._motionBound = true;
    ghostBtn.addEventListener('click', function() {
      showGhostOverlay = !showGhostOverlay;
      syncPoseOverlayButtons();
      redrawPoseOverlay();
    });
  }
  var exportBtn = document.getElementById('btn-export-frame');
  if (exportBtn && !exportBtn._motionBound) {
    exportBtn._motionBound = true;
    exportBtn.addEventListener('click', exportAnalysisImage);
  }
  updateDrawerKeyBadge();
  syncPoseOverlayButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMotionChrome);
} else {
  initMotionChrome();
}
