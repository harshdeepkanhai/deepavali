# Security

## Reporting a problem

Please report vulnerabilities privately through GitHub: **Security → Report a vulnerability** on this repository. Do not open a public issue. You will get a reply within 7 days. Please include steps to reproduce and what an attacker could gain.

Only the current `main` branch and the live site are supported.

## What protects players

- **No passwords.** Accounts use passkeys only (fingerprint, face or device PIN), which are bound to this site and cannot be phished or guessed. There is no password to leak, reuse or spray.
- **No personal data.** No email, no real names, no addresses stored. Display names are generated. Players can delete their account and its data at any time.
- **Sessions** live in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. The database stores only hashes of session tokens and recovery codes.
- **Browser policy:** strict Content-Security-Policy (scripts from this site only, no framing), HSTS, no referrer, cross-origin isolation, a permissions policy that turns off cameras, microphones, location and payments.
- **Cross-site requests** that change anything must be JSON from this exact origin.
- **Abuse limits** per client on every route, tighter on sign-up, sign-in and recovery. Client addresses come from Render's edge (`CF-Connecting-IP`), which clients cannot forge; they are kept in memory only and never logged.
- **Input** is strictly validated: unknown fields, oversized bodies and impossible star counts are rejected.
- **Database** accepts connections only from the game server over Render's private network. Every query is parameterised.
- **Small attack surface:** one static server binary on a distroless image with no shell, running as a non-root user; four direct server dependencies; pinned lockfiles; CI runs `govulncheck` and `npm audit`; Dependabot proposes updates weekly.
- **Low fingerprint:** no server, framework or database names in headers, cookies, file names, error pages or error messages.

## Honest limits

- No system is attack-proof. These controls remove whole classes of attacks (phishing, credential stuffing, CSRF, SQL injection) and slow the rest.
- The hosting edge adds its own headers (for example `cf-ray`) and DNS shows the host. The app cannot hide those.
- Rate limits are per server instance. Scaling to several instances needs a shared store (Render Key Value).
- If a player loses every passkey **and** every recovery code, their account cannot be recovered. Their stars on the device are unaffected.

## Incident runbook

1. **Stop the damage.** Render dashboard → the web service → *Suspend*, or roll back: *Manual Deploy* → pick the last good commit.
2. **Sign everyone out.** The database refuses internet connections, so temporarily add your own IP under the database's *Access Control*, then run `DELETE FROM sessions; DELETE FROM challenges;` with `psql`, and remove your IP again.
3. **Rotate secrets.** Rotate the database password/credentials in the Render dashboard and redeploy so `DATABASE_URL` updates.
4. **Restore data if needed** from Render's backups or point-in-time recovery (paid database plans).
5. **Fix, test, redeploy:** `cd server && go test ./...`, `npm test`, `node scripts/e2e-accounts.cjs`.
6. **Tell players** what happened and what they should do (usually: sign in again).
