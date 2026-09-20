# Changelog

## V4.3 — Rift Command UI

### Interface
- Rebuilt the start screen as a cinematic Rift Command Center while preserving the working V4 gameplay flow.
- Added a live run-summary row for the selected Operator, arena, run mode, and difficulty.
- Added an animated Rift Gate reactor, clearer feature/status badges, stronger visual hierarchy, and a larger launch action.
- Restyled difficulty controls, V4 hub navigation, modals, HUD surfaces, upgrade screens, and pause presentation.
- Improved responsive layouts and touch targets for phones and tablets.

### Accessibility / UX
- Added stronger keyboard focus states and keyboard activation for the quick loadout cards.
- Added Escape-to-close behavior for the V4 command modal.
- Added reduced-motion handling for the new ambient animations.
- Refreshed the service-worker cache so the new UI assets update cleanly.

## V4.0 — Rift Expedition

### Major systems
- Added five playable Operators: **Nova, Titan, Volt, Ghost, Forge**.
- Added five selectable arenas: **Neon City, Void Factory, Frozen Rift, Magma Core, Final Rift**.
- Added arena hazards and arena-specific boss identities/extra attacks.
- Added V4 run modes: **Endless, Expedition, Daily Challenge, Rift Ascension**.
- Added permanent **Rift Core** progression with capped upgrades for damage, HP, speed, luck, rerolls, shield, lifesteal and dodge.
- Added Elite enemy modifiers: Swift, Fortified, Explosive, Berserk and Vampiric.
- Added player shield, dodge, lifesteal and weapon-linked Burn/Shock/Slow status behavior.
- Added three-choice boss Rift Cache rewards.
- Added four **Ultimate Synergies** on top of the existing EVO and V3.3 synergy systems.
- Added **Mythic** upgrade promotions with a 0.50% base promotion chance; Rift Luck can increase the promotion rate.
- Added achievements, lifetime statistics and up to 30 recent V4 run records.
- Added **local Top-10 leaderboards** by run mode + arena + difficulty, plus date-keyed Daily Challenge boards.
- Added V4 score multipliers for arena, run mode and Ascension level.

### VFX / SFX
- Added original Canvas ability VFX for projectiles, fields, explosions, EVOs, Synergies and Mythic events.
- Added original browser-generated WebAudio SFX for abilities, EVOs, bosses, chests, rarity events, damage and UI interactions.
- Added lightweight procedural ambient audio.
- Added SFX volume, ambient volume, VFX intensity, reduced-motion, screen-shake and damage/status-text controls.

### Input / mobile / offline
- Added controller movement, pause and level-up controls.
- Added optional fixed mobile joystick behavior.
- Added performance-mode support for reduced V4 particle density.
- Added a versioned V4 save with export/import.
- Added installable PWA metadata and a service worker for offline loading after the initial cache is populated.

### Architecture
- Added modular V4 files under `src/v4/` instead of replacing the stable V3/V3.2/V3.3 layers.
- Added `docs/V4.md` and `scripts/validate-v4.js`.
- V4 keeps the V3.2 rarity/EVO system and V3.3 Rift Class/boss systems active underneath the new Expedition layer.

## V3.3 — Rift Classes & Boss Overhaul

### Added
- Three starting Rift Classes:
  - **Assault** — +18% damage and +8% critical chance.
  - **Vanguard** — +35 max HP, +12% armor, and passive regeneration.
  - **Velocity** — faster movement, cooldowns, Pulse fire rate, and pickup range.
- Class selection is saved locally and shown in the HUD.
- New enemy behavior archetypes:
  - **Charger** — telegraphs and performs burst charges.
  - **Shooter** — keeps distance, strafes, and fires hostile projectiles.
  - **Splitter** — breaks into two fast shards when defeated.
  - **Shielded** — has increased durability and regenerates after avoiding damage.
- New hostile projectile system for ranged enemies and bosses.
- **Rift Warden** boss overhaul with three health-based phases:
  - Phase I uses orbiting movement and radial projectile patterns.
  - Phase II adds aimed spreads, telegraphed windups, and dash attacks.
  - Phase III enrages with faster pursuit and denser projectile bursts.
- Dedicated boss health/phase HUD.
- Build synergies:
  - **Overload Grid** — Arc Conductor + Plasma Pool.
  - **Phase Fortress** — Phase Field + Orbit Guard.
  - **Precision Core** — Prism Lance + Critical Module.
- Synergy unlock banners and active-synergy HUD.
- New run summary with class, mode, survival time, kills, bosses defeated, EVO count, score multiplier, and final score.
- Last five run summaries are stored locally per difficulty mode.
- Difficulty score multipliers: Easy ×0.80, Standard ×1.00, Nightmare ×1.50, Impossible ×2.25.

### Changed
- Boss encounters now have visible attack telegraphs and phase transitions instead of only increased HP/speed.
- Harder difficulty modes now reward stronger final run scores.
- Start screen now explains V3.3's class/boss-focused gameplay expansion.
- Game-over screen now focuses on the completed run instead of only kills/time.

## V3.2 — Real Upgrade Rarity

### Added
- Independent rarity rolls for every upgrade card.
- Published rates: Common 45%, Uncommon 28%, Rare 16%, Epic 8%, Legendary 3%.
- Small universal bonuses on higher-rarity selections.
- Rarity-rate legend on the level-up screen.

## V3.1 — Upgrade System Overhaul

### Added
- Rich upgrade cards with level/effect previews.
- EVO progress guidance.
- Two rerolls per run.
- Keyboard upgrade shortcuts.
- Build-synergy weighting for upgrade choices.
- Upgrade-system validation and release checklists.

## V3

### Fixed
- Piercing bullets no longer hit one enemy repeatedly on consecutive frames while overlapping it.
- Enemy contact damage and Orbit Guard hit cooldowns now use separate timers.
- Escape pause logic no longer conflicts with level-up state.
- Custom difficulty data is validated and clamped before use.
- Duplicate game-mode click handling removed.

### Changed
- Active weapons now have meaningful Level 1–5 scaling.
- EVOs now change real attack behavior instead of only adding levels.
- Energy Cube stacks through the player's cooldown multiplier.
- Maxed upgrades are removed from the level-up pool.
- Best score storage is separated by difficulty mode.
- Weapon/passive naming was redesigned around the Neon Rift identity.

### Added
- V3 game-state system.
- In-game loadout HUD.
- Per-mode records.
- Late-run caps for enemies, bullets, particles, and XP gems.
- XP gem merging when the gem limit is reached.
- New V3 stylesheet and engine file while retaining the previous engine in the repository.
