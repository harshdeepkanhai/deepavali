# Proposal

## Why

Progress lives only in one browser's localStorage. Clear the browser or switch phones and every star is gone. Players need an account to keep their journey, and the game is moving from GitHub Pages to Render, where we can run our own server. Because many players are children, the account system must collect no personal data, must not use passwords, and must hold up against automated (including AI-driven) attacks.

## What Changes

- A Go server serves the built game and a small JSON API from one origin on Render.
- Accounts use **passkeys only** (WebAuthn, user verification required). No passwords, no email, no real names: each account gets a generated display name such as "Golden Diya 4821".
- Ten one-time recovery codes are shown once at sign-up for when every passkey is lost.
- Server-side sessions in `__Host-` cookies (HttpOnly, Secure, SameSite=Strict), stored hashed, with idle and absolute expiry and sign-out everywhere.
- Cloud save: progress syncs to the account; stars merge by taking the best score per place, so no device can lose stars.
- Players can delete their account and all its data at any time.
- Hardening: strict security headers and CSP, origin checks, strict input validation, rate limits keyed on the Cloudflare client IP, no software names or versions in any response, PostgreSQL reachable only over Render's private network.
- Deploy: Dockerfile (distroless, non-root) and `render.yaml` Blueprint. Render builds from the repo, so GitHub Actions is no longer needed to deploy. The workflow becomes CI only (tests, spec validation, vulnerability scans).
- Playing without an account still works exactly as today, including offline.

Out of scope: in-game shop or payments, social features, leaderboards, email, analytics, admin UI, the 3D world (separate change `build-3d-vertical-world`).

Save data: the localStorage key `deepa-quest-v2` and all level ids are unchanged. Cloud save stores the same shape.

## Capabilities

### New Capabilities
- `accounts`: passkey sign-up and sign-in, sessions, recovery codes, sign-out, account deletion, generated display names.
- `cloud-save`: syncing progress and settings between the device and the account, and the merge rules.
- `server-security`: transport and browser security headers, request validation, abuse limits, private data store, and non-disclosure of the server's technology.

### Modified Capabilities
<!-- none: persistence keeps its local-save requirements; delivery is covered by migrate-to-solidjs -->

## Impact

- New `server/` Go module (net/http, go-webauthn, pgx); new `Dockerfile`, `render.yaml`, `SECURITY.md`.
- Frontend: account panel in Settings, a small API client, sync on sign-in and after each result.
- New UI strings in all 8 languages.
- Hosting: one Render web service plus one Render PostgreSQL instance. Free Render Postgres is deleted after 30 days, so production needs a paid database plan.
- `.github/workflows/deploy.yml` stops deploying to Pages and becomes CI.
