---
name: decklattice
description: Use when an agent needs to initialize, create, edit, validate, visually inspect, or export a DeckLattice presentation using structured slides.json content, built-in layouts, Chart.js, Mermaid, MathJax, deck-specific CSS, Playwright verification, screenshots, or PDF output.
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

Update this skill after upgrading the CLI:

```bash
decklattice skill update
```

## Workflow

1. Establish the audience, key message, slide count, and tone.
2. Draft one key message per slide.
3. Edit `deck/slides.json`; do not edit generated `deck/index.html`.
4. Read `deck/slides.schema.json` when adding or changing layout types.
5. Prefer one large claim with two or three supporting points over repeated cards.
6. Use `chart` with `chart_config` for quantitative comparisons.
7. Use `mermaid` with `diagram` for processes and architecture.
8. Use `math` with `equation` for display equations. TeX delimiters also work in normal text.
9. Put deck-specific visual styles in CSS listed by `additional_css`.
10. Use `additional_classes` to target individual slides.
11. Print the HTML before patch with `decklattice html-before --slide <number|id>`, write your patch, then verify the patched HTML with `decklattice html-after --slide <number|id>`. Put page-specific HTML structure changes in `deck/patches/{slide_id}.patch`.
12. Validate, build, inspect, and export.

The standard HTML and CSS are built into the CLI and are refreshed on every
build. Inspect them without copying them into the project:

```bash
decklattice template html
decklattice template css
```

Do not create `deck/template.html` or `deck/styles.css`. Use
`deck/additional.css` for project-specific changes.

## Rich Content

Chart.js:

```json
{
  "id": "comparison",
  "type": "chart",
  "headline": "Before / After",
  "items": ["Highlight the main difference"],
  "chart_alt": "Bar chart comparing before and after",
  "chart_config": {
    "type": "bar",
    "data": {
      "labels": ["Before", "After"],
      "datasets": [{ "data": [42, 78] }]
    }
  }
}
```

Mermaid:

```json
{
  "id": "flow",
  "type": "mermaid",
  "headline": "System flow",
  "diagram": "flowchart LR\n  A[Input] --> B[Process] --> C[Result]"
}
```

MathJax:

```json
{
  "id": "equation",
  "type": "math",
  "headline": "Objective",
  "equation": "\\[ E = mc^2 \\]",
  "items": ["Inline math: \\( x + y = z \\)"]
}
```

Backslashes in JSON strings must be doubled.

## Commands

```bash
decklattice validate
decklattice build
decklattice verify
decklattice screenshot --slide <number|id>
decklattice html-before --slide <number|id>
decklattice html-after --slide <number|id>
decklattice pdf
decklattice template <html|css>
decklattice skill update
```

Use `--output <path>` with `screenshot` or `pdf` when a specific artifact path
is needed.

## Completion Criteria

- `decklattice validate` succeeds.
- `decklattice verify` reports no overflow, image, HTTP, JavaScript, or alt-text issues.
- Visually inspect important or changed pages with `decklattice screenshot`.
- Check facts, names, numbers, and dates independently.
- Generate the PDF with `decklattice pdf` when requested.

Reveal.js, Chart.js, Mermaid, MathJax, and fonts are loaded from pinned CDN
URLs, so browser commands require network access. Playwright Chromium must be
installed for `verify`, `screenshot`, and `pdf`.
