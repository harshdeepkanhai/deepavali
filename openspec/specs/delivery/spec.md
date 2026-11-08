# delivery Specification

## Purpose
How Deepa Quest is built, shipped and loaded: a static site on GitHub Pages that works offline.

## Requirements
### Requirement: Self-contained page
The game SHALL be delivered as a single self-contained index.html with no build step.

#### Scenario: Opening the file
- **WHEN** index.html is served by any static file server
- **THEN** the full game runs without installing dependencies

### Requirement: No third-party requests
The game MUST NOT request any resource from another origin (CDNs, web fonts, analytics, images, audio).

#### Scenario: Network log
- **WHEN** the game is played from title to finale with the network panel open
- **THEN** no request leaves the game's own origin
