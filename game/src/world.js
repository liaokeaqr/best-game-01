// The game's rules and state, with no drawing and no browser in it: the shepherd comet, the
// lost starlings and their trail, the hunting wisps, the Moon's home ring, score, lives and
// nights. step() advances one fixed step and returns what happened as bit flags, so the caller
// can react without the world knowing about screens or sound. Nothing here allocates after
// createWorld returns.

import { FIELD, LIVES, MOON, NIGHTS, PLAYER, POOL, quotaFor, STARLING, WISP } from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_DELIVER = 2;
export const EVENT_HIT = 4;
export const EVENT_DISPEL = 8;
export const EVENT_NIGHT = 16;
export const EVENT_WIN = 32;
export const EVENT_OVER = 64;

export const MODE_FREE = 0;
export const MODE_CARRIED = 1;
export const MODE_SCATTERED = 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: 440,
    vx: 0,
    vy: 0,
    facing: -Math.PI / 2,
    invulnerable: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: -1,
    trail: [],
  };
  const starlings = [];
  for (let i = 0; i < POOL.starlings; i += 1) {
    starlings.push({ active: false, mode: MODE_FREE, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, retarget: 0, phase: random() * Math.PI * 2, scatter: 0 });
  }
  const wisps = [];
  for (let i = 0; i < POOL.wisps; i += 1) {
    wisps.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, heading: 0, retarget: 0, phase: random() * Math.PI * 2 });
  }
  const particles = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#ffffff' });
  }
  const popups = [];
  for (let i = 0; i < POOL.popups; i += 1) {
    popups.push({ active: false, x: 0, y: 0, text: '', life: 0 });
  }
  const chain = [];
  const state = {
    player,
    starlings,
    chain,
    wisps,
    particles,
    popups,
    score: 0,
    lives: LIVES,
    night: 1,
    banked: 0,
    quota: quotaFor(1),
    elapsed: 0,
    spawnTimer: 0,
    orbit: 0,
  };

  function freeParticle() {
    for (let i = 0; i < particles.length; i += 1) if (!particles[i].active) return particles[i];
    return null;
  }

  function burst(x, y, color, count, speed, size) {
    for (let i = 0; i < count; i += 1) {
      const p = freeParticle();
      if (p === null) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.6);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.life = 0.5 + random() * 0.4;
      p.max = p.life;
      p.size = size * (0.7 + random() * 0.6);
      p.color = color;
    }
  }

  function freePopup() {
    for (let i = 0; i < popups.length; i += 1) if (!popups[i].active) return popups[i];
    return null;
  }

  function popup(x, y, text) {
    const p = freePopup();
    if (p === null) return;
    p.active = true;
    p.x = x;
    p.y = y;
    p.text = text;
    p.life = 1.1;
  }

  function placeStarling(s, keepAway) {
    for (let tries = 0; tries < 12; tries += 1) {
      const x = 60 + random() * (FIELD.width - 120);
      const y = 170 + random() * (FIELD.height - 230);
      if (keepAway && dist2(x, y, player.x, player.y) < 160 * 160) continue;
      if (dist2(x, y, MOON.x, MOON.y) < 150 * 150) continue;
      s.x = x;
      s.y = y;
      s.tx = x;
      s.ty = y;
      s.vx = 0;
      s.vy = 0;
      s.retarget = 0.5 + random() * 1.5;
      return;
    }
    s.x = 120 + random() * (FIELD.width - 240);
    s.y = 220 + random() * (FIELD.height - 300);
    s.tx = s.x;
    s.ty = s.y;
  }

  function spawnStarling() {
    for (let i = 0; i < starlings.length; i += 1) {
      if (starlings[i].active) continue;
      const s = starlings[i];
      s.active = true;
      s.mode = MODE_FREE;
      placeStarling(s, true);
      return;
    }
  }

  function freeStarlingCount() {
    let count = 0;
    for (let i = 0; i < starlings.length; i += 1) {
      if (starlings[i].active && starlings[i].mode === MODE_FREE) count += 1;
    }
    return count;
  }

  function placeWisp(w) {
    const edge = Math.floor(random() * 4);
    if (edge === 0) { w.x = random() * FIELD.width; w.y = 40; }
    else if (edge === 1) { w.x = random() * FIELD.width; w.y = FIELD.height - 40; }
    else if (edge === 2) { w.x = 40; w.y = random() * FIELD.height; }
    else { w.x = FIELD.width - 40; w.y = random() * FIELD.height; }
    w.heading = random() * Math.PI * 2;
    w.retarget = 0.5 + random();
    w.vx = 0;
    w.vy = 0;
  }

  function spawnWisp() {
    for (let i = 0; i < wisps.length; i += 1) {
      if (wisps[i].active) continue;
      const w = wisps[i];
      w.active = true;
      placeWisp(w);
      return;
    }
  }

  function wispTarget() {
    return Math.min(WISP.maxCount, WISP.baseCount + WISP.perNight * (state.night - 1));
  }

  function starlingTarget() {
    return Math.min(STARLING.maxCount, STARLING.baseCount + STARLING.perNight * (state.night - 1));
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = 440;
    player.vx = 0;
    player.vy = 0;
    player.facing = -Math.PI / 2;
    player.invulnerable = 0;
    player.dashTime = 0;
    player.dashCooldown = 0;
    player.trail.length = 0;
    for (const s of starlings) s.active = false;
    for (const w of wisps) w.active = false;
    for (const p of particles) p.active = false;
    for (const p of popups) p.active = false;
    chain.length = 0;
    state.score = 0;
    state.lives = LIVES;
    state.night = 1;
    state.banked = 0;
    state.quota = quotaFor(1);
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.orbit = 0;
    for (let i = 0; i < starlingTarget(); i += 1) spawnStarling();
    for (let i = 0; i < wispTarget(); i += 1) spawnWisp();
  }

  function scatterChain(half) {
    const keep = half ? Math.floor(chain.length / 2) : 0;
    while (chain.length > keep) {
      const s = chain.pop();
      s.mode = MODE_SCATTERED;
      s.scatter = 0.7;
      const angle = random() * Math.PI * 2;
      s.vx = Math.cos(angle) * 260;
      s.vy = Math.sin(angle) * 260;
      burst(s.x, s.y, '#fbbf24', 4, 120, 2);
    }
  }

  function deliver() {
    const n = chain.length;
    if (n === 0) return 0;
    const points = n * STARLING.points + STARLING.pairBonus * (n * (n - 1)) / 2 + (n >= PLAYER.maxChain ? STARLING.fullChainBonus : 0);
    state.score += points;
    state.banked += n;
    popup(MOON.x, MOON.y + MOON.ring + 26, `+${points}`);
    burst(MOON.x, MOON.y, '#fde68a', 22, 260, 3);
    burst(player.x, player.y, '#67e8f9', 10, 160, 2);
    for (const s of chain) s.active = false;
    chain.length = 0;
    return points;
  }

  /**
   * One fixed step. `steer` is the wanted direction {x, y} (unit, or null to coast) and
   * `dash` asks for a dash. With `harmless` set (the title screen's backdrop) the shepherd
   * orbits the Moon, things drift, and nothing is picked up, hit or scored.
   */
  function step(dt, steer, dash, harmless) {
    let events = 0;
    state.elapsed += dt;

    if (harmless) {
      state.orbit += dt * 0.22;
      const ox = MOON.x + Math.cos(state.orbit) * 300;
      const oy = 380 + Math.sin(state.orbit * 0.7) * 120;
      player.vx = (ox - player.x) * 2.2;
      player.vy = (oy - player.y) * 2.2;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.facing = Math.atan2(player.vy, player.vx);
    } else {
      if (dash && player.dashCooldown <= 0 && player.dashTime <= 0) {
        player.dashTime = PLAYER.dashTime;
        player.dashCooldown = PLAYER.dashCooldown;
        const dx = steer ? steer.x : Math.cos(player.facing);
        const dy = steer ? steer.y : Math.sin(player.facing);
        const len = Math.hypot(dx, dy) || 1;
        player.dashX = dx / len;
        player.dashY = dy / len;
      }
      if (player.dashTime > 0) {
        player.dashTime -= dt;
        player.vx = player.dashX * PLAYER.dashSpeed;
        player.vy = player.dashY * PLAYER.dashSpeed;
        if (random() < 0.6) {
          const p = freeParticle();
          if (p !== null) {
            p.active = true;
            p.x = player.x;
            p.y = player.y;
            p.vx = -player.vx * 0.08;
            p.vy = -player.vy * 0.08;
            p.life = 0.35;
            p.max = 0.35;
            p.size = 2.5;
            p.color = '#a5f3fc';
          }
        }
      } else {
        const wantX = steer ? steer.x * PLAYER.speed : 0;
        const wantY = steer ? steer.y * PLAYER.speed : 0;
        const rate = Math.min(1, (PLAYER.accel / PLAYER.speed) * dt);
        player.vx += (wantX - player.vx) * rate;
        player.vy += (wantY - player.vy) * rate;
      }
      player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + player.vx * dt));
      player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + player.vy * dt));
      if (Math.hypot(player.vx, player.vy) > 40) player.facing = Math.atan2(player.vy, player.vx);
      if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
      if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    }

    // The trail remembers where the shepherd has been; carried starlings ride it.
    player.trail.unshift({ x: player.x, y: player.y });
    const trailCap = (PLAYER.maxChain + 2) * PLAYER.trailGap + 8;
    if (player.trail.length > trailCap) player.trail.length = trailCap;
    for (let i = 0; i < chain.length; i += 1) {
      const s = chain[i];
      const at = player.trail[Math.min(player.trail.length - 1, (i + 1) * PLAYER.trailGap)];
      s.x = at.x;
      s.y = at.y;
    }

    // Starlings drift, get magnetised near the shepherd, or fly off when scattered.
    for (let i = 0; i < starlings.length; i += 1) {
      const s = starlings[i];
      if (!s.active || s.mode === MODE_CARRIED) continue;
      s.phase += dt * 2;
      if (s.mode === MODE_SCATTERED) {
        s.scatter -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.x = Math.min(FIELD.width - 20, Math.max(20, s.x));
        s.y = Math.min(FIELD.height - 20, Math.max(20, s.y));
        if (s.scatter <= 0) s.mode = MODE_FREE;
        continue;
      }
      s.retarget -= dt;
      if (s.retarget <= 0) {
        s.tx = 60 + random() * (FIELD.width - 120);
        s.ty = 180 + random() * (FIELD.height - 240);
        s.retarget = 1 + random() * 2;
      }
      const dtx = s.tx - s.x;
      const dty = s.ty - s.y;
      const dlen = Math.hypot(dtx, dty) || 1;
      s.vx = (dtx / dlen) * STARLING.drift;
      s.vy = (dty / dlen) * STARLING.drift;
      if (!harmless) {
        const pdx = player.x - s.x;
        const pdy = player.y - s.y;
        const pd = Math.hypot(pdx, pdy);
        if (pd < STARLING.magnet && pd > 1) {
          s.vx += (pdx / pd) * STARLING.magnetPull;
          s.vy += (pdy / pd) * STARLING.magnetPull;
        }
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.x = Math.min(FIELD.width - 20, Math.max(20, s.x));
      s.y = Math.min(FIELD.height - 20, Math.max(20, s.y));
    }

    // Wisps wander, and hunt the shepherd once it comes close.
    const wispSpeed = WISP.speed + WISP.speedPerNight * (state.night - 1);
    for (let i = 0; i < wisps.length; i += 1) {
      const w = wisps[i];
      if (!w.active) continue;
      w.phase += dt * 3;
      w.retarget -= dt;
      const pdx = player.x - w.x;
      const pdy = player.y - w.y;
      const pd = Math.hypot(pdx, pdy);
      if (!harmless && pd < WISP.huntRange && pd > 1) {
        w.heading = Math.atan2(pdy, pdx);
      } else if (w.retarget <= 0) {
        w.heading = random() * Math.PI * 2;
        w.retarget = 0.8 + random() * 1.4;
      }
      w.vx = Math.cos(w.heading) * wispSpeed;
      w.vy = Math.sin(w.heading) * wispSpeed;
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      if (w.x < WISP.radius) { w.x = WISP.radius; w.heading = Math.PI - w.heading; }
      if (w.x > FIELD.width - WISP.radius) { w.x = FIELD.width - WISP.radius; w.heading = Math.PI - w.heading; }
      if (w.y < WISP.radius) { w.y = WISP.radius; w.heading = -w.heading; }
      if (w.y > FIELD.height - WISP.radius) { w.y = FIELD.height - WISP.radius; w.heading = -w.heading; }
    }

    // Sparks and popups fade on their own.
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    for (let i = 0; i < popups.length; i += 1) {
      const p = popups[i];
      if (!p.active) continue;
      p.life -= dt;
      p.y -= 34 * dt;
      if (p.life <= 0) p.active = false;
    }

    if (harmless) return 0;

    // Keep the field stocked with lost starlings.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = 0.6;
      if (freeStarlingCount() < starlingTarget()) spawnStarling();
    }

    // Pickups: a free starling close by joins the trail.
    for (let i = 0; i < starlings.length; i += 1) {
      const s = starlings[i];
      if (!s.active || s.mode !== MODE_FREE) continue;
      if (dist2(s.x, s.y, player.x, player.y) < STARLING.pickup * STARLING.pickup) {
        if (chain.length < PLAYER.maxChain) {
          s.mode = MODE_CARRIED;
          chain.push(s);
          burst(s.x, s.y, '#fbbf24', 6, 140, 2);
          events |= EVENT_PICKUP;
        }
      }
    }

    // The Moon's ring banks the whole trail at once.
    if (chain.length > 0 && dist2(player.x, player.y, MOON.x, MOON.y) < MOON.ring * MOON.ring) {
      deliver();
      events |= EVENT_DELIVER;
      if (state.banked >= state.quota) {
        if (state.night >= NIGHTS) {
          events |= EVENT_WIN;
        } else {
          state.night += 1;
          state.banked = 0;
          state.quota = quotaFor(state.night);
          for (let i = 0; i < WISP.perNight; i += 1) spawnWisp();
          burst(MOON.x, MOON.y, '#fef3c7', 30, 320, 3);
          events |= EVENT_NIGHT;
        }
      }
    }

    // Wisps: dash through one to dispel it; be caught and you lose a light and half the trail.
    const dashing = player.dashTime > 0;
    const touch = PLAYER.radius + WISP.radius;
    for (let i = 0; i < wisps.length; i += 1) {
      const w = wisps[i];
      if (!w.active) continue;
      if (dist2(w.x, w.y, player.x, player.y) > touch * touch) continue;
      if (dashing) {
        w.active = false;
        state.score += WISP.dispelPoints;
        popup(w.x, w.y - 24, `+${WISP.dispelPoints}`);
        burst(w.x, w.y, '#c084fc', 16, 220, 3);
        events |= EVENT_DISPEL;
        spawnWisp();
      } else if (player.invulnerable === 0) {
        state.lives -= 1;
        player.invulnerable = PLAYER.invulnerable;
        scatterChain(true);
        burst(player.x, player.y, '#f472b6', 18, 240, 3);
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
