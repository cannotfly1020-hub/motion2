var guideSheetRoot = null;
var guideSheetTimer = null;
var guideSheetOpen = false;
var guideReturnFocus = null;
var guideDrag = null;

function guideSheetMarkup() {
  return ''
    + '<div class="guide-root" id="guide-root" hidden>'
    + '  <div class="guide-sheet" role="dialog" aria-modal="true" aria-labelledby="guide-title">'
    + '    <div class="guide-grab" aria-hidden="true"></div>'
    + '    <div class="guide-toolbar">'
    + '      <h2 id="guide-title">使い方ガイド</h2>'
    + '      <button type="button" class="guide-close" id="guide-close" aria-label="閉じる">✕</button>'
    + '    </div>'
    + '    <div class="guide-tabs" role="tablist" aria-label="ガイドの項目">'
    + '      <button type="button" class="guide-tab is-active" role="tab" data-guide-tab="capture" aria-selected="true">撮影</button>'
    + '      <button type="button" class="guide-tab" role="tab" data-guide-tab="scale" aria-selected="false">補正</button>'
    + '      <button type="button" class="guide-tab" role="tab" data-guide-tab="snap" aria-selected="false">スナップ</button>'
    + '      <button type="button" class="guide-tab" role="tab" data-guide-tab="notice" aria-selected="false">免責</button>'
    + '    </div>'
    + '    <div class="guide-body">'
    + '      <section class="guide-panel" data-guide-panel="capture">'
    + '        <h3>精度を上げる「撮影の4原則」</h3>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">🎥</span><div><strong>真横 90° から撮影</strong><p>打者・投手の真横（側面）にカメラを構えます。斜めになると、関節の角度が画像の上で歪みます。</p></div></article>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">🎥</span><div><strong>カメラの高さはおへそ（腰）</strong><p>見下ろしや煽りを避け、地面と垂直に構えます。三脚で固定すると安定します。</p></div></article>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">🎥</span><div><strong>頭から足先まで全身を収める</strong><p>スパイクや、リリース時の手元が切れると、骨格の検出が途切れます。</p></div></article>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">🎥</span><div><strong>屋外、または明るい照明の下で</strong><p>速いスイングでは手首やバットがぶれやすくなります。明るい場所で撮ると輪郭が残りやすいです。</p></div></article>'
    + '      </section>'
    + '      <section class="guide-panel" data-guide-panel="scale" hidden>'
    + '        <h3>「水平補正」と「身長スケール」</h3>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">📐</span><div><strong>地面の傾きをゼロに</strong><p>解析画面の「📐 水平補正」を押し、シアンの破線をグラウンドや白線に合わせます。スマホの傾き分を、角度の計算から差し引きます。</p></div></article>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">📐</span><div><strong>実寸 cm で動きを見る</strong><p>身長を入れると、頭の移動やステップ幅が画像の比率ではなく cm で出ます。</p></div></article>'
    + '      </section>'
    + '      <section class="guide-panel" data-guide-panel="snap" hidden>'
    + '        <h3>「自動スナップ」と微調整</h3>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">⚡️</span><div><strong>切り返しと着地を自動で置く</strong><p>スキャンが終わると、手首の動きの切り返しと前足の着地を手がかりに、トップとインパクトへ残像を置きます。投球ではべた足とリリースです。シークバーはそのコマの近くで吸着します。</p></div></article>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">⚡️</span><div><strong>いつでも手動で上書き</strong><p>シークバーを動かして「あと1コマ前だな」と思ったら、そのコマの決定ボタンを押せます。押した位置が優先されます。</p></div></article>'
    + '      </section>'
    + '      <section class="guide-panel" data-guide-panel="notice" hidden>'
    + '        <h3>免責事項・ご利用にあたって</h3>'
    + '        <article class="guide-tip"><span class="guide-tip-icon" aria-hidden="true">🛡️</span><div><strong>医療行為ではありません</strong><p class="guide-disclaimer">本アプリが提供するバイオメカニクス解析およびAIトレーナーの診断・推奨ドリルは、動作改善やコンディショニングの補助を目的としたものであり、医学的診断や怪我の治療を保証するものではありません。強い痛みや違和感がある場合は、直ちに運動を中止し専門の医師や理学療法士にご相談ください。</p></div></article>'
    + '      </section>'
    + '    </div>'
    + '  </div>'
    + '</div>';
}

function ensureGuideSheet() {
  if (guideSheetRoot) return guideSheetRoot;
  var holder = document.createElement('div');
  holder.innerHTML = guideSheetMarkup();
  guideSheetRoot = holder.firstElementChild;
  document.body.appendChild(guideSheetRoot);
  guideSheetRoot.addEventListener('click', function(event) {
    if (event.target === guideSheetRoot) closeGuideSheet();
  });
  guideSheetRoot.querySelector('#guide-close').addEventListener('click', closeGuideSheet);
  var tabs = guideSheetRoot.querySelectorAll('[data-guide-tab]');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function(event) {
      selectGuideTab(event.currentTarget.getAttribute('data-guide-tab'));
    });
  }
  var handle = guideSheetRoot.querySelector('.guide-grab');
  var toolbar = guideSheetRoot.querySelector('.guide-toolbar');
  handle.addEventListener('pointerdown', guideDragStart);
  toolbar.addEventListener('pointerdown', guideDragStart);
  return guideSheetRoot;
}

function selectGuideTab(name) {
  if (!guideSheetRoot) return;
  var tabs = guideSheetRoot.querySelectorAll('[data-guide-tab]');
  var panels = guideSheetRoot.querySelectorAll('[data-guide-panel]');
  for (var i = 0; i < tabs.length; i++) {
    var on = tabs[i].getAttribute('data-guide-tab') === name;
    tabs[i].classList.toggle('is-active', on);
    tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
  }
  for (var j = 0; j < panels.length; j++) {
    panels[j].hidden = panels[j].getAttribute('data-guide-panel') !== name;
  }
  var body = guideSheetRoot.querySelector('.guide-body');
  if (body) body.scrollTop = 0;
}

function openGuideSheet() {
  var root = ensureGuideSheet();
  if (guideSheetTimer) {
    clearTimeout(guideSheetTimer);
    guideSheetTimer = null;
  }
  guideReturnFocus = document.activeElement;
  root.hidden = false;
  root.classList.remove('is-closing');
  void root.offsetWidth;
  root.classList.add('is-open');
  guideSheetOpen = true;
  document.body.classList.add('guide-open');
  var closeButton = root.querySelector('#guide-close');
  if (closeButton) closeButton.focus();
}

function closeGuideSheet() {
  if (!guideSheetRoot || !guideSheetOpen) return;
  guideSheetOpen = false;
  guideSheetRoot.classList.remove('is-open');
  guideSheetRoot.classList.add('is-closing');
  document.body.classList.remove('guide-open');
  var back = guideReturnFocus;
  guideReturnFocus = null;
  guideSheetTimer = setTimeout(function() {
    guideSheetTimer = null;
    if (!guideSheetOpen && guideSheetRoot) {
      guideSheetRoot.hidden = true;
      guideSheetRoot.classList.remove('is-closing');
    }
  }, 280);
  if (back && typeof back.focus === 'function') back.focus();
}

function guideDragStart(event) {
  if (!guideSheetOpen) return;
  if (event.button != null && event.button !== 0) return;
  if (event.target && event.target.closest && event.target.closest('button')) return;
  var sheet = guideSheetRoot.querySelector('.guide-sheet');
  guideDrag = { y: event.clientY, sheet: sheet };
  sheet.style.transition = 'none';
  if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.addEventListener('pointermove', guideDragMove);
  event.currentTarget.addEventListener('pointerup', guideDragEnd);
  event.currentTarget.addEventListener('pointercancel', guideDragEnd);
}

function guideDragMove(event) {
  if (!guideDrag) return;
  var dy = Math.max(0, event.clientY - guideDrag.y);
  guideDrag.dy = dy;
  guideDrag.sheet.style.transform = 'translateY(' + dy + 'px)';
}

function guideDragEnd(event) {
  if (!guideDrag) return;
  var dy = guideDrag.dy || 0;
  var sheet = guideDrag.sheet;
  event.currentTarget.removeEventListener('pointermove', guideDragMove);
  event.currentTarget.removeEventListener('pointerup', guideDragEnd);
  event.currentTarget.removeEventListener('pointercancel', guideDragEnd);
  sheet.style.transition = '';
  sheet.style.transform = '';
  guideDrag = null;
  if (dy > 72) closeGuideSheet();
}

function bindGuideTriggers() {
  var nodes = document.querySelectorAll('#btn-setup-guide, #home-guide-open');
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].getAttribute('data-guide-bound') === '1') continue;
    nodes[i].setAttribute('data-guide-bound', '1');
    nodes[i].addEventListener('click', function(event) {
      event.preventDefault();
      openGuideSheet();
    });
  }
}

function bootGuideSheet() {
  bindGuideTriggers();
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeGuideSheet();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootGuideSheet);
else bootGuideSheet();
