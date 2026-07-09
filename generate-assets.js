/* eslint-disable */
/**
 * Generates every image asset Locket needs, so the repo has no binary blobs
 * checked in by hand:
 *   - assets/icon.png            (1024, app icon — gold locket on warm dark)
 *   - assets/adaptive-icon.png   (1024, Android adaptive foreground, transparent)
 *   - assets/splash.png          (1024, splash artwork)
 *   - assets/notification-icon.png (96, white silhouette for Android)
 *   - assets/favicon.png         (48)
 *   - assets/grain.png           (128, tileable film grain)
 *   - assets/paper-texture.png   (256, tileable warm paper fibre)
 *
 * Run with: npm run generate-assets
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });

const INK = '#1A1410';

// The locket artwork, in a 0..100 viewBox. `mono` renders a flat white
// silhouette (for notification icons); otherwise it's the full gold locket.
function locketPaths(mono) {
  if (mono) {
    return `
      <path d="M50 12 C50 12 37 4 28 13 C19 22 19 33 19 33 L19 80 C19 87 25 92 33 92 L67 92 C75 92 81 87 81 80 L81 33 C81 33 81 22 72 13 C63 4 50 12 50 12Z" fill="#FFFFFF"/>
      <circle cx="50" cy="53" r="15" fill="none" stroke="${INK}" stroke-width="4"/>
      <circle cx="50" cy="53" r="4" fill="${INK}"/>
      <ellipse cx="50" cy="9" rx="4" ry="5" fill="none" stroke="#FFFFFF" stroke-width="3"/>
    `;
  }
  return `
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E8C87E"/>
        <stop offset="50%" stop-color="#C9A96E"/>
        <stop offset="100%" stop-color="#A8883E"/>
      </linearGradient>
      <linearGradient id="inner" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2C1810"/>
        <stop offset="100%" stop-color="#1A1410"/>
      </linearGradient>
    </defs>
    <path d="M50 15 C50 15 38 8 30 16 C22 24 22 34 22 34 L22 78 C22 84 27 88 34 88 L66 88 C73 88 78 84 78 78 L78 34 C78 34 78 24 70 16 C62 8 50 15 50 15Z" fill="url(#g)"/>
    <path d="M50 18 C50 18 40 12 33 19 C26 26 26 35 26 35 L26 75 C26 80 30 83 35 83 L65 83 C70 83 74 80 74 75 L74 35 C74 35 74 26 67 19 C60 12 50 18 50 18Z" fill="url(#inner)"/>
    <circle cx="50" cy="52" r="14" fill="none" stroke="#C9A96E" stroke-width="1.5" stroke-opacity="0.6"/>
    <circle cx="50" cy="52" r="8" fill="none" stroke="#C9A96E" stroke-width="1" stroke-opacity="0.4"/>
    <circle cx="50" cy="52" r="3" fill="#C9A96E" fill-opacity="0.75"/>
    <g fill="#C9A96E" fill-opacity="0.35">
      <path d="M50 38 L52 44 L48 44 Z"/>
      <path d="M50 38 L52 44 L48 44 Z" transform="rotate(45 50 52)"/>
      <path d="M50 38 L52 44 L48 44 Z" transform="rotate(90 50 52)"/>
      <path d="M50 38 L52 44 L48 44 Z" transform="rotate(135 50 52)"/>
    </g>
    <ellipse cx="50" cy="15" rx="6" ry="4" fill="#A8883E"/>
    <ellipse cx="50" cy="14" rx="4" ry="2.5" fill="#C9A96E"/>
    <ellipse cx="50" cy="9" rx="3" ry="4" fill="none" stroke="#C9A96E" stroke-width="1.5"/>
    <path d="M34 24 C36 20 42 17 48 18" fill="none" stroke="#F0DC9A" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.5"/>
  `;
}

function iconSVG({ size, background, scale = 1, wordmark = false }) {
  const bg = background
    ? `<rect width="100" height="100" rx="22" fill="${background}"/>`
    : '';
  const g = `<g transform="translate(50 ${wordmark ? 42 : 50}) scale(${scale}) translate(-50 -50)">${locketPaths(false)}</g>`;
  const text = wordmark
    ? `<text x="50" y="88" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="#C9A96E">Locket</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${bg}${g}${text}</svg>`;
}

function monoSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><g transform="translate(50 50) scale(0.82) translate(-50 -50)">${locketPaths(true)}</g></svg>`;
}

async function renderSVG(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(ASSETS, file));
  console.log('  ✓', file);
}

// Procedural tileable noise for film grain (sparse black/white speckle).
async function grain(size, file) {
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const r = Math.random();
    const v = r < 0.5 ? 0 : 255;
    const a = Math.random() < 0.5 ? Math.floor(Math.random() * 90) : 0;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = a;
  }
  await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toFile(path.join(ASSETS, file));
  console.log('  ✓', file);
}

// Warm, faint paper fibre — mostly transparent with occasional darker warm flecks.
async function paper(size, file) {
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const speck = Math.random() < 0.12;
    const a = speck ? Math.floor(Math.random() * 26) : 0;
    // warm brown fleck
    data[i * 4] = 74;
    data[i * 4 + 1] = 55;
    data[i * 4 + 2] = 40;
    data[i * 4 + 3] = a;
  }
  await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toFile(path.join(ASSETS, file));
  console.log('  ✓', file);
}

(async () => {
  console.log('Generating Locket assets…');
  await renderSVG(iconSVG({ size: 1024, background: INK, scale: 0.92 }), 'icon.png');
  await renderSVG(iconSVG({ size: 1024, background: null, scale: 0.66 }), 'adaptive-icon.png');
  await renderSVG(iconSVG({ size: 1024, background: INK, scale: 0.7, wordmark: true }), 'splash.png');
  await renderSVG(monoSVG(96), 'notification-icon.png');
  await renderSVG(iconSVG({ size: 48, background: INK, scale: 0.9 }), 'favicon.png');
  await grain(128, 'grain.png');
  await paper(256, 'paper-texture.png');
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
