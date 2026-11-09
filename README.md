# Deepa Quest · A Journey of Lights

A mobile-first game about why Diwali is celebrated across India and the world.
Travel 13 places, from Ayodhya and Amritsar to Kathmandu, Port Louis, Trinidad and Leicester.
At each place, read the story (in English or the place's own language), play a one-minute
mini-game, and collect its lamp card.

Languages: English, हिन्दी, ਪੰਜਾਬੀ, বাংলা, தமிழ், ગુજરાતી, नेपाली, Bahasa Melayu.

Play as a guest with nothing sent anywhere, or create an account with a passkey (fingerprint,
face or screen lock: no email, no password) to keep your stars on every device.

## How it fits together

| Part | What | Where |
|---|---|---|
| Game | SolidJS + TypeScript, built by Vite into static files | `src/`, `index.html` |
| Server | Go: serves the game and a small JSON API for passkeys and cloud save | `server/` |
| Database | PostgreSQL (private, never reachable from the internet) | `server/migrations/` |
| Specs | OpenSpec: what the game must do, and planned changes | `openspec/` |
| Hosting | Render: one Docker web service + one PostgreSQL | `Dockerfile`, `render.yaml` |

## Develop

```bash
npm install
npm run dev                 # game only, http://localhost:5173 (guest mode)
npm test                    # build + headless smoke test of every level and language
```

With accounts (needs Go 1.26+ and a local PostgreSQL):

```bash
npm run build
cd server
PUBLIC_ORIGIN=http://localhost:8080 STATIC_DIR=../dist CLIENT_IP_HEADER= \
DATABASE_URL=postgres://user@localhost:5432/deepaquest?sslmode=disable go run .
# open http://localhost:8080
go test ./...
TEST_DATABASE_URL=postgres://... node ../scripts/e2e-accounts.cjs   # throwaway database only
```

## Deploy on Render

1. Render dashboard → **New → Blueprint** → choose this repository. It reads `render.yaml`.
2. When asked, set `PUBLIC_ORIGIN` to the site address, for example `https://deepa-quest.onrender.com`
   (or your own domain), with no trailing slash. Passkeys are tied to this domain.
3. Render builds the Dockerfile, runs database migrations on start, and deploys on every push.
   A failing build or health check keeps the previous version live.

Notes: the free web plan sleeps after 15 idle minutes, and free Render databases are deleted after
30 days, so the Blueprint uses a paid database plan. See `SECURITY.md` for the security model.

## Server settings

| Variable | Meaning |
|---|---|
| `PUBLIC_ORIGIN` | the only origin allowed to use the API; also the passkey domain (required) |
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `PORT` | listen port (Render sets it) |
| `STATIC_DIR` | built game files (`/app/web` in the image) |
| `CLIENT_IP_HEADER` | header holding the real client address; `CF-Connecting-IP` on Render, empty locally |

## Credits

No images, fonts or emoji: every icon is an SVG path in `src/core/icons.js`. Third-party code and
licences are listed in `package.json`, `package-lock.json` and `server/go.mod`.
