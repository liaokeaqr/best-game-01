// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Everything is drawn with canvas paths and gradients — the game ships no images —
// in one coherent palette: indigo night, gold stars, a cyan shepherd, violet wisps.

import { FIELD, FONT, LIVES, MOON, NIGHTS, PALETTE, PLAYER, WISP } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 138, line: 34, bottom: 76 };

function roundRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function starPath(context, x, y, outer, inner) {
  context.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

function flamePath(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y - size);
  context.bezierCurveTo(x + size * 0.7, y - size * 0.2, x + size * 0.45, y + size * 0.6, x, y + size * 0.6);
  context.bezierCurveTo(x - size * 0.45, y + size * 0.6, x - size * 0.7, y - size * 0.2, x, y - size);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const rng = createRandom(20261116);

  // The night sky's furniture, fixed once: background stars, nebula blobs, hill windows.
  const skyStars = [];
  for (let i = 0; i < 130; i += 1) {
    skyStars.push({
      x: rng() * FIELD.width,
      y: rng() * (FIELD.height - 90),
      r: 0.6 + rng() * 1.5,
      phase: rng() * Math.PI * 2,
      speed: 0.6 + rng() * 1.6,
    });
  }
  const nebulae = [
    { x: 240, y: 180, r: 260, color: PALETTE.nebulaViolet },
    { x: 1080, y: 300, r: 300, color: PALETTE.nebulaTeal },
    { x: 700, y: 90, r: 200, color: PALETTE.nebulaViolet },
  ];
  const windows = [];
  for (let i = 0; i < 14; i += 1) {
    windows.push({ x: 30 + rng() * (FIELD.width - 60), y: FIELD.height - 26 - rng() * 22, phase: rng() * Math.PI * 2 });
  }
  const hillPeaks = [];
  for (let x = 0; x <= FIELD.width; x += 80) {
    hillPeaks.push({ x, y: FIELD.height - 34 - rng() * 30 });
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function drawSky(elapsed) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.backdropTop);
    gradient.addColorStop(1, PALETTE.backdropBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const n of nebulae) {
      const glow = context.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      glow.addColorStop(0, n.color + '2e');
      glow.addColorStop(1, n.color + '00');
      context.fillStyle = glow;
      context.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (const s of skyStars) {
      const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * s.speed + s.phase));
      context.globalAlpha = alpha;
      context.fillStyle = '#e2e8f0';
      context.beginPath();
      context.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // The sleeping valley below: dark hills, a few lit windows, two pine silhouettes.
    context.fillStyle = PALETTE.hill;
    context.beginPath();
    context.moveTo(0, FIELD.height);
    for (const p of hillPeaks) context.lineTo(p.x, p.y);
    context.lineTo(FIELD.width, FIELD.height);
    context.closePath();
    context.fill();
    for (const w of windows) {
      context.globalAlpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 0.8 + w.phase));
      context.fillStyle = PALETTE.window;
      context.fillRect(w.x, w.y, 5, 7);
    }
    context.globalAlpha = 1;
    context.fillStyle = PALETTE.hill;
    for (const tx of [150, 1120]) {
      context.beginPath();
      context.moveTo(tx, FIELD.height - 30);
      context.lineTo(tx - 16, FIELD.height - 78);
      context.lineTo(tx + 16, FIELD.height - 78);
      context.closePath();
      context.fill();
    }
  }

  function drawMoon(elapsed) {
    const glow = context.createRadialGradient(MOON.x, MOON.y, 10, MOON.x, MOON.y, 170);
    glow.addColorStop(0, PALETTE.moonGlow + '55');
    glow.addColorStop(1, PALETTE.moonGlow + '00');
    context.fillStyle = glow;
    context.fillRect(MOON.x - 170, MOON.y - 170, 340, 340);
    context.fillStyle = PALETTE.moon;
    context.beginPath();
    context.arc(MOON.x, MOON.y, 52, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fcd34d';
    for (const [cx, cy, cr] of [[-18, -12, 9], [14, 8, 12], [-6, 22, 7], [22, -20, 6]]) {
      context.beginPath();
      context.arc(MOON.x + cx, MOON.y + cy, cr, 0, Math.PI * 2);
      context.fill();
    }
    // The home ring: the delivery zone, slowly turning.
    context.strokeStyle = PALETTE.gold;
    context.globalAlpha = 0.85;
    context.lineWidth = 3;
    context.setLineDash([14, 10]);
    context.lineDashOffset = -elapsed * 12;
    context.beginPath();
    context.arc(MOON.x, MOON.y, MOON.ring, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.globalAlpha = 1;
    text('H O M E', MOON.x, MOON.y + MOON.ring + 26, 15, PALETTE.gold, 'center', 'top');
  }

  function drawStarling(s) {
    const pulse = 1 + 0.14 * Math.sin(s.phase);
    const glow = context.createRadialGradient(s.x, s.y, 0, s.x, s.y, 30);
    glow.addColorStop(0, '#fbbf2488');
    glow.addColorStop(1, '#fbbf2400');
    context.fillStyle = glow;
    context.fillRect(s.x - 30, s.y - 30, 60, 60);
    context.fillStyle = PALETTE.star;
    starPath(context, s.x, s.y, 13 * pulse, 5 * pulse);
    context.fill();
    context.fillStyle = '#fff7d6';
    starPath(context, s.x, s.y, 6 * pulse, 2.5 * pulse);
    context.fill();
  }

  function drawWisp(w) {
    const wobble = 1 + 0.1 * Math.sin(w.phase);
    const glow = context.createRadialGradient(w.x, w.y, 0, w.x, w.y, 52);
    glow.addColorStop(0, '#a855f755');
    glow.addColorStop(1, '#a855f700');
    context.fillStyle = glow;
    context.fillRect(w.x - 52, w.y - 52, 104, 104);
    context.fillStyle = 'rgba(168, 85, 247, 0.75)';
    for (const [ox, oy, r] of [[0, 0, 20], [-12, 8, 13], [12, 9, 13], [0, -12, 12]]) {
      context.beginPath();
      context.arc(w.x + ox * wobble, w.y + oy * wobble, r, 0, Math.PI * 2);
      context.fill();
    }
    const lookX = Math.cos(w.heading) * 4;
    const lookY = Math.sin(w.heading) * 4;
    context.fillStyle = PALETTE.wispEye;
    for (const ex of [-7, 7]) {
      context.beginPath();
      context.arc(w.x + ex + lookX, w.y - 4 + lookY, 3.4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawShepherd(state) {
    const p = state.player;
    // The comet's tail: fading sparks along the trail just flown.
    for (let i = Math.min(18, p.trail.length - 1); i >= 1; i -= 1) {
      const at = p.trail[i];
      const fade = 1 - i / 18;
      context.globalAlpha = fade * 0.5;
      context.fillStyle = PALETTE.trail;
      context.beginPath();
      context.arc(at.x, at.y, 2 + fade * 5, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // Blink while invulnerable after a hit.
    if (p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0) return;
    const glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, 46);
    glow.addColorStop(0, '#67e8f955');
    glow.addColorStop(1, '#67e8f900');
    context.fillStyle = glow;
    context.fillRect(p.x - 46, p.y - 46, 92, 92);
    const stretch = p.dashTime > 0 ? 1.5 : 1;
    context.save();
    context.translate(p.x, p.y);
    context.rotate(p.facing);
    context.scale(stretch, 1 / Math.sqrt(stretch));
    context.fillStyle = PALETTE.shepherd;
    context.beginPath();
    context.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ecfeff';
    context.beginPath();
    context.arc(2, 0, PLAYER.radius * 0.55, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // The lantern, swinging below the comet, warm against the cold sky.
    const swing = Math.sin(state.elapsed * 3) * 3;
    const lx = p.x + swing;
    const ly = p.y + PLAYER.radius + 10;
    context.strokeStyle = '#fde047';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(p.x, p.y + PLAYER.radius - 2);
    context.lineTo(lx, ly - 6);
    context.stroke();
    const lampGlow = context.createRadialGradient(lx, ly, 0, lx, ly, 20);
    lampGlow.addColorStop(0, '#fde04766');
    lampGlow.addColorStop(1, '#fde04700');
    context.fillStyle = lampGlow;
    context.fillRect(lx - 20, ly - 20, 40, 40);
    context.fillStyle = PALETTE.lantern;
    context.beginPath();
    context.arc(lx, ly, 6, 0, Math.PI * 2);
    context.fill();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.max);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawPopups(state) {
    for (const p of state.popups) {
      if (!p.active) continue;
      context.globalAlpha = Math.min(1, p.life);
      text(p.text, p.x, p.y, 30, PALETTE.gold, 'center', 'alphabetic');
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best) {
    context.fillStyle = 'rgba(8, 12, 32, 0.55)';
    context.fillRect(0, 0, FIELD.width, 58);
    text(`SCORE ${state.score}`, 24, 10, 26, PALETTE.text, 'left', 'top');
    text(`BEST ${Math.max(best, state.score)}`, 24, 38, 15, PALETTE.muted, 'left', 'top');
    text(`NIGHT ${state.night}/${NIGHTS}`, FIELD.width / 2, 8, 24, PALETTE.text, 'center', 'top');
    const barW = 210;
    const barX = FIELD.width / 2 - barW / 2;
    const barY = 38;
    context.fillStyle = '#2e3a6b';
    roundRectPath(context, barX, barY, barW, 12, 6);
    context.fill();
    context.fillStyle = PALETTE.gold;
    const fill = Math.min(1, state.banked / state.quota);
    if (fill > 0) {
      roundRectPath(context, barX, barY, Math.max(12, barW * fill), 12, 6);
      context.fill();
    }
    text(`${state.banked}/${state.quota} home`, FIELD.width / 2 + barW / 2 + 12, 36, 15, PALETTE.muted, 'left', 'top');
    // Lantern lights for lives, top right.
    const firstFlame = FIELD.width - 24 - LIVES * 26;
    for (let life = 0; life < LIVES; life += 1) {
      const fx = firstFlame + life * 26 + 10;
      context.fillStyle = life < state.lives ? PALETTE.lantern : '#2e3a6b';
      flamePath(context, fx, 30, 11);
      context.fill();
    }
    // Trail count, then the dash meter, on the row under the lives.
    context.fillStyle = PALETTE.star;
    starPath(context, 1062, 48, 8, 3.5);
    context.fill();
    text(`x ${state.chain.length}`, 1076, 40, 17, PALETTE.text, 'left', 'top');
    const dashW = 84;
    const dashX = FIELD.width - 24 - dashW;
    context.fillStyle = '#2e3a6b';
    roundRectPath(context, dashX, 48, dashW, 7, 3);
    context.fill();
    const dashReady = state.player.dashCooldown <= 0 ? 1 : 1 - state.player.dashCooldown / 1.1;
    context.fillStyle = dashReady >= 1 ? PALETTE.shepherd : '#38bdf8';
    roundRectPath(context, dashX, 48, Math.max(7, dashW * dashReady), 7, 3);
    context.fill();
    text('DASH', dashX - 8, 40, 13, PALETTE.muted, 'right', 'top');
  }

  function drawPanel(title, lines, prompt, accent, yOffset) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2 + (yOffset || 0);
    context.fillStyle = 'rgba(6, 8, 24, 0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRectPath(context, x, y, PANEL.width, height, 18);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    roundRectPath(context, x, y, PANEL.width, height, 18);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, accent || PALETTE.text, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + PANEL.top + i * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Lost starlings drift through the night. Gather them into your trail,',
    'then carry them home to the Moon. Void wisps hunt you — dash',
    'through one to scatter it, or lose a light and half your trail.',
    'Bank the night\'s quota to greet the next night. Finish Night 5',
    'and dawn breaks. Move with mouse or WASD / arrows. Space or click: dash.',
    '',
  ];
  const PAUSED_LINES = ['The starlings will wait for you.'];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', '', ''];

  /** Paint one frame: the night sky, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdropTop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state.elapsed);
    drawMoon(state.elapsed);
    for (const s of state.starlings) {
      if (s.active) drawStarling(s);
    }
    for (const w of state.wisps) {
      if (w.active) drawWisp(w);
    }
    drawShepherd(state);
    drawParticles(state);
    drawPopups(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = `Best ${best}`;
      drawPanel('STAR SHEPHERD', TITLE_LINES, 'Press Space or click to start', PALETTE.text, 40);
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PLAY) {
      text('Space / click: dash · P: pause · M: mute', 24, FIELD.height - 26, 15, PALETTE.muted, 'left');
      if (muted) text('MUTED', FIELD.width - 24, FIELD.height - 26, 15, PALETTE.muted, 'right');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = `Score ${state.score}`;
      OVER_LINES[1] = `Best ${Math.max(best, state.score)} · Nights reached ${state.night}`;
      drawPanel('The Night Ends', OVER_LINES, 'Press Space or click to play again', PALETTE.danger);
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = `Score ${state.score}`;
      WIN_LINES[1] = `Best ${Math.max(best, state.score)} · All ${NIGHTS} nights complete`;
      WIN_LINES[2] = 'Every lost starling is home.';
      drawPanel('Dawn Breaks!', WIN_LINES, 'Press Space or click to play again', PALETTE.gold);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
