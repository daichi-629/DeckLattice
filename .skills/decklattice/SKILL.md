---
name: decklattice
description: Use when an agent needs to initialize, create, edit, validate, visually inspect, or export a DeckLattice presentation using the decklattice CLI, structured slides.json content, deck-specific CSS, per-slide HTML patches, Playwright verification, screenshots, or PDF output.
---

# DeckLattice

Use the DeckLattice `decklattice` CLI to create and maintain structured Reveal.js presentations.

## Start

For a new presentation:

```bash
decklattice init <directory> --skills
```

For an existing project, locate `decklattice.config.json` or `deck/slides.json`.
Commands may run from the project root or a descendant directory.

## Workflow

1. Establish the audience, key message, slide count, and tone.
2. Draft one key message per slide.
3. Edit `deck/slides.json`; do not edit generated `deck/index.html`.
4. Read `deck/slides.schema.json` when adding or changing layout types.
5. Put reusable layout styles in `deck/styles.css`.
6. Put deck-specific visual styles in CSS listed by `additional_css`.
7. Use `additional_classes` to target individual slides.
8. Put page-specific HTML structure changes in `deck/patches/{slide_id}.patch`.
9. Keep HTML structure in patches and visual appearance in CSS.
10. Validate, build, inspect, and export.

## Commands

```bash
decklattice validate
decklattice build
decklattice verify
decklattice screenshot --slide <number|id>
decklattice pdf
```

Use `--output <path>` with `screenshot` or `pdf` when a specific artifact path
is needed.

## Completion Criteria

- `decklattice validate` succeeds.
- `decklattice verify` reports no overflow, image, HTTP, JavaScript, or alt-text issues.
- Visually inspect important or changed pages with `decklattice screenshot`.
- Check facts, names, numbers, and dates independently.
- Generate the PDF with `decklattice pdf` when requested.

Reveal.js is loaded from a pinned CDN URL, so browser commands require network
access. Playwright Chromium must be installed for `verify`, `screenshot`, and
`pdf`.
