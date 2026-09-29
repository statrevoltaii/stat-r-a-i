// High-definition Canvas 2D vector logos and brand avatar renderer

interface LogoRenderer {
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) => void;
}

// Crisp Canvas 2D vector drawings for common viral tech/business entities
const BRAND_VECTOR_LOGOS: { [key: string]: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void } = {
  apple: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    const s = r * 0.055;
    ctx.scale(s, s);
    ctx.fillStyle = '#ffffff';

    // Apple Leaf
    ctx.beginPath();
    ctx.moveTo(1.5, -12);
    ctx.bezierCurveTo(4, -15, 6, -16, 7.5, -15);
    ctx.bezierCurveTo(7.8, -13, 7, -10.5, 4.5, -9);
    ctx.bezierCurveTo(2.5, -7.5, 0.5, -7.2, 0, -7);
    ctx.bezierCurveTo(-0.2, -9, 0.5, -11, 1.5, -12);
    ctx.fill();

    // Apple Body with bite
    ctx.beginPath();
    ctx.moveTo(0, -5.5);
    ctx.bezierCurveTo(2, -5.5, 4, -4.5, 5.5, -4.5);
    ctx.bezierCurveTo(7, -4.5, 9, -5.8, 10.5, -5.8);
    ctx.bezierCurveTo(13, -5.8, 15, -4, 16.5, -1.8);
    // Bite
    ctx.bezierCurveTo(14.5, -0.5, 13.5, 2, 13.5, 4.5);
    ctx.bezierCurveTo(13.5, 7.5, 15.2, 9.8, 17, 10.8);
    ctx.bezierCurveTo(15.5, 14.5, 13, 18, 9.8, 18);
    ctx.bezierCurveTo(8.5, 18, 7.5, 17.2, 6, 17.2);
    ctx.bezierCurveTo(4.5, 17.2, 3.2, 18, 2, 18);
    ctx.bezierCurveTo(-1.5, 18, -4.5, 14, -6.5, 10.5);
    ctx.bezierCurveTo(-9.2, 5.5, -9.2, 0.5, -6.5, -2.5);
    ctx.bezierCurveTo(-4.5, -4.8, -2, -5.8, 0, -5.5);
    ctx.fill();
    ctx.restore();
  },

  samsung: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    // Samsung Blue Oval with crisp White 'S'
    ctx.save();
    ctx.rotate(-0.18);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#034ea2';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(r * 0.72)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', 0, 1);
    ctx.restore();
  },

  huawei: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    // 8-petal iconic blossom
    ctx.fillStyle = '#eb1c24';
    const petals = 8;
    const petalLen = r * 0.7;
    const petalW = r * 0.22;
    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI) / (petals - 1) - Math.PI / 2;
      ctx.save();
      ctx.rotate(angle * 0.8);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(petalW, -petalLen * 0.5, 0, -petalLen);
      ctx.quadraticCurveTo(-petalW, -petalLen * 0.5, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    // Bottom fan rays
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r * 0.2, Math.PI, Math.PI * 2);
    ctx.fillStyle = '#c00010';
    ctx.fill();
    ctx.restore();
  },

  xiaomi: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    // Orange Squircle with 'mi'
    const boxR = r * 0.82;
    ctx.beginPath();
    ctx.roundRect(-boxR, -boxR, boxR * 2, boxR * 2, r * 0.38);
    ctx.fillStyle = '#ff6900';
    ctx.fill();

    // Stylized 'mi' white icon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = r * 0.24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer arch
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, r * 0.4);
    ctx.lineTo(-r * 0.35, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.35, -r * 0.45, 0, -r * 0.45);
    ctx.quadraticCurveTo(r * 0.35, -r * 0.45, r * 0.35, -r * 0.1);
    ctx.lineTo(r * 0.35, r * 0.4);
    ctx.stroke();

    // Center divider
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.4);
    ctx.lineTo(0, r * 0.4);
    ctx.stroke();
    ctx.restore();
  },

  google: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    // Multi-color Google 'G'
    ctx.lineWidth = r * 0.32;
    ctx.lineCap = 'round';

    // Blue right bar & top-right
    ctx.strokeStyle = '#4285f4';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, -Math.PI * 0.25, Math.PI * 0.15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.6, 0);
    ctx.stroke();

    // Green bottom-right & bottom
    ctx.strokeStyle = '#34a853';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, Math.PI * 0.15, Math.PI * 0.65);
    ctx.stroke();

    // Yellow bottom-left
    ctx.strokeStyle = '#fbbc05';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, Math.PI * 0.65, Math.PI * 1.15);
    ctx.stroke();

    // Red top-left & top
    ctx.strokeStyle = '#ea4335';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, Math.PI * 1.15, Math.PI * 1.75);
    ctx.stroke();
    ctx.restore();
  },

  microsoft: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    const sz = r * 0.62;
    const gap = r * 0.1;
    // 4 tiles
    ctx.fillStyle = '#f25022'; // Red
    ctx.fillRect(-sz, -sz, sz - gap, sz - gap);
    ctx.fillStyle = '#7fba00'; // Green
    ctx.fillRect(gap, -sz, sz - gap, sz - gap);
    ctx.fillStyle = '#00a4ef'; // Blue
    ctx.fillRect(-sz, gap, sz - gap, sz - gap);
    ctx.fillStyle = '#ffb900'; // Yellow
    ctx.fillRect(gap, gap, sz - gap, sz - gap);
    ctx.restore();
  },

  tesla: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#e82127';
    // Top arch
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.7, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.lineWidth = r * 0.16;
    ctx.strokeStyle = '#e82127';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center 'T' spear
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.25);
    ctx.lineTo(r * 0.5, -r * 0.25);
    ctx.lineTo(r * 0.25, -r * 0.05);
    ctx.lineTo(r * 0.08, r * 0.65);
    ctx.lineTo(0, r * 0.75);
    ctx.lineTo(-r * 0.08, r * 0.65);
    ctx.lineTo(-r * 0.25, -r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  amazon: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(r * 0.75)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('a', 0, -r * 0.12);

    // Orange Smile Arrow
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = r * 0.18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.55, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
    ctx.restore();
  },

  meta: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    // Blue Gradient Infinity
    ctx.strokeStyle = '#0081fb';
    ctx.lineWidth = r * 0.26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const w = r * 0.6;
    const h = r * 0.45;
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(w * 0.5, -h, w, -h, w, 0);
    ctx.bezierCurveTo(w, h, w * 0.5, h, 0, 0);
    ctx.bezierCurveTo(-w * 0.5, -h, -w, -h, -w, 0);
    ctx.bezierCurveTo(-w, h, -w * 0.5, h, 0, 0);
    ctx.stroke();
    ctx.restore();
  },

  nvidia: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    // Green Eye/Spiral
    ctx.strokeStyle = '#76b900';
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.65, Math.PI * 0.3, Math.PI * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, Math.PI * 0.3, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
  },

  nike: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffffff';
    // Nike Swoosh
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.1, r * 0.65, r * 0.75, -r * 0.55);
    ctx.quadraticCurveTo(0, r * 0.2, -r * 0.45, 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  zara: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(r * 0.7)}px "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', 0, 0);
    ctx.restore();
  },

  hm: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#e50010';
    ctx.font = `900 italic ${Math.round(r * 0.65)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H&M', 0, 0);
    ctx.restore();
  },

  shein: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(r * 0.75)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', 0, 1);
    ctx.restore();
  },

  gap: (ctx, x, y, r) => {
    ctx.save();
    ctx.translate(x, y);
    const sz = r * 0.75;
    ctx.fillStyle = '#002855';
    ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(r * 0.6)}px "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAP', 0, 0);
    ctx.restore();
  }
};

// Match entity name or short_name to supported vector brand logo
export function matchBrandKey(name: string): string | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.includes('apple') || normalized.includes('iphone')) return 'apple';
  if (normalized.includes('samsung') || normalized.includes('galaxy')) return 'samsung';
  if (normalized.includes('huawei')) return 'huawei';
  if (normalized.includes('xiaomi')) return 'xiaomi';
  if (normalized.includes('google') || normalized.includes('alphabet')) return 'google';
  if (normalized.includes('microsoft')) return 'microsoft';
  if (normalized.includes('tesla')) return 'tesla';
  if (normalized.includes('amazon')) return 'amazon';
  if (normalized.includes('meta') || normalized.includes('facebook')) return 'meta';
  if (normalized.includes('nvidia')) return 'nvidia';
  if (normalized.includes('nike')) return 'nike';
  if (normalized.includes('zara') || normalized.includes('inditex')) return 'zara';
  if (normalized.includes('hm') || normalized.includes('hennes')) return 'hm';
  if (normalized.includes('shein')) return 'shein';
  if (normalized.includes('gap')) return 'gap';
  return null;
}

/**
 * Draw a high-end glowing circular avatar token with brand logo or stylized monogram
 */
export function drawBrandAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  name: string,
  shortName: string,
  brandColor: string,
  options?: { isLeader?: boolean; glow?: boolean }
) {
  const brandKey = matchBrandKey(name) || matchBrandKey(shortName);

  ctx.save();

  const isHeadless = typeof window !== 'undefined' && (
    Boolean(window.navigator.webdriver) ||
    Boolean((window as any).isExporting) ||
    window.location.search.includes('headless=true')
  );

  // 1. Outer Glow Aura
  if (options?.glow !== false) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = brandColor;
    ctx.shadowColor = brandColor;
    ctx.shadowBlur = isHeadless ? 0 : (options?.isLeader ? 24 : 14);
    ctx.globalAlpha = 0.45;
    ctx.fill();
    ctx.restore();
  }

  // 2. Token Disk (Dark glass with subtle brand tint)
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  const diskGrad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  diskGrad.addColorStop(0, '#161c2d');
  diskGrad.addColorStop(1, '#090d18');
  ctx.fillStyle = diskGrad;
  ctx.fill();

  // 3. Rim Stroke (Gold for leader, brand color for others)
  ctx.lineWidth = options?.isLeader ? 3.5 : 2;
  ctx.strokeStyle = options?.isLeader ? '#ffd700' : brandColor;
  ctx.stroke();

  // 4. Content: Vector Logo OR Premium Monogram Fallback
  if (brandKey && BRAND_VECTOR_LOGOS[brandKey]) {
    BRAND_VECTOR_LOGOS[brandKey](ctx, x, y, radius * 0.72);
  } else {
    // Elegant Monogram Fallback
    const clean = shortName || name;
    const initials = clean.length > 2 ? clean.substring(0, 2).toUpperCase() : clean.toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(radius * 0.85)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, x, y + 1);
  }

  // 5. Leader Crown indicator if Rank 1
  if (options?.isLeader) {
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = isHeadless ? 0 : 10;
    ctx.font = `700 ${Math.round(radius * 0.7)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('👑', x, y - radius - 4);
    ctx.restore();
  }

  ctx.restore();
}
