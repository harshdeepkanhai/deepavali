# visual-assets Specification

## Purpose
How the game draws everything: one in-repo SVG icon set, CSS and canvas, with no emoji and no image files.

## Requirements
### Requirement: No emoji
The shipped game MUST NOT contain emoji characters in markup, styles, scripts or data.

#### Scenario: Emoji scan
- **WHEN** the built output is scanned for emoji code points
- **THEN** none are found

### Requirement: Single icon source
All icons SHALL come from one path-based icon set that renders both as inline SVG in the page and as cached sprites on canvas.

#### Scenario: Same icon in both renderers
- **WHEN** the diya icon appears in a story panel and in the slash game canvas
- **THEN** both are drawn from the same path data
