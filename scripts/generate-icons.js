import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Regular icon SVG (512x512)
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917" />
      <stop offset="50%" stop-color="#0c0a09" />
      <stop offset="100%" stop-color="#14110f" />
    </linearGradient>
    <linearGradient id="amberGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="redAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#b91c1c" />
    </linearGradient>
    <linearGradient id="blueAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="emeraldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background rounded card -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)"/>
  <rect x="12" y="12" width="488" height="488" rx="103" fill="none" stroke="url(#amberGold)" stroke-width="4" stroke-opacity="0.35"/>

  <!-- Subtle glow ring -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="8 8" opacity="0.25"/>

  <!-- Centered Game Board Pattern & Dice Motif -->
  <g filter="url(#shadow)">
    <!-- Diagonal Playing Card (Left) -->
    <g transform="translate(145, 175) rotate(-18)">
      <rect x="-48" y="-70" width="96" height="140" rx="12" fill="#fafaf9" stroke="#e7e5e4" stroke-width="2"/>
      <rect x="-42" y="-64" width="84" height="128" rx="8" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-opacity="0.4"/>
      <!-- Heart icon -->
      <path d="M0 -15 C -8 -30, -26 -22, -26 -5 C -26 12, 0 30, 0 35 C 0 30, 26 12, 26 -5 C 26 -22, 8 -30, 0 -15 Z" fill="#dc2626"/>
      <!-- Small Corner Ace -->
      <text x="-36" y="-42" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="#dc2626" text-anchor="middle">A</text>
    </g>

    <!-- Diagonal Playing Card (Right) -->
    <g transform="translate(365, 175) rotate(18)">
      <rect x="-48" y="-70" width="96" height="140" rx="12" fill="#fafaf9" stroke="#e7e5e4" stroke-width="2"/>
      <rect x="-42" y="-64" width="84" height="128" rx="8" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-opacity="0.4"/>
      <!-- Spade icon -->
      <path d="M0 -22 C -6 -7, -24 -4, -24 10 C -24 20, -12 25, 0 16 C 12 25, 24 20, 24 10 C 24 -4, 6 -7, 0 -22 Z" fill="#0f172a"/>
      <path d="M-5 18 L5 18 L10 32 L-10 32 Z" fill="#0f172a"/>
      <!-- Small Corner King -->
      <text x="36" y="-42" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="#0f172a" text-anchor="middle">K</text>
    </g>

    <!-- 3D Style Golden Dice in Center -->
    <g transform="translate(256, 215)">
      <!-- Dice shadow -->
      <ellipse cx="0" cy="72" rx="70" ry="18" fill="#000000" opacity="0.45"/>
      <!-- Dice main body (rounded rect rotated) -->
      <rect x="-62" y="-62" width="124" height="124" rx="26" fill="url(#amberGold)" stroke="#fef3c7" stroke-width="3"/>
      <!-- Dice inner gradient highlight -->
      <path d="M -56 -40 C -56 -52, -48 -58, -36 -58 L 36 -58 C 16 -40, -40 -16, -56 -40 Z" fill="#ffffff" opacity="0.3"/>
      
      <!-- 5 Pips (Die face 5) -->
      <circle cx="-32" cy="-32" r="10" fill="#1c1917"/>
      <circle cx="32" cy="-32" r="10" fill="#1c1917"/>
      <circle cx="0" cy="0" r="10.5" fill="#1c1917"/>
      <circle cx="-32" cy="32" r="10" fill="#1c1917"/>
      <circle cx="32" cy="32" r="10" fill="#1c1917"/>
      
      <!-- Pip reflections -->
      <circle cx="-34" cy="-34" r="3" fill="#ffffff" opacity="0.7"/>
      <circle cx="30" cy="-34" r="3" fill="#ffffff" opacity="0.7"/>
      <circle cx="-2" cy="-2" r="3" fill="#ffffff" opacity="0.7"/>
      <circle cx="-34" cy="30" r="3" fill="#ffffff" opacity="0.7"/>
      <circle cx="30" cy="30" r="3" fill="#ffffff" opacity="0.7"/>
    </g>

    <!-- 4 Colorful Pawns / Carrom Coins around -->
    <!-- Red pawn -->
    <circle cx="118" cy="305" r="22" fill="url(#redAccent)" stroke="#fca5a5" stroke-width="2.5"/>
    <circle cx="118" cy="305" r="9" fill="#ffffff" opacity="0.6"/>
    <!-- Blue pawn -->
    <circle cx="394" cy="305" r="22" fill="url(#blueAccent)" stroke="#bae6fd" stroke-width="2.5"/>
    <circle cx="394" cy="305" r="9" fill="#ffffff" opacity="0.6"/>
    <!-- Emerald pawn -->
    <circle cx="178" cy="365" r="20" fill="url(#emeraldAccent)" stroke="#a7f3d0" stroke-width="2.5"/>
    <!-- Amber pawn -->
    <circle cx="334" cy="365" r="20" fill="url(#amberGold)" stroke="#fde68a" stroke-width="2.5"/>
  </g>

  <!-- Arabic Typography "جمعة" at bottom -->
  <g transform="translate(256, 432)" filter="url(#glow)">
    <text x="0" y="0" text-anchor="middle" font-family="'Cairo', 'Tajawal', sans-serif" font-weight="900" font-size="56" fill="#fef08a" letter-spacing="1">جُمعة</text>
  </g>
  <g transform="translate(256, 464)">
    <text x="0" y="0" text-anchor="middle" font-family="'Tajawal', sans-serif" font-weight="700" font-size="19" fill="#fbbf24" letter-spacing="2" opacity="0.9">ألعاب الجلسة</text>
  </g>
</svg>
`;

// 2. Maskable Icon SVG (512x512 with safe area margin 15%)
const svgMaskableIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917" />
      <stop offset="50%" stop-color="#0c0a09" />
      <stop offset="100%" stop-color="#14110f" />
    </linearGradient>
    <linearGradient id="amberGoldM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <filter id="glowM" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Full bleed background for maskable icon -->
  <rect width="512" height="512" fill="url(#bgGradM)"/>

  <!-- Scaled content inside 80% safe zone (center at 256,256) -->
  <g transform="translate(256, 256) scale(0.76) translate(-256, -256)">
    <!-- Golden border -->
    <rect x="24" y="24" width="464" height="464" rx="90" fill="none" stroke="url(#amberGoldM)" stroke-width="4" stroke-opacity="0.4"/>

    <!-- Dice in center -->
    <g transform="translate(256, 200)">
      <rect x="-68" y="-68" width="136" height="136" rx="28" fill="url(#amberGoldM)" stroke="#fef3c7" stroke-width="3"/>
      <!-- Pips -->
      <circle cx="-34" cy="-34" r="11" fill="#1c1917"/>
      <circle cx="34" cy="-34" r="11" fill="#1c1917"/>
      <circle cx="0" cy="0" r="12" fill="#1c1917"/>
      <circle cx="-34" cy="34" r="11" fill="#1c1917"/>
      <circle cx="34" cy="34" r="11" fill="#1c1917"/>
      <circle cx="-36" cy="-36" r="3" fill="#ffffff" opacity="0.7"/>
      <circle cx="32" cy="-36" r="3" fill="#ffffff" opacity="0.7"/>
      <circle cx="-2" cy="-2" r="3" fill="#ffffff" opacity="0.7"/>
      <circle cx="-36" cy="32" r="3" fill="#ffffff" opacity="0.7"/>
      <circle cx="32" cy="32" r="3" fill="#ffffff" opacity="0.7"/>
    </g>

    <!-- Pawns -->
    <circle cx="130" cy="275" r="22" fill="#ef4444" stroke="#fca5a5" stroke-width="2.5"/>
    <circle cx="382" cy="275" r="22" fill="#38bdf8" stroke="#bae6fd" stroke-width="2.5"/>
    <circle cx="180" cy="345" r="20" fill="#10b981" stroke="#a7f3d0" stroke-width="2.5"/>
    <circle cx="332" cy="345" r="20" fill="#f59e0b" stroke="#fde68a" stroke-width="2.5"/>

    <!-- Typography -->
    <g transform="translate(256, 420)" filter="url(#glowM)">
      <text x="0" y="0" text-anchor="middle" font-family="'Cairo', sans-serif" font-weight="900" font-size="62" fill="#fef08a">جُمعة</text>
    </g>
    <g transform="translate(256, 458)">
      <text x="0" y="0" text-anchor="middle" font-family="'Tajawal', sans-serif" font-weight="700" font-size="22" fill="#fbbf24">ألعاب الجلسة</text>
    </g>
  </g>
</svg>
`;

async function main() {
  // Save SVG
  fs.writeFileSync(path.join(outDir, 'icon.svg'), svgIcon);
  fs.writeFileSync(path.join(outDir, 'favicon.svg'), svgIcon);

  // 192x192
  await sharp(Buffer.from(svgIcon))
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // 512x512
  await sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // Apple touch icon 180x180
  await sharp(Buffer.from(svgIcon))
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 512x512 maskable
  await sharp(Buffer.from(svgMaskableIcon))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // Favicon 64x64
  await sharp(Buffer.from(svgIcon))
    .resize(64, 64)
    .png()
    .toFile(path.join(outDir, 'favicon.png'));
  console.log('Generated favicon.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
