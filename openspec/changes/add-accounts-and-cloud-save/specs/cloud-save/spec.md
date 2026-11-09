# Spec Delta

## Purpose
Keeping a signed-in player's stars in their account so progress survives cleared browsers and new devices, while guest play stays fully local. Settings such as sound, language and text size stay on each device.

## ADDED Requirements

### Requirement: Guest play stays local
Playing without an account SHALL work exactly as before, including offline, and SHALL send nothing to the server.

#### Scenario: Offline guest
- **WHEN** a guest plays with no network
- **THEN** every level, the album and settings work and progress is saved locally

### Requirement: Best-score merge
When device progress and account progress meet, the merged result SHALL keep, for each place, the higher star count of the two, so that syncing never lowers a score.

#### Scenario: Two devices
- **WHEN** the phone has 3 stars on Ayodhya and the account has 1, while the account has 2 stars on Nepal and the phone has none
- **THEN** after sync both have 3 stars on Ayodhya and 2 on Nepal

### Requirement: Sync points
A signed-in device SHALL sync on sign-in and after each result card, and a failed sync SHALL be retried later without blocking play.

#### Scenario: Network drops mid-game
- **WHEN** a result is earned while the server is unreachable
- **THEN** the stars are saved locally and sent at the next successful sync

### Requirement: Validated progress
The server SHALL accept only known level ids with whole-number star values from 0 to 3, and SHALL reject anything else without storing it.

#### Scenario: Tampered request
- **WHEN** a request claims 99 stars or an unknown level id
- **THEN** the request is rejected and stored progress is unchanged
