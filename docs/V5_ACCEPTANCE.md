# V5 Rift Nexus — acceptance record

Review date: 2026-09-20. This document distinguishes implemented code and automated checks from release acceptance. **V5 is not certified as a stable release by this checklist.** Browser playthroughs, physical controller/touch checks, and reference-device performance measurements are still required.

## Local interface upgrade — 2026-09-25

The local UI now has a prominent Start Run action, selectable difficulty cards, compact navigation and HUD, a short launch transition, upgrade stat previews, and expanded results. Pause offers resume, settings, restart and quit, with confirmation before losing progress. Menus scroll independently of combat, and touch controls are hidden during required choices. Reduced-motion/flash settings, master volume, and duplicate reward selection guards are wired to actual behavior.

Portrait phones use a closer camera with space reserved for the HUD and touch controls. Rendering and mouse aim share the same camera transform; landscape framing and simulation coordinates are unchanged. All 115 Node tests and the static production build passed on 2026-09-25, including camera boundaries, aim mapping, and the existing deterministic gameplay regressions.

`scripts/playtest-ui.mjs` exercises the production preview in isolated Edge profiles. It checks launch, pause/resume, a browser-only injected level-up, Escape protection, upgrade selection, natural combat defeat, replay, confirmed quit, difficulty persistence, 360/390/430px layouts, landscape, emulated touch movement, and settings after reload. The injected XP fixture is never shipped. Artifacts are written locally to `artifacts/ui-playtest.json` and `artifacts/after-*.png`.

The final browser pass completed successfully with no page errors. Screenshot review confirmed the larger portrait arena and tips clear of the touch buttons. The existing in-app browser received the update through the menu's Apply update action, retained its local progression, and showed the new home screen without console warnings or errors.

The game remains local and offline-capable; no paid asset or required service was added. The public configuration build rejects privileged Supabase keys. Local security checks and browser tests do not establish that the user's Supabase project is connected, that email works, or that remote RLS has been deployed. Physical controller/mobile testing, sustained hardware performance, and the full V5 release checklist below remain separate acceptance work.

## Implemented scope and evidence

| Area | Implemented behavior | Automated evidence | Remaining acceptance |
| --- | --- | --- | --- |
| Combat foundation | Fixed-step simulation, shield-before-HP damage, dead-entity removal, queued rewards, unified Mythic selection, dash and operator cooldowns | `engine.test.js` exercises damage, same-frame boss/level rewards, input-independent selections, dash, deterministic replay, and failure objectives | Real playthrough for attack readability, feel, balance, and unavoidable hazard combinations |
| Content | Eight operators and abilities, eight biomes/boss definitions, twenty weapons and evolutions, fourteen relics, six solo modes | Catalogue validation plus every-weapon damage, every evolution, every ability, relic replacement and synergy tests | Exercise each item and boss in a rendered browser; verify distinct visuals/audio and advertised behavior |
| Campaign | Three acts/fifteen encounters, route choices, timed objectives, shops/events, progression unlocks | Simulation tests complete the route sequence and verify hunt/reactor failure and queued final rewards | Complete victory and defeat through normal UI; measure the 20–30 minute target with human play |
| Saves and checkpoints | V4 migration with preserved legacy key, validated imports, versioned records, IndexedDB checkpoint journal, ordered writes, encounter-entry restart | `storage.test.js` and `checkpoints.test.js` cover migration, failed imports, interrupted writes, completed-run rejection, and reward-farming boundaries | Browser refresh/close/resume and storage failure cases; verify actual IndexedDB transactions in supported browsers |
| Controls | Keyboard rebinding, mouse aim, automatic aim, dual touch sticks, fixed/floating movement stick, gamepad axes/buttons, focus-loss handling | Mocked input tests cover bindings, edge handling, disabled controller input, touch origin, and forced-pause callbacks | Physical controller navigation/disconnect/haptics; simultaneous two-touch movement and aiming; portrait/landscape safe areas |
| Presentation/accessibility | Procedural arena art, ship/operator badges, weapon companions, telegraph shapes, supply beacons, boss HP/phase/enrage feedback, quality/VFX settings, reduced motion/flash, contrast presets | Canvas API smoke checks render all biomes with hazards/effects/co-op states; no pixel or screenshot comparison is implied | Visually inspect all layouts and options, zoom/UI scale, warnings, contrast, focus indicators, and text legibility |
| Sound | Generated WebAudio effects and biome ambience with separate settings; stop/restart lifecycle | Fake-AudioContext tests cover graph creation, shutdown and a subsequent run | Listen on actual browser/device: autoplay unlock, clipping, muted settings, backgrounding and repeated runs |
| Nexus progression | Cosmetic profile/weapon mastery, achievements, discoveries, lore, classes/subclasses, eight-week seasons, weekly challenges | `nexus.test.js` covers UTC rollover, deterministic catalogues, idempotent awards, class gating and validation | Complete progression through the UI; check that visible milestones, reward tracks and cosmetics match saved state |
| Build/history tools | Six/six/three build planner, up to eight favorites, two-run comparison, bounded score ghosts, result summaries/cards | Build-code round trips; bounded ghost samples, Unicode sharing, validation, interpolation and HTML escaping | Clipboard/download flows, importing a favorite/ghost, result-card appearance and cross-version messaging |
| Optional network | Self-hosted accounts, cloud revisions, friends, moderation, ranked Daily tickets, private co-op/spectating/reconnect | `server.test.js` uses real local HTTP; `coop.test.js` exercises an authoritative shared world, personal rewards, revive, disconnection and campaign completion | Two real browser clients: account switching, conflicting cloud revisions, ready/loadout choices, rewards, settings/pause, spectating and network interruption |
| App integration | Offline guest startup, hub navigation, launch, pause, end, and relaunch | `app.test.js` runs a mocked DOM/Canvas environment | This is not browser rendering, touch, focus, or network UI acceptance; perform the browser cases below |
| Offline/update delivery | Static build, manifest, service-worker precache, explicit update activation | Build/static checks can verify files exist; no successful installed-service-worker test is recorded here | Install, disconnect network, reload, complete a run, and activate an update safely at the menu |

On 2026-09-20, `npm.cmd run check` passed all 99 tests and built 15 production assets from the uncommitted `codex/v5-riftfall` working tree, balance 5.0.1. Re-run against the eventual release commit.

## Browser verification performed — 2026-09-20

Codex in-app Chromium browser on Windows, local production preview at `http://127.0.0.1:4173/`:

- Launched Campaign, selected an Overgrown Circuit survival route, paused, used Save & leave, reloaded, and resumed the saved encounter at its initial state.
- Ended the expedition through its confirmation dialog and reached results; returned to the hub and launched another run.
- Started Training, changed manual aim in settings without resetting the run, activated dash (2 to 1 charges) and Nova ability (24-second cooldown).
- Reached a natural level-up. Escape did not dismiss the required choice; keyboard 1 selected Solar Brand. A subsequent projectile death displayed damage, build, cause, and zero Training progression.
- Manual aim and Training selection survived reload. Sampled runtime logs before the offline test contained no errors.
- Exercised 390×844 and 844×390 viewport overrides; this was not physical touch testing or a complete visual/accessibility audit. Reset overrides afterward.
- Installed a new service-worker cache through the visible Apply update action at the hub; the updated page title confirmed activation.
- Stopped the static server completely, reloaded from the service-worker cache, and launched/paused Training successfully. Restarted the server afterward. This establishes cached launch, not an entire offline campaign or multi-tab update safety.

Testing found and fixed a zero-progress Core-farming exploit. Balance 5.0.1 removes the one-Core minimum, with a dedicated automated regression. The old test profile retains the one Core earned before this fix; user storage was not reset.

## Candidate verification commands

Run from the project root with Node.js 22 or later:

```powershell
npm.cmd run check
```

This runs the Node test suites and creates the static production build. It does not launch a browser, prove an offline installation, or measure device frame rate.

For a focused local-system check:

```powershell
node --test tests/nexus.test.js
```

Before installing the service worker, verify every entry in its `ASSETS` list exists in the served build and returns a successful response. One failed `cache.addAll` request prevents installation.

## Required browser and hardware acceptance

The complete release cases below remain open. Partial browser verification is recorded separately below; passing a subset does not complete a full release case.

- [ ] Record candidate commit, browser/version, OS, display size, device pixel ratio, and input hardware.
- [ ] Complete one normal campaign victory and one defeat from launch through results without developer state changes. Check encounter rewards, relic replacement, shop purchases, failure conditions, enrage, and unlocks.
- [ ] Use all operators and new weapons/evolutions; verify every biome boss's telegraphs, phases, health display, escape routes and audio.
- [ ] Select rewards with pointer, keyboard and controller; confirm identical resulting builds and that Escape/Start cannot bypass required choices.
- [ ] Verify manual aim both ways, retained direction, rebinding, repeated runs, loss of focus, modal dismissal, and controller disconnection.
- [ ] Check touch movement plus aim while activating dash/ability, fixed/floating sticks, portrait/landscape rotation, safe areas and reward-screen visibility on actual touch hardware.
- [ ] Check reduced motion, reduced flash, VFX intensity, contrast presets, UI scaling and haptics with their corresponding devices/settings.
- [ ] Suspend and resume at every campaign boundary; close mid-encounter; verify earned rewards are neither duplicated nor silently lost. Reject malformed imports without replacing the current save.
- [ ] Test real browser offline installation/reload and an update while a run is active; activate the update only after returning to the menu.
- [ ] Test two browser clients against the optional server: separate loadouts/rewards, host transfer, disconnect/reconnect, downed/revive, spectator restrictions, room exit, cloud conflicts and account switching.
- [ ] Exercise every visible navigation/action, copy/download/import flow, result card, favorite build and ghost benchmark.
- [ ] Play a long session and monitor memory, audio nodes, entity counts, frame time and repeated menu/run transitions.

## Performance and release gate

| Measurement | Target | Recorded hardware/result |
| --- | --- | --- |
| Desktop heavy combat | 60 FPS target | Not measured on a reference device |
| Mobile heavy combat | At least 30 FPS target | Not measured on a reference device |
| Full campaign duration | 20–30 minutes target | Not measured through human play |
| Long-session memory | No sustained unbounded growth | Not profiled in a real browser |

Do not mark these targets achieved based on Node simulation speed, a successful HTTP response, or a Canvas mock. Attach actual device measurements and browser acceptance evidence to the release candidate. Keep the current public game available until the candidate passes the required checks; no deployment or public availability is asserted by this document.


