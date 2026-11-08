# persistence Specification

## Purpose
Remembering progress and preferences on the player's device.

## Requirements
### Requirement: Local save
Progress and preferences SHALL be stored in localStorage under the key deepa-quest-v2 as stars per level id plus sound, vibration, prologue-seen, language and larger-text settings.

#### Scenario: Returning player
- **WHEN** a player who has earned stars reloads the game
- **THEN** their stars, unlocked places and settings are restored

#### Scenario: Storage unavailable
- **WHEN** localStorage throws (private mode or blocked)
- **THEN** the game still runs, without saving

### Requirement: Stable level ids
Level ids MUST NOT be renamed once shipped, because they are the save keys.

#### Scenario: Renaming a place
- **WHEN** a place's display name changes
- **THEN** its id stays the same and existing stars are kept

### Requirement: Reset with confirmation
Resetting progress SHALL require an in-game confirmation before stars and cards are erased.

#### Scenario: Cancel reset
- **WHEN** the player chooses Reset progress and then Cancel
- **THEN** nothing is erased
