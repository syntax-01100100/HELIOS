import { PICKUP_KINDS } from './game-data.js';

export const WIDTH = 320;
export const HEIGHT = 480;
export const SHIP_X = 84;

const THEME = {
  radiation: { fill: '#2A1F4D', edge: '#FFD666' },
  isolation: { fill: '#4A5673', edge: '#C9D2E3' },
  distance: { fill: '#14535A', edge: '#5FD3CB' },
  gravity: { fill: '#6B4F3A', edge: '#D9B38C' },
  co2: { fill: '#3E5A4F', edge: '#B9E3C9' },
};

const RETRO_SKY = '#0A1330';
const STARS = Array.from({ length: 36 }, (_, i) => ({
  x: (i * 97.3) % WIDTH,
  y: (i * 53.7) % HEIGHT,
  size: 0.6 + (i % 3) * 0.5,
}));

function drawSky(ctx, retro) {
  if (retro) {
    ctx.fillStyle = RETRO_SKY;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#1B2A4E');
  sky.addColorStop(1, RETRO_SKY);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(243, 166, 96, 0.35)';
  ctx.beginPath();
  ctx.arc(268, 70, 36, 0, Math.PI * 2);
  ctx.fill();
}

function drawStars(ctx, retro, t, reduce) {
  ctx.fillStyle = '#FFFFFF';
  STARS.forEach((s) => {
    const drift = reduce ? 0 : t * 12 * s.size;
    const x = (((s.x - drift) % WIDTH) + WIDTH) % WIDTH;
    if (retro) {
      ctx.fillRect(Math.round(x), Math.round(s.y), 2, 2);
      return;
    }
    ctx.globalAlpha = 0.5 + s.size * 0.2;
    ctx.beginPath();
    ctx.arc(x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawWallDecor(ctx, wall, y0, y1, t, reduce) {
  const { x, w } = wall;
  if (y1 <= y0) return;
  if (wall.hazard === 'radiation') {
    for (let xx = x + 6; xx < x + w - 4; xx += 8) {
      const flicker = reduce ? 0.3 : 0.22 + 0.1 * Math.sin(t * 6 + xx);
      ctx.fillStyle = `rgba(255, 214, 102, ${flicker})`;
      ctx.fillRect(xx, y0, 2, y1 - y0);
    }
  } else if (wall.hazard === 'isolation') {
    ctx.fillStyle = 'rgba(221, 228, 240, 0.5)';
    for (let yy = y0 + 14; yy < y1 - 8; yy += 24) {
      ctx.beginPath();
      ctx.arc(x + 8, yy, 2, 0, Math.PI * 2);
      ctx.arc(x + w - 8, yy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (wall.hazard === 'distance') {
    ctx.fillStyle = 'rgba(95, 211, 203, 0.3)';
    for (let yy = y0 + 10; yy < y1 - 6; yy += 18) ctx.fillRect(x + 8, yy, w - 16, 3);
  } else if (wall.hazard === 'gravity') {
    ctx.fillStyle = 'rgba(217, 179, 140, 0.6)';
    for (let yy = y0 + 18; yy < y1 - 12; yy += 34) {
      ctx.beginPath();
      ctx.arc(x + (yy % 2 ? 10 : w - 10), yy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (wall.hazard === 'co2') {
    ctx.fillStyle = 'rgba(185, 227, 201, 0.35)';
    for (let yy = y0 + 16; yy < y1 - 10; yy += 28) {
      ctx.beginPath();
      ctx.arc(x + w / 2, yy, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWall(ctx, wall, y0, y1, edgeY, retro, t, reduce) {
  if (y1 <= y0) return;
  const theme = THEME[wall.hazard];
  ctx.fillStyle = theme.fill;
  ctx.fillRect(wall.x, y0, wall.w, y1 - y0);
  if (!retro) drawWallDecor(ctx, wall, y0, y1, t, reduce);
  ctx.fillStyle = theme.edge;
  ctx.fillRect(wall.x - 3, edgeY, wall.w + 6, 5);
}

function drawObstacle(ctx, wall, retro, t, reduce) {
  const top = wall.gapY - wall.gap / 2;
  const bottom = wall.gapY + wall.gap / 2;
  drawWall(ctx, wall, 0, top, top - 5, retro, t, reduce);
  drawWall(ctx, wall, bottom, HEIGHT, bottom, retro, t, reduce);
}

function drawGlyph(ctx, kind, x, y, retro) {
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  if (retro) {
    ctx.fillRect(x - 2, y - 2, 4, 4);
    return;
  }
  ctx.lineWidth = 2.2;
  if (kind === 'water') {
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.quadraticCurveTo(x + 6, y + 1, x, y + 5);
    ctx.quadraticCurveTo(x - 6, y + 1, x, y - 6);
    ctx.fill();
  } else if (kind === 'sleep') {
    ctx.beginPath();
    ctx.arc(x, y, 5, Math.PI * 0.3, Math.PI * 1.7);
    ctx.stroke();
  } else if (kind === 'heart') {
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.bezierCurveTo(x - 10, y - 1, x - 4, y - 8, x, y - 3);
    ctx.bezierCurveTo(x + 4, y - 8, x + 10, y - 1, x, y + 6);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
}

function drawPickup(ctx, pickup, retro, t, reduce) {
  const kind = PICKUP_KINDS[pickup.kind];
  const bob = reduce ? 0 : Math.sin(t * 4 + pickup.phase) * 3;
  const cy = pickup.y + bob;
  ctx.fillStyle = kind.color;
  if (retro) {
    ctx.fillRect(pickup.x - 8, cy - 8, 16, 16);
  } else {
    ctx.beginPath();
    ctx.arc(pickup.x, cy, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  drawGlyph(ctx, kind.key, pickup.x, cy, retro);
}

function drawShip(ctx, ship, skin, retro, t, reduce) {
  ctx.save();
  ctx.translate(SHIP_X, ship.y);
  ctx.rotate(Math.max(-0.35, Math.min(0.5, ship.vy / 700)));
  if (ship.invuln > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.4;
  if (ship.thrustT > 0) {
    const flicker = reduce ? 6 : 4 + Math.random() * 4;
    ctx.fillStyle = retro ? '#FF8A3D' : '#FFB347';
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-14 - flicker * 2, 0);
    ctx.lineTo(-12, 4);
    ctx.fill();
  }
  if (retro) {
    ctx.fillStyle = skin.body;
    ctx.fillRect(-12, -9, 24, 18);
    ctx.fillStyle = skin.trim;
    ctx.fillRect(-12, 3, 24, 4);
    ctx.fillStyle = '#8FD3F4';
    ctx.fillRect(2, -5, 6, 6);
  } else {
    ctx.fillStyle = skin.trim;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(-15, 11);
    ctx.lineTo(-2, 6);
    ctx.fill();
    ctx.fillStyle = skin.body;
    ctx.strokeStyle = skin.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8FD3F4';
    ctx.beginPath();
    ctx.arc(4, -2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawScene(ctx, state, view) {
  const { retro, reduce, skin, t } = view;
  drawSky(ctx, retro);
  drawStars(ctx, retro, t, reduce);
  state.obstacles.forEach((wall) => drawObstacle(ctx, wall, retro, t, reduce));
  state.pickups.forEach((pk) => {
    if (!pk.taken) drawPickup(ctx, pk, retro, t, reduce);
  });
  drawShip(ctx, state.ship, skin, retro, t, reduce);
  if (state.hitFlash > 0) {
    ctx.fillStyle = `rgba(217, 83, 79, ${Math.min(0.35, state.hitFlash)})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}
