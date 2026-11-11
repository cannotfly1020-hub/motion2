const fs = require('fs');
const path = require('path');

const ICON_SVG = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 背景グラデーション: 深いミッドナイトスレート -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <!-- 白球の自然な球体グラデーション -->
    <radialGradient id="ballGrad" cx="38%" cy="36%" r="68%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </radialGradient>

    <!-- 球体のドロップシャドウ -->
    <filter id="ballShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.45" />
    </filter>

    <!-- 一閃する加速キネマティック軌道のグラデーション（エメラルド → ロイヤルブルー → オレンジ） -->
    <linearGradient id="arcGrad" x1="180" y1="820" x2="840" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="45%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#f97316" />
    </linearGradient>
  </defs>

  <!-- 1. 背景 -->
  <rect width="1024" height="1024" fill="url(#bgGrad)" />

  <!-- 2. 白球（シャドウ付き） -->
  <circle cx="512" cy="512" r="360" fill="url(#ballGrad)" filter="url(#ballShadow)" />

  <!-- 3. 野球ボールの自然な赤いシーム曲線（左シーム & 右シーム） -->
  <g stroke="#dc2626" stroke-linecap="round" stroke-linejoin="round">
    <!-- 左シーム主線 -->
    <path d="M 310 200 C 420 340 420 684 310 824" stroke-width="16" opacity="0.95" />
    <!-- 右シーム主線 -->
    <path d="M 714 200 C 604 340 604 684 714 824" stroke-width="16" opacity="0.95" />

    <!-- 左シームの縫い目（立体感のあるハッシュマーク） -->
    <path d="M 290 280 L 325 300" stroke-width="10" />
    <path d="M 335 365 L 372 380" stroke-width="10" />
    <path d="M 358 455 L 398 460" stroke-width="10" />
    <path d="M 358 569 L 398 564" stroke-width="10" />
    <path d="M 335 659 L 372 644" stroke-width="10" />
    <path d="M 290 744 L 325 724" stroke-width="10" />

    <!-- 右シームの縫い目 -->
    <path d="M 734 280 L 699 300" stroke-width="10" />
    <path d="M 689 365 L 652 380" stroke-width="10" />
    <path d="M 666 455 L 626 460" stroke-width="10" />
    <path d="M 666 569 L 626 564" stroke-width="10" />
    <path d="M 689 659 L 652 644" stroke-width="10" />
    <path d="M 734 744 L 699 724" stroke-width="10" />
  </g>

  <!-- 4. 斜めに一閃する鮮烈な加速軌道（キネマティック・アーク） -->
  <!-- 下敷き（わずかなコントラスト枠） -->
  <path d="M 210 790 C 270 480 500 270 820 220" stroke="#0f172a" stroke-width="40" stroke-linecap="round" opacity="0.15" />
  <!-- メイン加速ライン -->
  <path d="M 210 790 C 270 480 500 270 820 220" stroke="url(#arcGrad)" stroke-width="26" stroke-linecap="round" />

  <!-- 5. 計測ノード（始点: タメ・エメラルド / 終点: インパクト・オレンジ） -->
  <!-- 始点ノード（左下） -->
  <circle cx="210" cy="790" r="22" fill="#059669" />
  <circle cx="210" cy="790" r="10" fill="#ffffff" />

  <!-- 加速変曲点ノード（中央やや右上） -->
  <circle cx="490" cy="380" r="16" fill="#2563eb" />
  <circle cx="490" cy="380" r="7" fill="#ffffff" />

  <!-- 終点インパクトノード（右上: 最大ピーク） -->
  <circle cx="820" cy="220" r="32" fill="#f97316" />
  <circle cx="820" cy="220" r="15" fill="#ffffff" />
</svg>
`;

const root = path.resolve(__dirname, '..');
const resourcesDir = path.join(root, 'resources');
const iconSvgPath = path.join(resourcesDir, 'icon.svg');
const iconMasterPath = path.join(resourcesDir, 'icon-master.jpg');
const iconPngPath = path.join(resourcesDir, 'icon.png');
const splashPngPath = path.join(resourcesDir, 'splash.png');
const splashDarkPngPath = path.join(resourcesDir, 'splash-dark.png');
const background = { r: 11, g: 19, b: 41 };
const appIconPath = path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const icon512Path = path.join(root, 'icon-512.png');
const icon192Path = path.join(root, 'icon-192.png');
const assetIconPath = path.join(root, 'assets/icon-only.png');
const assetLogoPath = path.join(root, 'assets/logo.png');

function writeSvg() {
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.writeFileSync(iconSvgPath, ICON_SVG);
}

async function publishIcon(icon) {
  const sharp = require('sharp');
  fs.mkdirSync(path.dirname(appIconPath), { recursive: true });
  fs.mkdirSync(path.dirname(assetIconPath), { recursive: true });
  fs.writeFileSync(iconPngPath, icon);
  fs.writeFileSync(appIconPath, icon);
  fs.writeFileSync(assetIconPath, icon);
  fs.writeFileSync(assetLogoPath, icon);
  fs.writeFileSync(icon512Path, await sharp(icon).resize(512, 512).flatten({ background }).removeAlpha().png().toBuffer());
  fs.writeFileSync(icon192Path, await sharp(icon).resize(192, 192).flatten({ background }).removeAlpha().png().toBuffer());
}

async function rasterizeWithSharp() {
  const sharp = require('sharp');
  const source = fs.existsSync(iconMasterPath)
    ? iconMasterPath
    : Buffer.from(ICON_SVG);
  const icon = await sharp(source, fs.existsSync(iconMasterPath) ? undefined : { density: 72 })
    .resize(1024, 1024, { fit: 'fill' })
    .flatten({ background })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
  const meta = await sharp(icon).metadata();
  if (meta.width !== 1024 || meta.height !== 1024 || meta.hasAlpha) {
    throw new Error('icon.png must be 1024x1024 without alpha');
  }
  await publishIcon(icon);

  const mark = await sharp(icon).resize(1080, 1080).toBuffer();
  const splash = await sharp({
    create: { width: 2732, height: 2732, channels: 3, background }
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .flatten({ background })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(splashPngPath, splash);
  fs.writeFileSync(splashDarkPngPath, splash);
}

async function rasterizeWithSips(svgPath) {
  const { execFileSync } = require('child_process');
  const tmp = path.join(resourcesDir, '.icon-render.png');
  execFileSync('qlmanage', ['-t', '-s', '1024', '-o', resourcesDir, svgPath], { stdio: 'ignore' });
  const rendered = svgPath + '.png';
  if (!fs.existsSync(rendered)) {
    throw new Error('qlmanage did not write a PNG');
  }
  execFileSync('sips', ['-s', 'format', 'png', '-z', '1024', '1024', rendered, '--out', tmp], { stdio: 'ignore' });
  fs.renameSync(tmp, iconPngPath);
  fs.rmSync(rendered, { force: true });
  await publishIcon(fs.readFileSync(iconPngPath));
}

async function main() {
  writeSvg();
  try {
    await rasterizeWithSharp();
  } catch (error) {
    process.stderr.write('sharp rasterize failed, falling back: ' + error.message + '\n');
    await rasterizeWithSips(iconSvgPath);
  }
  process.stdout.write('resources/icon.svg\nresources/icon.png 1024x1024\nicon-512.png\nicon-192.png\nAppIcon-512@2x.png\n');
}

main().catch((error) => {
  process.stderr.write(error.stack + '\n');
  process.exit(1);
});
