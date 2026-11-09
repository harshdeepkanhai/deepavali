# Design

## Context

Art today is a 24×24 SVG icon set drawn into the DOM and onto 2D canvases. The game is portrait, mobile-first, with a ~70 KB gzipped budget. Screens are migrating to Solid; engines are imperative.

## Goals / Non-Goals

**Goals:** a 3D journey that looks good on mid-range phones; real characters; a fast first load; a working 2D path for every player.

**Non-Goals:** console-grade graphics, physics engines, converting every game at once.

## Decisions

**1. three.js, loaded lazily.** It has the most mature glTF loader, skeletal animation, and documentation. It adds ~150 KB gzipped, so it lives in its own chunk loaded after the title screen. OGL (~15 KB) was considered: lighter, but its glTF skinning and animation support is far less mature, and good-looking animated characters are the point of this change.

**2. Assets: glTF binary (.glb), compressed.** Models are optimised with `gltf-transform` (meshopt geometry, WebP textures at most 1024 px). Targets: player character under 500 KB, each chapter's scenery under 1.5 MB. Files live in `public/models/`, with `CREDITS.md` beside them.

**3. Art: built in code first, licensed models later.** The first version builds every island, landmark, diya and Jyoti from three.js primitives in code: no files, no licences, tiny download, and the same colours as the icon set. Later, pieces can be replaced by licensed models without touching gameplay. Sources for that step (pick one consistent style; licences must be re-checked on download):

| Source | What | Licence |
|---|---|---|
| Kenney (kenney.nl) | low-poly characters, towns, nature, boats, 2D sprites | CC0 |
| Quaternius (quaternius.com) | animated low-poly characters, animals, nature | CC0 |
| KayKit by Kay Lousberg (itch.io) | stylised characters and environment kits | CC0 |
| Poly Pizza (poly.pizza) | searchable low-poly models | per model: CC0 or CC-BY |
| Sketchfab (downloadable filter) | detailed models, some Indian architecture | per model, often CC-BY |
| Mixamo (Adobe account) | rigging and animations for a custom character | free for games; check terms |

Recommended: Quaternius or KayKit for characters and animals, Kenney for scenery and boats, all CC0 with one consistent style. Culturally specific pieces (diyas, temples, rangoli, Indian clothing) are rare in free packs; commission them, or model them simply and keep the icon set's colours.

**4. Sacred figures.** No figure is used for Sikh Gurus (many Sikh institutions, including the SGPC, object to depicting them). Deities appear as light and symbols. The player character is Jyoti, the lamp spirit, so the hero never has to be a sacred figure.

**5. Rendering budget.** Device pixel ratio capped at 1.5, one directional light plus ambient light, baked or vertex-colour shading, no real-time shadows on low tier, instancing for repeated diyas, render-on-demand when idle. A frame-time probe in the first two seconds switches to the 2D map if the average is above 33 ms.

**6. Integration.** The 2D map always renders first (instant, accessible); when 3D is on, the lazily loaded world mounts over it and the 2D map hides. Place labels are real HTML buttons positioned over the 3D islands each frame, so Indic scripts render natively, tap targets stay 44 px and screen readers can use them. Engines keep the `E[type]` contract; the 3D runner is selected for Kala Pani when 3D is on.

**7. Testing.** Headless Chromium renders WebGL in software, too slowly for the frame-time probe, so `?debug&g3d=1` forces 3D and `?debug&g3d=0` forces 2D in tests.

## Risks / Trade-offs

- Download size: each chapter is a few MB of models on mobile data. Mitigation: load per chapter, show the 2D map while loading, and cache with immutable headers.
- Style mismatch between packs: choose one primary pack and stay with it.
- Licences change: record each file's licence when it is downloaded.
- Battery: render-on-demand and the low-power renderer preference.
