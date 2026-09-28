<div align="center">

# 🌌 Neon Rift Survivor V4 — Rift Expedition

### Choose an Operator. Enter the Rift. Build an impossible loadout.

An original browser-based **bullet-heaven / endless survival game** built with **HTML5 Canvas, CSS, vanilla JavaScript, WebAudio, localStorage, and PWA APIs**.

[![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Responsive-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=111)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)](https://www.netlify.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Version](https://img.shields.io/badge/Version-V4.0-8B5CF6)
![Offline](https://img.shields.io/badge/PWA-Offline%20Ready-22C55E)
![Backend](https://img.shields.io/badge/Core%20Game-Backend%20Free-64748B)

**🎮 [PLAY THE LIVE GAME](https://neon-rift-survivor.netlify.app)**

</div>

---

## 🚀 What V4 changes

V4 turns Neon Rift Survivor from one endless arena into a larger **Rift Expedition** system with Operators, multiple arenas, permanent progression, missions, unique arena pressure, stronger boss encounters, Mythic upgrades, achievements, statistics, leaderboards, controller/mobile improvements, and generated VFX/SFX.

The stable V3 combat engine still handles the core frame loop, movement, collisions, XP, weapons, EVOs, and difficulty. V4 is implemented as modular layers instead of replacing that engine.

---

## 👤 Operators + Rift Classes

Every run combines a V4 **Operator** with the existing V3.3 **Rift Class**.

| Operator | Role | Starting bonus |
|---|---|---|
| Nova | Precision / Crit | +10% damage, +4% crit |
| Titan | Defense / Shield | +25 HP, +8% armor, +15 shield |
| Volt | Chain / Cooldown | Starts with Arc Conductor Lv.1, faster skills |
| Ghost | Speed / Dodge | +15% movement, +8% dodge |
| Forge | Explosive / Area | Starts with Rift Mine Lv.1, +10% area |

Rift Classes remain available underneath V4: Assault, Vanguard, and Velocity.

---

## 🌍 Five arenas

| Arena | Hazard style | Boss identity |
|---|---|---|
| Neon City | Energy surges | Grid Tyrant |
| Void Factory | Laser sweeps | Assembler Prime |
| Frozen Rift | Cryo slow zones | Cryo Colossus |
| Magma Core | Damaging magma vents | Inferno Engine |
| Final Rift | Unstable anomaly zones | Rift Sovereign |

Arenas affect both gameplay pressure and final score multipliers.

---

## 🎯 V4 run modes

- **Endless** — classic survival and high-score play.
- **Expedition** — survive 6 minutes and defeat 2 bosses.
- **Daily Challenge** — date-seeded Operator/Arena setup with a dedicated daily board.
- **Rift Ascension** — every boss permanently increases enemy and boss pressure during the run.

The original Easy / Standard / Nightmare / Impossible / Custom difficulty system still applies on top of the V4 run mode.

---

## 🧬 Rift Core progression

V4 runs award **Rift Cores**. Cores can be spent in a capped permanent progression grid:

- starting damage
- starting HP
- movement speed
- Rift Luck
- extra upgrade rerolls
- starting/regenerating shield
- lifesteal
- dodge

Caps keep the game from turning permanent progression into an automatic win.

---

## 🌟 Upgrade rarity + Mythic

V3.2 still provides the normal card rarity system:

- Common — 45%
- Uncommon — 28%
- Rare — 16%
- Epic — 8%
- Legendary — 3%

V4 adds a separate **Mythic promotion** roll. Base Mythic promotion chance starts at **0.50%** and Rift Luck can increase it. A Mythic promotion adds a stronger extra reward without removing the underlying V3.2 upgrade/EVO logic.

---

## ⚡ EVOs + Synergies + Ultimate Synergies

The V3 EVO system still requires a Level 5 active weapon plus its matching passive.

V3.3 build synergies remain active, and V4 adds four larger three-piece combinations:

- **Supernova Grid** — Arc Conductor + Plasma Pool + Energy Cube
- **Kinetic Tempest** — Rift Disc + Kinetic Orb + Vector Boots
- **Fortress Prime** — Phase Field + Orbit Guard + Phase Armor
- **Nova Barrage** — Void Missile + Rift Mine + Reactor Fuel

---

## 👹 Enemies, Elites, bosses, and status effects

V3.3 enemy behaviors remain: Chaser, Charger, Shooter, Splitter, Shielded, and boss phases.

V4 adds Elite modifiers such as:

- Swift
- Fortified
- Explosive
- Berserk
- Vampiric

The V4 combat layer also adds shield, dodge, lifesteal, Burn, Shock, Slow, and arena-specific boss pressure.

Defeated bosses can open a **Rift Cache** with three reward choices.

---

## ✨ Ability VFX + original SFX

V4 adds effects directly to the existing weapon system instead of using copied game assets.

### Visual effects
- ability rings and sparks
- explosion feedback
- EVO and Ultimate Synergy effects
- Mythic presentation
- Elite/boss outlines
- arena hazard telegraphs
- optional damage/status text
- optional screen shake

### Audio
Original browser-generated WebAudio cues are used for:
- Pulse Blaster
- Rift Disc
- Gravity Brick
- Ion Drill
- Spiked Core
- Prism Lance
- Arc Conductor
- Rift Mine
- Plasma Pool
- Crescent Wave
- Void Missile
- Kinetic Orb
- EVO unlocks
- Synergy unlocks
- Legendary / Mythic cards
- bosses
- reward caches
- incoming damage
- UI actions

There are no copied commercial-game SFX in the V4 implementation.

---

## 🏆 Leaderboards, stats, achievements, and run history

V4 stores **Top-10 local leaderboards** by run mode + arena + difficulty. Daily Challenge uses a separate date-keyed board.

Leaderboard entries track:
- score
- Operator
- Rift Class
- arena / run mode
- survival time
- bosses defeated

V4 also stores lifetime runs, kills, bosses, play time, best score, Mythic picks, EVOs, Rift Cores earned, achievements, and up to 30 recent run summaries.

The leaderboard is local/offline in V4.0, so the core game still requires no paid backend. The data model can later be connected to an optional global service.

---

## ⚙️ Settings and accessibility

The V4 Expedition Hub includes controls for:

- SFX volume
- generated ambient volume
- VFX intensity
- reduced motion
- damage/status text
- screen shake
- gamepad input
- fixed mobile joystick
- performance mode

---

## 🎮 Controls

| Platform | Control |
|---|---|
| Keyboard | WASD / Arrow Keys — move |
| Keyboard | Esc — pause/resume |
| Keyboard | 1 / 2 / 3 — upgrade choice |
| Keyboard | R — reroll |
| Touch | Drag — movement |
| Controller | Left stick — movement |
| Controller | A — first level-up choice |
| Controller | B — normal reroll |
| Controller | Start — pause/resume |

---

## 💾 Save system

V4 uses a versioned `neonRiftV4Save` local save object.

The Settings panel supports **Export Save** and **Import Save** so progression, stats, settings, history, and local leaderboards can be backed up or moved manually.

---

## 📱 Installable / offline

V4 includes:

- `manifest.webmanifest`
- V4 SVG app icon
- service worker asset caching

Supported browsers can install the site as a PWA. After the initial cache has been populated, the static game can load offline.

---

## 🧱 V4 architecture

```text
index.html
styles.css
v3.css
v3.1.css
v3.3.css
v4.css
src/
├── game-v3.js
├── upgrade-v3.1.js
├── v3.3.js
└── v4/
    ├── config.js
    ├── audio-vfx.js
    ├── rarity-patch.js
    ├── gameplay.js
    └── meta.js
assets/
└── v4-icon.svg
manifest.webmanifest
sw.js
docs/V4.md
scripts/validate-v4.js
CHANGELOG.md
LICENSE
```

### Layer responsibilities

- `game-v3.js` — core real-time game loop and weapon/EVO engine
- `upgrade-v3.1.js` — strategic upgrade cards and V3.2 rarity rolls
- `v3.3.js` — Rift Classes, smarter enemy AI, three-phase boss logic
- `v4/config.js` — V4 data definitions and versioned save model
- `v4/audio-vfx.js` — ability/event VFX and generated WebAudio
- `v4/rarity-patch.js` — Mythic promotions and permanent Core rerolls
- `v4/gameplay.js` — Operators, arenas, hazards, progression stats, missions, scoring
- `v4/meta.js` — Expedition Hub, leaderboards, Core Grid, settings, stats, save tools

---

## 🧪 Validation

V4 includes `scripts/validate-v4.js` for static integration checks. JavaScript source files should also pass `node --check` before merging.

Manual release testing should cover:
- start/restart
- every Operator
- every arena
- every V4 run mode
- boss reward cache
- level-up/reroll/Mythic behavior
- game-over and Expedition victory
- local leaderboard creation
- Rift Core spending
- settings
- save export/import
- touch controls
- controller controls
- service-worker/offline install behavior

See [`docs/V4.md`](docs/V4.md) for the V4 design and release checklist.

---

## 🛠️ Tech stack

- HTML5 Canvas
- CSS3
- Vanilla JavaScript
- WebAudio API
- Pointer Events
- Gamepad API
- localStorage
- Service Worker + Web App Manifest
- Netlify static hosting

No game engine, front-end framework, database, or paid runtime backend is required for the V4 core experience.

---

## 📜 License

MIT — see [`LICENSE`](LICENSE).

Built as a learning project to understand real-time browser game systems, progression design, input handling, state management, audio/VFX, performance, offline storage, and release workflows.
