# localization Specification

## Purpose
Playing in eight languages, and reading each place's story in the language spoken there.

## Requirements
### Requirement: Interface languages
The interface SHALL be available in English, Hindi, Punjabi, Bengali, Tamil, Gujarati, Nepali and Malay, and every interface string SHALL exist in all eight.

#### Scenario: First launch
- **WHEN** the game opens for the first time in a browser whose preferred language is supported
- **THEN** the interface uses that language

#### Scenario: Changing language
- **WHEN** the player picks a language from the title screen or settings
- **THEN** the interface switches immediately and the choice is remembered

### Requirement: Place language
Each place SHALL offer its story, mission, lamp card and game text in the language(s) spoken there where a translation exists, selectable from the story screen.

#### Scenario: Reading Kolkata in Bengali
- **WHEN** the player toggles the story language on Kolkata to Bengali
- **THEN** the story, mission, game feedback and lamp card for Kolkata appear in Bengali

#### Scenario: Missing translation
- **WHEN** a field has no translation for the chosen language
- **THEN** the English text is shown for that field

### Requirement: Local place names
The map SHALL show each place's name in the script of its local language beneath the interface-language name when they differ.

#### Scenario: Map label
- **WHEN** the interface is English
- **THEN** Ayodhya is labelled with अयोध्या beneath it
