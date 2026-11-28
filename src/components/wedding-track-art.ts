import type { WeddingObstacleKind } from "@/lib/wedding-obstacles";

export interface WeddingArtPalette {
  maroon: string; gold: string; cream: string; brideRed: string;
  skin: string; marigold: string; foreground: string; card: string;
}

export function drawComicBubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, p: WeddingArtPalette, width = 520) {
  ctx.save();
  ctx.fillStyle = p.card;
  ctx.strokeStyle = p.maroon;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y, width, 62, 18);
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 18, y + 61); ctx.lineTo(x - 32, y + 79); ctx.lineTo(x + 5, y + 61);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = p.maroon;
  ctx.font = '700 23px "DM Sans", sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 31, width - 28);
  ctx.restore();
}

export function drawWeddingObstacle(ctx: CanvasRenderingContext2D, kind: WeddingObstacleKind, x: number, ground: number, time: number, p: WeddingArtPalette, scale = 1, happy = false) {
  ctx.save(); ctx.translate(x, ground); ctx.scale(scale, scale);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const ellipse = (cx: number, cy: number, rx: number, ry: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  };
  const line = (points: number[], color: string, width: number) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    ctx.moveTo(points[0] ?? 0, points[1] ?? 0);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i] ?? 0, points[i + 1] ?? 0);
    ctx.stroke();
  };
  const face = (cx: number, cy: number, moustache = false) => {
    ellipse(cx, cy, 22, 25, p.skin);
    ellipse(cx - 8, cy - 3, 2.5, 3, p.foreground); ellipse(cx + 8, cy - 3, 2.5, 3, p.foreground);
    if (moustache) { ellipse(cx - 6, cy + 8, 9, 4, p.maroon); ellipse(cx + 6, cy + 8, 9, 4, p.maroon); }
    ctx.strokeStyle = p.maroon; ctx.lineWidth = 2.5; ctx.beginPath();
    if (happy || kind !== 0) ctx.arc(cx, cy + 8, 9, 0.15, Math.PI - 0.15);
    else { ctx.moveTo(cx - 7, cy + 17); ctx.quadraticCurveTo(cx, cy + 11, cx + 7, cy + 17); }
    ctx.stroke();
  };
  const body = (cx: number, color: string, stout = false) => {
    line([cx - 14, -34, cx - 18, -5], p.maroon, 10); line([cx + 14, -34, cx + 18, -5], p.maroon, 10);
    ellipse(cx - 20, -4, 13, 4, p.maroon); ellipse(cx + 20, -4, 13, 4, p.maroon);
    ctx.fillStyle = color; ctx.strokeStyle = p.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(cx - (stout ? 36 : 27), -107, stout ? 72 : 54, 81, 18); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 3; i++) ellipse(cx, -88 + i * 16, 2.5, 2.5, p.gold);
  };
  // Soft contact shadow gives each figure the same ground anchor as the couple.
  ctx.globalAlpha = 0.18; ellipse(0, -2, kind === 1 ? 61 : 43, 7, p.maroon); ctx.globalAlpha = 1;
  if (kind === 0) {
    body(0, p.cream, true); ellipse(0, -145, 25, 15, p.maroon); face(0, -131, true);
    line([-10, -139, -19, -143], p.maroon, 3); line([10, -139, 19, -143], p.maroon, 3);
    if (happy) {
      line([-29, -95, -49, -123, -45, -147], p.skin, 10);
      line([29, -95, 49, -123, 45, -147], p.skin, 10);
    } else {
      line([-30, -94, 20, -72, 29, -88], p.skin, 11);
      line([30, -95, -20, -72, -29, -87], p.skin, 11);
      for (const side of [-1, 1]) {
        const rise = (time / 450) % 1;
        ctx.globalAlpha = 1 - rise;
        for (let i = 0; i < 3; i++) ellipse(side * (32 + i * 8), -128 - rise * 26 - i * 7, 5 + i * 2, 5 + i, p.card);
        ctx.globalAlpha = 1;
      }
    }
  } else if (kind === 1) {
    for (const side of [-1, 1]) {
      const cx = side * 30;
      body(cx, side === -1 ? p.brideRed : p.marigold);
      ellipse(cx, -132, 26, 29, p.maroon); face(cx, -128);
      line([cx - 18, -101, cx + side * 7, -117], p.gold, 8);
      line([cx + side * 19, -89, cx - side * 14, -126], p.skin, 8);
      ellipse(cx, -139, 2, 2, p.brideRed);
    }
    ctx.fillStyle = p.maroon; ctx.font = 'bold 15px "DM Sans", sans-serif'; ctx.fillText("psst…", -18, -164);
  } else if (kind === 2) {
    body(0, p.marigold); ellipse(0, -145, 24, 12, p.maroon); face(0, -131);
    const sway = Math.sin(time / 240) * 9;
    line([24, -94, 46, -118], p.skin, 10);
    line([46, -118, 72 + sway, -183], p.maroon, 4);
    ctx.fillStyle = p.maroon; ctx.beginPath(); ctx.roundRect(58 + sway, -205, 30, 21, 4); ctx.fill();
    ctx.fillStyle = p.cream; ctx.fillRect(63 + sway, -200, 20, 11);
    ellipse(83 + sway, -195, 3, 3, p.gold);
    line([-23, -92, -40, -60], p.skin, 10);
  } else if (kind === 3) {
    const shake = Math.sin(time / 45) * 2;
    ctx.translate(shake, 0); ctx.fillStyle = p.maroon; ctx.strokeStyle = p.gold; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(-37, -139, 74, 133, 8); ctx.fill(); ctx.stroke();
    for (const [cy, radius] of [[-102, 20], [-47, 27]]) {
      ellipse(0, cy ?? 0, radius ?? 0, radius ?? 0, p.foreground);
      ctx.strokeStyle = p.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, cy ?? 0, (radius ?? 0) - 6, 0, Math.PI * 2); ctx.stroke();
      ellipse(0, cy ?? 0, 6, 6, p.gold);
    }
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = p.marigold; ctx.lineWidth = 3; ctx.beginPath();
      ctx.ellipse(side * (49 + i * 12), -72, 6 + i * 3, 20 + i * 8 + Math.sin(time / 120) * 3, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
  } else if (kind === 4) {
    ellipse(0, -12, 51, 13, p.gold); ellipse(0, -15, 46, 9, p.cream);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = p.marigold; ctx.lineWidth = 4; ctx.beginPath();
      for (let step = 0; step < 40; step++) {
        const angle = step * 0.42; const radius = 1 + step * 0.19;
        const px = -31 + i * 15 + Math.cos(angle) * radius; const py = -20 + Math.sin(angle) * radius * 0.7;
        if (step === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      } ctx.stroke();
    }
  } else {
    ctx.translate(0, -Math.abs(Math.sin(time / 180)) * 6);
    body(0, p.marigold); ellipse(0, -148, 27, 12, p.maroon); face(0, -130, true);
    const sway = Math.sin(time / 160) * 14;
    line([-23, -98, -49, -127, -39 + sway, -164], p.skin, 10);
    line([23, -98, 49, -127, 39 + sway, -164], p.skin, 10);
    line([-26, -144, 27, -144], p.gold, 4);
  }
  ctx.restore();
}

export function drawFunnyCollectible(ctx: CanvasRenderingContext2D, kind: "laddoo" | "petals" | "ring", x: number, y: number, p: WeddingArtPalette) {
  ctx.save(); ctx.translate(x, y);
  if (kind === "laddoo") {
    ctx.fillStyle = p.marigold; ctx.strokeStyle = p.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.cream;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(Math.sin(i * 4) * 13, Math.cos(i * 3) * 13, 2, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === "petals") {
    ctx.fillStyle = p.brideRed;
    for (let i = 0; i < 5; i++) { ctx.rotate(1.25); ctx.beginPath(); ctx.ellipse(0, -13, 7, 12, 0.4, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.fillStyle = p.maroon; ctx.strokeStyle = p.gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-23, -7, 46, 30, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.brideRed; ctx.beginPath(); ctx.roundRect(-23, -34, 46, 29, 5); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -3, 9, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = p.cream; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(7, -15); ctx.lineTo(0, -8); ctx.lineTo(-7, -15); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}