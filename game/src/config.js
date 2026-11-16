// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 430,
  accel: 2600,
  /** Seconds of protection after a hit, and the dash's own brief protection. */
  invulnerable: 1.6,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 1.1,
  /** How far behind the shepherd each carried starling trails, in trail steps. */
  trailGap: 13,
  maxChain: 8,
};

export const LIVES = 3;

/** The Moon, home: fly into its ring with a trail to bank your starlings. */
export const MOON = { x: 640, y: 104, ring: 104 };

export const STARLING = {
  radius: 11,
  pickup: 40,
  drift: 26,
  /** Free starlings kept on the field, before the night's extra ones. */
  baseCount: 9,
  perNight: 1,
  maxCount: 14,
  /** A starling drifts toward the shepherd once this close, so pickups feel generous. */
  magnet: 150,
  magnetPull: 90,
  points: 10,
  /** Extra points per pair in one delivery: a full trail pays much more than singles. */
  pairBonus: 5,
  fullChainBonus: 50,
};

export const WISP = {
  radius: 20,
  baseCount: 2,
  perNight: 1,
  maxCount: 7,
  speed: 118,
  speedPerNight: 16,
  /** A wisp starts hunting once the shepherd is inside this range. */
  huntRange: 300,
  dispelPoints: 15,
};

/** Starlings to bank to finish each night; night 5's dawn is the win. */
export function quotaFor(night) {
  return 6 + 3 * night;
}
export const NIGHTS = 5;

/** How many things can exist at once; the pools are allocated once, at boot. */
export const POOL = { starlings: 24, wisps: 10, particles: 160, popups: 12 };

export const PALETTE = {
  backdropTop: '#0b1026',
  backdropBottom: '#1b2350',
  nebulaViolet: '#7c3aed',
  nebulaTeal: '#0e7490',
  hill: '#0a0e22',
  window: '#fbbf24',
  moon: '#fde68a',
  moonGlow: '#fef3c7',
  star: '#fbbf24',
  starDim: '#fde68a',
  shepherd: '#67e8f9',
  lantern: '#fde047',
  trail: '#a5f3fc',
  wisp: '#a855f7',
  wispEye: '#f0abfc',
  panel: '#141a38',
  panelEdge: '#2e3a6b',
  text: '#f1f5f9',
  muted: '#94a3b8',
  gold: '#fbbf24',
  danger: '#f472b6',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'star-shepherd.best';
