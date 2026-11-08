# CLAUDE.md · Deepa Quest

## What this is
A mobile-first web game that teaches why Diwali is celebrated across India and the world.
The player travels a map of 13 places. Each place = tap-through story panels → mission → one quick
mini-game → 0–3 stars → a collectible "lamp card" fact. Hosted on GitHub Pages.
Playable in 8 languages: English, हिन्दी, ਪੰਜਾਬੀ, বাংলা, தமிழ், ગુજરાતી, नेपाली, Bahasa Melayu.

## Golden rules
1. The whole game lives in `index.html` (HTML + CSS + one `<script>`). No build step, no npm, no frameworks.
2. Zero network requests: no CDNs, web fonts, images or audio files. Sound = Web Audio (`sfx`).
3. **No emoji, anywhere.** Art = the SVG path icon set `IC` (rendered as `<symbol>`s for the DOM and as
   cached `Path2D` sprites for canvas) + CSS + canvas. A grep for emoji code points must return nothing.
4. Mobile first: 360–430px portrait, touch, safe-area insets. Desktop shows a centred phone frame.
5. Fast: one animation loop via `G.loop`, sprites cached by `sprite()`/`spr()`, no DOM creation inside canvas
   loops. Budget: ~220 KB raw / ~70 KB gzipped (translations are most of it).
6. Cultural accuracy beats features. Every story line, quiz answer and card fact must be checkable.
   Where traditions differ, write "in many tellings". Stay respectful to every faith and region.
   Translations need a native-speaker review before they are treated as final.
7. Tap targets ≥ 44px. Respect `prefers-reduced-motion` (no shake/flash, fewer particles). Keyboard works:
   arrows / Space / Enter in stories, Esc to pause or close.

## Code map (top to bottom inside `<script>`)
- Helpers: `$`, `$$`, `h(tag,class,html)`, `rnd`, `ri`, `clamp`, `shuffle`, `any`, `RM` (reduced motion)
- Icons: `PAL` colours, path helpers `cir/ell/rng/pet/ray`, `IC[name] = [[colourKey, pathD, evenodd?]…]` on a
  24×24 grid (`'c'` = currentColor). `ic(name, class)` → inline `<svg><use>`; `stars(n)`; `sprite/spr` for canvas.
  Draw circles and rects in the same (clockwise) direction or overlaps punch holes under nonzero fill.
- Save: `save` + `persist()` → localStorage `deepa-quest-v2` = `{stars:{levelId:0-3}, snd, hap, seen, lang, big}`
- I18n: `LN` (language names), `U[lang][key]` UI strings, `t(key, {x:…})` (single-letter placeholders),
  `TL` = language `t()` speaks now, `setUI()`, `X(L, lang)` level text, `langsOf(L)`, `lgOf(L)`, `gcfg(L, lang)`
- Feedback: `sfx.*`, `buzz(ms)`, `burst/confetti` (particle canvas `#fx`), `pop`, `flash`, `shakeEl`, `burstAt`
- `G`: pausable clock → `G.now()`, `G.loop(fn)`, `G.later(fn,ms)`, `G.cleanup`, `G.onResize`, `G.pause/resume/reset`
- HUD: `name(text)`, `time(0–1 | null)`, `score(html)`, `lives(n | null)`
- Canvas: `makeCanvas(el)` → `{c, ctx, W, H}`
- Data: `PRO` (prologue) and `LV[]` (levels, in map order)
- Screens: `goTitle`, `pickLang`, `goMap/renderMap`, `openStory/renderStory`, `startGame`, `pauseMenu`,
  `showResult`, `finale`, `goAlbum`, `settings`. `modal(html, onEsc)`.
- Engines: `E[type]` plus helpers `field()`, `rel()`, `segDist()`, `keys()`

## Level schema (`LV[]`)
`{id, name, where, icon, color, deco, chap?, ll?, sbg, gbg, gdeco?, story:[[[iconNames…], text]…], mission, goalText, game:{type, …cfg}, card:[icon, title, fact], tr?}`
- `id` is the save key. Never rename a shipped id (players would lose their stars).
- `icon`, `deco`, `gdeco[]`, `card[0]` and story art are `IC` names.
- `chap` is a `U` key (`ch1`…`ch5`) that starts a new chapter label on the map.
- `ll` = the place's own language(s). The story screen offers a toggle: English ⇄ UI language ⇄ `ll`.
- `tr[lang] = {n, w, s:[panel texts], m, g, u?, c:[title, fact], x?}`; any missing field falls back to English.
  `x` translates game content: swipe `[[statement, explanation]…]`, quiz `[[q, [4 answers], explanation]…]`,
  memory `[[word, meaning]…]`, same order as the English cfg.
- Unlocking is linear: level i opens when level i−1 has ≥ 1 star.
- Inside a level, UI strings follow the story language (`TL = cur.lg`); outside, the UI language.

## Engine contract
`E[type] = (stage, cfg, done) => { … }`
- Build all UI inside `field(stage, cssClass)`; it is wiped when the next game starts.
- Never add listeners to stage or window directly. Use `keys(fn)` for keyboard (auto-cleaned).
- Time everything with `G.now()` / `G.loop()` so the pause menu freezes the game.
- All player-facing text goes through `t()`. Call `done({stars, line})` exactly once.

## Engines and cfg
| type | used by | cfg |
|---|---|---|
| tap | Ayodhya, Amritsar | good, bad? (icon names), badRate?, dim?, goal, time, spawn, min, accel, life, unit |
| shield | Govardhan | time |
| swipe | Pawapuri | cards: [icon, statement, 1 or 0, explanation] |
| rhythm | Kolkata | none |
| slash | Goa & Tamil Nadu | goal, time |
| rangoli | Gujarat | none |
| quiz | Nepal, Finale | per (seconds), order?, pick?, items: [question, 4 answers with the correct one first, explanation] |
| runner | Kala Pani | time |
| simon | Trinidad | goal (keys 1–6 also work) |
| memory | Malaysia & Singapore | pairs: [word, meaning] |
| lights | Leicester | none |

## Common tasks
- Add a place: append to `LV` with 3–5 story panels, a mission, an existing engine, a card fact, and `tr` for its local language.
- Add a language: add it to `LN`, add a full `U[lang]` (the test below lists missing keys), add `tr[lang]` to `PRO` and `world`.
- Add an icon: add `IC.name` on the 24×24 grid; check it on a dark background at 24px and 120px.
- Add a mini-game: write `E.newType`, put its CSS beside the other game styles, then point a level at it.
  Grids holding percent-sized icons need `minmax(0,1fr)` tracks and `min-height:0` on `aspect-ratio` cells.
- Tune difficulty: change only that level's `game` cfg.
- Breaking save changes: bump `KEY`.

## Test before every push
- Run locally: `python3 -m http.server 8000`, open http://localhost:8000 (on a phone: your computer's LAN IP).
- DevTools device mode: 375×667 and 412×915, portrait first.
- Play every level to its result card. Toggle each story's language chip. Pause mid-game. Switch tabs (must
  auto-pause). Toggle sound, vibration, larger text. Switch UI language. Open the album. Reset progress.
- In the console, every `U[lang]` must have every `U.en` key, and every `tr[lang].s` must match its story length:
  `Object.keys(U).map(l=>[l,Object.keys(U.en).filter(k=>U[l][k]==null)])`
- The console must show zero errors.

## Deploy
Push to `main`. GitHub → Settings → Pages → Deploy from a branch → main / root.
Live at https://harshdeepkanhai.github.io/deepavali/
