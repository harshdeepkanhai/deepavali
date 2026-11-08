# Deepa Quest · A Journey of Lights

A mobile-first game about why Diwali is celebrated across India and the world.
Travel 13 places, from Ayodhya and Amritsar to Kathmandu, Port Louis, Trinidad and Leicester.
At each place, read the story (in English or the place's own language), play a one-minute
mini-game, and collect its lamp card.

Play: https://harshdeepkanhai.github.io/deepavali/

Languages: English, हिन्दी, ਪੰਜਾਬੀ, বাংলা, தமிழ், ગુજરાતી, नेपाली, Bahasa Melayu.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # build + headless smoke test of every level and language
npm run build    # static site in dist/
```

Built with [SolidJS](https://www.solidjs.com/) and [Vite](https://vite.dev/). No images, fonts or
emoji: every icon is an SVG path in `src/core/icons.js`. Specs and planned changes live in
`openspec/` ([OpenSpec](https://github.com/Fission-AI/OpenSpec)). Contributor guide: `CLAUDE.md`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which validates the specs, builds,
and publishes to GitHub Pages. In the repository settings, set Pages → Source to **GitHub Actions**.
