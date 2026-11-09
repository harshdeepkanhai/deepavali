# Design

## Context

The game is a static Vite + Solid build with an imperative game core. Progress is in localStorage (`deepa-quest-v2`). Hosting moves to Render: one web service plus managed PostgreSQL. Render puts Cloudflare and its own load balancers in front of every public service. Many players are children.

## Goals / Non-Goals

**Goals:** passwordless, phishing-resistant accounts; zero personal data; cloud save that never loses stars; a server that survives automated abuse and does not advertise its stack; one deployable unit.

**Non-Goals:** payments, email, social features, analytics, multi-region, horizontal scaling (one instance is enough; see Risks).

## Decisions

**1. Go for the server.** One static binary on a distroless, non-root image: no shell, no package manager, nothing else in the container to attack. The standard library HTTP server sends no `Server` or `X-Powered-By` header, uses ~20 MB of RAM (fits the smallest Render plan), and starts in milliseconds, which matters when a free instance wakes up. Four direct dependencies: `go-webauthn/webauthn` (passkeys), `jackc/pgx` (Postgres), `golang.org/x/time/rate` (limits), `golang.org/x/crypto` via go-webauthn.
- *Node/TypeScript (Hono, Fastify):* one language with the frontend and an excellent passkey library (`@simplewebauthn/server`), but hundreds of transitive npm packages to trust, more memory, slower cold start.
- *Rust (axum, webauthn-rs):* the strongest safety story, but long Docker builds on Render and a steep curve for future contributors.

**2. PostgreSQL (Render managed).** Accounts, credentials and sessions are relational; progress is a small JSONB document. `ipAllowList: []` in the Blueprint blocks all outside connections, so only the service reaches it over the private network. Sessions and rate-limit state need no Redis at one instance.

**3. Passkeys only.** Passkeys are bound to the site's domain, so phishing pages cannot use them; there is no password to guess, stuff or leak, which removes the main targets of automated and AI-assisted credential attacks. `userVerification: required`, discoverable credentials (usernameless sign-in), attestation `none` (no device fingerprinting), ES256 and RS256. Sign counters and backup flags are stored and checked; a clone warning refuses sign-in.

**4. Recovery codes, not email.** Ten codes of 16 base32 characters (80 bits) each. With that much randomness, SHA-256 at rest is enough (slow hashing only matters for guessable secrets). Codes are single use and rate-limited.

**5. Sessions.** 32 random bytes, sent as `__Host-s` (HttpOnly, Secure, SameSite=Strict, Path=/). The database keeps SHA-256(token), last-seen and absolute expiry. Tokens are compared by hash lookup; sign-in issues a new token (no fixation). Idle 7 days, absolute 30 days.

**6. Ceremony state.** WebAuthn challenges are stored server-side (single use, 5 minute expiry) and referenced by a separate short-lived `__Host-c` cookie, so a stolen challenge id from another browser does not help.

**7. Cross-site protection.** SameSite=Strict cookies, plus: every non-GET API request must have `Content-Type: application/json` and `Origin` equal to `PUBLIC_ORIGIN`. No CORS headers are ever sent.

**8. Client address.** Render's edge does not strip a client-sent `X-Forwarded-For`; Cloudflare overwrites `CF-Connecting-IP` on every request. Rate limits key on `CF-Connecting-IP` (configurable via `CLIENT_IP_HEADER`), falling back to the socket address locally. Addresses live only in memory for the limiter and are never logged or stored.

**9. Non-disclosure.** No `Server`/`X-Powered-By`; identical JSON (API) or HTML (pages) bodies for 404/405/500 with an opaque reference id; generic cookie names; Vite assets renamed to `a/<hash>.js`, no source maps, no module-preload polyfill; database errors never reach clients; ids are random, never sequential. The binary is built with `-trimpath -ldflags "-s -w -buildid="`.

**10. Optimisation.** Hashed assets get `Cache-Control: public, max-age=31536000, immutable`; HTML gets `no-cache`. Assets are pre-compressed with gzip at build time and served when the browser accepts it. The API client (about 1 KB gzipped) is bundled statically rather than lazy-loaded: dynamic `import()` would add bundler-specific helper code. Guests download it but never call the server.

## Threat model

| Threat | Includes AI-driven variants | Control |
|---|---|---|
| Credential stuffing, password spraying, phishing kits | bots that test leaked passwords at scale, AI-written phishing pages | no passwords exist; passkeys are origin-bound |
| Session theft (XSS, network, DB leak) | automated XSS discovery | strict CSP `script-src 'self'`, HttpOnly cookies, HSTS, hashed tokens at rest |
| CSRF / clickjacking | | SameSite=Strict, Origin check, JSON only, `frame-ancestors 'none'` |
| Injection (SQL, JSON, oversized input) | fuzzing agents | parameterised queries, strict JSON decoding with unknown-field rejection, 16 KB body cap, allow-listed level ids |
| Account farming and floods | scripted sign-up loops | per-address token buckets, tight limits on ceremonies, global caps |
| Recovery-code guessing | | 80-bit codes, single use, rate limits |
| Recon / fingerprinting | AI agents mapping the stack to known CVEs | decision 9; minimal, patched dependencies |
| Dependency compromise | | pinned `go.sum` and `package-lock.json`, `govulncheck` and `npm audit` in CI, Dependabot |
| Data exposure | | no personal data collected; private database; account deletion |

## Risks / Trade-offs

- **Not fully unidentifiable.** The app hides its own stack, but Render's edge adds its own headers (such as `cf-ray`) and DNS shows the host. No app can remove those. Hiding the stack slows reconnaissance; it is not a defence on its own.
- **No system is attack-proof.** These controls remove whole classes of attacks and slow the rest. `SECURITY.md` explains how to report issues and what to do in an incident (revoke all sessions, rotate secrets, restore a backup).
- **Single instance.** Sessions are in Postgres, but rate-limit state is in memory, so limits are per instance. Scaling out needs Render Key Value for shared limits.
- **Free tier.** The Blueprint starts on Render's free database, which is deleted 30 days after creation and has no backups; before then it must be upgraded or moved to another PostgreSQL host (no code change needed). Free web services sleep after 15 minutes.
- **Children's privacy.** Collecting no personal data keeps this simple, but if the game targets children in a country with child-data laws (for example India's DPDP Act or US COPPA), get legal advice before launch.
- **Losing every passkey and every recovery code means losing the account.** This is the cost of collecting no email; local progress on the device is unaffected.
