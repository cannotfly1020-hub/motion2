const fs = require('fs');
const path = require('path');

const ICON_SVG = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景: 高級感のある深いミッドナイトスレート -->
  <rect width="1024" height="1024" fill="#0b1329" />
  
  <!-- 野球ボールのベース円（マットホワイト/ライトスレート） -->
  <circle cx="512" cy="512" r="380" fill="#f8fafc" />
  
  <!-- 野球ボールの赤いステッチライン（左・右のシーム） -->
  <path d="M 330 180 C 400 320 400 704 330 844" stroke="#dc2626" stroke-width="20" stroke-linecap="round" />
  <path d="M 694 180 C 624 320 624 704 694 844" stroke="#dc2626" stroke-width="20" stroke-linecap="round" />
  
  <!-- 赤いステッチの縫い目（端正なハッシュマーク） -->
  <path d="M 315 260 L 345 280 M 355 350 L 385 365 M 365 450 L 395 455 M 365 570 L 395 565 M 355 670 L 385 655 M 315 760 L 345 740" stroke="#dc2626" stroke-width="12" stroke-linecap="round" />
  <path d="M 709 260 L 679 280 M 669 350 L 639 365 M 659 450 L 629 455 M 659 570 L 629 565 M 669 670 L 639 655 M 709 760 L 679 740" stroke="#dc2626" stroke-width="12" stroke-linecap="round" />
  
  <!-- バイオメカニクスの運動連鎖シンボル: トップ（青）とインパクト（橙）の交差軌道 -->
  <!-- 軌道1（青: タメ・トップ） -->
  <path d="M 240 680 C 240 400 420 280 620 280" stroke="#2563eb" stroke-width="32" stroke-linecap="round" />
  <!-- 軌道2（橙: 加速・インパクト/リリース） -->
  <path d="M 400 740 C 600 740 780 620 780 340" stroke="#f97316" stroke-width="32" stroke-linecap="round" />
  
  <!-- 計測関節ノード（幾何学的にソリッドな白＋テーマカラーのリング） -->
  <!-- トップ位置ノード（青） -->
  <circle cx="620" cy="280" r="32" fill="#2563eb" />
  <circle cx="620" cy="280" r="16" fill="#ffffff" />
  
  <!-- 接地・タメ位置ノード（エメラルド） -->
  <circle cx="240" cy="680" r="26" fill="#059669" />
  <circle cx="240" cy="680" r="12" fill="#ffffff" />
  
  <!-- インパクト/リリース位置ノード（橙） -->
  <circle cx="780" cy="340" r="36" fill="#f97316" />
  <circle cx="780" cy="340" r="18" fill="#ffffff" />

  <!-- 幾何学アライメントの基準点（センターハブ） -->
  <circle cx="512" cy="512" r="16" fill="#0f172a" />
</svg>
`;

const root = path.resolve(__dirname, '..');
const resourcesDir = path.join(root, 'resources');
const iconSvgPath = path.join(resourcesDir, 'icon.svg');
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
  const icon = await sharp(Buffer.from(ICON_SVG), { density: 72 })
    .resize(1024, 1024, { fit: 'fill' })
    .flatten({ background })
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
