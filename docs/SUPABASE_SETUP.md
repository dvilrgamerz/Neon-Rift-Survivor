# Supabase account and co-op setup

The game remains fully playable offline. Supabase is optional and enables verified accounts, protected session refresh, authenticator MFA, private co-op channels, and server-backed room membership.

## Project configuration

1. Create or select a Supabase project. Apply `supabase/migrations/202609200001_secure_nexus.sql` through the normal migration workflow.
2. In Authentication settings, require email confirmation and set the Site URL to the exact HTTPS Netlify origin.
3. Customize the confirmation and recovery email templates so their action URL targets:
   `{{ .SiteURL }}/.netlify/functions/auth-callback?token_hash={{ .TokenHash }}&type=signup`
   Use `type=recovery` for the recovery template.
4. In Realtime settings, disable public channel access. The migration grants private Broadcast and Presence only to current room members.
5. Configure conservative Auth rate limits and CAPTCHA in the Supabase dashboard. The included server endpoint adds a 15-minute database-backed limit, while Supabase applies its own IP/user limits.
6. Set these Netlify environment variables. Never commit them:

   - `SUPABASE_URL`: public project URL
   - `SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key
   - `SUPABASE_SECRET_KEY`: server-only secret key
   - `URL`: exact deployed HTTPS site origin

The build writes only the URL and publishable key into `runtime-config.js`. The secret key is available only to Netlify Functions. The service-role/secret key must never use a `PUBLIC_`, `VITE_`, or other frontend-exposed prefix.

## Session model

The refresh token is stored in a Secure, HttpOnly, SameSite=Strict cookie scoped to the auth functions. JavaScript cannot read it. A short-lived access token is returned after login/refresh and held only in memory; reload asks the same-origin refresh function for a new token. Neither token is written to localStorage or sessionStorage.

Email confirmation proves ownership of the signup address. TOTP through an authenticator app is the actual second factor. Supabase does not provide email as a second MFA factor; an email OTP is a first-factor login method.

## Authorization and limits

RLS owns all room/profile authorization. `user_metadata` is used only for the display username. Admin authorization must come from `app_metadata` and must be rechecked inside every privileged server function; hiding an Admin button is never authorization.

Realtime co-op is membership-gated and private. Browser game simulation can still be modified by a malicious host, so ranked results require server-authoritative validation. Do not call client-hosted co-op cheat-proof.

Run Supabase security and performance advisors after applying the migration. Test signup, confirmation, login, reset, token rotation, logout, MFA enrollment/challenge, two separate users in one room, a non-member attempting channel access, and a normal user attempting every admin endpoint.
