# Spec Delta

## Purpose
The landscape 3D journey platformer through all places, the 3D runner, and the performance, fallback and accessibility rules that keep the game playable for everyone.

## ADDED Requirements

### Requirement: Landscape 3D journey
When 3D is on, the journey SHALL be a third-person 3D course that the player moves through with a character, visiting the places in map order. It SHALL fill the screen, and on touch devices it SHALL ask for fullscreen and landscape and show a "turn your phone sideways" hint while the screen is in portrait.

#### Scenario: Opening the journey on a phone
- **WHEN** a player taps Play on a phone held upright
- **THEN** the journey opens full screen and asks the player to turn the phone sideways

#### Scenario: Desktop
- **WHEN** the journey opens on a desktop browser
- **THEN** it fills the window and can be played with the keyboard and mouse

### Requirement: Journey controls
The journey SHALL offer a floating joystick on the left of the screen, look-around by dragging on the right, a jump button and a context action button, all usable at the same time. With a keyboard, WASD or the arrow keys SHALL move, Space SHALL jump, F or Enter SHALL act, Q and E SHALL turn the camera, M SHALL open the map and Escape SHALL open the menu.

#### Scenario: Running and jumping on a phone
- **WHEN** the player holds the joystick forward and taps jump
- **THEN** the character runs away from the camera and jumps

#### Scenario: Keyboard
- **WHEN** the player presses W and then Space
- **THEN** the character moves forward and jumps

### Requirement: Places and story circles
Each place SHALL be an island with its landmark and a glowing story circle. Inside the circle, an action button SHALL appear, and using it SHALL open that place's story exactly as from the 2D map. The next place to play SHALL be marked by a beam of light visible from a distance.

#### Scenario: Reaching Amritsar
- **WHEN** the player stands in Amritsar's story circle and presses the action button
- **THEN** Amritsar's story opens, and returning afterwards puts the player back at Amritsar

### Requirement: Gates of light
The path to each place after the first SHALL be closed by a gate of light until the previous place has at least one star. Winning a place for the first time SHALL build the bridge to the next place when the player returns to the journey.

#### Scenario: Locked gate
- **WHEN** the player walks into the gate to a place that is still locked
- **THEN** they cannot pass, and the "light the previous lamp first" message is shown

#### Scenario: First win at Ayodhya
- **WHEN** the player wins Ayodhya for the first time and returns to the journey
- **THEN** the gate opens and the path to Govardhan rises into place

### Requirement: Forgiving falls
Falling off the course SHALL return the player to the last checkpoint after a short fade, with no lives lost and no progress removed. Every island and some platforms on longer paths SHALL be checkpoints.

#### Scenario: Missed jump
- **WHEN** the player falls from a platform
- **THEN** they reappear at the last checkpoint within about a second

### Requirement: Diyas to light
The course SHALL hold unlit diyas that light when the player touches them. The number lit SHALL be shown for the current place and saved on the device.

#### Scenario: Lighting a diya
- **WHEN** the player runs through an unlit diya
- **THEN** it lights with a sound, the counter goes up, and it stays lit after a reload

### Requirement: Fast travel
A map button in the journey SHALL list every place with its stars. Choosing an unlocked place SHALL move the player to its story circle; locked places SHALL refuse with the usual message.

#### Scenario: Skipping the platforming
- **WHEN** a player who cannot make a jump opens the map and chooses an unlocked place
- **THEN** they arrive in that place's story circle and can open its story

### Requirement: No combat
The journey MUST NOT contain weapons, fighting or harm to characters. Challenges come from the path itself.

#### Scenario: Reviewing a new path
- **WHEN** a new course section is added
- **THEN** it challenges the player with jumps, moving platforms or timing only

### Requirement: 3D runner
The Kala Pani mini-game SHALL be a three-lane 3D runner with the same goal, timing, scoring and star rules as the 2D version.

#### Scenario: Dodging a storm
- **WHEN** the player swipes or taps left or right
- **THEN** the ship changes lane, and hitting a storm or whirlpool costs a life as before

### Requirement: Performance
3D scenes SHALL aim for 60 frames per second and stay above 30 on mid-range phones. Rendering SHALL stop while a story, game or menu covers the journey and while the tab is hidden, and the 3D engine SHALL load only after the title screen is shown.

#### Scenario: Opening a story
- **WHEN** a story opens over the journey
- **THEN** the journey stops rendering until the player returns

#### Scenario: Slow device
- **WHEN** the journey cannot hold 30 frames per second
- **THEN** it first lowers its resolution, and then switches to the 2D map with a notice

### Requirement: 2D fallback
The game SHALL use the 2D map and 2D games when WebGL 2 is unavailable, when the player turns the "3D world" setting off, or when the device cannot hold 30 frames per second. When the browser takes the GPU away (for example while the game is in the background), the journey SHALL resume once it is given back, and losing it SHALL NOT turn the "3D world" setting off.

#### Scenario: Old phone
- **WHEN** WebGL 2 cannot start
- **THEN** the 2D map appears and every level remains playable

#### Scenario: Back from another app
- **WHEN** a player returns from another app and the browser had taken the GPU away
- **THEN** the journey resumes where they were; if the GPU does not come back within a few seconds, the 2D map is used for this visit and the 3D world setting stays on

### Requirement: Accessible journey
Every journey control SHALL be a labelled button or area of at least 44 by 44 pixels. With reduced motion requested, the camera SHALL not bob or shake and the intro descent SHALL be skipped.

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested and the journey opens
- **THEN** the player starts on the ground with a steady camera
