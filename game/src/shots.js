// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot
// (gather the nearest starling, carry a full trail home to the Moon, keep clear of wisps,
// dash when one gets too close), so the frame is what a short game really looks like and
// the same seed always gives the same frame. The win scene's pilot plays until dawn
// breaks; the end scene's pilot chases starlings but never dashes and never dodges, so
// the wisps catch it, as they catch a player who stops paying attention.

import { FIELD, MOON, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, MODE_FREE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;

/** Steer toward `target`, pushed away from any wisp closer than this. */
const WISP_SHY = 150;

/** Where the pilot wants to go: the Moon with a full trail, else the nearest lost starling. */
function pickTarget(state) {
  const player = state.player;
  if (state.chain.length >= 7 || state.banked + state.chain.length >= state.quota) {
    return { x: MOON.x, y: MOON.y };
  }
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < state.starlings.length; i += 1) {
    const s = state.starlings[i];
    if (!s.active || s.mode !== MODE_FREE) continue;
    const d = (s.x - player.x) ** 2 + (s.y - player.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best === null ? { x: FIELD.width / 2, y: FIELD.height / 2 } : { x: best.x, y: best.y };
}

/** A unit steering vector for this step, plus whether to dash right now. */
function autopilot(state, careless) {
  const player = state.player;
  const target = pickTarget(state);
  let x = target.x - player.x;
  let y = target.y - player.y;
  let dash = false;
  if (careless) {
    const len = Math.hypot(x, y);
    if (len < 1) return { steer: null, dash };
    return { steer: { x: x / len, y: y / len }, dash };
  }
  for (let i = 0; i < state.wisps.length; i += 1) {
    const w = state.wisps[i];
    if (!w.active) continue;
    const dx = player.x - w.x;
    const dy = player.y - w.y;
    const d = Math.hypot(dx, dy);
    if (d < WISP_SHY && d > 1) {
      const push = ((WISP_SHY - d) / WISP_SHY) * 2.2;
      x += (dx / d) * push * 260;
      y += (dy / d) * push * 260;
    }
    if (d < 70 && player.dashCooldown <= 0) dash = true;
  }
  const len = Math.hypot(x, y);
  if (len < 1) return { steer: null, dash };
  return { steer: { x: x / len, y: y / len }, dash };
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, null, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const move = autopilot(world.state, false);
      if (world.step(STEP, move.steer, move.dash, false) & EVENT_OVER) break;
    }
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      const move = autopilot(world.state, false);
      const events = world.step(STEP, move.steer, move.dash, false);
      if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
      if (events & EVENT_OVER) break;
    }
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const move = autopilot(world.state, true);
    if (world.step(STEP, move.steer, move.dash, false) & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}
