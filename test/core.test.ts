import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { applyPatch } from '../src/core/patch.js';
import { renderSlide } from '../src/core/renderer.js';
import { DeckLatticeError } from '../src/core/errors.js';
import { sanitizeSvg } from '../src/core/svg.js';
import { validateDeck } from '../src/core/validation.js';
import { resolveSlide } from '../src/browser/screenshot.js';
import type { ProjectContext } from '../src/core/types.js';

async function projectContext(): Promise<ProjectContext> {
  const rootDir = await mkdtemp(resolve(tmpdir(), 'decklattice-test-'));
  const deckDir = resolve(rootDir, 'deck');
  await mkdir(deckDir);
  return {
    rootDir,
    deckDir,
    slidesPath: resolve(deckDir, 'slides.json'),
    templatePath: resolve(deckDir, 'template.html'),
    outputPath: resolve(deckDir, 'index.html'),
    patchesDir: resolve(deckDir, 'patches'),
    pdfOutputPath: resolve(deckDir, 'output/slides.pdf'),
    config: {
      deckDir: 'deck',
      output: 'deck/index.html',
      pdfOutput: 'deck/output/slides.pdf'
    }
  };
}

test('message content is escaped', () => {
  const output = renderSlide(
    {
      id: 'slide-1',
      type: 'message',
      message: '<script>alert(1)</script>'
    },
    1,
    1,
    'Deck'
  );
  assert.doesNotMatch(output, /<script>/);
  assert.match(output, /&lt;script&gt;/);
});

test('unsafe SVG is rejected', () => {
  assert.throws(
    () => sanitizeSvg('<svg><script>alert(1)</script></svg>'),
    DeckLatticeError
  );
});

test('patch applies only with exact context', () => {
  const patch = [
    '--- slide.html',
    '+++ slide.html',
    '@@ -1,1 +1,2 @@',
    ' exact',
    '+added'
  ].join('\n');
  assert.equal(applyPatch('exact', patch), 'exact\nadded');
});

test('patch rejects context mismatch', () => {
  const patch = [
    '--- slide.html',
    '+++ slide.html',
    '@@ -1,1 +1,1 @@',
    '-unexpected',
    '+replacement'
  ].join('\n');
  assert.throws(() => applyPatch('actual', patch), DeckLatticeError);
});

test('unknown slide type is rejected', async () => {
  await assert.rejects(
    validateDeck(
      {
        deck_title: 'Deck',
        slides: [{ id: 'slide-1', type: 'unknown' }]
      },
      await projectContext()
    ),
    DeckLatticeError
  );
});

test('duplicate slide ids are rejected', async () => {
  const slide = { id: 'slide-1', type: 'title', headline: 'Title' };
  await assert.rejects(
    validateDeck(
      { deck_title: 'Deck', slides: [slide, { ...slide }] },
      await projectContext()
    ),
    DeckLatticeError
  );
});

test('image slides require alt text', async () => {
  await assert.rejects(
    validateDeck(
      {
        deck_title: 'Deck',
        slides: [{
          id: 'slide-1',
          type: 'image_right',
          headline: 'Image',
          items: ['Item'],
          image_url: 'image.png'
        }]
      },
      await projectContext()
    ),
    DeckLatticeError
  );
});

test('additional CSS must exist inside deck directory', async () => {
  const project = await projectContext();
  await writeFile(resolve(project.deckDir, 'theme.css'), '');
  await assert.doesNotReject(
    validateDeck(
      {
        deck_title: 'Deck',
        additional_css: ['theme.css'],
        slides: [{ id: 'slide-1', type: 'title', headline: 'Title' }]
      },
      project
    )
  );
});

test('screenshot target accepts one-based number and slide id', () => {
  const data = {
    deck_title: 'Deck',
    slides: [
      { id: 'intro', type: 'title' as const, headline: 'Intro' },
      { id: 'details', type: 'section' as const, headline: 'Details' }
    ]
  };
  assert.deepEqual(resolveSlide(data, '2'), { id: 'details', index: 1 });
  assert.deepEqual(resolveSlide(data, 'intro'), { id: 'intro', index: 0 });
  assert.throws(() => resolveSlide(data, '3'), DeckLatticeError);
  assert.throws(() => resolveSlide(data, 'missing'), DeckLatticeError);
});
