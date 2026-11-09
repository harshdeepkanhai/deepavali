# Spec Delta

## ADDED Requirements

### Requirement: Licensed self-hosted 3D assets
3D models and textures SHALL be served from the game's own origin, SHALL be under a licence that permits use in this game (preferably CC0), and SHALL each be listed with source, author and licence in the credits manifest.

#### Scenario: Adding a model
- **WHEN** a contributor adds a model file
- **THEN** its source, author and licence appear in the credits manifest in the same commit

#### Scenario: Network log
- **WHEN** a 3D scene loads
- **THEN** every model and texture comes from the game's own origin

### Requirement: Respectful depiction of sacred figures
The game MUST NOT show Sikh Gurus as characters, and SHALL represent them only through symbols such as light, the cloak or the Golden Temple. Deities SHALL be represented symbolically (light, objects, places) unless a depiction has been reviewed by members of that tradition.

#### Scenario: Amritsar in 3D
- **WHEN** the Amritsar place is shown in 3D
- **THEN** Guru Hargobind appears only as light and symbols, never as a figure
