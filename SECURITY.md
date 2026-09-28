# Security policy

V5 is the supported development version. Report suspected vulnerabilities privately to the repository owner through GitHub Security Advisories. Include affected version, reproduction steps, impact, and a minimal proof of concept. Do not publish exploitable details in a public issue.

Never commit passwords, access or refresh tokens, database credentials, Supabase secret/service-role keys, private keys, or production environment files. The Supabase URL and publishable key are public client configuration; the secret key is server-only.

Local saves are untrusted and provide no proof for global rankings or admin access. RLS and server functions enforce account/room ownership. Frontend game logic remains inspectable and modifiable, so client-hosted co-op and browser-submitted score evidence cannot be described as cheat-proof.
