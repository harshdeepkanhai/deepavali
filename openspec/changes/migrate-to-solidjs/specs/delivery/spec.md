# Spec Delta

## REMOVED Requirements

### Requirement: Self-contained page
**Reason**: The game moves to a component framework with a build step; a hand-edited single file no longer scales to 13 places in 8 languages.
**Migration**: Run `npm install && npm run build` and serve `dist/`, or use the GitHub Actions deploy. The player-facing guarantees move to "Static same-origin bundle".

## ADDED Requirements

### Requirement: Static same-origin bundle
The game SHALL be delivered as a static bundle (HTML, scripts and styles only) produced by a single build command, and every file it loads SHALL be served from the game's own origin.

#### Scenario: Building the game
- **WHEN** a contributor runs the build command on a clean checkout after installing dependencies
- **THEN** a static folder is produced that runs the full game from any static file server

#### Scenario: Serving from a sub-path
- **WHEN** the built folder is served under a sub-path such as /deepavali/
- **THEN** all scripts and styles load and the game runs

### Requirement: Automated deployment
Every push to the main branch SHALL build the game and validate the specs, and the hosting platform SHALL publish the result only if both succeed.

#### Scenario: Failing build
- **WHEN** a push to main fails to build or fails spec validation
- **THEN** the live site keeps serving the previous version

#### Scenario: Passing build
- **WHEN** a push to main builds and validates successfully
- **THEN** the new version goes live
