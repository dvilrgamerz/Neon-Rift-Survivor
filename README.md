<div align="center">

# 🌌 Neon Rift Survivor V3

### Survive the rift. Build a loadout. Evolve your arsenal.

An original browser-based **bullet-heaven / endless survival game** built with HTML5 Canvas, CSS, and vanilla JavaScript.

[![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=111)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)](https://www.netlify.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Version](https://img.shields.io/badge/Version-V3-8B5CF6)
![Mobile](https://img.shields.io/badge/Mobile-Touch%20Ready-22C55E)

**🎮 [PLAY THE LIVE GAME](https://neon-rift-survivor.netlify.app)**

</div>

---

## V3

V3 is a gameplay and reliability upgrade focused on making the project feel more complete and consistent.

### Major V3 improvements

- Fixed piercing projectiles repeatedly damaging the same enemy every frame.
- Split enemy contact-damage cooldowns from Orbit Guard hit cooldowns.
- Added a real game-state system for menu, playing, paused, level-up, and game-over states.
- Escape can no longer accidentally resume gameplay behind the level-up screen.
- Added real level scaling for every active weapon.
- Added maximum levels to upgrades so maxed skills leave the upgrade pool.
- Added genuine EVO behavior changes instead of simple hidden level boosts.
- Energy Cube now stacks through a persistent cooldown multiplier.
- Added per-difficulty best scores.
- Added validation/clamping for saved custom difficulty values.
- Removed duplicate game-mode click handling.
- Added enemy, projectile, particle, and XP-gem limits/merging for better late-run performance.
- Added an in-game loadout display.
- Renamed the arsenal around the original Neon Rift identity.

## 🎮 Gameplay

Move around the arena while weapons fire automatically. Defeated enemies drop energy. Collect enough energy to level up and choose one of three upgrades.

Active weapons can reach **Level 5**. When a Level 5 active has its matching passive support skill, it evolves into a stronger EVO form with changed behavior, visuals, damage, projectile count, cooldown, radius, or other properties.

## 🕹️ Controls

| Platform | Controls |
|---|---|
| Desktop | WASD or Arrow Keys |
| Desktop | Esc to pause/resume during active gameplay |
| Mobile / Tablet | Touch and drag anywhere on the game canvas |
| All | Weapons fire automatically |

## 🎚️ Difficulty modes

| Mode | Description |
|---|---|
| Easy | Lower enemy HP/speed, slower spawning, more HP and XP |
| Standard | Balanced default experience |
| Nightmare | Tougher enemies, faster spawning, stronger bosses |
| Impossible | Extreme enemy scaling with double bosses |
| Custom | Configure enemy HP, speed, spawn rate, boss power, player damage, XP, HP, and double bosses |

Best scores are stored separately for each mode. Custom settings are stored locally in the browser.

## ⚡ V3 Active Arsenal

| Active | Style |
|---|---|
| Rift Disc | Radial piercing energy discs |
| Gravity Brick | Heavy targeted kinetic blocks |
| Ion Drill | Fast line-piercing projectiles |
| Spiked Core | Long-lived rolling energy core |
| Phase Field | Continuous close-range damage field |
| Orbit Guard | Rotating defensive blades |
| Prism Lance | High-speed piercing beams |
| Arc Conductor | Multi-target chain strikes |
| Rift Mine | Proximity explosions |
| Plasma Pool | Persistent damage zones |
| Crescent Wave | Periodic area shockwave |
| Void Missile | Homing explosive missiles |
| Kinetic Orb | Fast radial kinetic projectiles |

## 🌟 EVO system

An EVO requires:

1. An active weapon at Level 5.
2. Its matching passive support skill.

Current EVOs include Singularity Disc, Titan Block, Rail Drill, Nova Core, Aegis Field, Rift Sentinel, Event Horizon Lance, Riftstorm, Sun Mine, Starfire Pool, Eclipse Wave, Nova Warhead, and Quantum Orb.

Unlike the previous build, EVOs in V3 change actual weapon behavior rather than only adding hidden levels.

## 🧠 Passive upgrades

V3 includes Flux Magnet, Vital Matrix, Ammo Thruster, Reactor Fuel, Nano Regen, Exo Bracer, Energy Cube, Plasma Catalyst, Phase Armor, Vector Boots, Overcharge Core, Attack Booster, Critical Module, and Repair Nanites.

Most passives have a Level 5 cap. Repair Nanites is a situational healing choice and only appears when health is meaningfully below maximum.

## 📈 Performance safeguards

V3 keeps the simple Canvas architecture but adds practical caps and merging behavior for enemies, bullets, particles, and uncollected XP gems. This helps long runs remain playable on lower-power laptops and phones without requiring a large framework or backend.

## 🧱 Project structure

```text
Neon-Rift-Survivor/
├── index.html
├── styles.css
├── v3.css
├── src/
│   ├── game.js        # previous engine retained for history
│   └── game-v3.js     # V3 engine
├── netlify.toml
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## 💻 Run locally

You can open `index.html` directly in a modern browser, or run a local static server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## 🚀 Netlify

The project is fully static and requires no database, Node server, or paid backend. Connect the GitHub repository to Netlify with no build command and publish directory `.`.

## 🗺️ Next ideas

- Ranged enemy classes
- Bosses with unique attacks and phases
- Audio/music settings
- Character selection
- Permanent progression
- Achievements
- Multiple arenas
- PWA/offline support
- Gamepad support
- Optional online leaderboard

## 📄 License

Released under the MIT License. See [LICENSE](LICENSE).

---

<div align="center">

**Neon Rift Survivor V3** • HTML5 Canvas • CSS • JavaScript • 2026

</div>
