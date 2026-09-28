# Neon Rift Survivor V5 — Rift Nexus

A Canvas roguelite with an offline solo campaign and an optional, free self-hosted multiplayer server. V5 is a playable candidate under acceptance testing; the existing public release is unchanged.

## Play locally

Use Node.js 22 or later. Install the pinned dependencies once; no paid or external service is required for solo play.

```powershell
npm.cmd ci
npm.cmd start
```

Open the loopback URL printed by the server. For a production preview, run `npm.cmd run build`, then `npm.cmd run preview`. Deploy only the generated `dist` directory as a static site.

## Included

- Three-act branching campaign, objectives, shops, events, Scrap, and encounter-boundary suspend/resume.
- Eight operators with active abilities, eight biomes and bosses, twenty weapons, evolutions, fourteen relics, and six solo modes.
- Automatic fire, optional manual aim, two-charge dash, keyboard rebinding, controller input, and touch controls.
- Core Grid, cosmetic mastery, classes/subclasses, quests, achievements, seasons, lore, codex, and a six-weapon build planner.
- Favorite builds, share codes, run comparisons, score-pace ghosts, result cards, and previewable diagnostic exports.
- Procedural visuals and WebAudio, accessibility/quality controls, and service-worker offline caching.
- Optional self-hosted accounts, explicit cloud-save sync, friends, private two-player co-op, spectators, reconnect, and moderated ranked records.

Move with WASD/arrows, dash with Space, use your ability with E, pause with Escape, and select rewards with number keys. All operators are available in Training. Campaign unlocks Nyx after act one, Echo after act two, and Cryo after victory.

## Optional multiplayer

```powershell
npm.cmd run online
```

Use the URL printed by that server for all online features. See [self-hosting instructions](docs/SELF_HOSTING.md) for storage, networking, backups, moderation, and limitations. Solo play never requires an account. No hosting subscription, cloud provider, or payment service is required.

Supabase can provide verified email accounts, HttpOnly refresh sessions, authenticator MFA, and private Realtime room membership for a hosted deployment. Follow the [Supabase setup guide](docs/SUPABASE_SETUP.md). The browser receives only the public project URL and publishable key. Keep `SUPABASE_SECRET_KEY`, database credentials, and all service-role keys in server environment variables.

## Security

Treat browser saves, game summaries, player names, room messages, and score submissions as untrusted. Local progress is never proof of global ranking or admin access. Supabase deployments use RLS for row ownership, private Realtime authorization for rooms, server-side app metadata for admin roles, and database-backed throttling in addition to Supabase Auth limits. Client-hosted simulation remains modifiable, so the game does not claim that browser co-op or score evidence is cheat-proof.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never commit `.env` files, tokens, passwords, private keys, database URLs containing credentials, or Supabase secret/service-role keys.

## Validation and release status

```powershell
npm.cmd run check
```

This runs the automated suites and builds the static site. See [the acceptance record](docs/V5_ACCEPTANCE.md) for verified browser flows and outstanding physical-device, complete-playthrough, and performance checks. Automated tests alone do not certify the stable release.

V4 local saves are preserved during migration, and V4 records are archived separately. Campaign checkpoints restart unfinished encounters from their saved entry boundary. Records are separated by mode, difficulty, and balance version. [Balance changes](docs/V5_BALANCE.md) document candidate tuning.

## Project structure

`src/engine.js` owns deterministic combat; `content.js` defines tuning; `storage.js` and `checkpoints.js` own persistence; `input.js`, `render.js`, and `audio.js` handle presentation/input; `app.js` connects UI; `nexus.js` provides progression; `coop.js` supplies shared simulation. The optional server lives in `server/`.

The [V4 README](docs/V4_README.md) preserves the previous documentation. Existing roadmap files remain in place.
