# Changelog

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
