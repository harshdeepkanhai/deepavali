# Tasks

## 1. Server foundation

- [x] 1.1 Go module in `server/`: config from environment, graceful shutdown, request timeouts, 16 KB body cap
- [x] 1.2 Static file serving with immutable caching for hashed assets, `no-cache` HTML, pre-compressed gzip
- [x] 1.3 Security headers middleware (CSP, HSTS, COOP, CORP, Referrer-Policy, Permissions-Policy, nosniff, frame-ancestors)
- [x] 1.4 Uniform 404/405/500 responses with opaque reference ids; no stack-revealing headers; minimal access log without addresses
- [x] 1.5 Verify: `go test ./...` covers headers, unknown paths and methods

## 2. Database

- [x] 2.1 Embedded SQL migrations applied at start-up: users, credentials, sessions, challenges, recovery_codes, progress
- [x] 2.2 Data access with pgx, parameterised queries only, random ids
- [x] 2.3 Verify: migrations run twice cleanly against a local PostgreSQL

## 3. Passkeys and sessions

- [x] 3.1 Sign-up ceremony (begin/finish) with generated display names and recovery codes
- [x] 3.2 Usernameless sign-in ceremony with sign-count, clone and flag checks
- [x] 3.3 Session cookies, idle and absolute expiry, sign-out and sign-out everywhere
- [x] 3.4 Origin and JSON checks for state-changing requests; per-address rate limits using `CF-Connecting-IP`
- [x] 3.5 Recovery-code sign-in; add-a-passkey for signed-in players
- [x] 3.6 Verify: end-to-end test with a virtual authenticator (sign up, sign out, sign in, recover, forged-origin rejection)

## 4. Cloud save and deletion

- [x] 4.1 `GET/PUT /api/progress` with allow-listed level ids and best-score merge
- [x] 4.2 Account deletion removing every row for the account
- [x] 4.3 Verify: end-to-end test of merge, tampered input and deletion

## 5. Game client

- [x] 5.1 Lazy-loaded API client with base64url passkey helpers
- [x] 5.2 Account panel in Settings: save progress, sign in, recovery codes, sign out (here / everywhere), delete; all 8 languages
- [x] 5.3 Sync on sign-in and after results, with retry
- [x] 5.4 Vite output hardening: renamed assets, no preload polyfill, no source maps
- [x] 5.5 Verify: `npm test` still passes; account e2e passes through the real UI

## 6. Deploy and operations

- [ ] 6.1 Multi-stage Dockerfile: build web, build server (`-trimpath -s -w`), distroless non-root runtime
- [ ] 6.2 `render.yaml`: web service with health check, private Postgres (`ipAllowList: []`), generated secrets
- [ ] 6.3 CI workflow without Pages deploy: tests, spec validation, `govulncheck`, `npm audit`; Dependabot config
- [ ] 6.4 `SECURITY.md`: reporting, supported versions, incident runbook
- [ ] 6.5 Verify: Docker image builds and serves the game; header scan shows no stack names

## 7. Close out

- [ ] 7.1 Update `CLAUDE.md` and `README.md`; archive the change
