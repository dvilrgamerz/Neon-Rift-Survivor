# Neon Rift Survivor — Sprint Log

**Project:** Neon Rift Survivor  
**Repository:** `dvilrgamerz/Neon-Rift-Survivor`  
**Journal Type:** Sprint Log / Architectural Decision Record (ADR)  
**Purpose:** Track development progress, technical reasoning, adaptability, testing, and sources used during each sprint.

---

## October 2, 2026

**Hours Logged:** _Enter actual hours worked_  
**Sprint Phase:** V4.3 UI / Mobile Reliability  
**Current Sprint Goal:** Improve the Rift Command interface and make the mobile/PWA experience more reliable.

### 1. Progress & Accomplishments

Recent work focused on polishing the V4 Rift Expedition release instead of only adding more gameplay content.

Key progress included:

- Upgrading the V4 interface to the **Rift Command** UI.
- Fixing touch scrolling inside V4 mobile overlays and modals.
- Fixing home-screen touch scrolling on mobile.
- Refreshing and busting the PWA cache so updated CSS could reach installed/mobile versions.
- Cleaning up the V4.3 changelog heading.
- Continuing to preserve the existing V4 systems, including Operators, five arenas, multiple run modes, Rift Core progression, Mythic upgrades, Ultimate Synergies, arena hazards, bosses, achievements, local leaderboards, controller/mobile support, VFX, SFX, and offline/PWA support.

### 2. Technical Challenge & Reasoning

A major challenge was mobile touch scrolling.

The game uses several overlays, menus, and modal interfaces on top of the main game screen. On mobile devices, touch input can conflict with game controls, page scrolling, and modal scrolling. A player may be able to open a menu but still be unable to scroll through all of its content correctly.

I approached the problem by separating the issue into layers:

1. Determine whether the problem came from the game canvas, the overlay, or the page itself.
2. Adjust the mobile scrolling behavior for overlays and modals.
3. Test the home-screen experience separately.
4. Check whether the installed PWA was still using an older cached stylesheet.
5. Refresh the PWA cache after the CSS fix so the newest version would load.

This used **deductive reasoning** because I started with the observed symptom—touch scrolling not working—and narrowed the possible causes down to input handling, CSS overflow behavior, and stale cached assets.

The commit sequence also showed why fixing the source code alone was not enough. A PWA can continue loading an older cached CSS file, so the cache version also had to be updated after the interface fix.

### 3. Soft Skill / Adaptability Focus

My original project direction emphasized adding larger gameplay features, but mobile testing showed that usability problems needed attention first.

I adapted the sprint by prioritizing bug fixes, interface reliability, and cache behavior before continuing with more content. This is important in software development because a feature is not complete if users cannot interact with it reliably.

I also broke one large problem—"mobile scrolling is broken"—into smaller testable problems involving overlays, modals, the home screen, CSS behavior, and the PWA cache.

### 4. Source Citation

Official documentation relevant to this sprint:

- MDN Web Docs — Touch events  
  https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

- MDN Web Docs — CSS overflow  
  https://developer.mozilla.org/en-US/docs/Web/CSS/overflow

- MDN Web Docs — Service Worker API  
  https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

- MDN Web Docs — Cache API  
  https://developer.mozilla.org/en-US/docs/Web/API/Cache

---

# Sprint Entry Template

Copy this section for every new entry.

## Date

**Hours Logged:**  
**Sprint Phase:**  
**Current Sprint Goal:**

### 1. Progress & Accomplishments

Describe the exact feature, system, UI component, enemy, weapon, level, asset, or bug worked on.

Examples:

- Added a new enemy behavior.
- Improved player movement.
- Added or balanced an upgrade.
- Fixed collision detection.
- Improved mobile controls.
- Added VFX or SFX.
- Improved the HUD.
- Optimized performance.
- Fixed PWA/offline behavior.

### 2. Technical Challenge & Reasoning

Describe one specific development problem.

Include:

- What happened?
- What did you expect to happen?
- What caused the problem?
- How did you investigate it?
- Did you use inductive or deductive reasoning?
- What change fixed or improved it?
- How did you test the solution?

### 3. Soft Skill / Adaptability Focus

Explain one professional skill demonstrated during the sprint.

Possible topics:

- Changing priorities after testing
- Accepting feedback
- Managing development time
- Debugging patiently
- Breaking a large feature into smaller tasks
- Learning a new programming technique
- Reworking a feature that was not fun or usable
- Improving code organization
- Testing from the player's perspective

### 4. Source Citation

List documentation, tutorials, or technical resources referenced during development.

Good sources include:

- MDN Web Docs
- GitHub Docs
- web.dev
- freeCodeCamp
- JavaScript.info
- Official framework or browser documentation

---

## Suggested Future Sprint Topics

Future entries can document work involving:

- Enemy AI
- Difficulty scaling
- Boss encounters
- Operators
- Arena hazards
- Weapons and EVOs
- Ultimate Synergies
- Rift Core progression
- Mythic upgrades
- Player upgrades
- Experience and leveling
- Collision detection
- Damage calculations
- Health, shield, dodge, and lifesteal
- Status effects
- Particle effects
- Sound effects
- Game-over and restart logic
- High scores and leaderboards
- Achievements and statistics
- Mobile controls
- Controller support
- UI improvements
- PWA/offline support
- Performance optimization
- Difficulty modes
- Game balancing
- Bug fixes
- Version releases
