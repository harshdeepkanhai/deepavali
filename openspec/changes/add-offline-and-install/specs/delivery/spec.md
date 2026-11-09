# Spec Delta

## ADDED Requirements

### Requirement: Installable app
The game SHALL provide a web app manifest and icons so supporting browsers offer to install it, and once installed it SHALL open full screen in portrait without browser controls.

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
A new version SHALL be fetched in the background and used from the next launch, and a launch SHALL NOT mix files from two versions.

#### Scenario: Update published mid-session
- **WHEN** a new version is deployed while a player is mid-game
- **THEN** their current game keeps running unchanged and the next launch uses the new version

### Requirement: Live data is never cached
Account, sign-in and sync requests SHALL always go to the network and SHALL NOT be stored by the offline cache.

#### Scenario: Signed-in player offline
- **WHEN** a signed-in player earns stars offline
- **THEN** the stars are saved on the device and sent to the account at the next successful sync
