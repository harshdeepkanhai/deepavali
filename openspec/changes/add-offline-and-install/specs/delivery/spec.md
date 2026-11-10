# Spec Delta

## ADDED Requirements

### Requirement: Installable app
The game SHALL provide a web app manifest and icons so supporting browsers offer to install it, and once installed it SHALL open without browser controls (full screen in landscape, see `layout` in `play-full-screen-in-landscape`).

#### Scenario: Installing on Android
- **WHEN** a player opens the game in Chrome on Android
- **THEN** the browser offers "Install app" and the installed game opens without the address bar

### Requirement: Offline play
After the game has been opened once with a network connection, it SHALL open and every level SHALL be playable with no network connection, with guest progress saved locally.

#### Scenario: Flight mode
- **WHEN** a player who visited yesterday opens the game in flight mode
- **THEN** the title screen appears, every level plays, and stars are saved on the device

### Requirement: Instant repeat loads
After the first visit, opening the game SHALL NOT download the page, script, styles or icons again unless a new version has been published.

#### Scenario: Second launch
- **WHEN** a player opens the game a second time
- **THEN** the game shell loads from the device without network requests for those files

### Requirement: Atomic updates
A page SHALL NOT mix files from two versions, and a page still running the previous version SHALL be able to load its own files (such as the 3D journey) until it switches to the new one.

#### Scenario: Previous version's files
- **WHEN** a page still running the previous version opens the 3D journey after a new version took over
- **THEN** the journey's files load from the device

### Requirement: Prompt updates
A new version SHALL be fetched in the background and SHALL replace the running one at the next calm moment: at once on the title screen or the 2D map with nothing open, otherwise the next time the player goes to the title screen or the map, which then opens again in the new version. A story, mini-game, menu or walk through the 3D journey SHALL NOT be interrupted.

#### Scenario: Opening the game after a deploy
- **WHEN** a player opens the game after a new version was deployed
- **THEN** the previous version opens at once, the new one downloads in the background, and the title screen switches to it as soon as it is ready

#### Scenario: Update ready mid-game
- **WHEN** a new version becomes ready while a player is mid-game
- **THEN** their game keeps running unchanged, and when they next go to the map, the map opens in the new version

### Requirement: Live data is never cached
Account, sign-in and sync requests SHALL always go to the network and SHALL NOT be stored by the offline cache.

#### Scenario: Signed-in player offline
- **WHEN** a signed-in player earns stars offline
- **THEN** the stars are saved on the device and sent to the account at the next successful sync
