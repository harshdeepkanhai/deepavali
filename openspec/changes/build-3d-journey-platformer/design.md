# Design

## Context

Art today is a 24×24 SVG icon set drawn into the DOM and onto 2D canvases. Menus, stories and the eleven mini-games are portrait-first and imperative; screens are migrating to Solid. The initial download budget is about 70 KB gzipped. The player asked for a landscape 3D game in the style of mobile action games, where the whole journey is played, not scrolled.

## Goals / Non-Goals

**Goals:** a landscape third-person platformer through all 13 places that runs well on mid-range phones; controls that mobile players already know; the stories and mini-games unchanged; a fast first load; a working 2D path for every player.

**Non-Goals:** combat, console-grade graphics, a physics engine, converting every mini-game to 3D.

## Decisions

**1. three.js, loaded lazily.** It has the most mature glTF loader, skeletal animation and documentation. It adds about 145 KB gzipped, so it lives in its own chunk loaded after the title screen and precached by the offline shell. OGL (about 15 KB) was considered: lighter, but its glTF skinning and animation support is far less mature, and animated characters are the long-term point of this change.

**2. Assets: glTF binary (.glb), compressed.** When models arrive they are optimised with `gltf-transform` (meshopt geometry, WebP textures at most 1024 px). Targets: player character under 500 KB, each chapter's scenery under 1.5 MB. Files live in `public/models/`, with `CREDITS.md` beside them.

**3. Art: built in code first, licensed models later.** The first version builds the hero, Jyoti, every island, landmark, platform and diya from three.js primitives in code: no files, no licences, a tiny download, and the icon set's colours. Pieces can be replaced by licensed models later without touching gameplay. Sources for that step (pick one consistent style; licences must be re-checked on download):

| Source | What | Licence |
|---|---|---|
| Kenney (kenney.nl) | low-poly characters, towns, nature, boats | CC0 |
| Quaternius (quaternius.com) | animated low-poly characters, animals, nature | CC0 |
| KayKit by Kay Lousberg (itch.io) | stylised characters and environment kits | CC0 |
| Poly Pizza (poly.pizza) | searchable low-poly models | per model: CC0 or CC-BY |
| Sketchfab (downloadable filter) | detailed models, some Indian architecture | per model, often CC-BY |
| Mixamo (Adobe account) | rigging and animations for a custom character | free for games; check terms |

Recommended: Quaternius or KayKit for characters, Kenney for scenery and boats, all CC0 in one style. Culturally specific pieces (diyas, temples, rangoli, Indian clothing) are rare in free packs; commission them, or keep modelling them simply in code.

**4. Sacred figures and the hero.** No figure is used for Sikh Gurus (many Sikh institutions, including the SGPC, object to depicting them). Deities appear only as light, symbols and places. The player character is an ordinary child traveller in a kurta, with no religious markings, so every tradition in the game can be visited by the same hero. Jyoti, the lamp spirit, travels beside them.

**5. Controls and camera.** The layout follows mobile action games: a floating joystick that appears under the left thumb (left 45 % of the screen), look-around by dragging anywhere on the right, a large jump button and a context action button on the right. Pointers are tracked by id, so moving, looking and jumping work together. Movement is relative to the camera. The camera orbits the hero at a fixed distance, eases behind the direction of travel when the player is not looking around, and never bobs or shakes with reduced motion. Jumps use coyote time and a jump buffer (about 0.12 s each) and are always full height, so quick taps on touch screens are enough; together they make the platforming feel fair. The mouse always looks around; keyboard keys move.

**6. Physics without an engine.** The hero is a kinematic capsule against a few hundred simple colliders: boxes (with a rotation about the vertical axis) and discs. Platforms are one-way: the hero lands on them from above and can jump up through them. Landmarks and closed gates are solid on their sides. Moving and spinning platforms carry the hero. Only colliders of the current and neighbouring places are tested each frame.

**7. The course is generated from a small table.** Each stretch between two places is a list of platform specs (gap, size, sideways offset, rise, kind, diyas), laid out from the previous island's edge in a set direction; the next island is placed where the stretch ends. The layout is deterministic, so the diyas' order is stable and their lit state can be saved as one bitmask per place. Changing a stretch's diyas later resets that place's lit diyas, which is acceptable for a collectible with no effect on progress.

**8. Integration.** The world is a full-screen layer behind the game's centred panel; while the journey is active the panel is transparent and lets touches through. Stories, mini-games and menus open in the panel over the paused, dimmed world, so they keep their current layouts and work in both orientations. The 2D map always renders first (instant and accessible) and stays the fallback. Fast travel and the menu reuse the existing modal. Engines keep the `E[type]` contract; the 3D runner is chosen for Kala Pani when 3D is on.

**9. Landscape.** On touch devices, entering the journey after the Play tap asks for fullscreen and `screen.orientation.lock('landscape')`; browsers that refuse (iPhone Safari, desktop) are fine. While a touch screen is in portrait, a hint asks the player to turn the phone and can be dismissed. The manifest allows any orientation, so installed apps can rotate.

**10. Rendering budget.** Device pixel ratio capped at 1.5, hemisphere and directional light plus Jyoti's point light, flat shading, no shadow maps (a soft blob shadow under the hero), fog, instancing for diyas, and only nearby places drawn. A frame-time probe lowers the resolution step by step (1.5, 1, 0.75) and switches to the 2D map with a notice if the median frame stays above 34 ms. Rendering stops while anything covers the world or the tab is hidden. three.js r163 and later need WebGL 2, so that is what the game checks for.

**11. Testing.** Headless Chromium renders WebGL in software, too slowly for the frame-time probe, so `?debug&g3d=1` forces 3D (skipping the probe) and `?debug&g3d=0` forces 2D. With `?debug`, `window.DQ.world` exposes the hero's state and a teleport for tests.

**12. Losing the GPU.** Phones take the WebGL context away under memory pressure, often while the game is in the background. That says nothing about the device's speed, so it must not turn 3D off for good (the first version did, which could make the journey vanish for a player who only switched apps). The world lets the context be restored (three.js rebuilds every GPU resource from the scene when it is), pauses while it is gone, and carries on where it was. If it is still gone after five seconds of the page being visible, this visit uses the 2D map; the setting is unchanged, so the next launch tries 3D again.

## Risks / Trade-offs

- Some children find 3D platforming hard. Mitigation: wide platforms early on, forgiving jumps, no lives, checkpoints, and fast travel to any unlocked place.
- Landscape menus are short. Mitigation: menus and stories stay in the centred panel, which scrolls; the mini-games size themselves to their field.
- Download size: three.js is large. Mitigation: lazy chunk after the title screen, precached once.
- Battery: rendering stops when covered or hidden, and the resolution adapts.
- Style mismatch when models arrive: choose one primary pack and stay with it.
