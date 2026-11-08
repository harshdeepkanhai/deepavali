# mini-games Specification

## Purpose
The eleven short mini-game engines (tap, shield, swipe, rhythm, slash, rangoli, quiz, runner, simon, memory, lights) and the rules every engine follows.

## Requirements
### Requirement: Engine contract
Every engine SHALL build its interface inside the game stage, report exactly one result of 0 to 3 stars with a one-line summary, and clean up its listeners when the next game starts.

#### Scenario: Engine finishes
- **WHEN** an engine's win or lose condition is reached
- **THEN** it reports one result and the result card is shown once

### Requirement: Pausable time
All game timing SHALL use the pausable game clock so that pausing freezes timers, spawns and animations.

#### Scenario: Pause mid-game
- **WHEN** the player presses pause or Escape during a game
- **THEN** the pause menu opens and no time passes in the game until Resume

#### Scenario: Tab hidden
- **WHEN** the page becomes hidden during a game
- **THEN** the game pauses automatically and audio is suspended

### Requirement: Engine catalogue
The game SHALL provide the engines tap, shield, swipe, rhythm, slash, rangoli, quiz, runner, simon, memory and lights, each configured only through its level's game settings.

#### Scenario: Tuning difficulty
- **WHEN** a designer changes a level's game settings
- **THEN** only that level's difficulty changes
