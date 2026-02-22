# slop-guard-ui

A Hemingway App-style interactive editor that lints text for AI "slop" patterns in real time, built around [slop-guard](https://github.com/eric-tramel/slop-guard) by [@eric-tramel](https://github.com/eric-tramel).

## Usage

Open `index.html` directly in a browser — no server or build step required.

## Features

- **Inline highlights** — color-coded by violation category as you type
- **Sidebar** — live score (0–100), severity band, word count, per-category counts, warnings, and actionable advice
- **Click-to-jump** — click any advice item to scroll the editor to the flagged text
- **Vim keybindings** — toggle on/off with the Vim button
- **Dark mode** — auto-detects system preference; toggle with the theme button

## Lint categories

| Color | Category | Examples |
|-------|----------|---------|
| 🟡 Yellow | Slop words | *crucial, delve, tapestry, paradigm* |
| 🟠 Orange | Slop phrases | *"in conclusion", "let's dive in"* |
| 🔵 Blue | Tone / AI tells | *"would you like", "as mentioned"* |
| 🔴 Red | AI disclosure | *"as an AI", "as a language model"* |
| 🟣 Purple | Structure | bold-header blocks, bullet runs, triads |
| 🩷 Pink | Weasel phrases | *"experts suggest", "studies show"* |
| 🟢 Green | Contrast pairs | *"X, not Y"* constructions |
| 🩵 Teal | Setup-resolution | *"This isn't X. It's Y."* |
| 💚 Light green | Pithy fragments | short pivot sentences |
| 🔵 Sky | Em dash density | overuse of — |
| 🟡 Amber | Phrase reuse | repeated 4–8 word n-grams |
| ⬜ Gray | Placeholders | `[insert ...]`, `[your ...]` |

Document-level warnings (no inline highlight): rhythm uniformity, colon density, bullet density, blockquote density, horizontal rule overuse.

## Scoring

```
density = weighted_penalty_sum / (word_count / 1000)
score   = round(100 × e^(−0.04 × density))
```

| Score | Band |
|-------|------|
| 80–100 | clean |
| 60–79 | light |
| 40–59 | moderate |
| 20–39 | heavy |
| 0–19 | saturated |

## Files

```
index.html   — markup
style.css    — all styles (light + dark theme, highlight colors)
app.js       — slop-guard analyzer (JS port) + CodeMirror UI
```

## Credits

Lint rules and scoring ported from [slop-guard](https://github.com/eric-tramel/slop-guard) by [@eric-tramel](https://github.com/eric-tramel).
