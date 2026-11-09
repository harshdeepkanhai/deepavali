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

## Works offline, installs like an app

After the first visit the game opens instantly from the device, even with no network, and every
level plays offline. Android and desktop Chrome offer **Install app**; on iPhone use
**Share → Add to Home Screen**. New versions download in the background and are used from the
next launch. Account and sync requests always go to the server and are never cached.

## Deploy on Render

**Before you start**
- Render deploys one branch. Merge your work into `main` (a squash merge keeps history tidy),
  or choose this branch when you create the Blueprint.
- Decide the final web address first. Passkeys only work on the domain they were created on.

**Steps**
1. Sign up at render.com with GitHub. In **Account Settings → Git Deployment Credentials**,
   connect GitHub and give the Render app access to this repository (needed for private repos).
2. **New → Blueprint** → pick this repository and branch. Render reads `render.yaml` and shows:
   - web service `deepa-quest` (Docker, free plan, Singapore)
   - database `deepa-quest-db` (PostgreSQL 18, free plan, Singapore, private)
3. When asked for `PUBLIC_ORIGIN`, enter `https://deepa-quest.onrender.com` (no trailing slash).
4. **Apply**. The first build takes several minutes. The site goes live only after the build
   and the `/up` health check pass; otherwise the previous version keeps running.
5. Open the service page and copy the exact address shown at the top. If Render added a suffix
   because the name was taken, go to **Environment**, set `PUBLIC_ORIGIN` to that exact address,
   and choose **Save, rebuild, and deploy**.
6. Check it: play a level as a guest, then **Settings → Account → Create account**. Reload once,
   switch to flight mode, and open the game again: it should still play.
7. Own domain (optional, before inviting players): service → **Settings → Custom Domains**,
   add the domain, create the DNS record Render shows, wait for the certificate, then set
   `PUBLIC_ORIGIN` to `https://your-domain` and redeploy.

After that, every push to the branch deploys automatically.

**If something goes wrong**
| You see | Fix |
|---|---|
| Deploy fails; log says `PUBLIC_ORIGIN and DATABASE_URL are required` | set `PUBLIC_ORIGIN` in Environment |
| Log says `PUBLIC_ORIGIN must use https outside localhost` | use `https://` |
| The game works, but account buttons say "That did not work" | `PUBLIC_ORIGIN` must match the address bar exactly |
| The repository is missing in Render | give the Render GitHub app access to it again |
| First visit after a quiet spell takes about a minute | the free web plan sleeps after 15 idle minutes; returning players still open instantly from the offline cache |

Costs: everything in the Blueprint is free. **Write down the day you create it:** Render deletes a
free database 30 days after creation (with 14 more days to upgrade), and free databases have no
backups. Every account and cloud save lives there, so before day 30 either upgrade the database
plan in Render, or move it (below).

## Moving the database

The server speaks PostgreSQL, so any PostgreSQL host works with no code change: create the
database there, copy the data, and set `DATABASE_URL` to the new connection string (keep
`sslmode=require`). The server creates its tables on start.

```bash
pg_dump --no-owner --no-acl "$OLD_DATABASE_URL" > deepa.sql   # Render: Database -> Connect -> External URL
psql "$NEW_DATABASE_URL" < deepa.sql
```

To reach the Render database from your computer for the dump, add your IP under the database's
**Access Control** for a moment, then remove it. A move to a different kind of database, such as
MongoDB, needs a new data layer in `server/` first.

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
