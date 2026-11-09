# Proposal

## Why

Players expect a 3D game they can move through, held sideways like most mobile action games, not a map they scroll. The journey itself should be the game: run and jump from place to place, light lamps on the way, and reach each place to hear its story. The stories and mini-games stay as they are; the path between them becomes playable.

## What Changes

- The journey becomes a landscape, third-person 3D platformer. The player guides a child traveller, with Jyoti the lamp spirit at their side, along one continuous course through all 13 places in map order.
- Touch controls use the familiar mobile action-game layout: a floating joystick on the left, drag on the right to look around, a jump button, and an action button that appears when there is something to do. Keyboard and mouse work on desktop: WASD or arrow keys to move, Space to jump, F or Enter to act, Q and E or a mouse drag to turn the camera, M for the map, Escape for the menu.
- Each place is a hub island with its landmark and a glowing story circle. Stepping into the circle and pressing the action button opens that place's story, mission and mini-game, exactly as from the 2D map.
- A gate of light closes the path to each place until the previous place has at least one star (the existing unlock rule). Winning a place for the first time builds the bridge to the next one.
- Between places: platforming paths themed to the destination (river stones, hill steps, lotus pads, moving boats, drum bounce pads, spinning rangoli discs, mountain ledges, ocean crates, bamboo bridges, rooftops, sky steps). Falling only returns the player to the last checkpoint; there are no lives in the journey.
- Diyas to light along the way, counted per place and saved on the device. No weapons and no fighting: the challenge is the path, and the goal is light.
- Fast travel: a map button lists every place and takes the player straight to any unlocked one, so no story is ever locked behind platforming skill.
- Landscape: the journey fills the screen. On phones it asks for fullscreen and landscape, and shows a "turn your phone sideways" hint in portrait. Stories, mini-games and menus open over the paused world and work in both orientations.
- Kala Pani becomes a 3D lane runner. The other games keep their current form.
- three.js loads lazily after the title screen and is precached for offline play.
- A "3D world" setting, and automatic fallback to the 2D map when WebGL is missing or the device is too slow.

Out of scope: weapons or combat, multiplayer, character customisation, converting the other ten mini-games to 3D, licensed model files (later; design.md, decision 3), the account system (`add-accounts-and-cloud-save`).

Save data: the local save gains the 3D-world setting and the lit diyas per place. Level ids are unchanged. Cloud save still syncs stars only.

## Capabilities

### New Capabilities
- `world-3d`: the landscape 3D journey platformer (controls, places, gates, diyas, checkpoints, fast travel), the 3D runner, performance targets and the 2D fallback.

### Modified Capabilities
- `persistence`: the local save also holds the 3D-world setting and the lit diyas.
- `visual-assets`: allows licensed, self-hosted 3D models with recorded credits, and adds rules for depicting sacred figures.

## Impact

- Dependency: `three` (lazily loaded chunk, about 145 KB gzipped, precached by the offline shell).
- Initial download unchanged (about 75 KB gzipped). The journey code adds about 15 KB gzipped to the lazy chunk.
- The web app manifest allows both orientations (`add-offline-and-install` updated to match).
- Starts with low-poly art built in code (no files), so nothing waits on an asset pack.
