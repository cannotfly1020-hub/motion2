// 動画読み込み・シークバー・再生・UIイベント制御

// Safari特有のリンクジャンプ保護（ホームに戻るボタンの確実な動作）
document.getElementById('home-link-btn').addEventListener('click', function(e) {
  e.preventDefault();
  videoElement.pause();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
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

var playerName = "せんしゅ1";
var userHeightCm = 140;
var selectedThrowArm = 'LEFT';
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

var manualToeOffsetDeg = 0;
let isDraggingToe = false;
let toeDragOrigin = { x: 0, y: 0 };
var smoothToeDeg = 0;

var zoomScale = 1.0;
var zoomPan = { x: 0, y: 0 };
let initialPinchDistance = 0;
let initialZoomScale = 1.0;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panSnapshot = { x: 0, y: 0 };

var prevLeadToeY = null;
var leadFootFlatStationaryCount = 0;

var currentCalculatedState = {
  displayToeAngle: 0,
  toeStateLabel: "◎ ストレート",
  kneeDevAngle: 0,
  kneeStateLabel: "まっすぐ (◎ 正常)",
  kneeFlexAngle: 0
};

var records = {
  maxStride: 0,
  maxMER: 0,
  maxTwist: 0,
  maxRelease: 0,
  ffKneeFlex: null,
  releaseKneeFlex: null,
  maxTrunkTilt: 0,
  toeAngle: 0,
  fcToeAngle: null,
  fcToeLabel: null,
  maxValgus: 0,
  ffValgusAngle: null,
  ffValgusLabel: null,
  maxTrunkLateral: 0,
  maxArmSlot: 0,
  maxInStepCm: 0,
  maxReleaseLateral: 0
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

const btnArmRight = document.getElementById('btn-arm-right');
const btnArmLeft = document.getElementById('btn-arm-left');
const btnToggleSkeleton = document.getElementById('btn-toggle-skeleton');

const carteModal = document.getElementById('carte-modal');
const btnCloseCarte = document.getElementById('btn-close-carte');
const carteHistoryList = document.getElementById('carte-history-list');
const playerSelectFilter = document.getElementById('player-select-filter');
const btnDeleteAction = document.getElementById('btn-delete-action');

function paintHero(el, tag, value, locked) {
  const safeTag = String(tag).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeVal = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  el.innerHTML = '<span class="phase-tag">' + safeTag + '</span><span class="phase-num">' + safeVal + '</span>';
  el.classList.toggle('is-locked', !!locked);
}

function paintSideKneeHero() {
  const sfc = records.ffKneeFlex !== null ? `${records.ffKneeFlex}°` : '--';
  const rel = records.releaseKneeFlex !== null ? `${records.releaseKneeFlex}°` : '--';
  const locked = records.ffKneeFlex !== null || records.releaseKneeFlex !== null;
  paintHero(c5Max, 'SFC/REL 前ヒザ', `${sfc} / ${rel}`, locked);
}

function showWaitingHeroes() {
  [c1Val, c2Val, c3Val, c4Val, c5Val, c6Val].forEach((el) => {
    el.textContent = '--';
  });
  if (selectedAngleMode === 'SIDE') {
    paintHero(c1Max, 'MAX ステップ', '--', false);
    paintHero(c2Max, 'MER 肩外旋', '--', false);
    paintHero(c3Max, 'MAX 捻転差', '--', false);
    paintHero(c4Max, 'RELEASE 高さ', '--', false);
    paintHero(c5Max, 'SFC/REL 前ヒザ', '-- / --', false);
    paintHero(c6Max, 'MAX 体幹前傾', '--', false);
  } else {
    paintHero(c1Max, 'SFC つま先', '--', false);
    paintHero(c2Max, 'SFC 膝角度', '--', false);
    paintHero(c3Max, 'MAX 側屈', '--', false);
    paintHero(c4Max, 'MAX 挙上', '--', false);
    paintHero(c5Max, 'MAX 踏出', '--', false);
    paintHero(c6Max, 'RELEASE 横幅', '--', false);
  }
}

function updateCardLabels() {
  const isLeft = (selectedThrowArm === 'LEFT');
  if (selectedAngleMode === 'SIDE') {
    angleModeBadge.textContent = "横向き解析 ⚾";
    angleModeBadge.style.background = "linear-gradient(135deg, #0284c7, #0369a1)";

    c1Title.textContent = "🚶 ステップ幅 (歩幅)";
    c2Title.textContent = isLeft ? "💪 うでのしなり (左肩外旋)" : "💪 うでのしなり (右肩外旋)";
    c3Title.textContent = "🔄 捻転差 (胸と腰のひねり)";
    c4Title.textContent = "⚾ 指先リリース高";
    c5Title.textContent = isLeft ? "🦵 前足ヒザ屈曲角度 (右足)" : "🦵 前足ヒザ屈曲角度 (左足)";
    c6Title.textContent = "📐 体幹の前傾角度 (倒れ)";
  } else {
    angleModeBadge.textContent = "正面・斜め前解析 🎯";
    angleModeBadge.style.background = "linear-gradient(135deg, #10b981, #059669)";

    c1Title.textContent = "👟 前足つま先の向き";
    c2Title.textContent = "🦵 前足ヒザの内外反";
    c3Title.textContent = "📐 上半身の傾き (体幹側屈)";
    c4Title.textContent = isLeft ? "💪 アームスロット (左腕)" : "💪 アームスロット (右腕)";
    c5Title.textContent = "🚶 踏み出しのズレ (イン/アウト)";
    c6Title.textContent = "⚾ リリース左右位置 (打点)";
  }
  showWaitingHeroes();
}

btnArmRight.addEventListener('click', () => {
  selectedThrowArm = 'RIGHT';
  btnArmRight.classList.add('active');
  btnArmLeft.classList.remove('active');
  updateCardLabels();
});

btnArmLeft.addEventListener('click', () => {
  selectedThrowArm = 'LEFT';
  btnArmLeft.classList.add('active');
  btnArmRight.classList.remove('active');
  updateCardLabels();
});

btnToggleSkeleton.addEventListener('click', () => {
  isSkeletonVisible = !isSkeletonVisible;
  btnToggleSkeleton.textContent = isSkeletonVisible ? "🦴 骨格" : "🦴 非表示";
  btnToggleSkeleton.style.background = isSkeletonVisible ? "#ffffff" : "linear-gradient(135deg, #38bdf8, #0284c7)";
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

async function handleVideoLoad(file, angleMode) {
  if (!file) return;
  selectedAngleMode = angleMode;

  if (videoFileUrl) {
    URL.revokeObjectURL(videoFileUrl);
    videoFileUrl = null;
  }
  videoFileUrl = URL.createObjectURL(file);
  
  videoElement.src = videoFileUrl;
  videoElement.load();

  updateCardLabels();
  setStep(2);
  await initMediaPipe();
  ensureScanVideoReady();
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

function ensureScanVideoReady() {
  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.currentTime = 0.001;
  
  videoElement.onloadeddata = () => {
    updateScanScreenSize();
    renderScanFrame();
  };
  setTimeout(() => {
    updateScanScreenSize();
    renderScanFrame();
  }, 150);
}

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
  playerName = pName || "せんしゅ1";

  const hVal = parseFloat(document.getElementById('height-input').value);
  userHeightCm = (Number.isFinite(hVal) && hVal >= 80 && hVal <= 220) ? hVal : 140;

  playerTagBadge.textContent = `👤 ${playerName} (${userHeightCm}cm)`;

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

var lastCalculatedLeadToePt = null;

outputCanvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    initialPinchDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    initialZoomScale = zoomScale;
  } else if (e.touches.length === 1) {
    const pt = getCanvasPoint(e, outputCanvas);
    if (selectedAngleMode === 'FRONT' && lastCalculatedLeadToePt) {
      const distToToe = Math.hypot(pt.x - lastCalculatedLeadToePt.x, pt.y - lastCalculatedLeadToePt.y);
      if (distToToe <= 35) {
        isDraggingToe = true;
        toeDragOrigin = { ...pt };
        return;
      }
    }
    if (zoomScale > 1.0) {
      isPanning = true;
      panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panSnapshot = { ...zoomPan };
    }
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
  } else if (e.touches.length === 1) {
    if (isDraggingToe) {
      const pt = getCanvasPoint(e, outputCanvas);
      const dx = pt.x - toeDragOrigin.x;
      manualToeOffsetDeg = Math.max(-30, Math.min(30, manualToeOffsetDeg + dx * 0.4));
      toeDragOrigin = { ...pt };
      processSingleFrame();
    } else if (isPanning && zoomScale > 1.0) {
      const dx = e.touches[0].clientX - panStart.x;
      const dy = e.touches[0].clientY - panStart.y;
      zoomPan.x = panSnapshot.x + dx;
      zoomPan.y = panSnapshot.y + dy;
      processSingleFrame();
    }
  }
}, { passive: true });

outputCanvas.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) initialPinchDistance = 0;
  if (e.touches.length === 0) {
    isPanning = false;
    isDraggingToe = false;
  }
});

document.getElementById('btn-zoom-reset').addEventListener('click', () => {
  zoomScale = 1.0;
  zoomPan = { x: 0, y: 0 };
  manualToeOffsetDeg = 0;
  updateZoomBadge();
  processSingleFrame();
});

document.getElementById('btn-manual-fc').addEventListener('click', () => {
  if (selectedAngleMode === 'FRONT') {
    records.fcToeAngle = currentCalculatedState.displayToeAngle;
    records.fcToeLabel = `べた足時: ${currentCalculatedState.displayToeAngle}° (${currentCalculatedState.toeStateLabel})`;
    records.ffValgusAngle = currentCalculatedState.kneeDevAngle;
    records.ffValgusLabel = `べた足時: ${currentCalculatedState.kneeDevAngle}° (${currentCalculatedState.kneeStateLabel})`;
    
    paintHero(c1Max, 'SFC つま先', `${records.fcToeAngle}°`, true);
    paintHero(c2Max, 'SFC 膝角度', `${records.ffValgusAngle}°`, true);
  } else {
    records.ffKneeFlex = currentCalculatedState.kneeFlexAngle;
    paintSideKneeHero();
  }
});

const STORAGE_KEY = 'pitching_ai_records_v1';

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
    throwArm: selectedThrowArm,
    mode: selectedAngleMode,
    feelGrade: "😆 めっちゃ良かった！",
    bodyCondition: "🟢 どこも痛くない！元気！",
    playerNote: "",
    metrics: selectedAngleMode === 'SIDE' ? {
      stride: records.maxStride,
      strideRatio: Math.round((records.maxStride / userHeightCm) * 100),
      mer: records.maxMER,
      twist: records.maxTwist,
      releaseH: records.maxRelease,
      ffKneeFlex: records.ffKneeFlex !== null ? records.ffKneeFlex : currentCalculatedState.kneeFlexAngle,
      releaseKneeFlex: records.releaseKneeFlex !== null ? records.releaseKneeFlex : currentCalculatedState.kneeFlexAngle,
      trunkTilt: records.maxTrunkTilt
    } : {
      toeAngle: records.fcToeAngle !== null ? records.fcToeAngle : 0,
      toeLabel: records.fcToeLabel || "未測定",
      valgus: records.ffValgusAngle !== null ? records.ffValgusAngle : records.maxValgus,
      valgusLabel: records.ffValgusLabel || "未測定",
      trunkLateral: records.maxTrunkLateral,
      armSlot: records.maxArmSlot,
      inStep: records.maxInStepCm,
      releaseLateral: records.maxReleaseLateral
    }
  };

  allRecords.unshift(newEntry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
    alert(`✅ ${playerName}君の測定データをカルテに保存しました！`);
  } catch (e) {
    alert("⚠️ 保存容量がいっぱいです");
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

function deleteSingleDayGroup(key) {
  if (confirm("この日の測定カルテを削除しますか？")) {
    let allRecords = getSavedRecords();
    allRecords = allRecords.filter(r => `${r.playerName}_${r.date}` !== key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
    renderCarteList(false);
  }
}

function shareRecordToLine(groupKey) {
  const allRecords = getSavedRecords();
  const groupRecords = allRecords.filter(r => `${r.playerName}_${r.date}` === groupKey);
  if (groupRecords.length === 0) return;

  const first = groupRecords[0];
  const sideRec = groupRecords.find(r => r.mode === 'SIDE');
  const frontRec = groupRecords.find(r => r.mode === 'FRONT');

  let text = `⚾ 【投球バイオメカニクス 選手レポート】 ⚾\n`;
  text += `👤 選手名: ${first.playerName} 選手 (${first.height}cm / ${first.throwArm === 'RIGHT' ? '右投げ' : '左投げ'})\n`;
  text += `📅 測定日: ${first.date}\n\n`;

  if (sideRec) {
    text += `📊 【横向き測定データ】\n`;
    text += `・ステップ幅: ${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio}%身)\n`;
    text += `・腕のしなり(肩外旋): ${sideRec.metrics.mer}°\n`;
    text += `・捻転差: ${sideRec.metrics.twist}°\n`;
    text += `・リリース高: ${sideRec.metrics.releaseH}cm\n`;
    text += `・前足ヒザ: FF時 屈曲 ${sideRec.metrics.ffKneeFlex}° (リリース時: 屈曲 ${sideRec.metrics.releaseKneeFlex}°)\n`;
    text += `・体幹前傾: ${sideRec.metrics.trunkTilt}°\n\n`;
  }

  if (frontRec) {
    text += `🎯 【正面測定データ】\n`;
    text += `・つま先の向き: ${frontRec.metrics.toeAngle}°\n`;
    text += `・ヒザ内外反: ${frontRec.metrics.valgus}°\n`;
    text += `・体幹の傾き: ${frontRec.metrics.trunkLateral}°\n`;
    text += `・アームスロット: ${frontRec.metrics.armSlot}°\n`;
    text += `・踏み出しズレ: ${frontRec.metrics.inStep}cm\n`;
    text += `・リリース横幅: ${frontRec.metrics.releaseLateral}cm\n\n`;
  }

  text += generatePitchingAICoachAdvice(first) + "\n\n";

  text += `👦 【せんしゅのふりかえり】\n`;
  text += `・なげた感覚: ${first.feelGrade || '😆 めっちゃ良かった！'}\n`;
  text += `・カラダの調子: ${first.bodyCondition || '🟢 どこも痛くない！元気！'}\n`;
  if (first.playerNote && first.playerNote.trim() !== '') {
    text += `・ひとこと: 「${first.playerNote.trim()}」\n`;
  }

  if (navigator.share) {
    navigator.share({
      title: `${first.playerName}選手の投球フォームレポート`,
      text: text
    }).catch(err => {
      if (err.name !== 'AbortError') console.log('Share error:', err);
    });
  } else {
    document.execCommand('copy');
    alert("📋 レポート文をクリップボードにコピーしました！\n" + text);
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

    const curFeel = first.feelGrade || "😆 めっちゃ良かった！";
    const curBody = first.bodyCondition || "🟢 どこも痛くない！元気！";

    const card = document.createElement('div');
    card.className = 'history-card';

    const aiAdviceHtml = generatePitchingAICoachAdvice(first).replace(/\n/g, '<br>');

    card.innerHTML = `
      <div class="history-card-head">
        <span>👤 ${first.playerName} (${first.height}cm・${first.throwArm === 'RIGHT' ? '右' : '左'})</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="color:#64748b; font-size:0.65rem;">📅 ${first.date}</span>
          <button class="btn-item-delete" data-group="${key}">🗑️</button>
        </div>
      </div>

      <div class="history-unified-grid">
        <div class="metric-section-block">
          <div class="metric-section-title">
            <span>⚾ 横向き解析</span>
            <span style="font-size:0.60rem; color:${sideRec ? '#10b981' : '#94a3b8'};">${sideRec ? '● 測定済' : '○ 未測定'}</span>
          </div>
          ${sideRec ? `
            <div class="metric-row-item"><span>🚶 ステップ幅:</span><b>${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio}%)</b></div>
            <div class="metric-row-item"><span>💪 腕のしなり:</span><b>${sideRec.metrics.mer}°</b></div>
            <div class="metric-row-item"><span>🔄 捻転差:</span><b>${sideRec.metrics.twist}°</b></div>
            <div class="metric-row-item"><span>⚾ リリース高:</span><b>${sideRec.metrics.releaseH}cm</b></div>
            <div class="metric-row-item"><span>🦵 FF時ヒザ:</span><b>屈曲 ${sideRec.metrics.ffKneeFlex}°</b></div>
            <div class="metric-row-item"><span>🦵 離球時ヒザ:</span><b>屈曲 ${sideRec.metrics.releaseKneeFlex}°</b></div>
            <div class="metric-row-item"><span>📐 体幹前傾:</span><b>${sideRec.metrics.trunkTilt}°</b></div>
          ` : `
            <div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">横向き動画の測定データなし</div>
          `}
        </div>

        <div class="metric-section-block">
          <div class="metric-section-title">
            <span>🎯 正面・斜め前解析</span>
            <span style="font-size:0.60rem; color:${frontRec ? '#10b981' : '#94a3b8'};">${frontRec ? '● 測定済' : '○ 未測定'}</span>
          </div>
          ${frontRec ? `
            <div class="metric-row-item"><span>👟 つま先向き:</span><b>${frontRec.metrics.toeAngle}°</b></div>
            <div class="metric-row-item"><span>🦵 膝内外反:</span><b>${frontRec.metrics.valgus}°</b></div>
            <div class="metric-row-item"><span>📐 体幹側屈:</span><b>${frontRec.metrics.trunkLateral}°</b></div>
            <div class="metric-row-item"><span>💪 腕の高さ:</span><b>${frontRec.metrics.armSlot}°</b></div>
            <div class="metric-row-item"><span>🚶 踏出ズレ:</span><b>${frontRec.metrics.inStep}cm</b></div>
            <div class="metric-row-item"><span>⚾ リリース横:</span><b>${frontRec.metrics.releaseLateral}cm</b></div>
          ` : `
            <div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">正面動画の測定データなし</div>
          `}
        </div>
      </div>

      <div class="ai-coach-card">
        <div class="ai-coach-title">🤖 投球バイオメカニクス AIコーチ診断</div>
        <div class="ai-coach-text">${aiAdviceHtml}</div>
      </div>

      <div class="player-reflection-box">
        <div class="reflection-sec-title">⚾ 今日のなげた感覚は？</div>
        <div class="chip-group" data-type="feel" data-group="${key}">
          <div class="choice-chip ${curFeel.includes('良かった') ? 'active' : ''}" data-val="😆 めっちゃ良かった！">😆 良かった</div>
          <div class="choice-chip ${curFeel.includes('ふつう') ? 'active' : ''}" data-val="😊 ふつう・いつも通り">😊 いつも通り</div>
          <div class="choice-chip ${curFeel.includes('いまいち') ? 'active' : ''}" data-val="😣 いまいち / タイミング合わず">😣 いまいち</div>
        </div>

        <div class="reflection-sec-title">💪 カラダの調子・違和感</div>
        <div class="chip-group" data-type="body" data-group="${key}">
          <div class="choice-chip ${curBody.includes('痛くない') ? 'active' : ''}" data-val="🟢 どこも痛くない！元気！">🟢 痛くない</div>
          <div class="choice-chip ${curBody.includes('重い') ? 'active' : ''}" data-val="🟡 ひじ・肩がちょっと重い">🟡 ちょっと重い</div>
          <div class="choice-chip ${curBody.includes('違和感') || (curBody.includes('痛みあり') && !curBody.includes('痛くない')) ? 'active' : ''}" data-val="🔴 ひじ・肩に違和感・痛みあり">🔴 違和感あり</div>
        </div>

        <div class="reflection-sec-title">📝 じぶんの気づき、監督、お父さん、お母さんへひとこと</div>
        <textarea class="player-textarea" data-group="${key}" placeholder="気づいたことや、次にやってみたいことを書いてね！">${first.playerNote || ''}</textarea>

        <button class="btn-share-line" data-group="${key}">
          <span>💬 📤 今日の総合レポートを監督に送る</span>
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
      deleteSingleDayGroup(groupKey);
    });
  });
}

playerSelectFilter.addEventListener('change', () => renderCarteList(false));

btnDeleteAction.addEventListener('click', () => {
  const selectedFilter = playerSelectFilter.value;
  let allRecords = getSavedRecords();
  if (allRecords.length === 0) return;

  if (selectedFilter === 'ALL') {
    if (confirm("⚠️ 【注意】すべての選手のカルテデータを完全に初期化しますか？")) {
      localStorage.removeItem(STORAGE_KEY);
      renderCarteList(false);
    }
  } else {
    if (confirm(`👤 ${selectedFilter} 選手のすべての測定データを削除しますか？`)) {
      allRecords = allRecords.filter(r => r.playerName !== selectedFilter);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
      renderCarteList(false);
    }
  }
});

document.getElementById('btn-export-csv').addEventListener('click', () => {
  const allRecords = getSavedRecords();
  if (allRecords.length === 0) {
    alert("保存されたデータがありません");
    return;
  }

  let csvContent = "\uFEFF日付,選手名,身長,利き腕,測定向き,歩幅(cm),歩幅率(%),肩外旋(deg),捻転差(deg),リリース高(cm),FF時ヒザ屈曲(deg),リリース時ヒザ屈曲(deg),体幹前傾(deg),つま先角度(deg),ヒザ内外反(deg),体幹側屈(deg),アームスロット(deg),ステップズレ(cm),リリース横幅(cm),なげた感覚,カラダの調子,選手コメント\n";

  allRecords.forEach(r => {
    const isSide = (r.mode === 'SIDE');
    const noteSafe = `"${(r.playerNote || '').replace(/"/g, '""')}"`;
    const row = [
      `"${r.date}"`,
      `"${r.playerName}"`,
      r.height,
      r.throwArm === 'RIGHT' ? "右" : "左",
      isSide ? "横向き" : "正面",
      isSide ? r.metrics.stride : "",
      isSide ? r.metrics.strideRatio : "",
      isSide ? r.metrics.mer : "",
      isSide ? r.metrics.twist : "",
      isSide ? r.metrics.releaseH : "",
      isSide ? r.metrics.ffKneeFlex : "",
      isSide ? r.metrics.releaseKneeFlex : "",
      isSide ? r.metrics.trunkTilt : "",
      !isSide ? r.metrics.toeAngle : "",
      !isSide ? r.metrics.valgus : "",
      !isSide ? r.metrics.trunkLateral : "",
      !isSide ? r.metrics.armSlot : "",
      !isSide ? r.metrics.inStep : "",
      !isSide ? r.metrics.releaseLateral : "",
      `"${r.feelGrade || '😆 良かった'}"`,
      `"${r.bodyCondition || '🟢 痛くない'}"`,
      noteSafe
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `投球AIカルテ_${new Date().toISOString().slice(0,10)}.csv`);
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
    btnPlayPause.style.background = "linear-gradient(135deg, #ff9f43, #ff5252)";
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
    maxStride: 0, maxMER: 0, maxTwist: 0, maxRelease: 0, ffKneeFlex: null, releaseKneeFlex: null, maxTrunkTilt: 0,
    toeAngle: 0, fcToeAngle: null, fcToeLabel: null, maxValgus: 0, ffValgusAngle: null, ffValgusLabel: null, maxTrunkLateral: 0, maxArmSlot: 0, maxInStepCm: 0, maxReleaseLateral: 0
  };
  smoothToeDeg = 0;
  manualToeOffsetDeg = 0;
  prevLeadToeY = null;
  leadFootFlatStationaryCount = 0;

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
  smoothToeDeg = 0;
  manualToeOffsetDeg = 0;
  prevLeadToeY = null;
  leadFootFlatStationaryCount = 0;
  updateZoomBadge();
  setStep(1);
});
