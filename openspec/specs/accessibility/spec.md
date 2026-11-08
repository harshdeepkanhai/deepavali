# accessibility Specification

## Purpose
Making the game comfortable on small touch screens, with a keyboard, and for players sensitive to motion or small text.

## Requirements
### Requirement: Touch targets
Interactive controls SHALL be at least 44 by 44 CSS pixels.

#### Scenario: Header buttons
- **WHEN** the map header is shown on a 360px-wide screen
- **THEN** every header button is at least 44px square

### Requirement: Reduced motion
When the player's system requests reduced motion, the game SHALL disable screen shake and flashes, stop decorative looping animations, and reduce particle counts.

#### Scenario: Wrong answer with reduced motion
- **WHEN** a wrong answer is given with reduced motion requested
- **THEN** no shake or flash is played

### Requirement: Keyboard play
Stories, menus and keyboard-capable games SHALL be playable with arrow keys, Space, Enter and Escape.

#### Scenario: Escape in a game
- **WHEN** the player presses Escape during a game
- **THEN** the pause menu opens, and Escape again resumes

### Requirement: Larger text
Settings SHALL offer a larger-text option that scales interface text.

#### Scenario: Enabling larger text
- **WHEN** the player turns on Larger text
- **THEN** story and menu text grows and the choice is remembered
