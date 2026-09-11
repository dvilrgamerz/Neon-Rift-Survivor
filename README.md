<div align="center">

# 🌌 Neon Rift Survivor

### Survive the rift. Build your loadout. Outlast the swarm.

An original **browser-based neon survival / bullet-heaven game** built from scratch with HTML5 Canvas, CSS, and vanilla JavaScript.

[![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Responsive-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-Game%20Engine-F7DF1E?logo=javascript&logoColor=111)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)](https://www.netlify.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Difficulty](https://img.shields.io/badge/Game%20Modes-5-8B5CF6)
![Mobile](https://img.shields.io/badge/Mobile-Touch%20Ready-22C55E)
![Cost](https://img.shields.io/badge/Hosting-%240-00C7B7)

</div>

---

## 🎮 About the Game

**Neon Rift Survivor** is a fast-paced endless survival game where the player fights increasingly dangerous enemy waves while building a stronger run through randomized upgrades.

The combat is designed around **automatic targeting and firing**, allowing the player to focus on movement, positioning, collecting energy, and choosing upgrades.

> **Originality note:** this project is inspired by the general survivor / bullet-heaven genre. It does not use Survivor.io source code, artwork, characters, maps, branding, or proprietary assets.

## 🔥 Current Build

> **Difficulty Update:** Easy, Standard, Nightmare, Impossible, and fully configurable Custom mode are now playable.

> **Combat Update:** Expanded Active + Passive skill system, EVO combinations, bosses, and **1.5× base EXP drops**.

## ✨ Features

- ⚡ Automatic enemy targeting and shooting
- 👾 Multiple enemy classes with different speed, size, and HP
- 👑 Boss enemy every 60 seconds
- 💎 XP / energy drops
- ⬆️ Random three-choice level-up system
- 🔫 Multi-shot, piercing, damage, and fire-rate upgrades
- 🌀 Orbiting energy weapon upgrade
- 🧲 Pickup magnet upgrades
- ❤️ HP, healing, and survivability upgrades
- 🎚️ Five selectable difficulty modes
- 🛠️ Custom difficulty sliders for enemy HP, speed, spawn rate, boss power, player damage, XP, and starting HP
- 💀 Optional double-boss modifier
- 📈 Difficulty scaling during every run
- ✨ Neon particles and glow effects
- 📱 Mobile touch joystick
- ⌨️ Keyboard controls
- 💾 Best score saved with localStorage
- 🌐 No backend required
- 💸 $0 hosting-ready on Netlify

## 🎚️ Game Modes & Difficulty

Neon Rift Survivor now includes five difficulty modes:

| Mode | Gameplay |
|---|---|
| Easy | Lower enemy HP/speed, slower spawning, more player HP, more XP |
| Standard | Balanced default experience |
| Nightmare | Tougher/faster enemies, denser waves, stronger bosses |
| Impossible | Extreme scaling, very fast waves, reduced player damage, double bosses |
| Custom | Configure enemy HP, enemy speed, spawn rate, boss power, player damage, XP gain, starting HP, and double bosses |

Custom difficulty settings are saved in the browser with `localStorage`, so your selected mode and custom values stay after refresh.

## 🕹️ Controls

| Platform | Controls |
|---|---|
| Desktop | **WASD** or **Arrow Keys** to move |
| Mobile / Tablet | Touch and drag anywhere on the game |
| Both | Weapons fire automatically |
| Desktop | **Esc** toggles pause |

## 🧠 Active + Passive Skill System

During a run, leveling up presents three randomized choices. Skills are split into **Active weapons** and **Passive support skills**.

When a matching Active + Passive pair is owned, the game automatically unlocks a stronger **EVO weapon**. An EVO announcement appears in-game when the combination activates.

### Current Active skills

| Active Skill | What it does |
|---|---|
| Pulse Blaster | Starting auto-fire weapon |
| Orbit Blade | Rotating melee-energy weapon |
| Arc Coil | Periodic multi-target lightning |
| Nova Flask | Damage field around the player |
| Rocket Pod | Explosive seeker missiles |

### Current Passive skills

| Passive Skill | Effect |
|---|---|
| Ammo Thruster | Faster fire rate |
| Flux Magnet | Larger pickup range |
| Reactor Fuel | Stronger area effects |
| Energy Cube | Faster skill cooldowns |
| Exo Bracer | Faster orbit weapons |
| Overcharge Core | Higher projectile damage |
| Twin Matrix | Additional projectiles |
| Phase Pierce | Additional projectile piercing |
| Vector Boots | Faster movement |
| Vital Matrix | More max HP + healing |
| Repair Nanites | Restores HP |

## ⚡ EVO Combinations

The game now includes the full combination set shown in the reference chart:

| Active | Passive | EVO |
|---|---|---|
| Boomerang | Hi-Power Magnet | Magnetic Rebounder |
| Brick | Fitness Guide | 1-ton Iron |
| Drill Shot | Ammo Thruster | Whistling Arrow |
| Durian | HE Fuel | Caltrops |
| Forcefield | Energy Drink | Force Barrier |
| Guardian | Exo-Bracer | Defender |
| Laser Launcher | Energy Cube | Death Ray |
| Lightning Emitter | Energy Cube | Supercell |
| Modular Mine | Molotov | Inferno Bomb |
| Modular Mine | Lightning Emitter | Thunderbolt Bomb |
| Molotov | Oil Bond | Fuel Barrel |
| Moonshade Slash | Ronin Oyoroi | Moonhalo Slash |
| RPG | HE Fuel | Sharkmaw Gun |
| Soccer Ball | Sports Shoes | Quantum Ball |

## 💎 Faster EXP

Enemy EXP drops are now **1.5× higher**:

- Normal enemy: **1.5 EXP** instead of 1
- Boss EXP gem: **4.5 EXP** instead of 3

This makes level-ups arrive faster and gives the larger skill pool enough choices during a run.

## 🧱 Project Structure

```text
Neon-Rift-Survivor/
├── index.html
├── styles.css
├── src/
│   └── game.js
├── netlify.toml
├── LICENSE
└── README.md
```

### What each file does

- **index.html** — game page, HUD, menus, level-up screen, and game-over UI.
- **styles.css** — responsive neon interface, menus, HUD, buttons, and mobile styles.
- **src/game.js** — game loop, player movement, enemies, collisions, combat, XP, upgrades, bosses, particles, touch controls, and saving.
- **netlify.toml** — Netlify publishing and security-header configuration.
- **LICENSE** — MIT open-source license.
- **README.md** — project documentation.

## 🛠️ How It Was Made — Step by Step

### 1. Create the game shell

The project starts with a full-screen HTML5 `canvas` plus HTML overlays for the HUD, start menu, level-up choices, and game-over screen.

### 2. Build the visual system

CSS provides the dark sci-fi theme, neon glow effects, responsive menus, HP/XP bars, upgrade cards, and mobile-friendly layout.

### 3. Create the game loop

The engine uses:

```js
requestAnimationFrame(loop)
```

Each frame calculates elapsed time, updates the world, then renders the latest state.

### 4. Add player movement

Keyboard state is tracked for WASD / arrow-key movement. Pointer events create a virtual joystick for phones and tablets.

### 5. Add enemy spawning

Enemies spawn outside the visible play area and move toward the player. Spawn frequency increases over time.

### 6. Build automatic combat

The game finds the closest enemy and automatically fires at it. Projectile behavior is affected by damage, speed, multi-shot, and piercing stats.

### 7. Add collision and damage

Distance-based collision checks handle:
- projectile → enemy hits
- orbit weapon → enemy hits
- enemy → player contact
- player → XP collection

### 8. Add XP and leveling

Defeated enemies drop energy gems. Once enough XP is collected, the game pauses and displays three randomized upgrades.

### 9. Add bosses

A larger high-HP enemy appears every 60 seconds. Bosses deal more contact damage and release substantially more XP.

### 10. Add particles and feedback

Small particles, glow, enemy health bars, projectile effects, and responsive HUD updates make combat easier to read.

### 11. Add persistence

The best kill count is stored in the browser using:

```js
localStorage
```

### 12. Add game modes and custom balancing

Difficulty presets modify real gameplay values such as enemy HP, movement speed, spawn frequency, boss strength, player damage, XP gain, and starting HP. Custom settings are stored locally in the browser.

### 13. Prepare deployment

The game is completely static, so it can be deployed directly on Netlify without Node.js, a server, or a database.

## 💻 Run Locally

### Option 1 — Open directly

Download the project and open:

```text
index.html
```

in a modern browser.

### Option 2 — Local server

From the project folder:

```bash
python -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

## 🚀 Publish to Netlify from GitHub

This is the recommended setup because future GitHub updates can deploy automatically.

1. Sign in to **Netlify**.
2. Choose **Add new project**.
3. Choose **Import an existing project**.
4. Select **GitHub**.
5. Authorize GitHub if Netlify asks.
6. Select **Neon-Rift-Survivor**.
7. Leave the **Build command** empty.
8. Use **.** as the publish directory if Netlify asks for one.
9. Click **Deploy**.
10. Netlify will give the game a public `.netlify.app` address.
11. Open **Domain management** if you want to rename the generated Netlify subdomain.

The included `netlify.toml` already sets the publish directory and basic security headers.

### Updating the live game

After the GitHub repository is connected to Netlify:

```text
Edit code → Commit / push to GitHub → Netlify automatically redeploys
```

## 📦 Manual Netlify Deployment

You can also deploy without connecting GitHub:

1. Download this repository as a ZIP.
2. Extract it.
3. Open Netlify.
4. Use Netlify's manual deploy / drag-and-drop area.
5. Drop the project folder containing `index.html`.
6. Netlify publishes the game.

## 🧰 Tech Stack

- **HTML5**
- **CSS3**
- **JavaScript ES6+**
- **Canvas 2D API**
- **Web Pointer Events**
- **localStorage**
- **Netlify**

### Why no Java or C++?

This version runs directly in a browser. HTML, CSS, and JavaScript are sufficient for the current engine, which keeps the project lightweight and makes deployment extremely simple.

## 🗺️ Roadmap

Potential V2 improvements:

- [x] Weapon evolution combinations
- [ ] More enemy classes
- [ ] Ranged enemies
- [ ] More bosses with unique attacks
- [ ] Treasure chests
- [ ] Character selection
- [ ] Permanent progression
- [ ] Achievements
- [ ] Sound effects and music controls
- [ ] Multiple arenas
- [x] Difficulty modes
- [ ] PWA / offline installation
- [ ] Online leaderboard
- [x] Difficulty / game-mode settings
- [ ] Full audio & accessibility settings
- [ ] Gamepad support

## 🤝 Contributing

Ideas, bug reports, and improvements are welcome through GitHub Issues and Pull Requests.

## 📄 License

Released under the **MIT License**. See [LICENSE](LICENSE).

---

<div align="center">

### Built with HTML, CSS, JavaScript, and Canvas

**Neon Rift Survivor** • 2026

</div>
