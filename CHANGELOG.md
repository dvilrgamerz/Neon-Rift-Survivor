# Changelog

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
