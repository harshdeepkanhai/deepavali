# journey Specification

## Purpose
The player's path through Deepa Quest: a prologue, a map of 13 places unlocked in order, a story and mission per place, a mini-game scored with stars, collectible lamp cards, and a finale.

## Requirements
### Requirement: Linear unlocking
The map SHALL show 13 places in a fixed order, and a place SHALL open only when the previous place has at least one star.

#### Scenario: Locked place tapped
- **WHEN** the player taps a place whose previous place has no stars
- **THEN** the place does not open and a "light the previous lamp first" message is shown

#### Scenario: First win unlocks the next place
- **WHEN** the player earns one or more stars on a place for the first time
- **THEN** the next place unlocks and is highlighted on the map with a "play" badge

### Requirement: Story before mission
Each place SHALL present 3 to 5 story panels, each with icon art and one line of text, followed by a mission screen naming the goal and a Play button.

#### Scenario: Navigating a story
- **WHEN** the player taps Next, taps the right side of the screen, swipes left, or presses the right arrow
- **THEN** the next panel is shown, and Back or the left arrow returns to the previous panel

#### Scenario: Skipping a story
- **WHEN** the player presses Skip
- **THEN** the mission screen is shown immediately

### Requirement: Stars and lamp cards
A finished mini-game SHALL award 0 to 3 stars; any win (1 or more stars) SHALL reveal that place's lamp card fact and store the best star count.

#### Scenario: Better score replaces the stored score
- **WHEN** the player earns more stars than their stored best for a place
- **THEN** the stored best becomes the new count

#### Scenario: Lower score keeps the stored score
- **WHEN** the player earns fewer stars than their stored best
- **THEN** the stored best is unchanged

### Requirement: Lamp album
The album SHALL list all 13 lamp cards, showing collected cards with their title and stars and uncollected ones as locked.

#### Scenario: Reading a collected card
- **WHEN** the player taps a collected card
- **THEN** its title, place and fact are shown with a button to replay that place

### Requirement: Finale
Winning the last place SHALL show a finale with the total star count, a Diwali greeting in every supported language, and a share action.

#### Scenario: Sharing
- **WHEN** the player taps Share on a device without the Web Share API
- **THEN** the share text is copied to the clipboard and a confirmation is shown
