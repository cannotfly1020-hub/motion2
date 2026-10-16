// 動画読み込み・シークバー・再生・UIイベント制御

// Safari特有のリンクジャンプ保護（確実なルート指定）
document.getElementById('home-link-btn').addEventListener('click', function(e) {
  e.preventDefault();
  window.location.href = '../index.html';
});

var videoElement = document.getElementById('hidden-video');
var bufferCanvas = document.getElementById('buffer-canvas');
var bufferCtx = bufferCanvas.getContext('2d', { willReadFrequently: true });

var scanCanvas = document.getElementById('scan-canvas');
var scanCtx = scanCanvas.getContext('2d');

var outputCanvas = document.getElementById('output-canvas');
var outputCtx = outputCanvas.getContext('2d');

var pose = null;
var isPoseLoaded = false;
var isProcessing = false;
var animationFrameId = null;
var scanModeActive = false;

var playerName = "バッター1";
var userHeightCm = 140;
var selectedBatSide = 'RIGHT'; // RIGHT or LEFT
var videoFileUrl = null;
var selectedAngleMode = 'SIDE';

var isSkeletonVisible = true;

var tuneRuler = {
  isActive: false,
  topYNorm: 0.2,
  bottomYNorm: 0.8,
  centerXNorm: 0.5
};
let activeDragHandle = null;
let dragStartY = 0;
let snapTop = 0, snapBottom = 0;

var zoomScale = 1.0;
var zoomPan = { x: 0, y: 0 };
let initialPinchDistance = 0;
let initialZoomScale = 1.0;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panSnapshot = { x: 0, y: 0 };

var initialNoseX = null;
var initialNoseY = null;

var currentCalculatedState = {
  twistSignedDeg: 0,
  twistStatusLabel: "同調 (0°)",
  kneeFlexAngle: 0,
  strideCm: 0,
  trunkTiltDeg: 0,
  headShiftCm: 0,
  headShiftYCm: 0,
  topHandHeightCm: 0,
  impactHandHeightCm: 0,
  inStepCm: 0,
  inStepDir: "まっすぐ",
  shoulderOpenDeg: 0,
  shoulderOpenLabel: "◎ タメ十分 (壁キープ)",
  kneeValgusAngle: 0,
  kneeValgusLabel: "まっすぐ (◎ 正常)",
  leadElbowAngle: 0,
  backElbowAngle: 0
};

var records = {
  maxTwistSigned: 0,
  twistStatusLabel: null,
  impactKneeFlex: null,
  maxStride: 0,
  maxTrunkTilt: 0,
  maxHeadShift: 0,
  maxHeadShiftY: 0,
  maxTopHandH: 0,
  impactHandH: null,
  impactShoulderOpen: null,
  impactShoulderOpenLabel: null,
  maxInStepCm: 0,
  inStepDir: "まっすぐ",
  impactKneeValgus: null,
  impactKneeValgusLabel: null,
  takebackLeadElbow: null,
  impactBackElbow: null
};

const stepViews = {
  1: document.getElementById('view-step1'),
  2: document.getElementById('view-step2'),
  3: document.getElementById('view-step3'),
  4: document.getElementById('view-step4')
};

const stepPills = {
  1: document.getElementById('step-nav-1'),
  2: document.getElementById('step-nav-2'),
  3: document.getElementById('step-nav-3')
};

var c1Title = document.getElementById('c1-title');
var c1Val = document.getElementById('c1-val');
var c1Max = document.getElementById('c1-max');

var c2Title = document.getElementById('c2-title');
var c2Val = document.getElementById('c2-val');
var c2Max = document.getElementById('c2-max');

var c3Title = document.getElementById('c3-title');
var c3Val = document.getElementById('c3-val');
var c3Max = document.getElementById('c3-max');

var c4Title = document.getElementById('c4-title');
var c4Val = document.getElementById('c4-val');
var c4Max = document.getElementById('c4-max');

var c5Title = document.getElementById('c5-title');
var c5Val = document.getElementById('c5-val');
var c5Max = document.getElementById('c5-max');

var c6Title = document.getElementById('c6-title');
var c6Val = document.getElementById('c6-val');
var c6Max = document.getElementById('c6-max');

var c7Title = document.getElementById('c7-title');
var c7Val = document.getElementById('c7-val');
var c7Max = document.getElementById('c7-max');

var c8Title = document.getElementById('c8-title');
var c8Val = document.getElementById('c8-val');
var c8Max = document.getElementById('c8-max');

var c9Title = document.getElementById('c9-title');
var c9Val = document.getElementById('c9-val');
var c9Max = document.getElementById('c9-max');

var c10Title = document.getElementById('c10-title');
var c10Val = document.getElementById('c10-val');
var c10Max = document.getElementById('c10-max');

var angleModeBadge = document.getElementById('angle-mode-badge');
var playerTagBadge = document.getElementById('player-tag-badge');

var scanSeekBar = document.getElementById('scan-seek-bar');
var scanTimeDisp = document.getElementById('scan-time-disp');
var seekBar = document.getElementById('seek-bar');
var timeDisp = document.getElementById('time-disp');
var btnPlayPause = document.getElementById('btn-play-pause');
var zoomBadge = document.getElementById('zoom-badge');
var aiLoading = document.getElementById('ai-loading');
var scanLoading = document.getElementById('scan-loading');
var btnScanNextStep = document.getElementById('btn-scan-next-step');
var scanGuideText = document.getElementById('scan-guide-text');

const btnBatRight = document.getElementById('btn-bat-right');
const btnBatLeft = document.getElementById('btn-bat-left');
const btnToggleSkeleton = document.getElementById('btn-toggle-skeleton');

const carteModal = document.getElementById('carte-modal');
const btnCloseCarte = document.getElementById('btn-close-carte');
const carteHistoryList = document.getElementById('carte-history-list');
const playerSelectFilter = document.getElementById('player-select-filter');
const btnDeleteAction = document.getElementById('btn-delete-action');

const toastBox = document.getElementById('toast-box');
let toastTimeout = null;
function showToast(text, duration = 2500) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastBox.textContent = text;
  toastBox.classList.add('show');
  toastTimeout = setTimeout(() => {
    toastBox.classList.remove('show');
  }, duration);
}

function paintHero(el, tag, value, locked) {
  const safeTag = String(tag).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeVal = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  el.innerHTML = '<span class="phase-tag">' + safeTag + '</span><span class="phase-num">' + safeVal + '</span>';
  el.classList.toggle('is-locked', !!locked);
}

function showWaitingHeroes() {
  if (selectedAngleMode === 'SIDE') {
    paintHero(c1Max, 'TOP 捻転差', '--', false);
    paintHero(c2Max, 'IMPACT 前ヒザ', '--', false);
    paintHero(c3Max, 'MAX ステップ', '--', false);
    paintHero(c4Max, 'MAX 体幹', '--', false);
    paintHero(c5Max, 'MAX 頭前後', '--', false);
    paintHero(c6Max, 'MAX 頭上下', '--', false);
  } else {
    paintHero(c1Max, 'MAX 頭横', '--', false);
    paintHero(c2Max, 'MAX 頭上下', '--', false);
    paintHero(c3Max, 'IMPACT 前肩', '--', false);
    paintHero(c4Max, 'MAX 踏出', '--', false);
    paintHero(c5Max, 'MAX 側屈', '--', false);
    paintHero(c6Max, 'IMPACT 前ヒザ', '--', false);
  }
  paintHero(c7Max, 'TOP グリップ', '--', false);
  paintHero(c8Max, 'IMPACT グリップ', '--', false);
  paintHero(c9Max, 'TOP 前ヒジ', '--', false);
  paintHero(c10Max, 'IMPACT 後ヒジ', '--', false);
  [c1Val, c2Val, c3Val, c4Val, c5Val, c6Val, c7Val, c8Val, c9Val, c10Val].forEach((el) => {
    el.textContent = '--';
  });
}

function updateCardLabels() {
  const isLeft = (selectedBatSide === 'LEFT');
  if (selectedAngleMode === 'SIDE') {
    angleModeBadge.textContent = "横向き解析 🏏";
    angleModeBadge.style.background = "linear-gradient(135deg, #10b981, #059669)";

    c1Title.textContent = "🔄 捻転差 (下半身先行度)";
    c2Title.textContent = isLeft ? "🦵 前足ヒザ壁 (右屈曲)" : "🦵 前足ヒザ壁 (左屈曲)";
    c3Title.textContent = "🚶 ステップ幅 (歩幅)";
    c4Title.textContent = "📐 体幹軸傾斜 (スイング軸)";
    c5Title.textContent = "👀 頭の前後移動 (突っ込み)";
    c6Title.textContent = "👀 頭の上下動 (沈み込み)";
    c7Title.textContent = "✊ グリップトップ高";
    c8Title.textContent = "💥 インパクトグリップ高";
    c9Title.textContent = isLeft ? "💪 テイクバック前ヒジ (右肘)" : "💪 テイクバック前ヒジ (左肘)";
    c10Title.textContent = isLeft ? "💥 インパクト後ヒジ (左肘)" : "💥 インパクト後ヒジ (右肘)";
  } else {
    angleModeBadge.textContent = "正面（投手側）解析 🎯";
    angleModeBadge.style.background = "linear-gradient(135deg, #0284c7, #0369a1)";

    c1Title.textContent = "👀 頭の横ズレ幅 (目線ブレ)";
    c2Title.textContent = "👀 頭の上下動 (沈み込み/浮き)";
    c3Title.textContent = isLeft ? "🛡️ 前肩の開き (右肩のタメ)" : "🛡️ 前肩の開き (左肩のタメ)";
    c4Title.textContent = "🚶 ステップのズレ (イン/アウト)";
    c5Title.textContent = "📐 上半身の傾き (軸の左右倒れ)";
    c6Title.textContent = isLeft ? "🦵 前ヒザの踏ん張り (右足)" : "🦵 前ヒザの踏ん張り (左足)";
    c7Title.textContent = "✊ グリップトップ高";
    c8Title.textContent = "💥 インパクトグリップ高";
    c9Title.textContent = isLeft ? "💪 テイクバック前ヒジ (右肘)" : "💪 テイクバック前ヒジ (左肘)";
    c10Title.textContent = isLeft ? "💥 インパクト後ヒジ (左肘)" : "💥 インパクト後ヒジ (右肘)";
  }
  showWaitingHeroes();
}

btnBatRight.addEventListener('click', () => {
  selectedBatSide = 'RIGHT';
  btnBatRight.classList.add('active');
  btnBatLeft.classList.remove('active');
  updateCardLabels();
});

btnBatLeft.addEventListener('click', () => {
  selectedBatSide = 'LEFT';
  btnBatLeft.classList.add('active');
  btnBatRight.classList.remove('active');
  updateCardLabels();
});

btnToggleSkeleton.addEventListener('click', () => {
  isSkeletonVisible = !isSkeletonVisible;
  btnToggleSkeleton.textContent = isSkeletonVisible ? "🦴 骨格" : "🦴 非表示";
  btnToggleSkeleton.style.background = isSkeletonVisible ? "#ffffff" : "linear-gradient(135deg, #10b981, #059669)";
  btnToggleSkeleton.style.color = isSkeletonVisible ? "#334155" : "#ffffff";
  processSingleFrame();
});

function setStep(stepNum) {
  Object.keys(stepViews).forEach(s => stepViews[s].classList.remove('active'));
  if (stepViews[stepNum]) stepViews[stepNum].classList.add('active');

  Object.keys(stepPills).forEach(s => stepPills[s].classList.remove('active'));
  if (stepNum <= 3 && stepPills[stepNum]) {
    stepPills[stepNum].classList.add('active');
  } else if (stepNum === 4 && stepPills[3]) {
    stepPills[3].classList.add('active');
  }
}

stepPills[1].addEventListener('click', () => {
  videoElement.pause();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  setStep(1);
});

stepPills[2].addEventListener('click', () => {
  if (videoFileUrl) {
    videoElement.pause();
    setStep(2);
    setTimeout(() => {
      updateScanScreenSize();
      renderScanFrame();
    }, 100);
  }
});

stepPills[3].addEventListener('click', () => {
  if (videoFileUrl) {
    videoElement.pause();
    setStep(3);
  }
});

function handleVideoLoad(file, angleMode) {
  if (!file) return;
  selectedAngleMode = angleMode;

  if (videoFileUrl) {
    URL.revokeObjectURL(videoFileUrl);
    videoFileUrl = null;
  }
  videoFileUrl = URL.createObjectURL(file);
  
  updateCardLabels();
  setStep(2);

  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.src = videoFileUrl;
  videoElement.load();

  const onVideoReady = () => {
    updateScanScreenSize();
    renderScanFrame();
  };

  videoElement.onloadedmetadata = () => {
    try { videoElement.currentTime = 0.001; } catch (e) {}
    onVideoReady();
  };
  videoElement.onloadeddata = onVideoReady;

  setTimeout(onVideoReady, 120);
  setTimeout(onVideoReady, 300);

  initMediaPipe().catch(err => console.warn("MediaPipe init error:", err));
}

const inputSide = document.getElementById('video-input-side');
const inputFront = document.getElementById('video-input-front');

inputSide.addEventListener('click', function() { this.value = null; });
inputFront.addEventListener('click', function() { this.value = null; });

inputSide.addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) {
    handleVideoLoad(e.target.files[0], 'SIDE');
  }
});

inputFront.addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) {
    handleVideoLoad(e.target.files[0], 'FRONT');
  }
});

function getCanvasPoint(evt, canvas) {
  const rect = canvas.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function onScanPointerDown(e) {
  if (!tuneRuler.isActive) return;
  const pt = getCanvasPoint(e, scanCanvas);
  const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, scanCanvas.width, scanCanvas.height);
  
  const topY = b.y + tuneRuler.topYNorm * b.h;
  const bottomY = b.y + tuneRuler.bottomYNorm * b.h;
  const centerX = b.x + tuneRuler.centerXNorm * b.w;
  const tol = 30;

  if (Math.abs(pt.y - topY) <= tol && Math.abs(pt.x - centerX) <= 65) {
    activeDragHandle = 'top';
  } else if (Math.abs(pt.y - bottomY) <= tol && Math.abs(pt.x - centerX) <= 65) {
    activeDragHandle = 'bottom';
  } else if (pt.y > topY && pt.y < bottomY && Math.abs(pt.x - centerX) <= 40) {
    activeDragHandle = 'both';
  }
  dragStartY = pt.y;
  snapTop = tuneRuler.topYNorm;
  snapBottom = tuneRuler.bottomYNorm;
}

function onScanPointerMove(e) {
  if (!activeDragHandle || !tuneRuler.isActive) return;
  const pt = getCanvasPoint(e, scanCanvas);
  const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, scanCanvas.width, scanCanvas.height);
  const dNormY = (pt.y - dragStartY) / b.h;

  if (activeDragHandle === 'top') {
    tuneRuler.topYNorm = Math.min(tuneRuler.bottomYNorm - 0.1, Math.max(0.01, snapTop + dNormY));
  } else if (activeDragHandle === 'bottom') {
    tuneRuler.bottomYNorm = Math.max(tuneRuler.topYNorm + 0.1, Math.min(0.99, snapBottom + dNormY));
  } else if (activeDragHandle === 'both') {
    const heightNorm = snapBottom - snapTop;
    const newTop = Math.max(0.01, Math.min(0.99 - heightNorm, snapTop + dNormY));
    tuneRuler.topYNorm = newTop;
    tuneRuler.bottomYNorm = newTop + heightNorm;
  }
  renderScanFrame();
}

function onScanPointerUp() {
  activeDragHandle = null;
}

scanCanvas.addEventListener('mousedown', onScanPointerDown);
scanCanvas.addEventListener('mousemove', onScanPointerMove);
window.addEventListener('mouseup', onScanPointerUp);

scanCanvas.addEventListener('touchstart', onScanPointerDown, { passive: true });
scanCanvas.addEventListener('touchmove', onScanPointerMove, { passive: true });
window.addEventListener('touchend', onScanPointerUp);

scanSeekBar.addEventListener('input', () => {
  if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
  videoElement.currentTime = (scanSeekBar.value / 100) * videoElement.duration;
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  renderScanFrame();
});

document.getElementById('btn-scan-prev').addEventListener('click', () => {
  videoElement.currentTime = Math.max(0, videoElement.currentTime - 0.033);
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  renderScanFrame();
});

document.getElementById('btn-scan-next').addEventListener('click', () => {
  videoElement.currentTime = Math.min(videoElement.duration || 0, videoElement.currentTime + 0.033);
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  renderScanFrame();
});

document.getElementById('btn-scan-action').addEventListener('click', async () => {
  scanLoading.style.display = 'flex';
  scanModeActive = true;

  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;
  bufferCanvas.width = vw;
  bufferCanvas.height = vh;
  bufferCtx.drawImage(videoElement, 0, 0, vw, vh);

  try {
    await pose.send({ image: bufferCanvas });
  } catch (err) {
    console.error("Scan Error:", err);
  } finally {
    scanLoading.style.display = 'none';
    scanModeActive = false;
  }
});

btnScanNextStep.addEventListener('click', () => {
  setStep(3);
});

document.getElementById('btn-re-scan').addEventListener('click', () => {
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  setStep(2);
  setTimeout(() => {
    updateScanScreenSize();
    renderScanFrame();
  }, 100);
});

document.getElementById('btn-start-analysis').addEventListener('click', () => {
  const pName = document.getElementById('player-name-input').value.trim();
  playerName = pName || "バッター1";

  const hVal = parseFloat(document.getElementById('height-input').value);
  userHeightCm = (Number.isFinite(hVal) && hVal >= 80 && hVal <= 220) ? hVal : 140;

  playerTagBadge.textContent = `👤 ${playerName} (${userHeightCm}cm)`;

  initialNoseX = null;
  initialNoseY = null;

  setStep(4);
  setTimeout(() => {
    resetWorkspaceDimensions();
    processSingleFrame();
  }, 150);
});

window.addEventListener('resize', () => {
  if (stepViews[4].classList.contains('active')) {
    resetWorkspaceDimensions();
    processSingleFrame();
  } else if (stepViews[2].classList.contains('active')) {
    updateScanScreenSize();
    renderScanFrame();
  }
});

function updateZoomBadge() {
  zoomBadge.textContent = `🔍 ${zoomScale.toFixed(1)}x (ピンチ可)`;
}

outputCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const newScale = Math.max(1.0, Math.min(5.0, zoomScale * zoomFactor));
  if (newScale === 1.0) zoomPan = { x: 0, y: 0 };
  zoomScale = newScale;
  updateZoomBadge();
  processSingleFrame();
}, { passive: false });

outputCanvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    initialPinchDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    initialZoomScale = zoomScale;
  } else if (e.touches.length === 1 && zoomScale > 1.0) {
    isPanning = true;
    panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    panSnapshot = { ...zoomPan };
  }
}, { passive: true });

outputCanvas.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    if (initialPinchDistance > 0) {
      const factor = dist / initialPinchDistance;
      zoomScale = Math.max(1.0, Math.min(5.0, initialZoomScale * factor));
      if (zoomScale === 1.0) zoomPan = { x: 0, y: 0 };
      updateZoomBadge();
      processSingleFrame();
    }
  } else if (e.touches.length === 1 && isPanning && zoomScale > 1.0) {
    const dx = e.touches[0].clientX - panStart.x;
    const dy = e.touches[0].clientY - panStart.y;
    zoomPan.x = panSnapshot.x + dx;
    zoomPan.y = panSnapshot.y + dy;
    processSingleFrame();
  }
}, { passive: true });

outputCanvas.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) initialPinchDistance = 0;
  if (e.touches.length === 0) isPanning = false;
});

document.getElementById('btn-zoom-reset').addEventListener('click', () => {
  zoomScale = 1.0;
  zoomPan = { x: 0, y: 0 };
  updateZoomBadge();
  processSingleFrame();
});

document.getElementById('btn-manual-top').addEventListener('click', () => {
  records.takebackLeadElbow = currentCalculatedState.leadElbowAngle;
  paintHero(c9Max, 'TOP 前ヒジ', `${records.takebackLeadElbow}°`, true);
  showToast(`🎯 トップ時の前ヒジ角度【${records.takebackLeadElbow}°】を記録しました！`);
});

document.getElementById('btn-manual-impact').addEventListener('click', () => {
  records.impactKneeFlex = currentCalculatedState.kneeFlexAngle;
  records.impactShoulderOpen = currentCalculatedState.shoulderOpenDeg;
  records.impactShoulderOpenLabel = currentCalculatedState.shoulderOpenLabel;
  records.impactBackElbow = currentCalculatedState.backElbowAngle;
  records.impactHandH = currentCalculatedState.impactHandHeightCm;
  records.impactKneeValgus = currentCalculatedState.kneeValgusAngle;
  records.impactKneeValgusLabel = currentCalculatedState.kneeValgusLabel;

  if (selectedAngleMode === 'SIDE') {
    paintHero(c2Max, 'IMPACT 前ヒザ', `${records.impactKneeFlex}°`, true);
    paintHero(c8Max, 'IMPACT グリップ', `${records.impactHandH} cm`, true);
    paintHero(c10Max, 'IMPACT 後ヒジ', `${records.impactBackElbow}°`, true);
  } else {
    paintHero(c3Max, 'IMPACT 前肩', `${records.impactShoulderOpen}°`, true);
    paintHero(c6Max, 'IMPACT 前ヒザ', `${records.impactKneeValgus}°`, true);
    paintHero(c8Max, 'IMPACT グリップ', `${records.impactHandH} cm`, true);
    paintHero(c10Max, 'IMPACT 後ヒジ', `${records.impactBackElbow}°`, true);
  }
  showToast("💥 インパクト瞬間の各数値を記録しました！");
});

const STORAGE_KEY = 'batting_ai_records_v1';

function getSavedRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Storage Load Error", e);
    return [];
  }
}

function saveCurrentRecord() {
  const allRecords = getSavedRecords();
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  const newEntry = {
    id: Date.now(),
    date: dateStr,
    time: timeStr,
    playerName: playerName,
    height: userHeightCm,
    batSide: selectedBatSide,
    mode: selectedAngleMode,
    feelGrade: "😆 めっちゃ芯で捉えた！",
    bodyCondition: "🟢 どこも痛くない！元気！",
    playerNote: "",
    metrics: selectedAngleMode === 'SIDE' ? {
      twist: records.maxTwistSigned !== 0 ? records.maxTwistSigned : currentCalculatedState.twistSignedDeg,
      twistLabel: records.twistStatusLabel || currentCalculatedState.twistStatusLabel,
      impactKneeFlex: records.impactKneeFlex !== null ? records.impactKneeFlex : currentCalculatedState.kneeFlexAngle,
      stride: records.maxStride,
      strideRatio: Math.round((records.maxStride / userHeightCm) * 100),
      trunkTilt: records.maxTrunkTilt,
      headShift: records.maxHeadShift,
      headShiftY: records.maxHeadShiftY,
      topHandH: records.maxTopHandH,
      impactHandH: records.impactHandH !== null ? records.impactHandH : currentCalculatedState.impactHandHeightCm,
      takebackLeadElbow: records.takebackLeadElbow !== null ? records.takebackLeadElbow : currentCalculatedState.leadElbowAngle,
      impactBackElbow: records.impactBackElbow !== null ? records.impactBackElbow : currentCalculatedState.backElbowAngle
    } : {
      headShiftX: records.maxHeadShift,
      headShiftY: records.maxHeadShiftY,
      shoulderOpen: records.impactShoulderOpen !== null ? records.impactShoulderOpen : currentCalculatedState.shoulderOpenDeg,
      shoulderOpenLabel: records.impactShoulderOpenLabel || currentCalculatedState.shoulderOpenLabel,
      inStep: records.maxInStepCm,
      inStepDir: records.inStepDir,
      kneeValgus: records.impactKneeValgus !== null ? records.impactKneeValgus : currentCalculatedState.kneeValgusAngle,
      kneeValgusLabel: records.impactKneeValgusLabel || currentCalculatedState.kneeValgusLabel,
      trunkTilt: records.maxTrunkTilt,
      topHandH: records.maxTopHandH,
      impactHandH: records.impactHandH !== null ? records.impactHandH : currentCalculatedState.impactHandHeightCm,
      takebackLeadElbow: records.takebackLeadElbow,
      impactBackElbow: records.impactBackElbow
    }
  };

  allRecords.unshift(newEntry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
    showToast(`✅ ${playerName}君の打撃データをカルテに保存しました！`);
  } catch (e) {
    showToast("⚠️ 保存容量がいっぱいです");
  }
}

document.getElementById('btn-save-record').addEventListener('click', saveCurrentRecord);

function openCarteModal() {
  renderCarteList(true);
  carteModal.style.display = 'flex';
}

function closeCarteModal() {
  carteModal.style.display = 'none';
}

document.getElementById('btn-open-carte').addEventListener('click', openCarteModal);
document.getElementById('btn-open-carte-top').addEventListener('click', openCarteModal);
btnCloseCarte.addEventListener('click', closeCarteModal);

function shareRecordToLine(groupKey) {
  const allRecords = getSavedRecords();
  const groupRecords = allRecords.filter(r => `${r.playerName}_${r.date}` === groupKey);
  if (groupRecords.length === 0) return;

  const first = groupRecords[0];
  const sideRec = groupRecords.find(r => r.mode === 'SIDE');
  const frontRec = groupRecords.find(r => r.mode === 'FRONT');

  let text = `💥 【打撃バイオメカニクス 選手レポート】 ⚾\n`;
  text += `👤 選手名: ${first.playerName} 選手 (${first.height}cm / ${first.batSide === 'RIGHT' ? '右打ち' : '左打ち'})\n`;
  text += `📅 測定日: ${first.date}\n\n`;

  if (sideRec) {
    const isLeft = (first.batSide === 'LEFT');
    text += `📊 【横向き測定データ（論文準拠）】\n`;
    text += `・捻転差(下半身先行): ${sideRec.metrics.twist >= 0 ? '+' : ''}${sideRec.metrics.twist}° (${sideRec.metrics.twistLabel || 'タメ'})\n`;
    text += `・前ヒザの壁: 屈曲 ${sideRec.metrics.impactKneeFlex}°\n`;
    if (sideRec.metrics.takebackLeadElbow !== null && sideRec.metrics.takebackLeadElbow !== undefined) {
      text += `・テイクバック前ヒジ(${isLeft ? '右' : '左'}): ${sideRec.metrics.takebackLeadElbow}°\n`;
    }
    if (sideRec.metrics.impactBackElbow !== null && sideRec.metrics.impactBackElbow !== undefined) {
      text += `・インパクト後ヒジ(${isLeft ? '左' : '右'}): ${sideRec.metrics.impactBackElbow}°\n`;
    }
    text += `・ステップ幅: ${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio}%身)\n`;
    text += `・頭の突っ込み(前後): ${sideRec.metrics.headShift}cm\n`;
    text += `・頭の上下動(沈み込み): ${sideRec.metrics.headShiftY || 0}cm\n`;
    text += `・体幹スイング軸傾斜: ${sideRec.metrics.trunkTilt}°\n`;
    text += `・トップ高: ${sideRec.metrics.topHandH}cm / インパクト高: ${sideRec.metrics.impactHandH || '--'}cm\n\n`;
  }

  if (frontRec) {
    text += `🎯 【正面測定データ（論文準拠）】\n`;
    text += `・頭の横ブレ(目線): ${frontRec.metrics.headShiftX}cm\n`;
    text += `・頭の上下動(目線): ${frontRec.metrics.headShiftY}cm\n`;
    text += `・前肩の開き(タメ): ${frontRec.metrics.shoulderOpen || 0}° (${frontRec.metrics.shoulderOpenLabel || 'タメ十分'})\n`;
    text += `・前ヒザの踏ん張り(割れ): ${frontRec.metrics.kneeValgus || 0}° (${frontRec.metrics.kneeValgusLabel || '正常'})\n`;
    text += `・ステップズレ: ${frontRec.metrics.inStep}cm (${frontRec.metrics.inStepDir || 'まっすぐ'})\n`;
    text += `・上半身の傾き: ${frontRec.metrics.trunkTilt}°\n\n`;
  }

  text += generateBattingAICoachAdvice(first) + "\n\n";

  text += `👦 【せんしゅのふりかえり】\n`;
  text += `・打った感覚: ${first.feelGrade || '😆 めっちゃ芯で捉えた！'}\n`;
  text += `・カラダの調子: ${first.bodyCondition || '🟢 どこも痛くない！元気！'}\n`;
  if (first.playerNote && first.playerNote.trim() !== '') {
    text += `・ひとこと: 「${first.playerNote.trim()}」\n`;
  }

  if (navigator.share) {
    navigator.share({
      title: `${first.playerName}選手の打撃フォームレポート`,
      text: text
    }).catch(err => {
      if (err.name !== 'AbortError') console.log('Share error:', err);
    });
  } else {
    document.execCommand('copy');
    showToast("📋 レポート文をクリップボードにコピーしました！\nLINE等に貼り付けて監督に送れます。");
  }
}

function renderCarteList(isInitialOpen) {
  const allRecords = getSavedRecords();
  carteHistoryList.innerHTML = '';

  const playerNames = Array.from(new Set(allRecords.map(r => r.playerName)));
  const previousSelection = playerSelectFilter.value;

  playerSelectFilter.innerHTML = '<option value="ALL">🌟 全員のカルテを表示</option>';
  playerNames.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = `👤 ${p}`;
    playerSelectFilter.appendChild(opt);
  });

  if (isInitialOpen) {
    playerSelectFilter.value = playerNames.includes(playerName) ? playerName : 'ALL';
  } else if (playerNames.includes(previousSelection) || previousSelection === 'ALL') {
    playerSelectFilter.value = previousSelection;
  } else {
    playerSelectFilter.value = 'ALL';
  }

  const selectedFilter = playerSelectFilter.value;
  btnDeleteAction.textContent = (selectedFilter === 'ALL') ? "⚠️ 全カルテ初期化" : `🗑️ ${selectedFilter}を全削除`;

  const filtered = selectedFilter === 'ALL' ? allRecords : allRecords.filter(r => r.playerName === selectedFilter);

  if (filtered.length === 0) {
    carteHistoryList.innerHTML = '<div style="text-align:center; padding: 20px; color:#64748b; font-weight:800;">保存されたカルテはありません</div>';
    return;
  }

  const groups = {};
  filtered.forEach(r => {
    const key = `${r.playerName}_${r.date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  Object.keys(groups).forEach(key => {
    const recs = groups[key];
    const first = recs[0];
    const sideRec = recs.find(r => r.mode === 'SIDE');
    const frontRec = recs.find(r => r.mode === 'FRONT');
    const isLeft = (first.batSide === 'LEFT');

    const curFeel = first.feelGrade || "😆 めっちゃ芯で捉えた！";
    const curBody = first.bodyCondition || "🟢 どこも痛くない！元気！";

    const card = document.createElement('div');
    card.className = 'history-card';

    const aiAdviceHtml = generateBattingAICoachAdvice(first).replace(/\n/g, '<br>');

    card.innerHTML = `
      <div class="history-card-head">
        <span>👤 ${first.playerName} (${first.height}cm・${isLeft ? '左打' : '右打'})</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="color:#64748b; font-size:0.65rem;">📅 ${first.date}</span>
          <button class="btn-item-delete" data-group="${key}">🗑️</button>
        </div>
      </div>

      <div class="history-unified-grid">
        <div class="metric-section-block">
          <div class="metric-section-title">
            <span>🏏 横向き（側方）解析</span>
            <span style="font-size:0.60rem; color:${sideRec ? '#10b981' : '#94a3b8'};">${sideRec ? '● 測定済' : '○ 未測定'}</span>
          </div>
          ${sideRec ? `
            <div class="metric-row-item"><span>🔄 捻転差(タメ):</span><b>${sideRec.metrics.twist >= 0 ? '+' : ''}${sideRec.metrics.twist}° (${sideRec.metrics.twistLabel || 'タメ'})</b></div>
            <div class="metric-row-item"><span>🦵 前ヒザの壁:</span><b>屈曲 ${sideRec.metrics.impactKneeFlex}°</b></div>
            <div class="metric-row-item"><span>💪 テイクバック前ヒジ:</span><b>${sideRec.metrics.takebackLeadElbow !== undefined && sideRec.metrics.takebackLeadElbow !== null ? sideRec.metrics.takebackLeadElbow + '°' : '--'}</b></div>
            <div class="metric-row-item"><span>💥 インパクト後ヒジ:</span><b>${sideRec.metrics.impactBackElbow !== undefined && sideRec.metrics.impactBackElbow !== null ? sideRec.metrics.impactBackElbow + '°' : '--'}</b></div>
            <div class="metric-row-item"><span>🚶 ステップ幅:</span><b>${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio}%)</b></div>
            <div class="metric-row-item"><span>👀 頭の突っ込み:</span><b>${sideRec.metrics.headShift}cm</b></div>
            <div class="metric-row-item"><span>👀 頭の上下動:</span><b>${sideRec.metrics.headShiftY || 0}cm</b></div>
            <div class="metric-row-item"><span>📐 スイング軸傾斜:</span><b>${sideRec.metrics.trunkTilt}°</b></div>
            <div class="metric-row-item"><span>✊ トップ/インパクト高:</span><b>${sideRec.metrics.topHandH}cm / ${sideRec.metrics.impactHandH || '--'}cm</b></div>
          ` : `
            <div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">横向き動画のデータなし</div>
          `}
        </div>

        <div class="metric-section-block">
          <div class="metric-section-title">
            <span>🎯 正面（投手側）解析</span>
            <span style="font-size:0.60rem; color:${frontRec ? '#10b981' : '#94a3b8'};">${frontRec ? '● 測定済' : '○ 未測定'}</span>
          </div>
          ${frontRec ? `
            <div class="metric-row-item"><span>👀 頭の横ブレ:</span><b>${frontRec.metrics.headShiftX}cm</b></div>
            <div class="metric-row-item"><span>👀 頭の上下動:</span><b>${frontRec.metrics.headShiftY}cm</b></div>
            <div class="metric-row-item"><span>🛡️ 前肩の開き:</span><b>${frontRec.metrics.shoulderOpen || 0}° (${frontRec.metrics.shoulderOpenLabel || 'タメ十分'})</b></div>
            <div class="metric-row-item"><span>🦵 前ヒザの踏ん張り:</span><b>${frontRec.metrics.kneeValgus || 0}° (${frontRec.metrics.kneeValgusLabel || '正常'})</b></div>
            <div class="metric-row-item"><span>🚶 踏出ズレ:</span><b>${frontRec.metrics.inStep}cm (${frontRec.metrics.inStepDir || 'まっすぐ'})</b></div>
            <div class="metric-row-item"><span>📐 軸の左右傾き:</span><b>${frontRec.metrics.trunkTilt}°</b></div>
          ` : `
            <div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">正面動画のデータなし</div>
          `}
        </div>
      </div>

      <div class="ai-coach-card">
        <div class="ai-coach-title">🤖 打撃バイオメカニクス AIコーチ診断</div>
        <div class="ai-coach-text">${aiAdviceHtml}</div>
      </div>

      <div class="player-reflection-box">
        <div class="reflection-sec-title">🏏 今日の打撃の感覚は？</div>
        <div class="chip-group" data-type="feel" data-group="${key}">
          <div class="choice-chip ${curFeel.includes('芯') ? 'active' : ''}" data-val="😆 めっちゃ芯で捉えた！">😆 芯で捉えた</div>
          <div class="choice-chip ${curFeel.includes('ふつう') ? 'active' : ''}" data-val="😊 ふつう・いつも通り">😊 いつも通り</div>
          <div class="choice-chip ${curFeel.includes('詰まった') || curFeel.includes('いまいち') ? 'active' : ''}" data-val="😣 詰まった / 泳がされた">😣 詰まった</div>
        </div>

        <div class="reflection-sec-title">💪 カラダの調子・違和感</div>
        <div class="chip-group" data-type="body" data-group="${key}">
          <div class="choice-chip ${curBody.includes('痛くない') ? 'active' : ''}" data-val="🟢 どこも痛くない！元気！">🟢 痛くない</div>
          <div class="choice-chip ${curBody.includes('重い') ? 'active' : ''}" data-val="🟡 腰や手首がちょっと重い">🟡 ちょっと重い</div>
          <div class="choice-chip ${curBody.includes('違和感') ? 'active' : ''}" data-val="🔴 腰や手首に違和感・痛みあり">🔴 違和感あり</div>
        </div>

        <div class="reflection-sec-title">📝 じぶんの気づき、監督、お父さん、お母さんへひとこと</div>
        <textarea class="player-textarea" data-group="${key}" placeholder="気づいたことや、次にやってみたいことを書いてね！">${first.playerNote || ''}</textarea>

        <button class="btn-share-line" data-group="${key}">
          <span>💬 📤 今日の打撃レポートを監督に送る</span>
        </button>
      </div>
    `;
    carteHistoryList.appendChild(card);
  });

  carteHistoryList.querySelectorAll('.choice-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const parent = e.currentTarget.parentElement;
      const type = parent.getAttribute('data-type');
      const groupKey = parent.getAttribute('data-group');
      const val = e.currentTarget.getAttribute('data-val');

      parent.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');

      let allRecs = getSavedRecords();
      allRecs.forEach(item => {
        if (`${item.playerName}_${item.date}` === groupKey) {
          if (type === 'feel') item.feelGrade = val;
          if (type === 'body') item.bodyCondition = val;
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecs));
    });
  });

  carteHistoryList.querySelectorAll('.player-textarea').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const groupKey = e.currentTarget.getAttribute('data-group');
      const textVal = e.currentTarget.value;
      let allRecs = getSavedRecords();
      allRecs.forEach(item => {
        if (`${item.playerName}_${item.date}` === groupKey) {
          item.playerNote = textVal;
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecs));
    });
  });

  carteHistoryList.querySelectorAll('.btn-share-line').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const groupKey = e.currentTarget.getAttribute('data-group');
      shareRecordToLine(groupKey);
    });
  });

  carteHistoryList.querySelectorAll('.btn-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const groupKey = e.currentTarget.getAttribute('data-group');
      let allRecords = getSavedRecords();
      allRecords = allRecords.filter(r => `${r.playerName}_${r.date}` !== groupKey);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
      showToast("🗑️ カルテを1件削除しました");
      renderCarteList(false);
    });
  });
}

playerSelectFilter.addEventListener('change', () => renderCarteList(false));

btnDeleteAction.addEventListener('click', () => {
  const selectedFilter = playerSelectFilter.value;
  let allRecords = getSavedRecords();
  if (allRecords.length === 0) return;

  if (selectedFilter === 'ALL') {
    localStorage.removeItem(STORAGE_KEY);
    showToast("⚠️ 全カルテを初期化しました");
    renderCarteList(false);
  } else {
    allRecords = allRecords.filter(r => r.playerName !== selectedFilter);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
    showToast(`👤 ${selectedFilter} 選手のデータを削除しました`);
    renderCarteList(false);
  }
});

document.getElementById('btn-export-csv').addEventListener('click', () => {
  const allRecords = getSavedRecords();
  if (allRecords.length === 0) {
    showToast("保存されたデータがありません");
    return;
  }
  let csvContent = "\uFEFF日付,選手名,身長,打席,測定向き,捻転差(deg),捻転状態,前ヒザ壁(deg),テイクバック前ヒジ(deg),インパクト後ヒジ(deg),ステップ幅(cm),ステップ率(%),頭突っ込み(cm),頭上下動(cm),スイング軸傾斜(deg),頭横ブレ(cm),前肩開き(deg),前肩状態,前ヒザ内外反(deg),ステップズレ(cm),打った感覚,カラダの調子,選手コメント\n";

  allRecords.forEach(r => {
    const isSide = (r.mode === 'SIDE');
    const noteSafe = `"${(r.playerNote || '').replace(/"/g, '""')}"`;
    const row = [
      `"${r.date}"`,
      `"${r.playerName}"`,
      r.height,
      r.batSide === 'RIGHT' ? "右打" : "左打",
      isSide ? "横向き" : "正面",
      isSide ? r.metrics.twist : "",
      isSide ? `"${r.metrics.twistLabel || ''}"` : "",
      isSide ? r.metrics.impactKneeFlex : "",
      isSide ? (r.metrics.takebackLeadElbow || "") : "",
      isSide ? (r.metrics.impactBackElbow || "") : "",
      isSide ? r.metrics.stride : "",
      isSide ? r.metrics.strideRatio : "",
      isSide ? r.metrics.headShift : "",
      isSide ? (r.metrics.headShiftY || 0) : (!isSide ? r.metrics.headShiftY : ""),
      isSide ? r.metrics.trunkTilt : r.metrics.trunkTilt,
      !isSide ? r.metrics.headShiftX : "",
      !isSide ? (r.metrics.shoulderOpen || 0) : "",
      !isSide ? `"${r.metrics.shoulderOpenLabel || ''}"` : "",
      !isSide ? (r.metrics.kneeValgus || 0) : "",
      !isSide ? (r.metrics.inStep || 0) : "",
      `"${r.feelGrade || '😆 芯で捉えた'}"`,
      `"${r.bodyCondition || '🟢 痛くない'}"`,
      noteSafe
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `打撃AIカルテ_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

function updatePlayState() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  if (videoElement.paused) {
    btnPlayPause.textContent = "再生 ▶";
    btnPlayPause.style.background = "linear-gradient(135deg, #10b981, #059669)";
  } else {
    btnPlayPause.textContent = "停止 ⏸";
    btnPlayPause.style.background = "linear-gradient(135deg, #0284c7, #0369a1)";
    renderLoop();
  }
}

function updateTimeUI() {
  if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
  seekBar.value = (videoElement.currentTime / videoElement.duration) * 100;
  timeDisp.textContent = `${videoElement.currentTime.toFixed(2)} / ${videoElement.duration.toFixed(2)}`;
}

videoElement.addEventListener('play', updatePlayState);
videoElement.addEventListener('pause', updatePlayState);
videoElement.addEventListener('ended', updatePlayState);
videoElement.addEventListener('seeked', () => {
  if (stepViews[4].classList.contains('active')) {
    processSingleFrame();
  }
});

btnPlayPause.addEventListener('click', (e) => {
  e.stopPropagation();
  if (videoElement.paused) {
    videoElement.play().catch(err => {
      if (err.name !== 'AbortError') console.warn("Video Play Interrupted:", err);
    });
  } else {
    videoElement.pause();
  }
});

seekBar.addEventListener('input', () => {
  if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
  videoElement.pause();
  videoElement.currentTime = (seekBar.value / 100) * videoElement.duration;
  updateTimeUI();
});

document.getElementById('btn-frame-prev').addEventListener('click', (e) => {
  e.stopPropagation();
  videoElement.pause();
  videoElement.currentTime = Math.max(0, videoElement.currentTime - 0.033);
  updateTimeUI();
});

document.getElementById('btn-frame-next').addEventListener('click', (e) => {
  e.stopPropagation();
  videoElement.pause();
  videoElement.currentTime = Math.min(videoElement.duration || 0, videoElement.currentTime + 0.033);
  updateTimeUI();
});

document.getElementById('btn-reset-max').addEventListener('click', () => {
  records = {
    maxTwistSigned: 0, twistStatusLabel: null, impactKneeFlex: null, maxStride: 0, maxTrunkTilt: 0,
    maxHeadShift: 0, maxHeadShiftY: 0, maxTopHandH: 0, impactHandH: null,
    impactShoulderOpen: null, impactShoulderOpenLabel: null, maxInStepCm: 0, inStepDir: "まっすぐ",
    impactKneeValgus: null, impactKneeValgusLabel: null,
    takebackLeadElbow: null, impactBackElbow: null
  };
  initialNoseX = null;
  initialNoseY = null;
  showWaitingHeroes();
});

document.getElementById('btn-re-select').addEventListener('click', () => {
  videoElement.pause();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  zoomScale = 1.0;
  zoomPan = { x: 0, y: 0 };
  initialNoseX = null;
  initialNoseY = null;
  updateZoomBadge();
  setStep(1);
});
