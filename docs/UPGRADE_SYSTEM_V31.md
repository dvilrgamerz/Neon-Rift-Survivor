# V3.1 Upgrade System

V3.1 turns the level-up screen into a build-planning system instead of three plain random buttons.

## Rules

- Active weapons and normal passives still respect their existing maximum levels.
- Maxed options are removed from the normal choice pool.
- Each card shows its current level and the level it will reach if selected.
- Card quality progresses from Common → Uncommon → Rare → Epic → Legendary as an upgrade approaches max level.
- Quality tiers are presentation/progression labels; they do not secretly multiply stats beyond the effect shown by the underlying V3 engine.
- Active cards explain the concrete next-level benefit.
- EVO progress is shown on active cards, including the required paired passive.
- Choice weighting slightly favors upgrades already in the player's build and active/passive EVO pairs. This helps runs form coherent builds without guaranteeing a specific option.
- Players get two rerolls per run. Rerolling changes the offered cards but does not grant a level or alter the run directly.
- If every normal upgrade is exhausted, Rift Stabilizer becomes the fallback choice rather than silently applying a hidden bonus.

## Controls

- Click/tap a card to select it.
- Desktop: keys `1`, `2`, and `3` select the matching card.
- Desktop: `R` rerolls while the level-up screen is open.

## EVO clarity

An EVO still uses the V3 rule: the active weapon must reach Level 5 and its matching passive must be owned. V3.1 surfaces that rule directly on cards instead of requiring the player to memorize the combinations.

## Review checklist

When modifying an upgrade:

1. The description must match actual gameplay behavior.
2. Every level must provide a meaningful benefit.
3. Maxed upgrades must leave the pool.
4. The EVO pairing must remain correct.
5. Rerolling must not grant free stats or reset indefinitely.
6. The level-up state must keep gameplay paused.
7. Cards must remain usable on a narrow mobile screen.
