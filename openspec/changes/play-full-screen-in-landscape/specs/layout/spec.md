# Spec Delta

## Purpose
How the game uses the screen: full screen and landscape on touch devices, the installed app's display, and layouts that fill a screen held sideways.

## ADDED Requirements

### Requirement: Full screen on touch devices
On touch devices whose browser can show a page full screen, the tap that starts play SHALL put the game in full screen and lock it to landscape where the browser allows. After the player leaves full screen, their next tap SHALL enter it again. The game SHALL NOT enter full screen by itself on devices with a mouse, on the account screen, or from a button that needs the tap for its own action (sharing).

#### Scenario: Starting on an Android phone
- **WHEN** a player taps "Begin the journey" in Chrome on an Android phone
- **THEN** the browser's bars disappear and the game turns to landscape

#### Scenario: Leaving full screen
- **WHEN** the player swipes out of full screen and then taps the game
- **THEN** the game is full screen again

#### Scenario: Desktop
- **WHEN** the game is played with a mouse
- **THEN** it never enters full screen by itself

### Requirement: Installed app full screen
Once installed, the game SHALL open full screen in landscape, without browser, status or navigation bars, on systems that support it.

#### Scenario: Opening the installed app
- **WHEN** a player opens the installed game on an Android phone
- **THEN** it opens in landscape with no bars on screen

### Requirement: Landscape layouts
On a screen wider than it is tall and under 700 pixels tall, every screen (title, stories, missions, mini-games, results, lamp cards, album, account and menus) SHALL use the full width and fit the height: no control cut off, no sideways scrolling, nothing under a notch. Long lists (album, travel, account) MAY scroll within their screen. Portrait screens and taller windows SHALL keep their current layouts.

#### Scenario: Title on a phone held sideways
- **WHEN** the title screen is shown at 863 by 360 pixels
- **THEN** the logo and the buttons sit side by side, filling the screen, and every button is fully visible

#### Scenario: Memory game held sideways
- **WHEN** the memory game is played at 844 by 390 pixels
- **THEN** all twelve cards are fully visible

#### Scenario: Result held sideways
- **WHEN** a result is shown at 863 by 360 pixels
- **THEN** the stars, the lamp card and the buttons are visible together

### Requirement: Landscape touch targets
In landscape, touch targets SHALL stay at least 44 pixels, except the rangoli grid's cells, which shrink with the height so the whole pattern stays visible.

#### Scenario: Lights game held sideways
- **WHEN** the lights game is played at 863 by 360 pixels
- **THEN** every light and button is at least 44 pixels
