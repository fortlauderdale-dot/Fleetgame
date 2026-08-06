# notes.md — City Fleet Manager build log

## Entry 1 — scaffold + title screen
- Repo initialized. Static site: `index.html` loads everything, no build step.
- Design direction: "municipal work order" aesthetic. Palette: asphalt charcoal, safety orange,
  municipal teal, sun-bleached sand, caution yellow. Display type Saira Condensed, data in IBM Plex Mono.
- Title screen is a paper work order with a hazard stripe, an APPROVED stamp, and a paw print.
  The paw print is foreshadowing.
- HUD, fleet roster panel, side panel, event banner, toast alerts, dispatch ticker, and a mobile
  tab bar are all in the HTML shell already. Panels become bottom sheets under 820px width.
- Three.js r160 via CDN import map (jsdelivr). OrbitControls gives touch orbit/pinch for free.
- Environment note: this build machine has no outbound network, so gpt-image-2 texture generation
  cannot run from here. Plan: procedural canvas textures as the always-works default, plus
  `scripts/gen-textures.mjs` that calls gpt-image-2 with the owner's API key and drops PNGs into
  `assets/textures/`. The game will prefer those files if present, fall back to procedural.
  Same reason git pushes are local-only; owner pushes with the provided remote commands.

## Entry 2 — meshes and scenery
- `js/textures.js`: procedural asphalt/sand/grass/water/hazard-stripe canvas textures, plus a
  baked parking-lot texture with painted slot stripes. `preferFile()` swaps in
  `assets/textures/*.png` if the gpt-image-2 script has been run.
- `js/vehicles.js`: eight procedural vehicle builders (utility pickup, inspector sedan,
  sanitation truck, beach tractor with rake tines, bucket truck, street sweeper with spinning
  brushes, electric van, stormwater pump truck). All face +X, wheels registered for rotation.
- Also in vehicles.js: `buildRaccoon(withHat)`. Ringed tail, bandit mask, optional tiny heist
  fedora for the crew leader. This is important municipal infrastructure.
- `js/props.js`: garage with bay doors + hazard stripe, fuel canopy with pump islands, palms,
  dumpster (raccoon spawn), light poles that switch on at night, admin trailer, gate with
  striped boom arm, chain-link fence.

## Entry 3 — full simulation + gameplay fixes
- `js/game.js` is the whole sim: day/night cycle, orbit+touch camera, 16-slot yard, garage bays,
  fuel canopy, gate, movement paths along the main lane, rain particles for hurricanes.
- Economy: $2,847,500 start (a familiar number), daily payroll, weekly council allocation scaled
  by fleet rating, tanker logistics for five stations, auto-resupply toggles, upgrades
  (bays, quick-lift, EV charger, raccoon latches, flood barriers), buy/sell with condition- and
  age-based auction values, scrap-price events.
- Events: Hurricane Watch → Hurricane Dolores → Post-Storm Flooding chain, King Tide, Beachfront
  Parade bonus, Heat Wave, plus nightly raccoon raids (single bandit or a three-raccoon heist
  crew, leader in a tiny fedora). Tap to shoo; five foils earn a council Vigilance Award.
- Failure state: one council bailout, then the county absorbs the fleet. A raccoon drives off in SW-1.
- Fixed on self-review before commit: vehicle facing math was inverted (meshes face +X, so the
  yaw is atan2(-dz, dx)), raccoons walked sideways due to lookAt on a +X model, missing status
  labels for the inbound/parking transitions, and a raycast fallback that false-positived
  raccoon taps at the world origin.

## Entry 4 — texture pipeline + packaging
- `scripts/gen-textures.mjs`: calls gpt-image-2 for seamless asphalt/sand/water textures and
  writes them into `assets/textures/`. The game's `preferFile()` loader picks them up on next
  load with zero code changes. Could not be executed here (no network in the build sandbox),
  so the procedural textures remain the shipped default and the game is fully playable as-is.
- Pushes are likewise local-only from this environment; full git history is in the repo, and the
  README carries the exact `git remote add` / `git push` commands.
- Playtest checklist that shaped tuning: starting fleet can cover ~70% demand if you deploy
  smart, first hurricane usually lands day 3-6, Riverside starts low on fuel on purpose
  (Stormwater and Streets share it — it matters during floods), and the sedan is the beater you
  sell first when scrap prices spike.
