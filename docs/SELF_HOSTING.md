# Rift Nexus: optional self-hosting

The complete solo game works without an account or server. The included Nexus server adds accounts, manual cloud-save sync, friends, private two-player rooms, spectators, and moderated leaderboards. It uses Node.js built-ins and your own computer; no paid service, provider account, database subscription, or external analytics service is required.

## Start on this computer

Install Node.js 22 or newer, then open PowerShell in the project directory. Run:

```powershell
node scripts/online.mjs
```

Open the exact URL printed by the server, normally `http://127.0.0.1:4174`. Use this URL for the game as well as accounts and co-op. The server serves both the game and its API from the same origin. The ordinary static preview continues to support offline play, but it does not provide online endpoints.

Create a username and password in **Online**. Usernames use 3–24 letters, numbers, or underscores; passwords use 10–128 characters. No email is requested. There is no email-based password recovery. Keep a backup of the server data directory. Press **Ctrl+C** in the server terminal to stop it.

## Data and saves

By default, data is stored at `.neon-rift-server/nexus.json` inside the operating-system user's home directory. On Windows this is normally `C:\Users\YOUR_NAME\.neon-rift-server\nexus.json`. The server refuses a data directory inside the served project. Its static-file allowlist also excludes server modules, configuration, Git files, and account data.

Account credentials are salted scrypt hashes. Passwords are never returned by the API. Login sessions use HttpOnly, SameSite=Strict cookies and expire after seven days. Sessions and active rooms are kept in memory: restarting the server signs everyone out and ends active co-op runs. Completed records, accounts, friend relationships, profiles, and cloud saves survive restarts.

Cloud sync is explicit. **Check cloud save** retrieves the current revision; **Upload this device** submits the local profile. If another device changed the save, the server returns a conflict. Check the cloud copy again and choose which copy to retain. **Restore cloud save** is a separate user action. Active local encounters are not moved between devices by profile sync.

The server commits database changes through a single write queue and atomic file replacement. Run one server process per data directory. Stop the server before copying `nexus.json` for a consistent backup; protect backups because they contain password hashes and personal game profiles. Do not place this directory in the site's publish folder. The database has a 128 MiB limit; writes fail with a storage-limit error when full rather than silently removing old accounts or records.

## Play with a friend

Both players must open the game from the same running Nexus server and create separate accounts. In **Co-op**, choose a mode and loadout, create a private room, and share the six-character code. The second player joins, both players select **Ready**, and the host launches. Two players and up to eight spectators can join a room. A room code is an invitation; share it only with people you want in the room.

The server advances the shared simulation at 60 ticks per second. Clients send input and receive snapshots over Server-Sent Events. Each player owns their own build and reward choices. The connected teammate can continue after a disconnect; use **Reconnect** to restore the connection while the room still exists. Rooms with no live connections expire after 15 minutes of inactivity. Explicitly leaving a match frees that player's room membership. Server restart recovery for active co-op runs is not provided.

Loopback addresses only work on the host computer. To bind on a trusted local network, set `RIFT_HOST` to your selected interface or `0.0.0.0`, and set `RIFT_ORIGIN` to the **exact browser-facing origin**, including the port. For example, if this computer's verified private address is `192.168.1.20`, configure `http://192.168.1.20:4174`. All players, including the host, must use that exact address. Configure the operating-system firewall for the intended private network only.

For access beyond a trusted local network, put the service behind an HTTPS reverse proxy you control and set `RIFT_ORIGIN` to its HTTPS origin. Forward the original Host header, disable buffering on `/api/v1/rooms/*/events`, and allow long-lived SSE responses. HTTPS origins cause the server to add the Secure cookie flag. The server does not automatically provision HTTPS, open ports, deploy publicly, or purchase hosting. HTTP on an untrusted network does not protect passwords in transit.

## Configuration

Set environment variables in the terminal or service configuration before starting the server. Never commit passwords or server data to the repository.

| Variable | Default | Purpose |
| --- | --- | --- |
| `RIFT_HOST` | `127.0.0.1` | Listening interface. Non-loopback binding requires `RIFT_ORIGIN`. |
| `RIFT_PORT` | `4174` | Listening port. |
| `RIFT_ORIGIN` | Printed loopback URL | Exact browser-facing HTTP(S) origin. Enforced for Host and mutation Origin headers. |
| `RIFT_DATA_DIR` | `~/.neon-rift-server` | Private data directory outside the served project. |
| `RIFT_MAX_ACCOUNTS` | `500` | Maximum account registrations for this server. |
| `RIFT_ADMIN_USERNAME` | Unset | Existing account to promote at startup, or reserved bootstrap username. |
| `RIFT_ADMIN_PASSWORD` | Unset | Optional first-start password for a new administrator. It is hashed before the server listens; existing passwords are not changed. |

To create an administrator without putting a password in an environment variable:

1. Start the server on its default loopback interface.
2. Create your intended owner account using the game.
3. Stop the server.
4. Set `RIFT_ADMIN_USERNAME` to that exact account name in the server's environment.
5. Start the server again and sign in. The account now has the server-only administrator role.

The signup and profile APIs cannot assign roles. If a configured administrator username does not already exist and no bootstrap password is supplied, the name remains reserved; public registration cannot claim it. Keep access to the server's configuration restricted. Remove a one-time bootstrap password from the environment after initial creation.

## Competition, seasons, and moderation

Seasons last eight weeks, anchored at 00:00 UTC on September 14, 2026. Weekly challenges reset each Monday UTC. The browser and server use the same season/challenge definitions. Cosmetic progression never requires a purchase.

Solo ranked attempts start with a server-issued, account-owned, one-use ticket. Submission checks include elapsed server time, expected mode/difficulty/operator, balance version, and broad score/kill/boss plausibility limits. Suspicious submissions are quarantined for an administrator instead of appearing on the board. **These are heuristic checks, not proof that a client is cheat-free.** Co-op simulations are authoritative and use a separate leaderboard category; a self-hosted server operator still controls their own server and records. This is not a global federation of trusted servers.

Moderators can inspect quarantined run summaries, approve or reject them with a reason, view player reports, and suspend accounts. Suspended accounts lose active sessions and are excluded from public boards. An account cannot grant itself moderation privileges. Private profiles are visible only to their owner and accepted friends; public profiles reveal a bounded game summary, never credentials or a full cloud save.

Friends can send requests, accept or decline them, and exchange room invitations. In-app notices respect the recipient's preferences. Analytics is off by default. Any enabled basic statistics stay on this server; there are no advertising SDKs, third-party tracking calls, automatic operating-system notifications, or clipboard collection.

## API and operational limits

The API base is `/api/v1`. Authenticated endpoints use the session cookie. Mutations require `Content-Type: application/json` when a body is sent and an Origin matching `RIFT_ORIGIN`. Browsers supply the Origin automatically. Cross-origin clients are intentionally unsupported.

| Area | Endpoints |
| --- | --- |
| Status/auth | `GET /status`, `POST /auth/signup`, `/auth/login`, `/auth/logout`, `GET /auth/me` |
| Profiles/cloud | `GET/PATCH /profile`, `GET /profiles/:username`, `GET/PUT /cloud-save` |
| Social | `GET /friends`, `POST /friends/requests`, `POST /friends/requests/:id/respond`, `DELETE /friends/:id`, `POST /friends/:id/invite`, `GET /notices`, `POST /notices/read` |
| Competition | `GET /season`, `GET /leaderboard`, `POST /runs/start`, `POST /runs/:id/finish` |
| Rooms | `POST /rooms`, `POST /rooms/join`, `GET /rooms/:code`, `GET /rooms/:code/events`, `POST /rooms/:code/{ready,start,input,action,leave,reconnect}` |
| Moderation | `POST /reports`, `GET /admin/reports`, `PATCH /admin/runs/:id`, `PATCH /admin/users/:id` |

The server limits request sizes, sign-in attempts, social actions, active tickets, input rates, streams per account, and room counts. It does not trust forwarded IP headers for rate-limit identity. With a reverse proxy, sign-in IP limits therefore apply to the proxy's address; this service is intended for small private communities. It is not configured for a large public deployment or multiple server instances.

Run `node --test tests/server.test.js` for local HTTP, storage, authorization, Daily ticket, and two-client SSE integration tests. These tests do not claim external-network delivery, production reverse-proxy compatibility, or physical controller/mobile performance.
