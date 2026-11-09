# Spec Delta

## MODIFIED Requirements

### Requirement: Local save
Progress and preferences SHALL be stored in localStorage under the key deepa-quest-v2 as stars per level id plus sound, vibration, prologue-seen, language, larger-text and 3D-world settings.

#### Scenario: Returning player
- **WHEN** a player who has earned stars reloads the game
- **THEN** their stars, unlocked places and settings are restored

#### Scenario: Storage unavailable
- **WHEN** localStorage throws (private mode or blocked)
- **THEN** the game still runs, without saving
