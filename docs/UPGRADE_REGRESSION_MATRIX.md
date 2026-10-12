# Upgrade UI regression matrix (V3.1–V4.3)

**Purpose:** make the upgrade picker reproducibly testable after changes to rarity, EVO logic, rerolls, difficulty handling, touch controls, and the V4/V4.3 command UI.

**Scope:** manual regression plan for the existing game, not an implementation of new gameplay. Issue: [#8](https://github.com/dvilrgamerz/Neon-Rift-Survivor/issues/8).

**Status on creation:** cases below are **not run**. Mark each result only after reproducing it in a browser; attach evidence for failures. This document by itself is not a gameplay test pass.

## Before testing

1. Serve the repository through a local static server (`python -m http.server 8000`), or use the deployed game with its build/version recorded.
2. Open `http://localhost:8000` in a modern desktop browser. Inspect Developer Tools → Console.
3. Back up an existing save before clearing site data. Use a fresh browser profile for clean-state checks and an existing-save profile for migration checks.
4. Unregister any old service worker and reload when validating recent UI assets; stale PWA cache can make tests misleading.
5. Record the selected Operator, Rift Class, arena, run mode, difficulty, build/commit, browser, and device for each failure.
6. Avoid changing random-number generation in production only to force an upgrade; for hard-to-reach states, use deterministic test fixtures or play until the state occurs and note that coverage is incomplete.

## Core upgrade matrix

Fill in **Pass / Fail / Blocked / Not run** for each case. Blank `Result` below means not yet executed.

| ID | Setup and steps | Expected result | Result |
| --- | --- | --- | --- |
| UP-01 | On a fresh save, start Standard / Endless; earn the first level-up | Upgrade picker appears, game action pauses, and selectable cards are legible | Not run |
| UP-02 | Select first, second, and third card in separate level-ups with mouse | Exactly one upgrade applies per choice; gameplay resumes once | Not run |
| UP-03 | Use keyboard **1**, **2**, **3** on separate level-ups | Matching visible card is selected without duplicate application | Not run |
| UP-04 | Open picker on a narrow mobile viewport and choose a card via touch | All available cards and labels fit or scroll; correct card is chosen | Not run |
| UP-05 | Compare Easy, Standard, Nightmare, Impossible, and Custom | Upgrade screen is usable in every supported difficulty; no missing choices or lockups | Not run |
| UP-06 | Enable or inspect a Custom difficulty configuration | Picker respects the chosen run and does not silently reset configuration | Not run |
| UP-07 | Acquire several copies of the same active/passive to reach its cap | Current/next level messaging is correct; capped upgrade stops reappearing as an ordinary upgrade | Not run |
| UP-08 | Build a weapon to its max level **without** its matching passive | EVO explanation clearly identifies the missing passive; evolution does not trigger early | Not run |
| UP-09 | Build a matching passive, then max its active weapon | EVO-ready state and eventual evolution match the advertised recipe | Not run |
| UP-10 | After an EVO activates, open another upgrade picker | EVO is identified as active, without offering duplicate evolution | Not run |
| UP-11 | Use a reroll while the upgrade picker is open | Choices refresh, remaining reroll count decrements once, and no upgrade is applied | Not run |
| UP-12 | Exhaust the available rerolls | Reroll action is disabled/absent; no negative counts or free rerolls | Not run |
| UP-13 | With many upgrade options maxed, trigger another level-up | No blank or duplicate cards; valid fallback option appears if available | Not run |
| UP-14 | Reach a state in which a healing/fallback option is needed | Fallback is selectable, describes its effect, and doesn't soft-lock progression | Not run |
| UP-15 | Observe several rarity tiers (Common to Legendary) | Card labels and visible bonuses correspond to their applied effects | Not run |
| UP-16 | Encounter a V4 Mythic promotion | Mythic label/bonus is distinct; underlying normal upgrade logic still applies once | Not run |
| UP-17 | Pause before level-up, resume, then reach the picker | Pause and level-up overlays do not overlap incorrectly or leave controls stuck | Not run |
| UP-18 | Die after taking upgrades, restart, then reach another picker | Cards still respond; no prior-run state or reroll amount leaks unexpectedly | Not run |
| UP-19 | Switch between V4 run modes (Endless, Expedition, Daily, Ascension) | Picker remains usable, and mode-specific rules do not block selection | Not run |
| UP-20 | Use reduced motion, high-contrast/low VFX options where available | Focus/rarity/EVO cues remain readable without depending only on flashing | Not run |

## Minimum device and difficulty coverage

Use a practical subset rather than treating all combinations as equally risky.

| Surface | Minimum check | Result |
| --- | --- | --- |
| Desktop keyboard + mouse | UP-01–03, UP-07–12, UP-17–18 | Not run |
| Narrow mobile / touch | UP-01, UP-04, UP-11, UP-17 | Not run |
| Difficulty sweep | UP-05–06 with Easy, Standard, Nightmare, Impossible, Custom | Not run |
| Upgrade exhaustion | UP-07, UP-13–14 | Not run |
| EVO / rarity | UP-08–10, UP-15–16 | Not run |
| Current V4/V4.3 menus + modes | UP-17, UP-19–20 | Not run |

## Record evidence and findings

Copy this block into the PR comment or issue for each meaningful test run:

```text
Build/commit:
Browser + version:
Device/viewport:
Saved state: fresh / existing backup
Mode / arena / Operator / Rift Class / difficulty:
Cases run:
Passed:
Failed:
Blocked / not run:
Reproduction steps for failures:
Expected vs actual:
Console errors:
Screenshot / video:
```

## Release gate

- [ ] All critical picker actions (select, reroll, cap/fallback, EVO) have been exercised without crashes.
- [ ] Keyboard and touch interactions were tested on appropriate devices.
- [ ] Restart and relevant saved-state checks passed.
- [ ] Failures have reproducible issues or fixes linked.
- [ ] This matrix's Results have been updated with actual outcomes and environment details.

**Do not mark the issue fully resolved solely because this plan was added.** Test runs and sign-off remain a separate required step.
