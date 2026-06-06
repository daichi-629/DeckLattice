import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { renderSlide } from '../src/core/renderer.js';
import { DeckLatticeError } from '../src/core/errors.js';
import { validateDeck } from '../src/core/validation.js';
import type { ProjectContext } from '../src/core/types.js';

async function projectContext(): Promise<ProjectContext> {
  const rootDir = await mkdtemp(resolve(tmpdir(), 'decklattice-v2-'));
  const deckDir = resolve(rootDir, 'deck');
  await mkdir(deckDir);
  return {
    rootDir,
    deckDir,
    slidesPath: resolve(deckDir, 'slides.json'),
    outputPath: resolve(deckDir, 'index.html'),
    patchesDir: resolve(deckDir, 'patches'),
    pdfOutputPath: resolve(deckDir, 'output/slides.pdf'),
    config: { deckDir: 'deck', output: 'deck/index.html', pdfOutput: 'deck/output/slides.pdf' }
  };
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

test('v2-hero renders h1 and escapes content', () => {
  const out = renderSlide(
    { id: 's1', type: 'v2-hero', headline: '<Title>' },
    1, 1, 'Deck'
  );
  assert.match(out, /v2-hero/);
  assert.match(out, /<h1[^>]*>&lt;Title&gt;<\/h1>/);
  assert.doesNotMatch(out, /<Title>/);
});

test('v2-hero renders optional subtitle and meta slots', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-hero', headline: 'Title',
      slots: {
        subtitle: { type: 'text', content: 'Sub' },
        meta:     { type: 'bullets', items: ['A', 'B'] }
      }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /class="v2-slot v2-slot--subtitle"/);
  assert.match(out, /class="v2-slot v2-slot--meta"/);
  assert.match(out, /<li>A<\/li>/);
});

test('v2-section renders section label', () => {
  const out = renderSlide(
    { id: 's1', type: 'v2-section', headline: 'Chapter' },
    3, 10, 'Deck', 2
  );
  assert.match(out, /SECTION 02/);
  assert.match(out, /Chapter/);
});

test('v2-full renders main slot', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-full', headline: 'H',
      slots: { main: { type: 'bullets', items: ['Point'] } }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /v2-full/);
  assert.match(out, /<li>Point<\/li>/);
});

test('v2-sidebar-right renders main before aside', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-sidebar-right', headline: 'H',
      slots: {
        main:  { type: 'bullets', items: ['Item'] },
        aside: { type: 'image', url: 'img.png', alt: 'Alt' }
      }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /v2-sidebar-right/);
  const mainIdx  = out.indexOf('v2-slot--main');
  const asideIdx = out.indexOf('v2-slot--aside');
  assert.ok(mainIdx < asideIdx, 'main slot should appear before aside slot');
});

test('v2-sidebar-left renders aside before main', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-sidebar-left', headline: 'H',
      slots: {
        main:  { type: 'bullets', items: ['Item'] },
        aside: { type: 'image', url: 'img.png', alt: 'Alt' }
      }
    },
    1, 1, 'Deck'
  );
  const mainIdx  = out.indexOf('v2-slot--main');
  const asideIdx = out.indexOf('v2-slot--aside');
  assert.ok(asideIdx < mainIdx, 'aside slot should appear before main slot');
});

test('v2-columns-2 renders left and right', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-columns-2',
      slots: {
        left:  { type: 'text', content: 'Left' },
        right: { type: 'text', content: 'Right' }
      }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /v2-slot--left/);
  assert.match(out, /v2-slot--right/);
});

test('v2-columns-3 renders three slots', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-columns-3',
      slots: {
        col1: { type: 'text', content: 'A' },
        col2: { type: 'text', content: 'B' },
        col3: { type: 'text', content: 'C' }
      }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /v2-slot--col1/);
  assert.match(out, /v2-slot--col3/);
});

test('v2-header-body renders headline and main slot', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-header-body', headline: 'Title',
      slots: { main: { type: 'metrics', items: [{ value: '42', label: 'Score' }] } }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /v2-header-body/);
  assert.match(out, /42/);
  assert.match(out, /Score/);
});

// ---------------------------------------------------------------------------
// Block rendering
// ---------------------------------------------------------------------------

test('bullets block applies inlineMarkdown', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-full',
      slots: { main: { type: 'bullets', items: ['**bold** and `code`'] } }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /<strong>bold<\/strong>/);
  assert.match(out, /<code>code<\/code>/);
});

test('code block emits data-line-numbers when highlight_lines set', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-full',
      slots: { main: { type: 'code', code: 'x=1\ny=2\nz=3', language: 'python', highlight_lines: '2' } }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /data-line-numbers="2"/);
});

test('image block escapes src and alt', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-full',
      slots: { main: { type: 'image', url: '<evil>', alt: '"alt"' } }
    },
    1, 1, 'Deck'
  );
  assert.doesNotMatch(out, /<evil>/);
  assert.match(out, /&lt;evil&gt;/);
});

test('quote block renders author', () => {
  const out = renderSlide(
    {
      id: 's1', type: 'v2-full',
      slots: { main: { type: 'quote', quote: 'Hello', author: 'World' } }
    },
    1, 1, 'Deck'
  );
  assert.match(out, /class="v2-quote"/);
  assert.match(out, /World/);
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('v2-hero passes validation', async () => {
  await assert.doesNotReject(validateDeck(
    {
      deck_title: 'Deck',
      slides: [{ id: 's1', type: 'v2-hero', headline: 'Hello' }]
    },
    await projectContext()
  ));
});

test('v2-full requires main slot', async () => {
  await assert.rejects(
    validateDeck(
      { deck_title: 'Deck', slides: [{ id: 's1', type: 'v2-full', slots: {} }] },
      await projectContext()
    ),
    DeckLatticeError
  );
});

test('v2-sidebar-right rejects disallowed block type in aside', async () => {
  await assert.rejects(
    validateDeck(
      {
        deck_title: 'Deck',
        slides: [{
          id: 's1', type: 'v2-sidebar-right', headline: 'H',
          slots: {
            main:  { type: 'bullets', items: ['ok'] },
            aside: { type: 'bullets', items: ['not allowed in aside'] }
          }
        }]
      },
      await projectContext()
    ),
    DeckLatticeError
  );
});

test('v2-sidebar-right rejects unknown slot name', async () => {
  await assert.rejects(
    validateDeck(
      {
        deck_title: 'Deck',
        slides: [{
          id: 's1', type: 'v2-sidebar-right', headline: 'H',
          slots: {
            main:    { type: 'bullets', items: ['ok'] },
            aside:   { type: 'image', url: 'x.png', alt: 'x' },
            unknown: { type: 'text', content: 'bad' }
          }
        }]
      },
      await projectContext()
    ),
    DeckLatticeError
  );
});

test('v2-columns-3 requires all three column slots', async () => {
  await assert.rejects(
    validateDeck(
      {
        deck_title: 'Deck',
        slides: [{
          id: 's1', type: 'v2-columns-3',
          slots: {
            col1: { type: 'text', content: 'A' },
            col2: { type: 'text', content: 'B' }
          }
        }]
      },
      await projectContext()
    ),
    DeckLatticeError
  );
});

test('v2-hero does not interfere with existing v1 slides', async () => {
  await assert.doesNotReject(validateDeck(
    {
      deck_title: 'Deck',
      slides: [
        { id: 's1', type: 'title', headline: 'V1 Title' },
        { id: 's2', type: 'v2-hero', headline: 'V2 Hero' }
      ]
    },
    await projectContext()
  ));
});
