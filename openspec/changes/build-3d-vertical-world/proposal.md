# Proposal

## Why

The flat icon map and 2D games feel small next to the stories they tell. A portrait 3D world, climbing upward from Ayodhya to the finale, with real characters, gives the journey a sense of place and makes the game feel like a game. The current icon-only art also limits how good characters can look.

## What Changes

- A vertical (portrait) 3D journey: the 13 places rise along a glowing path; the player drags up and down, the camera follows Jyoti, and tapping a place opens its story.
- Kala Pani becomes a 3D lane runner, the first 3D mini-game. The other games keep their current form and are migrated one at a time later.
- Self-hosted, openly licensed 3D models and textures (glTF/GLB) are allowed, each recorded in a credits manifest. Emoji stay banned. Nothing loads from other sites.
- three.js renders the 3D scenes and loads only after the title screen, so first load stays small.
- Jyoti, the lamp spirit, floats at the player's current place and flies to each newly unlocked place; a row of diyas along the path lights up as places are completed.
- A "3D world" setting and automatic fallback to the current 2D map when WebGL is missing, the device is slow, or reduced motion is requested.

Out of scope: converting all eleven games to 3D, multiplayer, character customisation, the account system (`add-accounts-and-cloud-save`).

Save data and level ids are unchanged.

## Capabilities

### New Capabilities
- `world-3d`: the vertical 3D journey, the 3D runner, performance targets and the 2D fallback.

### Modified Capabilities
- `visual-assets`: allows licensed, self-hosted 3D models and textures with recorded credits, and adds rules for depicting sacred figures.

## Impact

- Dependency: `three` (lazy-loaded chunk). Assets under `public/models/` with `public/models/CREDITS.md`.
- Bundle: initial download unchanged (about 70 KB gzipped); the 3D chunk and each chapter's models load on demand.
- Starts with low-poly art built in code (no files), so nothing waits on an asset pack; licensed models can replace pieces later (design.md, decision 3).
