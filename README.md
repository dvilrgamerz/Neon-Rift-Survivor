<div align="center">

# 🌌 Neon Rift Survivor V3

### Survive the rift. Build a loadout. Evolve your arsenal.

An original browser-based **bullet-heaven / endless survival game** built from scratch with **HTML5 Canvas, CSS, and vanilla JavaScript**.

[![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Responsive-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=111)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)](https://www.netlify.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Version](https://img.shields.io/badge/Version-V3-8B5CF6)
![Mobile](https://img.shields.io/badge/Mobile-Touch%20Ready-22C55E)
![Backend](https://img.shields.io/badge/Backend-None-64748B)

**🎮 [PLAY THE LIVE GAME](https://neon-rift-survivor.netlify.app)**

</div>

---

## 📖 About the project

**Neon Rift Survivor** is a project I built to learn how a real-time browser game works without relying on a large game engine or JavaScript framework.

The game runs almost entirely inside one HTML5 Canvas. The browser handles the rendering loop, input, collision detection, enemies, projectiles, XP drops, upgrades, difficulty settings, local saves, menus, and visual effects.

The goal was not only to make a playable survival game, but also to understand the systems behind one:

- how a game loop updates movement every frame
- how enemies track the player
- how automatic weapons choose targets
- how collisions and damage are calculated
- how XP and level-up systems work
- how upgrade pools and EVO combinations can be designed
- how different difficulty modes can change real gameplay values
- how to support both keyboard and touchscreen controls
- how to keep a long-running Canvas game from creating unlimited objects
- how to save player settings with `localStorage`
- how to deploy a complete browser game with no backend

V3 is the biggest rebuild of the project so far. It focuses on fixing gameplay bugs, improving progression, making the weapons more original, making long runs more stable, and making the code easier to reason about.

---

# 🚀 What's new in V3

V3 is more than a visual update. A large part of the game engine was rebuilt to make the systems behave consistently.

### Gameplay fixes

- Fixed piercing projectiles repeatedly damaging the same enemy every frame while overlapping it.
- Split enemy contact-damage cooldowns from Orbit Guard hit cooldowns.
- Added explicit game states for menu, gameplay, pause, level-up, and game over.
- Pressing `Esc` can no longer accidentally resume gameplay behind the level-up screen.
- Custom difficulty values are validated and clamped before the game uses them.
- Removed duplicate difficulty-button event handling.

### Progression improvements

- Every active weapon now has meaningful Level 1–5 scaling.
- Maxed upgrades are removed from the normal upgrade pool.
- Active weapons must reach Level 5 before they can evolve.
- EVOs now change real weapon behavior instead of only applying hidden level boosts.
- Energy Cube now stacks through a persistent cooldown multiplier.
- Added a live loadout HUD so the player can see current weapons, levels, and EVOs.
- Added separate best scores for Easy, Standard, Nightmare, Impossible, and Custom.

### Original Neon Rift arsenal

The weapon set was renamed and redesigned around the game's own sci-fi identity:

- Rift Disc
- Gravity Brick
- Ion Drill
- Spiked Core
- Phase Field
- Orbit Guard
- Prism Lance
- Arc Conductor
- Rift Mine
- Plasma Pool
- Crescent Wave
- Void Missile
- Kinetic Orb

### Performance improvements

Long survival runs can create hundreds of objects, so V3 adds practical limits:

```js
const MAX_ENEMIES = 260;
const MAX_GEMS = 420;
const MAX_PARTICLES = 650;
const MAX_BULLETS = 420;
```

When the XP-gem limit is reached, additional XP can be merged instead of allowing the game to create unlimited gem objects.

This keeps the project simple while making it much safer for lower-power laptops and phones.

---

# 🎮 How the game works

The core loop is simple:

1. Move around the arena.
2. Weapons automatically attack nearby enemies.
3. Enemies become stronger and spawn faster as the run continues.
4. Defeated enemies drop energy.
5. Collect energy to gain XP.
6. Level up and choose one of three randomized upgrades.
7. Build Active + Passive combinations.
8. Reach Level 5 on an active weapon and obtain its matching passive to unlock an EVO.
9. Survive bosses and increasingly dense enemy waves for as long as possible.

The game is endless, so difficulty continues scaling until the player is defeated.

---

# 🕹️ Controls

| Platform | Control |
|---|---|
| Desktop | `WASD` or Arrow Keys to move |
| Desktop | `Esc` to pause/resume during active gameplay |
| Mobile / Tablet | Touch and drag on the game canvas |
| All platforms | Weapons fire automatically |

The game uses Pointer Events for touch input, which lets the same control system work across phones, tablets, and other pointer-capable devices.

---

# 🎚️ Difficulty modes

Difficulty in Neon Rift Survivor is not only a label. Each mode changes actual values used by the game engine.

| Mode | Main behavior |
|---|---|
| Easy | Lower enemy HP and speed, slower spawning, higher player HP, more XP |
| Standard | Balanced default experience |
| Nightmare | Tougher enemies, denser waves, stronger bosses |
| Impossible | Extreme scaling, faster swarms, lower player damage, double bosses |
| Custom | Player-controlled difficulty multipliers |

Custom mode lets the player adjust:

- Enemy HP
- Enemy speed
- Spawn rate
- Boss power
- Player damage
- XP gain
- Starting HP
- Double bosses

V3 validates these values before using them so broken or outdated `localStorage` data cannot easily create invalid gameplay values such as `NaN`.

Best scores are stored separately for each mode using keys based on the selected difficulty.

---

# ⚡ Active weapons

Every active weapon can reach **Level 5**. Levels change things such as projectile count, radius, damage, duration, piercing, cooldown, or area.

| Weapon | Main role |
|---|---|
| Rift Disc | Radial piercing energy discs |
| Gravity Brick | Heavy targeted kinetic projectiles |
| Ion Drill | Fast line-piercing attacks |
| Spiked Core | Long-lived rolling energy core |
| Phase Field | Continuous close-range damage |
| Orbit Guard | Rotating defensive blades |
| Prism Lance | High-speed piercing beams |
| Arc Conductor | Multi-target electrical strikes |
| Rift Mine | Proximity explosions |
| Plasma Pool | Persistent ground damage |
| Crescent Wave | Periodic close-range shockwave |
| Void Missile | Homing explosive missiles |
| Kinetic Orb | Fast radial kinetic projectiles |

---

# 🧠 Passive upgrades

Passive upgrades strengthen the player or support EVO combinations.

Current passives include:

| Passive | Effect |
|---|---|
| Flux Magnet | Increases pickup range |
| Vital Matrix | Raises max HP and heals |
| Ammo Thruster | Increases projectile speed |
| Reactor Fuel | Increases area size |
| Nano Regen | Adds HP regeneration |
| Exo Bracer | Improves duration and orbit speed |
| Energy Cube | Reduces skill cooldowns |
| Plasma Catalyst | Increases zone duration |
| Phase Armor | Reduces incoming damage |
| Vector Boots | Increases movement speed |
| Overcharge Core | Increases overall damage |
| Attack Booster | Improves Pulse Blaster fire rate |
| Critical Module | Raises critical-hit chance |
| Repair Nanites | Restores HP when healing is useful |

Most passives have a Level 5 cap. Repair Nanites behaves more like a situational recovery option than a normal permanent stat tree.

---

# 🌟 EVO system

An EVO requires two conditions:

1. The matching active weapon must reach **Level 5**.
2. The matching passive must be owned.

Examples of V3 EVOs include:

- Rift Disc → **Singularity Disc**
- Gravity Brick → **Titan Block**
- Ion Drill → **Rail Drill**
- Spiked Core → **Nova Core**
- Phase Field → **Aegis Field**
- Orbit Guard → **Rift Sentinel**
- Prism Lance → **Event Horizon Lance**
- Arc Conductor → **Riftstorm**
- Rift Mine → **Sun Mine**
- Plasma Pool → **Starfire Pool**
- Crescent Wave → **Eclipse Wave**
- Void Missile → **Nova Warhead**
- Kinetic Orb → **Quantum Orb**

In V3, EVOs are not just names displayed on screen. The evolved state is checked by the weapon logic and changes actual properties such as damage, projectile count, attack pattern, radius, cooldown, or visuals.

---

# 🛠️ How I built Neon Rift Survivor

This section explains the main development process and the systems behind the game.

## 1. I started with a full-screen Canvas

The game uses a normal `<canvas>` element as the main play area.

JavaScript gets the 2D rendering context:

```js
const c = document.querySelector('#game');
const x = c.getContext('2d');
```

The canvas is resized whenever the browser window changes size. I also account for device pixel ratio so the game does not look unnecessarily blurry on high-resolution displays.

To avoid extremely large rendering buffers on high-DPI phones, the device pixel ratio is capped at `2`.

```js
dpr = Math.min(devicePixelRatio || 1, 2);
```

This is a balance between sharp visuals and performance.

---

## 2. I built a real-time game loop

The engine runs with `requestAnimationFrame()`.

The browser calls the loop repeatedly, and the game calculates `dt` — delta time — which is the amount of time since the previous frame.

The update side handles gameplay:

- player movement
- spawning
- shooting
- skills
- enemies
- collisions
- XP
- particles
- game-over checks

The draw side renders the newest state to the Canvas.

Conceptually the loop works like this:

```js
function loop(now) {
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
```

Using delta time instead of moving objects by a fixed number of pixels per frame helps movement stay more consistent when FPS changes.

I also cap large frame gaps so switching tabs or hitting a temporary lag spike does not cause enemies and projectiles to jump huge distances in one update.

---

## 3. I created a game-state system

Earlier versions relied mainly on simple `running` and `paused` booleans. That made it possible for states to conflict.

V3 uses explicit states:

```js
const STATES = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL: 'level',
  GAMEOVER: 'gameover'
});
```

This makes the rules clearer.

For example, `Esc` only switches between `PLAYING` and `PAUSED`. It cannot unpause a game that is currently waiting for a level-up selection.

This is one of the most important architectural changes in V3 because it prevents different screens from fighting over the same pause flag.

---

## 4. I added desktop and mobile movement

Keyboard movement checks WASD and Arrow Key state every update.

The direction is normalized before movement is applied. This prevents diagonal movement from being faster than horizontal or vertical movement.

For mobile, Pointer Events create a lightweight virtual joystick:

- `pointerdown` stores the starting position
- `pointermove` tracks the current drag position
- the difference between them becomes the movement direction
- `pointerup` and `pointercancel` stop movement

The joystick is drawn directly on the Canvas so no external mobile-control library is required.

---

## 5. I built enemy spawning and scaling

Enemies spawn outside the visible play area and move toward the player using an angle calculated with `Math.atan2()`.

Different enemy types use different combinations of:

- radius
- HP
- movement speed
- visual color
- damage

Difficulty values are multiplied into the enemy stats, and time-based scaling makes later enemies stronger than early enemies.

Bosses use the same overall entity system but have much larger HP, size, damage, and visual treatment.

The boss timer begins at 60 seconds and schedules later boss encounters as the run continues.

---

## 6. I built automatic targeting and shooting

The player does not manually aim the main weapon.

The engine searches for the nearest enemy, calculates an angle from the player to that enemy, and creates a projectile with velocity based on that direction.

This lets the player focus on positioning and upgrade decisions instead of mouse aiming.

Projectile objects store values such as:

- position
- velocity
- radius
- remaining life
- damage
- piercing count
- projectile type

Weapon upgrades modify those values before or while projectiles are created.

---

## 7. I fixed piercing collision behavior in V3

One of the biggest bugs in the previous engine was caused by piercing projectiles.

A projectile could remain inside the same enemy for several frames. Because collision detection runs every frame, that projectile could repeatedly damage the same target before leaving its hitbox.

V3 gives enemies unique IDs and lets projectiles remember targets they already hit.

That means a piercing projectile can continue through multiple enemies, but it cannot repeatedly apply full impact damage to the same enemy every frame.

This made weapon damage much more predictable and made balancing easier.

---

## 8. I separated different combat cooldowns

The previous build reused one enemy cooldown value for more than one purpose.

That created unexpected interactions between:

- enemy contact damage against the player
- Orbit Guard hitting an enemy

V3 separates those concepts so defensive orbit hits do not accidentally control whether an enemy is allowed to damage the player.

This is a small internal change that makes combat behavior much more reliable.

---

## 9. I built XP, gems, and level-ups

When an enemy dies, it creates XP/energy drops.

The player has a pickup radius controlled by the magnet stat. When a gem enters that radius, it accelerates toward the player.

When collected:

```text
XP increases → XP requirement is checked → player levels up → gameplay enters LEVEL state
```

The level-up screen then creates three randomized upgrade choices.

After the player chooses one, the upgrade is applied and gameplay resumes.

The XP requirement increases after each level so progression gradually slows as the run continues.

---

## 10. I designed the upgrade pool

V3 tracks two important values:

```text
owned[skill]
levels[skill]
```

`owned` answers whether the player has a skill at all.

`levels` tracks how many times it has been upgraded.

Active weapons and most passives have a maximum level. Once a skill reaches its cap, it is removed from normal randomized upgrade choices.

This prevents the game from offering upgrades that no longer do anything.

Repair Nanites is handled differently because it is a healing utility choice and should only be useful when the player is actually missing enough HP.

---

## 11. I rebuilt EVO progression

The first version of EVOs mostly increased hidden weapon levels.

For V3 I changed the design so an EVO has a real evolved state.

The game checks whether:

- the active is Level 5
- the required passive is owned
- that EVO has not already been unlocked

If all conditions are true, the EVO is stored in the evolved state and an on-screen announcement appears.

Weapon logic can then ask whether its EVO is active and use a stronger pattern.

This makes EVOs feel like transformations rather than invisible stat bonuses.

---

## 12. I made cooldown upgrades stack correctly

Energy Cube used to shorten the current timers, but future cooldown calculations still used only a fixed value.

V3 gives the player a persistent cooldown multiplier:

```js
cooldownMult: 1
```

Each Energy Cube upgrade modifies that multiplier:

```js
p.cooldownMult *= 0.88;
```

Skill cooldown calculations use the current multiplier, so repeated Energy Cube upgrades continue to matter.

---

## 13. I added persistent settings and records

The game uses browser `localStorage` for lightweight persistence.

It stores things such as:

- selected game mode
- Custom difficulty settings
- per-mode best scores

Access is wrapped in safe helper functions so the game can continue even if storage is unavailable.

No account, database, or server is required.

---

## 14. I added performance safeguards

Canvas games can become expensive when every frame checks many objects against many other objects.

For example, projectile collision is roughly affected by:

```text
number of bullets × number of enemies
```

If both arrays grow without limits, a long run can become increasingly expensive.

V3 uses caps for several object types and reduces unnecessary growth.

XP is also allowed to merge when the gem count becomes high instead of spawning unlimited individual objects.

This is not a full spatial-partitioning engine, but it is a practical optimization for the current scope of the project.

A future version could add a spatial hash/grid if enemy counts become much larger.

---

## 15. I built the UI separately from the game world

The actual arena is rendered on Canvas, but menus and HUD elements use normal HTML and CSS.

This makes it easier to create:

- difficulty buttons
- sliders
- health/XP bars
- level-up choices
- game-over screen
- loadout display
- pause indicator

Using HTML for menus also makes responsive layout much easier than drawing every menu element manually on Canvas.

---

## 16. I deployed it as a static website

Neon Rift Survivor does not require:

- Node.js on the server
- a database
- authentication
- paid hosting infrastructure

The browser runs the game locally after the static files are downloaded.

Netlify only needs to serve the files from the repository.

The included `netlify.toml` sets the publish directory and basic response headers.

This keeps hosting simple and lets GitHub updates deploy automatically when Netlify is connected to the repository.

---

# 🧱 Project architecture

```text
Neon-Rift-Survivor/
├── index.html
│   └── Page structure, Canvas, HUD, menus, level-up UI
│
├── styles.css
│   └── Base responsive neon UI styles
│
├── v3.css
│   └── V3-specific HUD/loadout/pause additions
│
├── src/
│   ├── game.js
│   │   └── Previous engine retained for project history
│   │
│   └── game-v3.js
│       ├── Canvas setup
│       ├── Game state
│       ├── Input
│       ├── Difficulty
│       ├── Player stats
│       ├── Weapons and passives
│       ├── EVO logic
│       ├── Enemy spawning
│       ├── Collision and damage
│       ├── XP and level-ups
│       ├── Rendering
│       ├── Performance limits
│       └── localStorage persistence
│
├── netlify.toml
│   └── Static hosting configuration and headers
│
├── CHANGELOG.md
│   └── Version changes
│
├── LICENSE
└── README.md
```

---

# 🧰 Tech stack

### HTML5
Used for the page structure, Canvas, HUD, buttons, menus, range sliders, and overlays.

### CSS3
Used for the neon interface, responsive menus, mobile layout, HUD styling, effects, and transitions.

### Vanilla JavaScript
Used for the complete game engine and gameplay logic.

### Canvas 2D API
Used for:

- arena rendering
- player
- enemies
- projectiles
- gems
- zones
- mines
- particles
- virtual joystick
- weapon effects

### Web Pointer Events
Used for touchscreen/mobile controls.

### localStorage
Used for local difficulty settings and best scores.

### Netlify
Used to host the static site.

---

# 🤔 Why I used vanilla JavaScript instead of a game engine

I wanted this project to teach me the fundamentals instead of hiding them behind an engine.

Using vanilla JavaScript forced me to build and understand systems such as:

- delta-time movement
- rendering order
- state management
- collision detection
- entity arrays
- object lifetimes
- automatic targeting
- procedural spawning
- upgrade pools
- persistent browser storage
- touch input
- responsive game UI

A larger future project could benefit from an engine such as Godot, Unity, or Unreal Engine, but vanilla JavaScript is a good fit for this version because the game is lightweight, easy to host, and easy to open in any modern browser.

---

# 📈 What I learned from V1 → V3

One of the biggest lessons from this project is that getting a feature working once is different from making it reliable.

Earlier versions proved the main idea:

- movement worked
- enemies spawned
- auto-fire worked
- XP and upgrades worked
- bosses worked

V3 focused more on engineering quality:

- separating game states instead of relying on overlapping booleans
- preventing one collision from being processed repeatedly
- making upgrades match what the UI promises
- validating saved data before using it
- preventing unlimited object growth
- making progression rules explicit
- keeping old code for project history while developing a new engine version

That process made the project much stronger than simply adding more weapons or visual effects.

---

# 💻 Run locally

### Option 1 — Open directly

Clone or download the repository and open:

```text
index.html
```

in a modern browser.

### Option 2 — Run a local server

From the project directory:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

---

# 🚀 Deploy with Netlify

The project is fully static.

1. Sign in to Netlify.
2. Add a new project from GitHub.
3. Select `Neon-Rift-Survivor`.
4. Leave the build command empty.
5. Use `.` as the publish directory if Netlify asks for one.
6. Deploy.

After GitHub is connected, future commits can automatically trigger new Netlify deployments.

---

# 🗺️ Roadmap

Possible future upgrades:

- [ ] Ranged enemy classes
- [ ] Bosses with unique attacks and multiple phases
- [ ] Treasure / reward drops
- [ ] Character selection
- [ ] Permanent progression between runs
- [ ] Achievements
- [ ] Multiple arenas
- [ ] Sound effects
- [ ] Music and volume controls
- [ ] Accessibility options
- [ ] PWA / offline installation
- [ ] Gamepad support
- [ ] Better spatial collision optimization
- [ ] Optional online leaderboard
- [ ] More original weapons and EVOs
- [ ] More visual effects and screen feedback

---

# 📌 Version history

### V1
Built the first playable survival loop: movement, enemies, auto-fire, collisions, XP, level-ups, and basic upgrades.

### V2
Expanded the game with more weapons, passives, EVO combinations, difficulty presets, Custom mode, bosses, mobile improvements, and a larger README/project presentation.

### V3
Reworked core systems for reliability and progression: explicit game states, collision fixes, real Level 1–5 weapon scaling, meaningful EVO behavior, per-mode records, validated Custom settings, loadout UI, performance limits, and a more original Neon Rift weapon identity.

See [`CHANGELOG.md`](CHANGELOG.md) for the V3 change list.

---

# 📄 License

Released under the **MIT License**. See [`LICENSE`](LICENSE).

---

<div align="center">

### Built to learn game development from the systems up.

**Neon Rift Survivor V3** • HTML5 Canvas • CSS • Vanilla JavaScript • 2026

</div>
