# AGENTS.md — slop-guard-ui

Guidelines and context for AI agents working in this repository.

## What this project is

A single-page, no-build, no-server interactive editor that lints text for AI "slop" patterns. It is a faithful JavaScript port of the Python [slop-guard](https://github.com/eric-tramel/slop-guard) MCP server, wrapped in a Hemingway App-style UI.

## File layout

```
index.html   — HTML markup only; loads style.css and app.js
style.css    — all CSS: layout, light/dark themes, highlight classes
app.js       — all JavaScript: analyzer logic + CodeMirror UI wiring
slop-guard/  — original Python reference source (gitignored, not shipped)
```

## Architecture decisions

- **CodeMirror 5** (loaded from cdnjs CDN) for the editor. CM5's `markText(from, to, {className})` API is ideal for inline highlights. Vim keymap is built-in.
- **No build step.** Everything is vanilla JS + CSS loaded via `<script src>` / `<link rel="stylesheet">`. Opening `index.html` with `file://` works in all major browsers.
- **Analyzer lives entirely in `app.js`** in the `analyze(text)` function. It returns `{ score, band, word_count, violations, counts, advice, warnings }`. Violations with `from`/`to` byte offsets get inline highlights; violations without positions (document-level) go to the warnings sidebar panel.

## Lint rule categories

| JS rule key | CSS class | Inline highlight |
|-------------|-----------|-----------------|
| `slop_word` | `.sg-slop-word` | yes |
| `slop_phrase` | `.sg-slop-phrase` | yes |
| `structural` | `.sg-structural` | yes |
| `tone` | `.sg-tone` | yes |
| `weasel` | `.sg-weasel` | yes |
| `ai_disclosure` | `.sg-ai-disclosure` | yes |
| `placeholder` | `.sg-placeholder` | yes |
| `contrast_pair` | `.sg-contrast-pair` | yes |
| `setup_resolution` | `.sg-setup-resolution` | yes |
| `pithy_fragment` | `.sg-pithy-fragment` | yes |
| `em_dash` | `.sg-em-dash` | yes (when over density threshold) |
| `phrase_reuse` | `.sg-phrase-reuse` | yes |
| `rhythm` | — | warnings sidebar only |
| `colon_density` | — | warnings sidebar only |
| `bullet_density` | — | warnings sidebar only |
| `blockquote_density` | — | warnings sidebar only |
| `horizontal_rules` | — | warnings sidebar only |

## Scoring (faithful port of Python)

```
density     = weighted_penalty_sum / (word_count / 1000)
score       = clamp(round(100 × e^(−0.04 × density)), 0, 100)
concentration multiplier applies to: contrast_pairs, pithy_fragment, setup_resolution
```

## UI conventions

- **Dark mode** is auto-detected from `prefers-color-scheme`; togglable via header button. Dark-mode colors use saturated, darkened versions of the light-mode highlight palette (defined as CSS custom properties on `body.dark`).
- **Advice items** with a known text position carry a `data-from` attribute. Clicking them scrolls the editor to that position and briefly flashes the line amber.
- **Warnings panel** is for document-level violations only (no text position). It should never show inline highlights.
- **Debounce** on `editor.on('change')` is 300 ms.

## What to keep stable

- The `analyze(text)` function signature and return shape — the UI depends on it.
- CSS class names (`.sg-*`) — they are set by `markText` calls in `applyHighlights()`.
- The `HP` hyperparameter object — values are calibrated to match the Python source.

## What is safe to change

- Sidebar layout and styling.
- Adding new sidebar sections (e.g. a diff view, history).
- The sample text pre-loaded into the editor.
- Highlight colors (CSS custom properties in `:root` and `body.dark`).
- Adding new lint rules: add a pattern, push violations into the `violations` array with a `from`/`to`, add a CSS class, add the category to `CATEGORIES` in the UI section.
