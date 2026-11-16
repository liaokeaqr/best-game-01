# Star Shepherd

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/liaokeaqr/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/liaokeaqr/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

**Star Shepherd** is an original 2D arcade game for [make.fun's best-game-01 bounty](https://make.fun/bounty/best-game-01): *make the best game*. You are a little comet shepherd with a lantern, flying through a night sky. Lost starlings drift through the dark — gather them into a glowing trail behind you, then carry them home to the Moon. Void wisps hunt you: dash through one to scatter it, or lose a lantern-light and half your trail. Bank each night's quota to greet the next night; finish Night 5 and dawn breaks.

## How to play

Serve `game/` with any static file server (or `node serve.ts`, then open http://localhost:8080) and play in a desktop browser. The game loads no network requests: every script, image and sound is a file under `game/` or synthesised in code.

- **Move** — mouse (the shepherd flies toward the pointer) or WASD / arrow keys.
- **Dash** — Space or click. A dash bursts through a void wisp and dispels it for bonus points; it recharges in about a second.
- **Goal** — collect starlings into your trail (up to 8), fly into the Moon's ring to bank them. A full trail pays much more than single starlings.
- **Nights** — each night asks for a quota of banked starlings (9, 12, 15, 18, 21). Bank the quota to reach the next night. Finish Night 5 to win.
- **Lives** — 3 lantern-lights. A wisp's touch costs one light and scatters half your trail. Lose all three and the night ends.
- **Pause** — P or Esc. **Mute** — M. **Restart** — Space or click on the end screen.

## The game

- `game/index.html` — the page: a full-window canvas and a screen-reader status line.
- `game/src/config.js` — every tuning number and colour in one place.
- `game/src/random.js` — the seeded random generator behind repeatable nights.
- `game/src/input.js` — keyboard and pointer input, with one-shot actions queued per frame.
- `game/src/audio.js` — every sound synthesised with WebAudio; no audio files.
- `game/src/world.js` — the rules: the shepherd, starlings and their trail, hunting wisps, the Moon's ring, score, lives and nights.
- `game/src/render.js` — the night sky: nebulae, twinkling stars, the sleeping valley, the Moon, the comet and its lantern, the HUD and the screens.
- `game/src/shots.js` — the screenshot scenes (`?shot=start|play|win|end`), played forward by an autopilot under the real rules.
- `game/src/main.js` — boot and the fixed-step loop, the five screens, best-score saving.

Screenshots in `screenshots/` are real renders of the game's own code in a browser: the title screen, play in progress, the dawn-breaks win screen, and the game-over screen with its restart.

## Licence

MIT — see [LICENSE](LICENSE).
