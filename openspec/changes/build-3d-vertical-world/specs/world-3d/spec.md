# Spec Delta

## Purpose
The portrait 3D journey through all places, the first 3D mini-game, and the performance and fallback rules that keep it playable on modest phones.

## ADDED Requirements

### Requirement: Vertical 3D journey
In portrait orientation the journey SHALL be a 3D scene in which the places rise upward along a path in map order, the camera follows the player's current place, and dragging up or down moves along the path.

#### Scenario: Opening a place
- **WHEN** the player taps an unlocked place in the 3D journey
- **THEN** that place's story opens, exactly as from the 2D map

#### Scenario: Locked place
- **WHEN** the player taps a locked place
- **THEN** it does not open and the same "light the previous lamp first" message is shown

### Requirement: 3D runner
The Kala Pani mini-game SHALL be a three-lane 3D runner with the same goal, timing, scoring and star rules as the 2D version.

#### Scenario: Dodging a storm
- **WHEN** the player swipes or taps left or right
- **THEN** the ship changes lane, and hitting a storm or whirlpool costs a life as before

### Requirement: Performance
3D scenes SHALL aim for 60 frames per second and stay above 30 on mid-range phones, SHALL stop rendering when nothing moves or the tab is hidden, and the 3D engine SHALL load only after the title screen is shown.

#### Scenario: Idle map
- **WHEN** the player leaves the 3D journey without touching it
- **THEN** rendering stops until something changes

### Requirement: 2D fallback
The game SHALL use the 2D map and 2D games when WebGL is unavailable, when the player turns the "3D world" setting off, or when the device cannot hold 30 frames per second.

#### Scenario: Old phone
- **WHEN** WebGL cannot start
- **THEN** the 2D map appears and every level remains playable

### Requirement: Accessible 3D journey
Every place in the 3D journey SHALL have a visible, labelled button of at least 44 by 44 pixels, and the journey SHALL be usable with the keyboard.

#### Scenario: Keyboard player
- **WHEN** a player presses the up or down arrow on the 3D journey and then Enter
- **THEN** the camera moves to the next or previous place and Enter opens it

### Requirement: Lamps of progress
Each completed place SHALL light its section of a row of diyas along the 3D path, and Jyoti SHALL fly from the previous place to a newly unlocked place.

#### Scenario: First win at Ayodhya
- **WHEN** the player wins Ayodhya for the first time and returns to the journey
- **THEN** the diyas between Ayodhya and Govardhan light up and Jyoti flies to Govardhan
